# 大地图形态重构 · 六路专家设计汇总（00-synthesis）

> 2026-11-16 汇总。六路并行设计全部完成（共 2703 行）：
> world-design(431) / terrain-system(474) / migration-plan(367) / character-control(468) / combat-design(485) / tower-defense-area(478)。
> 本文档做交叉核对：一致项确认、冲突项裁决、待拍板项提炼。

---

## 一、六份文档速览

| 文档 | 核心交付 |
|---|---|
| world-design.md | 世界总纲：128×96 tile @32px（4096×3072≈54屏），六区布局+一条南北河缝合；出生点=家门口 (74,26)（到家门→农场北门 4 秒）；相机固定 2× 纯平移；facade 数据驱动 16×16 chunk 激活（同屏 ≤250 节点）；季节 tint 挂点；10 条开放问题 |
| terrain-system.md | 居住区地形改造（用户最重视）：假高度 heightLevel 0-3、auto-tile 16 变体 bitmask、水面 3 帧动画层、地窖=入口物件+独立室内场景、存档 RLE+base64 1-5KB、五工具坞+拖刷+拆除返还 50% |
| migration-plan.md | 迁移总计划：「逻辑保命、表现重写、入口换血」；farm.scene 冻结经「旧农场木牌」过渡；8 个新类；存档 v2→v3 纯加字段；里程碑 M0~M7 约 24.5 人日（5 周）；整包预估 4~5MB |
| character-control.md | 角色操控：32×48 art（渲染×2）、4 方向 3 套绘制、脚底圆碰撞 r=20 贴墙滑行、动态摇杆统一全场景、交互双通道（主行动键自动工具+走近情境键）、动画 86 帧（MVP 62） |
| combat-design.md | 探险区战斗：左摇杆+右攻击钮自动瞄准（锁定粘滞 0.7s）+翻滚无敌 0.22s；近战 2+远程 2、近战可挡弹；房链清怪开门；BattlePanel→CombatLogic（30Hz 可手动 tick） |
| tower-defense-area.md | 防守区塔防化：15×9 建造格封印盆地、双裂隙路径、守护 100HP 祭坛；4 种作物塔（减速/诱饵/荆棘/点杀）；固定 waypoints 无 A*；d4/d10/d20 三表递进 |

## 二、交叉核对：一致项（无需再议）

1. **视角/相机**：斜俯视 3/4（拍板）→ 相机固定 2×（屏上 64px/tile、视口 20×11.25 tile）纯平移不缩放——world 与 character 两份独立推得同一参数。
2. **键位复用**：攻击钮 (1150,560)（combat）= 情境交互键槽位（character）——一套拇指位走天下。
3. **Interactable 统一接口**：character 提出，六区域（含塔防建造格、NPC、传送点）全部接入。
4. **离线/时间红线不动**：三份文档都显式保留「挂后台=暂停、冷启动整天结算、倒流按0、防守夜离线顺延」。
5. **逻辑层零重写**：TimeSystem/Economy/Fishing/Backpack/季节/图鉴/存档迁移链全保留；FarmSystem 原样后置（农场区二期实现，farm.scene 冻结过渡期经木牌传送点完整可玩）。
6. **y-sort 铁律三方一致**：地面层永不参与排序；立面锚点必须在脚底；脚底 y 比较（非节点 y）；脏标记+相邻交换替代每帧全排。
7. **塔防与现有 DefenseSystem 衔接**：保留选表（firstDay 最大 reduce 修复版）/结算/挥击/离线红线，只重写移动与波次调度。

## 三、交叉核对：冲突裁决

### ⚠️ 裁决 1：地面渲染路线（三文档三说法）
- migration-plan：程序化 tile 网格+单图集 Sprite（不用 cc.TiledMap）
- terrain-system：**弃 CC Tilemap**，自研分块烘焙渲染器（Sprite 池为 A/B 备选）
- world-design：地面走引擎 TiledMap

**裁决：按 terrain-system 为准——居住区地形改造是核心诉求，其系统 100% 依赖运行时逐格写，CC Tilemap 在此场景不可靠（社区实证）；world-design 的「TiledMap 地面」改为「terrain-system 分块渲染器（T0 spike 二选一：chunk 烘焙 vs Sprite 池）」。** world-design 的 chunk 激活/facade/季节 tint/相机方案全部保留（与地面渲染路线正交）。CC Tilemap 仍可用于**静态副本图**（探险/防守，无运行时编辑）。

### ⚠️ 裁决 2：存档 v3 措辞统一
migration（纯加字段）+ terrain（RLE+base64 地形差量）+ world（world 增量段）三者兼容不矛盾，统一为：**v2→v3 纯加 `world` 段（玩家位置/开荒记录/地形差量 RLE+base64/塔布置/武器），缺字段走迁移链自动补基线地图，双向回滚安全**。

### ⚠️ 裁决 3：探险「地表探险区」与副本边界
world-design 探险区在东北角地表（传送门所在），combat 的元气骑士战斗发生在 **dungeon.scene 副本**内——地表探险区=副本入口+氛围引导，真战斗在副本。MVP 一张副本图（Q10 拍板：主题分岔留二期）。

## 四、合并里程碑（约 5 周，24.5+2 人日）

| 里程碑 | 内容 | 验收 |
|---|---|---|
| **T0 spike（前置，2 天）** | chunk 烘焙 vs Sprite 池两条渲染路灰盒+微信容器真机（60fps/编辑<5ms/内存） | 定渲染路线（硬闸门） |
| M0-M1 | world.scene 骨架+RegionBuilder+PlayerCharacter+摇杆+相机 | 角色走遍六区灰盒 |
| M2 | 开荒区（砍树清石 Clearing） | 首个完整区域闭环 |
| M3 | 居住区地形改造（TerrainEdit+五工具坞+地窖入口） | 河/台阶/地窖可改+存档 v3 |
| M4 | 塔防区改造（作物塔+waypoints+夜袭世界内） | d4 波次可玩 |
| M5 | 探险区副本化（CombatLogic+清怪开门） | 元气骑士式战斗可玩 |
| M6 | farm.scene 搬迁（确定性映射到世界农场区） | 旧存档无缝迁移 |
| M7 | 性能与包体收尾（图集合批/drawcall≤40/整包≤5MB） | 微信真机 30fps+ |

## 五、待用户拍板（world-design 开放问题提炼）

| # | 问题 | 建议案 |
|---|---|---|
| Q1 | **日内相位推进驱动**（现状 phase 日内永不变）：会话时长档（Morning 0-6min…）？活动驱动？手动？ | MVP 用会话时长档（GameApp 加 DayPacingPolicy 不动 TimeSystem），嫌被时钟赶再改手动 |
| Q2 | 进副本期间世界态 | 副本=同一次会话，世界暂停；副本失败不推 dayIndex（建议采纳） |
| Q3 | 防守日玩家在非防守区 | 漏怪即损（不强制传送，归因面板教学）（建议采纳） |
| Q4 | 冬雪地+绿苗违和感 | 二期冬季专属作物或雪盖 tint（建议 MVP 接受） |
| Q5-Q9 | （详见 world-design.md §8） | 逐条见原文 |
| Q10 | 副本主题分岔 | 二期；MVP 一张副本图（建议采纳） |

## 六、风险清单（六路合并去重，按杀伤力排序）

1. **T0 硬闸门**：chunk 烘焙 canvas→Texture 上传在微信容器低端机的表现——spike 不过则整条渲染路线要换（Sprite 池备选已在手）。
2. **AI 逐帧角色动画一致性**（character-control 最大风险）：三视图参考图+整行生成+逐帧五查治理；86 帧→MVP 62 帧减配线。
3. **低端机战斗帧率+自动瞄准手感**（combat 首要风险）：灰盒调参压测前置。
4. **drawcall 红线 ≤40**：全 tile/物件单图集+禁 Graphics 正式表现（占位风格必须在大地图退场）。
5. y-sort/遮挡闪帧：脚底锚点铁律+脏标记排序。

---

*六份原文均在同目录，按文件名索引。本汇总为唯一裁决来源，与原文冲突处以本文档为准。*
