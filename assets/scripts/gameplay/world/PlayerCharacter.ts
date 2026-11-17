import { _decorator, Component, Graphics, Color, Layers, Sprite, SpriteFrame, assetManager, UITransform, Node } from 'cc';
import { TILE, TerrainData, TT } from './TerrainData';
import { SpriteLib } from '../../core/SpriteLib';
const { ccclass } = _decorator;

/**
 * 玩家角色（M1，灰盒→1.0 AI 素材）：动态摇杆驱动 + 脚底圆碰撞 + 轴分离贴墙滑行。
 * 依据 character-control.md：脚底圆 r=20 art px、步行 4 格/s、移动读 TerrainData 阻挡。
 * 坐标约定与世界一致：world px = (tileX*32, -tileY*32)，node.position = 脚底点。
 * 表现：SpriteLib 就绪后挂 characters/player_down 贴图（四向帧素材后续接入），色块兜底。
 */
@ccclass('PlayerCharacter')
export class PlayerCharacter extends Component {
    private static _inst: PlayerCharacter | null = null;
    static get inst(): PlayerCharacter | null { return PlayerCharacter._inst; }

    private _terrain: TerrainData | null = null;
    private _inX = 0;
    private _inY = 0;
    speed = 128;          // 4 格/s × 32px
    radius = 20;          // 脚底碰撞圆（art px）
    facing = 1;           // 1 右 / -1 左
    walking = false;

    private _g: Graphics | null = null;
    private _faceDot: Graphics | null = null;
    private _artNode: Node | null = null;
    private _spr: Sprite | null = null;
    private _artTries = 0;

    onLoad(): void {
        this.node.layer = Layers.Enum.UI_2D;
        PlayerCharacter._inst = this;
    }

    onDestroy(): void { if (PlayerCharacter._inst === this) PlayerCharacter._inst = null; }

    init(terrain: TerrainData): void {
        this._terrain = terrain;
        this._g = this.node.addComponent(Graphics);
        this._faceDot = this.node.addComponent(Graphics);
        this._redraw();
        this._trySprite();
    }

    /** AI 素材接入：SpriteLib 就绪后在子节点挂贴图（根节点 position=脚底碰撞点，不可挪动）。未就绪轮询重试（~20s 放弃走色块）。 */
    private _trySprite(): void {
        if (this._artNode) return;
        const f = SpriteLib.inst.get('characters/player_down');
        if (!f) {
            if (++this._artTries <= 40) this.scheduleOnce(() => this._trySprite(), 0.5);
            return;
        }
        const n = new Node('player_art');
        n.layer = this.node.layer;
        n.addComponent(UITransform).setContentSize(44, 44);
        const sp = n.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM; // 必须先 CUSTOM：RAW/TRIMMED 赋帧会把 UITransform 重置回图片原始 32px
        sp.spriteFrame = f;
        n.getComponent(UITransform)!.setContentSize(44, 44);
        n.setPosition(0, 24, 0);            // 脚底点→身体中心
        this.node.addChild(n);
        this._artNode = n;
        this._spr = sp;
        if (this._g) this._g.clear();
        if (this._faceDot) this._faceDot.clear();
    }

    /** 行走朝向切帧（down 常驻 / up 上行 / right 水平±翻转） */
    private _artFrame(): void {
        if (!this._spr) return;
        let key = 'characters/player_down';
        let fx = 1;
        if (this._inY > 0.05) key = 'characters/player_up';
        else if (Math.abs(this._inX) > 0.05) { key = 'characters/player_right'; fx = this._inX > 0 ? 1 : -1; }
        const f = SpriteLib.inst.get(key);
        if (f && f !== this._spr.spriteFrame) this._spr.spriteFrame = f;
        this._artNode!.setScale(fx, 1, 1);
    }

    /** 归一化输入（摇杆/调试写入）；模长>1 归一。 */
    setInput(x: number, y: number): void {
        const l = Math.hypot(x, y);
        if (l > 1) { x /= l; y /= l; }
        this._inX = x; this._inY = y;
    }

    update(dt: number): void {
        if (!this._terrain) return;
        this.walking = this._inX !== 0 || this._inY !== 0;
        const p = this.node.position;
        const dx = this._inX * this.speed * dt;
        const dy = this._inY * this.speed * dt;
        // 轴分离：先 x 后 y，撞则放弃该轴（贴墙滑行）
        if (dx !== 0 && !this._collide(p.x + dx, p.y)) this.node.setPosition(p.x + dx, p.y, 0);
        const p2 = this.node.position;
        if (dy !== 0 && !this._collide(p2.x, p2.y + dy)) this.node.setPosition(p2.x, p2.y + dy, 0);
        if (this._inX < -0.01 && this.facing !== -1) { this.facing = -1; this._redraw(); }
        else if (this._inX > 0.01 && this.facing !== 1) { this.facing = 1; this._redraw(); }
        this._artFrame();
    }

    tileX(): number { return Math.floor(this.node.position.x / TILE); }
    tileY(): number { return Math.floor(-this.node.position.y / TILE); }

    private _blocked(tx: number, ty: number): boolean {
        if (!this._terrain) return true;
        if (tx === this.tileX() && ty === this.tileY()) return false;   // 所站格永不阻挡自己（圆恒跨到自己 tile）
        const t = this._terrain.get(tx, ty);
        if (t === TT.Water) return true;          // 裸水不可走（Bridge 是可行走人造格）
        if (t === TT.Bridge) return false;
        // 台阶通行规则（terrain-system §4.2）：Δh=0 平走 / Δh=1 需任一端 Stairs / Δh≥2 拒绝
        const h = this._terrain.heights[this._terrain.idx(tx, ty)];
        const ph = this._terrain.heights[this._terrain.idx(this.tileX(), this.tileY())];
        if (h >= 1 || ph >= 1) {
            const dh = Math.abs(h - ph);
            if (dh === 0) return false;
            if (dh === 1 && (t === TT.Stairs || this._terrain.get(this.tileX(), this.tileY()) === TT.Stairs)) return false;
            return true;
        }
        return false;
    }

    /** 脚底圆 vs 阻挡 tile 精确判（最近点距离）。 */
    private _collide(x: number, y: number): boolean {
        const r = this.radius;
        const tx0 = Math.floor((x - r) / TILE), tx1 = Math.floor((x + r) / TILE);
        const ty0 = Math.floor((-y - r) / TILE), ty1 = Math.floor((-y + r) / TILE);
        for (let ty = ty0; ty <= ty1; ty++) {
            for (let tx = tx0; tx <= tx1; tx++) {
                if (!this._blocked(tx, ty)) continue;
                const rx0 = tx * TILE, rx1 = rx0 + TILE;
                const ry0 = -ty * TILE - TILE, ry1 = -ty * TILE;
                const cx = Math.max(rx0, Math.min(x, rx1));
                const cy = Math.max(ry0, Math.min(y, ry1));
                const ddx = x - cx, ddy = y - cy;
                if (ddx * ddx + ddy * ddy < r * r) return true;
            }
        }
        return false;
    }

    private _redraw(): void {
        if (!this._g || !this._faceDot) return;
        this._g.clear();
        this._faceDot.clear();
        // 灰盒小人：脚底在 node.position；身体圆 + 头圆 + 朝向点
        this._g.circle(0, -16, 11);
        this._g.fillColor = new Color(74, 144, 217, 255);
        this._g.fill();
        this._g.circle(0, 8, 9);
        this._g.fillColor = new Color(242, 193, 78, 255);
        this._g.fill();
        this._faceDot.circle(this.facing * 6, 9, 2.5);
        this._faceDot.fillColor = new Color(42, 31, 22, 255);
        this._faceDot.fill();
    }
}
