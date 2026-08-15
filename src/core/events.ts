/**
 * Minimal typed pub/sub for gameplay moments that the juice layer (§10) wants
 * to react to — coin pops, sounds — without systems/ or state/ knowing that
 * renderers or speakers exist.
 */

export interface GameEvents {
  /** A visitor finished their visit and paid. One event per visitor. */
  visitorPaid: { seatIndex: number };
  /** Lifetime XP crossed into a new level. Fired once per level gained. */
  levelUp: { level: number };
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
