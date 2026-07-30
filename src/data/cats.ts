/**
 * Placeholder cat visual/name data for the Milestone 1 slice.
 * Rarity tiers, personality, and player-naming land in Milestone 2 (§8) —
 * for now every cat is functionally identical, just visually distinct.
 */

export interface CatAppearance {
  /** Warm, cosy palette — see §9. Fur color. */
  furColor: number;
  /** Accent color for ears/paws/tail tip. */
  accentColor: number;
}

export const CAT_APPEARANCES: CatAppearance[] = [
  { furColor: 0xd97b4f, accentColor: 0xffffff }, // ginger — high contrast on cream floor
  { furColor: 0x8a6a52, accentColor: 0x3a2a20 }, // brown tabby
  { furColor: 0x2f2f2f, accentColor: 0xffffff }, // black & white
  { furColor: 0xe8c39e, accentColor: 0xffffff }, // cream
  { furColor: 0xc9c9c9, accentColor: 0x6e6e6e }, // grey
  { furColor: 0xffffff, accentColor: 0xf2c9c9 }, // white
];

export const DEFAULT_CAT_NAMES = [
  "Biscuit",
  "Mochi",
  "Clover",
  "Ember",
  "Pepper",
  "Hazel",
];

export function appearanceForIndex(index: number): CatAppearance {
  return CAT_APPEARANCES[index % CAT_APPEARANCES.length];
}

export function defaultNameForIndex(index: number): string {
  return DEFAULT_CAT_NAMES[index % DEFAULT_CAT_NAMES.length];
}
