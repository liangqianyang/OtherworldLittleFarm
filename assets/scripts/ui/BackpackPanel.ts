import { _decorator, Component, Node, UITransform, Graphics, Color, Label } from 'cc';
const { ccclass } = _decorator;

import { EventBus } from '../core/EventBus';
import { DataManager } from '../core/DataManager';
import { GameApp } from '../app/GameApp';

type AnyRow = Record<string, unknown>;

const PANEL_W = 460;
const PANEL_H = 440;
const ROW_H = 36;

/**
 * BackpackPanel —— 背包面板（阶段 2.2，程序化占位 UI）。
 * 列出背包全部物品：金币/种子/作物产出（含卖价）。开面板时构建，背包变化实时刷新。
 * 阶段 2.5 换像素素材 + 图标。
 */
@ccclass('BackpackPanel')
export class BackpackPanel extends Component {
    private _listRoot: Node = null!;

    onLoad(): void {
        EventBus.inst.on('itemGained', this._rebuild, this);
        EventBus.inst.on('itemSpent', this._rebuild, this);
    }

    onDestroy(): void {
        EventBus.inst.off('itemGained', this._rebuild, this);
        EventBus.inst.off('itemSpent', this._rebuild, this);
    }

    /** GameApp/HUD 调用显示 */
    open(): void {
        this.node.active = true;
        this._rebuild();
    }

    close(): void {
        this.node.active = false;
    }

    /** 程序化创建整个面板（挂在 farm Canvas 下），默认隐藏 */
    static create(parent: Node, layer: number): BackpackPanel {
        const root = new Node('BackpackPanel');
        root.layer = layer;
        root.addComponent(UITransform).setContentSize(PANEL_W, PANEL_H);
        root.setPosition(0, 0);
        parent.addChild(root);

        const g = root.addComponent(Graphics)!;
        g.fillColor = new Color(28, 24, 20, 235);
        g.strokeColor = new Color(255, 255, 255, 120);
        g.lineWidth = 3;
        g.roundRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, 14);
        g.fill();
        g.stroke();

        // 标题
        BackpackPanel._label(root, '背 包', 30, 0, PANEL_H / 2 - 38, 26);

        // 面板本体吞掉触摸，防止点击穿透到后面的地块
        const swallow = (): void => { /* 拦截 */ };
        root.on(Node.EventType.TOUCH_START, swallow);
        root.on(Node.EventType.TOUCH_END, swallow);

        // 列表容器
        const listRoot = new Node('list');
        listRoot.layer = layer;
        listRoot.addComponent(UITransform);
        root.addChild(listRoot);

        // 关闭按钮（右上角，加大加明显）
        BackpackPanel._button(
            root, '×', PANEL_W / 2 - 44, PANEL_H / 2 - 36,
            () => { root.getComponent(BackpackPanel)!.close(); },
            64, 48,
        );

        const comp = root.addComponent(BackpackPanel);
        comp._listRoot = listRoot;
        root.active = false;
        return comp;
    }

    private _rebuild(): void {
        if (!this.node.active) return;
        this._listRoot.destroyAllChildren();
        const inv = GameApp.inst?.inventory ?? {};
        const rows = DataManager.inst.getRows('catalogs/items') as AnyRow[];

        // 排序：金币 → 种子 → 作物产出 → 其他；__ 前缀是元数据（如 __guide），不是物品，滤掉
        const order = (cat: unknown): number => (cat === 'currency' ? 0 : cat === 'seed' ? 1 : cat === 'crop_product' ? 2 : 3);
        const owned: AnyRow[] = [];
        for (const r of rows) {
            const id = String(r['id']);
            if (id.startsWith('__')) continue;
            if ((inv[id] ?? 0) > 0) owned.push(r);
        }
        owned.sort((a, b) => order(a['category']) - order(b['category']));

        let y = PANEL_H / 2 - 84;
        if (owned.length === 0) {
            BackpackPanel._label(this._listRoot, '空空如也…种点什么吧', 20, 0, y, 22);
        }
        for (const r of owned) {
            const id = String(r['id']);
            const name = String(r['name'] ?? id);
            const sell = typeof r['sellPrice'] === 'number' ? ` 卖${r['sellPrice']}金` : '';
            BackpackPanel._label(this._listRoot, `${name} ×${inv[id]}${sell}`, 20, 0, y, 22);
            y -= ROW_H;
        }
    }

    // —— 程序化 UI 小工具 ——
    private static _label(parent: Node, text: string, _size: number, x: number, y: number, fontSize: number): Label {
        const n = new Node('lbl');
        n.layer = parent.layer;
        n.addComponent(UITransform);
        n.setPosition(x, y);
        const l = n.addComponent(Label)!;
        l.fontSize = fontSize;
        l.lineHeight = fontSize + 6;
        l.string = text;
        parent.addChild(n);
        return l;
    }

    private static _button(parent: Node, text: string, x: number, y: number, onTap: () => void, w = 56, h = 44): Node {
        const n = new Node('btn');
        n.layer = parent.layer;
        n.addComponent(UITransform).setContentSize(w, h);
        n.setPosition(x, y);
        const g = n.addComponent(Graphics)!;
        g.fillColor = new Color(60, 48, 38, 255);
        g.strokeColor = new Color(255, 255, 255, 90);
        g.lineWidth = 2;
        g.roundRect(-w / 2, -h / 2, w, h, 8);
        g.fill();
        g.stroke();
        BackpackPanel._label(n, text, 20, 0, 0, 24);
        // 拦截触摸：面板本体 + 按钮
        n.on(Node.EventType.TOUCH_END, onTap);
        return n;
    }
}
