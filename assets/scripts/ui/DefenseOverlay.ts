/**
 * DefenseOverlay —— 封印防守夜战层（M4 塔防化）。
 *
 * 战场 = seal_1 地图（15×9 格 @64px，960×576 居中）：
 * 西线 A / 北线 B 双裂口路径 → 决战走廊 → 2×2 封印祭坛（HP 条）。
 * 怪物节点按 uid 池化（点击挥击），塔按 seal.towers 静态渲染，
 * 波次 HUD（第 X/Y 波 · 场上怪 · 波间倒计时），终局归因面板。
 * 帧驱动：update(dt) 由引擎调用；Automation 可手动调 update 推进（RAF 停转兼容）。
 */
import { _decorator, Component, Node, Graphics, Label, Color, UITransform, Sprite, SpriteFrame } from 'cc';
import { EventBus } from '../core/EventBus';
import { TimeSystem } from '../core/TimeSystem';
import { GameApp } from '../app/GameApp';
import { DefenseSystem } from '../gameplay/defense/DefenseSystem';
import { SpriteLib } from '../core/SpriteLib';
import { cellToPx } from '../gameplay/defense/DefenseCore';

const { ccclass } = _decorator;

const SCREEN_UI_LAYER = 1 << 24;

const COL_BG = new Color(16, 18, 40, 255);
const COL_GRID = new Color(60, 66, 110, 60);
const COL_PATH = new Color(52, 44, 40, 255);
const COL_ALTAR = new Color(196, 164, 84, 255);
const COL_BUILD = new Color(90, 130, 90, 26);
const GOLD = new Color(242, 193, 78, 255);
const MONSTER_COLORS: Record<string, Color> = {
    slime: new Color(110, 190, 100, 255),
    slime_elite: new Color(170, 110, 220, 255),
    sporeling: new Color(196, 150, 96, 255),
};

@ccclass('DefenseOverlay')
export class DefenseOverlay extends Component {
    private static _inst: DefenseOverlay | null = null;
    static get inst(): DefenseOverlay | null { return this._inst; }

    private _g!: Graphics;
    private _field!: Node;          // 战场容器（draw + 动态节点）
    private _monRoot!: Node;        // 怪物节点池
    private _towerRoot!: Node;
    private _moNodes = new Map<number, Node>();
    private _info!: Label;          // 顶部波次行
    private _altarBarNode!: Node;   // 祭坛 HP 条（独立子节点）
    private _altarBar!: Graphics;
    private _result!: Node;         // 终局面板
    private _resultText!: Label;
    private _btn!: Node;
    private _hookBound = false;

    static create(parent: Node, layer: number): DefenseOverlay {
        const root = new Node('DefenseOverlay');
        root.layer = layer;
        root.addComponent(UITransform).setContentSize(1280, 720);
        parent.addChild(root);
        const c = root.addComponent(DefenseOverlay);
        this._inst = c;
        return c;
    }

    onLoad(): void {
        this._g = this.node.addComponent(Graphics);
        this._g.strokeColor = GOLD; this._g.lineWidth = 3;

        // 战场容器（居中 960×576）
        this._field = new Node('field');
        this._field.layer = this.node.layer;
        this._field.addComponent(UITransform).setContentSize(960, 576);
        this._field.setPosition(0, 0);
        this.node.addChild(this._field);

        this._monRoot = new Node('monsters');
        this._monRoot.layer = this.node.layer;
        this._field.addChild(this._monRoot);
        this._towerRoot = new Node('towers');
        this._towerRoot.layer = this.node.layer;
        this._field.addChild(this._towerRoot);

        // 顶部波次行
        this._info = this._makeLabel(this.node, 0, 316, 900, '封印之夜', 26, GOLD);
        // 祭坛 HP 条（独立子节点，避免双 Graphics）
        this._altarBarNode = new Node('altarBar');
        this._altarBarNode.layer = this.node.layer;
        this._altarBarNode.addComponent(UITransform).setContentSize(300, 20);
        this.node.addChild(this._altarBarNode);
        this._altarBar = this._altarBarNode.addComponent(Graphics);

        this.node.active = false;
        if (!this._hookBound) {
            this._hookBound = true;
        }
    }

    private _makeLabel(parent: Node, x: number, y: number, w: number, s: string, size: number, color: Color): Label {
        const n = new Node('lbl');
        n.layer = parent.layer;
        n.addComponent(UITransform).setContentSize(w, 44);
        n.setPosition(x, y);
        parent.addChild(n);
        const l = n.addComponent(Label);
        l.string = s; l.fontSize = size; l.lineHeight = size + 4;
        l.color = color; l.overflow = Label.Overflow.SHRINK;
        return l;
    }

    /** 开战（BedtimeDialog 确认 → DefenseSystem.startNight 已在 open 内调用） */
    open(): boolean {
        const sys = DefenseSystem.inst;
        if (!sys.startNight()) return false;
        sys.night!.hook = (ev, p) => this._onCore(ev, p);
        this.node.active = true;
        this._result = null as unknown as Node;
        this._drawField();
        this._drawTowers();
        this._refreshInfo('封印之夜——怪物正在靠近……');
        return true;
    }

    // ---------- 静态绘制 ----------

    private _drawField(): void {
        const g = this._g;
        const sys = DefenseSystem.inst;
        const m = sys.night!.map;
        const def = m.def;
        g.clear();
        // 夜幕底
        g.fillColor = COL_BG;
        g.rect(-640, -360, 1280, 720);
        g.fill();
        // 网格（建造格淡绿、其余暗）
        g.fillColor = COL_BUILD;
        for (const cell of m.buildable) {
            const cx = cell % def.cols, cy = Math.floor(cell / def.cols);
            const [px, py] = cellToPx(def, cx, cy);
            g.rect(px - def.cellPx / 2 + 2, py - def.cellPx / 2 + 2, def.cellPx - 4, def.cellPx - 4);
        }
        g.fill();
        // 路径带
        g.strokeColor = COL_PATH; g.lineWidth = 44; g.lineJoin = 'round'; g.lineCap = 'round';
        for (const line of Object.keys(def.paths)) {
            const wps = m.pathPx[line];
            g.moveTo(wps[0][0], wps[0][1]);
            for (let i = 1; i < wps.length; i++) g.lineTo(wps[i][0], wps[i][1]);
            g.stroke();
        }
        // 装饰（池塘/岩石）
        g.fillColor = new Color(40, 70, 140, 255);
        for (const [cx, cy] of def.decor['pond'] ?? []) {
            const [px, py] = cellToPx(def, cx, cy);
            g.circle(px, py, 24); g.fill();
        }
        g.fillColor = new Color(110, 110, 118, 255);
        for (const [cx, cy] of def.decor['rocks'] ?? []) {
            const [px, py] = cellToPx(def, cx, cy);
            g.circle(px, py, 20); g.fill();
        }
        // 祭坛 2×2：cells (12,3)(13,3)(12,4)(13,4) → 区块 x∈[288,416] y∈[-32,96]
        g.fillColor = COL_ALTAR;
        g.rect(288, -32, 128, 128); g.fill();
        g.strokeColor = GOLD; g.lineWidth = 4;
        g.rect(288, -32, 128, 128); g.stroke();
        // 裂口标记
        g.fillColor = new Color(200, 80, 80, 255);
        const [wax, way] = m.pathPx['A'][0];
        g.circle(wax, way, 22); g.fill();
        const [nbx, nby] = m.pathPx['B'][0];
        g.circle(nbx, nby, 22); g.fill();
        this._drawAltarBar();
    }

    private _drawAltarBar(): void {
        const c = DefenseSystem.inst.night?.core;
        const g = this._altarBar;
        g.clear();
        if (!c) return;
        const w = 300, ratio = Math.max(0, c.altarHp / c.altarMax);
        g.fillColor = new Color(0, 0, 0, 170);
        g.rect(-w / 2, 270, w, 20); g.fill();
        g.fillColor = ratio > 0.5 ? new Color(120, 210, 120, 255) : ratio > 0.25 ? GOLD : new Color(220, 90, 90, 255);
        g.rect(-w / 2 + 2, 272, (w - 4) * ratio, 16); g.fill();
    }

    private _drawTowers(): void {
        const c = DefenseSystem.inst.night?.core;
        if (!c) return;
        this._towerRoot.removeAllChildren();
        for (const t of c.towers) {
            const n = new Node(`tw_${t.cx}_${t.cy}`);
            n.layer = this.node.layer;
            n.setPosition(t.x, t.y);
            this._towerRoot.addChild(n);
            const g = n.addComponent(Graphics);
            const col = t.kind === 'slow' ? new Color(120, 200, 230, 255)
                : t.kind === 'attract' ? new Color(240, 200, 90, 255)
                : t.kind === 'spike' ? new Color(230, 140, 70, 255)
                : new Color(140, 210, 140, 255);
            // 光环圈
            g.strokeColor = new Color(col.r, col.g, col.b, 70);
            g.lineWidth = 2;
            g.circle(0, 0, t.rPx); g.stroke();
            g.fillColor = col;
            g.circle(0, 0, t.lv >= 2 ? 26 : 20); g.fill();
            g.strokeColor = new Color(0, 0, 0, 120); g.lineWidth = 2;
            g.circle(0, 0, t.lv >= 2 ? 26 : 20); g.stroke();
            // 等级标记（子节点，避免与 Graphics 同节点渲染冲突）
            if (t.lv >= 2) {
                const ln = new Node('lv');
                ln.layer = n.layer;
                ln.addComponent(UITransform).setContentSize(60, 20);
                ln.setPosition(0, 0);
                n.addChild(ln);
                const l = ln.addComponent(Label);
                l.string = 'II'; l.fontSize = 16; l.lineHeight = 18;
                l.color = new Color(255, 255, 255, 255);
                l.overflow = Label.Overflow.SHRINK;
            }
        }
    }

    private _refreshInfo(s: string): void {
        this._info.string = s;
    }

    // ---------- 怪物节点 ----------

    private _makeMonsterNode(uid: number, mid: string, name: string): Node {
        const n = new Node(`mo_${uid}`);
        n.layer = this.node.layer;
        const r = mid === 'slime_elite' ? 26 : 20;
        n.addComponent(UITransform).setContentSize(r * 3, r * 3);   // 触摸热区（先设，Graphics 复用它）
        this._monRoot.addChild(n);
        const g = n.addComponent(Graphics);
        const col = MONSTER_COLORS[mid] ?? new Color(200, 200, 200, 255);
        g.fillColor = col; g.circle(0, 0, r); g.fill();
        g.strokeColor = new Color(0, 0, 0, 140); g.lineWidth = 3;
        g.circle(0, 0, r); g.stroke();
        // 血条
        g.fillColor = new Color(0, 0, 0, 160);
        g.rect(-r, r + 8, r * 2, 6); g.fill();
        g.fillColor = new Color(110, 220, 110, 255);
        g.rect(-r + 1, r + 9, r * 2 - 2, 4); g.fill();
        // 名字
        const ln = new Node('nm');
        ln.layer = n.layer;
        ln.addComponent(UITransform).setContentSize(160, 20);
        ln.setPosition(0, -r - 20);
        n.addChild(ln);
        const l = ln.addComponent(Label);
        l.string = name; l.fontSize = 15; l.lineHeight = 18;
        l.color = new Color(230, 230, 230, 255);
        // 精灵（素材就绪则贴图盖住色块）
        const sprPath = mid === 'slime_elite' ? 'monsters/slime_elite' : mid === 'sporeling' ? 'monsters/sporeling' : 'monsters/slime';
        const tryArt = () => {
            const sf: SpriteFrame | null = SpriteLib.inst.get(sprPath);
            if (!sf) return false;
            const body = new Node('bodySpr');
            body.layer = n.layer;
            body.addComponent(UITransform).setContentSize(r * 2.6, r * 2.6);
            body.setPosition(0, 6);
            n.addChild(body);
            const sp = body.addComponent(Sprite);
            sp.sizeMode = Sprite.SizeMode.CUSTOM;
            sp.spriteFrame = sf;
            const og = n.getComponent(Graphics);
            if (og) og.clear();
            return true;
        };
        if (!tryArt()) this.scheduleOnce(tryArt, 0.6);
        n.on(Node.EventType.TOUCH_END, () => {
            const r = DefenseSystem.inst.playerHit(uid);
            if (r !== 'miss') {
                // 命中反馈：闪白由 update 同步血条体现
            }
        });
        return n;
    }

    // ---------- 帧驱动 ----------

    update(dt: number): void {
        const sys = DefenseSystem.inst;
        const s = sys.night;
        if (!s || !this.node.active) return;
        sys.tick(dt);
        const c = s.core;

        // 怪物节点同步
        const alive = new Set<number>();
        for (const m of c.monsters) {
            if (m.hp <= 0) continue;
            alive.add(m.uid);
            let n = this._moNodes.get(m.uid);
            if (!n) { n = this._makeMonsterNode(m.uid, m.mid, m.name); this._moNodes.set(m.uid, n); }
            n.setPosition(m.x, m.y);
            // 血条比例
            const g = n.getComponent(Graphics);
            if (g && m.hp < m.maxHp) {
                const r = (m.mid === 'slime_elite' ? 26 : 20);
                // 重画名字外的血条（简单方案：不重画，用透明度示意）
            }
        }
        for (const [uid, n] of this._moNodes) {
            if (!alive.has(uid)) { n.destroy(); this._moNodes.delete(uid); }
        }

        // HUD
        const waveNo = c.waveIdx + 1;
        const waveTotal = c.waves.length;
        const aliveCount = c.monsters.filter((m) => m.hp > 0).length;
        const pending = c.wavePlan.length;
        if (c.over) {
            this._refreshInfo(c.won ? (c.perfect ? '完胜！封印固若金汤' : '守住了封印！') : '封印失守……');
        } else if (c.breakActive) {
            this._refreshInfo(`第 ${waveNo}/${waveTotal} 波已清——波间修补 ${Math.ceil(c.breakT)}s（下一波 ${c.waveIdx + 2}/${waveTotal}）`);
        } else {
            this._refreshInfo(`第 ${waveNo}/${waveTotal} 波 · 场上 ${aliveCount} · 待出现 ${pending} · 祭坛 ${Math.round(c.altarHp)}`);
        }
        this._drawAltarBar();

        // 终局面板
        if (c.over && !this._result) this._showResult();
    }

    private _onCore(ev: string, p?: Record<string, unknown>): void {
        if (ev === 'bait_gone') {
            // 诱饵被啃空：塔视觉移除（update 会经 towers 重绘？core towers 已过滤——重绘）
            this._drawTowers();
        }
    }

    // ---------- 终局 ----------

    private _showResult(): void {
        const sys = DefenseSystem.inst;
        const s = sys.night!;
        const c = s.core;
        const app = GameApp.inst;
        const out = sys.settle();
        const layer = this.node.layer;

        const root = new Node('result');
        root.layer = layer;
        root.addComponent(UITransform).setContentSize(1280, 720);
        this.node.addChild(root);
        const rg = root.addComponent(Graphics);
        rg.fillColor = new Color(0, 0, 0, 190);
        rg.rect(-640, -360, 1280, 720); rg.fill();
        rg.fillColor = new Color(34, 34, 44, 255);
        rg.roundRect(-300, -190, 600, 380, 16); rg.fill();
        rg.strokeColor = GOLD; rg.lineWidth = 3;
        rg.roundRect(-300, -190, 600, 380, 16); rg.stroke();

        const t1 = this._makeLabel(root, 0, 120, 560, out.won ? (out.perfect ? '★ 完 胜 ★' : '守 住 了 封 印') : '封 印 失 守', 40, out.won ? GOLD : new Color(220, 100, 100, 255));
        void t1;
        const lines: string[] = [];
        lines.push(`击杀 ${out.killed} · 西线漏 ${out.leakA} · 北线漏 ${out.leakB}`);
        lines.push(`祭坛剩余 ${Math.round(out.altarHp)} HP`);
        if (!out.won) lines.push('守门人连夜抢修——祭坛回升至 50 HP');
        const t2 = this._makeLabel(root, 0, 30, 560, lines.join('\n'), 22, new Color(225, 225, 225, 255));
        void t2;

        const btn = new Node('dawn');
        btn.layer = layer;
        btn.addComponent(UITransform).setContentSize(240, 76);
        btn.setPosition(0, -120);
        root.addChild(btn);
        const bg = btn.addComponent(Graphics);
        bg.fillColor = new Color(60, 62, 80, 255);
        bg.roundRect(-120, -38, 240, 76, 12); bg.fill();
        bg.strokeColor = GOLD; bg.lineWidth = 3;
        bg.roundRect(-120, -38, 240, 76, 12); bg.stroke();
        const bln = new Node('lbl');
        bln.layer = layer;
        bln.addComponent(UITransform).setContentSize(240, 76);
        btn.addChild(bln);
        const bl = bln.addComponent(Label);
        bl.string = '天 亮 了'; bl.fontSize = 30; bl.lineHeight = 34;
        bl.color = new Color(255, 245, 220, 255);
        bl.overflow = Label.Overflow.SHRINK;
        btn.on(Node.EventType.TOUCH_END, () => {
            this.node.active = false;
            root.destroy();
            this._result = null as unknown as Node;
            this._moNodes.forEach((n) => n.destroy());
            this._moNodes.clear();
            this._g.clear();
            this._altarBar.clear();
            EventBus.inst.emit('farmChanged', { action: 'bedtime' });
            TimeSystem.inst.endDay();
            app.persist('defense_settled');
        });
        this._result = root;
        this._btn = btn;
        void this._resultText;
    }
}
