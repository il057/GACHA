import type { Card, PackConfig, Rarity } from '../types';

export interface Modifier {
  id: string;
  type: 'rate' | 'price' | 'value' | 'refund';
  apply: (context: any) => any;
}

export class EffectManager {
  private modifiers: Modifier[] = [];

  addModifier(modifier: Modifier) {
    if (!this.modifiers.some(m => m.id === modifier.id)) {
      this.modifiers.push(modifier);
    }
  }

  removeModifier(id: string) {
    this.modifiers = this.modifiers.filter(m => m.id !== id);
  }

  // 计算修改后的出卡概率 (比如幸运值+5%)
  getModifiedRates(pack: PackConfig): Record<Rarity, number> {
    let currentRates = { ...pack.rates };
    for (const mod of this.modifiers) {
      if (mod.type === 'rate') {
        currentRates = mod.apply({ pack, rates: currentRates }) || currentRates;
      }
    }
    return currentRates;
  }

  // 计算卡包售价
  getModifiedPrice(pack: PackConfig): number {
    let currentPrice = pack.basePrice;
    for (const mod of this.modifiers) {
      if (mod.type === 'price') {
        currentPrice = mod.apply({ pack, price: currentPrice }) || currentPrice;
      }
    }
    return Math.max(0, currentPrice);
  }

  // 计算卖出能获得的钱
  getModifiedCardValue(card: Card, isNew: boolean = false): number {
    let currentValue = card.baseValue;
    for (const mod of this.modifiers) {
      if (mod.type === 'value') {
        currentValue = mod.apply({ card, value: currentValue, isNew }) || currentValue;
      }
    }
    return Math.max(0, Math.floor(currentValue));
  }

  // 计算每抽的额外返款 (例如海洋包全鱼羁绊)
  getPullRefund(): number {
    let refund = 0;
    for (const mod of this.modifiers) {
      if (mod.type === 'refund') {
        refund += mod.apply({ refund }) || 0;
      }
    }
    return refund;
  }
}
