/**
 * Café upgrade catalog. Every tunable number lives here; systems/ only reads
 * it, so balancing is a data change, never a code one.
 *
 * **There is one lever left, and that is the point.** Seating went when the
 * café became one small room — seats come from arranging furniture, not from
 * an abstract level. "Cosy touches" went on 2026-08-10, for the stronger
 * reason: it was *competing with the shop*. Ellis: *"the little touches cafe
 * upgrade seems to be stupid and takes away from the cafe builder aspect we
 * provide from the shop option."* Buying appeal from a menu and buying
 * furniture that grants appeal are the same purchase wearing two faces, and
 * only one of them shows up in the room. Appeal now lives on shop furniture
 * (`ShopItem.appeal`); this list keeps the one lever that genuinely isn't a
 * thing you place:
 *   brews → raises pay per guest
 *
 * Before adding another, check it isn't better expressed as something the
 * player can put down and look at.
 */

export type UpgradeId = "brews";

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
  /** Key into the icon set in `ui/icons.ts` — never an emoji. */
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
    id: "brews",
    name: "better brews",
    description: "nicer beans, warmer mugs. guests happily leave a little more.",
    icon: "bean",
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
