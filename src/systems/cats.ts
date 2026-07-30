import {
  CAT_DEFINITIONS,
  RARITY_CONFIG,
  RARITY_ORDER,
  type CatDefinition,
  type Rarity,
} from "@/data/cats";

/** Injectable randomness so draws are unit-testable with a seeded sequence. */
export type Rng = () => number;

/** Weighted rarity roll per RARITY_CONFIG. Pure given its rng. */
export function rollRarity(rng: Rng): Rarity {
  const totalWeight = RARITY_ORDER.reduce((sum, r) => sum + RARITY_CONFIG[r].weight, 0);
  let roll = rng() * totalWeight;
  for (const rarity of RARITY_ORDER) {
    roll -= RARITY_CONFIG[rarity].weight;
    if (roll < 0) return rarity;
  }
  return RARITY_ORDER[RARITY_ORDER.length - 1];
}

/**
 * Gacha-lite adoption draw (§5): roll a rarity tier, then pick uniformly
 * within it. Duplicates are allowed — every cat is an individual the player
 * names; the cat-dex tracks which breeds have been discovered.
 */
export function drawCatDefinition(rng: Rng = Math.random): CatDefinition {
  const rarity = rollRarity(rng);
  const pool = CAT_DEFINITIONS.filter((d) => d.rarity === rarity);
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[index];
}
