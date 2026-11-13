import { assetManager, SpriteFrame, Bundle } from 'cc';

/**
 * SpriteLib —— texture Bundle 的 SpriteFrame 运行时加载器（阶段 2.5）。
 * 像素锐利采样配置在各 png.meta 导入层（minfilter/magfilter=nearest、trimType=false 关裁剪）。
 * ⚠️ 不要在这里 import TextureFilter 等枚举值：预览构建下枚举值导入为 undefined，
 *    TextureFilter.NEAREST 会抛 "Cannot read properties of undefined (reading 'NEAREST')"（已踩坑）。
 * init 失败（素材未生成/Bundle 不存在）时调用方应回退到 Graphics 占位渲染。
 *
 * 路径约定：Bundle 'texture' 挂在 assets/textures/，条目形如 'tiles/plot_soil/spriteFrame'。
 */
const NEED = [
    'tiles/plot_soil',
    'tiles/plot_soil_wet',
    'crops/carrot_0',
    'crops/carrot_1',
    'crops/carrot_2',
    'ui/icon_gold',
    'ui/icon_seed',
    'ui/icon_carrot',
];

export class SpriteLib {
    private static _inst: SpriteLib | null = null;
    static get inst(): SpriteLib {
        if (!this._inst) this._inst = new SpriteLib();
        return this._inst;
    }

    private _frames = new Map<string, SpriteFrame>();
    ready = false;

    async init(): Promise<void> {
        if (this.ready) return;
        const bundle = await new Promise<Bundle | null>((res) =>
            assetManager.loadBundle('texture', (err, b) => res(err ? null : b)));
        if (!bundle) {
            console.warn('[SpriteLib] texture Bundle 不存在，使用 Graphics 占位');
            return;
        }
        for (const path of NEED) {
            const frame = await new Promise<SpriteFrame | null>((res) =>
                bundle.load(`${path}/spriteFrame`, SpriteFrame, (err, s) => res(err ? null : s as SpriteFrame)));
            if (frame) {
                this._frames.set(path, frame);
            } else {
                console.warn(`[SpriteLib] 缺素材: ${path}`);
            }
        }
        this.ready = this._frames.size > 0;
        if (this.ready) console.log(`[SpriteLib] 已加载 ${this._frames.size}/${NEED.length} 张像素素材`);
    }

    /** 取 SpriteFrame；未就绪或缺素材返回 null（调用方回退占位） */
    get(path: string): SpriteFrame | null {
        return this._frames.get(path) ?? null;
    }
}
