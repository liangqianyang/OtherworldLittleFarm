import { _decorator, Component, Node, Label, Graphics, Color, UITransform, EventTouch, UIOpacity } from 'cc';
import { FishingSystem } from '../gameplay/fishing/FishingSystem';
import { DataManager } from '../core/DataManager';
import { SpriteLib } from '../core/SpriteLib';
import { SfxLib } from '../core/SfxLib';
import { Sprite } from 'cc';

const { ccclass } = _decorator;

/**
 * FishingPanel —— 钓鱼小面板（阶段 5）。
 * 水塘椭圆 + 浮标；等待期浮标浮动、咬钩期下沉+红色感叹号；点击面板任意处=提竿。
 * 失败无惩罚；「收杆」直接关闭。
 */
@ccclass('FishingPanel')
export class FishingPanel extends Component {
    private _state: Label = null!;
    private _float: Node = null!;
    private _mark: Label = null!;
    private _elapsed = 0;
    private _wasBiting = false;
    private _resultPlayed = false;

    static readonly LAYER = 33554432;

    static create(parent: Node, layer: number): FishingPanel {
        const root = new Node('FishingPanel');
        root.layer = layer;
        root.addComponent(UITransform).setContentSize(520, 380);
        parent.addChild(root);

        // 半透明底（吞点击：面板区域任意点击=提竿）
        const g = root.addComponent(Graphics)!;
        g.fillColor = new Color(16, 30, 44, 235);
        g.roundRect(-260, -190, 520, 380, 16);
        g.fill();
        g.strokeColor = new Color(120, 170, 210, 200);
        g.lineWidth = 3;
        g.stroke();

        // 水塘
        const pond = new Node('pond');
        pond.layer = layer;
        pond.addComponent(UITransform).setContentSize(360, 170);
        const pg = pond.addComponent(Graphics)!;
        pg.fillColor = new Color(38, 84, 120, 255);
        pg.ellipse(0, 0, 180, 85);
        pg.fill();
        pg.strokeColor = new Color(90, 150, 190, 160);
        pg.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            pg.ellipse(0, -40 + i * 40, 150 - i * 20, 40 - i * 8);
            pg.stroke();
        }
        pond.setPosition(0, 10);
        root.addChild(pond);

        // 浮标（白色小圆 + 咬钩感叹号）
        const float = new Node('float');
        float.layer = layer;
        float.addComponent(UITransform).setContentSize(24, 24);
        const fg = float.addComponent(Graphics)!;
        fg.fillColor = new Color(245, 245, 245, 255);
        fg.circle(0, 0, 9);
        fg.fill();
        fg.strokeColor = new Color(200, 60, 50, 255);
        fg.lineWidth = 2;
        fg.stroke();
        float.setPosition(0, 10);
        pond.addChild(float);
        const mark = FishingPanel._labelNode('', 30, new Color(255, 90, 70), 0, 34, layer);
        mark.name = 'mark';
        float.addChild(mark);

        // 咬钩提示贴图（AI 素材 fish_bite；咬钩时显示在浮标上方）
        const biteArt = new Node('biteArt');
        biteArt.layer = layer;
        biteArt.addComponent(UITransform).setContentSize(48, 48);
        biteArt.setPosition(0, 40);
        biteArt.active = false;
        float.addChild(biteArt);
        const bsp = biteArt.addComponent(Sprite)!;
        bsp.sizeMode = Sprite.SizeMode.CUSTOM;

        // 状态行
        const state = FishingPanel._labelNode('点击水塘开始钓鱼', 24, new Color(240, 235, 220), 0, 140, layer);
        state.name = 'state';
        root.addChild(state);

        // 收杆按钮
        const btn = new Node('btn_close');
        btn.layer = layer;
        btn.addComponent(UITransform).setContentSize(140, 56);
        const bg = btn.addComponent(Graphics)!;
        bg.roundRect(-70, -28, 140, 56, 10);
        bg.fillColor = new Color(70, 70, 80, 255);
        bg.fill();
        bg.strokeColor = Color.WHITE;
        bg.lineWidth = 2;
        bg.stroke();
        const bl = FishingPanel._labelNode('收 杆', 24, Color.WHITE, 0, -2, layer);
        btn.addChild(bl);
        btn.setPosition(0, -150);
        btn.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
            e.propagationStopped = true;
            FishingSystem.inst.reset();
            root.active = false;
        });
        root.addChild(btn);

        // 面板点击=提竿（收杆按钮自身吞掉）
        root.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
            e.propagationStopped = true;
            const sys = FishingSystem.inst;
            if (!sys.cast) {
                // 未抛竿 → 本次点击即抛竿
                sys.castRod();
            } else {
                sys.hook();
            }
        });
        root.active = false;

        const comp = root.addComponent(FishingPanel);
        comp._state = state.getComponent(Label)!;
        comp._float = float;
        comp._mark = mark.getComponent(Label)!;
        // AI 素材异步补挂（SpriteLib 就绪后 biteArt 贴图）
        const tryBiteArt = (tries = 0): void => {
            const sf = SpriteLib.inst.get('adventure/fish_bite');
            if (!sf) { if (tries < 40) comp.scheduleOnce(() => tryBiteArt(tries + 1), 1.5); return; }
            bsp.spriteFrame = sf;
        };
        comp.scheduleOnce(() => tryBiteArt(), 1.0);
        return comp;
    }

    update(dt: number): void {
        if (!this.node.active) return;
        FishingSystem.inst.tick(dt);
        this._elapsed += dt;
        const sys = FishingSystem.inst;
        const s = sys.cast;
        if (!s) {
            // 空闲：显示最近一次结果
            if (sys.lastResult === 'caught') {
                const def = DataManager.inst.getRow('catalogs/fish', sys.lastFishId);
                this._state.string = `钓到了！${def?.['name'] ?? '鱼'} 入包`;
                if (!this._resultPlayed) { SfxLib.inst.play('harvest'); this._resultPlayed = true; }
            } else if (sys.lastResult === 'early') {
                this._state.string = '太急了，鱼被吓跑…（点击再抛竿）';
                if (!this._resultPlayed) { SfxLib.inst.play('deny'); this._resultPlayed = true; }
            } else if (sys.lastResult === 'miss') {
                this._state.string = '鱼溜走了…（点击再抛竿）';
                if (!this._resultPlayed) { SfxLib.inst.play('deny'); this._resultPlayed = true; }
            } else {
                this._state.string = '点击水塘开始钓鱼';
                this._resultPlayed = false;
            }
            this._float.setPosition(0, 10);
            this._mark.string = '';
            return;
        }
        if (sys.biting) {
            if (!this._wasBiting) { SfxLib.inst.play('bite'); }
            this._wasBiting = true;
            this._state.string = '咬钩了！！点击提竿！';
            this._float.setPosition(0, 2); // 下沉
            this._float.getChildByName('biteArt')!.active = true;
            this._mark.string = '!';
        } else {
            this._wasBiting = false;
            this._state.string = '等待咬钩…';
            this._float.setPosition(0, 10 + Math.sin(this._elapsed * 3) * 4); // 浮动
            const art = this._float.getChildByName('biteArt');
            if (art && art.active) art.active = false;
            this._mark.string = '';
        }
    }

    private static _labelNode(text: string, size: number, color: Color, x: number, y: number, layer: number): Node {
        const n = new Node(`lbl${x}_${y}`);
        n.layer = layer;
        n.addComponent(UITransform);
        n.setPosition(x, y);
        const l = n.addComponent(Label)!;
        l.string = text;
        l.fontSize = size;
        l.lineHeight = size + 6;
        l.color = color;
        return n;
    }
}
