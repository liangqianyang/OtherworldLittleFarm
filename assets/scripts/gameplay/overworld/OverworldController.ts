/**
 * 《异界小农场 2.0》V1.3：2880×1620 阔境手绘大地图（动态流水、真鱼荷塘、零穿模碰撞、无圆圈干扰）
 * - 地图面积翻倍至 2880×1620，中庭四门、北境石坛、东侧大农田、东北灵泉荷塘、西岸南北双开荒旷野与南岸海湾全区疏通，开荒区不挡主路。
 * - 严格像素级水体/栅栏/桥面碰撞并通过全图可达性验证，杜绝穿栅栏、下河与桥头卡死。
 * - 河流配备多层北向南动态流水波纹与水光，东北荷塘采用真实手绘鱼类贴图游动，移除脚下橙色选中圆圈。
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
    LabelOutline,
    Layers,
    Node,
    Sprite,
    SpriteFrame,
    UITransform,
    Vec2,
} from 'cc';
import type { RiverSegmentId } from '../../core/GameTypes';
import { DataManager } from '../../core/DataManager';
import { EventBus } from '../../core/EventBus';
import { GameApp } from '../../app/GameApp';
import { FarmSystem } from '../farm/FarmSystem';
import { FishingOverlay } from '../../ui/FishingOverlay';
import { IndoorOverlay } from '../../ui/IndoorOverlay';
import { NpcDialogOverlay, type NpcId } from '../../ui/NpcDialogOverlay';
import { DungeonOverlay } from '../../ui/DungeonOverlay';
import { DefenseOverlay } from '../../ui/DefenseOverlay';
import { SettingsOverlay } from '../../ui/SettingsOverlay';
import { OverworldHUD } from '../../ui/OverworldHUD';
import { VoyageOverlay } from '../../ui/VoyageOverlay';
import { ArtLoader } from '../../core/ArtLoader';

const { ccclass } = _decorator;

export interface InteractTarget {
    id: string;
    kind: 'plot' | 'obstacle' | 'cottage' | 'kitchen' | 'shipping' | 'npc' | 'fishing' | 'seal' | 'portal' | 'dock';
    x: number;
    y: number;
    label: string;
    hint?: string;
    plotId?: number;
    obstacleTier?: 1 | 2 | 3;
    rewardItem?: 'wood' | 'stone';
    rewardCount?: number;
    npcId?: NpcId;
    riverSegment?: RiverSegmentId;
}

interface ObstacleDef {
    id: string;
    x: number;
    y: number;
    tier: 1 | 2 | 3;
    style: 'grass' | 'shrub' | 'boulder';
    name: string;
    rewardItem: 'wood' | 'stone';
    rewardCount: number;
}

interface PondFishView {
    node: Node;
    artKey: string;
    phase: number;
    speed: number;
    rx: number;
    ry: number;
    cx: number;
    cy: number;
}

const MAP_W = 2880;
const MAP_H = 1620;
const WORLD_HALF_W = MAP_W / 2; // 1440
const WORLD_HALF_H = MAP_H / 2; // 810
const VIEW_HALF_W = 640;
const VIEW_HALF_H = 360;
const PLAYER_SPEED = 205;
const INTERACT_RADIUS = 104;

/** 像素级实测采样的河道左右岸边界表（每 60px 一档，线性插值） */
const RIVER_TABLE: readonly [number, number, number][] = [
    [780, -430, -238], [720, -460, -268], [660, -466, -274], [600, -460, -256],
    [540, -382, -220], [480, -370, -214], [420, -352, -160], [360, -358, -172],
    [300, -382, -184], [240, -424, -244], [180, -466, -268], [120, -496, -328],
    [60, -526, -328], [0, -470, -310], [-60, -470, -310], [-120, -502, -292],
    [-180, -466, -298], [-240, -394, -196], [-300, -394, -184], [-360, -388, -190],
    [-420, -412, -214], [-480, -442, -244], [-540, -496, -274], [-600, -526, -316],
    [-660, -610, -328], [-720, -658, -64], [-780, -718, -64],
];

/** 南岸海湾水岸线（wx → 可站立最低 py） */
const BAY_SHORE: readonly [number, number][] = [
    [-1440, -760], [-1000, -760], [-800, -760], [-700, -730], [-600, -630],
    [-500, -540], [-200, -620], [-100, -610], [0, -595], [100, -580],
    [200, -595], [300, -605], [400, -605], [500, -615], [600, -595],
    [700, -615], [800, -635], [900, -670], [1000, -700], [1200, -700], [1440, -730],
];

function getRiverBounds(py: number): [number, number] {
    if (py >= RIVER_TABLE[0][0]) return [RIVER_TABLE[0][1], RIVER_TABLE[0][2]];
    const last = RIVER_TABLE[RIVER_TABLE.length - 1];
    if (py <= last[0]) return [last[1], last[2]];
    for (let i = 0; i < RIVER_TABLE.length - 1; i++) {
        const [y0, l0, r0] = RIVER_TABLE[i];
        const [y1, l1, r1] = RIVER_TABLE[i + 1];
        if (py <= y0 && py >= y1) {
            const t = (y0 - py) / (y0 - y1);
            return [l0 + (l1 - l0) * t, r0 + (r1 - r0) * t];
        }
    }
    return [-450, -280];
}

function getBayMinY(px: number): number {
    if (px <= BAY_SHORE[0][0]) return BAY_SHORE[0][1];
    const last = BAY_SHORE[BAY_SHORE.length - 1];
    if (px >= last[0]) return last[1];
    for (let i = 0; i < BAY_SHORE.length - 1; i++) {
        const [x0, y0] = BAY_SHORE[i];
        const [x1, y1] = BAY_SHORE[i + 1];
        if (px >= x0 && px <= x1) {
            const t = (px - x0) / (x1 - x0);
            return y0 + (y1 - y0) * t;
        }
    }
    return -620;
}

/** 东侧手绘木栅栏内 4×3 主田左半区（开局直接可种的 6 块农田） */
const STARTER_PLOT_COORDS: { x: number; y: number }[] = [
    { x: 880, y: 90 }, { x: 1005, y: 90 },
    { x: 880, y: -55 }, { x: 1005, y: -55 },
    { x: 880, y: -200 }, { x: 1005, y: -200 },
];

/** 剩余 24 块分阶段解锁农田（东侧轻草 6 块 + 西岸南空地一阶 9 块 + 西岸北空地二阶 9 块 = 全岛 30 块，完全不挡主路） */
const OBSTACLES: ObstacleDef[] = [
    // 东侧 4×3 右半区：6 块薄草荒地
    { id: 'obs_east_grass_0', x: 1130, y: 90, tier: 1, style: 'grass', name: '东田杂草', rewardItem: 'wood', rewardCount: 2 },
    { id: 'obs_east_grass_1', x: 1255, y: 90, tier: 1, style: 'grass', name: '东田杂草', rewardItem: 'wood', rewardCount: 2 },
    { id: 'obs_east_grass_2', x: 1130, y: -55, tier: 1, style: 'grass', name: '东田杂草', rewardItem: 'wood', rewardCount: 2 },
    { id: 'obs_east_grass_3', x: 1255, y: -55, tier: 1, style: 'grass', name: '东田杂草', rewardItem: 'wood', rewardCount: 2 },
    { id: 'obs_east_grass_4', x: 1130, y: -200, tier: 1, style: 'grass', name: '东田杂草', rewardItem: 'wood', rewardCount: 2 },
    { id: 'obs_east_grass_5', x: 1255, y: -200, tier: 1, style: 'grass', name: '东田杂草', rewardItem: 'wood', rewardCount: 2 },

    // 西岸南空地 3×3 梯田（一阶灌木碎石，9 块，位于土路西侧空地不挡路）
    { id: 'obs_west_t1_0', x: -1180, y: -260, tier: 1, style: 'shrub', name: '荒草灌木', rewardItem: 'wood', rewardCount: 4 },
    { id: 'obs_west_t1_1', x: -1065, y: -260, tier: 1, style: 'shrub', name: '苔藓碎石', rewardItem: 'stone', rewardCount: 4 },
    { id: 'obs_west_t1_2', x: -950, y: -260, tier: 1, style: 'shrub', name: '枯木灌丛', rewardItem: 'wood', rewardCount: 4 },
    { id: 'obs_west_t1_3', x: -1180, y: -365, tier: 1, style: 'shrub', name: '苔藓碎石', rewardItem: 'stone', rewardCount: 4 },
    { id: 'obs_west_t1_4', x: -1065, y: -365, tier: 1, style: 'shrub', name: '荒草灌木', rewardItem: 'wood', rewardCount: 5 },
    { id: 'obs_west_t1_5', x: -950, y: -365, tier: 1, style: 'shrub', name: '苔藓碎石', rewardItem: 'stone', rewardCount: 4 },
    { id: 'obs_west_t1_6', x: -1180, y: -470, tier: 1, style: 'shrub', name: '枯木灌丛', rewardItem: 'wood', rewardCount: 5 },
    { id: 'obs_west_t1_7', x: -1065, y: -470, tier: 1, style: 'shrub', name: '荒草灌木', rewardItem: 'wood', rewardCount: 4 },
    { id: 'obs_west_t1_8', x: -950, y: -470, tier: 1, style: 'shrub', name: '苔藓碎石', rewardItem: 'stone', rewardCount: 5 },

    // 西岸北空地 3×3 梯田（二阶深林古岩，9 块，位于古树空地不挡路）
    { id: 'obs_west_t2_0', x: -1180, y: 530, tier: 2, style: 'boulder', name: '二阶古岩', rewardItem: 'stone', rewardCount: 7 },
    { id: 'obs_west_t2_1', x: -1065, y: 530, tier: 2, style: 'boulder', name: '二阶铁木', rewardItem: 'wood', rewardCount: 7 },
    { id: 'obs_west_t2_2', x: -950, y: 530, tier: 2, style: 'boulder', name: '二阶古岩', rewardItem: 'stone', rewardCount: 7 },
    { id: 'obs_west_t2_3', x: -1180, y: 425, tier: 2, style: 'boulder', name: '二阶铁木', rewardItem: 'wood', rewardCount: 8 },
    { id: 'obs_west_t2_4', x: -1065, y: 425, tier: 2, style: 'boulder', name: '二阶古岩', rewardItem: 'stone', rewardCount: 8 },
    { id: 'obs_west_t2_5', x: -950, y: 425, tier: 2, style: 'boulder', name: '二阶铁木', rewardItem: 'wood', rewardCount: 7 },
    { id: 'obs_west_t2_6', x: -1180, y: 320, tier: 2, style: 'boulder', name: '二阶古岩', rewardItem: 'stone', rewardCount: 8 },
    { id: 'obs_west_t2_7', x: -1065, y: 320, tier: 2, style: 'boulder', name: '二阶铁木', rewardItem: 'wood', rewardCount: 8 },
    { id: 'obs_west_t2_8', x: -950, y: 320, tier: 2, style: 'boulder', name: '二阶古岩', rewardItem: 'stone', rewardCount: 8 },
];

const FISH_ID_TO_ART: Record<string, string> = {
    brook_loach: 'fish_brook_loach',
    brook_trout: 'fish_brook_trout',
    lotus_crucian: 'fish_lotus_crucian',
    lotus_koi: 'fish_lotus_koi',
    estuary_perch: 'fish_estuary_perch',
    estuary_dragon: 'fish_estuary_dragon',
};

@ccclass('OverworldController')
export class OverworldController extends Component {
    private static _inst: OverworldController | null = null;

    private _worldRoot!: Node;
    private _waterFxGfx!: Graphics;
    private _pondFishLayer!: Node;
    private _pondFishViews: PondFishView[] = [];
    private _pondFishSig = '';
    private _plotsLayer!: Node;
    private _obstaclesLayer!: Node;
    private _playerNode!: Node;
    private _playerBody!: Node;
    private _bridgeFrontRail!: Node;
    private _petNode!: Node;
    private _petPos = new Vec2(180, -90);
    private _dockOldNode!: Node;
    private _dockSailNode!: Node;
    private _joyBase!: Node;
    private _joyKnob!: Node;

    private _playerPos = new Vec2(235, -70);
    private _keys = new Set<KeyCode>();
    private _joyActive = false;
    private _joyOrigin = new Vec2();
    private _joyDir = new Vec2();
    private _walkPhase = 0;
    private _facingX = 1;
    private _facingDir: 'front' | 'side' | 'back' = 'front';
    private _walkFrames: Record<'front' | 'side' | 'back', (SpriteFrame | null)[]> = {
        front: [null, null, null, null],
        side: [null, null, null, null],
        back: [null, null, null, null],
    };
    private _idleSprites: Partial<Record<'front' | 'side' | 'back', SpriteFrame>> = {};
    private _animFrameIdx = 0;
    private _animTimer = 0;
    private _dustTimer = 0;
    private _dusts: { x: number; y: number; r: number; life: number }[] = [];
    private _smokePuffs: { x: number; y: number; r: number; life: number; maxLife: number }[] = [];
    private _smokeTimer = 0;
    private _ambientGfx!: Graphics;
    private _ambientTime = 0;

    private _plotNodes = new Map<number, { root: Node; gfx: Graphics; lbl: Label; cropNode: Node; cropKey: string }>();
    private _obstacleNodes = new Map<string, Node>();
    private _nearestTarget: InteractTarget | null = null;

    public static get inst(): OverworldController | null {
        return this._inst;
    }

    public get nearestTarget(): InteractTarget | null {
        return this._nearestTarget;
    }

    protected onLoad(): void {
        OverworldController._inst = this;
        this._buildWorldScene();
        this._buildTouchJoystickLayer();
        input.on(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this._onKeyUp, this);
        EventBus.inst.on('dayAdvanced', this.refreshWorldObjects, this);
        EventBus.inst.on('saveCompleted', this.refreshWorldObjects, this);
    }

    protected start(): void {
        this.schedule(this._waitReady, 0.1);
    }

    protected onDestroy(): void {
        if (OverworldController._inst === this) OverworldController._inst = null;
        this.unschedule(this._waitReady);
        input.off(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this._onKeyUp, this);
        EventBus.inst.offTarget(this);
    }

    private _waitReady(): void {
        if (GameApp.inst?.ready) {
            FarmSystem.inst.init();
            this.refreshWorldObjects();
            this.unschedule(this._waitReady);
        }
    }

    private _uiNode(name: string, parent: Node): Node {
        const n = new Node(name);
        n.layer = Layers.Enum.UI_2D;
        n.parent = parent;
        return n;
    }

    private _isModalOpen(): boolean {
        return !!(
            FishingOverlay.inst?.isOpen ||
            IndoorOverlay.inst?.isOpen ||
            NpcDialogOverlay.inst?.isOpen ||
            DungeonOverlay.inst?.isOpen ||
            DefenseOverlay.inst?.isOpen ||
            SettingsOverlay.inst?.isOpen ||
            OverworldHUD.isTitleOpen ||
            VoyageOverlay.inst?.isOpen
        );
    }

    private _buildWorldScene(): void {
        this._worldRoot = this._uiNode('WorldRoot', this.node);
        this._worldRoot.setSiblingIndex(0);

        // 1. 全新 2880×1620 阔境手绘国风大地图底图
        const bgNode = this._uiNode('OverworldMapBg', this._worldRoot);
        const bgGfx = bgNode.addComponent(Graphics);
        bgGfx.fillColor = new Color(184, 210, 174, 255);
        bgGfx.rect(-WORLD_HALF_W, -WORLD_HALF_H, MAP_W, MAP_H);
        bgGfx.fill();
        ArtLoader.applySprite(bgNode, 'bg_overworld_map', MAP_W, MAP_H);

        // 1.5 河流动态流水波纹层（位于桥面与建筑之下，贴合水面）
        this._waterFxGfx = this._uiNode('WaterFlowFx', this._worldRoot).addComponent(Graphics);

        // 1.6 东北灵泉荷塘真实手绘鱼类游动层
        this._pondFishLayer = this._uiNode('PondFishLayer', this._worldRoot);

        // 2. 跨河正交水平木拱桥（底层桥面，严丝合缝衔接中庭西门土路与西岸草径）
        const bridgeNode = this._uiNode('BridgeArt', this._worldRoot);
        bridgeNode.setPosition(-405, -18, 0);
        ArtLoader.applySprite(bridgeNode, 'prop_bridge_wood', 310, 126);

        // 3. 核心正面正交手绘建筑
        this._drawArtLandmark('主角农舍', 90, 96, 'bld_cottage', 220, 146, 82);
        this._drawArtLandmark('室外灶棚', 385, 92, 'bld_kitchen_shed', 156, 124, 70);
        this._drawArtLandmark('秘境石门', 105, 650, 'bld_dungeon_portal', 152, 162, 90);
        this._drawArtLandmark('封印古碑', 365, 650, 'bld_seal_arch', 156, 168, 92);

        // 出货箱（置于石板路北侧，不挡东田木门）
        this._drawArtLandmark('出货箱', 680, 96, 'prop_shipping_crate', 74, 68, 42);

        // 南岸旧码头 / 出海帆船
        this._dockOldNode = this._uiNode('DockOld', this._worldRoot);
        this._dockOldNode.setPosition(115, -630, 0);
        ArtLoader.applySprite(this._dockOldNode, 'prop_old_dock', 240, 100);
        const dockLbl1 = this._uiNode('Lbl', this._dockOldNode).addComponent(Label);
        dockLbl1.node.setPosition(0, 58, 0);
        dockLbl1.string = '南岸旧码头';
        this._styleWorldLabel(dockLbl1, new Color(34, 46, 40, 255));

        this._dockSailNode = this._uiNode('DockSail', this._worldRoot);
        this._dockSailNode.setPosition(115, -610, 0);
        ArtLoader.applySprite(this._dockSailNode, 'prop_sail_boat', 164, 184);
        const dockLbl2 = this._uiNode('Lbl', this._dockSailNode).addComponent(Label);
        dockLbl2.node.setPosition(0, 96, 0);
        dockLbl2.string = '南岸出海帆船';
        this._styleWorldLabel(dockLbl2, new Color(22, 68, 64, 255));
        this._dockSailNode.active = false;

        // 4. 4 位常驻 NPC 沉稳驻岗
        this._drawNpcArt('陆伯', 680, -195, 'npc_lubo', 52, 112);
        this._drawNpcArt('江老', 645, 425, 'npc_jianglao', 58, 112);
        this._drawNpcArt('玄墨', 235, 515, 'npc_xuanmo', 48, 112);
        this._drawNpcArt('阿棠', 315, -470, 'npc_atang', 54, 112);

        // 5. 三处水边手绘垂钓木桩与竹鱼篓素材
        this._drawFishingSpotArt(-155, 290);
        this._drawFishingSpotArt(730, 345);
        this._drawFishingSpotArt(-155, -355);

        this._plotsLayer = this._uiNode('PlotsLayer', this._worldRoot);
        this._obstaclesLayer = this._uiNode('ObstaclesLayer', this._worldRoot);

        this._buildPlayer();

        // V1.1 国风灵宠·青云小狐随行节点
        this._petNode = this._uiNode('SpiritPet', this._worldRoot);
        this._petNode.setPosition(this._petPos.x, this._petPos.y, 0);
        const petShadow = this._uiNode('Shadow', this._petNode).addComponent(Graphics);
        petShadow.fillColor = new Color(24, 38, 32, 65);
        petShadow.ellipse(0, -18, 15, 6);
        petShadow.fill();
        ArtLoader.applySprite(this._petNode, 'pet_spirit_fox', 52, 54);
        this._petNode.active = false;

        // 木桥前侧栏杆遮挡层（过桥时盖在主角脚踝前）
        this._bridgeFrontRail = this._uiNode('BridgeFrontRail', this._worldRoot);
        this._bridgeFrontRail.setPosition(-405, -18, 0);
        ArtLoader.applySprite(this._bridgeFrontRail, 'prop_bridge_front_rail', 310, 126);

        this._ambientGfx = this._uiNode('AmbientFx', this._worldRoot).addComponent(Graphics);

        // 初始立即生成荷塘真实游鱼精灵
        this._rebuildPondFishSprites();
    }

    private _rebuildPondFishSprites(): void {
        const stockedIds = GameApp.inst?.ready ? (GameApp.inst.saveData.farm.pondFishIds ?? []) : [];
        // 即使尚未放养，荷塘里也保留 2 条野生锦鲤/荷塘鲫游动；放养后额外同池展示对应真鱼贴图
        const artKeys: string[] = ['fish_lotus_koi', 'fish_lotus_crucian'];
        for (const fid of stockedIds) {
            artKeys.push(FISH_ID_TO_ART[fid] ?? 'fish_lotus_koi');
        }
        const sig = artKeys.join('|');
        if (sig === this._pondFishSig && this._pondFishViews.length > 0) return;
        this._pondFishSig = sig;

        this._pondFishLayer.removeAllChildren();
        this._pondFishViews = [];

        artKeys.forEach((artKey, idx) => {
            const fn = this._uiNode(`PondFish_${idx}`, this._pondFishLayer);
            const sizeW = artKey === 'fish_estuary_dragon' ? 54 : 44;
            const sizeH = artKey === 'fish_brook_loach' ? 18 : 26;
            ArtLoader.applySprite(fn, artKey, sizeW, sizeH, () => {
                const sp = fn.getChildByName('ArtSprite')?.getComponent(Sprite);
                if (sp) sp.color = new Color(238, 250, 248, 222);
            });
            const ring = idx % 3;
            this._pondFishViews.push({
                node: fn,
                artKey,
                phase: idx * 1.45,
                speed: 0.42 + (idx % 3) * 0.11,
                rx: 74 + ring * 44,
                ry: 32 + ring * 22,
                cx: 978 + (idx % 2 === 0 ? -18 : 22),
                cy: 472 + (idx % 3 - 1) * 18,
            });
        });
    }

    private _styleWorldLabel(lbl: Label, color: Color): void {
        lbl.fontSize = 14;
        lbl.lineHeight = 18;
        lbl.isBold = true;
        lbl.color = color;
        const outline = lbl.node.getComponent(LabelOutline) ?? lbl.node.addComponent(LabelOutline);
        outline.color = new Color(252, 248, 236, 240);
        outline.width = 2.2;
    }

    private _drawArtLandmark(title: string, x: number, y: number, artKey: string, w: number, h: number, lblOffsetY: number): void {
        const n = this._uiNode(`ArtLandmark_${artKey}`, this._worldRoot);
        n.setPosition(x, y, 0);
        // 双层柔和接地投影：消除建筑贴地漂浮与发白感
        const sg = this._uiNode('Shadow', n).addComponent(Graphics);
        sg.fillColor = new Color(22, 34, 28, 52);
        sg.ellipse(0, -h * 0.42, w * 0.49, Math.max(10, h * 0.14));
        sg.fill();
        sg.fillColor = new Color(18, 28, 22, 76);
        sg.ellipse(0, -h * 0.43, w * 0.39, Math.max(7, h * 0.09));
        sg.fill();
        const body = this._uiNode('ArtBody', n);
        ArtLoader.applySprite(body, artKey, w, h);
        const lbl = this._uiNode('Lbl', n).addComponent(Label);
        lbl.node.setPosition(0, lblOffsetY, 0);
        lbl.string = title;
        this._styleWorldLabel(lbl, new Color(34, 46, 40, 255));
    }

    private _drawNpcArt(title: string, x: number, y: number, artKey: string, w: number, h: number): void {
        const n = this._uiNode(`Npc_${artKey}`, this._worldRoot);
        n.setPosition(x, y, 0);
        const sg = this._uiNode('Shadow', n).addComponent(Graphics);
        sg.fillColor = new Color(24, 38, 32, 74);
        sg.ellipse(0, -h * 0.44, w * 0.44, 7.5);
        sg.fill();
        const body = this._uiNode('NpcBody', n);
        ArtLoader.applySprite(body, artKey, w, h);
        const lbl = this._uiNode('Lbl', n).addComponent(Label);
        lbl.node.setPosition(0, h * 0.56, 0);
        lbl.string = title;
        this._styleWorldLabel(lbl, new Color(30, 44, 38, 255));
    }

    private _drawFishingSpotArt(x: number, y: number): void {
        const n = this._uiNode(`FishingSpot_${x}_${y}`, this._worldRoot);
        n.setPosition(x, y, 0);
        const sg = this._uiNode('Shadow', n).addComponent(Graphics);
        sg.fillColor = new Color(24, 38, 32, 60);
        sg.ellipse(0, -22, 22, 7);
        sg.fill();
        ArtLoader.applySprite(n, 'prop_fishing_spot', 56, 62);
    }

    private _buildPlayer(): void {
        this._playerNode = this._uiNode('Player', this._worldRoot);
        this._playerNode.setPosition(this._playerPos.x, this._playerPos.y, 0);

        const shadow = this._uiNode('Shadow', this._playerNode);
        const sg = shadow.addComponent(Graphics);
        sg.fillColor = new Color(24, 38, 32, 78);
        sg.ellipse(0, 0, 17, 7);
        sg.fill();

        this._playerBody = this._uiNode('Body', this._playerNode);
        this._playerBody.setPosition(0, 42, 0);
        const bg = this._playerBody.addComponent(Graphics);
        ArtLoader.applySprite(this._playerBody, 'char_player_front', 82, 108, () => { bg.clear(); });
        void ArtLoader.loadSpriteFrame('char_player_front').then((sf) => { if (sf) this._idleSprites.front = sf; });
        void ArtLoader.loadSpriteFrame('char_player_side').then((sf) => { if (sf) this._idleSprites.side = sf; });
        void ArtLoader.loadSpriteFrame('char_player_back').then((sf) => { if (sf) this._idleSprites.back = sf; });
        (['front', 'side', 'back'] as const).forEach((dir) => {
            for (let i = 0; i < 4; i++) {
                void ArtLoader.loadSpriteFrame(`char_walk_${dir}_${i}`).then((sf) => {
                    if (sf) this._walkFrames[dir][i] = sf;
                });
            }
        });
    }

    private _buildTouchJoystickLayer(): void {
        const pad = this._uiNode('LeftTouchPad', this.node);
        const ut = pad.addComponent(UITransform);
        ut.setContentSize(640, 720);
        pad.setPosition(-320, 0, 0);
        pad.setSiblingIndex(1);

        this._joyBase = this._uiNode('JoyBase', this.node);
        const bg = this._joyBase.addComponent(Graphics);
        bg.strokeColor = new Color(31, 111, 104, 150);
        bg.fillColor = new Color(238, 243, 241, 90);
        bg.lineWidth = 3;
        bg.circle(0, 0, 56);
        bg.fill();
        bg.stroke();
        this._joyBase.active = false;

        this._joyKnob = this._uiNode('JoyKnob', this._joyBase);
        const kg = this._joyKnob.addComponent(Graphics);
        kg.fillColor = new Color(31, 111, 104, 210);
        kg.circle(0, 0, 22);
        kg.fill();

        pad.on(Node.EventType.TOUCH_START, (e: EventTouch) => {
            if (this._isModalOpen()) return;
            const loc = e.getUILocation();
            this._joyActive = true;
            this._joyOrigin.set(loc.x - 640, loc.y - 360);
            this._joyDir.set(0, 0);
            this._joyBase.setPosition(this._joyOrigin.x, this._joyOrigin.y, 0);
            this._joyKnob.setPosition(0, 0, 0);
            this._joyBase.active = true;
        });

        pad.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => {
            if (!this._joyActive || this._isModalOpen()) return;
            const loc = e.getUILocation();
            const dx = (loc.x - 640) - this._joyOrigin.x;
            const dy = (loc.y - 360) - this._joyOrigin.y;
            const dist = Math.hypot(dx, dy);
            const maxR = 52;
            if (dist > 6) {
                const clamped = Math.min(dist, maxR);
                this._joyKnob.setPosition((dx / dist) * clamped, (dy / dist) * clamped, 0);
                this._joyDir.set(dx / dist, dy / dist);
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
    }

    private _onKeyDown(e: EventKeyboard): void {
        this._keys.add(e.keyCode);
    }

    private _onKeyUp(e: EventKeyboard): void {
        this._keys.delete(e.keyCode);
    }

    private _isObstacleClearedOrLegacyOccupied(obsId: string): boolean {
        const app = GameApp.inst;
        if (!app?.ready) return false;
        if (app.saveData.farm.clearedObstacleIds.includes(obsId)) return true;
        const knownClearedCount = app.saveData.farm.clearedObstacleIds.filter((cid) => OBSTACLES.some((o) => o.id === cid)).length;
        const legacyExtra = Math.max(0, app.saveData.farm.plots.length - STARTER_PLOT_COORDS.length - knownClearedCount);
        if (legacyExtra > 0) {
            const idx = OBSTACLES.findIndex((o) => o.id === obsId);
            if (idx >= 0 && idx < legacyExtra) return true;
        }
        return false;
    }

    public refreshWorldObjects(): void {
        const app = GameApp.inst;
        if (!app?.ready) return;

        if (this._petNode) this._petNode.active = !!app.saveData.farm.petAdopted;
        const dockOk = !!app.saveData.islands.dockRepaired;
        if (this._dockOldNode) this._dockOldNode.active = !dockOk;
        if (this._dockSailNode) this._dockSailNode.active = dockOk;
        this._rebuildPondFishSprites();

        for (const plot of app.saveData.farm.plots) {
            const coord = this._getPlotCoord(plot.plotId);
            let view = this._plotNodes.get(plot.plotId);
            if (!view) {
                const root = this._uiNode(`Plot_${plot.plotId}`, this._plotsLayer);
                const gfx = root.addComponent(Graphics);
                const cropNode = this._uiNode('CropArt', root);
                cropNode.setPosition(0, 8, 0);
                const lblNode = this._uiNode('Lbl', root);
                lblNode.setPosition(0, -34, 0);
                const lbl = lblNode.addComponent(Label);
                lbl.fontSize = 12;
                lbl.lineHeight = 15;
                lbl.color = new Color(34, 48, 42, 235);
                view = { root, gfx, lbl, cropNode, cropKey: '' };
                this._plotNodes.set(plot.plotId, view);
            }
            view.root.setPosition(coord.x, coord.y, 0);

            const g = view.gfx;
            g.clear();
            const watered = FarmSystem.inst.isWateredToday(plot);
            g.fillColor = watered ? new Color(118, 86, 60, 245) : new Color(166, 128, 92, 240);
            g.strokeColor = new Color(96, 70, 48, 210);
            g.lineWidth = 1.8;
            g.roundRect(-36, -27, 72, 54, 8);
            g.fill();
            g.stroke();
            g.strokeColor = watered ? new Color(92, 64, 42, 130) : new Color(138, 102, 70, 125);
            g.lineWidth = 1.3;
            for (const ry of [-12, 0, 12]) {
                g.moveTo(-24, ry);
                g.lineTo(24, ry);
            }
            g.stroke();

            if (!plot.plantId) {
                view.lbl.string = '';
                view.cropNode.active = false;
            } else {
                const def = DataManager.inst.getPlant(plot.plantId);
                const mature = FarmSystem.inst.isMature(plot);
                const ratio = def ? Math.min(1, plot.growthDays / Math.max(1, def.growDays)) : 0;

                const desiredKey =
                    def?.id === 'thunder_potato'
                        ? 'plant_thunder_potato'
                        : def?.category === 'combo'
                        ? 'plant_sky_bamboo_combo'
                        : 'crop_spring_greens';

                view.cropNode.active = true;
                if (view.cropKey !== desiredKey) {
                    view.cropKey = desiredKey;
                    view.cropNode.removeAllChildren();
                    ArtLoader.applySprite(view.cropNode, desiredKey, 58, 54);
                }

                if (mature) {
                    g.fillColor = new Color(252, 234, 152, 145);
                    g.circle(0, 4, 24);
                    g.fill();
                    view.cropNode.setScale(1, 1, 1);
                    view.lbl.string = `${def?.name ?? ''}✓`;
                } else {
                    const sc = 0.46 + ratio * 0.38;
                    view.cropNode.setScale(sc, sc, 1);
                    view.lbl.string = `${plot.growthDays}/${def?.growDays ?? 1}`;
                }
            }
        }

        for (const obs of OBSTACLES) {
            const cleared = this._isObstacleClearedOrLegacyOccupied(obs.id);
            let node = this._obstacleNodes.get(obs.id);
            if (cleared) {
                if (node) node.active = false;
                continue;
            }
            if (!node) {
                node = this._uiNode(`Obs_${obs.id}`, this._obstaclesLayer);
                node.setPosition(obs.x, obs.y, 0);
                const artKey = obs.style === 'grass' ? 'obs_grass' : obs.style === 'shrub' ? 'obs_shrub' : 'obs_boulder';
                const [aw, ah] = obs.style === 'grass' ? [70, 50] : obs.style === 'shrub' ? [72, 66] : [72, 56];
                const artHolder = this._uiNode('ObsArt', node);
                artHolder.setPosition(0, 2, 0);
                ArtLoader.applySprite(artHolder, artKey, aw, ah);
                this._obstacleNodes.set(obs.id, node);
            }
            node.active = true;
        }
    }

    private _getPlotCoord(plotId: number): { x: number; y: number } {
        if (plotId < STARTER_PLOT_COORDS.length) return STARTER_PLOT_COORDS[plotId];
        const app = GameApp.inst;
        const cleared = app?.saveData.farm.clearedObstacleIds ?? [];
        const extraIdx = plotId - STARTER_PLOT_COORDS.length;
        const knownCleared = cleared.filter((cid) => OBSTACLES.some((o) => o.id === cid));
        const legacyExtra = Math.max(0, (app?.saveData.farm.plots.length ?? 6) - STARTER_PLOT_COORDS.length - knownCleared.length);

        if (extraIdx < legacyExtra) {
            const slot = OBSTACLES[Math.min(extraIdx, OBSTACLES.length - 1)];
            return { x: slot.x, y: slot.y };
        }
        const cid = knownCleared[extraIdx - legacyExtra];
        const obs = OBSTACLES.find((o) => o.id === cid);
        if (obs) return { x: obs.x, y: obs.y };
        const fallback = OBSTACLES[Math.min(extraIdx, OBSTACLES.length - 1)];
        return { x: fallback.x, y: fallback.y };
    }

    public getNearbyPlotIds(centerPlotId: number, maxCount: number): number[] {
        const app = GameApp.inst;
        if (!app?.ready) return [centerPlotId];
        const center = this._getPlotCoord(centerPlotId);
        const list = app.saveData.farm.plots
            .map((p) => {
                const c = this._getPlotCoord(p.plotId);
                return { id: p.plotId, dist: Math.hypot(c.x - center.x, c.y - center.y) };
            })
            .filter((item) => item.dist <= 185)
            .sort((a, b) => a.dist - b.dist);
        return list.slice(0, maxCount).map((i) => i.id);
    }

    protected update(dt: number): void {
        if (this._isModalOpen()) return;

        let vx = this._joyDir.x;
        let vy = this._joyDir.y;

        if (this._keys.has(KeyCode.KEY_W) || this._keys.has(KeyCode.ARROW_UP)) vy += 1;
        if (this._keys.has(KeyCode.KEY_S) || this._keys.has(KeyCode.ARROW_DOWN)) vy -= 1;
        if (this._keys.has(KeyCode.KEY_A) || this._keys.has(KeyCode.ARROW_LEFT)) vx -= 1;
        if (this._keys.has(KeyCode.KEY_D) || this._keys.has(KeyCode.ARROW_RIGHT)) vx += 1;

        const len = Math.hypot(vx, vy);
        if (len > 0.01) {
            vx /= len;
            vy /= len;
            const nx = Math.max(-1330, Math.min(1330, this._playerPos.x + vx * PLAYER_SPEED * dt));
            const ny = Math.max(-700, Math.min(720, this._playerPos.y + vy * PLAYER_SPEED * dt));

            const hitBox = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): boolean =>
                px > x1 && px < x2 && py > y1 && py < y2;

            const canStand = (px: number, py: number): boolean => {
                // 1. 像素级蜿蜒主河道水域碰撞（仅水平木桥桥面通道 px in [-565, -245] && py in [-44, 14] 可过）
                const [rLeft, rRight] = getRiverBounds(py);
                const onBridgeDeck = px >= -565 && px <= -245 && py >= -44 && py <= 14;
                if (px > rLeft && px < rRight && !onBridgeDeck) return false;

                // 2. 南岸海湾精准水岸线碰撞
                if (py < getBayMinY(px)) return false;

                // 3. 东北独立灵泉荷塘水域碰撞
                const inPond = ((px - 975) / 282) ** 2 + ((py - 475) / 178) ** 2 < 1;
                if (inPond) return false;

                // 4. 核心建筑实体碰撞
                if (hitBox(px, py, -16, 30, 196, 168)) return false;      // 主角农舍
                if (hitBox(px, py, 310, 32, 460, 158)) return false;      // 室外灶棚
                if (hitBox(px, py, 32, 580, 178, 725)) return false;      // 秘境石门
                if (hitBox(px, py, 290, 580, 440, 725)) return false;     // 封印古碑
                if (hitBox(px, py, 642, 64, 718, 128)) return false;      // 出货箱

                // 5. 北境古石坛前护墙（中段宽石阶 x in [145, 335] 畅通）
                if (hitBox(px, py, -85, 425, 145, 478)) return false;
                if (hitBox(px, py, 335, 425, 555, 478)) return false;

                // 6. 中庭手绘竹篱围栏碰撞（四面宽敞大门畅通）
                if (hitBox(px, py, -105, 178, 165, 224)) return false;    // 北竹篱左
                if (hitBox(px, py, 305, 178, 562, 224)) return false;     // 北竹篱右
                if (hitBox(px, py, -105, -296, 165, -246)) return false;  // 南竹篱左
                if (hitBox(px, py, 305, -296, 562, -246)) return false;   // 南竹篱右
                if (hitBox(px, py, -105, 30, -72, 224)) return false;     // 西竹篱上
                if (hitBox(px, py, -105, -296, -72, -65)) return false;   // 西竹篱下
                if (hitBox(px, py, 530, 22, 565, 224)) return false;      // 东竹篱上
                if (hitBox(px, py, 530, -296, 565, -95)) return false;    // 东竹篱下

                // 7. 东侧农田手绘木栅栏碰撞（西面宽大门洞 y in [-115, 22] 畅通）
                if (hitBox(px, py, 755, 182, 1345, 228)) return false;    // 东田北栅栏
                if (hitBox(px, py, 755, -395, 1345, -348)) return false;  // 东田南栅栏
                if (hitBox(px, py, 1310, -395, 1355, 228)) return false;  // 东田东栅栏
                if (hitBox(px, py, 752, 22, 795, 228)) return false;      // 东田西栅栏上
                if (hitBox(px, py, 752, -395, 795, -115)) return false;   // 东田西栅栏下

                return true;
            };

            let finalX = this._playerPos.x;
            let finalY = this._playerPos.y;
            if (canStand(nx, finalY)) finalX = nx;
            if (canStand(finalX, ny)) finalY = ny;
            this._playerPos.set(finalX, finalY);

            if (Math.abs(vx) > Math.abs(vy) * 0.85) {
                this._facingDir = 'side';
                this._facingX = vx < 0 ? -1 : 1;
            } else if (vy > 0) {
                this._facingDir = 'back';
                this._facingX = 1;
            } else {
                this._facingDir = 'front';
                this._facingX = 1;
            }

            this._animTimer += dt;
            if (this._animTimer >= 0.16) {
                this._animTimer -= 0.16;
                this._animFrameIdx = (this._animFrameIdx + 1) % 4;
            }
            const spNode = this._playerBody.getChildByName('ArtSprite');
            const sp = spNode?.getComponent(Sprite);
            const frameSf = this._walkFrames[this._facingDir][this._animFrameIdx] ?? this._idleSprites[this._facingDir];
            if (sp && frameSf && sp.spriteFrame !== frameSf) {
                sp.spriteFrame = frameSf;
            }

            this._walkPhase += dt * 8.5;
            this._playerBody.setPosition(0, 42 + Math.abs(Math.sin(this._walkPhase)) * 2.5, 0);
            this._playerBody.angle = 0;
            this._playerBody.setScale(this._facingX, 1, 1);

            this._dustTimer -= dt;
            if (this._dustTimer <= 0) {
                this._dustTimer = 0.24;
                this._dusts.push({ x: this._playerPos.x, y: this._playerPos.y - 2, r: 4 + Math.random() * 2, life: 0.28 });
            }
        } else {
            this._animFrameIdx = 1;
            const spNode = this._playerBody.getChildByName('ArtSprite');
            const sp = spNode?.getComponent(Sprite);
            const idleSf = this._idleSprites[this._facingDir] ?? this._walkFrames[this._facingDir][1];
            if (sp && idleSf && sp.spriteFrame !== idleSf) {
                sp.spriteFrame = idleSf;
            }
            this._playerBody.setPosition(0, 42, 0);
            this._playerBody.angle = 0;
            this._playerBody.setScale(this._facingX, 1, 1);
        }

        // 过拱桥平滑弧度抬升
        let archLift = 0;
        if (this._playerPos.x >= -560 && this._playerPos.x <= -250 && this._playerPos.y >= -46 && this._playerPos.y <= 16) {
            const t = (this._playerPos.x - -560) / 310;
            archLift = Math.sin(t * Math.PI) * 14;
        }
        this._playerNode.setPosition(this._playerPos.x, this._playerPos.y + archLift, 0);
        if (this._bridgeFrontRail) {
            this._bridgeFrontRail.active = this._playerPos.y >= -46;
        }

        // 摄像机边界钳位（2880×1620 阔境平滑跟随，绝不露出地图外黑边）
        const maxCamX = WORLD_HALF_W - VIEW_HALF_W; // 800
        const maxCamY = WORLD_HALF_H - VIEW_HALF_H; // 450
        const targetX = Math.max(-maxCamX, Math.min(maxCamX, -this._playerPos.x));
        const targetY = Math.max(-maxCamY, Math.min(maxCamY, -this._playerPos.y));
        const cur = this._worldRoot.position;
        const lerp = Math.min(1, dt * 7);
        this._worldRoot.setPosition(
            cur.x + (targetX - cur.x) * lerp,
            cur.y + (targetY - cur.y) * lerp,
            0
        );

        this._updateNearestTarget();
        this._stepAmbientFx(dt);
    }

    private _stepAmbientFx(dt: number): void {
        this._ambientTime += dt;

        // 1. 河流北向南动态流水波纹 + 荷塘/海湾柔光涟漪
        if (this._waterFxGfx) {
            const wg = this._waterFxGfx;
            wg.clear();

            // 三股不同流速的流水纹沿着 RIVER_TABLE 中心线自北向南连续流动
            const streams = [
                { lane: -0.26, speed: 58, segLen: 46, gap: 150, alpha: 125, width: 2.2 },
                { lane: 0.02, speed: 74, segLen: 58, gap: 170, alpha: 155, width: 2.6 },
                { lane: 0.27, speed: 52, segLen: 42, gap: 145, alpha: 115, width: 2.0 },
            ];
            for (const st of streams) {
                const offset = (this._ambientTime * st.speed) % st.gap;
                wg.strokeColor = new Color(232, 252, 248, st.alpha);
                wg.lineWidth = st.width;
                for (let headY = 780 - offset; headY > -720; headY -= st.gap) {
                    const tailY = headY + st.segLen;
                    const midY = (headY + tailY) * 0.5;
                    const [l1, r1] = getRiverBounds(tailY);
                    const [l2, r2] = getRiverBounds(midY);
                    const [l3, r3] = getRiverBounds(headY);
                    const x1 = (l1 + r1) * 0.5 + (r1 - l1) * 0.5 * st.lane;
                    const x2 = (l2 + r2) * 0.5 + (r2 - l2) * 0.5 * st.lane + Math.sin(this._ambientTime * 2.4 + midY * 0.02) * 4;
                    const x3 = (l3 + r3) * 0.5 + (r3 - l3) * 0.5 * st.lane;
                    wg.moveTo(x1, tailY);
                    wg.lineTo(x2, midY);
                    wg.lineTo(x3, headY);
                }
                wg.stroke();
            }

            // 河面漂浮碎光点
            for (let i = 0; i < 14; i++) {
                const wy = 760 - ((this._ambientTime * (44 + (i % 4) * 10) + i * 112) % 1460);
                const [rl, rr] = getRiverBounds(wy);
                const frac = 0.25 + ((i * 37) % 50) / 100;
                const wx = rl + (rr - rl) * frac;
                const pulse = 0.45 + 0.55 * Math.sin(this._ambientTime * 3.5 + i);
                wg.fillColor = new Color(242, 255, 252, Math.floor(pulse * 140));
                wg.ellipse(wx, wy, 3.2, 8.5);
                wg.fill();
            }

            // 南岸海湾缓动浪纹
            wg.strokeColor = new Color(235, 252, 250, 120);
            wg.lineWidth = 2.0;
            for (let wi = 0; wi < 4; wi++) {
                const wx = -240 + wi * 380 + Math.sin(this._ambientTime * 1.1 + wi) * 18;
                const wy = -710 + (wi % 2) * 26 + Math.cos(this._ambientTime * 1.4 + wi) * 5;
                wg.moveTo(wx - 48, wy);
                wg.lineTo(wx + 48, wy);
            }
            wg.stroke();

            // 三处钓点水面柔和涟漪提示
            for (const [rx, ry] of [[-238, 290], [835, 395], [-235, -355]]) {
                const rr = 9 + ((this._ambientTime * 12) % 20);
                const alpha = Math.max(0, Math.floor((1 - (rr - 9) / 20) * 165));
                wg.strokeColor = new Color(236, 252, 248, alpha);
                wg.lineWidth = 1.7;
                wg.ellipse(rx, ry, rr, rr * 0.54);
                wg.stroke();
            }
        }

        // 2. 东北灵泉荷塘真实手绘鱼类精灵游动（按游向自动翻面与摆尾）
        for (const f of this._pondFishViews) {
            const ang = this._ambientTime * f.speed + f.phase;
            const fx = f.cx + Math.cos(ang) * f.rx;
            const fy = f.cy + Math.sin(ang) * f.ry;
            const vx = -Math.sin(ang) * f.rx * f.speed;
            const vy = Math.cos(ang) * f.ry * f.speed;
            f.node.setPosition(fx, fy, 0);
            const flipX = vx < 0 ? -1 : 1;
            f.node.setScale(flipX, 1, 1);
            const pitch = Math.atan2(vy, Math.abs(vx) + 1e-3) * (180 / Math.PI) * 0.45;
            f.node.angle = flipX > 0 ? pitch : -pitch;
        }

        if (!this._ambientGfx) return;
        const g = this._ambientGfx;
        g.clear();

        // 3. 脚步轻柔扬尘
        for (const d of this._dusts) {
            d.life -= dt;
            d.r += dt * 7;
            if (d.life > 0) {
                g.fillColor = new Color(236, 230, 212, Math.floor((d.life / 0.28) * 120));
                g.circle(d.x, d.y, d.r);
                g.fill();
            }
        }
        this._dusts = this._dusts.filter((d) => d.life > 0);

        // 4. 室外灶棚轻柔炊烟
        this._smokeTimer -= dt;
        if (this._smokeTimer <= 0) {
            this._smokeTimer = 0.65;
            this._smokePuffs.push({ x: 385 + (Math.random() - 0.5) * 8, y: 132, r: 6, life: 2.0, maxLife: 2.0 });
        }
        for (const s of this._smokePuffs) {
            s.life -= dt;
            s.y += dt * 22;
            s.r += dt * 5;
            if (s.life > 0) {
                g.fillColor = new Color(250, 248, 242, Math.floor((s.life / s.maxLife) * 110));
                g.circle(s.x, s.y, s.r);
                g.fill();
            }
        }
        this._smokePuffs = this._smokePuffs.filter((s) => s.life > 0);

        // 5. 灵宠·青云小狐随行
        if (this._petNode && this._petNode.active) {
            const dx = this._playerPos.x - 44 * this._facingX - this._petPos.x;
            const dy = this._playerPos.y - 16 - this._petPos.y;
            const d = Math.hypot(dx, dy);
            if (d > 16) {
                const step = Math.min(d, 185 * dt);
                this._petPos.x += (dx / d) * step;
                this._petPos.y += (dy / d) * step;
                const hop = Math.abs(Math.sin(this._ambientTime * 8)) * 4;
                this._petNode.setPosition(this._petPos.x, this._petPos.y + 22 + hop, 0);
                this._petNode.setScale(dx < -2 ? -1 : 1, 1, 1);
            } else {
                this._petNode.setPosition(this._petPos.x, this._petPos.y + 22, 0);
            }
        }
    }

    private _updateNearestTarget(): void {
        const app = GameApp.inst;
        if (!app?.ready) return;

        const candidates: InteractTarget[] = [
            { id: 'cottage', kind: 'cottage', x: 90, y: 18, label: '进入屋舍' },
            { id: 'kitchen', kind: 'kitchen', x: 385, y: 18, label: '室外下厨' },
            { id: 'shipping', kind: 'shipping', x: 680, y: 52, label: '出货卖菜' },
            { id: 'npc_lubo', kind: 'npc', npcId: 'lubo', x: 680, y: -195, label: '对话·陆伯' },
            { id: 'npc_jianglao', kind: 'npc', npcId: 'jianglao', x: 645, y: 425, label: '对话·江老' },
            { id: 'npc_xuanmo', kind: 'npc', npcId: 'xuanmo', x: 235, y: 515, label: '对话·玄墨' },
            { id: 'npc_atang', kind: 'npc', npcId: 'atang', x: 315, y: -470, label: '对话·阿棠' },
            { id: 'fish_up', kind: 'fishing', riverSegment: 'upstream_brook', x: -155, y: 290, label: '寒溪垂钓' },
            { id: 'fish_mid', kind: 'fishing', riverSegment: 'midstream_lotus', x: 730, y: 345, label: '荷塘垂钓' },
            { id: 'fish_down', kind: 'fishing', riverSegment: 'downstream_estuary', x: -155, y: -355, label: '河口垂钓' },
            { id: 'seal', kind: 'seal', x: 365, y: 562, label: '查看封印' },
            { id: 'portal', kind: 'portal', x: 105, y: 562, label: '异界入口' },
            {
                id: 'dock',
                kind: 'dock',
                x: 115,
                y: -535,
                label: app.saveData.islands.dockRepaired ? '扬帆出海' : '修缮木船',
            },
        ];

        for (const plot of app.saveData.farm.plots) {
            const c = this._getPlotCoord(plot.plotId);
            const lbl = !plot.plantId ? '播种' : FarmSystem.inst.isMature(plot) ? '收获' : '浇水';
            candidates.push({ id: `plot_${plot.plotId}`, kind: 'plot', x: c.x, y: c.y, label: lbl, plotId: plot.plotId });
        }

        for (const obs of OBSTACLES) {
            if (this._isObstacleClearedOrLegacyOccupied(obs.id)) continue;
            candidates.push({
                id: obs.id,
                kind: 'obstacle',
                x: obs.x,
                y: obs.y,
                label: obs.tier === 1 ? '开荒解锁' : '需铁镐',
                obstacleTier: obs.tier,
                rewardItem: obs.rewardItem,
                rewardCount: obs.rewardCount,
            });
        }

        let best: InteractTarget | null = null;
        let bestDist = INTERACT_RADIUS;
        for (const c of candidates) {
            const d = Math.hypot(c.x - this._playerPos.x, c.y - this._playerPos.y);
            if (d < bestDist) {
                bestDist = d;
                best = c;
            }
        }

        this._nearestTarget = best;
    }
}
