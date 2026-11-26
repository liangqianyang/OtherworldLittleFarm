/**
 * 《异界小农场 2.0》Cocos 原生 2D 分段骨骼动画器（元气骑士式侧向骨骼 · 全 6 大关覆盖版）
 * - 纯 Cocos UI_2D Sprite 父子关节树，0 WASM 依赖、100% 兼容 TapTap 小游戏、自动合批
 * - PlayerRigView：元气骑士式瞬时左右翻转 + 180° 双腿双臂真迈步 + 360° 团身翻滚 + 竖背飞剑匣 + 竖持惊雷杖 + 360° 武器瞄准
 * - MonsterRigView：全 6 大关 30+ 怪物原生骨骼动画（按大关色系着色迈步双腿 + 独立举盾/挥锤/刺矛/拉弩关节 + 飞行/悬浮怪飘浮轨迹）
 */

import { Color, Graphics, Layers, Node, Sprite, SpriteFrame } from 'cc';
import { ArtLoader } from './ArtLoader';
import { type WeaponDef } from '../gameplay/dungeon/DungeonWeapons';
import { type EnemyArchetype, type EnemyKind } from '../gameplay/dungeon/DungeonConfig';

export interface RigPoseInput {
    dt: number;
    moving: boolean;
    moveX?: number;
    moveY?: number;
    facingX: number;       // 1 = 右, -1 = 左
    aimAngle: number;      // 世界瞄准弧度
    dodging: boolean;
    dodgeProgress: number; // 0..1
    weaponDef: WeaponDef;
    meleeSwingTimer: number;
    meleeSwingMax: number;
    meleeSwingSign: number;
    weaponRecoil: number;  // 0..1
}

export class PlayerRigView {
    public readonly root: Node;
    private readonly _pelvis: Node;
    private readonly _torso: Node;
    private readonly _head: Node;
    private readonly _pack: Node;
    private readonly _backWeaponSlot: Node;
    private readonly _legBack: Node;
    private readonly _legFront: Node;
    private readonly _armBack: Node;
    private readonly _armFront: Node;
    private readonly _handWeaponSlot: Node;

    private _time = 0;
    private _runPhase = 0;
    private _landSquash = 0;
    private _wasDodging = false;
    private _curWeaponArtKey = '';
    private _curWeaponIsBack = false;

    constructor(parent: Node) {
        this.root = this._mkNode('PlayerRigRoot', parent);

        // 接地柔和阴影
        const shadow = this._mkNode('Shadow', this.root).addComponent(Graphics);
        shadow.fillColor = new Color(10, 16, 18, 128);
        shadow.ellipse(0, -20, 17, 7);
        shadow.fill();

        // 骨盆主节点（负责步态上下弹跳、360° 翻滚旋转、落地压缩弹性）
        this._pelvis = this._mkNode('Pelvis', this.root);
        this._pelvis.setPosition(0, -2, 0);

        // 1. 后背层：行囊斗笠 / 竖背青云飞剑匣
        this._pack = this._mkNode('BackPack', this._pelvis);
        this._pack.setPosition(-12, 16, 0);
        ArtLoader.applySprite(this._pack, 'rig_p_pack', 28, 30);

        this._backWeaponSlot = this._mkNode('BackWeaponSlot', this._pelvis);
        this._backWeaponSlot.setPosition(-14, 20, 0);
        this._backWeaponSlot.angle = 82; // 剑匣竖直背负在身后（略带侠客斜背角）
        this._backWeaponSlot.active = false;

        // 2. 后肢层（略暗色调增强 2.5D 立体层次）
        this._legBack = this._mkLimb('LegBack', this._pelvis, -2, -2, 'rig_p_leg', 14, 24, new Color(214, 210, 204, 255));
        this._armBack = this._mkLimb('ArmBack', this._pelvis, 2, 18, 'rig_p_arm', 13, 22, new Color(214, 210, 204, 255));

        // 3. 前腿
        this._legFront = this._mkLimb('LegFront', this._pelvis, 2, -2, 'rig_p_leg', 14, 24, new Color(255, 255, 255, 255));

        // 4. 躯干 + 头部
        this._torso = this._mkNode('Torso', this._pelvis);
        this._torso.setPosition(0, 11, 0);
        ArtLoader.applySprite(this._torso, 'rig_p_torso', 24, 30);

        this._head = this._mkNode('Head', this._torso);
        this._head.setPosition(1, 23, 0);
        ArtLoader.applySprite(this._head, 'rig_p_head', 30, 30);

        // 5. 前臂 + 手部武器挂点（武器真正握在手腕末端！）
        this._armFront = this._mkLimb('ArmFront', this._torso, -1, 7, 'rig_p_arm', 14, 23, new Color(255, 255, 255, 255));
        this._handWeaponSlot = this._mkNode('HandWeaponSlot', this._armFront);
        this._handWeaponSlot.setPosition(2, -18, 0);
    }

    private _mkNode(name: string, parent: Node): Node {
        const n = new Node(name);
        n.layer = Layers.Enum.UI_2D;
        n.parent = parent;
        return n;
    }

    private _mkLimb(
        name: string,
        parent: Node,
        px: number,
        py: number,
        artKey: string,
        w: number,
        h: number,
        tint: Color
    ): Node {
        const joint = this._mkNode(name, parent);
        joint.setPosition(px, py, 0);
        const sprHolder = this._mkNode('Spr', joint);
        sprHolder.setPosition(0, -h * 0.42, 0);
        ArtLoader.applySprite(sprHolder, artKey, w, h, () => {
            const sp = sprHolder.getChildByName('ArtSprite')?.getComponent(Sprite);
            if (sp) sp.color = tint;
        });
        return joint;
    }

    public syncWeapon(def: WeaponDef): void {
        const isBack = def.kind === 'homing';
        if (this._curWeaponArtKey === def.artKey && this._curWeaponIsBack === isBack) return;
        this._curWeaponArtKey = def.artKey;
        this._curWeaponIsBack = isBack;

        this._handWeaponSlot.removeAllChildren();
        this._backWeaponSlot.removeAllChildren();

        if (isBack) {
            this._pack.active = false;
            this._backWeaponSlot.active = true;
            // 剑匣旋转 82° 竖直背在身后，细长贴合背部轮廓
            this._backWeaponSlot.angle = 82;
            ArtLoader.applySprite(this._backWeaponSlot, def.artKey, 40, 24);
        } else {
            this._pack.active = true;
            this._backWeaponSlot.active = false;
            const w = def.kind === 'frost' ? 32 : def.kind === 'lightning' ? 58 : 52;
            const h = def.kind === 'frost' ? 24 : def.kind === 'lightning' ? 18 : 21;
            const wpnHolder = this._mkNode('WpnSpr', this._handWeaponSlot);
            const gripOffset = def.kind === 'lightning' ? w * 0.12 : w * 0.34;
            wpnHolder.setPosition(gripOffset, 0, 0);
            ArtLoader.applySprite(wpnHolder, def.artKey, w, h);
        }
    }

    public step(input: RigPoseInput): void {
        const { dt, moving, facingX, aimAngle, dodging, dodgeProgress, weaponDef } = input;
        this._time += dt;
        this.syncWeapon(weaponDef);

        // 元气骑士式顺滑左右整套骨骼翻转
        this.root.setScale(facingX, 1, 1);

        if (this._wasDodging && !dodging) {
            this._landSquash = 1.0;
        }
        this._wasDodging = dodging;
        if (this._landSquash > 0) {
            this._landSquash = Math.max(0, this._landSquash - dt * 5.5);
        }

        // === 状态 1：真实 360° 团身前滚翻 ===
        if (dodging) {
            const p = Math.max(0, Math.min(1, dodgeProgress));
            const arcY = Math.sin(p * Math.PI) * 14;
            this._pelvis.setPosition(0, 4 + arcY, 0);
            this._pelvis.angle = -p * 360;
            this._pelvis.setScale(0.92, 0.88, 1);

            this._torso.angle = -22;
            this._head.angle = -18;
            this._legFront.angle = 58;
            this._legBack.angle = 44;
            this._armFront.angle = 65;
            this._armBack.angle = 45;
            this._handWeaponSlot.angle = 20;
            return;
        }

        // === 状态 2：待机呼吸 & 真迈步跑步 ===
        const sq = Math.sin(this._landSquash * Math.PI);
        this._pelvis.angle = 0;
        this._pelvis.setScale(1 + sq * 0.16, 1 - sq * 0.14, 1);

        if (moving) {
            this._runPhase += dt * 15.5;
            const stride = Math.sin(this._runPhase);
            const hop = Math.abs(Math.cos(this._runPhase)) * 4.5;

            this._pelvis.setPosition(0, -2 + hop, 0);
            this._torso.angle = -9 + Math.sin(this._runPhase * 2) * 2.5;
            this._head.angle = 7 + Math.cos(this._runPhase * 2) * 2.0;
            this._pack.angle = 6 + Math.sin(this._runPhase * 2 - 0.8) * 4.5;
            this._backWeaponSlot.setPosition(-14 - input.weaponRecoil * 3, 20 + Math.sin(this._runPhase * 2) * 2.2, 0);
            this._backWeaponSlot.angle = 82 + Math.sin(this._runPhase * 2 - 0.6) * 3.5;

            this._legFront.angle = stride * 38;
            this._legBack.angle = -stride * 38;
            this._armBack.angle = -stride * 34;
        } else {
            const breathe = Math.sin(this._time * 3.4);
            this._pelvis.setPosition(0, -2 + breathe * 1.1, 0);
            this._torso.angle = breathe * 1.8;
            this._head.angle = -breathe * 1.6;
            this._pack.angle = breathe * 1.4;
            this._backWeaponSlot.setPosition(-14 - input.weaponRecoil * 3, 20 + breathe * 2.0, 0);
            this._backWeaponSlot.angle = 82 + breathe * 1.8;

            this._legFront.angle = 4;
            this._legBack.angle = -5;
            this._armBack.angle = -8 + breathe * 3;
        }

        // === 上半身前臂 + 手持武器融合动作 ===
        const localAimRad = facingX > 0 ? aimAngle : Math.atan2(Math.sin(aimAngle), -Math.cos(aimAngle));
        const localAimDeg = (localAimRad * 180) / Math.PI;

        if (weaponDef.kind === 'homing') {
            this._armFront.angle = moving ? Math.sin(this._runPhase) * 32 : (10 + Math.sin(this._time * 3.4) * 3);
            return;
        }

        if (weaponDef.kind === 'melee') {
            if (input.meleeSwingTimer > 0) {
                const prog = 1 - input.meleeSwingTimer / Math.max(0.01, input.meleeSwingMax);
                const swing = (-78 + prog * 165) * input.meleeSwingSign;
                this._armFront.angle = localAimDeg + 90 + swing;
                this._handWeaponSlot.angle = -85;
            } else {
                this._armFront.angle = 36 + Math.sin(this._time * 4) * 3;
                this._handWeaponSlot.angle = -8;
            }
            return;
        }

        if (weaponDef.kind === 'frost') {
            const fanSwing = input.weaponRecoil > 0.05 ? (-40 + (1 - input.weaponRecoil) * 90) : Math.sin(this._time * 3.5) * 10;
            this._armFront.angle = 48 + fanSwing;
            this._handWeaponSlot.angle = -45;
            return;
        }

        if (weaponDef.kind === 'lightning') {
            // 惊雷杖：竖直执杖握在身前，施法瞬间前臂微举
            if (input.weaponRecoil > 0.05) {
                this._armFront.angle = 52 + input.weaponRecoil * 22;
                this._handWeaponSlot.angle = 30 - input.weaponRecoil * 16;
            } else {
                const sway = moving ? Math.sin(this._runPhase) * 10 : Math.sin(this._time * 3.2) * 2.5;
                this._armFront.angle = 24 + sway;
                this._handWeaponSlot.angle = 64 - sway;
            }
            return;
        }

        const recoilKick = input.weaponRecoil * 14;
        this._armFront.angle = localAimDeg + 90 + recoilKick;
        this._handWeaponSlot.angle = -90;
    }
}

export interface MonsterRigPoseInput {
    dt: number;
    moving: boolean;
    moveX?: number;
    moveY?: number;
    facingX: number;
    aimAngle: number;
    windupTimer: number;
    windupKind: string;
    rushTimer: number;
    stunTimer: number;
    squashTimer: number;
    tint: Color;
}

type MonsterWeaponMode = 'none' | 'spear' | 'shield_hammer' | 'crossbow';

const FLOATING_MONSTER_KINDS = new Set<EnemyKind>([
    'ink_spirit',
    'fire_bat',
    'ice_prism',
    'miasma_flower',
    'arc_sparrow',
    'star_puppet',
    'rift_walker',
    'boss_frost_crane',
    'boss_ink_lotus',
]);

export class MonsterRigView {
    public readonly root: Node;
    public readonly bodySpriteHost: Node;

    private readonly _pelvis: Node;
    private readonly _bodyPivot: Node;
    private readonly _legBack: Node | null = null;
    private readonly _legFront: Node | null = null;
    private readonly _weaponJoint: Node | null = null;
    private readonly _shieldJoint: Node | null = null;

    private readonly _isFloating: boolean;
    private readonly _isBoss: boolean;
    private readonly _scaleFactor: number;
    private readonly _weaponMode: MonsterWeaponMode;
    private readonly _legBaseTintFront: Color;
    private readonly _legBaseTintBack: Color;

    private _time = Math.random() * 6.28;
    private _walkPhase = Math.random() * 6.28;
    private _bodyBaseY = 0;

    constructor(
        parent: Node,
        kind: EnemyKind,
        archetype: EnemyArchetype,
        spritePrefix: string,
        isBoss: boolean,
        isElite: boolean
    ) {
        this._isBoss = isBoss;
        this._scaleFactor = isElite && !isBoss ? 1.24 : 1.0;
        this._isFloating = FLOATING_MONSTER_KINDS.has(kind);

        // 仅对需要额外独立武器的怪物挂载骨骼武器/盾牌（已有自带巨刃/双爪的新大关怪保留清晰轮廓并驱动双腿骨骼）
        if (isBoss) {
            this._weaponMode = 'none';
        } else if (kind === 'paper_golem') {
            this._weaponMode = 'shield_hammer';
        } else if (kind === 'bamboo_imp') {
            this._weaponMode = 'spear';
        } else if (kind === 'bamboo_archer') {
            this._weaponMode = 'crossbow';
        } else {
            this._weaponMode = 'none';
        }

        // 按 6 大关生态色系给双腿骨骼着色，融为一体
        if (kind === 'magma_turtle' || kind === 'fire_taoist' || kind === 'boss_magma_furnace' || kind === 'boss_magma_wyrm') {
            this._legBaseTintFront = new Color(186, 104, 78, 255);
            this._legBaseTintBack = new Color(132, 68, 52, 255);
        } else if (kind === 'snow_puppet' || kind === 'frost_mirror_guard' || kind === 'boss_frost_turtle') {
            this._legBaseTintFront = new Color(152, 212, 232, 255);
            this._legBaseTintBack = new Color(104, 158, 182, 255);
        } else if (kind === 'venom_frog' || kind === 'shadow_ink_assassin' || kind === 'boss_ghost_spider') {
            this._legBaseTintFront = new Color(142, 114, 178, 255);
            this._legBaseTintBack = new Color(98, 76, 128, 255);
        } else if (kind === 'thunder_drummer' || kind === 'bronze_guardian' || kind === 'boss_thunder_lion' || kind === 'boss_thunder_lord') {
            this._legBaseTintFront = new Color(172, 188, 148, 255);
            this._legBaseTintBack = new Color(120, 134, 102, 255);
        } else if (kind === 'mana_eater' || kind === 'boss_twin_melee' || kind === 'boss_twin_ranged' || kind === 'boss_rift_overlord') {
            this._legBaseTintFront = new Color(118, 168, 188, 255);
            this._legBaseTintBack = new Color(78, 116, 138, 255);
        } else if (kind === 'paper_golem' || archetype === 'shield') {
            this._legBaseTintFront = new Color(166, 174, 162, 255);
            this._legBaseTintBack = new Color(124, 132, 122, 255);
        } else {
            this._legBaseTintFront = new Color(146, 188, 128, 255);
            this._legBaseTintBack = new Color(104, 140, 92, 255);
        }

        this.root = this._mkNode('MonsterRigRoot', parent);
        this._pelvis = this._mkNode('Pelvis', this.root);

        const s = this._scaleFactor;
        const sprW = Math.round((isBoss ? 124 : 62) * s);
        const sprH = Math.round((isBoss ? 124 : 64) * s);

        if (!this._isFloating) {
            const legW = Math.round((isBoss ? 22 : 12) * s);
            const legH = Math.round((isBoss ? 34 : 21) * s);
            const hipY = Math.round((isBoss ? -24 : -11) * s);
            const hipSpread = Math.round((isBoss ? 13 : 6) * s);
            this._legBack = this._mkLimb('LegBack', this._pelvis, -hipSpread, hipY, 'rig_p_leg', legW, legH, this._legBaseTintBack);
            this._legFront = this._mkLimb('LegFront', this._pelvis, hipSpread, hipY, 'rig_p_leg', legW, legH, this._legBaseTintFront);
            this._bodyBaseY = Math.round((isBoss ? 8 : 6) * s);
        } else {
            this._bodyBaseY = Math.round(6 * s);
        }

        this._bodyPivot = this._mkNode('BodyPivot', this._pelvis);
        this._bodyPivot.setPosition(0, this._bodyBaseY, 0);
        this.bodySpriteHost = this._mkNode('BodySpr', this._bodyPivot);
        ArtLoader.applySprite(this.bodySpriteHost, spritePrefix, sprW, sprH);

        if (this._weaponMode === 'shield_hammer') {
            this._weaponJoint = this._mkNode('HammerJoint', this._bodyPivot);
            this._weaponJoint.setPosition(-14 * s, 4 * s, 0);
            const hSpr = this._mkNode('HammerSpr', this._weaponJoint);
            hSpr.setPosition(-6 * s, 14 * s, 0);
            ArtLoader.applySprite(hSpr, 'rig_golem_hammer', Math.round(42 * s), Math.round(42 * s));

            this._shieldJoint = this._mkNode('ShieldJoint', this._bodyPivot);
            this._shieldJoint.setPosition(18 * s, -2 * s, 0);
            ArtLoader.applySprite(this._shieldJoint, 'rig_golem_shield', Math.round(36 * s), Math.round(46 * s));
        } else if (this._weaponMode === 'spear') {
            this._weaponJoint = this._mkNode('SpearJoint', this._bodyPivot);
            this._weaponJoint.setPosition(6 * s, -4 * s, 0);
            const sSpr = this._mkNode('SpearSpr', this._weaponJoint);
            sSpr.setPosition(18 * s, 0, 0);
            ArtLoader.applySprite(sSpr, 'rig_imp_spear', Math.round(68 * s), Math.round(20 * s));
        } else if (this._weaponMode === 'crossbow') {
            this._weaponJoint = this._mkNode('CrossbowJoint', this._bodyPivot);
            this._weaponJoint.setPosition(10 * s, -2 * s, 0);
            const cSpr = this._mkNode('CrossbowSpr', this._weaponJoint);
            cSpr.setPosition(12 * s, 0, 0);
            ArtLoader.applySprite(cSpr, 'wpn_jade_crossbow', Math.round(42 * s), Math.round(18 * s));
        }
    }

    private _mkNode(name: string, parent: Node): Node {
        const n = new Node(name);
        n.layer = Layers.Enum.UI_2D;
        n.parent = parent;
        return n;
    }

    private _mkLimb(
        name: string,
        parent: Node,
        px: number,
        py: number,
        artKey: string,
        w: number,
        h: number,
        tint: Color
    ): Node {
        const joint = this._mkNode(name, parent);
        joint.setPosition(px, py, 0);
        const sprHolder = this._mkNode('Spr', joint);
        sprHolder.setPosition(0, -h * 0.42, 0);
        ArtLoader.applySprite(sprHolder, artKey, w, h, () => {
            const sp = sprHolder.getChildByName('ArtSprite')?.getComponent(Sprite);
            if (sp) sp.color = tint;
        });
        return joint;
    }

    public setBodySpriteFrame(frame: SpriteFrame): void {
        const sp = this.bodySpriteHost.getChildByName('ArtSprite')?.getComponent(Sprite);
        if (sp) sp.spriteFrame = frame;
    }

    private _applyTint(tint: Color): void {
        const bodySp = this.bodySpriteHost.getChildByName('ArtSprite')?.getComponent(Sprite);
        if (bodySp) bodySp.color = tint;

        const mulColor = (base: Color): Color => new Color(
            Math.round((base.r * tint.r) / 255),
            Math.round((base.g * tint.g) / 255),
            Math.round((base.b * tint.b) / 255),
            tint.a
        );
        if (this._legFront) {
            const sp = this._legFront.getChildByName('Spr')?.getChildByName('ArtSprite')?.getComponent(Sprite);
            if (sp) sp.color = mulColor(this._legBaseTintFront);
        }
        if (this._legBack) {
            const sp = this._legBack.getChildByName('Spr')?.getChildByName('ArtSprite')?.getComponent(Sprite);
            if (sp) sp.color = mulColor(this._legBaseTintBack);
        }
    }

    public step(input: MonsterRigPoseInput): void {
        const { dt, moving, facingX, aimAngle, windupTimer, rushTimer, stunTimer, squashTimer, tint } = input;
        this._time += dt;
        this._applyTint(tint);

        const sq = squashTimer > 0 ? Math.sin((squashTimer / 0.14) * Math.PI) : 0;
        this.root.setScale(facingX * (1 + sq * 0.2), 1 - sq * 0.16, 1);

        const s = this._scaleFactor;
        const localAimRad = facingX > 0 ? aimAngle : Math.atan2(Math.sin(aimAngle), -Math.cos(aimAngle));
        const localAimDeg = (localAimRad * 180) / Math.PI;

        if (this._isFloating) {
            const bob = Math.sin(this._time * 4.8) * (this._isBoss ? 7.5 : 5.4);
            this._pelvis.setPosition(0, bob, 0);
            if (windupTimer > 0) {
                this._bodyPivot.angle = 16;
                this._bodyPivot.setScale(0.88, 1.14, 1);
            } else if (rushTimer > 0) {
                this._bodyPivot.angle = -18;
                this._bodyPivot.setScale(1.14, 0.88, 1);
            } else {
                this._bodyPivot.angle = moving ? -10 + Math.sin(this._time * 6.5) * 4.5 : Math.sin(this._time * 3.2) * 3.2;
                this._bodyPivot.setScale(1, 1, 1);
            }
            return;
        }

        const strideRate = rushTimer > 0 ? 22 : (this._isBoss ? 9.5 : 13.5);
        if (moving || rushTimer > 0) {
            this._walkPhase += dt * strideRate;
        }
        const stride = (moving || rushTimer > 0) ? Math.sin(this._walkPhase) : 0;
        const hop = (moving || rushTimer > 0)
            ? Math.abs(Math.cos(this._walkPhase)) * (this._isBoss ? 5.2 : 3.8)
            : Math.sin(this._time * 3.2) * 1.1;

        this._pelvis.setPosition(0, hop, 0);

        if (this._legFront && this._legBack) {
            const amp = rushTimer > 0 ? 48 : (this._isBoss ? 28 : 38);
            if (stunTimer > 0) {
                this._legFront.angle = 10;
                this._legBack.angle = -10;
            } else if (windupTimer > 0) {
                this._legFront.angle = 22;
                this._legBack.angle = -26;
            } else if (moving || rushTimer > 0) {
                this._legFront.angle = stride * amp;
                this._legBack.angle = -stride * amp;
            } else {
                this._legFront.angle = 5;
                this._legBack.angle = -5;
            }
        }

        if (windupTimer > 0) {
            this._bodyPivot.setPosition(-3 * s, this._bodyBaseY - 2 * s, 0);
            this._bodyPivot.angle = 14;
            this._bodyPivot.setScale(0.92, 1.1, 1);
        } else if (rushTimer > 0) {
            this._bodyPivot.setPosition(4 * s, this._bodyBaseY - 2 * s, 0);
            this._bodyPivot.angle = -16;
            this._bodyPivot.setScale(1.12, 0.9, 1);
        } else if (stunTimer > 0) {
            this._bodyPivot.setPosition(0, this._bodyBaseY, 0);
            this._bodyPivot.angle = Math.sin(this._time * 26) * 9;
            this._bodyPivot.setScale(1, 1, 1);
        } else {
            this._bodyPivot.setPosition(0, this._bodyBaseY, 0);
            this._bodyPivot.angle = moving ? (-7 + Math.sin(this._walkPhase * 2) * 2.5) : Math.sin(this._time * 3.2) * 1.8;
            this._bodyPivot.setScale(1, 1, 1);
        }

        if (this._weaponMode === 'shield_hammer') {
            if (this._shieldJoint) {
                if (windupTimer > 0) {
                    this._shieldJoint.setPosition(22 * s, 1 * s, 0);
                    this._shieldJoint.angle = -8;
                } else {
                    this._shieldJoint.setPosition(18 * s, (-2 + stride * 2.5) * s, 0);
                    this._shieldJoint.angle = -stride * 7;
                }
            }
            if (this._weaponJoint) {
                if (windupTimer > 0) {
                    this._weaponJoint.angle = 68;
                } else if (rushTimer > 0) {
                    this._weaponJoint.angle = -72;
                } else {
                    this._weaponJoint.angle = -14 + stride * 22;
                }
            }
        } else if (this._weaponMode === 'spear' && this._weaponJoint) {
            if (windupTimer > 0) {
                this._weaponJoint.setPosition(-5 * s, -2 * s, 0);
                this._weaponJoint.angle = 18;
            } else if (rushTimer > 0) {
                this._weaponJoint.setPosition(16 * s, -4 * s, 0);
                this._weaponJoint.angle = -4;
            } else {
                this._weaponJoint.setPosition(6 * s, (-4 + stride * 2) * s, 0);
                this._weaponJoint.angle = -6 + stride * 12;
            }
        } else if (this._weaponMode === 'crossbow' && this._weaponJoint) {
            const clampedAim = Math.max(-55, Math.min(55, localAimDeg));
            this._weaponJoint.angle = clampedAim;
            this._weaponJoint.setPosition((windupTimer > 0 ? 7 : 10) * s, -2 * s, 0);
        }
    }
}
