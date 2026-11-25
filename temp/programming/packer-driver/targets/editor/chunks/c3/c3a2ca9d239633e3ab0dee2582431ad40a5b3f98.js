System.register(["__unresolved_0", "cc", "__unresolved_1"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, GameApp, AudioManager, _crd, BGM_PATTERNS;

  function _reportPossibleCrUseOfGameApp(extras) {
    _reporterNs.report("GameApp", "../app/GameApp", _context.meta, extras);
  }

  _export("AudioManager", void 0);

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }, function (_unresolved_2) {
      GameApp = _unresolved_2.GameApp;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "78deajnb99EoqyJMSNjedIB", "AudioManager", undefined);
      /**
       * 《异界小农场 2.0》V1.2：国风五声自适应 BGM 与交互音效管理器
       * - 零包体占用：内置 WebAudio 五声音阶（宫商角徵羽）合成器，支持主岛田园 / 幽篁地牢 / 封印防线三套无缝切换的氛围 BGM。
       * - 实时响应「设置」里的 BGM / SFX 音量滑档，BGM 调至 0% 时自动停播省电；兼容浏览器与小游戏宿主。
       */


      BGM_PATTERNS = {
        // 主岛田园：温润古筝五声分解和弦（C 大调宫商角徵羽，舒缓治愈）
        overworld: {
          tempoMs: 560,
          notes: [523.25, 659.25, 783.99, 659.25, 587.33, 440.0, 523.25, 0, 587.33, 659.25, 880.0, 783.99, 659.25, 587.33, 523.25, 0],
          bass: [261.63, 0, 0, 0, 220.0, 0, 0, 0, 196.0, 0, 0, 0, 261.63, 0, 0, 0],
          wave: 'sine'
        },
        // 幽篁古墟：幽深羽调小五声脉冲（低沉神秘、富有探索节拍）
        dungeon: {
          tempoMs: 360,
          notes: [440.0, 0, 523.25, 587.33, 659.25, 0, 587.33, 523.25, 440.0, 392.0, 440.0, 0, 329.63, 392.0, 440.0, 0],
          bass: [110.0, 0, 110.0, 0, 130.81, 0, 146.83, 0, 110.0, 0, 98.0, 0, 110.0, 0, 110.0, 0],
          wave: 'triangle'
        },
        // 封印防线：紧凑战鼓与琵琶五声急奏（节奏感强、鼓舞守城）
        defense: {
          tempoMs: 280,
          notes: [587.33, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33, 659.25, 523.25, 587.33, 659.25, 783.99, 880.0, 0, 783.99, 659.25],
          bass: [146.83, 0, 146.83, 0, 130.81, 0, 146.83, 0, 110.0, 0, 130.81, 0, 146.83, 146.83, 196.0, 0],
          wave: 'triangle'
        }
      };

      _export("AudioManager", AudioManager = class AudioManager {
        constructor() {
          this._ctx = null;
          this._bgmTimer = null;
          this._bgmTheme = 'overworld';
          this._bgmStep = 0;
        }

        static get inst() {
          if (!this._inst) this._inst = new AudioManager();
          return this._inst;
        }

        get bgmVolume() {
          var _inst$saveData$settin, _inst;

          return (_inst$saveData$settin = (_inst = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst) == null || (_inst = _inst.saveData) == null ? void 0 : _inst.settings.bgmVolume) != null ? _inst$saveData$settin : 0.8;
        }

        get sfxVolume() {
          var _inst$saveData$settin2, _inst2;

          return (_inst$saveData$settin2 = (_inst2 = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst) == null || (_inst2 = _inst2.saveData) == null ? void 0 : _inst2.settings.sfxVolume) != null ? _inst$saveData$settin2 : 0.9;
        }

        setBgmVolume(v) {
          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return;
          const clamped = Math.max(0, Math.min(1, Math.round(v * 10) / 10));
          app.saveData.settings.bgmVolume = clamped;
          app.persist('settings_bgm');

          if (clamped <= 0.01) {
            this.stopBgm();
          } else if (!this._bgmTimer) {
            this.playBgm(this._bgmTheme);
          }
        }

        setSfxVolume(v) {
          const app = (_crd && GameApp === void 0 ? (_reportPossibleCrUseOfGameApp({
            error: Error()
          }), GameApp) : GameApp).inst;
          if (!(app != null && app.ready)) return;
          app.saveData.settings.sfxVolume = Math.max(0, Math.min(1, Math.round(v * 10) / 10));
          app.persist('settings_sfx');
        }

        _ensureContext() {
          try {
            var _AudioContext;

            const Ctx = (_AudioContext = globalThis.AudioContext) != null ? _AudioContext : globalThis.webkitAudioContext;
            if (!Ctx) return null;
            if (!this._ctx) this._ctx = new Ctx();
            if (this._ctx.state === 'suspended') void this._ctx.resume();
            return this._ctx;
          } catch {
            return null;
          }
        }
        /** 切换并播放对应场景的国风五声循环 BGM */


        playBgm(theme) {
          if (this._bgmTheme === theme && this._bgmTimer) return;
          this._bgmTheme = theme;
          this._bgmStep = 0;
          this.stopBgm();
          if (this.bgmVolume <= 0.01) return;

          const ctx = this._ensureContext();

          if (!ctx) return;
          const pat = BGM_PATTERNS[theme];
          this._bgmTimer = setInterval(() => {
            this._tickBgmNote(pat);
          }, pat.tempoMs);
        }

        stopBgm() {
          if (this._bgmTimer) {
            clearInterval(this._bgmTimer);
            this._bgmTimer = null;
          }
        }

        _tickBgmNote(pat) {
          const vol = this.bgmVolume;
          if (vol <= 0.01) return;

          const ctx = this._ensureContext();

          if (!ctx || ctx.state !== 'running') return;
          const idx = this._bgmStep % pat.notes.length;
          this._bgmStep += 1;
          const now = ctx.currentTime;
          const leadFreq = pat.notes[idx];

          if (leadFreq > 0) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = pat.wave;
            osc.frequency.setValueAtTime(leadFreq, now);
            const peak = 0.048 * vol;
            const dur = pat.tempoMs / 1000 * 1.35;
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(peak, now + 0.025);
            gain.gain.exponentialRampToValueAtTime(0.0008, now + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + dur + 0.03);
          }

          const bassFreq = pat.bass[idx];

          if (bassFreq > 0) {
            const bOsc = ctx.createOscillator();
            const bGain = ctx.createGain();
            bOsc.type = 'sine';
            bOsc.frequency.setValueAtTime(bassFreq, now);
            const bDur = pat.tempoMs / 1000 * 1.8;
            bGain.gain.setValueAtTime(0.001, now);
            bGain.gain.linearRampToValueAtTime(0.042 * vol, now + 0.03);
            bGain.gain.exponentialRampToValueAtTime(0.0008, now + bDur);
            bOsc.connect(bGain);
            bGain.connect(ctx.destination);
            bOsc.start(now);
            bOsc.stop(now + bDur + 0.03);
          }
        }
        /** 播放清脆国风五声音阶合成短音效 */


        playSfx(kind) {
          const vol = this.sfxVolume;
          if (vol <= 0.01) return;

          const ctx = this._ensureContext();

          if (!ctx) return;

          try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const freqMap = {
              tap: [523, 587, 0.07],
              plant: [440, 659, 0.11],
              harvest: [587, 880, 0.15],
              coin: [784, 1046, 0.14],
              boom: [160, 72, 0.22],
              hit: [330, 220, 0.08]
            };
            const [f0, f1, dur] = freqMap[kind];
            osc.type = kind === 'boom' ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(f0, now);
            osc.frequency.exponentialRampToValueAtTime(f1, now + dur);
            gain.gain.setValueAtTime(0.14 * vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + dur + 0.02);
          } catch {// 宿主不支持 WebAudio 时静默跳过
          }
        }

      });

      AudioManager._inst = null;

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=c3a2ca9d239633e3ab0dee2582431ad40a5b3f98.js.map