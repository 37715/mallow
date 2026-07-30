/**
 * Tunable economy numbers for the Milestone 1 vertical slice.
 * Keep every balancing constant here — never inline in systems/ logic.
 */

export const ECONOMY_CONFIG = {
  /** Total seats available in the café (fixed for the M1 slice). */
  seatCount: 4,

  /** Starting money so the first purchase is reachable quickly (protects D1 pacing). */
  startingMoney: 20,

  /** Slowest time between visitor spawn attempts, with only one cat in the café. */
  baseVisitorIntervalMs: 4800,

  /** Fastest possible time between visitor spawn attempts, no matter how many cats. */
  minVisitorIntervalMs: 1500,

  /** How much each extra cat speeds up visitor arrivals — big enough that cat #2 feels busier. */
  visitorIntervalPerCat: 1600,

  /** Base money paid by a visitor when they finish their visit. */
  baseVisitorPay: 5,

  /** Extra fractional pay per cat beyond the first (cuter café → bigger tips). */
  visitorPayBonusPerExtraCat: 0.25,

  /** How long a visitor takes to walk from the door to their seat. */
  walkInDurationMs: 1200,

  /** How long a visitor sits before paying and leaving. */
  dwellDurationMs: 3200,

  /** How long a visitor takes to walk from their seat back out the door. */
  walkOutDurationMs: 1200,

  /** Base cost of the Nth additional cat (index 1 = second cat). Cost curve below. */
  baseCatCost: 25,

  /** Growth factor applied per additional cat already owned. */
  catCostGrowth: 1.6,
} as const;

/** Cost to buy the next cat, given how many cats are currently owned. */
export function costForNextCat(catsOwned: number): number {
  const extraCats = Math.max(0, catsOwned - 1);
  return Math.round(
    ECONOMY_CONFIG.baseCatCost * Math.pow(ECONOMY_CONFIG.catCostGrowth, extraCats),
  );
}

/** Interval between visitor spawn attempts, given how many cats are in the café. */
export function visitorIntervalMs(catsOwned: number): number {
  const reduction = Math.max(0, catsOwned - 1) * ECONOMY_CONFIG.visitorIntervalPerCat;
  return Math.max(
    ECONOMY_CONFIG.minVisitorIntervalMs,
    ECONOMY_CONFIG.baseVisitorIntervalMs - reduction,
  );
}

/** Money a visitor pays out when they finish their visit, given cats owned. */
export function visitorPayAmount(catsOwned: number): number {
  const extraCats = Math.max(0, catsOwned - 1);
  return (
    ECONOMY_CONFIG.baseVisitorPay +
    extraCats * ECONOMY_CONFIG.visitorPayBonusPerExtraCat * ECONOMY_CONFIG.baseVisitorPay
  );
}
