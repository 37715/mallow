import { GOALS, GOALS_SHOWN, goalById, type Goal, type GoalState } from "@/data/goals";

/**
 * Which goals are on offer, which are done, and what is owed.
 *
 * Pure, per §7 — the store hands it state and gets back a list. Nothing here
 * knows about the DOM, and the whole thing is testable without a renderer,
 * which matters because this is the ladder the game's retention now hangs on.
 */

export interface GoalView {
  goal: Goal;
  done: number;
  needed: number;
  /** 0–1. */
  fraction: number;
  /** Every part is finished, but the reward has not been taken yet. */
  ready: boolean;
}

/**
 * The goals to show, in list order: the first `GOALS_SHOWN` not yet claimed.
 *
 * **Completed-but-unclaimed goals stay in the list**, at the front. A reward
 * that banks itself is a number that appears while you are looking somewhere
 * else; making it a tap means the payoff lands where the player is looking,
 * which is the same argument §8 makes about the till.
 */
export function visibleGoals(state: GoalState, claimed: string[]): GoalView[] {
  const done = new Set(claimed);
  const open = GOALS.filter((goal) => !done.has(goal.id));
  const views = open.map((goal) => {
    const { done: at, needed } = goal.progress(state);
    return {
      goal,
      done: at,
      needed,
      fraction: needed <= 0 ? 1 : Math.min(1, at / needed),
      ready: at >= needed,
    };
  });
  // Ready ones first, so a finished goal is never pushed off the list by two
  // longer ones above it.
  const ready = views.filter((view) => view.ready);
  const rest = views.filter((view) => !view.ready);
  return [...ready, ...rest].slice(0, GOALS_SHOWN);
}

/** Is there a reward waiting to be collected? Drives the HUD's dot. */
export function hasClaimable(state: GoalState, claimed: string[]): boolean {
  return visibleGoals(state, claimed).some((view) => view.ready);
}

/**
 * What claiming `id` pays, or 0 if it is not actually finished.
 *
 * **Re-checked here rather than trusted from the view.** The panel is rendered
 * from a snapshot and the tick keeps running underneath it, so a claim arrives
 * with a stale idea of the world — and "the button was enabled when I drew it"
 * is exactly how the expansion price came to be charged wrong (§8).
 */
export function claimValue(state: GoalState, claimed: string[], id: string): number {
  if (claimed.includes(id)) return 0;
  const goal = goalById(id);
  if (!goal) return 0;
  const { done, needed } = goal.progress(state);
  return done >= needed ? goal.reward : 0;
}

/** How far through the whole ladder, for the panel's line at the top. */
export function ladderProgress(claimed: string[]): { done: number; total: number } {
  const valid = new Set(GOALS.map((goal) => goal.id));
  return {
    done: claimed.filter((id) => valid.has(id)).length,
    total: GOALS.length,
  };
}
