System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3", "__unresolved_4", "__unresolved_5"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Color, Component, Graphics, input, Input, KeyCode, Label, Layers, Node, Sprite, UITransform, DataManager, GameApp, ArtLoader, AudioManager, FarmSystem, _dec, _class, _class2, _crd, ccclass, SEGMENT_NAMES, CODEX_ART_ENTRIES, TRACK_W, TRACK_H, FishingOverlay;

  function _reportPossibleCrUseOfFishDef(extras) {
    _reporterNs.report("FishDef", "../core/GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfRiverSegmentId(extras) {
    _reporterNs.report("RiverSegmentId", "../core/GameTypes", _context.meta, extras);
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

  function _reportPossibleCrUseOfFarmSystem(extras) {
    _reporterNs.report("FarmSystem", "../gameplay/farm/FarmSystem", _context.meta, extras);
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
    }, function (_unresolved_2) {
      DataManager = _unresolved_2.DataManager;
    }, function (_unresolved_3) {
      GameApp = _unresolved_3.GameApp;
    }, function (_unresolved_4) {
      ArtLoader = _unresolved_4.ArtLoader;
    }, function (_unresolved_5) {
      AudioManager = _unresolved_5.AudioManager;
    }, function (_unresolved_6) {
      FarmSystem = _unresolved_6.FarmSystem;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "4b19dcgbERKjpHDjwoh57QQ", "FishingOverlay", undefined);
      /**
       * 《异界小农场 2.0》第二批升级：星露谷式「按住拉锯溜鱼」全新钓鱼玩法 + 三水域手绘灵鱼图鉴 + 荷塘养鱼池
       * - 真正有操作博弈感的溜鱼机制：长按水面/拉线按钮（或空格/J键）让绿色浮标右移，松手受水阻力左滑，去追一条会游动、停顿、突发冲刺的活鱼！
       * - 框住活鱼时右侧「收线进度条」持续上涨并伴随水花特效，脱框缓慢回落；拉满 100% 鱼跃出水并点亮底部 6 鱼手绘图鉴！
       * - 居室舒心度越高，绿色浮标越宽；失败零惩罚，随时可重抛竿。
       */


      __checkObsolete__(['_decorator', 'Color', 'Component', 'EventKeyboard', 'Graphics', 'input', 'Input', 'KeyCode', 'Label', 'Layers', 'Node', 'Sprite', 'UITransform']);

      ({
        ccclass
      } = _decorator);
      SEGMENT_NAMES = {
        upstream_brook: '上游寒溪（竹林清泉）',
        midstream_lotus: '灵泉荷塘（庭院静水）',
        downstream_estuary: '下游入海口（南岸潮汐）'
      };
      CODEX_ART_ENTRIES = [{
        key: 'fish_brook_trout',
        name: '寒溪银鳟',
        seg: 'upstream_brook'
      }, {
        key: 'fish_brook_loach',
        name: '青石锦鳅',
        seg: 'upstream_brook'
      }, {
        key: 'fish_lotus_koi',
        name: '荷塘灵锦鲤',
        seg: 'midstream_lotus'
      }, {
        key: 'fish_lotus_crucian',
        name: '玉露鲫鱼',
        seg: 'midstream_lotus'
      }, {
        key: 'fish_estuary_perch',
        name: '海口碧鲈',
        seg: 'downstream_estuary'
      }, {
        key: 'fish_estuary_dragon',
        name: '潮汐灵龙鱼',
        seg: 'downstream_estuary'
      }];
      TRACK_W = 540;
      TRACK_H = 54;

      _export("FishingOverlay", FishingOverlay = (_dec = ccclass('FishingOverlay'), _dec(_class = (_class2 = class FishingOverlay extends Component {
        constructor(...args) {
          super(...args);
          this._panel = void 0;
          this._titleLbl = void 0;
          this._hintLbl = void 0;
          this._waterGfx = void 0;
          this._progGfx = void 0;
          this._swimFishNode = void 0;
          this._catchArtNode = void 0;
          this._codexBar = void 0;
          this._pondBtn = void 0;
          this._pondBtnLbl = void 0;
          this._reelBtnLbl = void 0;
          this._active = false;
          this._phase = 'playing';
          this._segment = 'midstream_lotus';
          this._targetFish = null;
          // 星露谷式拉锯溜鱼物理态（归一化 0..1）
          this._barPos = 0.35;
          // 绿色浮标左边界
          this._barWidth = 0.28;
          // 绿色浮标宽度（受居室舒心度加成）
          this._barVel = 0;
          // 浮标惯性速度
          this._holding = false;
          // 玩家是否正在按住拉线
          // 活鱼 AI 态
          this._fishPos = 0.5;
          this._fishTarget = 0.6;
          this._fishTimer = 0.8;
          this._fishSpeed = 0.42;
          // 收线进度 0..1
          this._progress = 0.3;
          this._celebrateTimer = 0;
          this._animTime = 0;
          this._onToast = null;
        }

        static get inst() {
          return this._inst;
        }

        get isOpen() {
          return this._active;
        }

        onLoad() {
          FishingOverlay._inst = this;

          this._buildUI();

          this._panel.active = false;
          input.on(Input.EventType.KEY_DOWN, this._onKeyDown, this);
          input.on(Input.EventType.KEY_UP, this._onKeyUp, this);
        }

        onDestroy() {
          if (FishingOverlay._inst === this) FishingOverlay._inst = null;
          input.off(Input.EventType.KEY_DOWN, this._onKeyDown, this);
          input.off(Input.EventType.KEY_UP, this._onKeyUp, this);
        }

        _onKeyDown(e) {
          if (!this._active) return;
          if (e.keyCode === KeyCode.SPACE || e.keyCode === KeyCode.KEY_J) this._holding = true;
        }

        _onKeyUp(e) {
          if (e.keyCode === KeyCode.SPACE || e.keyCode === KeyCode.KEY_J) this._holding = false;
        }

        _uiNode(name, parent) {
          const n = new Node(name);
          n.layer = Layers.Enum.UI_2D;
          n.parent = parent;
          return n;
        }

        _buildUI() {
          this._panel = this._uiNode('FishingPanel', this.node);

          this._panel.addComponent(UITransform).setContentSize(1280, 720);

          const bg = this._panel.addComponent(Graphics);

          bg.fillColor = new Color(18, 28, 26, 170);
          bg.rect(-640, -360, 1280, 720);
          bg.fill();

          const card = this._uiNode('ScrollCard', this._panel);

          card.addComponent(UITransform).setContentSize(780, 520);
          const cg = card.addComponent(Graphics);
          cg.fillColor = new Color(246, 238, 220, 254);
          cg.strokeColor = new Color(132, 92, 58, 255);
          cg.lineWidth = 4;
          cg.roundRect(-390, -260, 780, 520, 16);
          cg.fill();
          cg.stroke(); // 上方手绘灵鱼展示框

          cg.fillColor = new Color(184, 218, 212, 175);
          cg.strokeColor = new Color(96, 146, 138, 220);
          cg.lineWidth = 2;
          cg.roundRect(-118, 92, 236, 92, 12);
          cg.fill();
          cg.stroke();

          const tNode = this._uiNode('Title', card);

          tNode.setPosition(0, 218, 0);
          this._titleLbl = tNode.addComponent(Label);
          this._titleLbl.fontSize = 23;
          this._titleLbl.color = new Color(24, 36, 32, 255);
          this._catchArtNode = this._uiNode('CatchArt', card);

          this._catchArtNode.setPosition(0, 138, 0);

          const hNode = this._uiNode('Hint', card);

          hNode.setPosition(0, 62, 0);
          this._hintLbl = hNode.addComponent(Label);
          this._hintLbl.fontSize = 14;
          this._hintLbl.color = new Color(82, 68, 52, 255); // 水道拉锯溜鱼交互轨道（按住轨道或下方按钮均可拉线）

          const waterTrack = this._uiNode('WaterTrack', card);

          waterTrack.setPosition(0, 10, 0);
          waterTrack.addComponent(UITransform).setContentSize(TRACK_W, TRACK_H);
          this._waterGfx = waterTrack.addComponent(Graphics);
          this._swimFishNode = this._uiNode('SwimFish', waterTrack);

          this._swimFishNode.setPosition(0, 0, 0);

          waterTrack.on(Node.EventType.TOUCH_START, () => {
            this._holding = true;
          });
          waterTrack.on(Node.EventType.TOUCH_END, () => {
            this._holding = false;
          });
          waterTrack.on(Node.EventType.TOUCH_CANCEL, () => {
            this._holding = false;
          }); // 收线进度条

          const progNode = this._uiNode('ProgressBar', card);

          progNode.setPosition(0, -34, 0);
          this._progGfx = progNode.addComponent(Graphics); // 长按拉线按钮（支持按住不放）+ 放鱼入塘 + 收起钓具

          const reelBtn = this._uiNode('ReelBtn', card);

          reelBtn.addComponent(UITransform).setContentSize(196, 48);
          reelBtn.setPosition(-208, -86, 0);
          const rg = reelBtn.addComponent(Graphics);
          rg.fillColor = new Color(36, 126, 116, 252);
          rg.roundRect(-98, -24, 196, 48, 12);
          rg.fill();
          this._reelBtnLbl = this._uiNode('Lbl', reelBtn).addComponent(Label);
          this._reelBtnLbl.string = '按住拉线 (空格)';
          this._reelBtnLbl.fontSize = 16;
          this._reelBtnLbl.color = Color.WHITE;
          reelBtn.on(Node.EventType.TOUCH_START, () => {
            this._holding = true;
          });
          reelBtn.on(Node.EventType.TOUCH_END, () => {
            this._holding = false;
          });
          reelBtn.on(Node.EventType.TOUCH_CANCEL, () => {
            this._holding = false;
          });
          this._pondBtn = this._makeBtn('放鱼入塘养(0/4)', 186, 46, new Color(184, 118, 48, 248), () => this._putFishInPond());
          this._pondBtn.parent = card;

          this._pondBtn.setPosition(8, -86, 0);

          this._pondBtnLbl = this._pondBtn.getChildByName('Lbl').getComponent(Label);

          const closeBtn = this._makeBtn('收起钓具', 136, 46, new Color(128, 102, 78, 240), () => this.close());

          closeBtn.parent = card;
          closeBtn.setPosition(200, -86, 0);

          const codexTitle = this._uiNode('CodexTitle', card).addComponent(Label);

          codexTitle.node.setPosition(0, -134, 0);
          codexTitle.string = '三水域灵鱼手绘图鉴（已钓亮彩）';
          codexTitle.fontSize = 13;
          codexTitle.color = new Color(102, 76, 52, 235);
          this._codexBar = this._uiNode('CodexBar', card);

          this._codexBar.setPosition(0, -194, 0);
        }

        _makeBtn(text, w, h, color, onTap) {
          const n = new Node(`Btn_${text}`);
          n.layer = Layers.Enum.UI_2D;
          n.addComponent(UITransform).setContentSize(w, h);
          const g = n.addComponent(Graphics);
          g.fillColor = color;
          g.roundRect(-w / 2, -h / 2, w, h, 10);
          g.fill();

          const l = this._uiNode('Lbl', n).addComponent(Label);

          l.string = text;
          l.fontSize = 16;
          l.color = Color.WHITE;
          n.on(Node.EventType.TOUCH_END, onTap);
          return n;
        }

        _resolveFishArtKey(f) {
          var _f$riverSegments$;

          if (!f) return 'fish_lotus_koi';
          const seg = (_f$riverSegments$ = f.riverSegments[0]) != null ? _f$riverSegments$ : this._segment;
          const hash = f.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
          if (seg === 'upstream_brook') return hash % 2 === 0 ? 'fish_brook_trout' : 'fish_brook_loach';
          if (seg === 'downstream_estuary') return f.rarity === 'rare' || hash % 2 === 1 ? 'fish_estuary_dragon' : 'fish_estuary_perch';
          return hash % 2 === 0 ? 'fish_lotus_koi' : 'fish_lotus_crucian';
        }

        _showFishPreview(artKey, silhouette) {
          this._catchArtNode.removeAllChildren();

          (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
            error: Error()
          }), ArtLoader) : ArtLoader).applySprite(this._catchArtNode, artKey, 132, 72, () => {
            var _this$_catchArtNode$g;

            const sp = (_this$_catchArtNode$g = this._catchArtNode.getChildByName('ArtSprite')) == null ? void 0 : _this$_catchArtNode$g.getComponent(Sprite);
            if (sp) sp.color = silhouette ? new Color(46, 86, 82, 135) : Color.WHITE;
          });
        }

        _rebuildCodexBar() {
          this._codexBar.removeAllChildren();

          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return;
          const caughtKeys = new Set();

          for (const fid of app.saveData.codex.fish) {
            const fdef = (_crd && DataManager === void 0 ? (_reportPossibleCrUseOfDataManager({
              error: Error()
            }), DataManager) : DataManager).inst.getFish(fid);
            if (fdef) caughtKeys.add(this._resolveFishArtKey(fdef));
          }

          const slotW = 110;
          const gap = 10;
          CODEX_ART_ENTRIES.forEach((entry, idx) => {
            const unlocked = caughtKeys.has(entry.key);

            const slot = this._uiNode(`Codex_${entry.key}`, this._codexBar);

            slot.setPosition((idx - (CODEX_ART_ENTRIES.length - 1) / 2) * (slotW + gap), 0, 0);
            const g = slot.addComponent(Graphics);
            g.fillColor = unlocked ? new Color(252, 246, 232, 250) : new Color(220, 214, 200, 210);
            g.strokeColor = unlocked ? new Color(214, 158, 56, 255) : new Color(156, 144, 126, 200);
            g.lineWidth = unlocked ? 2.4 : 1.5;
            g.roundRect(-slotW / 2, -40, slotW, 80, 9);
            g.fill();
            g.stroke();

            const holder = this._uiNode('Icon', slot);

            holder.setPosition(0, 10, 0);
            (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
              error: Error()
            }), ArtLoader) : ArtLoader).applySprite(holder, entry.key, 86, 48, () => {
              var _holder$getChildByNam;

              const sp = (_holder$getChildByNam = holder.getChildByName('ArtSprite')) == null ? void 0 : _holder$getChildByNam.getComponent(Sprite);
              if (sp) sp.color = unlocked ? Color.WHITE : new Color(96, 104, 102, 130);
            });

            const lbl = this._uiNode('Lbl', slot).addComponent(Label);

            lbl.node.setPosition(0, -26, 0);
            lbl.string = unlocked ? entry.name : '未解锁';
            lbl.fontSize = 11;
            lbl.color = unlocked ? new Color(42, 54, 48, 255) : new Color(128, 118, 104, 220);
          });
        }

        open(segment, onToast) {
          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return;
          this._segment = segment;
          this._onToast = onToast != null ? onToast : null;
          this._active = true;
          this._holding = false;
          this._panel.active = true;

          this._panel.setSiblingIndex(this.node.children.length - 1);

          this._startNewRound(true);

          this._rebuildCodexBar();

          this._refreshPondBtn();
        }

        close() {
          this._active = false;
          this._holding = false;
          this._panel.active = false;
        }

        _refreshPondBtn() {
          var _app$saveData$farm$po;

          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready) || !this._pondBtn) return;
          const cnt = ((_app$saveData$farm$po = app.saveData.farm.pondFishIds) != null ? _app$saveData$farm$po : []).length;
          this._pondBtn.active = this._segment === 'midstream_lotus';
          this._pondBtnLbl.string = `放鱼入塘养(${cnt}/4)`;
        }

        _putFishInPond() {
          var _this$_onToast;

          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return;
          let firstFishId = null;

          for (const k of Object.keys(app.saveData.inventory)) {
            var _app$saveData$invento;

            if (((_app$saveData$invento = app.saveData.inventory[k]) != null ? _app$saveData$invento : 0) > 0 && (_crd && DataManager === void 0 ? (_reportPossibleCrUseOfDataManager({
              error: Error()
            }), DataManager) : DataManager).inst.getFish(k)) {
              firstFishId = k;
              break;
            }
          }

          if (!firstFishId) {
            this._hintLbl.string = '背包里还没有鲜鱼，先溜起一条再放进荷塘养吧！';
            return;
          }

          const res = (_crd && FarmSystem === void 0 ? (_reportPossibleCrUseOfFarmSystem({
            error: Error()
          }), FarmSystem) : FarmSystem).inst.addFishToPond(firstFishId);
          (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
            error: Error()
          }), AudioManager) : AudioManager).inst.playSfx(res.ok ? 'harvest' : 'tap');
          this._hintLbl.string = res.message;
          (_this$_onToast = this._onToast) == null || _this$_onToast.call(this, res.message);

          this._refreshPondBtn();
        }

        _startNewRound(resetPreview = true) {
          var _pool$Math$floor, _app$saveData$indoor$, _this$_targetFish$dif, _this$_targetFish;

          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return;
          const d = app.time.getDate();
          let pool = (_crd && DataManager === void 0 ? (_reportPossibleCrUseOfDataManager({
            error: Error()
          }), DataManager) : DataManager).inst.queryFishPool(this._segment, d.season, app.time.weather, d.solarTerm.id);

          if (pool.length === 0) {
            pool = (_crd && DataManager === void 0 ? (_reportPossibleCrUseOfDataManager({
              error: Error()
            }), DataManager) : DataManager).inst.queryFishPool(this._segment, 'spring', 'sunny', 'lichun');
          }

          this._targetFish = (_pool$Math$floor = pool[Math.floor(Math.random() * pool.length)]) != null ? _pool$Math$floor : null;

          const artKey = this._resolveFishArtKey(this._targetFish);

          const comfortBonus = Math.min(0.14, ((_app$saveData$indoor$ = app.saveData.indoor.comfortScore) != null ? _app$saveData$indoor$ : 0) * 0.0022);
          this._barWidth = Math.min(0.42, 0.26 + comfortBonus);
          this._barPos = 0.32;
          this._barVel = 0;
          this._fishPos = 0.5;
          this._fishTarget = 0.65;
          this._fishTimer = 0.7;
          const diff = (_this$_targetFish$dif = (_this$_targetFish = this._targetFish) == null ? void 0 : _this$_targetFish.difficulty) != null ? _this$_targetFish$dif : 1;
          this._fishSpeed = 0.34 + diff * 0.14;
          this._progress = 0.32;
          this._phase = 'playing'; // 水道内活鱼小图标

          this._swimFishNode.removeAllChildren();

          (_crd && ArtLoader === void 0 ? (_reportPossibleCrUseOfArtLoader({
            error: Error()
          }), ArtLoader) : ArtLoader).applySprite(this._swimFishNode, artKey, 56, 32);
          this._titleLbl.string = `溜鱼垂钓 · ${SEGMENT_NAMES[this._segment]}`;

          if (resetPreview) {
            this._hintLbl.string = '长按水道或「按住拉线」(空格) 让绿条追住游动的鱼，把下方收线进度条拉满！';

            this._showFishPreview(artKey, true);
          }
        }

        _onFishCaught() {
          var _this$_onToast2;

          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          const f = this._targetFish;
          if (!(app != null && app.ready) || !f) return;
          app.addItem(f.id, 1);
          if (!app.saveData.codex.fish.includes(f.id)) app.saveData.codex.fish.push(f.id);
          app.persist('fishing_catch');
          (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
            error: Error()
          }), AudioManager) : AudioManager).inst.playSfx('harvest');
          const msg = `成功溜起【${f.name}】！（售价 ${f.sellPrice} 金，可去室外灶棚炖鱼汤）`;
          this._hintLbl.string = msg;
          (_this$_onToast2 = this._onToast) == null || _this$_onToast2.call(this, msg);

          this._showFishPreview(this._resolveFishArtKey(f), false);

          this._rebuildCodexBar();

          this._phase = 'celebrate';
          this._celebrateTimer = 1.35;
        }

        update(dt) {
          if (!this._active) return;
          this._animTime += dt; // 上方展示鱼轻柔游动

          this._catchArtNode.setPosition(Math.sin(this._animTime * 2.4) * 12, 138 + Math.sin(this._animTime * 3.6) * 3, 0);

          if (this._phase === 'celebrate') {
            this._celebrateTimer -= dt;

            if (this._celebrateTimer <= 0) {
              this._startNewRound(true);
            }

            return;
          } // 1. 绿色浮标惯性物理（按住向右加速拉线，松手自然向左回落，边缘柔弹）


          const accel = this._holding ? 2.15 : -1.75;
          this._barVel = Math.max(-1.15, Math.min(1.15, this._barVel + accel * dt));
          this._barPos += this._barVel * dt;
          const maxBarPos = 1 - this._barWidth;

          if (this._barPos < 0) {
            this._barPos = 0;
            this._barVel = Math.abs(this._barVel) * 0.25;
          } else if (this._barPos > maxBarPos) {
            this._barPos = maxBarPos;
            this._barVel = -Math.abs(this._barVel) * 0.25;
          } // 2. 活鱼 AI（随机巡游 + 停顿 + 偶发冲刺）


          this._fishTimer -= dt;

          if (this._fishTimer <= 0) {
            const burst = Math.random() < 0.35;
            this._fishTarget = 0.08 + Math.random() * 0.84;
            this._fishTimer = burst ? 0.55 + Math.random() * 0.45 : 0.9 + Math.random() * 0.9;
          }

          const fDiff = this._fishTarget - this._fishPos;
          const step = Math.sign(fDiff) * Math.min(Math.abs(fDiff), this._fishSpeed * dt);
          this._fishPos = Math.max(0.05, Math.min(0.95, this._fishPos + step));

          this._swimFishNode.setPosition(-TRACK_W / 2 + this._fishPos * TRACK_W, Math.sin(this._animTime * 7) * 3, 0);

          this._swimFishNode.setScale(step < -0.001 ? -1 : 1, 1, 1); // 3. 判定活鱼是否被绿色浮标框住 → 更新收线进度


          const caughtInBar = this._fishPos >= this._barPos - 0.02 && this._fishPos <= this._barPos + this._barWidth + 0.02;

          if (caughtInBar) {
            this._progress = Math.min(1, this._progress + dt * 0.34);
          } else {
            this._progress = Math.max(0, this._progress - dt * 0.16);
          }

          this._renderMinigame(caughtInBar);

          if (this._progress >= 1) {
            this._onFishCaught();
          } else if (this._progress <= 0) {
            (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
              error: Error()
            }), AudioManager) : AudioManager).inst.playSfx('tap');
            this._hintLbl.string = '鱼儿挣脱跑了！失败零惩罚，立刻自动抛起下一竿～';

            this._startNewRound(false);
          }
        }

        _renderMinigame(inZone) {
          const g = this._waterGfx;
          g.clear(); // 水道碧玉槽

          g.fillColor = new Color(72, 138, 136, 235);
          g.strokeColor = new Color(46, 86, 84, 255);
          g.lineWidth = 3;
          g.roundRect(-TRACK_W / 2, -TRACK_H / 2, TRACK_W, TRACK_H, 12);
          g.fill();
          g.stroke(); // 绿色浮标拉线区（框住鱼时亮起暖金翠光）

          const bx = -TRACK_W / 2 + this._barPos * TRACK_W;
          const bw = this._barWidth * TRACK_W;
          g.fillColor = inZone ? new Color(116, 224, 146, 215) : new Color(92, 186, 126, 150);
          g.strokeColor = inZone ? new Color(252, 232, 132, 255) : new Color(188, 240, 200, 220);
          g.lineWidth = inZone ? 3 : 2;
          g.roundRect(bx, -TRACK_H / 2 + 4, bw, TRACK_H - 8, 9);
          g.fill();
          g.stroke(); // 框住鱼时的动态水花点缀

          if (inZone) {
            const fx = -TRACK_W / 2 + this._fishPos * TRACK_W;
            g.fillColor = new Color(242, 252, 250, 190);
            g.circle(fx + Math.sin(this._animTime * 18) * 14, 16, 4);
            g.circle(fx - Math.cos(this._animTime * 15) * 12, -16, 3.5);
            g.fill();
          } // 收线进度条


          const pg = this._progGfx;
          pg.clear();
          const pw = TRACK_W;
          const ph = 14;
          pg.fillColor = new Color(64, 52, 42, 200);
          pg.roundRect(-pw / 2, -ph / 2, pw, ph, 7);
          pg.fill();
          const fillW = Math.max(8, pw * this._progress);
          pg.fillColor = this._progress > 0.7 ? new Color(242, 196, 68, 255) : new Color(76, 198, 132, 255);
          pg.roundRect(-pw / 2 + 2, -ph / 2 + 2, fillW - 4, ph - 4, 5);
          pg.fill();
        }

      }, _class2._inst = null, _class2)) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=7cbfef8fdbb9fbbef092d4df09c8fb900e61d5a8.js.map