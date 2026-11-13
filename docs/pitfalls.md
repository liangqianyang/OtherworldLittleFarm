# 踩坑记录（Pitfalls）

> 每条 = 症状 → 根因 → 解法。新坑往里加，别删旧的（过时的标 ⚠️ 已过时+日期）。
> 创建：2026-11-13（阶段 0-2.3 期间集中踩坑，全记录）

## Cocos Creator 引擎

### 1. 程序化 new Node() 不可见【已踩 3 次，最贵的坑】
- **症状**：界面元素"看不到字/看不到按钮"，但布局占位在、点击热区可能在。
- **根因**：`new Node()` 默认 DEFAULT 层，UI 相机只渲染 UI_2D 层 → 节点存在但相机不渲染。
- **解法**：所有程序化建节点必须显式 `node.layer = 父节点.layer`；静态 UI 工具函数把 layer 作为参数强制传入（容器和子节点 Label/按钮都要设）。
- **案例**：FarmGrid 地块全隐身 / BedtimeDialog 弹窗有框没字（commit 19b88ec、67e9f34）。

### 2. 编辑器场景进程的编译错误在 MCP 控制台看不到
- **症状**：脚本语法错误 → 预览全黑（连 logo 都没有）；`debug_debug_console` 仍返回 0 条错误。
- **根因**：MCP 的 console 工具读的是浏览器预览进程；场景/编辑器进程的模块加载错误走编辑器日志。
- **解法**：真源是 `temp/logs/project.log`——`grep "Unexpected token"` 或 `_handleImportException`。黑屏先查日志再怀疑代码逻辑。
- **案例**：FarmHUD 多余大括号 `}` 整包 SyntaxError（commit cb82be4）。

### 3. MCP scene_management save_as 有副作用 ⚠️ 禁用
- **症状**：调用后只打开「另存为」对话框、当前场景被切成未保存副本（get_current 变无名 scene），assets/ 根还可能多出垃圾 scene.scene。
- **解法**：场景保存一律 `action=save`（写回原文件）；版本备份交给 git，不用 save_as。

### 4. set_component_property 设组件引用字段的传值方式
- **症状**：设 `cc.Canvas.cameraComponent` 传组件 uuid 报「Target node not found」。
- **解法**：propertyType='component' 时 **value 传节点 uuid**（setter 自动找节点上同类型组件）。

### 5. 外部改 settings/ 运行中编辑器不热加载
- **症状**：手写 `settings/v2/packages/project.json`（如 designResolution）后 `preferences_query` 搜不到。
- **解法**：需重启编辑器生效；非阻塞，攒着重启一次搞定。

### 6. MCP refresh 后删 .meta 的良性报错
- **症状**：`"catalogs.meta is not exist! will use cache meta"` error 刷屏。
- **根因**：删了 .gitkeep+对应 .meta，编辑器自动重建 meta 时的时序日志。
- **解法**：良性，可忽略；确认真错误用第 2 条的日志 grep。

### 7. iframe 预览页键盘焦点
- **症状**：点过预览工具栏（Rotate/设备下拉）后按数字键无反应。
- **根因**：游戏 canvas 在 iframe 里，焦点在工具栏上，键盘事件被吃。
- **解法**：先点一下游戏画面再按键盘。**根治**：触屏按钮优先于键盘快捷键（真机无键盘，触屏是第一交互）——「跳一天/存档」按钮由此而来。

### 8. 构建系统 MCP 能力边界
- `project_build_system` 仅 get_build_settings/open_build_panel/check_builder_status，**不能编程触发 wechat-minigame 构建**（平台枚举里没有）；构建须用户在面板手动执行（项目→构建发布，注意不是偏好设置里的那个）。
- CC 任务「设备方向」直接控制 wechatgame 产物 game.json；`build-templates/wechatgame/game.json` 是双保险（构建后自动覆盖 deviceOrientation:"landscape"）。

## TapTap 平台（发行侧）

### 9. 上传入口与包体类型锁定
- 游戏发布页「选择包体」只能选已上传的包；上传入口 = **小游戏管理→包体管理**。
- 包体类型 H5 vs TAP **首次上传即锁定不可换**（我们已锁 TAP/引擎小游戏）。

### 10. 真机自测白名单
- 直接扫码报「当前该账号无测试资格」→ 包体管理页「**设置自测用户**」按 TapTap 号添加后再扫。
- taplap 登录提示不阻塞纯单机自测包；绿色「仅内部开发测试」浮层是平台测试版标记。

### 11. 包体预算以平台实测为准
- 控制台上传页建议 **20MB 以下**（严于官方文档 60MB）→ 预算按 20MB 做。首包实测 811KB（v0.0.1）。
- 最低支持库版本自动读取 = 2.4.0。

## DSH / 工具链

### 12. bash 启动 Electron（Cocos Creator）
- ①shell 自带 `ELECTRON_RUN_AS_NODE=1` → Electron 以纯 Node 启动失败，须 `env -u` 清除；
- ②写 ~/Library 需 danger-full-access 提权（Crashpad/设置）。
- 启动命令：`env -u ELECTRON_RUN_AS_NODE /Applications/Cocos/Creator/3.8.8/CocosCreator.app/Contents/MacOS/CocosCreator --project <路径>`

### 13. CC 安全网拦截密钥文件的一切操作
- **症状**：任何 bash 命令里出现 `tools/package-private-keys/**/*.key` 路径（包括 `git rm --cached`、`head`）都被 BLOCKED。
- **解法**：无法 agent 侧清理已提交的密钥文件。.gitignore 排除规则已加（`tools/package-private-keys/`）；**推送远端前用户须手动执行**：
  ```bash
  git rm --cached 'tools/package-private-keys/2121135163777339394/package_1_80b5e97690e6.key'
  git commit --amend --no-edit
  ```
- 顺带：97f708c 提交里混入该 key（已确认仓库纯本地无泄露），10 根胡萝卜的教训。

### 14. npm 安装要走工作区内缓存
- `~/.npm` 沙箱外写不进 → `npm install --cache .npm-cache`（MCP 插件安装时用过，成功）。

## 架构教训（非工具坑）

### 15. EventBus target 绑定
- `on(event, handler, target)` 的 target 一度被忽略 → 组件方法经总线回调 `this=undefined`（PlotView.refresh 读 `this._g` 崩，预览弹 Error 面板）。
- 已修：Binding 存 {handler,target}，emit 用 `.call(target,payload)`；顺带单监听器异常隔离（commit 94a5e48）。**新系统接总线时信任这个约定。**

### 16. 浏览器 localStorage 旧档兼容
- 改初始状态（如开局送种子）后，已有旧档不会自动获得 → 症状是"点击没反应"（静默缺资源）。
- 解法模式：启动时对**从未拥有**（undefined，区别于显式 0）的关键资源做补偿发放 + UI 层对缺资源给可见反馈（"缺种子"），禁止静默失败（commit b061802）。

### 17. 存档静默成功 ≠ 用户感知
- persist 成功但无反馈 → 用户以为失败。**所有关键操作要有即时视觉反馈**（"已存档✓"闪现）。

### 18. 布局重叠自查
- 程序化 UI 按钮堆叠时按行规划 y 坐标（HUD 右角三行：0/-64/-128）；截图验收时专门看遮挡。

## 19. 千问 Token Plan 文生图 API 契约（2026-11-13 实测）
- **key 只认 token-plan 域名**：`https://token-plan.maas.qianwenaiapi.com`；通用 `maas.qianwenaiapi.com` 对 token-plan key 返回 401。
- **兼容模式 `/compatible-mode/v1/images/generations` 不可用**（400 "url error"），`multimodal-generation` 端点 403。
- **可用端点**：原生异步 `POST /api/v1/services/aigc/image-generation/generation`，header `X-DashScope-Async: enable`，body 用 `input.messages[{role:user,content:[{text:prompt}]}]`（新模型不认老 `input.prompt`，报 "Field required: input.messages"）。
- **轮询** `GET /api/v1/tasks/{id}`（~50s/张），结果 URL 在 `output.choices[0].message.content[0].image`（不在 `results[0].url`，OpenAI 形状的记忆会踩 KeyError）。
- **模型不会画纯 #FF00FF 品红底**（会画成 (200,54,118) 类柔和洋红）——抠透明必须取角点色做参考再按色距抠（tol=90），不能用固定品红阈值。
- RGBA 图 Pillow 量化必须 `Image.FASTOCTREE`（MEDIANCUT 直接报错）。
- 复现入口：`python3 tools/gen_pixel_art.py [--only id] [--model X]`，密钥在 `.secrets/qwen.key`（已 gitignore，且 CC Safety Net 禁止 agent 读 .key 路径）。

## 20. cc 枚举值导入在预览构建下为 undefined（2026-11-13）
- 症状：`TypeError: Cannot read properties of undefined (reading 'NEAREST')`——SpriteLib 里 `TextureFilter.NEAREST` 崩，农场退回 Graphics 占位。
- 根因：`import { TextureFilter } from 'cc'` 在预览构建产物里该枚举绑定是 undefined（类型能过编译，运行时没有值）。
- 解法：**不要在运行时代码引用 cc 枚举值**。像素采样需求改在 png.meta 导入层解决：texture 子 meta 的 `minfilter/magfilter: "nearest"`；`sprite-frame` 子 meta `trimType: false`（防自动裁透明边导致精灵变形）。运行时只能用「字面量+类型断言」或干脆不引用。
- 批量改 meta 的脚本内联在会话里（遍历 png.meta 按 subMetas[].importer 分流改 userData）。

## 21. Sprite 赋图把 UITransform 重置回图片原始尺寸（2026-11-13）
- 症状：32px 像素图缩在 150px 地块中心，不铺满。setContentSize(128) 被覆盖。
- 根因：Sprite 默认 sizeMode=TRIMMED，**赋 spriteFrame 那一刻**会按图片裁剪尺寸重写 UITransform.contentSize；之后才改 CUSTOM 已经晚了（尺寸已被覆盖成 32×32）。
- 解法：`sizeMode = Sprite.SizeMode.CUSTOM` 必须在**赋 spriteFrame 之前**设置（程序化建 UI 的固定顺序：加组件→设 CUSTOM→setContentSize→赋图）。

## 22. BrowserSkill 截图 sha 缓存（2026-11-13）
- 症状：页面明明变了，`bsk_inspect screenshot` 返回同一张旧图（响应里 sha256 与上次相同）。
- 根因：bsk 按内容 hash 缓存截图响应；游戏 canvas 是纯绘制（DOM 无变化），sha 计算命中缓存。
- 解法：**优先不用截图验证**——`bsk_interact evaluate` 遍历场景树读 `cc.Label.string` / 组件类型（Sprite vs Graphics）是文字级精确验证，不受缓存影响。必须截图时，先点击一次 canvas（状态变化破缓存）再截。

## 23. 预览页 reload 后引擎启动时序（2026-11-13）
- `bsk_page reload` + 两次 `networkidle` 后，`cc.director.getScene().getChildByName('Canvas')` 仍可能是 null。
- 时序：load → 引擎 Init Project（重编译后首载可达 12s）→ LoadScene farm（~80ms-5s）→ 场景树可用。networkidle 只保证网络安静，不等引擎。
- 解法：evaluate 里判 null 就返回 'not-ready'，隔几秒重试；或先看 console（bsk_inspect console since=续读）确认 `LoadScene farm` 与 `[SpriteLib]` 日志出现再操作。
- 普通 reload 可能吃到缓存的旧 chunk index——验证新代码是否生效要看 console 日志的**行号/文件 hash**（如 chunk 1e…js:86 vs 旧 :76），必要时 hard reload。

## 24. bsk strict 策略下所有动作都要最新 contextId（2026-11-13）
- `bsk_page reload/wait` 也报 "requires the context returned by the latest cooperate sync"——不只 interact/evaluate，页面级动作同样检查。
- 每个动作前 `bsk_session sync` 拿 contextId 并显式传入；evaluate 报错一次后 context 会变，必须重 sync 再发（不要原样重放）。

## 25. SpriteLib 异步就绪竞态（2026-11-13）
- 症状：reload 后农场偶发停留在 Graphics 占位样式（console 明明 [SpriteLib] 8/8）。
- 根因：首帧早于 Bundle 加载完成，PlotView 已按占位模式绘制；素材就绪后无人通知重绘。
- 解法：SpriteLib.init 完成后 `EventBus.emit('farmChanged', {action:'sprites_ready'})`，PlotView 等视图已订阅 farmChanged 全量重绘——异步资源就绪统一走事件广播，不做轮询。
