import { bedCost } from "@/data/beds";
import { costForNextCat } from "@/data/economy";
import { copyPrice, shopItem } from "@/data/shop";

/**
 * What the guided tutorial asks the player to *do*, and how to tell when
 * they've done it.
 *
 * Pure, so the whole walkthrough can be tested without a renderer, a store or
 * a café (§7). The guide in `entities/tutorial-guide.ts` supplies snapshots
 * and asks these two questions.
 *
 * **Completion is measured against a baseline, never against an absolute.**
 * The task is "adopt *a* cat", not "have two cats" — so it is answered by
 * comparing a snapshot taken when the step began with the one now. That is
 * what lets the same script work for someone replaying it with a full café as
 * for someone on their first morning, and it means a rebalance of any of the
 * cost curves can never quietly make a step impossible to finish.
 *
 * **A baseline turns every step into "buy one *more*", so a replay has to be
 * priced as a replay** (Ellis, 2026-08-23: *"if you press the walk me through
 * tutorial thing again … it gets stuck in an infinite loop of buying and
 * adopting a new cat over and over"*). On a first morning the free-looking
 * steps really are free — the first add-in is on the house, the armchair has
 * never been bought — so `taskCost` could return 0 for them and be right. On a
 * second run every one of those is a purchase at a *higher* price than the
 * first: the next add-in costs £90, the next armchair is a copy at 1.45× and
 * up. The till was topped up to zero for those steps, so the walkthrough
 * dead-ended on "pick a flavour" with £22 in the till and no way past it —
 * and the only door out of a step that never completes was starting the whole
 * thing again, which bought another bed and another cat each time round.
 *
 * Two rules come out of that, and they are the general version:
 *
 * 1. **Ask what the step costs *this* café, not what it costs a new one.**
 *    Every cost here is read from the same live curve the shop charges from,
 *    including the copy curve. A price the walkthrough works out for itself is
 *    a price that can disagree with the till (§8).
 * 2. **Some steps cannot be completed at any price** — the menu holds four
 *    blends, and the shelf runs out of add-ins. `taskPossible` says so, and
 *    the guide talks past those rather than waiting for something that will
 *    never happen. A step that cannot be finished must never be a step that is
 *    waited on.
 */

export type TaskId =
  | "buy-bed"
  | "place-bed"
  | "adopt"
  | "pick-ingredient"
  | "invent-drink"
  | "buy-chair"
  | "place-chair";

/** The only bits of the game the walkthrough looks at. */
export interface TutorialSnapshot {
  money: number;
  /** Cat beds in the café — capacity, so the thing that gates adopting. */
  beds: number;
  cats: number;
  /** Blends the player has invented. */
  blends: number;
  /** Pieces of furniture in the room, bought items and copies alike. */
  pieces: number;
  /**
   * How many times a piece has been committed to a position this session.
   *
   * **Buying and placing are different events**, and the walkthrough needs the
   * second one. Counting `pieces` meant "now put it down" completed the moment
   * you paid — so Mal congratulated you and left while the ghost was still
   * under your finger.
   */
  placements: number;
  /** Add-ins unlocked for blending. Zero of them makes a blend step a dead end. */
  ingredients: number;
  /**
   * What the next add-in the café is *allowed* to buy would cost, or null if
   * there isn't one — every flavour owned, or the rest above its level.
   *
   * Passed in rather than worked out here, because "allowed" is a question
   * about level and ownership that `data/drinks.ts` answers (`nextIngredient`)
   * and because the first one is free by a rule that lives in the store.
   */
  nextIngredientCost: number | null;
  /** Room on the menu for another blend. False at the cap of four. */
  canBlend: boolean;
  /** Armchairs already in the café. The next one is a copy, and copies cost more. */
  chairs: number;
}

/**
 * The seat the walkthrough has you buy and put down.
 *
 * **An armchair, not the low table.** Ellis: *"the low table doesnt even have
 * anywhere nice to fit."* He was right, and it was worse than awkward — a
 * table is not a seat, so the step taught the shop without giving the café
 * anywhere for the guests it had just explained. The armchair is a seat, it
 * has an authored spot the room was designed around, and putting it there is
 * the moment the café starts earning.
 */
export const FIRST_FURNITURE = "armchair";

/**
 * What this step costs *right now*.
 *
 * Read from the live cost curves rather than written down, because a tutorial
 * that hands over a hard-coded £140 is a tutorial that silently stops working
 * the day someone retunes `bedCost`. Zero means the step is free.
 */
export function taskCost(id: TaskId, snap: TutorialSnapshot): number {
  switch (id) {
    case "buy-bed":
      return bedCost(snap.beds);
    case "adopt":
      return costForNextCat(snap.cats);
    case "buy-chair": {
      const item = shopItem(FIRST_FURNITURE);
      if (!item) return 0;
      // **The same expression the shop's own price tag uses**, copy curve and
      // all — `copyPrice(item, 0)` is the plain price, so one call covers the
      // first armchair and the fourth. A walkthrough that quoted `item.price`
      // to somebody who already owns one topped the till up to a third of what
      // the till was about to charge (§8, "the price shown and the price
      // charged must be one call").
      return copyPrice(item, snap.chairs);
    }
    // Putting a piece down costs nothing — you have already paid for it.
    case "place-bed":
    case "place-chair":
      return 0;
    // **Free on a first morning, £90 on a replay.** The first add-in is on the
    // house (`firstIngredientIsFree`), which is where the 0 used to come from
    // — but the rule is about the *first*, and a second walkthrough is asking
    // for a second flavour. The caller reports the live price, free or not.
    case "pick-ingredient":
      return snap.nextIngredientCost ?? 0;
    // **Inventing a blend is free** and must stay that way — see the note in
    // `store.createBlend`. It can still be *impossible* once the menu is full;
    // that is `taskPossible`'s business, not a price.
    case "invent-drink":
      return 0;
  }
}

/**
 * Could the player finish this step at all, with enough money?
 *
 * Only two steps can answer no, and neither of them is about the till: a menu
 * already holding four blends has nowhere to put a fifth, and a café that has
 * bought every add-in its level allows has nothing left to pick. Both are
 * reachable only on a replay, which is exactly when nobody is watching for
 * them.
 *
 * A guide that waits on one of these waits for ever, and the player has no way
 * to tap past a task line — so the walkthrough must *talk past* an impossible
 * step instead (`entities/tutorial-guide.ts`). Pillar 1: no dead ends.
 */
export function taskPossible(id: TaskId, snap: TutorialSnapshot): boolean {
  switch (id) {
    case "pick-ingredient":
      return snap.nextIngredientCost !== null;
    case "invent-drink":
      return snap.canBlend;
    default:
      return true;
  }
}

/**
 * How much to top the till up to, so the step is always affordable.
 *
 * Ellis: *"you have just the right cash / make just the right amount."* So it
 * tops up to exactly the cost and no further — a walkthrough that leaves you
 * rich has spent the whole early game before it starts, and §8's early
 * pacing is most of what protects D1.
 *
 * Returns 0 when they can already afford it, which is the common case on a
 * replay and means the tutorial never hands money to someone who doesn't need
 * it.
 */
export function topUp(id: TaskId, snap: TutorialSnapshot): number {
  const cost = taskCost(id, snap);
  return Math.max(0, cost - snap.money);
}

/** Has the player done the thing, relative to when the step began? */
export function taskDone(id: TaskId, before: TutorialSnapshot, now: TutorialSnapshot): boolean {
  switch (id) {
    case "buy-bed":
      return now.beds > before.beds;
    case "adopt":
      return now.cats > before.cats;
    case "pick-ingredient":
      return now.ingredients > before.ingredients;
    case "invent-drink":
      return now.blends > before.blends;
    case "buy-chair":
      return now.pieces > before.pieces;
    // **Placing is its own event.** `pieces` goes up when you pay; this goes up
    // when you actually put the thing down.
    case "place-bed":
    case "place-chair":
      return now.placements > before.placements;
  }
}
