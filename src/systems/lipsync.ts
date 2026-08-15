import type { MouthFrame } from "@/entities/character-face";

/**
 * Turn a line of dialogue into a timed sequence of mouth shapes.
 *
 * Pure, so it is testable without a renderer — same rule as everything else in
 * `systems/` (§7).
 *
 * **We have letters, not phonemes.** Real lip sync runs off an audio track or a
 * phoneme transcription, and Mallow has neither: the tutorial types text out
 * and there is no voice acting. So this maps *graphemes* to the pack's
 * simplified viseme set, which is exactly what that set is for — its legend
 * groups whole letters ("C, SH, CH, N"), not IPA symbols. The full 30-frame
 * legend is phonetic and we deliberately don't use it; it would demand
 * information we can't get from a string.
 *
 * Two decisions carry the effect, and both are about *not* moving the mouth:
 *
 * 1. **It closes on spaces and punctuation.** A mouth that keeps flapping
 *    through a sentence reads as a machine. The pauses are what make it read
 *    as words.
 * 2. **A shape is held for a minimum time.** Typing runs at 30-odd characters
 *    a second, and a mouth changing that fast is a blur that reads as noise.
 *    Holding for ~80 ms lands around ten shapes a second, which is roughly
 *    syllable rate and is what actually looks like speech.
 */

/** One mouth shape, and when in the line it starts. */
export interface VisemeStep {
  /** Milliseconds from the start of the line. */
  at: number;
  frame: MouthFrame;
}

export interface LipSyncOptions {
  /** How fast the line is spoken, in milliseconds per character. */
  msPerChar?: number;
  /** Shortest time any one shape stays on screen. */
  minHoldMs?: number;
}

const DEFAULTS = { msPerChar: 42, minHoldMs: 80 };

/**
 * Letter groups, taken straight from the pack's `Lips_Simplified_Legend.png`.
 * Where the legend is silent — it has no cell for d/t/g — the letter joins the
 * nearest neighbour by mouth shape rather than by phonetics, because the shape
 * is the only thing that shows.
 */
const LETTERS: Record<string, MouthFrame> = {
  // "A, i" and "A, Ah, i" — two degrees of open, alternated below for life.
  a: "ah-i",
  i: "a-i",
  e: "e-k-r",
  o: "oh",
  u: "o-u-w",
  w: "o-u-w",
  y: "a-i",
  // "M, B, P" — the closed lips. The most visible shape there is, so getting
  // these right matters more than any vowel.
  m: "m-b-p",
  b: "m-b-p",
  p: "m-b-p",
  // "V, F"
  f: "f-v",
  v: "f-v",
  // "L"
  l: "L",
  // "S, Z"
  s: "s-z",
  z: "s-z",
  x: "s-z",
  // "C, SH, CH, N" — teeth together. d and t join them; the legend has no cell
  // of its own for them and this is the shape they share.
  c: "sh-ch",
  n: "sh-ch",
  d: "sh-ch",
  t: "sh-ch",
  j: "sh-ch",
  // "E, Eh, K, R" — the open-ish back consonants.
  k: "e-k-r",
  g: "e-k-r",
  q: "e-k-r",
  r: "e-k-r",
  h: "e-k-r",
};

/** Digraphs that are one sound, checked before single letters. */
const DIGRAPHS: Record<string, MouthFrame> = {
  th: "th",
  ch: "sh-ch",
  sh: "sh-ch",
  ph: "f-v",
  oo: "o-u-w",
  ou: "o-u-w",
  ow: "o-u-w",
  qu: "o-u-w",
  ee: "a-i",
  ea: "a-i",
};

/** The rest shape, used between words and at the end of the line. */
export const MOUTH_REST: MouthFrame = "Default";

/**
 * The viseme a character maps to, or `null` if it should close the mouth.
 * Exported for the tests, which is the only place a single letter is asked
 * about in isolation.
 */
export function visemeFor(text: string, index: number): MouthFrame | null {
  const pair = text.slice(index, index + 2).toLowerCase();
  if (pair in DIGRAPHS) return DIGRAPHS[pair];
  const letter = text[index]?.toLowerCase() ?? "";
  return LETTERS[letter] ?? null;
}

/**
 * Build the whole track for a line.
 *
 * The result always ends with a rest step, so a caller that runs off the end
 * of the track leaves the mouth shut rather than stuck open on the last vowel.
 */
export function visemeTrack(text: string, options: LipSyncOptions = {}): VisemeStep[] {
  const msPerChar = options.msPerChar ?? DEFAULTS.msPerChar;
  const minHoldMs = options.minHoldMs ?? DEFAULTS.minHoldMs;

  const steps: VisemeStep[] = [];
  let openVowel = false;

  for (let index = 0; index < text.length; index++) {
    const at = index * msPerChar;
    let frame = visemeFor(text, index);

    // "aaa" and "ooo" would otherwise sit on one shape. Alternating the two
    // degrees of open on repeated A gives the jaw somewhere to go.
    if (frame === "ah-i") {
      frame = openVowel ? "a-i" : "ah-i";
      openVowel = !openVowel;
    } else if (frame !== null) {
      openVowel = false;
    }

    const previous = steps[steps.length - 1];
    // Punctuation and spaces shut the mouth — but only if it is open, so a
    // gap between two words doesn't emit two rests.
    const wanted = frame ?? MOUTH_REST;
    if (previous && previous.frame === wanted) continue;
    // Too soon after the last change: skip this shape rather than flickering
    // through it. A rest always wins, because a missed pause is more visible
    // than a missed consonant.
    if (previous && at - previous.at < minHoldMs && wanted !== MOUTH_REST) continue;
    steps.push({ at, frame: wanted });
  }

  const end = text.length * msPerChar;
  if (steps.length === 0 || steps[steps.length - 1].frame !== MOUTH_REST) {
    steps.push({ at: end, frame: MOUTH_REST });
  }
  return steps;
}

/** How long a line takes to say, in milliseconds. */
export function speechDuration(text: string, options: LipSyncOptions = {}): number {
  return text.length * (options.msPerChar ?? DEFAULTS.msPerChar);
}

/**
 * The shape showing at a given moment. Linear from a cursor rather than a
 * binary search: callers step forward a frame at a time, so this is O(1)
 * amortised and there is no state to get out of sync.
 */
export function frameAt(track: VisemeStep[], ms: number): MouthFrame {
  let frame: MouthFrame = MOUTH_REST;
  for (const step of track) {
    if (step.at > ms) break;
    frame = step.frame;
  }
  return frame;
}
