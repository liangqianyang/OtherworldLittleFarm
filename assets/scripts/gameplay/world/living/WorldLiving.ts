import { _decorator, Component, Node, Label, Graphics, Color, UITransform, Sprite, SpriteFrame, tween, Vec3 } from 'cc';
import { TimeSystem } from '../../../core/TimeSystem';
import { EventBus } from '../../../core/EventBus';
import { SpriteLib } from '../../../core/SpriteLib';
import { GameApp } from '../../../app/GameApp';
import { BedtimeDialog } from '../../../ui/BedtimeDialog';
import { DefenseOverlay } from '../../../ui/DefenseOverlay';
import { BuildPanel } from '../../../ui/BuildPanel';
import { DialogPanel } from '../../../ui/DialogPanel';
import { FishingPanel } from '../../../ui/FishingPanel';
import { BackpackPanel } from '../../../ui/BackpackPanel';
import { TutorialGuide } from '../../../ui/TutorialGuide';
import { DebugPanel } from '../../../ui/DebugPanel';
import { EconomySystem } from '../../../systems/EconomySystem';
import { FarmWorldBinder } from '../farm/FarmWorldBinder';
import { InteractionManager } from '../interact/InteractionManager';
import { Interactable } from '../interact/Interactable';
import { SCREEN_UI_LAYER } from '../JoystickController';
import { TerrainData, TT, MAP_W, MAP_H, TILE, LANDMARKS, DEF_FIELD } from '../TerrainData';

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
    private _backpack: BackpackPanel | null = null;
    private _intelLabel: Label | null = null;   // U2 Intel 转 toast：仅今晚有防守时显示红字警报
    private _npcNames: { node: Node; tx: number; ty: number }[] = [];   // U3 名牌纪律：只显示最近 NPC 的名字
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
        comp._buildSigns(layer);
        comp._buildDefenseField(layer);
        comp._buildDecor(layer);
        comp._buildFishingProbe(layer);
        comp._buildSeal(layer);
        comp._buildFarm(layer);
        comp._buildShops(canvas, layer);
        TutorialGuide.maybeStart(canvas, layer);
        // DebugPanel 挂到世界场景（window.__debug 自动化通道；键盘调试入口同样可用）
        // 与 GameApp 同一门控：正式构建不挂调试面板
        if (GameApp.inst?.DEBUG) root.addComponent(DebugPanel);
        WorldLiving._inst = comp;
    }

    /** U2 顶栏合一（v3-clarity-ui-ux U2）：HUD 收进左上角芯片 360×48，屏中只留一行 */
    private _buildHud(layer: number): void {
        const n = new Node('WorldHUD');
        n.layer = this.node.layer;
        n.addComponent(UITransform).setContentSize(360, 48);
        n.setPosition(-440, 316);
        this.node.addChild(n);
        const l = n.addComponent(Label);
        l.fontSize = 20;
        l.lineHeight = 26;
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

    /** M6 农场区搬迁：3×3 地块世界化装配（旧档 plots 确定性映射，同档双入口）+ 谷仓地标 */
    private _buildFarm(layer: number): void {
        const root = this.node.getParent();
        if (!root) return;
        this._buildBarn(root, layer); // 先建谷仓=渲染在地块之下
        FarmWorldBinder.bind(root, layer);
        EventBus.inst.on('farmChanged', this._onFarmEvt, this);
    }

    /** 谷仓地标：V3 footprint(66,36)-(69,39) 中心，POI(67,39)=门侧交互点（LANDMARKS 单源）；卖粮情境按钮 */
    private _buildBarn(root: Node, layer: number): void {
        const n = new Node('farm_barn');
        n.layer = layer;
        n.addComponent(UITransform).setContentSize(96, 96);
        const cx = (LANDMARKS.barn.x0 + LANDMARKS.barn.x1 + 1) / 2;
        const cy = (LANDMARKS.barn.y0 + LANDMARKS.barn.y1 + 1) / 2;
        n.setPosition(cx * 32, -cy * 32, 0);
        root.addChild(n);
        // 谷仓挂卖粮（P1 出货点缺位修复，裁决=谷仓方案零新素材）：走近弹「卖粮」情境按钮，一键清仓（U1 单段制）
        const it = n.addComponent(Interactable);
        it.setupSimple('farm_barn', '卖粮', 96, () => this._doSell());
        let tryArtCount = 0;
        const tryArt = (): void => {
            this._applyArt();
            if (!SpriteLib.inst.ready && ++tryArtCount < 40) this.scheduleOnce(tryArt, 1.2); // 未就绪才续查；就绪后由 sprites_ready 事件兜底
        };
        this.scheduleOnce(tryArt, 0.5);
    }

    private _onFarmEvt(action?: { action?: string }): void {
        // 素材就绪事件：幂等重挂所有贴图（轮询链在冻结页会被掐断，事件驱动兜底）
        if (action && action.action === 'sprites_ready') this._applyArt();
        this._refreshHud();
    }

    /** 幂等应用全部 AI 贴图：barn/bed/npc×2/seal（有 art 子节点即跳过）；sprites_ready 与轮询双通道调用 */
    private _applyArt(): void {
        const lib = SpriteLib.inst;
        if (!lib.ready) return;
        const mount = (n: Node, key: string, w: number, h: number, ox = 0, oy = 0): boolean => {
            const sf = lib.get(key);
            if (!sf) return false;
            if (!n.getChildByName('art')) {
                const sprN = new Node('art');
                sprN.layer = n.layer;
                sprN.addComponent(UITransform).setContentSize(w, h);
                sprN.setPosition(ox, oy);
                const sp = sprN.addComponent(Sprite);
                sp.sizeMode = Sprite.SizeMode.CUSTOM;
                sp.spriteFrame = sf;
                n.addChild(sprN);
            }
            const g = n.getComponent(Graphics);
            if (g && g.isValid) g.clear();
            return true;
        };
        const root = this.node.getParent();
        if (root) {
            const barn = root.getChildByName('farm_barn');
            if (barn && !barn.getComponent(Sprite)) {
                const sf = lib.get('adventure/barn');
                if (sf) {
                    const sp = barn.addComponent(Sprite);
                    sp.sizeMode = Sprite.SizeMode.CUSTOM;
                    sp.spriteFrame = sf;
                }
            }
        }
        const bed = this.node.getChildByName('world_bed');
        if (bed) mount(bed, 'decor/bed', 56, 44, 0, 8);
        const npcArt: Record<string, string> = { gardener: 'npc/npc_gardener', gatekeeper: 'npc/npc_gatekeeper', fisher: 'npc/npc_fisher' };
        for (const id of Object.keys(npcArt)) {
            const npc = this.node.getChildByName('npc_' + id);
            if (npc) mount(npc, npcArt[id], 64, 88, 0, 18);
        }
        const seal = this.node.getChildByName('world_seal');
        // 贴图挂 art 子节点：seal 节点已有 Graphics（_makePointNode），同节点再 addComponent(Sprite)
        // 会被引擎拒绝（warn 12002 "already have one"）导致祭坛隐形；mount 走子节点并清掉占位 Graphics
        if (seal && mount(seal, 'adventure/world_seal', 88, 88)) {
            seal.getComponent(UITransform)!.setContentSize(88, 88);
        }
        const house = this.node.getChildByName('house');
        if (house) mount(house, 'world/house', 128, 112, 0, -8);
        // V4 布置场道具 + 散布物（缺素材时保留 Graphics 占位，不报错）
        for (const c of this.node.children) {
            if (c.name.indexOf('def_fence_') === 0) mount(c, 'world/fence', 32, 32);
            else if (c.name.indexOf('def_spike_') === 0) mount(c, 'world/spike_trap', 32, 24);
            else if (c.name.indexOf('def_plant_flytrap_') === 0) mount(c, 'world/defense_flytrap', 32, 48, 0, 10);
            else if (c.name.indexOf('def_plant_glow_') === 0) mount(c, 'world/defense_glow', 32, 48, 0, 10);
            else if (c.name.indexOf('scat_flower_') === 0) mount(c, 'world/flower_patch', 28, 28);
            else if (c.name.indexOf('scat_mushroom_') === 0) mount(c, 'world/mushroom', 24, 24);
            else if (c.name.indexOf('scat_tuft_') === 0) mount(c, 'world/grass_tuft', 26, 20);
            else if (c.name.indexOf('scat_butterfly_') === 0) mount(c, 'world/butterfly', 24, 20);
            else if (c.name.indexOf('fish_shadow_') === 0) mount(c, 'world/fish_shadow', 44, 22);
        }
    }

    /** U1 流程收纳（v3-clarity-ui-ux U1）：右列 4 钮撤除 → 右下角唯一「背包」入口；
     *  商店（买种子/一键卖粮）与图鉴并入 BackpackPanel 页签；谷仓仍是卖粮的世界层入口 */
    private _buildShops(canvas: Node, layer: number): void {
        void layer;
        this._backpack = BackpackPanel.create(canvas, this.node.layer);
        this._mkBtn('背包', 560, -120, () => {
            if (!this._backpack) return;
            if (this._backpack.node.active) this._backpack.close(); else this._backpack.open();
        });
    }

    /** 卖粮（谷仓情境按钮入口）：一键清仓可售产出并持久化。U1 后右列按钮已撤，无需两段确认的按钮态文案 */
    private _doSell(): void {
        const app = GameApp.inst; if (!app) return;
        const kinds = EconomySystem.inst.sellableKinds(app.inventory);
        if (kinds <= 0) return;
        EconomySystem.inst.sellAllProducts(app.inventory);
        app.persist('shop_sell');
    }

    private _mkBtn(text: string, x: number, y: number, onTap: () => void): Label {
        const node = new Node(`wbtn_${text}`);
        node.layer = this.node.layer;
        node.addComponent(UITransform).setContentSize(110, 88);
        node.setPosition(x, y);
        const g = node.addComponent(Graphics)!;
        g.fillColor = new Color(60, 48, 38, 255);
        g.strokeColor = new Color(255, 255, 255, 90);
        g.lineWidth = 2;
        g.roundRect(-55, -44, 110, 88, 10);
        g.fill(); g.stroke();
        const ln = new Node('label');
        ln.layer = this.node.layer;
        ln.addComponent(UITransform);
        const l = ln.addComponent(Label)!;
        l.fontSize = 22; l.string = text;
        node.addChild(ln);
        node.on(Node.EventType.TOUCH_END, onTap, this);
        this.node.addChild(node);
        return l;
    }

    private _buildPanels(canvas: Node, layer: number): void {
        this._bedtime = BedtimeDialog.create(canvas, layer);
        this._bedtime.defenseOverlay = this._defense = DefenseOverlay.create(canvas, layer);
        this._dialog = DialogPanel.create(canvas, layer);
        this._fishing = FishingPanel.create(canvas, layer);
        this._fishing.node.active = false;
        this._build = BuildPanel.create(canvas, layer);
    }

    /** 封印祭坛：V3 封印台 (59,25)-(61,27)，祭坛 (60,26)（LANDMARKS 单源，出广场 18.4 格）；
     *  白天布置塔防（BuildPanel）；裂纹贴片提示夜怪来向 */
    private _buildSeal(layer: number): void {
        void layer;
        const n = this._makePointNode('world_seal', LANDMARKS.altar.x, LANDMARKS.altar.y, new Color(196, 164, 84, 255), 44, 30);
        // 裂纹贴片（P1 防守区可读性）：祭坛台西缘/北缘锯齿裂纹=夜战 A/B 入口来向的世界层提示
        const cr = new Node('seal_cracks');
        cr.layer = this.node.layer;
        cr.setPosition(n.position.x, n.position.y, 0);
        cr.addComponent(UITransform).setContentSize(200, 200);
        const cg = cr.addComponent(Graphics)!;
        cg.strokeColor = new Color(70, 52, 36, 200);
        cg.lineWidth = 3;
        cg.moveTo(-70, 40); cg.lineTo(-52, 26); cg.lineTo(-64, 8); cg.lineTo(-46, -6); cg.lineTo(-58, -24); cg.stroke();
        cg.moveTo(34, 70); cg.lineTo(24, 54); cg.lineTo(42, 44); cg.lineTo(30, 28); cg.stroke();
        this.node.addChild(cr);
        let tryArtCount = 0;
        const tryArt = (): void => {
            this._applyArt();
            if (!SpriteLib.inst.ready && ++tryArtCount < 40) this.scheduleOnce(tryArt, 1.2);
        };
        this.scheduleOnce(tryArt, 0.5);
        const it = n.addComponent(Interactable);
        it.setupSimple('world_seal', '布置封印', 96, () => {
            this._build?.open();
        });
    }

    /** 床：居所 (44,35)-(47,37) 东门口 (48,38)（LANDMARKS 单源，出生点北侧两格），情境按钮「睡觉」；decor/bed 贴图化 */
    private _buildBed(layer: number): void {
        void layer;
        const bx = LANDMARKS.bed.x, by = LANDMARKS.bed.y;
        const n = this._makePointNode('world_bed', bx, by, new Color(122, 84, 52, 255), 34, 22);
        let tryArtCount = 0;
        const tryArt = (): void => {
            this._applyArt();
            if (!SpriteLib.inst.ready && ++tryArtCount < 40) this.scheduleOnce(tryArt, 1.2);
        };
        this.scheduleOnce(tryArt, 0.5);
        const it = n.addComponent(Interactable);
        it.setupSimple('world_bed', '睡觉', 80, () => {
            this._bedtime!.open();
        });
    }

    /** NPC×3（V3/V4 LANDMARKS 单源）：园艺师守广场西口 (45,42)，守门人 V4 移守门台西侧 (46,23)，
     *  钓鱼翁 V4 坐码头 Deck (37,54)；U3 名牌纪律：默认全部隐藏，tick 里只点亮距玩家最近的一个（≤8 格） */
    private _buildNpcs(layer: number): void {
        const defs: { id: string; name: string; tx: number; ty: number; tint: Color; sprite: string }[] = [
            { id: 'gardener', name: '园艺师·温妮', tx: LANDMARKS.gardener.x, ty: LANDMARKS.gardener.y, tint: new Color(96, 150, 90, 255), sprite: 'npc/npc_gardener' },
            { id: 'gatekeeper', name: '守门人·布莱克', tx: LANDMARKS.gatekeeper.x, ty: LANDMARKS.gatekeeper.y, tint: new Color(80, 100, 170, 255), sprite: 'npc/npc_gatekeeper' },
            { id: 'fisher', name: '钓鱼翁·老周', tx: 37, ty: 54, tint: new Color(90, 140, 180, 255), sprite: 'npc/npc_fisher' }
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
            nameN.active = false;   // U3：tick 决定唯一可见名牌
            this._npcNames.push({ node: nameN, tx: d.tx, ty: d.ty });
            // 素材就绪后换立绘：统一走 _applyArt（sprites_ready 事件 + 轮询兜底）
            let tryArtCount = 0;
            const tryArt = (): void => {
                this._applyArt();
                if (!SpriteLib.inst.ready && ++tryArtCount < 40) this.scheduleOnce(tryArt, 1.2);
            };
            this.scheduleOnce(tryArt, 0.5);
            const it = n.addComponent(Interactable);
            it.setupSimple('npc_' + d.id, '交谈', 72, () => {
                this._dialog!.openNpc(d.id);
            });
        }
    }

    /** 路牌×3（U3 浮字纪律：去文字改方向箭头木牌，指引交给 CompassHUD POI）：
     *  (49,36) 北▲ / (60,38) 东▶ / (37,51) 南▼，LANDMARKS.signs 单源 */
    private _buildSigns(layer: number): void {
        for (let i = 0; i < LANDMARKS.signs.length; i++) {
            const s = LANDMARKS.signs[i];
            const n = new Node('sign_' + s.x + '_' + s.y);
            n.layer = layer;
            n.setPosition((s.x + 0.5) * 32, -(s.y + 0.5) * 32, 0);
            n.addComponent(UITransform).setContentSize(40, 40);
            const g = n.addComponent(Graphics);
            g.fillColor = new Color(74, 52, 34, 235);
            g.roundRect(-7, -18, 14, 36, 3);        // 牌柱
            g.fill();
            g.fillColor = new Color(96, 68, 44, 245);
            g.roundRect(-16, 2, 32, 22, 4);         // 牌板
            g.fill();
            g.strokeColor = new Color(42, 31, 22, 255);
            g.lineWidth = 2;
            g.roundRect(-16, 2, 32, 22, 4);
            g.stroke();
            g.fillColor = new Color(255, 240, 205, 255);
            // 方向三角：牌板中心 (0,13)，按 sign 序 上/右/下
            if (i === 0) { g.moveTo(0, 19); g.lineTo(-6, 9); g.lineTo(6, 9); }
            else if (i === 1) { g.moveTo(9, 13); g.lineTo(-2, 19); g.lineTo(-2, 7); }
            else { g.moveTo(0, 7); g.lineTo(-6, 17); g.lineTo(6, 17); }
            g.close();
            g.fill();
            this.node.addChild(n);
        }
    }

    /** V4 门前布置场（DEF_FIELD 单源，北支路 x48 居中）：ghost 半透明白格阵 + 栅栏列 + 刺桩 + 哨戒植物；
     *  纯视觉示意（白天真布置仍走祭坛 BuildPanel，夜战在 DefenseOverlay），素材缺省时保持占位 */
    private _buildDefenseField(layer: number): void {
        const grid = new Node('def_field_grid');
        grid.layer = this.node.layer;
        grid.addComponent(UITransform).setContentSize(360, 200);
        const gg = grid.addComponent(Graphics);
        gg.fillColor = new Color(255, 255, 255, 18);
        gg.strokeColor = new Color(240, 240, 255, 70);
        gg.lineWidth = 1.5;
        for (const f of [DEF_FIELD.west, DEF_FIELD.east]) {
            for (let y = f.y0; y <= f.y1; y++) {
                for (let x = f.x0; x <= f.x1; x++) {
                    gg.rect(x * 32 + 1, -(y + 1) * 32 + 1, 30, 30);   // 半透明白格（ghost 阵概念图同款）
                    gg.fill();
                    gg.stroke();
                }
            }
        }
        this.node.addChild(grid);
        // 栅栏列：西场西缘 x42 / 东场东缘 x54（y25-29 各 5 段）
        for (let y = 25; y <= 29; y++) {
            for (const fx of [42, 54]) {
                const n = new Node(`def_fence_${fx}_${y}`);
                n.layer = this.node.layer;
                n.addComponent(UITransform).setContentSize(32, 32);
                n.setPosition((fx + 0.5) * 32, -(y + 0.5) * 32, 0);
                this.node.addChild(n);
            }
        }
        // 刺桩 ×4（场内）+ 哨戒植物 ×4（场角，廊口两株对峙）
        const props: { name: string; x: number; y: number; w: number; h: number }[] = [
            { name: 'def_spike_44_27', x: 44, y: 27, w: 32, h: 24 },
            { name: 'def_spike_46_28', x: 46, y: 28, w: 32, h: 24 },
            { name: 'def_spike_50_28', x: 50, y: 28, w: 32, h: 24 },
            { name: 'def_spike_52_27', x: 52, y: 27, w: 32, h: 24 },
            { name: 'def_plant_flytrap_47_29', x: 47, y: 29, w: 32, h: 48 },
            { name: 'def_plant_glow_49_29', x: 49, y: 29, w: 32, h: 48 },
            { name: 'def_plant_glow_43_25', x: 43, y: 25, w: 32, h: 48 },
            { name: 'def_plant_flytrap_53_25', x: 53, y: 25, w: 32, h: 48 }
        ];
        for (const p of props) {
            const n = new Node(p.name);
            n.layer = this.node.layer;
            n.addComponent(UITransform).setContentSize(p.w, p.h);
            n.setPosition((p.x + 0.5) * 32, -(p.y + 0.5) * 32, 0);
            this.node.addChild(n);
        }
    }

    /** V3 新装饰（LANDMARKS 单源）：居所小屋（V4 换 AI 贴图）/营地篝火/水井/花丛×2 + V4 散布物 */
    private _buildDecor(layer: number): void {
        // 居所 (44,35)-(47,37)：墙+三角顶+门（中心 (46,36.5)）
        const h = new Node('house');
        h.layer = layer;
        h.addComponent(UITransform).setContentSize(128, 112);
        h.setPosition((LANDMARKS.house.x0 + LANDMARKS.house.x1 + 1) / 2 * 32, -(LANDMARKS.house.y0 + LANDMARKS.house.y1 + 1) / 2 * 32, 0);
        const hg = h.addComponent(Graphics);
        hg.fillColor = new Color(126, 92, 62, 255);
        hg.roundRect(-58, -44, 116, 78, 4); hg.fill();          // 墙
        hg.strokeColor = new Color(52, 38, 26, 255);
        hg.lineWidth = 3;
        hg.roundRect(-58, -44, 116, 78, 4); hg.stroke();
        hg.fillColor = new Color(158, 74, 54, 255);
        hg.moveTo(-66, 34); hg.lineTo(0, 66); hg.lineTo(66, 34); hg.close(); hg.fill();  // 三角顶
        hg.fillColor = new Color(64, 46, 32, 255);
        hg.roundRect(-12, -44, 24, 34, 3); hg.fill();           // 门
        this.node.addChild(h);
        // 营地篝火 (10,40)：林地出发 clearing，石圈+火焰
        const f = new Node('campfire');
        f.layer = layer;
        f.addComponent(UITransform).setContentSize(48, 48);
        f.setPosition((LANDMARKS.campfire.x + 0.5) * 32, -(LANDMARKS.campfire.y + 0.5) * 32, 0);
        const fg = f.addComponent(Graphics);
        fg.fillColor = new Color(96, 92, 88, 255);
        for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2;
            fg.circle(Math.cos(a) * 15, Math.sin(a) * 11, 4); fg.fill();
        }
        fg.fillColor = new Color(226, 120, 44, 255);
        fg.moveTo(0, 16); fg.lineTo(-8, -2); fg.lineTo(0, -8); fg.lineTo(8, -2); fg.close(); fg.fill();
        fg.fillColor = new Color(250, 196, 88, 255);
        fg.moveTo(0, 9); fg.lineTo(-4, -1); fg.lineTo(4, -1); fg.close(); fg.fill();
        this.node.addChild(f);
        // 水井 (54,44)：石圈+木架
        const w = new Node('well');
        w.layer = layer;
        w.addComponent(UITransform).setContentSize(56, 64);
        w.setPosition((LANDMARKS.well.x + 0.5) * 32, -(LANDMARKS.well.y + 0.5) * 32, 0);
        const wg = w.addComponent(Graphics);
        wg.fillColor = new Color(112, 108, 104, 255);
        wg.circle(0, -6, 18); wg.fill();
        wg.fillColor = new Color(30, 60, 90, 255);
        wg.circle(0, -6, 11); wg.fill();
        wg.strokeColor = new Color(80, 58, 40, 255);
        wg.lineWidth = 4;
        wg.moveTo(-12, 8); wg.lineTo(-12, 30); wg.moveTo(12, 8); wg.lineTo(12, 30);
        wg.moveTo(-14, 30); wg.lineTo(14, 30); wg.stroke();
        this.node.addChild(w);
        // 花丛×2：小点缀无交互
        for (const fl of LANDMARKS.flowers) {
            const fn = new Node('flower_' + fl.x + '_' + fl.y);
            fn.layer = layer;
            fn.addComponent(UITransform).setContentSize(24, 24);
            fn.setPosition((fl.x + 0.5) * 32, -(fl.y + 0.5) * 32, 0);
            const fng = fn.addComponent(Graphics);
            const cols = [new Color(232, 120, 140, 255), new Color(240, 208, 96, 255), new Color(236, 236, 240, 255)];
            for (let i = 0; i < 4; i++) {
                const ox = (i % 2 === 0 ? -5 : 5) + ((i > 1 ? 3 : -3));
                const oy = (i < 2 ? 4 : -4);
                fng.fillColor = cols[i % 3];
                fng.circle(ox, oy, 3.5); fng.fill();
            }
            this.node.addChild(fn);
        }
        // ---- V4 散布物（参考图观感：花丛/蘑菇/草簇占位小点，素材就绪后由 _applyArt 换贴图）----
        const scat = (name: string, x: number, y: number, w: number, h: number, col: Color): Node => {
            const n = new Node(name);
            n.layer = layer;
            n.addComponent(UITransform).setContentSize(w, h);
            n.setPosition((x + 0.5) * 32, -(y + 0.5) * 32, 0);
            const g = n.addComponent(Graphics);
            g.fillColor = col;
            g.circle(0, 0, 3); g.fill();
            this.node.addChild(n);
            return n;
        };
        const flowerCol = new Color(232, 150, 170, 255);
        const mushCol = new Color(188, 142, 110, 255);
        const tuftCol = new Color(70, 130, 62, 255);
        for (const [i, p] of ([[52, 36], [55, 47], [42, 34], [57, 50]] as [number, number][]).entries()) scat(`scat_flower_${i}`, p[0], p[1], 28, 28, flowerCol);
        for (const [i, p] of ([[41, 32], [49, 48], [53, 35]] as [number, number][]).entries()) scat(`scat_mushroom_${i}`, p[0], p[1], 24, 24, mushCol);
        for (const [i, p] of ([[43, 31], [46, 33], [52, 32], [41, 38], [55, 41], [47, 45], [52, 47], [43, 44]] as [number, number][]).entries()) scat(`scat_tuft_${i}`, p[0], p[1], 26, 20, tuftCol);
        // 蝴蝶×3：双翼占位 + 缓动摆飞（素材就绪换 world/butterfly）
        const bfs: Node[] = [];
        for (const [i, p] of ([[47, 34], [53, 44], [45, 47]] as [number, number][]).entries()) {
            const n = new Node(`scat_butterfly_${i}`);
            n.layer = layer;
            n.addComponent(UITransform).setContentSize(24, 20);
            n.setPosition((p[0] + 0.5) * 32, -(p[1] + 0.5) * 32, 0);
            const g = n.addComponent(Graphics);
            g.fillColor = new Color(240, 240, 250, 255);
            g.ellipse(-5, 2, 5, 7); g.fill();
            g.ellipse(5, 2, 5, 7); g.fill();
            this.node.addChild(n);
            bfs.push(n);
        }
        bfs.forEach((n, i) => {
            const d = 1.5 + (i % 3) * 0.35;
            tween(n).by(d, { position: new Vec3(5, 8, 0) }).by(d, { position: new Vec3(-5, -8, 0) }).union().repeatForever().start();
        });
        // 湖面鱼影×3：暗色椭圆占位 + 缓游（素材就绪换 world/fish_shadow）
        for (const [i, p] of ([[20, 60], [28, 64], [14, 58]] as [number, number][]).entries()) {
            const n = new Node(`fish_shadow_${i}`);
            n.layer = layer;
            n.addComponent(UITransform).setContentSize(44, 22);
            n.setPosition((p[0] + 0.5) * 32, -(p[1] + 0.5) * 32, 0);
            const g = n.addComponent(Graphics);
            g.fillColor = new Color(16, 40, 84, 110);
            g.ellipse(0, 0, 20, 8); g.fill();
            this.node.addChild(n);
            const d = 3.2 + i * 0.4;
            tween(n).by(d, { position: new Vec3(12, 4, 0) }).by(d, { position: new Vec3(-12, -4, 0) }).union().repeatForever().start();
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
            const ptx = Math.floor(px / TILE), pty = Math.floor(-py / TILE);
            let best: { x: number; y: number; d: number } | null = null;
            for (let dy = -3; dy <= 3; dy++) {
                for (let dx = -3; dx <= 3; dx++) {
                    const tx = ptx + dx, ty = pty + dy;
                    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) continue;
                    if (this._terrain.get(tx, ty) !== TT.Water) continue;
                    const d = dx * dx + dy * dy;
                    if (!best || d < best.d) best = { x: tx, y: ty, d };
                }
            }
            if (best) {
                this._fishProbe.node.active = true;
                this._fishProbe.node.setPosition((best.x + 0.5) * TILE, -(best.y + 0.5) * TILE, 0);
            } else {
                this._fishProbe.node.active = false;
            }
        }
        // 2) U3 名牌纪律：只点亮距玩家最近的一个 NPC 名牌（≤8 格），其余隐藏
        if (this._player) {
            let bestI = -1, bestD = 64;   // 8 格 = 8²=64（平方距离）
            for (let i = 0; i < this._npcNames.length; i++) {
                const nn = this._npcNames[i];
                const dx = (nn.tx + 0.5) * TILE - px;
                const dy = (nn.ty + 0.5) * TILE - py;
                const d = dx * dx + dy * dy;
                if (d < bestD) { bestD = d; bestI = i; }
            }
            for (let i = 0; i < this._npcNames.length; i++) {
                const want = i === bestI;
                if (this._npcNames[i].node.active !== want) this._npcNames[i].node.active = want;
            }
        }
        // 3) 模态面板 active 时压掉情境按钮
        const modal = !!(this._bedtime && this._bedtime.node.active) ||
            !!(this._defense && this._defense.node.active) ||
            !!(this._dialog && this._dialog.node.active) ||
            !!(this._fishing && this._fishing.node.active) ||
            !!(this._build && this._build.node.active) ||
            !!(this._backpack && this._backpack.node.active);
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
        EventBus.inst.off('farmChanged', this._onFarmEvt, this);
        EventBus.inst.off('farmChanged', this._refreshHud, this);
        EventBus.inst.off('dayAdvanced', this._refreshHud, this);
        EventBus.inst.off('itemGained', this._refreshHud, this);
        EventBus.inst.off('itemSpent', this._refreshHud, this);
        if (WorldLiving._inst === this) WorldLiving._inst = null;
    }
}
