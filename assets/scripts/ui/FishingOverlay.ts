/**
 * 《异界小农场 2.0》第二批升级：星露谷式「按住拉锯溜鱼」全新钓鱼玩法 + 三水域手绘灵鱼图鉴 + 荷塘养鱼池
 * - 真正有操作博弈感的溜鱼机制：长按水面/拉线按钮（或空格/J键）让绿色浮标右移，松手受水阻力左滑，去追一条会游动、停顿、突发冲刺的活鱼！
 * - 框住活鱼时右侧「收线进度条」持续上涨并伴随水花特效，脱框缓慢回落；拉满 100% 鱼跃出水并点亮底部 6 鱼手绘图鉴！
 * - 居室舒心度越高，绿色浮标越宽；失败零惩罚，随时可重抛竿。
 */

import { _decorator, Color, Component, EventKeyboard, Graphics, input, Input, KeyCode, Label, Layers, Node, Sprite, UITransform } from 'cc';
import type { FishDef, RiverSegmentId } from '../core/GameTypes';
import { DataManager } from '../core/DataManager';
import { GameApp } from '../app/GameApp';
import { ArtLoader } from '../core/ArtLoader';
import { AudioManager } from '../core/AudioManager';
import { FarmSystem } from '../gameplay/farm/FarmSystem';

const { ccclass } = _decorator;

const SEGMENT_NAMES: Record<RiverSegmentId, string> = {
    upstream_brook: '上游寒溪（竹林清泉）',
    midstream_lotus: '灵泉荷塘（庭院静水）',
    downstream_estuary: '下游入海口（南岸潮汐）',
};

const CODEX_ART_ENTRIES: readonly { key: string; name: string; seg: RiverSegmentId }[] = [
    { key: 'fish_brook_trout', name: '寒溪银鳟', seg: 'upstream_brook' },
    { key: 'fish_brook_loach', name: '青石锦鳅', seg: 'upstream_brook' },
    { key: 'fish_lotus_koi', name: '荷塘灵锦鲤', seg: 'midstream_lotus' },
    { key: 'fish_lotus_crucian', name: '玉露鲫鱼', seg: 'midstream_lotus' },
    { key: 'fish_estuary_perch', name: '海口碧鲈', seg: 'downstream_estuary' },
    { key: 'fish_estuary_dragon', name: '潮汐灵龙鱼', seg: 'downstream_estuary' },
] as const;

const TRACK_W = 540;
const TRACK_H = 54;

@ccclass('FishingOverlay')
export class FishingOverlay extends Component {
    private static _inst: FishingOverlay | null = null;

    private _panel!: Node;
    private _titleLbl!: Label;
    private _hintLbl!: Label;
    private _waterGfx!: Graphics;
    private _progGfx!: Graphics;
    private _swimFishNode!: Node;
    private _catchArtNode!: Node;
    private _codexBar!: Node;
    private _pondBtn!: Node;
    private _pondBtnLbl!: Label;
    private _reelBtnLbl!: Label;

    private _active = false;
    private _phase: 'playing' | 'celebrate' = 'playing';
    private _segment: RiverSegmentId = 'midstream_lotus';
    private _targetFish: FishDef | null = null;

    // 星露谷式拉锯溜鱼物理态（归一化 0..1）
    private _barPos = 0.35;      // 绿色浮标左边界
    private _barWidth = 0.28;    // 绿色浮标宽度（受居室舒心度加成）
    private _barVel = 0;         // 浮标惯性速度
    private _holding = false;    // 玩家是否正在按住拉线

    // 活鱼 AI 态
    private _fishPos = 0.5;
    private _fishTarget = 0.6;
    private _fishTimer = 0.8;
    private _fishSpeed = 0.42;

    // 收线进度 0..1
    private _progress = 0.3;
    private _celebrateTimer = 0;
    private _animTime = 0;
    private _onToast: ((msg: string) => void) | null = null;

    public static get inst(): FishingOverlay | null {
        return this._inst;
    }

    public get isOpen(): boolean {
        return this._active;
    }

    protected onLoad(): void {
        FishingOverlay._inst = this;
        this._buildUI();
        this._panel.active = false;
        input.on(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this._onKeyUp, this);
    }

    protected onDestroy(): void {
        if (FishingOverlay._inst === this) FishingOverlay._inst = null;
        input.off(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this._onKeyUp, this);
    }

    private _onKeyDown(e: EventKeyboard): void {
        if (!this._active) return;
        if (e.keyCode === KeyCode.SPACE || e.keyCode === KeyCode.KEY_J) this._holding = true;
    }

    private _onKeyUp(e: EventKeyboard): void {
        if (e.keyCode === KeyCode.SPACE || e.keyCode === KeyCode.KEY_J) this._holding = false;
    }

    private _uiNode(name: string, parent: Node): Node {
        const n = new Node(name);
        n.layer = Layers.Enum.UI_2D;
        n.parent = parent;
        return n;
    }

    private _buildUI(): void {
        this._panel = this._uiNode('FishingPanel', this.node);
        this._panel.addComponent(UITransform).setContentSize(1280, 720);

        const bg = this._panel.addComponent(Graphics);
        bg.fillColor = new Color(18, 28, 26, 170);
        bg.rect(-640, -360, 1280, 720);
        bg.fill();

        const card = this._uiNode('ScrollCard', this._panel);
        card.addComponent(UITransform).setContentSize(780, 520);
        const cg = card.addComponent(Graphics);
        cg.fillColor = new Color(246, 238, 220, 254);
        cg.strokeColor = new Color(132, 92, 58, 255);
        cg.lineWidth = 4;
        cg.roundRect(-390, -260, 780, 520, 16);
        cg.fill();
        cg.stroke();

        // 上方手绘灵鱼展示框
        cg.fillColor = new Color(184, 218, 212, 175);
        cg.strokeColor = new Color(96, 146, 138, 220);
        cg.lineWidth = 2;
        cg.roundRect(-118, 92, 236, 92, 12);
        cg.fill();
        cg.stroke();

        const tNode = this._uiNode('Title', card);
        tNode.setPosition(0, 218, 0);
        this._titleLbl = tNode.addComponent(Label);
        this._titleLbl.fontSize = 23;
        this._titleLbl.color = new Color(24, 36, 32, 255);

        this._catchArtNode = this._uiNode('CatchArt', card);
        this._catchArtNode.setPosition(0, 138, 0);

        const hNode = this._uiNode('Hint', card);
        hNode.setPosition(0, 62, 0);
        this._hintLbl = hNode.addComponent(Label);
        this._hintLbl.fontSize = 14;
        this._hintLbl.color = new Color(82, 68, 52, 255);

        // 水道拉锯溜鱼交互轨道（按住轨道或下方按钮均可拉线）
        const waterTrack = this._uiNode('WaterTrack', card);
        waterTrack.setPosition(0, 10, 0);
        waterTrack.addComponent(UITransform).setContentSize(TRACK_W, TRACK_H);
        this._waterGfx = waterTrack.addComponent(Graphics);

        this._swimFishNode = this._uiNode('SwimFish', waterTrack);
        this._swimFishNode.setPosition(0, 0, 0);

        waterTrack.on(Node.EventType.TOUCH_START, () => { this._holding = true; });
        waterTrack.on(Node.EventType.TOUCH_END, () => { this._holding = false; });
        waterTrack.on(Node.EventType.TOUCH_CANCEL, () => { this._holding = false; });

        // 收线进度条
        const progNode = this._uiNode('ProgressBar', card);
        progNode.setPosition(0, -34, 0);
        this._progGfx = progNode.addComponent(Graphics);

        // 长按拉线按钮（支持按住不放）+ 放鱼入塘 + 收起钓具
        const reelBtn = this._uiNode('ReelBtn', card);
        reelBtn.addComponent(UITransform).setContentSize(196, 48);
        reelBtn.setPosition(-208, -86, 0);
        const rg = reelBtn.addComponent(Graphics);
        rg.fillColor = new Color(36, 126, 116, 252);
        rg.roundRect(-98, -24, 196, 48, 12);
        rg.fill();
        this._reelBtnLbl = this._uiNode('Lbl', reelBtn).addComponent(Label);
        this._reelBtnLbl.string = '按住拉线 (空格)';
        this._reelBtnLbl.fontSize = 16;
        this._reelBtnLbl.color = Color.WHITE;
        reelBtn.on(Node.EventType.TOUCH_START, () => { this._holding = true; });
        reelBtn.on(Node.EventType.TOUCH_END, () => { this._holding = false; });
        reelBtn.on(Node.EventType.TOUCH_CANCEL, () => { this._holding = false; });

        this._pondBtn = this._makeBtn('放鱼入塘养(0/4)', 186, 46, new Color(184, 118, 48, 248), () => this._putFishInPond());
        this._pondBtn.parent = card;
        this._pondBtn.setPosition(8, -86, 0);
        this._pondBtnLbl = this._pondBtn.getChildByName('Lbl')!.getComponent(Label)!;

        const closeBtn = this._makeBtn('收起钓具', 136, 46, new Color(128, 102, 78, 240), () => this.close());
        closeBtn.parent = card;
        closeBtn.setPosition(200, -86, 0);

        const codexTitle = this._uiNode('CodexTitle', card).addComponent(Label);
        codexTitle.node.setPosition(0, -134, 0);
        codexTitle.string = '三水域灵鱼手绘图鉴（已钓亮彩）';
        codexTitle.fontSize = 13;
        codexTitle.color = new Color(102, 76, 52, 235);

        this._codexBar = this._uiNode('CodexBar', card);
        this._codexBar.setPosition(0, -194, 0);
    }

    private _makeBtn(text: string, w: number, h: number, color: Color, onTap: () => void): Node {
        const n = new Node(`Btn_${text}`);
        n.layer = Layers.Enum.UI_2D;
        n.addComponent(UITransform).setContentSize(w, h);
        const g = n.addComponent(Graphics);
        g.fillColor = color;
        g.roundRect(-w / 2, -h / 2, w, h, 10);
        g.fill();
        const l = this._uiNode('Lbl', n).addComponent(Label);
        l.string = text;
        l.fontSize = 16;
        l.color = Color.WHITE;
        n.on(Node.EventType.TOUCH_END, onTap);
        return n;
    }

    private _resolveFishArtKey(f: FishDef | null): string {
        if (!f) return 'fish_lotus_koi';
        const seg = f.riverSegments[0] ?? this._segment;
        const hash = f.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        if (seg === 'upstream_brook') return hash % 2 === 0 ? 'fish_brook_trout' : 'fish_brook_loach';
        if (seg === 'downstream_estuary') return f.rarity === 'rare' || hash % 2 === 1 ? 'fish_estuary_dragon' : 'fish_estuary_perch';
        return hash % 2 === 0 ? 'fish_lotus_koi' : 'fish_lotus_crucian';
    }

    private _showFishPreview(artKey: string, silhouette: boolean): void {
        this._catchArtNode.removeAllChildren();
        ArtLoader.applySprite(this._catchArtNode, artKey, 132, 72, () => {
            const sp = this._catchArtNode.getChildByName('ArtSprite')?.getComponent(Sprite);
            if (sp) sp.color = silhouette ? new Color(46, 86, 82, 135) : Color.WHITE;
        });
    }

    private _rebuildCodexBar(): void {
        this._codexBar.removeAllChildren();
        const app = GameApp.inst;
        if (!app?.ready) return;

        const caughtKeys = new Set<string>();
        for (const fid of app.saveData.codex.fish) {
            const fdef = DataManager.inst.getFish(fid);
            if (fdef) caughtKeys.add(this._resolveFishArtKey(fdef));
        }

        const slotW = 110;
        const gap = 10;
        CODEX_ART_ENTRIES.forEach((entry, idx) => {
            const unlocked = caughtKeys.has(entry.key);
            const slot = this._uiNode(`Codex_${entry.key}`, this._codexBar);
            slot.setPosition((idx - (CODEX_ART_ENTRIES.length - 1) / 2) * (slotW + gap), 0, 0);

            const g = slot.addComponent(Graphics);
            g.fillColor = unlocked ? new Color(252, 246, 232, 250) : new Color(220, 214, 200, 210);
            g.strokeColor = unlocked ? new Color(214, 158, 56, 255) : new Color(156, 144, 126, 200);
            g.lineWidth = unlocked ? 2.4 : 1.5;
            g.roundRect(-slotW / 2, -40, slotW, 80, 9);
            g.fill();
            g.stroke();

            const holder = this._uiNode('Icon', slot);
            holder.setPosition(0, 10, 0);
            ArtLoader.applySprite(holder, entry.key, 86, 48, () => {
                const sp = holder.getChildByName('ArtSprite')?.getComponent(Sprite);
                if (sp) sp.color = unlocked ? Color.WHITE : new Color(96, 104, 102, 130);
            });

            const lbl = this._uiNode('Lbl', slot).addComponent(Label);
            lbl.node.setPosition(0, -26, 0);
            lbl.string = unlocked ? entry.name : '未解锁';
            lbl.fontSize = 11;
            lbl.color = unlocked ? new Color(42, 54, 48, 255) : new Color(128, 118, 104, 220);
        });
    }

    public open(segment: RiverSegmentId, onToast?: (msg: string) => void): void {
        const app = GameApp.inst;
        if (!app?.ready) return;
        this._segment = segment;
        this._onToast = onToast ?? null;
        this._active = true;
        this._holding = false;
        this._panel.active = true;
        this._panel.setSiblingIndex(this.node.children.length - 1);
        this._startNewRound(true);
        this._rebuildCodexBar();
        this._refreshPondBtn();
    }

    public close(): void {
        this._active = false;
        this._holding = false;
        this._panel.active = false;
    }

    private _refreshPondBtn(): void {
        const app = GameApp.inst;
        if (!app?.ready || !this._pondBtn) return;
        const cnt = (app.saveData.farm.pondFishIds ?? []).length;
        this._pondBtn.active = this._segment === 'midstream_lotus';
        this._pondBtnLbl.string = `放鱼入塘养(${cnt}/4)`;
    }

    private _putFishInPond(): void {
        const app = GameApp.inst;
        if (!app?.ready) return;
        let firstFishId: string | null = null;
        for (const k of Object.keys(app.saveData.inventory)) {
            if ((app.saveData.inventory[k] ?? 0) > 0 && DataManager.inst.getFish(k)) {
                firstFishId = k;
                break;
            }
        }
        if (!firstFishId) {
            this._hintLbl.string = '背包里还没有鲜鱼，先溜起一条再放进荷塘养吧！';
            return;
        }
        const res = FarmSystem.inst.addFishToPond(firstFishId);
        AudioManager.inst.playSfx(res.ok ? 'harvest' : 'tap');
        this._hintLbl.string = res.message;
        this._onToast?.(res.message);
        this._refreshPondBtn();
    }

    private _startNewRound(resetPreview = true): void {
        const app = GameApp.inst;
        if (!app?.ready) return;
        const d = app.time.getDate();
        let pool = DataManager.inst.queryFishPool(this._segment, d.season, app.time.weather, d.solarTerm.id);
        if (pool.length === 0) {
            pool = DataManager.inst.queryFishPool(this._segment, 'spring', 'sunny', 'lichun');
        }
        this._targetFish = pool[Math.floor(Math.random() * pool.length)] ?? null;
        const artKey = this._resolveFishArtKey(this._targetFish);

        const comfortBonus = Math.min(0.14, (app.saveData.indoor.comfortScore ?? 0) * 0.0022);
        this._barWidth = Math.min(0.42, 0.26 + comfortBonus);
        this._barPos = 0.32;
        this._barVel = 0;
        this._fishPos = 0.5;
        this._fishTarget = 0.65;
        this._fishTimer = 0.7;
        const diff = this._targetFish?.difficulty ?? 1;
        this._fishSpeed = 0.34 + diff * 0.14;
        this._progress = 0.32;
        this._phase = 'playing';

        // 水道内活鱼小图标
        this._swimFishNode.removeAllChildren();
        ArtLoader.applySprite(this._swimFishNode, artKey, 56, 32);

        this._titleLbl.string = `溜鱼垂钓 · ${SEGMENT_NAMES[this._segment]}`;
        if (resetPreview) {
            this._hintLbl.string = '长按水道或「按住拉线」(空格) 让绿条追住游动的鱼，把下方收线进度条拉满！';
            this._showFishPreview(artKey, true);
        }
    }

    private _onFishCaught(): void {
        const app = GameApp.inst;
        const f = this._targetFish;
        if (!app?.ready || !f) return;

        app.addItem(f.id, 1);
        if (!app.saveData.codex.fish.includes(f.id)) app.saveData.codex.fish.push(f.id);
        app.persist('fishing_catch');
        AudioManager.inst.playSfx('harvest');

        const msg = `成功溜起【${f.name}】！（售价 ${f.sellPrice} 金，可去室外灶棚炖鱼汤）`;
        this._hintLbl.string = msg;
        this._onToast?.(msg);
        this._showFishPreview(this._resolveFishArtKey(f), false);
        this._rebuildCodexBar();
        this._phase = 'celebrate';
        this._celebrateTimer = 1.35;
    }

    protected update(dt: number): void {
        if (!this._active) return;
        this._animTime += dt;

        // 上方展示鱼轻柔游动
        this._catchArtNode.setPosition(Math.sin(this._animTime * 2.4) * 12, 138 + Math.sin(this._animTime * 3.6) * 3, 0);

        if (this._phase === 'celebrate') {
            this._celebrateTimer -= dt;
            if (this._celebrateTimer <= 0) {
                this._startNewRound(true);
            }
            return;
        }

        // 1. 绿色浮标惯性物理（按住向右加速拉线，松手自然向左回落，边缘柔弹）
        const accel = this._holding ? 2.15 : -1.75;
        this._barVel = Math.max(-1.15, Math.min(1.15, this._barVel + accel * dt));
        this._barPos += this._barVel * dt;
        const maxBarPos = 1 - this._barWidth;
        if (this._barPos < 0) {
            this._barPos = 0;
            this._barVel = Math.abs(this._barVel) * 0.25;
        } else if (this._barPos > maxBarPos) {
            this._barPos = maxBarPos;
            this._barVel = -Math.abs(this._barVel) * 0.25;
        }

        // 2. 活鱼 AI（随机巡游 + 停顿 + 偶发冲刺）
        this._fishTimer -= dt;
        if (this._fishTimer <= 0) {
            const burst = Math.random() < 0.35;
            this._fishTarget = 0.08 + Math.random() * 0.84;
            this._fishTimer = burst ? 0.55 + Math.random() * 0.45 : 0.9 + Math.random() * 0.9;
        }
        const fDiff = this._fishTarget - this._fishPos;
        const step = Math.sign(fDiff) * Math.min(Math.abs(fDiff), this._fishSpeed * dt);
        this._fishPos = Math.max(0.05, Math.min(0.95, this._fishPos + step));
        this._swimFishNode.setPosition(-TRACK_W / 2 + this._fishPos * TRACK_W, Math.sin(this._animTime * 7) * 3, 0);
        this._swimFishNode.setScale(step < -0.001 ? -1 : 1, 1, 1);

        // 3. 判定活鱼是否被绿色浮标框住 → 更新收线进度
        const caughtInBar = this._fishPos >= this._barPos - 0.02 && this._fishPos <= this._barPos + this._barWidth + 0.02;
        if (caughtInBar) {
            this._progress = Math.min(1, this._progress + dt * 0.34);
        } else {
            this._progress = Math.max(0, this._progress - dt * 0.16);
        }

        this._renderMinigame(caughtInBar);

        if (this._progress >= 1) {
            this._onFishCaught();
        } else if (this._progress <= 0) {
            AudioManager.inst.playSfx('tap');
            this._hintLbl.string = '鱼儿挣脱跑了！失败零惩罚，立刻自动抛起下一竿～';
            this._startNewRound(false);
        }
    }

    private _renderMinigame(inZone: boolean): void {
        const g = this._waterGfx;
        g.clear();
        // 水道碧玉槽
        g.fillColor = new Color(72, 138, 136, 235);
        g.strokeColor = new Color(46, 86, 84, 255);
        g.lineWidth = 3;
        g.roundRect(-TRACK_W / 2, -TRACK_H / 2, TRACK_W, TRACK_H, 12);
        g.fill();
        g.stroke();

        // 绿色浮标拉线区（框住鱼时亮起暖金翠光）
        const bx = -TRACK_W / 2 + this._barPos * TRACK_W;
        const bw = this._barWidth * TRACK_W;
        g.fillColor = inZone ? new Color(116, 224, 146, 215) : new Color(92, 186, 126, 150);
        g.strokeColor = inZone ? new Color(252, 232, 132, 255) : new Color(188, 240, 200, 220);
        g.lineWidth = inZone ? 3 : 2;
        g.roundRect(bx, -TRACK_H / 2 + 4, bw, TRACK_H - 8, 9);
        g.fill();
        g.stroke();

        // 框住鱼时的动态水花点缀
        if (inZone) {
            const fx = -TRACK_W / 2 + this._fishPos * TRACK_W;
            g.fillColor = new Color(242, 252, 250, 190);
            g.circle(fx + Math.sin(this._animTime * 18) * 14, 16, 4);
            g.circle(fx - Math.cos(this._animTime * 15) * 12, -16, 3.5);
            g.fill();
        }

        // 收线进度条
        const pg = this._progGfx;
        pg.clear();
        const pw = TRACK_W;
        const ph = 14;
        pg.fillColor = new Color(64, 52, 42, 200);
        pg.roundRect(-pw / 2, -ph / 2, pw, ph, 7);
        pg.fill();

        const fillW = Math.max(8, pw * this._progress);
        pg.fillColor = this._progress > 0.7 ? new Color(242, 196, 68, 255) : new Color(76, 198, 132, 255);
        pg.roundRect(-pw / 2 + 2, -ph / 2 + 2, fillW - 4, ph - 4, 5);
        pg.fill();
    }
}
