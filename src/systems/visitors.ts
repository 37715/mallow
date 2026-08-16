import { ECONOMY_CONFIG, visitorIntervalMs, visitorPayAmount } from "@/data/economy";
import type { CafeStats } from "@/systems/cafe";

/**
 * A visit, as a sequence rather than a state.
 *
 * **Everyone orders first.** Ellis, 2026-08-26: *"i still want them to talk to
 * my character and order before sitting down. or sometimes buy the drink and
 * walk out with it. make it more real rather than a constant stream of people
 * just sitting in the chair."* The old loop was spawn → seat → pay → leave,
 * which is a waiting room: nobody ever interacted with the counter the player
 * stands behind, and a café with no seats free simply refused to serve anybody.
 *
 * Now: in → **counter** → served → either a seat, or straight back out with a
 * cup. That last branch is the one that changes how the room feels, because it
 * means a busy café is *busy* rather than closed.
 */
export type VisitorPhase =
  | "walkingIn"
  | "ordering"
  | "walkingToSeat"
  | "seated"
  | "walkingOut";

export interface Visitor {
  id: string;
  /** Which chair they are heading for, or −1 for a takeaway. */
  seatIndex: number;
  /** Timestamp (ms, same clock as `now`) this visitor was spawned. */
  spawnedAt: number;
  /** Timestamp they reach the counter and start ordering. */
  orderedAt: number;
  /** Timestamp they have their drink and money changes hands. */
  servedAt: number;
  /** Timestamp they finish crossing to their chair. Equals `servedAt` for a takeaway. */
  seatedAt: number;
  /** Timestamp they get up and start walking out. */
  leavingAt: number;
  /** Timestamp this visitor has fully left and can be removed. */
  doneAt: number;
  /** Set once payment has been collected, so we never double-pay. */
  hasPaid: boolean;
  /** Taking it with them rather than sitting down. */
  takeaway: boolean;
}

export interface VisitorTickResult {
  visitors: Visitor[];
  moneyEarned: number;
  lastSpawnAt: number;
  /** True if a visitor was seated/paid this tick — useful for juice/analytics hooks. */
  spawnedThisTick: boolean;
  /**
   * Seat of each visitor who paid this tick — drives the coin-pop juice (§10).
   * **−1 means the counter**, which is where a takeaway pays.
   */
  paidSeatIndexes: number[];
}

let nextVisitorId = 0;

export function phaseOf(visitor: Visitor, now: number): VisitorPhase {
  if (now < visitor.orderedAt) return "walkingIn";
  if (now < visitor.servedAt) return "ordering";
  if (visitor.takeaway) return "walkingOut";
  if (now < visitor.seatedAt) return "walkingToSeat";
  if (now < visitor.leavingAt) return "seated";
  return "walkingOut";
}

function freeSeatIndex(visitors: Visitor[], seats: number[]): number | null {
  // A takeaway holds no seat, so it must not block one.
  const occupied = new Set(visitors.filter((v) => !v.takeaway).map((v) => v.seatIndex));
  for (const i of seats) {
    if (!occupied.has(i)) return i;
  }
  return null;
}

/**
 * Lay out one visit on the clock.
 *
 * The walk in is split: most of it is getting to the counter, and a short hop
 * afterwards is crossing to the chair. A takeaway skips that hop and turns
 * round where it stands.
 */
function spawnVisitor(
  now: number,
  seatIndex: number,
  dwellMs: number,
  takeaway: boolean,
): Visitor {
  const orderedAt = now + ECONOMY_CONFIG.walkInDurationMs * 0.65;
  const servedAt = orderedAt + ECONOMY_CONFIG.orderDurationMs;
  const seatedAt = takeaway ? servedAt : servedAt + ECONOMY_CONFIG.walkInDurationMs * 0.35;
  const leavingAt = takeaway ? servedAt : seatedAt + dwellMs;
  const doneAt = leavingAt + ECONOMY_CONFIG.walkOutDurationMs;
  return {
    id: `visitor-${nextVisitorId++}`,
    seatIndex: takeaway ? -1 : seatIndex,
    spawnedAt: now,
    orderedAt,
    servedAt,
    seatedAt,
    leavingAt,
    doneAt,
    hasPaid: false,
    takeaway,
  };
}

/**
 * Advances the visitor simulation by one tick. Pure function: takes the previous
 * state and `now`, returns the next state plus any money earned this tick.
 */
export function tickVisitors(
  visitors: Visitor[],
  now: number,
  lastSpawnAt: number,
  stats: CafeStats,
  /** Injectable for tests — the takeaway roll is the only randomness here. */
  random: () => number = Math.random,
): VisitorTickResult {
  let moneyEarned = 0;
  const paidSeatIndexes: number[] = [];

  const next = visitors
    .map((visitor) => {
      // **Paid at the counter, not on the way out.** It is where a café takes
      // your money, it is the only moment a takeaway is standing still, and it
      // puts the coin pop next to the barista rather than beside an empty
      // chair.
      if (!visitor.hasPaid && now >= visitor.servedAt) {
        const pay = visitorPayAmount(stats.appeal, stats.payMultiplier);
        moneyEarned += visitor.takeaway ? pay * ECONOMY_CONFIG.takeawayPayFactor : pay;
        paidSeatIndexes.push(visitor.takeaway ? -1 : visitor.seatIndex);
        return { ...visitor, hasPaid: true };
      }
      return visitor;
    })
    .filter((visitor) => now < visitor.doneAt);

  let spawnedThisTick = false;
  let updatedLastSpawnAt = lastSpawnAt;

  const readyToSpawn = now - lastSpawnAt >= visitorIntervalMs(stats.appeal);
  if (readyToSpawn) {
    const seat = freeSeatIndex(next, stats.seats);
    /**
     * **A full café serves you anyway.** This is the branch that matters: the
     * old loop dropped the arrival entirely when every chair was taken, so a
     * popular café looked exactly like an empty one from the doorway. Now they
     * queue, buy a cup and go — worth less than a proper visit
     * (`takeawayPayFactor`), so seating is still the thing worth expanding.
     *
     * A café with nowhere to sit *at all* is a different case: it has not
     * bought a chair yet, and quietly earning without one would hide the fact
     * that it needs one.
     */
    const noSeatFree = seat === null;
    const takeaway = stats.seats.length > 0 && (noSeatFree || random() < ECONOMY_CONFIG.takeawayChance);
    if (seat !== null || takeaway) {
      next.push(spawnVisitor(now, seat ?? -1, stats.dwellDurationMs, takeaway));
      spawnedThisTick = true;
    }
    // Reset the spawn timer even if nobody came, so we don't spam-check every frame.
    updatedLastSpawnAt = now;
  }

  return {
    visitors: next,
    moneyEarned,
    lastSpawnAt: updatedLastSpawnAt,
    spawnedThisTick,
    paidSeatIndexes,
  };
}
