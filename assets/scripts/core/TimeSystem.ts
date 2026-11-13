import { EventBus } from './EventBus';

/** 游戏内时段（阶段 2 日程/钓鱼条件会用到） */
export enum DayPhase {
    Morning = 'morning',
    Day = 'day',
    Evening = 'evening',
    Night = 'night',
}

/**
 * TimeSystem —— dayIndex 是全项目主时钟（core 四基座之一）。
 *
 * 在线：玩家「结束一天」显式推进（game-design-draft.md §4.1）；
 * 离线：冷启动按整天粒度结算，作物只长不枯（2026-11-13 拍板·方案 B）。
 *
 * 红线（§12）：
 * - 时间倒流（now <= lastSaveRealTime）一律按 0 处理；
 * - 本系统只产出「离线天数」，防守事件绝不在线外判定失守（顺延是防守系统的职责）；
 * - 真实时间一律来自平台适配层时间源，本类不使用 Date.now()。
 */
export class TimeSystem {
    private static _instance: TimeSystem | null = null;
    static get inst(): TimeSystem {
        if (!this._instance) this._instance = new TimeSystem();
        return this._instance;
    }

    /** 可调参数：多少真实时长折算 1 个离线游戏日（拍板为 12-24h 上限区间，起点值 12h/天） */
    static readonly OFFLINE_DAY_MS = 12 * 60 * 60 * 1000;
    /** 离线结算上限（防止长期离线一次跳走太多天） */
    static readonly OFFLINE_MAX_DAYS = 2;

    /** 季节长度（§6.2：每季 14 天轮转；crops.seasons 用英文键） */
    static readonly SEASON_DAYS = 14;
    static readonly SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
    static readonly SEASON_NAMES: Record<string, string> = {
        spring: '春', summer: '夏', autumn: '秋', winter: '冬',
    };

    /** 当前游戏日，从第 1 天开始 */
    dayIndex = 1;
    phase: DayPhase = DayPhase.Morning;

    /** 当前季节（day1 起春→夏→秋→冬循环；§6.2 日历解耦真实时间） */
    get season(): string {
        const i = Math.floor((this.dayIndex - 1) / TimeSystem.SEASON_DAYS) % TimeSystem.SEASONS.length;
        return TimeSystem.SEASONS[i];
    }

    /** 当前季节中文名（HUD 显示用） */
    get seasonName(): string {
        return TimeSystem.SEASON_NAMES[this.season] ?? this.season;
    }

    /** 作物是否当季可种（crops.seasons 空数组视为全年可种） */
    static cropInSeason(seasons: unknown): boolean {
        const list = Array.isArray(seasons) ? seasons : [];
        if (list.length === 0) return true;
        return list.indexOf(TimeSystem.inst.season) >= 0;
    }

    /** 在线显式推进一天（「结束一天」按钮/流程调用） */
    endDay(): void {
        this.dayIndex += 1;
        this.phase = DayPhase.Morning;
        EventBus.inst.emit('dayAdvanced', { dayIndex: this.dayIndex });
    }

    /**
     * 冷启动离线结算（GameApp 启动时调用一次）。
     * @param lastRealTimeMs 上次存档记录的真实时间戳
     * @param nowMs 平台时间源当前时间
     * @returns 结算天数（0 = 不结算：时间倒流/间隔不足）
     */
    settleOffline(lastRealTimeMs: number, nowMs: number): number {
        if (!(nowMs > lastRealTimeMs)) return 0; // 倒流或异常 → 按 0
        const gap = nowMs - lastRealTimeMs;
        const days = Math.min(Math.floor(gap / TimeSystem.OFFLINE_DAY_MS), TimeSystem.OFFLINE_MAX_DAYS);
        if (days <= 0) return 0;
        this.dayIndex += days;
        EventBus.inst.emit('offlineSettled', { days });
        EventBus.inst.emit('dayAdvanced', { dayIndex: this.dayIndex });
        return days;
    }

    /** 重开档（调试用） */
    reset(): void {
        this.dayIndex = 1;
        this.phase = DayPhase.Morning;
    }
}
