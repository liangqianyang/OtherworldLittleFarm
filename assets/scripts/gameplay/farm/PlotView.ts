import { _decorator, Component, Graphics, Color, Label, UITransform, Node } from 'cc';
import { FarmSystem, PlotSave } from './FarmSystem';
import { EventBus } from '../../core/EventBus';
import { GameApp } from '../../app/GameApp';

const { ccclass } = _decorator;

const CELL = 150;          // 地块边长（设计像素）
const MATURE_COLOR = new Color(230, 168, 50, 255);   // 成熟金黄
const SOIL_COLOR = new Color(74, 58, 42, 255);       // 空地深褐
const GROW_COLOR = new Color(74, 140, 66, 255);      // 生长绿
const SEED_ITEM = 'carrot_seed';                     // 切片阶段固定种胡萝卜

/**
 * PlotView —— 单个地块的视图 + 触屏交互（切片用 Graphics 占位，阶段 2 换像素素材）。
 * 点击语义：空地=播种 / 生长中=浇水 / 成熟=收获。
 */
@ccclass('PlotView')
export class PlotView extends Component {
    index = -1;

    private _g: Graphics = null!;
    private _label: Label = null!;

    setup(index: number): void {
        this.index = index;
        this.node.getComponent(UITransform)!.setContentSize(CELL, CELL);
        this._g = this.addComponent(Graphics)!;
        const labelNode = new Node('plotLabel');
        labelNode.layer = this.node.layer; // 同上：继承 UI_2D 层，否则相机不渲染
        labelNode.addComponent(UITransform);
        this._label = labelNode.addComponent(Label)!;
        this._label.fontSize = 22;
        this._label.lineHeight = 26;
        labelNode.setPosition(0, -CELL / 2 + 26);
        this.node.addChild(labelNode);

        this.node.on(Node.EventType.TOUCH_END, this._onTap, this);
        this.refresh();
    }

    onEnable(): void {
        EventBus.inst.on('farmChanged', this.refresh, this);
        if (this.index >= 0) this.refresh();
    }

    onDestroy(): void {
        EventBus.inst.off('farmChanged', this.refresh, this);
    }

    refresh(): void {
        if (!this._g) return;
        const p = FarmSystem.inst.getPlot(this.index);
        this._g.clear();
        this._g.lineWidth = 3;
        this._g.strokeColor = new Color(30, 24, 18, 255);

        if (!p) {
            // 空地：深褐 + 内框提示可种
            this._g.fillColor = SOIL_COLOR;
            this._g.roundRect(-CELL / 2, -CELL / 2, CELL, CELL, 12);
            this._g.fill();
            this._g.stroke();
            this._g.strokeColor = new Color(255, 255, 255, 60);
            this._g.roundRect(-CELL / 2 + 14, -CELL / 2 + 14, CELL - 28, CELL - 28, 8);
            this._g.stroke();
            this._label.string = '种';
        } else if (FarmSystem.inst.isMature(p)) {
            this._g.fillColor = MATURE_COLOR;
            this._g.roundRect(-CELL / 2, -CELL / 2, CELL, CELL, 12);
            this._g.fill();
            this._g.stroke();
            this._label.string = '收获!';
        } else {
            this._g.fillColor = SOIL_COLOR;
            this._g.roundRect(-CELL / 2, -CELL / 2, CELL, CELL, 12);
            this._g.fill();
            this._g.stroke();
            // 生长块：高度按进度
            const ratio = FarmSystem.inst.progress(p);
            const h = (CELL - 60) * ratio;
            this._g.fillColor = GROW_COLOR;
            this._g.roundRect(-CELL / 2 + 30, -CELL / 2 + 30, CELL - 60, Math.max(h, 8), 6);
            this._g.fill();
            this._label.string = p.wateredOnDay > 0 ? '已浇' : '浇水';
        }
    }

    private _onTap(): void {
        const app = GameApp.inst;
        if (!app) return; // 直开 farm 场景预览时 GameApp 未启动(launch 场景才装配服务)
        const farm = FarmSystem.inst;
        const p = farm.getPlot(this.index);
        if (!p) {
            const inv = app.inventory;
            if ((inv[SEED_ITEM] ?? 0) > 0) {
                if (farm.plant(this.index, SEED_ITEM)) {
                    app.spendItem(SEED_ITEM, 1);
                    app.persist('plant');
                }
            } else {
                this._label.string = '缺种子'; // 立即可见反馈，下次 farmChanged 恢复
            }
        } else if (farm.isMature(p)) {
            if (farm.harvest(this.index, (id, c) => app.giveItem(id, c))) {
                app.persist('harvest');
            }
        } else if (farm.water(this.index)) {
            app.persist('water');
        }
        this.refresh();
    }
}
