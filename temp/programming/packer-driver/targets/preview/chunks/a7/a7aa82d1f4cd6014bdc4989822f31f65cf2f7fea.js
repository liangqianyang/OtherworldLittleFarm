System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3", "__unresolved_4", "__unresolved_5"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, assetManager, Component, director, JsonAsset, resources, view, DataManager, EventBus, createNewSave, SaveManager, TimeSystem, TapAdapter, _dec, _dec2, _class, _class2, _descriptor, _class3, _crd, ccclass, property, GameApp;

  function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

  function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

  function _initializerDefineProperty(target, property, descriptor, context) { if (!descriptor) return; Object.defineProperty(target, property, { enumerable: descriptor.enumerable, configurable: descriptor.configurable, writable: descriptor.writable, value: descriptor.initializer ? descriptor.initializer.call(context) : void 0 }); }

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'transform-class-properties is enabled and runs after the decorators transform.'); }

  function _reportPossibleCrUseOfSaveDataV(extras) {
    _reporterNs.report("SaveDataV2", "../core/GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfDataManager(extras) {
    _reporterNs.report("DataManager", "../core/DataManager", _context.meta, extras);
  }

  function _reportPossibleCrUseOfEventBus(extras) {
    _reporterNs.report("EventBus", "../core/EventBus", _context.meta, extras);
  }

  function _reportPossibleCrUseOfcreateNewSave(extras) {
    _reporterNs.report("createNewSave", "../core/SaveManager", _context.meta, extras);
  }

  function _reportPossibleCrUseOfSaveManager(extras) {
    _reporterNs.report("SaveManager", "../core/SaveManager", _context.meta, extras);
  }

  function _reportPossibleCrUseOfTimeSystem(extras) {
    _reporterNs.report("TimeSystem", "../core/TimeSystem", _context.meta, extras);
  }

  function _reportPossibleCrUseOfTapAdapter(extras) {
    _reporterNs.report("TapAdapter", "../platform/TapAdapter", _context.meta, extras);
  }

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      _decorator = _cc._decorator;
      assetManager = _cc.assetManager;
      Component = _cc.Component;
      director = _cc.director;
      JsonAsset = _cc.JsonAsset;
      resources = _cc.resources;
      view = _cc.view;
    }, function (_unresolved_2) {
      DataManager = _unresolved_2.DataManager;
    }, function (_unresolved_3) {
      EventBus = _unresolved_3.EventBus;
    }, function (_unresolved_4) {
      createNewSave = _unresolved_4.createNewSave;
      SaveManager = _unresolved_4.SaveManager;
    }, function (_unresolved_5) {
      TimeSystem = _unresolved_5.TimeSystem;
    }, function (_unresolved_6) {
      TapAdapter = _unresolved_6.TapAdapter;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "da154uEngJLz4rh9cuwr45f", "GameApp", undefined);
      /**
       * 《异界小农场 2.0》阶段 0：全局常驻启动入口与服务装配器
       * 挂载方式：在首场景（launch.scene）新建空节点 GameRoot，挂载本脚本即可。
       * 职责：
       * 1. 设为常驻节点（跨主岛 / 室内 / 地牢 / 外岛场景不销毁）。
       * 2. 按顺序初始化：TapAdapter → DataManager（加载三张 JSON + 校验）→ SaveManager → TimeSystem 离线结算。
       * 3. 注册切后台 onHide 强制落盘，确保单机存档不丢失。
       * 4. 提供统一 Asset Bundle 按需加载入口，严守首包 ≤ 4 MB 红线。
       */


      __checkObsolete__(['_decorator', 'assetManager', 'AssetManager', 'Component', 'director', 'JsonAsset', 'resources', 'view']);

      ({
        ccclass,
        property
      } = _decorator);

      _export("GameApp", GameApp = (_dec = ccclass('GameApp'), _dec2 = property({
        tooltip: '初始化完成后自动跳转的主场景名（留空则停留在当前场景）'
      }), _dec(_class = (_class2 = (_class3 = class GameApp extends Component {
        constructor() {
          super(...arguments);

          _initializerDefineProperty(this, "firstSceneName", _descriptor, this);

          this.platform = void 0;
          this.saveMgr = void 0;
          this.time = void 0;
          this.saveData = void 0;
          this.ready = false;
          this._bundles = new Map();
        }

        static get inst() {
          return this._inst;
        }

        onLoad() {
          if (GameApp._inst && GameApp._inst !== this) {
            this.node.destroy();
            return;
          }

          GameApp._inst = this;

          if (typeof (view == null ? void 0 : view.enableRetina) === 'function') {
            view.enableRetina(true);
          }

          director.addPersistRootNode(this.node);
          void this._bootstrap();
        }

        _bootstrap() {
          var _this = this;

          return _asyncToGenerator(function* () {
            _this.platform = new (_crd && TapAdapter === void 0 ? (_reportPossibleCrUseOfTapAdapter({
              error: Error()
            }), TapAdapter) : TapAdapter)();
            _this.saveMgr = new (_crd && SaveManager === void 0 ? (_reportPossibleCrUseOfSaveManager({
              error: Error()
            }), SaveManager) : SaveManager)(_this.platform);
            _this.time = new (_crd && TimeSystem === void 0 ? (_reportPossibleCrUseOfTimeSystem({
              error: Error()
            }), TimeSystem) : TimeSystem)(() => _this.platform.nowMs());

            try {
              yield (_crd && DataManager === void 0 ? (_reportPossibleCrUseOfDataManager({
                error: Error()
              }), DataManager) : DataManager).inst.loadAll(path => _this._loadResourceJson(path));
            } catch (err) {
              console.error('[GameApp] Failed to load static catalogs:', err);
              return;
            }

            var loaded = _this.saveMgr.load();

            if (loaded) {
              _this.saveData = loaded;

              _this.time.restore(loaded.dayIndex, loaded.weather);

              var offlineDays = _this.time.settleOffline(loaded.savedRealTimeMs);

              if (offlineDays > 0) {
                _this.saveData.dayIndex = _this.time.dayIndex;
                _this.saveData.weather = _this.time.weather;

                _this.persist('offline_settled');
              }
            } else {
              _this.saveData = (_crd && createNewSave === void 0 ? (_reportPossibleCrUseOfcreateNewSave({
                error: Error()
              }), createNewSave) : createNewSave)(_this.platform.nowMs());

              _this.time.restore(_this.saveData.dayIndex, _this.saveData.weather);

              _this.persist('new_game');
            }

            _this.platform.onHide(() => {
              _this.persist('on_hide');
            });

            _this.ready = true;

            var d = _this.time.getDate();

            console.log("[GameApp] Boot OK (" + _this.platform.platformName + ") | \u7B2C" + d.year + "\u5E74 \xB7 " + d.solarTerm.name + " \xB7 \u7B2C" + d.dayIndex + "\u5929 | \u91D1\u5E01:" + _this.saveData.gold);

            if (_this.firstSceneName) {
              director.loadScene(_this.firstSceneName);
            }
          })();
        }

        _loadResourceJson(path) {
          return new Promise((resolve, reject) => {
            resources.load(path, JsonAsset, (err, asset) => {
              if (err || !asset) {
                reject(err != null ? err : new Error("Missing JsonAsset: " + path));
                return;
              }

              resolve(asset.json);
            });
          });
        }
        /** 按需加载独立分包（地牢 / 外岛 / 节气家具 / 音频） */


        loadBundle(name) {
          var cached = this._bundles.get(name);

          if (cached) return Promise.resolve(cached);
          return new Promise((resolve, reject) => {
            assetManager.loadBundle(name, (err, bundle) => {
              if (err || !bundle) {
                reject(err != null ? err : new Error("Failed to load bundle: " + name));
                return;
              }

              this._bundles.set(name, bundle);

              resolve(bundle);
            });
          });
        }

        addGold(delta) {
          if (!this.ready || delta === 0) return;
          this.saveData.gold = Math.max(0, this.saveData.gold + Math.floor(delta));
          (_crd && EventBus === void 0 ? (_reportPossibleCrUseOfEventBus({
            error: Error()
          }), EventBus) : EventBus).inst.emit('goldChanged', {
            delta,
            total: this.saveData.gold
          });
        }

        addItem(itemId, delta) {
          var _this$saveData$invent;

          if (!this.ready || delta === 0) return;
          var next = Math.max(0, ((_this$saveData$invent = this.saveData.inventory[itemId]) != null ? _this$saveData$invent : 0) + Math.floor(delta));

          if (next === 0) {
            delete this.saveData.inventory[itemId];
          } else {
            this.saveData.inventory[itemId] = next;
          }

          (_crd && EventBus === void 0 ? (_reportPossibleCrUseOfEventBus({
            error: Error()
          }), EventBus) : EventBus).inst.emit('inventoryChanged', {
            itemId,
            delta,
            total: next
          });
        }

        endDayAndSave() {
          if (!this.ready) return;
          var next = this.time.endDay();
          this.saveData.dayIndex = next.dayIndex;
          this.saveData.weather = this.time.weather;
          this.persist('end_day');
        }

        resetSave() {
          this.saveData = (_crd && createNewSave === void 0 ? (_reportPossibleCrUseOfcreateNewSave({
            error: Error()
          }), createNewSave) : createNewSave)(this.platform.nowMs());
          this.time.restore(this.saveData.dayIndex, this.saveData.weather);
          this.persist('debug_reset');
        }

        persist(reason) {
          if (!this.saveMgr || !this.saveData) return false;
          this.saveData.dayIndex = this.time.dayIndex;
          this.saveData.weather = this.time.weather;
          return this.saveMgr.save(this.saveData, reason);
        }

      }, _class3._inst = null, _class3), (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "firstSceneName", [_dec2], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return '';
        }
      })), _class2)) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=a7aa82d1f4cd6014bdc4989822f31f65cf2f7fea.js.map