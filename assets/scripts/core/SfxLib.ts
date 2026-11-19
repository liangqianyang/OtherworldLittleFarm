import { EventBus } from './EventBus';

/**
 * SfxLib —— 8-bit 风格合成音效（§18 音频规范的最小实现）。
 *
 * 零素材成本：Web Audio 振荡器+噪声实时合成，与像素画风天然契合。
 * 不依赖平台私有 API：AudioContext 从全局取（Tap/微信环境注入同名全局即可适配）。
 * 音量设置面板二期（§18）；masterGain 默认 0.5，可经 setMasterGain 调整。
 */
export class SfxLib {
    private static _instance: SfxLib | null = null;
    static get inst(): SfxLib {
        if (!this._instance) this._instance = new SfxLib();
        return this._instance;
    }

    masterGain = 0.5;
    private _ctx: AudioContext | null = null;
    private _master: GainNode | null = null;
    private _muted = false;

    /** 惰性创建（必须在用户手势后才可用；首次 play 自动尝试） */
    private ensure(): AudioContext | null {
        if (this._ctx) return this._ctx;
        try {
            const AC = (globalThis as Record<string, unknown>)['AudioContext'] ?? (globalThis as Record<string, unknown>)['webkitAudioContext'];
            if (!AC) return null;
            this._ctx = new (AC as { new (): AudioContext })();
            this._master = this._ctx.createGain();
            this._master.gain.value = this.masterGain;
            this._master.connect(this._ctx.destination);
        } catch (e) {
            console.warn('[Sfx] AudioContext 创建失败', e);
            this._ctx = null;
        }
        return this._ctx;
    }

    setMuted(m: boolean): void {
        this._muted = m;
    }

    /** 主音量（0~1）；AudioContext 已创建时立即生效 */
    setMasterGain(v: number): void {
        this.masterGain = Math.max(0, Math.min(1, v));
        if (this._master) this._master.gain.value = this.masterGain;
    }

    get muted(): boolean {
        return this._muted;
    }

    /** 播放一个命名音效（未支持的名字静默忽略） */
    play(name: string): void {
        if (this._muted) return;
        const ctx = this.ensure();
        if (!ctx || !this._master) return;
        if (ctx.state === 'suspended') {
            void ctx.resume();
        }
        switch (name) {
            case 'plant': this._blip(220, 0.09, 'square'); break;
            case 'water': this._noise(0.22, 900); break;
            case 'harvest': this._blip(440, 0.09, 'triangle'); setTimeout(() => this._blip(880, 0.12, 'triangle'), 80); break;
            case 'coin': this._blip(988, 0.07, 'square'); setTimeout(() => this._blip(1319, 0.1, 'square'), 60); break;
            case 'hit': this._blip(110, 0.07, 'sawtooth'); break;
            case 'bite': this._blip(660, 0.06, 'square'); setTimeout(() => this._blip(660, 0.06, 'square'), 90); break;
            case 'win': this._arp([523, 659, 784], 0.11); break;
            case 'lose': this._arp([330, 262, 196], 0.14); break;
            case 'deny': this._blip(160, 0.12, 'square'); break;
            default: break;
        }
    }

    /** 单音：振荡器+衰减包络 */
    private _blip(freq: number, dur: number, type: OscillatorType): void {
        const ctx = this.ensure();
        if (!ctx || !this._master) return;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.value = freq;
        const t = ctx.currentTime;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.8, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(this._master);
        o.start(t);
        o.stop(t + dur + 0.02);
    }

    /** 琶音（上行=胜利 / 下行=失败） */
    private _arp(freqs: number[], step: number): void {
        freqs.forEach((f, i) => setTimeout(() => this._blip(f, step, 'square'), i * step * 1000));
    }

    /** 白噪声（浇水淅淅声）：短 buffer+带通 */
    private _noise(dur: number, cutoffHz: number): void {
        const ctx = this.ensure();
        if (!ctx || !this._master) return;
        const len = Math.floor(ctx.sampleRate * dur);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = cutoffHz;
        bp.Q.value = 0.8;
        const g = ctx.createGain();
        const t = ctx.currentTime;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.35, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(bp);
        bp.connect(g);
        g.connect(this._master);
        src.start(t);
    }

    /** 全局事件挂点（farmChanged 动作→音效；一次订阅终身有效） */
    bindEvents(): void {
        EventBus.inst.on('farmChanged', (p: { action: string }) => {
            switch (p.action) {
                case 'plant': this.play('plant'); break;
                case 'water': this.play('water'); break;
                case 'harvest': this.play('harvest'); break;
                case 'plant_offseason': this.play('deny'); break;
                case 'adventure_start': case 'adventure_move': break;
                case 'adventure_win': this.play('win'); break;
                case 'adventure_defeat': this.play('lose'); break;
                case 'defense_settled': break; // 胜负音效由 DefenseOverlay 自己发
                default: break;
            }
        }, null);
        EventBus.inst.on('itemGained', (p: { itemId: string }) => {
            if (p.itemId === 'gold') this.play('coin');
        }, null);
        EventBus.inst.on('itemSpent', (p: { itemId: string; fail?: boolean }) => {
            if (p.fail === true) this.play('deny'); // 仅消费失败响拒绝音；正常花钱不打扰
        }, null);
    }
}
