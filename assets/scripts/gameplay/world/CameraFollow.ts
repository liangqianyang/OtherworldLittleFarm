import { _decorator, Component, Node } from 'cc';
import { MAP_W, MAP_H, TILE } from './TerrainData';
const { ccclass } = _decorator;

/**
 * 相机跟随（M1）：阻尼跟随 + 地图边界钳制。
 * 视口 640×360 世界px（ortho 360 × zoom 2），钳制半宽 320 / 半高 180。
 * 世界 y 轴向下为负（tile (tx,ty) → world (tx*32, -ty*32)）。
 */
@ccclass('CameraFollow')
export class CameraFollow extends Component {
    target: Node | null = null;
    k = 8;                                   // 阻尼系数（越大越跟手）

    update(dt: number): void {
        if (!this.target) return;
        const halfW = 320, halfH = 180;
        const px = this.target.position.x, py = this.target.position.y;
        const tx = Math.max(halfW, Math.min(MAP_W * TILE - halfW, px));
        const ty = Math.max(-(MAP_H * TILE - halfH), Math.min(-halfH, py));
        const a = 1 - Math.exp(-this.k * dt);
        const p = this.node.position;
        this.node.setPosition(p.x + (tx - p.x) * a, p.y + (ty - p.y) * a, 0);
    }
}
