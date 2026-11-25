System.register(["__unresolved_0", "cc", "__unresolved_1"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, EventBus, MemoryPlatformAdapter, SaveManager, _crd, SAVE_VERSION, MAIN_KEY, BAK_KEY;

  function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

  function createNewSave(nowMs) {
    return {
      version: SAVE_VERSION,
      dayIndex: 1,
      weather: 'sunny',
      savedRealTimeMs: nowMs,
      gold: 80,
      inventory: {
        spring_greens_seed: 6,
        thunder_potato_seed: 1,
        cloud_bamboo_shoot_seed: 1,
        wood: 10,
        stone: 5
      },
      codex: {
        plants: [],
        fish: [],
        weapons: ['bamboo_sword', 'talisman_pistol']
      },
      farm: {
        unlockedTier: 1,
        clearedObstacleIds: [],
        plots: Array.from({
          length: 6
        }, (_, i) => ({
          plotId: i,
          plantId: null,
          growthDays: 0,
          wateredOnDay: 0
        })),
        auraScore: 0
      },
      indoor: {
        roomLevel: 1,
        comfortScore: 10,
        furniture: [{
          uid: 'init_bed',
          furnitureId: 'furn_bed_wood',
          gx: 2,
          gy: 2
        }, {
          uid: 'init_stove',
          furnitureId: 'furn_stove_clay',
          gx: 6,
          gy: 2
        }],
        aquariumFishIds: []
      },
      defense: {
        awakened: false,
        sealRepairPct: 0,
        altarHp: 100,
        lastSettledDay: 0,
        slots: []
      },
      dungeon: {
        unlockedWeapons: ['bamboo_sword', 'talisman_pistol'],
        equippedWeapons: ['bamboo_sword', 'talisman_pistol'],
        deepestLayer: 0,
        highestClearedStage: 0,
        unlockedAnchors: [1],
        bestStreak: 0,
        grandCleared: false
      },
      islands: {
        dockRepaired: false,
        unlockedIslands: []
      },
      npcFlags: {},
      settings: {
        bgmVolume: 0.8,
        sfxVolume: 0.9
      }
    };
  }

  function _reportPossibleCrUseOfSaveDataV(extras) {
    _reporterNs.report("SaveDataV2", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfEventBus(extras) {
    _reporterNs.report("EventBus", "./EventBus", _context.meta, extras);
  }

  _export({
    MemoryPlatformAdapter: void 0,
    createNewSave: createNewSave,
    SaveManager: void 0
  });

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }, function (_unresolved_2) {
      EventBus = _unresolved_2.EventBus;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "f7e77w5JW1PlKvVrKW3Wr1d", "SaveManager", undefined);
      /**
       * 《异界小农场 2.0》阶段 0：平台适配接口与双槽滚动存档管理器
       * - 平台隔离：核心逻辑不直接依赖 wx/tap API，统一走 IPlatformAdapter。
       * - 双槽安全写序：先写新主档，成功后才把可解析旧主档滚入 .bak；主档损坏自动回退 .bak。
       * - 支持 Base64 导出/导入存档码，单机无服务端也能防换机丢档。
       */


      _export("SAVE_VERSION", SAVE_VERSION = 1);

      MAIN_KEY = 'olf2_save_main';
      BAK_KEY = 'olf2_save_main.bak';

      /** 本地内存/浏览器兜底适配器（开发预览与 Node 无头测试通用） */
      _export("MemoryPlatformAdapter", MemoryPlatformAdapter = class MemoryPlatformAdapter {
        constructor() {
          this.platformName = 'local';
          this._mem = new Map();
          this._nowOffsetMs = 0;
          this.storage = {
            getItem: k => {
              var _this$_mem$get;

              return (_this$_mem$get = this._mem.get(k)) != null ? _this$_mem$get : null;
            },
            setItem: (k, v) => {
              this._mem.set(k, v);
            },
            removeItem: k => {
              this._mem.delete(k);
            }
          };
        }

        nowMs() {
          return Date.now() + this._nowOffsetMs;
        }

        setNowOffsetMs(ms) {
          this._nowOffsetMs = ms;
        }

        onHide(_cb) {
          /* no-op in memory adapter */
        }

        onShow(_cb) {
          /* no-op in memory adapter */
        }

      });

      _export("SaveManager", SaveManager = class SaveManager {
        constructor(platform) {
          this._platform = void 0;
          this._platform = platform;
        }

        load() {
          var primary = this._tryParse(this._platform.storage.getItem(MAIN_KEY));

          if (primary) return this._migrate(primary);

          var backup = this._tryParse(this._platform.storage.getItem(BAK_KEY));

          if (backup) {
            console.warn('[SaveManager] Primary save corrupted; recovered from .bak');
            return this._migrate(backup);
          }

          return null;
        }

        save(data, reason) {
          if (reason === void 0) {
            reason = 'manual';
          }

          var prevRaw = this._platform.storage.getItem(MAIN_KEY);

          var payload = _extends({}, data, {
            version: SAVE_VERSION,
            savedRealTimeMs: this._platform.nowMs()
          });

          var serialized = JSON.stringify(payload);

          try {
            this._platform.storage.setItem(MAIN_KEY, serialized); // 仅当旧主档可安全解析时才滚入 .bak，避免坏档污染备份槽


            if (prevRaw && this._tryParse(prevRaw)) {
              this._platform.storage.setItem(BAK_KEY, prevRaw);
            }

            (_crd && EventBus === void 0 ? (_reportPossibleCrUseOfEventBus({
              error: Error()
            }), EventBus) : EventBus).inst.emit('saveCompleted', {
              reason,
              timestampMs: payload.savedRealTimeMs
            });
            return true;
          } catch (err) {
            console.error('[SaveManager] Save failed:', err);
            return false;
          }
        }
        /** 导出可复制的存档码（UTF-8 → Base64） */


        exportCode(data) {
          var json = JSON.stringify(data);

          if (typeof Buffer !== 'undefined') {
            return Buffer.from(json, 'utf-8').toString('base64');
          }

          var bytes = new TextEncoder().encode(json);
          var bin = '';

          for (var b of bytes) bin += String.fromCharCode(b);

          return btoa(bin);
        }
        /** 导入存档码并校验基本结构 */


        importCode(code) {
          try {
            var json;

            if (typeof Buffer !== 'undefined') {
              json = Buffer.from(code.trim(), 'base64').toString('utf-8');
            } else {
              var bin = atob(code.trim());
              var bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
              json = new TextDecoder().decode(bytes);
            }

            var parsed = this._tryParse(json);

            return parsed ? this._migrate(parsed) : null;
          } catch (_unused) {
            return null;
          }
        }

        _tryParse(raw) {
          if (!raw) return null;

          try {
            var obj = JSON.parse(raw);
            if (!obj || typeof obj !== 'object' || typeof obj.dayIndex !== 'number') return null;
            return obj;
          } catch (_unused2) {
            return null;
          }
        }
        /** 版本迁移链（未来升级只增不删，并做防御性数值钳位） */


        _migrate(data) {
          var out = _extends({}, data, {
            version: SAVE_VERSION
          });

          out.dayIndex = Math.max(1, Math.floor(out.dayIndex || 1));
          out.gold = Math.max(0, Math.floor(out.gold || 0));

          if (out.defense) {
            var _out$defense$altarHp, _out$defense$sealRepa;

            out.defense = _extends({}, out.defense, {
              altarHp: Math.min(100, Math.max(0, (_out$defense$altarHp = out.defense.altarHp) != null ? _out$defense$altarHp : 100)),
              sealRepairPct: Math.min(100, Math.max(0, (_out$defense$sealRepa = out.defense.sealRepairPct) != null ? _out$defense$sealRepa : 0))
            });
          }

          return out;
        }

      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=a2f4f3e6ec64f8950138e6139de4190320af6bb1.js.map