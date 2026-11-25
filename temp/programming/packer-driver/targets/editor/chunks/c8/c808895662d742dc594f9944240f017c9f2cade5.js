System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, ImageAsset, Layers, Node, resources, Sprite, SpriteFrame, UITransform, ArtLoader, _crd;

  _export("ArtLoader", void 0);

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      ImageAsset = _cc.ImageAsset;
      Layers = _cc.Layers;
      Node = _cc.Node;
      resources = _cc.resources;
      Sprite = _cc.Sprite;
      SpriteFrame = _cc.SpriteFrame;
      UITransform = _cc.UITransform;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "0e1a2HDMDpH37XixJcIEiJX", "ArtLoader", undefined);
      /**
       * 《异界小农场 2.0》阶段 5：国风手绘精灵贴图异步加载与缓存器（Cocos 3.8.8 全兼容版）
       * - 修复：Cocos 3.8 新导入的 PNG 默认类型为 texture（无 /spriteFrame 子资源），
       *   先尝试 spriteFrame，失败后自动回退加载 ImageAsset 并调用 SpriteFrame.createWithImage()，
       *   无需在编辑器里手动逐张改 PNG 导入类型！
       */


      __checkObsolete__(['ImageAsset', 'Layers', 'Node', 'resources', 'Sprite', 'SpriteFrame', 'UITransform']);

      _export("ArtLoader", ArtLoader = class ArtLoader {
        static loadSpriteFrame(artKey) {
          const cached = this._cache.get(artKey);

          if (cached) return Promise.resolve(cached);
          return new Promise(resolve => {
            resources.load(`art/${artKey}/spriteFrame`, SpriteFrame, (err, sf) => {
              if (!err && sf) {
                this._cache.set(artKey, sf);

                resolve(sf);
                return;
              } // 回退：直接加载原始 ImageAsset 并在运行时封装为 SpriteFrame


              resources.load(`art/${artKey}`, ImageAsset, (err2, img) => {
                if (err2 || !img) {
                  console.warn(`[ArtLoader] Failed to load art/${artKey}:`, err2 != null ? err2 : err);
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


        static applySprite(host, artKey, width, height, onLoaded) {
          void this.loadSpriteFrame(artKey).then(sf => {
            var _spNode$getComponent, _spNode$getComponent2;

            if (!sf || !host.isValid) return;
            let spNode = host.getChildByName('ArtSprite');

            if (!spNode) {
              spNode = new Node('ArtSprite');
              spNode.layer = Layers.Enum.UI_2D;
              spNode.parent = host;
              spNode.setSiblingIndex(0);
            }

            const ut = (_spNode$getComponent = spNode.getComponent(UITransform)) != null ? _spNode$getComponent : spNode.addComponent(UITransform);
            ut.setContentSize(width, height);
            const sp = (_spNode$getComponent2 = spNode.getComponent(Sprite)) != null ? _spNode$getComponent2 : spNode.addComponent(Sprite);
            sp.sizeMode = Sprite.SizeMode.CUSTOM;
            sp.spriteFrame = sf;
            onLoaded == null || onLoaded();
          });
        }

      });

      ArtLoader._cache = new Map();

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=c808895662d742dc594f9944240f017c9f2cade5.js.map