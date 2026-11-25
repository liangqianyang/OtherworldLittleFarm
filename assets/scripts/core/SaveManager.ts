/**
 * 《异界小农场 2.0》阶段 0：平台适配接口与双槽滚动存档管理器
 * - 平台隔离：核心逻辑不直接依赖 wx/tap API，统一走 IPlatformAdapter。
 * - 双槽安全写序：先写新主档，成功后才把可解析旧主档滚入 .bak；主档损坏自动回退 .bak。
 * - 支持 Base64 导出/导入存档码，单机无服务端也能防换机丢档。
 */

import type { SaveDataV2 } from './GameTypes';
import { EventBus } from './EventBus';

export const SAVE_VERSION = 1;
const MAIN_KEY = 'olf2_save_main';
const BAK_KEY = 'olf2_save_main.bak';

export interface IStorageAdapter {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

export interface IPlatformAdapter {
    readonly platformName: string;
    readonly storage: IStorageAdapter;
    nowMs(): number;
    onHide(cb: () => void): void;
    onShow(cb: () => void): void;
}

/** 本地内存/浏览器兜底适配器（开发预览与 Node 无头测试通用） */
export class MemoryPlatformAdapter implements IPlatformAdapter {
    public readonly platformName = 'local';
    private readonly _mem = new Map<string, string>();
    private _nowOffsetMs = 0;

    public readonly storage: IStorageAdapter = {
        getItem: (k) => this._mem.get(k) ?? null,
        setItem: (k, v) => { this._mem.set(k, v); },
        removeItem: (k) => { this._mem.delete(k); },
    };

    public nowMs(): number {
        return Date.now() + this._nowOffsetMs;
    }

    public setNowOffsetMs(ms: number): void {
        this._nowOffsetMs = ms;
    }

    public onHide(_cb: () => void): void { /* no-op in memory adapter */ }
    public onShow(_cb: () => void): void { /* no-op in memory adapter */ }
}

export function createNewSave(nowMs: number): SaveDataV2 {
    return {
        version: SAVE_VERSION,
        dayIndex: 1,
        weather: 'sunny',
        savedRealTimeMs: nowMs,
        gold: 80,
        inventory: {
            spring_greens_seed: 6,
            thunder_potato_seed: 1,
            cloud_bamboo_shoot_seed: 1,
            wood: 10,
            stone: 5,
        },
        codex: { plants: [], fish: [], weapons: ['bamboo_sword', 'talisman_pistol'] },
        farm: {
            unlockedTier: 1,
            clearedObstacleIds: [],
            plots: Array.from({ length: 6 }, (_, i) => ({
                plotId: i,
                plantId: null,
                growthDays: 0,
                wateredOnDay: 0,
            })),
            auraScore: 0,
        },
        indoor: {
            roomLevel: 1,
            comfortScore: 10,
            furniture: [
                { uid: 'init_bed', furnitureId: 'furn_bed_wood', gx: 2, gy: 2 },
                { uid: 'init_stove', furnitureId: 'furn_stove_clay', gx: 6, gy: 2 },
            ],
            aquariumFishIds: [],
        },
        defense: {
            awakened: false,
            sealRepairPct: 0,
            altarHp: 100,
            lastSettledDay: 0,
            slots: [],
        },
        dungeon: {
            unlockedWeapons: ['bamboo_sword', 'talisman_pistol'],
            equippedWeapons: ['bamboo_sword', 'talisman_pistol'],
            deepestLayer: 0,
            highestClearedStage: 0,
            unlockedAnchors: [1],
            bestStreak: 0,
            grandCleared: false,
        },
        islands: {
            dockRepaired: false,
            unlockedIslands: [],
        },
        npcFlags: {},
        settings: { bgmVolume: 0.8, sfxVolume: 0.9 },
    };
}

export class SaveManager {
    private readonly _platform: IPlatformAdapter;

    constructor(platform: IPlatformAdapter) {
        this._platform = platform;
    }

    public load(): SaveDataV2 | null {
        const primary = this._tryParse(this._platform.storage.getItem(MAIN_KEY));
        if (primary) return this._migrate(primary);

        const backup = this._tryParse(this._platform.storage.getItem(BAK_KEY));
        if (backup) {
            console.warn('[SaveManager] Primary save corrupted; recovered from .bak');
            return this._migrate(backup);
        }
        return null;
    }

    public save(data: SaveDataV2, reason = 'manual'): boolean {
        const prevRaw = this._platform.storage.getItem(MAIN_KEY);
        const payload: SaveDataV2 = {
            ...data,
            version: SAVE_VERSION,
            savedRealTimeMs: this._platform.nowMs(),
        };
        const serialized = JSON.stringify(payload);
        try {
            this._platform.storage.setItem(MAIN_KEY, serialized);
            // 仅当旧主档可安全解析时才滚入 .bak，避免坏档污染备份槽
            if (prevRaw && this._tryParse(prevRaw)) {
                this._platform.storage.setItem(BAK_KEY, prevRaw);
            }
            EventBus.inst.emit('saveCompleted', { reason, timestampMs: payload.savedRealTimeMs });
            return true;
        } catch (err) {
            console.error('[SaveManager] Save failed:', err);
            return false;
        }
    }

    /** 导出可复制的存档码（UTF-8 → Base64） */
    public exportCode(data: SaveDataV2): string {
        const json = JSON.stringify(data);
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(json, 'utf-8').toString('base64');
        }
        const bytes = new TextEncoder().encode(json);
        let bin = '';
        for (const b of bytes) bin += String.fromCharCode(b);
        return btoa(bin);
    }

    /** 导入存档码并校验基本结构 */
    public importCode(code: string): SaveDataV2 | null {
        try {
            let json: string;
            if (typeof Buffer !== 'undefined') {
                json = Buffer.from(code.trim(), 'base64').toString('utf-8');
            } else {
                const bin = atob(code.trim());
                const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
                json = new TextDecoder().decode(bytes);
            }
            const parsed = this._tryParse(json);
            return parsed ? this._migrate(parsed) : null;
        } catch {
            return null;
        }
    }

    private _tryParse(raw: string | null): SaveDataV2 | null {
        if (!raw) return null;
        try {
            const obj = JSON.parse(raw);
            if (!obj || typeof obj !== 'object' || typeof obj.dayIndex !== 'number') return null;
            return obj as SaveDataV2;
        } catch {
            return null;
        }
    }

    /** 版本迁移链（未来升级只增不删，并做防御性数值钳位） */
    private _migrate(data: SaveDataV2): SaveDataV2 {
        const out: SaveDataV2 = { ...data, version: SAVE_VERSION };
        out.dayIndex = Math.max(1, Math.floor(out.dayIndex || 1));
        out.gold = Math.max(0, Math.floor(out.gold || 0));
        if (out.defense) {
            out.defense = {
                ...out.defense,
                altarHp: Math.min(100, Math.max(0, out.defense.altarHp ?? 100)),
                sealRepairPct: Math.min(100, Math.max(0, out.defense.sealRepairPct ?? 0)),
            };
        }
        return out;
    }
}
