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
 * The parts of the café a chore's existence can depend on. See `ChoreNeeds`.
 *
 * A narrow shape rather than the whole state, so this stays pure and a test
 * can describe a café in two lines.
 */
export interface ChoreSubjects {
  purchased: string[];
  windows: string[];
}

/**
 * Has the café actually got the thing this job is about?
 *
 * **Required at every call site rather than defaulting to "yes".** A default
 * would let a caller quietly reintroduce the bug this exists to stop — a
 * marker pointing at a table nobody owns — and the compiler is the only thing
 * that reliably notices.
 */
export function hasSubject(chore: Chore, cafe: ChoreSubjects): boolean {
  const needs = chore.needs;
  if (!needs) return true;
  if (needs.item !== undefined && !cafe.purchased.includes(needs.item)) return false;
  if (needs.window === true && cafe.windows.length === 0) return false;
  return true;
}

/**
 * Everything that wants doing, **longest-overdue first**, so the prompt always
 * offers the job that has been waiting the longest rather than whichever one
 * happens to be first in the catalogue.
 */
export function dueChores(
  log: ChoreLog,
  openedAt: number,
  now: number,
  cafe: ChoreSubjects,
): Chore[] {
  return CHORES.filter((c) => hasSubject(c, cafe) && isDue(c, log, openedAt, now)).sort(
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
 *
 * **A job whose subject is missing counts as nothing, not as fresh.** It is
 * never *due* either — there is nothing to do — so the obvious reading of
 * "fresh means not due" would have paid a café for not owning a table, and
 * paid it more than a café that owns one and has let it get crumby. That is
 * the one direction this system must never run.
 */
export function choreAppeal(
  log: ChoreLog,
  openedAt: number,
  now: number,
  cafe: ChoreSubjects,
): number {
  let total = 0;
  for (const chore of CHORES) {
    if (!hasSubject(chore, cafe)) continue;
    if (!isDue(chore, log, openedAt, now)) total += chore.appeal;
  }
  return total;
}

/**
 * Give a job its first grace period when its subject arrives.
 *
 * Without this, buying a low table into a café that has been open all day is
 * met by an instant "wipe them down" — the chore's clock has been running
 * since `openedAt` against a table that did not exist. Stamping it means the
 * first wipe falls due `everyMs` after you got the thing, which is what the
 * interval means everywhere else. It is the same courtesy `FIRST_DUE_MS`
 * extends to a brand-new café, applied to a brand-new table.
 *
 * **Only for a job that has never been done, and that is what stops it being
 * an exploit.** A stamp is indistinguishable from a completion — it makes the
 * chore fresh, and fresh chores pay appeal. So a rule of "restamp whenever the
 * subject reappears" would mean bricking a window up and re-glazing it (a full
 * refund, so £0) collected the window's appeal every four hours forever,
 * without ever wiping anything. Once a job has a schedule, losing and
 * regaining its subject does not restart it.
 *
 * Takes both sides rather than just the new one so that glazing a *second*
 * window is not an arrival at all.
 */
export function acquireSubjects(
  log: ChoreLog,
  before: ChoreSubjects,
  after: ChoreSubjects,
  now: number,
): ChoreLog {
  let out = log;
  for (const chore of CHORES) {
    if (chore.id in log) continue;
    if (hasSubject(chore, before) || !hasSubject(chore, after)) continue;
    if (out === log) out = { ...log };
    out[chore.id] = now;
  }
  return out;
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
