import { _decorator, Component, Label, Node, UITransform, Graphics, Color } from 'cc';
const { ccclass } = _decorator;

import { EventBus } from '../core/EventBus';
import { TimeSystem } from '../core/TimeSystem';
import { GameApp } from '../app/GameApp';

/**
 * FarmHUD 最小版：顶栏 第X天 · 种子×N · 胡萝卜×M + 跳一天/存档 按钮。
 * 按钮先于键盘存在——真机无键盘，触屏是第一交互（DebugPanel 键盘仅桌面调试）。
 * 阶段 2 会替换为完整顶栏（金币/体力/设置/结束一天 bedtime 流程）。
 */
@ccclass('FarmHUD')
export class FarmHUD extends Component {
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
    }

    onDestroy(): void {
        EventBus.inst.off('dayAdvanced', this._refresh, this);
        EventBus.inst.off('itemGained', this._refresh, this);
        EventBus.inst.off('itemSpent', this._refresh, this);
    }

    private _refresh(_p: { dayIndex: number }): void {
        const inv = GameApp.inst?.inventory ?? {};
        const label = this.getComponent(Label);
        if (label) label.string = `第 ${TimeSystem.inst.dayIndex} 天 · 种子×${inv['carrot_seed'] ?? 0} · 胡萝卜×${inv['carrot'] ?? 0}`;
    }

    /** 程序化占位按钮（Graphics，同 PlotView 风格；阶段 2 换像素素材） */
    private _makeButton(text: string, x: number, onTap: () => void): void {
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
    }
}
