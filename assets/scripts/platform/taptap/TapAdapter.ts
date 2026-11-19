import { game, Game, sys } from 'cc';
import { IPlatformAdapter, IPlatformStorage, IPlatformTimeSource, AddToDesktopResult } from '../IPlatformAdapter';

/**
 * TapTap 小游戏适配（stub，阶段 0/5 逐步填充）。
 *
 * 铁律：所有 tap.* API 只允许出现在 platform/taptap/ 目录内；
 * 能力未接入时一律降级为与 Local 相同的引擎通用行为。
 *
 * 待真机实测并回写 docs/taptap/publishing.md：
 * - tap 端 storage 配额与清理行为（卸载/清缓存）
 * - 分包产物形态
 * - 震动 API 可用性
 */

/** tap.* 桌面小组件 API（developer.taptap.cn 小游戏开放能力「桌面文件夹」） */
interface TapGlobal {
    onHide?: (cb: () => void) => void;
    onShow?: (cb: () => void) => void;
    /** 查询桌面小组件是否已创建/本游戏是否置首（iOS 无 isPinned，仅 hasWidget 可参考） */
    hasHomeScreenWidgetAndPinned?: (opts: {
        success?: (res: { hasWidget?: boolean; isPinned?: boolean; errMsg?: string }) => void;
        fail?: (res: { errMsg?: string; errno?: number }) => void;
        complete?: () => void;
    }) => void;
    /** 创建桌面文件夹小组件并把本游戏置首；错误码 1518001-1518005 */
    createHomeScreenWidget?: (opts: {
        success?: (res: { errMsg?: string; errno?: number }) => void;
        fail?: (res: { errMsg?: string; errno?: number }) => void;
        complete?: () => void;
    }) => void;
}

function tapGlobal(): TapGlobal | undefined {
    return (globalThis as Record<string, unknown>).tap as TapGlobal | undefined;
}

/** 桌面小组件错误码 → 统一结果（官方错误表 developer.taptap.cn createHomeScreenWidget） */
function mapCreateErrno(errno: number | undefined): AddToDesktopResult {
    switch (errno) {
        case 1518002: return 'already';  // 重复添加
        case 1518003: return 'declined'; // 用户未授权
        default: return 'fail';          // 1518001 appId 无效 / 1518004 服务失败 / 1518005 未知
    }
}

class TapStorage implements IPlatformStorage {
    get(key: string): string | null {
        try {
            return sys.localStorage.getItem(key);
        } catch {
            return null;
        }
    }

    set(key: string, value: string): boolean {
        try {
            sys.localStorage.setItem(key, value);
            return true;
        } catch {
            return false;
        }
    }

    remove(key: string): void {
        try {
            sys.localStorage.removeItem(key);
        } catch {
            /* 忽略 */
        }
    }

    info(): { keys: string[]; totalSize: number } {
        // TODO 阶段 5：接入 tap.getStorageInfo（配额与已用量，写失败降级要用）
        return { keys: [], totalSize: 0 };
    }

    flush(): void {
        // TODO 阶段 5：确认 tap 运行时是否有 flush 语义
    }
}

export class TapAdapter implements IPlatformAdapter {
    readonly name = 'taptap';
    readonly storage = new TapStorage();
    readonly time: IPlatformTimeSource = { nowMs: () => Date.now() };

    /** 运行时探测：tap 全局对象存在（TapTap 小游戏容器注入）才启用本适配 */
    static detect(): boolean {
        return tapGlobal() !== undefined;
    }

    onHide(cb: () => void): void {
        const tap = tapGlobal();
        if (tap?.onHide) tap.onHide(cb);
        else game.on(Game.EVENT_HIDE, cb);
    }

    onShow(cb: () => void): void {
        const tap = tapGlobal();
        if (tap?.onShow) tap.onShow(cb);
        else game.on(Game.EVENT_SHOW, cb);
    }

    canAddToDesktop(): boolean {
        return typeof tapGlobal()?.createHomeScreenWidget === 'function';
    }

    addToDesktop(): Promise<AddToDesktopResult> {
        const tap = tapGlobal();
        if (!tap?.createHomeScreenWidget) return Promise.resolve('unsupported');

        return new Promise<AddToDesktopResult>((resolve) => {
            // SDK 可能永不回调：settled 守卫 + 10s 超时兜底，避免 Promise 悬挂卡死调用方
            let settled = false;
            const timer = setTimeout(() => { if (!settled) { settled = true; resolve('fail'); } }, 10000);
            const finish = (r: AddToDesktopResult): void => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(r);
            };
            // 先查询：已置首（Android 明确状态）直接免弹窗；iOS 无 isPinned，会走创建分支由 1518002 归并
            const query = tap.hasHomeScreenWidgetAndPinned;
            if (typeof query === 'function') {
                try {
                    query({
                        success: (res) => {
                            if (res.isPinned === true) { finish('already'); return; }
                            this._create(tap, finish);
                        },
                        fail: () => this._create(tap, finish), // 查询失败不拦截，直接尝试创建
                    });
                    return;
                } catch { /* 查询异常降级为直接创建 */ }
            }
            this._create(tap, finish);
        });
    }

    private _create(tap: TapGlobal, resolve: (r: AddToDesktopResult) => void): void {
        try {
            tap.createHomeScreenWidget!({
                success: () => resolve('added'),
                fail: (err) => resolve(mapCreateErrno(err?.errno)),
            });
        } catch {
            resolve('fail');
        }
    }
}
