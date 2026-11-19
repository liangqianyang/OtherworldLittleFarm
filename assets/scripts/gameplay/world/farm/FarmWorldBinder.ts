import { Node } from 'cc';
import { GRID_COLS, GRID_ROWS, GRID_SIZE, HOME_PLOT_INDEX } from '../../farm/FarmSystem';
import { FARM_ORIGIN, FARM_HOME_PLOT } from '../TerrainData';
import { PlotWorldView } from './PlotWorldView';

/**
 * FarmWorldBinder —— FarmSystem.plots index → 农场区 tile 坐标确定性映射（M6；V3 几何单源 TerrainData）。
 * index 0-8 = 主阵 3×3（FARM_ORIGIN (62,42) pitch4）；index 9 = 宅旁块（FARM_HOME_PLOT (44,46)-(46,48)）。
 * 旧档 plots 数组顺序不变（init 自动在尾部补 index 9 的空位）= 搬迁零数据损失。
 */
export class FarmWorldBinder {
    /** 地块 index → tile 左上角坐标 */
    static plotOrigin(index: number): { tx: number; ty: number } {
        if (index === HOME_PLOT_INDEX) return { tx: FARM_HOME_PLOT.x0, ty: FARM_HOME_PLOT.y0 };
        const col = index % GRID_COLS, row = Math.floor(index / GRID_COLS);
        return { tx: FARM_ORIGIN.x + col * FARM_ORIGIN.pitch, ty: FARM_ORIGIN.y + row * FARM_ORIGIN.pitch };
    }

    /** 世界坐标 → 地块 index（情境按钮/调试用）；不在任何地块内返回 -1 */
    static plotIndexAt(tx: number, ty: number): number {
        const rel = (v: number, o: number) => v - o;
        for (let i = 0; i < GRID_SIZE; i++) {
            const o = FarmWorldBinder.plotOrigin(i);
            if (rel(tx, o.tx) >= 0 && rel(tx, o.tx) < 3 && rel(ty, o.ty) >= 0 && rel(ty, o.ty) < 3) return i;
        }
        return -1;
    }

    /** 在世界场景装配全部地块视图（V3：主阵 3×3 + 宅旁第10块） */
    static bind(parent: Node, layer: number): PlotWorldView[] {
        const out: PlotWorldView[] = [];
        for (let i = 0; i < GRID_SIZE; i++) {
            const o = FarmWorldBinder.plotOrigin(i);
            const node = new Node(`farm_plot_${i}`);
            node.layer = layer;
            parent.addChild(node);
            const v = node.addComponent(PlotWorldView);
            v.setup(parent, layer, i, o.tx, o.ty);
            out.push(v);
        }
        return out;
    }
}
