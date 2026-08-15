import { describe, expect, it } from "vitest";
import { cafeStats, catAppeal, contentCatCount } from "@/systems/cafe";
import { ECONOMY_CONFIG } from "@/data/economy";
import { UPGRADE_DEFINITIONS } from "@/data/upgrades";
import { RARITY_CONFIG } from "@/data/cats";
import { SHOP_ITEMS, furnitureAppeal } from "@/data/shop";

describe("cafeStats", () => {
  it("matches the pre-upgrade café when nothing has been bought", () => {
    const stats = cafeStats(3.5, {});
    expect(stats.appeal).toBe(3.5);
    expect(stats.seatCount).toBe(ECONOMY_CONFIG.baseSeatCount);
    expect(stats.payMultiplier).toBe(1);
    expect(stats.dwellDurationMs).toBe(ECONOMY_CONFIG.dwellDurationMs);
  });

  it("adds tips from the brews upgrade", () => {
    const stats = cafeStats(2, { brews: 4 });
    expect(stats.seatCount).toBe(ECONOMY_CONFIG.baseSeatCount);
    expect(stats.appeal).toBeCloseTo(2);
    expect(stats.payMultiplier).toBeCloseTo(1 + 4 * 0.12);
  });

  // Appeal used to come from a "cosy touches" upgrade level; it comes from the
  // furniture the player has actually put in the room now (§8).
  it("adds the appeal of everything furnished", () => {
    expect(cafeStats(2, {}, 1.4).appeal).toBeCloseTo(3.4);
  });

  it("values a fully furnished café well above a bare one", () => {
    const bare = cafeStats(1, {}, furnitureAppeal([]));
    const furnished = cafeStats(1, {}, furnitureAppeal(SHOP_ITEMS.map((i) => i.id)));
    expect(bare.appeal).toBe(1);
    expect(furnished.appeal).toBeGreaterThan(bare.appeal * 3);
  });

  it("ignores shop ids that are no longer in the catalogue", () => {
    expect(furnitureAppeal(["not-a-real-item"])).toBe(0);
  });

  it("ignores upgrade ids that are no longer in the catalog", () => {
    const stats = cafeStats(1, { "retired-upgrade": 50 } as Record<string, number>);
    expect(stats).toEqual(cafeStats(1, {}));
  });

  it("keeps every stat monotonically non-worsening as levels rise", () => {
    for (const definition of UPGRADE_DEFINITIONS) {
      const low = cafeStats(1, { [definition.id]: 0 });
      const high = cafeStats(1, { [definition.id]: definition.maxLevel });
      expect(high.seatCount).toBeGreaterThanOrEqual(low.seatCount);
      expect(high.appeal).toBeGreaterThanOrEqual(low.appeal);
      expect(high.payMultiplier).toBeGreaterThanOrEqual(low.payMultiplier);
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
