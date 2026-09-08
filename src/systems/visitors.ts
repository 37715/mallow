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
  /**
   * What they came in for — a menu item id, chosen when they walk in.
   *
   * **This is what makes the menu real** (2026-09-08). Sales used to be
   * tallied by rolling a random menu item at the moment of payment, so no
   * guest ever *had* a drink — the chart was a random tally and inventing a
   * blend moved a hidden average. Ellis: *"the coffee blend section seems a
   * bit random and unnecessary"* — right, because it literally was random.
   * Now the order is a property of the person: it shows over their head at
   * the counter, it decides what they pay, and it is the cup the sales chart
   * counts.
   *
   * Optional, and the system stays content-free: this file never looks inside
   * the id, it just carries what `pickDrink` handed it.
   */
  drinkId?: string;
  /** That drink's pay multiplier, captured at order time. */
  drinkPay?: number;
}

/** What a paying guest actually handed over, and for what. */
export interface PaidVisit {
  /** −1 means the counter — a takeaway pays where they stand. */
  seatIndex: number;
  drinkId?: string;
  amount: number;
}

export interface VisitorTickResult {
  visitors: Visitor[];
  moneyEarned: number;
  lastSpawnAt: number;
  /** True if a visitor was seated/paid this tick — useful for juice/analytics hooks. */
  spawnedThisTick: boolean;
  /**
   * Each visitor who paid this tick — drives the coin pops, the sales chart
   * and the analytics (§10, §11). Carries the true amount, so the floater can
   * show the figure that was actually charged rather than re-deriving an
   * approximation of it (§8 — the price shown and the price charged must be
   * one call).
   */
  paid: PaidVisit[];
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
  order: { id: string; pay: number } | null,
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
    drinkId: order?.id,
    drinkPay: order?.pay,
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
  /** Injectable for tests — the takeaway roll and the order roll. */
  random: () => number = Math.random,
  /**
   * What a new arrival orders. The store passes the menu picker; this system
   * never learns what a drink is. Null means "no menu" and the guest pays the
   * café's average, which is also what every visitor spawned before this
   * existed does — an absent `drinkPay` falls back rather than paying nothing.
   */
  pickDrink: (roll: number) => { id: string; pay: number } | null = () => null,
): VisitorTickResult {
  let moneyEarned = 0;
  const paid: PaidVisit[] = [];

  const next = visitors
    .map((visitor) => {
      // **Paid at the counter, not on the way out.** It is where a café takes
      // your money, it is the only moment a takeaway is standing still, and it
      // puts the coin pop next to the barista rather than beside an empty
      // chair.
      if (!visitor.hasPaid && now >= visitor.servedAt) {
        // **They pay for their drink, not for the menu's average.** The
        // expected value across guests is still the average (the picker is
        // the same one the sales chart always used), so the balance holds —
        // but a guest with your £2 blend in hand now visibly pays more than
        // the one with a filter coffee, which is the whole point of a menu.
        const pay = visitorPayAmount(stats.appeal, visitor.drinkPay ?? stats.payMultiplier);
        const amount = visitor.takeaway ? pay * ECONOMY_CONFIG.takeawayPayFactor : pay;
        moneyEarned += amount;
        paid.push({
          seatIndex: visitor.takeaway ? -1 : visitor.seatIndex,
          drinkId: visitor.drinkId,
          amount,
        });
        return { ...visitor, hasPaid: true };
      }
      return visitor;
    })
    /**
     * **A guest whose chair has left the room gets up.**
     *
     * A seat index is chosen once, when they arrive, out of the seats the café
     * owned *then* — but the room is an editor, so the chair can be sold out
     * from under them. Nothing downstream noticed: `seatPositions` returns a
     * position for all five authored seats whether or not the café owns them,
     * so the guest carried on sitting at the exact spot where the chair used
     * to be. Ellis, 2026-08-26: *"ive seen characters sitting on … just on the
     * floor before.. should never happen."*
     *
     * They leave rather than being teleported to a free chair: standing up and
     * walking out is a thing a person does, and being flicked across the room
     * mid-sip is not. They keep whatever they already paid — the café has had
     * their money and the cup was real.
     */
    .map((visitor) => {
      if (visitor.takeaway || now >= visitor.leavingAt) return visitor;
      if (stats.seats.includes(visitor.seatIndex)) return visitor;
      // `doneAt` is pushed out too, so they get a whole walk to the door
      // rather than whatever was left of the one they were going to have.
      return {
        ...visitor,
        seatedAt: now,
        leavingAt: now,
        doneAt: now + ECONOMY_CONFIG.walkOutDurationMs,
      };
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
      next.push(spawnVisitor(now, seat ?? -1, stats.dwellDurationMs, takeaway, pickDrink(random())));
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
    paid,
  };
}
