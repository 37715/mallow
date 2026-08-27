import { describe, expect, it } from "vitest";
import { ECONOMY_CONFIG } from "@/data/economy";
import { tillCapacityFor, upgradeDefinition } from "@/data/upgrades";
import { addToTill, tillCapacity, tillFullness, tillIsFull, tillRoom } from "@/systems/till";

/**
 * The till (Ellis, 2026-08-26). The property under test throughout is the one
 * the mechanic exists for: **time away buys you at most one full drawer**.
 */
describe("what the till holds", () => {
  it("starts at the configured capacity with no upgrade", () => {
    expect(tillCapacity({})).toBe(ECONOMY_CONFIG.tillCapacity);
    expect(tillCapacityFor(0)).toBe(ECONOMY_CONFIG.tillCapacity);
  });

  it("grows with the upgrade, and stops at its last level", () => {
    const max = upgradeDefinition("till")!.maxLevel;
    expect(tillCapacity({ till: 1 })).toBeGreaterThan(tillCapacity({}));
    expect(tillCapacity({ till: max })).toBeGreaterThan(tillCapacity({ till: max - 1 }));
    // Past the top the curve must flatten, not keep climbing — `levelOf` clamps
    // to `maxLevel`, and a save carrying a bigger number must not be trusted.
    expect(tillCapacity({ till: max + 20 })).toBe(tillCapacity({ till: max }));
  });

  it("never quotes a capacity below the base, whatever the save says", () => {
    expect(tillCapacity({ till: -5 })).toBe(ECONOMY_CONFIG.tillCapacity);
  });
});

describe("filling it", () => {
  const cap = 1000;

  it("takes money up to the brim and no further", () => {
    expect(addToTill(0, 250, cap)).toBe(250);
    expect(addToTill(900, 250, cap)).toBe(cap);
    expect(addToTill(cap, 5000, cap)).toBe(cap);
  });

  it("is what makes four days away worth the same as four hours", () => {
    // The whole mechanic in one assertion (Ellis: *"u cant just go offline for
    // 4 days and come back to being rich"*).
    const shortTrip = addToTill(0, 400, cap);
    const longTrip = addToTill(0, 400_000, cap);
    expect(longTrip).toBe(cap);
    expect(longTrip - shortTrip).toBeLessThan(cap);
  });

  it("ignores a negative or broken earning rather than emptying the till", () => {
    // Called every frame with a number derived from elapsed time; a clock that
    // steps backwards must not cost the player their takings.
    expect(addToTill(500, -200, cap)).toBe(500);
    expect(addToTill(500, Number.NaN, cap)).toBe(500);
    expect(addToTill(Number.NaN, 100, cap)).toBe(100);
  });

  it("reports the room left rather than making the caller subtract", () => {
    expect(tillRoom(0, cap)).toBe(cap);
    expect(tillRoom(750, cap)).toBe(250);
    expect(tillRoom(cap, cap)).toBe(0);
    // A till over capacity (a downgrade, a retune) has no room, never negative.
    expect(tillRoom(cap + 500, cap)).toBe(0);
  });
});

describe("reading it", () => {
  it("reports fullness for the bar, clamped both ends", () => {
    expect(tillFullness(0, 1000)).toBe(0);
    expect(tillFullness(500, 1000)).toBe(0.5);
    expect(tillFullness(4000, 1000)).toBe(1);
    expect(tillFullness(-50, 1000)).toBe(0);
  });

  it("calls a till full a hair before the brim", () => {
    // It accrues fractions of a penny per frame, so it can sit at 999.9997 for
    // ever. If "full" needed exactly the capacity the HUD would never once say
    // the café had stopped earning, which is the only thing that state is for.
    expect(tillIsFull(999.9997, 1000)).toBe(true);
    expect(tillIsFull(900, 1000)).toBe(false);
  });

  it("treats a zero capacity as full rather than dividing by it", () => {
    expect(tillFullness(0, 0)).toBe(1);
    expect(tillIsFull(0, 0)).toBe(true);
  });
});
