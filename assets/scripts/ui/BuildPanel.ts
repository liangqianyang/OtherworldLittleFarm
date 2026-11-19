/**
 * BuildPanel —— 封印布置面板（白天，防守区入口交互打开）。
 *
 * 灰盒版战斗网格镜像：选塔（4 作物塔，金币不足置灰）→ 点建造格落塔；
 * 点已有塔 → 升级（有 lv2 时）/ 拆除（返 60%）；祭坛破损时出现「修复祭坛」按钮。
 * 全部操作走 DefenseSystem（扣金币 + seal 落档 + farmChanged 事件）。
 */
import { _decorator, Component, Node, Graphics, Label, Color, UITransform, EventTouch, Vec3 } from 'cc';
import { DataManager } from '../core/DataManager';
import { GameApp } from '../app/GameApp';
import { EventBus } from '../core/EventBus';
import { DefenseSystem } from '../gameplay/defense/DefenseSystem';
import { resolveMap, cellToPx, ResolvedMap } from '../gameplay/defense/DefenseCore';

const { ccclass } = _decorator;

const GOLD = new Color(242, 193, 78, 255);
const COL_PANEL = new Color(26, 28, 44, 255);
const COL_GRID_OK = new Color(90, 130, 90, 90);
const COL_GRID_PATH = new Color(70, 60, 56, 120);

const TOWER_IDS = ['frostbell', 'honeyplot', 'spikepumpkin', 'podgun'];

/** 防守 kind → 中文（塔种列展示） */
const KIND_NAME: Record<string, string> = { slow: '减速', attract: '诱饵', spike: '范围', pod: '单体' };

@ccclass('BuildPanel')
export class BuildPanel extends Component {
    private static _inst: BuildPanel | null = null;
    static get inst(): BuildPanel | null { return this._inst; }

    private _map!: ResolvedMap;
    private _field!: Node;
    private _fieldG!: Graphics;
    private _goldLbl!: Label;
    private _tipLbl!: Label;
    private _entrLbls: Record<string, Label> = {};   // 入口标注（P1-7：怪来向在板上直接可读）
    private _sel = -1;               // 选中的塔（TOWER_IDS 下标，-1 未选）
    private _selNodes: Node[] = [];
    private _towerMarks = new Map<string, Node>();   // `${cx},${cy}` → 标记节点
    private _closeBtn!: Node;
    private _repairBtn!: Node;
    private _fieldBound = false;
    private _S = 48;               // 镜像每格 px = 720/cols（open 时按地图计算）
    private _k = 0.75;             // 世界 px → 镜像缩放 = S/cellPx
    private _W = 720;
    private _H = 432;

    static create(parent: Node, layer: number): BuildPanel {
        const root = new Node('BuildPanel');
        root.layer = layer;
        root.addComponent(UITransform).setContentSize(1280, 720);
        parent.addChild(root);
        const p = root.addComponent(BuildPanel);
        this._inst = p;
        root.active = false;
        return p;
    }

    onLoad(): void {
        const g = this.node.addComponent(Graphics);
        // 背板
        g.fillColor = new Color(0, 0, 0, 170);
        g.rect(-640, -360, 1280, 720); g.fill();
        g.fillColor = COL_PANEL;
        g.roundRect(-470, -330, 940, 620, 14); g.fill();
        g.strokeColor = GOLD; g.lineWidth = 3;
        g.roundRect(-470, -330, 940, 620, 14); g.stroke();

        this._title('封 印 布 置', 0, 268, 34);
        this._goldLbl = this._label(0, 226, 400, '', 22, GOLD);
        this._tipLbl = this._label(0, -306, 880, '怪从西(A)/北(B)入口来 → 选右侧塔种点绿格建造；点已有塔升级/拆除', 18, new Color(200, 200, 200, 255));

        // 战场镜像：格区宽固定 720，每格 px 由地图 cols/rows 推导（open 时计算），右侧留 200 宽塔种列
        this._field = new Node('field');
        this._field.layer = this.node.layer;
        this._field.addComponent(UITransform).setContentSize(720, 432);
        this._field.setPosition(-95, -20);
        this.node.addChild(this._field);
        this._fieldG = this._field.addComponent(Graphics);
        // 入口标注（A 西线 / B 北线；open() 时按地图 waypoints 定位）
        for (const line of ['A', 'B']) {
            this._entrLbls[line] = this._label(0, 0, 160, '', 15,
                line === 'A' ? new Color(230, 150, 120, 255) : new Color(130, 170, 235, 255));
        }

        // 塔种列（右侧 200×432）
        this._buildTowerList();
        // 修复祭坛按钮
        this._repairBtn = this._textButton(320, -250, 150, 56, '修复祭坛', () => {
            const r = DefenseSystem.inst.repairAltar();
            this._tipLbl.string = r.ok ? '祭坛已修复如初' : r.reason === 'poor' ? '金币不够（20 金）' : '祭坛完好无需修复';
            if (r.ok) this._refresh();
        });
        // 关闭
        this._closeBtn = this._textButton(408, 268, 88, 52, '×', () => this.close());
    }

    // ---------- 打开/关闭 ----------

    open(): void {
        const mapRow = DataManager.inst.getRows('catalogs/defense_maps').find((x) => x['id'] === 'seal_1');
        if (!mapRow) return;
        this._map = resolveMap(mapRow as unknown as Parameters<typeof resolveMap>[0]);
        const def = this._map.def;
        this._S = 720 / def.cols;
        this._k = this._S / def.cellPx;
        this._W = 720;
        this._H = def.rows * this._S;
        this._field.getComponent(UITransform)!.setContentSize(this._W, this._H);
        this._placeEntranceLabels();
        this._sel = -1;
        this.node.active = true;
        this._refresh();
    }

    close(): void {
        this.node.active = false;
        EventBus.inst.emit('farmChanged', { action: 'build_closed' });
    }

    // ---------- 刷新 ----------

    private _refresh(): void {
        const inv = GameApp.inst?.inventory ?? {};
        this._goldLbl.string = `金币 ${inv['gold'] ?? 0}`;
        const seal = DefenseSystem.inst.seal();
        this._repairBtn.active = seal.altarHp < 100;
        this._drawGrid();
        this._drawTowerMarks();
        this._drawTowerList();
    }

    private _drawGrid(): void {
        const g = this._fieldG;
        const def = this._map.def;
        const S = this._S, W = this._W, H = this._H;
        g.clear();
        g.fillColor = new Color(18, 20, 36, 255);
        g.rect(-W / 2, -H / 2, W, H); g.fill();
        for (const cell of this._map.buildable) {
            const cx = cell % def.cols, cy = Math.floor(cell / def.cols);
            g.fillColor = COL_GRID_OK;
            g.rect(-W / 2 + cx * S + 2, H / 2 - (cy + 1) * S + 2, S - 4, S - 4);
            g.fill();
        }
        g.fillColor = COL_GRID_PATH;
        for (const line of Object.keys(def.paths)) {
            for (const [cx, cy] of def.paths[line]) {
                g.rect(-W / 2 + cx * S + 2, H / 2 - (cy + 1) * S + 2, S - 4, S - 4);
                g.fill();
            }
        }
        // 祭坛：由 altarCells 包围盒推导（不写死格坐标）
        const ax0 = Math.min(...def.altarCells.map(c => c[0]));
        const ay0 = Math.min(...def.altarCells.map(c => c[1]));
        const ax1 = Math.max(...def.altarCells.map(c => c[0])) + 1;
        const ay1 = Math.max(...def.altarCells.map(c => c[1])) + 1;
        g.fillColor = new Color(196, 164, 84, 200);
        g.rect(-W / 2 + ax0 * S + 2, H / 2 - ay1 * S + 2, (ax1 - ax0) * S - 4, (ay1 - ay0) * S - 4);
        g.fill();
        // 入口三角标（P1-7 可读性：怪从哪来在板上直接可读；A=西红 B=北蓝）
        const ENTR_COL: Record<string, Color> = { A: new Color(220, 90, 70, 255), B: new Color(90, 140, 230, 255) };
        for (const line of ['A', 'B']) {
            const wps = def.paths[line];
            if (!wps || wps.length === 0) continue;
            const [ecx, ecy] = wps[0];
            const ex = -W / 2 + ecx * S + S / 2, ey = H / 2 - ecy * S - S / 2;
            g.fillColor = ENTR_COL[line];
            g.moveTo(ex, ey - 10); g.lineTo(ex - 9, ey + 6); g.lineTo(ex + 9, ey + 6); g.close(); g.fill();
        }
    }

    /** 入口文字标注定位（field 本地 → 面板本地；A 标上方、B 标下方防重叠） */
    private _placeEntranceLabels(): void {
        const def = this._map.def;
        const fx = this._field.position.x, fy = this._field.position.y;
        for (const line of ['A', 'B']) {
            const l = this._entrLbls[line];
            if (!l) continue;
            const wps = def.paths[line];
            if (!wps || wps.length === 0) { l.string = ''; continue; }
            const [ecx, ecy] = wps[0];
            const x = fx - this._W / 2 + ecx * this._S + this._S / 2;
            const y = fy + this._H / 2 - ecy * this._S - this._S / 2 + (line === 'A' ? 26 : -26);
            l.node.setPosition(x, y);
            l.string = line === 'A' ? 'A·西线入口' : 'B·北线入口';
        }
    }

    /** 点格命中（field 本地坐标） */
    private _cellAt(localX: number, localY: number): { cx: number; cy: number } | null {
        const S = this._S, def = this._map.def;
        const cx = Math.floor((localX + this._W / 2) / S);
        const cy = Math.floor((this._H / 2 - localY) / S);
        if (cx < 0 || cy < 0 || cx >= def.cols || cy >= def.rows) return null;
        return { cx, cy };
    }

    private _drawTowerMarks(): void {
        for (const n of this._towerMarks.values()) n.destroy();
        this._towerMarks.clear();
        const seal = DefenseSystem.inst.seal();
        const def = this._map.def;
        const cx0 = def.originX + def.cols * def.cellPx / 2;
        const cy0 = def.originY - def.rows * def.cellPx / 2;
        for (const t of seal.towers) {
            const n = new Node(`m_${t.cx}_${t.cy}`);
            n.layer = this.node.layer;
            const [wx, wy] = cellToPx(def, t.cx, t.cy);
            // 世界像素 → field 本地（中心对齐 + 镜像缩放 k）
            n.setPosition((wx - cx0) * this._k, (wy - cy0) * this._k);
            this._field.addChild(n);
            const g = n.addComponent(Graphics);
            const col = t.cropId === 'frostbell' ? new Color(120, 200, 230, 255)
                : t.cropId === 'honeyplot' ? new Color(240, 200, 90, 255)
                : t.cropId === 'spikepumpkin' ? new Color(230, 140, 70, 255)
                : new Color(140, 210, 140, 255);
            g.fillColor = col;
            g.circle(0, 0, t.lv >= 2 ? 22 : 17); g.fill();
            g.strokeColor = new Color(0, 0, 0, 140); g.lineWidth = 2;
            g.circle(0, 0, t.lv >= 2 ? 22 : 17); g.stroke();
            n.on(Node.EventType.TOUCH_END, () => this._onTowerTap(t.cx, t.cy));
            this._towerMarks.set(`${t.cx},${t.cy}`, n);
        }
        // 空格点击层（field 级；子节点（塔标记）触碰时不重复处理）
        if (!this._fieldBound) {
            this._fieldBound = true;
            this._field.on(Node.EventType.TOUCH_END, (ev: EventTouch) => {
                if (ev.target !== this._field) return;   // 塔标记自己处理
                const p = ev.getUILocation();
                // field 世界偏移：读节点实际 position（不写死）
                const fp = this._field.position;
                const localX = p.x - 640 - fp.x;
                const localY = p.y - 360 - fp.y;
                const cell = this._cellAt(localX, localY);
                if (cell) this._onCellTap(cell.cx, cell.cy);
            });
        }
    }

    private _onCellTap(cx: number, cy: number): void {
        if (this._sel < 0) { this._tipLbl.string = '先在右侧选一种塔'; return; }
        const cropId = TOWER_IDS[this._sel];
        const r = DefenseSystem.inst.placeTower(cropId, cx, cy);
        if (r.ok) {
            this._tipLbl.string = '建造完成';
            this._refresh();
        } else {
            this._tipLbl.string = r.reason === 'poor' ? '金币不足' : r.reason === 'occupied' ? '这里已经有塔了' : '此处不能建造（路径/祭坛/装饰）';
        }
    }

    private _onTowerTap(cx: number, cy: number): void {
        const seal = DefenseSystem.inst.seal();
        const t = seal.towers.find((x) => x.cx === cx && x.cy === cy);
        if (!t) return;
        const crop = DataManager.inst.getRows('catalogs/crops').find((x) => x['id'] === t.cropId);
        const d = (crop?.['defense'] ?? {}) as Record<string, unknown>;
        if (t.lv < 2 && d['lv2']) {
            const up = Number((d['lv2'] as Record<string, unknown>)['upgradeGold'] ?? 0);
            const rem = Math.floor(Number(d['buildGold'] ?? 0) * 0.6);
            const cropName = String(crop?.['name'] ?? t.cropId);
            this._tipLbl.string = `${cropName} Lv${t.lv}：升级 ${up} 金 / 拆除返 ${rem} 金——再点一次升级`;
            // 简化交互：此处直接升级；拆除走长按/按钮
            const r = DefenseSystem.inst.upgradeTower(cx, cy);
            if (r.ok) { this._tipLbl.string = '升级到 Lv2！'; this._refresh(); }
            else if (r.reason === 'poor') this._tipLbl.string = `升级要 ${up} 金，金币不足`;
            else if (r.reason === 'max') this._tipLbl.string = `已是 Lv2（拆除返 ${rem} 金）——点「拆除」按钮`;
        } else {
            const rem = Math.floor(Number(d['buildGold'] ?? 0) * 0.6);
            this._tipLbl.string = `已是满级。拆除返 ${rem} 金`;
        }
    }

    // ---------- 塔种列 ----------

    private _buildTowerList(): void {
        const root = new Node('towerList');
        root.layer = this.node.layer;
        root.addComponent(UITransform).setContentSize(200, 432);
        root.setPosition(268, -20);
        this.node.addChild(root);
        // 四个塔种项（各自节点，便于点击）
        for (let i = 0; i < TOWER_IDS.length; i++) {
            const cropId = TOWER_IDS[i];
            const crop = DataManager.inst.getRows('catalogs/crops').find((x) => x['id'] === cropId);
            const d = (crop?.['defense'] ?? {}) as Record<string, unknown>;
            const n = new Node(`opt_${cropId}`);
            n.layer = this.node.layer;
            n.addComponent(UITransform).setContentSize(180, 92);
            n.setPosition(0, 156 - i * 104);
            root.addChild(n);
            const g = n.addComponent(Graphics);
            g.fillColor = new Color(40, 44, 64, 255);
            g.roundRect(-90, -46, 180, 92, 10); g.fill();
            g.strokeColor = new Color(90, 96, 130, 255); g.lineWidth = 2;
            g.roundRect(-90, -46, 180, 92, 10); g.stroke();
            const name = String(crop?.['name'] ?? cropId);
            const cost = Number(d['buildGold'] ?? 0);
            const kind = String(d['kind'] ?? '');
            const l = this._labelChild(n, 0, 12, 170, `${name}`, 20, new Color(235, 235, 235, 255));
            void l;
            this._labelChild(n, 0, -18, 170, `${cost} 金 · ${KIND_NAME[kind] ?? kind}`, 16, new Color(170, 170, 170, 255));
            n.on(Node.EventType.TOUCH_END, () => {
                this._sel = this._sel === i ? -1 : i;
                this._tipLbl.string = this._sel >= 0 ? `已选「${name}」——点绿色格建造` : '取消选择';
                this._drawTowerList();
            });
            this._selNodes.push(n);
        }
    }

    private _drawTowerList(): void {
        const inv = GameApp.inst?.inventory ?? {};
        const gold = inv['gold'] ?? 0;
        for (let i = 0; i < this._selNodes.length; i++) {
            const n = this._selNodes[i];
            const cropId = TOWER_IDS[i];
            const crop = DataManager.inst.getRows('catalogs/crops').find((x) => x['id'] === cropId);
            const cost = Number(((crop?.['defense'] ?? {}) as Record<string, unknown>)['buildGold'] ?? 0);
            const sel = this._sel === i;
            const g = n.getComponent(Graphics)!;
            g.clear();
            g.fillColor = sel ? new Color(70, 90, 70, 255) : new Color(40, 44, 64, 255);
            g.roundRect(-90, -46, 180, 92, 10); g.fill();
            g.strokeColor = sel ? GOLD : new Color(90, 96, 130, 255); g.lineWidth = sel ? 4 : 2;
            g.roundRect(-90, -46, 180, 92, 10); g.stroke();
            if (cost > gold) {
                g.strokeColor = new Color(200, 90, 90, 160); g.lineWidth = 2;
                g.roundRect(-90, -46, 180, 92, 10); g.stroke();
            }
        }
    }

    // ---------- 通用小件 ----------

    private _title(s: string, x: number, y: number, size: number): void {
        void this._label(x, y, 600, s, size, GOLD);
    }

    private _label(x: number, y: number, w: number, s: string, size: number, color: Color): Label {
        const n = new Node('lbl');
        n.layer = this.node.layer;
        n.addComponent(UITransform).setContentSize(w, size + 8);
        n.setPosition(x, y);
        this.node.addChild(n);
        const l = n.addComponent(Label);
        l.string = s; l.fontSize = size; l.lineHeight = size + 4;
        l.color = color; l.overflow = Label.Overflow.SHRINK;
        return l;
    }

    private _labelChild(parent: Node, x: number, y: number, w: number, s: string, size: number, color: Color): Label {
        const n = new Node('lbl');
        n.layer = parent.layer;
        n.addComponent(UITransform).setContentSize(w, size + 6);
        n.setPosition(x, y);
        parent.addChild(n);
        const l = n.addComponent(Label);
        l.string = s; l.fontSize = size; l.lineHeight = size + 2;
        l.color = color; l.overflow = Label.Overflow.SHRINK;
        return l;
    }

    private _textButton(x: number, y: number, w: number, h: number, s: string, onTap: () => void): Node {
        const n = new Node(`btn_${s}`);
        n.layer = this.node.layer;
        n.addComponent(UITransform).setContentSize(w, h);
        n.setPosition(x, y);
        this.node.addChild(n);
        const g = n.addComponent(Graphics);
        const draw = () => {
            g.clear();
            g.fillColor = new Color(60, 62, 84, 255);
            g.roundRect(-w / 2, -h / 2, w, h, 10); g.fill();
            g.strokeColor = GOLD; g.lineWidth = 3;
            g.roundRect(-w / 2, -h / 2, w, h, 10); g.stroke();
        };
        draw();
        const ln = new Node('lbl');
        ln.layer = n.layer;
        ln.addComponent(UITransform).setContentSize(w, h);
        n.addChild(ln);
        const l = ln.addComponent(Label);
        l.string = s; l.fontSize = Math.min(26, h - 18); l.lineHeight = Math.min(26, h - 16);
        l.color = new Color(255, 245, 220, 255);
        l.overflow = Label.Overflow.SHRINK;
        n.on(Node.EventType.TOUCH_END, onTap);
        return n;
    }
}
