import { describe, expect, it } from "vitest";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { TARGET_SESSION_S, TRACKS, passesFor } from "@/data/tracks";
import { CREDITS } from "@/data/credits";

/**
 * The soundtrack catalogue.
 *
 * Every field here is a number or a name that nothing else would notice being
 * wrong: a missing file falls back to silence, a bad trim just sounds odd, and
 * an uncredited artist is invisible from inside the game.
 */
describe("the soundtrack", () => {
  it("ships every file it lists", () => {
    const missing = TRACKS.filter(
      (track) => !existsSync(join(process.cwd(), "public/audio", track.file)),
    ).map((track) => track.file);
    expect(missing).toEqual([]);
  });

  it("names files that are real audio rather than empty", () => {
    for (const track of TRACKS) {
      const size = statSync(join(process.cwd(), "public/audio", track.file)).size;
      expect(size, track.file).toBeGreaterThan(10_000);
    }
  });

  it("gives every track a title and an artist", () => {
    // The credits and the now-playing chip both read these; a blank artist is
    // an uncredited musician, which is the one thing this feature exists to
    // prevent.
    for (const track of TRACKS) {
      expect(track.title.trim().length, track.file).toBeGreaterThan(0);
      expect(track.artist.trim().length, track.file).toBeGreaterThan(0);
    }
  });

  it("credits every artist in the soundtrack", () => {
    // `data/credits.ts` derives the music section from TRACKS, so this can only
    // fail if somebody stops deriving it — which is exactly when it would go
    // quietly wrong.
    const music = CREDITS.find((section) => section.title === "music");
    expect(music).toBeDefined();
    for (const track of TRACKS) {
      expect(
        music!.entries.some((e) => e.name === track.artist && e.what === track.title),
        `${track.title} by ${track.artist}`,
      ).toBe(true);
    }
  });

  it("trims every track towards one loudness", () => {
    // Measured from each file's rms against lock lane's. A trim of 1 on a track
    // that is a third louder is what makes a soundtrack jump when it changes.
    for (const track of TRACKS) {
      expect(track.trim, track.title).toBeGreaterThan(0.4);
      expect(track.trim, track.title).toBeLessThanOrEqual(1);
    }
    expect(TRACKS.find((t) => t.title === "lock lane")?.trim).toBe(1);
  });

  it("repeats a short track more times than a long one", () => {
    // The point of deriving passes: a 27-second interlude and a 71-second piece
    // should occupy the café for about the same time, so the rhythm of
    // music-then-quiet does not change with the track.
    const lockLane = TRACKS.find((t) => t.title === "lock lane")!;
    const interlude = TRACKS.find((t) => t.title === "interlude 1")!;
    expect(passesFor(lockLane, 71.1)).toBeLessThan(passesFor(interlude, 27.9));

    for (const [track, duration] of [
      [lockLane, 71.1],
      [interlude, 27.9],
    ] as const) {
      const passes = passesFor(track, duration);
      const span = duration + (duration - track.crossfade) * (passes - 1);
      // Within a third of the target either way — close enough that a listener
      // could not tell the sessions apart, without forcing an awkward count.
      expect(span, track.title).toBeGreaterThan(TARGET_SESSION_S * 0.66);
      expect(span, track.title).toBeLessThan(TARGET_SESSION_S * 1.34);
    }
  });

  it("only butt-joins a track that was written to loop", () => {
    // `lock lane` measures 0.8x head-against-tail and repeats seamlessly. The
    // others are pieces with endings — the worst opens 8.6x louder than it
    // finished — so a hard loop is a slam and they need an overlap.
    for (const track of TRACKS) {
      if (track.title === "lock lane") expect(track.crossfade).toBe(0);
      else expect(track.crossfade, track.title).toBeGreaterThan(1);
    }
  });
});
