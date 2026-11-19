import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

/**
 * 世界地形数据层（V3 整洁化布局，依据 docs/design/world-redesign/v3-clarity-geometry.md 冻结坐标表；
 * V2 见 world-layout-v2.md，已被校验器判定为视觉超标：出生窗铺装 62%、路网 9 段 zigzag、区域零边界）。
 * - 96×80 tile @32px art（渲染 ×2）；types/heights 两张 Uint8Array。
 * - 基线地图程序化生成（存档 terrain 缺失/版本不符自动发基线，无需全量 JSON）。
 * - 16 变体 auto-tile：bitmask 4 bit（上右下左同类），索引=bitmask 零查表。
 * - V3 视觉纪律：1 宽石板正交路网（4 段）、区域零重叠+树篱边界、沙环 1 格、出生窗≤2 种地表纹理。
 */

export const MAP_W = 96;
export const MAP_H = 80;
export const TILE = 32;            // art px（相机 2× 后屏上 64px）
export const CHUNK = 16;           // 16×16 格 = 512×512 art px
export const CHUNK_W = MAP_W / CHUNK;   // 6
export const CHUNK_H = MAP_H / CHUNK;   // 5

export const TT = { Grass: 0, Dirt: 1, Forest: 2, Water: 3, Sand: 4, StonePath: 5, Bridge: 6, Stairs: 7, Deck: 8 } as const;

/** 玩家编辑产生的人造地形（铲子可还原）。V3 基线不再预铺 Dirt（V2 土路=plot_soil 混用是视觉噪音主源）。 */
export const BUILT_TYPES: readonly number[] = [TT.StonePath, TT.Bridge, TT.Stairs, TT.Deck, TT.Dirt];

/** 区域矩形（v3-clarity-geometry.md §2 冻结坐标，闭区间；六区零重叠，夹缝≥2 格或以河/湖缓冲） */
export const REGIONS = {
    pioneer:  { x0: 2,  y0: 2,  x1: 39, y1: 44 },   // 开荒林地（西）
    fishing:  { x0: 6,  y0: 52, x1: 44, y1: 75 },   // 钓鱼区（南西，含湖）
    living:   { x0: 40, y0: 30, x1: 56, y1: 51 },   // 庭院（河西岸）
    farm:     { x0: 61, y0: 34, x1: 84, y1: 62 },   // 农田（东）
    defense:  { x0: 57, y0: 6,  x1: 90, y1: 28 },   // 封印防守（东北，V2 33×27→34×23）
    advGate:  { x0: 46, y0: 20, x1: 50, y1: 25 },   // 副本门台地
} as const;

/** 湖体水面（圆角：四角格留草）+1 格沙环 */
export const LAKE = { x0: 8, y0: 54, x1: 41, y1: 70 } as const;
export const SAND_RING = 1;   // V2 是 2 格环+独占沙地玩法；V3 收敛为 1 格过渡带

export const SPAWN = { x: 48, y: 40 };   // 出生点=主干路×广场西缘

/** 庭院造桥改造区（逻辑矩形，不铺地表）：锤子可对区内的水格架桥，铲子可还原 */
export const BRIDGE_ZONE = { x0: 39, y0: 38, x1: 42, y1: 42 } as const;

/**
 * 门前塔防布置场（V4 参考图对齐：封印门正下方踩踏土场+ghost 格阵）：
 * 北支路 x48 居中穿过，西场 5×5 / 东场 5×5；防守植物/刺桩的哨戒视觉位。
 */
export const DEF_FIELD = {
    west: { x0: 43, y0: 25, x1: 47, y1: 29 },
    east: { x0: 49, y0: 25, x1: 53, y1: 29 },
} as const;

/**
 * V3 地标单源表（v3-clarity-geometry.md §5；此前 V2 的「LANDMARKS 单源未做」在此补齐）。
 * WorldLiving/CompassHUD/FarmWorldBinder/interactables.json 一律消费本表，坐标改动只动这里。
 */
export const LANDMARKS = {
    bed:        { x: 48, y: 38 },          // 床（睡觉/存档）
    house:      { x0: 44, y0: 35, x1: 47, y1: 37 },   // 小屋 footprint（Graphics 程序画）
    barn:       { x0: 66, y0: 36, x1: 69, y1: 39, poiX: 67, poiY: 39 },   // 谷仓（卖粮入口）
    altar:      { x: 60, y: 26 },          // 封印祭坛
    gate:       { x: 48, y: 23 },          // 副本门（北支路轴线上）
    dock:       { x: 37, y: 53 },          // 码头（钓鱼）
    dockDeck:   [{ x: 36, y: 54 }, { x: 37, y: 54 }] as const,
    gardener:   { x: 45, y: 42 },          // NPC 园艺师
    gatekeeper: { x: 46, y: 23 },          // NPC 守门人（V4 参考图对齐：守在门台西侧，距门 ≤3）
    campfire:   { x: 10, y: 40 },          // 林地营地（西端起点）
    signs:      [{ x: 49, y: 36 }, { x: 60, y: 38 }, { x: 37, y: 51 }] as const,
    well:       { x: 54, y: 44 },          // 水井（装饰）
    flowers:    [{ x: 51, y: 45 }, { x: 50, y: 49 }] as const,
} as const;

/** 农田：3×3 主阵 origin+pitch4 + 宅旁第 10 块（V4 参考图对齐：主阵西移至庭院东门外 y44，距出生 12.75≤18） */
export const FARM_ORIGIN = { x: 58, y: 44, pitch: 4, cols: 3, rows: 3 };
export const FARM_HOME_PLOT = { x0: 44, y0: 46, x1: 46, y1: 48 } as const;   // 宅旁块 3×3（第10块；4×4 会使出生窗铺装超 W3 预算）

/** 树篱边界（TT.Forest 铺在草地上，复用 forest 瓦=零新素材；v3-clarity-geometry.md §4） */
export const HEDGES = {
    livingNorth: { x0: 42, y0: 30, x1: 56, y1: 30, gap: { x: 48, y: 30 } },   // 北墙（缺口=北门）
    livingEast:  { x0: 56, y0: 30, x1: 56, y1: 51, gap: { x: 56, y: 40 } },   // 东墙（缺口=东门）
    livingSouth: { x0: 42, y0: 51, x1: 56, y1: 51, gap: null as const | null },   // 南墙
    defenseRuins: [
        { x0: 74, y0: 10, x1: 78, y1: 13 },
        { x0: 82, y0: 18, x1: 85, y1: 21 },
        { x0: 66, y0: 6,  x1: 72, y1: 6 },
    ] as const,
} as const;

@ccclass('TerrainData')
export class TerrainData extends Component {
    private static _inst: TerrainData | null = null;
    static get inst(): TerrainData | null { return TerrainData._inst; }

    types: Uint8Array = new Uint8Array(MAP_W * MAP_H);
    heights: Uint8Array = new Uint8Array(MAP_W * MAP_H);
    /** 基线快照（generateBaseline 后固化，铲子还原目标） */
    baseline: Uint8Array | null = null;
    /** 基线高度快照（铲子还原高度用，防台阶铲除后 h≥1 幽灵格固化） */
    baselineHeights: Uint8Array | null = null;
    /** 脏格集合（渲染器帧末消费） */
    dirty: Set<number> = new Set();

    onLoad(): void { TerrainData._inst = this; }
    onDestroy(): void { if (TerrainData._inst === this) TerrainData._inst = null; }

    idx(cx: number, cy: number): number { return cy * MAP_W + cx; }
    cx(i: number): number { return i % MAP_W; }
    cy(i: number): number { return (i / MAP_W) | 0; }

    get(cx: number, cy: number): number {
        if (cx < 0 || cy < 0 || cx >= MAP_W || cy >= MAP_H) return TT.Water;
        return this.types[this.idx(cx, cy)];
    }

    setCell(cx: number, cy: number, t: number, h?: number): void {
        if (cx < 0 || cy < 0 || cx >= MAP_W || cy >= MAP_H) return;
        const i = this.idx(cx, cy);
        this.types[i] = t;
        if (h !== undefined) this.heights[i] = h;
        this.dirty.add(i);
        // 邻格变体受影响，一并标脏（bitmask 是邻接函数）
        const n = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        for (const [dx, dy] of n) {
            const nx = cx + dx, ny = cy + dy;
            if (nx >= 0 && ny >= 0 && nx < MAP_W && ny < MAP_H) this.dirty.add(this.idx(nx, ny));
        }
    }

    /** 程序化基线地图（v3-clarity-geometry.md §2-§6 冻结几何；tools/validate-layout-v3.py ALL PASS）。 */
    generateBaseline(): void {
        const t = this.types;
        t.fill(TT.Grass);

        const rect = (r: { x0: number; y0: number; x1: number; y1: number }, type: number) => {
            for (let y = r.y0; y <= r.y1; y++)
                for (let x = r.x0; x <= r.x1; x++) t[this.idx(x, y)] = type;
        };

        // 六区（后写覆盖先写；开荒区=林地，其余草地）
        rect(REGIONS.pioneer, TT.Forest);
        rect(REGIONS.fishing, TT.Grass);      // 湖体稍后画
        rect(REGIONS.advGate, TT.Grass);
        rect(REGIONS.defense, TT.Grass);
        rect(REGIONS.farm, TT.Grass);
        rect(REGIONS.living, TT.Grass);

        // 开荒区东缘草地过渡带（x36-39）：出生窗视觉承诺「草地为基底」，深林止于 x35
        rect({ x0: 36, y0: 2, x1: 39, y1: 44 }, TT.Grass);

        // 河（单段常宽 2 格 x40-41，纵贯 y2-53 入湖）：世界脊线+庭院造桥段
        rect({ x0: 40, y0: 2, x1: 41, y1: 53 }, TT.Water);

        // 湖（圆角：四角格留草不铺水）+1 格沙环
        for (let y = LAKE.y0; y <= LAKE.y1; y++)
            for (let x = LAKE.x0; x <= LAKE.x1; x++) {
                const corner = (x === LAKE.x0 || x === LAKE.x1) && (y === LAKE.y0 || y === LAKE.y1);
                if (!corner) t[this.idx(x, y)] = TT.Water;
            }
        for (let y = LAKE.y0 - SAND_RING; y <= LAKE.y1 + SAND_RING; y++)
            for (let x = LAKE.x0 - SAND_RING; x <= LAKE.x1 + SAND_RING; x++) {
                if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
                if (t[this.idx(x, y)] === TT.Water) continue;
                t[this.idx(x, y)] = TT.Sand;
            }

        // 石板路网（4 段 1 宽全正交；后画覆盖河交叠=预置桥）。V2 的 9 段 2 宽土路已废。
        const pathH = (x0: number, x1: number, y: number) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) t[this.idx(x, y)] = TT.StonePath; };
        const pathV = (x: number, y0: number, y1: number) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) t[this.idx(x, y)] = TT.StonePath; };
        pathH(10, 84, 40);            // trunkH：营地→广场→农场（跨河段即主干桥）
        pathV(48, 25, 36);            // northV：广场→副本门
        pathV(36, 41, 52);            // dockV：西段→码头
        pathV(60, 27, 39);            // defV：主干→封印台

        // 石板台（4 块：枢纽/门/封印/码头；后画覆盖路交叠）
        rect({ x0: 44, y0: 37, x1: 52, y1: 43 }, TT.StonePath);   // 枢纽广场
        rect({ x0: 47, y0: 22, x1: 49, y1: 24 }, TT.StonePath);   // 副本门台
        rect({ x0: 59, y0: 25, x1: 61, y1: 27 }, TT.StonePath);   // 封印祭坛台
        rect({ x0: 35, y0: 52, x1: 38, y1: 53 }, TT.StonePath);   // 码头台

        // 门前塔防布置场（V4 观感对齐）：门台正下方两侧踩踏土，北支路 x48 居中留通道
        rect(DEF_FIELD.west, TT.Dirt);
        rect(DEF_FIELD.east, TT.Dirt);

        // 码头木平台（钓鱼：站在平台上=3 格内必有水面）
        for (const d of LANDMARKS.dockDeck) t[this.idx(d.x, d.y)] = TT.Deck;

        // 农田犁沟 slab：主阵 3×3 外扩 1 圈 + 宅旁第 10 块（v3-clarity-geometry §5）
        rect({
            x0: FARM_ORIGIN.x, y0: FARM_ORIGIN.y,
            x1: FARM_ORIGIN.x + FARM_ORIGIN.pitch * (FARM_ORIGIN.cols - 1) + 3,
            y1: FARM_ORIGIN.y + FARM_ORIGIN.pitch * (FARM_ORIGIN.rows - 1) + 3,
        }, TT.Dirt);
        rect(FARM_HOME_PLOT, TT.Dirt);

        // 树篱边界（TT.Forest 复用林地瓦；缺口=门，不封死路径）
        const hedge = (x: number, y: number) => { t[this.idx(x, y)] = TT.Forest; };
        for (let x: number = HEDGES.livingNorth.x0; x <= HEDGES.livingNorth.x1; x++) if (x !== HEDGES.livingNorth.gap.x) hedge(x, HEDGES.livingNorth.y0);
        for (let y: number = HEDGES.livingEast.y0; y <= HEDGES.livingEast.y1; y++) if (y !== HEDGES.livingEast.gap.y) hedge(HEDGES.livingEast.x0, y);
        for (let x: number = HEDGES.livingSouth.x0; x <= HEDGES.livingSouth.x1; x++) hedge(x, HEDGES.livingSouth.y0);
        for (const r of HEDGES.defenseRuins) rect(r, TT.Forest);

        // 高度基线：边界环抬 1（远山剪影感），防守区东缘抬 2（封印之门台阶叙事）
        for (let x = 0; x < MAP_W; x++) { this.heights[this.idx(x, 0)] = 1; this.heights[this.idx(x, MAP_H - 1)] = 1; }
        for (let y = 0; y < MAP_H; y++) { this.heights[this.idx(0, y)] = 1; this.heights[this.idx(MAP_W - 1, y)] = 1; }
        for (let y = 16; y <= 28; y++) for (let x = 86; x <= 90; x++) this.heights[this.idx(x, y)] = 2;

        this.dirty.clear();
        for (let i = 0; i < t.length; i++) this.dirty.add(i);
        this.baseline = new Uint8Array(t);                     // 铲子还原目标快照（类型）
        this.baselineHeights = new Uint8Array(this.heights);   // 高度一并快照（R-A 幽灵高度修复）
    }

    /** 16 变体 bitmask：上1 右2 下4 左8（同类邻接）。水/沙按自身类型计算。 */
    bitmask(i: number): number {
        const t = this.types[i];
        const cx = this.cx(i), cy = this.cy(i);
        let m = 0;
        if (this.get(cx, cy - 1) === t) m |= 1;
        if (this.get(cx + 1, cy) === t) m |= 2;
        if (this.get(cx, cy + 1) === t) m |= 4;
        if (this.get(cx - 1, cy) === t) m |= 8;
        return m;
    }

    /** 计时基元：同步遍历全图（供 bench）。 */
    touchAll(): number {
        let s = 0;
        for (let i = 0; i < this.types.length; i++) s += this.types[i];
        return s;
    }

    /** 是否在可编辑庭院区（工具坞/编辑操作生效范围，terrain-system §2.2） */
    inLiving(cx: number, cy: number): boolean {
        const r = REGIONS.living;
        return cx >= r.x0 && cx <= r.x1 && cy >= r.y0 && cy <= r.y1;
    }

    /** 是否在造桥改造区（锤子目标水格必须在 BRIDGE_ZONE 内；V3 桥基线从「dirt 铺装」改为逻辑矩形） */
    inBridgeZone(cx: number, cy: number): boolean {
        const r = BRIDGE_ZONE;
        return cx >= r.x0 && cx <= r.x1 && cy >= r.y0 && cy <= r.y1;
    }

    /**
     * RLE 序列化（terrain-system §7.2）：[u16 run][u8 ((type<<4)|height)] 小端序 → base64。
     * 全量存不做增量（MVP 稳态 <5KB，远低于存档红线）。
     */
    static encodeRLE(d: TerrainData): string {
        const words: number[] = [];
        const n = d.types.length;
        let i = 0;
        while (i < n) {
            const v = (d.types[i] << 4) | d.heights[i];
            let run = 1;
            while (i + run < n && run < 0xffff && ((d.types[i + run] << 4) | d.heights[i + run]) === v) run++;
            words.push(run & 0xff, (run >> 8) & 0xff, v);
            i += run;
        }
        let bin = '';
        for (const w of words) bin += String.fromCharCode(w);
        return btoa(bin);
    }

    static decodeRLE(d: TerrainData, b64: string): boolean {
        try {
            const bin = atob(b64);
            let p = 0, i = 0;
            const n = d.types.length;
            while (p + 3 <= bin.length && i < n) {
                const run = bin.charCodeAt(p) | (bin.charCodeAt(p + 1) << 8);
                const v = bin.charCodeAt(p + 2);
                p += 3;
                const t = (v >> 4) & 0x0f, h = v & 0x0f;
                if (t > TT.Deck || h > 3) return false;   // 值域护栏（R-B）：错位字节立即判废
                for (let k = 0; k < run && i < n; k++, i++) { d.types[i] = t; d.heights[i] = h; }
            }
            if (i !== n || p !== bin.length) return false;   // 长度护栏：格数与字节必须双双耗尽
            d.dirty.clear();
            for (let k = 0; k < n; k++) d.dirty.add(k);
            return true;
        } catch { return false; }
    }
}
