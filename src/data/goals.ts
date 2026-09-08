import { ownedCount, type GameState } from "@/state/store";
import { beds } from "@/data/beds";
import { discoveredBreeds } from "@/state/store";

/**
 * The ladder — a list of small, named things to do next.
 *
 * ## Why this exists
 *
 * Ellis, 2026-09-08: *"finish the tutorial and i got 500 bux and idk what to
 * buy as a new user and dont know i should buy … i quickly run out of things
 * to do … this has no retention properties."*
 *
 * Every one of those is the same missing thing. The café had **systems** —
 * furniture, cats, a menu, floor to buy, colourways — and no **structure**
 * over them. A shop with fourteen unlocked rows and no opinion about which one
 * matters is not a choice, it is a wall of buttons; and a game whose only
 * prompt is a chore that comes due on a timer is telling the player their job
 * is maintenance.
 *
 * §0 has recorded "no answer to D7" for two months and reached for content
 * every time — more furniture, more colourways, more cats. That was the wrong
 * axis. **The genre's retention spine is a goal ladder**, not a bigger
 * catalogue: Animal Restaurant's entire loop is a list of small asks with a
 * payout, and it is what makes a catalogue *legible*. One more chair is only
 * interesting if something told you why you wanted it.
 *
 * ## The rules these follow
 *
 * - **Every goal names a verb the player already has.** Nothing here needs a
 *   new system; they observe state the game already keeps. That is what makes
 *   this content rather than code — a new goal is a row.
 * - **They pay out.** A goal with no reward is a checklist, and a checklist is
 *   homework. The payments are deliberately generous early: the £500 problem
 *   is that the walkthrough's gift is the *last* money a new café is given,
 *   and the first hour should feel like the café is helping.
 * - **Nothing expires and nothing is lost** (pillar 1). A goal sits there
 *   until it is done. There are no timed goals in here and there should not
 *   be: "do this before Friday" is the exact anxiety §1 forbids.
 * - **They complete while you are away.** "Serve 50 cups" ticks over offline,
 *   so coming back has something waiting — which is the honest version of a
 *   reason to return, as opposed to a punishment for not.
 * - **Ordered, not open.** Three are shown at a time, in list order, so a new
 *   player is never looking at fourteen possibilities. This is the answer to
 *   *"idk what to buy"*: the game says what to buy next, in one sentence.
 */

export interface Goal {
  id: string;
  /** The ask, in the player's words. Imperative, lowercase (§9). */
  label: string;
  /** Why it is worth doing — the bit that teaches, not just instructs. */
  hint: string;
  /** Coins on completion. */
  reward: number;
  /** How far along, 0–1, and the numbers to show. */
  progress: (state: GoalState) => { done: number; needed: number };
}

/** Everything a goal is allowed to look at. */
export type GoalState = Pick<
  GameState,
  | "cats"
  | "purchased"
  | "instances"
  | "placements"
  | "customDrinks"
  | "ingredients"
  | "drinks"
  | "sales"
  | "tiles"
  | "upgrades"
  | "chores"
  | "openedAt"
  | "placementsMade"
>;

/** Total cups sold, across every drink. */
export function cupsSold(sales: Record<string, number>): number {
  return Object.values(sales).reduce((total, cups) => total + Math.max(0, cups), 0);
}

/** How many separate pieces of furniture are standing in the café. */
export function furnitureCount(state: GoalState): number {
  return state.purchased.length + state.instances.length;
}

const counted = (done: number, needed: number) => ({ done: Math.min(done, needed), needed });

/**
 * In order. The first few are the first session; the rest are the first week.
 *
 * **The early ones are deliberately things the player was about to do anyway.**
 * A ladder that opens with a demand is a ladder nobody climbs; these start by
 * paying for what the walkthrough just taught, so the mechanism is understood
 * before it asks for anything.
 */
export const GOALS: Goal[] = [
  {
    id: "settle-in",
    label: "put down three pieces of furniture",
    hint: "everything you place makes the café lovelier, and lovelier brings more people in.",
    reward: 120,
    progress: (s) => counted(furnitureCount(s), 3),
  },
  {
    id: "first-cups",
    label: "serve twenty-five cups",
    hint: "they keep coming while you are away, too.",
    reward: 150,
    progress: (s) => counted(cupsSold(s.sales), 25),
  },
  {
    id: "two-cats",
    label: "give a second cat a home",
    hint: "a bed first — your café holds as many cats as it has beds.",
    reward: 200,
    progress: (s) => counted(s.cats.length, 2),
  },
  {
    id: "somewhere-to-sit",
    label: "have three seats in the café",
    hint: "a café with nowhere to sit sells coffee to go, and that pays less.",
    reward: 220,
    progress: (s) =>
      counted(
        ["armchair", "bar-stools", "floor-cushions", "window-cushions"].filter((id) =>
          s.purchased.includes(id),
        ).length,
        3,
      ),
  },
  {
    id: "own-blend",
    label: "get somebody to order your own blend",
    hint: "invent one on the menu, then watch the counter — it is the drink with your name on it.",
    reward: 250,
    progress: (s) => {
      const own = new Set(s.customDrinks.map((d) => d.id));
      const cups = Object.entries(s.sales)
        .filter(([id]) => own.has(id))
        .reduce((total, [, cups]) => total + cups, 0);
      return counted(cups, 1);
    },
  },
  {
    id: "four-cats",
    label: "keep four cats",
    hint: "every one of them brings people in, and a petted cat brings in more.",
    reward: 300,
    progress: (s) => counted(s.cats.length, 4),
  },
  {
    id: "more-room",
    label: "buy another square of floor",
    hint: "the café is out of room long before you are out of ideas.",
    reward: 400,
    progress: (s) => counted(Math.max(0, s.tiles.length - 1), 1),
  },
  {
    id: "five-breeds",
    label: "discover five breeds of cat",
    hint: "adoption is a lucky dip — the cat-dex remembers everyone you have met.",
    reward: 350,
    progress: (s) => counted(discoveredBreeds(s.cats).size, 5),
  },
  {
    id: "hundred-cups",
    label: "serve a hundred cups",
    hint: "a better menu means more per cup, so this pays twice.",
    reward: 450,
    progress: (s) => counted(cupsSold(s.sales), 100),
  },
  {
    id: "furnished",
    label: "get eight pieces of furniture in",
    hint: "the shop's arrange tab moves anything you have already put down.",
    reward: 500,
    progress: (s) => counted(furnitureCount(s), 8),
  },
  {
    id: "full-house",
    label: "give five cats a home",
    hint: "a bed each. that is a full café.",
    reward: 600,
    progress: (s) => counted(s.cats.length, 5),
  },
  {
    id: "five-hundred-cups",
    label: "serve five hundred cups",
    hint: "the café you built, doing what it was built for.",
    reward: 900,
    progress: (s) => counted(cupsSold(s.sales), 500),
  },
];

/** How many are offered at once. Three is a choice; fourteen is a wall. */
export const GOALS_SHOWN = 3;

export function goalById(id: string): Goal | undefined {
  return GOALS.find((goal) => goal.id === id);
}

/** Beds, exposed for the goal hints and the panel. */
export function bedCount(state: GoalState): number {
  return beds(state.placements, state.instances).length;
}

/** Owned copies of a shop item — re-exported so goals stay declarative. */
export { ownedCount };
