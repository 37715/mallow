/**
 * Little jobs the café needs doing — the answer to "the tutorial ended and
 * there is nothing to do".
 *
 * Ellis, 2026-08-26: *"i finish the tutorial and now im out of cash with
 * literally nothing to do. so maybe one where we clean the window and its easy
 * and satisfying and can only do after certain time when it needs it and
 * increases the appeal."*
 *
 * ## The shape, and why it is this shape
 *
 * A chore is **fresh** for a while after you do it, then it comes **due**
 * again. While it is fresh its `appeal` counts toward the café's; while it is
 * due, it does not. That is the whole mechanic, and the direction of it
 * matters:
 *
 * - **Nothing decays into harm, and nothing is ever taken away.** A café whose
 *   chores are all due earns exactly what a café with no chore system earns.
 *   Doing them is upside only. This is the same rule contentment follows
 *   (§8: "an unpetted cat still earns its full base rate") and the same rule
 *   Ellis set for feeding on 2026-08-06 — a cosy game may reward presence and
 *   must never punish absence.
 * - **They are gated on time, not on money.** That is what makes them the
 *   answer to the post-tutorial hole: the player has no coins at that moment,
 *   so anything priced is unreachable, and a job that only asks for a minute
 *   of attention is the one thing that still works.
 * - **They are quick.** Thirty seconds, no fail state, no timer running down.
 *
 * ## Adding another one
 *
 * A chore is a row here plus a minigame keyed by `game`. `systems/chores.ts`
 * is entirely generic — it never names a chore — so the only real work is the
 * interaction. `wipe` is the first, and it is deliberately the most reusable
 * kind: a surface with something on it that you drag to clear.
 */

export type ChoreGame = "wipe";

/**
 * What the minigame shows you, and how it is framed.
 *
 * **One surface per chore, filling the card.** Ellis, 2026-08-26: *"it looks
 * like im also wiping the wall? it should only be pure glass. not the entire
 * window... and of course it should look different for the floor and tables
 * too."* Both halves are solved the same way — by framing the camera so the
 * card *is* the thing being cleaned. Masking the grime to the glass would have
 * worked for the window and told us nothing about how to do a tabletop; a
 * per-chore subject and framing does both, and every chore looks like its own
 * job rather than a recoloured version of the last one.
 *
 * `slot` resolves against the player's own customisation where there is one,
 * so somebody who has repainted cleans *their* window and *their* floorboards.
 */
export interface ChoreSurface {
  /** Resolve the asset from the player's style. Wins over `asset`. */
  slot?: "wallWindow" | "floor";
  /** A fixed asset, for anything with no colourway. */
  asset?: string;
  /**
   * Where the camera stands, as a direction from the point it looks at. Length
   * is ignored — the distance is solved from `span`.
   */
  from: [number, number, number];
  /**
   * How wide a slice of the world the card holds, in world units. This is what
   * decides whether you are looking at a window or at a wall with a window in
   * it, so it is the number to change if a surface reads wrong.
   */
  span: number;
  /** The card's shape, so a wide surface is not shown in a tall box. */
  aspect: number;
  /** Height above the piece's base to aim at. Omit to aim at the top of it. */
  aimY?: number;
}

export interface Chore {
  id: string;
  /**
   * Where in the room the job is, in world units — the marker floats here and
   * that is the only way to start it.
   *
   * **You tap the thing, not a button about the thing.** Ellis, 2026-08-26:
   * *"make it be popping up from or next to the window, so the user has to tap
   * on the window to do it."* A prompt in the HUD is a to-do list; a sparkle
   * on the actual glass is the café asking, and it teaches where the job is at
   * the same time.
   */
  at: { x: number; y: number; z: number };
  /** What the café says is wrong, in its own voice. */
  name: string;
  /** The button. A verb. */
  action: string;
  /** One line under the title while the minigame is open. */
  hint: string;
  game: ChoreGame;
  /** What the minigame renders, and how it frames it. */
  surface: ChoreSurface;
  /** How long after doing it before it needs doing again. */
  everyMs: number;
  /** Appeal it contributes *while fresh*. Never subtracted when due. */
  appeal: number;
  /** Coins for doing it. Small — this is not an income strategy. */
  pay: number;
  xp: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/**
 * **The window is first and its timer is the shortest**, because it is the one
 * that has to be waiting when the walkthrough finishes. `firstDueMs` below is
 * what actually guarantees that; the interval is what keeps it coming back.
 */
export const CHORES: Chore[] = [
  {
    id: "window",
    // Just in front of the glass in the back wall. The wall body is at
    // z = -1.95 and `SILL` juts to -1.61, so this floats clear of both.
    at: { x: 0.34, y: 1.62, z: -1.72 },
    name: "the window's gone smeary",
    action: "give it a wipe",
    hint: "drag to wipe the glass",
    game: "wipe",
    // **Tight on the glass.** The aperture is 2.24 across, so a span under
    // that means the card is pane and frame and no wall at all — which is the
    // whole ask: *"it should only be pure glass. not the entire wall."*
    // Landscape, because the window is.
    surface: { slot: "wallWindow", from: [0, 0, 1], span: 2.1, aspect: 6 / 5, aimY: 1.86 },
    everyMs: 4 * HOUR,
    appeal: 0.6,
    pay: 12,
    xp: 6,
  },
  {
    id: "tables",
    // Over the low table by the window seat.
    at: { x: 1.589, y: 0.62, z: 0.849 },
    name: "the tables want a wipe down",
    action: "wipe them down",
    hint: "drag to clear the crumbs",
    game: "wipe",
    // Looking down at the tabletop from across it, the way you would stand,
    // and close enough that the top fills the card rather than floating in the
    // middle of it.
    surface: { asset: "Table_Short", from: [0.12, 0.9, 1], span: 0.78, aspect: 1 },
    everyMs: 6 * HOUR,
    appeal: 0.5,
    pay: 10,
    xp: 5,
  },
  {
    id: "sweep",
    // Clear floor in the middle of the room, away from the walking route.
    at: { x: 0.55, y: 0.22, z: -0.35 },
    name: "there's fur on the floorboards",
    action: "sweep up",
    hint: "drag to sweep it up",
    game: "wipe",
    // A patch of boards rather than the whole 4-unit tile: close enough that
    // the planks read as a floor you are crouching over.
    surface: { slot: "floor", from: [0.1, 1, 0.7], span: 2.2, aspect: 1 },
    everyMs: 8 * HOUR,
    appeal: 0.4,
    pay: 8,
    xp: 4,
  },
];

export const CHORES_BY_ID = new Map(CHORES.map((c) => [c.id, c]));

/**
 * How long after the café opens each chore first comes due. The others are
 * staggered so the first hour has a small rhythm to it rather than three jobs
 * at once and then silence.
 *
 * **Counted from when the guide leaves, not from when the save was written** —
 * `openedAt` is stamped at the end of the walkthrough. So `window: 5_000` is
 * literally "five seconds after Mal walks out", which is what Ellis asked for
 * and is the moment the player is most at a loose end.
 */
export const FIRST_DUE_MS: Record<string, number> = {
  window: 5_000,
  tables: 12 * MINUTE,
  sweep: 40 * MINUTE,
};
