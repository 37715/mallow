import { describe, expect, it } from "vitest";
import atlas from "@/data/face-atlas.json";
import { EXPRESSIONS } from "@/entities/character-face";
import {
  MOUTH_REST,
  frameAt,
  speechDuration,
  visemeFor,
  visemeTrack,
} from "@/systems/lipsync";

describe("viseme mapping", () => {
  it("reads digraphs as one sound, not two letters", () => {
    // "th" must not come out as t-then-h, which would be two shapes for one
    // sound and is the whole reason DIGRAPHS is checked first.
    expect(visemeFor("the", 0)).toBe("th");
    expect(visemeFor("shop", 0)).toBe("sh-ch");
    expect(visemeFor("phone", 0)).toBe("f-v");
  });

  it("closes the mouth on anything that isn't a letter", () => {
    expect(visemeFor("hi there", 2)).toBeNull();
    expect(visemeFor("well!", 4)).toBeNull();
    expect(visemeFor("a 7", 2)).toBeNull();
  });

  it("puts the closed-lip shape on m, b and p", () => {
    // The most visible shape in the set — a missed one reads as a dubbed film.
    for (const letter of ["m", "b", "p"]) {
      expect(visemeFor(letter, 0)).toBe("m-b-p");
    }
  });
});

describe("viseme track", () => {
  it("rests between words, so it reads as speech and not a flapping jaw", () => {
    const track = visemeTrack("hi there", { msPerChar: 100, minHoldMs: 0 });
    const gap = track.find((step) => step.at === 200);
    expect(gap?.frame).toBe(MOUTH_REST);
  });

  it("never emits two rests in a row", () => {
    const track = visemeTrack("a,  b", { msPerChar: 100, minHoldMs: 0 });
    for (let i = 1; i < track.length; i++) {
      expect(track[i].frame === MOUTH_REST && track[i - 1].frame === MOUTH_REST).toBe(false);
    }
  });

  it("holds a shape long enough to be seen", () => {
    // Typing runs far faster than a mouth can move. Every gap between changes
    // must clear the hold, or the mouth is a blur.
    const track = visemeTrack("everything looks lovely today", { msPerChar: 30, minHoldMs: 90 });
    const changes = track.filter((step) => step.frame !== MOUTH_REST);
    for (let i = 1; i < changes.length; i++) {
      expect(changes[i].at - changes[i - 1].at).toBeGreaterThanOrEqual(90);
    }
  });

  it("alternates the two open vowels so a long 'aaa' still moves", () => {
    const track = visemeTrack("aaaa", { msPerChar: 200, minHoldMs: 0 });
    const frames = track.map((step) => step.frame);
    expect(new Set(frames.slice(0, 4)).size).toBeGreaterThan(1);
  });

  it("always ends shut", () => {
    for (const line of ["hello", "oh!", "a", "", "mmm"]) {
      const track = visemeTrack(line);
      expect(track[track.length - 1].frame).toBe(MOUTH_REST);
    }
  });

  it("finishes when the typing finishes", () => {
    const line = "welcome to your café";
    const track = visemeTrack(line, { msPerChar: 40 });
    expect(speechDuration(line, { msPerChar: 40 })).toBe(line.length * 40);
    expect(track[track.length - 1].at).toBeLessThanOrEqual(line.length * 40);
  });
});

describe("frameAt", () => {
  const track = visemeTrack("hello", { msPerChar: 100, minHoldMs: 0 });

  it("is shut before the line starts and after it ends", () => {
    expect(frameAt(track, -10)).toBe(MOUTH_REST);
    expect(frameAt(track, 10_000)).toBe(MOUTH_REST);
  });

  it("holds a shape until the next one is due", () => {
    const second = track[1];
    expect(frameAt(track, second.at)).toBe(second.frame);
    expect(frameAt(track, second.at + 1)).toBe(second.frame);
  });
});

describe("the atlas and the code agree", () => {
  // Every name the runtime can ask for must be a real cell. A wrong name fails
  // silently as "the mouth never moves", which is exactly the class of bug
  // `character-clips.test.ts` exists to catch for animations.
  it("has a cell for every viseme the mapping can produce", () => {
    const mouths = new Set(atlas.mouths.frames);
    const line = "the quick brown fox jumps over a lazy dog, phoning shops!";
    for (const step of visemeTrack(line)) {
      expect(mouths.has(step.frame), `no mouth cell "${step.frame}"`).toBe(true);
    }
  });

  it("has a cell for every frame the expressions name", () => {
    const eyes = new Set(atlas.eyes.frames);
    const mouths = new Set(atlas.mouths.frames);
    for (const [name, expression] of Object.entries(EXPRESSIONS)) {
      for (const frame of expression.eyes) {
        expect(eyes.has(frame), `${name}: no eye cell "${frame}"`).toBe(true);
      }
      expect(mouths.has(expression.mouth), `${name}: no mouth cell`).toBe(true);
    }
  });
});
