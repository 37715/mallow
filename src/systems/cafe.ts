import { ECONOMY_CONFIG } from "@/data/economy";
import { UPGRADE_DEFINITIONS } from "@/data/upgrades";
import { RARITY_CONFIG, catDefinition } from "@/data/cats";
import { levelOf, type UpgradeLevels } from "@/systems/upgrades";

/**
 * The café's live performance numbers, composed from the cats it houses and
 * the upgrades bought so far (§8). This is the single
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
  /** Multiplier applied to every visitor payout. 1 = no upgrades. */
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
export function cafeStats(catAppealTotal: number, levels: UpgradeLevels): CafeStats {
  let appeal = catAppealTotal;
  let payMultiplier = 1;

  for (const definition of UPGRADE_DEFINITIONS) {
    const level = levelOf(levels, definition.id);
    if (level === 0) continue;
    const { appeal: a, pay: p } = definition.perLevel;
    if (a) appeal += a * level;
    if (p) payMultiplier += p * level;
  }

  return {
    appeal,
    seatCount: ECONOMY_CONFIG.baseSeatCount,
    payMultiplier,
    dwellDurationMs: Math.max(MIN_DWELL_MS, ECONOMY_CONFIG.dwellDurationMs),
  };
}

/** How long one guest occupies a seat, door to door. The seat-throughput divisor. */
export function visitDurationMs(stats: CafeStats): number {
  return (
    ECONOMY_CONFIG.walkInDurationMs + stats.dwellDurationMs + ECONOMY_CONFIG.walkOutDurationMs
  );
}
