import { EventBus } from './EventBus';
import { IPlatformAdapter } from '../platform/IPlatformAdapter';

const SAVE_KEY = 'save_main';
const BAK_KEY = 'save_main.bak';
const SAVE_VERSION = 1;

/**
 * 存档顶层结构（v1）——只存纯数据（id/坐标/数值/时间戳），绝不序列化节点引用。
 * 后续阶段新增内容一律「加字段 + 加迁移」，不删旧字段（§12 存档工程约束）。
 */
export interface SaveDataV1 {
    version: number;
    /** 游戏日（与 TimeSystem.dayIndex 同步） */
    dayIndex: number;
    /** 上次存档的真实时间戳（离线结算依据，来自平台时间源） */
    savedRealTimeMs: number;
    /** 最小背包：itemId → 数量 */
    inventory: Record<string, number>;
    // TODO 阶段 2+：作物地块 / 图鉴 / NPC / 设置 / 农场装饰段
}

type AnyRecord = Record<string, unknown>;

/** 版本迁移链：v(n-1) → v(n)，按序执行；只加字段不删字段 */
const migrations: Record<number, (data: AnyRecord) => AnyRecord> = {
    // 示例：2: (d) => ({ ...d, collection: {} }),
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
