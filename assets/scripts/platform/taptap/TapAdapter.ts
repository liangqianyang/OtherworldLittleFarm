import { game, Game, sys } from 'cc';
import { IPlatformAdapter, IPlatformStorage, IPlatformTimeSource } from '../IPlatformAdapter';

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
interface TapGlobal {
    onHide?: (cb: () => void) => void;
    onShow?: (cb: () => void) => void;
}

function tapGlobal(): TapGlobal | undefined {
    return (globalThis as Record<string, unknown>).tap as TapGlobal | undefined;
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
}
