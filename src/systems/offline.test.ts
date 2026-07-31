import { describe, expect, it } from "vitest";
import { computeOfflineEarnings, liveIncomePerSecond } from "@/systems/offline";
import { cafeStats, visitDurationMs } from "@/systems/cafe";
import { ECONOMY_CONFIG } from "@/data/economy";
import { upgradeDefinition } from "@/data/upgrades";

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
    // If the floor ever binds first, seating and service upgrades silently stop
    // doing anything — the exact bug this economy was retuned to fix. Guard it.
    const hands = upgradeDefinition("hands")!;
    const seating = upgradeDefinition("seating")!;
    const maxed = cafeStats(1, { seating: seating.maxLevel, hands: hands.maxLevel });
    const seatCapPerSecond = maxed.seatCount / (visitDurationMs(maxed) / 1000);
    const floorCapPerSecond = 1000 / ECONOMY_CONFIG.minVisitorIntervalMs;
    expect(floorCapPerSecond).toBeGreaterThan(seatCapPerSecond);
  });

  it("makes seating pay off once a busy café is seat-limited", () => {
    // Enough appeal to sit on the spawn floor, so seats are what binds.
    const busy = 100;
    const base = liveIncomePerSecond(cafeStats(busy, {}));
    const roomier = liveIncomePerSecond(cafeStats(busy, { seating: 4 }));
    expect(roomier).toBeGreaterThan(base);

    // ...and does nothing for a sleepy café, where arrivals are the bottleneck.
    expect(liveIncomePerSecond(cafeStats(1, { seating: 4 }))).toBeCloseTo(
      liveIncomePerSecond(cafeStats(1, {})),
    );
  });
});

describe("computeOfflineEarnings", () => {
  it("ignores short absences below the threshold", () => {
    expect(computeOfflineEarnings(plain(1), ECONOMY_CONFIG.offline.minAwayMs - 1)).toBe(0);
    expect(computeOfflineEarnings(plain(1), 0)).toBe(0);
    expect(computeOfflineEarnings(plain(1), -5000)).toBe(0);
    expect(computeOfflineEarnings(plain(1), Number.NaN)).toBe(0);
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
    const upgraded = computeOfflineEarnings(cafeStats(3, { decor: 5, brews: 5 }), HOUR_MS);
    expect(upgraded).toBeGreaterThan(bare);
  });
});
