import { _decorator, Component, Graphics, Color, Node, Sprite, UITransform } from 'cc';
import { GameApp } from '../../../app/GameApp';
import { EventBus } from '../../../core/EventBus';
import { SpriteLib } from '../../../core/SpriteLib';
const { ccclass } = _decorator;

/**
 * DroppedItem —— 掉落物磁吸拾取表现（M2，migration-plan §3.7）。
 *
 * 从物件处弹出 → 每帧向玩家脚底加速吸附 → 距离<20px 或超时 2.5s → giveItem 入包 → 自毁。
 * 视觉：SpriteLib 有对应图标时挂贴图（wood_log/berry/herb/gel），否则圆点色块兜底（石=灰）。
 */
@ccclass('DroppedItem')
export class DroppedItem extends Component {
    private _itemId = '';
    private _count = 1;
    private _target: Node | null = null;
    private _t = 0;
    private _collected = false;

    /** 掉落物图标映射（itemId 子串 → SpriteLib 键；无命中保持色块圆点） */
    private static readonly ICON_OF: Record<string, string> = {
        wood: 'adventure/wood_log',
        berry: 'ui/icon_berry',
        herb: 'adventure/herb_patch',
        gel: 'ui/icon_gel',
        carrot: 'ui/icon_carrot',
        tomato: 'ui/icon_tomato',
        pumpkin: 'ui/icon_pumpkin',
        moonflower: 'ui/icon_moonflower',
    };

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

        // 贴图升级：命中映射且 SpriteLib 就绪 → 挂 20px 图标，清掉色块圆点
        const iconKey = Object.keys(DroppedItem.ICON_OF).find((k) => itemId.includes(k));
        const sf = iconKey ? SpriteLib.inst.get(DroppedItem.ICON_OF[iconKey]) : null;
        if (sf) {
            const sprN = new Node('icon');
            sprN.layer = this.node.layer;
            sprN.addComponent(UITransform).setContentSize(20, 20);
            this.node.addChild(sprN);
            const sp = sprN.addComponent(Sprite);
            sp.sizeMode = Sprite.SizeMode.CUSTOM;
            sp.spriteFrame = sf;
            g.clear();
        }
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
