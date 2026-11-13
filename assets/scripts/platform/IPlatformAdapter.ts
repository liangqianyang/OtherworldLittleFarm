/**
 * 平台适配接口 —— 核心逻辑触碰平台能力的唯一通道。
 *
 * 项目原则（README / game-design-draft.md §12）：
 * 核心逻辑只依赖本文件的两个接口，绝不直接 import 任何 tap.* API；
 * 实现可以是 Local（编辑器/Web 预览）或 Tap（TapTap 小游戏运行时）。
 */

/** 存储能力：分片、落盘、容量查询都从这里走 */
export interface IPlatformStorage {
    get(key: string): string | null;
    /** 写入，返回是否成功（失败时 SaveManager 走降级） */
    set(key: string, value: string): boolean;
    remove(key: string): void;
    info(): { keys: string[]; totalSize: number };
    /** 切后台强制落盘提示（web 实现为空操作） */
    flush(): void;
}

/** 时间源：核心逻辑一律经此取真实时间，不直接 Date.now() */
export interface IPlatformTimeSource {
    nowMs(): number;
}

export interface IPlatformAdapter {
    readonly name: string;
    storage: IPlatformStorage;
    time: IPlatformTimeSource;
    /** 切后台（小游戏 onHide / Web EVENT_HIDE）——应用层注册存档与暂停 */
    onHide(cb: () => void): void;
    /** 回前台 */
    onShow(cb: () => void): void;
}
