/**
 * 《异界小农场 2.0》阶段 5：国风手绘精灵贴图异步加载与缓存器（Cocos 3.8.8 全兼容版）
 * - 修复：Cocos 3.8 新导入的 PNG 默认类型为 texture（无 /spriteFrame 子资源），
 *   先尝试 spriteFrame，失败后自动回退加载 ImageAsset 并调用 SpriteFrame.createWithImage()，
 *   无需在编辑器里手动逐张改 PNG 导入类型！
 */

import { ImageAsset, Layers, Node, resources, Sprite, SpriteFrame, UITransform } from 'cc';

export class ArtLoader {
    private static _cache = new Map<string, SpriteFrame>();

    public static loadSpriteFrame(artKey: string): Promise<SpriteFrame | null> {
        const cached = this._cache.get(artKey);
        if (cached) return Promise.resolve(cached);

        return new Promise((resolve) => {
            resources.load(`art/${artKey}/spriteFrame`, SpriteFrame, (err, sf) => {
                if (!err && sf) {
                    this._cache.set(artKey, sf);
                    resolve(sf);
                    return;
                }
                // 回退：直接加载原始 ImageAsset 并在运行时封装为 SpriteFrame
                resources.load(`art/${artKey}`, ImageAsset, (err2, img) => {
                    if (err2 || !img) {
                        console.warn(`[ArtLoader] Failed to load art/${artKey}:`, err2 ?? err);
                        resolve(null);
                        return;
                    }
                    const created = SpriteFrame.createWithImage(img);
                    this._cache.set(artKey, created);
                    resolve(created);
                });
            });
        });
    }

    /** 为目标节点挂上手绘 Sprite 子节点；成功后回调通知隐藏占位 Graphics */
    public static applySprite(
        host: Node,
        artKey: string,
        width: number,
        height: number,
        onLoaded?: () => void
    ): void {
        void this.loadSpriteFrame(artKey).then((sf) => {
            if (!sf || !host.isValid) return;
            let spNode = host.getChildByName('ArtSprite');
            if (!spNode) {
                spNode = new Node('ArtSprite');
                spNode.layer = Layers.Enum.UI_2D;
                spNode.parent = host;
                spNode.setSiblingIndex(0);
            }
            const ut = spNode.getComponent(UITransform) ?? spNode.addComponent(UITransform);
            ut.setContentSize(width, height);
            const sp = spNode.getComponent(Sprite) ?? spNode.addComponent(Sprite);
            sp.sizeMode = Sprite.SizeMode.CUSTOM;
            sp.spriteFrame = sf;
            onLoaded?.();
        });
    }
}
