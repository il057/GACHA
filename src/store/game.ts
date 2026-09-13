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
    const defaultStart = 100;
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
      const baseVal = state.currentSessionCards.reduce((sum, c) => sum + engine.effectManager.getModifiedCardValue(c), 0);
      const overclockLvl = state.upgrades['upgrade_overclock'] || 0;
      const overclockBonus = overclockLvl > 0 ? (overclockLvl * 0.05) : 0;
      const recycleLvl = state.metaUpgrades['ms_recycle'] || 0;
      const recycleBonus = recycleLvl > 0 ? (recycleLvl * 0.04) : 0;
      return Math.floor(baseVal * (1 + overclockBonus + recycleBonus));
    },

    collectNewAndSellRestValue: (state) => {
      let val = 0;
      const tempLib = { ...state.library };
      const overclockLvl = state.upgrades['upgrade_overclock'] || 0;
      const overclockBonus = overclockLvl > 0 ? (overclockLvl * 0.05) : 0;
      const recycleLvl = state.metaUpgrades['ms_recycle'] || 0;
      const recycleBonus = recycleLvl > 0 ? (recycleLvl * 0.04) : 0;

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
      return Math.floor(val * (1 + overclockBonus + recycleBonus));
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

      // 局外天赋：共鸣大师 (ms_synergy_master) 强化倍率
      const msSynLvl = this.metaUpgrades['ms_synergy_master'] || 0;
      const synMultiplier = 1 + (msSynLvl * 0.08);
      
      // ============================================
      // 1. 乞丐保底包羁绊
      // ============================================
      // 1.1 全图鉴 [麻雀变凤凰]：绝对概率加成 (Additive Bonus)
      const pityStars = this.getSynergyStars('pack_pity', 'pity_all');
      if (pityStars > 0) {
        engine.effectManager.addModifier({
          id: 'bond_pity', 
          type: 'rate',
          apply: ({ rates, pack }) => {
            if (pack?.id !== 'pack_pity') return rates;
            const addSR = Number((pityStars * 1.0 * synMultiplier).toFixed(1));
            const addSSR = Number((pityStars * 0.3 * synMultiplier).toFixed(1));
            // 扣除 N 权重，加算至 SR 与 SSR 绝对权重
            const newN = Math.max(10, rates.N - (addSR + addSSR));
            return {
              ...rates,
              N: newN,
              SR: rates.SR + addSR,
              SSR: rates.SSR + addSSR
            };
          }
        });
      }

      // 1.2 工具收藏
      const pityTools = this.getSynergyStars('pack_pity', 'pity_tools');
      if (pityTools > 0) {
        engine.effectManager.addModifier({
          id: 'bond_pity_tools', 
          type: 'value',
          apply: ({ value, card }) => (card && card.packId === 'pack_pity' && card.tags?.includes('tool'))
            ? value + Math.floor(pityTools * 0.4 * synMultiplier)
            : value
        });
      }

      // 1.3 顽石共鸣 (修复：只针对保底包石头卡)
      const pityStone = this.getSynergyStars('pack_pity', 'pity_stone');
      if (pityStone > 0) {
        engine.effectManager.addModifier({
          id: 'bond_pity_stone', 
          type: 'value',
          apply: ({ value, card }) => (card && card.packId === 'pack_pity' && card.tags?.includes('stone'))
            ? value + Math.floor(pityStone * 0.6 * synMultiplier)
            : value
        });
      }

      // ============================================
      // 2. 神秘森林包羁绊
      // ============================================
      const forestStars = this.getSynergyStars('pack_forest', 'forest_all');
      if (forestStars > 0) {
        engine.effectManager.addModifier({
          id: 'bond_forest', 
          type: 'value',
          apply: ({ value }) => Math.floor(value * (1 + forestStars * 0.12 * synMultiplier))
        });
      }

      const forestPlants = this.getSynergyStars('pack_forest', 'forest_plants');
      if (forestPlants > 0) {
        engine.effectManager.addModifier({
          id: 'bond_forest_plants', 
          type: 'value',
          apply: ({ value, card }) => (card && card.packId === 'pack_forest' && card.tags?.includes('plant'))
            ? value + Math.round(forestPlants * 4 * synMultiplier)
            : value
        });
      }

      const forestFood = this.getSynergyStars('pack_forest', 'forest_food');
      if (forestFood > 0) {
        engine.effectManager.addModifier({
          id: 'bond_forest_food', 
          type: 'price',
          apply: ({ price, pack }) => pack?.id === 'pack_forest' 
            ? Math.max(1, price - Math.round(forestFood * 2 * synMultiplier)) 
            : price
        });
      }

      // ============================================
      // 3. 深邃海洋包羁绊
      // ============================================
      const oceanStars = this.getSynergyStars('pack_ocean', 'ocean_all');
      if (oceanStars > 0) {
        engine.effectManager.addModifier({
          id: 'bond_ocean', 
          type: 'refund',
          apply: ({ refund, pack }) => refund + Math.floor((pack?.basePrice || 120) * (oceanStars * 0.05 * synMultiplier))
        });
      }

      const oceanFishStars = this.getSynergyStars('pack_ocean', 'ocean_fish');
      if (oceanFishStars > 0) {
        engine.effectManager.addModifier({
          id: 'bond_ocean_fish', 
          type: 'value',
          apply: ({ value, card }) => (card && card.packId === 'pack_ocean' && card.tags?.includes('fish'))
            ? value + Math.round(oceanFishStars * 10 * synMultiplier)
            : value
        });
      }

      // ============================================
      // 4. 灼热烈焰包羁绊
      // ============================================
      const fireStars = this.getSynergyStars('pack_fire', 'fire_all');
      if (fireStars > 0) {
        engine.effectManager.addModifier({
          id: 'bond_fire', 
          type: 'price',
          apply: ({ price, pack }) => pack?.id === 'pack_fire' 
            ? Math.max(1, Math.floor(price * (1 - fireStars * 0.10 * synMultiplier))) 
            : price
        });
      }

      // 4.2 余烬共鸣 (修复：只针对烈焰包 cinder 标签，彻底杜绝污染保底包石头！)
      const fireStone = this.getSynergyStars('pack_fire', 'fire_stone');
      if (fireStone > 0) {
        engine.effectManager.addModifier({
          id: 'bond_fire_cinder', 
          type: 'value',
          apply: ({ value, card }) => (card && card.packId === 'pack_fire' && card.tags?.includes('cinder'))
            ? value + Math.round(fireStone * 15 * synMultiplier)
            : value
        });
      }

      // ============================================
      // 5. 蒸汽机械包羁绊
      // ============================================
      const machinaGear = this.getSynergyStars('pack_machina', 'machina_gear');
      if (machinaGear > 0) {
        engine.effectManager.addModifier({
          id: 'bond_machina_gear', 
          type: 'value',
          apply: ({ value, card }) => (card && card.packId === 'pack_machina' && card.tags?.includes('gear'))
            ? value + Math.round(machinaGear * 40 * synMultiplier)
            : value
        });
      }

      // ============================================
      // 6. 虚空星界包羁绊
      // ============================================
      const astralStars = this.getSynergyStars('pack_astral', 'astral_all');
      if (astralStars > 0) {
        engine.effectManager.addModifier({
          id: 'bond_astral_all', 
          type: 'value',
          apply: ({ value, card }) => (card && card.rarity === 'SSR')
            ? Math.floor(value * (1 + astralStars * 0.25 * synMultiplier))
            : value
        });
      }

      const astralVoid = this.getSynergyStars('pack_astral', 'astral_void');
      if (astralVoid > 0) {
        engine.effectManager.addModifier({
          id: 'bond_astral_void', 
          type: 'value',
          apply: ({ value, card }) => (card && card.packId === 'pack_astral')
            ? value + Math.round(astralVoid * 150 * synMultiplier)
            : value
        });
      }

      // ============================================
      // 7. 结算局内升级节点 (In-Run Boosts)
      // ============================================
      const luckLvl = this.upgrades['upgrade_luck'] || 0;
      if (luckLvl > 0) {
        engine.effectManager.addModifier({
          id: 'upg_luck', 
          type: 'rate',
          apply: ({ rates }) => {
            const multi = 1 + (luckLvl * 0.12); 
            return { ...rates, SR: rates.SR * multi, SSR: rates.SSR * multi };
          }
        });
      }

      const valueLvl = this.upgrades['upgrade_value'] || 0;
      if (valueLvl > 0) {
        engine.effectManager.addModifier({
          id: 'upg_value', 
          type: 'value',
          apply: ({ value }) => Math.floor(value * (1 + valueLvl * 0.08))
        });
      }
      
      const refundPctLvl = this.upgrades['upgrade_refund_pct'] || 0;
      if (refundPctLvl > 0) {
        engine.effectManager.addModifier({
          id: 'upg_refund_pct', 
          type: 'refund',
          apply: ({ refund, pack }) => refund + Math.floor((pack?.basePrice || 10) * (refundPctLvl * 0.02))
        });
      }
      
      const refundLvl = this.upgrades['upgrade_refund'] || 0;
      if (refundLvl > 0) {
        engine.effectManager.addModifier({
          id: 'upg_refund', 
          type: 'refund',
          apply: ({ refund }) => refund + refundLvl
        });
      }

      const discountLvl = this.upgrades['upgrade_discount'] || 0;
      if (discountLvl > 0) {
        engine.effectManager.addModifier({
          id: 'upg_discount', 
          type: 'price',
          apply: ({ price }) => Math.max(1, Math.floor(price * (1 - discountLvl * 0.02)))
        });
      }

      // ============================================
      // 8. 结算轮回天赋 (Multiverse Meta Skills)
      // ============================================
      const msLuckLvl = this.metaUpgrades['ms_luck'] || 0;
      if (msLuckLvl > 0) {
        engine.effectManager.addModifier({
          id: 'meta_luck', 
          type: 'rate',
          apply: ({ rates }) => {
            const multi = 1 + (msLuckLvl * 0.03);
            return { ...rates, SR: rates.SR * multi, SSR: rates.SSR * multi };
          }
        });
      }

      const msValueLvl = this.metaUpgrades['ms_value'] || 0;
      if (msValueLvl > 0) {
        engine.effectManager.addModifier({
          id: 'meta_value', 
          type: 'value',
          apply: ({ value }) => Math.floor(value * (1 + msValueLvl * 0.10))
        });
      }

      const msDiscountLvl = this.metaUpgrades['ms_discount'] || 0;
      if (msDiscountLvl > 0) {
        engine.effectManager.addModifier({
          id: 'meta_discount', 
          type: 'price',
          apply: ({ price }) => Math.max(1, Math.floor(price * (1 - msDiscountLvl * 0.03)))
        });
      }

      this.checkGameOver();
    },

    getUpgradePrice(configId: string): number {
      const config = availableUpgrades.find(u => u.id === configId);
      if (!config) return 999999;
      const currentLevel = this.upgrades[config.id] || 0;
      let price = Math.floor(config.basePrice * Math.pow(config.priceMultiplier, currentLevel));
      
      // 机械包全图鉴折扣：工业革命 (每星-6%)
      const machinaStars = this.getSynergyStars('pack_machina', 'machina_all');
      if (machinaStars > 0) {
        const discount = machinaStars * 0.06;
        price = Math.max(1, Math.floor(price * (1 - discount)));
      }
      return price;
    },

    buyUpgrade(configId: string) {
      const config = availableUpgrades.find(u => u.id === configId);
      if (!config) return;

      const currentLevel = this.upgrades[config.id] || 0;
      if (currentLevel >= config.maxLevel) return;
      
      const price = this.getUpgradePrice(configId);
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
        let results = engine.drawMultiple(pack, count);

        // 连抽风暴 (upgrade_barrage)：十连抽额外赠送卡牌
        if (count >= 10) {
          const barrageLvl = this.upgrades['upgrade_barrage'] || 0;
          if (barrageLvl > 0) {
            const bonusCards = engine.drawMultiple(pack, barrageLvl);
            results.push(...bonusCards);
          }
        }

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
      this.checkGameOver();
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
      const overclockLvl = this.upgrades['upgrade_overclock'] || 0;
      const overclockBonus = overclockLvl > 0 ? (overclockLvl * 0.05) : 0;
      const recycleLvl = this.metaUpgrades['ms_recycle'] || 0;
      const recycleBonus = recycleLvl > 0 ? (recycleLvl * 0.04) : 0;
      
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
      this.updateCoins(Math.floor(earned * (1 + overclockBonus + recycleBonus)));
      this.checkGameOver();
    },

    sellSelected(indices: number[]) {
      const sortedIndices = [...indices].sort((a, b) => b - a);
      let earned = 0;
      const overclockLvl = this.upgrades['upgrade_overclock'] || 0;
      const overclockBonus = overclockLvl > 0 ? (overclockLvl * 0.05) : 0;
      const recycleLvl = this.metaUpgrades['ms_recycle'] || 0;
      const recycleBonus = recycleLvl > 0 ? (recycleLvl * 0.04) : 0;

      for (const index of sortedIndices) {
        const card = this.currentSessionCards[index];
        if (card) {
          earned += engine.effectManager.getModifiedCardValue(card);
          this.currentSessionCards.splice(index, 1);
        }
      }
      this.updateCoins(Math.floor(earned * (1 + overclockBonus + recycleBonus)));
      this.checkGameOver();
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
          this.initEngine();
        }
        this.checkGameOver();
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
      
      // 整套售出: 基础增加 50% 额外收益 + 变现超频加成
      const overclockLvl = this.upgrades['upgrade_overclock'] || 0;
      const bonusMultiplier = 1.5 + (overclockLvl * 0.05);
      this.updateCoins(Math.floor(totalValue * bonusMultiplier));
      this.initEngine();
      this.checkGameOver();
    },

    restartGame() {
      // 若处于软锁且尚未结算，先自动完成结算
      if (this.isSoftLocked && !this.gameOver) {
        this.surrender();
      }

      // 遗产继承：每级 +15G（满级 100 + 150 = 250G）
      const startBonus = (this.metaUpgrades["ms_start_funds"] || 0) * 15;
      const startCoins = 100 + startBonus;
      this.coins = startCoins;
      this.totalEarned = startCoins;
      this.totalPullsThisRun = 0;
      this.currentSessionCards = [];
      this.library = {};
      this.upgrades = {};
      this.gameOver = false;
      this.initEngine();
    },
    
    getEngine() {
      return engine;
    }
  }
});