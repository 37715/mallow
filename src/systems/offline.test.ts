import { describe, expect, it } from "vitest";
import { computeOfflineEarnings, liveIncomePerSecond } from "@/systems/offline";
import { cafeStats, visitDurationMs } from "@/systems/cafe";
import { ECONOMY_CONFIG } from "@/data/economy";

const HOUR_MS = 60 * 60 * 1000;

/** A café with `appeal` worth of cats and no upgrades bought. */
const plain = (appeal: number) => cafeStats(appeal, {});

describe("liveIncomePerSecond", () => {
  it("matches pay/interval for a single common cat (seats are not the bottleneck)", () => {
    const expected = ECONOMY_CONFIG.baseVisitorPay / (ECONOMY_CONFIG.baseVisitorIntervalMs / 1000);
    expect(liveIncomePerSecond(plain(1))).toBeCloseTo(expected);
  });

  it("caps visit throughput at high appeal (interval floor or seats, whichever binds)", () => {
    const stats = plain(1000);
    const seatCapPerSecond = stats.seatCount / (visitDurationMs(stats) / 1000);
    const intervalCapPerSecond = 1000 / ECONOMY_CONFIG.minVisitorIntervalMs;

    const payAt = (appeal: number) =>
      ECONOMY_CONFIG.baseVisitorPay *
      (1 + (appeal - 1) * ECONOMY_CONFIG.visitorPayBonusPerAppeal);
    // Per-visitor pay keeps growing with appeal, but visit *throughput* must not.
    const throughputAt = (appeal: number) => liveIncomePerSecond(plain(appeal)) / payAt(appeal);

    expect(throughputAt(1000)).toBeCloseTo(Math.min(seatCapPerSecond, intervalCapPerSecond));
    expect(throughputAt(2000)).toBeCloseTo(throughputAt(1000));
  });

  it("earns strictly more with more appeal", () => {
    expect(liveIncomePerSecond(plain(2))).toBeGreaterThan(liveIncomePerSecond(plain(1)));
    expect(liveIncomePerSecond(plain(5))).toBeGreaterThan(liveIncomePerSecond(plain(2)));
  });

  it("keeps the arrival floor below what a maxed-out café can seat", () => {
    // If the floor ever binds first, the service upgrade silently stops doing
    // anything — the exact bug this economy was retuned to fix. Guard it.
    const maxed = cafeStats(1, {});
    const seatCapPerSecond = maxed.seatCount / (visitDurationMs(maxed) / 1000);
    const floorCapPerSecond = 1000 / ECONOMY_CONFIG.minVisitorIntervalMs;
    expect(floorCapPerSecond).toBeGreaterThan(seatCapPerSecond);
  });

  it("earns at the configured fraction of the live rate", () => {
    const away = HOUR_MS;
    const expected = Math.floor(
      liveIncomePerSecond(plain(1)) * (away / 1000) * ECONOMY_CONFIG.offline.rateMultiplier,
    );
    expect(computeOfflineEarnings(plain(1), away)).toBe(expected);
  });

  it("stops accruing past the cap", () => {
    const atCap = computeOfflineEarnings(plain(1), ECONOMY_CONFIG.offline.maxAccrualMs);
    expect(computeOfflineEarnings(plain(1), ECONOMY_CONFIG.offline.maxAccrualMs * 3)).toBe(atCap);
    expect(atCap).toBeGreaterThan(0);
  });

  it("pays out more for an upgraded café over the same absence", () => {
    const bare = computeOfflineEarnings(cafeStats(3, {}), HOUR_MS);
    const upgraded = computeOfflineEarnings(cafeStats(3, { brews: 5 }, 2.5), HOUR_MS);
    expect(upgraded).toBeGreaterThan(bare);
  });
});

describe("offline earnings with contentment", () => {
  const content = cafeStats(10 * ECONOMY_CONFIG.contentment.appealMultiplier, {});
  const base = cafeStats(10, {});

  it("pays the base rate when no contentment was left running", () => {
    expect(computeOfflineEarnings(content, HOUR_MS, base, 0)).toBe(
      computeOfflineEarnings(base, HOUR_MS, base, 0),
    );
  });

  it("pays more when the player petted their cats before closing the app", () => {
    const petted = computeOfflineEarnings(content, HOUR_MS, base, HOUR_MS);
    const not = computeOfflineEarnings(content, HOUR_MS, base, 0);
    expect(petted).toBeGreaterThan(not);
  });

  it("blends the two rates when contentment lapses partway through", () => {
    const half = computeOfflineEarnings(content, HOUR_MS, base, HOUR_MS / 2);
    const none = computeOfflineEarnings(content, HOUR_MS, base, 0);
    const all = computeOfflineEarnings(content, HOUR_MS, base, HOUR_MS);
    expect(half).toBeGreaterThan(none);
    expect(half).toBeLessThan(all);
  });

  it("does not pay for contentment beyond the away window", () => {
    const exact = computeOfflineEarnings(content, HOUR_MS, base, HOUR_MS);
    const overrun = computeOfflineEarnings(content, HOUR_MS, base, HOUR_MS * 10);
    expect(overrun).toBe(exact);
  });

  it("keeps playing strictly better than being away, hour for hour", () => {
    // The whole point of the rebalance: an hour present must beat an hour away.
    // If this ever inverts, the optimal strategy becomes "don't play".
    const playing = liveIncomePerSecond(content) * 3600;
    const away = computeOfflineEarnings(content, HOUR_MS, base, HOUR_MS);
    expect(playing).toBeGreaterThan(away * 2);
  });
});
