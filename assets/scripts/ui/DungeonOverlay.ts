/**
 * 《异界小农场 2.0》元气骑士风地牢探险 · 全面精修版
 * 1. 独立手绘武器精灵（6把国风武器PNG）+ 绕身旋转瞄准 + 近战挥砍摆幅 / 远程后坐力回弹
 * 2. 三态战争迷雾小地图（未发现隐藏 / 邻房暗灰? / 已清实心✓ / 当前白框脉冲）+ 门口状态标牌
 * 3. 丝滑元气骑士操控：左右朝向即时响应、PC鼠标精准瞄准+左键攻击+右键翻滚（自动无缝切回最近锁敌）、翻滚输入缓冲、石柱圆角滑行
 * 4. 秘境专属铁匠铺（铁匠+炭火炉+铁砧）与古木箱美术，彻底告别铜柱与白菜箱
 * 5. 6 大怪物 AI 原型（rush突进 / danmaku弹幕 / shield举盾砸地 / trail留痕火毒 / blink潜行背刺 / summoner套盾唤符）+ Boss 3招轮换与半血狂暴
 */

import {
    _decorator,
    Color,
    Component,
    EventKeyboard,
    EventMouse,
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
    UIOpacity, UITransform,
    Vec2,
} from 'cc';
import { GameApp } from '../app/GameApp';
import { ArtLoader } from '../core/ArtLoader';
import { AudioManager } from '../core/AudioManager';
import { MonsterRigView, PlayerRigView } from '../core/RigAnimator';
import {
    DUNGEON_BIOMES,
    DUNGEON_TOTAL_STAGES,
    ENEMY_STATS,
    type EnemyArchetype,
    type EnemyKind,
    type StageConfig,
    calcStageHpMult,
    getStageConfig,
} from '../gameplay/dungeon/DungeonConfig';
import {
    CORRIDOR_W,
    type Dir4,
    type DungeonFloorMap,
    type FloorCorridor,
    type FloorRoomData,
    type FloorRoomType,
    type RoomMechanic,
    OPPOSITE_DIR,
    type ShopOffer,
    type WaveSpawnEntry,
    generateDungeonFloor,
} from '../gameplay/dungeon/DungeonFloorGen';
import {
    DUNGEON_WEAPONS,
    RARITY_COLORS,
    STARTER_WEAPON_LIST,
    type WeaponId,
    type WeaponInstance,
    type WeaponRarity,
    getWeaponCrit,
    getWeaponDamage,
    getWeaponDef,
    getWeaponDisplayName,
    rollWeaponDrop,
} from '../gameplay/dungeon/DungeonWeapons';

const { ccclass } = _decorator;

const SCREEN_W = 1280;
const SCREEN_H = 720;
const ROOM_HALF_W = 515;
const ROOM_HALF_H = 262;
const DOOR_HALF_SPAN = 58;
const PLAYER_RADIUS = 17;

const BIOME_BG_KEY: Record<string, string> = {
    bamboo_ruins: 'bg_dungeon_bamboo',
    magma_cavern: 'bg_dungeon_magma',
    frost_palace: 'bg_dungeon_frost',
    mist_marsh: 'bg_dungeon_mist',
    thunder_pagoda: 'bg_dungeon_thunder',
    rift_altar: 'bg_dungeon_rift',
};

const BIOME_TERRAIN_ART: Record<string, { floorTile: string; pitH: string; pitV: string; wallH: string; wallV: string; pillar: string; voidBg: Color }> = {
    bamboo_ruins: { floorTile: 'tile_floor_bamboo', pitH: 'dng_pit_pool', pitV: 'dng_pit_pool_v', wallH: 'dng_stone_wall_h', wallV: 'dng_stone_wall_v', pillar: 'dng_pillar', voidBg: new Color(10, 20, 18, 255) },
    magma_cavern: { floorTile: 'tile_floor_magma', pitH: 'dng_pit_magma', pitV: 'dng_pit_magma_v', wallH: 'dng_wall_magma_h', wallV: 'dng_wall_magma_v', pillar: 'dng_pillar_magma', voidBg: new Color(22, 10, 8, 255) },
    frost_palace: { floorTile: 'tile_floor_frost', pitH: 'dng_pit_frost', pitV: 'dng_pit_frost_v', wallH: 'dng_wall_frost_h', wallV: 'dng_wall_frost_v', pillar: 'dng_ice_wall', voidBg: new Color(8, 18, 28, 255) },
    mist_marsh: { floorTile: 'tile_floor_mist', pitH: 'dng_pit_mist', pitV: 'dng_pit_mist_v', wallH: 'dng_wall_mist_h', wallV: 'dng_wall_mist_v', pillar: 'dng_pillar', voidBg: new Color(14, 10, 22, 255) },
    thunder_pagoda: { floorTile: 'tile_floor_thunder', pitH: 'dng_pit_thunder', pitV: 'dng_pit_thunder_v', wallH: 'dng_wall_thunder_h', wallV: 'dng_wall_thunder_v', pillar: 'dng_copper_pillar', voidBg: new Color(20, 16, 10, 255) },
    rift_altar: { floorTile: 'tile_floor_rift', pitH: 'dng_pit_rift', pitV: 'dng_pit_rift_v', wallH: 'dng_wall_rift_h', wallV: 'dng_wall_rift_v', pillar: 'dng_prop_star_obelisk', voidBg: new Color(8, 14, 22, 255) },
};

const ROOM_TYPE_LABEL: Record<FloorRoomType, string> = {
    start: '起点',
    combat: '战斗房',
    treasure: '宝箱房',
    altar: '神像房',
    shop: '铁匠铺',
    fountain: '许愿池',
    reforge: '重铸炉',
    boss: '首领房',
    portal: '传送门',
};

interface ActiveEnemy {
    id: number;
    kind: EnemyKind;
    archetype: EnemyArchetype;
    name: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    hp: number;
    maxHp: number;
    shieldHp: number;
    speed: number;
    radius: number;
    isBoss: boolean;
    isElite: boolean;
    skillToggle: number;
    atkTimer: number;
    windupTimer: number;
    windupKind: 'none' | 'rush' | 'danmaku' | 'slam' | 'blink' | 'sniper' | 'boss_ring' | 'boss_slam';
    windupAimAngle: number;
    rushTimer: number;
    stunTimer: number;
    blinkHiddenTimer: number;
    trailTick: number;
    danmakuPattern: number;
    bossSkillIdx: number;
    bossEnraged: boolean;
    flashTimer: number;
    squashTimer: number;
    freezeTimer: number;
    burnTimer: number;
    burnTick: number;
    animTimer: number;
    animFrame: number;
    facingX: number;
    node: Node;
    spriteNode: Node;
    rig: MonsterRigView;
    hpBarGfx: Graphics;
    spritePrefix: string;
}

interface HazardZone {
    x: number;
    y: number;
    r: number;
    life: number;
    maxLife: number;
    kind: 'fire' | 'poison' | 'frost';
    tick: number;
    node: Node;
}

interface SpawnTelegraph {
    x: number;
    y: number;
    kind: EnemyKind;
    elite: boolean;
    timer: number;
    maxTimer: number;
    node: Node;
}

interface DelayedMine {
    x: number;
    y: number;
    r: number;
    timer: number;
    maxTimer: number;
    node: Node;
}

interface Projectile {
    fromPlayer: boolean;
    kind: 'arrow' | 'fire' | 'frost' | 'homing' | 'sword_wave' | 'enemy_orb' | 'enemy_homing' | 'enemy_sniper';
    node: Node;
    x: number;
    y: number;
    vx: number;
    vy: number;
    damage: number;
    isCrit: boolean;
    radius: number;
    life: number;
    maxLife: number;
    pierceLeft: number;
    color: Color;
    accent: Color;
    trail: { x: number; y: number }[];
    hitIds: Set<number>;
}

interface SlashArcFx {
    x: number;
    y: number;
    angle: number;
    radius: number;
    span: number;
    life: number;
    maxLife: number;
    color: Color;
    accent: Color;
}

interface LightningBoltFx {
    pts: { x: number; y: number }[];
    life: number;
    maxLife: number;
    color: Color;
}

interface ParticleFx {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    life: number;
    maxLife: number;
    color: Color;
}

interface RingBurstFx {
    x: number;
    y: number;
    r: number;
    maxR: number;
    life: number;
    maxLife: number;
    color: Color;
}

interface SpriteFxBurst {
    node: Node;
    sp: Sprite | null;
    life: number;
    maxLife: number;
    startScale: number;
    endScale: number;
    spinSpeed: number;
    baseColor: Color;
    flipY: boolean;
}

interface DropOrb {
    kind: 'gold' | 'energy' | 'heal' | 'iron';
    node: Node;
    x: number;
    y: number;
    z: number;
    vz: number;
    vx: number;
    vy: number;
    amount: number;
    life: number;
}

interface FloatTextFx {
    node: Node;
    lbl: Label;
    x: number;
    y: number;
    vy: number;
    life: number;
    maxLife: number;
}

interface RunBuffs {
    dmgMult: number;
    critBonus: number;
    shieldMaxBonus: number;
    hpMaxBonus: number;
    meleeRangeBonus: number;
    killEnergyBonus: number;
    extraShot: number;
    speedBonus: number;
}

interface AltarBlessing {
    id: string;
    title: string;
    desc: string;
    color: string;
    apply: (self: DungeonOverlay) => void;
}

const ALTAR_BLESSINGS: readonly AltarBlessing[] = [
    {
        id: 'shield_up',
        title: '玄龟灵盾',
        desc: '护盾上限 +2，并立刻补满护盾',
        color: '#60A5FA',
        apply: (s) => { s.applyBuffShield(2); },
    },
    {
        id: 'dmg_up',
        title: '破军剑意',
        desc: '全武器伤害 +24%',
        color: '#F87171',
        apply: (s) => { s.applyBuffDmg(0.24); },
    },
    {
        id: 'crit_up',
        title: '会心一击',
        desc: '全武器暴击率 +16%',
        color: '#FBBF24',
        apply: (s) => { s.applyBuffCrit(0.16); },
    },
    {
        id: 'split_shot',
        title: '散华连发',
        desc: '远程/霰弹/飞剑每次额外 +1 发弹道',
        color: '#A78BFA',
        apply: (s) => { s.applyBuffExtraShot(1); },
    },
    {
        id: 'energy_siphon',
        title: '灵泉汲取',
        desc: '击杀敌人额外回复 +8 灵力，并立即恢复 60 灵力',
        color: '#34D399',
        apply: (s) => { s.applyBuffEnergy(8, 60); },
    },
    {
        id: 'vitality_up',
        title: '青木回春',
        desc: '生命上限 +2，并立即回复 4 点生命',
        color: '#4ADE80',
        apply: (s) => { s.applyBuffHp(2, 4); },
    },
];

function hexToColor(hex: string, alpha = 255): Color {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) || 255;
    const g = parseInt(clean.substring(2, 4), 16) || 255;
    const b = parseInt(clean.substring(4, 6), 16) || 255;
    return new Color(r, g, b, alpha);
}

@ccclass('DungeonOverlay')
export class DungeonOverlay extends Component {
    private static _inst: DungeonOverlay | null = null;

    private _root!: Node;
    private _isOpen = false;
    private _onToast?: (msg: string) => void;

    // 场景容器（支持震屏偏移）
    private _worldLayer!: Node;
    private _bgNode!: Node;
    private _roomBaseGfx!: Graphics;
    private _roomPropsLayer!: Node;
    private _hazardGroundLayer!: Node;
    private _doorLabelsLayer!: Node;
    private _entityLayer!: Node;
    private _dropLayer!: Node;
    private _fxLayer!: Node;
    private _fxSpriteLayer!: Node;
    private _fxGfx!: Graphics;
    private _floatTextLayer!: Node;

    // 玩家表现与独立手绘武器精灵
    private _playerNode!: Node;
    private _playerRig!: PlayerRigView;
    private _playerSpriteNode!: Node;
    private _playerWeaponPivot!: Node;
    private _playerWeaponSpriteNode!: Node;
    private _currentWeaponArtKey = '';
    private _walkFrames: Record<'front' | 'side' | 'back', (SpriteFrame | null)[]> = {
        front: [null, null, null, null],
        side: [null, null, null, null],
        back: [null, null, null, null],
    };
    private _idleSprites: Partial<Record<'front' | 'side' | 'back', SpriteFrame>> = {};
    private _enemyFrames = new Map<string, (SpriteFrame | null)[]>();

    // HUD & 小地图 & 弹窗
    private _hudLayer!: Node;
    private _hudBarsGfx!: Graphics;
    private _hpLbl!: Label;
    private _shieldLbl!: Label;
    private _energyLbl!: Label;
    private _stageLbl!: Label;
    private _lootLbl!: Label;
    private _weaponBtnLbl!: Label;
    private _weaponBtnIconNode!: Node;
    private _weaponBtnIconKey = '';
    private _interactBtn!: Node;
    private _interactLbl!: Label;
    private _bossBarNode!: Node;
    private _bossBarGfx!: Graphics;
    private _bossBarLbl!: Label;
    private _minimapGfx!: Graphics;
    private _minimapOverlayLayer!: Node;
    private _minimapRoomLbl!: Label;
    private _bannerNode!: Node;
    private _bannerLbl!: Label;
    private _bannerTimer = 0;

    private _modalLayer!: Node;
    private _modalOpen = false;

    // 摇杆、键盘与鼠标瞄准输入
    private _keys = new Set<KeyCode>();
    private _joyActive = false;
    private _joyOrigin = new Vec2();
    private _joyDir = new Vec2();
    private _joyBase!: Node;
    private _joyKnob!: Node;
    private _attackHeld = false;
    private _mouseAimX = 0;
    private _mouseAimY = 0;
    private _mouseScreenX = 0;
    private _mouseScreenY = 0;
    private _mouseAimTimer = 0;
    private _camX = 0;
    private _camY = 0;
    private _voidBgGfx!: Graphics;
    private _roomGateNodes = new Map<string, Node[]>();
    private _roomChestNodes = new Map<string, Node>();
    private _roomCrateMap = new Map<string, { crateIdx: number; node: Node }[]>();
    private _roomSpikeMap = new Map<string, { idx: number; node: Node }[]>();
    private _roomFogNodes = new Map<string, Node>();
    private _fadingFogs: { node: Node; life: number; maxLife: number }[] = [];
    private _mechNodes = new Map<number, Node>();
    private _mistOverlayGfx!: Graphics;
    private _iceVx = 0;
    private _iceVy = 0;
    private _hasteTimer = 0;
    private _warpCd = 0;

    // 局内核心状态
    private _stageNum = 1;
    private _stageCfg!: StageConfig;
    private _floorMap!: DungeonFloorMap;
    private _curRoomKey = '2,2';
    private _runClearedStages = 0;
    private _runGold = 0;
    private _runIron = 0;
    private _selectedStarterWeapon: WeaponId = 'bamboo_sword';
    private _selectedStartStage = 1;

    private _hp = 6;
    private _maxHp = 6;
    private _shield = 4;
    private _maxShield = 4;
    private _shieldRegenDelay = 0;
    private _shieldRegenTick = 0;
    private _energy = 180;
    private _maxEnergy = 180;

    private _weapons: [WeaponInstance, WeaponInstance] = [
        { id: 'bamboo_sword', rarity: 0 },
        { id: 'wind_crossbow', rarity: 0 },
    ];
    private _activeWeaponIdx: 0 | 1 = 0;
    private _comboStep = 0;
    private _atkCd = 0;
    private _dodgeCd = 0;
    private _dodgeBuffer = 0;
    private _dodgeTimer = 0;
    private _dodgeDir = new Vec2(1, 0);
    private _invulnTimer = 0;
    private _doorCooldown = 0;

    private _px = 0;
    private _py = 0;
    private _facingX = 1;
    private _aimAngle = 0;
    private _walkAnimTimer = 0;
    private _walkFrameIdx = 0;
    private _weaponRecoil = 0;
    private _meleeSwingTimer = 0;
    private _meleeSwingSign = 1;

    private _buffs: RunBuffs = {
        dmgMult: 1,
        critBonus: 0,
        shieldMaxBonus: 0,
        hpMaxBonus: 0,
        meleeRangeBonus: 0,
        killEnergyBonus: 0,
        extraShot: 0,
        speedBonus: 0,
    };

    // 房间运行时实体与特效
    private _nextEnemyId = 1;
    private _enemies: ActiveEnemy[] = [];
    private _hazards: HazardZone[] = [];
    private _pendingWaves: WaveSpawnEntry[][] = [];
    private _mines: DelayedMine[] = [];
    private _spikeNodes: { idx: number; node: Node }[] = [];
    private _telegraphs: SpawnTelegraph[] = [];
    private _projectiles: Projectile[] = [];
    private _slashArcs: SlashArcFx[] = [];
    private _lightningBolts: LightningBoltFx[] = [];
    private _particles: ParticleFx[] = [];
    private _ringBursts: RingBurstFx[] = [];
    private _spriteBursts: SpriteFxBurst[] = [];
    private _hitStopTimer = 0;
    private _drops: DropOrb[] = [];
    private _floatTexts: FloatTextFx[] = [];
    private _crateNodes: { crateIdx: number; node: Node }[] = [];
    private _chestNode: Node | null = null;
    private _portalNode: Node | null = null;

    private _shakeTime = 0;
    private _shakeIntensity = 0;
    private _fxTime = 0;

    public static get inst(): DungeonOverlay | null {
        return this._inst;
    }

    public get isOpen(): boolean {
        return this._isOpen;
    }

    public applyBuffShield(n: number): void {
        this._buffs.shieldMaxBonus += n;
        this._maxShield += n;
        this._shield = this._maxShield;
    }

    public applyBuffDmg(pct: number): void {
        this._buffs.dmgMult += pct;
    }

    public applyBuffCrit(pct: number): void {
        this._buffs.critBonus += pct;
    }

    public applyBuffExtraShot(n: number): void {
        this._buffs.extraShot += n;
    }

    public applyBuffEnergy(perKill: number, instant: number): void {
        this._buffs.killEnergyBonus += perKill;
        this._energy = Math.min(this._maxEnergy, this._energy + instant);
    }

    public applyBuffHp(maxAdd: number, heal: number): void {
        this._buffs.hpMaxBonus += maxAdd;
        this._maxHp += maxAdd;
        this._hp = Math.min(this._maxHp, this._hp + heal);
    }

    protected onLoad(): void {
        DungeonOverlay._inst = this;
        this._preloadSprites();
        this._buildUI();
        input.on(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this._onKeyUp, this);
        input.on(Input.EventType.MOUSE_MOVE, this._onMouseMove, this);
        input.on(Input.EventType.MOUSE_DOWN, this._onMouseDown, this);
        input.on(Input.EventType.MOUSE_UP, this._onMouseUp, this);
    }

    protected onDestroy(): void {
        if (DungeonOverlay._inst === this) DungeonOverlay._inst = null;
        input.off(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this._onKeyUp, this);
        input.off(Input.EventType.MOUSE_MOVE, this._onMouseMove, this);
        input.off(Input.EventType.MOUSE_DOWN, this._onMouseDown, this);
        input.off(Input.EventType.MOUSE_UP, this._onMouseUp, this);
    }

    private _preloadSprites(): void {
        (['front', 'side', 'back'] as const).forEach((dir) => {
            void ArtLoader.loadSpriteFrame(`char_player_${dir}`).then((sf) => {
                if (sf) this._idleSprites[dir] = sf;
            });
            for (let i = 0; i < 4; i++) {
                void ArtLoader.loadSpriteFrame(`char_walk_${dir}_${i}`).then((sf) => {
                    if (sf) this._walkFrames[dir][i] = sf;
                });
            }
        });
        for (const pre of ['mob_bamboo', 'mob_golem', 'mob_ink_fly', 'mob_leap_fox', 'mob_burrow_mole', 'mob_boss']) {
            const arr: (SpriteFrame | null)[] = [null, null, null, null];
            this._enemyFrames.set(pre, arr);
            for (let i = 0; i < 4; i++) {
                void ArtLoader.loadSpriteFrame(`${pre}_${i}`).then((sf) => {
                    if (sf) arr[i] = sf;
                });
            }
        }
        // 预加载 6 把国风武器精灵与铁匠铺、地牢古木箱
        for (const wid of STARTER_WEAPON_LIST) {
            void ArtLoader.loadSpriteFrame(DUNGEON_WEAPONS[wid].artKey);
        }
        void ArtLoader.loadSpriteFrame('dng_blacksmith');
        void ArtLoader.loadSpriteFrame('dng_wood_crate');
        void ArtLoader.loadSpriteFrame('dng_pit_pool');
        void ArtLoader.loadSpriteFrame('dng_pit_pool_v');
        void ArtLoader.loadSpriteFrame('dng_stone_wall_h');
        void ArtLoader.loadSpriteFrame('dng_stone_wall_v');
        void ArtLoader.loadSpriteFrame('rig_golem_shield');
        void ArtLoader.loadSpriteFrame('rig_golem_hammer');
        void ArtLoader.loadSpriteFrame('rig_imp_spear');
        void ArtLoader.loadSpriteFrame('rig_p_head_front');
        void ArtLoader.loadSpriteFrame('rig_p_head_back');
        void ArtLoader.loadSpriteFrame('rig_p_torso_front');
        void ArtLoader.loadSpriteFrame('rig_p_torso_back');
        void ArtLoader.loadSpriteFrame('mob_ch1_bamboo_imp_front');
        void ArtLoader.loadSpriteFrame('mob_ch1_bamboo_imp_back');
        void ArtLoader.loadSpriteFrame('mob_ch1_paper_golem_front');
        void ArtLoader.loadSpriteFrame('mob_ch1_paper_golem_back');
        void ArtLoader.loadSpriteFrame('mob_ch1_bamboo_archer_front');
        void ArtLoader.loadSpriteFrame('mob_ch1_bamboo_archer_back');
        void ArtLoader.loadSpriteFrame('mob_ch1_ink_spirit_front');
        void ArtLoader.loadSpriteFrame('mob_ch1_ink_spirit_back');
        for (const k of [
            'dng_pit_magma', 'dng_pit_magma_v', 'dng_wall_magma_h', 'dng_wall_magma_v',
            'dng_pit_frost', 'dng_pit_frost_v', 'dng_wall_frost_h', 'dng_wall_frost_v',
            'dng_pit_mist', 'dng_pit_mist_v', 'dng_wall_mist_h', 'dng_wall_mist_v',
            'dng_pit_thunder', 'dng_pit_thunder_v', 'dng_wall_thunder_h', 'dng_wall_thunder_v',
            'dng_pit_rift', 'dng_pit_rift_v', 'dng_wall_rift_h', 'dng_wall_rift_v',
            'mob_ch2_fire_bat', 'mob_ch2_magma_turtle', 'mob_ch2_fire_taoist', 'boss_ch2_magma_wyrm',
            'mob_ch3_ice_prism', 'mob_ch3_snow_puppet', 'mob_ch3_frost_guard', 'boss_ch3_frost_crane',
            'mob_ch4_venom_frog', 'mob_ch4_miasma_flower', 'mob_ch4_shadow_assassin', 'boss_ch4_ghost_spider',
            'mob_ch5_thunder_drummer', 'mob_ch5_bronze_guardian', 'mob_ch5_arc_sparrow', 'boss_ch5_thunder_lord',
            'mob_ch6_rift_walker', 'mob_ch6_star_puppet', 'mob_ch6_mana_eater', 'boss_ch6_rift_overlord',
            'tile_floor_bamboo', 'tile_floor_magma', 'tile_floor_frost', 'tile_floor_mist', 'tile_floor_thunder', 'tile_floor_rift',
            'dng_pillar_magma', 'dng_gate_h', 'dng_gate_v', 'dng_ancient_lantern',
            'dng_prop_bamboo_clump', 'dng_prop_lava_vent', 'dng_prop_ice_crystal', 'dng_prop_poison_pod',
            'dng_prop_thunder_pad', 'dng_prop_star_obelisk', 'dng_event_wishing_well', 'dng_event_reforge_furnace', 'dng_fog_cloud', 'fx_hazard_fire', 'fx_hazard_frost', 'fx_hazard_poison', 'dng_ice_rink',
        ]) {
            void ArtLoader.loadSpriteFrame(k);
        }
        void ArtLoader.loadSpriteFrame('dng_spirit_statue');
        for (const rk of ['rig_p_head', 'rig_p_torso', 'rig_p_arm', 'rig_p_leg', 'rig_p_pack']) void ArtLoader.loadSpriteFrame(rk);
        for (const k of [
            'mob_ch1_bamboo_imp', 'mob_ch1_ink_spirit', 'mob_ch1_paper_golem', 'mob_ch1_bamboo_archer',
            'boss_ch1_giant_bamboo', 'boss_ch1_stone_spirit',
            'drop_gold', 'drop_energy', 'drop_heal', 'drop_iron',
            'fx_slash_jade', 'fx_burst_explosion', 'fx_enemy_orb', 'fx_magic_circle',
            'fx_proj_arrow', 'fx_proj_fire', 'fx_proj_frost',
        ]) {
            void ArtLoader.loadSpriteFrame(k);
        }
    }

    private _uiNode(name: string, parent: Node): Node {
        const n = new Node(name);
        n.layer = Layers.Enum.UI_2D;
        n.parent = parent;
        return n;
    }

    private _addLabel(
        parent: Node,
        text: string,
        fontSize: number,
        color: Color,
        x = 0,
        y = 0,
        bold = true,
        outlineWidth = 2
    ): Label {
        const n = this._uiNode('Lbl', parent);
        n.setPosition(x, y, 0);
        const lbl = n.addComponent(Label);
        lbl.string = text;
        lbl.fontSize = fontSize;
        lbl.lineHeight = fontSize + 6;
        lbl.isBold = bold;
        lbl.color = color;
        if (outlineWidth > 0) {
            const ol = n.addComponent(LabelOutline);
            ol.color = new Color(14, 20, 22, 230);
            ol.width = outlineWidth;
        }
        return lbl;
    }

    private _makeButton(
        parent: Node,
        name: string,
        x: number,
        y: number,
        w: number,
        h: number,
        text: string,
        fill: Color,
        stroke: Color,
        onTap: () => void,
        fontSize = 18
    ): { node: Node; lbl: Label } {
        const btn = this._uiNode(name, parent);
        btn.setPosition(x, y, 0);
        const ut = btn.addComponent(UITransform);
        ut.setContentSize(w, h);
        const g = btn.addComponent(Graphics);
        g.fillColor = fill;
        g.strokeColor = stroke;
        g.lineWidth = 2.5;
        g.roundRect(-w / 2, -h / 2, w, h, 10);
        g.fill();
        g.stroke();
        const lbl = this._addLabel(btn, text, fontSize, new Color(248, 246, 238, 255), 0, 0, true, 1.8);
        btn.on(Node.EventType.TOUCH_END, () => {
            AudioManager.inst.playSfx('tap');
            onTap();
        });
        return { node: btn, lbl };
    }

    private _buildUI(): void {
        this._root = this._uiNode('DungeonRoot', this.node);
        const rootUt = this._root.addComponent(UITransform);
        rootUt.setContentSize(SCREEN_W, SCREEN_H);
        this._root.active = false;

        const blocker = this._uiNode('Blocker', this._root);
        blocker.addComponent(UITransform).setContentSize(SCREEN_W, SCREEN_H);
        const bg = blocker.addComponent(Graphics);
        bg.fillColor = new Color(12, 20, 22, 255);
        bg.rect(-SCREEN_W / 2, -SCREEN_H / 2, SCREEN_W, SCREEN_H);
        bg.fill();
        blocker.on(Node.EventType.TOUCH_START, () => {});

        // 世界层
        this._voidBgGfx = this._uiNode('VoidBackdrop', this._root).addComponent(Graphics);
        this._worldLayer = this._uiNode('WorldLayer', this._root);
        this._bgNode = this._uiNode('ArenaBg', this._worldLayer);
        this._bgNode.active = false;
        this._roomBaseGfx = this._uiNode('RoomBaseGfx', this._worldLayer).addComponent(Graphics);
        this._roomPropsLayer = this._uiNode('RoomPropsLayer', this._worldLayer);
        this._hazardGroundLayer = this._uiNode('HazardGroundLayer', this._worldLayer);
        this._doorLabelsLayer = this._uiNode('DoorLabelsLayer', this._worldLayer);
        this._entityLayer = this._uiNode('EntityLayer', this._worldLayer);
        this._dropLayer = this._uiNode('DropLayer', this._worldLayer);
        this._fxLayer = this._uiNode('FxLayer', this._worldLayer);
        this._fxGfx = this._fxLayer.addComponent(Graphics);
        this._fxSpriteLayer = this._uiNode('FxSpriteLayer', this._worldLayer);
        this._floatTextLayer = this._uiNode('FloatTextLayer', this._worldLayer);
        this._mistOverlayGfx = this._uiNode('MistFogOverlay', this._root).addComponent(Graphics);

        // 玩家分段骨骼节点树（Cocos 原生 60fps 骨骼动画：真迈步、360° 团身翻滚、手部武器联动）
        this._playerRig = new PlayerRigView(this._entityLayer);
        this._playerNode = this._playerRig.root;
        this._playerSpriteNode = this._uiNode('LegacyDummy', this._playerNode);
        this._playerSpriteNode.active = false;
        this._playerWeaponPivot = this._uiNode('LegacyWpnPivot', this._playerNode);
        this._playerWeaponPivot.active = false;
        this._playerWeaponSpriteNode = this._uiNode('LegacyWpnSpr', this._playerWeaponPivot);

        // 左侧触控摇杆
        const joyPad = this._uiNode('JoyPad', this._root);
        joyPad.addComponent(UITransform).setContentSize(600, SCREEN_H);
        joyPad.setPosition(-340, 0, 0);
        this._joyBase = this._uiNode('JoyBase', this._root);
        const jb = this._joyBase.addComponent(Graphics);
        jb.fillColor = new Color(220, 240, 236, 55);
        jb.strokeColor = new Color(110, 210, 195, 160);
        jb.lineWidth = 2.5;
        jb.circle(0, 0, 52);
        jb.fill();
        jb.stroke();
        this._joyBase.active = false;
        this._joyKnob = this._uiNode('JoyKnob', this._joyBase);
        const jk = this._joyKnob.addComponent(Graphics);
        jk.fillColor = new Color(110, 231, 183, 200);
        jk.circle(0, 0, 20);
        jk.fill();

        joyPad.on(Node.EventType.TOUCH_START, (e: EventTouch) => {
            if (this._modalOpen) return;
            const loc = e.getUILocation();
            this._joyActive = true;
            this._joyOrigin.set(loc.x - 640, loc.y - 360);
            this._joyDir.set(0, 0);
            this._joyBase.setPosition(this._joyOrigin.x, this._joyOrigin.y, 0);
            this._joyKnob.setPosition(0, 0, 0);
            this._joyBase.active = true;
        });
        joyPad.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => {
            if (!this._joyActive || this._modalOpen) return;
            const loc = e.getUILocation();
            const dx = loc.x - 640 - this._joyOrigin.x;
            const dy = loc.y - 360 - this._joyOrigin.y;
            const d = Math.hypot(dx, dy);
            if (d > 6) {
                const c = Math.min(d, 48);
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
        joyPad.on(Node.EventType.TOUCH_END, endJoy);
        joyPad.on(Node.EventType.TOUCH_CANCEL, endJoy);

        // HUD 层
        this._hudLayer = this._uiNode('HudLayer', this._root);
        this._hudBarsGfx = this._uiNode('HudBars', this._hudLayer).addComponent(Graphics);

        this._hpLbl = this._addLabel(this._hudLayer, '10/10', 14, new Color(255, 240, 240, 255), -518, 326, true, 1.5);
        this._shieldLbl = this._addLabel(this._hudLayer, '5/5', 14, new Color(235, 246, 255, 255), -518, 300, true, 1.5);
        this._energyLbl = this._addLabel(this._hudLayer, '180/180', 14, new Color(224, 248, 255, 255), -518, 274, true, 1.5);
        this._stageLbl = this._addLabel(this._hudLayer, '幽篁古墟 1-1', 18, new Color(250, 244, 224, 255), 0, 332, true, 2);
        this._lootLbl = this._addLabel(this._hudLayer, '金币 0  ·  玄铁 0', 15, new Color(252, 224, 146, 255), -505, 246, true, 1.5);

        // 顶部 Boss 血条
        this._bossBarNode = this._uiNode('BossBar', this._hudLayer);
        this._bossBarNode.setPosition(0, 294, 0);
        this._bossBarGfx = this._bossBarNode.addComponent(Graphics);
        this._bossBarLbl = this._addLabel(this._bossBarNode, '', 16, new Color(255, 232, 210, 255), 0, 14, true, 2);
        this._bossBarNode.active = false;

        // 右上角三态战争迷雾小地图
        const minimapNode = this._uiNode('Minimap', this._hudLayer);
        minimapNode.setPosition(545, 272, 0);
        this._minimapGfx = minimapNode.addComponent(Graphics);
        this._minimapOverlayLayer = this._uiNode('MinimapMarks', minimapNode);
        this._minimapRoomLbl = this._addLabel(minimapNode, '起点', 13, new Color(224, 244, 238, 255), 0, -68, true, 1.5);

        this._makeButton(
            this._hudLayer, 'TestStageBtn', 260, 314, 110, 38, '测试选关',
            new Color(34, 82, 78, 236), new Color(156, 238, 218, 235),
            () => this._showPrepHall(), 15
        );
        this._makeButton(
            this._hudLayer, 'RetreatBtn', 420, 326, 98, 34, '撤回主岛',
            new Color(52, 34, 34, 225), new Color(196, 132, 108, 220),
            () => this._retreatToOverworld(), 14
        );

        // 右下角战斗操作键
        const atkBtn = this._uiNode('AtkBtn', this._hudLayer);
        atkBtn.setPosition(546, -242, 0);
        atkBtn.addComponent(UITransform).setContentSize(112, 112);
        const atkG = atkBtn.addComponent(Graphics);
        atkG.fillColor = new Color(166, 36, 36, 230);
        atkG.strokeColor = new Color(245, 212, 146, 235);
        atkG.lineWidth = 3.5;
        atkG.circle(0, 0, 52);
        atkG.fill();
        atkG.stroke();
        this._addLabel(atkBtn, '攻击\n(左键/J)', 15, new Color(255, 248, 235, 255), 0, 0, true, 2);
        atkBtn.on(Node.EventType.TOUCH_START, () => { this._attackHeld = true; });
        atkBtn.on(Node.EventType.TOUCH_END, () => { this._attackHeld = false; });
        atkBtn.on(Node.EventType.TOUCH_CANCEL, () => { this._attackHeld = false; });

        this._makeButton(
            this._hudLayer, 'DodgeBtn', 432, -266, 82, 82, '翻滚\n(右键/K)',
            new Color(32, 92, 86, 230), new Color(165, 235, 218, 225),
            () => this._queueDodge(), 14
        );

        // 切武器按钮（带武器图标预览）
        const sw = this._makeButton(
            this._hudLayer, 'SwitchWeaponBtn', 514, -138, 198, 56, '',
            new Color(24, 48, 46, 236), new Color(196, 222, 186, 225),
            () => this._switchWeapon(), 13
        );
        this._weaponBtnIconNode = this._uiNode('WpnIcon', sw.node);
        this._weaponBtnIconNode.setPosition(-64, 0, 0);
        sw.lbl.node.setPosition(26, 0, 0);
        this._weaponBtnLbl = sw.lbl;

        const inter = this._makeButton(
            this._hudLayer, 'InteractBtn', 0, -294, 248, 44, '按 E 交互',
            new Color(32, 98, 84, 238), new Color(248, 222, 148, 245),
            () => this._tryInteract(), 16
        );
        this._interactBtn = inter.node;
        this._interactLbl = inter.lbl;
        this._interactBtn.active = false;

        // 房间切换横幅
        this._bannerNode = this._uiNode('Banner', this._hudLayer);
        this._bannerNode.setPosition(0, 212, 0);
        const bnG = this._bannerNode.addComponent(Graphics);
        bnG.fillColor = new Color(16, 28, 30, 210);
        bnG.strokeColor = new Color(216, 198, 148, 220);
        bnG.lineWidth = 2;
        bnG.roundRect(-185, -22, 370, 44, 10);
        bnG.fill();
        bnG.stroke();
        this._bannerLbl = this._addLabel(this._bannerNode, '', 17, new Color(252, 242, 206, 255), 0, 0, true, 2);
        this._bannerNode.active = false;

        this._modalLayer = this._uiNode('ModalLayer', this._root);
    }

    public open(onToast?: (msg: string) => void): void {
        this._onToast = onToast;
        this._isOpen = true;
        this._root.active = true;
        this._keys.clear();
        this._attackHeld = false;
        AudioManager.inst.playBgm('dungeon');

        const dng = GameApp.inst?.saveData.dungeon;
        const anchors = dng?.unlockedAnchors?.length ? dng.unlockedAnchors : [1];
        this._selectedStartStage = anchors[0] ?? 1;
        this._showPrepHall();
    }

    private _closeOverlay(): void {
        this._isOpen = false;
        this._modalOpen = false;
        this._root.active = false;
        this._keys.clear();
        this._attackHeld = false;
        this._clearRuntimeEntities();
        AudioManager.inst.playBgm('overworld');
    }

    private _showPrepHall(): void {
        this._modalOpen = true;
        this._modalLayer.removeAllChildren();

        const mask = this._uiNode('PrepMask', this._modalLayer);
        mask.addComponent(UITransform).setContentSize(SCREEN_W, SCREEN_H);
        const mg = mask.addComponent(Graphics);
        mg.fillColor = new Color(10, 18, 20, 238);
        mg.rect(-SCREEN_W / 2, -SCREEN_H / 2, SCREEN_W, SCREEN_H);
        mg.fill();
        mask.on(Node.EventType.TOUCH_START, () => {});

        const panel = this._uiNode('PrepPanel', this._modalLayer);
        const pg = panel.addComponent(Graphics);
        pg.fillColor = new Color(20, 34, 36, 250);
        pg.strokeColor = new Color(196, 178, 130, 235);
        pg.lineWidth = 3;
        pg.roundRect(-550, -322, 1100, 644, 16);
        pg.fill();
        pg.stroke();

        this._addLabel(panel, '秘境备战大厅 · 挑选开局武器', 26, new Color(252, 240, 204, 255), 0, 280, true, 2.2);
        this._addLabel(
            panel,
            'WASD 移动 · 鼠标瞄准+左键攻击(或J键自动锁敌) · 右键/K 翻滚 · Q 切换双武器 · E 交互',
            14,
            new Color(176, 214, 204, 255),
            0,
            246,
            false,
            1.4
        );

        const cardW = 326;
        const cardH = 152;
        const gapX = 22;
        const gapY = 18;
        STARTER_WEAPON_LIST.forEach((wid, idx) => {
            const def = DUNGEON_WEAPONS[wid];
            const col = idx % 3;
            const row = Math.floor(idx / 3);
            const cx = (col - 1) * (cardW + gapX);
            const cy = 124 - row * (cardH + gapY);
            const selected = this._selectedStarterWeapon === wid;

            const card = this._uiNode(`WeaponCard_${wid}`, panel);
            card.setPosition(cx, cy, 0);
            card.addComponent(UITransform).setContentSize(cardW, cardH);
            const cg = card.addComponent(Graphics);
            cg.fillColor = selected ? new Color(36, 74, 68, 250) : new Color(26, 42, 45, 242);
            cg.strokeColor = selected ? new Color(252, 214, 112, 255) : new Color(110, 148, 140, 180);
            cg.lineWidth = selected ? 3.5 : 1.8;
            cg.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
            cg.fill();
            cg.stroke();

            // 武器独立手绘图标
            const iconBox = this._uiNode('Icon', card);
            iconBox.setPosition(-102, 24, 0);
            const iw = def.kind === 'frost' || def.kind === 'homing' ? 68 : 92;
            const ih = def.kind === 'frost' || def.kind === 'homing' ? 54 : 36;
            ArtLoader.applySprite(iconBox, def.artKey, iw, ih);

            this._addLabel(card, `${def.name}${selected ? ' ✓' : ''}`, 18, hexToColor(def.colorHex), 44, 42, true, 1.8);
            this._addLabel(card, def.tag, 13, new Color(248, 224, 152, 255), 44, 16, true, 1.4);
            this._addLabel(
                card,
                `伤 ${def.baseDamage} · 蓝 ${def.energyCost} · 暴 ${Math.round(def.critChance * 100)}%`,
                12,
                new Color(188, 228, 220, 255),
                44,
                -8,
                false,
                1.2
            );
            const descLbl = this._addLabel(card, def.desc, 12, new Color(224, 232, 230, 245), 0, -46, false, 1.2);
            descLbl.overflow = Label.Overflow.SHRINK;
            descLbl.node.getComponent(UITransform)?.setContentSize(cardW - 30, 42);

            card.on(Node.EventType.TOUCH_END, () => {
                AudioManager.inst.playSfx('tap');
                this._selectedStarterWeapon = wid;
                this._showPrepHall();
            });
        });

        // 测试选关：全部 6 大关 + 5 档小关/首领直达全部开放！
        const curSelCfg = getStageConfig(this._selectedStartStage);
        const curChap = curSelCfg.chapter;
        const curSub = curSelCfg.subStage;
        const biomeNames = ['1.幽篁古墟', '2.丹砂熔窟', '3.寒玉冰宫', '4.墨瘴泽渊', '5.雷纹古塔', '6.裂隙天坛'];
        this._addLabel(panel, '测试选图：', 14, new Color(252, 228, 152, 255), -482, -162, true, 1.4);
        biomeNames.forEach((bName, idx) => {
            const ch = idx + 1;
            const isSel = curChap === ch;
            this._makeButton(
                panel,
                `BiomeBtn_${ch}`,
                -354 + idx * 144,
                -162,
                136,
                34,
                bName,
                isSel ? new Color(46, 124, 104, 250) : new Color(28, 44, 48, 235),
                isSel ? new Color(252, 220, 126, 255) : new Color(110, 146, 140, 185),
                () => {
                    this._selectedStartStage = (ch - 1) * 10 + curSub;
                    this._showPrepHall();
                },
                13
            );
        });

        const subOptions: { sub: number; label: string }[] = [
            { sub: 1, label: `${curChap}-1 前段` },
            { sub: 4, label: `${curChap}-4 中段` },
            { sub: 5, label: `${curChap}-5 中Boss` },
            { sub: 8, label: `${curChap}-8 深层` },
            { sub: 10, label: `${curChap}-10 终Boss` },
        ];
        this._addLabel(panel, '小关直达：', 14, new Color(188, 226, 218, 255), -482, -206, true, 1.4);
        subOptions.forEach((opt, idx) => {
            const targetSt = (curChap - 1) * 10 + opt.sub;
            const isSel = this._selectedStartStage === targetSt;
            this._makeButton(
                panel,
                `SubBtn_${opt.sub}`,
                -342 + idx * 168,
                -206,
                156,
                32,
                opt.label,
                isSel ? new Color(82, 108, 48, 245) : new Color(26, 40, 44, 232),
                isSel ? new Color(252, 226, 134, 255) : new Color(110, 144, 138, 180),
                () => {
                    this._selectedStartStage = targetSt;
                    this._showPrepHall();
                },
                13
            );
        });

        this._makeButton(
            panel, 'CancelPrep', -170, -274, 180, 48, '暂不探险',
            new Color(58, 42, 42, 235), new Color(188, 140, 128, 220),
            () => this._closeOverlay(), 16
        );
        this._makeButton(
            panel, 'StartRun', 110, -274, 300, 50, `进入 ${curSelCfg.biome.name} ${curSelCfg.label}`,
            new Color(34, 126, 98, 250), new Color(252, 224, 138, 255),
            () => this._startNewRun(), 18
        );
    }

    private _startNewRun(): void {
        this._modalOpen = false;
        this._modalLayer.removeAllChildren();

        this._buffs = {
            dmgMult: 1,
            critBonus: 0,
            shieldMaxBonus: 0,
            hpMaxBonus: 0,
            meleeRangeBonus: 0,
            killEnergyBonus: 0,
            extraShot: 0,
            speedBonus: 0,
        };
        this._maxHp = 6;
        this._hp = 6;
        this._maxShield = 4;
        this._shield = 4;
        this._maxEnergy = 180;
        this._energy = 180;
        this._runGold = 0;
        this._runIron = 0;
        this._runClearedStages = 0;

        const secondary: WeaponId = this._selectedStarterWeapon === 'bamboo_sword' ? 'wind_crossbow' : 'bamboo_sword';
        this._weapons = [
            { id: this._selectedStarterWeapon, rarity: 0 },
            { id: secondary, rarity: 0 },
        ];
        this._activeWeaponIdx = 0;
        this._comboStep = 0;
        this._syncHeldWeaponSprite();

        this._enterStage(this._selectedStartStage);
    }

    private _syncHeldWeaponSprite(): void {
        const def = getWeaponDef(this._getActiveWeapon().id);
        this._playerRig?.syncWeapon(def);
        if (this._currentWeaponArtKey !== def.artKey) {
            this._currentWeaponArtKey = def.artKey;
            const w = def.kind === 'frost' || def.kind === 'homing' ? 42 : 56;
            const h = def.kind === 'frost' || def.kind === 'homing' ? 36 : 24;
            this._playerWeaponSpriteNode.removeAllChildren();
            ArtLoader.applySprite(this._playerWeaponSpriteNode, def.artKey, w, h);
        }
        if (this._weaponBtnIconKey !== def.artKey) {
            this._weaponBtnIconKey = def.artKey;
            const iw = def.kind === 'frost' || def.kind === 'homing' ? 42 : 54;
            const ih = def.kind === 'frost' || def.kind === 'homing' ? 34 : 24;
            this._weaponBtnIconNode.removeAllChildren();
            ArtLoader.applySprite(this._weaponBtnIconNode, def.artKey, iw, ih);
        }
    }

    private _enterStage(stageNum: number): void {
        this._stageNum = Math.max(1, Math.min(DUNGEON_TOTAL_STAGES, stageNum));
        this._stageCfg = getStageConfig(this._stageNum);
        this._floorMap = generateDungeonFloor(this._stageCfg);
        this._curRoomKey = this._floorMap.startKey;

        this._clearRuntimeEntities();
        this._buildSeamlessFloorWorld();

        const startRoom = this._floorMap.rooms.get(this._curRoomKey)!;
        this._crateNodes = this._roomCrateMap.get(startRoom.key) ?? [];
        this._spikeNodes = this._roomSpikeMap.get(startRoom.key) ?? [];
        this._px = startRoom.worldX;
        this._py = startRoom.worldY;
        this._camX = this._px;
        this._camY = this._py;
        this._playerNode.setPosition(this._px, this._py, 0);
        this._worldLayer.setPosition(-this._camX, -this._camY, 0);

        this._rebuildDoorLabels();
        this._redrawMinimap();
        this._refreshHud();
        this._showBanner(`${this._stageCfg.biome.name} ${this._stageCfg.label} · 整层无缝探索`);
    }

    private _clearRuntimeEntities(): void {
        for (const e of this._enemies) {
            if (e.node?.isValid) e.node.destroy();
        }
        this._enemies = [];
        for (const h of this._hazards) { if (h.node?.isValid) h.node.destroy(); }
        this._hazards = [];
        this._pendingWaves = [];
        for (const tg of this._telegraphs) { if (tg.node?.isValid) tg.node.destroy(); }
        this._telegraphs = [];
        for (const p of this._projectiles) { if (p.node?.isValid) p.node.destroy(); }
        this._projectiles = [];
        this._slashArcs = [];
        this._lightningBolts = [];
        this._particles = [];
        this._ringBursts = [];
        for (const sb of this._spriteBursts) { if (sb.node?.isValid) sb.node.destroy(); }
        this._spriteBursts = [];
        for (const d of this._drops) { if (d.node?.isValid) d.node.destroy(); }
        this._drops = [];
        this._dropLayer?.removeAllChildren();
        this._fxSpriteLayer?.removeAllChildren();
        this._hazardGroundLayer?.removeAllChildren();
        for (const ft of this._floatTexts) {
            if (ft.node?.isValid) ft.node.destroy();
        }
        this._floatTexts = [];
        for (const m of this._mines) { if (m.node?.isValid) m.node.destroy(); }
        this._mines = [];
        this._spikeNodes = [];
        this._crateNodes = [];
        this._chestNode = null;
        this._portalNode = null;
        this._roomGateNodes.clear();
        this._roomChestNodes.clear();
        this._roomCrateMap.clear();
        this._roomSpikeMap.clear();
        this._roomFogNodes.clear();
        this._fadingFogs = [];
        this._mechNodes.clear();
        this._iceVx = 0;
        this._iceVy = 0;
        this._hasteTimer = 0;
        this._warpCd = 0;
        this._mistOverlayGfx?.clear();
        this._roomPropsLayer.removeAllChildren();
        this._doorLabelsLayer.removeAllChildren();
        this._roomBaseGfx.clear();
    }

    private _tileFloorRect(parent: Node, artKey: string, cx: number, cy: number, w: number, h: number): void {
        const cols = Math.max(1, Math.round(w / 168));
        const rows = Math.max(1, Math.round(h / 168));
        const tw = w / cols;
        const th = h / rows;
        const startX = cx - w * 0.5 + tw * 0.5;
        const startY = cy - h * 0.5 + th * 0.5;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const tn = this._uiNode('FloorTile', parent);
                const tx = startX + c * tw;
                const ty = startY + r * th;
                tn.setPosition(tx, ty, 0);
                // 确定性哈希打散地砖旋转与镜像，彻底消除机械重复网格感
                const hVal = Math.abs(Math.imul(Math.round(tx) * 73856093 ^ Math.round(ty) * 19349663, 2654435761));
                const rotSteps = hVal % 4;
                const flipX = ((hVal >> 3) & 1) === 1 ? -1 : 1;
                const shade = 232 + ((hVal >> 5) % 24);
                tn.angle = rotSteps * 90;
                tn.setScale(flipX, 1, 1);
                const drawW = (rotSteps % 2 === 1 ? Math.ceil(th) : Math.ceil(tw)) + 3;
                const drawH = (rotSteps % 2 === 1 ? Math.ceil(tw) : Math.ceil(th)) + 3;
                ArtLoader.applySprite(tn, artKey, drawW, drawH, () => {
                    const sp = tn.getChildByName('ArtSprite')?.getComponent(Sprite);
                    if (sp) sp.color = new Color(shade, shade, shade, 255);
                });
            }
        }
    }

    private _placeWallSegment(parent: Node, artKey: string, x1: number, y1: number, x2: number, y2: number, thick: number, horizontal: boolean): void {
        const len = horizontal ? Math.abs(x2 - x1) : Math.abs(y2 - y1);
        if (len < 16) return;
        const segCount = Math.max(1, Math.round(len / 180));
        const step = len / segCount;
        for (let i = 0; i < segCount; i++) {
            const wn = this._uiNode('PerimWall', parent);
            if (horizontal) {
                wn.setPosition(Math.min(x1, x2) + (i + 0.5) * step, y1, 0);
                ArtLoader.applySprite(wn, artKey, Math.ceil(step) + 4, thick);
            } else {
                wn.setPosition(x1, Math.min(y1, y2) + (i + 0.5) * step, 0);
                ArtLoader.applySprite(wn, artKey, thick, Math.ceil(step) + 4);
            }
        }
    }

    private _buildSeamlessFloorWorld(): void {
        const terrain = BIOME_TERRAIN_ART[this._stageCfg?.biome?.id ?? 'bamboo_ruins'] ?? BIOME_TERRAIN_ART.bamboo_ruins;

        this._voidBgGfx.clear();
        this._voidBgGfx.fillColor = terrain.voidBg;
        this._voidBgGfx.rect(-SCREEN_W * 0.6, -SCREEN_H * 0.6, SCREEN_W * 1.2, SCREEN_H * 1.2);
        this._voidBgGfx.fill();

        const floorLayer = this._uiNode('SeamlessFloors', this._roomPropsLayer);
        const wallLayer = this._uiNode('SeamlessWalls', this._roomPropsLayer);
        const propLayer = this._uiNode('SeamlessProps', this._roomPropsLayer);
        const gateLayer = this._uiNode('SeamlessGates', this._roomPropsLayer);

        for (const cor of this._floorMap.corridors) {
            this._tileFloorRect(floorLayer, terrain.floorTile, cor.x, cor.y, cor.w + 18, cor.h + 18);
            const wallThick = 34;
            const trim = 44;
            if (cor.horizontal) {
                this._placeWallSegment(wallLayer, terrain.wallH, cor.x - cor.w * 0.5 + trim, cor.y + cor.h * 0.5 + 14, cor.x + cor.w * 0.5 - trim, cor.y + cor.h * 0.5 + 14, wallThick, true);
                this._placeWallSegment(wallLayer, terrain.wallH, cor.x - cor.w * 0.5 + trim, cor.y - cor.h * 0.5 - 14, cor.x + cor.w * 0.5 - trim, cor.y - cor.h * 0.5 - 14, wallThick, true);
                const ln = this._uiNode('CorridorLantern', propLayer);
                ln.setPosition(cor.x, cor.y + cor.h * 0.5 + 22, 0);
                ArtLoader.applySprite(ln, 'dng_ancient_lantern', 34, 48);
            } else {
                this._placeWallSegment(wallLayer, terrain.wallV, cor.x - cor.w * 0.5 - 14, cor.y - cor.h * 0.5 + trim, cor.x - cor.w * 0.5 - 14, cor.y + cor.h * 0.5 - trim, wallThick, false);
                this._placeWallSegment(wallLayer, terrain.wallV, cor.x + cor.w * 0.5 + 14, cor.y - cor.h * 0.5 + trim, cor.x + cor.w * 0.5 + 14, cor.y + cor.h * 0.5 - trim, wallThick, false);
                const ln = this._uiNode('CorridorLantern', propLayer);
                ln.setPosition(cor.x - cor.w * 0.5 - 20, cor.y, 0);
                ArtLoader.applySprite(ln, 'dng_ancient_lantern', 34, 48);
            }
        }

        const gapHalf = CORRIDOR_W * 0.5;
        const wallThick = 38;
        for (const room of this._floorMap.rooms.values()) {
            this._tileFloorRect(floorLayer, terrain.floorTile, room.worldX, room.worldY, room.halfW * 2, room.halfH * 2);

            const left = room.worldX - room.halfW;
            const right = room.worldX + room.halfW;
            const bot = room.worldY - room.halfH;
            const top = room.worldY + room.halfH;

            if (room.doors.N) {
                this._placeWallSegment(wallLayer, terrain.wallH, left - 18, top + 14, room.worldX - gapHalf, top + 14, wallThick, true);
                this._placeWallSegment(wallLayer, terrain.wallH, room.worldX + gapHalf, top + 14, right + 18, top + 14, wallThick, true);
            } else {
                this._placeWallSegment(wallLayer, terrain.wallH, left - 18, top + 14, right + 18, top + 14, wallThick, true);
            }
            if (room.doors.S) {
                this._placeWallSegment(wallLayer, terrain.wallH, left - 18, bot - 14, room.worldX - gapHalf, bot - 14, wallThick, true);
                this._placeWallSegment(wallLayer, terrain.wallH, room.worldX + gapHalf, bot - 14, right + 18, bot - 14, wallThick, true);
            } else {
                this._placeWallSegment(wallLayer, terrain.wallH, left - 18, bot - 14, right + 18, bot - 14, wallThick, true);
            }
            if (room.doors.W) {
                this._placeWallSegment(wallLayer, terrain.wallV, left - 14, bot - 18, left - 14, room.worldY - gapHalf, wallThick, false);
                this._placeWallSegment(wallLayer, terrain.wallV, left - 14, room.worldY + gapHalf, left - 14, top + 18, wallThick, false);
            } else {
                this._placeWallSegment(wallLayer, terrain.wallV, left - 14, bot - 18, left - 14, top + 18, wallThick, false);
            }
            if (room.doors.E) {
                this._placeWallSegment(wallLayer, terrain.wallV, right + 14, bot - 18, right + 14, room.worldY - gapHalf, wallThick, false);
                this._placeWallSegment(wallLayer, terrain.wallV, right + 14, room.worldY + gapHalf, right + 14, top + 18, wallThick, false);
            } else {
                this._placeWallSegment(wallLayer, terrain.wallV, right + 14, bot - 18, right + 14, top + 18, wallThick, false);
            }

            const gates: Node[] = [];
            const dirs: Dir4[] = ['N', 'S', 'W', 'E'];
            for (const d of dirs) {
                if (!room.doors[d]) continue;
                const gn = this._uiNode(`Gate_${room.key}_${d}`, gateLayer);
                if (d === 'N') { gn.setPosition(room.worldX, top + 8, 0); ArtLoader.applySprite(gn, 'dng_gate_h', CORRIDOR_W + 12, 42); }
                else if (d === 'S') { gn.setPosition(room.worldX, bot - 8, 0); ArtLoader.applySprite(gn, 'dng_gate_h', CORRIDOR_W + 12, 42); }
                else if (d === 'W') { gn.setPosition(left - 8, room.worldY, 0); ArtLoader.applySprite(gn, 'dng_gate_v', 42, CORRIDOR_W + 12); }
                else { gn.setPosition(right + 8, room.worldY, 0); ArtLoader.applySprite(gn, 'dng_gate_v', 42, CORRIDOR_W + 12); }
                gn.active = false;
                gates.push(gn);
            }
            this._roomGateNodes.set(room.key, gates);

            room.pits.forEach((pit, idx) => {
                const pitNode = this._uiNode(`Pit_${room.key}_${idx}`, propLayer);
                pitNode.setPosition(pit.x, pit.y, 0);
                const pitArt = pit.h > pit.w ? terrain.pitV : terrain.pitH;
                ArtLoader.applySprite(pitNode, pitArt, Math.round(pit.w + 14), Math.round(pit.h + 14));
            });

            room.walls.forEach((w, idx) => {
                const wn = this._uiNode(`Wall_${room.key}_${idx}`, propLayer);
                wn.setPosition(w.x, w.y, 0);
                const sh = this._uiNode('Shadow', wn).addComponent(Graphics);
                sh.fillColor = new Color(12, 18, 16, 118);
                sh.roundRect(-w.w / 2 + 2, -w.h / 2 - 5, w.w, w.h + 2, 5);
                sh.fill();
                const wallArt = w.h > w.w ? terrain.wallV : terrain.wallH;
                ArtLoader.applySprite(wn, wallArt, Math.round(w.w + 2), Math.round(w.h + 4));
            });

            room.pillars.forEach((p, idx) => {
                const pn = this._uiNode(`Pillar_${room.key}_${idx}`, propLayer);
                pn.setPosition(p.x, p.y, 0);
                ArtLoader.applySprite(pn, terrain.pillar, 46, 90);
            });

            const rSpikes: { idx: number; node: Node }[] = [];
            room.spikes.forEach((sp, idx) => {
                const sn = this._uiNode(`Spike_${room.key}_${idx}`, propLayer);
                sn.setPosition(sp.x, sp.y, 0);
                ArtLoader.applySprite(sn, 'dng_spike_trap', Math.round(sp.r * 2), Math.round(sp.r * 1.8));
                rSpikes.push({ idx, node: sn });
            });
            this._roomSpikeMap.set(room.key, rSpikes);

            const rCrates: { crateIdx: number; node: Node }[] = [];
            room.crates.forEach((c, idx) => {
                if (c.broken) return;
                const cn = this._uiNode(`Crate_${room.key}_${idx}`, propLayer);
                cn.setPosition(c.x, c.y, 0);
                ArtLoader.applySprite(cn, c.kind === 'barrel' ? 'dng_powder_jar' : 'dng_wood_crate', c.kind === 'barrel' ? 44 : 48, c.kind === 'barrel' ? 56 : 46);
                rCrates.push({ crateIdx: idx, node: cn });
            });
            this._roomCrateMap.set(room.key, rCrates);

            if (room.type === 'treasure') {
                const chestN = this._uiNode(`Chest_${room.key}`, propLayer);
                chestN.setPosition(room.worldX, room.worldY + 18, 0);
                ArtLoader.applySprite(chestN, room.chestOpened ? 'dng_chest_open' : 'dng_chest_closed', 78, 70);
                this._roomChestNodes.set(room.key, chestN);
            } else if (room.type === 'altar') {
                const an = this._uiNode(`Altar_${room.key}`, propLayer);
                an.setPosition(room.worldX, room.worldY + 26, 0);
                const sh = this._uiNode('Shadow', an).addComponent(Graphics);
                sh.fillColor = new Color(10, 16, 18, 115);
                sh.ellipse(0, -76, 58, 16);
                sh.fill();
                ArtLoader.applySprite(an, 'dng_spirit_statue', 144, 178);
                this._addLabel(an, room.altarUsed ? '古灵神像 · 已祈福' : '古灵神像 · 祈福', 15, new Color(165, 250, 232, 255), 0, 98, true, 2);
            } else if (room.type === 'shop') {
                const sn = this._uiNode(`Shop_${room.key}`, propLayer);
                sn.setPosition(room.worldX, room.worldY + 24, 0);
                const sh = this._uiNode('Shadow', sn).addComponent(Graphics);
                sh.fillColor = new Color(10, 14, 16, 110);
                sh.ellipse(0, -56, 62, 16);
                sh.fill();
                ArtLoader.applySprite(sn, 'dng_blacksmith', 144, 140);
                this._addLabel(sn, '秘境铁匠铺', 15, new Color(252, 226, 148, 255), 0, 78, true, 2);
            } else if (room.type === 'fountain') {
                const fn = this._uiNode(`Fountain_${room.key}`, propLayer);
                fn.setPosition(room.worldX, room.worldY + 18, 0);
                ArtLoader.applySprite(fn, 'dng_event_wishing_well', 152, 152);
                this._addLabel(fn, '灵泉许愿池 · 15金祈愿', 15, new Color(138, 248, 232, 255), 0, 88, true, 2);
            } else if (room.type === 'reforge') {
                const rn = this._uiNode(`Reforge_${room.key}`, propLayer);
                rn.setPosition(room.worldX, room.worldY + 18, 0);
                ArtLoader.applySprite(rn, 'dng_event_reforge_furnace', 144, 152);
                this._addLabel(rn, '玄铁重铸炉 · 12金重铸武器', 15, new Color(168, 252, 186, 255), 0, 88, true, 2);
            }

            // 6 大关专属可玩机关渲染
            for (const m of room.mechanics) {
                const mn = this._uiNode(`Mech_${m.kind}_${m.id}`, m.kind === 'ice_floor' || m.kind === 'thunder_pad' || m.kind === 'lava_vent' ? floorLayer : propLayer);
                mn.setPosition(m.x, m.y, 0);
                if (m.kind === 'ice_floor') {
                    const iw = m.w ?? 360;
                    const ih = m.h ?? 220;
                    ArtLoader.applySprite(mn, 'dng_ice_rink', Math.round(iw * 1.12), Math.round(ih * 1.12));
                } else if (m.kind === 'bamboo_clump') {
                    ArtLoader.applySprite(mn, 'dng_prop_bamboo_clump', 72, 72);
                } else if (m.kind === 'lava_vent') {
                    ArtLoader.applySprite(mn, 'dng_prop_lava_vent', 64, 64);
                } else if (m.kind === 'ice_crystal') {
                    ArtLoader.applySprite(mn, 'dng_prop_ice_crystal', 64, 64);
                } else if (m.kind === 'poison_pod') {
                    ArtLoader.applySprite(mn, 'dng_prop_poison_pod', 62, 62);
                } else if (m.kind === 'mist_lamp') {
                    ArtLoader.applySprite(mn, 'dng_ancient_lantern', 46, 62, () => {
                        const sp = mn.getChildByName('ArtSprite')?.getComponent(Sprite);
                        if (sp) sp.color = new Color(140, 148, 165, 255);
                    });
                    this._addLabel(mn, '古灯(攻击点亮)', 11, new Color(216, 220, 235, 220), 0, 40, true, 1.4);
                } else if (m.kind === 'thunder_coil') {
                    ArtLoader.applySprite(mn, 'dng_copper_pillar', 46, 90);
                } else if (m.kind === 'thunder_pad') {
                    ArtLoader.applySprite(mn, 'dng_prop_thunder_pad', 78, 78);
                } else if (m.kind === 'rift_portal') {
                    ArtLoader.applySprite(mn, 'dng_portal_glow', 76, 76);
                    this._addLabel(mn, '裂隙跃迁', 11, new Color(148, 252, 238, 235), 0, 44, true, 1.4);
                } else if (m.kind === 'rift_vortex') {
                    ArtLoader.applySprite(mn, 'dng_rift_vortex', 92, 92);
                }
                this._mechNodes.set(m.id, mn);
            }

            // 未探索房间国风流动云雾迷雾（柔和半透暗纱 + 5 朵生态配色手绘水墨云团，靠近门洞平滑散开！）
            if (!room.visited) {
                const fogN = this._uiNode(`RoomFog_${room.key}`, gateLayer);
                fogN.setPosition(room.worldX, room.worldY, 0);
                fogN.addComponent(UIOpacity).opacity = 255;

                // 纯手绘多层水墨云团遮罩（已彻底移除代码矩形底框）

                // 按 6 大关生态定制云雾色调
                const biomeId = this._stageCfg?.biome?.id ?? 'bamboo_ruins';
                const cloudTint = biomeId === 'magma_cavern'
                    ? new Color(214, 138, 108, 232)
                    : biomeId === 'frost_palace'
                        ? new Color(188, 234, 252, 236)
                        : biomeId === 'mist_marsh'
                            ? new Color(172, 138, 214, 236)
                            : biomeId === 'thunder_pagoda'
                                ? new Color(204, 192, 148, 228)
                                : biomeId === 'rift_altar'
                                    ? new Color(138, 214, 218, 232)
                                    : new Color(176, 216, 206, 236);

                const cw = Math.round(room.halfW * 1.18);
                const ch = Math.round(room.halfH * 1.08);
                const cloudOffsets: [number, number, number, number][] = [
                    [0, 0, 1.18, 1.12],
                    [-room.halfW * 0.42, room.halfH * 0.34, 0.92, 0.88],
                    [room.halfW * 0.42, room.halfH * 0.32, 0.90, 0.86],
                    [-room.halfW * 0.40, -room.halfH * 0.34, 0.90, 0.86],
                    [room.halfW * 0.40, -room.halfH * 0.32, 0.92, 0.88],
                ];
                cloudOffsets.forEach(([ox, oy, sx, sy], cIdx) => {
                    const cn = this._uiNode(`Cloud_${cIdx}`, fogN);
                    cn.setPosition(ox, oy, 0);
                    cn.setScale(cIdx % 2 === 0 ? 1 : -1, 1, 1);
                    ArtLoader.applySprite(cn, 'dng_fog_cloud', Math.round(cw * sx), Math.round(ch * sy), () => {
                        const sp = cn.getChildByName('ArtSprite')?.getComponent(Sprite);
                        if (sp) sp.color = cloudTint;
                    });
                });
                this._roomFogNodes.set(room.key, fogN);
            }
        }
    }

    private _setRoomGatesLocked(roomKey: string, locked: boolean): void {
        const gates = this._roomGateNodes.get(roomKey);
        if (!gates) return;
        for (const g of gates) {
            if (g?.isValid) g.active = locked;
        }
    }

    private _dismissRoomFog(roomKey: string): void {
        const fog = this._roomFogNodes.get(roomKey);
        if (!fog) return;
        this._roomFogNodes.delete(roomKey);
        if (fog.isValid) {
            this._fadingFogs.push({ node: fog, life: 0.48, maxLife: 0.48 });
        }
    }

    private _stepCloudFogs(dt: number): void {
        // 未探索房间的云雾缓慢漂浮呼吸，呈现真实山岚流动感
        let idx = 0;
        for (const fog of this._roomFogNodes.values()) {
            idx++;
            if (!fog?.isValid) continue;
            const pulse = 1 + Math.sin(this._fxTime * 1.4 + idx) * 0.025;
            fog.setScale(pulse, pulse, 1);
            for (let i = 0; i < fog.children.length; i++) {
                const ch = fog.children[i];
                if (ch.name.startsWith('Cloud_')) {
                    ch.angle = Math.sin(this._fxTime * 0.65 + idx + i * 1.3) * 3.5;
                }
            }
        }
        // 正在散开的云雾平滑淡出并向四周扩散
        const kept: { node: Node; life: number; maxLife: number }[] = [];
        for (const f of this._fadingFogs) {
            f.life -= dt;
            if (f.life <= 0 || !f.node?.isValid) {
                if (f.node?.isValid) f.node.destroy();
                continue;
            }
            const t = Math.max(0, f.life / f.maxLife);
            const op = f.node.getComponent(UIOpacity);
            if (op) op.opacity = Math.round(t * 255);
            const sc = 1 + (1 - t) * 0.22;
            f.node.setScale(sc, sc, 1);
            kept.push(f);
        }
        this._fadingFogs = kept;
    }

    private _onPlayerEnteredRoom(room: FloorRoomData): void {
        this._curRoomKey = room.key;
        room.visited = true;
        this._dismissRoomFog(room.key);
        this._crateNodes = this._roomCrateMap.get(room.key) ?? [];
        this._spikeNodes = this._roomSpikeMap.get(room.key) ?? [];
        this._chestNode = this._roomChestNodes.get(room.key) ?? null;

        if (!room.cleared && room.waves.length > 0 && this._enemies.length === 0 && this._telegraphs.length === 0) {
            this._setRoomGatesLocked(room.key, true);
            this._pendingWaves = room.waves.map((w) => [...w]);
            this._spawnNextWave();
            if (room.type === 'boss') {
                this._showBanner(`首领降临 · ${this._stageCfg.biome.name}守关Boss`);
            } else {
                this._showBanner(`${this._stageCfg.biome.name} · ${room.templateName} (${room.shapeTag})`);
            }
        } else if (room.type === 'treasure') {
            this._showBanner(room.chestOpened ? '袖珍宝库 · 已开启' : '发现秘境宝库 · 靠近按 E 开启武器箱');
        } else if (room.type === 'altar') {
            this._showBanner(room.altarUsed ? '古灵神像 · 已祈福' : '发现古灵神像 · 靠近按 E 祈福三选一');
        } else if (room.type === 'shop') {
            this._showBanner('秘境铁匠铺 · 靠近按 E 买补给或升阶武器');
        } else if (room.type === 'fountain') {
            this._showBanner('发现灵泉许愿池 · 靠近按 E 投 15 金随机祈愿');
        } else if (room.type === 'reforge') {
            this._showBanner('发现玄铁重铸炉 · 靠近按 E 投 12 金重铸当前武器');
        } else if ((room.type === 'portal' || room.type === 'boss') && room.cleared) {
            room.portalActive = true;
            this._spawnPortalVisual();
        }

        this._rebuildDoorLabels();
        this._redrawMinimap();
        this._refreshHud();
    }

    private _rebuildDoorLabels(): void {
        this._doorLabelsLayer.removeAllChildren();
        const room = this._floorMap.rooms.get(this._curRoomKey);
        if (!room) return;
        const dirs: Dir4[] = ['N', 'S', 'W', 'E'];
        for (const d of dirs) {
            const targetKey = room.doors[d];
            if (!targetKey) continue;
            const nb = this._floorMap.rooms.get(targetKey);
            if (!nb) continue;
            let status = '未探索';
            let txtCol = new Color(252, 232, 168, 245);
            if (nb.visited) {
                if (nb.type === 'treasure') status = nb.chestOpened ? '已开 ✓' : '未开';
                else if (nb.type === 'altar') status = nb.altarUsed ? '已祈福 ✓' : '未用';
                else status = nb.cleared ? '已清 ✓' : '战斗中';
                txtCol = new Color(165, 242, 212, 235);
            }
            const nameStr = nb.visited || nb.type === 'treasure' || nb.type === 'boss' || nb.type === 'portal' || nb.type === 'shop' || nb.type === 'altar' || nb.type === 'fountain' || nb.type === 'reforge'
                ? ROOM_TYPE_LABEL[nb.type]
                : '未知房间';
            const arrow = d === 'N' ? '↑ ' : d === 'S' ? '↓ ' : d === 'W' ? '← ' : '→ ';
            const lx = room.worldX + (d === 'W' ? -room.halfW + 68 : d === 'E' ? room.halfW - 68 : 0);
            const ly = room.worldY + (d === 'N' ? room.halfH - 22 : d === 'S' ? -room.halfH + 22 : 0);
            this._addLabel(this._doorLabelsLayer, `${arrow}${nameStr}·${status}`, 13, txtCol, lx, ly, true, 1.6);
        }
    }

    private _spawnPortalVisual(): void {
        if (this._portalNode?.isValid) return;
        const room = this._floorMap.rooms.get(this._curRoomKey);
        if (!room) return;
        this._portalNode = this._uiNode('NextFloorPortal', this._roomPropsLayer);
        this._portalNode.setPosition(room.worldX, room.worldY + 20, 0);
        ArtLoader.applySprite(this._portalNode, 'dng_portal_glow', 118, 118);
        this._addLabel(this._portalNode, '传送门 (按E进入下层)', 15, new Color(165, 252, 232, 255), 0, 72, true, 2);
    }

    private _redrawRoomGeometry(): void {
        this._roomBaseGfx.clear();
    }

    private _isPointWalkable(x: number, y: number, pad: number): boolean {
        const curRoom = this._floorMap?.rooms.get(this._curRoomKey);
        if (!curRoom) return false;
        if (!curRoom.cleared) {
            return (
                Math.abs(x - curRoom.worldX) <= curRoom.halfW - pad &&
                Math.abs(y - curRoom.worldY) <= curRoom.halfH - pad
            );
        }
        for (const r of this._floorMap.rooms.values()) {
            if (Math.abs(x - r.worldX) <= r.halfW - pad && Math.abs(y - r.worldY) <= r.halfH - pad) {
                return true;
            }
        }
        for (const c of this._floorMap.corridors) {
            if (Math.abs(x - c.x) <= c.w * 0.5 - (c.horizontal ? 0 : pad) &&
                Math.abs(y - c.y) <= c.h * 0.5 - (c.horizontal ? pad : 0)) {
                return true;
            }
        }
        return false;
    }

    private _isRoomDiscovered(room: FloorRoomData): boolean {
        if (room.visited) return true;
        const dirs: Dir4[] = ['N', 'S', 'W', 'E'];
        for (const d of dirs) {
            const nk = room.doors[d];
            if (nk && this._floorMap.rooms.get(nk)?.visited) return true;
        }
        return false;
    }

    private _redrawMinimap(): void {
        const g = this._minimapGfx;
        g.clear();
        this._minimapOverlayLayer.removeAllChildren();
        if (!this._floorMap) return;

        g.fillColor = new Color(12, 22, 24, 212);
        g.strokeColor = new Color(166, 194, 178, 195);
        g.lineWidth = 2;
        g.roundRect(-76, -60, 152, 120, 10);
        g.fill();
        g.stroke();

        const cell = 26;
        const box = 17;
        const toPos = (gx: number, gy: number): [number, number] => [(gx - 2) * cell, (gy - 2) * cell * 0.86];

        // 仅绘制已发现房间之间的走廊连线
        g.strokeColor = new Color(148, 178, 170, 175);
        g.lineWidth = 2.5;
        for (const r of this._floorMap.rooms.values()) {
            if (!this._isRoomDiscovered(r)) continue;
            const [x1, y1] = toPos(r.gx, r.gy);
            for (const d of ['E', 'N'] as Dir4[]) {
                const nk = r.doors[d];
                if (!nk) continue;
                const nb = this._floorMap.rooms.get(nk);
                if (!nb || !this._isRoomDiscovered(nb)) continue;
                if (!r.visited && !nb.visited) continue;
                const [x2, y2] = toPos(nb.gx, nb.gy);
                g.moveTo(x1, y1);
                g.lineTo(x2, y2);
            }
        }
        g.stroke();

        // 三态房间绘制：未发现隐藏 / 邻房未去(暗灰虚框+?) / 已探索(亮色实心+✓)
        for (const r of this._floorMap.rooms.values()) {
            if (!this._isRoomDiscovered(r)) continue;
            const [cx, cy] = toPos(r.gx, r.gy);

            if (!r.visited) {
                // 未探索邻房：暗灰框 + 问号（特殊房保留微弱色点提示方向）
                g.fillColor = new Color(46, 56, 60, 210);
                g.strokeColor = new Color(146, 166, 168, 185);
                g.lineWidth = 1.5;
                g.roundRect(cx - box / 2, cy - box / 2, box, box, 3);
                g.fill();
                g.stroke();

                const mark = r.type === 'treasure' ? '箱' : r.type === 'boss' ? '首' : r.type === 'portal' ? '门' : r.type === 'shop' ? '铁' : r.type === 'altar' ? '神' : '?';
                const mCol = r.type === 'treasure'
                    ? new Color(252, 212, 92, 235)
                    : r.type === 'boss'
                    ? new Color(252, 102, 102, 240)
                    : r.type === 'portal'
                    ? new Color(196, 152, 255, 240)
                    : new Color(204, 218, 218, 220);
                this._addLabel(this._minimapOverlayLayer, mark, 10, mCol, cx, cy, true, 0);
            } else {
                // 已探索房间：实心亮色（宝箱开过或神像用过后变柔和灰绿）
                let fill = new Color(82, 168, 144, 240);
                if (r.type === 'start') fill = new Color(64, 186, 148, 245);
                else if (r.type === 'treasure') fill = r.chestOpened ? new Color(116, 114, 92, 220) : new Color(246, 198, 68, 245);
                else if (r.type === 'altar') fill = r.altarUsed ? new Color(92, 116, 128, 220) : new Color(86, 182, 248, 245);
                else if (r.type === 'shop') fill = new Color(244, 142, 72, 245);
                else if (r.type === 'boss') fill = new Color(235, 68, 78, 250);
                else if (r.type === 'portal') fill = new Color(172, 112, 246, 250);

                g.fillColor = fill;
                g.roundRect(cx - box / 2, cy - box / 2, box, box, 3);
                g.fill();

                if (r.cleared && r.key !== this._curRoomKey) {
                    this._addLabel(this._minimapOverlayLayer, '✓', 10, new Color(250, 255, 252, 245), cx, cy, true, 0);
                }
            }

            if (r.key === this._curRoomKey) {
                g.strokeColor = new Color(255, 255, 255, 255);
                g.lineWidth = 2.6;
                g.roundRect(cx - box / 2 - 2, cy - box / 2 - 2, box + 4, box + 4, 4);
                g.stroke();
            }
        }

        const cur = this._floorMap.rooms.get(this._curRoomKey);
        if (cur) {
            this._minimapRoomLbl.string = `${ROOM_TYPE_LABEL[cur.type]}${cur.cleared ? ' · 已探索 ✓' : ' · 战斗中'}`;
        }
    }

    private _spawnSpriteFx(
        artKey: string,
        x: number,
        y: number,
        w: number,
        h: number,
        angleDeg: number,
        duration: number,
        startScale: number,
        endScale: number,
        spinSpeed = 0,
        tint?: Color,
        flipY = false
    ): void {
        const n = this._uiNode('FxSpr', this._fxSpriteLayer);
        n.setPosition(x, y, 0);
        n.angle = angleDeg;
        n.setScale(startScale, flipY ? -startScale : startScale, 1);
        const col = tint ?? new Color(255, 255, 255, 255);
        const entry: SpriteFxBurst = {
            node: n,
            sp: null,
            life: duration,
            maxLife: duration,
            startScale,
            endScale,
            spinSpeed,
            baseColor: col,
            flipY,
        };
        ArtLoader.applySprite(n, artKey, w, h, () => {
            const sp = n.getChildByName('ArtSprite')?.getComponent(Sprite) ?? null;
            if (sp) {
                sp.color = new Color(col.r, col.g, col.b, col.a);
                entry.sp = sp;
            }
        });
        this._spriteBursts.push(entry);
    }

    private _spawnPlayerAfterimage(): void {
        const curSp = this._playerSpriteNode.getChildByName('ArtSprite')?.getComponent(Sprite);
        const sf = curSp?.spriteFrame ?? this._idleSprites.side;
        if (!sf) return;
        const n = this._uiNode('DodgeGhost', this._fxSpriteLayer);
        n.setPosition(this._px, this._py + 12, 0);
        n.setScale(this._facingX, 1, 1);
        n.addComponent(UITransform).setContentSize(50, 64);
        const sp = n.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        sp.spriteFrame = sf;
        const col = new Color(116, 244, 218, 155);
        sp.color = col;
        this._spriteBursts.push({
            node: n,
            sp,
            life: 0.20,
            maxLife: 0.20,
            startScale: 1.0,
            endScale: 0.92,
            spinSpeed: 0,
            baseColor: col,
            flipY: false,
        });
    }

    private _createProjNode(kind: Projectile['kind'], x: number, y: number, angDeg: number): Node {
        const n = this._uiNode(`Proj_${kind}`, this._fxSpriteLayer);
        n.setPosition(x, y, 0);
        n.angle = angDeg;
        if (kind === 'arrow') {
            ArtLoader.applySprite(n, 'fx_proj_arrow', 54, 15);
        } else if (kind === 'homing') {
            ArtLoader.applySprite(n, 'fx_proj_arrow', 56, 16, () => {
                const sp = n.getChildByName('ArtSprite')?.getComponent(Sprite);
                if (sp) sp.color = new Color(196, 158, 255, 255);
            });
        } else if (kind === 'fire') {
            ArtLoader.applySprite(n, 'fx_proj_fire', 48, 18);
        } else if (kind === 'frost') {
            ArtLoader.applySprite(n, 'fx_proj_frost', 56, 18);
        } else if (kind === 'sword_wave') {
            ArtLoader.applySprite(n, 'fx_slash_jade', 76, 72);
        } else if (kind === 'enemy_sniper') {
            ArtLoader.applySprite(n, 'fx_proj_arrow', 64, 18, () => {
                const sp = n.getChildByName('ArtSprite')?.getComponent(Sprite);
                if (sp) sp.color = new Color(255, 118, 108, 255);
            });
        } else {
            ArtLoader.applySprite(n, 'fx_enemy_orb', 28, 28, () => {
                if (kind === 'enemy_homing') {
                    const sp = n.getChildByName('ArtSprite')?.getComponent(Sprite);
                    if (sp) sp.color = new Color(138, 224, 255, 255);
                }
            });
        }
        return n;
    }

    private _spawnNextWave(): void {
        const wave = this._pendingWaves.shift();
        if (!wave || wave.length === 0) return;

        const room = this._floorMap.rooms.get(this._curRoomKey);
        if (!room) return;
        wave.forEach((entry, idx) => {
            const angle = (idx / Math.max(1, wave.length)) * Math.PI * 2 + Math.random() * 0.6;
            const dist = 135 + Math.random() * 175;
            let sx = room.worldX + Math.cos(angle) * dist;
            let sy = room.worldY + Math.sin(angle) * (dist * 0.58);
            if (Math.hypot(sx - this._px, sy - this._py) < 135) {
                sx = room.worldX - (sx - room.worldX) * 0.85;
                sy = room.worldY - (sy - room.worldY) * 0.85;
            }
            sx = Math.max(room.worldX - room.halfW + 70, Math.min(room.worldX + room.halfW - 70, sx));
            sy = Math.max(room.worldY - room.halfH + 62, Math.min(room.worldY + room.halfH - 62, sy));
            // 避开深坑与石墙内部刷怪
            if (room) {
                for (const pit of room.pits) {
                    if (Math.abs(sx - pit.x) < pit.w * 0.5 + 24 && Math.abs(sy - pit.y) < pit.h * 0.5 + 24) {
                        sx = sx >= pit.x ? pit.x + pit.w * 0.5 + 32 : pit.x - pit.w * 0.5 - 32;
                    }
                }
                for (const w of room.walls) {
                    if (Math.abs(sx - w.x) < w.w * 0.5 + 24 && Math.abs(sy - w.y) < w.h * 0.5 + 24) {
                        sy = sy >= w.y ? w.y + w.h * 0.5 + 32 : w.y - w.h * 0.5 - 32;
                    }
                }
            }
            const tgNode = this._uiNode('SpawnCircle', this._fxSpriteLayer);
            tgNode.setPosition(sx, sy, 0);
            tgNode.setScale(0.35, 0.25, 1);
            ArtLoader.applySprite(tgNode, 'fx_magic_circle', entry.elite ? 104 : 84, entry.elite ? 104 : 84);
            this._telegraphs.push({ x: sx, y: sy, kind: entry.kind, elite: !!entry.elite, timer: 0.68, maxTimer: 0.68, node: tgNode });
        });
    }

    private _materializeEnemy(kind: EnemyKind, x: number, y: number, isElite = false): void {
        const stat = ENEMY_STATS[kind] ?? ENEMY_STATS.bamboo_imp;
        const hpMult = calcStageHpMult(this._stageNum);
        const eliteMult = isElite && !stat.isBoss ? 2.15 : 1.0;
        const maxHp = Math.max(32, Math.round(stat.baseHp * hpMult * (stat.isBoss ? 1.35 : 0.98) * eliteMult));

        const en = this._uiNode(`Enemy_${this._nextEnemyId}`, this._entityLayer);
        en.setPosition(x, y, 0);

        const sh = this._uiNode('Shadow', en).addComponent(Graphics);
        sh.fillColor = new Color(10, 16, 18, 120);
        sh.ellipse(0, -stat.radius * 0.7, stat.radius * 0.85, stat.radius * 0.36);
        sh.fill();

        const scaleFactor = isElite && !stat.isBoss ? 1.24 : 1.0;
        const sprH = Math.round((stat.isBoss ? 120 : 66) * scaleFactor);
        const rig = new MonsterRigView(en, kind, stat.archetype, stat.spritePrefix, !!stat.isBoss, isElite && !stat.isBoss);
        const spNode = rig.bodySpriteHost;

        const hpBarGfx = this._uiNode('HpBar', en).addComponent(Graphics);
        hpBarGfx.node.setPosition(0, sprH * 0.62, 0);

        const enemy: ActiveEnemy = {
            id: this._nextEnemyId++,
            kind,
            archetype: stat.archetype,
            name: stat.name,
            x,
            y,
            vx: 0,
            vy: 0,
            hp: maxHp,
            maxHp,
            shieldHp: 0,
            speed: stat.speed * (stat.isBoss ? 0.92 : 0.96),
            radius: stat.isBoss ? 34 : 21,
            isBoss: !!stat.isBoss,
            isElite: isElite && !stat.isBoss,
            skillToggle: 0,
            atkTimer: (isElite ? 0.65 : 0.85) + Math.random() * 0.75,
            windupTimer: 0,
            windupKind: 'none',
            windupAimAngle: 0,
            rushTimer: 0,
            stunTimer: 0,
            blinkHiddenTimer: 0,
            trailTick: 0,
            danmakuPattern: 0,
            bossSkillIdx: 0,
            bossEnraged: false,
            flashTimer: 0,
            squashTimer: 0,
            freezeTimer: 0,
            burnTimer: 0,
            burnTick: 0,
            animTimer: 0,
            animFrame: 0,
            facingX: 1,
            node: en,
            spriteNode: spNode,
            rig,
            hpBarGfx,
            spritePrefix: stat.spritePrefix,
        };
        this._enemies.push(enemy);
        this._drawEnemyHpBar(enemy);
        this._ringBursts.push({ x, y, r: 8, maxR: 44, life: 0.28, maxLife: 0.28, color: new Color(250, 120, 110, 210) });
    }

    private _drawEnemyHpBar(e: ActiveEnemy): void {
        const g = e.hpBarGfx;
        g.clear();
        if (e.isBoss || e.blinkHiddenTimer > 0) return;
        const bw = 42;
        const bh = 6;
        const ratio = Math.max(0, e.hp / Math.max(1, e.maxHp));
        g.fillColor = new Color(18, 22, 24, 210);
        g.roundRect(-bw / 2, 0, bw, bh, 2);
        g.fill();
        g.fillColor = e.freezeTimer > 0 ? new Color(103, 232, 249, 250) : new Color(238, 76, 76, 250);
        g.roundRect(-bw / 2 + 1, 1, Math.max(0, (bw - 2) * ratio), bh - 2, 1.5);
        g.fill();
        if (e.shieldHp > 0) {
            g.strokeColor = new Color(108, 214, 255, 245);
            g.lineWidth = 1.6;
            g.roundRect(-bw / 2 - 1, -1, bw + 2, bh + 2, 2.5);
            g.stroke();
        }
    }

    private _onKeyDown(e: EventKeyboard): void {
        if (!this._isOpen) return;
        this._keys.add(e.keyCode);
        if (this._modalOpen) return;
        if (e.keyCode === KeyCode.KEY_K || e.keyCode === KeyCode.SHIFT_LEFT) {
            this._queueDodge();
        } else if (e.keyCode === KeyCode.KEY_Q) {
            this._switchWeapon();
        } else if (e.keyCode === KeyCode.KEY_E) {
            this._tryInteract();
        }
    }

    private _onKeyUp(e: EventKeyboard): void {
        this._keys.delete(e.keyCode);
    }

    private _onMouseMove(e: EventMouse): void {
        if (!this._isOpen || this._modalOpen) return;
        const loc = e.getUILocation();
        this._mouseScreenX = loc.x - SCREEN_W * 0.5;
        this._mouseScreenY = loc.y - SCREEN_H * 0.5;
        this._mouseAimX = this._mouseScreenX + this._camX;
        this._mouseAimY = this._mouseScreenY + this._camY;
        this._mouseAimTimer = 2.6;
    }

    private _onMouseDown(e: EventMouse): void {
        if (!this._isOpen || this._modalOpen) return;
        const loc = e.getUILocation();
        this._mouseScreenX = loc.x - SCREEN_W * 0.5;
        this._mouseScreenY = loc.y - SCREEN_H * 0.5;
        this._mouseAimX = this._mouseScreenX + this._camX;
        this._mouseAimY = this._mouseScreenY + this._camY;
        this._mouseAimTimer = 2.6;
        if (e.getButton() === EventMouse.BUTTON_LEFT) {
            if (this._mouseScreenX > 190 && (this._mouseScreenY > 275 || this._mouseScreenY < -90)) return;
            this._attackHeld = true;
        } else if (e.getButton() === EventMouse.BUTTON_RIGHT) {
            this._queueDodge();
        }
    }

    private _onMouseUp(e: EventMouse): void {
        if (e.getButton() === EventMouse.BUTTON_LEFT) {
            this._attackHeld = false;
        }
    }

    private _switchWeapon(): void {
        if (this._modalOpen) return;
        this._activeWeaponIdx = this._activeWeaponIdx === 0 ? 1 : 0;
        this._comboStep = 0;
        this._syncHeldWeaponSprite();
        this._refreshHud();
        this._spawnFloatText(this._px, this._py + 38, getWeaponDisplayName(this._weapons[this._activeWeaponIdx]), new Color(252, 232, 152, 255), 14);
    }

    private _queueDodge(): void {
        if (this._modalOpen) return;
        this._dodgeBuffer = 0.14;
    }

    private _executeDodge(): void {
        let dx = this._joyDir.x;
        let dy = this._joyDir.y;
        if (this._keys.has(KeyCode.KEY_A) || this._keys.has(KeyCode.ARROW_LEFT)) dx -= 1;
        if (this._keys.has(KeyCode.KEY_D) || this._keys.has(KeyCode.ARROW_RIGHT)) dx += 1;
        if (this._keys.has(KeyCode.KEY_W) || this._keys.has(KeyCode.ARROW_UP)) dy += 1;
        if (this._keys.has(KeyCode.KEY_S) || this._keys.has(KeyCode.ARROW_DOWN)) dy -= 1;
        const len = Math.hypot(dx, dy);
        if (len > 0.05) {
            this._dodgeDir.set(dx / len, dy / len);
        } else {
            this._dodgeDir.set(Math.cos(this._aimAngle), Math.sin(this._aimAngle));
        }
        // 翻滚瞬间同步人物朝向，彻底告别翻完身面朝反方向的僵硬感
        if (Math.abs(this._dodgeDir.x) > 0.08) {
            this._facingX = this._dodgeDir.x < 0 ? -1 : 1;
        }
        this._dodgeTimer = 0.23;
        this._invulnTimer = Math.max(this._invulnTimer, 0.30);
        this._dodgeCd = 0.86;
        this._dodgeBuffer = 0;
        AudioManager.inst.playSfx('tap');
    }

    private _getActiveWeapon(): WeaponInstance {
        return this._weapons[this._activeWeaponIdx];
    }

    private _findNearestEnemy(maxRange: number): ActiveEnemy | null {
        let best: ActiveEnemy | null = null;
        let bestD = maxRange;
        for (const e of this._enemies) {
            if (e.hp <= 0 || e.blinkHiddenTimer > 0) continue;
            const d = Math.hypot(e.x - this._px, e.y - this._py);
            if (d < bestD) {
                bestD = d;
                best = e;
            }
        }
        return best;
    }

    private _performAttack(): void {
        const inst = this._getActiveWeapon();
        const def = getWeaponDef(inst.id);
        if (this._energy < def.energyCost) {
            this._spawnFloatText(this._px, this._py + 36, '灵力不足! (Q切青竹剑)', new Color(148, 210, 255, 255), 14);
            this._atkCd = 0.35;
            return;
        }

        this._energy -= def.energyCost;
        this._atkCd = def.cooldown;
        this._weaponRecoil = 1.0;

        // 攻击瞬间同步左右朝向
        const aimCos = Math.cos(this._aimAngle);
        if (Math.abs(aimCos) > 0.05) this._facingX = aimCos < 0 ? -1 : 1;

        const baseDmg = getWeaponDamage(inst, this._buffs.dmgMult);
        const critRate = getWeaponCrit(inst, this._buffs.critBonus);
        const rollCrit = (): [number, boolean] => {
            const isCrit = Math.random() < critRate;
            return [isCrit ? Math.round(baseDmg * 1.85) : baseDmg, isCrit];
        };

        const mainColor = hexToColor(def.colorHex, 255);
        const accentColor = hexToColor(def.accentHex, 255);

        if (def.kind === 'melee') {
            this._comboStep = (this._comboStep + 1) % 3;
            this._meleeSwingTimer = 0.22;
            this._meleeSwingSign = this._meleeSwingSign === 1 ? -1 : 1;
            const isFinisher = this._comboStep === 0;
            const slashR = (def.range + this._buffs.meleeRangeBonus) * (isFinisher ? 1.18 : 1.0);
            const span = isFinisher ? 2.45 : 1.95;
            const deg = (this._aimAngle * 180) / Math.PI;
            const slashSize = Math.round(slashR * 1.48);
            this._spawnSpriteFx(
                'fx_slash_jade',
                this._px + Math.cos(this._aimAngle) * 28,
                this._py + Math.sin(this._aimAngle) * 28,
                slashSize,
                slashSize,
                deg,
                0.20,
                0.78,
                isFinisher ? 1.24 : 1.08,
                this._meleeSwingSign * 110,
                isFinisher ? new Color(150, 255, 232, 255) : new Color(235, 255, 246, 255),
                this._meleeSwingSign < 0
            );
            AudioManager.inst.playSfx('hit');

            let slashedCount = 0;
            this._projectiles = this._projectiles.filter((p) => {
                if (p.fromPlayer) return true;
                const d = Math.hypot(p.x - this._px, p.y - this._py);
                if (d > slashR + 14) return true;
                const ang = Math.atan2(p.y - this._py, p.x - this._px);
                let diff = ang - this._aimAngle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                if (Math.abs(diff) <= span * 0.62) {
                    if (p.node?.isValid) p.node.destroy();
                    slashedCount++;
                    this._emitParticles(p.x, p.y, 6, mainColor, 160);
                    return false;
                }
                return true;
            });
            if (slashedCount > 0) {
                this._spawnFloatText(this._px, this._py + 42, `劈弹×${slashedCount}`, new Color(130, 252, 224, 255), 14);
            }

            for (const e of this._enemies) {
                if (e.hp <= 0 || e.blinkHiddenTimer > 0) continue;
                const d = Math.hypot(e.x - this._px, e.y - this._py);
                if (d > slashR + e.radius) continue;
                const ang = Math.atan2(e.y - this._py, e.x - this._px);
                let diff = ang - this._aimAngle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                if (Math.abs(diff) <= span * 0.62) {
                    const [dmg, isCrit] = rollCrit();
                    this._damageEnemy(e, isFinisher ? Math.round(dmg * 1.35) : dmg, isCrit, Math.cos(ang) * 190, Math.sin(ang) * 190, this._px);
                }
            }
            this._damageCratesInRadius(this._px + Math.cos(this._aimAngle) * 55, this._py + Math.sin(this._aimAngle) * 55, slashR * 0.72, baseDmg);

            if (isFinisher) {
                const [dmg, isCrit] = rollCrit();
                const swx = this._px + Math.cos(this._aimAngle) * 28;
                const swy = this._py + Math.sin(this._aimAngle) * 28;
                this._projectiles.push({
                    fromPlayer: true,
                    kind: 'sword_wave',
                    node: this._createProjNode('sword_wave', swx, swy, (this._aimAngle * 180) / Math.PI),
                    x: swx,
                    y: swy,
                    vx: Math.cos(this._aimAngle) * def.projSpeed,
                    vy: Math.sin(this._aimAngle) * def.projSpeed,
                    damage: Math.round(dmg * 1.2),
                    isCrit,
                    radius: 26,
                    life: 0.58,
                    maxLife: 0.58,
                    pierceLeft: 6,
                    color: mainColor,
                    accent: accentColor,
                    trail: [],
                    hitIds: new Set(),
                });
            }
            return;
        }

        if (def.kind === 'lightning') {
            AudioManager.inst.playSfx('boom');
            this._triggerShake(0.14, 5.5);
            const maxJumps = def.burstCount + this._buffs.extraShot;
            const visited = new Set<number>();
            let curX = this._px + Math.cos(this._aimAngle) * 28;
            let curY = this._py + Math.sin(this._aimAngle) * 28;

            let hitAny = false;
            for (let j = 0; j < maxJumps; j++) {
                let target: ActiveEnemy | null = null;
                let bestD = j === 0 ? def.range : 260;
                for (const e of this._enemies) {
                    if (e.hp <= 0 || e.blinkHiddenTimer > 0 || visited.has(e.id)) continue;
                    const d = Math.hypot(e.x - curX, e.y - curY);
                    if (d < bestD) { bestD = d; target = e; }
                }
                if (!target) break;
                hitAny = true;
                visited.add(target.id);
                this._spawnLightningBolt(curX, curY, target.x, target.y, mainColor);
                const [dmg, isCrit] = rollCrit();
                this._damageEnemy(target, Math.round(dmg * (j === 0 ? 1.0 : 0.82)), isCrit, 0, 0, curX);
                this._ringBursts.push({ x: target.x, y: target.y, r: 8, maxR: 38, life: 0.20, maxLife: 0.20, color: accentColor });
                curX = target.x;
                curY = target.y;
            }
            if (!hitAny) {
                const tx = this._px + Math.cos(this._aimAngle) * 240;
                const ty = this._py + Math.sin(this._aimAngle) * 240;
                this._spawnLightningBolt(curX, curY, tx, ty, mainColor);
                this._damageCratesInRadius(tx, ty, 64, baseDmg);
            }
            return;
        }

        AudioManager.inst.playSfx(def.kind === 'shotgun' ? 'boom' : 'tap');
        if (def.kind === 'shotgun') this._triggerShake(0.10, 4.0);
        const count = def.burstCount + this._buffs.extraShot;
        const spreadRad = (def.spreadDeg * Math.PI) / 180;
        const muzzleX = this._px + Math.cos(this._aimAngle) * 30;
        const muzzleY = this._py + Math.sin(this._aimAngle) * 30;
        this._emitParticles(muzzleX, muzzleY, def.kind === 'shotgun' ? 8 : 4, accentColor, 150);

        for (let i = 0; i < count; i++) {
            const frac = count === 1 ? 0 : i / (count - 1) - 0.5;
            const jitter = (Math.random() - 0.5) * 0.05;
            const ang = this._aimAngle + frac * spreadRad + jitter;
            const [dmg, isCrit] = rollCrit();
            const projKind =
                def.kind === 'shotgun' ? 'fire' :
                def.kind === 'frost' ? 'frost' :
                def.kind === 'homing' ? 'homing' : 'arrow';
            const life = def.range / Math.max(120, def.projSpeed);

            this._projectiles.push({
                fromPlayer: true,
                kind: projKind,
                node: this._createProjNode(projKind, muzzleX, muzzleY, (ang * 180) / Math.PI),
                x: muzzleX,
                y: muzzleY,
                vx: Math.cos(ang) * def.projSpeed,
                vy: Math.sin(ang) * def.projSpeed,
                damage: dmg,
                isCrit,
                radius: projKind === 'frost' ? 11 : projKind === 'fire' ? 10 : 9,
                life,
                maxLife: life,
                pierceLeft: projKind === 'frost' ? 3 : projKind === 'homing' ? 2 : 1,
                color: mainColor,
                accent: accentColor,
                trail: [{ x: muzzleX, y: muzzleY }],
                hitIds: new Set(),
            });
        }
    }

    private _spawnLightningBolt(x1: number, y1: number, x2: number, y2: number, color: Color): void {
        const segs = 6;
        const pts: { x: number; y: number }[] = [{ x: x1, y: y1 }];
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.max(1, Math.hypot(dx, dy));
        const nx = -dy / len;
        const ny = dx / len;
        for (let i = 1; i < segs; i++) {
            const t = i / segs;
            const off = (Math.random() - 0.5) * 34;
            pts.push({ x: x1 + dx * t + nx * off, y: y1 + dy * t + ny * off });
        }
        pts.push({ x: x2, y: y2 });
        this._lightningBolts.push({ pts, life: 0.20, maxLife: 0.20, color });
    }

    private _emitParticles(x: number, y: number, count: number, color: Color, speed: number): void {
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = speed * (0.4 + Math.random() * 0.8);
            this._particles.push({
                x,
                y,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp,
                r: 2.5 + Math.random() * 3.2,
                life: 0.24 + Math.random() * 0.22,
                maxLife: 0.46,
                color,
            });
        }
    }

    private _spawnFloatText(x: number, y: number, text: string, color: Color, fontSize = 16): void {
        const n = this._uiNode('FT', this._floatTextLayer);
        n.setPosition(x + (Math.random() - 0.5) * 18, y, 0);
        const lbl = n.addComponent(Label);
        lbl.string = text;
        lbl.fontSize = fontSize;
        lbl.lineHeight = fontSize + 4;
        lbl.isBold = true;
        lbl.color = color;
        const ol = n.addComponent(LabelOutline);
        ol.color = new Color(12, 16, 18, 240);
        ol.width = 2;
        this._floatTexts.push({ node: n, lbl, x: n.position.x, y, vy: 52, life: 0.68, maxLife: 0.68 });
    }

    private _triggerShake(duration: number, intensity: number): void {
        this._shakeTime = Math.max(this._shakeTime, duration);
        this._shakeIntensity = Math.max(this._shakeIntensity, intensity);
    }

    private _damageEnemy(e: ActiveEnemy, dmg: number, isCrit: boolean, kbX: number, kbY: number, hitFromX: number): void {
        if (e.hp <= 0 || e.blinkHiddenTimer > 0) return;

        // 重甲盾卫正面举盾格挡（非硬直期间正面受击减伤 68%）
        let finalDmg = dmg;
        if (e.archetype === 'shield' && e.stunTimer <= 0 && !e.isBoss) {
            const hitFromFront = (hitFromX - e.x) * e.facingX > 0;
            if (hitFromFront) {
                finalDmg = Math.max(1, Math.round(dmg * 0.32));
                this._emitParticles(e.x + e.facingX * 16, e.y, 6, new Color(142, 214, 255, 255), 140);
                this._spawnFloatText(e.x, e.y + 34, `格挡 -${finalDmg}`, new Color(156, 218, 255, 255), 13);
            }
        }

        // 召唤师赋予的临时灵盾优先吸收伤害
        if (e.shieldHp > 0) {
            const abs = Math.min(e.shieldHp, finalDmg);
            e.shieldHp -= abs;
            finalDmg -= abs;
        }

        if (finalDmg > 0) {
            e.hp -= finalDmg;
            if (!(e.archetype === 'shield' && e.stunTimer <= 0 && (hitFromX - e.x) * e.facingX > 0)) {
                this._spawnFloatText(
                    e.x,
                    e.y + 28,
                    isCrit ? `暴击 -${finalDmg}` : `-${finalDmg}`,
                    isCrit ? new Color(255, 216, 78, 255) : new Color(255, 250, 242, 255),
                    isCrit ? 20 : 15
                );
            }
        }

        e.flashTimer = 0.11;
        e.squashTimer = 0.14;
        if (!e.isBoss) {
            const kbMult = e.isElite ? 0.25 : 1.0;
            e.vx += kbX * kbMult;
            e.vy += kbY * kbMult;
        }
        this._drawEnemyHpBar(e);
        this._spawnSpriteFx(
            'fx_burst_explosion', e.x, e.y,
            isCrit ? 76 : 48, isCrit ? 76 : 48,
            Math.random() * 360, 0.18, 0.55, isCrit ? 1.25 : 0.95, 90,
            isCrit ? new Color(255, 225, 110, 255) : new Color(255, 244, 220, 220)
        );
        if (isCrit) {
            this._triggerShake(0.08, 3.4);
            this._hitStopTimer = Math.max(this._hitStopTimer, 0.028);
        }

        // Boss 半血触发狂暴二阶段
        if (e.isBoss && !e.bossEnraged && e.hp > 0 && e.hp <= e.maxHp * 0.5) {
            e.bossEnraged = true;
            e.speed *= 1.24;
            this._triggerShake(0.25, 7.5);
            this._ringBursts.push({ x: e.x, y: e.y, r: 16, maxR: 130, life: 0.42, maxLife: 0.42, color: new Color(255, 86, 72, 245) });
            this._spawnFloatText(e.x, e.y + 56, '首领狂暴！', new Color(255, 112, 88, 255), 22);
        }

        if (e.hp <= 0) {
            this._onEnemyKilled(e);
        }
    }

    private _onEnemyKilled(e: ActiveEnemy): void {
        AudioManager.inst.playSfx(e.isBoss ? 'boom' : 'hit');
        this._triggerShake(e.isBoss ? 0.28 : 0.10, e.isBoss ? 9 : 3.5);
        this._emitParticles(e.x, e.y, e.isBoss ? 26 : 12, new Color(142, 245, 216, 255), 220);
        this._hitStopTimer = Math.max(this._hitStopTimer, e.isBoss ? 0.08 : 0.025);
        this._spawnSpriteFx('fx_burst_explosion', e.x, e.y, e.isBoss ? 185 : 96, e.isBoss ? 185 : 96, Math.random() * 360, 0.30, 0.45, 1.35, 120);

        const goldCount = e.isBoss ? 8 : e.isElite ? 5 : 2;
        for (let i = 0; i < goldCount; i++) this._spawnDrop('gold', e.x, e.y, e.isBoss ? 5 : 3);
        const energyCount = e.isBoss ? 6 : 2;
        for (let i = 0; i < energyCount; i++) this._spawnDrop('energy', e.x, e.y, 10 + this._buffs.killEnergyBonus);
        if (e.isBoss || e.isElite || Math.random() < 0.26) this._spawnDrop('iron', e.x, e.y, e.isBoss ? 4 : e.isElite ? 2 : 1);
        if (e.isBoss || Math.random() < 0.12) this._spawnDrop('heal', e.x, e.y, 2);

        if (e.node?.isValid) e.node.destroy();
    }

    private _spawnDrop(kind: DropOrb['kind'], x: number, y: number, amount: number): void {
        const a = Math.random() * Math.PI * 2;
        const sp = 75 + Math.random() * 95;
        const n = this._uiNode(`Drop_${kind}`, this._dropLayer);
        n.setPosition(x, y, 0);
        const sh = this._uiNode('Shadow', n).addComponent(Graphics);
        sh.fillColor = new Color(10, 16, 18, 110);
        sh.ellipse(0, -10, 10, 4.5);
        sh.fill();
        const artKey = kind === 'gold' ? 'drop_gold' : kind === 'energy' ? 'drop_energy' : kind === 'heal' ? 'drop_heal' : 'drop_iron';
        const sz = kind === 'energy' ? 24 : 28;
        ArtLoader.applySprite(n, artKey, sz, sz);
        this._drops.push({
            kind,
            node: n,
            x,
            y,
            z: 8,
            vz: 145 + Math.random() * 65,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            amount,
            life: 20,
        });
    }

    private _damageCratesInRadius(cx: number, cy: number, radius: number, dmg: number): void {
        const room = this._floorMap.rooms.get(this._curRoomKey);
        if (!room) return;
        this._damageBiomeMechanicsInRadius(room, cx, cy, radius, dmg);
        room.crates.forEach((c, idx) => {
            if (c.broken) return;
            if (Math.hypot(c.x - cx, c.y - cy) <= radius + 24) {
                c.hp -= dmg;
                this._emitParticles(c.x, c.y, 5, new Color(235, 195, 130, 255), 120);
                if (c.hp <= 0) {
                    c.broken = true;
                    const entry = this._crateNodes.find((cn) => cn.crateIdx === idx);
                    if (entry?.node?.isValid) entry.node.destroy();
                    if (c.kind === 'barrel') {
                        AudioManager.inst.playSfx('boom');
                        this._triggerShake(0.22, 8.5);
                        this._spawnSpriteFx('fx_burst_explosion', c.x, c.y, 195, 195, Math.random() * 360, 0.36, 0.40, 1.38, 110);
                        this._emitParticles(c.x, c.y, 22, new Color(255, 168, 72, 255), 260);
                        for (const e of this._enemies) {
                            if (e.hp > 0 && Math.hypot(e.x - c.x, e.y - c.y) <= 145) {
                                this._damageEnemy(e, Math.round(45 * this._buffs.dmgMult), true, 0, 0, c.x);
                            }
                        }
                    } else {
                        this._spawnDrop('energy', c.x, c.y, 12);
                        this._spawnDrop('gold', c.x, c.y, 4);
                    }
                }
            }
        });
    }

    private _damagePlayer(amount: number): void {
        if (this._invulnTimer > 0) return;
        this._invulnTimer = 0.72;
        this._shieldRegenDelay = 4.5;
        this._triggerShake(0.16, 6.5);
        AudioManager.inst.playSfx('hit');

        let rem = amount;
        if (this._shield > 0) {
            const absorbed = Math.min(this._shield, rem);
            this._shield -= absorbed;
            rem -= absorbed;
            this._spawnFloatText(this._px, this._py + 36, `护盾 -${absorbed}`, new Color(138, 206, 255, 255), 16);
            this._ringBursts.push({ x: this._px, y: this._py, r: 10, maxR: 46, life: 0.25, maxLife: 0.25, color: new Color(120, 198, 255, 225) });
        }
        if (rem > 0) {
            this._hp = Math.max(0, this._hp - rem);
            this._spawnFloatText(this._px, this._py + 52, `-${rem}`, new Color(255, 92, 92, 255), 19);
        }
        this._refreshHud();

        if (this._hp <= 0) {
            this._showRunEndModal(false);
        }
    }

    protected update(dt: number): void {
        if (!this._isOpen) return;
        const clampedDt = Math.min(0.05, dt);
        this._fxTime += clampedDt;

        if (this._bannerTimer > 0) {
            this._bannerTimer -= clampedDt;
            if (this._bannerTimer <= 0) this._bannerNode.active = false;
        }

        if (this._modalOpen) return;
        if (this._hitStopTimer > 0) { this._hitStopTimer -= clampedDt; return; }

        const lookX = this._mouseAimTimer > 0 ? Math.max(-68, Math.min(68, this._mouseScreenX * 0.10)) : 0;
        const lookY = this._mouseAimTimer > 0 ? Math.max(-42, Math.min(42, this._mouseScreenY * 0.10)) : 0;
        let targetCamX = this._px + lookX;
        let targetCamY = this._py + lookY;
        // 房内防黑边软限位：在房间内部战斗/走动时尽量居中当前房，避免屏幕半边露出大片虚空黑边
        const camRoom = this._floorMap?.rooms.get(this._curRoomKey);
        if (camRoom) {
            const insideRoom = Math.abs(this._px - camRoom.worldX) <= camRoom.halfW - 12 &&
                Math.abs(this._py - camRoom.worldY) <= camRoom.halfH - 12;
            if (insideRoom || !camRoom.cleared) {
                const maxOffX = Math.max(24, camRoom.halfW - 430);
                const maxOffY = Math.max(16, camRoom.halfH - 220);
                targetCamX = Math.max(camRoom.worldX - maxOffX, Math.min(camRoom.worldX + maxOffX, targetCamX));
                targetCamY = Math.max(camRoom.worldY - maxOffY, Math.min(camRoom.worldY + maxOffY, targetCamY));
            }
        }
        const camLerp = Math.min(1, clampedDt * 8.2);
        this._camX += (targetCamX - this._camX) * camLerp;
        this._camY += (targetCamY - this._camY) * camLerp;
        if (this._mouseAimTimer > 0) {
            this._mouseAimX = this._mouseScreenX + this._camX;
            this._mouseAimY = this._mouseScreenY + this._camY;
        }
        let shakeX = 0;
        let shakeY = 0;
        if (this._shakeTime > 0) {
            this._shakeTime -= clampedDt;
            const s = this._shakeIntensity * Math.max(0, this._shakeTime * 4);
            shakeX = (Math.random() - 0.5) * s * 2;
            shakeY = (Math.random() - 0.5) * s * 2;
        }
        this._worldLayer.setPosition(-this._camX + shakeX, -this._camY + shakeY, 0);

        this._stepPlayer(clampedDt);
        this._stepTelegraphs(clampedDt);
        this._stepEnemies(clampedDt);
        this._stepHazards(clampedDt);
        this._stepBiomeMechanics(clampedDt);
        this._stepCloudFogs(clampedDt);
        this._stepProjectiles(clampedDt);
        this._stepDropsAndFx(clampedDt);
        this._checkRoomClearAndDoors();
        this._renderDynamicFx();
        this._refreshHud();
    }

    private _stepPlayer(dt: number): void {
        if (this._atkCd > 0) this._atkCd -= dt;
        if (this._dodgeCd > 0) this._dodgeCd -= dt;
        if (this._dodgeBuffer > 0) this._dodgeBuffer -= dt;
        if (this._invulnTimer > 0) this._invulnTimer -= dt;
        if (this._doorCooldown > 0) this._doorCooldown -= dt;
        if (this._mouseAimTimer > 0) this._mouseAimTimer -= dt;
        if (this._weaponRecoil > 0) this._weaponRecoil = Math.max(0, this._weaponRecoil - dt * 6);
        if (this._meleeSwingTimer > 0) this._meleeSwingTimer = Math.max(0, this._meleeSwingTimer - dt);

        // 翻滚输入缓冲生效
        if (this._dodgeBuffer > 0 && this._dodgeCd <= 0) {
            this._executeDodge();
        }

        // 脱战护盾自动回复
        if (this._shield < this._maxShield) {
            if (this._shieldRegenDelay > 0) {
                this._shieldRegenDelay -= dt;
            } else {
                this._shieldRegenTick += dt;
                if (this._shieldRegenTick >= 0.65) {
                    this._shieldRegenTick = 0;
                    this._shield = Math.min(this._maxShield, this._shield + 1);
                    this._ringBursts.push({ x: this._px, y: this._py, r: 8, maxR: 34, life: 0.24, maxLife: 0.24, color: new Color(110, 198, 255, 190) });
                }
            }
        }

        let vx = this._joyDir.x;
        let vy = this._joyDir.y;
        if (this._keys.has(KeyCode.KEY_A) || this._keys.has(KeyCode.ARROW_LEFT)) vx -= 1;
        if (this._keys.has(KeyCode.KEY_D) || this._keys.has(KeyCode.ARROW_RIGHT)) vx += 1;
        if (this._keys.has(KeyCode.KEY_W) || this._keys.has(KeyCode.ARROW_UP)) vy += 1;
        if (this._keys.has(KeyCode.KEY_S) || this._keys.has(KeyCode.ARROW_DOWN)) vy -= 1;

        const moveSpeed = 262 + this._buffs.speedBonus;
        let moving = false;
        let moveX = 0;
        let moveY = 0;
        if (this._dodgeTimer > 0) {
            this._dodgeTimer -= dt;
            moveX = this._dodgeDir.x * 560 * dt;
            moveY = this._dodgeDir.y * 560 * dt;
            moving = true;
            if (Math.floor(this._dodgeTimer * 24) !== Math.floor((this._dodgeTimer + dt) * 24)) this._spawnPlayerAfterimage();
        } else {
            const len = Math.hypot(vx, vy);
            if (len > 0.05) {
                vx /= len;
                vy /= len;
                moveX = vx * moveSpeed * dt;
                moveY = vy * moveSpeed * dt;
                moving = true;
            }
        }

        // 第 3 大关寒玉冰宫：踩在冰面上带惯性漂移，走位手感彻底区分！
        const iceRoom = this._floorMap?.rooms.get(this._curRoomKey);
        let onIce = false;
        if (iceRoom && this._dodgeTimer <= 0) {
            for (const m of iceRoom.mechanics) {
                if (m.kind === 'ice_floor' && m.w && m.h &&
                    Math.abs(this._px - m.x) <= m.w * 0.5 && Math.abs(this._py - m.y) <= m.h * 0.5) {
                    onIce = true;
                    break;
                }
            }
        }
        if (onIce) {
            const targetVx = dt > 0.0001 ? moveX / dt : 0;
            const targetVy = dt > 0.0001 ? moveY / dt : 0;
            const blend = Math.min(1, dt * 3.4);
            this._iceVx += (targetVx - this._iceVx) * blend;
            this._iceVy += (targetVy - this._iceVy) * blend;
            moveX = this._iceVx * dt;
            moveY = this._iceVy * dt;
        } else {
            this._iceVx *= Math.max(0, 1 - dt * 10);
            this._iceVy *= Math.max(0, 1 - dt * 10);
        }

        const nextX = this._px + moveX;
        if (this._isPointWalkable(nextX, this._py, PLAYER_RADIUS)) {
            this._px = nextX;
        }
        const nextY = this._py + moveY;
        if (this._isPointWalkable(this._px, nextY, PLAYER_RADIUS)) {
            this._py = nextY;
        }
        const activeRoom = this._floorMap?.rooms.get(this._curRoomKey);
        if (activeRoom && !activeRoom.cleared) {
            this._px = Math.max(activeRoom.worldX - activeRoom.halfW + PLAYER_RADIUS, Math.min(activeRoom.worldX + activeRoom.halfW - PLAYER_RADIUS, this._px));
            this._py = Math.max(activeRoom.worldY - activeRoom.halfH + PLAYER_RADIUS, Math.min(activeRoom.worldY + activeRoom.halfH - PLAYER_RADIUS, this._py));
        }

        const room = this._floorMap.rooms.get(this._curRoomKey);
        if (room) {
            for (const p of room.pillars) {
                const dx = this._px - p.x;
                const dy = this._py - p.y;
                const minDist = p.r + PLAYER_RADIUS - 2;
                const d = Math.hypot(dx, dy);
                if (d > 0.001 && d < minDist) {
                    this._px = p.x + (dx / d) * minDist;
                    this._py = p.y + (dy / d) * minDist;
                }
            }
            // 连片矮石墙矩形推离碰撞
            const pushOutRect = (rx: number, ry: number, rw: number, rh: number, pad: number) => {
                const hw = rw * 0.5 + pad;
                const hh = rh * 0.5 + pad;
                const dx = this._px - rx;
                const dy = this._py - ry;
                if (Math.abs(dx) < hw && Math.abs(dy) < hh) {
                    const ox = hw - Math.abs(dx);
                    const oy = hh - Math.abs(dy);
                    if (ox < oy) this._px += dx >= 0 ? ox : -ox;
                    else this._py += dy >= 0 ? oy : -oy;
                }
            };
            for (const w of room.walls) {
                pushOutRect(w.x, w.y, w.w, w.h, PLAYER_RADIUS - 2);
            }
            // 深坑断崖：走路被阻挡，但翻滚（this._dodgeTimer > 0）可直接凌空跃过！
            if (this._dodgeTimer <= 0) {
                for (const pit of room.pits) {
                    pushOutRect(pit.x, pit.y, pit.w, pit.h, PLAYER_RADIUS - 4);
                }
            }
            // 周期性定时地刺（0~2.2s 安全缩回 / 2.2~2.75s 抖动预警 / 2.75~4.0s 弹出致命）
            room.spikes.forEach((sp, idx) => {
                const phase = (this._fxTime + sp.phaseOffset) % 4.0;
                const sn = this._spikeNodes.find((s) => s.idx === idx)?.node;
                const spr = sn?.getChildByName('ArtSprite')?.getComponent(Sprite);
                if (spr) {
                    if (phase < 2.2) spr.color = new Color(128, 138, 134, 135);
                    else if (phase < 2.75) spr.color = new Color(252, 206, 108, 225);
                    else spr.color = new Color(255, 118, 106, 255);
                }
                if (phase >= 2.75 && this._dodgeTimer <= 0 && Math.hypot(this._px - sp.x, this._py - sp.y) < sp.r * 0.72) {
                    this._damagePlayer(1);
                }
            });
        }

        this._playerNode.setPosition(this._px, this._py, 0);

        // 丝滑瞄准优先级：PC 鼠标指向 > 射程内最近敌人自动锁敌 > 当前移动方向
        const locked = this._findNearestEnemy(620);
        if (this._mouseAimTimer > 0) {
            this._aimAngle = Math.atan2(this._mouseAimY - this._py, this._mouseAimX - this._px);
        } else if (locked) {
            this._aimAngle = Math.atan2(locked.y - this._py, locked.x - this._px);
        } else if (moving && Math.hypot(moveX, moveY) > 0.01) {
            this._aimAngle = Math.atan2(moveY, moveX);
        }

        // 元气骑士式瞬时左右朝向（彻底消除 front/back 卡死与转不过来）
        if (this._mouseAimTimer > 0 || locked) {
            const c = Math.cos(this._aimAngle);
            if (Math.abs(c) > 0.08) this._facingX = c < 0 ? -1 : 1;
        } else if (Math.abs(moveX) > 0.05) {
            this._facingX = moveX < 0 ? -1 : 1;
        }

        // 驱动 Cocos 原生 2D 分段骨骼（60fps 真迈步 + 360° 团身翻滚 + 前臂武器挥砍与后坐力）
        const isDodging = this._dodgeTimer > 0;
        const dodgeProg = isDodging ? 1 - Math.max(0, this._dodgeTimer / 0.23) : 0;
        this._playerRig.step({
            dt,
            moving,
            moveX,
            moveY,
            facingX: this._facingX,
            aimAngle: this._aimAngle,
            dodging: isDodging,
            dodgeProgress: dodgeProg,
            weaponDef: getWeaponDef(this._getActiveWeapon().id),
            meleeSwingTimer: this._meleeSwingTimer,
            meleeSwingMax: 0.22,
            meleeSwingSign: this._meleeSwingSign,
            weaponRecoil: this._weaponRecoil,
        });
        // 跑步与翻滚脚下轻柔扬尘
        if (moving && Math.random() < (isDodging ? 0.55 : 0.18)) {
            this._emitParticles(this._px, this._py - 16, isDodging ? 3 : 1, new Color(228, 224, 212, 185), isDodging ? 95 : 42);
        }

        const wantAtk = this._attackHeld || this._keys.has(KeyCode.KEY_J) || this._keys.has(KeyCode.SPACE);
        if (wantAtk && this._atkCd <= 0) {
            this._performAttack();
        }
    }

    private _updateHeldWeaponTransform(): void {
        const def = getWeaponDef(this._getActiveWeapon().id);
        const aimLeft = Math.cos(this._aimAngle) < 0;
        const breathe = Math.sin(this._fxTime * 4.5) * 2.5;

        // 1. 青云飞剑匣：背负/悬浮在角色身后（层级置于角色身体之后，发射时轻震）
        if (def.kind === 'homing') {
            this._playerWeaponPivot.setSiblingIndex(1); // 阴影(0)之上、角色(2)之后
            const hoverY = 18 + Math.sin(this._fxTime * 3.8) * 3.5;
            const kickBack = this._weaponRecoil * 4;
            this._playerWeaponPivot.setPosition(-this._facingX * (18 + kickBack), hoverY, 0);
            this._playerWeaponPivot.angle = this._facingX > 0 ? (-14 + breathe * 0.5) : (14 - breathe * 0.5);
            this._playerWeaponPivot.setScale(this._facingX, 1, 1);
            this._playerWeaponSpriteNode.setPosition(0, 0, 0);
            return;
        }

        // 其余手持武器均置于角色前手层（最前）
        this._playerWeaponPivot.setSiblingIndex(2);

        // 2. 青竹斩灵剑：平时握于前手 42° 斜举戒备，挥砍时大弧度扫过
        if (def.kind === 'melee') {
            this._playerWeaponPivot.setPosition(this._facingX * 10, 4, 0);
            if (this._meleeSwingTimer > 0) {
                const prog = 1 - this._meleeSwingTimer / 0.22;
                const deg = (this._aimAngle * 180) / Math.PI + (-72 + prog * 154) * this._meleeSwingSign;
                this._playerWeaponPivot.angle = deg;
                this._playerWeaponPivot.setScale(1, aimLeft ? -1 : 1, 1);
                this._playerWeaponSpriteNode.setPosition(22, 0, 0);
            } else {
                const readyDeg = this._facingX > 0 ? (42 + breathe) : (138 - breathe);
                this._playerWeaponPivot.angle = readyDeg;
                this._playerWeaponPivot.setScale(1, this._facingX < 0 ? -1 : 1, 1);
                this._playerWeaponSpriteNode.setPosition(16, 2, 0);
            }
            return;
        }

        // 3. 九天惊雷杖：平时 68° 执杖立于身侧，施法瞬间前指落雷
        if (def.kind === 'lightning') {
            const casting = this._weaponRecoil > 0.05;
            this._playerWeaponPivot.setPosition(this._facingX * 11, 5, 0);
            const deg = casting
                ? (this._aimAngle * 180) / Math.PI
                : (this._facingX > 0 ? (68 + breathe) : (112 - breathe));
            this._playerWeaponPivot.angle = deg;
            this._playerWeaponPivot.setScale(1, (casting ? aimLeft : this._facingX < 0) ? -1 : 1, 1);
            this._playerWeaponSpriteNode.setPosition(casting ? (20 - this._weaponRecoil * 6) : 14, 0, 0);
            return;
        }

        // 4. 玄冰散华扇：平时轻摇握于胸前，释放冰棱瞬间向前甩扇展开
        if (def.kind === 'frost') {
            this._playerWeaponPivot.setPosition(this._facingX * 12, 6, 0);
            const fanSwing = this._weaponRecoil > 0.05 ? (-35 + (1 - this._weaponRecoil) * 75) : Math.sin(this._fxTime * 3.2) * 8;
            const deg = this._facingX > 0 ? (15 + fanSwing) : (-15 - fanSwing);
            this._playerWeaponPivot.angle = deg;
            this._playerWeaponPivot.setScale(this._facingX, 1, 1);
            this._playerWeaponSpriteNode.setPosition(8, 2, 0);
            return;
        }

        // 5. 疾风竹连弩 / 爆炎赤火铳：双手端持于身前随瞄准方向转动，开火向后震动回弹
        this._playerWeaponPivot.setPosition(this._facingX * 9, 4, 0);
        const deg = (this._aimAngle * 180) / Math.PI + (this._weaponRecoil > 0.05 ? 0 : breathe * 0.5);
        this._playerWeaponPivot.angle = deg;
        this._playerWeaponPivot.setScale(1, aimLeft ? -1 : 1, 1);
        this._playerWeaponSpriteNode.setPosition(16 - this._weaponRecoil * 7, 0, 0);
    }

    private _stepTelegraphs(dt: number): void {
        const remaining: SpawnTelegraph[] = [];
        for (const tg of this._telegraphs) {
            tg.timer -= dt;
            const prog = 1 - Math.max(0, tg.timer / tg.maxTimer);
            if (tg.node?.isValid) {
                tg.node.angle += dt * 160;
                const sc = 0.35 + prog * 0.72;
                tg.node.setScale(sc, sc * 0.72, 1);
            }
            if (tg.timer <= 0) {
                if (tg.node?.isValid) tg.node.destroy();
                this._materializeEnemy(tg.kind, tg.x, tg.y, tg.elite);
            } else {
                remaining.push(tg);
            }
        }
        this._telegraphs = remaining;
    }

    private _stepHazards(dt: number): void {
        // 墨灵延迟引爆「墨印定时雷」
        const keptMines: DelayedMine[] = [];
        for (const m of this._mines) {
            m.timer -= dt;
            if (m.node?.isValid) {
                m.node.angle += dt * 190;
                const prog = 1 - Math.max(0, m.timer / m.maxTimer);
                const sc = 0.75 + prog * 0.35;
                m.node.setScale(sc, sc * 0.76, 1);
            }
            if (m.timer <= 0) {
                if (m.node?.isValid) m.node.destroy();
                AudioManager.inst.playSfx('boom');
                this._triggerShake(0.14, 4.5);
                this._spawnSpriteFx('fx_burst_explosion', m.x, m.y, m.r * 2.2, m.r * 2.2, Math.random() * 360, 0.28, 0.45, 1.25, 110, new Color(216, 128, 255, 245));
                if (Math.hypot(this._px - m.x, this._py - m.y) < m.r) {
                    this._damagePlayer(1);
                }
            } else {
                keptMines.push(m);
            }
        }
        this._mines = keptMines;

        const kept: HazardZone[] = [];
        for (const h of this._hazards) {
            h.life -= dt;
            if (h.life <= 0) {
                if (h.node?.isValid) h.node.destroy();
                continue;
            }
            if (h.node?.isValid) {
                const age = h.maxLife - h.life;
                const popT = Math.min(1, age / 0.18);
                const fadeT = Math.min(1, h.life / 0.65);
                const op = h.node.getComponent(UIOpacity);
                if (op) op.opacity = Math.round(fadeT * (h.kind === 'frost' ? 158 : 178));
                const s = 0.76 + popT * 0.24;
                const sx = h.node.scale.x < 0 ? -s : s;
                h.node.setScale(sx, s, 1);
            }
            h.tick -= dt;
            if (h.tick <= 0 && Math.hypot(this._px - h.x, this._py - h.y) < h.r) {
                h.tick = 0.55;
                this._damagePlayer(1);
            }
            kept.push(h);
        }
        this._hazards = kept;
    }

    private _spawnHazardZone(x: number, y: number, r: number, life: number, kind: 'fire' | 'poison' | 'frost'): void {
        const hn = this._uiNode(`Hazard_${kind}`, this._hazardGroundLayer);
        hn.setPosition(x, y, 0);
        hn.angle = Math.random() * 360;
        const flip = Math.random() < 0.5 ? -1 : 1;
        hn.setScale(flip * 0.76, 0.76, 1);
        hn.addComponent(UIOpacity).opacity = kind === 'frost' ? 158 : 178;
        const artKey = kind === 'frost' ? 'fx_hazard_frost' : kind === 'poison' ? 'fx_hazard_poison' : 'fx_hazard_fire';
        const jitter = 0.86 + Math.random() * 0.26;
        const sz = Math.round(r * 2.25 * jitter);
        ArtLoader.applySprite(hn, artKey, sz, sz);
        this._hazards.push({ x, y, r, life, maxLife: life, kind, tick: 0.1, node: hn });
    }

    private _stepEnemies(dt: number): void {
        const alive: ActiveEnemy[] = [];
        for (const e of this._enemies) {
            if (e.hp <= 0) continue;
            alive.push(e);

            if (e.flashTimer > 0) e.flashTimer -= dt;
            if (e.freezeTimer > 0) e.freezeTimer -= dt;
            if (e.stunTimer > 0) e.stunTimer -= dt;
            if (e.burnTimer > 0) {
                e.burnTimer -= dt;
                e.burnTick += dt;
                if (e.burnTick >= 0.45) {
                    e.burnTick = 0;
                    this._damageEnemy(e, 5, false, 0, 0, e.x);
                    if (e.hp <= 0) continue;
                }
            }

            // 潜行瞬移型钻地隐身阶段
            if (e.blinkHiddenTimer > 0) {
                e.blinkHiddenTimer -= dt;
                e.node.active = false;
                if (e.blinkHiddenTimer <= 0) {
                    // 现身在玩家侧后方 82px 处并发动近身斩击
                    const backA = Math.random() * Math.PI * 2;
                    const br = this._floorMap?.rooms.get(this._curRoomKey);
                    const bxMin = br ? br.worldX - br.halfW + 40 : -ROOM_HALF_W + 40;
                    const bxMax = br ? br.worldX + br.halfW - 40 : ROOM_HALF_W - 40;
                    const byMin = br ? br.worldY - br.halfH + 40 : -ROOM_HALF_H + 40;
                    const byMax = br ? br.worldY + br.halfH - 40 : ROOM_HALF_H - 40;
                    e.x = Math.max(bxMin, Math.min(bxMax, this._px + Math.cos(backA) * 82));
                    e.y = Math.max(byMin, Math.min(byMax, this._py + Math.sin(backA) * 82));
                    e.node.active = true;
                    e.node.setPosition(e.x, e.y, 0);
                    this._ringBursts.push({ x: e.x, y: e.y, r: 8, maxR: 48, life: 0.25, maxLife: 0.25, color: new Color(196, 128, 255, 235) });
                    const angToP = Math.atan2(this._py - e.y, this._px - e.x);
                    this._spawnSpriteFx(
                        'fx_slash_jade', e.x + Math.cos(angToP) * 18, e.y + Math.sin(angToP) * 18,
                        96, 96, (angToP * 180) / Math.PI, 0.22, 0.72, 1.18, 120,
                        new Color(255, 86, 138, 245)
                    );
                    if (Math.hypot(this._px - e.x, this._py - e.y) < 76) this._damagePlayer(1);
                }
                continue;
            }

            const prevX = e.x;
            const prevY = e.y;
            const rigTint = e.flashTimer > 0
                ? new Color(255, 185, 185, 255)
                : e.freezeTimer > 0
                    ? new Color(150, 232, 255, 255)
                    : e.bossEnraged
                        ? new Color(255, 198, 180, 255)
                        : e.isElite
                            ? new Color(255, 244, 212, 255)
                            : new Color(255, 255, 255, 255);

            const speedScale = e.freezeTimer > 0 ? 0.35 : e.stunTimer > 0 ? 0.1 : 1.0;
            const dx = this._px - e.x;
            const dy = this._py - e.y;
            const dist = Math.max(1, Math.hypot(dx, dy));
            if (e.windupTimer <= 0 && e.rushTimer <= 0) {
                e.facingX = dx < 0 ? -1 : 1;
            }

            // 突进型冲刺中
            if (e.rushTimer > 0) {
                e.rushTimer -= dt;
                e.x += Math.cos(e.windupAimAngle) * 440 * dt;
                e.y += Math.sin(e.windupAimAngle) * 440 * dt;
                if (e.rushTimer <= 0) {
                    // 冲刺末端近战爪击弧光
                    this._spawnSpriteFx(
                        'fx_slash_jade', e.x + Math.cos(e.windupAimAngle) * 20, e.y + Math.sin(e.windupAimAngle) * 20,
                        88, 88, (e.windupAimAngle * 180) / Math.PI, 0.20, 0.70, 1.15, 130,
                        new Color(255, 112, 86, 245)
                    );
                    if (Math.hypot(this._px - e.x, this._py - e.y) < 68) this._damagePlayer(1);
                }
            } else {
                e.vx *= Math.max(0, 1 - dt * 8);
                e.vy *= Math.max(0, 1 - dt * 8);

                // 按 6 大原型定制走位逻辑
                if (e.windupTimer <= 0 && e.stunTimer <= 0) {
                    if (e.archetype === 'danmaku' || e.archetype === 'summoner' || e.archetype === 'sniper') {
                        const ideal = e.archetype === 'sniper' ? 305 : e.archetype === 'summoner' ? 280 : 215;
                        if (dist > ideal + 25) {
                            e.x += (dx / dist) * e.speed * speedScale * dt;
                            e.y += (dy / dist) * e.speed * speedScale * dt;
                        } else if (dist < ideal - 45) {
                            e.x -= (dx / dist) * e.speed * 0.75 * speedScale * dt;
                            e.y -= (dy / dist) * e.speed * 0.75 * speedScale * dt;
                        } else {
                            // 侧向拉扯游走
                            const side = e.id % 2 === 0 ? 1 : -1;
                            e.x += (-dy / dist) * side * e.speed * 0.55 * speedScale * dt;
                            e.y += (dx / dist) * side * e.speed * 0.55 * speedScale * dt;
                        }
                    } else if (e.archetype === 'trail') {
                        // 地形留痕型：高速斜穿并沿途留下火焰/毒雾
                        e.x += (dx / dist) * e.speed * 1.15 * speedScale * dt;
                        e.y += (dy / dist) * e.speed * 1.15 * speedScale * dt;
                        e.trailTick -= dt;
                        if (e.trailTick <= 0 && this._hazards.length < 10) {
                            const tooClose = this._hazards.some((h) => Math.hypot(h.x - e.x, h.y - e.y) < 60);
                            if (!tooClose) {
                                e.trailTick = 0.65;
                                const bid = this._stageCfg.biome.id;
                                const hKind: 'fire' | 'poison' | 'frost' = bid === 'frost_palace'
                                    ? 'frost'
                                    : (bid === 'mist_marsh' || bid === 'bamboo_ruins')
                                        ? 'poison'
                                        : 'fire';
                                this._spawnHazardZone(e.x, e.y, 32, 2.3, hKind);
                            } else {
                                e.trailTick = 0.22;
                            }
                        }
                    } else if (dist > 44) {
                        e.x += (dx / dist) * e.speed * speedScale * dt;
                        e.y += (dy / dist) * e.speed * speedScale * dt;
                    }
                }
                e.x += e.vx * dt;
                e.y += e.vy * dt;
            }

            // 怪物地形碰撞：石墙/石柱阻挡所有怪，深潭水池阻挡全部非悬浮双足怪（附切向绕行滑步，彻底杜绝踩进水池）
            const curRoom = this._floorMap?.rooms.get(this._curRoomKey);
            if (curRoom) {
                const isFloatingEnemy = !e.isBoss && (e.kind === 'ink_spirit' || e.archetype === 'danmaku' || e.archetype === 'blink');
                const pushEnemyRect = (rx: number, ry: number, rw: number, rh: number, pad: number): void => {
                    const hw = rw * 0.5 + pad;
                    const hh = rh * 0.5 + pad;
                    const ddx = e.x - rx;
                    const ddy = e.y - ry;
                    if (Math.abs(ddx) < hw && Math.abs(ddy) < hh) {
                        const ox = hw - Math.abs(ddx);
                        const oy = hh - Math.abs(ddy);
                        if (ox < oy) {
                            e.x += ddx >= 0 ? ox : -ox;
                            // 沿水池/石墙竖边切向绕行，避免死顶墙面
                            const slideDir = this._py >= e.y ? 1 : -1;
                            e.y += slideDir * e.speed * 0.45 * dt;
                        } else {
                            e.y += ddy >= 0 ? oy : -oy;
                            const slideDir = this._px >= e.x ? 1 : -1;
                            e.x += slideDir * e.speed * 0.45 * dt;
                        }
                    }
                };
                for (const w of curRoom.walls) {
                    pushEnemyRect(w.x, w.y, w.w, w.h, e.radius - 2);
                }
                if (!isFloatingEnemy) {
                    for (const pit of curRoom.pits) {
                        pushEnemyRect(pit.x, pit.y, pit.w, pit.h, e.radius - 2);
                    }
                }
                for (const p of curRoom.pillars) {
                    const pdx = e.x - p.x;
                    const pdy = e.y - p.y;
                    const pd = Math.hypot(pdx, pdy);
                    const minD = e.radius + p.r - 2;
                    if (pd > 0.01 && pd < minD) {
                        e.x = p.x + (pdx / pd) * minD;
                        e.y = p.y + (pdy / pd) * minD;
                    }
                }
            }

            if (curRoom) {
                e.x = Math.max(curRoom.worldX - curRoom.halfW + e.radius, Math.min(curRoom.worldX + curRoom.halfW - e.radius, e.x));
                e.y = Math.max(curRoom.worldY - curRoom.halfH + e.radius, Math.min(curRoom.worldY + curRoom.halfH - e.radius, e.y));
            }
            e.node.setPosition(e.x, e.y, 0);

            e.animTimer += dt;
            if (e.animTimer >= 0.15) {
                e.animTimer -= 0.15;
                e.animFrame = (e.animFrame + 1) % 4;
                const frames = this._enemyFrames.get(e.spritePrefix);
                if (frames && frames[e.animFrame]) e.rig.setBodySpriteFrame(frames[e.animFrame]!);
            }
            if (e.squashTimer > 0) e.squashTimer = Math.max(0, e.squashTimer - dt);
            const eMoveX = e.x - prevX;
            const eMoveY = e.y - prevY;
            const movedDist = Math.hypot(eMoveX, eMoveY);
            e.rig.step({
                dt,
                moving: movedDist > 0.25,
                moveX: eMoveX,
                moveY: eMoveY,
                facingX: e.facingX,
                aimAngle: e.windupTimer > 0 ? e.windupAimAngle : Math.atan2(dy, dx),
                windupTimer: e.windupTimer,
                windupKind: e.windupKind,
                rushTimer: e.rushTimer,
                stunTimer: e.stunTimer,
                squashTimer: e.squashTimer,
                tint: rigTint,
            });

            if (dist < e.radius + PLAYER_RADIUS - 2) {
                this._damagePlayer(e.isBoss ? 2 : 1);
            }

            // 攻击蓄力与释放
            if (e.windupTimer > 0) {
                e.windupTimer -= dt;
                if (e.windupKind === 'sniper' && e.windupTimer > 0.27) {
                    e.windupAimAngle = Math.atan2(this._py - e.y, this._px - e.x);
                    e.facingX = Math.cos(e.windupAimAngle) < 0 ? -1 : 1;
                }
                if (e.windupTimer <= 0) {
                    this._executeEnemySkill(e);
                }
            } else if (e.rushTimer <= 0 && e.stunTimer <= 0) {
                e.atkTimer -= dt * speedScale * (e.bossEnraged ? 1.32 : 1.0);
                if (e.atkTimer <= 0) {
                    this._startEnemyWindup(e, Math.atan2(dy, dx));
                }
            }
        }
        this._enemies = alive;
    }

    private _startEnemyWindup(e: ActiveEnemy, aimAngle: number): void {
        e.windupAimAngle = aimAngle;
        if (e.isBoss) {
            const skill = e.bossSkillIdx % 3;
            e.bossSkillIdx++;
            if (skill === 0) {
                e.windupKind = 'danmaku';
                e.windupTimer = 0.40;
            } else if (skill === 1) {
                e.windupKind = 'boss_ring';
                e.windupTimer = 0.48;
                this._spawnSpriteFx('fx_magic_circle', e.x, e.y, 136, 136, 0, 0.48, 0.55, 1.15, 160, new Color(255, 110, 120, 215));
            } else {
                e.windupKind = 'boss_slam';
                e.windupTimer = 0.65;
                this._spawnSpriteFx('fx_magic_circle', e.x, e.y, 260, 200, 0, 0.65, 0.45, 1.05, 130, new Color(255, 96, 72, 225));
            }
            e.atkTimer = 1.65;
            return;
        }

        switch (e.archetype) {
            case 'rush':
                e.windupKind = 'rush';
                e.windupTimer = 0.45;
                e.atkTimer = 2.1 + Math.random() * 0.6;
                this._spawnSpriteFx('fx_magic_circle', e.x, e.y - 6, 76, 54, 0, 0.45, 0.55, 1.05, 180, new Color(255, 110, 86, 215));
                break;
            case 'danmaku':
                e.windupKind = 'danmaku';
                e.windupTimer = 0.34;
                e.atkTimer = 1.9 + Math.random() * 0.7;
                break;
            case 'shield':
                e.windupKind = 'slam';
                e.windupTimer = 0.55;
                e.atkTimer = 2.6 + Math.random() * 0.6;
                this._spawnSpriteFx('fx_magic_circle', e.x, e.y - 4, 210, 160, 0, 0.55, 0.45, 1.05, 140, new Color(255, 148, 76, 220));
                break;
            case 'blink':
                e.windupKind = 'blink';
                e.windupTimer = 0.30;
                e.atkTimer = 2.8 + Math.random() * 0.7;
                break;
            case 'sniper':
                e.windupKind = 'sniper';
                e.windupTimer = 1.05;
                e.atkTimer = 2.5 + Math.random() * 0.6;
                break;
            case 'summoner':
                e.windupKind = 'danmaku';
                e.windupTimer = 0.42;
                e.atkTimer = 2.7 + Math.random() * 0.6;
                break;
            case 'trail':
            default:
                e.windupKind = 'rush';
                e.windupTimer = 0.35;
                e.atkTimer = 2.2 + Math.random() * 0.6;
                break;
        }
    }

    private _executeEnemySkill(e: ActiveEnemy): void {
        const ang = e.windupAimAngle;
        const kind = e.windupKind;
        e.windupKind = 'none';

        e.skillToggle = (e.skillToggle + 1) % 2;

        if (e.isBoss) {
            if (kind === 'danmaku') {
                // 技能1：7 发高速扇形狙击弹
                for (const off of [-0.48, -0.32, -0.16, 0, 0.16, 0.32, 0.48]) {
                    this._spawnEnemyBullet(e.x, e.y, ang + off, 345, 1, new Color(255, 184, 72, 255), 'enemy_orb');
                }
            } else if (kind === 'boss_ring') {
                // 技能2：双层交错花瓣弹幕 + 半血狂暴额外召唤 1 只护卫
                const cnt = e.bossEnraged ? 16 : 12;
                for (let i = 0; i < cnt; i++) {
                    const a = ang + (i / cnt) * Math.PI * 2;
                    this._spawnEnemyBullet(e.x, e.y, a, 240, 1, new Color(255, 102, 118, 255), 'enemy_orb');
                }
                if (e.bossEnraged && this._enemies.length < 5) {
                    this._materializeEnemy('bamboo_imp', e.x + 65, e.y - 40, false);
                }
            } else if (kind === 'boss_slam') {
                // 技能3：震地冲击波 + 玩家脚下追踪墨雷
                AudioManager.inst.playSfx('boom');
                this._triggerShake(0.24, 8);
                this._spawnSpriteFx('fx_burst_explosion', e.x, e.y, 240, 240, Math.random() * 360, 0.34, 0.45, 1.35, 110, new Color(255, 110, 76, 245));
                if (Math.hypot(this._px - e.x, this._py - e.y) < 142) this._damagePlayer(2);
                const mn = this._uiNode('BossMine', this._fxSpriteLayer);
                mn.setPosition(this._px, this._py, 0);
                ArtLoader.applySprite(mn, 'fx_magic_circle', 110, 110);
                this._mines.push({ x: this._px, y: this._py, r: 64, timer: 1.05, maxTimer: 1.05, node: mn });
            }
            return;
        }

        // 竹影射手双技能：远距红线高速狙击箭 / 贴脸被逼近时后跳并甩出 3 连扇形散箭
        if (e.archetype === 'sniper') {
            AudioManager.inst.playSfx('tap');
            const distToP = Math.hypot(this._px - e.x, this._py - e.y);
            if (distToP < 165) {
                e.vx = -Math.cos(ang) * 340;
                e.vy = -Math.sin(ang) * 340;
                for (const off of [-0.28, 0, 0.28]) {
                    this._spawnEnemyBullet(e.x, e.y, ang + off, 360, 1, new Color(255, 140, 110, 255), 'enemy_sniper');
                }
            } else {
                this._spawnEnemyBullet(e.x, e.y, ang, 560, 2, new Color(255, 108, 96, 255), 'enemy_sniper');
            }
            return;
        }

        // 竹精双技能：交替 直线突刺爪击 / 跳劈放出 3 发扇形飞竹刺
        if (e.archetype === 'rush' || e.archetype === 'trail') {
            if (e.skillToggle === 0 || e.isElite) {
                e.rushTimer = 0.34;
            }
            if (e.skillToggle === 1 || e.isElite) {
                for (const off of [-0.25, 0, 0.25]) {
                    this._spawnEnemyBullet(e.x, e.y, ang + off, 310, 1, new Color(138, 245, 168, 255), 'enemy_sniper');
                }
            }
            return;
        }

        // 墨灵双技能：交替 扇形5连妖弹 / 在玩家脚下埋设 1.2s 延迟引爆「墨印定时雷」
        if (e.archetype === 'danmaku') {
            if (e.skillToggle === 0) {
                for (const off of [-0.36, -0.18, 0, 0.18, 0.36]) {
                    this._spawnEnemyBullet(e.x, e.y, ang + off, 260, 1, new Color(255, 108, 128, 255), 'enemy_orb');
                }
            } else {
                const mn = this._uiNode('InkMine', this._fxSpriteLayer);
                mn.setPosition(this._px, this._py, 0);
                ArtLoader.applySprite(mn, 'fx_magic_circle', 112, 112);
                this._mines.push({ x: this._px, y: this._py, r: 62, timer: 1.20, maxTimer: 1.20, node: mn });
                if (e.isElite) {
                    for (let i = 0; i < 4; i++) {
                        this._spawnEnemyBullet(e.x, e.y, ang + i * (Math.PI * 0.5), 220, 1, new Color(196, 124, 255, 255), 'enemy_orb');
                    }
                }
            }
            return;
        }

        // 符纸石傀双技能：重锤砸地环形冲击 + 十字4向震波（或举盾前冲），砸地后 0.85s 破防窗口
        if (e.archetype === 'shield') {
            AudioManager.inst.playSfx('boom');
            this._triggerShake(0.16, 5.0);
            this._spawnSpriteFx('fx_burst_explosion', e.x, e.y, 188, 188, Math.random() * 360, 0.30, 0.45, 1.28, 100, new Color(255, 166, 84, 240));
            if (Math.hypot(this._px - e.x, this._py - e.y) < 112) this._damagePlayer(1);
            if (e.skillToggle === 1 || e.isElite) {
                for (let i = 0; i < 4; i++) {
                    this._spawnEnemyBullet(e.x, e.y, ang + i * (Math.PI * 0.5), 235, 1, new Color(255, 178, 86, 255), 'enemy_orb');
                }
            } else {
                e.vx = Math.cos(ang) * 280;
                e.vy = Math.sin(ang) * 280;
            }
            e.stunTimer = 0.85;
            return;
        }
        if (e.archetype === 'blink') {
            // 潜行钻地隐身 0.65s
            this._emitParticles(e.x, e.y, 10, new Color(188, 168, 138, 235), 140);
            e.blinkHiddenTimer = 0.65;
            return;
        }
        if (e.archetype === 'summoner') {
            // 给附近队友套灵盾 + 发射慢速追踪灵符
            for (const ally of this._enemies) {
                if (ally.hp > 0 && ally.id !== e.id && Math.hypot(ally.x - e.x, ally.y - e.y) < 260) {
                    ally.shieldHp = Math.max(ally.shieldHp, 18);
                    this._drawEnemyHpBar(ally);
                    this._ringBursts.push({ x: ally.x, y: ally.y, r: 8, maxR: 36, life: 0.26, maxLife: 0.26, color: new Color(108, 224, 255, 220) });
                }
            }
            this._spawnEnemyBullet(e.x, e.y, ang, 185, 1, new Color(128, 228, 255, 255), 'enemy_homing');
        }
    }

    private _spawnEnemyBullet(
        x: number,
        y: number,
        ang: number,
        speed: number,
        dmg: number,
        color: Color,
        kind: 'enemy_orb' | 'enemy_homing' | 'enemy_sniper'
    ): void {
        this._projectiles.push({
            fromPlayer: false,
            kind,
            node: this._createProjNode(kind, x, y, (ang * 180) / Math.PI),
            x,
            y,
            vx: Math.cos(ang) * speed,
            vy: Math.sin(ang) * speed,
            damage: dmg,
            isCrit: false,
            radius: kind === 'enemy_homing' ? 9 : 8,
            life: kind === 'enemy_homing' ? 3.2 : 2.6,
            maxLife: 3.2,
            pierceLeft: 1,
            color,
            accent: new Color(255, 245, 220, 255),
            trail: [{ x, y }],
            hitIds: new Set(),
        });
    }

    private _damageBiomeMechanicsInRadius(room: FloorRoomData, cx: number, cy: number, radius: number, dmg: number): void {
        for (const m of room.mechanics) {
            if (m.broken) continue;
            if (Math.hypot(m.x - cx, m.y - cy) > radius + m.r) continue;
            if (m.kind === 'mist_lamp' && !m.lit) {
                m.lit = true;
                const mn = this._mechNodes.get(m.id);
                const sp = mn?.getChildByName('ArtSprite')?.getComponent(Sprite);
                if (sp) sp.color = new Color(255, 236, 152, 255);
                this._ringBursts.push({ x: m.x, y: m.y, r: 10, maxR: 88, life: 0.35, maxLife: 0.35, color: new Color(255, 226, 128, 225) });
                this._spawnFloatText(m.x, m.y + 38, '驱雾古灯已点亮!', new Color(255, 232, 138, 255), 14);
                AudioManager.inst.playSfx('coin');
                continue;
            }
            if (m.kind === 'bamboo_clump' || m.kind === 'ice_crystal' || m.kind === 'poison_pod') {
                m.hp -= dmg;
                this._emitParticles(m.x, m.y, 5, m.kind === 'bamboo_clump' ? new Color(118, 224, 122, 240) : m.kind === 'ice_crystal' ? new Color(138, 232, 255, 240) : new Color(188, 118, 255, 240), 110);
                if (m.hp <= 0) {
                    m.broken = true;
                    const mn = this._mechNodes.get(m.id);
                    if (mn?.isValid) mn.destroy();
                    this._mechNodes.delete(m.id);
                    if (m.kind === 'bamboo_clump') {
                        this._spawnFloatText(m.x, m.y + 24, '劈开竹丛!', new Color(158, 246, 162, 255), 13);
                    } else if (m.kind === 'ice_crystal') {
                        // 寒冰晶块炸裂：冻结半径 145px 内所有敌人 2.6 秒！
                        this._ringBursts.push({ x: m.x, y: m.y, r: 14, maxR: 145, life: 0.32, maxLife: 0.32, color: new Color(128, 236, 255, 240) });
                        this._spawnFloatText(m.x, m.y + 28, '寒冰爆裂 · 冰冻!', new Color(138, 242, 255, 255), 14);
                        AudioManager.inst.playSfx('boom');
                        for (const e of this._enemies) {
                            if (e.hp > 0 && Math.hypot(e.x - m.x, e.y - m.y) <= 145) {
                                e.freezeTimer = Math.max(e.freezeTimer, 2.6);
                                this._damageEnemy(e, 18, false, 0, 0, m.x);
                            }
                        }
                    } else if (m.kind === 'poison_pod') {
                        // 毒孢子囊爆裂：生成 5 秒毒雾圈，引怪去炸可造成持续高额毒伤！
                        this._spawnHazardZone(m.x, m.y, 76, 5.0, 'poison');
                        this._ringBursts.push({ x: m.x, y: m.y, r: 12, maxR: 86, life: 0.30, maxLife: 0.30, color: new Color(158, 242, 128, 230) });
                        this._spawnFloatText(m.x, m.y + 28, '毒孢爆裂!', new Color(178, 252, 138, 255), 14);
                        AudioManager.inst.playSfx('boom');
                        for (const e of this._enemies) {
                            if (e.hp > 0 && Math.hypot(e.x - m.x, e.y - m.y) <= 95) {
                                this._damageEnemy(e, 26, false, 0, 0, m.x);
                            }
                        }
                    }
                }
            }
        }
    }

    private _stepBiomeMechanics(dt: number): void {
        if (this._hasteTimer > 0) this._hasteTimer = Math.max(0, this._hasteTimer - dt);
        if (this._warpCd > 0) this._warpCd = Math.max(0, this._warpCd - dt);
        this._mistOverlayGfx?.clear();

        const room = this._floorMap?.rooms.get(this._curRoomKey);
        if (!room || room.mechanics.length === 0) return;

        // 1. 固体机关阻挡玩家走位（竹丛、寒冰晶块、毒孢子囊、导电铜柱）
        for (const m of room.mechanics) {
            if (m.broken) continue;
            if (m.kind === 'bamboo_clump' || m.kind === 'ice_crystal' || m.kind === 'poison_pod' || m.kind === 'thunder_coil') {
                const dx = this._px - m.x;
                const dy = this._py - m.y;
                const d = Math.hypot(dx, dy);
                const minD = m.r + PLAYER_RADIUS - 4;
                if (d > 0.01 && d < minD) {
                    this._px = m.x + (dx / d) * minD;
                    this._py = m.y + (dy / d) * minD;
                }
            }
        }

        // 2. 第 2 大关：周期十字喷火口（预警 -> 十字火柱喷射）
        for (const m of room.mechanics) {
            if (m.kind !== 'lava_vent') continue;
            const phase = (this._fxTime + m.phaseOffset) % 3.6;
            const mn = this._mechNodes.get(m.id);
            const sp = mn?.getChildByName('ArtSprite')?.getComponent(Sprite);
            if (phase < 2.0) {
                if (sp) sp.color = new Color(175, 165, 160, 255);
            } else if (phase < 2.75) {
                if (sp) sp.color = new Color(255, 198, 92, 255);
                if (Math.random() < 0.25) this._emitParticles(m.x, m.y, 1, new Color(255, 164, 62, 230), 65);
            } else {
                if (sp) sp.color = new Color(255, 108, 64, 255);
                if (Math.random() < 0.55) {
                    const dir = Math.floor(Math.random() * 4);
                    const ang = dir * Math.PI * 0.5;
                    const dist = 24 + Math.random() * 110;
                    this._emitParticles(m.x + Math.cos(ang) * dist, m.y + Math.sin(ang) * dist, 1, new Color(255, 122, 48, 245), 95);
                }
                // 十字火柱判定（长度 130px，宽度 28px）
                const inCross = (Math.abs(this._px - m.x) < 22 && Math.abs(this._py - m.y) < 130) ||
                    (Math.abs(this._py - m.y) < 22 && Math.abs(this._px - m.x) < 130);
                if (inCross && this._dodgeTimer <= 0) {
                    this._damagePlayer(1);
                }
            }
        }

        // 3. 第 4 大关：暗紫瘴雾遮罩 + 靠近/攻击点亮驱雾古灯
        let hasUnlitLamp = false;
        for (const m of room.mechanics) {
            if (m.kind !== 'mist_lamp') continue;
            if (!m.lit && Math.hypot(this._px - m.x, this._py - m.y) < 62) {
                this._damageBiomeMechanicsInRadius(room, m.x, m.y, 20, 1);
            }
            if (!m.lit) hasUnlitLamp = true;
        }
        if (hasUnlitLamp && !room.cleared && this._mistOverlayGfx) {
            this._mistOverlayGfx.fillColor = new Color(24, 12, 38, 128);
            this._mistOverlayGfx.rect(-SCREEN_W * 0.5, -SCREEN_H * 0.5, SCREEN_W, SCREEN_H);
            this._mistOverlayGfx.fill();
        }

        // 4. 第 5 大关：成对导电铜柱周期串联闪电链 + 雷纹疾行阵
        const coilsByPair = new Map<number, RoomMechanic[]>();
        for (const m of room.mechanics) {
            if (m.kind === 'thunder_coil') {
                const arr = coilsByPair.get(m.pairId) ?? [];
                arr.push(m);
                coilsByPair.set(m.pairId, arr);
            } else if (m.kind === 'thunder_pad') {
                if (Math.hypot(this._px - m.x, this._py - m.y) < m.r + 10) {
                    if (this._hasteTimer <= 0.2) {
                        this._spawnFloatText(this._px, this._py + 36, '⚡雷纹疾行!', new Color(138, 248, 255, 255), 14);
                    }
                    this._hasteTimer = 3.2;
                }
            }
        }
        for (const pair of coilsByPair.values()) {
            if (pair.length < 2) continue;
            const [a, b] = pair;
            const phase = (this._fxTime + a.phaseOffset) % 3.8;
            if (phase >= 2.7) {
                if (Math.random() < 0.45) {
                    this._spawnLightningBolt(a.x, a.y + 12, b.x, b.y + 12, new Color(128, 238, 255, 240));
                }
                // 检测玩家是否穿越两铜柱间连线
                const abx = b.x - a.x;
                const aby = b.y - a.y;
                const abLen2 = Math.max(1, abx * abx + aby * aby);
                const t = Math.max(0, Math.min(1, ((this._px - a.x) * abx + (this._py - a.y) * aby) / abLen2));
                const projX = a.x + t * abx;
                const projY = a.y + t * aby;
                if (this._dodgeTimer <= 0 && Math.hypot(this._px - projX, this._py - projY) < 22) {
                    this._damagePlayer(1);
                }
            }
        }

        // 5. 第 6 大关：成对双向时空传送阵 + 引力旋涡
        const portals = room.mechanics.filter((m) => m.kind === 'rift_portal');
        if (portals.length >= 2 && this._warpCd <= 0) {
            for (let i = 0; i < portals.length; i++) {
                const pA = portals[i];
                if (Math.hypot(this._px - pA.x, this._py - pA.y) < pA.r) {
                    const pB = portals[(i + 1) % portals.length];
                    this._px = pB.x;
                    this._py = pB.y;
                    this._warpCd = 1.8;
                    this._ringBursts.push({ x: pA.x, y: pA.y, r: 10, maxR: 62, life: 0.28, maxLife: 0.28, color: new Color(122, 248, 236, 235) });
                    this._ringBursts.push({ x: pB.x, y: pB.y, r: 10, maxR: 62, life: 0.28, maxLife: 0.28, color: new Color(122, 248, 236, 235) });
                    this._spawnFloatText(pB.x, pB.y + 34, '时空跃迁!', new Color(138, 252, 238, 255), 14);
                    AudioManager.inst.playSfx('coin');
                    break;
                }
            }
        }
        for (const m of room.mechanics) {
            if (m.kind !== 'rift_vortex') continue;
            const vn = this._mechNodes.get(m.id);
            if (vn?.isValid) vn.angle += dt * 95;
            const dx = m.x - this._px;
            const dy = m.y - this._py;
            const d = Math.hypot(dx, dy);
            if (d > 22 && d < 185 && this._dodgeTimer <= 0) {
                const pull = (1 - d / 185) * 85 * dt;
                const nx = this._px + (dx / d) * pull;
                const ny = this._py + (dy / d) * pull;
                if (this._isPointWalkable(nx, ny, PLAYER_RADIUS)) {
                    this._px = nx;
                    this._py = ny;
                }
            }
        }
    }

    private _stepProjectiles(dt: number): void {
        const room = this._floorMap.rooms.get(this._curRoomKey);
        const kept: Projectile[] = [];

        for (const p of this._projectiles) {
            p.life -= dt;
            if (p.life <= 0) {
                if (p.node?.isValid) p.node.destroy();
                continue;
            }

            if (p.fromPlayer && p.kind === 'homing') {
                let best: ActiveEnemy | null = null;
                let bestD = 360;
                for (const e of this._enemies) {
                    if (e.hp <= 0 || e.blinkHiddenTimer > 0 || p.hitIds.has(e.id)) continue;
                    const d = Math.hypot(e.x - p.x, e.y - p.y);
                    if (d < bestD) { bestD = d; best = e; }
                }
                if (best) {
                    const desired = Math.atan2(best.y - p.y, best.x - p.x);
                    const curAng = Math.atan2(p.vy, p.vx);
                    const spd = Math.hypot(p.vx, p.vy);
                    let diff = desired - curAng;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    const nextAng = curAng + Math.max(-dt * 7.5, Math.min(dt * 7.5, diff));
                    p.vx = Math.cos(nextAng) * spd;
                    p.vy = Math.sin(nextAng) * spd;
                }
            } else if (!p.fromPlayer && p.kind === 'enemy_homing') {
                // 召唤师慢速追踪灵符（可被翻滚或近战劈散）
                const desired = Math.atan2(this._py - p.y, this._px - p.x);
                const curAng = Math.atan2(p.vy, p.vx);
                const spd = Math.hypot(p.vx, p.vy);
                let diff = desired - curAng;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                const nextAng = curAng + Math.max(-dt * 2.2, Math.min(dt * 2.2, diff));
                p.vx = Math.cos(nextAng) * spd;
                p.vy = Math.sin(nextAng) * spd;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.node?.isValid) {
                p.node.setPosition(p.x, p.y, 0);
                if (p.kind === 'enemy_orb' || p.kind === 'enemy_homing') {
                    p.node.angle += dt * 320;
                } else {
                    p.node.angle = (Math.atan2(p.vy, p.vx) * 180) / Math.PI;
                }
            }
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > (p.kind === 'homing' ? 9 : 5)) p.trail.shift();

            if (!this._isPointWalkable(p.x, p.y, 4)) {
                if (p.node?.isValid) p.node.destroy();
                this._emitParticles(p.x, p.y, 3, p.color, 90);
                continue;
            }

            let hitPillar = false;
            if (room && p.kind !== 'sword_wave' && p.kind !== 'homing') {
                for (const pil of room.pillars) {
                    if (Math.hypot(p.x - pil.x, p.y - pil.y) < pil.r + p.radius * 0.6) {
                        hitPillar = true;
                        break;
                    }
                }
                if (!hitPillar) {
                    for (const w of room.walls) {
                        if (Math.abs(p.x - w.x) < w.w * 0.5 + p.radius * 0.5 && Math.abs(p.y - w.y) < w.h * 0.5 + p.radius * 0.5) {
                            hitPillar = true;
                            break;
                        }
                    }
                }
            }
            if (hitPillar) {
                if (p.node?.isValid) p.node.destroy();
                this._emitParticles(p.x, p.y, 4, p.color, 110);
                continue;
            }

            if (p.fromPlayer) {
                if (room) {
                    let hitMech = false;
                    for (const m of room.mechanics) {
                        if (m.broken) continue;
                        if (m.kind === 'bamboo_clump' || m.kind === 'ice_crystal' || m.kind === 'poison_pod' || m.kind === 'mist_lamp') {
                            if (Math.hypot(p.x - m.x, p.y - m.y) < m.r + p.radius) {
                                this._damageBiomeMechanicsInRadius(room, m.x, m.y, 16, p.damage);
                                hitMech = true;
                                break;
                            }
                        }
                    }
                    if (hitMech && p.pierceLeft <= 1) { if (p.node?.isValid) p.node.destroy(); continue; }
                    let hitCrate = false;
                    for (const c of room.crates) {
                        if (!c.broken && Math.hypot(p.x - c.x, p.y - c.y) < 24 + p.radius) {
                            this._damageCratesInRadius(c.x, c.y, 12, p.damage);
                            hitCrate = true;
                            break;
                        }
                    }
                    if (hitCrate && p.pierceLeft <= 1) { if (p.node?.isValid) p.node.destroy(); continue; }
                }

                let consumed = false;
                for (const e of this._enemies) {
                    if (e.hp <= 0 || e.blinkHiddenTimer > 0 || p.hitIds.has(e.id)) continue;
                    if (Math.hypot(p.x - e.x, p.y - e.y) <= e.radius + p.radius) {
                        p.hitIds.add(e.id);
                        const kbScale = p.kind === 'fire' ? 140 : 85;
                        const spd = Math.max(1, Math.hypot(p.vx, p.vy));
                        this._damageEnemy(e, p.damage, p.isCrit, (p.vx / spd) * kbScale, (p.vy / spd) * kbScale, p.x);

                        if (p.kind === 'fire') {
                            e.burnTimer = 2.2;
                            this._ringBursts.push({ x: p.x, y: p.y, r: 6, maxR: 34, life: 0.18, maxLife: 0.18, color: new Color(255, 148, 62, 220) });
                        } else if (p.kind === 'frost') {
                            e.freezeTimer = Math.max(e.freezeTimer, 1.8);
                            this._ringBursts.push({ x: p.x, y: p.y, r: 6, maxR: 30, life: 0.20, maxLife: 0.20, color: new Color(110, 236, 255, 220) });
                        }

                        p.pierceLeft -= 1;
                        if (p.pierceLeft <= 0) {
                            consumed = true;
                            break;
                        }
                    }
                }
                if (consumed) { if (p.node?.isValid) p.node.destroy(); continue; }
            } else {
                if (Math.hypot(p.x - this._px, p.y - this._py) <= PLAYER_RADIUS + p.radius - 3) {
                    if (p.node?.isValid) p.node.destroy();
                    this._damagePlayer(p.damage);
                    this._spawnSpriteFx('fx_burst_explosion', p.x, p.y, 52, 52, Math.random() * 360, 0.16, 0.5, 1.0, 90);
                    continue;
                }
            }

            kept.push(p);
        }
        this._projectiles = kept;
    }

    private _stepDropsAndFx(dt: number): void {
        const keptDrops: DropOrb[] = [];
        for (const d of this._drops) {
            d.life -= dt;
            if (d.life <= 0) {
                if (d.node?.isValid) d.node.destroy();
                continue;
            }
            // 抛物线落地弹跳物理
            if (d.z > 0 || d.vz > 0) {
                d.vz -= 520 * dt;
                d.z += d.vz * dt;
                if (d.z <= 0) {
                    d.z = 0;
                    d.vz = Math.abs(d.vz) > 45 ? Math.abs(d.vz) * 0.42 : 0;
                }
            }
            d.vx *= Math.max(0, 1 - dt * 5);
            d.vy *= Math.max(0, 1 - dt * 5);
            const dx = this._px - d.x;
            const dy = this._py - d.y;
            const dist = Math.max(1, Math.hypot(dx, dy));
            if (dist < 185 && d.z < 12) {
                const pull = (1 - dist / 185) * 480 + 180;
                d.x += (dx / dist) * pull * dt;
                d.y += (dy / dist) * pull * dt;
            } else {
                d.x += d.vx * dt;
                d.y += d.vy * dt;
            }
            if (d.node?.isValid) {
                const bob = d.z > 0 ? d.z : Math.sin(this._fxTime * 5 + d.x) * 2.5;
                d.node.setPosition(d.x, d.y + bob, 0);
                const pulse = 1 + Math.sin(this._fxTime * 6 + d.y) * 0.08;
                d.node.setScale(pulse, pulse, 1);
            }
            if (dist < 28) {
                if (d.node?.isValid) d.node.destroy();
                AudioManager.inst.playSfx('coin');
                this._spawnSpriteFx('fx_burst_explosion', this._px, this._py + 8, 34, 34, Math.random() * 360, 0.14, 0.5, 1.0, 90, new Color(255, 240, 165, 200));
                if (d.kind === 'gold') {
                    this._runGold += d.amount;
                    this._spawnFloatText(this._px, this._py + 30, `+${d.amount} 金`, new Color(252, 220, 96, 255), 13);
                } else if (d.kind === 'energy') {
                    this._energy = Math.min(this._maxEnergy, this._energy + d.amount);
                } else if (d.kind === 'heal') {
                    this._hp = Math.min(this._maxHp, this._hp + d.amount);
                    this._spawnFloatText(this._px, this._py + 34, `+${d.amount} 生命`, new Color(102, 244, 146, 255), 14);
                } else if (d.kind === 'iron') {
                    this._runIron += d.amount;
                    this._spawnFloatText(this._px, this._py + 36, `+${d.amount} 玄铁`, new Color(180, 224, 255, 255), 14);
                }
                continue;
            }
            keptDrops.push(d);
        }
        this._drops = keptDrops;

        this._slashArcs = this._slashArcs.filter((s) => { s.life -= dt; return s.life > 0; });
        this._lightningBolts = this._lightningBolts.filter((b) => { b.life -= dt; return b.life > 0; });
        this._ringBursts = this._ringBursts.filter((r) => {
            r.life -= dt;
            const t = 1 - Math.max(0, r.life / r.maxLife);
            r.r = 6 + (r.maxR - 6) * t;
            return r.life > 0;
        });
        this._spriteBursts = this._spriteBursts.filter((sb) => {
            sb.life -= dt;
            if (sb.life <= 0) {
                if (sb.node?.isValid) sb.node.destroy();
                return false;
            }
            const t = 1 - sb.life / sb.maxLife;
            const sc = sb.startScale + (sb.endScale - sb.startScale) * t;
            if (sb.node?.isValid) {
                sb.node.setScale(sc, sb.flipY ? -sc : sc, 1);
                if (sb.spinSpeed !== 0) sb.node.angle += sb.spinSpeed * dt;
            }
            if (sb.sp) {
                const al = Math.floor((1 - t) * sb.baseColor.a);
                sb.sp.color = new Color(sb.baseColor.r, sb.baseColor.g, sb.baseColor.b, al);
            }
            return true;
        });
        this._particles = this._particles.filter((pt) => {
            pt.life -= dt;
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.vx *= Math.max(0, 1 - dt * 5);
            pt.vy *= Math.max(0, 1 - dt * 5);
            return pt.life > 0;
        });
        this._floatTexts = this._floatTexts.filter((ft) => {
            ft.life -= dt;
            ft.y += ft.vy * dt;
            ft.vy *= Math.max(0, 1 - dt * 2.5);
            ft.node.setPosition(ft.x, ft.y, 0);
            if (ft.life <= 0) {
                if (ft.node?.isValid) ft.node.destroy();
                return false;
            }
            return true;
        });
    }

    private _checkRoomClearAndDoors(): void {
        const room = this._floorMap.rooms.get(this._curRoomKey);
        if (!room) return;

        if (!room.cleared && this._enemies.length === 0 && this._telegraphs.length === 0) {
            if (this._pendingWaves.length > 0) {
                this._spawnNextWave();
            } else {
                room.cleared = true;
                this._setRoomGatesLocked(room.key, false);
                this._projectiles = this._projectiles.filter((p) => {
                    if (!p.fromPlayer) {
                        if (p.node?.isValid) p.node.destroy();
                        return false;
                    }
                    return true;
                });
                this._rebuildDoorLabels();
                this._redrawMinimap();
                this._showBanner('房间清理完毕 · 封印门闸已开启');
                AudioManager.inst.playSfx('harvest');

                if (room.type === 'portal' || room.type === 'boss') {
                    room.portalActive = true;
                    this._spawnPortalVisual();
                    this._recordStageClearProgress();
                }
            }
        }

        if (room.cleared) {
            for (const candidate of this._floorMap.rooms.values()) {
                if (candidate.key === this._curRoomKey) continue;
                // 玩家走到走廊中段靠近门洞（距房间边界 140px 内）就提前揭开迷雾，绝不出现人走进黑块里的情况！
                if (Math.abs(this._px - candidate.worldX) <= candidate.halfW + 140 &&
                    Math.abs(this._py - candidate.worldY) <= candidate.halfH + 140) {
                    this._dismissRoomFog(candidate.key);
                }
                if (Math.abs(this._px - candidate.worldX) <= candidate.halfW - 24 &&
                    Math.abs(this._py - candidate.worldY) <= candidate.halfH - 24) {
                    this._onPlayerEnteredRoom(candidate);
                    return;
                }
            }
        }

        const interText = this._getInteractPrompt(room);
        this._interactBtn.active = !!interText;
        if (interText) this._interactLbl.string = interText;
    }

    private _getInteractPrompt(room: FloorRoomData): string | null {
        const rx = this._px - room.worldX;
        const ry = this._py - room.worldY;
        if (room.type === 'treasure' && !room.chestOpened && Math.hypot(rx, ry - 18) < 92) {
            return '按 E 开启秘境武器宝箱';
        }
        if (room.type === 'altar' && !room.altarUsed && Math.hypot(rx, ry - 26) < 126) {
            return '按 E 祈福 · 灵泉三选一';
        }
        if (room.type === 'shop' && Math.hypot(rx, ry - 24) < 118) {
            return '按 E 打开秘境铁匠铺';
        }
        if (room.type === 'fountain' && room.fountainWishesLeft > 0 && Math.hypot(rx, ry - 18) < 115) {
            return `按 E 许愿池投币 (15金 · 剩${room.fountainWishesLeft}次)`;
        }
        if (room.type === 'reforge' && room.reforgeUsesLeft > 0 && Math.hypot(rx, ry - 18) < 115) {
            return `按 E 重铸当前武器 (12金 · 剩${room.reforgeUsesLeft}次)`;
        }
        if (room.portalActive && Math.hypot(rx, ry - 20) < 88) {
            return this._stageNum >= DUNGEON_TOTAL_STAGES ? '按 E 凯旋通关!' : '按 E 进入下一层';
        }
        return null;
    }

    private _tryInteract(): void {
        if (this._modalOpen) return;
        const room = this._floorMap.rooms.get(this._curRoomKey);
        if (!room) return;
        const rx = this._px - room.worldX;
        const ry = this._py - room.worldY;

        if (room.type === 'treasure' && !room.chestOpened && Math.hypot(rx, ry - 18) < 92) {
            room.chestOpened = true;
            if (this._chestNode?.isValid) ArtLoader.applySprite(this._chestNode, 'dng_chest_open', 78, 70);
            this._redrawMinimap();
            this._rebuildDoorLabels();
            const drop = room.chestWeapon ?? rollWeaponDrop(this._stageNum);
            this._showWeaponPickupModal(drop, '开启秘境宝箱');
            return;
        }
        if (room.type === 'altar' && !room.altarUsed && Math.hypot(rx, ry - 26) < 126) {
            this._showAltarModal(room);
            return;
        }
        if (room.type === 'shop' && Math.hypot(rx, ry - 24) < 118) {
            this._showShopModal(room);
            return;
        }
        if (room.type === 'fountain' && room.fountainWishesLeft > 0 && Math.hypot(rx, ry - 18) < 115) {
            if (this._runGold < 15) {
                this._spawnFloatText(this._px, this._py + 36, '金币不足 (需15金)', new Color(255, 138, 128, 255), 14);
                return;
            }
            this._runGold -= 15;
            room.fountainWishesLeft -= 1;
            AudioManager.inst.playSfx('coin');
            const roll = Math.random();
            if (roll < 0.34) {
                this._hp = Math.min(this._maxHp, this._hp + 2);
                this._shield = this._maxShield;
                this._spawnFloatText(this._px, this._py + 40, '灵泉赐福 · 生命+2 护盾回满!', new Color(128, 252, 168, 255), 15);
            } else if (roll < 0.68) {
                this._buffs.dmgMult += 0.12;
                this._buffs.critBonus += 0.05;
                this._spawnFloatText(this._px, this._py + 40, '灵泉神佑 · 伤害+12% 暴击+5%!', new Color(255, 224, 122, 255), 15);
            } else {
                const drop = rollWeaponDrop(this._stageNum + 3);
                this._showWeaponPickupModal(drop, '灵泉许愿池爆出珍稀武器');
            }
            this._refreshHud();
            return;
        }
        if (room.type === 'reforge' && room.reforgeUsesLeft > 0 && Math.hypot(rx, ry - 18) < 115) {
            if (this._runGold < 12) {
                this._spawnFloatText(this._px, this._py + 36, '金币不足 (需12金)', new Color(255, 138, 128, 255), 14);
                return;
            }
            this._runGold -= 12;
            room.reforgeUsesLeft -= 1;
            const newWpn = rollWeaponDrop(this._stageNum + 5);
            this._weapons[this._activeWeaponIdx] = newWpn;
            this._syncHeldWeaponSprite();
            AudioManager.inst.playSfx('harvest');
            const def = getWeaponDef(newWpn.id);
            this._spawnFloatText(this._px, this._py + 42, `重铸成功 · ${def.name}!`, new Color(168, 255, 192, 255), 15);
            this._refreshHud();
            return;
        }
        if (room.portalActive && Math.hypot(rx, ry - 20) < 88) {
            if (this._stageNum >= DUNGEON_TOTAL_STAGES) {
                this._showRunEndModal(true);
            } else {
                this._enterStage(this._stageNum + 1);
            }
        }
    }

    private _showWeaponPickupModal(drop: WeaponInstance, title: string): void {
        this._modalOpen = true;
        this._modalLayer.removeAllChildren();
        const def = getWeaponDef(drop.id);
        const curW = this._weapons[this._activeWeaponIdx];
        const offIdx: 0 | 1 = this._activeWeaponIdx === 0 ? 1 : 0;
        const offW = this._weapons[offIdx];

        const panel = this._createModalPanel(560, 350, title);
        const iconNode = this._uiNode('DropWpnIcon', panel);
        iconNode.setPosition(0, 94, 0);
        ArtLoader.applySprite(iconNode, def.artKey, 108, 46);

        this._addLabel(panel, getWeaponDisplayName(drop), 22, hexToColor(RARITY_COLORS[drop.rarity]), 0, 44, true, 2);
        this._addLabel(panel, `${def.tag}  ·  伤害 ${getWeaponDamage(drop, this._buffs.dmgMult)}  ·  耗蓝 ${def.energyCost}`, 15, new Color(214, 240, 232, 255), 0, 12, false, 1.4);
        this._addLabel(panel, def.desc, 13, new Color(236, 236, 230, 245), 0, -22, false, 1.2);

        this._makeButton(panel, 'EquipMain', -160, -104, 200, 46, `替换当前(${getWeaponDef(curW.id).name})`, new Color(36, 118, 92, 245), new Color(252, 224, 138, 255), () => {
            this._weapons[this._activeWeaponIdx] = drop;
            this._syncHeldWeaponSprite();
            this._closeModal();
            this._refreshHud();
        }, 13);
        this._makeButton(panel, 'EquipOff', 64, -104, 200, 46, `替换副手(${getWeaponDef(offW.id).name})`, new Color(42, 82, 116, 245), new Color(172, 224, 252, 255), () => {
            this._weapons[offIdx] = drop;
            this._closeModal();
            this._refreshHud();
        }, 13);
        this._makeButton(panel, 'DropLeave', 214, -104, 82, 46, '放弃', new Color(68, 46, 46, 235), new Color(196, 146, 140, 220), () => {
            this._closeModal();
        }, 14);
    }

    private _showAltarModal(room: FloorRoomData): void {
        this._modalOpen = true;
        this._modalLayer.removeAllChildren();
        const panel = this._createModalPanel(840, 360, '古灵神像 · 选择 1 项强化祝福');

        const shuffled = [...ALTAR_BLESSINGS].sort(() => Math.random() - 0.5).slice(0, 3);
        shuffled.forEach((b, idx) => {
            const cx = (idx - 1) * 256;
            const card = this._uiNode(`Bless_${b.id}`, panel);
            card.setPosition(cx, -12, 0);
            card.addComponent(UITransform).setContentSize(236, 210);
            const cg = card.addComponent(Graphics);
            cg.fillColor = new Color(28, 48, 52, 245);
            cg.strokeColor = hexToColor(b.color, 240);
            cg.lineWidth = 2.8;
            cg.roundRect(-118, -105, 236, 210, 12);
            cg.fill();
            cg.stroke();

            this._addLabel(card, b.title, 20, hexToColor(b.color), 0, 52, true, 1.8);
            const dLbl = this._addLabel(card, b.desc, 14, new Color(235, 242, 240, 250), 0, -6, false, 1.2);
            dLbl.overflow = Label.Overflow.SHRINK;
            dLbl.node.getComponent(UITransform)?.setContentSize(206, 72);

            this._makeButton(card, 'Pick', 0, -72, 140, 38, '领悟此祝福', new Color(36, 118, 94, 245), new Color(250, 224, 142, 255), () => {
                room.altarUsed = true;
                b.apply(this);
                this._closeModal();
                this._redrawMinimap();
                this._rebuildDoorLabels();
                this._showBanner(`已获得祝福：${b.title}`);
                this._refreshHud();
            }, 14);
        });
    }

    private _showShopModal(room: FloorRoomData): void {
        this._modalOpen = true;
        this._modalLayer.removeAllChildren();
        const panel = this._createModalPanel(760, 360, `秘境铁匠铺 · 本局金币 ${this._runGold}`);

        room.shopOffers.forEach((offer: ShopOffer, idx: number) => {
            const cx = (idx - 1) * 232;
            const card = this._uiNode(`Offer_${offer.id}`, panel);
            card.setPosition(cx, -4, 0);
            const cg = card.addComponent(Graphics);
            cg.fillColor = new Color(28, 44, 48, 245);
            cg.strokeColor = new Color(214, 182, 116, 220);
            cg.lineWidth = 2.2;
            cg.roundRect(-106, -98, 212, 196, 12);
            cg.fill();
            cg.stroke();

            const title = offer.kind === 'weapon' && offer.weapon ? getWeaponDisplayName(offer.weapon) : offer.label;
            this._addLabel(card, title, 16, new Color(252, 234, 174, 255), 0, 44, true, 1.6);
            this._addLabel(card, `售价：${offer.cost} 金币`, 15, new Color(188, 232, 220, 255), 0, 4, false, 1.2);

            const canBuy = !offer.bought && this._runGold >= offer.cost;
            this._makeButton(
                card, 'Buy', 0, -56, 140, 40,
                offer.bought ? '已售罄' : '购买',
                canBuy ? new Color(38, 122, 92, 245) : new Color(62, 66, 68, 220),
                canBuy ? new Color(252, 224, 138, 255) : new Color(128, 136, 138, 180),
                () => {
                    if (!canBuy) return;
                    this._runGold -= offer.cost;
                    offer.bought = true;
                    AudioManager.inst.playSfx('coin');
                    if (offer.kind === 'heal') {
                        this._hp = Math.min(this._maxHp, this._hp + 4);
                        this._showShopModal(room);
                    } else if (offer.kind === 'upgrade') {
                        const cur = this._weapons[this._activeWeaponIdx];
                        if (cur.rarity < 4) cur.rarity = (cur.rarity + 1) as WeaponRarity;
                        this._showBanner(`铁匠锻造成功：${getWeaponDisplayName(cur)}`);
                        this._showShopModal(room);
                    } else if (offer.kind === 'weapon' && offer.weapon) {
                        this._showWeaponPickupModal(offer.weapon, '铁匠锻造武器');
                    }
                    this._refreshHud();
                },
                15
            );
        });

        this._makeButton(panel, 'CloseShop', 0, -142, 160, 40, '离开铁匠铺', new Color(58, 44, 44, 235), new Color(192, 152, 136, 220), () => this._closeModal(), 15);
    }

    private _createModalPanel(w: number, h: number, title: string): Node {
        const mask = this._uiNode('Mask', this._modalLayer);
        mask.addComponent(UITransform).setContentSize(SCREEN_W, SCREEN_H);
        const mg = mask.addComponent(Graphics);
        mg.fillColor = new Color(8, 14, 16, 195);
        mg.rect(-SCREEN_W / 2, -SCREEN_H / 2, SCREEN_W, SCREEN_H);
        mg.fill();
        mask.on(Node.EventType.TOUCH_START, () => {});

        const panel = this._uiNode('Panel', this._modalLayer);
        const pg = panel.addComponent(Graphics);
        pg.fillColor = new Color(20, 34, 38, 250);
        pg.strokeColor = new Color(216, 196, 142, 240);
        pg.lineWidth = 3;
        pg.roundRect(-w / 2, -h / 2, w, h, 14);
        pg.fill();
        pg.stroke();
        this._addLabel(panel, title, 22, new Color(252, 240, 202, 255), 0, h / 2 - 36, true, 2);
        return panel;
    }

    private _closeModal(): void {
        this._modalOpen = false;
        this._modalLayer.removeAllChildren();
    }

    private _renderDynamicFx(): void {
        const g = this._fxGfx;
        g.clear();

        // 0. 地形留痕（火海 / 毒雾）
        // 地面火焰/寒霜/毒雾留痕已全部改用羽化手绘 Sprite 渲染

        // 1. 翻滚残影已升级为角色剪影 Sprite 节点

        // 2. 自动锁敌环 / PC 鼠标准星
        if (this._mouseAimTimer > 0) {
            g.strokeColor = new Color(252, 232, 138, 210);
            g.lineWidth = 2;
            g.circle(this._mouseAimX, this._mouseAimY, 10);
            g.stroke();
            g.moveTo(this._mouseAimX - 14, this._mouseAimY);
            g.lineTo(this._mouseAimX + 14, this._mouseAimY);
            g.moveTo(this._mouseAimX, this._mouseAimY - 14);
            g.lineTo(this._mouseAimX, this._mouseAimY + 14);
            g.stroke();
        } else {
            const locked = this._findNearestEnemy(620);
            if (locked) {
                const pulse = 1 + Math.sin(this._fxTime * 8) * 0.12;
                const r = (locked.radius + 7) * pulse;
                g.strokeColor = new Color(252, 214, 98, 195);
                g.lineWidth = 2;
                g.ellipse(locked.x, locked.y - 12, r, r * 0.52);
                g.stroke();
            }
        }

        // 3. 刷怪预警已升级为旋转国风符文法阵 Sprite

        // 4. 敌人专属原型预警与金边精英光环
        for (const e of this._enemies) {
            if (e.blinkHiddenTimer > 0) continue;
            if (e.isElite) {
                const ep = 1 + Math.sin(this._fxTime * 7 + e.id) * 0.1;
                g.strokeColor = new Color(255, 212, 72, 220);
                g.lineWidth = 2.8;
                g.ellipse(e.x, e.y - 16, (e.radius + 8) * ep, (e.radius + 8) * 0.46 * ep);
                g.stroke();
            }
            if (e.archetype === 'shield' && e.stunTimer <= 0 && !e.isBoss) {
                const shieldA = e.facingX > 0 ? 0 : Math.PI;
                g.strokeColor = new Color(118, 212, 255, 220);
                g.lineWidth = 4;
                g.arc(e.x, e.y, e.radius + 7, shieldA - 0.85, shieldA + 0.85, false);
                g.stroke();
            }
            if (e.windupTimer > 0) {
                if (e.windupKind === 'sniper') {
                    // 竹影射手双层发光狙击瞄准细线（锁定最后 0.27s 闪亮白金）
                    const lockedPhase = e.windupTimer <= 0.27;
                    const tx = e.x + Math.cos(e.windupAimAngle) * 560;
                    const ty = e.y + 4 + Math.sin(e.windupAimAngle) * 560;
                    g.strokeColor = lockedPhase ? new Color(255, 142, 96, 130) : new Color(255, 62, 62, 75);
                    g.lineWidth = lockedPhase ? 5.0 : 3.2;
                    g.moveTo(e.x, e.y + 4);
                    g.lineTo(tx, ty);
                    g.stroke();
                    g.strokeColor = lockedPhase ? new Color(255, 252, 230, 245) : new Color(255, 118, 108, 210);
                    g.lineWidth = 1.4;
                    g.moveTo(e.x, e.y + 4);
                    g.lineTo(tx, ty);
                    g.stroke();
                } else if (e.windupKind === 'rush') {
                    // 突进型轻量化虚线方向引导（配合脚下旋转八卦法阵，不再画粗红矩形）
                    const cos = Math.cos(e.windupAimAngle);
                    const sin = Math.sin(e.windupAimAngle);
                    g.strokeColor = new Color(255, 152, 112, 165);
                    g.lineWidth = 2.2;
                    for (let seg = 0; seg < 4; seg++) {
                        const d0 = 28 + seg * 32;
                        const d1 = d0 + 18;
                        g.moveTo(e.x + cos * d0, e.y + sin * d0);
                        g.lineTo(e.x + cos * d1, e.y + sin * d1);
                    }
                    g.stroke();
                }
            }
        }

        // 5. 掉落物已升级为独立手绘 PNG 精灵节点

        // 6. 近战双层月牙剑气
        for (const s of this._slashArcs) {
            const ratio = s.life / s.maxLife;
            const steps = 16;
            const startA = s.angle - s.span * 0.5;
            g.strokeColor = new Color(s.color.r, s.color.g, s.color.b, Math.floor(ratio * 185));
            g.lineWidth = 18 * ratio + 4;
            for (let i = 0; i <= steps; i++) {
                const a = startA + (i / steps) * s.span;
                const px = s.x + Math.cos(a) * s.radius * 0.86;
                const py = s.y + Math.sin(a) * s.radius * 0.86;
                if (i === 0) g.moveTo(px, py);
                else g.lineTo(px, py);
            }
            g.stroke();
            g.strokeColor = new Color(s.accent.r, s.accent.g, s.accent.b, Math.floor(ratio * 245));
            g.lineWidth = 5 * ratio + 1.5;
            for (let i = 0; i <= steps; i++) {
                const a = startA + (i / steps) * s.span;
                const px = s.x + Math.cos(a) * s.radius * 0.94;
                const py = s.y + Math.sin(a) * s.radius * 0.94;
                if (i === 0) g.moveTo(px, py);
                else g.lineTo(px, py);
            }
            g.stroke();
        }

        // 7. 连锁锯齿天雷
        for (const b of this._lightningBolts) {
            const ratio = b.life / b.maxLife;
            g.strokeColor = new Color(b.color.r, b.color.g, b.color.b, Math.floor(ratio * 190));
            g.lineWidth = 8 * ratio + 2;
            b.pts.forEach((pt, idx) => (idx === 0 ? g.moveTo(pt.x, pt.y) : g.lineTo(pt.x, pt.y)));
            g.stroke();
            g.strokeColor = new Color(255, 255, 255, Math.floor(ratio * 255));
            g.lineWidth = 2.6;
            b.pts.forEach((pt, idx) => (idx === 0 ? g.moveTo(pt.x, pt.y) : g.lineTo(pt.x, pt.y)));
            g.stroke();
        }

        // 8. 弹道主体已升级为发光手绘精灵，此处仅保留柔和流光尾迹
        for (const p of this._projectiles) {
            if (p.trail.length > 1 && p.fromPlayer) {
                g.strokeColor = new Color(p.color.r, p.color.g, p.color.b, 82);
                g.lineWidth = p.kind === 'sword_wave' ? 12 : 4.5;
                p.trail.forEach((t, idx) => (idx === 0 ? g.moveTo(t.x, t.y) : g.lineTo(t.x, t.y)));
                g.stroke();
            }
        }

        // 9. 冲击波光环与粒子
        for (const r of this._ringBursts) {
            const al = Math.floor((r.life / r.maxLife) * r.color.a);
            g.strokeColor = new Color(r.color.r, r.color.g, r.color.b, al);
            g.lineWidth = 3.2;
            g.circle(r.x, r.y, r.r);
            g.stroke();
        }
        for (const pt of this._particles) {
            const al = Math.floor((pt.life / pt.maxLife) * 255);
            g.fillColor = new Color(pt.color.r, pt.color.g, pt.color.b, al);
            g.circle(pt.x, pt.y, pt.r * (pt.life / pt.maxLife) + 1);
            g.fill();
        }
    }

    private _refreshHud(): void {
        const g = this._hudBarsGfx;
        g.clear();

        g.fillColor = new Color(14, 24, 26, 210);
        g.strokeColor = new Color(166, 194, 178, 190);
        g.lineWidth = 2;
        g.roundRect(-622, 232, 236, 114, 10);
        g.fill();
        g.stroke();

        const drawBar = (y: number, ratio: number, fill: Color) => {
            const x = -608;
            const w = 208;
            const h = 18;
            g.fillColor = new Color(26, 34, 38, 235);
            g.roundRect(x, y - h / 2, w, h, 5);
            g.fill();
            g.fillColor = fill;
            g.roundRect(x + 2, y - h / 2 + 2, Math.max(0, (w - 4) * Math.max(0, Math.min(1, ratio))), h - 4, 4);
            g.fill();
        };

        drawBar(326, this._hp / Math.max(1, this._maxHp), new Color(224, 66, 66, 250));
        drawBar(300, this._shield / Math.max(1, this._maxShield), new Color(104, 174, 236, 250));
        drawBar(274, this._energy / Math.max(1, this._maxEnergy), new Color(56, 132, 224, 250));

        this._hpLbl.string = `生命 ${this._hp}/${this._maxHp}`;
        this._shieldLbl.string = `护盾 ${this._shield}/${this._maxShield}`;
        this._energyLbl.string = `灵力 ${Math.floor(this._energy)}/${this._maxEnergy}`;
        this._stageLbl.string = `${this._stageCfg.biome.name} ${this._stageCfg.label} (${this._stageNum}/${DUNGEON_TOTAL_STAGES})`;
        this._lootLbl.string = `金币 ${this._runGold}  ·  玄铁 +${this._runIron}`;

        const curW = this._getActiveWeapon();
        this._weaponBtnLbl.string = `${getWeaponDisplayName(curW)}\n(Q切 · 耗蓝${getWeaponDef(curW.id).energyCost})`;
        this._syncHeldWeaponSprite();

        const boss = this._enemies.find((e) => e.isBoss && e.hp > 0);
        this._bossBarNode.active = !!boss;
        if (boss) {
            this._bossBarLbl.string = `${boss.name}${boss.bossEnraged ? ' [狂暴]' : ''}  ${boss.hp}/${boss.maxHp}`;
            const bg = this._bossBarGfx;
            bg.clear();
            bg.fillColor = new Color(22, 16, 18, 220);
            bg.strokeColor = new Color(246, 198, 120, 235);
            bg.lineWidth = 2;
            bg.roundRect(-210, -10, 420, 16, 6);
            bg.fill();
            bg.stroke();
            bg.fillColor = boss.bossEnraged ? new Color(252, 86, 48, 250) : new Color(228, 64, 58, 250);
            bg.roundRect(-207, -7, 414 * Math.max(0, boss.hp / Math.max(1, boss.maxHp)), 10, 4);
            bg.fill();
        }
    }

    private _showBanner(msg: string): void {
        this._bannerLbl.string = msg;
        this._bannerNode.active = true;
        this._bannerTimer = 2.4;
    }

    private _recordStageClearProgress(): void {
        this._runClearedStages += 1;
        const app = GameApp.inst;
        if (!app?.ready) return;
        const dng = app.saveData.dungeon;
        if (this._stageNum > (dng.highestClearedStage ?? 0)) dng.highestClearedStage = this._stageNum;
        const biomeIdx = Math.floor((this._stageNum - 1) / 10) + 1;
        if (this._stageNum % 10 === 0 && dng.deepestLayer < biomeIdx) dng.deepestLayer = biomeIdx;
        const anchors = new Set<number>(dng.unlockedAnchors ?? [1]);
        anchors.add(1);
        for (const b of DUNGEON_BIOMES) {
            const startSt = (b.chapter - 1) * 10 + 1;
            if (this._stageNum >= startSt) anchors.add(startSt);
        }
        dng.unlockedAnchors = Array.from(anchors).sort((a, b) => a - b);
        if (this._runClearedStages > (dng.bestStreak ?? 0)) dng.bestStreak = this._runClearedStages;
        if (this._stageNum >= DUNGEON_TOTAL_STAGES) dng.grandCleared = true;
        app.persist('dungeon');
    }

    private _settleLootToSave(): void {
        const app = GameApp.inst;
        if (!app?.ready) return;
        if (this._runGold > 0) app.saveData.gold = (app.saveData.gold ?? 0) + this._runGold;
        if (this._runIron > 0) {
            app.saveData.inventory['xuan_iron'] = (app.saveData.inventory['xuan_iron'] ?? 0) + this._runIron;
            if (app.saveData.farm.unlockedTier < 2 && app.saveData.inventory['xuan_iron'] >= 3) {
                app.saveData.farm.unlockedTier = 2;
            }
        }
        app.persist('dungeon');
    }

    private _retreatToOverworld(): void {
        this._settleLootToSave();
        const msg = `秘境归来：带回金币 +${this._runGold}，玄铁 +${this._runIron}`;
        this._closeOverlay();
        this._onToast?.(msg);
    }

    private _showRunEndModal(victory: boolean): void {
        this._modalOpen = true;
        this._modalLayer.removeAllChildren();
        this._settleLootToSave();

        const panel = this._createModalPanel(480, 290, victory ? '秘境大捷 · 60关通关!' : '力竭撤退 · 战利品已带回');
        this._addLabel(panel, `本次推进至：${this._stageCfg.biome.name} ${this._stageCfg.label}`, 17, new Color(224, 242, 236, 255), 0, 50, true, 1.5);
        this._addLabel(panel, `带回战利品：金币 +${this._runGold}  ·  玄铁 +${this._runIron}`, 16, new Color(252, 224, 138, 255), 0, 12, true, 1.5);

        this._makeButton(panel, 'Retry', -105, -78, 175, 48, '重选武器再战', new Color(36, 122, 92, 245), new Color(252, 224, 138, 255), () => {
            this._showPrepHall();
        }, 16);
        this._makeButton(panel, 'BackHome', 105, -78, 175, 48, '返回农场主岛', new Color(64, 48, 48, 240), new Color(206, 162, 148, 225), () => {
            this._closeOverlay();
            this._onToast?.(`秘境结算完成：金币 +${this._runGold}，玄铁 +${this._runIron}`);
        }, 16);
    }
}
