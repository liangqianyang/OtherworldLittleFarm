import { EventBus } from '../../core/EventBus';
import { DataManager } from '../../core/DataManager';
import { TimeSystem } from '../../core/TimeSystem';

/**
 * FarmSystem —— 农场地块状态机（阶段 1 农场切片核心）。
 *
 * 生长规则（对齐 2026-11-13 拍板「作物只长不枯」）：
 * - 在线：浇水日 endDay 后 growth +1（每日一浇）；
 * - 离线结算：天数直接计入 growth（不要求离线浇水）；
 * - growth ≥ growDays 即成熟可收获。
 *
 * 存档约定：PlotSave 只存纯数据（id+数值），挂进 SaveDataV1.farm；
 * 网格 MVP 固定 3×3（正式农场布局在阶段 2 数据表化）。
 */

export interface PlotSave {
    cropId: string;
    plantedDay: number;
    /** 已生长天数（浇水日累计 + 离线天数） */
    growth: number;
    /** 最后浇水所在的游戏日（0=未浇） */
    wateredOnDay: number;
}

export interface FarmSave {
    plots: (PlotSave | null)[];
}

export const GRID_COLS = 3;
export const GRID_ROWS = 3;
export const GRID_SIZE = GRID_COLS * GRID_ROWS;

type CropDef = { id: string; growDays: number; harvest: { itemId: string; min: number; max: number } };

export class FarmSystem {
    private static _instance: FarmSystem | null = null;
    static get inst(): FarmSystem {
        if (!this._instance) this._instance = new FarmSystem();
        return this._instance;
    }

    private _farm: FarmSave = { plots: [] };
    private _subscribed = false;

    /** GameApp 读档后调用；旧档缺 farm 字段时自动补全 */
    init(farm: FarmSave | undefined): void {
        if (!farm || !Array.isArray(farm.plots)) {
            farm = { plots: new Array(GRID_SIZE).fill(null) };
        }
        while (farm.plots.length < GRID_SIZE) farm.plots.push(null);
        this._farm = farm;

        if (!this._subscribed) {
            this._subscribed = true;
            EventBus.inst.on('dayAdvanced', ({ dayIndex }) => this._onDayAdvanced(dayIndex));
        }
    }

    get farm(): FarmSave {
        return this._farm;
    }

    getPlot(index: number): PlotSave | null {
        return this._farm.plots[index] ?? null;
    }

    /** 播种：消耗种子（由调用方扣背包），返回是否成功；非当季拒绝（§6.1 季节限定） */
    plant(index: number, seedItemId: string): boolean {
        if (this._farm.plots[index]) return false;
        const cropId = seedItemId.replace(/_seed$/, '');
        const def = DataManager.inst.getRow('catalogs/crops', cropId);
        if (!def) {
            console.warn(`[Farm] 种子 ${seedItemId} 没有对应作物表行`);
            return false;
        }
        if (!TimeSystem.cropInSeason(def.seasons)) {
            EventBus.inst.emit('farmChanged', { action: 'plant_offseason' });
            return false;
        }
        this._farm.plots[index] = {
            cropId,
            plantedDay: TimeSystem.inst.dayIndex,
            growth: 0,
            wateredOnDay: 0,
        };
        EventBus.inst.emit('farmChanged', { action: 'plant' });
        return true;
    }

    /** 浇水：每日每地块一次 */
    water(index: number): boolean {
        const p = this._farm.plots[index];
        if (!p) return false;
        const today = TimeSystem.inst.dayIndex;
        if (p.wateredOnDay === today) return false;
        p.wateredOnDay = today;
        EventBus.inst.emit('farmChanged', { action: 'water' });
        return true;
    }

    /** 是否成熟 */
    isMature(p: PlotSave): boolean {
        const def = this._cropDef(p.cropId);
        return !!def && p.growth >= def.growDays;
    }

    /** 生长进度 0..1（视图用） */
    progress(p: PlotSave): number {
        const def = this._cropDef(p.cropId);
        return def ? Math.min(p.growth / def.growDays, 1) : 0;
    }

    /** 收获：产出经 giveItem 入背包（触发 itemGained 信号），地块清空 */
    harvest(index: number, giveItem: (itemId: string, count: number) => void): boolean {
        const p = this._farm.plots[index];
        if (!p || !this.isMature(p)) return false;
        const def = this._cropDef(p.cropId)!;
        const count = def.harvest.min + Math.floor(Math.random() * (def.harvest.max - def.harvest.min + 1));
        giveItem(def.harvest.itemId, Math.max(count, 1));
        this._farm.plots[index] = null;
        EventBus.inst.emit('farmChanged', { action: 'harvest' });
        return true;
    }

    /** 离线结算：天数直接计入生长（只长不枯） */
    growOffline(days: number): void {
        for (const p of this._farm.plots) {
            if (p) p.growth += days;
        }
    }

    private _onDayAdvanced(dayIndex: number): void {
        let changed = false;
        for (const p of this._farm.plots) {
            // 昨天浇过水 → 今天生长 +1（endDay 语义：dayIndex 已是新手）
            if (p && p.wateredOnDay === dayIndex - 1) {
                p.growth += 1;
                changed = true;
            }
        }
        if (changed) EventBus.inst.emit('farmChanged', { action: 'grow' });
    }

    private _cropDef(cropId: string): CropDef | null {
        const row = DataManager.inst.getRow('catalogs/crops', cropId);
        if (!row) return null;
        return {
            id: cropId,
            growDays: Number(row['growDays'] ?? 1),
            harvest: (row['harvest'] as CropDef['harvest']) ?? { itemId: cropId, min: 1, max: 1 },
        };
    }
}
