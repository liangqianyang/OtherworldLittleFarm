import { EventBus } from '../../core/EventBus';
import { DataManager } from '../../core/DataManager';
import { GameApp } from '../../app/GameApp';
import { TimeSystem } from '../../core/TimeSystem';

type AnyRow = Record<string, unknown>;

export interface RoomDef {
    idx: number;
    kind: 'entry' | 'gather' | 'fork' | 'battle' | 'elite' | 'exit';
    name: string;
    desc: string;
    spots?: { itemId: string; max: number }[];
    monster?: string;
    treasure?: { itemId: string; min: number; max: number }[];
    next: number[];
}

export interface BattleState {
    monsterId: string;
    monsterName: string;
    hp: number;
    maxHp: number;
    damage: number;
    playerHp: number;
    playerMaxHp: number;
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
        /** 已清空采集点的记录（roomIdx:spotIdx） */
        emptied: Set<string>;
    } | null = null;

    /** 当前战斗（null=不在战斗） */
    battle: BattleState | null = null;

    get inRun(): boolean {
        return this.run !== null;
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
            emptied: new Set<string>(),
        };
        this.battle = null;
        EventBus.inst.emit('farmChanged', { action: 'adventure_start' }); // 复用刷新信号
    }

    room(idx = this.run?.roomIdx ?? -1): RoomDef | null {
        if (!this.run || idx < 0) return null;
        const maps = DataManager.inst.getRows('catalogs/adventure_rooms');
        const map = maps.find((m) => m['id'] === this.run!.mapId);
        const rooms = (map?.['rooms'] as RoomDef[] | undefined) ?? [];
        return rooms.find((r) => r.idx === idx) ?? null;
    }

    /** 采集一个点（roomIdx:spotIdx 已采过则拒绝；负重满拒绝） */
    gather(roomIdx: number, spotIdx: number): string | null {
        const run = this.run;
        const room = this.room(roomIdx);
        if (!run || !room?.spots) return null;
        const key = `${roomIdx}:${spotIdx}`;
        if (run.emptied.has(key)) return null;
        if (run.bagCount >= AdventureSystem.BAG_CAP) return null;
        const spot = room.spots[spotIdx];
        if (!spot) return null;
        run.bag[spot.itemId] = (run.bag[spot.itemId] ?? 0) + 1;
        run.bagCount += 1;
        run.emptied.add(key);
        EventBus.inst.emit('farmChanged', { action: 'adventure_gather' });
        return spot.itemId;
    }

    spotEmptied(roomIdx: number, spotIdx: number): boolean {
        return this.run?.emptied.has(`${roomIdx}:${spotIdx}`) ?? true;
    }

    /** 进入战斗（战斗房/精英房） */
    startBattle(): void {
        const room = this.room();
        if (!this.run || !room?.monster) return;
        const def = DataManager.inst.getRow('catalogs/monsters', room.monster);
        if (!def) return;
        const hp = Number(def['hp'] ?? 10);
        this.battle = {
            monsterId: String(def['id']),
            monsterName: String(def['name'] ?? def['id']),
            hp,
            maxHp: hp,
            damage: Number(def['damage'] ?? 2),
            playerHp: this.run.playerHp,
            playerMaxHp: AdventureSystem.PLAYER_MAX_HP,
        };
    }

    /**
     * 玩家攻击一次。样板公式：玩家 4~7 随机伤害，怪物每回合反伤 damage（玩家闪避 25%）。
     * 返回 'hit' | 'win' | 'lose'。
     */
    playerAttack(): 'hit' | 'win' | 'lose' {
        const b = this.battle;
        if (!b || !this.run) return 'hit';
        b.hp -= 4 + Math.floor(Math.random() * 4);
        if (b.hp <= 0) {
            // 战利品入包（受负重限制，超出丢弃并提示）
            const def = DataManager.inst.getRow('catalogs/monsters', b.monsterId);
            const rewards = (def?.['rewards'] as { itemId: string; min: number; max: number }[]) ?? [];
            for (const r of rewards) {
                const n = r.min + Math.floor(Math.random() * (r.max - r.min + 1));
                for (let i = 0; i < n; i++) {
                    if (this.run.bagCount >= AdventureSystem.BAG_CAP) break;
                    this.run.bag[r.itemId] = (this.run.bag[r.itemId] ?? 0) + 1;
                    this.run.bagCount += 1;
                }
            }
            // 精英房附带宝箱
            const room = this.room();
            if (room?.treasure) {
                for (const t of room.treasure) {
                    const n = t.min + Math.floor(Math.random() * (t.max - t.min + 1));
                    this.run.bag[t.itemId] = (this.run.bag[t.itemId] ?? 0) + n;
                }
            }
            this.battle = null;
            EventBus.inst.emit('farmChanged', { action: 'adventure_win' });
            return 'win';
        }
        // 怪物反击（25% 闪避）
        if (Math.random() >= 0.25) {
            b.playerHp -= b.damage;
            this.run.playerHp = b.playerHp;
            if (b.playerHp <= 0) {
                this._onDefeat();
                return 'lose';
            }
        }
        return 'hit';
    }

    /** 战斗倒下：损失一半收获（向上取整），回农场（§7.3） */
    private _onDefeat(): void {
        const run = this.run;
        if (!run) return;
        this.battle = null;
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
        this.battle = null;
        EventBus.inst.emit('farmChanged', { action: 'adventure_settled' });
    }
}
