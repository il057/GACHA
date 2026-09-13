export type Rarity = 'N' | 'R' | 'SR' | 'SSR';

export interface Card {
  id: string;
  name: string;
  rarity: Rarity;
  baseValue: number;
  packId: string;
  tags?: string[];
}

export interface PackConfig {
  id: string;
  name: string;
  basePrice: number;
  rates: Record<Rarity, number>; // Base rates/weights 
  unlockThreshold: number; // Max gold needed in a single run to unlock
  pool: Card[];
  synergies?: SynergyConfig[];
}

export interface SynergyConfig {
  id: string;
  conditionDesc: string;
  getHtml: (stars: number) => string;
  getRequiredCards: (allCards: Card[]) => string[];
}

export interface UpgradeConfig {
  id: string;
  name: string;
  basePrice: number;
  priceMultiplier: number;
  maxLevel: number;
  unlockThreshold?: number;
  desc: (level: number) => string;
}

export interface MetaSkillConfig {
  id: string;
  name: string;
  baseCost: number;
  costMultiplier: number;
  maxLevel: number;
  desc: (level: number) => string;
}
