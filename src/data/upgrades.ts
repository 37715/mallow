/**
 * Café upgrade catalog (§8 — expansion + décor). Every tunable number lives
 * here; systems/ only reads it, so balancing is a data change, never a code one.
 *
 * Four levers, deliberately non-overlapping so each purchase reads clearly:
 *   seating → raises the throughput ceiling (more guests served at once)
 *   decor   → raises appeal (guests arrive sooner AND tip more)
 *   brews   → raises pay per guest
 *   hands   → shortens each visit, so every seat serves more guests
 */

export type UpgradeId = "seating" | "decor" | "brews" | "hands";

export interface UpgradeEffect {
  /** Extra seats per level. */
  seats?: number;
  /** Flat café appeal per level — a charming room pulls guests in like a cute cat does. */
  appeal?: number;
  /** Added to the pay multiplier per level (0.1 = +10% tips per level). */
  pay?: number;
  /** Fraction of base dwell time removed per level (0.08 = 8% quicker turnaround). */
  dwell?: number;
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
    id: "seating",
    name: "Another table",
    description: "One more seat by the window. More guests can settle in at once.",
    icon: "🪑",
    // Room fits 12 chairs; the roomiest venue starts with 6 (scene/room.ts).
    maxLevel: 6,
    baseCost: 140,
    costGrowth: 2.2,
    perLevel: { seats: 1 },
    summary: (level) => `+${level} seat${level === 1 ? "" : "s"}`,
  },
  {
    id: "decor",
    name: "Cosy touches",
    description: "Plants, lamps, little paintings. The room gets lovelier and busier.",
    icon: "🪴",
    maxLevel: 10,
    baseCost: 55,
    costGrowth: 1.95,
    perLevel: { appeal: 0.6 },
    summary: (level) => `+${(level * 0.6).toFixed(1)} appeal`,
  },
  {
    id: "brews",
    name: "Better brews",
    description: "Nicer beans, warmer mugs. Guests happily leave a little more.",
    icon: "☕",
    maxLevel: 10,
    baseCost: 110,
    costGrowth: 2.0,
    perLevel: { pay: 0.1 },
    summary: (level) => `+${Math.round(level * 10)}% tips`,
  },
  {
    id: "hands",
    name: "A helping hand",
    description: "Someone else behind the counter, so guests are served sooner.",
    icon: "🤲",
    maxLevel: 6,
    baseCost: 320,
    costGrowth: 2.5,
    perLevel: { dwell: 0.08 },
    summary: (level) => `${Math.round(level * 8)}% quicker visits`,
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

/** Total seats a fully-upgraded café can hold — the scene pre-plans this many spots. */
export const MAX_SEAT_UPGRADES =
  UPGRADE_DEFINITIONS.find((d) => d.id === "seating")!.maxLevel;

/** Number of décor props the scene needs to be able to reveal. */
export const MAX_DECOR_LEVEL = UPGRADE_DEFINITIONS.find((d) => d.id === "decor")!.maxLevel;
