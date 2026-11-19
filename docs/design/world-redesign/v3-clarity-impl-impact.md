# V3 整洁化重设计——实现影响评估与代码改动清单（v3-clarity-impl-impact）

- 负责成员：Software Architect（engineering-software-architect）
- 日期：2026-11-19
- 审查视角：Cocos 3.8.8 代码骨架 / 存档 / 数据驱动 / 平台隔离（**不重复上轮 layout-v2-arch-review 的功能分区结论**）
- 权威输入：`docs/design/world-redesign/world-layout-v2.md`（冻结几何）、`assets/scripts/gameplay/world/TerrainData.ts`（基线生成）、`tools/validate-layout-v2.py`（校验器）、`assets/data/catalogs/{interactables,defense_maps}.json`
- 验证方式：静态代码核查（world 链路全量关键文件逐行核对 + grep 坐标字面量清点）；**未运行编辑器/真机**（明示为未验证项，见 §5 回归清单）

---

## 1. 结论（先行）

**① V3 在实现层是「几何数据搬迁 + 坐标单源化」，不是引擎或渲染管线改造。** `generateBaseline()` 的结构（rect/roadH/roadV/riverSeg/桥/石板台/高度带）全部是数据驱动函数，V3 只需换坐标表；6+1 种地面贴图资产**零新增也能落地**（纹理纪律靠几何与 tint 达成，见 A6）；包体、存档体积、分块渲染、平台适配层全部不动。估算总工作量 **≈2.5–3 人日，单人一次改完可行**，满足「V3 必须是能一次改完的量级」约束。

**② 但有三件架构事必须与几何改动同步做，否则 V3 必然引入新缺陷：**

1. **P0 存档守卫升级 `terrainSize` → `terrainSize + layoutVer`（本轮最重要的新风险）。** 现有守卫只防「尺寸不同」；若 V3 保持 96×80（建议保持，理由见 §3-C1），V2 老档的 RLE 尺寸恰好等于 V3，守卫放行 → 解码出的是 V2 几何地形，叠上 V3 地标/路牌/罗盘坐标 = 全图错位且静默无声。必须加 `world.layoutVer` 字段把「几何代数」显式写进存档。
2. **P0 坐标单源化（上轮 R-C 的根治窗口）。** 世界坐标字面量当前散布 **6 个代码文件 + 2 个数据表**（清单见 §2）；上轮审查把单源重构排期到「下次触 terrain 代码时」——V3 正是那次。此次不改，字面量漂移从「潜在风险」升级为「必然事故」。
3. **P0 校验器升 v3 并内置「视口密度预算」机检规则。** 用户「眼花缭乱」的主诉在实现侧可转译为可机检不变式（每采样视口地面类型 ≤3 等，规则见 §6-D）；没有这条红线，V3 落地后无法证明「比 V2 整洁」，只能靠人眼复判。

**③ 纹理纪律的实现决策（对 Q1 的实现侧佐证 + 建议）：** 代码证实**道路（TT.Dirt）渲染复用的是 `tiles/plot_soil` 农田土壤贴图**（TerrainBakeRenderer.ts:55 + WorldSpike.ts:172-178 的 srcs 映射 `1: so`；pool 路线同构 fr 映射），即**路与农田同纹理**——出生点一屏内土壤色块同时承担「4 个方向的路端头」与「地块土壤角」两种语义，读作「散乱棕块」，这是杂乱感的直接实现层成因之一。修复不需要新图：bake 渲染器 `tileSpec` 已支持逐类型 tint，给道路叠加深色 tint 即可与地块土分离（零包体增量）；如后续批准 1 张真 `ground_dirt.png`（32px、锁调色板，≈1–2KB），更佳但非必需。**过渡瓦片清单 = 0 张**（决策与理由见 A6）。

---

## 2. 证据与位置

### 2.1 V3 改动触点全清单（坐标字面量所在处，file:line）

| # | 文件 | 位置 | 现值（V2） | V3 改法 |
|---|---|---|---|---|
| 1 | `assets/scripts/gameplay/world/TerrainData.ts` | :12-17 | MAP_W=96/MAP_H=80/CHUNK=16 | **不动**（96×80 保持论证见 §3-C1） |
| 2 | 同上 | :25-32 | REGIONS 六区矩形 | 改值 → 改为引用 `worldLayout.ts`（单源） |
| 3 | 同上 | :35,:37 | LAKE(20,58,42,71)、SPAWN(50,40) | 改值 → 引用单源 |
| 4 | 同上 | :80-153 | generateBaseline：9 路/5 河段/桥/三石板台/Deck(42,57)(42,58)/高度带 | 结构保留；路段表/河段表/台表改从单源读（roadH/roadV/riverSeg 函数签名不变） |
| 5 | 同上 | :145-147 | 高度边界环 + defense 东缘 x86-90/y16-28 h=2 | 随 defense 区移动（或 V3 取消该台，见 R-V39） |
| 6 | `assets/scripts/gameplay/world/WorldSpike.ts` | :72-79 | terrainSize 守卫 + decode 回基线 | **加 layoutVer 条件**（A1 详设） |
| 7 | 同上 | :394 | 副本门 `(50,22)` 字面量 | 引用单源 LANDMARKS.gate |
| 8 | 同上 | :194(TerrainBakeRenderer) | benchEdit 基准点 `cxc=24, cyc=36` | 校验该格在新图为普通草地，否则改值（R-V33） |
| 9 | `assets/scripts/gameplay/world/CompassHUD.ts` | :16-20 | POIS 副本(50,22)/防守(60,28)/码头(42,56) | 引用单源（同时受益：POI 数量可配置） |
| 10 | `assets/scripts/gameplay/world/living/WorldLiving.ts` | :119 | 谷仓 `(65,38)` | 引用单源 |
| 11 | 同上 | :379 | 封印祭坛 `(60,28)` | 引用单源 |
| 12 | 同上 | :403-407 | 床 `bx=50, by=38` | 引用单源 |
| 13 | 同上 | :422-425 | NPC 园艺师(46,42)/守门人(54,36) | 引用单源 |
| 14 | 同上 | :461-466 | 路牌×4 (49,35)(55,38)(33,42)(47,47) | 引用单源（坐标随新路网） |
| 15 | `assets/scripts/gameplay/world/farm/FarmWorldBinder.ts` | :6 | FARM_PLOT_ORIGIN {58,42,pitch4} | 改值 → 引用单源；**index 映射逻辑不动**（旧档零损失的前提） |
| 16 | `assets/data/catalogs/interactables.json` | 全部 23 行 | 树×12/石×8/丛×3 坐标 | level-designer 供新坐标；**id 保持不变**（clearedIds/regrowAt 按 id 存复活状态，SaveManager.ts:10-13） |
| 17 | `tools/validate-layout-v2.py` | :6-44 | V2 常量 + 9 类规则 | 复制为 `validate-layout-v3.py` + 新增密度规则（§6-D）；v2 版保留作历史对照 |
| 18 | `assets/scripts/gameplay/world/TerrainBakeRenderer.ts` | :51-66 | tileSpec：Dirt→plot_soil | 可选 tint 分离路/土（A6-P1） |
| 19 | `assets/scripts/app/GameApp.ts` | :108 | persist 写 terrainSize | 增写 `layoutVer` |
| 20 | `assets/scripts/core/SaveManager.ts` | :9-21 | WorldSave 接口 | 加可选字段 `layoutVer?: number`（纯加字段，符合 §12 约束） |

**确认不受影响（零改动，防止误伤面扩大）：**
- 夜战板全链路：`defense_maps.json`（15×9 夜战独立板）+ `BuildPanel.ts:102` + `DefenseOverlay` —— 塔防坐标在板内坐标系，与世界几何解耦，V3 不动；
- 引导链：`TutorialGuide.ts` 纯事件驱动（farmChanged/itemGained/dayAdvanced），零世界坐标；
- 相机钳制：`CameraFollow.ts:21-22` 用 `MAP_W*TILE`，96×80 不变则不动；
- 采集物状态机：`ClearingSystem.ts:64` 按 `catalogs/interactables` 装配、按 id 存档，坐标迁移对存档透明；
- 钓鱼/副本/种子/图鉴数据表：无世界坐标；
- 平台适配层 `platform/taptap/`：与本轮零交集（铁律不破坏）。

### 2.2 「眼花缭乱」的实现侧证据（Q1 佐证；几何结论归 level-designer）

从代码坐标可**机械推出**出生点视口（相机 2×：orthoHeight=180 → 视口世界 640×360 = **20×11.25 tile**，WorldSpike.ts:85 与 TerrainBakeRenderer.ts:206 halfW=10/halfH=6 一致；出生 (50,40) → 视口约 x40-60 / y34-46）：

- **同屏地面纹理 4 种**：StonePath（广场 x40-52/y36-46）+ Grass（庭院填充）+ Dirt（4 个方向路端头：northV x50-51 止于 y35、westH y40-41 触广场左缘、eastH y40-41 触右缘、southV x48-49 穿下缘）+ 地块土壤（PlotWorldView (58,42)-(60,44) 落在视口右缘）。
- **且其中两种同图**：Dirt 路与地块土壤都用 `tiles/plot_soil`（TerrainBakeRenderer.ts:55；WorldSpike.ts:174 `srcs={1:so}`）→ 一屏内同一种棕色纹理承担「路」与「田」两种语义，边缘又全是 1-tile 硬边（bake 逐格 drawImage，无过渡：TerrainBakeRenderer.ts:147-153）。
- **同屏世界物件 ≥6**：床(50,38)、园艺师(46,42)、守门人(54,36)、路牌(49,35)(55,38)、地块土壤组（含作物渲染层）——全部挤在 20×11 格里。
- **UI 叠加 5 簇**：顶栏(y316)+情报行(y268)+右列 4 钮(x560)+工具坞 6 槽(310,-262)+情境按钮/罗盘箭头（WorldLiving.ts:87/192-198、WorldSpike.ts:283-294）。
- **变体缺失加重墙纸感**：TerrainData.bitmask（16 变体）已算好但 bake 渲染器**未消费**（仅 spec.img 缺失时画调试描边，TerrainBakeRenderer.ts:154-159）→ 同类型大面积区域是同一张 32px 图无限平铺。

即：**V2 的杂乱在实现层 = 4 种地面纹理/屏 × 全硬边 × 路/田同图 × 6 物件 × 5 UI 簇**。前两项与第四项是几何与纹理纪律问题（level-designer 主责），「路田同图」与「变体未消费」是实现层可独立修复项（A6）。

### 2.3 存档链现状（A1 的依据）

- `SaveManager.ts:6` SAVE_VERSION=3；`:20` `terrainSize?: number`；`:10-13` clearedIds/regrowAt 按 **id** 键控；
- `GameApp.ts:108` persist 写 `world.terrainSize = MAP_W*MAP_H`；
- `WorldSpike.ts:72-79` 仅当 `worldSave.terrain && terrainSize === MAP_W*MAP_H` 才 decode，否则保持基线；
- `TerrainData.ts:200-217` decodeRLE 已有值域/长度护栏（上轮 R-B 已修，`tools/test_rle.mjs` 有常驻用例）。

**推导**：V2→V3 若同为 96×80，terrainSize 恒等 → 守卫失效。此为代码级可证的确定性缺陷路径，非猜测。

---

## 3. 关键决策与条件

### C1 建议保持 96×80（对「可微调但需论证」的回应）
1. CHUNK 网格 6×5=30、`terrainSize` 语义、相机钳制、bench 常量全部不动 → 改动面显著缩小；
2. 密度问题的成因是**每屏类型数**而非图幅——96×80 对 20×11.25 视口的「屏幕级大区块」（Coral Island 式）绰绰有余；
3. 若未来真要改尺寸，`layoutVer` 机制已就位，届时一并处理（本决策可逆）。

### C2 layoutVer 重建口径：玩家庭院建造将清空
baseline 重建 = 玩家造的桥/平台/石板/台阶消失（与 V2 落地时「老档自动重发基线」同一口径）。farm plots 按 index 映射零损失、采集物按 id 零损失、金币/背包/图鉴不动。**需 game-designer 确认接受**（与 V2 迁移时同标准，非新增损失类）。

### C3 路田分离优先 tint，真贴图列可选
方案 A（推荐，0 包体）：tileSpec 给 TT.Dirt 叠 `rgba(60,45,30,0.35)` 深 tint；方案 B（1 张新图）：`tiles/ground_dirt.png` 32px 素土路。两者都保持「不提出需要大量新美术」的约束；A6 变体（程序化翻转/微 tint）同理零新文件。

---

## 4. 风险表（每条：位置 / 触发 / 影响 / 验证）

| # | 性质 | 位置 | 触发 | 影响 | 验证方法 |
|---|---|---|---|---|---|
| **R-V31** | **潜在·确定性（代码级可证）** | WorldSpike.ts:73 + GameApp.ts:108 | V3 落地后加载 V2 老档（96×80 RLE 尺寸相同） | terrainSize 守卫放行 → V2 几何地形 + V3 地标坐标静默错位：桥/门/祭坛对不上路，玩家建造成果以错位形态残留 | 改后：旧 V2 档启动 → 日志「layoutVer 不符→重建基线」；玩家出生在 SPAWN、地图全为 V3 基线 |
| **R-V32** | 潜在→必改（§2.1 六文件字面量） | §2.1 #6-16 | V3 改几何但漏改任一字面量文件 | 交互点/罗盘/路牌/门与地形错位（罗盘指空地、门不可达） | `worldLayout.ts` 单源 + validator v3「字面量扫描」规则：源码中出现冻结表外坐标即 FAIL |
| **R-V33** | 潜在 | TerrainBakeRenderer.ts:194 benchEdit 基准点 (24,36) | V3 若在该格放特殊地面（路/河/林） | 性能基准失真（烘焙了异型格） | validator v3 断言该格 = Grass，或随单源改值 |
| **R-V34** | 潜在 | interactables.json ↔ 新河/新路 | 新坐标落在河/路/相互重叠 | 采集点压河压路、无法交互；respawn 状态按 id 虽保留但位置失效 | validator v3 沿用 v2 §7 全部规则（区内/不压河路/门 12 格密度/去重） |
| **R-V35** | 潜在 | WorldLiving.ts:516-536 钓鱼探针（±3 格搜水） | 新湖岸离码头/岸路 >3 格 | 钓鱼情境按钮不出现，功能断链 | validator v3 新增规则：Deck 两格 3 格内必有 Water；岸路终点到水边 ≤3 |
| **R-V36** | 潜在 | TerrainEdit.ts:59-74（pave 需邻岸、桥需邻岸/桥） | V3 庭院临河段几何变化 | 造桥/平台玩法在新图开局不可用（庭院段不足 12 格或岸形过宽） | validator 沿用 v2 §3「河穿 living ≥12 格」；实机 hoe/hammer 冒烟 |
| **R-V37** | 潜在 | TerrainData.inLiving(:175) ← REGIONS.living | V3 living 矩形移动 | 工具坞/编辑启用范围随之移动——这是**期望行为**（单源自动跟随），但教学文案「庭院区」指向的边界变了 | 真机走查：新庭院边界内外工具坞显隐正确 |
| **R-V38** | 潜在 | 路牌×4 / CompassHUD EDGE52/顶部让位规则 | 新路牌落点逼近屏幕 UI 热区或压顶栏 | 世界层标签与 HUD 视觉打架 | validator v3 保留 ui §9 规则并把 4 路牌坐标纳入；ui-designer 复检 |
| **R-V39** | 潜在 | TerrainData.ts:145-147 高度带；PlayerCharacter.ts:111-127 通行规则 | V3 defense 区移动后 h2 台地/边界环未同步 | 幽灵高差拒通行（上轮 R-A 同类机制，几何侧新触发点） | 回归：全图 `h≥1` 格仅允许出现在边界环与 defense 台地两处（validator 新断言） |
| **R-V40** | 已接受口径 | A1 重建行为 | layoutVer 不符 | 玩家庭院建造清空（见 C2） | game-designer 书面确认；发布说明不必提示（单机、损失可预期） |

**上轮已复现问题（本轮不重复处理，仅声明关联）**：R-A 幽灵高度、R-B RLE 护栏、R-E DefenseSystem 双键——V3 改动不触碰这些路径；若 code-reviewer 回归时顺带执行上轮 P0-1/P0-2 验收用例，预期全绿。

**未验证项（明示）**：本文全部结论来自静态代码核查与坐标推演；未运行 Cocos 编辑器/真机，未预跑 V3 几何（几何本体由 level-designer 产出后，validator v3 是第一道验收）。

---

## 5. 行动与验收（P0 全做，P1 可选；总计 ≈2.5–3 人日）

### A1（P0，0.25d）存档 layoutVer 守卫
- `SaveManager.ts` WorldSave 加 `layoutVer?: number`；`GameApp.ts:108` persist 增写 `world.layoutVer = WORLD_LAYOUT_VER`（常量出 `worldLayout.ts`，当前=3）；
- `WorldSpike.ts:73` 守卫改 `terrain && terrainSize === MAP_W*MAP_H && layoutVer === WORLD_LAYOUT_VER`；不符 → `generateBaseline()` + **玩家位置重置到 SPAWN**（防 V2 档 playerX/playerY 落进 V3 河/湖）；
- 验收：①V2 档（无 layoutVer 字段）→ 重建基线+出生点复位，无报错；②V3 档存→读→terrainDump 逐字节相等；③`tools/test_rle.mjs` 增「合法 RLE+错误 layoutVer」用例绿。

### A2（P0，1d）坐标单源 `worldLayout.ts` + 六文件接线
- 新建 `assets/scripts/gameplay/world/worldLayout.ts`：导出 `WORLD_LAYOUT_VER / MAP_W / MAP_H / TILE / CHUNK / TT / REGIONS / LAKE / SPAWN / ROADS / RIVER_SEGS / PADS / BRIDGE / DECK_TILES / LANDMARKS / SIGNS / COMPASS_POIS / PLOTS_ORIGIN / HEIGHT_BANDS`（字段即 §2.1 各处现值，类型全部 const 字面量）；
- `TerrainData.ts` 全部 import 该文件（自身不再持有坐标）；§2.1 #7-15 各文件坐标字面量改引用；`benchEdit` 基准点一并单源；
- `interactables.json` / `defense_maps.json` 保持 JSON（运行时表）不动结构；
- 验收：`grep -rn "50, 22\|60, 28\|58, 42" assets/scripts` 仅命中 worldLayout.ts；tsc 零错误；游戏行为与改前逐项一致（先用 V2 坐标做纯重构提交，再换 V3 坐标提交——两步提交便于二分回归）。

### A3（P0，0.5d）validate-layout-v3.py：换表 + 密度规则
- 复制 v2 → v3，换新坐标常量；新增 D1-D4 规则（§6）；新增「源码字面量扫描」（R-V32 兜底，扫描 §2.1 列出的文件）；
- 验收：level-designer 的 V3 几何表灌入后 ALL PASS；故意改错一个坐标/一处密度超标能 FAIL。

### A4（P0，0.25d）数据表坐标迁移
- `interactables.json` 23 点新坐标（level-designer 供），id/hp/drops/respawnDays 不变；
- 验收：validator v3 §7 类规则全过；游戏内 23 点可交互、砍树掉落与存档 respawn 正常。

### A5（P0，0.5d，code-reviewer 主责）回归清单（逐项含命令/操作）
1. 新档出生：出生即见 V3 基线；`__spike.spikeInfo()` route=bake、dirty=0；
2. 主路可达：spawn→副本门 / →祭坛 / →码头 / →最近地块，全程无卡格（`__spike.dbgWalkTo` 或手走）；
3. 副本门/祭坛/床/双 NPC/谷仓情境按钮全部出现在新坐标（`__debug` 遍历）；
4. 睡觉过夜→防守夜（seal_1 夜战板）照常——确认 defense 链零回归；
5. 庭院改造：hoe/hammer/stairs/paver/shovel 在新 living 区可用；造桥→铲→无幽灵高度（上轮 P0-1 用例复跑）；
6. 存档往返：改地形→persist→重载→terrainDump 一致；旧 V2 档升级路径（A1 验收①）；
7. bake↔pool 切换（`__spike.spikeSwitch()`）两路线渲染一致；bench（`__spike.spikeBench(30)`）耗时与 V2 同量级（<5ms/30 格）；
8. 相机四角钳制不越界（CameraFollow 不改，走查即可）；
9. 罗盘 3 箭头指向新地标、进入视口隐藏；路牌 4 块不压顶栏/工具坞；
10. 钓鱼探针在码头出现（R-V35 验证）；买种子/卖粮/背包/图鉴不受影响；
11. `tools/test_rle.mjs`、`tools/test-defense-core.mjs`、`tools/test-combat-core.mjs` 全绿；
12. 包体体积对比（应 ≈0 变化；若采纳 A6-B 则 +1 张 32px PNG）。

### A6（P1，可选，0.5d）纹理纪律实现层（零/极低素材成本）
- A6-1 路/田 tint 分离（方案 A，推荐）：`TerrainBakeRenderer._tileSpec` TT.Dirt 分支叠深 tint；pool 路线给 Dirt 帧加同色 tint 节点或换帧；
- A6-2 程序化变体：bake 烘焙时按 `(x*7+y*13)%4` 做水平翻转 + ±4% 亮度抖动，消费已算好的 bitmask——**零新文件**，消除墙纸感；
- A6-3（需 1 张新图，默认不做）：`tiles/ground_dirt.png`；
- **过渡瓦片清单 = 0 张**：理由——双网格过渡瓦片失控即视觉噪音主源（协调者调研 #5 的 47 张教训），V3 的整洁优先在几何层（减少同屏类型数）达成；过渡瓦片留待 V4 若仍有硬边投诉再议，且届时上限 2 组（草↔土、沙↔水）、每组 4 方向共 ≤16 张。
- 验收：出生点/四条主路中点截图人工比对「路≠田」；A6-2 后同屏无两张完全相同草地 tile 相邻（抽查）。

---

## 6. 交给 level-designer 的可实现性约束（V3 几何必须满足；schema 同步给出）

### 6-D 密度预算（validator v3 机检规则，即「整洁」的验收红线）
- **D1 视口类型预算**：锚点视口集（出生点、每条路中点、每个地标接近视角，共 ≤10 个采样点，20×12 格窗口）内**不同地面基型 ≤3**（基型集合：Grass/Dirt/StonePath/Water/Sand/Forest；PlotWorldView 土壤按 1 型计）。V2 出生点实测 4 型 → V3 必须 ≤3（样点表随几何一并给出）；
- **D2 全图基型上限 ≤5**：建议 Grass 为全局基底，仅 pioneer 林、湖水、道路、石板台 4 个叠加型；**沙仅作为湖岸环、不独立成区**；
- **D3 路网形态**：全轴对齐、每段单一方向直线、段数 ≤5、宽度恒 2、交叉点 ≤6；无 zigzag 交替；单一跨河桥；
- **D4 区域接缝**：六区矩形**互不重叠**，相邻区公共边为整段直线（禁齿状咬合）；非相邻区之间 ≥3 格同基底缓冲带。

### 6-C 机制硬约束（来自代码，违反即功能断链）
| 约束 | 来源 |
|---|---|
| MAP=96×80、CHUNK=16（本次建议冻结） | §3-C1 |
| living 含 SPAWN 与床；≥8×8；河穿 living ≥12 格（造桥玩法） | validator v2 §2/§3 |
| Deck 两格 3 格内必有 Water；岸路终点距水 ≤3 | WorldLiving 钓鱼探针 ±3 |
| 祭坛石板台 ≥5×5 且含祭坛地标、altarH 可达；defense 区含祭坛 | WorldLiving:379 + validator §6 |
| 副本门在北主路轴线上（x∈{路x, 路x+1}）、门台 ≥5×5 | validator v2 §8 |
| 地块群 3×3、pitch4、单块 3×3 → 群占 11×11、不得压路/河/湖/广场、在 farm 区内 | FarmWorldBinder + validator §4 |
| 床≤2 / 地块≤10 / 守门人≤12 / 门≤20 / 祭坛≤20 / 码头≤18 / 树石≤14（出生直线格） | pacing §2.3（预算表不动） |
| 采集 23 点全在 pioneer 区、不压河路、门 12 格内 ≥1 树 ≥1 石、坐标去重 | validator v2 §7 |
| heights：全局仅边界环 h1 + defense 台地 h2 两类（或全部取消，需同步取消 stairs 玩法文案） | TerrainData:145-147 |

### 6-S 单源 schema（几何表按此交付，可直接进 A2）
```ts
// assets/scripts/gameplay/world/worldLayout.ts —— 几何唯一来源；文档 world-layout-v3.md 与此逐字段一致
export const WORLD_LAYOUT_VER = 3;
export const MAP_W = 96, MAP_H = 80, TILE = 32, CHUNK = 16;
export const REGIONS   = { living:{x0,y0,x1,y1}, farm:{...}, pioneer:{...}, fishing:{...}, defense:{...}, advGate:{...} } as const;
export const LAKE      = { x0, y0, x1, y1 } as const;                 // 水体；沙环=fishing 区减水体
export const SPAWN     = { x, y } as const;
export const ROADS     = [ {id:'northV',dir:'V',x:50,y0:20,y1:34}, ... ] as const;   // ≤5 段，全直线
export const RIVER_SEGS= [ {x0,x1,y0,y1}, ... ] as const;             // 纵向带状
export const BRIDGE    = { x0,x1,y0,y1 } as const;
export const PADS      = [ {id:'plaza',rect:{...}}, {id:'altar',...}, {id:'gate',...} ] as const;  // StonePath
export const DECK_TILES= [ {x:42,y:57},{x:42,y:58} ] as const;
export const LANDMARKS = { bed:{x,y}, barn:{...}, seal:{...}, gate:{...}, dock:{...}, gardener:{...}, gatekeeper:{...} } as const;
export const SIGNS     = [ {tx,ty,text:'↑ 副本·封印'}, ... ] as const;               // ≤4 块
export const COMPASS_POIS = [ {key:'dungeon',label:'副本',tx,ty}, ... ] as const;
export const PLOTS_ORIGIN = { tx, ty, pitch: 4 } as const;
export const HEIGHT_BANDS = [ {kind:'border',h:1}, {kind:'defenseRidge',h:2,rect:{...}} ] as const;
```

### 6-R 架构侧参考骨架（可实施性证明；**坐标归属权在 level-designer，可整体推翻**）
满足 D1-D4 的一个最小形状示例（仅证明约束自洽，非最终方案）：全局 Grass 基底；pioneer 林区 (4,4)-(36,28) 单矩形；湖 (22,58)-(42,71)+2 格沙环；路 4 段——northV(x52,y18→34)、eastH(y40,x52→76)、farmV(x76,y40→56)、southV(x48,y44→56)+dockH(y56,x42→48)；河纵带 x30-34 直贯（1 段+庭院段），单桥 (30-38,40-41)；广场石板 (44,36)-(58,46) 唯一大台；祭坛台/门台 5×5 缩为紧凑方台。出生点视口类型 = Grass+StonePath+Dirt = **3 型** ✓。密度样点、采集 23 点、地标微调由 level-designer 依 6-C/6-D 正式化。

---

## 7. Handoff（跨角色对齐点）

1. **→ level-designer**：§6 的 D1-D4 + 6-C 是硬约束，几何表按 6-S schema 交付；6-R 骨架可推翻但推翻时需给替代论证（尤其 D1 出生点 3 型）。
2. **→ code-reviewer**：§5-A5 的 12 项回归清单即你的验收底稿；上轮 R-A/R-B 用例顺带复跑（预期全绿，V3 不触碰其路径）。
3. **→ game-designer**：C2（layoutVer 重建清空庭院建造）口径确认；距离预算表沿用不动。
4. **→ design-ui-designer**：路牌/POI 随几何迁移后需复检与顶栏/工具坞/右列热区关系（validator v3 已含 ui 规则槽位）。
5. **→ design-image-prompt-engineer**：本轮地面贴图需求 = **0 张必做**；可选 1 张 `ground_dirt.png`（32px、锁调色板，方案 B）待批；若 A6-2 变体获批，是程序化处理现有 7 张 PNG，无新素材。
6. **未覆盖**：V3 几何本体与密度样点表（等 level-designer）；编辑器/真机实测（等几何定稿后 A3/A5 执行）；素材与音频不在本轮范围。
