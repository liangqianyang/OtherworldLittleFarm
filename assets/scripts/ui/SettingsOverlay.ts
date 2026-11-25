/**
 * 《异界小农场 2.0》阶段 5：国风卷轴设置面板（音量调节 + 本地存档码导出 + TapTap 添加到桌面）
 * - 严格符合 TapTap 小游戏单机合规要求：明示“数据仅存本地”、提供存档码防丢档、内置「添加到桌面」入口。
 */

import { _decorator, Color, Component, Graphics, Label, Layers, Node, UITransform, Widget } from 'cc';
import { AudioManager } from '../core/AudioManager';
import { GameApp } from '../app/GameApp';
import { DebugPanel } from './DebugPanel';
import { DungeonOverlay } from './DungeonOverlay';
import { DefenseOverlay } from './DefenseOverlay';
import { VoyageOverlay } from './VoyageOverlay';
import { FishingOverlay } from './FishingOverlay';
import { IndoorOverlay } from './IndoorOverlay';

const { ccclass } = _decorator;

@ccclass('SettingsOverlay')
export class SettingsOverlay extends Component {
    private static _inst: SettingsOverlay | null = null;

    private _triggerBtn!: Node;
    private _panel!: Node;
    private _bgmLbl!: Label;
    private _sfxLbl!: Label;
    private _noteLbl!: Label;
    private _open = false;

    public static get inst(): SettingsOverlay | null {
        return this._inst;
    }

    public get isOpen(): boolean {
        return this._open;
    }

    protected onLoad(): void {
        SettingsOverlay._inst = this;
        this._buildTopRightTrigger();
        this._buildModal();
        this._panel.active = false;
    }

    protected update(): void {
        if (!this._triggerBtn) return;
        const hideTrigger =
            !!DungeonOverlay.inst?.isOpen ||
            !!DefenseOverlay.inst?.isOpen ||
            !!VoyageOverlay.inst?.isOpen ||
            !!FishingOverlay.inst?.isOpen ||
            !!IndoorOverlay.inst?.isOpen;
        this._triggerBtn.active = !hideTrigger;
    }

    protected onDestroy(): void {
        if (SettingsOverlay._inst === this) SettingsOverlay._inst = null;
    }

    private _uiNode(name: string, parent: Node): Node {
        const n = new Node(name);
        n.layer = Layers.Enum.UI_2D;
        n.parent = parent;
        return n;
    }

    private _buildTopRightTrigger(): void {
        const btn = this._makeBtn('设置', 72, 38, new Color(132, 92, 58, 230), () => this.open());
        this._triggerBtn = btn;
        btn.parent = this.node;
        const w = btn.addComponent(Widget);
        w.isAlignTop = true;
        w.top = 20;
        w.isAlignRight = true;
        w.right = 24; // 正式版洁净右上角布局
    }

    private _buildModal(): void {
        this._panel = this._uiNode('SettingsModal', this.node);
        this._panel.addComponent(UITransform).setContentSize(1280, 720);

        const mask = this._panel.addComponent(Graphics);
        mask.fillColor = new Color(18, 28, 26, 165);
        mask.rect(-640, -360, 1280, 720);
        mask.fill();

        const card = this._uiNode('SettingsCard', this._panel);
        card.addComponent(UITransform).setContentSize(620, 420);
        const g = card.addComponent(Graphics);
        g.fillColor = new Color(248, 240, 222, 252);
        g.strokeColor = new Color(132, 92, 58, 255);
        g.lineWidth = 4;
        g.roundRect(-310, -210, 620, 420, 16);
        g.fill();
        g.stroke();

        const title = this._uiNode('Title', card).addComponent(Label);
        title.node.setPosition(0, 162, 0);
        title.string = '设置与单机存档';
        title.fontSize = 24;
        title.color = new Color(34, 46, 42, 255);

        // BGM 音量行
        this._bgmLbl = this._uiNode('BgmLbl', card).addComponent(Label);
        this._bgmLbl.node.setPosition(-90, 95, 0);
        this._bgmLbl.fontSize = 18;
        this._bgmLbl.color = new Color(46, 56, 52, 255);

        const bgmDown = this._makeBtn('-10%', 72, 36, new Color(128, 102, 78, 235), () => {
            AudioManager.inst.setBgmVolume(AudioManager.inst.bgmVolume - 0.1);
            this._refreshLabels();
        });
        bgmDown.parent = card;
        bgmDown.setPosition(110, 95, 0);

        const bgmUp = this._makeBtn('+10%', 72, 36, new Color(36, 126, 116, 240), () => {
            AudioManager.inst.setBgmVolume(AudioManager.inst.bgmVolume + 0.1);
            this._refreshLabels();
        });
        bgmUp.parent = card;
        bgmUp.setPosition(195, 95, 0);

        // SFX 音量行
        this._sfxLbl = this._uiNode('SfxLbl', card).addComponent(Label);
        this._sfxLbl.node.setPosition(-90, 38, 0);
        this._sfxLbl.fontSize = 18;
        this._sfxLbl.color = new Color(46, 56, 52, 255);

        const sfxDown = this._makeBtn('-10%', 72, 36, new Color(128, 102, 78, 235), () => {
            AudioManager.inst.setSfxVolume(AudioManager.inst.sfxVolume - 0.1);
            AudioManager.inst.playSfx('tap');
            this._refreshLabels();
        });
        sfxDown.parent = card;
        sfxDown.setPosition(110, 38, 0);

        const sfxUp = this._makeBtn('+10%', 72, 36, new Color(36, 126, 116, 240), () => {
            AudioManager.inst.setSfxVolume(AudioManager.inst.sfxVolume + 0.1);
            AudioManager.inst.playSfx('tap');
            this._refreshLabels();
        });
        sfxUp.parent = card;
        sfxUp.setPosition(195, 38, 0);

        // 存档码导出 & TapTap 添加到桌面
        const exportBtn = this._makeBtn('导出本地存档码', 190, 44, new Color(74, 108, 128, 245), () => {
            const app = GameApp.inst;
            if (!app?.ready) return;
            const code = app.saveMgr.exportCode(app.saveData);
            console.log('[Settings] 存档码:', code);
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                void navigator.clipboard.writeText(code).catch(() => {});
            }
            this._noteLbl.string = '存档码已尝试复制到剪贴板并输出至控制台，请妥善保存！';
            AudioManager.inst.playSfx('coin');
        });
        exportBtn.parent = card;
        exportBtn.setPosition(-115, -36, 0);

        const desktopBtn = this._makeBtn('添加到桌面 (TapTap)', 200, 44, new Color(184, 122, 48, 245), () => {
            void GameApp.inst?.platform.addToDesktop().then((ok) => {
                this._noteLbl.string = ok ? '已成功添加快捷方式到桌面！' : '当前为浏览器预览环境，TapTap 真机容器内将自动调起添加桌面';
            });
        });
        desktopBtn.parent = card;
        desktopBtn.setPosition(115, -36, 0);

        // 隐私与单机说明
        const nNode = this._uiNode('PrivacyNote', card);
        nNode.setPosition(0, -104, 0);
        nNode.addComponent(UITransform).setContentSize(540, 48);
        this._noteLbl = nNode.addComponent(Label);
        this._noteLbl.fontSize = 14;
        this._noteLbl.lineHeight = 20;
        this._noteLbl.overflow = Label.Overflow.SHRINK;
        this._noteLbl.color = new Color(108, 86, 62, 255);
        this._noteLbl.string = '纯单机无内购：所有游戏进度仅保存在本机，卸载或清理缓存前请先导出存档码。';

        const dbgToggle = this._makeBtn('开发者调试(DBG)', 166, 42, new Color(64, 96, 92, 235), () => {
            const next = !DebugPanel.isDebugVisible;
            DebugPanel.setDebugVisible(next);
            this._noteLbl.string = next ? '已开启右上角 DBG 开发者调试面板' : '已隐藏右上角 DBG 调试面板（纯净发布视图）';
        });
        dbgToggle.parent = card;
        dbgToggle.setPosition(-100, -162, 0);

        const closeBtn = this._makeBtn('关闭设置', 140, 42, new Color(128, 102, 78, 240), () => this.close());
        closeBtn.parent = card;
        closeBtn.setPosition(100, -162, 0);
    }

    private _makeBtn(text: string, w: number, h: number, color: Color, onTap: () => void): Node {
        const n = new Node(`Btn_${text.slice(0, 4)}`);
        n.layer = Layers.Enum.UI_2D;
        n.addComponent(UITransform).setContentSize(w, h);
        const g = n.addComponent(Graphics);
        g.fillColor = color;
        g.roundRect(-w / 2, -h / 2, w, h, 8);
        g.fill();
        const l = this._uiNode('Lbl', n).addComponent(Label);
        l.string = text;
        l.fontSize = 15;
        l.color = Color.WHITE;
        n.on(Node.EventType.TOUCH_END, onTap);
        return n;
    }

    public open(): void {
        AudioManager.inst.playSfx('tap');
        this._open = true;
        this._panel.active = true;
        this._panel.setSiblingIndex(this.node.children.length - 1);
        this._refreshLabels();
    }

    public close(): void {
        AudioManager.inst.playSfx('tap');
        this._open = false;
        this._panel.active = false;
    }

    private _refreshLabels(): void {
        this._bgmLbl.string = `国风配乐音量：${Math.round(AudioManager.inst.bgmVolume * 100)}%`;
        this._sfxLbl.string = `交互音效音量：${Math.round(AudioManager.inst.sfxVolume * 100)}%`;
    }
}
