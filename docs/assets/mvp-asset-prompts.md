# MVP 素材提示词总册（mvp-asset-prompts）

- **负责成员**: design-image-prompt-engineer（Image Prompt Engineer）
- **日期**: 2026-11-18
- **性质**: 设计产出（提示词档案 + 缺口清单），未改任何代码与贴图
- **定位**: 本文是 MVP 清单素材的**总索引 + 缺口提示词全集**。已有素材的提示词不在此重复，维持项目既有约定「单一真源」：
  - Batch 1 提示词全文：`docs/assets/pixel-art-prompts.md`（§A/B/C）
  - Batch 2–6 提示词全文：`tools/gen_pixel_art.py` `ASSETS` 清单（可执行真源，`python3 tools/gen_pixel_art.py --list` 打印）
  - V2 地形 tile 与地标重抽提示词：`docs/assets/world-v2-asset-prompts.md`（§2/§3，含程序化定稿做法）
- **依据**: `docs/design/game-design-draft.md` §13（MVP 必须包含）/ §17（触屏）/ §18（AI 生成+提示词表、16/32px 网格、双语+负面词）；`docs/design/world-redesign/layout-v2-ui-notes.md` §3.3（UI 色板 Token）/ §10（对本案的 Handoff：HUD 图标提示词缺口）
- **数据对齐**: `assets/data/catalogs/`（crops/monsters/npc_dialogs/furniture/items/fish/gatherables）逐 id 核对，见 §4 总表

---

## 1. 结论速览（TL;DR）

| MVP 清单项 | 需求数 | 已产出 | 缺口 |
|---|---|---|---|
| 作物（4 普通+1 稀有）三阶段 | 12 | 12 ✅ | 0 |
| 怪物 | 3 | 3 ✅（另有 idle×2） | 0 |
| NPC | 2 | 2 ✅ | 0 |
| 主角三向 | 3 | 3 ✅（左向=运行时翻转，无需素材） | 0 |
| 家具 | 8 | 8 ✅ | 0 |
| 农场/世界 tileset | 7 | 7 ✅ | 0 |
| 探险物件/地标 | 8 | 8 ✅ | 0 |
| 物品/鱼图标 | 17 | 15 ✅ | `icon_spore_cap`、`icon_stone`（低优先，未接线） |
| **世界 HUD UI 图标**（ui-notes §10 Handoff） | 12 | **0** | **12 件全新（本文 §5 给全提示词）** |
| 防守作物精灵 | 4 | 1（tower_pea→podgun） | 3（frostbell/honeyplot/spikepumpkin 现为纯色块，本文 §6） |

**一句话结论**：MVP 世界素材已全覆盖且实机验收通过；**真正的缺口是世界场景 HUD 的 12 件 UI 图标/九宫格**（UI 设计已拍板、素材未产出），外加 3 件防守作物精灵的可选增强。本文给出全部缺口的可执行双语提示词与规格。

---

## 2. 全局风格锁（每条提示词的公共前缀/后缀）

### 2.1 网格与画幅

| 级别 | 规格 | 说明 |
|---|---|---|
| 图标/精灵 | 32×32 为主；小物件 16×16；地标/NPC/家具 48/64×64 | 与 SpriteLib/现网素材一致 |
| 生成底稿 | 512×512 或 1024×1024 正方形（1:1） | AI 平台原生出大图 → 下采样到目标尺寸 |
| 世界画幅 | 横屏 1280×720 设计分辨率（FIXED_HEIGHT，世界px:屏幕px=1:2） | 32px tile 在世界 1 格 = 32 世界px |

### 2.2 调色板（有限色，≤24 色）

**世界素材锚**（沿用 v1 约定 + V2 实测取样）：
- 描边（所有物体统一）：`#2a1f16`
- 土壤系：`#4a3020` `#6b4a2e` `#8a6a42`；草地系：`#6c870b` `#517608` `#73960b`（现网 ground_grass 实测锚）
- 强调金：`#f2c14e` `#e8983a`；水系：`#1e3c78` `#2e5aa8` `#3a6cc0`；沙系：`#c9a959` `#a5813c` `#e8d38a`
- 正向提示词公共后缀（EN，gen_pixel_art.py `PALETTE` 原文）：
  > limited warm earthy palette (dark brown #2a1f16 outline, soil browns, grass greens, golden accents), clean hard pixel edges

**UI 素材锚**（`layout-v2-ui-notes.md` §3.3 色板 Token，UI 图标一律引用）：
- 底 `ui/panel-dark` `#14161F`；圆钮底 `ui/panel-navy` `#1C2030`
- 主强调 `ui/gold` `#F2C14E`；选中描边 `ui/gold-hi` `#FFECA0`
- 正文 `#EBEBEB`；警示（撤销/破坏性）`ui/alert` `#FF6060`
- UI 正向提示词公共后缀（EN，本案新增，供 §5 使用）：
  > limited warm earthy palette (dark brown #2a1f16 outline, golden accents #F2C14E/#FFECA0, steel greys, wood browns), clean hard pixel edges

### 2.3 负面词（每次必贴，gen_pixel_art.py `NEGATIVE` 原文）

- **中**：无文字、无水印、无界面元素、无光标、无抗锯齿、无模糊、无渐变、无柔和阴影
- **EN**: no text, no watermark, no UI elements, no cursor, no badge, no interface, no anti-aliasing, no blurry, no gradient, no soft shading, no 3D render, no photorealistic
- v1 补充版（供手动平台用）：抗锯齿、模糊、柔和阴影、渐变、3D渲染、照片、高细节、文字、水印、边框 / anti-aliasing, blurry, soft shading, gradient, smooth, 3D render, photorealistic, high detail, text, watermark, border, noise

### 2.4 透明底约定（品红抠像）

所有精灵/图标提示词以「**纯品红色背景（solid magenta background）**」结尾；管线用 chroma_key 抠透明（`tools/gen_pixel_art.py:285`，左上角取样+高饱和品红兜底）。tile 类可平铺素材用「满幅 edge-to-edge」，不抠透明。

### 2.5 平台与参数

| 平台 | 用法 | 参数 |
|---|---|---|
| **项目标准管线**（首选） | `python3 tools/gen_pixel_art.py --only <id...>`（qwen-image-3.0-pro，1024²，自动 NEAREST 降采样+≤24 色量化+品红抠透） | 需 `.secrets/qwen.key`；单张约 50s；失败自动重试 3 次 |
| aigc_image 插件（备用） | qwen-image-3.0-pro，`prompt_extend=false` 锁词，512×512 起稿 | **必须 n=1 串行**（n>1 共用时间戳文件名互相覆盖，2026-11-18 实测坑）；LANCZOS 降采样 |
| Midjourney | 提示词 EN 末尾加 `--v 7 --style raw --ar 1:1`，负面词并入 `--no text, watermark, anti-aliasing, gradient, 3D render` | 无透明通道：保留品红底 → Aseprite/Photopea 手动 nearest 下采样+抠像 |
| Stable Diffusion | pixel-art LoRA（权重 0.8–1.0），512²，CFG 7，采样 25–30 步 | 出图后 quantize ≤24 色 |
| 即梦（Jimeng） | 图片 3.0，1:1，关闭「提示词优化」 | 同样品红底 + 手动下采样 |

### 2.6 落盘与导入检查（每张必做）

1. 文件名/路径严格按 §4/§5 表（PNG）→ 放 `assets/textures/<分组>/<id>.png`
2. Cocos 编辑器 refresh 生成 `.meta` 后**必查两处**（默认值对像素画是错的，2026-11-18 实测坑）：
   - `subMetas.6c48a.userData.minfilter/magfilter = "nearest"`
   - `subMetas.f9941.userData.trimType = false`
   - 样板：`tiles/ground_grass.png.meta`；改完再 refresh 验证设置存活
3. 自动接 auto atlas + pngquant 8-bit（包体预算：新增 UI 图标约 12–20KB，对首包 ≤4MB 预算无实质影响）

---

## 3. 验收四查（生成后自查，v1 约定延续）

1. 透明背景（品红抠净，无白/黑底残留）
2. 主体一个、居中、四周留 2px 余量
3. 缩到目标尺寸后无杂色（有 → Aseprite/Photopea 修或重roll）
4. 描边色接近 `#2a1f16`（UI 图标为深色底时检查金色 `#F2C14E` 强调是否到位）

**结构性图形的特别规则**（V2 定稿教训）：32² 终尺寸的**结构型**图形（石块/砖缝/木纹/九宫格面板）**程序化绘制优于 AI 直出**；**颗粒型**纹理（草/水/沙）AI 可用但须点名具体色值与占比。因此 §5.2 九宫格首选程序绘制。

---

## 4. MVP 素材总册（全量索引，逐 id 对齐 catalogs）

> 状态：✅=已产出且在 SpriteLib（重抽直接跑管线对应 id）；🆕=缺口（提示词见本文 §5/§6）；△=可选增强。重抽现有素材时提示词以 `tools/gen_pixel_art.py --list` 为准，本文不重复抄录。

### 4.1 作物（crops.json 全 8 id；可生长 4+1 种 ×3 阶段，32px）

| 作物 id | 名 | 阶段素材 | 状态 | 图标（16px） | 状态 |
|---|---|---|---|---|---|
| carrot | 胡萝卜 | crops/carrot_0..2 | ✅ | ui/icon_carrot | ✅ |
| tomato | 番茄 | crops/tomato_0..2 | ✅ | ui/icon_tomato | ✅ |
| pumpkin | 南瓜 | crops/pumpkin_0..2 | ✅ | ui/icon_pumpkin | ✅ |
| moonflower | 月光花（稀有，秋/冬） | crops/moonflower_0..2 | ✅ | ui/icon_moonflower | ✅ |
| frostbell/honeyplot/spikepumpkin/podgun | 防守作物 | 见 §6 | 🆕/✅ | —（防守板直接用精灵） | — |

> 种子图标：全种子共用 `ui/icon_seed`（BackpackPanel.ts:115 `id.endsWith('_seed')` 泛化匹配），**不需要**逐作物种子图标。金币 `ui/icon_gold` ✅。

### 4.2 怪物（monsters.json 全 3 id，32px；精英 48px）

| id | 名 | 素材 | 状态 |
|---|---|---|---|
| slime | 林地粘怪 | monsters/slime + slime_idle | ✅ |
| slime_elite | 巨粘怪（精英=紫色+小皇冠） | monsters/slime_elite | ✅ |
| sporeling | 孢子菇 | monsters/sporeling + sporeling_idle | ✅ |

风格红线：滑稽化不恐怖（Batch 2 定约，提示词里「goofy not scary」必须保留）。

### 4.3 NPC（npc_dialogs.json 全 2 名，现网 48px；V2 重抽约定 64px）

| id | 名 | 素材 | 状态 |
|---|---|---|---|
| gardener | 园艺师·温妮 | npc/npc_gardener | ✅ |
| gatekeeper | 守门人·布莱克 | npc/npc_gatekeeper | ✅ |

重抽提示词（64px 版）见 `world-v2-asset-prompts.md` §3。⚠ 命名勘误：该文档把守门人写作「老石」，数据真源 `npc_dialogs.json:15` 为「守门人·布莱克」，以数据为准（见 §8 Handoff）。

### 4.4 主角（32px×3；无左向素材——`PlayerCharacter.ts:80` 对 right 帧做 fx=-1 运行时翻转，**不要**补 player_left）

player_down / player_up / player_right ✅（提示词 gen_pixel_art.py `player_*`）。

### 4.5 家具（furniture.json 全 8 个独立 id；重复条目共用素材）

| id | 名 | px | 素材 | 状态 |
|---|---|---|---|---|
| bed | 木头床 | 48 | decor/bed | ✅ |
| fireplace | 石壁炉 | 48 | decor/fireplace | ✅ |
| cabinet | 木柜 | 48 | decor/cabinet | ✅ |
| window_f | 木窗 | 32 | decor/window_f | ✅（房间放两扇共用一张） |
| table | 木桌 | 32 | decor/table | ✅ |
| chair | 木椅 | 32 | decor/chair | ✅ |
| rug | 圆地毯 | 48 | decor/rug | ✅ |
| plant_pot | 盆栽 | 32 | decor/plant_pot | ✅（两盆共用一张） |

### 4.6 tileset（32px，tile 类=满幅可平铺）

| id | 用途 | 状态 | 备注 |
|---|---|---|---|
| ground_grass | 农场草地 | ✅ | 调色板锚取样源 |
| plot_soil / plot_soil_wet | 耕地/湿土 | ✅ | 浇水视觉反馈 |
| ground_forest | 旧林地地面 | ✅ | 比草地更深更暗 |
| ground_water | 河水 | ✅ | AI 直出（V2） |
| ground_sand | 沙滩/河岸 | ✅ | AI 底图+程序撒粒定稿 |
| ground_stone | 石板路 | ✅ | 纯程序鹅卵石定稿 |

### 4.7 探险物件/防守地标（32–64px）

bush_berry / herb_patch / wood_log / barn(64) / tower_pea(32，podgun 塔用) / dungeon_gate(64) / world_seal(64) / fish_bite(32) — 全部 ✅。

### 4.8 物品与鱼图标（16px）

已产出 ✅：icon_gold、icon_seed、icon_carrot、icon_tomato、icon_pumpkin、icon_moonflower、icon_berry、icon_herb、icon_wood、icon_gel、icon_crucian、icon_perch、icon_moonfish、icon_sword、icon_attack、icon_roll、icon_tower。
缺口 🆕（低优先，见 §5.4）：`icon_spore_cap`、`icon_stone`——items.json 有此二物但无图标且未接线（掉落与背包显示为色块/无图标）。

---

## 5. 缺口 A：世界 HUD UI 图标（ui-notes §10 Handoff 正式回执，全新 12 件）

> 尺寸/位置/热区规格已由 UI 拍板（ui-notes §4.2/§4.3/§5.3：坞槽 88px 热区、图标视觉居中、齿轮/背包视觉 56px）。本文只负责**提示词与素材规格**；接线（SpriteLib CORE 增项、ToolDockUI/SettingsPanel/WorldLiving 换 Sprite）归 engineering-software-architect。
> 管线：全部走 §2.5 标准管线；正向提示词一律追加 §2.2 UI 后缀；负面词 §2.3；品红底抠透。

### 5.1 工具坞槽位图标 ×6（32×32，落入 `assets/textures/ui/`）

| # | 文件名 | 语义 | 提示词（中） | Prompt (EN) |
|---|---|---|---|---|
| 1 | icon_tool_hoe.png | 锄 | 像素画图标，16位复古农场游戏工具坞图标，斜置农具锄头，棕色木柄，银灰色扁刃锄板指向左下，深棕描边，纯品红背景 | pixel art icon, 16-bit retro farm game UI, tilted garden hoe, brown wooden handle, steel-grey flat blade pointing lower-left, dark outline, isolated on solid magenta background |
| 2 | icon_tool_shovel.png | 铲 | 像素画图标，16位复古农场游戏工具坞图标，斜置圆头铁铲，棕色木柄带挡手，银灰圆铲头指向右下，深棕描边，纯品红背景 | pixel art icon, 16-bit retro farm game UI, tilted round-head spade shovel with brown wooden handle and steel grey round blade pointing lower-right, dark outline, isolated on solid magenta background |
| 3 | icon_tool_pave.png | 铺 | 像素画图标，16位复古农场游戏工具坞图标，三块灰色方形石板路砖对角排列成小阶梯状，砖缝清晰，深棕描边，纯品红背景 | pixel art icon, 16-bit retro farm game UI, three grey square stone path slabs arranged diagonally like a small staircase with visible seams, dark outline, isolated on solid magenta background |
| 4 | icon_tool_bridge.png | 桥 | 像素画图标，16位复古农场游戏工具坞图标，一小段俯视木桥，两块棕色木板横铺在窄蓝色水条上，木板带钉点，深棕描边，纯品红背景 | pixel art icon, 16-bit retro farm game UI, small wooden bridge segment top-down, two brown planks with nail dots across a narrow blue water strip, dark outline, isolated on solid magenta background |
| 5 | icon_tool_stairs.png | 梯 | 像素画图标，16位复古农场游戏工具坞图标，三级棕色木质台阶自左下向右上逐级升高，每级顶面有深色棱线，深棕描边，纯品红背景 | pixel art icon, 16-bit retro farm game UI, three wooden steps rising from lower-left to upper-right, each step top edged with a darker line, dark outline, isolated on solid magenta background |
| 6 | icon_tool_undo.png | 撤销 | 像素画图标，16位复古农场游戏工具坞图标，逆时针弯转的粗箭头指向左，暖珊瑚橙色箭身（警示色系），深棕描边，纯品红背景 | pixel art icon, 16-bit retro farm game UI, bold counter-clockwise curved arrow pointing left, warm coral-orange body as warning accent, dark outline, isolated on solid magenta background |

> 撤销=破坏性操作（ui-notes §3.5），箭身用 `ui/alert #FF6060` 系；其余 5 件主体用木棕/钢灰+金色小点缀。

### 5.2 九宫格面板底 ×2（48×48 切片，落入 `assets/textures/ui/`）——**首选程序绘制**

按 §3 结构性图形规则，48×48 圆角描边面板用 AI 直出易糊角，**首选 20 行 PIL/Cocos Graphics 程序绘制**（规格如下，可直接实现）：

| 参数 | panel_dark.png（常态） | panel_dark_sel.png（选中态） |
|---|---|---|
| 画布 | 48×48，圆角矩形内缩 2px | 同左 |
| 底色 | `#14161F`（ui/panel-dark） | `#14161F` |
| 描边 | `#F2C14E` 2px（ui/gold） | `#F2C14E` 4px + 内侧 1px `#FFECA0`（ui/gold-hi） |
| 圆角 | 16px（四角 16×16 为切片角） | 同左 |
| 中心 | 纯色可拉伸区（16..32） | 同左 |
| 切片 | 九宫格：边 16px（ui-notes §10 原文写 3-slice，按九宫格 16px 边实现，水平/垂直拉伸均安全） | 同左 |
| 角外透明 | 是（品红底抠透或 PIL 直接写 alpha） | 是 |

AI 重抽备用提示词（若坚持走 AI）：
- **中**：像素画 UI 面板九宫格底图，48像素网格，深藏青色圆角矩形面板铺满画面，金色描边，四角 16 像素圆角，中心为纯净深色平面，边缘锐利，纯品红背景外角透明 / **EN**: pixel art UI nine-patch panel base on 48px grid, dark navy rounded rectangle full-bleed with 2px gold border, 16px rounded corners, flat clean center, crisp edges, corners outside isolated on solid magenta background
- panel_dark_sel：同上，把「2px 金描边」换「4px 金描边+内侧 1px 亮金高光线」/「4px gold border plus 1px pale-gold inner highlight line」

### 5.3 顶栏/面板图标（齿轮 56、背包 56、日历芯片 32、关闭 32）

| # | 文件名 | 尺寸 | 提示词（中） | Prompt (EN) |
|---|---|---|---|---|
| 7 | icon_gear.png | 56×56 | 像素画图标，16位复古农场游戏设置图标，圆形钢灰金属齿轮带八个方齿，中心圆孔，轮缘一圈金色高光，深棕描边，纯品红背景 | pixel art icon, 16-bit retro farm game settings gear, round steel gear with eight square teeth, center hole, golden rim highlight, dark outline, isolated on solid magenta background |
| 8 | icon_backpack.png | 56×56 | 像素画图标，16位复古农场游戏背包图标，棕色帆布背包正面，翻盖带金色搭扣，两侧小袋，缝线清晰，深棕描边，纯品红背景 | pixel art icon, 16-bit retro farm game backpack, brown canvas backpack front view with flap and golden buckle, two side pockets, visible stitching, dark outline, isolated on solid magenta background |
| 9 | icon_chip_season.png | 32×32 | 像素画图标，16位复古农场游戏日历芯片图标，小日历页：红色页头横带+米白页面+两行深色日期点，深棕描边，纯品红背景 | pixel art icon, 16-bit retro farm game calendar chip, small calendar page with red header band, cream body and two rows of dark date dots, dark outline, isolated on solid magenta background |
| 10 | icon_close.png | 32×32 | 像素画图标，16位复古农场游戏关闭按钮图标，圆形深藏青底上一笔粗奶白色 X 叉，金色细外环，深棕描边，纯品红背景 | pixel art icon, 16-bit retro farm game close button, bold cream-white X cross on round dark navy disc with thin gold outer ring, dark outline, isolated on solid magenta background |

- 金币芯片：**复用现有 `ui/icon_gold.png`（16px）**，运行时 point 采样整数 ×2=32px 显示，像素无损，不新建文件（省包体与一致性）。若 UI 坚持独立 32px 版：提示词 = gen_pixel_art.py `icon_gold` 原文，尺寸改 32。
- 齿轮/背包在 88×88 热区内居中（视觉 56px，ui-notes §4.3）；生成时主体占画幅 70%±5%，四周留透明余量。

### 5.4 杂项图标 ×2（16px，低优先）

| # | 文件名 | 提示词（中） | Prompt (EN) |
|---|---|---|---|
| 11 | icon_spore_cap.png | 像素画图标，16位复古游戏物品图标，一枚棕色蘑菇伞盖剖面朝上带浅色斑点，深棕描边，纯品红背景 | pixel art icon, 16-bit retro game item icon, single brown mushroom cap seen from below with pale spots, dark outline, isolated on solid magenta background |
| 12 | icon_stone.png | 像素画图标，16位复古游戏物品图标，一块灰色多面小石块带两三个浅色棱面高光，深棕描边，纯品红背景 | pixel art icon, 16-bit retro game item icon, small grey faceted rock with two or three pale facet highlights, dark outline, isolated on solid magenta background |

**接线缺口（同步给 architect，素材外的工作）**：
- `DroppedItem.ts:22-31` `ICON_OF` 增 `spore_cap→'ui/icon_spore_cap'`、`stone→'ui/icon_stone'`（现掉落为白点/灰点色块，`DroppedItem.ts:40-44`）；
- `BackpackPanel.ts:114-126` iconPath 链增同两分支（现背包里无图标可挂）。

---

## 6. 缺口 B：防守作物精灵 ×3（32×32，可选增强，建议随夜战视觉打磨批次做）

> 现状：BuildPanel 修建设防时 3 种作物画纯色块（`BuildPanel.ts:181-183`），仅 podgun 有 tower_pea 精灵（`DefenseOverlay.ts:209`）。功能无碍（颜色已区分塔型），但与其余素材的成品度不一致。提示词按 crops.json 的 defense 语义与现占位色对齐：

| 文件名 | 对应 | 提示词（中） | Prompt (EN) | 占位色对齐 |
|---|---|---|---|---|
| crops/frostbell_0.png | 霜铃花（slow 减速塔） | 像素画防守植物精灵图，16位复古农场游戏，一株冰蓝色铃铛花，细茎垂挂三朵小铃铛花苞，叶面带霜白高光与寒气小晶粒，可爱不恐怖，深棕描边，纯品红背景 | pixel art defense plant, 16-bit retro farm game, icy blue bellflower, three small bell blooms hanging from slender stem, frosty white highlights and tiny ice crystals on leaves, cute not scary, dark outline, isolated on solid magenta background | `Color(120,200,230)` 冰蓝 ✓ |
| crops/honeyplot_0.png | 蜜瓜圃（attract 引诱塔） | 像素画防守植物精灵图，16位复古农场游戏，一小片金黄蜜瓜圃，圆润甜瓜半埋在藤叶间，瓜皮滴着琥珀色糖蜜光泽，散发诱人气息的小星星点缀，可爱不恐怖，深棕描边，纯品红背景 | pixel art defense plant, 16-bit retro farm game, small patch of golden honey melon among vine leaves, melon glossy with amber syrup drips, tiny sparkle stars suggesting sweet scent, cute not scary, dark outline, isolated on solid magenta background | `Color(240,200,90)` 金 ✓ |
| crops/spikepumpkin_0.png | 尖刺南瓜（spike 刺塔） | 像素画防守植物精灵图，16位复古农场游戏，一颗橙色南瓜表面均匀长满深褐色短尖刺，表情倔强呆萌不恐怖，藤叶缠绕底部，深棕描边，纯品红背景 | pixel art defense plant, 16-bit retro farm game, orange pumpkin evenly covered with short dark-brown spikes, stubborn grumpy but comical expression, vine leaves at base, not scary, dark outline, isolated on solid magenta background | `Color(230,140,70)` 橙 ✓ |

> podgun 复用现有 `adventure/tower_pea.png`（DefenseOverlay 已接线）。升级态（lv2）用运行时放大/描边高亮区分即可，**不**另出精灵（守 MVP）。落地时需 DefenseOverlay/BuildPanel 把色块分支换 SpriteLib 取图——归 architect。

---

## 7. 每张新素材的交付验收（回归用例）

| # | 检查 | 通过标准 |
|---|---|---|
| A1 | 文件落位 | `assets/textures/ui/<表内文件名>.png`，尺寸=表列 px |
| A2 | meta 两查 | nearest + trimType=false 存活（§2.6） |
| A3 | 透明底 | 品红残留 0 像素；主体四周 ≥2px 透明余量 |
| A4 | 编辑器目检 | 1280×720 预览下：坞槽 88px 中图标清晰无糊边；齿轮/背包 56px 在热区内居中 |
| A5 | 九宫格 | 拉伸到 520×560（背包面板 ui-notes §5.3）后边框不断线、圆角不变形 |
| A6 | 接线回归 | 换图标后：选「铺」连点 6 槽 → 槽切换正常、地面 0 格变化（ui-notes V2 用例）；背包打开→出售→关闭 ≤10s（V11） |
| A7 | 包体 | 新增 PNG 合计 ≤50KB；pngquant 8-bit 后入 auto atlas |

**执行顺序建议**：§5.2（程序绘制，0 成本）→ §5.1（6 件，一次管线跑完）→ §5.3（4 件）→ §5.4/§6（随下个素材批次）。预计 AI 生成 10 张、串行约 10 分钟（单张 ~50s）。

---

## 8. Handoff（与其他角色的对齐项）

**→ engineering-software-architect**：
- §5 全部 UI 图标落地需接线：`SpriteLib.ts:41-46` CORE 增对应键；`ToolDockUI.ts`（6 槽 Graphics 字形换 Sprite）、`SettingsPanel.ts:41-59`（⚙ 换 56px 图标）、`WorldLiving.ts`（WorldHUD 芯片/背包入口）、`BackpackPanel`（关闭钮/面板底九宫格）；
- §5.4 二图标需补 `DroppedItem.ICON_OF`（`DroppedItem.ts:22-31`）与 `BackpackPanel.ts:114-126` 映射；
- §6 需把 `BuildPanel.ts:181-183` / `DefenseOverlay` 色块分支改为 SpriteLib 取图（素材未产出前保持色块兜底，渲染器已有 fallback 机制可复用）。

**→ design-ui-designer**：
- ui-notes §10 给本案的图标清单已全部回执（§5），请确认两点：①金币芯片复用 icon_gold 16px×2 是否接受（§5.3）；②九宫格 3-slice 按 16px 边九宫格实现是否符合预期（§5.2）；
- `panel_dark_sel` 选中态底与 §3.5「gold 实底」定义有歧义：我按「深底+4px 金边+亮金内线」出图（与现 ToolDock 选中语言一致），如需「金实底+深字」变体请回传，我补一条提示词。

**→ game-designer**：
- §6 防守作物精灵是否进本期（建议随夜战视觉打磨批次，非阻塞）；
- 世界场景背包入口在 ui-notes §10 待你拍板（R4）——若拍板新增，§5.3 icon_backpack 素材已备好可直接用。

**→ 协调者（lead）**：
- 文档勘误：`world-v2-asset-prompts.md` §3 守门人名「老石」与数据真源 `npc_dialogs.json:15`「布莱克」不一致，建议下轮由文档所有者改为「布莱克」（我不代改他人文档）；
- 若需要把 Batch 2–6 提示词全文镜像进 md（目前唯一可读全文途径是 `--list`），请明确授权——为维持单一真源我默认不复制。

**未覆盖/未执行声明**：
- 本轮未调用任何生图 API、未生成任何 PNG、未改代码——§5/§6 全部为「待执行」状态，验收按 §7；
- §5.2 九宫格的程序绘制规格未经编辑器实装验证（规格静态推导自 ui-notes §3.3/§5.3）；
- Midjourney/SD/即梦 三平台的参数为通用建议，本项目未实测（生产只走过 qwen-image-3.0-pro 管线）；战斗场景 UI（副本攻击/闪避钮已有 icon_attack/icon_roll）未在本轮范围。
