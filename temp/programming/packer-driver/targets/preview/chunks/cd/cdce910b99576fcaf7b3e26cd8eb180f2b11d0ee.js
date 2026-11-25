System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3", "__unresolved_4", "__unresolved_5", "__unresolved_6", "__unresolved_7", "__unresolved_8"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Color, Component, Graphics, Label, Layers, Node, UITransform, Widget, AudioManager, GameApp, DebugPanel, DungeonOverlay, DefenseOverlay, VoyageOverlay, FishingOverlay, IndoorOverlay, _dec, _class, _class2, _crd, ccclass, SettingsOverlay;

  function _reportPossibleCrUseOfAudioManager(extras) {
    _reporterNs.report("AudioManager", "../core/AudioManager", _context.meta, extras);
  }

  function _reportPossibleCrUseOfGameApp(extras) {
    _reporterNs.report("GameApp", "../app/GameApp", _context.meta, extras);
  }

  function _reportPossibleCrUseOfDebugPanel(extras) {
    _reporterNs.report("DebugPanel", "./DebugPanel", _context.meta, extras);
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

  function _reportPossibleCrUseOfFishingOverlay(extras) {
    _reporterNs.report("FishingOverlay", "./FishingOverlay", _context.meta, extras);
  }

  function _reportPossibleCrUseOfIndoorOverlay(extras) {
    _reporterNs.report("IndoorOverlay", "./IndoorOverlay", _context.meta, extras);
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
      AudioManager = _unresolved_2.AudioManager;
    }, function (_unresolved_3) {
      GameApp = _unresolved_3.GameApp;
    }, function (_unresolved_4) {
      DebugPanel = _unresolved_4.DebugPanel;
    }, function (_unresolved_5) {
      DungeonOverlay = _unresolved_5.DungeonOverlay;
    }, function (_unresolved_6) {
      DefenseOverlay = _unresolved_6.DefenseOverlay;
    }, function (_unresolved_7) {
      VoyageOverlay = _unresolved_7.VoyageOverlay;
    }, function (_unresolved_8) {
      FishingOverlay = _unresolved_8.FishingOverlay;
    }, function (_unresolved_9) {
      IndoorOverlay = _unresolved_9.IndoorOverlay;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "9a61eRwS1NNjpHEb4ohs8dl", "SettingsOverlay", undefined);
      /**
       * 《异界小农场 2.0》阶段 5：国风卷轴设置面板（音量调节 + 本地存档码导出 + TapTap 添加到桌面）
       * - 严格符合 TapTap 小游戏单机合规要求：明示“数据仅存本地”、提供存档码防丢档、内置「添加到桌面」入口。
       */


      __checkObsolete__(['_decorator', 'Color', 'Component', 'Graphics', 'Label', 'Layers', 'Node', 'UITransform', 'Widget']);

      ({
        ccclass
      } = _decorator);

      _export("SettingsOverlay", SettingsOverlay = (_dec = ccclass('SettingsOverlay'), _dec(_class = (_class2 = class SettingsOverlay extends Component {
        constructor() {
          super(...arguments);
          this._triggerBtn = void 0;
          this._panel = void 0;
          this._bgmLbl = void 0;
          this._sfxLbl = void 0;
          this._noteLbl = void 0;
          this._open = false;
        }

        static get inst() {
          return this._inst;
        }

        get isOpen() {
          return this._open;
        }

        onLoad() {
          SettingsOverlay._inst = this;

          this._buildTopRightTrigger();

          this._buildModal();

          this._panel.active = false;
        }

        update() {
          var _inst, _inst2, _inst3, _inst4, _inst5;

          if (!this._triggerBtn) return;
          var hideTrigger = !!((_inst = (_crd && DungeonOverlay === void 0 ? (_reportPossibleCrUseOfDungeonOverlay({
            error: Error()
          }), DungeonOverlay) : DungeonOverlay).inst) != null && _inst.isOpen) || !!((_inst2 = (_crd && DefenseOverlay === void 0 ? (_reportPossibleCrUseOfDefenseOverlay({
            error: Error()
          }), DefenseOverlay) : DefenseOverlay).inst) != null && _inst2.isOpen) || !!((_inst3 = (_crd && VoyageOverlay === void 0 ? (_reportPossibleCrUseOfVoyageOverlay({
            error: Error()
          }), VoyageOverlay) : VoyageOverlay).inst) != null && _inst3.isOpen) || !!((_inst4 = (_crd && FishingOverlay === void 0 ? (_reportPossibleCrUseOfFishingOverlay({
            error: Error()
          }), FishingOverlay) : FishingOverlay).inst) != null && _inst4.isOpen) || !!((_inst5 = (_crd && IndoorOverlay === void 0 ? (_reportPossibleCrUseOfIndoorOverlay({
            error: Error()
          }), IndoorOverlay) : IndoorOverlay).inst) != null && _inst5.isOpen);
          this._triggerBtn.active = !hideTrigger;
        }

        onDestroy() {
          if (SettingsOverlay._inst === this) SettingsOverlay._inst = null;
        }

        _uiNode(name, parent) {
          var n = new Node(name);
          n.layer = Layers.Enum.UI_2D;
          n.parent = parent;
          return n;
        }

        _buildTopRightTrigger() {
          var btn = this._makeBtn('设置', 72, 38, new Color(132, 92, 58, 230), () => this.open());

          this._triggerBtn = btn;
          btn.parent = this.node;
          var w = btn.addComponent(Widget);
          w.isAlignTop = true;
          w.top = 20;
          w.isAlignRight = true;
          w.right = 24; // 正式版洁净右上角布局
        }

        _buildModal() {
          this._panel = this._uiNode('SettingsModal', this.node);

          this._panel.addComponent(UITransform).setContentSize(1280, 720);

          var mask = this._panel.addComponent(Graphics);

          mask.fillColor = new Color(18, 28, 26, 165);
          mask.rect(-640, -360, 1280, 720);
          mask.fill();

          var card = this._uiNode('SettingsCard', this._panel);

          card.addComponent(UITransform).setContentSize(620, 420);
          var g = card.addComponent(Graphics);
          g.fillColor = new Color(248, 240, 222, 252);
          g.strokeColor = new Color(132, 92, 58, 255);
          g.lineWidth = 4;
          g.roundRect(-310, -210, 620, 420, 16);
          g.fill();
          g.stroke();

          var title = this._uiNode('Title', card).addComponent(Label);

          title.node.setPosition(0, 162, 0);
          title.string = '设置与单机存档';
          title.fontSize = 24;
          title.color = new Color(34, 46, 42, 255); // BGM 音量行

          this._bgmLbl = this._uiNode('BgmLbl', card).addComponent(Label);

          this._bgmLbl.node.setPosition(-90, 95, 0);

          this._bgmLbl.fontSize = 18;
          this._bgmLbl.color = new Color(46, 56, 52, 255);

          var bgmDown = this._makeBtn('-10%', 72, 36, new Color(128, 102, 78, 235), () => {
            (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
              error: Error()
            }), AudioManager) : AudioManager).inst.setBgmVolume((_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
              error: Error()
            }), AudioManager) : AudioManager).inst.bgmVolume - 0.1);

            this._refreshLabels();
          });

          bgmDown.parent = card;
          bgmDown.setPosition(110, 95, 0);

          var bgmUp = this._makeBtn('+10%', 72, 36, new Color(36, 126, 116, 240), () => {
            (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
              error: Error()
            }), AudioManager) : AudioManager).inst.setBgmVolume((_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
              error: Error()
            }), AudioManager) : AudioManager).inst.bgmVolume + 0.1);

            this._refreshLabels();
          });

          bgmUp.parent = card;
          bgmUp.setPosition(195, 95, 0); // SFX 音量行

          this._sfxLbl = this._uiNode('SfxLbl', card).addComponent(Label);

          this._sfxLbl.node.setPosition(-90, 38, 0);

          this._sfxLbl.fontSize = 18;
          this._sfxLbl.color = new Color(46, 56, 52, 255);

          var sfxDown = this._makeBtn('-10%', 72, 36, new Color(128, 102, 78, 235), () => {
            (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
              error: Error()
            }), AudioManager) : AudioManager).inst.setSfxVolume((_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
              error: Error()
            }), AudioManager) : AudioManager).inst.sfxVolume - 0.1);
            (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
              error: Error()
            }), AudioManager) : AudioManager).inst.playSfx('tap');

            this._refreshLabels();
          });

          sfxDown.parent = card;
          sfxDown.setPosition(110, 38, 0);

          var sfxUp = this._makeBtn('+10%', 72, 36, new Color(36, 126, 116, 240), () => {
            (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
              error: Error()
            }), AudioManager) : AudioManager).inst.setSfxVolume((_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
              error: Error()
            }), AudioManager) : AudioManager).inst.sfxVolume + 0.1);
            (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
              error: Error()
            }), AudioManager) : AudioManager).inst.playSfx('tap');

            this._refreshLabels();
          });

          sfxUp.parent = card;
          sfxUp.setPosition(195, 38, 0); // 存档码导出 & TapTap 添加到桌面

          var exportBtn = this._makeBtn('导出本地存档码', 190, 44, new Color(74, 108, 128, 245), () => {
            var app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
              error: Error()
            }), GameApp) : GameApp).inst;
            if (!(app != null && app.ready)) return;
            var code = app.saveMgr.exportCode(app.saveData);
            console.log('[Settings] 存档码:', code);

            if (typeof navigator !== 'undefined' && navigator.clipboard) {
              void navigator.clipboard.writeText(code).catch(() => {});
            }

            this._noteLbl.string = '存档码已尝试复制到剪贴板并输出至控制台，请妥善保存！';
            (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
              error: Error()
            }), AudioManager) : AudioManager).inst.playSfx('coin');
          });

          exportBtn.parent = card;
          exportBtn.setPosition(-115, -36, 0);

          var desktopBtn = this._makeBtn('添加到桌面 (TapTap)', 200, 44, new Color(184, 122, 48, 245), () => {
            var _inst6;

            void ((_inst6 = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
              error: Error()
            }), GameApp) : GameApp).inst) == null ? void 0 : _inst6.platform.addToDesktop().then(ok => {
              this._noteLbl.string = ok ? '已成功添加快捷方式到桌面！' : '当前为浏览器预览环境，TapTap 真机容器内将自动调起添加桌面';
            }));
          });

          desktopBtn.parent = card;
          desktopBtn.setPosition(115, -36, 0); // 隐私与单机说明

          var nNode = this._uiNode('PrivacyNote', card);

          nNode.setPosition(0, -104, 0);
          nNode.addComponent(UITransform).setContentSize(540, 48);
          this._noteLbl = nNode.addComponent(Label);
          this._noteLbl.fontSize = 14;
          this._noteLbl.lineHeight = 20;
          this._noteLbl.overflow = Label.Overflow.SHRINK;
          this._noteLbl.color = new Color(108, 86, 62, 255);
          this._noteLbl.string = '纯单机无内购：所有游戏进度仅保存在本机，卸载或清理缓存前请先导出存档码。';

          var dbgToggle = this._makeBtn('开发者调试(DBG)', 166, 42, new Color(64, 96, 92, 235), () => {
            var next = !(_crd && DebugPanel === void 0 ? (_reportPossibleCrUseOfDebugPanel({
              error: Error()
            }), DebugPanel) : DebugPanel).isDebugVisible;
            (_crd && DebugPanel === void 0 ? (_reportPossibleCrUseOfDebugPanel({
              error: Error()
            }), DebugPanel) : DebugPanel).setDebugVisible(next);
            this._noteLbl.string = next ? '已开启右上角 DBG 开发者调试面板' : '已隐藏右上角 DBG 调试面板（纯净发布视图）';
          });

          dbgToggle.parent = card;
          dbgToggle.setPosition(-100, -162, 0);

          var closeBtn = this._makeBtn('关闭设置', 140, 42, new Color(128, 102, 78, 240), () => this.close());

          closeBtn.parent = card;
          closeBtn.setPosition(100, -162, 0);
        }

        _makeBtn(text, w, h, color, onTap) {
          var n = new Node("Btn_" + text.slice(0, 4));
          n.layer = Layers.Enum.UI_2D;
          n.addComponent(UITransform).setContentSize(w, h);
          var g = n.addComponent(Graphics);
          g.fillColor = color;
          g.roundRect(-w / 2, -h / 2, w, h, 8);
          g.fill();

          var l = this._uiNode('Lbl', n).addComponent(Label);

          l.string = text;
          l.fontSize = 15;
          l.color = Color.WHITE;
          n.on(Node.EventType.TOUCH_END, onTap);
          return n;
        }

        open() {
          (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
            error: Error()
          }), AudioManager) : AudioManager).inst.playSfx('tap');
          this._open = true;
          this._panel.active = true;

          this._panel.setSiblingIndex(this.node.children.length - 1);

          this._refreshLabels();
        }

        close() {
          (_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
            error: Error()
          }), AudioManager) : AudioManager).inst.playSfx('tap');
          this._open = false;
          this._panel.active = false;
        }

        _refreshLabels() {
          this._bgmLbl.string = "\u56FD\u98CE\u914D\u4E50\u97F3\u91CF\uFF1A" + Math.round((_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
            error: Error()
          }), AudioManager) : AudioManager).inst.bgmVolume * 100) + "%";
          this._sfxLbl.string = "\u4EA4\u4E92\u97F3\u6548\u97F3\u91CF\uFF1A" + Math.round((_crd && AudioManager === void 0 ? (_reportPossibleCrUseOfAudioManager({
            error: Error()
          }), AudioManager) : AudioManager).inst.sfxVolume * 100) + "%";
        }

      }, _class2._inst = null, _class2)) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=cdce910b99576fcaf7b3e26cd8eb180f2b11d0ee.js.map