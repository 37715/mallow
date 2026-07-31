import { describe, expect, it } from "vitest";
import { cafeStats, visitDurationMs } from "@/systems/cafe";
import { ECONOMY_CONFIG } from "@/data/economy";
import { UPGRADE_DEFINITIONS, upgradeDefinition } from "@/data/upgrades";

describe("cafeStats", () => {
  it("matches the pre-upgrade café when nothing has been bought", () => {
    const stats = cafeStats(3.5, {});
    expect(stats.appeal).toBe(3.5);
    expect(stats.seatCount).toBe(ECONOMY_CONFIG.baseSeatCount);
    expect(stats.payMultiplier).toBe(1);
    expect(stats.dwellDurationMs).toBe(ECONOMY_CONFIG.dwellDurationMs);
  });

  it("adds seats, appeal, tips and speed from their upgrades", () => {
    const stats = cafeStats(2, { seating: 3, decor: 2, brews: 4, hands: 2 });
    expect(stats.seatCount).toBe(ECONOMY_CONFIG.baseSeatCount + 3);
    expect(stats.appeal).toBeCloseTo(2 + 2 * 0.6);
    expect(stats.payMultiplier).toBeCloseTo(1 + 4 * 0.1);
    expect(stats.dwellDurationMs).toBeCloseTo(ECONOMY_CONFIG.dwellDurationMs * (1 - 2 * 0.08));
  });

  it("ignores upgrade ids that are no longer in the catalog", () => {
    const stats = cafeStats(1, { "retired-upgrade": 50 } as Record<string, number>);
    expect(stats).toEqual(cafeStats(1, {}));
  });

  it("keeps a visit meaningfully long even with every service upgrade maxed", () => {
    const hands = upgradeDefinition("hands")!;
    const stats = cafeStats(1, { hands: hands.maxLevel });
    expect(stats.dwellDurationMs).toBeGreaterThan(0);
    expect(visitDurationMs(stats)).toBeGreaterThan(ECONOMY_CONFIG.walkInDurationMs);
  });

  it("keeps every stat monotonically non-worsening as levels rise", () => {
    for (const definition of UPGRADE_DEFINITIONS) {
      const low = cafeStats(1, { [definition.id]: 0 });
      const high = cafeStats(1, { [definition.id]: definition.maxLevel });
      expect(high.seatCount).toBeGreaterThanOrEqual(low.seatCount);
      expect(high.appeal).toBeGreaterThanOrEqual(low.appeal);
      expect(high.payMultiplier).toBeGreaterThanOrEqual(low.payMultiplier);
      expect(high.dwellDurationMs).toBeLessThanOrEqual(low.dwellDurationMs);
    }
  });
});
