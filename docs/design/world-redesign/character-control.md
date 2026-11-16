# 角色与操控完整设计（大地图版）

> 归属：docs/design/world-redesign/（角色操控设计师产出，2026-11-16）
> 上游依据：game-design-draft.md §17（触屏操作规范）、§5.3（空间层次）、design-improvement-proposal.md §5/§7、docs/pitfalls.md、docs/assets/pixel-art-prompts.md（提示词格式）。
> 本文档拍板取代 §17 中"农场=点击移动"一条：大地图连通后，**全场景统一动态虚拟摇杆**（点击移动仅在摇杆方案真机验证失败时作为回退，见 §8）。
> 约定沿用：无物理引擎（手工圆 vs 格网判定）、程序化节点显式 `layer = UI_2D`、跨系统信号走 EventBus、逻辑层可手动 tick（后台 RAF 停转，pitfalls #26）、触屏用 touchstart/touchend + `update(dt)` 时间戳（不用 Button 组件）。

---

## 0. 拍板摘要（本文档所有决策一览）

| # | 决策 | 结论 | 理由一句话 |
|---|---|---|---|
| D1 | 角色规格 | **32×48 art px**（宽=1 格宽，高=1.5 格，含立面余量），渲染 ×2 → 屏幕 64×96 | 与 tile 同宽对齐友好；×2 渲染符合项目既有"32px 素材 ×2 平铺"惯例 |
| D2 | 方向数 | **4 逻辑方向，3 套绘制**（下/上/侧，左侧=侧向镜像翻转） | 8 方向美术成本 ×2.5，单人产能不可承受；斜向走位取主导轴 |
| D3 | 移动数学 | **直接屏幕坐标移动**（渲染层即真相层），不做世界平面+y 压缩 | 3/4 视角感全部由美术承担，压缩变换会让碰撞/交互/半径全部变椭圆，零收益 |
| D4 | 碰撞体 | **脚底圆**（r=20 屏幕px）+ 可走格查询，轴分离解析（先 X 后 Y） | 圆过格缝不打角、贴墙自然滑行；AABB 四角卡缝是像素游戏经典手感杀手 |
| D5 | 工具操作 | **情境自动工具**：按主行动键自动对"面朝格/最近合法目标"施用正确工具，无工具栏切换 | 单手/双手都不需要切工具；保留"手持种子"唯一选择器 |
| D6 | 交互通道 | 双通道：A=**面向工具动作**（挥锄/砍/挖/浇/种/收），B=**走近情境键**（NPC/门/传送/床/出货箱/钓点/地形编辑） | 移动类目标用"面朝"，实体类目标用"走近"，各自最顺手 |
| D7 | 情境键槽位 | **主行动键槽复用**：非战斗区 (1150,560)=情境键，战斗区=攻击钮；战斗区情境目标出现在次槽 (982,588) Ø88 | 拇指肌肉记忆不换位 |
| D8 | 换装 | 留接口不实装：**同版式整套 sprite sheet 替换**（skinId → 图集注册表），不做分层纸娃娃 | 版式固定则换装零代码改动；分层系统是编辑器级成本 |
| D9 | 镜头 | 整数像素纯平移跟随，角色屏幕位置居中偏下（foot 点在屏中下方 +40px），指数平滑 k=10/s | §5.3 既有规范，直接落数值 |

---

## 1. 角色设计

### 1.1 像素规格

| 项 | 数值 | 说明 |
|---|---|---|
| 单帧 art 尺寸 | **32×48 px** | 宽 = 1 格宽（32px 顶面），高 48 = 身体 32 + 头部上探 16，在 3/4 视角里自然"高出"地表 |
| 渲染缩放 | ×2（node.setScale(2)） | 屏幕 64×96；与 tile（32 art → 64 屏）同倍率，像素密度一致不发糊 |
| 节点锚点 | **脚底中心** (0.5, 0) | node.position = foot 点 = 碰撞/排序/交互唯一真值 |
| y-sort 锚 | foot 点 y | 与 §5.3 立面遮挡/y-sort 一致；角色被前景立面遮挡时该立面淡出至 40-50% 透明 |
| 脚底阴影 | 独立节点：24×10 art px 椭圆，透明度 25-35% | **不烘进角色帧**（保证阴影不随帧抖动）；阴影=可行走平面真值（§5.3） |
| 图集 | 单张 512×512 atlas（86 帧 32×48 绰绰有余），point 采样 | pngquant 8-bit，预计 60-100KB |

**备选 24×32 为什么不选**：tile 已按 ×2 渲染为 64px，24×32 的角色只有屏上 48×64，站在 64×96 的立面旁边存在感不足，且 24px 宽与 32px 格宽不对齐，AABB/朝向格判定都出现半格尴尬。

### 1.2 方向数：4 逻辑方向 / 3 套绘制

- 逻辑方向 `down / up / left / right`；绘制只出 `down / up / side(朝右)` 三套，`left` = side 水平翻转（flipX）。
- **斜向移动**：速度向量取主导轴决定朝向帧（`|vx| > |vy| + 0.15` 才切横向），切换加 ±15° 迟滞防抖（见 §5.4），斜走时播的是主导轴的行走帧——星露谷同款做法，观感成立。
- 战斗攻击朝向：动画仍 4 方向，但**攻击判定/弹道角度连续**（取摇杆向量真实角度），近战扇形判定见 §3.5。理由：8 方向攻击帧成本翻倍而收益仅是视觉，元气骑士式手感主要来自判定宽容+输入缓冲。

### 1.3 初始形象：继承农场的年轻农夫

外观要点（已按 pixel-art-prompts.md 的调色板与描边规范写好，可直接交美术管线，完整提示词见 §7.3）：

- **草帽**（麦秆金 `#f2c14e`）= 识别符号，剪影第一眼可读；帽檐在 down 帧压低露眼、up 帧全露后脑勺。
- 棕色短发、米色衬衫+**绿色围裙**（呼应草地色 `#5a8a46`）、深棕裤、棕靴。
- 三头身 Q 比例、头大身小（48px 高里头部占 ~18px），贴 `#2a1f16` 统一描边。
- 便携工具固定在背后（斧/镐/水壶共用一个"背工具"剪影，工具动作帧才拿到手上）——减少待机帧里的元素数量，AI 生成一致性更好。

### 1.4 换装接口（留而不用）

```
catalogs/skins.json        // 预留表：{ id, name, atlasBundle, paletteTag, source }
ActorRenderer.setSkin(skinId: string)   // 运行时整套替换图集引用
存档字段：player.skinId                  // SaveManager 既有单文档 JSON 加一个字符串
```

- **同版式整套替换**：所有皮肤沿用同一帧布局/命名（`char_{action}_{dir}_{frame}`），换装=换图集，零代码改动。
- 调色板换色皮肤（同图异色）可后置，用 pngquant 调色板替换脚本即可，不需要美术重画。
- 分层纸娃娃（上衣/帽子独立层）明确不做：属于编辑器级系统，且与 AI 生成管线冲突（整帧生成一致性远好于分层拼合）。

---

## 2. 角色状态机

### 2.1 状态总表

| 状态 | 进入条件 | 动画 | 移动锁 | 时长/退出 | 关键规则 |
|---|---|---|---|---|---|
| idle | 无输入且无动作 | `idle` 2f@2fps 循环 | 否 | — | 待机呼吸；战斗区待机可持武器（同帧不同图集） |
| walk | 摇杆幅度 > 死区 | `walk` 4f@8fps 循环 | 否 | 输入消失→idle | 朝向主导轴+迟滞；拖刷时每进新面朝格触发一次工具判定 |
| dodge | 闪避钮按下且 cd≤0（仅战斗区） | 复用 `walk` 帧 + 残影特效 | 锁输入方向（锁死 dodgedir） | 0.18s 冲刺，cd 0.8s | 无敌帧 0.24s（含前后各 30ms 缓冲）；方向=按下时摇杆向量或面朝向 |
| chop | 主行动键 & 面朝格是树 | `chop` 4f@7fps | 是 | 0.55s | 第 2 帧命中判定（树 1 次伤害+掉落表）；播 sfx `chop`（新音效） |
| mine | 主行动键 & 面朝格是石 | `mine` 4f@7fps | 是 | 0.6s | 第 2 帧命中；石需 2-3 次（hp 表） |
| water | 主行动键 & 面朝格是已耕种旱地 | `water` 4f@7fps | 是 | 0.5s | 第 2 帧写 tile 湿润态，emit `farmChanged{action:'water'}`，sfx `water` |
| plant | 主行动键 & 面朝格是空耕地 & 手持种子>0 | `bend` 2f@4fps | 是 | 0.4s | 结束帧扣种子+建作物，emit `farmChanged{action:'plant'}`，sfx `plant` |
| harvest | 主行动键 & 面朝格成熟 | `bend` 2f@4fps | 是 | 0.4s | 结束帧收获入包，emit `itemGained`+`farmChanged`，sfx `harvest` |
| hoe | 主行动键 & 面朝格是可开垦草地 | `bend` 2f@4fps | 是 | 0.4s | 结束帧格变耕地（地形编辑同款写格逻辑） |
| fishCast | 情境键（钓点） | `fish_cast` 2f@4fps | 是 | 0.5s | 结束→fishWait，弹 FishingPanel（既有 QTE） |
| fishWait | fishCast 结束 | `fish_hold` 2f@1.5fps 循环 | 是 | QTE 期间 | 收竿/逃走→idle；角色锁定面向水面 |
| attack | 攻击钮（战斗区），输入缓冲 200ms | `attack` 4f@10fps | 弱锁（0.25s 后可取消移动） | 0.4s | 第 2 帧扇形判定（面朝 ±60°、半径 1.2 格）；近战轻吸附（目标在 1.6 格内朝其偏移 ≤0.5 格） |
| hurt | 受击且非无敌帧 | `hurt` 2f@8fps 单次 | 锁 0.25s | 0.3s | 击退 0.35 格/0.12s；无敌 0.8s；白闪 2 帧；sfx `hit` |
| dead | hp≤0（仅战斗区） | `dead` 2f 单次 | 锁 | 结算流程接管 | 探险结算规则（损失部分未结算材料），重生在区域入口 |
| sleep | 情境键（床） | 淡出转场 | 锁 | 结算一天 | 走 TimeSystem.endDay()，不单独做睡姿帧 |

> `chop/mine/water/hoe` 共用"挥动节奏"，`plant/harvest/hoe` 共用 `bend` 帧——动画映射见 §7.1，这正是 D5 情境自动工具能成立的原因：**按一个键，状态机按目标类型分发到对应动作状态**。

### 2.2 状态图（ASCII）

```
                 ┌──────────────────────────────────────────────┐
                 │          (任意状态, 非无敌帧) 受击              │
                 ▼                                              │
   ┌──────────┐  摇杆>死区  ┌──────────┐   闪避钮(cd=0,战斗区)  ┌─┴─────┐
   │  idle    │◄──────────►│  walk    │──────────────────────►│ dodge │
   └─┬─┬─┬─┬──┘            └─┬─┬─┬─┬──┘◄────0.18s────────────└───────┘
     │ │ │ │  主行动键(目标类型分发)│ │ │ │
     │ │ │ │  ┌────────────┘ │ │ │
     │ │ │ ├─►│ hoe / plant / harvest / water  (bend/water 系, 0.4-0.5s)
     │ │ │ │  └────────────►│ chop / mine    (挥击系, 0.55-0.6s) ──┐
     │ │ │ │                 └──────────────────────────────────────┤
     │ │ │ │ 情境键                                                  │ 完成→idle
     │ │ │ └─► fishCast → fishWait ──(收竿/逃)──► idle               │
     │ │ └───► sleep(转场)                                        │
     │ └─────► attack(战斗区, 缓冲200ms) ──0.4s──► idle/walk ◄─────┘
     └────────► dead(hp≤0) ──► 结算/重生
```

### 2.3 转换守卫与缓冲（伪代码）

```ts
type State = 'idle'|'walk'|'dodge'|'chop'|'mine'|'water'|'plant'|'harvest'
           |'hoe'|'fishCast'|'fishWait'|'attack'|'hurt'|'dead'|'sleep';

class PlayerFsm {
    state: State = 'idle';
    t = 0;                       // 当前状态已持续秒数
    buffer: 'attack'|'dodge'|null = null;   // 输入缓冲 200ms
    iframes = 0;                 // 无敌剩余秒
    dodgeCd = 0;

    tick(dt: number) {           // 纯逻辑；Component.update 与自动化测试都调它
        this.t += dt;
        this.iframes = Math.max(0, this.iframes - dt);
        this.dodgeCd  = Math.max(0, this.dodgeCd - dt);
        if (this.buffer && (this.bufferAge += dt) > 0.2) this.buffer = null;

        switch (this.state) {
            case 'idle': case 'walk':
                if (this.tryBuffered()) break;
                const act = ToolRouter.resolve(this.facingCell(), this.proximity); // D5 分发
                if (act) this.enter(act);
                break;
            case 'dodge':   if (this.t >= 0.18) this.enter('idle'); break;
            case 'chop':    if (this.t >= HIT_FRAME.chop) this.onToolHit('chop');
                            if (this.t >= 0.55) this.enter('idle'); break;
            // mine/water/plant/harvest/hoe 同构 …
            case 'attack':  if (this.t >= HIT_FRAME.attack) this.sweepMelee();
                            if (this.t >= 0.4)  this.enter('idle'); break;
            case 'hurt':    if (this.t >= 0.3) this.enter('idle'); break;
            // fishCast/fishWait/dead/sleep 由系统事件驱动退出
        }
    }
    onDamaged(dmg: number, from: Vec2) {
        if (this.iframes > 0 || this.state === 'dodge') return;   // 无敌/闪避免伤
        this.enter('hurt'); this.iframes = 0.8;
        Movement.knockback(from, 0.35 /*格*/, 0.12);
    }
}
```

- **输入缓冲 200ms**：attack/dodge 在动作硬直中按下先入 buffer，状态回 idle/walk 立即消费——宽判定+缓冲=元气骑士式"宽容但爽"的手感（§17 拍板沿用）。
- **可手动驱动**：Fsm/Movement/Interaction 全部只吃 `tick(dt)`，`Component.update(dt){ this.tick(dt) }` 仅是一层皮——满足 pitfalls #26（后台 RAF 停转时自动化测试直调 `__debug.tick(0.016)×N`）。
- 状态变化不进全局 EventBus（本组件内渲染层直接读），只有**结果类**信号进总线（见 §6.5）。

---

## 3. 移动方案

### 3.1 坐标系与 3/4 视角数学（D3/D4 的落地定义）

```
逻辑层（真相）                    渲染层（×2，即设计像素）
─────────────                    ─────────────────────
foot: {x, y}  浮点屏幕px          玩家节点 position = foot
cell: 格坐标 (cx, cy)             tile 顶面格子 = 64×64 屏幕 px
CELL = 64                         tile 精灵 32×48 art → 64×96 屏，
                                  锚点取"顶面中心" anchor(0.5, 16/48)，
                                  position = 格中心，立面 32 屏 px 自然垂在格下方
```

- **不做世界平面+y 压缩**（D3）：斜俯视感全部由 tile 美术（顶面+立面）承担，逻辑层就是屏幕平面。若做 y 压缩，圆碰撞变椭圆、交互半径变椭圆、y-sort 系数要调，全系统为纯视觉付数学税。
- 格查询：`cx = floor(foot.x / 64)`，`cy = floor(foot.y / 64)`；foot 即格内顶面平面的点，立面只是渲染。
- 屏上可见格数：1280×720 ÷ 64 ≈ **20×11.25 格**，接近星露谷默认视野密度。

### 3.2 速度数值表（起点值，灰盒调优）

| 项 | 数值 | 换算 |
|---|---|---|
| 步行（全区域） | **4.0 格/s = 256 屏 px/s** | 穿 1 格 0.25s，横穿一屏 ~5s |
| 战斗区移动 | 同 4.0（不单独做慢速，靠闪避/攻击节奏出差异） | — |
| 闪避冲刺 | 10 格/s × 0.18s = **1.8 格位移**，cd 0.8s，无敌 0.24s | — |
| 击退 | 0.35 格 / 0.12s | hurt 状态内 |
| 减速光环（防守作物） | ×0.45，持续 1.5s | DefenseSystem 既有光环扫描复用 |
| 斜向 | 向量归一化后 ×速度（自动 0.7071，不双倍速） | — |
| 近战轻吸附 | 攻击瞬间若目标 ≤1.6 格，朝其位移 ≤0.5 格 | §17 拍板沿用 |

### 3.3 碰撞：脚底圆 vs 可走格（推荐+伪代码）

**推荐圆形**（D4）。理由：AABB 在格缝处直角卡角（斜走撞墙口"咯噔"），圆天然滑墙；且脚底圆只占 0.6 格宽，玩家可穿过 1 格门缝、贴 1 格墙走，操纵感最好。代价仅是解析多一次最近点计算。

```ts
const FOOT_R = 20;            // 脚底圆半径（屏px）≈ 0.31 格：角色 64 宽、脚只占 40
const CELL = 64;

function tickMove(dt: number) {
    if (Fsm.locksMovement()) return;                 // 动作状态锁移动
    const v = Joystick.vector();                     // 已含死区/归一化
    moveAxis(v.x * SPEED * dt, 0);                   // 先 X 后 Y：轴分离 → 贴墙滑行
    moveAxis(0, v.y * SPEED * dt);
    updateFacing(v);                                 // ±15° 迟滞见 §5.4
}

function moveAxis(dx: number, dy: number) {
    foot.x += dx; foot.y += dy;
    const x0 = Math.floor((foot.x - FOOT_R) / CELL), x1 = Math.floor((foot.x + FOOT_R) / CELL);
    const y0 = Math.floor((foot.y - FOOT_R) / CELL), y1 = Math.floor((foot.y + FOOT_R) / CELL);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {   // 最多 4 格
        if (MapData.isWalkable(cx, cy)) continue;
        // 圆 vs 该格矩形：最近点距 < R 则沿本轴回贴格边（只解当前轴，另一轴留待下一半步）
        const nx = clamp(foot.x, cx*CELL, cx*CELL+CELL), ny = clamp(foot.y, cy*CELL, cy*CELL+CELL);
        if (dist2(foot, {nx, ny}) < FOOT_R*FOOT_R) {
            if (dx > 0) foot.x = cx*CELL - FOOT_R; else if (dx < 0) foot.x = cx*CELL+CELL + FOOT_R;
            if (dy > 0) foot.y = cy*CELL - FOOT_R; else if (dy < 0) foot.y = cy*CELL+CELL + FOOT_R;
        }
    }
}
```

- `isWalkable(cx, cy)` 由地图数据层提供：`tileType 表静态可走 + 动态阻挡位图`（树/石/建筑/水面/围栏=阻挡；耕地/作物=可走，MVP 玩家踩作物不掉血；居住区地形编辑直接改位图并 emit `farmChanged{action:'terrain'}`）。
- 每帧最多查 4 格 ×2 轴 = 8 次位图读，性能可忽略；扫描发生在 tick 内、可手动驱动。

### 3.4 镜头（D9）

```ts
// Component.update 内；目标点 = foot + (0, +40)：角色显示在屏幕中心下方 40px
camTarget.set(foot.x, foot.y + 40);
camPos.lerp(camTarget, 1 - Math.exp(-10 * dt));       // 指数平滑 k=10/s，无过冲
camera.setPosition(Math.round(camPos.x), Math.round(camPos.y));   // 整数像素防抖（§5.3）
```

区域边界夹取：camPos 先 clamp 到地图范围（地图小于一屏时居中）。不缩放、不旋转。

---

## 4. 虚拟摇杆细节

### 4.1 参数表

| 项 | 数值 | 说明 |
|---|---|---|
| 触发区 | **x < 640 的左半屏**，y ∈ [80, 696] | 顶部 80px 留给暂停下拉带（建议书 §5：顶部 72px 下拉暂停，留 8px 余量）；距边 ≥24px（§17） |
| 原点生成 | touchstart 点 clamp 到 [24, 616]×[80, 696] 内 | 动态摇杆：按在哪，原点在哪（§17 拍板） |
| 基座 | 视觉 Ø144px，半透明 35% | 纯视觉+引导，热区=整个左半屏 |
| 浮点 knob | Ø64px，最大行程 **R=52px** | 超程 clamp 在圆周上 |
| 死区 | **14px**（≈27% R） | <死区输出零向量；≥死区方向归一化输出 |
| 速度档 | **二档制**：过死区=全速。模拟量幅度只驱动 knob 位移与未来潜行 | 行走动画只有一档速度，模拟量调速会产生"慢帧"违和感 |
| 跟随模式 | **开启**：knob 顶到 R 后原点向指端平移（浮动跟随），基座最大漂移 ≤80px | 大幅度划动手感不脱手；抬手即复位 |
| 消失 | touchend/touchcancel → 80ms 淡出，vector 立即归零 | 归零必须同帧生效，防止抬手后滑步 |
| 触点跟踪 | 绑定 touchID；多点触控只认首触 ID，其余点忽略；丢点（leave/cancel）按 touchend 处理并可立即重新抓取 | §17"多点触控丢点保活" |

### 4.2 朝向映射（8→4）与迟滞

```ts
function updateFacing(v: Vec2) {
    if (len(v) < DEAD_ZONE) return;                    // 死区内不改朝向
    const ang = atan2(v.y, v.x);
    if (facingAngleValid && angDiff(ang, facingAngle) < 15°) return;   // ±15° 迟滞：防边界抖帧
    facing = quantize4(ang);                           // → down/up/left/right
}
```

### 4.3 与 UI 按钮的触摸冲突处理（仲裁链）

原则：**按触摸起点定归属**（capture-on-start），滑动越过边界不转移。

```
touchstart 仲裁优先级（先命中先得，余者出局）：
  1. 系统HUD/面板热区注册表（暂停、背包、种子chip、Debug…）  ← 每帧动态维护的 rect 列表
  2. 右下战斗钮（攻击 Ø120@(1150,560) / 闪避 Ø96@(980,470)，战斗区才注册）
  3. 情境交互键（出现时注册 Ø96~112 热区，见 §6.3）
  4. 左半屏 → 动态摇杆
  5. 右半屏无按钮区 → 空闲（MVP 不做右屏相机/其他手势）
```

- 按钮**一律 touchstart/touchend 手写判定**（非 cc.Button，避免点击延迟——建议书 §5 钓鱼条目结论推广到全部触屏钮）。
- 摇杆运行中，右手按下情境键/攻击钮：两路 touchID 互不干扰（摇杆只认自己的 ID）。
- **场景切换输入冷却 0.4s**：切区域/进副本后冻结全部输入（含摇杆生成），期间 UI 淡入完成，防误触（§17 盲区条款落地值）。
- 横握遮挡避让：左下/右下各 ~200px 视觉遮挡区**不放信息**（摇杆基座允许短暂出现在左下——它是半透明跟随物，非信息）；攻击/闪避圆心已按 §17 定位无需改动。

---

## 5. 走近交互系统

### 5.1 双通道模型（D6）

```
通道 A（面向工具动作）: 主行动键 → ToolRouter.resolve(facingCell, proximity) → chop/mine/water/plant/harvest/hoe
    目标 = 面朝格: target = cellOf(foot + facingDir × 0.6格)
通道 B（走近情境交互）: 情境键 → InteractionService.interactCurrent() → npc/door/waypoint/bed/bin/fishSpot/terrainEdge/sign
    目标 = 半径内最优 Interactable（见 5.2）
```

面朝格偏移取 0.6 格（≈38px）：站在格边缘时面朝格稳定指向眼前那格，而不是脚下格。

### 5.2 交互半径与多目标排序

| 项 | 数值 |
|---|---|
| 默认交互半径 | **1.6 格**（102 屏 px，foot 点到目标 foot 点） |
| 加大半径类 | 门/传送点/水域钓点 **2.2 格**（可站位离边半格以上）；NPC 2.0 格 |
| 距离计分 | `score = dist - (目标在面朝方向 ±60° 内 ? 0.6 : 0)`，取最小者 |
| 同分 tie-break | `priority` 字段（NPC > 出货箱 > 地形边 > sign） |
| 扫描节流 | **0.1s** 一次（tick 内累计，可手动驱动）；目标变更才发 UI 事件，无变更零开销 |
| 目标可视化 | 目标脚下 24×8 art px 呼吸光环（描边金 `#f2c14e`，α 0.5↔0.9，0.8s 周期）；`canInteract()=false` 时光环置灰（§5.3"置灰/红叉否定反馈"） |

### 5.3 情境交互键 UI 规格

| 项 | 数值 |
|---|---|
| 视觉 | 圆形 Ø**96px**（非战斗主槽复用时 Ø112），图标 40px + 文字 ≤4 字（如"对话/砍伐/钓鱼/进入/出货/挖土"），正文系统圆体 ≥20px（§17） |
| 槽位（D7） | 非战斗区主槽 = **(1150, 560)**（即战斗攻击钮位置，区域切换时按钮角色互换，拇指位置不变）；战斗区出现情境目标时次槽 = **(982, 588) Ø88**（校验：与闪避钮圆心距 118 > 48+44，与攻击钮圆心距 170 > 60+44，距底边 88 ≥24，均合规） |
| 出现/消失 | 出现：scale 0.6→1 + 淡入 120ms；消失：100ms 淡出；换目标时文案交叉淡化 120ms |
| 按下反馈 | scale 0.92 + 音效；触发热区=视觉圆外扩 8px（≥96px 合标） |
| 危险操作 | 地形编辑（挖/填）需**长按 0.5s**（环形进度）确认；其余单击即执行 |

### 5.4 统一 Interactable 组件设计

```ts
/** 所有"走近可交互"实体的统一接口；挂在场景实体节点或纯数据对象上均可 */
interface Interactable {
    id: string;
    kind: 'npc'|'door'|'waypoint'|'bed'|'shippingBin'|'fishSpot'|'terrainEdge'|'sign'|'workbench';
    getFootPos(): Vec2;              // 参与距离计算的脚点
    radius: number;                  // 该实体的交互半径（格），缺省 1.6
    priority: number;                // 同分 tie-break
    canInteract(): boolean;          // 前置：有种子/有工具/未锁定等
    promptLabel(): string;           // 情境键文案（≤4字）
    interact(player: Player): void;  // 执行；耗时操作自行驱动玩家 FSM
}

class InteractionService {
    private grid = new Map<number, Interactable[]>();   // 按格桶散列，查询只看 foot±2 格桶
    scanTick(dt: number) { /* 0.1s 节流：算最优目标，变更时 emit UI 局部信号 */ }
    interactCurrent() { this.current?.canInteract() ? this.current.interact(player)
                                                    : DenyFeedback.play(); }  // deny 音效+置灰抖动
}
```

### 5.5 与六区域玩法的整合框架

| 区域/玩法 | Interactable 实现 | 通道 | 行为要点 |
|---|---|---|---|
| 农场·种地 | 耕地格走**通道 A**（ToolRouter 按格态分发 hoe/plant/water/harvest） | A | 情境自动工具=免工具栏（D5）；**拖刷**：按住主行动键移动，每进入新面朝格施放一次（间隔 ≥0.25s），解决逐格点击疲劳（§17 拍板沿用）；种子切换=左上"手持种子 chip"（§7 开放问题 F3） |
| 开荒区·砍树清石 | 树/石注册为格阻挡 + ToolRouter 目标 | A | 树 hp3/石 hp2（起点值），掉落走 EconomySystem；砍完更新可走位图 |
| 居住区·地形编辑 | `terrainEdge`（地形高差边缘格） | B | 长按 0.5s 确认；挖/填写 tile 表+可走位图，emit `farmChanged{action:'terrain'}`；单次编辑范围=1 格，防误操作 |
| 钓鱼区·水域 | `fishSpot`（水域边缘采样点） | B | 半径 2.2 格；进入 fishCast → 既有 FishingPanel QTE（咬钩 ≥350ms、三重提示、失败零惩罚，§17 原样沿用） |
| 防守区·作物塔防 | 布置走 DefenseOverlay 面板拖放（既有），玩家移动/走位照常摇杆 | — | 减速/吸引光环扫描沿用；玩家不参与"格选择"交互，避免双手争用 |
| 探险区·传送点 | `waypoint` | B | 半径 2.2 格；进入前 0.4s 输入冷却+过场转场（建议书 §6：入口叙事过场吞加载） |
| 通用 | `npc`/`bed`/`shippingBin`/`sign`/`workbench` | B | NPC→线性对话；床→TimeSystem.endDay()；出货箱→出货面板 |

### 5.6 EventBus 新增登记（按 core/EventBus.ts 惯例补进 GameEvents）

```ts
toolApplied: { action: 'chop'|'mine'|'water'|'plant'|'harvest'|'hoe'; cellX: number; cellY: number };
playerDied:   { zoneId: string };
// interactTargetChanged 走 UI 局部信号，不进全局总线（高频、纯表现）
```

---

## 6. 动画素材需求清单

### 6.1 帧数总表（D2：4 逻辑方向 × 3 绘制方向，左=右镜像）

| 动作 sheet | 绘制方向 | 帧数/向 | fps | 循环 | 小计帧 | 备注 |
|---|---|---|---|---|---|---|
| `char_idle` | 下/上/侧 | 2 | 2 | ✓ | **6** | 呼吸起伏 1px；侧=朝右 |
| `char_walk` | 下/上/侧 | 4 | 8 | ✓ | **12** | 接触-通过-接触-通过四帧循环 |
| `char_chop` | 下/上/侧 | 4 | 7 | ✗ | **12** | 斧劈；第 2 帧命中点 |
| `char_mine` | 下/上/侧 | 4 | 7 | ✗ | **12** | 镐砸；第 2 帧命中点 |
| `char_water` | 下/上/侧 | 4 | 7 | ✗ | **12** | 水壶前倾；第 2 帧出水 |
| `char_bend` | 下/上/侧 | 2 | 4 | ✗ | **6** | 弯腰：hoe/plant/harvest/interact 四状态共用 |
| `char_attack` | 下/上/侧 | 4 | 10 | ✗ | **12** | 挥砍（武器可换色版式）；第 2 帧判定点 |
| `char_fish_cast` | 下/上/侧 | 2 | 4 | ✗ | **6** | 抛竿 |
| `char_fish_hold` | 下/上/侧 | 2 | 1.5 | ✓ | **6** | 持竿等待 |
| `char_hurt` | 通用 1 向 | 2 | 8 | ✗ | **2** | 白闪+后仰，方向无关 |
| `char_dead` | 通用 1 向 | 2 | 4 | ✗ | **2** | 倒地 |
| （闪避） | — | 复用 walk 帧+残影特效 | — | — | **0** | 省帧：位移冲刺感由残影+速度给 |
| **合计** | | | | | **86 帧** | |

- 每帧 32×48；86 帧 ≈ 132K px² → **单张 512×512 atlas 即可**，pngquant 8-bit 预计 60-100KB（整包素材 ≤6MB 预算内零压力）。
- 命名：`char_{action}_{dir}_{frame}.png`（dir ∈ down/up/side）；换装皮肤同版式整包替换（§1.4）。
- **MVP 减配线**（若产能吃紧）：`chop/mine` 先共用一套挥动帧（换工具贴图），省 12 帧；`fish_*` 先用 bend+idle 顶替，省 12 帧 → 最小可跑集 **62 帧**。正式版按表补齐。

### 6.2 角色设定稿（先做，锁形象）

1 张三视图设定稿（正面/背面/侧面立正，32×48 网格放大 ×4 标注），作为后续所有动作生成的**参考图**喂给生图管线（img2img/参考图模式），是治理"AI 逐帧漂移"的第一手段。

### 6.3 AI 生图提示词模板（沿用 docs/assets/pixel-art-prompts.md 格式：中英双语 + 全局风格 + 负面词）

**① 角色基准描述块（每条提示词原文携带，一字不改——一致性关键）：**

> 中：像素画，16位复古农场游戏角色，年轻农夫：头戴麦秆草帽(金黄 #f2c14e)，棕色短发，米色衬衫，绿色围裙，深棕色长裤，棕色靴子；背后斜背小型工具；三头身Q版比例，头大身小；深棕色统一描边(#2a1f16)；干净硬边，无抗锯齿，透明背景，单一主体居中，四周留2px余量
>
> EN: pixel art, 16-bit retro farm game character, young farmer: straw hat (golden #f2c14e), brown short hair, cream shirt, green apron, dark brown pants, brown boots, small tool on back; 3-heads-tall chibi proportion, big head small body; unified dark-brown outline (#2a1f16); clean hard edges, no anti-aliasing, transparent background, single centered sprite with 2px margin

**② 动作帧模板（逐条替换 {槽位}）：**

```
【中】{①中文基准块}，{朝向}，{动作描述}，32×48像素网格，游戏精灵帧
【EN】{①EN基准块}, {朝向EN}, {动作EN}, 32×48 pixel grid, game sprite frame
朝向槽位：{正面朝向镜头 / 背面朝向镜头 / 侧面朝右} | {front-facing camera / back-facing camera / right side view}
```

| sheet | 动作描述（中 / EN） |
|---|---|
| idle | 站立不动，轻微呼吸起伏，双臂自然下垂 / standing idle, subtle breathing bob, arms relaxed |
| walk 第k帧(k=1..4) | 行走循环第{k}帧：{迈左脚前掌着地/双腿交叉过渡/迈右脚前掌着地/双腿交叉过渡} / walk cycle frame {k}: {left foot planted / legs crossing / right foot planted / legs crossing} |
| chop 第k帧(k=1..4) | 挥斧砍柴第{k}帧：{举斧过头/斧中段下劈(命中帧)/斧落至低位/收斧} / chopping with axe frame {k}: {axe raised overhead / axe mid swing down (impact frame) / axe low / recovering grip} |
| mine 第k帧 | 双手举镐砸石第{k}帧：{举镐过肩/镐下砸(命中帧)/镐触地/收镐} / swinging pickaxe at rock frame {k} |
| water 第k帧 | 提水壶浇水第{k}帧：{水壶提起/前倾出水(出水帧)/持续倾倒/收回} / pouring watering can frame {k} |
| bend 第k帧(k=1..2) | 弯腰向地面伸手第{k}帧：{弯腰中/弯腰触地} / bending down reaching ground frame {k} |
| attack 第k帧 | 横挥武器攻击第{k}帧：{后拉蓄力/横扫中(判定帧)/挥满/收势} / melee attack swing frame {k} |
| fish_cast 第k帧 | 抛鱼竿第{k}帧：{举竿后仰/向前甩出} / casting fishing rod frame {k} |
| fish_hold | 双手持竿静立等待，鱼线入水 / holding fishing rod still, line in water |
| hurt | 受击后仰，闭眼张嘴，身体后倾 15 度 / hit reaction, leaning back 15 degrees, eyes closed |
| dead | 面朝下倒地躺平 / lying face-down on ground |

**③ 负面词（每次贴，沿用全局）：**
> 抗锯齿、模糊、柔和阴影、渐变、3D渲染、照片、高细节、文字、水印、边框 / anti-aliasing, blurry, soft shading, gradient, smooth, 3D render, photorealistic, high detail, text, watermark, border, noise

**④ 生成与验收流程**：
1. 先出**三视图设定稿** → 选定 1 张作参考图。
2. 同一动作优先**一次生成一行 4 帧**（提示词末尾加"同一角色四帧连续动作横向排列，等间距，行内角色完全一致 / the same character, four sequential animation frames in one horizontal row, identical character across frames"），整体下采样切帧——行内一致性远好于逐帧生成；生成器不支持多主体时再逐帧+参考图。
3. 逐帧验收四查（沿用提示词表）：透明背景 / 主体居中留 2px / 缩到 32×48 无杂色 / 描边接近 `#2a1f16`；**逐帧间加第五查：发色/帽形/围裙色与设定稿一致**，漂移>2px 色差即重 roll 或 Aseprite 手修。
4. 工具链复用 `tools/gen_pixel_art.py`（ASSETS 单一真源 + chroma_key 抠透明 + FASTOCTREE 量化，pitfalls #19/#20 全部适用）。

---

## 7. 风险与开放式问题

### 7.1 风险（按杀伤力排序）

| # | 风险 | 影响 | 缓解 |
|---|---|---|---|
| R1 | **AI 生成角色帧一致性漂移**（最高风险）：同一角色 86 帧跨图生成，发色/帽形/比例漂移 | 素材不可用，返工最大项 | 三视图参考图+img2img；整行 4 帧一次生成；逐帧第五查；预算 30% 帧数手修时间；兜底=购买一套同规格像素角色包做占位/备用 |
| R2 | 摇杆+情境自动工具的**种地疲劳度未验证**：§17 原方案是点击移动+拖刷（为点击优化），改摇杆后"面朝格+按住拖刷"是否够顺手需真机回答 | 农场日常手感 | 灰盒先做"按住连续施放"，真机 14 条清单加测"浇水 8 格用时 ≤15s"；不达标回退点击移动混合方案（§7.2 Q1） |
| R3 | 斜走用主导轴帧在斜俯视立面下的观感 | 走路方向"看着不对" | ±15° 迟滞已消抖；灰盒期重点观察；若违和，P2 补侧向 45° 过渡帧（+6 帧） |
| R4 | 双通道交互学习成本：玩家分不清"主行动键(面朝)"与"情境键(走近)" | 误操作 | 情境键只在其目标存在时出现+光环高亮；新手引导链（§13 A2）前 3 步分别教两通道 |
| R5 | y-sort 与 48px 高角色、立面遮挡的组合穿帮 | 视觉 bug | 沿用 §5.3 淡出规范；角色 foot 锚点已统一，风险集中在 tile 立面锚点（map-design 文档域，已在此定义锚点契约：anchor(0.5,16/48)） |
| R6 | 战斗区与非战斗区按钮角色互换（D7）造成瞬时误触 | 误攻击/误交互 | 区域切换 0.4s 输入冷却 + 按钮换装 120ms 淡入，冷却期按钮不响应 |

### 7.2 开放式问题（需拍板/原型回答）

| # | 问题 | 建议 |
|---|---|---|
| Q1 | 农场是否保留"点击移动"作为混合模式（点哪走哪+摇杆并行）？§17 原拍板是点击移动 | 先纯摇杆统一；真机若反馈"远距离移动累"，P1 加"点击地图远点→自动寻路走过去"（直线+撞墙滑动即可，无需 A*） |
| Q2 | 种子选择交互形态：左上 chip 点击轮换 vs 打开背包选择？ | 先做 chip 轮换（一手可完成），背包内"设为手持"并行支持；位置是否避开左拇指热区需真机验证 |
| Q3 | 体力/工具耐久是否引入（星露谷有体力）？ | 本档不引入，无体力=轻压力支柱；若后期要，加在 ToolRouter 上游一个闸门即可，无结构成本 |
| Q4 | 8 方向攻击是否在战斗区单独存在（农场 4 向+战斗 8 向双规格）？ | 不建议：双规格图集+状态机复杂化；先用 4 向+连续角度判定验证手感 |
| Q5 | 大地图六区域同图后，tile 数量与图集切分、相机跨区加载属 map-design 域——本方案的 isWalkable 位图与 Interactable 桶散列按"万格级地图"设计，需与其对齐数据格式 | 向 map-design 输出契约：`isWalkable(cx,cy)` 位图 + 立面 tile 锚点规范 + 区域 tag |

---

## 8. 实施切片建议（给排期用）

1. **灰盒骨架（3 天）**：摇杆+FSM(idle/walk/hurt)+圆碰撞+镜头跟随，用色块角色（复用 walk 4 帧）在 20×11 格测试图跑通——本档所有数值一次可调。
2. **交互双通道（3 天）**：ToolRouter + InteractionService + 情境键 UI + 拖刷，接 FarmSystem 既有种/浇/收。
3. **战斗状态（2 天）**：attack/dodge/输入缓冲/近战吸附/轻吸附判定，接 AdventureSystem 怪物靶子。
4. **正式素材接入（跟随美术管线）**：三视图→逐动作行生成→切帧→atlas；每接入一个 sheet 即替换对应状态动画。
5. **真机验证**：并入建议书 §5 的 14 条清单，新增 3 条：浇水 8 格 ≤15s / 双拇指摇杆+攻击 10 分钟疲劳 ≤2 分 / 情境键出现→按下首点准确率 ≥95%。
