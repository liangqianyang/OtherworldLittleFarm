import { _decorator, Component, Node, Graphics, Color, Label, UITransform } from 'cc';
import { SCREEN_UI_LAYER } from './JoystickController';
import { GameApp } from '../../app/GameApp';

const { ccclass } = _decorator;

/**
 * SettingsPanel —— 世界 HUD 右上角「⚙」入口 + 设置小面板（M7 收尾 UX）。
 *
 * 首个承载项：TapTap 发布必接能力「添加到桌面」（docs/taptap/publishing.md 硬前置）。
 * 通过 IPlatformAdapter 可选能力探测：运行时不支持（编辑器预览/浏览器 Local 适配）
 * 则隐藏该行，UI 不出现死按钮。面板为模态（吞触摸），关闭按钮恢复。
 *
 * 铁律遵守：本文件不 import 任何 tap.* API，一律走平台适配层。
 */
const HALF_W = 640, HALF_H = 360;   // UI 中心系半宽/半高（1280×720，原点=屏幕中心）
const EDGE = 46;                     // 与 CompassHUD 一致的边缘内缩

@ccclass('SettingsPanel')
export class SettingsPanel extends Component {
    private static _inst: SettingsPanel | null = null;
    static get inst(): SettingsPanel | null { return SettingsPanel._inst; }

    private _panel: Node | null = null;
    private _resultLabel: Label | null = null;
    private _busy = false;

    static create(parent: Node): SettingsPanel {
        const n = new Node('SettingsEntry');
        parent.addChild(n);
        const c = n.addComponent(SettingsPanel);
        SettingsPanel._inst = c;
        return c;
    }

    onLoad(): void {
        this.node.layer = SCREEN_UI_LAYER;
        this.node.addComponent(UITransform).setContentSize(1280, 720);
        SettingsPanel._inst = this;

        // 右上角 ⚙ 圆钮（44px 热区略小但远超可点性下限；与状态栏/指南针无重叠）
        const btn = new Node('gearBtn');
        btn.layer = SCREEN_UI_LAYER;
        btn.addComponent(UITransform).setContentSize(44, 44);
        const g = btn.addComponent(Graphics);
        g.circle(0, 0, 22);
        g.fillColor = new Color(28, 32, 48, 210);
        g.fill();
        g.lineWidth = 2;
        g.strokeColor = new Color(242, 193, 78, 255);
        g.stroke();
        // 齿轮简画：三横一竖（点阵避免字体差异）
        g.strokeColor = new Color(242, 230, 200, 255);
        g.lineWidth = 2;
        g.moveTo(-9, 5); g.lineTo(9, 5);
        g.moveTo(-9, 0); g.lineTo(9, 0);
        g.moveTo(-9, -5); g.lineTo(9, -5);
        g.stroke();
        btn.setPosition(HALF_W - EDGE - 22, HALF_H - EDGE - 22);
        btn.on(Node.EventType.TOUCH_END, this._toggle, this);
        this.node.addChild(btn);

        // 模态面板（默认隐藏）
        this._panel = this._buildPanel();
        this._panel.active = false;
    }

    protected onDestroy(): void {
        if (SettingsPanel._inst === this) SettingsPanel._inst = null;
    }

    private _toggle(): void {
        if (!this._panel) return;
        this._panel.active = !this._panel.active;
    }

    private _close(): void {
        if (this._panel) this._panel.active = false;
    }

    private _buildPanel(): Node {
        const root = new Node('panelRoot');
        root.layer = SCREEN_UI_LAYER;
        root.addComponent(UITransform).setContentSize(1280, 720);
        const bg = root.addComponent(Graphics);
        bg.rect(-HALF_W, -HALF_H, 1280, 720);
        bg.fillColor = new Color(0, 0, 0, 170);
        bg.fill();
        root.on(Node.EventType.TOUCH_START, () => { /* 吞触摸 */ }, this);
        root.on(Node.EventType.TOUCH_END, () => { /* 吞触摸 */ }, this);
        this.node.addChild(root);

        const panel = new Node('box');
        panel.layer = SCREEN_UI_LAYER;
        panel.addComponent(UITransform).setContentSize(420, 260);
        const pg = panel.addComponent(Graphics);
        pg.fillColor = new Color(28, 32, 48, 250);
        pg.roundRect(-210, -130, 420, 260, 14);
        pg.fill();
        pg.strokeColor = new Color(242, 193, 78, 255);
        pg.lineWidth = 3;
        pg.roundRect(-210, -130, 420, 260, 14);
        pg.stroke();
        root.addChild(panel);
        panel.setPosition(0, 20);

        // 标题
        this._label(panel, '设置', 36, new Color(242, 230, 200, 255), 0, 88);

        // 添加到桌面（仅运行时支持时显示 —— TapTap 审核必接）
        const adapter = GameApp.inst ? GameApp.inst.adapter : null;
        if (adapter && adapter.canAddToDesktop && adapter.addToDesktop) {
            const addBtn = this._button(panel, '添加到桌面', 240, 60, new Color(90, 138, 70, 255), 0, 30);
            addBtn.on(Node.EventType.TOUCH_END, this._onAddDesktop, this);
            // 结果反馈行
            const rn = new Node('result');
            rn.layer = SCREEN_UI_LAYER;
            rn.addComponent(UITransform);
            const rl = rn.addComponent(Label);
            rl.string = '';
            rl.fontSize = 18;
            rl.lineHeight = 24;
            rl.color = new Color(150, 160, 180, 255);
            panel.addChild(rn);
            rn.setPosition(0, -8);
            this._resultLabel = rl;
        }

        // 关闭
        const closeBtn = this._button(panel, '关闭', 180, 52, new Color(70, 80, 100, 255), 0, -92);
        closeBtn.on(Node.EventType.TOUCH_END, this._close, this);

        return root;
    }

    /** 发起「添加到桌面」；一次只允许一个在途请求，结果写入反馈行 */
    private _onAddDesktop(): void {
        const adapter = GameApp.inst ? GameApp.inst.adapter : null;
        if (!adapter || !adapter.addToDesktop || this._busy) return;
        this._busy = true;
        if (this._resultLabel) this._resultLabel.string = '正在请求…';
        adapter.addToDesktop().then((r) => {
            this._busy = false;
            if (!this._resultLabel) return;
            this._resultLabel.string =
                r === 'added' ? '已添加到桌面 ✓'
                : r === 'already' ? '已在桌面，无需重复添加'
                : r === 'declined' ? '未获授权，未添加（可在系统设置开启）'
                : r === 'unsupported' ? '当前环境不支持'
                : '添加失败，请稍后再试';
        });
    }

    /** 绿色系操作按钮（Graphics 圆角矩形 + Label） */
    private _button(parent: Node, text: string, w: number, h: number, color: Color, x: number, y: number): Node {
        const btn = new Node(text);
        btn.layer = SCREEN_UI_LAYER;
        btn.addComponent(UITransform).setContentSize(w, h);
        const g = btn.addComponent(Graphics);
        g.fillColor = color;
        g.roundRect(-w / 2, -h / 2, w, h, 10);
        g.fill();
        g.strokeColor = new Color(240, 240, 220, 255);
        g.lineWidth = 2;
        g.roundRect(-w / 2, -h / 2, w, h, 10);
        g.stroke();
        const ln = new Node('lbl');
        ln.layer = SCREEN_UI_LAYER;
        ln.addComponent(UITransform).setContentSize(w, h);
        const lb = ln.addComponent(Label);
        lb.string = text;
        lb.fontSize = 26;
        lb.lineHeight = h;
        lb.color = new Color(255, 255, 255, 255);
        btn.addChild(ln);
        parent.addChild(btn);
        btn.setPosition(x, y);
        return btn;
    }

    private _label(parent: Node, text: string, size: number, color: Color, x: number, y: number): Label {
        const n = new Node(text);
        n.layer = SCREEN_UI_LAYER;
        n.addComponent(UITransform);
        const lb = n.addComponent(Label);
        lb.string = text;
        lb.fontSize = size;
        lb.lineHeight = Math.round(size * 1.2);
        lb.color = color;
        parent.addChild(n);
        n.setPosition(x, y);
        return lb;
    }
}
