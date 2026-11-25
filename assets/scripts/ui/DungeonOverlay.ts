/**
 * 《异界小农场 2.0》60 关元气骑士式动作地牢（第三期终局闭环：1-1~6-10 六大生态 60 关、12 场首领战、本地连穿纪录与 60 关通关成就）
 * - 入口提供「幽墟六十关 · 古碑传送阵」选层界面，支持从已解锁锚点（1-1 / 1-6 / 2-1 / 2-6）直接启程。
 * - 双拇指战斗 HUD + 桌面快捷键（WASD 移动 / J 或 Space 攻击 / K 或 Shift 翻滚 / Q 切武器 / E 丢随身灵植）。
 * - 3 大国风武器瞬切：青竹剑（近战斩弹）、连发符箓枪（高频自瞄）、八卦聚光镜（全屏穿透破盾激光）。
 * - 肉鸽三选一祝福房（X-3 / X-7）、机关宝箱房（X-4 / X-8）、X-5 中途首领与撤离抉择、X-10 双阶段关底首领。
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
import {
    BLESSING_POOL,
    BlessingDef,
    DUNGEON_BIOMES,
    DUNGEON_IMPLEMENTED_MAX_STAGE,
    DUNGEON_TOTAL_STAGES,
    ENEMY_STATS,
    EnemyKind,
    getStageConfig,
    StageConfig,
    WEAPON_TIER_MULT,
    WEAPON_TIER_NAMES,
    WEAPON_TIER_UPGRADE_COST,
} from '../gameplay/dungeon/DungeonConfig';

const { ccclass } = _decorator;

interface Enemy {
    id: number;
    kind: EnemyKind;
    name: string;
    isBoss: boolean;
    elite: boolean;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    radius: number;
    speed: number;
    fireCd: number;
    specialCd: number;
    hitFlash: number;
    phase2: boolean;
    shellTimer: number;
    shellActive: boolean;
    burrowTimer: number;
    dashTimer: number;
    dashVx: number;
    dashVy: number;
    trailCd: number;
    wavePhase: number;
    stealthTimer: number;
    leapTimer: number;
    leapVx: number;
    leapVy: number;
    isIllusion?: boolean;
    allyShieldTimer?: number;
    elementForm?: 'fire' | 'frost' | 'thunder';
    formTimer?: number;
    stunTimer?: number;
}

interface Bullet {
    fromPlayer: boolean;
    x: number;
    y: number;
    vx: number;
    vy: number;
    dmg: number;
    radius: number;
    life: number;
    color: Color;
    homing?: boolean;
    rootsPlayer?: boolean;
    bouncesLeft?: number;
    drainsMana?: boolean;
}

interface Turret {
    id: number;
    x: number;
    y: number;
    life: number;
    fireCd: number;
}

interface CoverPillar {
    x: number;
    y: number;
    rx: number;
    ry: number;
}

interface CrackedWall {
    x: number;
    y: number;
    broken: boolean;
}

interface SpikeTrap {
    x: number;
    y: number;
    r: number;
    cycle: number;
}

interface MagmaRing {
    x: number;
    y: number;
    r: number;
    warnTimer: number;
    eruptTimer: number;
}

interface PowderJar {
    x: number;
    y: number;
    r: number;
    exploded: boolean;
}

interface FirePool {
    x: number;
    y: number;
    r: number;
    life: number;
}

interface BossLaser {
    x: number;
    y: number;
    angle: number;
    warnTimer: number;
    activeTimer: number;
}

interface ChestProp {
    x: number;
    y: number;
    opened: boolean;
}

interface LaserFx {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    life: number;
}

interface SlashFx {
    x: number;
    y: number;
    angle: number;
    radius: number;
    life: number;
}

interface BoomFx {
    x: number;
    y: number;
    radius: number;
    life: number;
}

interface IceWall {
    id: number;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    rx: number;
    ry: number;
}

interface IcicleDrop {
    x: number;
    y: number;
    r: number;
    warnTimer: number;
    impactTimer: number;
}

interface FrostPool {
    x: number;
    y: number;
    r: number;
    life: number;
}

interface PoisonPool {
    x: number;
    y: number;
    r: number;
    life: number;
    permanent?: boolean;
}

interface AncientLantern {
    x: number;
    y: number;
    lit: boolean;
}

interface LightningFx {
    x: number;
    y: number;
    life: number;
}

interface CopperPillar {
    x: number;
    y: number;
    r: number;
}

interface ThunderZone {
    x: number;
    y: number;
    r: number;
    warnTimer: number;
    strikeTimer: number;
}

interface LightningRod {
    id: number;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    r: number;
}

interface RiftVortex {
    x: number;
    y: number;
    r: number;
    phase: number;
}

interface RiftCoreOrb {
    id: number;
    angle: number;
    dist: number;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    r: number;
}

const ARENA_HALF_W = 470;
const ARENA_HALF_H = 245;

@ccclass('DungeonOverlay')
export class DungeonOverlay extends Component {
    private static _inst: DungeonOverlay | null = null;

    private _panel!: Node;
    private _bgGfx!: Graphics;
    private _selectorView!: Node;
    private _selectorProgLbl!: Label;
    private _selectorCardsRoot!: Node;
    private _combatView!: Node;

    private _arenaBgNode!: Node;
    private _hasArenaBg = false;
    private _arenaGfx!: Graphics;
    private _propLayer!: Node;
    private _entityLayer!: Node;
    private _playerSpriteNode!: Node;
    private _doorNode!: Node;
    private _doorLbl!: Label;
    private _crackedWallNode: Node | null = null;
    private _doorGlowNode!: Node;
    private _chestNode: Node | null = null;
    private _chestOpenedRendered = false;
    private _spikeNodes: Node[] = [];
    private _jarNodes: Node[] = [];
    private _lanternNodes: Node[] = [];
    private _copperNodes: Node[] = [];
    private _riftNodes: Node[] = [];
    private _iceWallNodes: Node[] = [];
    private _pillarNodes: Node[] = [];
    private _enemySprites = new Map<number, Node>();
    private _turretSprites = new Map<number, Node>();
    private _nextTurretId = 1;

    private _topLbl!: Label;
    private _buffLbl!: Label;
    private _bossBarNode!: Node;
    private _bossNameLbl!: Label;
    private _bossBarGfx!: Graphics;
    private _weaponBtnLbl!: Label;
    private _plantBtnLbl!: Label;
    private _choiceBar!: Node;
    private _choiceTitleLbl!: Label;
    private _choiceContinueLbl!: Label;
    private _blessingModal!: Node;
    private _blessingCardsRoot!: Node;
    private _blacksmithModal!: Node;
    private _blacksmithTitleLbl!: Label;
    private _blacksmithCardsRoot!: Node;
    private _joyBase!: Node;
    private _joyKnob!: Node;

    private _animClock = 0;
    private _pMoving = false;
    private _pDir: 'front' | 'side' | 'back' = 'front';
    private _pFacingX = 1;
    private _pAnimTimer = 0;
    private _pAnimIdx = 0;
    private _pWalkFrames: Record<'front' | 'side' | 'back', (SpriteFrame | null)[]> = {
        front: [null, null, null, null],
        side: [null, null, null, null],
        back: [null, null, null, null],
    };
    private _pIdleFrames: Partial<Record<'front' | 'side' | 'back', SpriteFrame>> = {};
    private _mobAnimFrames: Record<string, (SpriteFrame | null)[]> = {};

    private _open = false;
    private _inCombat = false;
    private _stageNum = 1;
    private _stageCfg!: StageConfig;
    private _roomCleared = false;
    private _waitingChoice = false;
    private _waitingBlessing = false;
    private _waitingBlacksmith = false;
    private _keys = new Set<KeyCode>();
    private _joyActive = false;
    private _joyOrigin = new Vec2();
    private _joyDir = new Vec2();

    // 玩家战斗态
    private _px = -340;
    private _py = 0;
    private _hp = 100;
    private _maxHp = 100;
    private _mana = 100;
    private _maxMana = 100;
    private _weaponIdx = 0;
    private _weaponTiers: [number, number, number] = [0, 0, 0];
    private _pvx = 0;
    private _pvy = 0;
    private _rootTimer = 0;
    private _atkCd = 0;
    private _dodgeCd = 0;
    private _dodgeTimer = 0;
    private _dodgeDir = new Vec2(1, 0);
    private _invulnTimer = 0;
    private _facingAngle = 0;

    // 灵膳 Buff 与局内肉鸽祝福
    private _hasBrookSoup = false;
    private _hasEstuarySoup = false;
    private _trialPotatoes = 0;
    private _blessings = new Set<string>();

    // 局内战利品
    private _lootGold = 0;
    private _lootIron = 0;
    private _lootSeeds: string[] = [];

    // 实体与地形机关池
    private _nextEnemyId = 1;
    private _enemies: Enemy[] = [];
    private _bullets: Bullet[] = [];
    private _turrets: Turret[] = [];
    private _pillars: CoverPillar[] = [];
    private _crackedWall: CrackedWall | null = null;
    private _spikes: SpikeTrap[] = [];
    private _magmaRings: MagmaRing[] = [];
    private _magmaSpawnCd = 0;
    private _jars: PowderJar[] = [];
    private _firePools: FirePool[] = [];
    private _bossLasers: BossLaser[] = [];
    private _lavaRimActive = false;
    private _chest: ChestProp | null = null;
    private _lasers: LaserFx[] = [];
    private _slashes: SlashFx[] = [];
    private _booms: BoomFx[] = [];
    private _frostWindCd = 0;
    private _frostWindActiveTimer = 0;
    private _iceWalls: IceWall[] = [];
    private _nextIceWallId = 1;
    private _icicles: IcicleDrop[] = [];
    private _frostPools: FrostPool[] = [];
    private _poisonPools: PoisonPool[] = [];
    private _lanterns: AncientLantern[] = [];
    private _lightnings: LightningFx[] = [];
    private _copperPillars: CopperPillar[] = [];
    private _copperArcCycle = 0;
    private _copperBoostTimer = 0;
    private _thunderZones: ThunderZone[] = [];
    private _lightningRods: LightningRod[] = [];
    private _nextRodId = 1;
    private _riftVortices: RiftVortex[] = [];
    private _sealAngle = 0;
    private _riftOrbs: RiftCoreOrb[] = [];
    private _nextOrbId = 1;
    private _runClearedCount = 0;

    private _onToast: ((msg: string) => void) | null = null;

    public static get inst(): DungeonOverlay | null {
        return this._inst;
    }

    public get isOpen(): boolean {
        return this._open;
    }

    protected onLoad(): void {
        DungeonOverlay._inst = this;
        this._buildUI();
        this._preloadAnims();
        this._panel.active = false;
        input.on(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this._onKeyUp, this);
    }

    private _preloadAnims(): void {
        (['front', 'side', 'back'] as const).forEach((dir) => {
            void ArtLoader.loadSpriteFrame(`char_player_${dir}`).then((sf) => {
                if (sf) this._pIdleFrames[dir] = sf;
            });
            for (let i = 0; i < 4; i++) {
                void ArtLoader.loadSpriteFrame(`char_walk_${dir}_${i}`).then((sf) => {
                    if (sf) this._pWalkFrames[dir][i] = sf;
                });
            }
        });
        const prefixes = ['mob_bamboo', 'mob_ink_fly', 'mob_golem', 'mob_boss', 'mob_burrow_mole', 'mob_leap_fox'];
        for (const pre of prefixes) {
            this._mobAnimFrames[pre] = [null, null, null, null];
            for (let i = 0; i < 4; i++) {
                void ArtLoader.loadSpriteFrame(`${pre}_${i}`).then((sf) => {
                    if (sf) this._mobAnimFrames[pre][i] = sf;
                });
            }
        }
    }

    protected onDestroy(): void {
        if (DungeonOverlay._inst === this) DungeonOverlay._inst = null;
        input.off(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this._onKeyUp, this);
    }

    private _uiNode(name: string, parent: Node): Node {
        const n = new Node(name);
        n.layer = Layers.Enum.UI_2D;
        n.parent = parent;
        return n;
    }

    private _drawBtn(
        parent: Node,
        name: string,
        x: number,
        y: number,
        w: number,
        h: number,
        text: string,
        bg: Color,
        onTap: () => void,
        fontSize = 15
    ): Label {
        const btn = this._uiNode(name, parent);
        btn.addComponent(UITransform).setContentSize(w, h);
        btn.setPosition(x, y, 0);
        const artKey = name === 'BtnAtk' ? 'ui_dng_btn_atk' : name === 'BtnDodge' ? 'ui_dng_btn_dodge' : 'ui_dng_btn_rect';
        ArtLoader.applySprite(btn, artKey, w, h, () => {
            const sp = btn.getChildByName('ArtSprite')?.getComponent(Sprite);
            if (sp && artKey === 'ui_dng_btn_rect') {
                const isRed = bg.r > bg.g + 30;
                const isAmber = bg.r > 150 && bg.g > 100 && bg.b < 90;
                sp.color = isRed
                    ? new Color(235, 168, 152, 255)
                    : isAmber
                        ? new Color(246, 214, 146, 255)
                        : new Color(228, 246, 236, 255);
            }
        });
        const l = this._uiNode('Lbl', btn).addComponent(Label);
        l.string = text;
        l.fontSize = fontSize;
        l.lineHeight = fontSize + 5;
        l.color = new Color(252, 248, 238, 255);
        btn.on(Node.EventType.TOUCH_END, onTap, this);
        return l;
    }

    private _buildUI(): void {
        this._panel = this._uiNode('DungeonPanel', this.node);
        this._panel.addComponent(UITransform).setContentSize(1280, 720);
        this._bgGfx = this._panel.addComponent(Graphics);
        this._paintBackdrop([18, 32, 30]);

        // ===== 1. 六十关选层传送阵视图 =====
        this._selectorView = this._uiNode('SelectorView', this._panel);
        this._selectorView.addComponent(UITransform).setContentSize(1280, 720);

        const titleLbl = this._uiNode('SelTitle', this._selectorView).addComponent(Label);
        titleLbl.node.setPosition(0, 305, 0);
        titleLbl.string = '幽墟六十关 · 古碑传送阵';
        titleLbl.fontSize = 30;
        titleLbl.color = new Color(246, 236, 206, 255);

        this._selectorProgLbl = this._uiNode('SelProg', this._selectorView).addComponent(Label);
        this._selectorProgLbl.node.setPosition(0, 265, 0);
        this._selectorProgLbl.fontSize = 15;
        this._selectorProgLbl.color = new Color(156, 226, 206, 255);

        this._selectorCardsRoot = this._uiNode('SelCards', this._selectorView);
        this._drawBtn(
            this._selectorView,
            'BtnCloseSel',
            0,
            -302,
            210,
            46,
            '返回主岛',
            new Color(108, 76, 62, 255),
            () => {
                this._open = false;
                this._panel.active = false;
                AudioManager.inst.playBgm('overworld');
            },
            17
        );

        // ===== 2. 战斗视图 =====
        this._combatView = this._uiNode('CombatView', this._panel);
        this._combatView.addComponent(UITransform).setContentSize(1280, 720);

        // 竞技场专属手绘底图节点（位于 ArenaCanvas 之下，6 大生态各配独立手绘地牢底图）
        this._arenaBgNode = this._uiNode('ArenaBg', this._combatView);
        this._arenaBgNode.addComponent(UITransform).setContentSize(ARENA_HALF_W * 2, ARENA_HALF_H * 2);
        this._arenaBgNode.setPosition(-46, -18, 0);

        const arena = this._uiNode('ArenaCanvas', this._combatView);
        arena.addComponent(UITransform).setContentSize(ARENA_HALF_W * 2, ARENA_HALF_H * 2);
        arena.setPosition(-46, -18, 0);
        this._arenaGfx = arena.addComponent(Graphics);

        this._propLayer = this._uiNode('PropLayer', arena);
        this._entityLayer = this._uiNode('EntityLayer', arena);

        // 东侧石门手绘青玉八卦光环（位于石门背后）
        this._doorGlowNode = this._uiNode('EastDoorGlow', arena);
        this._doorGlowNode.setPosition(ARENA_HALF_W - 22, 0, 0);
        ArtLoader.applySprite(this._doorGlowNode, 'dng_portal_glow', 118, 118);
        this._doorGlowNode.active = false;

        // 东侧石门
        this._doorNode = this._uiNode('EastDoor', arena);
        this._doorNode.setPosition(ARENA_HALF_W - 22, 0, 0);
        ArtLoader.applySprite(this._doorNode, 'dng_door', 62, 112);
        this._doorLbl = this._uiNode('DoorLbl', this._doorNode).addComponent(Label);
        this._doorLbl.node.setPosition(0, -68, 0);
        this._doorLbl.fontSize = 12;
        this._doorLbl.color = new Color(152, 238, 220, 255);

        // 主角手绘精灵
        this._playerSpriteNode = this._uiNode('DungeonPlayer', this._entityLayer);
        ArtLoader.applySprite(this._playerSpriteNode, 'char_player_front', 50, 62);

        // 顶部状态栏
        this._topLbl = this._uiNode('TopHud', this._combatView).addComponent(Label);
        this._topLbl.node.setPosition(-60, 326, 0);
        this._topLbl.fontSize = 19;
        this._topLbl.color = new Color(248, 240, 220, 255);

        this._buffLbl = this._uiNode('BuffHud', this._combatView).addComponent(Label);
        this._buffLbl.node.setPosition(-60, 294, 0);
        this._buffLbl.fontSize = 13;
        this._buffLbl.color = new Color(164, 232, 212, 255);

        // 首领专属大血条（位于竞技场顶部）
        this._bossBarNode = this._uiNode('BossBar', this._combatView);
        this._bossBarNode.setPosition(-46, 252, 0);
        this._bossBarGfx = this._bossBarNode.addComponent(Graphics);
        this._bossNameLbl = this._uiNode('BossName', this._bossBarNode).addComponent(Label);
        this._bossNameLbl.node.setPosition(0, 14, 0);
        this._bossNameLbl.fontSize = 14;
        this._bossNameLbl.color = new Color(255, 224, 152, 255);
        this._bossBarNode.active = false;

        this._drawBtn(
            this._combatView,
            'BtnRetreat',
            548,
            318,
            134,
            38,
            '撤回主岛',
            new Color(142, 72, 58, 255),
            () => this._finishRun(false, '主动撤出古墟，带回当前战利品'),
            15
        );

        // 左半屏虚拟摇杆
        const joyZone = this._uiNode('JoyZone', this._combatView);
        joyZone.addComponent(UITransform).setContentSize(520, 480);
        joyZone.setPosition(-380, -100, 0);
        joyZone.on(Node.EventType.TOUCH_START, (e: EventTouch) => {
            this._joyActive = true;
            this._joyOrigin.set(e.getUILocation());
            this._joyDir.set(0, 0);
            this._joyBase.active = true;
            this._joyBase.setPosition(this._joyOrigin.x - 640, this._joyOrigin.y - 360, 0);
            this._joyKnob.setPosition(0, 0, 0);
        }, this);
        joyZone.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => {
            if (!this._joyActive) return;
            const cur = e.getUILocation();
            const dx = cur.x - this._joyOrigin.x;
            const dy = cur.y - this._joyOrigin.y;
            const len = Math.hypot(dx, dy);
            const maxR = 52;
            if (len > 4) {
                const c = Math.min(len, maxR);
                this._joyDir.set(dx / len, dy / len);
                this._joyKnob.setPosition((dx / len) * c, (dy / len) * c, 0);
            }
        }, this);
        const endJoy = () => {
            this._joyActive = false;
            this._joyDir.set(0, 0);
            this._joyBase.active = false;
        };
        joyZone.on(Node.EventType.TOUCH_END, endJoy, this);
        joyZone.on(Node.EventType.TOUCH_CANCEL, endJoy, this);

        this._joyBase = this._uiNode('JoyBase', this._combatView);
        const jbG = this._joyBase.addComponent(Graphics);
        jbG.fillColor = new Color(255, 255, 255, 45);
        jbG.strokeColor = new Color(255, 255, 255, 110);
        jbG.lineWidth = 2;
        jbG.circle(0, 0, 52);
        jbG.fill();
        jbG.stroke();
        this._joyKnob = this._uiNode('JoyKnob', this._joyBase);
        const jkG = this._joyKnob.addComponent(Graphics);
        jkG.fillColor = new Color(110, 224, 192, 180);
        jkG.circle(0, 0, 22);
        jkG.fill();
        this._joyBase.active = false;

        // 右侧独立战斗按键区（与竞技场、东侧石门完全分离不重叠）
        this._weaponBtnLbl = this._drawBtn(this._combatView, 'BtnSwitch', 548, -42, 114, 54, '青竹剑\n(Q切)', new Color(68, 134, 108, 240), () => this._switchWeapon(), 14);
        this._plantBtnLbl = this._drawBtn(this._combatView, 'BtnPlant', 548, -112, 114, 56, '灵植\n(E丢)', new Color(184, 128, 48, 240), () => this._usePortablePlant(), 13);
        this._drawBtn(this._combatView, 'BtnAtk', 552, -226, 112, 112, '攻击\n(J)', new Color(196, 82, 54, 240), () => this._doAttack(), 17);
        this._drawBtn(this._combatView, 'BtnDodge', 454, -262, 78, 78, '翻滚\n(K)', new Color(66, 138, 168, 240), () => this._doDodge(), 14);

        // X-5 / X-10 首领战后抉择条
        this._choiceBar = this._uiNode('ChoiceBar', this._combatView);
        this._choiceBar.setPosition(0, 12, 0);
        const cbG = this._choiceBar.addComponent(Graphics);
        cbG.fillColor = new Color(24, 38, 36, 244);
        cbG.strokeColor = new Color(218, 182, 104, 240);
        cbG.lineWidth = 3;
        cbG.roundRect(-295, -96, 590, 192, 16);
        cbG.fill();
        cbG.stroke();
        this._choiceTitleLbl = this._uiNode('ChoiceTitle', this._choiceBar).addComponent(Label);
        this._choiceTitleLbl.node.setPosition(0, 44, 0);
        this._choiceTitleLbl.fontSize = 18;
        this._choiceTitleLbl.lineHeight = 26;
        this._choiceTitleLbl.color = new Color(252, 242, 214, 255);
        this._drawBtn(this._choiceBar, 'BtnCashOut', -138, -36, 224, 52, '带着全额战利品撤回', new Color(66, 138, 108, 255), () => {
            this._waitingChoice = false;
            this._choiceBar.active = false;
            this._finishRun(true, `于 ${this._stageCfg.label} 见好就收安全撤离`);
        }, 15);
        this._choiceContinueLbl = this._drawBtn(this._choiceBar, 'BtnContinue', 138, -36, 224, 52, '继续深入下一关', new Color(188, 92, 48, 255), () => {
            this._waitingChoice = false;
            this._choiceBar.active = false;
            this._startStage(this._stageNum + 1);
        }, 15);
        this._choiceBar.active = false;

        // 古碑三选一祝福弹窗
        this._blessingModal = this._uiNode('BlessingModal', this._combatView);
        this._blessingModal.setPosition(0, 0, 0);
        const bmG = this._blessingModal.addComponent(Graphics);
        bmG.fillColor = new Color(16, 26, 26, 244);
        bmG.strokeColor = new Color(112, 226, 192, 235);
        bmG.lineWidth = 3;
        bmG.roundRect(-450, -175, 900, 350, 18);
        bmG.fill();
        bmG.stroke();
        const bmTitle = this._uiNode('BlessTitle', this._blessingModal).addComponent(Label);
        bmTitle.node.setPosition(0, 128, 0);
        bmTitle.string = '古碑灵纹显现 · 请择一祝福（本局永久生效）';
        bmTitle.fontSize = 22;
        bmTitle.color = new Color(148, 244, 214, 255);
        this._blessingCardsRoot = this._uiNode('BlessCards', this._blessingModal);
        this._blessingModal.active = false;

        // 神秘铁匠房弹窗（武器升阶：凡铁 → 青灵 → 玄玉 → 天罡）
        this._blacksmithModal = this._uiNode('BlacksmithModal', this._combatView);
        this._blacksmithModal.setPosition(0, 0, 0);
        const bsG = this._blacksmithModal.addComponent(Graphics);
        bsG.fillColor = new Color(22, 20, 28, 246);
        bsG.strokeColor = new Color(238, 186, 98, 235);
        bsG.lineWidth = 3;
        bsG.roundRect(-450, -195, 900, 390, 18);
        bsG.fill();
        bsG.stroke();
        this._blacksmithTitleLbl = this._uiNode('BsTitle', this._blacksmithModal).addComponent(Label);
        this._blacksmithTitleLbl.node.setPosition(0, 148, 0);
        this._blacksmithTitleLbl.fontSize = 21;
        this._blacksmithTitleLbl.color = new Color(252, 224, 152, 255);
        this._blacksmithCardsRoot = this._uiNode('BsCards', this._blacksmithModal);
        this._drawBtn(this._blacksmithModal, 'BtnLeaveBs', 0, -152, 248, 46, '离开铁匠铺（进入下一关）', new Color(66, 138, 108, 255), () => {
            this._waitingBlacksmith = false;
            this._blacksmithModal.active = false;
            if (this._stageNum < DUNGEON_IMPLEMENTED_MAX_STAGE) {
                this._startStage(this._stageNum + 1);
                this._onToast?.(`辞别铁匠，已直入 ${this._stageCfg.label} 战斗房！`);
            } else {
                this._roomCleared = true;
                this._doorLbl.string = '石门已开 →';
            }
        }, 15);
        this._blacksmithModal.active = false;
    }

    private _paintBackdrop(rgb: [number, number, number]): void {
        this._bgGfx.clear();
        this._bgGfx.fillColor = new Color(rgb[0], rgb[1], rgb[2], 252);
        this._bgGfx.rect(-640, -360, 1280, 720);
        this._bgGfx.fill();
    }

    /** 读取并兼容旧存档的已解锁锚点 */
    private _getUnlockedAnchors(): Set<number> {
        const app = GameApp.inst;
        const set = new Set<number>([1]);
        if (!app?.ready) return set;
        const dng = app.saveData.dungeon;
        for (const a of dng.unlockedAnchors ?? []) set.add(a);
        const highest = dng.highestClearedStage ?? (dng.deepestLayer >= 1 ? 10 : 0);
        if (highest >= 5) set.add(6);
        if (highest >= 10) set.add(11);
        if (highest >= 15) set.add(16);
        if (highest >= 20) set.add(21);
        if (highest >= 25) set.add(26);
        if (highest >= 30) set.add(31);
        if (highest >= 35) set.add(36);
        if (highest >= 40) set.add(41);
        if (highest >= 45) set.add(46);
        if (highest >= 50) set.add(51);
        if (highest >= 55) set.add(56);
        return set;
    }

    private _unlockAnchor(stage: number): void {
        const app = GameApp.inst;
        if (!app?.ready) return;
        const set = this._getUnlockedAnchors();
        set.add(stage);
        app.saveData.dungeon.unlockedAnchors = Array.from(set).sort((a, b) => a - b);
    }

    public open(onToast?: (msg: string) => void): void {
        const app = GameApp.inst;
        if (!app?.ready) return;
        this._onToast = onToast ?? null;
        this._open = true;
        this._inCombat = false;
        this._panel.active = true;
        this._panel.setSiblingIndex(this.node.children.length - 1);
        this._selectorView.active = true;
        this._combatView.active = false;
        this._keys.clear();
        this._paintBackdrop([18, 30, 28]);
        this._renderSelectorCards();
        AudioManager.inst.playBgm('dungeon');
    }

    private _renderSelectorCards(): void {
        this._selectorCardsRoot.removeAllChildren();
        const app = GameApp.inst;
        const dng = app?.saveData.dungeon;
        const highest = dng?.highestClearedStage ?? ((dng?.deepestLayer ?? 0) >= 1 ? 10 : 0);
        const anchors = this._getUnlockedAnchors();
        const bestStreak = dng?.bestStreak ?? 0;
        const badge = (dng?.grandCleared || highest >= DUNGEON_TOTAL_STAGES) ? ' · 【全境六十关制霸】' : '';
        this._selectorProgLbl.string = `当前推进：已通 ${highest} / ${DUNGEON_TOTAL_STAGES} 关 · 最佳单局连穿 ${bestStreak} 关${badge}`;

        const cardW = 368;
        const cardH = 228;
        const gapX = 24;
        const gapY = 22;
        const startX = -(cardW + gapX);
        const startY = 122;

        DUNGEON_BIOMES.forEach((b, idx) => {
            const col = idx % 3;
            const row = Math.floor(idx / 3);
            const cx = startX + col * (cardW + gapX);
            const cy = startY - row * (cardH + gapY);

            const card = this._uiNode(`BiomeCard_${b.chapter}`, this._selectorCardsRoot);
            card.setPosition(cx, cy, 0);
            ArtLoader.applySprite(card, 'ui_dng_card_bg', cardW, cardH, () => {
                const sp = card.getChildByName('ArtSprite')?.getComponent(Sprite);
                if (sp) {
                    sp.color = b.implemented
                        ? new Color(
                            Math.min(255, b.borderRgb[0] + 95),
                            Math.min(255, b.borderRgb[1] + 95),
                            Math.min(255, b.borderRgb[2] + 95),
                            255
                        )
                        : new Color(130, 135, 138, 175);
                }
            });

            const nameLbl = this._uiNode('Name', card).addComponent(Label);
            nameLbl.node.setPosition(0, 82, 0);
            nameLbl.string = `第 ${b.chapter} 大关 · ${b.name}`;
            nameLbl.fontSize = 20;
            nameLbl.color = new Color(252, 245, 224, 255);

            const subLbl = this._uiNode('Sub', card).addComponent(Label);
            subLbl.node.setPosition(0, 50, 0);
            subLbl.node.addComponent(UITransform).setContentSize(282, 22);
            subLbl.overflow = Label.Overflow.SHRINK;
            subLbl.string = b.subtitle;
            subLbl.fontSize = 12;
            subLbl.color = new Color(204, 232, 220, 240);

            const infoLbl = this._uiNode('Info', card).addComponent(Label);
            infoLbl.node.setPosition(0, 6, 0);
            infoLbl.node.addComponent(UITransform).setContentSize(282, 54);
            infoLbl.overflow = Label.Overflow.CLAMP;
            infoLbl.enableWrapText = true;
            infoLbl.string = `机关：${b.hazardDesc}\n首领：${b.midBossName} / ${b.finalBossName}`;
            infoLbl.fontSize = 12;
            infoLbl.lineHeight = 18;
            infoLbl.color = new Color(235, 224, 202, 235);

            if (b.implemented) {
                const startAnchor = (b.chapter - 1) * 10 + 1;
                const midAnchor = (b.chapter - 1) * 10 + 6;
                const canStart = anchors.has(startAnchor);
                const canMid = anchors.has(midAnchor);

                this._drawBtn(
                    card,
                    `Start_${startAnchor}`,
                    -72,
                    -62,
                    134,
                    40,
                    canStart ? `从 ${b.chapter}-1 启程` : `需通 ${b.chapter - 1}-10 解锁`,
                    canStart ? new Color(62, 148, 118, 255) : new Color(76, 76, 76, 200),
                    () => {
                        if (canStart) this._beginRunFromStage(startAnchor);
                        else this._onToast?.(`先击败第 ${b.chapter - 1} 大关首领解锁 ${b.chapter}-1 传送锚点！`);
                    },
                    13
                );

                this._drawBtn(
                    card,
                    `Mid_${midAnchor}`,
                    72,
                    -62,
                    134,
                    40,
                    canMid ? `从 ${b.chapter}-6 深入` : `需通 ${b.chapter}-5 解锁`,
                    canMid ? new Color(188, 108, 52, 255) : new Color(76, 76, 76, 200),
                    () => {
                        if (canMid) this._beginRunFromStage(midAnchor);
                        else this._onToast?.(`击败 ${b.chapter}-5「${b.midBossName}」即可解锁半程传送锚点！`);
                    },
                    13
                );
            } else {
                const lockLbl = this._uiNode('LockLbl', card).addComponent(Label);
                lockLbl.node.setPosition(0, -64, 0);
                lockLbl.string = b.chapter <= 4 ? '第二期生态 · 敬请期待' : '第三期终局生态 · 敬请期待';
                lockLbl.fontSize = 14;
                lockLbl.color = new Color(186, 186, 178, 210);
            }
        });
    }

    private _beginRunFromStage(startStage: number): void {
        const app = GameApp.inst;
        if (!app?.ready) return;

        this._selectorView.active = false;
        this._combatView.active = true;
        this._inCombat = true;

        // 消耗灵膳（每局下本自动启用）
        this._hasBrookSoup = false;
        this._hasEstuarySoup = false;
        if ((app.saveData.inventory['dish_brook_soup'] ?? 0) > 0) {
            app.addItem('dish_brook_soup', -1);
            this._hasBrookSoup = true;
        }
        if ((app.saveData.inventory['dish_estuary_soup'] ?? 0) > 0) {
            app.addItem('dish_estuary_soup', -1);
            this._hasEstuarySoup = true;
        }

        const ownedPotato = app.saveData.inventory['thunder_potato'] ?? 0;
        const ownedShoot = app.saveData.inventory['cloud_bamboo_shoot'] ?? 0;
        this._trialPotatoes = ownedPotato === 0 && ownedShoot === 0 ? 2 : 0;

        this._maxHp = 100;
        this._hp = this._maxHp;
        this._maxMana = 100;
        this._mana = this._maxMana;
        this._weaponIdx = 0;
        this._weaponTiers = [0, 0, 0];
        this._pvx = 0;
        this._pvy = 0;
        this._rootTimer = 0;
        this._lootGold = 0;
        this._lootIron = 0;
        this._lootSeeds = [];
        this._runClearedCount = 0;
        this._blessings.clear();
        this._waitingChoice = false;
        this._waitingBlessing = false;
        this._waitingBlacksmith = false;
        this._choiceBar.active = false;
        this._blessingModal.active = false;
        this._blacksmithModal.active = false;

        this._refreshButtonLabels();
        this._startStage(startStage);
    }

    private _startStage(stageNum: number): void {
        this._stageNum = stageNum;
        this._stageCfg = getStageConfig(stageNum);
        const cfg = this._stageCfg;
        const biomeBgMap: Record<string, { key: string; tint: Color }> = {
            bamboo_ruins: { key: 'bg_dungeon_bamboo', tint: new Color(242, 248, 244, 255) },
            magma_cavern: { key: 'bg_dungeon_magma', tint: new Color(248, 238, 232, 255) },
            frost_palace: { key: 'bg_dungeon_frost', tint: new Color(242, 248, 255, 255) },
            mist_marsh: { key: 'bg_dungeon_mist', tint: new Color(240, 244, 240, 255) },
            thunder_pagoda: { key: 'bg_dungeon_thunder', tint: new Color(250, 242, 228, 255) },
            rift_altar: { key: 'bg_dungeon_rift', tint: new Color(236, 246, 255, 255) },
        };
        const bgInfo = biomeBgMap[cfg.biome.id];
        if (bgInfo && this._arenaBgNode) {
            this._hasArenaBg = true;
            this._arenaBgNode.active = true;
            ArtLoader.applySprite(this._arenaBgNode, bgInfo.key, ARENA_HALF_W * 2, ARENA_HALF_H * 2, () => {
                const sp = this._arenaBgNode?.getChildByName('ArtSprite')?.getComponent(Sprite);
                if (sp) sp.color = bgInfo.tint;
            });
        } else {
            this._hasArenaBg = false;
            if (this._arenaBgNode) this._arenaBgNode.active = false;
        }

        this._roomCleared = false;
        this._waitingChoice = false;
        this._waitingBlessing = false;
        this._waitingBlacksmith = false;
        this._choiceBar.active = false;
        this._blessingModal.active = false;
        this._blacksmithModal.active = false;
        this._px = -345;
        this._py = 0;
        this._pvx = 0;
        this._pvy = 0;
        this._rootTimer = 0;

        this._enemies = [];
        this._bullets = [];
        this._turrets = [];
        this._lasers = [];
        this._slashes = [];
        this._booms = [];
        this._pillars = [];
        this._pillarNodes = [];
        this._crackedWall = null;
        this._spikes = [];
        this._magmaRings = [];
        this._magmaSpawnCd = cfg.magmaInterval > 0 ? 1.8 : 0;
        this._jars = [];
        this._firePools = [];
        this._bossLasers = [];
        this._lavaRimActive = false;
        this._chest = null;
        this._frostWindCd = cfg.frostWindInterval > 0 ? 3.2 : 0;
        this._frostWindActiveTimer = 0;
        this._iceWalls = [];
        this._icicles = [];
        this._frostPools = [];
        this._poisonPools = [];
        this._lanterns = [];
        this._lightnings = [];
        this._copperPillars = [];
        this._copperArcCycle = 0;
        this._copperBoostTimer = 0;
        this._thunderZones = [];
        this._lightningRods = [];
        this._riftVortices = [];
        this._sealAngle = 0;
        this._riftOrbs = [];

        this._propLayer.removeAllChildren();
        this._crackedWallNode = null;
        this._chestNode = null;
        this._chestOpenedRendered = false;
        this._spikeNodes = [];
        this._jarNodes = [];
        this._lanternNodes = [];
        this._copperNodes = [];
        this._riftNodes = [];
        this._iceWallNodes = [];
        if (this._doorGlowNode) this._doorGlowNode.active = false;
        for (const n of this._enemySprites.values()) n.destroy();
        this._enemySprites.clear();
        for (const n of this._turretSprites.values()) n.destroy();
        this._turretSprites.clear();

        this._paintBackdrop(cfg.biome.bgTintRgb);

        // 生成石柱掩体
        for (const [px, py] of cfg.pillars) {
            this._pillars.push({ x: px, y: py, rx: 28, ry: 28 });
            const pn = this._uiNode('Pillar', this._propLayer);
            pn.setPosition(px, py + 12, 0);
            ArtLoader.applySprite(pn, 'dng_pillar', 34, 86);
            this._pillarNodes.push(pn);
        }

        // 北墙可炸裂石墙
        if (cfg.hasCrackedWall) {
            this._crackedWall = { x: 20, y: ARENA_HALF_H - 18, broken: false };
            const wn = this._uiNode('CrackedWall', this._propLayer);
            wn.setPosition(this._crackedWall.x, this._crackedWall.y, 0);
            ArtLoader.applySprite(wn, 'dng_cracked_wall', 78, 86);
            const wl = this._uiNode('WLbl', wn).addComponent(Label);
            wl.node.setPosition(0, -46, 0);
            wl.string = '裂纹石墙(E丢雷火薯炸开)';
            wl.fontSize = 11;
            wl.color = new Color(252, 208, 128, 240);
            this._crackedWallNode = wn;
        }

        // 第 1 大关：枯竹刺陷阱
        if (cfg.spikeCount > 0) {
            const slots: [number, number][] = [[0, 75], [0, -75], [210, 0]];
            for (let i = 0; i < cfg.spikeCount && i < slots.length; i++) {
                this._spikes.push({ x: slots[i][0], y: slots[i][1], r: 34, cycle: i * 1.4 });
            }
        }

        // 第 2 大关：爆裂火药陶罐
        if (cfg.jarCount > 0) {
            const jSlots: [number, number][] = [[120, 70], [120, -70]];
            for (let i = 0; i < cfg.jarCount && i < jSlots.length; i++) {
                this._jars.push({ x: jSlots[i][0], y: jSlots[i][1], r: 22, exploded: false });
            }
        }

        // 第 4 大关：驱雾古灯（2 盏）+ 毒沼泥潭
        if (cfg.hasMistFog) {
            this._lanterns.push({ x: -120, y: 125, lit: false }, { x: 150, y: -125, lit: false });
        }
        if (cfg.poisonPoolCount > 0) {
            const pSlots: [number, number][] = [[30, 85], [30, -85], [220, 0]];
            for (let i = 0; i < cfg.poisonPoolCount && i < pSlots.length; i++) {
                this._poisonPools.push({ x: pSlots[i][0], y: pSlots[i][1], r: 44, life: 999, permanent: true });
            }
        }
        // 第 5 大关：导电铜雷柱
        if (cfg.copperPillarCount > 0) {
            const cSlots: [number, number][] = [[-70, 125], [150, -125], [150, 125]];
            for (let i = 0; i < cfg.copperPillarCount && i < cSlots.length; i++) {
                this._copperPillars.push({ x: cSlots[i][0], y: cSlots[i][1], r: 22 });
            }
        }
        // 第 6 大关：时空裂隙旋涡
        if (cfg.riftVortexCount > 0) {
            const rSlots: [number, number][] = [[40, 0], [-110, 110]];
            for (let i = 0; i < cfg.riftVortexCount && i < rSlots.length; i++) {
                this._riftVortices.push({ x: rSlots[i][0], y: rSlots[i][1], r: 58, phase: i * 2.1 });
            }
        }

        // 按房间类型初始化
        if (cfg.roomKind === 'blessing') {
            this._doorLbl.string = '择祝福开门';
            this._openBlessingModal();
        } else if (cfg.roomKind === 'blacksmith') {
            this._doorLbl.string = '锻造开门';
            this._openBlacksmithModal();
        } else if (cfg.roomKind === 'chest') {
            this._chest = { x: 20, y: 0, opened: false };
            if (cfg.chapter === 1) {
                this._spikes.push({ x: -70, y: 0, r: 32, cycle: 0 }, { x: 110, y: 0, r: 32, cycle: 1.8 });
            } else if (cfg.chapter === 2) {
                this._magmaSpawnCd = 1.6;
            } else if (cfg.chapter === 3) {
                this._frostPools.push({ x: -65, y: 0, r: 52, life: 999 }, { x: 105, y: 0, r: 52, life: 999 });
            } else if (cfg.chapter === 4) {
                this._poisonPools.push({ x: -65, y: 40, r: 40, life: 999, permanent: true }, { x: 105, y: -40, r: 40, life: 999, permanent: true });
            } else if (cfg.chapter === 5) {
                this._copperPillars.push({ x: -85, y: 95, r: 22 }, { x: 125, y: -95, r: 22 });
            } else {
                this._riftVortices.push({ x: -95, y: 0, r: 52, phase: 0 }, { x: 135, y: 0, r: 52, phase: 1.5 });
            }
            this._doorLbl.string = '开启宝箱';
            this._onToast?.(`${cfg.label} 机关宝箱房：躲开陷阱走近中央古玉宝箱！`);
        } else {
            this._doorLbl.string = '清怪开门';
            for (const sp of cfg.spawns) {
                this._spawnEnemy(sp.kind, sp.x, sp.y, Boolean(sp.elite));
            }
            if (cfg.roomKind === 'elite_bounty') {
                this._onToast?.(`${cfg.label} 精英赏金房：全员强力精英！肃清必得 +60 金、+2 玄铁与稀有灵种！`);
            } else if (cfg.roomKind === 'mid_boss' || cfg.roomKind === 'final_boss') {
                const bossName = cfg.roomKind === 'mid_boss' ? cfg.biome.midBossName : cfg.biome.finalBossName;
                this._onToast?.(`警告！${cfg.label} 首领「${bossName}」现身！`);
            } else if (cfg.hasMistFog) {
                this._onToast?.(`${cfg.label} 墨瘴泽渊：靠近点亮场地内 2 盏古灯即可驱散暗紫瘴雾！`);
            } else if (cfg.hasIceFloor) {
                this._onToast?.(`${cfg.label} 寒玉冰宫：冰面带滑行惯性，注意躲避周期霜风${this._hasBrookSoup ? '（寒溪鲜鱼汤已免疫减速）' : ''}！`);
            } else if (cfg.hasReflectWalls) {
                this._onToast?.(`${cfg.label} 雷纹古塔：八卦墙面可反弹子弹，注意铜雷柱间的周期放电线！`);
            } else if (cfg.riftVortexCount > 0) {
                this._onToast?.(`${cfg.label} 裂隙天坛：避开时空裂隙旋涡引力${cfg.hasSealRing ? '与旋转灵气封阵' : ''}！`);
            }
        }

        // 为当前房间的全部互动机关创建手绘素材精灵（彻底告别几何圆/方块绘制）
        for (const sp of this._spikes) {
            const sn = this._uiNode('SpikeTrap', this._propLayer);
            sn.setPosition(sp.x, sp.y, 0);
            ArtLoader.applySprite(sn, 'dng_spike_trap', Math.round(sp.r * 2.15), Math.round(sp.r * 1.95));
            this._spikeNodes.push(sn);
        }
        for (const j of this._jars) {
            const jn = this._uiNode('PowderJar', this._propLayer);
            jn.setPosition(j.x, j.y + 4, 0);
            ArtLoader.applySprite(jn, 'dng_powder_jar', 44, 58);
            this._jarNodes.push(jn);
        }
        for (const lt of this._lanterns) {
            const ln = this._uiNode('AncientLantern', this._propLayer);
            ln.setPosition(lt.x, lt.y + 8, 0);
            ArtLoader.applySprite(ln, 'dng_ancient_lantern', 46, 62);
            this._lanternNodes.push(ln);
        }
        for (const cp of this._copperPillars) {
            const cn = this._uiNode('CopperPillar', this._propLayer);
            cn.setPosition(cp.x, cp.y + 12, 0);
            ArtLoader.applySprite(cn, 'dng_copper_pillar', 48, 82);
            this._copperNodes.push(cn);
        }
        for (const rv of this._riftVortices) {
            const rn = this._uiNode('RiftVortex', this._propLayer);
            rn.setPosition(rv.x, rv.y, 0);
            ArtLoader.applySprite(rn, 'dng_rift_vortex', Math.round(rv.r * 2.05), Math.round(rv.r * 2.05));
            this._riftNodes.push(rn);
        }
        if (this._chest) {
            const chn = this._uiNode('JadeChest', this._propLayer);
            chn.setPosition(this._chest.x, this._chest.y + 6, 0);
            ArtLoader.applySprite(chn, 'dng_chest_closed', 68, 60);
            this._chestNode = chn;
            this._chestOpenedRendered = false;
        }

        this._refreshTopHud();
    }

    private _openBlessingModal(): void {
        this._waitingBlessing = true;
        this._blessingModal.active = true;
        this._blessingCardsRoot.removeAllChildren();

        const candidates = BLESSING_POOL.filter((b) => !this._blessings.has(b.id));
        const pool = candidates.length >= 3 ? [...candidates] : [...BLESSING_POOL];
        // 洗牌抽 3 张
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const picks: BlessingDef[] = pool.slice(0, 3);

        picks.forEach((b, idx) => {
            const cx = (idx - 1) * 276;
            const card = this._uiNode(`BlessCard_${idx}`, this._blessingCardsRoot);
            card.addComponent(UITransform).setContentSize(252, 204);
            card.setPosition(cx, -18, 0);
            ArtLoader.applySprite(card, 'ui_dng_card_bg', 252, 204);

            const tagL = this._uiNode('Tag', card).addComponent(Label);
            tagL.node.setPosition(0, 68, 0);
            tagL.string = `[${b.tag}]`;
            tagL.fontSize = 13;
            tagL.color = new Color(250, 206, 122, 255);

            const nameL = this._uiNode('Name', card).addComponent(Label);
            nameL.node.setPosition(0, 36, 0);
            nameL.string = b.name;
            nameL.fontSize = 20;
            nameL.color = new Color(252, 248, 236, 255);

            const descL = this._uiNode('Desc', card).addComponent(Label);
            descL.node.setPosition(0, -22, 0);
            descL.node.addComponent(UITransform).setContentSize(174, 88);
            descL.overflow = Label.Overflow.CLAMP;
            descL.enableWrapText = true;
            descL.string = b.desc;
            descL.fontSize = 13;
            descL.lineHeight = 19;
            descL.color = new Color(214, 232, 224, 245);

            card.on(Node.EventType.TOUCH_END, () => this._pickBlessing(b), this);
        });
    }

    private _pickBlessing(b: BlessingDef): void {
        this._blessings.add(b.id);
        if (b.id === 'iron_body') {
            this._maxHp += 35;
            this._hp = Math.min(this._maxHp, this._hp + 45);
        } else if (b.id === 'double_potato') {
            this._trialPotatoes += 2;
            this._refreshButtonLabels();
        }
        this._waitingBlessing = false;
        this._blessingModal.active = false;
        if (this._stageNum < DUNGEON_IMPLEMENTED_MAX_STAGE) {
            this._startStage(this._stageNum + 1);
            this._onToast?.(`获得古碑祝福「${b.name}」！已进入 ${this._stageCfg.label} 战斗房`);
        } else {
            this._roomCleared = true;
            this._doorLbl.string = '石门已开 →';
            this._onToast?.(`获得古碑祝福「${b.name}」！`);
        }
    }

    private _openBlacksmithModal(): void {
        this._waitingBlacksmith = true;
        this._blacksmithModal.active = true;
        this._renderBlacksmithCards();
    }

    private _renderBlacksmithCards(): void {
        this._blacksmithCardsRoot.removeAllChildren();
        const wNames = ['青竹剑', '连发符箓枪', '八卦聚光镜'];
        const curName = wNames[this._weaponIdx];
        const curTier = this._weaponTiers[this._weaponIdx];
        const nextCost = curTier < 3 ? WEAPON_TIER_UPGRADE_COST[curTier] : 0;
        const canUpgradeCur = curTier < 3 && this._lootGold >= nextCost;
        const allMax = this._weaponTiers[0] >= 3 && this._weaponTiers[1] >= 3 && this._weaponTiers[2] >= 3;
        const canResonate = !allMax && this._lootGold >= 90;
        const canHeal = this._lootGold >= 25 && (this._hp < this._maxHp || this._mana < this._maxMana);

        this._blacksmithTitleLbl.string = `神秘铁匠铺 · 当前局内金币：${this._lootGold}（可多次锻造）`;

        const cards: { tag: string; title: string; desc: string; costTxt: string; enabled: boolean; onTap: () => void }[] = [
            {
                tag: '单武升阶',
                title: curTier < 3 ? `锻造 ${curName}` : `${curName}已满阶`,
                desc: curTier < 3
                    ? `${WEAPON_TIER_NAMES[curTier]} → ${WEAPON_TIER_NAMES[curTier + 1]}（伤害倍率升至 ${Math.round(WEAPON_TIER_MULT[curTier + 1] * 100)}%）`
                    : '当前手持武器已达最高「天罡」品阶，可按 Q 切其他武器锻造',
                costTxt: curTier < 3 ? `消耗 ${nextCost} 局内金` : '已达上限',
                enabled: canUpgradeCur,
                onTap: () => {
                    if (!canUpgradeCur) {
                        this._onToast?.('局内金币不足或当前武器已满阶！');
                        return;
                    }
                    this._lootGold -= nextCost;
                    this._weaponTiers[this._weaponIdx] += 1;
                    this._refreshButtonLabels();
                    this._renderBlacksmithCards();
                    this._onToast?.(`${curName}已升阶为【${WEAPON_TIER_NAMES[this._weaponTiers[this._weaponIdx]]}】！`);
                },
            },
            {
                tag: '三武共鸣',
                title: allMax ? '全武器已天罡' : '全武器淬火 +1 阶',
                desc: '同时将青竹剑、符箓枪、八卦镜全部提升 1 品阶（最高天罡）',
                costTxt: allMax ? '已达上限' : '消耗 90 局内金',
                enabled: canResonate,
                onTap: () => {
                    if (!canResonate) {
                        this._onToast?.('局内金币不足 90 或全部武器已满阶！');
                        return;
                    }
                    this._lootGold -= 90;
                    for (let i = 0; i < 3; i++) {
                        if (this._weaponTiers[i] < 3) this._weaponTiers[i] += 1;
                    }
                    this._refreshButtonLabels();
                    this._renderBlacksmithCards();
                    this._onToast?.('炉火共鸣！三把国风武器品阶全面提升！');
                },
            },
            {
                tag: '灵泉补给',
                title: '饮用铁匠灵泉露',
                desc: '立即回复 55 点生命并回满全部灵力，整备迎接后半程精英与首领',
                costTxt: '消耗 25 局内金',
                enabled: canHeal,
                onTap: () => {
                    if (!canHeal) {
                        this._onToast?.('金币不足 25 或当前状态已满！');
                        return;
                    }
                    this._lootGold -= 25;
                    this._hp = Math.min(this._maxHp, this._hp + 55);
                    this._mana = this._maxMana;
                    this._renderBlacksmithCards();
                    this._onToast?.('饮下灵泉露，生命 +55、灵力已回满！');
                },
            },
        ];

        cards.forEach((c, idx) => {
            const cx = (idx - 1) * 276;
            const card = this._uiNode(`BsCard_${idx}`, this._blacksmithCardsRoot);
            card.addComponent(UITransform).setContentSize(252, 214);
            card.setPosition(cx, -8, 0);
            ArtLoader.applySprite(card, 'ui_dng_card_bg', 252, 214, () => {
                const sp = card.getChildByName('ArtSprite')?.getComponent(Sprite);
                if (sp) sp.color = c.enabled ? new Color(248, 226, 178, 255) : new Color(130, 132, 138, 185);
            });

            const tagL = this._uiNode('Tag', card).addComponent(Label);
            tagL.node.setPosition(0, 74, 0);
            tagL.string = `[${c.tag}]`;
            tagL.fontSize = 13;
            tagL.color = new Color(152, 236, 212, 255);

            const nameL = this._uiNode('Name', card).addComponent(Label);
            nameL.node.setPosition(0, 42, 0);
            nameL.string = c.title;
            nameL.fontSize = 19;
            nameL.color = new Color(252, 246, 232, 255);

            const descL = this._uiNode('Desc', card).addComponent(Label);
            descL.node.setPosition(0, -12, 0);
            descL.node.addComponent(UITransform).setContentSize(174, 82);
            descL.overflow = Label.Overflow.CLAMP;
            descL.enableWrapText = true;
            descL.string = c.desc;
            descL.fontSize = 12;
            descL.lineHeight = 18;
            descL.color = new Color(224, 220, 210, 240);

            const costL = this._uiNode('Cost', card).addComponent(Label);
            costL.node.setPosition(0, -76, 0);
            costL.string = c.costTxt;
            costL.fontSize = 14;
            costL.color = c.enabled ? new Color(255, 212, 118, 255) : new Color(156, 156, 156, 200);

            card.on(Node.EventType.TOUCH_END, c.onTap, this);
        });
    }

    private _spawnEnemy(kind: EnemyKind, x: number, y: number, elite = false): void {
        const st = ENEMY_STATS[kind];
        const hpScale = this._stageCfg.hpMult * (elite ? 1.55 : 1.0);
        const maxHp = Math.round(st.baseHp * hpScale);
        this._enemies.push({
            id: this._nextEnemyId++,
            kind,
            name: elite ? `精英·${st.name}` : st.name,
            isBoss: st.isBoss,
            elite,
            x,
            y,
            hp: maxHp,
            maxHp,
            radius: Math.round(st.radius * (elite ? 1.18 : 1.0)),
            speed: st.speed * (elite ? 1.08 : 1.0),
            fireCd: 0.7 + Math.random() * 0.7,
            specialCd: st.isBoss ? 3.2 : 2.6,
            hitFlash: 0,
            phase2: false,
            shellTimer: 2.2 + Math.random() * 1.2,
            shellActive: false,
            burrowTimer: 0,
            dashTimer: 0,
            dashVx: 0,
            dashVy: 0,
            trailCd: 0.5,
            wavePhase: Math.random() * Math.PI * 2,
            stealthTimer: 0,
            leapTimer: 0,
            leapVx: 0,
            leapVy: 0,
            isIllusion: false,
        });
    }

    private _onKeyDown(e: EventKeyboard): void {
        if (!this._open || !this._inCombat) return;
        this._keys.add(e.keyCode);
        if (this._waitingChoice || this._waitingBlessing || this._waitingBlacksmith) return;
        if (e.keyCode === KeyCode.KEY_J || e.keyCode === KeyCode.SPACE) this._doAttack();
        if (e.keyCode === KeyCode.KEY_K || e.keyCode === KeyCode.SHIFT_LEFT) this._doDodge();
        if (e.keyCode === KeyCode.KEY_Q) this._switchWeapon();
        if (e.keyCode === KeyCode.KEY_E) this._usePortablePlant();
    }

    private _onKeyUp(e: EventKeyboard): void {
        this._keys.delete(e.keyCode);
    }

    private _findNearestEnemy(fromX: number, fromY: number): Enemy | null {
        let best: Enemy | null = null;
        let bestD = Infinity;
        for (const e of this._enemies) {
            if (e.burrowTimer > 0) continue;
            const d = Math.hypot(e.x - fromX, e.y - fromY);
            if (d < bestD) {
                bestD = d;
                best = e;
            }
        }
        return best;
    }

    private _switchWeapon(): void {
        this._weaponIdx = (this._weaponIdx + 1) % 3;
        this._refreshButtonLabels();
    }

    private _refreshButtonLabels(): void {
        const baseNames = ['青竹剑', '符箓枪', '八卦镜'];
        const t = this._weaponTiers[this._weaponIdx];
        const badge = t > 0 ? `[${WEAPON_TIER_NAMES[t]}]` : '';
        this._weaponBtnLbl.string = `${baseNames[this._weaponIdx]}${badge}\n(Q切)`;

        const app = GameApp.inst;
        const potatoes = (app?.saveData.inventory['thunder_potato'] ?? 0) + this._trialPotatoes;
        const shoots = app?.saveData.inventory['cloud_bamboo_shoot'] ?? 0;
        if (potatoes > 0) {
            this._plantBtnLbl.string = `雷火薯×${potatoes}\n(E丢)`;
        } else if (shoots > 0) {
            this._plantBtnLbl.string = `穿云笋×${shoots}\n(E放)`;
        } else {
            this._plantBtnLbl.string = '无随身\n灵植';
        }
    }

    private _doDodge(): void {
        if (this._dodgeCd > 0) return;
        this._dodgeCd = this._blessings.has('wind_step') ? 0.66 : 0.92;
        this._dodgeTimer = 0.22;
        this._invulnTimer = this._hasBrookSoup ? 0.36 : 0.25;
        const mx = this._joyDir.x || (this._keys.has(KeyCode.KEY_D) ? 1 : this._keys.has(KeyCode.KEY_A) ? -1 : Math.cos(this._facingAngle));
        const my = this._joyDir.y || (this._keys.has(KeyCode.KEY_W) ? 1 : this._keys.has(KeyCode.KEY_S) ? -1 : Math.sin(this._facingAngle));
        const len = Math.hypot(mx, my) || 1;
        this._dodgeDir.set(mx / len, my / len);
    }

    private _hurtPlayer(rawDmg: number, isHazard = false): void {
        if (this._invulnTimer > 0) return;
        const dmg = isHazard && this._blessings.has('hazard_ward') ? Math.max(1, Math.round(rawDmg * 0.5)) : rawDmg;
        this._hp -= dmg;
        this._invulnTimer = isHazard ? 0.65 : 0.55;
    }

    private _triggerJarExplosion(jar: PowderJar): void {
        if (jar.exploded) return;
        jar.exploded = true;
        const blastR = 140;
        this._booms.push({ x: jar.x, y: jar.y, radius: blastR, life: 0.38 });
        for (const e of this._enemies) {
            if (e.burrowTimer <= 0 && Math.hypot(e.x - jar.x, e.y - jar.y) <= blastR + e.radius) {
                this._damageEnemy(e, 95, true);
            }
        }
        if (Math.hypot(this._px - jar.x, this._py - jar.y) <= blastR * 0.72) {
            this._hurtPlayer(14, true);
        }
        this._bullets = this._bullets.filter((b) => b.fromPlayer || Math.hypot(b.x - jar.x, b.y - jar.y) > blastR);
    }

    private _doAttack(): void {
        if (this._atkCd > 0 || this._waitingChoice || this._waitingBlessing || this._waitingBlacksmith) return;
        const target = this._findNearestEnemy(this._px, this._py);
        const angle = target ? Math.atan2(target.y - this._py, target.x - this._px) : this._facingAngle;
        this._facingAngle = angle;
        const manaMult = this._hasEstuarySoup ? 0.75 : 1.0;
        const tierMult = WEAPON_TIER_MULT[this._weaponTiers[this._weaponIdx]];

        if (this._weaponIdx === 0) {
            // 青竹剑：近战宽扇形斩击 + 劈碎弹幕
            this._atkCd = 0.34;
            const range = 112;
            const dmg = Math.round((this._blessings.has('sword_mana') ? 31 : 25) * tierMult);
            this._slashes.push({ x: this._px, y: this._py, angle, radius: range, life: 0.16 });
            let hitSomething = false;
            for (const e of this._enemies) {
                if (e.burrowTimer > 0) continue;
                if (Math.hypot(e.x - this._px, e.y - this._py) <= range + e.radius) {
                    this._damageEnemy(e, dmg, false);
                    hitSomething = true;
                }
            }
            for (const j of this._jars) {
                if (!j.exploded && Math.hypot(j.x - this._px, j.y - this._py) <= range + j.r) {
                    this._triggerJarExplosion(j);
                }
            }
            const sbMult = this._blessings.has('shield_breaker') ? 1.65 : 1.0;
            for (const iw of this._iceWalls) {
                if (iw.hp > 0 && Math.hypot(iw.x - this._px, iw.y - this._py) <= range + iw.rx) {
                    iw.hp -= Math.round(dmg * sbMult);
                }
            }
            for (const rod of this._lightningRods) {
                if (rod.hp > 0 && Math.hypot(rod.x - this._px, rod.y - this._py) <= range + rod.r) {
                    rod.hp -= Math.round(dmg * sbMult);
                    hitSomething = true;
                }
            }
            for (const orb of this._riftOrbs) {
                if (orb.hp > 0 && Math.hypot(orb.x - this._px, orb.y - this._py) <= range + orb.r + 12) {
                    orb.hp -= Math.round(dmg * 2.2 * sbMult);
                    hitSomething = true;
                }
            }
            const before = this._bullets.length;
            this._bullets = this._bullets.filter((b) => b.fromPlayer || Math.hypot(b.x - this._px, b.y - this._py) > range);
            if (this._blessings.has('sword_mana') && (hitSomething || this._bullets.length < before)) {
                this._mana = Math.min(this._maxMana, this._mana + 6);
            }
        } else if (this._weaponIdx === 1) {
            // 连发符箓枪（可被「符箓连珠」强化为双发）
            const cost = Math.max(1, Math.round(2 * manaMult));
            if (this._mana < cost) return;
            this._mana -= cost;
            this._atkCd = 0.19;
            const spd = 550;
            const offsets = this._blessings.has('double_talisman') ? [-0.09, 0.09] : [0];
            for (const off of offsets) {
                const a = angle + off;
                this._bullets.push({
                    fromPlayer: true,
                    x: this._px + Math.cos(a) * 20,
                    y: this._py + Math.sin(a) * 20,
                    vx: Math.cos(a) * spd,
                    vy: Math.sin(a) * spd,
                    dmg: Math.round((this._blessings.has('double_talisman') ? 14 : 17) * tierMult),
                    radius: 7,
                    life: 1.55,
                    color: new Color(224, 92, 54, 255),
                    bouncesLeft: this._stageCfg.hasReflectWalls ? 1 : 0,
                });
            }
        } else {
            // 八卦聚光镜：全屏穿透激光（无视熔岩龟缩壳反伤）
            const baseCost = this._blessings.has('focus_mirror') ? 7 : 9;
            const cost = Math.max(3, Math.round(baseCost * manaMult));
            if (this._mana < cost) return;
            this._mana -= cost;
            this._atkCd = 0.62;
            const dmg = Math.round((this._blessings.has('focus_mirror') ? 62 : 46) * tierMult);
            const x2 = this._px + Math.cos(angle) * 920;
            const y2 = this._py + Math.sin(angle) * 920;
            this._lasers.push({ x1: this._px, y1: this._py, x2, y2, life: 0.22 });
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);
            for (const e of this._enemies) {
                if (e.burrowTimer > 0) continue;
                const rx = e.x - this._px;
                const ry = e.y - this._py;
                const proj = rx * dx + ry * dy;
                if (proj > 0 && Math.abs(rx * dy - ry * dx) <= e.radius + 20) {
                    this._damageEnemy(e, dmg, true);
                }
            }
            const sbLaserMult = this._blessings.has('shield_breaker') ? 1.65 : 1.0;
            for (const rod of this._lightningRods) {
                if (rod.hp <= 0) continue;
                const rx = rod.x - this._px;
                const ry = rod.y - this._py;
                const proj = rx * dx + ry * dy;
                if (proj > 0 && Math.abs(rx * dy - ry * dx) <= rod.r + 20) {
                    rod.hp -= Math.round(dmg * sbLaserMult);
                }
            }
            for (const orb of this._riftOrbs) {
                if (orb.hp <= 0) continue;
                const rx = orb.x - this._px;
                const ry = orb.y - this._py;
                const proj = rx * dx + ry * dy;
                if (proj > 0 && Math.abs(rx * dy - ry * dx) <= orb.r + 20) {
                    orb.hp -= Math.round(dmg * sbLaserMult);
                }
            }
            for (const j of this._jars) {
                if (j.exploded) continue;
                const rx = j.x - this._px;
                const ry = j.y - this._py;
                const proj = rx * dx + ry * dy;
                if (proj > 0 && Math.abs(rx * dy - ry * dx) <= j.r + 18) {
                    this._triggerJarExplosion(j);
                }
            }
        }
    }

    private _usePortablePlant(): void {
        const app = GameApp.inst;
        if (!app?.ready || this._waitingChoice || this._waitingBlessing || this._waitingBlacksmith) return;

        const ownedPotato = app.saveData.inventory['thunder_potato'] ?? 0;
        if (ownedPotato > 0 || this._trialPotatoes > 0) {
            if (ownedPotato > 0) app.addItem('thunder_potato', -1);
            else this._trialPotatoes -= 1;

            const target = this._findNearestEnemy(this._px, this._py);
            const bx = target ? target.x : this._px + Math.cos(this._facingAngle) * 140;
            const by = target ? target.y : this._py + Math.sin(this._facingAngle) * 140;
            const blastR = this._blessings.has('double_potato') ? 168 : 135;
            this._booms.push({ x: bx, y: by, radius: blastR, life: 0.36 });

            if (this._crackedWall && !this._crackedWall.broken && Math.hypot(this._crackedWall.x - bx, this._crackedWall.y - by) <= blastR + 70) {
                this._crackedWall.broken = true;
                if (this._crackedWallNode) this._crackedWallNode.active = false;
                this._lootIron += 1;
                this._lootGold += 35;
                this._onToast?.('轰隆！炸开裂纹古石墙，获得隐藏宝藏：玄铁矿 +1、金币 +35！');
            }
            for (const j of this._jars) {
                if (!j.exploded && Math.hypot(j.x - bx, j.y - by) <= blastR + j.r) {
                    this._triggerJarExplosion(j);
                }
            }
            const sbBoom = this._blessings.has('shield_breaker') ? 1.65 : 1.0;
            for (const rod of this._lightningRods) {
                if (rod.hp > 0 && Math.hypot(rod.x - bx, rod.y - by) <= blastR + rod.r) {
                    rod.hp -= Math.round(90 * sbBoom);
                }
            }
            for (const orb of this._riftOrbs) {
                if (orb.hp > 0 && Math.hypot(orb.x - bx, orb.y - by) <= blastR + orb.r) {
                    orb.hp -= Math.round(90 * sbBoom);
                }
            }
            for (const e of this._enemies) {
                if (e.burrowTimer <= 0 && Math.hypot(e.x - bx, e.y - by) <= blastR + e.radius) {
                    this._damageEnemy(e, 90, true);
                }
            }
            this._bullets = this._bullets.filter((b) => b.fromPlayer || Math.hypot(b.x - bx, b.y - by) > blastR);
            this._refreshButtonLabels();
            return;
        }

        if ((app.saveData.inventory['cloud_bamboo_shoot'] ?? 0) > 0) {
            app.addItem('cloud_bamboo_shoot', -1);
            this._turrets.push({ id: this._nextTurretId++, x: this._px, y: this._py, life: 14, fireCd: 0.2 });
            this._refreshButtonLabels();
        }
    }

    private _damageEnemy(e: Enemy, dmg: number, pierceShield: boolean, fromThunder = false): void {
        if (e.hp <= 0 || e.burrowTimer > 0) return;

        let finalDmg = dmg;
        const sbMult = this._blessings.has('shield_breaker') ? 1.65 : 1.0;
        if (e.kind === 'boss_thunder_lord' && e.phase2 && this._lightningRods.some((r) => r.hp > 0)) {
            finalDmg = Math.max(4, Math.round(dmg * 0.2 * sbMult));
        }
        if (e.kind === 'boss_rift_overlord' && e.phase2 && this._riftOrbs.some((o) => o.hp > 0)) {
            finalDmg = Math.max(5, Math.round(dmg * 0.22 * sbMult));
        }
        if ((e.allyShieldTimer ?? 0) > 0 && !pierceShield) {
            finalDmg = Math.max(4, Math.round(finalDmg * 0.45 * sbMult));
        }
        if (e.kind === 'bronze_guardian' && !pierceShield) {
            finalDmg = Math.max(5, Math.round(finalDmg * 0.52 * sbMult));
        }
        // 寒镜侍正面格挡反伤机制（激光与雷火薯可破镜）
        if (e.kind === 'frost_mirror_guard' && !pierceShield) {
            const toPlayerX = this._px - e.x;
            const facingLeft = this._px < e.x;
            if ((facingLeft && toPlayerX < 0) || (!facingLeft && toPlayerX > 0)) {
                finalDmg = Math.max(4, Math.round(dmg * 0.28));
                const ra = Math.atan2(this._py - e.y, this._px - e.x);
                this._bullets.push({
                    fromPlayer: false,
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(ra) * 260,
                    vy: Math.sin(ra) * 260,
                    dmg: 10,
                    radius: 6,
                    life: 2.0,
                    color: new Color(138, 228, 255, 255),
                });
            }
        }
        // 熔岩龟缩壳反伤机制（激光与雷火薯可无视硬壳）
        if (e.shellActive && !pierceShield) {
            finalDmg = Math.max(3, Math.round(dmg * 0.3));
            for (let i = 0; i < 4; i++) {
                const a = (i * Math.PI) / 2 + Math.PI / 4;
                this._bullets.push({
                    fromPlayer: false,
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(a) * 210,
                    vy: Math.sin(a) * 210,
                    dmg: 8,
                    radius: 6,
                    life: 1.8,
                    color: new Color(255, 146, 72, 255),
                });
            }
        }

        e.hp -= finalDmg;
        e.hitFlash = 0.12;

        // 九霄引雷祝福：22% 概率额外降下 38 伤天雷
        if (!fromThunder && e.hp > 0 && this._blessings.has('crit_thunder') && Math.random() < 0.22) {
            this._lightnings.push({ x: e.x, y: e.y, life: 0.24 });
            this._damageEnemy(e, 38, true, true);
            return;
        }

        // X-10 关底首领半血触发二阶段狂暴
        if (!e.phase2 && !e.isIllusion && e.hp > 0 && e.hp <= e.maxHp * 0.5) {
            if (e.kind === 'boss_stone_spirit') {
                e.phase2 = true;
                this._pillars = [];
                for (const pn of this._pillarNodes) pn.destroy();
                this._pillarNodes = [];
                this._booms.push({ x: e.x, y: e.y, radius: 165, life: 0.4 });
                this._onToast?.('古墟石灵进入二阶段狂暴：震碎了石柱掩体，注意躲避四向激光！');
            } else if (e.kind === 'boss_magma_wyrm') {
                e.phase2 = true;
                this._lavaRimActive = true;
                this._booms.push({ x: e.x, y: e.y, radius: 180, life: 0.42 });
                this._onToast?.('丹砂火蛟进入二阶段：四周岩浆带被点燃，请留在中场周旋！');
            } else if (e.kind === 'boss_frost_turtle') {
                e.phase2 = true;
                this._booms.push({ x: e.x, y: e.y, radius: 175, life: 0.42 });
                this._onToast?.('寒玉玄龟进入二阶段：全屏降落极寒冰柱，可借冰墙掩体躲避！');
            } else if (e.kind === 'boss_ghost_spider') {
                e.phase2 = true;
                this._booms.push({ x: e.x, y: e.y, radius: 170, life: 0.4 });
                for (const offsetY of [-120, 120]) {
                    const cloneId = this._nextEnemyId++;
                    this._enemies.push({
                        id: cloneId,
                        kind: 'boss_ghost_spider',
                        name: '鬼面幻影',
                        isBoss: false,
                        elite: false,
                        x: Math.max(-ARENA_HALF_W + 80, Math.min(ARENA_HALF_W - 80, e.x - 60)),
                        y: Math.max(-ARENA_HALF_H + 60, Math.min(ARENA_HALF_H - 60, e.y + offsetY)),
                        hp: Math.round(e.maxHp * 0.16),
                        maxHp: Math.round(e.maxHp * 0.16),
                        radius: 34,
                        speed: 112,
                        fireCd: 1.5,
                        specialCd: 99,
                        hitFlash: 0,
                        phase2: true,
                        shellTimer: 99,
                        shellActive: false,
                        burrowTimer: 0,
                        dashTimer: 0,
                        dashVx: 0,
                        dashVy: 0,
                        trailCd: 99,
                        wavePhase: Math.random() * Math.PI * 2,
                        stealthTimer: 0,
                        leapTimer: 0,
                        leapVx: 0,
                        leapVy: 0,
                        isIllusion: true,
                    });
                }
                this._onToast?.('幽泽鬼面蛛进入二阶段：分裂出 2 只鬼面幻影并熄灭古灯！');
                for (const lt of this._lanterns) lt.lit = false;
            } else if (e.kind === 'boss_thunder_lord') {
                e.phase2 = true;
                this._booms.push({ x: e.x, y: e.y, radius: 185, life: 0.42 });
                const rodPts: [number, number][] = [[-130, 115], [160, 115], [15, -135]];
                for (const [rx, ry] of rodPts) {
                    this._lightningRods.push({ id: this._nextRodId++, x: rx, y: ry, hp: 110, maxHp: 110, r: 24 });
                }
                this._onToast?.('九霄雷公傀进入二阶段：升起 3 根避雷针电网护盾，必须先打碎避雷针破盾！');
            } else if (e.kind === 'boss_rift_overlord') {
                e.phase2 = true;
                this._booms.push({ x: e.x, y: e.y, radius: 200, life: 0.45 });
                for (let k = 0; k < 2; k++) {
                    const ang = k * Math.PI;
                    this._riftOrbs.push({
                        id: this._nextOrbId++,
                        angle: ang,
                        dist: 118,
                        x: e.x + Math.cos(ang) * 118,
                        y: e.y + Math.sin(ang) * 118,
                        hp: 120,
                        maxHp: 120,
                        r: 22,
                    });
                }
                this._onToast?.('古渊裂隙之主进入终极形态：展开虚空护盾并召唤 2 颗核心法球，快用青竹剑斩碎破防！');
            }
        }

        if (e.hp <= 0) {
            if (e.kind === 'boss_twin_melee' || e.kind === 'boss_twin_ranged') {
                const siblingKind = e.kind === 'boss_twin_melee' ? 'boss_twin_ranged' : 'boss_twin_melee';
                const sib = this._enemies.find((o) => o.kind === siblingKind && o.hp > 0);
                if (sib && !sib.phase2) {
                    sib.phase2 = true;
                    sib.speed = Math.round(sib.speed * 1.32);
                    this._booms.push({ x: sib.x, y: sib.y, radius: 130, life: 0.35 });
                    this._onToast?.(`${e.name}倒下！${sib.name}吸收双生灵力进入狂暴二阶段！`);
                }
            }
            if (e.kind === 'snow_puppet') {
                // 雪绒傀死亡炸开冰雾减速区 + 6 向寒冰弹
                this._frostPools.push({ x: e.x, y: e.y, r: 82, life: 5.5 });
                for (let i = 0; i < 6; i++) {
                    const a = (i * Math.PI * 2) / 6;
                    this._bullets.push({
                        fromPlayer: false,
                        x: e.x,
                        y: e.y,
                        vx: Math.cos(a) * 195,
                        vy: Math.sin(a) * 195,
                        dmg: 10,
                        radius: 6,
                        life: 1.8,
                        color: new Color(156, 232, 255, 255),
                    });
                }
            }
            const st = ENEMY_STATS[e.kind];
            if (!e.isIllusion) {
                this._lootGold += st.goldReward + (e.elite ? 15 : 0);
            }
            if (this._blessings.has('vamp_sprout')) {
                this._hp = Math.min(this._maxHp, this._hp + 4);
            }
            if (e.isBoss) {
                this._lootIron += this._stageCfg.subStage === 10 ? 3 : 2;
                if (this._stageCfg.chapter === 1) {
                    this._lootSeeds.push('thunder_potato_seed', 'cloud_bamboo_shoot_seed');
                } else {
                    this._lootSeeds.push('sky_bamboo_seed', 'thunder_potato_seed');
                }
            } else if (Math.random() < (e.elite ? 0.85 : 0.25)) {
                this._lootIron += 1;
            }
        }
    }

    private _finishRun(victory: boolean, customMsg: string): void {
        const app = GameApp.inst;
        this._open = false;
        this._inCombat = false;
        this._panel.active = false;
        this._keys.clear();
        AudioManager.inst.playBgm('overworld');

        if (app?.ready) {
            const finalGold = victory ? this._lootGold : Math.floor(this._lootGold * 0.7);
            if (finalGold > 0) app.addGold(finalGold);
            if (this._lootIron > 0) app.addItem('xuan_iron', this._lootIron);
            for (const s of this._lootSeeds) app.addItem(s, 1);

            let unlockNote = '';
            const totalIron = app.saveData.inventory['xuan_iron'] ?? 0;
            if (app.saveData.farm.unlockedTier < 2 && totalIron >= 3) {
                app.saveData.farm.unlockedTier = 2;
                unlockNote = ' · 已锻造二阶玄铁斧镐，可清理西侧铁木林！';
            }
            app.persist('dungeon_finish');
            this._onToast?.(
                `${customMsg}（+${finalGold}金 · 玄铁×${this._lootIron}${this._lootSeeds.length > 0 ? ` · 灵种×${this._lootSeeds.length}` : ''}）${unlockNote}`
            );
        }
    }

    private _refreshTopHud(): void {
        const cfg = this._stageCfg;
        this._topLbl.string = `${cfg.biome.name} ${cfg.label}（${this._stageNum}/${DUNGEON_TOTAL_STAGES}）| 生命 ${Math.ceil(this._hp)}/${this._maxHp} | 灵力 ${Math.floor(this._mana)} | 玄铁 +${this._lootIron} 金 +${this._lootGold}`;
        const tags: string[] = [];
        if (this._hasBrookSoup) tags.push('寒溪鲜鱼汤');
        if (this._hasEstuarySoup) tags.push('海口灵力羹');
        for (const bid of this._blessings) {
            const b = BLESSING_POOL.find((x) => x.id === bid);
            if (b) tags.push(b.name);
        }
        this._buffLbl.string = tags.length > 0
            ? `当前增益：${tags.join(' · ')}`
            : 'WASD移动 / J攻击 / K翻滚 / Q切武器 / E丢雷火薯或放穿云笋炮台';
    }

    protected update(dt: number): void {
        if (!this._open || !this._inCombat) return;
        this._animClock += dt;
        const clampedDt = Math.min(dt, 0.05);

        if (!this._waitingChoice && !this._waitingBlessing && !this._waitingBlacksmith) {
            this._stepCombat(clampedDt);
        }
        this._renderArena();
        this._refreshTopHud();
    }

    private _stepCombat(dt: number): void {
        this._atkCd = Math.max(0, this._atkCd - dt);
        this._dodgeCd = Math.max(0, this._dodgeCd - dt);
        this._invulnTimer = Math.max(0, this._invulnTimer - dt);
        const manaRegen = (this._hasEstuarySoup ? 14 : 9.5) + (this._blessings.has('mana_spring') ? 5 : 0);
        this._mana = Math.min(this._maxMana, this._mana + manaRegen * dt);

        this._rootTimer = Math.max(0, this._rootTimer - dt);
        const immuneControl = this._hasBrookSoup || this._blessings.has('frost_ward');
        let inFrostPool = false;
        for (const fp of this._frostPools) {
            if (Math.hypot(this._px - fp.x, this._py - fp.y) < fp.r) {
                inFrostPool = true;
                break;
            }
        }
        const frostSlowMult = (!immuneControl && (this._frostWindActiveTimer > 0 || inFrostPool)) ? 0.62 : 1.0;

        // 玩家移动 / 翻滚（含第 3 大关滑冰惯性与第 4 大关蛛网定身）
        if (this._dodgeTimer > 0) {
            this._dodgeTimer -= dt;
            this._px += this._dodgeDir.x * 550 * dt;
            this._py += this._dodgeDir.y * 550 * dt;
        } else if (this._rootTimer > 0 && !immuneControl) {
            this._pMoving = false;
            this._pvx = 0;
            this._pvy = 0;
        } else {
            let vx = this._joyDir.x;
            let vy = this._joyDir.y;
            if (this._keys.has(KeyCode.KEY_W) || this._keys.has(KeyCode.ARROW_UP)) vy += 1;
            if (this._keys.has(KeyCode.KEY_S) || this._keys.has(KeyCode.ARROW_DOWN)) vy -= 1;
            if (this._keys.has(KeyCode.KEY_A) || this._keys.has(KeyCode.ARROW_LEFT)) vx -= 1;
            if (this._keys.has(KeyCode.KEY_D) || this._keys.has(KeyCode.ARROW_RIGHT)) vx += 1;
            const len = Math.hypot(vx, vy);
            this._pMoving = len > 0.01;
            let spd = this._hasBrookSoup ? 275 : 238;
            if (this._blessings.has('wind_step')) spd *= 1.18;
            if (this._blessings.has('frost_ward')) spd *= 1.08;
            spd *= frostSlowMult;

            if (this._stageCfg.hasIceFloor) {
                const targetVx = len > 0.01 ? (vx / len) * spd : 0;
                const targetVy = len > 0.01 ? (vy / len) * spd : 0;
                const blend = Math.min(1, dt * 4.2);
                this._pvx += (targetVx - this._pvx) * blend;
                this._pvy += (targetVy - this._pvy) * blend;
                this._px += this._pvx * dt;
                this._py += this._pvy * dt;
            } else if (len > 0.01) {
                this._px += (vx / len) * spd * dt;
                this._py += (vy / len) * spd * dt;
            }
            if (len > 0.01) {
                this._facingAngle = Math.atan2(vy, vx);
                if (Math.abs(vx) > Math.abs(vy) * 0.85) {
                    this._pDir = 'side';
                    this._pFacingX = vx < 0 ? -1 : 1;
                } else if (vy > 0) {
                    this._pDir = 'back';
                    this._pFacingX = 1;
                } else {
                    this._pDir = 'front';
                    this._pFacingX = 1;
                }
                this._pAnimTimer += dt;
                if (this._pAnimTimer >= 0.14) {
                    this._pAnimTimer -= 0.14;
                    this._pAnimIdx = (this._pAnimIdx + 1) % 4;
                }
            }
        }
        this._px = Math.max(-ARENA_HALF_W + 24, Math.min(ARENA_HALF_W - 24, this._px));
        this._py = Math.max(-ARENA_HALF_H + 24, Math.min(ARENA_HALF_H - 24, this._py));

        // 石柱掩体推挤
        for (const pl of this._pillars) {
            const dx = this._px - pl.x;
            const dy = this._py - pl.y;
            const d = Math.hypot(dx, dy);
            const minD = pl.rx + 18;
            if (d > 0.01 && d < minD) {
                this._px = pl.x + (dx / d) * minD;
                this._py = pl.y + (dy / d) * minD;
            }
        }

        // 二阶段丹砂火蛟外圈岩浆带伤害
        if (this._lavaRimActive && (Math.abs(this._px) > ARENA_HALF_W - 76 || Math.abs(this._py) > ARENA_HALF_H - 54)) {
            this._hurtPlayer(10, true);
        }

        // 枯竹刺陷阱周期判定
        for (const sp of this._spikes) {
            sp.cycle = (sp.cycle + dt) % 4.2;
            if (sp.cycle >= 2.9 && Math.hypot(this._px - sp.x, this._py - sp.y) < sp.r + 10) {
                this._hurtPlayer(10, true);
            }
        }

        // 第 2 大关周期熔岩火圈
        if (this._stageCfg.magmaInterval > 0 && !this._roomCleared) {
            this._magmaSpawnCd -= dt;
            if (this._magmaSpawnCd <= 0) {
                this._magmaSpawnCd = this._stageCfg.magmaInterval;
                this._magmaRings.push({
                    x: Math.max(-ARENA_HALF_W + 70, Math.min(ARENA_HALF_W - 70, this._px + (Math.random() - 0.5) * 90)),
                    y: Math.max(-ARENA_HALF_H + 60, Math.min(ARENA_HALF_H - 60, this._py + (Math.random() - 0.5) * 90)),
                    r: 58,
                    warnTimer: 1.15,
                    eruptTimer: 0.52,
                });
            }
        }
        for (const mr of this._magmaRings) {
            if (mr.warnTimer > 0) {
                mr.warnTimer -= dt;
            } else {
                mr.eruptTimer -= dt;
                if (Math.hypot(this._px - mr.x, this._py - mr.y) < mr.r) {
                    this._hurtPlayer(12, true);
                }
            }
        }
        this._magmaRings = this._magmaRings.filter((m) => m.eruptTimer > 0);

        // 地面火焰路径
        for (const fp of this._firePools) {
            fp.life -= dt;
            if (Math.hypot(this._px - fp.x, this._py - fp.y) < fp.r) {
                this._hurtPlayer(8, true);
            }
        }
        this._firePools = this._firePools.filter((f) => f.life > 0);

        // 第 3 大关：周期极寒霜风 + 冰雾区 + 冰墙推挤 + 落冰柱
        if (this._stageCfg.frostWindInterval > 0 && !this._roomCleared) {
            if (this._frostWindActiveTimer > 0) {
                this._frostWindActiveTimer = Math.max(0, this._frostWindActiveTimer - dt);
            } else {
                this._frostWindCd -= dt;
                if (this._frostWindCd <= 0) {
                    this._frostWindActiveTimer = 2.6;
                    this._frostWindCd = this._stageCfg.frostWindInterval;
                }
            }
        }
        for (const fp of this._frostPools) fp.life -= dt;
        this._frostPools = this._frostPools.filter((f) => f.life > 0);
        this._iceWalls = this._iceWalls.filter((iw) => iw.hp > 0);
        for (const iw of this._iceWalls) {
            const dx = this._px - iw.x;
            const dy = this._py - iw.y;
            const d = Math.hypot(dx, dy);
            const minD = iw.rx + 18;
            if (d > 0.01 && d < minD) {
                this._px = iw.x + (dx / d) * minD;
                this._py = iw.y + (dy / d) * minD;
            }
        }
        for (const ic of this._icicles) {
            if (ic.warnTimer > 0) {
                ic.warnTimer -= dt;
            } else {
                ic.impactTimer -= dt;
                const sheltered = this._iceWalls.some((iw) => Math.hypot(this._px - iw.x, this._py - iw.y) < iw.rx + 46);
                if (!sheltered && Math.hypot(this._px - ic.x, this._py - ic.y) < ic.r) {
                    this._hurtPlayer(14, true);
                }
            }
        }
        this._icicles = this._icicles.filter((ic) => ic.impactTimer > 0);

        // 第 4 大关：驱雾古灯交互 + 毒沼泥潭
        for (const lt of this._lanterns) {
            if (!lt.lit && Math.hypot(this._px - lt.x, this._py - lt.y) < 52) {
                lt.lit = true;
                const left = this._lanterns.filter((x) => !x.lit).length;
                this._onToast?.(left === 0 ? '两盏古灯已全亮，暗紫瘴雾尽数散去！' : '已点亮 1 盏驱雾古灯，再点亮 1 盏即可彻底驱雾！');
            }
        }
        for (const pp of this._poisonPools) {
            if (!pp.permanent) pp.life -= dt;
            if (Math.hypot(this._px - pp.x, this._py - pp.y) < pp.r) {
                this._hurtPlayer(8, true);
            }
        }
        this._poisonPools = this._poisonPools.filter((p) => p.permanent || p.life > 0);
        this._lightnings = this._lightnings.filter((l) => { l.life -= dt; return l.life > 0; });

        this._copperBoostTimer = Math.max(0, this._copperBoostTimer - dt);
        if (this._copperPillars.length >= 2 && !this._roomCleared) {
            const period = this._copperBoostTimer > 0 ? 2.6 : 4.2;
            this._copperArcCycle = (this._copperArcCycle + dt) % period;
            const activeStart = period - 0.9;
            if (this._copperArcCycle >= activeStart) {
                for (let i = 0; i < this._copperPillars.length; i++) {
                    const a = this._copperPillars[i];
                    const b = this._copperPillars[(i + 1) % this._copperPillars.length];
                    if (this._copperPillars.length === 2 && i === 1) break;
                    const vx = b.x - a.x;
                    const vy = b.y - a.y;
                    const l2 = vx * vx + vy * vy || 1;
                    const t = Math.max(0, Math.min(1, ((this._px - a.x) * vx + (this._py - a.y) * vy) / l2));
                    const cx = a.x + vx * t;
                    const cy = a.y + vy * t;
                    if (Math.hypot(this._px - cx, this._py - cy) < 18) {
                        this._hurtPlayer(12, true);
                    }
                }
            }
        }
        for (const tz of this._thunderZones) {
            if (tz.warnTimer > 0) {
                tz.warnTimer -= dt;
                if (tz.warnTimer <= 0) {
                    this._lightnings.push({ x: tz.x, y: tz.y, life: 0.28 });
                }
            } else {
                tz.strikeTimer -= dt;
                if (Math.hypot(this._px - tz.x, this._py - tz.y) < tz.r) {
                    this._hurtPlayer(15, true);
                }
            }
        }
        this._thunderZones = this._thunderZones.filter((tz) => tz.strikeTimer > 0);

        const prevRodCount = this._lightningRods.length;
        this._lightningRods = this._lightningRods.filter((r) => r.hp > 0);
        if (prevRodCount > 0 && this._lightningRods.length === 0) {
            const tl = this._enemies.find((e) => e.kind === 'boss_thunder_lord' && e.hp > 0);
            if (tl) {
                tl.stunTimer = 2.6;
                this._booms.push({ x: tl.x, y: tl.y, radius: 130, life: 0.35 });
                this._onToast?.('三根避雷针尽数击碎！九霄雷公傀雷盾瓦解并陷入眩晕！');
            }
        }
        if (this._lightningRods.length >= 2) {
            for (let i = 0; i < this._lightningRods.length; i++) {
                const a = this._lightningRods[i];
                const b = this._lightningRods[(i + 1) % this._lightningRods.length];
                if (this._lightningRods.length === 2 && i === 1) break;
                const vx = b.x - a.x;
                const vy = b.y - a.y;
                const l2 = vx * vx + vy * vy || 1;
                const t = Math.max(0, Math.min(1, ((this._px - a.x) * vx + (this._py - a.y) * vy) / l2));
                if (Math.hypot(this._px - (a.x + vx * t), this._py - (a.y + vy * t)) < 16) {
                    this._hurtPlayer(12, true);
                }
            }
        }

        for (const rv of this._riftVortices) {
            rv.phase += dt * 3.2;
            const dx = rv.x - this._px;
            const dy = rv.y - this._py;
            const d = Math.hypot(dx, dy);
            if (d > 8 && d < rv.r * 2.5 && this._dodgeTimer <= 0) {
                const pull = (1 - d / (rv.r * 2.5)) * 78;
                this._px += (dx / d) * pull * dt;
                this._py += (dy / d) * pull * dt;
            }
            if (d < rv.r * 0.45) {
                this._hurtPlayer(10, true);
            }
        }
        if (this._stageCfg.hasSealRing && !this._roomCleared) {
            this._sealAngle += dt * 0.48;
            for (let k = 0; k < 2; k++) {
                const a = this._sealAngle + k * Math.PI;
                const dx = Math.cos(a);
                const dy = Math.sin(a);
                const proj = this._px * dx + this._py * dy;
                if (proj > 45 && proj < 390 && Math.abs(this._px * dy - this._py * dx) < 15) {
                    this._hurtPlayer(11, true);
                }
            }
        }
        const prevOrbCount = this._riftOrbs.length;
        const overlord = this._enemies.find((e) => e.kind === 'boss_rift_overlord' && e.hp > 0);
        for (const orb of this._riftOrbs) {
            orb.angle += dt * 1.9;
            if (overlord) {
                orb.x = overlord.x + Math.cos(orb.angle) * orb.dist;
                orb.y = overlord.y + Math.sin(orb.angle) * orb.dist;
            }
        }
        this._riftOrbs = this._riftOrbs.filter((o) => o.hp > 0);
        if (prevOrbCount > 0 && this._riftOrbs.length === 0 && overlord) {
            overlord.stunTimer = 3.0;
            this._booms.push({ x: overlord.x, y: overlord.y, radius: 155, life: 0.4 });
            this._onToast?.('裂隙核心法球已被斩碎！古渊裂隙之主虚空护盾破裂，全力输出！');
        }

        // 首领四向激光
        for (const bl of this._bossLasers) {
            if (bl.warnTimer > 0) {
                bl.warnTimer -= dt;
            } else {
                bl.activeTimer -= dt;
                bl.angle += dt * 0.55;
                for (let k = 0; k < 4; k++) {
                    const a = bl.angle + (k * Math.PI) / 2;
                    const dx = Math.cos(a);
                    const dy = Math.sin(a);
                    const rx = this._px - bl.x;
                    const ry = this._py - bl.y;
                    const proj = rx * dx + ry * dy;
                    if (proj > 0 && Math.abs(rx * dy - ry * dx) < 18) {
                        this._hurtPlayer(14, false);
                    }
                }
            }
        }
        this._bossLasers = this._bossLasers.filter((bl) => bl.activeTimer > 0);

        // 宝箱房交互
        if (this._chest && !this._chest.opened && Math.hypot(this._px - this._chest.x, this._py - this._chest.y) < 58) {
            this._chest.opened = true;
            this._lootGold += 45;
            this._lootIron += 1;
            this._trialPotatoes += 1;
            this._refreshButtonLabels();
            this._roomCleared = true;
            this._doorLbl.string = '石门已开 →';
            this._onToast?.('开启古玉宝箱：金币 +45、玄铁矿 +1、局内雷火薯 +1！向右前往下一关');
        }

        // 穿云笋炮台
        for (const t of this._turrets) {
            t.life -= dt;
            t.fireCd -= dt;
            if (t.fireCd <= 0) {
                const target = this._findNearestEnemy(t.x, t.y);
                if (target) {
                    const ang = Math.atan2(target.y - t.y, target.x - t.x);
                    this._bullets.push({
                        fromPlayer: true,
                        x: t.x,
                        y: t.y,
                        vx: Math.cos(ang) * 480,
                        vy: Math.sin(ang) * 480,
                        dmg: 15,
                        radius: 6,
                        life: 1.2,
                        color: new Color(102, 214, 128, 255),
                    });
                    t.fireCd = 0.68;
                }
            }
        }
        this._turrets = this._turrets.filter((t) => t.life > 0);

        // 怪物差异化 AI 更新
        this._stepEnemies(dt);

        // 子弹移动与碰撞（含瘴雾花追踪孢子、冰墙阻挡与鬼面蛛定身网）
        for (const b of this._bullets) {
            if (!b.fromPlayer && b.homing) {
                const ta = Math.atan2(this._py - b.y, this._px - b.x);
                const curSpd = Math.hypot(b.vx, b.vy) || 145;
                b.vx += (Math.cos(ta) * curSpd - b.vx) * Math.min(1, dt * 2.2);
                b.vy += (Math.sin(ta) * curSpd - b.vy) * Math.min(1, dt * 2.2);
            }
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;
            if (Math.abs(b.x) > ARENA_HALF_W || Math.abs(b.y) > ARENA_HALF_H) {
                if ((b.bouncesLeft ?? 0) > 0) {
                    b.bouncesLeft = (b.bouncesLeft ?? 0) - 1;
                    if (Math.abs(b.x) > ARENA_HALF_W) {
                        b.x = Math.sign(b.x) * (ARENA_HALF_W - 2);
                        b.vx = -b.vx;
                    }
                    if (Math.abs(b.y) > ARENA_HALF_H) {
                        b.y = Math.sign(b.y) * (ARENA_HALF_H - 2);
                        b.vy = -b.vy;
                    }
                } else {
                    b.life = 0;
                    continue;
                }
            }
            let hitPillar = false;
            for (const pl of this._pillars) {
                if (Math.hypot(b.x - pl.x, b.y - pl.y) < pl.rx + b.radius * 0.5) {
                    hitPillar = true;
                    break;
                }
            }
            if (hitPillar) {
                b.life = 0;
                continue;
            }
            let hitIceWall = false;
            for (const iw of this._iceWalls) {
                if (iw.hp > 0 && Math.hypot(b.x - iw.x, b.y - iw.y) < iw.rx + b.radius) {
                    if (b.fromPlayer) iw.hp -= b.dmg;
                    hitIceWall = true;
                    break;
                }
            }
            if (hitIceWall) {
                b.life = 0;
                continue;
            }
            if (b.fromPlayer) {
                for (const j of this._jars) {
                    if (!j.exploded && Math.hypot(j.x - b.x, j.y - b.y) <= j.r + b.radius) {
                        this._triggerJarExplosion(j);
                        b.life = 0;
                        break;
                    }
                }
                if (b.life <= 0) continue;
                const sbBul = this._blessings.has('shield_breaker') ? 1.65 : 1.0;
                let hitObj = false;
                for (const rod of this._lightningRods) {
                    if (rod.hp > 0 && Math.hypot(rod.x - b.x, rod.y - b.y) <= rod.r + b.radius) {
                        rod.hp -= Math.round(b.dmg * sbBul);
                        b.life = 0;
                        hitObj = true;
                        break;
                    }
                }
                if (hitObj) continue;
                for (const orb of this._riftOrbs) {
                    if (orb.hp > 0 && Math.hypot(orb.x - b.x, orb.y - b.y) <= orb.r + b.radius) {
                        orb.hp -= Math.round(b.dmg * sbBul);
                        b.life = 0;
                        hitObj = true;
                        break;
                    }
                }
                if (hitObj) continue;
                for (const e of this._enemies) {
                    if (e.hp > 0 && e.burrowTimer <= 0 && Math.hypot(e.x - b.x, e.y - b.y) <= e.radius + b.radius) {
                        this._damageEnemy(e, b.dmg, false);
                        b.life = 0;
                        break;
                    }
                }
            } else if (Math.hypot(this._px - b.x, this._py - b.y) <= 18 + b.radius) {
                this._hurtPlayer(b.dmg, false);
                if (b.rootsPlayer && !this._blessings.has('frost_ward')) {
                    this._rootTimer = 1.1;
                }
                if (b.drainsMana && !this._blessings.has('mana_spring')) {
                    this._mana = Math.max(0, this._mana - 12);
                }
                b.life = 0;
            }
        }

        this._enemies = this._enemies.filter((e) => e.hp > 0);
        this._bullets = this._bullets.filter((b) => b.life > 0);
        this._lasers = this._lasers.filter((l) => { l.life -= dt; return l.life > 0; });
        this._slashes = this._slashes.filter((s) => { s.life -= dt; return s.life > 0; });
        this._booms = this._booms.filter((b) => { b.life -= dt; return b.life > 0; });

        if (this._hp <= 0) {
            this._finishRun(false, `在 ${this._stageCfg.label} 力竭退回主岛（已带回 70% 战利品）`);
            return;
        }

        // 清房判定（祝福房和宝箱房由交互触发 _roomCleared）
        if (this._stageCfg.roomKind !== 'blessing' && this._stageCfg.roomKind !== 'chest' && this._stageCfg.roomKind !== 'blacksmith' && this._enemies.length === 0 && !this._roomCleared) {
            this._onStageCleared();
        }

        // 走入东侧石门进入下一关
        if (this._roomCleared && !this._waitingChoice && this._stageNum < DUNGEON_IMPLEMENTED_MAX_STAGE) {
            if (this._px > ARENA_HALF_W - 68 && Math.abs(this._py) < 62) {
                this._startStage(this._stageNum + 1);
            }
        }
    }

    private _stepEnemies(dt: number): void {
        const toSpawn: { kind: EnemyKind; x: number; y: number }[] = [];
        for (const e of this._enemies) {
            e.hitFlash = Math.max(0, e.hitFlash - dt);
            if ((e.allyShieldTimer ?? 0) > 0) e.allyShieldTimer = Math.max(0, (e.allyShieldTimer ?? 0) - dt);
            if ((e.stunTimer ?? 0) > 0) {
                e.stunTimer = Math.max(0, (e.stunTimer ?? 0) - dt);
                continue;
            }
            const dx = this._px - e.x;
            const dy = this._py - e.y;
            const dist = Math.hypot(dx, dy) || 1;
            const st = ENEMY_STATS[e.kind];

            // 熔岩龟周期缩壳反伤
            if (e.kind === 'magma_turtle') {
                e.shellTimer -= dt;
                if (e.shellTimer <= 0) {
                    e.shellActive = !e.shellActive;
                    e.shellTimer = e.shellActive ? 2.1 : 3.1;
                }
            }

            // 丹砂火蛟潜行钻地 & 冲锋
            if (e.kind === 'boss_magma_wyrm') {
                if (e.burrowTimer > 0) {
                    e.burrowTimer -= dt;
                    e.x += (dx / dist) * (e.phase2 ? 205 : 165) * dt;
                    e.y += (dy / dist) * (e.phase2 ? 205 : 165) * dt;
                    if (e.burrowTimer <= 0) {
                        this._booms.push({ x: e.x, y: e.y, radius: 92, life: 0.3 });
                        e.dashTimer = 0.72;
                        const a = Math.atan2(this._py - e.y, this._px - e.x);
                        e.dashVx = Math.cos(a) * (e.phase2 ? 320 : 265);
                        e.dashVy = Math.sin(a) * (e.phase2 ? 320 : 265);
                        // 破土释放环形火星
                        const cnt = e.phase2 ? 10 : 6;
                        for (let i = 0; i < cnt; i++) {
                            const ba = (i * Math.PI * 2) / cnt;
                            this._bullets.push({
                                fromPlayer: false,
                                x: e.x,
                                y: e.y,
                                vx: Math.cos(ba) * 215,
                                vy: Math.sin(ba) * 215,
                                dmg: 12,
                                radius: 7,
                                life: 2.5,
                                color: new Color(255, 118, 56, 255),
                            });
                        }
                    }
                    continue;
                }
                if (e.dashTimer > 0) {
                    e.dashTimer -= dt;
                    e.x += e.dashVx * dt;
                    e.y += e.dashVy * dt;
                    e.trailCd -= dt;
                    if (e.trailCd <= 0) {
                        e.trailCd = 0.22;
                        this._firePools.push({ x: e.x, y: e.y, r: 30, life: 3.6 });
                    }
                } else {
                    e.x += (dx / dist) * e.speed * dt;
                    e.y += (dy / dist) * e.speed * dt;
                }
                e.specialCd -= dt;
                if (e.specialCd <= 0) {
                    e.burrowTimer = 1.1;
                    e.specialCd = e.phase2 ? 4.4 : 5.6;
                }
            } else if (e.kind === 'fire_bat') {
                // 赤炎蝙蝠：Z 字蛇形高速俯冲
                const perpX = -dy / dist;
                const perpY = dx / dist;
                const sway = Math.sin(this._animClock * 7 + e.wavePhase) * 0.75;
                e.x += ((dx / dist) + perpX * sway) * e.speed * dt;
                e.y += ((dy / dist) + perpY * sway) * e.speed * dt;
            } else if (e.kind === 'fire_taoist') {
                // 火符道童：边游走边留地面火径
                if (dist > 140) {
                    e.x += (dx / dist) * e.speed * dt;
                    e.y += (dy / dist) * e.speed * dt;
                }
                e.trailCd -= dt;
                if (e.trailCd <= 0) {
                    e.trailCd = 0.75;
                    this._firePools.push({ x: e.x, y: e.y, r: 24, life: 3.4 });
                }
            } else if (e.kind === 'shadow_ink_assassin') {
                // 影墨刺客：周期隐身瞬移到玩家身后背刺
                if (e.stealthTimer > 0) {
                    e.stealthTimer -= dt;
                    if (e.stealthTimer <= 0) {
                        e.x = Math.max(-ARENA_HALF_W + 40, Math.min(ARENA_HALF_W - 40, this._px - Math.cos(this._facingAngle) * 76));
                        e.y = Math.max(-ARENA_HALF_H + 40, Math.min(ARENA_HALF_H - 40, this._py - Math.sin(this._facingAngle) * 76));
                        const ba = Math.atan2(this._py - e.y, this._px - e.x);
                        for (const off of [-0.24, 0, 0.24]) {
                            this._bullets.push({
                                fromPlayer: false,
                                x: e.x,
                                y: e.y,
                                vx: Math.cos(ba + off) * 265,
                                vy: Math.sin(ba + off) * 265,
                                dmg: 11,
                                radius: 6,
                                life: 1.9,
                                color: new Color(188, 126, 255, 255),
                            });
                        }
                    }
                } else {
                    e.x += (dx / dist) * e.speed * dt;
                    e.y += (dy / dist) * e.speed * dt;
                    e.specialCd -= dt;
                    if (e.specialCd <= 0) {
                        e.stealthTimer = 1.25;
                        e.specialCd = 4.6;
                    }
                }
            } else if (e.kind === 'venom_frog') {
                // 毒蛙精：周期跳跃扑击并在落点留毒沼
                if (e.leapTimer > 0) {
                    e.leapTimer -= dt;
                    e.x += e.leapVx * dt;
                    e.y += e.leapVy * dt;
                    if (e.leapTimer <= 0) {
                        this._poisonPools.push({ x: e.x, y: e.y, r: 40, life: 5.8 });
                    }
                } else {
                    e.specialCd -= dt;
                    if (e.specialCd <= 0) {
                        e.leapTimer = 0.45;
                        e.leapVx = (dx / dist) * 290;
                        e.leapVy = (dy / dist) * 290;
                        e.specialCd = 2.6;
                    } else if (dist > 120) {
                        e.x += (dx / dist) * (e.speed * 0.55) * dt;
                        e.y += (dy / dist) * (e.speed * 0.55) * dt;
                    }
                }
            } else if (e.kind === 'bronze_guardian') {
                if (e.dashTimer > 0) {
                    e.dashTimer -= dt;
                    e.x += e.dashVx * dt;
                    e.y += e.dashVy * dt;
                } else {
                    e.x += (dx / dist) * e.speed * dt;
                    e.y += (dy / dist) * e.speed * dt;
                    e.specialCd -= dt;
                    if (e.specialCd <= 0 && dist < 340) {
                        e.dashTimer = 0.52;
                        e.dashVx = (dx / dist) * 320;
                        e.dashVy = (dy / dist) * 320;
                        e.specialCd = 3.6;
                    }
                }
            } else if (e.kind === 'arc_sparrow') {
                const perpX = -dy / dist;
                const perpY = dx / dist;
                const dir = Math.sin(this._animClock * 3.5 + e.wavePhase) >= 0 ? 1 : -1;
                const approach = dist > 230 ? 0.65 : dist < 130 ? -0.55 : 0;
                e.x += ((dx / dist) * approach + perpX * dir * 0.85) * e.speed * dt;
                e.y += ((dy / dist) * approach + perpY * dir * 0.85) * e.speed * dt;
            } else if (e.kind === 'boss_thunder_lion') {
                if (e.leapTimer > 0) {
                    e.leapTimer -= dt;
                    e.x += e.leapVx * dt;
                    e.y += e.leapVy * dt;
                    if (e.leapTimer <= 0) {
                        this._booms.push({ x: e.x, y: e.y, radius: 100, life: 0.32 });
                        for (let k = 0; k < 4; k++) {
                            const ba = (k * Math.PI) / 2;
                            this._bullets.push({
                                fromPlayer: false,
                                x: e.x,
                                y: e.y,
                                vx: Math.cos(ba) * 285,
                                vy: Math.sin(ba) * 285,
                                dmg: 13,
                                radius: 8,
                                life: 2.2,
                                color: new Color(255, 224, 92, 255),
                                bouncesLeft: 1,
                            });
                        }
                        this._thunderZones.push({ x: this._px, y: this._py, r: 52, warnTimer: 0.95, strikeTimer: 0.38 });
                    }
                } else {
                    e.x += (dx / dist) * e.speed * dt;
                    e.y += (dy / dist) * e.speed * dt;
                    e.specialCd -= dt;
                    if (e.specialCd <= 0) {
                        e.leapTimer = 0.48;
                        e.leapVx = (dx / dist) * 350;
                        e.leapVy = (dy / dist) * 350;
                        this._copperBoostTimer = 4.5;
                        e.specialCd = 3.8;
                    }
                }
            } else if (e.kind === 'rift_walker') {
                e.specialCd -= dt;
                if (e.specialCd <= 0) {
                    const ang = Math.random() * Math.PI * 2;
                    e.x = Math.max(-ARENA_HALF_W + 50, Math.min(ARENA_HALF_W - 50, this._px + Math.cos(ang) * 165));
                    e.y = Math.max(-ARENA_HALF_H + 50, Math.min(ARENA_HALF_H - 50, this._py + Math.sin(ang) * 135));
                    for (let i = 0; i < 6; i++) {
                        const ba = (i * Math.PI * 2) / 6;
                        this._bullets.push({
                            fromPlayer: false,
                            x: e.x,
                            y: e.y,
                            vx: Math.cos(ba) * 215,
                            vy: Math.sin(ba) * 215,
                            dmg: 12,
                            radius: 7,
                            life: 2.2,
                            color: new Color(102, 246, 214, 255),
                        });
                    }
                    e.specialCd = 3.8;
                } else if (dist > 150) {
                    e.x += (dx / dist) * e.speed * dt;
                    e.y += (dy / dist) * e.speed * dt;
                }
            } else if (e.kind === 'boss_rift_overlord') {
                if (!e.elementForm) {
                    e.elementForm = 'fire';
                    e.formTimer = 6.0;
                }
                e.formTimer = (e.formTimer ?? 6.0) - dt;
                if (e.formTimer <= 0) {
                    e.elementForm = e.elementForm === 'fire' ? 'frost' : e.elementForm === 'frost' ? 'thunder' : 'fire';
                    e.formTimer = e.phase2 ? 4.8 : 6.2;
                }
                if (dist > 160) {
                    e.x += (dx / dist) * e.speed * dt;
                    e.y += (dy / dist) * e.speed * dt;
                }
            } else if (e.kind === 'miasma_flower' || e.kind === 'boss_ink_lotus') {
                // 固定植物型，原地微调
            } else if (!e.shellActive) {
                const keepDist = e.kind === 'ink_spirit' || e.kind === 'ice_prism' || e.kind === 'thunder_drummer' || e.kind === 'star_puppet' || e.kind === 'boss_twin_ranged';
                if (!keepDist || dist > 195) {
                    e.x += (dx / dist) * e.speed * dt;
                    e.y += (dy / dist) * e.speed * dt;
                }
            }

            e.x = Math.max(-ARENA_HALF_W + e.radius, Math.min(ARENA_HALF_W - e.radius, e.x));
            e.y = Math.max(-ARENA_HALF_H + e.radius, Math.min(ARENA_HALF_H - e.radius, e.y));

            if (dist < e.radius + 18) {
                this._hurtPlayer(st.contactDmg, false);
                if (e.kind === 'mana_eater' && !this._blessings.has('mana_spring')) {
                    this._mana = Math.max(0, this._mana - 14);
                    e.hp = Math.min(e.maxHp, e.hp + 10);
                }
            }

            // 攻击与首领技能
            e.fireCd -= dt;
            if (e.fireCd <= 0) {
                const aim = Math.atan2(dy, dx);
                if (e.kind === 'boss_giant_bamboo') {
                    // 1-5 巨竹妖王：3 道扩散冲击波 + 周期召唤小竹精
                    for (const off of [-0.32, 0, 0.32]) {
                        this._bullets.push({
                            fromPlayer: false,
                            x: e.x,
                            y: e.y,
                            vx: Math.cos(aim + off) * 235,
                            vy: Math.sin(aim + off) * 235,
                            dmg: 11,
                            radius: 9,
                            life: 2.6,
                            color: new Color(156, 232, 118, 255),
                        });
                    }
                    e.fireCd = 1.65;
                    e.specialCd -= 1.65;
                    if (e.specialCd <= 0 && this._enemies.length < 5) {
                        toSpawn.push({ kind: 'bamboo_imp', x: e.x - 40, y: e.y + 60 }, { kind: 'bamboo_imp', x: e.x - 40, y: e.y - 60 });
                        e.specialCd = 6.5;
                    }
                } else if (e.kind === 'boss_stone_spirit') {
                    // 1-10 古墟石灵：一阶段 8 向弹环；二阶段 10 向弹环 + 四向旋转激光
                    const cnt = e.phase2 ? 10 : 8;
                    for (let i = 0; i < cnt; i++) {
                        const a = aim + (i * Math.PI * 2) / cnt;
                        this._bullets.push({
                            fromPlayer: false,
                            x: e.x,
                            y: e.y,
                            vx: Math.cos(a) * (e.phase2 ? 225 : 205),
                            vy: Math.sin(a) * (e.phase2 ? 225 : 205),
                            dmg: 12,
                            radius: 8,
                            life: 3.0,
                            color: new Color(238, 120, 178, 255),
                        });
                    }
                    e.fireCd = e.phase2 ? 1.45 : 1.7;
                    if (e.phase2) {
                        e.specialCd -= 1.45;
                        if (e.specialCd <= 0) {
                            this._bossLasers.push({ x: e.x, y: e.y, angle: aim, warnTimer: 0.85, activeTimer: 1.4 });
                            e.specialCd = 5.2;
                        }
                    }
                } else if (e.kind === 'boss_magma_furnace') {
                    // 2-5 赤焰炉灵：6 向旋转喷火 + 点亮四角火盆火圈
                    for (let i = 0; i < 6; i++) {
                        const a = this._animClock * 1.6 + (i * Math.PI * 2) / 6;
                        this._bullets.push({
                            fromPlayer: false,
                            x: e.x,
                            y: e.y,
                            vx: Math.cos(a) * 215,
                            vy: Math.sin(a) * 215,
                            dmg: 12,
                            radius: 8,
                            life: 2.8,
                            color: new Color(255, 128, 62, 255),
                        });
                    }
                    e.fireCd = 1.25;
                    e.specialCd -= 1.25;
                    if (e.specialCd <= 0) {
                        const corners: [number, number][] = [[-260, 140], [-260, -140], [220, 140], [220, -140]];
                        for (const [cx, cy] of corners) {
                            this._magmaRings.push({ x: cx, y: cy, r: 68, warnTimer: 1.1, eruptTimer: 0.55 });
                        }
                        e.specialCd = 5.2;
                    }
                } else if (e.kind === 'ink_spirit') {
                    const offsets = e.elite ? [-0.24, 0, 0.24] : [0];
                    for (const off of offsets) {
                        this._bullets.push({
                            fromPlayer: false,
                            x: e.x,
                            y: e.y,
                            vx: Math.cos(aim + off) * 230,
                            vy: Math.sin(aim + off) * 230,
                            dmg: 9,
                            radius: 7,
                            life: 2.6,
                            color: new Color(196, 118, 232, 255),
                        });
                    }
                    e.fireCd = 1.65;
                } else if (e.kind === 'boss_frost_crane') {
                    // 3-5 玄冰鹤使：瞬移至四角 + 5 羽扇形冰锥 + 落点减速冰环
                    for (const off of [-0.42, -0.21, 0, 0.21, 0.42]) {
                        this._bullets.push({
                            fromPlayer: false,
                            x: e.x,
                            y: e.y,
                            vx: Math.cos(aim + off) * 265,
                            vy: Math.sin(aim + off) * 265,
                            dmg: 12,
                            radius: 7,
                            life: 2.4,
                            color: new Color(134, 232, 255, 255),
                        });
                    }
                    e.fireCd = 1.45;
                    e.specialCd -= 1.45;
                    if (e.specialCd <= 0) {
                        const corners: [number, number][] = [[-290, 145], [-290, -145], [290, 145], [290, -145]];
                        const pick = corners[Math.floor(Math.random() * corners.length)];
                        e.x = pick[0];
                        e.y = pick[1];
                        this._frostPools.push({ x: e.x, y: e.y, r: 78, life: 5.0 });
                        e.specialCd = 3.8;
                    }
                } else if (e.kind === 'boss_frost_turtle') {
                    // 3-10 寒玉玄龟：召唤冰墙护体；二阶段全屏预警落冰柱
                    const cnt = e.phase2 ? 10 : 6;
                    for (let i = 0; i < cnt; i++) {
                        const a = aim + (i * Math.PI * 2) / cnt;
                        this._bullets.push({
                            fromPlayer: false,
                            x: e.x,
                            y: e.y,
                            vx: Math.cos(a) * 215,
                            vy: Math.sin(a) * 215,
                            dmg: 13,
                            radius: 8,
                            life: 2.8,
                            color: new Color(122, 218, 255, 255),
                        });
                    }
                    e.fireCd = e.phase2 ? 1.4 : 1.65;
                    e.specialCd -= e.fireCd;
                    if (e.specialCd <= 0) {
                        if (this._iceWalls.length < 2) {
                            this._iceWalls.push({
                                id: this._nextIceWallId++,
                                x: Math.max(-ARENA_HALF_W + 90, e.x - 105),
                                y: Math.max(-ARENA_HALF_H + 60, Math.min(ARENA_HALF_H - 60, e.y + (Math.random() > 0.5 ? 70 : -70))),
                                hp: 90,
                                maxHp: 90,
                                rx: 28,
                                ry: 34,
                            });
                        }
                        if (e.phase2) {
                            for (let k = 0; k < 5; k++) {
                                this._icicles.push({
                                    x: (Math.random() - 0.5) * (ARENA_HALF_W * 1.65),
                                    y: (Math.random() - 0.5) * (ARENA_HALF_H * 1.5),
                                    r: 52,
                                    warnTimer: 1.15,
                                    impactTimer: 0.45,
                                });
                            }
                        }
                        e.specialCd = e.phase2 ? 4.2 : 5.4;
                    }
                } else if (e.kind === 'boss_ink_lotus') {
                    // 4-5 百目墨莲：8 向孢子环 + 四象限触手交叉毒箭
                    for (let i = 0; i < 8; i++) {
                        const a = this._animClock * 1.1 + (i * Math.PI * 2) / 8;
                        this._bullets.push({
                            fromPlayer: false,
                            x: e.x,
                            y: e.y,
                            vx: Math.cos(a) * 205,
                            vy: Math.sin(a) * 205,
                            dmg: 12,
                            radius: 7,
                            life: 2.8,
                            color: new Color(192, 122, 255, 255),
                        });
                    }
                    e.fireCd = 1.45;
                    e.specialCd -= 1.45;
                    if (e.specialCd <= 0) {
                        const pts: [number, number][] = [[-320, 170], [-320, -170], [320, 170], [320, -170]];
                        for (const [qx, qy] of pts) {
                            const qa = Math.atan2(this._py - qy, this._px - qx);
                            this._bullets.push({
                                fromPlayer: false,
                                x: qx,
                                y: qy,
                                vx: Math.cos(qa) * 235,
                                vy: Math.sin(qa) * 235,
                                dmg: 12,
                                radius: 8,
                                life: 2.6,
                                color: new Color(132, 232, 152, 255),
                            });
                        }
                        e.specialCd = 3.6;
                    }
                } else if (e.kind === 'boss_ghost_spider') {
                    // 4-10 幽泽鬼面蛛：定身蛛网弹 + 散射毒弹 + 周期熄灭古灯
                    this._bullets.push({
                        fromPlayer: false,
                        x: e.x,
                        y: e.y,
                        vx: Math.cos(aim) * 275,
                        vy: Math.sin(aim) * 275,
                        dmg: 12,
                        radius: 9,
                        life: 2.5,
                        color: new Color(242, 236, 255, 255),
                        rootsPlayer: true,
                    });
                    for (const off of [-0.36, 0.36]) {
                        this._bullets.push({
                            fromPlayer: false,
                            x: e.x,
                            y: e.y,
                            vx: Math.cos(aim + off) * 225,
                            vy: Math.sin(aim + off) * 225,
                            dmg: 12,
                            radius: 7,
                            life: 2.4,
                            color: new Color(178, 118, 248, 255),
                        });
                    }
                    e.fireCd = e.isIllusion ? 2.1 : (e.phase2 ? 1.25 : 1.5);
                    if (!e.isIllusion) {
                        e.specialCd -= e.fireCd;
                        if (e.specialCd <= 0) {
                            const litOne = this._lanterns.find((l) => l.lit);
                            if (litOne) {
                                litOne.lit = false;
                                this._onToast?.('幽泽鬼面蛛扑灭了一盏驱雾古灯！');
                            }
                            e.specialCd = 7.5;
                        }
                    }
                } else if (e.kind === 'ice_prism') {
                    const offsets = e.elite ? [-0.14, 0.14] : [0];
                    for (const off of offsets) {
                        this._bullets.push({
                            fromPlayer: false,
                            x: e.x,
                            y: e.y,
                            vx: Math.cos(aim + off) * 330,
                            vy: Math.sin(aim + off) * 330,
                            dmg: 11,
                            radius: 6,
                            life: 2.2,
                            color: new Color(132, 230, 255, 255),
                        });
                    }
                    e.fireCd = st.fireCd;
                } else if (e.kind === 'thunder_drummer') {
                    this._thunderZones.push({
                        x: Math.max(-ARENA_HALF_W + 45, Math.min(ARENA_HALF_W - 45, this._px + (Math.random() - 0.5) * 40)),
                        y: Math.max(-ARENA_HALF_H + 45, Math.min(ARENA_HALF_H - 45, this._py + (Math.random() - 0.5) * 40)),
                        r: 48,
                        warnTimer: 1.05,
                        strikeTimer: 0.35,
                    });
                    e.fireCd = st.fireCd;
                } else if (e.kind === 'arc_sparrow') {
                    for (const off of [-0.18, 0, 0.18]) {
                        this._bullets.push({
                            fromPlayer: false,
                            x: e.x,
                            y: e.y,
                            vx: Math.cos(aim + off) * 265,
                            vy: Math.sin(aim + off) * 265,
                            dmg: 11,
                            radius: 6,
                            life: 2.3,
                            color: new Color(255, 236, 118, 255),
                            bouncesLeft: this._stageCfg.hasReflectWalls ? 1 : 0,
                        });
                    }
                    e.fireCd = st.fireCd;
                } else if (e.kind === 'bronze_guardian') {
                    this._bullets.push({
                        fromPlayer: false,
                        x: e.x,
                        y: e.y,
                        vx: Math.cos(aim) * 235,
                        vy: Math.sin(aim) * 235,
                        dmg: 13,
                        radius: 8,
                        life: 2.2,
                        color: new Color(246, 198, 92, 255),
                        bouncesLeft: this._stageCfg.hasReflectWalls ? 1 : 0,
                    });
                    e.fireCd = st.fireCd;
                } else if (e.kind === 'boss_thunder_lion') {
                    for (const off of [-0.26, 0, 0.26]) {
                        this._bullets.push({
                            fromPlayer: false,
                            x: e.x,
                            y: e.y,
                            vx: Math.cos(aim + off) * 270,
                            vy: Math.sin(aim + off) * 270,
                            dmg: 13,
                            radius: 8,
                            life: 2.4,
                            color: new Color(255, 224, 96, 255),
                            bouncesLeft: 1,
                        });
                    }
                    e.fireCd = 1.45;
                } else if (e.kind === 'boss_thunder_lord') {
                    const cnt = e.phase2 ? 10 : 8;
                    for (let i = 0; i < cnt; i++) {
                        const a = aim + (i * Math.PI * 2) / cnt;
                        this._bullets.push({
                            fromPlayer: false,
                            x: e.x,
                            y: e.y,
                            vx: Math.cos(a) * 235,
                            vy: Math.sin(a) * 235,
                            dmg: 13,
                            radius: 7,
                            life: 2.5,
                            color: new Color(255, 234, 108, 255),
                            bouncesLeft: 1,
                        });
                    }
                    this._thunderZones.push({
                        x: Math.max(-ARENA_HALF_W + 50, Math.min(ARENA_HALF_W - 50, this._px)),
                        y: Math.max(-ARENA_HALF_H + 50, Math.min(ARENA_HALF_H - 50, this._py)),
                        r: 56,
                        warnTimer: 0.95,
                        strikeTimer: 0.35,
                    });
                    e.fireCd = e.phase2 ? 1.35 : 1.65;
                } else if (e.kind === 'star_puppet') {
                    const allies = this._enemies.filter((a) => a.id !== e.id && a.hp > 0);
                    if (allies.length > 0) {
                        const pick = allies[Math.floor(Math.random() * allies.length)];
                        pick.allyShieldTimer = 3.6;
                    }
                    this._bullets.push({
                        fromPlayer: false,
                        x: e.x,
                        y: e.y,
                        vx: Math.cos(aim) * 230,
                        vy: Math.sin(aim) * 230,
                        dmg: 12,
                        radius: 7,
                        life: 2.4,
                        color: new Color(152, 248, 232, 255),
                    });
                    e.fireCd = st.fireCd;
                } else if (e.kind === 'mana_eater' || e.kind === 'rift_walker') {
                    this._bullets.push({
                        fromPlayer: false,
                        x: e.x,
                        y: e.y,
                        vx: Math.cos(aim) * 245,
                        vy: Math.sin(aim) * 245,
                        dmg: 12,
                        radius: 7,
                        life: 2.3,
                        color: e.kind === 'mana_eater' ? new Color(120, 212, 255, 255) : new Color(108, 246, 214, 255),
                        drainsMana: e.kind === 'mana_eater',
                    });
                    e.fireCd = st.fireCd;
                } else if (e.kind === 'boss_twin_melee') {
                    const spread = e.phase2 ? [-0.36, -0.18, 0, 0.18, 0.36] : [-0.24, 0, 0.24];
                    for (const off of spread) {
                        this._bullets.push({
                            fromPlayer: false,
                            x: e.x,
                            y: e.y,
                            vx: Math.cos(aim + off) * (e.phase2 ? 290 : 250),
                            vy: Math.sin(aim + off) * (e.phase2 ? 290 : 250),
                            dmg: 14,
                            radius: 8,
                            life: 2.2,
                            color: new Color(255, 166, 112, 255),
                        });
                    }
                    e.fireCd = e.phase2 ? 1.15 : 1.55;
                } else if (e.kind === 'boss_twin_ranged') {
                    const cnt = e.phase2 ? 10 : 6;
                    for (let i = 0; i < cnt; i++) {
                        const a = aim + (i * Math.PI * 2) / cnt;
                        this._bullets.push({
                            fromPlayer: false,
                            x: e.x,
                            y: e.y,
                            vx: Math.cos(a) * (e.phase2 ? 245 : 215),
                            vy: Math.sin(a) * (e.phase2 ? 245 : 215),
                            dmg: 13,
                            radius: 7,
                            life: 2.6,
                            color: new Color(114, 248, 224, 255),
                            homing: e.phase2 && i % 3 === 0,
                        });
                    }
                    e.fireCd = e.phase2 ? 1.05 : 1.35;
                } else if (e.kind === 'boss_rift_overlord') {
                    const form = e.elementForm ?? 'fire';
                    if (form === 'fire') {
                        this._magmaRings.push({ x: this._px, y: this._py, r: 58, warnTimer: 0.95, eruptTimer: 0.42 });
                        const cnt = e.phase2 ? 10 : 8;
                        for (let i = 0; i < cnt; i++) {
                            const a = aim + (i * Math.PI * 2) / cnt;
                            this._bullets.push({
                                fromPlayer: false,
                                x: e.x,
                                y: e.y,
                                vx: Math.cos(a) * 235,
                                vy: Math.sin(a) * 235,
                                dmg: 14,
                                radius: 8,
                                life: 2.5,
                                color: new Color(255, 118, 66, 255),
                            });
                        }
                    } else if (form === 'frost') {
                        const spread = e.phase2 ? [-0.4, -0.2, 0, 0.2, 0.4] : [-0.28, -0.14, 0, 0.14, 0.28];
                        for (const off of spread) {
                            this._bullets.push({
                                fromPlayer: false,
                                x: e.x,
                                y: e.y,
                                vx: Math.cos(aim + off) * 310,
                                vy: Math.sin(aim + off) * 310,
                                dmg: 13,
                                radius: 7,
                                life: 2.2,
                                color: new Color(138, 232, 255, 255),
                            });
                        }
                    } else {
                        this._thunderZones.push(
                            { x: this._px, y: this._py, r: 54, warnTimer: 0.9, strikeTimer: 0.35 },
                            { x: this._px + 95, y: this._py - 60, r: 48, warnTimer: 1.05, strikeTimer: 0.35 },
                        );
                        for (let i = 0; i < 6; i++) {
                            const a = aim + (i * Math.PI * 2) / 6;
                            this._bullets.push({
                                fromPlayer: false,
                                x: e.x,
                                y: e.y,
                                vx: Math.cos(a) * 255,
                                vy: Math.sin(a) * 255,
                                dmg: 13,
                                radius: 7,
                                life: 2.3,
                                color: new Color(255, 238, 116, 255),
                            });
                        }
                    }
                    e.fireCd = e.phase2 ? 1.15 : 1.4;
                } else if (e.kind === 'miasma_flower') {
                    this._bullets.push({
                        fromPlayer: false,
                        x: e.x,
                        y: e.y,
                        vx: Math.cos(aim) * 145,
                        vy: Math.sin(aim) * 145,
                        dmg: 11,
                        radius: 8,
                        life: 3.4,
                        color: new Color(198, 128, 255, 255),
                        homing: true,
                    });
                    e.fireCd = st.fireCd;
                } else if (
                    e.kind === 'paper_golem' ||
                    e.kind === 'magma_turtle' ||
                    e.kind === 'fire_taoist' ||
                    e.kind === 'fire_bat' ||
                    e.kind === 'snow_puppet' ||
                    e.kind === 'frost_mirror_guard' ||
                    e.kind === 'venom_frog'
                ) {
                    if (!e.shellActive) {
                        this._bullets.push({
                            fromPlayer: false,
                            x: e.x,
                            y: e.y,
                            vx: Math.cos(aim) * 225,
                            vy: Math.sin(aim) * 225,
                            dmg: 10,
                            radius: 7,
                            life: 2.4,
                            color: e.kind === 'venom_frog'
                                ? new Color(128, 232, 152, 255)
                                : (e.kind === 'snow_puppet' || e.kind === 'frost_mirror_guard')
                                    ? new Color(142, 224, 255, 255)
                                    : e.kind === 'paper_golem'
                                        ? new Color(196, 118, 232, 255)
                                        : new Color(255, 134, 72, 255),
                        });
                    }
                    e.fireCd = st.fireCd;
                }
            }
        }
        for (const sp of toSpawn) this._spawnEnemy(sp.kind, sp.x, sp.y, false);
    }

    private _onStageCleared(): void {
        this._roomCleared = true;
        const app = GameApp.inst;
        if (app?.ready) {
            const prev = app.saveData.dungeon.highestClearedStage ?? 0;
            if (this._stageNum > prev) {
                app.saveData.dungeon.highestClearedStage = this._stageNum;
            }
            if (this._stageNum >= 10 && app.saveData.dungeon.deepestLayer < 1) {
                app.saveData.dungeon.deepestLayer = 1;
            }
            if (this._stageNum >= 20 && app.saveData.dungeon.deepestLayer < 2) {
                app.saveData.dungeon.deepestLayer = 2;
            }
            if (this._stageNum >= 30 && app.saveData.dungeon.deepestLayer < 3) {
                app.saveData.dungeon.deepestLayer = 3;
            }
            if (this._stageNum >= 40 && app.saveData.dungeon.deepestLayer < 4) {
                app.saveData.dungeon.deepestLayer = 4;
            }
            if (this._stageNum >= 50 && app.saveData.dungeon.deepestLayer < 5) {
                app.saveData.dungeon.deepestLayer = 5;
            }
            if (this._stageNum >= 60 && app.saveData.dungeon.deepestLayer < 6) {
                app.saveData.dungeon.deepestLayer = 6;
            }
            this._runClearedCount += 1;
            const prevBest = app.saveData.dungeon.bestStreak ?? 0;
            if (this._runClearedCount > prevBest) {
                app.saveData.dungeon.bestStreak = this._runClearedCount;
            }
            if (this._stageNum >= DUNGEON_TOTAL_STAGES) {
                app.saveData.dungeon.grandCleared = true;
            }
            if (this._stageCfg.subStage === 5) {
                this._unlockAnchor(this._stageNum + 1);
            } else if (this._stageCfg.subStage === 10 && this._stageNum < DUNGEON_IMPLEMENTED_MAX_STAGE) {
                this._unlockAnchor(this._stageNum + 1);
            }
            app.persist('dungeon_stage_clear');
        }

        if (this._stageCfg.roomKind === 'elite_bounty') {
            this._lootGold += 60;
            this._lootIron += 2;
            const bonusSeed = this._stageCfg.chapter >= 3 ? 'sky_bamboo_seed' : 'thunder_potato_seed';
            this._lootSeeds.push(bonusSeed);
            this._doorLbl.string = '石门已开 →';
            this._onToast?.(`精英赏金房肃清！额外获得 +60 金、+2 玄铁矿与稀有灵种！向右前往下一关`);
            return;
        }

        if (this._stageNum >= DUNGEON_IMPLEMENTED_MAX_STAGE) {
            this._lootGold += 280;
            this._lootIron += 5;
            this._lootSeeds.push('sky_bamboo_seed', 'sky_bamboo_seed', 'thunder_potato_seed', 'cloud_bamboo_shoot_seed');
            if (app?.ready && app.saveData.farm.unlockedTier < 3) {
                app.saveData.farm.unlockedTier = 3;
            }
            this._finishRun(true, '斩破古渊裂隙之主，制霸幽墟全部 60 关！已解锁【全境六十关制霸】成就与农田三阶终极灵植厚礼');
            return;
        }

        if (this._stageCfg.roomKind === 'mid_boss') {
            this._hp = Math.min(this._maxHp, this._hp + Math.round(this._maxHp * 0.4));
            this._mana = this._maxMana;
            this._waitingChoice = true;
            this._choiceTitleLbl.string = `击败中途首领「${this._stageCfg.biome.midBossName}」！\n已永久解锁 ${this._stageCfg.chapter}-6 传送锚点并回复 40% 生命`;
            this._choiceContinueLbl.string = `继续深入 ${this._stageCfg.chapter}-6`;
            this._choiceBar.active = true;
            return;
        }

        if (this._stageCfg.roomKind === 'final_boss') {
            this._hp = this._maxHp;
            this._mana = this._maxMana;
            this._waitingChoice = true;
            const nextBiome = DUNGEON_BIOMES[this._stageCfg.chapter];
            this._choiceTitleLbl.string = `大关首领「${this._stageCfg.biome.finalBossName}」已伏诛！\n已永久解锁第 ${nextBiome.chapter} 大关「${nextBiome.name}」传送锚点！`;
            this._choiceContinueLbl.string = `直入 ${nextBiome.chapter}-1 ${nextBiome.name}`;
            this._choiceBar.active = true;
            return;
        }

        this._doorLbl.string = '石门已开 →';
        this._onToast?.(`${this._stageCfg.label} 已肃清！向右走过石门进入下一关`);
    }

    private _renderArena(): void {
        const g = this._arenaGfx;
        const b = this._stageCfg.biome;
        g.clear();

        // 仅在手绘底图未加载时才兜底绘制底色；正常情况下直接使用 6 大生态手绘底图，不叠画丑陋的几何边框与圆圈
        if (!this._hasArenaBg) {
            g.fillColor = new Color(b.floorRgb[0], b.floorRgb[1], b.floorRgb[2], 255);
            g.roundRect(-ARENA_HALF_W, -ARENA_HALF_H, ARENA_HALF_W * 2, ARENA_HALF_H * 2, 18);
            g.fill();
        }

        // 丹砂火蛟二阶段外圈岩浆带
        if (this._lavaRimActive) {
            g.strokeColor = new Color(246, 86, 38, 165);
            g.lineWidth = 54;
            g.roundRect(-ARENA_HALF_W + 27, -ARENA_HALF_H + 27, ARENA_HALF_W * 2 - 54, ARENA_HALF_H * 2 - 54, 14);
            g.stroke();
        }

        // 枯竹刺陷阱（手绘素材动态缩放/变色，仅预警时画细提示圈）
        for (let i = 0; i < this._spikes.length; i++) {
            const sp = this._spikes[i];
            const active = sp.cycle >= 2.9;
            const warn = sp.cycle >= 2.2 && sp.cycle < 2.9;
            const sn = this._spikeNodes[i];
            if (sn) {
                sn.setScale(active ? 1.12 : warn ? 1.04 : 0.92, active ? 1.15 : 0.92, 1);
                const spr = sn.getChildByName('ArtSprite')?.getComponent(Sprite);
                if (spr) {
                    spr.color = active ? new Color(255, 168, 152, 255) : warn ? new Color(255, 232, 156, 255) : new Color(180, 196, 188, 220);
                }
            }
            if (warn || active) {
                g.strokeColor = active ? new Color(255, 118, 86, 210) : new Color(246, 206, 98, 165);
                g.lineWidth = active ? 3 : 2;
                g.circle(sp.x, sp.y, sp.r);
                g.stroke();
            }
        }

        // 第 3 大关：寒玉冰面反光与霜风提示
        if (this._stageCfg.hasIceFloor) {
            g.strokeColor = new Color(172, 234, 255, this._frostWindActiveTimer > 0 ? 115 : 42);
            g.lineWidth = this._frostWindActiveTimer > 0 ? 3 : 1.5;
            for (let ix = -360; ix <= 360; ix += 120) {
                g.moveTo(ix, -ARENA_HALF_H + 14);
                g.lineTo(ix + 35, ARENA_HALF_H - 14);
                g.stroke();
            }
        }

        // 冰雾减速区
        for (const fp of this._frostPools) {
            g.fillColor = new Color(130, 224, 255, 85);
            g.strokeColor = new Color(186, 242, 255, 175);
            g.lineWidth = 2;
            g.circle(fp.x, fp.y, fp.r);
            g.fill();
            g.stroke();
        }

        // 毒沼泥潭
        for (const pp of this._poisonPools) {
            g.fillColor = new Color(98, 178, 92, 118);
            g.strokeColor = new Color(162, 242, 134, 170);
            g.lineWidth = 2;
            g.circle(pp.x, pp.y, pp.r);
            g.fill();
            g.stroke();
        }

        // 地面火焰路径
        for (const fp of this._firePools) {
            g.fillColor = new Color(246, 102, 42, 145);
            g.circle(fp.x, fp.y, fp.r);
            g.fill();
        }

        // 寒玉玄龟可破坏冰墙（手绘冰墙精灵同步）
        while (this._iceWallNodes.length < this._iceWalls.length) {
            const iwn = this._uiNode('IceWall', this._propLayer);
            ArtLoader.applySprite(iwn, 'dng_ice_wall', 68, 68);
            this._iceWallNodes.push(iwn);
        }
        for (let i = 0; i < this._iceWallNodes.length; i++) {
            const iwn = this._iceWallNodes[i];
            const iw = this._iceWalls[i];
            if (iw) {
                iwn.active = true;
                iwn.setPosition(iw.x, iw.y + 4, 0);
            } else {
                iwn.active = false;
            }
        }

        // 寒玉玄龟二阶段全屏预警落冰柱
        for (const ic of this._icicles) {
            if (ic.warnTimer > 0) {
                g.strokeColor = new Color(156, 236, 255, 220);
                g.lineWidth = 3;
                g.circle(ic.x, ic.y, ic.r);
                g.stroke();
                const prog = 1 - Math.max(0, ic.warnTimer / 1.15);
                g.fillColor = new Color(122, 212, 255, 78);
                g.circle(ic.x, ic.y, ic.r * prog);
                g.fill();
            } else {
                g.fillColor = new Color(196, 246, 255, 215);
                g.circle(ic.x, ic.y, ic.r);
                g.fill();
            }
        }

        // 第 4 大关：驱雾古灯（手绘古灯素材）
        for (let i = 0; i < this._lanterns.length; i++) {
            const lt = this._lanterns[i];
            const ln = this._lanternNodes[i];
            if (ln) {
                const spr = ln.getChildByName('ArtSprite')?.getComponent(Sprite);
                if (spr) spr.color = lt.lit ? new Color(255, 244, 206, 255) : new Color(138, 128, 156, 225);
            }
            if (lt.lit) {
                g.fillColor = new Color(255, 214, 118, 52);
                g.circle(lt.x, lt.y, 58);
                g.fill();
            }
        }

        // 第 5 大关：导电铜雷柱与周期放电线
        if (this._copperPillars.length > 0) {
            const period = this._copperBoostTimer > 0 ? 2.6 : 4.2;
            const warnStart = period - 1.65;
            const activeStart = period - 0.9;
            if (this._copperPillars.length >= 2 && this._copperArcCycle >= warnStart) {
                const isZap = this._copperArcCycle >= activeStart;
                g.strokeColor = isZap ? new Color(255, 240, 118, 245) : new Color(255, 212, 92, 130);
                g.lineWidth = isZap ? 6 : 2.5;
                for (let i = 0; i < this._copperPillars.length; i++) {
                    const a = this._copperPillars[i];
                    const b = this._copperPillars[(i + 1) % this._copperPillars.length];
                    if (this._copperPillars.length === 2 && i === 1) break;
                    g.moveTo(a.x, a.y);
                    g.lineTo(b.x, b.y);
                    g.stroke();
                }
            }
            for (let i = 0; i < this._copperPillars.length; i++) {
                const cn = this._copperNodes[i];
                if (cn) {
                    const spr = cn.getChildByName('ArtSprite')?.getComponent(Sprite);
                    if (spr) {
                        const energized = this._copperArcCycle >= warnStart;
                        spr.color = energized ? new Color(255, 246, 186, 255) : new Color(224, 214, 198, 255);
                    }
                }
            }
        }
        // 落雷预警圈
        for (const tz of this._thunderZones) {
            if (tz.warnTimer > 0) {
                g.strokeColor = new Color(255, 232, 108, 225);
                g.lineWidth = 3;
                g.circle(tz.x, tz.y, tz.r);
                g.stroke();
                g.fillColor = new Color(255, 228, 102, 55);
                g.circle(tz.x, tz.y, tz.r * (1 - Math.min(1, tz.warnTimer / 1.05)));
                g.fill();
            } else {
                g.fillColor = new Color(255, 248, 168, 190);
                g.circle(tz.x, tz.y, tz.r);
                g.fill();
            }
        }
        // 九霄雷公傀避雷针与电网
        if (this._lightningRods.length >= 2) {
            g.strokeColor = new Color(255, 236, 116, 235);
            g.lineWidth = 5;
            for (let i = 0; i < this._lightningRods.length; i++) {
                const a = this._lightningRods[i];
                const b = this._lightningRods[(i + 1) % this._lightningRods.length];
                if (this._lightningRods.length === 2 && i === 1) break;
                g.moveTo(a.x, a.y);
                g.lineTo(b.x, b.y);
                g.stroke();
            }
        }
        for (const rod of this._lightningRods) {
            g.fillColor = new Color(242, 198, 72, 245);
            g.strokeColor = new Color(255, 250, 196, 255);
            g.lineWidth = 3;
            g.circle(rod.x, rod.y, rod.r);
            g.fill();
            g.stroke();
            const rr = Math.max(0, rod.hp / rod.maxHp);
            g.fillColor = new Color(26, 26, 26, 220);
            g.rect(rod.x - 22, rod.y + rod.r + 6, 44, 5);
            g.fill();
            g.fillColor = new Color(255, 228, 92, 255);
            g.rect(rod.x - 22, rod.y + rod.r + 6, 44 * rr, 5);
            g.fill();
        }
        // 第 6 大关：时空裂隙旋涡（手绘旋涡缓慢旋转）
        for (let i = 0; i < this._riftVortices.length; i++) {
            const rv = this._riftVortices[i];
            const rn = this._riftNodes[i];
            if (rn) {
                rn.angle = (this._animClock * 42 + i * 90) % 360;
                const sc = 0.94 + Math.sin(rv.phase) * 0.08;
                rn.setScale(sc, sc, 1);
            }
        }
        // 第 6 大关：旋转灵气封阵
        if (this._stageCfg.hasSealRing && !this._roomCleared) {
            g.strokeColor = new Color(96, 244, 208, 175);
            g.lineWidth = 8;
            for (let k = 0; k < 2; k++) {
                const a = this._sealAngle + k * Math.PI;
                g.moveTo(Math.cos(a) * 45, Math.sin(a) * 45);
                g.lineTo(Math.cos(a) * 390, Math.sin(a) * 390);
                g.stroke();
            }
        }
        // 古渊裂隙之主核心法球
        for (const orb of this._riftOrbs) {
            g.fillColor = new Color(104, 252, 218, 220);
            g.strokeColor = new Color(255, 252, 224, 255);
            g.lineWidth = 3;
            g.circle(orb.x, orb.y, orb.r);
            g.fill();
            g.stroke();
            const or = Math.max(0, orb.hp / orb.maxHp);
            g.fillColor = new Color(22, 28, 28, 220);
            g.rect(orb.x - 20, orb.y + orb.r + 6, 40, 5);
            g.fill();
            g.fillColor = new Color(114, 252, 218, 255);
            g.rect(orb.x - 20, orb.y + orb.r + 6, 40 * or, 5);
            g.fill();
        }

        // 周期熔岩火圈
        for (const mr of this._magmaRings) {
            if (mr.warnTimer > 0) {
                g.strokeColor = new Color(255, 194, 88, 220);
                g.lineWidth = 3;
                g.circle(mr.x, mr.y, mr.r);
                g.stroke();
                const prog = 1 - Math.max(0, mr.warnTimer / 1.15);
                g.fillColor = new Color(255, 134, 52, 85);
                g.circle(mr.x, mr.y, mr.r * prog);
                g.fill();
            } else {
                g.fillColor = new Color(252, 84, 36, 190);
                g.circle(mr.x, mr.y, mr.r);
                g.fill();
            }
        }

        // 爆裂火药陶罐（手绘陶罐精灵）
        for (let i = 0; i < this._jars.length; i++) {
            const jn = this._jarNodes[i];
            if (jn) jn.active = !this._jars[i].exploded;
        }

        // 机关宝箱（手绘闭合/开启古玉宝箱切换）
        if (this._chest && this._chestNode) {
            if (this._chest.opened && !this._chestOpenedRendered) {
                this._chestOpenedRendered = true;
                ArtLoader.applySprite(this._chestNode, 'dng_chest_open', 68, 68);
            }
        }

        // 爆炸圈
        for (const bm of this._booms) {
            g.fillColor = new Color(246, 132, 48, 135);
            g.circle(bm.x, bm.y, bm.radius);
            g.fill();
        }

        // 东侧石门手绘青玉八卦光环
        if (this._doorGlowNode) {
            const showGlow = this._roomCleared && !this._waitingChoice && this._stageNum < DUNGEON_IMPLEMENTED_MAX_STAGE;
            this._doorGlowNode.active = showGlow;
            if (showGlow) {
                this._doorGlowNode.angle = (-this._animClock * 26) % 360;
                const pulse = 0.96 + Math.sin(this._animClock * 3.2) * 0.06;
                this._doorGlowNode.setScale(pulse, pulse, 1);
            }
        }

        // 穿云笋炮台
        const activeTurrets = new Set<number>();
        for (const t of this._turrets) {
            activeTurrets.add(t.id);
            let tn = this._turretSprites.get(t.id);
            if (!tn) {
                tn = this._uiNode(`Turret_${t.id}`, this._entityLayer);
                ArtLoader.applySprite(tn, 'def_cloud_shoot', 34, 52);
                this._turretSprites.set(t.id, tn);
            }
            tn.setPosition(t.x, t.y + 8, 0);
        }
        for (const [id, node] of Array.from(this._turretSprites.entries())) {
            if (!activeTurrets.has(id)) {
                node.destroy();
                this._turretSprites.delete(id);
            }
        }

        // 首领四向激光
        for (const bl of this._bossLasers) {
            for (let k = 0; k < 4; k++) {
                const a = bl.angle + (k * Math.PI) / 2;
                const x2 = bl.x + Math.cos(a) * 620;
                const y2 = bl.y + Math.sin(a) * 620;
                if (bl.warnTimer > 0) {
                    g.strokeColor = new Color(255, 198, 92, 160);
                    g.lineWidth = 4;
                } else {
                    g.strokeColor = new Color(252, 92, 148, 235);
                    g.lineWidth = 14;
                }
                g.moveTo(bl.x, bl.y);
                g.lineTo(x2, y2);
                g.stroke();
            }
        }

        // 玩家激光束
        for (const l of this._lasers) {
            g.strokeColor = new Color(110, 242, 232, 235);
            g.lineWidth = 14;
            g.moveTo(l.x1, l.y1);
            g.lineTo(l.x2, l.y2);
            g.stroke();
            g.strokeColor = new Color(255, 248, 200, 255);
            g.lineWidth = 5;
            g.moveTo(l.x1, l.y1);
            g.lineTo(l.x2, l.y2);
            g.stroke();
        }

        // 近战剑气弧
        for (const s of this._slashes) {
            g.fillColor = new Color(160, 240, 212, 115);
            g.circle(s.x + Math.cos(s.angle) * 32, s.y + Math.sin(s.angle) * 32, s.radius * 0.72);
            g.fill();
        }

        // 怪物同步 + 顶部首领大血条
        const activeEnemies = new Set<number>();
        let activeBoss: Enemy | null = null;
        for (const e of this._enemies) {
            if (e.isBoss) activeBoss = e;
            activeEnemies.add(e.id);
            const st = ENEMY_STATS[e.kind];
            let en = this._enemySprites.get(e.id);
            if (!en) {
                en = this._uiNode(`DngEnemy_${e.id}`, this._entityLayer);
                const scale = e.elite ? 1.18 : 1.0;
                ArtLoader.applySprite(en, `${st.spritePrefix}_0`, Math.round(st.spriteW * scale), Math.round(st.spriteH * scale));
                this._enemySprites.set(e.id, en);
            }
            const frames = this._mobAnimFrames[st.spritePrefix];
            const fIdx = Math.floor((this._animClock + e.id * 0.19) / st.frameSec) % 4;
            const sf = frames?.[fIdx];
            const esp = en.getChildByName('ArtSprite')?.getComponent(Sprite);
            if (esp) {
                if (sf && esp.spriteFrame !== sf) esp.spriteFrame = sf;
                const alpha = e.burrowTimer > 0 ? 75 : e.stealthTimer > 0 ? 45 : e.isIllusion ? 175 : 255;
                if (st.tintRgb) {
                    esp.color = new Color(st.tintRgb[0], st.tintRgb[1], st.tintRgb[2], alpha);
                } else {
                    esp.color = new Color(255, 255, 255, alpha);
                }
            }
            const bob = Math.abs(Math.sin(this._animClock * 6.5 + e.id)) * 2.5;
            en.setPosition(e.x, e.y + 8 + bob, 0);
            en.setScale(this._px < e.x ? -1 : 1, 1, 1);

            g.fillColor = new Color(14, 22, 20, 95);
            g.ellipse(e.x, e.y - e.radius * 0.5, e.radius * 0.9, 7);
            g.fill();

            if (e.shellActive || (e.allyShieldTimer ?? 0) > 0) {
                g.strokeColor = (e.allyShieldTimer ?? 0) > 0 ? new Color(142, 248, 232, 240) : new Color(255, 184, 72, 240);
                g.lineWidth = 4;
                g.circle(e.x, e.y + 6, e.radius + 9);
                g.stroke();
            }
            if ((e.stunTimer ?? 0) > 0) {
                g.strokeColor = new Color(255, 246, 134, 235);
                g.lineWidth = 3;
                g.circle(e.x, e.y + e.radius + 10, 10);
                g.stroke();
            }
            if (e.burrowTimer > 0) {
                g.strokeColor = new Color(255, 118, 56, 220);
                g.lineWidth = 3;
                g.circle(e.x, e.y, e.radius + 14);
                g.stroke();
            }
            if (e.hitFlash > 0) {
                g.fillColor = new Color(255, 255, 255, 130);
                g.circle(e.x, e.y + 6, e.radius + 6);
                g.fill();
            }

            if (!e.isBoss) {
                const bw = e.radius * 2;
                const ratio = Math.max(0, e.hp / e.maxHp);
                g.fillColor = new Color(28, 32, 30, 220);
                g.rect(e.x - bw / 2, e.y + e.radius + 14, bw, 6);
                g.fill();
                g.fillColor = e.elite ? new Color(246, 186, 62, 255) : new Color(224, 86, 66, 255);
                g.rect(e.x - bw / 2, e.y + e.radius + 14, bw * ratio, 6);
                g.fill();
            }
        }
        for (const [id, node] of Array.from(this._enemySprites.entries())) {
            if (!activeEnemies.has(id)) {
                node.destroy();
                this._enemySprites.delete(id);
            }
        }

        // 首领大血条渲染
        if (activeBoss) {
            this._bossBarNode.active = true;
            const formTag = activeBoss.elementForm
                ? (activeBoss.elementForm === 'fire' ? ' [烈焰形态]' : activeBoss.elementForm === 'frost' ? ' [寒冰形态]' : ' [九霄雷形态]')
                : '';
            this._bossNameLbl.string = `${activeBoss.name}${formTag}${activeBoss.phase2 ? ' · 二阶段狂暴' : ''} (${Math.ceil(activeBoss.hp)}/${activeBoss.maxHp})`;
            const bg = this._bossBarGfx;
            bg.clear();
            const bw = 420;
            bg.fillColor = new Color(26, 22, 22, 225);
            bg.roundRect(-bw / 2, -6, bw, 12, 6);
            bg.fill();
            const ratio = Math.max(0, activeBoss.hp / activeBoss.maxHp);
            bg.fillColor = activeBoss.phase2 ? new Color(255, 92, 54, 255) : new Color(236, 146, 66, 255);
            bg.roundRect(-bw / 2, -6, bw * ratio, 12, 6);
            bg.fill();
        } else {
            this._bossBarNode.active = false;
        }

        // 子弹
        for (const bl of this._bullets) {
            g.fillColor = bl.color;
            g.circle(bl.x, bl.y, bl.radius);
            g.fill();
        }

        // 主角同步
        g.fillColor = new Color(14, 22, 20, 100);
        g.ellipse(this._px, this._py - 18, 16, 6);
        g.fill();
        // 九霄引雷特效
        for (const ln of this._lightnings) {
            g.strokeColor = new Color(255, 244, 152, 245);
            g.lineWidth = 5;
            g.moveTo(ln.x - 8, ln.y + 160);
            g.lineTo(ln.x + 10, ln.y + 75);
            g.lineTo(ln.x - 6, ln.y + 30);
            g.lineTo(ln.x, ln.y);
            g.stroke();
        }

        // 第 4 大关：暗紫瘴雾视野遮罩（点亮 2 盏古灯后散去）
        if (this._stageCfg.hasMistFog) {
            const unlit = this._lanterns.filter((l) => !l.lit).length;
            if (unlit > 0) {
                g.fillColor = new Color(20, 12, 34, unlit === 2 ? 128 : 68);
                g.rect(-ARENA_HALF_W, -ARENA_HALF_H, ARENA_HALF_W * 2, ARENA_HALF_H * 2);
                g.fill();
            }
        }

        if (this._rootTimer > 0) {
            g.strokeColor = new Color(238, 232, 255, 235);
            g.lineWidth = 3;
            g.circle(this._px, this._py - 6, 24);
            g.stroke();
        }
        const pSp = this._playerSpriteNode.getChildByName('ArtSprite')?.getComponent(Sprite);
        if (pSp) {
            pSp.color = this._invulnTimer > 0
                ? new Color(196, 255, 242, Math.sin(this._animClock * 28) > 0 ? 255 : 165)
                : new Color(255, 255, 255, 255);
        }
        const targetSf = this._pMoving || this._dodgeTimer > 0
            ? (this._pWalkFrames[this._pDir][this._pAnimIdx] ?? this._pIdleFrames[this._pDir])
            : (this._pIdleFrames[this._pDir] ?? this._pWalkFrames[this._pDir][1]);
        if (pSp && targetSf && pSp.spriteFrame !== targetSf) {
            pSp.spriteFrame = targetSf;
        }
        const pBob = this._pMoving ? Math.abs(Math.sin(this._animClock * 10)) * 2.5 : 0;
        const pBreathe = this._pMoving ? 0 : Math.sin(this._animClock * 2.6) * 0.022;
        this._playerSpriteNode.setPosition(this._px, this._py + 10 + pBob, 0);
        this._playerSpriteNode.setScale(this._pFacingX, 1 + pBreathe, 1);
    }
}
