import { game, Game, sys } from 'cc';
import { IPlatformAdapter, IPlatformStorage, IPlatformTimeSource } from './IPlatformAdapter';

/** 编辑器 / Web 预览的本地实现：sys.localStorage（引擎在小游戏运行时也提供同接口） */
class LocalStorage implements IPlatformStorage {
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
        // Web localStorage 无容量 API；Tap 侧实现再补 getStorageInfo
        return { keys: [], totalSize: 0 };
    }

    flush(): void {
        // Web 立即持久化，无需 flush
    }
}

export class LocalAdapter implements IPlatformAdapter {
    readonly name = 'local';
    readonly storage = new LocalStorage();
    readonly time: IPlatformTimeSource = { nowMs: () => Date.now() };

    onHide(cb: () => void): void {
        game.on(Game.EVENT_HIDE, cb);
    }

    onShow(cb: () => void): void {
        game.on(Game.EVENT_SHOW, cb);
    }
}
