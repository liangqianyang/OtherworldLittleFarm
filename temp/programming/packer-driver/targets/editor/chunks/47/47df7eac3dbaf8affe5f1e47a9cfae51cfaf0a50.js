System.register(["__unresolved_0", "cc", "cc/env", "__unresolved_1", "__unresolved_2"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Color, Component, Graphics, Label, Layers, Node, UITransform, Widget, DEV, DataManager, GameApp, _dec, _class, _class2, _crd, ccclass, DebugPanel;

  function _reportPossibleCrUseOfDataManager(extras) {
    _reporterNs.report("DataManager", "../core/DataManager", _context.meta, extras);
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
      UITransform = _cc.UITransform;
      Widget = _cc.Widget;
    }, function (_ccEnv) {
      DEV = _ccEnv.DEV;
    }, function (_unresolved_2) {
      DataManager = _unresolved_2.DataManager;
    }, function (_unresolved_3) {
      GameApp = _unresolved_3.GameApp;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "347bbjRd0tDjY/1O0HhqUE8", "DebugPanel", undefined);
      /**
       * 《异界小农场 2.0》阶段 1 适配版：右上角可折叠开发调试面板
       * - 默认收起为右上角小圆钮（不遮挡主岛画面）；点击 DBG 展开跳天、发种子、印存档与重置档按钮。
       */


      __checkObsolete__(['_decorator', 'Color', 'Component', 'Graphics', 'Label', 'Layers', 'Node', 'UITransform', 'Widget']);

      ({
        ccclass
      } = _decorator);

      _export("DebugPanel", DebugPanel = (_dec = ccclass('DebugPanel'), _dec(_class = (_class2 = class DebugPanel extends Component {
        constructor(...args) {
          super(...args);
          this._rootNode = null;
          this._barNode = null;
          this._expanded = false;
        }

        static get isDebugVisible() {
          var _DebugPanel$_inst;

          return !!((_DebugPanel$_inst = DebugPanel._inst) != null && (_DebugPanel$_inst = _DebugPanel$_inst._rootNode) != null && _DebugPanel$_inst.active);
        }

        static setDebugVisible(show) {
          const inst = DebugPanel._inst;
          if (!inst || !DEV) return;
          if (!inst._rootNode && show) inst._buildUI();
          if (inst._rootNode) inst._rootNode.active = show;
        }

        onLoad() {
          DebugPanel._inst = this;
        }

        onDestroy() {
          if (DebugPanel._inst === this) DebugPanel._inst = null;
        }

        start() {
          if (!DEV) {
            this.node.active = false;
            return;
          } // V1.0 发布态默认隐藏 DBG 按钮，可在「设置」面板内随时一键开启


          this._buildUI();

          if (this._rootNode) this._rootNode.active = false;
        }

        _newUINode(name, parent) {
          const n = new Node(name);
          n.layer = Layers.Enum.UI_2D;
          n.parent = parent;
          return n;
        }

        _buildUI() {
          const root = this._newUINode('DebugRoot', this.node);

          this._rootNode = root;
          const rt = root.addComponent(UITransform);
          rt.setContentSize(84, 44);
          const w = root.addComponent(Widget);
          w.isAlignTop = true;
          w.top = 20;
          w.isAlignRight = true;
          w.right = 24;

          const toggleBtn = this._makeButton('DBG', 76, 38, new Color(31, 111, 104, 225), () => {
            this._expanded = !this._expanded;
            if (this._barNode) this._barNode.active = this._expanded;
          });

          toggleBtn.parent = root;
          this._barNode = this._newUINode('ActionsBar', root);

          this._barNode.setPosition(-290, -52, 0);

          this._barNode.active = this._expanded;
          const actions = [{
            label: '+1天',
            color: new Color(31, 111, 104, 240),
            fn: () => {
              var _inst;

              return (_inst = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
                error: Error()
              }), GameApp) : GameApp).inst) == null ? void 0 : _inst.endDayAndSave();
            }
          }, {
            label: '+6天',
            color: new Color(31, 111, 104, 240),
            fn: () => {
              for (let i = 0; i < 6; i++) {
                var _inst2;

                (_inst2 = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
                  error: Error()
                }), GameApp) : GameApp).inst) == null || _inst2.endDayAndSave();
              }
            }
          }, {
            label: '+100金',
            color: new Color(181, 118, 36, 240),
            fn: () => {
              var _inst3, _inst4;

              (_inst3 = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
                error: Error()
              }), GameApp) : GameApp).inst) == null || _inst3.addGold(100);
              (_inst4 = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
                error: Error()
              }), GameApp) : GameApp).inst) == null || _inst4.persist('debug_gold');
            }
          }, {
            label: '+全灵植',
            color: new Color(76, 126, 62, 240),
            fn: () => {
              const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
                error: Error()
              }), GameApp) : GameApp).inst;
              if (!app) return;

              for (const p of (_crd && DataManager === void 0 ? (_reportPossibleCrUseOfDataManager({
                error: Error()
              }), DataManager) : DataManager).inst.getAllPlants()) app.addItem(`${p.id}_seed`, 5);

              app.persist('debug_seeds');
            }
          }, {
            label: '印存档',
            color: new Color(68, 82, 98, 240),
            fn: () => {
              const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
                error: Error()
              }), GameApp) : GameApp).inst;
              if (!app) return;
              console.log('[DebugPanel] SaveData:', JSON.stringify(app.saveData, null, 2));
            }
          }, {
            label: '重置档',
            color: new Color(185, 62, 48, 240),
            fn: () => {
              var _inst5;

              return (_inst5 = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
                error: Error()
              }), GameApp) : GameApp).inst) == null ? void 0 : _inst5.resetSave();
            }
          }];
          const btnW = 92;
          const gap = 8;
          actions.forEach((act, idx) => {
            const b = this._makeButton(act.label, btnW, 36, act.color, act.fn);

            b.parent = this._barNode;
            b.setPosition((idx - (actions.length - 1) / 2) * (btnW + gap), 0, 0);
          });
        }

        _makeButton(text, width, height, bg, onTap) {
          const n = new Node(`Btn_${text}`);
          n.layer = Layers.Enum.UI_2D;
          const ut = n.addComponent(UITransform);
          ut.setContentSize(width, height);
          const g = n.addComponent(Graphics);
          g.fillColor = bg;
          g.roundRect(-width / 2, -height / 2, width, height, 8);
          g.fill();

          const lblNode = this._newUINode('Label', n);

          const lbl = lblNode.addComponent(Label);
          lbl.string = text;
          lbl.fontSize = 16;
          lbl.lineHeight = 20;
          lbl.color = Color.WHITE;
          n.on(Node.EventType.TOUCH_END, onTap);
          return n;
        }

      }, _class2._inst = null, _class2)) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=47df7eac3dbaf8affe5f1e47a9cfae51cfaf0a50.js.map