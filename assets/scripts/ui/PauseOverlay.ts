import { _decorator, Component, Node, UITransform, Graphics, Label, Color, director } from 'cc';
import { EventBus } from '../core/EventBus';

const { ccclass } = _decorator;

/**
 * PauseOverlay —— 显式暂停遮罩（§17 触屏规范：切后台引擎自动挂起，这里补"玩家主动暂停"）。
 * director.pause() 冻结逻辑帧（update/调度器全停），渲染继续；resume 恢复。
 */
@ccclass('PauseOverlay')
export class PauseOverlay extends Component {
    private static _instance: PauseOverlay | null = null;

    static create(parent: Node, layer: number): PauseOverlay {
        if (PauseOverlay._instance && PauseOverlay._instance.node.isValid) return PauseOverlay._instance;
        const root = new Node('PauseOverlay');
        root.layer = layer;
        root.addComponent(UITransform).setContentSize(1280, 720);
        root.addComponent(Graphics);
        parent.addChild(root);
        const comp = root.addComponent(PauseOverlay);
        PauseOverlay._instance = comp;
        comp._build(layer);
        return comp;
    }

    private _build(layer: number): void {
        const g = this.node.getComponent(Graphics)!;
        g.fillColor = new Color(0, 0, 0, 170);
        g.rect(-640, -360, 1280, 720);
        g.fill();
        // 遮罩吞触摸
        this.node.on(Node.EventType.TOUCH_START, () => { /* swallow */ }, this);
        this.node.on(Node.EventType.TOUCH_END, () => { /* swallow */ }, this);

        // 中央面板
        const panel = new Node('panel');
        panel.layer = layer;
        panel.addComponent(UITransform).setContentSize(420, 260);
        const pg = panel.addComponent(Graphics);
        pg.fillColor = new Color(28, 32, 48, 250);
        pg.roundRect(-210, -130, 420, 260, 14);
        pg.fill();
        pg.strokeColor = new Color(242, 193, 78, 255);
        pg.lineWidth = 3;
        pg.roundRect(-210, -130, 420, 260, 14);
        pg.stroke();
        this.node.addChild(panel);
        panel.setPosition(0, 20);
        panel.active = false;

        // 标题
        const title = new Node('title');
        title.layer = layer;
        title.addComponent(UITransform);
        const tl = title.addComponent(Label);
        tl.string = '⏸ 暂停中';
        tl.fontSize = 40;
        tl.lineHeight = 48;
        tl.color = new Color(242, 230, 200, 255);
        this.node.addChild(title);
        title.setPosition(0, 90);

        // 继续按钮
        const btn = new Node('resumeBtn');
        btn.layer = layer;
        btn.addComponent(UITransform).setContentSize(240, 72);
        const bg = btn.addComponent(Graphics);
        bg.fillColor = new Color(90, 138, 70, 255);
        bg.roundRect(-120, -36, 240, 72, 12);
        bg.fill();
        bg.strokeColor = new Color(240, 240, 220, 255);
        bg.lineWidth = 2;
        bg.roundRect(-120, -36, 240, 72, 12);
        bg.stroke();
        const ln = new Node('lbl');
        ln.layer = layer;
        ln.addComponent(UITransform).setContentSize(240, 72);
        const bl = ln.addComponent(Label);
        bl.string = '继续游戏';
        bl.fontSize = 30;
        bl.lineHeight = 72;
        bl.color = new Color(255, 255, 255, 255);
        btn.addChild(ln);
        this.node.addChild(btn);
        btn.setPosition(0, -20);
        btn.on(Node.EventType.TOUCH_END, this._onResume, this);

        // 存档提示
        const tip = new Node('tip');
        tip.layer = layer;
        tip.addComponent(UITransform);
        const tpl = tip.addComponent(Label);
        tpl.string = '进度已自动保存，可放心休息';
        tpl.fontSize = 20;
        tpl.lineHeight = 26;
        tpl.color = new Color(150, 160, 180, 255);
        this.node.addChild(tip);
        tip.setPosition(0, -100);

        this.node.active = false;
    }

    open(): void {
        if (this.node.active) return;
        this.node.active = true;
        director.pause();
        EventBus.inst.emit('farmChanged', { action: 'pause_on' });
    }

    private _onResume(): void {
        this.node.active = false;
        director.resume();
        EventBus.inst.emit('farmChanged', { action: 'pause_off' });
    }

    protected onDestroy(): void {
        if (director.isPaused()) director.resume();
        if (PauseOverlay._instance === this) PauseOverlay._instance = null;
    }
}
