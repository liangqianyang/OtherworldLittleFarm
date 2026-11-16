import { assetManager, SpriteFrame, Bundle } from 'cc';
import { EventBus } from './EventBus';

/**
 * SpriteLib —— texture Bundle 的 SpriteFrame 运行时加载器（阶段 2.5，M7 分组懒加载）。
 * 像素锐利采样配置在各 png.meta 导入层（minfilter/magfilter=nearest、trimType=false 关裁剪）。
 * ⚠️ 不要在这里 import TextureFilter 等枚举值：预览构建下枚举值导入为 undefined，
 *    TextureFilter.NEAREST 会抛 "Cannot read properties of undefined (reading 'NEAREST')"（已踩坑）。
 * init 失败（素材未生成/Bundle 不存在）时调用方应回退到 Graphics 占位渲染。
 *
 * M7 性能（2026-11-16）：
 * - 46 张串行 await 改为并行 Promise.all（真机首屏主要瓶颈）；
 * - 两阶段：CORE（农场/世界/战斗必需）加载完即 ready + 广播 sprites_ready；
 *   DECOR（小屋家具，只有 DecorPanel 用）后台续载，完成后再广播一次（各视图重绘幂等）。
 *
 * 路径约定：Bundle 'texture' 挂在 assets/textures/，条目形如 'tiles/plot_soil/spriteFrame'。
 */
const CORE = [
    // 地块三件套
    'tiles/plot_soil',
    'tiles/ground_grass',
    'tiles/plot_soil_wet',
    'tiles/ground_forest',
    // 作物三阶段
    'crops/carrot_0', 'crops/carrot_1', 'crops/carrot_2',
    'crops/tomato_0', 'crops/tomato_1', 'crops/tomato_2',
    'crops/pumpkin_0', 'crops/pumpkin_1', 'crops/pumpkin_2',
    'crops/moonflower_0', 'crops/moonflower_1', 'crops/moonflower_2',
    // 怪物 + NPC
    'monsters/slime', 'monsters/slime_elite', 'monsters/sporeling',
    'npc/npc_gardener', 'npc/npc_gatekeeper',
    // 探险物件（副本/防守 Overlay 用）
    'adventure/bush_berry', 'adventure/herb_patch', 'adventure/wood_log', 'adventure/barn',
    // 图标全套（背包/图鉴/HUD）
    'ui/icon_gold', 'ui/icon_seed', 'ui/icon_carrot',
    'ui/icon_berry', 'ui/icon_herb', 'ui/icon_wood', 'ui/icon_gel',
    'ui/icon_tomato', 'ui/icon_pumpkin', 'ui/icon_moonflower',
    'ui/icon_crucian', 'ui/icon_perch', 'ui/icon_moonfish',
];
const DECOR = [
    'decor/bed', 'decor/table', 'decor/chair', 'decor/cabinet',
    'decor/rug', 'decor/fireplace', 'decor/plant_pot', 'decor/window_f',
];

export class SpriteLib {
    private static _inst: SpriteLib | null = null;
    static get inst(): SpriteLib {
        if (!this._inst) this._inst = new SpriteLib();
        return this._inst;
    }

    private _frames = new Map<string, SpriteFrame>();
    private _bundle: Bundle | null = null;
    ready = false;

    async init(): Promise<void> {
        if (this.ready) return;
        const bundle = await new Promise<Bundle | null>((res) =>
            assetManager.loadBundle('texture', (err, b) => res(err ? null : b)));
        if (!bundle) {
            console.warn('[SpriteLib] texture Bundle 不存在，使用 Graphics 占位');
            return;
        }
        this._bundle = bundle;

        // 阶段一：核心素材并行加载（农场/世界/战斗必需）
        await this._loadGroup(CORE);
        this.ready = this._frames.size > 0;
        if (this.ready) {
            console.log(`[SpriteLib] 核心素材 ${this._frames.size}/${CORE.length} 就绪`);
            EventBus.inst.emit('farmChanged', { action: 'sprites_ready' });
        }

        // 阶段二：decor 后台续载（不阻塞首屏；完成后再广播，视图重绘幂等）
        this._loadGroup(DECOR).then((n) => {
            console.log(`[SpriteLib] decor 组 ${n}/${DECOR.length} 就绪`);
            EventBus.inst.emit('farmChanged', { action: 'sprites_ready' });
        });
    }

    private async _loadGroup(paths: string[]): Promise<number> {
        if (!this._bundle) return 0;
        const results = await Promise.all(paths.map((path) => new Promise<[string, SpriteFrame | null]>((res) =>
            this._bundle!.load(`${path}/spriteFrame`, SpriteFrame, (err, s) => {
                if (err) console.warn(`[SpriteLib] 缺素材: ${path}`);
                res([path, err ? null : s as SpriteFrame]);
            }))));
        let n = 0;
        for (const [path, frame] of results) {
            if (frame) { this._frames.set(path, frame); n++; }
        }
        return n;
    }

    /** 取 SpriteFrame；未就绪或缺素材返回 null（调用方回退占位） */
    get(path: string): SpriteFrame | null {
        return this._frames.get(path) ?? null;
    }
}
