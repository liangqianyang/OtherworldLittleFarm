# V3 视觉整洁化：素材侧提示词与贴图纪律（v3-clarity-asset-prompts）

- **负责成员**: design-image-prompt-engineer（Image Prompt Engineer）
- **日期**: 2026-11-19
- **性质**: 设计产出（提示词档案 + 贴图纪律 + 密度预算）。**本轮未生成任何 PNG、未改任何代码与贴图**，全部为待执行项。
- **上游**: `world-layout-v2.md`（冻结几何）、`game-design-draft.md` §13/§18（MVP、AI 生成+提示词表、16/32px 网格）、`mvp-asset-prompts.md`（全局风格锁与 UI 图标单一真源）、`world-v2-asset-prompts.md`（V2 地形贴图定稿与教训）
- **单一真源声明**: 4+1 作物 / 3 怪物 / 2 NPC / 8 家具 / 主角 / 探险物件 / 物品图标等**既有素材的提示词不在本文重复**（见 `mvp-asset-prompts.md` §4 索引与 `tools/gen_pixel_art.py --list`）。本文只产出 **V3「整洁化」增量**：地面贴图纪律、过渡策略、边界物、世界层去文字化、每屏密度预算。
- **与几何的关系**: 本文素材清单**不依赖具体 V3 坐标**（几何由 level-designer 产出后零改动适用）；唯一耦合是 §6 的「每屏地面家族数」验收阈值，需与 V3 几何提案联合校验。

---

## 1. 结论先行（TL;DR）

**用户感到「眼花缭乱」的素材侧根因不是贴图种类数量（6+1 种并不算多），而是贴图被"错误地用在了错误的地方"，制造了 3 类噪声**：

1. **土路复用了农田耕地贴图**（`TerrainBakeRenderer.ts:24`：`Dirt→plot_soil`，犁沟纹理）→ 9 段路网在屏幕上读作"更多耕地"，与 3×3 农田块连成一大片棕色拼布 —— 这是出生屏杂乱感的**最大单一贡献者**。
2. **所有地面边界全是硬切直边、零过渡**（6 种地面任意相邻直接拼接）→ 每种纹理的边界都形成一条高对比描边线，画面被切割成拼图块。
3. **世界层有文字**（4 块路牌用 Label 汉字悬浮）+ 单一草贴图大面积 32px 周期重复 + 沙环 2 格宽高亮带 → 细碎高频噪声。

**V3 素材对策一句话**：**地面做减法（同色族、低对比、加过渡），边界做加法（栅栏/绿篱定义分区），文字清出世界层**。

- 新增素材 **11 件，其中仅 4 件需 AI 生成**（ground_path、fence_h、fence_v、hedge_green），其余 7 件纯程序派生（草变体×2、水岸沿 1+3 旋转、抖动过渡 1、可选 sand_dim 1）——单人产能一次改完，包体增量预估 ≤20KB。
- 现有全部素材（作物/怪物/NPC/家具/地标/UI 图标）**100% 复用，零重绘**；仅路牌与世界层文字处理方式改变。
- 明确**不做**：47 张 blob 过渡全集（CSDN 教训的复刻）、逐区换地面底色、任何新色相。

---

## 2. 证据位置（素材侧诊断，对应总问题 Q1 假设 ①④）

| # | 证据 | 位置 | 贡献的杂乱感 |
| --- | --- | --- | --- |
| E1 | **土路=耕地贴图**。渲染注释明写 `Dirt→plot_soil`；plot_soil 提示词含「横向犁沟纹理」 | `assets/scripts/gameplay/world/TerrainBakeRenderer.ts:24`；`tools/gen_pixel_art.py:56-58` | **已复现（代码实读）**。路网与农田同纹理 → 出生屏棕斑连片；玩家也无法从贴图区分"可走的路"与"可锄的地" |
| E2 | **硬边零过渡**。9 种地形任意相邻直接整格切换，无岸沿/无渐变/无镶边；水面在无贴图时甚至是纯色块 | `TerrainBakeRenderer.ts:24,53-63`（spec 表无任何 edge 分支）；`world-layout-v2.md` §2（河 5 段矩形直切） | **已复现（代码实读 + V2 ASCII 图）**。每条纹理边界=一条硬描边线，河 x30-36 摆动段在小屏上读作锯齿蓝带 |
| E3 | **世界层文字**。4 块路牌为世界层 Label 汉字装饰（「↑副本·封印」等） | `world-layout-v2.md` §4（`WorldLiving _buildSigns`，标注「世界层 Label 装饰」） | **已复现（文档+实现描述）**。小尺寸像素汉字 = 高频噪声，且与 UI 层文字形成双文字系统 |
| E4 | **单一草贴图周期重复**。ground_grass 仅 1 张，两色短草均匀分布，无变体 | `tools/gen_pixel_art.py:53-55`；`world-v2-asset-prompts.md` §2 | **已复现（清单实读）**。大面积草坪呈现 32px 网格状重复纹理（调研#8：同底需 2-4 同色系变体打散） |
| E5 | **沙环高亮带**。湖体外圈 2 格 Sand，沙色 #c9a959/#e8d38a 明度显著高于草绿 | `world-layout-v2.md` §1（2 格沙环）；`world-v2-asset-prompts.md` §2.2（沙色锚） | **已复现（几何+色值推演）**。环湖一圈亮色带在湖景屏幕中与水/草形成第三种强对比块 |
| E6 | **出生屏地面家族计数推演**。视口 24×11 格（1280×720/32px），出生 (50,40)：石板广场(40-52/36-46) + 草地 + 土路（westH/eastH/northV 端头）+ 农田 soil 角(58-62/42-44)，且其中"路"与"田"同贴图 | `world-layout-v2.md` §1/§3/§4 + 视口算术 | **推演（未跑引擎截图，见 §8-R7）**。视觉上 ≥3 个地面家族，且 soil 家族以"路+田"两种语义铺满半屏 |

> 调研对齐：①「同底多变体优于多种不同底」（调研#5/#8）→ 草变体方案；②「分区靠边界物而非换底」（调研#3）→ 栅栏/绿篱方案；③「过渡瓦片失控=噪音主源」（调研#5）→ 否决 blob 全集，改用 1 张抖动过渡+1 组水岸沿；④「每屏纹理种类上限」（调研#2 大片同质岛）→ §6 密度预算。

---

## 3. 风格锁 V3（增量修订，其余沿用 `mvp-asset-prompts.md` §2）

### 3.1 三层对比度纪律（新增，全素材适用）

| 层 | 内容 | 对比度规则 | 描边 |
| --- | --- | --- | --- |
| L1 地面 | 全部 ground tile | **低对比**：同族色、相邻明度差小、无描边、无方向性纹理 | 无 |
| L2 可行走物件 | 栅栏、路牌、小装饰、作物精灵 | 中对比：比地面亮/暗 ≥2 档，体积小、轮廓简单 | 统一 `#2a1f16` |
| L3 地标/交互核 | 床/谷仓/祭坛/副本门/码头/NPC | 高对比：独占一个强调色（谷仓=红、祭坛=暗金、副本门=幽绿），剪影 3 米外可辨认 | 统一 `#2a1f16` |

**核心效果**：玩家视线永远先落在 L3 → L2 → 才是地面。V2 的杂乱本质之一是 L1（地面）里混入了 L2/L3 级别的对比度（犁沟路、亮沙环、硬边线）。

### 3.2 调色板台账（新增铁律：**V3 不引入任何新色相**）

新素材只允许复用以下已锚定色值（出处：`mvp-asset-prompts.md` §2.2、`world-v2-asset-prompts.md` §1/§2）：

| 族 | 锚值 |
| --- | --- |
| 描边 | `#2a1f16` |
| 草地 | `#6c870b` `#517608` `#73960b`（+土斑 `#6f570f` `#8a6713`） |
| 森林 | 深绿褐苔藓系（ground_forest 现网取样） |
| 土壤/新路 | `#4a3020` `#6b4a2e` `#8a6a42`（+石子借用 `#a5813c` `#a09584`） |
| 水 | `#1e3c78` `#2e5aa8` `#3a6cc0` |
| 沙 | `#c9a959` `#a5813c` `#e8d38a` `#bc9742` |
| 石板 | `#a09584` `#b5aa99` `#8a7f70` `#aa9e8c` + 勾缝 `#4a4038` |
| 强调 | 金 `#f2c14e`/`#e8983a`；警示 `#FF6060`（仅 UI） |

### 3.3 网格/负面词/平台参数/品红底约定

全部沿用 `mvp-asset-prompts.md` §2.1/§2.3-§2.6 与 §3 验收四查，不重复抄录。要点提醒：AI 必 `prompt_extend=false` 锁词、n=1 串行；512² 起稿 LANCZOS 降采样；tile 满幅可平铺、精灵品红底抠透；meta 必查 nearest + trimType=false。

**平台参数速查**（同 mvp §2.5，本项目实测过的只有第一行）：

| 平台 | 参数 |
| --- | --- |
| 项目标准管线（首选） | `python3 tools/gen_pixel_art.py --only <id...>`（qwen-image-3.0-pro，自动降采样+量化+抠透） |
| Midjourney | EN 提示词 + `--v 7 --style raw --ar 1:1 --no text, watermark, anti-aliasing, gradient, 3D render` |
| Stable Diffusion | pixel-art LoRA 0.8-1.0，512²，CFG7，25-30 步，出图后 quantize ≤24 色 |
| 即梦 | 图片 3.0，1:1，关闭提示词优化，品红底手动下采样 |

**新增负面词（地面贴图专用，追加到 §2.3 通用负面词之后）**：
中：无边界、无暗角、无方向性条纹、无大块色斑 / EN: no border, no vignette, no directional stripes, no large color patches, no objects, no props

---

## 4. V3 素材清单（可执行：ASSETS 元组 + 双语提示词 + 程序化配方）

> 落位路径均按 §2.6 约定（`assets/textures/tiles/`、`assets/textures/adventure/`）。元组格式与 `tools/gen_pixel_art.py` 完全一致，可直接由 architect 追加进 `ASSETS`。

### 4.1 地面减法（2 项纪律 + 3 个新 tile）

**D1. 土路独立贴图 `ground_path`（AI 生成，1 张）** —— 修复 E1 的核心动作。`Dirt` 地形渲染从 plot_soil 换绑 ground_path（归 architect，纯渲染换绑，地形数据与存档零改动）。

```python
("ground_path", 32, "assets/textures/tiles/ground_path.png", False,
 "像素画，16位复古农场游戏土路地砖，顶部俯视满幅，压实的浅暖棕色土面（底色#8a6a42），"
 "散布少量小石子（#a5813c、#a09584）与细碎亮斑，无犁沟、无车辙、无方向性条纹，均匀无方向，"
 "色调与农田土壤同族但明显更浅更平整，可无缝平铺，无任何边界和装饰。" + PALETTE +
 " pixel art tile, 16-bit retro farm game packed dirt path, full-bleed top-down, "
 "light warm brown compacted earth (#8a6a42 base) with sparse small pebbles (#a5813c, #a09584) "
 "and tiny bright specks, NO furrows, no ruts, no directional stripes, uniform and directionless, "
 "same warm family as farmland soil but clearly lighter and flatter, seamlessly tileable, edge-to-edge"),
```

- **验收**：与 plot_soil 并排截图，路/田明度差可一眼区分（目标 L* 差 ≥15%）；四边无缝。
- 效果：出生屏 soil 家族从"路+田两用铺满半屏"收缩为"仅农田块内"，路变成清晰可读的浅色线条（同时服务 Q2「路网读作干净线条」）。

**D2. 草地变体 `ground_grass_b` / `ground_grass_c`（程序派生，2 张，0 AI 成本）** —— 修复 E4。

- **配方（强制程序派生，禁止 AI 重画以防色相漂移）**：PIL 读现网 `ground_grass.png` → 提取其色值集合 → 保持调色板不变，用 rng(seed=11) / rng(seed=23) 重排亮暗斑点位（同族微差变体，非换色）→ NEAREST 落盘。
- **使用规则（归 architect/validator）**：大草坪按确定哈希混铺——`hash=(x*7+y*13)%10`，`<7`用 a、`7-8`用 b、`9`用 c（≈70/20/10）。**边界物与地标脚下固定用 a**，保证接缝可控。
- **验收**：3 张并排肉眼"像同一块草地"（同色系）但并排平铺 6×6 无可见周期网格。

### 4.2 过渡策略（否决 47 张 blob 全集，总量 5 张）

**T1. 通用抖动过渡 `fade_dither`（程序派生，1 张）** —— 修复 E2 的通用手段，适用所有「草↔林/沙/石板/农田」硬边对。

- **配方**：32×32 RGBA，alpha 沿对角线 0→255 以 4×4 Bayer 抖动分 8 级阶梯过渡（**抖动色阶，不是平滑渐变**——像素正确且规避"no gradient"负面词）。渲染端在 A/B 边界格上：先画主体地面，再以本贴图为 alpha 蒙版画邻居地面（实现归 architect，TerrainBakeRenderer 第二遍）。
- **规则**：每处边界只做 1 格宽的过渡带；过渡带上禁止再叠 props。
- **验收**：草↔森林、草↔石板广场、草↔农田块边界截图：无直线硬缝；放大约 4× 后呈棋盘抖动而非模糊渐变。

**T2. 水岸沿 `edge_grass_water_n`（AI 或程序合成 1 张 + 程序旋转派生 3 张）** —— 修复河段 E2 的专用手段（水面需要"岸"的实体感，抖动蒙版不适用）。

- 主体张（N=草在上）：32²，下部 26px 复用 ground_water 原像素，顶部 2px 草底色横带 + 3px 不规则草垂须（草族锚色）+ 1px 深水阴影线 `#1e3c78`。**不引入白色泡沫**（新色相禁令）。
- 派生：S=rotate180、E=rotate90、W=rotate270（PIL 90° 旋转对像素网格无损；水面纹理低对比，旋转不违反受光惯例）。
- **AI 备用提示词（仅当程序合成观感不佳时）**：
  - 中：像素画，16位复古农场游戏水岸地砖，顶部俯视：下方四分之三是深蓝平静河水纹理（#1e3c78/#2e5aa8/#3a6cc0），顶部一条窄窄的绿色草皮边缘不规则地垂入水面，草色 #6c870b/#517608，边缘锯齿状自然，无白色泡沫，可无缝平铺，无边界无装饰。
  - EN: pixel art tile, 16-bit retro farm game water edge, top-down: lower three quarters calm dark blue water (#1e3c78/#2e5aa8/#3a6cc0), narrow irregular grassy bank fringe overhanging from the top edge (#6c870b/#517608), jagged natural edge, no white foam, seamlessly tileable, edge-to-edge
- **落点建议（handoff level-designer）**：河两岸各 1 行 + 湖体若取消/收窄沙环则湖岸换用本组；河桥 x31-37/y39-42 穿岸处由桥体覆盖无需特殊处理。

**明确不做**：grass↔X 每对 12 张的标准过渡集、任何 blob-47 方案（调研#5 的失控教训）；角点过渡瓦片（1 格过渡带+边界物已覆盖视觉， corner 空缺由 prop 或第二格过渡自然填补）。

### 4.3 边界物加法（分区靠物体，不靠换底 —— 3 个 AI 精灵）

按调研#3：每个功能区用**边界物线**获得视觉身份。V3 中建议（落点归 level-designer）：农田块外围 = 栅栏线；开荒林南缘 = 绿篱点列；居住庭院 = 栅栏或绿篱二选一（勿混用）。

```python
("fence_wood_h", 32, "assets/textures/adventure/fence_wood_h.png", True,
 "像素画，16位复古农场游戏栅栏精灵图，水平一段木栅栏：两根深棕立柱加两条横木杆，木纹简洁，"
 "深棕描边，纯品红色背景。" + PALETTE +
 " pixel art sprite, 16-bit retro farm game fence, horizontal wooden fence segment with two dark-brown "
 "posts and two horizontal rails, simple wood grain, dark outline, isolated on solid magenta background"),
("fence_wood_v", 32, "assets/textures/adventure/fence_wood_v.png", True,
 "像素画，16位复古农场游戏栅栏精灵图，俯视3/4视角纵向一段木栅栏：一根立柱带两短截横杆向画面上方延伸，"
 "表示南北走向栏段，与水平段同材质同色，深棕描边，纯品红色背景。" + PALETTE +
 " pixel art sprite, 16-bit retro farm game fence, vertical run segment in top-down 3/4 view, single post "
 "with two short rails receding upward (north-south fence section), same material and color as horizontal "
 "fence, dark outline, isolated on solid magenta background"),
("hedge_green", 32, "assets/textures/adventure/hedge_green.png", True,
 "像素画，16位复古农场游戏绿篱精灵图，圆形修剪过的深绿色灌木，无花无果实，比草地更深更冷一档，"
 "轮廓圆润完整，深棕描边，纯品红色背景。" + PALETTE +
 " pixel art sprite, 16-bit retro farm game hedge, round trimmed dark-green shrub without flowers or berries, "
 "one step darker and cooler than lawn grass, clean round silhouette, dark outline, isolated on solid magenta background"),
```

- fence 转角 = 运行时 h+v 同格叠放，**不新增转角素材**；h/v 必须分开出图（俯视 3/4 下纵段与横段透视不同，90° 旋转不成立——与角色同理）。
- **密度红线**：边界物是 L2 中对比元素，单屏可见栅栏/绿篱簇 ≤6 簇（§6）；禁止围满全图（星露谷感=克制）。

### 4.4 世界层去文字化（修复 E3：1 个 AI 精灵 + 1 条渲染规则）

- 新素材 `sign_wood`（32，AI）：替换现有 4 块 Label 文字路牌。

```python
("sign_wood", 32, "assets/textures/adventure/sign_wood.png", True,
 "像素画，16位复古农场游戏路牌精灵图，单根木柱顶着一块小方形木牌，牌面只有一道刻入的方向箭头，"
 "不刻任何文字字母，深棕描边，纯品红色背景。" + PALETTE +
 " pixel art sprite, 16-bit retro farm game wooden signpost, single post with small square board carrying "
 "one carved direction arrow mark, NO text or letters, dark outline, isolated on solid magenta background"),
```

- 方向 = 运行时水平翻转（右向为基准）；具体指向语义（副本/农场/林地/码头）由**指南针 HUD 与地图布局本身**承担，世界层不再承担导航文字（这同时符合调研#7「一眼可读、不填满」）。
- **渲染规则（新增铁律，写进风格锁）**：世界层禁止出现任何文字/汉字；一切文字只存在于 UI 层。归 architect 改 `WorldLiving._buildSigns`。

### 4.5 现有素材审计（结论：全部复用，仅 1 项可选微调）

| 素材 | 审计结论 | 动作 |
| --- | --- | --- |
| 作物×5/怪物×3/NPC×2/主角/家具×8 | 已符合三层纪律（L2/L3 级），V3 不动 | 复用 |
| barn/世界祭坛/副本门 | 各自带独占强调色（红/暗金/幽绿），是好的 L3 锚点 | 复用；V3 摆位上保证各自成为所在屏的唯一强调色（归 level） |
| ground_grass / ground_forest / ground_water / ground_sand / ground_stone / plot_soil(_wet) | 保留原图 | 复用 + §4.1/§4.2 规则生效 |
| ground_sand | 亮度过高是 E5 帮凶 | **可选** `ground_sand_dim`：程序派生（现沙 4 档色明度 ×0.85 量化），仅当 level 拍板「沙环 2→1 格收窄后仍嫌亮」时启用；不默认做 |
| bush_berry | 红果=小强调色，作零散采集物 OK；**禁止**当边界物成排用（会变成红色虚线噪音） | 复用 + 使用规则 |
| UI 全部（图标/九宫格） | 见 §5 | 不变 |

### 4.6 明确不做（守 MVP + 单人产能）

- ❌ blob/47 张过渡全集、每对地形 12 张标准过渡集
- ❌ 逐功能区换地面底色（调研#3 明确反对；V3 用边界物代替）
- ❌ 节日/季节地面变体、第 7 种地面类型、白色泡沫/新色相
- ❌ 重绘任何既有作物/怪物/NPC/家具/地标

---

## 5. UI 素材规格（单独章节；单一真源在 mvp-asset-prompts §5）

**既有 UI 产出不动**：世界 HUD 12 件图标（工具坞×6、齿轮/背包 56px、日历芯片/关闭 32px、杂项×2）+ 九宫格面板×2 的提示词、尺寸、九宫格切片规格、验收 A1-A7，**全部已在 `mvp-asset-prompts.md` §5 定稿**，本文不重复。V3 的 UI 素材增量只有两条：

1. **世界层去文字化**（§4.4）——UI 层承担全部文字：4 块路牌语义改由 CompassHUD POI + 顶栏呈现；此项是 UI 信息架构调整，素材无需新增（POI 图标见下条）。
2. **可选：CompassHUD POI 图标 ×3（16px，品红底）** —— 仅当 UI 设计师拍板把指南针从程序 Graphics 升级为图标时启用；不拍板不做。

| 文件名 | 语义 | 提示词（中） | Prompt (EN) |
| --- | --- | --- | --- |
| icon_poi_gate.png | 副本门 | 像素画图标，16位复古游戏小地图兴趣点图标，石拱门正面剪影带幽绿光点，金色细描边，深棕轮廓，纯品红背景 | pixel art icon, 16-bit retro game map POI, stone archway silhouette with faint green glow dot, thin gold inner detail, dark outline, isolated on solid magenta background |
| icon_poi_seal.png | 封印祭坛 | 像素画图标，16位复古游戏小地图兴趣点图标，圆形石台中央一个发光金色符文圆环，深棕轮廓，纯品红背景 | pixel art icon, 16-bit retro game map POI, round stone pedestal with glowing golden rune ring in center, dark outline, isolated on solid magenta background |
| icon_poi_dock.png | 码头 | 像素画图标，16位复古游戏小地图兴趣点图标，一小段伸入水面的棕色木板码头俯视剪影带系船柱，深棕轮廓，纯品红背景 | pixel art icon, 16-bit retro game map POI, small brown wooden dock plank silhouette extending into water with a mooring post, dark outline, isolated on solid magenta background |

---

## 6. 每屏密度预算（素材侧验收阈值；与 V3 几何联合校验）

| 预算项 | 阈值 | 度量方法 |
| --- | --- | --- |
| 每屏地面家族数 | **≤3**（出生广场屏 ≤3；其余屏争取 ≤2） | 3 个固定机位截图逐格数家族：出生(50,40)、河湾(~33,40)、码头(42,56) |
| 大面积草坪变体比 | a≈70% / b≈20% / c≈10%，确定性哈希 | 截图目检无周期网格；代码审计 hash 公式 |
| 硬边残留 | **0** 处「无过渡直缝」 | 同 3 截图：每条 A/B 边界必有 fade/岸沿/边界物之一 |
| 世界层文字 | **0** 字符 | 全图遍历 `Label` 于世界层的挂载审计 |
| 边界物密度 | 单屏栅栏/绿篱簇 ≤6；绿篱点列间距 2-3 格 | 截图目检 |
| 强调色独占 | 每屏 L3 级强调色 ≤2（红谷仓/暗金祭坛/幽绿门不同屏出现） | 3 截图目检 |
| 新增包体 | ≤20KB（pngquant 8-bit + auto atlas 后） | 构建产物 diff |

---

## 7. 交付动作与验收标准（可执行清单）

| # | 动作 | 负责 | 验收 |
| --- | --- | --- | --- |
| A1 | 4 张 AI 素材生成：ground_path、fence_wood_h、fence_wood_v、hedge_green（标准管线，n=1 串行，约 4 分钟） | 本角色执行提示词 / architect 跑管线 | mvp §3 四查 + §4 各条专用验收 |
| A2 | 程序派生 5 张：ground_grass_b/c、fade_dither、edge_grass_water_n(+3 旋转)；（可选 sand_dim） | architect（PIL 脚本进 tools/ 或 gen_pixel_art.py） | §4.1/§4.2 配方逐条；调色板 ⊆ §3.2 台账 |
| A3 | Dirt 渲染换绑 ground_path；变体哈希混铺；fade 第二遍；水岸沿自动选向；sign_wood 替换 Label 牌；SpriteLib.CORE 增项 | architect | 编辑器 1280×720 预览 3 机位截图过 §6 全表 |
| A4 | validate-layout-v2.py 增「视觉密度」校验（每屏家族数、硬边计数——按 §6 阈值静态推演） | architect/lead（与几何提案同轮） | 校验器 ALL PASS |
| A5 | 回归：老档加载（terrainSize 守卫路径）、rebakeDirty、工具坞「铺/撤」来回 6 次、桥面/台阶渲染 | code-reviewer | 既有 V2 用例全过 + 贴图无回归 |

**优先级**：A3 中「Dirt 换绑 ground_path」+「世界层去文字」两项**单独执行即可显著降杂乱**（对应 E1/E3 两大根因），即使其余过渡/变体延后也建议先行。

---

## 8. 风险与条件（每条含位置/触发/影响/验证）

| # | 风险 | 位置 | 触发 | 影响 | 验证/缓解 |
| --- | --- | --- | --- | --- | --- |
| R1 | AI 草变体色相漂移（潜在） | ground_grass_b/c | 若改用 AI 重画而非程序派生 | 草坪出现色块补丁感，反向加剧杂乱 | **缓解已内建**：配方强制程序派生；验证=PIL 取色集合比对与 a 完全一致 |
| R2 | fade 过渡需渲染器第二遍（条件） | TerrainBakeRenderer | architect 排期不足 | 过渡方案落地延迟 | 最小回退：仅对 grass↔path 出 4 张直边过渡（N/S/E/W 直边各 1，程序派生自 ground_path+grass 合成），8→4 张成本；回归=3 机位截图硬边计数 |
| R3 | 边界物过量反向致密（潜在） | fence/hedge 使用规则 | level 把分区边界围满 | 栅栏虚线成为新噪音 | §6 单屏 ≤6 簇红线 + 校验器计数；验证=A4 校验项 |
| R4 | 水岸沿 90° 旋转在河湾转角露缝（潜在） | 河 x30-36 摆动段 | 转角格四邻方向混合 | 转角出现 1-2 格硬缝 | 最小修：转角格退回 fade_dither 或该格保持沙；回归=河湾机位截图 |
| R5 | path 与 wet soil 混淆（潜在） | ground_path vs plot_soil_wet | 浇水后农田变深褐 | 玩家误把路当田 | 明度/色相差设计已拉开（#8a6a42 vs 深褐+光泽）；验证=并排截图 L* 差 ≥15% |
| R6 | 沙环收窄是几何改动，素材侧只配套（条件） | world-layout-v2 §1 | level 未采纳收窄 | E5 残留 | 启用可选 sand_dim 兜底；验证=码头机位截图 |
| R7 | 出生屏计数为几何推演、未实机截图（**未验证项**） | §2-E6 | — | 阈值可能有 ±1 误差 | A3 落地后以 3 机位实机截图复测并回写本表；在此之前 §6 阈值按「待实机校准」执行 |
| R8 | 包体超预算（低概率） | 新增 11 资产 | — | 首包 ≤4MB 余量本就紧张 | 预估 ≤20KB（11×32² pngquant）；A5 构建产物 diff 实测 |
| R9 | sign_wood 箭头语义弱化导航（潜在） | §4.4 | 玩家失去文字指引后迷路 | 新手引导期找路变慢 | 依赖 CompassHUD+引导链补偿（handoff UI/game-designer 确认）；回归=新手 10 分钟任务链实测 |

**阻塞项说明**：无硬阻塞。R2 为唯一潜在排期阻塞，已给最小修（4 张直边过渡回退）+ 匹配回归（3 机位硬边计数）。

---

## 9. Handoff（跨角色对齐清单）

**→ level-designer（V3 几何所有者）**：
1. 本文素材清单与几何**解耦**，但请保证：路网简化后主路径仍为 2 宽直线段（ground_path 的"干净线条"效果依赖此）；请拍板 ①沙环 2→1 收窄与否（决定 sand_dim 是否启用）②栅栏线/绿篱列的具体落点坐标 ③石板广场是否收窄（影响出生屏家族数能否到 ≤2）。
2. §6「每屏 ≤3 家族」请并入 V3 几何提案的验收，与 validate-layout-v2.py 视觉密度校验（A4）对接。

**→ engineering-software-architect**：
1. §4 全部 ASSETS 元组可直接追加；渲染侧改动清单 = Dirt 换绑、变体哈希、fade 第二遍、岸沿选向、sign 替换、SpriteLib 增项（A3）。
2. 请确认 TerrainBakeRenderer 第二遍的 rebakeDirty 兼容与工具改造（铺/桥/梯/撤）后过渡带的正确重烘。

**→ engineering-code-reviewer**：A5 回归清单（老档/来回工具/3 机位截图/包体 diff）请纳入测试计划；R4/R5 为重点边界用例。

**→ design-ui-designer**：①世界层去文字后，POI 语义是否由 CompassHUD 承担请拍板（决定 §5 可选 3 图标是否启用）；②路牌移除后新手引导的指向补偿方案（R9）请与 game-designer 对齐。

**→ lead（协调者）**：本目录下另有其他角色的 v3-clarity 产出（impl-impact / ui-ux-spec 等），本案与它们的交集仅 §6 阈值与 A3/A4 责任划分，请在汇总时对表。

**未覆盖/未执行声明**：本轮未调用生图 API、未生成 PNG、未改代码；全部 11 项资产为待执行；Midjourney/SD/即梦参数沿用既有通用建议未实测；E6 出生屏计数未实机截图验证（R7）。
