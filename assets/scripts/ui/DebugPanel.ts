/**
 * 《异界小农场 2.0》阶段 1 适配版：右上角可折叠开发调试面板
 * - 默认收起为右上角小圆钮（不遮挡主岛画面）；点击 DBG 展开跳天、发种子、印存档与重置档按钮。
 */

import { _decorator, Color, Component, Graphics, Label, Layers, Node, UITransform, Widget } from 'cc';
import { DEV } from 'cc/env';
import { DataManager } from '../core/DataManager';
import { GameApp } from '../app/GameApp';

const { ccclass } = _decorator;

@ccclass('DebugPanel')
export class DebugPanel extends Component {
    private static _inst: DebugPanel | null = null;
    private _rootNode: Node | null = null;
    private _barNode: Node | null = null;
    private _expanded = false;

    public static get isDebugVisible(): boolean {
        return !!DebugPanel._inst?._rootNode?.active;
    }

    public static setDebugVisible(show: boolean): void {
        const inst = DebugPanel._inst;
        if (!inst || !DEV) return;
        if (!inst._rootNode && show) inst._buildUI();
        if (inst._rootNode) inst._rootNode.active = show;
    }

    protected onLoad(): void {
        DebugPanel._inst = this;
    }

    protected onDestroy(): void {
        if (DebugPanel._inst === this) DebugPanel._inst = null;
    }

    protected start(): void {
        if (!DEV) {
            this.node.active = false;
            return;
        }
        // V1.0 发布态默认隐藏 DBG 按钮，可在「设置」面板内随时一键开启
        this._buildUI();
        if (this._rootNode) this._rootNode.active = false;
    }

    private _newUINode(name: string, parent: Node): Node {
        const n = new Node(name);
        n.layer = Layers.Enum.UI_2D;
        n.parent = parent;
        return n;
    }

    private _buildUI(): void {
        const root = this._newUINode('DebugRoot', this.node);
        this._rootNode = root;
        const rt = root.addComponent(UITransform);
        rt.setContentSize(84, 44);
        const w = root.addComponent(Widget);
        w.isAlignTop = true;
        w.top = 20;
        w.isAlignRight = true;
        w.right = 24;

        const toggleBtn = this._makeButton('DBG', 76, 38, new Color(31, 111, 104, 225), () => {
            this._expanded = !this._expanded;
            if (this._barNode) this._barNode.active = this._expanded;
        });
        toggleBtn.parent = root;

        this._barNode = this._newUINode('ActionsBar', root);
        this._barNode.setPosition(-290, -52, 0);
        this._barNode.active = this._expanded;

        const actions: { label: string; color: Color; fn: () => void }[] = [
            { label: '+1天', color: new Color(31, 111, 104, 240), fn: () => GameApp.inst?.endDayAndSave() },
            {
                label: '+6天',
                color: new Color(31, 111, 104, 240),
                fn: () => { for (let i = 0; i < 6; i++) GameApp.inst?.endDayAndSave(); },
            },
            {
                label: '+100金',
                color: new Color(181, 118, 36, 240),
                fn: () => { GameApp.inst?.addGold(100); GameApp.inst?.persist('debug_gold'); },
            },
            {
                label: '+全灵植',
                color: new Color(76, 126, 62, 240),
                fn: () => {
                    const app = GameApp.inst;
                    if (!app) return;
                    for (const p of DataManager.inst.getAllPlants()) app.addItem(`${p.id}_seed`, 5);
                    app.persist('debug_seeds');
                },
            },
            {
                label: '印存档',
                color: new Color(68, 82, 98, 240),
                fn: () => {
                    const app = GameApp.inst;
                    if (!app) return;
                    console.log('[DebugPanel] SaveData:', JSON.stringify(app.saveData, null, 2));
                },
            },
            { label: '重置档', color: new Color(185, 62, 48, 240), fn: () => GameApp.inst?.resetSave() },
        ];

        const btnW = 92;
        const gap = 8;
        actions.forEach((act, idx) => {
            const b = this._makeButton(act.label, btnW, 36, act.color, act.fn);
            b.parent = this._barNode!;
            b.setPosition((idx - (actions.length - 1) / 2) * (btnW + gap), 0, 0);
        });
    }

    private _makeButton(text: string, width: number, height: number, bg: Color, onTap: () => void): Node {
        const n = new Node(`Btn_${text}`);
        n.layer = Layers.Enum.UI_2D;
        const ut = n.addComponent(UITransform);
        ut.setContentSize(width, height);

        const g = n.addComponent(Graphics);
        g.fillColor = bg;
        g.roundRect(-width / 2, -height / 2, width, height, 8);
        g.fill();

        const lblNode = this._newUINode('Label', n);
        const lbl = lblNode.addComponent(Label);
        lbl.string = text;
        lbl.fontSize = 16;
        lbl.lineHeight = 20;
        lbl.color = Color.WHITE;

        n.on(Node.EventType.TOUCH_END, onTap);
        return n;
    }
}