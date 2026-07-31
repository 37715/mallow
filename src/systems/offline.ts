import { ECONOMY_CONFIG, visitorIntervalMs, visitorPayAmount } from "@/data/economy";
import { visitDurationMs, type CafeStats } from "@/systems/cafe";

/**
 * Offline earnings (§8): computed from elapsed wall-clock time on return,
 * derived from the same config and CafeStats the live loop uses so balancing
 * changes propagate automatically. Pure — no clocks, no storage.
 */

/**
 * Average money/sec the café earns while actively playing: one visitor pays
 * per spawn interval, but throughput is capped by seats — each visit occupies
 * a seat for the full walk-in + dwell + walk-out.
 */
export function liveIncomePerSecond(stats: CafeStats): number {
  const spawnsPerSecond = 1000 / visitorIntervalMs(stats.appeal);
  const seatCapPerSecond = (stats.seatCount * 1000) / visitDurationMs(stats);
  return (
    visitorPayAmount(stats.appeal, stats.payMultiplier) *
    Math.min(spawnsPerSecond, seatCapPerSecond)
  );
}

/** Whole-dollar earnings for `awayMs` away from the café. 0 below the minimum-away threshold. */
export function computeOfflineEarnings(stats: CafeStats, awayMs: number): number {
  const { minAwayMs, maxAccrualMs, rateMultiplier } = ECONOMY_CONFIG.offline;
  if (!Number.isFinite(awayMs) || awayMs < minAwayMs) return 0;
  const effectiveMs = Math.min(awayMs, maxAccrualMs);
  return Math.floor(liveIncomePerSecond(stats) * (effectiveMs / 1000) * rateMultiplier);
}
