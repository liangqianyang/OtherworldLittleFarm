import { _decorator, Component, Label, Node, UITransform, Graphics, Color, Sprite } from 'cc';
const { ccclass } = _decorator;

import { EventBus } from '../core/EventBus';
import { TimeSystem } from '../core/TimeSystem';
import { DataManager } from '../core/DataManager';
import { GameApp } from '../app/GameApp';
import { EconomySystem } from '../systems/EconomySystem';
import { SpriteLib } from '../core/SpriteLib';
import { BackpackPanel } from './BackpackPanel';
import { BedtimeDialog } from './BedtimeDialog';
import { TutorialGuide } from './TutorialGuide';
import { DefenseOverlay } from './DefenseOverlay';
import { DialogPanel } from './DialogPanel';
import { PauseOverlay } from './PauseOverlay';
import { DecorPanel } from './DecorPanel';
import { CodexPanel } from './CodexPanel';
import { DefenseSystem } from '../gameplay/defense/DefenseSystem';
import { FishingPanel } from './FishingPanel';

/**
 * FarmHUD 顶栏（阶段 2.2 布局正式化）：
 * 中央信息（天/金币/种子/萝卜）· 左角 卖粮+买种子 · 右角 跳一天+存档+背包。
 * 1280×720 设计分辨率，按钮 110×52 距边 ≥24px（§17 安全区）。
 * 占位 Graphics 风格，阶段 2.5 换像素素材。
 */
@ccclass('FarmHUD')
export class FarmHUD extends Component {
    private _sellLabel: Label | null = null;
    private _buyLabel: Label | null = null;
    private _panel: BackpackPanel | null = null;
    private _bedtime: BedtimeDialog | null = null;
    private _defense: DefenseOverlay | null = null;
    private _fishing: FishingPanel | null = null;
    private _dialog: DialogPanel | null = null;
    private _pause: PauseOverlay | null = null;
    private _decor: DecorPanel | null = null;
    private _codex: CodexPanel | null = null;
    private _intelLabel: Label | null = null;

    onLoad(): void {
        EventBus.inst.on('dayAdvanced', this._refresh, this);
        EventBus.inst.on('itemGained', this._refresh, this);
        EventBus.inst.on('itemSpent', this._refresh, this);
        this._refresh({ dayIndex: TimeSystem.inst.dayIndex });
    }

    start(): void {
        // 左角：经济（出货/买种）—— x=-560 → 绝对边距 640-560-55=25px ≥24 ✓
        this._sellLabel = this._makeButton('卖粮(0)', -560, 0, () => this._onSell());
        this._buyLabel = this._makeButton('买种子', -560, -64, () => this._onBuySeed());

        // 右角：流程（背包=开关/跳天/存档）
        this._makeButton('背包', 560, 0, () => {
            if (!this._panel) return;
            if (this._panel.node.active) this._panel.close();
            else this._panel.open();
        });
        this._makeButton('跳一天', 560, -64, () => this._bedtime?.open());
        const saveLabel = this._makeButton('存档', 560, -128, () => {
            GameApp.inst?.persist('manual');
            this._flash(saveLabel, '已存档✓', '存档');
        });
        // 探险入口（阶段 3）：存档后切探险场景
        this._makeButton('出发探险', 560, -192, () => {
            GameApp.inst?.persist('adventure_start');
            GameApp.inst?.loadAdventure();
        });
        // 钓鱼入口（阶段 5）：开关小面板
        this._makeButton('钓鱼', -560, -128, () => {
            if (!this._fishing) return;
            this._fishing.node.active = !this._fishing.node.active;
        });
        // 暂停（§17）：主动暂停遮罩
        this._makeButton('暂停', -560, -192, () => this._pause?.open());
        // 小屋（§10 拍板③：预布置房间展示）
        this._makeButton('小屋', 560, -256, () => this._decor?.open());
        // 图鉴（§13 MVP v2 收窄：作物+鱼）
        this._makeButton('图鉴', 560, -320, () => this._codex?.open());

        // 背包面板 + 睡觉弹窗 + 防守覆盖层 + 钓鱼面板 + 对话面板 + 新档引导（挂 HUD 所在 Canvas）
        const canvas = this.node.parent;
        if (canvas) {
            this._panel = BackpackPanel.create(canvas, this.node.layer);
            this._bedtime = BedtimeDialog.create(canvas, this.node.layer);
            this._bedtime.defenseOverlay = this._defense = DefenseOverlay.create(canvas, this.node.layer);
            this._fishing = FishingPanel.create(canvas, this.node.layer);
            this._dialog = DialogPanel.create(canvas, this.node.layer);
            this._pause = PauseOverlay.create(canvas, this.node.layer);
            this._decor = DecorPanel.create(canvas, this.node.layer);
            this._codex = CodexPanel.create(canvas, this.node.layer);
            TutorialGuide.maybeStart(canvas, this.node.layer);
            this._makeNpcs(canvas);
        }

        // 守门人情报（§8.1）：顶栏下方一行预告
        const intelNode = new Node('intel');
        intelNode.layer = this.node.layer;
        intelNode.addComponent(UITransform);
        intelNode.setPosition(0, 215);
        const il = intelNode.addComponent(Label)!;
        il.fontSize = 20;
        il.string = '';
        this.node.addChild(intelNode);
        this._intelLabel = il;

        // 按钮文本按当前背包刷一次（初始硬编码文本不反映实况）
        this._refreshShops();
        this._refreshIntel();
    }

    onDestroy(): void {
        EventBus.inst.off('dayAdvanced', this._refresh, this);
        EventBus.inst.off('itemGained', this._refresh, this);
        EventBus.inst.off('itemSpent', this._refresh, this);
    }

    /** 存档按钮独立一行（-128），不与跳一天(-64)重叠 */
    private _makePersistButton(): void { /* 已并入 start() */ }

    /** 按钮文字闪现提示（存档/钱不够等即时反馈） */
    /** NPC 立绘节点（阶段 5.3）：农场右侧空区两个 NPC，点击触发线性对话 */
    private _makeNpcs(canvas: Node): void {
        const defs = [
            { id: 'gardener', name: '园艺师', art: 'npc/npc_gardener', x: 400, y: -90, tint: new Color(120, 170, 110, 255) },
            { id: 'gatekeeper', name: '守门人', art: 'npc/npc_gatekeeper', x: 400, y: 70, tint: new Color(110, 120, 170, 255) },
        ];
        for (const d of defs) {
            const n = new Node('npc_' + d.id);
            n.layer = this.node.layer;
            n.addComponent(UITransform).setContentSize(96, 128);
            n.setPosition(d.x, d.y);
            canvas.addChild(n);

            // 身体（Graphics 像素小人：头圆+身块，素材就绪后由立绘覆盖）
            const body = n.addComponent(Graphics)!;
            body.fillColor = d.tint;
            body.circle(0, 34, 16);
            body.fill();
            body.roundRect(-14, -26, 28, 58, 6);
            body.fill();

            const nameN = new Node('nm');
            nameN.layer = this.node.layer;
            nameN.addComponent(UITransform).setContentSize(120, 22);
            nameN.setPosition(0, -46);
            const nl = nameN.addComponent(Label)!;
            nl.fontSize = 16;
            nl.lineHeight = 20;
            nl.color = new Color(220, 216, 208, 255);
            nl.string = d.name;
            n.addChild(nameN);

            n.on(Node.EventType.TOUCH_END, () => {
                // 对话打开时忽略（遮罩层接管点击）
                if (this._dialog && this._dialog.node.active) return;
                this._dialog?.openNpc(d.id);
            });

            // 素材就绪 → 立绘覆盖色块（scheduleOnce 只能挂在 Component 上，不能挂 Node）
            const tryArt = (): void => {
                const lib = SpriteLib.inst;
                if (!lib.ready) { this.scheduleOnce(tryArt, 1); return; }
                const sf = lib.get(d.art);
                if (!sf) return;
                let sprNode = n.getChildByName('spr');
                if (!sprNode) {
                    sprNode = new Node('spr');
                    sprNode.layer = this.node.layer;
                    sprNode.addComponent(UITransform).setContentSize(96, 96);
                    sprNode.setPosition(0, 8);
                    n.addChild(sprNode);
                }
                const s = sprNode.getComponent(Sprite) || sprNode.addComponent(Sprite);
                s.sizeMode = Sprite.SizeMode.CUSTOM;
                s.spriteFrame = sf;
                sprNode.active = true;
                body.clear();
            };
            this.scheduleOnce(tryArt, 0.5);
        }
    }

    private _flash(label: Label, temp: string, restore: string): void {
        label.string = temp;
        this.scheduleOnce(() => {
            if (label.isValid) label.string = restore;
        }, 0.9);
    }

    private _onSell(): void {
        const app = GameApp.inst;
        if (!app) return;
        const total = EconomySystem.inst.sellAllProducts(app.inventory);
        if (total > 0) app.persist('sell');
    }

    private _onBuySeed(): void {
        const app = GameApp.inst;
        if (!app) return;
        if (EconomySystem.inst.buySeed('carrot_seed', app.inventory)) {
            app.persist('buySeed');
        } else if (this._buyLabel) {
            const prev = this._buyLabel.string;
            this._buyLabel.string = '钱不够';
            this.scheduleOnce(() => {
                if (this._buyLabel && this._buyLabel.isValid) this._buyLabel.string = prev;
            }, 0.8);
        }
    }

    private _refresh(_p: { dayIndex: number }): void {
        const inv = GameApp.inst?.inventory ?? {};
        const label = this.getComponent(Label);
        const term = this._todayTerm();
        if (label) {
            const dayPart = term ? `第 ${TimeSystem.inst.dayIndex} 天·${TimeSystem.inst.seasonName}·〔${term['name'] as string}〕` : `第 ${TimeSystem.inst.dayIndex} 天·${TimeSystem.inst.seasonName}`;
            label.string = `${dayPart} · 金币${inv['gold'] ?? 0} · 种子${inv['carrot_seed'] ?? 0} · 萝卜${inv['carrot'] ?? 0}`;
        }
        this._refreshShops();
        this._refreshIntel();
    }

    /** 今日节气（§6.2 MVP：每季末一个，共 4 个循环）；非节气日返回 null */
    private _todayTerm(): Record<string, unknown> | null {
        const rows = DataManager.inst.getRows('catalogs/calendar');
        if (!rows.length) return null;
        const dayOfYear = ((TimeSystem.inst.dayIndex - 1) % 56) + 1;
        return rows.find((r) => Number(r['day']) === dayOfYear) ?? null;
    }

    /** 守门人情报行：今晚有防守=红色警报；否则预告下一波日期 */
    private _refreshIntel(): void {
        if (!this._intelLabel?.isValid) return;
        const sys = DefenseSystem.inst;
        if (sys.hasNightTonight()) {
            const intel = sys.intelTonight();
            const brief = intel.map((i) => `${i.monsterName}×${i.count}`).join('、');
            this._intelLabel.string = `⚠ 今晚防守：${brief}！睡前做好准备`;
        } else {
            const next = sys.nextNightDay();
            this._intelLabel.string = next !== null ? `守门人来报：第 ${next} 天夜里有怪物来袭` : '';
        }
    }

    private _refreshShops(): void {
        const inv = GameApp.inst?.inventory ?? {};
        const kinds = EconomySystem.inst.sellableKinds(inv);
        if (this._sellLabel?.isValid) this._sellLabel.string = `卖粮(${kinds})`;
        const price = EconomySystem.inst.getBuyPrice('carrot_seed');
        if (this._buyLabel?.isValid && price !== null) this._buyLabel.string = `买种子${price}金`;
    }

    /** 程序化占位按钮（Graphics，同 PlotView 风格）；返回文本 Label 供动态刷新 */
    private _makeButton(text: string, x: number, y: number, onTap: () => void): Label {
        const node = new Node(`btn_${text}`);
        node.layer = this.node.layer; // 继承 UI_2D，否则相机不渲染
        node.addComponent(UITransform).setContentSize(110, 52);
        node.setPosition(x, y);

        const g = node.addComponent(Graphics)!;
        g.fillColor = new Color(60, 48, 38, 255);
        g.strokeColor = new Color(255, 255, 255, 90);
        g.lineWidth = 2;
        g.roundRect(-55, -26, 110, 52, 10);
        g.fill();
        g.stroke();

        const labelNode = new Node('label');
        labelNode.layer = this.node.layer;
        labelNode.addComponent(UITransform);
        const l = labelNode.addComponent(Label)!;
        l.fontSize = 22;
        l.string = text;
        node.addChild(labelNode);

        node.on(Node.EventType.TOUCH_END, onTap, this);
        this.node.addChild(node);
        return l;
    }
}
