<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useGameStore, saveGameState } from "./store/game";
import { availablePacks, mockCards, availableUpgrades, metaSkills } from "./utils/mockData";
import { Icon } from "@iconify/vue";
import type { PackConfig, Rarity } from "./types";

const store = useGameStore();
const showMetaTree = ref(false);

onMounted(() => {
  store.initEngine();
});

// 持久化保存
store.$subscribe((_mutation, state) => {
  saveGameState(state);
});

const unlockedPacks = computed(() => {
  return availablePacks.filter(p => p.unlockThreshold <= store.totalEarned);
});

const nextPack = computed(() => {
  return availablePacks.find(p => p.unlockThreshold > store.totalEarned);
});

const progressPercent = computed(() => {
  if (!nextPack.value) return 100;
  const currentIndex = availablePacks.indexOf(nextPack.value) - 1;
  const prevThreshold = currentIndex >= 0 ? availablePacks[currentIndex].unlockThreshold : 0;
  const currentDiff = store.totalEarned - prevThreshold;
  const targetDiff = nextPack.value.unlockThreshold - prevThreshold;
  return Math.min(100, Math.max(0, (currentDiff / targetDiff) * 100));
});

const selectedPack = ref<PackConfig | null>(unlockedPacks.value[0]);

// Watch logic to auto-select if previous becomes invalid
watch(unlockedPacks, (newVal) => {
  if (!selectedPack.value && newVal.length > 0) {
    selectedPack.value = newVal[0];
  } else if (selectedPack.value && !newVal.find(p => p.id === selectedPack.value!.id)) {
    selectedPack.value = newVal[0];
  }
}, { immediate: true });


const handleBuy = (count: number) => {
  if (selectedPack.value) {
    store.buyMultiple(selectedPack.value, count);
    mobileTab.value = 'desk';
  }
};

const handleSurrender = () => {
  store.surrender();
  mobileTab.value = 'desk';
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

// 按照包整理图鉴
const libraryByPack = computed(() => {
  return availablePacks.map(pack => {
    const totalInPack = mockCards.filter(c => c.packId === pack.id);
    const collected = totalInPack.filter(c => store.library[c.id] !== undefined);
    
    // Check if the full set is collected (at least 1 of each)
    const hasFullSet = totalInPack.every(c => store.library[c.id] && store.library[c.id] > 0);
    
    const synergiesStatus = (pack.synergies || []).map(syn => ({
      ...syn,
      stars: store.getSynergyStars(pack.id, syn.id)
    }));
    
    return {
      packId: pack.id,
      packName: pack.name,
      synergies: synergiesStatus,
      total: totalInPack.length,
      collected: collected,
      hasFullSet
    };
  });
});

const totalUniqueCollected = computed(() => Object.keys(store.library).length);


const getDisplayRates = (pack: PackConfig) => {
  const rates = store.getEngine().getRates(pack) || { N: 0, R: 0, SR: 0, SSR: 0 };
  const values = Object.values(rates).map(v => v || 0);
  let total = 0; for(let i=0; i<values.length; i++) total += Number(values[i]);
  const origRates = pack.rates || { N: 0, R: 0, SR: 0, SSR: 0 };
  const origValues = Object.values(origRates).map(v => v || 0);
  let origTotal = 0; for(let i=0; i<origValues.length; i++) origTotal += Number(origValues[i]);
  return Object.entries(rates).map(([r, rateVal]) => {
    const val = rateVal || 0;
    const origVal = origRates[r as Rarity] || 0;
    return {
      r,
      percent: total > 0 ? (val / total * 100) : 0,
      originalPercent: origTotal > 0 ? (origVal / origTotal * 100) : 0
    };
  });
};

const mobileTab = ref<'shop' | 'desk' | 'library'>('shop');

const selectedIndices = ref<Set<number>>(new Set());

const toggleSelect = (index: number) => {
  const newSet = new Set(selectedIndices.value);
  if (newSet.has(index)) {
    newSet.delete(index);
  } else {
    newSet.add(index);
  }
  selectedIndices.value = newSet;
};

const clearSelection = () => {
  selectedIndices.value = new Set();
};

const handleSellSelected = () => {
  store.sellSelected(Array.from(selectedIndices.value));
  clearSelection();
};

const handleCollectSelected = () => {
  store.collectSelected(Array.from(selectedIndices.value));
  clearSelection();
};

// Auto clear selection when new cards are pulled
watch(() => store.currentSessionCards.length, () => {
  clearSelection();
});
</script>

<template>
  <div class="fixed inset-0 w-full bg-slate-900 text-white flex flex-col md:flex-row overflow-hidden font-sans">
    
    <!-- 移动端顶部导航 -->
    <header class="md:hidden flex bg-slate-800 border-b border-slate-700 shrink-0 z-30 relative">
      <button class="flex-1 py-3 text-[13px] font-bold text-center border-b-2 transition" :class="mobileTab === 'shop' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-slate-400'" @click="mobileTab = 'shop'">卡包商店</button>
      <button class="flex-1 py-3 text-[13px] font-bold text-center border-b-2 transition relative" :class="mobileTab === 'desk' ? 'border-blue-400 text-blue-400' : 'border-transparent text-slate-400'" @click="mobileTab = 'desk'">
        开卡桌面
        <span v-if="store.currentSessionCards.length > 0" class="absolute top-2.5 right-[15%] w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
      </button>
      <button class="flex-1 py-3 text-[13px] font-bold text-center border-b-2 transition" :class="mobileTab === 'library' ? 'border-purple-400 text-purple-400 text-shadow-sm' : 'border-transparent text-slate-400'" @click="mobileTab = 'library'">图鉴与资产</button>
    </header>

    <div class="flex-1 flex flex-row overflow-hidden relative">
      <!-- 左侧面板：商店 -->
      <aside class="w-full md:w-1/4 lg:w-1/5 bg-slate-800 flex flex-col border-r border-slate-700 h-full absolute md:relative z-20 md:z-auto transition-transform duration-300" :class="mobileTab === 'shop' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'">
        <div class="p-3 md:p-4 border-b border-slate-600 flex justify-between items-center shrink-0">
          <h2 class="text-lg md:text-xl font-bold">卡包商店</h2>
          <button @click="handleSurrender" class="text-xs bg-red-900/80 hover:bg-red-800 text-red-200 px-3 py-1.5 rounded transition font-bold shadow">放弃重开</button>
        </div>
        
        <div class="flex-1 overflow-y-auto p-3 md:p-4 flex flex-col gap-3 md:gap-4 pb-20 md:pb-4">
        <!-- 卡包列表 -->
        <div 
          v-for="pack in unlockedPacks" 
          :key="pack.id"
          @click="selectedPack = pack"
          :class="['p-3 rounded-lg border-2 transition relative overflow-hidden', 
             (selectedPack?.id === pack.id ? 'bg-slate-700 ' + getPackBorderColor(pack.id) : 'border-transparent bg-slate-800 hover:bg-slate-700 cursor-pointer')]"
        >
          <!-- 星级角标 -->
          <div v-if="Math.max(...(pack.synergies || []).map(syn => store.getSynergyStars(pack.id, syn.id))) > 0" class="absolute top-0 right-0 bg-black/40 px-1 font-mono text-[10px] text-yellow-500 rounded-bl flex items-center gap-0.5 shadow-sm">
            <Icon v-for="s in Math.max(...(pack.synergies || []).map(syn => store.getSynergyStars(pack.id, syn.id)))" :key="s" icon="mdi:star" class="w-2.5 h-2.5 text-yellow-400 drop-shadow" />
          </div>

          <div class="font-bold text-[16px] md:text-lg">{{ pack.name }}</div>
          <div class="text-xs md:text-sm text-slate-400 mt-1">
             售价: <span class="text-yellow-400 font-bold">{{ store.getEngine().getPackPrice(pack) }} G</span>
             <span v-if="store.getEngine().getPackPrice(pack) !== pack.basePrice" class="line-through text-slate-500 ml-1 text-[10px]">{{ pack.basePrice }} G</span>
          </div>
          <div class="text-[10px] md:text-xs text-slate-400 mt-2 flex flex-wrap gap-x-2 gap-y-1 bg-slate-900/50 p-1.5 rounded">
            <span v-for="item in getDisplayRates(pack)" :key="item.r" class="flex items-center gap-0.5">
              <span :class="getRarityColor(item.r as string)">{{ item.r }}</span>:
              <span :class="item.percent > item.originalPercent ? 'text-green-400 font-bold' : ''">{{ item.percent.toFixed(1) }}%</span>
            </span>
          </div>
        </div>

        <div v-if="unlockedPacks.length === 0" class="text-slate-500 text-center py-4">无解锁卡包</div>

        <!-- 局内强化系统 -->
        <div class="mt-2 pt-4 border-t border-slate-600 relative">
          <h3 class="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
            <span class="bg-indigo-600 w-1.5 h-4 rounded-full"></span> 局内投资强化
          </h3>
          <div v-for="upg in availableUpgrades.filter(u => store.totalEarned >= (u.unlockThreshold || 0))" :key="upg.id" 
               @click="store.buyUpgrade(upg.id)"
               class="p-2.5 bg-slate-900 border border-slate-700 hover:border-indigo-500/50 rounded-lg cursor-pointer mb-2 transition shadow-inner relative group">
             <div class="flex justify-between items-center mb-1">
               <span class="font-bold text-indigo-300 text-sm">
                 {{ upg.name }} <span class="text-[10px] text-indigo-500 ml-1 bg-indigo-900/50 px-1 rounded">Lv.{{ store.upgrades[upg.id] || 0 }}/{{upg.maxLevel}}</span>
               </span>
               <span :class="store.coins >= Math.floor(upg.basePrice * Math.pow(upg.priceMultiplier, store.upgrades[upg.id] || 0)) ? 'text-yellow-400' : 'text-red-400 opacity-60'" class="font-bold text-sm">
                 {{ Math.floor(upg.basePrice * Math.pow(upg.priceMultiplier, store.upgrades[upg.id] || 0)) }} <span class="text-[10px]">G</span>
               </span>
             </div>
             <div class="text-[10px] text-slate-400 group-hover:text-slate-300 transition">{{ upg.desc(store.upgrades[upg.id] || 0) }}</div>
             
             <!-- 遮罩：已满级 -->
             <div v-if="(store.upgrades[upg.id] || 0) >= upg.maxLevel" class="absolute inset-0 bg-slate-900/80 flex items-center justify-center font-bold text-emerald-400 text-xs rounded-lg backdrop-blur-[1px]">
                已达到最大等级
             </div>
          </div>
        </div>

      </div>
    </aside>

      <!-- 中间面板：开卡区 -->
      <main class="w-full md:w-2/4 lg:w-3/5 flex flex-col relative flex-1 h-full absolute md:relative z-10 md:z-auto transition-opacity duration-300 bg-slate-900" :class="mobileTab === 'desk' ? 'opacity-100' : 'opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto'">
        
        <!-- 移动端顶部资金状态 -->
        <div class="md:hidden flex justify-between items-center p-3 border-b border-slate-800 bg-slate-900 shrink-0 shadow-sm z-10">
          <div class="flex flex-col">
            <span class="text-[10px] text-slate-400 font-bold">当前资金</span>
            <span class="text-lg text-yellow-400 font-extrabold">{{ store.coins }} <span class="text-xs">G</span></span>
          </div>
          <div class="flex flex-col items-end">
            <span class="text-[10px] text-slate-400 font-bold">全局狂热点</span>
            <span class="text-lg text-indigo-400 font-bold">{{ store.metaPoints }}</span>
          </div>
        </div>

      <!-- 卡牌展示区 -->
      <div class="flex-1 p-3 md:p-6 overflow-y-auto w-full pb-48 flex flex-col items-center" @click="clearSelection">
        <div v-if="store.isSoftLocked || store.gameOver" class="h-full flex flex-col items-center justify-center m-auto animate-[scale-in_0.3s_ease-out]">
          <div class="text-4xl md:text-6xl mb-2 md:mb-4 text-center font-black text-red-500">破产结算</div>
          <div class="text-lg md:text-xl text-slate-400 text-center mb-6 max-w-md">
            {{ store.isSoftLocked ? '资金彻底枯竭，无牌可卖。' : '您选择了急流勇退。' }}<br>
            您在本局游戏总共入账了 <span class="text-yellow-400 font-bold">{{ store.totalEarned }} G</span>。
          </div>
          <div class="bg-indigo-900/50 border border-indigo-500/50 p-4 rounded-xl text-center mb-6">
            <div class="text-indigo-200 text-sm mb-1">因总入账获得天赋点数</div>
            <div class="text-3xl text-indigo-400 font-bold">+{{ Math.floor(store.totalEarned / 50) }} 狂热点</div>
          </div>
          <button @click="store.restartGame(); showMetaTree = false" class="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 text-lg transition hover:scale-105 active:scale-95">
            开启新轮回
          </button>
        </div>
        
        <div v-else-if="store.currentSessionCards.length === 0" class="h-full flex flex-col items-center justify-center text-slate-500 text-sm md:text-lg m-auto text-center opacity-70">
          <Icon icon="mdi:cash-multiple" class="text-4xl mb-2 text-green-400 mx-auto" />
          抽到的卡牌将堆叠于此<br/>注意：集齐图鉴仅在本局内有效。<br/>(点击卡牌可进行多选)
        </div>

        <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-4 w-full content-start">
          <div 
            v-for="(card, i) in store.currentSessionCards" 
            :key="i"
            @click.stop="toggleSelect(i)"
            :class="['aspect-[2.2/3.2] md:aspect-[2.5/3.5] bg-slate-800 rounded-lg flex flex-col items-center justify-center border p-1 md:p-2 text-center shadow-lg transform transition animate-[scale-in_0.2s_ease-out] relative overflow-hidden cursor-pointer hover:scale-105', 
              card.rarity === 'SSR' ? 'shadow-[0_0_15px_rgba(250,204,21,0.5)]' : '',
              selectedIndices.has(i) ? 'ring-4 ring-blue-500 border-transparent scale-105 z-20' : (card.rarity === 'SSR' ? 'border-yellow-400' : 'border-slate-700')
            ]"
            :style="{ animationDelay: `${Math.min(i * 0.05, 1)}s` }"
          >
            <div v-if="card.rarity === 'SSR'" class="absolute inset-0 bg-gradient-to-tr from-yellow-500/20 to-transparent"></div>
            
            <div :class="['font-extrabold text-lg md:text-3xl z-10', getRarityColor(card.rarity)]">{{ card.rarity }}</div>
            <div class="text-[11px] md:text-sm font-bold mt-1 md:mt-2 px-1 text-slate-200 line-clamp-1 z-10">{{ card.name }}</div>
            <div class="text-[9px] md:text-xs text-green-400 mt-auto font-bold bg-slate-900/80 px-1 py-0.5 rounded w-full overflow-hidden text-ellipsis whitespace-nowrap z-10 border border-slate-700"><Icon icon="mdi:coin" class="inline-block text-yellow-400 -mt-0.5" /> {{ store.getEngine().effectManager.getModifiedCardValue(card) || card.baseValue }}</div>
            
            <div v-if="(store.library[card.id] || 0) > 0" class="absolute top-1 right-1 bg-slate-900/80 px-1 rounded text-[8px] md:text-[10px] text-slate-400 border border-slate-600">已集 x{{ store.library[card.id] }}</div>
            <div v-else class="absolute top-1 right-1 bg-red-600/90 px-1 rounded text-[8px] md:text-[10px] text-white border border-red-400 font-bold animate-pulse">NEW</div>
          </div>
        </div>
      </div>

      <!-- 底部常驻操作区 -->
      <div class="fixed md:absolute bottom-0 left-0 w-full bg-slate-800 border-t border-slate-700 flex flex-col shadow-[0_-15px_20px_-5px_rgba(0,0,0,0.4)] z-50 md:z-20">
        
        <!-- 卡牌操作窗 (有待处理卡牌时显示) -->
        <div v-if="store.hasPendingCards && !store.isSoftLocked && !store.gameOver" class="w-full p-2 md:p-3 bg-slate-800/95 flex justify-center border-b border-slate-700/50">
          
          <!-- 有选中卡牌时的控制台 -->
          <div v-if="selectedIndices.size > 0" class="flex w-full gap-2 justify-center max-w-2xl px-2 animate-[scale-in_0.2s_ease-out]">
              <button class="bg-indigo-600 hover:bg-indigo-500 px-2 md:px-6 py-2 md:py-3 rounded-lg font-bold shadow-md hover:shadow-lg active:scale-95 transition text-[12px] md:text-base flex flex-col items-center justify-center flex-1" @click="handleCollectSelected">
                <span>收藏选中 ({{selectedIndices.size}}张)</span>
              </button>
              <button class="bg-orange-600 hover:bg-orange-500 px-2 md:px-6 py-2 md:py-3 rounded-lg font-bold shadow-md hover:shadow-lg active:scale-95 transition text-[12px] md:text-base flex flex-col items-center justify-center flex-1" @click="handleSellSelected">
                <span>售卖选中 ({{selectedIndices.size}}张)</span>
              </button>
              <button class="bg-slate-600 hover:bg-slate-500 px-2 md:px-4 py-2 md:py-3 rounded-lg font-bold shadow-md hover:shadow-lg active:scale-95 transition text-[12px] md:text-base flex flex-col items-center justify-center" @click="clearSelection">
                <span>取消</span>
              </button>
          </div>

          <!-- 没有选中时的默认控制台 -->
          <div v-else class="flex w-full gap-2 justify-center max-w-2xl px-2 animate-[scale-in_0.2s_ease-out]">
              <button class="bg-red-600 hover:bg-red-500 px-2 md:px-6 py-2 md:py-3 rounded-lg font-bold shadow-md hover:shadow-lg active:scale-95 transition text-[12px] md:text-base flex flex-col items-center justify-center flex-1" @click="store.sellAllPending">
                <span>全部变现</span>
                <span class="text-red-200 text-[10px] md:text-xs font-normal">+{{ store.sellAllPendingValue }} G</span>
              </button>
              <button class="bg-blue-600 hover:bg-blue-500 px-2 md:px-6 py-2 md:py-3 rounded-lg font-bold shadow-md hover:shadow-lg active:scale-95 transition text-[12px] md:text-base flex flex-col items-center justify-center flex-1" @click="store.collectNewAndSellRest">
                <span>藏新卖旧</span>
                <span class="text-blue-200 text-[10px] md:text-xs font-normal">+{{ store.collectNewAndSellRestValue }} G</span>
              </button>
              <button class="bg-emerald-600 hover:bg-emerald-500 px-2 md:px-6 py-2 md:py-3 rounded-lg font-bold shadow-md hover:shadow-lg active:scale-95 transition text-[12px] md:text-base flex flex-col items-center justify-center flex-1" @click="store.collectAllPending">
                <span>收作手办</span>
                <span class="text-emerald-200 text-[10px] md:text-[9px] font-normal mt-0.5 leading-tight opacity-80">(+0 金币)</span>
              </button>
          </div>
        </div>

        <!-- 抽卡操作区 -->
        <div class="p-2 md:p-4 flex flex-wrap gap-2 md:gap-4 justify-center bg-slate-900 border-t md:border-t-0 border-slate-950" v-if="!store.isSoftLocked && !store.gameOver && selectedPack">
          <button 
            @click="handleBuy(1)"
            :disabled="store.coins < store.getEngine().getPackPrice(selectedPack)"
            :class="['text-sm md:text-lg font-bold py-2 md:py-3 px-4 md:px-6 rounded-xl shadow-lg transition transform flex-1 md:flex-none max-w-[200px]', 
                     store.coins < store.getEngine().getPackPrice(selectedPack) ? 'bg-slate-700 cursor-not-allowed text-slate-500 border border-slate-600' : 'bg-slate-700 hover:bg-slate-600 active:scale-95 text-white border border-slate-500']"
          >
            单抽
          </button>
          <button 
            @click="handleBuy(10)"
            :disabled="store.coins < store.getEngine().getPackPrice(selectedPack) * 10"
            :class="['text-sm md:text-xl font-bold py-2 md:py-3 px-4 md:px-8 rounded-xl shadow-lg transition transform flex-1 md:flex-none max-w-[250px]', 
                     store.coins < store.getEngine().getPackPrice(selectedPack) * 10 ? 'bg-slate-700 cursor-not-allowed text-slate-500 border border-slate-600' : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 hover:scale-105 active:scale-95 text-slate-900']"
          >
            十连抽 ({{ store.getEngine().getPackPrice(selectedPack) * 10 }}G)
          </button>
        </div>

      </div>

    </main>

      <!-- 右侧面板：状态与图鉴 -->
      <aside class="w-full md:w-1/4 lg:w-1/5 bg-slate-800 p-3 md:p-4 border-l border-slate-700 flex flex-col gap-3 md:gap-4 h-full overflow-y-auto absolute md:relative z-20 md:z-auto right-0 transition-transform duration-300" :class="mobileTab === 'library' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'">
        
        <!-- 数据面板 -->
      <div class="bg-slate-900 p-3 md:p-4 rounded-xl border border-slate-700 space-y-2 relative overflow-hidden shrink-0 shadow-inner">
        <div class="absolute right-0 top-0 bg-indigo-900/50 px-2 py-1 rounded-bl-lg border-b border-l border-indigo-700/50">
          <div class="text-[10px] text-indigo-300">全局狂热点</div>
          <div class="text-sm font-bold text-indigo-400 text-center">{{ store.metaPoints }}</div>
        </div>
        
        <div class="text-slate-400 text-xs md:text-sm font-medium">当前资金</div>
        <div class="text-3xl md:text-4xl text-yellow-400 font-extrabold tracking-tight flex items-baseline">{{ store.coins }} <span class="text-sm md:text-lg ml-1 font-normal text-yellow-600">G</span></div>
        
        <div class="h-px w-full bg-slate-700/50 my-2"></div>
        
        <!-- 进度条区域 -->
        <div class="text-slate-300 text-[10px] md:text-xs">
          累计所有入账: <span class="font-bold text-sm text-green-400">{{ store.totalEarned }} G</span>
        </div>
        
        <div v-if="nextPack" class="mt-2 group">
          <div class="flex justify-between text-[10px] text-slate-500 mb-1">
             <span>下一卡包解锁</span>
             <span>距 {{ nextPack.unlockThreshold }} 还有 {{ nextPack.unlockThreshold - store.totalEarned }}G</span>
          </div>
          <div class="w-full bg-slate-800 rounded-full h-2 md:h-2.5 outline outline-1 outline-slate-600 overflow-hidden relative">
             <div class="bg-gradient-to-r from-emerald-600 to-green-400 h-full rounded-full transition-all duration-500" :style="{ width: progressPercent + '%' }"></div>
             <!-- 辉光 -->
             <div class="absolute inset-0 bg-white/20 w-1/4 skew-x-[-20deg] animate-[shimmer_3s_infinite] -translate-x-full"></div>
          </div>
        </div>
        <div v-else class="text-xs text-yellow-400 font-bold mt-2 text-center p-1 bg-yellow-400/10 rounded border border-yellow-400/20">
           <Icon icon="mdi:star" class="inline-block text-yellow-400 -mt-0.5" /> 已解锁全部卡包
        </div>
      </div>

      <!-- 图鉴概要 -->
      <div class="bg-slate-900 rounded-xl border border-slate-700 flex-1 flex flex-col overflow-hidden">
        <div class="flex justify-between items-center border-b border-slate-700 p-3 bg-slate-800/50 shrink-0">
          <h3 class="font-bold text-base text-slate-200">图鉴羁绊升星</h3>
          <span class="bg-blue-600/20 text-blue-400 text-[10px] md:text-xs px-2 py-1 rounded-full font-bold border border-blue-500/30">种类: {{ totalUniqueCollected }} / {{ mockCards?.length || 0 }}</span>
        </div>
        
        <div class="flex-1 overflow-y-auto p-3 space-y-5">
          <div v-for="lib in libraryByPack" :key="lib.packName" class="space-y-1 relative group/pack">
            
            <div class="flex justify-between items-center text-xs">
              <span :class="lib.synergies.some(s => s.stars > 0) ? 'text-yellow-400 font-bold' : 'text-slate-300 font-semibold'">{{ lib.packName }}</span>
              
              <div class="flex gap-2 items-center">
                <button v-if="lib.hasFullSet" @click="store.sellPackSetFromLibrary(lib.packId)" class="bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-500 border border-yellow-500/50 px-1.5 py-0.5 rounded text-[10px] transform transition active:scale-95 whitespace-nowrap">
                  整套售出(+50%)
                </button>
              </div>
            </div>
            
            <div v-for="syn in lib.synergies" :key="syn.id" class="text-[10px] bg-slate-800 p-1.5 rounded border border-slate-700 mb-1.5 relative overflow-hidden group">
               <div class="flex justify-between items-center border-b border-slate-700/50 pb-0.5 mb-0.5">
                 <span class="text-slate-400 font-bold">{{ syn.conditionDesc }}</span>
                 <span v-if="syn.stars > 0" class="flex gap-0.5">
                    <Icon v-for="s in syn.stars" :key="s" icon="mdi:star" class="w-3 h-3 text-yellow-400" />
                 </span>
               </div>
               <div v-if="syn.stars > 0" class="flex items-center mt-1 text-[11px]" v-html="syn.getHtml(syn.stars)"></div>
               <div v-else class="text-slate-500 italic mt-1 blur-[2px] transition hover:blur-none select-none">未激活: [羁绊效果隐藏]</div>
            </div>

            <div class="flex flex-wrap gap-x-1 gap-y-1.5 mt-1">
              <template v-if="lib.collected.length > 0">
                <div v-for="card in lib.collected" :key="card.id" 
                      @click="store.sellFromLibrary(card.id)"
                      class="px-1.5 py-0.5 border-b-2 rounded text-[10px] text-slate-300 flex items-center gap-1 shadow-sm transition cursor-pointer hover:bg-red-900/40 hover:border-red-500/50 group/card relative" 
                      :class="[
                        store.library[card.id] > 0 ? getPackBorderColor(lib.packId) : 'border-slate-700 opacity-50',
                        card.rarity === 'N' ? 'bg-slate-800' : card.rarity === 'R' ? 'bg-blue-900/30' : card.rarity === 'SR' ? 'bg-purple-900/30 font-bold' : 'bg-yellow-900/30 font-bold text-yellow-100'
                      ]">
                  <span class="group-hover/card:line-through" :class="getRarityColor(card.rarity)">{{ card.name }}</span>
                  <span class="bg-slate-700/80 text-[9px] px-1 rounded-sm border border-slate-600/50 font-mono text-white opacity-90 font-bold group-hover/card:text-red-400 group-hover/card:border-red-500/50">x{{ store.library[card.id] || 0 }}</span>
                  
                  <!-- Tooltip -->
                  <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/card:block bg-black/90 text-green-400 text-[10px] px-2 py-1 rounded whitespace-nowrap z-50 pointer-events-none">
                    单价: {{ store.getEngine().effectManager.getModifiedCardValue(card) }} G
                  </div>
                </div>
              </template>
              <div v-else class="text-[10px] text-slate-600 bg-slate-800/30 px-2 py-1 rounded outline-dashed outline-1 outline-slate-700 w-full text-center">暂未搜集到任何卡牌</div>
            </div>
          </div>
        </div>
      </div>

    </aside>
    </div>
  </div>

    <!-- Meta Skill Tree Modal -->
    <div v-if="showMetaTree && (store.isSoftLocked || store.gameOver)" class="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]">
      <div class="bg-slate-900 border border-indigo-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl shadow-indigo-900/20">
        <div class="p-4 md:p-6 border-b border-white/5 flex justify-between items-center bg-indigo-900/20">
          <h2 class="text-xl md:text-2xl font-bold text-indigo-400 flex items-center gap-2">
            <Icon icon="mdi:tree-outline" class="text-2xl" />轮回天赋树
          </h2>
          <div class="flex items-center gap-4">
            <div class="text-lg text-indigo-200">
              剩余狂热点: <span class="font-bold text-indigo-400 text-xl">{{ store.metaPoints }}</span>
            </div>
            <button @click="showMetaTree = false" class="text-slate-400 hover:text-white p-2">
              <Icon icon="mdi:close" class="text-2xl" />
            </button>
          </div>
        </div>
        
        <div class="p-4 md:p-6 overflow-y-auto flex-1 bg-slate-900/50">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="skill in metaSkills" :key="skill.id" 
                 class="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-indigo-500/50 transition flex flex-col">
              <div class="flex justify-between items-start mb-2">
                <h3 class="font-bold text-indigo-300 text-lg">{{ skill.name }}</h3>
                <div class="text-xs font-mono bg-indigo-900/50 px-2 py-1 rounded text-indigo-300 border border-indigo-500/30">
                  Lv.{{ store.metaUpgrades[skill.id] || 0 }} / {{ skill.maxLevel }}
                </div>
              </div>
              
              <div class="text-sm text-slate-300 mb-4 flex-1">
                <div class="text-xs text-slate-500 mb-1">当前: {{ (store.metaUpgrades[skill.id] || 0) === 0 ? '无效果' : skill.desc(store.metaUpgrades[skill.id] || 0) }}</div>
                <div>下级: <span class="text-indigo-300">{{ skill.desc((store.metaUpgrades[skill.id] || 0) + 1) }}</span></div>
              </div>
              
              <button 
                @click="store.buyMetaUpgrade(skill.id)"
                :disabled="(store.metaUpgrades[skill.id] || 0) >= skill.maxLevel || store.metaPoints < store.getMetaUpgradeCost(skill.id)"
                class="w-full py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
                :class="(store.metaUpgrades[skill.id] || 0) >= skill.maxLevel ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700/50' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/50'"
              >
                <div v-if="(store.metaUpgrades[skill.id] || 0) >= skill.maxLevel">
                  <Icon icon="mdi:check-circle" class="text-lg" /> 已满级
                </div>
                <div v-else class="flex items-center gap-1">
                  <Icon icon="mdi:arrow-up-bold" class="text-lg" />
                  升级 (-{{ store.getMetaUpgradeCost(skill.id) }}点)
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
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

@keyframes shimmer {
  100% {
    transform: translateX(400%);
  }
}
.animate-\[shimmer_3s_infinite\] {
  animation: shimmer 3s infinite;
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