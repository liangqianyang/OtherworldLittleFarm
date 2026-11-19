# 世界 V2 素材提示词与产出记录（world-v2-asset-prompts）

- 日期：2026-11-18
- 负责：design-image-prompt-engineer 缺位，由协调者（lead）补位
- 状态：V2 所需素材**已产出并导入**；本文同时是复刻/重抽的提示词档案与 UI 图标 Handoff
- 上游：`world-layout-v2.md`（哪些地形需要贴图）、`layout-v2-ui-notes.md` §Handoff（图标清单）、`pixel-art-prompts.md`（v1 调色板）

---

## 1. 管线约定（全素材通用）

- 生成工具：aigc_image（qwen-image-3.0-pro），`prompt_extend=false` 锁词，512×512 起稿。
- **必须 n=1 串行调用**：一次 n>1 时多张输出共用同一时间戳文件名，后写覆盖先写（2026-11-18 实测坑）。
- 下采样：512² → 32×32 用 PIL `Image.LANCZOS`（NEAREST 会丢抗锯齿过渡，LANCZOS 后颗粒仍清晰）。
- 落位：`assets/textures/tiles|adventure|decor|npc|.../<name>.png`，然后 Cocos 编辑器 refresh 生成 `.meta`。
- **meta 必查两处**（编辑器默认值对像素画是错的，2026-11-18 实测坑）：
  - `subMetas.6c48a.userData.minfilter/magfilter` = `"nearest"`（默认 linear，会让像素糊边）
  - `subMetas.f9941.userData.trimType` = `false`（默认 "auto"，会裁掉贴图边）
  - 对齐样板：`tiles/ground_grass.png.meta`。改完再 refresh 一次并验证设置存活。
- 调色板锚（取样自现网 ground_grass.png）：草 #6c870b / #517608 / #73960b，土斑 #6f570f / #8a6713。

## 2. V2 地形 tile（已产出）

运行时链路：`SpriteLib.CORE` 已挂 `tiles/ground_water|ground_sand|ground_stone`；`WorldSpike` 的 bake `srcs` 与 pool `frames` 已挂 {3:water, 4:sand, 5:stone}；素材缺失时自动回退纯色/程序画，所以这 3 张是增强项不是依赖项。

### 2.1 tiles/ground_water.png（AI 一次过）

- 实际产出：AI 512² 直接 LANCZOS→32²，无需修图。
- 提示词（zh）：
  > 32x32 像素艺术游戏地形贴图，俯视图：平静河水平铺纹理。深蓝色底 (#1e3c78) 上散布稍亮的蓝色像素块 (#2e5aa8, #3a6cc0) 模拟轻微波纹，均匀分布无方向性。四边无缝可平铺（边缘与中心密度一致，无渐晕无边框）。复古 16-bit 农场游戏风格，像素块边界清晰锐利，整图就是一张纯纹理，不含任何物体、岸边或泡沫。
- 反词条：边框, 渐晕, 阴影角落, 物体, 角色, 文字, 水印, 3D渲染, 写实照片, 高光反射
- 512² 原图存档：`aigc-outputs/image-20261118-184930.png`

### 2.2 tiles/ground_sand.png（AI 两轮不达标 → 程序化修图定稿）

- AI 弱点：512² 大图上"颗粒感"总被画成近纯色，32² 后无信息量。
- **定稿做法**（可复刻脚本语义）：取 AI 底图 → 最近邻量化到 4 档沙色 `#c9a959 #bc9742 #e8d38a #a5813c` → rng(seed=42) 撒 90 颗深粒 `(146,110,48)` + 60 颗亮粒 `(240,222,160)`。
- 提示词（zh，若重抽）：
  > 32x32 像素艺术游戏地形贴图，俯视图：粗颗粒沙滩平铺纹理。中沙黄色底 (#c9a959)，上面密布明显的深色沙粒斑点 (#a5813c) 和亮色沙粒 (#e8d38a)，两种斑点各占约 20% 面积、均匀散布如粗砂纸，颗粒感强烈清晰。四边无缝可平铺，无渐晕无边框。复古 16-bit 农场游戏风格（星露谷物语沙滩同款质感），像素块边界锐利，整图是一张纯地面纹理。

### 2.3 tiles/ground_stone.png（AI 勾缝丢失 → 程序化鹅卵石定稿）

- AI 弱点：石块轮廓/勾缝在 512² 尚可，缩到 32² 全糊成噪点。
- **定稿做法**（可复刻脚本语义）：32×32 纯程序绘制——底色深褐勾缝 `#4a4038`；rng(seed=7)；4×4 网格错排（偶数行偏移 +4px）圆石 r∈{3,4}，随机色 `#a09584 #b5aa99 #8a7f70 #aa9e8c`；另撒 6 颗 r=2 填缝石；所有绘制 **wrap-around（坐标取模 32）**保证四边无缝；每颗石头左上受光(+18)/右下投影(-28) 出立体感。
- 提示词（zh，若重抽）：
  > 32x32 像素艺术游戏地形贴图，俯视图：鹅卵石石板路平铺纹理。灰褐色圆形鹅卵石（直径 5-8 像素，颜色 #a09584/#b5aa99/#8a7f70）紧密拼接，石头之间有清晰的深褐色勾缝 (#4a4038)，勾缝宽 1-2 像素、连贯成网状。四边无缝可平铺，无渐晕无边框。复古 16-bit 农场游戏风格，像素边界锐利，整图是一张纯地面纹理，无任何物体。

> 结论性教训：**32² 终尺寸的"结构型"纹理（石块/砖缝/木纹）程序化绘制优于 AI 直出**；"颗粒型"纹理（草/水/沙）AI 可用但需在提示词里点名具体色值与颗粒占比。

## 3. 地标/装饰/NPC（已存在，v1 素材沿用）

`adventure/barn.png`、`adventure/dungeon_gate.png`、`adventure/world_seal.png`、`decor/bed.png`、`npc/npc_gardener.png`、`npc/npc_gatekeeper.png` 均已存在（64×64 档，实机截图验收观感过关），V2 **未重生成**。若后续需要重抽，用下列提示词（en+zh 双语锁定 64×64 网格）：

| 资产 | 提示词（zh 主干 / en 备用） |
| --- | --- |
| adventure/dungeon_gate 副本门 | 64x64 像素艺术游戏地标，俯视 3/4 视角：古老石拱门遗迹，爬藤缠绕，拱心泛幽绿传送光芒。16-bit 复古农场游戏风（星露谷地物比例）/ "pixel art 64x64 game asset, top-down 3/4 view, ancient mossy stone portal with faint green portal glow, Stardew-Valley-like, transparent background" |
| adventure/world_seal 封印祭坛 | 64x64 像素艺术：圆形石制祭坛，中央发光符文封印阵，四角小石柱。暗金+石灰色 / "pixel art 64x64, round stone ritual altar with glowing golden seal rune, four corner pillars" |
| adventure/barn 谷仓 | 64x64 像素艺术：红木谷仓，白框门，干草色屋顶，微斜俯视 / "pixel art 64x64, red wooden barn with white trim door and straw roof, slight top-down" |
| decor/bed 木床 | 64x64 像素艺术：单人木床俯视 3/4，格子被褥，枕头在上 / "pixel art 64x64, single wooden bed top-down 3/4, checkered blanket" |
| npc/npc_gardener 园艺师·温妮 | 64x64 像素艺术角色立绘（俯视 3/4 走姿单帧）：绿围裙中年女性园艺师，草帽，手持小铲 / "pixel art 64x64 character, middle-aged gardener woman, green apron, straw hat, hand trowel" |
| npc/npc_gatekeeper 守门人·老石 | 64x64 像素艺术角色：灰须老者守卫，皮甲，持长枪 / "pixel art 64x64 character, grey-bearded old guard, leather armor, spear" |

约定：地标/NPC 一律 64×64（世界 2 格宽）；透明底；调入后同样检查 meta nearest/no-trim。

## 4. UI 图标 Handoff（待产出，非本轮阻塞）

来源：`layout-v2-ui-notes.md` §Handoff。当前 UI 全部 Graphics 程序绘制可用；以下图标做出来后替换即可，不做不阻塞：

| 图标 | 尺寸 | 数量 | 说明 |
| --- | --- | --- | --- |
| 工具坞槽位图标 | 32×32 | 6 | 锄/铲/铺/桥/梯/撤销（撤销=弯箭头）；槽 88px、图标居中 32px 留白 |
| 设置齿轮 | 56×56 | 1 | 现 ⚙ 为程序画三横，升级为齿轮 |
| 背包入口 | 56×56 | 1 | 世界场景右侧流程按钮用 |
| 面板关闭 | 32×32 | 1 | X |
| 九宫格切片 | 3-slice | 2 | 深色面板底 `#14161F`、描边 `#F2C14E`（ui-notes §3.3 色板 token） |

生成时沿用 §1 管线（32/56px 图标可 512² 起稿→LANCZOS 降采样；透明底；`ui/` 目录入册 SpriteLib）。

## 5. 产出清单（本轮实际落盘）

```
assets/textures/tiles/ground_water.png   (+.meta nearest/no-trim)  AI 直出
assets/textures/tiles/ground_sand.png    (+.meta nearest/no-trim)  AI 底图+程序化撒粒
assets/textures/tiles/ground_stone.png   (+.meta nearest/no-trim)  纯程序鹅卵石
aigc-outputs/image-20261118-18{4930,4946,5002,5052,5110}.png       512² 原图存档（含 2 轮废弃稿）
```
