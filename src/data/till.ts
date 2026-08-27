import { levelOf, type UpgradeLevels } from "@/systems/upgrades";

/**
 * The till as a *thing on the counter* rather than a number in the corner.
 *
 * Ellis, 2026-08-27: *"ideally the till is a real object that can be upgraded
 * and tapped on to collect and is visible."* Three asks, and only one of them
 * was missing anything:
 *
 * - **Visible** — it already was. `ComputerCashier_A` has stood on the counter
 *   since the room was rebuilt from the reference render. Nothing said it was
 *   the till, which is the same as it not being one.
 * - **Tapped to collect** — the marker. See `TILL_AT` below.
 * - **Upgradeable** — the `till` upgrade has existed since the mechanic did,
 *   but it only ever moved a number. Now it changes the object.
 *
 * The mechanic itself lives in `systems/till.ts` and its capacity curve in
 * `data/upgrades.ts`; this file is only about the object. Same split as
 * `data/chores.ts` against `systems/chores.ts`.
 */

/**
 * Where the till stands, in world units.
 *
 * Taken from the cashier's own row in `data/cafe-layout.ts` (x −0.131,
 * z −0.296, sitting on the counter at y 0.78) and lifted to the top of it,
 * because the marker floats from here and should point at the thing rather
 * than at the counter it stands on — the same reason `TIP_JAR_AT` is the top
 * of the jar.
 *
 * **Not read back off the mesh**, and that is a deliberate difference from the
 * chore markers: the counter is authored architecture that nothing can move,
 * so there is no live position to go stale against. If the counter ever
 * becomes furniture, this has to follow it.
 */
export const TILL_AT = { x: -0.131, y: 1.06, z: -0.296 };

/**
 * The five tills the pack ships, in the order the upgrade unlocks them.
 *
 * **They are finishes, not bigger machines** — measured: all five are the same
 * 324 vertices and the same 0.59 × 0.49 × 0.19, differing only in which cells
 * of the atlas they sample. So this is the same trick as the woodwork
 * colourways (§8): where the pack has no second *model*, the upgrade buys a
 * second *look*.
 *
 * That is a modest reward and it is worth being honest that it is modest. It
 * earns its place because §8's rule is that a purchase must be **visible** —
 * the retired "cosy touches" upgrade died precisely for paying money to move a
 * hidden number — and until now `till` was the last lever in the game that did
 * exactly that. A till you can see getting smarter is the difference between
 * buying a statistic and furnishing a café.
 *
 * Six upgrade levels, five assets: the last two share. The alternative is a
 * sixth finish that does not exist.
 */
const TILL_ASSETS = [
  "ComputerCashier_A",
  "ComputerCashier_B",
  "ComputerCashier_D",
  "ComputerCashier_C",
  "ComputerCashier_E",
] as const;

/** Which till stands on the counter at this upgrade level. */
export function tillAsset(level: number): string {
  const at = Math.max(0, Math.min(TILL_ASSETS.length - 1, Math.floor(level)));
  return TILL_ASSETS[at];
}

/** Convenience for callers holding a whole save's worth of upgrades. */
export function tillAssetFor(upgrades: UpgradeLevels): string {
  return tillAsset(levelOf(upgrades, "till"));
}

/**
 * How full the drawer has to be before the café asks you to cash up.
 *
 * **A quarter, not full**, and the difference from the tip jar is the point.
 * The jar only opens when it is full, because a jar you can empty at any level
 * teaches people to tap it constantly for pennies. The till is the opposite
 * shape: it is the café's actual income, it *stops taking money* at the brim,
 * and a player who only ever collects at 100% has been quietly wasting the
 * capacity they paid to increase. So it asks early enough to be worth doing
 * and late enough not to be a pest.
 */
export const TILL_PROMPT_FRACTION = 0.25;

/** Is there enough in the drawer to be worth walking over for? */
export function tillWorthCollecting(till: number, capacity: number): boolean {
  return till >= Math.max(1, capacity * TILL_PROMPT_FRACTION);
}
