import { describe, expect, it } from "vitest";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { SAMPLE_PATHS } from "@/audio/audio";
import { CYCLE, TRACK_PATHS } from "@/audio/soundtrack";

/**
 * The audio the game ships, and the shape of the cycle it plays it in.
 *
 * **A missing file here fails silently and nicely**, which is exactly what
 * makes it worth a test: the loaders fall back to synthesis, so a renamed or
 * un-copied recording does not throw, does not log, and does not break
 * anything — the café simply goes back to sounding like a synthesiser and
 * nobody finds out until somebody happens to notice the cats sound wrong
 * again. Same family as the never-firing autosave (§8): the failure mode is
 * *silence*, so the test has to assert the files are really there.
 */

const PUBLIC = join(process.cwd(), "public");
const declared = [...Object.values(SAMPLE_PATHS).flat(), ...TRACK_PATHS];

describe("the audio files the game asks for", () => {
  it("declares at least a purr, a meow and a track", () => {
    // Guards against the arrays being emptied and the test then passing
    // vacuously, which is the usual way a file-existence test rots.
    expect(SAMPLE_PATHS.purr.length).toBeGreaterThan(0);
    expect(SAMPLE_PATHS.meow.length).toBeGreaterThan(0);
    expect(TRACK_PATHS.length).toBeGreaterThan(0);
  });

  it("ships every file it names", () => {
    const missing = declared.filter((path) => !existsSync(join(PUBLIC, path)));
    expect(missing).toEqual([]);
  });

  it("names files that are actually audio rather than empty", () => {
    // A zero-byte file copied by a half-finished script decodes to nothing and
    // reads, from inside the game, exactly like a file that is not there.
    const empty = declared.filter((path) => statSync(join(PUBLIC, path)).size < 1024);
    expect(empty).toEqual([]);
  });

  it("only asks for formats Safari can decode", () => {
    /**
     * **Ogg Vorbis is the trap.** It is the format most freely-licensed audio
     * arrives in, and Safari does not decode it — so an `.ogg` here would work
     * in every browser used to develop this game and in none of the app it
     * ships as. See `public/audio/README.md` for the conversion.
     */
    const wrong = declared.filter((path) => !/\.(m4a|mp3|wav|aac)$/i.test(path));
    expect(wrong).toEqual([]);
  });

  it("keeps a cycle that spends more time playing than resting", () => {
    // The rests are the point (Ellis: "fade out again to silence for a little
    // before fading back in again") — but "a little" is the brief, and music
    // that is off more than it is on is a game that sounds broken.
    const track = 71.1; // locklane.m4a; the cycle plays it through twice
    const span = track * 2;
    expect(CYCLE.rest).toBeLessThan(span / 2);
    // Both fades have to fit inside one play, or the track never reaches full
    // level before it starts leaving again.
    expect(CYCLE.fadeIn + CYCLE.fadeOut).toBeLessThan(span);
    // And it has to actually start silent, which is the other half of the ask.
    expect(CYCLE.introDelay).toBeGreaterThan(0);
  });
});
