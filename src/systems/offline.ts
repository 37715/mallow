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

/**
 * Whole-dollar earnings for `awayMs` spent away from the café.
 *
 * Contented cats keep drawing custom after you close the app, for as long as
 * their contentment lasts — so the away window is split into two stretches:
 * `contentRemainingMs` at the contented rate, the remainder at the base rate.
 *
 * That split is doing real design work. Without it, a player who never opens
 * the app earns almost exactly what a player who checks in daily earns, which
 * is the "why bother playing" problem. With it, a thirty-second ritual — open
 * the app, pet your cats, close it — measurably outperforms not showing up,
 * while a player who forgets still collects their full base rate and loses
 * nothing. An invitation, not a punishment (§2, pillar 1).
 *
 * `stats` values the café with contentment applied; `baseStats` values it
 * without. Pass the same object twice for a café with no contented cats.
 */
export function computeOfflineEarnings(
  stats: CafeStats,
  awayMs: number,
  baseStats: CafeStats = stats,
  contentRemainingMs = 0,
): number {
  const { minAwayMs, maxAccrualMs, rateMultiplier } = ECONOMY_CONFIG.offline;
  if (!Number.isFinite(awayMs) || awayMs < minAwayMs) return 0;

  const effectiveMs = Math.min(awayMs, maxAccrualMs);
  const contentMs = Math.min(effectiveMs, Math.max(0, contentRemainingMs));
  const baseMs = effectiveMs - contentMs;

  const earned =
    liveIncomePerSecond(stats) * (contentMs / 1000) +
    liveIncomePerSecond(baseStats) * (baseMs / 1000);

  return Math.floor(earned * rateMultiplier);
}
