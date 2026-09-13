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

watch(unlockedPacks, (newVal) => {
  if (!selectedPack.value && newVal.length > 0) {
    selectedPack.value = newVal[0];
  } else if (selectedPack.value && !newVal.find(p => p.id === selectedPack.value!.id)) {
    selectedPack.value = newVal[0];
  }
}, { immediate: true });

// 动态漫画拟声词爆发动画系统 (Comic SFX Popups)
interface ComicSfx {
  id: number;
  text: string;
  subText?: string;
  color: 'yellow' | 'red' | 'blue' | 'purple';
  x: number;
  y: number;
}
const activeSfxList = ref<ComicSfx[]>([]);
let sfxCounter = 0;

const triggerSfx = (text: string, color: 'yellow' | 'red' | 'blue' | 'purple' = 'yellow', subText?: string) => {
  const id = ++sfxCounter;
  const x = Math.floor(Math.random() * 60) - 30;
  const y = Math.floor(Math.random() * 30) - 15;
  activeSfxList.value.push({ id, text, subText, color, x, y });
  setTimeout(() => {
    activeSfxList.value = activeSfxList.value.filter(s => s.id !== id);
  }, 950);
};

const handleBuy = (count: number) => {
  if (!selectedPack.value) return;
  const packPrice = store.getEngine().getPackPrice(selectedPack.value) * count;
  if (store.coins < packPrice) return;

  if (count >= 10) {
    triggerSfx('KABOOM!', 'red', '十连连打 • 10x BARRAGE!');
  } else {
    triggerSfx('POW!', 'yellow', '英雄召唤 • HERO DRAW!');
  }

  store.buyMultiple(selectedPack.value, count);
  mobileTab.value = 'desk';

  const hasSsr = store.currentSessionCards.some(c => c.rarity === 'SSR');
  if (hasSsr) {
    setTimeout(() => {
      triggerSfx('JACKPOT!!', 'red', '★ 宇宙神级降临 ★');
    }, 300);
  }
};

const handleSurrender = () => {
  triggerSfx('CRASH...', 'purple', '急流勇退 • SURRENDER!');
  store.surrender();
  mobileTab.value = 'desk';
};

const getRarityBadgeStyle = (rarity: string) => {
  switch (rarity) {
    case "N": 
      return "bg-slate-700 text-white border-black";
    case "R": 
      return "bg-[#1E90FF] text-yellow-300 border-black";
    case "SR": 
      return "bg-[#9333EA] text-yellow-300 border-black shadow-[2px_2px_0px_#000]";
    case "SSR": 
      return "bg-[#E23636] text-[#FFD700] border-black shadow-[3px_3px_0px_#000] animate-bounce";
    default: 
      return "bg-slate-700 text-white border-black";
  }
};

const getPackBorderColor = (packId: string) => {
  if (packId === "pack_pity") return "border-[#1E90FF] ring-2 ring-[#1E90FF]";
  if (packId === "pack_fire") return "border-[#E23636] ring-2 ring-[#E23636]";
  if (packId === "pack_ocean") return "border-[#00D084] ring-2 ring-[#00D084]";
  return "border-[#FFD700] ring-2 ring-[#FFD700]";
};

// 按照包整理图鉴
const libraryByPack = computed(() => {
  return availablePacks.map(pack => {
    const totalInPack = mockCards.filter(c => c.packId === pack.id);
    const collected = totalInPack.filter(c => store.library[c.id] !== undefined);
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

// 多样化美漫内置贴画与装饰图章系统 (Multi-shape internal comic stickers & stamps)
interface ComicStickerItem {
  id: string;
  shape: 'badge' | 'circle' | 'star' | 'square' | 'diamond';
  text?: string;
  sub?: string;
  icon?: string;
  posClass: string;
  badgeClass: string;
  rotClass: string;
}

const getCardStickers = (index: number, cardId: string = ''): ComicStickerItem[] => {
  const configs: ComicStickerItem[][] = [
    // 方案 0: 红色大号主锁定横幅 (下右) + 金色大号五角星爆 (上左) + 白色战术编号戳 (下左)
    [
      {
        id: 'main-0',
        shape: 'badge',
        text: 'LOCKED!',
        sub: '战备锁定',
        icon: 'mdi:lock',
        posClass: 'bottom-7.5 right-0.5',
        badgeClass: 'bg-[#E23636] text-[#FFD700] border-2 border-black',
        rotClass: 'rotate-[-6deg]'
      },
      {
        id: 'star-0',
        shape: 'star',
        text: 'TOP',
        posClass: 'top-6 left-1',
        badgeClass: 'text-[#FFD700]',
        rotClass: 'rotate-[16deg]'
      },
      {
        id: 'square-0',
        shape: 'square',
        text: '№ 1',
        posClass: 'bottom-7.5 left-1',
        badgeClass: 'bg-white text-black',
        rotClass: 'rotate-[-10deg]'
      }
    ],
    // 方案 1: 黄色高亮目标横幅 (上右) + 蓝色复古双圈 OK 验讫章 (下左) + 绿色闪耀星 (下右)
    [
      {
        id: 'main-1',
        shape: 'badge',
        text: 'TARGET',
        sub: '重点目标',
        icon: 'mdi:crosshairs-gps',
        posClass: 'top-6.5 right-0.5',
        badgeClass: 'bg-[#FFD700] text-black border-2 border-black',
        rotClass: 'rotate-[-8deg]'
      },
      {
        id: 'circle-1',
        shape: 'circle',
        icon: 'mdi:check-bold',
        text: 'OK!',
        sub: 'PASSED',
        posClass: 'bottom-7.5 left-1',
        badgeClass: 'bg-[#1E90FF] text-white',
        rotClass: 'rotate-[14deg]'
      },
      {
        id: 'star-1',
        shape: 'star',
        text: '★',
        posClass: 'bottom-7.5 right-1',
        badgeClass: 'text-[#00D084]',
        rotClass: 'rotate-[18deg]'
      }
    ],
    // 方案 2: 红色大号 HOT 橡胶印章 (中右) + 蓝色英雄特选长标 (下左) + 金色星徽菱形 (上左)
    [
      {
        id: 'circle-2',
        shape: 'circle',
        text: 'HOT!',
        sub: 'CHOICE',
        icon: 'mdi:fire',
        posClass: 'top-1/2 right-0.5 -translate-y-1/2',
        badgeClass: 'bg-[#E23636] text-white',
        rotClass: 'rotate-[-15deg]'
      },
      {
        id: 'main-2',
        shape: 'badge',
        text: 'HERO PICK',
        sub: '特选',
        icon: 'mdi:check-decagram',
        posClass: 'bottom-7.5 left-0.5',
        badgeClass: 'bg-[#1E90FF] text-white border-2 border-black',
        rotClass: 'rotate-[5deg]'
      },
      {
        id: 'diamond-2',
        shape: 'diamond',
        icon: 'mdi:star',
        posClass: 'top-6 left-1',
        badgeClass: 'bg-[#FFD700] text-black',
        rotClass: 'rotate-45'
      }
    ],
    // 方案 3: 绝密黑金长签 (中左) + 橙色爆炸星 (上右) + 绿色通行圆印 (下右)
    [
      {
        id: 'main-3',
        shape: 'badge',
        text: 'CLASSIFIED',
        sub: '机密档案',
        icon: 'mdi:shield-alert',
        posClass: 'top-1/2 left-0.5 -translate-y-1/2',
        badgeClass: 'bg-black text-[#FFD700] border-2 border-[#FFD700]',
        rotClass: 'rotate-[14deg]'
      },
      {
        id: 'star-3',
        shape: 'star',
        text: 'POW!',
        posClass: 'top-6 right-1',
        badgeClass: 'text-[#FF4500]',
        rotClass: 'rotate-[-12deg]'
      },
      {
        id: 'circle-3',
        shape: 'circle',
        text: 'SEAL',
        sub: 'PASS',
        posClass: 'bottom-7.5 right-1',
        badgeClass: 'bg-[#00D084] text-black',
        rotClass: 'rotate-[8deg]'
      }
    ],
    // 方案 4: 金色 100% 满额星 (下左) + 紫色一级调度横幅 (下右) + 黄色 YES! 认证戳 (上左)
    [
      {
        id: 'star-4',
        shape: 'star',
        text: '100%',
        posClass: 'bottom-7.5 left-1',
        badgeClass: 'text-[#FFD700]',
        rotClass: 'rotate-[-12deg]'
      },
      {
        id: 'main-4',
        shape: 'badge',
        text: 'PRIORITY',
        sub: '优先整编',
        icon: 'mdi:star-shooting',
        posClass: 'bottom-7.5 right-0.5',
        badgeClass: 'bg-[#9333EA] text-yellow-300 border-2 border-black',
        rotClass: 'rotate-[6deg]'
      },
      {
        id: 'circle-4',
        shape: 'circle',
        text: 'YES!',
        sub: 'CONFIRMED',
        posClass: 'top-6 left-1',
        badgeClass: 'bg-[#FFD700] text-black',
        rotClass: 'rotate-[-8deg]'
      }
    ],
    // 方案 5: 战术绿底待命标 (上左) + 蓝色双圈 PASS 戳 (下右) + 黄色 EXP 强化正方章 (中右)
    [
      {
        id: 'main-5',
        shape: 'badge',
        text: 'RESERVE',
        sub: '战略待命',
        icon: 'mdi:bookmark-check',
        posClass: 'top-6.5 left-0.5',
        badgeClass: 'bg-[#00D084] text-black border-2 border-black',
        rotClass: 'rotate-[-5deg]'
      },
      {
        id: 'circle-5',
        shape: 'circle',
        text: 'PASS',
        sub: 'VERIFIED',
        posClass: 'bottom-7.5 right-1',
        badgeClass: 'bg-[#1E90FF] text-white',
        rotClass: 'rotate-[16deg]'
      },
      {
        id: 'square-5',
        shape: 'square',
        text: 'EXP+',
        icon: 'mdi:lightning-bolt',
        posClass: 'top-1/2 right-1 -translate-y-1/2',
        badgeClass: 'bg-[#FFD700] text-black',
        rotClass: 'rotate-[-8deg]'
      }
    ],
    // 方案 6: 蓝色大号验讫双圈印章 (上左) + 霓虹青战术条带 (下右) + 金色小闪星 (中右)
    [
      {
        id: 'circle-6',
        shape: 'circle',
        text: 'VERIFIED',
        sub: 'S-RANK',
        icon: 'mdi:shield-check',
        posClass: 'top-6 left-1',
        badgeClass: 'bg-[#1E90FF] text-white',
        rotClass: 'rotate-[-10deg]'
      },
      {
        id: 'main-6',
        shape: 'badge',
        text: 'TACTICAL',
        sub: '特遣调度',
        icon: 'mdi:radar',
        posClass: 'bottom-7.5 right-0.5',
        badgeClass: 'bg-[#00F0FF] text-black border-2 border-black',
        rotClass: 'rotate-[-6deg]'
      },
      {
        id: 'star-6',
        shape: 'star',
        text: '★',
        posClass: 'top-1/2 right-1 -translate-y-1/2',
        badgeClass: 'text-[#FFD700]',
        rotClass: 'rotate-[20deg]'
      }
    ],
    // 方案 7: 红色绝密警示胶带 (中右) + 黑色 CODE 7 正方章 (上右) + 烈火菱形勋章 (下左)
    [
      {
        id: 'main-7',
        shape: 'badge',
        text: 'TOP SECRET',
        sub: '最高密级',
        icon: 'mdi:alert-decagram',
        posClass: 'top-1/2 right-0.5 -translate-y-1/2',
        badgeClass: 'bg-[#DC2626] text-yellow-300 border-2 border-black',
        rotClass: 'rotate-[-12deg]'
      },
      {
        id: 'square-7',
        shape: 'square',
        text: 'SEC-7',
        icon: 'mdi:barcode',
        posClass: 'top-6 right-1',
        badgeClass: 'bg-black text-[#FFD700]',
        rotClass: 'rotate-[10deg]'
      },
      {
        id: 'diamond-7',
        shape: 'diamond',
        icon: 'mdi:fire',
        posClass: 'bottom-7.5 left-1',
        badgeClass: 'bg-[#FF4500] text-white',
        rotClass: 'rotate-45'
      }
    ],
    // 方案 8: 金色大号 HOT 星标 (上右) + 红色锁定长标 (下左) + 绿色 APPROVED 印章 (中左)
    [
      {
        id: 'star-8',
        shape: 'star',
        text: 'HOT!',
        posClass: 'top-6.5 right-1',
        badgeClass: 'text-[#FFD700]',
        rotClass: 'rotate-[15deg]'
      },
      {
        id: 'main-8',
        shape: 'badge',
        text: 'LOCKED',
        sub: '自留装备',
        icon: 'mdi:lock-check',
        posClass: 'bottom-7.5 left-0.5',
        badgeClass: 'bg-[#E23636] text-[#FFD700] border-2 border-black',
        rotClass: 'rotate-[4deg]'
      },
      {
        id: 'circle-8',
        shape: 'circle',
        text: 'APPROVED',
        sub: 'HQ',
        posClass: 'top-1/2 left-1 -translate-y-1/2',
        badgeClass: 'bg-[#00D084] text-black',
        rotClass: 'rotate-[-14deg]'
      }
    ],
    // 方案 9: 琥珀金 MINE 锁定标 (上右) + 玫瑰红 A+ 评级章 (上左) + 绿色 MAX 满额星 (下右)
    [
      {
        id: 'main-9',
        shape: 'badge',
        text: 'MINE!',
        sub: '本尊专属',
        icon: 'mdi:hand-back-right',
        posClass: 'top-6.5 right-0.5',
        badgeClass: 'bg-amber-400 text-black border-2 border-black',
        rotClass: 'rotate-[-10deg]'
      },
      {
        id: 'circle-9',
        shape: 'circle',
        text: 'A+',
        sub: 'RANK',
        posClass: 'top-6 left-1',
        badgeClass: 'bg-rose-500 text-white',
        rotClass: 'rotate-[12deg]'
      },
      {
        id: 'star-9',
        shape: 'star',
        text: 'MAX',
        posClass: 'bottom-7.5 right-1',
        badgeClass: 'text-[#00D084]',
        rotClass: 'rotate-[-15deg]'
      }
    ],
    // 方案 10: 烈焰橙 DO NOT SELL 禁售封条 (下左) + 金色闪亮星标 (上左) + 蓝色核验圆戳 (下右)
    [
      {
        id: 'main-10',
        shape: 'badge',
        text: 'DO NOT SELL',
        sub: '非卖品',
        icon: 'mdi:alert-octagon',
        posClass: 'bottom-7.5 left-0.5',
        badgeClass: 'bg-[#FF4500] text-white border-2 border-black',
        rotClass: 'rotate-[-7deg]'
      },
      {
        id: 'star-10',
        shape: 'star',
        text: '★',
        posClass: 'top-6 left-1',
        badgeClass: 'text-[#FFD700]',
        rotClass: 'rotate-[-15deg]'
      },
      {
        id: 'circle-10',
        shape: 'circle',
        text: 'OK',
        sub: 'CHECKED',
        posClass: 'bottom-7.5 right-1',
        badgeClass: 'bg-[#1E90FF] text-white',
        rotClass: 'rotate-[12deg]'
      }
    ],
    // 方案 11: 紫色天命认证戳 (下左) + 蓝色英雄特选横幅 (中右) + 金色编号正方章 (上左)
    [
      {
        id: 'circle-11',
        shape: 'circle',
        text: 'CHOSEN',
        sub: 'DESTINY',
        icon: 'mdi:creation',
        posClass: 'bottom-7.5 left-1',
        badgeClass: 'bg-[#9333EA] text-white',
        rotClass: 'rotate-[10deg]'
      },
      {
        id: 'main-11',
        shape: 'badge',
        text: 'HERO PICK',
        sub: '优先配置',
        icon: 'mdi:crown',
        posClass: 'top-1/2 right-0.5 -translate-y-1/2',
        badgeClass: 'bg-[#1E90FF] text-white border-2 border-black',
        rotClass: 'rotate-[-8deg]'
      },
      {
        id: 'square-11',
        shape: 'square',
        text: '№ 9',
        posClass: 'top-6 left-1',
        badgeClass: 'bg-yellow-300 text-black',
        rotClass: 'rotate-[6deg]'
      }
    ]
  ];
  const cardHash = (cardId || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return configs[(index + cardHash) % configs.length];
};

const handleSellSelected = () => {
  triggerSfx('KA-CHING!', 'yellow', `变现出货 • 售出 ${selectedIndices.value.size} 张!`);
  store.sellSelected(Array.from(selectedIndices.value));
  clearSelection();
};

const handleCollectSelected = () => {
  triggerSfx('ARCHIVED!', 'blue', `入库封存 • 收藏 ${selectedIndices.value.size} 张!`);
  store.collectSelected(Array.from(selectedIndices.value));
  clearSelection();
};

const handleSellAll = () => {
  triggerSfx('KA-CHING!!', 'yellow', `军饷入账 +${store.sellAllPendingValue} G!`);
  store.sellAllPending();
};

const handleCollectNew = () => {
  triggerSfx('TACTICAL!', 'blue', '战术整编 • 藏新卖旧');
  store.collectNewAndSellRest();
};

const handleCollectAll = () => {
  triggerSfx('SAVED!', 'purple', '全收手办 • 载入英雄密档');
  store.collectAllPending();
};

watch(() => store.currentSessionCards.length, () => {
  clearSelection();
});
</script>

<template>
  <div class="fixed inset-0 w-full bg-[#181818] text-[#111111] flex flex-col overflow-hidden font-body select-none">
    
    <!-- SFX 动态拟声词动画悬浮层 (独立置顶 z-[100]，文字层彻底脱离 clip-path 裁切) -->
    <div class="fixed inset-0 pointer-events-none z-[100] overflow-hidden flex items-center justify-center">
      <transition-group name="sfx">
        <div 
          v-for="sfx in activeSfxList" 
          :key="sfx.id"
          class="absolute animate-sfx-pop flex items-center justify-center pointer-events-none"
          :style="{ transform: `translate(${sfx.x}px, ${sfx.y}px)` }"
        >
          <div class="relative flex items-center justify-center min-w-[280px] min-h-[220px]">
            <!-- 爆炸星形底衬 (纯背景，绝不包含文字，不裁切内部内容) -->
            <div 
              class="absolute w-52 h-52 md:w-72 md:h-72 comic-starburst transform -rotate-6 shadow-[0_8px_0_#000]"
              :class="[
                sfx.color === 'yellow' ? 'bg-[#FFD700]' : '',
                sfx.color === 'red' ? 'bg-[#E23636]' : '',
                sfx.color === 'blue' ? 'bg-[#1E90FF]' : '',
                sfx.color === 'purple' ? 'bg-[#9333EA]' : '',
              ]"
            ></div>
            
            <!-- 叠加一层深色描边对比星形，增强漫画感 -->
            <div 
              class="absolute w-44 h-44 md:w-60 md:h-60 comic-starburst bg-black/20 transform rotate-12"
            ></div>

            <!-- 文字层 (完全独立于星形之上，z-20，字形饱满清晰) -->
            <div class="relative z-20 text-center transform -rotate-3 px-4 py-2 pointer-events-none">
              <div class="font-title text-4xl md:text-6xl text-white comic-text-shadow tracking-wider leading-none filter drop-shadow-[0_4px_0_#000]">
                {{ sfx.text }}
              </div>
              <div v-if="sfx.subText" class="font-title text-xs md:text-sm text-[#FFD700] comic-text-shadow mt-1.5 tracking-widest bg-black/90 border-2 border-black px-3 py-0.5 rounded shadow-[2px_2px_0_#000] inline-block">
                {{ sfx.subText }}
              </div>
            </div>
          </div>
        </div>
      </transition-group>
    </div>

    <!-- 顶部经典美漫报头 (Vintage Comic Masthead) -->
    <header class="bg-[#FFFEF0] border-b-4 border-black px-3 py-2 shrink-0 z-30 shadow-[0_4px_0_#000] flex items-center justify-between gap-2 md:gap-4 relative overflow-hidden">
      <!-- 报头背景微妙 Ben-Day 半色调 -->
      <div class="absolute inset-0 bg-halftone-paper opacity-70 pointer-events-none"></div>

      <!-- 左侧：经典美漫刊号与标题 -->
      <div class="flex items-center gap-2 md:gap-3 z-10">
        <div class="bg-[#E23636] text-[#FFD700] border-2 border-black px-2 py-1 transform -rotate-2 shadow-[2px_2px_0_#000] shrink-0 text-center">
          <div class="font-title text-[10px] leading-tight text-white tracking-widest">AUG #1</div>
          <div class="font-title text-lg md:text-xl leading-none">12¢</div>
        </div>

        <div>
          <div class="flex items-center gap-1.5">
            <span class="font-title text-xl md:text-3xl tracking-wider text-[#E23636] comic-text-shadow uppercase leading-none">
              AMAZING GACHA TALES!
            </span>
            <span class="hidden sm:inline-block bg-[#FFD700] text-black font-title text-[11px] px-2 py-0.5 border-2 border-black transform rotate-2 shadow-[1px_1px_0_#000]">
              创刊特辑 #1
            </span>
          </div>
          <div class="text-[11px] md:text-xs font-bold text-slate-800 tracking-wide flex items-center gap-1.5 mt-0.5">
            <span class="bg-black text-[#FFD700] px-1.5 py-0.2 rounded-xs font-title text-[10px]">ULTIMATE GACHA</span>
            <span class="text-red-600 font-black">•</span>
            <span class="text-slate-900 font-bold">超级英雄 • 觉醒召唤模拟器</span>
          </div>
        </div>
      </div>

      <!-- 中间：清晰易读的美漫特刊正版认证标签 (不再有微缩模糊文字) -->
      <div class="hidden md:flex items-center gap-2 border-3 border-black px-3 py-1 bg-[#FFF9C4] shadow-[3px_3px_0_#000] transform -rotate-1 z-10">
        <Icon icon="mdi:certificate" class="text-xl text-[#E23636]" />
        <div class="flex flex-col text-left leading-tight">
          <div class="font-title text-[13px] text-black tracking-wide flex items-center gap-1">
            <span>COMICS CODE</span>
            <span class="bg-[#E23636] text-white text-[9px] px-1 font-bold">APPROVED</span>
          </div>
          <div class="text-[10px] text-slate-700 font-bold">特刊正版认证 • 连环画管理局监制</div>
        </div>
      </div>

      <!-- 右侧：战资状态与狂热点 -->
      <div class="flex items-center gap-2 md:gap-3 z-10">
        <!-- 资金金币栏 -->
        <div class="comic-caption-box px-3 py-1.5 flex items-center gap-2 transform -rotate-1">
          <Icon icon="mdi:cash-multiple" class="text-2xl text-red-600" />
          <div class="flex flex-col leading-tight">
            <span class="text-[10px] font-black text-slate-800 uppercase tracking-tight">HERO VAULT / 当前军饷</span>
            <span class="font-title text-xl md:text-2xl text-red-700 comic-text-shadow leading-none">
              {{ store.coins }} <span class="text-xs text-black">G</span>
            </span>
          </div>
        </div>

        <!-- 全局狂热点入口 -->
        <button 
          @click="showMetaTree = true"
          class="comic-btn bg-[#1E90FF] hover:bg-blue-400 text-[#FFD700] px-3 py-1.5 text-xs md:text-sm flex items-center gap-1.5 transform rotate-1 cursor-pointer"
          title="点击进入量子平行宇宙天赋网络"
        >
          <Icon icon="mdi:atom-variant" class="text-lg animate-spin" style="animation-duration: 6s;" />
          <div class="flex flex-col text-left leading-none">
            <span class="text-[9px] text-white font-title">MULTIVERSE</span>
            <span class="font-title text-sm md:text-base leading-none">{{ store.metaPoints }} 点</span>
          </div>
        </button>
      </div>
    </header>

    <!-- 移动端分格切换条 -->
    <nav class="md:hidden flex bg-[#FFFEF0] border-b-3 border-black shrink-0 z-20 font-title text-base">
      <button 
        class="flex-1 py-2 text-center transition border-r-2 border-black flex items-center justify-center gap-1"
        :class="mobileTab === 'shop' ? 'bg-[#FFD700] text-black font-black' : 'bg-[#FFFEF0] text-slate-700'" 
        @click="mobileTab = 'shop'"
      >
        <Icon icon="mdi:shopping" class="text-lg" />
        PANEL 1: 补给站
      </button>

      <button 
        class="flex-1 py-2 text-center transition border-r-2 border-black flex items-center justify-center gap-1 relative"
        :class="mobileTab === 'desk' ? 'bg-[#1E90FF] text-white font-black' : 'bg-[#FFFEF0] text-slate-700'" 
        @click="mobileTab = 'desk'"
      >
        <Icon icon="mdi:cards-playing-outline" class="text-lg" />
        PANEL 2: 战场桌面
        <span v-if="store.currentSessionCards.length > 0" class="absolute top-2 right-2 w-2.5 h-2.5 bg-[#E23636] border border-black rounded-full animate-ping"></span>
      </button>

      <button 
        class="flex-1 py-2 text-center transition flex items-center justify-center gap-1"
        :class="mobileTab === 'library' ? 'bg-[#9333EA] text-yellow-300 font-black' : 'bg-[#FFFEF0] text-slate-700'" 
        @click="mobileTab = 'library'"
      >
        <Icon icon="mdi:book-open-page-variant" class="text-lg" />
        PANEL 3: 英雄密档
      </button>
    </nav>

    <!-- 经典漫画三格叙事舞台 (Three-Panel Comic Page) -->
    <div class="flex-1 flex flex-row overflow-hidden relative p-1.5 md:p-3 gap-2 md:gap-3 bg-[#1F1F1F] bg-halftone-dark">
      
      <!-- ============================================== -->
      <!-- 分格一：THE HERO'S ARMORY (卡包商店与装备强化) -->
      <!-- ============================================== -->
      <aside 
        class="w-full md:w-1/4 lg:w-1/5 bg-[#FFFEF0] comic-border flex flex-col h-full absolute md:relative z-20 md:z-auto transition-transform duration-300 overflow-hidden"
        :class="mobileTab === 'shop' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
      >
        <!-- 分格标题栏 -->
        <div class="bg-[#E23636] text-white p-2.5 md:p-3 border-b-3 border-black flex justify-between items-center shrink-0">
          <div class="flex items-center gap-1.5">
            <span class="bg-[#FFD700] text-black font-title text-xs px-1.5 py-0.5 border border-black">#1</span>
            <h2 class="font-title text-lg md:text-xl tracking-wide comic-text-shadow">THE SUPPLY ARMORY</h2>
          </div>
          <button 
            @click="handleSurrender" 
            class="comic-btn bg-[#242424] hover:bg-black text-[#FFD700] text-xs px-2 py-1 font-title cursor-pointer"
            title="急流勇退并结算点数"
          >
            急流勇退
          </button>
        </div>

        <!-- 旁白便签条 (Narrator Tag) -->
        <div class="bg-[#FFD700] border-b-2 border-black px-2 py-1 text-[11px] font-bold text-slate-900 flex items-center gap-1 shrink-0">
          <Icon icon="mdi:alert-decagram" class="text-red-600 text-sm" />
          <span>选择军备卡包，招募超级战力！</span>
        </div>

        <!-- 滚动列表 (保证 shrink-0 不被压缩，卡包价格与概率始终完整展示) -->
        <div class="flex-1 overflow-y-auto p-2 md:p-3 flex flex-col gap-3 pb-24 md:pb-6 bg-halftone-paper">
          
          <!-- 卡包选项卡片 (使用 shrink-0 min-h-fit 避免被 Flex 容器压缩裁剪) -->
          <div 
            v-for="pack in unlockedPacks" 
            :key="pack.id"
            @click="selectedPack = pack"
            :class="[
              'shrink-0 min-h-fit p-3 border-3 border-black transition-all duration-200 relative cursor-pointer overflow-hidden',
              selectedPack?.id === pack.id 
                ? 'bg-[#FFF9C4] animate-pack-active translate-x-1 pl-4 z-10 ' + getPackBorderColor(pack.id) 
                : 'bg-white hover:bg-yellow-50/80 shadow-[2px_2px_0_#000] opacity-85 hover:opacity-100 hover:translate-x-0.5'
            ]"
          >
            <!-- 激活状态：左侧漫画能量光束条 (替代原先遮挡星级的标签) -->
            <div 
              v-if="selectedPack?.id === pack.id" 
              class="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-b from-[#E23636] via-[#FFD700] to-[#E23636] border-r-2 border-black"
            ></div>

            <!-- 激活状态：右侧指向战场的动态箭头标识 -->
            <div 
              v-if="selectedPack?.id === pack.id" 
              class="absolute -right-2 top-1/2 -translate-y-1/2 hidden md:flex items-center justify-center w-5 h-5 bg-[#E23636] text-[#FFD700] border-2 border-black rotate-45 shadow-[2px_2px_0_#000] z-20"
            >
              <span class="rotate-[-45deg] text-[10px] font-title leading-none -mt-0.5">▶</span>
            </div>

            <!-- 星级羁绊角标 (独立完整显示，无任何元素遮挡) -->
            <div v-if="Math.max(...(pack.synergies || []).map(syn => store.getSynergyStars(pack.id, syn.id))) > 0" 
                 class="absolute top-0 right-0 bg-black text-[#FFD700] px-1.5 py-0.5 font-title text-[11px] flex items-center gap-0.5 border-b-2 border-l-2 border-black z-10 shadow-[1px_1px_0_#000]">
              <Icon v-for="s in Math.max(...(pack.synergies || []).map(syn => store.getSynergyStars(pack.id, syn.id)))" :key="s" icon="mdi:star" class="w-3 h-3 text-yellow-400" />
            </div>

            <!-- 卡包名称与选中准星动效 -->
            <div class="font-title text-base md:text-lg text-slate-900 tracking-wide flex items-center justify-between gap-1.5 pr-12">
              <div class="flex items-center gap-1.5">
                <Icon icon="mdi:shield-sword" class="text-red-600 text-lg shrink-0" />
                <span>{{ pack.name }}</span>
              </div>
              <!-- 选中瞄准靶心呼吸动效 -->
              <div v-if="selectedPack?.id === pack.id" class="flex items-center gap-1 bg-[#E23636] text-[#FFD700] px-1.5 py-0.2 border border-black text-[10px] shadow-[1px_1px_0_#000] shrink-0">
                <Icon icon="mdi:target" class="text-xs animate-spin" style="animation-duration: 4s;" />
                <span>READY</span>
              </div>
            </div>

            <!-- 价格标签 (显眼且绝不遮挡) -->
            <div class="text-xs font-bold text-slate-800 mt-2 flex items-center justify-between bg-amber-50 p-1.5 border border-black/30">
              <div class="flex items-center gap-1.5">
                <span>进价:</span>
                <span class="bg-[#FFD700] text-black border-2 border-black px-2 py-0.5 font-title text-sm shadow-[1px_1px_0_#000]">
                  {{ store.getEngine().getPackPrice(pack) }} G
                </span>
                <span v-if="store.getEngine().getPackPrice(pack) !== pack.basePrice" class="line-through text-slate-500 text-xs font-bold ml-1">
                  {{ pack.basePrice }} G
                </span>
              </div>
              <span class="text-[10px] text-slate-500 font-bold">5张/包</span>
            </div>

            <!-- 出率概率网格 (始终清晰呈现) -->
            <div class="mt-2 bg-white border-2 border-black p-1.5 shadow-[1px_1px_0_#000]">
              <div class="text-[9px] font-bold text-slate-600 mb-1 flex justify-between">
                <span>出卡概率分布:</span>
                <span class="text-emerald-700 font-bold">RATE INFO</span>
              </div>
              <div class="grid grid-cols-4 gap-1 text-center font-title">
                <div v-for="item in getDisplayRates(pack)" :key="item.r" class="flex flex-col border border-black/30 p-1 bg-slate-50">
                  <span class="text-xs" :class="[
                    item.r === 'SSR' ? 'text-red-600 font-black' : '',
                    item.r === 'SR' ? 'text-purple-700 font-black' : '',
                    item.r === 'R' ? 'text-blue-600 font-bold' : '',
                    item.r === 'N' ? 'text-slate-600' : ''
                  ]">{{ item.r }}</span>
                  <span class="text-[11px] font-bold" :class="item.percent > item.originalPercent ? 'text-emerald-700 font-black' : 'text-slate-800'">
                    {{ item.percent.toFixed(1) }}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="unlockedPacks.length === 0" class="text-slate-600 text-center py-4 font-bold">
            暂无已解锁卡包
          </div>

          <!-- 局内英雄强化装置 (Power-ups & Gadgets) -->
          <div class="mt-2 pt-3 border-t-3 border-black border-dashed shrink-0">
            <div class="bg-[#1E90FF] text-white border-2 border-black px-2.5 py-1 font-title text-sm flex items-center justify-between shadow-[2px_2px_0_#000] mb-2.5">
              <span class="flex items-center gap-1">
                <Icon icon="mdi:flash" class="text-[#FFD700]" />
                局内装备强化
              </span>
              <span class="text-[10px] text-yellow-200">IN-RUN BOOST</span>
            </div>

            <div 
              v-for="upg in availableUpgrades.filter(u => store.totalEarned >= (u.unlockThreshold || 0))" 
              :key="upg.id" 
              @click="store.buyUpgrade(upg.id); triggerSfx('UPGRADE!', 'blue');"
              class="shrink-0 p-2 bg-white border-2 border-black hover:bg-yellow-50 cursor-pointer mb-2 transition shadow-[2px_2px_0_#000] relative group"
            >
              <div class="flex justify-between items-center mb-0.5">
                <span class="font-title text-slate-900 text-sm flex items-center gap-1">
                  {{ upg.name }}
                  <span class="bg-[#1E90FF] text-white text-[9px] px-1 font-mono border border-black">
                    Lv.{{ store.upgrades[upg.id] || 0 }}/{{upg.maxLevel}}
                  </span>
                </span>
                <span :class="store.coins >= Math.floor(upg.basePrice * Math.pow(upg.priceMultiplier, store.upgrades[upg.id] || 0)) ? 'text-red-600 font-title text-sm' : 'text-slate-400 font-title text-sm'">
                  {{ Math.floor(upg.basePrice * Math.pow(upg.priceMultiplier, store.upgrades[upg.id] || 0)) }} G
                </span>
              </div>
              <div class="text-[10px] text-slate-600 font-bold leading-tight">{{ upg.desc(store.upgrades[upg.id] || 0) }}</div>

              <!-- 满级印章 -->
              <div v-if="(store.upgrades[upg.id] || 0) >= upg.maxLevel" class="absolute inset-0 bg-white/90 border-2 border-red-600 flex items-center justify-center font-title text-red-600 text-sm transform -rotate-3">
                ★ MAX POWER ★
              </div>
            </div>
          </div>

        </div>
      </aside>

      <!-- ============================================== -->
      <!-- 分格二：THE ACTION DESK (中心战场与觉醒开卡画框) -->
      <!-- ============================================== -->
      <main 
        class="w-full md:w-2/4 lg:w-3/5 bg-[#FFFEF0] comic-border flex flex-col relative flex-1 h-full z-10 md:z-auto transition-opacity duration-300 overflow-hidden"
        :class="mobileTab === 'desk' ? 'opacity-100' : 'opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto'"
      >
        <!-- 分格标题栏 -->
        <div class="bg-[#1E90FF] text-white p-2.5 md:p-3 border-b-3 border-black flex justify-between items-center shrink-0">
          <div class="flex items-center gap-1.5">
            <span class="bg-[#FFD700] text-black font-title text-xs px-1.5 py-0.5 border border-black">#2</span>
            <h2 class="font-title text-lg md:text-xl tracking-wide comic-text-shadow">PANEL 2: THE SUMMONING DESK</h2>
          </div>
          <div class="comic-caption-box bg-[#FFD700] text-black px-2 py-0.5 text-[11px] font-title">
            <span>SELECTED: {{ selectedPack ? selectedPack.name : 'NONE' }}</span>
          </div>
        </div>

        <!-- 移动端顶部资金条 -->
        <div class="md:hidden flex justify-between items-center p-2 border-b-2 border-black bg-[#FFF9C4] shrink-0 font-bold text-xs">
          <div class="flex items-center gap-1">
            <span>当前军饷:</span>
            <span class="font-title text-base text-red-600">{{ store.coins }} G</span>
          </div>
          <button @click="showMetaTree = true" class="text-blue-700 font-title flex items-center gap-0.5">
            <Icon icon="mdi:atom-variant" /> 狂热点: {{ store.metaPoints }}
          </button>
        </div>

        <!-- 叙事对话气泡引导 (Story Bubble) -->
        <div class="bg-[#FFFDE7] border-b-2 border-black p-2 flex items-center justify-between text-xs font-bold text-slate-800 shrink-0">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-full bg-[#E23636] border border-black flex items-center justify-center text-white text-xs font-title shrink-0">
              !
            </div>
            <span class="line-clamp-1">
              {{ store.currentSessionCards.length > 0 ? '“英雄们已响应召唤来到画框！选择处置方案或进行收藏。”' : '“英雄祭坛蓄势待发！在下方选择单抽或十连抽召唤强援！”' }}
            </span>
          </div>
          <span class="hidden sm:inline-block font-title text-[10px] text-slate-600 bg-white border border-black px-1.5">
            DESK STATUS: OK
          </span>
        </div>

        <!-- 核心卡牌展示区 -->
        <div 
          class="flex-1 p-3 md:p-5 overflow-y-auto w-full pb-44 md:pb-36 flex flex-col items-center bg-[#F7F4EA] bg-halftone-paper relative" 
          @click="clearSelection"
        >
          <!-- 破产/结算画面：大画框爆炸效果 -->
          <div v-if="store.isSoftLocked || store.gameOver" class="h-full flex flex-col items-center justify-center m-auto animate-card-smash max-w-lg text-center p-4">
            <div class="relative mb-3">
              <div class="w-28 h-28 md:w-36 md:h-36 comic-starburst bg-[#E23636] mx-auto flex items-center justify-center border-4 border-black shadow-[4px_4px_0_#000]">
                <span class="font-title text-3xl md:text-5xl text-[#FFD700] comic-text-shadow transform -rotate-6">CRASH!</span>
              </div>
            </div>

            <h3 class="font-title text-3xl md:text-5xl text-black comic-text-shadow mb-1">
              {{ store.isSoftLocked ? '军饷告罄 • 宣告破产！' : '急流勇退 • 凯旋结算！' }}
            </h3>

            <p class="text-sm md:text-base font-bold text-slate-700 mb-4 speech-bubble p-3">
              {{ store.isSoftLocked ? '“所有的军饷与后备资源均已耗尽，但这并不是终点，量子多元宇宙正在重组！”' : '“你在巅峰时刻选择保存实力，积蓄的大笔战资将成为下一个轮回的基石！”' }}<br/>
              本局总入账达到 <span class="text-red-600 font-title text-xl">{{ store.totalEarned }} G</span>
            </p>

            <div class="comic-border bg-[#FFF9C4] p-3 w-full mb-4 transform -rotate-1">
              <div class="text-xs font-bold text-slate-700">根据战资转化的跨轮回狂热点：</div>
              <div class="font-title text-3xl md:text-4xl text-[#1E90FF] comic-text-shadow">
                +{{ Math.floor(store.totalEarned / 50) }} 狂热点
              </div>
            </div>

            <div class="flex flex-wrap gap-2.5 justify-center w-full">
              <button 
                @click="showMetaTree = true" 
                class="comic-btn bg-[#1E90FF] hover:bg-blue-400 text-[#FFD700] px-5 py-2.5 text-base md:text-lg flex items-center gap-2 cursor-pointer"
              >
                <Icon icon="mdi:atom-variant" class="text-xl" />
                进入多元宇宙天赋树 ({{ store.metaPoints }}点)
              </button>

              <button 
                @click="store.restartGame(); showMetaTree = false; triggerSfx('REBIRTH!', 'yellow')" 
                class="comic-btn bg-[#00D084] hover:bg-emerald-400 text-black px-6 py-2.5 text-base md:text-lg cursor-pointer"
              >
                开启崭新轮回！
              </button>
            </div>
          </div>

          <!-- 无卡牌时的美漫分格等待插画 (鲜艳标题，绝不黑化模糊) -->
          <div 
            v-else-if="store.currentSessionCards.length === 0" 
            class="h-full flex flex-col items-center justify-center text-slate-600 m-auto text-center p-4"
          >
            <div class="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-black bg-[#FFD700] flex items-center justify-center shadow-[4px_4px_0_#000] mb-3 transform -rotate-3 comic-speedlines">
              <Icon icon="mdi:cards" class="text-5xl md:text-6xl text-slate-900 drop-shadow" />
            </div>
            <div class="font-title text-2xl md:text-4xl text-[#E23636] comic-text-shadow mb-1 tracking-wider leading-tight">
              等待英雄召唤 • READY FOR ACTION!
            </div>
            <div class="text-xs md:text-sm font-bold max-w-sm speech-bubble p-3 text-slate-800 speech-bubble-tail-bottom mt-2">
              抽卡获得的超级战力将按漫画分格陈列在此！<br/>
              (点击卡牌可进行战术锁定与多选处置)
            </div>
          </div>

          <!-- 卡牌分格网格 (Comic Trading Cards) -->
          <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3.5 w-full content-start">
            <div 
              v-for="(card, i) in store.currentSessionCards" 
              :key="i"
              @click.stop="toggleSelect(i)"
              :class="[
                'aspect-[2.3/3.4] md:aspect-[2.4/3.5] flex flex-col items-center justify-between border-3 border-black p-1.5 md:p-2 text-center transition cursor-pointer relative overflow-hidden animate-card-smash select-none',
                card.rarity === 'SSR' 
                  ? 'bg-halftone-yellow shadow-[5px_5px_0_#000] ring-3 ring-red-500 animate-kirby-krackle' 
                  : card.rarity === 'SR'
                    ? 'bg-[#F3E8FF] shadow-[4px_4px_0_#000]'
                    : card.rarity === 'R'
                      ? 'bg-[#E0F2FE] shadow-[3px_3px_0_#000]'
                      : 'bg-white shadow-[3px_3px_0_#000]',
                selectedIndices.has(i) 
                  ? 'ring-4 ring-[#1E90FF] -translate-y-1 shadow-[6px_6px_0_#000] z-30 scale-105' 
                  : 'hover:-translate-y-0.5 z-10'
              ]"
              :style="{ animationDelay: `${Math.min(i * 0.04, 0.6)}s` }"
            >
              <!-- SSR 专属杰克·科比宇宙星爆背景 (局部防溢出) -->
              <div v-if="card.rarity === 'SSR'" class="absolute inset-0 comic-speedlines opacity-40 pointer-events-none overflow-hidden"></div>

              <!-- 顶部：稀有度漫画印章与标记 -->
              <div class="w-full flex justify-between items-start z-10">
                <span 
                  class="border-2 border-black font-title text-xs md:text-sm px-1.5 py-0.2 leading-none shadow-[1px_1px_0_#000]"
                  :class="getRarityBadgeStyle(card.rarity)"
                >
                  {{ card.rarity }}
                </span>

                <!-- NEW / 已有标记 -->
                <span 
                  v-if="(store.library[card.id] || 0) > 0" 
                  class="bg-white/90 text-slate-800 border border-black px-1 font-title text-[9px] md:text-[10px]"
                >
                  x{{ store.library[card.id] }}
                </span>
                <span 
                  v-else 
                  class="bg-[#E23636] text-[#FFD700] border border-black px-1 font-title text-[9px] md:text-[10px] animate-pulse"
                >
                  NEW!
                </span>
              </div>

              <!-- 卡牌立绘占位/主体符号 -->
              <div class="my-auto z-10 flex flex-col items-center">
                <div 
                  class="w-10 h-10 md:w-14 md:h-14 rounded-full border-2 border-black flex items-center justify-center shadow-[2px_2px_0_#000]"
                  :class="[
                    card.rarity === 'SSR' ? 'bg-[#E23636] text-[#FFD700]' : '',
                    card.rarity === 'SR' ? 'bg-[#9333EA] text-yellow-300' : '',
                    card.rarity === 'R' ? 'bg-[#1E90FF] text-white' : '',
                    card.rarity === 'N' ? 'bg-slate-200 text-slate-700' : ''
                  ]"
                >
                  <Icon 
                    :icon="card.rarity === 'SSR' ? 'mdi:crown' : card.rarity === 'SR' ? 'mdi:shield-star' : card.rarity === 'R' ? 'mdi:sword' : 'mdi:cards-outline'" 
                    class="text-2xl md:text-3xl"
                  />
                </div>
                <div class="font-bold text-[12px] md:text-sm text-slate-900 mt-1 line-clamp-1 px-1 tracking-tight">
                  {{ card.name }}
                </div>
              </div>

              <!-- 底部：战资身价标签 -->
              <div class="w-full bg-[#FFD700] border-2 border-black py-0.5 px-1 font-title text-[10px] md:text-xs text-black flex items-center justify-center gap-1 z-10 shadow-[1px_1px_0_#000]">
                <Icon icon="mdi:cash" class="text-xs text-red-700" />
                <span>{{ store.getEngine().effectManager.getModifiedCardValue(card) || card.baseValue }} G</span>
              </div>

              <!-- 多样化美漫内置贴纸与装饰系统 (严格限制于卡片内部 overflow-hidden，绝不遮挡下行卡牌) -->
              <template v-if="selectedIndices.has(i)">
                <div 
                  v-for="st in getCardStickers(i, card.id)" 
                  :key="st.id"
                  class="absolute z-30 pointer-events-none animate-sfx-pop"
                  :class="[st.posClass, st.rotClass]"
                >
                  <!-- 1. 长条状动作徽章 (Badge / 斜胶带 / 战备封条) -->
                  <div 
                    v-if="st.shape === 'badge'"
                    class="px-2 py-0.5 md:px-2.5 md:py-1 font-title text-[10px] md:text-xs flex items-center gap-1 leading-none uppercase tracking-wider whitespace-nowrap shadow-[2.5px_2.5px_0_#000]"
                    :class="st.badgeClass"
                  >
                    <Icon v-if="st.icon" :icon="st.icon" class="text-xs md:text-sm shrink-0" />
                    <span class="font-black">{{ st.text }}</span>
                    <span v-if="st.sub" class="text-[9px] md:text-[10px] opacity-90 border-l border-current pl-1 ml-0.5 font-bold">
                      {{ st.sub }}
                    </span>
                  </div>

                  <!-- 2. 大号圆形复古双圈印章 (Circle Stamp) -->
                  <div 
                    v-else-if="st.shape === 'circle'"
                    class="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-black flex flex-col items-center justify-center font-title shadow-[2.5px_2.5px_0_#000] p-0.5"
                    :class="st.badgeClass"
                  >
                    <div class="w-full h-full rounded-full border border-dashed border-current flex flex-col items-center justify-center text-center">
                      <Icon v-if="st.icon" :icon="st.icon" class="text-xs md:text-sm leading-none" />
                      <span v-if="st.text" class="text-[9px] md:text-[11px] font-black leading-none tracking-tighter">{{ st.text }}</span>
                      <span v-if="st.sub" class="text-[7px] md:text-[8px] font-bold leading-none scale-90">{{ st.sub }}</span>
                    </div>
                  </div>

                  <!-- 3. 大号五角星 / 爆炸星标 (Star Stamp) -->
                  <div 
                    v-else-if="st.shape === 'star'"
                    class="relative w-11 h-11 md:w-13 md:h-13 flex items-center justify-center filter drop-shadow-[2.5px_2.5px_0_#000]"
                  >
                    <svg viewBox="0 0 32 32" class="w-full h-full" :class="st.badgeClass">
                      <polygon 
                        points="16,1 20.5,10.5 31,12 23.5,19 25.5,29.5 16,24.5 6.5,29.5 8.5,19 1,12 11.5,10.5" 
                        stroke="#000" 
                        stroke-width="2.2" 
                        fill="currentColor"
                      />
                    </svg>
                    <div class="absolute inset-0 flex flex-col items-center justify-center font-title text-[9px] md:text-[11px] font-black text-black leading-none pointer-events-none pt-0.5">
                      <Icon v-if="st.icon" :icon="st.icon" class="text-xs" />
                      <span>{{ st.text || '★' }}</span>
                    </div>
                  </div>

                  <!-- 4. 正方形战术品控戳记 (Square Stamp) -->
                  <div 
                    v-else-if="st.shape === 'square'"
                    class="w-9 h-9 md:w-10 md:h-10 border-2 border-black flex flex-col items-center justify-center font-title shadow-[2px_2px_0_#000] p-0.5"
                    :class="st.badgeClass"
                  >
                    <div class="w-full h-full border border-current flex flex-col items-center justify-center leading-none">
                      <Icon v-if="st.icon" :icon="st.icon" class="text-xs md:text-sm" />
                      <span v-if="st.text" class="text-[8px] md:text-[10px] font-black">{{ st.text }}</span>
                    </div>
                  </div>

                  <!-- 5. 菱形英雄徽章 (Diamond Badge) -->
                  <div 
                    v-else-if="st.shape === 'diamond'"
                    class="w-8 h-8 md:w-9 md:h-9 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_#000]"
                    :class="st.badgeClass"
                  >
                    <Icon v-if="st.icon" :icon="st.icon" class="text-sm md:text-base transform -rotate-45" />
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- ============================================== -->
        <!-- 底部控制台与操作面板 (Chunky Comic Controls) -->
        <!-- ============================================== -->
        <div class="fixed md:absolute bottom-0 left-0 w-full bg-[#FFFEF0] border-t-4 border-black flex flex-col shadow-[0_-8px_0_rgba(0,0,0,0.15)] z-40">
          
          <!-- 战术批处理操作条 (当有待处理卡牌时) -->
          <div v-if="store.hasPendingCards && !store.isSoftLocked && !store.gameOver" class="w-full p-2 bg-[#FFFDE7] border-b-2 border-black flex justify-center">
            
            <!-- 有多选卡牌时的操作条 -->
            <div v-if="selectedIndices.size > 0" class="flex w-full gap-2 justify-center max-w-2xl px-1">
              <button 
                class="comic-btn bg-[#1E90FF] hover:bg-blue-400 text-white px-3 py-1.5 md:py-2 text-xs md:text-sm flex-1 flex items-center justify-center gap-1 cursor-pointer" 
                @click="handleCollectSelected"
              >
                <Icon icon="mdi:archive" class="text-base" />
                <span>收藏选中 ({{selectedIndices.size}}张)</span>
              </button>

              <button 
                class="comic-btn bg-[#FFD700] hover:bg-yellow-300 text-black px-3 py-1.5 md:py-2 text-xs md:text-sm flex-1 flex items-center justify-center gap-1 cursor-pointer" 
                @click="handleSellSelected"
              >
                <Icon icon="mdi:cash-fast" class="text-base text-red-600" />
                <span>变现选中 ({{selectedIndices.size}}张)</span>
              </button>

              <button 
                class="comic-btn bg-[#242424] hover:bg-black text-white px-3 py-1.5 md:py-2 text-xs md:text-sm cursor-pointer" 
                @click="clearSelection"
              >
                取消
              </button>
            </div>

            <!-- 默认全部批处理操作条 -->
            <div v-else class="flex w-full gap-1.5 md:gap-3 justify-center max-w-2xl px-1">
              <button 
                class="comic-btn bg-[#FFD700] hover:bg-yellow-300 text-black px-2 md:px-4 py-1 md:py-2 text-xs md:text-sm flex-1 flex flex-col items-center justify-center cursor-pointer" 
                @click="handleSellAll"
              >
                <span class="font-title text-sm md:text-base leading-tight">全部变现</span>
                <span class="text-[10px] text-red-700 font-bold leading-tight">+{{ store.sellAllPendingValue }} G</span>
              </button>

              <button 
                class="comic-btn bg-[#1E90FF] hover:bg-blue-400 text-white px-2 md:px-4 py-1 md:py-2 text-xs md:text-sm flex-1 flex flex-col items-center justify-center cursor-pointer" 
                @click="handleCollectNew"
              >
                <span class="font-title text-sm md:text-base leading-tight">藏新卖旧</span>
                <span class="text-[10px] text-yellow-200 font-bold leading-tight">+{{ store.collectNewAndSellRestValue }} G</span>
              </button>

              <button 
                class="comic-btn bg-[#00D084] hover:bg-emerald-400 text-black px-2 md:px-4 py-1 md:py-2 text-xs md:text-sm flex-1 flex flex-col items-center justify-center cursor-pointer" 
                @click="handleCollectAll"
              >
                <span class="font-title text-sm md:text-base leading-tight">全收手办</span>
                <span class="text-[10px] text-slate-800 font-bold leading-tight">入库存档</span>
              </button>
            </div>
          </div>

          <!-- 抽卡核心操作区 (Draw Buttons) -->
          <div 
            v-if="!store.isSoftLocked && !store.gameOver && selectedPack" 
            class="p-2 md:p-3 flex gap-2 md:gap-4 justify-center bg-[#FFFEF0]"
          >
            <!-- 单抽 -->
            <button 
              @click="handleBuy(1)"
              :disabled="store.coins < store.getEngine().getPackPrice(selectedPack)"
              class="comic-btn bg-white hover:bg-slate-100 text-slate-900 py-2 md:py-2.5 px-4 md:px-7 text-sm md:text-lg flex-1 md:flex-none max-w-[200px] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Icon icon="mdi:flash" class="text-amber-500 text-lg" />
              <span>单抽 ({{ store.getEngine().getPackPrice(selectedPack) }}G)</span>
            </button>

            <!-- 十连抽 -->
            <button 
              @click="handleBuy(10)"
              :disabled="store.coins < store.getEngine().getPackPrice(selectedPack) * 10"
              class="comic-btn bg-[#E23636] hover:bg-red-500 text-[#FFD700] py-2 md:py-2.5 px-6 md:px-10 text-base md:text-xl flex-1 md:flex-none max-w-[280px] flex items-center justify-center gap-1.5 cursor-pointer tracking-wider"
            >
              <Icon icon="mdi:star-four-points" class="text-yellow-300 text-xl animate-spin" style="animation-duration: 4s;" />
              <span>十连连打! ({{ store.getEngine().getPackPrice(selectedPack) * 10 }}G)</span>
            </button>
          </div>

        </div>
      </main>

      <!-- ============================================== -->
      <!-- 分格三：S.H.I.E.L.D. CODEX & ARCHIVES (英雄图鉴与状态) -->
      <!-- ============================================== -->
      <aside 
        class="w-full md:w-1/4 lg:w-1/5 bg-[#FFFEF0] comic-border flex flex-col h-full absolute md:relative z-20 md:z-auto right-0 transition-transform duration-300 overflow-hidden"
        :class="mobileTab === 'library' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'"
      >
        <!-- 分格标题栏 -->
        <div class="bg-[#9333EA] text-white p-2.5 md:p-3 border-b-3 border-black flex justify-between items-center shrink-0">
          <div class="flex items-center gap-1.5">
            <span class="bg-[#FFD700] text-black font-title text-xs px-1.5 py-0.5 border border-black">#3</span>
            <h2 class="font-title text-lg md:text-xl tracking-wide comic-text-shadow">PANEL 3: HERO ARCHIVES</h2>
          </div>
          <span class="bg-black text-[#FFD700] px-1.5 py-0.5 text-[10px] font-title border border-white">
            {{ totalUniqueCollected }}/{{ mockCards?.length || 0 }}
          </span>
        </div>

        <!-- 解锁进度计量条 (Progress Comic Gauge) -->
        <div class="bg-[#FFF9C4] border-b-3 border-black p-2.5 shrink-0">
          <div class="flex justify-between items-center text-[11px] font-bold text-slate-800 mb-1">
            <span class="flex items-center gap-1">
              <Icon icon="mdi:chart-line" class="text-red-600" />
              累计斩获总入账
            </span>
            <span class="font-title text-sm text-red-600">{{ store.totalEarned }} G</span>
          </div>

          <div v-if="nextPack" class="mt-1">
            <div class="flex justify-between text-[10px] text-slate-600 font-bold mb-0.5">
              <span>下一卡包解锁线</span>
              <span>尚缺 {{ nextPack.unlockThreshold - store.totalEarned }} G</span>
            </div>
            <div class="w-full bg-white border-2 border-black h-3 overflow-hidden p-0.5 shadow-inner">
              <div 
                class="h-full bg-gradient-to-r from-[#FFD700] to-[#E23636] border-r border-black transition-all duration-300"
                :style="{ width: progressPercent + '%' }"
              ></div>
            </div>
          </div>
          <div v-else class="text-center font-title text-xs text-red-700 bg-white border border-black py-0.5 mt-1">
            ★ ALL PACKS UNLOCKED! ★
          </div>
        </div>

        <!-- 英雄羁绊与搜集图鉴 -->
        <div class="flex-1 overflow-y-auto p-2 md:p-3 space-y-3 bg-halftone-paper pb-24 md:pb-4">
          <div 
            v-for="lib in libraryByPack" 
            :key="lib.packName" 
            class="shrink-0 comic-border bg-white p-2 relative overflow-hidden"
          >
            <!-- 卡包标题栏 -->
            <div class="flex justify-between items-center border-b-2 border-black pb-1 mb-1.5">
              <span class="font-title text-sm text-slate-900 flex items-center gap-1">
                <Icon icon="mdi:book-open" class="text-blue-600 text-sm" />
                {{ lib.packName }}
              </span>
              
              <!-- 整套售出奖励按钮 -->
              <button 
                v-if="lib.hasFullSet" 
                @click="store.sellPackSetFromLibrary(lib.packId); triggerSfx('FULL SET!', 'yellow');" 
                class="comic-btn bg-[#FFD700] hover:bg-yellow-300 text-black px-1.5 py-0.5 text-[10px] font-title cursor-pointer"
              >
                整套变现(+50%)
              </button>
            </div>

            <!-- 羁绊列表 -->
            <div 
              v-for="syn in lib.synergies" 
              :key="syn.id" 
              class="text-[10px] bg-slate-100 border border-black p-1.5 mb-1.5"
            >
              <div class="flex justify-between items-center border-b border-slate-300 pb-0.5 mb-0.5 font-bold">
                <span class="text-slate-700">{{ syn.conditionDesc }}</span>
                <span v-if="syn.stars > 0" class="flex gap-0.5">
                  <Icon v-for="s in syn.stars" :key="s" icon="mdi:star" class="w-3 h-3 text-yellow-500" />
                </span>
              </div>
              <div v-if="syn.stars > 0" class="font-bold text-slate-900 mt-0.5" v-html="syn.getHtml(syn.stars)"></div>
              <div v-else class="text-slate-400 italic mt-0.5 select-none">未激活: [羁绊效果隐藏]</div>
            </div>

            <!-- 已搜集卡牌徽章 -->
            <div class="flex flex-wrap gap-1 mt-1">
              <template v-if="lib.collected.length > 0">
                <div 
                  v-for="card in lib.collected" 
                  :key="card.id" 
                  @click="store.sellFromLibrary(card.id); triggerSfx('SOLD!', 'yellow');"
                  class="px-1.5 py-0.5 border-2 border-black rounded-none text-[10px] font-bold flex items-center gap-1 cursor-pointer transition shadow-[1px_1px_0_#000] hover:scale-105"
                  :class="[
                    card.rarity === 'SSR' ? 'bg-[#FFD700] text-red-700' : card.rarity === 'SR' ? 'bg-[#F3E8FF] text-purple-700' : card.rarity === 'R' ? 'bg-[#E0F2FE] text-blue-700' : 'bg-slate-100 text-slate-800'
                  ]"
                  :title="`点击售出1张: +${store.getEngine().effectManager.getModifiedCardValue(card)} G`"
                >
                  <span>{{ card.name }}</span>
                  <span class="bg-black text-white text-[9px] px-1 font-mono">
                    x{{ store.library[card.id] || 0 }}
                  </span>
                </div>
              </template>
              <div v-else class="text-[10px] text-slate-500 bg-white border border-black border-dashed p-1 w-full text-center">
                尚未搜集到本包英雄
              </div>
            </div>

          </div>
        </div>

      </aside>

    </div>

    <!-- ============================================== -->
    <!-- 平行宇宙量子天网弹窗 (THE MULTIVERSE CRISIS) -->
    <!-- ============================================== -->
    <div 
      v-if="showMetaTree" 
      class="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-3 md:p-6 backdrop-blur-sm animate-card-smash"
    >
      <div class="comic-border-lg bg-[#FFFEF0] w-full max-w-4xl max-h-[92vh] flex flex-col relative overflow-hidden shadow-[8px_8px_0_#000]">
        <!-- 弹窗顶栏 -->
        <div class="bg-[#1E90FF] text-white p-3 md:p-4 border-b-4 border-black flex justify-between items-center shrink-0">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-[#FFD700] border-2 border-black flex items-center justify-center text-black font-title text-lg">
              Ω
            </div>
            <div>
              <h2 class="font-title text-xl md:text-3xl tracking-wide comic-text-shadow leading-none">
                THE MULTIVERSE CRISIS • 量子轮回天网
              </h2>
              <div class="text-xs text-yellow-200 font-bold mt-0.5">跨轮回永久生效的超级英雄潜能网络</div>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <div class="comic-caption-box bg-[#FFD700] text-black px-2.5 py-1 text-xs md:text-sm font-title">
              狂热点: <span class="text-red-700 text-base md:text-lg">{{ store.metaPoints }}</span>
            </div>
            <button 
              @click="showMetaTree = false" 
              class="comic-btn bg-[#E23636] text-white px-2.5 py-1 font-title text-lg hover:bg-red-700 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- 弹窗主体技能列表 -->
        <div class="p-3 md:p-5 overflow-y-auto flex-1 bg-halftone-paper space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div 
              v-for="skill in metaSkills" 
              :key="skill.id" 
              class="comic-border bg-white p-3 flex flex-col justify-between shadow-[3px_3px_0_#000] relative"
            >
              <div>
                <div class="flex justify-between items-start mb-1">
                  <h3 class="font-title text-slate-900 text-lg md:text-xl flex items-center gap-1.5">
                    <Icon icon="mdi:flash-alert" class="text-amber-500" />
                    {{ skill.name }}
                  </h3>
                  <div class="bg-[#FFD700] text-black border-2 border-black px-1.5 py-0.2 font-title text-xs">
                    Lv.{{ store.metaUpgrades[skill.id] || 0 }} / {{ skill.maxLevel }}
                  </div>
                </div>

                <div class="text-xs text-slate-700 font-bold mb-3 space-y-1">
                  <div class="bg-slate-100 p-1.5 border border-black">
                    当前阶位: <span class="text-blue-700">{{ (store.metaUpgrades[skill.id] || 0) === 0 ? '未唤醒' : skill.desc(store.metaUpgrades[skill.id] || 0) }}</span>
                  </div>
                  <div v-if="(store.metaUpgrades[skill.id] || 0) < skill.maxLevel" class="text-slate-600 text-[11px]">
                    下一阶位: <span class="text-red-700">{{ skill.desc((store.metaUpgrades[skill.id] || 0) + 1) }}</span>
                  </div>
                </div>
              </div>

              <!-- 升级按钮 -->
              <button 
                @click="store.buyMetaUpgrade(skill.id); triggerSfx('POWER UP!', 'purple');"
                :disabled="(store.metaUpgrades[skill.id] || 0) >= skill.maxLevel || store.metaPoints < store.getMetaUpgradeCost(skill.id)"
                class="comic-btn py-2 text-sm md:text-base cursor-pointer"
                :class="[
                  (store.metaUpgrades[skill.id] || 0) >= skill.maxLevel 
                    ? 'bg-slate-300 text-slate-600 border-2 border-black' 
                    : 'bg-[#FFD700] hover:bg-yellow-400 text-black font-title'
                ]"
              >
                <span v-if="(store.metaUpgrades[skill.id] || 0) >= skill.maxLevel">★ 已经达到最高阶位 ★</span>
                <span v-else>觉醒升级 (-{{ store.getMetaUpgradeCost(skill.id) }} 狂热点)</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 弹窗底栏 -->
        <div class="p-3 bg-[#FFF9C4] border-t-4 border-black flex justify-between items-center shrink-0">
          <div class="text-xs font-bold text-slate-800">
            提示：每一次破产或急流勇退，累计入账每 50 G 即可转化 1 点狂热点！
          </div>
          <div class="flex gap-2">
            <button 
              v-if="store.isSoftLocked || store.gameOver" 
              @click="store.restartGame(); showMetaTree = false; triggerSfx('NEW AGE!', 'yellow');" 
              class="comic-btn bg-[#00D084] hover:bg-emerald-400 text-black px-4 py-1.5 font-title text-sm cursor-pointer"
            >
              配置完成 • 开启新宇宙！
            </button>
            <button 
              @click="showMetaTree = false" 
              class="comic-btn bg-[#242424] hover:bg-black text-white px-4 py-1.5 font-title text-sm cursor-pointer"
            >
              关闭
            </button>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<style scoped>
/* SFX 弹出动画过渡 */
.sfx-enter-active {
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.sfx-leave-active {
  transition: all 0.3s ease-out;
}
.sfx-enter-from {
  opacity: 0;
  transform: scale(0.3) rotate(-15deg);
}
.sfx-leave-to {
  opacity: 0;
  transform: scale(1.4) translateY(-30px);
}
</style>
