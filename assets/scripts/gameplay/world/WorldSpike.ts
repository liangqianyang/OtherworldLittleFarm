import { _decorator, Component, Node, Camera, view, ResolutionPolicy, SpriteFrame, Layers, assetManager, Asset } from 'cc';
import { MAP_W, MAP_H, TILE, SPAWN, TerrainData } from './TerrainData';
import { TerrainBakeRenderer } from './TerrainBakeRenderer';
import { TerrainPoolRenderer } from './TerrainPoolRenderer';
import { SpriteLib } from '../../core/SpriteLib';
const { ccclass } = _decorator;

/**
 * T0 spike 驱动组件（world.scene Canvas）：
 * 两渲染路线 A/B 灰盒 + 烘焙计时断言 + 相机平移分块加载。
 * DEBUG 驱动（window.__spike）：
 *   spikeInfo()  —— 当前路线/块数/节点数/脏格/最近耗时
 *   spikeBench(n) —— 编辑 n 格重烘（bake）/重排（pool）耗时 ms
 *   spikeSwitch() —— bake ↔ pool 切换
 *   spikePan(dx,dy) —— 相机平移（tile 数），验证分块动态加载/释放
 */
@ccclass('WorldSpike')
export class WorldSpike extends Component {
    private _data: TerrainData | null = null;
    private _bake: TerrainBakeRenderer | null = null;
    private _pool: TerrainPoolRenderer | null = null;
    private _route: 'bake' | 'pool' = 'bake';
    private _camX = SPAWN.x;
    private _camY = SPAWN.y;
    private _cam: Camera | null = null;
    private _info: string = '';

    start(): void {
        (window as unknown as Record<string, unknown>).__spike = this;
        view.setDesignResolutionSize(1280, 720, ResolutionPolicy.FIXED_HEIGHT);

        const dataNode = new Node('__terrainData');
        this.node.addChild(dataNode);
        this._data = dataNode.addComponent(TerrainData);
        this._data.generateBaseline();

        // 相机 2×（orthoHeight 360 → 视口世界 640×360，屏上 64px/tile）
        this._cam = this.node.getChildByName('Camera')?.getComponent(Camera) || this.getComponent(Camera) || null;
        if (this._cam) { this._cam.zoomFactor = 2; }

        // 渲染容器（置于相机目标层级之下）
        const ground = new Node('GroundBake');
        ground.layer = Layers.Enum.UI_2D;
        this.node.addChild(ground);
        const poolRoot = new Node('GroundPool');
        poolRoot.layer = Layers.Enum.UI_2D;
        poolRoot.active = false;
        this.node.addChild(poolRoot);

        this._bake = ground.addComponent(TerrainBakeRenderer);
        this._bake.init(this._data, ground);
        this._pool = poolRoot.addComponent(TerrainPoolRenderer);

        // 烘焙源图（native png；SpriteFrame.texture 的 nativeUrl 为空，须回主 uuid 取 ImageAsset 的 nativeUrl）
        SpriteLib.inst.init().then(() => {
            const nativeUrlOf = (sf: SpriteFrame | null): string | null => {
                if (!sf) return null;
                const main = sf.uuid ? sf.uuid.split('@')[0] : null;
                if (!main) return null;
                const ia = assetManager.assets.get(main) as Asset | undefined;
                return ia && ia.nativeUrl ? ia.nativeUrl : null;
            };
            const g = SpriteLib.inst.get('tiles/ground_grass');
            const fo = SpriteLib.inst.get('tiles/ground_forest');
            const so = SpriteLib.inst.get('tiles/plot_soil');
            const urls: Record<number, string> = {};
            const u0 = nativeUrlOf(g); if (u0) urls[0] = u0;
            const u2 = nativeUrlOf(fo); if (u2) urls[2] = u2;
            const u1 = nativeUrlOf(so); if (u1) urls[1] = u1;
            this._bake!.loadSources(urls).then(() => {
                this._applyVisible();
                this._info = 'spike ready route=' + this._route;
                console.log('[Spike] ready, ' + JSON.stringify(this.spikeInfo()));
            });
            // 池路线帧（water 用 grass 帧替代）
            const fr: Record<number, SpriteFrame | null> = { 0: g, 2: fo, 1: so, 3: g, 4: g };
            this._pool!.init(this._data, poolRoot, fr);
        }).catch(() => { this._info = 'spike init error'; });

        this._applyVisible();
    }

    private _applyVisible(): void {
        if (this._route === 'bake') {
            const [x0, y0, x1, y1] = TerrainBakeRenderer.chunkRangeOf(this._camX, this._camY);
            this._bake!.ensureVisible(x0, y0, x1, y1);
        } else {
            this._pool!.syncVisible(this._camX - 10, this._camY - 6, this._camX + 10, this._camY + 6);
        }
        if (this._cam) {
            this._cam.node.setPosition(this._camX * TILE, -this._camY * TILE, 0);
        }
    }

    spikeInfo(): Record<string, unknown> {
        return {
            route: this._route,
            chunks: this._bake?.chunkCount ?? 0,
            poolActive: this._pool?.activeCount ?? 0,
            poolSize: this._pool?.poolSize ?? 0,
            dirty: this._data?.dirty.size ?? 0,
            lastBakeMs: Math.round((this._bake?.lastBakeMs ?? 0) * 100) / 100,
            lastSyncMs: Math.round((this._pool?.lastSyncMs ?? 0) * 100) / 100,
            cam: [this._camX, this._camY],
            info: this._info,
        };
    }

    spikeBench(n: number): Record<string, unknown> {
        const ms = this._route === 'bake' ? this._bake!.benchEdit(n) : this._pool!.benchEdit(n);
        return { route: this._route, edits: n, ms: Math.round(ms * 100) / 100 };
    }

    spikeSwitch(): string {
        this._route = this._route === 'bake' ? 'pool' : 'bake';
        const bakeRoot = this._bake!.node;
        const poolRoot = this._pool!.node;
        bakeRoot.active = this._route === 'bake';
        poolRoot.active = this._route === 'pool';
        this._applyVisible();
        return this._route;
    }

    spikePan(dx: number, dy: number): void {
        this._camX = Math.max(0, Math.min(MAP_W - 1, this._camX + dx));
        this._camY = Math.max(0, Math.min(MAP_H - 1, this._camY + dy));
        this._applyVisible();
    }
}
