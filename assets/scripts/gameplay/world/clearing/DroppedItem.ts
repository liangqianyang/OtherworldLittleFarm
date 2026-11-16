import { _decorator, Component, Graphics, Color } from 'cc';
import { GameApp } from '../../../app/GameApp';
import { EventBus } from '../../../core/EventBus';
const { ccclass } = _decorator;

/**
 * DroppedItem —— 掉落物磁吸拾取表现（M2，migration-plan §3.7）。
 *
 * 从物件处弹出 → 每帧向玩家脚底加速吸附 → 距离<20px 或超时 2.5s → giveItem 入包 → 自毁。
 * 灰盒视觉：圆点按物品着色（木=棕/石=灰/果=红）。
 */
@ccclass('DroppedItem')
export class DroppedItem extends Component {
    private _itemId = '';
    private _count = 1;
    private _target: Node | null = null;
    private _t = 0;
    private _collected = false;

    init(itemId: string, count: number, target: Node, fromX: number, fromY: number): void {
        this._itemId = itemId;
        this._count = count;
        this._target = target;
        this.node.setPosition(fromX, fromY, 0);

        const g = this.node.addComponent(Graphics);
        const colors: Record<string, Color> = {
            wood: new Color(138, 106, 66, 255),
            stone: new Color(154, 160, 166, 255),
            berry: new Color(210, 74, 74, 255),
        };
        g.fillColor = colors[itemId] || new Color(255, 255, 255, 255);
        g.circle(0, 0, 9);
        g.fill();
        g.strokeColor = new Color(42, 31, 22, 255);
        g.lineWidth = 3;
        g.circle(0, 0, 9);
        g.stroke();
    }

    update(dt: number): void {
        if (this._collected) return;
        this._t += dt;
        const tp = this._target && this._target.isValid ? this._target.position : null;
        if (tp) {
            const p = this.node.position;
            const k = Math.min(1, dt * 4 + this._t * 1.2);
            const nx = p.x + (tp.x - p.x) * k;
            const ny = p.y + (tp.y - p.y) * k;
            this.node.setPosition(nx, ny, 0);
            const dx = tp.x - nx;
            const dy = tp.y - ny;
            if (dx * dx + dy * dy < 400) { this._collect(); return; }
        }
        if (this._t > 2.5) this._collect(); // 兜底：目标丢失/超时也入包（禁止静默丢奖励）
    }

    private _collect(): void {
        if (this._collected) return;
        this._collected = true;
        GameApp.inst?.giveItem(this._itemId, this._count);
        EventBus.inst.emit('farmChanged', { action: 'world_pickup' });
        this.node.destroy();
    }
}
