import { _decorator, Component, Node, Label, Graphics, Color, UITransform, Sprite, SpriteFrame } from 'cc';
import { TimeSystem } from '../../../core/TimeSystem';
import { EventBus } from '../../../core/EventBus';
import { DataManager } from '../../../core/DataManager';
import { SpriteLib } from '../../../core/SpriteLib';
import { GameApp } from '../../../app/GameApp';
import { BedtimeDialog } from '../../../ui/BedtimeDialog';
import { DefenseOverlay } from '../../../ui/DefenseOverlay';
import { BuildPanel } from '../../../ui/BuildPanel';
import { DialogPanel } from '../../../ui/DialogPanel';
import { FishingPanel } from '../../../ui/FishingPanel';
import { InteractionManager } from '../interact/InteractionManager';
import { Interactable } from '../interact/Interactable';
import { TerrainData, TT } from '../TerrainData';

const { ccclass } = _decorator;

/**
 * WorldLiving —— 世界场景生活设施装配（M3 收尾，migration-plan 里程碑 M3 ②③④⑤）。
 *
 * - WorldHUD 顶栏（第X天·季·金币）
 * - 床（家门口，Interactable setupSimple → BedtimeDialog，防守夜由 DefenseOverlay 接管）
 * - NPC×2（园艺师/守门人，走近对话 → DialogPanel）
 * - 钓鱼情境化（玩家周边最近水面 → 情境按钮「钓鱼」→ FishingPanel）
 *
 * 面板互斥：任一模态面板 active 时压掉情境按钮（InteractionManager.suppress），
 * 由本组件 update 轮询（M2 验收④：全屏面板时提示被压掉）。
 */
@ccclass('WorldLiving')
export class WorldLiving extends Component {
    private static _inst: WorldLiving | null = null;
    static get inst(): WorldLiving | null { return WorldLiving._inst; }

    private _hud: Label | null = null;
    private _bedtime: BedtimeDialog | null = null;
    private _defense: DefenseOverlay | null = null;
    private _dialog: DialogPanel | null = null;
    private _fishing: FishingPanel | null = null;
    private _build: BuildPanel | null = null;
    private _fishProbe: Interactable | null = null;
    private _player: Node | null = null;
    private _terrain: TerrainData | null = null;

    /** 世界场景装配入口（WorldSpike.start 在玩家创建后调用） */
    static assemble(canvas: Node, layer: number, player: Node, terrain: TerrainData): void {
        if (WorldLiving._inst) { WorldLiving._inst.node.destroy(); WorldLiving._inst = null; }
        const root = new Node('WorldLiving');
        root.layer = layer;
        canvas.addChild(root);
        const comp = root.addComponent(WorldLiving);
        comp._player = player;
        comp._terrain = terrain;
        comp._buildHud(layer);
        comp._buildPanels(canvas, layer);
        comp._buildBed(layer);
        comp._buildNpcs(layer);
        comp._buildFishingProbe(layer);
        comp._buildSeal(layer);
        WorldLiving._inst = comp;
    }

    private _buildHud(layer: number): void {
        const n = new Node('WorldHUD');
        n.layer = this.node.layer;
        n.addComponent(UITransform).setContentSize(700, 44);
        n.setPosition(0, 336);
        this.node.addChild(n);
        const l = n.addComponent(Label);
        l.fontSize = 26;
        l.lineHeight = 32;
        l.color = new Color(255, 244, 214, 255);
        this._hud = l;
        this._refreshHud();
    }

    private _refreshHud(): void {
        if (!this._hud) return;
        const ts = TimeSystem.inst;
        const inv = GameApp.inst?.inventory ?? {};
        const gold = inv['gold'] ?? 0;
        this._hud.string = `第 ${ts.dayIndex} 天·${ts.seasonName}·金币 ${gold}`;
    }

    private _buildPanels(canvas: Node, layer: number): void {
        this._bedtime = BedtimeDialog.create(canvas, layer);
        this._bedtime.defenseOverlay = this._defense = DefenseOverlay.create(canvas, layer);
        this._dialog = DialogPanel.create(canvas, layer);
        this._fishing = FishingPanel.create(canvas, layer);
        this._fishing.node.active = false;
        this._build = BuildPanel.create(canvas, layer);
    }

    /** 封印祭坛：防守区入口 (110,52)，白天布置塔防（BuildPanel） */
    private _buildSeal(layer: number): void {
        void layer;
        const n = this._makePointNode('world_seal', 110, 52, new Color(196, 164, 84, 255), 44, 30);
        const it = n.addComponent(Interactable);
        it.setupSimple('world_seal', '布置封印', 96, () => {
            this._build?.open();
        });
    }

    /** 床：家门口固定点位（出生点 (74,26) 北侧一格），情境按钮「睡觉」 */
    private _buildBed(layer: number): void {
        const bx = 74, by = 24;
        const n = this._makePointNode('world_bed', bx, by, new Color(122, 84, 52, 255), 34, 22);
        const it = n.addComponent(Interactable);
        it.setupSimple('world_bed', '睡觉', 80, () => {
            this._bedtime!.open();
        });
    }

    /** NPC×2：园艺师在房前，守门人在东行路口 */
    private _buildNpcs(layer: number): void {
        const defs: { id: string; name: string; tx: number; ty: number; tint: Color; sprite: string }[] = [
            { id: 'gardener', name: '园艺师·温妮', tx: 76, ty: 29, tint: new Color(96, 150, 90, 255), sprite: 'npc/npc_gardener' },
            { id: 'gatekeeper', name: '守门人·布莱克', tx: 86, ty: 55, tint: new Color(80, 100, 170, 255), sprite: 'npc/npc_gatekeeper' }
        ];
        for (const d of defs) {
            const n = new Node('npc_' + d.id);
            n.layer = this.node.layer;
            n.setPosition((d.tx + 0.5) * 32, -(d.ty + 0.5) * 32 - 14, 0);
            n.addComponent(UITransform).setContentSize(48, 64);
            this.node.addChild(n);
            const g = n.addComponent(Graphics);
            g.fillColor = d.tint;
            g.circle(0, 40, 12); g.fill();          // 头
            g.roundRect(-13, -10, 26, 44, 8); g.fill(); // 身
            const nameN = new Node('name');
            nameN.layer = this.node.layer;
            nameN.addComponent(UITransform).setContentSize(160, 20);
            nameN.setPosition(0, -26);
            n.addChild(nameN);
            const nl = nameN.addComponent(Label);
            nl.fontSize = 16; nl.lineHeight = 20;
            nl.color = new Color(255, 244, 214, 255);
            nl.string = d.name;
            // 素材就绪后换立绘（SpriteLib 异步，同 FarmHUD._makeNpcs 策略）
            const tryArt = (): void => {
                if (!SpriteLib.inst.ready) { this.scheduleOnce(tryArt, 1.2); return; }
                const sf: SpriteFrame | null = SpriteLib.inst.get(d.sprite);
                if (!sf) return;
                const sprN = new Node('art');
                sprN.layer = this.node.layer;
                sprN.addComponent(UITransform).setContentSize(64, 88);
                n.addChild(sprN);
                const sp = sprN.addComponent(Sprite);
                sp.sizeMode = Sprite.SizeMode.CUSTOM;
                sp.spriteFrame = sf;
                g.clear();
            };
            this.scheduleOnce(tryArt, 0.5);
            const it = n.addComponent(Interactable);
            it.setupSimple('npc_' + d.id, '交谈', 72, () => {
                this._dialog!.openNpc(d.id);
            });
        }
    }

    /** 钓鱼探针：常驻可交互点，每帧贴到玩家周边最近水面；无水面时隐藏 */
    private _buildFishingProbe(layer: number): void {
        const n = new Node('world_fishing');
        n.layer = this.node.layer;
        n.addComponent(UITransform).setContentSize(24, 24);
        this.node.addChild(n);
        const g = n.addComponent(Graphics);
        g.fillColor = new Color(90, 160, 210, 200);
        g.circle(0, 0, 10); g.fill();
        g.strokeColor = new Color(230, 244, 255, 255);
        g.lineWidth = 2;
        g.circle(0, 0, 10); g.stroke();
        const it = n.addComponent(Interactable);
        it.setupSimple('world_fishing', '钓鱼', 96, () => {
            if (this._fishing) this._fishing.node.active = true;
        });
        this._fishProbe = it;
    }

    /** WorldSpike.update 每帧调用：钓鱼探针贴水面 + 模态面板压提示 + HUD 刷新 */
    tick(px: number, py: number): void {
        // 1) 钓鱼探针定位：玩家 3 格内最近 Water
        if (this._fishProbe && this._terrain && this._player) {
            const ptx = Math.floor(px / 32), pty = Math.floor(-py / 32);
            let best: { x: number; y: number; d: number } | null = null;
            for (let dy = -3; dy <= 3; dy++) {
                for (let dx = -3; dx <= 3; dx++) {
                    const tx = ptx + dx, ty = pty + dy;
                    if (tx < 0 || ty < 0 || tx >= 128 || ty >= 96) continue;
                    if (this._terrain.get(tx, ty) !== TT.Water) continue;
                    const d = dx * dx + dy * dy;
                    if (!best || d < best.d) best = { x: tx, y: ty, d };
                }
            }
            if (best) {
                this._fishProbe.node.active = true;
                this._fishProbe.node.setPosition((best.x + 0.5) * 32, -(best.y + 0.5) * 32, 0);
            } else {
                this._fishProbe.node.active = false;
            }
        }
        // 2) 模态面板 active 时压掉情境按钮
        const modal = !!(this._bedtime && this._bedtime.node.active) ||
            !!(this._defense && this._defense.node.active) ||
            !!(this._dialog && this._dialog.node.active) ||
            !!(this._fishing && this._fishing.node.active) ||
            !!(this._build && this._build.node.active);
        if (InteractionManager.inst.suppressed !== modal) {
            InteractionManager.inst.suppress(modal);
        }
    }

    private _makePointNode(name: string, tx: number, ty: number, tint: Color, w: number, h: number): Node {
        const n = new Node(name);
        n.layer = this.node.layer;
        n.setPosition((tx + 0.5) * 32, -(ty + 0.5) * 32, 0);
        n.addComponent(UITransform).setContentSize(w + 24, h + 24);
        this.node.addChild(n);
        const g = n.addComponent(Graphics);
        g.fillColor = tint;
        g.roundRect(-w / 2, -h / 2, w, h, 6); g.fill();
        g.strokeColor = new Color(42, 31, 22, 255);
        g.lineWidth = 3;
        g.roundRect(-w / 2, -h / 2, w, h, 6); g.stroke();
        return n;
    }

    protected onLoad(): void {
        EventBus.inst.on('farmChanged', this._refreshHud, this);
        EventBus.inst.on('dayAdvanced', this._refreshHud, this);
        EventBus.inst.on('itemGained', this._refreshHud, this);
        EventBus.inst.on('itemSpent', this._refreshHud, this);
    }

    protected onDestroy(): void {
        EventBus.inst.off('farmChanged', this._refreshHud, this);
        EventBus.inst.off('dayAdvanced', this._refreshHud, this);
        EventBus.inst.off('itemGained', this._refreshHud, this);
        EventBus.inst.off('itemSpent', this._refreshHud, this);
        if (WorldLiving._inst === this) WorldLiving._inst = null;
    }
}
