import { Node } from 'cc';
import { GRID_COLS, GRID_ROWS } from '../../farm/FarmSystem';
import { PlotWorldView } from './PlotWorldView';

/** 农场区地块装配基点（tile）：区 (40,42)-(87,73) 内，避开 河 x62-66@y35-50 / 西门路 y55 / 纵路 x78 */
export const FARM_PLOT_ORIGIN = { tx: 67, ty: 58, pitch: 4 };

/**
 * FarmWorldBinder —— FarmSystem.plots index → 农场区 tile 坐标确定性映射（M6，migration-plan §3.x）。
 * index = row*3+col：origin=(tx+col*pitch, ty+row*pitch)；旧档 plots 数组顺序不变=搬迁零数据损失。
 */
export class FarmWorldBinder {
    /** 世界坐标 → 地块 index（情境按钮/调试用）；不在任何地块内返回 -1 */
    static plotIndexAt(tx: number, ty: number): number {
        const rel = (v: number, o: number) => v - o;
        for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
            const col = i % GRID_COLS, row = Math.floor(i / GRID_COLS);
            const ox = FARM_PLOT_ORIGIN.tx + col * FARM_PLOT_ORIGIN.pitch;
            const oy = FARM_PLOT_ORIGIN.ty + row * FARM_PLOT_ORIGIN.pitch;
            if (rel(tx, ox) >= 0 && rel(tx, ox) < 3 && rel(ty, oy) >= 0 && rel(ty, oy) < 3) return i;
        }
        return -1;
    }

    /** 在世界场景装配全部地块视图 */
    static bind(parent: Node, layer: number): PlotWorldView[] {
        const out: PlotWorldView[] = [];
        for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
            const col = i % GRID_COLS, row = Math.floor(i / GRID_COLS);
            const node = new Node(`farm_plot_${i}`);
            node.layer = layer;
            parent.addChild(node);
            const v = node.addComponent(PlotWorldView);
            v.setup(parent, layer, i, FARM_PLOT_ORIGIN.tx + col * FARM_PLOT_ORIGIN.pitch, FARM_PLOT_ORIGIN.ty + row * FARM_PLOT_ORIGIN.pitch);
            out.push(v);
        }
        return out;
    }
}
