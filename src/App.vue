<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useGameStore } from "./store/game";
import { availablePacks, mockCards } from "./utils/mockData";
import type { PackConfig } from "./types";

const store = useGameStore();

onMounted(() => {
  store.initEngine();
});

const selectedPack = ref<PackConfig>(availablePacks[0]);

const handleBuy = (count: number) => {
  store.buyMultiple(selectedPack.value, count);
};

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case "N": return "text-slate-400";
    case "R": return "text-blue-400";
    case "SR": return "text-purple-500 font-bold";
    case "SSR": return "text-yellow-400 font-extrabold animate-pulse";
    default: return "text-white";
  }
};

const getPackBorderColor = (packId: string) => {
  if (packId === "pack_pity") return "border-blue-400";
  if (packId === "pack_fire") return "border-red-500";
  if (packId === "pack_ocean") return "border-cyan-400";
  return "border-emerald-500";
};

// Organize library by packs
const libraryByPack = computed(() => {
  return availablePacks.map(pack => {
    const totalInPack = mockCards.filter(c => c.packId === pack.id);
    const collected = totalInPack.filter(c => store.library.includes(c.id));
    return {
      packName: pack.name,
      total: totalInPack.length,
      collected: collected,
      isComplete: collected.length === totalInPack.length
    };
  });
});
</script>

<template>
  <div class="h-screen w-full bg-slate-900 text-white flex flex-col md:flex-row overflow-hidden font-sans">
    
    <!-- 左侧面板：商店 -->
    <aside class="w-full md:w-1/4 lg:w-1/5 bg-slate-800 flex flex-col border-b md:border-b-0 md:border-r border-slate-700 shrink-0 md:shrink h-[30vh] md:h-full">
      <div class="p-3 md:p-4 border-b border-slate-600 flex justify-between items-center shrink-0">
        <h2 class="text-lg md:text-xl font-bold">卡包商店</h2>
        <button @click="store.restartGame()" class="text-xs bg-red-900/80 hover:bg-red-800 text-red-200 px-3 py-1.5 rounded transition font-bold shadow">放弃重开</button>
      </div>
      
      <div class="flex-1 overflow-y-auto p-3 md:p-4 flex flex-col gap-3 md:gap-4">
        <div 
          v-for="pack in availablePacks" 
          :key="pack.id"
          @click="store.maxCoinsThisRun >= pack.unlockThreshold ? (selectedPack = pack) : null"
          :class="['p-3 rounded-lg border-2 transition relative overflow-hidden', 
             store.maxCoinsThisRun < pack.unlockThreshold ? 'border-slate-700 bg-slate-800/50 cursor-not-allowed opacity-60' : 
             (selectedPack.id === pack.id ? 'bg-slate-700 ' + getPackBorderColor(pack.id) : 'border-transparent bg-slate-800 hover:bg-slate-700 cursor-pointer')]"
        >
          <div v-if="store.maxCoinsThisRun < pack.unlockThreshold" class="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-[1px] z-10">
            <span class="text-red-400 font-bold text-sm bg-slate-900 px-2 py-1 rounded">赚取 {{ pack.unlockThreshold }}G 解锁</span>
          </div>
          
          <div class="font-bold text-[16px] md:text-lg">{{ pack.name }}</div>
          <div class="text-xs md:text-sm text-slate-400 mt-1">售价: <span class="text-yellow-400 font-bold">{{ pack.basePrice }} G</span></div>
          <div class="text-[10px] md:text-xs text-slate-500 mt-2 grid grid-cols-4 gap-1">
            <span v-for="(rate, r) in pack.rates" :key="r">{{ r }}: {{ rate }}%</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- 中间面板：开卡区 -->
    <main class="w-full md:w-2/4 lg:w-3/5 flex flex-col relative flex-1">
      
      <!-- 顶部操作栏 -->
      <div class="p-3 md:p-6 flex flex-wrap gap-2 md:gap-4 justify-center border-b border-slate-800 bg-slate-900 shrink-0">
        <template v-if="!store.isSoftLocked && !store.gameOver">
          <!-- 单抽与十连 -->
          <button 
            @click="handleBuy(1)"
            :disabled="store.hasPendingCards || store.coins < selectedPack.basePrice"
            :class="['text-sm md:text-lg font-bold py-2 md:py-3 px-4 md:px-6 rounded-xl shadow-lg transition transform flex-1 md:flex-none max-w-[200px]', 
                     store.hasPendingCards || store.coins < selectedPack.basePrice ? 'bg-slate-600 cursor-not-allowed opacity-50' : 'bg-slate-700 hover:bg-slate-600 active:scale-95 text-white border border-slate-500']"
          >
            单抽 ({{ selectedPack.basePrice }} G)
          </button>
          <button 
            @click="handleBuy(10)"
            :disabled="store.hasPendingCards || store.coins < selectedPack.basePrice * 10"
            :class="['text-sm md:text-xl font-bold py-2 md:py-3 px-4 md:px-8 rounded-xl shadow-lg transition transform flex-1 md:flex-none max-w-[250px]', 
                     store.hasPendingCards || store.coins < selectedPack.basePrice * 10 ? 'bg-slate-600 cursor-not-allowed opacity-50' : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 hover:scale-105 active:scale-95 text-slate-900']"
          >
            十连抽 ({{ selectedPack.basePrice * 10 }} G)
          </button>
        </template>
      </div>

      <!-- 卡牌展示区 -->
      <div class="flex-1 p-3 md:p-6 overflow-y-auto w-full pb-32 md:pb-24 flex flex-col items-center">
        <div v-if="store.isSoftLocked || store.gameOver" class="h-full flex flex-col items-center justify-center m-auto animate-[scale-in_0.3s_ease-out]">
          <div class="text-4xl md:text-6xl mb-2 md:mb-4 text-center font-black text-red-500">破产结算</div>
          <div class="text-lg md:text-xl text-slate-400 text-center mb-6 max-w-md">
            资金枯竭，无法购买任何卡包。<br>
            您在本局游戏最高赚取了 <span class="text-yellow-400 font-bold">{{ store.maxCoinsThisRun }} G</span>。
          </div>
          <div class="bg-indigo-900/50 border border-indigo-500/50 p-4 rounded-xl text-center mb-6">
            <div class="text-indigo-200 text-sm mb-1">获得天赋点数</div>
            <div class="text-3xl text-indigo-400 font-bold">+{{ Math.floor(store.maxCoinsThisRun / 50) }} 狂热点</div>
          </div>
          <button @click="store.restartGame()" class="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 text-lg transition hover:scale-105 active:scale-95">
            开启新轮回
          </button>
        </div>
        
        <div v-else-if="store.currentSessionCards.length === 0" class="h-full flex flex-col items-center justify-center text-slate-500 text-sm md:text-lg m-auto text-center opacity-70">
          <div class="text-2xl mb-2">💸</div>
          赚取金币解锁更高级的卡包<br/>集齐图鉴触发强力羁绊
        </div>

        <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 md:gap-4 w-full md:max-w-[800px]">
          <div 
            v-for="(card, i) in store.currentSessionCards" 
            :key="i"
            :class="['aspect-[2.2/3.2] md:aspect-[2.5/3.5] bg-slate-800 rounded-lg flex flex-col items-center justify-center border p-1 md:p-2 text-center shadow-lg transform transition animate-[scale-in_0.2s_ease-out] relative overflow-hidden', 
              card.rarity === 'SSR' ? 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'border-slate-700'
            ]"
            :style="{ animationDelay: `${i * 0.05}s` }"
          >
            <div v-if="card.rarity === 'SSR'" class="absolute inset-0 bg-gradient-to-tr from-yellow-500/20 to-transparent"></div>
            
            <div :class="['font-extrabold text-lg md:text-3xl z-10', getRarityColor(card.rarity)]">{{ card.rarity }}</div>
            <div class="text-[11px] md:text-sm font-bold mt-1 md:mt-2 px-1 text-slate-200 line-clamp-1 z-10">{{ card.name }}</div>
            <div class="text-[10px] md:text-xs text-green-400 mt-auto font-bold bg-slate-900/80 px-1 md:px-2 py-0.5 md:py-1 rounded w-full whitespace-nowrap z-10 border border-slate-700">售: {{ store.engine?.effectManager.getModifiedCardValue(card) || card.baseValue }} G</div>
            
            <div v-if="store.library.includes(card.id)" class="absolute top-1 right-1 bg-slate-900/80 px-1 rounded text-[8px] md:text-[10px] text-slate-400 border border-slate-600">已集</div>
            <div v-else class="absolute top-1 right-1 bg-red-600/90 px-1 rounded text-[8px] md:text-[10px] text-white border border-red-400 font-bold animate-pulse">NEW</div>
          </div>
        </div>
      </div>

      <!-- 底部操作悬浮窗 -->
      <div class="absolute bottom-0 left-0 w-full p-2 md:p-4 bg-slate-800 border-t border-slate-700 flex flex-wrap gap-2 md:gap-4 justify-center shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.3)] transition-all duration-300 z-20" :class="store.hasPendingCards && !store.isSoftLocked && !store.gameOver ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'">
        <button class="bg-red-600 hover:bg-red-500 px-2 md:px-6 py-2 md:py-3 rounded-lg font-bold shadow-md hover:shadow-lg active:scale-95 transition text-[12px] md:text-base flex flex-col items-center justify-center flex-1 md:flex-none" @click="store.sellAllPending">
          <span>全部卖出</span>
          <span class="text-red-200 text-[10px] md:text-xs font-normal">+{{ store.sellAllPendingValue }} G</span>
        </button>
        <button class="bg-blue-600 hover:bg-blue-500 px-2 md:px-6 py-2 md:py-3 rounded-lg font-bold shadow-md hover:shadow-lg active:scale-95 transition text-[12px] md:text-base flex flex-col items-center justify-center flex-1 md:flex-none" @click="store.collectNewAndSellRest">
          <span>藏新卖旧</span>
          <span class="text-blue-200 text-[10px] md:text-xs font-normal">+{{ store.collectNewAndSellRestValue }} G</span>
        </button>
        <button class="bg-emerald-600 hover:bg-emerald-500 px-2 md:px-6 py-2 md:py-3 rounded-lg font-bold shadow-md hover:shadow-lg active:scale-95 transition text-[12px] md:text-base flex flex-col items-center justify-center w-full md:w-auto" @click="store.collectAllPending">
          <span>全部收藏</span>
          <span class="text-emerald-200 text-[10px] md:text-xs font-normal">+0 G (填补图鉴)</span>
        </button>
      </div>

    </main>

    <!-- 右侧面板：状态与图鉴 -->
    <aside class="w-full md:w-1/4 lg:w-1/5 bg-slate-800 p-3 md:p-4 border-t md:border-t-0 md:border-l border-slate-700 flex flex-col gap-3 md:gap-4 overflow-y-auto shrink-0 md:shrink h-[50vh] md:h-full">
      
      <!-- 数据面板 -->
      <div class="bg-slate-900 p-3 md:p-4 rounded-xl border border-slate-700 space-y-2 relative overflow-hidden shrink-0 shadow-inner">
        <div class="absolute right-0 top-0 bg-indigo-900/50 px-2 py-1 rounded-bl-lg border-b border-l border-indigo-700/50">
          <div class="text-[10px] text-indigo-300">狂热点数</div>
          <div class="text-sm font-bold text-indigo-400 text-center">{{ store.metaPoints }}</div>
        </div>
        
        <div class="text-slate-400 text-xs md:text-sm font-medium">当前资金</div>
        <div class="text-3xl md:text-4xl text-yellow-400 font-extrabold tracking-tight flex items-baseline">{{ store.coins }} <span class="text-sm md:text-lg ml-1 font-normal text-yellow-600">G</span></div>
        
        <div class="h-px w-full bg-slate-700/50 my-2"></div>
        
        <div class="text-slate-500 text-[10px] md:text-xs font-medium">本局最高赚取 (用于解锁)</div>
        <div class="text-lg md:text-xl text-slate-300 font-bold tracking-tight">{{ store.maxCoinsThisRun }} <span class="text-xs font-normal text-slate-500">G</span></div>
      </div>

      <!-- 图鉴概要 (分割) -->
      <div class="bg-slate-900 rounded-xl border border-slate-700 flex-1 flex flex-col overflow-hidden">
        <div class="flex justify-between items-center border-b border-slate-700 p-3 bg-slate-800/50 shrink-0">
          <h3 class="font-bold text-base text-slate-200">羁绊图鉴</h3>
          <span class="bg-blue-600/20 text-blue-400 text-[10px] md:text-xs px-2 py-1 rounded-full font-bold border border-blue-500/30">{{ store.library.length }} / {{ mockCards?.length || 0 }}</span>
        </div>
        
        <div class="flex-1 overflow-y-auto p-3 space-y-4">
          <div v-for="lib in libraryByPack" :key="lib.packName" class="space-y-2">
            <div class="flex justify-between items-center text-xs">
              <span :class="lib.isComplete ? 'text-emerald-400 font-bold' : 'text-slate-400 font-semibold'">{{ lib.packName }}</span>
              <span :class="lib.isComplete ? 'text-emerald-400' : 'text-slate-500'">[{{ lib.collected.length }}/{{ lib.total }}]</span>
            </div>
            <div class="flex flex-wrap gap-1">
              <template v-if="lib.collected.length > 0">
                <span v-for="card in lib.collected" :key="card.id" class="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-[10px] text-slate-300">
                  {{ card.name }}
                </span>
                <div v-if="lib.isComplete" class="w-full text-emerald-400/80 text-[10px] italic mt-0.5 border-l-2 border-emerald-500 pl-1">
                  ✓ 羁绊已激活
                </div>
              </template>
              <div v-else class="text-[10px] text-slate-600 italic">未收集</div>
            </div>
          </div>
        </div>
      </div>

    </aside>
  </div>
</template>

<style>
@keyframes scale-in {
  from {
    transform: scale(0.6);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
.animate-\[scale-in_0\.2s_ease-out\] {
  animation: scale-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

/* 隐藏滚动条但保留滚动功能 */
aside::-webkit-scrollbar, main::-webkit-scrollbar, div::-webkit-scrollbar {
  width: 4px;
}
aside::-webkit-scrollbar-track, main::-webkit-scrollbar-track, div::-webkit-scrollbar-track {
  background: transparent;
}
aside::-webkit-scrollbar-thumb, main::-webkit-scrollbar-thumb, div::-webkit-scrollbar-thumb {
  background-color: #334155;
  border-radius: 4px;
}
</style>
