import { _decorator, Component, Label, Node, UITransform, Graphics, Color } from 'cc';
const { ccclass } = _decorator;

import { EventBus } from '../core/EventBus';
import { TimeSystem } from '../core/TimeSystem';
import { GameApp } from '../app/GameApp';
import { EconomySystem } from '../systems/EconomySystem';
import { BackpackPanel } from './BackpackPanel';
import { BedtimeDialog } from './BedtimeDialog';
import { TutorialGuide } from './TutorialGuide';

/**
 * FarmHUD 顶栏（阶段 2.2 布局正式化）：
 * 中央信息（天/金币/种子/萝卜）· 左角 卖粮+买种子 · 右角 跳一天+存档+背包。
 * 1280×720 设计分辨率，按钮 110×52 距边 ≥24px（§17 安全区）。
 * 占位 Graphics 风格，阶段 2.5 换像素素材。
 */
@ccclass('FarmHUD')
export class FarmHUD extends Component {
    private _sellLabel: Label | null = null;
    private _buyLabel: Label | null = null;
    private _panel: BackpackPanel | null = null;
    private _bedtime: BedtimeDialog | null = null;

    onLoad(): void {
        EventBus.inst.on('dayAdvanced', this._refresh, this);
        EventBus.inst.on('itemGained', this._refresh, this);
        EventBus.inst.on('itemSpent', this._refresh, this);
        this._refresh({ dayIndex: TimeSystem.inst.dayIndex });
    }

    start(): void {
        // 左角：经济（出货/买种）—— x=-560 → 绝对边距 640-560-55=25px ≥24 ✓
        this._sellLabel = this._makeButton('卖粮(0)', -560, 0, () => this._onSell());
        this._buyLabel = this._makeButton('买种子', -560, -64, () => this._onBuySeed());

        // 右角：流程（背包=开关/跳天/存档）
        this._makeButton('背包', 560, 0, () => {
            if (!this._panel) return;
            if (this._panel.node.active) this._panel.close();
            else this._panel.open();
        });
        this._makeButton('跳一天', 560, -64, () => this._bedtime?.open());
        const saveLabel = this._makeButton('存档', 560, -128, () => {
            GameApp.inst?.persist('manual');
            this._flash(saveLabel, '已存档✓', '存档');
        });
        // 探险入口（阶段 3）：存档后切探险场景
        this._makeButton('出发探险', 560, -192, () => {
            GameApp.inst?.persist('adventure_start');
            GameApp.inst?.loadAdventure();
        });

        // 背包面板 + 睡觉弹窗 + 新档引导（挂 HUD 所在 Canvas）
        const canvas = this.node.parent;
        if (canvas) {
            this._panel = BackpackPanel.create(canvas, this.node.layer);
            this._bedtime = BedtimeDialog.create(canvas, this.node.layer);
            TutorialGuide.maybeStart(canvas, this.node.layer);
        }
    }

    onDestroy(): void {
        EventBus.inst.off('dayAdvanced', this._refresh, this);
        EventBus.inst.off('itemGained', this._refresh, this);
        EventBus.inst.off('itemSpent', this._refresh, this);
    }

    /** 存档按钮独立一行（-128），不与跳一天(-64)重叠 */
    private _makePersistButton(): void { /* 已并入 start() */ }

    /** 按钮文字闪现提示（存档/钱不够等即时反馈） */
    private _flash(label: Label, temp: string, restore: string): void {
        label.string = temp;
        this.scheduleOnce(() => {
            if (label.isValid) label.string = restore;
        }, 0.9);
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
            label.string = `第 ${TimeSystem.inst.dayIndex} 天 · 金币${inv['gold'] ?? 0} · 种子${inv['carrot_seed'] ?? 0} · 萝卜${inv['carrot'] ?? 0}`;
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
    private _makeButton(text: string, x: number, y: number, onTap: () => void): Label {
        const node = new Node(`btn_${text}`);
        node.layer = this.node.layer; // 继承 UI_2D，否则相机不渲染
        node.addComponent(UITransform).setContentSize(110, 52);
        node.setPosition(x, y);

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
