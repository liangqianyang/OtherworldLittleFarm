# V2 世界布局关卡审查（Level Designer）

- **审查人**: level-designer（agent-10）
- **日期**: 2026-11-18
- **对象**: 已冻结并实机验收的 V2 世界布局（96×80，基准 1280×720）
- **权威输入**: docs/design/world-redesign/world-layout-v2.md（几何冻结表）、layout-v2-pacing.md（距离/节奏）、layout-v2-impl-spec.md（实施记录）、layout-v2-ui-notes.md（引导）、game-design-draft.md §5/§8/§13、assets/data/catalogs/{defense_maps,defense_waves,monsters,adventure_rooms,weapons,items}.json
- **独立性声明**: 本报告由 level-designer 独立完成；几何事实以冻结表 + 本回合实测 `python3 tools/validate-layout-v2.py`（exit 0，ALL PASS）为准，未复刻他人结论。

---

## 0. 一句话推荐

四区齐备、几何全达标、无 blocker 缺陷；**建议冻结几何不动，优先补两处 P1——枢纽东出口 diegetic 出货箱 (53,44) 与祭坛台 A/B 入口裂纹 decal——其余按 P2/P3 文档与资产排期。**

---

## 1. 结论

### 1.1 问题①：用户四大需求区是否齐备 → **齐备**

| 需求区 | V2 区域 | 锚点 | 距 SPAWN(50,40) | 预算（pacing §2.3） | 判定 |
|---|---|---|---|---|---|
| 居住区 | living x34-56/y32-48 | 床 (50,38)、石板广场 x40-52/y36-46、园艺师 (46,42)、守门人 (54,36) | 2.0 | 床≤2 | ✓ |
| 种田区 | farm x56-84/y34-62 | 地块 3×3 origin(58,42) pitch4、谷仓 (65,38) | 近地块 9.49 | 地块中心≤10 | ✓ |
| 冒险区（副本入口） | advGate x48-56/y14-26 | 副本门 (50,22) 在 northV 主路轴线上 | 18.0 | 副本门≤20 | ✓ |
| 布置封印区（塔防布防） | defense x58-90/y6-32 | 封印祭坛 (60,28) + altarH 路 + 独立 15×9 夜战板 seal_1 | 15.62 | 祭坛≤20 | ✓ |

附加区（开荒 pioneer、钓鱼 fishing）亦齐备：最近采集树(40,30)=14.14≤14、石(40,32)=12.81≤14、码头(42,56)=17.89≤18。九项距离预算全部达标（validator BUDGET 表实测 ALL PASS）。

### 1.2 问题②：是否存在缺陷 → **存在，无 blocker；2 项 P1 + 4 项 P2/P3**

最重的两条：**①出货/买种点在世界层零落点**（pacing §2.3 自定的「≤12 格」硬指标被静默放弃，卖粮=全局 UI 按钮），**②防守区 891 格地物为零**，塔防三要素（路线/刷怪点/守护点）在世界层完全不可读。两者均可用「不动冻结几何」的地物/装饰级修复解决，详见第 4 节。

---

## 2. 证据与位置

### 2.1 几何与距离（独立核算，与冻结表互证）

- 谷仓 (65,38) 距 SPAWN = √(15²+2²) = **15.13** —— 若未来把它当交易点，超 pacing §2.3 的 ≤12 预算（validator `tools/validate-layout-v2.py:106` 中 `barn: 99` 即不设限，确认当前无交易预算条目）。
- 远角地块中心 (67,51) 距 SPAWN = √(17²+11²) = **20.25**；冻结表 §5 写的「远端地块 17.3」实为 plot_far(67,43)（validator:35 `plot_far=(67,43)`），**不是全场最远地块**。
- 门/祭坛/码头 = 18.0 / 15.62 / 17.89 —— 三大外围玩法点近似等距（18/16/18 格档），符合寻路研究「玩法点等距分布」。
- 起始区 landmark/路径密度：枢纽广场 11×11=121 格内含床、守门人、园艺师、SPAWN、4 路牌共 8 锚点；9 条路中 6 条直接接广场 —— 符合寻路研究「起始区 landmark 与路径密度应最高」。
- validator 实测（本回合）：`python3 tools/validate-layout-v2.py` → `ALL PASS ✓`（exit 0），含距离预算、河/路/地块冲突、地标落位、采集密度、门轴线可见性、UI 重叠九组检查。

### 2.2 主流设计逐条对照

| 主流参照 | 判定 | 位置/证据 |
|---|---|---|
| 星露谷：屋贴田短循环 | ✓ | 床(50,38)→近地块(59,43) 直线 9.5 格 ≈2.1s（移速 4.5 格/s，pacing §2.3） |
| 星露谷：田边 diegetic 卖粮点（shipping bin） | **✗ → R1** | 谷仓纯装饰（WorldLiving.ts:111 注释明示）；卖粮=全局按钮（FarmHUD.ts:50、WorldLiving.ts:185）；教程文案仍在教「点左上角卖粮」（TutorialGuide.ts:165）；validator BUDGET 无 trade_point 条目（validate-layout-v2.py:106-107） |
| 星露谷：连片田+扩建空间 | ✓ | 地块 3×3 连片 pitch4；farm 东侧 x75-84/y34-62 整片留白=扩建位；farmV/farmS 已预留南扩路网 |
| 星露谷：区域主题化材质 | **✗ → R5** | 全场 4 类程序地形色（TerrainData.ts generateBaseline :87-110），defense/farm/living/pioneer 地表无差异；P2 AI tileset 仅 3 张已导入（impl-spec §14） |
| 塔防三要素：路线/刷怪点/守护点图上可读 | 板上 ✓ / 世界层 **✗ → R2** | seal_1 板 pathA=[(0,4)…(11,3)]、pathB=[(5,0)…(11,3)]、altarCells(12-13,3-4) 均数据可读，十字交汇 (5,4)=战略点；但世界层 defense 33×27=891 格区内地物为零（TerrainData.ts:90 仅画 Grass），A 西口/B 北口方位在世界层无任何空间映射 |
| 塔防节奏：预警-多波-结算 | ✓（偏差已文档化，见 R9/防守规格文档） | tower-defense-area.md §4-§6 + defense_waves.json 三表；waveBreak 25s vs §8.1 的 60-90s 为文档化偏差（tower-defense-area §4.2） |
| 寻路研究：引导物尽量 diegetic | 部分 | 路牌×4 diegetic ✓（WorldLiving.ts:331）；罗盘=屏幕空间 UI（手游主流做法，接受）；卖粮非 diegetic ✗（并入 R1） |
| 城建主流：冲突功能区分隔+缓冲带 | 基本✓ | farm(生产/安全) 北缘 y34 与 defense(威胁区) 南缘 y32 仅隔 1 行草地——夜战在独立板进行，世界层无实际冲突，但「威胁区贴田」的视觉缓冲依赖 R5 材质差异化补强；living 与 pioneer 之间有河+桥缓冲 ✓ |
| 城建主流：路网先行 | ✓ | 9 条 2 宽路全连通、不落水、不压地块（validator 第 4 组检查实测通过） |

### 2.3 未验证项（明确声明）

1. **结算归因面板实施状态**（tower-defense-area.md §7.1④「结果面板加归因行」）——本回合只读了设计文档与数据表，未读 DefenseOverlay 实现，不判定。
2. **建造格 100 的逐格分布**——defense_maps.json 只存 decor/rocks/path/altar，建造格集合的生成规则未核。
3. **罗盘第 4 POI**——CompassHUD.ts:16 POIS 数组确认存在，当前为 3 项（副本/防守/码头，协调者口径），第 4 POI（祭坛方向让位）未实施。
4. **夜战开场简报卡 3s 可跳过**、建造模式幽灵预览绿红反馈——设计条文存在（tower-defense-area §5/§6），实施状态未核。
5. **塔位推荐与波次时序推演**基于冻结几何+文档 DPS 公式推算，**未经灰盒/实机验证**。

---

## 3. 风险（每条含位置/触发/影响/验证方法）

> 类型标注：**[复现]** = 现状已存在可复核；**[潜在]** = 依赖未来动作才触发；**[未验证]** = 证据不足暂不判定。

### R1 [复现|P1] 出货/买种点世界层缺位（diegetic 经济循环断点）
- **位置**: 全场无交易落点。最接近的谷仓 (65,38) 距 SPAWN 15.13 > 12（pacing §2.3 预算）；卖粮=FarmHUD.ts:50 / WorldLiving.ts:185 全局按钮；validator BUDGET 无 trade_point（validate-layout-v2.py:106-107）。
- **触发**: 玩家每次结算收成都要跳出世界去点屏幕角落按钮；星露谷式「收获→门口出货箱」的空间肌肉记忆无处安放；pacing §2.3 自定硬指标在该布局下不可满足。
- **影响**: 经济主循环的可读性依赖教程文字兜底（TutorialGuide.ts:165）；中后期高频卖粮操作摩擦累积；「谷仓」作为农场区最大地标的功能期待落空（看见→走近→无交互，负面小挫折）。
- **验证方法**: ①在 validator 增加 `trade_point` 条目（预算 12）后重跑须 ALL PASS；②教程回归：出货箱交互仍触发 TutorialGuide step4 卖粮事件；③首日观察 5 名新玩家，≥4 人在无文字提示下找到出货箱。
- **最小修复**: 枢纽广场东出口 **(53,44)** 放置可交互出货箱 prop（广场 x40-52/y36-46 东缘外一格、eastH 路 y40-41 南侧两行、距 SPAWN √(3²+4²)=5.0 ≤12 ✓，不压路/地块/河/广场；fallback (52,43)=3.6）。改动面=1 个交互 prop + validator 条目，冻结几何零改动。

### R2 [复现|P1] 防守区世界层可读性为零
- **位置**: defense x58-90/y6-32（33×27=891 格）区内地物为零（协调者验证 + TerrainData.ts:90 仅画 Grass）；世界层唯一锚点=祭坛(60,28)+祭坛石板台 x58-62/y26-30；seal_1 板 A 西口(0,4)/B 北口(5,0) 在世界层无方位映射。
- **触发**: 玩家走到祭坛→点开夜战→面对一张陌生 15×9 板；情报四元组的「方向」（西线/北线）在世界层找不到对应物。
- **影响**: 塔防三要素「路线/刷怪点/守护点图上可读」在世界层完全不成立；封印区视觉身份≈普通草地；夜战板与世界观割裂，环境叙事研究 70% 推断阈值无从谈起。
- **验证方法**: ①decal 落点过 validator；②玩家访谈「防守夜怪物从哪个方向来？」≥70% 能指向裂纹方位。
- **最小修复**: 纯装饰零几何改动——祭坛石板台 x58-62/y26-30 **西缘（x58 列 y26-30）与北缘（y26 行 x58-62）各铺一条地面裂纹/符文 decal**，分别指向西（A 路）与北（B 路）；P2 再升级 rift 传送门 sprite 与守门人台词互文。

### R3 [复现|P2] 冻结表 §1 面积列与闭区间算术不一致
- **位置**: world-layout-v2.md §1 区域表。闭区间核算：living 23×17=391≠396、farm 29×29=841≠812、pioneer 37×29=1073≠1092、fishing 27×18=486≠418、defense 33×27=891≠924；仅 advGate 9×13=117 精确。
- **触发**: 下游文档引用 §1 面积做密度/资产预算时拿到矛盾口径。
- **影响**: 低——面积下限校验只比宽高（validate-layout-v2.py:59-61），全部仍通过（farm 841≥396、pioneer 1073≥952、fishing 486≥308、living 391≥64），冻结结论不变；但冻结表自引用错误会传染给后续关卡文档。
- **验证方法**: validator 现状 ALL PASS（本回合实测）；给 validator 增加面积打印后 diff §1。
- **最小修复**: 以 validator 输出重生成 §1 面积列，或标注口径（如「净格数=去水去路」）并附计算式。文档级 0.5h。

### R4 [复现|P2] 「远端地块 17.3」非全场最大值
- **位置**: world-layout-v2.md §5 距离表；17.3=plot_far(67,43)（validator:35），真实远角地块 (67,51)=20.25。
- **触发**: 若后续以「≤18」验收任意地块，(67,51) 会被误判超标。
- **影响**: 低——预算只约束 plot_near≤10（9.49 ✓），(67,51) 步行 ≈20.3×1.4/4.5≈6.3s 可接受；仅口径风险。
- **验证方法**: 手工核算 + validator BUDGET.plot_far=18 对 (67,43) 过检。
- **最小修复**: §5 表补一行「最远地块角 (67,51)=20.3（无预算约束，实测参考）」。

### R5 [潜在|P2] 区域材质主题化缺位
- **位置**: TerrainData generateBaseline 仅 4 类程序色；6 区地表无差异；P2 tileset 仅 3 张（impl-spec §14）。
- **触发**: 资产到位后若仍全区同色，跨区无反馈、区域身份只能靠内容物撑。
- **影响**: 星露谷主流「区域主题化」落空；defense「威胁区贴 farm」的视觉缓冲（R2 相关）缺一层皮肤。
- **验证方法**: tileset 导入后 6 区截图对比；新玩家能否不看路牌说出「这是农场/这是封印区」。
- **最小修复**: P2 资产需求单（交 image-prompt-engineer）：defense=灰岩焦土、farm=耕地棕、living=庭院绿+石板延续、pioneer=深林绿、fishing=湖滨沙；锁 32px 网格+统一调色板。

### R6 [潜在|P2] 战斗目录双轨（登记并移交 engineering）
- **位置**: combat-design.md §2.1/§3.2 v2（rust_chopper/thorn_rapier/wood_musket/tri_star_bow；elite hp40+splitInto、新增 moth_dust/thorn_bud）vs weapons.json 现值（wood_sword/iron_sword/slingshot/firewand）与 monsters.json 现值（elite hp18 无 split、无 moth_dust）。
- **触发**: 旧林地精英房若按 combat-design §3.4 配 moth_dust，会引用不存在的怪物 id。
- **影响**: 战斗系统实施时目录引用报错或数值错轨。
- **验证方法**: 目录引用 lint（itemId/weaponId/monsterId 反查 catalogs）。
- **最小修复**: 本回合关卡规格（见 old-wood-v1-level-spec.md）一律使用现目录 id；精英房 W2 用 sporeling（shooter 行为已存在于 monsters.json `dungeonBehavior`）替代 moth_dust；v2 数值升级由 game-designer+engineering 单独拍板。

### R7 [潜在|P3] 首日罗盘未按 pacing §3.3 脚本化
- **位置**: CompassHUD.ts:16 POIS 常亮 3 项；pacing §3.2 首日脚本依赖玩家自读罗盘。
- **触发**: 新手可能首日直奔 18 格外的副本门，跳过「种→收→钓→布防」教学链（拍板A）。
- **影响**: 首日节奏失焦；布防教学（day3）可能被提前触发或错过。
- **验证方法**: 5 名新玩家首日路线观察记录。
- **最小修复**: POI 分日解锁（day1 亮农场+钓鱼，day3 亮副本，布防教学夜亮祭坛）——移交 ui-designer/game-designer 对齐后实施。

### R8 [微瑕疵|P3] W 路牌 (33,42) 落在桥面板内
- **位置**: 桥基线 rect x30-38/y39-42 内（ westH 路 y40-41 旁一格）。
- **触发**: 视觉上木牌立于桥板边缘。
- **影响**: 引导功能不受损（牌仍在路侧、指向正确）；审美瑕疵级。
- **验证方法**: 实机截图。
- **最小修复**: 可选移至 (31,43)（桥下缘外一格、岸上）；不动亦无碍。

### R9 [复现|登记] 防守节奏与 §8.1 的两处已文档化偏差
- **位置**: waveBreak 25s（§8.1 写 60-90s，tower-defense-area §4.2 已声明偏差并留真机回调）；T1 首夜仅 1 波（§8.1 写 2-3 波；tower-defense-area §4.3 定位 T1=教学夜 1-2 塔可守）。
- **触发**: 现表直接可跑，无触发；风险在**豁免未留痕**。
- **影响**: 后续成员按 §8.1 字面验收会误报两处「不合规」。
- **验证方法**: 对照 defense_waves.json 与 §8.1 逐条审计（详见 seal-defense-v1-rhythm-spec.md 第 5 节偏差登记表）。
- **最小修复**: 请 game-designer 在 game-design-draft §8.1 增补两行豁免记录（T1 教学夜单波；waveBreak 25s 待真机回调）。

---

## 4. 行动（优先级排序；除 A6 外全部不动冻结几何）

| # | 优先级 | 行动 | 坐标/落点 | 改动面 | 完成标准 |
|---|---|---|---|---|---|
| A1 | **P1** | 出货箱交互 prop | **(53,44)**，fallback (52,43)；须先在 validator 加 trade_point≤12 条目 | 1 prop + 1 交互 + validator 行 | validator ALL PASS；TutorialGuide step4 回归通过；5 新玩家 ≥4 无提示找到 |
| A2 | **P1** | 祭坛台 A/B 裂纹 decal ×2 | 西缘 x58/y26-30 一条；北缘 y26/x58-62 一条 | 纯装饰 2 decal | validator PASS；访谈 ≥70% 指对入怪方位；before/after 截图归档 |
| A3 | P2 | §1 面积列重生成 | world-layout-v2.md §1 | 文档 | §1 与 validator 输出一致（diff 为空） |
| A4 | P2 | §5 补最远地块行 (67,51)=20.3 | world-layout-v2.md §5 | 文档 10min | 表内含该行且注明「无预算约束」 |
| A5 | P2 | 区域材质需求单（5 区 tileset + 祭坛 rift sprite + 出货箱 sprite） | → image-prompt-engineer；锁 32px 网格+统一调色板 | 资产需求文档 | 提示词落 docs/assets/ 并过调色板校验 |
| A6 | P2 | 目录引用 lint 脚本（monster/weapon/item id 反查） | tools/ | 工具脚本 | adventure_rooms/defense_waves 加载零未知 id |
| A7 | P3 | 罗盘 POI 分日解锁 | CompassHUD.ts:16 | 代码（移交 ui/game-designer 拍板） | 首日路线观察 5/5 按教学链走 |
| A8 | P3 | W 路牌移 (31,43)（可选） | (33,42)→(31,43) | 1 装饰 | 实机截图牌不压桥板 |
| A9 | P3 | §8.1 豁免记录（T1 单波 + waveBreak 25s） | game-design-draft.md §8.1 | 文档（移交 game-designer） | 偏差登记表两行留痕 |

A1–A5 均为地物/装饰/文档级，符合 world-layout-v2.md §9 不变式（新地物先跑 validator）；A1/A2 落点已预核算不压路/河/地块/广场。

---

## 5. Handoff

**需与其他成员对齐**
- **game-designer**: ①A1 出货箱的经济口径（卖价是否等同 EconomySystem.sellAllProducts；买种子是否并入出货箱或留独立按钮——建议并入，凑齐「田边交易点」）；②R9 两条偏差的 §8.1 豁免留痕；③combat-design v2 数值（elite split/moth_dust）排期，未拍板前关卡规格按现目录执行。
- **ui-designer**: 罗盘第 4 POI 色板与让位区（ui-notes 既有 handoff 未回传）；A1 出货箱热区 ≥88px、屏边 ≥24px；夜战简报卡跳过按钮位置。
- **engineering-software-architect**: adventure_rooms.json v2 schema 迁移（size/waves/obstacles/chest 字段）；LANDMARKS 五文件字面量单源化（impl-spec §14 偏差2）；validator 增补 trade_point 与面积输出（A1/A3 前置）。
- **design-image-prompt-engineer**: A5 资产需求单（本回合已给出调色板与网格约束）。
- **game-audio-engineer**: 世界层音频规格目前完全空缺——夜战预警 sting、精英房锁门音、出货箱投币音（未覆盖范围，请排期）。
- **engineering-code-reviewer**: A1 的两条回归用例（validator PASS + 教程 step4）与 validator 进 CI 的建议。

**未覆盖范围（明说）**
- 多层战斗地图（真实高台/楼梯/坡道）按 §5.3 拍板属二期，本回合只交付灰盒 spike 模板规格（见 old-wood-v1-level-spec.md 第 7 节），不实施。
- 夜战板 seal_1 的逐格建造格分布、灰盒 DPS 实测、结算归因面板实施状态——未验证，见 §2.3。
- 世界层音频、tileset 提示词成品、罗盘脚本实现——他岗交付。
