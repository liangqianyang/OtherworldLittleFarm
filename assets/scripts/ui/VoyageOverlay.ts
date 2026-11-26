/**
 * 《异界小农场 2.0》第三批升级：南岸修船 + 可自由探索/采矿/打怪的三大极端天气外岛冒险地图
 * - 每日限航 1 次（休息过夜刷新），三座外岛按阶梯解锁：赤焰礁 → 玄霜屿 → 青瘴泽，彻底告别无限白嫖与纯文字交互。
 * - 登岛后进入 960×540 专属手绘俯视外岛实景地图，支持 WASD/左屏摇杆移动、12 帧主角动画、4 帧妖灵守卫战斗、采集 3 处外岛宝藏矿脉。
 * - 三岛专属极端天气机制：赤焰礁（地面火圈熔岩预警）、玄霜屿（周期寒风减速，鱼汤可免疫）、青瘴泽（幽雾遮罩，点亮2盏古灯驱雾）。
 */

import {
    _decorator,
    Color,
    Component,
    EventKeyboard,
    EventTouch,
    Graphics,
    input,
    Input,
    KeyCode,
    Label,
    Layers,
    Node,
    Sprite,
    SpriteFrame,
    UITransform,
    Vec2,
} from 'cc';
import { GameApp } from '../app/GameApp';
import { ArtLoader } from '../core/ArtLoader';
import { AudioManager } from '../core/AudioManager';

const { ccclass } = _decorator;

interface IslandDef {
    id: 'ember_reef' | 'frost_isle' | 'mist_marsh';
    name: string;
    iconKey: string;
    bgKey: string;
    weatherTag: string;
    desc: string;
    requirePrev?: 'ember_reef' | 'frost_isle';
    clearGold: number;
    clearAura: number;
    bonusSeedId: string;
    bonusSeedName: string;
    extraItemId: string;
    extraItemName: string;
}

const OUTER_ISLANDS: readonly IslandDef[] = [
    {
        id: 'ember_reef',
        name: '赤焰礁',
        iconKey: 'island_ember_reef',
        bgKey: 'bg_island_ember',
        weatherTag: '烈日熔岩 · 躲避地火圈',
        desc: '采赤焰矿脉、击退火傀守卫',
        clearGold: 95,
        clearAura: 14,
        bonusSeedId: 'thunder_potato_seed',
        bonusSeedName: '雷火薯种子×2',
        extraItemId: 'iron_ore',
        extraItemName: '玄铁矿×1',
    },
    {
        id: 'frost_isle',
        name: '玄霜屿',
        iconKey: 'island_frost_isle',
        bgKey: 'bg_island_frost',
        weatherTag: '极寒霜风 · 鱼汤可免疫减速',
        desc: '需先通关赤焰礁 · 采寒玉冰晶',
        requirePrev: 'ember_reef',
        clearGold: 130,
        clearAura: 24,
        bonusSeedId: 'cloud_bamboo_shoot_seed',
        bonusSeedName: '穿云笋种子×2',
        extraItemId: 'furn_aquarium_porcelain',
        extraItemName: '青瓷鱼缸×1',
    },
    {
        id: 'mist_marsh',
        name: '青瘴泽',
        iconKey: 'island_mist_marsh',
        bgKey: 'bg_island_mist',
        weatherTag: '毒雾幽林 · 点亮2盏古灯驱雾',
        desc: '需先通关玄霜屿 · 夺封印碎片',
        requirePrev: 'frost_isle',
        clearGold: 170,
        clearAura: 32,
        bonusSeedId: 'sky_bamboo_seed',
        bonusSeedName: '撑天竹种子×2',
        extraItemId: 'seal_shard',
        extraItemName: '封印碎片×1',
    },
] as const;

interface IslandMob {
    id: number;
    kind: 'bamboo' | 'golem' | 'ink' | 'boss';
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    radius: number;
    speed: number;
    fireCd: number;
    hitFlash: number;
}

interface IslandBullet {
    fromPlayer: boolean;
    x: number;
    y: number;
    vx: number;
    vy: number;
    dmg: number;
    radius: number;
    life: number;
    color: Color;
}

interface IslandNodeLoot {
    id: number;
    x: number;
    y: number;
    kind: 'ore' | 'lantern';
    collected: boolean;
    label: string;
}

interface MagmaHazard {
    x: number;
    y: number;
    r: number;
    warnTimer: number;
    eruptTimer: number;
}

const ARENA_W = 960;
const ARENA_H = 540;
const HALF_W = ARENA_W / 2;
const HALF_H = ARENA_H / 2;

@ccclass('VoyageOverlay')
export class VoyageOverlay extends Component {
    private static _inst: VoyageOverlay | null = null;

    private _panel!: Node;
    private _repairView!: Node;
    private _chartView!: Node;
    private _exploreView!: Node;

    private _repairMatLbl!: Label;
    private _chartStatusLbl!: Label;
    private _chartCardsRoot!: Node;

    // 外岛探索战斗视图节点
    private _mapBgHolder!: Node;
    private _fxGfx!: Graphics;
    private _entityLayer!: Node;
    private _fogGfx!: Graphics;
    private _exploreHudLbl!: Label;
    private _exploreTipLbl!: Label;
    private _playerNode!: Node;
    private _joyBase!: Node;
    private _joyKnob!: Node;
    private _mobNodes = new Map<number, Node>();

    // 动画帧缓存（复用主角 12 帧与妖灵 4 帧）
    private _pWalk: Record<'front' | 'side' | 'back', (SpriteFrame | null)[]> = {
        front: [null, null, null, null],
        side: [null, null, null, null],
        back: [null, null, null, null],
    };
    private _pIdle: Partial<Record<'front' | 'side' | 'back', SpriteFrame>> = {};
    private _mobFrames: Record<string, (SpriteFrame | null)[]> = {};

    // 运行态
    private _open = false;
    private _exploring = false;
    private _island: IslandDef | null = null;
    private _keys = new Set<KeyCode>();
    private _joyActive = false;
    private _joyOrigin = new Vec2();
    private _joyDir = new Vec2();

    private _px = -360;
    private _py = -110;
    private _hp = 100;
    private _maxHp = 100;
    private _pDir: 'front' | 'side' | 'back' = 'front';
    private _pFaceX = 1;
    private _pMoving = false;
    private _pAnimT = 0;
    private _pAnimIdx = 0;
    private _atkCd = 0;
    private _dodgeCd = 0;
    private _dodgeTimer = 0;
    private _dodgeDir = new Vec2(1, 0);
    private _invulnTimer = 0;
    private _hasSoupBuff = false;

    private _animClock = 0;
    private _hazardTimer = 3.2;
    private _frostWindTimer = 0;
    private _mobs: IslandMob[] = [];
    private _bullets: IslandBullet[] = [];
    private _slashes: { x: number; y: number; r: number; life: number }[] = [];
    private _lootNodes: IslandNodeLoot[] = [];
    private _hazards: MagmaHazard[] = [];
    private _nextMobId = 1;
    private _bagGold = 0;
    private _bagOre = 0;
    private _clearedBonusGiven = false;

    private _onToast: ((msg: string) => void) | null = null;
    private _onDockRepaired: (() => void) | null = null;

    public static get inst(): VoyageOverlay | null {
        return this._inst;
    }

    public get isOpen(): boolean {
        return this._open;
    }

    protected onLoad(): void {
        VoyageOverlay._inst = this;
        this._buildUI();
        this._preloadAnims();
        this._panel.active = false;
        input.on(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this._onKeyUp, this);
    }

    protected onDestroy(): void {
        if (VoyageOverlay._inst === this) VoyageOverlay._inst = null;
        input.off(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this._onKeyUp, this);
    }

    private _preloadAnims(): void {
        (['front', 'side', 'back'] as const).forEach((d) => {
            void ArtLoader.loadSpriteFrame(`char_player_${d}`).then((sf) => { if (sf) this._pIdle[d] = sf; });
            for (let i = 0; i < 4; i++) {
                void ArtLoader.loadSpriteFrame(`char_walk_${d}_${i}`).then((sf) => { if (sf) this._pWalk[d][i] = sf; });
            }
        });
        for (const pre of ['mob_bamboo', 'mob_golem', 'mob_ink_fly', 'mob_boss']) {
            this._mobFrames[pre] = [null, null, null, null];
            for (let i = 0; i < 4; i++) {
                void ArtLoader.loadSpriteFrame(`${pre}_${i}`).then((sf) => { if (sf) this._mobFrames[pre][i] = sf; });
            }
        }
    }

    private _uiNode(name: string, parent: Node): Node {
        const n = new Node(name);
        n.layer = Layers.Enum.UI_2D;
        n.parent = parent;
        return n;
    }

    private _makeBtn(text: string, w: number, h: number, color: Color, onTap: () => void): Node {
        const n = new Node(`Btn_${text.slice(0, 6)}`);
        n.layer = Layers.Enum.UI_2D;
        n.addComponent(UITransform).setContentSize(w, h);
        const g = n.addComponent(Graphics);
        g.fillColor = color;
        g.roundRect(-w / 2, -h / 2, w, h, 10);
        g.fill();
        const l = this._uiNode('Lbl', n).addComponent(Label);
        l.string = text;
        l.fontSize = 14;
        l.lineHeight = 19;
        l.color = Color.WHITE;
        n.on(Node.EventType.TOUCH_END, onTap);
        return n;
    }

    private _buildUI(): void {
        this._panel = this._uiNode('VoyagePanel', this.node);
        this._panel.addComponent(UITransform).setContentSize(1280, 720);

        const mask = this._panel.addComponent(Graphics);
        mask.fillColor = new Color(16, 30, 34, 224);
        mask.rect(-640, -360, 1280, 720);
        mask.fill();

        this._buildRepairView();
        this._buildChartView();
        this._buildExploreView();
    }

    private _buildRepairView(): void {
        this._repairView = this._uiNode('RepairView', this._panel);
        this._repairView.addComponent(UITransform).setContentSize(640, 440);
        const g = this._repairView.addComponent(Graphics);
        g.fillColor = new Color(248, 240, 222, 255);
        g.strokeColor = new Color(132, 92, 58, 255);
        g.lineWidth = 4;
        g.roundRect(-320, -220, 640, 440, 18);
        g.fill();
        g.stroke();

        const title = this._uiNode('Title', this._repairView).addComponent(Label);
        title.node.setPosition(0, 166, 0);
        title.string = '南岸旧码头 · 修缮出海木帆船';
        title.fontSize = 24;
        title.color = new Color(36, 48, 42, 255);

        const boatArt = this._uiNode('BoatPreview', this._repairView);
        boatArt.setPosition(0, 48, 0);
        ArtLoader.applySprite(boatArt, 'prop_sail_boat', 190, 156);

        this._repairMatLbl = this._uiNode('MatLbl', this._repairView).addComponent(Label);
        this._repairMatLbl.node.setPosition(0, -68, 0);
        this._repairMatLbl.fontSize = 16;
        this._repairMatLbl.lineHeight = 24;
        this._repairMatLbl.color = new Color(110, 72, 42, 255);

        const repairBtn = this._makeBtn('修缮木船 · 开启外岛探索', 224, 48, new Color(36, 126, 116, 250), () => this._doRepairDock());
        repairBtn.parent = this._repairView;
        repairBtn.setPosition(-96, -154, 0);

        const closeBtn = this._makeBtn('稍后再来', 130, 48, new Color(132, 98, 72, 245), () => this.close());
        closeBtn.parent = this._repairView;
        closeBtn.setPosition(140, -154, 0);
    }

    private _buildChartView(): void {
        this._chartView = this._uiNode('ChartView', this._panel);
        this._chartView.addComponent(UITransform).setContentSize(960, 560);
        const g = this._chartView.addComponent(Graphics);
        g.fillColor = new Color(238, 234, 218, 255);
        g.strokeColor = new Color(72, 112, 108, 255);
        g.lineWidth = 4;
        g.roundRect(-480, -280, 960, 560, 18);
        g.fill();
        g.stroke();

        g.fillColor = new Color(156, 204, 200, 110);
        g.roundRect(-450, -186, 900, 366, 14);
        g.fill();

        const title = this._uiNode('Title', this._chartView).addComponent(Label);
        title.node.setPosition(-120, 234, 0);
        title.string = '南岸海图 · 登岛实景探索与打怪';
        title.fontSize = 24;
        title.color = new Color(28, 52, 48, 255);

        this._chartStatusLbl = this._uiNode('Status', this._chartView).addComponent(Label);
        this._chartStatusLbl.node.setPosition(-80, 198, 0);
        this._chartStatusLbl.fontSize = 14;
        this._chartStatusLbl.color = new Color(128, 74, 40, 255);

        const closeBtn = this._makeBtn('返回码头', 120, 42, new Color(142, 92, 66, 245), () => this.close());
        closeBtn.parent = this._chartView;
        closeBtn.setPosition(384, 224, 0);

        this._chartCardsRoot = this._uiNode('ChartCards', this._chartView);
    }

    private _rebuildChartCards(): void {
        const app = GameApp.inst;
        if (!app?.ready) return;
        this._chartCardsRoot.removeAllChildren();

        const today = app.time.dayIndex;
        const sailedToday = app.saveData.islands.lastVoyageDay === today;
        const cleared = app.saveData.islands.unlockedIslands;

        this._chartStatusLbl.string = sailedToday
            ? `今日（第${today}天）已出航 1/1 次，请回主角农舍休息过夜明日再出海！`
            : `今日剩余出航次数：1/1 · 已征服外岛 ${cleared.length}/3（携带寒溪鲜鱼汤可免疫玄霜寒风）`;

        OUTER_ISLANDS.forEach((isl, idx) => {
            const unlocked = !isl.requirePrev || cleared.includes(isl.requirePrev);
            const card = this._uiNode(`Island_${isl.id}`, this._chartCardsRoot);
            card.setPosition((idx - 1) * 288, -8, 0);
            const cg = card.addComponent(Graphics);
            cg.fillColor = unlocked ? new Color(250, 244, 230, 248) : new Color(216, 214, 206, 235);
            cg.strokeColor = unlocked ? new Color(132, 98, 66, 235) : new Color(148, 148, 142, 200);
            cg.lineWidth = 2.5;
            cg.roundRect(-130, -162, 260, 324, 14);
            cg.fill();
            cg.stroke();

            const art = this._uiNode('Art', card);
            art.setPosition(0, 62, 0);
            ArtLoader.applySprite(art, isl.iconKey, 168, 152);

            const nLbl = this._uiNode('Name', card).addComponent(Label);
            nLbl.node.setPosition(0, -32, 0);
            nLbl.string = cleared.includes(isl.id) ? `${isl.name} ✓` : isl.name;
            nLbl.fontSize = 20;
            nLbl.color = new Color(34, 46, 42, 255);

            const wLbl = this._uiNode('Weather', card).addComponent(Label);
            wLbl.node.setPosition(0, -58, 0);
            wLbl.string = isl.weatherTag;
            wLbl.fontSize = 12;
            wLbl.color = new Color(168, 78, 42, 245);

            const dLbl = this._uiNode('Desc', card).addComponent(Label);
            dLbl.node.setPosition(0, -84, 0);
            dLbl.string = `${isl.desc}\n(${isl.bonusSeedName} · ${isl.extraItemName})`;
            dLbl.fontSize = 12;
            dLbl.lineHeight = 17;
            dLbl.color = new Color(76, 68, 56, 245);

            const btnText = !unlocked ? '未解锁(先通前岛)' : sailedToday ? '今日已出航' : '登岛探索战斗';
            const btnCol = !unlocked || sailedToday ? new Color(134, 136, 132, 220) : new Color(36, 126, 116, 250);
            const sailBtn = this._makeBtn(btnText, 178, 40, btnCol, () => {
                if (!unlocked) {
                    this._onToast?.(`请先登岛击败前一座外岛的守卫妖灵，再解锁【${isl.name}】！`);
                    return;
                }
                if (sailedToday) {
                    this._onToast?.('今日出航次数已用完（每日限 1 次），回农舍睡一觉明早即可再次出海！');
                    return;
                }
                this._startIslandExploration(isl);
            });
            sailBtn.parent = card;
            sailBtn.setPosition(0, -132, 0);
        });
    }

    /** 外岛独立实景探索与打怪地图界面 */
    private _buildExploreView(): void {
        this._exploreView = this._uiNode('ExploreView', this._panel);
        this._exploreView.addComponent(UITransform).setContentSize(1280, 720);

        // 顶部状态栏
        this._exploreHudLbl = this._uiNode('HudTop', this._exploreView).addComponent(Label);
        this._exploreHudLbl.node.setPosition(-120, 326, 0);
        this._exploreHudLbl.fontSize = 20;
        this._exploreHudLbl.color = new Color(252, 244, 224, 255);

        this._exploreTipLbl = this._uiNode('HudTip', this._exploreView).addComponent(Label);
        this._exploreTipLbl.node.setPosition(-120, 296, 0);
        this._exploreTipLbl.fontSize = 13;
        this._exploreTipLbl.color = new Color(216, 236, 228, 235);

        const returnBtn = this._makeBtn('扬帆返航', 132, 40, new Color(184, 112, 48, 250), () => this._finishExploration(false));
        returnBtn.parent = this._exploreView;
        returnBtn.setPosition(430, 314, 0);

        // 960×540 外岛实景手绘探索场
        const arena = this._uiNode('IslandArena', this._exploreView);
        arena.setPosition(0, -24, 0);
        arena.addComponent(UITransform).setContentSize(ARENA_W, ARENA_H);

        this._mapBgHolder = this._uiNode('MapBg', arena);
        this._fxGfx = this._uiNode('FxLayer', arena).addComponent(Graphics);
        this._entityLayer = this._uiNode('EntityLayer', arena);
        this._fogGfx = this._uiNode('FogLayer', arena).addComponent(Graphics);

        this._playerNode = this._uiNode('IslandPlayer', this._entityLayer);
        ArtLoader.applySprite(this._playerNode, 'char_player_front', 50, 66);

        // 左半屏隐形摇杆
        const pad = this._uiNode('IslandJoyPad', this._exploreView);
        pad.addComponent(UITransform).setContentSize(640, 620);
        pad.setPosition(-320, -40, 0);

        this._joyBase = this._uiNode('JoyBase', this._exploreView);
        const jb = this._joyBase.addComponent(Graphics);
        jb.strokeColor = new Color(230, 244, 238, 160);
        jb.fillColor = new Color(36, 126, 116, 80);
        jb.lineWidth = 2.5;
        jb.circle(0, 0, 50);
        jb.fill();
        jb.stroke();
        this._joyBase.active = false;

        this._joyKnob = this._uiNode('JoyKnob', this._joyBase);
        const jk = this._joyKnob.addComponent(Graphics);
        jk.fillColor = new Color(246, 224, 148, 220);
        jk.circle(0, 0, 18);
        jk.fill();

        pad.on(Node.EventType.TOUCH_START, (e: EventTouch) => {
            if (!this._exploring) return;
            const loc = e.getUILocation();
            this._joyActive = true;
            this._joyOrigin.set(loc.x - 640, loc.y - 360);
            this._joyDir.set(0, 0);
            this._joyBase.setPosition(this._joyOrigin.x, this._joyOrigin.y, 0);
            this._joyKnob.setPosition(0, 0, 0);
            this._joyBase.active = true;
        });
        pad.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => {
            if (!this._joyActive || !this._exploring) return;
            const loc = e.getUILocation();
            const dx = loc.x - 640 - this._joyOrigin.x;
            const dy = loc.y - 360 - this._joyOrigin.y;
            const d = Math.hypot(dx, dy);
            if (d > 6) {
                const c = Math.min(d, 46);
                this._joyKnob.setPosition((dx / d) * c, (dy / d) * c, 0);
                this._joyDir.set(dx / d, dy / d);
            } else {
                this._joyKnob.setPosition(0, 0, 0);
                this._joyDir.set(0, 0);
            }
        });
        const endJoy = () => {
            this._joyActive = false;
            this._joyDir.set(0, 0);
            this._joyBase.active = false;
        };
        pad.on(Node.EventType.TOUCH_END, endJoy);
        pad.on(Node.EventType.TOUCH_CANCEL, endJoy);

        // 右下角攻击 & 翻滚按钮
        const atkBtn = this._makeBtn('攻击/采矿\n(J/空格)', 110, 74, new Color(36, 126, 116, 245), () => this._doAttack());
        atkBtn.parent = this._exploreView;
        atkBtn.setPosition(550, -245, 0);

        const dodgeBtn = this._makeBtn('翻滚\n(K)', 84, 58, new Color(68, 108, 134, 245), () => this._doDodge());
        dodgeBtn.parent = this._exploreView;
        dodgeBtn.setPosition(438, -262, 0);
    }

    public open(onToast?: (msg: string) => void, onDockRepaired?: () => void): void {
        const app = GameApp.inst;
        if (!app?.ready) return;
        this._onToast = onToast ?? null;
        this._onDockRepaired = onDockRepaired ?? null;
        this._open = true;
        this._exploring = false;
        this._panel.active = true;
        this._panel.setSiblingIndex(this.node.children.length - 1);

        const repaired = !!app.saveData.islands.dockRepaired;
        this._repairView.active = !repaired;
        this._chartView.active = repaired;
        this._exploreView.active = false;

        if (!repaired) {
            const wood = app.saveData.inventory['wood'] ?? 0;
            const stone = app.saveData.inventory['stone'] ?? 0;
            this._repairMatLbl.string = `修船所需：木材 ${wood}/12 · 青石 ${stone}/8 · 金币 ${app.saveData.gold}/80\n（木材与青石可通过清理东田杂草与西岸开荒获得）`;
        } else {
            this._rebuildChartCards();
        }
    }

    public close(): void {
        this._open = false;
        this._exploring = false;
        this._panel.active = false;
        AudioManager.inst.playBgm('overworld');
    }

    private _doRepairDock(): void {
        const app = GameApp.inst;
        if (!app?.ready) return;
        const wood = app.saveData.inventory['wood'] ?? 0;
        const stone = app.saveData.inventory['stone'] ?? 0;
        if (wood < 12 || stone < 8 || app.saveData.gold < 80) {
            this._onToast?.('修船材料不足（需 木材×12、青石×8、金币×80）');
            AudioManager.inst.playSfx('tap');
            return;
        }
        app.addItem('wood', -12);
        app.addItem('stone', -8);
        app.addGold(-80);
        app.saveData.islands.dockRepaired = true;
        app.persist('dock_repaired');
        AudioManager.inst.playSfx('harvest');
        this._onDockRepaired?.();
        this._onToast?.('南岸出海木帆船修缮完工！今日即可首次登岛探索！');
        this._repairView.active = false;
        this._chartView.active = true;
        this._rebuildChartCards();
    }

    private _startIslandExploration(isl: IslandDef): void {
        const app = GameApp.inst;
        if (!app?.ready) return;

        // 立刻消耗今日唯一出航机会
        app.saveData.islands.lastVoyageDay = app.time.dayIndex;
        this._hasSoupBuff = false;
        if ((app.saveData.inventory['dish_brook_soup'] ?? 0) > 0) {
            app.addItem('dish_brook_soup', -1);
            this._hasSoupBuff = true;
        }
        app.persist(`voyage_depart_${isl.id}`);

        this._island = isl;
        this._exploring = true;
        this._chartView.active = false;
        this._exploreView.active = true;
        this._px = -355;
        this._py = -115;
        this._hp = this._maxHp;
        this._bagGold = 0;
        this._bagOre = 0;
        this._clearedBonusGiven = false;
        this._bullets = [];
        this._slashes = [];
        this._hazards = [];
        this._hazardTimer = 2.6;
        this._frostWindTimer = 0;

        for (const n of this._mobNodes.values()) n.destroy();
        this._mobNodes.clear();

        // 加载该外岛专属手绘俯视实景底图
        this._mapBgHolder.removeAllChildren();
        ArtLoader.applySprite(this._mapBgHolder, isl.bgKey, ARENA_W, ARENA_H);

        // 生成 3 处可采集外岛资源点（青瘴泽额外生成 2 盏驱雾古灯）
        this._lootNodes = [
            { id: 1, x: -40, y: 145, kind: 'ore', collected: false, label: isl.id === 'ember_reef' ? '赤焰矿脉' : isl.id === 'frost_isle' ? '寒玉冰晶' : '古林灵芝' },
            { id: 2, x: 245, y: 120, kind: 'ore', collected: false, label: '沉船宝箱' },
            { id: 3, x: 185, y: -135, kind: 'ore', collected: false, label: '灵植秘丛' },
        ];
        if (isl.id === 'mist_marsh') {
            this._lootNodes.push(
                { id: 4, x: -110, y: -10, kind: 'lantern', collected: false, label: '驱雾古灯' },
                { id: 5, x: 140, y: 20, kind: 'lantern', collected: false, label: '驱雾古灯' }
            );
        }

        // 生成对应外岛守卫妖灵
        this._mobs = [];
        const spawn = (kind: IslandMob['kind'], x: number, y: number) => {
            const cfg =
                kind === 'boss'
                    ? { hp: 200, r: 34, spd: 68 }
                    : kind === 'golem'
                    ? { hp: 85, r: 24, spd: 72 }
                    : kind === 'ink'
                    ? { hp: 55, r: 20, spd: 65 }
                    : { hp: 46, r: 18, spd: 102 };
            this._mobs.push({ id: this._nextMobId++, kind, x, y, hp: cfg.hp, maxHp: cfg.hp, radius: cfg.r, speed: cfg.spd, fireCd: 1.0 + Math.random(), hitFlash: 0 });
        };

        if (isl.id === 'ember_reef') {
            spawn('bamboo', 40, 80);
            spawn('bamboo', 80, -90);
            spawn('golem', 220, 20);
            spawn('golem', 260, -85);
        } else if (isl.id === 'frost_isle') {
            spawn('ink', 60, 110);
            spawn('ink', 110, -100);
            spawn('golem', 230, 60);
            spawn('golem', 240, -70);
        } else {
            spawn('ink', 40, 100);
            spawn('ink', 80, -100);
            spawn('golem', 200, 90);
            spawn('boss', 290, -10);
        }

        AudioManager.inst.playBgm('dungeon');
        this._refreshExploreHud();
    }

    private _onKeyDown(e: EventKeyboard): void {
        if (!this._exploring) return;
        this._keys.add(e.keyCode);
        if (e.keyCode === KeyCode.KEY_J || e.keyCode === KeyCode.SPACE) this._doAttack();
        if (e.keyCode === KeyCode.KEY_K || e.keyCode === KeyCode.SHIFT_LEFT) this._doDodge();
    }

    private _onKeyUp(e: EventKeyboard): void {
        this._keys.delete(e.keyCode);
    }

    private _doDodge(): void {
        if (this._dodgeCd > 0) return;
        this._dodgeCd = 0.9;
        this._dodgeTimer = 0.2;
        this._invulnTimer = 0.3;
        const mx = this._joyDir.x || (this._keys.has(KeyCode.KEY_D) ? 1 : this._keys.has(KeyCode.KEY_A) ? -1 : this._pFaceX);
        const my = this._joyDir.y || (this._keys.has(KeyCode.KEY_W) ? 1 : this._keys.has(KeyCode.KEY_S) ? -1 : 0);
        const l = Math.hypot(mx, my) || 1;
        this._dodgeDir.set(mx / l, my / l);
    }

    private _doAttack(): void {
        if (this._atkCd > 0 || !this._exploring) return;
        this._atkCd = 0.3;
        AudioManager.inst.playSfx('hit');

        // 1. 青竹剑近战宽范围挥砍 + 劈碎敌弹
        const range = 96;
        this._slashes.push({ x: this._px, y: this._py, r: range, life: 0.16 });
        for (const m of this._mobs) {
            if (Math.hypot(m.x - this._px, m.y - this._py) <= range + m.radius) {
                m.hp -= 28;
                m.hitFlash = 0.12;
            }
        }
        this._bullets = this._bullets.filter((b) => b.fromPlayer || Math.hypot(b.x - this._px, b.y - this._py) > range);

        // 2. 自动瞄准最近妖灵发射朱砂符弹
        let best: IslandMob | null = null;
        let bestD = Infinity;
        for (const m of this._mobs) {
            const d = Math.hypot(m.x - this._px, m.y - this._py);
            if (d < bestD) { bestD = d; best = m; }
        }
        const ang = best ? Math.atan2(best.y - this._py, best.x - this._px) : (this._pFaceX < 0 ? Math.PI : 0);
        this._bullets.push({
            fromPlayer: true,
            x: this._px + Math.cos(ang) * 18,
            y: this._py + Math.sin(ang) * 18,
            vx: Math.cos(ang) * 520,
            vy: Math.sin(ang) * 520,
            dmg: 18,
            radius: 7,
            life: 1.2,
            color: new Color(236, 108, 56, 255),
        });
    }

    private _refreshExploreHud(): void {
        if (!this._island) return;
        const oreLeft = this._lootNodes.filter((n) => n.kind === 'ore' && !n.collected).length;
        const soupTag = this._hasSoupBuff ? ' | 鱼汤护体✓' : '';
        this._exploreHudLbl.string = `外岛探索 · ${this._island.name} | 生命 ${Math.max(0, Math.ceil(this._hp))}/${this._maxHp} | 守卫剩 ${this._mobs.length} | 宝藏剩 ${oreLeft}${soupTag}`;
        this._exploreTipLbl.string =
            this._mobs.length === 0
                ? '全岛妖灵已肃清！可采完剩余矿脉后点右上角「扬帆返航」带回全部珍宝'
                : `WASD/摇杆探索 · J/空格攻击 · K翻滚 | 已拾取：金币 +${this._bagGold} · 矿石 +${this._bagOre}`;
    }

    private _finishExploration(defeated: boolean): void {
        const app = GameApp.inst;
        const isl = this._island;
        this._exploring = false;
        if (!app?.ready || !isl) {
            this.close();
            return;
        }

        const ratio = defeated ? 0.6 : 1.0;
        const gainGold = Math.round((this._bagGold + (this._clearedBonusGiven ? isl.clearGold : 0)) * ratio);
        app.addGold(gainGold);
        if (this._bagOre > 0) app.addItem('iron_ore', this._bagOre);
        if (this._clearedBonusGiven) {
            if (!app.saveData.islands.unlockedIslands.includes(isl.id)) {
                app.saveData.islands.unlockedIslands.push(isl.id);
            }
            app.saveData.farm.auraScore += isl.clearAura;
            app.addItem(isl.bonusSeedId, 2);
            app.addItem(isl.extraItemId, 1);
            if (isl.id === 'ember_reef' && app.saveData.farm.unlockedTier < 2) app.saveData.farm.unlockedTier = 2;
            if (isl.id === 'mist_marsh') app.saveData.defense.sealRepairPct = Math.min(100, app.saveData.defense.sealRepairPct + 10);
        }

        app.persist(`voyage_finish_${isl.id}`);
        AudioManager.inst.playSfx(defeated ? 'tap' : 'coin');
        const msg = defeated
            ? `力竭返航主岛，仍保住了 ${gainGold} 金币与 ${this._bagOre} 玄铁矿！`
            : this._clearedBonusGiven
            ? `征服【${isl.name}】满载归来！获得 ${gainGold} 金币、${isl.bonusSeedName}、${isl.extraItemName}！`
            : `从【${isl.name}】提前返航，带回 ${gainGold} 金币与 ${this._bagOre} 玄铁矿！`;
        this._onToast?.(msg);
        this.close();
    }

    protected update(dt: number): void {
        if (!this._exploring || !this._island) return;
        this._animClock += dt;
        this._atkCd = Math.max(0, this._atkCd - dt);
        this._dodgeCd = Math.max(0, this._dodgeCd - dt);
        this._invulnTimer = Math.max(0, this._invulnTimer - dt);

        // 1. 玩家移动（玄霜屿周期寒风减速，鱼汤可免疫）
        if (this._island.id === 'frost_isle') {
            this._frostWindTimer = (this._frostWindTimer + dt) % 7;
        }
        const frostSlow = this._island.id === 'frost_isle' && this._frostWindTimer > 4.2 && !this._hasSoupBuff ? 0.65 : 1.0;

        if (this._dodgeTimer > 0) {
            this._dodgeTimer -= dt;
            this._px += this._dodgeDir.x * 460 * dt;
            this._py += this._dodgeDir.y * 460 * dt;
            this._pMoving = true;
        } else {
            let vx = this._joyDir.x;
            let vy = this._joyDir.y;
            if (this._keys.has(KeyCode.KEY_W) || this._keys.has(KeyCode.ARROW_UP)) vy += 1;
            if (this._keys.has(KeyCode.KEY_S) || this._keys.has(KeyCode.ARROW_DOWN)) vy -= 1;
            if (this._keys.has(KeyCode.KEY_A) || this._keys.has(KeyCode.ARROW_LEFT)) vx -= 1;
            if (this._keys.has(KeyCode.KEY_D) || this._keys.has(KeyCode.ARROW_RIGHT)) vx += 1;
            const len = Math.hypot(vx, vy);
            this._pMoving = len > 0.01;
            if (len > 0.01) {
                const spd = (this._hasSoupBuff ? 245 : 210) * frostSlow;
                this._px += (vx / len) * spd * dt;
                this._py += (vy / len) * spd * dt;
                if (Math.abs(vx) > Math.abs(vy) * 0.85) {
                    this._pDir = 'side';
                    this._pFaceX = vx < 0 ? -1 : 1;
                } else if (vy > 0) {
                    this._pDir = 'back';
                    this._pFaceX = 1;
                } else {
                    this._pDir = 'front';
                    this._pFaceX = 1;
                }
                this._pAnimT += dt;
                if (this._pAnimT >= 0.14) {
                    this._pAnimT -= 0.14;
                    this._pAnimIdx = (this._pAnimIdx + 1) % 4;
                }
            }
        }
        this._px = Math.max(-HALF_W + 78, Math.min(HALF_W - 65, this._px));
        this._py = Math.max(-HALF_H + 56, Math.min(HALF_H - 56, this._py));

        // 2. 自动靠近采摘矿脉/宝箱与点亮驱雾古灯
        for (const node of this._lootNodes) {
            if (node.collected) continue;
            if (Math.hypot(node.x - this._px, node.y - this._py) < 48) {
                node.collected = true;
                AudioManager.inst.playSfx('coin');
                if (node.kind === 'ore') {
                    this._bagGold += 25;
                    this._bagOre += 1;
                    this._onToast?.(`采得【${node.label}】：金币 +25、玄铁矿 +1！`);
                } else {
                    this._onToast?.('点亮驱雾古灯！青瘴泽的视野更清朗了！');
                }
                this._refreshExploreHud();
            }
        }

        // 3. 赤焰礁熔岩火圈预警机制
        if (this._island.id === 'ember_reef') {
            this._hazardTimer -= dt;
            if (this._hazardTimer <= 0 && this._mobs.length > 0) {
                this._hazardTimer = 3.2;
                this._hazards.push({ x: this._px + (Math.random() - 0.5) * 90, y: this._py + (Math.random() - 0.5) * 90, r: 54, warnTimer: 1.35, eruptTimer: 0.45 });
            }
            for (const hz of this._hazards) {
                if (hz.warnTimer > 0) {
                    hz.warnTimer -= dt;
                } else {
                    hz.eruptTimer -= dt;
                    if (this._invulnTimer <= 0 && Math.hypot(hz.x - this._px, hz.y - this._py) < hz.r) {
                        this._hp -= 12;
                        this._invulnTimer = 0.65;
                    }
                }
            }
            this._hazards = this._hazards.filter((h) => h.warnTimer > 0 || h.eruptTimer > 0);
        }

        // 4. 守卫妖灵 AI 与弹幕
        for (const m of this._mobs) {
            m.hitFlash = Math.max(0, m.hitFlash - dt);
            const dx = this._px - m.x;
            const dy = this._py - m.y;
            const dist = Math.hypot(dx, dy) || 1;
            if (m.kind !== 'ink' || dist > 165) {
                m.x += (dx / dist) * m.speed * dt;
                m.y += (dy / dist) * m.speed * dt;
            }
            if (dist < m.radius + 18 && this._invulnTimer <= 0) {
                this._hp -= m.kind === 'boss' ? 14 : 9;
                this._invulnTimer = 0.65;
            }
            m.fireCd -= dt;
            if (m.fireCd <= 0 && (m.kind === 'ink' || m.kind === 'golem' || m.kind === 'boss')) {
                const base = Math.atan2(dy, dx);
                const count = m.kind === 'boss' ? 6 : 1;
                for (let i = 0; i < count; i++) {
                    const a = base + (i * Math.PI * 2) / count;
                    this._bullets.push({
                        fromPlayer: false,
                        x: m.x,
                        y: m.y,
                        vx: Math.cos(a) * 205,
                        vy: Math.sin(a) * 205,
                        dmg: 9,
                        radius: 7,
                        life: 2.5,
                        color: this._island.id === 'ember_reef' ? new Color(246, 132, 54, 255) : new Color(138, 224, 246, 255),
                    });
                }
                m.fireCd = m.kind === 'boss' ? 1.8 : 2.1;
            }
        }

        // 5. 子弹碰撞
        for (const b of this._bullets) {
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;
            if (Math.abs(b.x) > HALF_W || Math.abs(b.y) > HALF_H) { b.life = 0; continue; }
            if (b.fromPlayer) {
                for (const m of this._mobs) {
                    if (m.hp > 0 && Math.hypot(m.x - b.x, m.y - b.y) <= m.radius + b.radius) {
                        m.hp -= b.dmg;
                        m.hitFlash = 0.1;
                        b.life = 0;
                        break;
                    }
                }
            } else if (this._invulnTimer <= 0 && Math.hypot(this._px - b.x, this._py - b.y) <= 18 + b.radius) {
                this._hp -= b.dmg;
                this._invulnTimer = 0.55;
                b.life = 0;
            }
        }

        const prevLen = this._mobs.length;
        this._mobs = this._mobs.filter((m) => m.hp > 0);
        if (this._mobs.length < prevLen) {
            this._bagGold += (prevLen - this._mobs.length) * 15;
            if (this._mobs.length === 0 && !this._clearedBonusGiven) {
                this._clearedBonusGiven = true;
                AudioManager.inst.playSfx('harvest');
                this._onToast?.(`击败【${this._island.name}】全部守卫！已解锁通关珍宝与下一座外岛！`);
            }
            this._refreshExploreHud();
        }
        this._bullets = this._bullets.filter((b) => b.life > 0);
        this._slashes = this._slashes.filter((s) => { s.life -= dt; return s.life > 0; });

        if (this._hp <= 0) {
            this._finishExploration(true);
            return;
        }

        this._renderExplore();
    }

    private _renderExplore(): void {
        const g = this._fxGfx;
        g.clear();

        // 1. 赤焰礁地火圈预警/喷发
        for (const hz of this._hazards) {
            if (hz.warnTimer > 0) {
                g.strokeColor = new Color(252, 118, 52, 220);
                g.fillColor = new Color(242, 86, 42, 55);
                g.lineWidth = 2.5;
                g.circle(hz.x, hz.y, hz.r);
                g.fill();
                g.stroke();
            } else {
                g.fillColor = new Color(255, 168, 56, 175);
                g.circle(hz.x, hz.y, hz.r);
                g.fill();
            }
        }

        // 2. 资源点与驱雾古灯
        for (const n of this._lootNodes) {
            if (n.kind === 'ore' && !n.collected) {
                g.fillColor = new Color(248, 212, 92, 95);
                g.circle(n.x, n.y, 26 + Math.sin(this._animClock * 4 + n.id) * 3);
                g.fill();
                g.fillColor = new Color(224, 154, 52, 250);
                g.strokeColor = Color.WHITE;
                g.lineWidth = 2;
                g.roundRect(n.x - 14, n.y - 12, 28, 24, 6);
                g.fill();
                g.stroke();
            } else if (n.kind === 'lantern') {
                g.fillColor = n.collected ? new Color(118, 248, 222, 140) : new Color(64, 92, 86, 190);
                g.circle(n.x, n.y, n.collected ? 34 : 18);
                g.fill();
                g.fillColor = n.collected ? new Color(255, 246, 192, 255) : new Color(112, 140, 132, 255);
                g.circle(n.x, n.y, 10);
                g.fill();
            }
        }

        // 3. 剑气与子弹
        for (const s of this._slashes) {
            g.fillColor = new Color(160, 242, 216, 115);
            g.circle(s.x, s.y, s.r * 0.72);
            g.fill();
        }
        for (const b of this._bullets) {
            g.fillColor = b.color;
            g.circle(b.x, b.y, b.radius);
            g.fill();
        }

        // 4. 守卫妖灵 4 帧动画同步
        const activeIds = new Set<number>();
        const mCfg: Record<IslandMob['kind'], [string, number, number]> = {
            bamboo: ['mob_bamboo', 52, 54],
            golem: ['mob_golem', 66, 68],
            ink: ['mob_ink_fly', 60, 54],
            boss: ['mob_boss', 94, 96],
        };
        for (const m of this._mobs) {
            activeIds.add(m.id);
            const [pre, mw, mh] = mCfg[m.kind];
            let mn = this._mobNodes.get(m.id);
            if (!mn) {
                mn = this._uiNode(`IMob_${m.id}`, this._entityLayer);
                ArtLoader.applySprite(mn, `${pre}_0`, mw, mh);
                this._mobNodes.set(m.id, mn);
            }
            const sf = this._mobFrames[pre]?.[Math.floor((this._animClock + m.id * 0.17) / 0.16) % 4];
            const sp = mn.getChildByName('ArtSprite')?.getComponent(Sprite);
            if (sp && sf && sp.spriteFrame !== sf) sp.spriteFrame = sf;
            mn.setPosition(m.x, m.y + 8, 0);
            mn.setScale(this._px < m.x ? -1 : 1, 1, 1);

            const bw = m.radius * 2;
            const ratio = Math.max(0, m.hp / m.maxHp);
            g.fillColor = new Color(24, 30, 28, 220);
            g.rect(m.x - bw / 2, m.y + m.radius + 14, bw, 5);
            g.fill();
            g.fillColor = new Color(224, 82, 62, 255);
            g.rect(m.x - bw / 2, m.y + m.radius + 14, bw * ratio, 5);
            g.fill();
        }
        for (const [id, node] of Array.from(this._mobNodes.entries())) {
            if (!activeIds.has(id)) {
                node.destroy();
                this._mobNodes.delete(id);
            }
        }

        // 5. 主角 12 帧行走同步
        const pSp = this._playerNode.getChildByName('ArtSprite')?.getComponent(Sprite);
        const pSf = this._pMoving ? (this._pWalk[this._pDir][this._pAnimIdx] ?? this._pIdle[this._pDir]) : (this._pIdle[this._pDir] ?? this._pWalk[this._pDir][1]);
        if (pSp && pSf && pSp.spriteFrame !== pSf) pSp.spriteFrame = pSf;
        this._playerNode.setPosition(this._px, this._py + 12, 0);
        this._playerNode.setScale(this._pFaceX, 1, 1);

        if (this._invulnTimer > 0) {
            g.strokeColor = new Color(128, 244, 224, 230);
            g.lineWidth = 2.6;
            g.circle(this._px, this._py + 8, 28);
            g.stroke();
        }

        // 6. 青瘴泽幽雾遮罩（点亮 2 盏古灯后全岛清朗！）
        const fg = this._fogGfx;
        fg.clear();
        if (this._island?.id === 'mist_marsh') {
            const litCount = this._lootNodes.filter((n) => n.kind === 'lantern' && n.collected).length;
            if (litCount < 2) {
                fg.fillColor = new Color(18, 42, 34, litCount === 0 ? 115 : 58);
                fg.rect(-HALF_W, -HALF_H, ARENA_W, ARENA_H);
                fg.fill();
            }
        }
    }
}
