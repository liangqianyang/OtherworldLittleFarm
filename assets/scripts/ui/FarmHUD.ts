import { _decorator, Component, Label } from 'cc';
const { ccclass } = _decorator;

import { EventBus } from '../core/EventBus';
import { TimeSystem } from '../core/TimeSystem';
import { GameApp } from '../app/GameApp';

/**
 * FarmHUD 最小版（阶段1验收用）：顶栏显示 第X天 · 胡萝卜×N。
 * 阶段2 会替换为完整顶栏（金币/体力/设置/结束一天按钮）。
 */
@ccclass('FarmHUD')
export class FarmHUD extends Component {
    onLoad(): void {
        EventBus.inst.on('dayAdvanced', this._refresh, this);
        EventBus.inst.on('itemGained', this._refresh, this);
        this._refresh({ dayIndex: TimeSystem.inst.dayIndex });
    }

    onDestroy(): void {
        EventBus.inst.off('dayAdvanced', this._refresh, this);
        EventBus.inst.off('itemGained', this._refresh, this);
    }

    private _refresh(_p: { dayIndex: number }): void {
        const carrots = GameApp.inst?.saveData?.inventory['carrot'] ?? 0;
        const label = this.getComponent(Label);
        if (label) label.string = `第 ${TimeSystem.inst.dayIndex} 天 · 胡萝卜×${carrots}`;
    }
}
