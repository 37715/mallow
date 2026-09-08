import { TRACKS } from "@/data/tracks";

/**
 * Who made what.
 *
 * Ellis, 2026-09-08: *"a little credits button on the settings page that gives
 * credit to minty properly for the assets, lily m for the 3 songs."*
 *
 * **Most of this is not legally required, and that is the point.** The art
 * packs are CC0 and the cat recordings are CC0 — no attribution is owed on any
 * of them. A café built almost entirely out of one artist's work should say so
 * anyway: §5's whole argument is that this audience rewards not being taken
 * for granted, and the same applies to the people whose work the game is made
 * of. The one entry that *is* an obligation is the font, and it sits in the
 * same list as everything else rather than being singled out as paperwork.
 *
 * The music reads from `data/tracks.ts` rather than being retyped, so a track
 * added to the soundtrack cannot end up uncredited.
 */

export interface CreditEntry {
  /** Who. */
  name: string;
  /** What they made, in the player's terms rather than the filesystem's. */
  what: string;
  /** Licence or terms, where there are any worth naming. */
  terms?: string;
}

export interface CreditSection {
  title: string;
  entries: CreditEntry[];
}

/** One line per track, in the order the soundtrack lists them. */
const musicCredits: CreditEntry[] = TRACKS.map((track) => ({
  name: track.artist,
  what: track.title,
}));

export const CREDITS: CreditSection[] = [
  {
    title: "music",
    entries: musicCredits,
  },
  {
    title: "art",
    entries: [
      {
        name: "Minty.kit",
        what: "the café, its furniture and every prop in it — the Cozy Cat Café pack",
        terms: "CC0",
      },
      {
        name: "Minty.kit",
        what: "everybody in it — the Cozy Character Pack, and the faces and lip sync",
        terms: "CC0",
      },
    ],
  },
  {
    title: "sound",
    entries: [
      { name: "skymary", what: "a cat meowing", terms: "CC0, via Freesound" },
      { name: "Mafon2", what: "a cat meowing", terms: "CC0, via Freesound" },
      { name: "Sadiquecat", what: "a cat meowing", terms: "CC0, via Freesound" },
    ],
  },
  {
    title: "type & code",
    entries: [
      { name: "Arrow Type", what: "Recursive, the typeface", terms: "SIL Open Font License 1.1" },
      { name: "three.js", what: "the renderer", terms: "MIT" },
    ],
  },
];

/** The line under the title. Warm rather than legal — it is a credits screen. */
export const CREDITS_INTRO =
  "made with other people's lovely work. none of this asked to be credited; it is here because it should be.";
