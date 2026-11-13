import { _decorator, Component, Node, Label, Graphics, Color, UITransform, EventTouch, UIOpacity } from 'cc';
import { AdventureSystem } from '../gameplay/adventure/AdventureSystem';

const { ccclass } = _decorator;

/**
 * BattlePanel —— 探险战斗面板（阶段 3 样板：点击互殴）。
 * 全屏半透明遮罩 + 战斗信息 + 「攻击」「撤退」按钮。
 * 战斗状态完全由 AdventureSystem.battle 驱动，本面板只做展示与点击转发。
 */
@ccclass('BattlePanel')
export class BattlePanel extends Component {
    private _g: Graphics = null!;
    private _info: Label = null!;
    private _log: Label = null!;
    private _attackBtn: Node = null!;
    private _fleeBtn: Node = null!;

    static create(parent: Node, layer: number): BattlePanel {
        const root = new Node('BattlePanel');
        root.layer = layer;
        root.addComponent(UITransform).setContentSize(1280, 720);
        const panel = root.addComponent(BattlePanel);
        parent.addChild(root);
        return panel;
    }

    onLoad(): void {
        this._g = this.node.addComponent(Graphics);
        // 全屏遮罩（吞点击）
        this._g.roundRect(-640, -360, 1280, 720, 0);
        this._g.fillColor = new Color(20, 12, 8, 200);
        this._g.fill();
        this.node.on(Node.EventType.TOUCH_START, (e: EventTouch) => e.propagationStopped = true, this);
        this.node.on(Node.EventType.TOUCH_END, (e: EventTouch) => e.propagationStopped = true, this);

        // 战斗框
        this._g.roundRect(-280, -60, 560, 320, 16);
        this._g.fillColor = new Color(46, 32, 24, 255);
        this._g.fill();
        this._g.strokeColor = new Color(242, 193, 78, 255);
        this._g.lineWidth = 3;
        this._g.stroke();

        this._info = this._makeLabel('战斗', 30, Color.WHITE, 0, 110);
        this._log = this._makeLabel('', 22, new Color(230, 210, 180), 0, 20);
        this._log.overflow = Label.Overflow.SHRINK;
        this._log.node.getComponent(UITransform)!.setContentSize(520, 120);

        this._attackBtn = this._button('攻 击', 60, -170, new Color(178, 60, 52), () => this._onAttack());
        this._fleeBtn = this._button('撤 退', 200, -170, new Color(90, 90, 100), () => this._onFlee());
        this._fleeBtn.setPosition(-60, -170);
        this._attackBtn.setPosition(60, -170);
    }

    /** 每帧同步战斗状态显示 */
    update(): void {
        const b = AdventureSystem.inst.battle;
        if (!b) return;
        this._info.string = `${b.monsterName}\nHP ${Math.max(0, b.hp)}/${b.maxHp}`;
    }

    show(): void {
        this.node.active = true;
        this._log.string = '';
    }

    private _onAttack(): void {
        const b = AdventureSystem.inst.battle;
        if (!b) return;
        const result = AdventureSystem.inst.playerAttack();
        if (result === 'win') {
            this._log.string = `击败了 ${b.monsterName}！战利品已入背包`;
            this.scheduleOnce(() => { this.node.active = false; }, 0.9);
        } else if (result === 'lose') {
            this._log.string = '你倒下了……丢失了一半收获，被送回农场';
            this.scheduleOnce(() => { this.node.active = false; }, 1.4);
        } else {
            const dodged = b.playerHp === AdventureSystem.inst.run!.playerHp && Math.random() < 2; // 日志展示用
            this._log.string = `造成伤害！${b.monsterName} 反击 -${b.damage}${dodged ? '' : ''}`;
        }
    }

    private _onFlee(): void {
        // 样板：撤退=放弃战斗（怪不追击），留在原房（可再进战）
        AdventureSystem.inst.battle = null;
        this.node.active = false;
    }

    private _makeLabel(str: string, size: number, color: Color, x: number, y: number): Label {
        const n = new Node(`lbl${y}`);
        n.layer = this.node.layer;
        n.setPosition(x, y);
        const l = n.addComponent(Label);
        l.string = str;
        l.fontSize = size;
        l.lineHeight = size + 8;
        l.color = color;
        this.node.addChild(n);
        return l;
    }

    private _button(text: string, x: number, y: number, bg: Color, cb: () => void): Node {
        const n = new Node(`btn${x}`);
        n.layer = this.node.layer;
        n.setPosition(x, y);
        const ut = n.addComponent(UITransform);
        ut.setContentSize(180, 60);
        const g = n.addComponent(Graphics);
        g.roundRect(-90, -30, 180, 60, 10);
        g.fillColor = bg;
        g.fill();
        g.strokeColor = Color.WHITE;
        g.lineWidth = 2;
        g.stroke();
        const l = n.addComponent(Label);
        l.string = text;
        l.fontSize = 26;
        l.color = Color.WHITE;
        n.on(Node.EventType.TOUCH_END, (e: EventTouch) => { e.propagationStopped = true; cb(); }, this);
        this.node.addChild(n);
        return n;
    }
}
