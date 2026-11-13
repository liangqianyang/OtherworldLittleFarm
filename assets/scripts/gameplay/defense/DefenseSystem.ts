import { EventBus } from '../../core/EventBus';
import { DataManager } from '../../core/DataManager';
import { GameApp } from '../../app/GameApp';
import { TimeSystem } from '../../core/TimeSystem';

type AnyRow = Record<string, unknown>;

export interface WaveSpawn {
    monsterId: string;
    count: number;
    interval: number;
    delay: number;
}

export interface NightDef {
    id: string;
    waves: WaveSpawn[];
    reward: { itemId: string; min: number; max: number }[];
}

/** 场上活体怪物（战斗实时态） */
export interface FieldMonster {
    uid: number;
    mid: string;
    name: string;
    hp: number;
    maxHp: number;
    /** 撞仓伤害（未用上，谷仓无血量：到达即漏怪） */
    damage: number;
    /** 横向速度 px/s */
    speed: number;
    /** 当前位置（设计坐标，原点居中） */
    x: number;
    y: number;
    alive: boolean;
}

export interface NightState {
    def: NightDef;
    /** 扁平化生成计划：t 秒后生成怪物表 mid（速度 speed px/s） */
    plan: { t: number; mid: string; speed: number }[];
    monsters: FieldMonster[];
    spawned: number;
    total: number;
    killed: number;
    leaked: number;
    elapsed: number;
    over: boolean;
    won: boolean;
}

/**
 * DefenseSystem —— 封印防守夜晚状态机（阶段 4 样板）。
 *
 * 节奏（§8.1 拍板）：每 everyDays 天来一波（defense_waves.json 数据驱动）；
 * 守门人情报 = FarmHUD 提前显示「下一波：第 X 天」，当晚睡前开战。
 *
 * 玩法（第一版可玩）：怪物从左缘生成 → 向右「谷仓」移动 → 玩家点击怪物挥击
 * （4-7 伤，与探险手感一致）→ 到仓=漏怪（随机吃库存作物/金币）→ 全灭=胜利入战利品。
 * 离线顺延红线（§12）：防守只挂在「睡觉」在线流程上，离线绝不判定失守。
 */
export class DefenseSystem {
    private static _instance: DefenseSystem | null = null;
    static get inst(): DefenseSystem {
        if (!this._instance) this._instance = new DefenseSystem();
        return this._instance;
    }

    static readonly SPAWN_X = -560;      // 左缘生成线
    static readonly BARN_X = 480;        // 谷仓防线
    static readonly PLAYER_DMG_MIN = 4;
    static readonly PLAYER_DMG_MAX = 7;

    /** 今晚防守战实时态（null=不在防守） */
    night: NightState | null = null;
    private _uid = 0;

    get inNight(): boolean {
        return this.night !== null && !this.night.over;
    }

    /** 当天（正在过的这个白天）夜里有没有防守 */
    hasNightTonight(dayIndex = TimeSystem.inst.dayIndex): boolean {
        const nights = DataManager.inst.getRows('catalogs/defense_waves');
        return nights.some((n) => {
            const first = Number(n['firstDay'] ?? 4);
            const every = Number(n['everyDays'] ?? 4);
            return dayIndex >= first && (dayIndex - first) % every === 0;
        });
    }

    /** 下一波防守是第几天（HUD 情报预告用；null=表里没有更晚的了） */
    nextNightDay(dayIndex = TimeSystem.inst.dayIndex): number | null {
        const nights = DataManager.inst.getRows('catalogs/defense_waves');
        let best: number | null = null;
        for (const n of nights) {
            const first = Number(n['firstDay'] ?? 4);
            const every = Number(n['everyDays'] ?? 4);
            // 从今天起找下一个触发日
            for (let d = Math.max(dayIndex, first); ; d++) {
                if (d >= first && (d - first) % every === 0) {
                    if (best === null || d < best) best = d;
                    break;
                }
            }
        }
        return best;
    }

    /** 今晚来袭情报（守门人简报：怪物名+数量；与 startNight 同表——取 firstDay 最大命中者） */
    intelTonight(): { monsterName: string; count: number }[] {
        const nights = DataManager.inst.getRows('catalogs/defense_waves');
        const d = TimeSystem.inst.dayIndex;
        const hits = nights.filter((row) => {
            const first = Number(row['firstDay'] ?? 4);
            const every = Number(row['everyDays'] ?? 4);
            return d >= first && (d - first) % every === 0;
        });
        const n = hits.length
            ? hits.reduce((a, b) => (Number(b['firstDay'] ?? 0) > Number(a['firstDay'] ?? 0) ? b : a))
            : null;
        if (!n) return [];
        const monsters = DataManager.inst.getRows('catalogs/monsters');
        const out: { monsterName: string; count: number }[] = [];
        for (const w of (n['waves'] ?? []) as AnyRow[]) {
            const mid = String(w['monsterId']);
            const m = monsters.find((x) => x['id'] === mid);
            out.push({ monsterName: String(m?.['name'] ?? mid), count: Number(w['count'] ?? 1) });
        }
        return out;
    }

    /** 开战（BedtimeDialog 确认后调用；打完由 UI 调 finishNight 走真正过夜） */
    startNight(): boolean {
        if (this.night && !this.night.over) return false;
        const nights = DataManager.inst.getRows('catalogs/defense_waves');
        const d = TimeSystem.inst.dayIndex;
        const hits = nights.filter((row) => {
            const first = Number(row['firstDay'] ?? 4);
            const every = Number(row['everyDays'] ?? 4);
            return d >= first && (d - first) % every === 0;
        });
        // 多表同日命中时取 firstDay 最大者（表越新波次越强，进化式难度）
        const n = hits.length
            ? hits.reduce((a, b) => (Number(b['firstDay'] ?? 0) > Number(a['firstDay'] ?? 0) ? b : a))
            : null;
        if (!n) return false;

        const monsters = DataManager.inst.getRows('catalogs/monsters');
        const plan: { t: number; mid: string; speed: number }[] = [];
        for (const w of (n['waves'] ?? []) as AnyRow[]) {
            const mid = String(w['monsterId']);
            const count = Number(w['count'] ?? 1);
            const interval = Number(w['interval'] ?? 1.5);
            const delay = Number(w['delay'] ?? 1.0);
            const m = monsters.find((x) => x['id'] === mid);
            const speed = m ? (String(m['behavior']) === 'tank' ? 38 : 60) : 55;
            for (let i = 0; i < count; i++) {
                plan.push({ t: delay + i * interval, mid, speed });
            }
        }
        plan.sort((a, b) => a.t - b.t);

        this.night = {
            def: {
                id: String(n['id']),
                waves: (n['waves'] ?? []) as WaveSpawn[],
                reward: (n['reward'] ?? []) as NightDef['reward'],
            },
            plan,
            monsters: [],
            spawned: 0,
            total: plan.length,
            killed: 0,
            leaked: 0,
            elapsed: 0,
            over: false,
            won: false,
        };
        EventBus.inst.emit('farmChanged', { action: 'defense_start' });
        return true;
    }

    /** 每帧推进（DefenseOverlay.update 调用；只在 FIGHT 中生效） */
    tick(dt: number): void {
        const s = this.night;
        if (!s || s.over) return;
        s.elapsed += dt;

        // 按计划生成
        while (s.plan.length > 0 && s.plan[0].t <= s.elapsed) {
            const item = s.plan.shift()!;
            const monsters = DataManager.inst.getRows('catalogs/monsters');
            const m = monsters.find((x) => x['id'] === item.mid);
            s.monsters.push({
                uid: ++this._uid,
                mid: item.mid,
                name: String(m?.['name'] ?? item.mid),
                hp: Number(m?.['hp'] ?? 10),
                maxHp: Number(m?.['hp'] ?? 10),
                damage: Number(m?.['damage'] ?? 3),
                speed: item.speed,
                x: DefenseSystem.SPAWN_X,
                y: -140 + Math.random() * 280,   // 三车道随机
                alive: true,
            });
            s.spawned++;
            EventBus.inst.emit('farmChanged', { action: 'defense_spawn' });
        }

        // 移动 + 撞仓
        for (const mo of s.monsters) {
            if (!mo.alive) continue;
            mo.x += mo.speed * dt;
            if (mo.x >= DefenseSystem.BARN_X) {
                mo.alive = false;
                s.leaked++;
                this._devour(mo);
            }
        }

        // 终局判定：全部生成完且场上无活口
        if (s.plan.length === 0 && s.monsters.every((mo) => !mo.alive)) {
            s.over = true;
            s.won = s.leaked === 0;
            EventBus.inst.emit('farmChanged', { action: s.won ? 'defense_win' : 'defense_end' });
        }
    }

    /** 玩家点击挥击：打中返回 'hit'|'kill'，没打中 'miss' */
    playerHit(uid: number): 'hit' | 'kill' | 'miss' {
        const s = this.night;
        if (!s || s.over) return 'miss';
        const mo = s.monsters.find((m) => m.uid === uid && m.alive);
        if (!mo) return 'miss';
        const dmg = DefenseSystem.PLAYER_DMG_MIN + Math.floor(Math.random() * (DefenseSystem.PLAYER_DMG_MAX - DefenseSystem.PLAYER_DMG_MIN + 1));
        mo.hp -= dmg;
        if (mo.hp <= 0) {
            mo.alive = false;
            s.killed++;
            // 击杀战利品（复用 monsters.rewards）
            const app = GameApp.inst;
            const monsters = DataManager.inst.getRows('catalogs/monsters');
            const m = monsters.find((x) => x['id'] === mo.mid);
            for (const r of (m?.['rewards'] ?? []) as AnyRow[]) {
                const min = Number(r['min'] ?? 1), max = Number(r['max'] ?? 1);
                const cnt = min + Math.floor(Math.random() * (max - min + 1));
                if (cnt > 0) app.giveItem(String(r['itemId']), cnt);
            }
            EventBus.inst.emit('farmChanged', { action: 'defense_kill' });
            return 'kill';
        }
        EventBus.inst.emit('farmChanged', { action: 'defense_hit' });
        return 'hit';
    }

    /** 漏怪惩罚：随机吃掉库存 1 份作物或 2 金币（ visibly 有损失但不毁档） */
    private _devour(mo: FieldMonster): void {
        const app = GameApp.inst;
        const inv = app.inventory;
        const crops = Object.keys(inv).filter(
            (k) => !k.startsWith('__') && k !== 'gold' && !k.endsWith('_seed') && (inv[k] ?? 0) > 0
        );
        if (crops.length > 0) {
            const pick = crops[Math.floor(Math.random() * crops.length)];
            app.spendItem(pick, 1);
            console.log(`[Defense] ${mo.name} 吃掉了 ${pick} ×1！`);
        } else if ((inv['gold'] ?? 0) >= 2) {
            app.spendItem('gold', 2);
            console.log(`[Defense] ${mo.name} 偷走了 2 金币！`);
        } else {
            console.log(`[Defense] ${mo.name} 冲进谷仓翻了个空仓……`);
        }
        EventBus.inst.emit('farmChanged', { action: 'defense_leak' });
    }

    /** 战斗结束后的收尾：胜利发奖励；由 UI 在结果面板确认后调用，之后才真正 endDay */
    settle(): { won: boolean; killed: number; leaked: number } {
        const s = this.night;
        if (!s) return { won: false, killed: 0, leaked: 0 };
        if (s.won) {
            const app = GameApp.inst;
            for (const r of s.def.reward) {
                const min = Number(r['min'] ?? 1), max = Number(r['max'] ?? 1);
                const cnt = min + Math.floor(Math.random() * (max - min + 1));
                if (cnt > 0) app.giveItem(r['itemId'], cnt);
            }
        }
        const out = { won: s.won, killed: s.killed, leaked: s.leaked };
        this.night = null;
        EventBus.inst.emit('farmChanged', { action: 'defense_settled' });
        return out;
    }
}
