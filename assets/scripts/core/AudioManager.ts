/**
 * 《异界小农场 2.0》V1.2：国风五声自适应 BGM 与交互音效管理器
 * - 零包体占用：内置 WebAudio 五声音阶（宫商角徵羽）合成器，支持主岛田园 / 幽篁地牢 / 封印防线三套无缝切换的氛围 BGM。
 * - 实时响应「设置」里的 BGM / SFX 音量滑档，BGM 调至 0% 时自动停播省电；兼容浏览器与小游戏宿主。
 */

import { GameApp } from '../app/GameApp';

export type SfxKind = 'tap' | 'plant' | 'harvest' | 'coin' | 'boom' | 'hit';
export type BgmTheme = 'overworld' | 'dungeon' | 'defense';

interface BgmPattern {
    tempoMs: number;
    notes: number[];
    bass: number[];
    wave: OscillatorType;
}

const BGM_PATTERNS: Record<BgmTheme, BgmPattern> = {
    // 主岛田园：温润古筝五声分解和弦（C 大调宫商角徵羽，舒缓治愈）
    overworld: {
        tempoMs: 560,
        notes: [523.25, 659.25, 783.99, 659.25, 587.33, 440.0, 523.25, 0, 587.33, 659.25, 880.0, 783.99, 659.25, 587.33, 523.25, 0],
        bass: [261.63, 0, 0, 0, 220.0, 0, 0, 0, 196.0, 0, 0, 0, 261.63, 0, 0, 0],
        wave: 'sine',
    },
    // 幽篁古墟：幽深羽调小五声脉冲（低沉神秘、富有探索节拍）
    dungeon: {
        tempoMs: 360,
        notes: [440.0, 0, 523.25, 587.33, 659.25, 0, 587.33, 523.25, 440.0, 392.0, 440.0, 0, 329.63, 392.0, 440.0, 0],
        bass: [110.0, 0, 110.0, 0, 130.81, 0, 146.83, 0, 110.0, 0, 98.0, 0, 110.0, 0, 110.0, 0],
        wave: 'triangle',
    },
    // 封印防线：紧凑战鼓与琵琶五声急奏（节奏感强、鼓舞守城）
    defense: {
        tempoMs: 280,
        notes: [587.33, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33, 659.25, 523.25, 587.33, 659.25, 783.99, 880.0, 0, 783.99, 659.25],
        bass: [146.83, 0, 146.83, 0, 130.81, 0, 146.83, 0, 110.0, 0, 130.81, 0, 146.83, 146.83, 196.0, 0],
        wave: 'triangle',
    },
};

export class AudioManager {
    private static _inst: AudioManager | null = null;
    private _ctx: AudioContext | null = null;
    private _bgmTimer: ReturnType<typeof setInterval> | null = null;
    private _bgmTheme: BgmTheme = 'overworld';
    private _bgmStep = 0;

    public static get inst(): AudioManager {
        if (!this._inst) this._inst = new AudioManager();
        return this._inst;
    }

    public get bgmVolume(): number {
        return GameApp.inst?.saveData?.settings.bgmVolume ?? 0.8;
    }

    public get sfxVolume(): number {
        return GameApp.inst?.saveData?.settings.sfxVolume ?? 0.9;
    }

    public setBgmVolume(v: number): void {
        const app = GameApp.inst;
        if (!app?.ready) return;
        const clamped = Math.max(0, Math.min(1, Math.round(v * 10) / 10));
        app.saveData.settings.bgmVolume = clamped;
        app.persist('settings_bgm');
        if (clamped <= 0.01) {
            this.stopBgm();
        } else if (!this._bgmTimer) {
            this.playBgm(this._bgmTheme);
        }
    }

    public setSfxVolume(v: number): void {
        const app = GameApp.inst;
        if (!app?.ready) return;
        app.saveData.settings.sfxVolume = Math.max(0, Math.min(1, Math.round(v * 10) / 10));
        app.persist('settings_sfx');
    }

    private _ensureContext(): AudioContext | null {
        try {
            const Ctx = (globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
                ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!Ctx) return null;
            if (!this._ctx) this._ctx = new Ctx();
            if (this._ctx.state === 'suspended') void this._ctx.resume();
            return this._ctx;
        } catch {
            return null;
        }
    }

    /** 切换并播放对应场景的国风五声循环 BGM */
    public playBgm(theme: BgmTheme): void {
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

    public stopBgm(): void {
        if (this._bgmTimer) {
            clearInterval(this._bgmTimer);
            this._bgmTimer = null;
        }
    }

    private _tickBgmNote(pat: BgmPattern): void {
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
            const dur = (pat.tempoMs / 1000) * 1.35;
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
            const bDur = (pat.tempoMs / 1000) * 1.8;
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
    public playSfx(kind: SfxKind): void {
        const vol = this.sfxVolume;
        if (vol <= 0.01) return;
        const ctx = this._ensureContext();
        if (!ctx) return;

        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            const freqMap: Record<SfxKind, [number, number, number]> = {
                tap: [523, 587, 0.07],
                plant: [440, 659, 0.11],
                harvest: [587, 880, 0.15],
                coin: [784, 1046, 0.14],
                boom: [160, 72, 0.22],
                hit: [330, 220, 0.08],
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
        } catch {
            // 宿主不支持 WebAudio 时静默跳过
        }
    }
}
