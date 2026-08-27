import { describe, expect, it } from "vitest";
import { legReached, type Leg, type Walk } from "@/entities/visitor-manager";

/**
 * The question `positionVisitor` asks once a frame, per guest, three times.
 *
 * **It got the wrong answer for two days and the symptom was violent** — Ellis,
 * 2026-08-27: *"character went up to desk, went to walk off again and start
 * spasming out glitching cant get out for ages super jittery crazy."* Every
 * guest flipped between the walk-in route and the walk-to-seat route about
 * twenty times a second for the whole seven seconds they should have been
 * sitting down, restarting the walk animation each time.
 *
 * The tests below are ordinary until the fourth. That one is the bug, and it is
 * the reason this function exists at all rather than being three lines inside a
 * private method on a class full of `THREE.Object3D`s (§14 — pull the decision
 * out of the loop when the loop needs a renderer).
 */

const walk = (leg: Leg, travelled: number): Walk => ({ leg, travelled });

describe("has a guest finished this leg", () => {
  it("says no before they have set off", () => {
    expect(legReached(undefined, "in", 5)).toBe(false);
    expect(legReached(walk("in", 0), "in", 5)).toBe(false);
  });

  it("says no part-way along", () => {
    expect(legReached(walk("in", 4.9), "in", 5)).toBe(false);
  });

  it("says yes at the end of the route", () => {
    expect(legReached(walk("in", 5), "in", 5)).toBe(true);
    // The float tolerance is real: `travelled` is clamped to the total, and an
    // exact compare on two sums of distances is a coin toss.
    expect(legReached(walk("in", 5 - 1e-9), "in", 5)).toBe(true);
  });

  /**
   * **The regression.** A guest crossing to their chair has finished walking
   * in, by definition — they could not have started the second leg otherwise.
   * Answering "no" here sent `positionVisitor` back into its walk-in branch,
   * which reset the walk to the top of the in-route, which made the answer
   * "no" for the *other* leg on the next frame, for ever.
   */
  it("says yes about a leg they have already left behind", () => {
    expect(legReached(walk("toSeat", 0), "in", 5)).toBe(true);
    expect(legReached(walk("out", 0), "in", 5)).toBe(true);
    expect(legReached(walk("out", 0), "toSeat", 5)).toBe(true);
  });

  it("still says no about a leg they have not reached yet", () => {
    expect(legReached(walk("in", 5), "toSeat", 5)).toBe(false);
    expect(legReached(walk("toSeat", 5), "out", 5)).toBe(false);
  });

  /**
   * The whole phase machine, run frame by frame, asserting the thing the unit
   * cases cannot: that it **settles**.
   *
   * A guest is supposed to change leg twice on the way to a chair. The measured
   * failure was about 140 changes per visit, so the assertion is deliberately
   * loose — anything that oscillates blows straight past it, and anything
   * correct is nowhere near it.
   */
  it("never sends a guest back to a leg they have finished", () => {
    const IN_LENGTH = 6;
    const TO_SEAT_LENGTH = 2;
    const SPEED = 1.9;
    const STEP = 1 / 60;

    let current: Walk | undefined;
    let changes = 0;
    const stride = (leg: Leg, total: number): void => {
      if (!current || current.leg !== leg) {
        current = { leg, travelled: 0 };
        changes++; // this is where `character.walk()` restarts the clip
        return;
      }
      current.travelled = Math.min(total, current.travelled + STEP * SPEED);
    };

    // Ten seconds of frames, in the order `positionVisitor` asks its questions.
    let seated = false;
    for (let frame = 0; frame < 600; frame++) {
      if (!legReached(current, "in", IN_LENGTH)) {
        stride("in", IN_LENGTH);
        continue;
      }
      if (!legReached(current, "toSeat", TO_SEAT_LENGTH)) {
        stride("toSeat", TO_SEAT_LENGTH);
        continue;
      }
      seated = true;
    }

    expect(seated).toBe(true);
    expect(changes).toBe(2);
  });
});
