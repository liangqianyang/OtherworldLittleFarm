import { EventBus } from './EventBus';
import { IPlatformAdapter } from '../platform/IPlatformAdapter';

const SAVE_KEY = 'save_main';
const BAK_KEY = 'save_main.bak';
const SAVE_VERSION = 5;

/** 世界切片（大地图重构 v3 新增，纯加字段；缺字段走迁移链补默认值） */
export interface WorldSave {
    /** 永久清除的世界物件 id（respawnDays=0 的岩石等） */
    clearedIds?: string[];
    /** 待复活物件：objId → 复活日 dayIndex */
    regrowAt?: Record<string, number>;
    /** 玩家世界坐标（tile，M3 起存） */
    playerX?: number;
    playerY?: number;
    /** 家园地形全量 RLE+base64（terrain-system §7.2：[u16 run][u8 (type<<4|height)]，M3 起存；缺省=基线地图。v4 迁移已作废 V2 差量） */
    terrain?: string;
    /** 地形格数（MAP_W*MAP_H，守卫：与当前不符→重发基线；V3 布局切换靠 SAVE_VERSION 4 迁移删 terrain 强制重建） */
    terrainSize?: number;
}

/** 封印防守切片（M4 塔防化：塔跨夜常驻 + 祭坛血量；运行时由 DefenseSystem.seal() 补齐默认） */
export interface SealSave {
    towers: { cropId: string; cx: number; cy: number; lv: number }[];
    altarHp: number;
    /** 最近一次完成结算的游戏日（防强退重打同一天刷奖励） */
    lastSettledDay?: number;
}

/**
 * 存档顶层结构——只存纯数据（id/坐标/数值/时间戳），绝不序列化节点引用。
 * 后续阶段新增内容一律「加字段 + 加迁移」，不删旧字段（§12 存档工程约束）。
 */
export interface SaveDataV1 {    version: number;
    /** 游戏日（与 TimeSystem.dayIndex 同步） */
    dayIndex: number;
    /** 上次存档的真实时间戳（离线结算依据，来自平台时间源） */
    savedRealTimeMs: number;
    /** 最小背包：itemId → 数量 */
    inventory: Record<string, number>;
    /** 农场地块（阶段 1 切片）。类型来自 FarmSystem——仅类型引用，无核心→玩法运行时依赖 */
    farm?: import('../gameplay/farm/FarmSystem').FarmSave;
    /** 图鉴：已收集条目 id（作物 id / 鱼 id），v2 新增 */
    codex?: string[];
    /** 世界切片：开荒/复活/玩家位置/地形差量（v3 新增） */
    world?: WorldSave;
    /** 封印防守切片：塔/祭坛血量（M4 新增，可选字段缺省由 DefenseSystem 补默认） */
    seal?: SealSave;
}

type AnyRecord = Record<string, unknown>;

/** 版本迁移链：v(n-1) → v(n)，按序执行；只加字段不删字段（world.terrain 例外见 v4 注） */
const migrations: Record<number, (data: AnyRecord) => AnyRecord> = {
    2: (d) => ({ ...d, codex: Array.isArray(d['codex']) ? d['codex'] : [] }),
    3: (d) => ({ ...d, world: d['world'] && typeof d['world'] === 'object' ? d['world'] : { clearedIds: [], regrowAt: {} } }),
    // v3→v4：V3 整洁化布局换基线（v3-clarity-geometry.md）。96×80 尺寸未变→terrainSize 守卫不会触发，
    // 必须显式作废 V2 地形差量，否则老档会把 V2 路网盖回 V3 基线。玩家落点一并重置回出生点。
    4: (d) => {
        const w = (d['world'] && typeof d['world'] === 'object' ? d['world'] : {}) as AnyRecord;
        delete w['terrain'];
        delete w['terrainSize'];
        delete w['playerX'];
        delete w['playerY'];
        return { ...d, world: { clearedIds: [], regrowAt: {}, ...w } };
    },
    // v4→v5：V4 参考图对齐布局换基线（农田主阵西移 + 门前布置场）。96×80 未变→terrainSize 守卫不触发，
    // 同 v4 理由必须显式作废旧地形差量，否则老档会把旧农田 slab 盖回新基线。
    5: (d) => {
        const w = (d['world'] && typeof d['world'] === 'object' ? d['world'] : {}) as AnyRecord;
        delete w['terrain'];
        delete w['terrainSize'];
        delete w['playerX'];
        delete w['playerY'];
        return { ...d, world: { clearedIds: [], regrowAt: {}, ...w } };
    },
};

export class SaveManager {
    constructor(private readonly _adapter: IPlatformAdapter) {}

    /**
     * 读档：主档损坏自动回退上一代备份；都没有返回 null（视为新档）。
     * 返回的数据已迁移到当前 SAVE_VERSION。
     */
    load(): SaveDataV1 | null {
        // 主档「缺失或损坏」都回退备份（旧实现只在缺失时回退，损坏主档会无视好备份直接开新档）
        const main = this._parse(this._read(SAVE_KEY));
        if (main) return this._migrate(main) as unknown as SaveDataV1;
        const bak = this._parse(this._read(BAK_KEY));
        if (bak) {
            console.warn('[Save] 主档缺失或损坏，已回退上一代备份');
            return this._migrate(bak) as unknown as SaveDataV1;
        }
        return null;
    }

    /** JSON 解析 + 形状校验：损坏/非对象一律视为 null */
    private _parse(raw: string | null): AnyRecord | null {
        if (raw === null) return null;
        try {
            const d = JSON.parse(raw) as unknown;
            return d && typeof d === 'object' && !Array.isArray(d) ? d as AnyRecord : null;
        } catch {
            return null;
        }
    }

    /** 写档：先写新主档，成功后才把「可解析的」旧主档滚入备份；失败返回 false。
     *  时序红线：旧实现先滚备份再写新档——主档已损坏时会把损坏内容覆盖掉唯一的好备份。 */
    save(data: SaveDataV1, reason: string): boolean {
        data.version = SAVE_VERSION;
        data.savedRealTimeMs = this._adapter.time.nowMs();

        const old = this._read(SAVE_KEY);
        const ok = this._adapter.storage.set(SAVE_KEY, JSON.stringify(data));
        if (ok) {
            if (old !== null && this._parse(old) !== null) this._adapter.storage.set(BAK_KEY, old);
            EventBus.inst.emit('saveCompleted', { reason });
        } else {
            console.warn('[Save] 写档失败（存储配额或运行时限制），下次关键节点将重试');
        }
        return ok;
    }

    /** 删除本机全部存档（仅设置页「重开档」入口可调） */
    wipe(): void {
        this._adapter.storage.remove(SAVE_KEY);
        this._adapter.storage.remove(BAK_KEY);
    }

    private _read(key: string): string | null {
        return this._adapter.storage.get(key);
    }

    private _migrate(data: AnyRecord): AnyRecord {
        let version = typeof data.version === 'number' ? data.version : 1;
        while (version < SAVE_VERSION) {
            const step = migrations[version + 1];
            if (!step) break;
            data = step(data);
            version += 1;
        }
        data.version = SAVE_VERSION;
        // 核心字段兜底校验：损坏值补默认，避免下游 NaN/undefined 崩溃
        if (typeof data['dayIndex'] !== 'number' || !isFinite(data['dayIndex'] as number) || (data['dayIndex'] as number) < 1) data['dayIndex'] = 1;
        if (!data['inventory'] || typeof data['inventory'] !== 'object' || Array.isArray(data['inventory'])) data['inventory'] = {};
        if (typeof data['savedRealTimeMs'] !== 'number' || !isFinite(data['savedRealTimeMs'] as number)) data['savedRealTimeMs'] = this._adapter.time.nowMs();
        return data;
    }
}
