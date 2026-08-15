import { DEFAULT_BACKDROP, sanitizeBackdrop } from "@/data/backdrops";
import { DEFAULT_LEVEL, sanitizeLevel, type GraphicsLevel } from "@/data/graphics";
import { appearanceFromSeed, sanitizeAppearance, type Appearance } from "@/entities/character-library";

/**
 * Who the player is (§8 onboarding).
 *
 * Ellis: *"want a character creation thing when i first open the game. so i
 * pick my own name, design my character … and then name my cafe too and then
 * go play."* This is the first thing the game asks, so it is also the first
 * thing it promises: the café is *yours*, and it has your name on it before
 * you've earned a penny.
 *
 * The avatar is the same modular character the guests are assembled from, so
 * it costs no new art — see `entities/character-library.ts`.
 */
export interface PlayerProfile {
  name: string;
  cafeName: string;
  /** Resolution budget. A device property, so the player owns it (§ graphics). */
  graphics: GraphicsLevel;
  /** The colour outside the café (§ data/backdrops.ts). */
  backdrop: string;
  /** Music is muted separately from sound effects. */
  musicMuted: boolean;
  appearance: Appearance;
  /** False until character creation has been completed at least once. */
  created: boolean;
  /** False until the guide has shown you round. Set when it ends *or* is skipped. */
  tutorialDone: boolean;
}

export const DEFAULT_PLAYER: PlayerProfile = {
  name: "",
  cafeName: "",
  graphics: DEFAULT_LEVEL,
  backdrop: DEFAULT_BACKDROP,
  musicMuted: false,
  appearance: appearanceFromSeed(Math.floor(Math.random() * 1e6)),
  created: false,
  tutorialDone: false,
};

/** Suggestions, so the fields are never an empty stare. */
/** Lowercase: the game's own voice (§9). A name the player types keeps their
 *  capitals — see `NAME_SUGGESTIONS` in `data/cats.ts` for the same rule. */
export const CAFE_NAME_IDEAS = [
  "the cosy paw",
  "whisker & bean",
  "mallow café",
  "the sleepy cat",
  "two sugars",
  "the warm window",
];

export function sanitizePlayer(value: unknown): PlayerProfile {
  if (typeof value !== "object" || value === null) return { ...DEFAULT_PLAYER };
  const raw = value as Record<string, unknown>;
  const clean = (v: unknown, fallback: string): string =>
    typeof v === "string" && v.trim().length > 0 ? v.trim().slice(0, 24) : fallback;
  return {
    name: clean(raw.name, ""),
    cafeName: clean(raw.cafeName, ""),
    graphics: sanitizeLevel(raw.graphics),
    backdrop: sanitizeBackdrop(raw.backdrop),
    musicMuted: raw.musicMuted === true,
    appearance: sanitizeAppearance(raw.appearance),
    created: raw.created === true,
    tutorialDone: raw.tutorialDone === true,
  };
}
