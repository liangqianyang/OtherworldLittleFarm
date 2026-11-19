import { DataManager } from '../../../core/DataManager';
import { EconomySystem } from '../../../systems/EconomySystem';
import { TerrainData, TT, BUILT_TYPES } from '../TerrainData';

type AnyRow = Record<string, unknown>;

/**
 * M3 地形改造（terrain-system.md §6）：纯逻辑，无渲染/输入依赖。
 * - 工具：hoe 锄(草→土,免费) / shovel 铲(还原+返还50%) / paver 铺(陆地→石板,水面→木平台) / hammer 造桥 / stairs 台阶锹。
 * - 只在 living 庭院区生效；每次落格全量校验+EconomySystem.spendCost（不足即拒+fail 事件）。
 * - 撤销栈会话内存，容量 20，一次拖刷=一条记录，undo 全额返还。
 */
export type ToolId = 'hoe' | 'shovel' | 'paver' | 'hammer' | 'stairs';

interface UndoCell { i: number; prevType: number; prevHeight: number; }
interface UndoRec { cells: UndoCell[]; costs: { itemId: string; count: number }[]; refunds: { itemId: string; count: number }[]; }

const UNDO_CAP = 20;

export class TerrainEdit {
    private _data: TerrainData | null = null;
    private _tool: ToolId | null = null;
    private _undo: UndoRec[] = [];
    private _stroke: UndoRec | null = null;

    init(data: TerrainData): void { this._data = data; }

    get tool(): ToolId | null { return this._tool; }

    selectTool(t: ToolId | null): void {
        this._tool = t;
        this._stroke = null;   // 切工具丢弃半截笔画
    }

    costOf(tool: ToolId, onWater: boolean): { itemId: string; count: number }[] {
        let opId = '';
        if (tool === 'paver') opId = onWater ? 'pave_deck' : 'pave_stone';
        else if (tool === 'hammer') opId = 'build_bridge';
        else if (tool === 'stairs') opId = 'build_stairs';
        if (!opId) return [];
        const row = DataManager.inst.getRow('catalogs/terrain_ops', opId) as AnyRow | null;
        if (!row || !Array.isArray(row['cost'])) return [];
        return (row['cost'] as { itemId: string; count: number }[]).map(c => ({ itemId: String(c.itemId), count: Number(c.count) }));
    }

    /** 校验当前工具落在 (tx,ty) 是否合法；返回 null=合法 / 字符串=拒绝原因。 */
    validate(tx: number, ty: number): string | null {
        const d = this._data;
        if (!d || !this._tool) return '未选工具';
        if (!d.inLiving(tx, ty)) return '只能在庭院区改造';
        const t = d.get(tx, ty);
        const h = d.heights[d.idx(tx, ty)];
        switch (this._tool) {
            case 'hoe':
                return t === TT.Grass ? null : (t === TT.Dirt ? '已是泥地' : '此格不能开垦');
            case 'shovel': {
                if (!BUILT_TYPES.includes(t)) return '没有可拆除的建造';
                // V3：基线本身含石板台/预置桥/Deck（广场/码头台/主干 y40），铲到基线同类=拆不动（防刷返还）
                const b = d.baseline ? d.baseline[d.idx(tx, ty)] : -1;
                if (b === t) return '基线铺装不可拆除';
                return null;
            }
            case 'paver': {
                if (t === TT.Water) {
                    // 木平台：至少一格邻接非水（否则孤岛）
                    if (!this._hasLandNeighbor(tx, ty)) return '平台需邻接岸边';
                    return null;
                }
                if (t === TT.Forest) return '先砍掉树木';
                if (BUILT_TYPES.includes(t)) return '先铲除既有建造';
                if (t === TT.Grass || t === TT.Dirt || t === TT.Sand) return null;
                return '此格不能铺装';
            }
            case 'hammer': {
                if (t !== TT.Water) return '只能在水面造桥';
                // V3：造桥限定庭院桥区 BRIDGE_ZONE(39,38)-(42,42)，河面其余段保持景观连续
                if (!d.inBridgeZone(tx, ty)) return '只能在此河段造桥';
                if (!this._hasLandNeighbor(tx, ty) && !this._hasBridgeNeighbor(tx, ty)) return '桥需邻接岸或桥';
                return null;
            }
            case 'stairs': {
                if (t === TT.Water || t === TT.Forest || BUILT_TYPES.includes(t)) return '此格不能造台阶';
                if (h >= 3) return '高度已达上限';
                if (!this._hasDeltaOneNeighbor(tx, ty)) return '需在 1 层落差边界';
                return null;
            }
        }
        return '未知工具';
    }

    /**
     * 单格落笔（拖刷逐格调用同一入口）。成功返回 true 并记账到当前笔画。
     * inv 为玩家背包引用；材料不足/校验失败返回 false（fail 事件已由 spendCost 发出）。
     */
    applyAt(tx: number, ty: number, inv: Record<string, number>): { ok: boolean; reason?: string } {
        const d = this._data;
        if (!d) return { ok: false, reason: '地形未就绪' };
        const why = this.validate(tx, ty);
        if (why) return { ok: false, reason: why };
        const tool = this._tool!;
        const i = d.idx(tx, ty);
        const onWater = d.get(tx, ty) === TT.Water;
        const costs = this.costOf(tool, onWater);
        if (costs.length > 0 && !EconomySystem.inst.spendCost(inv, costs)) return { ok: false, reason: '材料不足' };

        const rec = this._stroke ?? { cells: [], costs: [], refunds: [] };
        if (!this._stroke) this._stroke = rec;

        const prevType = d.types[i];
        const prevHeight = d.heights[i];
        let nt = prevType, nh = prevHeight;
        switch (tool) {
            case 'hoe': nt = TT.Dirt; break;
            case 'paver': nt = onWater ? TT.Deck : TT.StonePath; break;
            case 'hammer': nt = TT.Bridge; break;
            case 'stairs': {
                nt = TT.Stairs;
                nh = this._highNeighborHeight(tx, ty);   // 台阶格高度=高层侧
                break;
            }
            case 'shovel': {
                nt = d.baseline ? d.baseline[i] : TT.Grass;
                nh = d.baselineHeights ? d.baselineHeights[i] : 0;   // 高度一并还原（R-A 幽灵高度：台阶铲除后 h≥1 孤格固化）
                // V3 基线即权威（含石板台/预置桥/Deck），直接还原；validate 已挡基线同类格
                const back = this._shovelRefund(prevType);
                EconomySystem.inst.refund(inv, back);
                for (const b of back) rec.refunds.push({ ...b });   // 撤销拆除=收回返还
                break;
            }
        }
        rec.cells.push({ i, prevType, prevHeight });
        if (tool !== 'shovel') for (const c of costs) rec.costs.push({ ...c });
        d.setCell(tx, ty, nt, nh);
        return { ok: true };
    }

    /** 拖刷开始/结束（一次拖刷=一条撤销记录） */
    beginStroke(): void { this._stroke = { cells: [], costs: [], refunds: [] }; }
    endStroke(): void {
        if (this._stroke && this._stroke.cells.length > 0) {
            this._undo.push(this._stroke);
            if (this._undo.length > UNDO_CAP) this._undo.shift();
        }
        this._stroke = null;
    }

    /** 撤销最近一笔：还原格子+全额返还建造消耗/收回拆除返还。
     *  预检：撤销拆除需收回此前返还的材料；若玩家已花掉则拒绝（避免负库存/凭空吞材料），记录留在栈上。 */
    undo(inv: Record<string, number>): boolean {
        const d = this._data;
        const rec = this._undo[this._undo.length - 1];
        if (!d || !rec) return false;
        const need: Record<string, number> = {};
        for (const r of rec.refunds) need[r.itemId] = (need[r.itemId] ?? 0) + r.count;
        for (const k of Object.keys(need)) {
            if ((inv[k] ?? 0) < need[k]) return false;
        }
        this._undo.pop();
        for (let k = rec.cells.length - 1; k >= 0; k--) {
            const c = rec.cells[k];
            d.setCell(d.cx(c.i), d.cy(c.i), c.prevType, c.prevHeight);
        }
        for (const c of rec.costs) inv[c.itemId] = (inv[c.itemId] ?? 0) + c.count;
        for (const r of rec.refunds) inv[r.itemId] = (inv[r.itemId] ?? 0) - r.count;
        return true;
    }

    get undoDepth(): number { return this._undo.length; }

    /** 铲子返还 = 原建造 cost 的 50%（向下取整），读 terrain_ops 表（terrain-system.md §6，与 UI 文案一致）。 */
    private _shovelRefund(prevType: number): { itemId: string; count: number }[] {
        let opId = '';
        if (prevType === TT.StonePath) opId = 'pave_stone';
        else if (prevType === TT.Deck) opId = 'pave_deck';
        else if (prevType === TT.Bridge) opId = 'build_bridge';
        else if (prevType === TT.Stairs) opId = 'build_stairs';
        if (!opId) return [];
        const row = DataManager.inst.getRow('catalogs/terrain_ops', opId) as AnyRow | null;
        if (!row || !Array.isArray(row['cost'])) return [];
        return (row['cost'] as { itemId: string; count: number }[])
            .map(c => ({ itemId: String(c.itemId), count: Math.floor(Number(c.count) * 0.5) }))
            .filter(c => c.count > 0);
    }

    private _neighbors(tx: number, ty: number): [number, number][] {
        return [[tx, ty - 1], [tx + 1, ty], [tx, ty + 1], [tx - 1, ty]];
    }

    private _hasLandNeighbor(tx: number, ty: number): boolean {
        const d = this._data!;
        for (const [x, y] of this._neighbors(tx, ty)) {
            const t = d.get(x, y);
            if (t !== TT.Water && t !== TT.Deck) return true;
        }
        return false;
    }

    private _hasBridgeNeighbor(tx: number, ty: number): boolean {
        const d = this._data!;
        for (const [x, y] of this._neighbors(tx, ty)) if (d.get(x, y) === TT.Bridge) return true;
        return false;
    }

    private _hasDeltaOneNeighbor(tx: number, ty: number): boolean {
        const d = this._data!;
        const h = d.heights[d.idx(tx, ty)];
        for (const [x, y] of this._neighbors(tx, ty)) {
            const nh = d.heights[d.idx(x, y)];
            if (Math.abs(nh - h) === 1) return true;
        }
        return false;
    }

    private _highNeighborHeight(tx: number, ty: number): number {
        const d = this._data!;
        const h = d.heights[d.idx(tx, ty)];
        let hi = h;
        for (const [x, y] of this._neighbors(tx, ty)) hi = Math.max(hi, d.heights[d.idx(x, y)]);
        return hi;
    }
}
