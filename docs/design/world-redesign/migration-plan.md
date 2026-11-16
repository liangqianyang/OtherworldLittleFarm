# 《异界小农场》世界重构 · 迁移总计划

> 迁移计划架构师产出 · 2026-11-16 · 基线：当前 main（launch/farm/adventure 三场景全按钮形态，SaveManager v2）
> 配套文档：world-redesign/ 下世界结构、地形、角色操控、战斗、塔防各专家方案（本文只管「现有代码怎么迁过去」）

---

## 0. 方向快照（约束输入）

- 从「独立场景 + 按钮跳转」→ **一张连通大地图 + 可控角色**（星露谷结构 + 元气骑士实时战斗 + 塔防防守）。
- 六区域：农场区（**后置**）、开荒区、居住区（河流/台阶/地窖 + 房间布置）、钓鱼区、封印防守区（作物塔防）、探险区（传送点进实时战斗副本）。
- 视角 = 斜俯视 3/4：**tile 32px + 立面 + y-sort**。横屏 1280×720，触屏，TapTap 小游戏 ≤20MB。
- 工程惯例延续：无物理引擎（手工 AABB）、程序化节点显式 layer、EventBus 事件驱动、逻辑层可手动 tick（自动化测试）、构建产物经 taptap-minigame-tools 转 Tap 小游戏。

## 1. 现状盘点结论

30 个 TS 文件约 4500 行；三场景（launch/farm/adventure）均为「UI Canvas + 按钮面板」，无世界/角色/相机概念；纹理 46 张仅 424KB；当前构建整包 3~4MB（TapBuild 3.9M / wechatgame 3.0M）。

**迁移可行性判断：现有分层（数据表 → 逻辑单例 → 视图组件 → UI 面板）恰好是迁移最需要的形状。**
逻辑层（状态机 + 纯数据存档 + EventBus 信号）与「世界在哪里渲染」完全解耦，因此：**迁移 = 新增世界层（~8 个新类）+ 替换表现层入口（交互从点击面板改为走近情境按钮），逻辑层大面积存活。** 这是本计划的总原则：**逻辑保命、表现重写、入口换血**。

---

## 2. 逐系统判定表

判定档位：**复用原样 / 小改 / 大改 / 重写 / 废弃**。废弃≠删码：见 §8 git 策略，历史留在 main 里。

### 2.1 core（四基座）

| 文件 | 判定 | 理由与改造点 |
|---|---|---|
| `core/EventBus.ts` | **小改** | 总线机制原样。`GameEvents` 登记世界层新事件：`worldReady`、`regionEntered{regionId}`、`interactPromptChanged{targetId,label}`（targetId=`''` 表示无目标）、`gatherDone{objId,itemId,count}`、`terrainChanged{regionId}`、`dungeonEntered{mapId}`、`dungeonSettled{won}`、`towerPlaced{slotIdx,towerId}`、`objectRemoved{objId}`。旧事件全部保留 |
| `core/TimeSystem.ts` | **复用原样** | dayIndex 主时钟、endDay 睡觉触发、离线结算、季节/节气，全部语义不变。红线「倒流按 0」「防守不在线外判定」继续生效 |
| `core/SaveManager.ts` | **小改** | 接口零改动。`SAVE_VERSION 2→3`，`migrations[3]` 追加一步补默认字段（见 §6）。backup 回退、只加不删约束不变 |
| `core/DataManager.ts` | **小改** | `TABLE_MANIFEST` 追加 `catalogs/world_regions`、`catalogs/interactables`（新表见 §3.9）；`_validate()` 追加 interactables.itemId→items、interactables.region→world_regions 引用校验 |
| `core/SpriteLib.ts` | **大改** | 机制改造：现 `NEED` 全量 60+ 张启动预载，世界素材量上来后拖死首屏。改为**分组懒加载**：保留 `get(path)` 接口不变（调用方零改动），新增 `ensure(paths: string[]): Promise<void>` 按区域/按需加载 + 内部缓存去重；`ready` 语义改为「基础组就绪」。`sprites_ready` 广播机制保留 |
| `core/SfxLib.ts` | **复用原样** | 合成音效零素材依赖。仅在 `bindEvents()` 补挂新事件音效（砍树/掉落/交互确认） |

### 2.2 systems

| 文件 | 判定 | 理由与改造点 |
|---|---|---|
| `systems/EconomySystem.ts` | **复用原样** | 买卖只依赖背包 + items 表，与世界结构无关 |

### 2.3 gameplay

| 文件 | 判定 | 理由与改造点 |
|---|---|---|
| `farm/FarmSystem.ts` | **复用原样**（M6 时小改） | 地块状态机纯逻辑：plant/water/harvest/growOffline/dayAdvanced 生长结算，全保留。M6 两处小改：① `GRID_COLS/ROWS=3` 常量改为从农场区地块装配结果注入（`init` 已兼容任意长度数组，天然支持扩容）；② `harvest()` 增加可选回调参数携带世界坐标（掉落表现用），不传则行为与现在完全一致——**冻结期零改动** |
| `farm/FarmGrid.ts` | **废弃** | 职责（3×3 摆位 + 批量建视图）由农场区 `RegionBuilder` 装配 + `PlotWorldView` 接管。删文件 |
| `farm/PlotView.ts` | **重写** → 新 `world/farm/PlotWorldView.ts` | 从「UI 面板内 Graphics 绘制 + 直接点击」改为「世界物件节点（Sprite + 立面 + y-sort + 脚底锚点）+ 走近交互」。保留其三态渲染逻辑（占位 Graphics / 干湿土+作物三阶段 Sprite / 成熟高亮）与 `_pickSeed` 选种逻辑，迁移到新类。点击语义（空地种/生长浇/熟收）不变，触发源改为情境按钮 ContextAction |
| `adventure/AdventureSystem.ts` | **大改** → 重写为 `dungeon/DungeonRunSystem.ts` | 回合制房间链状态机废弃。**保留并迁移的资产**：① 负重上限 BAG_CAP=10 探险包；② 战败损失一半收获（向上取整）规则；③ `settle()` 结算通道（探险包→`GameApp.giveItem` 走正式背包 + `endDay` + persist）；④ `adventure_rooms.json` 房间结构（spots/treasure/monster/next）作为副本房间生成器的数据输入。战斗循环（`playerAttack` 点击互殴）删除，由战斗专家实时战斗替代 |
| `defense/DefenseSystem.ts` | **大改** | **保留**：波次计划扁平化（t/mid/speed 排序生成队列）、tick 推进框架、终局判定（全部生成完+无活口）、漏怪吃库存 `_devour`、`settle()` 胜利奖励、情报 API（`hasNightTonight`/`nextNightDay`/`intelTonight`）、**红线「防守只挂睡觉在线流程，离线绝不判定失守」**。**改造**：① `SPAWN_X=-560`/`BARN_X=480` 直线常量 → 封印区地图数据（生成点/水晶位置/路径，塔防专家定）；② 直线撞仓 → 塔防行进（塔+角色双防御）；③ `playerHit(uid)` 点击挥击保留为角色近战通道，新增 `placeTower(slotIdx, towerItemId)` 接口壳（作物=塔，塔防专家实现）。速度经验值（chaser=60/tank=38 px/s）迁入地图数据 |
| `fishing/FishingSystem.ts` | **复用原样** | QTE 状态机纯逻辑（cast/tick/hook/权重选鱼）。变化只在调用侧：入口从 HUD 按钮改为「走近水边」情境按钮，`tick` 由新 `FishingController` 驱动。**注意**：现 `hook()` 里 `EventBus.inst.emit('farmChanged', { action: 'fish_caught', fishId })` 载荷多传了字段（类型不严格但运行时无害），迁移时顺手修正 |

### 2.4 ui

| 文件 | 判定 | 理由与改造点 |
|---|---|---|
| `ui/FarmHUD.ts` | **大改** → 重写为 `ui/WorldHUD.ts` | **保留**：顶栏信息刷新（天/季/节气/金币）、情报行 `_refreshIntel`、面板管理器角色、程序化按钮小工具 `_makeButton`。**删除**：场景跳转按钮（出发探险→传送点、钓鱼→水边情境按钮、小屋→居住区交互）；**保留常驻**：背包/跳一天/存档/暂停/图鉴按钮群。卖粮/买种子按钮迁到「背包面板内」（或居住区商人 NPC，交互专家定）。NPC 立绘（`_makeNpcs`）删除 → 世界 NPC 节点 + Interactable |
| `ui/BackpackPanel.ts` | **复用原样** | 纯数据面板，数据源（inventory+items 表）不变 |
| `ui/BedtimeDialog.ts` | **小改** | 未完成事项扫描（没浇水/可收）、二次确认、防守链（defenseOverlay.open() 先打夜战再 endDay）全保留。新增：开睡前校验「必须在床交互」（床=居住区 Interactable；HUD 跳一天按钮在 MVP 保留为免走回床的捷径，两入口共用本弹窗） |
| `ui/TutorialGuide.ts` | **小改** | 事件驱动五步链架构不变（farmChanged/itemGained/dayAdvanced 载荷判定零改动）。步骤文案按新地图微调，可选新增「走到开荒区砍一棵树」（挂 `gatherDone`） |
| `ui/CodexPanel.ts` | **复用原样** | |
| `ui/DecorPanel.ts` | **暂留 → 废弃** | 「只展示不可编辑」版保留到 M3 居住区落地（期间从 WorldHUD 移除入口）；`furniture.json`（含 decorPos）原样被居住区房间布置复用（地形/居住专家的输入数据） |
| `ui/PauseOverlay.ts` | **复用原样** | `director.pause()` 全局冻结在大地图同样成立；补一条：暂停时 InteractionManager 停发情境按钮 |
| `ui/DialogPanel.ts` | **复用原样** | 面板零改动；入口从「HUD 固定立绘点击」改为「世界 NPC 走近交互」（npc_dialogs.json 原样） |
| `ui/BattlePanel.ts` | **废弃** | 回合点击互殴 UI 随 AdventureSystem 退役；实时战斗 HUD 由战斗专家出新件 |
| `ui/AdventureHUD.ts` | **废弃** | 房间链游历 UI 退役；其地面 TILED 平铺 + 顶部信息 + 左侧背包小窗布局可被副本 HUD 参考移植 |
| `ui/DefenseOverlay.ts` | **废弃** | 夜战改为世界内封印区进行（不切场景、夜幕视觉层压暗封印区）。可搬走资产：夜幕色调、地面 TILED 调暗、结果面板样式、怪物 HP 条 → 新 `world/defense/DefenseWorldView.ts` |
| `ui/FishingPanel.ts` | **小改** | QTE 面板本体（水塘/浮标/咬钩提示）保留；入口改情境按钮；`create(parent)` 挂到 WorldHUD 同 Canvas |
| `ui/DebugPanel.ts` | **小改** | 保留跳天/加物品/打印存档/手动写档；新增：区域传送命令（M2 起真机无键盘的主调试手段）、刷新存档世界切片、生成测试树。键盘入口与屏上按钮入口都保留 |

### 2.5 场景 / 数据 / 平台

| 对象 | 判定 | 说明 |
|---|---|---|
| `launch.scene` | **小改** | GameRoot 常驻节点 + GameApp 不变；启动序改见 §5 |
| `farm.scene` | **冻结 → 废弃** | M0–M5 冻结可跑（world 里放「旧农场木牌」传送点，走近即可回旧农场玩全部农场功能，零破坏）；M6 农场区搬迁验收后从构建中移除 |
| `adventure.scene` | **改造保留** → `dungeon.scene` | 清掉房间链 UI 挂件，作为实时战斗副本场景（挂战斗专家的 DungeonRoot；保留其独立场景形态——理由见 §4） |
| `world.scene` | **新增** | 一张连通大地图（Canvas + WorldRoot + WorldHUD），六区域同场景分区段 |
| `items/crops/monsters/fish/npc_dialogs/calendar.json` | **复用原样** | |
| `gatherables.json` | **小改** | 现状澄清：它是材料物品表（wood/herb/berry），**不是**采集点定义。原样保留；世界物件/采集点定义走新表 interactables.json，产出 itemId 引用本表 |
| `adventure_rooms.json` | **保留** | 副本房间布局生成输入（战斗专家扩展字段） |
| `defense_waves.json` | **小改** | 波次结构原样；塔防专家追加生成点/路径字段 |
| `furniture.json` | **复用原样** | 居住区房间布置直接读取 |
| 新增 `world_regions.json` | | 六区域定义：tile 区段、出生点、区域入口/出口、物件清单引用、区域音效。见 §3.9 |
| 新增 `interactables.json` | | 世界可交互物定义：id/region/类型/精灵/脚底 AABB/交互动作/产出与 respawn。见 §3.9 |
| `platform/*`（IPlatformAdapter/LocalAdapter/TapAdapter） | **复用原样** | 存储分片与时间源接口不变；TapAdapter 切换计划（阶段 5 TODO）不受影响 |

---

## 3. 新系统清单（类名 / 路径 / 职责 / 接口）

新增目录 `assets/scripts/world/`。全部延续工程惯例：程序化节点、显式 layer、无预制体、无物理。

### 3.1 坐标与通行性 —— `world/WorldMap.ts`

大地图的单例门面：坐标换算、通行性查询、区域归属。**全项目世界坐标 = 大图像素坐标，原点=大地图左下角，y 向上（沿 Cocos 惯例）；tile 尺寸 32px。**

```ts
export const TILE = 32;
export interface RegionDef {           // world_regions.json 行
    id: string;                        // 'clearing' | 'residence' | ...
    name: string;
    rect: { tx: number; ty: number; tw: number; th: number };  // tile 区段
    spawn: { tx: number; ty: number }; // 进区默认落点
}
export class WorldMap {
    static readonly inst: WorldMap;
    init(defs: RegionDef[], blocks: Rect[] /* 静态阻挡：水/崖/建筑外墙，由 RegionBuilder 灌入 */): void;
    tileToWorld(tx: number, ty: number): Vec2;      // tile 左下角 → 世界像素
    worldToTile(p: Vec2): { tx: number; ty: number };
    isBlocked(footRect: Rect): boolean;             // 手工 AABB：脚底矩形 vs 静态阻挡 + 改造地形
    regionAt(p: Vec2): RegionDef | null;
    region(id: string): RegionDef | null;
    setTileBlocked(tx: number, ty: number, blocked: boolean): void;  // 地形改造回写通行性
}
```

### 3.2 区域装配器 —— `world/RegionBuilder.ts`

读 `world_regions.json` + `interactables.json`，程序化生成一个区域的全部节点（地面 tile 网格、物件、传送点、NPC、出生点），按需激活。**Tilemap 技术路线拍板：MVP 用「程序化 tile 网格 + 单图集 Sprite」，不用 cc.TiledMap/.tmx。** 理由：① 与工程全程序化惯例一致（无编辑器场景依赖，MCP 自动化友好）；② tile 全部来自同一图集 → 引擎自动合批，drawcall 可控；③ 通行性/改造增量自己管，不背 TiledMap 组件在微信容器的兼容变量。若后期地形设计需要可视化编辑再引入 TiledMap（WorldTileLayer 抽象已隔离该切换）。

```ts
export class RegionBuilder {
    build(def: RegionDef, parent: Node): Node;   // 返回区域根节点（anchor=左下，position=tileToWorld(rect.tx,rect.ty)）
    dispose(regionId: string): void;
}
```

地面渲染：每个区域一个 tile 网格容器，同图集 SpriteFrame 平铺；同屏可见 tile 上限 ≈ (1280/32+2)×(720/32+2) ≈ **42×25=1050 个 Sprite，合批后 1~3 个 drawcall**。

### 3.3 角色 —— `world/player/PlayerCharacter.ts`

```ts
@ccclass('PlayerCharacter')
export class PlayerCharacter extends Component {
    speed = 180;                          // px/s（操控专家调）
    setTilePos(tx: number, ty: number): void;       // 读档回填/传送
    getFootRect(): Rect;                  // 脚底 AABB（世界坐标，宽 ~20 高 ~12）
    lockInput(lock: boolean): void;       // 弹窗/战斗/副本时锁操作
    update(dt: number): void;             // 读输入→位移→WorldMap.isBlocked 分轴回退→朝向动画→上报位置
}
```
动画：MVP 用 SpriteLib 双帧摆动（左右脚两帧翻转）+ 四朝向翻转；像素行走图入库后换帧动画（操控专家出规格）。

### 3.4 输入壳 —— `world/player/IPlayerInput.ts`（实现归操控专家）

```ts
export interface IPlayerInput {
    moveAxis: Vec2;                       // 单位化 [-1,1]²；虚拟摇杆实现
    onAction(handler: () => void): void;  // 交互键（情境按钮为主输入，本接口为手柄/键盘留通道）
}
```

### 3.5 相机 —— `world/CameraFollow.ts`

```ts
@ccclass('CameraFollow')
export class CameraFollow extends Component {
    target: Node | null;                  // 通常 = PlayerCharacter.node
    lerp = 0.12;
    clampToWorld(mapSizePx: Size): void;  // 大地图边缘钳制，不出黑边
    focus(p: Vec2, instant = false): void;// 夜战/剧情锁定封印区
}
```
世界相机独立于 UI 相机（双 Canvas：World Canvas + HUD Canvas，沿用现有 UI_2D layer 惯例）。

### 3.6 世界交互框架 —— `world/interact/`

**本框架是全迁移的中枢：所有「点击面板」旧入口都改为「走近 + 情境按钮」。**

```ts
export interface ContextAction { id: string; label: string; run(): boolean; }
@ccclass('Interactable')
export class Interactable extends Component {
    objId: string;                        // 存档键（clearedIds 等）
    prompt: string;                       // '砍伐' | '采集' | '睡觉' | ...
    range = 56;                           // 触发半径 px（脚底距离）
    actions: ContextAction[];
    enabled: boolean;
}
export class InteractionManager {        // 单例，WorldMap 就绪后启动
    tick(playerFoot: Vec2): void;        // 每帧：范围内最近可交互物 → 发 interactPromptChanged
    dispatchCurrent(actionId: string): void;   // ContextButtonUI 点击转发
    suppress(open: boolean): void;       // 全屏面板/夜战时压掉提示
}
@ccclass('ContextButtonUI')              // 唯一常驻复用节点：锚定世界坐标→屏幕坐标投影，防多点触控误触
export class ContextButtonUI extends Component { ... }
```

### 3.7 开荒系统 —— `world/clearing/`

```ts
export class ClearingSystem {            // 单例；interactables.json 中 type:'tree'|'rock' 条目的状态机
    init(save: ClearingSave): void;      // clearedIds 回填
    chop(objId: string): void;           // 进度推进（砍 N 下）→ 倒下 → spawnDrops
    spawnDrops(objId: string): void;     // 生成 DroppedItem（掉落→1s 后飞向玩家→giveItem→gatherDone 事件）
    respawnTick(dayIndex: number): void; // dayAdvanced 订阅：按 respawnDays 复活（数据驱动）
}
@ccclass('DroppedItem') extends Component { ... }   // 磁吸拾取表现
```
存档：`world.clearedIds: string[]`（永久清除）/ `world.regrowAt: Record<objId, dayIndex>`（待复活）。

### 3.8 地形改造桥 —— `world/terrain/TerrainEditSystem.ts`（衔接地形专家的工程接口）

地形专家负责**设计**（河流/台阶/地窖/房间布置的玩法与数据格式）；本系统是**工程承接面**，接口先行冻结，字段由地形专家确认后回填：

```ts
export interface TerrainEdit { regionId: string; tx: number; ty: number; layer: 'ground'|'object'; tileId: string; }
export class TerrainEditSystem {
    apply(edits: TerrainEdit[]): void;   // 写入 WorldTileLayer + WorldMap.setTileBlocked + emit terrainChanged
    serialize(): TerrainEdit[];          // 存档切片 world.terrainEdits（差量，不存全图）
    deserialize(edits: TerrainEdit[]): void;
    // roomLayout（房间布置）后续挂这里或独立 RoomLayoutSystem，接口同型：差量+serialize
}
```

### 3.9 新数据表

`catalogs/world_regions.json`（六区域区段/出生点/物件清单）、`catalogs/interactables.json`（世界物件：id/region/type/sprite/footAabb/actions/drops/respawnDays/永久清除否）。字段全走 §3.1/§3.6 定义的形状；树/石首版数据由我方在 M2 填样例，后续地形/塔防专家扩展字段。

### 3.10 其余新件

| 类 | 路径 | 职责 |
|---|---|---|
| `WorldSave` | `app/WorldSave.ts` | SaveDataV1.world 切片装配/回填/序列化（GameApp 持有，避免 GameApp 膨胀） |
| `Teleporter` | `world/interact/Teleporter.ts` | 区域出入口（大地图内瞬移落点）与副本入口（确认→loadScene('dungeon')），本质是预置 Interactable |
| `WorldNPC` | `world/interact/WorldNPC.ts` | NPC 世界节点 + Interactable→DialogPanel（npc_dialogs 原样） |
| `YSorter` | `world/YSorter.ts` | 大地图 y-sort：注册世界物件，按脚底 y 重排 siblingIndex；**脏标记 + 仅当 y 跨越邻居时交换**，避免每帧全排序 |
| `FarmWorldBinder` | `world/farm/FarmWorldBinder.ts`（M6） | FarmSystem.plots index→农场区 tile 坐标映射 + 批量挂 PlotWorldView |
| `PlotWorldView` | `world/farm/PlotWorldView.ts`（M6） | PlotView 世界化重写（判定表 §2.3） |
| `DungeonRunSystem` | `dungeon/DungeonRunSystem.ts`（M5，战斗专家主导） | 副本运行态 + 结算通道（继承 AdventureSystem 的负重/惩罚/settle 规则） |
| `DefenseWorldView` | `world/defense/DefenseWorldView.ts`（M4） | 夜战世界内表现（继承 DefenseOverlay 视觉资产）+ 塔放置交互（塔防专家对接） |

---

## 4. 场景架构决策

**拍板：`world.scene` 一张连通大地图 + `dungeon.scene` 独立副本场景 + `launch.scene`。防守夜袭在世界内进行，不切场景。farm.scene 冻结期保留，M6 后移出构建。**

理由：
1. **连通性**：六区域无缝步行 = 必须同场景。总量可控：六区域约 240×80 tile（7680×2560px），2D 像素量级远没到压力线；按区域节点 **显隐 + 停 tick**（RegionBuilder.dispose/activate）控内存与遍历。
2. **副本独立场景**：实时战斗与主地图的相机、输入、y-sort、生命周期完全不同；独立场景 = 加载即净空、状态不互染、崩溃边界清晰（副本炸了回世界出生点即可）。adventure.scene 原地改造，场景切换样板（`GameApp.loadFarm/loadAdventure`）直接复用为 `loadWorld/loadDungeon`。
3. **防守不切场景**：塔防发生在封印区地图上（生成点→水晶），夜幕只是封印区视觉层 + 相机锁定。BedtimeDialog→夜战→天亮全流程零场景切换，**保住「防守只挂在线睡觉流程」红线**，也让漏怪吃库存的表现（作物飞走）能在世界内演出。

**GameApp 启动序变化**（`app/GameApp.ts` 逐行对照）：

```
旧：分辨率 → 平台 → 数据表 → 读档 → FarmSystem.init → 补种子 → 离线结算 → onHide 存档 → SfxLib → DebugPanel → loadScene('farm')
新：分辨率 → 平台 → 数据表 → 读档(v3迁移)
    → WorldSave.init(saveData.world)          // 世界切片（角色位置/开荒/地形/塔/武器）
    → FarmSystem.init(saveData.farm)          // 不变
    → ClearingSystem/TerrainEditSystem.init   // 吃 world 切片
    → 补种子 → 离线结算 → onHide 存档 → SfxLib.bindEvents → DebugPanel
    → SpriteLib.init()（基础组，不 await 完成再切场景）
    → loadScene('world')；WorldMap 按世界切片定出生点（新档=开荒区新手落点，读档=world.playerX/Y）
```
场景切换方法改为 `loadWorld()` / `loadDungeon(mapId)`（副本带参经 `DungeonGateway.pendingMapId` 静态传递，避开 loadScene 无参限制）。

---

## 5. 分阶段实施顺序

> 节奏：单人 + AI 协作，1 人日 = 1 个工作日有效投入。每阶段 = 可运行可验收增量，**验收不过不进下一阶段**。农场后置策略内嵌于 M0/M1/M6。

### 里程碑总表

| 里程碑 | 内容 | 验收标准（全部满足才算过） | 依赖 | 人日 |
|---|---|---|---|---|
| **M0 冻结与分支** | 建 `feature/world-map`；farm.scene 冻结基线；写冒烟清单（种→浇→睡→收→杀进程重进→存档还原） | main 与 feature 双分支构建通过；冒烟清单全绿 | - | **0.5** |
| **M1 世界骨架可走** | world.scene + WorldMap/RegionBuilder（六区域占位地面+阻挡）+ PlayerCharacter + 虚拟摇杆(最简) + CameraFollow + YSorter + GameApp 改进 world；**「旧农场木牌」过渡传送点→farm.scene** | ① launch 进世界落开荒区；② 摇杆走遍六区，河流/建筑阻挡生效；③ 相机跟随+边缘钳制；④ 木牌回旧农场，农场全功能正常、存档互通；⑤ Web 预览 60fps | M0 | **3** |
| **M2 交互框架 + 开荒** | Interactable/InteractionManager/ContextButtonUI + ClearingSystem + DroppedItem + interactables.json 样例（树/石/浆果丛）+ DebugPanel 传送 | ① 走近树→情境按钮→砍 3 下→倒→木材掉落→自动入包→gatherDone；② 清除状态杀进程重进还原；③ 第三天树复活；④ 情境按钮无多按钮重叠、全屏面板时被压掉 | M1 | **3** |
| **M3 居住区 + 地形改造 + 钓鱼/NPC 迁移** | TerrainEditSystem（按地形专家字段）+ 河流/台阶样例改造 + 床=Interactable 接 BedtimeDialog + 钓鱼情境化（FishingController）+ WorldNPC 接 DialogPanel + WorldHUD 上线（面板管理迁移）+ DecorPanel 入口移除 | ① 改河流生效且阻挡更新、存档差量还原；② 走近床→睡前流程→夜战占位直通→天亮；③ 水边情境按钮钓鱼全链路；④ NPC 走近对话正常；⑤ WorldHUD 顶栏信息正确 | M2 | **4** |
| **M4 封印防守塔防化** | DefenseSystem 大改（地图数据/塔防行进）+ DefenseWorldView + 塔放置交互（塔防专家方案落地，作物=塔） | ① 第 4 天夜里睡觉→封印区夜战（相机锁定/夜幕）；② 塔可放置/攻击、怪沿路径行进；③ 全灭=胜利奖励入包、漏怪吃库存；④ 天亮 endDay+存档；⑤ 离线绝不触发夜战（红线回归测试） | M3 | **4** |
| **M5 探险副本实时战斗** | dungeon.scene（adventure.scene 改造）+ DungeonRunSystem（负重/战败惩罚/结算通道继承）+ 战斗专家实时战斗接入 + 传送点进出副本 | ① 探险区传送点→确认→进副本；② 实时战斗（移动/攻击/受击）可玩；③ 采集点/宝箱沿用 spots/treasure 数据；④ 结算入包+endDay；⑤ 战败损失一半收获回世界 | M3（可并行 M4 后半） | **5** |
| **M6 农场区搬迁** | 农场区地块世界化（FarmWorldBinder + PlotWorldView）+ FarmSystem 小改（地块数注入/harvest 坐标回调）+ 拆「旧农场木牌」+ farm.scene 移出构建 + 引导链收尾 | ① **旧档 plots 按确定性映射出现在农场区地块**，种/浇/收全链路；② 图鉴/引导五步全通；③ farm.scene 构建产物移除后全功能回归冒烟绿 | M1（其余任意点后） | **3** |
| **M7 性能与包体收尾** | SpriteLib 分组懒加载全量切换、图集核对合批、真机（微信容器/Tap 容器）实测、包体体检 | ① 微信开发者工具真机 30fps+、drawcall 同屏 ≤40；② 整包 ≤5MB（预算 20MB）；③ 首屏可交互 ≤3s；④ 全量回归清单绿 | M4 M5 M6 | **2** |

**合计 ≈ 24.5 人日（约 5 周）。** 关键路径：M0→M1→M2→M3→M4→M7；M5 与 M4 后半可并行；M6 独立可插队（农场玩家回馈优先时可提前）。

### 农场后置的处理（拍板细节）

- **冻结原则**：M0 起 `farm.scene` 与 farm 三件套一行不改（FarmSystem 到 M6 才动两处小改）。M1 的「旧农场木牌」传送点让旧农场在过渡期**完整可玩**，老玩家零感知降级；farm 写的 plots 与世界共享同一 SaveData，M6 映射零数据损失。
- **映射确定性**：`plotIndex i → col=i%3,row=floor(i/3) → tile=(farmOrigin.tx+col*3, farmOrigin.ty+row*3)`（地块间隔 3 tile 留步道）， farmOrigin 写死在农场区 RegionDef，映射无版本字段、永远可重算。
- **过渡期清理**：M6 验收后才删 farm.scene 引用；FarmGrid/PlotView/BattlePanel/AdventureHUD/DefenseOverlay 五个废弃文件在 M6+M7 统一移除（先停引用再删文件，避免断链）。

---

## 6. 存档兼容（v2 → v3）

**红线延续：只加字段不删字段；farm/codex/inventory 原样保留；迁移链追加，不重写历史步骤。**

```ts
// SaveManager.ts
const SAVE_VERSION = 3;
export interface WorldSaveSlice {
    playerX: number; playerY: number;          // 角色脚底世界像素坐标（读档出生点）
    regionId: string;                          // 上次所在区域（出生兜底 + 离线简报）
    clearedIds: string[];                      // 开荒永久清除物件
    regrowAt: Record<string, number>;          // 待复活物件 → 复活日
    terrainEdits: TerrainEdit[];               // 地形改造差量（不存全图）
    towers: { slotIdx: number; towerItemId: string; plantedDay: number }[];  // 塔防布置（塔防专家字段对齐）
    weapons: string[];                         // 已拥有武器 id（战斗专家字段对齐）
}
// SaveDataV1 追加：world?: WorldSaveSlice;
const migrations: Record<number, (d: AnyRecord) => AnyRecord> = {
    2: (d) => ({ ...d, codex: Array.isArray(d['codex']) ? d['codex'] : [] }),
    3: (d) => ({ ...d, world: d['world'] ?? {
        playerX: 0, playerY: 0, regionId: 'clearing',
        clearedIds: [], regrowAt: {}, terrainEdits: [], towers: [], weapons: [],
    }}),
};
```

要点：
- **旧档零迁移成本**：farm plots 是纯数组，M6 映射是确定函数，无需在档里存映射版本；世界切片缺失时迁移函数给默认落点。
- **容量**：微信 key 上限 ~1MB、总 ~10MB。地形差量是唯一可增长项 → 约束：单区域编辑上限（如 512 条）+ 超限提示「该区域改造已达上限」；towers/weapons 有界。
- **写档时机不变**：persist(reason) 关键节点 + onHide；新增 `dungeonSettled`/夜战结算后必 persist。
- **防御性读取**：WorldSave.init 对每个字段做类型兜底（Array.isArray 等），坏字段按缺失处理，不炸读档。

---

## 7. 风险清单

| # | 风险 | 评估与对策 |
|---|---|---|
| 1 | **包体增量** | 像素小图极小：tile 图集 ~48 种×32px ≈ 25KB、物件+立面 ~40 张 ≈ 40KB、角色 4 向 16~24 帧 ≈ 25KB、防守/副本/UI 增量 ≈ 45KB，**纹理总增量估 150~250KB**；代码增量 ~8 个新类 ≈ 40KB 源码。当前整包 3~4MB → 预计 4~5MB，对 20MB 上限富余。**真风险是首屏加载时长**（SpriteLib 全量预载+大地图装配）→ M1 就按区域装配 + M7 完成分组懒加载，首屏只装开荒区 |
| 2 | **微信容器 drawcall** | 同屏 1050 tile 若不合批=灾难。对策：① 所有 tile/物件**同一图集** SpriteFrame（自动合批）；② **禁用 Graphics 做正式表现**（每 Graphics 独立 drawcall 且不可合批——现工程占位风格必须在大地图退场，占位仅 DEBUG 保留）；③ Label 极省（情境按钮全局唯一复用、顶栏单 Label）；④ M7 用微信开发者工具 drawcall 面板实测，红线 ≤40 |
| 3 | **Tilemap + y-sort 坑** | ① tile 层（地面/障碍）与物件层（角色/树/建筑）**分层管理**，y-sort 只在物件层做，tile 永不参与排序；② 立面素材**锚点必须在脚底**（否则遮挡关系错乱），interactables.json 的 footAabb 与 sprite 锚点配套定义；③ siblingIndex 每帧全排是 O(n log n)——用 YSorter 脏标记 + 相邻交换，物件只在自己 y 变化时参与；④ 角色与物件互遮挡闪帧：统一用「脚底 y 比较」而非节点 y |
| 4 | **触屏多点冲突** | 虚拟摇杆按住 + 另一只手点情境按钮的并发；对策：ContextButtonUI 独立触摸节点（非全屏吞点击），摇杆区域与按钮区域物理分离，全屏面板（背包/睡觉/夜战）时 InteractionManager.suppress |
| 5 | **存档容量与差量膨胀** | terrainEdits 无限增长 → 区域编辑上限 + 重置区域功能（DebugPanel 先行）；wiped 档迁移链测试覆盖 v1/v2 直升 v3 |
| 6 | **离线结算与世界状态交互** | 离线天数触发树复活/作物生长（现有 growOffline 链路），夜战绝不离线判定（红线）；回归用例：离线 2 天 → 树复活且无夜战 |
| 7 | **副本实时战斗帧率** | 实时战斗+怪物 AI 在微信容器的主线程压力；副本场景净空世界节点（切场景天然回收）；怪物节点池化（塔防先行验证） |
| 8 | **TapAdapter 切换**（原阶段 5 TODO） | 大地图存档字段更多，切换平台前必须先真机验证 storage 分片与时间源；TapAdapter 复用原样，风险低 |
| 9 | **AI 协作合并冲突** | 多专家并行改同一文件（GameApp/EventBus/SaveManager 是公共热点）→ 公共文件改动集中在里程碑边界由主线执行，专家分支只改自己目录 |

---

## 8. 回滚安全（git 策略）

```
main            ── 永远可构建可发布（每里程碑合并 + tag v0.m.x，Tap 正式包只从 main tag 出）
feature/world-map ─ 日常开发主战场（M0 建，各 M 验收后 squash-merge 回 main）
  ├── m1-world-skeleton / m2-interaction / ...（可按需开子分支，AI 协作每人/每域一分支）
```

- **main 不进半成品**：只收验收通过的里程碑（M1 后 main 即「旧功能全保留+可走大地图」的可用版本，随时可发测试包）。
- **里程碑合并前必跑回归清单**（M0 冻结的那份 + 该里程碑新增验收项），用 DebugPanel/MCP 自动化跑启动冒烟：进场景→种浇收→睡觉→存档回读。
- **废弃文件不急删**：先停引用（M6/M7），删除单独一个 commit，出问题 `git revert` 单点回滚。
- **存档兼容性回滚**：v3 迁移是纯追加，回滚到旧版本二进制读 v3 档会忽略 world 字段不炸（旧代码只认自己认识的字段，JSON 多余键无害）——天然双向安全，无需档备份脚本；SaveManager 的 .bak 机制继续兜底。

---

## 9. 附：废弃/新文件处置时间表

| 文件 | 动作时点 |
|---|---|
| GameApp.ts / SaveManager.ts / EventBus.ts / DataManager.ts / SpriteLib.ts | M1 起（公共热点，主线统一改） |
| FarmHUD→WorldHUD、DebugPanel 传送 | M3 |
| FarmGrid.ts / PlotView.ts 停引用 | M6；删文件 M7 |
| AdventureSystem.ts → DungeonRunSystem / BattlePanel / AdventureHUD | M5 停引用；删文件 M7 |
| DefenseOverlay → DefenseWorldView | M4 停引用；删文件 M7 |
| DecorPanel | M3 移除入口；居住区布置落地后删 |
| farm.scene 移出构建 | M6 验收后 |
| 新表 world_regions.json / interactables.json | M1 / M2 落地样例数据 |
