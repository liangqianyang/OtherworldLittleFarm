System.register(["__unresolved_0", "cc"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, DataManager, _crd;

  function _reportPossibleCrUseOfFishCatalogFile(extras) {
    _reporterNs.report("FishCatalogFile", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfFishDef(extras) {
    _reporterNs.report("FishDef", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfPlantDef(extras) {
    _reporterNs.report("PlantDef", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfPlantsCatalogFile(extras) {
    _reporterNs.report("PlantsCatalogFile", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfRiverSegmentDef(extras) {
    _reporterNs.report("RiverSegmentDef", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfRiverSegmentId(extras) {
    _reporterNs.report("RiverSegmentId", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfSeasonId(extras) {
    _reporterNs.report("SeasonId", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfWeaponDef(extras) {
    _reporterNs.report("WeaponDef", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfWeaponsCatalogFile(extras) {
    _reporterNs.report("WeaponsCatalogFile", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfWeatherId(extras) {
    _reporterNs.report("WeatherId", "./GameTypes", _context.meta, extras);
  }

  _export("DataManager", void 0);

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "594820VRKtByoNP057oqpQe", "DataManager", undefined);
      /**
       * 《异界小农场 2.0》阶段 0：静态配置表注册中心与引用完整性校验器
       * - 纯逻辑不强绑定 cc.resources，传入异步 JSON 加载器即可在 Cocos 3.8.8 与 Node 无头单测无缝运行。
       * - 启动时自动校验 plants / fish / weapons 跨表 ID 引用，第一时间暴露填表错误。
       */


      _export("DataManager", DataManager = class DataManager {
        constructor() {
          this._plants = new Map();
          this._fish = new Map();
          this._riverSegments = new Map();
          this._weapons = new Map();
          this._loaded = false;
        }

        static get inst() {
          if (!this._inst) this._inst = new DataManager();
          return this._inst;
        }

        get isLoaded() {
          return this._loaded;
        }

        async loadAll(loader) {
          const [plantsFile, fishFile, weaponsFile] = await Promise.all([loader('catalogs/plants'), loader('catalogs/fish'), loader('catalogs/weapons')]);

          this._plants.clear();

          for (const p of plantsFile.plants) this._plants.set(p.id, p);

          this._riverSegments.clear();

          for (const s of fishFile.river_segments) this._riverSegments.set(s.id, s);

          this._fish.clear();

          for (const f of fishFile.fish) this._fish.set(f.id, f);

          this._weapons.clear();

          for (const w of weaponsFile.weapons) this._weapons.set(w.id, w);

          this.validateIntegrity();
          this._loaded = true;
        }

        validateIntegrity() {
          const errors = [];

          this._plants.forEach(p => {
            var _p$defense;

            if ((_p$defense = p.defense) != null && _p$defense.synergies) {
              for (const s of p.defense.synergies) {
                if (!this._plants.has(s.neighborId)) {
                  errors.push(`Plant "${p.id}" synergy references unknown plant "${s.neighborId}"`);
                }
              }
            }
          });

          this._fish.forEach(f => {
            for (const seg of f.riverSegments) {
              if (!this._riverSegments.has(seg)) {
                errors.push(`Fish "${f.id}" references unknown riverSegment "${seg}"`);
              }
            }
          });

          this._weapons.forEach(w => {
            for (const ench of w.recommendedEnchants) {
              if (!this._plants.has(ench)) {
                errors.push(`Weapon "${w.id}" enchant references unknown plant "${ench}"`);
              }
            }
          });

          if (errors.length > 0) {
            throw new Error(`[DataManager] Integrity check failed:\n- ${errors.join('\n- ')}`);
          }
        }

        getPlant(id) {
          return this._plants.get(id);
        }

        getAllPlants() {
          return Array.from(this._plants.values());
        }

        getFish(id) {
          return this._fish.get(id);
        }
        /** 按「河段 × 季节 × 天气 × 节气」筛选当前可钓出的鱼池 */


        queryFishPool(segment, season, weather, solarTermId) {
          const pool = [];

          this._fish.forEach(f => {
            if (!f.riverSegments.includes(segment)) return;
            if (!f.weather.includes(weather)) return;

            if (f.solarTerms.length > 0) {
              if (!f.solarTerms.includes(solarTermId)) return;
            } else if (!f.seasons.includes(season)) {
              return;
            }

            pool.push(f);
          });

          return pool;
        }

        getWeapon(id) {
          return this._weapons.get(id);
        }

        getAllWeapons() {
          return Array.from(this._weapons.values());
        }

      });

      DataManager._inst = null;

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=aea3b205e2aff888a3ebdc38e380a3ec6e15f3a9.js.map