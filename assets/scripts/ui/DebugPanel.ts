import { _decorator, Component, EventKeyboard, input, Input, KeyCode } from 'cc';
const { ccclass } = _decorator;

import { GameApp } from '../app/GameApp';
import { TimeSystem } from '../core/TimeSystem';

/**
 * DebugPanel —— 第一周就要的调试红利（建议书 §7）：
 * 跳天 / 加测试物品 / 打印存档 / 手动写档。
 *
 * 两个入口：
 * - 桌面预览键盘：1=跳一天 2=+测试物品 3=打印存档 0=立即写档
 * - MCP 自动化验证：execute_component_method 直接调 skipDay()/addTestItem()/dumpSave()/persistNow()
 *   （这就是「杀进程重进存档还原」验收的自动化驱动入口）
 * 触屏调试按钮在阶段 2 HUD 接入。
 */
@ccclass('DebugPanel')
export class DebugPanel extends Component {
    onLoad(): void {
        input.on(Input.EventType.KEY_DOWN, this._onKey, this);
    }

    onDestroy(): void {
        input.off(Input.EventType.KEY_DOWN, this._onKey, this);
    }

    /** 跳一天（正式「结束一天」流程在阶段 2 做 bedtime 结算） */
    skipDay(): void {
        TimeSystem.inst.endDay();
        console.log(`[Debug] 跳天 → 第 ${TimeSystem.inst.dayIndex} 天`);
    }

    /** +1 测试物品（走最小背包 + itemGained 信号） */
    addTestItem(): void {
        const app = GameApp.inst;
        if (!app) return;
        app.giveItem('debug.crop.test', 1);
        const n = app.saveData?.inventory['debug.crop.test'] ?? 0;
        console.log(`[Debug] debug.crop.test ×1（累计 ${n}）`);
    }

    /** 打印当前存档内容 */
    dumpSave(): void {
        console.log(`[Debug] 存档内容：${JSON.stringify(GameApp.inst?.saveData ?? null)}`);
    }

    /** 立即写档（杀进程重进验收用：写档 → 杀进程 → 重开 → dumpSave 对账） */
    persistNow(): void {
        GameApp.inst?.persist('debug');
        console.log('[Debug] 已写档');
    }

    private _onKey(event: EventKeyboard): void {
        switch (event.keyCode) {
            case KeyCode.DIGIT1:
                this.skipDay();
                break;
            case KeyCode.DIGIT2:
                this.addTestItem();
                break;
            case KeyCode.DIGIT3:
                this.dumpSave();
                break;
            case KeyCode.DIGIT0:
                this.persistNow();
                break;
            default:
                break;
        }
    }
}
