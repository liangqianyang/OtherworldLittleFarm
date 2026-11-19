# V3 Clarity — 玩法侧可读性预算与数值衔接（v3-clarity-gameplay-budgets）

- **负责人**: GameDesigner（玩法系统与数值设计）
- **日期**: 2026-11-19
- **上游基准**: `docs/design/game-design-draft.md`（§6/§11/§13/§16/§17）、`docs/design/world-redesign/world-layout-v2.md`（冻结几何）、`docs/design/world-redesign/layout-v2-pacing.md`（上轮产出）、`docs/design/world-redesign/00-synthesis.md`
- **定位**: 本文档只回答「视觉杂乱」的**玩法侧**成因与 V3 硬预算（判据、每屏预算、语义绑定、数值衔接）。区块几何坐标、路网走向、纹理排布归 Level Designer；本预算表是其必须满足的约束。
- **原则重申**（§16，全部延续）: 防守失败不清档；限时内容周期返场；核心进度不绑广告/内购。

---

## 0. 结论速览

| # | 结论 | 依据 |
|---|------|------|
| C1 | **实机视口是 20×11.25 格，不是简报口径的 24×11**。出生屏实测：4 种地面类型 + 6 个交互物 + 10+ UI 部件。出生屏杂乱主因是**物件与 UI 密度**，不是地面类型过载（4 种类型全部有玩法语义） | `CameraFollow.ts:7`（640×360 世界px = 20×11.25 tile）；§1.1 实证表 |
| C2 | 地面类型过载的真实峰值在**码头视角（5 种）**与桥/农田视角（4 种）；全图唯一**无独占玩法语义**的地面类型是 Sand（唯一规则"可开垦"与 Grass/Dirt 完全重叠）→ 沙环是 V3 首选删除对象，TT 枚举保留即可兼容旧档 | `TerrainEdit.ts:67`；`TerrainData.ts:81-142`；§1.2 计数表 |
| C3 | **Dirt 土路与农田土壤共用 `plot_soil` 贴图** = 同一视觉语言承载两种玩法语义（J2 语义歧义），玩家会把路读成可开垦地 → V3 需要素材级分离（新 dirt 路面贴图 1 张即可，非大量美术） | `TerrainBakeRenderer.ts:24`（`Dirt→plot_soil`） |
| C4 | Defense 区 33×27=924 格在世界侧的唯一功能是「祭坛交互开 BuildPanel」（防守布阵在独立图 `defense_maps.json`），基线里该区全是空草地 → **可收缩至 ~14×12 而零玩法损失**，是消除"空旷拼布感"的最大杠杆 | `defense_maps.json` seal_1 独立布阵图；`TerrainData.ts:81-142` |
| C5 | 9 段 zigzag 路网在枢纽形成 **4 向岔口**，叠加 altarH/pioneerV/dockH 三条非正交支路 → 每屏 1-3 个寻路微决策（J1 判据）。V3 路网 ≤6 段、正交对齐、枢纽岔口 ≤3 向 | §1.3 + §2.3 R-G4 |
| C6 | **移速口径修正：实机 4.0 格/s**（上轮 pacing 文档引用的 4.5 格/s 已过时）。所有距离预算的格数不变，时间按 ×1.4 路径系数 ÷4.0 重算，全部仍在阈值内 | `PlayerCharacter.ts:20`（`speed = 128`）；§4 对照表 |
| C7 | **数值目录零改动即可配合 V3**：crops/fish/monsters/waves/items/interactables/calendar/terrain_ops/adventure/weapons 与几何正交（不引用世界坐标，interactables 仅 tx/ty 可按既定重映射规则平移）。上轮 R2/R3 补丁已确认落盘 | §3.1–§3.2 |

**给协调者的一句话**: V3 的玩法侧贡献是 6 条硬预算（§2.3 R-G1~G6）+ 1 个删除决策（Sand）+ 1 个素材语义分离需求（Dirt 贴图）+ 口径修正 ×2（视口、移速）；不新增任何机制、不改任何 catalog 数值。

---

## 1. 杂乱感的玩法侧判据与 V2 实证

### 1.0 三条玩法侧判据（区别于上轮"距离预算"视角）

| 判据 | 定义 | 量测方法 |
|------|------|---------|
| **J1 决策密度** | 一屏内需要玩家做出寻路/交互决策的元素数（岔口、可交互物、可采集物） | 滑动 20×11.25 视口窗口清点 |
| **J2 语义歧义** | 同一视觉语言承载 ≥2 种玩法语义（玩家无法从贴图判断"这里能做什么"） | 贴图类型 × 玩法语义映射表（§2.4），一词多义即违规 |
| **J3 类型过载** | 一屏内基线地面类型 >3 种（相似律：同质大岛引导注意力，异质拼贴产生噪音） | 滑动视口窗口数 TT 类型（不含过渡变体） |

### 1.1 出生屏实证（视口 20×11.25 格，中心 SPAWN(50,40) → x∈[40,60], y∈[34.4,45.6]）

| 类别 | 数量 | 明细 | 语义判定 |
|------|------|------|---------|
| 基线地面类型 | **4** | StonePath 广场(40-52,36-46 与视口交集)、Grass、Dirt 路（westH/eastH/northV/southV 交集）、农田 soil 角（地块 origin(58,42) 4×4 与视口交集） | 4 种**全部有语义**（广场/基底/寻路/生产）→ J3 未违 |
| 交互物 | **6** | 床(50,38)、园艺师(46,42)、守门人(54,36)、路牌 N(49,35)、路牌 E(55,38)、农田地块角 | 超预算（R-G2 ≤4）→ **J1 违规主因** |
| UI 部件 | **10+** | 右列 4 钮 + 底部 6 槽工具坞 + 顶部双 HUD（简报实测陈述） | 超预算（R-G6）→ 出生屏杂乱**并列主因** |

（路牌 S(47,47) 在 y45.6 之外，不入屏。）

### 1.2 关键视角地面类型计数（按 20×11.25 视口，几何可复算）

| 视角 | 中心 | 视口 x,y | 地面类型 | 计数 | 判定 |
|------|------|---------|---------|------|------|
| 出生/枢纽 | (50,40) | 40-60 / 34.4-45.6 | stone+grass+dirt+soil | 4 | J1 超（6 物）；J3 边缘 |
| **码头** | (42,56) | 32-52 / 50.4-61.6 | water+sand+grass+dirt+deck | **5** | **全图峰值**；其中 sand 无语义 → J3 违规 |
| 桥 | (34,40) | 24-44 / 34.4-45.6 | grass+forest+water+dirt | 4 | sand 未入屏，J3 边缘 |
| 农田中心 | (59,43) | 49-69 / 37.4-48.6 | grass+soil+dirt+stone | 4 | J3 边缘 |
| 祭坛 | (60,28) | 50-70 / 22.4-33.6 | grass+stone+dirt | 3 | 达标 |
| 副本门 | (50,22) | 40-60 / 16.4-27.6 | grass+stone+dirt（+forest 东缘 x40 列细条） | 3~4 | 边缘 |

### 1.3 对简报候选假设的玩法侧归因（诚实结论，含推翻）

| 简报假设 | 玩法侧判定 | 证据 |
|---------|-----------|------|
| ① 类型过多且硬边 | **部分成立**：峰值 5 种在码头视角；出生屏 4 种全有语义。"硬边无过渡"是素材问题，归 Level/Image Prompt；玩法侧锁定上限（R-G1）+ 删 Sand | §1.2 |
| ② 9 段 zigzag 乱线 | **成立**：枢纽 4 向岔口 + 3 条支路非正交拐点 = 每屏 1-3 个寻路微决策（J1） | geometry；R-G4 |
| ③ 区域矩形咬合拼布感 | **修正**：区界在基线上不可见（区界两侧全是 Grass），真正的"空旷感"来自**大片无功能空地**——Defense 924 格空草是最大贡献者 | `TerrainData.ts:81-142`（defense 区 fill Grass + 东缘抬2） |
| ④ 地标/装饰密度 | **成立（出生屏）**：6 交互物超预算 | §1.1 |
| ⑤ UI 叠加 | **成立（出生屏并列主因）**：10+ UI 部件；归 UI Designer，玩法侧给总预算（R-G6） | §1.1 |
| ⑥ 河流+桥+沙环碎片化 | **成立（湖岸）**：码头视角 5 类型、窄条带（water/sand/deck 相邻）是全图可读性最差处 | §1.2 |

---

## 2. V3 玩法硬预算（Level Designer 必须满足的约束）

### 2.1 距离预算（格数维持上轮拍板，仅守门人按本轮简报收紧为 ≤8）

| 预算项 | 上限（格） | V2 实测 | 是否达标 | 备注 |
|--------|-----------|---------|---------|------|
| 床 ↔ 出生点 | ≤2 | 2.0 | ✓ | 硬锚 |
| 床 ↔ 最近地块中心 | ≤10 | 9.5 | ✓ | 种田主循环 |
| 床 ↔ 出货/买种点 | ≤12 | — | — | 出货箱随谷仓/广场布点 |
| 床 ↔ 守门人 | **≤8（本轮收紧）** | 5.7 | ✓（现值） | V3 重排后必须重测 |
| 床 ↔ 最近采集物 | ≤14 | 14.1（树）/12.8（石） | ✓ | R3 已落 8 岩 |
| 床 ↔ 码头 | ≤18 | 17.9 | ✓ | |
| 床 ↔ 副本门 / 祭坛 | ≤20 | 18 / 15.6 | ✓ | 不变式：门/祭坛须北主路轴可达（layout-v2 §不变式） |

### 2.2 功能区玩法空间预算（下限=功能必需，建议上限=可读性）

| 区 | 世界侧玩法功能 | 最小 | 建议上限 | 硬约束 |
|----|--------------|------|---------|--------|
| living | 床/出货/守门人/园艺师/广场身份 | 8×8 空地 | 广场石板 ≤13×11（V2 现值即上限） | 功能物 5 个不可少 |
| farm | 9 地块（每块 3×3 tile）+ 走道 ≥2 格/侧 + 边界物带 | 22×18 | — | **pitch=4 锁死**（存档不变式，见 §3.3）；地块组本体 12×12 |
| pioneer | 23 采集物（树≥10/石≥8/灌≥3）+ 入口教学对 | 树≥10 石≥8 灌≥3 | 同屏采集物 ≤4（R-G3） | 入口 12 格内 ≥1 树+1 石；密度 ≥1 物/150 格；**只改 tx/ty**（既定重映射规则） |
| fishing | 湖体（钓鱼探针=玩家 3 格内 Water）+ 码头 Deck 2 格 | water ≥22×14 | — | **沙环取消**（§2.4）；Deck 保留 2 格 |
| defense | 世界侧唯一功能 = 祭坛交互开 BuildPanel | 10×10（含祭坛台 + 接近空间） | **~14×12**（V2 33×27=924 格 → 收缩 ~78%） | 祭坛保持路轴端点；防守布阵在独立 defense_maps 图，不受影响 |
| advGate | 门台 + 前导轴线 | 台 5×5 + 前导 ≥4 格 | — | 门(50,22) 现坐标可保留或平移，须轴可达 |

**地图尺寸**：玩法侧无强诉求——距离预算是绝对格数，任一尺寸同样成立（首日经济模拟不依赖总面积）。若要缩图，受 chunk 约束尺寸必须为 16 的倍数（`TerrainData.ts:15-17` CHUNK_W=6/H=5 → 96×80），候选：**96×64（-20% 面积）/ 80×80（-17%）**；维持 96×80 并把省出的 defense/farm 空间转为留白草地同样符合主流调研（"不填满、留白"）。最终由 Level Designer 论证拍板。

### 2.3 每屏可读性预算（R-G1~G6，validator 可断言）

| # | 预算 | 数值 | V2 实测对照 |
|---|------|------|------------|
| R-G1 | 一屏基线地面类型 ≤ **3** | stone/grass/dirt/soil/forest/water 计数（过渡变体不计） | 违规视角：码头 5、桥 4、农田 4、出生 4 |
| R-G1b | 一屏人造格类型 ≤ **2** | Dirt 路 / Deck / Bridge / Stairs（玩家铺装 + 基线 Deck/Bridge） | 码头 dirt+deck = 2 达标 |
| R-G2 | 一屏交互物 ≤ **4**（出生屏 ≤ **3**） | 床/出货/NPC/地块入口等可交互 | 出生屏 6 → 超支（砍路牌、移地块角出屏） |
| R-G3 | 一屏采集物 ≤ **4** | pioneer 重排时同屏树/石/灌计数 | 防采集物扎堆 = 防视觉扎堆 |
| R-G4 | 枢纽一屏路向 ≤ **3**（丁字，不做 4 向岔口）；全图路网段数 ≤ **6**、全正交 | — | V2: 4 向岔口 + 9 段 zigzag |
| R-G5 | 语义绑定唯一：每张贴图类型恰好 1 种玩法语义（§2.4） | — | V2 违规：plot_soil 同载"路/田" |
| R-G6 | 出生屏总预算 = R-G1(≤3) + R-G2(≤3) + UI 部件数由 UI Designer 给出并合并进总账 | — | 现状 4+6+10+ 超支 |

### 2.4 地面类型 × 玩法语义绑定表（V3 处置）

| TT | 玩法语义 | 唯一规则（代码锚点） | V3 处置 |
|----|---------|---------------------|---------|
| Grass | 基底/通行 | hoe 可开垦（`TerrainEdit.ts:67`） | 保留；素材加 2-4 个**同色系**变体打散重复 |
| Dirt | 路 + 可开垦 | 通行；hoe→Dirt | 保留；**素材换成独立路面贴图**（与 plot_soil 分离，修复 J2） |
| Forest | 障碍 | 不可走 | 保留（pioneer 区底） |
| Water | 障碍 + 钓鱼 | 不可走（`PlayerCharacter.ts:115`）；钓鱼探针 3 格内 Water（`WorldLiving.ts:517`） | 保留 |
| Sand | ~~可开垦~~（与 Grass/Dirt 完全重叠，无独占语义） | `TerrainEdit.ts:67` 同条款 | **基线不再生成**（删沙环）；TT 枚举与该行判定保留 → 旧档兼容零风险 |
| StonePath | 枢纽/祭坛/门台身份铺装 | 玩家可铺（terrain_ops: 1石+1金） | 保留但收缩：仅枢纽广场 ≤13×11；祭坛/门台是否保留石板由 Level Designer 定（玩法侧唯一要求：祭坛台 ≥3×3 且在路轴上） |
| Bridge | 水上通行 | 可走（`PlayerCharacter.ts:116`） | 保留 |
| Stairs | 高度通行 | — | 保留（东侧抬 2 高度的接驳） |
| Deck | 码头平台 | 钓鱼/停靠 | 保留 2 格 |

**过渡瓦片预算（新增素材上限）**: 仅 3 组自动过渡——grass↔dirt、grass↔water、grass↔forest，合计 **≤9 张**；另 grass 同色系变体 ≤4 张。过渡瓦片属于同一类型的视觉变体，**不计入 R-G1 计数**。清单细化归 Image Prompt Engineer。

### 2.5 玩法功能地标锚点（V3 不可缺失清单）

床（存档/睡觉）、出货点（金币闭环唯一出口，§11.1）、守门人（防守入口 + 距离 ≤8）、园艺师（买种/教学）、祭坛（BuildPanel 入口）、副本门、码头（钓鱼点）、农田组（9 地块 pitch4）。路牌 4 块**无玩法状态**，可减至 ≤2 或并入地标牌——减除零风险，位置由 Level Designer 定。

---

## 3. 数值衔接清单（V3 与 catalogs 的正交性）

### 3.1 已落盘确认（上轮提案 → 已实装，本轮不再重复提案）

- **R2**: carrot/tomato/pumpkin `seasons=[]` 全年可种（crops.json 已改；`TimeSystem.ts:57` 空数组=全年）。
- **R3**: 岩石 8 块、respawn 5 天（interactables.json 已落）。

### 3.2 零改动面（V3 落地不需要任何 catalog 数值改动）

| Catalog | 是否引用世界坐标 | V3 影响 |
|---------|----------------|---------|
| crops / fish / monsters / defense_waves / items / calendar / terrain_ops / adventure_rooms / weapons | 否 | 零改动 |
| interactables.json | 仅 `tx/ty` | 按 layout-v2-pacing §6.4 重映射规则平移（入口 12 格对 + 密度 + 数量下限不变） |
| defense_maps.json | 独立布阵图坐标系（15×9 cellPx64） | 零改动——世界侧 defense 区收缩无防守玩法损失 |

### 3.3 农田存档不变式（V3 重排的唯一存档红线）

`FarmWorldBinder.ts:6` `FARM_PLOT_ORIGIN={tx:58,ty:42,pitch:4}`；`plots[i]` 按 `index=row*3+col` 映射（`:10`）→ **origin (tx,ty) 可平移、pitch 必须保持 4、数组顺序不可变** → 旧档地块状态零损失。PlotWorldView 3×3 tile（96px）依赖 pitch=4 保证 1 tile 间隙。

### 3.4 防守清晰度要求（给 Level Designer 的两条）

1. 祭坛台 ≥3×3（石板或纯地标均可）且位于路轴端点，玩家从主路**直线可见**祭坛（防守入口引导）。
2. Defense 区收缩后，祭坛 → 最近路口 ≤6 格（避免"找不到入口"）。

### 3.5 运营节拍 / 限时返场（全部已由现有 catalog 结构承载，V3 不新增机制）

| 周期内容 | 周期 | 载体 | 状态 |
|---------|------|------|------|
| 月光花可种窗口 | 秋季 day29-42 + 冬季 day43-56（`season=floor((day-1)/14)%4`），每 56 天年返场 | crops.json seasons + `TimeSystem.ts:47` | 已实装 |
| 四节气 | 每 14 天（chunfen d14 / xiazhi d28 / qiufen d42 / dongzhi d56） | calendar.json | 已实装 |
| 防守档位 | 首波 d4 / 第二档 d10 起 / 第三档 d16 起，每档 everyDays=12 | defense_waves.json | 已实装 |
| 节日主题包 | 二期 bundle，不占首包 | 预留 | 未开工（MVP 边界外） |

---

## 4. 移速口径修正对照表（C6）

**事实**: `PlayerCharacter.ts:20` `speed = 128; // 4 格/s × 32px` → 实机 **4.0 格/s**。上轮 `layout-v2-pacing.md §2.1` 引用 world-design.md:330 的 144（4.5 格/s）已过时。时间 = 直线格 × 1.4（路径系数）÷ 4.0：

| 目标 | 直线格 | 旧值(4.5/s) | **新值(4.0/s)** | 阈值 | 判定 |
|------|--------|------------|----------------|------|------|
| 地块中心 | 9.5 | 3.0s | **3.3s** | ≤10 格 | ✓ |
| 出货/买种 | 12 | 3.7s | **4.2s** | ≤12 格 | ✓ |
| 守门人 | 5.7 | 1.8s | **2.0s** | ≤8 格（本轮收紧） | ✓ |
| 最近采集物 | 14.1 | 4.4s | **4.9s** | ≤14 格 | ✓ |
| 码头 | 17.9 | 5.6s | **6.3s** | ≤18 格 | ✓ |
| 副本门 / 祭坛 | 18 / 15.6 | 5.6 / 4.9s | **6.3 / 5.5s** | ≤20 格 | ✓ |

首日教学链（§3.2 脚本）与 day4 首波可达性结论**不变**；仅文档时间口径需按本表订正。前提：V3 路网正交化后 1.4 路径系数继续成立（R-V6）。

---

## 5. 参数汇总 JSON（可直接落盘/被 validator 引用）

```json
{
  "doc": "v3-clarity-gameplay-budgets",
  "viewport_tiles": { "w": 20, "h": 11.25, "evidence": "CameraFollow.ts:7 640x360 world px @ zoom2, 32px tile" },
  "movement": { "speed_tiles_per_sec": 4.0, "path_factor": 1.4, "evidence": "PlayerCharacter.ts:20 speed=128" },
  "per_screen_budgets": {
    "baseline_ground_types_max": 3,
    "built_types_max": 2,
    "interactive_objects_max": 4,
    "spawn_screen_interactive_max": 3,
    "gatherables_per_screen_max": 4,
    "hub_road_directions_max": 3,
    "road_segments_max": 6,
    "road_diagonal_forbidden": true
  },
  "ground_semantics": {
    "grass": "base walkable",
    "dirt": "road + hoeable; MUST use dedicated road art (not plot_soil)",
    "forest": "blocked",
    "water": "blocked + fishing probe within 3 tiles",
    "sand": "REMOVED from baseline generation; TT enum kept for old-save compat",
    "stone_path": "plaza identity; hub plaza <= 13x11",
    "bridge": "walkable over water",
    "stairs": "height passage",
    "deck": "dock, 2 tiles"
  },
  "transition_tiles_max": 9,
  "grass_variants_max": 4,
  "region_budgets": {
    "living": { "plaza_max": "13x11", "required_actors": ["bed", "sell_point", "gatekeeper", "gardener"] },
    "farm": { "rect_min": "22x18", "plot_pitch": 4, "pitch_locked": true, "plot_grid": "3x3" },
    "pioneer": { "min": { "tree": 10, "rock": 8, "bush": 3 }, "entry_pair_within": 12, "density_min": "1 per 150 tiles", "per_screen_max": 4 },
    "fishing": { "water_min": "22x14", "sand_ring": false, "dock_deck_tiles": 2 },
    "defense": { "suggested_max": "14x12", "world_side_function": "altar interaction only", "altar_slab_min": "3x3", "altar_to_road_max": 6 },
    "advGate": { "slab": "5x5", "approach_min": 4 }
  },
  "distance_budgets_tiles": { "bed": 2, "plot_center": 10, "sell_seed": 12, "gatekeeper": 8, "gather": 14, "dock": 18, "gate_altar": 20 },
  "travel_seconds_at_4_0": { "plot": 3.3, "seed": 4.2, "gatekeeper": 2.0, "gather": 4.9, "dock": 6.3, "gate_altar": 6.3 },
  "map_size": { "default": "96x80 with whitespace", "shrink_candidates": ["96x64", "80x80"], "constraint": "multiples of 16 (TerrainData.ts:15-17)" },
  "catalog_patches": "none; interactables tx/ty remap per layout-v2-pacing §6.4",
  "operating_beats": { "first_defense_day": 4, "wave2_day": 10, "wave3_day": 16, "moonflower_window": "day29-56 per 56d year", "terms": [14, 28, 42, 56] }
}
```

---

## 6. 风险登记（每条含位置/触发/影响/验证/分类/最小修复+回归）

| # | 位置 | 触发 | 影响 | 验证方法 | 分类 | 最小修复 + 回归用例 |
|---|------|------|------|---------|------|---------------------|
| R-V1 | `FarmWorldBinder.ts:6`（pitch） | V3 重排时把 pitch 调成非 4 | 旧档地块坐标错位；地块间隙消失渲染粘连 | 老档载入后 9 地块渲染位置与 plots[0..8] 断言一致 | 潜在（设计红线） | pitch 锁死 4 并入 validator 断言；回归：旧档载入→地块位置+种植状态断言 |
| R-V2 | `TerrainData.ts:19` TT.Sand / `TerrainEdit.ts:67` | 删沙环后旧档仍含 Sand 格 | 无功能影响（hoe 仍接受）；仅视觉需兜底 | 含 Sand 的旧档载入无报错、可开垦 | 潜在 | TerrainBakeRenderer 保留 Sand→草色 fallback；回归：构造含 Sand 档→载入+hoe 冒烟 |
| R-V3 | `CameraFollow.ts:7` 视口口径 | 任何人按简报 24×11 做密度校验 | 校验阈值失真（视口差 20%） | validator 输出所用视口尺寸 | **已复现**（简报口径与代码不符） | 全团队统一 20×11.25 常量（建议 `TerrainData` 导出 VIEW_W/H）；回归：validator 打印视口=20×11.25 |
| R-V4 | `layout-v2-pacing.md §2.1` 移速口径 | 按旧表 4.5 格/s 排首日脚本 | 教学时间估算偏差 ~12% | 实测计时对比 | **已复现**（代码常量与文档不一致） | 本文档 §4 对照表为准，订旧表；回归：按 §3.2 脚本实测 day1 各步耗时 |
| R-V5 | 守门人(54,36) 距离 | V3 重排把守门人移出 8 格 | 首日教学第 4 步超时（预算收紧后无余量） | validator 距离断言 ≤8 | 潜在 | 距离断言进 validate-layout-v3.py；回归：assert dist(SPAWN,守门人) ≤8 |
| R-V6 | 路网形状 | V3 保留对角/斜向路段 | 1.4 路径系数失效→时间换算失准 | 路段正交断言 | 潜在 | V3 路网全正交（给 Level 的硬约束 R-G4）；回归：无对角路段断言 |
| R-V7 | 祭坛(60,28) + defense 收缩 | 收缩后祭坛移出主路轴 | 违反"祭坛北主路轴可达"不变式；BuildPanel 不可达→防守玩法断 | 距离断言 ≤20 + 轴线可达 + 冒烟走通 | 潜在 | 祭坛保持路轴端点（§3.4 两条）；回归：从主路走至祭坛开 BuildPanel 冒烟 |
| R-V8 | UI 层（右列 4 钮+底 6 槽+顶双 HUD） | 玩法/地图侧不处理 UI | 出生屏总预算（R-G6）仍超支，杂乱感残留 | 出生屏截图清点 | 潜在（跨角色） | Handoff UI Designer 出合并方案（按钮折收/HUD 合一）；回归：出生屏截图清点 ≤ R-G6 目标 |
| R-V9 | 湖岸视角（码头 5 类型） | 只删 sand 不收缩石板/不控 deck 条带 | R-G1 在码头视角仍可能压线 | 滑窗计数脚本 | 潜在 | validator 滑窗断言；回归：码头视角地面类型 ≤3 报告 |

**Blocker 汇总**：无当前 blocker（V2 全部距离预算仍 PASS）。V3 落地时的红线只有一条：**pitch=4 与存档不变式（R-V1）**——最小修复已给出（validator 断言），回归用例见上表。

---

## 7. 交付验收标准

1. **Validator**（v3 版，交 Architect/Reviewer 落地）新增断言：视口 20×11.25 滑窗 → R-G1 基线类型 ≤3、R-G1b 人造 ≤2、R-G2 交互物 ≤4（出生屏 ≤3）、R-G3 采集 ≤4、R-G4 路正交+枢纽 ≤3 向+全图 ≤6 段、守门人 ≤8、pitch=4、尺寸 16 倍数、沙环不存在（新基线无 Sand 格）。全部断言有 PASS/FAIL 输出。
2. **出生屏截图清点**：地面类型 ≤3、交互物 ≤3、UI 部件数符合 UI Designer 新规范。
3. **旧档回归三件套**：① 含 Sand/旧地块坐标档载入无错；② 9 地块位置与 plots 状态一致；③ defense_maps seal_1 布阵与奖励不受世界侧收缩影响。
4. **教学链计时**：按 §4 修正口径实测，day4 首波前玩家可达布防（预算内，最低档金币路径 D3≈40 金结论不变）。
5. **数值零改动核验**：`git diff assets/data/catalogs/` 在 V3 落地 MR 中为空（interactables tx/ty 重映射除外）。

---

## 8. Handoff（交叉核对与未覆盖范围）

**→ Level Designer**（本预算表的执行者）
- §2.2 区块空间预算 + §2.3 R-G1~G6 为硬约束；§2.4 Sand 删除与 StonePath 收缩；§3.4 防守两条；地图尺寸三选一需论证（16 倍数约束）。

**→ Software Architect**
- validator v3 断言清单（§7.1，含 R-V3/R-V5/R-V6/R-V9 的可计算断言）；`TerrainBakeRenderer.ts:24` Dirt→独立路面贴图的映射位；generateBaseline 改动面（删沙环、defense 收缩）；建议在 `TerrainData` 导出视口常量（20×11.25）终结口径漂移。

**→ UI Designer**
- R-V8：出生屏 UI 密度是并列主因，需要右列 4 钮 / 底部 6 槽 / 顶部双 HUD 的合并方案与出生屏 UI 部件预算数（补全 R-G6 的 UI 侧数值）。

**→ Image Prompt Engineer**
- C3：dirt 独立路面贴图（16/32px、与 plot_soil 色相分离）；grass 同色系变体 ≤4；过渡瓦片 ≤9（grass↔dirt/water/forest 三组）清单化。

**→ Code Reviewer**
- §6 回归用例表（重点 R-V1 存档不变式、R-V2 Sand 兼容、R-V7 祭坛可达冒烟）。

**→ 协调者**
- ① 本轮简报视口口径 24×11 应修正为 20×11.25（R-V3，已复现的口径错误，建议向全组广播）；② 上轮 pacing §2.1 移速口径由本文档 §4 取代。

**未覆盖 / 无涉及**: 音频（无变化）、TapTap 提审与平台适配（本轮不涉及，以 developer.taptap.cn 最新要求为准）、素材提示词正文（仅提出需求清单，正文归 Image Prompt Engineer）。
