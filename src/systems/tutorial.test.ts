import { describe, expect, it } from "vitest";
import { TUTORIAL_SCRIPT } from "@/data/tutorial";
import { bedCost } from "@/data/beds";
import { costForNextCat } from "@/data/economy";
import { SHOP_ITEMS, shopItem } from "@/data/shop";
import { ECONOMY_CONFIG } from "@/data/economy";
import { CAFE_LAYOUT } from "@/data/cafe-layout";
import {
  FIRST_FURNITURE,
  taskCost,
  taskDone,
  topUp,
  type TaskId,
  type TutorialSnapshot,
} from "@/systems/tutorial";

const CAFE: TutorialSnapshot = {
  money: 0, beds: 1, cats: 1, blends: 0, pieces: 3, placements: 0, ingredients: 0,
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
});

describe("telling when a step is done", () => {
  it("measures against the baseline, so a full café can replay it", () => {
    // The task is "adopt *a* cat", not "have two cats" — someone replaying the
    // walkthrough with five cats must still be able to finish this step.
    const full: TutorialSnapshot = {
      money: 500, beds: 5, cats: 5, blends: 4, pieces: 20, placements: 9, ingredients: 3,
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

  it("walks through all four things, in Ellis's order", () => {
    expect(tasks.map((line) => line.task)).toEqual([
      "buy-bed",
      "place-bed",
      "adopt",
      "pick-ingredient",
      "invent-drink",
      "buy-chair",
      "place-chair",
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
