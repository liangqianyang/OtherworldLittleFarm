System.register(["__unresolved_0", "cc"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, EventBus, _crd;

  function _reportPossibleCrUseOfSeasonId(extras) {
    _reporterNs.report("SeasonId", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfWeatherId(extras) {
    _reporterNs.report("WeatherId", "./GameTypes", _context.meta, extras);
  }

  _export("EventBus", void 0);

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "71ce3VLxsJJGZkoQVZAaYKT", "EventBus", undefined);
      /**
       * 《异界小农场 2.0》阶段 0：强类型事件总线
       * 特性：防重复注册、单监听异常隔离（不连累同事件其余监听）、支持按 target 批量清理防内存泄漏。
       */


      _export("EventBus", EventBus = class EventBus {
        constructor() {
          this._map = new Map();
        }

        static get inst() {
          if (!this._inst) this._inst = new EventBus();
          return this._inst;
        }

        on(event, handler, target) {
          let list = this._map.get(event);

          if (!list) {
            list = [];

            this._map.set(event, list);
          }

          const exists = list.some(e => e.handler === handler && e.target === target);

          if (!exists) {
            list.push({
              handler: handler,
              target
            });
          }
        }

        off(event, handler, target) {
          const list = this._map.get(event);

          if (!list) return;

          for (let i = list.length - 1; i >= 0; i--) {
            if (list[i].handler === handler && list[i].target === target) {
              list.splice(i, 1);
            }
          }
        }
        /** 在 Cocos Component.onDestroy() 中一键注销该组件所有监听 */


        offTarget(target) {
          this._map.forEach(list => {
            for (let i = list.length - 1; i >= 0; i--) {
              if (list[i].target === target) {
                list.splice(i, 1);
              }
            }
          });
        }

        emit(event, payload) {
          const list = this._map.get(event);

          if (!list || list.length === 0) return;
          const snapshot = list.slice();

          for (const entry of snapshot) {
            try {
              entry.handler.call(entry.target, payload);
            } catch (err) {
              console.error(`[EventBus] listener error on "${String(event)}":`, err);
            }
          }
        }

        clear() {
          this._map.clear();
        }

      });

      EventBus._inst = null;

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=b69d718efc92c16c4d0840bbbfb12d434927d54b.js.map