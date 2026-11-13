import { _decorator, Component, Node, UITransform, Graphics, Color, Label, Sprite } from 'cc';
const { ccclass } = _decorator;

import { EventBus } from '../core/EventBus';
import { TimeSystem } from '../core/TimeSystem';
import { GameApp } from '../app/GameApp';
import { DefenseSystem, FieldMonster } from '../gameplay/defense/DefenseSystem';
import { SpriteLib } from '../core/SpriteLib';

/** 怪物 id → 精灵路径 */
function monsterSprite(mid: string): string {
    return mid.includes('elite') ? 'monsters/slime_elite' : 'monsters/slime';
}

/**
 * DefenseOverlay —— 封印之夜覆盖层（阶段 4 样板）。
 *
 * BedtimeDialog 确认睡觉时若今晚有防守（DefenseSystem.hasNightTonight），
 * 先进入本覆盖层打完夜战，结算后（settle）才真正 endDay 过夜——防守只在在线流程判定。
 *
 * 视觉：夜幕 + 林地地面平铺（夜间调暗）、左侧生成、右侧谷仓（barn 精灵）；
 * 怪物 = slime/slime_elite 精灵 + HP 条，点击怪物挥击（4-7 伤）。
 * 漏怪会吃库存（DefenseSystem._devour），全灭 = 胜利战利品。
 */
@ccclass('DefenseOverlay')
export class DefenseOverlay extends Component {
    private _infoLabel: Label = null!;
    private _monsterRoot: Node = null!;
    private _resultRoot: Node = null!;
    private _nodes: Map<number, Node> = new Map();

    /** 程序化创建（挂 farm Canvas，隐藏备用） */
    static create(parent: Node, layer: number): DefenseOverlay {
        const root = new Node('DefenseOverlay');
        root.layer = layer;
        root.addComponent(UITransform).setContentSize(1280, 720);
        parent.addChild(root);

        // 夜幕（吞点击防穿透到农场）
        const g = root.addComponent(Graphics)!;
        g.fillColor = new Color(6, 8, 30, 240);
        g.rect(-640, -360, 1280, 720);
        g.fill();
        const swallow = (): void => { /* 拦截 */ };
        root.on(Node.EventType.TOUCH_START, swallow);
        root.on(Node.EventType.TOUCH_END, swallow);

        // 林地地面平铺（夜间压暗调蓝，盖在夜幕上作战场底）
        const ground = new Node('ground');
        ground.layer = layer;
        ground.addComponent(UITransform).setContentSize(1280, 720);
        const gs = ground.addComponent(Sprite)!;
        gs.sizeMode = Sprite.SizeMode.CUSTOM;
        gs.type = Sprite.Type.TILED;
        gs.color = new Color(120, 128, 165, 235);
        ground.setPosition(0, 0);
        ground.active = false; // open() 时素材就绪再显示
        root.addChild(ground);

        root.addChild(DefenseOverlay._labelNode('封 印 之 夜', 30, 0, 280, layer));
        const info = DefenseOverlay._labelNode('', 20, 0, 230, layer);
        root.addChild(info);

        // 谷仓防线（右侧）—— barn 精灵 + Graphics 底框兜底
        const barn = new Node('barn');
        barn.layer = layer;
        barn.addComponent(UITransform).setContentSize(120, 340);
        barn.setPosition(520, 0);
        const bg = barn.addComponent(Graphics)!;
        bg.fillColor = new Color(74, 52, 32, 255);
        bg.strokeColor = new Color(242, 193, 78, 200);
        bg.lineWidth = 3;
        bg.roundRect(-50, -160, 100, 320, 12);
        bg.fill();
        bg.stroke();
        const barnSpr = new Node('barnSpr');
        barnSpr.layer = layer;
        barnSpr.addComponent(UITransform).setContentSize(128, 128);
        const bs = barnSpr.addComponent(Sprite)!;
        bs.sizeMode = Sprite.SizeMode.CUSTOM; // 先 CUSTOM 再赋图（坑#21）
        barnSpr.setPosition(0, 0);
        barnSpr.active = false;
        barn.addChild(barnSpr);
        barn.addChild(DefenseOverlay._labelNode('谷仓', 22, 0, -120, layer));
        root.addChild(barn);

        // 怪物容器
        const monsterRoot = new Node('monsters');
        monsterRoot.layer = layer;
        root.addChild(monsterRoot);

        // 提示
        root.addChild(DefenseOverlay._labelNode('点击怪物挥击！别放它们进谷仓', 18, 0, -300, layer));

        // 结果面板（战斗结束弹出）
        const resultRoot = new Node('result');
        resultRoot.layer = layer;
        resultRoot.addComponent(UITransform).setContentSize(520, 320);
        resultRoot.setPosition(0, 0);
        const rg = resultRoot.addComponent(Graphics)!;
        rg.fillColor = new Color(30, 26, 22, 250);
        rg.strokeColor = new Color(242, 193, 78, 220);
        rg.lineWidth = 3;
        rg.roundRect(-260, -160, 520, 320, 16);
        rg.fill();
        rg.stroke();
        const resultLabel = DefenseOverlay._labelNode('', 22, 0, 60, layer);
        resultLabel.name = 'resultText';
        resultRoot.addChild(resultLabel);
        resultRoot.addChild(DefenseOverlay._buttonNode('天亮了', 0, -90, () => comp._onDawn(), layer));
        resultRoot.active = false;
        root.addChild(resultRoot);

        const comp = root.addComponent(DefenseOverlay);
        comp._infoLabel = info.getComponent(Label)!;
        comp._monsterRoot = monsterRoot;
        comp._resultRoot = resultRoot;
        root.active = false;
        return comp;
    }

    /** 开战入口（BedtimeDialog 调用）。返回 false=没有今晚防守（调用方直接过夜） */
    open(): boolean {
        if (!DefenseSystem.inst.startNight()) return false;
        // 守门人简报
        const intel = DefenseSystem.inst.intelTonight();
        const brief = intel.map((i) => `${i.monsterName}×${i.count}`).join('、');
        this._infoLabel.string = `守门人：${brief} 正在接近封印之门！`;
        this._resultRoot.active = false;
        this._applyArt();
        this.node.active = true;
        return true;
    }

    /** 素材赋图（open 时 SpriteLib 必已就绪；未就绪保留 Graphics 占位） */
    private _applyArt(): void {
        const lib = SpriteLib.inst;
        if (!lib.ready) return;
        const barnFrame = lib.get('adventure/barn');
        const barnSpr = this.node.getChildByName('barn')?.getChildByName('barnSpr');
        if (barnFrame && barnSpr) {
            barnSpr.getComponent(Sprite)!.spriteFrame = barnFrame;
            barnSpr.active = true;
        }
        const groundFrame = lib.get('tiles/ground_forest');
        const ground = this.node.getChildByName('ground');
        if (groundFrame && ground) {
            ground.getComponent(Sprite)!.spriteFrame = groundFrame;
            ground.active = true;
        }
    }

    update(dt: number): void {
        if (!this.node.active) return;
        const sys = DefenseSystem.inst;
        sys.tick(dt);
        const s = sys.night;
        if (!s) { this.node.active = false; return; }

        // 同步怪物节点（生成/移动/死亡）
        const seen = new Set<number>();
        for (const mo of s.monsters) {
            if (!mo.alive) continue;
            seen.add(mo.uid);
            let n = this._nodes.get(mo.uid);
            if (!n) {
                n = this._makeMonsterNode(mo, this.node.layer);
                this._monsterRoot.addChild(n);
                this._nodes.set(mo.uid, n);
            }
            n.setPosition(mo.x, mo.y);
            this._redrawHp(n, mo);
        }
        // 移除死亡节点
        for (const [uid, n] of this._nodes) {
            if (!seen.has(uid)) {
                n.destroy();
                this._nodes.delete(uid);
            }
        }

        // 剩余敌人提示
        const alive = s.monsters.filter((m) => m.alive).length;
        const remain = s.total - s.spawned;
        this._infoLabel.string = `击杀 ${s.killed} · 漏怪 ${s.leaked} · 场上 ${alive} · 待出现 ${remain}`;

        // 终局 → 弹结果面板
        if (s.over && !this._resultRoot.active) {
            this._resultRoot.active = true;
            const txt = this._resultRoot.getChildByName('resultText')!.getComponent(Label)!;
            txt.string = s.won
                ? `封印守住了！\n击杀 ${s.killed} 只怪物，无一漏网。\n守门人的谢礼已放进背包。`
                : `守住了封印，但有 ${s.leaked} 只怪物冲进了谷仓…\n击杀 ${s.killed} 只。\n损失些收成，明天继续加油。`;
        }
    }

    /** 结果面板确认：settle（胜利发奖）→ 真正过夜 → 存档 → 关闭 */
    private _onDawn(): void {
        const r = DefenseSystem.inst.settle();
        TimeSystem.inst.endDay();
        GameApp.inst?.persist('defense_settled');
        this.node.active = false;
        this._clearMonsters();
        EventBus.inst.emit('farmChanged', { action: r.won ? 'defense_win' : 'defense_loss', kills: r.killed, leaked: r.leaked });
    }

    private _clearMonsters(): void {
        for (const n of this._nodes.values()) n.destroy();
        this._nodes.clear();
    }

    /** 怪物节点：slime/slime_elite 精灵 + HP 条 + 名字，可点击挥击 */
    private _makeMonsterNode(mo: FieldMonster, layer: number): Node {
        const n = new Node(`mo_${mo.uid}`);
        n.layer = layer;
        const elite = mo.mid.includes('elite');
        const size = elite ? 132 : 96;
        n.addComponent(UITransform).setContentSize(size, size);
        const body = n.addComponent(Graphics)!;
        const col = elite ? new Color(150, 80, 200, 255) : new Color(90, 170, 70, 255);
        body.fillColor = col;
        body.strokeColor = new Color(20, 20, 20, 255);
        body.lineWidth = 3;
        body.circle(0, 0, elite ? 34 : 26);
        body.fill();
        body.stroke();

        // 精灵图（open 时 SpriteLib 必已就绪；赋图成功则盖住 Graphics 圆）
        const frame = SpriteLib.inst.get(monsterSprite(mo.mid));
        if (frame) {
            const sprNode = new Node('bodySpr');
            sprNode.layer = layer;
            sprNode.addComponent(UITransform).setContentSize(size, size);
            const sp = sprNode.addComponent(Sprite)!;
            sp.sizeMode = Sprite.SizeMode.CUSTOM; // 先 CUSTOM 再赋图（坑#21）
            sp.spriteFrame = frame;
            n.addChild(sprNode);
        }

        // HP 条（画在同一 Graphics 上方一点：用子节点）
        const hp = new Node('hp');
        hp.layer = layer;
        hp.addComponent(UITransform).setContentSize(60, 10);
        hp.setPosition(0, elite ? 44 : 36);
        hp.addComponent(Graphics);
        n.addChild(hp);

        const lbl = DefenseOverlay._labelNode(mo.name, 14, 0, -(elite ? 48 : 40), layer);
        n.addChild(lbl);

        n.on(Node.EventType.TOUCH_END, () => {
            DefenseSystem.inst.playerHit(mo.uid);
        });
        return n;
    }

    private _redrawHp(n: Node, mo: FieldMonster): void {
        const hp = n.getChildByName('hp');
        if (!hp) return;
        const g = hp.getComponent(Graphics)!;
        g.clear();
        const ratio = Math.max(0, mo.hp / mo.maxHp);
        g.fillColor = new Color(40, 40, 40, 220);
        g.rect(-30, -5, 60, 10);
        g.fill();
        g.fillColor = ratio > 0.5 ? new Color(110, 220, 90, 255) : new Color(230, 90, 60, 255);
        g.rect(-30, -5, 60 * ratio, 10);
        g.fill();
    }

    // —— UI 小工具（layer 必传：程序化节点不设层 = UI 相机看不见） ——
    private static _labelNode(text: string, fontSize: number, x: number, y: number, layer: number): Node {
        const n = new Node('lbl');
        n.layer = layer;
        n.addComponent(UITransform);
        n.setPosition(x, y);
        const l = n.addComponent(Label)!;
        l.fontSize = fontSize;
        l.lineHeight = fontSize + 6;
        l.string = text;
        return n;
    }

    private static _buttonNode(text: string, x: number, y: number, onTap: () => void, layer: number): Node {
        const n = new Node('btn');
        n.layer = layer;
        n.addComponent(UITransform).setContentSize(180, 60);
        n.setPosition(x, y);
        const g = n.addComponent(Graphics)!;
        g.fillColor = new Color(60, 48, 38, 255);
        g.strokeColor = new Color(255, 255, 255, 90);
        g.lineWidth = 2;
        g.roundRect(-90, -30, 180, 60, 10);
        g.fill();
        g.stroke();
        const lbl = DefenseOverlay._labelNode(text, 24, 0, 0, layer);
        lbl.name = 'label';
        n.addChild(lbl);
        n.on(Node.EventType.TOUCH_END, onTap);
        return n;
    }
}
