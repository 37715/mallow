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
 * (`ShopItem.appeal`); this list keeps the levers that genuinely aren't a
 * thing you place:
 *   brews → raises pay per guest
 *   till  → raises what the till holds before it stops taking money
 *
 * Before adding another, check it isn't better expressed as something the
 * player can put down and look at. **`till` was checked against that and it
 * passes, narrowly**: a bigger till is a *capacity*, and the shop has no
 * vocabulary for capacity — every item it sells grants appeal, which is a rate.
 * The nearest thing the game has to precedent is the cat bed, where a bought
 * object grants the right to another cat; the difference is that the counter
 * is authored architecture and nobody is going to place a second one. If a
 * "second register" ever exists as furniture, this lever should die and be
 * replaced by it, exactly the way `seating` and `decor` died.
 */

import { ECONOMY_CONFIG } from "@/data/economy";

export type UpgradeId = "brews" | "till";

export interface UpgradeEffect {
  /** Flat café appeal per level — a charming room pulls guests in like a cute cat does. */
  appeal?: number;
  /** Added to the pay multiplier per level (0.1 = +10% tips per level). */
  pay?: number;
  /**
   * Multiplies what the till holds, per level (0.6 = +60% of the base each).
   *
   * Additive on the *base* rather than compounding, so the curve is legible
   * from the summary line: level 3 is four times the starting till, not 4.1×.
   */
  till?: number;
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
  {
    id: "till",
    name: "a bigger till",
    // What it really buys is *time away*, and the description should say so —
    // "holds more" is a stat, "you can leave it longer" is the reason to care.
    // **Says what changes on screen, not just what changes in the maths.** §8
    // requires a purchase to be *visible*, and until 2026-08-27 this was the
    // last lever in the game that moved a hidden number — the same fault that
    // retired "cosy touches". Each level now puts a smarter till on the
    // counter (`data/till.ts`), so the description can promise something the
    // player will actually see.
    description: "a deeper drawer, and a smarter till on the counter. it takes more before it stops, so you can leave the café longer.",
    icon: "coin",
    // **Six levels, taking 1,000 to 4,000.** Enough that a busy café isn't
    // emptying its till every ten minutes, and not so much that the till stops
    // meaning anything — at which point we are back to hoarding for a month
    // and the whole mechanic was for nothing.
    maxLevel: 6,
    baseCost: 260,
    costGrowth: 1.7,
    perLevel: { till: 0.5 },
    summary: (level) => `holds ${formatTill(tillCapacityFor(level))}`,
  },
];

/**
 * What the till holds at a given `till` upgrade level.
 *
 * Lives here rather than in `systems/` because it is a tunable number (§14),
 * and it is read by the tick, the offline calculation, the HUD and the
 * upgrade's own summary line — four places that must agree, so there is
 * exactly one of it.
 */
export function tillCapacityFor(level: number): number {
  const definition = DEFINITIONS_BY_ID.get("till");
  const per = definition?.perLevel.till ?? 0;
  const steps = Math.max(0, Math.min(definition?.maxLevel ?? 0, Math.floor(level)));
  return Math.round(ECONOMY_CONFIG.tillCapacity * (1 + per * steps));
}

/** Thousands separator, without pulling the UI's money formatter into /data. */
function formatTill(value: number): string {
  return `$${value.toLocaleString("en-GB")}`;
}

const DEFINITIONS_BY_ID = new Map(UPGRADE_DEFINITIONS.map((d) => [d.id, d]));

export function upgradeDefinition(id: UpgradeId): UpgradeDefinition | undefined {
  return DEFINITIONS_BY_ID.get(id);
}

/** Cost of buying the next level, given how many levels are already owned. */
export function upgradeCost(definition: UpgradeDefinition, currentLevel: number): number {
  return Math.round(definition.baseCost * Math.pow(definition.costGrowth, currentLevel));
}
