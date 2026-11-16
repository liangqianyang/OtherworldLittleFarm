import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

/**
 * 世界地形数据层（T0 spike，依据 terrain-system.md §2/§3 与 world-design.md §2 冻结坐标表）。
 * - 128×96 tile @32px art（渲染 ×2）；types/heights 两张 Uint8Array。
 * - 基线地图程序化生成（老档迁移自动发基线地图，无需全量 JSON）。
 * - 16 变体 auto-tile：bitmask 4 bit（上右下左同类），索引=bitmask 零查表。
 */

export const MAP_W = 128;
export const MAP_H = 96;
export const TILE = 32;            // art px（相机 2× 后屏上 64px）
export const CHUNK = 16;           // 16×16 格 = 512×512 art px
export const CHUNK_W = MAP_W / CHUNK;   // 8
export const CHUNK_H = MAP_H / CHUNK;   // 6

export const TT = { Grass: 0, Dirt: 1, Forest: 2, Water: 3, Sand: 4, StonePath: 5, Bridge: 6, Stairs: 7, Deck: 8 } as const;

/** 玩家编辑产生的人造地形（铲子可还原） */
export const BUILT_TYPES: readonly number[] = [TT.StonePath, TT.Bridge, TT.Stairs, TT.Deck];

/** 区域矩形（world-design.md §2.1 冻结坐标） */
export const REGIONS = {
    farm:     { x0: 40, y0: 42, x1: 87,  y1: 73 },
    living:   { x0: 60, y0: 2,  x1: 99,  y1: 35 },
    pioneer:  { x0: 2,  y0: 2,  x1: 57,  y1: 45 },
    fishing:  { x0: 30, y0: 78, x1: 87,  y1: 93 },
    defense:  { x0: 96, y0: 34, x1: 125, y1: 69 },
    advGate:  { x0: 102, y0: 2, x1: 125, y1: 27 },
} as const;

export const SPAWN = { x: 74, y: 26 };   // 出生点=家门口

@ccclass('TerrainData')
export class TerrainData extends Component {
    private static _inst: TerrainData | null = null;
    static get inst(): TerrainData | null { return TerrainData._inst; }

    types: Uint8Array = new Uint8Array(MAP_W * MAP_H);
    heights: Uint8Array = new Uint8Array(MAP_W * MAP_H);
    /** 基线快照（generateBaseline 后固化，铲子还原目标） */
    baseline: Uint8Array | null = null;
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

    /** 程序化基线地图（world-design §2.1/§2.4）。 */
    generateBaseline(): void {        const t = this.types;
        t.fill(TT.Grass);

        const rect = (r: { x0: number; y0: number; x1: number; y1: number }, type: number) => {
            for (let y = r.y0; y <= r.y1; y++)
                for (let x = r.x0; x <= r.x1; x++) t[this.idx(x, y)] = type;
        };

        // 六区（后写覆盖先写）
        rect(REGIONS.pioneer, TT.Forest);
        rect(REGIONS.fishing, TT.Grass);      // 湖体稍后画
        rect(REGIONS.advGate, TT.Grass);
        rect(REGIONS.defense, TT.Grass);
        rect(REGIONS.farm, TT.Grass);
        rect(REGIONS.living, TT.Grass);

        // 主干路（2 tile 宽土路，world-design §2.4 路树）
        const roadH = (x0: number, x1: number, y: number) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) { t[this.idx(x, y)] = TT.Dirt; t[this.idx(x, y + 1)] = TT.Dirt; } };
        const roadV = (x: number, y0: number, y1: number) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) { t[this.idx(x, y)] = TT.Dirt; t[this.idx(x + 1, y)] = TT.Dirt; } };
        roadV(74, 26, 42);            // 家门→农场北门（居住→农场主干）
        roadV(74, 42, 73);            // 农场内部纵路→南门
        roadH(44, 74, 55);            // 西门路（开荒→农场）
        roadH(87, 96, 55);            // 农场东门→封印防守区
        roadV(87, 34, 55);            // 防守区内部支路
        roadH(58, 74, 73);            // 南门→湖边
        roadV(58, 73, 79);            // →栈桥码头

        // 河流（世界脊线）：北界(64,0)→纵穿居住段→谷地→东南拐→入湖
        const riverSeg = (x0: number, x1: number, y0: number, y1: number) => {
            for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
                for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) t[this.idx(x, y)] = TT.Water;
        };
        riverSeg(62, 66, 0, 35);      // 居住区可改造段（默认河道 5 宽）
        riverSeg(63, 67, 35, 50);     // 谷地
        riverSeg(66, 72, 50, 62);
        riverSeg(70, 76, 62, 76);
        riverSeg(72, 78, 76, 78);

        // 湖（钓鱼区水体）+ 滩涂环
        rect(REGIONS.fishing, TT.Water);
        for (let y = REGIONS.fishing.y0; y <= REGIONS.fishing.y1; y++)
            for (let x = REGIONS.fishing.x0; x <= REGIONS.fishing.x1; x++) {
                const edge = x <= REGIONS.fishing.x0 + 1 || x >= REGIONS.fishing.x1 - 1 || y <= REGIONS.fishing.y0 + 1 || y >= REGIONS.fishing.y1 - 1;
                if (edge) t[this.idx(x, y)] = TT.Sand;
            }

        // 桥（路与河交点恢复通行，world-design：2 桥）
        const bridge = (cx: number, cy: number) => { for (let y = cy - 1; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 3; x++) { const i = this.idx(x, y); if (t[i] === TT.Water) t[i] = TT.Dirt; } };
        bridge(63, 55);               // 木桥 B（西门路 × 河）
        bridge(74, 26);               // 家门前小桥（出生点路 × 河）——保证出生点可达农场

        // 高度基线：边界环抬 1（远山剪影感），防守区东缘抬 2（封印之门台阶叙事）
        for (let x = 0; x < MAP_W; x++) { this.heights[this.idx(x, 0)] = 1; this.heights[this.idx(x, MAP_H - 1)] = 1; }
        for (let y = 0; y < MAP_H; y++) { this.heights[this.idx(0, y)] = 1; this.heights[this.idx(MAP_W - 1, y)] = 1; }
        for (let y = 40; y <= 44; y++) for (let x = 120; x <= 125; x++) this.heights[this.idx(x, y)] = 2;

        this.dirty.clear();
        for (let i = 0; i < t.length; i++) this.dirty.add(i);
        this.baseline = new Uint8Array(t);   // 铲子还原目标快照
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
            while (p + 2 < bin.length + 1 && i < n) {
                const run = bin.charCodeAt(p) | (bin.charCodeAt(p + 1) << 8);
                const v = bin.charCodeAt(p + 2);
                p += 3;
                const t = (v >> 4) & 0x0f, h = v & 0x0f;
                for (let k = 0; k < run && i < n; k++, i++) { d.types[i] = t; d.heights[i] = h; }
            }
            d.dirty.clear();
            for (let k = 0; k < n; k++) d.dirty.add(k);
            return i >= n;
        } catch { return false; }
    }
}
