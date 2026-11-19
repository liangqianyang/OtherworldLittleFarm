# V2 世界布局架构审查报告（layout-v2-arch-review）

- 负责成员：Software Architect（engineering-software-architect / agent-11）
- 审查对象：已冻结并实机验收的 V2 世界布局（96×80），视角=代码骨架/存档/数据驱动/平台隔离
- 权威基线：`docs/design/world-redesign/world-layout-v2.md`（几何）、`docs/design/world-redesign/layout-v2-impl-spec.md`（机制）、`docs/design/world-redesign/layout-v2-pacing.md`（节奏）、`docs/design/game-design-draft.md` §13（MVP 边界）
- 审查日期：2026-11-18（V2 冻结基线之上，本报告不改动任何冻结几何）
- 验证方式：静态代码核查（assets/scripts 全量关键文件）+ 数据表比对 + 文档交叉引用；**未运行编辑器/真机**（impl-spec §14 记录 tsc 零错误、validate-layout-v2.py ALL PASS，本报告引用该记录）

---

## 1. 结论

**① 四大需求区齐备：是。** living/farm/advGate/defense 四区几何、地标、交互接线在「文档=TerrainData 常量=数据表=运行时装配」四层全部一致：
- 居住区：床(50,38) 可睡（WorldLiving.ts:278 `world_bed`→BedtimeDialog）、园艺师(46,42)/守门人(54,36) 可对话、石板广场 x40-52/y36-46；
- 种田区：3×3 地块 origin(58,42) pitch4（FarmWorldBinder.ts:6）、谷仓(65,38)（装饰）；
- 冒险区：副本门(50,22) 可进（WorldSpike.ts:394→`adv.start('old_wood')`）；
- 布置封印区：祭坛(60,28) 可布置（WorldLiving.ts:262 `world_seal`→BuildPanel），夜战板 seal_1 数据齐备（defense_maps.json）。
距离预算全达标（床2.0/地块9.5/守门人5.7/副本18/祭坛15.6/码头17.9 格，均低于 pacing 预算表上限）。

**② 缺陷：存在，但无几何级缺陷。** 全部缺陷位于「健壮性/可读性/单源性」层，均可在不动冻结几何的前提下修复。最重要两项：
1. **铲子不还原高度（幽灵高度）**——已在 spec 风险表 R2 复现，本报告代码级确认仍存在且影响通行（TerrainEdit.ts:115-122 + TerrainData.ts:149）；
2. **defense 区在世界层不可读**（路线/刷怪点/守护点三要素全部只在夜战板内）——对照塔防关卡设计主流属可读性缺陷，可用「BuildPanel 数据驱动预览」零几何修复。

**推荐**：按 §5 优先级执行 P0-1/P0-2（两次小改，不动几何、复用现有系统层），P1 三项按现有数据表零代码或低代码落地；LANDMARKS 单源重构维持 spec 偏差2 的「下次触 terrain 代码时」排期，但先用校验器扫描兜底。

## 2. 证据与位置

### 2.1 四区齐备的四层一致性（逐层核对）
| 层 | 证据 | 结论 |
|---|---|---|
| 文档 | world-layout-v2.md §4 REGIONS/地标/路网表 | 六区矩形+地标坐标冻结 |
| 常量 | `assets/scripts/gameplay/world/TerrainData.ts:25-37` REGIONS/LAKE/SPAWN 逐字一致 | ✓ |
| 基线生成 | TerrainData.ts:78-150 generateBaseline 按冻结管线（六区→9路→湖沙→河5段→桥 Dirt 还原→三石板台→Deck(42,57)(42,58)→高度边界） | ✓ |
| 运行时装配 | WorldSpike.ts:119 WorldLiving.assemble；床(50,38):278、祭坛(60,28):262、NPC(46,42)/(54,36):295-296、副本门(50,22) WorldSpike.ts:394、地块 FarmWorldBinder.ts:6 | ✓ |
| 数据表 | interactables.json 23 行 v2 坐标一致；defense_maps.json seal_1 15×9+A/B 双路+祭坛格；defense_waves.json 3 波 mapId=seal_1 | ✓ |

### 2.2 平台隔离（架构铁律）✓
grep `tap\.|window\.tap|TapGame|taptap\.` 全仓：命中仅 IPlatformAdapter.ts:5（铁律注释）、TapAdapter.ts:7/16/38/74/95/101/124/143、SettingsPanel.ts:14（注释）。**核心逻辑零 tap.* 违例**；TapAdapter.detect() 探测 + LocalAdapter 降级（GameApp.ts:154-159），onHide/onShow 无 tap 回调时降级 engine 事件（TapAdapter.ts:93-103）。

### 2.3 存档健壮性
- terrainSize 守卫已落地：GameApp.persist 写 `world.terrainSize=MAP_W*MAP_H`（GameApp.ts:100-111），WorldSpike.start 校验后才 decode（WorldSpike.ts:72-79），失败回基线 ✓（spec 偏差1，效果等价于升版）。
- **decodeRLE 无长度/值域护栏**（TerrainData.ts:197-213）：截断→返回 false→安全回基线；但「格式合法、字节数错误」的 base64 会静默填垃圾并返回 true。R1 的尺寸盲区被 terrainSize 挡住，R9 长度盲区未挡。
- 基线快照只有 types：TerrainData.ts:149 `this.baseline = new Uint8Array(t)`，**无 heights 快照**——R2 未修复的直接原因。

### 2.4 R2 幽灵高度（本报告代码级确认仍存在）
- TerrainEdit.applyAt shovel 分支（TerrainEdit.ts:115-122）：`nt = d.baseline ? d.baseline[i] : TT.Grass` 只还原类型，`nh` 保持 prevHeight 未重置；
- 影响：楼梯（build_stairs 写 heights=1）被铲除后留下「h≥1 且无 Stairs 类型」的格，PlayerCharacter.ts:111-127 台阶规则（Δh=0 平走/Δh=1 需任一端 Stairs/Δh≥2 拒绝）会对邻格拒绝通行→**活区域出现无法通行的孤格，且随 RLE 存档固化**（encodeRLE 连 heights 一起存）；
- undo 可会话内还原（TerrainEdit.ts:142-159），但存档→重载后 undo 栈清空，幽灵格永久化。

### 2.5 对照主流设计的缺口（架构相关部分）
| 主流参照 | 现状 | 缺口 |
|---|---|---|
| 星露谷 diegetic 卖粮（shipping bin 立在田边） | 谷仓纯装饰无交互（WorldLiving.ts:111 注释）；卖粮=屏幕右侧全局按钮 `_mkBtn('卖粮(0)',560,0)`（WorldLiving.ts:185-200） | 卖粮点非情境化；谷仓已是冻结地标，加交互=零几何改动 |
| 塔防三要素图上可读（路线/刷怪点/守护点） | 世界层 defense 区=祭坛地标+开阔地，区内零地物；路线/入口只在夜战板 seal_1 内 | 玩家白天站在 defense 区读不到 A/B 路、入口、守护格 |
| 寻路引导：landmark 密度、diegetic 引导 | 路牌×4+罗盘POI×3+距离标签（CompassHUD.ts:16-20）已达基线 | defense 区缺少「布防教学语境」的世界层锚点 |
| 数据驱动 | 13 表 manifest（DataManager.ts:15-29）；waves/mapId 数据齐 | DefenseSystem._mapRow 硬编码 'seal_1'（DefenseSystem.ts:373-376），与 waves.mapId 双键并存 |

### 2.6 未验证项（明示）
- 未运行 Cocos 编辑器/真机；未重跑 tools/validate-layout-v2.py（引用 impl-spec §14 的 ALL PASS 记录）；
- EconomySystem.sellAllProducts 细节引用 layout-v2-pacing.md §1（未重读源码）；
- AdventureSystem 副本内部（old_wood 房间链）不在世界图范围，未审；
- UI notes §6 V1-V16 真机验证清单未执行（design-ui-designer 范围）。

## 3. 风险（位置/触发/影响/验证）

| # | 位置 | 触发 | 影响 | 验证方法 |
|---|---|---|---|---|
| R-A（=spec R2，已复现+本报告确认影响通行） | TerrainEdit.ts:115-122；TerrainData.ts:149；PlayerCharacter.ts:117-125 | 居住区造楼梯→铲除（或 undo 后存档重载） | 幽灵 h≥1 格拒绝邻格通行，出现孤格/死角；随存档固化，重载后不可 undo | ①dbgTool stairs→dbgTool shovel→dbgWalkTo 穿越该格；②terrainDump 查 h≥1 且 t≠Stairs 的格数；③存档→重载→terrainDump 复查 |
| R-B（=spec R9，未复现，属健壮性盲区） | TerrainData.ts:197-213 decodeRLE | localStorage 被部分改写/迁移期写入非法长度 RLE | 静默填垃圾地形并返回成功：可能把 Water 写进出生点→卡死；terrainSize 守卫不拦（尺寸对、内容错） | tools/test_rle.mjs 增加「合法 base64+错长度」用例，断言 decode 返回 false |
| R-C（潜在，三层数据漂移） | WorldSpike.ts:394、WorldLiving.ts:259/275/295-296/334、FarmWorldBinder.ts:6、CompassHUD.ts:16-20 共 5 文件地标字面量 | 未来任何一次几何微调只改文档/常量、漏改字面量 | 交互点/罗盘/路牌与地形错位（罗盘指空地、路牌误导）；正是 V2 冻结想消灭的问题类 | grep 字面量对照 world-layout-v2.md §4；或校验器扫描（见 P2-1） |
| R-D（潜在，塔防可读性） | 世界层 defense 区（58-90/6-32）+ BuildPanel | 玩家白天首次到达 defense 区/首次打开 BuildPanel | 读不到 A/B 路、刷怪入口、守护格→首夜布防全靠盲猜，夜战挫败感前置到白天 | 实机走查：不开预览的新玩家能否说出「怪从哪来、祭坛在哪」；对照塔防关卡三要素清单 |
| R-E（潜在，双键漂移） | DefenseSystem.ts:373-376 `_mapRow()` 硬编码 'seal_1' | 新增第二张防守板（defense_maps 加行+waves 改 mapId） | 夜战用新板、白天布防仍读 seal_1→塔位/祭坛血与夜战不一致 | 单测：waves 行 mapId 改 mock 值，断言 startNight/白天布防读同一行 |
| R-F（低，存档窗口） | GameApp.persist 仅 onHide/卖粮/结算触发 | 世界层改地形后未触发 onHide 即杀进程 | 最近一次地形编辑丢失（回上次持久化状态） | 真机：改地形→杀进程→重载比对 terrainDump |

## 4. 行动（优先级排序；均不动冻结几何）

### P0-1 铲子还原高度（修 R-A，spec 风险表原定最小修复，两处小改）
1. `TerrainData.ts:149` 基线快照补 heights：`this.baselineTypes = new Uint8Array(t); this.baselineHeights = new Uint8Array(d.heights);`
2. `TerrainEdit.ts:115-122` shovel 分支：`nh = d.baselineHeights ? d.baselineHeights[i] : 0;`
- 负责人：Software Architect；验收：①楼梯→铲→dbgWalkTo 可通过；②terrainDump 无「h≥1 且 t≠Stairs」格；③存档→重载 heights 一致；④undo 行为不回归。
- 回归用例：造楼梯(h1)→铲→邻格步行；造桥（不改高度）→铲→桥还原为河且高度 0。

### P0-2 decodeRLE 完整性护栏（修 R-B）
- `TerrainData.ts:197-213`：解码后校验 `p === bin.length && i === n`（字节数恰好耗尽且填满 n 格），不满足返回 false 回基线；types 值域 ≤8、heights ≤2 抽查。
- 负责人：Software Architect；验收：tools/test_rle.mjs 新增 3 用例（截断/超长/合法但错长度）全绿；正常存档往返 decode 结果逐字节相等。

### P1-1 谷仓 diegetic 卖粮（补星露谷缺口，零几何改动）
- 谷仓(65,38) 节点挂 Interactable 'world_barn'「出售农产品」，复用 `EconomySystem.inst.sellAllProducts(app.inventory)` + persist('shop_sell') + 两段确认（照抄 WorldLiving.ts:185-200 模式）；屏幕卖粮按钮保留为冗余入口（是否移除由 game-designer 拍板）。
- 负责人：Software Architect（接线）+ game-designer（入口取舍）；验收：谷仓旁情境按钮卖粮→金币增加→存档重载一致；两段确认防误触；热区≥88px（UI notes §17）。

### P1-2 defense 区可读性：BuildPanel 数据驱动预览（修 R-D，读 defense_maps.json 即可）
- BuildPanel 打开时渲染 seal_1 板缩略图（15×9，只读）：paths A/B、altarCells、decor 直接来自 defense_maps.json，placeTower 交互映射到板上坐标；世界层可选补一块警示牌（建议 altarH 入口附近 (58,27)-(59,27) 一格，**新增地物需先跑 tools/validate-layout-v2.py**，属 §9 允许的「不改冻结表的新地物」）。
- 负责人：Software Architect（预览渲染）+ design-ui-designer（布局/热区）+ game-designer（文案）；验收：BuildPanel 打开即见 A/B 路与祭坛示意且与夜战实际板一致（用 DefenseCore.resolveMap 输出对照）；警示牌文案与守门人情报行（WorldSpike.ts:296-309）呼应。

### P1-3 DefenseSystem 去硬编码 mapId（修 R-E）
- `DefenseSystem.ts:373-376`：`_mapRow()` 改为读当前命中的 waves 行 mapId（defense_waves.json 已携带 mapId 字段），消除双键。
- 负责人：Software Architect；验收：现有 3 波表照常运行（mapId 均为 seal_1，行为零变化）；mock 改 mapId 后白天布防与夜战读同一板。

### P2-1 地标单源兜底（R-C 缓解，不改运行时）
- 最小方案：tools/validate-layout-v2.py 增加「源码字面量扫描」——对照 world-layout-v2.md §4 表 grep 上述 5 文件坐标字面量，漂移即 FAIL（零运行时风险）。
- 完整方案（维持 spec 偏差2 排期）：新增 assets/scripts/gameplay/world/landmarks.ts 单源导出，5 文件改引用。
- 负责人：Software Architect；验收：校验器 ALL PASS 且故意改错一个坐标能 FAIL。

### P2-2（可选）world→farm 场景切换补一次 persist（收窄 R-F 窗口）
- 负责人：Software Architect；验收：改地形→切场景→杀进程→重载地形仍在。

## 5. Handoff（跨角色对齐点/未覆盖范围）

1. **→ game-designer**：①谷仓卖粮 vs 屏幕全局按钮的入口取舍（P1-1）；②defense 区教学职责分工——警示牌文案 or BuildPanel 预览承担（P1-2）；③包体口径需拍板：任务约束书 ≤20MB vs game-design-draft §13:265（首包≤4MB/整包微信口径≤30MB），提审以 developer.taptap.cn 后台为准。
2. **→ design-ui-designer**：①BuildPanel 预览小地图的布局/热区规格（ui-notes §5.6 装扮模式未覆盖预览小地图）；②警示牌为世界层装饰节点，确认不与 CompassHUD EDGE52/顶部让位规则冲突；③ui-notes §6 V1-V16 真机清单仍待执行。
3. **→ level-designer**：四区齐备结论已按四层（文档/常量/基线/装配）复核，与你的几何冻结一致；后续任何新地物（含 P1-2 警示牌）先跑 tools/validate-layout-v2.py（§9 不变式）。
4. **→ code-reviewer**：R-A/R-B 回归用例清单见 §4 P0-1/P0-2 验收栏；建议把「楼梯→铲→步行」与「畸形 RLE 样本」加入 tools/ 常驻脚本。
5. **未覆盖**：AdventureSystem 副本房间链内部布局（超出世界图审查范围）；素材/音频；真机与编辑器实测（本报告为静态审查）。
