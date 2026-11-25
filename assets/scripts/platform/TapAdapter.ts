/**
 * 《异界小农场 2.0》阶段 0：TapTap 小游戏 / 微信容器 / Web 预览统一平台适配层
 * - 核心游戏逻辑不直接调用 tap / wx 全局对象，全部收敛在本文件。
 * - 自动识别运行环境：TapTap 小游戏 (`tap`) > 微信小游戏 (`wx`) > 浏览器 (`localStorage`) > 内存兜底。
 * - 内置 TapTap 提审必接能力 `addToDesktop()`（带防重入与 10 秒超时兜底）。
 */

import { game, Game, sys } from 'cc';
import type { IPlatformAdapter, IStorageAdapter } from '../core/SaveManager';

interface MiniGameGlobal {
    getStorageSync?(key: string): string;
    setStorageSync?(key: string, value: string): void;
    removeStorageSync?(key: string): void;
    onHide?(cb: () => void): void;
    onShow?(cb: () => void): void;
    addToDesktop?(opts: {
        success?: () => void;
        fail?: (err: unknown) => void;
    }): void;
}

function getMiniGameSdk(): { name: string; sdk: MiniGameGlobal } | null {
    const g = globalThis as unknown as { tap?: MiniGameGlobal; wx?: MiniGameGlobal };
    if (g.tap && typeof g.tap.getStorageSync === 'function') {
        return { name: 'taptap', sdk: g.tap };
    }
    if (g.wx && typeof g.wx.getStorageSync === 'function') {
        return { name: 'wechat', sdk: g.wx };
    }
    return null;
}

export class TapAdapter implements IPlatformAdapter {
    public readonly platformName: string;
    public readonly storage: IStorageAdapter;
    private readonly _sdk: MiniGameGlobal | null;
    private readonly _memFallback = new Map<string, string>();

    constructor() {
        const detected = getMiniGameSdk();
        this._sdk = detected ? detected.sdk : null;
        this.platformName = detected ? detected.name : 'web_local';

        this.storage = {
            getItem: (key: string): string | null => {
                try {
                    if (this._sdk?.getStorageSync) {
                        const val = this._sdk.getStorageSync(key);
                        return val === '' || val === undefined || val === null ? null : String(val);
                    }
                    if (sys.localStorage) {
                        return sys.localStorage.getItem(key);
                    }
                } catch (err) {
                    console.warn(`[TapAdapter] getItem("${key}") failed:`, err);
                }
                return this._memFallback.get(key) ?? null;
            },
            setItem: (key: string, value: string): void => {
                this._memFallback.set(key, value);
                try {
                    if (this._sdk?.setStorageSync) {
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
            removeItem: (key: string): void => {
                this._memFallback.delete(key);
                try {
                    if (this._sdk?.removeStorageSync) {
                        this._sdk.removeStorageSync(key);
                        return;
                    }
                    if (sys.localStorage) {
                        sys.localStorage.removeItem(key);
                    }
                } catch (err) {
                    console.warn(`[TapAdapter] removeItem("${key}") failed:`, err);
                }
            },
        };
    }

    public nowMs(): number {
        return Date.now();
    }

    public onHide(cb: () => void): void {
        if (this._sdk?.onHide) {
            this._sdk.onHide(cb);
        }
        game.on(Game.EVENT_HIDE, cb);
    }

    public onShow(cb: () => void): void {
        if (this._sdk?.onShow) {
            this._sdk.onShow(cb);
        }
        game.on(Game.EVENT_SHOW, cb);
    }

    /** TapTap 小游戏提审必接能力：添加到桌面（防 Promise 悬挂） */
    public addToDesktop(): Promise<boolean> {
        return new Promise((resolve) => {
            if (!this._sdk?.addToDesktop) {
                console.log('[TapAdapter] addToDesktop() not available in current preview environment.');
                resolve(false);
                return;
            }
            let settled = false;
            const finish = (ok: boolean) => {
                if (settled) return;
                settled = true;
                resolve(ok);
            };
            const timer = setTimeout(() => finish(false), 10_000);
            try {
                this._sdk.addToDesktop({
                    success: () => {
                        clearTimeout(timer);
                        finish(true);
                    },
                    fail: (err) => {
                        clearTimeout(timer);
                        console.warn('[TapAdapter] addToDesktop failed:', err);
                        finish(false);
                    },
                });
            } catch (err) {
                clearTimeout(timer);
                console.warn('[TapAdapter] addToDesktop threw:', err);
                finish(false);
            }
        });
    }
}
