import { _decorator, Component, Node, Graphics, Color, Label, UITransform, director, Camera } from 'cc';
import { SCREEN_UI_LAYER } from '../JoystickController';
import { EventBus } from '../../../core/EventBus';
import { InteractionManager } from './InteractionManager';
const { ccclass } = _decorator;

/**
 * ContextButtonUI —— 唯一常驻复用的情境交互按钮（M2，migration-plan §3.6）。
 *
 * SCREEN_UI 层（overlay 相机渲染，屏幕坐标）；每帧把当前交互物件的世界坐标
 * 投影到屏幕（主相机 zoom=2，设计分辨率 1280×720），按钮锚在物件上方 70px。
 * 单按钮 → 天然无多按钮重叠（验收④）；interactPromptChanged=null 或 suppress 时隐藏。
 * 点击 → InteractionManager.dispatchCurrent()。
 */
@ccclass('ContextButtonUI')
export class ContextButtonUI extends Component {
    private static _inst: ContextButtonUI | null = null;

    private _labelNode: Node | null = null;
    private _label: Label | null = null;
    private _g: Graphics | null = null;
    private _camNode: Node | null = null;
    private _cam: Camera | null = null;
    private _shown = false;

    static create(parent: Node): ContextButtonUI {
        if (ContextButtonUI._inst && ContextButtonUI._inst.node.isValid) return ContextButtonUI._inst;
        const n = new Node('ContextButton');
        n.layer = SCREEN_UI_LAYER;
        parent.addChild(n);
        return n.addComponent(ContextButtonUI);
    }

    onLoad(): void {
        ContextButtonUI._inst = this;
        const ut = this.node.addComponent(UITransform);
        ut.setContentSize(220, 84);
        this.node.setPosition(0, -9999); // 初始藏屏外

        this._g = this.node.addComponent(Graphics);
        this._drawPlate();

        this._labelNode = new Node('lbl');
        this._labelNode.layer = this.node.layer;
        this.node.addChild(this._labelNode);
        const lut = this._labelNode.addComponent(UITransform);
        lut.setContentSize(200, 48);
        this._label = this._labelNode.addComponent(Label);
        this._label.fontSize = 30;
        this._label.lineHeight = 40;
        this._label.isBold = true;
        this._label.color = new Color(255, 244, 214, 255);
        this._label.horizontalAlign = Label.HorizontalAlign.CENTER;
        this._label.verticalAlign = Label.VerticalAlign.CENTER;
        this._label.overflow = Label.Overflow.SHRINK;
        this._labelNode.setPosition(0, 0);

        this.node.on(Node.EventType.TOUCH_END, this._onTap, this);
        EventBus.inst.on('interactPromptChanged', this._onPrompt, this);
    }

    onDestroy(): void {
        EventBus.inst.off('interactPromptChanged', this._onPrompt, this);
        if (ContextButtonUI._inst === this) ContextButtonUI._inst = null;
    }

    private _onPrompt(payload: { objId: string; label: string; wx: number; wy: number } | null): void {
        this._shown = !!payload;
        if (payload && this._label) this._label.string = payload.label;
        if (!payload) this.node.setPosition(0, -9999);
    }

    private _onTap(): void {
        if (this._shown) InteractionManager.inst.dispatchCurrent();
    }

    update(): void {
        if (!this._shown) return;
        const cur = InteractionManager.inst.current;
        if (!cur) { this._shown = false; this.node.setPosition(0, -9999); return; }
        // 懒取主相机（场景切换后重找）
        if (!this._camNode || !this._camNode.isValid) {
            const cn = director.getScene() ? director.getScene()!.getChildByName('Canvas') : null;
            this._camNode = cn ? cn.getChildByName('Camera') : null;
            this._cam = this._camNode ? this._camNode.getComponent(Camera) : null;
        }
        if (!this._cam) return;
        const cp = this._camNode!.position;
        const p = cur.node.position;
        // 世界→屏幕：zoom=2，设计分辨率中心 (0,0)
        let sx = (p.x - cp.x) * 2;
        let sy = (p.y - cp.y) * 2 + 70; // 物件上方 70px
        sx = Math.max(-530, Math.min(530, sx));
        sy = Math.max(-270, Math.min(280, sy));
        this.node.setPosition(sx, sy, 0);
    }

    private _drawPlate(): void {
        const g = this._g!;
        g.clear();
        g.fillColor = new Color(28, 26, 22, 235);
        g.roundRect(-110, -42, 220, 84, 18);
        g.fill();
        g.strokeColor = new Color(242, 193, 78, 255); // 金描边
        g.lineWidth = 4;
        g.roundRect(-110, -42, 220, 84, 18);
        g.stroke();
    }
}
