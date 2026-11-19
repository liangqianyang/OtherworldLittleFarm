/**
 * CombatLogic —— 探险副本实时战斗核心（元气骑士式，纯逻辑零 cc 依赖，可无头单测）。
 *
 * 参考 world-redesign/combat-design.md：
 * - 固定步长逻辑（1/30s），渲染层累积 dt 泵帧；全部状态可序列化。
 * - 左摇杆移动 + 右攻击钮自动瞄准（锁定粘滞 0.7s）+ 翻滚 0.3s（无敌 0.22s / CD 0.8s）。
 * - 武器：近战（挥砍扇形，可拍掉迎面弹幕）/ 远程（自动瞄准发射弹）。
 * - 怪物 AI：chaser 直追 / shooter 保持距离打弹 / tank 慢速肉盾；精英死亡分裂两只小怪。
 * - 敌方子弹预算 ≤20；玩家受击无敌 0.8s。
 * - 房间清怪开门：怪全灭 → onCleared。
 * 事件回调 ev：swing / shoot_p / spawn / die / split / hurt / shoot_e / block / roll / end_win / end_lose。
 */

export interface CombatWeapon {
    id: string;
    name: string;
    kind: 'melee' | 'ranged';
    damage: number;
    interval: number;
    range: number;
    arcDeg?: number;
    bulletSpeed?: number;
    blockBullets?: boolean;
}

export interface CombatMonsterSpec {
    mid: string;
    name: string;
    hp: number;
    damage: number;
    speed: number;
    behavior: 'chaser' | 'shooter' | 'tank';
    fireInterval?: number;   // shooter
    bulletSpeed?: number;    // shooter
    radius: number;
    elite?: boolean;
}

export interface CombatMonster {
    uid: number;
    spec: CombatMonsterSpec;
    hp: number;
    x: number;
    y: number;
    atkT: number;      // 攻击冷却
    hitT: number;      // 受击闪白
}

export interface CombatBullet {
    uid: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    dmg: number;
    enemy: boolean;
    r: number;
}

export interface CombatInput {
    mx: number;        // 移动 -1..1
    my: number;
    attack: boolean;   // 按住持续攻击
    roll: boolean;     // 点按翻滚（边沿触发由调用方或本层去抖）
}

export interface CombatSession {
    arenaW: number;
    arenaH: number;
    player: {
        x: number; y: number;
        hp: number; maxHp: number;
        speed: number; radius: number;
        weapon: CombatWeapon;
        atkT: number;
        hurtInvuln: number;    // 受击无敌
        rollT: number;         // 翻滚剩余时间
        rollDirX: number; rollDirY: number;
        rollCd: number;
        facingX: number; facingY: number;
    };
    monsters: CombatMonster[];
    bullets: CombatBullet[];
    lockTarget: CombatMonster | null;
    lockT: number;
    waveTotal: number;
    spawnedTotal: number;
    over: boolean;
    won: boolean;
    uidSeq: number;
    arena: { x: number; y: number; w: number; h: number };   // 可行走区
    onCleared: boolean;
}

export const COMBAT_DT = 1 / 30;
const ROLL_TIME = 0.3;
const ROLL_INVULN = 0.22;
const ROLL_CD = 0.8;
const ROLL_SPEED_X = 3.2;
const HURT_INVULN = 0.8;
const MAX_ENEMY_BULLETS = 20;
const LOCK_STICKY = 0.7;

export function startCombat(arenaW: number, arenaH: number, weapon: CombatWeapon, hp: number, maxHp: number): CombatSession {
    return {
        arenaW, arenaH,
        player: {
            x: arenaW / 2, y: arenaH / 2 + 120,
            hp, maxHp, speed: 175, radius: 20,
            weapon, atkT: 0, hurtInvuln: 0,
            rollT: 0, rollDirX: 0, rollDirY: 0, rollCd: 0,
            facingX: 0, facingY: -1,
        },
        monsters: [], bullets: [],
        lockTarget: null, lockT: 0,
        waveTotal: 0, spawnedTotal: 0,
        over: false, won: false,
        uidSeq: 1000, arena: { x: 0, y: 0, w: arenaW, h: arenaH },
        onCleared: false,
    };
}

/** 生成一波怪：spec+count，绕玩家出生点半径 160-300 均匀散布 */
export function spawnWave(s: CombatSession, specs: CombatMonsterSpec[], cb: (ev: string, p?: Record<string, unknown>) => void): void {
    for (const spec of specs) {
        const ang = Math.random() * Math.PI * 2;
        const dist = 170 + Math.random() * 140;
        s.monsters.push({
            uid: ++s.uidSeq,
            spec,
            hp: spec.hp,
            x: clamp(s.player.x + Math.cos(ang) * dist, 40, s.arenaW - 40),
            y: clamp(s.player.y + Math.sin(ang) * dist, 40, s.arenaH - 40),
            atkT: spec.fireInterval ? 0.8 : 0.5,
            hitT: 0,
        });
        s.spawnedTotal++;
        cb('spawn', { uid: s.uidSeq, mid: spec.mid });
    }
    s.waveTotal = s.spawnedTotal;
    s.onCleared = false;
}

function clamp(v: number, a: number, b: number): number { return v < a ? a : v > b ? b : v; }

/** 推进一个逻辑步 */
export function tickCombat(s: CombatSession, input: CombatInput, cb: (ev: string, p?: Record<string, unknown>) => void): void {
    if (s.over) return;
    const p = s.player;

    // ---- 翻滚 ----
    if (p.rollCd > 0) p.rollCd -= COMBAT_DT;
    if (input.roll && p.rollT <= 0 && p.rollCd <= 0) {
        let dx = input.mx, dy = input.my;
        if (dx === 0 && dy === 0) { dx = p.facingX; dy = p.facingY; }
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        p.rollDirX = dx / len; p.rollDirY = dy / len;
        p.rollT = ROLL_TIME;
        p.rollCd = ROLL_CD + ROLL_TIME;
        cb('roll');
    }

    // ---- 移动 ----
    let vx = input.mx, vy = input.my;
    const mlen = Math.sqrt(vx * vx + vy * vy);
    if (mlen > 1) { vx /= mlen; vy /= mlen; }
    if (p.rollT > 0) {
        p.rollT -= COMBAT_DT;
        vx = p.rollDirX; vy = p.rollDirY;
        const rs = p.speed * ROLL_SPEED_X;
        p.x = clamp(p.x + vx * rs * COMBAT_DT, p.radius, s.arenaW - p.radius);
        p.y = clamp(p.y + vy * rs * COMBAT_DT, p.radius, s.arenaH - p.radius);
    } else if (mlen > 0.01) {
        p.x = clamp(p.x + vx * p.speed * COMBAT_DT, p.radius, s.arenaW - p.radius);
        p.y = clamp(p.y + vy * p.speed * COMBAT_DT, p.radius, s.arenaH - p.radius);
        p.facingX = vx; p.facingY = vy;
    }
    if (p.hurtInvuln > 0) p.hurtInvuln -= COMBAT_DT;
    if (p.atkT > 0) p.atkT -= COMBAT_DT;

    // ---- 锁定（自动瞄准，粘滞 0.7s）----
    const cur = s.lockTarget;
    const alive = s.monsters.filter((m) => m.hp > 0);
    const range = p.weapon.kind === 'ranged' ? p.weapon.range : p.weapon.range + 40;
    const valid = cur && cur.hp > 0 && dist2(cur, p) <= (range * 1.5) ** 2 ? cur : null;
    if (valid) {
        s.lockT += COMBAT_DT;
        if (s.lockT >= LOCK_STICKY) { s.lockTarget = nearest(alive, p); s.lockT = 0; }
    } else {
        s.lockTarget = nearest(alive, p);
        s.lockT = 0;
    }
    if (s.lockTarget && s.lockTarget.hp <= 0) s.lockTarget = nearest(alive, p);

    // ---- 攻击 ----
    if (input.attack && p.atkT <= 0 && s.lockTarget) {
        const w = p.weapon;
        if (w.kind === 'melee') {
            // 扇形：朝锁定目标的锥角内全部受击 + 挡弹
            const dx = s.lockTarget.x - p.x, dy = s.lockTarget.y - p.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            if (d <= w.range + s.lockTarget.spec.radius) {
                if (d > 1) { p.facingX = dx / d; p.facingY = dy / d; }
                const halfArc = ((w.arcDeg ?? 100) / 2) * Math.PI / 180;
                for (const m of s.monsters) {
                    if (m.hp <= 0) continue;
                    const mdx = m.x - p.x, mdy = m.y - p.y;
                    const md = Math.sqrt(mdx * mdx + mdy * mdy);
                    if (md > w.range + m.spec.radius) continue;
                    const dot = (mdx * p.facingX + mdy * p.facingY) / (md || 1);
                    if (dot >= Math.cos(halfArc)) hurtMonster(s, m, w.damage, cb);
                }
                if (w.blockBullets) {
                    s.bullets = s.bullets.filter((b) => {
                        if (!b.enemy) return true;
                        const bdx = b.x - p.x, bdy = b.y - p.y;
                        const bd = Math.sqrt(bdx * bdx + bdy * bdy);
                        if (bd > w.range * 0.9) return true;
                        const dot = (bdx * p.facingX + bdy * p.facingY) / (bd || 1);
                        if (dot >= Math.cos(halfArc)) { cb('block'); return false; }
                        return true;
                    });
                }
                p.atkT = w.interval;
                cb('swing', { dmg: w.damage });
            }
        } else {
            // 远程：朝锁定目标发射
            const dx = s.lockTarget.x - p.x, dy = s.lockTarget.y - p.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            if (d <= w.range + s.lockTarget.spec.radius) {
                if (d > 1) { p.facingX = dx / d; p.facingY = dy / d; }
                const spd = w.bulletSpeed ?? 420;
                s.bullets.push({
                    uid: ++s.uidSeq,
                    x: p.x + (dx / d) * 24, y: p.y + (dy / d) * 24,
                    vx: (dx / d) * spd, vy: (dy / d) * spd,
                    life: (w.range + 40) / spd, dmg: w.damage, enemy: false, r: 7,
                });
                p.atkT = w.interval;
                cb('shoot_p');
            }
        }
    }

    // ---- 怪物 AI ----
    for (const m of s.monsters) {
        if (m.hp <= 0) continue;
        if (m.hitT > 0) m.hitT -= COMBAT_DT;
        if (m.atkT > 0) m.atkT -= COMBAT_DT;
        const dx = p.x - m.x, dy = p.y - m.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const ux = dx / d, uy = dy / d;
        const beh = m.spec.behavior;
        if (beh === 'chaser' || beh === 'tank') {
            const stop = beh === 'tank' ? 46 : 34;   // 贴身即咬
            if (d > stop) {
                const sp = m.spec.speed;
                m.x += ux * sp * COMBAT_DT; m.y += uy * sp * COMBAT_DT;
            } else if (m.atkT <= 0) {
                m.atkT = 1.0;
                hurtPlayer(s, m.spec.damage, cb);
            }
        } else {
            // shooter：180px 环绕，远了靠近近了后退，冷却好了打弹
            const ring = 180;
            let mx = 0, my = 0;
            if (d > ring + 30) { mx = ux; my = uy; }
            else if (d < ring - 40) { mx = -ux; my = -uy; }
            else { mx = -uy; my = ux; }   // 环绕
            m.x = clamp(m.x + mx * m.spec.speed * COMBAT_DT, 30, s.arenaW - 30);
            m.y = clamp(m.y + my * m.spec.speed * COMBAT_DT, 30, s.arenaH - 30);
            const fire = m.spec.fireInterval ?? 2.2;
            if (m.atkT <= 0 && enemyBulletCount(s) < MAX_ENEMY_BULLETS) {
                m.atkT = fire;
                const bspd = m.spec.bulletSpeed ?? 185;
                s.bullets.push({
                    uid: ++s.uidSeq,
                    x: m.x, y: m.y,
                    vx: ux * bspd, vy: uy * bspd,
                    life: 2.6, dmg: m.spec.damage, enemy: true, r: 8,
                });
                cb('shoot_e', { uid: m.uid });
            }
        }
    }

    // ---- 弹幕推进 ----
    s.bullets = s.bullets.filter((b) => {
        b.x += b.vx * COMBAT_DT;
        b.y += b.vy * COMBAT_DT;
        b.life -= COMBAT_DT;
        if (b.life <= 0 || b.x < -20 || b.y < -20 || b.x > s.arenaW + 20 || b.y > s.arenaH + 20) return false;
        if (b.enemy) {
            const pd = Math.sqrt((b.x - p.x) ** 2 + (b.y - p.y) ** 2);
            if (pd <= p.radius + b.r) {
                hurtPlayer(s, b.dmg, cb);
                return false;
            }
        } else {
            for (const m of s.monsters) {
                if (m.hp <= 0) continue;
                const md = Math.sqrt((b.x - m.x) ** 2 + (b.y - m.y) ** 2);
                if (md <= m.spec.radius + b.r) {
                    hurtMonster(s, m, b.dmg, cb);
                    return false;
                }
            }
        }
        return true;
    });

    // ---- 尸体清理 + 精英分裂 ----
    const dead = s.monsters.filter((m) => m.hp <= 0);
    for (const m of dead) {
        cb('die', { uid: m.uid, mid: m.spec.mid });
        if (m.spec.elite) {
            for (let i = 0; i < 2; i++) {
                const ang = Math.random() * Math.PI * 2;
                s.monsters.push({
                    uid: ++s.uidSeq,
                    spec: {
                        ...m.spec, elite: false, mid: m.spec.mid + '_split',
                        name: m.spec.name + '·分裂体',
                        hp: Math.max(6, Math.round(m.spec.hp * 0.3)),
                        radius: m.spec.radius * 0.7,
                        speed: m.spec.speed * 1.15,
                    },
                    hp: Math.max(6, Math.round(m.spec.hp * 0.3)),
                    x: clamp(m.x + Math.cos(ang) * 40, 40, s.arenaW - 40),
                    y: clamp(m.y + Math.sin(ang) * 40, 40, s.arenaH - 40),
                    atkT: 0.6, hitT: 0,
                });
            }
            cb('split', { uid: m.uid });
        }
    }
    s.monsters = s.monsters.filter((m) => m.hp > 0);

    // ---- 终局 ----
    if (p.hp <= 0) { s.over = true; s.won = false; cb('end_lose'); }
    else if (s.spawnedTotal > 0 && s.monsters.length === 0 && !s.onCleared) {
        s.onCleared = true;
        s.over = true;
        s.won = true;
        cb('end_win');
    }
}

function enemyBulletCount(s: CombatSession): number {
    let n = 0;
    for (const b of s.bullets) if (b.enemy) n++;
    return n;
}

function dist2(m: CombatMonster, p: CombatSession['player']): number {
    // 平方距离（调用方与 (range*1.5)^2 比较）。旧实现误返回欧氏距离，导致锁定距离判断恒真。
    return (m.x - p.x) ** 2 + (m.y - p.y) ** 2;
}

function nearest(list: CombatMonster[], p: CombatSession['player']): CombatMonster | null {
    let best: CombatMonster | null = null, bd = Infinity;
    for (const m of list) {
        const d = (m.x - p.x) ** 2 + (m.y - p.y) ** 2;
        if (d < bd) { bd = d; best = m; }
    }
    return best;
}

export function hurtMonster(_s: CombatSession, m: CombatMonster, dmg: number, cb: (ev: string, p?: Record<string, unknown>) => void): void {
    if (m.hp <= 0) return;
    m.hp -= dmg;
    m.hitT = 0.12;
    if (m.hp <= 0) m.hp = 0;
    cb('hurt_m', { uid: m.uid, hp: m.hp });
}

export function hurtPlayer(s: CombatSession, dmg: number, cb: (ev: string, p?: Record<string, unknown>) => void): void {
    const p = s.player;
    if (p.hurtInvuln > 0 || p.rollT > ROLL_TIME - ROLL_INVULN) return;   // 无敌帧（受击 0.8s / 翻滚前 0.22s）
    p.hp -= dmg;
    p.hurtInvuln = HURT_INVULN;
    cb('hurt_p', { hp: Math.max(0, p.hp) });
}
