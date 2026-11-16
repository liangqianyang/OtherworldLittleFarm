import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, Color } from 'cc';
import { MAP_W, MAP_H, TILE, TT, TerrainData } from './TerrainData';
const { ccclass } = _decorator;

/**
 * Sprite 池路线（terrain-system.md §8.2 备选简化版，spike A/B 的 B）：
 * 屏内 tile Sprite 池化（视口 20×11.25 → 42×25≈1050 池），出屏归还、入屏激活。
 * 注意：3 种 tile 来自 3 张独立 png（非同图集），合批上限=纹理数（3 drawcall 起）——
 * M7 auto-atlas 合并后预期 1 drawcall。spike 记录真实 drawcall 差异。
 */
@ccclass('TerrainPoolRenderer')
export class TerrainPoolRenderer extends Component {
    private _data: TerrainData | null = null;
    private _root: Node | null = null;
    private _frames: Record<number, SpriteFrame | null> = {};
    private _free: Node[] = [];
    private _active: Map<number, Node> = new Map();
    private _poolSize = 0;
    lastSyncMs = 0;
    totalSyncs = 0;

    get routeName(): string { return 'pool'; }
    get activeCount(): number { return this._active.size; }
    get poolSize(): number { return this._poolSize; }

    init(data: TerrainData, root: Node, frames: Record<number, SpriteFrame | null>): void {
        this._data = data; this._root = root;
        this._frames = frames;
    }

    private _acquire(): Node {
        if (this._free.length > 0) return this._free.pop()!;
        const n = new Node(`t${this._poolSize++}`);
        n.layer = this._root!.layer;
        n.addComponent(UITransform).setContentSize(TILE, TILE);
        const s = n.addComponent(Sprite);
        s.sizeMode = Sprite.SizeMode.CUSTOM;
        this._root!.addChild(n);
        return n;
    }

    /** 同步屏内 tile（tile 坐标范围闭区间）。 */
    syncVisible(tx0: number, ty0: number, tx1: number, ty1: number): void {
        if (!this._data || !this._root) return;
        const t0 = (performance as unknown as { now(): number }).now();
        const d = this._data;
        // 帧表未就绪（SpriteLib 未加载）时不激活任何 Sprite，防止 spriteFrame 空引用进渲染管线
        if (!this._frames || !this._frames[TT.Grass]) return;
        const need = new Set<number>();
        for (let y = Math.max(0, ty0); y <= Math.min(MAP_H - 1, ty1); y++)
            for (let x = Math.max(0, tx0); x <= Math.min(MAP_W - 1, tx1); x++) need.add(d.idx(x, y));
        for (const [gi, node] of this._active) if (!need.has(gi)) {
            node.active = false;
            this._free.push(node);
            this._active.delete(gi);
        }
        for (const gi of need) if (!this._active.has(gi)) {
            const node = this._acquire();
            const cx = d.cx(gi), cy = d.cy(gi);
            node.setPosition(cx * TILE, -cy * TILE, 0);
            const t = d.types[gi];
            const spr = node.getComponent(Sprite)!;
            spr.spriteFrame = this._frames[t] || this._frames[TT.Grass] || null;
            spr.color = t === TT.Water ? new Color(30, 60, 120, 255) : (t === TT.Sand ? new Color(214, 183, 110, 255) : Color.WHITE);
            node.active = true;
            this._active.set(gi, node);
        }
        this.lastSyncMs = (performance as unknown as { now(): number }).now() - t0;
        this.totalSyncs++;
    }

    /** 基准测试：编辑 n 格（标脏）+ 全屏重排，返回耗时 ms。 */
    benchEdit(n: number): number {
        if (!this._data) return -1;
        const d = this._data;
        const t0 = (performance as unknown as { now(): number }).now();
        for (let k = 0; k < n; k++) {
            const x = 74 + (k % 12), y = 26 + ((k / 12) | 0);
            d.setCell(x, y, d.get(x, y) === TT.Dirt ? TT.Grass : TT.Dirt);
        }
        this.syncVisible(64, 16, 84, 36);
        return (performance as unknown as { now(): number }).now() - t0;
    }
}
