# 异界小农场 | OtherworldLittleFarm

TapTap 小游戏优先的横屏像素风单机农场探险游戏。

## 当前工程

- 引擎：Cocos Creator 3.8.8
- 项目模板：Empty (2D)
- TapTap 小游戏适配：官方 Cocos Creator 插件，要求 Creator 3.8.x 或更高版本
- 目标方向：横屏；TapTap 小游戏导出配置使用 `deviceOrientation: landscape`
- 主要玩法：农场经营、分区探险、封印防守、钓鱼、房间装扮、NPC 与图鉴

## 打开项目

在 Cocos Dashboard 中导入本目录，使用 Cocos Creator 3.8.8 或兼容的 3.8.x 版本打开。不要手动编辑 Cocos 自动生成的 `library/`、`temp/` 和 `local/`。

## 目录

- `assets/`：Cocos 资源、场景、脚本、数据和素材
- `docs/`：设计、技术和发行说明
- `release/taptap/marketing/`：商店图标、截图、宣传图和视频源文件
- `release/taptap/compliance/`：备案与审核材料；放入前注意妥善保管身份证明等敏感文件
- `build/TapBuild/game.zip`：TapTap Cocos 插件生成的上传包（构建产物，不提交版本控制）
- `extensions/`：项目级 Cocos 扩展；TapTap 插件按官方安装文档导入

## 设计文档

- [游戏设计初稿](docs/design/game-design-draft.md)：核心体验、玩法系统、首版范围和实施顺序
- [首个可玩版本](docs/design/first-playable.md)：试玩切片目标与边界

## TapTap 小游戏构建

1. 安装 TapTap 官方 `taptap-minigame-tools` Cocos 插件（目前文档要求 Cocos Creator 3.8.x+）。
2. 在「项目 > 构建发布」中按官方说明构建微信小游戏并勾选「转换为 Tap 小游戏」。
3. 检查横屏、真机运行、TapTap API 和资源加载，再使用 `build/TapBuild/game.zip` 自测及提审。
4. 包体大小、资质、备案和物料规则以提交时 TapTap 开发者后台和最新文档为准。

## 开发原则

- 核心游戏逻辑不直接依赖 TapTap API；平台登录、广告和存档统一通过 `assets/scripts/platform/taptap/` 适配。
- 首版不接广告或内购；若后续加入广告，平台能力应通过可替换接口接入，且不得阻断正常玩法。
- 先完成一个短循环：农场种植与钓鱼 → 一张探险地图 → 一次封印防守 → 回农场使用收获。
