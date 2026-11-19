import { _decorator, Component, Node, Graphics, Label, Color, UITransform, Sprite, SpriteFrame, EventTouch, assetManager } from 'cc';
import { EventBus } from '../core/EventBus';
import { DataManager } from '../core/DataManager';
import { AdventureSystem } from '../gameplay/adventure/AdventureSystem';
import { SfxLib } from '../core/SfxLib';
import { SpriteLib } from '../core/SpriteLib';

const { ccclass } = _decorator;

// 屏幕 UI 层（1<<24，overlay 相机）：副本面板是屏幕空间全屏 UI，不能用 SCREEN_UI 世界层
// （世界层锚定原点，主相机跟随玩家远离原点时整块面板渲染到屏外）
const SCREEN_UI = 1 << 24;

/**
 * DungeonOverlay —— 世界场景内的全屏副本界面（M5 探险副本化）。
 * 房链 UI（房名/采集/前进/岔路/撤回）+ 战斗房实时战场（CombatSession 渲染）。
 * 移动输入走世界摇杆（WorldSpike 路由到 AdventureSystem.combatInput）；
 * 右侧 攻击（按住）/翻滚（点按）按钮由本面板提供。
 */
@ccclass('DungeonOverlay')
export class DungeonOverlay {
    static create(parent: Node): Node {
        const root = new Node('DungeonOverlay');
        root.layer = SCREEN_UI;
        root.addComponent(UITransform).setContentSize(1280, 720);
        parent.addChild(root);
        root.addComponent(DungeonOverlayComp);
        root.active = false;
        return root;
    }
}

/** 战场像素坐标（CombatSession arena 960×576 → 屏幕 900×540） */
const VIEW_W = 900, VIEW_H = 540;

@ccclass('DungeonOverlayComp')
export class DungeonOverlayComp extends Component {
    private _g: Graphics | null = null;
    private _monRoot: Node | null = null;
    private _monNodes = new Map<number, { n: Node; g: Graphics; hp: Graphics; spr: Sprite | null }>();
    private _actionRoot: Node | null = null;
    private _banner: Label | null = null;
    private _hud: Label | null = null;
    private _arenaG: Graphics | null = null;
    private _playerSpr: Sprite | null = null;
    private _tryArtT = 0;
    private _lastKey = '';

    /** 从 SpriteLib 取已加载 SpriteFrame（Bundle 路径键=完整相对路径；缺省返回 null 由调用方走色块兜底） */
    private _frameOf(rel: string): SpriteFrame | null {
        return SpriteLib.inst.get(rel);
    }

    onLoad(): void {
        this.node.on(Node.EventType.TOUCH_END, this._onTap, this);
        EventBus.inst.on('farmChanged', this._refresh, this);
    }

    onDestroy(): void {
        this.node.off(Node.EventType.TOUCH_END, this._onTap, this);
        EventBus.inst.off('farmChanged', this._refresh, this);
    }

    open(): void {
        this.node.active = true;
        this._refresh();
    }

    close(): void {
        this.node.active = false;
    }

    private _sys(): AdventureSystem { return AdventureSystem.inst; }

    /** 房链状态指纹：仅变化时重建 UI（周期重建会把按压中的按钮销毁，导致点击无响应） */
    private _stateKey(): string {
        const sys = this._sys();
        const run = sys.run;
        if (!run) return 'out';
        const emptied = Array.from(run.emptied.entries()).map(([k, v]) => `${k}=${v}`).join(',');
        return `${sys.inCombat ? 1 : 0}|${run.roomIdx}|${run.bagCount}|${run.playerHp}|${SpriteLib.inst.ready ? 1 : 0}|${emptied}`;
    }

    /** 物品 id → 显示名（items 表缺失回退 id） */
    private _itemName(id: string): string {
        const name = DataManager.inst.getRow('catalogs/items', id)?.['name'];
        return typeof name === 'string' && name ? name : id;
    }

    private _onTap(ev: EventTouch): void {
        ev.propagationStopped = true;
    }

    /** 面板内点击路由：战斗中点战场=无操作（攻击用按钮），房链按钮走子节点事件 */
    update(dt: number): void {
        if (!this.node.active) return;
        const sys = this._sys();
        if (sys.inCombat) {
            sys.tickCombat(dt);
            this._syncBattle();
        } else {
            this._tryArtT += dt;
            if (this._tryArtT > 0.6) {
                this._tryArtT = 0;
                if (this._stateKey() !== this._lastKey) this._refresh();
            }
        }
    }

    // ============ 房链 UI ============

    private _refresh(): void {
        if (!this.node.active) return;
        const sys = this._sys();
        if (!sys.inRun) { this.close(); return; }
        this._drawFrame();
        if (sys.inCombat) {
            this._drawBattleIntro();
        } else {
            this._drawRoomUI();
        }
        this._drawHud();
        this._lastKey = this._stateKey();
    }

    private _drawFrame(): void {
        if (!this._g) {
            const gNode = new Node('dlg');
            gNode.layer = SCREEN_UI;
            gNode.addComponent(UITransform).setContentSize(1280, 720);
            this.node.addChild(gNode);
            this._g = gNode.addComponent(Graphics);
            // 战场底
            const aNode = new Node('arenaBg');
            aNode.layer = SCREEN_UI;
            aNode.addComponent(UITransform).setContentSize(900, 540);
            this.node.addChild(aNode);
            this._arenaG = aNode.addComponent(Graphics);
            this._monRoot = new Node('monsters');
            this._monRoot.layer = SCREEN_UI;
            this._monRoot.addComponent(UITransform).setContentSize(900, 540);
            this.node.addChild(this._monRoot);
            const hudNode = new Node('hud');
            hudNode.layer = SCREEN_UI;
            hudNode.addComponent(UITransform).setContentSize(700, 30);
            hudNode.setPosition(0, 344);
            this.node.addChild(hudNode);
            this._hud = this._makeLabel(hudNode, 26, Color.WHITE, 0, 0, 700, 30);
            const bn = new Node('banner');
            bn.layer = SCREEN_UI;
            bn.addComponent(UITransform).setContentSize(900, 60);
            bn.setPosition(0, 300);
            this.node.addChild(bn);
            this._banner = this._makeLabel(bn, 30, new Color(255, 224, 130), 0, 0, 900, 60);
        }
        const g = this._g;
        g.clear();
        g.fillColor = new Color(8, 10, 22, 246);
        g.roundRect(-640, -360, 1280, 720, 0);
        g.fill();
        g.strokeColor = new Color(212, 175, 90, 255);
        g.lineWidth = 4;
        g.roundRect(-636, -356, 1272, 712, 12);
        g.stroke();
    }

    private _drawRoomUI(): void {
        const sys = this._sys();
        const run = sys.run!;
        const room = sys.room()!;
        this._banner!.string = room.name;
        if (this._actionRoot) this._actionRoot.destroy();
        const root = new Node('actions');
        root.layer = SCREEN_UI;
        root.addComponent(UITransform).setContentSize(1280, 720);
        this.node.addChild(root);
        this._actionRoot = root;
        const arenaG = this._arenaG!;
        arenaG.clear();

        // desc
        const dn = new Node('desc');
        dn.layer = SCREEN_UI;
        dn.addComponent(UITransform).setContentSize(820, 44);
        dn.setPosition(0, 240);
        root.addChild(dn);
        const dl = this._makeLabel(dn, 20, new Color(200, 200, 205), 0, 0, 820, 44);
        dl.string = room.desc;

        // 采集点
        const spots = room.spots ?? [];
        spots.forEach((spot, i) => {
            const emptied = sys.spotEmptied(run.roomIdx, i);
            const taken = run.emptied.get(`${run.roomIdx}:${i}`) ?? 0;
            const max = Number(spot.max ?? 1);
            const label = emptied ? `${this._itemName(spot.itemId)} 已采完` : `采集 ${this._itemName(spot.itemId)}（${taken}/${max}）`;
            const btn = this._button(root, (i - (spots.length - 1) / 2) * 240, 120, 200, 60, label, emptied ? new Color(90, 90, 95) : new Color(70, 110, 70), () => {
                sys.gather(run.roomIdx, i);
            });
            void btn;
        });

        // 前进/岔路/出口
        const nextList = room.next ?? [];
        if (room.kind === 'exit') {
            this._button(root, 0, -80, 240, 72, '撤 回 农 场', new Color(150, 70, 60), () => {
                sys.settle();
            });
        } else {
            nextList.forEach((target, ci) => {
                const nr = sys.room(target);
                const cx = nextList.length === 1 ? 0 : (ci - (nextList.length - 1) / 2) * 320;
                this._button(root, cx, -80, 260, 72, `前进：${nr?.name ?? '?'}`, new Color(60, 90, 150), () => {
                    sys.advance(ci);
                });
            });
        }
        // 放弃探险
        this._button(root, -470, -280, 190, 60, '放弃探险', new Color(120, 120, 125), () => {
            sys.settle();
        });
    }

    // ============ 战斗 UI ============

    private _drawBattleIntro(): void {
        const sys = this._sys();
        const c = sys.combat!;
        const room = sys.room()!;
        this._banner!.string = `⚔ ${room.name} — 战斗！`;
        this._drawArena();
        this._drawActionButtons();
        void c;
    }

    private _drawArena(): void {
        const sys = this._sys();
        const c = sys.combat;
        const g = this._arenaG!;
        g.clear();
        if (!c) return;
        // 竞技场地板：暗底 + 复古对角棋盘格（17×10 格，深绿双色，元气骑士地牢感）
        g.fillColor = new Color(24, 30, 26, 255);
        g.roundRect(-VIEW_W / 2, -VIEW_H / 2, VIEW_W, VIEW_H, 10);
        g.fill();
        const CELL = 54;
        for (let iy = 0; iy < Math.ceil(VIEW_H / CELL); iy++) {
            for (let ix = 0; ix < Math.ceil(VIEW_W / CELL); ix++) {
                if ((ix + iy) % 2 === 0) continue;
                g.fillColor = new Color(34, 44, 36, 255);
                g.roundRect(-VIEW_W / 2 + ix * CELL, -VIEW_H / 2 + iy * CELL, CELL, CELL, 4);
                g.fill();
            }
        }
        g.strokeColor = new Color(90, 100, 90, 255);
        g.lineWidth = 2;
        g.roundRect(-VIEW_W / 2, -VIEW_H / 2, VIEW_W, VIEW_H, 10);
        g.stroke();
        // 玩家：AI 素材贴图（缺失时色块兜底）；翻滚=压扁+白色残影圈
        const px = this._ax(c.player.x), py = this._ay(c.player.y);
        if (!this._playerSpr) {
            const f = this._frameOf('characters/player_down');
            if (f) {
                const pn = this._monRoot!.children.find((ch) => ch.name === 'player') ?? (() => {
                    const n = new Node('player');
                    n.layer = (this._monRoot as Node).layer;
                    n.addComponent(UITransform).setContentSize(52, 52);
                    this._monRoot!.addChild(n);
                    return n;
                })();
                let sp = pn.getComponent(Sprite);
                if (!sp) { sp = pn.addComponent(Sprite); sp.sizeMode = Sprite.SizeMode.RAW; }
                sp.spriteFrame = f;
                this._playerSpr = sp;
            }
        }
        if (this._playerSpr && this._playerSpr.isValid && this._playerSpr.spriteFrame) {
            const n = this._playerSpr.node;
            n.setPosition(px, py - 6, 0);
            n.setScale(c.player.rollT > 0 ? 0.7 : 1, c.player.rollT > 0 ? 0.7 : 1, 1);
            n.angle = c.player.rollT > 0 ? (n.angle + 24) % 360 : 0;
        } else {
            // 兜底：色块小人（素材未加载/加载失败）
            g.fillColor = new Color(70, 130, 200, 255);
            g.circle(px, py, 13);
            g.fill();
            g.fillColor = new Color(240, 200, 90, 255);
            g.circle(px + c.player.facingX * 14, py + c.player.facingY * 14 - 12, 9);
            g.fill();
        }
        if (c.player.rollT > 0) {
            g.strokeColor = new Color(255, 255, 255, 200);
            g.lineWidth = 3;
            g.circle(px, py, 22);
            g.stroke();
        }
        // 弹幕
        for (const b of c.bullets) {
            g.fillColor = b.enemy ? new Color(255, 90, 90, 255) : new Color(250, 230, 140, 255);
            g.circle(this._ax(b.x), this._ay(b.y), b.r * 0.8);
            g.fill();
        }
    }

    private _ax(wx: number): number { return -VIEW_W / 2 + (wx / 960) * VIEW_W; }
    private _ay(wy: number): number { return VIEW_H / 2 - (wy / 576) * VIEW_H; }

    private _syncBattle(): void {
        const sys = this._sys();
        const c = sys.combat;
        if (!c || !this._monRoot) return;
        this._drawArena();
        const seen = new Set<number>();
        for (const m of c.monsters) {
            seen.add(m.uid);
            let entry = this._monNodes.get(m.uid);
            if (!entry) {
                const n = new Node(`mo_${m.uid}`);
                n.layer = SCREEN_UI;
                n.addComponent(UITransform).setContentSize(80, 80);
                this._monRoot.addChild(n);
                const g = n.addComponent(Graphics);
                const hpN = new Node('hp');
                hpN.layer = SCREEN_UI;
                hpN.addComponent(UITransform).setContentSize(44, 6);
                n.addChild(hpN);
                const hpG = hpN.addComponent(Graphics);
                hpN.setPosition(0, -26);
                entry = { n, g, hp: hpG, spr: null };
                this._monNodes.set(m.uid, entry);
            }
            entry.n.setPosition(this._ax(m.x), this._ay(m.y) + 16);
            const g = entry.g;
            g.clear();
            const col = m.spec.mid.includes('elite') ? new Color(160, 90, 200) : m.spec.mid.includes('spore') ? new Color(150, 110, 70) : new Color(110, 190, 90);
            const r = m.spec.radius * (VIEW_W / 960);
            // 怪物：优先 AI 素材贴图（slime/sporeling），色块兜底；受击闪白
            const rel = m.spec.mid.includes('spore') ? 'monsters/sporeling_idle' : 'monsters/slime_idle';
            if (!entry.spr) {
                const f = this._frameOf(rel);
                if (f) {
                    // 怪物贴图挂 art 子节点：entry.n 已有 Graphics（色块兜底），同节点 Sprite 会被引擎拒绝（warn 12002）
                    let artN = entry.n.getChildByName('art');
                    if (!artN) {
                        artN = new Node('art');
                        artN.layer = SCREEN_UI;
                        artN.addComponent(UITransform).setContentSize(80, 80);
                        entry.n.addChild(artN);
                    }
                    let sp = artN.getComponent(Sprite);
                    if (!sp) { sp = artN.addComponent(Sprite); sp.sizeMode = Sprite.SizeMode.RAW; }
                    sp.spriteFrame = f;
                    entry.spr = sp;
                }
            } else if (entry.spr.spriteFrame && !entry.spr.spriteFrame.name.includes(rel.split('/').pop()!)) {
                const f = this._frameOf(rel);
                if (f && f !== entry.spr.spriteFrame) entry.spr.spriteFrame = f;
            }
            if (entry.spr && entry.spr.spriteFrame) {
                entry.spr.node.setScale(m.hitT > 0 ? 1.18 : 1, m.hitT > 0 ? 1.18 : 1, 1);
            } else {
                g.fillColor = m.hitT > 0 ? Color.WHITE : col;
                g.circle(0, 0, r);
                g.fill();
                g.strokeColor = new Color(20, 26, 20, 255);
                g.lineWidth = 2;
                g.circle(0, 0, r);
                g.stroke();
            }
            const hpG = entry.hp;
            hpG.clear();
            const ratio = Math.max(0, m.hp / m.spec.hp);
            hpG.fillColor = ratio > 0.5 ? new Color(80, 200, 90) : new Color(220, 80, 60);
            hpG.roundRect(-22, -3, 44 * ratio, 6, 3);
            hpG.fill();
        }
        for (const [uid, entry] of this._monNodes) {
            if (!seen.has(uid)) { entry.n.destroy(); this._monNodes.delete(uid); }
        }
        // HUD：血条 + 武器名
        const p = c.player;
        this._hud!.string = `❤ ${Math.max(0, p.hp)}/${p.maxHp}   ⚔ ${p.weapon.name}   怪物 ${c.monsters.length}   （移动=左摇杆 攻击=右钮 翻滚=闪避钮）`;
        this._hud!.color = p.hp <= 5 ? new Color(255, 90, 90) : Color.WHITE;
    }

    private _drawActionButtons(): void {
        if (this._actionRoot) this._actionRoot.destroy();
        const root = new Node('actions');
        root.layer = SCREEN_UI;
        root.addComponent(UITransform).setContentSize(1280, 720);
        this.node.addChild(root);
        this._actionRoot = root;
        const sys = this._sys();
        // 攻击（按住）——icon_attack 贴图 + 文字
        const atkBtn = this._holdButton(root, 500, -180, 130, 130, '攻 击', new Color(170, 60, 50), (down) => {
            sys.combatInput.attack = down;
        });
        this._iconOn(atkBtn, 'ui/icon_attack', 0, 34, 56);
        // 翻滚（点按）——icon_roll 贴图 + 文字
        const rollBtn = this._button(root, 330, -270, 120, 66, '翻 滚', new Color(60, 120, 150), () => {
            sys.combatInput.roll = true;
            this.scheduleOnce(() => { sys.combatInput.roll = false; }, 0.1);
        });
        this._iconOn(rollBtn, 'ui/icon_roll', -38, 0, 36);
        // 撤退
        const retBtn = this._button(root, -500, -280, 170, 60, '撤 退', new Color(120, 120, 125), () => {
            sys.fleeCombat();
            SfxLib.inst.play('deny');
        });
        void retBtn;
    }

    /** 挂 AI 图标 Sprite（SpriteLib 世界场景初始化时已 ready；无素材静默跳过走纯文字） */
    private _iconOn(parent: Node, key: string, x: number, y: number, size: number): void {
        const sf = SpriteLib.inst.get(key);
        if (!sf) return;
        const n = new Node('icon');
        n.layer = parent.layer;
        n.addComponent(UITransform).setContentSize(size, size);
        n.setPosition(x, y);
        parent.addChild(n);
        const sp = n.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        sp.spriteFrame = sf;
    }

    private _drawHud(): void {
        const sys = this._sys();
        const run = sys.run;
        if (!run) return;
        const items = Object.entries(run.bag).filter(([, n]) => n > 0)
            .map(([id, n]) => `${this._itemName(id)}×${n}`).join(' ') || '空';
        this._banner!.string = sys.inCombat ? this._banner!.string : `${sys.room()?.name ?? ''} · 负重 ${run.bagCount}/${AdventureSystem.BAG_CAP}`;
        this._hud!.string = `HP ${run.playerHp}/${AdventureSystem.PLAYER_MAX_HP} · 背包: ${items}`;
    }

    // ============ 控件工具 ============

    private _makeLabel(parent: Node, size: number, color: Color, x: number, y: number, w: number, h: number): Label {
        const ln = new Node('lbl');
        ln.layer = parent.layer;
        ln.addComponent(UITransform).setContentSize(w, h);
        ln.setPosition(x, y);
        parent.addChild(ln);
        const l = ln.addComponent(Label);
        l.fontSize = size;
        l.lineHeight = size + 4;
        l.color = color;
        l.overflow = Label.Overflow.SHRINK;
        l.horizontalAlign = Label.HorizontalAlign.CENTER;
        l.verticalAlign = Label.VerticalAlign.CENTER;
        return l;
    }

    private _button(parent: Node, x: number, y: number, w: number, h: number, text: string, color: Color, onTap: () => void): Node {
        const n = new Node(`btn_${text}`);
        n.layer = parent.layer;
        n.addComponent(UITransform).setContentSize(w, h);
        n.setPosition(x, y);
        parent.addChild(n);
        const g = n.addComponent(Graphics);
        g.fillColor = color;
        g.roundRect(-w / 2, -h / 2, w, h, 10);
        g.fill();
        g.strokeColor = new Color(230, 220, 190, 200);
        g.lineWidth = 3;
        g.roundRect(-w / 2, -h / 2, w, h, 10);
        g.stroke();
        this._makeLabel(n, Math.round(h * 0.38), Color.WHITE, 0, 0, w - 12, h - 8).string = text;
        n.on(Node.EventType.TOUCH_START, (ev: EventTouch) => { ev.propagationStopped = true; });
        n.on(Node.EventType.TOUCH_END, (ev: EventTouch) => {
            ev.propagationStopped = true;
            if (!this._sys().inRun) return;
            SfxLib.inst.play('bite');
            onTap();
        });
        return n;
    }

    private _holdButton(parent: Node, x: number, y: number, w: number, h: number, text: string, color: Color, onHold: (down: boolean) => void): Node {
        const n = this._button(parent, x, y, w, h, text, color, () => {});
        n.off(Node.EventType.TOUCH_END);
        n.on(Node.EventType.TOUCH_START, (ev: EventTouch) => { ev.propagationStopped = true; onHold(true); });
        n.on(Node.EventType.TOUCH_END, (ev: EventTouch) => { ev.propagationStopped = true; onHold(false); });
        n.on(Node.EventType.TOUCH_CANCEL, () => onHold(false));
        return n;
    }
}
