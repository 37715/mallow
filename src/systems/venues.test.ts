import { describe, expect, it } from "vitest";
import { canMove, isTopVenue, moveProgress, moveToNextVenue } from "@/systems/venues";
import { VENUES, nextVenue, venueAt } from "@/data/venues";
import { UPGRADE_DEFINITIONS, upgradeDefinition } from "@/data/upgrades";
import { cafeStats } from "@/systems/cafe";
import { liveIncomePerSecond } from "@/systems/offline";

describe("venue ladder", () => {
  it("escalates cost and reward monotonically", () => {
    for (let i = 1; i < VENUES.length; i++) {
      expect(VENUES[i].moveCost).toBeGreaterThan(VENUES[i - 1].moveCost);
      expect(VENUES[i].incomeMultiplier).toBeGreaterThan(VENUES[i - 1].incomeMultiplier);
    }
    expect(VENUES[0].moveCost).toBe(0);
    expect(VENUES[0].incomeMultiplier).toBe(1);
  });

  it("never asks for more seats than the room can hold", () => {
    // The portrait layout fits a fixed number of chairs; a venue that starts
    // with more seats than that would silently seat guests in thin air.
    // scene/layout.test.ts pins the room side of this invariant.
    const seating = upgradeDefinition("seating")!;
    const most = Math.max(...VENUES.map((v) => v.baseSeats)) + seating.maxLevel;
    expect(most).toBeLessThanOrEqual(12);
  });

  it("clamps out-of-range indexes rather than crashing", () => {
    // A save written by a future build with more venues must still load.
    expect(venueAt(-5)).toBe(VENUES[0]);
    expect(venueAt(9999)).toBe(VENUES[VENUES.length - 1]);
    expect(nextVenue(VENUES.length - 1)).toBeNull();
  });
});

describe("moveToNextVenue", () => {
  it("refuses when the player can't afford the lease", () => {
    const cost = VENUES[1].moveCost;
    const result = moveToNextVenue(cost - 1, 0);
    expect(result.success).toBe(false);
    expect(result.venueIndex).toBe(0);
  });

  it("moves up exactly one venue at the asking price", () => {
    const result = moveToNextVenue(VENUES[1].moveCost, 0);
    expect(result.success).toBe(true);
    expect(result.venueIndex).toBe(1);
    expect(result.venue?.id).toBe(VENUES[1].id);
  });

  it("cannot move past the last venue, however rich the player is", () => {
    const top = VENUES.length - 1;
    const result = moveToNextVenue(Number.MAX_SAFE_INTEGER, top);
    expect(result.success).toBe(false);
    expect(result.venueIndex).toBe(top);
    expect(isTopVenue(top)).toBe(true);
  });

  it("agrees with canMove", () => {
    expect(canMove(VENUES[1].moveCost - 1, 0)).toBe(false);
    expect(canMove(VENUES[1].moveCost, 0)).toBe(true);
    expect(canMove(Number.MAX_SAFE_INTEGER, VENUES.length - 1)).toBe(false);
  });
});

describe("moveProgress", () => {
  it("runs 0 → 1 toward the next lease and never overshoots", () => {
    expect(moveProgress(0, 0)).toBe(0);
    expect(moveProgress(VENUES[1].moveCost / 2, 0)).toBeCloseTo(0.5);
    expect(moveProgress(VENUES[1].moveCost * 10, 0)).toBe(1);
  });

  it("reads as complete at the top of the ladder", () => {
    expect(moveProgress(0, VENUES.length - 1)).toBe(1);
  });
});

describe("moving is worth it", () => {
  it("earns more in the new venue than a fully built-out old one", () => {
    // The move wipes fixtures, so a venue whose multiplier didn't outweigh a
    // maxed-out previous café would be a trap — the player would be strictly
    // worse off for progressing.
    const maxed = Object.fromEntries(
      UPGRADE_DEFINITIONS.map((d) => [d.id, d.maxLevel]),
    ) as Record<string, number>;

    for (let i = 0; i < VENUES.length - 1; i++) {
      const builtOld = liveIncomePerSecond(cafeStats(20, maxed, i));
      const bareNew = liveIncomePerSecond(cafeStats(20, {}, i + 1));
      expect(bareNew).toBeGreaterThan(builtOld);
    }
  });
});
