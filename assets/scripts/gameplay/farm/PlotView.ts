import { _decorator, Component, Graphics, Color, Label, UITransform, Node, Sprite } from 'cc';
import { FarmSystem, PlotSave } from './FarmSystem';
import { EventBus } from '../../core/EventBus';
import { GameApp } from '../../app/GameApp';
import { SpriteLib } from '../../core/SpriteLib';
import { TimeSystem } from '../../core/TimeSystem';

const { ccclass } = _decorator;

const CELL = 150;          // 地块边长（设计像素）
const ART = 128;           // 素材实际显示边长（32px × 4 整数倍缩放，像素不变形）
const MATURE_COLOR = new Color(230, 168, 50, 255);   // 成熟金黄（占位模式用）
const SOIL_COLOR = new Color(74, 58, 42, 255);       // 空地深褐（占位模式用）
const GROW_COLOR = new Color(74, 140, 66, 255);      // 生长绿（占位模式用）
const SEED_ITEM = 'carrot_seed';                     // 切片阶段固定种胡萝卜

/**
 * PlotView —— 单个地块的视图 + 触屏交互。
 * 阶段 2.5：SpriteLib 就绪时用像素素材（湿土/作物三阶段），否则回退 Graphics 占位。
 * 点击语义：空地=播种 / 生长中=浇水 / 成熟=收获。
 */
@ccclass('PlotView')
export class PlotView extends Component {
    index = -1;

    private _g: Graphics = null!;
    private _label: Label = null!;
    private _soil: Sprite = null!;   // 地块底图（干土/湿土）
    private _crop: Sprite = null!;   // 作物精灵（三阶段）

    setup(index: number): void {
        this.index = index;
        this.node.getComponent(UITransform)!.setContentSize(CELL, CELL);
        this._g = this.addComponent(Graphics)!;
        const labelNode = new Node('plotLabel');
        labelNode.layer = this.node.layer; // 继承 UI_2D 层，否则相机不渲染
        labelNode.addComponent(UITransform);
        this._label = labelNode.addComponent(Label)!;
        this._label.fontSize = 22;
        this._label.lineHeight = 26;
        labelNode.setPosition(0, -CELL / 2 + 26);
        this.node.addChild(labelNode);

        // 素材节点（32px × 4 = 128，居中；未就绪时隐藏）
        const soilNode = new Node('soilSpr');
        soilNode.layer = this.node.layer;
        soilNode.addComponent(UITransform).setContentSize(ART, ART);
        this._soil = soilNode.addComponent(Sprite)!;
        // 必须在赋 spriteFrame 之前设 CUSTOM：默认 TRIMMED 模式下赋图会把 UITransform 重置回图片原始 32px
        this._soil.sizeMode = Sprite.SizeMode.CUSTOM;
        soilNode.setPosition(0, 0);
        this.node.addChild(soilNode);

        const cropNode = new Node('cropSpr');
        cropNode.layer = this.node.layer;
        cropNode.addComponent(UITransform).setContentSize(ART, ART);
        this._crop = cropNode.addComponent(Sprite)!;
        this._crop.sizeMode = Sprite.SizeMode.CUSTOM;
        cropNode.setPosition(0, 10); // 作物略上移，露出土里的萝卜
        this.node.addChild(cropNode);

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
        const lib = SpriteLib.inst;
        this._g.clear();

        if (lib.ready) {
            this._drawSprites(p, lib);
        } else {
            this._drawPlaceholder(p);
        }
        this._updateLabel(p);
    }

    /** 像素素材模式：干/湿土底图 + 作物三阶段精灵 + Graphics 只画选中描边 */
    private _drawSprites(p: PlotSave | null, lib: SpriteLib): void {
        const wet = !p || p.wateredOnDay === TimeSystem.inst.dayIndex;
        const soilFrame = lib.get(wet ? 'tiles/plot_soil_wet' : 'tiles/plot_soil');
        if (soilFrame) {
            this._soil.spriteFrame = soilFrame;
            this._soil.node.active = true;
        }

        this._g.lineWidth = 3;
        this._g.strokeColor = new Color(30, 24, 18, 255);
        this._g.roundRect(-CELL / 2, -CELL / 2, CELL, CELL, 12);
        this._g.stroke();

        if (p) {
            const stage = FarmSystem.inst.isMature(p) ? 'crops/carrot_2'
                : p.growth > 0 ? 'crops/carrot_1' : 'crops/carrot_0';
            const cropFrame = lib.get(stage);
            if (cropFrame) {
                this._crop.spriteFrame = cropFrame;
                this._crop.node.active = true;
            }
        } else {
            this._crop.node.active = false;
        }
    }

    /** 占位模式（素材未就绪时的 Graphics 渲染，阶段1视觉） */
    private _drawPlaceholder(p: PlotSave | null): void {
        this._soil.node.active = false;
        this._crop.node.active = false;
        this._g.lineWidth = 3;
        this._g.strokeColor = new Color(30, 24, 18, 255);

        if (!p || !FarmSystem.inst.isMature(p)) {
            this._g.fillColor = SOIL_COLOR;
            this._g.roundRect(-CELL / 2, -CELL / 2, CELL, CELL, 12);
            this._g.fill();
            this._g.stroke();
        }
        if (p && FarmSystem.inst.isMature(p)) {
            this._g.fillColor = MATURE_COLOR;
            this._g.roundRect(-CELL / 2, -CELL / 2, CELL, CELL, 12);
            this._g.fill();
            this._g.stroke();
        }
        if (p && !FarmSystem.inst.isMature(p)) {
            const ratio = FarmSystem.inst.progress(p);
            const h = (CELL - 60) * ratio;
            this._g.fillColor = GROW_COLOR;
            this._g.roundRect(-CELL / 2 + 30, -CELL / 2 + 30, CELL - 60, Math.max(h, 8), 6);
            this._g.fill();
        }
        if (!p) {
            this._g.strokeColor = new Color(255, 255, 255, 60);
            this._g.roundRect(-CELL / 2 + 14, -CELL / 2 + 14, CELL - 28, CELL - 28, 8);
            this._g.stroke();
        }
    }

    private _updateLabel(p: PlotSave | null): void {
        if (!p) this._label.string = '种';
        else if (FarmSystem.inst.isMature(p)) this._label.string = '收获!';
        else this._label.string = p.wateredOnDay === TimeSystem.inst.dayIndex ? '已浇' : '浇水';
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
