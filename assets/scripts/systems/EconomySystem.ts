import { DataManager } from '../core/DataManager';
import { EventBus } from '../core/EventBus';

type AnyRow = Record<string, unknown>;

/**
 * EconomySystem —— 经济闭环（阶段 2.1，game-design-draft §11.1）。
 *
 * 金币 = inventory['gold']（items 表锚点行 id='gold'），零存档结构变更。
 * 卖出：作物产出(crop_product)按 items.sellPrice 结算；
 * 买入：种子按 items.buyPrice（≈产出售价 35% 价格锚）。
 * 系统只改背包+发事件，落盘由调用方 persist(reason) 决定。
 */
export class EconomySystem {
    private static _instance: EconomySystem | null = null;
    static get inst(): EconomySystem {
        if (!this._instance) this._instance = new EconomySystem();
        return this._instance;
    }

    /** 买入价（缺 buyPrice 回退 sellPrice；缺行返回 null） */
    getBuyPrice(itemId: string): number | null {
        return this._price(itemId, 'buyPrice');
    }

    /** 卖出背包全部作物产出，返回所得金币（0=没货可卖） */
    sellAllProducts(inv: Record<string, number>): number {
        let total = 0;
        for (const row of DataManager.inst.getRows('catalogs/items') as AnyRow[]) {
            if (row['category'] !== 'crop_product') continue;
            const id = String(row['id']);
            const n = inv[id] ?? 0;
            if (n <= 0) continue;
            total += n * (this._price(id, 'sellPrice') ?? 0);
            delete inv[id];
            EventBus.inst.emit('itemSpent', { itemId: id, count: n });
        }
        if (total > 0) {
            inv['gold'] = (inv['gold'] ?? 0) + total;
            EventBus.inst.emit('itemGained', { itemId: 'gold', count: total });
        }
        return total;
    }

    /** 买种子（默认 1 包）。金币不足/缺表返回 false */
    buySeed(seedItemId: string, inv: Record<string, number>, count = 1): boolean {
        const cost = this._price(seedItemId, 'buyPrice');
        if (cost === null) return false;
        const gold = inv['gold'] ?? 0;
        if (gold < cost * count) return false;
        inv['gold'] = gold - cost * count;
        inv[seedItemId] = (inv[seedItemId] ?? 0) + count;
        EventBus.inst.emit('itemSpent', { itemId: 'gold', count: cost * count });
        EventBus.inst.emit('itemGained', { itemId: seedItemId, count });
        return true;
    }

    private _price(itemId: string, field: 'sellPrice' | 'buyPrice'): number | null {
        const row = DataManager.inst.getRow('catalogs/items', itemId);
        if (!row) return null;
        const v = row[field] ?? row['sellPrice'];
        return typeof v === 'number' ? v : null;
    }
}
