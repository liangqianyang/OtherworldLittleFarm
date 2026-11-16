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

/** 添加到桌面结果（TapTap 审核必接能力，发布硬前置 docs/taptap/publishing.md） */
export type AddToDesktopResult =
    | 'added'       // 用户确认，已创建桌面快捷方式
    | 'already'     // 已添加过（或已在小组件列表首位）
    | 'declined'    // 用户拒绝授权（errno 1518003）
    | 'fail'        // 平台服务失败/未知错误
    | 'unsupported';// 当前运行时不支持

export interface IPlatformAdapter {
    readonly name: string;
    storage: IPlatformStorage;
    time: IPlatformTimeSource;
    /** 切后台（小游戏 onHide / Web EVENT_HIDE）——应用层注册存档与暂停 */
    onHide(cb: () => void): void;
    /** 回前台 */
    onShow(cb: () => void): void;
    /** 可选能力：是否支持「添加到桌面」（不支持时 UI 隐藏入口） */
    canAddToDesktop?(): boolean;
    /** 可选能力：发起添加到桌面；仅 canAddToDesktop()=true 时调用 */
    addToDesktop?(): Promise<AddToDesktopResult>;
}
