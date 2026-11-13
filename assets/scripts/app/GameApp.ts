import { _decorator, Component, director } from 'cc';
const { ccclass } = _decorator;

import { EventBus } from '../core/EventBus';
import { TimeSystem } from '../core/TimeSystem';
import { DataManager } from '../core/DataManager';
import { SaveManager, SaveDataV1 } from '../core/SaveManager';
import { IPlatformAdapter } from '../platform/IPlatformAdapter';
import { LocalAdapter } from '../platform/LocalAdapter';
import { DebugPanel } from '../ui/DebugPanel';

/**
 * GameApp —— 服务装配与启动顺序（挂在 launch 场景 GameRoot 上，常驻节点）。
 *
 * 启动序（设计完善建议书 §7 第一周骨架）：
 *   平台适配层 → 数据表 → 读档（含离线结算） → 生命周期挂钩 → DebugPanel → 进 farm 场景
 *
 * 周验收链路：种→浇→连跳数天→收→杀进程重进，存档完整还原（当前已具备：dayIndex + 背包 + 离线结算）。
 */
@ccclass('GameApp')
export class GameApp extends Component {
    /** 供 DebugPanel 等取用（单例常驻） */
    static inst: GameApp | null = null;

    /** 发布前置 false */
    readonly DEBUG = true;

    adapter: IPlatformAdapter | null = null;
    save: SaveManager | null = null;
    saveData: SaveDataV1 | null = null;

    onLoad(): void {
        GameApp.inst = this;
        // GameRoot 是场景根节点 → 常驻，跨场景存活
        director.addPersistRootNode(this.node);
    }

    async start(): Promise<void> {
        this._initPlatform();

        await DataManager.inst.loadAll();

        // 读档（含上一代备份回退与迁移）
        const loaded = this.save!.load();
        this.saveData = loaded ?? this._newGame();
        TimeSystem.inst.dayIndex = this.saveData.dayIndex;

        // 离线结算（方案 B：冷启动按整天，作物只长不枯，红线：倒流按 0）
        const days = TimeSystem.inst.settleOffline(this.saveData.savedRealTimeMs, this.adapter!.time.nowMs());
        if (days > 0) {
            this.saveData.dayIndex = TimeSystem.inst.dayIndex;
            console.log(`[Game] 离线结算：推进 ${days} 个游戏日，当前第 ${TimeSystem.inst.dayIndex} 天（离线简报卡在阶段 2 接入 UI）`);
        }

        // 切后台 = 立即存档（红线：挂后台暂停游戏内时间；引擎 rAF 停转即天然暂停）
        this.adapter!.onHide(() => this.persist('onHide'));

        if (this.DEBUG) this.node.addComponent(DebugPanel);

        // 引导流程完成后进入农场（后续在 launch 加主菜单/加载画面）
        if (director.getScene()?.name === 'launch') {
            director.loadScene('farm');
        }
    }

    /** 写档（DebugPanel / MCP 自动化验证 / 关键节点都可调用） */
    persist(reason: string): void {
        if (!this.saveData) this.saveData = this._newGame();
        this.saveData.dayIndex = TimeSystem.inst.dayIndex;
        this.save!.save(this.saveData, reason);
    }

    /** 最小背包写入（正式背包 UI 在阶段 2） */
    giveItem(itemId: string, count: number): void {
        if (!this.saveData) this.saveData = this._newGame();
        const inv = this.saveData.inventory;
        inv[itemId] = (inv[itemId] ?? 0) + count;
        EventBus.inst.emit('itemGained', { itemId, count });
    }

    private _initPlatform(): void {
        // TODO 阶段 5：按运行时探测切换 TapAdapter（tap 全局对象存在且工程为 Tap 构建时）
        this.adapter = new LocalAdapter();
        this.save = new SaveManager(this.adapter);
    }

    private _newGame(): SaveDataV1 {
        return {
            version: 1,
            dayIndex: 1,
            savedRealTimeMs: this.adapter!.time.nowMs(),
            inventory: {},
        };
    }
}
