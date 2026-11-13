import { _decorator, Component, Node, UITransform, Graphics, Color, Label } from 'cc';
const { ccclass } = _decorator;

import { EventBus } from '../core/EventBus';
import { GameApp } from '../app/GameApp';
import { TimeSystem } from '../core/TimeSystem';
import { FarmSystem } from '../gameplay/farm/FarmSystem';

/**
 * TutorialGuide —— 十分钟引导链（阶段 2.4，§13 MVP 清单）。
 *
 * 五步任务：种 1 块 → 浇水 → 睡一晚 → 收获 → 卖钱。
 * 完成判定直接吃 farmChanged(action) / itemGained / dayAdvanced 事件载荷，零轮询。
 * 全部完成后写 __guide=-1 存档自毁，永不再现。
 * 设计原则（§17）：目标一句话、金色横幅不挡地块、无文字墙。
 *
 * 存档约定：inventory['__guide'] 为元数据（-1=完成），前缀 __ 非物品，背包 UI 过滤。
 */
@ccclass('TutorialGuide')
export class TutorialGuide extends Component {
    private _label: Label = null!;
    private _badgeLabel: Label = null!;
    private _arrow: Node = null!;
    private _step = 0;

    onLoad(): void {
        EventBus.inst.on('farmChanged', this._onFarmChanged, this);
        EventBus.inst.on('itemGained', this._onItem, this);
        EventBus.inst.on('dayAdvanced', this._onDay, this);
    }

    onDestroy(): void {
        EventBus.inst.off('farmChanged', this._onFarmChanged, this);
        EventBus.inst.off('itemGained', this._onItem, this);
        EventBus.inst.off('dayAdvanced', this._onDay, this);
    }

    /** GameApp 启动时调用：完成过（__guide=-1）则不创建 */
    static maybeStart(parent: Node, layer: number): void {
        const app = GameApp.inst;
        if (!app) return;
        if (app.inventory['__guide'] === -1) return;
        const node = new Node('TutorialGuide');
        node.layer = layer; // 程序化节点铁律（pitfalls #1）
        node.addComponent(UITransform);
        parent.addChild(node);
        node.addComponent(TutorialGuide);
    }

    start(): void {
        // 底部横幅（不挡地块与顶栏）
        const W = 620, H = 74;
        this.node.addComponent(UITransform).setContentSize(W, H);
        this.node.setPosition(0, -300);

        const g = this.node.addComponent(Graphics)!;
        g.fillColor = new Color(30, 26, 22, 220);
        g.strokeColor = new Color(255, 214, 90, 200); // 金色描边=任务感
        g.lineWidth = 3;
        g.roundRect(-W / 2, -H / 2, W, H, 14);
        g.fill();
        g.stroke();

        const lblNode = new Node('lbl');
        lblNode.layer = this.node.layer;
        lblNode.addComponent(UITransform);
        this._label = lblNode.addComponent(Label)!;
        this._label.fontSize = 24;
        this._label.lineHeight = 30;
        lblNode.setPosition(0, 0);
        this.node.addChild(lblNode);

        const badge = new Node('badge');
        badge.layer = this.node.layer;
        badge.addComponent(UITransform);
        badge.setPosition(W / 2 - 52, H / 2 - 20);
        this._badgeLabel = badge.addComponent(Label)!;
        this._badgeLabel.fontSize = 18;
        this.node.addChild(badge);

        // 指示箭头（横幅上方，指向上方目标区域）
        this._arrow = new Node('arrow');
        this._arrow.layer = this.node.layer;
        this._arrow.addComponent(UITransform);
        const ag = this._arrow.addComponent(Graphics)!;
        ag.fillColor = new Color(255, 214, 90, 230);
        ag.moveTo(-14, 0);
        ag.lineTo(14, 0);
        ag.lineTo(0, 22);
        ag.close();
        ag.fill();
        this._arrow.setPosition(0, -255);
        this.node.parent!.addChild(this._arrow);

        this._refresh();
    }

    private _onFarmChanged({ action }: { action: string }): void {
        // 老档可能已有苗：step0 接受任意"已种地块存在"或新播种事件
        if (this._step === 0 && (action === 'plant' || FarmSystem.inst.farm.plots.some((p) => p))) this._advance();
        else if (this._step === 1 && action === 'water') this._advance();
        else if (this._step === 3 && action === 'harvest') this._advance();
    }

    private _onDay(): void {
        if (this._step === 2 && TimeSystem.inst.dayIndex >= 2) this._advance();
    }

    private _onItem({ itemId }: { itemId: string }): void {
        // step4 卖粮 = 收到金币；step3 兜底 = 收到胡萝卜（harvest 事件漏接时）
        if (this._step === 4 && itemId === 'gold') this._advance();
        else if (this._step === 3 && itemId === 'carrot') this._advance();
    }

    private _advance(): void {
        this._step += 1;
        if (this._step >= TutorialGuide.STEP_TEXTS.length) {
            this._finish();
            return;
        }
        GameApp.inst?.persist('tutorialStep');
        this._refresh();
    }

    private _refresh(): void {
        this._label.string = `任务：${TutorialGuide.STEP_TEXTS[this._step]}`;
        this._badgeLabel.string = `${this._step + 1}/${TutorialGuide.STEP_TEXTS.length}`;
    }

    private _finish(): void {
        const app = GameApp.inst;
        if (app) {
            app.inventory['__guide'] = -1;
            app.persist('tutorialDone');
        }
        this._label.string = '引导完成！农场生活正式开始';
        this._badgeLabel.string = '✓';
        this.scheduleOnce(() => {
            this._arrow.destroy();
            this.node.destroy();
        }, 2.0);
    }

    private static readonly STEP_TEXTS: readonly string[] = [
        '点击一块空地，种下种子',
        '点击种好的地块，浇水',
        '点右上角「跳一天」，睡一觉',
        '作物金黄后，点击地块收获',
        '点左上角「卖粮」，把萝卜换成金币',
    ];
}
