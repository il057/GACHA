import type { Card, PackConfig, UpgradeConfig, MetaSkillConfig } from "../types";

export const mockCards: Card[] = [
  // 乞丐保底包 (1G)
  { id: "b_n1", name: "破布", rarity: "N", baseValue: 1, packId: "pack_pity" },
  { id: "b_n2", name: "木棍", rarity: "N", baseValue: 1, packId: "pack_pity", tags: ["tool"] },
  { id: "b_n3", name: "石头", rarity: "N", baseValue: 1, packId: "pack_pity", tags: ["stone"] },
  { id: "b_r1", name: "生锈铜币", rarity: "R", baseValue: 3, packId: "pack_pity" },
  { id: "b_r2", name: "崭新铜币", rarity: "R", baseValue: 4, packId: "pack_pity" },
  { id: "b_r3", name: "陈旧银币", rarity: "R", baseValue: 5, packId: "pack_pity" },
  { id: "b_sr1", name: "断裂金条", rarity: "SR", baseValue: 15, packId: "pack_pity" },
  { id: "b_ssr1", name: "神秘宝晶", rarity: "SSR", baseValue: 100, packId: "pack_pity" },

  // 森林包 (Total 10 cards)
  { id: "f_n1", name: "史莱姆", rarity: "N", baseValue: 5, packId: "pack_forest" },
  { id: "f_n2", name: "小蘑菇", rarity: "N", baseValue: 5, packId: "pack_forest", tags: ["plant", "food"] },
  { id: "f_n3", name: "哥布林", rarity: "N", baseValue: 5, packId: "pack_forest" },
  { id: "f_n4", name: "蝙蝠", rarity: "N", baseValue: 5, packId: "pack_forest" },
  { id: "f_r1", name: "森林狼", rarity: "R", baseValue: 25, packId: "pack_forest" },
  { id: "f_r2", name: "树精", rarity: "R", baseValue: 25, packId: "pack_forest", tags: ["plant"] },
  { id: "f_r3", name: "小精灵", rarity: "R", baseValue: 25, packId: "pack_forest" },
  { id: "f_sr1", name: "暗精灵", rarity: "SR", baseValue: 100, packId: "pack_forest" },
  { id: "f_sr2", name: "独角兽", rarity: "SR", baseValue: 100, packId: "pack_forest" },
  { id: "f_ssr1", name: "森之巨龙", rarity: "SSR", baseValue: 800, packId: "pack_forest" },

  // 海洋包 (Total 8 cards)
  { id: "o_n1", name: "小丑鱼", rarity: "N", baseValue: 10, packId: "pack_ocean", tags: ["fish"] },
  { id: "o_n2", name: "河豚", rarity: "N", baseValue: 10, packId: "pack_ocean", tags: ["fish"] },
  { id: "o_r1", name: "带鱼", rarity: "R", baseValue: 40, packId: "pack_ocean", tags: ["fish"] },
  { id: "o_r2", name: "海马", rarity: "R", baseValue: 40, packId: "pack_ocean", tags: ["fish"] },
  { id: "o_sr1", name: "鲨鱼", rarity: "SR", baseValue: 180, packId: "pack_ocean", tags: ["fish"] },
  { id: "o_sr2", name: "美人鱼", rarity: "SR", baseValue: 200, packId: "pack_ocean" },
  { id: "o_ssr1", name: "利维坦巨兽", rarity: "SSR", baseValue: 1500, packId: "pack_ocean" },

  // 烈焰包
  { id: "fi_n1", name: "余烬", rarity: "N", baseValue: 25, packId: "pack_fire", tags: ["stone"] },
  { id: "fi_r1", name: "火灵", rarity: "R", baseValue: 90, packId: "pack_fire" },
  { id: "fi_sr1", name: "不死鸟", rarity: "SR", baseValue: 450, packId: "pack_fire" },
  { id: "fi_ssr1", name: "炎之领主", rarity: "SSR", baseValue: 3000, packId: "pack_fire" },
];

export const pityPack: PackConfig = {
  id: "pack_pity",
  name: "乞丐保底包",
  basePrice: 1,
  unlockThreshold: 0,
  rates: { N: 80, R: 18, SR: 1.9, SSR: 0.1 },
  synergies: [
    {
      id: "pity_all",
      conditionDesc: "全图鉴",
      getHtml: (s) => `<span class="text-yellow-400">SR/SSR 概率 +${s * 10}%</span>`,
      getRequiredCards: (allCards) => allCards.filter(c => c.packId === "pack_pity").map(c => c.id),
    },
    {
      id: "pity_tools",
      conditionDesc: "工具收藏",
      getHtml: (s) => `<span class="text-blue-400">工具卡价值 +${s * 3}G</span>`,
      getRequiredCards: (allCards) => allCards.filter(c => c.packId === "pack_pity" && c.tags?.includes("tool")).map(c => c.id),
    },
    {
      id: "pity_stone",
      conditionDesc: "顽石共鸣",
      getHtml: (s) => `<span class="text-purple-400">石头卡价值 +${s * 8}G</span>`,
      getRequiredCards: (allCards) => allCards.filter(c => c.packId === "pack_pity" && c.tags?.includes("stone")).map(c => c.id),
    },
  ],
  pool: mockCards.filter(c => c.packId === "pack_pity"),
};

export const forestPack: PackConfig = {
  id: "pack_forest",
  name: "神秘森林包",
  basePrice: 10,
  unlockThreshold: 50,
  rates: { N: 70, R: 24.5, SR: 5, SSR: 0.5 },
  synergies: [
    {
      id: "forest_all",
      conditionDesc: "全图鉴",
      getHtml: (s) => `<span class="text-green-400">全局卡牌价值 +${s * 15}%</span>`,
      getRequiredCards: (allCards) => allCards.filter(c => c.packId === "pack_forest").map(c => c.id),
    },
    {
      id: "forest_plants",
      conditionDesc: "森林植被",
      getHtml: (s) => `<span class="text-emerald-400">植物价值 +${s * 15}G</span>`,
      getRequiredCards: (allCards) => allCards.filter(c => c.packId === "pack_forest" && c.tags?.includes("plant")).map(c => c.id),
    },
    {
      id: "forest_food",
      conditionDesc: "林间采摘",
      getHtml: (s) => `<span class="text-orange-400">森林包进价 -${s * 2}G</span>`,
      getRequiredCards: (allCards) => allCards.filter(c => c.packId === "pack_forest" && c.tags?.includes("food")).map(c => c.id),
    },
  ],
  pool: mockCards.filter(c => c.packId === "pack_forest"),
};

export const oceanPack: PackConfig = {
  id: "pack_ocean",
  name: "深邃海洋包",
  basePrice: 20,
  unlockThreshold: 300,
  rates: { N: 65, R: 28, SR: 6, SSR: 1 },
  synergies: [
    {
      id: "ocean_all",
      conditionDesc: "全图鉴",
      getHtml: (s) => `<span class="text-cyan-400">抽卡按卡价返现 +${s * 4}%</span>`,
      getRequiredCards: (allCards) => allCards.filter(c => c.packId === "pack_ocean").map(c => c.id),
    },
    {
      id: "ocean_fish",
      conditionDesc: "群鱼游弋",
      getHtml: (s) => `<span class="text-blue-300">鱼类价值 +${s * 35}G</span>`,
      getRequiredCards: (allCards) => allCards.filter(c => c.packId === "pack_ocean" && c.tags?.includes("fish")).map(c => c.id),
    },
  ],
  pool: mockCards.filter(c => c.packId === "pack_ocean"),
};

export const firePack: PackConfig = {
  id: "pack_fire",
  name: "灼热烈焰包",
  basePrice: 50, 
  unlockThreshold: 1500,
  rates: { N: 60, R: 30, SR: 8, SSR: 2 },
  synergies: [
    {
      id: "fire_all",
      conditionDesc: "全图鉴",
      getHtml: (s) => `<span class="text-red-400">烈焰包进价 -${s * 8}%</span>`,
      getRequiredCards: (allCards) => allCards.filter(c => c.packId === "pack_fire").map(c => c.id),
    },
    {
      id: "fire_stone",
      conditionDesc: "余烬共鸣",
      getHtml: (s) => `<span class="text-purple-400">余烬价值 +${s * 80}G</span>`,
      getRequiredCards: (allCards) => allCards.filter(c => c.packId === "pack_fire" && c.tags?.includes("stone")).map(c => c.id),
    },
  ],
  pool: mockCards.filter(c => c.packId === "pack_fire"),
};

export const availablePacks: PackConfig[] = [pityPack, forestPack, oceanPack, firePack];

export const availableUpgrades: UpgradeConfig[] = [
  {
    id: "upgrade_luck",
    name: "幸运护符",
    basePrice: 40,
    priceMultiplier: 1.8,
    maxLevel: 10,
    unlockThreshold: 50,
    desc: (lvl) => `SR与SSR掉落权重提升 ${(lvl * 15)}%`,
  },
  {
    id: "upgrade_value",
    name: "鉴宝专家",
    basePrice: 60,
    priceMultiplier: 1.7,
    maxLevel: 10,
    unlockThreshold: 100,
    desc: (lvl) => `全局所有卡牌售出价格提升 ${(lvl * 10)}%`,
  },
  {
    id: "upgrade_refund",
    name: "拾荒补贴",
    basePrice: 25,
    priceMultiplier: 2.0,
    maxLevel: 10,
    unlockThreshold: 30,
    desc: (lvl) => `单次抽卡固定返还补贴 +${lvl} G`,
  },
  {
    id: "upgrade_discount",
    name: "大宗采购",
    basePrice: 80,
    priceMultiplier: 1.9,
    maxLevel: 10,
    unlockThreshold: 200,
    desc: (lvl) => `所有卡包购买价格降低 ${(lvl * 2)}%`,
  },
  {
    id: "upgrade_refund_pct",
    name: "VIP 返利",
    basePrice: 150,
    priceMultiplier: 2.2,
    maxLevel: 5,
    unlockThreshold: 500,
    desc: (lvl) => `单抽按卡包基础售价额外返还 ${(lvl * 2)}%`,
  },
];

export const metaSkills: MetaSkillConfig[] = [
  {
    id: "ms_start_funds",
    name: "遗产继承",
    baseCost: 10,
    costMultiplier: 1.8,
    maxLevel: 10,
    desc: (lvl) => `开启新轮回时初始资金增加 +${lvl * 150} G`,
  },
  {
    id: "ms_luck",
    name: "欧皇转世",
    baseCost: 15,
    costMultiplier: 2.0,
    maxLevel: 10,
    desc: (lvl) => `全局永久提升高阶卡牌出现权重 +${lvl * 5}%`,
  },
  {
    id: "ms_value",
    name: "点石成金",
    baseCost: 20,
    costMultiplier: 2.0,
    maxLevel: 8,
    desc: (lvl) => `全局所有卡牌售出基础价值永久提升 +${lvl * 20}%`,
  },
  {
    id: "ms_discount",
    name: "商业特权",
    baseCost: 25,
    costMultiplier: 2.2,
    maxLevel: 6,
    desc: (lvl) => `全局卡包进价永久折扣 -${lvl * 5}%`,
  },
];
