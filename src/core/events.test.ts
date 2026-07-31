import { describe, expect, it } from "vitest";
import { emitGameEvent, onGameEvent } from "@/core/events";

describe("game events", () => {
  it("delivers a payload to every subscriber", () => {
    const seen: number[] = [];
    onGameEvent("visitorPaid", ({ seatIndex }) => seen.push(seatIndex));
    onGameEvent("visitorPaid", ({ seatIndex }) => seen.push(seatIndex * 100));

    emitGameEvent("visitorPaid", { seatIndex: 3 });
    expect(seen).toEqual([3, 300]);
  });

  it("is a no-op when nothing is listening", () => {
    // The store emits on every payout whether or not a renderer is attached —
    // in tests and on a headless tick there are no subscribers at all.
    expect(() => emitGameEvent("visitorPaid", { seatIndex: 0 })).not.toThrow();
  });
});
