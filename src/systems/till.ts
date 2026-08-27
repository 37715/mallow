import { tillCapacityFor } from "@/data/upgrades";
import { levelOf, type UpgradeLevels } from "@/systems/upgrades";

/**
 * The till: where the café's takings sit until the player collects them.
 *
 * Ellis, 2026-08-26: *"lets make a till feature that collects up to 1k at first
 * and this is where all the money goes, u tap to collect to ur bank account.
 * that way u cant just go offline for 4 days and come back to being rich. the
 * limit for money is 9999 which it shouldnt be there should be no limit."*
 *
 * ## What this replaced, and why the swap is the whole idea
 *
 * The old design capped the **bank** at £9,999 and let every penny land in it
 * directly. That did bound the numbers, but it bounded the wrong thing: it
 * capped how much a player could *own*, so a café that was doing well was told
 * to stop. This caps how much can pile up **uncollected** instead. Nothing
 * limits what you can have; what is limited is the reward for being absent.
 *
 * Note what that does to the offline curve, because it is the point rather
 * than a side effect: `computeOfflineEarnings` already tapers and caps at
 * eight hours, but eight hours of a good café was still a windfall. Now four
 * days and four hours come home to the same full drawer, and the difference
 * between a player who checks in twice a day and one who checks in on Sunday
 * is the number of times the till got emptied.
 *
 * ## The rule that keeps it cosy
 *
 * **A full till stops taking money; it never loses any.** Pillar 1 — nothing
 * is taken away, nothing decays, no timer punishes you. The café simply has
 * nowhere to put the next coin, which is an invitation to come back rather
 * than a penalty for having been away. This is the same argument the old
 * ceiling was defended with (§8), and it is the half of it worth keeping.
 *
 * **It must never become the game.** If the till fills faster than the player
 * would naturally check in, tapping it stops being a small pleasure and starts
 * being a chore with no minigame attached — which is exactly the nag pillar 1
 * forbids. That is what the `till` upgrade is for: capacity is meant to grow
 * roughly in step with income, so the *rhythm* of collecting stays constant
 * while the café gets busier.
 */

/** What this café's till holds, given its upgrades. */
export function tillCapacity(upgrades: UpgradeLevels): number {
  return tillCapacityFor(levelOf(upgrades, "till"));
}

/**
 * Add takings to the till, stopping at the brim.
 *
 * Negative and non-finite earnings are ignored rather than trusted: this is
 * called every animation frame with a number computed from elapsed time, and
 * a clock that jumps backwards must not empty somebody's till.
 */
export function addToTill(till: number, earned: number, capacity: number): number {
  const held = Number.isFinite(till) ? Math.max(0, till) : 0;
  if (!Number.isFinite(earned) || earned <= 0) return Math.min(held, capacity);
  return Math.min(capacity, held + earned);
}

/**
 * How much of `earned` the till can actually take — what a welcome-back card
 * should promise, rather than what the café theoretically made.
 *
 * Kept separate from `addToTill` because "what landed" and "what it now holds"
 * are different questions, and answering the first by subtracting two of the
 * second is how a rounding error becomes money.
 */
export function tillRoom(till: number, capacity: number): number {
  const held = Number.isFinite(till) ? Math.max(0, till) : 0;
  return Math.max(0, capacity - held);
}

/** 0–1, for the fill bar. A capacity of 0 reads as full rather than dividing by it. */
export function tillFullness(till: number, capacity: number): number {
  if (!(capacity > 0)) return 1;
  return Math.min(1, Math.max(0, till) / capacity);
}

/**
 * Is the till at the brim, and therefore turning money away?
 *
 * A hair under, deliberately: the fill is a float accumulating fractions of a
 * penny, so it can sit at 999.9997 for ever and never satisfy `>= capacity`.
 * The HUD would then never show the café had stopped earning, which is the one
 * thing this state exists to say.
 */
export function tillIsFull(till: number, capacity: number): boolean {
  return tillFullness(till, capacity) >= 0.999;
}
