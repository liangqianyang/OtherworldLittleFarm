import { _decorator, Component, Node, Graphics, Color, Label, UITransform } from 'cc';
import { SCREEN_UI_LAYER } from './JoystickController';
import { TerrainData, TT, TILE } from './TerrainData';

const { ccclass } = _decorator;

/**
 * 指南针 HUD（M7 收尾 UX）：
 * - 屏幕边缘 3 枚箭头指向 副本传送门(112,10)/封印祭坛(110,52)/庭院河岸(66,26)，
 *   解决「入口全在地图角落、没有任何引导」的发现性问题。
 * - 挂 SCREEN_UI 层（1<<24）由 overlay 相机渲染，固定屏幕坐标不随世界滚动；
 *   目标进入可视范围（约 12×6.5 格）时隐藏对应箭头（情境按钮已可见）。
 * - 「桥」箭头在庭院区出现第一座桥后永久隐藏（造桥引导完成）。
 */
const POIS: { key: string; label: string; color: Color; tx: number; ty: number }[] = [
    { key: 'dungeon', label: '副', color: new Color(178, 122, 255, 220), tx: 112, ty: 10 },
    { key: 'seal', label: '封', color: new Color(255, 200, 90, 220), tx: 110, ty: 52 },
    { key: 'river', label: '桥', color: new Color(96, 168, 255, 220), tx: 66, ty: 26 },
];

const HALF_W = 640, HALF_H = 360;      // UI 中心系半宽/半高（1280×720）
const EDGE = 46;                        // 箭头距屏幕边缘的内缩
const VIEW_W = 12 * TILE, VIEW_H = 6.5 * TILE;   // 目标大致入屏即隐藏的判定半径

@ccclass('CompassHUD')
export class CompassHUD extends Component {
    private static _inst: CompassHUD | null = null;
    static get inst(): CompassHUD | null { return CompassHUD._inst; }

    private _player: Node | null = null;
    private _data: TerrainData | null = null;
    private _arrows: { key: string; node: Node; g: Graphics; color: Color; tx: number; ty: number }[] = [];
    private _frame = 0;
    private _bridged = false;

    static create(parent: Node, playerNode: Node, data: TerrainData): CompassHUD {
        const n = new Node('CompassHUD');
        parent.addChild(n);
        const c = n.addComponent(CompassHUD);
        c._player = playerNode;
        c._data = data;
        return c;
    }

    onLoad(): void {
        this.node.layer = SCREEN_UI_LAYER;
        this.node.addComponent(UITransform).setContentSize(1280, 720);
        CompassHUD._inst = this;
        for (const p of POIS) {
            const an = new Node('arrow_' + p.key);
            an.layer = SCREEN_UI_LAYER;
            this.node.addChild(an);
            const g = an.addComponent(Graphics);
            // 风筝形箭头（默认指向正上，运行时按角度旋转）
            g.moveTo(0, 16); g.lineTo(11, -9); g.lineTo(0, -4); g.lineTo(-11, -9); g.close();
            g.fillColor = p.color;
            g.fill();
            g.lineWidth = 2;
            g.strokeColor = new Color(255, 255, 255, 130);
            g.stroke();
            const ln = new Node('lb_' + p.key);
            ln.layer = SCREEN_UI_LAYER;
            an.addChild(ln);
            ln.setPosition(0, -30, 0);
            const lb = ln.addComponent(Label);
            lb.string = p.label;
            lb.fontSize = 18;
            lb.color = new Color(p.color.r, p.color.g, p.color.b, 255);
            this._arrows.push({ key: p.key, node: an, g, color: p.color, tx: p.tx, ty: p.ty });
        }
    }

    onDestroy(): void {
        if (CompassHUD._inst === this) CompassHUD._inst = null;
    }

    update(): void {
        if (!this._player) return;
        const p = this._player.position;
        // 低频：庭院区任一格已成桥 → 「桥」箭头永久隐藏（扫描 12k 格约 1.6µs，60 帧一次无感）
        if ((this._frame++ % 60) === 0 && !this._bridged && this._data) {
            const t = this._data.types;
            for (let i = 0; i < t.length; i++) {
                if (t[i] === TT.Bridge) { this._bridged = true; break; }
            }
        }
        for (const a of this._arrows) {
            const wx = (a.tx + 0.5) * TILE, wy = -(a.ty + 0.5) * TILE;
            const dx = wx - p.x, dy = wy - p.y;
            const isRiver = a.key === 'river';
            const hide = (Math.abs(dx) < VIEW_W && Math.abs(dy) < VIEW_H) || (isRiver && this._bridged);
            a.node.active = !hide;
            if (hide) continue;
            const adx = Math.abs(dx), ady = Math.abs(dy);
            const k = Math.min((HALF_W - EDGE) / (adx || 1e-6), (HALF_H - EDGE) / (ady || 1e-6));
            a.node.setPosition(dx * k, dy * k, 0);
            a.node.angle = Math.atan2(-dx, dy) * 180 / Math.PI;   // 默认指上 → 指向 (dx,dy)
        }
    }
}
