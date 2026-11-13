import { _decorator, Component, Node, UITransform } from 'cc';
import { PlotView } from './PlotView';
import { GRID_COLS, GRID_ROWS } from './FarmSystem';

const { ccclass } = _decorator;

const CELL = 150;   // 需与 PlotView.CELL 一致
const GAP = 12;

/**
 * FarmGrid —— 农场切片的 3×3 地块容器（程序化生成，无预制体）。
 * 挂在 farm 场景 Canvas 下的节点上即可。
 */
@ccclass('FarmGrid')
export class FarmGrid extends Component {
    start(): void {
        const total = GRID_COLS * GRID_ROWS;
        const step = CELL + GAP;
        const originX = -((GRID_COLS - 1) * step) / 2;
        const originY = ((GRID_ROWS - 1) * step) / 2;

        for (let i = 0; i < total; i++) {
            const col = i % GRID_COLS;
            const row = Math.floor(i / GRID_COLS);
            const node = new Node(`plot_${i}`);
            node.addComponent(UITransform);
            node.setPosition(originX + col * step, originY - row * step);
            this.node.addChild(node);
            const view = node.addComponent(PlotView)!;
            view.setup(i);
        }
    }
}
