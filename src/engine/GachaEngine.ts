import type { Card, PackConfig, Rarity } from '../types';
import { EffectManager } from './EffectManager';
import { mockCards } from '../utils/mockData';

export class GachaEngine {
  public effectManager: EffectManager;

  constructor() {
    this.effectManager = new EffectManager();
  }

  public getRates(pack: PackConfig): Record<Rarity, number> {
    return this.effectManager.getModifiedRates(pack);
  }

  public getPackPrice(pack: PackConfig): number {
    return this.effectManager.getModifiedPrice(pack);
  }

  public getRefundAmount(pack?: PackConfig): number {
    return this.effectManager.getPullRefund(pack);
  }

  public drawOne(pack: PackConfig): Card {
    const rates = this.getRates(pack);
    const totalWeight = Object.values(rates).reduce((sum, weight) => sum + weight, 0);
    let roll = Math.random() * totalWeight;
    let selectedRarity: Rarity = 'N';

    for (const [rarity, weight] of Object.entries(rates)) {
      if (roll < weight) {
        selectedRarity = rarity as Rarity;
        break;
      }
      roll -= weight;
    }

    const packCards = mockCards.filter(c => c.packId === pack.id);
    const rarityPool = packCards.filter(card => card.rarity === selectedRarity);
    
    // 如果没有这个稀有度的卡，就随机给一张该包的卡兜底
    if (rarityPool.length === 0) {
      if (packCards.length === 0) {
        throw new Error(`Pack ${pack.id} has no cards defined in mockData.`);
      }
      return packCards[Math.floor(Math.random() * packCards.length)];
    }

    return rarityPool[Math.floor(Math.random() * rarityPool.length)];
  }

  public drawMultiple(pack: PackConfig, count: number): Card[] {
    const results: Card[] = [];
    for (let i = 0; i < count; i++) {
      results.push(this.drawOne(pack));
    }
    return results;
  }
}