import { _decorator, Component, Node, Label, Graphics, Color, UITransform, EventTouch, Sprite, UIOpacity } from 'cc';
import { AdventureSystem, RoomDef } from '../gameplay/adventure/AdventureSystem';
import { DataManager } from '../core/DataManager';
import { GameApp } from '../app/GameApp';
import { BattlePanel } from './BattlePanel';
import { EventBus } from '../core/EventBus';
import { SpriteLib } from '../core/SpriteLib';

const { ccclass } = _decorator;

/** 采集物 id → 精灵路径 */
function spotSprite(itemId: string): string {
    if (itemId.includes('berry')) return 'adventure/bush_berry';
    if (itemId.includes('herb')) return 'adventure/herb_patch';
    if (itemId.includes('wood')) return 'adventure/wood_log';
    return itemId.includes('slime') ? 'monsters/slime' : 'ui/icon_carrot';
}

/**
 * AdventureHUD —— 探险场景 HUD（阶段 3 样板）。
 * 布局：
 *   顶部中央：房名 + 描述
 *   左侧：背包（负重 x/10 + 物品列表）
 *   中央：采集点按钮 / 战斗入口
 *   底部：前进（岔路时左右选择） / 撤回结算（仅出口房）
 */
@ccclass('AdventureHUD')
export class AdventureHUD extends Component {
    private _title: Label = null!;
    private _desc: Label = null!;
    private _bag: Label = null!;
    private _hp: Label = null!;
    private _actionRoot: Node = null!;
    private _battle: BattlePanel = null!;

    static readonly LAYER = 33554432;

    onLoad(): void {
        const layer = AdventureHUD.LAYER;
        // 林地地面背景（TILED 平铺，白天压暗少许）
        const ground = new Node('ground');
        ground.layer = layer;
        ground.addComponent(UITransform).setContentSize(1280, 720);
        const gs = ground.addComponent(Sprite)!;
        gs.sizeMode = Sprite.SizeMode.CUSTOM;
        gs.type = Sprite.Type.TILED;
        gs.color = new Color(165, 172, 150, 255);
        ground.setPosition(0, 0);
        const gFrame = SpriteLib.inst.get('tiles/ground_forest');
        if (gFrame) gs.spriteFrame = gFrame;
        this.node.addChild(ground);

        this._title = this._label('探险', 34, Color.WHITE, 0, 280);
        this._desc = this._label('', 22, new Color(200, 190, 170), 0, 236);
        this._hp = this._label('', 24, new Color(255, 120, 100), -520, 300);
        this._hp.node.setPosition(-520, 300);
        this._bag = this._label('', 22, new Color(230, 220, 200), -520, 160);
        this._bag.overflow = Label.Overflow.SHRINK;
        this._bag.node.getComponent(UITransform)!.setContentSize(300, 400);
        this._bag.node.setPosition(-470, 120);
        this._bag.enableWrapText = true;

        this._actionRoot = new Node('actions');
        this._actionRoot.layer = layer;
        this.node.addChild(this._actionRoot);

        this._battle = BattlePanel.create(this.node, layer);
        this._battle.node.active = false;

        // 状态刷新：探险事件统一走 farmChanged（方法引用 + onDestroy 退订，
        // 否则场景切换后监听器仍存活，_refresh 里 this.node=null 报错）
        EventBus.inst.on('farmChanged', this._refresh, this);
        // 场景进入即出发（样板单地图；未来多地图在农场选图）
        if (!AdventureSystem.inst.inRun) AdventureSystem.inst.start('old_wood');
        this._refresh();
    }

    protected onDestroy(): void {
        EventBus.inst.off('farmChanged', this._refresh, this);
    }

    /** 全量重绘动作区（样板直接重建，量小） */
    private _refresh(): void {
        const sys = AdventureSystem.inst;
        const run = sys.run;
        // 背景补赋图（onLoad 时素材可能未就绪，sprites_ready 事件会触发本刷新）
        const gFrame = SpriteLib.inst.get('tiles/ground_forest');
        const ground = this.node.getChildByName('ground');
        if (gFrame && ground && !ground.getComponent(Sprite)!.spriteFrame) {
            ground.getComponent(Sprite)!.spriteFrame = gFrame;
        }
        // 清空动作区
        this._actionRoot.removeAllChildren();

        if (!run) {
            this._title.string = '不在探险中';
            this._desc.string = '';
            this._bag.string = '';
            this._hp.string = '';
            // 死亡/放弃后的兜底出口：回农场（否则卡死在探险场景）
            this._button('返回农场', 0, -120, new Color(90, 110, 170), () => GameApp.inst.loadFarm(), this._actionRoot, 240);
            return;
        }

        const room = sys.room();
        if (!room) return;
        this._title.string = room.name ?? `房间 ${room.idx}`;
        this._desc.string = room.desc ?? '';

        // 背包与血量
        const bagLines: string[] = [`负重 ${run.bagCount}/${AdventureSystem.BAG_CAP}`];
        for (const [id, n] of Object.entries(run.bag)) {
            if (n > 0) {
                const def = DataManager.inst.getRow('catalogs/items', id);
                bagLines.push(`${def?.['name'] ?? id} ×${n}`);
            }
        }
        this._bag.string = bagLines.join('\n');
        this._hp.string = `HP ${run.playerHp}/${AdventureSystem.PLAYER_MAX_HP}`;

        // 采集点图标（视觉主体，emptied 压暗）+ 底部采集按钮
        if (room.spots) {
            const n = room.spots.length;
            room.spots.forEach((spot, i) => {
                const emptied = sys.spotEmptied(room.idx, i);
                const x = (i - (n - 1) / 2) * 180;
                this._sceneSprite(spotSprite(spot.itemId), x, 110, 96, emptied);
            });
            room.spots.forEach((spot, i) => {
                const emptied = sys.spotEmptied(room.idx, i);
                const itemDef = DataManager.inst.getRow('catalogs/items', spot.itemId);
                const text = emptied ? '已采集' : `采集 ${itemDef?.['name'] ?? spot.itemId}`;
                const y = 20 - i * 74;
                this._button(text, 0, y, emptied ? new Color(70, 70, 70) : new Color(74, 122, 62), () => {
                    if (!emptied) AdventureSystem.inst.gather(room.idx, i);
                }, this._actionRoot, 220);
            });
        }

        // 战斗房：怪物立绘 + 进入战斗按钮
        if ((room.kind === 'battle' || room.kind === 'elite') && !sys.battle) {
            this._sceneSprite(room.kind === 'elite' ? 'monsters/slime_elite' : 'monsters/slime', 0, 40, 132, false);
            this._button('进入战斗', 0, -120, new Color(178, 60, 52), () => {
                AdventureSystem.inst.startBattle();
                this._battle.show();
            }, this._actionRoot, 240);
        }
        if (sys.battle) this._battle.show();

        // 前进 / 岔路（战斗中锁定：怪没打完不能走）
        if (!sys.battle) {
            const next = room.next ?? [];
            if (next.length === 1) {
                this._button('前 进', 420, -260, new Color(90, 110, 170), () => AdventureSystem.inst.advance(0), this._actionRoot, 180);
            } else if (next.length > 1) {
                next.forEach((target, i) => {
                    const tRoom = sys.room(target);
                    const name = tRoom?.name ?? `岔路 ${i + 1}`;
                    this._button(`走：${name}`, -420 + i * 260, -260, new Color(90, 110, 170), () => {
                        AdventureSystem.inst.advance(i);
                    }, this._actionRoot, 240);
                });
            }
        }

        // 出口房：撤回结算
        if (room.kind === 'exit') {
            this._button('撤回农场（结算）', 420, -260, new Color(200, 150, 60), () => {
                AdventureSystem.inst.settle();
                GameApp.inst.loadFarm();
            }, this._actionRoot, 280);
        }

        // 随时可撤：常驻撤回入口（放在 _actionRoot 内随刷新重建，防叠加）
        this._button('放弃探险', -470, -280, new Color(80, 80, 90), () => {
            AdventureSystem.inst.settle();
            GameApp.inst.loadFarm();
        }, this._actionRoot, 180);
    }

    /** 场景中央立绘图标（素材未就绪/缺图时不建，压暗=UIOpacity 半透明） */
    private _sceneSprite(path: string, x: number, y: number, size: number, dim: boolean): void {
        const frame = SpriteLib.inst.get(path);
        if (!frame) return;
        const n = new Node(`art_${path}`);
        n.layer = AdventureHUD.LAYER;
        n.setPosition(x, y);
        n.addComponent(UITransform).setContentSize(size, size);
        const sp = n.addComponent(Sprite)!;
        sp.sizeMode = Sprite.SizeMode.CUSTOM; // 先 CUSTOM 再赋图（坑#21）
        sp.spriteFrame = frame;
        if (dim) {
            const op = n.addComponent(UIOpacity)!;
            op.opacity = 90;
        }
        this._actionRoot.addChild(n);
    }

    private _label(str: string, size: number, color: Color, x: number, y: number): Label {
        const n = new Node(`lbl${x}_${y}`);
        n.layer = AdventureHUD.LAYER;
        n.setPosition(x, y);
        const l = n.addComponent(Label);
        l.string = str;
        l.fontSize = size;
        l.lineHeight = size + 8;
        l.color = color;
        this.node.addChild(n);
        return l;
    }

    private _button(text: string, x: number, y: number, bg: Color, cb: () => void, parent: Node, w = 200): Node {
        const n = new Node(`btn_${text}`);
        n.layer = AdventureHUD.LAYER;
        n.setPosition(x, y);
        const h = 56;
        const ut = n.addComponent(UITransform);
        ut.setContentSize(w, h);
        const g = n.addComponent(Graphics);
        g.roundRect(-w / 2, -h / 2, w, h, 10);
        g.fillColor = bg;
        g.fill();
        g.strokeColor = Color.WHITE;
        g.lineWidth = 2;
        g.stroke();
        // Label 必须放子节点：同一节点上 Graphics 与 Label 都是 renderable，
        // 直接 addComponent(Label) 会报 "Can't add renderable component" 且不渲染
        const ln = new Node('lbl');
        ln.layer = AdventureHUD.LAYER;
        ln.addComponent(UITransform);
        const l = ln.addComponent(Label);
        l.string = text;
        l.fontSize = 24;
        l.lineHeight = 30;
        l.color = Color.WHITE;
        n.addChild(ln);
        n.on(Node.EventType.TOUCH_END, (e: EventTouch) => { e.propagationStopped = true; cb(); }, this);
        parent.addChild(n);
        return n;
    }
}
