import { defineStore } from 'pinia';
import { GachaEngine } from '../engine/GachaEngine';
import { mockCards, availableUpgrades, availablePacks, metaSkills } from '../utils/mockData';
import type { Card, PackConfig } from '../types';

interface StoreState {
  coins: number;
  totalEarned: number;
  totalPullsThisRun: number;
  library: Record<string, number>; 
  upgrades: Record<string, number>;
  metaUpgrades: Record<string, number>;
  metaPoints: number; 
  currentSessionCards: Card[];
  gameOver: boolean;
}

const engine = new GachaEngine();

const loadMetaPoints = () => {
  try {
    const mp = localStorage.getItem('gacha_metaPoints');
    return mp ? parseInt(mp, 10) : 0;
  } catch (e) {
    return 0;
  }
};

const saveMetaPoints = (metaPoints: number) => {
  localStorage.setItem('gacha_metaPoints', metaPoints.toString());
};

const loadGameState = (): Partial<StoreState> => {
  try {
    const data = localStorage.getItem('gacha_gameState');
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    return {};
  }
  return {};
};

export const saveGameState = (state: StoreState) => {
  const { coins, totalEarned, totalPullsThisRun, library, upgrades, metaUpgrades, currentSessionCards, gameOver } = state;
  localStorage.setItem('gacha_gameState', JSON.stringify({
    coins, totalEarned, totalPullsThisRun, library, upgrades, metaUpgrades, currentSessionCards, gameOver
  }));
};

export const useGameStore = defineStore('game', {
  state: (): StoreState => {
    const saved = loadGameState();
    const defaultStart = 200;
    const initialCoins = saved.coins ?? defaultStart;
    return {
      coins: initialCoins,
      totalEarned: saved.totalEarned ?? initialCoins,
      totalPullsThisRun: saved.totalPullsThisRun ?? 0,
      library: saved.library ?? {},
      upgrades: saved.upgrades ?? {},
      metaUpgrades: saved.metaUpgrades ?? {},
      metaPoints: loadMetaPoints(),
      currentSessionCards: saved.currentSessionCards ?? [],
      gameOver: saved.gameOver ?? false,
    };
  },
  
  getters: {
    isSoftLocked: (state) => {
      const cheapestPackPrice = Math.min(...availablePacks.map(p => engine.getPackPrice(p)));
      const hasAnyLibraryCards = Object.values(state.library).some(count => count > 0);
      return state.coins < cheapestPackPrice && state.currentSessionCards.length === 0 && !hasAnyLibraryCards;
    },

    hasPendingCards: (state) => {
      return state.currentSessionCards.length > 0;
    },

    sellAllPendingValue: (state) => {
      return state.currentSessionCards.reduce((sum, c) => sum + engine.effectManager.getModifiedCardValue(c), 0);
    },

    collectNewAndSellRestValue: (state) => {
      let val = 0;
      const tempLib = { ...state.library };
      for (const c of state.currentSessionCards) {
        const packCards = mockCards.filter(pc => pc.packId === c.packId);
        let minCount = 999;
        for (const pc of packCards) {
          const count = tempLib[pc.id] || 0;
          if (count < minCount) minCount = count;
        }
        
        const targetCount = minCount + 1;
        const currentCount = tempLib[c.id] || 0;
        
        if (minCount < 5 && currentCount < targetCount && currentCount < 5) {
          tempLib[c.id] = currentCount + 1;
        } else {
          val += engine.effectManager.getModifiedCardValue(c);
        }
      }
      return val;
    },
    
    // 获取指定羁绊的星级 (最大5星)
    getSynergyStars: (state) => (packId: string, synergyId: string) => {
      const pack = availablePacks.find(p => p.id === packId);
      if (!pack) return 0;
      const synergy = (pack.synergies || []).find(s => s.id === synergyId);
      if (!synergy) return 0;
      
      const requiredCardIds = synergy.getRequiredCards(mockCards);
      if (requiredCardIds.length === 0) return 0;

      let minCount = 999;
      for (const id of requiredCardIds) {
        const count = state.library[id] || 0;
        if (count < minCount) minCount = count;
      }
      
      return Math.min(5, minCount);
    }
  },

  actions: {
      updateCoins(amount: number) {
        this.coins += amount;
        this.totalEarned += amount;
      },
    initEngine() {
      // 重新绑定所有拦截器
      engine.effectManager = new GachaEngine().effectManager; 
      
      // -- 结算羁绊 (基于星级) --
      const pityStars = this.getSynergyStars('pack_pity', 'pity_all');
      if (pityStars > 0) {
        engine.effectManager.addModifier({
          id: 'bond_pity', type: 'rate',
          apply: ({ rates }) => {
            const boost = 1 + (pityStars * 0.1); 
            return { ...rates, SR: rates.SR * boost, SSR: rates.SSR * boost };
          }
        });
      }

      const pityTools = this.getSynergyStars('pack_pity', 'pity_tools');
      if (pityTools > 0) {
        engine.effectManager.addModifier({
          id: 'bond_pity_tools', type: 'value',
          apply: ({ value, card }) => card && card.tags?.includes('tool') ? value + (pityTools * 3) : value
        });
      }

      const pityStone = this.getSynergyStars('pack_pity', 'pity_stone');
      if (pityStone > 0) {
        engine.effectManager.addModifier({
          id: 'bond_pity_stone', type: 'value',
          apply: ({ value, card }) => card && card.tags?.includes('stone') ? value + (pityStone * 8) : value
        });
      }

      const forestStars = this.getSynergyStars('pack_forest', 'forest_all');
      if (forestStars > 0) {
        engine.effectManager.addModifier({
          id: 'bond_forest', type: 'value',
          apply: ({ value }) => Math.floor(value * (1 + forestStars * 0.15))
        });
      }

      const forestPlants = this.getSynergyStars('pack_forest', 'forest_plants');
      if (forestPlants > 0) {
        engine.effectManager.addModifier({
          id: 'bond_forest_plants', type: 'value',
          apply: ({ value, card }) => card && card.tags?.includes('plant') ? value + (forestPlants * 15) : value
        });
      }

      const forestFood = this.getSynergyStars('pack_forest', 'forest_food');
      if (forestFood > 0) {
        engine.effectManager.addModifier({
          id: 'bond_forest_food', type: 'price',
          apply: ({ price, pack }) => pack?.id === 'pack_forest' ? Math.max(1, price - (forestFood * 2)) : price
        });
      }

      const oceanStars = this.getSynergyStars('pack_ocean', 'ocean_all');
      if (oceanStars > 0) {
        engine.effectManager.addModifier({
          id: 'bond_ocean', type: 'refund',
          apply: ({ refund, pack }) => refund + Math.floor((pack?.basePrice || 20) * (oceanStars * 0.04))
        });
      }

      const oceanFishStars = this.getSynergyStars('pack_ocean', 'ocean_fish');
      if (oceanFishStars > 0) {
        engine.effectManager.addModifier({
          id: 'bond_ocean_fish', type: 'value',
          apply: ({ value, card }) => card && card.tags?.includes('fish') ? value + (oceanFishStars * 35) : value
        });
      }

      const fireStars = this.getSynergyStars('pack_fire', 'fire_all');
      if (fireStars > 0) {
        engine.effectManager.addModifier({
          id: 'bond_fire', type: 'price',
          apply: ({ price, pack }) => pack?.id === 'pack_fire' ? Math.max(1, Math.floor(price * (1 - fireStars * 0.08))) : price
        });
      }

      const fireStone = this.getSynergyStars('pack_fire', 'fire_stone');
      if (fireStone > 0) {
        engine.effectManager.addModifier({
          id: 'bond_fire_stone', type: 'value',
          apply: ({ value, card }) => card && card.tags?.includes('stone') ? value + (fireStone * 80) : value
        });
      }

      // -- 结算升级节点 --
      const luckLvl = this.upgrades['upgrade_luck'] || 0;
      if (luckLvl > 0) {
        engine.effectManager.addModifier({
          id: 'upg_luck', type: 'rate',
          apply: ({ rates }) => {
            const multi = 1 + (luckLvl * 0.15); 
            return { ...rates, SR: rates.SR * multi, SSR: rates.SSR * multi };
          }
        });
      }

      const valueLvl = this.upgrades['upgrade_value'] || 0;
      if (valueLvl > 0) {
        engine.effectManager.addModifier({
          id: 'upg_value', type: 'value',
          apply: ({ value }) => Math.floor(value * (1 + valueLvl * 0.10))
        });
      }
      
      const refundPctLvl = this.upgrades['upgrade_refund_pct'] || 0;
      if (refundPctLvl > 0) {
        engine.effectManager.addModifier({
          id: 'upg_refund_pct', type: 'refund',
          apply: ({ refund, pack }) => refund + Math.floor((pack?.basePrice || 10) * (refundPctLvl * 0.02))
        });
      }
      
      const refundLvl = this.upgrades['upgrade_refund'] || 0;
      if (refundLvl > 0) {
        engine.effectManager.addModifier({
          id: 'upg_refund', type: 'refund',
          apply: ({ refund }) => refund + refundLvl
        });
      }

      const discountLvl = this.upgrades['upgrade_discount'] || 0;
      if (discountLvl > 0) {
        engine.effectManager.addModifier({
          id: 'upg_discount', type: 'price',
          apply: ({ price }) => Math.max(1, Math.floor(price * (1 - discountLvl * 0.02)))
        });
      }

        // -- 结算轮回天赋 --
        const msLuckLvl = this.metaUpgrades['ms_luck'] || 0;
        if (msLuckLvl > 0) {
          engine.effectManager.addModifier({
            id: 'meta_luck', type: 'rate',
            apply: ({ rates }) => {
              const multi = 1 + (msLuckLvl * 0.05);
              return { ...rates, SR: rates.SR * multi, SSR: rates.SSR * multi };
            }
          });
        }

        const msValueLvl = this.metaUpgrades['ms_value'] || 0;
        if (msValueLvl > 0) {
          engine.effectManager.addModifier({
            id: 'meta_value', type: 'value',
            apply: ({ value }) => Math.floor(value * (1 + msValueLvl * 0.20))
          });
        }

        const msDiscountLvl = this.metaUpgrades['ms_discount'] || 0;
        if (msDiscountLvl > 0) {
          engine.effectManager.addModifier({
            id: 'meta_discount', type: 'price',
            apply: ({ price }) => Math.max(1, Math.floor(price * (1 - msDiscountLvl * 0.05)))
          });
        }
      this.checkGameOver();
    },

    buyUpgrade(configId: string) {
      const config = availableUpgrades.find(u => u.id === configId);
      if (!config) return;

      const currentLevel = this.upgrades[config.id] || 0;
      if (currentLevel >= config.maxLevel) return;
      
      const price = Math.floor(config.basePrice * Math.pow(config.priceMultiplier, currentLevel));
      if (this.coins >= price) {
        this.coins -= price;
        this.upgrades[config.id] = currentLevel + 1;
        this.initEngine();
      }
    },

    checkGameOver() {
      if (this.isSoftLocked && !this.gameOver) {
        this.surrender();
      }
    },

    getMetaUpgradeCost(skillId: string): number {
      // @ts-ignore
      const skill = metaSkills?.find(s => s.id === skillId) || { baseCost: 10, costMultiplier: 2 };
      const currentLevel = this.metaUpgrades[skillId] || 0;
      return Math.floor(skill.baseCost * Math.pow(skill.costMultiplier, currentLevel));
    },

    buyMetaUpgrade(skillId: string) {
      // @ts-ignore
      const skill = metaSkills?.find(s => s.id === skillId);
      if (!skill) return;
      
      const currentLevel = this.metaUpgrades[skillId] || 0;
      if (currentLevel >= skill.maxLevel) return;

      const cost = this.getMetaUpgradeCost(skillId);
      if (this.metaPoints >= cost) {
        this.metaPoints -= cost;
        this.metaUpgrades[skillId] = currentLevel + 1;
        saveMetaPoints(this.metaPoints);
        this.initEngine();
      }
    },

    surrender() {
      if (this.gameOver) return;
      this.gameOver = true;
      const gainedPoints = Math.floor(this.totalEarned / 50);
      if (gainedPoints > 0) {
        this.metaPoints += gainedPoints;
        saveMetaPoints(this.metaPoints);
      }
    },

    buyMultiple(pack: PackConfig, count: number) {
      if (this.gameOver) return;
      
      const price = engine.getPackPrice(pack) * count;
      if (this.coins >= price) {
        const results = engine.drawMultiple(pack, count);
        this.currentSessionCards.push(...results);
        this.totalPullsThisRun += count;
        this.coins -= price; 
        
        const refund = engine.getRefundAmount(pack) * count;
        if (refund > 0) {
          this.updateCoins(refund);
        }
      }
    },

    sellAllPending() {
      let earned = this.sellAllPendingValue;
      this.currentSessionCards = [];
      this.updateCoins(earned);
    },

    collectAllPending() {
      let newlyCollected = false;
      for (const card of this.currentSessionCards) {
        if (!this.library[card.id]) {
          this.library[card.id] = 1;
          newlyCollected = true;
        } else {
          this.library[card.id]++;
        }
      }
      if (newlyCollected || this.currentSessionCards.length > 0) {
        this.initEngine();
      }
      this.currentSessionCards = [];
      this.checkGameOver();
    },

    collectNewAndSellRest() {
      let earned = 0;
      let newlyCollected = false;
      
      for (const card of this.currentSessionCards) {
        const packCards = mockCards.filter(pc => pc.packId === card.packId);
        let minCount = 999;
        for (const pc of packCards) {
          const count = this.library[pc.id] || 0;
          if (count < minCount) minCount = count;
        }
        
        const targetCount = minCount + 1;
        const currentCount = this.library[card.id] || 0;
        
        if (minCount < 5 && currentCount < targetCount && currentCount < 5) {
          this.library[card.id] = currentCount + 1;
          newlyCollected = true;
        } else {
          earned += engine.effectManager.getModifiedCardValue(card);
        }
      }
      
      if (newlyCollected) {
        this.initEngine();
      }
      this.currentSessionCards = [];
      this.updateCoins(earned);
    },

    sellSelected(indices: number[]) {
      // Sort descending to not mess up indices during splice
      const sortedIndices = [...indices].sort((a, b) => b - a);
      let earned = 0;
      for (const index of sortedIndices) {
        const card = this.currentSessionCards[index];
        if (card) {
          earned += engine.effectManager.getModifiedCardValue(card);
          this.currentSessionCards.splice(index, 1);
        }
      }
      this.updateCoins(earned);
    },

    collectSelected(indices: number[]) {
      const sortedIndices = [...indices].sort((a, b) => b - a);
      let newlyCollected = false;
      for (const index of sortedIndices) {
        const card = this.currentSessionCards[index];
        if (card) {
          if (!this.library[card.id]) {
            this.library[card.id] = 1;
            newlyCollected = true;
          } else {
            this.library[card.id]++;
          }
          this.currentSessionCards.splice(index, 1);
        }
      }
      if (newlyCollected) {
        this.initEngine();
      }
      this.checkGameOver();
    },

    sellFromLibrary(cardId: string) {
      if (this.library[cardId] && this.library[cardId] > 0) {
        this.library[cardId]--;
        if (this.library[cardId] === 0) {
          delete this.library[cardId];
        }
        const card = mockCards.find(c => c.id === cardId);
        if (card) {
          this.updateCoins(engine.effectManager.getModifiedCardValue(card));
          this.initEngine(); // Re-calc synergies
        }
      }
    },

    sellPackSetFromLibrary(packId: string) {
      const pack = availablePacks.find(p => p.id === packId);
      if (!pack) return;
      const cardsInPack = mockCards.filter(c => c.packId === packId);
      
      const hasAll = cardsInPack.every(c => this.library[c.id] && this.library[c.id] > 0);
      if (!hasAll) return;
      
      let totalValue = 0;
      for(const c of cardsInPack) {
        this.library[c.id]--;
        if (this.library[c.id] === 0) delete this.library[c.id];
        totalValue += engine.effectManager.getModifiedCardValue(c);
      }
      
      // 整套售出: 增加 50% 额外收益
      const bonusMultiplier = 1.5;
      this.updateCoins(Math.floor(totalValue * bonusMultiplier));
      this.initEngine();
    },

    restartGame() {
      const startCoins = 200 + (this.metaUpgrades["ms_start_funds"] || 0) * 150;
      this.coins = startCoins;
      this.totalEarned = startCoins;
      this.totalPullsThisRun = 0;
      this.currentSessionCards = [];
      this.library = {};
      this.upgrades = {};
      this.gameOver = false;
      this.initEngine();
    },
    
    // For App.vue specifically
    getEngine() {
      return engine;
    }
  }
});