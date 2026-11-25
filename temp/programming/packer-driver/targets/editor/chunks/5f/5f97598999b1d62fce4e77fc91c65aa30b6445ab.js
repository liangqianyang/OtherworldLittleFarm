System.register(["__unresolved_0", "cc"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, game, Game, sys, TapAdapter, _crd;

  function getMiniGameSdk() {
    const g = globalThis;

    if (g.tap && typeof g.tap.getStorageSync === 'function') {
      return {
        name: 'taptap',
        sdk: g.tap
      };
    }

    if (g.wx && typeof g.wx.getStorageSync === 'function') {
      return {
        name: 'wechat',
        sdk: g.wx
      };
    }

    return null;
  }

  function _reportPossibleCrUseOfIPlatformAdapter(extras) {
    _reporterNs.report("IPlatformAdapter", "../core/SaveManager", _context.meta, extras);
  }

  function _reportPossibleCrUseOfIStorageAdapter(extras) {
    _reporterNs.report("IStorageAdapter", "../core/SaveManager", _context.meta, extras);
  }

  _export("TapAdapter", void 0);

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      game = _cc.game;
      Game = _cc.Game;
      sys = _cc.sys;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "ea373795TBKlIJLMKB02oUz", "TapAdapter", undefined);
      /**
       * 《异界小农场 2.0》阶段 0：TapTap 小游戏 / 微信容器 / Web 预览统一平台适配层
       * - 核心游戏逻辑不直接调用 tap / wx 全局对象，全部收敛在本文件。
       * - 自动识别运行环境：TapTap 小游戏 (`tap`) > 微信小游戏 (`wx`) > 浏览器 (`localStorage`) > 内存兜底。
       * - 内置 TapTap 提审必接能力 `addToDesktop()`（带防重入与 10 秒超时兜底）。
       */


      __checkObsolete__(['game', 'Game', 'sys']);

      _export("TapAdapter", TapAdapter = class TapAdapter {
        constructor() {
          this.platformName = void 0;
          this.storage = void 0;
          this._sdk = void 0;
          this._memFallback = new Map();
          const detected = getMiniGameSdk();
          this._sdk = detected ? detected.sdk : null;
          this.platformName = detected ? detected.name : 'web_local';
          this.storage = {
            getItem: key => {
              var _this$_memFallback$ge;

              try {
                var _this$_sdk;

                if ((_this$_sdk = this._sdk) != null && _this$_sdk.getStorageSync) {
                  const val = this._sdk.getStorageSync(key);

                  return val === '' || val === undefined || val === null ? null : String(val);
                }

                if (sys.localStorage) {
                  return sys.localStorage.getItem(key);
                }
              } catch (err) {
                console.warn(`[TapAdapter] getItem("${key}") failed:`, err);
              }

              return (_this$_memFallback$ge = this._memFallback.get(key)) != null ? _this$_memFallback$ge : null;
            },
            setItem: (key, value) => {
              this._memFallback.set(key, value);

              try {
                var _this$_sdk2;

                if ((_this$_sdk2 = this._sdk) != null && _this$_sdk2.setStorageSync) {
                  this._sdk.setStorageSync(key, value);

                  return;
                }

                if (sys.localStorage) {
                  sys.localStorage.setItem(key, value);
                }
              } catch (err) {
                console.error(`[TapAdapter] setItem("${key}") failed:`, err);
              }
            },
            removeItem: key => {
              this._memFallback.delete(key);

              try {
                var _this$_sdk3;

                if ((_this$_sdk3 = this._sdk) != null && _this$_sdk3.removeStorageSync) {
                  this._sdk.removeStorageSync(key);

                  return;
                }

                if (sys.localStorage) {
                  sys.localStorage.removeItem(key);
                }
              } catch (err) {
                console.warn(`[TapAdapter] removeItem("${key}") failed:`, err);
              }
            }
          };
        }

        nowMs() {
          return Date.now();
        }

        onHide(cb) {
          var _this$_sdk4;

          if ((_this$_sdk4 = this._sdk) != null && _this$_sdk4.onHide) {
            this._sdk.onHide(cb);
          }

          game.on(Game.EVENT_HIDE, cb);
        }

        onShow(cb) {
          var _this$_sdk5;

          if ((_this$_sdk5 = this._sdk) != null && _this$_sdk5.onShow) {
            this._sdk.onShow(cb);
          }

          game.on(Game.EVENT_SHOW, cb);
        }
        /** TapTap 小游戏提审必接能力：添加到桌面（防 Promise 悬挂） */


        addToDesktop() {
          return new Promise(resolve => {
            var _this$_sdk6;

            if (!((_this$_sdk6 = this._sdk) != null && _this$_sdk6.addToDesktop)) {
              console.log('[TapAdapter] addToDesktop() not available in current preview environment.');
              resolve(false);
              return;
            }

            let settled = false;

            const finish = ok => {
              if (settled) return;
              settled = true;
              resolve(ok);
            };

            const timer = setTimeout(() => finish(false), 10000);

            try {
              this._sdk.addToDesktop({
                success: () => {
                  clearTimeout(timer);
                  finish(true);
                },
                fail: err => {
                  clearTimeout(timer);
                  console.warn('[TapAdapter] addToDesktop failed:', err);
                  finish(false);
                }
              });
            } catch (err) {
              clearTimeout(timer);
              console.warn('[TapAdapter] addToDesktop threw:', err);
              finish(false);
            }
          });
        }

      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=5f97598999b1d62fce4e77fc91c65aa30b6445ab.js.map