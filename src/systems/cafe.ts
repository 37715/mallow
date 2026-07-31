import { ECONOMY_CONFIG } from "@/data/economy";
import { UPGRADE_DEFINITIONS } from "@/data/upgrades";
import { RARITY_CONFIG, catDefinition } from "@/data/cats";
import { venueAt } from "@/data/venues";
import { levelOf, type UpgradeLevels } from "@/systems/upgrades";

/**
 * The café's live performance numbers, composed from the cats it houses, the
 * upgrades bought so far, and the venue it trades in (§8). This is the single
 * object every economy system reads — visitors, offline income, and the stat
 * readouts all agree because they all take a CafeStats.
 *
 * Pure: no clocks, no storage, no Three.js.
 */
export interface CafeStats {
  /** Combined draw of cats + décor, after contentment. Drives arrivals and tips. */
  appeal: number;
  /** How many guests can be seated at once — the throughput ceiling. */
  seatCount: number;
  /** Multiplier applied to every visitor payout, including the venue's. */
  payMultiplier: number;
  /** How long a guest sits before paying, after service upgrades. */
  dwellDurationMs: number;
}

/** Shortest a visit can ever get, so "quicker service" can't collapse to zero. */
const MIN_DWELL_MS = 600;

/** A cat, as far as the economy is concerned. */
export interface CatForStats {
  definitionId: string;
  /** Wall-clock ms until this cat stops being content. Absent = never petted. */
  contentUntil?: number;
}

/**
 * Appeal contributed by a set of cats at time `now` (wall-clock ms).
 *
 * Pass `now = 0` to value them *without* contentment — that's what offline
 * income uses, which is precisely why being present pays better than not.
 */
export function catAppeal(cats: CatForStats[], now: number): number {
  const { appealMultiplier } = ECONOMY_CONFIG.contentment;
  let total = 0;
  for (const cat of cats) {
    const base = RARITY_CONFIG[catDefinition(cat.definitionId).rarity].appeal;
    const content = cat.contentUntil !== undefined && cat.contentUntil > now;
    total += content ? base * appealMultiplier : base;
  }
  return total;
}

/** How many of these cats are currently content — drives the UI nudge. */
export function contentCatCount(cats: CatForStats[], now: number): number {
  return cats.filter((c) => c.contentUntil !== undefined && c.contentUntil > now).length;
}

/**
 * Compose the café's stats. `catAppealTotal` is the summed appeal of owned cats
 * (see `catAppeal` above); upgrades and the venue layer on top.
 */
export function cafeStats(
  catAppealTotal: number,
  levels: UpgradeLevels,
  venueIndex = 0,
): CafeStats {
  const venue = venueAt(venueIndex);

  let seats = venue.baseSeats;
  let appeal = catAppealTotal;
  let payMultiplier = venue.incomeMultiplier;
  let dwellReduction = 0;

  for (const definition of UPGRADE_DEFINITIONS) {
    const level = levelOf(levels, definition.id);
    if (level === 0) continue;
    const { seats: s, appeal: a, pay: p, dwell: d } = definition.perLevel;
    if (s) seats += s * level;
    if (a) appeal += a * level;
    // Upgrade pay bonuses are additive among themselves, then scaled by the
    // venue — so a venue move multiplies everything you've built, which is
    // what makes it read as a leap rather than an increment.
    if (p) payMultiplier += p * level * venue.incomeMultiplier;
    if (d) dwellReduction += d * level;
  }

  return {
    appeal,
    seatCount: seats,
    payMultiplier,
    dwellDurationMs: Math.max(
      MIN_DWELL_MS,
      ECONOMY_CONFIG.dwellDurationMs * (1 - Math.min(0.9, dwellReduction)),
    ),
  };
}

/** How long one guest occupies a seat, door to door. The seat-throughput divisor. */
export function visitDurationMs(stats: CafeStats): number {
  return (
    ECONOMY_CONFIG.walkInDurationMs + stats.dwellDurationMs + ECONOMY_CONFIG.walkOutDurationMs
  );
}
