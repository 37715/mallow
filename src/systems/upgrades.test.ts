import { describe, expect, it } from "vitest";
import {
  hasAffordableUpgrade,
  levelOf,
  nextLevelCost,
  purchaseUpgrade,
  totalUpgradeLevels,
} from "@/systems/upgrades";
import { UPGRADE_DEFINITIONS, upgradeDefinition } from "@/data/upgrades";

const DECOR = upgradeDefinition("decor")!;

describe("levelOf", () => {
  it("treats a missing upgrade as level 0", () => {
    expect(levelOf({}, "decor")).toBe(0);
  });

  it("clamps junk and out-of-range levels from a tampered or stale save", () => {
    expect(levelOf({ decor: -3 }, "decor")).toBe(0);
    expect(levelOf({ decor: 2.7 }, "decor")).toBe(2);
    expect(levelOf({ decor: 999 }, "decor")).toBe(DECOR.maxLevel);
    expect(levelOf({ decor: Number.NaN }, "decor")).toBe(0);
  });
});

describe("nextLevelCost", () => {
  it("rises with each level owned", () => {
    let previous = 0;
    for (let level = 0; level < DECOR.maxLevel; level++) {
      const cost = nextLevelCost({ decor: level }, "decor");
      expect(cost).not.toBeNull();
      expect(cost!).toBeGreaterThan(previous);
      previous = cost!;
    }
  });

  it("is null once the upgrade is maxed", () => {
    expect(nextLevelCost({ decor: DECOR.maxLevel }, "decor")).toBeNull();
  });
});

describe("purchaseUpgrade", () => {
  it("fails without deducting when the player can't afford it", () => {
    const cost = nextLevelCost({}, "decor")!;
    const result = purchaseUpgrade(cost - 1, {}, "decor");
    expect(result.success).toBe(false);
    expect(result.moneyAfter).toBe(cost - 1);
    expect(result.levels).toEqual({});
  });

  it("succeeds at exactly the cost and raises the level by one", () => {
    const cost = nextLevelCost({}, "decor")!;
    const result = purchaseUpgrade(cost, {}, "decor");
    expect(result.success).toBe(true);
    expect(result.moneyAfter).toBe(0);
    expect(result.level).toBe(1);
    expect(result.levels.decor).toBe(1);
  });

  it("never mutates the levels it was given", () => {
    const levels = { decor: 1 };
    purchaseUpgrade(1_000_000, levels, "decor");
    expect(levels).toEqual({ decor: 1 });
  });

  it("refuses to go past the max level, however much money is on the table", () => {
    const maxed = { decor: DECOR.maxLevel };
    const result = purchaseUpgrade(1_000_000, maxed, "decor");
    expect(result.success).toBe(false);
    expect(result.moneyAfter).toBe(1_000_000);
    expect(result.level).toBe(DECOR.maxLevel);
  });
});

describe("totalUpgradeLevels", () => {
  it("sums across upgrades and ignores ids that no longer exist", () => {
    const levels = { decor: 2, brews: 3, "retired-upgrade": 9 } as Record<string, number>;
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
