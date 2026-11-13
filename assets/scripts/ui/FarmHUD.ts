import { _decorator, Component, Label, Node, UITransform, Graphics, Color } from 'cc';
const { ccclass } = _decorator;

import { EventBus } from '../core/EventBus';
import { TimeSystem } from '../core/TimeSystem';
import { GameApp } from '../app/GameApp';
import { EconomySystem } from '../systems/EconomySystem';

/**
 * FarmHUD 顶栏（阶段 2.1）：第X天 · 金币 · 种子 · 胡萝卜 + 跳一天/存档/卖粮/买种子 按钮。
 * 占位 Graphics 风格，阶段 2.5 换像素素材；布局正式化在 2.2 完整顶栏。
 */
@ccclass('FarmHUD')
export class FarmHUD extends Component {
    private _sellLabel: Label | null = null;
    private _buyLabel: Label | null = null;

    onLoad(): void {
        EventBus.inst.on('dayAdvanced', this._refresh, this);
        EventBus.inst.on('itemGained', this._refresh, this);
        EventBus.inst.on('itemSpent', this._refresh, this);
        this._refresh({ dayIndex: TimeSystem.inst.dayIndex });
    }

    start(): void {
        this._makeButton('跳一天', 360, () => {
            TimeSystem.inst.endDay();
            GameApp.inst?.persist('endDay'); // 关键节点落盘（§12）
        });
        this._makeButton('存档', 500, () => GameApp.inst?.persist('manual'));

        // 经济闭环（阶段 2.1）：卖粮/买种子
        this._sellLabel = this._makeButton('卖粮(0)', -490, () => this._onSell());
        this._buyLabel = this._makeButton('买种子', -365, () => this._onBuySeed());
        this._refreshShops();
    }

    onDestroy(): void {
        EventBus.inst.off('dayAdvanced', this._refresh, this);
        EventBus.inst.off('itemGained', this._refresh, this);
        EventBus.inst.off('itemSpent', this._refresh, this);
    }

    private _onSell(): void {
        const app = GameApp.inst;
        if (!app) return;
        const total = EconomySystem.inst.sellAllProducts(app.inventory);
        if (total > 0) app.persist('sell');
    }

    private _onBuySeed(): void {
        const app = GameApp.inst;
        if (!app) return;
        if (EconomySystem.inst.buySeed('carrot_seed', app.inventory)) {
            app.persist('buySeed');
        } else if (this._buyLabel) {
            const prev = this._buyLabel.string;
            this._buyLabel.string = '钱不够';
            this.scheduleOnce(() => {
                if (this._buyLabel && this._buyLabel.isValid) this._buyLabel.string = prev;
            }, 0.8);
        }
    }

    private _refresh(_p: { dayIndex: number }): void {
        const inv = GameApp.inst?.inventory ?? {};
        const label = this.getComponent(Label);
        if (label) {
            label.string = `第 ${TimeSystem.inst.dayIndex} 天 · 金币×${inv['gold'] ?? 0} · 种子×${inv['carrot_seed'] ?? 0} · 胡萝卜×${inv['carrot'] ?? 0}`;
        }
        this._refreshShops();
    }

    private _refreshShops(): void {
        const inv = GameApp.inst?.inventory ?? {};
        const carrots = inv['carrot'] ?? 0;
        if (this._sellLabel?.isValid) this._sellLabel.string = `卖粮(${carrots})`;
        const price = EconomySystem.inst.getBuyPrice('carrot_seed');
        if (this._buyLabel?.isValid && price !== null) this._buyLabel.string = `买种子${price}金`;
    }

    /** 程序化占位按钮（Graphics，同 PlotView 风格）；返回文本 Label 供动态刷新 */
    private _makeButton(text: string, x: number, onTap: () => void): Label {
        const node = new Node(`btn_${text}`);
        node.layer = this.node.layer; // 继承 UI_2D，否则相机不渲染
        node.addComponent(UITransform).setContentSize(110, 52);
        node.setPosition(x, 0);

        const g = node.addComponent(Graphics)!;
        g.fillColor = new Color(60, 48, 38, 255);
        g.strokeColor = new Color(255, 255, 255, 90);
        g.lineWidth = 2;
        g.roundRect(-55, -26, 110, 52, 10);
        g.fill();
        g.stroke();

        const labelNode = new Node('label');
        labelNode.layer = this.node.layer;
        labelNode.addComponent(UITransform);
        const l = labelNode.addComponent(Label)!;
        l.fontSize = 22;
        l.string = text;
        node.addChild(labelNode);

        node.on(Node.EventType.TOUCH_END, onTap, this);
        this.node.addChild(node);
        return l;
    }
}
