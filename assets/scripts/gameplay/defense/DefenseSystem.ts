/**
 * DefenseSystem —— 封印防守夜晚状态机（M4 塔防化薄适配层）。
 *
 * 战斗数学全部在 DefenseCore（纯逻辑、可无头单测）：
 * 固定 waypoints 直线移动、四塔系、逐波门控、祭坛血量、完胜判定。
 * 本层职责：读表选波、实例化塔（存档 seal）、事件桥接（fx/音效/UI）、
 * 战利品与奖励结算、祭坛与塔的持久化、玩家挥击。
 *
 * 离线红线不变：防守只挂「睡觉」在线流程，离线绝不判定失守。
 */
import { EventBus } from '../../core/EventBus';
import { DataManager } from '../../core/DataManager';
import { GameApp } from '../../app/GameApp';
import { TimeSystem } from '../../core/TimeSystem';
import { EconomySystem } from '../../systems/EconomySystem';
import {
    CoreNight, CoreTower, ResolvedMap,
    resolveMap, makeTower, towerStatsAt, startCoreNight, beginWave, tickCoreNight,
    damageMonster, canPlace,
} from './DefenseCore';
import { SealSave } from '../../core/SaveManager';

type AnyRow = Record<string, unknown>;

export interface NightState {
    core: CoreNight;
    mapRow: AnyRow;
    tableRow: AnyRow;
    map: ResolvedMap;
    killed: number;
    /** 事件钩子（DefenseOverlay 注入）：spawn、arrive、altar_hit、bait_eat、bait_gone、pod_shot、spike_hit、kill、wave_break、wave_start、end */
    hook: ((ev: string, payload?: Record<string, unknown>) => void) | null;
}

export class DefenseSystem {
    private static _instance: DefenseSystem | null = null;
    static get inst(): DefenseSystem {
        if (!this._instance) this._instance = new DefenseSystem();
        return this._instance;
    }

    static readonly PLAYER_DMG_MIN = 4;
    static readonly PLAYER_DMG_MAX = 7;
    /** 失守次日祭坛回血值 */
    static readonly ALTAR_LOST_HP = 50;
    /** 祭坛修复到满的金币价 */
    static readonly ALTAR_REPAIR_GOLD = 20;
    /** 拆塔返还比例 */
    static readonly REFUND_RATE = 0.6;

    /** 今晚防守战实时态（null=不在防守） */
    night: NightState | null = null;
    /** 固定步长累加器（防后台切回大 dt 穿透） */
    private _acc = 0;
    private static readonly STEP = 1 / 30;

    get inNight(): boolean {
        return this.night !== null && !this.night.core.over;
    }

    // ---------- 存档 seal 段 ----------

    seal(): SealSave {
        const sd = GameApp.inst?.saveData;
        if (!sd) return { towers: [], altarHp: 100 };
        let s = sd.seal;
        if (!s || !Array.isArray(s.towers)) {
            s = { towers: [], altarHp: 100 };
            sd.seal = s;
        }
        if (typeof s.altarHp !== 'number' || !Number.isFinite(s.altarHp)) s.altarHp = 100;
        return s;
    }

    persistSeal(action: string): void {
        GameApp.inst?.persist(action);
        EventBus.inst.emit('farmChanged', { action: 'seal_changed' });
    }

    // ---------- 表选择（情报与开战同表，多表同日取 firstDay 最大） ----------

    private _pickTableRow(dayIndex = TimeSystem.inst.dayIndex): AnyRow | null {
        const nights = DataManager.inst.getRows('catalogs/defense_waves');
        const hits = nights.filter((row) => {
            const first = Number(row['firstDay'] ?? 4);
            const every = Math.max(1, Number(row['everyDays'] ?? 4) || 1);
            return dayIndex >= first && (dayIndex - first) % every === 0;
        });
        return hits.length
            ? hits.reduce((a, b) => (Number(b['firstDay'] ?? 0) > Number(a['firstDay'] ?? 0) ? b : a))
            : null;
    }

    /** 当天（正在过的这个白天）夜里有没有防守 */
    hasNightTonight(dayIndex = TimeSystem.inst.dayIndex): boolean {
        return this._pickTableRow(dayIndex) !== null;
    }

    /** 下一波防守是第几天（HUD 情报预告用；null=表里没有更晚的了） */
    nextNightDay(dayIndex = TimeSystem.inst.dayIndex): number | null {
        const nights = DataManager.inst.getRows('catalogs/defense_waves');
        let best: number | null = null;
        for (const n of nights) {
            const first = Number(n['firstDay'] ?? 4);
            const every = Math.max(1, Number(n['everyDays'] ?? 4) || 1);
            // 闭式求 >= start 的首个命中日（旧 for(;;) 在 everyDays<=0 时死循环）
            const start = Math.max(dayIndex, first);
            const d = first + Math.ceil((start - first) / every) * every;
            if (best === null || d < best) best = d;
        }
        return best;
    }

    /** 今晚来袭情报：{线路提示, 台词, 首波组成}；与 startNight 同表 */
    intelTonight(): { entranceHint: string; hint: string; comp: { monsterName: string; count: number }[] } | null {
        const n = this._pickTableRow();
        if (!n) return null;
        const monsters = DataManager.inst.getRows('catalogs/monsters');
        const w0 = ((n['waves'] ?? []) as AnyRow[][])[0] ?? [];
        const comp: { monsterName: string; count: number }[] = [];
        for (const g of w0) {
            const mid = String(g['monsterId']);
            const m = monsters.find((x) => x['id'] === mid);
            comp.push({ monsterName: String(m?.['name'] ?? mid), count: Number(g['count'] ?? 1) });
        }
        return {
            entranceHint: String(n['intel'] ? (n['intel'] as AnyRow)['entranceHint'] ?? '' : ''),
            hint: String(n['intel'] ? (n['intel'] as AnyRow)['hint'] ?? '' : ''),
            comp,
        };
    }

    // ---------- 开战 ----------

    /** 开战（BedtimeDialog 确认后调用；打完由 UI 调 settle 走真正过夜） */
    startNight(): boolean {
        if (this.night && !this.night.core.over) return false;
        const seal = this.seal();
        // 当天已结算过（含结果面板强退重进）：拒绝重打防重复刷奖励；BedtimeDialog 回落普通睡觉
        if (seal.lastSettledDay === TimeSystem.inst.dayIndex) return false;
        const tableRow = this._pickTableRow();
        if (!tableRow) return false;
        const maps = DataManager.inst.getRows('catalogs/defense_maps');
        const mapRow = maps.find((x) => x['id'] === tableRow['mapId']);
        if (!mapRow) return false;

        const metaLookup = (mid: string) => {
            const m = DataManager.inst.getRows('catalogs/monsters').find((x) => x['id'] === mid);
            if (!m) return null;
            return {
                hp: Number(m['hp'] ?? 10),
                damage: Number(m['damage'] ?? 3),
                speed: String(m['behavior']) === 'tank' ? 38 : 60,
                name: String(m['name'] ?? mid),
                slowResist: Number(m['slowResist'] ?? 0),
                baitImmune: m['baitImmune'] === true,
            };
        };

        const map = resolveMap(mapRow as unknown as Parameters<typeof resolveMap>[0]);
        const crops = DataManager.inst.getRows('catalogs/crops');
        const towers: CoreTower[] = [];
        for (const t of seal.towers) {
            const crop = crops.find((x) => x['id'] === t.cropId);
            const d = crop?.['defense'] as AnyRow | undefined;
            if (!d) continue;
            const tw = makeTower(t.cropId, d, t.cx, t.cy, Number(mapRow['cellPx']), Number(mapRow['originX']), Number(mapRow['originY']));
            if (t.lv >= 2) towerStatsAt(tw, d, Number(mapRow['cellPx']));
            towers.push(tw);
        }

        const real = startCoreNight(map, tableRow, metaLookup, towers, seal.altarHp);
        this.night = { core: real, mapRow: mapRow as AnyRow, tableRow, map, killed: 0, hook: null };
        this._acc = 0;
        beginWave(real, 0);
        EventBus.inst.emit('farmChanged', { action: 'defense_start' });
        return true;
    }

    /** 每帧推进（DefenseOverlay.update 调用） */
    tick(dt: number): void {
        const s = this.night;
        if (!s || s.core.over) return;
        this._acc = Math.min(this._acc + Math.max(0, dt), 0.25);
        while (this._acc >= DefenseSystem.STEP && !s.core.over) {
            tickCoreNight(s.core, DefenseSystem.STEP, (ev, p) => this._onCoreEvent(ev, p));
            this._acc -= DefenseSystem.STEP;
        }
    }

    private _onCoreEvent(ev: string, p?: Record<string, unknown>): void {
        const s = this.night!;
        const c = s.core;
        switch (ev) {
            case 'spawn':
                EventBus.inst.emit('farmChanged', { action: 'defense_spawn' });
                break;
            case 'arrive':
                // 漏怪=偷吃一次（击杀不回退，leak 计数已在 core）
                this._devour(String(p?.['mid'] ?? ''));
                break;
            case 'kill': {
                s.killed++;
                // 塔/玩家击杀战利品都归玩家（塔防区设计：掉落归玩家）
                this._grantRewards(String(p?.['mid'] ?? ''));
                EventBus.inst.emit('farmChanged', { action: 'defense_kill' });
                break;
            }
            case 'wave_break':
                EventBus.inst.emit('farmChanged', { action: 'defense_wave_break' });
                break;
            case 'end':
                EventBus.inst.emit('farmChanged', { action: c.won ? 'defense_win' : 'defense_end' });
                break;
            default:
                break; // altar_hit/bait_eat/bait_gone/pod_shot/spike_hit 由 hook 直达 UI
        }
        s.hook?.(ev, p);
    }

    private _grantRewards(mid: string): void {
        const app = GameApp.inst;
        const m = DataManager.inst.getRows('catalogs/monsters').find((x) => x['id'] === mid);
        for (const r of (m?.['rewards'] ?? []) as AnyRow[]) {
            const min = Number(r['min'] ?? 1), max = Number(r['max'] ?? 1);
            const cnt = min + Math.floor(Math.random() * (max - min + 1));
            if (cnt > 0) app.giveItem(String(r['itemId']), cnt);
        }
    }

    /** 漏怪惩罚：随机吃掉库存 1 份作物或 2 金币（有损失但不毁档） */
    private _devour(mid: string): void {
        const app = GameApp.inst;
        const inv = app.inventory;
        const crops = Object.keys(inv).filter(
            (k) => !k.startsWith('__') && k !== 'gold' && !k.endsWith('_seed') && (inv[k] ?? 0) > 0
        );
        const name = DataManager.inst.getRows('catalogs/monsters').find((x) => x['id'] === mid);
        const mname = String(name?.['name'] ?? '怪物');
        if (crops.length > 0) {
            const pick = crops[Math.floor(Math.random() * crops.length)];
            app.spendItem(pick, 1);
            console.log(`[Defense] ${mname} 吃掉了 ${pick} ×1！`);
        } else if ((inv['gold'] ?? 0) >= 2) {
            app.spendItem('gold', 2);
            console.log(`[Defense] ${mname} 偷走了 2 金币！`);
        } else {
            console.log(`[Defense] ${mname} 冲进封印翻了个空仓……`);
        }
        EventBus.inst.emit('farmChanged', { action: 'defense_leak' });
    }

    /** 玩家点击挥击：打中返回 'hit'|'kill'，没打中 'miss' */
    playerHit(uid: number): 'hit' | 'kill' | 'miss' {
        const s = this.night;
        if (!s || s.core.over) return 'miss';
        const mo = s.core.monsters.find((m) => m.uid === uid && m.hp > 0);
        if (!mo) return 'miss';
        const dmg = DefenseSystem.PLAYER_DMG_MIN + Math.floor(Math.random() * (DefenseSystem.PLAYER_DMG_MAX - DefenseSystem.PLAYER_DMG_MIN + 1));
        const before = mo.hp;
        damageMonster(s.core, mo, dmg, (ev, p) => this._onCoreEvent(ev, p), 'kill');
        if (before > 0 && mo.hp > 0) {
            EventBus.inst.emit('farmChanged', { action: 'defense_hit' });
            return 'hit';
        }
        return 'kill';
    }

    /** 战斗结束后的收尾：胜利发奖励/完胜加码；祭坛血量落档（失守→次日 50）。UI 结果面板确认后调用。 */
    settle(): { won: boolean; perfect: boolean; killed: number; leakA: number; leakB: number; altarHp: number } {
        const s = this.night;
        if (!s) return { won: false, perfect: false, killed: 0, leakA: 0, leakB: 0, altarHp: 0 };
        const c = s.core;
        const app = GameApp.inst;
        if (c.won && app) {
            for (const r of (s.tableRow['reward'] ?? []) as AnyRow[]) {
                const min = Number(r['min'] ?? 1), max = Number(r['max'] ?? 1);
                const cnt = min + Math.floor(Math.random() * (max - min + 1));
                if (cnt > 0) app.giveItem(String(r['itemId']), cnt);
            }
            if (c.perfect) {
                for (const r of (s.tableRow['noLeakBonus'] ?? []) as AnyRow[]) {
                    const min = Number(r['min'] ?? 1), max = Number(r['max'] ?? 1);
                    const cnt = min + Math.floor(Math.random() * (max - min + 1));
                    if (cnt > 0) app.giveItem(String(r['itemId']), cnt);
                }
            }
        }
        const seal = this.seal();
        seal.lastSettledDay = TimeSystem.inst.dayIndex;
        seal.altarHp = c.won ? c.altarHp : DefenseSystem.ALTAR_LOST_HP;
        seal.towers = c.towers.map((t) => ({ cropId: t.cropId, cx: t.cx, cy: t.cy, lv: t.lv }));
        const out = { won: c.won, perfect: c.perfect, killed: s.killed, leakA: c.leakA, leakB: c.leakB, altarHp: seal.altarHp };
        this.night = null;
        this.persistSeal('defense_settled');
        return out;
    }

    // ---------- 白天：塔建造/升级/拆除（BuildPanel 调用） ----------

    /** 放置塔：扣金币、写 seal、跨夜常驻 */
    placeTower(cropId: string, cx: number, cy: number): { ok: boolean; reason?: string } {
        const s = this.night;
        if (s) return { ok: false, reason: 'night' };
        const crop = DataManager.inst.getRows('catalogs/crops').find((x) => x['id'] === cropId);
        const d = crop?.['defense'] as AnyRow | undefined;
        if (!d) return { ok: false, reason: 'no_def' };
        const mapRow = this._mapRow();
        if (!mapRow) return { ok: false, reason: 'no_map' };
        const map = resolveMap(mapRow as unknown as Parameters<typeof resolveMap>[0]);
        const seal = this.seal();
        const cropRows = DataManager.inst.getRows('catalogs/crops');
        const towers: CoreTower[] = seal.towers.map((t) => {
            const d = cropRows.find((x) => x['id'] === t.cropId)?.['defense'] as AnyRow | undefined;
            return { cropId: t.cropId, kind: String(d?.['kind'] ?? 'slow') as CoreTower['kind'], cx: t.cx, cy: t.cy, lv: t.lv, x: 0, y: 0, rPx: 0, power: 0, interval: 0, hp: 0, cd: 0 };
        });
        const cell = cy * Number(mapRow['cols']) + cx;
        const chk = canPlace(map, towers, cell, Number(mapRow['cols']));
        if (!chk.ok) return { ok: false, reason: chk.reason };
        const gold = Number(d['buildGold'] ?? 0);
        if (!EconomySystem.inst.spendCost(GameApp.inst.inventory, [{ itemId: 'gold', count: gold }])) return { ok: false, reason: 'poor' };
        seal.towers.push({ cropId, cx, cy, lv: 1 });
        this.persistSeal('seal_place');
        return { ok: true };
    }

    /** 升级到 Lv2（crops.defense.lv2.upgradeGold） */
    upgradeTower(cx: number, cy: number): { ok: boolean; reason?: string } {
        if (this.night) return { ok: false, reason: 'night' };
        const mapRow = this._mapRow();
        const seal = this.seal();
        const t = seal.towers.find((x) => x.cx === cx && x.cy === cy);
        if (!t) return { ok: false, reason: 'no_tower' };
        if (t.lv >= 2) return { ok: false, reason: 'max' };
        const crop = DataManager.inst.getRows('catalogs/crops').find((x) => x['id'] === t.cropId);
        const d = crop?.['defense'] as AnyRow | undefined;
        if (!d || !d['lv2']) return { ok: false, reason: 'no_lv2' };
        const gold = Number((d['lv2'] as AnyRow)['upgradeGold'] ?? 0);
        if (!EconomySystem.inst.spendCost(GameApp.inst.inventory, [{ itemId: 'gold', count: gold }])) return { ok: false, reason: 'poor' };
        t.lv = 2;
        this.persistSeal('seal_upgrade');
        return { ok: true };
    }

    /** 拆塔返还 60% 建造价（夜间不可拆） */
    removeTower(cx: number, cy: number): { ok: boolean; reason?: string } {
        if (this.night) return { ok: false, reason: 'night' };
        const seal = this.seal();
        const i = seal.towers.findIndex((x) => x.cx === cx && x.cy === cy);
        if (i < 0) return { ok: false, reason: 'no_tower' };
        const t = seal.towers[i];
        const crop = DataManager.inst.getRows('catalogs/crops').find((x) => x['id'] === t.cropId);
        const d = crop?.['defense'] as AnyRow | undefined;
        if (!d) return { ok: false, reason: 'no_def' };
        const refund = Math.floor(Number(d['buildGold'] ?? 0) * DefenseSystem.REFUND_RATE);
        if (refund > 0) GameApp.inst.giveItem('gold', refund);
        seal.towers.splice(i, 1);
        this.persistSeal('seal_remove');
        return { ok: true };
    }

    /** 白天修复祭坛到满（20 金；失守次日可用） */
    repairAltar(): { ok: boolean; reason?: string } {
        if (this.night) return { ok: false, reason: 'night' };
        const seal = this.seal();
        if (seal.altarHp >= 100) return { ok: false, reason: 'full' };
        if (!EconomySystem.inst.spendCost(GameApp.inst.inventory, [{ itemId: 'gold', count: DefenseSystem.ALTAR_REPAIR_GOLD }])) return { ok: false, reason: 'poor' };
        seal.altarHp = 100;
        this.persistSeal('seal_repair');
        return { ok: true };
    }

    private _mapRow(): AnyRow | null {
        const maps = DataManager.inst.getRows('catalogs/defense_maps');
        return (maps.find((x) => x['id'] === 'seal_1') ?? null) as AnyRow | null;
    }
}
