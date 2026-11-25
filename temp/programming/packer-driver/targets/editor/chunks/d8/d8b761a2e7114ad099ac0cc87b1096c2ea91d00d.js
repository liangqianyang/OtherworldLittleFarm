System.register(["__unresolved_0", "cc", "__unresolved_1"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, EventBus, TimeSystem, _crd, SOLAR_TERMS_24, DAYS_PER_YEAR, DAYS_PER_SEASON, DAYS_PER_SOLAR_TERM, OFFLINE_MS_PER_GAME_DAY, OFFLINE_MAX_DAYS;

  function _reportPossibleCrUseOfPlantDef(extras) {
    _reporterNs.report("PlantDef", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfSeasonId(extras) {
    _reporterNs.report("SeasonId", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfWeatherId(extras) {
    _reporterNs.report("WeatherId", "./GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfEventBus(extras) {
    _reporterNs.report("EventBus", "./EventBus", _context.meta, extras);
  }

  _export("TimeSystem", void 0);

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

      _cclegacy._RF.push({}, "c2fe5a0deZMNqFDAxnkLG8B", "TimeSystem", undefined);
      /**
       * 《异界小农场 2.0》阶段 0：48 天二十四节气时钟与离线结算系统
       * - 1 年 = 4 季 × 12 游戏日 = 48 天；每 2 天推进 1 个节气（完整二十四节气）。
       * - 离线红线：仅冷启动结算离线时长；上限 24 小时（最多推进 2 游戏日）；时间倒流按 0 处理；防守夜离线绝不判定失守。
       */


      _export("SOLAR_TERMS_24", SOLAR_TERMS_24 = [// 春（Day 1-12）
      {
        index: 0,
        id: 'lichun',
        name: '立春',
        season: 'spring'
      }, {
        index: 1,
        id: 'yushui',
        name: '雨水',
        season: 'spring'
      }, {
        index: 2,
        id: 'jingzhe',
        name: '惊蛰',
        season: 'spring'
      }, {
        index: 3,
        id: 'chunfen',
        name: '春分',
        season: 'spring'
      }, {
        index: 4,
        id: 'qingming',
        name: '清明',
        season: 'spring'
      }, {
        index: 5,
        id: 'guyu',
        name: '谷雨',
        season: 'spring'
      }, // 夏（Day 13-24）
      {
        index: 6,
        id: 'lixia',
        name: '立夏',
        season: 'summer'
      }, {
        index: 7,
        id: 'xiaoman',
        name: '小满',
        season: 'summer'
      }, {
        index: 8,
        id: 'mangzhong',
        name: '芒种',
        season: 'summer'
      }, {
        index: 9,
        id: 'xiazhi',
        name: '夏至',
        season: 'summer'
      }, {
        index: 10,
        id: 'xiaoshu',
        name: '小暑',
        season: 'summer'
      }, {
        index: 11,
        id: 'dashu',
        name: '大暑',
        season: 'summer'
      }, // 秋（Day 25-36）
      {
        index: 12,
        id: 'liqiu',
        name: '立秋',
        season: 'autumn'
      }, {
        index: 13,
        id: 'chushu',
        name: '处暑',
        season: 'autumn'
      }, {
        index: 14,
        id: 'bailu',
        name: '白露',
        season: 'autumn'
      }, {
        index: 15,
        id: 'qiufen',
        name: '秋分',
        season: 'autumn'
      }, {
        index: 16,
        id: 'hanlu',
        name: '寒露',
        season: 'autumn'
      }, {
        index: 17,
        id: 'shuangjiang',
        name: '霜降',
        season: 'autumn'
      }, // 冬（Day 37-48）
      {
        index: 18,
        id: 'lidong',
        name: '立冬',
        season: 'winter'
      }, {
        index: 19,
        id: 'xiaoxue',
        name: '小雪',
        season: 'winter'
      }, {
        index: 20,
        id: 'daxue',
        name: '大雪',
        season: 'winter'
      }, {
        index: 21,
        id: 'dongzhi',
        name: '冬至',
        season: 'winter'
      }, {
        index: 22,
        id: 'xiaohan',
        name: '小寒',
        season: 'winter'
      }, {
        index: 23,
        id: 'dahan',
        name: '大寒',
        season: 'winter'
      }]);

      _export("DAYS_PER_YEAR", DAYS_PER_YEAR = 48);

      _export("DAYS_PER_SEASON", DAYS_PER_SEASON = 12);

      _export("DAYS_PER_SOLAR_TERM", DAYS_PER_SOLAR_TERM = 2);

      _export("OFFLINE_MS_PER_GAME_DAY", OFFLINE_MS_PER_GAME_DAY = 12 * 60 * 60 * 1000); // 每 12 小时真实离线推进 1 游戏日


      _export("OFFLINE_MAX_DAYS", OFFLINE_MAX_DAYS = 2); // 单次离线最多推进 2 游戏日（24h 封顶）


      _export("TimeSystem", TimeSystem = class TimeSystem {
        constructor(nowProvider = () => Date.now()) {
          this._dayIndex = 1;
          this._weather = 'sunny';
          this._nowProvider = void 0;
          this._nowProvider = nowProvider;
        }

        get dayIndex() {
          return this._dayIndex;
        }

        get weather() {
          return this._weather;
        }

        restore(dayIndex, weather) {
          this._dayIndex = Math.max(1, Math.floor(dayIndex));
          this._weather = weather;
        }

        getDate(dayIndex = this._dayIndex) {
          const d = Math.max(1, Math.floor(dayIndex));
          const zeroBased = d - 1;
          const year = Math.floor(zeroBased / DAYS_PER_YEAR) + 1;
          const dayOfYear = zeroBased % DAYS_PER_YEAR + 1;
          const termIdx = Math.floor((dayOfYear - 1) / DAYS_PER_SOLAR_TERM);
          const solarTerm = SOLAR_TERMS_24[termIdx];
          const dayOfSeason = (dayOfYear - 1) % DAYS_PER_SEASON + 1;
          return {
            dayIndex: d,
            year,
            dayOfYear,
            season: solarTerm.season,
            dayOfSeason,
            solarTerm
          };
        }
        /** 检查某株灵植在当前游戏日是否可播种（支持后期四季灵棚反季覆盖） */


        canPlantToday(plant, inGreenhouse = false) {
          if (inGreenhouse) return true;
          const date = this.getDate();

          if (plant.solarTerms.length > 0) {
            return plant.solarTerms.includes(date.solarTerm.id);
          }

          return plant.seasons.includes(date.season);
        }
        /** 显式结束一天（玩家在床休息或离线逐日结算时调用） */


        endDay() {
          this._dayIndex += 1;
          const next = this.getDate();
          this._weather = this._rollWeather(next.season, next.dayIndex);
          (_crd && EventBus === void 0 ? (_reportPossibleCrUseOfEventBus({
            error: Error()
          }), EventBus) : EventBus).inst.emit('dayAdvanced', {
            dayIndex: next.dayIndex,
            year: next.year,
            season: next.season,
            solarTermId: next.solarTerm.id,
            weather: this._weather
          });
          return next;
        }
        /**
         * 冷启动离线结算：
         * - 时间回拨（now < savedRealTimeMs）按 0 处理，绝不倒扣。
         * - 最多推进 OFFLINE_MAX_DAYS（2 天），作物只长不枯。
         */


        settleOffline(savedRealTimeMs) {
          const now = this._nowProvider();

          const deltaMs = now - savedRealTimeMs;
          if (!Number.isFinite(deltaMs) || deltaMs <= 0) return 0;
          const rawDays = Math.floor(deltaMs / OFFLINE_MS_PER_GAME_DAY);
          const daysToAdvance = Math.min(OFFLINE_MAX_DAYS, Math.max(0, rawDays));

          for (let i = 0; i < daysToAdvance; i++) {
            this.endDay();
          }

          if (daysToAdvance > 0) {
            (_crd && EventBus === void 0 ? (_reportPossibleCrUseOfEventBus({
              error: Error()
            }), EventBus) : EventBus).inst.emit('offlineSettled', {
              daysElapsed: daysToAdvance,
              newDayIndex: this._dayIndex
            });
          }

          return daysToAdvance;
        }

        _rollWeather(season, seed) {
          // 确定性伪随机，保证同档可复现测试
          const r = (seed * 9301 + 49297) % 233280 / 233280;
          if (season === 'winter') return r < 0.35 ? 'snowy' : 'sunny';
          if (season === 'spring' || season === 'summer') return r < 0.3 ? 'rainy' : 'sunny';
          return r < 0.18 ? 'rainy' : 'sunny';
        }

      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=d8b761a2e7114ad099ac0cc87b1096c2ea91d00d.js.map