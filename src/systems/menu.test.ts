import { describe, expect, it } from "vitest";
import { menuItems, menuPayMultiplier, pickOrder, salesRanking } from "@/systems/menu";
import {
  INGREDIENTS,
  STARTER_DRINK_ID,
  baseDrink,
  blendPay,
  nextIngredient,
  type CustomDrink,
} from "@/data/drinks";

/**
 * The menu's economics. The load-bearing rule is that the café's multiplier is
 * the menu's **average** cup, not its total — that is what makes the menu a
 * question about what your café serves rather than a checklist.
 */
const blend = (over: Partial<CustomDrink> = {}): CustomDrink => ({
  id: "blend-1",
  name: "Ellis special",
  base: "latte",
  ingredients: ["honey"],
  ...over,
});

describe("menuItems", () => {
  it("always serves filter coffee, even if a save lost it", () => {
    expect(menuItems([], []).map((i) => i.id)).toEqual([STARTER_DRINK_ID]);
    expect(menuItems(["latte"], []).map((i) => i.id)).toContain(STARTER_DRINK_ID);
  });

  it("includes blends, priced from their base plus add-ins", () => {
    const items = menuItems(["latte"], [blend()]);
    const mine = items.find((i) => i.own);
    expect(mine?.pay).toBeCloseTo(blendPay(blend()), 6);
    expect(mine?.pay).toBeGreaterThan(baseDrink("latte")!.pay);
  });

  it("skips a blend whose base no longer exists", () => {
    expect(menuItems([], [blend({ base: "not-a-drink" })]).filter((i) => i.own)).toEqual([]);
  });
});

describe("menuPayMultiplier", () => {
  it("is 1 for a café that only sells filter coffee", () => {
    expect(menuPayMultiplier(menuItems([], []))).toBe(1);
  });

  it("rises when better drinks are added", () => {
    const plain = menuPayMultiplier(menuItems([], []));
    const better = menuPayMultiplier(menuItems(["latte", "mocha"], []));
    expect(better).toBeGreaterThan(plain);
  });

  /**
   * The rule that stops the menu being a checklist: it is an average, so a
   * café that serves one lovely drink beats one that serves it alongside four
   * cheap ones. Anyone rebalancing prices needs to know this is deliberate.
   */
  it("is an average, so padding the menu with cheap drinks lowers it", () => {
    const focused = menuPayMultiplier(menuItems(["matcha"], []));
    const padded = menuPayMultiplier(menuItems(["matcha", "flat-white"], []));
    expect(padded).toBeLessThan(focused);
  });
});

describe("pickOrder", () => {
  it("returns null for an empty menu rather than throwing", () => {
    expect(pickOrder([], 0.5)).toBeNull();
  });

  it("only ever returns something that is on the menu", () => {
    const items = menuItems(["latte", "mocha"], [blend()]);
    for (let roll = 0; roll <= 1; roll += 0.05) {
      const order = pickOrder(items, roll);
      expect(items).toContain(order);
    }
  });

  it("clamps a roll outside 0-1 instead of falling off the end", () => {
    const items = menuItems(["latte"], []);
    expect(pickOrder(items, -5)).not.toBeNull();
    expect(pickOrder(items, 5)).not.toBeNull();
  });
});

describe("salesRanking", () => {
  it("ranks by cups and keeps drinks that have never sold", () => {
    const items = menuItems(["latte", "mocha"], []);
    const rows = salesRanking(items, { mocha: 7, filter: 2 });

    expect(rows.map((r) => r.id)).toEqual(["mocha", "filter", "latte"]);
    expect(rows[0].share).toBe(1);
    expect(rows[2].cups).toBe(0);
    expect(rows).toHaveLength(items.length);
  });

  it("survives a sales record for a drink no longer on the menu", () => {
    const rows = salesRanking(menuItems([], []), { "blend-99": 400 });
    expect(rows.map((r) => r.id)).toEqual([STARTER_DRINK_ID]);
  });
});

/**
 * What the walkthrough reads to price its "pick a flavour" step. Both halves
 * of "may this café buy it" matter, and only one of them is about money — an
 * add-in above the café's level cannot be bought at any price, so quoting it
 * would top the till up for a jar the shelf still refuses to sell.
 */
describe("nextIngredient", () => {
  it("offers the cheapest thing the café is allowed to buy", () => {
    const next = nextIngredient([], 1);
    expect(next?.id).toBe("honey");
    expect(next?.level).toBeLessThanOrEqual(1);
  });

  it("skips what is already on the shelf", () => {
    expect(nextIngredient(["honey"], 2)?.id).not.toBe("honey");
  });

  it("never offers something the level gate would refuse", () => {
    // Level 1 knows only honey; taking that away leaves nothing, rather than
    // the next cheapest jar the café cannot have.
    expect(nextIngredient(["honey"], 1)).toBeNull();
  });

  it("runs out when every flavour is owned", () => {
    expect(nextIngredient(INGREDIENTS.map((i) => i.id), 99)).toBeNull();
  });
});
