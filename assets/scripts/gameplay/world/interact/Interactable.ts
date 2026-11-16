import { _decorator, Component, Graphics, Color, EventTouch } from 'cc';
import type { ClearingSystem } from '../clearing/ClearingSystem';
import { InteractionManager } from './InteractionManager';
const { ccclass } = _decorator;

/**
 * Interactable —— 世界物件交互组件（M2 交互框架，migration-plan §3.6）。
 *
 * 灰盒视觉：tree=棕干+绿冠 / rock=灰石 / bush=绿丛红果；受击后按 hp 比例缩小重绘。
 * 交互入口：情境按钮 ContextButtonUI（唯一入口，走近才出现）；节点自身 TOUCH_END
 * 作为桌面调试的直达通道（真机触屏走按钮）。
 * 碰撞：由 ClearingSystem 写 TerrainData.heights=1 实现（格级阻挡，复活/清除自动还原）。
 */
@ccclass('Interactable')
export class Interactable extends Component {
    objId = '';
    kind: 'tree' | 'rock' | 'bush' = 'tree';
    label = '交互';
    range = 64;
    maxHp = 1;
    hp = 1;
    cleared = false;
    row: Record<string, unknown> | null = null;
    private _sys: ClearingSystem | null = null;
    private _g: Graphics | null = null;

    setup(row: Record<string, unknown>, sys: ClearingSystem): void {
        this.row = row;
        this.objId = String(row['id']);
        this.kind = row['type'] as 'tree' | 'rock' | 'bush';
        this.label = String(row['label'] ?? '交互');
        this.range = Number(row['range'] ?? 64);
        this.maxHp = this.hp = Number(row['hp'] ?? 1);
        this._sys = sys;
        this._g = this.node.getComponent(Graphics) || this.node.addComponent(Graphics);
        this.node.on(EventTouch.TOUCH_END, this._onTap, this);
        // ContextButtonUI → InteractionManager.dispatchCurrent → 本事件（情境按钮主通道）
        this.node.on('interact_use', this._onTap, this);
        InteractionManager.inst.register(this);
        this.redraw();
    }

    private _onTap(): void {
        if (!this.cleared && this._sys) this._sys.hit(this.objId);
    }

    /** hp 变化后重绘（ratio 0..1） */
    redraw(): void {
        if (!this._g) return;
        const g = this._g;
        g.clear();
        const ratio = Math.max(0, this.hp) / this.maxHp;
        const OUTLINE = new Color(42, 31, 22, 255);
        g.lineWidth = 3;
        if (this.kind === 'tree') {
            // 干
            g.fillColor = new Color(107, 74, 46, 255);
            g.rect(-7, 0, 14, 26);
            g.fill();
            g.strokeColor = OUTLINE;
            g.rect(-7, 0, 14, 26);
            g.stroke();
            // 冠（受损收缩）
            const r = 24 * (0.55 + 0.45 * ratio);
            g.fillColor = new Color(79, 138, 61, 255);
            g.circle(0, 40, r);
            g.fill();
            g.stroke();
            g.circle(0, 40, r);
        } else if (this.kind === 'rock') {
            const r = 16 * (0.72 + 0.28 * ratio);
            g.fillColor = new Color(141, 145, 153, 255);
            g.circle(0, 12, r);
            g.fill();
            g.strokeColor = OUTLINE;
            g.circle(0, 12, r);
            g.stroke();
            if (ratio < 0.7) { // 裂纹
                g.strokeColor = new Color(60, 62, 66, 255);
                g.moveTo(-r * 0.5, 12 + r * 0.4);
                g.lineTo(0, 12);
                g.lineTo(r * 0.4, 12 - r * 0.3);
                g.stroke();
            }
        } else { // bush
            g.fillColor = new Color(74, 122, 62, 255);
            g.circle(0, 10, 14);
            g.fill();
            g.strokeColor = OUTLINE;
            g.circle(0, 10, 14);
            g.stroke();
            g.fillColor = new Color(210, 74, 74, 255);
            g.circle(-5, 14, 3);
            g.fill();
            g.circle(4, 8, 3);
            g.fill();
            g.circle(0, 16, 3);
            g.fill();
        }
    }

    /** 交互进度文案：砍伐(2/3) */
    promptText(): string {
        return this.maxHp > 1 ? `${this.label}(${this.hp}/${this.maxHp})` : this.label;
    }
}
