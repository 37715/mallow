/**
 * The tip jar — a small thing on the counter that fills up while you are away
 * and gives it all back when you tap it.
 *
 * Ellis, 2026-08-26: *"would like to be able to buy a tip jar for cheap at
 * beginner level and then it slowly fills up and can be collected when full.
 * little thing on the counter."*
 *
 * ## What it is for
 *
 * The first hour of a café has almost nothing to *do* — that is the hole the
 * chores were built for (§8), and this is the same hole from the other side.
 * A chore asks for a minute of attention; the jar asks for nothing at all and
 * simply rewards coming back. Between them the early game has both a thing to
 * do and a reason to return, which is exactly the D1/D7 pair §4 is measured on.
 *
 * ## Three rules it follows
 *
 * - **The tips are a bonus, not a tax.** They are minted on top of what a
 *   visitor pays, never skimmed off it. A jar that quietly took a cut of the
 *   till and handed it back later would be the same money with an extra step
 *   and a worse feeling.
 * - **It only opens when it is full.** A jar you can empty at any level
 *   teaches people to tap it constantly — the opposite of a small pleasure.
 * - **It stops when full and loses nothing.** Overflow is simply not
 *   collected; nothing is ever wasted for having been away too long, which
 *   would be a punishment for absence (pillar 1).
 */

/** Catalogue id, so the room and the economy agree on what "owning it" means. */
export const TIP_JAR_ITEM = "tip-jar";

/**
 * Where the jar stands, in world units — on the counter by the till.
 *
 * The marker floats here, so it wants to be the *top* of the jar rather than
 * its base.
 */
export const TIP_JAR_AT = { x: -0.62, y: 1.02, z: 0.84 };

/**
 * How much a full jar holds.
 *
 * Deliberately small. It is pocket change that says "somebody liked it here",
 * not an income strategy — the moment a jar is worth more than serving people,
 * the café stops being the game.
 */
export const TIP_JAR_CAPACITY = 45;

/**
 * The share of each payment that also drops into the jar.
 *
 * At a modest early café this fills it in roughly a quarter of an hour of play
 * and rather longer while away, which is the rhythm wanted: something waiting
 * when you next open the app, without ever being the reason you opened it.
 */
export const TIP_SHARE = 0.09;

/** Add a visitor's tip, never past the brim. */
export function addTips(tips: number, paid: number): number {
  if (!Number.isFinite(tips) || tips < 0) return 0;
  return Math.min(TIP_JAR_CAPACITY, tips + paid * TIP_SHARE);
}

/** Is there anything to collect? Only a full jar opens — see above. */
export function tipsReady(tips: number): boolean {
  return tips >= TIP_JAR_CAPACITY;
}

