# 《异界小农场 2.0》V1.0 美术素材需求清单与国风绘本 AI 提示词表

> 适用版本：V1.0 主岛完整闭环 + 室内基础 + 幽篁古墟地牢 + 精美卷轴 UI
> 引擎与包体目标：Cocos Creator 3.8.8 · 1280×720 横屏 · 2.5D 斜俯视（3/4 视角）· 首包 ≤ 4 MB
> 命名约定：全部严格对齐 `plants.json`、`fish.json`、`weapons.json` 中的实体 `id`，便于 `DataManager` 自动拼路径加载。

## 一、统一画风总控提示词（所有出图必带）

为了让上百张 AI 素材拼在一起像同一位画师画的，所有生成任务均采用“统一画风前缀 + 主体描述 + 视角/构图约束 + 统一负面词”四段式结构。

### 1. 通用画风前缀（`STYLE_PREFIX`）

> `Chinese fantasy picture-book illustration style, guofeng hand-painted watercolor with delicate clean ink-wash outlines, warm soft mineral pigments (celadon green, parchment cream, warm timber brown, jade teal, subtle cinnabar red accents), cozy poetic Eastern pastoral mood, soft daylight, crisp readable silhouette, game asset sprite`

### 2. 场景物件/角色专用白底抠图后缀（`SPRITE_SUFFIX`）

> `2.5D 3/4 top-down oblique game perspective, isolated single object centered on a pure solid white background (#FFFFFF), clean edges for easy alpha cutout, soft subtle ground contact shadow only, no extra clutter`

### 3. 图标/武器/鱼类专用后缀（`ICON_SUFFIX`）

> `centered clean 2D game inventory icon on pure solid white background (#FFFFFF), delicate ink outline, luminous watercolor shading, crisp readability at small size`

### 4. 统一负面词（`NEGATIVE_PROMPT`）

> `pixel art, 8-bit, 16-bit, photorealistic, 3D render, blender, unreal engine, blurry, noisy texture, messy background, text, watermark, signature, logo, UI frame, multiple objects, cropped edge, harsh black shadows, anime cel-shading`

## 二、主岛地表与环境物件（`main` 首包）

*说明：地表类需在生成后用工具做无缝平铺校验（Seamless Tile）；建筑与开荒物件导出为透明底 PNG，Cocos 中锚点统一设为脚底 `(0.5, 0.1)` 配合 `Y-Sort`。*

| 资产命名 | 归属目录 | 导出尺寸 (px) | 锚点 / 规格 | 核心 AI 提示词（拼接 `STYLE_PREFIX` + 对应后缀） | 
| ----- | ----- | ----- | ----- | ----- | 
| `tile_grass_base.png` | `main/tiles/` | 256×256 | 无缝平铺 | `seamless top-down hand-painted soft celadon meadow grass ground texture, very subtle watercolor brush variation, tiny sparse clover dots, calm low-contrast background` | 
| `tile_stone_path.png` | `main/tiles/` | 256×256 | 无缝平铺 | `seamless top-down hand-painted warm grey-cream flagstone garden path, rounded hand-laid cobblestones with soft moss seams, clean low-noise watercolor` | 
| `tile_soil_dry.png` | `main/tiles/` | 128×128 | 耕地单格 | `top-down 2.5D fertile tilled farm soil patch, warm umber earth with soft hand-drawn furrows and rounded organic grass edge, isolated on white` | 
| `tile_soil_wet.png` | `main/tiles/` | 128×128 | 耕地湿润态 | `top-down 2.5D freshly watered dark rich moist farm soil patch with tiny watercolor sheen, rounded organic edge, isolated on white` | 
| `tile_water_f1.png` / `f2.png` | `main/tiles/` | 256×256 | 2 帧无缝水波 | `seamless top-down translucent jade-teal river water texture with gentle pale celadon hand-painted ripple highlights, serene watercolor` | 
| `bld_cottage.png` | `main/buildings/` | 512×512 | `(0.5, 0.12)` | `cozy traditional Chinese wooden farm cottage with dark grey curved clay tile roof, warm glowing paper lanterns under eaves, small wooden porch, bamboo window lattice` + `SPRITE_SUFFIX` | 
| `bld_seal_arch.png` | `main/buildings/` | 512×512 | `(0.5, 0.1)` | `ancient weathered stone archway monument carved with softly glowing cyan and gold Eastern runes, wrapped with moss and spirit vines, mystical seal gate` + `SPRITE_SUFFIX` | 
| `bld_dungeon_portal.png` | `main/buildings/` | 384×384 | `(0.5, 0.1)` | `mystical carved jade-stone secret realm gate surrounded by swirling pale teal mist and floating spirit fireflies, entrance to otherworld` + `SPRITE_SUFFIX` | 
| `bld_shipping_box.png` | `main/buildings/` | 192×192 | `(0.5, 0.15)` | `charming traditional wooden harvest shipping crate with iron clasps and a small red paper talisman tag` + `SPRITE_SUFFIX` | 
| `bld_old_dock.png` | `main/buildings/` | 512×384 | `(0.5, 0.2)` | `weathered broken wooden riverfront fishing pier and old boat dock with frayed ropes and mossy pilings, waiting to be repaired` + `SPRITE_SUFFIX` | 
| `prop_bridge_wood.png` | `main/props/` | 384×256 | `(0.5, 0.5)` | `charming arched traditional Eastern wooden garden bridge with simple timber railings spanning horizontally` + `SPRITE_SUFFIX` | 
| `clear_t1_bush.png` | `main/clearing/` | 192×192 | 一阶开荒 | `wild overgrown pastoral shrub bush with dry twigs and small mossy pebbles, tier-1 clearable farm obstacle` + `SPRITE_SUFFIX` | 
| `clear_t2_ironwood.png` | `main/clearing/` | 256×320 | 二阶开荒 | `sturdy dark-barked ancient ironwood tree with dense emerald canopy and metallic sheen on trunk, tier-2 clearable tree` + `SPRITE_SUFFIX` | 
| `clear_t2_bluestone.png` | `main/clearing/` | 192×192 | 二阶开荒 | `cluster of heavy mossy blue-grey mountain boulders with faint mineral veins, tier-2 clearable rock` + `SPRITE_SUFFIX` | 
| `clear_t3_crystal_root.png` | `main/clearing/` | 256×320 | 三阶开荒 | `gnarled ancient spirit tree roots entwined around glowing cyan crystal boulders, tier-3 end-game farm obstacle` + `SPRITE_SUFFIX` | 

## 三、主角与 4 位核心 NPC（`main` 首包）

*说明：主角建议先出“正面/背面/侧面”三视图定型，再拆为头、身、手（带武器挂点）轻量部件，配合程序化呼吸与行走弹跳，省去数十帧逐帧重绘。*

| 资产命名 | 归属目录 | 导出尺寸 (px) | 角色定位 | 核心 AI 提示词（拼接 `STYLE_PREFIX` + `SPRITE_SUFFIX`） | 
| ----- | ----- | ----- | ----- | ----- | 
| `char_player_sheet.png` | `main/actors/` | 512×256 | 主角三视图 | `character turnaround sheet (front, side, back views) of a cute chibi young Eastern adventurer-farmer wearing light celadon linen tunic, woven bamboo straw hat on back, brown boots, warm friendly expression, clean white background` | 
| `npc_lubo.png` | `main/actors/` | 256×256 | 老花匠·陆伯 | `cute chibi kind elderly Chinese gardener grandpa with white beard, straw hat, rolled sleeves, holding a bamboo watering ladle and seed pouch` + `SPRITE_SUFFIX` | 
| `npc_jianglao.png` | `main/actors/` | 256×256 | 垂钓翁·江老 | `cute chibi cheerful old Chinese fisherman wearing a woven bamboo rain cloak (suoyi) and conical hat, holding a slender bamboo fishing rod` + `SPRITE_SUFFIX` | 
| `npc_xuanmo.png` | `main/actors/` | 256×256 | 守印人·玄墨 | `cute chibi calm mysterious Eastern seal keeper in dark indigo-and-gold Daoist-inspired scholar robe, holding a glowing jade compass tablet` + `SPRITE_SUFFIX` | 
| `npc_atang.png` | `main/actors/` | 256×256 | 货郎船匠·阿棠 | `cute chibi lively young traveling merchant and boatbuilder girl in warm cinnabar-red vest, carrying a woven backpack filled with scrolls, lanterns and wooden tools` + `SPRITE_SUFFIX` | 

## 四、V1.0 首批 12 种奇幻灵植（对齐 `plants.json`）

*说明：每种灵植需 1 张种子/果实图标（`128×128`）和 2\~3 张田间/防线生长精灵（幼苗可共用 2 套通用幼苗图省体积，重点画好每株的**成熟/防线形态 `160×160`**）。*

| 对应 `plants.json` ID | 命名规则 | 尺寸 (px) | 视觉记忆点与核心提示词（拼接 `STYLE_PREFIX` + `SPRITE_SUFFIX`） | 
| ----- | ----- | ----- | ----- | 
| 通用幼苗 ×2 | `plant_sprout_01/02.png` | 128×128 | `tiny fresh tender green herbal sprout with two dewdrop leaves emerging from earth` | 
| `spring_greens` | `plant_spring_greens_mature.png` | 128×128 | `lush crisp emerald leafy Chinese bok choy greens glistening with morning dew` | 
| `golden_rice` | `plant_golden_rice_mature.png` | 160×160 | `abundant stalks of golden glowing spirit rice heavy with luminous grain ears` | 
| `jade_melon` | `plant_jade_melon_mature.png` | 160×160 | `translucent jade-green round fantasy winter melon nestled on curly vines with pale blossoms` | 
| `winter_radish` | `plant_winter_radish_mature.png` | 128×128 | `plump snow-white glowing spirit radish peeking out of soil with crisp frosty green leaves` | 
| `thunder_potato` | `plant_thunder_potato_mature.png` | 160×160 | `quirky plump glowing fiery-orange potato tuber with tiny spark cracks and crackling ember sprout, fantasy explosive potato` | 
| `cloud_bamboo_shoot` | `plant_cloud_bamboo_shoot_mature.png` | 160×192 | `cute sentient pointed emerald bamboo shoot with tiny arched wooden bow-like leaves aiming upward, fantasy archer plant` | 
| `frost_melon` | `plant_frost_melon_mature.png` | 160×160 | `icy pale-blue frosted fantasy melon surrounded by delicate swirling snowflake mist and crystal leaves` | 
| `spirit_tea` | `plant_spirit_tea_mature.png` | 160×160 | `elegant luminous celadon tea bush with floating golden-green spirit tea leaves and soft healing aura` | 
| `sky_bamboo` | `plant_sky_bamboo_mature.png` | 160×256 | `tall sturdy glowing jade bamboo column topped with a flat woven lotus-leaf platform sturdy enough to hold another plant on top` | 
| `flame_pepper` | `plant_flame_pepper_mature.png` | 160×160 | `vibrant twisting vine heavy with glowing vermilion-red chili peppers radiating warm ember wisps` | 
| `water_lotus` | `plant_water_lotus_mature.png` | 160×160 | `serene blooming pale-cyan spirit lotus flower floating over a small shimmering puddle of pure spring water` | 
| `thunder_grass` | `plant_thunder_grass_mature.png` | 160×160 | `spiky violet-gold spirit grass blades crackling with tiny bright blue-white lightning arcs at the tips` | 

## 五、V1.0 首批 12 种分河段鱼类（对齐 `fish.json`）

*说明：统一导出 `128×128` 透明底 PNG，用于背包、钓鱼弹出、图鉴与室内鱼缸缩小复用；拼接 `STYLE_PREFIX` + `ICON_SUFFIX`。*

| 河段 | 资产命名 | 鱼名 | 核心主体描述 | 
| ----- | ----- | ----- | ----- | 
| 上游寒溪 | `fish_jade_minnow.png` | 青玉溪鱼 | `slender translucent celadon-jade brook minnow with delicate silver fins` | 
| 上游寒溪 | `fish_silver_trout.png` | 银鳞溪鳟 | `graceful shimmering silver mountain trout with faint teal watercolor speckles` | 
| 上游寒溪 | `fish_thunder_eel.png` | 惊蛰雷鳗 | `coiled mystical indigo river eel with crackling golden-cyan lightning whiskers` | 
| 上游寒溪 | `fish_frost_char.png` | 寒泉雪鳟 | `frosty ice-blue arctic char fish with crystalline translucent tail fin` | 
| 中游荷塘 | `fish_amber_loach.png` | 琥珀泥鳅 | `cute plump warm amber-brown pond loach with tiny whiskers` | 
| 中游荷塘 | `fish_crimson_koi.png` | 胭脂锦鲤 | `elegant plump cinnabar-red and ivory white ornamental koi carp with flowing silk-like fins` | 
| 中游荷塘 | `fish_lotus_crucian.png` | 白露莲鲫 | `round rosy-pink crucian carp carrying a tiny pink lotus petal shimmer on its scales` | 
| 中游荷塘 | `fish_moon_carp.png` | 望月灵鲤 | `luminous pearl-white mystical carp with soft golden crescent moon markings on its back` | 
| 下游入海口 | `fish_silver_whitebait.png` | 河口银鱼 | `trio of tiny crystal-clear shimmering estuary whitebait fish` | 
| 下游入海口 | `fish_tide_grouper.png` | 潮汐石斑 | `stout deep-teal and bronze patterned sea grouper fish with swirling wave stripes` | 
| 下游入海口 | `fish_moon_jelly.png` | 月光水母 | `delicate glowing pale-cyan translucent jellyfish with trailing luminous ribbons` | 
| 下游入海口 | `fish_storm_bass.png` | 惊涛灵鲈 | `powerful slate-blue and gold sea bass surrounded by tiny white seafoam splashes` | 

## 六、室内雅居与首批家具（`main` 首包 + `bundle_decor`）

*说明：室内场景用一张完整底图（`1280×720`，留白地板网格区）+ 独立可摆放家具精灵，既省内存又有极致绘本感。*

| 资产命名 | 尺寸 (px) | 占格 | 核心 AI 提示词（拼接 `STYLE_PREFIX` + 对应后缀） | 
| ----- | ----- | ----- | ----- | 
| `indoor_room_base.png` | 1280×720 | 室内底图 | `2.5D 3/4 oblique cutaway interior of an empty cozy traditional Chinese wooden cottage room, warm polished wooden plank floor, lattice paper windows on north and west walls, warm sunlight shafts, completely empty floor ready for furniture placement` | 
| `furn_bed_wood.png` | 256×256 | 2×2 | `carved warm timber Chinese canopy-less daybed with patchwork celadon-and-cream silk quilt and pillows` + `SPRITE_SUFFIX` | 
| `furn_stove_clay.png` | 256×256 | 2×2 | `charming traditional rustic stone-and-clay kitchen stove with a black iron wok simmering glowing herbal soup and warm glowing firewood below` + `SPRITE_SUFFIX` | 
| `furn_screen_ink.png` | 256×256 | 2×1 | `traditional four-panel wooden folding screen painted with soft misty ink-wash mountains and pine trees` + `SPRITE_SUFFIX` | 
| `furn_lantern_rabbit.png` | 128×128 | 1×1 | `adorable glowing jade-white Mid-Autumn rabbit-shaped paper table lantern sitting on a tiny carved stool` + `SPRITE_SUFFIX` | 
| `furn_aquarium_porcelain.png` | 192×192 | 1×1 | `ornate celadon-glazed porcelain tabletop glass aquarium glowing softly with water plants inside` + `SPRITE_SUFFIX` | 
| `furn_tea_table.png` | 192×160 | 2×1 | `low wooden Eastern tea table with a celadon teapot, two tiny teacups and a small bamboo scroll` + `SPRITE_SUFFIX` | 
| `furn_herb_rack.png` | 192×256 | 1×1 | `wooden wall-standing herbal cabinet and hanging rack with dried spirit herbs and glazed spice jars` + `SPRITE_SUFFIX` | 
| `furn_rug_lotus.png` | 256×160 | 2×1 | `flat woven celadon-and-gold brocade floor rug with subtle lotus border pattern, top-down 2.5D` + `SPRITE_SUFFIX` | 

## 七、异世界地牢“幽篁古墟”与 8 把武器（`bundle_dungeon` 分包）

### 1. 地牢环境与怪物

| 资产命名 | 尺寸 (px) | 用途 | 核心 AI 提示词（拼接 `STYLE_PREFIX` + 对应后缀） | 
| ----- | ----- | ----- | ----- | 
| `dg_bamboo_floor.png` | 256×256 | 房间地板 | `seamless top-down ancient mossy jade-slate temple ruin floor tiles with subtle carved cloud motifs, muted cool teal-grey watercolor` | 
| `dg_bamboo_wall.png` | 256×256 | 房间墙壁 | `2.5D 3/4 oblique ancient weathered stone ruin wall segment overgrown with glowing green bamboo stalks and spirit moss` + `SPRITE_SUFFIX` | 
| `dg_cracked_wall.png` | 192×192 | 可炸裂暗墙 | `weathered ruin stone wall block with bright glowing amber cracks showing hidden secret room behind, destructible wall` + `SPRITE_SUFFIX` | 
| `dg_chest_antique.png` | 192×192 | 战利品宝箱 | `ornate bronze-and-lacquer Chinese antique treasure chest glowing softly with golden light` + `SPRITE_SUFFIX` | 
| `mob_ink_spirit.png` | 192×192 | 墨灵（远程） | `cute mischievous floating ink-drop ghost spirit with expressive brush-stroke eyes and trailing black watercolor ink wisps` + `SPRITE_SUFFIX` | 
| `mob_talisman_golem.png` | 192×192 | 符纸傀儡（追击） | `quirky animated little clay-and-scroll golem with a fluttering yellow cinnabar paper talisman stuck on its forehead` + `SPRITE_SUFFIX` | 
| `mob_bamboo_imp.png` | 192×192 | 竹精（冲刺） | `playful tiny green bamboo-segment forest imp wearing a leaf hat and holding a mini bamboo spear` + `SPRITE_SUFFIX` | 
| `boss_ruin_guardian.png` | 384×384 | 关底首领·古墟石灵 | `imposing yet charming giant mossy ancient stone-and-jade guardian spirit floating with rotating bronze Bagua rings and glowing teal rune core` + `SPRITE_SUFFIX` | 

### 2. 8 把国风奇幻武器（对齐 `weapons.json`，统一 `128×128` 透明底 PNG）

*全部拼接 `STYLE_PREFIX` + `ICON_SUFFIX`。*

| 资产命名 | 武器名 | 核心主体描述 | 
| ----- | ----- | ----- | 
| `wp_bamboo_sword.png` | 青竹剑 | `elegant emerald-green jade-bamboo straight sword with red silk tassel on hilt, angled diagonally` | 
| `wp_soul_fan.png` | 镇魂折扇 | `ornate open Chinese folding fan with dark bamboo ribs, ink-wash cloud painting and faint teal wind aura` | 
| `wp_talisman_pistol.png` | 连发符箓枪 | `whimsical Eastern wooden-and-brass mechanical hand launcher loaded with glowing cinnabar paper talismans` | 
| `wp_zhuge_crossbow.png` | 机关诸葛弩 | `compact ornate traditional Chinese repeating wooden crossbow with bronze gears and jade-tipped bolts` | 
| `wp_bagua_mirror.png` | 八卦聚光镜 | `mystical octagonal antique bronze Bagua mirror with a radiant glowing cyan crystal core in the center` | 
| `wp_thunder_staff.png` | 雷纹灵杖 | `slender carved dark-wood spirit staff topped with intertwined violet-gold lightning grass and crackling sparks` | 
| `wp_thorn_whip.png` | 荆棘藤鞭 | `coiled luminous emerald spirit vine whip dotted with glowing fiery thorns and a carved wooden handle` | 
| `wp_gourd_launcher.png` | 丹火灵葫芦 | `glossy cinnabar-red and gold fantasy calabash gourd with brass nozzle emitting tiny golden ember sparks` | 

## 八、精美卷轴与玉石 UI 组件（`main` 首包，支持九宫格拉伸）

*说明：UI 控件务必使用九宫格（9-slice），一张 256×128 的卷轴图即可拉伸适配背包、图鉴、情报卡、对话等全部弹窗，极大节省包体。*

| 资产命名 | 导出尺寸 (px) | Cocos 规格 | 核心 AI 提示词（拼接 `STYLE_PREFIX` + `ICON_SUFFIX`） | 
| ----- | ----- | ----- | ----- | 
| `ui_panel_scroll.png` | 512×256 | 九宫格弹窗底 | `horizontal unrolled traditional Chinese parchment paper scroll UI panel with warm carved wooden rollers on left and right edges, clean empty center, subtle cloud corner watermark` | 
| `ui_hud_calendar.png` | 384×160 | 左上角节气牌 | `compact ornate wooden-and-parchment top-left game HUD badge with a small round cinnabar seal emblem space on the left and clean blank parchment area on the right` | 
| `ui_btn_jade_circle.png` | 160×160 | 动作圆钮底 | `polished circular celadon-jade game action button with delicate brushed gold rim and soft inner glow, empty center` | 
| `ui_btn_wood_slot.png` | 128×128 | 背包/快捷槽 | `clean rounded-square warm timber inventory slot frame with soft parchment inner background and delicate gold corner trim` | 
| `ui_joystick_base.png` | 256×256 | 摇杆底盘 | `minimalist translucent pale-gold and jade circular virtual joystick ring with subtle compass markings, clean white background` | 
| `ui_joystick_knob.png` | 128×128 | 摇杆圆球 | `smooth translucent warm jade-amber round orb button for virtual joystick center` | 
| `ui_bar_frame.png` | 320×48 | 血量/灵力条框 | `slender horizontal carved bronze-and-wood game health bar frame with clean empty interior` | 

## 九、出图后处理与 Cocos 导入 5 步验收清单

* \[ \] **批量去背检查**：所有物件/角色/武器/UI 图标去背后，在深色和浅色背景上各预览一次，确认边缘无白色毛边。

* \[ \] **透视与比例对齐**：把 `bld_cottage`、`char_player`、`plant_thunder_potato_mature` 摆在同一张草地测试场景里，核对人物高度约为屋门高度的 `65%~75%`、成熟作物约为人物身高的 `45%~60%`。

* \[ \] **图集合批（Auto Atlas）**：按模块分别配置 Auto Atlas（`atlas_main_env`、`atlas_plants`、`atlas_ui`、`atlas_dungeon`），单张图集上限设为 `2048×2048`，确保同屏 DrawCall 压在 `≤ 35`。

* \[ \] **压缩与包体核验**：导出前开启 WebP（或 8-bit PNG 压缩），确认 `main` 首包图片总计 `≤ 1.8 MB`，把引擎+代码+首包整体稳稳控制在 `3.2 MB` 左右。

* \[ \] **字库克制**：不往工程里塞完整中文字体 TTF；正文用系统圆体，仅把常用的数字与“春夏秋冬/二十四节气”标题做成轻量位图字体（BMFont）。