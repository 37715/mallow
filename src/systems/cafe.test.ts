import { describe, expect, it } from "vitest";
import { cafeStats, catAppeal, contentCatCount, visitDurationMs } from "@/systems/cafe";
import { ECONOMY_CONFIG } from "@/data/economy";
import { UPGRADE_DEFINITIONS, upgradeDefinition } from "@/data/upgrades";
import { RARITY_CONFIG } from "@/data/cats";

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

describe("contentment", () => {
  const NOW = 1_000_000;
  const cats = [
    { definitionId: "marmalade" },
    { definitionId: "marmalade", contentUntil: NOW + 60_000 },
    { definitionId: "marmalade", contentUntil: NOW - 60_000 }, // lapsed
  ];

  it("counts only cats whose contentment is still running", () => {
    expect(contentCatCount(cats, NOW)).toBe(1);
  });

  it("multiplies appeal for content cats and leaves the rest at base", () => {
    const base = RARITY_CONFIG.common.appeal;
    const { appealMultiplier } = ECONOMY_CONFIG.contentment;
    // Two cats at base (never petted + lapsed), one contented.
    expect(catAppeal(cats, NOW)).toBeCloseTo(base * 2 + base * appealMultiplier);
  });

  it("values the café without contentment when asked (the offline case)", () => {
    // Passing +Infinity means "no contentment is still running" — this is
    // exactly how offline income is valued, and why playing beats being away.
    expect(catAppeal(cats, Number.POSITIVE_INFINITY)).toBeCloseTo(RARITY_CONFIG.common.appeal * 3);
  });

  it("makes a petted café strictly more profitable than an unpetted one", () => {
    const petted = cafeStats(catAppeal(cats, NOW), {});
    const not = cafeStats(catAppeal(cats, Number.POSITIVE_INFINITY), {});
    expect(petted.appeal).toBeGreaterThan(not.appeal);
  });

  it("treats a cat that was never petted as simply not content — never worse", () => {
    // Pillar 1: contentment is an invitation, not a decay mechanic. A player
    // who ignores it must still earn the full base rate.
    const untouched = [{ definitionId: "marmalade" }];
    expect(catAppeal(untouched, NOW)).toBe(RARITY_CONFIG.common.appeal);
  });
});
