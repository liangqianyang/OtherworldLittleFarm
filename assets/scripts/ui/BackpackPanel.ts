import { _decorator, Component, Node, UITransform, Graphics, Color, Label } from 'cc';
const { ccclass } = _decorator;

import { EventBus } from '../core/EventBus';
import { DataManager } from '../core/DataManager';
import { GameApp } from '../app/GameApp';
import { SpriteLib } from '../core/SpriteLib';
import { TimeSystem } from '../core/TimeSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { Sprite, SpriteFrame } from 'cc';

type AnyRow = Record<string, unknown>;

const PANEL_W = 460;
const PANEL_H = 440;
const ROW_H = 36;
const LIST_TOP = PANEL_H / 2 - 116;   // 页签栏下方列表起点

/**
 * BackpackPanel —— 背包/商店/图鉴 三合一面板（V3 U1 流程收纳，v3-clarity-ui-ux U1）。
 * 右列 4 钮撤除后，这里是世界场景唯一的流程入口：
 * - 背包：全部持有物品（金币/种子/产出，含卖价）
 * - 商店：4 种子明码标价购买（月光花季节护栏）+ 一键卖粮（谷仓情境按钮之外的常驻入口）
 * - 图鉴：作物/鱼类收录进度（自 CodexPanel 并入紧凑版）
 */
@ccclass('BackpackPanel')
export class BackpackPanel extends Component {
    private _listRoot: Node = null!;
    private _tab: 'bag' | 'shop' | 'codex' = 'bag';
    private _tabBtns: Record<string, Node> = {};

    private static readonly SEED_DEFS: readonly { id: string; name: string }[] = [
        { id: 'carrot_seed', name: '胡萝卜种子' },
        { id: 'tomato_seed', name: '番茄种子' },
        { id: 'pumpkin_seed', name: '南瓜种子' },
        { id: 'moonflower_seed', name: '月光花种子' },
    ];

    onLoad(): void {
        EventBus.inst.on('itemGained', this._rebuild, this);
        EventBus.inst.on('itemSpent', this._rebuild, this);
    }

    onDestroy(): void {
        EventBus.inst.off('itemGained', this._rebuild, this);
        EventBus.inst.off('itemSpent', this._rebuild, this);
    }

    /** GameApp/HUD 调用显示 */
    open(tab?: 'bag' | 'shop' | 'codex'): void {
        if (tab) this._tab = tab;
        this.node.active = true;
        this._rebuild();
    }

    close(): void {
        this.node.active = false;
    }

    /** 程序化创建整个面板（挂在 farm Canvas 下），默认隐藏 */
    static create(parent: Node, layer: number): BackpackPanel {
        const root = new Node('BackpackPanel');
        root.layer = layer;
        root.addComponent(UITransform).setContentSize(PANEL_W, PANEL_H);
        root.setPosition(0, 0);
        parent.addChild(root);

        const g = root.addComponent(Graphics)!;
        g.fillColor = new Color(28, 24, 20, 235);
        g.strokeColor = new Color(255, 255, 255, 120);
        g.lineWidth = 3;
        g.roundRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, 14);
        g.fill();
        g.stroke();

        // 标题
        BackpackPanel._label(root, '背 包', 30, 0, PANEL_H / 2 - 34, 24);

        // 面板本体吞掉触摸，防止点击穿透到后面的地块
        const swallow = (): void => { /* 拦截 */ };
        root.on(Node.EventType.TOUCH_START, swallow);
        root.on(Node.EventType.TOUCH_END, swallow);

        // 页签栏：背包 / 商店 / 图鉴（U1）
        const tabs: { key: 'bag' | 'shop' | 'codex'; text: string }[] = [
            { key: 'bag', text: '背包' },
            { key: 'shop', text: '商店' },
            { key: 'codex', text: '图鉴' },
        ];
        const btns: Record<string, Node> = {};
        for (let i = 0; i < tabs.length; i++) {
            const t = tabs[i];
            const bn = BackpackPanel._button(root, t.text, -130 + i * 130, PANEL_H / 2 - 78, () => {
                comp._selectTab(t.key);
            }, 116, 34);
            btns[t.key] = bn;
        }

        // 列表容器
        const listRoot = new Node('list');
        listRoot.layer = layer;
        listRoot.addComponent(UITransform);
        root.addChild(listRoot);

        // 关闭按钮（右上角，加大加明显）
        BackpackPanel._button(
            root, '×', PANEL_W / 2 - 44, PANEL_H / 2 - 36,
            () => { root.getComponent(BackpackPanel)!.close(); },
            64, 48,
        );

        const comp = root.addComponent(BackpackPanel);
        comp._listRoot = listRoot;
        comp._tabBtns = btns;
        root.active = false;
        return comp;
    }

    private _selectTab(t: 'bag' | 'shop' | 'codex'): void {
        this._tab = t;
        this._rebuild();
    }

    private _rebuild(): void {
        if (!this.node.active) return;
        // 页签高亮重绘
        for (const key of Object.keys(this._tabBtns)) {
            const bn = this._tabBtns[key];
            const bg = bn.getComponent(Graphics);
            if (bg) {
                bg.clear();
                bg.fillColor = key === this._tab ? new Color(96, 70, 46, 255) : new Color(60, 48, 38, 255);
                bg.strokeColor = key === this._tab ? new Color(242, 193, 78, 255) : new Color(255, 255, 255, 90);
                bg.lineWidth = 2;
                bg.roundRect(-58, -17, 116, 34, 8);
                bg.fill();
                bg.stroke();
            }
        }
        this._listRoot.destroyAllChildren();
        if (this._tab === 'shop') this._buildShop();
        else if (this._tab === 'codex') this._buildCodex();
        else this._buildBag();
    }

    // —— 背包页 ——
    private _buildBag(): void {
        const inv = GameApp.inst?.inventory ?? {};
        const rows = DataManager.inst.getRows('catalogs/items') as AnyRow[];

        // 排序：金币 → 种子 → 作物产出 → 其他；__ 前缀是元数据（如 __guide），不是物品，滤掉
        const order = (cat: unknown): number => (cat === 'currency' ? 0 : cat === 'seed' ? 1 : cat === 'crop_product' ? 2 : 3);
        const owned: AnyRow[] = [];
        for (const r of rows) {
            const id = String(r['id']);
            if (id.startsWith('__')) continue;
            if ((inv[id] ?? 0) > 0) owned.push(r);
        }
        owned.sort((a, b) => order(a['category']) - order(b['category']));

        let y = LIST_TOP;
        if (owned.length === 0) {
            BackpackPanel._label(this._listRoot, '空空如也…种点什么吧', 20, 0, y, 22);
        }
        for (const r of owned) {
            const id = String(r['id']);
            const name = String(r['name'] ?? id);
            const sell = typeof r['sellPrice'] === 'number' ? ` 卖${r['sellPrice']}金` : '';
            // 素材就绪时给行首加 16px×2 图标（只有已生成的素材有图标）
            if (SpriteLib.inst.ready) {
                const iconPath = id === 'gold' ? 'ui/icon_gold'
                    : id.endsWith('_seed') ? 'ui/icon_seed'
                    : id === 'carrot' ? 'ui/icon_carrot'
                    : id === 'tomato' ? 'ui/icon_tomato'
                    : id === 'pumpkin' ? 'ui/icon_pumpkin'
                    : id === 'moonflower' ? 'ui/icon_moonflower'
                    : id === 'crucian' ? 'ui/icon_crucian'
                    : id === 'perch' ? 'ui/icon_perch'
                    : id === 'moonfish' ? 'ui/icon_moonfish'
                    : id === 'berry' ? 'ui/icon_berry'
                    : id === 'herb' ? 'ui/icon_herb'
                    : id === 'wood' ? 'ui/icon_wood'
                    : id === 'slime_gel' ? 'ui/icon_gel' : null;
                const frame = iconPath ? SpriteLib.inst.get(iconPath) : null;
                if (frame) BackpackPanel._icon(this._listRoot, frame, -PANEL_W / 2 + 44, y);
            }
            BackpackPanel._label(this._listRoot, `${name} ×${inv[id]}${sell}`, 20, 0, y, 22);
            y -= ROW_H;
        }
    }

    // —— 商店页：4 种子购买 + 一键卖粮 ——
    private _buildShop(): void {
        const inv = GameApp.inst?.inventory ?? {};
        let y = LIST_TOP;
        BackpackPanel._label(this._listRoot, `金币 ${inv['gold'] ?? 0}`, 20, 0, y, 20).color = new Color(242, 193, 78, 255);
        y -= ROW_H;
        for (const s of BackpackPanel.SEED_DEFS) {
            const price = EconomySystem.inst.getBuyPrice(s.id);
            const n = BackpackPanel._button(this._listRoot, '', 0, y, () => { /* 占位，下行替换 */ }, 400, 40);
            // 重绘行底为暗色（按钮默认棕色太抢眼）
            const g = n.getComponent(Graphics)!;
            g.clear();
            g.fillColor = new Color(40, 44, 64, 255);
            g.strokeColor = new Color(90, 96, 130, 255);
            g.lineWidth = 2;
            g.roundRect(-200, -20, 400, 40, 8);
            g.fill();
            g.stroke();
            const lbl = BackpackPanel._label(n, `${s.name}  ${price ?? '?'}金（有${inv[s.id] ?? 0}）`, 20, 0, 0, 20);
            n.off(Node.EventType.TOUCH_END);
            n.on(Node.EventType.TOUCH_END, () => this._buySeed(s.id, lbl));
            y -= 46;
        }
        // 一键卖粮（U1：谷仓情境按钮之外的常驻入口）
        const kinds = EconomySystem.inst.sellableKinds(inv);
        const sellBtn = BackpackPanel._button(this._listRoot, `一键卖粮(${kinds})`, 0, y - 6, () => this._sellAll(), 240, 46);
        void sellBtn;
        BackpackPanel._label(this._listRoot, '出门左走到谷仓同样可以出售', 20, 0, y - 40, 16).color = new Color(160, 160, 160, 255);
    }

    /** 单行购买（原 WorldLiving._buySeed 迁移）：月光花季节护栏 + 余额不足闪提示 */
    private _buySeed(seedId: string, lbl: Label): void {
        const app = GameApp.inst; if (!app) return;
        const cropRow = DataManager.inst.getRow('catalogs/crops', seedId.replace(/_seed$/, ''));
        const seasons = Array.isArray(cropRow ? cropRow['seasons'] : null) ? (cropRow!['seasons'] as string[]) : [];
        if (!TimeSystem.cropInSeason(seasons)) {
            this._flash(lbl, `${String(cropRow ? cropRow['name'] ?? '' : '')} 非当季`);
            return;
        }
        if (EconomySystem.inst.buySeed(seedId, app.inventory)) {
            app.persist('shop_buy');
            this._rebuild();
        } else {
            this._flash(lbl, '金币不足');
        }
    }

    private _sellAll(): void {
        const app = GameApp.inst; if (!app) return;
        if (EconomySystem.inst.sellableKinds(app.inventory) <= 0) return;
        EconomySystem.inst.sellAllProducts(app.inventory);
        app.persist('shop_sell');
        this._rebuild();
    }

    private _flash(lbl: Label, msg: string): void {
        const prev = lbl.string;
        lbl.string = msg;
        this.scheduleOnce(() => { if (lbl.isValid) lbl.string = prev; }, 0.9);
    }

    // —— 图鉴页：作物/鱼类收录进度（自 CodexPanel 并入紧凑版；作物双列防溢出）——
    private _buildCodex(): void {
        const owned = GameApp.inst?.codex ?? [];
        const has = (id: string): boolean => owned.indexOf(id) >= 0;
        let y = LIST_TOP;
        BackpackPanel._label(this._listRoot, '—— 作物 ——', 20, 0, y, 18).color = new Color(180, 180, 180, 255);
        y -= 28;
        const crops = (DataManager.inst.getRows('catalogs/crops') as AnyRow[]).filter((r) => !String(r['id']).startsWith('__'));
        for (let i = 0; i < crops.length; i++) {
            const r = crops[i];
            const id = String(r['id']);
            const ok = has(id);
            const l = BackpackPanel._label(this._listRoot, `${ok ? String(r['name'] ?? id) : '？？？？？'}${ok ? ' ✓' : ''}`, 20, i % 2 === 0 ? -110 : 110, y, 20);
            l.color = ok ? new Color(235, 235, 235, 255) : new Color(120, 120, 120, 255);
            if (i % 2 === 1) y -= 28;
        }
        y -= 34;
        BackpackPanel._label(this._listRoot, '—— 鱼类 ——', 20, 0, y, 18).color = new Color(180, 180, 180, 255);
        y -= 28;
        const fish = (DataManager.inst.getRows('catalogs/fish') as AnyRow[]).filter((r) => !String(r['id']).startsWith('__'));
        for (const r of fish) {
            const id = String(r['id']);
            const ok = has(id);
            const l = BackpackPanel._label(this._listRoot, `${ok ? String(r['name'] ?? id) : '？？？？？'}${ok ? ' ✓' : ''}`, 20, 0, y, 20);
            l.color = ok ? new Color(235, 235, 235, 255) : new Color(120, 120, 120, 255);
            y -= 28;
        }
    }

    // —— 程序化 UI 小工具 ——
    private static _label(parent: Node, text: string, _size: number, x: number, y: number, fontSize: number): Label {
        const n = new Node('lbl');
        n.layer = parent.layer;
        n.addComponent(UITransform);
        n.setPosition(x, y);
        const l = n.addComponent(Label)!;
        l.fontSize = fontSize;
        l.lineHeight = fontSize + 6;
        l.string = text;
        parent.addChild(n);
        return l;
    }

    private static _icon(parent: Node, frame: SpriteFrame, x: number, y: number): void {
        const n = new Node('icon');
        n.layer = parent.layer;
        n.addComponent(UITransform).setContentSize(32, 32); // 16px 素材 ×2 整数缩放
        n.setPosition(x, y);
        const s = n.addComponent(Sprite)!;
        s.sizeMode = Sprite.SizeMode.CUSTOM; // 先设 CUSTOM：默认 TRIMMED 赋图会把尺寸重置回图片原始 16px
        s.spriteFrame = frame;
        parent.addChild(n);
    }

    private static _button(parent: Node, text: string, x: number, y: number, onTap: () => void, w = 56, h = 44): Node {
        const n = new Node('btn');
        n.layer = parent.layer;
        n.addComponent(UITransform).setContentSize(w, h);
        n.setPosition(x, y);
        const g = n.addComponent(Graphics)!;
        g.fillColor = new Color(60, 48, 38, 255);
        g.strokeColor = new Color(255, 255, 255, 90);
        g.lineWidth = 2;
        g.roundRect(-w / 2, -h / 2, w, h, 8);
        g.fill();
        g.stroke();
        if (text) BackpackPanel._label(n, text, 20, 0, 0, 24);
        // 拦截触摸：面板本体 + 按钮
        n.on(Node.EventType.TOUCH_END, onTap);
        return n;
    }
}
