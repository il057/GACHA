import type { Card, PackConfig, UpgradeConfig, MetaSkillConfig } from "../types";

export const mockCards: Card[] = [
  // 1. 乞丐保底包 (pack_pity, 进价 5G)
  // N卡 2~3G，R卡 5~7G (微利)，SR 24G (近5倍)，SSR 110G (22倍爆金大奖)
  // 实测：从100G盲抽全卖到达250G概率约 33%，抽到双SSR直接破250G
  { id: "b_n1", name: "破布", rarity: "N", baseValue: 2, packId: "pack_pity" },
  { id: "b_n2", name: "木棍", rarity: "N", baseValue: 2, packId: "pack_pity", tags: ["tool"] },
  { id: "b_n3", name: "石头", rarity: "N", baseValue: 3, packId: "pack_pity", tags: ["stone"] },
  { id: "b_r1", name: "生锈铜币", rarity: "R", baseValue: 5, packId: "pack_pity", tags: ["coin"] },
  { id: "b_r2", name: "崭新铜币", rarity: "R", baseValue: 6, packId: "pack_pity", tags: ["coin"] },
  { id: "b_r3", name: "陈旧银币", rarity: "R", baseValue: 7, packId: "pack_pity", tags: ["coin"] },
  { id: "b_sr1", name: "断裂金条", rarity: "SR", baseValue: 24, packId: "pack_pity", tags: ["treasure"] },
  { id: "b_ssr1", name: "神秘宝晶", rarity: "SSR", baseValue: 110, packId: "pack_pity", tags: ["treasure"] },

  // 2. 神秘森林包 (pack_forest, 进价 25G)
  // N卡 10~12G (44%)，R卡 26~32G (115%)，SR 85~95G (3.6x)，SSR 450G (18x)
  // 10连平均回血 269G (+7.8%)，10连亏损率 67.6%
  { id: "f_n1", name: "史莱姆", rarity: "N", baseValue: 10, packId: "pack_forest" },
  { id: "f_n2", name: "小蘑菇", rarity: "N", baseValue: 11, packId: "pack_forest", tags: ["plant", "food"] },
  { id: "f_n3", name: "哥布林", rarity: "N", baseValue: 11, packId: "pack_forest", tags: ["monster"] },
  { id: "f_n4", name: "蝙蝠", rarity: "N", baseValue: 12, packId: "pack_forest", tags: ["monster"] },
  { id: "f_r1", name: "森林狼", rarity: "R", baseValue: 26, packId: "pack_forest", tags: ["beast"] },
  { id: "f_r2", name: "树精", rarity: "R", baseValue: 28, packId: "pack_forest", tags: ["plant"] },
  { id: "f_r3", name: "小精灵", rarity: "R", baseValue: 32, packId: "pack_forest", tags: ["fairy"] },
  { id: "f_sr1", name: "暗精灵", rarity: "SR", baseValue: 85, packId: "pack_forest", tags: ["fairy"] },
  { id: "f_sr2", name: "独角兽", rarity: "SR", baseValue: 95, packId: "pack_forest", tags: ["beast"] },
  { id: "f_ssr1", name: "森之巨龙", rarity: "SSR", baseValue: 450, packId: "pack_forest", tags: ["dragon"] },

  // 3. 深邃海洋包 (pack_ocean, 进价 120G)
  // N卡 45~50G (40%)，R卡 120~140G (108%)，SR 380~420G (3.3x)，SSR 1500G (12.5x)
  // 10连平均回血 1404G (+17.0%)，10连亏损率 54.5%
  { id: "o_n1", name: "小丑鱼", rarity: "N", baseValue: 45, packId: "pack_ocean", tags: ["fish"] },
  { id: "o_n2", name: "河豚", rarity: "N", baseValue: 50, packId: "pack_ocean", tags: ["fish"] },
  { id: "o_r1", name: "带鱼", rarity: "R", baseValue: 120, packId: "pack_ocean", tags: ["fish"] },
  { id: "o_r2", name: "海马", rarity: "R", baseValue: 140, packId: "pack_ocean", tags: ["fish"] },
  { id: "o_sr1", name: "鲨鱼", rarity: "SR", baseValue: 380, packId: "pack_ocean", tags: ["fish", "predator"] },
  { id: "o_sr2", name: "美人鱼", rarity: "SR", baseValue: 420, packId: "pack_ocean", tags: ["aquatic"] },
  { id: "o_ssr1", name: "利维坦巨兽", rarity: "SSR", baseValue: 1500, packId: "pack_ocean", tags: ["ancient"] },

  // 4. 灼热烈焰包 (pack_fire, 进价 500G)
  // N卡 180~200G (38%)，R卡 520~580G (110%)，SR 1500G (3.0x)，SSR 4500G (9.0x)
  // 10连平均回血 6348G (+27.0%)，10连亏损率 39.9%
  { id: "fi_n1", name: "余烬", rarity: "N", baseValue: 180, packId: "pack_fire", tags: ["cinder"] },
  { id: "fi_n2", name: "熔岩幼虫", rarity: "N", baseValue: 200, packId: "pack_fire", tags: ["flame"] },
  { id: "fi_r1", name: "火灵", rarity: "R", baseValue: 520, packId: "pack_fire", tags: ["flame"] },
  { id: "fi_r2", name: "烈焰猎犬", rarity: "R", baseValue: 580, packId: "pack_fire", tags: ["flame", "beast"] },
  { id: "fi_sr1", name: "不死鸟", rarity: "SR", baseValue: 1500, packId: "pack_fire", tags: ["sacred"] },
  { id: "fi_ssr1", name: "炎之领主", rarity: "SSR", baseValue: 4500, packId: "pack_fire", tags: ["lord"] },

  // 5. 蒸汽机械包 (pack_machina, 进价 2,000G)
  // N卡 700~800G (37.5%)，R卡 2100~2300G (110%)，SR 5500~6500G (3.0x)，SSR 14000G (7.0x)
  // 10连平均回血 28255G (+41.3%)，10连亏损率 24.3%
  { id: "m_n1", name: "发条齿轮", rarity: "N", baseValue: 700, packId: "pack_machina", tags: ["machina", "gear"] },
  { id: "m_n2", name: "铜质螺栓", rarity: "N", baseValue: 800, packId: "pack_machina", tags: ["machina", "gear"] },
  { id: "m_r1", name: "蒸汽阀门", rarity: "R", baseValue: 2100, packId: "pack_machina", tags: ["machina"] },
  { id: "m_r2", name: "发条机械犬", rarity: "R", baseValue: 2300, packId: "pack_machina", tags: ["machina", "beast"] },
  { id: "m_sr1", name: "钢铁巨像", rarity: "SR", baseValue: 5500, packId: "pack_machina", tags: ["machina", "golem"] },
  { id: "m_sr2", name: "蒸汽飞艇核心", rarity: "SR", baseValue: 6500, packId: "pack_machina", tags: ["machina", "core"] },
  { id: "m_ssr1", name: "天基泰坦机甲", rarity: "SSR", baseValue: 14000, packId: "pack_machina", tags: ["machina", "titan"] },

  // 6. 虚空星界包 (pack_astral, 进价 8,000G)
  // N卡 2800~3200G (37.5%)，R卡 8500~9500G (112.5%)，SR 22000~26000G (3.0x)，SSR 45000G (5.6x)
  // 10连平均回血 126600G (+58.2%)，10连亏损率 11.8%
  { id: "a_n1", name: "星尘微粒", rarity: "N", baseValue: 2800, packId: "pack_astral", tags: ["astral", "dust"] },
  { id: "a_n2", name: "虚空碎片", rarity: "N", baseValue: 3200, packId: "pack_astral", tags: ["astral"] },
  { id: "a_r1", name: "脉冲星辉", rarity: "R", baseValue: 8500, packId: "pack_astral", tags: ["astral"] },
  { id: "a_r2", name: "引力裂隙", rarity: "R", baseValue: 9500, packId: "pack_astral", tags: ["astral"] },
  { id: "a_sr1", name: "星云巨兽", rarity: "SR", baseValue: 22000, packId: "pack_astral", tags: ["astral", "ancient"] },
  { id: "a_sr2", name: "黑洞吞噬者", rarity: "SR", baseValue: 26000, packId: "pack_astral", tags: ["astral", "ancient"] },
  { id: "a_ssr1", name: "创世星尊·奥米茄", rarity: "SSR", baseValue: 45000, packId: "pack_astral", tags: ["astral", "deity"] },
];

export const pityPack: PackConfig = {
  id: "pack_pity",
  name: "乞丐保底包",
  basePrice: 5,
  unlockThreshold: 0,
  rates: { N: 75, R: 20, SR: 4, SSR: 1 },
  synergies: [
    {
      id: "pity_all",
      conditionDesc: "麻雀变凤凰",
      getHtml: (s) => `<span class="text-yellow-400">SR绝对概率+${(s * 1.0).toFixed(1)}%, SSR绝对概率+${(s * 0.3).toFixed(1)}%</span>`,
      getRequiredCards: (allCards) => allCards.filter(c => c.packId === "pack_pity").map(c => c.id),
    },
    {
      id: "pity_tools",
      conditionDesc: "工具收藏",
      getHtml: (s) => `<span class="text-blue-400">工具卡价值 +${(s * 0.4).toFixed(1)}G</span>`,
      getRequiredCards: (allCards) => allCards.filter(c => c.packId === "pack_pity" && c.tags?.includes("tool")).map(c => c.id),
    },
    {
      id: "pity_stone",
      conditionDesc: "顽石共鸣",
      getHtml: (s) => `<span class="text-purple-400">石头卡价值 +${(s * 0.6).toFixed(1)}G</span>`,
      getRequiredCards: (allCards) => allCards.filter(c => c.packId === "pack_pity" && c.tags?.includes("stone")).map(c => c.id),
    },
  ],
  pool: mockCards.filter(c => c.packId === "pack_pity"),
};

export const forestPack: PackConfig = {
  id: "pack_forest",
  name: "神秘森林包",
  basePrice: 25,
  unlockThreshold: 120,
  rates: { N: 68, R: 24, SR: 6.5, SSR: 1.5 },
  synergies: [
    {
      id: "forest_all",
      conditionDesc: "全图鉴",
      getHtml: (s) => `<span class="text-green-400">全局卡牌价值 +${s * 12}%</span>`,
      getRequiredCards: (allCards) => allCards.filter(c => c.packId === "pack_forest").map(c => c.id),
    },
    {
      id: "forest_plants",
      conditionDesc: "森林植被",
      getHtml: (s) => `<span class="text-emerald-400">植物价值 +${s * 4}G</span>`,
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
  basePrice: 120,
  unlockThreshold: 800,
  rates: { N: 60, R: 28, SR: 9.5, SSR: 2.5 },
  synergies: [
    {
      id: "ocean_all",
      conditionDesc: "全图鉴",
      getHtml: (s) => `<span class="text-cyan-400">单抽按原价返现 +${s * 5}%</span>`,
      getRequiredCards: (allCards) => allCards.filter(c => c.packId === "pack_ocean").map(c => c.id),
    },
    {
      id: "ocean_fish",
      conditionDesc: "群鱼游弋",
      getHtml: (s) => `<span class="text-blue-300">鱼类价值 +${s * 10}G</span>`,
      getRequiredCards: (allCards) => allCards.filter(c => c.packId === "pack_ocean" && c.tags?.includes("fish")).map(c => c.id),
    },
  ],
  pool: mockCards.filter(c => c.packId === "pack_ocean"),
};

export const firePack: PackConfig = {
  id: "pack_fire",
  name: "灼热烈焰包",
  basePrice: 500, 
  unlockThreshold: 4500,
  rates: { N: 52, R: 32, SR: 12, SSR: 4 },
  synergies: [
    {
      id: "fire_all",
      conditionDesc: "全图鉴",
      getHtml: (s) => `<span class="text-red-400">烈焰包进价 -${s * 10}%</span>`,
      getRequiredCards: (allCards) => allCards.filter(c => c.packId === "pack_fire").map(c => c.id),
    },
    {
      id: "fire_stone",
      conditionDesc: "余烬共鸣",
      getHtml: (s) => `<span class="text-purple-400">余烬卡价值 +${s * 15}G</span>`,
      getRequiredCards: (allCards) => allCards.filter(c => c.packId === "pack_fire" && c.tags?.includes("cinder")).map(c => c.id),
    },
  ],
  pool: mockCards.filter(c => c.packId === "pack_fire"),
};

export const machinaPack: PackConfig = {
  id: "pack_machina",
  name: "蒸汽机械包",
  basePrice: 2000,
  unlockThreshold: 25000,
  rates: { N: 45, R: 34, SR: 15, SSR: 6 },
  synergies: [
    {
      id: "machina_all",
      conditionDesc: "工业革命",
      getHtml: (s) => `<span class="text-amber-400">局内升级强化折扣 -${s * 6}%</span>`,
      getRequiredCards: (allCards) => allCards.filter(c => c.packId === "pack_machina").map(c => c.id),
    },
    {
      id: "machina_gear",
      conditionDesc: "齿轮连携",
      getHtml: (s) => `<span class="text-yellow-500">机械类卡牌价值 +${s * 40}G</span>`,
      getRequiredCards: (allCards) => allCards.filter(c => c.packId === "pack_machina" && c.tags?.includes("gear")).map(c => c.id),
    },
  ],
  pool: mockCards.filter(c => c.packId === "pack_machina"),
};

export const astralPack: PackConfig = {
  id: "pack_astral",
  name: "虚空星界包",
  basePrice: 8000,
  unlockThreshold: 150000,
  rates: { N: 38, R: 35, SR: 18, SSR: 9 },
  synergies: [
    {
      id: "astral_all",
      conditionDesc: "天道主宰",
      getHtml: (s) => `<span class="text-fuchsia-400">全场SSR卡售出价值 +${s * 25}%</span>`,
      getRequiredCards: (allCards) => allCards.filter(c => c.packId === "pack_astral").map(c => c.id),
    },
    {
      id: "astral_void",
      conditionDesc: "星界引力",
      getHtml: (s) => `<span class="text-purple-300">星界卡售出价值 +${s * 150}G</span>`,
      getRequiredCards: (allCards) => allCards.filter(c => c.packId === "pack_astral" && c.tags?.includes("astral")).map(c => c.id),
    },
  ],
  pool: mockCards.filter(c => c.packId === "pack_astral"),
};

export const availablePacks: PackConfig[] = [
  pityPack, 
  forestPack, 
  oceanPack, 
  firePack, 
  machinaPack, 
  astralPack
];

export const availableUpgrades: UpgradeConfig[] = [
  {
    id: "upgrade_luck",
    name: "幸运护符",
    basePrice: 50,
    priceMultiplier: 1.8,
    maxLevel: 10,
    unlockThreshold: 50,
    desc: (lvl) => `SR与SSR掉落权重提升 ${(lvl * 12)}%`,
  },
  {
    id: "upgrade_value",
    name: "鉴宝专家",
    basePrice: 80,
    priceMultiplier: 1.7,
    maxLevel: 10,
    unlockThreshold: 100,
    desc: (lvl) => `全局所有卡牌售出价格提升 ${(lvl * 8)}%`,
  },
  {
    id: "upgrade_refund",
    name: "拾荒补贴",
    basePrice: 30,
    priceMultiplier: 1.9,
    maxLevel: 10,
    unlockThreshold: 30,
    desc: (lvl) => `单次抽卡固定返还补贴 +${lvl} G`,
  },
  {
    id: "upgrade_discount",
    name: "大宗采购",
    basePrice: 120,
    priceMultiplier: 1.9,
    maxLevel: 10,
    unlockThreshold: 300,
    desc: (lvl) => `所有卡包购买价格降低 ${(lvl * 2)}%`,
  },
  {
    id: "upgrade_refund_pct",
    name: "VIP 返利",
    basePrice: 200,
    priceMultiplier: 2.1,
    maxLevel: 5,
    unlockThreshold: 1000,
    desc: (lvl) => `单抽按卡包基础售价额外返还 ${(lvl * 2)}%`,
  },
  {
    id: "upgrade_overclock",
    name: "变现超频",
    basePrice: 250,
    priceMultiplier: 2.0,
    maxLevel: 5,
    unlockThreshold: 1500,
    desc: (lvl) => `全部变现时额外享受 +${(lvl * 5)}% 军饷溢价`,
  },
  {
    id: "upgrade_barrage",
    name: "连抽风暴",
    basePrice: 600,
    priceMultiplier: 2.2,
    maxLevel: 5,
    unlockThreshold: 5000,
    desc: (lvl) => `十连抽必定额外获赠 +${lvl} 张随机卡牌`,
  },
];

export const metaSkills: MetaSkillConfig[] = [
  {
    id: "ms_start_funds",
    name: "遗产继承",
    baseCost: 10,
    costMultiplier: 1.8,
    maxLevel: 10,
    desc: (lvl) => `开启新轮回时初始资金增加 +${lvl * 15} G (基础100G，满级250G)`,
  },
  {
    id: "ms_luck",
    name: "欧皇转世",
    baseCost: 15,
    costMultiplier: 2.0,
    maxLevel: 10,
    desc: (lvl) => `全局永久提升高阶卡牌出现权重 +${lvl * 3}%`,
  },
  {
    id: "ms_value",
    name: "点石成金",
    baseCost: 20,
    costMultiplier: 2.0,
    maxLevel: 8,
    desc: (lvl) => `全局所有卡牌售出基础价值永久提升 +${lvl * 10}%`,
  },
  {
    id: "ms_discount",
    name: "商业特权",
    baseCost: 25,
    costMultiplier: 2.2,
    maxLevel: 8,
    desc: (lvl) => `全局卡包进价永久折扣 -${lvl * 3}%`,
  },
  {
    id: "ms_synergy_master",
    name: "共鸣大师",
    baseCost: 35,
    costMultiplier: 2.1,
    maxLevel: 5,
    desc: (lvl) => `所有卡包羁绊效果威力永久额外加成 +${lvl * 8}%`,
  },
  {
    id: "ms_recycle",
    name: "循环经济",
    baseCost: 30,
    costMultiplier: 2.0,
    maxLevel: 5,
    desc: (lvl) => `售出已有重复卡牌时额外返还 +${lvl * 4}% 军饷`,
  },
];
