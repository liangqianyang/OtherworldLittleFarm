# TapTap 小游戏发行笔记

## 已核对的开发要求

- TapTap 的 Cocos Creator 适配插件要求 Creator 3.8.x 或以上；当前项目用 3.8.8。
- 官方插件流程：导入 `tap-minigame-ts.zip`，启用 `taptap-minigame-tools`，通过「微信小游戏」构建目标并勾选转换为 Tap 小游戏。
- 插件导出目录为 `build/TapBuild/game/`，上传包为 `build/TapBuild/game.zip`。
- TapTap 小游戏配置支持 `deviceOrientation: landscape`；本项目按横屏设计。
- 不含内购的小游戏可以不提交版号，但普通小游戏正式上架前仍须完成 TapTap 小游戏前置备案与平台审核。
- 广告变现使用 TapTap 小游戏对应的 Dirichlet/TapADN 流程；Tap 小游戏、H5 小游戏与 TapTap 制造的广告接入文档不可混用。
- 整包大小上限 60MB（官方文档）；本项目自设 ≤30MB（微信口径）更严，继续执行。
- 官方说明当前「暂不支持无网打开」：启动需网络。本地存档与离线推进设计不受影响，但对外文案不得承诺断网可玩。
- 必接能力只有「添加到桌面」，提审前须接入；TapTap 登录/排行榜/好友分享/成就/多人联机/云存档/离线游玩均为可选生态与通用能力，单机首版不接。
- 服务端 API（域名 cloud-miniapp.tapapis.cn）仅 TapTap 登录（jscode2session）与虚拟支付订单查询需要；本项目单机无内购，暂不需要任何服务端。
- game.json 的 deviceOrientation 默认值即 landscape；subPackages 分包配置也写在此文件。

## 备案与软著策略（2026-11-13 拍板）

- 先上 TapTap 小游戏验证效果，软著证书暂缓申请：前置备案表单只要求填写「软件著作权人名称」并与权属材料保持一致，未强制上传证书；个人开发者先以本人名义申报，若审核环节要求补充权属材料，再启动软著申请（个人登记约 1-3 个月）。
- 前置备案是正式上架的硬性前置（工信部要求），与开发并行启动，不要等开发完成：
  - 入口：开发者中心 → 商店 → 小游戏管理 → 小游戏资质 → 「小游戏前置备案」。
  - 三步：填写核准资料 → 电子化核验（负责人微信/支付宝扫码，约 10 分钟）→ 提交审核。
  - 材料：开发者认证、备案用包体（须与实际内容一致）、软件著作权人（填本人）、游戏内容介绍说明（无版号时必传，如实覆盖玩法分类）、小游戏负责人（个人主体必须为本人）、身份核验材料、补充材料（授权书/不涉及前置审批承诺书由系统自动判断是否必传）。
  - 时效：全程预计 20 个工作日；初审 12-16 个工作日后工信部向负责人发短信核验，收到后 24 小时内未完成即自动退回重提——保持手机畅通。
  - 审核通过后获得服务核准号，可继续版本提审与物料提交。

## 每次构建后的固定步骤（2026-11-13 实测）

Cocos Creator 3.8.8 的微信小游戏构建模板**硬编码 `deviceOrientation: "portrait"`**，且 taptap-minigame-tools 转换器只原样继承该字段（无任何横屏开关）。横屏包必须每次构建后、转换前手工补丁：

1. 构建微信小游戏（面板 → 构建，暂不用「运行」——微信开发者工具路径/服务端口未配置时会报「Creator 拒绝了此操作」，不影响构建产物）。
2. ~~手工改 game.json~~ 已自动化：`build-templates/wechatgame/game.json`（landscape）会在每次构建后自动覆盖产物，无需再手工补丁（构建模板机制，2026-11-13 生效；若发现产物仍为 portrait 说明模板未生效，回退手工 sed 补丁）。
3. 菜单 → 扩展 → taptap-minigame-tools → 对 `build/wechatgame` 执行转换 → 产出 `build/TapBuild/game.zip`。
4. 转换完成后抽查 `build/TapBuild/game/game.json` 确认横屏生效；再上传开发者中心真机试玩。

### 开发者中心上传路径（2026-11-13 实测界面）

上传入口是「小游戏管理 → **包体管理**」；游戏发布页的「选择包体」按钮只能从包体管理中**已上传**的包里选取（安卓包默认与 iOS 一致自动同步）。上传后包体管理内直接提供真机试玩二维码，无需将游戏状态改为「开放试玩」。

包体类型二选一：**H5 包体**（H5 直包托管平台域名）vs **TAP 包体**（小游戏引擎打包的 zip，支持 WASM 分包）。本项目走 taptap-minigame-tools 转换链 → **选 TAP 包体**。⚠️ 平台规则：首次上传后包体类型即锁定，发布正式版本后不可更换。

> 项目设计分辨率已配为 1280×720（fitHeight），`settings/v2/packages/project.json`；data Bundle（assets/data）已配置，预览 404 问题已修复。

## 发布前核对

- TapTap 插件已在目标 Creator 版本成功加载，控制台无适配错误。
- 游戏入口、横屏和宽高比适配在 Android、iOS 真机检查通过。
- 登录、存档、离线行为和广告位按本项目实际启用能力测试；本项目单机优先，登录/云存档保持可选。
- 激励广告由玩家主动触发，明确展示奖励说明；仅完整播放后发奖，加载失败或中途退出时游戏仍可继续。
- 备案、内容介绍、软著权属、负责人核验、隐私说明及宣传物料均按后台实际要求提交。
- 再次确认首包/分包大小、格式、版本号和资质状态，以提交时开发者后台要求为准。

## 官方文档

- [小游戏文档指引](https://developer.taptap.cn/minigameapidoc/quick-start/document-guide/)
- [Cocos Creator TapTap 适配](https://developer.taptap.cn/minigameapidoc/dev/engine/Cocos-Laya-Egret/)
- [开发概览（文件结构与包体限制）](https://developer.taptap.cn/minigameapidoc/dev/tutorial/overview/)
- [小游戏配置（game.json）](https://developer.taptap.cn/minigameapidoc/dev/dev-support/config/)
- [TapTap 创建与发布小游戏](https://developer.taptap.cn/minigameapidoc/quick-start/guide/creation-improvement/)
- [TapTap 小游戏前置备案](https://developer.taptap.cn/minigameapidoc/quick-start/guide/pre-filing/)
- [TapTap 小游戏广告与变现](https://developer.taptap.cn/minigameapidoc/quick-start/monetization/IAA-game/)
