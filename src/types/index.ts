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
}
