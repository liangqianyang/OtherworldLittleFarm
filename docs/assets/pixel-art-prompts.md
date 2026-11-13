# 像素素材提示词表 · Batch 1（阶段 2.5）

> 依据：game-design-draft.md §18（AI 生成 + 16/32px 网格 + 中英双语 + 负面词）。
> 用法：任选 AI 生图工具（即梦 / Midjourney / SD+像素LoRA），按每条的提示词生成 →
> **下采样到目标尺寸（最近邻插值）** → 存成 PNG → 放进指定路径 → 告诉我，我用 MCP 接入。
> 中途任何一张不满意都可以重roll，不用凑合。

## 全局风格（每条提示词都要带）

**统一调色板（暖色农场系，≤24 色）：**

| 用途 | 参考色 |
|---|---|
| 土壤 | `#4a3020` `#6b4a2e` `#8a6a42` |
| 草地 | `#3e6b35` `#5a8a46` `#7cab5e` |
| 强调金（成熟/金币） | `#f2c14e` `#e8983a` |
| 描边（所有物体统一） | `#2a1f16` |

**中文负面词（每次都贴）：**
> 抗锯齿、模糊、柔和阴影、渐变、3D渲染、照片、高细节、文字、水印、边框

**英文负面词：**
> anti-aliasing, blurry, soft shading, gradient, smooth, 3D render, photorealistic, high detail, text, watermark, border, noise

**通用要求（写进正向提示词）：**
> 像素画、16位复古游戏风格、单一主体居中、透明背景、干净硬边、无抗锯齿

**验收四查**（生成后自查）：
1. 透明背景（不是白底黑底）
2. 主体一个，居中，四周留 2px 余量
3. 缩小到目标尺寸后无杂色（有就用 Aseprite/Photopea 手修或重roll）
4. 描边色接近 `#2a1f16`（色系统一比单张好看重要）

---

## A. 地块与地皮 → `assets/textures/tiles/`

### A1 `ground_grass.png` — 农场草地（32×32，可无缝平铺）
- **中**：像素画，16位复古农场游戏草地地砖，深浅两种绿色短草纹理，均匀分布，可无缝拼接，无花朵无装饰，顶部俯视图
- **EN**: pixel art, 16-bit retro farm game grass tile, top-down view, two-tone green short grass texture, evenly distributed, seamlessly tileable, no flowers no decorations
- **尺寸**：32×32 · **渲染**：×2 = 64px 平铺

### A2 `plot_soil.png` — 空耕地（32×32）
- **中**：像素画，16位复古农场游戏耕地面板，俯视正方形深棕色泥土地，边缘有浅色木质边框，内部有几道横向犁沟纹理
- **EN**: pixel art, 16-bit retro farm game soil plot, top-down square, dark brown tilled dirt, light wooden border frame, horizontal plow furrows inside
- **尺寸**：32×32 · **渲染**：×4 = 128px（放 150px 格子中留边）

### A3 `plot_soil_wet.png` — 浇过水的耕地（32×32）
- 同 A2，但泥色更深（湿润感）：把「深棕色」换「深褐色湿润泥土，带轻微光泽点」/ dark brown wet soil, slightly glossy pixels
- **尺寸**：32×32

---

## B. 胡萝卜生长期 → `assets/textures/crops/`

> 胡萝卜 growDays=2，3 个阶段。提示词里保持**同一株胡萝卜**的描述一致性：
> 都写「单株胡萝卜，顶部俯视偏 45 度视角，深棕土壤背景上仅露出地上部分」。

### B1 `carrot_0.png` — 发芽（32×32）
- **中**：像素画，16位复古农场游戏，单株胡萝卜嫩芽，两片小绿叶从土壤中冒出，非常小，居中
- **EN**: pixel art, 16-bit retro farm game, single carrot sprout, two tiny green leaves emerging from soil, very small, centered
- **尺寸**：32×32

### B2 `carrot_1.png` — 生长中（32×32）
- **中**：像素画，16位复古农场游戏，半熟的胡萝卜植株，一簇绿色羽状叶子明显长大，土里微微露出橙色胡萝卜头顶
- **EN**: pixel art, 16-bit retro farm game, growing carrot plant, cluster of green feathery leaves larger, tip of orange carrot barely visible above soil
- **尺寸**：32×32

### B3 `carrot_2.png` — 成熟（32×32）
- **中**：像素画，16位复古农场游戏，成熟的胡萝卜，茂盛的绿色羽状叶 + 半根橙色胡萝卜露出土壤，颜色鲜艳诱人
- **EN**: pixel art, 16-bit retro farm game, mature carrot ready to harvest, lush green feathery leaves, half of bright orange carrot exposed above soil, vivid and appealing
- **尺寸**：32×32

---

## C. 物品图标 → `assets/textures/ui/`

### C1 `icon_gold.png` — 金币（16×16）
- **中**：像素画，16位复古游戏金币图标，圆形金色硬币，中间有简单星形或圆点浮雕，金色+深色描边
- **EN**: pixel art, 16-bit retro game gold coin icon, round golden coin, simple star or dot emboss in center, gold with dark outline
- **尺寸**：16×16 · **渲染**：×3 = 48px（HUD/背包）

### C2 `icon_seed.png` — 胡萝卜种子包（16×16）
- **中**：像素画，16位复古游戏种子袋图标，小牛皮纸种子袋，袋口折叠，正面画着一个橙色小胡萝卜图案
- **EN**: pixel art, 16-bit retro game seed packet icon, small kraft paper bag, folded top, tiny orange carrot drawing on front
- **尺寸**：16×16

### C3 `icon_carrot.png` — 胡萝卜（收获物）（16×16）
- **中**：像素画，16位复古游戏物品图标，一根完整的橙色胡萝卜，绿色缨子朝上，斜置
- **EN**: pixel art, 16-bit retro game item icon, one full orange carrot with green top, slightly tilted
- **尺寸**：16×16

---

## Batch 2（暂不做，防 scope 膨胀）
- HUD 按钮九宫格框 / 面板底 / 弹窗遮罩纹理
- 番茄/南瓜/月光花（种子商店扩品时）
- 角色立绘 / 怪物 / 探险区 tileset（阶段 3）
- 位图数字字体（阶段 5 平台验证前）

## 生成后的接入流程（我来做）
1. 文件放进上表路径（PNG，文件名严格按表）
2. 我用 MCP 刷新 → 检查 → 纹理过滤改 point 采样（保像素锐利）→ auto-atlas 图集
3. PlotView 改为 Sprite 渲染（地块/湿土/三阶段），FarmHUD/背包换图标
4. crops.json stages 填真实路径
5. pngquant 压 8-bit → 提交 → 预览验收
