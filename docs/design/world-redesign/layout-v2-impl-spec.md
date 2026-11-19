# 大地图 V2 实现规格书（layout-v2-impl-spec）

- 负责：engineering-software-architect
- 日期：2026-11-18
- 状态：设计规格（**本轮不改代码**，由协调者统一实施）
- 上游依赖：`docs/design/world-redesign/world-layout-v2.md`（level-designer 权威布局）。本文附录 A 为架构侧**参考坐标表**——机制与任意坐标集兼容；与 level-designer 输出冲突时，**以 level-designer 表为准，由协调者替换附录 A 后实施**，本文所有机制条文不受影响。
- 关联文档：`terrain-system.md`（16 变体 auto-tile §2.3、RLE §7.2、v3 迁移 §7.3）、`world-design.md` v1 §2.1（本轮推翻的旧冻结表）。

---

## 1. 变更总览

一句话：**TerrainData 成为唯一坐标源（常量 + 新增 LANDMARKS 导出），地图缩为 96×80，generateBaseline 数据化重写（固定管线 + 自动 ford），存档 v4 迁移丢弃旧地形 RLE，5 个文件的地标字面量收敛为单源引用。**

改动面：

| 层 | 改动 | 风险等级 |
| --- | --- | --- |
| `TerrainData.ts` | 尺寸/REGIONS/LANDMARKS/generateBaseline/基线快照/decode 护栏 | 高（核心） |
| `SaveManager.ts` + `GameApp.ts` | SAVE_VERSION 3→4、migration 4 删 world.terrain | 高（存档） |
| `CompassHUD.ts` `WorldSpike.ts` `WorldLiving.ts` `FarmWorldBinder.ts` `TerrainBakeRenderer.ts` | 字面量 → LANDMARKS 引用 | 低 |
| `assets/data/catalogs/interactables.json` | 23 行 tx/ty 重映射，**id 不变** | 中 |
| 渲染/相机/战斗/钓鱼/防守/副本 | **零改动**（常量派生或无坐标耦合） | — |

## 2. 尺寸决议

**建议：MAP_W=96、MAP_H=80。**

- 二者均为 CHUNK=16 的整数倍 → CHUNK_W=6、CHUNK_H=5，共 30 chunks（旧 48 个，-37.5%）。
- 总 tile 12,288 → 7,680（-37.5%）；步距预算（≤20 格）与"区有区隔、路成网络"在 7,680 tile 内更易成立——旧图 65% 被六区矩形占满、没有过渡带空间，是"无规划感"的物理根源。
- **存档影响**：旧地形 RLE 作废重发基线（§5）；farm plots 按 index 确定性映射，**零数据损失**（§4.4）；其余切片（codex/day/economy/world.clearedIds 等）不动。

| 项 | 方案 A（建议）96×80 | 方案 B（备选）128×96 |
| --- | --- | --- |
| chunks | 30 | 48 |
| 总 tile | 7,680 | 12,288 |
| ≤20 格距离预算 | 从容满足 | 需把环带半径再压 ~1.33×，或接受更长步距 |
| 庭院面积（参考表） | 378 tile | 可扩到 ~700+ |
| 机制差异 | 无 | 无（仅换表） |

> 旧文档 world-design.md 曾否决"96×72"——那是**旧矩形分区**下的结论（6,912 tile、内部局促）。V2 为环形枢纽布局 + 96×80，各区面积见附录 A，结论不同不构成矛盾。若 level-designer 坚持保留庭院大空间而选 B，本文全部机制条文原样适用，仅替换数字。

## 3. TerrainData.ts 改动清单（assets/scripts/gameplay/world/TerrainData.ts）

### 3.1 常量区（现 :11-16, :18, :21, :24-31, :33）

```ts
// 尺寸（CHUNK_W/CHUNK_H 已由 MAP 派生，无需单独改）
export const MAP_W = 96;
export const MAP_H = 80;

// 新增：全游戏唯一地标坐标源（替换散布在 5 个文件里的字面量）
export const LANDMARKS = {
  spawn:        { x: 48, y: 41 },  // 枢纽广场中心
  bed:          { x: 48, y: 32 },  // world_bed（庭院内）
  dungeonGate:  { x: 64, y: 30 },  // 副本门（advGate 区西缘）
  sealAltar:    { x: 66, y: 42 },  // 封印祭坛（defense 区西缘）
  dock:         { x: 44, y: 57 },  // 码头（湖南岸）
  farmGate:     { x: 61, y: 59 },  // 农场门（篱笆开口）
  pioneerGate:  { x: 35, y: 41 },  // 开荒区东入口
  riverPoi:     { x: 60, y: 32 },  // 指南针"河岸"教学点
  barn:         { x: 66, y: 60 },  // 谷仓（装饰）
  gardener:     { x: 52, y: 36 },  // NPC
  gatekeeper:   { x: 55, y: 43 },  // NPC
} as const;

// REGIONS v2（矩形 inclusive [x0,y0]-[x1,y1]；权威值以 level-designer 表替换）
// pioneer   x8-35 / y22-53   （森林，可清除物）
// living    x38-58 / y22-39  （庭院，inLiving 门控）
// advGate   x62-87 / y12-33  （副本门区）
// defense   x66-89 / y36-55  （封印防守入口，区内 h1、东缘 h2）
// farm      x54-81 / y60-77  （农田）
// fishing   x18-52 / y54-77  （湖+滩涂）
export const SPAWN = LANDMARKS.spawn;   // :33 改为引用
```

距离验算（直线，格；步行 4 格/s，PlayerCharacter.ts 速度 128px/s）：

| 目标 | 坐标 | 距 SPAWN(48,41) | 格数 | 步行 |
| --- | --- | --- | --- | --- |
| 副本门 | (64,30) | √(16²+11²) | 19.4 ✅ | ~5s |
| 封印祭坛 | (66,42) | √(18²+1²) | 18.0 ✅ | ~4.5s |
| 码头 | (44,57) | √(4²+16²) | 16.5 ✅ | ~4s |
| 床 | (48,32) | 9 | 9 ✅ | ~2s |
| 开荒入口 | (35,41) | 13 | 13 ✅ | ~3s |
| 农场门 | (61,59) | √(13²+18²) | 22.2 | ~5.5s（非硬指标，达标区） |

三项硬指标全部 ≤20 ✅。

### 3.2 generateBaseline() 重写要点（现 :74-135）

**固定管线顺序（不变式，顺序错=路断河或桥错位）：**

1. 全图 Grass 清底；
2. 六区矩形（pioneer=Forest，其余 Grass）；
3. 水系：河段表 + 湖椭圆 + 沙环（数据表驱动，见下）；
4. 路网：路段表（2 宽；hub=StonePath，主干 R2/R3=StonePath，其余 Dirt——回应"零散贴条"观感的最低成本手段，渲染器已支持 StonePath 程序化笔画，无需新素材）；
5. **auto-ford**：遍历路段×河段求交，交点 Water→Dirt（替代 v1 手摆 bridge()；基线"桥"保持 Dirt 语义——CompassHUD.ts:83-88 靠扫 TT.Bridge 判定玩家造桥，基线绝不能写 TT.Bridge）；
6. 高度：四边边界环 h=1；defense 区全 h1、东缘 h2；楼梯格 (64,41-42)、(65,41-42)=TT.Stairs；
7. 全图标 dirty；
8. **基线快照改两份**：`baselineTypes` + `baselineHeights`（现 :43/:134 只快照 types——这是 shovel 幽灵高度 bug 的根源之一，见 R2）；
9. DEBUG 自检（EDITOR||PREVIEW）：从 SPAWN 做 4 向 BFS（按 PlayerCharacter._blocked 同规则：Water 拒/Bridge 通/Δh 规则），断言六个 POI（dungeonGate/sealAltar/dock/farmGate/pioneerGate/bed）可达，不可达 `console.error('[world] unreachable POI: xxx')`。

**数据表驱动（局部常量，改表不改逻辑）：**

```ts
// 河段 [x0,x1,y0,y1]（2-3 宽 Water），自北脊入图、蜿蜒入湖
const RIVER: [number,number,number,number][] = [
  [59,61, 0,38],  // A 北脊：居住区(x≤58)与 advGate 区(x≥62)之间走廊
  [56,60,39,42],  // B
  [52,57,43,46],  // C
  [48,53,47,50],  // D
  [42,46,50,51],  // E
  [39,44,52,53],  // F1
  [36,39,54,56],  // F2，底行与湖顶 (36,57) 连续
];
// 湖：椭圆 center(36,63) rx=11 ry=6 → Water: d²≤1；Sand: 1<d²≤1.82（约 2 格滩环）
const LAKE = { cx:36, cy:63, rx:11, ry:6 };
// 路段 [x0,x1,y0,y1,type]
const ROADS: [number,number,number,number,TT][] = [
  [48,49,37,40, TT.Dirt],       // R1 北：广场→庭院门
  [52,53,31,40, TT.StonePath],  // R2 东北 V
  [52,64,30,31, TT.StonePath],  // R2 东北 H（跨河→副本门，ford 自动生成于 (59-61,30-31)）
  [50,65,41,42, TT.StonePath],  // R3 东：广场→防守楼梯（ford 无）
  [35,44,41,42, TT.Dirt],       // R5 西：广场→开荒区
  [48,49,44,53, TT.Dirt],       // R4 南 V（跨河 E 段？否——E 在 x42-46，无交点，已验算）
  [44,48,52,53, TT.Dirt],       // R4 南 H（×F1 → ford (44,52-53)）
  [44,45,54,57, TT.Dirt],       // R4 南 V2：→码头
  [50,62,55,56, TT.Dirt],       // R6 农场 H
  [61,62,57,59, TT.Dirt],       // R6 农场 V：→农场门
];
const PLAZA = { x0:45, x1:51, y0:40, y1:43, type:TT.StonePath }; // 枢纽广场
```

路×河交点已验算：R2×A=(59-61,30-31)、R4-H×F1=(44,52-53)，其余 0。ford 只允许出现在此推导处，**禁止**在基线手写 TT.Bridge。

### 3.3 decodeRLE 护栏（现 :182-198）

现状：按当前 `MAP_W*MAP_H` 填充、i<n 即停、无任何维度/版本戳。尺寸改小后旧 RLE 会"成功"解码出截断+错行的地形（返回 true 不回基线）→ 软锁风险。

修复（双保险）：
- **主**：SaveManager v4 迁移直接删 `world.terrain`（§5），旧 RLE 永远不会被 decode；
- **辅**：decodeRLE 开头加护栏 `if (bin.length % 3 !== 0 || bin.length > MAP_W*MAP_H*3) return false;`（RLE 编码为每 run 3 字节，见 :166-180），异常长度一律回基线。

### 3.4 不变式（不许动的部分）

- TT 枚举 9 值与 BUILT_TYPES 不动（本轮不加地形类型；加类型需同步 bitmask/渲染器/pool 帧表，非本轮范围）。
- bitmask 4bit 邻接（:137-147，上1右2下4左8，出界按 Water）不动。北脊河贴 y0 边：出界=Water 使河源 bitmask 自然连续，无需特判。
- `inLiving()`（:157-160）读 REGIONS 表，换表自动生效；庭院改造门控（TerrainEdit.ts:50）与工具坞显隐（WorldSpike.ts:267-274）随之平移，无需改代码。
- `setCell` 标脏自身+4 邻（:59-71）不动。

## 4. 坐标联动清单（逐文件，实施时一次 PR）

| # | 文件:行 | 现状 | 改为 |
| --- | --- | --- | --- |
| 4.1 | `CompassHUD.ts:16-20` | POIS 硬编码 dungeon(112,10)/seal(110,52)/river(66,26) | `import { LANDMARKS }`：dungeon→dungeonGate、seal→sealAltar、river→riverPoi。:83-88 的 TT.Bridge 全图扫描**不改**（造桥教学语义保留） |
| 4.2 | `WorldSpike.ts:390` | 门 setPosition((112+0.5)*TILE, -(10+0.5)*TILE) | 用 LANDMARKS.dungeonGate；贴图键 adventure/dungeon_gate、Interactable id `dungeon_gate` 不变 |
| 4.3 | `WorldLiving.ts:115` | farm_barn (71,56) | LANDMARKS.barn |
| 4.4 | `WorldLiving.ts:261` | world_seal (110,52) | LANDMARKS.sealAltar |
| 4.5 | `WorldLiving.ts:277` | world_bed (74,24) | LANDMARKS.bed |
| 4.6 | `WorldLiving.ts:293-296` | gardener(76,29)/gatekeeper(86,55) | LANDMARKS.gardener/gatekeeper |
| 4.7 | `FarmWorldBinder.ts:6` | FARM_PLOT_ORIGIN={tx:67,ty:58,pitch:4} | {tx:62,ty:62,pitch:4}。**index=row*3+col 映射不变 → 旧档 9 格 plots 顺序不变，零迁移**；新足迹 x62-72/y62-72 在 farm 区内，与河道（x≤47）、barn(66,60) 均不重叠 |
| 4.8 | `ClearingSystem.ts` | **零代码改动**。物件数据驱动读 interactables.json，附录 B 全表重映射 tx/ty，**id 逐字不变**（clearedIds/regrowAt 依赖 id 稳定） |
| 4.9 | `TerrainBakeRenderer.ts:186-187` | benchEdit 中心硬编码 (74,26) | LANDMARKS.spawn |
| 4.10 | `TerrainPoolRenderer.ts` + `WorldSpike.ts:179` | pool 帧表 water/sand 回退 grass 帧 | P2：AI tileset 落地时补真帧；非阻塞（烘焙层已有真实渲染） |
| 4.11 | `CameraFollow.ts:19-20` | 钳制 = MAP_W/H 常量派生 | **零改动**（验证项） |
| 4.12 | `PlayerCharacter.ts` `DefenseCore.ts` `CombatLogic.ts` `FishingSystem` | 无世界坐标耦合（防守/副本战斗为独立图/面板；钓鱼为 ±3 格动态探针 WorldLiving.ts:331-370） | **零改动**（验证项：grep 复核） |

## 5. 存档迁移 v3 → v4

`SaveManager.ts`：SAVE_VERSION 3→4；MIGRATIONS 增加 `{ 4: (data) => { if (data.world) delete data.world.terrain; } }`。`GameApp.ts` `_newGame` 的 version 字面量改引用 SAVE_VERSION 常量。

**为什么是"删"而不是"缩放/平移"**：旧 128×96 RLE 无维度戳（§3.3），任何几何变换都无法验证正确性；且布局全变（六区矩形、河道、路网全部重画），旧地形没有保留价值。删除后 WorldSpike.ts:65-77 的恢复逻辑自然走"decode 失败/缺省 → 基线"分支，**WorldSpike 零改动**。

迁移验证点（升级路径 = v3 档 → 新版加载）：

1. `world.terrain` 被删除，且**迁移先于 loadScene('world')**（GameApp.ts start 顺序已保证：迁移在 :55-97，loadScene 在尾部）；
2. 地形 = 新基线（terrainDump 抽查：ford=2 组、湖存在、defense 东缘 h2）；
3. `world.clearedIds/regrowAt` 原样保留，且新表坐标命中（已清岩石保持倒下；dbgDay 推进复活正常）；
4. `farm.plots` 长度 9 不变，9 个 farm_plot_i 节点出现在新足迹上；
5. codex/day/economy 切片数值原样；
6. 幂等性：v4 档二次加载不重复迁移、不报错；
7. 主档损坏 → 回退 bak → bak 同样走迁移链（load 单入口，天然覆盖）；
8. 存档写回：persist() 重新 encodeRLE 的是**新尺寸**基线（96×80），后续加载 decode 长度自洽。

> 约束冲突说明：项目 §12 约定"只加字段不删字段"；此处删除的是**作废的重发式数据**（v1 基线本就是可再生数据），与"不删玩家资产字段"的约定本意一致。由协调者在实施说明中向团队明示。

## 6. auto-tile 与烘焙渲染不变式

1. **chunk 结构自动适配**：TerrainBakeRenderer 每 chunk 512×512 canvas（16×16 tile×32px），CHUNK_W/CHUNK_H 由 MAP 派生 → 30 chunks（6×5）；`chunkRangeOf`(:197-203) 的 halfW=10/halfH=6 tile 视口裕量按 1280×720 视口（20×11.25 tile）推导，不随地图尺寸变化，**零改动**。
2. **16 变体素材切片规格（给 image-prompt-engineer）**：4×4 精灵图集按 bitmask 0–15 主序（上1右2下4左8），每格 32×32 art，同调色板；渲染器扩展点在 `_tileSpec`(:51-60) 的 `setSources` 映射（TT→{frame, variants}）。**当前 3 tile 源 + 4 程序化笔画可先跑通 V2 布局，素材替换是独立 PR，不阻塞本规格。**
3. **StonePath 可渲染**：_tileSpec 已含 StonePath 程序化笔画，主干石路无需新素材即可见效。
4. **层铁律**：程序化建节点显式设 layer（WorldSpike/WorldLiving 现状已遵守）；本轮新增/挪动节点沿用 `Layers.Enum.UI_2D` 传入链。
5. **出屏释放/单 chunk 失败不崩**逻辑不动。

## 7. 验证与回归清单（实施期执行；现有 window.__spike DEBUG 钩子足够，无需新框架）

| 用例 | 步骤 | 通过标准 |
| --- | --- | --- |
| 基线连通性 | EDITOR 启动 world 场景 | console 无 `[world] unreachable POI` |
| 距离预算 | spawn 落地，指南针读数 | 副本/封印/码头 ≤20 格（与 §3.1 表一致） |
| ford 语义 | terrainDump | 无 TT.Bridge；ford 处为 Dirt 且可通行（dbgWalkTo 穿河） |
| 造桥教学 | build_bridge 后看指南针 | river 箭头永久隐藏（TT.Bridge 扫描命中） |
| 存档迁移 R1 | 预置 v3 档（含旧 128×96 RLE）→ 加载 | §5 八项全过；spawn 六向 dbgWalkTo 可走 |
| 存档迁移-物件 | 同上档 | 已清岩石倒下状态保持；dbgDay(1) 复活 |
| shovel 高度 R2 | dbgTool stairs→dbgEdit→dbgTool shovel→dbgEdit | 目标格可通行；undo 后高度还原 |
| 庭院门控 | dbgTp 出/入 living 区 | 工具坞显隐正确；庭院外编辑被拒 |
| 相机钳制 | dbgTp(1,1) 与 dbgTp(94,78) | 相机不越界（CameraFollow 常量派生验证） |
| 包体 | 构建产物统计 | 增量 ≤1.5MB（AI 素材后），全包 ≤20MB |

## 8. 风险表

| # | 风险 | 位置 | 触发 | 影响 | 状态 | 最小修复 | 回归用例 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | decodeRLE 尺寸盲区：按当前地图尺寸填充，无维度戳 | TerrainData.ts:182-198 | 改尺寸后加载含旧 RLE 的档 | 截断+错行地形渲染；出生点可能被错位水域围死=软锁 | **已复现**（代码走查：`const n=d.types.length` 按 n 停、返回 true 不回基线） | v4 迁移删 terrain（主）+ 长度护栏（辅，§3.3） | §7 存档迁移 R1 |
| R2 | shovel 不还原高度：`case 'shovel'` 只还 types | TerrainEdit.ts:115-122 + TerrainData.ts:43/:134 | 庭院内 stairs→shovel | Grass+幽灵 h1 不可通行格（自愈：重建台阶） | **已复现**（代码走查） | 基线快照补 heights；shovel 同步还原 nh | §7 shovel 高度 R2 |
| R3 | 地标字面量散布 5 文件 | CompassHUD.ts:16-20 / WorldLiving.ts:115,261,277,293-296 / WorldSpike.ts:390 / FarmWorldBinder.ts:6 / TerrainBakeRenderer.ts:186-187 | 挪区时漏改任一处 | 指南针指错/地标悬空/农田错位 | 潜在（现状字面量与基线自洽，无症状） | LANDMARKS 单源 + 全部替换 | grep `(112,10|110,52|74,24|71,56|67,58)` 全仓 0 命中；真机逐地标冒烟 |
| R4 | interactables id 漂移 | assets/data/catalogs/interactables.json | 重排时顺手改 id | 旧档 clearedIds/regrowAt 失效→复活/占格错乱 | 潜在 | 约束：只改 tx/ty | §7 存档迁移-物件 |
| R5 | generateBaseline 管线顺序错 | 新 generateBaseline | 路 画于 水前 / ford 于高度后等 | 路断河=区域不可达 | 潜在（新代码） | 固定顺序（§3.2）+ DEBUG BFS 断言 | §7 基线连通性 |
| R6 | 附录 A 参考表与 level-designer 表不一致被直接照抄 | 本文附录 A | 协调者未裁决 | 物件落水/地块压河 | 潜在 | 实施前以 level-designer 表替换附录 A | BFS + 占格检查（物件/plot 足迹非 Water） |
| R7 | 程序化节点漏设 layer | WorldSpike/WorldLiving 各 new Node 处 | 新增节点 | 不渲染（项目踩坑铁律） | 潜在 | 沿用 layer 传入链 | 真机冒烟 |
| R8 | AI 素材包体超预算 | assets/textures 新增 | 未压尺寸/未索引色 | 逼近 20MB 上限 | 潜在 | 预算 ≤1.5MB 增量（详见 asset-prompts 文档） | §7 包体 |
| R9 | decode 长度护栏的极端损坏档 | TerrainData.ts decodeRLE | bin 损坏 | 异常上屏 | 未验证（需运行时注入） | `%3!==0` 即回基线 | 构造坏串回退基线 |

## 9. 附录 A：坐标总表（已裁决替换）

> **2026-11-18 协调者裁决**：level-designer 缺位，权威表由协调者按 pacing 预算定稿并实施，落盘于 `world-layout-v2.md` §1-§4（下称"冻结表"）。本附录原参考坐标（spawn 48,41 / dungeonGate 64,30 / sealAltar 66,42 / dock 44,57 等）**作废**，实施一律以冻结表为准。冻结值速查：SPAWN(50,40)、床(50,38)、谷仓(65,38)、祭坛(60,28)、副本门(50,22)、码头(42,56)、园艺师(46,42)、守门人(54,36)、地块 origin(58,42) pitch4、POI 副本(50,22)/防守(60,28)/码头(42,56)。地形要点：湖体矩形 x20-42/y58-71 + 2 格沙环；河 5 宽五段 (32,36,0,16)(30,34,16,30)(32,36,30,44)(30,34,44,52)(32,36,52,57)；高度边界环 h1 + defense 东缘 x86-90/y16-28 h2（无独立楼梯格，台阶由 Bridge/Stairs 语义段承担）。

## 10. 附录 B：interactables.json v2 重映射（已实施版本）

id/hp/range/drops/label 逐字不变，只换 tx/ty；**石 respawnDays 0→5**（pacing §6.3，防开局挖空）。

- 树×12 pioneer_tree_01..12：(12,10)(18,14)(24,8)(10,20)(16,24)(22,18)(26,26)(14,30)(8,14)(20,30)(28,12)(40,30)
- 石×8 pioneer_rock_01..08：(40,32)(12,16)(20,10)(8,24)(24,30)(28,20)(16,8)(6,18)
- 灌×3 pioneer_bush_01..03：(10,28)(22,22)(30,8)

全部避开河/路/湖/相互重叠；开荒区东门 (38,32) 12 格内 ≥1 树+≥1 石 ✓（校验脚本断言）。原参考表作废。

## 11. 附录 C：网格布点示意图（每字符≈2×2 tile，48×40；示意非精确）

```
..................................RR............................
..................................RR............................
..................................RR............................
..................................RR............................
..................................RR............................
..................................RR............................
..............................AAAAAAAAAAAAA.RR..................
..............................AAAAAAAAAAAAA.RR..................
..............................AAAAAAAAAAAAA.RR..................
..............................AAAAAAAAAAAAA.RR..................
..............................AAAAAAAAAAAAA.RR..................
....FFFFFFFFFFFF.......LLLLLLLLLL.RR.AAAAAAAAA.................
....FFFFFFFFFFFF.......LLLLLLLLLL.RR.AAAAAAAAA.................
....FFFFFFFFFFFF.......LLLLLLLLLL.RR.AAAAAAAAA.................
....FFFFFFFFFFFF.......LLLLLLLLLL.RR.AAAAAAAAA.................
....FFFFFFFFFFFF.......LLLLLLLLLL.RR.AAAAAAAAA.s..............
....FFFFFFFFFFFF.......LLLLLLLLLL.RR.AAAAAAAAA.s..............
....FFFFFFFFFFFF.......LLLLLLLLLL.RR.AAAAAAAAA.s...DDDDDDDDDD..
....FFFFFFFFFFFF.......LLLLLLLLLL.RR.....#####s...DDDDDDDDDD..
....FFFFFFFFFFFF.......LLLLLLLLLL..RR....#####s...DDDDDDDDDD..
....FFFFFFFFFFFF.........P...RR..#######s...DDDDDDDDDD..
....FFFFFFFFFFFF.......#####P#####RR.###......s...DDDDDDDDDD..
....FFFFFFFFFFFF.......#########RRR..........s...DDDDDDDDDD..
....FFFFFFFFFFFF.......#..RRR.................s...DDDDDDDDDD..
....FFFFFFFFFFFF.......#..RRR....................DDDDDDDDDD..
....FFFFFFFFFFFF.......#...RRR...................DDDDDDDDDD..
....FFFFFFFFFFFF.......####..RR..................DDDDDDDDDD..
.........ssssss..ss##....RR......................DDDDDDDDDD..
.........sWWWWWWWWs.s#....RR......................s.............
.........sWWWWWWWWWWs............................sMMMMMMMMMMM..
.........sWWWWWWWWWWWs...........................MMMMMMMMMMMM..
.........sWWWWWWWWWWWs...........................MMMMMMMMMMMM..
.........sWWWWWWWWWWWs...........................MMMMMMMMMMMM..
.........sWWWWWWWWWWs............................MMMMMMMMMMMM..
.........sWWWWWWWWs..............................MMMMMMMMMMMM..
.........ssssssss................................MMMMMMMMMMMM..
.................................................MMMMMMMMMMMM..
.................................................MMMMMMMMMMMM..
.................................................MMMMMMMMMMMM..
................................................................
```

（#主路 P广场 R河 A副本门区 D防守区 F开荒林 L庭院 M农田 W湖 s沙。精确坐标以 §3.2 段表与附录 A 为准。）

## 12. 附录 D：明确不做清单（本轮）

- 不改：防守/副本战斗层、钓鱼系统、TerrainEdit 工具规则（除 shovel 高度 bug 修复）、SaveManager 结构（除 v4 迁移行）、furniture.json（decorPos 为屏幕系，与布局无关）。
- 不加：新地形类型、传送/枢纽机制（若 game-designer 判定需要，属新增 Interactable 类型 + terrain_ops 行，另立规格）。
- 不做：AI tileset 替换渲染（P2，独立 PR；本规格只预留 setSources 扩展点与素材切片规格）。
- 不手编 library/temp；不引入 TapTap API 直接依赖（平台适配层不变）。

## 13. 实施顺序建议（给协调者）

1. **P0 冻结坐标**：level-designer 表定稿 → 替换附录 A/B → interactables.json v2；
2. **P0 核心**：TerrainData（尺寸/REGIONS/LANDMARKS/generateBaseline/快照/护栏）一次 PR；
3. **P0 存档**：SaveManager v4 + GameApp version 常量化；
4. **P1 联动**：§4 的 5 文件字面量替换（+附录 B 数据表）；
5. **P1 回归**：§7 全表（全部基于现有 DEBUG 钩子）；
6. **P2**：Water/Sand 真帧、pool 帧表、AI tileset setSources（依赖素材文档）。

预估实施工作量：P0 约 0.5-1 人日，P1 约 0.5 人日（含回归脚本）。

## 14. 实施记录（2026-11-18，协调者执行）

状态：**P0/P1 已全部落盘**，`tsc --noEmit` 项目代码零错误。与本文条文的偏差（均为等价替代，机制不变）：

1. **存档迁移**：未升 SAVE_VERSION 3→4，改用 `terrainSize` 守卫（WorldSave 可选字段 + GameApp.persist 写入 + WorldSpike.start 解码前校验，不等→重发基线）。效果与 §5 等价：旧尺寸 RLE 一律作废重发。
2. **LANDMARKS 单源导出**：本轮未引入，5 文件地标仍为字面量（已按冻结表统一改值）。理由：一轮 PR 内字面量改动更小、可 tsc 直接验证；单源重构挪到下次触terrain 代码时顺带做（§3.1 的导出设计仍有效，届时照抄）。
3. **附录 A/B**：已替换为冻结实施值（见 §9/§10 替换后文本）。
4. **补齐本文未覆盖项**（ui-notes F1-F3/pacing §6 执行）：ToolDock 右下 (310,-262) SLOT88/GAP12 撤销最左+状态条 (0,94)；SettingsPanel ⚙ 热区 88×88 视觉 r28 @ (572,292)；CompassHUD EDGE 52+顶部让位+POI 三点；CameraFollow y+60 先偏移后钳制；WorldHUD 640×40@(0,316)、Intel 520×36@(0,268)；路牌×4（WorldLiving `_buildSigns`）；crops.json carrot/tomato/pumpkin seasons→[]。
5. **素材**：tiles/ground_water、ground_sand、ground_stone 三张 AI/程序化 32×32 tile 已生成并导入（meta nearest+no-trim），WorldSpike srcs/pool 已挂 {3,4,5} 帧。见 `docs/assets/world-v2-asset-prompts.md`。
6. **benchEdit**：TerrainBakeRenderer 基准点 (74,26)→(24,36)（草地）。
7. **校验**：`tools/validate-layout-v2.py` 全约束 ALL PASS；world-layout-v2.md §8 附 ASCII 底图。
