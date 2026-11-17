import { _decorator, Component, Node, Camera, view, ResolutionPolicy, SpriteFrame, Layers, assetManager, ImageAsset, UITransform, Graphics, Color, Sprite, Label } from 'cc';
import { MAP_W, MAP_H, TILE, SPAWN, TerrainData } from './TerrainData';
import { TerrainBakeRenderer } from './TerrainBakeRenderer';
import { TerrainPoolRenderer } from './TerrainPoolRenderer';
import { PlayerCharacter } from './PlayerCharacter';
import { JoystickController, SCREEN_UI_LAYER } from './JoystickController';
import { CompassHUD } from './CompassHUD';
import { SettingsPanel } from './SettingsPanel';
import { CameraFollow } from './CameraFollow';
import { SpriteLib } from '../../core/SpriteLib';
import { ClearingSystem } from './clearing/ClearingSystem';
import { InteractionManager } from './interact/InteractionManager';
import { ContextButtonUI } from './interact/ContextButtonUI';
import { TerrainEdit, ToolId } from './terrain/TerrainEdit';
import { ToolDockUI } from './terrain/ToolDockUI';
import { TerrainEditInput } from './TerrainEditInput';
import { WorldLiving } from './living/WorldLiving';
import { AdventureSystem } from '../adventure/AdventureSystem';
import { DefenseSystem } from '../defense/DefenseSystem';
import { Interactable } from './interact/Interactable';
import { DungeonOverlay } from '../../ui/DungeonOverlay';
import { TimeSystem } from '../../core/TimeSystem';
import { EventBus } from '../../core/EventBus';
import { GameApp } from '../../app/GameApp';
const { ccclass } = _decorator;

/**
 * 世界主控（T0 spike 起家，M1 加入角色/摇杆/相机跟随）：
 * 地形数据 + 双渲染路线 A/B + 烘焙计时断言 + 玩家驱动分块加载。
 * DEBUG 驱动（window.__spike）：
 *   spikeInfo()  —— 当前路线/块数/节点数/脏格/最近耗时/玩家 tile
 *   spikeBench(n) —— 编辑 n 格重烘（bake）/重排（pool）耗时 ms
 *   spikeSwitch() —— bake ↔ pool 切换
 *   spikePan(dx,dy) —— 相机平移（tile 数），验证分块动态加载/释放
 *   playerPos()   —— 玩家世界px/tile 坐标
 *   debugSetInput(x,y) —— 摇杆注入（自动化测试）
 */
@ccclass('WorldSpike')
export class WorldSpike extends Component {
    private _data: TerrainData | null = null;
    private _bake: TerrainBakeRenderer | null = null;
    private _pool: TerrainPoolRenderer | null = null;
    private _route: 'bake' | 'pool' = 'bake';
    private _camX = SPAWN.x;
    private _camY = SPAWN.y;
    private _cam: Camera | null = null;
    private _camNode: Node | null = null;
    private _player: PlayerCharacter | null = null;
    private _info: string = '';
    private _edit: TerrainEdit | null = null;
    private _dock: ToolDockUI | null = null;
    private _editInput: TerrainEditInput | null = null;
    private _statusTimer = 0;
    private _intelLabel: Label | null = null;   // B12 情报行：守门人夜袭预告
    private _dungeon: Node | null = null;

    start(): void {
        (window as unknown as Record<string, unknown>).__spike = this;
        view.setDesignResolutionSize(1280, 720, ResolutionPolicy.FIXED_HEIGHT);

        const dataNode = new Node('__terrainData');
        this.node.addChild(dataNode);
        this._data = dataNode.addComponent(TerrainData);
        this._data.generateBaseline();
        // M3：存档地形还原（老档/新档缺 terrain → 保持基线）
        const worldSave = GameApp.inst?.saveData?.world;
        if (worldSave?.terrain) {
            if (TerrainData.decodeRLE(this._data, worldSave.terrain)) {
                console.log('[M3] terrain restored from save');
            } else {
                this._data.generateBaseline();   // 解码失败回基线，防坏档卡死
            }
        }

        // 相机 2×（orthoHeight 360 → 视口世界 640×360，屏上 64px/tile）
        this._camNode = this.node.getChildByName('Camera');
        this._cam = this._camNode?.getComponent(Camera) || this.getComponent(Camera) || null;
        if (this._cam) { this._cam.zoomFactor = 2; }

        // 渲染容器（先建，保证后建的角色渲染在其上）
        const ground = new Node('GroundBake');
        ground.layer = Layers.Enum.UI_2D;
        this.node.addChild(ground);
        const poolRoot = new Node('GroundPool');
        poolRoot.layer = Layers.Enum.UI_2D;
        poolRoot.active = false;
        this.node.addChild(poolRoot);

        this._bake = ground.addComponent(TerrainBakeRenderer);
        this._bake.init(this._data, ground);
        this._pool = poolRoot.addComponent(TerrainPoolRenderer);

        // M2：世界物件（开荒树/石/丛）——在地面容器之后、玩家之前装配（玩家渲染压顶）
        const objRoot = new Node('WorldObjects');
        objRoot.layer = Layers.Enum.UI_2D;
        this.node.addChild(objRoot);
        ClearingSystem.inst.init(objRoot);

        // M1：玩家（出生点 tile 中心；必须在地面容器之后 addChild 才能渲染在其上）
        const playerNode = new Node('Player');
        playerNode.layer = Layers.Enum.UI_2D;
        playerNode.setPosition((SPAWN.x + 0.5) * TILE, -(SPAWN.y + 0.5) * TILE, 0);
        this.node.addChild(playerNode);
        this._player = playerNode.addComponent(PlayerCharacter);
        this._player.init(this._data!);
        ClearingSystem.inst.attachPlayer(playerNode); // 掉落物磁吸目标

        // M2：情境交互按钮（SCREEN_UI 层，唯一常驻复用）
        ContextButtonUI.create(this.node);

        // M3 收尾：生活设施（HUD/床/NPC/钓鱼情境化），依赖玩家与地形
        WorldLiving.assemble(this.node, Layers.Enum.UI_2D, playerNode, this._data!);

        // M3：地形编辑（右半屏输入先建=底层，工具坞后建=同触点优先）
        this._edit = new TerrainEdit();
        this._edit.init(this._data);
        const inv = GameApp.inst ? GameApp.inst.inventory : {};
        this._editInput = TerrainEditInput.create(this.node, this._edit, inv, ground, this._camNode!);
        this._editInput.node.active = false;   // 选工具才启用（与摇杆互不干扰）
        this._dock = ToolDockUI.create(this.node, this._edit, inv);
        this._dock.setVisible(false);

        // M1：相机跟随
        if (this._camNode) {
            this._camNode.addComponent(CameraFollow).target = playerNode;
        }

        // M1：屏幕空间 UI（摇杆）——独立 overlay 相机（SCREEN_UI 层，DEPTH_ONLY 不清颜色缓冲）
        const cam2Node = new Node('UICamera');
        cam2Node.layer = Layers.Enum.UI_2D;
        this.node.addChild(cam2Node);
        const cam2 = cam2Node.addComponent(Camera);
        cam2.projection = 0;                     // ORTHO —— 3.8 枚举 ORTHO=0/PERSPECTIVE=1，旧注释把值写反；透视相机导致 UI 层不渲染、触摸 hit-test 全落空（真机+web 均无法移动的根因）
        cam2.orthoHeight = 360;
        cam2.clearFlags = 6;                     // DEPTH_ONLY = DEPTH|STENCIL（引擎源码 camera-component.ts，UI 相机标准用法）
        cam2.visibility = SCREEN_UI_LAYER;       // 1<<24 只渲染屏幕 UI
        cam2.priority = 1073741825;              // 主相机(1073741824)之后
        cam2Node.setPosition(0, 0, 1000);        // 正交相机置于 UI 平面（z=0）前方 1000，默认 near=1/far=1100 才能覆盖到 UI
        const joyNode = new Node('Joystick');
        this.node.addChild(joyNode);
        joyNode.addComponent(JoystickController);

        // M7 收尾 UX：指南针 HUD（屏幕边缘箭头指向 副本/封印祭坛/河岸）
        CompassHUD.create(this.node, playerNode, this._data!);
        // M7 收尾 UX：设置入口（右上角 ⚙，承载 TapTap 必接「添加到桌面」；面板在摇杆/工具坞之后建=同触点优先）
        SettingsPanel.create(this.node);
        // M7 收尾 UX：守门人情报行（B12：今晚有防守=红字警报，否则预告下一波日期）
        this._intelLabel = this._buildIntel();
        this._refreshIntel();

        // M5：探险副本传送门 + 全屏副本面板
        this._buildDungeonGate();
        this._dungeon = DungeonOverlay.create(this.node);

        // 烘焙源图：直接复用引擎已加载的 ImageAsset.data（web=HTMLImageElement，小游戏=运行时 image 对象，canvas 可直接 drawImage）。
        // 0.0.3 真机实证：手动 new Image()+nativeUrl 相对路径在小游戏端加载失败 → 地面灰块降级，故弃用该路径。
        SpriteLib.inst.init().then(() => {
            const srcOf = (sf: SpriteFrame | null): CanvasImageSource | null => {
                if (!sf) return null;
                const main = sf.uuid ? sf.uuid.split('@')[0] : null;
                if (!main) return null;
                const ia = assetManager.assets.get(main) as ImageAsset | undefined;
                return ia && ia.data ? (ia.data as unknown as CanvasImageSource) : null;
            };
            const g = SpriteLib.inst.get('tiles/ground_grass');
            const fo = SpriteLib.inst.get('tiles/ground_forest');
            const so = SpriteLib.inst.get('tiles/plot_soil');
            const srcs: Record<number, CanvasImageSource | null> = { 0: srcOf(g), 2: srcOf(fo), 1: srcOf(so) };
            this._bake!.setSources(srcs);
            this._applyVisible();
            this._info = 'spike ready route=' + this._route;
            console.log('[Spike] ready, ' + JSON.stringify(this.spikeInfo()));
            // 池路线帧（water 用 grass 帧替代）
            const fr: Record<number, SpriteFrame | null> = { 0: g, 2: fo, 1: so, 3: g, 4: g };
            this._pool!.init(this._data, poolRoot, fr);
        }).catch(() => { this._info = 'spike init error'; });

        this._applyVisible();
        // 屏幕 UI 归层：面板/HUD 建在 UI_2D 世界层且锚定世界原点，主相机跟随玩家远离原点时
        // 整块面板渲染到屏外（「看不到塔防/冒险」根因之二）。统一收进 SCREEN_UI 子树。
        this._collectScreenUI();
    }

    /**
     * 把屏幕空间 UI（全屏面板/顶栏 HUD/流程按钮）收进 SCREEN_UI 层子树：
     * - 这些节点全部以屏幕中心坐标建模（1280×720），但建在 UI_2D 世界层、父节点在世界原点，
     *   主相机 zoom 2× 跟随玩家 → 玩家不在原点附近时面板整体在视口外（隐形）。
     * - overlay 相机（cam2, visibility=SCREEN_UI）固定屏幕坐标渲染，与摇杆/指南针同层。
     * - ScreenUI 作为 canvas 最后一个子节点：渲染与触摸优先级最高（同 SettingsPanel 约定）。
     * - 递归改层：已建子节点逐一修正；面板 onLoad 延迟构建的子节点用 this.node.layer 自动继承。
     *   （DungeonOverlay 例外：其子节点硬编码层常量，已在该文件内改为 SCREEN_UI。）
     */
    private _collectScreenUI(): void {
        const NAMES = ['WorldHUD', 'IntelLabel', 'BedtimeDialog', 'DefenseOverlay', 'DialogPanel',
            'FishingPanel', 'BuildPanel', 'BackpackPanel', 'CodexPanel', 'DungeonOverlay', 'TutorialGuide'];
        const screenRoot = new Node('ScreenUI');
        screenRoot.layer = SCREEN_UI_LAYER;
        this.node.addChild(screenRoot);
        const found: Node[] = [];
        const walk = (n: Node): void => {
            if (NAMES.includes(n.name) || n.name.startsWith('wbtn_')) { found.push(n); return; }
            for (const c of n.children) walk(c);
        };
        for (const c of this.node.children) { if (c !== screenRoot) walk(c); }
        const setLayer = (n: Node): void => {
            n.layer = SCREEN_UI_LAYER;
            for (const c of n.children) setLayer(c);
        };
        for (const n of found) {
            setLayer(n);
            screenRoot.addChild(n);   // reparent 保留局部坐标（根节点皆屏幕中心系，父链原在世界原点）
        }
        // 触摸优先级修复：ContextButton/ToolDock 建在 Joystick 之前 → 同 overlay 相机下 sibling 序低于摇杆，
        // 左半屏（摇杆 640×720 拾取区）内的点击被摇杆 TOUCH_START claim+swallow，TOUCH_END 永远到不了按钮
        // （「布置封印」点不开 BuildPanel 的根因，引擎 pointer-event-dispatcher 只向 claim 者派发 END）。
        // 插到 ScreenUI 头部：高于摇杆，但低于后收进的全屏面板（模态遮罩仍正确吞触摸）。
        for (const name of ['ContextButton', 'ToolDock']) {
            const n = this.node.getChildByName(name);
            if (n) { setLayer(n); screenRoot.insertChild(n, 0); }
        }
        console.log(`[ScreenUI] ${found.length} 个屏幕空间 UI 节点归入 SCREEN_UI 层: ${found.map(n => n.name).join(', ')}`);
    }

    update(): void {
        // M5：摇杆路由——战斗中喂 CombatInput；副本面板打开时冻结世界移动
        const adv = AdventureSystem.inst;
        const joy = JoystickController.inst;
        const dungeonOpen = this._dungeon !== null && this._dungeon.active;
        if (adv.inCombat) {
            adv.combatInput.mx = joy ? joy.dirX : 0;
            adv.combatInput.my = joy ? joy.dirY : 0;
            PlayerCharacter.inst?.setInput(0, 0);
        } else if (dungeonOpen) {
            adv.combatInput.mx = 0; adv.combatInput.my = 0;
            PlayerCharacter.inst?.setInput(0, 0);
        } else if (joy) {
            PlayerCharacter.inst?.setInput(joy.dirX, joy.dirY);
        }

        // M2：情境交互每帧判定（范围内最近物件 → 提示）
        if (this._player) {
            const pp = this._player.node.position;
            InteractionManager.inst.tick(pp.x, pp.y);
            if (WorldLiving.inst) WorldLiving.inst.tick(pp.x, pp.y);
        }
        if (this._player && this._camNode) {
            // 玩家模式：相机由 CameraFollow 驱动，这里只按实际相机位置补烘/回收块
            const cp = this._camNode.position;
            this._camX = Math.max(0, Math.min(MAP_W - 1, Math.floor(cp.x / TILE)));
            this._camY = Math.max(0, Math.min(MAP_H - 1, Math.floor(-cp.y / TILE)));
            if (this._route === 'bake') {
                const [x0, y0, x1, y1] = TerrainBakeRenderer.chunkRangeOf(this._camX, this._camY);
                this._bake!.ensureVisible(x0, y0, x1, y1);
            } else {
                this._pool!.syncVisible(this._camX - 10, this._camY - 6, this._camX + 10, this._camY + 6);
            }
        }
        // M2：物件占格/解锁后的脏块重烘（dirty=0 时零开销）
        this._bake?.rebakeDirty();

        // M3：庭院区进出 → 工具坞显隐；编辑输入随工具态启用
        if (this._player && this._dock && this._editInput && this._edit) {
            const inLiving = this._data!.inLiving(this._player.tileX(), this._player.tileY());
            this._dock.setVisible(inLiving);
            const editing = inLiving && !!this._edit.tool;
            this._editInput.node.active = editing;
            this._statusTimer += 1 / 60;
            if (this._statusTimer > 1) { this._statusTimer = 0; this._dock.refreshStatus(); this._refreshIntel(); }
        }
    }

    /** B12 情报行：SCREEN_UI 居中顶部；今晚有防守=红字警报，否则灰白预告下一波日期（与 FarmHUD 同源逻辑） */
    private _buildIntel(): Label {
        const n = new Node('IntelLabel');
        n.layer = SCREEN_UI_LAYER;
        n.addComponent(UITransform).setContentSize(420, 44);
        // 顶部偏左：新手引导提示框（TutorialGuide）常驻顶部中央偏右，居中会被遮住右半
        n.setPosition(-150, 306, 0);
        this.node.addChild(n);
        const l = n.addComponent(Label)!;
        l.fontSize = 20;
        l.lineHeight = 26;
        l.horizontalAlign = Label.HorizontalAlign.CENTER;   // 3.x 枚举是 HorizontalAlign（2.x 的 Label.Align 在 3.8 为 undefined，会抛错中断 start）
        return l;
    }

    private _refreshIntel(): void {
        if (!this._intelLabel) return;
        const sys = DefenseSystem.inst;
        if (sys && sys.hasNightTonight()) {
            const intel = sys.intelTonight();
            const brief = intel ? intel.comp.map((i) => `${i.monsterName}×${i.count}`).join('、') : '';
            this._intelLabel.string = `⚠ 今晚防守：${brief}！睡前做好准备`;
            this._intelLabel.color = new Color(255, 96, 96, 255);
        } else if (sys) {
            const next = sys.nextNightDay();
            this._intelLabel.string = next !== null ? `守门人来报：第 ${next} 天夜里有怪物来袭` : '';
            this._intelLabel.color = new Color(232, 222, 200, 255);
        }
    }

    private _applyVisible(): void {        if (this._route === 'bake') {
            const [x0, y0, x1, y1] = TerrainBakeRenderer.chunkRangeOf(this._camX, this._camY);
            this._bake!.ensureVisible(x0, y0, x1, y1);
        } else {
            this._pool!.syncVisible(this._camX - 10, this._camY - 6, this._camX + 10, this._camY + 6);
        }
        // 玩家模式相机交给 CameraFollow；无玩家（spikePan 调试）才直写相机
        if (this._cam && !this._player) {
            this._cam.node.setPosition(this._camX * TILE, -this._camY * TILE, 0);
        }
    }

    spikeInfo(): Record<string, unknown> {
        const p = this._player;
        return {
            route: this._route,
            chunks: this._bake?.chunkCount ?? 0,
            poolActive: this._pool?.activeCount ?? 0,
            poolSize: this._pool?.poolSize ?? 0,
            dirty: this._data?.dirty.size ?? 0,
            lastBakeMs: Math.round((this._bake?.lastBakeMs ?? 0) * 100) / 100,
            lastSyncMs: Math.round((this._pool?.lastSyncMs ?? 0) * 100) / 100,
            cam: [this._camX, this._camY],
            player: p ? [p.tileX(), p.tileY()] : null,
            info: this._info,
        };
    }

    spikeBench(n: number): Record<string, unknown> {
        const ms = this._route === 'bake' ? this._bake!.benchEdit(n) : this._pool!.benchEdit(n);
        return { route: this._route, edits: n, ms: Math.round(ms * 100) / 100 };
    }

    spikeSwitch(): string {
        this._route = this._route === 'bake' ? 'pool' : 'bake';
        const bakeRoot = this._bake!.node;
        const poolRoot = this._pool!.node;
        bakeRoot.active = this._route === 'bake';
        poolRoot.active = this._route === 'pool';
        this._applyVisible();
        return this._route;
    }

    spikePan(dx: number, dy: number): void {
        this._camX = Math.max(0, Math.min(MAP_W - 1, this._camX + dx));
        this._camY = Math.max(0, Math.min(MAP_H - 1, this._camY + dy));
        this._applyVisible();
    }

    playerPos(): Record<string, unknown> {
        if (!this._player) return { err: 'no player' };
        const p = this._player.node.position;
        return { x: Math.round(p.x), y: Math.round(p.y), tile: [this._player.tileX(), this._player.tileY()], facing: this._player.facing, walking: this._player.walking };
    }

    debugSetInput(x: number, y: number): void {
        PlayerCharacter.inst?.setInput(x, y);
    }

    // ===== M2 开荒调试（真机无键盘的主调试手段，migration-plan M2 验收） =====

    /** 传送（tile 坐标） */
    dbgTp(tx: number, ty: number): void {
        if (!this._player) return;
        this._player.node.setPosition((tx + 0.5) * TILE, -(ty + 0.5) * TILE, 0);
        this._player.setInput(0, 0);
    }

    /** 触发当前情境交互（等价点情境按钮） */
    dbgHit(): string {
        const cur = InteractionManager.inst.current;
        InteractionManager.inst.dispatchCurrent();
        return cur ? cur.objId : '';
    }

    // ===== M5 探险副本调试 =====

    private _buildDungeonGate(): void {
        const adv = AdventureSystem.inst;
        // 传送门视觉（advGate 区中心附近 (112,10)）：AI 素材贴图（64px 图 → 96px 显示），色块兜底
        const gNode = new Node('dungeon_gate');
        gNode.layer = this.node.layer;
        gNode.addComponent(UITransform).setContentSize(96, 96);
        gNode.setPosition((112 + 0.5) * TILE, -(10 + 0.5) * TILE, 0);
        this.node.addChild(gNode);
        // 贴图统一挂 art 子节点：gNode 随后会被 Interactable._wire 挂 Graphics，
        // 同节点 Sprite+Graphics 会触发引擎 warn 12002 且 Sprite 不渲染（传送门隐形根因）
        const mountGate = (f: SpriteFrame): void => {
            if (gNode.getChildByName('art')) return;
            const sprN = new Node('art');
            sprN.layer = gNode.layer;
            sprN.addComponent(UITransform).setContentSize(96, 96);
            const sp = sprN.addComponent(Sprite);
            sp.sizeMode = Sprite.SizeMode.CUSTOM;
            sp.spriteFrame = f;
            gNode.addChild(sprN);
        };
        const frame = SpriteLib.inst.get('adventure/dungeon_gate');
        if (frame) {
            mountGate(frame);
        } else {
            const g = gNode.addComponent(Graphics);
            g.fillColor = new Color(120, 70, 170, 230);
            g.circle(0, 0, 30);
            g.fill();
            g.strokeColor = new Color(220, 190, 255, 255);
            g.lineWidth = 4;
            g.circle(0, 0, 30);
            g.stroke();
            // SpriteLib 就绪后升级贴图（一次性）：清占位 Graphics + 挂 art 子节点
            SpriteLib.inst.init().then(() => {
                const f2 = SpriteLib.inst.get('adventure/dungeon_gate');
                if (f2 && g.isValid) {
                    g.clear();
                    mountGate(f2);
                }
            });
        }
        const it = gNode.addComponent(Interactable);
        it.setupSimple('dungeon_gate', '进入旧林地', 96, () => {
            if (!adv.inRun) adv.start('old_wood');
            this.advOpen();
        });
    }

    /** 打开副本面板（不自动开局，开局走 start/dbgAdvStart） */
    advOpen(): void {
        if (this._dungeon) (this._dungeon.getComponent('DungeonOverlayComp') as { open(): void }).open();
    }

    advClose(): void {
        if (this._dungeon) (this._dungeon.getComponent('DungeonOverlayComp') as { close(): void }).close();
    }

    /** 开局+开面板 */
    dbgAdvStart(): Record<string, unknown> {
        const adv = AdventureSystem.inst;
        adv.start('old_wood');
        this.advOpen();
        return { room: adv.room()?.name, kind: adv.room()?.kind };
    }

    /** 手动泵战斗 n 步（1/30 步长；hidden tab 下 update 不跑的主验证手段） */
    dbgAdvTick(n = 30): Record<string, unknown> {
        const adv = AdventureSystem.inst;
        if (!adv.combat) return { err: 'no combat' };
        const evs: string[] = [];
        for (let i = 0; i < n; i++) {
            if (!adv.combat || adv.combat.over) break;
            adv.tickCombat(1 / 30);
        }
        const c = adv.combat;
        return { over: c ? c.over : 'finished', won: c ? c.won : null,
            php: c ? Math.round(c.player.hp) : adv.run?.playerHp,
            monsters: c ? c.monsters.length : 0, bullets: c ? c.bullets.length : 0 };
    }

    /** 设定战斗输入（无头驱动） */
    dbgAdvInput(mx: number, my: number, attack = false, roll = false): void {
        const i = AdventureSystem.inst.combatInput;
        i.mx = mx; i.my = my; i.attack = attack; i.roll = roll;
    }

    /** 探险状态快照 */
    advDump(): Record<string, unknown> {
        const adv = AdventureSystem.inst;
        const c = adv.combat;
        return { inRun: adv.inRun, room: adv.room()?.name, kind: adv.room()?.kind,
            bag: adv.run ? { ...adv.run.bag } : null, bagCount: adv.run?.bagCount,
            hp: adv.run?.playerHp, roomIdx: adv.run?.roomIdx,
            combat: c ? { over: c.over, won: c.won, php: Math.round(c.player.hp), mons: c.monsters.map(m => [m.spec.mid, m.hp]) } : null };
    }

    /** 开荒状态快照（物件/存档切片/当前提示） */
    worldDump(): Record<string, unknown> {
        const cur = InteractionManager.inst.current;
        return {
            objects: ClearingSystem.inst.dump(),
            prompt: cur ? { objId: cur.objId, label: cur.promptText() } : null,
            day: TimeSystem.inst.dayIndex,
        };
    }

    /** 快进 n 天（复活/季节调试）——直接推 dayIndex 并广播（M6 起：跳过 bedtime 弹窗，自动化用） */
    dbgDay(n: number): void {
        const ts = TimeSystem.inst;
        for (let i = 0; i < n; i++) { ts.dayIndex += 1; EventBus.inst.emit('dayAdvanced', { dayIndex: ts.dayIndex }); }
    }

    // ===== M3 地形改造调试 =====

    /** 选/取消工具（'hoe'|'shovel'|'paver'|'hammer'|'stairs'|null） */
    dbgTool(t: ToolId | null): string | null {
        if (!this._edit) return null;
        this._edit.selectTool(t);
        this._dock?.refreshStatus();
        return this._edit.tool;
    }

    /** 落一格（含完整校验+扣料，自动化用）；返回 {ok,reason} */
    dbgEdit(tx: number, ty: number): { ok: boolean; reason?: string } {
        if (!this._edit) return { ok: false, reason: 'no edit' };
        this._edit.beginStroke();
        const r = this._edit.applyAt(tx, ty, GameApp.inst!.inventory);
        this._edit.endStroke();
        GameApp.inst?.persist('dbg_edit');
        return r;
    }

    dbgUndo(): boolean {
        const r = this._edit ? this._edit.undo(GameApp.inst!.inventory) : false;
        if (r) GameApp.inst?.persist('dbg_undo');
        return r;
    }

    dbgGive(itemId: string, n: number): void { GameApp.inst?.giveItem(itemId, n); }

    /** M6 调试：瞬移玩家到 tile（旁路碰撞，自动化测试用） */
    dbgWalkTo(tx: number, ty: number): void {
        if (!this._player) return;
        this._player.node.setPosition(tx * 32 + 16, -(ty * 32 + 16));
    }

    /** M6 调试：直接触发第 i 块世界地块的情境操作（种植/浇水/收获） */
    dbgFarm(i: number): void {
        const node = this.node.getChildByName(`farm_plot_${i}`);
        if (!node) { console.log(`[Debug] farm_plot_${i} 不存在`); return; }
        const view = node.getComponent('PlotWorldView') as { onUse(): void } | null;
        if (view) view.onUse();
    }


    /** 地形快照：工具/撤销深度/人造格计数/玩家所在区 */
    terrainDump(): Record<string, unknown> {
        const d = this._data!;
        const counts: Record<string, number> = {};
        for (let i = 0; i < d.types.length; i++) {
            const t = d.types[i];
            if (t >= 5) counts['t' + t] = (counts['t' + t] ?? 0) + 1;
        }
        const tx = this._player ? this._player.tileX() : -1;
        const ty = this._player ? this._player.tileY() : -1;
        return {
            tool: this._edit?.tool ?? null,
            undoDepth: this._edit?.undoDepth ?? 0,
            built: counts,
            inLiving: this._data!.inLiving(tx, ty),
            player: [tx, ty],
        };
    }
}
