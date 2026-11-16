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

Cocos Creator 3.8.8 的微信小游戏构建模板**硬编码 `deviceOrientation`: "portrait"**，且 taptap-minigame-tools 转换器只原样继承该字段。已用 build-templates 覆盖机制解决（见下）。转换插件**没有独立菜单**——它的接入方式是构建面板任务配置里的勾选项「转换为Tap小游戏」（builder hook），构建完成后自动转换并打包：

1. 扩展 → 扩展管理器 → 确认「TapTap小游戏构建工具」已启用（扩展菜单里没有它的独立菜单项，这是正常的——它只往构建面板注入勾选项）。
2. 项目 → 构建发布 → 编辑微信小游戏任务 → ☑ 勾选「**转换为Tap小游戏**」→ 构建。
   ⚠️ **「参与构建的场景」必须勾选全部 4 个场景**（launch / farm / world / adventure）。0.0.3 真机黑屏根因：任务建于 2026-11-13（当时只有 launch+farm），M6 起启动直进 world，包内缺 world 场景 → `GameApp.ts:88 loadScene('world')` 失败 → 停在启动屏黑屏（编辑器预览不走构建清单所以浏览器测不出来）。新建场景后务必回构建任务勾选，构建后抽查 `build/TapBuild/game/assets/main/config.json` 的 `scenes` 字段应含全部场景。
3. 构建完成自动产出 `build/TapBuild/game.zip`（转换器 packGame：`TapBuild/game` 目录 → 同级 `game.zip`）。
4. 抽查 `build/TapBuild/game/game.json` 确认 `deviceOrientation: landscape`（build-templates 生效时应自动就是）；再上传开发者中心真机试玩。

### 开发者中心上传路径（2026-11-13 实测界面）

上传入口是「小游戏管理 → **包体管理**」；游戏发布页的「选择包体」按钮只能从包体管理中**已上传**的包里选取（安卓包默认与 iOS 一致自动同步）。上传后包体管理内直接提供真机试玩二维码，无需将游戏状态改为「开放试玩」。

包体类型二选一：**H5 包体**（H5 直包托管平台域名）vs **TAP 包体**（小游戏引擎打包的 zip，支持 WASM 分包）。本项目走 taptap-minigame-tools 转换链 → **选 TAP 包体**。⚠️ 平台规则：首次上传后包体类型即锁定，发布正式版本后不可更换。

### 首包实传记录（2026-11-13 15:58）

- 开发版本(477323) v0.0.1，**811.2 KB**，包体类型已锁定「引擎小游戏（未发布）」。
- 转换器把横屏落成 `deviceOrientation: "landscapeRight"`——真机横屏以它为准；CC 构建任务里「设备方向=横屏」选项直接控制此值（此前两次构建 portrait 的根因是该选项为竖屏默认值，build-templates 仍留作兜底）。
- 控制台新平台事实：包体大小建议 **20MB 以下**（严于官方文档的 60MB 口径，以此为准做预算）；上传后自动读取「最低支持库版本」（实传读到 2.4.0）；上传页提示包体需正确接入 taplap 登录「以防 TapTap 用户无法正常游玩」——单机无登录包是否影响真机试玩，待本次扫码验证后回写结论。
- 上传后自动跑「包体准入测试」（测试中→出结果）；操作栏「自测」入口提供真机试玩二维码。
- ⚠️ 真机试玩有**自测用户白名单**：直接扫码会提示「当前该账号无测试资格」。须先在包体管理页点「设置自测用户」，把要扫码的 TapTap 账号（按 TapTap 号添加，App 个人主页可查）加入名单后再扫。开发者本人账号也要显式添加。
- ⚠️ **0.0.3 真机黑屏复盘（2026-11-16）**：两个叠加根因——①构建任务场景清单缺 world/adventure（见上，主因）；②TerrainBakeRenderer 直接用 `new Image()`/`document.createElement('canvas')`，小游戏运行时无 DOM。②已修：`_createCanvas/_now` 平台兜底 + 单 chunk 烘焙 try/catch 降级。
- ⚠️ **0.0.3 真机地面灰块复盘（2026-11-16 第二轮真机）**：主因修复后 world 正常加载（河流/角色/NPC 均渲染 ✓），但地面全灰 = 烘焙降级路径触发：手动 `new Image()` + `nativeUrl` 相对路径在小游戏端加载失败（web 预览正常，引擎自身加载同批贴图正常——树可见）。终修：`WorldSpike.srcOf` 直接传引擎已加载的 `ImageAsset.data` 给 `TerrainBakeRenderer.setSources`，弃用手动 URL 加载；降级配色改为分类型地形色（草绿/深林绿/土棕/沙黄/水蓝）。
- ⚠️ **0.0.3 真机地面色块复盘（2026-11-16 第三轮真机）**：第二轮修复后地面变成纯色块（绿/棕）而非贴图 = `ImageAsset.data` 为 null。根因：构建 settings 含 `CLEANUP_IMAGE_CACHE: true`（引擎默认宏），贴图上传 GPU 后对 ImageAsset decRef → 销毁 → `.data` 空；web 预览读取时序早于上传而侥幸可用。终修：`GameApp.start` 最前 `macro.CLEANUP_IMAGE_CACHE = false`（任何贴图加载前设置），像素包 CPU 拷贝内存代价可忽略。**教训链：①别绕过引擎手动加载图像；②引擎图像数据可能被宏清理，启动即关 `CLEANUP_IMAGE_CACHE`。** 真机判定：地面出现草地/泥土像素纹理即修复成功。→ **2026-11-16 第三轮真机已验证通过**：贴图正常渲染（草地/泥路纹理与预览一致），0.0.3 真机包可玩。

- ⚠️ **输入失效双根因复盘（2026-11-16 第四轮，web+真机通杀）**：用户报告「只能加载地图，不能移动/操作」。两个叠加根因——①`WorldSpike` 的 UICamera 误设 `projection=PERSPECTIVE(1)` 且节点在 z=0，透视近裁剪面把 SCREEN_UI 层整体裁掉 → UI 不渲染+触摸 hit-test 全落空（修：`projection=0` ORTHO + `cam2Node.setPosition(0,0,1000)`）；②**CC 3.8.8 运行时不存在 `Node.TOUCH_*` 静态别名**（只有 `Node.EventType.TOUCH_*`），摇杆/工具坞/编辑输入 17 处监听器全部注册到 `undefined` 事件键 → 事件到了节点但处理器永不触发。②是 M1 以来的隐形 bug：TS 类型声明里有这些静态所以编译通过，真实触摸从未工作过（此前所有"验证"都走 dbg API 或 mock）。终修：全量替换为 `Node.EventType.TOUCH_*`（提交 70fdecf）。**验证基线：真实拖拽左半屏玩家位移 ≈ duration×128px/s；点按槽位 `_edit.tool` 翻转。0.0.3 真机包同时带①②两 bug，必须重建 0.0.4+。**

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
