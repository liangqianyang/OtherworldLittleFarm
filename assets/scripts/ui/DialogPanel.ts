import { _decorator, Component, Node, UITransform, Graphics, Color, Label, Sprite } from 'cc';
const { ccclass } = _decorator;

import { DataManager } from '../core/DataManager';
import { SpriteLib } from '../core/SpriteLib';

/**
 * DialogPanel —— NPC 线性对话面板（阶段 5.3，MVP「2 NPC 线性对话」）。
 *
 * 底部对话框 + 名字 + 逐段正文 + 「▼」提示；点击任意处推进，末段关闭。
 * 台词来自 assets/data/catalogs/npc_dialogs.json（线性数组，无任务框架）。
 */
@ccclass('DialogPanel')
export class DialogPanel extends Component {
    private _nameLabel: Label = null!;
    private _textLabel: Label = null!;
    private _lines: string[] = [];
    private _idx = 0;

    /** 程序化创建（挂 farm Canvas，隐藏备用） */
    static create(parent: Node, layer: number): DialogPanel {
        const W = 1000, H = 150;
        const root = new Node('DialogPanel');
        root.layer = layer;
        root.addComponent(UITransform).setContentSize(W, H);
        parent.addChild(root);
        root.setPosition(0, -260);

        const comp = root.addComponent(DialogPanel)!;

        // 全屏遮罩（对话期吞点击；点击即推进）
        const mask = new Node('mask');
        mask.layer = layer;
        mask.addComponent(UITransform).setContentSize(1280, 720);
        const mg = mask.addComponent(Graphics)!;
        mg.fillColor = new Color(0, 0, 0, 90);
        mg.rect(-640, -360, 1280, 720);
        mg.fill();
        mask.on(Node.EventType.TOUCH_END, () => comp._advance());
        root.addChild(mask);

        // 对话框
        const g = root.addComponent(Graphics)!;
        g.fillColor = new Color(28, 24, 34, 248);
        g.strokeColor = new Color(242, 193, 78, 200);
        g.lineWidth = 3;
        g.roundRect(-W / 2, -H / 2, W, H, 14);
        g.fill();
        g.stroke();
        root.on(Node.EventType.TOUCH_END, () => comp._advance());

        // 名字（金）
        const nameN = new Node('npcName');
        nameN.layer = layer;
        nameN.addComponent(UITransform).setContentSize(400, 30);
        nameN.setPosition(-W / 2 + 140, H / 2 - 26);
        const nl = nameN.addComponent(Label)!;
        nl.fontSize = 24;
        nl.lineHeight = 28;
        nl.isBold = true;
        nl.color = new Color(242, 193, 78, 255);
        root.addChild(nameN);
        comp._nameLabel = nl;

        // 正文（最多 3 行）
        const textN = new Node('npcText');
        textN.layer = layer;
        textN.addComponent(UITransform).setContentSize(W - 120, 80);
        textN.setPosition(0, -14);
        const tl = textN.addComponent(Label)!;
        tl.fontSize = 21;
        tl.lineHeight = 27;
        tl.overflow = Label.Overflow.RESIZE_HEIGHT;
        tl.color = new Color(235, 232, 225, 255);
        root.addChild(textN);
        comp._textLabel = tl;

        // 继续提示 ▼
        const hint = DialogPanel._labelNode('▼ 点击继续', 16, W / 2 - 80, -H / 2 + 18, layer);
        root.addChild(hint);

        // NPC 立绘（素材就绪时赋图）
        const art = new Node('art');
        art.layer = layer;
        const spr = art.addComponent(UITransform);
        spr.setContentSize(96, 96);
        art.setPosition(-W / 2 + 70, 0);
        root.addChild(art);
        comp._artNode = art;

        root.active = false;
        return comp;
    }

    private _artNode: Node = null!;

    private static _labelNode(text: string, size: number, x: number, y: number, layer: number): Node {
        const n = new Node('lbl');
        n.layer = layer;
        n.addComponent(UITransform).setContentSize(300, size + 6);
        n.setPosition(x, y);
        const l = n.addComponent(Label)!;
        l.fontSize = size;
        l.lineHeight = size + 4;
        l.color = new Color(200, 196, 190, 255);
        l.string = text;
        return n;
    }

    /** 打开某 NPC 对话（数据缺行时静默忽略） */
    openNpc(npcId: string): void {
        const row = DataManager.inst.getRow('catalogs/npc_dialogs', npcId) as
            { id: string; name: string; lines: string[] } | null;
        if (!row || !row.lines || row.lines.length === 0) return;
        this._lines = row.lines;
        this._idx = 0;
        this._nameLabel.string = row.name;
        this._textLabel.string = this._lines[0];
        this._applyArt(npcId);
        this.node.active = true;
    }

    private _applyArt(npcId: string): void {
        const map: Record<string, string> = { gardener: 'npc/npc_gardener', gatekeeper: 'npc/npc_gatekeeper' };
        const path = map[npcId];
        if (!path) return;
        const lib = SpriteLib.inst;
        if (!lib.ready) { this.scheduleOnce(() => this._applyArt(npcId), 0.5); return; }
        const sf = lib.get(path);
        if (!sf) return;
        let sprNode = this._artNode.getChildByName('spr');
        if (!sprNode) {
            sprNode = new Node('spr');
            sprNode.layer = this._artNode.layer;
            sprNode.addComponent(UITransform).setContentSize(96, 96);
            this._artNode.addChild(sprNode);
        }
        const sprite = sprNode.getComponent(Sprite) || sprNode.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = sf;
        sprNode.active = true;
    }

    private _advance(): void {
        this._idx += 1;
        if (this._idx >= this._lines.length) {
            this.node.active = false;
            return;
        }
        this._textLabel.string = this._lines[this._idx];
    }
}
