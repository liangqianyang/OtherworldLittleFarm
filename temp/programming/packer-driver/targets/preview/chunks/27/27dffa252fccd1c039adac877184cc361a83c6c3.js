System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3", "__unresolved_4"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Color, Component, Graphics, Label, Layers, Node, UITransform, Vec3, DataManager, GameApp, ArtLoader, AudioManager, _dec, _class, _class2, _crd, ccclass, FURNITURE_CATALOG, FURN_ART_SIZE, DIR_LABELS, GRID_COLS, GRID_ROWS, CELL_W, CELL_H, IndoorOverlay;

  function _reportPossibleCrUseOfIndoorFurnitureSave(extras) {
    _reporterNs.report("IndoorFurnitureSave", "../core/GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfDataManager(extras) {
    _reporterNs.report("DataManager", "../core/DataManager", _context.meta, extras);
  }

  function _reportPossibleCrUseOfGameApp(extras) {
    _reporterNs.report("GameApp", "../app/GameApp", _context.meta, extras);
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
      Vec3 = _cc.Vec3;
    }, function (_unresolved_2) {
      DataManager = _unresolved_2.DataManager;
    }, function (_unresolved_3) {
      GameApp = _unresolved_3.GameApp;
    }, function (_unresolved_4) {
      ArtLoader = _unresolved_4.ArtLoader;
    }, function (_unresolved_5) {
      AudioManager = _unresolved_5.AudioManager;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "6e28akwXRJMf4O1GpxC+NYh", "IndoorOverlay", undefined);
      /**
       * 《异界小农场 2.0》第二批升级：2.5D 室内雅居「直接按住拖拽摆放 + 真 4 朝向旋转」与室外灶棚独立烹饪
       * - 直接拖拽：在木屋地板上按住任意摆件直接拖着走，实时显示吸附落点，松手自动落位保存。
       * - 真 4 朝向旋转：核心家具配备真侧面手绘贴图（0 正南 / 1 侧东 / 2 反朝 / 3 侧西），点击「旋转朝向」四向循环。
       * - 独立「装扮背包」弹窗：手绘卡片网格挑选摆件，底部彻底告别平铺按钮。
       */


      __checkObsolete__(['_decorator', 'Color', 'Component', 'EventTouch', 'Graphics', 'Label', 'Layers', 'Node', 'UITransform', 'Vec3']);

      ({
        ccclass
      } = _decorator);

      _export("FURNITURE_CATALOG", FURNITURE_CATALOG = [{
        id: 'furn_bed_wood',
        name: '雕花木床',
        price: 0,
        comfort: 6,
        color: [164, 114, 78],
        hasSideArt: true
      }, {
        id: 'furn_stove_clay',
        name: '暖炉火盆',
        price: 0,
        comfort: 4,
        color: [132, 124, 118]
      }, {
        id: 'furn_screen_ink',
        name: '山水屏风',
        price: 40,
        comfort: 10,
        color: [96, 134, 126],
        hasSideArt: true
      }, {
        id: 'furn_lantern_rabbit',
        name: '玉兔花灯',
        price: 35,
        comfort: 8,
        color: [232, 178, 86],
        hasSideArt: true
      }, {
        id: 'furn_aquarium_porcelain',
        name: '青瓷鱼缸',
        price: 50,
        comfort: 12,
        color: [72, 168, 162]
      }, {
        id: 'furn_tea_table',
        name: '雅致茶案',
        price: 45,
        comfort: 9,
        color: [152, 116, 82],
        hasSideArt: true
      }]);

      FURN_ART_SIZE = {
        furn_bed_wood: [86, 76],
        furn_bed_wood_side: [92, 70],
        furn_stove_clay: [64, 52],
        furn_screen_ink: [86, 78],
        furn_screen_ink_side: [74, 84],
        furn_lantern_rabbit: [56, 68],
        furn_lantern_rabbit_side: [56, 68],
        furn_aquarium_porcelain: [68, 68],
        furn_tea_table: [80, 56],
        furn_tea_table_side: [88, 46]
      };
      DIR_LABELS = ['朝南(正)', '朝东(侧)', '朝北(反)', '朝西(侧)'];
      GRID_COLS = 8;
      GRID_ROWS = 5;
      CELL_W = 82;
      CELL_H = 48;

      _export("IndoorOverlay", IndoorOverlay = (_dec = ccclass('IndoorOverlay'), _dec(_class = (_class2 = class IndoorOverlay extends Component {
        constructor() {
          super(...arguments);
          this._panel = void 0;
          this._roomView = void 0;
          this._kitchenView = void 0;
          this._headerLbl = void 0;
          this._msgLbl = void 0;
          this._bagBtnLbl = void 0;
          this._gridRoot = void 0;
          this._dragHoverGfx = void 0;
          this._dragGhost = void 0;
          this._actionBar = void 0;
          this._actionTitleLbl = void 0;
          this._bagModal = void 0;
          this._bagGrid = void 0;
          this._kStockLbl = void 0;
          this._kMsgLbl = void 0;
          this._open = false;
          this._placingFurnId = null;
          this._selectedUid = null;
          // 直接拖拽状态
          this._dragUid = null;
          this._dragStartLocal = new Vec3();
          this._isDragging = false;
          this._hoverCell = null;
          this._onToast = null;
        }

        static get inst() {
          return this._inst;
        }

        get isOpen() {
          return this._open;
        }

        onLoad() {
          IndoorOverlay._inst = this;

          this._buildUI();

          this._panel.active = false;
        }

        onDestroy() {
          if (IndoorOverlay._inst === this) IndoorOverlay._inst = null;
        }

        _uiNode(name, parent) {
          var n = new Node(name);
          n.layer = Layers.Enum.UI_2D;
          n.parent = parent;
          return n;
        }

        _getRot(item) {
          if (item.rot !== undefined) return item.rot;
          return item.flipX ? 2 : 0;
        }

        _resolveArtAndScale(furnId, rot) {
          var _FURN_ART_SIZE$key;

          var def = FURNITURE_CATALOG.find(c => c.id === furnId);
          var useSide = !!(def != null && def.hasSideArt) && (rot === 1 || rot === 3);
          var key = useSide ? furnId + "_side" : furnId;
          var [w, h] = (_FURN_ART_SIZE$key = FURN_ART_SIZE[key]) != null ? _FURN_ART_SIZE$key : [72, 66];
          var scaleX = rot === 2 || rot === 3 ? -1 : 1;
          return {
            key,
            w,
            h,
            scaleX
          };
        }

        _buildUI() {
          this._panel = this._uiNode('IndoorPanel', this.node);

          this._panel.addComponent(UITransform).setContentSize(1280, 720);

          var bg = this._panel.addComponent(Graphics);

          bg.fillColor = new Color(34, 28, 24, 228);
          bg.rect(-640, -360, 1280, 720);
          bg.fill();

          this._buildRoomView();

          this._buildKitchenView();
        }

        _buildRoomView() {
          this._roomView = this._uiNode('RoomFrame', this._panel);

          this._roomView.addComponent(UITransform).setContentSize(900, 640);

          var rg = this._roomView.addComponent(Graphics);

          rg.fillColor = new Color(242, 232, 210, 255);
          rg.strokeColor = new Color(118, 82, 52, 255);
          rg.lineWidth = 4;
          rg.roundRect(-450, -320, 900, 640, 18);
          rg.fill();
          rg.stroke();

          var roomBg = this._uiNode('RoomBg', this._roomView);

          roomBg.setPosition(0, -14, 0);
          (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
            error: Error()
          }), ArtLoader) : ArtLoader).applySprite(roomBg, 'bg_indoor_room', 836, 468);

          var hNode = this._uiNode('Header', this._roomView);

          hNode.setPosition(-212, 282, 0);
          this._headerLbl = hNode.addComponent(Label);
          this._headerLbl.fontSize = 21;
          this._headerLbl.color = new Color(46, 36, 28, 255);

          var mNode = this._uiNode('Msg', this._roomView);

          mNode.setPosition(-186, 250, 0);
          this._msgLbl = mNode.addComponent(Label);
          this._msgLbl.fontSize = 14;
          this._msgLbl.color = new Color(120, 76, 44, 255);

          var bagBtn = this._makeBtn('装扮背包', 124, 40, new Color(186, 118, 48, 250), () => this._openBagModal());

          bagBtn.parent = this._roomView;
          bagBtn.setPosition(126, 272, 0);
          this._bagBtnLbl = bagBtn.getChildByName('Lbl').getComponent(Label);

          var sleepBtn = this._makeBtn('休息过夜', 110, 40, new Color(36, 126, 116, 250), () => this._sleep());

          sleepBtn.parent = this._roomView;
          sleepBtn.setPosition(254, 272, 0);

          var exitBtn = this._makeBtn('出门回院', 106, 40, new Color(148, 88, 62, 245), () => this.close());

          exitBtn.parent = this._roomView;
          exitBtn.setPosition(372, 272, 0); // 8×5 地板交互层（统一承接拖拽与点击，手势丝滑不丢事件）

          this._gridRoot = this._uiNode('GridRoot', this._roomView);

          this._gridRoot.setPosition(0, -100, 0);

          var gridUt = this._gridRoot.addComponent(UITransform);

          gridUt.setContentSize(GRID_COLS * CELL_W, GRID_ROWS * CELL_H);
          this._dragHoverGfx = this._uiNode('DragHoverGfx', this._roomView).addComponent(Graphics);

          this._dragHoverGfx.node.setPosition(0, -100, 0);

          this._dragGhost = this._uiNode('DragGhost', this._roomView);
          this._dragGhost.active = false;

          this._gridRoot.on(Node.EventType.TOUCH_START, this._onFloorTouchStart, this);

          this._gridRoot.on(Node.EventType.TOUCH_MOVE, this._onFloorTouchMove, this);

          this._gridRoot.on(Node.EventType.TOUCH_END, this._onFloorTouchEnd, this);

          this._gridRoot.on(Node.EventType.TOUCH_CANCEL, this._onFloorTouchEnd, this); // 选中家具底部浮条（旋转4向 / 收进背包 / 取消 — 移动直接拖拽即可！）


          this._actionBar = this._uiNode('FurnActionBar', this._roomView);

          this._actionBar.setPosition(0, -278, 0);

          var abg = this._actionBar.addComponent(Graphics);

          abg.fillColor = new Color(46, 36, 28, 238);
          abg.strokeColor = new Color(216, 182, 112, 240);
          abg.lineWidth = 2;
          abg.roundRect(-385, -26, 770, 52, 14);
          abg.fill();
          abg.stroke();
          this._actionTitleLbl = this._uiNode('ActTitle', this._actionBar).addComponent(Label);

          this._actionTitleLbl.node.setPosition(-278, 0, 0);

          this._actionTitleLbl.fontSize = 14;
          this._actionTitleLbl.color = new Color(252, 240, 212, 255);

          var rotLeftBtn = this._makeBtn('左转 -30°', 92, 36, new Color(184, 122, 48, 250), () => this._stepAngle(30));

          rotLeftBtn.parent = this._actionBar;
          rotLeftBtn.setPosition(-122, 0, 0);

          var rotRightBtn = this._makeBtn('右转 +30°', 92, 36, new Color(184, 122, 48, 250), () => this._stepAngle(-30));

          rotRightBtn.parent = this._actionBar;
          rotRightBtn.setPosition(-20, 0, 0);

          var viewBtn = this._makeBtn('换正/侧面', 96, 36, new Color(76, 122, 134, 250), () => this._rotateSelected());

          viewBtn.parent = this._actionBar;
          viewBtn.setPosition(84, 0, 0);

          var storeBtn = this._makeBtn('收进背包', 90, 36, new Color(168, 76, 58, 250), () => this._storeSelected());

          storeBtn.parent = this._actionBar;
          storeBtn.setPosition(188, 0, 0);

          var cancelBtn = this._makeBtn('完成', 64, 36, new Color(36, 126, 116, 245), () => this._clearSelection());

          cancelBtn.parent = this._actionBar;
          cancelBtn.setPosition(276, 0, 0);
          this._actionBar.active = false;

          this._buildBagModal();
        }

        _touchToCell(e) {
          var loc = e.getUILocation();

          var ut = this._gridRoot.getComponent(UITransform);

          if (!ut) return null;
          var local = ut.convertToNodeSpaceAR(new Vec3(loc.x, loc.y, 0));
          var startX = -((GRID_COLS - 1) * CELL_W) / 2;
          var startY = (GRID_ROWS - 1) * CELL_H / 2;
          var gx = Math.round((local.x - startX) / CELL_W);
          var gy = Math.round((startY - local.y) / CELL_H);
          if (gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS) return null;
          return {
            gx,
            gy,
            localX: local.x,
            localY: local.y
          };
        }

        _onFloorTouchStart(e) {
          var app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready) || this._bagModal.active) return;

          var hit = this._touchToCell(e);

          if (!hit) return;
          var existing = app.saveData.indoor.furniture.find(f => f.gx === hit.gx && f.gy === hit.gy);

          this._dragStartLocal.set(hit.localX, hit.localY, 0);

          this._isDragging = false;
          this._hoverCell = {
            gx: hit.gx,
            gy: hit.gy
          };

          if (existing) {
            this._dragUid = existing.uid;
          } else {
            this._dragUid = null;
          }
        }

        _onFloorTouchMove(e) {
          var app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready) || !this._dragUid) return;
          var loc = e.getUILocation();

          var ut = this._gridRoot.getComponent(UITransform);

          if (!ut) return;
          var local = ut.convertToNodeSpaceAR(new Vec3(loc.x, loc.y, 0));

          if (!this._isDragging && Math.hypot(local.x - this._dragStartLocal.x, local.y - this._dragStartLocal.y) > 8) {
            this._isDragging = true;
            this._placingFurnId = null;
            this._selectedUid = this._dragUid;
            var item = app.saveData.indoor.furniture.find(f => f.uid === this._dragUid);

            if (item) {
              var _item$angleDeg;

              var {
                key,
                w,
                h,
                scaleX
              } = this._resolveArtAndScale(item.furnitureId, this._getRot(item));

              this._dragGhost.removeAllChildren();

              this._dragGhost.active = true;

              this._dragGhost.setScale(scaleX * 1.06, 1.06, 1);

              this._dragGhost.angle = (_item$angleDeg = item.angleDeg) != null ? _item$angleDeg : 0;
              (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
                error: Error()
              }), ArtLoader) : ArtLoader).applySprite(this._dragGhost, key, w, h);

              this._dragGhost.setSiblingIndex(this._roomView.children.length - 1);
            }
          }

          if (this._isDragging) {
            this._dragGhost.setPosition(local.x, local.y - 82, 0);

            var hit = this._touchToCell(e);

            this._hoverCell = hit ? {
              gx: hit.gx,
              gy: hit.gy
            } : null;

            this._drawDragHover();
          }
        }

        _drawDragHover() {
          var g = this._dragHoverGfx;
          g.clear();
          var app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!this._isDragging || !this._hoverCell || !(app != null && app.ready)) return;
          var {
            gx,
            gy
          } = this._hoverCell;
          var occupied = app.saveData.indoor.furniture.some(f => f.gx === gx && f.gy === gy && f.uid !== this._dragUid);
          var startX = -((GRID_COLS - 1) * CELL_W) / 2;
          var startY = (GRID_ROWS - 1) * CELL_H / 2;
          var cx = startX + gx * CELL_W;
          var cy = startY - gy * CELL_H;
          g.fillColor = occupied ? new Color(224, 82, 62, 110) : new Color(92, 232, 198, 120);
          g.strokeColor = occupied ? new Color(240, 96, 76, 235) : new Color(246, 224, 152, 240);
          g.lineWidth = 2.4;
          g.roundRect(cx - (CELL_W - 8) / 2, cy - (CELL_H - 6) / 2, CELL_W - 8, CELL_H - 6, 7);
          g.fill();
          g.stroke();
        }

        _onFloorTouchEnd(e) {
          var app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready) || this._bagModal.active) return;

          if (this._isDragging && this._dragUid) {
            var dragItem = app.saveData.indoor.furniture.find(f => f.uid === this._dragUid);
            var targetCell = this._hoverCell;
            this._isDragging = false;
            this._dragGhost.active = false;

            this._dragHoverGfx.clear();

            if (dragItem && targetCell) {
              var occupied = app.saveData.indoor.furniture.some(f => f.gx === targetCell.gx && f.gy === targetCell.gy && f.uid !== dragItem.uid);

              if (!occupied && (dragItem.gx !== targetCell.gx || dragItem.gy !== targetCell.gy)) {
                var _def$name;

                dragItem.gx = targetCell.gx;
                dragItem.gy = targetCell.gy;
                app.persist('indoor_drag_move');
                (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
                  error: Error()
                }), AudioManager) : AudioManager).inst.playSfx('harvest');
                var def = FURNITURE_CATALOG.find(c => c.id === dragItem.furnitureId);
                this._msgLbl.string = "\u5DF2\u5C06\u300C" + ((_def$name = def == null ? void 0 : def.name) != null ? _def$name : '摆件') + "\u300D\u62D6\u62FD\u6446\u653E\u81F3\u65B0\u4F4D\u7F6E";
              }
            }

            this._dragUid = null;
            this._hoverCell = null;

            this._refreshRoomView();

            return;
          } // 未发生拖拽 → 当作普通点击处理


          this._dragUid = null;
          this._dragGhost.active = false;

          this._dragHoverGfx.clear();

          var hit = this._touchToCell(e);

          if (hit) this._onCellTap(hit.gx, hit.gy);
        }

        _buildBagModal() {
          this._bagModal = this._uiNode('DecorBagModal', this._roomView);

          this._bagModal.addComponent(UITransform).setContentSize(900, 640);

          var mask = this._bagModal.addComponent(Graphics);

          mask.fillColor = new Color(24, 20, 16, 155);
          mask.roundRect(-450, -320, 900, 640, 18);
          mask.fill();

          var card = this._uiNode('BagCard', this._bagModal);

          card.addComponent(UITransform).setContentSize(640, 440);
          var cg = card.addComponent(Graphics);
          cg.fillColor = new Color(248, 240, 222, 255);
          cg.strokeColor = new Color(132, 92, 58, 255);
          cg.lineWidth = 3.5;
          cg.roundRect(-320, -220, 640, 440, 16);
          cg.fill();
          cg.stroke();

          var title = this._uiNode('BagTitle', card).addComponent(Label);

          title.node.setPosition(-120, 182, 0);
          title.string = '装扮背包 · 点选摆件放入雅居';
          title.fontSize = 20;
          title.color = new Color(46, 36, 28, 255);

          var closeBag = this._makeBtn('关闭背包', 110, 36, new Color(138, 92, 62, 245), () => {
            this._bagModal.active = false;
          });

          closeBag.parent = card;
          closeBag.setPosition(236, 182, 0);
          this._bagGrid = this._uiNode('BagGrid', card);

          this._bagGrid.setPosition(0, -14, 0);

          this._bagModal.active = false;
        }

        _openBagModal() {
          this._selectedUid = null;
          this._actionBar.active = false;

          this._rebuildBagGrid();

          this._bagModal.active = true;

          this._bagModal.setSiblingIndex(this._roomView.children.length - 1);
        }

        _rebuildBagGrid() {
          var app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return;

          this._bagGrid.removeAllChildren();

          var owned = FURNITURE_CATALOG.filter(f => {
            var _app$saveData$invento;

            return ((_app$saveData$invento = app.saveData.inventory[f.id]) != null ? _app$saveData$invento : 0) > 0;
          });

          if (owned.length === 0) {
            var tip = this._uiNode('EmptyTip', this._bagGrid).addComponent(Label);

            tip.string = '背包里暂时没有闲置摆件\n可去南岸码头找阿棠选购国风家具，或点击房间里的摆件收进背包';
            tip.fontSize = 16;
            tip.lineHeight = 24;
            tip.color = new Color(118, 92, 68, 255);
            return;
          }

          var cols = 3;
          var cardW = 180;
          var cardH = 148;
          var gapX = 18;
          var gapY = 18;
          owned.forEach((f, idx) => {
            var _app$saveData$invento2, _FURN_ART_SIZE$f$id;

            var count = (_app$saveData$invento2 = app.saveData.inventory[f.id]) != null ? _app$saveData$invento2 : 0;
            var col = idx % cols;
            var row = Math.floor(idx / cols);
            var cx = (col - 1) * (cardW + gapX);
            var cy = 78 - row * (cardH + gapY);

            var itemCard = this._uiNode("BagItem_" + f.id, this._bagGrid);

            itemCard.addComponent(UITransform).setContentSize(cardW, cardH);
            itemCard.setPosition(cx, cy, 0);
            var g = itemCard.addComponent(Graphics);
            g.fillColor = new Color(240, 229, 206, 255);
            g.strokeColor = new Color(156, 118, 82, 235);
            g.lineWidth = 2;
            g.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
            g.fill();
            g.stroke();

            var icon = this._uiNode('Icon', itemCard);

            icon.setPosition(0, 18, 0);
            var [fw, fh] = (_FURN_ART_SIZE$f$id = FURN_ART_SIZE[f.id]) != null ? _FURN_ART_SIZE$f$id : [72, 66];
            (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
              error: Error()
            }), ArtLoader) : ArtLoader).applySprite(icon, f.id, fw * 0.92, fh * 0.92);

            var nameLbl = this._uiNode('Name', itemCard).addComponent(Label);

            nameLbl.node.setPosition(0, -34, 0);
            nameLbl.string = f.name + " \xD7" + count;
            nameLbl.fontSize = 14;
            nameLbl.color = new Color(42, 34, 26, 255);

            var subLbl = this._uiNode('Sub', itemCard).addComponent(Label);

            subLbl.node.setPosition(0, -54, 0);
            subLbl.string = "\u8212\u5FC3 +" + f.comfort + " \xB7 \u70B9\u51FB\u6446\u653E";
            subLbl.fontSize = 12;
            subLbl.color = new Color(46, 118, 102, 240);
            itemCard.on(Node.EventType.TOUCH_END, () => {
              (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
                error: Error()
              }), AudioManager) : AudioManager).inst.playSfx('tap');
              this._placingFurnId = f.id;
              this._selectedUid = null;
              this._bagModal.active = false;
              this._msgLbl.string = "\u6446\u653E\u6A21\u5F0F\uFF1A\u70B9\u9009\u6728\u5730\u677F\u9AD8\u4EAE\u7A7A\u4F4D\u653E\u7F6E\u300C" + f.name + "\u300D\uFF0C\u6446\u5B8C\u540E\u53EF\u76F4\u63A5\u6309\u4F4F\u62D6\u62FD\u79FB\u52A8";

              this._refreshRoomView();
            });
          });
        }

        _buildKitchenView() {
          this._kitchenView = this._uiNode('KitchenFrame', this._panel);

          this._kitchenView.addComponent(UITransform).setContentSize(640, 560);

          var g = this._kitchenView.addComponent(Graphics);

          g.fillColor = new Color(248, 239, 220, 255);
          g.strokeColor = new Color(156, 98, 56, 255);
          g.lineWidth = 4;
          g.roundRect(-320, -280, 640, 560, 18);
          g.fill();
          g.stroke();
          g.fillColor = new Color(196, 102, 54, 42);
          g.roundRect(-296, 178, 592, 82, 12);
          g.fill();

          var title = this._uiNode('KTitle', this._kitchenView).addComponent(Label);

          title.node.setPosition(-96, 232, 0);
          title.string = '室外灶棚 · 暖火灵膳';
          title.fontSize = 24;
          title.color = new Color(56, 36, 24, 255);

          var stockNode = this._uiNode('KStock', this._kitchenView);

          stockNode.setPosition(-70, 196, 0);
          this._kStockLbl = stockNode.addComponent(Label);
          this._kStockLbl.fontSize = 15;
          this._kStockLbl.color = new Color(128, 72, 38, 255);

          var closeBtn = this._makeBtn('离开灶棚', 118, 44, new Color(148, 88, 62, 245), () => this.close());

          closeBtn.parent = this._kitchenView;
          closeBtn.setPosition(224, 218, 0);

          var msgNode = this._uiNode('KMsg', this._kitchenView);

          msgNode.setPosition(0, -238, 0);
          this._kMsgLbl = msgNode.addComponent(Label);
          this._kMsgLbl.fontSize = 15;
          this._kMsgLbl.color = new Color(46, 108, 92, 255);
          var recipes = [{
            name: '清炒青露菜',
            desc: '消耗 青露菜×1  →  农田灵气 +6',
            fn: () => this._cookPlant('spring_greens', '清炒青露菜', 6)
          }, {
            name: '寒溪鲜鱼汤',
            desc: '消耗 上游寒溪鱼×1  →  地牢翻滚灵膳（移速与手感增益）',
            fn: () => this._cookSegmentFish('upstream_brook', 'dish_brook_soup', '寒溪鲜鱼汤')
          }, {
            name: '荷塘秘制诱饵',
            desc: '消耗 灵泉荷塘鱼×1  →  封印防线诱敌鱼饵',
            fn: () => this._cookSegmentFish('midstream_lotus', 'bait_lotus', '荷塘秘制诱饵')
          }, {
            name: '海口灵力羹',
            desc: '消耗 下游入海口鱼×1  →  地牢激光减耗蓝灵膳',
            fn: () => this._cookSegmentFish('downstream_estuary', 'dish_estuary_soup', '海口灵力羹')
          }];
          recipes.forEach((r, idx) => {
            var btn = this._makeBtn(r.name + "\n" + r.desc, 540, 76, new Color(64, 118, 104, 245), r.fn);

            btn.parent = this._kitchenView;
            btn.setPosition(0, 116 - idx * 92, 0);
          });
        }

        _makeBtn(text, w, h, color, onTap) {
          var n = new Node("Btn_" + text.slice(0, 6));
          n.layer = Layers.Enum.UI_2D;
          n.addComponent(UITransform).setContentSize(w, h);
          var g = n.addComponent(Graphics);
          g.fillColor = color;
          g.roundRect(-w / 2, -h / 2, w, h, 10);
          g.fill();

          var l = this._uiNode('Lbl', n).addComponent(Label);

          l.string = text;
          l.fontSize = 14;
          l.lineHeight = 19;
          l.color = Color.WHITE;
          n.on(Node.EventType.TOUCH_END, onTap);
          return n;
        }

        open(onToast, focusMode) {
          if (focusMode === void 0) {
            focusMode = 'room';
          }

          this._onToast = onToast != null ? onToast : null;
          this._open = true;
          this._panel.active = true;

          this._panel.setSiblingIndex(this.node.children.length - 1);

          this._placingFurnId = null;
          this._selectedUid = null;
          this._dragUid = null;
          this._isDragging = false;
          this._dragGhost.active = false;

          this._dragHoverGfx.clear();

          this._bagModal.active = false;
          this._actionBar.active = false;
          this._roomView.active = focusMode === 'room';
          this._kitchenView.active = focusMode === 'kitchen';

          if (focusMode === 'kitchen') {
            this._kMsgLbl.string = '炉火正旺，点选上方食谱即可开火下厨';

            this._refreshKitchenStock();
          } else {
            this._msgLbl.string = '按住任意摆件可直接拖拽移动；轻点摆件可 360° 多角度旋转、切换正侧面或收进背包';

            this._refreshRoomView();
          }
        }

        close() {
          this._open = false;
          this._panel.active = false;
          this._bagModal.active = false;
          this._dragGhost.active = false;

          this._dragHoverGfx.clear();
        }

        _clearSelection() {
          this._selectedUid = null;
          this._placingFurnId = null;
          this._actionBar.active = false;
          this._msgLbl.string = '按住任意摆件可直接拖拽移动；轻点摆件可 360° 多角度旋转、切换正侧面或收进背包';

          this._refreshRoomView();
        }

        _stepAngle(deltaDeg) {
          var _item$angleDeg2, _def$name2;

          var app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready) || !this._selectedUid) return;
          var item = app.saveData.indoor.furniture.find(f => f.uid === this._selectedUid);
          if (!item) return;
          var next = ((((_item$angleDeg2 = item.angleDeg) != null ? _item$angleDeg2 : 0) + deltaDeg) % 360 + 360) % 360;
          item.angleDeg = next;
          app.persist('indoor_angle');
          (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
            error: Error()
          }), AudioManager) : AudioManager).inst.playSfx('tap');
          var def = FURNITURE_CATALOG.find(c => c.id === item.furnitureId);
          this._msgLbl.string = "\u5DF2\u5C06\u300C" + ((_def$name2 = def == null ? void 0 : def.name) != null ? _def$name2 : '摆件') + "\u300D\u65CB\u8F6C\u81F3 " + next + "\xB0\uFF08\u652F\u6301 360\xB0 \u591A\u89D2\u5EA6\u5FAE\u8C03\uFF09";

          this._refreshRoomView();
        }

        _rotateSelected() {
          var _def$name3;

          var app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready) || !this._selectedUid) return;
          var item = app.saveData.indoor.furniture.find(f => f.uid === this._selectedUid);
          if (!item) return;
          var nextRot = (this._getRot(item) + 1) % 4;
          item.rot = nextRot;
          item.flipX = nextRot === 2 || nextRot === 3;
          app.persist('indoor_rotate');
          (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
            error: Error()
          }), AudioManager) : AudioManager).inst.playSfx('tap');
          var def = FURNITURE_CATALOG.find(c => c.id === item.furnitureId);
          this._msgLbl.string = "\u5DF2\u5C06\u300C" + ((_def$name3 = def == null ? void 0 : def.name) != null ? _def$name3 : '摆件') + "\u300D\u65CB\u8F6C\u81F3\uFF1A" + DIR_LABELS[nextRot];

          this._refreshRoomView();
        }

        _storeSelected() {
          var _def$name4;

          var app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready) || !this._selectedUid) return;
          var idx = app.saveData.indoor.furniture.findIndex(f => f.uid === this._selectedUid);
          if (idx < 0) return;
          var item = app.saveData.indoor.furniture[idx];
          app.saveData.indoor.furniture.splice(idx, 1);
          app.addItem(item.furnitureId, 1);
          app.persist('indoor_remove');
          (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
            error: Error()
          }), AudioManager) : AudioManager).inst.playSfx('tap');
          var def = FURNITURE_CATALOG.find(c => c.id === item.furnitureId);
          this._selectedUid = null;
          this._actionBar.active = false;
          this._msgLbl.string = "\u5DF2\u5C06\u300C" + ((_def$name4 = def == null ? void 0 : def.name) != null ? _def$name4 : '摆件') + "\u300D\u6536\u8FDB\u88C5\u626E\u80CC\u5305";

          this._refreshRoomView();
        }

        _refreshKitchenStock() {
          var _app$saveData$invento3;

          var app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return;
          var greens = (_app$saveData$invento3 = app.saveData.inventory['spring_greens']) != null ? _app$saveData$invento3 : 0;
          var fishTotal = 0;

          for (var key of Object.keys(app.saveData.inventory)) {
            var _app$saveData$invento4;

            var cnt = (_app$saveData$invento4 = app.saveData.inventory[key]) != null ? _app$saveData$invento4 : 0;
            if (cnt > 0 && (_crd && DataManager === void 0 ? (_reportPossibleCrUseOfDataManager({
              error: Error()
            }), DataManager) : DataManager).inst.getFish(key)) fishTotal += cnt;
          }

          this._kStockLbl.string = "\u5F53\u524D\u5E93\u5B58\uFF1A\u9752\u9732\u83DC \xD7" + greens + " \xB7 \u9C9C\u9C7C \xD7" + fishTotal + " \xB7 \u519C\u7530\u7075\u6C14 " + app.saveData.farm.auraScore;
        }

        _refreshRoomView() {
          var app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return;
          var comfort = 0;

          var _loop = function _loop(f) {
            var def = FURNITURE_CATALOG.find(c => c.id === f.furnitureId);
            if (def) comfort += def.comfort;
          };

          for (var f of app.saveData.indoor.furniture) {
            _loop(f);
          }

          app.saveData.indoor.comfortScore = comfort;
          var blessing = comfort >= 25 ? '已激活晨起祝福' : '舒心25激活祝福';
          this._headerLbl.string = "\u4E3B\u89D2\u96C5\u5C45 \xB7 \u8212\u5FC3\u5EA6 " + comfort + "\uFF08" + blessing + "\uFF09";
          var totalBag = 0;

          for (var _f of FURNITURE_CATALOG) {
            var _app$saveData$invento5;

            totalBag += (_app$saveData$invento5 = app.saveData.inventory[_f.id]) != null ? _app$saveData$invento5 : 0;
          }

          this._bagBtnLbl.string = totalBag > 0 ? "\u88C5\u626E\u80CC\u5305(" + totalBag + ")" : '装扮背包';

          if (this._selectedUid) {
            var sel = app.saveData.indoor.furniture.find(f => f.uid === this._selectedUid);

            if (sel) {
              var _def$name5, _sel$angleDeg;

              var def = FURNITURE_CATALOG.find(c => c.id === sel.furnitureId);
              this._actionTitleLbl.string = ((_def$name5 = def == null ? void 0 : def.name) != null ? _def$name5 : '摆件') + " " + ((_sel$angleDeg = sel.angleDeg) != null ? _sel$angleDeg : 0) + "\xB0";
              this._actionBar.active = true;
            } else {
              this._selectedUid = null;
              this._actionBar.active = false;
            }
          } else {
            this._actionBar.active = false;
          }

          this._rebuildGrid();
        }

        _rebuildGrid() {
          var _this = this;

          var app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return;

          this._gridRoot.removeAllChildren();

          var startX = -((GRID_COLS - 1) * CELL_W) / 2;
          var startY = (GRID_ROWS - 1) * CELL_H / 2;
          var showDropGuides = !!this._placingFurnId;

          var _loop2 = function _loop2(gy) {
            var _loop3 = function _loop3(gx) {
              var cell = _this._uiNode("Cell_" + gx + "_" + gy, _this._gridRoot);

              cell.setPosition(startX + gx * CELL_W, startY - gy * CELL_H, 0);
              var placed = app.saveData.indoor.furniture.find(f => f.gx === gx && f.gy === gy);
              var def = placed ? FURNITURE_CATALOG.find(c => c.id === placed.furnitureId) : null;
              var isSelected = !!placed && placed.uid === _this._selectedUid;
              var g = cell.addComponent(Graphics);

              if (showDropGuides && !def) {
                g.fillColor = new Color(255, 248, 224, 62);
                g.strokeColor = new Color(246, 224, 162, 145);
                g.lineWidth = 1.5;
                g.roundRect(-(CELL_W - 10) / 2, -(CELL_H - 8) / 2, CELL_W - 10, CELL_H - 8, 6);
                g.fill();
                g.stroke();
              }

              if (def && placed) {
                var _placed$angleDeg;

                if (isSelected) {
                  g.strokeColor = new Color(92, 232, 212, 240);
                  g.fillColor = new Color(92, 232, 212, 55);
                  g.lineWidth = 2.6;
                  g.ellipse(0, -10, 38, 15);
                  g.fill();
                  g.stroke();
                }

                g.fillColor = new Color(56, 32, 14, 78);
                g.ellipse(0, -10, 32, 11);
                g.fill();

                var {
                  key,
                  w,
                  h,
                  scaleX
                } = _this._resolveArtAndScale(def.id, _this._getRot(placed));

                var artHolder = _this._uiNode('FurnArt', cell);

                artHolder.setPosition(0, 18, 0);
                artHolder.setScale(scaleX, 1, 1);
                artHolder.angle = (_placed$angleDeg = placed.angleDeg) != null ? _placed$angleDeg : 0;
                (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
                  error: Error()
                }), ArtLoader) : ArtLoader).applySprite(artHolder, key, w, h);
              }
            };

            for (var gx = 0; gx < GRID_COLS; gx++) {
              _loop3(gx);
            }
          };

          for (var gy = 0; gy < GRID_ROWS; gy++) {
            _loop2(gy);
          }
        }

        _onCellTap(gx, gy) {
          var app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return;
          var existing = app.saveData.indoor.furniture.find(f => f.gx === gx && f.gy === gy);

          if (existing) {
            var _def$name6;

            this._placingFurnId = null;
            this._selectedUid = existing.uid === this._selectedUid ? null : existing.uid;
            (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
              error: Error()
            }), AudioManager) : AudioManager).inst.playSfx('tap');
            var def = FURNITURE_CATALOG.find(c => c.id === existing.furnitureId);
            this._msgLbl.string = this._selectedUid ? "\u5DF2\u9009\u4E2D\u300C" + ((_def$name6 = def == null ? void 0 : def.name) != null ? _def$name6 : '摆件') + "\u300D\uFF1A\u53EF\u76F4\u63A5\u6309\u4F4F\u62D6\u62FD\u6362\u4F4D\uFF0C\u6216\u5728\u4E0B\u65B9 4 \u671D\u5411\u65CB\u8F6C/\u6536\u8D77" : '已取消选中';

            this._refreshRoomView();

            return;
          }

          if (this._placingFurnId) {
            var _app$saveData$invento6, _app$saveData$invento7;

            if (((_app$saveData$invento6 = app.saveData.inventory[this._placingFurnId]) != null ? _app$saveData$invento6 : 0) <= 0) {
              this._placingFurnId = null;
              this._msgLbl.string = '该摆件已摆完，可点右上角「装扮背包」继续挑选';

              this._refreshRoomView();

              return;
            }

            var uid = "f_" + Date.now() + "_" + gx + "_" + gy;
            app.addItem(this._placingFurnId, -1);
            app.saveData.indoor.furniture.push({
              uid,
              furnitureId: this._placingFurnId,
              gx,
              gy,
              rot: 0
            });
            app.persist('indoor_place');
            (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
              error: Error()
            }), AudioManager) : AudioManager).inst.playSfx('harvest');
            var left = (_app$saveData$invento7 = app.saveData.inventory[this._placingFurnId]) != null ? _app$saveData$invento7 : 0;
            var placedDef = FURNITURE_CATALOG.find(c => c.id === this._placingFurnId);

            if (left <= 0) {
              var _placedDef$name;

              this._placingFurnId = null;
              this._selectedUid = uid;
              this._msgLbl.string = "\u300C" + ((_placedDef$name = placedDef == null ? void 0 : placedDef.name) != null ? _placedDef$name : '摆件') + "\u300D\u6446\u653E\u5B8C\u6210\uFF01\u53EF\u6309\u4F4F\u62D6\u62FD\u6216\u5728\u4E0B\u65B9 4 \u671D\u5411\u65CB\u8F6C";
            } else {
              var _placedDef$name2;

              this._msgLbl.string = "\u6446\u653E\u6210\u529F\uFF01\u80CC\u5305\u8FD8\u5269 " + left + " \u4EF6\u300C" + ((_placedDef$name2 = placedDef == null ? void 0 : placedDef.name) != null ? _placedDef$name2 : '') + "\u300D\uFF0C\u53EF\u7EE7\u7EED\u70B9\u51FB\u7A7A\u4F4D\u6446\u653E";
            }

            this._refreshRoomView();

            return;
          }

          if (this._selectedUid) {
            this._clearSelection();
          }
        }

        _cookPlant(plantId, dishName, auraGain) {
          var _app$saveData$invento8;

          var app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return;

          if (((_app$saveData$invento8 = app.saveData.inventory[plantId]) != null ? _app$saveData$invento8 : 0) <= 0) {
            this._kMsgLbl.string = '食材不足：需要先收获「青露菜」×1';
            return;
          }

          app.addItem(plantId, -1);
          app.saveData.farm.auraScore += auraGain;
          app.persist('cook_plant');
          this._kMsgLbl.string = "\u70F9\u6210\u3010" + dishName + "\u3011\u5E76\u4EAB\u7528\uFF0C\u519C\u7530\u7075\u6C14 +" + auraGain + "\uFF01";

          this._refreshKitchenStock();
        }

        _cookSegmentFish(segment, outItemId, dishName) {
          var app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return;
          var pool = (_crd && DataManager === void 0 ? (_reportPossibleCrUseOfDataManager({
            error: Error()
          }), DataManager) : DataManager).inst.queryFishPool(segment, 'spring', 'sunny', 'lichun');
          var matchedFishId = null;

          for (var key of Object.keys(app.saveData.inventory)) {
            var _app$saveData$invento9;

            if (((_app$saveData$invento9 = app.saveData.inventory[key]) != null ? _app$saveData$invento9 : 0) <= 0) continue;
            var f = (_crd && DataManager === void 0 ? (_reportPossibleCrUseOfDataManager({
              error: Error()
            }), DataManager) : DataManager).inst.getFish(key);

            if (f && f.riverSegments.includes(segment)) {
              matchedFishId = f.id;
              break;
            }
          }

          if (!matchedFishId) {
            var _pool$0$name, _pool$;

            this._kMsgLbl.string = "\u98DF\u6750\u4E0D\u8DB3\uFF1A\u8BF7\u5148\u53BB\u5BF9\u5E94\u6C34\u57DF\u9493\u8D77\u4E00\u6761\u9C9C\u9C7C\uFF08\u5982 " + ((_pool$0$name = (_pool$ = pool[0]) == null ? void 0 : _pool$.name) != null ? _pool$0$name : '河鱼') + "\uFF09";
            return;
          }

          app.addItem(matchedFishId, -1);
          app.addItem(outItemId, 1);
          app.persist('cook_fish');
          this._kMsgLbl.string = "\u70F9\u5236\u6210\u529F\uFF01\u83B7\u5F97\u3010" + dishName + "\u3011\xD71\uFF0C\u5DF2\u5B58\u5165\u80CC\u5305\u5907\u7528";

          this._refreshKitchenStock();
        }

        _sleep() {
          var _this$_onToast;

          var app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return;
          app.endDayAndSave();
          var comfort = app.saveData.indoor.comfortScore;
          var msg = comfort >= 25 ? '一夜安眠！晨起舒心祝福已生效（钓鱼绿色浮标加宽）' : '一夜安眠，新的一天开始了！';
          (_this$_onToast = this._onToast) == null || _this$_onToast.call(this, msg);
          this.close();
        }

      }, _class2._inst = null, _class2)) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=27dffa252fccd1c039adac877184cc361a83c6c3.js.map