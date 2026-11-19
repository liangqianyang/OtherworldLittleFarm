import { _decorator, Component, Node, Graphics, Color, UITransform, EventTouch } from 'cc';
import { TILE, TerrainData } from './TerrainData';
import { TerrainEdit } from './terrain/TerrainEdit';
import { GameApp } from '../../app/GameApp';
const { ccclass } = _decorator;

/**
 * M3 编辑输入（terrain-system §6.3 拖刷，触屏适配）：
 * - 右半屏 SCREEN_UI 捕获层（左半屏留给摇杆；工具未选时层不拦截任何事件）。
 * - 点按=单格编辑；按住移动>24px 进入拖刷（逐格 applyAt，材料不足即停）。
 * - ghost 预览：世界容器内的绿/红框，跟随按点。
 */
const DRAG_TH = 24;

@ccclass('TerrainEditInput')
export class TerrainEditInput extends Component {
    private _edit: TerrainEdit | null = null;
    private _inv: Record<string, number> | null = null;
    private _worldRoot: Node | null = null;       // 世界坐标容器（ghost 挂这）
    private _cam: Node | null = null;             // 主相机节点（world=cam+ui/2）
    private _ghost: Node | null = null;
    private _gg: Graphics | null = null;
    private _pressing = false;
    private _startUI = { x: 0, y: 0 };
    private _lastCell = { x: -9999, y: -9999 };
    private _ghostCell = { x: -9999, y: -9999 };

    static create(parent: Node, edit: TerrainEdit, inv: Record<string, number>, worldRoot: Node, cam: Node): TerrainEditInput {
        const root = new Node('EditInput');
        root.layer = 1 << 24;
        const ut = root.addComponent(UITransform);
        ut.setContentSize(640, 720);
        root.setPosition(320, 0, 0);   // 右半屏
        parent.addChild(root);
        const c = root.addComponent(TerrainEditInput);
        c._edit = edit; c._inv = inv; c._worldRoot = worldRoot; c._cam = cam;
        // ghost 世界坐标节点
        const gh = new Node('editGhost');
        gh.layer = worldRoot.layer;
        gh.addComponent(UITransform).setContentSize(TILE, TILE);
        worldRoot.addChild(gh);
        c._ghost = gh;
        c._gg = gh.addComponent(Graphics);
        gh.setPosition(0, -99999, 0);
        root.on(Node.EventType.TOUCH_START, c._onStart, c);
        root.on(Node.EventType.TOUCH_MOVE, c._onMove, c);
        root.on(Node.EventType.TOUCH_END, c._onEnd, c);
        root.on(Node.EventType.TOUCH_CANCEL, c._onEnd, c);
        return c;
    }

    protected onDestroy(): void {
        this.node.off(Node.EventType.TOUCH_START, this._onStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this._onMove, this);
        this.node.off(Node.EventType.TOUCH_END, this._onEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this._onEnd, this);
    }

    /** 工具未选时不拦截：本组件 active=false（WorldSpike 按工具态驱动）。 */
    private _onStart(e: EventTouch): void {
        if (!this._edit || !this._edit.tool) return;
        this._pressing = true;
        const ui = e.getUILocation();
        this._startUI = { x: ui.x, y: ui.y };
        this.beginStrokeAt(ui.x, ui.y);
    }

    private _onMove(e: EventTouch): void {
        if (!this._pressing) return;
        const ui = e.getUILocation();
        if (Math.hypot(ui.x - this._startUI.x, ui.y - this._startUI.y) < DRAG_TH) return;
        this._applyUI(ui.x, ui.y);
    }

    private _onEnd(_e: EventTouch): void {
        if (!this._pressing) return;
        this._pressing = false;
        this._edit?.endStroke();
        this._hideGhost();
        GameApp.inst?.persist('terrain_edit');
    }

    /** UI 坐标 → 世界 tile（zoom=2：world = cam + (ui-屏幕中心)/2；getUILocation 原点=屏幕左下）。 */
    private _cellAtUI(ux: number, uy: number): { x: number; y: number } {
        const cam = this._cam!.position;
        const wx = cam.x + (ux - 640) / 2;
        const wy = cam.y + (uy - 360) / 2;
        return { x: Math.floor(wx / TILE), y: Math.floor(-wy / TILE) };
    }

    private beginStrokeAt(ux: number, uy: number): void {
        const cell = this._cellAtUI(ux, uy);
        this._edit!.beginStroke();
        this._applyCell(cell.x, cell.y);
    }

    private _applyUI(ux: number, uy: number): void {
        const cell = this._cellAtUI(ux, uy);
        if (cell.x === this._lastCell.x && cell.y === this._lastCell.y) return;
        this._applyCell(cell.x, cell.y);
    }

    private _applyCell(tx: number, ty: number): void {
        if (!this._edit || !this._inv) return;
        this._lastCell = { x: tx, y: ty };
        this._edit.applyAt(tx, ty, this._inv);
        this._showGhost(tx, ty);
    }

    /** ghost：绿=合法红=非法（世界坐标）。 */
    showGhostAt(tx: number, ty: number): void {
        this._showGhost(tx, ty);
    }

    private _showGhost(tx: number, ty: number): void {
        if (!this._ghost || !this._gg || !this._edit) return;
        this._ghostCell = { x: tx, y: ty };
        const why = this._edit.validate(tx, ty);
        this._ghost.setPosition(tx * TILE + TILE / 2, -ty * TILE - TILE / 2, 0);
        this._gg.clear();
        this._gg.rect(-TILE / 2 + 2, -TILE / 2 + 2, TILE - 4, TILE - 4);
        this._gg.lineWidth = 3;
        this._gg.strokeColor = why ? new Color(224, 82, 82, 230) : new Color(126, 217, 87, 230);
        this._gg.fillColor = why ? new Color(224, 82, 82, 60) : new Color(126, 217, 87, 60);
        this._gg.fill();
        this._gg.stroke();
    }

    private _ghostType(tx: number, ty: number): number {
        return TerrainData.inst ? TerrainData.inst.get(tx, ty) : 0;
    }

    private _hideGhost(): void {
        this._lastCell = { x: -9999, y: -9999 };
        if (this._ghost) this._ghost.setPosition(0, -99999, 0);
    }
}
