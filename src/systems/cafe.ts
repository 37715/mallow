import { ECONOMY_CONFIG } from "@/data/economy";
import { UPGRADE_DEFINITIONS } from "@/data/upgrades";
import { levelOf, type UpgradeLevels } from "@/systems/upgrades";

/**
 * The café's live performance numbers, composed from the cats it houses and the
 * upgrades bought so far (§8). This is the single object every economy system
 * reads — visitors, offline income, and the debug/stat readouts all agree
 * because they all take a CafeStats.
 *
 * Pure: no clocks, no storage, no Three.js.
 */
export interface CafeStats {
  /** Combined draw of cats + décor. Drives arrival rate and tip size. */
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

/**
 * Compose the café's stats. `catAppeal` is the summed appeal of owned cats
 * (see totalAppeal in data/cats); upgrades layer on top of it.
 */
export function cafeStats(catAppeal: number, levels: UpgradeLevels): CafeStats {
  let seats = ECONOMY_CONFIG.baseSeatCount;
  let appeal = catAppeal;
  let payMultiplier = 1;
  let dwellReduction = 0;

  for (const definition of UPGRADE_DEFINITIONS) {
    const level = levelOf(levels, definition.id);
    if (level === 0) continue;
    const { seats: s, appeal: a, pay: p, dwell: d } = definition.perLevel;
    if (s) seats += s * level;
    if (a) appeal += a * level;
    if (p) payMultiplier += p * level;
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
