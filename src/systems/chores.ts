import { CHORES, CHORES_BY_ID, FIRST_DUE_MS, type Chore } from "@/data/chores";

/**
 * When each chore was last done, keyed by id. Pure logic — see `data/chores.ts`
 * for what a chore is and why it works this way.
 *
 * **A missing entry means "never done", not "done at zero".** The difference
 * decides what a brand-new café looks like: `dueAt` reads `FIRST_DUE_MS` from
 * the café's opening time for an id it has not seen, which is what puts the
 * window on the mat the moment the walkthrough ends instead of four hours
 * later.
 */
export type ChoreLog = Record<string, number>;

/** When a chore next needs doing. */
export function dueAt(chore: Chore, log: ChoreLog, openedAt: number): number {
  const last = log[chore.id];
  if (typeof last !== "number") return openedAt + (FIRST_DUE_MS[chore.id] ?? 0);
  return last + chore.everyMs;
}

export function isDue(chore: Chore, log: ChoreLog, openedAt: number, now: number): boolean {
  return now >= dueAt(chore, log, openedAt);
}

/**
 * Everything that wants doing, **longest-overdue first**, so the prompt always
 * offers the job that has been waiting the longest rather than whichever one
 * happens to be first in the catalogue.
 */
export function dueChores(log: ChoreLog, openedAt: number, now: number): Chore[] {
  return CHORES.filter((c) => isDue(c, log, openedAt, now)).sort(
    (a, b) => dueAt(a, log, openedAt) - dueAt(b, log, openedAt),
  );
}

/**
 * The appeal a well-kept café is carrying right now.
 *
 * Only *fresh* chores count. Nothing is ever subtracted for a chore being due:
 * a café that never does one earns what it would have earned if this system
 * did not exist (`data/chores.ts` has the reasoning, and it is a pillar-1
 * requirement rather than a balance choice).
 */
export function choreAppeal(log: ChoreLog, openedAt: number, now: number): number {
  let total = 0;
  for (const chore of CHORES) {
    if (!isDue(chore, log, openedAt, now)) total += chore.appeal;
  }
  return total;
}

/** Mark one done. Returns a new log; never mutates. */
export function completeChore(log: ChoreLog, id: string, now: number): ChoreLog {
  if (!CHORES_BY_ID.has(id)) return log;
  return { ...log, [id]: now };
}

/**
 * Drop ids that are not in the catalogue and anything that is not a finite
 * timestamp.
 *
 * Same defensive shape as `sanitizeUpgrades`: a chore retired in a later
 * version must be able to disappear from a save without corrupting it, and a
 * garbage value must not be able to push a chore's due date past the heat
 * death of the universe.
 */
export function sanitizeChores(value: unknown): ChoreLog {
  if (!value || typeof value !== "object") return {};
  const out: ChoreLog = {};
  for (const [id, at] of Object.entries(value as Record<string, unknown>)) {
    if (!CHORES_BY_ID.has(id)) continue;
    if (typeof at !== "number" || !Number.isFinite(at) || at < 0) continue;
    out[id] = at;
  }
  return out;
}
