import { assetManager, AssetManager, JsonAsset } from 'cc';

/**
 * DataManager —— 数据表驱动（core 四基座之一）。
 *
 * 结构约定（设计完善建议书 §7）：
 * - assets/data 设为 Bundle「data」；catalogs = 静态实体定义，events = 日历/进度触发；
 * - 表间引用一律字符串 id；启动加载后做引用完整性校验（缺失打 warning 不崩溃）。
 *
 * 表清单（阶段推进时逐张建立 JSON，字段定义见建议书 §7）：
 *   catalogs/items（锚点表，第一张）/ crops / monsters / fish / furniture / calendar
 *   events/defense_waves / npc_tasks
 */

const TABLE_MANIFEST: readonly string[] = [
    'catalogs/items',
    'catalogs/crops',
    'catalogs/monsters',
    'catalogs/fish',
    'catalogs/furniture',
    'catalogs/calendar',
    'catalogs/adventure_rooms',
    'catalogs/defense_waves',
    'catalogs/defense_maps',
    'catalogs/npc_dialogs',
    'catalogs/interactables',
    'catalogs/terrain_ops',
];

type AnyRow = Record<string, unknown>;

export class DataManager {
    private static _instance: DataManager | null = null;
    static get inst(): DataManager {
        if (!this._instance) this._instance = new DataManager();
        return this._instance;
    }

    private _tables = new Map<string, AnyRow[]>();

    /** 启动时全量载入（表皆小表）；data Bundle 不存在时以空表运行（工程早期正常状态） */
    async loadAll(): Promise<void> {
        const bundle = await this._loadBundle('data');
        if (!bundle) {
            console.warn('[Data] 未找到 data Bundle（assets/data 尚未建表或未设为 Bundle），以空表运行');
            return;
        }
        for (const path of TABLE_MANIFEST) {
            const json = await this._loadJson(bundle, path);
            if (json === null) continue; // 未建的表静默跳过
            const rows = Array.isArray(json) ? (json as AnyRow[]) : [json as AnyRow];
            this._tables.set(path, rows);
        }
        this._validate();
        console.log(`[Data] 已加载 ${this._tables.size}/${TABLE_MANIFEST.length} 张数据表`);
    }

    getRows(tablePath: string): AnyRow[] {
        return this._tables.get(tablePath) ?? [];
    }

    getRow(tablePath: string, id: string): AnyRow | null {
        return this._tables.get(tablePath)?.find((r) => r['id'] === id) ?? null;
    }

    private _loadBundle(name: string): Promise<AssetManager.Bundle | null> {
        return new Promise((resolve) => {
            assetManager.loadBundle(name, (err, bundle) => resolve(err ? null : bundle));
        });
    }

    private _loadJson(bundle: AssetManager.Bundle, path: string): Promise<unknown | null> {
        return new Promise((resolve) => {
            bundle.load(path, JsonAsset, (err, asset) => {
                resolve(err || !asset ? null : (asset.json ?? null));
            });
        });
    }

    /** 引用完整性校验：items 是所有产出/消耗的锚点表 */
    private _validate(): void {
        const items = this._tables.get('catalogs/items');
        if (!items) {
            if (this._tables.size > 0) console.warn('[Data] 缺少锚点表 catalogs/items，其他表的物品引用无法校验');
            return;
        }
        const itemIds = new Set(items.map((r) => r['id']));
        const crops = this._tables.get('catalogs/crops') ?? [];
        for (const row of crops) {
            const harvest = row['harvest'] as { itemId?: unknown } | undefined;
            const itemId = harvest?.itemId;
            if (typeof itemId === 'string' && !itemIds.has(itemId)) {
                console.warn(`[Data] 作物 ${String(row['id'])} 的 harvest.itemId="${itemId}" 不在 items 表中`);
            }
        }
    }
}
