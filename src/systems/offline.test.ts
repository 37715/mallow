import { describe, expect, it } from "vitest";
import { computeOfflineEarnings, liveIncomePerSecond } from "@/systems/offline";
import { ECONOMY_CONFIG } from "@/data/economy";

const HOUR_MS = 60 * 60 * 1000;

describe("liveIncomePerSecond", () => {
  it("matches pay/interval for a single common cat (seats are not the bottleneck)", () => {
    const expected = ECONOMY_CONFIG.baseVisitorPay / (ECONOMY_CONFIG.baseVisitorIntervalMs / 1000);
    expect(liveIncomePerSecond(1)).toBeCloseTo(expected);
  });

  it("caps visit throughput at high appeal (interval floor or seats, whichever binds)", () => {
    const visitSeconds =
      (ECONOMY_CONFIG.walkInDurationMs +
        ECONOMY_CONFIG.dwellDurationMs +
        ECONOMY_CONFIG.walkOutDurationMs) /
      1000;
    const seatCapPerSecond = ECONOMY_CONFIG.seatCount / visitSeconds;
    const intervalCapPerSecond = 1000 / ECONOMY_CONFIG.minVisitorIntervalMs;

    const payAt = (appeal: number) =>
      ECONOMY_CONFIG.baseVisitorPay *
      (1 + (appeal - 1) * ECONOMY_CONFIG.visitorPayBonusPerAppeal);
    // Per-visitor pay keeps growing with appeal, but visit *throughput* must not.
    const throughputAt = (appeal: number) => liveIncomePerSecond(appeal) / payAt(appeal);

    expect(throughputAt(1000)).toBeCloseTo(Math.min(seatCapPerSecond, intervalCapPerSecond));
    expect(throughputAt(2000)).toBeCloseTo(throughputAt(1000));
  });

  it("earns strictly more with more appeal", () => {
    expect(liveIncomePerSecond(2)).toBeGreaterThan(liveIncomePerSecond(1));
    expect(liveIncomePerSecond(5)).toBeGreaterThan(liveIncomePerSecond(2));
  });
});

describe("computeOfflineEarnings", () => {
  it("ignores short absences below the threshold", () => {
    expect(computeOfflineEarnings(1, ECONOMY_CONFIG.offline.minAwayMs - 1)).toBe(0);
    expect(computeOfflineEarnings(1, 0)).toBe(0);
    expect(computeOfflineEarnings(1, -5000)).toBe(0);
    expect(computeOfflineEarnings(1, Number.NaN)).toBe(0);
  });

  it("earns at the configured fraction of the live rate", () => {
    const away = HOUR_MS;
    const expected = Math.floor(
      liveIncomePerSecond(1) * (away / 1000) * ECONOMY_CONFIG.offline.rateMultiplier,
    );
    expect(computeOfflineEarnings(1, away)).toBe(expected);
  });

  it("stops accruing past the cap", () => {
    const atCap = computeOfflineEarnings(1, ECONOMY_CONFIG.offline.maxAccrualMs);
    expect(computeOfflineEarnings(1, ECONOMY_CONFIG.offline.maxAccrualMs * 3)).toBe(atCap);
    expect(atCap).toBeGreaterThan(0);
  });
});
