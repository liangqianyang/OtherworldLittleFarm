import { _decorator, Component, EventKeyboard, input, Input, KeyCode, director } from 'cc';
const { ccclass } = _decorator;

import { GameApp } from '../app/GameApp';
import { TimeSystem } from '../core/TimeSystem';
import { AdventureSystem } from '../gameplay/adventure/AdventureSystem';

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
        // 自动化桥：把实例挂到 window，供浏览器自动化（bsk evaluate）直接调用
        // （预览页 input 层拦截合成事件，但 JS 直调组件方法不经过 input 层）
        (window as any).__debug = this;
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
        app.giveItem('carrot', 1);
        const n = app.saveData?.inventory['carrot'] ?? 0;
        console.log(`[Debug] carrot ×1（累计 ${n}）`);
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

    // ===== 探险自动化驱动（MCP execute_component_method 入口，引擎侧直调绕开 DOM input） =====

    /** 打印探险状态快照 */
    advDump(): void {
        const s = AdventureSystem.inst;
        const r = s.run;
        console.log(`[Debug] adv run=${r ? `room=${r.roomIdx} bag=${JSON.stringify(r.bag)} cnt=${r.bagCount} hp=${r.playerHp}` : 'null'} battle=${s.battle ? `${s.battle.monsterName} hp=${s.battle.hp}` : 'null'} 场景=${director.getScene()?.name}`);
    }

    /** 出发探险（农场场景也可调：直接起 run，不切场景） */
    advStart(): void {
        AdventureSystem.inst.start('old_wood');
        this.advDump();
    }

    /** 采集（spotIdx=-1 时自动找当前房第一个未采的点） */
    advGather(spotIdx: number = -1): void {
        const s = AdventureSystem.inst;
        const r = s.run;
        if (!r) { console.log('[Debug] gather → no run'); return; }
        let idx = Number(spotIdx);
        if (idx < 0) {
            const room = s.room(r.roomIdx);
            const spots = room?.spots ?? [];
            idx = spots.findIndex((_, i) => !s.spotEmptied(r.roomIdx, i));
        }
        const got = s.gather(r.roomIdx, idx);
        console.log(`[Debug] gather spot${idx} → ${got}`);
    }

    /** 前进（choice 默认 0） */
    advAdvance(choice: number = 0): void {
        AdventureSystem.inst.advance(Number(choice));
        this.advDump();
    }

    /** 攻击一次（返回 hit/win/lose） */
    advAttack(): void {
        if (!AdventureSystem.inst.battle) AdventureSystem.inst.startBattle();
        const r = AdventureSystem.inst.playerAttack();
        console.log(`[Debug] attack → ${r}`);
        this.advDump();
    }

    /** 撤退（弃战） */
    advFlee(): void {
        AdventureSystem.inst.battle = null;
        console.log('[Debug] fled');
        this.advDump();
    }

    /** 结算撤回（并入农场背包+跳一天+写档；回农场由调用方切场景） */
    advSettle(): void {
        AdventureSystem.inst.settle();
        console.log(`[Debug] settled, inventory=${JSON.stringify(GameApp.inst?.saveData?.inventory)}`);
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
