/**
 * Minimal typed pub/sub for gameplay moments that the juice layer (§10) wants
 * to react to — coin pops, sounds — without systems/ or state/ knowing that
 * renderers or speakers exist.
 */

export interface GameEvents {
  /**
   * A visitor paid at the counter. One event per visitor, carrying the actual
   * amount charged — the floater shows this figure rather than re-deriving an
   * approximation, per §8's "the price shown and the price charged must be one
   * call".
   */
  visitorPaid: { seatIndex: number; amount: number; drinkId?: string };
  /**
   * Somebody bought the player's own blend for the first time (2026-09-08).
   *
   * The payoff for the whole menu feature: the drink the player *named* being
   * ordered by a real guest. Fired once per blend, ever.
   */
  blendFirstSale: { name: string };
  /** Lifetime XP crossed into a new level. Fired once per level gained. */
  levelUp: { level: number };
  /**
   * The player emptied the till into the bank (`systems/till.ts`).
   *
   * Announced rather than handled where it happens, because the money moves in
   * the HUD and the *celebration* belongs over the café — the coins should come
   * off the counter, which only the scene knows where to find.
   */
  tillCollected: { amount: number };
}

type Handler<K extends keyof GameEvents> = (payload: GameEvents[K]) => void;

// Internally untyped list per event name; the exported API keeps full typing.
const handlers = new Map<keyof GameEvents, Handler<never>[]>();

export function onGameEvent<K extends keyof GameEvents>(name: K, handler: Handler<K>): void {
  const list = handlers.get(name) ?? [];
  list.push(handler as Handler<never>);
  handlers.set(name, list);
}

export function emitGameEvent<K extends keyof GameEvents>(name: K, payload: GameEvents[K]): void {
  for (const handler of handlers.get(name) ?? []) {
    (handler as Handler<K>)(payload);
  }
}
