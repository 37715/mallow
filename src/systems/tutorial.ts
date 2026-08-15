import { bedCost } from "@/data/beds";
import { costForNextCat } from "@/data/economy";
import { shopItem } from "@/data/shop";

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
    case "buy-chair":
      return shopItem(FIRST_FURNITURE)?.price ?? 0;
    // Putting a piece down costs nothing — you have already paid for it.
    case "place-bed":
    case "place-chair":
      return 0;
    // **Inventing a blend is free** and must stay that way — see the note in
    // `store.createBlend`. The add-in that goes in it is given, not sold: see
    // `grantFirstIngredient`.
    case "pick-ingredient":
    case "invent-drink":
      return 0;
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
