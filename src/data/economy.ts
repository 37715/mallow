/**
 * Tunable economy numbers for the Milestone 1 vertical slice.
 * Keep every balancing constant here — never inline in systems/ logic.
 */

export const ECONOMY_CONFIG = {
  /**
   * Seats in the café. Fixed by the room layout (`data/cafe-layout.ts`) — the
   * café is one small room now, so seating grows by *arranging furniture*, not
   * by buying an abstract upgrade level.
   */
  baseSeatCount: 6,

  /**
   * The till only holds so much. Money stops accruing at this ceiling.
   *
   * This is what actually *guarantees* the readable-money rule (§0). Without
   * it, any idle game accumulates forever once everything is bought — the
   * balance sim reached £34 million in thirty days purely by hoarding, which
   * is exactly the "figures such as £5 million" problem. Nothing is ever lost
   * and nothing is taken away; the till simply fills up, which is a gentle nudge
   * to go and spend it on something lovely.
   *
   * Four digits, deliberately: money should never need abbreviating.
   */
  tillCapacity: 9999,

  /** Starting money so the first purchase is reachable quickly (protects D1 pacing). */
  startingMoney: 40,

  /**
   * Slowest time between visitor spawn attempts, with one common cat in the
   * café. Twenty seconds: the café should feel *gently* active, a guest
   * drifting in now and then, not a queue. Frantic isn't cosy (§2).
   */
  baseVisitorIntervalMs: 20000,

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
  visitorRatePerAppeal: 0.1,

  /** Base money paid by a visitor when they finish their visit. */
  baseVisitorPay: 3,

  /** Extra fractional pay per point of appeal beyond the first (cuter café → bigger tips). */
  visitorPayBonusPerAppeal: 0.06,

  /** How long a visitor takes to walk from the door to their seat. */
  walkInDurationMs: 1200,

  /** How long a guest lingers before paying and leaving. Long on purpose —
   * watching someone settle in with a coffee is the point. */
  dwellDurationMs: 6000,

  /** How long a visitor takes to walk from their seat back out the door. */
  walkOutDurationMs: 1200,

  /**
   * Maximum cats living in the café. A hard cap, not a soft one.
   *
   * The old game let you accumulate fifty, which is why the room turned into a
   * pyramid of clipping cats and why each new one stopped meaning anything.
   * Five cats you know by name beats fifty you don't (§0 direction change) —
   * and five is exactly how many resting places the one-tile café has, so the
   * room never looks crowded.
   */
  maxCats: 5,

  /** Base cost of the Nth additional cat (index 1 = second cat). Cost curve below. */
  baseCatCost: 45,

  /**
   * Growth factor applied per additional cat already owned.
   *
   * Benchmarked against the genre: Cookie Clicker uses 1.15, which doubles a
   * building's price every 5 purchases. This was 1.6 — doubling every 1.5 cats
   * — which made every cat past ~25 a trap purchase you could never pay off,
   * killing the "one more cat" hook that is the whole point of the game (§8).
   *
   * With a hard cap of eight cats the curve only has to stay sensible over a
   * handful of purchases, so it can be steeper than Cookie Clicker's 1.15
   * without ever becoming a trap: the last cat lands around £1,800, which is
   * a real saving-up goal but still a readable number.
   *
   * Check this with `npm run balance` before changing it.
   */
  catCostGrowth: 1.45,

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
