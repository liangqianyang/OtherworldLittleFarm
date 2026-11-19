# TapTap 备案与提审材料清单（平台适配与发布）

- **负责成员**：WeChat Mini Program Developer（platform-adaptation & release）
- **产出日期**：2026-11-18（官方要求已对照 developer.taptap.cn 当日线上文档核验）
- **上游权威**：`docs/taptap/publishing.md`（构建链路运维日志，本文不重复其内容，只做发布清单与核对）
- **官方来源**（本次核验链接）：
  - [小游戏前置备案](https://developer.taptap.cn/minigameapidoc/quick-start/guide/pre-filing/)
  - [创建小游戏（资质/包体/版本号）](https://developer.taptap.cn/minigameapidoc/quick-start/guide/creation-improvement/)
  - [开发概览（包体限制/无网说明）](https://developer.taptap.cn/minigameapidoc/dev/tutorial/overview/)
  - [桌面文件夹（必接能力 API 与最佳实践）](https://developer.taptap.cn/minigameapidoc/dev/tutorial/open-capabilities/desktop-folder/)
  - [小游戏配置 game.json](https://developer.taptap.cn/minigameapidoc/dev/dev-support/config/)

---

## 1. 平台适配现状基线（2026-11-18 实测核验）

| 项 | 状态 | 证据位置 | 验证方法 |
| --- | --- | --- | --- |
| 构建链路 taptap-minigame-tools | ✅ 已装已用 | `extensions/taptap-minigame-tools/`；构建任务 `profiles/v2/packages/builder.json` taskMap `1794552978997`（wechatgame，2026-11-16 19:54 success） | 构建面板确认勾选「转换为Tap小游戏」后构建，产出 `build/TapBuild/game.zip` |
| 横屏配置 | ✅ landscapeRight 生效 | `build/TapBuild/game/game.json` → `deviceOrientation: "landscapeRight"`；兜底 `build-templates/wechatgame/game.json` → `"landscape"` | 每次构建后抽查该文件（publishing.md §每次构建后的固定步骤 第4步） |
| 设计分辨率 | ✅ 1280×720 fitHeight | `settings/v2/packages/project.json` general.designResolution | 构建任务不覆盖该项；真机横屏四角无黑边即过 |
| 场景清单（0.0.3 黑屏教训） | ✅ 4 场景全勾 | builder.json options.scenes = farm/launch/adventure/world；`build/TapBuild/game/assets/main/config.json` scenes 字段四场景齐 | 每次新增场景后：构建面板回勾 + 构建后抽查 config.json |
| 首包体积 | ✅ 1.0MB（2026-11-17 15:16 构建） | `build/TapBuild/game.zip` = 1,059,583 B；明细：cocos-js 2.6MB / assets 1.3MB（未压缩口径） | 每次构建 `du -h build/TapBuild/game.zip`；红线 20MB（控制台口径）严于文档 60MB |
| 分包 | 未启用（当前不需要） | `game.json` 无 subPackages 字段；包体远低于红线 | 单包 ≤20MB 前不引入；超线再按 game.json `subPackages` 配置 |
| 必接能力「添加到桌面」 | ✅ 已接入（待线上版验证） | `assets/scripts/platform/taptap/TapAdapter.ts:109-150`（查询→创建、错误码 1518002/1518003 映射、10s 超时守卫）；UI 入口 `SettingsPanel` ⚙；能力探测 `canAddToDesktop()` 不支持平台隐藏 | ⚠️ 后台扫码自测测不了（官方最佳实践明示）；须审核通过后在 Tap 线上版实测 |
| 平台边界铁律 | ✅ 无违规 | `tap.*` 仅存在于 `assets/scripts/platform/taptap/TapAdapter.ts`；`GameApp.ts:157` 仅做 detect+选择（组合根，合规）；grep 全 scripts 目录核实 | `grep -rn "tap\." assets/scripts --include="*.ts"`（排除 platform/ 目录与注释） |
| CLEANUP_IMAGE_CACHE | ✅ 运行时关闭 | `assets/scripts/app/GameApp.ts:52` `macro.CLEANUP_IMAGE_CACHE = false`（0.0.3 灰块修复）；注意构建任务 macroConfig 仍为 "on"，靠运行时覆盖 | 回归：`docs/testing/device-test-checklist.md` E 节 13 项素材视觉（色块=失败） |
| 服务端依赖 | ✅ 零依赖 | 单机无内购：无需 TapTap 登录 jscode2session、无需虚拟支付查询（cloud-miniapp.tapapis.cn 不需要） | 提审材料如实申报「无内购、单机」 |

## 2. 前置备案材料清单（工信部硬性前置，与开发并行启动）

入口：开发者中心 → 商店 → 小游戏管理 → 小游戏资质 → 「小游戏前置备案」→ 提交核准信息。
三步：填写核准资料 → 电子化核验（负责人微信/支付宝扫码，约10分钟）→ 提交审核。
时效：全程约 20 个工作日；初审 12-16 个工作日后工信部发短信核验，**24 小时内未响应自动退回重提**。

| # | 材料 | 本项目落位（个人主体） | 状态 |
| --- | --- | --- | --- |
| 1 | 开发者认证 | 完成个人实名认证，确认在有效期内 | ☐ 待确认后台状态 |
| 2 | 小游戏包体 | 选与实际上线内容一致的包体（建议用当前 `build/TapBuild/game.zip` 对应的上传包） | ☐ 备案前先传一版包体 |
| 3 | 软件著作权人 | 填本人姓名；未强制上传证书，若审核要求补充权属材料再启动软著申请（个人登记约1-3个月）——**2026-11-13 拍板策略** | ☐ |
| 4 | 游戏内容介绍说明 | **无版号必传**：文档说明功能、内容分类、核心玩法（种田/钓鱼/副本/塔防循环），如实覆盖 | ☐ 待撰写（可由 docs/design 玩法概述改写） |
| 5 | 小游戏负责人基本情况 | 个人主体必须本人：姓名/证件/有效期/手机号/邮箱/应急电话；**保持手机畅通** | ☐ |
| 6 | 身份信息核验 | 运营负责人身份材料 + 主体证明，图片清晰完整有效 | ☐ |
| 7 | 补充材料（授权书/不涉及前置审批承诺书） | 系统按主体/地区/申报内容自动判断是否必传，按页面提示与模板提交 | ☐ 系统判断 |
| 8 | 审核通过产出 | 服务核准号（继续版本提审的前置） | — |

> 策略依据：无内购小游戏**不提交版号**，但正式上架前必须完成前置备案（官方资质表原文确认）。

## 3. 版本提审与上架材料清单

| # | 事项 | 要求（官方原文核验） | 本项目动作 | 验证方式 |
| --- | --- | --- | --- | --- |
| 1 | 包体类型 | 上传后锁定，正式发布后不可更换；本项目走转换链选 **TAP 包体** | ✅ 0.0.1 已锁定「引擎小游戏（未发布）」 | 后台包体管理查看 |
| 2 | 版本号 | 格式 `V x.y.z`、整数三段、必须高于旧版、全局唯一（不得与已上线/审核中重复） | 每次提审递增（当前线上 0.0.1→已传至 0.0.3/0.0.4+，提审用下一个未用号） | 后台包体管理提交时填写 |
| 3 | 防沉迷 | 仅小游戏游玩方式 → **平台默认开启，开发者无需操作**（如未来加 APK 包则必须自建或走 TapPlay） | 无动作，材料如实申报仅小游戏 | 后台小游戏资质页显示状态 |
| 4 | 小游戏资质 | 「正式上线（试玩版）」发布前必须通过：前置备案 + 防沉迷（平台侧） | 备案通过后再提审正式版 | 小游戏资质页全绿 |
| 5 | 商店资料/物料 | 基础信息过审规范 + [游戏物料要求](https://developer.taptap.cn/docs/store/release/publish/material/)（icon/截图/视频尺寸格式） | 落盘到 `release/taptap/marketing/`（当前空，待 UI/素材成员产出） | 后台商店资料提交过审 |
| 6 | 发布状态 | 敬请期待 / 预约 / 正式上线（试玩版）三态；新游戏建议开「预约」；首次定时上线需设在 6 小时后；新版本资料审核 1-3 日、更新 1 日 | 首版建议「预约」态聚量，试玩验证后再转正式 | 后台发布设置 |
| 7 | 登录接入提示 | 上传页提示「需正确接入 TapTap 登录以防用户无法正常游玩」——单机无登录包 0.0.1-0.0.4 **真机自测已可玩**（实证）；⚠️ 审核版本是否放行无登录包未实证，提审时如被退回按后台指引补 TapTap 登录（可选生态，接了也不阻断单机） | 提审前预留 1 个工作日缓冲处理可能的登录补件 | 提审结果回执 |
| 8 | 无网说明 | 官方明示「暂不支持无网打开」 | 对外文案**不得承诺断网可玩**（商店介绍文案自查） | 物料文案 review |
| 9 | 广告/内购 | 首版无广告无内购（MVP 边界）；Dirichlet/TapADN 文档不可与 Tap 小游戏混用 | 无动作 | — |

## 4. 每次构建固定核对（摘要，操作细节见 publishing.md §每次构建后的固定步骤）

1. 扩展管理器确认「TapTap小游戏构建工具」启用（无独立菜单属正常）。
2. 构建面板：微信小游戏任务 → ☑「转换为Tap小游戏」→ ☑ 场景全勾 → 构建。
3. 抽查 `build/TapBuild/game/game.json` = `landscapeRight`；`assets/main/config.json` scenes 含全部场景。
4. 按 `docs/testing/device-test-checklist.md` A/B/C/E/E+ 回归。
5. 上传后台包体管理 → 设自测用户白名单 → 扫码真机（⚠️ 本人账号也要显式加入白名单）。

## 5. 已知风险与回归用例

| 风险 | 位置 | 触发 | 影响 | 验证/回归 |
| --- | --- | --- | --- | --- |
| 新场景忘回勾构建任务 | `profiles/v2/packages/builder.json` options.scenes | 新增 .scene 后直接构建 | 0.0.3 同款黑屏（包内缺场景） | 构建后抽查 config.json scenes 字段 |
| CLEANUP_IMAGE_CACHE 构建宏仍 on | GameApp.ts:52 运行时覆盖 | 未来重构把覆盖移到首次贴图加载之后、或新入口绕过 GameApp | 0.0.3 灰块/色块回归 | checklist E 节素材视觉 13 项 |
| 「添加到桌面」真机不可自测 | TapAdapter.ts / SettingsPanel | 依赖扫码自测验证该行 | 线上才发现能力异常 | 审核通过后在 Tap 线上版实测（官方最佳实践第 1-4 步） |
| TapStorage.info() 空实现 | TapAdapter.ts:73-76（阶段5 TODO） | 存档体积增长或配额耗尽 | 无法主动降级清理，仅靠 set() 返回 false 走 SaveManager 降级 | 写入超限用例：构造 >1MB 存档写失败路径 |
| 「必接能力仅添加到桌面」口径 | publishing.md:13（控制台口径） | 平台政策更新 | 提审被退回补件 | 提审时以后台实际校验项为准 |
| 音频预算未占用 | `assets/audio/` 目前仅 .gitkeep（16K） | BGM/SFX 批量接入 | 1.0MB→20MB 余量极大但仍需预算纪律：单文件 ≤200KB、总量 ≤4MB 建议值 | 构建后 du 检查 game.zip |

## 6. 与其他成员的交接点

- **game-audio-engineer**：音频预算建议值见上表；音频文件需走引擎 Bundle 打包，不要外链 CDN（首版无远端资源服务器）。
- **design-ui-designer / design-image-prompt-engineer**：商店物料（icon/截图/介绍图）产出落 `release/taptap/marketing/`，尺寸格式以官方物料要求页为准；介绍文案不得出现「离线可玩」「断网可玩」表述。
- **engineering-software-architect**：TapStorage.info()/flush() 的阶段5实现排期；若未来加云存档，走 TapTap 可选生态，不阻断单机。
- **level/design 全员**：新增场景（如节日地图扩包）时必须回构建任务勾选——此为流程约束，非代码约束。
