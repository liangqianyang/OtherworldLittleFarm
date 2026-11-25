System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, DataManager, EventBus, GameApp, FarmSystem, _crd;

  function _reportPossibleCrUseOfFarmPlotSave(extras) {
    _reporterNs.report("FarmPlotSave", "../../core/GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfPlantDef(extras) {
    _reporterNs.report("PlantDef", "../../core/GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfDataManager(extras) {
    _reporterNs.report("DataManager", "../../core/DataManager", _context.meta, extras);
  }

  function _reportPossibleCrUseOfEventBus(extras) {
    _reporterNs.report("EventBus", "../../core/EventBus", _context.meta, extras);
  }

  function _reportPossibleCrUseOfGameApp(extras) {
    _reporterNs.report("GameApp", "../../app/GameApp", _context.meta, extras);
  }

  _export("FarmSystem", void 0);

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }, function (_unresolved_2) {
      DataManager = _unresolved_2.DataManager;
    }, function (_unresolved_3) {
      EventBus = _unresolved_3.EventBus;
    }, function (_unresolved_4) {
      GameApp = _unresolved_4.GameApp;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "d95fcF0nTRBv5d9VQtGzMOc", "FarmSystem", undefined);
      /**
       * 《异界小农场 2.0》阶段 1：农场种植、浇水成长、收获、出货与三阶开荒核心逻辑
       * - 严格读写 GameApp.inst.saveData，不直接操作 UI 节点。
       * - 监听 dayAdvanced：已浇水（或无需浇水 / 雨天自动浇水）的作物成长 +1 天；作物只长不枯。
       * - 开荒清理一阶障碍物后，原地解锁一块全新的可耕种农田并发放木材/石料。
       */


      _export("FarmSystem", FarmSystem = class FarmSystem {
        constructor() {
          this._bound = false;
        }

        static get inst() {
          if (!this._inst) this._inst = new FarmSystem();
          return this._inst;
        }

        init() {
          if (this._bound) return;
          this._bound = true;
          (_crd && EventBus === void 0 ? (_reportPossibleCrUseOfEventBus({
            error: Error()
          }), EventBus) : EventBus).inst.on('dayAdvanced', this._onDayAdvanced, this);
        }

        _onDayAdvanced(ev) {
          var _app$saveData$farm$po;

          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return;
          const prevDay = ev.dayIndex - 1;
          let changed = false;

          for (const plot of app.saveData.farm.plots) {
            if (!plot.plantId) continue;
            const def = (_crd && DataManager === void 0 ? (_reportPossibleCrUseOfDataManager({
              error: Error()
            }), DataManager) : DataManager).inst.getPlant(plot.plantId);
            if (!def) continue; // 前一天已浇水，或作物无需浇水，或新的一天为雨天自动润泽

            const watered = plot.wateredOnDay === prevDay || !def.waterNeed || ev.weather === 'rainy';

            if (watered && plot.growthDays < def.growDays) {
              plot.growthDays += 1;
              changed = true;
            }

            if (ev.weather === 'rainy') {
              plot.wateredOnDay = ev.dayIndex;
              changed = true;
            }
          } // V1.1 国风灵宠·青云小狐：晨起自动润泽最多 6 块已播灵植并增灵气


          if (app.saveData.farm.petAdopted) {
            let petWatered = 0;

            for (const plot of app.saveData.farm.plots) {
              if (plot.plantId && !this.isMature(plot) && plot.wateredOnDay !== ev.dayIndex) {
                plot.wateredOnDay = ev.dayIndex;
                petWatered += 1;
                changed = true;
                if (petWatered >= 6) break;
              }
            }

            app.saveData.farm.auraScore += 4;
            changed = true;
          } // V1.1 东北灵泉荷塘养鱼池：晨起自动产出金币与农田灵气


          const pondFish = (_app$saveData$farm$po = app.saveData.farm.pondFishIds) != null ? _app$saveData$farm$po : [];

          if (pondFish.length > 0) {
            app.addGold(pondFish.length * 10);
            app.saveData.farm.auraScore += pondFish.length * 5;
            changed = true;
          }

          if (changed) {
            app.persist('farm_day_grow');
          }
        }

        getPlot(plotId) {
          var _inst;

          return (_inst = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst) == null ? void 0 : _inst.saveData.farm.plots.find(p => p.plotId === plotId);
        }

        isMature(plot) {
          if (!plot.plantId) return false;
          const def = (_crd && DataManager === void 0 ? (_reportPossibleCrUseOfDataManager({
            error: Error()
          }), DataManager) : DataManager).inst.getPlant(plot.plantId);
          return !!def && plot.growthDays >= def.growDays;
        }

        isWateredToday(plot) {
          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return false;
          return plot.wateredOnDay === app.time.dayIndex;
        }
        /** 获取当前背包里所有有库存的灵植种子 */


        getAvailableSeeds() {
          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return [];
          const res = [];

          for (const p of (_crd && DataManager === void 0 ? (_reportPossibleCrUseOfDataManager({
            error: Error()
          }), DataManager) : DataManager).inst.getAllPlants()) {
            var _app$saveData$invento;

            const seedItemId = `${p.id}_seed`;
            const count = (_app$saveData$invento = app.saveData.inventory[seedItemId]) != null ? _app$saveData$invento : 0;

            if (count > 0) {
              res.push({
                plant: p,
                seedItemId,
                count
              });
            }
          }

          return res;
        }

        plantSeed(plotId, plantId) {
          var _app$saveData$invento2;

          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return {
            ok: false,
            message: '系统初始化中'
          };
          const plot = this.getPlot(plotId);
          if (!plot) return {
            ok: false,
            message: '未找到该地块'
          };
          if (plot.plantId) return {
            ok: false,
            message: '这块地已经种上灵植了'
          };
          const def = (_crd && DataManager === void 0 ? (_reportPossibleCrUseOfDataManager({
            error: Error()
          }), DataManager) : DataManager).inst.getPlant(plantId);
          if (!def) return {
            ok: false,
            message: '未知灵植品种'
          };

          if (!app.time.canPlantToday(def, false)) {
            const d = app.time.getDate();
            return {
              ok: false,
              message: `当前为${d.solarTerm.name}，${def.name}不在适种期`
            };
          }

          const seedKey = `${plantId}_seed`;

          if (((_app$saveData$invento2 = app.saveData.inventory[seedKey]) != null ? _app$saveData$invento2 : 0) <= 0) {
            return {
              ok: false,
              message: `背包里没有${def.name}种子了`
            };
          }

          app.addItem(seedKey, -1);
          plot.plantId = plantId;
          plot.growthDays = 0;
          plot.wateredOnDay = app.time.weather === 'rainy' ? app.time.dayIndex : 0;
          app.persist('farm_plant');
          return {
            ok: true,
            message: `已播下 ${def.name}`
          };
        }

        waterPlot(plotId) {
          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return {
            ok: false,
            message: '系统初始化中'
          };
          const plot = this.getPlot(plotId);
          if (!plot || !plot.plantId) return {
            ok: false,
            message: '空地无需浇水'
          };
          if (this.isMature(plot)) return {
            ok: false,
            message: '灵植已成熟，可以直接收获'
          };
          if (this.isWateredToday(plot)) return {
            ok: false,
            message: '今天已经浇过水了'
          };
          plot.wateredOnDay = app.time.dayIndex;
          app.persist('farm_water');
          return {
            ok: true,
            message: '浇水完成，明早将生长 1 阶'
          };
        }

        harvestPlot(plotId) {
          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return {
            ok: false,
            message: '系统初始化中'
          };
          const plot = this.getPlot(plotId);
          if (!plot || !plot.plantId) return {
            ok: false,
            message: '没有可收获的灵植'
          };
          const def = (_crd && DataManager === void 0 ? (_reportPossibleCrUseOfDataManager({
            error: Error()
          }), DataManager) : DataManager).inst.getPlant(plot.plantId);

          if (!def || plot.growthDays < def.growDays) {
            return {
              ok: false,
              message: '灵植还未完全成熟'
            };
          }

          const [minC, maxC] = def.harvestCount;
          const count = minC + Math.floor(Math.random() * (maxC - minC + 1));
          app.addItem(def.id, count);

          if (!app.saveData.codex.plants.includes(def.id)) {
            app.saveData.codex.plants.push(def.id);
          }

          app.saveData.farm.auraScore += def.category === 'daily' ? 5 : 12;
          plot.plantId = null;
          plot.growthDays = 0;
          plot.wateredOnDay = 0;
          app.persist('farm_harvest');
          return {
            ok: true,
            message: `收获 ${def.name} ×${count}（灵气 +${def.category === 'daily' ? 5 : 12}）`
          };
        }
        /** 将背包中所有已收获灵植通过出货箱卖出换金币 */


        sellAllHarvest() {
          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return {
            ok: false,
            message: '系统初始化中'
          };
          let earned = 0;
          let totalCount = 0;

          for (const def of (_crd && DataManager === void 0 ? (_reportPossibleCrUseOfDataManager({
            error: Error()
          }), DataManager) : DataManager).inst.getAllPlants()) {
            var _app$saveData$invento3;

            const count = (_app$saveData$invento3 = app.saveData.inventory[def.id]) != null ? _app$saveData$invento3 : 0;

            if (count > 0) {
              earned += count * def.sellPrice;
              totalCount += count;
              app.addItem(def.id, -count);
            }
          }

          if (totalCount === 0) {
            return {
              ok: false,
              message: '背包里还没有可出货的成熟灵植'
            };
          }

          app.addGold(earned);
          app.persist('farm_sell');
          return {
            ok: true,
            message: `出货 ${totalCount} 份灵植，获得 ${earned} 金币`
          };
        }
        /** 购买基础春季种子（青露菜），确保前期不卡经济闭环 */


        buyStarterSeed(plantId = 'spring_greens') {
          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return {
            ok: false,
            message: '系统初始化中'
          };
          const def = (_crd && DataManager === void 0 ? (_reportPossibleCrUseOfDataManager({
            error: Error()
          }), DataManager) : DataManager).inst.getPlant(plantId);
          if (!def) return {
            ok: false,
            message: '未知种子'
          };

          if (app.saveData.gold < def.seedCost) {
            return {
              ok: false,
              message: `金币不足（需要 ${def.seedCost} 金币）`
            };
          }

          app.addGold(-def.seedCost);
          app.addItem(`${def.id}_seed`, 1);
          app.persist('buy_seed');
          return {
            ok: true,
            message: `购入 ${def.name}种子 ×1（-${def.seedCost} 金币）`
          };
        }
        /** 清理开荒障碍物：成功后发放木材/石料，并解锁一块新耕地 */


        clearObstacle(obstacleId, tier, rewardItem, rewardCount) {
          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return {
            ok: false,
            message: '系统初始化中'
          };

          if (app.saveData.farm.clearedObstacleIds.includes(obstacleId)) {
            return {
              ok: false,
              message: '此处已清理'
            };
          }

          if (app.saveData.farm.unlockedTier < tier) {
            const need = tier === 2 ? '玄铁斧镐（幽篁古墟产玄铁升级）' : '高阶灵火工具';
            return {
              ok: false,
              message: `需要 ${need} 才能清理 ${tier} 阶荒地`
            };
          }

          app.saveData.farm.clearedObstacleIds.push(obstacleId);
          app.addItem(rewardItem, rewardCount); // 原地解锁一块新可耕种农田

          const nextPlotId = app.saveData.farm.plots.length;
          app.saveData.farm.plots.push({
            plotId: nextPlotId,
            plantId: null,
            growthDays: 0,
            wateredOnDay: 0
          });
          app.saveData.farm.auraScore += 8;
          app.persist('farm_clear');
          const matName = rewardItem === 'wood' ? '木材' : '青石';
          return {
            ok: true,
            message: `开荒成功！获得 ${matName} ×${rewardCount}，解锁新耕地 #${nextPlotId + 1}`
          };
        }
        /** V1.1 范围灵泉农具：对传入的邻近地块 ID 列表一键批量浇水 */


        waterPlotsRange(plotIds) {
          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return {
            ok: false,
            message: '系统初始化中'
          };
          let count = 0;

          for (const pid of plotIds) {
            const p = this.getPlot(pid);

            if (p && p.plantId && !this.isMature(p) && !this.isWateredToday(p)) {
              p.wateredOnDay = app.time.dayIndex;
              count += 1;
            }
          }

          if (count === 0) return {
            ok: false,
            message: '附近作物今日均已浇水'
          };
          app.persist('farm_water_range');
          return {
            ok: true,
            message: count > 1 ? `灵泉范围浇水完成！一口气润泽 ${count} 块田` : '浇水完成，明早将生长 1 阶'
          };
        }
        /** V1.1 范围灵泉农具：对邻近成熟地块一键批量收获 */


        harvestPlotsRange(plotIds) {
          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return {
            ok: false,
            message: '系统初始化中'
          };
          let totalPlots = 0;
          let totalItems = 0;
          let auraGain = 0;

          for (const pid of plotIds) {
            const plot = this.getPlot(pid);
            if (!plot || !plot.plantId || !this.isMature(plot)) continue;
            const def = (_crd && DataManager === void 0 ? (_reportPossibleCrUseOfDataManager({
              error: Error()
            }), DataManager) : DataManager).inst.getPlant(plot.plantId);
            if (!def) continue;
            const [minC, maxC] = def.harvestCount;
            const c = minC + Math.floor(Math.random() * (maxC - minC + 1));
            app.addItem(def.id, c);
            if (!app.saveData.codex.plants.includes(def.id)) app.saveData.codex.plants.push(def.id);
            auraGain += def.category === 'daily' ? 5 : 12;
            totalItems += c;
            totalPlots += 1;
            plot.plantId = null;
            plot.growthDays = 0;
            plot.wateredOnDay = 0;
          }

          if (totalPlots === 0) return {
            ok: false,
            message: '没有可收获的成熟灵植'
          };
          app.saveData.farm.auraScore += auraGain;
          app.persist('farm_harvest_range');
          return {
            ok: true,
            message: totalPlots > 1 ? `灵泉范围丰收！连收 ${totalPlots} 块田共 ${totalItems} 份灵植（灵气 +${auraGain}）` : `收获灵植 ×${totalItems}（灵气 +${auraGain}）`
          };
        }
        /** V1.1 东北灵泉荷塘养鱼池：放入背包鲜鱼入池饲养（上限 4 尾） */


        addFishToPond(fishId) {
          var _app$saveData$invento4, _def$name;

          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return {
            ok: false,
            message: '系统初始化中'
          };
          if (!app.saveData.farm.pondFishIds) app.saveData.farm.pondFishIds = [];

          if (app.saveData.farm.pondFishIds.length >= 4) {
            return {
              ok: false,
              message: '灵泉荷塘养鱼池已满（上限 4 尾）'
            };
          }

          if (((_app$saveData$invento4 = app.saveData.inventory[fishId]) != null ? _app$saveData$invento4 : 0) <= 0) {
            return {
              ok: false,
              message: '背包里没有这条鱼了'
            };
          }

          const def = (_crd && DataManager === void 0 ? (_reportPossibleCrUseOfDataManager({
            error: Error()
          }), DataManager) : DataManager).inst.getFish(fishId);
          app.addItem(fishId, -1);
          app.saveData.farm.pondFishIds.push(fishId);
          app.persist('pond_add_fish');
          return {
            ok: true,
            message: `已将【${(_def$name = def == null ? void 0 : def.name) != null ? _def$name : '灵鱼'}】放养进灵泉荷塘！明早起每日产金币与灵气`
          };
        }

      });

      FarmSystem._inst = null;

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=f5a34054801057067199592a66130bb9e6a69b8c.js.map