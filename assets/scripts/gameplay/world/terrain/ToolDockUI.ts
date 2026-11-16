import { _decorator, Component, Node, Graphics, Label, Color, UITransform, Layers } from 'cc';
import { TerrainEdit, ToolId } from './TerrainEdit';
import { TerrainData } from '../TerrainData';
const { ccclass } = _decorator;

/**
 * M3 地形工具坞（terrain-system §6.1，触屏适配版）：
 * - 底部横排 5 槽（76px 槽，底部居中——世界模式左半屏是摇杆区，避开设计稿的左下角）。
 * - 顶部右侧状态条：当前工具+单价+材料警告。
 * - 只在玩家进入庭院区时显示（WorldSpike.update 驱动 setVisible）。
 */
const SLOT = 76;
const GAP = 10;
const TOOLS: { id: ToolId; label: string }[] = [
    { id: 'hoe', label: '锄' },
    { id: 'shovel', label: '铲' },
    { id: 'paver', label: '铺' },
    { id: 'hammer', label: '桥' },
    { id: 'stairs', label: '梯' },
];

@ccclass('ToolDockUI')
export class ToolDockUI extends Component {
    private _edit: TerrainEdit | null = null;
    private _slots: Node[] = [];
    private _labels: Label[] = [];
    private _status: Label | null = null;
    private _invRef: Record<string, number> | null = null;

    static create(parent: Node, edit: TerrainEdit, inv: Record<string, number>): ToolDockUI {
        const root = new Node('ToolDock');
        root.layer = 1 << 24;   // SCREEN_UI（UICamera visibility，与摇杆一致）
        const ut = root.addComponent(UITransform);
        ut.setContentSize(5 * SLOT + 4 * GAP, SLOT + 16);
        parent.addChild(root);
        const c = root.addComponent(ToolDockUI);
        c._edit = edit;
        c._invRef = inv;
        c._build();
        return c;
    }

    private _build(): void {
        const total = 5 * SLOT + 4 * GAP;
        for (let k = 0; k < TOOLS.length; k++) {
            const x = -total / 2 + SLOT / 2 + k * (SLOT + GAP);
            const slot = this._makeSlot(TOOLS[k], x);
            this._slots.push(slot);
        }
        // 撤销按钮（第 6 槽）
        const undoSlot = this._makeSlot({ id: '__undo' as ToolId, label: '↩' }, total / 2 + SLOT / 2 + GAP);
        undoSlot.setScale(0.85, 0.85, 1);
        // 状态条（顶部右侧 320×56）
        const st = new Node('status');
        st.layer = this.node.layer;
        st.addComponent(UITransform).setContentSize(340, 56);
        st.setPosition(300, 292, 0);
        this.node.addChild(st);
        const g = st.addComponent(Graphics);
        g.roundRect(-170, -28, 340, 56, 10);
        g.fillColor = new Color(20, 22, 34, 215);
        g.fill();
        g.strokeColor = new Color(242, 193, 78, 255);
        g.lineWidth = 2;
        g.stroke();
        const ln = new Node('lbl');
        ln.layer = st.layer;
        ln.addComponent(UITransform).setContentSize(330, 48);
        st.addChild(ln);
        this._status = ln.addComponent(Label);
        this._status.fontSize = 20;
        this._status.lineHeight = 24;
        this._status.color = new Color(235, 235, 235, 255);
        this._status.horizontalAlign = Label.HorizontalAlign.CENTER;
        this._status.verticalAlign = Label.VerticalAlign.CENTER;
        this._status.overflow = Label.Overflow.SHRINK;
        this._status.string = '';
        this.refreshStatus();
    }

    private _makeSlot(tool: { id: ToolId; label: string }, x: number): Node {
        const slot = new Node(`slot_${tool.id}`);
        slot.layer = this.node.layer;
        slot.addComponent(UITransform).setContentSize(SLOT, SLOT);
        slot.setPosition(x, -8, 0);
        this.node.addChild(slot);
        const g = slot.addComponent(Graphics);
        const paint = (sel: boolean) => {
            g.clear();
            g.roundRect(-SLOT / 2, -SLOT / 2, SLOT, SLOT, 12);
            g.fillColor = sel ? new Color(242, 193, 78, 235) : new Color(20, 22, 34, 205);
            g.fill();
            g.strokeColor = sel ? new Color(255, 236, 160, 255) : new Color(242, 193, 78, 160);
            g.lineWidth = sel ? 4 : 2;
            g.stroke();
        };
        paint(false);
        const ln = new Node('lbl');
        ln.layer = slot.layer;
        ln.addComponent(UITransform).setContentSize(SLOT - 8, SLOT - 8);
        slot.addChild(ln);
        const l = ln.addComponent(Label);
        l.fontSize = 30;
        l.lineHeight = 34;
        l.color = new Color(235, 235, 235, 255);
        l.horizontalAlign = Label.HorizontalAlign.CENTER;
        l.verticalAlign = Label.VerticalAlign.CENTER;
        l.overflow = Label.Overflow.SHRINK;
        l.string = tool.label;
        this._labels.push(l);
        slot.on(Node.EventType.TOUCH_END, () => {
            if (tool.id === '__undo' as ToolId) {
                const inv = this._invRef!;
                if (this._edit!.undo(inv)) {
                    l.string = '↩';
                    this.refreshStatus();
                }
                return;
            }
            const cur = this._edit!.tool;
            this._edit!.selectTool(cur === tool.id ? null : tool.id);
            this._repaint();
        }, this);
        (slot as unknown as { _paint: (sel: boolean) => void })._paint = paint;
        return slot;
    }

    private _repaint(): void {
        const cur = this._edit!.tool;
        for (let k = 0; k < this._slots.length; k++) {
            const paint = (this._slots[k] as unknown as { _paint: (sel: boolean) => void })._paint;
            paint(TOOLS[k] && cur === TOOLS[k].id);
        }
        this.refreshStatus();
    }

    /** 状态条刷新（选工具/库存变化时调用；每秒一次也安全）。 */
    refreshStatus(): void {
        if (!this._status || !this._edit) return;
        const t = this._edit.tool;
        if (!t) { this._status.string = '选择工具改造庭院'; return; }
        const name: Record<ToolId, string> = { hoe: '锄头·开垦', shovel: '铲子·拆除(返还50%)', paver: '铺装器·石板/平台', hammer: '造桥锤', stairs: '台阶锹' };
        const inv = this._invRef!;
        const costStr = (): string => {
            if (t === 'hoe') return '免费';
            if (t === 'shovel') return '免费·返还50%';
            const d = TerrainData.inst;
            if (!d) return '';
            const probe = this._edit!.costOf(t, false);
            const probeW = this._edit!.costOf(t, true);
            const fmt = (cs: { itemId: string; count: number }[]) => cs.map(c => `${c.count === 1 ? '' : c.count + '×'}${c.itemId === 'gold' ? '金' : c.itemId === 'stone' ? '石' : '木'}${(inv[c.itemId] ?? 0) < c.count ? '⚠' : ''}`).join('+');
            if (t === 'paver' && probeW.length > 0 && probe.length > 0) return `水面:${fmt(probeW)} 陆地:${fmt(probe)}`;
            return fmt(probe);
        };
        this._status.string = `${name[t]}  ${costStr()}`;
    }

    setVisible(v: boolean): void {
        if (this.node.active !== v) this.node.active = v;
    }
}
