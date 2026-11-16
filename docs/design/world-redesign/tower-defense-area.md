# 封印防守区（塔防）完整设计

> 文档状态：v1（2026-11-16）。世界重构方向拍板后的封印防守区专项设计。
> 上游依据：docs/design/game-design-draft.md §8（封印防守与入侵事件）、docs/design/design-improvement-proposal.md §4.3/§6（情报系统 / 防守四环）、
> 现有实现：assets/scripts/gameplay/defense/DefenseSystem.ts、assets/scripts/ui/DefenseOverlay.ts、assets/data/catalogs/defense_waves.json。
> 数值均为灰盒起点值，以 DebugPanel 跳天 + 模拟夜战调参为准。

---

## 0. 定位与设计支柱

封印防守区（下称「封印盆地」）是六区域大地图中的塔防区域：**怪物从裂隙入口进攻，玩家布置作物防守，守护封印祭坛**。它接替现有「夜袭谷仓」玩法（DefenseSystem 第一版：怪物直线冲右缘谷仓），把防守从"点击怪物的操作考验"转向"布置-观察-修补的策略乐趣"——对齐设计稿 §2.3「防守让准备变得有意义」与拍板方向「布置作物塔防」。

三条支柱（本文档所有取舍的裁判标准）：

1. **布置是主体，操作是加成**：塔自动作战；玩家点击怪物挥击保留为可选参战（零改造复用 playerHit），不参战也能赢。
2. **难度来自布局与职责，不来自数值膨胀**：双入口、换线终波、抗性怪（禁用 +20% 数量/血量式递增，§8.1 拍板）。
3. **轻量实现**：固定路径无 A*、无物理引擎、塔无投射物实体（即发即中）、全部可手动 tick，同屏实体 ≤60（工程惯例）。

---

## 1. 区域布局

### 1.1 网格与坐标

- 设计分辨率 1280×720 横屏；作战网格 **15 列 × 9 行，格宽 64px**（= 4×16 像素 tile，像素对齐），作战场 960×576 居中。
- 网格坐标 `(cx, cy)`，cx∈[0,14]，cy∈[0,8]；格索引 `cell = cy*15 + cx`。
- 像素换算（设计坐标原点居中）：`px = -480 + cx*64 + 32`，`py = 288 - cy*64 - 32`（cy=0 在顶）。
- 屏幕分区：作战场上方 72px = 情报/波次条；下方 72px = 状态条；**左右各 160px 侧栏**（右侧=建造模式塔栏，左侧=祭坛 HP/波次进度）。
- 触屏：格点选用"全屏 touch → 吸附最近格中心"，判定半径 88px（等效热区 ≥88 设计 px）；侧栏按钮视觉 72px + 透明命中区扩到 88px。

### 1.2 平面示意（ASCII，每字符 = 1 格）

```
cx:     0  1  2  3  4  5  6  7  8  9 10 11 12 13 14
cy 0 |  .  .  .  .  .  B  .  .  .  .  .  .  .  .  .
cy 1 |  .  .  .  .  .  |  .  .  .  ~  ~  ~  .  .  .
cy 2 |  .  .  .  .  .  |  .  .  .  ~  ~  ~  .  .  .
cy 3 |  .  .  .  .  .  |  .  .  .  .  .  +  A  A  .
cy 4 |  >  =  =  =  =  +  .  .  .  .  .  |  A  A  .
cy 5 |  .  .  .  .  .  |  .  .  .  .  .  |  .  .  .
cy 6 |  .  .  .  .  .  |  =  =  =  =  =  +  .  .  .
cy 7 |  .  #  #  .  .  .  .  .  .  .  .  .  .  .  .
cy 8 |  .  #  #  .  .  .  .  .  .  .  .  .  .  .  .
```

图例：

| 符号 | 含义 | 格数 |
|---|---|---|
| `>` | **西裂隙**（入口 A，cy=4 左缘，第 4 天开放） | 1 |
| `B` | **北裂隙**（入口 B，cx=5 顶缘，第 10 天起波次启用） | 1 |
| `=\|+` | 进攻路径格（不可建造，怪物行走带） | 21 |
| `A` | **封印祭坛**（2×2：(12,3)(13,3)(12,4)(13,4)，不可建造） | 4 |
| `~` | 异界池塘（装饰，不可建造） | 6 |
| `#` | 岩石（装饰，不可建造） | 4 |
| `.` | **可建造格** | **100** |

合计 135 格 = 21 路径 + 4 祭坛 + 10 障碍 + **100 建造格**。建造格远多于经济可负担的塔数（见 §4.5 节奏表），布局自由度足够，实际同图塔数硬顶 20（§7.2 实体预算）。

### 1.3 守护目标：封印祭坛（替代谷仓）

- 祭坛 **HP 上限 100**（存档字段 `altarHp`），被啃到 0 = 当夜失守（§4.4）。
- 视觉：2×2 发光石阵 + 顶部封印水晶；受击时水晶闪烁 + 屏幕边缘红晕（失败归因可读性）。
- 白天可在封印区花 **20 金币修复至满**（建造模式内「修祭坛」按钮）；失守后次日祭坛回到 50 HP，必须先修复再迎下波——失败可恢复不清档（§8.3）。
- 谷仓退场：原 BARN_X 直线漏怪逻辑废弃；「漏怪偷吃库存」的 _devour 保留（怪物抵达祭坛时触发一次，见 §3.4）。

---

## 2. 作物塔体系

### 2.1 数据结构：crops.json 的 defense 字段定型

防守作物是 **catalogs/crops.json 里的目录行（塔定义）**：不进背包、不产种子、不可出售、不可收获；**放置时直接扣金币**（单层付费，避免"种子+建造费"双层成本）。现有 4 种经济作物 `defense: null` 不动。

```jsonc
// defense 字段统一 schema（全部字段可选、带默认值，向后兼容旧档）
"defense": {
  "kind": "slow" | "attract" | "spike" | "pod",
  "buildGold": 20,          // 放置扣费
  "upgradeGold": 40,        // 升 Lv2 扣费（attract 无升级）
  "radiusCells": 1.5,       // 效果半径（格）
  "power": 0.4,             // kind 语义化：slow=减速比例；spike/pod=单次伤害
  "interval": 1.2,          // spike/pod 的攻击间隔秒
  "hp": 18,                 // 仅 attract：食物量（被啃完即消失）
  "lv2": { "radiusCells": 2.0, "power": 0.5, "interval": 1.0 }  // 覆盖字段
}
```

### 2.2 塔种与数值表（4 种，MVP 全做）

| 塔 | id | kind | 造价 | Lv2 | 半径(Lv1→2) | 间隔 | 效果(Lv1→2) | 被啃？ |
|---|---|---|---|---|---|---|---|---|
| 霜铃花 | frostbell | slow | 20g | 40g | 1.5→2.0 格 | 光环常驻 | 减速 40%→50% | 否 |
| 蜜瓜圃 | honeyplot | attract | 15g | 不可升级 | 吸引 2.5 格 | — | 诱饵，食物量 HP 18 | **是（设计如此）** |
| 尖刺南瓜 | spikepumpkin | spike | 35g | 60g | 1.2→1.5 格 | 1.2s→1.0s | 荆棘环 5→8 伤（小 AOE 打全部） | 否 |
| 豆荚炮 | podgun | pod | 30g | 55g | 3.0→3.5 格 | 1.5s→1.2s | 单体 6→10 伤，锁定"最靠前"怪 | 否 |

- **怪会啃塔吗？** MVP 答案：**只有蜜瓜圃会被啃**（它就是喂给怪的消耗品，食物量啃完消失、未啃完则留到下一夜）；其余塔**不可被攻击、无血量**（上表"血量"列仅 attract 有值），简化判定与美术。monsters.json 预留 `behavior:'cropeater'`（啃塔怪）字段，二期再启用。
- 减速**不叠加取最强**，全局减速上限 60%；精英怪自带 50% 减速抗性（见 §2.4），减速与伤害效果可叠加。
- 豆荚炮 MVP **即发即中**（伤害即时结算 + 0.15s 豆线 Graphics 特效），不产生投射物实体——实体预算更松（§7.2）。

### 2.3 升级与种植规则（轻量 Lv1-2）

- **升级**：建造模式点已有塔 → 升级按钮 → 扣 upgradeGold，立即生效，外观放大 1.2 倍 + 提亮。Lv2 仅数值覆盖，不加新机制。
- **只能种在建造格**（`.` 格）：路径/祭坛/障碍格放置请求直接拒绝（灰格反馈）。
- **不占农场耕地**：防守作物与农场 3×3 耕地产出完全分离——封印区种塔不影响 FarmSystem 收入，农场作物也不可种进建造格。经济与防御两条线，各自取舍（§8.1"防守作物占耕地=牺牲产量"的取舍改由金币承担）。
- **常驻**：塔种下后跨夜存在（存档 `seal.towers`），无耐久衰减；白天可拆除返 60% 金币，**夜间不可拆、波间可补建**（§4.4）。
- 塔即种即全效（MVP 不做生长半效期）；`growDays` 置 0、`seasons: []`（全年可建）。「浇水维护才满效」作为 P1 备选规则挂在开放式问题（§8.2）。

### 2.4 与怪物抗性的联动（给情报系统留钩子）

monsters.json 新增可选字段（缺省=无抗性）：

```jsonc
{ "id": "slime_elite", "speed": 38, "attackInterval": 1.5, "slowResist": 0.5, ... }
{ "id": "sporeling",   "speed": 38, "attackInterval": 1.5, "baitImmune": true, ... }
```

- `slowResist: 0.5`：受到的减速比例减半（精英 40%→实感 20%）。
- `baitImmune: true`：孢子菇无视蜜瓜圃——**这是情报驱动的布置分岔点**：前夜情报说"孢子菇不吃蜜瓜"，当夜主攻含孢子菇时，蜜瓜圃只对粘怪生效，玩家必须补尖刺南瓜/豆荚炮顶线。满足 §4.3 验收"两份不同情报对应不同最优布置"。

---

## 3. 进攻路径与寻路

### 3.1 结论：固定 waypoints，不做 A*

路径固定（§3.3 三刀拍板"不做自由寻路"）、塔永远不能建在路径格上、怪物不绕障碍——三个前提成立，则动态寻路没有存在必要。**方案 = 路径点数组 + 直线插值 + 塔光环减速 + 诱饵临时改目标**，全部 O(怪数) 计算。

路径定义（新目录 `catalogs/defense_maps.json`，见附录 C）：

```
pathA（西线）: (0,4) → (5,4) → (5,6) → (11,6) → (11,3) → 啃祭坛
pathB（北线）: (5,0) → (5,4) →（并入 A 后段）(5,6) → (11,6) → (11,3) → 啃祭坛
```

- 两线在 **(5,4) 十字路口汇合**，(11,3)→祭坛的最后一竖列是决战走廊——路口与走廊是天然火力点，布置教学围绕它们展开。
- 路径长度：A 线 ≈ 17 格 ≈ 1088px，B 线 ≈ 15 格 ≈ 1024px（两线基本等长，无失衡侧）。
- 暴露时间：粘怪 60px/s 全程 ≈ **18s**；孢子菇/巨粘怪 38px/s ≈ **29s**；被霜铃花减速 40% 后粘怪 ≈ 30s。这是所有塔 DPS 校验的时间基准（§4.5）。

### 3.2 怪物状态机与移动伪代码

```
MState: Walk → ChewBait → Walk → … → ChewAltar（终态：啃到死或祭坛毁）

tickMonster(m, dt):
  switch m.state:
  case Walk:
    wp = path(m).points[m.wpIndex]
    m.pos += norm(wp - m.pos) * m.speed * slowFactor(m) * dt
    if dist(m.pos, wp) < 8: m.wpIndex++
    if m.wpIndex == points.length: arriveAltar(m)      // 见 3.4
  case ChewBait:
    bait.hp -= m.damage; m.timer -= dt                 // 每秒咬一口
    if bait.hp <= 0: destroyBait(bait); m.state = Walk // 吃完→走回最近路径点
    if m.timer <= 0: m.state = Walk                    // 兜底：站立上限 8s
  case ChewAltar:
    m.timer -= dt
    if m.timer <= 0: m.timer = m.attackInterval; altarHit(m.damage)

slowFactor(m) = 1 - min(0.60, max(半径内霜铃花.power * (1 - m.slowResist)))
```

- 每帧只做"指向下一 waypoint 的直线移动 + 距离判定"，无网格碰撞、无分离力（单路径带内密度低，视觉重叠由生成间隔控制）。
- 每只怪只在 **进场时**决定走 A 还是 B（波次表 `entrance` 指定），中途不换线（终波"换线"= 波次表直接给不同 entrance，§4.3）。

### 3.3 诱饵田吸引逻辑（蜜瓜圃）

- **决策时机**：每 0.25s 一批（省扫描），只对 `Walk` 怪生效；`baitImmune` 怪直接跳过。
- **吸引**：`dist(m, bait) <= bait.attractRadius(2.5格=160px)` → 改状态 ChewBait，直线走向蜜瓜圃（可斜穿建造格，无碰撞）。
- **进食**：每 1.0s 咬掉 `m.damage` 点食物量；多怪可同啃一个（食物量 18 ≈ 单怪 6 口 ≈ **拖住单怪 5-6s**，3 只怪围啃 2s 吃完）→ 蜜瓜圃是"廉价群体延时闸门"（design-improvement-proposal §6 诱饵农圃点子的落地方案）。
- **吃完/超时**：怪物直线走回**最近 waypoint**（预计算各路径点距离取最小），恢复 Walk。
- 布置博弈：蜜瓜圃贴路径格放置价值最大（半径覆盖更多过路怪）；放到离路 2 格外则单体绕行成本高但覆盖少——留给玩家琢磨。

### 3.4 到祭坛的攻击判定（漏怪新语义）

- 怪物走完 waypoints 抵达 (11,3)（贴祭坛格），进入 `ChewAltar`：**不再前进**，每 `attackInterval(1.5s)` 对祭坛造成 `damage`（粘怪 3 / 巨粘怪 4 / 孢子菇 3 → 单怪约 2-2.7 dps）。
- 抵达瞬间触发一次 `_devour`（复用现有偷吃库存逻辑）——"漏怪偷吃"的原有风味保留，且定损可数（§8.3 按漏怪数量定损）。
- 祭坛 HP ≤ 0 → 当夜立即失守（§4.4）；被玩家/塔击杀的 ChewAltar 怪正常计入 `killed`，不算漏怪——**漏怪数 = 抵达过祭坛的怪数**（leaked 在 arriveAltar 时 +1，击杀不回退），归因面板口径清晰。
- 单只粘怪独啃 100 HP 祭坛需 ≈ 40s：零防守时一波 3 怪约 13s 咬穿 → 首夜不做任何布置会输，逼玩家完成教学布置；但漏 1-2 只不会立刻死，给修补窗口。

---

## 4. 波次与难度曲线

### 4.1 defense_waves.json 格式扩展（向后兼容）

```jsonc
{
  "id": "seal_pack_2",
  "mapId": "seal_1",            // 新增：用哪张防守地图（缺省 seal_1）
  "firstDay": 10, "everyDays": 4,
  "waveBreak": 25,              // 新增：波间修补秒数（缺省 25）
  "waves": [                     // 逐波门控（改造后不再全并发）
    { "monsterId": "slime", "count": 4, "interval": 1.4, "delay": 1.0,
      "entrance": "A" },         // 新增：A=西裂隙 B=北裂隙（缺省 A）
    ...
  ],
  "intel": {                     // 新增：守门人情报文案（§5）
    "entranceHint": "双线",      // A | B | 双线（终波换线时只写主攻线，留悬念）
    "hint": "孢子菇不吃蜜瓜……它们怕刺，不怕甜。"
  },
  "reward": [ { "itemId": "gold", "min": 30, "max": 45 } ],
  "noLeakBonus": [ { "itemId": "gold", "min": 20, "max": 30 } ]  // 新增：祭坛≥90HP 时追加
}
```

旧三表（night_slime_1/2、night_spore_1）**标记废弃、由新表替换**：旧字段缺省规则（entrance=A、无 mapId）保证旧 JSON 仍可加载，但首发即换新表，无需迁移函数（表数据不入存档）。

### 4.2 波次调度：逐波门控 + 波间修补（真正实装 §8.1 的 60-90s 修补窗）

现有实现把所有波摊在同一时间轴并发（wave2 的 delay 是绝对时刻），"波间修补"名存实亡。改造为：

```
tick:
  当前波 plan 依 delay/interval 生成
  if 当前波已生成完 && 当前波怪全灭:
      if breakTimer == null: breakTimer = def.waveBreak
      breakTimer -= dt; HUD 倒计时「下一波 XXs」
      if breakTimer <= 0: 进入下一波
  全部波结束 && 场上无怪 → 终局判定
```

- **波间 25s 内可进入建造模式补塔**（夜间建造不暂停时间，正在啃祭坛的怪会强制退出建造 UI 并红光警示）——"波间动态调整权是策略感主体"（§4.3 评审共识）落地。夜间可建不可拆。
- waveBreak 起点 25s（§8.1 写的 60-90s 对 2 分钟一场的 MVP 夜战太拖，真机手感后回调）。

### 4.3 三张难度递进表（具体数值）

| 表 | id | 首发日 | 周期 | 波次编排 | 敌方总 HP | 教学点 |
|---|---|---|---|---|---|---|
| T1 教学 | seal_slime_1 | d4 | 4天 | W1：slime×3，interval 1.6，delay 1.0，入口 A | 36 | 单线+路径认知；1-2 座塔即可守 |
| T2 双线 | seal_pack_2 | d10 | 4天 | W1：slime×4 A（探测）；W2：sporeling×2 B（interval 3.0，delay +3.0，新线+免疫教学）；W3：slime_elite×1 A + slime×3 B（同时入场） | 88 | 北裂隙开放；蜜瓜对孢子菇无效；精英减速抗性 |
| T3 高压 | seal_spore_3 | d20 | 4天 | W1：sporeling×2 B；W2：slime×4 A + slime×2 B；W3：slime_elite×2 A（interval 5.0）+ sporeling×2 B；W4 终波换线：slime×3 B + sporeling×1 A | 122 | 多线分兵；终波入口偏移（§8.1 规则变化） |

- **终波换线的诚实性**：T3 情报写"主攻西线"（覆盖 W1-W3 的 9 只怪），W4 从北线插入——预告型入侵里保留一次"规则变化"的张力，但主线情报仍然为真，不欺骗玩家（§8.1 终波·入口偏移的原意）。
- d36+ 之后：T3 每 4 天重复会疲劳，二期加 seal_nightmare 表并与「封印修复度」里程碑（A3）挂钩——列入开放式问题 §8.2。
- 难度全部来自**职责混合与线路压力**，无任何 HP/数量百分比递增。

### 4.4 胜负判定与奖惩（衔接 EconomySystem）

| 结果 | 判定 | 奖惩 |
|---|---|---|
| **完胜** | 全波清空且祭坛 HP ≥ 90 | 表 reward + noLeakBonus，SfxLib 'win' |
| **胜利** | 全波清空，祭坛 HP < 90（有漏怪但守住） | 表 reward，无加成 |
| **失守** | 祭坛 HP ≤ 0，当夜立即结束 | 无 reward；补偿 5-10 金；**首败免罚**（flags 首败标记）；次日祭坛回 50 HP，需 20g 修复 |

- 发放走现有 `settle()` → `GameApp.giveItem`（EconomySystem 单一金币体系，§11.1），奖励以材料+金币为主，T3 首胜追加 `seal_shard`（封印碎片，剧情/二期修复度货币）。
- 结算面板加**归因行**：`西线漏 2 · 北线漏 0 · 祭坛剩余 62`（"失败后不看日志能说出哪条路漏了"的验收项）。
- 离线红线不变：防守只挂睡觉在线流程（BedtimeDialog → DefenseOverlay），离线绝不判定失守。

### 4.5 经济节奏校验（造价 vs 收入）

| 天数 | 预计累计可支配金币* | 当夜需求 | 匹配 |
|---|---|---|---|
| d4 | 30-60g | 1-2 座塔（35-55g） | ✓ 教学 |
| d10 | 200-400g | 4-6 座塔（约 130-180g） | ✓ 双线覆盖 |
| d20 | 500-900g | 8-12 座 + 首批 Lv2（约 350-500g） | ✓ 分层防线 |

\* 按 §6.1 价锚（售 8/15/25/60）+ 日常开销估算；DebugPanel 打印实际曲线校准。
防御 DPS 校验：1 座豆荚炮（4 dps）在路径覆盖 ≈ 4 格 ≈ 3.2s/怪，一只粘怪过境吃 3-4 发 ≈ 21 伤 > HP12，可独立击杀——T1「1-2 座塔守住 3 怪」成立；T3 需 8-12 座组合，与 §4.3 表匹配。所有数值为起点值，灰盒调参。

---

## 5. 情报系统（守门人前夜提示，新形态呈现）

情报内容升级为四元组，全部数据驱动（波次表 `intel` 字段）：

```ts
intelTonight(): { monsterName: string; count: number;
                  entranceHint: '西裂隙'|'北裂隙'|'双线'; hint: string }[]
```

呈现三层（同一份数据，三个触点）：

1. **前一日 HUD 情报条**（左上 72px 栏）：`守门人：明夜 北裂隙 · 孢子菇×2 ——它们不吃蜜瓜。`（复用现有 nextNightDay + intelTonight，扩展 dayIndex+1 查询）。
2. **封印区白天建造模式**：两个裂隙入口上方图标预告（箭头 + 怪剪影），布置时直接看得见"往哪布"。
3. **夜战开场简报卡**（3 秒，替代现 DefenseOverlay 顶部一行字）：怪物×数量×入口 + hint 全文，可点击跳过。

- 守门人 NPC 线性对话（JSON 脚本）按表播报同一段 hint——NPC、HUD、简报卡三处同源，改文案只动表。
- 模糊度控制：入口写"双线"时不说比例，弱点只给类型不给数值——布置仍是下注，不存在万能阵（§8.1 情报不完全原则）。

---

## 6. 操作流

### 6.1 白天布置流

```
大地图 → 点击封印盆地入口
  → 进入封印区（白天态：可走动；顶部情报条常驻）
  → 右侧栏 [建造] → 进入建造模式
       ├─ 右栏选塔（豆荚炮/尖刺南瓜/霜铃花/蜜瓜圃，按钮显示造价）
       ├─ 点建造格 → 幽灵预览 + 射程圈 + 绿/红可建反馈 → 确认放置（扣金币）
       ├─ 点已有塔 → [升级 Lv2] / [拆除返60%]
       └─ [修祭坛]（20g 回满，仅白天）
  → [离开] → 回大地图（seal.towers 已写入存档）
```

### 6.2 夜晚防守流（推荐：**自动作战 + 可选参战**）

```
睡觉确认 → hasNightTonight?
  → 封印之夜开场：情报简报卡 3s（怪×数×入口，可跳过）
  → W1 自动开打（塔全自动；波间倒计时 25s 可随时进建造模式补塔）
  →    玩家可选参战：点击怪物 = 挥击 4-7 伤（复用 playerHit）
       · 玩家击杀 → monsters.rewards 掉落归玩家（参战有额外收益）
       · 塔击杀   → 无掉落（不惩罚不参战，也不让挂机白拿材料）
  → …逐波 + 波间修补 → 终局
  → 结算面板：胜负 + 归因行（哪条线漏怪/祭坛余量）+ 奖励清单
  → 天亮 → endDay → persist（离线红线：只挂睡觉流程）
```

**推荐理由**（备选均已否决）：用户拍板塔防的乐趣在「布置」而非操作——
- 方案 A 全自动（删点击挥击）：损失现有零成本的参与感与手感资产，弃；
- 方案 C 强制参战：违背拍板方向，且触屏高频点击在中低端机易疲劳，弃；
- **方案 B（推荐）**：塔自动打底保证"布置好就能赢"，点击挥击作为可选加成保留既有 DefenseOverlay 交互代码，掉落归属设计让参战"有甜头、非必需"。

---

## 7. DefenseSystem 改造点清单与实体预算

### 7.1 代码改造清单

| 模块 | 处置 | 明细 |
|---|---|---|
| DefenseSystem.ts | **保留** | 表驱动选表（firstDay/everyDays 多表取 firstDay 最大）、hasNightTonight/nextNightDay、tick(dt) 手动驱动、playerHit 4-7 伤、_devour 偷吃、settle() 发奖 + EventBus 事件、离线顺延红线 |
| DefenseSystem.ts | **改造** | ①移动：直线冲 BARN_X → waypoints 逐点插值（§3.2）；②三车道随机 y → 路径 A/B 入口（Spawn 位置=入口格）；③漏怪=到达即漏 → ChewAltar 状态机（祭坛 HP + attackInterval）；④plan 全并发 → **逐波门控 + waveBreak**（§4.2）；⑤NightDef 增加 mapId/entrance/intel/noLeakBonus 解析（缺省值兼容）；⑥新增 slowFactor/attract 决策（每帧/每 0.25s） |
| DefenseSystem.ts | **新增** | TowerSystem 职责（可并入本类）：建造格索引与占用表、塔 CRUD（扣费/升级/拆除）、塔效果 tick（spike 环 AOE / pod 锁定最前）、`seal` 存档段读写（SaveManager v2 加字段 + 迁移函数） |
| DefenseOverlay.ts | **改造** | ①地面平铺 → 网格渲染（Graphics 一次性画 135 格 + 路径带高亮）；②谷仓节点 → 祭坛 2×2 + HP 条；③顶部一行情报 → 开场简报卡（3s 可跳过）；④结果面板加归因行；⑤左右 160px 侧栏（建造塔栏 / 祭坛 HP+波次进度） |
| DefenseOverlay.ts | **保留/池化** | 怪物节点（精灵+HP条+点击挥击）保留逻辑并改 NodePool；飘字/命中特效池化 |
| defense_waves.json | **替换** | 旧 3 表废弃，新 3 表（§4.3，含新字段） |
| crops.json | **追加** | 4 条防守作物行（frostbell/honeyplot/spikepumpkin/podgun，defense 字段按 §2.1） |
| monsters.json | **扩展** | 补 speed/attackInterval 显式字段 + slowResist/baitImmune（缺省兼容） |
| 新文件 | **新增** | catalogs/defense_maps.json（网格、路径 waypoints、祭坛格、障碍格，附录 C） |

### 7.2 同屏实体预算核算（≤60 红线）

| 实体 | 峰值 | 说明 |
|---|---|---|
| 怪物 | 12（硬顶） | T3 终波双线并发 ≈ 9-13，超顶生成挂起队列、死亡即补 |
| 塔 | 20（建造硬顶） | 经济自然限制 + 硬顶双保险 |
| 特效（命中闪/减速圈/豆线） | 12 | NodePool |
| 飘字（伤害/金币） | 8 | NodePool |
| 常驻（祭坛/双入口/地面/网格画布） | 5 | 不池化 |
| **合计** | **57 ≤ 60** | ✓ |

豆荚炮即发即中不产生投射物实体是预算达标的关键取舍；若真机压测富余，二期再升级为池化豆子投射物。

---

## 8. 风险与开放式问题

### 8.1 风险

1. **固定路径的重复感**：同一张图每 4 天打一次，5 次后新鲜度衰减（A7 同款问题）。缓解：终波换线、每日怪物配置变异（P1）、二期 nightmare 表 + 封印修复度联动。
2. **数值未实测**：塔 DPS × 暴露时间 × 波 HP 的三角关系全靠纸面推导，必须灰盒第一周用 DebugPanel（跳天/模拟夜战/一键满防）跑通三表再锁数值。
3. **100 格全填死防**：经济上后期金币盈余可能堆出铁桶阵。已有双保险（塔硬顶 20 + 波次职责混合），若仍失效，二期引入塔耐久/维护费。
4. **夜间建造误触**：战斗中切建造模式的触屏冲突与"建造时被啃"的挫败——已规定波间才能安心建、祭坛受击强制退出建造 UI，需真机验证手感。
5. **祭坛被啃的可读性**：失败归因依赖"哪条线漏怪"的视觉反馈（入口方向红光、祭坛掉血特效），美术/特效不做则教学闭环断裂——列为验收项而非可选打磨。
6. **美术增量**：4 塔 × 2 级外观 + 祭坛 + 双裂隙入口 + 网格贴图，按 AI 提示词表（§18 拍板）生产，估 1-2 天量级。
7. **大地图接口未定**：本文档只定义封印区内部；区域间移动/入口节点归世界地图文档，需回填 `mapId` 之外的接入协议。

### 8.2 开放式问题（待拍板/待验证）

1. 防守作物是否吃季节限制？（建议 MVP 全年可建，`seasons: []`；季节限定留给二期风味）
2. 拆除退款 60% 是否改为白天全额、夜间不退？（当前按 60% 统一）
3. 祭坛修复定价：20g 全修 vs 材料制（探险产出木材/石料）——材料制更能拉探险需求，但多一条资源链。
4. waveBreak 25s 手感（§8.1 原案 60-90s 是否在真机上更好）。
5. 「浇水维护才满效」P1 变体：塔隔日未浇水半效，把农场日常和防守拧在一起——趣味 vs 琐碎，需试玩验证。
6. d36+ 强度表（seal_nightmare）与封印修复度里程碑（A3）的挂钩方式。
7. 玩家参战掉落归属（§6.2 方案 B）是否助长"挂机党"与"手动党"的体感分化——留存数据说话。

---

## 附录 A：defense_waves.json 新表完整示例（T2）

```json
[
  {
    "id": "seal_slime_1", "mapId": "seal_1",
    "everyDays": 4, "firstDay": 4, "waveBreak": 25,
    "waves": [
      { "monsterId": "slime", "count": 3, "interval": 1.6, "delay": 1.0, "entrance": "A" }
    ],
    "intel": { "entranceHint": "西裂隙", "hint": "粘怪怕刺。路口放一座尖刺南瓜，再补个霜铃花拖慢它们。" },
    "reward": [ { "itemId": "gold", "min": 15, "max": 25 } ],
    "noLeakBonus": [ { "itemId": "gold", "min": 8, "max": 12 } ]
  },
  {
    "id": "seal_pack_2", "mapId": "seal_1",
    "everyDays": 4, "firstDay": 10, "waveBreak": 25,
    "waves": [
      { "monsterId": "slime", "count": 4, "interval": 1.4, "delay": 1.0, "entrance": "A" },
      { "monsterId": "sporeling", "count": 2, "interval": 3.0, "delay": 3.0, "entrance": "B" },
      { "monsterId": "slime_elite", "count": 1, "interval": 1.0, "delay": 6.0, "entrance": "A" },
      { "monsterId": "slime", "count": 3, "interval": 1.4, "delay": 6.0, "entrance": "B" }
    ],
    "intel": { "entranceHint": "双线", "hint": "孢子菇不吃蜜瓜……它们怕刺，不怕甜。" },
    "reward": [ { "itemId": "gold", "min": 30, "max": 45 }, { "itemId": "slime_gel", "min": 2, "max": 3 } ],
    "noLeakBonus": [ { "itemId": "gold", "min": 20, "max": 30 } ]
  },
  {
    "id": "seal_spore_3", "mapId": "seal_1",
    "everyDays": 4, "firstDay": 20, "waveBreak": 25,
    "waves": [
      { "monsterId": "sporeling", "count": 2, "interval": 2.2, "delay": 1.0, "entrance": "B" },
      { "monsterId": "slime", "count": 4, "interval": 1.4, "delay": 3.0, "entrance": "A" },
      { "monsterId": "slime", "count": 2, "interval": 1.6, "delay": 3.0, "entrance": "B" },
      { "monsterId": "slime_elite", "count": 2, "interval": 5.0, "delay": 6.0, "entrance": "A" },
      { "monsterId": "sporeling", "count": 2, "interval": 3.0, "delay": 6.0, "entrance": "B" },
      { "monsterId": "slime", "count": 3, "interval": 1.6, "delay": 9.0, "entrance": "B" },
      { "monsterId": "sporeling", "count": 1, "interval": 1.0, "delay": 9.0, "entrance": "A" }
    ],
    "intel": { "entranceHint": "西线为主", "hint": "这次它们嗅到了封印的裂痕……小心最后一批不按常理来。" },
    "reward": [ { "itemId": "gold", "min": 35, "max": 50 }, { "itemId": "spore_cap", "min": 2, "max": 3 } ],
    "firstClearBonus": [ { "itemId": "seal_shard", "min": 1, "max": 1 } ],
    "noLeakBonus": [ { "itemId": "gold", "min": 25, "max": 35 } ]
  }
]
```

（W1-W4 的同波多入口用相同 delay 表达"同时入场"；逐波门控改造后 delay 为**波内相对时刻**。）

## 附录 B：crops.json 防守作物行

```json
[
  { "id": "frostbell", "name": "霜铃花", "seasons": [], "growDays": 0, "harvest": null, "sellPrice": 0,
    "stages": [{ "day": 0, "sprite": "defense/frostbell" }, { "day": 0, "sprite": "defense/frostbell_2" }],
    "defense": { "kind": "slow", "buildGold": 20, "upgradeGold": 40, "radiusCells": 1.5, "power": 0.4,
                 "lv2": { "radiusCells": 2.0, "power": 0.5 } } },
  { "id": "honeyplot", "name": "蜜瓜圃", "seasons": [], "growDays": 0, "harvest": null, "sellPrice": 0,
    "stages": [{ "day": 0, "sprite": "defense/honeyplot" }],
    "defense": { "kind": "attract", "buildGold": 15, "radiusCells": 2.5, "hp": 18 } },
  { "id": "spikepumpkin", "name": "尖刺南瓜", "seasons": [], "growDays": 0, "harvest": null, "sellPrice": 0,
    "stages": [{ "day": 0, "sprite": "defense/spikepumpkin" }, { "day": 0, "sprite": "defense/spikepumpkin_2" }],
    "defense": { "kind": "spike", "buildGold": 35, "upgradeGold": 60, "radiusCells": 1.2, "power": 5, "interval": 1.2,
                 "lv2": { "radiusCells": 1.5, "power": 8, "interval": 1.0 } } },
  { "id": "podgun", "name": "豆荚炮", "seasons": [], "growDays": 0, "harvest": null, "sellPrice": 0,
    "stages": [{ "day": 0, "sprite": "defense/podgun" }, { "day": 0, "sprite": "defense/podgun_2" }],
    "defense": { "kind": "pod", "buildGold": 30, "upgradeGold": 55, "radiusCells": 3.0, "power": 6, "interval": 1.5,
                 "lv2": { "radiusCells": 3.5, "power": 10, "interval": 1.2 } } }
]
```

## 附录 C：defense_maps.json（新目录）

```json
[
  {
    "id": "seal_1",
    "gridW": 15, "gridH": 9, "cellSize": 64,
    "altar": { "cells": [57, 58, 72, 73], "hpMax": 100, "repairGold": 20 },
    "entrances": { "A": { "cell": 60, "name": "西裂隙" }, "B": { "cell": 5,  "name": "北裂隙" } },
    "paths": {
      "A": [[0,4],[5,4],[5,6],[11,6],[11,3]],
      "B": [[5,0],[5,4],[5,6],[11,6],[11,3]]
    },
    "blocked": [57,58,72,73, 24,25,26,39,40,41, 106,107,121,122],
    "decor": { "pondCells": [24,25,26,39,40,41], "rockCells": [106,107,121,122] }
  }
]
```

（cell 索引 = cy*15+cx；blocked = 祭坛+障碍并集；建造格 = 全格 − 路径格 − blocked，运行时由 paths 推导，不单独存表。）

## 附录 D：存档 seal 段（SaveManager v2 增量）

```json
"seal": {
  "towers": [ { "cell": 47, "cropId": "podgun", "level": 1 } ],
  "altarHp": 100,
  "firstLossForgiven": false
}
```

蜜瓜圃存 `hp`（被啃剩余食物量），未啃完跨夜保留；迁移函数：缺 seal 字段的旧档补默认值，字段只增不删。
