import { _decorator, Component, Node, UITransform, Graphics, Color, Label } from 'cc';
const { ccclass } = _decorator;

import { EventBus } from '../core/EventBus';
import { TimeSystem } from '../core/TimeSystem';
import { GameApp } from '../app/GameApp';
import { FarmSystem } from '../gameplay/farm/FarmSystem';

/**
 * BedtimeDialog —— 结束一天确认弹窗（阶段 2.3）。
 *
 * 点「睡觉」→ 弹窗列出今日未完成事项提醒（没浇水的苗/可收的作物）→ 确认后 endDay。
 * 有未收的成熟作物时二次确认（防手滑跳过收获日）。
 * 占位 Graphics 风格，阶段 2.5 换像素素材。
 */
@ccclass('BedtimeDialog')
export class BedtimeDialog extends Component {
    private _infoLabel: Label = null!;
    private _confirmBtnLabel: Label = null!;
    private _pendingMature = 0;

    /** 程序化创建（挂 farm Canvas，隐藏备用） */
    static create(parent: Node, layer: number): BedtimeDialog {
        const W = 520, H = 360;
        const root = new Node('BedtimeDialog');
        root.layer = layer;
        root.addComponent(UITransform).setContentSize(W, H);
        parent.addChild(root);

        // 全屏遮罩（吞点击防穿透）
        const mask = new Node('mask');
        mask.layer = layer;
        mask.addComponent(UITransform).setContentSize(1280, 720);
        const mg = mask.addComponent(Graphics)!;
        mg.fillColor = new Color(0, 0, 0, 160);
        mg.rect(-640, -360, 1280, 720);
        mg.fill();
        const swallow = (): void => { /* 拦截 */ };
        mask.on(Node.EventType.TOUCH_START, swallow);
        mask.on(Node.EventType.TOUCH_END, swallow);
        root.addChild(mask);

        // 面板
        const g = root.addComponent(Graphics)!;
        g.fillColor = new Color(30, 26, 22, 245);
        g.strokeColor = new Color(255, 255, 255, 130);
        g.lineWidth = 3;
        g.roundRect(-W / 2, -H / 2, W, H, 16);
        g.fill();
        g.stroke();

        root.addChild(BedtimeDialog._labelNode('该睡觉了…', 26, 0, H / 2 - 46, layer));
        const info = BedtimeDialog._labelNode('', 20, 0, 30, layer);
        root.addChild(info);
        const confirm = BedtimeDialog._buttonNode('睡觉', -110, -100, () => comp._onConfirm(), layer);
        root.addChild(confirm);
        root.addChild(BedtimeDialog._buttonNode('再玩会儿', 110, -100, () => comp.close(), layer));

        const comp = root.addComponent(BedtimeDialog);
        comp._infoLabel = info.getComponent(Label)!;
        comp._confirmBtnLabel = confirm.getChildByName('label')!.getComponent(Label)!;
        root.active = false;
        return comp;
    }

    open(): void {
        // 扫农场：没浇水的苗 / 可以收的作物
        const farm = FarmSystem.inst.farm;
        let unwatered = 0;
        this._pendingMature = 0;
        for (const p of farm.plots) {
            if (!p) continue;
            if (TimeSystem.inst.dayIndex - p.wateredOnDay >= 1 && !this._mature(p)) unwatered++;
            if (this._mature(p)) this._pendingMature++;
        }

        const lines: string[] = [];
        if (this._pendingMature > 0) lines.push(`有 ${this._pendingMature} 块作物熟了没收！`);
        if (unwatered > 0) lines.push(`有 ${unwatered} 块苗今天还没浇水。`);
        this._infoLabel.string = lines.length > 0 ? lines.join('\n') : '今天辛劳了，好好休息吧。';
        this._confirmBtnLabel.string = this._pendingMature > 0 ? '先睡觉(明天收)' : '睡觉';
        this.node.active = true;
    }

    close(): void {
        this.node.active = false;
    }

    private _mature(p: { growth: number; cropId: string }): boolean {
        return FarmSystem.inst.isMature(p as never);
    }

    private _onConfirm(): void {
        this.close();
        TimeSystem.inst.endDay();
        GameApp.inst?.persist('bedtime');
        EventBus.inst.emit('farmChanged', { action: 'bedtime' });
    }

    // —— UI 小工具（layer 必传：程序化节点不设层 = UI 相机看不见） ——
    private static _labelNode(text: string, fontSize: number, x: number, y: number, layer: number): Node {
        const n = new Node('lbl');
        n.layer = layer;
        n.addComponent(UITransform);
        n.setPosition(x, y);
        const l = n.addComponent(Label)!;
        l.fontSize = fontSize;
        l.lineHeight = fontSize + 8;
        l.string = text;
        return n;
    }

    private static _buttonNode(text: string, x: number, y: number, onTap: () => void, layer: number): Node {
        const n = new Node('btn');
        n.layer = layer;
        n.addComponent(UITransform).setContentSize(150, 56);
        n.setPosition(x, y);
        const g = n.addComponent(Graphics)!;
        g.fillColor = new Color(60, 48, 38, 255);
        g.strokeColor = new Color(255, 255, 255, 90);
        g.lineWidth = 2;
        g.roundRect(-75, -28, 150, 56, 10);
        g.fill();
        g.stroke();
        const lbl = BedtimeDialog._labelNode(text, 22, 0, 0, layer);
        lbl.name = 'label';
        n.addChild(lbl);
        n.on(Node.EventType.TOUCH_END, onTap);
        return n;
    }
}
