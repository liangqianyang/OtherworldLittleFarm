import { _decorator, Component, Node, Sprite, SpriteFrame, ImageAsset, Texture2D, UITransform, Color } from 'cc';
import { MAP_W, MAP_H, TILE, CHUNK, CHUNK_W, CHUNK_H, TT, TerrainData } from './TerrainData';
const { ccclass } = _decorator;

/**
 * 烘焙路线渲染器（terrain-system.md §8.2 GroundLayer）：
 * 每 chunk(16×16 格) 1 节点 1 Sprite；离屏 canvas 逐格 drawImage → ImageAsset(canvas) → SpriteFrame。
 * spike 目的：验证 canvas→纹理管线 + 编辑重烘 <5ms + 分块动态加载。
 * 素材映射：Grass→ground_grass / Forest→ground_forest / Dirt→plot_soil / Sand→grass+黄罩 / Water→纯色块。
 */
@ccclass('TerrainBakeRenderer')
export class TerrainBakeRenderer extends Component {
    private _data: TerrainData | null = null;
    private _root: Node | null = null;
    private _chunks: Map<number, { node: Node; sprite: Sprite; canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; asset: ImageAsset | null; sf: SpriteFrame | null }> = new Map();
    private _imgs: Record<number, HTMLImageElement> = {};
    private _ready = false;
    lastBakeMs = 0;
    totalBakes = 0;

    get routeName(): string { return 'bake'; }
    get chunkCount(): number { return this._chunks.size; }

    init(data: TerrainData, root: Node): void { this._data = data; this._root = root; }

    /** 预载 tile 源图（web=SpriteLib 帧的 nativeUrl；此处独立加载避免依赖 bundle 就绪时序）。 */
    loadSources(urls: Record<number, string>): Promise<void> {
        const keys = Object.keys(urls).map(Number);
        return Promise.all(keys.map(k => new Promise<void>(res => {
            const img = new Image();
            img.onload = () => { this._imgs[k] = img; res(); };
            img.onerror = () => res();
            img.src = urls[k];
        }))).then(() => { this._ready = true; });
    }

    private _tileSpec(t: number): { img: HTMLImageElement | null; tint: string | null } {
        switch (t) {
            case TT.Grass: return { img: this._imgs[TT.Grass] || null, tint: null };
            case TT.Forest: return { img: this._imgs[TT.Forest] || null, tint: null };
            case TT.Dirt: return { img: this._imgs[TT.Dirt] || null, tint: null };
            case TT.Sand: return { img: this._imgs[TT.Grass] || null, tint: 'rgba(214,183,110,0.55)' };
            case TT.Water: return { img: null, tint: '#1e3c78' };
        }
        return { img: null, tint: '#333333' };
    }

    /** 确保视口（chunk 坐标 cx0..cx1/cy0..cy1）内 chunk 已烘焙，出屏释放。 */
    ensureVisible(ccx0: number, ccy0: number, ccx1: number, ccy1: number): void {
        if (!this._data || !this._root || !this._ready) return;
        const need = new Set<number>();
        for (let cy = Math.max(0, ccy0); cy <= Math.min(CHUNK_H - 1, ccy1); cy++)
            for (let cx = Math.max(0, ccx0); cx <= Math.min(CHUNK_W - 1, ccx1); cx++) need.add(cy * CHUNK_W + cx);
        // 释放出屏
        for (const [ci, ch] of this._chunks) if (!need.has(ci)) {
            ch.node.destroy();
            if (ch.sf) ch.sf.destroy();
            if (ch.asset) ch.asset.destroy();
            this._chunks.delete(ci);
        }
        // 烘焙缺失
        for (const ci of need) if (!this._chunks.has(ci)) this._bakeChunk(ci);
    }

    private _bakeChunk(ci: number): void {
        const d = this._data!;
        const ccx = ci % CHUNK_W, ccy = (ci / CHUNK_W) | 0;
        let ch = this._chunks.get(ci);
        if (!ch) {
            const node = new Node(`chunk_${ccx}_${ccy}`);
            node.layer = this._root!.layer;
            const ut = node.addComponent(UITransform);
            ut.setContentSize(CHUNK * TILE, CHUNK * TILE);
            const spr = node.addComponent(Sprite);
            spr.sizeMode = Sprite.SizeMode.CUSTOM;
            node.setPosition(ccx * CHUNK * TILE, -ccy * CHUNK * TILE, 0);
            this._root!.addChild(node);
            const canvas = document.createElement('canvas');
            canvas.width = CHUNK * TILE; canvas.height = CHUNK * TILE;
            ch = { node, sprite: spr, canvas, ctx: canvas.getContext('2d')!, asset: null, sf: null };
            this._chunks.set(ci, ch);
        }
        const ctx = ch.ctx;
        ctx.clearRect(0, 0, ch.canvas.width, ch.canvas.height);
        const t0 = (performance as unknown as { now(): number }).now();
        for (let ly = 0; ly < CHUNK; ly++) {
            for (let lx = 0; lx < CHUNK; lx++) {
                const cx = ccx * CHUNK + lx, cy = ccy * CHUNK + ly;
                const gi = d.idx(cx, cy);
                const t = d.types[gi];
                const spec = this._tileSpec(t);
                const px = lx * TILE, py = (CHUNK - 1 - ly) * TILE; // canvas y 向下，tile y 向上
                if (t === TT.StonePath) {
                    // 石板：灰底+砖缝十字
                    ctx.fillStyle = '#8a8a92'; ctx.fillRect(px, py, TILE, TILE);
                    ctx.strokeStyle = 'rgba(60,60,66,0.8)';
                    ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
                    ctx.beginPath(); ctx.moveTo(px + TILE / 2, py); ctx.lineTo(px + TILE / 2, py + TILE); ctx.stroke();
                } else if (t === TT.Bridge) {
                    // 木桥：棕底+横板条
                    ctx.fillStyle = '#7a5a38'; ctx.fillRect(px, py, TILE, TILE);
                    ctx.fillStyle = 'rgba(52,38,24,0.6)';
                    ctx.fillRect(px, py + 10, TILE, 2); ctx.fillRect(px, py + 21, TILE, 2);
                } else if (t === TT.Stairs) {
                    // 台阶：土底+斜坡纹（一眼是坡）
                    ctx.fillStyle = '#6b4a2e'; ctx.fillRect(px, py, TILE, TILE);
                    ctx.fillStyle = 'rgba(242,193,78,0.5)';
                    ctx.fillRect(px, py, TILE, 3);
                    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
                    ctx.beginPath(); ctx.moveTo(px + 4, py + TILE - 4); ctx.lineTo(px + TILE - 8, py + 6); ctx.stroke();
                } else if (t === TT.Deck) {
                    // 木平台：浅棕+纵板条
                    ctx.fillStyle = '#96744c'; ctx.fillRect(px, py, TILE, TILE);
                    ctx.fillStyle = 'rgba(52,38,24,0.5)';
                    ctx.fillRect(px + 10, py, 2, TILE); ctx.fillRect(px + 21, py, 2, TILE);
                } else if (spec.img) {
                    ctx.drawImage(spec.img, px, py, TILE, TILE);
                    if (spec.tint) { ctx.fillStyle = spec.tint; ctx.fillRect(px, py, TILE, TILE); }
                } else {
                    ctx.fillStyle = spec.tint || '#333';
                    ctx.fillRect(px, py, TILE, TILE);
                }
                // 变体示意：bitmask 为 0 的孤格画深色描边（验证 16 变体数据通路）
                const m = d.bitmask(gi);
                if (m !== 15 && t !== TT.Water) {
                    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
                    ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
                }
            }
        }
        // 旧帧释放 → 新帧（正规 Texture2D 管线，imageAsset 直赋不走渲染上传会崩 getHash）
        if (ch.sf) { ch.sprite.spriteFrame = null; ch.sf.destroy(); ch.sf = null; }
        if (ch.asset) { ch.asset.destroy(); ch.asset = null; }
        ch.asset = new ImageAsset(ch.canvas);
        const tex = new Texture2D();
        tex.image = ch.asset;
        ch.sf = new SpriteFrame();
        ch.sf.texture = tex;
        ch.sprite.spriteFrame = ch.sf;
        this.lastBakeMs = (performance as unknown as { now(): number }).now() - t0;
        this.totalBakes++;
    }

    /** 帧末重烘脏格所在 chunk（拖刷合并到一次）。 */
    rebakeDirty(): void {
        if (!this._data) return;
        const d = this._data;
        if (d.dirty.size === 0) return;
        const chunks = new Set<number>();
        for (const gi of d.dirty) {
            const cx = d.cx(gi), cy = d.cy(gi);
            chunks.add(((cy / CHUNK) | 0) * CHUNK_W + ((cx / CHUNK) | 0));
        }
        d.dirty.clear();
        for (const ci of chunks) if (this._chunks.has(ci)) this._bakeChunk(ci);
    }

    /** 基准测试：编辑 n 格并重烘，返回耗时 ms。 */
    benchEdit(n: number): number {
        if (!this._data) return -1;
        const d = this._data;
        const cxc = 74, cyc = 26;
        const t0 = (performance as unknown as { now(): number }).now();
        for (let k = 0; k < n; k++) {
            const x = cxc + (k % 12), y = cyc + ((k / 12) | 0);
            d.setCell(x, y, d.get(x, y) === TT.Dirt ? TT.Grass : TT.Dirt);
        }
        this.rebakeDirty();
        return (performance as unknown as { now(): number }).now() - t0;
    }

    /** 视口中心（tile 坐标）→ 需要的 chunk 范围（+1 chunk 裕量）。 */
    static chunkRangeOf(camCx: number, camCy: number): [number, number, number, number] {
        const halfW = 10, halfH = 6; // 视口 20×11.25 tile
        return [
            ((camCx - halfW) / CHUNK | 0) - 1, ((camCy - halfH) / CHUNK | 0) - 1,
            ((camCx + halfW) / CHUNK | 0) + 1, ((camCy + halfH) / CHUNK | 0) + 1,
        ];
    }
}
