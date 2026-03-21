import type { Card, PackConfig, Rarity } from '../types';
import { EffectManager } from './EffectManager';

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

  public getRefundAmount(): number {
    return this.effectManager.getPullRefund();
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
    
    const rarityPool = pack.pool.filter(card => card.rarity === selectedRarity);
    if (rarityPool.length === 0) {
      return pack.pool[Math.floor(Math.random() * pack.pool.length)];
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
