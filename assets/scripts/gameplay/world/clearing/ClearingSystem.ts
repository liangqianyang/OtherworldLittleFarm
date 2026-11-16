import { Node } from 'cc';
import { GameApp } from '../../../app/GameApp';
import { EventBus } from '../../../core/EventBus';
import { DataManager } from '../../../core/DataManager';
import { TimeSystem } from '../../../core/TimeSystem';
import { TILE, TerrainData } from '../TerrainData';
import { Interactable } from '../interact/Interactable';
import { InteractionManager } from '../interact/InteractionManager';
import { DroppedItem } from './DroppedItem';

/**
 * ClearingSystem —— 开荒系统（M2，migration-plan §3.7）。
 *
 * 交互物件状态机：interactables.json（tree/rock/bush）→ 世界节点 + Interactable 组件。
 * hit(objId)：进度推进 → 归零倒下 → spawnDrops（磁吸入包）→ respawnDays>0 进 regrowAt / 否则 clearedIds。
 * respawn：dayAdvanced 订阅按 respawnDays 复活（含 init 时补复活到期项）。
 * 碰撞：存活期间 TerrainData.heights[tile]=1（格级阻挡），清除/复活自动还原。
 * 存档：直接读写 GameApp.saveData.world（v3 切片），persist('world_clear') 落盘。
 */
interface ObjEntry {
    row: Record<string, unknown>;
    node: Node;
    comp: Interactable | null;
}

export class ClearingSystem {
    private static _inst: ClearingSystem | null = null;
    static get inst(): ClearingSystem {
        if (!this._inst) this._inst = new ClearingSystem();
        return this._inst;
    }

    private _objs = new Map<string, ObjEntry>();
    private _root: Node | null = null;
    private _playerNode: Node | null = null;
    private _subscribed = false;
    private _inited = false;

    init(root: Node): void {
        this._root = root;
        const app = GameApp.inst;
        if (!app || !app.saveData) { console.warn('[Clearing] GameApp 未就绪'); return; }
        const world = app.saveData.world!;
        world.clearedIds = Array.isArray(world.clearedIds) ? world.clearedIds : [];
        world.regrowAt = world.regrowAt && typeof world.regrowAt === 'object' ? world.regrowAt : {};

        this._buildAll();
        this._regrowDue(TimeSystem.inst.dayIndex); // 存档里过期的复活项立即还原

        if (!this._subscribed) {
            EventBus.inst.on('dayAdvanced', this._onDayAdvanced, this);
            this._subscribed = true;
        }
        this._inited = true;
        console.log(`[Clearing] 物件 ${this._objs.size} 个（cleared ${world.clearedIds!.length} / 待复活 ${Object.keys(world.regrowAt!).length}）`);
    }

    get inited(): boolean { return this._inited; }

    /** 世界场景玩家创建后注入（掉落物磁吸目标） */
    attachPlayer(node: Node): void { this._playerNode = node; }

    private _buildAll(): void {
        const rows = DataManager.inst.getRows('catalogs/interactables');
        const terrain = TerrainData.inst;
        const world = GameApp.inst!.saveData!.world!;
        const today = TimeSystem.inst.dayIndex;
        for (const row of rows) {
            const id = String(row['id']);
            const tx = Number(row['tx']);
            const ty = Number(row['ty']);
            const node = new Node('obj_' + id);
            node.layer = this._root!.layer;
            node.setPosition((tx + 0.5) * TILE, -(ty + 0.5) * TILE, 0);
            const comp = node.addComponent(Interactable);
            comp.setup(row, this);
            this._root!.addChild(node);
            const e: ObjEntry = { row, node, comp };
            this._objs.set(id, e);

            const isCleared = world.clearedIds!.indexOf(id) >= 0;
            const regrowDay = world.regrowAt![id];
            if (isCleared || (regrowDay !== undefined && regrowDay > today)) {
                this._layDown(e); // 存档态倒下（到期复活项由 _regrowDue 还原）
            } else {
                terrain.setCell(tx, ty, terrain.get(tx, ty), 1); // 存活：占格阻挡
            }
        }
    }

    /** 交互推进（砍/采/挖共用）：hp-1 → 倒下/刷新提示 */
    hit(objId: string): 'hit' | 'fell' | 'none' {
        const e = this._objs.get(objId);
        if (!e || !e.comp || e.comp.cleared) return 'none';
        e.comp.hp -= 1;
        if (e.comp.hp <= 0) {
            this._fell(e);
            return 'fell';
        }
        e.comp.redraw();
        InteractionManager.inst.refreshPrompt();
        return 'hit';
    }

    private _fell(e: ObjEntry): void {
        const world = GameApp.inst!.saveData!.world!;
        const id = String(e.row['id']);
        e.comp!.cleared = true;
        this._layDown(e);
        // 掉落
        const wx = e.node.position.x;
        const wy = e.node.position.y;
        const drops = (e.row['drops'] as Array<{ itemId: string; min: number; max: number }>) || [];
        for (const d of drops) {
            const count = d.min + Math.floor(Math.random() * (d.max - d.min + 1));
            if (count <= 0) continue;
            const dn = new Node('drop_' + id);
            dn.layer = this._root!.layer;
            this._root!.addChild(dn);
            dn.addComponent(DroppedItem).init(d.itemId, count, this._playerNode as Node, wx + (Math.random() * 40 - 20), wy + 20);
        }
        // 复活/永久清除
        const respawnDays = Number(e.row['respawnDays'] ?? 0);
        if (respawnDays > 0) {
            world.regrowAt![id] = TimeSystem.inst.dayIndex + respawnDays;
        } else if (world.clearedIds!.indexOf(id) < 0) {
            world.clearedIds!.push(id);
        }
        InteractionManager.inst.unregister(e.comp!);
        GameApp.inst!.persist('world_clear');
        EventBus.inst.emit('farmChanged', { action: 'world_cleared' });
        console.log(`[Clearing] ${id} 倒下，掉落 ${JSON.stringify(drops.map(d => d.itemId))}`);
    }

    /** 倒下表现：隐节点+解锁格子 */
    private _layDown(e: ObjEntry): void {
        if (!e.comp) return;
        e.comp.cleared = true;
        e.node.active = false;
        const terrain = TerrainData.inst;
        const tx = Number(e.row['tx']);
        const ty = Number(e.row['ty']);
        terrain.setCell(tx, ty, terrain.get(tx, ty), 0);
    }

    /** 复活表现：显节点+占格+满血重绘 */
    private _standUp(e: ObjEntry): void {
        e.comp!.cleared = false;
        e.comp!.hp = e.comp!.maxHp;
        e.node.active = true;
        e.comp!.redraw();
        const terrain = TerrainData.inst;
        const tx = Number(e.row['tx']);
        const ty = Number(e.row['ty']);
        terrain.setCell(tx, ty, terrain.get(tx, ty), 1);
        InteractionManager.inst.register(e.comp!);
    }

    private _regrowDue(day: number): void {
        const world = GameApp.inst!.saveData!.world!;
        const regrowAt = world.regrowAt!;
        let changed = false;
        for (const id of Object.keys(regrowAt)) {
            if (day < regrowAt[id]) continue;
            delete regrowAt[id];
            const e = this._objs.get(id);
            if (e) this._standUp(e);
            changed = true;
            console.log(`[Clearing] ${id} 复活`);
        }
        if (changed) {
            GameApp.inst!.persist('world_regrow');
            EventBus.inst.emit('farmChanged', { action: 'world_regrow' });
        }
    }

    private _onDayAdvanced(payload: { dayIndex: number }): void {
        this._regrowDue(payload.dayIndex);
    }

    /** 自动化断言快照 */
    dump(): Record<string, unknown> {
        const world = GameApp.inst?.saveData?.world;
        const byId: Record<string, unknown> = {};
        this._objs.forEach((e, id) => {
            byId[id] = {
                cleared: e.comp!.cleared,
                hp: e.comp!.hp,
                active: e.node.activeInHierarchy,
                tile: [Number(e.row['tx']), Number(e.row['ty'])],
            };
        });
        return {
            inited: this._inited,
            count: this._objs.size,
            clearedIds: world?.clearedIds ?? [],
            regrowAt: world?.regrowAt ?? {},
            byId,
        };
    }
}
