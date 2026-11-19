import { EventBus } from '../../core/EventBus';
import { DataManager } from '../../core/DataManager';
import { GameApp } from '../../app/GameApp';
import { TimeSystem } from '../../core/TimeSystem';
import {
    CombatSession, CombatInput, CombatMonsterSpec, CombatWeapon,
    startCombat, spawnWave, tickCombat, COMBAT_DT,
} from '../dungeon/CombatLogic';

type AnyRow = Record<string, unknown>;

export interface RoomDef {
    idx: number;
    kind: 'entry' | 'gather' | 'fork' | 'battle' | 'elite' | 'exit';
    name: string;
    desc: string;
    spots?: { itemId: string; max: number }[];
    monster?: string;
    treasure?: { itemId: string; min: number; max: number }[];
    /** 胜利宝箱附赠武器（自动装备） */
    treasureWeapon?: string;
    next: number[];
}

/**
 * AdventureSystem —— 探险状态机（阶段 3 样板）。
 *
 * 循环（§5.2/§14 第3步）：农场出发 → 房间链游历（采集/战斗/宝箱）→ 撤回结算入农场背包。
 * 负重：背包上限 BAG_CAP 份，满了不能再采（push-your-luck 张力）。
 * 失败：战斗倒下 → 损失一半收获（向上取整），传送回农场（§7.3 损失规则样板）。
 * 体力：玩家 HP 样板值 20，回农场满血重置；倒下不清 dayIndex。
 *
 * 房间数据来自 catalogs/adventure_rooms.json（固定链+岔路 next[]，样板取 next[0]，
 * 岔路房间由 UI 提供 choice 参数）。
 */
export class AdventureSystem {
    private static _instance: AdventureSystem | null = null;
    static get inst(): AdventureSystem {
        if (!this._instance) this._instance = new AdventureSystem();
        return this._instance;
    }

    static readonly BAG_CAP = 10;
    static readonly PLAYER_MAX_HP = 20;

    /** 本次探险状态（null=不在探险中） */
    run: {
        mapId: string;
        roomIdx: number;
        bag: Record<string, number>;
        bagCount: number;
        playerHp: number;
        /** 当前武器（缺省 wood_sword；精英宝箱可升级） */
        weaponId?: string;
        /** 采集点已采次数（key=roomIdx:spotIdx，对照 spot.max） */
        emptied: Map<string, number>;
    } | null = null;

    /** 当前实时战斗会话（null=不在战斗；M5 元气骑士式） */
    combat: CombatSession | null = null;
    /** 战斗输入（DungeonOverlay 填充） */
    combatInput: CombatInput = { mx: 0, my: 0, attack: false, roll: false };
    private _combatAcc = 0;

    get inRun(): boolean {
        return this.run !== null;
    }

    get inCombat(): boolean {
        return this.combat !== null && !this.combat.over;
    }

    /** 出发：按 mapId 初始化 run，落到 idx=0 入口房 */
    start(mapId = 'old_wood'): void {
        const maps = DataManager.inst.getRows('catalogs/adventure_rooms');
        const map = maps.find((m) => m['id'] === mapId);
        if (!map) {
            console.warn(`[Adventure] 找不到地图 ${mapId}`);
            return;
        }
        this.run = {
            mapId,
            roomIdx: 0,
            bag: {},
            bagCount: 0,
            playerHp: AdventureSystem.PLAYER_MAX_HP,
            emptied: new Map<string, number>(),
        };
        this.combat = null;
        EventBus.inst.emit('farmChanged', { action: 'adventure_start' }); // 复用刷新信号
    }

    room(idx = this.run?.roomIdx ?? -1): RoomDef | null {
        if (!this.run || idx < 0) return null;
        const maps = DataManager.inst.getRows('catalogs/adventure_rooms');
        const map = maps.find((m) => m['id'] === this.run!.mapId);
        const rooms = (map?.['rooms'] as RoomDef[] | undefined) ?? [];
        return rooms.find((r) => r.idx === idx) ?? null;
    }

    /** 采集一个点（已采满 spot.max 拒绝；负重满拒绝） */
    gather(roomIdx: number, spotIdx: number): string | null {
        const run = this.run;
        const room = this.room(roomIdx);
        if (!run || !room?.spots) return null;
        const spot = room.spots[spotIdx];
        if (!spot) return null;
        const key = `${roomIdx}:${spotIdx}`;
        const taken = run.emptied.get(key) ?? 0;
        if (taken >= (Number(spot['max'] ?? 1))) return null;
        if (run.bagCount >= AdventureSystem.BAG_CAP) return null;
        run.bag[spot.itemId] = (run.bag[spot.itemId] ?? 0) + 1;
        run.bagCount += 1;
        run.emptied.set(key, taken + 1);
        EventBus.inst.emit('farmChanged', { action: 'adventure_gather' });
        return spot.itemId;
    }

    spotEmptied(roomIdx: number, spotIdx: number): boolean {
        const run = this.run;
        if (!run) return true;
        const spot = this.room(roomIdx)?.spots?.[spotIdx];
        const taken = run.emptied.get(`${roomIdx}:${spotIdx}`) ?? 0;
        return taken >= (Number(spot?.['max'] ?? 1));
    }

    /** 进入实时战斗（战斗房/精英房）：monsters 表行 → CombatSpec → CombatSession */
    startBattle(): void {
        const room = this.room();
        if (!this.run || !room?.monster || this.combat) return;
        const def = DataManager.inst.getRow('catalogs/monsters', room.monster);
        if (!def) return;
        // 精英判定数据驱动：monsters 表 elite 字段优先；缺字段才退回 id 启发式（兼容旧表）
        const isElite = def['elite'] !== undefined ? def['elite'] === true : String(def['id']).includes('elite');
        const spec: CombatMonsterSpec = {
            mid: String(def['id']),
            name: String(def['name'] ?? def['id']),
            hp: Number(def['hp'] ?? 10),
            damage: Number(def['damage'] ?? 2),
            speed: String(def['behavior']) === 'tank' ? 38 : 60,
            behavior: (String(def['dungeonBehavior'] ?? def['behavior']) as CombatMonsterSpec['behavior']),
            fireInterval: def['fireInterval'] !== undefined ? Number(def['fireInterval']) : undefined,
            bulletSpeed: def['bulletSpeed'] !== undefined ? Number(def['bulletSpeed']) : undefined,
            radius: Number(def['radius'] ?? (isElite ? 26 : 20)),
            elite: isElite,
        };
        const weapon = this._weapon();
        this.combat = startCombat(960, 576, weapon, this.run.playerHp, AdventureSystem.PLAYER_MAX_HP);
        spawnWave(this.combat, [spec], () => {});
        this._combatAcc = 0;
        EventBus.inst.emit('farmChanged', { action: 'adventure_combat_start' });
    }

    /** 武器表行 → CombatWeapon（run.weaponId 缺省木剑） */
    private _weapon(): CombatWeapon {
        const wid = String(this.run?.weaponId ?? 'wood_sword');
        const w = DataManager.inst.getRow('catalogs/weapons', wid);
        return {
            id: String(w?.['id'] ?? 'wood_sword'),
            name: String(w?.['name'] ?? '木剑'),
            kind: String(w?.['kind'] ?? 'melee') as CombatWeapon['kind'],
            damage: Number(w?.['damage'] ?? 4),
            interval: Number(w?.['interval'] ?? 0.5),
            range: Number(w?.['range'] ?? 80),
            arcDeg: w?.['arcDeg'] !== undefined ? Number(w['arcDeg']) : undefined,
            bulletSpeed: w?.['bulletSpeed'] !== undefined ? Number(w['bulletSpeed']) : undefined,
            blockBullets: w?.['blockBullets'] === true,
        };
    }

    /** 每帧推进战斗（DungeonOverlay.update 调用；内部按 1/30 固定步泵） */
    tickCombat(dt: number): void {
        const c = this.combat;
        if (!c) return;
        this._combatAcc += Math.min(dt, 0.25);
        while (this._combatAcc >= COMBAT_DT && this.combat && !this.combat.over) {
            this._combatAcc -= COMBAT_DT;
            tickCombat(this.combat, this.combatInput, (ev) => this._onCombatEvent(ev));
        }
        if (this.combat) this.run!.playerHp = Math.max(0, Math.round(this.combat.player.hp));
        if (c.over) this._finishCombat();
    }

    private _onCombatEvent(ev: string): void {
        if (ev === 'hurt_p') EventBus.inst.emit('farmChanged', { action: 'adventure_hurt' });
        else if (ev === 'die') EventBus.inst.emit('farmChanged', { action: 'adventure_kill' });
    }

    /** 战斗收尾：胜利掠夺（战利品+宝箱）/失败减半结算 */
    private _finishCombat(): void {
        const c = this.combat;
        if (!c || !this.run) return;
        if (c.won) {
            const room = this.room();
            const def = room?.monster ? DataManager.inst.getRow('catalogs/monsters', room.monster) : null;
            const rewards = (def?.['rewards'] as { itemId: string; min: number; max: number }[]) ?? [];
            for (const r of rewards) {
                const n = r.min + Math.floor(Math.random() * (r.max - r.min + 1));
                for (let i = 0; i < n; i++) {
                    if (this.run.bagCount >= AdventureSystem.BAG_CAP) break;
                    this.run.bag[r.itemId] = (this.run.bag[r.itemId] ?? 0) + 1;
                    this.run.bagCount += 1;
                }
            }
            if (room?.treasure) {
                // 宝箱与战利品同一套负重规则：逐件入包 + BAG_CAP 检查 + bagCount 计数
                // （旧实现整批塞入不计数，负重 UI 失真且可无限超 cap）
                for (const t of room.treasure) {
                    const n = t.min + Math.floor(Math.random() * (t.max - t.min + 1));
                    for (let i = 0; i < n; i++) {
                        if (this.run.bagCount >= AdventureSystem.BAG_CAP) break;
                        this.run.bag[t.itemId] = (this.run.bag[t.itemId] ?? 0) + 1;
                        this.run.bagCount += 1;
                    }
                }
            }
            // 宝箱武器拾取（treasureWeapon → 自动装备，run 级换枪）
            const tw = room?.treasureWeapon;
            if (tw) {
                this.run.weaponId = tw;
                EventBus.inst.emit('farmChanged', { action: 'weapon_upgraded', itemId: tw });
            }
            this.combat = null;
            EventBus.inst.emit('farmChanged', { action: 'adventure_win' });
        } else {
            this.combat = null;
            this._onDefeat();
        }
    }

    /** 撤退战斗（留原房可再战，血量保留至少 1） */
    fleeCombat(): void {
        if (!this.combat) return;
        this.run!.playerHp = Math.max(1, Math.round(this.combat.player.hp));
        this.combat = null;
        EventBus.inst.emit('farmChanged', { action: 'adventure_flee' });
    }

    /** 战斗倒下：损失一半收获（向上取整），回农场（§7.3） */
    private _onDefeat(): void {
        const run = this.run;
        if (!run) return;
        this.combat = null;
        for (const id of Object.keys(run.bag)) {
            run.bag[id] = Math.ceil(run.bag[id] / 2);
        }
        this.settle();
        EventBus.inst.emit('farmChanged', { action: 'adventure_defeat' });
    }

    /** 前进到 next[0]（岔路房 UI 传 choice） */
    advance(choice = 0): void {
        if (!this.run) return;
        const room = this.room();
        const nextList = room?.next ?? [];
        const target = nextList[Math.min(choice, nextList.length - 1)];
        if (target === undefined) return;
        this.run.roomIdx = target;
        const next = this.room();
        if (next?.kind === 'battle' || next?.kind === 'elite') this.startBattle();
        EventBus.inst.emit('farmChanged', { action: 'adventure_move' });
    }

    /**
     * 撤回/结算：探险包并入农场背包，探险状态清空。
     * 走 GameApp.giveItem 走正式背包通道（触发 itemGained）。
     */
    settle(): void {
        const run = this.run;
        const app = GameApp.inst;
        if (!run || !app) return;
        for (const [id, n] of Object.entries(run.bag)) {
            if (n > 0) app.giveItem(id, n);
        }
        // 样板：探险本身也消耗一天（回农场已是新的一天，作物结算走 bedtime 链路）
        TimeSystem.inst.endDay();
        app.persist('adventure_settle');
        this.run = null;
        this.combat = null;
        EventBus.inst.emit('farmChanged', { action: 'adventure_settled' });
    }
}
