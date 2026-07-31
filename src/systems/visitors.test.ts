import { describe, expect, it } from "vitest";
import { phaseOf, tickVisitors, type Visitor } from "@/systems/visitors";
import { cafeStats } from "@/systems/cafe";
import { ECONOMY_CONFIG, visitorPayAmount } from "@/data/economy";

const STATS = cafeStats(1, {});

/** Run the loop forward in fixed steps, accumulating what happened. */
function simulate(durationMs: number, stepMs = 100, stats = STATS) {
  let visitors: Visitor[] = [];
  let lastSpawnAt = 0;
  let earned = 0;
  const paidSeats: number[] = [];
  let peakConcurrent = 0;

  for (let now = 0; now <= durationMs; now += stepMs) {
    const result = tickVisitors(visitors, now, lastSpawnAt, stats);
    visitors = result.visitors;
    lastSpawnAt = result.lastSpawnAt;
    earned += result.moneyEarned;
    paidSeats.push(...result.paidSeatIndexes);
    peakConcurrent = Math.max(peakConcurrent, visitors.length);
  }

  return { visitors, earned, paidSeats, peakConcurrent };
}

describe("tickVisitors", () => {
  it("spawns nobody before the first interval has elapsed", () => {
    const result = tickVisitors([], 0, 0, STATS);
    expect(result.visitors).toHaveLength(0);
    expect(result.spawnedThisTick).toBe(false);
  });

  it("spawns a visitor once the interval elapses, into a free seat", () => {
    const result = tickVisitors([], ECONOMY_CONFIG.baseVisitorIntervalMs, 0, STATS);
    expect(result.visitors).toHaveLength(1);
    expect(result.spawnedThisTick).toBe(true);
    expect(result.visitors[0].seatIndex).toBe(0);
    expect(result.visitors[0].hasPaid).toBe(false);
  });

  it("walks a visitor through walk-in → seated → walking-out", () => {
    const [visitor] = tickVisitors([], ECONOMY_CONFIG.baseVisitorIntervalMs, 0, STATS).visitors;
    expect(phaseOf(visitor, visitor.spawnedAt)).toBe("walkingIn");
    expect(phaseOf(visitor, visitor.seatedAt + 1)).toBe("seated");
    expect(phaseOf(visitor, visitor.leavingAt + 1)).toBe("walkingOut");
  });

  it("pays exactly once per visitor, and reports the seat that paid", () => {
    const { earned, paidSeats } = simulate(60_000);
    expect(paidSeats.length).toBeGreaterThan(0);
    // Every payout is the same amount at fixed appeal, so this cross-checks
    // that nobody was double-charged or silently skipped.
    expect(earned).toBeCloseTo(paidSeats.length * visitorPayAmount(1), 5);
    for (const seat of paidSeats) {
      expect(seat).toBeGreaterThanOrEqual(0);
      expect(seat).toBeLessThan(STATS.seatCount);
    }
  });

  it("never seats more visitors than there are seats", () => {
    // Huge appeal: arrivals are as fast as the game allows, so seats must bind.
    const busy = cafeStats(500, {});
    const { peakConcurrent } = simulate(120_000, 50, busy);
    expect(peakConcurrent).toBeLessThanOrEqual(busy.seatCount);
  });

  it("never seats two visitors in the same seat at once", () => {
    const busy = cafeStats(500, {});
    let visitors: Visitor[] = [];
    let lastSpawnAt = 0;
    for (let now = 0; now <= 120_000; now += 50) {
      const result = tickVisitors(visitors, now, lastSpawnAt, busy);
      visitors = result.visitors;
      lastSpawnAt = result.lastSpawnAt;
      const seats = visitors.map((v) => v.seatIndex);
      expect(new Set(seats).size).toBe(seats.length);
    }
  });

  it("earns more per unit time in a bigger café once seats are the bottleneck", () => {
    const small = simulate(120_000, 50, cafeStats(500, {})).earned;
    const large = simulate(120_000, 50, cafeStats(500, { seating: 6 })).earned;
    expect(large).toBeGreaterThan(small);
  });

  it("does not mutate the visitor array it was given", () => {
    const before = tickVisitors([], ECONOMY_CONFIG.baseVisitorIntervalMs, 0, STATS).visitors;
    const snapshot = before.map((v) => ({ ...v }));
    tickVisitors(before, before[0].leavingAt + 1, 0, STATS);
    expect(before).toEqual(snapshot);
  });
});
