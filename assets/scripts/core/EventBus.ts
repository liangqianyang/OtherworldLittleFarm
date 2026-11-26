/**
 * 《异界小农场 2.0》阶段 0：强类型事件总线
 * 特性：防重复注册、单监听异常隔离（不连累同事件其余监听）、支持按 target 批量清理防内存泄漏。
 */

import type { SeasonId, WeatherId } from './GameTypes';

export interface GameEventMap {
    dayAdvanced: { dayIndex: number; year: number; season: SeasonId; solarTermId: string; weather: WeatherId };
    offlineSettled: { daysElapsed: number; newDayIndex: number };
    inventoryChanged: { itemId: string; delta: number; total: number };
    goldChanged: { delta: number; total: number };
    defenseWarning: { targetDay: number; hintText: string };
    saveCompleted: { reason: string; timestampMs: number };
    sceneModeChanged: { mode: 'overworld' | 'indoor' | 'dungeon' | 'defense' | 'island' };
}

type Handler<T> = (payload: T) => void;

interface ListenerEntry<T> {
    handler: Handler<T>;
    target?: object;
}

export class EventBus {
    private static _inst: EventBus | null = null;
    private readonly _map = new Map<keyof GameEventMap, ListenerEntry<unknown>[]>();

    public static get inst(): EventBus {
        if (!this._inst) this._inst = new EventBus();
        return this._inst;
    }

    public on<K extends keyof GameEventMap>(event: K, handler: Handler<GameEventMap[K]>, target?: object): void {
        let list = this._map.get(event);
        if (!list) {
            list = [];
            this._map.set(event, list);
        }
        const exists = list.some((e) => e.handler === handler && e.target === target);
        if (!exists) {
            list.push({ handler: handler as Handler<unknown>, target });
        }
    }

    public off<K extends keyof GameEventMap>(event: K, handler: Handler<GameEventMap[K]>, target?: object): void {
        const list = this._map.get(event);
        if (!list) return;
        for (let i = list.length - 1; i >= 0; i--) {
            if (list[i].handler === handler && list[i].target === target) {
                list.splice(i, 1);
            }
        }
    }

    /** 在 Cocos Component.onDestroy() 中一键注销该组件所有监听 */
    public offTarget(target: object): void {
        this._map.forEach((list) => {
            for (let i = list.length - 1; i >= 0; i--) {
                if (list[i].target === target) {
                    list.splice(i, 1);
                }
            }
        });
    }

    public emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
        const list = this._map.get(event);
        if (!list || list.length === 0) return;
        const snapshot = list.slice();
        for (const entry of snapshot) {
            try {
                entry.handler.call(entry.target, payload);
            } catch (err) {
                console.error(`[EventBus] listener error on "${String(event)}":`, err);
            }
        }
    }

    public clear(): void {
        this._map.clear();
    }
}
