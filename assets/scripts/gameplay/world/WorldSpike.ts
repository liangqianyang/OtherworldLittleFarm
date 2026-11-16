import { _decorator, Component, Node, Camera, view, ResolutionPolicy, SpriteFrame, Layers, assetManager, Asset } from 'cc';
import { MAP_W, MAP_H, TILE, SPAWN, TerrainData } from './TerrainData';
import { TerrainBakeRenderer } from './TerrainBakeRenderer';
import { TerrainPoolRenderer } from './TerrainPoolRenderer';
import { PlayerCharacter } from './PlayerCharacter';
import { JoystickController, SCREEN_UI_LAYER } from './JoystickController';
import { CameraFollow } from './CameraFollow';
import { SpriteLib } from '../../core/SpriteLib';
const { ccclass } = _decorator;

/**
 * 世界主控（T0 spike 起家，M1 加入角色/摇杆/相机跟随）：
 * 地形数据 + 双渲染路线 A/B + 烘焙计时断言 + 玩家驱动分块加载。
 * DEBUG 驱动（window.__spike）：
 *   spikeInfo()  —— 当前路线/块数/节点数/脏格/最近耗时/玩家 tile
 *   spikeBench(n) —— 编辑 n 格重烘（bake）/重排（pool）耗时 ms
 *   spikeSwitch() —— bake ↔ pool 切换
 *   spikePan(dx,dy) —— 相机平移（tile 数），验证分块动态加载/释放
 *   playerPos()   —— 玩家世界px/tile 坐标
 *   debugSetInput(x,y) —— 摇杆注入（自动化测试）
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
    private _camNode: Node | null = null;
    private _player: PlayerCharacter | null = null;
    private _info: string = '';

    start(): void {
        (window as unknown as Record<string, unknown>).__spike = this;
        view.setDesignResolutionSize(1280, 720, ResolutionPolicy.FIXED_HEIGHT);

        const dataNode = new Node('__terrainData');
        this.node.addChild(dataNode);
        this._data = dataNode.addComponent(TerrainData);
        this._data.generateBaseline();

        // 相机 2×（orthoHeight 360 → 视口世界 640×360，屏上 64px/tile）
        this._camNode = this.node.getChildByName('Camera');
        this._cam = this._camNode?.getComponent(Camera) || this.getComponent(Camera) || null;
        if (this._cam) { this._cam.zoomFactor = 2; }

        // 渲染容器（先建，保证后建的角色渲染在其上）
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

        // M1：玩家（出生点 tile 中心；必须在地面容器之后 addChild 才能渲染在其上）
        const playerNode = new Node('Player');
        playerNode.layer = Layers.Enum.UI_2D;
        playerNode.setPosition((SPAWN.x + 0.5) * TILE, -(SPAWN.y + 0.5) * TILE, 0);
        this.node.addChild(playerNode);
        this._player = playerNode.addComponent(PlayerCharacter);
        this._player.init(this._data!);

        // M1：相机跟随
        if (this._camNode) {
            this._camNode.addComponent(CameraFollow).target = playerNode;
        }

        // M1：屏幕空间 UI（摇杆）——独立 overlay 相机（SCREEN_UI 层，DEPTH_ONLY 不清颜色缓冲）
        const cam2Node = new Node('UICamera');
        cam2Node.layer = Layers.Enum.UI_2D;
        this.node.addChild(cam2Node);
        const cam2 = cam2Node.addComponent(Camera);
        cam2.projection = 1;                     // ORTHO（Camera.ProjectionType.ORTHO，规避运行时枚举绑定）
        cam2.orthoHeight = 360;
        cam2.clearFlags = 6;                     // DEPTH_ONLY = DEPTH|STENCIL（引擎源码 camera-component.ts，UI 相机标准用法）
        cam2.visibility = SCREEN_UI_LAYER;       // 1<<24 只渲染屏幕 UI
        cam2.priority = 1073741825;              // 主相机(1073741824)之后
        const joyNode = new Node('Joystick');
        this.node.addChild(joyNode);
        joyNode.addComponent(JoystickController);

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

    update(): void {
        if (this._player && this._camNode) {
            // 玩家模式：相机由 CameraFollow 驱动，这里只按实际相机位置补烘/回收块
            const cp = this._camNode.position;
            this._camX = Math.max(0, Math.min(MAP_W - 1, Math.floor(cp.x / TILE)));
            this._camY = Math.max(0, Math.min(MAP_H - 1, Math.floor(-cp.y / TILE)));
            if (this._route === 'bake') {
                const [x0, y0, x1, y1] = TerrainBakeRenderer.chunkRangeOf(this._camX, this._camY);
                this._bake!.ensureVisible(x0, y0, x1, y1);
            } else {
                this._pool!.syncVisible(this._camX - 10, this._camY - 6, this._camX + 10, this._camY + 6);
            }
        }
    }

    private _applyVisible(): void {
        if (this._route === 'bake') {
            const [x0, y0, x1, y1] = TerrainBakeRenderer.chunkRangeOf(this._camX, this._camY);
            this._bake!.ensureVisible(x0, y0, x1, y1);
        } else {
            this._pool!.syncVisible(this._camX - 10, this._camY - 6, this._camX + 10, this._camY + 6);
        }
        // 玩家模式相机交给 CameraFollow；无玩家（spikePan 调试）才直写相机
        if (this._cam && !this._player) {
            this._cam.node.setPosition(this._camX * TILE, -this._camY * TILE, 0);
        }
    }

    spikeInfo(): Record<string, unknown> {
        const p = this._player;
        return {
            route: this._route,
            chunks: this._bake?.chunkCount ?? 0,
            poolActive: this._pool?.activeCount ?? 0,
            poolSize: this._pool?.poolSize ?? 0,
            dirty: this._data?.dirty.size ?? 0,
            lastBakeMs: Math.round((this._bake?.lastBakeMs ?? 0) * 100) / 100,
            lastSyncMs: Math.round((this._pool?.lastSyncMs ?? 0) * 100) / 100,
            cam: [this._camX, this._camY],
            player: p ? [p.tileX(), p.tileY()] : null,
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

    playerPos(): Record<string, unknown> {
        if (!this._player) return { err: 'no player' };
        const p = this._player.node.position;
        return { x: Math.round(p.x), y: Math.round(p.y), tile: [this._player.tileX(), this._player.tileY()], facing: this._player.facing, walking: this._player.walking };
    }

    debugSetInput(x: number, y: number): void {
        PlayerCharacter.inst?.setInput(x, y);
    }
}
