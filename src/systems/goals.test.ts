import { describe, expect, it } from "vitest";
import { GOALS, GOALS_SHOWN, cupsSold, furnitureCount, type GoalState } from "@/data/goals";
import { claimValue, hasClaimable, ladderProgress, visibleGoals } from "@/systems/goals";

/**
 * The goal ladder — the game's answer to "what now".
 *
 * §0 spent two months answering D7 with *content* (more furniture, more
 * colourways) and the honest read is that the game had systems and no
 * structure over them. These tests hold the structure: that the list is short,
 * ordered, finishable, and cannot pay twice.
 */

const EMPTY: GoalState = {
  cats: [],
  purchased: [],
  instances: [],
  placements: {},
  customDrinks: [],
  ingredients: [],
  drinks: [],
  sales: {},
  tiles: ["room"],
  upgrades: {},
  chores: {},
  openedAt: 0,
  placementsMade: 0,
};

describe("the ladder", () => {
  it("shows a short, ordered list rather than everything at once", () => {
    const views = visibleGoals(EMPTY, []);
    expect(views).toHaveLength(GOALS_SHOWN);
    // In catalogue order, so a new player meets the easy ones first.
    expect(views.map((v) => v.goal.id)).toEqual(GOALS.slice(0, GOALS_SHOWN).map((g) => g.id));
  });

  it("puts a finished goal at the front rather than letting it fall off", () => {
    // "serve twenty-five cups" is second in the list; finishing something
    // further down must not leave it stranded below two longer asks.
    const state: GoalState = { ...EMPTY, sales: { filter: 40 } };
    const views = visibleGoals(state, []);
    expect(views[0].goal.id).toBe("first-cups");
    expect(views[0].ready).toBe(true);
  });

  it("never offers a goal that has already been paid for", () => {
    const claimed = GOALS.slice(0, 2).map((g) => g.id);
    const ids = visibleGoals(EMPTY, claimed).map((v) => v.goal.id);
    for (const id of claimed) expect(ids).not.toContain(id);
  });

  it("pays only once, and only when actually finished", () => {
    const state: GoalState = { ...EMPTY, sales: { filter: 40 } };
    expect(claimValue(state, [], "first-cups")).toBeGreaterThan(0);
    // Re-checked against live state, not against what the panel drew: a claim
    // arrives from a snapshot and the tick keeps running underneath it.
    expect(claimValue(state, ["first-cups"], "first-cups")).toBe(0);
    expect(claimValue(EMPTY, [], "first-cups")).toBe(0);
    expect(claimValue(state, [], "no-such-goal")).toBe(0);
  });

  it("only lights the nudge when there is money waiting", () => {
    expect(hasClaimable(EMPTY, [])).toBe(false);
    expect(hasClaimable({ ...EMPTY, sales: { filter: 40 } }, [])).toBe(true);
  });

  it("runs out, and says so", () => {
    // A ladder with no end would be a treadmill; this one finishes and the
    // panel says the café is yours. §2 forbids the endless-chore feeling.
    const all = GOALS.map((g) => g.id);
    expect(visibleGoals(EMPTY, all)).toHaveLength(0);
    expect(ladderProgress(all)).toEqual({ done: GOALS.length, total: GOALS.length });
  });

  it("ignores a claimed id that is no longer in the catalogue", () => {
    // A retired goal must not keep counting towards "done", the same way a
    // removed upgrade stops counting rather than corrupting the save.
    expect(ladderProgress(["ghost-goal"]).done).toBe(0);
  });

  it("gives every goal a reward, a hint and a reachable target", () => {
    for (const goal of GOALS) {
      expect(goal.reward, goal.id).toBeGreaterThan(0);
      expect(goal.hint.length, goal.id).toBeGreaterThan(0);
      // Lowercase, like every other word the interface says (§9).
      expect(goal.label, goal.id).toBe(goal.label.toLowerCase());
      const { needed } = goal.progress(EMPTY);
      expect(needed, goal.id).toBeGreaterThan(0);
    }
  });

  it("has unique ids, because the save stores them", () => {
    expect(new Set(GOALS.map((g) => g.id)).size).toBe(GOALS.length);
  });

  it("counts cups and furniture the way the goals mean it", () => {
    expect(cupsSold({ filter: 3, latte: 4 })).toBe(7);
    // A negative tally in a corrupt save must not subtract from progress.
    expect(cupsSold({ filter: -5, latte: 4 })).toBe(4);
    expect(
      furnitureCount({
        ...EMPTY,
        purchased: ["armchair", "low-table"],
        instances: [{ id: "i1", item: "armchair", x: 0, z: 0 }],
      }),
    ).toBe(3);
  });
});
