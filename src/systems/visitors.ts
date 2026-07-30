import { ECONOMY_CONFIG, visitorIntervalMs, visitorPayAmount } from "@/data/economy";

export type VisitorPhase = "walkingIn" | "seated" | "walkingOut";

export interface Visitor {
  id: string;
  seatIndex: number;
  /** Timestamp (ms, same clock as `now`) this visitor was spawned. */
  spawnedAt: number;
  /** Timestamp this visitor finishes walking in and starts sitting. */
  seatedAt: number;
  /** Timestamp this visitor pays up and starts walking out. */
  leavingAt: number;
  /** Timestamp this visitor has fully left and can be removed. */
  doneAt: number;
  /** Set once payment has been collected, so we never double-pay. */
  hasPaid: boolean;
}

export interface VisitorTickResult {
  visitors: Visitor[];
  moneyEarned: number;
  lastSpawnAt: number;
  /** True if a visitor was seated/paid this tick — useful for juice/analytics hooks. */
  spawnedThisTick: boolean;
}

let nextVisitorId = 0;

export function phaseOf(visitor: Visitor, now: number): VisitorPhase {
  if (now < visitor.seatedAt) return "walkingIn";
  if (now < visitor.leavingAt) return "seated";
  return "walkingOut";
}

function freeSeatIndex(visitors: Visitor[], seatCount: number): number | null {
  const occupied = new Set(visitors.map((v) => v.seatIndex));
  for (let i = 0; i < seatCount; i++) {
    if (!occupied.has(i)) return i;
  }
  return null;
}

function spawnVisitor(now: number, seatIndex: number): Visitor {
  const seatedAt = now + ECONOMY_CONFIG.walkInDurationMs;
  const leavingAt = seatedAt + ECONOMY_CONFIG.dwellDurationMs;
  const doneAt = leavingAt + ECONOMY_CONFIG.walkOutDurationMs;
  return {
    id: `visitor-${nextVisitorId++}`,
    seatIndex,
    spawnedAt: now,
    seatedAt,
    leavingAt,
    doneAt,
    hasPaid: false,
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
  appeal: number,
  seatCount: number,
): VisitorTickResult {
  let moneyEarned = 0;

  const next = visitors
    .map((visitor) => {
      if (!visitor.hasPaid && now >= visitor.leavingAt) {
        moneyEarned += visitorPayAmount(appeal);
        return { ...visitor, hasPaid: true };
      }
      return visitor;
    })
    .filter((visitor) => now < visitor.doneAt);

  let spawnedThisTick = false;
  let updatedLastSpawnAt = lastSpawnAt;

  const readyToSpawn = now - lastSpawnAt >= visitorIntervalMs(appeal);
  if (readyToSpawn) {
    const seat = freeSeatIndex(next, seatCount);
    if (seat !== null) {
      next.push(spawnVisitor(now, seat));
      spawnedThisTick = true;
    }
    // Reset the spawn timer even if no seat was free, so we don't spam-check every frame.
    updatedLastSpawnAt = now;
  }

  return { visitors: next, moneyEarned, lastSpawnAt: updatedLastSpawnAt, spawnedThisTick };
}
