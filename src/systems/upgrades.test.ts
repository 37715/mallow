import { describe, expect, it } from "vitest";
import {
  hasAffordableUpgrade,
  levelOf,
  nextLevelCost,
  purchaseUpgrade,
  totalUpgradeLevels,
} from "@/systems/upgrades";
import { UPGRADE_DEFINITIONS, upgradeDefinition } from "@/data/upgrades";

const BREWS = upgradeDefinition("brews")!;

describe("levelOf", () => {
  it("treats a missing upgrade as level 0", () => {
    expect(levelOf({}, "brews")).toBe(0);
  });

  it("clamps junk and out-of-range levels from a tampered or stale save", () => {
    expect(levelOf({ brews: -3 }, "brews")).toBe(0);
    expect(levelOf({ brews: 2.7 }, "brews")).toBe(2);
    expect(levelOf({ brews: 999 }, "brews")).toBe(BREWS.maxLevel);
    expect(levelOf({ brews: Number.NaN }, "brews")).toBe(0);
  });
});

describe("nextLevelCost", () => {
  it("rises with each level owned", () => {
    let previous = 0;
    for (let level = 0; level < BREWS.maxLevel; level++) {
      const cost = nextLevelCost({ brews: level }, "brews");
      expect(cost).not.toBeNull();
      expect(cost!).toBeGreaterThan(previous);
      previous = cost!;
    }
  });

  it("is null once the upgrade is maxed", () => {
    expect(nextLevelCost({ brews: BREWS.maxLevel }, "brews")).toBeNull();
  });
});

describe("purchaseUpgrade", () => {
  it("fails without deducting when the player can't afford it", () => {
    const cost = nextLevelCost({}, "brews")!;
    const result = purchaseUpgrade(cost - 1, {}, "brews");
    expect(result.success).toBe(false);
    expect(result.moneyAfter).toBe(cost - 1);
    expect(result.levels).toEqual({});
  });

  it("succeeds at exactly the cost and raises the level by one", () => {
    const cost = nextLevelCost({}, "brews")!;
    const result = purchaseUpgrade(cost, {}, "brews");
    expect(result.success).toBe(true);
    expect(result.moneyAfter).toBe(0);
    expect(result.level).toBe(1);
    expect(result.levels.brews).toBe(1);
  });

  it("never mutates the levels it was given", () => {
    const levels = { brews: 1 };
    purchaseUpgrade(1_000_000, levels, "brews");
    expect(levels).toEqual({ brews: 1 });
  });

  it("refuses to go past the max level, however much money is on the table", () => {
    const maxed = { brews: BREWS.maxLevel };
    const result = purchaseUpgrade(1_000_000, maxed, "brews");
    expect(result.success).toBe(false);
    expect(result.moneyAfter).toBe(1_000_000);
    expect(result.level).toBe(BREWS.maxLevel);
  });
});

describe("totalUpgradeLevels", () => {
  it("sums across upgrades and ignores ids that no longer exist", () => {
    const levels = { brews: 3, "retired-upgrade": 9 } as Record<string, number>;
    expect(totalUpgradeLevels(levels)).toBe(3);
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
