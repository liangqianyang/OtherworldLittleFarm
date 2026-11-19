# V2 世界布局实施 · 代码质量与测试审查报告

- 负责成员：Code Reviewer（engineering-code-reviewer / agent-15）
- 日期：2026-11-18 · 对象：V2 世界布局（96×80，冻结几何）相关实施代码与测试资产
- 性质：设计审查（不改代码）；所有修复建议均为提案，未应用
- 验证方式：52 个 .ts 逐文件审读 + 权威文档比对（world-layout-v2.md / layout-v2-impl-spec.md / publishing.md）+ 无头测试实跑（Node v24.19.0）

---

## 1. 结论

**用户四大需求区在代码与数据层齐备且接线正确**（living/farm/advGate/defense 六区矩形与地标在 `TerrainData.ts:25-37` 与 `WorldLiving.ts` 逐一落位；`validate-layout-v2.py` 当日实跑 ALL PASS，冻结几何未被代码漂移破坏）。**但发现 2 个 blocker 级问题**：①塔防核心回归测试套件 `tools/test-defense-core.mjs` 因 API 漂移**启动即崩、0 断言执行**（防御夜核心当前处于零自动化保护状态）；②impl-spec §8 R2「台阶→铲除 ghost-height」标记为已复现待修，但修复**未落地**（当前因庭院基线全平而不可达，属潜伏数据伤格缺陷）。**推荐**：修好测试套件与 ghost-height 基线快照后再进 0.0.5 真机包，两者工作量均 <1 小时，不触碰冻结几何。

## 2. 证据与位置

### 2.1 四区接线确认（回答团队问题①的代码侧证据）
| 区 | 代码落位 | 状态 |
|---|---|---|
| 居住区 | 床(50,38) `WorldLiving.ts:276-290`→BedtimeDialog；园艺师(46,42)/守门人(54,36) `:293-329`；路牌×4 `:332-366` | ✓ |
| 种田区 | 地块 3×3 origin(58,42) pitch4：`FarmWorldBinder`/`PlotWorldView` 消费 `farm.plots`；谷仓(65,38) 纯装饰 `WorldLiving.ts:111-124`（注释明示） | ✓（卖粮=全局 UI 按钮，非 diegetic——设计层议题，归 game-designer/UI） |
| 冒险区 | 副本门 (50,22) `WorldSpike.ts:388-434`，interactable `dungeon_gate` → `adv.start('old_wood')`；`!adv.inRun` 守卫防重入 | ✓ |
| 布置封印区 | 祭坛 (60,28) `WorldLiving.ts:260-273`→BuildPanel.open；世界层 defense 区无地物（`interactables.json` 23 个物件全在 pioneer），夜战走独立 15×9 板 seal_1（`defense_maps.json`） | ✓ |

### 2.2 当日实跑的测试资产状态（本报告核心增量）
| 资产 | 结果 | 证据 |
|---|---|---|
| `tools/validate-layout-v2.py` | **ALL PASS**（112 行 ✓） | 实跑 2026-11-18 |
| `tools/test-combat-core.mjs` | **17/17 通过** | 实跑 |
| `tools/test_rle.mjs` | 14/14 通过，**但常数过期**：`MAP_W=128, MAP_H=96`（test_rle.mjs:3）≠ 生产 `MAP_W=96, MAP_H=80`（TerrainData.ts:12-13）——按旧 128×96 世界的 12288 格做体积断言，生产已是 7680 格 | 实跑 + 比对 |
| `tools/test-defense-core.mjs` | **崩溃，0 断言执行，exit 1**：`TypeError: core.setMonsterMetaLookup is not a function`（test-defense-core.mjs:19）。DefenseCore 已把怪物元数据从模块全局改为夜战实例注入（`CoreNight.metaLookup` DefenseCore.ts:96，`startCoreNight(..., metaLookup, ...)` :191-197，注释「不挂模块全局」），测试未随改 | 实跑 2026-11-18 |

**未验证项（明说）**：真机存储配额行为（TapStorage.info/flush 为 TODO，TapAdapter.ts:73-80）；`DefenseSystem.startNight` 对存档中非法 `cropId` 塔行的容错（未逐行读该实例化分支）；Tap 容器 localStorage 清缓存语义。以上列入手册/Handoff，未实测。

### 2.3 规格符合性抽查
| 规格条目 | 位置 | 状态 |
|---|---|---|
| §3.3 decodeRLE 辅护栏 `%3!==0 \|\| len>7680*3 → false` | TerrainData.ts:197-213 | **未实现**（spec §8 R9「未验证」如实）；现行为：短流/超长→false→回基线安全；但尾部残 1 字节的流可「成功」返回 true（NaN→run0）——假成功窗口 |
| §8 R2 shovel 还原高度 | TerrainData.ts:47/:149（baseline 仅 types 快照）+ TerrainEdit.ts:105/:115-122（shovel 只改 nt 不还 nh）+ PlayerCharacter.ts:117-125（dh=1 无台阶即拒） | **修复未落地**。潜伏：`TerrainEdit.ts:75-80` stairs 需 Δh=1 邻居，而 living 基线全 h0（h1 边界环与 defense 东缘 h2 均不接 living 34-56/32-48）→ 台阶首放恒被拒 → ghost 格当前不可达；一旦 V2.1 在庭院加高地或放宽台阶规则即转化为**永久卡死玩家的坏档**（高度随 RLE 落盘、undo 栈会话级） |
| §14 ① terrainSize 守卫 | GameApp.ts:106-109（persist 写 terrainSize=7680）+ WorldSpike.ts:72-79（解码前校验，失败回基线） | ✓ 落地；副作用见风险 R4 |
| §14 ② LANDMARKS 单源 | 5 文件字面量（如 WorldLiving.ts:116 `(65+0.5)*32, -(38.5)*32-16`） | 未做，与冻结表一致，漂移风险由 validate 脚本兜底 |
| §5 SAVE_VERSION 常量引用 | GameApp.ts:163 字面量 `3`（值与 SaveManager.ts:6 一致） | 未做，值一致，nit |

### 2.4 做得好的（保持不动）
- `SaveManager.ts:92-105` save() 先写新主档、成功后才把**可解析**旧主档滚入 bak——教科书式双槽写序；load 主档损坏回退 bak（:67-77）。
- `DefenseSystem.settle(:270-297)` 失败=祭坛 −50（`ALTAR_LOST_HP`）+20 金可修复（:363-371），塔与农场全保留、存档不回滚；`lastSettledDay===dayIndex` 拒重打（:140）防刷。**「防守失败不清档」要求在代码层成立**（漏怪 `_devour` 至多吃 1 份作物或 2 金，:232-251）。
- `EventBus.ts:68-72` on() 同 handler+target 防重；emit 逐监听 try/catch 缺陷隔离（:86-97）；`WorldLiving` onLoad 订阅四事件 onDestroy 全部 off（:437-451）——热点路径未发现事件泄漏。触摸全量 `Node.EventType.TOUCH_*`（67 处，0 处遗留 `Node.TOUCH_` 静态别名）。
- `TapAdapter.addToDesktop` settled 守卫 + 10s 超时兜底（:113-138），Promise 不悬挂。
- `resolveMap` 有界步进修死旧非 45° 段死循环（DefenseCore.ts:122-128 注释）；undo 反负库存预检（TerrainEdit.ts:146-150）。

## 3. 风险（位置/触发/影响/验证方法）

| # | 级别 | 位置 | 触发 | 影响 | 验证方法 |
|---|---|---|---|---|---|
| R1 | 🔴 blocker | tools/test-defense-core.mjs:19 | 任何人运行无头回归（发布前固定步骤） | 套件 exit 1，**夜战核心 7 场景零覆盖**；checklist B5「逻辑 24 测」声明失效；DefenseCore 任何回归（如波门控、slowFactor）都无自动防线 | `node --experimental-strip-types tools/test-defense-core.mjs` → TypeError（已复现） |
| R2 | 🔴 blocker（潜伏） | TerrainEdit.ts:115-122 + TerrainData.ts:47/:149 + PlayerCharacter.ts:117-125 | 条件性：庭院基线出现 h1 或台阶规则放宽后，玩家台阶→铲除 | 残留 h1 草/泥格永久不可通行，且随 RLE 落盘、重载仍在、无法自愈 → **坏档卡死** | 当前经正常玩法不可复现（stairs 验证挡住）；复现路径=临时放宽 validate 后造台阶→铲除→`PlayerCharacter` 走入被拒。修复后按 TC-EDIT-01 回归 |
| R3 | 🟡 | tools/test_rle.mjs:3 常数 128×96 | 每次跑 RLE 测试 | 测的是算法副本而非生产尺寸；体积断言基于 12288 格（方向保守无害，但结论与注释误导后续维护） | 实跑通过但与 TerrainData.ts:12-13 比对即证 |
| R4 | 🟡 条件性 | WorldSpike.ts:72-79 严格 terrainSize 校验 | 存在「96×80 但早于 terrainSize 字段上线」的中间版本真机档 | 该档 terrain 可解码但被守卫拒收 → **玩家建造一次性静默重置**为基线 | 导出真机存档 JSON 查 `world.terrainSize` 键是否存在；当前测试者仅 1 人，影响面可控 |
| R5 | 🟡 | TerrainData.ts:197-213 缺 §3.3 护栏 | 存档 terrain 串被截断且尾部恰多 1 字节 | decode「成功」返回 true 但内容未校验完整性；与 spec 偏离（R9） | 修复后跑 TC-RLE-01 |
| R6 | 🟡 经济 | TerrainEdit.ts:163-176 `floor(cost×0.5)` + terrain_ops.json:2-3 | 铲石板/木平台 | pave_stone（1石+1金）、pave_deck（1木）返还**四舍五入为 0**，与代码注释「返还 50%（与 UI 文案一致）」矛盾 → 玩家感知失信 | 造 1 格石板→铲除→背包无变化（可 dbg 复现）；数值方向需 game-designer 拍板 |
| R7 | 🟡 边界 | DefenseSystem.startNight 塔实例化（seal.towers←存档） | 存档含已下架 cropId 的塔行 | 若无 null 行过滤，夜战开局可能空引用崩溃（**未逐行验证**，列为待查） | 人工构造 seal.towers=[{cropId:'legacy'}] 档→触发夜战 |
| R8 | 💭 | SaveManager._migrate 未 clamp seal.altarHp/tower 数值 | 手改/损坏档 altarHp=-5 或 9999 | 异常祭坛血量入夜战（0/负→必败、9999→perfect 判据畸变）；可 20 金修复自愈 | TC-DEF-05 |
| R9 | 💭 | DungeonOverlay.ts:482 `n.off(TOUCH_END)` 无 handler 参数 | 该节点日后新增其他 TOUCH_END 监听 | 被整类静默摘除 | 代码评审即可见；现无实际冲突 |
| R10 | 💭 | interactables.json:14 pioneer_rock_01@(40,32) 落在 living 矩形(34-56/32-48)内 | 岩石存活期（respawn 5 天循环） | 庭院西北角 1 格不可建造+阻挡 | 坐标比对；是否保留由 level-designer 定 |

## 4. 行动与验收（优先级排序；均不动冻结几何）

| 优先级 | 行动 | 改动位置 | 验收标准 |
|---|---|---|---|
| P0-1 | 修 test-defense-core：删 `setMonsterMetaLookup` 全局注册，改把 `(mid)=>meta[mid]??null` 作为第 3 参传入全部 7 处 `startCoreNight(...)` | tools/test-defense-core.mjs:19 及各 startCoreNight 调用 | 套件 exit 0、≥24 断言全绿（当日 0 断言 → 修复后为发布硬闸门） |
| P0-2 | R2 修复：generateBaseline 增 `baselineHeights: Uint8Array` 快照（TerrainData.ts:47/:149 各加一行），shovel 分支 `nh = baselineHeights[i]`（TerrainEdit.ts:115-122 一行） | TerrainData.ts / TerrainEdit.ts | TC-EDIT-01 复现→修复→回归通过；`terrainDump` 断言 living 区无 h≠基线 格 |
| P1-1 | decodeRLE 补 §3.3 护栏（函数头 2 行），同步镜像进 test_rle.mjs 副本 | TerrainData.ts:197-213、tools/test_rle.mjs | TC-RLE-01（%3≠0 与超长流→false→回基线） |
| P1-2 | test_rle.mjs 常数改 `MAP_W=96, MAP_H=80`，重算最坏体积断言（7680 格） | tools/test_rle.mjs:3 | 14/14 仍绿且日志显示 7680 格 |
| P1-3 | R7 查证 + 防御性过滤：startNight 实例化塔前 `crops 行缺失则跳过该塔`（若已如此，仅在测试表标记已验证） | DefenseSystem.ts | TC-DEF-04 通过 |
| P2-1 | R6 返还语义：与 game-designer 二选一（`Math.max(1,floor)` 或调 cost 表为 2 起步），改后同步 UI 文案 | TerrainEdit.ts:174 或 terrain_ops.json | 铲石板返还 ≥1；文档与文案一致 |
| P2-2 | _migrate clamp：`altarHp∈[0,100]`、tower lv≥1、cropId 在 crops 表内才保留 | SaveManager.ts:117-131 | TC-DEF-05 通过 |
| P2-3 | GameApp._newGame 版本改引用 `SAVE_VERSION`（一行） | GameApp.ts:163 | grep 无第二处字面量 3 |
| P3 | DungeonOverlay:482 改带 handler 的 off；TapStorage.info/flush 在拿到真机配额事实后回写 publishing.md | 对应文件 | 代码评审记录 |

## 5. Handoff（与其他成员对齐点）

1. **→ game-designer**：R6 铲除返还 0 的经济口径（二选一方案待拍板）；谷仓纯装饰/卖粮走全局按钮的 diegetic 程度是设计议题，代码层已如实实现，勿要求代码先行。
2. **→ level-designer**：R10 岩石 (40,32) 占庭院可建造格，确认去留；若 V2.1 计划在 living 加高地/台阶玩法，**必须先修 R2 再动基线**（ghost-height 由潜伏转现实）。
3. **→ engineering-software-architect**：P0-2 涉及 TerrainData 快照结构（baselineHeights），属核心层小改，请确认不触发 terrainSize 语义变化（仍是格数守卫，快照不落盘）；LANDMARKS 单源仍未做，5 处字面量靠 validate 脚本兜底。
4. **→ wechat-dev**：Tap 容器 storage 配额/清缓存语义未验证（TapAdapter.ts:73-80 TODO），提审前需真机实测回写 publishing.md；R4 中间版本档仅在你掌握的真机历史包存在，需导出一份存档 JSON 确认 `terrainSize` 键。
5. **→ UI designer**：若工具坞铲除文案含「返还 50%」，与 R6 结论联动改文案。
6. **未覆盖范围（明说）**：本审查未跑真机、未逐行审 52 文件中的纯 UI 面板（Codex/Backpack/Codex 面板类）、未审 dungeon/CombatLogic 数值平衡（仅跑通其 17 项单测）；浏览器 E2E 断言链归 testing 资产所有者。
