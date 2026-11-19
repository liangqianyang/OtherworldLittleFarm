# V2 核心系统边界测试用例表

- 负责成员：Code Reviewer（engineering-code-reviewer / agent-15）
- 日期：2026-11-18 · 上游：docs/testing/world-v2-code-review.md（R1-R10 风险编号对应）
- 用例编号规则：TC-<域>-<序号>；域 = SAVE 存档 / FARM 跨天作物 / DEF 防守失败与夜战 / EDIT 地形改造 / RLE 地形序列化
- 执行环境约定：
  - **headless**：`node --experimental-strip-types tools/<脚本>`（combat-core 17 项现绿；defense-core 现红 R1，修复后执行）
  - **dbg**：浏览器预览 DEBUG 钩子（window.__spike：dbgDay/dbgGive/dbgFarm/dbgTool/dbgEdit/dbgUndo/terrainDump/spikeInfo）
  - **web**：浏览器 devtools 手工（改 localStorage 等）
  - **真机**：docs/testing/device-test-checklist.md G 节（存档红线 4 条为发布闸门）
- 数值与 catalogs 对齐：作物表 crops.json（carrot growDays2 / tomato 3 / pumpkin 5 / moonflower 7 且 seasons=[autumn,winter]）、波表 defense_waves.json（d4/d10/d20 三表 everyDays=4）、地形操作表 terrain_ops.json（pave_stone 1石+1金 / pave_deck 1木 / build_bridge 3木+10金 / build_stairs 2石）、TimeSystem（12h/离线天，封顶 2 天，14 天/季）

## SAVE —— 存档损坏恢复与版本边界

| ID | 优先级 | 前置 | 步骤 | 期望 | 验证方式 | 对应风险 |
|---|---|---|---|---|---|---|
| TC-SAVE-01 | P0 | 正常档已落盘（至少睡过 1 天） | ① web：把 localStorage 主档 value 改为 `'{bad json'`；② 刷新重进 | load 回退 bak，天数/背包/农场与损坏前一致；再次 persist 后主档恢复可用，bak 保留 | web | R1 族（存档红线真机版见 G-1） |
| TC-SAVE-02 | P0 | 主档与 bak **同时**损坏（两个 key 均写坏） | web 改坏两档后刷新 | 走 `_newGame`：第 1 天、carrot_seed×5、基线地形；无异常弹错 | web | — |
| TC-SAVE-03 | P0 | 任意档 | web 把 `world.terrainSize` 改为 999（≠7680） | 重进 world：地形=基线（河/湖/桥/石板齐），terrainDump 正常；玩家建造过的石板**不保留**（守卫语义如此，属预期取舍） | dbg+web | §7 迁移守卫回归 |
| TC-SAVE-04 | P1 | 真机装过「96×80 但无 terrainSize 字段」的中间包 | 导出存档 JSON 检查 `world` 键集合 | 确认是否存在该形态档；若有 → 该机建造会被一次性重置（记录事实，不阻塞发布） | 真机+文件导出 | R4 |
| TC-SAVE-05 | P2 | 构造档：`seal.altarHp=-5`、`seal.altarHp=9999` 各一 | 重进→睡觉触发夜战 | 修复前：血量异常直接进战斗（0/负=必败、9999=perfect 判据畸变）；落地 clamp 后：入夜前归一到 [0,100] | dbg（修 P2-2 后） | R8 |
| TC-SAVE-06 | P1 | 构造档：`dayIndex=NaN`、`inventory="abc"`、`savedRealTimeMs=Infinity` | 重进 | _migrate 兜底：dayIndex=1、inventory={}、时间戳按无离线处理；不抛异常 | web | 既有防线回归 |

## FARM —— 跨天作物状态

| ID | 优先级 | 前置 | 步骤 | 期望 | 验证方式 | 对应风险 |
|---|---|---|---|---|---|---|
| TC-FARM-01 | P0 | 种 carrot（growDays2）并浇水 | dbgDay(1) 一次 | growth 0→1，贴图 carrot_1；dbgDay(1) 再一次 | growth→2 可收；wateredOnDay 不再匹配（第三天不再长） | dbg |
| TC-FARM-02 | P0 | 种 carrot **不浇水** | dbgDay(1) | growth 不变（`wateredOnDay===dayIndex-1` 才 +1） | dbg | — |
| TC-FARM-03 | P0 | 浇水后立即关页 | 改系统时间 +13h 重进（离线 1 天） | settleOffline days=1；growOffline +1；**无双计**（dayAdvanced 只 emit 一次，wateredOnDay 按日匹配不命中） | 真机（G-3 同法）+web | B10 深化 |
| TC-FARM-04 | P1 | 浇水后离线 +37h | 重进 | days=2 封顶（OFFLINE_MAX_DAYS）；growth +2 不枯；倒流（-任意）=0 天不负 | 真机 | B10 |
| TC-FARM-05 | P1 | 春/夏（day≤28）种 moonflower（seasons=autumn/winter） | 点种植 | 拒绝「非当季」；day≥29（冬）或秋季窗内可种；day 43 起（春）再拒 | dbg+web | 季节轮转公式 `floor((day-1)/14)%4` |
| TC-FARM-06 | P2 | tomato（growDays3，stages [0,1,3]） | 浇水→跨 3 天 | day1 帧→day3 成熟帧与 stages 表一致；harvest 随机 1-2 入包并清格 | dbg+web | 图鉴链 B2 已验 |

## DEF —— 防守失败不清档与夜战边界

| ID | 优先级 | 前置 | 步骤 | 期望 | 验证方式 | 对应风险 |
|---|---|---|---|---|---|---|
| TC-DEF-01 | P0（发布闸门） | day≥4 前夜，**不放塔**（或全放角落保证漏怪） | 睡觉→夜战跑完失败结算 | ①存档 version 仍 3；②farm.plots 9 格原样；③inventory 不清空（至多 −1 份非种子作物或 −2 金，`_devour` 上限）；④seal.altarHp=50、towers 保留、lastSettledDay=当日；⑤20 金可修复祭坛回满 | dbg（造败局）+真机 G-2 | **防守失败不清档**主用例 |
| TC-DEF-02 | P1 | TC-DEF-01 失败后同一天 | 再点祭坛→布置→再睡 | startNight 被拒（`lastSettledDay===dayIndex`），不重复夜战不重复扣 | dbg | — |
| TC-DEF-03 | P1 | day3 存档离线 +25h（跳过 d4 防守日） | 重进→看情报行 | d4 夜**静默顺延不判失守**（离线绝不判负）；hasNightTonight(d5)=false，下次=d8 | 真机+dbg | B10/B12 |
| TC-DEF-04 | P1 | 构造档：`seal.towers=[{cropId:'legacy_crop',cx:3,cy:4,lv:1}]` | day 达标夜触发 startNight | 目标行为：跳过无法解析的塔行不崩溃（**当前未验证，若崩溃即为 R7 实锤，修复=实例化前过滤**） | dbg+web | R7 |
| TC-DEF-05 | P2 | 无头跑 defense-core 修复版（P0-1 后） | 7 场景全量（裸奔失守/霜铃减速/精英半抗/蜜瓜诱饵/豆荚炮 DPS/四波门控/祭坛打穿即终局） | ≥24 断言全绿 exit 0 | headless | R1 |
| TC-DEF-06 | P1 | 波表边界：everyDays=0 的假想行 | nextNightDay 计算 | `Math.max(1,..)` 防死循环（既有防线）；_pickTableRow 多表命中取 firstDay 大者（d20 起 spore_3 压 pack_2） | headless（可加用例） | — |

## EDIT —— 地形改造边界

| ID | 优先级 | 前置 | 步骤 | 期望 | 验证方式 | 对应风险 |
|---|---|---|---|---|---|---|
| TC-EDIT-01 | P0 | R2 修复落地后 | ①在 Δh=1 邻界造台阶（需临时测试基线含 h1）；②铲除台阶 | 修复前：格=基线类型但 h 残留 1、相邻 h0 格永久不可走（复现）；修复后：h=baselineHeights、可走；`terrainDump` 断言 living 无异常高度 | dbg + headless（TerrainEdit 转译副本） | **R2** |
| TC-EDIT-02 | P1 | 庭院基线全 h0 | 直接选台阶工具任意空地 | 被拒「需在 1 层落差边界」（当前防 R2 的关键闸门，勿放宽） | dbg | R2 前置 |
| TC-EDIT-03 | P1 | 石板×1 | 铲除 | **现行为：返还 0（floor(1×0.5)）**；P2-1 拍板后：返还 ≥1 且与 UI 文案一致；桥（3木10金）→1木5金、台阶（2石）→1石 不变 | dbg | R6 |
| TC-EDIT-04 | P1 | 造 21 笔操作 | 连续 undo 21 次 | 前 20 次成功、第 21 次拒绝（栈深 20）；undo 拆除需收回返还材料，材料已花则拒绝不产生负库存 | dbg | — |
| TC-EDIT-05 | P2 | 在 living 区外（如 farm 区）选任何工具 | 点地块 | 全部被拒「只能在庭院区改造」；水面 paver 需陆邻、hammer 需岸/桥邻 | dbg | — |

## RLE —— 地形序列化

| ID | 优先级 | 前置 | 步骤 | 期望 | 验证方式 | 对应风险 |
|---|---|---|---|---|---|---|
| TC-RLE-01 | P1 | 护栏落地后（P1-1） | ①构造长度 %3==1 的流；②构造 >7680*3 字节的流；③非法 base64；④空串 | 四者 decode 均 false → WorldSpike 回基线；现行为③④已 false，①②待护栏 | headless（test_rle.mjs 同步用例） | R5 |
| TC-RLE-02 | P1 | 常数修正后（P1-2） | 跑全套 RLE 用例 | 7680 格口径下 14/14 绿；最坏体积 <64KB 断言仍成立 | headless | R3 |
| TC-RLE-03 | P0（回归） | 真实存档 | 铺石/造桥/台阶各 1 → 睡觉落盘 → 刷新重进 | 三处地形与高度逐格一致（encode→decode 回环，含 `((type<<4)|height)` 高度位） | dbg+真机（G-4） | — |

---

### 执行顺序建议（发布前）
1. P0-1 修 defense-core → TC-DEF-05 全绿（当前红，**硬闸门**）
2. P0-2 修 ghost-height → TC-EDIT-01/02
3. TC-SAVE-01/02/03 + TC-FARM-01/02/03 + TC-DEF-01（三大核心域主用例）
4. P1 组 → 真机 G 节四条存档红线
5. 其余 P2 随版本迭代
