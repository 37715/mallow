import { describe, expect, it } from "vitest";
import { purchaseNextCat } from "@/systems/economy";
import {
  ECONOMY_CONFIG,
  costForNextCat,
  visitorIntervalMs,
  visitorPayAmount,
} from "@/data/economy";
import { totalAppeal, RARITY_CONFIG, CAT_DEFINITIONS } from "@/data/cats";
import { cafeStats } from "@/systems/cafe";
import { liveIncomePerSecond } from "@/systems/offline";

describe("purchaseNextCat", () => {
  it("fails without deducting when the player can't afford it", () => {
    const cost = costForNextCat(1);
    const result = purchaseNextCat(cost - 1, 1);
    expect(result.success).toBe(false);
    expect(result.moneyAfter).toBe(cost - 1);
  });

  it("succeeds at exactly the cost and deducts it", () => {
    const cost = costForNextCat(1);
    const result = purchaseNextCat(cost, 1);
    expect(result.success).toBe(true);
    expect(result.moneyAfter).toBe(0);
  });

  it("has a strictly increasing cost curve", () => {
    for (let owned = 1; owned < 10; owned++) {
      expect(costForNextCat(owned + 1)).toBeGreaterThan(costForNextCat(owned));
    }
  });
});

describe("appeal-based economy", () => {
  it("matches the M1 per-cat numbers when every cat is common (appeal 1 each)", () => {
    expect(visitorPayAmount(1)).toBe(ECONOMY_CONFIG.baseVisitorPay);
    expect(visitorIntervalMs(1)).toBe(ECONOMY_CONFIG.baseVisitorIntervalMs);
    expect(visitorPayAmount(2)).toBeCloseTo(
      ECONOMY_CONFIG.baseVisitorPay * (1 + ECONOMY_CONFIG.visitorPayBonusPerAppeal),
    );
  });

  it("never drops the visitor interval below the floor", () => {
    expect(visitorIntervalMs(1000)).toBe(ECONOMY_CONFIG.minVisitorIntervalMs);
  });

  it("gives rarer cats strictly more appeal", () => {
    expect(RARITY_CONFIG.legendary.appeal).toBeGreaterThan(RARITY_CONFIG.epic.appeal);
    expect(RARITY_CONFIG.epic.appeal).toBeGreaterThan(RARITY_CONFIG.rare.appeal);
    expect(RARITY_CONFIG.rare.appeal).toBeGreaterThan(RARITY_CONFIG.uncommon.appeal);
    expect(RARITY_CONFIG.uncommon.appeal).toBeGreaterThan(RARITY_CONFIG.common.appeal);
  });

  it("sums appeal across owned cats and tolerates unknown breed ids", () => {
    const common = CAT_DEFINITIONS.find((d) => d.rarity === "common")!;
    const legendary = CAT_DEFINITIONS.find((d) => d.rarity === "legendary")!;
    expect(totalAppeal([common.id, legendary.id])).toBeCloseTo(
      RARITY_CONFIG.common.appeal + RARITY_CONFIG.legendary.appeal,
    );
    // Unknown ids (removed content in an old save) fall back to the starter breed.
    expect(totalAppeal(["not-a-real-cat"])).toBe(RARITY_CONFIG.common.appeal);
  });
});

describe("cats stay worth buying", () => {
  /**
   * "One more cat" is the core hook (§8). If a cat costs more than it can ever
   * earn back, the hook is dead and the collection becomes a trap purchase —
   * which is exactly what happened at a 1.6 cost growth (benchmarked against
   * Cookie Clicker's 1.15, it was nearly 4x outside genre norms).
   */
  const AVG_CAT_APPEAL = (() => {
    const total = Object.values(RARITY_CONFIG).reduce((s, r) => s + r.weight, 0);
    return Object.values(RARITY_CONFIG).reduce(
      (sum, r) => sum + (r.weight / total) * r.appeal,
      0,
    );
  })();

  const paybackMinutes = (catsOwned: number): number => {
    const upgrades = { decor: 8, brews: 8 };
    const appeal = catsOwned * AVG_CAT_APPEAL;
    const before = liveIncomePerSecond(cafeStats(appeal, upgrades));
    const after = liveIncomePerSecond(cafeStats(appeal + AVG_CAT_APPEAL, upgrades));
    return costForNextCat(catsOwned) / (after - before) / 60;
  };

  it("pays every cat back within a sitting, right up to the cap", () => {
    // The last cat is allowed to be a bigger commitment than the first — that's
    // what makes a full house feel earned. What must never happen is a cat you
    // can't pay back at all, which is what killed the hook at 1.6 growth.
    for (let owned = 1; owned < ECONOMY_CONFIG.maxCats; owned++) {
      expect(paybackMinutes(owned), `cat #${owned + 1}`).toBeLessThan(60);
    }
    // ...and the early ones should be near-impulse buys.
    expect(paybackMinutes(1)).toBeLessThan(15);
  });

  it("keeps cost growth inside idle-genre norms", () => {
    // Cookie Clicker is 1.15 (doubles every 5 buildings). Ours is looser
    // because each cat is an individual you name rather than one of hundreds
    // of interchangeable buildings — but it must not run away.
    expect(ECONOMY_CONFIG.catCostGrowth).toBeGreaterThan(1.1);
    expect(ECONOMY_CONFIG.catCostGrowth).toBeLessThan(1.6);
  });
});
