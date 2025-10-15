/**
 * Core types for Deckscribe
 * Based on technical/data_model.md
 */

/**
 * User (minimal for now, no auth)
 */
export interface User {
  id: string; // e.g., "discord_1234"
  name: string; // e.g., "kpom"
}

/**
 * Lorcana ink colors
 */
export type InkColor = "Amber" | "Amethyst" | "Emerald" | "Ruby" | "Sapphire" | "Steel";

/**
 * Package - Reusable collection of cards without quantities
 * Packages are immutable once saved (isImmutable = true)
 */
export interface Package {
  id: string; // e.g., "pkg_draw_engine"
  name: string; // e.g., "Draw Engine"
  description: string; // e.g., "Reusable draw package"
  cards: string[]; // Lowercased card names: ["tiana - celebrating princess", "goofy - musketeer"]
  isImmutable: boolean; // Once true, cannot be edited
  created_at?: string; // ISO timestamp
}

/**
 * Deck - Container with ink identity that imports packages
 * Decks have exactly 2 ink colors
 */
export interface Deck {
  id: string; // e.g., "deck_amber_control"
  name: string; // e.g., "Amber/Steel Control"
  ink_identity: [InkColor, InkColor]; // Exactly 2 colors
  packages: string[]; // Package IDs: ["pkg_draw_engine", "pkg_removal"]
  created_at?: string; // ISO timestamp
}

/**
 * Build - Versioned snapshot of a deck with specific card quantities
 * Like a Git commit for decks
 */
export interface Build {
  id: string; // e.g., "build_v1"
  deck_id: string; // Parent deck
  name?: string; // Optional user name: "Aggro Test" or auto: "v1", "v2"
  card_counts: Record<string, number>; // {"tiana - celebrating princess": 2, "goofy - musketeer": 4}
  notes: string; // e.g., "Testing lower healing density"
  created_at: string; // ISO timestamp
  parent_build_id?: string; // For tracking lineage (optional)
}

/**
 * Lorcana card from API
 * Simplified version - actual API may have more fields
 */
export interface LorcanaCard {
  name: string; // Lowercased
  cost?: number;
  ink_cost?: number;
  color?: string;
  type?: string;
  rarity?: string;
  set?: string;
  image?: string;
  text?: string;
  [key: string]: any; // Allow additional fields from API
}

/**
 * API Response types
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
