System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Color, Component, Graphics, Label, Layers, Node, Sprite, UITransform, ArtLoader, AudioManager, GameApp, _dec, _class, _class2, _crd, ccclass, DEFENSE_TOOLS, NIGHT_EVENTS, COLS, ROWS, CELL_W, CELL_H, ORIGIN_X, ORIGIN_Y, TOTAL_WAVES, DefenseOverlay;

  function _reportPossibleCrUseOfArtLoader(extras) {
    _reporterNs.report("ArtLoader", "../core/ArtLoader", _context.meta, extras);
  }

  function _reportPossibleCrUseOfAudioManager(extras) {
    _reporterNs.report("AudioManager", "../core/AudioManager", _context.meta, extras);
  }

  function _reportPossibleCrUseOfGameApp(extras) {
    _reporterNs.report("GameApp", "../app/GameApp", _context.meta, extras);
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
      Sprite = _cc.Sprite;
      UITransform = _cc.UITransform;
    }, function (_unresolved_2) {
      ArtLoader = _unresolved_2.ArtLoader;
    }, function (_unresolved_3) {
      AudioManager = _unresolved_3.AudioManager;
    }, function (_unresolved_4) {
      GameApp = _unresolved_4.GameApp;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "7e59dNgmjJPnIeyTF502alU", "DefenseOverlay", undefined);
      /**
       * 《异界小农场 2.0》阶段 4 正式版：5×9 国风多路分道进化版塔防（常驻经营 + 局内灵气救急）
       * - 5 行 × 9 列舒展分道棋盘：中路（第 2 行）为「碧玉灵渠」水路行，须先种「聚水荷」底座再叠种陆地灵植。
       * - 垂直立体叠搭：「撑天竹」高台既可拦住「跃墙狸妖」，顶部又可叠放「穿云笋 / 引雷草」防空并越过青岩障碍！
       * - 跨行元素连携：「炎椒藤」点燃同行及上下相邻行射手的竹箭为灼烧火箭；「引雷草」遇水路/聚水荷触发 3 目标链式感电。
       * - 6 种脑洞异界怪物：偷菜竹精、重甲石傀、跃墙狸妖（翻矮墙但会被撑天竹拦下）、钻地土拨妖（潜行偷袭后排）、飞行墨灵、终波裂隙妖将。
       * - 常驻阵地 + 局内灵气救急：平时用金币/灵植永久建阵；交战中靠「谷雨灵茶」与击杀产灵气，随时空投临时雷火薯/铁壳冬瓜救场！
       */


      __checkObsolete__(['_decorator', 'Color', 'Component', 'Graphics', 'Label', 'Layers', 'Node', 'Sprite', 'SpriteFrame', 'UITransform']);

      ({
        ccclass
      } = _decorator);
      DEFENSE_TOOLS = [{
        id: 'iron_melon',
        name: '铁壳冬瓜',
        shortDesc: '高血肉盾扛线',
        costGold: 12,
        spiritCost: 25,
        maxHp: 380,
        color: [96, 128, 112]
      }, {
        id: 'sky_bamboo',
        name: '撑天竹',
        shortDesc: '拦翻墙+叠高台',
        costGold: 12,
        spiritCost: 25,
        maxHp: 240,
        color: [58, 162, 112]
      }, {
        id: 'cloud_bamboo_shoot',
        name: '穿云笋',
        shortDesc: '主力射手/叠防空',
        costGold: 16,
        spiritCost: 30,
        maxHp: 110,
        color: [96, 192, 92]
      }, {
        id: 'thunder_potato',
        name: '雷火薯',
        shortDesc: '宿根地雷/炸钻地',
        costGold: 14,
        spiritCost: 20,
        maxHp: 90,
        color: [226, 98, 46]
      }, {
        id: 'flame_pepper',
        name: '炎椒藤',
        shortDesc: '跨3行火箭催化',
        costGold: 16,
        spiritCost: 30,
        maxHp: 110,
        color: [204, 62, 52]
      }, {
        id: 'water_lotus',
        name: '聚水荷',
        shortDesc: '水路底座+导电',
        costGold: 12,
        spiritCost: 15,
        maxHp: 140,
        color: [62, 174, 196]
      }, {
        id: 'thunder_grass',
        name: '引雷草',
        shortDesc: '对空落雷/感电链',
        costGold: 22,
        spiritCost: 40,
        maxHp: 110,
        color: [148, 114, 214]
      }, {
        id: 'spirit_tea',
        name: '谷雨灵茶',
        shortDesc: '产灵气+四邻攻速',
        costGold: 18,
        spiritCost: 25,
        maxHp: 110,
        color: [142, 184, 78]
      }, {
        id: 'remove',
        name: '铲除',
        shortDesc: '免罚重摆防线',
        costGold: 0,
        spiritCost: 0,
        maxHp: 0,
        color: [118, 102, 90]
      }];
      NIGHT_EVENTS = [{
        id: 'thunder',
        title: '【春雷滚滚】',
        desc: '水路与引雷草感电伤害 +45%，但飞行墨灵移速 +20%'
      }, {
        id: 'burrow_tide',
        title: '【地脉震动】',
        desc: '钻地土拨妖增多，但雷火薯宿根再生缩短至 5 秒'
      }, {
        id: 'blood_moon',
        title: '【血月狂潮】',
        desc: '全怪物血量 +25%，但守胜金币与封印碎片奖励翻倍'
      }, {
        id: 'mist_rush',
        title: '【灵泉涌动】',
        desc: '谷雨灵茶产灵气翻倍，适合局内频繁空投救急灵植'
      }];
      COLS = 9;
      ROWS = 5;
      CELL_W = 84;
      CELL_H = 74;
      ORIGIN_X = -((COLS - 1) * CELL_W) / 2; // -336

      ORIGIN_Y = (ROWS - 1) * CELL_H / 2 + 12; // +160

      TOTAL_WAVES = 5;

      _export("DefenseOverlay", DefenseOverlay = (_dec = ccclass('DefenseOverlay'), _dec(_class = (_class2 = class DefenseOverlay extends Component {
        constructor(...args) {
          super(...args);
          this._panel = void 0;
          this._headerLbl = void 0;
          this._eventLbl = void 0;
          this._gridLayer = void 0;
          this._mobLayer = void 0;
          this._mobSprites = new Map();
          this._mobAnimFrames = {};
          this._animClock = 0;
          this._plantAnimNodes = [];
          this._fxGfx = void 0;
          this._toolBar = void 0;
          this._startWaveBtnLbl = void 0;
          this._reportNode = void 0;
          this._reportLbl = void 0;
          this._open = false;
          this._selectedTool = 'cloud_bamboo_shoot';
          this._inBattle = false;
          this._wave = 0;
          this._intermitTimer = 0;
          this._spiritEnergy = 45;
          this._terrain = new Map();
          this._nightEvent = NIGHT_EVENTS[0];
          this._runtimePlants = [];
          this._spawnQueue = [];
          this._spawnTimer = 0;
          this._nextMobId = 1;
          this._monsters = [];
          this._projectiles = [];
          this._fxLines = [];
          this._fxCircles = [];
          this._baitActiveTimer = 0;
          this._baitRow = 2;
          this._leakedGround = 0;
          this._leakedFlying = 0;
          this._leakedSpecial = 0;
          this._altarHpBattle = 100;
          this._onToast = null;
        }

        static get inst() {
          return this._inst;
        }

        get isOpen() {
          return this._open;
        }

        onLoad() {
          DefenseOverlay._inst = this;

          this._buildUI();

          this._preloadMobAnims();

          this._panel.active = false;
        }

        _preloadMobAnims() {
          const prefixes = ['mob_bamboo', 'mob_golem', 'mob_ink_fly', 'mob_leap_fox', 'mob_burrow_mole', 'mob_boss'];

          for (const pre of prefixes) {
            this._mobAnimFrames[pre] = [null, null, null, null];

            for (let i = 0; i < 4; i++) {
              void (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
                error: Error()
              }), ArtLoader) : ArtLoader).loadSpriteFrame(`${pre}_${i}`).then(sf => {
                if (sf) this._mobAnimFrames[pre][i] = sf;
              });
            }
          }
        }

        onDestroy() {
          if (DefenseOverlay._inst === this) DefenseOverlay._inst = null;
        }

        _uiNode(name, parent) {
          const n = new Node(name);
          n.layer = Layers.Enum.UI_2D;
          n.parent = parent;
          return n;
        }

        _key(gx, gy) {
          return `${gx},${gy}`;
        }

        _cellPos(gx, gy) {
          return {
            x: ORIGIN_X + gx * CELL_W,
            y: ORIGIN_Y - gy * CELL_H
          };
        }

        _buildUI() {
          this._panel = this._uiNode('DefensePanel', this.node);

          this._panel.addComponent(UITransform).setContentSize(1280, 720);

          const bg = this._panel.addComponent(Graphics);

          bg.fillColor = new Color(22, 34, 32, 248);
          bg.rect(-640, -360, 1280, 720);
          bg.fill(); // 5×9 分道防线大盆地

          const basin = this._uiNode('BasinBg', this._panel);

          const bg2 = basin.addComponent(Graphics);
          bg2.fillColor = new Color(224, 232, 220, 255);
          bg2.strokeColor = new Color(96, 134, 122, 255);
          bg2.lineWidth = 4;
          bg2.roundRect(-454, -186, 908, 398, 16);
          bg2.fill();
          bg2.stroke(); // 左侧异界裂隙 / 右侧封印祭坛

          bg2.fillColor = new Color(118, 66, 148, 228);
          bg2.roundRect(-446, -172, 54, 370, 10);
          bg2.fill();
          bg2.fillColor = new Color(36, 144, 132, 232);
          bg2.roundRect(392, -172, 54, 370, 10);
          bg2.fill();

          const riftL = this._uiNode('RiftLbl', basin).addComponent(Label);

          riftL.node.setPosition(-419, 12, 0);
          riftL.string = '异\n界\n裂\n隙';
          riftL.fontSize = 18;
          riftL.lineHeight = 30;
          riftL.color = Color.WHITE;

          const altarL = this._uiNode('AltarLbl', basin).addComponent(Label);

          altarL.node.setPosition(419, 12, 0);
          altarL.string = '封\n印\n祭\n坛';
          altarL.fontSize = 18;
          altarL.lineHeight = 30;
          altarL.color = Color.WHITE; // 顶部状态与随机事件

          const hNode = this._uiNode('DefHeader', this._panel);

          hNode.setPosition(-125, 322, 0);
          this._headerLbl = hNode.addComponent(Label);
          this._headerLbl.fontSize = 20;
          this._headerLbl.color = new Color(242, 246, 242, 255);

          const eNode = this._uiNode('DefEvent', this._panel);

          eNode.setPosition(-125, 284, 0);
          this._eventLbl = eNode.addComponent(Label);
          this._eventLbl.fontSize = 14;
          this._eventLbl.color = new Color(246, 214, 146, 255);

          const startBtn = this._makeBtn('开启 5 波夜袭', 152, 42, new Color(196, 74, 49, 248), () => this._startNightBattle());

          startBtn.parent = this._panel;
          startBtn.setPosition(340, 306, 0);
          this._startWaveBtnLbl = startBtn.getChildByName('Lbl').getComponent(Label);

          const baitBtn = this._makeBtn('放鱼饵', 92, 42, new Color(184, 134, 52, 245), () => this._dropBait());

          baitBtn.parent = this._panel;
          baitBtn.setPosition(472, 306, 0);

          const exitBtn = this._makeBtn('回主岛', 92, 42, new Color(96, 108, 104, 240), () => this.close());

          exitBtn.parent = this._panel;
          exitBtn.setPosition(574, 306, 0);
          this._gridLayer = this._uiNode('GridLayer', this._panel);
          this._mobLayer = this._uiNode('MobLayer', this._panel);
          this._fxGfx = this._uiNode('FxLayer', this._panel).addComponent(Graphics);
          this._toolBar = this._uiNode('ToolBar', this._panel);

          this._toolBar.setPosition(0, -284, 0); // 归因战报弹窗


          this._reportNode = this._uiNode('ReportModal', this._panel);

          const rg = this._reportNode.addComponent(Graphics);

          rg.fillColor = new Color(248, 240, 222, 252);
          rg.strokeColor = new Color(132, 92, 58, 255);
          rg.lineWidth = 4;
          rg.roundRect(-325, -150, 650, 300, 16);
          rg.fill();
          rg.stroke();

          const rlNode = this._uiNode('ReportLbl', this._reportNode);

          rlNode.setPosition(0, 34, 0);
          rlNode.addComponent(UITransform).setContentSize(590, 165);
          this._reportLbl = rlNode.addComponent(Label);
          this._reportLbl.fontSize = 17;
          this._reportLbl.lineHeight = 27;
          this._reportLbl.overflow = Label.Overflow.SHRINK;
          this._reportLbl.color = new Color(34, 46, 42, 255);

          const okBtn = this._makeBtn('收下战报，继续优化阵型', 224, 46, new Color(36, 126, 116, 250), () => {
            this._reportNode.active = false;

            this._refreshAll();
          });

          okBtn.parent = this._reportNode;
          okBtn.setPosition(0, -94, 0);
          this._reportNode.active = false;
        }

        _makeBtn(text, w, h, color, onTap) {
          const n = new Node(`Btn_${text.slice(0, 4)}`);
          n.layer = Layers.Enum.UI_2D;
          n.addComponent(UITransform).setContentSize(w, h);
          const g = n.addComponent(Graphics);
          g.fillColor = color;
          g.roundRect(-w / 2, -h / 2, w, h, 8);
          g.fill();

          const l = this._uiNode('Lbl', n).addComponent(Label);

          l.string = text;
          l.fontSize = 13;
          l.lineHeight = 17;
          l.color = Color.WHITE;
          n.on(Node.EventType.TOUCH_END, onTap);
          return n;
        }
        /** 随封印修复度演化 5×9 分道地形：中路碧玉灵渠（水路）+ 青岩障碍 + 金色灵脉格 */


        _buildTerrain() {
          var _inst$saveData$defens, _inst;

          this._terrain.clear();

          const pct = (_inst$saveData$defens = (_inst = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst) == null ? void 0 : _inst.saveData.defense.sealRepairPct) != null ? _inst$saveData$defens : 0; // 第 2 行（中路）：碧玉灵渠水路（须先铺聚水荷当底座，且水路导电增伤 +40%）

          for (let gx = 0; gx < COLS; gx++) {
            this._terrain.set(this._key(gx, 2), 'water');
          } // 金色灵脉格（攻速 +35%）


          this._terrain.set(this._key(5, 1), 'leyline');

          this._terrain.set(this._key(5, 3), 'leyline'); // 封印 ≥ 15%：出现青岩障碍格（挡低矮直线竹箭，逼高台穿云笋越障）


          if (pct >= 15) {
            this._terrain.set(this._key(3, 0), 'rock');

            this._terrain.set(this._key(3, 4), 'rock');
          } // 封印 ≥ 45%：中前排再添一处青岩 + 后排灵脉格


          if (pct >= 45) {
            this._terrain.set(this._key(2, 1), 'rock');

            this._terrain.set(this._key(7, 0), 'leyline');
          } // 清理旧档里落在青岩或未铺荷叶水路上的冲突格（安全退回背包）


          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;

          if (app != null && app.ready) {
            const slots = app.saveData.defense.slots;

            for (let i = slots.length - 1; i >= 0; i--) {
              var _this$_terrain$get;

              const s = slots[i];
              const t = (_this$_terrain$get = this._terrain.get(this._key(s.gx, s.gy))) != null ? _this$_terrain$get : 'normal';

              if (t === 'rock' || t === 'water' && s.basePlantId !== 'water_lotus') {
                app.addItem(s.basePlantId, 1);
                if (s.stackedPlantId) app.addItem(s.stackedPlantId, 1);
                slots.splice(i, 1);
              }
            }
          }
        }

        open(onToast) {
          this._onToast = onToast != null ? onToast : null;
          this._open = true;
          this._inBattle = false;
          this._reportNode.active = false;
          this._panel.active = true;

          this._panel.setSiblingIndex(this.node.children.length - 1);

          this._nightEvent = NIGHT_EVENTS[Math.floor(Math.random() * NIGHT_EVENTS.length)];

          this._buildTerrain();

          this._syncRuntimeFromSave();

          this._refreshAll();
        }

        close() {
          if (this._inBattle) {
            var _this$_onToast;

            (_this$_onToast = this._onToast) == null || _this$_onToast.call(this, '夜袭进行中！你可以用底部工具条花「局内灵气」随时空投救急灵植！');
            return;
          }

          this._open = false;
          this._panel.active = false;
        }

        _syncRuntimeFromSave() {
          var _inst$saveData$defens2, _inst2;

          const slots = (_inst$saveData$defens2 = (_inst2 = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst) == null ? void 0 : _inst2.saveData.defense.slots) != null ? _inst$saveData$defens2 : [];
          this._runtimePlants = slots.map(s => {
            var _baseDef$maxHp;

            const baseDef = DEFENSE_TOOLS.find(t => t.id === s.basePlantId);
            const hp = (_baseDef$maxHp = baseDef == null ? void 0 : baseDef.maxHp) != null ? _baseDef$maxHp : 120;
            return {
              gx: s.gx,
              gy: s.gy,
              baseId: s.basePlantId,
              topId: s.stackedPlantId,
              hp,
              maxHp: hp,
              cd: 0.2,
              regrowTimer: 0,
              tempOnly: false
            };
          });
        }

        _refreshAll() {
          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return;
          const def = app.saveData.defense;
          if (!this._inBattle) this._syncRuntimeFromSave();
          this._headerLbl.string = this._inBattle ? `5×9 分道夜袭第 ${this._wave}/${TOTAL_WAVES} 波 | 局内灵气 ${Math.floor(this._spiritEnergy)}（可空投救急）| 祭坛 ${this._altarHpBattle}/100` : `5×9 封印分道阵地 | 祭坛 ${def.altarHp}/100 | 修复 ${def.sealRepairPct}% | 金币 ${app.saveData.gold}（中路为水路，须先铺聚水荷）`;
          this._eventLbl.string = `今夜随机事件 ${this._nightEvent.title}：${this._nightEvent.desc}`;
          this._startWaveBtnLbl.string = this._inBattle ? this._intermitTimer > 0 ? `休整 ${Math.ceil(this._intermitTimer)}s` : `第 ${this._wave}/${TOTAL_WAVES} 波` : `开启 ${TOTAL_WAVES} 波夜袭`;

          this._rebuildGrid();

          this._rebuildTools();
        }

        _rebuildTools() {
          this._toolBar.removeAllChildren();

          const w = 128;
          const gap = 6;
          DEFENSE_TOOLS.forEach((t, idx) => {
            const selected = this._selectedTool === t.id;
            const bg = selected ? new Color(t.color[0], t.color[1], t.color[2], 255) : new Color(56, 70, 66, 238);
            const costText = t.id === 'remove' ? '' : this._inBattle ? `(${t.spiritCost}灵)` : `(${t.costGold}金)`;

            const b = this._makeBtn(`${t.name}${costText}\n${t.shortDesc}`, w, 56, bg, () => {
              this._selectedTool = t.id;

              this._rebuildTools();
            });

            b.parent = this._toolBar;
            b.setPosition((idx - (DEFENSE_TOOLS.length - 1) / 2) * (w + gap), 0, 0);
          });
        }

        _rebuildGrid() {
          this._gridLayer.removeAllChildren();

          this._plantAnimNodes = [];

          for (let gy = 0; gy < ROWS; gy++) {
            for (let gx = 0; gx < COLS; gx++) {
              var _this$_terrain$get2;

              const pos = this._cellPos(gx, gy);

              const cell = this._uiNode(`LaneCell_${gx}_${gy}`, this._gridLayer);

              cell.addComponent(UITransform).setContentSize(CELL_W - 4, CELL_H - 4);
              cell.setPosition(pos.x, pos.y, 0);
              const terr = (_this$_terrain$get2 = this._terrain.get(this._key(gx, gy))) != null ? _this$_terrain$get2 : 'normal';

              const plant = this._runtimePlants.find(p => p.gx === gx && p.gy === gy && p.hp > 0);

              const g = cell.addComponent(Graphics);
              if (terr === 'water') g.fillColor = new Color(118, 192, 198, 255);else if (terr === 'rock') g.fillColor = new Color(106, 118, 116, 255);else if (terr === 'leyline') g.fillColor = new Color(242, 224, 164, 255);else g.fillColor = (gx + gy) % 2 === 0 ? new Color(206, 220, 202, 255) : new Color(198, 214, 194, 255);
              g.strokeColor = terr === 'leyline' ? new Color(214, 156, 46, 255) : new Color(148, 168, 154, 180);
              g.lineWidth = terr === 'leyline' ? 2.5 : 1.5;
              g.roundRect(-(CELL_W - 6) / 2, -(CELL_H - 6) / 2, CELL_W - 6, CELL_H - 6, 7);
              g.fill();
              g.stroke();

              if (terr === 'rock') {
                const rk = this._uiNode('RockArt', cell);

                rk.setPosition(0, 4, 0);
                (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
                  error: Error()
                }), ArtLoader) : ArtLoader).applySprite(rk, 'obs_boulder', 62, 48);

                const l = this._uiNode('Lbl', cell).addComponent(Label);

                l.node.setPosition(0, -24, 0);
                l.string = '青岩(高台可越)';
                l.fontSize = 10;
                l.color = new Color(240, 244, 240, 235);
              } else if (plant) {
                const baseDef = DEFENSE_TOOLS.find(t => t.id === plant.baseId);
                const plantArtMap = {
                  water_lotus: ['def_lotus_pad', 68, 52],
                  sky_bamboo: ['def_sky_bamboo', 48, 58],
                  cloud_bamboo_shoot: ['def_cloud_shoot', 38, 60],
                  thunder_potato: ['plant_thunder_potato', 54, 52],
                  flame_pepper: ['def_flame_vine', 56, 56],
                  iron_melon: ['def_iron_melon', 60, 50],
                  spirit_tea: ['def_rain_tea', 56, 54],
                  thunder_grass: ['plant_sky_bamboo_combo', 50, 54]
                };
                const baseArt = plantArtMap[plant.baseId];

                if (baseArt) {
                  const bn = this._uiNode('BaseArt', cell);

                  bn.setPosition(0, plant.baseId === 'water_lotus' ? -2 : 4, 0);
                  (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
                    error: Error()
                  }), ArtLoader) : ArtLoader).applySprite(bn, baseArt[0], baseArt[1], baseArt[2]);

                  this._plantAnimNodes.push(bn);
                }

                if (plant.topId) {
                  const topArt = plantArtMap[plant.topId];

                  if (topArt) {
                    const tn = this._uiNode('TopArt', cell);

                    tn.setPosition(0, plant.baseId === 'sky_bamboo' ? 22 : 10, 0);
                    (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
                      error: Error()
                    }), ArtLoader) : ArtLoader).applySprite(tn, topArt[0], topArt[1] * 0.78, topArt[2] * 0.78);

                    this._plantAnimNodes.push(tn);
                  }
                }

                const l = this._uiNode('Lbl', cell).addComponent(Label);

                l.node.setPosition(0, -26, 0);
                l.fontSize = 10;
                l.color = new Color(24, 36, 32, 245);

                if (plant.topId) {
                  var _topDef$name, _topDef$name2;

                  const topDef = DEFENSE_TOOLS.find(t => t.id === plant.topId);
                  l.string = plant.baseId === 'sky_bamboo' ? `高台·${(_topDef$name = topDef == null ? void 0 : topDef.name) != null ? _topDef$name : ''}` : `荷·${(_topDef$name2 = topDef == null ? void 0 : topDef.name) != null ? _topDef$name2 : ''}`;
                } else {
                  var _baseDef$name;

                  l.string = `${(_baseDef$name = baseDef == null ? void 0 : baseDef.name) != null ? _baseDef$name : ''}${plant.tempOnly ? '(急)' : ''}`;
                }
              } else if (terr === 'water' || terr === 'leyline') {
                const l = this._uiNode('Lbl', cell).addComponent(Label);

                l.string = terr === 'water' ? '碧玉水路' : '灵脉(攻速+)';
                l.fontSize = 10;
                l.color = terr === 'water' ? new Color(26, 78, 84, 215) : new Color(132, 86, 26, 235);
              }

              cell.on(Node.EventType.TOUCH_END, () => this._onCellTap(gx, gy));
            }
          }
        }

        _onCellTap(gx, gy) {
          var _this$_terrain$get3;

          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return;
          const terr = (_this$_terrain$get3 = this._terrain.get(this._key(gx, gy))) != null ? _this$_terrain$get3 : 'normal';

          if (terr === 'rock') {
            var _this$_onToast2;

            (_this$_onToast2 = this._onToast) == null || _this$_onToast2.call(this, '青岩障碍格不可种植，但后排「撑天竹+穿云笋」高台可越过青岩射击！');
            return;
          }

          const tool = DEFENSE_TOOLS.find(t => t.id === this._selectedTool);
          if (!tool) return; // 战时：花「局内灵气」空投临时救急灵植（不改动常驻存档！）

          if (this._inBattle) {
            var _this$_onToast9;

            if (tool.id === 'remove') {
              var _this$_onToast3;

              (_this$_onToast3 = this._onToast) == null || _this$_onToast3.call(this, '交战中不可铲除常驻阵地，请选择灵植花灵气空投救急！');
              return;
            }

            const existing = this._runtimePlants.find(p => p.gx === gx && p.gy === gy && p.hp > 0);

            if (existing) {
              var _this$_onToast6;

              // 允许在已有聚水荷或撑天竹上临时空投叠放
              const canStackOnLotus = existing.baseId === 'water_lotus' && !existing.topId && tool.id !== 'water_lotus';
              const canStackOnBamboo = existing.baseId === 'sky_bamboo' && !existing.topId && (tool.id === 'cloud_bamboo_shoot' || tool.id === 'thunder_grass');

              if (canStackOnLotus || canStackOnBamboo) {
                var _this$_onToast5;

                if (this._spiritEnergy < tool.spiritCost) {
                  var _this$_onToast4;

                  (_this$_onToast4 = this._onToast) == null || _this$_onToast4.call(this, `局内灵气不足（需要 ${tool.spiritCost} 灵气）`);
                  return;
                }

                this._spiritEnergy -= tool.spiritCost;
                existing.topId = tool.id;
                (_this$_onToast5 = this._onToast) == null || _this$_onToast5.call(this, `紧急空投叠放【${tool.name}】成功！`);

                this._refreshAll();

                return;
              }

              (_this$_onToast6 = this._onToast) == null || _this$_onToast6.call(this, '该格已有灵植，请点空位空投救急！');
              return;
            }

            if (terr === 'water' && tool.id !== 'water_lotus') {
              var _this$_onToast7;

              (_this$_onToast7 = this._onToast) == null || _this$_onToast7.call(this, '水路格必须先铺【聚水荷】底座！');
              return;
            }

            if (this._spiritEnergy < tool.spiritCost) {
              var _this$_onToast8;

              (_this$_onToast8 = this._onToast) == null || _this$_onToast8.call(this, `局内灵气不足（需要 ${tool.spiritCost} 灵气）`);
              return;
            }

            this._spiritEnergy -= tool.spiritCost;

            this._runtimePlants.push({
              gx,
              gy,
              baseId: tool.id,
              hp: tool.maxHp,
              maxHp: tool.maxHp,
              cd: 0.1,
              regrowTimer: 0,
              tempOnly: true
            });

            (_this$_onToast9 = this._onToast) == null || _this$_onToast9.call(this, `空投救急【${tool.name}】！（消耗 ${tool.spiritCost} 灵气）`);

            this._refreshAll();

            return;
          } // 布防期：永久写入 saveData.defense.slots


          const slots = app.saveData.defense.slots;
          const idx = slots.findIndex(s => s.gx === gx && s.gy === gy);

          if (tool.id === 'remove') {
            if (idx >= 0) {
              slots.splice(idx, 1);
              app.persist('def_remove');

              this._refreshAll();
            }

            return;
          }

          if (idx >= 0) {
            var _this$_onToast12;

            const existing = slots[idx]; // 1. 撑天竹高台叠放射手/引雷草

            if (existing.basePlantId === 'sky_bamboo' && !existing.stackedPlantId && (tool.id === 'cloud_bamboo_shoot' || tool.id === 'thunder_grass')) {
              var _this$_onToast10;

              if (!this._payGoldOrBag(tool)) return;
              existing.stackedPlantId = tool.id;
              app.persist('def_stack');
              (_this$_onToast10 = this._onToast) == null || _this$_onToast10.call(this, `高台叠搭成功！【${tool.name}】射程 +35%、可防空且可越过青岩！`);

              this._refreshAll();

              return;
            } // 2. 聚水荷水上底座叠放任意陆地植物


            if (existing.basePlantId === 'water_lotus' && !existing.stackedPlantId && tool.id !== 'water_lotus') {
              var _this$_onToast11;

              if (!this._payGoldOrBag(tool)) return;
              existing.stackedPlantId = tool.id;
              app.persist('def_lotus_stack');
              (_this$_onToast11 = this._onToast) == null || _this$_onToast11.call(this, `已在聚水荷上种下【${tool.name}】！`);

              this._refreshAll();

              return;
            }

            (_this$_onToast12 = this._onToast) == null || _this$_onToast12.call(this, '该格已有灵植（撑天竹/聚水荷可叠放，其余请先铲除）');
            return;
          }

          if (terr === 'water' && tool.id !== 'water_lotus') {
            var _this$_onToast13;

            (_this$_onToast13 = this._onToast) == null || _this$_onToast13.call(this, '中路碧玉灵渠为水路，请先种【聚水荷】底座再放陆地植物！');
            return;
          }

          if (!this._payGoldOrBag(tool)) return;
          slots.push({
            gx,
            gy,
            basePlantId: tool.id
          });
          app.persist('def_place');

          this._refreshAll();
        }

        _payGoldOrBag(tool) {
          var _app$saveData$invento;

          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return false;

          if (((_app$saveData$invento = app.saveData.inventory[tool.id]) != null ? _app$saveData$invento : 0) > 0) {
            app.addItem(tool.id, -1);
            return true;
          }

          if (app.saveData.gold < tool.costGold) {
            var _this$_onToast14;

            (_this$_onToast14 = this._onToast) == null || _this$_onToast14.call(this, `金币不足（需 ${tool.costGold} 金，或回农田收获 ${tool.name}）`);
            return false;
          }

          app.addGold(-tool.costGold);
          return true;
        }

        _dropBait() {
          var _app$saveData$invento2, _this$_onToast16;

          if (!this._inBattle) {
            var _this$_onToast15;

            (_this$_onToast15 = this._onToast) == null || _this$_onToast15.call(this, '请先开启夜袭，交战时再投放荷塘鱼饵！');
            return;
          }

          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;

          if (app && ((_app$saveData$invento2 = app.saveData.inventory['bait_lotus']) != null ? _app$saveData$invento2 : 0) > 0) {
            app.addItem('bait_lotus', -1);
          } // 自动投放到怪物最密集的那一行


          const counts = [0, 0, 0, 0, 0];

          for (const m of this._monsters) if (!m.flying) counts[m.row] += 1;

          let maxR = 2;

          for (let r = 0; r < ROWS; r++) if (counts[r] > counts[maxR]) maxR = r;

          this._baitRow = maxR;
          this._baitActiveTimer = 5.5;
          (_this$_onToast16 = this._onToast) == null || _this$_onToast16.call(this, `在第 ${maxR + 1} 行投放【荷塘秘制诱饵】！同行地面怪被吸引停留 5.5 秒！`);
        }

        _startNightBattle() {
          if (this._inBattle) return;
          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return;

          if (app.saveData.defense.slots.length === 0) {
            var _this$_onToast17;

            (_this$_onToast17 = this._onToast) == null || _this$_onToast17.call(this, '请先在 5×9 分道中种下几株灵植再开启夜袭！');
            return;
          }

          if (app.saveData.defense.altarHp < 100 && app.saveData.gold >= 20) {
            app.addGold(-20);
            app.saveData.defense.altarHp = 100;
          }

          this._syncRuntimeFromSave();

          this._inBattle = true;
          (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
            error: Error()
          }), AudioManager) : AudioManager).inst.playBgm('defense');
          this._wave = 1;
          this._intermitTimer = 0;
          this._spiritEnergy = 50;
          this._altarHpBattle = app.saveData.defense.altarHp;
          this._leakedGround = 0;
          this._leakedFlying = 0;
          this._leakedSpecial = 0;
          this._monsters = [];
          this._projectiles = [];
          this._fxLines = [];
          this._fxCircles = [];
          this._baitActiveTimer = 0;

          this._queueWave(1);

          this._refreshAll();
        }

        _queueWave(wave) {
          this._wave = wave;
          this._spawnTimer = 0;
          this._spawnQueue = [];
          const moreBurrow = this._nightEvent.id === 'burrow_tide';

          if (wave === 1) {
            for (let i = 0; i < 6; i++) this._spawnQueue.push({
              delay: i * 1.0,
              kind: 'imp',
              row: i % ROWS
            });
          } else if (wave === 2) {
            this._spawnQueue.push({
              delay: 0.3,
              kind: 'golem',
              row: 1
            });

            this._spawnQueue.push({
              delay: 1.1,
              kind: 'wall_jumper',
              row: 0
            });

            this._spawnQueue.push({
              delay: 1.9,
              kind: 'fly_ink',
              row: 2
            });

            this._spawnQueue.push({
              delay: 2.6,
              kind: 'burrower',
              row: 3
            });

            this._spawnQueue.push({
              delay: 3.4,
              kind: 'wall_jumper',
              row: 4
            });

            this._spawnQueue.push({
              delay: 4.1,
              kind: 'golem',
              row: 2
            });
          } else if (wave === 3) {
            this._spawnQueue.push({
              delay: 0.3,
              kind: 'golem',
              row: 0
            });

            this._spawnQueue.push({
              delay: 1.0,
              kind: 'burrower',
              row: 1
            });

            this._spawnQueue.push({
              delay: 1.7,
              kind: 'fly_ink',
              row: 3
            });

            this._spawnQueue.push({
              delay: 2.3,
              kind: 'wall_jumper',
              row: 2
            });

            this._spawnQueue.push({
              delay: 3.0,
              kind: 'golem',
              row: 4
            });

            this._spawnQueue.push({
              delay: 3.7,
              kind: 'fly_ink',
              row: 1
            });

            if (moreBurrow) this._spawnQueue.push({
              delay: 4.3,
              kind: 'burrower',
              row: 4
            });
          } else if (wave === 4) {
            for (let i = 0; i < 3; i++) this._spawnQueue.push({
              delay: i * 1.1,
              kind: 'golem',
              row: i * 2 % ROWS
            });

            this._spawnQueue.push({
              delay: 0.8,
              kind: 'wall_jumper',
              row: 1
            });

            this._spawnQueue.push({
              delay: 1.8,
              kind: 'burrower',
              row: 3
            });

            this._spawnQueue.push({
              delay: 2.6,
              kind: 'fly_ink',
              row: 0
            });

            this._spawnQueue.push({
              delay: 3.3,
              kind: 'fly_ink',
              row: 4
            });

            this._spawnQueue.push({
              delay: 4.0,
              kind: 'burrower',
              row: 0
            });
          } else {
            this._spawnQueue.push({
              delay: 0.5,
              kind: 'boss',
              row: 2
            });

            this._spawnQueue.push({
              delay: 1.3,
              kind: 'wall_jumper',
              row: 0
            });

            this._spawnQueue.push({
              delay: 2.0,
              kind: 'burrower',
              row: 1
            });

            this._spawnQueue.push({
              delay: 2.8,
              kind: 'fly_ink',
              row: 3
            });

            this._spawnQueue.push({
              delay: 3.5,
              kind: 'golem',
              row: 4
            });

            this._spawnQueue.push({
              delay: 4.2,
              kind: 'fly_ink',
              row: 1
            });

            this._spawnQueue.push({
              delay: 4.8,
              kind: 'wall_jumper',
              row: 3
            });
          }
        }

        _hasCrossRowFire(row) {
          return this._runtimePlants.some(p => p.hp > 0 && (p.baseId === 'flame_pepper' || p.topId === 'flame_pepper') && Math.abs(p.gy - row) <= 1);
        }

        _hasNeighborPlant(gx, gy, id) {
          return this._runtimePlants.some(p => p.hp > 0 && Math.abs(p.gx - gx) + Math.abs(p.gy - gy) === 1 && (p.baseId === id || p.topId === id));
        }

        update(dt) {
          if (!this._open) return;
          this._animClock += dt;

          for (let i = 0; i < this._plantAnimNodes.length; i++) {
            const pn = this._plantAnimNodes[i];

            if (pn && pn.isValid) {
              const sway = Math.sin(this._animClock * 2.6 + i * 0.9);
              pn.setScale(1 - sway * 0.02, 1 + sway * 0.032, 1);
              pn.angle = sway * 2.4;
            }
          }

          const cdt = Math.min(dt, 0.05);

          if (this._inBattle) {
            if (this._intermitTimer > 0) {
              this._intermitTimer -= cdt;

              if (this._intermitTimer <= 0) {
                this._intermitTimer = 0;

                this._queueWave(this._wave + 1);

                this._refreshAll();
              } else {
                this._startWaveBtnLbl.string = `休整 ${Math.ceil(this._intermitTimer)}s`;
              }
            } else {
              this._stepBattle(cdt);
            }
          }

          this._renderBattleFx();
        }

        _stepBattle(dt) {
          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return;
          const sealScale = 1 + app.saveData.defense.sealRepairPct / 100 * 0.75;
          const hpMult = this._nightEvent.id === 'blood_moon' ? 1.25 : 1.0; // 刷怪

          this._spawnTimer += dt;

          while (this._spawnQueue.length > 0 && this._spawnTimer >= this._spawnQueue[0].delay) {
            const item = this._spawnQueue.shift();

            const y = this._cellPos(0, item.row).y;

            const cfg = {
              imp: {
                hp: 90,
                spd: 54,
                fly: false,
                burrow: false
              },
              golem: {
                hp: 250,
                spd: 32,
                fly: false,
                burrow: false
              },
              fly_ink: {
                hp: 95,
                spd: this._nightEvent.id === 'thunder' ? 68 : 56,
                fly: true,
                burrow: false
              },
              wall_jumper: {
                hp: 135,
                spd: 58,
                fly: false,
                burrow: false
              },
              burrower: {
                hp: 110,
                spd: 64,
                fly: false,
                burrow: true
              },
              boss: {
                hp: 720,
                spd: 26,
                fly: false,
                burrow: false
              }
            };
            const c = cfg[item.kind];
            const finalHp = Math.round(c.hp * sealScale * hpMult);

            this._monsters.push({
              id: this._nextMobId++,
              kind: item.kind,
              row: item.row,
              x: -415,
              y,
              hp: finalHp,
              maxHp: finalHp,
              speed: c.spd,
              flying: c.fly,
              hasJumped: false,
              jumpArcTimer: 0,
              burrowed: c.burrow,
              slowTimer: 0,
              burnTimer: 0,
              biteCd: 0
            });
          }

          if (this._baitActiveTimer > 0) this._baitActiveTimer = Math.max(0, this._baitActiveTimer - dt); // 怪物行动（含啃咬肉盾、跃墙狸妖撑杆跳、钻地土拨妖后排破土！）

          let plantDied = false;

          for (const m of this._monsters) {
            if (m.slowTimer > 0) m.slowTimer -= dt;

            if (m.burnTimer > 0) {
              m.burnTimer -= dt;
              m.hp -= 14 * dt;
            } // 钻地土拨妖走到后排第 6 列附近破土钻出！


            if (m.burrowed && m.x >= this._cellPos(6, m.row).x - 20) {
              m.burrowed = false;

              this._fxCircles.push({
                x: m.x,
                y: m.y,
                r: 34,
                color: new Color(156, 114, 72, 180),
                life: 0.35
              });
            }

            if (m.jumpArcTimer > 0) {
              m.jumpArcTimer -= dt;
              m.x += 175 * dt;
              continue;
            }

            if (this._baitActiveTimer > 0 && !m.flying && !m.burrowed && m.row === this._baitRow && Math.abs(m.x) < 160) {
              continue;
            } // 检查前方是否撞到同行植物


            let blocker;

            if (!m.flying && !m.burrowed) {
              blocker = this._runtimePlants.find(p => p.hp > 0 && p.gy === m.row && p.baseId !== 'thunder_potato' && p.baseId !== 'water_lotus' && Math.abs(this._cellPos(p.gx, p.gy).x - m.x) < 34); // 若水路上有聚水荷叠放了陆地植物，也算阻挡

              if (!blocker) {
                blocker = this._runtimePlants.find(p => p.hp > 0 && p.gy === m.row && p.baseId === 'water_lotus' && !!p.topId && Math.abs(this._cellPos(p.gx, p.gy).x - m.x) < 34);
              }
            }

            if (blocker) {
              // 跃墙狸妖首次遇到植物：若为撑天竹则被高墙拦下！若为普通矮植物则撑杆直接翻过去！
              if (m.kind === 'wall_jumper' && !m.hasJumped) {
                m.hasJumped = true;

                if (blocker.baseId === 'sky_bamboo') {
                  this._fxCircles.push({
                    x: m.x,
                    y: m.y + 18,
                    r: 28,
                    color: new Color(246, 208, 92, 170),
                    life: 0.25
                  });
                } else {
                  m.jumpArcTimer = 0.55;
                  continue;
                }
              } // 停下来啃咬植物


              m.biteCd -= dt;

              if (m.biteCd <= 0) {
                const biteDmg = m.kind === 'boss' ? 85 : m.kind === 'golem' ? 35 : 22;
                blocker.hp -= biteDmg;
                m.biteCd = 0.85;
                if (blocker.hp <= 0) plantDied = true;
              }
            } else {
              const spd = m.speed * (m.slowTimer > 0 ? 0.55 : 1.0);
              m.x += spd * dt;
            } // 突破右侧封印祭坛


            if (m.x >= 388) {
              m.hp = 0;
              this._altarHpBattle = Math.max(0, this._altarHpBattle - (m.kind === 'boss' ? 45 : 18));
              if (m.flying) this._leakedFlying += 1;else if (m.kind === 'wall_jumper' || m.kind === 'burrower') this._leakedSpecial += 1;else this._leakedGround += 1;
            }
          } // 防线灵植运转


          for (const p of this._runtimePlants) {
            var _this$_terrain$get4, _p$topId;

            if (p.hp <= 0) continue;

            const pos = this._cellPos(p.gx, p.gy);

            const terr = (_this$_terrain$get4 = this._terrain.get(this._key(p.gx, p.gy))) != null ? _this$_terrain$get4 : 'normal';
            const teaBoost = this._hasNeighborPlant(p.gx, p.gy, 'spirit_tea') ? 1.25 : 1.0;
            const haste = (terr === 'leyline' ? 1.35 : 1.0) * teaBoost;
            const activeId = (_p$topId = p.topId) != null ? _p$topId : p.baseId;
            const elevated = p.baseId === 'sky_bamboo' && !!p.topId; // 谷雨灵茶产局内灵气

            if (activeId === 'spirit_tea') {
              p.cd -= dt;

              if (p.cd <= 0) {
                this._spiritEnergy += this._nightEvent.id === 'mist_rush' ? 30 : 15;
                p.cd = 4.0;

                this._fxCircles.push({
                  x: pos.x,
                  y: pos.y,
                  r: 28,
                  color: new Color(168, 224, 118, 130),
                  life: 0.28
                });
              }
            } // 雷火薯：宿根再生 + 踩踏爆破（连钻地破土怪一起炸！）


            if (activeId === 'thunder_potato') {
              if (p.regrowTimer > 0) {
                p.regrowTimer = Math.max(0, p.regrowTimer - dt);
              } else {
                const hit = this._monsters.find(m => m.hp > 0 && !m.flying && !m.burrowed && Math.hypot(m.x - pos.x, m.y - pos.y) < 48);

                if (hit) {
                  const fireBoost = this._hasCrossRowFire(p.gy) ? 1.3 : 1.0;

                  this._fxCircles.push({
                    x: pos.x,
                    y: pos.y,
                    r: 104,
                    color: new Color(238, 112, 46, 155),
                    life: 0.34
                  });

                  for (const m of this._monsters) {
                    if (m.hp > 0 && !m.flying && Math.hypot(m.x - pos.x, m.y - pos.y) <= 104) {
                      m.hp -= 92 * fireBoost;
                      m.x -= 28;
                      if (fireBoost > 1) m.burnTimer = 3.0;
                    }
                  }

                  p.regrowTimer = this._nightEvent.id === 'burrow_tide' ? 5.0 : 8.5;
                }
              }
            } // 聚水荷：同行减速


            if (p.baseId === 'water_lotus') {
              for (const m of this._monsters) {
                if (m.hp > 0 && m.row === p.gy && Math.abs(m.x - pos.x) < 120) m.slowTimer = 0.6;
              }
            } // 穿云笋：本行射击（高台穿云笋可打飞行怪 & 越过青岩！）


            if (activeId === 'cloud_bamboo_shoot') {
              p.cd -= dt * haste;

              if (p.cd <= 0) {
                const target = this._monsters.find(m => m.hp > 0 && !m.burrowed && m.row === p.gy && m.x < pos.x + 28 && (elevated || !m.flying));

                if (target) {
                  const hasFire = this._hasCrossRowFire(p.gy);

                  this._projectiles.push({
                    x: pos.x,
                    y: elevated ? pos.y + 18 : pos.y,
                    row: p.gy,
                    vx: -460,
                    vy: 0,
                    dmg: hasFire ? 30 : 22,
                    burn: hasFire,
                    hitsAir: elevated,
                    elevated,
                    color: hasFire ? new Color(238, 92, 48, 255) : new Color(92, 198, 98, 255),
                    life: 2.2
                  });

                  p.cd = 0.88;
                }
              }
            } // 引雷草：全能对空 + 跨行 3 目标链式感电！


            if (activeId === 'thunder_grass') {
              p.cd -= dt * haste;

              if (p.cd <= 0) {
                const range = elevated ? 340 : 260;

                const target = this._monsters.find(m => m.hp > 0 && !m.burrowed && Math.hypot(m.x - pos.x, m.y - pos.y) <= range);

                if (target) {
                  const onWater = terr === 'water' || p.baseId === 'water_lotus' || this._hasNeighborPlant(p.gx, p.gy, 'water_lotus');

                  const chain = onWater || app.time.weather === 'rainy' ? 3 : 1;
                  const mult = (onWater ? 1.4 : 1.0) * (this._nightEvent.id === 'thunder' ? 1.45 : 1.0);

                  const hits = this._monsters.filter(m => m.hp > 0 && !m.burrowed && Math.hypot(m.x - target.x, m.y - target.y) <= 185).slice(0, chain);

                  let lx = pos.x,
                      ly = elevated ? pos.y + 18 : pos.y;

                  for (const h of hits) {
                    h.hp -= Math.round((chain > 1 ? 36 : 28) * mult);

                    this._fxLines.push({
                      x1: lx,
                      y1: ly,
                      x2: h.x,
                      y2: h.y,
                      width: 5,
                      color: new Color(138, 224, 255, 245),
                      life: 0.22
                    });

                    lx = h.x;
                    ly = h.y;
                  }

                  p.cd = 1.38;
                }
              }
            }
          } // 子弹飞行与青岩阻挡判定


          for (const pr of this._projectiles) {
            pr.x += pr.vx * dt;
            pr.y += pr.vy * dt;
            pr.life -= dt; // 低矮箭矢撞到同行青岩会被挡下；高台箭矢直接越过！

            if (!pr.elevated) {
              const gx = Math.round((pr.x - ORIGIN_X) / CELL_W);

              if (this._terrain.get(this._key(gx, pr.row)) === 'rock') {
                pr.life = 0;
                continue;
              }
            }

            for (const m of this._monsters) {
              if (m.hp > 0 && !m.burrowed && m.row === pr.row && (pr.hitsAir || !m.flying) && Math.abs(m.x - pr.x) < 24) {
                m.hp -= pr.dmg;
                if (pr.burn) m.burnTimer = 3.0;
                pr.life = 0;
                break;
              }
            }
          }

          const prevMobCount = this._monsters.length;
          this._monsters = this._monsters.filter(m => m.hp > 0);
          const killed = Math.max(0, prevMobCount - this._monsters.length);
          if (killed > 0) this._spiritEnergy += killed * 8;
          this._projectiles = this._projectiles.filter(p => p.life > 0 && p.x > -440);
          this._fxLines = this._fxLines.filter(l => {
            l.life -= dt;
            return l.life > 0;
          });
          this._fxCircles = this._fxCircles.filter(c => {
            c.life -= dt;
            return c.life > 0;
          });
          if (plantDied) this._rebuildGrid();
          this._headerLbl.string = `5×9 分道夜袭第 ${this._wave}/${TOTAL_WAVES} 波 | 局内灵气 ${Math.floor(this._spiritEnergy)}（可空投救急）| 祭坛 ${this._altarHpBattle}/100`;

          if (this._altarHpBattle <= 0) {
            this._settleBattle(false);

            return;
          }

          if (this._spawnQueue.length === 0 && this._monsters.length === 0) {
            if (this._wave < TOTAL_WAVES) {
              var _this$_onToast18;

              this._intermitTimer = 4.0;
              (_this$_onToast18 = this._onToast) == null || _this$_onToast18.call(this, `第 ${this._wave} 波已击退！可趁休整用局内灵气补种救急灵植`);

              this._refreshAll();
            } else {
              this._settleBattle(true);
            }
          }
        }

        _settleBattle(win) {
          this._inBattle = false;
          this._intermitTimer = 0;
          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return;
          app.saveData.defense.awakened = true;
          app.saveData.defense.lastSettledDay = app.time.dayIndex;
          const mult = this._nightEvent.id === 'blood_moon' ? 2 : 1;

          if (win) {
            app.saveData.defense.altarHp = this._altarHpBattle;
            app.saveData.defense.sealRepairPct = Math.min(100, app.saveData.defense.sealRepairPct + 15);
            app.addGold(90 * mult);
            app.addItem('seal_shard', 1 * mult);
            app.persist('defense_win');
            this._reportLbl.string = `5×9 封印分道夜袭大捷！（${this._nightEvent.title}）\n` + `获得：${90 * mult} 金币 · 封印碎片 ×${1 * mult} · 封印修复度 +15%\n` + `所有常驻灵植战后自动满血复原，绝不损耗日常心血！`;
          } else {
            app.saveData.defense.altarHp = 50;
            app.persist('defense_loss');
            const tips = [];
            if (this._leakedFlying > 0) tips.push(`漏过飞行墨灵 ${this._leakedFlying} 只→用撑天竹叠穿云笋或种引雷草防空`);
            if (this._leakedSpecial > 0) tips.push(`漏过跃墙/钻地妖 ${this._leakedSpecial} 只→前排撑天竹拦翻墙、后排埋雷火薯炸钻地`);
            if (this._leakedGround > 0) tips.push(`漏过重甲怪 ${this._leakedGround} 只→前排种铁壳冬瓜扛线、炎椒藤跨行催化火箭`);
            this._reportLbl.string = `部分失守（常驻灵植与农田均完整复原，绝不清档）\n归因分析：\n${tips.join('\n') || '请多善用局内灵气空投救急灵植！'}`;
          }

          this._buildTerrain();

          this._syncRuntimeFromSave();

          this._reportNode.active = true;

          this._reportNode.setSiblingIndex(this._panel.children.length - 1);
        }

        _renderBattleFx() {
          const g = this._fxGfx;
          g.clear(); // 植物血条（仅受损时显示）与雷火薯宿根倒计时

          for (const p of this._runtimePlants) {
            if (p.hp <= 0) continue;

            const pos = this._cellPos(p.gx, p.gy);

            if (p.hp < p.maxHp) {
              const ratio = Math.max(0, p.hp / p.maxHp);
              g.fillColor = new Color(24, 30, 28, 220);
              g.rect(pos.x - 22, pos.y + 24, 44, 5);
              g.fill();
              g.fillColor = new Color(92, 206, 118, 255);
              g.rect(pos.x - 22, pos.y + 24, 44 * ratio, 5);
              g.fill();
            }

            if (p.regrowTimer > 0) {
              g.fillColor = new Color(98, 72, 48, 190);
              g.circle(pos.x, pos.y, 12);
              g.fill();
            }
          }

          if (this._baitActiveTimer > 0) {
            const by = this._cellPos(4, this._baitRow).y;

            g.fillColor = new Color(246, 204, 88, 95);
            g.circle(0, by, 68);
            g.fill();
          }

          for (const c of this._fxCircles) {
            g.fillColor = c.color;
            g.circle(c.x, c.y, c.r);
            g.fill();
          }

          for (const l of this._fxLines) {
            g.strokeColor = l.color;
            g.lineWidth = l.width;
            g.moveTo(l.x1, l.y1);
            g.lineTo(l.x2, l.y2);
            g.stroke();
          } // 同步手绘妖灵贴图节点池（钻地时隐藏贴图只画土包，跃墙/飞行带弧线与柔影）


          const activeIds = new Set();
          const mobArtCfg = {
            imp: ['mob_bamboo', 56, 58, 0.14],
            golem: ['mob_golem', 66, 68, 0.22],
            fly_ink: ['mob_ink_fly', 64, 58, 0.13],
            wall_jumper: ['mob_leap_fox', 64, 62, 0.14],
            burrower: ['mob_burrow_mole', 64, 52, 0.15],
            boss: ['mob_boss', 86, 88, 0.21]
          };

          for (const m of this._monsters) {
            var _mn$getChildByName;

            activeIds.add(m.id);
            const [prefix, mw, mh, frameSec] = mobArtCfg[m.kind];

            let mn = this._mobSprites.get(m.id);

            if (!mn) {
              mn = this._uiNode(`Mob_${m.id}`, this._mobLayer);
              (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
                error: Error()
              }), ArtLoader) : ArtLoader).applySprite(mn, `${prefix}_0`, mw, mh);

              this._mobSprites.set(m.id, mn);
            }

            if (m.burrowed) {
              mn.active = false;
              g.fillColor = new Color(138, 98, 62, 240);
              g.ellipse(m.x, m.y - 6, 22, 11);
              g.fill();
              continue;
            }

            mn.active = true;
            const jumpArc = m.jumpArcTimer > 0 ? Math.sin((1 - m.jumpArcTimer / 0.55) * Math.PI) * 48 : 0;
            g.fillColor = new Color(20, 28, 26, m.flying || jumpArc > 0 ? 75 : 55);
            g.ellipse(m.x, m.y - 18, m.kind === 'boss' ? 28 : 16, 6);
            g.fill();
            const yd = m.y + (m.flying ? 18 : 0) + jumpArc; // 4 帧真实行走/扇翅动画轮播（朝右走向右侧封印祭坛）

            const frames = this._mobAnimFrames[prefix];
            const fIdx = Math.floor((this._animClock + m.id * 0.17) / frameSec) % 4;
            const sf = frames == null ? void 0 : frames[fIdx];
            const sp = (_mn$getChildByName = mn.getChildByName('ArtSprite')) == null ? void 0 : _mn$getChildByName.getComponent(Sprite);

            if (sp && sf && sp.spriteFrame !== sf) {
              sp.spriteFrame = sf;
            }

            const stepBob = m.flying ? Math.sin(this._animClock * 5 + m.id) * 4 : Math.abs(Math.sin(this._animClock * 7 + m.id)) * 2.5;
            mn.setPosition(m.x, yd + 6 + stepBob, 0);

            if (m.burnTimer > 0) {
              g.fillColor = new Color(242, 96, 48, 95);
              g.circle(m.x, yd + 4, m.kind === 'boss' ? 38 : 22);
              g.fill();
            }

            const r = m.kind === 'boss' ? 36 : m.kind === 'golem' ? 26 : 22;
            const bw = m.kind === 'boss' ? 68 : 42;
            const ratio = Math.max(0, m.hp / m.maxHp);
            g.fillColor = new Color(24, 30, 28, 220);
            g.rect(m.x - bw / 2, yd + r + 8, bw, 5);
            g.fill();
            g.fillColor = new Color(224, 78, 58, 255);
            g.rect(m.x - bw / 2, yd + r + 8, bw * ratio, 5);
            g.fill();
          }

          for (const [id, node] of Array.from(this._mobSprites.entries())) {
            if (!activeIds.has(id)) {
              node.destroy();

              this._mobSprites.delete(id);
            }
          }

          for (const pr of this._projectiles) {
            g.fillColor = pr.color;
            g.circle(pr.x, pr.y, 6);
            g.fill();
          }
        }

      }, _class2._inst = null, _class2)) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=aaf67431da0d2930b6a0a8f2025e5779658ddf67.js.map