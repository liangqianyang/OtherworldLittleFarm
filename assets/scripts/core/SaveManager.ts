import { EventBus } from './EventBus';
import { IPlatformAdapter } from '../platform/IPlatformAdapter';

const SAVE_KEY = 'save_main';
const BAK_KEY = 'save_main.bak';
const SAVE_VERSION = 3;

/** 世界切片（大地图重构 v3 新增，纯加字段；缺字段走迁移链补默认值） */
export interface WorldSave {
    /** 永久清除的世界物件 id（respawnDays=0 的岩石等） */
    clearedIds?: string[];
    /** 待复活物件：objId → 复活日 dayIndex */
    regrowAt?: Record<string, number>;
    /** 玩家世界坐标（tile，M3 起存） */
    playerX?: number;
    playerY?: number;
    /** 家园地形全量 RLE+base64（terrain-system §7.2：[u16 run][u8 (type<<4|height)]，M3 起存；缺省=基线地图） */
    terrain?: string;
}

/** 封印防守切片（M4 塔防化：塔跨夜常驻 + 祭坛血量） */
export interface SealSave {
    towers?: { cropId: string; cx: number; cy: number; lv: number }[];
    altarHp?: number;
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

/** 版本迁移链：v(n-1) → v(n)，按序执行；只加字段不删字段 */
const migrations: Record<number, (data: AnyRecord) => AnyRecord> = {
    2: (d) => ({ ...d, codex: Array.isArray(d['codex']) ? d['codex'] : [] }),
    3: (d) => ({ ...d, world: d['world'] && typeof d['world'] === 'object' ? d['world'] : { clearedIds: [], regrowAt: {} } }),
};

export class SaveManager {
    constructor(private readonly _adapter: IPlatformAdapter) {}

    /**
     * 读档：主档损坏自动回退上一代备份；都没有返回 null（视为新档）。
     * 返回的数据已迁移到当前 SAVE_VERSION。
     */
    load(): SaveDataV1 | null {
        const raw = this._read(SAVE_KEY) ?? this._read(BAK_KEY);
        if (raw === null) return null;

        let data: AnyRecord;
        try {
            data = JSON.parse(raw) as AnyRecord;
        } catch {
            console.warn('[Save] 主档与备份均无法解析，按新档处理');
            return null;
        }
        return this._migrate(data) as SaveDataV1;
    }

    /** 写档：先把旧主档滚入备份，再写新档；失败返回 false（调用方决定降级提示） */
    save(data: SaveDataV1, reason: string): boolean {
        data.version = SAVE_VERSION;
        data.savedRealTimeMs = this._adapter.time.nowMs();

        const old = this._read(SAVE_KEY);
        if (old !== null) this._adapter.storage.set(BAK_KEY, old);

        const ok = this._adapter.storage.set(SAVE_KEY, JSON.stringify(data));
        if (ok) {
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
        return data;
    }
}
