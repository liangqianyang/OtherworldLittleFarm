/**
 * 《异界小农场 2.0》元气骑士风地牢武器库与品质系统
 * - 6 大手感迥异的国风武器（近战劈弹幕剑、连射弩、爆炎火铳、连锁雷杖、寒冰折扇、追踪飞剑匣）
 * - 5 档品质（凡铁/青灵/玄玉/天罡/仙器），宝箱与商店可掉落更高品质
 */

export type WeaponId =
    | 'bamboo_sword'
    | 'wind_crossbow'
    | 'flame_shotgun'
    | 'thunder_staff'
    | 'frost_fan'
    | 'spirit_blade_box';

export type WeaponRarity = 0 | 1 | 2 | 3 | 4;

export interface WeaponDef {
    id: WeaponId;
    artKey: string;
    name: string;
    tag: string;
    desc: string;
    kind: 'melee' | 'arrow' | 'shotgun' | 'lightning' | 'frost' | 'homing';
    baseDamage: number;
    energyCost: number;
    cooldown: number;
    critChance: number;
    range: number;
    projSpeed: number;
    burstCount: number;
    spreadDeg: number;
    canSlashBullets: boolean;
    colorHex: string;
    accentHex: string;
}

export interface WeaponInstance {
    id: WeaponId;
    rarity: WeaponRarity;
}

export const RARITY_NAMES: readonly string[] = ['凡铁', '青灵', '玄玉', '天罡', '仙器'];
export const RARITY_COLORS: readonly string[] = ['#E5E7EB', '#4ADE80', '#60A5FA', '#C084FC', '#FB923C'];
export const RARITY_DMG_MULT: readonly number[] = [1.0, 1.25, 1.55, 1.92, 2.38];
export const RARITY_CRIT_BONUS: readonly number[] = [0, 0.04, 0.08, 0.14, 0.22];

export const DUNGEON_WEAPONS: Record<WeaponId, WeaponDef> = {
    bamboo_sword: {
        id: 'bamboo_sword',
        artKey: 'wpn_bamboo_sword',
        name: '青竹斩灵剑',
        tag: '近战·劈弹幕',
        desc: '0耗蓝大弧度剑气斩，可劈散敌方弹幕，第3段挥出穿透月牙波',
        kind: 'melee',
        baseDamage: 14,
        energyCost: 0,
        cooldown: 0.30,
        critChance: 0.18,
        range: 132,
        projSpeed: 640,
        burstCount: 1,
        spreadDeg: 0,
        canSlashBullets: true,
        colorHex: '#6EE7B7',
        accentHex: '#ECFDF5',
    },
    wind_crossbow: {
        id: 'wind_crossbow',
        artKey: 'wpn_wind_crossbow',
        name: '疾风竹连弩',
        tag: '速射·高暴击',
        desc: '低耗蓝高频连射青羽箭，弹道轻快、暴击率高',
        kind: 'arrow',
        baseDamage: 11,
        energyCost: 1,
        cooldown: 0.16,
        critChance: 0.26,
        range: 640,
        projSpeed: 840,
        burstCount: 1,
        spreadDeg: 5,
        canSlashBullets: false,
        colorHex: '#34D399',
        accentHex: '#FDE68A',
    },
    flame_shotgun: {
        id: 'flame_shotgun',
        artKey: 'wpn_flame_shotgun',
        name: '爆炎赤火铳',
        tag: '霰弹·贴脸爆发',
        desc: '扇形5发赤焰火弹齐射，命中炸出火焰冲击波并附带灼烧',
        kind: 'shotgun',
        baseDamage: 10,
        energyCost: 3,
        cooldown: 0.52,
        critChance: 0.16,
        range: 390,
        projSpeed: 680,
        burstCount: 5,
        spreadDeg: 36,
        canSlashBullets: false,
        colorHex: '#FB923C',
        accentHex: '#FEF08A',
    },
    thunder_staff: {
        id: 'thunder_staff',
        artKey: 'wpn_thunder_staff',
        name: '九天惊雷杖',
        tag: '连锁闪电·清场',
        desc: '瞬发锯齿天雷，命中后自动弹射附近3名敌人，清群怪极爽',
        kind: 'lightning',
        baseDamage: 24,
        energyCost: 4,
        cooldown: 0.48,
        critChance: 0.22,
        range: 520,
        projSpeed: 0,
        burstCount: 3,
        spreadDeg: 0,
        canSlashBullets: false,
        colorHex: '#93C5FD',
        accentHex: '#E0F2FE',
    },
    frost_fan: {
        id: 'frost_fan',
        artKey: 'wpn_frost_fan',
        name: '玄冰散华扇',
        tag: '穿透·冰冻控制',
        desc: '扇形挥出3枚穿透寒冰棱刃，命中减速并有概率冻结敌人',
        kind: 'frost',
        baseDamage: 13,
        energyCost: 2,
        cooldown: 0.36,
        critChance: 0.20,
        range: 560,
        projSpeed: 620,
        burstCount: 3,
        spreadDeg: 26,
        canSlashBullets: false,
        colorHex: '#67E8F9',
        accentHex: '#F0F9FF',
    },
    spirit_blade_box: {
        id: 'spirit_blade_box',
        artKey: 'wpn_spirit_blade_box',
        name: '青云飞剑匣',
        tag: '自动追踪·御剑',
        desc: '放出2柄青光追踪飞剑绕掩体穿刺敌人，操作省心流畅',
        kind: 'homing',
        baseDamage: 12,
        energyCost: 2,
        cooldown: 0.34,
        critChance: 0.22,
        range: 680,
        projSpeed: 540,
        burstCount: 2,
        spreadDeg: 32,
        canSlashBullets: false,
        colorHex: '#A78BFA',
        accentHex: '#EDE9FE',
    },
};

export const STARTER_WEAPON_LIST: readonly WeaponId[] = [
    'bamboo_sword',
    'wind_crossbow',
    'flame_shotgun',
    'thunder_staff',
    'frost_fan',
    'spirit_blade_box',
];

export function getWeaponDef(id: WeaponId): WeaponDef {
    return DUNGEON_WEAPONS[id] ?? DUNGEON_WEAPONS.bamboo_sword;
}

export function getWeaponDisplayName(inst: WeaponInstance): string {
    const def = getWeaponDef(inst.id);
    return `${RARITY_NAMES[inst.rarity]}·${def.name}`;
}

export function getWeaponDamage(inst: WeaponInstance, bonusMult = 1): number {
    const def = getWeaponDef(inst.id);
    return Math.max(1, Math.round(def.baseDamage * RARITY_DMG_MULT[inst.rarity] * bonusMult));
}

export function getWeaponCrit(inst: WeaponInstance, bonusCrit = 0): number {
    const def = getWeaponDef(inst.id);
    return Math.min(0.85, def.critChance + RARITY_CRIT_BONUS[inst.rarity] + bonusCrit);
}

export function rollWeaponDrop(stageNum: number, excludeIds: WeaponId[] = []): WeaponInstance {
    const pool = STARTER_WEAPON_LIST.filter((id) => !excludeIds.includes(id));
    const pickPool = pool.length > 0 ? pool : STARTER_WEAPON_LIST;
    const id = pickPool[Math.floor(Math.random() * pickPool.length)];
    const r = Math.random();
    let rarity: WeaponRarity = 1;
    if (stageNum >= 40) {
        rarity = r < 0.28 ? 4 : r < 0.72 ? 3 : 2;
    } else if (stageNum >= 20) {
        rarity = r < 0.15 ? 4 : r < 0.50 ? 3 : 2;
    } else if (stageNum >= 6) {
        rarity = r < 0.12 ? 3 : r < 0.55 ? 2 : 1;
    } else {
        rarity = r < 0.28 ? 2 : 1;
    }
    return { id, rarity };
}
