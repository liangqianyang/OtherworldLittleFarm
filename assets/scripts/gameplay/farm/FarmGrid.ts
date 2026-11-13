import { _decorator, Component, Node, UITransform } from 'cc';
import { PlotView } from './PlotView';
import { GRID_COLS, GRID_ROWS } from './FarmSystem';
import { SpriteLib } from '../../core/SpriteLib';

const { ccclass } = _decorator;

const CELL = 150;   // 需与 PlotView.CELL 一致
const GAP = 12;
/** 网格中心 y：-20 使底部(-257)高于引导横幅顶(-263)，顶部(217)低于天数标签底(~256) */
const GRID_CENTER_Y = -20;

/**
 * FarmGrid —— 农场切片的 3×3 地块容器（程序化生成，无预制体）。
 * 挂在 farm 场景 Canvas 下的节点上即可；位置由此处统一控制（覆盖场景值）。
 */
@ccclass('FarmGrid')
export class FarmGrid extends Component {
    start(): void {
        this.node.setPosition(0, GRID_CENTER_Y);
        const total = GRID_COLS * GRID_ROWS;
        const step = CELL + GAP;
        const originX = -((GRID_COLS - 1) * step) / 2;
        const originY = ((GRID_ROWS - 1) * step) / 2;

        for (let i = 0; i < total; i++) {
            const col = i % GRID_COLS;
            const row = Math.floor(i / GRID_COLS);
            const node = new Node(`plot_${i}`);
            node.layer = this.node.layer; // 程序化节点默认 DEFAULT 层，UI 相机看不见——继承父层(UI_2D)
            node.addComponent(UITransform);
            node.setPosition(originX + col * step, originY - row * step);
            this.node.addChild(node);
            const view = node.addComponent(PlotView)!;
            view.setup(i);
        }

        // 素材异步就绪后统一刷新（就绪前 PlotView 走 Graphics 占位）
        SpriteLib.inst.init().then(() => {
            for (const child of this.node.children) child.getComponent(PlotView)?.refresh();
        });
    }
}
