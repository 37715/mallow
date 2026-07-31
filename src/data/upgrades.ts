/**
 * Café upgrade catalog (§8 — expansion + décor). Every tunable number lives
 * here; systems/ only reads it, so balancing is a data change, never a code one.
 *
 * Three levers, deliberately non-overlapping so each purchase reads clearly.
 * Seating is deliberately *not* one of them: the café is one small room, and
 * seats come from arranging furniture, not from an abstract upgrade level.
 *   decor   → raises appeal (guests arrive sooner AND tip more)
 *   brews   → raises pay per guest
 *   hands   → shortens each visit, so every seat serves more guests
 */

export type UpgradeId = "decor" | "brews";

export interface UpgradeEffect {
  /** Flat café appeal per level — a charming room pulls guests in like a cute cat does. */
  appeal?: number;
  /** Added to the pay multiplier per level (0.1 = +10% tips per level). */
  pay?: number;
}

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  /** Warm, plain-language description of what the player is buying. */
  description: string;
  /** Cheap cosy iconography until real art lands in M4. */
  icon: string;
  maxLevel: number;
  baseCost: number;
  costGrowth: number;
  perLevel: UpgradeEffect;
  /** Player-facing summary of what `level` levels currently gives. */
  summary: (level: number) => string;
}

export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = [
  {
    id: "decor",
    name: "Cosy touches",
    description: "Plants, lamps, little paintings. The room gets lovelier and busier.",
    icon: "🪴",
    maxLevel: 8,
    baseCost: 40,
    costGrowth: 1.55,
    perLevel: { appeal: 0.5 },
    summary: (level) => `+${(level * 0.6).toFixed(1)} appeal`,
  },
  {
    id: "brews",
    name: "Better brews",
    description: "Nicer beans, warmer mugs. Guests happily leave a little more.",
    icon: "☕",
    maxLevel: 8,
    baseCost: 120,
    costGrowth: 1.6,
    perLevel: { pay: 0.12 },
    summary: (level) => `+${Math.round(level * 10)}% tips`,
  },
];

const DEFINITIONS_BY_ID = new Map(UPGRADE_DEFINITIONS.map((d) => [d.id, d]));

export function upgradeDefinition(id: UpgradeId): UpgradeDefinition | undefined {
  return DEFINITIONS_BY_ID.get(id);
}

/** Cost of buying the next level, given how many levels are already owned. */
export function upgradeCost(definition: UpgradeDefinition, currentLevel: number): number {
  return Math.round(definition.baseCost * Math.pow(definition.costGrowth, currentLevel));
}

/** Number of décor props the scene needs to be able to reveal. */
export const MAX_DECOR_LEVEL = UPGRADE_DEFINITIONS.find((d) => d.id === "decor")!.maxLevel;
