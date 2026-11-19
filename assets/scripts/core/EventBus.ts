/**
 * EventBus — 跨系统信号总线（core 四基座之一）。
 *
 * 约定（见 docs/design/game-design-draft.md §12 / 设计完善建议书 §7）：
 * 跨系统「信号」（dayAdvanced / itemGained / invasionWarning ...）走这里；
 * 数据查询走各 manager 单例直调，不要把总线当数据流滥用。
 */

/** 全项目跨系统事件清单（新增系统时在这里登记事件与载荷类型） */
export interface GameEvents {
    /** 游戏日推进（显式 endDay 或离线结算） */
    dayAdvanced: { dayIndex: number };
    /** 离线结算完成（冷启动时） */
    offlineSettled: { days: number };
    /** 获得物品（最小背包） */
    itemGained: { itemId: string; count: number };
    /** 消耗物品（fail=true 表示 attempted-but-failed，供音效/UI 区分） */
    itemSpent: { itemId: string; count: number; fail?: boolean };
    /** 存档完成 */
    saveCompleted: { reason: string };
    /** 入侵预告（阶段 4 防守系统发出） */
    invasionWarning: { daysUntil: number };
    /** 每日天气 roll（阶段 2 接入） */
    weatherRolled: { weather: string };
    /** 世界/农场/冒险/防守共用刷新信号。action 登记制：新增 action 在下方联合类型登记；
     *  载荷扩展只允许这里的可选字段，禁止私塞未登记字段（治理上帝事件）。 */
    farmChanged: { action: FarmChangedAction | (string & {}); itemId?: string; fishId?: string };
    /** 世界情境交互提示变化（M2 交互框架；null=提示消失） */
    interactPromptChanged: { objId: string; label: string; wx: number; wy: number } | null;
}

/** farmChanged 已登记 action 清单（保留 string 兜底，联合类型只为编辑器补全与审查） */
export type FarmChangedAction =
    | 'plant' | 'plant_offseason' | 'water' | 'harvest' | 'grow'
    | 'adventure_start' | 'adventure_move' | 'adventure_gather' | 'adventure_combat_start'
    | 'adventure_kill' | 'adventure_hurt' | 'adventure_win' | 'adventure_defeat' | 'adventure_flee' | 'adventure_settled'
    | 'weapon_upgraded'
    | 'defense_start' | 'defense_spawn' | 'defense_kill' | 'defense_hit' | 'defense_leak'
    | 'defense_wave_break' | 'defense_win' | 'defense_end'
    | 'seal_changed' | 'build_closed'
    | 'fish_caught' | 'fish_early' | 'fish_miss'
    | 'world_cleared' | 'world_pickup' | 'world_regrow'
    | 'sprites_ready' | 'bedtime' | 'pause_on' | 'pause_off';

type Handler<T> = (payload: T) => void;

/** 订阅项：保存 target 以便回调时正确绑定 this（组件方法直接订阅的前提） */
interface Binding {
    handler: Handler<never>;
    target: unknown;
}

export class EventBus {
    private static _instance: EventBus | null = null;
    static get inst(): EventBus {
        if (!this._instance) this._instance = new EventBus();
        return this._instance;
    }

    private _handlers = new Map<string, Set<Binding>>();

    on<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>, target?: unknown): void {
        let set = this._handlers.get(event);
        if (!set) {
            set = new Set();
            this._handlers.set(event, set);
        }
        // 防重复订阅：同 handler+target 只保留一份（场景重入/重复 bind 不再叠加回调）
        for (const b of set) {
            if (b.handler === (handler as Handler<never>) && b.target === target) return;
        }
        set.add({ handler: handler as Handler<never>, target });
    }

    off<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>, target?: unknown): void {
        const set = this._handlers.get(event);
        if (!set) return;
        for (const b of set) {
            if (b.handler === handler && (target === undefined || b.target === target)) {
                set.delete(b);
                break;
            }
        }
    }

    emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
        const set = this._handlers.get(event);
        if (!set) return;
        for (const b of set) {
            try {
                (b.handler as Handler<GameEvents[K]>).call(b.target, payload);
            } catch (err) {
                // 单个监听器异常不中断其他监听器（缺陷隔离），错误照常抛到控制台
                console.error(`[EventBus] 监听器处理 ${String(event)} 时抛错:`, err);
            }
        }
    }

    /** 仅调试/重开档时使用 */
    clear(): void {
        this._handlers.clear();
    }
}
