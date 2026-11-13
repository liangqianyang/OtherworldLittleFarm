import { _decorator, Component, Node, Label, Graphics, Color, UITransform, Sprite, EventTouch } from 'cc';
import { DataManager } from '../core/DataManager';
import { GameApp } from '../app/GameApp';
import { SpriteLib } from '../core/SpriteLib';
import { SfxLib } from '../core/SfxLib';

const { ccclass } = _decorator;

/**
 * CodexPanel —— 图鉴（§13 MVP v2 收窄版：作物 + 鱼）。
 * 已收集显示名称与描述；未收集显示 ???。
 */
@ccclass('CodexPanel')
export class CodexPanel extends Component {
    private _tab: 'crop' | 'fish' = 'crop';
    private _listRoot: Node = null!;
    private _panel: Node = null!;

    static create(parent: Node, layer: number): CodexPanel {
        const W = 560, H = 480;
        const n = new Node('CodexPanel');
        n.layer = layer;
        n.addComponent(UITransform);
        parent.addChild(n);

        // 全屏遮罩（吞点击）
        const mask = new Node('mask');
        mask.layer = layer;
        mask.addComponent(UITransform);
        const mg = mask.addComponent(Graphics)!;
        mg.fillColor = new Color(0, 0, 0, 170);
        mg.rect(-2000, -1200, 4000, 2400);
        mg.fill();
        mask.on(Node.EventType.TOUCH_START, (e: EventTouch) => e.propagationStopped = true);
        mask.on(Node.EventType.TOUCH_END, (e: EventTouch) => e.propagationStopped = true);
        n.addChild(mask);

        // 面板
        const panel = new Node('panel');
        panel.layer = layer;
        panel.addComponent(UITransform);
        const pg = panel.addComponent(Graphics)!;
        pg.fillColor = new Color(44, 38, 32);
        pg.rect(-W / 2, -H / 2, W, H);
        pg.fill();
        pg.strokeColor = new Color(242, 193, 78);
        pg.lineWidth = 5;
        pg.rect(-W / 2, -H / 2, W, H);
        pg.stroke();
        panel.addComponent(CodexPanel);
        n.addChild(panel);

        const title = CodexPanel._labelNode('图 鉴', 32, new Color(242, 220, 160), 0, H / 2 - 44, layer);
        panel.addChild(title);

        // 关闭 ×
        const closeN = new Node('close');
        closeN.layer = layer;
        closeN.addComponent(UITransform);
        closeN.setPosition(W / 2 - 52, H / 2 - 44);
        const cg = closeN.addComponent(Graphics)!;
        cg.fillColor = new Color(60, 48, 38);
        cg.rect(-30, -22, 60, 44);
        cg.fill();
        cg.strokeColor = new Color(242, 193, 78);
        cg.lineWidth = 3;
        cg.rect(-30, -22, 60, 44);
        cg.stroke();
        closeN.addChild(CodexPanel._labelNode('×', 30, new Color(255, 240, 210), 0, 0, layer));
        closeN.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
            e.propagationStopped = true;
            SfxLib.inst.play('deny');
            n.active = false;
        });
        panel.addChild(closeN);

        const comp = panel.getComponent(CodexPanel)!;
        comp._panel = panel;

        // 页签（作物 | 鱼）
        comp._makeTab('作物', 'crop', -90, H / 2 - 100, layer, W);
        comp._makeTab('鱼', 'fish', 90, H / 2 - 100, layer, W);

        // 列表容器
        const list = new Node('list');
        list.layer = layer;
        list.addComponent(UITransform);
        panel.addChild(list);
        comp._listRoot = list;

        n.active = false;
        return comp;
    }

    open(): void {
        this.node.active = true;
        this._rebuild();
    }

    private _makeTab(text: string, tab: 'crop' | 'fish', x: number, y: number, layer: number, W: number): void {
        const t = new Node(`tab_${tab}`);
        t.layer = layer;
        t.addComponent(UITransform);
        t.setPosition(x, y);
        const g = t.addComponent(Graphics)!;
        g.fillColor = new Color(70, 56, 42);
        g.rect(-70, -24, 140, 48);
        g.fill();
        g.strokeColor = new Color(242, 193, 78);
        g.lineWidth = 3;
        g.rect(-70, -24, 140, 48);
        g.stroke();
        t.addChild(CodexPanel._labelNode(text, 24, new Color(255, 235, 190), 0, 0, layer));
        t.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
            e.propagationStopped = true;
            this._tab = tab;
            SfxLib.inst.play('bite');
            this._rebuild();
        });
        this._panel.addChild(t);
        void W;
    }

    private _rebuild(): void {
        this._listRoot.removeAllChildren();
        const layer = this._listRoot.layer;
        const owned = GameApp.inst?.codex ?? [];
        const lib = SpriteLib.inst;
        const rows = this._tab === 'crop'
            ? DataManager.inst.getRows('catalogs/crops')
            : DataManager.inst.getRows('catalogs/fish');

        rows.forEach((r, i) => {
            const id = String(r['id'] ?? '');
            const has = owned.indexOf(id) >= 0;
            const row = new Node(`row_${id}`);
            row.layer = layer;
            row.addComponent(UITransform);
            row.setPosition(0, 130 - i * 92);
            this._listRoot.addChild(row);

            // 图标（未收集=暗色问号块）
            const icon = new Node('icon');
            icon.layer = layer;
            icon.addComponent(UITransform);
            icon.setPosition(-200, 0);
            const spr = icon.addComponent(Sprite)!;
            spr.sizeMode = Sprite.SizeMode.CUSTOM;
            icon.getComponent(UITransform)!.setContentSize(64, 64);
            if (has) {
                const frame = lib.get(`ui/icon_${id}`);
                if (frame) spr.spriteFrame = frame;
            }
            row.addChild(icon);

            // 文本
            const name = has ? String(r['name'] ?? id) : '？？？';
            const sub = has
                ? (this._tab === 'crop'
                    ? `季节：${(r['seasons'] as string[] | undefined)?.map((s) => ({ spring: '春', summer: '夏', autumn: '秋', winter: '冬' } as Record<string, string>)[s]).join('/') ?? '—'} · 生长 ${r['growDays']} 天`
                    : `稀有度 ${r['difficulty'] ?? '—'} · 卖 ${r['sellPrice'] ?? '—'} 金`)
                : '尚未收集';
            const nm = CodexPanel._labelNode(name, 26, has ? new Color(255, 235, 190) : new Color(150, 140, 125), -150, 14, layer);
            nm.getComponent(UITransform)!.setContentSize(400, 30);
            nm.getComponent(Label)!.overflow = Label.Overflow.SHRINK;
            row.addChild(nm);
            const sb = CodexPanel._labelNode(sub, 18, new Color(200, 185, 150), -150, -16, layer);
            sb.getComponent(UITransform)!.setContentSize(400, 24);
            sb.getComponent(Label)!.overflow = Label.Overflow.SHRINK;
            row.addChild(sb);
        });
    }

    private static _labelNode(text: string, size: number, color: Color, x: number, y: number, layer: number): Node {
        const n = new Node(`lbl${x}_${y}`);
        n.layer = layer;
        n.addComponent(UITransform);
        n.setPosition(x, y);
        const l = n.addComponent(Label)!;
        l.string = text;
        l.fontSize = size;
        l.lineHeight = size + 6;
        l.color = color;
        return n;
    }
}
