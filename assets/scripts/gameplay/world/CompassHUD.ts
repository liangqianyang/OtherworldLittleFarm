import { _decorator, Component, Node, Graphics, Color, Label, UITransform } from 'cc';
import { SCREEN_UI_LAYER } from './JoystickController';
import { TerrainData, TILE, LANDMARKS } from './TerrainData';

const { ccclass } = _decorator;

/**
 * 指南针 HUD（M7 收尾 UX；V3 POI=LANDMARKS 单源）：
 * - 屏幕边缘 3 枚箭头指向 副本传送门(48,23)/封印祭坛(60,26)/码头(37,53)，
 *   解决「入口没有引导」的发现性问题。
 * - 标签=全名+直线距离（如「封印·18格」），fontSize 20；隐藏半径 8×4 格 < 视口半宽，杜绝死区。
 * - 挂 SCREEN_UI 层（1<<24）由 overlay 相机渲染，固定屏幕坐标不随世界滚动；
 *   目标进入可视范围（约 12×6.5 格）时隐藏对应箭头（情境按钮已可见）。
 * - 顶部让位（U2 避让）：左上 HUD 芯片 x[-620,-260] y[292,340]，右上 ⚙ 热区 x[528,616] y[248,336]。
 */
const POIS: { key: string; label: string; color: Color; tx: number; ty: number }[] = [
    { key: 'dungeon', label: '副本', color: new Color(178, 122, 255, 220), tx: LANDMARKS.gate.x, ty: LANDMARKS.gate.y },
    { key: 'seal', label: '封印', color: new Color(255, 200, 90, 220), tx: LANDMARKS.altar.x, ty: LANDMARKS.altar.y },
    { key: 'dock', label: '码头', color: new Color(96, 168, 255, 220), tx: LANDMARKS.dock.x, ty: LANDMARKS.dock.y },
];

const HALF_W = 640, HALF_H = 360;      // UI 中心系半宽/半高（1280×720）
const EDGE = 52;                        // 箭头距屏幕边缘的内缩（V2：给 ⚙ 与顶栏让位）
// 隐藏半径必须小于视口半宽(10×5.625格)，否则出现「目标还在屏外、箭头已隐藏」的死区
const VIEW_W = 8 * TILE, VIEW_H = 4 * TILE;

@ccclass('CompassHUD')
export class CompassHUD extends Component {
    private static _inst: CompassHUD | null = null;
    static get inst(): CompassHUD | null { return CompassHUD._inst; }

    private _player: Node | null = null;
    private _data: TerrainData | null = null;
    private _arrows: { key: string; label: string; node: Node; lbNode: Node; lb: Label; color: Color; tx: number; ty: number; lastText: string }[] = [];

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
            lb.fontSize = 20;
            lb.color = new Color(p.color.r, p.color.g, p.color.b, 255);
            this._arrows.push({ key: p.key, label: p.label, node: an, lbNode: ln, lb, color: p.color, tx: p.tx, ty: p.ty, lastText: p.label });
        }
    }

    onDestroy(): void {
        if (CompassHUD._inst === this) CompassHUD._inst = null;
    }

    update(): void {
        if (!this._player) return;
        const p = this._player.position;
        for (const a of this._arrows) {
            const wx = (a.tx + 0.5) * TILE, wy = -(a.ty + 0.5) * TILE;
            const dx = wx - p.x, dy = wy - p.y;
            const hide = (Math.abs(dx) < VIEW_W && Math.abs(dy) < VIEW_H);
            a.node.active = !hide;
            if (hide) continue;
            const adx = Math.abs(dx), ady = Math.abs(dy);
            const k = Math.min((HALF_W - EDGE) / (adx || 1e-6), (HALF_H - EDGE) / (ady || 1e-6));
            let ax = dx * k, ay = dy * k;
            // 顶部让位（U2 避让）：左上芯片 x[-620,-260] y[292,340]、右上 ⚙ 热区 x[528,616] y[248,336]
            // ay>270 的箭头一律钳到 x=-240（芯片右缘外）/ x=440（⚙ 左缘外）；240<ay≤270 贴右缘的箭头躲 ⚙
            if (ay > 270) ax = ax >= 0 ? 440 : -240;
            else if (ay > 240 && ax > 500) ax = 440;
            a.node.setPosition(ax, ay, 0);
            a.node.angle = Math.atan2(-dx, dy) * 180 / Math.PI;   // 默认指上 → 指向 (dx,dy)
            a.lbNode.angle = -a.node.angle;                       // 文字始终正立（抵消箭头旋转）
            // 标签屏幕位置：箭头在屏幕下半时放箭头上方，其余放下方（偏移需反旋转回局部系）
            const below = dy >= 0;
            const oy = below ? -34 : 34;
            const rad = -a.node.angle * Math.PI / 180;
            a.lbNode.setPosition(-oy * Math.sin(rad), oy * Math.cos(rad), 0);
            // 文案带直线距离（格），让玩家对「还要走多远」有预期；仅变化时写 string
            const text = a.label + '·' + Math.round(Math.hypot(dx, dy) / TILE) + '格';
            if (text !== a.lastText) { a.lastText = text; a.lb.string = text; }
        }
    }
}
