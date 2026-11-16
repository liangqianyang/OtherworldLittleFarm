# 《异界小农场》元气骑士式副本战斗设计（实时战斗 v1）

> 文档状态：v1 设计稿（2026-11-16）。方向拍板：星露谷整体结构 + 元气骑士战斗玩法 + 塔防封印防守。
> 上游文档：docs/design/game-design-draft.md（§5.2 探险 / §7 探险与战斗 / §17 触屏）、docs/design/design-improvement-proposal.md（§5 触屏 / §6 关卡 / §7 技术骨架）。
> 代码基线：assets/scripts/gameplay/adventure/AdventureSystem.ts、assets/scripts/ui/BattlePanel.ts、assets/scripts/ui/AdventureHUD.ts、assets/data/catalogs/{adventure_rooms,monsters,items}.json。
> 工程约束（不可违反）：Cocos 3.8.8；2D 像素；横屏 1280×720 设计分辨率；触屏；无物理引擎（手工 AABB + 距离判定）；NodePool 池化；同屏活跃实体 ≤60；逻辑层可手动 tick（后台标签页 RAF 停转时自动化测试可用）；单人产能；中低端安卓微信容器流畅。

---

## 0. 一页速览（拍板结论）

| # | 决策项 | 结论 |
|---|---|---|
| 1 | 操作方案 | **移动摇杆 + 攻击钮（长按连发 + 自动瞄准最近敌人）+ 闪避翻滚钮**；不做双摇杆全手动 |
| 2 | 闪避 | 翻滚 0.30s，其中前 0.22s 无敌帧；CD 0.8s；支持输入缓冲 |
| 3 | 武器 | 近战 2 + 远程 2 起步；近战挥砍**可消除敌弹**（元气骑士核心机制）；2 快捷槽切换 |
| 4 | 敌人 | chaser / shooter / tank 三行为状态机 + 精英（分裂）；monsters.json 加 5 个扩展字段 |
| 5 | 房间 | 手工房间链保留，schema v2（房间尺寸/波次/门锁/宝箱）；模板拼接延后到第二张图 |
| 6 | 单局 | 7-8 房、5-8 分钟、清怪开门、安全房可撤、战斗房锁门 |
| 7 | 玩家 | HP 20 保持；受击无敌 0.8s；死亡惩罚维持收获减半；成长 = 武器升级 Lv3 + 封印祭坛 HP 上限 |
| 8 | 表现 | P0：闪白/飘字/血条/爆浆；P1：击退/挥砍弧/轻震动；P2 可砍：顿帧/拖尾/弹壳 |
| 9 | 代码 | BattlePanel→CombatScene（实时）替换；AdventureSystem 保留房链骨架改为"实时事件代理"；AdventureHUD 改战斗 HUD |
| 10 | 逻辑结构 | CombatLogic（纯逻辑 fixed 30Hz，可手动 step）+ CombatSceneView（渲染表现）分离 |

---

## 1. 操作方案

### 1.1 推荐方案：移动摇杆 + 攻击钮自动瞄准（否决双摇杆全手动）

**结论：采用「动态移动摇杆（左）+ 攻击钮（右下，长按自动连发，自动瞄准最近敌人）+ 闪避钮（右下偏上）」三件套，即元气骑士手机端的默认操作模型。**

| 对比项 | A. 摇杆+攻击钮自动瞄准（推荐） | B. 双摇杆全手动瞄准 |
|---|---|---|
| 元气骑士实证 | 官方手机端默认方案，绝大多数玩家使用；手搓双摇杆仅存于高阶玩家设置项 | 存在但非主流，需要辅助瞄准兜底才可玩 |
| 上手成本 | 走位即操作，注意力在"躲弹幕"这个核心乐趣上 | 三线操作（走位+瞄准+闪避），拇指遮挡视野，像素俯视角下精度差 |
| 单人产能 | 无需调"弹道手感/瞄准辅助"两套参数 | 需要额外做瞄准辅助（不辅助则劝退，辅助了等于方案 A） |
| 适配本作受众 | 农场玩家跨过来的轻度动作用户，战斗是调剂不是主业 | 硬核动作玩家，与"不以高压操作为主"（§1 项目概述）冲突 |
| 走位深度 | 保留：射击朝向带移动方向微吸附（见 1.3-⑦），风筝/拉扯技巧依然存在 | 高 |

**自动瞄准规则（关键手感参数）：**

1. **目标选择**：射程内（当前武器 range + 20px 余量）+ 视线可达（首版房间为单屏平面，装饰遮挡不挡视线与子弹，见 §4.5，故仅判距离）+ 最近者。
2. **锁定粘滞**（防弹道抖动的核心）：已锁定目标不因新目标出现而立即切换；仅当 `新目标距离 < 当前目标距离 × 0.7` 或当前目标死亡/出射程时切换。当前目标身上显示 2px 白色描边（4 帧）。
3. **无敌人在射程内**：朝移动方向攻击（扫草/开罐的交互感）；静止无输入时保持上次朝向。
4. **近战轻吸附**（§17 既定规范）：面朝方向与目标方向夹角 ≤45° 时，本次挥砍朝向目标中心；否则朝移动方向。吸附仅在起手瞬间结算，挥砍中途不追踪。
5. **敌人选择不越仇恨表**：优先攻击"已激活（alert）"的敌人，未激活的沉睡怪不吸引火力（玩家可绕过战斗房外围的怪——速通路线价值）。

### 1.2 闪避/翻滚（有无敌帧，有 CD）

| 参数 | 值 | 说明 |
|---|---|---|
| 翻滚时长 | 0.30s | 全程锁移动输入（方向由起手时摇杆决定） |
| 无敌帧 | 0 ~ 0.22s | 前 73% 无敌；末尾 0.08s 可被命中（防"滚进弹幕里睡觉"）；§17 "宽无敌帧"落地 |
| 冲刺位移 | 170px | 峰值速度 ≈570px/s；方向 = 摇杆方向，无输入时 = 面朝方向 |
| 冷却 CD | 0.8s | 从翻滚**结束**起算；CD 中闪避钮置灰 + 环形进度 |
| 输入缓冲① | 攻击缓冲 0.15s | 翻滚中按下攻击 → 翻滚结束 0.15s 内自动补出第一击（连招手感） |
| 输入缓冲② | 翻滚取消 0.15s | 近战攻击前摇的前 0.15s 内按闪避 → 取消攻击立即翻滚（高手向容错） |
| 表现 | 翻滚残影 2 帧拖尾（P1） | 无敌帧期间角色半透明 60%（可读的判定反馈） |

### 1.3 操作参数表（实现验收值）

| # | 参数 | 值 |
|---|---|---|
| ① 摇杆 | 动态摇杆：左半屏（x<640）任意 TOUCH_START 生成原点 | 原点生成即视觉摇杆出现 |
| ② 死区 | 14px | 死区内不产生移动输入（防拇指静置漂移） |
| ③ 最大拖动 | 60px；超过后**原点跟随手指**（滑底跟随，长距离不脱手） | 输出归一化 = (offset−14)/(60−14)，全向模拟量（不做 8 向 snap） |
| ④ 攻击钮 | 直径 120px，圆心 (1150,560)，距边缘 ≥24px | §17 既定坐标不动 |
| ⑤ 攻击触发 | TOUCH_START **立即打出发第一击**（零延迟响应）；按住后按武器 interval 自动连发；抬手停止 | 首版不做"点按/长按"双模式设置 |
| ⑥ 闪避钮 | 直径 96px，圆心 (980,470)；CD 环形进度可视化 | §17 既定坐标不动 |
| ⑦ 移动吸附射击 | 远程发射方向 = 锁定目标方向，但允许向移动方向偏转 ≤15° 吸附 | 走位射击爽感来源；纯站桩输出会被 shooter 弹幕惩罚 |
| ⑧ 玩家移速 | 150 px/s（chaser 90 / tank 50，玩家永远快于敌人——逃跑空间） | 房间 1.5 屏对穿 ≈10s |
| ⑨ 多点触控 | 摇杆/攻击/闪避三路独立 touch id 跟踪，任何一路 touchcancel 不污染其他路 | §17 盲区清单"多点触控丢点保活" |
| ⑩ 布局示意 | 左半屏=摇杆热区；右下攻击(1150,560)+闪避(980,470)；武器切换小槽 2×64px 在攻击钮正上方 (1150,430)/(1150,350) | 拇指热区，符合"横握遮挡左下/右下 200px"盲区检查——右下只放操作钮不放信息 |

---

## 2. 武器体系

### 2.1 武器总表（起步 4 把：近战 2 + 远程 2）

判定基准：玩家 HP 20；清一只 chaser（hp12）目标 2-3s，精英房整体 60-90s。近战 DPS 高于远程 ≈2 倍（贴脸风险定价），**且近战挥砍可消除弧内敌方子弹**（防御价值，元气骑士核心机制，4 把武器里的近战全部可挡弹）。

| id | 名称 | 类 | 伤害 | 攻击间隔 | 范围/弹道 | 特殊效果 | 获取方式 |
|---|---|---|---|---|---|---|---|
| rust_chopper | 旧柴刀 | 近战 | 5 | 0.50s | 弧形 100°，半径 56px | 击退 40px；**挡弹** | 初始自带（老农的柴刀） |
| thorn_rapier | 荆棘刺剑 | 近战 | 6 | 0.55s | 弧形 90°，半径 64px | 命中附加中毒：每 0.5s 1 伤 ×4 跳；击退 20px；**挡弹** | 工坊打造：wood×5 + slime_gel×3 + 30 金币；副本宝箱 15% |
| wood_musket | 木柄铳 | 远程 | 3 | 0.60s | 单发直线，弹速 380px/s，弹半径 6px，射程 420px | 无 | 旅行商人商店 50 金币；首次通关 old_wood 奖励 |
| tri_star_bow | 三连星弩 | 远程 | 2×3 | 0.95s | 3 发扇形（夹角 12°），弹速 320px/s，弹半径 5px，射程 380px | 近距离 3 发可全中（点杀 DPS 6.3） | 工坊打造：wood×8 + slime_gel×5 + 80 金币；精英房宝箱 40% |

DPS 对照：柴刀 10.0 / 刺剑 10.9+毒 4 / 木柄铳 5.0 / 三连弩 6.3（贴脸）。
平衡校验：木柄铳打 slime（hp12）需 4 发 2.4s；柴刀贴脸 3 击 1.5s 但吃 1-2 次反击风险——风险收益成立。

**武器升级（衔接 §5 成长）**：Lv1→Lv2 伤害 ×1.4（柴刀 7/铳 4），Lv2→Lv3 ×1.4（柴刀 10/铳 6），间隔/范围不变；升级在农场工坊，消耗金币+副本材料（见 §5.3）。

### 2.2 武器切换 UI（背包快捷槽）

- **农场端（出发前）**：背包面板新增"战斗装备"区，选 2 把放入快捷槽 `loadout: [weaponId, weaponId]`（存档字段）；只带 1 把则槽 2 空。
- **副本端（战斗中）**：攻击钮正上方两个 64px 视觉武器图标（热区放大到 88px，视觉/热区分离规范）；当前武器金色描边；点击切换，切换 CD 0.3s（防误触连点），切换动画 0.25s（武器收起/举起，期间不可攻击）。
- **副本内拾取武器**：宝箱开出未装备武器 → 弹小面板"替换 槽1/槽2/放弃"（实时战斗中打开面板**自动暂停**，见 §7 暂停规则）。
- 武器不可丢弃、无耐久（单人产能，砍掉维护系统）。

### 2.3 判定实现伪代码（无物理引擎）

```ts
// ===== 近战挥砍：扇形弧判定（起手结算朝向，持续帧内检测，每人每挥只结算一次）=====
interface MeleeSwing { dir: number; arc: number; radius: number; hitSet: Set<Enemy>; elapsed: number; dur: number; }

function tickSwing(s: MeleeSwing, player: Player, enemies: Enemy[], enemyBullets: Bullet[]) {
  s.elapsed += h;                      // h = fixed step 1/30
  if (s.elapsed > s.dur) return;       // 挥砍窗 0.18s（interval 内的活跃判定段）
  const r2max = s.radius * s.radius;
  // ① 对敌人
  for (const e of enemies) {
    if (s.hitSet.has(e)) continue;
    const dx = e.x - player.x, dy = e.y - player.y;
    const d2 = dx * dx + dy * dy;                       // 平方距离，避免 sqrt
    if (d2 > (s.radius + e.hitRadius) * (s.radius + e.hitRadius)) continue;
    const ang = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(ang, s.dir)) <= s.arc / 2) { // 角度差 ≤ 半弧
      s.hitSet.add(e);
      dealDamage(e, player.weapon.damage, knockbackDir(ang, player.weapon.knockback));
      applyPoisonIfAny(e);                              // 刺剑毒 DOT
    }
  }
  // ② 挡弹：弧内敌弹直接销毁（判定顺序在敌人受击之前，公平性见 §8 风险#6）
  for (const b of enemyBullets) {
    if (b.dead) continue;
    const dx = b.x - player.x, dy = b.y - player.y;
    if (dx * dx + dy * dy > r2max) continue;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), s.dir)) <= s.arc / 2) {
      b.dead = true; spawnSpark(b.x, b.y); SfxLib.inst.play('parry');
    }
  }
}

// ===== 远程子弹：直线推进 + 圆-圆命中（遍历判定，预算内 O(n·m) 可接受）=====
function tickBullet(b: Bullet, foes: Entity[], walls: Rect[]) {
  b.x += b.vx * h; b.y += b.vy * h;
  b.life -= h;
  if (b.life <= 0 || outOfRoom(b)) { recycle(b); return; }   // 射程=life×弹速，节点回 NodePool
  for (const w of walls) if (pointInRect(b, w)) { recycle(b); spawnSpark(b.x, b.y); return; } // 墙=AABB
  for (const f of foes) {
    const dx = f.x - b.x, dy = f.y - b.y;
    const rr = b.radius + f.hitRadius;
    if (dx * dx + dy * dy <= rr * rr) { dealDamage(f, b.damage); recycle(b); return; }
  }
}
// 判定量级：敌弹≤20 × 敌≤8 + 玩家弹≤12 × 敌≤8 ≈ 256 次平方距离比较/帧，中低端机无压力
```

### 2.4 数据 schema（新增 catalogs/weapons.json + items.json 扩展）

```jsonc
// catalogs/weapons.json（新建；items.json 中每把武器仍加一行 category:'weapon' 以入背包）
[
  {
    "id": "rust_chopper", "name": "旧柴刀", "class": "melee",
    "damage": 5, "interval": 0.5, "arc": 100, "range": 56,     // melee: 弧心角/半径
    "knockback": 40, "blockBullets": true, "effect": null,
    "upgrade": [{ "gold": 40, "mats": { "wood": 6 } }, { "gold": 120, "mats": { "wood": 12, "slime_gel": 8 } }]
  },
  {
    "id": "wood_musket", "name": "木柄铳", "class": "ranged",
    "damage": 3, "interval": 0.6,
    "projSpeed": 380, "projRadius": 6, "range": 420,           // ranged: 弹速/弹径/射程(=寿命×弹速)
    "projCount": 1, "projSpread": 0,                            // 三连弩: count=3, spread=12(度)
    "knockback": 0, "blockBullets": false, "effect": null,
    "upgrade": [{ "gold": 40, "mats": { "wood": 6 } }, { "gold": 120, "mats": { "slime_gel": 10 } }]
  }
  // thorn_rapier: effect:"poison"; tri_star_bow: count:3, spread:12
]
```

---

## 3. 敌人 AI

### 3.1 三类行为状态机

全部用 `enum State + timer` 实现（不用协程/复杂行为树）。公共字段：`state, stateT, target, hp`。激活制：进入玩家 alertRadius 才从 idle → active（红色"!"提示 0.4s，给玩家反应窗口）。

**① chaser（追击型）——林地粘怪 slime**

```
idle --(玩家<260px)--> alert(0.4s, 红色!) --> chase
chase: 直线朝玩家移动 speed 90；与玩家距离≤ attackRange(36px) → windup
windup(0.4s): 停止移动，身体压缩蓄力 + 闪红（近战前摇=玩家的走位窗口）
strike(0.15s): 判定圈 r=44px 圆-圆命中玩家 → 结算伤害（无物理，推开玩家 24px 模拟碰撞）
cooldown(0.6s): 原地缓速蠕动 → chase
受击: 不打断状态（轻怪），仅击退位移 + 闪白
```

**② shooter（保持距离射击型）——新增：尘蛾 moth_dust、荆棘球 thorn_bud**

```
idle --(玩家<320px)--> alert(0.4s) --> reposition
reposition 循环（在理想距离带 [180, 240]px 内生活）:
  dist < 160 → 后退(速度 80)；dist > 260 → 前进(速度 70)；带内 → 横移 strafe（方向每 1.5s 随机翻转）
  任意状态间 0.5s 冷却到点 → aim
aim(0.5s): 停止移动，朝玩家显示 2px 瞄准细线（透明度 40%→80% 渐亮 = 躲弹前摇提示）
fire: 发射弹幕（见 §3.3 弹幕表）→ cooldown(1.4~1.8s 随机, 防齐射) → reposition
受击: 打断 aim（硬直 0.3s）——近战切 shooter 的正确解法是贴脸连段
```

**③ tank（慢速高血型）——孢子菇 sporeling、精英巨粘怪 slime_elite**

```
idle --(玩家<220px)--> alert(0.6s) --> chase(速度 50~65)
dist ≤ attackRange(48px) → windup(0.6s, 明显抬升/膨胀动画)
charge(0.3s): 朝玩家方向冲撞 120px（冲刺速度 300px/s），路径圆判定 r=40 命中 → 伤害 + 击退玩家 60px
recover(0.8s): 冲过头硬直（贪刀窗口）
受击: 击退距离 ×0.4（knockbackResist 0.6），不打断 chase
```

精英附加规则：**死亡分裂**——slime_elite 死亡时生成 2 只 slime（hp 减半 = 6），从尸体两侧弹出（弹开动画 0.3s 后进入 chase）。分裂怪不计入波次清点（清点按波定义的原生怪，分裂怪杀不杀都开门——避免"越杀越多门不开"的死锁）。

### 3.2 monsters.json v2 数值表（扩展现有格式，只增字段不改结构）

```jsonc
// 扩展字段（全部有默认值，旧表不写也能跑）：
// speed(默认90) attackRange(36) attackInterval(由状态机时序决定,表内省略)
// alertRadius(260) projSpeed/projCount/projSpread/projDamage(shooter 专用)
// knockbackResist(默认0) hitRadius(默认16) splitInto(精英分裂)
[
  { "id": "slime",       "name": "林地粘怪", "behavior": "chaser",  "hp": 12, "damage": 3,
    "speed": 90,  "attackRange": 36, "alertRadius": 260, "hitRadius": 16, "rewards": [...] },
  { "id": "moth_dust",   "name": "尘蛾",     "behavior": "shooter", "hp": 8,  "damage": 2,
    "speed": 75,  "attackRange": 220, "alertRadius": 320, "hitRadius": 14,
    "projSpeed": 220, "projCount": 1, "projSpread": 0, "projDamage": 2, "rewards": [...] },
  { "id": "thorn_bud",   "name": "荆棘球",   "behavior": "shooter", "hp": 14, "damage": 2,
    "speed": 60,  "attackRange": 200, "alertRadius": 300, "hitRadius": 18,
    "projSpeed": 200, "projCount": 3, "projSpread": 14, "projDamage": 2, "rewards": [...] },
  { "id": "sporeling",   "name": "孢子菇",   "behavior": "tank",    "hp": 22, "damage": 4,
    "speed": 50,  "attackRange": 48,  "alertRadius": 220, "hitRadius": 20, "knockbackResist": 0.6, "rewards": [...] },
  { "id": "slime_elite", "name": "巨粘怪",   "behavior": "tank",    "hp": 40, "damage": 4,
    "speed": 65,  "attackRange": 52,  "alertRadius": 280, "hitRadius": 26, "knockbackResist": 0.6,
    "splitInto": { "monsterId": "slime", "count": 2, "hpRatio": 0.5 }, "rewards": [...] }
]
```

变化说明：sporeling damage 3→4（tank 定位补足）；slime_elite hp 18→40（回合制数值在实时战斗中 3s 就死，重校准为精英房 60-90s 节奏的主目标）。

### 3.3 弹幕设计与实体预算（同屏 ≤60 拆解）

**弹幕原则：慢弹、少而准、永远可读。** 玩家 hitRadius 14px；敌弹速度 160-240px/s（横穿玩家身位 ≈0.4-0.6s，走位可躲）；所有弹幕发射前有 ≥0.5s 视觉前摇（瞄准线/蓄力动画）。

| 来源 | 弹型 | 弹速 | 密度 | 频率 |
|---|---|---|---|---|
| 尘蛾 | 单发直线 | 220 | 1 发/轮 | 每 1.4-1.8s 一轮 |
| 荆棘球 | 3 发扇形 14° | 200 | 3 发/轮 | 每 1.6-2.0s 一轮 |
| slime_king 二阶段（Boss，二期） | 12 向环形 | 160 | 12 发/轮 | 每 3s 一轮，仅高潮房 |

**同屏实体预算分配表（硬上限 60，写死在 CombatLogic 常量）：**

| 类别 | 预算 | 说明 |
|---|---|---|
| 玩家 + 挥砍弧表现 | 2 | |
| 敌人 | ≤8 | 普通房 3-5，精英房 ≤6（精英+2 小怪） |
| 敌方子弹 | ≤20 | shooter 同屏 ≤3 只时峰值 ≈6-18 发，预算内 |
| 玩家子弹 | ≤12 | 三连弩峰值 9 发 |
| 掉落物（材料/金币/浆果） | ≤8 | 超出则直接合并入"掉落袋"单实体 |
| 飘字 + 火花特效 | ≤10 | NodePool 复用，寿命 0.5s 自动回收 |
| **合计** | **≤60** | **全局发射闸门：敌方子弹达 20 时 shooter 延迟 fire** |

敌人相互推挤（无物理引擎）：每帧对存活敌人做两两圆重叠检测（≤8 只 = 28 次比较），重叠则沿连线各推开重叠深度的一半（分离力），O(n²) 规模极小。

### 3.4 精英房与 Boss 房

**精英房（首版，old_wood idx5 林心空地改造）**：两波制——第 1 波 3 只 slime（教学热身）→ 清空后 1.5s → 第 2 波 slime_elite + 2 只 moth_dust（**职责混合**：tank 顶脸 + shooter 放风筝，逼玩家用翻滚近身）。奖励：treasure 表（carrot_seed 2-3）+ 宝箱必出 1 件（材料包/武器 15% 概率）。精英房门锁，击杀 slime_elite 后开门 + 掉落爆浆庆祝。

**Boss 房（设计定稿，实装延后至第二张图/封印主线）**：Boss = 巨粘怪王 slime_king，hp 120，三阶段：

| 阶段 | HP 区间 | 行为 |
|---|---|---|
| P1 压路 | 100%-67% | tank 冲撞循环（强化版 charge 距离 240px）+ 每 8s 召唤 2 slime |
| P2 弹幕环 | 66%-34% | 12 向环形弹每 3s 一轮 + 缓速追击 40px/s；环弹留 1 个安全扇区（伪随机缺口） |
| P3 狂暴 | 33%-0% | 移速 90、冲撞频率 ×1.5、环弹缺口收窄；本体中心露出"核心"弱点（受击 ×1.5） |

首版不做 Boss 房的理由：Boss 弹幕环形编排 + 三阶段演出预计 8-12 人日，超出"探险样板升级"预算；§3.3 的环形弹弹型已随 P2 设计预留，二期复用。

---

## 4. 副本房间推进

### 4.1 房间类型（kind 扩展）与推进规则

| kind | 定位 | 实时版规则 |
|---|---|---|
| entry | 安全入口 | 进副本落点；常驻"撤回传送门"；敌人永不生成 |
| gather | 采集房 | 采集点变成场景实体（浆果丛 sprite）；走近 ≤48px 出现"采集"环，点击交互 **0.8s 进度环**（移动即打断）；负重 BAG_CAP=10 不变 |
| battle | 战斗房 | 进房门锁（红色屏障半透明）→ 清空波次 → 门开（屏障淡出 + 开门音） |
| fork | 岔路 | 走到岔路口区域（y<x 判定门区）浮现两侧门牌提示，走进哪扇门即选哪条路（实时化：不再弹按钮） |
| elite | 精英房 | 两波制（§3.4），门锁；必带 treasure |
| treasure | 宝箱房 | 0-1 只守卫怪 + 1 宝箱；开箱 0.6s 长按，掉落入拾取袋 |
| exit | 撤回出口 | 传送门实体，走近 0.5s 自动传送回农场结算 |

推进保持**单向有环**的房链结构（next[] 拓扑不变），实时化只改"房间内部怎么玩"，不改"房间之间怎么连"——AdventureSystem 骨架零重构。

### 4.2 adventure_rooms.json v2 schema（兼容式改造）

```jsonc
// 房间新增字段（旧字段全部保留，DataManager 引用校验不受影响）：
{
  "idx": 4, "kind": "battle", "name": "西：粘怪领地", "desc": "一团粘怪在腐木间蠕动。",
  "size": [60, 34],                    // 新：世界尺寸（32px tile），60×34 = 1920×1088 ≈1.5 屏
  "waves": [                            // 新：波次表（battle/elite 房）
    [{ "monster": "slime", "count": 3, "seed": [0.2, 0.5, 0.8] }],
    [{ "monster": "slime", "count": 2 }, { "monster": "moth_dust", "count": 1 }]
  ],                                    // seed = 房间归一化坐标随机落点；count 总数计入 §3.3 预算
  "doorLock": true,                     // 新：battle/elite 默认 true
  "obstacles": [ { "t": [12, 8], "w": 3, "h": 2, "solid": true } ],   // 新：障碍物（tile 坐标，solid=挡移动；false=仅视觉遮挡，不挡子弹）
  "chest": [ { "itemId": "herb", "min": 1, "max": 3 }, { "weaponId": "thorn_rapier", "p": 0.15 } ],  // 新
  "monster": "slime",                   // 旧字段保留：单怪房（waves 为空时回退旧逻辑，兼容期共存）
  "spots": [...], "treasure": [...], "next": [5]
}
```

**old_wood 改造示例（7 房实时版）**：idx0 entry（撤回门）→ idx1 gather 莓果×3 → idx2 fork 倒木岔路 → idx3 gather 药草坡（东侧，安全）→ idx4 battle 粘怪领地（西侧，slime×3 一波）→ idx5 elite 林心空地（两波）→ idx6 exit 归途（传送门）。东侧路线轻（采集为主）西侧路线重（战斗为主）在岔路口形成真正的取舍——实时战斗后"战斗房"从义务变成路线选择。

### 4.3 单局节奏与时长预算（目标 5-8 分钟）

| 段 | 房间 | 预算 | 内容 |
|---|---|---|---|
| 进入 | entry | 0:00-0:20 | 一行题字过场 + 撤回门可见（预载吞加载，验收：点击入口→可操作 ≤2s） |
| 探索 | gather ×1 + battle ×1 | 0:20-2:30 | 首战教学强度（slime×3 单波） |
| 中点抉择 | fork | 2:30-3:00 | 轻/重路线分岔 |
| 深入 | gather/battle ×1（按岔路） | 3:00-4:30 | 第二场战斗或富采集 |
| 高潮 | elite 两波 | 4:30-6:30 | 精英 + 混合职责 |
| 撤回 | exit | 6:30-7:30 | 传送门 + 结算浮现（§6.5 轻结算） |

合计中位 ≈6.5 分钟，上限 8 分钟（磨血绕圈会自然超时——用精英房无回复压力收敛）。固定图重玩性沿用 proposal §4.9：采集点每日刷新表 + 波次 seed 落点随机 + 宝箱种子。

### 4.4 副本入口与出口

- **入口**：大地图探险区传送点（农场场景交互点，热区 ≥88px）→ 题字过场 → 加载 adventure 场景（独立 scene，分包）。多地图时传送点列表化（首版仅 old_wood）。
- **出口**：①exit 房传送门（正常结算）；②entry 房常驻撤回门（push-your-luck：撤得越早拿得越少但零风险——不设惩罚，深度收益靠精英宝箱与采集深度自然实现）；③倒下 = 死亡惩罚（§5.2）。已清空的房间允许走回头路回 entry；**战斗房内不可撤退**（门锁即撤退锁）。
- **结算**：复用 AdventureSystem.settle()（探险包并入农场背包 + endDay + persist），零改动。

### 4.5 房间生成：手工 vs 模板拼接

- **首版（old_wood）**：纯手工 JSON 房间链（§4.2 schema）。理由：7 房 × 手工数据 ≈3 人日，质量可控，先验证战斗手感；房间内部布局用 `size + waves.seed + obstacles` 三个字段表达，实际是"半模板"。
- **第二张图起**：房间模板库（门位/尺寸/敌人密度槽位的 5-6 个模板：L 形/十字/开阔地/窄廊），按 next 拓扑拼接 + 波次表注入。proposal §6 已预埋此路线；触发时机 = 手工产能成为瓶颈或第 3 张图立项时。
- **不采用**程序化全随机生成（超出单人产能，且丢星露谷式"手作地图记忆点"）。

---

## 5. 玩家数值与成长

### 5.1 基础数值

| 项 | 值 | 说明 |
|---|---|---|
| PLAYER_MAX_HP | 20（保持） | 衔接 AdventureSystem.PLAYER_MAX_HP |
| 受击无敌帧 | 0.8s | 期间不结算任何伤害；玩家闪烁（透明度 0.5↔1，100ms 周期）；可穿过敌人（无敌帧内不做推挤，防卡死） |
| 伤害结算节奏 | 按敌人攻击节奏（strike/charge 命中时），无贴身持续掉血 | contact damage 不做（连续掉血在触屏上不可读、不可反制） |
| 回复手段 | 副本内：采集浆果即食 +2HP（采集时自动吃 1 颗）；宝箱 15% 掉回血浆果×3 | 农场：每天满血重置（现状）；不回血药水（砍掉道具栏复杂度） |
| 死亡惩罚 | 收获减半（ceil），传送回农场 | 完全衔接 `_onDefeat`；实时战斗下减半惩罚足够痛（一场 6 分钟的收获），灰盒验证后不再加重 |

### 5.2 成长曲线（轻量双线，无技能树）

| 线 | 内容 | 成本锚点 | 节奏 |
|---|---|---|---|
| 武器升级 | 每把武器 Lv1-3，伤害 ×1.4/级（柴刀 5→7→10，铳 3→4→6） | Lv2: 40 金币 + 材料×6；Lv3: 120 金币 + 材料×10-12（含 slime_gel） | 首周内毕业一把，两周全毕业 |
| HP 上限 | 封印祭坛（农场建筑）：封印碎片 ×5 → maxHp +5，上限 40 | 封印碎片来自精英房/防守奖励（衔接 §11 资源表） | 2-4 次充值式提升，跨 15-40 天 |
| 新武器 | 4 把起步 → 二期每图 +2 把 | 打造/商店/掉落（§2.1） | 跟随地图解锁 |
| 砍掉 | 护盾/符文/技能树/装备词条 | — | 单人产能红线；武器升级 + HP 上限已支撑 40+ 小时的数值消耗 |

数值自洽校验：玩家 Lv2 柴刀 7 伤 → slime_elite（40hp）6 击 ≈3s 纯输出，加两波与走位 ≈75s——精英房仍紧张；Lv3 + HP40 是"下一张图"的入场券，形成跨图成长阶梯。

---

## 6. 表现层与优先级

### 6.1 效果清单与分级

| 优先级 | 效果 | 实现要点 | 成本 |
|---|---|---|---|
| **P0 必做** | 受击闪白 | sprite.color 置白 0.08s（Sprite color tint，无 shader） | 0.5 人日 |
| P0 | 伤害数字 | NodePool 飘字 Label，上浮 24px + 淡出 0.5s；玩家受伤红色、敌人白色、暴击（二期）金色 | 1 人日 |
| P0 | 血条 UI | 玩家：左上角心形×HP/20（像素心，不用长条）；敌人：头顶 24×4px 红条，**受击后显示 2s 自动隐藏**（不常态显示，画面干净） | 1 人日 |
| P0 | 敌人死亡爆浆 | 3-5 个色块 sprite 抛物线飞溅（tween），配合 rewards 掉落 | 0.5 人日 |
| P0 | 门开动画 | 屏障 tint 淡出 + 音效；精英死亡全屏轻闪 1 帧 | 0.5 人日 |
| **P1 尽量做** | 击退 | 命中沿攻击方向位移 knockback px（tween 0.12s） | 0.5 人日 |
| P1 | 挥砍弧残影 | Graphics 扇形填充 0.1s 淡出（复用判定几何，零额外数据） | 1 人日 |
| P1 | 屏幕震动 | 摄像机偏移叠加：玩家受击 3px/0.12s、精英死亡 5px/0.2s；整数像素抖动（§5.3 规范） | 0.5 人日 |
| P1 | 音效分层 | SfxLib：hit/parry/shoot/hurt/door/chest 6 个基础音 + 敌人受击音高随机 ±2 半音防重复感 | 0.5 人日 |
| P1 | 前摇提示 | 近战 windup 闪红、shooter 瞄准线渐亮（§3.1 已含，表现=游戏性） | 1 人日 |
| **P2 可砍** | 顿帧 hit-stop | **建议直接砍**：40ms 主线程冻结在低端机会叠加卡顿感知；以"受击者缩放脉冲 1.0→1.15→1.0（0.1s）"替代同等打击感 | — |
| P2 | 翻滚拖尾/弹壳/枪口火光 | 全部可砍；保留翻滚半透明即可读 | — |
| P2 | 敌人死亡多帧动画 | 单帧爆浆够用；多帧序列动画等素材管线成熟 | — |

### 6.2 表现与逻辑的分离纪律

所有 P0-P2 表现效果**只读 CombatLogic 的输出事件**（EventBus：`enemyHit / playerHurt / enemyDead / roomCleared / bulletParried`），渲染层订阅播放。逻辑层永不引用 cc 节点——这是"逻辑可手动 tick"（后台标签页 RAF 停转时自动化测试直跑 step(N)）的前提。

---

## 7. 与现有代码的衔接改造点清单

### 7.1 AdventureSystem.ts（保留骨架，改战斗内核）

| 位置 | 改造 |
|---|---|
| `RoomDef` 接口 (:8) | 增加 `size?, waves?, doorLock?, obstacles?, chest?` 可选字段（§4.2） |
| `BattleState` 接口 (:19) | **删除**；替换为 `combat: { roomIdx: number; alive: number; waveIdx: number } \| null`（实时战斗的极薄状态，真正战斗体在 CombatLogic） |
| `startBattle/playerAttack (:122-182)` | **删除**回合制逻辑；战利品结算函数抽出为 `grantLoot(monsterId)`（CombatLogic 击杀回调调用），逻辑保持单点 |
| `_onDefeat (:185)` | 保留原样（收获减半 + settle），由 CombatLogic 玩家 hp≤0 事件触发 |
| `advance (:197)` | 保留；增加 `if (next.doorLock) combat = {...}` 门锁状态 |
| `settle (:213)` | 保留零改（含 endDay——见 §8 开放问题#3） |
| 新增 | `loadout: [string, string]`（武器槽，随存档持久化）；`enterDungeon(mapId)`（农场传送点调用，替代 UI 里隐式的 `start()`） |
| 新增事件 | 经 EventBus 发：`combatPlayerHurt / combatEnemyDead / combatRoomCleared / combatRunEnd`——HUD 与表现层只听事件 |

### 7.2 BattlePanel.ts → 替换为 CombatScene.ts（核心新件）

旧 BattlePanel（:15-158，全屏遮罩+点击互殴面板）整体废弃，替换为实时战斗场景组件：

```
gameplay/combat/
  CombatLogic.ts      // 纯逻辑：fixed step 1/30 累积器；输入向量 in，实体数组 in/out；
                      //   无 cc import（自动化测试可 new CombatLogic().step(N) 直跑）
  CombatSceneView.ts  // 渲染：订阅逻辑事件→节点同步/插值；NodePool: enemy/bullet/floatText/spark
  CombatInput.ts      // 触屏输入：动态摇杆/攻击钮/闪避钮（§1.3 十条参数）；三路 touch id 跟踪
  CombatCamera.ts     // 整数像素跟随 + clamp + 震动偏移
  combat_constant.ts  // 实体预算 60 / 无敌帧 0.8 / 翻滚参数 / 死区 14 等全部常量
```

- BattlePanel 的可复用资产：Graphics 按钮绘制模板、**Label 必须放子节点的坑注释**（:144, :226）迁移为新 UI 基建。
- NodePool 键：`enemy_{monsterId}` / `bullet_p`(玩家) / `bullet_e`(敌方) / `ftext` / `spark`；NodePool 预热各 5-10 个防首战卡顿。

### 7.3 AdventureHUD.ts → 拆分为 DungeonHUD（探索）+ 战斗 HUD

| 现状 | 改造 |
|---|---|
| 顶部房名/描述 (:53-54) | 保留；战斗中收起（防遮挡弹幕视野） |
| 左侧背包大列表 (:57-61) | 压缩为左上角一行紧凑条「负重 6/10 + 图标」；点击展开背包面板并**自动暂停**（实时战斗中开面板=暂停，逻辑 tick 冻结，关闭恢复——顺带解决战斗中无法看包的问题） |
| HP 文本 (:55) | 换心形血条（§6.1 P0） |
| 采集按钮列表 (:122-138) | 删除；改场景实体走近交互（§4.1） |
| 进入战斗按钮 (:141-147) | 删除；进 battle 房即自动开战（走门触发） |
| 前进/岔路按钮 (:151-164) | 删除；改门实体走入触发（§4.1） |
| 新增 | 武器槽×2 图标（攻击钮上方）+ 闪避 CD 环 + 波次提示「剩余 3」+ Boss/精英出场横幅（P1） |

### 7.4 数据与基建

- `catalogs/weapons.json` 新建（§2.4）；`items.json` 加 4 行 category:'weapon'（sellPrice 定价，商店/打造走 EconomySystem 既有通道：`buySeed` 泛化为 `buyItem` 或新增 `buy(item, count)`——**建议泛化**，改动 5 行）。
- `monsters.json` 加扩展字段（§3.2）；`adventure_rooms.json` 升 v2（§4.2，旧字段全保留）。
- 工坊打造：新增 `catalogs/recipes.json`（`{id, out: {itemId|weaponId}, cost: {gold, mats}}`），CraftPanel 消费——EconomySystem 加 `craft(recipeId, inv)` 一个方法。
- 存档：SaveManager 文档增加 `loadout` 与武器等级字段（version 迁移链 +1）。

---

## 8. 风险与开放式问题清单

### 风险（按威胁排序）

| # | 风险 | 缓解 |
|---|---|---|
| 1 | **中低端微信容器帧率**：实时战斗比回合制的每帧实体×判定高一个量级 | 预算表（§3.3）写死常量；平方距离无 sqrt；判定/渲染分离；压测脚本：DebugPanel 加"10 敌+40 弹压力场景"一键生成，真机目标 ≥30fps |
| 2 | **自动瞄准手感**：粘滞系数（0.7）、吸附角（45°/15°）全是纸面值 | 灰盒专用调参面板（DebugPanel 暴露 3 个参数 + 实时生效），首周内定稿 |
| 3 | **RAF 停转双刃剑**：逻辑/渲染分离 + 插值（渲染层 lerp 到逻辑帧）有实现复杂度 | 简化起步：渲染层直接读逻辑位置（30Hz 逻辑视觉足够像素风）；插值列为性能不达标时的 B 计划 |
| 4 | **手工房间产能**：第二张图开始每图 3 人日上升 | 触发条件明确（§4.5）：第 3 图立项时启用模板拼接 |
| 5 | **触屏丢点**：摇杆按住 + 点攻击/闪避的多点竞争；微信容器 touchcancel 频发 | 三路独立 touch id + touchcancel 时该路输入置零（不卡键）；真机 14 条清单复检 |
| 6 | **近战挡弹公平性**：挡弹与敌人伤害同帧竞争的结算顺序 | 定死顺序：同帧内 挡弹判定 → 玩家受击判定 → 敌人受击判定（挡弹优先=鼓励进攻性近战）；写进 combat_constant 注释 |
| 7 | **死亡惩罚体感**：实时战斗死于弹幕的挫败感 > 回合制点击 | 首败免罚一次（proposal §4.8 情绪层复用）；死亡回放 1 行死因（"被孢子菇冲撞击倒"） |
| 8 | **实体预算超限**（精英分裂 + 掉落堆叠） | 分裂怪不计数、掉落合并袋（§3.3）已防；CombatLogic 加断言：超预算时拒生成并 console.warn |

### 开放式问题（需拍板/灰盒回答）

1. **探险是否仍消耗一整个游戏日**（现状 settle 调 endDay）？5-8 分钟战斗 = 1 天，会让"一天多种一轮作物"的农场节奏被压缩；备选：探险半天（一天可农场+探险各一次）。建议灰盒试玩后定。
2. **弹幕密度是否按机型分档**（低配 0.7× 射速）？首版建议不分档（调参翻倍），真机压测后再决定。
3. **副本内要不要房间拓扑小地图**（右上角 3×3 缩略）？对岔路导航有价值，成本 1-2 人日；首版倾向砍掉，靠门牌文字。
4. **双武器槽够吗**：元气骑士满槽 2 把，本作采集+战斗双职能下 3 槽（剑/枪/采集工具）是否更顺？首版维持 2 槽（UI 与平衡成本），观察试玩。
5. **金币在副本内掉不掉**：纯材料掉落（回农场卖）vs 直接掉金币？建议纯材料+宝箱（保留"背回农场"的主题闭环）。
6. **精英房第二波职责混合的难度上限**：moth_dust 放风筝 + slime_elite 顶脸对 HP20 是否过压？灰盒第一优先验证项。
7. **Boss 房归期**：跟第二张图走还是封印主线事件走？（依赖 world-redesign 主文档的区域规划拍板。）

---

## 附：验收基线（灰盒 Demo Definition of Done）

1. 真机（中端安卓微信容器）：10 敌 + 20 敌弹同屏 ≥30fps；冷进副本 ≤2s 无白屏。
2. 操作：双拇指全区域可达；摇杆死区无漂移；三路触控互不干扰（14 条清单#5/7/11）。
3. 战斗闭环：entry→gather→battle（清怪开门）→fork→elite（两波）→exit 结算回农场，全程 5-8 分钟，死亡触发收获减半回农场。
4. 武器闭环：柴刀初始 → 商店买铳（50 金币）→ 打造刺剑 → 4 把切换槽位生效 → Lv2 升级数值生效。
5. 自动化：`CombatLogic.step(N)` 无 cc 依赖跑通 1000 帧无异常；实体数断言不超 60。
