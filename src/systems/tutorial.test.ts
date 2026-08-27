import { describe, expect, it } from "vitest";
import { TUTORIAL_SCRIPT } from "@/data/tutorial";
import { bedCost } from "@/data/beds";
import { costForNextCat } from "@/data/economy";
import { SHOP_ITEMS, copyPrice, shopItem } from "@/data/shop";
import { ECONOMY_CONFIG } from "@/data/economy";
import { CAFE_LAYOUT } from "@/data/cafe-layout";
import {
  FIRST_FURNITURE,
  taskCost,
  taskDone,
  taskPossible,
  topUp,
  type TaskId,
  type TutorialSnapshot,
} from "@/systems/tutorial";

/** A first morning: nothing bought, the first flavour still free. */
const CAFE: TutorialSnapshot = {
  money: 0, beds: 1, cats: 1, blends: 0, pieces: 3, placements: 0, ingredients: 0,
  nextIngredientCost: 0, canBlend: true, chairs: 0,
};

/**
 * The same café on a second walkthrough: a flavour already on the shelf, an
 * armchair already in the room. Every "free" step has a price now.
 */
const REPLAY: TutorialSnapshot = {
  ...CAFE, money: 20, beds: 2, cats: 2, blends: 1, pieces: 5, placements: 4, ingredients: 1,
  nextIngredientCost: 90, chairs: 1,
};

/** Catalogue ids that put a seat in the room, read off the layout itself. */
const SEAT_ITEMS = new Set(
  CAFE_LAYOUT.filter((p) => p.seat && p.shopItem).map((p) => p.shopItem as string),
);

const ALL: TaskId[] = [
  "buy-bed", "place-bed", "adopt", "pick-ingredient", "invent-drink", "buy-chair", "place-chair",
];

describe("what the walkthrough asks for", () => {
  it("reads costs off the live curves, not hard-coded numbers", () => {
    // The point of this test is the *coupling*: retune bedCost or the cat curve
    // and the tutorial must follow, or it hands over the wrong money and the
    // step it just asked for becomes unaffordable.
    expect(taskCost("buy-bed", CAFE)).toBe(bedCost(CAFE.beds));
    expect(taskCost("adopt", CAFE)).toBe(costForNextCat(CAFE.cats));
    expect(taskCost("buy-chair", CAFE)).toBe(shopItem(FIRST_FURNITURE)!.price);
  });

  it("never charges for inventing a drink", () => {
    // §5's "the one genuinely mean thing" — the tutorial must not be where
    // that rule quietly breaks.
    expect(taskCost("invent-drink", CAFE)).toBe(0);
  });

  it("names a piece of furniture that is really in the shop", () => {
    expect(shopItem(FIRST_FURNITURE)).toBeDefined();
  });
});

describe("topping up the till", () => {
  it("gives exactly enough and not a penny more", () => {
    // Ellis: "you have just the right cash". A walkthrough that leaves you
    // rich has spent the early game before it starts.
    const broke = { ...CAFE, money: 0 };
    expect(topUp("buy-bed", broke)).toBe(bedCost(broke.beds));
    expect(broke.money + topUp("buy-bed", broke)).toBe(taskCost("buy-bed", broke));
  });

  it("gives nothing to a player who can already afford it", () => {
    const rich = { ...CAFE, money: 9999 };
    for (const id of ALL) expect(topUp(id, rich)).toBe(0);
  });

  it("tops up the shortfall only, when they are part way there", () => {
    const cost = bedCost(CAFE.beds);
    const partway = { ...CAFE, money: cost - 30 };
    expect(topUp("buy-bed", partway)).toBe(30);
  });

  it("never asks for money for a free step", () => {
    expect(topUp("invent-drink", { ...CAFE, money: 0 })).toBe(0);
  });

  /**
   * The bug Ellis found on 2026-08-23: *"if you press the walk me through
   * tutorial thing again … it gets stuck in an infinite loop of buying and
   * adopting a new cat over and over."* The walkthrough dead-ended on "pick a
   * flavour" with £22 in the till, because a step that is free on a first
   * morning is a £90 purchase on a second — and the only way out of a step
   * that never completes was starting the tour again, which bought another
   * bed and another cat every time round.
   */
  describe("on a second walkthrough", () => {
    it("hands over enough for the next flavour, which is no longer free", () => {
      expect(taskCost("pick-ingredient", REPLAY)).toBe(90);
      expect(REPLAY.money + topUp("pick-ingredient", REPLAY)).toBe(90);
    });

    it("hands over enough for a second armchair, which costs more than the first", () => {
      const chair = shopItem(FIRST_FURNITURE)!;
      const second = taskCost("buy-chair", REPLAY);
      expect(second).toBe(copyPrice(chair, REPLAY.chairs));
      expect(second).toBeGreaterThan(chair.price);
      expect(REPLAY.money + topUp("buy-chair", REPLAY)).toBe(second);
    });

    it("leaves the first of everything priced exactly as it always was", () => {
      expect(taskCost("pick-ingredient", CAFE)).toBe(0);
      expect(taskCost("buy-chair", CAFE)).toBe(shopItem(FIRST_FURNITURE)!.price);
    });
  });
});

describe("steps that cannot be finished at any price", () => {
  it("waits on a step the café can still do", () => {
    for (const id of ALL) expect(taskPossible(id, CAFE)).toBe(true);
  });

  it("gives up on a fifth blend once the menu is full", () => {
    // `createBlend` refuses past MAX_CUSTOM_DRINKS, so waiting here is waiting
    // for something that can never happen — and a task line cannot be tapped
    // past, so the player would be stuck for good.
    expect(taskPossible("invent-drink", { ...REPLAY, canBlend: false })).toBe(false);
  });

  it("gives up on a flavour when the shelf has nothing the café may buy", () => {
    // Null rather than a price: every add-in owned, or the rest above level.
    expect(taskPossible("pick-ingredient", { ...REPLAY, nextIngredientCost: null })).toBe(false);
    // And it must not then ask for money for it.
    expect(topUp("pick-ingredient", { ...REPLAY, nextIngredientCost: null, money: 0 })).toBe(0);
  });

  it("never gives up on a step that is only a matter of money", () => {
    // Buying, placing and adopting can always be reached by topping the till
    // up — if one of these ever returned false the walkthrough would talk
    // straight past the thing it exists to teach.
    const broke = { ...REPLAY, money: 0 };
    for (const id of ["buy-bed", "place-bed", "adopt", "buy-chair", "place-chair"] as TaskId[]) {
      expect(taskPossible(id, broke)).toBe(true);
    }
  });
});

describe("telling when a step is done", () => {
  it("measures against the baseline, so a full café can replay it", () => {
    // The task is "adopt *a* cat", not "have two cats" — someone replaying the
    // walkthrough with five cats must still be able to finish this step.
    const full: TutorialSnapshot = {
      money: 500, beds: 5, cats: 5, blends: 4, pieces: 20, placements: 9, ingredients: 3,
      nextIngredientCost: 90, canBlend: false, chairs: 2,
    };
    expect(taskDone("adopt", full, full)).toBe(false);
    expect(taskDone("adopt", full, { ...full, cats: 6 })).toBe(true);
  });

  it("does not count the wrong action as progress", () => {
    // Buying furniture must not satisfy "adopt a cat", or the walkthrough
    // skips a step the moment the player wanders off-script.
    const after = { ...CAFE, pieces: CAFE.pieces + 1, money: 999 };
    expect(taskDone("adopt", CAFE, after)).toBe(false);
    expect(taskDone("buy-bed", CAFE, after)).toBe(false);
    expect(taskDone("invent-drink", CAFE, after)).toBe(false);
    expect(taskDone("place-chair", CAFE, after)).toBe(false);
    expect(taskDone("buy-chair", CAFE, after)).toBe(true);
  });

  it("is false the instant a step begins, for every task", () => {
    // A task that reads as already-done would flash past without the player
    // touching anything — the failure that turns a walkthrough back into a
    // cutscene.
    for (const id of ALL) expect(taskDone(id, CAFE, CAFE)).toBe(false);
  });

  it("counts a bought copy as a bed, since capacity is what the step is about", () => {
    expect(taskDone("buy-bed", CAFE, { ...CAFE, beds: 2 })).toBe(true);
  });
});

describe("the script", () => {
  const tasks = TUTORIAL_SCRIPT.filter((line) => line.task);

  /**
   * **Furniture before the menu, and buy always immediately before place.**
   * Ellis, 2026-08-27: *"id prefer to learn to place furniture before learning
   * about the custom coffee thing."* Buying-and-placing is the verb of the
   * whole game; inventing a blend is an aside in a panel. Pinned as a list
   * because the order is a design decision rather than an accident of how the
   * script happens to be written.
   */
  it("walks through all four things, in Ellis's order", () => {
    expect(tasks.map((line) => line.task)).toEqual([
      "buy-bed",
      "place-bed",
      "adopt",
      "buy-chair",
      "place-chair",
      "pick-ingredient",
      "invent-drink",
    ]);
  });

  it("tells the player where to go for every task", () => {
    // A step that waits for an action without saying where to do it is a
    // dead end, and the player cannot tap past it — see `advance`.
    for (const line of tasks) {
      expect(line.waitHint, line.text).toBeTruthy();
    }
  });

  it("ends with a line that is not a task, so she can leave", () => {
    expect(TUTORIAL_SCRIPT[TUTORIAL_SCRIPT.length - 1].task).toBeUndefined();
  });
});

describe("a new café can always earn", () => {
  it("can afford a seat on day one, with no income at all", () => {
    // Emptying the starter café (Ellis: *"there should be nothing so the user
    // has room to place stuff"*) means a new one has **no seats**, so it earns
    // nothing until the first is bought. If the cheapest seat ever costs more
    // than the starting money, a player who skips the walkthrough is stuck for
    // good — no seats, no income, no way to buy a seat.
    const seats = SHOP_ITEMS.filter((item) => SEAT_ITEMS.has(item.id));
    expect(seats.length).toBeGreaterThan(0);
    const cheapest = Math.min(...seats.map((item) => item.price));
    expect(cheapest).toBeLessThanOrEqual(ECONOMY_CONFIG.startingMoney);
  });
});
