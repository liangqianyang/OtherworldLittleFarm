import { _decorator, Component, Node, Graphics, Color, UITransform, EventTouch, Layers } from 'cc';
const { ccclass } = _decorator;

/**
 * 动态摇杆（M1，character-control.md）：
 * - 触摸起点生成摇杆（左半屏 UITouch 拾取），死区 14px、最大半径 80px、模拟量输出。
 * - 挂 SCREEN_UI 层（1<<24），由专用 overlay 相机渲染（固定屏幕坐标，不随世界相机移动）。
 */
export const SCREEN_UI_LAYER = 16777216;   // 1<<24，空闲用户位

@ccclass('JoystickController')
export class JoystickController extends Component {
    private static _inst: JoystickController | null = null;
    static get inst(): JoystickController | null { return JoystickController._inst; }

    dirX = 0;
    dirY = 0;

    private _touchId: number | null = null;
    private _ox = 0;
    private _oy = 0;
    private _g: Graphics | null = null;

    private readonly DEAD = 14;
    private readonly MAX = 80;

    onLoad(): void {
        this.node.layer = SCREEN_UI_LAYER;
        this.node.addComponent(UITransform).setContentSize(640, 720);
        this.node.setPosition(-320, 0, 0);      // 左半屏（1280×720 中心系）
        this._g = this.node.addComponent(Graphics);
        JoystickController._inst = this;
        this.node.on(Node.EventType.TOUCH_START, this._onStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this._onMove, this);
        this.node.on(Node.EventType.TOUCH_END, this._onEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this._onEnd, this);
    }

    onDestroy(): void {
        if (JoystickController._inst === this) JoystickController._inst = null;
        this.node.off(Node.EventType.TOUCH_START, this._onStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this._onMove, this);
        this.node.off(Node.EventType.TOUCH_END, this._onEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this._onEnd, this);
    }

    private _uiPos(e: EventTouch): { x: number; y: number } {
        const u = e.getUILocation();
        return { x: u.x - 640, y: u.y - 360 };   // UI 原点左下 → Canvas 中心系
    }

    private _onStart(e: EventTouch): void {
        if (this._touchId !== null) return;
        this._touchId = e.getID();
        const p = this._uiPos(e);
        this._ox = p.x; this._oy = p.y;
        this._apply(p.x, p.y);
    }

    private _onMove(e: EventTouch): void {
        if (e.getID() !== this._touchId) return;
        const p = this._uiPos(e);
        this._apply(p.x, p.y);
    }

    private _onEnd(e: EventTouch): void {
        if (e.getID() !== this._touchId) return;
        this._touchId = null;
        this.dirX = 0; this.dirY = 0;
        this._g!.clear();
    }

    private _apply(px: number, py: number): void {
        const dx = px - this._ox, dy = py - this._oy;
        const d = Math.hypot(dx, dy);
        const g = this._g!;
        g.clear();
        // 基环画在触摸起点（动态摇杆）：node 定位左半屏中心 (-320,0)，local = canvas 中心系 + 320。
        // 旧实现把环画死在 (0,0)，触点不在左半屏中心时杆头与环错位。
        const ox = this._ox + 320, oy = this._oy;
        g.circle(ox, oy, this.MAX);
        g.lineWidth = 3;
        g.strokeColor = new Color(255, 255, 255, 70);
        g.stroke();
        g.circle(ox, oy, this.DEAD);
        g.lineWidth = 2;
        g.strokeColor = new Color(255, 255, 255, 40);
        g.stroke();
        if (d >= this.DEAD) {
            const m = Math.min(1, d / this.MAX);
            this.dirX = (dx / d) * m;
            this.dirY = (dy / d) * m;
            const kx = (dx / d) * Math.min(d, this.MAX);
            const ky = (dy / d) * Math.min(d, this.MAX);
            g.circle(ox + kx, oy + ky, 18);
            g.fillColor = new Color(255, 255, 255, 110);
            g.fill();
        } else {
            this.dirX = 0; this.dirY = 0;
            g.circle(ox, oy, 18);
            g.fillColor = new Color(255, 255, 255, 90);
            g.fill();
        }
    }
}
