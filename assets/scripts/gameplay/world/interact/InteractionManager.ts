import { EventBus } from '../../../core/EventBus';
import type { Interactable } from './Interactable';

/**
 * InteractionManager —— 世界情境交互中枢（M2，migration-plan §3.6）。
 *
 * 每帧 tick(玩家脚底)：范围内最近的未清除物件 → 发 interactPromptChanged（变化才发）。
 * dispatchCurrent()：ContextButtonUI 点击转发 → 触发当前物件交互（ClearingSystem.hit）。
 * suppress(open)：全屏面板/夜战时压掉提示（验收④）。
 * 纯逻辑单例（非 Component），由 WorldSpike.update 驱动 tick。
 */
export class InteractionManager {
    private static _inst: InteractionManager | null = null;
    static get inst(): InteractionManager {
        if (!this._inst) this._inst = new InteractionManager();
        return this._inst;
    }

    private _objs: Interactable[] = [];
    private _current: Interactable | null = null;
    private _px = 0;
    private _py = 0;
    private _suppressed = false;
    private _lastKey = '';

    register(o: Interactable): void {
        if (this._objs.indexOf(o) < 0) this._objs.push(o);
    }

    unregister(o: Interactable): void {
        const i = this._objs.indexOf(o);
        if (i >= 0) this._objs.splice(i, 1);
        if (this._current === o) this._setCurrent(null);
    }

    /** 全屏面板/战斗时压掉情境按钮 */
    suppress(open: boolean): void {
        if (this._suppressed === open) return;
        this._suppressed = open;
        this._push(this._suppressed ? null : this._current);
    }

    get suppressed(): boolean { return this._suppressed; }

    get current(): Interactable | null {
        return this._suppressed ? null : this._current;
    }

    /** 范围校验（直达点按通道用；与 tick 的判定一致） */
    inRange(o: Interactable): boolean {
        const p = o.node.position;
        const dx = p.x - this._px, dy = p.y - this._py;
        return dx * dx + dy * dy <= o.range * o.range;
    }

    /** 每帧：找范围内最近可交互物件 */
    tick(px: number, py: number): void {
        this._px = px; this._py = py;
        if (this._suppressed) return;
        let best: Interactable | null = null;
        let bestD = Infinity;
        for (const o of this._objs) {
            if (o.cleared || !o.node.activeInHierarchy) continue;
            const p = o.node.position;
            const dx = p.x - px;
            const dy = p.y - py;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d <= o.range && d < bestD) { best = o; bestD = d; }
        }
        if (best !== this._current) this._setCurrent(best);
    }

    /** ContextButtonUI 点击转发 */
    dispatchCurrent(): void {
        const o = this.current;
        if (!o) return;
        o.node.emit('interact_use', o.objId);
    }

    /** 物件状态变化后强制刷新当前提示（进度文案） */
    refreshPrompt(): void {
        if (this._current) this._push(this._current);
    }

    private _setCurrent(o: Interactable | null): void {
        this._current = o;
        this._push(o);
    }

    private _push(o: Interactable | null): void {
        const payload = o ? { objId: o.objId, label: o.promptText(), wx: o.node.position.x, wy: o.node.position.y } : null;
        const key = payload ? payload.objId + '|' + payload.label : '';
        if (key === this._lastKey) return;
        this._lastKey = key;
        EventBus.inst.emit('interactPromptChanged', payload);
    }
}
