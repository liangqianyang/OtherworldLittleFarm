/**
 * 《异界小农场 2.0》阶段 0：全局常驻启动入口与服务装配器
 * 挂载方式：在首场景（launch.scene）新建空节点 GameRoot，挂载本脚本即可。
 * 职责：
 * 1. 设为常驻节点（跨主岛 / 室内 / 地牢 / 外岛场景不销毁）。
 * 2. 按顺序初始化：TapAdapter → DataManager（加载三张 JSON + 校验）→ SaveManager → TimeSystem 离线结算。
 * 3. 注册切后台 onHide 强制落盘，确保单机存档不丢失。
 * 4. 提供统一 Asset Bundle 按需加载入口，严守首包 ≤ 4 MB 红线。
 */

import { _decorator, assetManager, AssetManager, Component, director, JsonAsset, resources, view } from 'cc';
import type { SaveDataV2 } from '../core/GameTypes';
import { DataManager } from '../core/DataManager';
import { EventBus } from '../core/EventBus';
import { createNewSave, SaveManager } from '../core/SaveManager';
import { TimeSystem } from '../core/TimeSystem';
import { TapAdapter } from '../platform/TapAdapter';

const { ccclass, property } = _decorator;

export type GameBundleName = 'bundle_dungeon' | 'bundle_islands' | 'bundle_decor' | 'bundle_audio';

@ccclass('GameApp')
export class GameApp extends Component {
    private static _inst: GameApp | null = null;

    @property({ tooltip: '初始化完成后自动跳转的主场景名（留空则停留在当前场景）' })
    public firstSceneName = '';

    public platform!: TapAdapter;
    public saveMgr!: SaveManager;
    public time!: TimeSystem;
    public saveData!: SaveDataV2;
    public ready = false;

    private readonly _bundles = new Map<GameBundleName, AssetManager.Bundle>();

    public static get inst(): GameApp | null {
        return this._inst;
    }

    protected onLoad(): void {
        if (GameApp._inst && GameApp._inst !== this) {
            this.node.destroy();
            return;
        }
        GameApp._inst = this;
        if (typeof view?.enableRetina === 'function') {
            view.enableRetina(true);
        }
        director.addPersistRootNode(this.node);
        void this._bootstrap();
    }

    private async _bootstrap(): Promise<void> {
        this.platform = new TapAdapter();
        this.saveMgr = new SaveManager(this.platform);
        this.time = new TimeSystem(() => this.platform.nowMs());

        try {
            await DataManager.inst.loadAll(<T>(path: string) => this._loadResourceJson<T>(path));
        } catch (err) {
            console.error('[GameApp] Failed to load static catalogs:', err);
            return;
        }

        const loaded = this.saveMgr.load();
        if (loaded) {
            this.saveData = loaded;
            this.time.restore(loaded.dayIndex, loaded.weather);
            const offlineDays = this.time.settleOffline(loaded.savedRealTimeMs);
            if (offlineDays > 0) {
                this.saveData.dayIndex = this.time.dayIndex;
                this.saveData.weather = this.time.weather;
                this.persist('offline_settled');
            }
        } else {
            this.saveData = createNewSave(this.platform.nowMs());
            this.time.restore(this.saveData.dayIndex, this.saveData.weather);
            this.persist('new_game');
        }

        this.platform.onHide(() => {
            this.persist('on_hide');
        });

        this.ready = true;
        const d = this.time.getDate();
        console.log(
            `[GameApp] Boot OK (${this.platform.platformName}) | 第${d.year}年 · ${d.solarTerm.name} · 第${d.dayIndex}天 | 金币:${this.saveData.gold}`
        );

        if (this.firstSceneName) {
            director.loadScene(this.firstSceneName);
        }
    }

    private _loadResourceJson<T>(path: string): Promise<T> {
        return new Promise((resolve, reject) => {
            resources.load(path, JsonAsset, (err, asset) => {
                if (err || !asset) {
                    reject(err ?? new Error(`Missing JsonAsset: ${path}`));
                    return;
                }
                resolve(asset.json as T);
            });
        });
    }

    /** 按需加载独立分包（地牢 / 外岛 / 节气家具 / 音频） */
    public loadBundle(name: GameBundleName): Promise<AssetManager.Bundle> {
        const cached = this._bundles.get(name);
        if (cached) return Promise.resolve(cached);
        return new Promise((resolve, reject) => {
            assetManager.loadBundle(name, (err, bundle) => {
                if (err || !bundle) {
                    reject(err ?? new Error(`Failed to load bundle: ${name}`));
                    return;
                }
                this._bundles.set(name, bundle);
                resolve(bundle);
            });
        });
    }

    public addGold(delta: number): void {
        if (!this.ready || delta === 0) return;
        this.saveData.gold = Math.max(0, this.saveData.gold + Math.floor(delta));
        EventBus.inst.emit('goldChanged', { delta, total: this.saveData.gold });
    }

    public addItem(itemId: string, delta: number): void {
        if (!this.ready || delta === 0) return;
        const next = Math.max(0, (this.saveData.inventory[itemId] ?? 0) + Math.floor(delta));
        if (next === 0) {
            delete this.saveData.inventory[itemId];
        } else {
            this.saveData.inventory[itemId] = next;
        }
        EventBus.inst.emit('inventoryChanged', { itemId, delta, total: next });
    }

    public endDayAndSave(): void {
        if (!this.ready) return;
        const next = this.time.endDay();
        this.saveData.dayIndex = next.dayIndex;
        this.saveData.weather = this.time.weather;
        this.persist('end_day');
    }

    public resetSave(): void {
        this.saveData = createNewSave(this.platform.nowMs());
        this.time.restore(this.saveData.dayIndex, this.saveData.weather);
        this.persist('debug_reset');
    }

    public persist(reason: string): boolean {
        if (!this.saveMgr || !this.saveData) return false;
        this.saveData.dayIndex = this.time.dayIndex;
        this.saveData.weather = this.time.weather;
        return this.saveMgr.save(this.saveData, reason);
    }
}
