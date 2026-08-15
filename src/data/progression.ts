/**
 * Levels and XP — the progress bar the café has never had (2026-08-10).
 *
 * Ellis: *"also want levels and xp. get xp from buying stuff + adopting to lvl
 * up. show lvl xp circle + cafe name + my name in corner like progress stuff."*
 *
 * **What this is for, and what it deliberately is not.** Money is capped at
 * £9,999 and spent as fast as it arrives (§8), so the till can never be a
 * record of how far you have come — it is a wallet, not a scoreboard. Cats cap
 * at five. Nothing in the game accumulates. XP is the one number that only
 * ever goes up, which is exactly what a cosy game wants in the corner of the
 * screen: evidence, not pressure.
 *
 * So **levels gate nothing and cost nothing**. There is no level-locked
 * furniture and no "reach level 8 to unlock" anywhere, because that would turn
 * a keepsake into a chore and pillar 1 says no pressure. If a future unlock
 * wants a gate, prefer the ones already in `data/customisation.ts` — cats
 * adopted, breeds discovered, pieces furnished — which describe something the
 * player *did* rather than a number they ground out.
 *
 * XP is awarded for the two things that are actually the game: furnishing the
 * café, and taking a cat in.
 */

/** XP for the things worth doing. Price-scaled, so a big buy feels bigger. */
export const XP_AWARDS = {
  /** A piece of furniture — the core of the café editor. */
  furniture: (price: number): number => 10 + Math.round(price / 10),
  /** A colourway. Smaller: it is a change of mind, not a new thing in the room. */
  colourway: (price: number): number => 5 + Math.round(price / 20),
  /** Taking a cat in. The largest single award, because it is the point. */
  adoptCat: 40,
  /** A café upgrade level. */
  upgrade: (cost: number): number => 8 + Math.round(cost / 15),
  /** A coffee or an add-in added to the menu. */
  menu: (price: number): number => 8 + Math.round(price / 12),
  /**
   * Inventing a blend. Flat, and generous relative to its cost (nothing) —
   * this is the one thing in the game the player *authored*, and the ring
   * should notice.
   */
  blend: 30,
  /** A new piece of floor — the biggest single thing you can buy. */
  tile: 120,
} as const;

/**
 * XP needed to go from `level` to `level + 1`.
 *
 * Tuned against how much XP the game actually contains: eleven shop items,
 * five cats and every colourway comes to roughly 900, which lands a
 * completionist around level 8. That is deliberately *reachable* — a progress
 * ring that can never fill is a taunt — and it leaves headroom for the
 * expansion tiles and whatever the shop gains next.
 */
export function xpForLevel(level: number): number {
  return Math.round(40 * Math.pow(1.28, Math.max(1, level) - 1));
}

export interface LevelProgress {
  level: number;
  /** XP earned since reaching `level`. */
  into: number;
  /** XP needed to reach `level + 1`. */
  needed: number;
  /** 0–1, for the ring. */
  fraction: number;
}

/**
 * Turn a lifetime XP total into a level and a ring position.
 *
 * Level is **derived, never stored**, so the curve above can be retuned
 * without migrating anyone's save or taking a level off them mid-game.
 */
export function levelProgress(xp: number): LevelProgress {
  const total = Math.max(0, Math.floor(xp));
  let level = 1;
  let remaining = total;
  // Bounded rather than `while (true)`: a corrupt save with an absurd XP value
  // must not spin the main thread.
  for (let guard = 0; guard < 999; guard++) {
    const needed = xpForLevel(level);
    if (remaining < needed) {
      return { level, into: remaining, needed, fraction: remaining / needed };
    }
    remaining -= needed;
    level++;
  }
  const needed = xpForLevel(level);
  return { level, into: 0, needed, fraction: 0 };
}
