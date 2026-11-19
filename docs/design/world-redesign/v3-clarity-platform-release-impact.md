# V3 地图整洁化重设计 · 平台适配与发布影响评估（v3-clarity）

- **负责成员**：WeChat Mini Program Developer（platform-adaptation & release）
- **产出日期**：2026-11-19
- **任务边界**：只回答「平台侧」——TapTap 构建链路 / 横屏适配与视口密度 / 包体预算 / 真机回归 / 老档兼容 / 备案提审。不重复 V2 几何诊断与 V3 美学方案（那是 level/ui/主策的领地），不重复 `docs/taptap/publishing.md` 与 `docs/release/taptap-filing-and-submission-checklist.md` 已有内容（本文只做 V2→V3 变更的增量影响）。
- **本轮实测说明**：本轮未连真机、未发起构建；全部结论来自代码/配置/构建产物静态核验 + 已回写的四轮真机复盘记录。标注 [未验证] 的项均给出真机验证方法。

---

## 0. 结论先行

1. **构建链路：V3 是零流程变更。** 地图重绘不新增场景、不启分包、不改横屏配置，构建操作序列与 0.0.5 完全一致。唯一流程纪律：改完地图后仍按「每次构建固定核对」走（构建面板确认场景全勾→抽查 `game.json`/`config.json`→du 包体→白名单真机）。
2. **最大的平台侧风险不在构建，在老档兼容（P0 blocker 级）。** 任务书断言「terrainSize 守卫会自动重建基线，老档无碍」——**该断言只在地图尺寸变化时成立**。守卫条件是 `worldSave.terrainSize === MAP_W * MAP_H`（`WorldSpike.ts:73`）。V3 若保持 96×80（任务书允许「可微调但需论证」），则 `7680 === 7680` 恒真，老档会把 V2 地形（含玩家铲子自建路径）**原样读回，永远看不到 V3 整洁化地图**——「整洁化改版」对存量用户完全失效。必须加显式 `terrainLayoutVersion` 字段强制重建（最小修复见 §3-A1）。
3. **每屏密度预算的真实窗口是 20×11.25 格，不是任务书的 24×11。** 相机 orthoHeight=180 → 视口世界 640×360 → 屏上 64px/tile（`WorldSpike.ts:81-85`）。且项目用 FIXED_HEIGHT 适配（`WorldSpike.ts:62`），**高度恒 11.25 格、宽度随屏幕长宽比放大**：16:9=20 格、19.5:9≈24.4 格、20:9=25 格、21:9≈26.3 格（§1 表）。**V3 的「任何视角一屏地面类型 ≤N」预算必须按最宽窗口（21:9，~293 可见格）验算**——中档安卓机（20:9 屏是主流）一屏可见的地面元素比 16:9 多 25%，按 16:9 调好的地图在真机上「眼花缭乱」会复现。
4. **体积完全不是 V3 的约束。** 当前 `build/TapBuild/game.zip` = 1.0MB（1,059,583 B，2026-11-17 构建）vs TapTap 控制台红线 20MB；assets 全目录 1.7MB、贴图仅 552KB/62 张 PNG。即使把 CSDN 教训里最坏情况的 47 张过渡瓦片全加（32px、24 色量化，实测同批素材 1–6KB/张）也只 ~+0.2MB。**「少加瓦片」的正确理由是视觉噪音，不是 KB**——请 image-prompt/level 成员放开按视觉必要性取舍，同时保持 24 色量化纪律。
5. **无 SafeArea 适配是横屏真机的悬置风险。** 全 scripts 目录 grep 无 SafeArea/safeArea 处理；横屏刘海/挖孔/圆角设备上，贴边 HUD（顶部双 HUD、右列 4 钮、底部 6 槽工具坞）可能被裁切。V3 若顺势重排 HUD 应一次性挂 SafeArea；若 V3 不动 HUD，则维持现状并列入已知非阻塞项（与 0.0.x 各轮一样未报障，但从未专门验证过）。
6. **备案与提审材料不受 V3 影响，可继续并行推进。** 备案「游戏内容介绍说明」按玩法分类（种田/钓鱼/副本/塔防循环）撰写，V2→V3 是同一玩法集合内的地图重排，不改变申报内容；前置备案（约 20 个工作日）**不要等 V3 完工**。唯一联动：商店截图等物料应在 V3 上线后重截（旧截图是 V2 杂乱画面，影响商店第一印象）。
7. **附赠发现（横向适配，V2 现状已存在）**：`CameraFollow.ts:17` 硬编码 `halfW=320/halfH=180`，只对 16:9 正确。20:9 设备实际可见半宽=400>320 → 玩家走到地图东西边缘时，**画面右/左侧会露出 ~2.5 格图外区域**（烘焙只覆盖图内，图外是背景色）。[未验证，纯推导] 验证方法见 §2-R4。V3 改版正是一次顺手修掉的机会（2 行改动）。

---

## 1. 证据与位置

| # | 事实 | 数值/内容 | 位置 |
| --- | --- | --- | --- |
| E1 | 地图尺寸与 tile | `MAP_W=96, MAP_H=80, TILE=32`（art px，相机 2× 后屏上 64px） | `assets/scripts/gameplay/world/TerrainData.ts:12-14` |
| E2 | V2 区域冻结矩形 | REGIONS 六区坐标与任务书一致 | `TerrainData.ts:26-35`；LAKE `:38`；SPAWN(50,40) `:40` |
| E3 | 基线生成全量坐标 | 六区+9 段路+湖/沙环+5 段河+桥+3 石板台+码头平台，全部硬编码在 generateBaseline | `TerrainData.ts:80` 起 |
| E4 | **老档守卫只比尺寸** | `if (worldSave?.terrain && worldSave.terrainSize === MAP_W * MAP_H)` → decodeRLE 还原；仅解码失败才回基线 | `WorldSpike.ts:73-77` |
| E5 | 存档写入全量地形 | `saveData.world.terrain = TerrainData.encodeRLE(td); terrainSize = MAP_W*MAP_H`——玩家自建（BUILT_TYPES 铲子路径）随地形数组一起存 | `assets/scripts/app/GameApp.ts:106-108`；BUILT_TYPES `TerrainData.ts:20` |
| E6 | 真实视口窗口 | 相机 orthoHeight=180 → 视口世界 640×360（屏上 64px/tile）；注释明示「Camera 无 zoomFactor 属性，曾静默失效」 | `WorldSpike.ts:81-85` |
| E7 | FIXED_HEIGHT 适配 | `view.setDesignResolutionSize(1280, 720, ResolutionPolicy.FIXED_HEIGHT)`；settings 同口径 | `WorldSpike.ts:62`；`settings/v2/packages/project.json` general.designResolution（publishing.md:57 已核） |
| E8 | 相机钳制硬编码 16:9 | `const halfW = 320, halfH = 180`；钳制式 `Math.max(halfW, Math.min(MAP_W*TILE - halfW, px))` | `assets/scripts/gameplay/world/CameraFollow.ts:17-22` |
| E9 | 每屏可见格数 × 长宽比 | FIXED_HEIGHT 下宽=360×aspect：16:9→640px→20.0 格；18:9→720→22.5；19.5:9→780→24.4；20:9→800→25.0；21:9→840→26.25（高恒 11.25 格） | 由 E6+E7 推导，计算见左 |
| E10 | Tap 链路构建任务场景全勾 | taskMap `1794552978997`（platform=wechatgame）scenes=4 场景；common.scenes 亦 4 场景 | `profiles/v2/packages/builder.json`（本轮 python 解析实测） |
| E11 | openpaas 任务只有 2 场景 | taskMap `1794552979085`（platform=openpaas）scenes=launch/farm——**非 Tap 上传链路**，防误用 | 同上 |
| E12 | 横屏配置双保险 | 构建产物 `deviceOrientation: "landscapeRight"`；兜底模板 `"landscape"` | `build/TapBuild/game/game.json`；`build-templates/wechatgame/game.json:2` |
| E13 | 包体现状 | game.zip = 1,059,583 B（1.0MB，2026-11-17 15:16）；红线 20MB（控制台口径）；assets 1.7MB / textures 552KB / 62 张 PNG | `build/TapBuild/game.zip`；`du` 实测 |
| E14 | 指南针 POI 是 V2 硬编码 | dungeon(50,22)/seal(60,28)/dock(42,56) | `assets/scripts/gameplay/world/CompassHUD.ts:16-19` |
| E15 | 农田 origin 是 V2 硬编码 | `FARM_PLOT_ORIGIN = { tx: 58, ty: 42, pitch: 4 }`；注释明示「index 映射不变=搬迁零数据损失」 | `assets/scripts/gameplay/world/farm/FarmWorldBinder.ts:5-6` |
| E16 | 无 SafeArea 处理 | grep `SafeArea\|safeArea` 全 scripts 零命中 | 本轮实测 |
| E17 | 真机回归清单既有结构 | A 性能闸门/B 功能/C 触屏/D 设备矩阵/E 素材视觉/E+ 设置面板/E++ 触摸/F 非阻塞/G 存档红线 | `docs/testing/device-test-checklist.md` |
| E18 | 备案清单已完备 | 8 项备案材料 + 9 项提审核对 + 风险表，2026-11-18 对照官方文档核验 | `docs/release/taptap-filing-and-submission-checklist.md` |

### 每屏可见格数表（V3 密度预算的验算基准，E9）

| 设备长宽比 | 视口世界 px | 一屏可见格数（宽×高） | 相对 16:9 宽度 |
| --- | --- | --- | --- |
| 4:3（平板） | 480×360 | 15.0 × 11.25 | 75% |
| 16:9（设计基准） | 640×360 | 20.0 × 11.25 | 100% |
| 18:9 | 720×360 | 22.5 × 11.25 | 113% |
| 19.5:9（iPhone X 级） | 780×360 | 24.4 × 11.25 | 122% |
| 20:9（主流安卓） | 800×360 | 25.0 × 11.25 | 125% |
| 21:9 | 840×360 | 26.3 × 11.25 | 131% |

---

## 2. 风险清单（每条：位置 / 触发 / 影响 / 验证；[已复现]/[潜在]/[未验证] 三态标注）

| # | 风险 | 位置 | 触发 | 影响 | 验证/回归方法 | 态势 |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | **V3 保持 96×80 时老档永不重建**——「terrainSize 守卫自动重建」断言失效 | `WorldSpike.ts:73`（E4）；存档写入 `GameApp.ts:106-108`（E5） | V3 不改地图尺寸（或只重排内部区域），存量玩家更新包后继续玩 | 存量用户仍见 V2 杂乱地图；新旧用户看到两套地图；改版目标对老用户落空；若后续在 V3 坐标系上叠加新内容，老档坐标错位 | 最小修复+回归：加 `terrainLayoutVersion` 字段（§3-A1）；回归用例 G-NEW：①装 V2 包造档+自建 2 条铲子路→②装 V3 包续档→③断言地图为 V3 基线、自建路径被重置（如选择保留则断言仅路径保留） | [潜在→条件必然]（V3 不改尺寸即发生） |
| R2 | 密度预算按 24×11 或 16:9 验算失真 | E6/E7/E9 | V3 方案只在 1280×720 编辑器视口/浏览器 16:9 下「看着干净」 | 20:9 主流安卓真机一屏多 25% 可见格，杂乱感复现——用户原样抱怨再来一轮 | 真机矩阵加 20:9/21:9 各一台；V3 验收新增「出生点 + 要道各截一张，数地面类型 ≤ 预算 N」（§3-A4）；桌面上临时把浏览器窗口拉到 21:9 比例先筛一轮 | [潜在] |
| R3 | SafeArea 缺失，贴边 HUD 被刘海/圆角裁切 | E16（全项目）；HUD 位置见 V2 出生点实测（右列 4 钮/底部 6 槽/顶部双 HUD） | 横屏 + 带刘海/挖孔设备（iPhone X 级及多数 2023+ 安卓） | 按钮半遮挡、可点区域进入不可视区；TapTap 审核若抽到此类设备可能标「适配缺陷」 | 真机白名单加一台刘海横屏设备；截图四角；若 V3 动 HUD 则同波挂 SafeArea 组件（§3-A3） | [未验证]（历史各轮真机未报障，但从未专门核验） |
| R4 | **相机钳制按 16:9 硬编码，宽屏地图边缘露图外区** | `CameraFollow.ts:17-22`（E8）：钳到 `MAP_W*TILE-320`，而 20:9 实际半宽 400 | 20:9/21:9 设备 + 玩家走到地图东西边缘（如农田 x84 一带） | 画面右/左缘露出 ~2.5–3 格图外背景（灰/黑带），正落在农田区——与「杂乱/破相」观感叠加 | 推导依据：orthoHeight=180（E6）+ FIXED_HEIGHT（E7）→ 半宽=180×aspect。验证：20:9 真机走到 x≥84 一带向右看右缘。最小修复：halfW 每帧取 `view.getVisibleSize().width/2`（2 行）；回归：同点位右缘无图外带 | [未验证，纯推导]（数学成立，真机未复现） |
| R5 | 过渡瓦片数量失控 → 烘焙源与内存代价 | `TerrainBakeRenderer`（烘焙链路，0.0.3 三轮教训回写于 publishing.md:51-53）；`GameApp.ts:52` 已运行时关 CLEANUP_IMAGE_CACHE | V3 引入过渡瓦片时无清单纪律（47 张式失控） | 每张瓦片都是一份 CPU 侧 ImageAsset 拷贝（宏已关，代价线性增长）；失控清单还会直接造成本轮要治的视觉噪音 | 过渡瓦片白名单制：先出清单表（tile→用于哪两种地面交界），逐项过 ui/level 评审再进 assets；构建后 du game.zip 对照增量 | [潜在]（量级评估：47 张也仅 +0.2MB/内存可忽略，风险在视觉不在性能） |
| R6 | 用错构建任务（openpaas 2 场景任务） | `builder.json` taskMap `1794552979085`（E11） | 构建面板选错任务（openpaas 那条） | 产出缺 world/adventure 的包——0.0.3 黑屏同款事故在另一条链路复现 | 固定用 task `1794552978997`（wechatgame + 转换为Tap）；构建后抽查 `build/TapBuild/game/assets/main/config.json` scenes=4 | [潜在]（流程性，publishing.md §4 已有核对第 3 步兜底） |
| R7 | 提审退回补 TapTap 登录 | 后台上传页提示（checklist §3.7） | 无登录包提审正式版 | 1–2 轮退回补件，各 1–3 日 | 已预留口径与 1 个工作日缓冲（checklist §3.7）；0.0.1–0.0.4 无登录包真机可玩已实证，风险集中在「审核版」口径 | [未验证]（只能以提审回执实证） |
| R8 | 旧截图物料：V2 杂乱画面进商店 | 商店资料 `release/taptap/marketing/`（当前空） | 备案/提审直接用现有截图 | 商店第一印象=用户抱怨的杂乱地图，转化受损 | V3 合入后由真机统一重截（§3-A5）；文案继续维持「不断网可玩」红线（checklist §3.8） | [潜在] |

> 历史已复现项（0.0.3 黑屏/灰块/色块、输入失效双根因）已闭环并回写 `docs/taptap/publishing.md:51-55`，本轮不展开，仅作为回归清单引用源。

---

## 3. 可执行动作与验收标准

### A1 [P0·blocker 最小修复] terrainLayoutVersion 强制重建（R1）

- **改动点（共 3 处，≤15 行）**：
  1. `assets/scripts/core/SaveManager.ts` — `WorldSave`（或 world 段）增加可选字段 `terrainLayoutVersion?: number`；老档缺字段视为 0。
  2. `assets/scripts/gameplay/world/WorldSpike.ts:73` — 守卫改为 `worldSave?.terrain && worldSave.terrainSize === MAP_W * MAP_H && worldSave.terrainLayoutVersion === TERRAIN_LAYOUT_VERSION`，不满足走 `generateBaseline()`（decode 失败回退分支不变）。
  3. `assets/scripts/app/GameApp.ts:106-108` — 存档时写入 `terrainLayoutVersion = TERRAIN_LAYOUT_VERSION`（常量建议放 `TerrainData.ts` 顶部，初值 3 = V3）。
- **取舍需 coordinator 拍板**：重建=玩家自建地形（BUILT_TYPES 铲子路径，E5）一并重置。MVP 单机 + 改版一次性可接受，但建议重建时 `wx`式一次性 toast 告知「世界已随新版本重绘」（或干脆静默，二选一，别做半吊子）。
- **验收标准（回归 G-NEW）**：V2 档→V3 包续档 = V3 地图 + terrainLayoutVersion=3 落盘；V3 档二次启动不重复重建（terrain 内容不变）；坏档（乱码 RLE）仍走解码失败回退不卡死；farm 区 `FarmWorldBinder` origin 若随 V3 搬迁，plots index 映射不变声明仍成立（E15 注释口径）。

### A2 [P0] V3 合入后的发布构建序列（在 checklist §4 基础上 +2 项）

1. 扩展启用确认 → 构建面板 **task 1794552978997**（wechatgame+转换为Tap，勿选 openpaas 任务，R6）→ ☑ 场景全勾 → 构建。
2. 抽查 `build/TapBuild/game/game.json` = `landscapeRight`；`assets/main/config.json` scenes 含 4 场景。
3. `du -h build/TapBuild/game.zip`：预算 ≤1.6MB（现 1.0MB + V3 过渡瓦片/代码增量余量），红线 20MB。
4. 后台上传 → 自测白名单（本人账号显式加入）→ 真机。
5. **新增**：`docs/testing/device-test-checklist.md` 增「H 节·V3 地图整洁度」：出生点截图数地面类型（≤V3 预算 N）；20:9 设备走农田东缘 x84 看右缘无图外带（R4 修复回归）；指南针 3 个 POI 箭头指向与 V3 坐标一致（E14——POI 坐标必须随 V3 同步改，否则箭头指空地）。
6. 按 E17 既有 A/B/C/E/E+/G 节全量回归（G 节存档红线本轮因 R1 必跑）。

### A3 [P1] SafeArea 一次性处理（R3）

- 若 V3 顺带动 HUD：世界层 HUD 根节点挂 Cocos `SafeArea` 组件（UI_2D 层可用），或按 `sys.getSafeAreaRect()` 手动内缩；改动收敛在 HUD 装配处，不进平台适配层。
- 若 V3 不动 HUD：本条降级为已知非阻塞项写入 checklist F 节，提审前真机抽验一次刘海横屏机。
- 验收：刘海横屏真机四角截图，全部可交互元素完整可见可点。

### A4 [P1] 宽屏密度验收口径固化（R2）

- 给 coordinator/level-designer 的硬数字：**V3 的每屏地面类型预算必须在 26.3×11.25 格（21:9）窗口下成立**；16:9 只能当「最小可见集」参考。
- 桌面端低成本预筛：浏览器预览把窗口拖到 840×360 世界等效比例再截图过目，能挡掉大部分返工。

### A5 [P2] 发布与备案节奏

- **备案不等 V3**：8 项材料清单（E18）继续并行，包体一项用当前已传版本即可满足「与实际内容一致」（地图重排不改玩法申报口径）。
- V3 合入 + 真机过 H 节后：统一重截商店物料（R8），再提审下一个未用版本号（≥0.0.6，以后台为准）。
- 「添加到桌面」线上版验证（官方最佳实践）继续挂起待审核通过，与本轮无关但不许忘。

---

## 4. Handoff（与其他成员的交接点）

| 交接对象 | 事项 | 状态 |
| --- | --- | --- |
| → coordinator（拍板） | R1 取舍：老档重建是否保留玩家自建路径 + 是否加一次性提示 | 待拍板，A1 已给最小修复与回归 |
| → engineering-software-architect | A1 三处改动点设计确认（SaveManager 字段落位/WorldSpike 守卫/GameApp 写入）+ `TERRAIN_LAYOUT_VERSION` 常量归属 | 待确认 |
| → engineering-code-reviewer | 回归 G-NEW 用例并入 checklist G 节；R4 修复（CameraFollow halfW 动态化）的边界用例（4:3/16:9/20:9 三档断言） | 待排期 |
| → level-designer / game-designer | 密度预算验算基准=26.3×11.25 格（E9 表）；区域重排若搬迁码头/祭坛/副本门，`CompassHUD.ts:16-19` POI 与 `FarmWorldBinder.ts:6` origin 必须同改（否则指南针指空地/农田悬空） | 数字已交付 |
| → design-ui-designer | SafeArea 现状（E16 无任何处理）+ 贴边 HUD 清单；若 V3 动 HUD 请同步给出 SafeArea 内缩后的安全边距规范 | 事实已交付 |
| → design-image-prompt-engineer | 体积结论：+0.2MB 级的过渡瓦片完全放得下，取舍标准=视觉必要性；纪律=32px 网格 + 24 色量化 + 单张 ≤6KB（现有同批素材实测口径） | 结论已交付 |
| → 全员 | V2→V3 不改玩法申报口径，备案并行不停；商店截图必须等 V3 真机过 H 节后再截 | 流程约定 |
| 缺口（本角色不覆盖） | 备案表单后台实际字段以登录后台当日为准（本轮未登录后台）；「TapTap 登录审核版是否放行无登录包」只能提审实证；R4/SafeArea 真机复现待设备矩阵排期 | 已如实标注 |
