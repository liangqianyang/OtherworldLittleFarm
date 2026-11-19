import { _decorator, Component, Node, Sprite, SpriteFrame, ImageAsset, Texture2D, UITransform, Color } from 'cc';
import { MAP_W, MAP_H, TILE, CHUNK, CHUNK_W, CHUNK_H, TT, TerrainData } from './TerrainData';
const { ccclass } = _decorator;

/** 小游戏运行时无 DOM：web 走 document，小游戏走运行时适配（tap/wx 兼容层的 createCanvas/createImage）。 */
function _createCanvas(w: number, h: number): HTMLCanvasElement {
    const d = typeof document !== 'undefined' ? document : null;
    if (d) { const c = d.createElement('canvas') as HTMLCanvasElement; c.width = w; c.height = h; return c; }
    const g = globalThis as unknown as Record<string, unknown>;
    const api = (g.wx || g.tap) as Record<string, (...a: unknown[]) => HTMLCanvasElement> | undefined;
    const c = api && api.createCanvas ? api.createCanvas() : (g.createCanvas as (...a: unknown[]) => HTMLCanvasElement)();
    c.width = w; c.height = h;
    return c;
}

function _now(): number {
    return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

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
    private _imgs: Record<number, CanvasImageSource> = {};
    private _ready = false;
    private _bakeFailedOnce = false;
    lastBakeMs = 0;
    totalBakes = 0;

    get routeName(): string { return 'bake'; }
    get chunkCount(): number { return this._chunks.size; }

    init(data: TerrainData, root: Node): void { this._data = data; this._root = root; }

    /** 注入 tile 源图（调用方传引擎已加载的 ImageAsset.data——web/小游戏端均可直接 drawImage；0.0.3 真机实证手动 new Image()+nativeUrl 相对路径在小游戏端加载失败）。 */
    setSources(sources: Record<number, CanvasImageSource | null>): void {
        const was = this._ready;
        for (const k of Object.keys(sources).map(Number)) {
            const v = sources[k];
            if (v) this._imgs[k] = v;
        }
        this._ready = true;
        // 节流窗口竞态修复：init 时若 setSources 尚未跑过，update() 里的 ensureVisible 因 _ready=false
        // 全部空转；素材就绪后没有任何触发点会补烘（PlotWorldView 有 .then(refresh) 兜底，这里此前没有）。
        if (!was && this._data && this._root) {
            this.ensureVisible(-2, -2, CHUNK_W, CHUNK_H);   // 全图范围，update 下一帧会按相机收缩
        }
    }

    private _tileSpec(t: number): { img: CanvasImageSource | null; tint: string | null; fill: string } {
        switch (t) {
            case TT.Grass: return { img: this._imgs[TT.Grass] || null, tint: null, fill: '#5da54b' };
            case TT.Forest: return { img: this._imgs[TT.Forest] || null, tint: null, fill: '#3e7d3a' };
            case TT.Dirt: return { img: this._imgs[TT.Dirt] || null, tint: null, fill: '#8b5e3c' };
            // V2：AI tile 就绪用真贴图；缺省回退草图+黄 tint（旧观感）
            case TT.Sand:
                return this._imgs[TT.Sand]
                    ? { img: this._imgs[TT.Sand], tint: null, fill: '#c9b26b' }
                    : { img: this._imgs[TT.Grass] || null, tint: 'rgba(214,183,110,0.55)', fill: '#c9b26b' };
            case TT.Water: return { img: this._imgs[TT.Water] || null, tint: null, fill: '#1e3c78' };
            // V2：石板优先 AI 鹅卵石贴图（绘制循环里程序画灰砖仅作缺省回退）
            case TT.StonePath: return { img: this._imgs[TT.StonePath] || null, tint: null, fill: '#8a8a92' };
        }
        return { img: null, tint: null, fill: '#333333' };
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
        // 真机兜底：单 chunk 烘焙失败不崩整局（该 chunk 缺席，其余照常）
        try { this._bakeChunkImpl(ci); }
        catch (e) {
            if (!this._bakeFailedOnce) {
                this._bakeFailedOnce = true;
                console.warn('[TerrainBake] chunk bake failed on this runtime:', e);
            }
        }
    }

    private _bakeChunkImpl(ci: number): void {
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
            // 锚点默认 (0.5,0.5)：position 必须是 chunk 几何中心（T0 遗留 bug：按左上角语义写，整图偏移半块 8 格）
            node.setPosition((ccx + 0.5) * CHUNK * TILE, -(ccy + 0.5) * CHUNK * TILE, 0);
            this._root!.addChild(node);
            const canvas = _createCanvas(CHUNK * TILE, CHUNK * TILE);
            ch = { node, sprite: spr, canvas, ctx: canvas.getContext('2d')!, asset: null, sf: null };
            this._chunks.set(ci, ch);
        }
        const ctx = ch.ctx;
        ctx.clearRect(0, 0, ch.canvas.width, ch.canvas.height);
        const t0 = _now();
        for (let ly = 0; ly < CHUNK; ly++) {
            for (let lx = 0; lx < CHUNK; lx++) {
                const cx = ccx * CHUNK + lx, cy = ccy * CHUNK + ly;
                const gi = d.idx(cx, cy);
                const t = d.types[gi];
                const spec = this._tileSpec(t);
                const px = lx * TILE, py = ly * TILE; // canvas y 向下：ly=0（chunk 顶行）→ py=0（canvas 顶）↔ 节点顶缘=chunk 顶。
                // ⚠ V4 修复：旧写法 (CHUNK-1-ly) 把 chunk 顶行画到 canvas 底部，而 ImageAsset(canvas) 显示不翻转，
                // 导致每个 16×16 chunk 内地形垂直镜像（slab/柱状路偏移，V3 因内容近中心对称未暴露——flip_probe 红蓝实验实证）。
                if (t === TT.StonePath && !spec.img) {
                    // 石板回退：灰底+砖缝十字（AI 贴图就绪时走 spec.img 分支）
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
                    if (t === TT.Grass) {
                        // V4 草地微变体：坐标 hash 稳定抖动（≈1/3 格轻微压暗/提亮 ±4%），消除大面积单贴图平铺感
                        const hsh = ((cx * 73856093) ^ (cy * 19349663)) >>> 0;
                        const v = hsh % 7;
                        ctx.fillStyle = v < 2 ? 'rgba(255,255,214,0.05)' : v < 4 ? 'rgba(20,60,20,0.06)' : 'rgba(20,60,20,0.03)';
                        ctx.fillRect(px, py, TILE, TILE);
                    } else if (spec.tint) {
                        ctx.fillStyle = spec.tint; ctx.fillRect(px, py, TILE, TILE);
                    }
                } else {
                    ctx.fillStyle = spec.fill;
                    ctx.fillRect(px, py, TILE, TILE);
                }
                // 变体示意：bitmask 为 0 的孤格画深色描边（验证 16 变体数据通路）；AI 贴图自带边缘，不叠加
                const m = d.bitmask(gi);
                if (m !== 15 && t !== TT.Water && !spec.img) {
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
        ch.sf.packable = false; // 禁动态图集：canvas 重烘后图集槽不回传→屏幕显示别的 chunk 旧像素（2048² 图集实测元凶）
        ch.sprite.spriteFrame = ch.sf;
        this.lastBakeMs = _now() - t0;
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
        const cxc = 24, cyc = 36;   // V2 地图基准点（草地，避开河/广场）
        const t0 = _now();
        for (let k = 0; k < n; k++) {
            const x = cxc + (k % 12), y = cyc + ((k / 12) | 0);
            d.setCell(x, y, d.get(x, y) === TT.Dirt ? TT.Grass : TT.Dirt);
        }
        this.rebakeDirty();
        return _now() - t0;
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
