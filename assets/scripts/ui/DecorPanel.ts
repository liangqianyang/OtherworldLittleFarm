import { _decorator, Component, Node, Label, Graphics, Color, UITransform, Sprite, EventTouch } from 'cc';
import { DataManager } from '../core/DataManager';
import { SpriteLib } from '../core/SpriteLib';
import { SfxLib } from '../core/SfxLib';

const { ccclass } = _decorator;

/**
 * DecorPanel —— 小屋预布置展示（§10 拍板③：首版只展示不可编辑，格子摆放二期）。
 * 全屏面板：木地板房间背景 + 按 furniture.json decorPos 摆放的家具精灵。
 */
@ccclass('DecorPanel')
export class DecorPanel extends Component {
    static create(parent: Node, layer: number): DecorPanel {
        const n = new Node('DecorPanel');
        n.layer = layer;
        n.addComponent(UITransform);
        const W = 820, H = 560;
        n.setPosition(0, 0);
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

        // 房间底板（木地板）
        const room = new Node('room');
        room.layer = layer;
        room.addComponent(UITransform);
        const rg = room.addComponent(Graphics)!;
        // 墙（上半，更暗）
        rg.fillColor = new Color(96, 78, 58);
        rg.rect(-W / 2 + 20, 60, W - 40, H / 2 - 90);
        rg.fill();
        // 地板（下半）
        rg.fillColor = new Color(139, 108, 74);
        rg.rect(-W / 2 + 20, -H / 2 + 30, W - 40, H / 2 - 60);
        rg.fill();
        // 木板横线
        rg.strokeColor = new Color(110, 85, 58);
        rg.lineWidth = 2;
        for (let y = -H / 2 + 60; y < H / 2 - 60; y += 26) {
            rg.moveTo(-W / 2 + 22, y);
            rg.lineTo(W / 2 - 22, y);
            rg.stroke();
        }
        // 踢脚线
        rg.strokeColor = new Color(70, 54, 38);
        rg.lineWidth = 4;
        rg.moveTo(-W / 2 + 20, 60);
        rg.lineTo(W / 2 - 20, 60);
        rg.stroke();
        n.addChild(room);

        // 外框 + 标题
        const frame = new Node('frame');
        frame.layer = layer;
        frame.addComponent(UITransform);
        const fg = frame.addComponent(Graphics)!;
        fg.strokeColor = new Color(242, 193, 78);
        fg.lineWidth = 5;
        fg.rect(-W / 2, -H / 2, W, H);
        fg.stroke();
        n.addChild(frame);

        const title = DecorPanel._labelNode('我 的 小 屋', 34, new Color(242, 220, 160), 0, H / 2 - 40, layer);
        n.addChild(title);

        // 关闭按钮 ×
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
        const xl = DecorPanel._labelNode('×', 30, new Color(255, 240, 210), 0, 0, layer);
        closeN.addChild(xl);
        closeN.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
            e.propagationStopped = true;
            SfxLib.inst.play('deny');
            n.active = false;
        });
        n.addChild(closeN);

        // 家具（按表摆放）
        const lib = SpriteLib.inst;
        const rows = DataManager.inst.getRows('catalogs/furniture');
        rows.forEach((r) => {
            const id = String(r['id'] ?? '');
            const px = Number(r['px'] ?? 32);
            const pos = (r['decorPos'] as number[]) ?? [0, 0];
            const fnode = new Node(`fur_${id}_${pos[0]}`);
            fnode.layer = layer;
            fnode.addComponent(UITransform);
            fnode.setPosition(pos[0], pos[1]);
            const spr = fnode.addComponent(Sprite)!;
            spr.sizeMode = Sprite.SizeMode.CUSTOM;
            const ut = fnode.getComponent(UITransform)!;
            ut.setContentSize(px * 3, px * 3);
            const frame2 = lib.get(`decor/${id}`);
            if (frame2) spr.spriteFrame = frame2;
            n.addChild(fnode);
            // 素材晚到补赋
            if (!frame2) {
                const iv = setInterval(() => {
                    const f3 = SpriteLib.inst.get(`decor/${id}`);
                    if (f3) { spr.spriteFrame = f3; clearInterval(iv); }
                }, 1200);
                (fnode as unknown as { _iv?: ReturnType<typeof setInterval> })._iv = iv;
            }
        });

        // 底部提示
        const tip = DecorPanel._labelNode('家具会随着收集越来越齐全 · 装扮编辑将在后续版本开放', 18, new Color(200, 185, 150), 0, -H / 2 + 36, layer);
        n.addChild(tip);

        n.active = false;
        return n.addComponent(DecorPanel)!;
    }

    protected onDestroy(): void {
        // 兜底清理素材补赋的轮询
        this.node.children.forEach((c) => {
            const iv = (c as unknown as { _iv?: ReturnType<typeof setInterval> })._iv;
            if (iv) clearInterval(iv);
        });
    }

    open(): void {
        this.node.active = true;
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
