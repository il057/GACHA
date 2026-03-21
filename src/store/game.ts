import { defineStore } from 'pinia';
import { GachaEngine } from '../engine/GachaEngine';
import { mockCards } from '../utils/mockData';
import type { Card, PackConfig } from '../types';

interface StoreState {
  coins: number;
  maxCoinsThisRun: number; // Used for unlocking packs
  totalPullsThisRun: number;
  library: string[]; // Persistent
  metaPoints: number; // Persistent Knowledge/Meta Points
  currentSessionCards: Card[];
  gameOver: boolean;
}

const engine = new GachaEngine();

// Load persistent data
const loadPersistent = () => {
  try {
    const lib = localStorage.getItem('gacha_library');
    const mp = localStorage.getItem('gacha_metaPoints');
    return {
      library: lib ? JSON.parse(lib) : [],
      metaPoints: mp ? parseInt(mp, 10) : 0
    };
  } catch (e) {
    return { library: [], metaPoints: 0 };
  }
};

const savePersistent = (library: string[], metaPoints: number) => {
  localStorage.setItem('gacha_library', JSON.stringify(library));
  localStorage.setItem('gacha_metaPoints', metaPoints.toString());
};

export const useGameStore = defineStore('game', {
  state: (): StoreState => {
    const p = loadPersistent();
    return {
      coins: 10, // Start with 10G
      maxCoinsThisRun: 10,
      totalPullsThisRun: 0,
      library: p.library,
      metaPoints: p.metaPoints,
      currentSessionCards: [],
      gameOver: false,
    };
  },
  
  getters: {
    // If coins drop below 1 and no cards to sell -> game over
    isSoftLocked: (state) => {
      return state.coins < 1 && state.currentSessionCards.length === 0;
    },

    sellAllPendingValue: (state) => {
      return state.currentSessionCards.reduce((sum, c) => sum + engine.effectManager.getModifiedCardValue(c), 0);
    },

    collectNewAndSellRestValue: (state) => {
      let val = 0;
      const tempLib = new Set(state.library);
      for (const c of state.currentSessionCards) {
        if (!tempLib.has(c.id)) {
          tempLib.add(c.id);
        } else {
          val += engine.effectManager.getModifiedCardValue(c);
        }
      }
      return val;
    }
  },

  actions: {
    initEngine() {
      // Re-evaluate bonds based on persistent library
      engine.effectManager = new GachaEngine().effectManager; // reset
      
      const pityCards = mockCards.filter(c => c.packId === 'pack_pity');
      const oceanFishes = mockCards.filter(c => c.packId === 'pack_ocean' && c.tags?.includes('fish'));

      // 羁绊1: 乞丐保底包集齐所有N和R卡 -> 幸运值+5% (其实就是所有R卡的概率权重提升)
      const pityRRarity = pityCards.filter(c => c.rarity === 'R').map(c => c.id);
      if (pityRRarity.every(id => this.library.includes(id))) {
        engine.effectManager.addModifier({
          id: 'bond_pity_r',
          type: 'rate',
          apply: ({ pack, rates }) => {
            if (pack.id === 'pack_pity') {
              return { ...rates, R: rates.R * 1.5, SR: rates.SR * 1.2 };
            }
            return rates;
          }
        });
      }

      // 羁绊2: 海洋包所有鱼类 -> 每抽退款 2G
      if (oceanFishes.length > 0 && oceanFishes.every(c => this.library.includes(c.id))) {
        engine.effectManager.addModifier({
          id: 'bond_ocean_fish',
          type: 'refund',
          apply: () => 2
        });
      }
    },

    updateCoins(amt: number) {
      this.coins += amt;
      if (this.coins > this.maxCoinsThisRun) {
        this.maxCoinsThisRun = this.coins;
      }
      this.checkGameOver();
    },

    checkGameOver() {
      if (this.coins < 1 && this.currentSessionCards.length === 0) {
        this.gameOver = true;
        // 游戏失败进行大循环结算：每赚取过100金币，获得1点Meta点数
        const gainedPoints = Math.floor(this.maxCoinsThisRun / 50);
        if (gainedPoints > 0) {
          this.metaPoints += gainedPoints;
          savePersistent(this.library, this.metaPoints);
        }
      }
    },

    buyMultiple(pack: PackConfig, count: number) {
      if (this.gameOver) return;
      
      const price = engine.getPackPrice(pack) * count;
      if (this.coins >= price) {
        //扣除本金
        this.updateCoins(-price);
        
        // 发放退款（来自羁绊）
        const refund = engine.getRefundAmount() * count;
        if (refund > 0) {
          this.updateCoins(refund);
        }

        const results = engine.drawMultiple(pack, count);
        this.currentSessionCards.push(...results);
        this.totalPullsThisRun += count;
      }
    },

    sellAllPending() {
      let earned = this.sellAllPendingValue;
      this.updateCoins(earned);
      this.clearPending();
    },

    collectAllPending() {
      let newlyCollected = false;
      for (const card of this.currentSessionCards) {
        if (!this.library.includes(card.id)) {
          this.library.push(card.id);
          newlyCollected = true;
        }
      }
      if (newlyCollected) {
        savePersistent(this.library, this.metaPoints);
        this.initEngine(); // 重新触发羁绊检测
      }
      this.clearPending();
      this.checkGameOver();
    },

    collectNewAndSellRest() {
      let earned = 0;
      let newlyCollected = false;
      for (const card of this.currentSessionCards) {
        if (!this.library.includes(card.id)) {
          this.library.push(card.id);
          newlyCollected = true;
        } else {
          earned += engine.effectManager.getModifiedCardValue(card);
        }
      }
      
      if (newlyCollected) {
        savePersistent(this.library, this.metaPoints);
        this.initEngine();
      }
      
      this.updateCoins(earned);
      this.clearPending();
    },

    clearPending() {
      this.currentSessionCards = [];
    },

    restartGame() {
      this.coins = 10;
      this.maxCoinsThisRun = 10;
      this.totalPullsThisRun = 0;
      this.currentSessionCards = [];
      this.gameOver = false;
      this.initEngine();
    }
  }
});
