import { _decorator, Component } from 'cc';
import { DataManager } from '../../core/DataManager';
import { GameApp } from '../../app/GameApp';
import { EventBus } from '../../core/EventBus';

const { ccclass } = _decorator;

/** 一次抛竿的运行状态 */
interface CastState {
    fishId: string;
    /** 咬钩时刻（本 cast 累计秒） */
    biteAt: number;
    /** 咬钩窗口截止（biteAt + catchWindowSec） */
    biteDeadline: number;
    /** 本 cast 已流逝秒 */
    elapsed: number;
}

/**
 * FishingSystem —— 钓鱼 QTE 状态机（阶段 5 生活内容）。
 *
 * 流程：cast() 抛竿 → 等待 waitSec 随机秒 → 咬钩窗口（catchWindowSec，≥0.42s 符合触屏规范）
 * → hook() 判定：窗口内=钓到入包 / 过早=惊跑 / 超时=溜走。失败无惩罚（§6.3）。
 *
 * 时间用累积 dt 驱动（update 由 FishingPanel 调用），与帧循环一致，自动化可手动 tick。
 */
@ccclass('FishingSystem')
export class FishingSystem {
    private static _inst: FishingSystem | null = null;
    static get inst(): FishingSystem {
        if (!this._inst) this._inst = new FishingSystem();
        return this._inst;
    }

    /** 当前抛竿状态；null=未抛竿 */
    cast: CastState | null = null;
    /** 最近一次 hook 结果（调试/驱动读取） */
    lastResult: '' | 'early' | 'caught' | 'miss' | 'none' = '';
    /** 最近钓到的鱼 id（UI 结果展示） */
    lastFishId = '';

    /** 权重随机选鱼；鱼表缺失返回 null */
    private _rollFish(): { id: string; def: any } | null {
        const table = DataManager.inst.getRows('catalogs/fish');
        if (!table || table.length === 0) return null;
        const total = table.reduce((s: number, r: any) => s + (r['weight'] ?? 1), 0);
        let roll = Math.random() * total;
        for (const row of table) {
            roll -= (row['weight'] ?? 1);
            if (roll <= 0) return { id: row['id'], def: row };
        }
        return { id: table[table.length - 1]['id'], def: table[table.length - 1] };
    }

    /** 抛竿。返回 false=没有鱼表（异常） */
    castRod(): boolean {
        if (this.cast) return true;
        const pick = this._rollFish();
        if (!pick) return false;
        const [wMin, wMax] = (pick.def['waitSec'] ?? [1.5, 4]) as [number, number];
        const wait = wMin + Math.random() * (wMax - wMin);
        const window = pick.def['catchWindowSec'] ?? 0.6;
        this.cast = {
            fishId: pick.id,
            biteAt: wait,
            biteDeadline: wait + window,
            elapsed: 0,
        };
        this.lastResult = '';
        return true;
    }

    /** 每帧推进（由 FishingPanel.update 调用）；超时自动判 miss */
    tick(dt: number): void {
        const s = this.cast;
        if (!s) return;
        s.elapsed += dt;
        if (s.elapsed > s.biteDeadline) {
            this.lastResult = 'miss';
            this.cast = null;
            EventBus.inst.emit('farmChanged', { action: 'fish_miss' });
        }
    }

    /** 是否处于咬钩窗口（UI 显示提示用） */
    get biting(): boolean {
        const s = this.cast;
        return !!s && s.elapsed >= s.biteAt && s.elapsed <= s.biteDeadline;
    }

    /**
     * 提竿判定。'caught'=窗口内钓到（入包） / 'early'=过早惊跑 / 'miss'=已溜走 / 'none'=没在钓鱼
     */
    hook(): '' | 'early' | 'caught' | 'miss' | 'none' {
        const s = this.cast;
        if (!s) { this.lastResult = 'none'; return 'none'; }
        if (s.elapsed < s.biteAt - 0.15) {
            // 提前太多=惊跑（容差 0.15s 内仍算准点）
            this.lastResult = 'early';
            this.cast = null;
            EventBus.inst.emit('farmChanged', { action: 'fish_early' });
            return 'early';
        }
        const fishDef: any = DataManager.inst.getRow('catalogs/fish', s.fishId);
        GameApp.inst.giveItem(s.fishId, 1);
        GameApp.inst.collectCodex(s.fishId); // 图鉴登记（去重在 App 层）
        this.lastResult = 'caught';
        this.lastFishId = s.fishId;
        this.cast = null;
        EventBus.inst.emit('farmChanged', { action: 'fish_caught', fishId: s.fishId });
        void fishDef;
        return 'caught';
    }

    /** 收杆（放弃本次，无惩罚） */
    reset(): void {
        this.cast = null;
    }
}
