import { describe, expect, it } from "vitest";
import {
  hasAffordableUpgrade,
  levelOf,
  nextLevelCost,
  purchaseUpgrade,
  totalUpgradeLevels,
} from "@/systems/upgrades";
import { UPGRADE_DEFINITIONS, upgradeDefinition } from "@/data/upgrades";

const SEATING = upgradeDefinition("seating")!;

describe("levelOf", () => {
  it("treats a missing upgrade as level 0", () => {
    expect(levelOf({}, "seating")).toBe(0);
  });

  it("clamps junk and out-of-range levels from a tampered or stale save", () => {
    expect(levelOf({ seating: -3 }, "seating")).toBe(0);
    expect(levelOf({ seating: 2.7 }, "seating")).toBe(2);
    expect(levelOf({ seating: 999 }, "seating")).toBe(SEATING.maxLevel);
    expect(levelOf({ seating: Number.NaN }, "seating")).toBe(0);
  });
});

describe("nextLevelCost", () => {
  it("rises with each level owned", () => {
    let previous = 0;
    for (let level = 0; level < SEATING.maxLevel; level++) {
      const cost = nextLevelCost({ seating: level }, "seating");
      expect(cost).not.toBeNull();
      expect(cost!).toBeGreaterThan(previous);
      previous = cost!;
    }
  });

  it("is null once the upgrade is maxed", () => {
    expect(nextLevelCost({ seating: SEATING.maxLevel }, "seating")).toBeNull();
  });
});

describe("purchaseUpgrade", () => {
  it("fails without deducting when the player can't afford it", () => {
    const cost = nextLevelCost({}, "seating")!;
    const result = purchaseUpgrade(cost - 1, {}, "seating");
    expect(result.success).toBe(false);
    expect(result.moneyAfter).toBe(cost - 1);
    expect(result.levels).toEqual({});
  });

  it("succeeds at exactly the cost and raises the level by one", () => {
    const cost = nextLevelCost({}, "seating")!;
    const result = purchaseUpgrade(cost, {}, "seating");
    expect(result.success).toBe(true);
    expect(result.moneyAfter).toBe(0);
    expect(result.level).toBe(1);
    expect(result.levels.seating).toBe(1);
  });

  it("never mutates the levels it was given", () => {
    const levels = { seating: 1 };
    purchaseUpgrade(1_000_000, levels, "seating");
    expect(levels).toEqual({ seating: 1 });
  });

  it("refuses to go past the max level, however much money is on the table", () => {
    const maxed = { seating: SEATING.maxLevel };
    const result = purchaseUpgrade(1_000_000, maxed, "seating");
    expect(result.success).toBe(false);
    expect(result.moneyAfter).toBe(1_000_000);
    expect(result.level).toBe(SEATING.maxLevel);
  });
});

describe("totalUpgradeLevels", () => {
  it("sums across upgrades and ignores ids that no longer exist", () => {
    const levels = { seating: 2, decor: 3, "retired-upgrade": 9 } as Record<string, number>;
    expect(totalUpgradeLevels(levels)).toBe(5);
  });
});

describe("hasAffordableUpgrade", () => {
  it("is false with no money and true once the cheapest is reachable", () => {
    const cheapest = Math.min(...UPGRADE_DEFINITIONS.map((d) => d.baseCost));
    expect(hasAffordableUpgrade(cheapest - 1, {})).toBe(false);
    expect(hasAffordableUpgrade(cheapest, {})).toBe(true);
  });

  it("is false when every upgrade is already maxed, however rich the player is", () => {
    const maxed = Object.fromEntries(
      UPGRADE_DEFINITIONS.map((d) => [d.id, d.maxLevel]),
    ) as Record<string, number>;
    expect(hasAffordableUpgrade(Number.MAX_SAFE_INTEGER, maxed)).toBe(false);
  });
});
