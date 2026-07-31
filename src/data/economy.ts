/**
 * Tunable economy numbers for the Milestone 1 vertical slice.
 * Keep every balancing constant here — never inline in systems/ logic.
 */

export const ECONOMY_CONFIG = {
  /** Seats a brand-new café opens with. The seating upgrade adds more (data/upgrades). */
  baseSeatCount: 4,

  /** Starting money so the first purchase is reachable quickly (protects D1 pacing). */
  startingMoney: 20,

  /** Slowest time between visitor spawn attempts, with one common cat in the café. */
  baseVisitorIntervalMs: 4800,

  /**
   * Hard safety floor on the arrival interval. Kept well *below* the
   * seat-throughput cap of a fully-expanded café, so that seats — not this
   * floor — are what limits a busy room. If this ever binds first, the seating
   * and service upgrades silently stop doing anything; keep it low.
   */
  minVisitorIntervalMs: 250,

  /**
   * How much each point of appeal speeds up arrivals, as a *rate* multiplier:
   * interval = base / (1 + rate × (appeal − 1)).
   *
   * Multiplicative rather than subtractive on purpose. Subtracting a flat
   * amount per appeal point drove the interval into its floor within the first
   * minute of play, after which appeal only bought bigger tips and a bigger
   * café bought nothing at all. This curve has diminishing returns but never
   * flattens, so more appeal is always worth something.
   */
  visitorRatePerAppeal: 0.22,

  /** Base money paid by a visitor when they finish their visit. */
  baseVisitorPay: 5,

  /** Extra fractional pay per point of appeal beyond the first (cuter café → bigger tips). */
  visitorPayBonusPerAppeal: 0.25,

  /** How long a visitor takes to walk from the door to their seat. */
  walkInDurationMs: 1200,

  /** How long a visitor sits before paying and leaving, before service upgrades. */
  dwellDurationMs: 3200,

  /** How long a visitor takes to walk from their seat back out the door. */
  walkOutDurationMs: 1200,

  /** Base cost of the Nth additional cat (index 1 = second cat). Cost curve below. */
  baseCatCost: 25,

  /** Growth factor applied per additional cat already owned. */
  catCostGrowth: 1.6,

  /** Offline/idle earnings while the app is closed (§8 — idle income). */
  offline: {
    /** Fraction of the live income rate earned while away — away time is calmer, not dead. */
    rateMultiplier: 0.5,
    /** Longest away period that still accrues earnings. */
    maxAccrualMs: 8 * 60 * 60 * 1000,
    /** Away periods shorter than this are ignored (quick app switches, reloads). */
    minAwayMs: 60 * 1000,
  },
} as const;

/** Cost to buy the next cat, given how many cats are currently owned. */
export function costForNextCat(catsOwned: number): number {
  const extraCats = Math.max(0, catsOwned - 1);
  return Math.round(
    ECONOMY_CONFIG.baseCatCost * Math.pow(ECONOMY_CONFIG.catCostGrowth, extraCats),
  );
}

/**
 * Interval between visitor spawn attempts, given the café's total appeal
 * (see totalAppeal in data/cats — rarer cats draw visitors faster, §8).
 */
export function visitorIntervalMs(appeal: number): number {
  const rate = 1 + Math.max(0, appeal - 1) * ECONOMY_CONFIG.visitorRatePerAppeal;
  return Math.max(
    ECONOMY_CONFIG.minVisitorIntervalMs,
    ECONOMY_CONFIG.baseVisitorIntervalMs / rate,
  );
}

/**
 * Money a visitor pays out when they finish their visit, given the café's total
 * appeal and its pay multiplier (the "better brews" upgrade — 1 = no upgrades).
 */
export function visitorPayAmount(appeal: number, payMultiplier = 1): number {
  const extraAppeal = Math.max(0, appeal - 1);
  const pay =
    (ECONOMY_CONFIG.baseVisitorPay +
      extraAppeal * ECONOMY_CONFIG.visitorPayBonusPerAppeal * ECONOMY_CONFIG.baseVisitorPay) *
    payMultiplier;
  // Round to cents — keeps float dust out of saves and analytics.
  return Math.round(pay * 100) / 100;
}
