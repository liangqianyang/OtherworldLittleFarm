import { _decorator, Component, director, view, ResolutionPolicy, macro } from 'cc';
const { ccclass } = _decorator;

import { EventBus } from '../core/EventBus';
import { TimeSystem } from '../core/TimeSystem';
import { DataManager } from '../core/DataManager';
import { SaveManager, SaveDataV1 } from '../core/SaveManager';
import { IPlatformAdapter } from '../platform/IPlatformAdapter';
import { LocalAdapter } from '../platform/LocalAdapter';
import { DebugPanel } from '../ui/DebugPanel';
import { SfxLib } from '../core/SfxLib';
import { FarmSystem } from '../gameplay/farm/FarmSystem';
import { TerrainData } from '../gameplay/world/TerrainData';

/** 设计分辨率（§17：1280×720 横屏，锁定高度——竖向安全区恒定 ±360） */
const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 720;

/**
 * GameApp —— 服务装配与启动顺序（挂在 launch 场景 GameRoot 上，常驻节点）。
 *
 * 启动序（设计完善建议书 §7 第一周骨架）：
 *   设计分辨率 → 平台适配层 → 数据表 → 读档（含离线结算） → 生命周期挂钩 → DebugPanel → 进 farm 场景
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
        // 运行时强制设计分辨率：settings 文件不热加载（pitfalls #5），代码级设置保证
        // 预览/真机/任何宿主环境下布局一致，不受编辑器进程设置状态影响
        view.setDesignResolutionSize(DESIGN_WIDTH, DESIGN_HEIGHT, ResolutionPolicy.FIXED_HEIGHT);
        // GameRoot 是场景根节点 → 常驻，跨场景存活
        director.addPersistRootNode(this.node);
    }

    async start(): Promise<void> {
        // 保留 CPU 侧图像数据（0.0.3 真机灰块复盘：宏默认 true，GPU 上传后释放 ImageAsset.data，
        // 小游戏端烘焙渲染器 drawImage 拿到 null → 全图降级色块；web 预览因读取时序早于上传而侥幸可用）。
        // 像素包体小，常驻 CPU 拷贝内存代价可忽略。必须在任何贴图加载前设置。
        macro.CLEANUP_IMAGE_CACHE = false;

        this._initPlatform();

        await DataManager.inst.loadAll();

        // 读档（含上一代备份回退与迁移）
        const loaded = this.save!.load();
        this.saveData = loaded ?? this._newGame();
        // 农场切片：旧档补 farm 字段，FarmSystem 接管地块状态（订阅 dayAdvanced）
        if (!this.saveData.farm) this.saveData.farm = { plots: [] };
        FarmSystem.inst.init(this.saveData.farm);
        // 世界切片：v3 起（ClearingSystem 在 world 场景装配时吃这份数据）
        if (!this.saveData.world) this.saveData.world = { clearedIds: [], regrowAt: {} };

        // 旧档补发初始种子（undefined=从未拥有过；显式 0=已种完，不补）
        if (this.saveData.inventory['carrot_seed'] === undefined) {
            this.giveItem('carrot_seed', 5);
            this.persist('grantInitialSeeds');
        }
        TimeSystem.inst.dayIndex = this.saveData.dayIndex;

        // 离线结算（方案 B：冷启动按整天，作物只长不枯，红线：倒流按 0）
        const days = TimeSystem.inst.settleOffline(this.saveData.savedRealTimeMs, this.adapter!.time.nowMs());
        if (days > 0) {
            this.saveData.dayIndex = TimeSystem.inst.dayIndex;
            FarmSystem.inst.growOffline(days); // 作物只长不枯（2026-11-13 拍板）
            console.log(`[Game] 离线结算：推进 ${days} 个游戏日，当前第 ${TimeSystem.inst.dayIndex} 天（离线简报卡在阶段 2 接入 UI）`);
        }

        // 切后台 = 立即存档（红线：挂后台暂停游戏内时间；引擎 rAF 停转即天然暂停）
        this.adapter!.onHide(() => this.persist('onHide'));

        // 合成音效事件挂点（farmChanged/itemGained/itemSpent → SfxLib）
        SfxLib.inst.bindEvents();

        if (this.DEBUG) this.node.addComponent(DebugPanel);

        // 引导流程完成后进入农场（后续在 launch 加主菜单/加载画面）
        if (director.getScene()?.name === 'launch') {
            // M6：启动直进世界大地图（farm.scene 冻结保留为旧农场木牌过渡入口）
            director.loadScene('world');
        }
    }

    /** 写档（DebugPanel / MCP 自动化验证 / 关键节点都可调用） */
    persist(reason: string): void {
        if (!this.saveData) this.saveData = this._newGame();
        this.saveData.dayIndex = TimeSystem.inst.dayIndex;
        // 世界地形捎带落盘（terrain-system §7.2：既有存档点捎带，不打断编辑）
        const td = TerrainData.inst;
        if (td && this.saveData.world) {
            this.saveData.world.terrain = TerrainData.encodeRLE(td);
        }
        this.save!.save(this.saveData, reason);
    }

    /** 最小背包写入（正式背包 UI 在阶段 2） */
    giveItem(itemId: string, count: number): void {
        if (!this.saveData) this.saveData = this._newGame();
        const inv = this.saveData.inventory;
        inv[itemId] = (inv[itemId] ?? 0) + count;
        EventBus.inst.emit('itemGained', { itemId, count });
    }

    /** 只读背包视图（UI/交互层用） */
    get inventory(): Record<string, number> {
        return this.saveData?.inventory ?? {};
    }

    /** 图鉴登记：去重收集（作物收获/钓鱼入包时调用）；已在册返回 false */
    collectCodex(id: string): boolean {
        if (!this.saveData) return false;
        if (!this.saveData.codex) this.saveData.codex = [];
        if (this.saveData.codex.indexOf(id) >= 0) return false;
        this.saveData.codex.push(id);
        return true;
    }

    /** 只读图鉴视图 */
    get codex(): string[] {
        return this.saveData?.codex ?? [];
    }

    /** 场景切换样板：农场 ⇄ 探险（AdventureHUD 出口/放弃、FarmHUD 出发按钮共用） */
    loadFarm(): void {
        director.loadScene('farm');
    }

    loadAdventure(): void {
        director.loadScene('adventure');
    }

    /** 扣减背包（播种等），数量不足返回 false */
    spendItem(itemId: string, count: number): boolean {
        const inv = this.saveData?.inventory;
        if (!inv || (inv[itemId] ?? 0) < count) return false;
        inv[itemId] -= count;
        EventBus.inst.emit('itemSpent', { itemId, count });
        return true;
    }

    private _initPlatform(): void {
        // TODO 阶段 5：按运行时探测切换 TapAdapter（tap 全局对象存在且工程为 Tap 构建时）
        this.adapter = new LocalAdapter();
        this.save = new SaveManager(this.adapter);
    }

    private _newGame(): SaveDataV1 {
        return {
            version: 3,
            dayIndex: 1,
            savedRealTimeMs: this.adapter!.time.nowMs(),
            inventory: { carrot_seed: 5 }, // 切片引导：开局 5 包胡萝卜种子
            farm: { plots: [] },
            codex: [],
            world: { clearedIds: [], regrowAt: {} },
        };
    }
}
