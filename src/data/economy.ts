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

  /**
   * Petting a cat makes it content for a while, and content cats draw more
   * custom (§10 — the tap-to-pet interaction now *means* something).
   *
   * This is the only mechanic that rewards being present, and it exists
   * because without it active play earned exactly the same rate as leaving
   * the app closed — so the optimal strategy was not to play. It stays cosy
   * by being an invitation, never a punishment: an unpetted cat still earns
   * its full base rate, it simply doesn't get the bonus. Nothing is lost, no
   * timer runs out on you, and the duration is long enough that one unhurried
   * round of pets covers a whole evening.
   */
  contentment: {
    /** How long a pet keeps a cat content. Generous on purpose. */
    durationMs: 4 * 60 * 60 * 1000,
    /** A content cat's appeal is multiplied by this. */
    appealMultiplier: 1.75,
  },

  /** Offline/idle earnings while the app is closed (§8 — idle income). */
  offline: {
    /**
     * Fraction of the live income rate earned while away. Deliberately well
     * below 1: away time should be a kind catch-up, not a better strategy
     * than playing. Contentment does not apply offline, so the real gap
     * between "playing" and "closed" is wider than this number alone.
     */
    rateMultiplier: 0.3,
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
