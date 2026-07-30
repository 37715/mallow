import { describe, expect, it } from "vitest";
import { purchaseNextCat } from "@/systems/economy";
import {
  ECONOMY_CONFIG,
  costForNextCat,
  visitorIntervalMs,
  visitorPayAmount,
} from "@/data/economy";
import { totalAppeal, RARITY_CONFIG, CAT_DEFINITIONS } from "@/data/cats";

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
