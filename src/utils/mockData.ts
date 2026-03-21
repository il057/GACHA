import type { Card, PackConfig } from "../types";

export const mockCards: Card[] = [
  // 乞丐保底包 (1G)
  { id: "b_n1", name: "破布", rarity: "N", baseValue: 1, packId: "pack_pity" },
  { id: "b_n2", name: "木棍", rarity: "N", baseValue: 1, packId: "pack_pity" },
  { id: "b_n3", name: "石头", rarity: "N", baseValue: 1, packId: "pack_pity" },
  { id: "b_r1", name: "生锈铜币", rarity: "R", baseValue: 3, packId: "pack_pity" },
  { id: "b_r2", name: "崭新铜币", rarity: "R", baseValue: 4, packId: "pack_pity" },
  { id: "b_r3", name: "陈旧银币", rarity: "R", baseValue: 5, packId: "pack_pity" },
  { id: "b_sr1", name: "断裂金条", rarity: "SR", baseValue: 15, packId: "pack_pity" },
  { id: "b_ssr1", name: "神秘宝晶", rarity: "SSR", baseValue: 100, packId: "pack_pity" },

  // 森林包 (Total 10 cards)
  { id: "f_n1", name: "史莱姆", rarity: "N", baseValue: 5, packId: "pack_forest" },
  { id: "f_n2", name: "小蘑菇", rarity: "N", baseValue: 5, packId: "pack_forest" },
  { id: "f_n3", name: "哥布林", rarity: "N", baseValue: 5, packId: "pack_forest" },
  { id: "f_n4", name: "蝙蝠", rarity: "N", baseValue: 5, packId: "pack_forest" },
  { id: "f_r1", name: "森林狼", rarity: "R", baseValue: 25, packId: "pack_forest" },
  { id: "f_r2", name: "树精", rarity: "R", baseValue: 25, packId: "pack_forest" },
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
  { id: "fi_n1", name: "余烬", rarity: "N", baseValue: 25, packId: "pack_fire" },
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
  pool: mockCards.filter(c => c.packId === "pack_pity")
};

export const forestPack: PackConfig = {
  id: "pack_forest",
  name: "神秘森林包",
  basePrice: 10,
  unlockThreshold: 50,
  rates: { N: 70, R: 24.5, SR: 5, SSR: 0.5 },
  pool: mockCards.filter(c => c.packId === "pack_forest")
};

export const oceanPack: PackConfig = {
  id: "pack_ocean",
  name: "深邃海洋包",
  basePrice: 20,
  unlockThreshold: 300,
  rates: { N: 65, R: 28, SR: 6, SSR: 1 },
  pool: mockCards.filter(c => c.packId === "pack_ocean")
};

export const firePack: PackConfig = {
  id: "pack_fire",
  name: "灼热烈焰包",
  basePrice: 50, 
  unlockThreshold: 1500,
  rates: { N: 60, R: 30, SR: 8, SSR: 2 },
  pool: mockCards.filter(c => c.packId === "pack_fire")
};

export const availablePacks: PackConfig[] = [pityPack, forestPack, oceanPack, firePack];
