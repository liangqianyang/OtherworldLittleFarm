/**
 * 《异界小农场 2.0》60 关元气骑士式动作地牢 · 数据驱动配置表（第三期终局闭环：1-1 ~ 6-10 六大生态 60 关全机制实装）
 * - 6 大国风生态 × 10 关/大关（1-1 至 6-10，共 60 关），完整开放第 1~6 大关（幽篁古墟、丹砂熔窟、寒玉冰宫、墨瘴泽渊、雷纹古塔、裂隙天坛）
 * - 6 大 AI 行为原型：rush（突进）、danmaku（弹幕）、shield（护盾反伤）、trail（地形留痕）、blink（潜行瞬移）、summoner（辅助召唤）
 * - 房间类型：combat（掩体战）、blessing（古碑三选一祝福）、chest（机关宝箱）、blacksmith（铁匠武器升阶）、elite_bounty（精英赏金）、mid_boss（X-5 中途首领）、final_boss（X-10 双阶段终极首领）
 */

export type BiomeId =
    | 'bamboo_ruins'
    | 'magma_cavern'
    | 'frost_palace'
    | 'mist_marsh'
    | 'thunder_pagoda'
    | 'rift_altar';

export type RoomKind =
    | 'combat'
    | 'blessing'
    | 'chest'
    | 'blacksmith'
    | 'elite_bounty'
    | 'mid_boss'
    | 'final_boss';

export type EnemyArchetype = 'rush' | 'danmaku' | 'shield' | 'trail' | 'blink' | 'summoner';

export type EnemyKind =
    // 第 1 大关：幽篁古墟
    | 'bamboo_imp'
    | 'ink_spirit'
    | 'paper_golem'
    | 'boss_giant_bamboo'
    | 'boss_stone_spirit'
    // 第 2 大关：丹砂熔窟
    | 'fire_bat'
    | 'magma_turtle'
    | 'fire_taoist'
    | 'boss_magma_furnace'
    | 'boss_magma_wyrm'
    // 第 3 大关：寒玉冰宫
    | 'ice_prism'
    | 'snow_puppet'
    | 'frost_mirror_guard'
    | 'boss_frost_crane'
    | 'boss_frost_turtle'
    // 第 4 大关：墨瘴泽渊
    | 'venom_frog'
    | 'miasma_flower'
    | 'shadow_ink_assassin'
    | 'boss_ink_lotus'
    | 'boss_ghost_spider'
    // 第 5 大关：雷纹古塔
    | 'thunder_drummer'
    | 'bronze_guardian'
    | 'arc_sparrow'
    | 'boss_thunder_lion'
    | 'boss_thunder_lord'
    // 第 6 大关：裂隙天坛
    | 'rift_walker'
    | 'star_puppet'
    | 'mana_eater'
    | 'boss_twin_melee'
    | 'boss_twin_ranged'
    | 'boss_rift_overlord';

export interface BiomeDef {
    chapter: number; // 1..6
    id: BiomeId;
    name: string;
    subtitle: string;
    implemented: boolean;
    floorRgb: [number, number, number];
    borderRgb: [number, number, number];
    runeRgb: [number, number, number];
    bgTintRgb: [number, number, number];
    hazardDesc: string;
    midBossName: string;
    finalBossName: string;
}

export interface EnemyStatDef {
    kind: EnemyKind;
    name: string;
    archetype: EnemyArchetype;
    isBoss: boolean;
    baseHp: number;
    radius: number;
    speed: number;
    fireCd: number;
    contactDmg: number;
    spritePrefix: string;
    spriteW: number;
    spriteH: number;
    frameSec: number;
    tintRgb?: [number, number, number];
    goldReward: number;
}

export interface BlessingDef {
    id: string;
    name: string;
    desc: string;
    tag: string;
}

export interface StageConfig {
    globalStage: number; // 1..60
    chapter: number;     // 1..6
    subStage: number;    // 1..10
    label: string;       // e.g. '1-1', '4-10'
    biome: BiomeDef;
    roomKind: RoomKind;
    hpMult: number;
    pillars: [number, number][];
    hasCrackedWall: boolean;
    spikeCount: number;
    magmaInterval: number; // 0 = disabled
    jarCount: number;
    hasIceFloor: boolean;
    frostWindInterval: number; // 0 = disabled
    hasMistFog: boolean;
    poisonPoolCount: number;
    copperPillarCount: number;
    hasReflectWalls: boolean;
    riftVortexCount: number;
    hasSealRing: boolean;
    spawns: { kind: EnemyKind; x: number; y: number; elite?: boolean }[];
}

export const DUNGEON_TOTAL_STAGES = 60;
export const DUNGEON_IMPLEMENTED_MAX_STAGE = 60;

export const WEAPON_TIER_NAMES = ['凡铁', '青灵', '玄玉', '天罡'] as const;
export const WEAPON_TIER_MULT = [1.0, 1.24, 1.52, 1.85] as const;
export const WEAPON_TIER_UPGRADE_COST = [35, 65, 100] as const;

export const DUNGEON_BIOMES: readonly BiomeDef[] = [
    {
        chapter: 1,
        id: 'bamboo_ruins',
        name: '幽篁古墟',
        subtitle: '1-1 ~ 1-10 · 石柱掩体与枯竹刺',
        implemented: true,
        floorRgb: [36, 56, 52],
        borderRgb: [96, 152, 138],
        runeRgb: [72, 122, 108],
        bgTintRgb: [18, 32, 30],
        hazardDesc: '石柱掩体 / 枯竹刺陷阱 / 北墙裂纹密室',
        midBossName: '巨竹妖王',
        finalBossName: '古墟石灵',
    },
    {
        chapter: 2,
        id: 'magma_cavern',
        name: '丹砂熔窟',
        subtitle: '2-1 ~ 2-10 · 熔岩火圈与火药陶罐',
        implemented: true,
        floorRgb: [58, 30, 26],
        borderRgb: [212, 108, 62],
        runeRgb: [168, 72, 42],
        bgTintRgb: [32, 16, 14],
        hazardDesc: '周期熔岩火圈 / 爆裂火药陶罐 / 火符路径',
        midBossName: '赤焰炉灵',
        finalBossName: '丹砂火蛟',
    },
    {
        chapter: 3,
        id: 'frost_palace',
        name: '寒玉冰宫',
        subtitle: '3-1 ~ 3-10 · 滑冰砖与极寒霜风',
        implemented: true,
        floorRgb: [28, 52, 68],
        borderRgb: [122, 206, 232],
        runeRgb: [86, 152, 186],
        bgTintRgb: [14, 26, 36],
        hazardDesc: '惯性滑冰面 / 周期霜风减速（鱼汤免疫）/ 冰墙',
        midBossName: '玄冰鹤使',
        finalBossName: '寒玉玄龟',
    },
    {
        chapter: 4,
        id: 'mist_marsh',
        name: '墨瘴泽渊',
        subtitle: '4-1 ~ 4-10 · 暗紫瘴雾与驱雾古灯',
        implemented: true,
        floorRgb: [36, 30, 48],
        borderRgb: [152, 120, 198],
        runeRgb: [112, 86, 148],
        bgTintRgb: [18, 16, 28],
        hazardDesc: '瘴雾遮罩（点亮 2 盏古灯驱雾）/ 毒沼泥潭',
        midBossName: '百目墨莲',
        finalBossName: '幽泽鬼面蛛',
    },
    {
        chapter: 5,
        id: 'thunder_pagoda',
        name: '雷纹古塔',
        subtitle: '5-1 ~ 5-10 · 导电铜雷柱与反射壁',
        implemented: true,
        floorRgb: [46, 40, 26],
        borderRgb: [232, 194, 84],
        runeRgb: [176, 144, 62],
        bgTintRgb: [26, 22, 14],
        hazardDesc: '定时放电铜雷柱 / 八卦反射壁 / 避雷针电网',
        midBossName: '镇塔雷狮',
        finalBossName: '九霄雷公傀',
    },
    {
        chapter: 6,
        id: 'rift_altar',
        name: '裂隙天坛',
        subtitle: '6-1 ~ 6-10 · 时空裂隙与三系终主',
        implemented: true,
        floorRgb: [22, 40, 44],
        borderRgb: [92, 232, 196],
        runeRgb: [64, 168, 146],
        bgTintRgb: [12, 22, 26],
        hazardDesc: '时空裂隙旋涡 / 旋转灵气封阵 / 三系终主',
        midBossName: '双生界卫',
        finalBossName: '古渊裂隙之主',
    },
] as const;

export const ENEMY_STATS: Record<EnemyKind, EnemyStatDef> = {
    // ===== 第 1 大关：幽篁古墟 =====
    bamboo_imp: {
        kind: 'bamboo_imp',
        name: '竹精',
        archetype: 'rush',
        isBoss: false,
        baseHp: 38,
        radius: 18,
        speed: 122,
        fireCd: 99,
        contactDmg: 10,
        spritePrefix: 'mob_bamboo',
        spriteW: 54,
        spriteH: 56,
        frameSec: 0.14,
        goldReward: 8,
    },
    ink_spirit: {
        kind: 'ink_spirit',
        name: '墨灵',
        archetype: 'danmaku',
        isBoss: false,
        baseHp: 46,
        radius: 20,
        speed: 68,
        fireCd: 1.55,
        contactDmg: 9,
        spritePrefix: 'mob_ink_fly',
        spriteW: 62,
        spriteH: 56,
        frameSec: 0.13,
        goldReward: 10,
    },
    paper_golem: {
        kind: 'paper_golem',
        name: '符纸傀儡',
        archetype: 'shield',
        isBoss: false,
        baseHp: 74,
        radius: 24,
        speed: 74,
        fireCd: 2.1,
        contactDmg: 12,
        spritePrefix: 'mob_golem',
        spriteW: 68,
        spriteH: 70,
        frameSec: 0.2,
        goldReward: 13,
    },
    boss_giant_bamboo: {
        kind: 'boss_giant_bamboo',
        name: '巨竹妖王',
        archetype: 'rush',
        isBoss: true,
        baseHp: 240,
        radius: 38,
        speed: 86,
        fireCd: 1.8,
        contactDmg: 14,
        spritePrefix: 'mob_bamboo',
        spriteW: 94,
        spriteH: 98,
        frameSec: 0.16,
        tintRgb: [248, 224, 132],
        goldReward: 55,
    },
    boss_stone_spirit: {
        kind: 'boss_stone_spirit',
        name: '古墟石灵',
        archetype: 'danmaku',
        isBoss: true,
        baseHp: 340,
        radius: 44,
        speed: 68,
        fireCd: 1.45,
        contactDmg: 16,
        spritePrefix: 'mob_boss',
        spriteW: 106,
        spriteH: 108,
        frameSec: 0.2,
        goldReward: 95,
    },

    // ===== 第 2 大关：丹砂熔窟 =====
    fire_bat: {
        kind: 'fire_bat',
        name: '赤炎蝙蝠',
        archetype: 'rush',
        isBoss: false,
        baseHp: 48,
        radius: 19,
        speed: 148,
        fireCd: 2.2,
        contactDmg: 11,
        spritePrefix: 'mob_ink_fly',
        spriteW: 60,
        spriteH: 54,
        frameSec: 0.1,
        tintRgb: [255, 132, 92],
        goldReward: 11,
    },
    magma_turtle: {
        kind: 'magma_turtle',
        name: '熔岩龟',
        archetype: 'shield',
        isBoss: false,
        baseHp: 96,
        radius: 25,
        speed: 62,
        fireCd: 2.4,
        contactDmg: 13,
        spritePrefix: 'mob_burrow_mole',
        spriteW: 70,
        spriteH: 66,
        frameSec: 0.22,
        tintRgb: [255, 148, 102],
        goldReward: 15,
    },
    fire_taoist: {
        kind: 'fire_taoist',
        name: '火符道童',
        archetype: 'trail',
        isBoss: false,
        baseHp: 64,
        radius: 21,
        speed: 106,
        fireCd: 1.75,
        contactDmg: 11,
        spritePrefix: 'mob_leap_fox',
        spriteW: 62,
        spriteH: 64,
        frameSec: 0.15,
        tintRgb: [255, 166, 98],
        goldReward: 14,
    },
    boss_magma_furnace: {
        kind: 'boss_magma_furnace',
        name: '赤焰炉灵',
        archetype: 'danmaku',
        isBoss: true,
        baseHp: 390,
        radius: 40,
        speed: 44,
        fireCd: 1.35,
        contactDmg: 16,
        spritePrefix: 'mob_golem',
        spriteW: 98,
        spriteH: 100,
        frameSec: 0.18,
        tintRgb: [255, 120, 74],
        goldReward: 75,
    },
    boss_magma_wyrm: {
        kind: 'boss_magma_wyrm',
        name: '丹砂火蛟',
        archetype: 'trail',
        isBoss: true,
        baseHp: 520,
        radius: 46,
        speed: 96,
        fireCd: 1.4,
        contactDmg: 18,
        spritePrefix: 'mob_boss',
        spriteW: 112,
        spriteH: 112,
        frameSec: 0.16,
        tintRgb: [255, 114, 78],
        goldReward: 140,
    },

    // ===== 第 3 大关：寒玉冰宫 =====
    ice_prism: {
        kind: 'ice_prism',
        name: '冰棱妖',
        archetype: 'danmaku',
        isBoss: false,
        baseHp: 56,
        radius: 20,
        speed: 78,
        fireCd: 1.5,
        contactDmg: 11,
        spritePrefix: 'mob_ink_fly',
        spriteW: 62,
        spriteH: 58,
        frameSec: 0.13,
        tintRgb: [132, 228, 255],
        goldReward: 14,
    },
    snow_puppet: {
        kind: 'snow_puppet',
        name: '雪绒傀',
        archetype: 'trail',
        isBoss: false,
        baseHp: 68,
        radius: 22,
        speed: 112,
        fireCd: 2.3,
        contactDmg: 12,
        spritePrefix: 'mob_bamboo',
        spriteW: 60,
        spriteH: 62,
        frameSec: 0.16,
        tintRgb: [204, 240, 255],
        goldReward: 15,
    },
    frost_mirror_guard: {
        kind: 'frost_mirror_guard',
        name: '寒镜侍',
        archetype: 'shield',
        isBoss: false,
        baseHp: 98,
        radius: 25,
        speed: 72,
        fireCd: 1.9,
        contactDmg: 14,
        spritePrefix: 'mob_golem',
        spriteW: 72,
        spriteH: 74,
        frameSec: 0.2,
        tintRgb: [148, 212, 255],
        goldReward: 18,
    },
    boss_frost_crane: {
        kind: 'boss_frost_crane',
        name: '玄冰鹤使',
        archetype: 'blink',
        isBoss: true,
        baseHp: 430,
        radius: 38,
        speed: 92,
        fireCd: 1.45,
        contactDmg: 16,
        spritePrefix: 'mob_ink_fly',
        spriteW: 102,
        spriteH: 94,
        frameSec: 0.12,
        tintRgb: [150, 234, 255],
        goldReward: 105,
    },
    boss_frost_turtle: {
        kind: 'boss_frost_turtle',
        name: '寒玉玄龟',
        archetype: 'shield',
        isBoss: true,
        baseHp: 580,
        radius: 48,
        speed: 58,
        fireCd: 1.55,
        contactDmg: 19,
        spritePrefix: 'mob_boss',
        spriteW: 114,
        spriteH: 112,
        frameSec: 0.2,
        tintRgb: [122, 218, 255],
        goldReward: 175,
    },

    // ===== 第 4 大关：墨瘴泽渊 =====
    venom_frog: {
        kind: 'venom_frog',
        name: '毒蛙精',
        archetype: 'trail',
        isBoss: false,
        baseHp: 74,
        radius: 22,
        speed: 96,
        fireCd: 1.95,
        contactDmg: 13,
        spritePrefix: 'mob_burrow_mole',
        spriteW: 66,
        spriteH: 62,
        frameSec: 0.16,
        tintRgb: [128, 234, 152],
        goldReward: 17,
    },
    miasma_flower: {
        kind: 'miasma_flower',
        name: '瘴雾花',
        archetype: 'summoner',
        isBoss: false,
        baseHp: 82,
        radius: 24,
        speed: 18,
        fireCd: 1.85,
        contactDmg: 12,
        spritePrefix: 'mob_bamboo',
        spriteW: 68,
        spriteH: 68,
        frameSec: 0.22,
        tintRgb: [198, 134, 255],
        goldReward: 18,
    },
    shadow_ink_assassin: {
        kind: 'shadow_ink_assassin',
        name: '影墨刺客',
        archetype: 'blink',
        isBoss: false,
        baseHp: 64,
        radius: 20,
        speed: 138,
        fireCd: 1.65,
        contactDmg: 15,
        spritePrefix: 'mob_leap_fox',
        spriteW: 64,
        spriteH: 66,
        frameSec: 0.12,
        tintRgb: [172, 138, 236],
        goldReward: 20,
    },
    boss_ink_lotus: {
        kind: 'boss_ink_lotus',
        name: '百目墨莲',
        archetype: 'summoner',
        isBoss: true,
        baseHp: 490,
        radius: 44,
        speed: 16,
        fireCd: 1.35,
        contactDmg: 17,
        spritePrefix: 'mob_golem',
        spriteW: 108,
        spriteH: 108,
        frameSec: 0.18,
        tintRgb: [194, 126, 255],
        goldReward: 135,
    },
    boss_ghost_spider: {
        kind: 'boss_ghost_spider',
        name: '幽泽鬼面蛛',
        archetype: 'blink',
        isBoss: true,
        baseHp: 640,
        radius: 46,
        speed: 104,
        fireCd: 1.4,
        contactDmg: 20,
        spritePrefix: 'mob_boss',
        spriteW: 116,
        spriteH: 112,
        frameSec: 0.15,
        tintRgb: [182, 118, 246],
        goldReward: 220,
    },

    // ===== 第 5 大关：雷纹古塔 =====
    thunder_drummer: {
        kind: 'thunder_drummer',
        name: '雷鼓童子',
        archetype: 'summoner',
        isBoss: false,
        baseHp: 82,
        radius: 22,
        speed: 64,
        fireCd: 2.05,
        contactDmg: 13,
        spritePrefix: 'mob_bamboo',
        spriteW: 64,
        spriteH: 66,
        frameSec: 0.16,
        tintRgb: [255, 228, 108],
        goldReward: 21,
    },
    bronze_guardian: {
        kind: 'bronze_guardian',
        name: '铜甲力士',
        archetype: 'shield',
        isBoss: false,
        baseHp: 118,
        radius: 26,
        speed: 82,
        fireCd: 2.2,
        contactDmg: 16,
        spritePrefix: 'mob_golem',
        spriteW: 74,
        spriteH: 76,
        frameSec: 0.19,
        tintRgb: [242, 196, 98],
        goldReward: 24,
    },
    arc_sparrow: {
        kind: 'arc_sparrow',
        name: '电弧灵雀',
        archetype: 'danmaku',
        isBoss: false,
        baseHp: 68,
        radius: 19,
        speed: 144,
        fireCd: 1.45,
        contactDmg: 13,
        spritePrefix: 'mob_ink_fly',
        spriteW: 62,
        spriteH: 56,
        frameSec: 0.1,
        tintRgb: [255, 238, 134],
        goldReward: 20,
    },
    boss_thunder_lion: {
        kind: 'boss_thunder_lion',
        name: '镇塔雷狮',
        archetype: 'rush',
        isBoss: true,
        baseHp: 560,
        radius: 44,
        speed: 98,
        fireCd: 1.45,
        contactDmg: 19,
        spritePrefix: 'mob_leap_fox',
        spriteW: 108,
        spriteH: 106,
        frameSec: 0.14,
        tintRgb: [255, 218, 96],
        goldReward: 170,
    },
    boss_thunder_lord: {
        kind: 'boss_thunder_lord',
        name: '九霄雷公傀',
        archetype: 'summoner',
        isBoss: true,
        baseHp: 720,
        radius: 48,
        speed: 62,
        fireCd: 1.4,
        contactDmg: 21,
        spritePrefix: 'mob_boss',
        spriteW: 118,
        spriteH: 118,
        frameSec: 0.17,
        tintRgb: [255, 224, 102],
        goldReward: 260,
    },

    // ===== 第 6 大关：裂隙天坛 =====
    rift_walker: {
        kind: 'rift_walker',
        name: '裂隙行者',
        archetype: 'blink',
        isBoss: false,
        baseHp: 88,
        radius: 21,
        speed: 116,
        fireCd: 1.65,
        contactDmg: 15,
        spritePrefix: 'mob_leap_fox',
        spriteW: 66,
        spriteH: 68,
        frameSec: 0.12,
        tintRgb: [108, 246, 214],
        goldReward: 25,
    },
    star_puppet: {
        kind: 'star_puppet',
        name: '星辉法傀',
        archetype: 'summoner',
        isBoss: false,
        baseHp: 106,
        radius: 24,
        speed: 58,
        fireCd: 1.9,
        contactDmg: 14,
        spritePrefix: 'mob_golem',
        spriteW: 72,
        spriteH: 74,
        frameSec: 0.18,
        tintRgb: [148, 248, 232],
        goldReward: 27,
    },
    mana_eater: {
        kind: 'mana_eater',
        name: '噬灵魔',
        archetype: 'rush',
        isBoss: false,
        baseHp: 94,
        radius: 22,
        speed: 132,
        fireCd: 1.8,
        contactDmg: 16,
        spritePrefix: 'mob_burrow_mole',
        spriteW: 68,
        spriteH: 64,
        frameSec: 0.13,
        tintRgb: [132, 224, 244],
        goldReward: 26,
    },
    boss_twin_melee: {
        kind: 'boss_twin_melee',
        name: '界卫·曜刃',
        archetype: 'rush',
        isBoss: true,
        baseHp: 390,
        radius: 38,
        speed: 122,
        fireCd: 1.5,
        contactDmg: 20,
        spritePrefix: 'mob_leap_fox',
        spriteW: 96,
        spriteH: 96,
        frameSec: 0.12,
        tintRgb: [255, 168, 118],
        goldReward: 120,
    },
    boss_twin_ranged: {
        kind: 'boss_twin_ranged',
        name: '界卫·玄枢',
        archetype: 'danmaku',
        isBoss: true,
        baseHp: 370,
        radius: 38,
        speed: 74,
        fireCd: 1.25,
        contactDmg: 17,
        spritePrefix: 'mob_ink_fly',
        spriteW: 96,
        spriteH: 92,
        frameSec: 0.12,
        tintRgb: [112, 248, 226],
        goldReward: 120,
    },
    boss_rift_overlord: {
        kind: 'boss_rift_overlord',
        name: '古渊裂隙之主',
        archetype: 'summoner',
        isBoss: true,
        baseHp: 880,
        radius: 52,
        speed: 74,
        fireCd: 1.25,
        contactDmg: 22,
        spritePrefix: 'mob_boss',
        spriteW: 128,
        spriteH: 126,
        frameSec: 0.16,
        tintRgb: [118, 252, 218],
        goldReward: 380,
    },
};

export const BLESSING_POOL: readonly BlessingDef[] = [
    { id: 'sword_mana', name: '剑气回灵', desc: '青竹剑每次挥砍命中或劈碎弹幕回复 +6 灵力，近战伤害 +25%', tag: '近战' },
    { id: 'double_talisman', name: '符箓连珠', desc: '连发符箓枪改为双发扇形符弹，清怪压制力翻倍', tag: '远程' },
    { id: 'focus_mirror', name: '聚能镜片', desc: '八卦聚光镜激光伤害 +35%，灵力消耗降低 25%', tag: '激光' },
    { id: 'double_potato', name: '连环雷火', desc: '雷火薯爆炸半径 +25%，并额外附赠 2 颗局内雷火薯', tag: '灵植' },
    { id: 'wind_step', name: '疾风步法', desc: '移动速度 +18%，翻滚冷却缩短 30%，走位更飘逸', tag: '机动' },
    { id: 'iron_body', name: '玄铁护体', desc: '最大生命 +35 并立刻回复 45 点生命值', tag: '生存' },
    { id: 'vamp_sprout', name: '灵芽汲血', desc: '每击杀 1 只妖灵回复 +4 生命，续航拉满', tag: '续航' },
    { id: 'hazard_ward', name: '避火镇印', desc: '熔岩、冰刺、毒沼与枯竹刺等地形机关伤害减半', tag: '抗性' },
    { id: 'frost_ward', name: '暖阳护心', desc: '免疫寒玉冰宫霜风减速与墨瘴泽渊蛛网定身，移速 +8%', tag: '破局' },
    { id: 'crit_thunder', name: '九霄引雷', desc: '所有攻击有 22% 概率额外降下 38 伤天雷劈击目标', tag: '雷法' },
    { id: 'mana_spring', name: '灵源回涌', desc: '每秒额外回复 +5 灵力，并免疫噬灵魔的灵力吸取', tag: '灵源' },
    { id: 'shield_breaker', name: '破阵星芒', desc: '对护盾、避雷针与裂隙核心法球造成 +65% 额外伤害', tag: '破阵' },
] as const;

/** 平缓指数血量倍率：1-1 为 1.0x，6-10 封顶 4.6x */
export function calcStageHpMult(globalStage: number): number {
    const s = Math.max(1, Math.min(DUNGEON_TOTAL_STAGES, globalStage));
    const ratio = (s - 1) / (DUNGEON_TOTAL_STAGES - 1);
    return Number((1.0 + 3.6 * Math.pow(ratio, 1.35)).toFixed(2));
}

/** 根据全局关卡号（1..60）生成该关的完整数据驱动配置 */
export function getStageConfig(globalStage: number): StageConfig {
    const clamped = Math.max(1, Math.min(DUNGEON_IMPLEMENTED_MAX_STAGE, globalStage));
    const chapter = Math.ceil(clamped / 10);
    const subStage = ((clamped - 1) % 10) + 1;
    const biome = DUNGEON_BIOMES[chapter - 1];
    const hpMult = calcStageHpMult(clamped);

    // 7 类房间节奏：X-3 祝福、X-4 宝箱、X-5 中途首领、X-7 铁匠升阶、X-8 精英赏金、X-10 关底双阶段首领
    let roomKind: RoomKind = 'combat';
    if (subStage === 3) roomKind = 'blessing';
    else if (subStage === 4) roomKind = 'chest';
    else if (subStage === 5) roomKind = 'mid_boss';
    else if (subStage === 7) roomKind = 'blacksmith';
    else if (subStage === 8) roomKind = 'elite_bounty';
    else if (subStage === 10) roomKind = 'final_boss';

    // 按房号轮换石柱掩体布局
    const pillarTemplates: [number, number][][] = [
        [[-140, 100], [-140, -100], [140, 0]],
        [[-150, 0], [80, 110], [80, -110]],
        [[-135, 105], [-135, -105], [120, 105], [120, -105]],
        [[-180, 100], [-180, -100]],
    ];
    let pillars: [number, number][] = [];
    if (roomKind === 'combat' || roomKind === 'elite_bounty') {
        pillars = pillarTemplates[(clamped - 1) % 3];
    } else if (roomKind === 'mid_boss' || roomKind === 'final_boss') {
        pillars = pillarTemplates[3];
    }

    const isFightRoom = roomKind === 'combat' || roomKind === 'elite_bounty' || roomKind === 'mid_boss' || roomKind === 'final_boss';
    const hasCrackedWall = roomKind === 'combat' && (subStage === 1 || subStage === 2 || subStage === 6 || subStage === 9);
    const spikeCount = chapter === 1 && roomKind === 'combat' && subStage >= 2 ? (subStage >= 6 ? 3 : 2) : 0;
    const magmaInterval = chapter === 2 && isFightRoom
        ? (roomKind === 'final_boss' ? 2.4 : subStage >= 6 ? 2.8 : 3.4)
        : 0;
    const jarCount = chapter === 2 && (roomKind === 'combat' || roomKind === 'elite_bounty') ? 2 : 0;
    const hasIceFloor = chapter === 3 && roomKind !== 'blessing' && roomKind !== 'blacksmith';
    const frostWindInterval = chapter === 3 && isFightRoom ? (roomKind === 'final_boss' ? 5.2 : 6.4) : 0;
    const hasMistFog = chapter === 4 && isFightRoom;
    const poisonPoolCount = chapter === 4 && (roomKind === 'combat' || roomKind === 'elite_bounty') ? (subStage >= 6 ? 3 : 2) : 0;
    const copperPillarCount = chapter === 5 && isFightRoom ? (subStage >= 6 ? 3 : 2) : 0;
    const hasReflectWalls = chapter === 5 && isFightRoom;
    const riftVortexCount = chapter === 6 && isFightRoom ? (subStage >= 6 ? 2 : 1) : 0;
    const hasSealRing = chapter === 6 && isFightRoom && subStage >= 5;

    const spawns: StageConfig['spawns'] = [];
    if (chapter === 1) {
        if (subStage === 1) {
            spawns.push(
                { kind: 'bamboo_imp', x: 140, y: 110 },
                { kind: 'bamboo_imp', x: 180, y: -110 },
                { kind: 'ink_spirit', x: 320, y: 40 },
                { kind: 'ink_spirit', x: 300, y: -90 },
            );
        } else if (subStage === 2) {
            spawns.push(
                { kind: 'paper_golem', x: 130, y: 115 },
                { kind: 'bamboo_imp', x: 200, y: 0 },
                { kind: 'bamboo_imp', x: 180, y: -120 },
                { kind: 'ink_spirit', x: 330, y: 120 },
                { kind: 'ink_spirit', x: 330, y: -120 },
            );
        } else if (subStage === 5) {
            spawns.push(
                { kind: 'boss_giant_bamboo', x: 240, y: 0 },
                { kind: 'bamboo_imp', x: 340, y: 130 },
                { kind: 'bamboo_imp', x: 340, y: -130 },
            );
        } else if (subStage === 6) {
            spawns.push(
                { kind: 'paper_golem', x: 130, y: 120, elite: true },
                { kind: 'paper_golem', x: 130, y: -120 },
                { kind: 'ink_spirit', x: 320, y: 95 },
                { kind: 'ink_spirit', x: 320, y: -95 },
                { kind: 'bamboo_imp', x: 240, y: 0 },
            );
        } else if (subStage === 8) {
            // 精英赏金房
            spawns.push(
                { kind: 'paper_golem', x: 160, y: 110, elite: true },
                { kind: 'ink_spirit', x: 310, y: -105, elite: true },
                { kind: 'bamboo_imp', x: 250, y: 15, elite: true },
            );
        } else if (subStage === 9) {
            spawns.push(
                { kind: 'paper_golem', x: 120, y: 130, elite: true },
                { kind: 'paper_golem', x: 120, y: -130, elite: true },
                { kind: 'bamboo_imp', x: 230, y: 90 },
                { kind: 'bamboo_imp', x: 230, y: -90 },
                { kind: 'ink_spirit', x: 360, y: 130 },
                { kind: 'ink_spirit', x: 360, y: -130 },
            );
        } else if (subStage === 10) {
            spawns.push(
                { kind: 'boss_stone_spirit', x: 260, y: 0 },
                { kind: 'ink_spirit', x: 360, y: 145 },
                { kind: 'ink_spirit', x: 360, y: -145 },
            );
        }
    } else if (chapter === 2) {
        if (subStage === 1) {
            spawns.push(
                { kind: 'fire_bat', x: 170, y: 120 },
                { kind: 'fire_bat', x: 190, y: -120 },
                { kind: 'magma_turtle', x: 260, y: 0 },
                { kind: 'ink_spirit', x: 350, y: 80 },
            );
        } else if (subStage === 2) {
            spawns.push(
                { kind: 'magma_turtle', x: 150, y: 115 },
                { kind: 'magma_turtle', x: 150, y: -115 },
                { kind: 'fire_bat', x: 290, y: 130 },
                { kind: 'fire_bat', x: 290, y: -130 },
                { kind: 'fire_taoist', x: 340, y: 0 },
            );
        } else if (subStage === 5) {
            spawns.push(
                { kind: 'boss_magma_furnace', x: 230, y: 0 },
                { kind: 'fire_bat', x: 350, y: 140 },
                { kind: 'fire_bat', x: 350, y: -140 },
            );
        } else if (subStage === 6) {
            spawns.push(
                { kind: 'magma_turtle', x: 140, y: 120, elite: true },
                { kind: 'fire_taoist', x: 270, y: 110 },
                { kind: 'fire_taoist', x: 270, y: -110 },
                { kind: 'fire_bat', x: 350, y: 60 },
                { kind: 'fire_bat', x: 350, y: -60 },
            );
        } else if (subStage === 8) {
            spawns.push(
                { kind: 'magma_turtle', x: 160, y: 115, elite: true },
                { kind: 'fire_taoist', x: 300, y: -110, elite: true },
                { kind: 'fire_bat', x: 280, y: 10, elite: true },
            );
        } else if (subStage === 9) {
            spawns.push(
                { kind: 'magma_turtle', x: 130, y: 125, elite: true },
                { kind: 'magma_turtle', x: 130, y: -125, elite: true },
                { kind: 'fire_taoist', x: 250, y: 100 },
                { kind: 'fire_taoist', x: 250, y: -100 },
                { kind: 'fire_bat', x: 360, y: 135 },
                { kind: 'fire_bat', x: 360, y: -135 },
            );
        } else if (subStage === 10) {
            spawns.push(
                { kind: 'boss_magma_wyrm', x: 250, y: 0 },
                { kind: 'fire_taoist', x: 360, y: 145 },
                { kind: 'fire_bat', x: 360, y: -145 },
            );
        }
    } else if (chapter === 3) {
        if (subStage === 1) {
            spawns.push(
                { kind: 'ice_prism', x: 210, y: 120 },
                { kind: 'ice_prism', x: 210, y: -120 },
                { kind: 'snow_puppet', x: 160, y: 0 },
                { kind: 'snow_puppet', x: 320, y: 50 },
            );
        } else if (subStage === 2) {
            spawns.push(
                { kind: 'frost_mirror_guard', x: 140, y: 110 },
                { kind: 'frost_mirror_guard', x: 140, y: -110 },
                { kind: 'ice_prism', x: 330, y: 120 },
                { kind: 'ice_prism', x: 330, y: -120 },
                { kind: 'snow_puppet', x: 240, y: 0 },
            );
        } else if (subStage === 5) {
            spawns.push(
                { kind: 'boss_frost_crane', x: 240, y: 0 },
                { kind: 'ice_prism', x: 350, y: 135 },
                { kind: 'snow_puppet', x: 350, y: -135 },
            );
        } else if (subStage === 6) {
            spawns.push(
                { kind: 'frost_mirror_guard', x: 140, y: 120, elite: true },
                { kind: 'snow_puppet', x: 240, y: 105 },
                { kind: 'snow_puppet', x: 240, y: -105 },
                { kind: 'ice_prism', x: 350, y: 75 },
                { kind: 'ice_prism', x: 350, y: -75 },
            );
        } else if (subStage === 8) {
            spawns.push(
                { kind: 'frost_mirror_guard', x: 160, y: 115, elite: true },
                { kind: 'ice_prism', x: 320, y: -110, elite: true },
                { kind: 'snow_puppet', x: 260, y: 15, elite: true },
            );
        } else if (subStage === 9) {
            spawns.push(
                { kind: 'frost_mirror_guard', x: 130, y: 125, elite: true },
                { kind: 'frost_mirror_guard', x: 130, y: -125, elite: true },
                { kind: 'snow_puppet', x: 250, y: 95 },
                { kind: 'snow_puppet', x: 250, y: -95 },
                { kind: 'ice_prism', x: 360, y: 135 },
                { kind: 'ice_prism', x: 360, y: -135 },
            );
        } else if (subStage === 10) {
            spawns.push(
                { kind: 'boss_frost_turtle', x: 250, y: 0 },
                { kind: 'ice_prism', x: 360, y: 145 },
                { kind: 'ice_prism', x: 360, y: -145 },
            );
        }
    } else if (chapter === 4) {
        if (subStage === 1) {
            spawns.push(
                { kind: 'venom_frog', x: 170, y: 115 },
                { kind: 'venom_frog', x: 170, y: -115 },
                { kind: 'miasma_flower', x: 340, y: 80 },
                { kind: 'miasma_flower', x: 340, y: -80 },
            );
        } else if (subStage === 2) {
            spawns.push(
                { kind: 'shadow_ink_assassin', x: 220, y: 120 },
                { kind: 'shadow_ink_assassin', x: 220, y: -120 },
                { kind: 'venom_frog', x: 150, y: 0 },
                { kind: 'miasma_flower', x: 350, y: 110 },
                { kind: 'miasma_flower', x: 350, y: -110 },
            );
        } else if (subStage === 5) {
            spawns.push(
                { kind: 'boss_ink_lotus', x: 220, y: 0 },
                { kind: 'venom_frog', x: 340, y: 135 },
                { kind: 'venom_frog', x: 340, y: -135 },
            );
        } else if (subStage === 6) {
            spawns.push(
                { kind: 'shadow_ink_assassin', x: 200, y: 120, elite: true },
                { kind: 'venom_frog', x: 150, y: -110 },
                { kind: 'miasma_flower', x: 350, y: 120 },
                { kind: 'miasma_flower', x: 350, y: -120 },
                { kind: 'shadow_ink_assassin', x: 290, y: 0 },
            );
        } else if (subStage === 8) {
            spawns.push(
                { kind: 'shadow_ink_assassin', x: 200, y: 115, elite: true },
                { kind: 'miasma_flower', x: 340, y: -110, elite: true },
                { kind: 'venom_frog', x: 240, y: 10, elite: true },
            );
        } else if (subStage === 9) {
            spawns.push(
                { kind: 'shadow_ink_assassin', x: 170, y: 125, elite: true },
                { kind: 'shadow_ink_assassin', x: 170, y: -125, elite: true },
                { kind: 'venom_frog', x: 260, y: 95 },
                { kind: 'venom_frog', x: 260, y: -95 },
                { kind: 'miasma_flower', x: 360, y: 135 },
                { kind: 'miasma_flower', x: 360, y: -135 },
            );
        } else if (subStage === 10) {
            spawns.push(
                { kind: 'boss_ghost_spider', x: 250, y: 0 },
                { kind: 'shadow_ink_assassin', x: 360, y: 140 },
                { kind: 'miasma_flower', x: 360, y: -140 },
            );
        }
    } else if (chapter === 5) {
        if (subStage === 1) {
            spawns.push(
                { kind: 'arc_sparrow', x: 220, y: 120 },
                { kind: 'arc_sparrow', x: 220, y: -120 },
                { kind: 'thunder_drummer', x: 340, y: 65 },
                { kind: 'bronze_guardian', x: 160, y: 0 },
            );
        } else if (subStage === 2) {
            spawns.push(
                { kind: 'bronze_guardian', x: 145, y: 115 },
                { kind: 'bronze_guardian', x: 145, y: -115 },
                { kind: 'arc_sparrow', x: 310, y: 125 },
                { kind: 'arc_sparrow', x: 310, y: -125 },
                { kind: 'thunder_drummer', x: 350, y: 0 },
            );
        } else if (subStage === 5) {
            spawns.push(
                { kind: 'boss_thunder_lion', x: 240, y: 0 },
                { kind: 'arc_sparrow', x: 355, y: 135 },
                { kind: 'arc_sparrow', x: 355, y: -135 },
            );
        } else if (subStage === 6) {
            spawns.push(
                { kind: 'bronze_guardian', x: 150, y: 115, elite: true },
                { kind: 'thunder_drummer', x: 345, y: 115 },
                { kind: 'thunder_drummer', x: 345, y: -115 },
                { kind: 'arc_sparrow', x: 260, y: 60 },
                { kind: 'arc_sparrow', x: 260, y: -60 },
            );
        } else if (subStage === 8) {
            spawns.push(
                { kind: 'bronze_guardian', x: 165, y: 115, elite: true },
                { kind: 'thunder_drummer', x: 335, y: -110, elite: true },
                { kind: 'arc_sparrow', x: 265, y: 10, elite: true },
            );
        } else if (subStage === 9) {
            spawns.push(
                { kind: 'bronze_guardian', x: 140, y: 125, elite: true },
                { kind: 'bronze_guardian', x: 140, y: -125, elite: true },
                { kind: 'thunder_drummer', x: 345, y: 115 },
                { kind: 'thunder_drummer', x: 345, y: -115 },
                { kind: 'arc_sparrow', x: 255, y: 80 },
                { kind: 'arc_sparrow', x: 255, y: -80 },
            );
        } else if (subStage === 10) {
            spawns.push(
                { kind: 'boss_thunder_lord', x: 255, y: 0 },
                { kind: 'arc_sparrow', x: 360, y: 145 },
                { kind: 'thunder_drummer', x: 360, y: -145 },
            );
        }
    } else if (chapter === 6) {
        if (subStage === 1) {
            spawns.push(
                { kind: 'rift_walker', x: 210, y: 115 },
                { kind: 'rift_walker', x: 210, y: -115 },
                { kind: 'mana_eater', x: 165, y: 0 },
                { kind: 'star_puppet', x: 345, y: 60 },
            );
        } else if (subStage === 2) {
            spawns.push(
                { kind: 'mana_eater', x: 155, y: 115 },
                { kind: 'mana_eater', x: 155, y: -115 },
                { kind: 'rift_walker', x: 275, y: 120 },
                { kind: 'star_puppet', x: 350, y: 90 },
                { kind: 'star_puppet', x: 350, y: -90 },
            );
        } else if (subStage === 5) {
            // 6-5 双生界卫同场
            spawns.push(
                { kind: 'boss_twin_melee', x: 220, y: 95 },
                { kind: 'boss_twin_ranged', x: 290, y: -95 },
            );
        } else if (subStage === 6) {
            spawns.push(
                { kind: 'mana_eater', x: 160, y: 120, elite: true },
                { kind: 'rift_walker', x: 260, y: 100 },
                { kind: 'rift_walker', x: 260, y: -100 },
                { kind: 'star_puppet', x: 355, y: 115 },
                { kind: 'star_puppet', x: 355, y: -115 },
            );
        } else if (subStage === 8) {
            spawns.push(
                { kind: 'mana_eater', x: 165, y: 115, elite: true },
                { kind: 'rift_walker', x: 270, y: 15, elite: true },
                { kind: 'star_puppet', x: 345, y: -110, elite: true },
            );
        } else if (subStage === 9) {
            spawns.push(
                { kind: 'mana_eater', x: 150, y: 125, elite: true },
                { kind: 'mana_eater', x: 150, y: -125, elite: true },
                { kind: 'rift_walker', x: 255, y: 95, elite: true },
                { kind: 'rift_walker', x: 255, y: -95 },
                { kind: 'star_puppet', x: 355, y: 125 },
                { kind: 'star_puppet', x: 355, y: -125 },
            );
        } else if (subStage === 10) {
            spawns.push(
                { kind: 'boss_rift_overlord', x: 250, y: 0 },
                { kind: 'rift_walker', x: 360, y: 145 },
                { kind: 'star_puppet', x: 360, y: -145 },
            );
        }
    }

    return {
        globalStage: clamped,
        chapter,
        subStage,
        label: `${chapter}-${subStage}`,
        biome,
        roomKind,
        hpMult,
        pillars,
        hasCrackedWall,
        spikeCount,
        magmaInterval,
        jarCount,
        hasIceFloor,
        frostWindInterval,
        hasMistFog,
        poisonPoolCount,
        copperPillarCount,
        hasReflectWalls,
        riftVortexCount,
        hasSealRing,
        spawns,
    };
}
