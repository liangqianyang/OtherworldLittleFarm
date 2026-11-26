/**
 * 《异界小农场 2.0》阶段 0：48 天二十四节气时钟与离线结算系统
 * - 1 年 = 4 季 × 12 游戏日 = 48 天；每 2 天推进 1 个节气（完整二十四节气）。
 * - 离线红线：仅冷启动结算离线时长；上限 24 小时（最多推进 2 游戏日）；时间倒流按 0 处理；防守夜离线绝不判定失守。
 */

import type { PlantDef, SeasonId, WeatherId } from './GameTypes';
import { EventBus } from './EventBus';

export interface SolarTermInfo {
    index: number;      // 0..23
    id: string;
    name: string;
    season: SeasonId;
}

export const SOLAR_TERMS_24: readonly SolarTermInfo[] = [
    // 春（Day 1-12）
    { index: 0, id: 'lichun', name: '立春', season: 'spring' },
    { index: 1, id: 'yushui', name: '雨水', season: 'spring' },
    { index: 2, id: 'jingzhe', name: '惊蛰', season: 'spring' },
    { index: 3, id: 'chunfen', name: '春分', season: 'spring' },
    { index: 4, id: 'qingming', name: '清明', season: 'spring' },
    { index: 5, id: 'guyu', name: '谷雨', season: 'spring' },
    // 夏（Day 13-24）
    { index: 6, id: 'lixia', name: '立夏', season: 'summer' },
    { index: 7, id: 'xiaoman', name: '小满', season: 'summer' },
    { index: 8, id: 'mangzhong', name: '芒种', season: 'summer' },
    { index: 9, id: 'xiazhi', name: '夏至', season: 'summer' },
    { index: 10, id: 'xiaoshu', name: '小暑', season: 'summer' },
    { index: 11, id: 'dashu', name: '大暑', season: 'summer' },
    // 秋（Day 25-36）
    { index: 12, id: 'liqiu', name: '立秋', season: 'autumn' },
    { index: 13, id: 'chushu', name: '处暑', season: 'autumn' },
    { index: 14, id: 'bailu', name: '白露', season: 'autumn' },
    { index: 15, id: 'qiufen', name: '秋分', season: 'autumn' },
    { index: 16, id: 'hanlu', name: '寒露', season: 'autumn' },
    { index: 17, id: 'shuangjiang', name: '霜降', season: 'autumn' },
    // 冬（Day 37-48）
    { index: 18, id: 'lidong', name: '立冬', season: 'winter' },
    { index: 19, id: 'xiaoxue', name: '小雪', season: 'winter' },
    { index: 20, id: 'daxue', name: '大雪', season: 'winter' },
    { index: 21, id: 'dongzhi', name: '冬至', season: 'winter' },
    { index: 22, id: 'xiaohan', name: '小寒', season: 'winter' },
    { index: 23, id: 'dahan', name: '大寒', season: 'winter' },
] as const;

export const DAYS_PER_YEAR = 48;
export const DAYS_PER_SEASON = 12;
export const DAYS_PER_SOLAR_TERM = 2;
export const OFFLINE_MS_PER_GAME_DAY = 12 * 60 * 60 * 1000; // 每 12 小时真实离线推进 1 游戏日
export const OFFLINE_MAX_DAYS = 2;                          // 单次离线最多推进 2 游戏日（24h 封顶）

export interface CalendarDate {
    dayIndex: number;        // 从 1 开始递增的绝对游戏日
    year: number;            // 第几年（从 1 开始）
    dayOfYear: number;       // 1..48
    season: SeasonId;
    dayOfSeason: number;     // 1..12
    solarTerm: SolarTermInfo;
}

export class TimeSystem {
    private _dayIndex = 1;
    private _weather: WeatherId = 'sunny';
    private readonly _nowProvider: () => number;

    constructor(nowProvider: () => number = () => Date.now()) {
        this._nowProvider = nowProvider;
    }

    public get dayIndex(): number {
        return this._dayIndex;
    }

    public get weather(): WeatherId {
        return this._weather;
    }

    public restore(dayIndex: number, weather: WeatherId): void {
        this._dayIndex = Math.max(1, Math.floor(dayIndex));
        this._weather = weather;
    }

    public getDate(dayIndex: number = this._dayIndex): CalendarDate {
        const d = Math.max(1, Math.floor(dayIndex));
        const zeroBased = d - 1;
        const year = Math.floor(zeroBased / DAYS_PER_YEAR) + 1;
        const dayOfYear = (zeroBased % DAYS_PER_YEAR) + 1;
        const termIdx = Math.floor((dayOfYear - 1) / DAYS_PER_SOLAR_TERM);
        const solarTerm = SOLAR_TERMS_24[termIdx];
        const dayOfSeason = ((dayOfYear - 1) % DAYS_PER_SEASON) + 1;
        return { dayIndex: d, year, dayOfYear, season: solarTerm.season, dayOfSeason, solarTerm };
    }

    /** 检查某株灵植在当前游戏日是否可播种（支持后期四季灵棚反季覆盖） */
    public canPlantToday(plant: PlantDef, inGreenhouse = false): boolean {
        if (inGreenhouse) return true;
        const date = this.getDate();
        if (plant.solarTerms.length > 0) {
            return plant.solarTerms.includes(date.solarTerm.id);
        }
        return plant.seasons.includes(date.season);
    }

    /** 显式结束一天（玩家在床休息或离线逐日结算时调用） */
    public endDay(): CalendarDate {
        this._dayIndex += 1;
        const next = this.getDate();
        this._weather = this._rollWeather(next.season, next.dayIndex);
        EventBus.inst.emit('dayAdvanced', {
            dayIndex: next.dayIndex,
            year: next.year,
            season: next.season,
            solarTermId: next.solarTerm.id,
            weather: this._weather,
        });
        return next;
    }

    /**
     * 冷启动离线结算：
     * - 时间回拨（now < savedRealTimeMs）按 0 处理，绝不倒扣。
     * - 最多推进 OFFLINE_MAX_DAYS（2 天），作物只长不枯。
     */
    public settleOffline(savedRealTimeMs: number): number {
        const now = this._nowProvider();
        const deltaMs = now - savedRealTimeMs;
        if (!Number.isFinite(deltaMs) || deltaMs <= 0) return 0;

        const rawDays = Math.floor(deltaMs / OFFLINE_MS_PER_GAME_DAY);
        const daysToAdvance = Math.min(OFFLINE_MAX_DAYS, Math.max(0, rawDays));
        for (let i = 0; i < daysToAdvance; i++) {
            this.endDay();
        }
        if (daysToAdvance > 0) {
            EventBus.inst.emit('offlineSettled', {
                daysElapsed: daysToAdvance,
                newDayIndex: this._dayIndex,
            });
        }
        return daysToAdvance;
    }

    private _rollWeather(season: SeasonId, seed: number): WeatherId {
        // 确定性伪随机，保证同档可复现测试
        const r = ((seed * 9301 + 49297) % 233280) / 233280;
        if (season === 'winter') return r < 0.35 ? 'snowy' : 'sunny';
        if (season === 'spring' || season === 'summer') return r < 0.3 ? 'rainy' : 'sunny';
        return r < 0.18 ? 'rainy' : 'sunny';
    }
}
