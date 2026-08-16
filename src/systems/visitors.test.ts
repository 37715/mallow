import { describe, expect, it } from "vitest";
import { phaseOf, tickVisitors, type Visitor } from "@/systems/visitors";
import { cafeStats } from "@/systems/cafe";
import { ECONOMY_CONFIG, visitorPayAmount } from "@/data/economy";

const STATS = cafeStats(1, {});

/**
 * Run the loop forward in fixed steps, accumulating what happened.
 *
 * `random` defaults to "always sit": the takeaway roll is the only randomness
 * in the system, and leaving it live would make every assertion about totals
 * flaky. The takeaway behaviour has its own tests.
 */
function simulate(durationMs: number, stepMs = 100, stats = STATS, random = () => 1) {
  let visitors: Visitor[] = [];
  let lastSpawnAt = 0;
  let earned = 0;
  const paidSeats: number[] = [];
  let peakConcurrent = 0;

  for (let now = 0; now <= durationMs; now += stepMs) {
    const result = tickVisitors(visitors, now, lastSpawnAt, stats, random);
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
    // `() => 1` is "does not take it away". Left to the real `Math.random`
    // this asserted a seat index about four times in five and failed the rest,
    // which is a flaky test rather than a bug — the takeaway roll has its own.
    const result = tickVisitors([], ECONOMY_CONFIG.baseVisitorIntervalMs, 0, STATS, () => 1);
    expect(result.visitors).toHaveLength(1);
    expect(result.spawnedThisTick).toBe(true);
    expect(result.visitors[0].seatIndex).toBe(0);
    expect(result.visitors[0].hasPaid).toBe(false);
  });

  it("walks a visitor in → counter → seat → out", () => {
    const [visitor] = tickVisitors(
      [], ECONOMY_CONFIG.baseVisitorIntervalMs, 0, STATS, () => 1,
    ).visitors;
    expect(visitor.takeaway).toBe(false);
    expect(phaseOf(visitor, visitor.spawnedAt)).toBe("walkingIn");
    // The counter stop is the new part, and it has to be a real interval or
    // the barista never sees anybody.
    expect(phaseOf(visitor, visitor.orderedAt + 1)).toBe("ordering");
    expect(visitor.servedAt).toBeGreaterThan(visitor.orderedAt);
    expect(phaseOf(visitor, visitor.servedAt + 1)).toBe("walkingToSeat");
    expect(phaseOf(visitor, visitor.seatedAt + 1)).toBe("seated");
    expect(phaseOf(visitor, visitor.leavingAt + 1)).toBe("walkingOut");
  });

  it("sends a takeaway straight back out from the counter", () => {
    const [visitor] = tickVisitors(
      [], ECONOMY_CONFIG.baseVisitorIntervalMs, 0, STATS, () => 0,
    ).visitors;
    expect(visitor.takeaway).toBe(true);
    expect(visitor.seatIndex).toBe(-1);
    expect(phaseOf(visitor, visitor.orderedAt + 1)).toBe("ordering");
    // No sitting phase at all — they turn round where they stand.
    expect(phaseOf(visitor, visitor.servedAt + 1)).toBe("walkingOut");
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

  it("never seats two visitors in the same seat at once", () => {
    // Takeaways hold no seat (index −1), so only the sitters are checked —
    // that is the whole point of them, and counting everyone would make this
    // test assert the opposite of the feature.
    const busy = cafeStats(500, {});
    let visitors: Visitor[] = [];
    let lastSpawnAt = 0;
    for (let now = 0; now <= 120_000; now += 50) {
      const result = tickVisitors(visitors, now, lastSpawnAt, busy);
      visitors = result.visitors;
      lastSpawnAt = result.lastSpawnAt;
      const seats = visitors.filter((v) => !v.takeaway).map((v) => v.seatIndex);
      expect(new Set(seats).size).toBe(seats.length);
      expect(seats.length).toBeLessThanOrEqual(busy.seatCount);
    }
  });

  it("serves a full café instead of turning people away", () => {
    /**
     * The behaviour this whole change exists for. With one seat and a flood of
     * arrivals the old loop dropped everybody after the first — a busy café
     * looked identical to an empty one. Now the overflow buys a cup and goes.
     */
    const busy = { ...cafeStats(500, {}), seats: [0], seatCount: 1 };
    let visitors: Visitor[] = [];
    let lastSpawnAt = 0;
    let takeaways = 0;
    const seen = new Set<string>();
    for (let now = 0; now <= 120_000; now += 50) {
      const result = tickVisitors(visitors, now, lastSpawnAt, busy, () => 1);
      visitors = result.visitors;
      lastSpawnAt = result.lastSpawnAt;
      for (const v of visitors) {
        if (v.takeaway && !seen.has(v.id)) {
          seen.add(v.id);
          takeaways++;
        }
      }
    }
    expect(takeaways).toBeGreaterThan(5);
  });

  it("never serves a takeaway in a café with nowhere to sit at all", () => {
    // A café that has not bought a chair yet must not quietly earn anyway —
    // that would hide the fact that it needs one.
    const bare = { ...cafeStats(500, {}), seats: [], seatCount: 0 };
    const result = tickVisitors([], 999_999, 0, bare, () => 0);
    expect(result.visitors).toHaveLength(0);
  });

  it("pays less for a cup to go than for a visit", () => {
    // Seating has to stay worth expanding — see `takeawayPayFactor`.
    const stats = cafeStats(500, {});
    const stay = tickVisitors([], 999_999, 0, stats, () => 1);
    const away = tickVisitors([], 999_999, 0, stats, () => 0);
    const earn = (v: Visitor[], takeawayExpected: boolean) => {
      expect(v[0].takeaway).toBe(takeawayExpected);
      return tickVisitors(v, v[0].servedAt + 1, v[0].servedAt, stats).moneyEarned;
    };
    expect(earn(away.visitors, true)).toBeLessThan(earn(stay.visitors, false));
  });

  it("earns more from a better-appointed café over the same window", () => {
    const plain = simulate(120_000, 50, cafeStats(500, {})).earned;
    const nice = simulate(120_000, 50, cafeStats(500, { brews: 8 }, 4)).earned;
    expect(nice).toBeGreaterThan(plain);
  });

  it("does not mutate the visitor array it was given", () => {
    const before = tickVisitors([], ECONOMY_CONFIG.baseVisitorIntervalMs, 0, STATS).visitors;
    const snapshot = before.map((v) => ({ ...v }));
    tickVisitors(before, before[0].leavingAt + 1, 0, STATS);
    expect(before).toEqual(snapshot);
  });
});
