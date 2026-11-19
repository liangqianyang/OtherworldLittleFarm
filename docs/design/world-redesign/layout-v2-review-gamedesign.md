# 世界布局 V2 设计审查 · 核心循环与数值节奏（game-designer 视角）

- 版本：v1.0（2026-11-18）
- 审查人：Game Designer（玩法系统与数值设计）
- 审查范围：V2 世界布局（96×80，已冻结+实机验收）核心循环完整性、经济数值闭环、防守节奏
- 边界声明：**本报告不改任何代码与冻结几何**；所有数值改动建议均为 catalog 数据层补丁或文档修订
- 上游文档：world-layout-v2.md / layout-v2-pacing.md / layout-v2-impl-spec.md / game-design-draft.md §8.1、§11.1、§13

---

## 1. 结论

**①四区齐备**：居住/种田/冒险（副本门）/布置封印（祭坛）四大需求区全部有图上锚点，且与核心循环四支柱（昼夜循环、种田经济、副本冒险、塔防夜战）逐一对应，距离预算全部达标——**几何层无新增缺陷，冻结基线可保持不动**。

**②但存在 2 个非几何的高优先缺陷（数值/数据层）**：
- **P0：番茄/南瓜/月光花种子在全游戏不可获得**——买种子按钮硬编码只卖胡萝卜（WorldLiving.ts:203），副本宝箱也只掉胡萝卜（adventure_rooms.json:11）。§11.1 四作物经济表中 3/4 是死内容，60 金月光花价格锚点不可见，中期收入天花板被钉死在胡萝卜 4.5 金/日/格。
- **P1：实际防守夜节奏 = day10 起每 2 天一夜**——三张 defense_waves 表 everyDays=4 的并集覆盖 ≥10 的所有偶数日，是 §8.1「每 4-6 日」设计值的 2-3 倍压力，核心循环退化成「防守跑步机」。

**一句话推荐**：冻结几何不动，落两个纯数据补丁（种子购买入口补全 + defense_waves 节奏重排梯），即完成四区循环闭环；其余为 P2 打磨与文档对齐项。

---

## 2. 证据与位置

### 2.1 四区×核心循环映射（全部实测距离引自 world-layout-v2.md §5，pacing §2.3 预算对照）

| 循环环节 | 区域 | 图上锚点 | 实测距离 | 预算 | 判定 |
|---|---|---|---|---|---|
| 昼夜循环（当日结算） | living | 床 (50,38) | 2.0 | ≤2 | ✓ |
| 种田产出 | farm | 地块3×3 origin(58,42) | 9.5 | ≤10 | ✓ |
| 卖粮/买种（经济回流） | UI 按钮 | — | 0（点击即达） | ≤12 | ✓* |
| 经济触点（diegetic 备选） | living | 园艺师 (46,42) | 4.5 | ≤12 | ✓ |
| 情报预告 | advGate 门口 | 守门人 (54,36) | 5.7 | ≤12 | ✓ |
| 副本冒险（资源快钱） | advGate | 副本门 (50,22) | 18 | ≤20 | ✓ |
| 塔防布防（夜战） | defense | 封印祭坛 (60,28) | 15.6 | ≤20 | ✓ |
| 钓鱼（稳定收入） | fishing | 码头 (42,56) | 17.9 | ≤18 | ✓ |

\* 贸易点预算目前由全局 UI 按钮满足（0 格），几何上无缺口；但其语义实现有缺陷，见 R1。

### 2.2 已核代码事实（本round全部实读）

1. **种子获取断链**（R1）：
   - `WorldLiving.ts:203`：买种子按钮硬编码 `buySeed('carrot_seed', …)`；
   - `FarmHUD.ts:196`：旧农场场景同样硬编码 `carrot_seed`；
   - `grep buySeed` 全仓仅上述两处调用 + `EconomySystem.ts:58` 定义（签名 `buySeed(seedItemId, inv, count=1)` 本身支持任意种子，无季节校验）；
   - `adventure_rooms.json:11`：副本精英宝箱 treasure 仅 `carrot_seed`；defense_waves 奖励仅金币/粘液/孢子帽；
   - `npc_dialogs.json` 园艺师温妮：纯风味台词，无商店选项（第9行「卖粮的钱留着买种子」——**文案承诺了不存在的功能**）；
   - `items.json`：tomato/pumpkin/moonflower seed 的 buyPrice 5/9/21 已配好，只是无人能买。
2. **防守夜节奏**（R2）：
   - `DefenseSystem.ts:82-92 _pickTableRow`：`dayIndex>=first && (dayIndex-first)%every===0`，多表命中取 firstDay 最大；`hasNightTonight`/`nextNightDay`/`intelTonight` 同表同逻辑（:95-131）；
   - `defense_waves.json`：slime_1(4/4)、pack_2(10/4)、spore_3(20/4)；
   - 逐日推演：slime 覆盖 4,8,12,16,20…（≡0 mod4），pack 覆盖 ≥10 的 ≡2 mod4 日 → **并集 = 4,8,10,12,14,16,18,20,22,24,26,28,30…**，即 day10 起每偶数日一夜；day≥20 时 spore(firstDay 20) 压过 slime。
3. **界面与文档**：
   - `WorldLiving.ts:180-218 _buildShops`：右侧流程按钮 卖粮(560,0)两段确认/买种子(560,-64)/背包(560,-128)/图鉴(560,-192)，110×52、pitch64 → 热区 52<88、纵向间隙 12<16，违反 ui-notes §3.1/§3.2 规范（交接 ui-designer，非我方行动项）；
   - ui-notes R4「世界场景无背包入口」前提已过时（背包按钮已存在）；
   - `game-design-draft.md §13`：地图必须含「耕地、水边、住宅、**工坊**和封印入口」——工坊无实现无锚点（全仓无制作系统，MVP 清单亦无制作条目）→ 文档与实装不一致。

### 2.3 未验证项（明说）

- 布防面板落点与世界层 defense 区的映射（DefenseSystem 布防段未读）——不阻塞 R1/R2 结论；
- 离线跳过防守夜的顺延实现（§12 要求顺延）——R2 修复后会放大该边界的重要性，列入交接；
- 真机手感、副本收益 56 金复算（引自 pacing §4.1，未重算）、钓鱼 QTE 手感——本轮未跑。

---

## 3. 缺陷与风险

### R1 · P0 · 种子经济断链（3/4 作物死内容）
- **位置**：WorldLiving.ts:203、FarmHUD.ts:196、adventure_rooms.json:11；crops.json/items.json 数据完好但无入口。
- **触发**：玩家第一天种完免费 5 包胡萝卜后，任何时刻想买番茄/南瓜/月光花种子。
- **影响**：§11.1 经济表 3/4 作物不可达；60 金月光花锚点（驱动「攒钱目标」的心理锚）不可见；中期收入=胡萝卜 4.5 金/日/格×9 格≈40 金/日上限，D10 pack_2 布防预算（需 2-4 座塔+升级）依赖副本快钱独木桥；园艺师台词「买种子」成为空头支票。
- **验证**：新档→种完初始种子→依次尝试买 4 种种子→仅胡萝卜可买即复现。修复回归：买 4 种种子→库存+1、扣价 3/5/9/21；月光花在非 [autumn,winter] 日（即 day<29 于 56 天年首季）被拦截并提示。

### R2 · P1 · 防守夜节奏翻倍（每 2 天一夜）
- **位置**：assets/data/catalogs/defense_waves.json（三表 everyDays=4）× DefenseSystem.ts:82-92 选择逻辑。
- **触发**：dayIndex≥10 的每个偶数日（4/10 两表相位互补覆盖所有偶数日）。
- **影响**：§8.1「每 4-6 个游戏日一次入侵预告」被实际 2 日节奏击穿；玩家隔天就要经历 情报→布防→夜战→修复 循环，种田/钓鱼/副本时间被挤压，违反 §4.2「低压日常」支柱；防守奖励（每夜 15-70 金+无漏）同步膨胀，加剧 §4.4 金币通胀；离线错过防守夜的顺延边界被高频触发。
- **验证**：debug 跳日 day 10→14，每晚 hasNightTonight=true 即复现；修复回归用例见 §4 A2 参数表逐日表。

### R3 · P2 · 经济触点非 diegetic（谷仓闲置 + 台词空承诺）
- **位置**：谷仓 (65,38) 纯装饰（WorldLiving.ts:111 注释明示）；卖粮/买种为屏幕右侧全局按钮（WorldLiving.ts:180-218）；园艺师 (46,42) 无商店。
- **触发**：玩家跟随引导寻找「卖点」时（星露谷主流：田边 shipping bin 是可读的经济触点；pacing §2.3 的 ≤12 预算本意是图上锚点）。
- **影响**：MVP 可接受（预算以 0 格满足），但循环的「卖出」节拍在地图上无存在感，谷仓作为 farm 区最大地物语义空转；与 §11.1「出货通过出货箱或商人」「种子购买走园艺师」双双不符。
- **验证**：观察 playtest 玩家卖粮/买种是否依赖 UI 按钮说明而非地图探索（寻路研究：引导物尽量 diegetic）。

### R4 · P2 · §13 地图清单含未实装「工坊」（文档不一致，我方 owns）
- **位置**：game-design-draft.md §13 验收清单第 1 条。
- **触发**：任何人按 §13 验收地图。
- **影响**：验收口径失真；工坊无代码、无 MVP 制作条目、无锚点，属二期内容。
- **验证**：对照 §13 与仓库 grep 制作系统=0 命中即复现。

### 观察项（延续 pacing §9，不升级）
- R5 钓鱼时薪（26 金/分）在种子修复后更突出——月光花 60 金锚点可见后需复查平衡；
- R7 南瓜劣势（3.2 金/日垫底+5 日占格）保留，备选杠杆=防守风味引导文案（§4.3 已列）；
- 9 格逐格浇水按钮每日 ~9 次点按：MVP 规模可接受，扩建上线前需「一键浇水」。

---

## 4. 行动与验收（优先级排序；均不动冻结几何）

### A1 · P0 · 种子购买补全（纯代码入口，0 新数据）
**方案（推荐）**：WorldLiving.ts:203 买种子按钮 → 4 种子弹出/循环选择（复用两段确认模式）；数据零改动（items.json 已配价）。
**P2 打磨（对齐 §11.1）**：种子购买迁移至园艺师对话框（npc_dialogs.json 增 option → 复用列表面板），台词「卖粮的钱留着买种子」兑现；届时 UI 按钮可保留为快捷或移除（与 ui-designer 对齐）。
**季节护栏**：月光花种子仅 [autumn,winter]（首年 day29+）可购，非季提示「月光花只有秋冬季才肯发芽」（复用温妮台词）；EconomySystem.buySeed 无季节校验，护栏放 UI 层即可。
**参数表（对齐 assets/data/catalogs 结构，供实现核对）**：

```json
{
  "seed_shop": {
    "purchasable_seeds": [
      { "itemId": "carrot_seed",    "buyPrice": 3,  "seasonGate": null },
      { "itemId": "tomato_seed",    "buyPrice": 5,  "seasonGate": null },
      { "itemId": "pumpkin_seed",   "buyPrice": 9,  "seasonGate": null },
      { "itemId": "moonflower_seed","buyPrice": 21, "seasonGate": ["autumn","winter"] }
    ],
    "entry_mvp": "world_scene_button(560,-64) 弹出选择",
    "entry_p2": "gardener(46,42) 对话框选项",
    "season_source": "TimeSystem.cropInSeason + crops.json seasons"
  }
}
```
**验收**：新档 day1 可买 4 种（月光花 day<29 被拦截）；扣价与库存断言通过；tsc 零错误；validate-layout-v2.py 不受影响（无几何改动）。

### A2 · P1 · defense_waves 节奏重排梯（纯数据 3 行）
**参数表（可直接落 defense_waves.json）**：三表 `everyDays 4→12`，spore_3 `firstDay 20→16`，其余不动：

| 表 | firstDay | everyDays | 修改后生效夜 |
|---|---|---|---|
| seal_slime_1 | 4（不变） | **12** | 4（16/28 被 spore 压过，即仅 day4 实际登场） |
| seal_pack_2 | 10（不变） | **12** | 10, 22, 34, 46… |
| seal_spore_3 | **16** | **12** | 16, 28, 40… |

**逐日验算（回归用例）**：防守夜 = **4 slime → 10 pack → 16 spore → 22 pack → 28 spore → 34 pack → 40 spore**——每 6 天一夜（§8.1 4-6 日达标），day16 后 pack/spore 交替提供内容变化；day 5-9 静默期给首夜复盘留白；首夜 D4 不变（pacing §3.2/D5 布防结论不受影响）。
**备选杠杆（若 playtest 嫌 4→10 跳档陡）**：不回退 everyDays，改削 pack_2 第 1 波为 3 粘怪（同文件 waves 改一行，仍纯数据）。
**验收**：debug 跳日 4/8/10/14/16/22/28 → hasNightTonight 依次 = true/false/true/false/true/true/true；nextNightDay(day5)=10；intelTonight(10)=双线提示；§12 离线顺延边界建议 architect 复核（交接）。

### A3 · P2 · §13 措辞修订（文档，1 行）
「耕地、水边、住宅、**工坊**和封印入口」→「耕地、水边、住宅和封印入口；工坊随二期制作系统落位（建议锚点：farm 区谷仓以南空地，需走 validate-layout-v2.py）」。

### A4 · P2 · 谷仓出货提案（坐标级，动 WorldLiving.ts:111 一处交互）
谷仓 (65,38) 增加交互=打开出货（复用 sellAllProducts 两段确认）；距田心 (59,43) 仅 7.8 格，符合「田边卖粮」星露谷主流；全局卖粮按钮保留（离田远时仍一键）。届时给 image-prompt-engineer 提 32px 出货箱图标需求。

### A5 · 观察项（playtest 后裁决）
R5 钓鱼时薪、R7 南瓜定位、一键浇水（扩建前必做）。

---

## 5. 交接（Handoff）

1. **→ ui-designer**：世界场景右侧 4 按钮（卖粮/买种/背包/图鉴，WorldLiving.ts:180-218）热区 52<88、纵向间隙 12<16，违反 ui-notes §3.1/§3.2；图鉴/背包钮与状态行 (310,-168) 在 x505-540 几何小重叠（纯视觉，状态行无热区）。ui-notes §2 盘点未收录这组按钮、R4「无背包入口」前提已过时——请补盘点并重排；A1 若改按钮为选择器、A4 若加谷仓交互，触屏热区需一并纳入。
2. **→ engineering-software-architect**：① A1 用 EconomySystem.buySeed 现有签名即可（无系统改动）；月光花季节护栏建议放 UI 层（buySeed 本身无校验，是否下沉到 buySeed 由你定）；② A2 修改后请复核 §12 离线跳夜顺延（每 6 天节奏下错过窗口更窄但更关键）；③ BuildPanel 布防落点→战板映射我未读，文档未见说明，建议补一段。
3. **→ coordinator/level-designer**：A2 defense_waves 参数（firstDay 4/10/16, everyDays 12×3）请与关卡节奏确认后落盘；落盘后跑 defense 逐日回归用例（§4 A2）。
4. **→ engineering-code-reviewer**：A1/A2 的回归用例即 §3 R1/R2 验证行，请纳入边界测试清单（含：金币不足买种子、月光花季节外购买、day16 多表命中取 spore）。
5. **未覆盖范围（明说）**：怪物血量/攻击/波次强度平衡、钓鱼 QTE 手感、副本房间数值——本轮未审（沿用 pacing §6.5 不动清单）；世界层 defense 区零地物的可读性问题属关卡/UI 视角，我仅确认循环层面祭坛锚点达标。
