/**
 * 《异界小农场 2.0》阶段 0：静态配置表注册中心与引用完整性校验器
 * - 纯逻辑不强绑定 cc.resources，传入异步 JSON 加载器即可在 Cocos 3.8.8 与 Node 无头单测无缝运行。
 * - 启动时自动校验 plants / fish / weapons 跨表 ID 引用，第一时间暴露填表错误。
 */

import type {
    FishCatalogFile,
    FishDef,
    PlantDef,
    PlantsCatalogFile,
    RiverSegmentDef,
    RiverSegmentId,
    SeasonId,
    WeaponDef,
    WeaponsCatalogFile,
    WeatherId,
} from './GameTypes';

export type JsonLoader = <T>(path: string) => Promise<T>;

export class DataManager {
    private static _inst: DataManager | null = null;

    private readonly _plants = new Map<string, PlantDef>();
    private readonly _fish = new Map<string, FishDef>();
    private readonly _riverSegments = new Map<RiverSegmentId, RiverSegmentDef>();
    private readonly _weapons = new Map<string, WeaponDef>();
    private _loaded = false;

    public static get inst(): DataManager {
        if (!this._inst) this._inst = new DataManager();
        return this._inst;
    }

    public get isLoaded(): boolean {
        return this._loaded;
    }

    public async loadAll(loader: JsonLoader): Promise<void> {
        const [plantsFile, fishFile, weaponsFile] = await Promise.all([
            loader<PlantsCatalogFile>('catalogs/plants'),
            loader<FishCatalogFile>('catalogs/fish'),
            loader<WeaponsCatalogFile>('catalogs/weapons'),
        ]);

        this._plants.clear();
        for (const p of plantsFile.plants) this._plants.set(p.id, p);

        this._riverSegments.clear();
        for (const s of fishFile.river_segments) this._riverSegments.set(s.id, s);

        this._fish.clear();
        for (const f of fishFile.fish) this._fish.set(f.id, f);

        this._weapons.clear();
        for (const w of weaponsFile.weapons) this._weapons.set(w.id, w);

        this.validateIntegrity();
        this._loaded = true;
    }

    public validateIntegrity(): void {
        const errors: string[] = [];

        this._plants.forEach((p) => {
            if (p.defense?.synergies) {
                for (const s of p.defense.synergies) {
                    if (!this._plants.has(s.neighborId)) {
                        errors.push(`Plant "${p.id}" synergy references unknown plant "${s.neighborId}"`);
                    }
                }
            }
        });

        this._fish.forEach((f) => {
            for (const seg of f.riverSegments) {
                if (!this._riverSegments.has(seg)) {
                    errors.push(`Fish "${f.id}" references unknown riverSegment "${seg}"`);
                }
            }
        });

        this._weapons.forEach((w) => {
            for (const ench of w.recommendedEnchants) {
                if (!this._plants.has(ench)) {
                    errors.push(`Weapon "${w.id}" enchant references unknown plant "${ench}"`);
                }
            }
        });

        if (errors.length > 0) {
            throw new Error(`[DataManager] Integrity check failed:\n- ${errors.join('\n- ')}`);
        }
    }

    public getPlant(id: string): PlantDef | undefined {
        return this._plants.get(id);
    }

    public getAllPlants(): PlantDef[] {
        return Array.from(this._plants.values());
    }

    public getFish(id: string): FishDef | undefined {
        return this._fish.get(id);
    }

    /** 按「河段 × 季节 × 天气 × 节气」筛选当前可钓出的鱼池 */
    public queryFishPool(
        segment: RiverSegmentId,
        season: SeasonId,
        weather: WeatherId,
        solarTermId: string
    ): FishDef[] {
        const pool: FishDef[] = [];
        this._fish.forEach((f) => {
            if (!f.riverSegments.includes(segment)) return;
            if (!f.weather.includes(weather)) return;
            if (f.solarTerms.length > 0) {
                if (!f.solarTerms.includes(solarTermId)) return;
            } else if (!f.seasons.includes(season)) {
                return;
            }
            pool.push(f);
        });
        return pool;
    }

    public getWeapon(id: string): WeaponDef | undefined {
        return this._weapons.get(id);
    }

    public getAllWeapons(): WeaponDef[] {
        return Array.from(this._weapons.values());
    }
}