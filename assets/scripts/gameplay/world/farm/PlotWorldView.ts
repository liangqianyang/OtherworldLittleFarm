import { _decorator, Component, Graphics, Color, Label, Node, UITransform, Layers } from 'cc';
import { FarmSystem, GRID_COLS, GRID_ROWS, PlotSave } from '../../farm/FarmSystem';
import { TimeSystem } from '../../../core/TimeSystem';
import { DataManager } from '../../../core/DataManager';
import { EventBus } from '../../../core/EventBus';
import { GameApp } from '../../../app/GameApp';
import { Interactable } from '../interact/Interactable';

const { ccclass } = _decorator;

/** 地块世界尺寸：3×3 tile = 96px（FarmWorldBinder pitch=4 保证 1 tile 间隙） */
export const PLOT_TILES = 3;
export const PLOT_PX = PLOT_TILES * 32;

const DRY = new Color(107, 74, 46, 255);
const WET = new Color(74, 48, 32, 255);
const OUTLINE = new Color(42, 31, 22, 255);
const GROW = new Color(94, 168, 74, 255);
const RIPE = new Color(242, 193, 78, 255);

/**
 * PlotWorldView —— 旧农场地块的世界化视图（M6，migration-plan FarmWorldBinder/PlotWorldView）。
 *
 * 走近地块 → 情境按钮（种植/浇水/收获按状态动态文案）；与 farm.scene 的 PlotView
 * 共享同一份 FarmSystem.plots 数据（同档两地入口，冻结期双入口过渡）。
 * 视觉：土块（浇过变深）+ 生长进度块 + 成熟金块 + 状态字；事件驱动重绘（farmChanged）。
 */
@ccclass('PlotWorldView')
export class PlotWorldView extends Component {
    index = -1;
    private _it: Interactable | null = null;
    private _label: Label | null = null;
    private _g: Graphics | null = null;
    private _hint = ''; // 缺种子/非当季等瞬时反馈，下次 refresh 清空

    setup(parent: Node, layer: number, index: number, ox: number, oy: number): void {
        this.index = index;
        this.node.layer = layer || Layers.Enum.UI_2D;
        this.node.addComponent(UITransform).setContentSize(PLOT_PX, PLOT_PX);
        this.node.setPosition(ox * 32 + (PLOT_TILES * 16), -(oy * 32 + (PLOT_TILES * 16)));
        this._g = this.node.addComponent(Graphics);

        const tag = new Node('tag');
        tag.layer = this.node.layer;
        tag.addComponent(UITransform);
        this._label = tag.addComponent(Label);
        this._label.fontSize = 20;
        tag.setPosition(0, -66);
        this.node.addChild(tag);

        this._it = this.node.addComponent(Interactable);
        this._it.setupSimple(`farm_plot_${index}`, '种植', 110, () => this.onUse());

        EventBus.inst.on('farmChanged', this.refresh, this);
        this.refresh();
    }

    protected onDestroy(): void {
        EventBus.inst.off('farmChanged', this.refresh, this);
    }

    /** 情境操作：空地种植 → 未熟浇水 → 成熟收获（与 PlotView._onTap 同规则） */
    onUse(): void {
        const app = GameApp.inst;
        if (!app || this.index < 0) return;
        const farm = FarmSystem.inst;
        const p = farm.getPlot(this.index);
        this._hint = '';
        if (!p) {
            const pick = this._pickSeed(app.inventory);
            if (pick.seed && farm.plant(this.index, pick.seed)) {
                app.spendItem(pick.seed, 1);
                app.persist('plant');
            } else {
                this._hint = pick.offseason ? '非当季' : '缺种子';
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

    refresh(): void {
        if (!this._g || this.index < 0) return;
        const farm = FarmSystem.inst;
        const p = farm.getPlot(this.index);
        const wet = !!p && p.wateredOnDay === TimeSystem.inst.dayIndex;
        const g = this._g;
        g.clear();
        g.fillColor = wet ? WET : DRY;
        g.roundRect(-PLOT_PX / 2, -PLOT_PX / 2, PLOT_PX, PLOT_PX, 10);
        g.fill();
        g.strokeColor = OUTLINE;
        g.lineWidth = 3;
        g.roundRect(-PLOT_PX / 2, -PLOT_PX / 2, PLOT_PX, PLOT_PX, 10);
        g.stroke();
        if (p) {
            const mature = farm.isMature(p);
            const h = 12 + farm.progress(p) * 56;
            g.fillColor = mature ? RIPE : GROW;
            g.roundRect(-16, -44, 32, h, 6);
            g.fill();
            g.strokeColor = OUTLINE;
            g.lineWidth = 2;
            g.roundRect(-16, -44, 32, h, 6);
            g.stroke();
        }
        let text = '种植';
        if (p) {
            if (farm.isMature(p)) text = '收获！';
            else text = this._hint || (wet ? `生长中` : '浇水');
        } else if (this._hint) {
            text = this._hint;
        }
        if (this._label && this._label.isValid) this._label.string = text;
        if (this._it) this._it.label = text;
    }

    /** 从背包挑一颗可种且当季的种子（同 PlotView._pickSeed） */
    private _pickSeed(inv: Record<string, number>): { seed: string | null; offseason: boolean } {
        const rows = DataManager.inst.getRows('catalogs/items');
        let offseason = false;
        for (const r of rows) {
            const id = String(r['id']);
            if (r['category'] !== 'seed' || (inv[id] ?? 0) <= 0) continue;
            const crop = DataManager.inst.getRow('catalogs/crops', id.replace(/_seed$/, ''));
            if (TimeSystem.cropInSeason(crop ? crop.seasons : null)) return { seed: id, offseason: false };
            offseason = true;
        }
        return { seed: null, offseason };
    }
}

export interface PlotRef { view: PlotWorldView; index: number }
export type { PlotSave };
