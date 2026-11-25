System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3", "__unresolved_4", "__unresolved_5"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Color, Component, Graphics, Label, Layers, Node, UITransform, DataManager, GameApp, FURNITURE_CATALOG, ArtLoader, AudioManager, _dec, _class, _class2, _crd, ccclass, NpcDialogOverlay;

  function _reportPossibleCrUseOfDataManager(extras) {
    _reporterNs.report("DataManager", "../core/DataManager", _context.meta, extras);
  }

  function _reportPossibleCrUseOfGameApp(extras) {
    _reporterNs.report("GameApp", "../app/GameApp", _context.meta, extras);
  }

  function _reportPossibleCrUseOfFURNITURE_CATALOG(extras) {
    _reporterNs.report("FURNITURE_CATALOG", "./IndoorOverlay", _context.meta, extras);
  }

  function _reportPossibleCrUseOfArtLoader(extras) {
    _reporterNs.report("ArtLoader", "../core/ArtLoader", _context.meta, extras);
  }

  function _reportPossibleCrUseOfAudioManager(extras) {
    _reporterNs.report("AudioManager", "../core/AudioManager", _context.meta, extras);
  }

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      _decorator = _cc._decorator;
      Color = _cc.Color;
      Component = _cc.Component;
      Graphics = _cc.Graphics;
      Label = _cc.Label;
      Layers = _cc.Layers;
      Node = _cc.Node;
      UITransform = _cc.UITransform;
    }, function (_unresolved_2) {
      DataManager = _unresolved_2.DataManager;
    }, function (_unresolved_3) {
      GameApp = _unresolved_3.GameApp;
    }, function (_unresolved_4) {
      FURNITURE_CATALOG = _unresolved_4.FURNITURE_CATALOG;
    }, function (_unresolved_5) {
      ArtLoader = _unresolved_5.ArtLoader;
    }, function (_unresolved_6) {
      AudioManager = _unresolved_6.AudioManager;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "8f37bFALmFLmpTWPH5Tqecy", "NpcDialogOverlay", undefined);
      /**
       * 《异界小农场 2.0》V1.2：国风手绘商铺货架与 NPC 对话浮层（告别平铺纯色文字按钮）
       * - 顶部：NPC 手绘立绘头像 + 卷轴对白 + 实时金币显示。
       * - 陆伯商铺：分「灵植种子」「农具与灵宠」双页签，以手绘商品卡片货架展示（带真实手绘缩略图、效果与价格）。
       * - 阿棠商铺：以 2×2 手绘家具卡片货架展示国风摆件（购买后自动进入雅居「装扮背包」）。
       */


      __checkObsolete__(['_decorator', 'Color', 'Component', 'Graphics', 'Label', 'Layers', 'Node', 'UITransform']);

      ({
        ccclass
      } = _decorator);

      _export("NpcDialogOverlay", NpcDialogOverlay = (_dec = ccclass('NpcDialogOverlay'), _dec(_class = (_class2 = class NpcDialogOverlay extends Component {
        constructor(...args) {
          super(...args);
          this._panel = void 0;
          this._portraitHolder = void 0;
          this._nameLbl = void 0;
          this._goldLbl = void 0;
          this._dialogLbl = void 0;
          this._tabBar = void 0;
          this._shelfGrid = void 0;
          this._open = false;
          this._currentNpc = 'lubo';
          this._luboTab = 'seeds';
          this._onToast = null;
        }

        static get inst() {
          return this._inst;
        }

        get isOpen() {
          return this._open;
        }

        onLoad() {
          NpcDialogOverlay._inst = this;

          this._buildUI();

          this._panel.active = false;
        }

        onDestroy() {
          if (NpcDialogOverlay._inst === this) NpcDialogOverlay._inst = null;
        }

        _uiNode(name, parent) {
          const n = new Node(name);
          n.layer = Layers.Enum.UI_2D;
          n.parent = parent;
          return n;
        }

        _buildUI() {
          this._panel = this._uiNode('NpcPanel', this.node);

          this._panel.addComponent(UITransform).setContentSize(1280, 720);

          const mask = this._panel.addComponent(Graphics);

          mask.fillColor = new Color(18, 28, 26, 165);
          mask.rect(-640, -360, 1280, 720);
          mask.fill();

          const card = this._uiNode('ScrollDialog', this._panel);

          card.addComponent(UITransform).setContentSize(820, 520);
          const g = card.addComponent(Graphics);
          g.fillColor = new Color(248, 240, 222, 255);
          g.strokeColor = new Color(132, 92, 58, 255);
          g.lineWidth = 4;
          g.roundRect(-410, -260, 820, 520, 18);
          g.fill();
          g.stroke(); // 顶部 NPC 头像与对白区底衬

          g.fillColor = new Color(236, 224, 198, 255);
          g.roundRect(-382, 108, 764, 126, 12);
          g.fill(); // 头像圆框

          g.fillColor = new Color(250, 245, 232, 255);
          g.strokeColor = new Color(156, 114, 74, 240);
          g.lineWidth = 2.5;
          g.circle(-316, 171, 48);
          g.fill();
          g.stroke();
          this._portraitHolder = this._uiNode('Portrait', card);

          this._portraitHolder.setPosition(-316, 168, 0);

          const nNode = this._uiNode('NpcName', card);

          nNode.setPosition(-150, 206, 0);
          this._nameLbl = nNode.addComponent(Label);
          this._nameLbl.fontSize = 22;
          this._nameLbl.color = new Color(148, 46, 28, 255);

          const gNode = this._uiNode('GoldLbl', card);

          gNode.setPosition(286, 206, 0);
          this._goldLbl = gNode.addComponent(Label);
          this._goldLbl.fontSize = 16;
          this._goldLbl.color = new Color(146, 92, 34, 255);

          const dNode = this._uiNode('Dialog', card);

          dNode.setPosition(56, 152, 0);
          dNode.addComponent(UITransform).setContentSize(590, 74);
          this._dialogLbl = dNode.addComponent(Label);
          this._dialogLbl.fontSize = 15;
          this._dialogLbl.lineHeight = 22;
          this._dialogLbl.overflow = Label.Overflow.SHRINK;
          this._dialogLbl.color = new Color(46, 54, 48, 255); // 页签栏

          this._tabBar = this._uiNode('TabBar', card);

          this._tabBar.setPosition(-215, 72, 0); // 商品手绘货架网格


          this._shelfGrid = this._uiNode('ShelfGrid', card);

          this._shelfGrid.setPosition(0, -68, 0);

          const closeBtn = this._makeBtn('告辞离开', 132, 40, new Color(128, 102, 78, 245), () => this.close());

          closeBtn.parent = card;
          closeBtn.setPosition(0, -222, 0);
        }

        _makeBtn(text, w, h, color, onTap) {
          const n = new Node(`Btn_${text.slice(0, 6)}`);
          n.layer = Layers.Enum.UI_2D;
          n.addComponent(UITransform).setContentSize(w, h);
          const g = n.addComponent(Graphics);
          g.fillColor = color;
          g.roundRect(-w / 2, -h / 2, w, h, 9);
          g.fill();

          const l = this._uiNode('Lbl', n).addComponent(Label);

          l.string = text;
          l.fontSize = 14;
          l.lineHeight = 18;
          l.color = Color.WHITE;
          n.on(Node.EventType.TOUCH_END, onTap);
          return n;
        }

        open(npcId, onToast) {
          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return;
          this._currentNpc = npcId;
          this._onToast = onToast != null ? onToast : null;
          this._open = true;
          this._panel.active = true;

          this._panel.setSiblingIndex(this.node.children.length - 1);

          this._renderContent();
        }

        close() {
          this._open = false;
          this._panel.active = false;
        }

        _renderContent() {
          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return;

          this._tabBar.removeAllChildren();

          this._shelfGrid.removeAllChildren();

          this._portraitHolder.removeAllChildren();

          this._goldLbl.string = `金币 ${app.saveData.gold}`;
          const npcArtMap = {
            lubo: 'npc_lubo',
            jianglao: 'npc_jianglao',
            xuanmo: 'npc_xuanmo',
            atang: 'npc_atang'
          };
          (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
            error: Error()
          }), ArtLoader) : ArtLoader).applySprite(this._portraitHolder, npcArtMap[this._currentNpc], 46, 92);
          const d = app.time.getDate();

          if (this._currentNpc === 'lubo') {
            this._nameLbl.string = '老花匠 · 陆伯';
            this._dialogLbl.string = `「眼下正是${d.solarTerm.name}，顺应节气下种才能事半功倍。需要种子、范围农具还是灵宠，挑好放进货篮就行！」`;

            const t1 = this._makeBtn('灵植种子', 118, 34, this._luboTab === 'seeds' ? new Color(36, 126, 116, 250) : new Color(152, 132, 108, 220), () => {
              this._luboTab = 'seeds';

              this._renderContent();
            });

            t1.parent = this._tabBar;
            t1.setPosition(-68, 0, 0);

            const t2 = this._makeBtn('农具与灵宠', 126, 34, this._luboTab === 'upgrades' ? new Color(36, 126, 116, 250) : new Color(152, 132, 108, 220), () => {
              this._luboTab = 'upgrades';

              this._renderContent();
            });

            t2.parent = this._tabBar;
            t2.setPosition(66, 0, 0);

            if (this._luboTab === 'seeds') {
              const seedMeta = [{
                id: 'spring_greens',
                art: 'crop_spring_greens',
                w: 68,
                h: 62
              }, {
                id: 'thunder_potato',
                art: 'plant_thunder_potato',
                w: 68,
                h: 64
              }, {
                id: 'cloud_bamboo_shoot',
                art: 'def_cloud_shoot',
                w: 46,
                h: 72
              }, {
                id: 'sky_bamboo',
                art: 'def_sky_bamboo',
                w: 58,
                h: 70
              }];
              const items = [];

              for (const m of seedMeta) {
                const def = (_crd && DataManager === void 0 ? (_reportPossibleCrUseOfDataManager({
                  error: Error()
                }), DataManager) : DataManager).inst.getPlant(m.id);
                if (!def) continue;
                items.push({
                  artKey: m.art,
                  artW: m.w,
                  artH: m.h,
                  title: `${def.name}种子`,
                  sub: def.category === 'daily' ? '日常灵蔬 · 2天熟' : '农战两用 · 进本守家',
                  priceText: `${def.seedCost} 金币`,
                  onBuy: () => {
                    var _this$_onToast2;

                    if (app.saveData.gold < def.seedCost) {
                      var _this$_onToast;

                      (_this$_onToast = this._onToast) == null || _this$_onToast.call(this, '金币不够啦，先去出货箱卖些菜吧');
                      return;
                    }

                    app.addGold(-def.seedCost);
                    app.addItem(`${def.id}_seed`, 1);
                    app.persist('npc_buy_seed');
                    (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
                      error: Error()
                    }), AudioManager) : AudioManager).inst.playSfx('coin');
                    (_this$_onToast2 = this._onToast) == null || _this$_onToast2.call(this, `购入 ${def.name}种子 ×1`);

                    this._renderContent();
                  }
                });
              }

              this._renderShelfCards(items);
            } else {
              var _app$saveData$farm$to;

              const curLv = (_app$saveData$farm$to = app.saveData.farm.toolLevel) != null ? _app$saveData$farm$to : 1;
              const hasPet = !!app.saveData.farm.petAdopted;
              const items = [{
                artKey: 'def_lotus_pad',
                artW: 72,
                artH: 56,
                title: curLv === 1 ? '灵泉农具 · 3格范围' : curLv === 2 ? '宗师农具 · 9格范围' : '灵泉农具 · 已满级',
                sub: curLv === 1 ? '一次浇水/收获邻近 3 块田' : '一次 3×3 全范围轻松打理',
                priceText: curLv === 1 ? '80金 + 10木' : curLv === 2 ? '160金 + 15石' : '已拥有',
                disabled: curLv >= 3,
                onBuy: () => {
                  if (curLv >= 3) return;

                  if (curLv === 1) {
                    var _app$saveData$invento, _this$_onToast4;

                    if (app.saveData.gold < 80 || ((_app$saveData$invento = app.saveData.inventory['wood']) != null ? _app$saveData$invento : 0) < 10) {
                      var _this$_onToast3;

                      (_this$_onToast3 = this._onToast) == null || _this$_onToast3.call(this, '材料不足：需要 80 金币 + 10 木材');
                      return;
                    }

                    app.addGold(-80);
                    app.addItem('wood', -10);
                    app.saveData.farm.toolLevel = 2;
                    app.persist('upgrade_tool_2');
                    (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
                      error: Error()
                    }), AudioManager) : AudioManager).inst.playSfx('harvest');
                    (_this$_onToast4 = this._onToast) == null || _this$_onToast4.call(this, '农具升级成功！一次联动邻近 3 块田！');
                  } else {
                    var _app$saveData$invento2, _this$_onToast6;

                    if (app.saveData.gold < 160 || ((_app$saveData$invento2 = app.saveData.inventory['stone']) != null ? _app$saveData$invento2 : 0) < 15) {
                      var _this$_onToast5;

                      (_this$_onToast5 = this._onToast) == null || _this$_onToast5.call(this, '材料不足：需要 160 金币 + 15 青石');
                      return;
                    }

                    app.addGold(-160);
                    app.addItem('stone', -15);
                    app.saveData.farm.toolLevel = 3;
                    app.persist('upgrade_tool_3');
                    (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
                      error: Error()
                    }), AudioManager) : AudioManager).inst.playSfx('harvest');
                    (_this$_onToast6 = this._onToast) == null || _this$_onToast6.call(this, '宗师灵泉农具完成！一键 3×3 全范围打理！');
                  }

                  this._renderContent();
                }
              }, {
                artKey: 'pet_spirit_fox',
                artW: 68,
                artH: 70,
                title: '国风灵宠 · 青云小狐',
                sub: '随行漫步 · 每早自动浇 6 块田',
                priceText: hasPet ? '已相伴随行' : '60 金币',
                disabled: hasPet,
                onBuy: () => {
                  var _this$_onToast8;

                  if (hasPet) return;

                  if (app.saveData.gold < 60) {
                    var _this$_onToast7;

                    (_this$_onToast7 = this._onToast) == null || _this$_onToast7.call(this, '金币不足（需要 60 金币）');
                    return;
                  }

                  app.addGold(-60);
                  app.saveData.farm.petAdopted = true;
                  app.persist('adopt_pet');
                  (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
                    error: Error()
                  }), AudioManager) : AudioManager).inst.playSfx('harvest');
                  (_this$_onToast8 = this._onToast) == null || _this$_onToast8.call(this, '领养成功！青云小狐已来到主岛陪你漫步！');

                  this._renderContent();
                }
              }];

              this._renderShelfCards(items);
            }

            return;
          }

          if (this._currentNpc === 'atang') {
            this._nameLbl.string = '货郎船匠 · 阿棠';
            this._dialogLbl.string = '「这些都是我跑船收来的国风好摆件，买下会自动放进你屋里的『装扮背包』，随时能自由移动和旋转！」';
            const furnItems = (_crd && FURNITURE_CATALOG === void 0 ? (_reportPossibleCrUseOfFURNITURE_CATALOG({
              error: Error()
            }), FURNITURE_CATALOG) : FURNITURE_CATALOG).filter(f => f.price > 0).map(f => ({
              artKey: f.id,
              artW: 72,
              artH: 64,
              title: f.name,
              sub: `居室舒心度 +${f.comfort}`,
              priceText: `${f.price} 金币`,
              onBuy: () => {
                var _this$_onToast10;

                if (app.saveData.gold < f.price) {
                  var _this$_onToast9;

                  (_this$_onToast9 = this._onToast) == null || _this$_onToast9.call(this, '金币不足，先去出货箱卖菜或出海带宝回来吧');
                  return;
                }

                app.addGold(-f.price);
                app.addItem(f.id, 1);
                app.persist('npc_buy_furn');
                (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
                  error: Error()
                }), AudioManager) : AudioManager).inst.playSfx('coin');
                (_this$_onToast10 = this._onToast) == null || _this$_onToast10.call(this, `购入【${f.name}】！已存入主角雅居「装扮背包」`);

                this._renderContent();
              }
            }));

            this._renderShelfCards(furnItems);

            return;
          }

          if (this._currentNpc === 'jianglao') {
            this._nameLbl.string = '垂钓翁 · 江老';
            this._dialogLbl.string = '「北边寒溪出敏捷溪鳟，适合在室外灶棚炖地牢鱼汤；眼前这口灵泉荷塘还能放养最多 4 尾灵鱼，明早起来就有金币与灵气收成！」';
            return;
          }

          this._nameLbl.string = '守印人 · 玄墨';
          this._dialogLbl.string = `「左坛秘境石门通往幽篁古墟，记得带雷火薯炸开北墙裂纹石壁；右坛封印古碑当前修复度 ${app.saveData.defense.sealRepairPct}%，随时可开启 5×9 夜袭试炼。」`;
        }

        _renderShelfCards(entries) {
          const count = entries.length;
          const cardW = count <= 2 ? 290 : 178;
          const cardH = 216;
          const gap = count <= 2 ? 28 : 14;
          entries.forEach((item, idx) => {
            const box = this._uiNode(`Shelf_${idx}`, this._shelfGrid);

            box.addComponent(UITransform).setContentSize(cardW, cardH);
            box.setPosition((idx - (count - 1) / 2) * (cardW + gap), 0, 0);
            const g = box.addComponent(Graphics);
            g.fillColor = new Color(252, 246, 232, 255);
            g.strokeColor = new Color(168, 128, 86, 235);
            g.lineWidth = 2;
            g.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
            g.fill();
            g.stroke(); // 商品手绘图标展示框

            g.fillColor = new Color(238, 229, 208, 220);
            g.roundRect(-cardW / 2 + 12, 2, cardW - 24, 92, 9);
            g.fill();

            const icon = this._uiNode('Icon', box);

            icon.setPosition(0, 48, 0);
            (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
              error: Error()
            }), ArtLoader) : ArtLoader).applySprite(icon, item.artKey, item.artW, item.artH);

            const tLbl = this._uiNode('Title', box).addComponent(Label);

            tLbl.node.setPosition(0, -16, 0);
            tLbl.string = item.title;
            tLbl.fontSize = 15;
            tLbl.color = new Color(36, 46, 42, 255);

            const sLbl = this._uiNode('Sub', box).addComponent(Label);

            sLbl.node.setPosition(0, -40, 0);
            sLbl.string = item.sub;
            sLbl.fontSize = 11;
            sLbl.color = new Color(108, 84, 58, 235);

            const buyBtn = this._makeBtn(item.priceText, cardW - 28, 34, item.disabled ? new Color(138, 140, 134, 220) : new Color(36, 126, 116, 250), item.onBuy);

            buyBtn.parent = box;
            buyBtn.setPosition(0, -80, 0);
          });
        }

      }, _class2._inst = null, _class2)) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=bc2405b77756262e2eb59c0acede070a24c41c8c.js.map