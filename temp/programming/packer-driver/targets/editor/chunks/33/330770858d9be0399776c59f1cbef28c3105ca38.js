System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3", "__unresolved_4", "__unresolved_5", "__unresolved_6", "__unresolved_7", "__unresolved_8", "__unresolved_9", "__unresolved_10", "__unresolved_11", "__unresolved_12"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Color, Component, Graphics, Label, Layers, Node, UITransform, Widget, EventBus, GameApp, FarmSystem, OverworldController, FishingOverlay, IndoorOverlay, NpcDialogOverlay, DungeonOverlay, DefenseOverlay, VoyageOverlay, ArtLoader, AudioManager, _dec, _class, _class2, _crd, ccclass, OverworldHUD;

  function _reportPossibleCrUseOfEventBus(extras) {
    _reporterNs.report("EventBus", "../core/EventBus", _context.meta, extras);
  }

  function _reportPossibleCrUseOfGameApp(extras) {
    _reporterNs.report("GameApp", "../app/GameApp", _context.meta, extras);
  }

  function _reportPossibleCrUseOfFarmSystem(extras) {
    _reporterNs.report("FarmSystem", "../gameplay/farm/FarmSystem", _context.meta, extras);
  }

  function _reportPossibleCrUseOfOverworldController(extras) {
    _reporterNs.report("OverworldController", "../gameplay/overworld/OverworldController", _context.meta, extras);
  }

  function _reportPossibleCrUseOfFishingOverlay(extras) {
    _reporterNs.report("FishingOverlay", "./FishingOverlay", _context.meta, extras);
  }

  function _reportPossibleCrUseOfIndoorOverlay(extras) {
    _reporterNs.report("IndoorOverlay", "./IndoorOverlay", _context.meta, extras);
  }

  function _reportPossibleCrUseOfNpcDialogOverlay(extras) {
    _reporterNs.report("NpcDialogOverlay", "./NpcDialogOverlay", _context.meta, extras);
  }

  function _reportPossibleCrUseOfDungeonOverlay(extras) {
    _reporterNs.report("DungeonOverlay", "./DungeonOverlay", _context.meta, extras);
  }

  function _reportPossibleCrUseOfDefenseOverlay(extras) {
    _reporterNs.report("DefenseOverlay", "./DefenseOverlay", _context.meta, extras);
  }

  function _reportPossibleCrUseOfVoyageOverlay(extras) {
    _reporterNs.report("VoyageOverlay", "./VoyageOverlay", _context.meta, extras);
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
      Widget = _cc.Widget;
    }, function (_unresolved_2) {
      EventBus = _unresolved_2.EventBus;
    }, function (_unresolved_3) {
      GameApp = _unresolved_3.GameApp;
    }, function (_unresolved_4) {
      FarmSystem = _unresolved_4.FarmSystem;
    }, function (_unresolved_5) {
      OverworldController = _unresolved_5.OverworldController;
    }, function (_unresolved_6) {
      FishingOverlay = _unresolved_6.FishingOverlay;
    }, function (_unresolved_7) {
      IndoorOverlay = _unresolved_7.IndoorOverlay;
    }, function (_unresolved_8) {
      NpcDialogOverlay = _unresolved_8.NpcDialogOverlay;
    }, function (_unresolved_9) {
      DungeonOverlay = _unresolved_9.DungeonOverlay;
    }, function (_unresolved_10) {
      DefenseOverlay = _unresolved_10.DefenseOverlay;
    }, function (_unresolved_11) {
      VoyageOverlay = _unresolved_11.VoyageOverlay;
    }, function (_unresolved_12) {
      ArtLoader = _unresolved_12.ArtLoader;
    }, function (_unresolved_13) {
      AudioManager = _unresolved_13.AudioManager;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "9c82eRQOhlNcY8iXht0osgx", "OverworldHUD", undefined);
      /**
       * 《异界小农场 2.0》V1.3 正式版 HUD：国风绘本开屏封面 + 新手 5 步轻引导 + 玉石单键交互 + 收纳式种子袋
       * - 种子不再平铺遮挡地图，收纳为右下角玉石键旁的精巧「种子袋」按钮，轻点展开选择全部拥有种子，选完自动收起。
       */


      __checkObsolete__(['_decorator', 'Color', 'Component', 'Graphics', 'Label', 'Layers', 'Node', 'UITransform', 'Widget']);

      ({
        ccclass
      } = _decorator);

      _export("OverworldHUD", OverworldHUD = (_dec = ccclass('OverworldHUD'), _dec(_class = (_class2 = class OverworldHUD extends Component {
        constructor(...args) {
          super(...args);
          this._calBadge = void 0;
          this._calTitle = void 0;
          this._calSub = void 0;
          this._guideNode = void 0;
          this._actionBtn = void 0;
          this._guideLbl = void 0;
          this._guideHint = '';
          this._actionLbl = void 0;
          this._actionGfx = void 0;
          this._toastNode = void 0;
          this._toastLbl = void 0;
          this._seedPouchBtn = void 0;
          this._seedPouchLbl = void 0;
          this._seedDrawer = void 0;
          this._seedDrawerOpen = false;
          this._titleCover = void 0;
          this._titlePlayLbl = void 0;
          this._selectedPlantId = 'spring_greens';
          this._toastTimer = 0;
          this._hasJadeArt = false;
        }

        static get isTitleOpen() {
          return OverworldHUD._titleOpen;
        }

        start() {
          OverworldHUD._titleOpen = true;

          this._buildCalendarBadge();

          this._buildGuidePill();

          this._buildSmartActionButton();

          this._buildSeedPouch();

          this._buildToast();

          if (!this.node.getComponent(_crd && VoyageOverlay === void 0 ? (_reportPossibleCrUseOfVoyageOverlay({
            error: Error()
          }), VoyageOverlay) : VoyageOverlay)) this.node.addComponent(_crd && VoyageOverlay === void 0 ? (_reportPossibleCrUseOfVoyageOverlay({
            error: Error()
          }), VoyageOverlay) : VoyageOverlay);

          this._buildTitleCover();

          (_crd && EventBus === void 0 ? (_reportPossibleCrUseOfEventBus({
            error: Error()
          }), EventBus) : EventBus).inst.on('dayAdvanced', this._refreshHUD, this);
          (_crd && EventBus === void 0 ? (_reportPossibleCrUseOfEventBus({
            error: Error()
          }), EventBus) : EventBus).inst.on('goldChanged', this._refreshHUD, this);
          (_crd && EventBus === void 0 ? (_reportPossibleCrUseOfEventBus({
            error: Error()
          }), EventBus) : EventBus).inst.on('inventoryChanged', this._refreshHUD, this);
          (_crd && EventBus === void 0 ? (_reportPossibleCrUseOfEventBus({
            error: Error()
          }), EventBus) : EventBus).inst.on('saveCompleted', this._refreshHUD, this);
          this.schedule(this._pollInit, 0.1);
        }

        onDestroy() {
          OverworldHUD._titleOpen = false;
          this.unschedule(this._pollInit);
          (_crd && EventBus === void 0 ? (_reportPossibleCrUseOfEventBus({
            error: Error()
          }), EventBus) : EventBus).inst.offTarget(this);
        }

        _pollInit() {
          var _inst;

          if ((_inst = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst) != null && _inst.ready) {
            this._refreshHUD();

            this._refreshTitleButton();

            this.unschedule(this._pollInit);
          }
        }

        _uiNode(name, parent) {
          const n = new Node(name);
          n.layer = Layers.Enum.UI_2D;
          n.parent = parent;
          return n;
        }

        _buildTitleCover() {
          this._titleCover = this._uiNode('TitleCover', this.node);

          this._titleCover.addComponent(UITransform).setContentSize(1280, 720);

          this._titleCover.setSiblingIndex(this.node.children.length - 1);

          const bg = this._titleCover.addComponent(Graphics);

          bg.fillColor = new Color(236, 232, 214, 255);
          bg.rect(-640, -360, 1280, 720);
          bg.fill();
          (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
            error: Error()
          }), ArtLoader) : ArtLoader).applySprite(this._titleCover, 'bg_title_cover', 1280, 720);

          const plaque = this._uiNode('TitlePlaque', this._titleCover);

          plaque.setPosition(0, 215, 0);
          const pg = plaque.addComponent(Graphics);
          pg.fillColor = new Color(248, 241, 224, 235);
          pg.strokeColor = new Color(136, 94, 58, 255);
          pg.lineWidth = 3.5;
          pg.roundRect(-248, -62, 496, 124, 18);
          pg.fill();
          pg.stroke();

          const titleLbl = this._uiNode('MainTitle', plaque).addComponent(Label);

          titleLbl.node.setPosition(0, 16, 0);
          titleLbl.string = '异界小农场';
          titleLbl.fontSize = 44;
          titleLbl.lineHeight = 52;
          titleLbl.color = new Color(34, 52, 44, 255);

          const subLbl = this._uiNode('SubTitle', plaque).addComponent(Label);

          subLbl.node.setPosition(0, -32, 0);
          subLbl.string = '田园耕种 · 幽篁探秘 · 灵植守印';
          subLbl.fontSize = 16;
          subLbl.color = new Color(118, 82, 50, 245);

          const playBtn = this._uiNode('PlayBtn', this._titleCover);

          playBtn.addComponent(UITransform).setContentSize(236, 58);
          playBtn.setPosition(0, 72, 0);
          const bgPlay = playBtn.addComponent(Graphics);
          bgPlay.fillColor = new Color(36, 126, 116, 248);
          bgPlay.strokeColor = new Color(224, 192, 118, 255);
          bgPlay.lineWidth = 3;
          bgPlay.roundRect(-118, -29, 236, 58, 29);
          bgPlay.fill();
          bgPlay.stroke();
          this._titlePlayLbl = this._uiNode('Lbl', playBtn).addComponent(Label);
          this._titlePlayLbl.string = '踏入小岛';
          this._titlePlayLbl.fontSize = 22;
          this._titlePlayLbl.color = Color.WHITE;
          playBtn.on(Node.EventType.TOUCH_END, () => {
            (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
              error: Error()
            }), AudioManager) : AudioManager).inst.playSfx('harvest');
            (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
              error: Error()
            }), AudioManager) : AudioManager).inst.playBgm('overworld');
            OverworldHUD._titleOpen = false;
            this._titleCover.active = false;
            this.showToast('欢迎来到异界小农场！左上角可查看当前新手指引');
          });

          const resetBtn = this._uiNode('NewSaveBtn', this._titleCover);

          resetBtn.addComponent(UITransform).setContentSize(164, 42);
          resetBtn.setPosition(0, 8, 0);
          const bgReset = resetBtn.addComponent(Graphics);
          bgReset.fillColor = new Color(128, 92, 62, 225);
          bgReset.strokeColor = new Color(236, 222, 194, 220);
          bgReset.lineWidth = 2;
          bgReset.roundRect(-82, -21, 164, 42, 21);
          bgReset.fill();
          bgReset.stroke();

          const rLbl = this._uiNode('Lbl', resetBtn).addComponent(Label);

          rLbl.string = '新开一日存档';
          rLbl.fontSize = 15;
          rLbl.color = new Color(252, 246, 234, 255);
          resetBtn.on(Node.EventType.TOUCH_END, () => {
            var _inst2, _inst3;

            (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
              error: Error()
            }), AudioManager) : AudioManager).inst.playSfx('tap');
            (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
              error: Error()
            }), AudioManager) : AudioManager).inst.playBgm('overworld');
            (_inst2 = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
              error: Error()
            }), GameApp) : GameApp).inst) == null || _inst2.resetSave();
            (_inst3 = (_crd && OverworldController === void 0 ? (_reportPossibleCrUseOfOverworldController({
              error: Error()
            }), OverworldController) : OverworldController).inst) == null || _inst3.refreshWorldObjects();

            this._refreshHUD();

            OverworldHUD._titleOpen = false;
            this._titleCover.active = false;
            this.showToast('已开启全新开局（6 块新手田），祝你田园之旅愉快！');
          });

          const verLbl = this._uiNode('Ver', this._titleCover).addComponent(Label);

          verLbl.node.setPosition(0, -332, 0);
          verLbl.string = 'V1.3 阔境完整版 · 纯单机无内购 · 数据本地安全保存';
          verLbl.fontSize = 13;
          verLbl.color = new Color(46, 62, 54, 225);
        }

        _refreshTitleButton() {
          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready) || !this._titlePlayLbl) return;
          const d = app.time.getDate();

          if (d.dayIndex > 1 || app.saveData.farm.auraScore > 0 || app.saveData.codex.fish.length > 0) {
            this._titlePlayLbl.string = `继续游玩（第${d.dayIndex}天）`;
          } else {
            this._titlePlayLbl.string = '踏入小岛';
          }
        }

        _buildCalendarBadge() {
          const box = this._uiNode('CalendarBadge', this.node);

          this._calBadge = box;
          const ut = box.addComponent(UITransform);
          ut.setContentSize(316, 86);
          const w = box.addComponent(Widget);
          w.isAlignTop = true;
          w.top = 20;
          w.isAlignLeft = true;
          w.left = 24;
          const g = box.addComponent(Graphics);
          g.fillColor = new Color(246, 238, 220, 245);
          g.strokeColor = new Color(132, 92, 58, 255);
          g.lineWidth = 3;
          g.roundRect(-158, -43, 316, 86, 12);
          g.fill();
          g.stroke();
          g.fillColor = new Color(196, 74, 49, 255);
          g.circle(-122, 0, 22);
          g.fill();

          const sealLbl = this._uiNode('SealChar', box).addComponent(Label);

          sealLbl.node.setPosition(-122, 0, 0);
          sealLbl.string = '农';
          sealLbl.fontSize = 20;
          sealLbl.color = new Color(250, 242, 228, 255);

          const tNode = this._uiNode('CalTitle', box);

          tNode.setPosition(22, 15, 0);
          this._calTitle = tNode.addComponent(Label);
          this._calTitle.fontSize = 20;
          this._calTitle.lineHeight = 24;
          this._calTitle.color = new Color(32, 42, 38, 255);
          this._calTitle.string = '立春 · 第1天';

          const sNode = this._uiNode('CalSub', box);

          sNode.setPosition(22, -15, 0);
          this._calSub = sNode.addComponent(Label);
          this._calSub.fontSize = 14;
          this._calSub.lineHeight = 20;
          this._calSub.color = new Color(110, 78, 48, 255);
          this._calSub.string = '金币 50 · 灵气 0 · 舒心 10';
        }

        _buildGuidePill() {
          this._guideNode = this._uiNode('GuidePill', this.node);

          const ut = this._guideNode.addComponent(UITransform);

          ut.setContentSize(316, 38);

          const w = this._guideNode.addComponent(Widget);

          w.isAlignTop = true;
          w.top = 114;
          w.isAlignLeft = true;
          w.left = 24;

          const g = this._guideNode.addComponent(Graphics);

          g.fillColor = new Color(34, 62, 56, 220);
          g.strokeColor = new Color(216, 184, 114, 235);
          g.lineWidth = 1.8;
          g.roundRect(-158, -19, 316, 38, 10);
          g.fill();
          g.stroke();
          this._guideLbl = this._uiNode('GuideLbl', this._guideNode).addComponent(Label);
          this._guideLbl.fontSize = 13;
          this._guideLbl.lineHeight = 18;
          this._guideLbl.color = new Color(252, 244, 224, 255);

          this._guideNode.on(Node.EventType.TOUCH_END, () => {
            if (this._guideHint) this.showToast(this._guideHint);
          });
        }

        _refreshGuidePill() {
          var _save$inventory$dish_, _save$inventory$bait_, _save$inventory$dish_2;

          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready) || !this._guideNode) return;
          const save = app.saveData;
          const hasPlanted = save.farm.plots.some(p => !!p.plantId) || save.codex.plants.length > 0;
          const hasFished = save.codex.fish.length > 0;
          const hasCleared = save.farm.clearedObstacleIds.length > 0;
          const hasCookedOrBoosted = ((_save$inventory$dish_ = save.inventory['dish_brook_soup']) != null ? _save$inventory$dish_ : 0) > 0 || ((_save$inventory$bait_ = save.inventory['bait_lotus']) != null ? _save$inventory$bait_ : 0) > 0 || ((_save$inventory$dish_2 = save.inventory['dish_estuary_soup']) != null ? _save$inventory$dish_2 : 0) > 0 || save.farm.auraScore >= 6;
          const hasExploredNorth = save.dungeon.deepestLayer > 0 || save.defense.awakened;

          if (!hasPlanted) {
            this._guideNode.active = true;
            this._guideLbl.string = '指引 1/5：去东侧农田播下青露菜并浇水';
            this._guideHint = '从小院东门沿石板路进入东侧农田，点右下角种子袋可换种，按玉石键播种浇水';
          } else if (!hasFished) {
            this._guideNode.active = true;
            this._guideLbl.string = '指引 2/5：去东北灵泉荷塘或河边钓 1 条鱼';
            this._guideHint = '东田北侧有灵泉荷塘（江老旁），走近水边木桩即可垂钓';
          } else if (!hasCookedOrBoosted) {
            this._guideNode.active = true;
            this._guideLbl.string = '指引 3/5：去小院室外灶棚做 1 道灵膳/鱼汤';
            this._guideHint = '回到主角农舍右侧的室外灶棚，点击即可用鲜鱼或蔬菜开火下厨';
          } else if (!hasCleared) {
            this._guideNode.active = true;
            this._guideLbl.string = '指引 4/5：清理东田杂草或过桥去西岸开荒';
            this._guideHint = '清理东田杂草，或过西侧木拱桥前往西岸南北空地开荒解锁新农田';
          } else if (!hasExploredNorth) {
            this._guideNode.active = true;
            this._guideLbl.string = '指引 5/5：北上古石圣域探索古墟或守印';
            this._guideHint = '从小院北门登石阶可进入幽篁六十关地牢或开启 5×9 封印夜袭';
          } else {
            this._guideNode.active = false;
          }
        }

        _buildSmartActionButton() {
          const btn = this._uiNode('SmartActionBtn', this.node);

          this._actionBtn = btn;
          const ut = btn.addComponent(UITransform);
          ut.setContentSize(116, 116);
          const w = btn.addComponent(Widget);
          w.isAlignRight = true;
          w.right = 44;
          w.isAlignBottom = true;
          w.bottom = 42;
          this._actionGfx = btn.addComponent(Graphics);

          this._drawActionCircle(false);

          (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
            error: Error()
          }), ArtLoader) : ArtLoader).applySprite(btn, 'ui_btn_jade', 124, 124, () => {
            this._hasJadeArt = true;

            this._actionGfx.clear();
          });

          const lNode = this._uiNode('ActionLbl', btn);

          this._actionLbl = lNode.addComponent(Label);
          this._actionLbl.fontSize = 19;
          this._actionLbl.lineHeight = 24;
          this._actionLbl.color = Color.WHITE;
          this._actionLbl.string = '漫步';
          btn.on(Node.EventType.TOUCH_END, () => this._onPrimaryActionTap());
        }

        _drawActionCircle(active) {
          if (this._hasJadeArt) return;
          const g = this._actionGfx;
          g.clear();
          g.fillColor = active ? new Color(36, 126, 116, 245) : new Color(116, 136, 130, 180);
          g.strokeColor = active ? new Color(216, 182, 108, 255) : new Color(180, 188, 184, 200);
          g.lineWidth = 4;
          g.circle(0, 0, 56);
          g.fill();
          g.stroke();
        }
        /** V1.3 收纳式「种子袋」按钮 + 展开抽屉（种子不再平铺遮挡地图） */


        _buildSeedPouch() {
          const btn = this._uiNode('SeedPouchBtn', this.node);

          this._seedPouchBtn = btn;
          btn.addComponent(UITransform).setContentSize(128, 48);
          const w = btn.addComponent(Widget);
          w.isAlignRight = true;
          w.right = 176;
          w.isAlignBottom = true;
          w.bottom = 50;
          const g = btn.addComponent(Graphics);
          g.fillColor = new Color(246, 236, 214, 242);
          g.strokeColor = new Color(136, 94, 58, 248);
          g.lineWidth = 2.4;
          g.roundRect(-64, -24, 128, 48, 12);
          g.fill();
          g.stroke();
          this._seedPouchLbl = this._uiNode('Lbl', btn).addComponent(Label);
          this._seedPouchLbl.fontSize = 13;
          this._seedPouchLbl.lineHeight = 18;
          this._seedPouchLbl.color = new Color(40, 52, 46, 255);
          this._seedPouchLbl.string = '种子袋 ▲';
          btn.on(Node.EventType.TOUCH_END, () => {
            (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
              error: Error()
            }), AudioManager) : AudioManager).inst.playSfx('tap');
            this._seedDrawerOpen = !this._seedDrawerOpen;

            this._refreshSeedPouch();
          });
          this._seedDrawer = this._uiNode('SeedDrawer', this.node);

          const dw = this._seedDrawer.addComponent(Widget);

          dw.isAlignRight = true;
          dw.right = 176;
          dw.isAlignBottom = true;
          dw.bottom = 108;
          this._seedDrawer.active = false;
        }

        _buildToast() {
          this._toastNode = this._uiNode('Toast', this.node);

          this._toastNode.setPosition(0, -250, 0);

          const g = this._toastNode.addComponent(Graphics);

          g.fillColor = new Color(30, 44, 40, 232);
          g.strokeColor = new Color(210, 178, 110, 220);
          g.lineWidth = 2;
          g.roundRect(-270, -22, 540, 44, 22);
          g.fill();
          g.stroke();

          const lNode = this._uiNode('ToastLbl', this._toastNode);

          this._toastLbl = lNode.addComponent(Label);
          this._toastLbl.fontSize = 17;
          this._toastLbl.lineHeight = 22;
          this._toastLbl.color = new Color(248, 242, 228, 255);
          this._toastNode.active = false;
        }

        showToast(msg) {
          this._toastLbl.string = msg;
          this._toastNode.active = true;

          this._toastNode.setSiblingIndex(this.node.children.length - 1);

          this._toastTimer = 2.6;
        }

        _refreshHUD() {
          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return;
          const d = app.time.getDate();
          const weatherCn = app.time.weather === 'rainy' ? '雨' : app.time.weather === 'snowy' ? '雪' : '晴';
          this._calTitle.string = `${d.solarTerm.name} · 第${d.dayIndex}天(${weatherCn})`;
          this._calSub.string = `金币 ${app.saveData.gold} · 灵气 ${app.saveData.farm.auraScore} · 舒心 ${app.saveData.indoor.comfortScore}`;

          this._refreshSeedPouch();

          this._refreshGuidePill();
        }

        _refreshSeedPouch() {
          var _seeds$find, _this$_seedDrawer$get, _this$_seedDrawer$get2;

          const seeds = (_crd && FarmSystem === void 0 ? (_reportPossibleCrUseOfFarmSystem({
            error: Error()
          }), FarmSystem) : FarmSystem).inst.getAvailableSeeds();

          if (seeds.length === 0) {
            this._seedPouchLbl.string = '种子袋(空)';
            this._seedDrawer.active = false;
            this._seedDrawerOpen = false;
            return;
          }

          if (!seeds.some(s => s.plant.id === this._selectedPlantId)) {
            this._selectedPlantId = seeds[0].plant.id;
          }

          const cur = (_seeds$find = seeds.find(s => s.plant.id === this._selectedPlantId)) != null ? _seeds$find : seeds[0];
          this._seedPouchLbl.string = `${cur.plant.name}×${cur.count} ${this._seedDrawerOpen ? '▼' : '▲'}`;

          this._seedDrawer.removeAllChildren();

          this._seedDrawer.active = this._seedDrawerOpen;
          if (!this._seedDrawerOpen) return;
          const rowH = 42;
          const panelW = 196;
          const panelH = seeds.length * rowH + 22;
          const ut = (_this$_seedDrawer$get = this._seedDrawer.getComponent(UITransform)) != null ? _this$_seedDrawer$get : this._seedDrawer.addComponent(UITransform);
          ut.setContentSize(panelW, panelH);
          const bg = (_this$_seedDrawer$get2 = this._seedDrawer.getComponent(Graphics)) != null ? _this$_seedDrawer$get2 : this._seedDrawer.addComponent(Graphics);
          bg.clear();
          bg.fillColor = new Color(248, 241, 224, 248);
          bg.strokeColor = new Color(132, 92, 58, 250);
          bg.lineWidth = 2.4;
          bg.roundRect(-panelW / 2, -panelH / 2, panelW, panelH, 12);
          bg.fill();
          bg.stroke();
          seeds.forEach((entry, idx) => {
            const ry = panelH / 2 - 11 - rowH * (idx + 0.5);

            const row = this._uiNode(`SeedRow_${entry.plant.id}`, this._seedDrawer);

            row.addComponent(UITransform).setContentSize(panelW - 18, rowH - 6);
            row.setPosition(0, ry, 0);
            const selected = entry.plant.id === this._selectedPlantId;
            const rg = row.addComponent(Graphics);
            rg.fillColor = selected ? new Color(38, 128, 114, 240) : new Color(235, 224, 202, 230);
            rg.strokeColor = selected ? new Color(216, 182, 108, 255) : new Color(168, 140, 106, 180);
            rg.lineWidth = 1.6;
            rg.roundRect(-(panelW - 18) / 2, -(rowH - 6) / 2, panelW - 18, rowH - 6, 8);
            rg.fill();
            rg.stroke();

            const lbl = this._uiNode('Lbl', row).addComponent(Label);

            lbl.string = `${selected ? '✓ ' : ''}${entry.plant.name}  ×${entry.count}`;
            lbl.fontSize = 14;
            lbl.lineHeight = 18;
            lbl.color = selected ? Color.WHITE : new Color(42, 52, 46, 255);
            row.on(Node.EventType.TOUCH_END, () => {
              (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
                error: Error()
              }), AudioManager) : AudioManager).inst.playSfx('tap');
              this._selectedPlantId = entry.plant.id;
              this._seedDrawerOpen = false;

              this._refreshSeedPouch();

              this.showToast(`当前种子切换为：${entry.plant.name}`);
            });
          });
        }

        _onPrimaryActionTap() {
          if (OverworldHUD._titleOpen) return;

          if (this._seedDrawerOpen) {
            this._seedDrawerOpen = false;

            this._refreshSeedPouch();
          }

          const ctrl = (_crd && OverworldController === void 0 ? (_reportPossibleCrUseOfOverworldController({
            error: Error()
          }), OverworldController) : OverworldController).inst;
          const target = ctrl == null ? void 0 : ctrl.nearestTarget;

          if (!target) {
            this.showToast('WASD 或左屏摇杆走近农田、室外灶棚、灵泉荷塘、NPC 或屋舍');
            return;
          }

          if (target.kind === 'plot' && target.plotId !== undefined) {
            var _inst$saveData$farm$t, _inst4;

            const plot = (_crd && FarmSystem === void 0 ? (_reportPossibleCrUseOfFarmSystem({
              error: Error()
            }), FarmSystem) : FarmSystem).inst.getPlot(target.plotId);
            if (!plot) return;
            const toolLv = (_inst$saveData$farm$t = (_inst4 = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
              error: Error()
            }), GameApp) : GameApp).inst) == null ? void 0 : _inst4.saveData.farm.toolLevel) != null ? _inst$saveData$farm$t : 1;
            const rangeCount = toolLv >= 3 ? 9 : toolLv === 2 ? 3 : 1;
            const res = !plot.plantId ? (_crd && FarmSystem === void 0 ? (_reportPossibleCrUseOfFarmSystem({
              error: Error()
            }), FarmSystem) : FarmSystem).inst.plantSeed(plot.plotId, this._selectedPlantId) : (_crd && FarmSystem === void 0 ? (_reportPossibleCrUseOfFarmSystem({
              error: Error()
            }), FarmSystem) : FarmSystem).inst.isMature(plot) ? rangeCount > 1 ? (_crd && FarmSystem === void 0 ? (_reportPossibleCrUseOfFarmSystem({
              error: Error()
            }), FarmSystem) : FarmSystem).inst.harvestPlotsRange(ctrl.getNearbyPlotIds(plot.plotId, rangeCount)) : (_crd && FarmSystem === void 0 ? (_reportPossibleCrUseOfFarmSystem({
              error: Error()
            }), FarmSystem) : FarmSystem).inst.harvestPlot(plot.plotId) : rangeCount > 1 ? (_crd && FarmSystem === void 0 ? (_reportPossibleCrUseOfFarmSystem({
              error: Error()
            }), FarmSystem) : FarmSystem).inst.waterPlotsRange(ctrl.getNearbyPlotIds(plot.plotId, rangeCount)) : (_crd && FarmSystem === void 0 ? (_reportPossibleCrUseOfFarmSystem({
              error: Error()
            }), FarmSystem) : FarmSystem).inst.waterPlot(plot.plotId);
            this.showToast(res.message);
            (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
              error: Error()
            }), AudioManager) : AudioManager).inst.playSfx(res.ok ? 'harvest' : 'tap');
            ctrl.refreshWorldObjects();

            this._refreshGuidePill();

            return;
          }

          if (target.kind === 'obstacle' && target.obstacleTier && target.rewardItem && target.rewardCount) {
            const res = (_crd && FarmSystem === void 0 ? (_reportPossibleCrUseOfFarmSystem({
              error: Error()
            }), FarmSystem) : FarmSystem).inst.clearObstacle(target.id, target.obstacleTier, target.rewardItem, target.rewardCount);
            this.showToast(res.message);
            (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
              error: Error()
            }), AudioManager) : AudioManager).inst.playSfx(res.ok ? 'harvest' : 'tap');
            ctrl.refreshWorldObjects();

            this._refreshGuidePill();

            return;
          }

          if (target.kind === 'cottage') {
            var _inst5;

            (_inst5 = (_crd && IndoorOverlay === void 0 ? (_reportPossibleCrUseOfIndoorOverlay({
              error: Error()
            }), IndoorOverlay) : IndoorOverlay).inst) == null || _inst5.open(m => this.showToast(m), 'room');
            return;
          }

          if (target.kind === 'kitchen') {
            var _inst6;

            (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
              error: Error()
            }), AudioManager) : AudioManager).inst.playSfx('tap');
            (_inst6 = (_crd && IndoorOverlay === void 0 ? (_reportPossibleCrUseOfIndoorOverlay({
              error: Error()
            }), IndoorOverlay) : IndoorOverlay).inst) == null || _inst6.open(m => this.showToast(m), 'kitchen');
            return;
          }

          if (target.kind === 'fishing' && target.riverSegment) {
            var _inst7;

            (_inst7 = (_crd && FishingOverlay === void 0 ? (_reportPossibleCrUseOfFishingOverlay({
              error: Error()
            }), FishingOverlay) : FishingOverlay).inst) == null || _inst7.open(target.riverSegment, m => this.showToast(m));
            return;
          }

          if (target.kind === 'npc' && target.npcId) {
            var _inst8;

            (_inst8 = (_crd && NpcDialogOverlay === void 0 ? (_reportPossibleCrUseOfNpcDialogOverlay({
              error: Error()
            }), NpcDialogOverlay) : NpcDialogOverlay).inst) == null || _inst8.open(target.npcId, m => this.showToast(m));
            return;
          }

          if (target.kind === 'shipping') {
            const res = (_crd && FarmSystem === void 0 ? (_reportPossibleCrUseOfFarmSystem({
              error: Error()
            }), FarmSystem) : FarmSystem).inst.sellAllHarvest();
            (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
              error: Error()
            }), AudioManager) : AudioManager).inst.playSfx(res.ok ? 'coin' : 'tap');
            this.showToast(res.message);
            return;
          }

          if (target.kind === 'seal') {
            var _inst9;

            (_inst9 = (_crd && DefenseOverlay === void 0 ? (_reportPossibleCrUseOfDefenseOverlay({
              error: Error()
            }), DefenseOverlay) : DefenseOverlay).inst) == null || _inst9.open(m => this.showToast(m));
            return;
          }

          if (target.kind === 'portal') {
            var _inst10;

            (_inst10 = (_crd && DungeonOverlay === void 0 ? (_reportPossibleCrUseOfDungeonOverlay({
              error: Error()
            }), DungeonOverlay) : DungeonOverlay).inst) == null || _inst10.open(m => this.showToast(m));
            return;
          }

          if (target.kind === 'dock') {
            var _inst11;

            (_inst11 = (_crd && VoyageOverlay === void 0 ? (_reportPossibleCrUseOfVoyageOverlay({
              error: Error()
            }), VoyageOverlay) : VoyageOverlay).inst) == null || _inst11.open(m => this.showToast(m), () => ctrl.refreshWorldObjects());
          }
        }

        update(dt) {
          var _inst12, _inst13, _inst14, _inst15, _inst16, _inst17;

          if (this._toastTimer > 0) {
            this._toastTimer -= dt;
            if (this._toastTimer <= 0) this._toastNode.active = false;
          }

          const overlayOpen = OverworldHUD._titleOpen || !!((_inst12 = (_crd && DungeonOverlay === void 0 ? (_reportPossibleCrUseOfDungeonOverlay({
            error: Error()
          }), DungeonOverlay) : DungeonOverlay).inst) != null && _inst12.isOpen) || !!((_inst13 = (_crd && DefenseOverlay === void 0 ? (_reportPossibleCrUseOfDefenseOverlay({
            error: Error()
          }), DefenseOverlay) : DefenseOverlay).inst) != null && _inst13.isOpen) || !!((_inst14 = (_crd && VoyageOverlay === void 0 ? (_reportPossibleCrUseOfVoyageOverlay({
            error: Error()
          }), VoyageOverlay) : VoyageOverlay).inst) != null && _inst14.isOpen) || !!((_inst15 = (_crd && FishingOverlay === void 0 ? (_reportPossibleCrUseOfFishingOverlay({
            error: Error()
          }), FishingOverlay) : FishingOverlay).inst) != null && _inst15.isOpen) || !!((_inst16 = (_crd && IndoorOverlay === void 0 ? (_reportPossibleCrUseOfIndoorOverlay({
            error: Error()
          }), IndoorOverlay) : IndoorOverlay).inst) != null && _inst16.isOpen);
          if (this._calBadge) this._calBadge.active = !overlayOpen;
          if (this._actionBtn) this._actionBtn.active = !overlayOpen;
          if (this._seedPouchBtn) this._seedPouchBtn.active = !overlayOpen;

          if (overlayOpen && this._seedDrawerOpen) {
            this._seedDrawerOpen = false;
            this._seedDrawer.active = false;
          }

          if (this._guideNode && overlayOpen) this._guideNode.active = false;else if (this._guideNode && !overlayOpen) this._refreshGuidePill();
          if (overlayOpen) return;
          const target = (_inst17 = (_crd && OverworldController === void 0 ? (_reportPossibleCrUseOfOverworldController({
            error: Error()
          }), OverworldController) : OverworldController).inst) == null ? void 0 : _inst17.nearestTarget;

          if (target) {
            this._actionLbl.string = target.label;

            this._drawActionCircle(true);
          } else {
            this._actionLbl.string = '漫步';

            this._drawActionCircle(false);
          }
        }

      }, _class2._titleOpen = true, _class2)) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=330770858d9be0399776c59f1cbef28c3105ca38.js.map