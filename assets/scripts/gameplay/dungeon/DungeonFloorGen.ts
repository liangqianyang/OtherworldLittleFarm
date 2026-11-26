/**
 * 《异界小农场 2.0》元气骑士式整层无缝地牢生成器（去柱子化 + 6 大关专属可玩机关 + 许愿池/重铸炉事件房）
 * - 走廊两端向房间内深嵌 48px，彻底消除门洞卡顿
 * - 取消所有功能房与通用战房的机械四角柱，改为 6 大关专属生态可玩机关：
 *   1.幽篁古墟：可砍断竹丛掩体 + 幽潭 + 竹刺
 *   2.丹砂熔窟：周期十字喷火口 + 连锁火药罐 + 岩浆池
 *   3.寒玉冰宫：真·打滑冰面区 + 可打碎冰霜晶块（炸冰冻怪）
 *   4.墨瘴泽渊：全房瘴雾 + 驱雾古灯（点亮驱雾）+ 毒孢子囊（打破爆毒圈）
 *   5.雷纹古塔：成对导电铜柱（定时拉起闪电链）+ 雷纹疾行阵（加速+加攻速）
 *   6.裂隙天坛：成对双向时空传送阵 + 引力旋涡 + 悬浮星石碑
 * - 新增 2 种趣味事件房：灵泉许愿池（fountain）与玄铁重铸炉（reforge）
 */

import { ENEMY_STATS, type EnemyKind, type StageConfig } from './DungeonConfig';
import { type WeaponInstance, rollWeaponDrop } from './DungeonWeapons';

export type Dir4 = 'N' | 'S' | 'W' | 'E';
export type FloorRoomType =
    | 'start'
    | 'combat'
    | 'treasure'
    | 'altar'
    | 'shop'
    | 'fountain'
    | 'reforge'
    | 'boss'
    | 'portal';

export const CELL_W = 1240;
export const CELL_H = 880;
export const CORRIDOR_W = 156;

export interface RoomCrate {
    x: number;
    y: number;
    hp: number;
    kind: 'crate' | 'barrel';
    broken: boolean;
}

export interface RoomPillar {
    x: number;
    y: number;
    r: number;
}

export interface RoomWall {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface RoomPit {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface RoomSpike {
    x: number;
    y: number;
    r: number;
    phaseOffset: number;
}

export type BiomeMechanicKind =
    | 'bamboo_clump'
    | 'lava_vent'
    | 'ice_crystal'
    | 'ice_floor'
    | 'poison_pod'
    | 'mist_lamp'
    | 'thunder_coil'
    | 'thunder_pad'
    | 'rift_portal'
    | 'rift_vortex';

export interface RoomMechanic {
    id: number;
    kind: BiomeMechanicKind;
    x: number;
    y: number;
    r: number;
    w?: number;
    h?: number;
    hp: number;
    broken: boolean;
    lit: boolean;
    pairId: number;
    phaseOffset: number;
}

export interface WaveSpawnEntry {
    kind: EnemyKind;
    elite?: boolean;
}

export interface ShopOffer {
    id: string;
    label: string;
    cost: number;
    kind: 'heal' | 'weapon' | 'upgrade';
    weapon?: WeaponInstance;
    bought: boolean;
}

export interface FloorRoomData {
    key: string;
    gx: number;
    gy: number;
    worldX: number;
    worldY: number;
    halfW: number;
    halfH: number;
    shapeTag: string;
    type: FloorRoomType;
    templateName: string;
    doors: Record<Dir4, string | null>;
    visited: boolean;
    cleared: boolean;
    waves: WaveSpawnEntry[][];
    pillars: RoomPillar[];
    walls: RoomWall[];
    pits: RoomPit[];
    crates: RoomCrate[];
    spikes: RoomSpike[];
    mechanics: RoomMechanic[];
    chestOpened: boolean;
    chestWeapon: WeaponInstance | null;
    altarUsed: boolean;
    fountainWishesLeft: number;
    reforgeUsesLeft: number;
    shopOffers: ShopOffer[];
    portalActive: boolean;
}

export interface FloorCorridor {
    fromKey: string;
    toKey: string;
    x: number;
    y: number;
    w: number;
    h: number;
    horizontal: boolean;
}

export interface DungeonFloorMap {
    stageNum: number;
    rooms: Map<string, FloorRoomData>;
    corridors: FloorCorridor[];
    startKey: string;
    endKey: string;
}

export const OPPOSITE_DIR: Record<Dir4, Dir4> = { N: 'S', S: 'N', W: 'E', E: 'W' };

const DIR_DELTA: Record<Dir4, [number, number]> = {
    N: [0, 1],
    S: [0, -1],
    W: [-1, 0],
    E: [1, 0],
};

function keyOf(gx: number, gy: number): string {
    return `${gx},${gy}`;
}

interface RoomTemplateDef {
    name: string;
    shapeTag: string;
    halfW: number;
    halfH: number;
    walls: RoomWall[];
    pits: RoomPit[];
    crates: { x: number; y: number; kind: 'crate' | 'barrel' }[];
    spikes: { x: number; y: number; r: number; phaseOffset: number }[];
}

/** 10 套去通用柱子化的多尺寸/异形战房蓝图（内部掩体与可玩机关由各大关生态动态注入！） */
const TACTICAL_ROOM_TEMPLATES: readonly RoomTemplateDef[] = [
    {
        name: '双桥孤岛阵',
        shapeTag: '双岛断崖',
        halfW: 480,
        halfH: 270,
        walls: [],
        pits: [
            { x: -175, y: 0, w: 76, h: 205 },
            { x: 175, y: 0, w: 76, h: 205 },
        ],
        crates: [
            { x: 0, y: 84, kind: 'barrel' }, { x: 0, y: -84, kind: 'barrel' },
        ],
        spikes: [],
    },
    {
        name: '双角石垣巷战阵',
        shapeTag: 'L形拐角厅',
        halfW: 460,
        halfH: 260,
        walls: [
            { x: -230, y: 95, w: 150, h: 34 }, { x: -288, y: 18, w: 34, h: 120 },
            { x: 230, y: -95, w: 150, h: 34 }, { x: 288, y: -18, w: 34, h: 120 },
        ],
        pits: [],
        crates: [
            { x: -145, y: -105, kind: 'barrel' }, { x: 145, y: 105, kind: 'barrel' },
        ],
        spikes: [{ x: 0, y: -135, r: 30, phaseOffset: 0 }],
    },
    {
        name: '火药连锁爆破厅',
        shapeTag: '宽阔广场',
        halfW: 520,
        halfH: 290,
        walls: [{ x: 0, y: 148, w: 176, h: 34 }, { x: 0, y: -148, w: 176, h: 34 }],
        pits: [],
        crates: [
            { x: -195, y: 82, kind: 'barrel' }, { x: -65, y: 28, kind: 'barrel' },
            { x: 65, y: -28, kind: 'barrel' }, { x: 195, y: -82, kind: 'barrel' },
        ],
        spikes: [],
    },
    {
        name: '断桥深壑狙击廊',
        shapeTag: '窄长通道',
        halfW: 510,
        halfH: 210,
        walls: [{ x: -260, y: -92, w: 130, h: 32 }, { x: 260, y: -92, w: 130, h: 32 }],
        pits: [
            { x: 0, y: 105, w: 220, h: 58 },
            { x: 0, y: -105, w: 220, h: 58 },
        ],
        crates: [
            { x: -165, y: 0, kind: 'barrel' }, { x: 165, y: 0, kind: 'barrel' },
        ],
        spikes: [{ x: 0, y: 0, r: 30, phaseOffset: 1.4 }],
    },
    {
        name: '十字圣殿机关阵',
        shapeTag: '十字圣殿',
        halfW: 480,
        halfH: 280,
        walls: [
            { x: -345, y: 185, w: 170, h: 90 },
            { x: 345, y: 185, w: 170, h: 90 },
            { x: -345, y: -185, w: 170, h: 90 },
            { x: 345, y: -185, w: 170, h: 90 },
            { x: 0, y: 0, w: 72, h: 72 },
        ],
        pits: [],
        crates: [
            { x: -195, y: 0, kind: 'barrel' }, { x: 195, y: 0, kind: 'barrel' },
        ],
        spikes: [
            { x: -140, y: 90, r: 28, phaseOffset: 0 },
            { x: 140, y: 90, r: 28, phaseOffset: 2.0 },
        ],
    },
    {
        name: '回字石城迷阵',
        shapeTag: '标准战房',
        halfW: 430,
        halfH: 250,
        walls: [
            { x: -155, y: 92, w: 130, h: 32 }, { x: 155, y: 92, w: 130, h: 32 },
            { x: -155, y: -92, w: 130, h: 32 }, { x: 155, y: -92, w: 130, h: 32 },
        ],
        pits: [],
        crates: [
            { x: 0, y: 0, kind: 'barrel' },
        ],
        spikes: [],
    },
    {
        name: '双沟狭道伏击厅',
        shapeTag: '纵深狭长厅',
        halfW: 360,
        halfH: 295,
        walls: [],
        pits: [
            { x: -190, y: 125, w: 130, h: 66 },
            { x: 190, y: -125, w: 130, h: 66 },
        ],
        crates: [
            { x: -190, y: -125, kind: 'barrel' }, { x: 190, y: 125, kind: 'barrel' },
        ],
        spikes: [],
    },
    {
        name: '凹字烽火壁垒',
        shapeTag: '凹字战厅',
        halfW: 480,
        halfH: 270,
        walls: [
            { x: -165, y: 0, w: 34, h: 140 },
            { x: 165, y: 0, w: 34, h: 140 },
            { x: 0, y: 155, w: 190, h: 36 },
        ],
        pits: [],
        crates: [
            { x: -330, y: 135, kind: 'barrel' }, { x: 330, y: 135, kind: 'barrel' },
        ],
        spikes: [],
    },
    {
        name: '宽阔回廊大殿',
        shapeTag: '宽阔广场',
        halfW: 520,
        halfH: 285,
        walls: [{ x: 0, y: 0, w: 136, h: 34 }],
        pits: [{ x: -315, y: -135, w: 112, h: 68 }, { x: 315, y: 135, w: 112, h: 68 }],
        crates: [
            { x: 0, y: 125, kind: 'barrel' }, { x: 0, y: -125, kind: 'barrel' },
        ],
        spikes: [],
    },
    {
        name: '秘境首领大殿',
        shapeTag: '首领大殿',
        halfW: 530,
        halfH: 295,
        walls: [],
        pits: [],
        crates: [
            { x: -200, y: 175, kind: 'barrel' }, { x: 200, y: -175, kind: 'barrel' },
        ],
        spikes: [],
    },
];

let _nextMechId = 1;

/** 按 6 大关生态注入真正改变玩法的专属可玩机关（彻底告别千篇一律的通用柱子！） */
function buildBiomeMechanics(
    chapter: number,
    worldX: number,
    worldY: number,
    halfW: number,
    halfH: number,
    isBoss: boolean
): { mechanics: RoomMechanic[]; pillars: RoomPillar[] } {
    const mechanics: RoomMechanic[] = [];
    const pillars: RoomPillar[] = [];
    const ox = Math.min(260, halfW - 110);
    const oy = Math.min(135, halfH - 80);

    if (chapter === 1) {
        // 第 1 关幽篁古墟：4 簇可砍断的茂密竹丛掩体（挡子弹，挥剑 2-3 下劈开开辟路线！）
        const pts: [number, number][] = [[-ox, oy], [ox, oy], [-ox, -oy], [ox, -oy]];
        for (const [dx, dy] of pts) {
            mechanics.push({ id: _nextMechId++, kind: 'bamboo_clump', x: worldX + dx, y: worldY + dy, r: 28, hp: 28, broken: false, lit: false, pairId: 0, phaseOffset: 0 });
        }
    } else if (chapter === 2) {
        // 第 2 关丹砂熔窟：周期十字喷火口（预警后向四向喷射炙热火柱！）
        const pts: [number, number, number][] = isBoss
            ? [[-ox, oy, 0], [ox, -oy, 1.8], [-ox, -oy, 0.9], [ox, oy, 2.7]]
            : [[-ox * 0.72, oy * 0.65, 0], [ox * 0.72, -oy * 0.65, 1.8]];
        for (const [dx, dy, ph] of pts) {
            mechanics.push({ id: _nextMechId++, kind: 'lava_vent', x: worldX + dx, y: worldY + dy, r: 30, hp: 999, broken: false, lit: false, pairId: 0, phaseOffset: ph });
        }
    } else if (chapter === 3) {
        // 第 3 关寒玉冰宫：大面积真·打滑冰砖区 + 可打碎的寒冰晶块（打碎爆冰环冻结附近敌人！）
        mechanics.push({
            id: _nextMechId++, kind: 'ice_floor', x: worldX, y: worldY,
            r: 0, w: Math.round(halfW * 1.12), h: Math.round(halfH * 0.92),
            hp: 999, broken: false, lit: false, pairId: 0, phaseOffset: 0,
        });
        const pts: [number, number][] = [[-ox, oy], [ox, oy], [-ox, -oy], [ox, -oy]];
        for (const [dx, dy] of pts) {
            mechanics.push({ id: _nextMechId++, kind: 'ice_crystal', x: worldX + dx, y: worldY + dy, r: 26, hp: 22, broken: false, lit: false, pairId: 0, phaseOffset: 0 });
        }
    } else if (chapter === 4) {
        // 第 4 关墨瘴泽渊：2 盏可点亮驱雾古灯 + 3 个可打爆毒孢子囊（打破爆出毒圈！）
        mechanics.push({ id: _nextMechId++, kind: 'mist_lamp', x: worldX - ox * 0.85, y: worldY + oy * 0.72, r: 30, hp: 999, broken: false, lit: false, pairId: 1, phaseOffset: 0 });
        mechanics.push({ id: _nextMechId++, kind: 'mist_lamp', x: worldX + ox * 0.85, y: worldY - oy * 0.72, r: 30, hp: 999, broken: false, lit: false, pairId: 1, phaseOffset: 0 });
        const pods: [number, number][] = [[ox * 0.82, oy * 0.75], [-ox * 0.82, -oy * 0.75], [0, oy * 0.45]];
        for (const [dx, dy] of pods) {
            mechanics.push({ id: _nextMechId++, kind: 'poison_pod', x: worldX + dx, y: worldY + dy, r: 26, hp: 20, broken: false, lit: false, pairId: 0, phaseOffset: 0 });
        }
    } else if (chapter === 5) {
        // 第 5 关雷纹古塔：成对导电铜柱（仅雷塔独有！定时拉起高压闪电链封路）+ 雷纹疾行阵（踩上加速+加攻速）
        mechanics.push({ id: _nextMechId++, kind: 'thunder_coil', x: worldX - ox * 0.75, y: worldY + oy * 0.72, r: 24, hp: 999, broken: false, lit: false, pairId: 1, phaseOffset: 0 });
        mechanics.push({ id: _nextMechId++, kind: 'thunder_coil', x: worldX + ox * 0.75, y: worldY + oy * 0.72, r: 24, hp: 999, broken: false, lit: false, pairId: 1, phaseOffset: 0 });
        mechanics.push({ id: _nextMechId++, kind: 'thunder_coil', x: worldX - ox * 0.75, y: worldY - oy * 0.72, r: 24, hp: 999, broken: false, lit: false, pairId: 2, phaseOffset: 1.9 });
        mechanics.push({ id: _nextMechId++, kind: 'thunder_coil', x: worldX + ox * 0.75, y: worldY - oy * 0.72, r: 24, hp: 999, broken: false, lit: false, pairId: 2, phaseOffset: 1.9 });
        mechanics.push({ id: _nextMechId++, kind: 'thunder_pad', x: worldX, y: worldY - oy * 0.15, r: 38, hp: 999, broken: false, lit: false, pairId: 0, phaseOffset: 0 });
    } else if (chapter === 6) {
        // 第 6 关裂隙天坛：成对双向时空传送阵（踩上瞬移到房间另一侧风筝 Boss！）+ 引力旋涡 + 悬浮星石碑掩体
        mechanics.push({ id: _nextMechId++, kind: 'rift_portal', x: worldX - ox * 0.92, y: worldY + oy * 0.72, r: 34, hp: 999, broken: false, lit: false, pairId: 1, phaseOffset: 0 });
        mechanics.push({ id: _nextMechId++, kind: 'rift_portal', x: worldX + ox * 0.92, y: worldY - oy * 0.72, r: 34, hp: 999, broken: false, lit: false, pairId: 1, phaseOffset: 0 });
        mechanics.push({ id: _nextMechId++, kind: 'rift_vortex', x: worldX, y: worldY, r: 42, hp: 999, broken: false, lit: false, pairId: 0, phaseOffset: 0 });
        pillars.push({ x: worldX - ox * 0.7, y: worldY - oy * 0.65, r: 24 });
        pillars.push({ x: worldX + ox * 0.7, y: worldY + oy * 0.65, r: 24 });
    }

    return { mechanics, pillars };
}

function createRoomLayout(
    type: FloorRoomType,
    seed: number,
    stage: StageConfig,
    worldX: number,
    worldY: number
): {
    templateName: string;
    shapeTag: string;
    halfW: number;
    halfH: number;
    pillars: RoomPillar[];
    walls: RoomWall[];
    pits: RoomPit[];
    crates: RoomCrate[];
    spikes: RoomSpike[];
    mechanics: RoomMechanic[];
} {
    // 全部功能房彻底移除无意义四角柱！改用主题中心陈设 + 开阔呼吸感
    if (type === 'start' || type === 'treasure' || type === 'altar' || type === 'shop' || type === 'fountain' || type === 'reforge') {
        const halfW = type === 'start' ? 320 : 275;
        const halfH = type === 'start' ? 210 : 190;
        const crates: RoomCrate[] = type === 'start'
            ? [
                { x: worldX - 185, y: worldY + 110, hp: 16, kind: 'crate', broken: false },
                { x: worldX + 185, y: worldY - 110, hp: 16, kind: 'crate', broken: false },
            ]
            : [];
        const shapeMap: Record<string, string> = {
            start: '出征石厅',
            treasure: '袖珍宝库',
            altar: '灵泉圣坛',
            shop: '铁匠工坊',
            fountain: '灵泉许愿池',
            reforge: '玄铁重铸炉',
        };
        const shapeTag = shapeMap[type] ?? '秘境密室';
        return { templateName: shapeTag, shapeTag, halfW, halfH, pillars: [], walls: [], pits: [], crates, spikes: [], mechanics: [] };
    }

    let tpl: RoomTemplateDef;
    if (type === 'boss') {
        tpl = TACTICAL_ROOM_TEMPLATES[9];
    } else {
        const biomePools: Record<number, number[][]> = {
            1: [[2, 5, 8, 0], [1, 3, 6, 7], [4, 1, 3, 7]],
            2: [[0, 2, 3, 6], [2, 3, 7, 8], [3, 4, 7, 0]],
            3: [[5, 1, 6, 3], [1, 3, 5, 8], [4, 3, 1, 6]],
            4: [[6, 0, 8, 3], [0, 6, 4, 7], [3, 6, 4, 0]],
            5: [[7, 4, 5, 1], [4, 7, 1, 2], [4, 7, 3, 1]],
            6: [[3, 0, 4, 1], [0, 3, 6, 4], [4, 3, 0, 7]],
        };
        const tiers = biomePools[stage.chapter] ?? biomePools[1];
        const tierIdx = stage.subStage <= 3 ? 0 : stage.subStage <= 7 ? 1 : 2;
        const poolIdx = tiers[tierIdx];
        tpl = TACTICAL_ROOM_TEMPLATES[poolIdx[Math.abs(seed) % poolIdx.length]];
    }

    const { mechanics, pillars } = buildBiomeMechanics(stage.chapter, worldX, worldY, tpl.halfW, tpl.halfH, type === 'boss');

    // 只有第 1 大关保留竹刺，其他大关用各自专属可玩机关替代地刺！
    const useSpikes = stage.chapter === 1 ? tpl.spikes : [];

    return {
        templateName: tpl.name,
        shapeTag: tpl.shapeTag,
        halfW: tpl.halfW,
        halfH: tpl.halfH,
        pillars,
        walls: tpl.walls.map((w) => ({ x: worldX + w.x, y: worldY + w.y, w: w.w, h: w.h })),
        pits: tpl.pits.map((p) => ({ x: worldX + p.x, y: worldY + p.y, w: p.w, h: p.h })),
        crates: tpl.crates.map((c) => ({
            x: worldX + c.x,
            y: worldY + c.y,
            hp: c.kind === 'barrel' ? 14 : 18,
            kind: c.kind,
            broken: false,
        })),
        spikes: useSpikes.map((s) => ({ x: worldX + s.x, y: worldY + s.y, r: s.r, phaseOffset: s.phaseOffset })),
        mechanics,
    };
}

const CH1_ENCOUNTER_SCRIPTS: readonly WaveSpawnEntry[][][] = [
    [
        [{ kind: 'bamboo_imp' }, { kind: 'bamboo_imp' }, { kind: 'bamboo_archer' }, { kind: 'ink_spirit' }],
        [{ kind: 'paper_golem', elite: true }, { kind: 'bamboo_archer' }, { kind: 'ink_spirit' }, { kind: 'bamboo_imp' }],
    ],
    [
        [{ kind: 'paper_golem' }, { kind: 'bamboo_archer' }, { kind: 'bamboo_archer' }, { kind: 'bamboo_imp' }],
        [{ kind: 'bamboo_imp', elite: true }, { kind: 'ink_spirit' }, { kind: 'ink_spirit' }, { kind: 'bamboo_archer' }],
    ],
    [
        [{ kind: 'ink_spirit' }, { kind: 'bamboo_imp' }, { kind: 'bamboo_archer' }, { kind: 'bamboo_imp' }],
        [{ kind: 'paper_golem' }, { kind: 'ink_spirit', elite: true }, { kind: 'bamboo_archer' }],
        [{ kind: 'bamboo_imp' }, { kind: 'paper_golem' }, { kind: 'bamboo_archer' }, { kind: 'ink_spirit' }],
    ],
    [
        [{ kind: 'bamboo_imp' }, { kind: 'bamboo_imp' }, { kind: 'bamboo_archer' }, { kind: 'ink_spirit' }],
        [{ kind: 'bamboo_archer', elite: true }, { kind: 'paper_golem' }, { kind: 'bamboo_imp' }, { kind: 'ink_spirit' }],
    ],
];

function buildCombatWaves(stage: StageConfig, roomIndex: number, isEndRoom: boolean): WaveSpawnEntry[][] {
    const basePool: EnemyKind[] = [];
    let bossKind: EnemyKind | null = null;
    for (const sp of stage.spawns) {
        if (ENEMY_STATS[sp.kind]?.isBoss) {
            bossKind = sp.kind;
        } else if (!basePool.includes(sp.kind)) {
            basePool.push(sp.kind);
        }
    }

    if (isEndRoom && bossKind) {
        if (stage.chapter === 1) {
            return stage.subStage <= 5
                ? [[{ kind: bossKind }, { kind: 'bamboo_imp' }, { kind: 'bamboo_archer' }]]
                : [[{ kind: bossKind }, { kind: 'paper_golem' }, { kind: 'ink_spirit' }]];
        }
        const pool: EnemyKind[] = basePool.length > 0 ? basePool : ['bamboo_imp', 'ink_spirit'];
        return [[{ kind: bossKind }, { kind: pool[0] }, { kind: pool[pool.length - 1] }]];
    }

    if (stage.chapter === 1) {
        const script = CH1_ENCOUNTER_SCRIPTS[(stage.globalStage + roomIndex) % CH1_ENCOUNTER_SCRIPTS.length];
        const allowElite = stage.globalStage >= 2 || isEndRoom;
        return script.map((w) => w.map((e) => ({ kind: e.kind, elite: allowElite && !!e.elite })));
    }

    const pool: EnemyKind[] = basePool.length > 0 ? basePool : ['bamboo_imp', 'ink_spirit'];
    const waveCount = isEndRoom ? 2 : (roomIndex % 2 === 0 ? 2 : 3);
    const waves: WaveSpawnEntry[][] = [];
    for (let w = 0; w < waveCount; w++) {
        const cnt = Math.min(6, 4 + w);
        const list: WaveSpawnEntry[] = [];
        for (let i = 0; i < cnt; i++) {
            list.push({
                kind: pool[(roomIndex * 3 + w * 2 + i) % pool.length],
                elite: w === waveCount - 1 && i === 0,
            });
        }
        waves.push(list);
    }
    return waves;
}

export function generateDungeonFloor(stage: StageConfig): DungeonFloorMap {
    const isBossStage = stage.roomKind === 'mid_boss' || stage.roomKind === 'final_boss';
    const targetRooms = isBossStage ? 8 : Math.min(9, 7 + (stage.globalStage % 3));
    const rooms = new Map<string, FloorRoomData>();

    const makeRoom = (gx: number, gy: number, type: FloorRoomType): FloorRoomData => ({
        key: keyOf(gx, gy),
        gx,
        gy,
        worldX: (gx - 2) * CELL_W,
        worldY: (gy - 2) * CELL_H,
        halfW: 420,
        halfH: 250,
        shapeTag: '标准战房',
        type,
        templateName: '',
        doors: { N: null, S: null, W: null, E: null },
        visited: type === 'start',
        cleared: type === 'start',
        waves: [],
        pillars: [],
        walls: [],
        pits: [],
        crates: [],
        spikes: [],
        mechanics: [],
        chestOpened: false,
        chestWeapon: null,
        altarUsed: false,
        fountainWishesLeft: 3,
        reforgeUsesLeft: 2,
        shopOffers: [],
        portalActive: false,
    });

    const startKey = keyOf(2, 2);
    rooms.set(startKey, makeRoom(2, 2, 'start'));
    const coords: [number, number][] = [[2, 2]];

    const dirs: Dir4[] = ['N', 'S', 'W', 'E'];
    let guard = 0;
    while (coords.length < targetRooms && guard < 120) {
        guard++;
        const baseIdx = coords.length <= 2 ? 0 : Math.floor(Math.random() * coords.length);
        const [bx, by] = coords[baseIdx];
        const d = dirs[Math.floor(Math.random() * dirs.length)];
        const [dx, dy] = DIR_DELTA[d];
        const nx = bx + dx;
        const ny = by + dy;
        if (nx < 0 || nx > 4 || ny < 0 || ny > 4) continue;
        const nk = keyOf(nx, ny);
        if (rooms.has(nk)) continue;

        const nr = makeRoom(nx, ny, 'combat');
        rooms.set(nk, nr);
        coords.push([nx, ny]);

        const bk = keyOf(bx, by);
        rooms.get(bk)!.doors[d] = nk;
        nr.doors[OPPOSITE_DIR[d]] = bk;
    }

    const dist = new Map<string, number>();
    const queue: string[] = [startKey];
    dist.set(startKey, 0);
    while (queue.length > 0) {
        const cur = queue.shift()!;
        const r = rooms.get(cur)!;
        const cd = dist.get(cur)!;
        for (const d of dirs) {
            const nxt = r.doors[d];
            if (nxt && !dist.has(nxt)) {
                dist.set(nxt, cd + 1);
                queue.push(nxt);
            }
        }
    }

    let endKey = startKey;
    let maxD = -1;
    for (const [k, d] of dist.entries()) {
        if (k !== startKey && d > maxD) {
            maxD = d;
            endKey = k;
        }
    }

    const endRoom = rooms.get(endKey)!;
    endRoom.type = isBossStage ? 'boss' : 'portal';

    const candidates = Array.from(rooms.values())
        .filter((r) => r.key !== startKey && r.key !== endKey)
        .sort((a, b) => {
            const degA = dirs.filter((d) => !!a.doors[d]).length;
            const degB = dirs.filter((d) => !!b.doors[d]).length;
            return degA - degB;
        });

    if (candidates[0]) {
        candidates[0].type = 'treasure';
        candidates[0].cleared = true;
        candidates[0].chestWeapon = rollWeaponDrop(stage.globalStage);
    }
    if (candidates[1]) {
        // 每层在神像 / 灵泉许愿池 / 玄铁重铸炉中轮换出现，打破重复感！
        const specialCycle: FloorRoomType[] = ['fountain', 'altar', 'reforge'];
        candidates[1].type = specialCycle[stage.globalStage % specialCycle.length];
        candidates[1].cleared = true;
    }
    if (candidates[2] && rooms.size >= 7) {
        candidates[2].type = 'shop';
        candidates[2].cleared = true;
        const shopWeapon = rollWeaponDrop(stage.globalStage + 4);
        candidates[2].shopOffers = [
            { id: 'heal', label: '灵泉大血瓶 (+3生命)', cost: 20, kind: 'heal', bought: false },
            { id: 'weapon', label: '铁匠锻造武器', cost: 34, kind: 'weapon', weapon: shopWeapon, bought: false },
            { id: 'upgrade', label: '铁匠升阶当前武器', cost: 38, kind: 'upgrade', bought: false },
        ];
    }
    if (candidates[3] && rooms.size >= 8) {
        candidates[3].type = stage.globalStage % 2 === 0 ? 'reforge' : 'fountain';
        candidates[3].cleared = true;
    }

    let idx = 0;
    for (const room of rooms.values()) {
        idx++;
        const layout = createRoomLayout(room.type, stage.globalStage * 11 + idx * 7, stage, room.worldX, room.worldY);
        room.templateName = layout.templateName;
        room.shapeTag = layout.shapeTag;
        room.halfW = layout.halfW;
        room.halfH = layout.halfH;
        room.pillars = layout.pillars;
        room.walls = layout.walls;
        room.pits = layout.pits;
        room.crates = layout.crates;
        room.spikes = layout.spikes;
        room.mechanics = layout.mechanics;
        if (room.type === 'combat' || room.type === 'boss' || room.type === 'portal') {
            room.waves = buildCombatWaves(stage, idx, room.key === endKey);
            room.cleared = false;
        }
    }

    // 走廊两端向房间内部深嵌 48px，与房间可行走区域充分重叠，彻底消除门洞 4px 卡顿！
    const corridors: FloorCorridor[] = [];
    const seenEdge = new Set<string>();
    const OVERLAP = 48;
    for (const room of rooms.values()) {
        for (const d of dirs) {
            const nbKey = room.doors[d];
            if (!nbKey) continue;
            const edgeId = room.key < nbKey ? `${room.key}|${nbKey}` : `${nbKey}|${room.key}`;
            if (seenEdge.has(edgeId)) continue;
            seenEdge.add(edgeId);
            const nb = rooms.get(nbKey)!;
            if (d === 'E' || d === 'W') {
                const leftR = room.worldX < nb.worldX ? room : nb;
                const rightR = room.worldX < nb.worldX ? nb : room;
                const x1 = leftR.worldX + leftR.halfW - OVERLAP;
                const x2 = rightR.worldX - rightR.halfW + OVERLAP;
                corridors.push({
                    fromKey: leftR.key,
                    toKey: rightR.key,
                    x: (x1 + x2) * 0.5,
                    y: leftR.worldY,
                    w: Math.max(60, x2 - x1),
                    h: CORRIDOR_W,
                    horizontal: true,
                });
            } else {
                const botR = room.worldY < nb.worldY ? room : nb;
                const topR = room.worldY < nb.worldY ? nb : room;
                const y1 = botR.worldY + botR.halfH - OVERLAP;
                const y2 = topR.worldY - topR.halfH + OVERLAP;
                corridors.push({
                    fromKey: botR.key,
                    toKey: topR.key,
                    x: botR.worldX,
                    y: (y1 + y2) * 0.5,
                    w: CORRIDOR_W,
                    h: Math.max(60, y2 - y1),
                    horizontal: false,
                });
            }
        }
    }

    return {
        stageNum: stage.globalStage,
        rooms,
        corridors,
        startKey,
        endKey,
    };
}
