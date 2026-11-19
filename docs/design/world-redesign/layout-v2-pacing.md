# 布局 V2 · 节奏与参数审核（layout-v2-pacing）

> 负责成员：Game Designer（game-designer）｜ 日期：2026-11-18 ｜ 状态：v1（评审稿）
> 本轮范围：只做设计与数值规格，不改代码。坐标矩形冻结由 world-layout-v2.md（level-designer）负责，本文以「距离预算硬指标」形式向其交付约束，不预设其结论。
> 改动文件路径：本文档（新增）。附带的数值修改建议（crops.json seasons 等）仅为提案，落盘实施由协调者统一执行。

---

## 0. 结论速览

| # | 决策 | 结论 |
|---|---|---|
| D1 | 首日可达性 | **可达**，前提是满足 §2 距离预算表：出生点→副本门/封印祭坛直线 ≤20 格。现状 41–55 格、日均纯步行 ≈110 秒（占 5–8 分钟会话的 18–37%）是「无规划感」的数值根源 |
| D2 | 枢纽/传送 | **MVP 不做传送网络**。枢纽化出生点 + 路网 + 指南针即可达标（4.5 格/秒下 20 格路径 ≈6 秒）；传送会削弱「防守日漏怪即损」（00-synthesis Q3 拍板）与每日仪式感。预留 P2「单向回城驿站」参数表（§5.3） |
| D3 | 地图尺寸 | **支持向 96×80 方向收缩**（分块 96×80/256=30 块 vs 128×96/256=48 块，初始化与内存双降）；本文预算均为绝对格数，两种尺寸下同样成立。最终尺寸与矩形由 world-layout-v2.md 冻结 |
| D4 | 经济数值衔接 | 本轮布局改动**不修改任何价格/概率/时长表**。但审核发现 1 处数据与设计文档冲突（crops.json seasons ≠ game-design-draft.md §6.1）与 1 处数值断点（石材永不重生 → terrain_ops 水槽枯竭），给出修正参数表（§6.2/§6.3） |
| D5 | 防守节奏成立性 | 三档玩家画像下，**最低档玩家也可在第 3 天负担首个防守作物（15–20 金）**，先于 firstDay=4 的首夜入侵（defense_waves.json seal_slime_1）→ 首夜防守「准备有意义」成立 |
| D6 | §13 教学链矛盾 | §13「10 分钟任务链：种→收→钓→首波 1 怪防守」与 defense_waves firstDay=4 冲突（代码未找到教学战斗触发）。给两个解法选项（§3.4），需协调者拍板 |

---

## 1. 已核实现状（证据基座，全部 file:line 级）

| 事实 | 位置 |
|---|---|
| 移动速度 SPEED=144 世界px/s = 4.5 tile/s；冲刺 6 tile/s 为 P2 | docs/design/world-redesign/world-design.md:330 |
| 出生点 (74,26)；床=出生点北侧一格 (74,25) | docs/design/world-redesign/world-design.md:19；assets/scripts/gameplay/world/living/WorldLiving.ts:274 |
| 指南针目标：副本(112,10)/防守(110,52)/河岸(66,26) | assets/scripts/gameplay/world/CompassHUD.ts:17-19 |
| 封印祭坛交互点 (110,52) → 打开 BuildPanel 布防（夜间禁放） | assets/scripts/gameplay/world/living/WorldLiving.ts:258-269；assets/scripts/gameplay/defense/DefenseSystem.ts:303（`if (s) return {ok:false, reason:'night'}`） |
| 副本门交互无日期门控（`setupSimple('dungeon_gate','进入旧林地',…)`） | assets/scripts/gameplay/world/WorldSpike.ts:426 |
| 农田 3×3=9 格，基点 FARM_PLOT_ORIGIN=(67,58) pitch=4 | assets/scripts/gameplay/farm/FarmSystem.ts:30-33；assets/scripts/gameplay/world/farm/FarmWorldBinder.ts:8 |
| 开局 5 包胡萝卜种子、0 金币 | assets/scripts/app/GameApp.ts:164 |
| 出售 = sellAllProducts：除 currency/seed 外全部可卖（含鱼、材料） | assets/scripts/systems/EconomySystem.ts:27-44 |
| 采集物 12 树（respawn 3d）/ 6 石（respawnDays=0）/ 3 灌木（respawn 2d），坐标钉死在旧开荒区矩形 | assets/data/catalogs/interactables.json |
| respawnDays>0 才复活的语义已核实（=0 永久清除） | assets/scripts/gameplay/world/clearing/ClearingSystem.ts:123-125 |
| 首夜防守 firstDay=4、everyDays=4；强度档 firstDay 10 / 20 | assets/data/catalogs/defense_waves.json |
| 防守作物造价：蜜瓜圃 15 / 霜铃花 20 / 豆荚炮 30 / 尖刺南瓜 35；拆除返还 60% | assets/data/catalogs/crops.json；DefenseSystem.ts:49 |
| 钓鱼：每竿必咬钩（waitSec 1.5–6s）→ QTE 判定；权重鲫鱼 70/鲈鱼 25/月光鱼 5 | assets/scripts/gameplay/fishing/FishingSystem.ts:46-67；assets/data/catalogs/fish.json |
| 副本精英宝箱每次击杀重复发放胡萝卜种子 2-3（无首通标记）；宝箱武器为 run 级换枪不重复入库 | assets/scripts/gameplay/adventure/AdventureSystem.ts:205-222 |
| 时间系统：dayIndex 主时钟、显式结束一天、14 天/季、离线 12h/天封顶 2 天 | assets/scripts/core/TimeSystem.ts:30-36,64-68 |
| 作物季节判定：空数组=全年可种 | assets/scripts/core/TimeSystem.ts:57-61 |
| 教学引导仅提示框（TutorialGuide 常驻），未找到任务链/教学战斗触发代码 | assets/scripts/gameplay/world/WorldSpike.ts:282 |

---

## 2. 距离预算表（交付 level-designer 的硬指标）

### 2.1 移动换算基准

- 步行 4.5 格/秒（world-design.md:330）；路径系数：沿路网实际路程 ≈ 直线 × 1.4 `[PLACEHOLDER]`（现有路网目测估值，V2 路网更直后可降）。
- 换算式：路径时间(s) = 直线格数 × 1.4 ÷ 4.5。

### 2.2 现状量化（问题根源，已复现）

| 起点→终点 | 直线(格) | 路径时间 | 用户验收反馈对应 |
|---|---|---|---|
| 出生(74,26)→副本门(112,10) | 41.2 | ≈12.8s | 实机指南针显示 44 格 |
| 出生→封印祭坛(110,52) | 44.4 | ≈13.8s | 实机指南针显示 44 格 |
| 出生→农田地块中心(71,62) | 36.1 | ≈11.2s | 「床/房屋紧贴农田」之外的距离问题 |
| 出生→钓鱼北岸(≈58,79) | 55.4 | ≈17.2s | 钓鱼点过远 |
| **日均四站往返合计** | — | **≈110s** | 占 5–8 分钟会话 **18–37%** |

> 定性：步行占比超过轻松经营类游戏的健康线（≤15%），且沿途无景——这是「距离不可玩」反馈的数值表达。

### 2.3 V2 距离预算硬指标（验收依据，逐行可核对 world-layout-v2.md）

| 地标 | 直线预算 | 路径时间上限 | 频次理由 |
|---|---|---|---|
| 床（结束一天入口） | ≤2 格 | 贴身 | 每日必经，出生即达 |
| 农田地块中心 | ≤10 格 | ≤3.1s | 每日最高频（浇水/收获） |
| 出货/买种点（商人或出货箱） | ≤12 格 | ≤3.7s | 经济闭环高频 |
| 守门人 NPC | ≤12 格 | ≤3.7s | 防守预告日必访（情报仪式） |
| 最近采集物（树/石/灌木） | ≤14 格 | ≤4.4s | 首日教学链第 2 步 |
| 钓鱼码头/岸位 | ≤18 格 | ≤5.6s | 中频活动 |
| **副本传送门** | **≤20 格** | **≤6.2s** | 验收硬指标（用户原话） |
| **封印祭坛** | **≤20 格** | **≤6.2s** | 验收硬指标（布防必到） |

- 全站极限日（四站全走一遍）纯步行 ≤45s（≈15% of 5min 会话）；典型日（农田+1 项）≤20s。
- 副本门要求**从枢纽主路可见或 ≤20 格可达**：首日 60 秒内玩家应能"看见"它（可见性=发现性，指南针只是兜底）。
- 不建议用提高移速解决距离问题（4.5→6 会破坏探索尺度感）；距离问题用布局解，移速保持 4.5，冲刺 6 tile/s 留 P2。

---

## 3. 首日可达性与首日体验脚本

### 3.1 首日三目标判定（基于现有系统，零新系统依赖）

| 目标 | 判定 | 依据 |
|---|---|---|
| 第一天能种田 | ✅ 成立 | 开局 5 包胡萝卜种子（GameApp.ts:164）；春分季（day1-14）carrot 可种；3×3 地块确定性映射与旧档无关（新档） |
| 第一天能看到副本门 | ⚠️ 布局达标即可成立 | 副本门无日期门控（WorldSpike.ts:426）；仅要求 V2 满足 §2.3 可见性/≤20 格 |
| 第一天能抵达防守区布防 | ✅ 成立 | 祭坛交互开 BuildPanel（WorldLiving.ts:269），白天可放置；蜜瓜圃 15 金 ≤ 首日最低收入路径（§4.2）；塔跨夜常驻（DefenseSystem.ts:302 注释），首日布置对 day4 首夜有效 |

### 3.2 首日 0–10 分钟体验脚本（对齐 §13 教学链 种→收→钓→防守）

| 时段 | 内容 | 数值锚点 |
|---|---|---|
| 0:00–0:30 | 枢纽床边醒来，摇杆教学 | 指南针指向农田 |
| 0:30–1:30 | 农田播种 5 胡萝卜（拖刷） | ≤10 格 ≈3s |
| 1:30–3:00 | 开荒教学：砍 1 树+采 1 石 | 树/石 ≤14 格；树掉 wood 1-2、石掉 stone 1-2 |
| 3:00–6:00 | 顺主路到副本门 → 旧林地一跑（5-7 房 ≈3min） | ≤20 格 ≈6s；带回材料 + 精英宝箱种子 2-3 + 铁剑 |
| 6:00–7:00 | 码头钓鱼教学 1-2 竿 | ≤18 格；**首竿保底鲫鱼**（§3.3 新参数） |
| 7:00–8:00 | 回枢纽出售 → 首日 ≥60 金 | sellAllProducts 全品类可卖 |
| 8:00–9:30 | 指南针转祭坛 → 守门人情报对话 → BuildPanel 放 1×蜜瓜圃(15 金) | 布防教学=「防守」教学位（见 §3.4） |
| 9:30–10:00 | 回床睡觉结束 day1；预告「第 4 夜封印震动」 | everyDays=4 节奏预告 |

首日纯步行合计 ≈30s（满足 §2.3 极限日 ≤45s）。

### 3.3 新增参数提案（P1，小改动）

| 参数 | 值 | 说明 |
|---|---|---|
| 首竿保底 `tutorialFirstCatchGuaranteed` | `crucian`，仅新档第 1 竿 | 依据 Onboarding「首次成功必有」原则；实现位：FishingSystem cast() 首次调用时锁定 pick（鲫鱼权重 70 本就最高，兜底成本低）`[PLACEHOLDER 待手感验证]` |
| 指南针教学序列 `compassScriptedTargets(day1)` | 农田→采集→副本门→码头→枢纽→祭坛 | day1 内按脚本切换目标，day2 起恢复玩家切换/循环；实现位：CompassHUD 目标切换接口（现固定 3 目标，小改） |

### 3.4 §13 教学链与 firstDay=4 的矛盾（需拍板）

§13 要求 10 分钟链含「首波 1 怪防守」，但 defense_waves.json 首夜是第 4 天，且代码未找到教学战斗触发（仅 TutorialGuide 提示框，WorldSpike.ts:282）。

| 选项 | 方案 | 代价 |
|---|---|---|
| A（推荐） | 教学链终点=「布防教学」（§3.2 的 8:00–9:30 段），实战留给 day4 夜；§13 措辞修订为「种→收→钓→布防」 | 仅文档措辞，零代码 |
| B | 新增教学波表行 `seal_tutorial{firstDay:1, waves:[[slime×1,entrance A]]}`，day1 深夜自动触发 1 怪微型防守 | DefenseSystem 选表逻辑需兼容 firstDay=1 与 everyDays 停用；+0.5 人日 `[PLACEHOLDER]` |

---

## 4. 首周经济模拟与防守准备节奏

### 4.1 收入源参数（全部引用现有表，未改动）

| 来源 | 期望值 | 依据 |
|---|---|---|
| 胡萝卜 9 格周期 | 13.5 根 ≈108 金/2天 | crops.json：growDays 2、harvest 1-2、sellPrice 8 |
| 钓鱼每竿期望 | 0.70×12+0.25×20+0.05×55 = **16.15 金/咬钩**；按 QTE 成功率 ≈0.65 修正 ≈10.5 金/竿 `[PLACEHOLDER 待手感]` | fish.json 权重 |
| 开荒一组（2 树+1 石+1 灌木） | ≈4.5×2 + 1.5×4 + 1.5×3 ≈ 21 金 | interactables.json drops + items.json 售价 |
| 旧林地单跑 | ≈56 金 + 种子 2-3 + 铁剑（run 级） | adventure_rooms.json + AdventureSystem.ts:205-222 |
| 首夜防守 | 15-25 金 + 无漏奖励 8-12 金 | defense_waves.json seal_slime_1 |

### 4.2 三档玩家现金流（day1–4，单位：金）

| 日 | 积极档（全活动） | 普通档（种+钓+轻采集） | 最低档（只走教学） |
|---|---|---|---|
| D1 | ≈130（采集26+钓48+副本56） | ≈47 | 0（播种 5 免费种子） |
| D2 | ≈204（再钓+再跑图−买种18−布防35） | ≈87 | 0 |
| D3 | ≈298（首收108+钓48−买种27） | ≈132−蜜瓜圃15 | **≈40（首收 5 根）** |
| D4 夜 | ≈328（+首夜奖励E30） | ≈162 | ≈55 |
| 检查 | 首夜前双塔就绪 | 首夜前 1 塔就绪 | **D3 即可负担 15 金蜜瓜圃** |

> **结论 D5：最差玩家路径也能赶在 firstDay=4 首夜前完成首次布防** → 「经营准备使防守有意义」的核心假设在当前数值下成立，无需降低防守作物造价或提前首夜。

### 4.3 §11.1 验收表（4+1 作物行：买/卖/时长/日收益排序）

| 作物 | 买价 | 卖价 | 成熟 | 单格期望产出 | 净收益/周期 | **日收益/格** | 排序 |
|---|---|---|---|---|---|---|---|
| 番茄 | 5 | 15 | 3d | 1.5 | 17.5 | **5.8** | 1 |
| 月光花 | 21 | 60 | 7d | 1 | 39 | **5.6** | 2 |
| 胡萝卜 | 3 | 8 | 2d | 1.5 | 9 | **4.5** | 3 |
| 南瓜 | 9 | 25 | 5d | 1 | 16 | **3.2** | 4 |

- 满足 §11.1「普通作物日收益明显大于种子成本」正反馈起点 ✅。
- ⚠️ 南瓜日收益垫底且 5 天占格——若无附加角色（防守风味/节日需求）将成劣势选择。**暂不改值** `[PLACEHOLDER]`，观察 playtest；备选杠杆：节日委托定向收购、或防守 intel 中「怪物偏爱南瓜」软引导。

### 4.4 通胀检查

- 积极档周净增 ≈+150 金/日；现有水槽：种子（27 金/周期）、防守作物（15–70）、升级（40–60）、地形工（铺石 1石+1金/格、造桥 3木+10金、台阶 2石）。
- 预计 D14 积极档 ≈1.5–2k 金而水槽耗尽 → **长期水槽缺口是 P2 必答题（旅行商人类目），不是本轮改动项**；MVP 期内接受。

---

## 5. 枢纽/传送机制评估与参数

### 5.1 结论：MVP 不做传送网络

1. **数值上不必要**：预算达标后最远单程 ≈6.2s，回城动机弱。
2. **设计上相冲突**：传送会绕开「防守日玩家在非防守区→漏怪即损」的教学（00-synthesis Q3 拍板），也会跳过每日路过的农田/守门人触点——这些路过正是核心循环的曝光位。
3. **成本上不值**：新增存档字段、UI、禁用态边界（防守夜/副本会话/离线），换来的节省 <30s/日，投入产出比低于任何已排期里程碑。

### 5.2 枢纽参数（交付 level-designer，MVP）

| 参数 | 值 | 说明 |
|---|---|---|
| 枢纽广场 | ≥8×8 格空地，出生点居中 | 床(≤2)、出货/买种点(≤12)、守门人(≤12) 全部挂枢纽边 |
| 主干路 | 枢纽向五区各出 1 条 3 宽主路；区内路 2 宽 | 「一棵路树」原则延续 world-design.md:158 |
| 路牌 | 每条主路出枢纽 3 格内 1 块（副本门/祭坛/码头/农田） | 指南针的文字冗余，色弱友好 |
| 指南针 | 保留 3 固定目标改坐标；day1 教学序列见 §3.3 | CompassHUD.ts:17-19 |

### 5.3 P2 预留：单向回城驿站（仅当 playtest 触发条件成立才实装）

> 触发条件：实测「日均步行>15% 会话」或「防守日次晨返程抱怨」出现。

| 参数 | 值 | 说明 |
|---|---|---|
| waypoints | `[hub_plaza, dungeon_gate, seal_altar, fishing_dock]` | 只在 4 地标摆驿站亭（地图预留 2×2 装饰位） |
| 解锁 | 首次步行抵达（半径 2 格）自动点亮 | 无前置付费/任务 |
| 功能 | **任意驿站 → 枢纽单向回城**；不做点对点网 | 保住每日出门仪式，只消除回程 |
| 次数 | 1 次/游戏日 | 防刷图 |
| 禁用态 | 防守夜、副本会话中不可用 | 与 Q3 拍板不冲突 |
| 费用 | 0 金（MVP）；二期可挂 5 金 | — |
| 存档 | `world.waypointsUnlocked: string[]`（v3 world 段纯加字段） | 兼容迁移链 |

---

## 6. 与现有数值/坐标的衔接清单（工程规格输入）

### 6.1 坐标联动清单（挪区必改，逐条可勾）

| 文件:位置 | 现值 | 动作 |
|---|---|---|
| assets/scripts/gameplay/world/CompassHUD.ts:17-19 | 副本(112,10)/防守(110,52)/河岸(66,26) | 改为 V2 坐标；建议加 day1 教学序列（§3.3） |
| assets/scripts/gameplay/world/living/WorldLiving.ts:274 | 床 (74,25) | 枢纽内重摆 |
| assets/scripts/gameplay/world/living/WorldLiving.ts:261 | 祭坛 (110,52) | V2 防守区入口坐标 |
| assets/scripts/gameplay/world/living/WorldLiving.ts:343 | 钓鱼点 world_fishing | V2 码头坐标 |
| assets/scripts/gameplay/world/farm/FarmWorldBinder.ts:8 | FARM_PLOT_ORIGIN=(67,58,pitch4) | 仅改视觉基点；**index=row*3+col 映射不变 → 旧档农田数据零损失** |
| assets/scripts/gameplay/world/WorldSpike.ts:387,426 | dungeon_gate 节点与交互 | V2 门坐标；无日期门控，保持 |
| assets/data/catalogs/interactables.json（21 行） | 全部钉死旧开荒区 (x2-57,y2-45) | 按 V2 开荒区矩形重映射；映射规则见 §6.4 |
| assets/data/catalogs/terrain_ops.json | 价格不动 | 新河/桥数量变化只影响基线绘制，不影响表 |

### 6.2 crops.json seasons 修正（数据与设计文档冲突，本轮唯一建议的表改动）

**发现**：game-design-draft.md §6.1 规定「普通作物 MVP 内全年可种（season 取 all）」，但 crops.json 实际为 carrot[spring]、tomato[spring,summer]、pumpkin[summer,autumn]。后果：
- day15 春→夏胡萝卜断档（首日教学作物当季死亡）；
- 冬季（day43-56）**只剩月光花 1 种可种**，经营玩法真空一整季；
- 稀有作物月光花首月不可得（秋分 day29 才开），60 金价格锚全季不可见。

**修正表**（TimeSystem.cropInSeason 空数组=全年可种，纯数据改动，零代码）：

| 作物 | 现 seasons | 改为 | 理由 |
|---|---|---|---|
| carrot | `[spring]` | `[]` | §6.1 普通作物全年可种 |
| tomato | `[spring,summer]` | `[]` | 同上 |
| pumpkin | `[summer,autumn]` | `[]` | 同上 |
| moonflower | `[autumn,winter]` | 不变 | 稀有作物保留季节身份，示范「周期返场」规则（§6.2/§16） |

**回归用例**：day1 播 carrot → day2 收获不受影响；调试面板跳至 day45（冬）→ 4 普通作物全部可播、moonflower 可播；跳至 day20（夏）→ moonflower 不可播（预期拒绝）。

### 6.3 石材经济断点修正（潜在风险，数值提案）

6 块岩石 respawnDays=0=**永久清除**（ClearingSystem.ts:123-125 语义已核实）：终身石材 ≈9-12 块，而铺石(1石/格)+台阶(2石/座)是现成水槽——铺一条 10 格田间道即耗尽，terrain_ops 水槽枯死。

| 参数 | 现值 | 建议 | 说明 |
|---|---|---|---|
| interactables.json 岩石 respawnDays | 0 | 5 `[PLACEHOLDER]` | 石材成为可循环慢资源；树 3/灌木 2 的梯度保持 |
| V2 开荒区岩石数量 | 6 | ≥8 | 保证铺装类水槽寿命 ≥2 周 |

**回归用例**：开采全部岩石 → dayAdvanced 推 5 天 → 岩石复活可再采；respawn 前 placeStonePath 因缺石被拒（预期）。

### 6.4 采集物重映射密度规则（交付 level-designer/工程）

1. 开荒区入口 12 格内 ≥1 树 + ≥1 石（教学链 §3.2 的 1:30–3:00 段可达）；
2. 全区密度 ≥1 物/150 格 `[PLACEHOLDER]`；树≥10、石≥8、灌木≥3 与现有数量持平或略增；
3. 只改 tx/ty，不改 id/drops/respawnDays（树 3、灌木 2、石按 §6.3 改 5）。

### 6.5 明确不动清单

crops 生长/售价、fish 全表、monsters/waves 全表、weapons 全表、items 价格、calendar（56 天年/四节气）、EconomySystem、TimeSystem、存档结构（本轮布局变更按既定方案：地形 RLE 作废重发基线，其余系统存档不动）。

---

## 7. 季节-日历运营节拍（轻量，MVP 边界内）

| 游戏日 | 事件 | 节奏作用 |
|---|---|---|
| D4 | 首夜防守（slime×1 波） | 第一根「准备→结算」钩子 |
| D8 | 第二夜（同表） | 布防迭代反馈 |
| D10 起 | 强度档 2（双线+精英） | 防守作物 Lv2 升级水槽启动（upgradeGold 40-60） |
| D14 春分 / D28 夏至 | calendar.json 节气 | 首月 2 个节气钩子，符合「MVP 只查表 2-4 个」边界 |
| D20 起 | 强度档 3（四波） | 长线目标 |

周期返场规则已由 moonflower 季节轮转 + calendar 56 天年自然承载，本轮无需新增限时内容。

---

## 8. 参数汇总（可落盘 JSON，与本表语义一致）

```json
{
  "pacing_budgets_v2": {
    "speed_tiles_per_sec": 4.5,
    "path_factor": 1.4,
    "landmarks_straight_max": {
      "bed": 2, "farm_plot_center": 10, "trade_point": 12,
      "gatekeeper": 12, "nearest_gatherable": 14,
      "fishing_dock": 18, "dungeon_gate": 20, "seal_altar": 20
    },
    "daily_walk_seconds_max_all_stations": 45,
    "daily_walk_session_share_target": 0.15
  },
  "catalog_patches_proposed": {
    "crops_seasons_mvp_year_round": { "carrot": [], "tomato": [], "pumpkin": [], "moonflower": ["autumn","winter"] },
    "rock_respawn_days": 5,
    "rock_min_count_v2": 8
  },
  "onboarding_params_p1": {
    "tutorial_first_catch_guaranteed": "crucian",
    "compass_day1_scripted_targets": ["farm", "gather", "dungeon_gate", "dock", "trade", "seal_altar"]
  },
  "teleport_waypoints_p2_reserved": {
    "ids": ["hub_plaza", "dungeon_gate", "seal_altar", "fishing_dock"],
    "unlock": "first_arrival_radius_2",
    "function": "one_way_return_to_hub",
    "uses_per_day": 1,
    "blocked_in": ["defense_night", "dungeon_session"],
    "cost_gold": 0,
    "save_field": "world.waypointsUnlocked"
  }
}
```

---

## 9. 风险登记（每条含位置/触发/影响/验证）

| # | 类型 | 风险 | 位置 | 触发 | 影响 | 验证方法 | 最小修复+回归用例 |
|---|---|---|---|---|---|---|---|
| R1 | 已复现 | 现布局距离超预算，日均步行 110s | TerrainData.ts REGIONS + WorldSpike 摆位 | 任何日常路径 | 用户已否决 | 实机指南针读数（44/44） | 按 §2.3 预算重排（world-layout-v2.md）；验收=重算直线距离全部达标+实机复测 |
| R2 | 潜在 | seasons 冲突 → 冬季单作物/胡萝卜断档 | crops.json vs game-design-draft.md §6.1 | day15 / day43 | 经营玩法真空一季 | 调试面板跳天播种 | §6.2 修正表；回归=三季播种用例 |
| R3 | 潜在 | 石材永久枯竭，地形水槽死亡 | interactables.json respawnDays:0 + ClearingSystem.ts:123-125 | 铺装 ≈10 格后 | terrain_ops 玩法荒废 | 调试面板打印 stone 数量曲线 | §6.3 respawn=5；回归=开采→跳5天→复活 |
| R4 | 潜在 | 通胀水槽缺口 | §4.4 | D14 后积极档 | 金币无处花，动机衰减 | 调试面板 gold 打印 D14 | P2 商人类目（本轮不改）；观察项 |
| R5 | 潜在 | 钓鱼时薪（≈26 金/分）碾压种田（≈13.5 金/分） | fish.json × QTE | playtest | 活动结构塌缩为钓鱼 | playtest 行为统计 | 杠杆：月光鱼权重 5→3 或窗口收紧；`[PLACEHOLDER]` 仅观察 |
| R6 | 未验证 | §13 教学链（含首波防守）无实现痕迹 | WorldSpike.ts:282 仅提示框 | 首次会话 | §13 验收项落空 | 新档实测 10 分钟 | §3.4 选项 A/B 拍板；回归=新档 10 分钟链路走通 |
| R7 | 未验证 | 南瓜日收益垫底成劣势选择 | §4.3 | 玩家精算 | 作物多样性下降 | playtest 种植占比 | 暂不改值；备选杠杆已列 |
| R8 | 假设 | 若 V2 尺寸 <96×80 或区面积不满足下限 | world-layout-v2.md（未产出） | level-designer 定稿 | 预算表需重推 | 冻结表复核 | 下限建议：农田≥22×18、开荒≥34×28、湖≥22×14、枢纽≥8×8；预算为绝对格数，尺寸变化自动适配 |

---

## 10. 交付验收标准（本岗位）

1. §2.3 预算表逐行可在 world-layout-v2.md 冻结坐标上复核（直线距离计算，无需实机）；
2. §3.2 首日脚本不依赖任何未实装系统（除标注 P1 的两个小参数）；
3. 全部数值与 assets/data/catalogs 结构对齐，价格/概率/时长零改动（仅 §6.2/§6.3 两个提案补丁）；
4. 三档玩家画像下首夜布防可达（§4.2）；
5. R2 修正的回归用例可直接作为调试面板操作步骤执行。
