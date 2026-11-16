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
    /** 消耗物品 */
    itemSpent: { itemId: string; count: number };
    /** 存档完成 */
    saveCompleted: { reason: string };
    /** 入侵预告（阶段 4 防守系统发出） */
    invasionWarning: { daysUntil: number };
    /** 每日天气 roll（阶段 2 接入） */
    weatherRolled: { weather: string };
    /** 农场地块变化（种植/浇水/收获/生长推进） */
    farmChanged: { action: string };
    /** 世界情境交互提示变化（M2 交互框架；null=提示消失） */
    interactPromptChanged: { objId: string; label: string; wx: number; wy: number } | null;
}

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
