/**
 * 《异界小农场 2.0》阶段 0：统一静态数据表与 2.0 存档切片 TypeScript 类型定义
 * 严格对齐 assets/data/catalogs/ 下的 plants.json / fish.json / weapons.json
 */

export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';
export type WeatherId = 'sunny' | 'rainy' | 'snowy';
export type RiverSegmentId = 'upstream_brook' | 'midstream_lotus' | 'downstream_estuary';
export type PlantCategory = 'daily' | 'amphibious' | 'combo';
export type WeaponClass = 'melee' | 'ranged' | 'laser' | 'plant_art';
export type RarityId = 'common' | 'uncommon' | 'rare' | 'solar_limited';

export interface PlantSynergyRule {
    neighborId: string;
    effect: string;
    bonusMult?: number;
    attackSpeedMult?: number;
}

export interface PlantDefenseConfig {
    role: string;
    perennialRegrowSec: number;
    damage?: number;
    attackIntervalSec?: number;
    rangeTiles?: number;
    aoeRadiusTiles?: number;
    knockback?: number;
    slowFactor?: number;
    allyAttackSpeedMult?: number;
    elevationLevel?: number;
    canHitAir?: boolean;
    canStackOn: boolean;
    allowsStackAbove: boolean;
    elevatedBonus?: {
        rangeMult: number;
        canHitAir: boolean;
        immuneGroundMelee: boolean;
    };
    adjacentAura?: string;
    burnDps?: number;
    burnSec?: number;
    wetGround?: boolean;
    chainTargets?: number;
    wetChainTargets?: number;
    synergies: PlantSynergyRule[];
}

export interface PlantDungeonUseConfig {
    type: 'throwable_grenade' | 'portable_turret' | 'throwable_frost_ring' | 'instant_elixir' | 'deployable_cover';
    damage?: number;
    attackIntervalSec?: number;
    durationSec?: number;
    aoeRadiusTiles?: number;
    breaksCrackedWall?: boolean;
    freezeSec?: number;
    restoreMana?: number;
    clearBulletsRadiusTiles?: number;
    blockBulletsSec?: number;
    cooldownSec: number;
    stackLimit: number;
}

export interface PlantWeaponEnchantConfig {
    element: 'fire' | 'frost' | 'lightning' | 'spirit';
    effect: string;
    durationRuns: number;
}

export interface PlantDef {
    id: string;
    name: string;
    category: PlantCategory;
    rarity: RarityId;
    seasons: SeasonId[];
    solarTerms: string[];
    growDays: number;
    waterNeed: boolean;
    seedCost: number;
    sellPrice: number;
    harvestCount: [number, number];
    source: string[];
    cookingTags: string[];
    defense: PlantDefenseConfig | null;
    dungeonUse: PlantDungeonUseConfig | null;
    weaponEnchant: PlantWeaponEnchantConfig | null;
    description: string;
}

export interface RiverSegmentDef {
    id: RiverSegmentId;
    name: string;
    theme: string;
}

export interface FishDef {
    id: string;
    name: string;
    riverSegments: RiverSegmentId[];
    seasons: SeasonId[];
    solarTerms: string[];
    weather: WeatherId[];
    rarity: RarityId;
    difficulty: number;
    catchWindowMs: number;
    sellPrice: number;
    aquariumComfort: number;
    defenseBait: { attractsTag: string; holdSec: number } | null;
    soupBuff: { stat: string; value: number; durationRuns: number } | null;
    description: string;
}

export interface WeaponDef {
    id: string;
    name: string;
    class: WeaponClass;
    rarity: RarityId;
    damage: number;
    attackIntervalSec: number;
    manaCost: number;
    rangeTiles: number;
    arcDeg?: number;
    canDestroyBullets?: boolean;
    canReflectBullets?: boolean;
    projectileSpeed?: number;
    projectilesPerShot?: number;
    spreadDeg?: number;
    pierce?: boolean;
    wallBounceCount?: number;
    beamWidthPx?: number;
    chainTargets?: number;
    chainRangeTiles?: number;
    rootChance?: number;
    rootDurationSec?: number;
    lobArc?: boolean;
    aoeRadiusTiles?: number;
    leaveBurnZoneSec?: number;
    critChance: number;
    unlockType: 'starter' | 'blueprint';
    craftRecipe: { itemId: string; count: number }[];
    recommendedEnchants: string[];
    description: string;
}

export interface PlantsCatalogFile {
    $schema_version: string;
    calendar_rule: {
        yearDays: number;
        seasons: SeasonId[];
        daysPerSeason: number;
        daysPerSolarTerm: number;
    };
    plants: PlantDef[];
}

export interface FishCatalogFile {
    $schema_version: string;
    river_segments: RiverSegmentDef[];
    fish: FishDef[];
}

export interface WeaponsCatalogFile {
    $schema_version: string;
    weapon_classes: WeaponClass[];
    weapons: WeaponDef[];
}

/** 2.0 纯数据存档切片（严禁序列化任何 Cocos 节点引用） */
export interface FarmPlotSave {
    plotId: number;
    plantId: string | null;
    growthDays: number;
    wateredOnDay: number;
}

export interface DefenseSlotSave {
    gx: number;
    gy: number;
    basePlantId: string;
    stackedPlantId?: string;
}

export interface IndoorFurnitureSave {
    uid: string;
    furnitureId: string;
    gx: number;
    gy: number;
    flipX?: boolean;
    rot?: 0 | 1 | 2 | 3;
    angleDeg?: number;
}

export interface SaveDataV2 {
    version: number;
    dayIndex: number;
    weather: WeatherId;
    savedRealTimeMs: number;
    gold: number;
    inventory: Record<string, number>;
    codex: {
        plants: string[];
        fish: string[];
        weapons: string[];
    };
    farm: {
        unlockedTier: 1 | 2 | 3;
        clearedObstacleIds: string[];
        plots: FarmPlotSave[];
        auraScore: number;
        toolLevel?: 1 | 2 | 3;
        petAdopted?: boolean;
        pondFishIds?: string[];
    };
    indoor: {
        roomLevel: 1 | 2 | 3;
        comfortScore: number;
        furniture: IndoorFurnitureSave[];
        aquariumFishIds: string[];
    };
    defense: {
        awakened: boolean;
        sealRepairPct: number;
        altarHp: number;
        lastSettledDay: number;
        slots: DefenseSlotSave[];
    };
    dungeon: {
        unlockedWeapons: string[];
        equippedWeapons: [string, string];
        deepestLayer: number;
        highestClearedStage?: number;
        unlockedAnchors?: number[];
        bestStreak?: number;
        grandCleared?: boolean;
    };
    islands: {
        dockRepaired: boolean;
        unlockedIslands: string[];
        lastVoyageDay?: number;
    };
    npcFlags: Record<string, number | boolean>;
    settings: {
        bgmVolume: number;
        sfxVolume: number;
    };
}
