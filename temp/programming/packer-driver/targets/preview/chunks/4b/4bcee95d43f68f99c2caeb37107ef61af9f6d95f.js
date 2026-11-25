System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3", "__unresolved_4"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Color, Component, Graphics, input, Input, KeyCode, Label, Layers, Node, Sprite, UITransform, Vec2, GameApp, ArtLoader, AudioManager, BLESSING_POOL, DUNGEON_BIOMES, DUNGEON_IMPLEMENTED_MAX_STAGE, DUNGEON_TOTAL_STAGES, ENEMY_STATS, getStageConfig, WEAPON_TIER_MULT, WEAPON_TIER_NAMES, WEAPON_TIER_UPGRADE_COST, _dec, _class, _class2, _crd, ccclass, ARENA_HALF_W, ARENA_HALF_H, DungeonOverlay;

  function _reportPossibleCrUseOfGameApp(extras) {
    _reporterNs.report("GameApp", "../app/GameApp", _context.meta, extras);
  }

  function _reportPossibleCrUseOfArtLoader(extras) {
    _reporterNs.report("ArtLoader", "../core/ArtLoader", _context.meta, extras);
  }

  function _reportPossibleCrUseOfAudioManager(extras) {
    _reporterNs.report("AudioManager", "../core/AudioManager", _context.meta, extras);
  }

  function _reportPossibleCrUseOfBLESSING_POOL(extras) {
    _reporterNs.report("BLESSING_POOL", "../gameplay/dungeon/DungeonConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfBlessingDef(extras) {
    _reporterNs.report("BlessingDef", "../gameplay/dungeon/DungeonConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfDUNGEON_BIOMES(extras) {
    _reporterNs.report("DUNGEON_BIOMES", "../gameplay/dungeon/DungeonConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfDUNGEON_IMPLEMENTED_MAX_STAGE(extras) {
    _reporterNs.report("DUNGEON_IMPLEMENTED_MAX_STAGE", "../gameplay/dungeon/DungeonConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfDUNGEON_TOTAL_STAGES(extras) {
    _reporterNs.report("DUNGEON_TOTAL_STAGES", "../gameplay/dungeon/DungeonConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfENEMY_STATS(extras) {
    _reporterNs.report("ENEMY_STATS", "../gameplay/dungeon/DungeonConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfEnemyKind(extras) {
    _reporterNs.report("EnemyKind", "../gameplay/dungeon/DungeonConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfgetStageConfig(extras) {
    _reporterNs.report("getStageConfig", "../gameplay/dungeon/DungeonConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfStageConfig(extras) {
    _reporterNs.report("StageConfig", "../gameplay/dungeon/DungeonConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfWEAPON_TIER_MULT(extras) {
    _reporterNs.report("WEAPON_TIER_MULT", "../gameplay/dungeon/DungeonConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfWEAPON_TIER_NAMES(extras) {
    _reporterNs.report("WEAPON_TIER_NAMES", "../gameplay/dungeon/DungeonConfig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfWEAPON_TIER_UPGRADE_COST(extras) {
    _reporterNs.report("WEAPON_TIER_UPGRADE_COST", "../gameplay/dungeon/DungeonConfig", _context.meta, extras);
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
      input = _cc.input;
      Input = _cc.Input;
      KeyCode = _cc.KeyCode;
      Label = _cc.Label;
      Layers = _cc.Layers;
      Node = _cc.Node;
      Sprite = _cc.Sprite;
      UITransform = _cc.UITransform;
      Vec2 = _cc.Vec2;
    }, function (_unresolved_2) {
      GameApp = _unresolved_2.GameApp;
    }, function (_unresolved_3) {
      ArtLoader = _unresolved_3.ArtLoader;
    }, function (_unresolved_4) {
      AudioManager = _unresolved_4.AudioManager;
    }, function (_unresolved_5) {
      BLESSING_POOL = _unresolved_5.BLESSING_POOL;
      DUNGEON_BIOMES = _unresolved_5.DUNGEON_BIOMES;
      DUNGEON_IMPLEMENTED_MAX_STAGE = _unresolved_5.DUNGEON_IMPLEMENTED_MAX_STAGE;
      DUNGEON_TOTAL_STAGES = _unresolved_5.DUNGEON_TOTAL_STAGES;
      ENEMY_STATS = _unresolved_5.ENEMY_STATS;
      getStageConfig = _unresolved_5.getStageConfig;
      WEAPON_TIER_MULT = _unresolved_5.WEAPON_TIER_MULT;
      WEAPON_TIER_NAMES = _unresolved_5.WEAPON_TIER_NAMES;
      WEAPON_TIER_UPGRADE_COST = _unresolved_5.WEAPON_TIER_UPGRADE_COST;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "5d48cJQfyFOi5ahK01jyPhD", "DungeonOverlay", undefined);
      /**
       * 《异界小农场 2.0》60 关元气骑士式动作地牢（第三期终局闭环：1-1~6-10 六大生态 60 关、12 场首领战、本地连穿纪录与 60 关通关成就）
       * - 入口提供「幽墟六十关 · 古碑传送阵」选层界面，支持从已解锁锚点（1-1 / 1-6 / 2-1 / 2-6）直接启程。
       * - 双拇指战斗 HUD + 桌面快捷键（WASD 移动 / J 或 Space 攻击 / K 或 Shift 翻滚 / Q 切武器 / E 丢随身灵植）。
       * - 3 大国风武器瞬切：青竹剑（近战斩弹）、连发符箓枪（高频自瞄）、八卦聚光镜（全屏穿透破盾激光）。
       * - 肉鸽三选一祝福房（X-3 / X-7）、机关宝箱房（X-4 / X-8）、X-5 中途首领与撤离抉择、X-10 双阶段关底首领。
       */


      __checkObsolete__(['_decorator', 'Color', 'Component', 'EventKeyboard', 'EventTouch', 'Graphics', 'input', 'Input', 'KeyCode', 'Label', 'Layers', 'Node', 'Sprite', 'SpriteFrame', 'UITransform', 'Vec2']);

      ({
        ccclass
      } = _decorator);
      ARENA_HALF_W = 470;
      ARENA_HALF_H = 245;

      _export("DungeonOverlay", DungeonOverlay = (_dec = ccclass('DungeonOverlay'), _dec(_class = (_class2 = class DungeonOverlay extends Component {
        constructor() {
          super(...arguments);
          this._panel = void 0;
          this._bgGfx = void 0;
          this._selectorView = void 0;
          this._selectorProgLbl = void 0;
          this._selectorCardsRoot = void 0;
          this._combatView = void 0;
          this._arenaBgNode = void 0;
          this._hasArenaBg = false;
          this._arenaGfx = void 0;
          this._propLayer = void 0;
          this._entityLayer = void 0;
          this._playerSpriteNode = void 0;
          this._doorNode = void 0;
          this._doorLbl = void 0;
          this._crackedWallNode = null;
          this._doorGlowNode = void 0;
          this._chestNode = null;
          this._chestOpenedRendered = false;
          this._spikeNodes = [];
          this._jarNodes = [];
          this._lanternNodes = [];
          this._copperNodes = [];
          this._riftNodes = [];
          this._iceWallNodes = [];
          this._pillarNodes = [];
          this._enemySprites = new Map();
          this._turretSprites = new Map();
          this._nextTurretId = 1;
          this._topLbl = void 0;
          this._buffLbl = void 0;
          this._bossBarNode = void 0;
          this._bossNameLbl = void 0;
          this._bossBarGfx = void 0;
          this._weaponBtnLbl = void 0;
          this._plantBtnLbl = void 0;
          this._choiceBar = void 0;
          this._choiceTitleLbl = void 0;
          this._choiceContinueLbl = void 0;
          this._blessingModal = void 0;
          this._blessingCardsRoot = void 0;
          this._blacksmithModal = void 0;
          this._blacksmithTitleLbl = void 0;
          this._blacksmithCardsRoot = void 0;
          this._joyBase = void 0;
          this._joyKnob = void 0;
          this._animClock = 0;
          this._pMoving = false;
          this._pDir = 'front';
          this._pFacingX = 1;
          this._pAnimTimer = 0;
          this._pAnimIdx = 0;
          this._pWalkFrames = {
            front: [null, null, null, null],
            side: [null, null, null, null],
            back: [null, null, null, null]
          };
          this._pIdleFrames = {};
          this._mobAnimFrames = {};
          this._open = false;
          this._inCombat = false;
          this._stageNum = 1;
          this._stageCfg = void 0;
          this._roomCleared = false;
          this._waitingChoice = false;
          this._waitingBlessing = false;
          this._waitingBlacksmith = false;
          this._keys = new Set();
          this._joyActive = false;
          this._joyOrigin = new Vec2();
          this._joyDir = new Vec2();
          // 玩家战斗态
          this._px = -340;
          this._py = 0;
          this._hp = 100;
          this._maxHp = 100;
          this._mana = 100;
          this._maxMana = 100;
          this._weaponIdx = 0;
          this._weaponTiers = [0, 0, 0];
          this._pvx = 0;
          this._pvy = 0;
          this._rootTimer = 0;
          this._atkCd = 0;
          this._dodgeCd = 0;
          this._dodgeTimer = 0;
          this._dodgeDir = new Vec2(1, 0);
          this._invulnTimer = 0;
          this._facingAngle = 0;
          // 灵膳 Buff 与局内肉鸽祝福
          this._hasBrookSoup = false;
          this._hasEstuarySoup = false;
          this._trialPotatoes = 0;
          this._blessings = new Set();
          // 局内战利品
          this._lootGold = 0;
          this._lootIron = 0;
          this._lootSeeds = [];
          // 实体与地形机关池
          this._nextEnemyId = 1;
          this._enemies = [];
          this._bullets = [];
          this._turrets = [];
          this._pillars = [];
          this._crackedWall = null;
          this._spikes = [];
          this._magmaRings = [];
          this._magmaSpawnCd = 0;
          this._jars = [];
          this._firePools = [];
          this._bossLasers = [];
          this._lavaRimActive = false;
          this._chest = null;
          this._lasers = [];
          this._slashes = [];
          this._booms = [];
          this._frostWindCd = 0;
          this._frostWindActiveTimer = 0;
          this._iceWalls = [];
          this._nextIceWallId = 1;
          this._icicles = [];
          this._frostPools = [];
          this._poisonPools = [];
          this._lanterns = [];
          this._lightnings = [];
          this._copperPillars = [];
          this._copperArcCycle = 0;
          this._copperBoostTimer = 0;
          this._thunderZones = [];
          this._lightningRods = [];
          this._nextRodId = 1;
          this._riftVortices = [];
          this._sealAngle = 0;
          this._riftOrbs = [];
          this._nextOrbId = 1;
          this._runClearedCount = 0;
          this._onToast = null;
        }

        static get inst() {
          return this._inst;
        }

        get isOpen() {
          return this._open;
        }

        onLoad() {
          DungeonOverlay._inst = this;

          this._buildUI();

          this._preloadAnims();

          this._panel.active = false;
          input.on(Input.EventType.KEY_DOWN, this._onKeyDown, this);
          input.on(Input.EventType.KEY_UP, this._onKeyUp, this);
        }

        _preloadAnims() {
          var _this = this;

          ['front', 'side', 'back'].forEach(dir => {
            void (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
              error: Error()
            }), ArtLoader) : ArtLoader).loadSpriteFrame("char_player_" + dir).then(sf => {
              if (sf) this._pIdleFrames[dir] = sf;
            });

            var _loop = function _loop(i) {
              void (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
                error: Error()
              }), ArtLoader) : ArtLoader).loadSpriteFrame("char_walk_" + dir + "_" + i).then(sf => {
                if (sf) _this._pWalkFrames[dir][i] = sf;
              });
            };

            for (var i = 0; i < 4; i++) {
              _loop(i);
            }
          });
          var prefixes = ['mob_bamboo', 'mob_ink_fly', 'mob_golem', 'mob_boss', 'mob_burrow_mole', 'mob_leap_fox'];

          var _loop2 = function _loop2(pre) {
            _this._mobAnimFrames[pre] = [null, null, null, null];

            var _loop3 = function _loop3(i) {
              void (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
                error: Error()
              }), ArtLoader) : ArtLoader).loadSpriteFrame(pre + "_" + i).then(sf => {
                if (sf) _this._mobAnimFrames[pre][i] = sf;
              });
            };

            for (var i = 0; i < 4; i++) {
              _loop3(i);
            }
          };

          for (var pre of prefixes) {
            _loop2(pre);
          }
        }

        onDestroy() {
          if (DungeonOverlay._inst === this) DungeonOverlay._inst = null;
          input.off(Input.EventType.KEY_DOWN, this._onKeyDown, this);
          input.off(Input.EventType.KEY_UP, this._onKeyUp, this);
        }

        _uiNode(name, parent) {
          var n = new Node(name);
          n.layer = Layers.Enum.UI_2D;
          n.parent = parent;
          return n;
        }

        _drawBtn(parent, name, x, y, w, h, text, bg, onTap, fontSize) {
          if (fontSize === void 0) {
            fontSize = 15;
          }

          var btn = this._uiNode(name, parent);

          btn.addComponent(UITransform).setContentSize(w, h);
          btn.setPosition(x, y, 0);
          var artKey = name === 'BtnAtk' ? 'ui_dng_btn_atk' : name === 'BtnDodge' ? 'ui_dng_btn_dodge' : 'ui_dng_btn_rect';
          (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
            error: Error()
          }), ArtLoader) : ArtLoader).applySprite(btn, artKey, w, h, () => {
            var _btn$getChildByName;

            var sp = (_btn$getChildByName = btn.getChildByName('ArtSprite')) == null ? void 0 : _btn$getChildByName.getComponent(Sprite);

            if (sp && artKey === 'ui_dng_btn_rect') {
              var isRed = bg.r > bg.g + 30;
              var isAmber = bg.r > 150 && bg.g > 100 && bg.b < 90;
              sp.color = isRed ? new Color(235, 168, 152, 255) : isAmber ? new Color(246, 214, 146, 255) : new Color(228, 246, 236, 255);
            }
          });

          var l = this._uiNode('Lbl', btn).addComponent(Label);

          l.string = text;
          l.fontSize = fontSize;
          l.lineHeight = fontSize + 5;
          l.color = new Color(252, 248, 238, 255);
          btn.on(Node.EventType.TOUCH_END, onTap, this);
          return l;
        }

        _buildUI() {
          this._panel = this._uiNode('DungeonPanel', this.node);

          this._panel.addComponent(UITransform).setContentSize(1280, 720);

          this._bgGfx = this._panel.addComponent(Graphics);

          this._paintBackdrop([18, 32, 30]); // ===== 1. 六十关选层传送阵视图 =====


          this._selectorView = this._uiNode('SelectorView', this._panel);

          this._selectorView.addComponent(UITransform).setContentSize(1280, 720);

          var titleLbl = this._uiNode('SelTitle', this._selectorView).addComponent(Label);

          titleLbl.node.setPosition(0, 305, 0);
          titleLbl.string = '幽墟六十关 · 古碑传送阵';
          titleLbl.fontSize = 30;
          titleLbl.color = new Color(246, 236, 206, 255);
          this._selectorProgLbl = this._uiNode('SelProg', this._selectorView).addComponent(Label);

          this._selectorProgLbl.node.setPosition(0, 265, 0);

          this._selectorProgLbl.fontSize = 15;
          this._selectorProgLbl.color = new Color(156, 226, 206, 255);
          this._selectorCardsRoot = this._uiNode('SelCards', this._selectorView);

          this._drawBtn(this._selectorView, 'BtnCloseSel', 0, -302, 210, 46, '返回主岛', new Color(108, 76, 62, 255), () => {
            this._open = false;
            this._panel.active = false;
            (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
              error: Error()
            }), AudioManager) : AudioManager).inst.playBgm('overworld');
          }, 17); // ===== 2. 战斗视图 =====


          this._combatView = this._uiNode('CombatView', this._panel);

          this._combatView.addComponent(UITransform).setContentSize(1280, 720); // 竞技场专属手绘底图节点（位于 ArenaCanvas 之下，6 大生态各配独立手绘地牢底图）


          this._arenaBgNode = this._uiNode('ArenaBg', this._combatView);

          this._arenaBgNode.addComponent(UITransform).setContentSize(ARENA_HALF_W * 2, ARENA_HALF_H * 2);

          this._arenaBgNode.setPosition(-46, -18, 0);

          var arena = this._uiNode('ArenaCanvas', this._combatView);

          arena.addComponent(UITransform).setContentSize(ARENA_HALF_W * 2, ARENA_HALF_H * 2);
          arena.setPosition(-46, -18, 0);
          this._arenaGfx = arena.addComponent(Graphics);
          this._propLayer = this._uiNode('PropLayer', arena);
          this._entityLayer = this._uiNode('EntityLayer', arena); // 东侧石门手绘青玉八卦光环（位于石门背后）

          this._doorGlowNode = this._uiNode('EastDoorGlow', arena);

          this._doorGlowNode.setPosition(ARENA_HALF_W - 22, 0, 0);

          (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
            error: Error()
          }), ArtLoader) : ArtLoader).applySprite(this._doorGlowNode, 'dng_portal_glow', 118, 118);
          this._doorGlowNode.active = false; // 东侧石门

          this._doorNode = this._uiNode('EastDoor', arena);

          this._doorNode.setPosition(ARENA_HALF_W - 22, 0, 0);

          (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
            error: Error()
          }), ArtLoader) : ArtLoader).applySprite(this._doorNode, 'dng_door', 62, 112);
          this._doorLbl = this._uiNode('DoorLbl', this._doorNode).addComponent(Label);

          this._doorLbl.node.setPosition(0, -68, 0);

          this._doorLbl.fontSize = 12;
          this._doorLbl.color = new Color(152, 238, 220, 255); // 主角手绘精灵

          this._playerSpriteNode = this._uiNode('DungeonPlayer', this._entityLayer);
          (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
            error: Error()
          }), ArtLoader) : ArtLoader).applySprite(this._playerSpriteNode, 'char_player_front', 50, 62); // 顶部状态栏

          this._topLbl = this._uiNode('TopHud', this._combatView).addComponent(Label);

          this._topLbl.node.setPosition(-60, 326, 0);

          this._topLbl.fontSize = 19;
          this._topLbl.color = new Color(248, 240, 220, 255);
          this._buffLbl = this._uiNode('BuffHud', this._combatView).addComponent(Label);

          this._buffLbl.node.setPosition(-60, 294, 0);

          this._buffLbl.fontSize = 13;
          this._buffLbl.color = new Color(164, 232, 212, 255); // 首领专属大血条（位于竞技场顶部）

          this._bossBarNode = this._uiNode('BossBar', this._combatView);

          this._bossBarNode.setPosition(-46, 252, 0);

          this._bossBarGfx = this._bossBarNode.addComponent(Graphics);
          this._bossNameLbl = this._uiNode('BossName', this._bossBarNode).addComponent(Label);

          this._bossNameLbl.node.setPosition(0, 14, 0);

          this._bossNameLbl.fontSize = 14;
          this._bossNameLbl.color = new Color(255, 224, 152, 255);
          this._bossBarNode.active = false;

          this._drawBtn(this._combatView, 'BtnRetreat', 548, 318, 134, 38, '撤回主岛', new Color(142, 72, 58, 255), () => this._finishRun(false, '主动撤出古墟，带回当前战利品'), 15); // 左半屏虚拟摇杆


          var joyZone = this._uiNode('JoyZone', this._combatView);

          joyZone.addComponent(UITransform).setContentSize(520, 480);
          joyZone.setPosition(-380, -100, 0);
          joyZone.on(Node.EventType.TOUCH_START, e => {
            this._joyActive = true;

            this._joyOrigin.set(e.getUILocation());

            this._joyDir.set(0, 0);

            this._joyBase.active = true;

            this._joyBase.setPosition(this._joyOrigin.x - 640, this._joyOrigin.y - 360, 0);

            this._joyKnob.setPosition(0, 0, 0);
          }, this);
          joyZone.on(Node.EventType.TOUCH_MOVE, e => {
            if (!this._joyActive) return;
            var cur = e.getUILocation();
            var dx = cur.x - this._joyOrigin.x;
            var dy = cur.y - this._joyOrigin.y;
            var len = Math.hypot(dx, dy);
            var maxR = 52;

            if (len > 4) {
              var c = Math.min(len, maxR);

              this._joyDir.set(dx / len, dy / len);

              this._joyKnob.setPosition(dx / len * c, dy / len * c, 0);
            }
          }, this);

          var endJoy = () => {
            this._joyActive = false;

            this._joyDir.set(0, 0);

            this._joyBase.active = false;
          };

          joyZone.on(Node.EventType.TOUCH_END, endJoy, this);
          joyZone.on(Node.EventType.TOUCH_CANCEL, endJoy, this);
          this._joyBase = this._uiNode('JoyBase', this._combatView);

          var jbG = this._joyBase.addComponent(Graphics);

          jbG.fillColor = new Color(255, 255, 255, 45);
          jbG.strokeColor = new Color(255, 255, 255, 110);
          jbG.lineWidth = 2;
          jbG.circle(0, 0, 52);
          jbG.fill();
          jbG.stroke();
          this._joyKnob = this._uiNode('JoyKnob', this._joyBase);

          var jkG = this._joyKnob.addComponent(Graphics);

          jkG.fillColor = new Color(110, 224, 192, 180);
          jkG.circle(0, 0, 22);
          jkG.fill();
          this._joyBase.active = false; // 右侧独立战斗按键区（与竞技场、东侧石门完全分离不重叠）

          this._weaponBtnLbl = this._drawBtn(this._combatView, 'BtnSwitch', 548, -42, 114, 54, '青竹剑\n(Q切)', new Color(68, 134, 108, 240), () => this._switchWeapon(), 14);
          this._plantBtnLbl = this._drawBtn(this._combatView, 'BtnPlant', 548, -112, 114, 56, '灵植\n(E丢)', new Color(184, 128, 48, 240), () => this._usePortablePlant(), 13);

          this._drawBtn(this._combatView, 'BtnAtk', 552, -226, 112, 112, '攻击\n(J)', new Color(196, 82, 54, 240), () => this._doAttack(), 17);

          this._drawBtn(this._combatView, 'BtnDodge', 454, -262, 78, 78, '翻滚\n(K)', new Color(66, 138, 168, 240), () => this._doDodge(), 14); // X-5 / X-10 首领战后抉择条


          this._choiceBar = this._uiNode('ChoiceBar', this._combatView);

          this._choiceBar.setPosition(0, 12, 0);

          var cbG = this._choiceBar.addComponent(Graphics);

          cbG.fillColor = new Color(24, 38, 36, 244);
          cbG.strokeColor = new Color(218, 182, 104, 240);
          cbG.lineWidth = 3;
          cbG.roundRect(-295, -96, 590, 192, 16);
          cbG.fill();
          cbG.stroke();
          this._choiceTitleLbl = this._uiNode('ChoiceTitle', this._choiceBar).addComponent(Label);

          this._choiceTitleLbl.node.setPosition(0, 44, 0);

          this._choiceTitleLbl.fontSize = 18;
          this._choiceTitleLbl.lineHeight = 26;
          this._choiceTitleLbl.color = new Color(252, 242, 214, 255);

          this._drawBtn(this._choiceBar, 'BtnCashOut', -138, -36, 224, 52, '带着全额战利品撤回', new Color(66, 138, 108, 255), () => {
            this._waitingChoice = false;
            this._choiceBar.active = false;

            this._finishRun(true, "\u4E8E " + this._stageCfg.label + " \u89C1\u597D\u5C31\u6536\u5B89\u5168\u64A4\u79BB");
          }, 15);

          this._choiceContinueLbl = this._drawBtn(this._choiceBar, 'BtnContinue', 138, -36, 224, 52, '继续深入下一关', new Color(188, 92, 48, 255), () => {
            this._waitingChoice = false;
            this._choiceBar.active = false;

            this._startStage(this._stageNum + 1);
          }, 15);
          this._choiceBar.active = false; // 古碑三选一祝福弹窗

          this._blessingModal = this._uiNode('BlessingModal', this._combatView);

          this._blessingModal.setPosition(0, 0, 0);

          var bmG = this._blessingModal.addComponent(Graphics);

          bmG.fillColor = new Color(16, 26, 26, 244);
          bmG.strokeColor = new Color(112, 226, 192, 235);
          bmG.lineWidth = 3;
          bmG.roundRect(-450, -175, 900, 350, 18);
          bmG.fill();
          bmG.stroke();

          var bmTitle = this._uiNode('BlessTitle', this._blessingModal).addComponent(Label);

          bmTitle.node.setPosition(0, 128, 0);
          bmTitle.string = '古碑灵纹显现 · 请择一祝福（本局永久生效）';
          bmTitle.fontSize = 22;
          bmTitle.color = new Color(148, 244, 214, 255);
          this._blessingCardsRoot = this._uiNode('BlessCards', this._blessingModal);
          this._blessingModal.active = false; // 神秘铁匠房弹窗（武器升阶：凡铁 → 青灵 → 玄玉 → 天罡）

          this._blacksmithModal = this._uiNode('BlacksmithModal', this._combatView);

          this._blacksmithModal.setPosition(0, 0, 0);

          var bsG = this._blacksmithModal.addComponent(Graphics);

          bsG.fillColor = new Color(22, 20, 28, 246);
          bsG.strokeColor = new Color(238, 186, 98, 235);
          bsG.lineWidth = 3;
          bsG.roundRect(-450, -195, 900, 390, 18);
          bsG.fill();
          bsG.stroke();
          this._blacksmithTitleLbl = this._uiNode('BsTitle', this._blacksmithModal).addComponent(Label);

          this._blacksmithTitleLbl.node.setPosition(0, 148, 0);

          this._blacksmithTitleLbl.fontSize = 21;
          this._blacksmithTitleLbl.color = new Color(252, 224, 152, 255);
          this._blacksmithCardsRoot = this._uiNode('BsCards', this._blacksmithModal);

          this._drawBtn(this._blacksmithModal, 'BtnLeaveBs', 0, -152, 248, 46, '离开铁匠铺（进入下一关）', new Color(66, 138, 108, 255), () => {
            this._waitingBlacksmith = false;
            this._blacksmithModal.active = false;

            if (this._stageNum < (_crd && DUNGEON_IMPLEMENTED_MAX_STAGE === void 0 ? (_reportPossibleCrUseOfDUNGEON_IMPLEMENTED_MAX_STAGE({
              error: Error()
            }), DUNGEON_IMPLEMENTED_MAX_STAGE) : DUNGEON_IMPLEMENTED_MAX_STAGE)) {
              var _this$_onToast;

              this._startStage(this._stageNum + 1);

              (_this$_onToast = this._onToast) == null || _this$_onToast.call(this, "\u8F9E\u522B\u94C1\u5320\uFF0C\u5DF2\u76F4\u5165 " + this._stageCfg.label + " \u6218\u6597\u623F\uFF01");
            } else {
              this._roomCleared = true;
              this._doorLbl.string = '石门已开 →';
            }
          }, 15);

          this._blacksmithModal.active = false;
        }

        _paintBackdrop(rgb) {
          this._bgGfx.clear();

          this._bgGfx.fillColor = new Color(rgb[0], rgb[1], rgb[2], 252);

          this._bgGfx.rect(-640, -360, 1280, 720);

          this._bgGfx.fill();
        }
        /** 读取并兼容旧存档的已解锁锚点 */


        _getUnlockedAnchors() {
          var _dng$highestClearedSt;

          var app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          var set = new Set([1]);
          if (!(app != null && app.ready)) return set;
          var dng = app.saveData.dungeon;

          for (var a of (_dng$unlockedAnchors = dng.unlockedAnchors) != null ? _dng$unlockedAnchors : []) {
            var _dng$unlockedAnchors;

            set.add(a);
          }

          var highest = (_dng$highestClearedSt = dng.highestClearedStage) != null ? _dng$highestClearedSt : dng.deepestLayer >= 1 ? 10 : 0;
          if (highest >= 5) set.add(6);
          if (highest >= 10) set.add(11);
          if (highest >= 15) set.add(16);
          if (highest >= 20) set.add(21);
          if (highest >= 25) set.add(26);
          if (highest >= 30) set.add(31);
          if (highest >= 35) set.add(36);
          if (highest >= 40) set.add(41);
          if (highest >= 45) set.add(46);
          if (highest >= 50) set.add(51);
          if (highest >= 55) set.add(56);
          return set;
        }

        _unlockAnchor(stage) {
          var app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return;

          var set = this._getUnlockedAnchors();

          set.add(stage);
          app.saveData.dungeon.unlockedAnchors = Array.from(set).sort((a, b) => a - b);
        }

        open(onToast) {
          var app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return;
          this._onToast = onToast != null ? onToast : null;
          this._open = true;
          this._inCombat = false;
          this._panel.active = true;

          this._panel.setSiblingIndex(this.node.children.length - 1);

          this._selectorView.active = true;
          this._combatView.active = false;

          this._keys.clear();

          this._paintBackdrop([18, 30, 28]);

          this._renderSelectorCards();

          (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
            error: Error()
          }), AudioManager) : AudioManager).inst.playBgm('dungeon');
        }

        _renderSelectorCards() {
          var _dng$highestClearedSt2, _dng$deepestLayer, _dng$bestStreak;

          this._selectorCardsRoot.removeAllChildren();

          var app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          var dng = app == null ? void 0 : app.saveData.dungeon;
          var highest = (_dng$highestClearedSt2 = dng == null ? void 0 : dng.highestClearedStage) != null ? _dng$highestClearedSt2 : ((_dng$deepestLayer = dng == null ? void 0 : dng.deepestLayer) != null ? _dng$deepestLayer : 0) >= 1 ? 10 : 0;

          var anchors = this._getUnlockedAnchors();

          var bestStreak = (_dng$bestStreak = dng == null ? void 0 : dng.bestStreak) != null ? _dng$bestStreak : 0;
          var badge = dng != null && dng.grandCleared || highest >= (_crd && DUNGEON_TOTAL_STAGES === void 0 ? (_reportPossibleCrUseOfDUNGEON_TOTAL_STAGES({
            error: Error()
          }), DUNGEON_TOTAL_STAGES) : DUNGEON_TOTAL_STAGES) ? ' · 【全境六十关制霸】' : '';
          this._selectorProgLbl.string = "\u5F53\u524D\u63A8\u8FDB\uFF1A\u5DF2\u901A " + highest + " / " + (_crd && DUNGEON_TOTAL_STAGES === void 0 ? (_reportPossibleCrUseOfDUNGEON_TOTAL_STAGES({
            error: Error()
          }), DUNGEON_TOTAL_STAGES) : DUNGEON_TOTAL_STAGES) + " \u5173 \xB7 \u6700\u4F73\u5355\u5C40\u8FDE\u7A7F " + bestStreak + " \u5173" + badge;
          var cardW = 368;
          var cardH = 228;
          var gapX = 24;
          var gapY = 22;
          var startX = -(cardW + gapX);
          var startY = 122;
          (_crd && DUNGEON_BIOMES === void 0 ? (_reportPossibleCrUseOfDUNGEON_BIOMES({
            error: Error()
          }), DUNGEON_BIOMES) : DUNGEON_BIOMES).forEach((b, idx) => {
            var col = idx % 3;
            var row = Math.floor(idx / 3);
            var cx = startX + col * (cardW + gapX);
            var cy = startY - row * (cardH + gapY);

            var card = this._uiNode("BiomeCard_" + b.chapter, this._selectorCardsRoot);

            card.setPosition(cx, cy, 0);
            (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
              error: Error()
            }), ArtLoader) : ArtLoader).applySprite(card, 'ui_dng_card_bg', cardW, cardH, () => {
              var _card$getChildByName;

              var sp = (_card$getChildByName = card.getChildByName('ArtSprite')) == null ? void 0 : _card$getChildByName.getComponent(Sprite);

              if (sp) {
                sp.color = b.implemented ? new Color(Math.min(255, b.borderRgb[0] + 95), Math.min(255, b.borderRgb[1] + 95), Math.min(255, b.borderRgb[2] + 95), 255) : new Color(130, 135, 138, 175);
              }
            });

            var nameLbl = this._uiNode('Name', card).addComponent(Label);

            nameLbl.node.setPosition(0, 82, 0);
            nameLbl.string = "\u7B2C " + b.chapter + " \u5927\u5173 \xB7 " + b.name;
            nameLbl.fontSize = 20;
            nameLbl.color = new Color(252, 245, 224, 255);

            var subLbl = this._uiNode('Sub', card).addComponent(Label);

            subLbl.node.setPosition(0, 50, 0);
            subLbl.node.addComponent(UITransform).setContentSize(282, 22);
            subLbl.overflow = Label.Overflow.SHRINK;
            subLbl.string = b.subtitle;
            subLbl.fontSize = 12;
            subLbl.color = new Color(204, 232, 220, 240);

            var infoLbl = this._uiNode('Info', card).addComponent(Label);

            infoLbl.node.setPosition(0, 6, 0);
            infoLbl.node.addComponent(UITransform).setContentSize(282, 54);
            infoLbl.overflow = Label.Overflow.CLAMP;
            infoLbl.enableWrapText = true;
            infoLbl.string = "\u673A\u5173\uFF1A" + b.hazardDesc + "\n\u9996\u9886\uFF1A" + b.midBossName + " / " + b.finalBossName;
            infoLbl.fontSize = 12;
            infoLbl.lineHeight = 18;
            infoLbl.color = new Color(235, 224, 202, 235);

            if (b.implemented) {
              var startAnchor = (b.chapter - 1) * 10 + 1;
              var midAnchor = (b.chapter - 1) * 10 + 6;
              var canStart = anchors.has(startAnchor);
              var canMid = anchors.has(midAnchor);

              this._drawBtn(card, "Start_" + startAnchor, -72, -62, 134, 40, canStart ? "\u4ECE " + b.chapter + "-1 \u542F\u7A0B" : "\u9700\u901A " + (b.chapter - 1) + "-10 \u89E3\u9501", canStart ? new Color(62, 148, 118, 255) : new Color(76, 76, 76, 200), () => {
                var _this$_onToast2;

                if (canStart) this._beginRunFromStage(startAnchor);else (_this$_onToast2 = this._onToast) == null || _this$_onToast2.call(this, "\u5148\u51FB\u8D25\u7B2C " + (b.chapter - 1) + " \u5927\u5173\u9996\u9886\u89E3\u9501 " + b.chapter + "-1 \u4F20\u9001\u951A\u70B9\uFF01");
              }, 13);

              this._drawBtn(card, "Mid_" + midAnchor, 72, -62, 134, 40, canMid ? "\u4ECE " + b.chapter + "-6 \u6DF1\u5165" : "\u9700\u901A " + b.chapter + "-5 \u89E3\u9501", canMid ? new Color(188, 108, 52, 255) : new Color(76, 76, 76, 200), () => {
                var _this$_onToast3;

                if (canMid) this._beginRunFromStage(midAnchor);else (_this$_onToast3 = this._onToast) == null || _this$_onToast3.call(this, "\u51FB\u8D25 " + b.chapter + "-5\u300C" + b.midBossName + "\u300D\u5373\u53EF\u89E3\u9501\u534A\u7A0B\u4F20\u9001\u951A\u70B9\uFF01");
              }, 13);
            } else {
              var lockLbl = this._uiNode('LockLbl', card).addComponent(Label);

              lockLbl.node.setPosition(0, -64, 0);
              lockLbl.string = b.chapter <= 4 ? '第二期生态 · 敬请期待' : '第三期终局生态 · 敬请期待';
              lockLbl.fontSize = 14;
              lockLbl.color = new Color(186, 186, 178, 210);
            }
          });
        }

        _beginRunFromStage(startStage) {
          var _app$saveData$invento, _app$saveData$invento2, _app$saveData$invento3, _app$saveData$invento4;

          var app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return;
          this._selectorView.active = false;
          this._combatView.active = true;
          this._inCombat = true; // 消耗灵膳（每局下本自动启用）

          this._hasBrookSoup = false;
          this._hasEstuarySoup = false;

          if (((_app$saveData$invento = app.saveData.inventory['dish_brook_soup']) != null ? _app$saveData$invento : 0) > 0) {
            app.addItem('dish_brook_soup', -1);
            this._hasBrookSoup = true;
          }

          if (((_app$saveData$invento2 = app.saveData.inventory['dish_estuary_soup']) != null ? _app$saveData$invento2 : 0) > 0) {
            app.addItem('dish_estuary_soup', -1);
            this._hasEstuarySoup = true;
          }

          var ownedPotato = (_app$saveData$invento3 = app.saveData.inventory['thunder_potato']) != null ? _app$saveData$invento3 : 0;
          var ownedShoot = (_app$saveData$invento4 = app.saveData.inventory['cloud_bamboo_shoot']) != null ? _app$saveData$invento4 : 0;
          this._trialPotatoes = ownedPotato === 0 && ownedShoot === 0 ? 2 : 0;
          this._maxHp = 100;
          this._hp = this._maxHp;
          this._maxMana = 100;
          this._mana = this._maxMana;
          this._weaponIdx = 0;
          this._weaponTiers = [0, 0, 0];
          this._pvx = 0;
          this._pvy = 0;
          this._rootTimer = 0;
          this._lootGold = 0;
          this._lootIron = 0;
          this._lootSeeds = [];
          this._runClearedCount = 0;

          this._blessings.clear();

          this._waitingChoice = false;
          this._waitingBlessing = false;
          this._waitingBlacksmith = false;
          this._choiceBar.active = false;
          this._blessingModal.active = false;
          this._blacksmithModal.active = false;

          this._refreshButtonLabels();

          this._startStage(startStage);
        }

        _startStage(stageNum) {
          this._stageNum = stageNum;
          this._stageCfg = (_crd && getStageConfig === void 0 ? (_reportPossibleCrUseOfgetStageConfig({
            error: Error()
          }), getStageConfig) : getStageConfig)(stageNum);
          var cfg = this._stageCfg;
          var biomeBgMap = {
            bamboo_ruins: {
              key: 'bg_dungeon_bamboo',
              tint: new Color(242, 248, 244, 255)
            },
            magma_cavern: {
              key: 'bg_dungeon_magma',
              tint: new Color(248, 238, 232, 255)
            },
            frost_palace: {
              key: 'bg_dungeon_frost',
              tint: new Color(242, 248, 255, 255)
            },
            mist_marsh: {
              key: 'bg_dungeon_mist',
              tint: new Color(240, 244, 240, 255)
            },
            thunder_pagoda: {
              key: 'bg_dungeon_thunder',
              tint: new Color(250, 242, 228, 255)
            },
            rift_altar: {
              key: 'bg_dungeon_rift',
              tint: new Color(236, 246, 255, 255)
            }
          };
          var bgInfo = biomeBgMap[cfg.biome.id];

          if (bgInfo && this._arenaBgNode) {
            this._hasArenaBg = true;
            this._arenaBgNode.active = true;
            (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
              error: Error()
            }), ArtLoader) : ArtLoader).applySprite(this._arenaBgNode, bgInfo.key, ARENA_HALF_W * 2, ARENA_HALF_H * 2, () => {
              var _this$_arenaBgNode;

              var sp = (_this$_arenaBgNode = this._arenaBgNode) == null || (_this$_arenaBgNode = _this$_arenaBgNode.getChildByName('ArtSprite')) == null ? void 0 : _this$_arenaBgNode.getComponent(Sprite);
              if (sp) sp.color = bgInfo.tint;
            });
          } else {
            this._hasArenaBg = false;
            if (this._arenaBgNode) this._arenaBgNode.active = false;
          }

          this._roomCleared = false;
          this._waitingChoice = false;
          this._waitingBlessing = false;
          this._waitingBlacksmith = false;
          this._choiceBar.active = false;
          this._blessingModal.active = false;
          this._blacksmithModal.active = false;
          this._px = -345;
          this._py = 0;
          this._pvx = 0;
          this._pvy = 0;
          this._rootTimer = 0;
          this._enemies = [];
          this._bullets = [];
          this._turrets = [];
          this._lasers = [];
          this._slashes = [];
          this._booms = [];
          this._pillars = [];
          this._pillarNodes = [];
          this._crackedWall = null;
          this._spikes = [];
          this._magmaRings = [];
          this._magmaSpawnCd = cfg.magmaInterval > 0 ? 1.8 : 0;
          this._jars = [];
          this._firePools = [];
          this._bossLasers = [];
          this._lavaRimActive = false;
          this._chest = null;
          this._frostWindCd = cfg.frostWindInterval > 0 ? 3.2 : 0;
          this._frostWindActiveTimer = 0;
          this._iceWalls = [];
          this._icicles = [];
          this._frostPools = [];
          this._poisonPools = [];
          this._lanterns = [];
          this._lightnings = [];
          this._copperPillars = [];
          this._copperArcCycle = 0;
          this._copperBoostTimer = 0;
          this._thunderZones = [];
          this._lightningRods = [];
          this._riftVortices = [];
          this._sealAngle = 0;
          this._riftOrbs = [];

          this._propLayer.removeAllChildren();

          this._crackedWallNode = null;
          this._chestNode = null;
          this._chestOpenedRendered = false;
          this._spikeNodes = [];
          this._jarNodes = [];
          this._lanternNodes = [];
          this._copperNodes = [];
          this._riftNodes = [];
          this._iceWallNodes = [];
          if (this._doorGlowNode) this._doorGlowNode.active = false;

          for (var n of this._enemySprites.values()) n.destroy();

          this._enemySprites.clear();

          for (var _n of this._turretSprites.values()) _n.destroy();

          this._turretSprites.clear();

          this._paintBackdrop(cfg.biome.bgTintRgb); // 生成石柱掩体


          for (var [px, py] of cfg.pillars) {
            this._pillars.push({
              x: px,
              y: py,
              rx: 28,
              ry: 28
            });

            var pn = this._uiNode('Pillar', this._propLayer);

            pn.setPosition(px, py + 12, 0);
            (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
              error: Error()
            }), ArtLoader) : ArtLoader).applySprite(pn, 'dng_pillar', 34, 86);

            this._pillarNodes.push(pn);
          } // 北墙可炸裂石墙


          if (cfg.hasCrackedWall) {
            this._crackedWall = {
              x: 20,
              y: ARENA_HALF_H - 18,
              broken: false
            };

            var wn = this._uiNode('CrackedWall', this._propLayer);

            wn.setPosition(this._crackedWall.x, this._crackedWall.y, 0);
            (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
              error: Error()
            }), ArtLoader) : ArtLoader).applySprite(wn, 'dng_cracked_wall', 78, 86);

            var wl = this._uiNode('WLbl', wn).addComponent(Label);

            wl.node.setPosition(0, -46, 0);
            wl.string = '裂纹石墙(E丢雷火薯炸开)';
            wl.fontSize = 11;
            wl.color = new Color(252, 208, 128, 240);
            this._crackedWallNode = wn;
          } // 第 1 大关：枯竹刺陷阱


          if (cfg.spikeCount > 0) {
            var slots = [[0, 75], [0, -75], [210, 0]];

            for (var i = 0; i < cfg.spikeCount && i < slots.length; i++) {
              this._spikes.push({
                x: slots[i][0],
                y: slots[i][1],
                r: 34,
                cycle: i * 1.4
              });
            }
          } // 第 2 大关：爆裂火药陶罐


          if (cfg.jarCount > 0) {
            var jSlots = [[120, 70], [120, -70]];

            for (var _i = 0; _i < cfg.jarCount && _i < jSlots.length; _i++) {
              this._jars.push({
                x: jSlots[_i][0],
                y: jSlots[_i][1],
                r: 22,
                exploded: false
              });
            }
          } // 第 4 大关：驱雾古灯（2 盏）+ 毒沼泥潭


          if (cfg.hasMistFog) {
            this._lanterns.push({
              x: -120,
              y: 125,
              lit: false
            }, {
              x: 150,
              y: -125,
              lit: false
            });
          }

          if (cfg.poisonPoolCount > 0) {
            var pSlots = [[30, 85], [30, -85], [220, 0]];

            for (var _i2 = 0; _i2 < cfg.poisonPoolCount && _i2 < pSlots.length; _i2++) {
              this._poisonPools.push({
                x: pSlots[_i2][0],
                y: pSlots[_i2][1],
                r: 44,
                life: 999,
                permanent: true
              });
            }
          } // 第 5 大关：导电铜雷柱


          if (cfg.copperPillarCount > 0) {
            var cSlots = [[-70, 125], [150, -125], [150, 125]];

            for (var _i3 = 0; _i3 < cfg.copperPillarCount && _i3 < cSlots.length; _i3++) {
              this._copperPillars.push({
                x: cSlots[_i3][0],
                y: cSlots[_i3][1],
                r: 22
              });
            }
          } // 第 6 大关：时空裂隙旋涡


          if (cfg.riftVortexCount > 0) {
            var rSlots = [[40, 0], [-110, 110]];

            for (var _i4 = 0; _i4 < cfg.riftVortexCount && _i4 < rSlots.length; _i4++) {
              this._riftVortices.push({
                x: rSlots[_i4][0],
                y: rSlots[_i4][1],
                r: 58,
                phase: _i4 * 2.1
              });
            }
          } // 按房间类型初始化


          if (cfg.roomKind === 'blessing') {
            this._doorLbl.string = '择祝福开门';

            this._openBlessingModal();
          } else if (cfg.roomKind === 'blacksmith') {
            this._doorLbl.string = '锻造开门';

            this._openBlacksmithModal();
          } else if (cfg.roomKind === 'chest') {
            var _this$_onToast4;

            this._chest = {
              x: 20,
              y: 0,
              opened: false
            };

            if (cfg.chapter === 1) {
              this._spikes.push({
                x: -70,
                y: 0,
                r: 32,
                cycle: 0
              }, {
                x: 110,
                y: 0,
                r: 32,
                cycle: 1.8
              });
            } else if (cfg.chapter === 2) {
              this._magmaSpawnCd = 1.6;
            } else if (cfg.chapter === 3) {
              this._frostPools.push({
                x: -65,
                y: 0,
                r: 52,
                life: 999
              }, {
                x: 105,
                y: 0,
                r: 52,
                life: 999
              });
            } else if (cfg.chapter === 4) {
              this._poisonPools.push({
                x: -65,
                y: 40,
                r: 40,
                life: 999,
                permanent: true
              }, {
                x: 105,
                y: -40,
                r: 40,
                life: 999,
                permanent: true
              });
            } else if (cfg.chapter === 5) {
              this._copperPillars.push({
                x: -85,
                y: 95,
                r: 22
              }, {
                x: 125,
                y: -95,
                r: 22
              });
            } else {
              this._riftVortices.push({
                x: -95,
                y: 0,
                r: 52,
                phase: 0
              }, {
                x: 135,
                y: 0,
                r: 52,
                phase: 1.5
              });
            }

            this._doorLbl.string = '开启宝箱';
            (_this$_onToast4 = this._onToast) == null || _this$_onToast4.call(this, cfg.label + " \u673A\u5173\u5B9D\u7BB1\u623F\uFF1A\u8EB2\u5F00\u9677\u9631\u8D70\u8FD1\u4E2D\u592E\u53E4\u7389\u5B9D\u7BB1\uFF01");
          } else {
            this._doorLbl.string = '清怪开门';

            for (var sp of cfg.spawns) {
              this._spawnEnemy(sp.kind, sp.x, sp.y, Boolean(sp.elite));
            }

            if (cfg.roomKind === 'elite_bounty') {
              var _this$_onToast5;

              (_this$_onToast5 = this._onToast) == null || _this$_onToast5.call(this, cfg.label + " \u7CBE\u82F1\u8D4F\u91D1\u623F\uFF1A\u5168\u5458\u5F3A\u529B\u7CBE\u82F1\uFF01\u8083\u6E05\u5FC5\u5F97 +60 \u91D1\u3001+2 \u7384\u94C1\u4E0E\u7A00\u6709\u7075\u79CD\uFF01");
            } else if (cfg.roomKind === 'mid_boss' || cfg.roomKind === 'final_boss') {
              var _this$_onToast6;

              var bossName = cfg.roomKind === 'mid_boss' ? cfg.biome.midBossName : cfg.biome.finalBossName;
              (_this$_onToast6 = this._onToast) == null || _this$_onToast6.call(this, "\u8B66\u544A\uFF01" + cfg.label + " \u9996\u9886\u300C" + bossName + "\u300D\u73B0\u8EAB\uFF01");
            } else if (cfg.hasMistFog) {
              var _this$_onToast7;

              (_this$_onToast7 = this._onToast) == null || _this$_onToast7.call(this, cfg.label + " \u58A8\u7634\u6CFD\u6E0A\uFF1A\u9760\u8FD1\u70B9\u4EAE\u573A\u5730\u5185 2 \u76CF\u53E4\u706F\u5373\u53EF\u9A71\u6563\u6697\u7D2B\u7634\u96FE\uFF01");
            } else if (cfg.hasIceFloor) {
              var _this$_onToast8;

              (_this$_onToast8 = this._onToast) == null || _this$_onToast8.call(this, cfg.label + " \u5BD2\u7389\u51B0\u5BAB\uFF1A\u51B0\u9762\u5E26\u6ED1\u884C\u60EF\u6027\uFF0C\u6CE8\u610F\u8EB2\u907F\u5468\u671F\u971C\u98CE" + (this._hasBrookSoup ? '（寒溪鲜鱼汤已免疫减速）' : '') + "\uFF01");
            } else if (cfg.hasReflectWalls) {
              var _this$_onToast9;

              (_this$_onToast9 = this._onToast) == null || _this$_onToast9.call(this, cfg.label + " \u96F7\u7EB9\u53E4\u5854\uFF1A\u516B\u5366\u5899\u9762\u53EF\u53CD\u5F39\u5B50\u5F39\uFF0C\u6CE8\u610F\u94DC\u96F7\u67F1\u95F4\u7684\u5468\u671F\u653E\u7535\u7EBF\uFF01");
            } else if (cfg.riftVortexCount > 0) {
              var _this$_onToast10;

              (_this$_onToast10 = this._onToast) == null || _this$_onToast10.call(this, cfg.label + " \u88C2\u9699\u5929\u575B\uFF1A\u907F\u5F00\u65F6\u7A7A\u88C2\u9699\u65CB\u6DA1\u5F15\u529B" + (cfg.hasSealRing ? '与旋转灵气封阵' : '') + "\uFF01");
            }
          } // 为当前房间的全部互动机关创建手绘素材精灵（彻底告别几何圆/方块绘制）


          for (var _sp of this._spikes) {
            var sn = this._uiNode('SpikeTrap', this._propLayer);

            sn.setPosition(_sp.x, _sp.y, 0);
            (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
              error: Error()
            }), ArtLoader) : ArtLoader).applySprite(sn, 'dng_spike_trap', Math.round(_sp.r * 2.15), Math.round(_sp.r * 1.95));

            this._spikeNodes.push(sn);
          }

          for (var j of this._jars) {
            var jn = this._uiNode('PowderJar', this._propLayer);

            jn.setPosition(j.x, j.y + 4, 0);
            (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
              error: Error()
            }), ArtLoader) : ArtLoader).applySprite(jn, 'dng_powder_jar', 44, 58);

            this._jarNodes.push(jn);
          }

          for (var lt of this._lanterns) {
            var ln = this._uiNode('AncientLantern', this._propLayer);

            ln.setPosition(lt.x, lt.y + 8, 0);
            (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
              error: Error()
            }), ArtLoader) : ArtLoader).applySprite(ln, 'dng_ancient_lantern', 46, 62);

            this._lanternNodes.push(ln);
          }

          for (var cp of this._copperPillars) {
            var cn = this._uiNode('CopperPillar', this._propLayer);

            cn.setPosition(cp.x, cp.y + 12, 0);
            (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
              error: Error()
            }), ArtLoader) : ArtLoader).applySprite(cn, 'dng_copper_pillar', 48, 82);

            this._copperNodes.push(cn);
          }

          for (var rv of this._riftVortices) {
            var rn = this._uiNode('RiftVortex', this._propLayer);

            rn.setPosition(rv.x, rv.y, 0);
            (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
              error: Error()
            }), ArtLoader) : ArtLoader).applySprite(rn, 'dng_rift_vortex', Math.round(rv.r * 2.05), Math.round(rv.r * 2.05));

            this._riftNodes.push(rn);
          }

          if (this._chest) {
            var chn = this._uiNode('JadeChest', this._propLayer);

            chn.setPosition(this._chest.x, this._chest.y + 6, 0);
            (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
              error: Error()
            }), ArtLoader) : ArtLoader).applySprite(chn, 'dng_chest_closed', 68, 60);
            this._chestNode = chn;
            this._chestOpenedRendered = false;
          }

          this._refreshTopHud();
        }

        _openBlessingModal() {
          this._waitingBlessing = true;
          this._blessingModal.active = true;

          this._blessingCardsRoot.removeAllChildren();

          var candidates = (_crd && BLESSING_POOL === void 0 ? (_reportPossibleCrUseOfBLESSING_POOL({
            error: Error()
          }), BLESSING_POOL) : BLESSING_POOL).filter(b => !this._blessings.has(b.id));
          var pool = candidates.length >= 3 ? [...candidates] : [...(_crd && BLESSING_POOL === void 0 ? (_reportPossibleCrUseOfBLESSING_POOL({
            error: Error()
          }), BLESSING_POOL) : BLESSING_POOL)]; // 洗牌抽 3 张

          for (var i = pool.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
          }

          var picks = pool.slice(0, 3);
          picks.forEach((b, idx) => {
            var cx = (idx - 1) * 276;

            var card = this._uiNode("BlessCard_" + idx, this._blessingCardsRoot);

            card.addComponent(UITransform).setContentSize(252, 204);
            card.setPosition(cx, -18, 0);
            (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
              error: Error()
            }), ArtLoader) : ArtLoader).applySprite(card, 'ui_dng_card_bg', 252, 204);

            var tagL = this._uiNode('Tag', card).addComponent(Label);

            tagL.node.setPosition(0, 68, 0);
            tagL.string = "[" + b.tag + "]";
            tagL.fontSize = 13;
            tagL.color = new Color(250, 206, 122, 255);

            var nameL = this._uiNode('Name', card).addComponent(Label);

            nameL.node.setPosition(0, 36, 0);
            nameL.string = b.name;
            nameL.fontSize = 20;
            nameL.color = new Color(252, 248, 236, 255);

            var descL = this._uiNode('Desc', card).addComponent(Label);

            descL.node.setPosition(0, -22, 0);
            descL.node.addComponent(UITransform).setContentSize(174, 88);
            descL.overflow = Label.Overflow.CLAMP;
            descL.enableWrapText = true;
            descL.string = b.desc;
            descL.fontSize = 13;
            descL.lineHeight = 19;
            descL.color = new Color(214, 232, 224, 245);
            card.on(Node.EventType.TOUCH_END, () => this._pickBlessing(b), this);
          });
        }

        _pickBlessing(b) {
          this._blessings.add(b.id);

          if (b.id === 'iron_body') {
            this._maxHp += 35;
            this._hp = Math.min(this._maxHp, this._hp + 45);
          } else if (b.id === 'double_potato') {
            this._trialPotatoes += 2;

            this._refreshButtonLabels();
          }

          this._waitingBlessing = false;
          this._blessingModal.active = false;

          if (this._stageNum < (_crd && DUNGEON_IMPLEMENTED_MAX_STAGE === void 0 ? (_reportPossibleCrUseOfDUNGEON_IMPLEMENTED_MAX_STAGE({
            error: Error()
          }), DUNGEON_IMPLEMENTED_MAX_STAGE) : DUNGEON_IMPLEMENTED_MAX_STAGE)) {
            var _this$_onToast11;

            this._startStage(this._stageNum + 1);

            (_this$_onToast11 = this._onToast) == null || _this$_onToast11.call(this, "\u83B7\u5F97\u53E4\u7891\u795D\u798F\u300C" + b.name + "\u300D\uFF01\u5DF2\u8FDB\u5165 " + this._stageCfg.label + " \u6218\u6597\u623F");
          } else {
            var _this$_onToast12;

            this._roomCleared = true;
            this._doorLbl.string = '石门已开 →';
            (_this$_onToast12 = this._onToast) == null || _this$_onToast12.call(this, "\u83B7\u5F97\u53E4\u7891\u795D\u798F\u300C" + b.name + "\u300D\uFF01");
          }
        }

        _openBlacksmithModal() {
          this._waitingBlacksmith = true;
          this._blacksmithModal.active = true;

          this._renderBlacksmithCards();
        }

        _renderBlacksmithCards() {
          this._blacksmithCardsRoot.removeAllChildren();

          var wNames = ['青竹剑', '连发符箓枪', '八卦聚光镜'];
          var curName = wNames[this._weaponIdx];
          var curTier = this._weaponTiers[this._weaponIdx];
          var nextCost = curTier < 3 ? (_crd && WEAPON_TIER_UPGRADE_COST === void 0 ? (_reportPossibleCrUseOfWEAPON_TIER_UPGRADE_COST({
            error: Error()
          }), WEAPON_TIER_UPGRADE_COST) : WEAPON_TIER_UPGRADE_COST)[curTier] : 0;
          var canUpgradeCur = curTier < 3 && this._lootGold >= nextCost;
          var allMax = this._weaponTiers[0] >= 3 && this._weaponTiers[1] >= 3 && this._weaponTiers[2] >= 3;
          var canResonate = !allMax && this._lootGold >= 90;
          var canHeal = this._lootGold >= 25 && (this._hp < this._maxHp || this._mana < this._maxMana);
          this._blacksmithTitleLbl.string = "\u795E\u79D8\u94C1\u5320\u94FA \xB7 \u5F53\u524D\u5C40\u5185\u91D1\u5E01\uFF1A" + this._lootGold + "\uFF08\u53EF\u591A\u6B21\u953B\u9020\uFF09";
          var cards = [{
            tag: '单武升阶',
            title: curTier < 3 ? "\u953B\u9020 " + curName : curName + "\u5DF2\u6EE1\u9636",
            desc: curTier < 3 ? (_crd && WEAPON_TIER_NAMES === void 0 ? (_reportPossibleCrUseOfWEAPON_TIER_NAMES({
              error: Error()
            }), WEAPON_TIER_NAMES) : WEAPON_TIER_NAMES)[curTier] + " \u2192 " + (_crd && WEAPON_TIER_NAMES === void 0 ? (_reportPossibleCrUseOfWEAPON_TIER_NAMES({
              error: Error()
            }), WEAPON_TIER_NAMES) : WEAPON_TIER_NAMES)[curTier + 1] + "\uFF08\u4F24\u5BB3\u500D\u7387\u5347\u81F3 " + Math.round((_crd && WEAPON_TIER_MULT === void 0 ? (_reportPossibleCrUseOfWEAPON_TIER_MULT({
              error: Error()
            }), WEAPON_TIER_MULT) : WEAPON_TIER_MULT)[curTier + 1] * 100) + "%\uFF09" : '当前手持武器已达最高「天罡」品阶，可按 Q 切其他武器锻造',
            costTxt: curTier < 3 ? "\u6D88\u8017 " + nextCost + " \u5C40\u5185\u91D1" : '已达上限',
            enabled: canUpgradeCur,
            onTap: () => {
              var _this$_onToast14;

              if (!canUpgradeCur) {
                var _this$_onToast13;

                (_this$_onToast13 = this._onToast) == null || _this$_onToast13.call(this, '局内金币不足或当前武器已满阶！');
                return;
              }

              this._lootGold -= nextCost;
              this._weaponTiers[this._weaponIdx] += 1;

              this._refreshButtonLabels();

              this._renderBlacksmithCards();

              (_this$_onToast14 = this._onToast) == null || _this$_onToast14.call(this, curName + "\u5DF2\u5347\u9636\u4E3A\u3010" + (_crd && WEAPON_TIER_NAMES === void 0 ? (_reportPossibleCrUseOfWEAPON_TIER_NAMES({
                error: Error()
              }), WEAPON_TIER_NAMES) : WEAPON_TIER_NAMES)[this._weaponTiers[this._weaponIdx]] + "\u3011\uFF01");
            }
          }, {
            tag: '三武共鸣',
            title: allMax ? '全武器已天罡' : '全武器淬火 +1 阶',
            desc: '同时将青竹剑、符箓枪、八卦镜全部提升 1 品阶（最高天罡）',
            costTxt: allMax ? '已达上限' : '消耗 90 局内金',
            enabled: canResonate,
            onTap: () => {
              var _this$_onToast16;

              if (!canResonate) {
                var _this$_onToast15;

                (_this$_onToast15 = this._onToast) == null || _this$_onToast15.call(this, '局内金币不足 90 或全部武器已满阶！');
                return;
              }

              this._lootGold -= 90;

              for (var i = 0; i < 3; i++) {
                if (this._weaponTiers[i] < 3) this._weaponTiers[i] += 1;
              }

              this._refreshButtonLabels();

              this._renderBlacksmithCards();

              (_this$_onToast16 = this._onToast) == null || _this$_onToast16.call(this, '炉火共鸣！三把国风武器品阶全面提升！');
            }
          }, {
            tag: '灵泉补给',
            title: '饮用铁匠灵泉露',
            desc: '立即回复 55 点生命并回满全部灵力，整备迎接后半程精英与首领',
            costTxt: '消耗 25 局内金',
            enabled: canHeal,
            onTap: () => {
              var _this$_onToast18;

              if (!canHeal) {
                var _this$_onToast17;

                (_this$_onToast17 = this._onToast) == null || _this$_onToast17.call(this, '金币不足 25 或当前状态已满！');
                return;
              }

              this._lootGold -= 25;
              this._hp = Math.min(this._maxHp, this._hp + 55);
              this._mana = this._maxMana;

              this._renderBlacksmithCards();

              (_this$_onToast18 = this._onToast) == null || _this$_onToast18.call(this, '饮下灵泉露，生命 +55、灵力已回满！');
            }
          }];
          cards.forEach((c, idx) => {
            var cx = (idx - 1) * 276;

            var card = this._uiNode("BsCard_" + idx, this._blacksmithCardsRoot);

            card.addComponent(UITransform).setContentSize(252, 214);
            card.setPosition(cx, -8, 0);
            (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
              error: Error()
            }), ArtLoader) : ArtLoader).applySprite(card, 'ui_dng_card_bg', 252, 214, () => {
              var _card$getChildByName2;

              var sp = (_card$getChildByName2 = card.getChildByName('ArtSprite')) == null ? void 0 : _card$getChildByName2.getComponent(Sprite);
              if (sp) sp.color = c.enabled ? new Color(248, 226, 178, 255) : new Color(130, 132, 138, 185);
            });

            var tagL = this._uiNode('Tag', card).addComponent(Label);

            tagL.node.setPosition(0, 74, 0);
            tagL.string = "[" + c.tag + "]";
            tagL.fontSize = 13;
            tagL.color = new Color(152, 236, 212, 255);

            var nameL = this._uiNode('Name', card).addComponent(Label);

            nameL.node.setPosition(0, 42, 0);
            nameL.string = c.title;
            nameL.fontSize = 19;
            nameL.color = new Color(252, 246, 232, 255);

            var descL = this._uiNode('Desc', card).addComponent(Label);

            descL.node.setPosition(0, -12, 0);
            descL.node.addComponent(UITransform).setContentSize(174, 82);
            descL.overflow = Label.Overflow.CLAMP;
            descL.enableWrapText = true;
            descL.string = c.desc;
            descL.fontSize = 12;
            descL.lineHeight = 18;
            descL.color = new Color(224, 220, 210, 240);

            var costL = this._uiNode('Cost', card).addComponent(Label);

            costL.node.setPosition(0, -76, 0);
            costL.string = c.costTxt;
            costL.fontSize = 14;
            costL.color = c.enabled ? new Color(255, 212, 118, 255) : new Color(156, 156, 156, 200);
            card.on(Node.EventType.TOUCH_END, c.onTap, this);
          });
        }

        _spawnEnemy(kind, x, y, elite) {
          if (elite === void 0) {
            elite = false;
          }

          var st = (_crd && ENEMY_STATS === void 0 ? (_reportPossibleCrUseOfENEMY_STATS({
            error: Error()
          }), ENEMY_STATS) : ENEMY_STATS)[kind];
          var hpScale = this._stageCfg.hpMult * (elite ? 1.55 : 1.0);
          var maxHp = Math.round(st.baseHp * hpScale);

          this._enemies.push({
            id: this._nextEnemyId++,
            kind,
            name: elite ? "\u7CBE\u82F1\xB7" + st.name : st.name,
            isBoss: st.isBoss,
            elite,
            x,
            y,
            hp: maxHp,
            maxHp,
            radius: Math.round(st.radius * (elite ? 1.18 : 1.0)),
            speed: st.speed * (elite ? 1.08 : 1.0),
            fireCd: 0.7 + Math.random() * 0.7,
            specialCd: st.isBoss ? 3.2 : 2.6,
            hitFlash: 0,
            phase2: false,
            shellTimer: 2.2 + Math.random() * 1.2,
            shellActive: false,
            burrowTimer: 0,
            dashTimer: 0,
            dashVx: 0,
            dashVy: 0,
            trailCd: 0.5,
            wavePhase: Math.random() * Math.PI * 2,
            stealthTimer: 0,
            leapTimer: 0,
            leapVx: 0,
            leapVy: 0,
            isIllusion: false
          });
        }

        _onKeyDown(e) {
          if (!this._open || !this._inCombat) return;

          this._keys.add(e.keyCode);

          if (this._waitingChoice || this._waitingBlessing || this._waitingBlacksmith) return;
          if (e.keyCode === KeyCode.KEY_J || e.keyCode === KeyCode.SPACE) this._doAttack();
          if (e.keyCode === KeyCode.KEY_K || e.keyCode === KeyCode.SHIFT_LEFT) this._doDodge();
          if (e.keyCode === KeyCode.KEY_Q) this._switchWeapon();
          if (e.keyCode === KeyCode.KEY_E) this._usePortablePlant();
        }

        _onKeyUp(e) {
          this._keys.delete(e.keyCode);
        }

        _findNearestEnemy(fromX, fromY) {
          var best = null;
          var bestD = Infinity;

          for (var e of this._enemies) {
            if (e.burrowTimer > 0) continue;
            var d = Math.hypot(e.x - fromX, e.y - fromY);

            if (d < bestD) {
              bestD = d;
              best = e;
            }
          }

          return best;
        }

        _switchWeapon() {
          this._weaponIdx = (this._weaponIdx + 1) % 3;

          this._refreshButtonLabels();
        }

        _refreshButtonLabels() {
          var _app$saveData$invento5, _app$saveData$invento6;

          var baseNames = ['青竹剑', '符箓枪', '八卦镜'];
          var t = this._weaponTiers[this._weaponIdx];
          var badge = t > 0 ? "[" + (_crd && WEAPON_TIER_NAMES === void 0 ? (_reportPossibleCrUseOfWEAPON_TIER_NAMES({
            error: Error()
          }), WEAPON_TIER_NAMES) : WEAPON_TIER_NAMES)[t] + "]" : '';
          this._weaponBtnLbl.string = "" + baseNames[this._weaponIdx] + badge + "\n(Q\u5207)";
          var app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          var potatoes = ((_app$saveData$invento5 = app == null ? void 0 : app.saveData.inventory['thunder_potato']) != null ? _app$saveData$invento5 : 0) + this._trialPotatoes;
          var shoots = (_app$saveData$invento6 = app == null ? void 0 : app.saveData.inventory['cloud_bamboo_shoot']) != null ? _app$saveData$invento6 : 0;

          if (potatoes > 0) {
            this._plantBtnLbl.string = "\u96F7\u706B\u85AF\xD7" + potatoes + "\n(E\u4E22)";
          } else if (shoots > 0) {
            this._plantBtnLbl.string = "\u7A7F\u4E91\u7B0B\xD7" + shoots + "\n(E\u653E)";
          } else {
            this._plantBtnLbl.string = '无随身\n灵植';
          }
        }

        _doDodge() {
          if (this._dodgeCd > 0) return;
          this._dodgeCd = this._blessings.has('wind_step') ? 0.66 : 0.92;
          this._dodgeTimer = 0.22;
          this._invulnTimer = this._hasBrookSoup ? 0.36 : 0.25;
          var mx = this._joyDir.x || (this._keys.has(KeyCode.KEY_D) ? 1 : this._keys.has(KeyCode.KEY_A) ? -1 : Math.cos(this._facingAngle));
          var my = this._joyDir.y || (this._keys.has(KeyCode.KEY_W) ? 1 : this._keys.has(KeyCode.KEY_S) ? -1 : Math.sin(this._facingAngle));
          var len = Math.hypot(mx, my) || 1;

          this._dodgeDir.set(mx / len, my / len);
        }

        _hurtPlayer(rawDmg, isHazard) {
          if (isHazard === void 0) {
            isHazard = false;
          }

          if (this._invulnTimer > 0) return;
          var dmg = isHazard && this._blessings.has('hazard_ward') ? Math.max(1, Math.round(rawDmg * 0.5)) : rawDmg;
          this._hp -= dmg;
          this._invulnTimer = isHazard ? 0.65 : 0.55;
        }

        _triggerJarExplosion(jar) {
          if (jar.exploded) return;
          jar.exploded = true;
          var blastR = 140;

          this._booms.push({
            x: jar.x,
            y: jar.y,
            radius: blastR,
            life: 0.38
          });

          for (var e of this._enemies) {
            if (e.burrowTimer <= 0 && Math.hypot(e.x - jar.x, e.y - jar.y) <= blastR + e.radius) {
              this._damageEnemy(e, 95, true);
            }
          }

          if (Math.hypot(this._px - jar.x, this._py - jar.y) <= blastR * 0.72) {
            this._hurtPlayer(14, true);
          }

          this._bullets = this._bullets.filter(b => b.fromPlayer || Math.hypot(b.x - jar.x, b.y - jar.y) > blastR);
        }

        _doAttack() {
          if (this._atkCd > 0 || this._waitingChoice || this._waitingBlessing || this._waitingBlacksmith) return;

          var target = this._findNearestEnemy(this._px, this._py);

          var angle = target ? Math.atan2(target.y - this._py, target.x - this._px) : this._facingAngle;
          this._facingAngle = angle;
          var manaMult = this._hasEstuarySoup ? 0.75 : 1.0;
          var tierMult = (_crd && WEAPON_TIER_MULT === void 0 ? (_reportPossibleCrUseOfWEAPON_TIER_MULT({
            error: Error()
          }), WEAPON_TIER_MULT) : WEAPON_TIER_MULT)[this._weaponTiers[this._weaponIdx]];

          if (this._weaponIdx === 0) {
            // 青竹剑：近战宽扇形斩击 + 劈碎弹幕
            this._atkCd = 0.34;
            var range = 112;
            var dmg = Math.round((this._blessings.has('sword_mana') ? 31 : 25) * tierMult);

            this._slashes.push({
              x: this._px,
              y: this._py,
              angle,
              radius: range,
              life: 0.16
            });

            var hitSomething = false;

            for (var e of this._enemies) {
              if (e.burrowTimer > 0) continue;

              if (Math.hypot(e.x - this._px, e.y - this._py) <= range + e.radius) {
                this._damageEnemy(e, dmg, false);

                hitSomething = true;
              }
            }

            for (var j of this._jars) {
              if (!j.exploded && Math.hypot(j.x - this._px, j.y - this._py) <= range + j.r) {
                this._triggerJarExplosion(j);
              }
            }

            var sbMult = this._blessings.has('shield_breaker') ? 1.65 : 1.0;

            for (var iw of this._iceWalls) {
              if (iw.hp > 0 && Math.hypot(iw.x - this._px, iw.y - this._py) <= range + iw.rx) {
                iw.hp -= Math.round(dmg * sbMult);
              }
            }

            for (var rod of this._lightningRods) {
              if (rod.hp > 0 && Math.hypot(rod.x - this._px, rod.y - this._py) <= range + rod.r) {
                rod.hp -= Math.round(dmg * sbMult);
                hitSomething = true;
              }
            }

            for (var orb of this._riftOrbs) {
              if (orb.hp > 0 && Math.hypot(orb.x - this._px, orb.y - this._py) <= range + orb.r + 12) {
                orb.hp -= Math.round(dmg * 2.2 * sbMult);
                hitSomething = true;
              }
            }

            var before = this._bullets.length;
            this._bullets = this._bullets.filter(b => b.fromPlayer || Math.hypot(b.x - this._px, b.y - this._py) > range);

            if (this._blessings.has('sword_mana') && (hitSomething || this._bullets.length < before)) {
              this._mana = Math.min(this._maxMana, this._mana + 6);
            }
          } else if (this._weaponIdx === 1) {
            // 连发符箓枪（可被「符箓连珠」强化为双发）
            var cost = Math.max(1, Math.round(2 * manaMult));
            if (this._mana < cost) return;
            this._mana -= cost;
            this._atkCd = 0.19;
            var spd = 550;
            var offsets = this._blessings.has('double_talisman') ? [-0.09, 0.09] : [0];

            for (var off of offsets) {
              var a = angle + off;

              this._bullets.push({
                fromPlayer: true,
                x: this._px + Math.cos(a) * 20,
                y: this._py + Math.sin(a) * 20,
                vx: Math.cos(a) * spd,
                vy: Math.sin(a) * spd,
                dmg: Math.round((this._blessings.has('double_talisman') ? 14 : 17) * tierMult),
                radius: 7,
                life: 1.55,
                color: new Color(224, 92, 54, 255),
                bouncesLeft: this._stageCfg.hasReflectWalls ? 1 : 0
              });
            }
          } else {
            // 八卦聚光镜：全屏穿透激光（无视熔岩龟缩壳反伤）
            var baseCost = this._blessings.has('focus_mirror') ? 7 : 9;

            var _cost = Math.max(3, Math.round(baseCost * manaMult));

            if (this._mana < _cost) return;
            this._mana -= _cost;
            this._atkCd = 0.62;

            var _dmg = Math.round((this._blessings.has('focus_mirror') ? 62 : 46) * tierMult);

            var x2 = this._px + Math.cos(angle) * 920;
            var y2 = this._py + Math.sin(angle) * 920;

            this._lasers.push({
              x1: this._px,
              y1: this._py,
              x2,
              y2,
              life: 0.22
            });

            var dx = Math.cos(angle);
            var dy = Math.sin(angle);

            for (var _e of this._enemies) {
              if (_e.burrowTimer > 0) continue;
              var rx = _e.x - this._px;
              var ry = _e.y - this._py;
              var proj = rx * dx + ry * dy;

              if (proj > 0 && Math.abs(rx * dy - ry * dx) <= _e.radius + 20) {
                this._damageEnemy(_e, _dmg, true);
              }
            }

            var sbLaserMult = this._blessings.has('shield_breaker') ? 1.65 : 1.0;

            for (var _rod of this._lightningRods) {
              if (_rod.hp <= 0) continue;

              var _rx = _rod.x - this._px;

              var _ry = _rod.y - this._py;

              var _proj = _rx * dx + _ry * dy;

              if (_proj > 0 && Math.abs(_rx * dy - _ry * dx) <= _rod.r + 20) {
                _rod.hp -= Math.round(_dmg * sbLaserMult);
              }
            }

            for (var _orb of this._riftOrbs) {
              if (_orb.hp <= 0) continue;

              var _rx2 = _orb.x - this._px;

              var _ry2 = _orb.y - this._py;

              var _proj2 = _rx2 * dx + _ry2 * dy;

              if (_proj2 > 0 && Math.abs(_rx2 * dy - _ry2 * dx) <= _orb.r + 20) {
                _orb.hp -= Math.round(_dmg * sbLaserMult);
              }
            }

            for (var _j of this._jars) {
              if (_j.exploded) continue;

              var _rx3 = _j.x - this._px;

              var _ry3 = _j.y - this._py;

              var _proj3 = _rx3 * dx + _ry3 * dy;

              if (_proj3 > 0 && Math.abs(_rx3 * dy - _ry3 * dx) <= _j.r + 18) {
                this._triggerJarExplosion(_j);
              }
            }
          }
        }

        _usePortablePlant() {
          var _app$saveData$invento7, _app$saveData$invento8;

          var app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready) || this._waitingChoice || this._waitingBlessing || this._waitingBlacksmith) return;
          var ownedPotato = (_app$saveData$invento7 = app.saveData.inventory['thunder_potato']) != null ? _app$saveData$invento7 : 0;

          if (ownedPotato > 0 || this._trialPotatoes > 0) {
            if (ownedPotato > 0) app.addItem('thunder_potato', -1);else this._trialPotatoes -= 1;

            var target = this._findNearestEnemy(this._px, this._py);

            var bx = target ? target.x : this._px + Math.cos(this._facingAngle) * 140;
            var by = target ? target.y : this._py + Math.sin(this._facingAngle) * 140;
            var blastR = this._blessings.has('double_potato') ? 168 : 135;

            this._booms.push({
              x: bx,
              y: by,
              radius: blastR,
              life: 0.36
            });

            if (this._crackedWall && !this._crackedWall.broken && Math.hypot(this._crackedWall.x - bx, this._crackedWall.y - by) <= blastR + 70) {
              var _this$_onToast19;

              this._crackedWall.broken = true;
              if (this._crackedWallNode) this._crackedWallNode.active = false;
              this._lootIron += 1;
              this._lootGold += 35;
              (_this$_onToast19 = this._onToast) == null || _this$_onToast19.call(this, '轰隆！炸开裂纹古石墙，获得隐藏宝藏：玄铁矿 +1、金币 +35！');
            }

            for (var j of this._jars) {
              if (!j.exploded && Math.hypot(j.x - bx, j.y - by) <= blastR + j.r) {
                this._triggerJarExplosion(j);
              }
            }

            var sbBoom = this._blessings.has('shield_breaker') ? 1.65 : 1.0;

            for (var rod of this._lightningRods) {
              if (rod.hp > 0 && Math.hypot(rod.x - bx, rod.y - by) <= blastR + rod.r) {
                rod.hp -= Math.round(90 * sbBoom);
              }
            }

            for (var orb of this._riftOrbs) {
              if (orb.hp > 0 && Math.hypot(orb.x - bx, orb.y - by) <= blastR + orb.r) {
                orb.hp -= Math.round(90 * sbBoom);
              }
            }

            for (var e of this._enemies) {
              if (e.burrowTimer <= 0 && Math.hypot(e.x - bx, e.y - by) <= blastR + e.radius) {
                this._damageEnemy(e, 90, true);
              }
            }

            this._bullets = this._bullets.filter(b => b.fromPlayer || Math.hypot(b.x - bx, b.y - by) > blastR);

            this._refreshButtonLabels();

            return;
          }

          if (((_app$saveData$invento8 = app.saveData.inventory['cloud_bamboo_shoot']) != null ? _app$saveData$invento8 : 0) > 0) {
            app.addItem('cloud_bamboo_shoot', -1);

            this._turrets.push({
              id: this._nextTurretId++,
              x: this._px,
              y: this._py,
              life: 14,
              fireCd: 0.2
            });

            this._refreshButtonLabels();
          }
        }

        _damageEnemy(e, dmg, pierceShield, fromThunder) {
          var _e$allyShieldTimer;

          if (fromThunder === void 0) {
            fromThunder = false;
          }

          if (e.hp <= 0 || e.burrowTimer > 0) return;
          var finalDmg = dmg;
          var sbMult = this._blessings.has('shield_breaker') ? 1.65 : 1.0;

          if (e.kind === 'boss_thunder_lord' && e.phase2 && this._lightningRods.some(r => r.hp > 0)) {
            finalDmg = Math.max(4, Math.round(dmg * 0.2 * sbMult));
          }

          if (e.kind === 'boss_rift_overlord' && e.phase2 && this._riftOrbs.some(o => o.hp > 0)) {
            finalDmg = Math.max(5, Math.round(dmg * 0.22 * sbMult));
          }

          if (((_e$allyShieldTimer = e.allyShieldTimer) != null ? _e$allyShieldTimer : 0) > 0 && !pierceShield) {
            finalDmg = Math.max(4, Math.round(finalDmg * 0.45 * sbMult));
          }

          if (e.kind === 'bronze_guardian' && !pierceShield) {
            finalDmg = Math.max(5, Math.round(finalDmg * 0.52 * sbMult));
          } // 寒镜侍正面格挡反伤机制（激光与雷火薯可破镜）


          if (e.kind === 'frost_mirror_guard' && !pierceShield) {
            var toPlayerX = this._px - e.x;
            var facingLeft = this._px < e.x;

            if (facingLeft && toPlayerX < 0 || !facingLeft && toPlayerX > 0) {
              finalDmg = Math.max(4, Math.round(dmg * 0.28));
              var ra = Math.atan2(this._py - e.y, this._px - e.x);

              this._bullets.push({
                fromPlayer: false,
                x: e.x,
                y: e.y,
                vx: Math.cos(ra) * 260,
                vy: Math.sin(ra) * 260,
                dmg: 10,
                radius: 6,
                life: 2.0,
                color: new Color(138, 228, 255, 255)
              });
            }
          } // 熔岩龟缩壳反伤机制（激光与雷火薯可无视硬壳）


          if (e.shellActive && !pierceShield) {
            finalDmg = Math.max(3, Math.round(dmg * 0.3));

            for (var i = 0; i < 4; i++) {
              var a = i * Math.PI / 2 + Math.PI / 4;

              this._bullets.push({
                fromPlayer: false,
                x: e.x,
                y: e.y,
                vx: Math.cos(a) * 210,
                vy: Math.sin(a) * 210,
                dmg: 8,
                radius: 6,
                life: 1.8,
                color: new Color(255, 146, 72, 255)
              });
            }
          }

          e.hp -= finalDmg;
          e.hitFlash = 0.12; // 九霄引雷祝福：22% 概率额外降下 38 伤天雷

          if (!fromThunder && e.hp > 0 && this._blessings.has('crit_thunder') && Math.random() < 0.22) {
            this._lightnings.push({
              x: e.x,
              y: e.y,
              life: 0.24
            });

            this._damageEnemy(e, 38, true, true);

            return;
          } // X-10 关底首领半血触发二阶段狂暴


          if (!e.phase2 && !e.isIllusion && e.hp > 0 && e.hp <= e.maxHp * 0.5) {
            if (e.kind === 'boss_stone_spirit') {
              var _this$_onToast20;

              e.phase2 = true;
              this._pillars = [];

              for (var pn of this._pillarNodes) pn.destroy();

              this._pillarNodes = [];

              this._booms.push({
                x: e.x,
                y: e.y,
                radius: 165,
                life: 0.4
              });

              (_this$_onToast20 = this._onToast) == null || _this$_onToast20.call(this, '古墟石灵进入二阶段狂暴：震碎了石柱掩体，注意躲避四向激光！');
            } else if (e.kind === 'boss_magma_wyrm') {
              var _this$_onToast21;

              e.phase2 = true;
              this._lavaRimActive = true;

              this._booms.push({
                x: e.x,
                y: e.y,
                radius: 180,
                life: 0.42
              });

              (_this$_onToast21 = this._onToast) == null || _this$_onToast21.call(this, '丹砂火蛟进入二阶段：四周岩浆带被点燃，请留在中场周旋！');
            } else if (e.kind === 'boss_frost_turtle') {
              var _this$_onToast22;

              e.phase2 = true;

              this._booms.push({
                x: e.x,
                y: e.y,
                radius: 175,
                life: 0.42
              });

              (_this$_onToast22 = this._onToast) == null || _this$_onToast22.call(this, '寒玉玄龟进入二阶段：全屏降落极寒冰柱，可借冰墙掩体躲避！');
            } else if (e.kind === 'boss_ghost_spider') {
              var _this$_onToast23;

              e.phase2 = true;

              this._booms.push({
                x: e.x,
                y: e.y,
                radius: 170,
                life: 0.4
              });

              for (var offsetY of [-120, 120]) {
                var cloneId = this._nextEnemyId++;

                this._enemies.push({
                  id: cloneId,
                  kind: 'boss_ghost_spider',
                  name: '鬼面幻影',
                  isBoss: false,
                  elite: false,
                  x: Math.max(-ARENA_HALF_W + 80, Math.min(ARENA_HALF_W - 80, e.x - 60)),
                  y: Math.max(-ARENA_HALF_H + 60, Math.min(ARENA_HALF_H - 60, e.y + offsetY)),
                  hp: Math.round(e.maxHp * 0.16),
                  maxHp: Math.round(e.maxHp * 0.16),
                  radius: 34,
                  speed: 112,
                  fireCd: 1.5,
                  specialCd: 99,
                  hitFlash: 0,
                  phase2: true,
                  shellTimer: 99,
                  shellActive: false,
                  burrowTimer: 0,
                  dashTimer: 0,
                  dashVx: 0,
                  dashVy: 0,
                  trailCd: 99,
                  wavePhase: Math.random() * Math.PI * 2,
                  stealthTimer: 0,
                  leapTimer: 0,
                  leapVx: 0,
                  leapVy: 0,
                  isIllusion: true
                });
              }

              (_this$_onToast23 = this._onToast) == null || _this$_onToast23.call(this, '幽泽鬼面蛛进入二阶段：分裂出 2 只鬼面幻影并熄灭古灯！');

              for (var lt of this._lanterns) lt.lit = false;
            } else if (e.kind === 'boss_thunder_lord') {
              var _this$_onToast24;

              e.phase2 = true;

              this._booms.push({
                x: e.x,
                y: e.y,
                radius: 185,
                life: 0.42
              });

              var rodPts = [[-130, 115], [160, 115], [15, -135]];

              for (var [rx, ry] of rodPts) {
                this._lightningRods.push({
                  id: this._nextRodId++,
                  x: rx,
                  y: ry,
                  hp: 110,
                  maxHp: 110,
                  r: 24
                });
              }

              (_this$_onToast24 = this._onToast) == null || _this$_onToast24.call(this, '九霄雷公傀进入二阶段：升起 3 根避雷针电网护盾，必须先打碎避雷针破盾！');
            } else if (e.kind === 'boss_rift_overlord') {
              var _this$_onToast25;

              e.phase2 = true;

              this._booms.push({
                x: e.x,
                y: e.y,
                radius: 200,
                life: 0.45
              });

              for (var k = 0; k < 2; k++) {
                var ang = k * Math.PI;

                this._riftOrbs.push({
                  id: this._nextOrbId++,
                  angle: ang,
                  dist: 118,
                  x: e.x + Math.cos(ang) * 118,
                  y: e.y + Math.sin(ang) * 118,
                  hp: 120,
                  maxHp: 120,
                  r: 22
                });
              }

              (_this$_onToast25 = this._onToast) == null || _this$_onToast25.call(this, '古渊裂隙之主进入终极形态：展开虚空护盾并召唤 2 颗核心法球，快用青竹剑斩碎破防！');
            }
          }

          if (e.hp <= 0) {
            if (e.kind === 'boss_twin_melee' || e.kind === 'boss_twin_ranged') {
              var siblingKind = e.kind === 'boss_twin_melee' ? 'boss_twin_ranged' : 'boss_twin_melee';

              var sib = this._enemies.find(o => o.kind === siblingKind && o.hp > 0);

              if (sib && !sib.phase2) {
                var _this$_onToast26;

                sib.phase2 = true;
                sib.speed = Math.round(sib.speed * 1.32);

                this._booms.push({
                  x: sib.x,
                  y: sib.y,
                  radius: 130,
                  life: 0.35
                });

                (_this$_onToast26 = this._onToast) == null || _this$_onToast26.call(this, e.name + "\u5012\u4E0B\uFF01" + sib.name + "\u5438\u6536\u53CC\u751F\u7075\u529B\u8FDB\u5165\u72C2\u66B4\u4E8C\u9636\u6BB5\uFF01");
              }
            }

            if (e.kind === 'snow_puppet') {
              // 雪绒傀死亡炸开冰雾减速区 + 6 向寒冰弹
              this._frostPools.push({
                x: e.x,
                y: e.y,
                r: 82,
                life: 5.5
              });

              for (var _i5 = 0; _i5 < 6; _i5++) {
                var _a = _i5 * Math.PI * 2 / 6;

                this._bullets.push({
                  fromPlayer: false,
                  x: e.x,
                  y: e.y,
                  vx: Math.cos(_a) * 195,
                  vy: Math.sin(_a) * 195,
                  dmg: 10,
                  radius: 6,
                  life: 1.8,
                  color: new Color(156, 232, 255, 255)
                });
              }
            }

            var st = (_crd && ENEMY_STATS === void 0 ? (_reportPossibleCrUseOfENEMY_STATS({
              error: Error()
            }), ENEMY_STATS) : ENEMY_STATS)[e.kind];

            if (!e.isIllusion) {
              this._lootGold += st.goldReward + (e.elite ? 15 : 0);
            }

            if (this._blessings.has('vamp_sprout')) {
              this._hp = Math.min(this._maxHp, this._hp + 4);
            }

            if (e.isBoss) {
              this._lootIron += this._stageCfg.subStage === 10 ? 3 : 2;

              if (this._stageCfg.chapter === 1) {
                this._lootSeeds.push('thunder_potato_seed', 'cloud_bamboo_shoot_seed');
              } else {
                this._lootSeeds.push('sky_bamboo_seed', 'thunder_potato_seed');
              }
            } else if (Math.random() < (e.elite ? 0.85 : 0.25)) {
              this._lootIron += 1;
            }
          }
        }

        _finishRun(victory, customMsg) {
          var app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          this._open = false;
          this._inCombat = false;
          this._panel.active = false;

          this._keys.clear();

          (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
            error: Error()
          }), AudioManager) : AudioManager).inst.playBgm('overworld');

          if (app != null && app.ready) {
            var _app$saveData$invento9, _this$_onToast27;

            var finalGold = victory ? this._lootGold : Math.floor(this._lootGold * 0.7);
            if (finalGold > 0) app.addGold(finalGold);
            if (this._lootIron > 0) app.addItem('xuan_iron', this._lootIron);

            for (var s of this._lootSeeds) app.addItem(s, 1);

            var unlockNote = '';
            var totalIron = (_app$saveData$invento9 = app.saveData.inventory['xuan_iron']) != null ? _app$saveData$invento9 : 0;

            if (app.saveData.farm.unlockedTier < 2 && totalIron >= 3) {
              app.saveData.farm.unlockedTier = 2;
              unlockNote = ' · 已锻造二阶玄铁斧镐，可清理西侧铁木林！';
            }

            app.persist('dungeon_finish');
            (_this$_onToast27 = this._onToast) == null || _this$_onToast27.call(this, customMsg + "\uFF08+" + finalGold + "\u91D1 \xB7 \u7384\u94C1\xD7" + this._lootIron + (this._lootSeeds.length > 0 ? " \xB7 \u7075\u79CD\xD7" + this._lootSeeds.length : '') + "\uFF09" + unlockNote);
          }
        }

        _refreshTopHud() {
          var cfg = this._stageCfg;
          this._topLbl.string = cfg.biome.name + " " + cfg.label + "\uFF08" + this._stageNum + "/" + (_crd && DUNGEON_TOTAL_STAGES === void 0 ? (_reportPossibleCrUseOfDUNGEON_TOTAL_STAGES({
            error: Error()
          }), DUNGEON_TOTAL_STAGES) : DUNGEON_TOTAL_STAGES) + "\uFF09| \u751F\u547D " + Math.ceil(this._hp) + "/" + this._maxHp + " | \u7075\u529B " + Math.floor(this._mana) + " | \u7384\u94C1 +" + this._lootIron + " \u91D1 +" + this._lootGold;
          var tags = [];
          if (this._hasBrookSoup) tags.push('寒溪鲜鱼汤');
          if (this._hasEstuarySoup) tags.push('海口灵力羹');

          var _loop4 = function _loop4(bid) {
            var b = (_crd && BLESSING_POOL === void 0 ? (_reportPossibleCrUseOfBLESSING_POOL({
              error: Error()
            }), BLESSING_POOL) : BLESSING_POOL).find(x => x.id === bid);
            if (b) tags.push(b.name);
          };

          for (var bid of this._blessings) {
            _loop4(bid);
          }

          this._buffLbl.string = tags.length > 0 ? "\u5F53\u524D\u589E\u76CA\uFF1A" + tags.join(' · ') : 'WASD移动 / J攻击 / K翻滚 / Q切武器 / E丢雷火薯或放穿云笋炮台';
        }

        update(dt) {
          if (!this._open || !this._inCombat) return;
          this._animClock += dt;
          var clampedDt = Math.min(dt, 0.05);

          if (!this._waitingChoice && !this._waitingBlessing && !this._waitingBlacksmith) {
            this._stepCombat(clampedDt);
          }

          this._renderArena();

          this._refreshTopHud();
        }

        _stepCombat(dt) {
          this._atkCd = Math.max(0, this._atkCd - dt);
          this._dodgeCd = Math.max(0, this._dodgeCd - dt);
          this._invulnTimer = Math.max(0, this._invulnTimer - dt);
          var manaRegen = (this._hasEstuarySoup ? 14 : 9.5) + (this._blessings.has('mana_spring') ? 5 : 0);
          this._mana = Math.min(this._maxMana, this._mana + manaRegen * dt);
          this._rootTimer = Math.max(0, this._rootTimer - dt);

          var immuneControl = this._hasBrookSoup || this._blessings.has('frost_ward');

          var inFrostPool = false;

          for (var fp of this._frostPools) {
            if (Math.hypot(this._px - fp.x, this._py - fp.y) < fp.r) {
              inFrostPool = true;
              break;
            }
          }

          var frostSlowMult = !immuneControl && (this._frostWindActiveTimer > 0 || inFrostPool) ? 0.62 : 1.0; // 玩家移动 / 翻滚（含第 3 大关滑冰惯性与第 4 大关蛛网定身）

          if (this._dodgeTimer > 0) {
            this._dodgeTimer -= dt;
            this._px += this._dodgeDir.x * 550 * dt;
            this._py += this._dodgeDir.y * 550 * dt;
          } else if (this._rootTimer > 0 && !immuneControl) {
            this._pMoving = false;
            this._pvx = 0;
            this._pvy = 0;
          } else {
            var vx = this._joyDir.x;
            var vy = this._joyDir.y;
            if (this._keys.has(KeyCode.KEY_W) || this._keys.has(KeyCode.ARROW_UP)) vy += 1;
            if (this._keys.has(KeyCode.KEY_S) || this._keys.has(KeyCode.ARROW_DOWN)) vy -= 1;
            if (this._keys.has(KeyCode.KEY_A) || this._keys.has(KeyCode.ARROW_LEFT)) vx -= 1;
            if (this._keys.has(KeyCode.KEY_D) || this._keys.has(KeyCode.ARROW_RIGHT)) vx += 1;
            var len = Math.hypot(vx, vy);
            this._pMoving = len > 0.01;
            var spd = this._hasBrookSoup ? 275 : 238;
            if (this._blessings.has('wind_step')) spd *= 1.18;
            if (this._blessings.has('frost_ward')) spd *= 1.08;
            spd *= frostSlowMult;

            if (this._stageCfg.hasIceFloor) {
              var targetVx = len > 0.01 ? vx / len * spd : 0;
              var targetVy = len > 0.01 ? vy / len * spd : 0;
              var blend = Math.min(1, dt * 4.2);
              this._pvx += (targetVx - this._pvx) * blend;
              this._pvy += (targetVy - this._pvy) * blend;
              this._px += this._pvx * dt;
              this._py += this._pvy * dt;
            } else if (len > 0.01) {
              this._px += vx / len * spd * dt;
              this._py += vy / len * spd * dt;
            }

            if (len > 0.01) {
              this._facingAngle = Math.atan2(vy, vx);

              if (Math.abs(vx) > Math.abs(vy) * 0.85) {
                this._pDir = 'side';
                this._pFacingX = vx < 0 ? -1 : 1;
              } else if (vy > 0) {
                this._pDir = 'back';
                this._pFacingX = 1;
              } else {
                this._pDir = 'front';
                this._pFacingX = 1;
              }

              this._pAnimTimer += dt;

              if (this._pAnimTimer >= 0.14) {
                this._pAnimTimer -= 0.14;
                this._pAnimIdx = (this._pAnimIdx + 1) % 4;
              }
            }
          }

          this._px = Math.max(-ARENA_HALF_W + 24, Math.min(ARENA_HALF_W - 24, this._px));
          this._py = Math.max(-ARENA_HALF_H + 24, Math.min(ARENA_HALF_H - 24, this._py)); // 石柱掩体推挤

          for (var pl of this._pillars) {
            var dx = this._px - pl.x;
            var dy = this._py - pl.y;
            var d = Math.hypot(dx, dy);
            var minD = pl.rx + 18;

            if (d > 0.01 && d < minD) {
              this._px = pl.x + dx / d * minD;
              this._py = pl.y + dy / d * minD;
            }
          } // 二阶段丹砂火蛟外圈岩浆带伤害


          if (this._lavaRimActive && (Math.abs(this._px) > ARENA_HALF_W - 76 || Math.abs(this._py) > ARENA_HALF_H - 54)) {
            this._hurtPlayer(10, true);
          } // 枯竹刺陷阱周期判定


          for (var sp of this._spikes) {
            sp.cycle = (sp.cycle + dt) % 4.2;

            if (sp.cycle >= 2.9 && Math.hypot(this._px - sp.x, this._py - sp.y) < sp.r + 10) {
              this._hurtPlayer(10, true);
            }
          } // 第 2 大关周期熔岩火圈


          if (this._stageCfg.magmaInterval > 0 && !this._roomCleared) {
            this._magmaSpawnCd -= dt;

            if (this._magmaSpawnCd <= 0) {
              this._magmaSpawnCd = this._stageCfg.magmaInterval;

              this._magmaRings.push({
                x: Math.max(-ARENA_HALF_W + 70, Math.min(ARENA_HALF_W - 70, this._px + (Math.random() - 0.5) * 90)),
                y: Math.max(-ARENA_HALF_H + 60, Math.min(ARENA_HALF_H - 60, this._py + (Math.random() - 0.5) * 90)),
                r: 58,
                warnTimer: 1.15,
                eruptTimer: 0.52
              });
            }
          }

          for (var mr of this._magmaRings) {
            if (mr.warnTimer > 0) {
              mr.warnTimer -= dt;
            } else {
              mr.eruptTimer -= dt;

              if (Math.hypot(this._px - mr.x, this._py - mr.y) < mr.r) {
                this._hurtPlayer(12, true);
              }
            }
          }

          this._magmaRings = this._magmaRings.filter(m => m.eruptTimer > 0); // 地面火焰路径

          for (var _fp of this._firePools) {
            _fp.life -= dt;

            if (Math.hypot(this._px - _fp.x, this._py - _fp.y) < _fp.r) {
              this._hurtPlayer(8, true);
            }
          }

          this._firePools = this._firePools.filter(f => f.life > 0); // 第 3 大关：周期极寒霜风 + 冰雾区 + 冰墙推挤 + 落冰柱

          if (this._stageCfg.frostWindInterval > 0 && !this._roomCleared) {
            if (this._frostWindActiveTimer > 0) {
              this._frostWindActiveTimer = Math.max(0, this._frostWindActiveTimer - dt);
            } else {
              this._frostWindCd -= dt;

              if (this._frostWindCd <= 0) {
                this._frostWindActiveTimer = 2.6;
                this._frostWindCd = this._stageCfg.frostWindInterval;
              }
            }
          }

          for (var _fp2 of this._frostPools) _fp2.life -= dt;

          this._frostPools = this._frostPools.filter(f => f.life > 0);
          this._iceWalls = this._iceWalls.filter(iw => iw.hp > 0);

          for (var iw of this._iceWalls) {
            var _dx = this._px - iw.x;

            var _dy = this._py - iw.y;

            var _d = Math.hypot(_dx, _dy);

            var _minD = iw.rx + 18;

            if (_d > 0.01 && _d < _minD) {
              this._px = iw.x + _dx / _d * _minD;
              this._py = iw.y + _dy / _d * _minD;
            }
          }

          for (var ic of this._icicles) {
            if (ic.warnTimer > 0) {
              ic.warnTimer -= dt;
            } else {
              ic.impactTimer -= dt;

              var sheltered = this._iceWalls.some(iw => Math.hypot(this._px - iw.x, this._py - iw.y) < iw.rx + 46);

              if (!sheltered && Math.hypot(this._px - ic.x, this._py - ic.y) < ic.r) {
                this._hurtPlayer(14, true);
              }
            }
          }

          this._icicles = this._icicles.filter(ic => ic.impactTimer > 0); // 第 4 大关：驱雾古灯交互 + 毒沼泥潭

          for (var lt of this._lanterns) {
            if (!lt.lit && Math.hypot(this._px - lt.x, this._py - lt.y) < 52) {
              var _this$_onToast28;

              lt.lit = true;

              var left = this._lanterns.filter(x => !x.lit).length;

              (_this$_onToast28 = this._onToast) == null || _this$_onToast28.call(this, left === 0 ? '两盏古灯已全亮，暗紫瘴雾尽数散去！' : '已点亮 1 盏驱雾古灯，再点亮 1 盏即可彻底驱雾！');
            }
          }

          for (var pp of this._poisonPools) {
            if (!pp.permanent) pp.life -= dt;

            if (Math.hypot(this._px - pp.x, this._py - pp.y) < pp.r) {
              this._hurtPlayer(8, true);
            }
          }

          this._poisonPools = this._poisonPools.filter(p => p.permanent || p.life > 0);
          this._lightnings = this._lightnings.filter(l => {
            l.life -= dt;
            return l.life > 0;
          });
          this._copperBoostTimer = Math.max(0, this._copperBoostTimer - dt);

          if (this._copperPillars.length >= 2 && !this._roomCleared) {
            var period = this._copperBoostTimer > 0 ? 2.6 : 4.2;
            this._copperArcCycle = (this._copperArcCycle + dt) % period;
            var activeStart = period - 0.9;

            if (this._copperArcCycle >= activeStart) {
              for (var i = 0; i < this._copperPillars.length; i++) {
                var a = this._copperPillars[i];
                var b = this._copperPillars[(i + 1) % this._copperPillars.length];
                if (this._copperPillars.length === 2 && i === 1) break;

                var _vx = b.x - a.x;

                var _vy = b.y - a.y;

                var l2 = _vx * _vx + _vy * _vy || 1;
                var t = Math.max(0, Math.min(1, ((this._px - a.x) * _vx + (this._py - a.y) * _vy) / l2));
                var cx = a.x + _vx * t;
                var cy = a.y + _vy * t;

                if (Math.hypot(this._px - cx, this._py - cy) < 18) {
                  this._hurtPlayer(12, true);
                }
              }
            }
          }

          for (var tz of this._thunderZones) {
            if (tz.warnTimer > 0) {
              tz.warnTimer -= dt;

              if (tz.warnTimer <= 0) {
                this._lightnings.push({
                  x: tz.x,
                  y: tz.y,
                  life: 0.28
                });
              }
            } else {
              tz.strikeTimer -= dt;

              if (Math.hypot(this._px - tz.x, this._py - tz.y) < tz.r) {
                this._hurtPlayer(15, true);
              }
            }
          }

          this._thunderZones = this._thunderZones.filter(tz => tz.strikeTimer > 0);
          var prevRodCount = this._lightningRods.length;
          this._lightningRods = this._lightningRods.filter(r => r.hp > 0);

          if (prevRodCount > 0 && this._lightningRods.length === 0) {
            var tl = this._enemies.find(e => e.kind === 'boss_thunder_lord' && e.hp > 0);

            if (tl) {
              var _this$_onToast29;

              tl.stunTimer = 2.6;

              this._booms.push({
                x: tl.x,
                y: tl.y,
                radius: 130,
                life: 0.35
              });

              (_this$_onToast29 = this._onToast) == null || _this$_onToast29.call(this, '三根避雷针尽数击碎！九霄雷公傀雷盾瓦解并陷入眩晕！');
            }
          }

          if (this._lightningRods.length >= 2) {
            for (var _i6 = 0; _i6 < this._lightningRods.length; _i6++) {
              var _a2 = this._lightningRods[_i6];
              var _b = this._lightningRods[(_i6 + 1) % this._lightningRods.length];
              if (this._lightningRods.length === 2 && _i6 === 1) break;

              var _vx2 = _b.x - _a2.x;

              var _vy2 = _b.y - _a2.y;

              var _l = _vx2 * _vx2 + _vy2 * _vy2 || 1;

              var _t = Math.max(0, Math.min(1, ((this._px - _a2.x) * _vx2 + (this._py - _a2.y) * _vy2) / _l));

              if (Math.hypot(this._px - (_a2.x + _vx2 * _t), this._py - (_a2.y + _vy2 * _t)) < 16) {
                this._hurtPlayer(12, true);
              }
            }
          }

          for (var rv of this._riftVortices) {
            rv.phase += dt * 3.2;

            var _dx2 = rv.x - this._px;

            var _dy2 = rv.y - this._py;

            var _d2 = Math.hypot(_dx2, _dy2);

            if (_d2 > 8 && _d2 < rv.r * 2.5 && this._dodgeTimer <= 0) {
              var pull = (1 - _d2 / (rv.r * 2.5)) * 78;
              this._px += _dx2 / _d2 * pull * dt;
              this._py += _dy2 / _d2 * pull * dt;
            }

            if (_d2 < rv.r * 0.45) {
              this._hurtPlayer(10, true);
            }
          }

          if (this._stageCfg.hasSealRing && !this._roomCleared) {
            this._sealAngle += dt * 0.48;

            for (var k = 0; k < 2; k++) {
              var _a3 = this._sealAngle + k * Math.PI;

              var _dx3 = Math.cos(_a3);

              var _dy3 = Math.sin(_a3);

              var proj = this._px * _dx3 + this._py * _dy3;

              if (proj > 45 && proj < 390 && Math.abs(this._px * _dy3 - this._py * _dx3) < 15) {
                this._hurtPlayer(11, true);
              }
            }
          }

          var prevOrbCount = this._riftOrbs.length;

          var overlord = this._enemies.find(e => e.kind === 'boss_rift_overlord' && e.hp > 0);

          for (var orb of this._riftOrbs) {
            orb.angle += dt * 1.9;

            if (overlord) {
              orb.x = overlord.x + Math.cos(orb.angle) * orb.dist;
              orb.y = overlord.y + Math.sin(orb.angle) * orb.dist;
            }
          }

          this._riftOrbs = this._riftOrbs.filter(o => o.hp > 0);

          if (prevOrbCount > 0 && this._riftOrbs.length === 0 && overlord) {
            var _this$_onToast30;

            overlord.stunTimer = 3.0;

            this._booms.push({
              x: overlord.x,
              y: overlord.y,
              radius: 155,
              life: 0.4
            });

            (_this$_onToast30 = this._onToast) == null || _this$_onToast30.call(this, '裂隙核心法球已被斩碎！古渊裂隙之主虚空护盾破裂，全力输出！');
          } // 首领四向激光


          for (var bl of this._bossLasers) {
            if (bl.warnTimer > 0) {
              bl.warnTimer -= dt;
            } else {
              bl.activeTimer -= dt;
              bl.angle += dt * 0.55;

              for (var _k = 0; _k < 4; _k++) {
                var _a4 = bl.angle + _k * Math.PI / 2;

                var _dx4 = Math.cos(_a4);

                var _dy4 = Math.sin(_a4);

                var rx = this._px - bl.x;
                var ry = this._py - bl.y;

                var _proj4 = rx * _dx4 + ry * _dy4;

                if (_proj4 > 0 && Math.abs(rx * _dy4 - ry * _dx4) < 18) {
                  this._hurtPlayer(14, false);
                }
              }
            }
          }

          this._bossLasers = this._bossLasers.filter(bl => bl.activeTimer > 0); // 宝箱房交互

          if (this._chest && !this._chest.opened && Math.hypot(this._px - this._chest.x, this._py - this._chest.y) < 58) {
            var _this$_onToast31;

            this._chest.opened = true;
            this._lootGold += 45;
            this._lootIron += 1;
            this._trialPotatoes += 1;

            this._refreshButtonLabels();

            this._roomCleared = true;
            this._doorLbl.string = '石门已开 →';
            (_this$_onToast31 = this._onToast) == null || _this$_onToast31.call(this, '开启古玉宝箱：金币 +45、玄铁矿 +1、局内雷火薯 +1！向右前往下一关');
          } // 穿云笋炮台


          for (var _t2 of this._turrets) {
            _t2.life -= dt;
            _t2.fireCd -= dt;

            if (_t2.fireCd <= 0) {
              var target = this._findNearestEnemy(_t2.x, _t2.y);

              if (target) {
                var ang = Math.atan2(target.y - _t2.y, target.x - _t2.x);

                this._bullets.push({
                  fromPlayer: true,
                  x: _t2.x,
                  y: _t2.y,
                  vx: Math.cos(ang) * 480,
                  vy: Math.sin(ang) * 480,
                  dmg: 15,
                  radius: 6,
                  life: 1.2,
                  color: new Color(102, 214, 128, 255)
                });

                _t2.fireCd = 0.68;
              }
            }
          }

          this._turrets = this._turrets.filter(t => t.life > 0); // 怪物差异化 AI 更新

          this._stepEnemies(dt); // 子弹移动与碰撞（含瘴雾花追踪孢子、冰墙阻挡与鬼面蛛定身网）


          for (var _b2 of this._bullets) {
            if (!_b2.fromPlayer && _b2.homing) {
              var ta = Math.atan2(this._py - _b2.y, this._px - _b2.x);
              var curSpd = Math.hypot(_b2.vx, _b2.vy) || 145;
              _b2.vx += (Math.cos(ta) * curSpd - _b2.vx) * Math.min(1, dt * 2.2);
              _b2.vy += (Math.sin(ta) * curSpd - _b2.vy) * Math.min(1, dt * 2.2);
            }

            _b2.x += _b2.vx * dt;
            _b2.y += _b2.vy * dt;
            _b2.life -= dt;

            if (Math.abs(_b2.x) > ARENA_HALF_W || Math.abs(_b2.y) > ARENA_HALF_H) {
              var _b2$bouncesLeft;

              if (((_b2$bouncesLeft = _b2.bouncesLeft) != null ? _b2$bouncesLeft : 0) > 0) {
                var _b2$bouncesLeft2;

                _b2.bouncesLeft = ((_b2$bouncesLeft2 = _b2.bouncesLeft) != null ? _b2$bouncesLeft2 : 0) - 1;

                if (Math.abs(_b2.x) > ARENA_HALF_W) {
                  _b2.x = Math.sign(_b2.x) * (ARENA_HALF_W - 2);
                  _b2.vx = -_b2.vx;
                }

                if (Math.abs(_b2.y) > ARENA_HALF_H) {
                  _b2.y = Math.sign(_b2.y) * (ARENA_HALF_H - 2);
                  _b2.vy = -_b2.vy;
                }
              } else {
                _b2.life = 0;
                continue;
              }
            }

            var hitPillar = false;

            for (var _pl of this._pillars) {
              if (Math.hypot(_b2.x - _pl.x, _b2.y - _pl.y) < _pl.rx + _b2.radius * 0.5) {
                hitPillar = true;
                break;
              }
            }

            if (hitPillar) {
              _b2.life = 0;
              continue;
            }

            var hitIceWall = false;

            for (var _iw of this._iceWalls) {
              if (_iw.hp > 0 && Math.hypot(_b2.x - _iw.x, _b2.y - _iw.y) < _iw.rx + _b2.radius) {
                if (_b2.fromPlayer) _iw.hp -= _b2.dmg;
                hitIceWall = true;
                break;
              }
            }

            if (hitIceWall) {
              _b2.life = 0;
              continue;
            }

            if (_b2.fromPlayer) {
              for (var j of this._jars) {
                if (!j.exploded && Math.hypot(j.x - _b2.x, j.y - _b2.y) <= j.r + _b2.radius) {
                  this._triggerJarExplosion(j);

                  _b2.life = 0;
                  break;
                }
              }

              if (_b2.life <= 0) continue;
              var sbBul = this._blessings.has('shield_breaker') ? 1.65 : 1.0;
              var hitObj = false;

              for (var rod of this._lightningRods) {
                if (rod.hp > 0 && Math.hypot(rod.x - _b2.x, rod.y - _b2.y) <= rod.r + _b2.radius) {
                  rod.hp -= Math.round(_b2.dmg * sbBul);
                  _b2.life = 0;
                  hitObj = true;
                  break;
                }
              }

              if (hitObj) continue;

              for (var _orb2 of this._riftOrbs) {
                if (_orb2.hp > 0 && Math.hypot(_orb2.x - _b2.x, _orb2.y - _b2.y) <= _orb2.r + _b2.radius) {
                  _orb2.hp -= Math.round(_b2.dmg * sbBul);
                  _b2.life = 0;
                  hitObj = true;
                  break;
                }
              }

              if (hitObj) continue;

              for (var e of this._enemies) {
                if (e.hp > 0 && e.burrowTimer <= 0 && Math.hypot(e.x - _b2.x, e.y - _b2.y) <= e.radius + _b2.radius) {
                  this._damageEnemy(e, _b2.dmg, false);

                  _b2.life = 0;
                  break;
                }
              }
            } else if (Math.hypot(this._px - _b2.x, this._py - _b2.y) <= 18 + _b2.radius) {
              this._hurtPlayer(_b2.dmg, false);

              if (_b2.rootsPlayer && !this._blessings.has('frost_ward')) {
                this._rootTimer = 1.1;
              }

              if (_b2.drainsMana && !this._blessings.has('mana_spring')) {
                this._mana = Math.max(0, this._mana - 12);
              }

              _b2.life = 0;
            }
          }

          this._enemies = this._enemies.filter(e => e.hp > 0);
          this._bullets = this._bullets.filter(b => b.life > 0);
          this._lasers = this._lasers.filter(l => {
            l.life -= dt;
            return l.life > 0;
          });
          this._slashes = this._slashes.filter(s => {
            s.life -= dt;
            return s.life > 0;
          });
          this._booms = this._booms.filter(b => {
            b.life -= dt;
            return b.life > 0;
          });

          if (this._hp <= 0) {
            this._finishRun(false, "\u5728 " + this._stageCfg.label + " \u529B\u7AED\u9000\u56DE\u4E3B\u5C9B\uFF08\u5DF2\u5E26\u56DE 70% \u6218\u5229\u54C1\uFF09");

            return;
          } // 清房判定（祝福房和宝箱房由交互触发 _roomCleared）


          if (this._stageCfg.roomKind !== 'blessing' && this._stageCfg.roomKind !== 'chest' && this._stageCfg.roomKind !== 'blacksmith' && this._enemies.length === 0 && !this._roomCleared) {
            this._onStageCleared();
          } // 走入东侧石门进入下一关


          if (this._roomCleared && !this._waitingChoice && this._stageNum < (_crd && DUNGEON_IMPLEMENTED_MAX_STAGE === void 0 ? (_reportPossibleCrUseOfDUNGEON_IMPLEMENTED_MAX_STAGE({
            error: Error()
          }), DUNGEON_IMPLEMENTED_MAX_STAGE) : DUNGEON_IMPLEMENTED_MAX_STAGE)) {
            if (this._px > ARENA_HALF_W - 68 && Math.abs(this._py) < 62) {
              this._startStage(this._stageNum + 1);
            }
          }
        }

        _stepEnemies(dt) {
          var _this2 = this;

          var toSpawn = [];

          var _loop5 = function _loop5(e) {
            var _e$allyShieldTimer2, _e$allyShieldTimer3, _e$stunTimer;

            e.hitFlash = Math.max(0, e.hitFlash - dt);
            if (((_e$allyShieldTimer2 = e.allyShieldTimer) != null ? _e$allyShieldTimer2 : 0) > 0) e.allyShieldTimer = Math.max(0, ((_e$allyShieldTimer3 = e.allyShieldTimer) != null ? _e$allyShieldTimer3 : 0) - dt);

            if (((_e$stunTimer = e.stunTimer) != null ? _e$stunTimer : 0) > 0) {
              var _e$stunTimer2;

              e.stunTimer = Math.max(0, ((_e$stunTimer2 = e.stunTimer) != null ? _e$stunTimer2 : 0) - dt);
              return 0; // continue
            }

            var dx = _this2._px - e.x;
            var dy = _this2._py - e.y;
            var dist = Math.hypot(dx, dy) || 1;
            var st = (_crd && ENEMY_STATS === void 0 ? (_reportPossibleCrUseOfENEMY_STATS({
              error: Error()
            }), ENEMY_STATS) : ENEMY_STATS)[e.kind]; // 熔岩龟周期缩壳反伤

            if (e.kind === 'magma_turtle') {
              e.shellTimer -= dt;

              if (e.shellTimer <= 0) {
                e.shellActive = !e.shellActive;
                e.shellTimer = e.shellActive ? 2.1 : 3.1;
              }
            } // 丹砂火蛟潜行钻地 & 冲锋


            if (e.kind === 'boss_magma_wyrm') {
              if (e.burrowTimer > 0) {
                e.burrowTimer -= dt;
                e.x += dx / dist * (e.phase2 ? 205 : 165) * dt;
                e.y += dy / dist * (e.phase2 ? 205 : 165) * dt;

                if (e.burrowTimer <= 0) {
                  _this2._booms.push({
                    x: e.x,
                    y: e.y,
                    radius: 92,
                    life: 0.3
                  });

                  e.dashTimer = 0.72;
                  var a = Math.atan2(_this2._py - e.y, _this2._px - e.x);
                  e.dashVx = Math.cos(a) * (e.phase2 ? 320 : 265);
                  e.dashVy = Math.sin(a) * (e.phase2 ? 320 : 265); // 破土释放环形火星

                  var cnt = e.phase2 ? 10 : 6;

                  for (var i = 0; i < cnt; i++) {
                    var ba = i * Math.PI * 2 / cnt;

                    _this2._bullets.push({
                      fromPlayer: false,
                      x: e.x,
                      y: e.y,
                      vx: Math.cos(ba) * 215,
                      vy: Math.sin(ba) * 215,
                      dmg: 12,
                      radius: 7,
                      life: 2.5,
                      color: new Color(255, 118, 56, 255)
                    });
                  }
                }

                return 0; // continue
              }

              if (e.dashTimer > 0) {
                e.dashTimer -= dt;
                e.x += e.dashVx * dt;
                e.y += e.dashVy * dt;
                e.trailCd -= dt;

                if (e.trailCd <= 0) {
                  e.trailCd = 0.22;

                  _this2._firePools.push({
                    x: e.x,
                    y: e.y,
                    r: 30,
                    life: 3.6
                  });
                }
              } else {
                e.x += dx / dist * e.speed * dt;
                e.y += dy / dist * e.speed * dt;
              }

              e.specialCd -= dt;

              if (e.specialCd <= 0) {
                e.burrowTimer = 1.1;
                e.specialCd = e.phase2 ? 4.4 : 5.6;
              }
            } else if (e.kind === 'fire_bat') {
              // 赤炎蝙蝠：Z 字蛇形高速俯冲
              var perpX = -dy / dist;
              var perpY = dx / dist;
              var sway = Math.sin(_this2._animClock * 7 + e.wavePhase) * 0.75;
              e.x += (dx / dist + perpX * sway) * e.speed * dt;
              e.y += (dy / dist + perpY * sway) * e.speed * dt;
            } else if (e.kind === 'fire_taoist') {
              // 火符道童：边游走边留地面火径
              if (dist > 140) {
                e.x += dx / dist * e.speed * dt;
                e.y += dy / dist * e.speed * dt;
              }

              e.trailCd -= dt;

              if (e.trailCd <= 0) {
                e.trailCd = 0.75;

                _this2._firePools.push({
                  x: e.x,
                  y: e.y,
                  r: 24,
                  life: 3.4
                });
              }
            } else if (e.kind === 'shadow_ink_assassin') {
              // 影墨刺客：周期隐身瞬移到玩家身后背刺
              if (e.stealthTimer > 0) {
                e.stealthTimer -= dt;

                if (e.stealthTimer <= 0) {
                  e.x = Math.max(-ARENA_HALF_W + 40, Math.min(ARENA_HALF_W - 40, _this2._px - Math.cos(_this2._facingAngle) * 76));
                  e.y = Math.max(-ARENA_HALF_H + 40, Math.min(ARENA_HALF_H - 40, _this2._py - Math.sin(_this2._facingAngle) * 76));

                  var _ba = Math.atan2(_this2._py - e.y, _this2._px - e.x);

                  for (var off of [-0.24, 0, 0.24]) {
                    _this2._bullets.push({
                      fromPlayer: false,
                      x: e.x,
                      y: e.y,
                      vx: Math.cos(_ba + off) * 265,
                      vy: Math.sin(_ba + off) * 265,
                      dmg: 11,
                      radius: 6,
                      life: 1.9,
                      color: new Color(188, 126, 255, 255)
                    });
                  }
                }
              } else {
                e.x += dx / dist * e.speed * dt;
                e.y += dy / dist * e.speed * dt;
                e.specialCd -= dt;

                if (e.specialCd <= 0) {
                  e.stealthTimer = 1.25;
                  e.specialCd = 4.6;
                }
              }
            } else if (e.kind === 'venom_frog') {
              // 毒蛙精：周期跳跃扑击并在落点留毒沼
              if (e.leapTimer > 0) {
                e.leapTimer -= dt;
                e.x += e.leapVx * dt;
                e.y += e.leapVy * dt;

                if (e.leapTimer <= 0) {
                  _this2._poisonPools.push({
                    x: e.x,
                    y: e.y,
                    r: 40,
                    life: 5.8
                  });
                }
              } else {
                e.specialCd -= dt;

                if (e.specialCd <= 0) {
                  e.leapTimer = 0.45;
                  e.leapVx = dx / dist * 290;
                  e.leapVy = dy / dist * 290;
                  e.specialCd = 2.6;
                } else if (dist > 120) {
                  e.x += dx / dist * (e.speed * 0.55) * dt;
                  e.y += dy / dist * (e.speed * 0.55) * dt;
                }
              }
            } else if (e.kind === 'bronze_guardian') {
              if (e.dashTimer > 0) {
                e.dashTimer -= dt;
                e.x += e.dashVx * dt;
                e.y += e.dashVy * dt;
              } else {
                e.x += dx / dist * e.speed * dt;
                e.y += dy / dist * e.speed * dt;
                e.specialCd -= dt;

                if (e.specialCd <= 0 && dist < 340) {
                  e.dashTimer = 0.52;
                  e.dashVx = dx / dist * 320;
                  e.dashVy = dy / dist * 320;
                  e.specialCd = 3.6;
                }
              }
            } else if (e.kind === 'arc_sparrow') {
              var _perpX = -dy / dist;

              var _perpY = dx / dist;

              var dir = Math.sin(_this2._animClock * 3.5 + e.wavePhase) >= 0 ? 1 : -1;
              var approach = dist > 230 ? 0.65 : dist < 130 ? -0.55 : 0;
              e.x += (dx / dist * approach + _perpX * dir * 0.85) * e.speed * dt;
              e.y += (dy / dist * approach + _perpY * dir * 0.85) * e.speed * dt;
            } else if (e.kind === 'boss_thunder_lion') {
              if (e.leapTimer > 0) {
                e.leapTimer -= dt;
                e.x += e.leapVx * dt;
                e.y += e.leapVy * dt;

                if (e.leapTimer <= 0) {
                  _this2._booms.push({
                    x: e.x,
                    y: e.y,
                    radius: 100,
                    life: 0.32
                  });

                  for (var k = 0; k < 4; k++) {
                    var _ba2 = k * Math.PI / 2;

                    _this2._bullets.push({
                      fromPlayer: false,
                      x: e.x,
                      y: e.y,
                      vx: Math.cos(_ba2) * 285,
                      vy: Math.sin(_ba2) * 285,
                      dmg: 13,
                      radius: 8,
                      life: 2.2,
                      color: new Color(255, 224, 92, 255),
                      bouncesLeft: 1
                    });
                  }

                  _this2._thunderZones.push({
                    x: _this2._px,
                    y: _this2._py,
                    r: 52,
                    warnTimer: 0.95,
                    strikeTimer: 0.38
                  });
                }
              } else {
                e.x += dx / dist * e.speed * dt;
                e.y += dy / dist * e.speed * dt;
                e.specialCd -= dt;

                if (e.specialCd <= 0) {
                  e.leapTimer = 0.48;
                  e.leapVx = dx / dist * 350;
                  e.leapVy = dy / dist * 350;
                  _this2._copperBoostTimer = 4.5;
                  e.specialCd = 3.8;
                }
              }
            } else if (e.kind === 'rift_walker') {
              e.specialCd -= dt;

              if (e.specialCd <= 0) {
                var ang = Math.random() * Math.PI * 2;
                e.x = Math.max(-ARENA_HALF_W + 50, Math.min(ARENA_HALF_W - 50, _this2._px + Math.cos(ang) * 165));
                e.y = Math.max(-ARENA_HALF_H + 50, Math.min(ARENA_HALF_H - 50, _this2._py + Math.sin(ang) * 135));

                for (var _i7 = 0; _i7 < 6; _i7++) {
                  var _ba3 = _i7 * Math.PI * 2 / 6;

                  _this2._bullets.push({
                    fromPlayer: false,
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(_ba3) * 215,
                    vy: Math.sin(_ba3) * 215,
                    dmg: 12,
                    radius: 7,
                    life: 2.2,
                    color: new Color(102, 246, 214, 255)
                  });
                }

                e.specialCd = 3.8;
              } else if (dist > 150) {
                e.x += dx / dist * e.speed * dt;
                e.y += dy / dist * e.speed * dt;
              }
            } else if (e.kind === 'boss_rift_overlord') {
              var _e$formTimer;

              if (!e.elementForm) {
                e.elementForm = 'fire';
                e.formTimer = 6.0;
              }

              e.formTimer = ((_e$formTimer = e.formTimer) != null ? _e$formTimer : 6.0) - dt;

              if (e.formTimer <= 0) {
                e.elementForm = e.elementForm === 'fire' ? 'frost' : e.elementForm === 'frost' ? 'thunder' : 'fire';
                e.formTimer = e.phase2 ? 4.8 : 6.2;
              }

              if (dist > 160) {
                e.x += dx / dist * e.speed * dt;
                e.y += dy / dist * e.speed * dt;
              }
            } else if (e.kind === 'miasma_flower' || e.kind === 'boss_ink_lotus') {// 固定植物型，原地微调
            } else if (!e.shellActive) {
              var keepDist = e.kind === 'ink_spirit' || e.kind === 'ice_prism' || e.kind === 'thunder_drummer' || e.kind === 'star_puppet' || e.kind === 'boss_twin_ranged';

              if (!keepDist || dist > 195) {
                e.x += dx / dist * e.speed * dt;
                e.y += dy / dist * e.speed * dt;
              }
            }

            e.x = Math.max(-ARENA_HALF_W + e.radius, Math.min(ARENA_HALF_W - e.radius, e.x));
            e.y = Math.max(-ARENA_HALF_H + e.radius, Math.min(ARENA_HALF_H - e.radius, e.y));

            if (dist < e.radius + 18) {
              _this2._hurtPlayer(st.contactDmg, false);

              if (e.kind === 'mana_eater' && !_this2._blessings.has('mana_spring')) {
                _this2._mana = Math.max(0, _this2._mana - 14);
                e.hp = Math.min(e.maxHp, e.hp + 10);
              }
            } // 攻击与首领技能


            e.fireCd -= dt;

            if (e.fireCd <= 0) {
              var aim = Math.atan2(dy, dx);

              if (e.kind === 'boss_giant_bamboo') {
                // 1-5 巨竹妖王：3 道扩散冲击波 + 周期召唤小竹精
                for (var _off of [-0.32, 0, 0.32]) {
                  _this2._bullets.push({
                    fromPlayer: false,
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(aim + _off) * 235,
                    vy: Math.sin(aim + _off) * 235,
                    dmg: 11,
                    radius: 9,
                    life: 2.6,
                    color: new Color(156, 232, 118, 255)
                  });
                }

                e.fireCd = 1.65;
                e.specialCd -= 1.65;

                if (e.specialCd <= 0 && _this2._enemies.length < 5) {
                  toSpawn.push({
                    kind: 'bamboo_imp',
                    x: e.x - 40,
                    y: e.y + 60
                  }, {
                    kind: 'bamboo_imp',
                    x: e.x - 40,
                    y: e.y - 60
                  });
                  e.specialCd = 6.5;
                }
              } else if (e.kind === 'boss_stone_spirit') {
                // 1-10 古墟石灵：一阶段 8 向弹环；二阶段 10 向弹环 + 四向旋转激光
                var _cnt = e.phase2 ? 10 : 8;

                for (var _i8 = 0; _i8 < _cnt; _i8++) {
                  var _a5 = aim + _i8 * Math.PI * 2 / _cnt;

                  _this2._bullets.push({
                    fromPlayer: false,
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(_a5) * (e.phase2 ? 225 : 205),
                    vy: Math.sin(_a5) * (e.phase2 ? 225 : 205),
                    dmg: 12,
                    radius: 8,
                    life: 3.0,
                    color: new Color(238, 120, 178, 255)
                  });
                }

                e.fireCd = e.phase2 ? 1.45 : 1.7;

                if (e.phase2) {
                  e.specialCd -= 1.45;

                  if (e.specialCd <= 0) {
                    _this2._bossLasers.push({
                      x: e.x,
                      y: e.y,
                      angle: aim,
                      warnTimer: 0.85,
                      activeTimer: 1.4
                    });

                    e.specialCd = 5.2;
                  }
                }
              } else if (e.kind === 'boss_magma_furnace') {
                // 2-5 赤焰炉灵：6 向旋转喷火 + 点亮四角火盆火圈
                for (var _i9 = 0; _i9 < 6; _i9++) {
                  var _a6 = _this2._animClock * 1.6 + _i9 * Math.PI * 2 / 6;

                  _this2._bullets.push({
                    fromPlayer: false,
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(_a6) * 215,
                    vy: Math.sin(_a6) * 215,
                    dmg: 12,
                    radius: 8,
                    life: 2.8,
                    color: new Color(255, 128, 62, 255)
                  });
                }

                e.fireCd = 1.25;
                e.specialCd -= 1.25;

                if (e.specialCd <= 0) {
                  var corners = [[-260, 140], [-260, -140], [220, 140], [220, -140]];

                  for (var [cx, cy] of corners) {
                    _this2._magmaRings.push({
                      x: cx,
                      y: cy,
                      r: 68,
                      warnTimer: 1.1,
                      eruptTimer: 0.55
                    });
                  }

                  e.specialCd = 5.2;
                }
              } else if (e.kind === 'ink_spirit') {
                var offsets = e.elite ? [-0.24, 0, 0.24] : [0];

                for (var _off2 of offsets) {
                  _this2._bullets.push({
                    fromPlayer: false,
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(aim + _off2) * 230,
                    vy: Math.sin(aim + _off2) * 230,
                    dmg: 9,
                    radius: 7,
                    life: 2.6,
                    color: new Color(196, 118, 232, 255)
                  });
                }

                e.fireCd = 1.65;
              } else if (e.kind === 'boss_frost_crane') {
                // 3-5 玄冰鹤使：瞬移至四角 + 5 羽扇形冰锥 + 落点减速冰环
                for (var _off3 of [-0.42, -0.21, 0, 0.21, 0.42]) {
                  _this2._bullets.push({
                    fromPlayer: false,
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(aim + _off3) * 265,
                    vy: Math.sin(aim + _off3) * 265,
                    dmg: 12,
                    radius: 7,
                    life: 2.4,
                    color: new Color(134, 232, 255, 255)
                  });
                }

                e.fireCd = 1.45;
                e.specialCd -= 1.45;

                if (e.specialCd <= 0) {
                  var _corners = [[-290, 145], [-290, -145], [290, 145], [290, -145]];

                  var pick = _corners[Math.floor(Math.random() * _corners.length)];

                  e.x = pick[0];
                  e.y = pick[1];

                  _this2._frostPools.push({
                    x: e.x,
                    y: e.y,
                    r: 78,
                    life: 5.0
                  });

                  e.specialCd = 3.8;
                }
              } else if (e.kind === 'boss_frost_turtle') {
                // 3-10 寒玉玄龟：召唤冰墙护体；二阶段全屏预警落冰柱
                var _cnt2 = e.phase2 ? 10 : 6;

                for (var _i10 = 0; _i10 < _cnt2; _i10++) {
                  var _a7 = aim + _i10 * Math.PI * 2 / _cnt2;

                  _this2._bullets.push({
                    fromPlayer: false,
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(_a7) * 215,
                    vy: Math.sin(_a7) * 215,
                    dmg: 13,
                    radius: 8,
                    life: 2.8,
                    color: new Color(122, 218, 255, 255)
                  });
                }

                e.fireCd = e.phase2 ? 1.4 : 1.65;
                e.specialCd -= e.fireCd;

                if (e.specialCd <= 0) {
                  if (_this2._iceWalls.length < 2) {
                    _this2._iceWalls.push({
                      id: _this2._nextIceWallId++,
                      x: Math.max(-ARENA_HALF_W + 90, e.x - 105),
                      y: Math.max(-ARENA_HALF_H + 60, Math.min(ARENA_HALF_H - 60, e.y + (Math.random() > 0.5 ? 70 : -70))),
                      hp: 90,
                      maxHp: 90,
                      rx: 28,
                      ry: 34
                    });
                  }

                  if (e.phase2) {
                    for (var _k2 = 0; _k2 < 5; _k2++) {
                      _this2._icicles.push({
                        x: (Math.random() - 0.5) * (ARENA_HALF_W * 1.65),
                        y: (Math.random() - 0.5) * (ARENA_HALF_H * 1.5),
                        r: 52,
                        warnTimer: 1.15,
                        impactTimer: 0.45
                      });
                    }
                  }

                  e.specialCd = e.phase2 ? 4.2 : 5.4;
                }
              } else if (e.kind === 'boss_ink_lotus') {
                // 4-5 百目墨莲：8 向孢子环 + 四象限触手交叉毒箭
                for (var _i11 = 0; _i11 < 8; _i11++) {
                  var _a8 = _this2._animClock * 1.1 + _i11 * Math.PI * 2 / 8;

                  _this2._bullets.push({
                    fromPlayer: false,
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(_a8) * 205,
                    vy: Math.sin(_a8) * 205,
                    dmg: 12,
                    radius: 7,
                    life: 2.8,
                    color: new Color(192, 122, 255, 255)
                  });
                }

                e.fireCd = 1.45;
                e.specialCd -= 1.45;

                if (e.specialCd <= 0) {
                  var pts = [[-320, 170], [-320, -170], [320, 170], [320, -170]];

                  for (var [qx, qy] of pts) {
                    var qa = Math.atan2(_this2._py - qy, _this2._px - qx);

                    _this2._bullets.push({
                      fromPlayer: false,
                      x: qx,
                      y: qy,
                      vx: Math.cos(qa) * 235,
                      vy: Math.sin(qa) * 235,
                      dmg: 12,
                      radius: 8,
                      life: 2.6,
                      color: new Color(132, 232, 152, 255)
                    });
                  }

                  e.specialCd = 3.6;
                }
              } else if (e.kind === 'boss_ghost_spider') {
                // 4-10 幽泽鬼面蛛：定身蛛网弹 + 散射毒弹 + 周期熄灭古灯
                _this2._bullets.push({
                  fromPlayer: false,
                  x: e.x,
                  y: e.y,
                  vx: Math.cos(aim) * 275,
                  vy: Math.sin(aim) * 275,
                  dmg: 12,
                  radius: 9,
                  life: 2.5,
                  color: new Color(242, 236, 255, 255),
                  rootsPlayer: true
                });

                for (var _off4 of [-0.36, 0.36]) {
                  _this2._bullets.push({
                    fromPlayer: false,
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(aim + _off4) * 225,
                    vy: Math.sin(aim + _off4) * 225,
                    dmg: 12,
                    radius: 7,
                    life: 2.4,
                    color: new Color(178, 118, 248, 255)
                  });
                }

                e.fireCd = e.isIllusion ? 2.1 : e.phase2 ? 1.25 : 1.5;

                if (!e.isIllusion) {
                  e.specialCd -= e.fireCd;

                  if (e.specialCd <= 0) {
                    var litOne = _this2._lanterns.find(l => l.lit);

                    if (litOne) {
                      litOne.lit = false;
                      _this2._onToast == null || _this2._onToast('幽泽鬼面蛛扑灭了一盏驱雾古灯！');
                    }

                    e.specialCd = 7.5;
                  }
                }
              } else if (e.kind === 'ice_prism') {
                var _offsets = e.elite ? [-0.14, 0.14] : [0];

                for (var _off5 of _offsets) {
                  _this2._bullets.push({
                    fromPlayer: false,
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(aim + _off5) * 330,
                    vy: Math.sin(aim + _off5) * 330,
                    dmg: 11,
                    radius: 6,
                    life: 2.2,
                    color: new Color(132, 230, 255, 255)
                  });
                }

                e.fireCd = st.fireCd;
              } else if (e.kind === 'thunder_drummer') {
                _this2._thunderZones.push({
                  x: Math.max(-ARENA_HALF_W + 45, Math.min(ARENA_HALF_W - 45, _this2._px + (Math.random() - 0.5) * 40)),
                  y: Math.max(-ARENA_HALF_H + 45, Math.min(ARENA_HALF_H - 45, _this2._py + (Math.random() - 0.5) * 40)),
                  r: 48,
                  warnTimer: 1.05,
                  strikeTimer: 0.35
                });

                e.fireCd = st.fireCd;
              } else if (e.kind === 'arc_sparrow') {
                for (var _off6 of [-0.18, 0, 0.18]) {
                  _this2._bullets.push({
                    fromPlayer: false,
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(aim + _off6) * 265,
                    vy: Math.sin(aim + _off6) * 265,
                    dmg: 11,
                    radius: 6,
                    life: 2.3,
                    color: new Color(255, 236, 118, 255),
                    bouncesLeft: _this2._stageCfg.hasReflectWalls ? 1 : 0
                  });
                }

                e.fireCd = st.fireCd;
              } else if (e.kind === 'bronze_guardian') {
                _this2._bullets.push({
                  fromPlayer: false,
                  x: e.x,
                  y: e.y,
                  vx: Math.cos(aim) * 235,
                  vy: Math.sin(aim) * 235,
                  dmg: 13,
                  radius: 8,
                  life: 2.2,
                  color: new Color(246, 198, 92, 255),
                  bouncesLeft: _this2._stageCfg.hasReflectWalls ? 1 : 0
                });

                e.fireCd = st.fireCd;
              } else if (e.kind === 'boss_thunder_lion') {
                for (var _off7 of [-0.26, 0, 0.26]) {
                  _this2._bullets.push({
                    fromPlayer: false,
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(aim + _off7) * 270,
                    vy: Math.sin(aim + _off7) * 270,
                    dmg: 13,
                    radius: 8,
                    life: 2.4,
                    color: new Color(255, 224, 96, 255),
                    bouncesLeft: 1
                  });
                }

                e.fireCd = 1.45;
              } else if (e.kind === 'boss_thunder_lord') {
                var _cnt3 = e.phase2 ? 10 : 8;

                for (var _i12 = 0; _i12 < _cnt3; _i12++) {
                  var _a9 = aim + _i12 * Math.PI * 2 / _cnt3;

                  _this2._bullets.push({
                    fromPlayer: false,
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(_a9) * 235,
                    vy: Math.sin(_a9) * 235,
                    dmg: 13,
                    radius: 7,
                    life: 2.5,
                    color: new Color(255, 234, 108, 255),
                    bouncesLeft: 1
                  });
                }

                _this2._thunderZones.push({
                  x: Math.max(-ARENA_HALF_W + 50, Math.min(ARENA_HALF_W - 50, _this2._px)),
                  y: Math.max(-ARENA_HALF_H + 50, Math.min(ARENA_HALF_H - 50, _this2._py)),
                  r: 56,
                  warnTimer: 0.95,
                  strikeTimer: 0.35
                });

                e.fireCd = e.phase2 ? 1.35 : 1.65;
              } else if (e.kind === 'star_puppet') {
                var allies = _this2._enemies.filter(a => a.id !== e.id && a.hp > 0);

                if (allies.length > 0) {
                  var _pick = allies[Math.floor(Math.random() * allies.length)];
                  _pick.allyShieldTimer = 3.6;
                }

                _this2._bullets.push({
                  fromPlayer: false,
                  x: e.x,
                  y: e.y,
                  vx: Math.cos(aim) * 230,
                  vy: Math.sin(aim) * 230,
                  dmg: 12,
                  radius: 7,
                  life: 2.4,
                  color: new Color(152, 248, 232, 255)
                });

                e.fireCd = st.fireCd;
              } else if (e.kind === 'mana_eater' || e.kind === 'rift_walker') {
                _this2._bullets.push({
                  fromPlayer: false,
                  x: e.x,
                  y: e.y,
                  vx: Math.cos(aim) * 245,
                  vy: Math.sin(aim) * 245,
                  dmg: 12,
                  radius: 7,
                  life: 2.3,
                  color: e.kind === 'mana_eater' ? new Color(120, 212, 255, 255) : new Color(108, 246, 214, 255),
                  drainsMana: e.kind === 'mana_eater'
                });

                e.fireCd = st.fireCd;
              } else if (e.kind === 'boss_twin_melee') {
                var spread = e.phase2 ? [-0.36, -0.18, 0, 0.18, 0.36] : [-0.24, 0, 0.24];

                for (var _off8 of spread) {
                  _this2._bullets.push({
                    fromPlayer: false,
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(aim + _off8) * (e.phase2 ? 290 : 250),
                    vy: Math.sin(aim + _off8) * (e.phase2 ? 290 : 250),
                    dmg: 14,
                    radius: 8,
                    life: 2.2,
                    color: new Color(255, 166, 112, 255)
                  });
                }

                e.fireCd = e.phase2 ? 1.15 : 1.55;
              } else if (e.kind === 'boss_twin_ranged') {
                var _cnt4 = e.phase2 ? 10 : 6;

                for (var _i13 = 0; _i13 < _cnt4; _i13++) {
                  var _a10 = aim + _i13 * Math.PI * 2 / _cnt4;

                  _this2._bullets.push({
                    fromPlayer: false,
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(_a10) * (e.phase2 ? 245 : 215),
                    vy: Math.sin(_a10) * (e.phase2 ? 245 : 215),
                    dmg: 13,
                    radius: 7,
                    life: 2.6,
                    color: new Color(114, 248, 224, 255),
                    homing: e.phase2 && _i13 % 3 === 0
                  });
                }

                e.fireCd = e.phase2 ? 1.05 : 1.35;
              } else if (e.kind === 'boss_rift_overlord') {
                var _e$elementForm;

                var form = (_e$elementForm = e.elementForm) != null ? _e$elementForm : 'fire';

                if (form === 'fire') {
                  _this2._magmaRings.push({
                    x: _this2._px,
                    y: _this2._py,
                    r: 58,
                    warnTimer: 0.95,
                    eruptTimer: 0.42
                  });

                  var _cnt5 = e.phase2 ? 10 : 8;

                  for (var _i14 = 0; _i14 < _cnt5; _i14++) {
                    var _a11 = aim + _i14 * Math.PI * 2 / _cnt5;

                    _this2._bullets.push({
                      fromPlayer: false,
                      x: e.x,
                      y: e.y,
                      vx: Math.cos(_a11) * 235,
                      vy: Math.sin(_a11) * 235,
                      dmg: 14,
                      radius: 8,
                      life: 2.5,
                      color: new Color(255, 118, 66, 255)
                    });
                  }
                } else if (form === 'frost') {
                  var _spread = e.phase2 ? [-0.4, -0.2, 0, 0.2, 0.4] : [-0.28, -0.14, 0, 0.14, 0.28];

                  for (var _off9 of _spread) {
                    _this2._bullets.push({
                      fromPlayer: false,
                      x: e.x,
                      y: e.y,
                      vx: Math.cos(aim + _off9) * 310,
                      vy: Math.sin(aim + _off9) * 310,
                      dmg: 13,
                      radius: 7,
                      life: 2.2,
                      color: new Color(138, 232, 255, 255)
                    });
                  }
                } else {
                  _this2._thunderZones.push({
                    x: _this2._px,
                    y: _this2._py,
                    r: 54,
                    warnTimer: 0.9,
                    strikeTimer: 0.35
                  }, {
                    x: _this2._px + 95,
                    y: _this2._py - 60,
                    r: 48,
                    warnTimer: 1.05,
                    strikeTimer: 0.35
                  });

                  for (var _i15 = 0; _i15 < 6; _i15++) {
                    var _a12 = aim + _i15 * Math.PI * 2 / 6;

                    _this2._bullets.push({
                      fromPlayer: false,
                      x: e.x,
                      y: e.y,
                      vx: Math.cos(_a12) * 255,
                      vy: Math.sin(_a12) * 255,
                      dmg: 13,
                      radius: 7,
                      life: 2.3,
                      color: new Color(255, 238, 116, 255)
                    });
                  }
                }

                e.fireCd = e.phase2 ? 1.15 : 1.4;
              } else if (e.kind === 'miasma_flower') {
                _this2._bullets.push({
                  fromPlayer: false,
                  x: e.x,
                  y: e.y,
                  vx: Math.cos(aim) * 145,
                  vy: Math.sin(aim) * 145,
                  dmg: 11,
                  radius: 8,
                  life: 3.4,
                  color: new Color(198, 128, 255, 255),
                  homing: true
                });

                e.fireCd = st.fireCd;
              } else if (e.kind === 'paper_golem' || e.kind === 'magma_turtle' || e.kind === 'fire_taoist' || e.kind === 'fire_bat' || e.kind === 'snow_puppet' || e.kind === 'frost_mirror_guard' || e.kind === 'venom_frog') {
                if (!e.shellActive) {
                  _this2._bullets.push({
                    fromPlayer: false,
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(aim) * 225,
                    vy: Math.sin(aim) * 225,
                    dmg: 10,
                    radius: 7,
                    life: 2.4,
                    color: e.kind === 'venom_frog' ? new Color(128, 232, 152, 255) : e.kind === 'snow_puppet' || e.kind === 'frost_mirror_guard' ? new Color(142, 224, 255, 255) : e.kind === 'paper_golem' ? new Color(196, 118, 232, 255) : new Color(255, 134, 72, 255)
                  });
                }

                e.fireCd = st.fireCd;
              }
            }
          },
              _ret;

          for (var e of this._enemies) {
            _ret = _loop5(e);
            if (_ret === 0) continue;
          }

          for (var sp of toSpawn) this._spawnEnemy(sp.kind, sp.x, sp.y, false);
        }

        _onStageCleared() {
          var _this$_onToast33;

          this._roomCleared = true;
          var app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;

          if (app != null && app.ready) {
            var _app$saveData$dungeon, _app$saveData$dungeon2;

            var prev = (_app$saveData$dungeon = app.saveData.dungeon.highestClearedStage) != null ? _app$saveData$dungeon : 0;

            if (this._stageNum > prev) {
              app.saveData.dungeon.highestClearedStage = this._stageNum;
            }

            if (this._stageNum >= 10 && app.saveData.dungeon.deepestLayer < 1) {
              app.saveData.dungeon.deepestLayer = 1;
            }

            if (this._stageNum >= 20 && app.saveData.dungeon.deepestLayer < 2) {
              app.saveData.dungeon.deepestLayer = 2;
            }

            if (this._stageNum >= 30 && app.saveData.dungeon.deepestLayer < 3) {
              app.saveData.dungeon.deepestLayer = 3;
            }

            if (this._stageNum >= 40 && app.saveData.dungeon.deepestLayer < 4) {
              app.saveData.dungeon.deepestLayer = 4;
            }

            if (this._stageNum >= 50 && app.saveData.dungeon.deepestLayer < 5) {
              app.saveData.dungeon.deepestLayer = 5;
            }

            if (this._stageNum >= 60 && app.saveData.dungeon.deepestLayer < 6) {
              app.saveData.dungeon.deepestLayer = 6;
            }

            this._runClearedCount += 1;
            var prevBest = (_app$saveData$dungeon2 = app.saveData.dungeon.bestStreak) != null ? _app$saveData$dungeon2 : 0;

            if (this._runClearedCount > prevBest) {
              app.saveData.dungeon.bestStreak = this._runClearedCount;
            }

            if (this._stageNum >= (_crd && DUNGEON_TOTAL_STAGES === void 0 ? (_reportPossibleCrUseOfDUNGEON_TOTAL_STAGES({
              error: Error()
            }), DUNGEON_TOTAL_STAGES) : DUNGEON_TOTAL_STAGES)) {
              app.saveData.dungeon.grandCleared = true;
            }

            if (this._stageCfg.subStage === 5) {
              this._unlockAnchor(this._stageNum + 1);
            } else if (this._stageCfg.subStage === 10 && this._stageNum < (_crd && DUNGEON_IMPLEMENTED_MAX_STAGE === void 0 ? (_reportPossibleCrUseOfDUNGEON_IMPLEMENTED_MAX_STAGE({
              error: Error()
            }), DUNGEON_IMPLEMENTED_MAX_STAGE) : DUNGEON_IMPLEMENTED_MAX_STAGE)) {
              this._unlockAnchor(this._stageNum + 1);
            }

            app.persist('dungeon_stage_clear');
          }

          if (this._stageCfg.roomKind === 'elite_bounty') {
            var _this$_onToast32;

            this._lootGold += 60;
            this._lootIron += 2;
            var bonusSeed = this._stageCfg.chapter >= 3 ? 'sky_bamboo_seed' : 'thunder_potato_seed';

            this._lootSeeds.push(bonusSeed);

            this._doorLbl.string = '石门已开 →';
            (_this$_onToast32 = this._onToast) == null || _this$_onToast32.call(this, "\u7CBE\u82F1\u8D4F\u91D1\u623F\u8083\u6E05\uFF01\u989D\u5916\u83B7\u5F97 +60 \u91D1\u3001+2 \u7384\u94C1\u77FF\u4E0E\u7A00\u6709\u7075\u79CD\uFF01\u5411\u53F3\u524D\u5F80\u4E0B\u4E00\u5173");
            return;
          }

          if (this._stageNum >= (_crd && DUNGEON_IMPLEMENTED_MAX_STAGE === void 0 ? (_reportPossibleCrUseOfDUNGEON_IMPLEMENTED_MAX_STAGE({
            error: Error()
          }), DUNGEON_IMPLEMENTED_MAX_STAGE) : DUNGEON_IMPLEMENTED_MAX_STAGE)) {
            this._lootGold += 280;
            this._lootIron += 5;

            this._lootSeeds.push('sky_bamboo_seed', 'sky_bamboo_seed', 'thunder_potato_seed', 'cloud_bamboo_shoot_seed');

            if (app != null && app.ready && app.saveData.farm.unlockedTier < 3) {
              app.saveData.farm.unlockedTier = 3;
            }

            this._finishRun(true, '斩破古渊裂隙之主，制霸幽墟全部 60 关！已解锁【全境六十关制霸】成就与农田三阶终极灵植厚礼');

            return;
          }

          if (this._stageCfg.roomKind === 'mid_boss') {
            this._hp = Math.min(this._maxHp, this._hp + Math.round(this._maxHp * 0.4));
            this._mana = this._maxMana;
            this._waitingChoice = true;
            this._choiceTitleLbl.string = "\u51FB\u8D25\u4E2D\u9014\u9996\u9886\u300C" + this._stageCfg.biome.midBossName + "\u300D\uFF01\n\u5DF2\u6C38\u4E45\u89E3\u9501 " + this._stageCfg.chapter + "-6 \u4F20\u9001\u951A\u70B9\u5E76\u56DE\u590D 40% \u751F\u547D";
            this._choiceContinueLbl.string = "\u7EE7\u7EED\u6DF1\u5165 " + this._stageCfg.chapter + "-6";
            this._choiceBar.active = true;
            return;
          }

          if (this._stageCfg.roomKind === 'final_boss') {
            this._hp = this._maxHp;
            this._mana = this._maxMana;
            this._waitingChoice = true;
            var nextBiome = (_crd && DUNGEON_BIOMES === void 0 ? (_reportPossibleCrUseOfDUNGEON_BIOMES({
              error: Error()
            }), DUNGEON_BIOMES) : DUNGEON_BIOMES)[this._stageCfg.chapter];
            this._choiceTitleLbl.string = "\u5927\u5173\u9996\u9886\u300C" + this._stageCfg.biome.finalBossName + "\u300D\u5DF2\u4F0F\u8BDB\uFF01\n\u5DF2\u6C38\u4E45\u89E3\u9501\u7B2C " + nextBiome.chapter + " \u5927\u5173\u300C" + nextBiome.name + "\u300D\u4F20\u9001\u951A\u70B9\uFF01";
            this._choiceContinueLbl.string = "\u76F4\u5165 " + nextBiome.chapter + "-1 " + nextBiome.name;
            this._choiceBar.active = true;
            return;
          }

          this._doorLbl.string = '石门已开 →';
          (_this$_onToast33 = this._onToast) == null || _this$_onToast33.call(this, this._stageCfg.label + " \u5DF2\u8083\u6E05\uFF01\u5411\u53F3\u8D70\u8FC7\u77F3\u95E8\u8FDB\u5165\u4E0B\u4E00\u5173");
        }

        _renderArena() {
          var _this$_playerSpriteNo, _this$_pWalkFrames$th, _this$_pIdleFrames$th;

          var g = this._arenaGfx;
          var b = this._stageCfg.biome;
          g.clear(); // 仅在手绘底图未加载时才兜底绘制底色；正常情况下直接使用 6 大生态手绘底图，不叠画丑陋的几何边框与圆圈

          if (!this._hasArenaBg) {
            g.fillColor = new Color(b.floorRgb[0], b.floorRgb[1], b.floorRgb[2], 255);
            g.roundRect(-ARENA_HALF_W, -ARENA_HALF_H, ARENA_HALF_W * 2, ARENA_HALF_H * 2, 18);
            g.fill();
          } // 丹砂火蛟二阶段外圈岩浆带


          if (this._lavaRimActive) {
            g.strokeColor = new Color(246, 86, 38, 165);
            g.lineWidth = 54;
            g.roundRect(-ARENA_HALF_W + 27, -ARENA_HALF_H + 27, ARENA_HALF_W * 2 - 54, ARENA_HALF_H * 2 - 54, 14);
            g.stroke();
          } // 枯竹刺陷阱（手绘素材动态缩放/变色，仅预警时画细提示圈）


          for (var i = 0; i < this._spikes.length; i++) {
            var sp = this._spikes[i];
            var active = sp.cycle >= 2.9;
            var warn = sp.cycle >= 2.2 && sp.cycle < 2.9;
            var sn = this._spikeNodes[i];

            if (sn) {
              var _sn$getChildByName;

              sn.setScale(active ? 1.12 : warn ? 1.04 : 0.92, active ? 1.15 : 0.92, 1);
              var spr = (_sn$getChildByName = sn.getChildByName('ArtSprite')) == null ? void 0 : _sn$getChildByName.getComponent(Sprite);

              if (spr) {
                spr.color = active ? new Color(255, 168, 152, 255) : warn ? new Color(255, 232, 156, 255) : new Color(180, 196, 188, 220);
              }
            }

            if (warn || active) {
              g.strokeColor = active ? new Color(255, 118, 86, 210) : new Color(246, 206, 98, 165);
              g.lineWidth = active ? 3 : 2;
              g.circle(sp.x, sp.y, sp.r);
              g.stroke();
            }
          } // 第 3 大关：寒玉冰面反光与霜风提示


          if (this._stageCfg.hasIceFloor) {
            g.strokeColor = new Color(172, 234, 255, this._frostWindActiveTimer > 0 ? 115 : 42);
            g.lineWidth = this._frostWindActiveTimer > 0 ? 3 : 1.5;

            for (var ix = -360; ix <= 360; ix += 120) {
              g.moveTo(ix, -ARENA_HALF_H + 14);
              g.lineTo(ix + 35, ARENA_HALF_H - 14);
              g.stroke();
            }
          } // 冰雾减速区


          for (var fp of this._frostPools) {
            g.fillColor = new Color(130, 224, 255, 85);
            g.strokeColor = new Color(186, 242, 255, 175);
            g.lineWidth = 2;
            g.circle(fp.x, fp.y, fp.r);
            g.fill();
            g.stroke();
          } // 毒沼泥潭


          for (var pp of this._poisonPools) {
            g.fillColor = new Color(98, 178, 92, 118);
            g.strokeColor = new Color(162, 242, 134, 170);
            g.lineWidth = 2;
            g.circle(pp.x, pp.y, pp.r);
            g.fill();
            g.stroke();
          } // 地面火焰路径


          for (var _fp3 of this._firePools) {
            g.fillColor = new Color(246, 102, 42, 145);
            g.circle(_fp3.x, _fp3.y, _fp3.r);
            g.fill();
          } // 寒玉玄龟可破坏冰墙（手绘冰墙精灵同步）


          while (this._iceWallNodes.length < this._iceWalls.length) {
            var iwn = this._uiNode('IceWall', this._propLayer);

            (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
              error: Error()
            }), ArtLoader) : ArtLoader).applySprite(iwn, 'dng_ice_wall', 68, 68);

            this._iceWallNodes.push(iwn);
          }

          for (var _i16 = 0; _i16 < this._iceWallNodes.length; _i16++) {
            var _iwn = this._iceWallNodes[_i16];
            var iw = this._iceWalls[_i16];

            if (iw) {
              _iwn.active = true;

              _iwn.setPosition(iw.x, iw.y + 4, 0);
            } else {
              _iwn.active = false;
            }
          } // 寒玉玄龟二阶段全屏预警落冰柱


          for (var ic of this._icicles) {
            if (ic.warnTimer > 0) {
              g.strokeColor = new Color(156, 236, 255, 220);
              g.lineWidth = 3;
              g.circle(ic.x, ic.y, ic.r);
              g.stroke();
              var prog = 1 - Math.max(0, ic.warnTimer / 1.15);
              g.fillColor = new Color(122, 212, 255, 78);
              g.circle(ic.x, ic.y, ic.r * prog);
              g.fill();
            } else {
              g.fillColor = new Color(196, 246, 255, 215);
              g.circle(ic.x, ic.y, ic.r);
              g.fill();
            }
          } // 第 4 大关：驱雾古灯（手绘古灯素材）


          for (var _i17 = 0; _i17 < this._lanterns.length; _i17++) {
            var lt = this._lanterns[_i17];
            var ln = this._lanternNodes[_i17];

            if (ln) {
              var _ln$getChildByName;

              var _spr = (_ln$getChildByName = ln.getChildByName('ArtSprite')) == null ? void 0 : _ln$getChildByName.getComponent(Sprite);

              if (_spr) _spr.color = lt.lit ? new Color(255, 244, 206, 255) : new Color(138, 128, 156, 225);
            }

            if (lt.lit) {
              g.fillColor = new Color(255, 214, 118, 52);
              g.circle(lt.x, lt.y, 58);
              g.fill();
            }
          } // 第 5 大关：导电铜雷柱与周期放电线


          if (this._copperPillars.length > 0) {
            var period = this._copperBoostTimer > 0 ? 2.6 : 4.2;
            var warnStart = period - 1.65;
            var activeStart = period - 0.9;

            if (this._copperPillars.length >= 2 && this._copperArcCycle >= warnStart) {
              var isZap = this._copperArcCycle >= activeStart;
              g.strokeColor = isZap ? new Color(255, 240, 118, 245) : new Color(255, 212, 92, 130);
              g.lineWidth = isZap ? 6 : 2.5;

              for (var _i18 = 0; _i18 < this._copperPillars.length; _i18++) {
                var a = this._copperPillars[_i18];
                var _b3 = this._copperPillars[(_i18 + 1) % this._copperPillars.length];
                if (this._copperPillars.length === 2 && _i18 === 1) break;
                g.moveTo(a.x, a.y);
                g.lineTo(_b3.x, _b3.y);
                g.stroke();
              }
            }

            for (var _i19 = 0; _i19 < this._copperPillars.length; _i19++) {
              var cn = this._copperNodes[_i19];

              if (cn) {
                var _cn$getChildByName;

                var _spr2 = (_cn$getChildByName = cn.getChildByName('ArtSprite')) == null ? void 0 : _cn$getChildByName.getComponent(Sprite);

                if (_spr2) {
                  var energized = this._copperArcCycle >= warnStart;
                  _spr2.color = energized ? new Color(255, 246, 186, 255) : new Color(224, 214, 198, 255);
                }
              }
            }
          } // 落雷预警圈


          for (var tz of this._thunderZones) {
            if (tz.warnTimer > 0) {
              g.strokeColor = new Color(255, 232, 108, 225);
              g.lineWidth = 3;
              g.circle(tz.x, tz.y, tz.r);
              g.stroke();
              g.fillColor = new Color(255, 228, 102, 55);
              g.circle(tz.x, tz.y, tz.r * (1 - Math.min(1, tz.warnTimer / 1.05)));
              g.fill();
            } else {
              g.fillColor = new Color(255, 248, 168, 190);
              g.circle(tz.x, tz.y, tz.r);
              g.fill();
            }
          } // 九霄雷公傀避雷针与电网


          if (this._lightningRods.length >= 2) {
            g.strokeColor = new Color(255, 236, 116, 235);
            g.lineWidth = 5;

            for (var _i20 = 0; _i20 < this._lightningRods.length; _i20++) {
              var _a13 = this._lightningRods[_i20];
              var _b4 = this._lightningRods[(_i20 + 1) % this._lightningRods.length];
              if (this._lightningRods.length === 2 && _i20 === 1) break;
              g.moveTo(_a13.x, _a13.y);
              g.lineTo(_b4.x, _b4.y);
              g.stroke();
            }
          }

          for (var rod of this._lightningRods) {
            g.fillColor = new Color(242, 198, 72, 245);
            g.strokeColor = new Color(255, 250, 196, 255);
            g.lineWidth = 3;
            g.circle(rod.x, rod.y, rod.r);
            g.fill();
            g.stroke();
            var rr = Math.max(0, rod.hp / rod.maxHp);
            g.fillColor = new Color(26, 26, 26, 220);
            g.rect(rod.x - 22, rod.y + rod.r + 6, 44, 5);
            g.fill();
            g.fillColor = new Color(255, 228, 92, 255);
            g.rect(rod.x - 22, rod.y + rod.r + 6, 44 * rr, 5);
            g.fill();
          } // 第 6 大关：时空裂隙旋涡（手绘旋涡缓慢旋转）


          for (var _i21 = 0; _i21 < this._riftVortices.length; _i21++) {
            var rv = this._riftVortices[_i21];
            var rn = this._riftNodes[_i21];

            if (rn) {
              rn.angle = (this._animClock * 42 + _i21 * 90) % 360;
              var sc = 0.94 + Math.sin(rv.phase) * 0.08;
              rn.setScale(sc, sc, 1);
            }
          } // 第 6 大关：旋转灵气封阵


          if (this._stageCfg.hasSealRing && !this._roomCleared) {
            g.strokeColor = new Color(96, 244, 208, 175);
            g.lineWidth = 8;

            for (var k = 0; k < 2; k++) {
              var _a14 = this._sealAngle + k * Math.PI;

              g.moveTo(Math.cos(_a14) * 45, Math.sin(_a14) * 45);
              g.lineTo(Math.cos(_a14) * 390, Math.sin(_a14) * 390);
              g.stroke();
            }
          } // 古渊裂隙之主核心法球


          for (var orb of this._riftOrbs) {
            g.fillColor = new Color(104, 252, 218, 220);
            g.strokeColor = new Color(255, 252, 224, 255);
            g.lineWidth = 3;
            g.circle(orb.x, orb.y, orb.r);
            g.fill();
            g.stroke();
            var or = Math.max(0, orb.hp / orb.maxHp);
            g.fillColor = new Color(22, 28, 28, 220);
            g.rect(orb.x - 20, orb.y + orb.r + 6, 40, 5);
            g.fill();
            g.fillColor = new Color(114, 252, 218, 255);
            g.rect(orb.x - 20, orb.y + orb.r + 6, 40 * or, 5);
            g.fill();
          } // 周期熔岩火圈


          for (var mr of this._magmaRings) {
            if (mr.warnTimer > 0) {
              g.strokeColor = new Color(255, 194, 88, 220);
              g.lineWidth = 3;
              g.circle(mr.x, mr.y, mr.r);
              g.stroke();

              var _prog = 1 - Math.max(0, mr.warnTimer / 1.15);

              g.fillColor = new Color(255, 134, 52, 85);
              g.circle(mr.x, mr.y, mr.r * _prog);
              g.fill();
            } else {
              g.fillColor = new Color(252, 84, 36, 190);
              g.circle(mr.x, mr.y, mr.r);
              g.fill();
            }
          } // 爆裂火药陶罐（手绘陶罐精灵）


          for (var _i22 = 0; _i22 < this._jars.length; _i22++) {
            var jn = this._jarNodes[_i22];
            if (jn) jn.active = !this._jars[_i22].exploded;
          } // 机关宝箱（手绘闭合/开启古玉宝箱切换）


          if (this._chest && this._chestNode) {
            if (this._chest.opened && !this._chestOpenedRendered) {
              this._chestOpenedRendered = true;
              (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
                error: Error()
              }), ArtLoader) : ArtLoader).applySprite(this._chestNode, 'dng_chest_open', 68, 68);
            }
          } // 爆炸圈


          for (var bm of this._booms) {
            g.fillColor = new Color(246, 132, 48, 135);
            g.circle(bm.x, bm.y, bm.radius);
            g.fill();
          } // 东侧石门手绘青玉八卦光环


          if (this._doorGlowNode) {
            var showGlow = this._roomCleared && !this._waitingChoice && this._stageNum < (_crd && DUNGEON_IMPLEMENTED_MAX_STAGE === void 0 ? (_reportPossibleCrUseOfDUNGEON_IMPLEMENTED_MAX_STAGE({
              error: Error()
            }), DUNGEON_IMPLEMENTED_MAX_STAGE) : DUNGEON_IMPLEMENTED_MAX_STAGE);
            this._doorGlowNode.active = showGlow;

            if (showGlow) {
              this._doorGlowNode.angle = -this._animClock * 26 % 360;
              var pulse = 0.96 + Math.sin(this._animClock * 3.2) * 0.06;

              this._doorGlowNode.setScale(pulse, pulse, 1);
            }
          } // 穿云笋炮台


          var activeTurrets = new Set();

          for (var t of this._turrets) {
            activeTurrets.add(t.id);

            var tn = this._turretSprites.get(t.id);

            if (!tn) {
              tn = this._uiNode("Turret_" + t.id, this._entityLayer);
              (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
                error: Error()
              }), ArtLoader) : ArtLoader).applySprite(tn, 'def_cloud_shoot', 34, 52);

              this._turretSprites.set(t.id, tn);
            }

            tn.setPosition(t.x, t.y + 8, 0);
          }

          for (var [id, node] of Array.from(this._turretSprites.entries())) {
            if (!activeTurrets.has(id)) {
              node.destroy();

              this._turretSprites.delete(id);
            }
          } // 首领四向激光


          for (var bl of this._bossLasers) {
            for (var _k3 = 0; _k3 < 4; _k3++) {
              var _a15 = bl.angle + _k3 * Math.PI / 2;

              var x2 = bl.x + Math.cos(_a15) * 620;
              var y2 = bl.y + Math.sin(_a15) * 620;

              if (bl.warnTimer > 0) {
                g.strokeColor = new Color(255, 198, 92, 160);
                g.lineWidth = 4;
              } else {
                g.strokeColor = new Color(252, 92, 148, 235);
                g.lineWidth = 14;
              }

              g.moveTo(bl.x, bl.y);
              g.lineTo(x2, y2);
              g.stroke();
            }
          } // 玩家激光束


          for (var l of this._lasers) {
            g.strokeColor = new Color(110, 242, 232, 235);
            g.lineWidth = 14;
            g.moveTo(l.x1, l.y1);
            g.lineTo(l.x2, l.y2);
            g.stroke();
            g.strokeColor = new Color(255, 248, 200, 255);
            g.lineWidth = 5;
            g.moveTo(l.x1, l.y1);
            g.lineTo(l.x2, l.y2);
            g.stroke();
          } // 近战剑气弧


          for (var s of this._slashes) {
            g.fillColor = new Color(160, 240, 212, 115);
            g.circle(s.x + Math.cos(s.angle) * 32, s.y + Math.sin(s.angle) * 32, s.radius * 0.72);
            g.fill();
          } // 怪物同步 + 顶部首领大血条


          var activeEnemies = new Set();
          var activeBoss = null;

          for (var e of this._enemies) {
            var _en$getChildByName, _e$allyShieldTimer4, _e$stunTimer3;

            if (e.isBoss) activeBoss = e;
            activeEnemies.add(e.id);
            var st = (_crd && ENEMY_STATS === void 0 ? (_reportPossibleCrUseOfENEMY_STATS({
              error: Error()
            }), ENEMY_STATS) : ENEMY_STATS)[e.kind];

            var en = this._enemySprites.get(e.id);

            if (!en) {
              en = this._uiNode("DngEnemy_" + e.id, this._entityLayer);
              var scale = e.elite ? 1.18 : 1.0;
              (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
                error: Error()
              }), ArtLoader) : ArtLoader).applySprite(en, st.spritePrefix + "_0", Math.round(st.spriteW * scale), Math.round(st.spriteH * scale));

              this._enemySprites.set(e.id, en);
            }

            var frames = this._mobAnimFrames[st.spritePrefix];
            var fIdx = Math.floor((this._animClock + e.id * 0.19) / st.frameSec) % 4;
            var sf = frames == null ? void 0 : frames[fIdx];
            var esp = (_en$getChildByName = en.getChildByName('ArtSprite')) == null ? void 0 : _en$getChildByName.getComponent(Sprite);

            if (esp) {
              if (sf && esp.spriteFrame !== sf) esp.spriteFrame = sf;
              var alpha = e.burrowTimer > 0 ? 75 : e.stealthTimer > 0 ? 45 : e.isIllusion ? 175 : 255;

              if (st.tintRgb) {
                esp.color = new Color(st.tintRgb[0], st.tintRgb[1], st.tintRgb[2], alpha);
              } else {
                esp.color = new Color(255, 255, 255, alpha);
              }
            }

            var bob = Math.abs(Math.sin(this._animClock * 6.5 + e.id)) * 2.5;
            en.setPosition(e.x, e.y + 8 + bob, 0);
            en.setScale(this._px < e.x ? -1 : 1, 1, 1);
            g.fillColor = new Color(14, 22, 20, 95);
            g.ellipse(e.x, e.y - e.radius * 0.5, e.radius * 0.9, 7);
            g.fill();

            if (e.shellActive || ((_e$allyShieldTimer4 = e.allyShieldTimer) != null ? _e$allyShieldTimer4 : 0) > 0) {
              var _e$allyShieldTimer5;

              g.strokeColor = ((_e$allyShieldTimer5 = e.allyShieldTimer) != null ? _e$allyShieldTimer5 : 0) > 0 ? new Color(142, 248, 232, 240) : new Color(255, 184, 72, 240);
              g.lineWidth = 4;
              g.circle(e.x, e.y + 6, e.radius + 9);
              g.stroke();
            }

            if (((_e$stunTimer3 = e.stunTimer) != null ? _e$stunTimer3 : 0) > 0) {
              g.strokeColor = new Color(255, 246, 134, 235);
              g.lineWidth = 3;
              g.circle(e.x, e.y + e.radius + 10, 10);
              g.stroke();
            }

            if (e.burrowTimer > 0) {
              g.strokeColor = new Color(255, 118, 56, 220);
              g.lineWidth = 3;
              g.circle(e.x, e.y, e.radius + 14);
              g.stroke();
            }

            if (e.hitFlash > 0) {
              g.fillColor = new Color(255, 255, 255, 130);
              g.circle(e.x, e.y + 6, e.radius + 6);
              g.fill();
            }

            if (!e.isBoss) {
              var bw = e.radius * 2;
              var ratio = Math.max(0, e.hp / e.maxHp);
              g.fillColor = new Color(28, 32, 30, 220);
              g.rect(e.x - bw / 2, e.y + e.radius + 14, bw, 6);
              g.fill();
              g.fillColor = e.elite ? new Color(246, 186, 62, 255) : new Color(224, 86, 66, 255);
              g.rect(e.x - bw / 2, e.y + e.radius + 14, bw * ratio, 6);
              g.fill();
            }
          }

          for (var [_id, _node] of Array.from(this._enemySprites.entries())) {
            if (!activeEnemies.has(_id)) {
              _node.destroy();

              this._enemySprites.delete(_id);
            }
          } // 首领大血条渲染


          if (activeBoss) {
            this._bossBarNode.active = true;
            var formTag = activeBoss.elementForm ? activeBoss.elementForm === 'fire' ? ' [烈焰形态]' : activeBoss.elementForm === 'frost' ? ' [寒冰形态]' : ' [九霄雷形态]' : '';
            this._bossNameLbl.string = "" + activeBoss.name + formTag + (activeBoss.phase2 ? ' · 二阶段狂暴' : '') + " (" + Math.ceil(activeBoss.hp) + "/" + activeBoss.maxHp + ")";
            var bg = this._bossBarGfx;
            bg.clear();
            var _bw = 420;
            bg.fillColor = new Color(26, 22, 22, 225);
            bg.roundRect(-_bw / 2, -6, _bw, 12, 6);
            bg.fill();

            var _ratio = Math.max(0, activeBoss.hp / activeBoss.maxHp);

            bg.fillColor = activeBoss.phase2 ? new Color(255, 92, 54, 255) : new Color(236, 146, 66, 255);
            bg.roundRect(-_bw / 2, -6, _bw * _ratio, 12, 6);
            bg.fill();
          } else {
            this._bossBarNode.active = false;
          } // 子弹


          for (var _bl of this._bullets) {
            g.fillColor = _bl.color;
            g.circle(_bl.x, _bl.y, _bl.radius);
            g.fill();
          } // 主角同步


          g.fillColor = new Color(14, 22, 20, 100);
          g.ellipse(this._px, this._py - 18, 16, 6);
          g.fill(); // 九霄引雷特效

          for (var _ln of this._lightnings) {
            g.strokeColor = new Color(255, 244, 152, 245);
            g.lineWidth = 5;
            g.moveTo(_ln.x - 8, _ln.y + 160);
            g.lineTo(_ln.x + 10, _ln.y + 75);
            g.lineTo(_ln.x - 6, _ln.y + 30);
            g.lineTo(_ln.x, _ln.y);
            g.stroke();
          } // 第 4 大关：暗紫瘴雾视野遮罩（点亮 2 盏古灯后散去）


          if (this._stageCfg.hasMistFog) {
            var unlit = this._lanterns.filter(l => !l.lit).length;

            if (unlit > 0) {
              g.fillColor = new Color(20, 12, 34, unlit === 2 ? 128 : 68);
              g.rect(-ARENA_HALF_W, -ARENA_HALF_H, ARENA_HALF_W * 2, ARENA_HALF_H * 2);
              g.fill();
            }
          }

          if (this._rootTimer > 0) {
            g.strokeColor = new Color(238, 232, 255, 235);
            g.lineWidth = 3;
            g.circle(this._px, this._py - 6, 24);
            g.stroke();
          }

          var pSp = (_this$_playerSpriteNo = this._playerSpriteNode.getChildByName('ArtSprite')) == null ? void 0 : _this$_playerSpriteNo.getComponent(Sprite);

          if (pSp) {
            pSp.color = this._invulnTimer > 0 ? new Color(196, 255, 242, Math.sin(this._animClock * 28) > 0 ? 255 : 165) : new Color(255, 255, 255, 255);
          }

          var targetSf = this._pMoving || this._dodgeTimer > 0 ? (_this$_pWalkFrames$th = this._pWalkFrames[this._pDir][this._pAnimIdx]) != null ? _this$_pWalkFrames$th : this._pIdleFrames[this._pDir] : (_this$_pIdleFrames$th = this._pIdleFrames[this._pDir]) != null ? _this$_pIdleFrames$th : this._pWalkFrames[this._pDir][1];

          if (pSp && targetSf && pSp.spriteFrame !== targetSf) {
            pSp.spriteFrame = targetSf;
          }

          var pBob = this._pMoving ? Math.abs(Math.sin(this._animClock * 10)) * 2.5 : 0;
          var pBreathe = this._pMoving ? 0 : Math.sin(this._animClock * 2.6) * 0.022;

          this._playerSpriteNode.setPosition(this._px, this._py + 10 + pBob, 0);

          this._playerSpriteNode.setScale(this._pFacingX, 1 + pBreathe, 1);
        }

      }, _class2._inst = null, _class2)) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=4bcee95d43f68f99c2caeb37107ef61af9f6d95f.js.map