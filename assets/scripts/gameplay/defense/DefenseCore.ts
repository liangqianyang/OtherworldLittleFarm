/**
 * DefenseCore —— 封印防守战斗核心（纯逻辑，零 cc 依赖，可无头测试）。
 *
 * M4 塔防化（world-redesign/tower-defense-area.md）：
 * - 固定 waypoints 直线移动，无寻路；西线 A / 北线 B 在 (5,4) 十字汇合，决战走廊 (11,3)→祭坛。
 * - 怪物状态机 Walk → (ChewBait) → Walk → … → ChewAltar（终态：啃祭坛到死或祭坛毁）。
 * - 塔四种：slow 光环（取最强、上限 60%、精英 50% 抗性）/ attract 诱饵（蜜瓜圃，可被啃）/
 *   spike 小 AOE / pod 单体锁定最靠前怪（即发即中）。
 * - 逐波门控：当前波生成完+怪全灭 → waveBreak 倒计时 → 下一波。
 * - 胜负：祭坛 HP≤0 立即失守；全波清空=胜利，祭坛≥90=完胜。
 * 事件回调 ev：spawn / arrive(漏怪+偷吃) / altar_hit / bait_eat / bait_gone /
 * pod_shot / spike_hit / kill / wave_break / wave_start / end。
 */

// ---------- 数据结构 ----------

export interface CoreMapDef {
    cellPx: number;
    cols: number;
    rows: number;
    originX: number;   // 设计坐标：px = originX + cx*cellPx + cellPx/2
    originY: number;   //            py = originY - cy*cellPx - cellPx/2
    paths: Record<string, number[][]>;   // 'A'|'B' → 格坐标 waypoint 序列
    altarCells: number[][];              // 2×2 祭坛格
    decor: Record<string, number[][]>;   // 池塘/岩石等不可建造格
}

/** 放置态塔（跨夜常驻，来自存档 seal.towers + 表 defense 字段实例化） */
export interface CoreTower {
    cropId: string;
    kind: 'slow' | 'attract' | 'spike' | 'pod';
    cx: number;
    cy: number;
    lv: number;
    x: number;
    y: number;
    rPx: number;      // 效果半径 px
    power: number;    // slow=减速比例 / spike|pod=单次伤害
    interval: number; // spike|pod 攻击间隔秒（slow/attract 无意义填 0）
    hp: number;       // 仅 attract（食物量），其余 =0
    cd: number;       // 攻击冷却计时
}

export interface CoreMonster {
    uid: number;
    mid: string;
    name: string;
    hp: number;
    maxHp: number;
    damage: number;
    speed: number;
    x: number;
    y: number;
    state: 'walk' | 'chew' | 'altar';
    line: 'A' | 'B';
    wp: number;               // 当前目标 waypoint 下标
    slowResist: number;
    baitImmune: boolean;
    atkT: number;             // altar/bait 咬合计时
    baitTarget: CoreTower | null;
    pathPx: number[][];
}

export interface CoreWaveGroup {
    monsterId: string;
    count: number;
    interval: number;
    delay: number;
    entrance: 'A' | 'B';
}

export interface CoreNight {
    map: ResolvedMap;
    waves: CoreWaveGroup[][];   // 每波 = spawn 组数组
    waveIdx: number;
    waveElapsed: number;
    wavePlan: { t: number; mid: string; line: 'A' | 'B'; speed: number; damage: number; hp: number; name: string }[];
    spawnedInWave: number;
    breakActive: boolean;
    breakT: number;
    waveBreak: number;
    towers: CoreTower[];
    monsters: CoreMonster[];
    altarHp: number;
    altarMax: number;
    leakA: number;
    leakB: number;
    elapsed: number;
    over: boolean;
    won: boolean;
    perfect: boolean;
    uidSeq: number;
    /** 诱饵批量吸引计时（每 0.25s 一批；随夜战实例走，不挂模块全局） */
    baitT: number;
    /** 怪物元数据查询（DefenseSystem 注入；随夜战实例走） */
    metaLookup: MonsterMetaLookup | null;
}

export type MonsterMetaLookup = (mid: string) => { hp: number; damage: number; speed: number; name: string; slowResist: number; baitImmune: boolean } | null;

/** 已解析地图：waypoint px 化 + 不可建造格集合 + 建造格列表 */
export interface ResolvedMap {
    def: CoreMapDef;
    pathPx: Record<string, number[][]>;
    blocked: Set<number>;       // cell = cy*cols+cx（路径∪祭坛∪装饰）
    buildable: number[];        // cell 索引数组
    altarCx: number;            // 祭坛中心格（啃咬点=路径终点已含）
    altarCy: number;
}

// ---------- 地图解析 ----------

export function resolveMap(def: CoreMapDef): ResolvedMap {
    const blocked = new Set<number>();
    const cell = (cx: number, cy: number) => cy * def.cols + cx;
    for (const line of Object.keys(def.paths)) {
        for (const [cx, cy] of def.paths[line]) blocked.add(cell(cx, cy));
        // 线段覆盖格（waypoint 间直线段上的所有格子）
        const wps = def.paths[line];
        for (let i = 0; i + 1 < wps.length; i++) {
            const [x0, y0] = wps[i], [x1, y1] = wps[i + 1];
            // 有界步进：轴对齐逐格；斜线段按长轴取整覆盖（旧 while 在非 45° 段会死循环）
            const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
            for (let s = 1; s <= steps; s++) {
                const x = Math.round(x0 + ((x1 - x0) * s) / steps);
                const y = Math.round(y0 + ((y1 - y0) * s) / steps);
                blocked.add(cell(x, y));
            }
        }
    }
    for (const [cx, cy] of def.altarCells) blocked.add(cell(cx, cy));
    for (const key of Object.keys(def.decor ?? {})) {
        for (const [cx, cy] of def.decor[key]) blocked.add(cell(cx, cy));
    }
    const buildable: number[] = [];
    for (let cy = 0; cy < def.rows; cy++) {
        for (let cx = 0; cx < def.cols; cx++) {
            const c = cell(cx, cy);
            if (!blocked.has(c)) buildable.push(c);
        }
    }
    const pathPx: Record<string, number[][]> = {};
    for (const line of Object.keys(def.paths)) {
        pathPx[line] = def.paths[line].map(([cx, cy]) => cellToPx(def, cx, cy));
    }
    const altarCx = def.altarCells.reduce((s, c) => s + c[0], 0) / def.altarCells.length;
    const altarCy = def.altarCells.reduce((s, c) => s + c[1], 0) / def.altarCells.length;
    return { def, pathPx, blocked, buildable, altarCx, altarCy };
}

export function cellToPx(def: CoreMapDef, cx: number, cy: number): [number, number] {
    return [def.originX + cx * def.cellPx + def.cellPx / 2, def.originY - cy * def.cellPx - def.cellPx / 2];
}

/** 屏幕坐标 → 最近格；超界返回 -1 */
export function pxToCell(m: ResolvedMap, x: number, y: number): number {
    const cx = Math.floor((x - m.def.originX) / m.def.cellPx);
    const cy = Math.floor((m.def.originY - y) / m.def.cellPx);
    if (cx < 0 || cy < 0 || cx >= m.def.cols || cy >= m.def.rows) return -1;
    return cy * m.def.cols + cx;
}

// ---------- 塔实例化 ----------

/** 由 crops 行的 defense 字段 + 放置格 → 运行时塔（lv 从 1 起） */
export function makeTower(cropId: string, d: Record<string, unknown>, cx: number, cy: number, cellPx: number, originX: number, originY: number): CoreTower {
    const kind = String(d['kind']) as CoreTower['kind'];
    const [x, y] = cellToPx({ cellPx, originX, originY, cols: 0, rows: 0 } as CoreMapDef, cx, cy);
    return {
        cropId, kind, cx, cy, lv: 1, x, y,
        rPx: Number(d['radiusCells'] ?? 1.5) * cellPx,
        power: Number(d['power'] ?? 0),
        interval: Number(d['interval'] ?? 0),
        hp: kind === 'attract' ? Number(d['hp'] ?? 18) : 0,
        cd: 0,
    };
}

export function towerStatsAt(t: CoreTower, d: Record<string, unknown>, cellPx: number): void {
    // 升级覆盖（lv2 字段）；就地改写 t
    if (t.lv >= 2) return;
    t.lv = 2;
    const lv2 = (d['lv2'] ?? {}) as Record<string, unknown>;
    if (lv2['radiusCells'] !== undefined) t.rPx = Number(lv2['radiusCells']) * cellPx;
    if (lv2['power'] !== undefined) t.power = Number(lv2['power']);
    if (lv2['interval'] !== undefined) t.interval = Number(lv2['interval']);
}

// ---------- 夜战状态 ----------

export function startCoreNight(
    map: ResolvedMap,
    tableRow: Record<string, unknown>,
    metaLookup: MonsterMetaLookup | null,
    towers: CoreTower[],
    altarHp: number,
    uidSeq = 0,
): CoreNight {
    const waves: CoreWaveGroup[][] = [];
    for (const w of (tableRow['waves'] ?? []) as unknown[]) {
        waves.push(w as CoreWaveGroup[]);
    }
    const n: CoreNight = {
        map, waves, waveIdx: -1, waveElapsed: 0, wavePlan: [], spawnedInWave: 0,
        breakActive: false, breakT: 0,
        waveBreak: Number(tableRow['waveBreak'] ?? 25),
        towers,
        monsters: [] as CoreMonster[],
        altarHp, altarMax: altarHp,
        leakA: 0, leakB: 0,
        elapsed: 0, over: false, won: false, perfect: false, uidSeq,
        baitT: 0, metaLookup,
    };
    return n;
}

/** 进入第 i 波：展开该波全部 spawn 组为相对时刻计划 */
export function beginWave(n: CoreNight, i: number): void {
    n.waveIdx = i;
    n.waveElapsed = 0;
    n.spawnedInWave = 0;
    n.breakActive = false;
    n.breakT = 0;
    n.wavePlan = [];
    for (const g of n.waves[i] ?? []) {
        const meta = metaOf(n, g.monsterId);
        const count = Number(g.count ?? 1);
        const interval = Number(g.interval ?? 1.5);
        const delay = Number(g.delay ?? 1.0);
        for (let k = 0; k < count; k++) {
            n.wavePlan.push({
                t: delay + k * interval,
                mid: g.monsterId,
                line: (g.entrance === 'B' ? 'B' : 'A'),
                speed: meta ? meta.speed : 55,
                damage: meta ? meta.damage : 3,
                hp: meta ? meta.hp : 10,
                name: meta ? meta.name : g.monsterId,
            });
        }
    }
    n.wavePlan.sort((a, b) => a.t - b.t);
}

function metaOf(n: CoreNight, mid: string) {
    return n.metaLookup ? n.metaLookup(mid) : null;
}

// ---------- 生成与推进 ----------

export function tickCoreNight(
    n: CoreNight,
    dt: number,
    cb: (ev: string, payload?: Record<string, unknown>) => void,
): void {
    if (n.over) return;
    n.elapsed += dt;

    // 首波尚未开启 → 立即开
    if (n.waveIdx < 0) { beginWave(n, 0); cb('wave_start', { wave: 0 }); }

    if (n.breakActive) {
        n.breakT -= dt;
        if (n.breakT <= 0) {
            beginWave(n, n.waveIdx + 1);
            cb('wave_start', { wave: n.waveIdx });
        }
    } else {
        n.waveElapsed += dt;
        while (n.wavePlan.length > 0 && n.wavePlan[0].t <= n.waveElapsed) {
            const item = n.wavePlan.shift()!;
            spawnMonster(n, item, cb);
        }
    }

    tickBaits(n, dt, cb);
    for (const m of n.monsters) tickMonster(n, m, dt, cb);
    tickTowers(n, dt, cb);
    n.monsters = n.monsters.filter((m) => m.hp > 0);
    n.towers = n.towers.filter((t) => t.hp > 0 || t.kind !== 'attract');

    // 逐波门控：当前波生成完 + 场上无怪 → 波间或终局
    // 空波（表缺 waves/组为空）也视为已清，避免夜战永不结束
    if (!n.breakActive && n.waveIdx >= 0 && n.wavePlan.length === 0 && (n.spawnedInWave > 0 || (n.waves[n.waveIdx]?.length ?? 0) === 0)) {
        const anyAlive = n.monsters.some((m) => m.hp > 0);
        if (!anyAlive) {
            if (n.waveIdx + 1 < n.waves.length) {
                n.breakActive = true;
                n.breakT = n.waveBreak;
                cb('wave_break', { next: n.waveIdx + 1, secs: n.waveBreak });
            } else {
                n.over = true;
                n.won = n.altarHp > 0;
                n.perfect = n.won && n.altarHp >= Math.max(90, n.altarMax * 0.9);
                cb('end', { won: n.won, perfect: n.perfect });
                return;
            }
        }
    }

    if (n.altarHp <= 0 && !n.over) {
        n.over = true;
        n.won = false;
        n.perfect = false;
        cb('end', { won: false, perfect: false });
    }
}

function spawnMonster(n: CoreNight, item: { mid: string; line: 'A' | 'B'; speed: number; damage: number; hp: number; name: string }, cb: (ev: string, payload?: Record<string, unknown>) => void): void {
    const meta = metaOf(n, item.mid);
    const pathPx = n.map.pathPx[item.line];
    const [sx, sy] = pathPx[0];
    n.monsters.push({
        uid: ++n.uidSeq,
        mid: item.mid,
        name: item.name,
        hp: item.hp, maxHp: item.hp,
        damage: item.damage,
        speed: item.speed,
        x: sx, y: sy,
        state: 'walk', line: item.line, wp: 1,
        slowResist: meta ? meta.slowResist : 0,
        baitImmune: meta ? meta.baitImmune : false,
        atkT: 0, baitTarget: null,
        pathPx,
    });
    n.spawnedInWave++;
    cb('spawn', { uid: n.uidSeq, mid: item.mid });
}

function tickMonster(n: CoreNight, m: CoreMonster, dt: number, cb: (ev: string, payload?: Record<string, unknown>) => void): void {
    if (m.hp <= 0) return;
    if (m.state === 'walk') {
        const sf = slowFactor(n, m);
        const wp = m.pathPx[m.wp];
        if (!wp) { arriveAltar(n, m, cb); return; }
        const dx = wp[0] - m.x, dy = wp[1] - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const step = m.speed * sf * dt;
        if (dist <= Math.max(8, step)) {
            m.x = wp[0]; m.y = wp[1];
            m.wp++;
            if (m.wp >= m.pathPx.length) { arriveAltar(n, m, cb); return; }
        } else {
            m.x += (dx / dist) * step;
            m.y += (dy / dist) * step;
        }
    } else if (m.state === 'chew') {
        const bait = m.baitTarget;
        if (!bait || bait.hp <= 0) { resumeWalk(n, m); return; }
        m.atkT -= dt;
        if (m.atkT <= 0) {
            m.atkT += 1.0;
            bait.hp -= m.damage;
            cb('bait_eat', { uid: m.uid, tower: bait.cropId, hp: Math.max(0, bait.hp) });
            if (bait.hp <= 0) { cb('bait_gone', { tower: bait.cropId }); resumeWalk(n, m); }
        }
    } else if (m.state === 'altar') {
        m.atkT -= dt;
        if (m.atkT <= 0) {
            m.atkT += 1.5;
            n.altarHp = Math.max(0, n.altarHp - m.damage);
            cb('altar_hit', { uid: m.uid, altarHp: n.altarHp });
        }
    }
}

/** 抵达祭坛：漏怪计数（击杀不回退）+ 偷吃一次 */
function arriveAltar(n: CoreNight, m: CoreMonster, cb: (ev: string, payload?: Record<string, unknown>) => void): void {
    m.state = 'altar';
    m.atkT = 1.5;
    const wpEnd = m.pathPx[m.pathPx.length - 1];
    m.x = wpEnd[0]; m.y = wpEnd[1];
    if (m.line === 'A') n.leakA++; else n.leakB++;
    cb('arrive', { uid: m.uid, mid: m.mid, line: m.line });
}

/** 吃完/诱饵没了 → 直线走回最近 waypoint */
function resumeWalk(n: CoreNight, m: CoreMonster): void {
    m.state = 'walk';
    m.baitTarget = null;
    let best = m.wp, bestD = Infinity;
    for (let i = 0; i < m.pathPx.length; i++) {
        const [wx, wy] = m.pathPx[i];
        const d = (wx - m.x) * (wx - m.x) + (wy - m.y) * (wy - m.y);
        if (d < bestD) { bestD = d; best = i; }
    }
    m.wp = Math.max(1, best);
}

/** 减速系数：半径内霜铃取最强，上限 60%，乘 (1-slowResist) */
export function slowFactor(n: CoreNight, m: CoreMonster): number {
    let maxP = 0;
    for (const t of n.towers) {
        if (t.kind !== 'slow') continue;
        const d2 = (t.x - m.x) * (t.x - m.x) + (t.y - m.y) * (t.y - m.y);
        if (d2 <= t.rPx * t.rPx && t.power > maxP) maxP = t.power;
    }
    if (maxP <= 0) return 1;
    const slow = Math.min(0.6, maxP * (1 - m.slowResist));
    return 1 - slow;
}

/** 诱饵吸引：每 0.25s 一批，只对 Walk 怪、跳过 baitImmune */
function tickBaits(n: CoreNight, dt: number, cb: (ev: string, payload?: Record<string, unknown>) => void): void {
    n.baitT += dt;
    if (n.baitT < 0.25) return;
    n.baitT = 0;
    const baits = n.towers.filter((t) => t.kind === 'attract' && t.hp > 0);
    if (baits.length === 0) return;
    for (const m of n.monsters) {
        if (m.hp <= 0 || m.state !== 'walk' || m.baitImmune) continue;
        let best: CoreTower | null = null, bestD = Infinity;
        for (const b of baits) {
            const d2 = (b.x - m.x) * (b.x - m.x) + (b.y - m.y) * (b.y - m.y);
            if (d2 <= b.rPx * b.rPx && d2 < bestD) { bestD = d2; best = b; }
        }
        if (best) {
            m.state = 'chew';
            m.baitTarget = best;
            m.atkT = 1.0;
            cb('bait_lure', { uid: m.uid, tower: best.cropId });
        }
    }
}

/** 塔攻击：spike 小 AOE 打半径内全部；pod 单体锁最靠前怪（即发即中） */
function tickTowers(n: CoreNight, dt: number, cb: (ev: string, payload?: Record<string, unknown>) => void): void {
    for (const t of n.towers) {
        if (t.kind !== 'spike' && t.kind !== 'pod') continue;
        t.cd -= dt;
        if (t.cd > 0) continue;
        // 半径内活怪
        const inRange = n.monsters.filter((m) => m.hp > 0 && (t.x - m.x) * (t.x - m.x) + (t.y - m.y) * (t.y - m.y) <= t.rPx * t.rPx);
        if (inRange.length === 0) continue;
        if (t.kind === 'spike') {
            for (const m of inRange) {
                cb('spike_hit', { uid: m.uid });
                damageMonster(n, m, t.power, cb, 'kill', t);
            }
            t.cd = t.interval;
        } else {
            // 最靠前 = waypoint 下标最大，其次离当前 waypoint 最近
            let tgt: CoreMonster | null = null, bestKey = -Infinity;
            for (const m of inRange) {
                const key = m.wp * 100000 - (m.pathPx[m.wp] ? dist2(m, m.pathPx[m.wp]) : 0);
                if (key > bestKey) { bestKey = key; tgt = m; }
            }
            if (tgt) {
                cb('pod_shot', { uid: tgt.uid, from: [t.x, t.y], to: [tgt.x, tgt.y] });
                damageMonster(n, tgt, t.power, cb, 'kill', t);
                t.cd = t.interval;
            }
        }
    }
}

function dist2(m: CoreMonster, wp: number[]): number {
    return (wp[0] - m.x) * (wp[0] - m.x) + (wp[1] - m.y) * (wp[1] - m.y);
}

/** 伤害结算（塔/玩家共用）：死亡→kill 事件； DefenceSystem 负责战利品 */
export function damageMonster(n: CoreNight, m: CoreMonster, dmg: number, cb: (ev: string, payload?: Record<string, unknown>) => void, ev = 'kill', src?: CoreTower): void {
    if (m.hp <= 0) return;
    m.hp -= dmg;
    if (m.hp <= 0) {
        m.hp = 0;
        cb(ev, { uid: m.uid, mid: m.mid, by: src ? src.cropId : 'player' });
    }
}

// ---------- 放置校验 ----------

/** cell 是否可建造（不在 路径/祭坛/装饰，且无塔） */
export function canPlace(m: ResolvedMap, towers: CoreTower[], cell: number, cols: number): { ok: boolean; reason?: string } {
    if (cell < 0) return { ok: false, reason: 'out' };
    if (m.blocked.has(cell)) return { ok: false, reason: 'blocked' };
    const cx = cell % cols, cy = Math.floor(cell / cols);
    if (towers.some((t) => t.cx === cx && t.cy === cy)) return { ok: false, reason: 'occupied' };
    return { ok: true };
}
