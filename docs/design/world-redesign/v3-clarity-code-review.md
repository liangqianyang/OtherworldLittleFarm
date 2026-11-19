# V3 整洁化重设计 — 代码质量审查与测试方案（v3-clarity-code-review）

- **负责成员**: Code Reviewer（engineering-code-reviewer / agent-23）
- **日期**: 2026-11-19
- **范围**: V3 地图整洁化改动的脚本审查、改动清单与回归项、核心系统边界测试用例表、TapTap 真机检查清单（对齐 docs/taptap/publishing.md）
- **独立分析声明**: 本文档未读同伴产出（v3-clarity-impl-impact.md 等），全部结论基于源码直读；交叉对比留给协调者。

---

## 0. 结论先行

1. **🔴 唯一 blocker：存档兼容路径。** 若 V3 保持 96×80（terrainSize=7680 不变），`WorldSpike` 的恢复守卫（`terrainSize===MAP_W*MAP_H` 才解码）**不会触发**，老档会把 V2 地形 RLE **原样恢复、盖掉 V3 基线**——老玩家看到旧地图 + 新地标坐标（床/祭坛/码头/NPC 硬编码在代码里），轻则地标压在旧路上视觉混乱（V3 要解决的"乱"在老档上原样保留），重则 NPC/床落在不可走地形上。**最小修复：`SAVE_VERSION` 3→4，`_migrate` v3→v4 删除 `world.terrain`/`terrainSize` 并把 `playerX/playerY` 重置为 SPAWN（保留 clearedIds/regrowAt/seal/farm）**；`WorldSpike` 现有守卫随后自动重建 V3 基线，零渲染层改动。
2. **次级风险：迁移后玩家落点。** 老 `playerX/playerY` 沿用 V2 坐标，若恰好落进 V3 水体/深林 → 出生即卡死（`PlayerCharacter._blocked` 仅挡裸水，Bridge 可走）。迁移必须一并处理落点（见 §2 D2）。
3. **其余改动面全是常量/数据替换**（CompassHUD POIS、WorldLiving 地标、FarmWorldBinder origin、interactables.json、validate 脚本），无生命周期/事件泄漏风险。已复核 `WorldLiving`（onLoad/onDestroy 订阅-清理 5 对配对完整）与 `CompassHUD`（静态 inst + onDestroy 清理完整），V3 改坐标不触碰这些结构。
4. **测试基建现状（全部实跑通过，2026-11-19）**: `tools/test_rle.mjs` 14/14、`tools/test-defense-core.mjs` 24/24、`tools/test-combat-core.mjs` 17/17、`tools/validate-layout-v2.py` ALL PASS。V3 需**新增** `tools/validate-layout-v3.py`（含视觉密度规则）与 1 个迁移回归脚本（§3 D 组）；现有无头测试不覆盖 SaveManager/TimeSystem/FarmSystem（cc 依赖），迁移逻辑恰好是纯 JSON 变换，**可以无头测试**（§3.4）。
5. 现有两个低危缺陷顺手记录：①坏档被新档静默覆盖无留证（🟡 建议 `.corrupt` 副本）；②`tools/test_rle.mjs` 头部 `MAP_W=128, MAP_H=96` 与生产 `TerrainData.ts` 的 96×80 不一致（算法级测试不受影响，但维护者易误读，💭 nit）。

---

## 1. V3 改动清单与逐文件审查（Q4 实施成本）

> 图例：🔴 blocker 修复点 / 🟡 必改但低风险 / 💭 顺手项。「正确性要点」= 改动时最容易改错的点。

| # | 文件（证据位置） | 改什么 | 正确性要点 | 风险 |
|---|---|---|---|---|
| 1 | `assets/scripts/core/SaveManager.ts:4-6,57` | `SAVE_VERSION` 3→**4**；`_migrate` 加 `4:(d)=>...` | 迁移函数返回**新对象**（现有链用展开语法，保持一致）；删除 `world.terrain`、`world.terrainSize`；`playerX/playerY` 置为 V3 SPAWN；**不得**动 `clearedIds/regrowAt/seal/farm/inventory/dayIndex` | 🔴 |
| 2 | `assets/scripts/gameplay/world/TerrainData.ts:12-37,80-153` | `REGIONS/LAKE/ROADS/PADS/SPAWN` 常量表 + `generateBaseline()` 函数体按 V3 几何重写 | **TT 枚举索引顺序冻结**：`SpriteLib→setSources` 的 bake 源按 `{0:grass,2:forest,1:soil,3:water,4:sand,5:stone}` 键控（WorldSpike.ts），插入新类型=全体索引错位。V3 若要"过渡瓦片"，用**同色系变体贴图**复用现有 TT，不加新枚举值 | 🟡 |
| 3 | `assets/scripts/gameplay/world/WorldSpike.ts:58-79` | `generateBaseline()` 调用不变；**恢复守卫逻辑不动** | V4 迁移删掉 terrain 后，守卫走 `regenerateBaseline` 分支——确认该分支同时重建 `baselineHeights` 快照（现实现已做）。**不要**在这里加"版本判断"，版本判断只属于 SaveManager | 🟡 |
| 4 | `assets/scripts/gameplay/world/CompassHUD.ts:16-20` | POIS 3 坐标（dungeon/seal/dock） | 隐藏半径 `VIEW_W=8*32/VIEW_H=4*32` 是**视口几何**参数，与地图坐标无关，**不要顺手改**；只换坐标 | 💭 |
| 5 | `assets/scripts/gameplay/living/WorldLiving.ts` | 地标硬编码：bed(50,38)、seal(60,28)、gardener(46,42)、gatekeeper(54,36)、signs×4、barn(65,38) | ①每个新坐标必须落在 `PlayerCharacter._blocked` 判定为可走的格上（非裸水/非 Forest）；②路牌文案与 V3 方位一致；③signs 坐标与 `validate-layout-v3.py` 的 LANDMARKS 表同步 | 🟡 |
| 6 | `assets/scripts/gameplay/world/farm/FarmWorldBinder.ts:6` | `FARM_PLOT_ORIGIN={tx,ty,pitch:4}` | `plotIndexAt` 按 `row*3+col` 索引 → **9 块地顺序=plots 数组顺序**，只许平移 origin、不许换行优先方向，否则老档 9 块地作物错位互换 | 🔴→🟡（规则明确后即低危） |
| 7 | `assets/data/catalogs/interactables.json` | 23 个采集点坐标 | **ID 保持稳定**（tree_3 还是 tree_3，只换坐标）→ 老档 `clearedIds/regrowAt` 语义不变；新坐标不得压路/压水/压地标；坐标须与 `validate-layout-v3.py` INTERACTABLES 表同源 | 🟡 |
| 8 | `tools/validate-layout-v2.py` | 新增 `tools/validate-layout-v3.py`（复制改造，勿覆盖 v2） | 新增规则：每屏地面类型上限、地标间距、区域不咬合（矩形两两不相交）、采集点可走格、SPAWN 可走。**门禁语义保持**：「全部通过才允许进 TerrainData.ts」 | 🟡 |
| 9 | `docs/design/world-redesign/map-sketch-tool.html` | `renderBase()` 坐标同步 | 纯文档工具，改完用浏览器目测一屏密度即可 | 💭 |
| 不改 | `defense_maps.json` / `DefenseSystem` / `DefenseCore` | — | 防守叠加层是**屏幕空间**网格（originX=-480,originY=288），与世界瓦片坐标解耦；V3 世界几何变化不影响布阵。BuildPanel 拾取也在该局部网格 | ✅ |

**成本评估**：约 6 个文件常量改动 + 1 个迁移函数（≈15 行）+ 1 个新校验脚本。单人 1 个工作日内可完成含自测。无需任何新美术资产即能落地（V3 复用 6+1 贴图，新增"同色系变体"属贴图替换不换键名）。

---

## 2. 边界测试用例表（核心三系统 + V3 迁移专项）

> 验证方式缩写：**HEAD**=node 无头脚本 / **DBG**=DEBUG 构建 dbg API（`__spike.dbgDay/dbgTp/dbgEdit/dbgGive`）/ **DEV**=web 预览手工 / **真机**=TapTap 自测包。

### A. 存档损坏恢复（SaveManager）

| ID | 前置 | 操作 | 期望 | 验证 | 优先级 |
|---|---|---|---|---|---|
| A1 | 有效主档+bak | 手动破坏主档 JSON（截断） | load 回退 bak，游戏继续，下次 save 重写主档 | DEV（控制台改 localStorage/平台存储） | P0 |
| A2 | 主档+bak 全坏 | load 返回 null → 新档 | **现状**：新档首次 persist 覆盖坏主档，无留证。**建议**：new game 前把坏档改名 `save_main.corrupt` 留证（≈5 行） | HEAD | P1 |
| A3 | 有效档，terrain 字段截断（解出垃圾） | 载入 | `decodeRLE` 值守卫/全消耗守卫返回 false → `regenerateBaseline()`，玩家 edits 丢失但游戏可用 | HEAD+DEV | P0 |
| A4 | terrainSize≠MAP_W*MAP_H | 载入 | 守卫拒绝解码 → 重建基线（正是 V4 迁移依赖的机制） | DEV | P0 |
| A5 | version=2 老档（codex 前） | 载入 | 迁移链 2→3→4 全部走通，inventory/dayIndex 保留 | HEAD | P1 |

### B. 跨天作物状态（FarmSystem + TimeSystem）

| ID | 前置 | 操作 | 期望 | 验证 | 优先级 |
|---|---|---|---|---|---|
| B1 | plot 已浇水（wateredOnDay=D） | 睡觉到 D+1 | growth+1（`_onDayAdvanced` 判 `wateredOnDay===dayIndex-1`） | HEAD/DBG `dbgDay` | P0 |
| B2 | plot 未浇水过夜 | 睡觉 | growth 不变、**不枯萎**、不扣种子（grow-only 设计） | DBG | P0 |
| B3 | 成熟作物挂 3 天 | dbgDay×3 | isMature 持续 true，可收，产量不变 | DBG | P1 |
| B4 | savedRealTimeMs 停 13h / 25h / 73h | 重进 | 离线结算 1 / 2 / **2**（OFFLINE_MAX_DAYS 封顶），逐日 endDay 语义=逐条 dayAdvanced | HEAD（TimeSystem 时间源已抽象，可注入 nowMs） | P0 |
| B5 | 存档时间 > 当前时间（回拨） | 重进 | settleOffline 返回 0 天，不倒扣（时间旅行红线） | HEAD | P0 |
| B6 | 当季末种植（season 第 14 天） | 跨季成熟 | plant 时点校验 seasons；跨季**允许成熟可收**（确认现有实现即如此，写进验收防回归） | DBG | P1 |
| B7 | 同一日重复浇水 | 两次 water | 第二次拒绝（wateredOnDay===today） | HEAD | P2 |

### C. 防守失败不清档（DefenseSystem + BedtimeDialog/DefenseOverlay）

| ID | 前置 | 操作 | 期望 | 验证 | 优先级 |
|---|---|---|---|---|---|
| C1 | 当晚有夜战，故意放怪到祭坛 | 夜战败 | `settle()`: altarHp=50（ALTAR_LOST_HP）、towers 快照保留、lastSettledDay=today、无 game over、无清档；`_onDawn` 正常 endDay+persist('defense_settled') | HEAD（DefenseCore 已无头）+DEV | P0 |
| C2 | 败后同日再睡 | 点睡觉 | `startNight` 因 `lastSettledDay===today` 返回 false → 普通睡眠过天，**不重复夜战** | DEV | P0 |
| C3 | 夜战中强杀进程 → 重进 | 重新载入 | night 是内存态不持久化 → `hasNightTonight()` 仍 true 且 lastSettledDay<today → **可重打今晚**；towers 从 seal.towers 重建、altarHp 从 seal 恢复（=满血重开）。**已知边界**：重打可反复刷 kill rewards——接受与否需 game-designer 拍板（§5） | DEV（复现：夜战开始后刷新页面） | P1 |
| C4 | 夜战开局瞬间 quit（startNight 后 settle 前） | 重进 | 同 C3；额外确认 seal.altarHp 未被内存残值污染（settle 才写 seal） | DEV | P1 |
| C5 | 白天拆塔/升级/修祭坛各一次 + 夜战中尝试 | 混合操作 | 白天全部生效并 persistSeal；夜间全部被 `this.night` 守卫拒绝；拆除返还 60% buildGold floor | HEAD/DEV | P1 |

### D. V3 迁移专项（新增，跟随 blocker 修复）

| ID | 前置 | 操作 | 期望 | 验证 | 优先级 |
|---|---|---|---|---|---|
| D1 | 构造 V3 格存档（version:3 + V2 RLE + clearedIds 含 tree_1 + towers 2 座 + plot 作物） | 新版本载入 | version→4；`world.terrain/terrainSize` 删除；地形=V3 基线（目测+terrainDump）；clearedIds/towers/plots 原样；地图尺寸守卫未触发（因为走迁移而非尺寸不符） | **HEAD**（迁移是纯 JSON 函数，直接单测） | P0 |
| D2 | 老档 playerX/playerY 在 V3 水体/森林上 | 迁移+载入 | 玩家落 V3 SPAWN（迁移重置），出生可移动 | HEAD+DEV | P0 |
| D3 | 无存档新玩家 | 首启 | 直接 V3 基线，无迁移路径执行 | DEV | P0 |
| D4 | V2 老档 tree_1 已砍（clearedIds） | 迁移 | V3 里 tree_1（新坐标）仍为已砍状态、regrowAt 剩余天数正确 → **前提：interactables.json ID 不重排**（§1 #7） | HEAD | P0 |
| D5 | 迁移后玩家在 world 里造 1 格 StonePath 再存 | 存/读回环 | 玩家 edits 正常持久化（迁移一次性丢失老 edits 属预期，写进版本说明） | DEV | P1 |

**每个 🔴 blocker 的最小修复 + 对应用例**：blocker=存档盖新地图 → 修复=§1 #1（SaveManager V4 迁移，≈15 行）→ 回归=D1~D4 + A4（守卫机制不回归）。

---

## 3. 真机检查清单（对齐 docs/taptap/publishing.md）

> publishing.md 已沉淀四轮真机翻车复盘（0.0.3 黑屏→灰块→色块→输入失效，0.0.4 闭环）。以下清单把**历史翻车项固化为每次发包必查**，再叠加 V3 专项与提审全量项。

### 3.1 构建基线（每次发包必查，源自历史翻车）

- [ ] 构建任务**场景清单含 world/adventure**（0.0.3 黑屏主因，publishing.md:51）
- [ ] 构建设备方向=横屏（落 `deviceOrientation: "landscapeRight"`，publishing.md:47）
- [ ] `macro.CLEANUP_IMAGE_CACHE = false` 在 GameApp.start 最前（publishing.md:52-53）
- [ ] 全库 grep 无 `Node.TOUCH_START` 等静态别名，全部 `Node.EventType.TOUCH_*`（publishing.md:55，提交 70fdecf）
- [ ] UICamera ORTHO + z=1000（publishing.md:55 ①）
- [ ] 首包 ≤20MB（控制台口径，严于官方 60MB）
- [ ] 自测用户白名单已添加（publishing.md:50，开发者本人也要显式加）

### 3.2 V3 专项（新包首轮）

- [ ] **地面纹理可见**：草地/泥土像素纹理（灰块=烘焙降级误触发，纯色块=ImageAsset.data 空——两种历史病都要能一眼排除）
- [ ] 用旧版本包（V2 地形存档）→ 覆盖装新包 → 载入：地图变为 V3 布局、玩家在出生点、床/NPC/码头均可交互（=D1/D2 真机版）
- [ ] 全新安装：V3 基线，教程引导不卡住
- [ ] 罗盘 3 个 POI（副本/封印/码头）指向与 V3 坐标一致、走到点后隐藏
- [ ] 桥/码头可达：走到湖边出钓鱼弹窗；副本门/祭坛/守门人触发对话
- [ ] 9 块农田 bind 正确（种植→浇水→睡觉→发芽，顺序与 plots 索引一致）
- [ ] 出生点一屏目测：地面类型种类符合 V3 预算（level-designer 给 N，建议 ≤3）
- [ ] 帧率：快速跑图穿越区域边界（bake chunk 增量 rebake 不掉帧、无明显加载洞）

### 3.3 提审前全量（发布前核对扩展）

- [ ] 分辨率：1280×720 基准 + 至少 1 台异形屏（刘海/圆角）确认 SAFE_AREA 下右侧 4 钮、底部工具坞、顶部 HUD 无遮挡
- [ ] 触控：摇杆拖拽位移≈duration×128px/s；点按工具槽 `_edit.tool` 翻转（publishing.md:55 验证基线）；多面板开关无触摸穿透
- [ ] 性能：夜战全程 30s+ 帧率稳定；后台切换回前台（onHide→persist 链路）存档完好
- [ ] 音频：BGM 循环、夜战音效、关键 SfxLib.bindEvents 事件全部发声；静音开关重启后保持
- [ ] 存档：杀进程重启读档一致；A1（坏档回 bak）真机抽测；「添加到桌面」入口存在（必接能力，publishing.md:13）
- [ ] 备案状态：前置备案已提交（publishing.md:21 硬性前置）；对外文案无"断网可玩"承诺（publishing.md:12）

---

## 4. 风险登记（每条含位置/触发/影响/验证）

| 风险 | 位置 | 触发条件 | 影响 | 验证方法 |
|---|---|---|---|---|
| 老档 V2 地形盖掉 V3 基线（🔴 已复现于代码路径推演，未真机复现） | WorldSpike.ts:58-79 守卫 | V3 不改地图尺寸 + 未升 SAVE_VERSION | 老玩家看不到 V3；地标/地形错位 | D1（HEAD 可复现） |
| 迁移后玩家落不可走格（推演，未复现） | SaveManager _migrate（若不处理落点） | 老坐标落 V3 水体 | 出生卡死，只能 wipe | D2 |
| TT 索引错位 → 贴图全串（推演） | TerrainData.ts:14-23 + WorldSpike setSources | V3 擅自插入新枚举值 | 全地面渲染错乱 | 真机 3.2 第一条 |
| 农田 plots 索引错位（推演） | FarmWorldBinder.ts:6 + plotIndexAt | 改行优先方向或乱序 | 老档作物长错地 | D1 断言 plots 顺序 |
| 采集点 ID 重排 → 已砍树复活/新树秒没 | interactables.json | 重编号而非仅移坐标 | 经济/进度轻微错乱 | D4 |
| 夜战重开刷 kill rewards（现存边界，非 V3 引入） | DefenseSystem startNight/lastSettledDay 守卫 | 夜战中强杀进程 | 小额资源可刷 | C3 |

**区分**：「已复现」仅指源码路径推演可静态确认者（风险 1 可由 D1 无头脚本即时证实）；其余为推演或现存边界。真机验证本轮未执行（无真机环境）。

---

## 5. Handoff（与协调者/其他角色对账）

1. **→ architect**：确认 blocker 修复方案采纳「SAVE_VERSION 4 + 迁移删 terrain」（备选：独立 terrainVersion 字段，但我推荐复用版本链，理由：迁移机制已存在、terrainSize 守卫已有重建语义、改动面最小）。若 architect 的 v3-clarity-impl-impact.md 提出了不同方案，以此处 D1 用例做仲裁。
2. **→ level-designer**：①V3 SPAWN 坐标确认（迁移硬依赖）；②interactables.json 23 点**仅移坐标不重排 ID** 的承诺；③每屏地面类型预算 N 的最终值（真机清单 3.2 引用）。
3. **→ game-designer**：C3 夜战重开刷奖励边界——首版接受或后续加「夜战进度快照」（建议首版接受，量级小）。
4. **缺口/未覆盖**：同伴三份 v3-clarity 文档未读（独立分析要求）；真机与 Cocos 编辑器验证未执行；SaveManager/FarmSystem 尚无无头测试（cc 依赖，建议把迁移函数与 FarmSystem 日推进逻辑抽纯函数后补测——迁移函数天然满足）。
5. **无遗留**：本任务不产生新的未答问题；上述 1–3 项为移交决策，非本角色阻塞项。
