import { describe, expect, it } from "vitest";
import { CHORES, CHORES_BY_ID, FIRST_DUE_MS } from "@/data/chores";
import {
  choreAppeal,
  completeChore,
  dueAt,
  dueChores,
  isDue,
  sanitizeChores,
} from "@/systems/chores";

const OPENED = 1_000_000;
const window = CHORES_BY_ID.get("window")!;

describe("chores", () => {
  it("has the window waiting a few seconds after the café opens", () => {
    // The whole point of the feature: the walkthrough ends, the player has no
    // money, and within moments there is something to do. `openedAt` is
    // stamped when the guide leaves, so this delay is measured from *her*
    // walking out — long enough not to tread on her last line, short enough
    // that the player is never left with an empty screen.
    expect(FIRST_DUE_MS.window).toBeGreaterThan(0);
    expect(FIRST_DUE_MS.window).toBeLessThanOrEqual(15_000);
    expect(isDue(window, {}, OPENED, OPENED)).toBe(false);
    expect(isDue(window, {}, OPENED, OPENED + FIRST_DUE_MS.window)).toBe(true);
  });

  it("staggers the others so the first hour has a rhythm", () => {
    const soon = OPENED + 30_000;
    const due = CHORES.filter((c) => isDue(c, {}, OPENED, soon));
    expect(due.map((c) => c.id)).toEqual(["window"]);
    // Every other job waits minutes, not seconds — three at once on the first
    // screen is a list of demands, not a café.
    for (const chore of CHORES) {
      if (chore.id === "window") continue;
      expect(FIRST_DUE_MS[chore.id]).toBeGreaterThan(60_000);
    }
  });

  it("comes back round after its interval, and not before", () => {
    const log = completeChore({}, "window", OPENED);
    expect(isDue(window, log, OPENED, OPENED + window.everyMs - 1)).toBe(false);
    expect(isDue(window, log, OPENED, OPENED + window.everyMs)).toBe(true);
    expect(dueAt(window, log, OPENED)).toBe(OPENED + window.everyMs);
  });

  it("offers the longest-overdue job first", () => {
    // Everything due at once: the order must come from how long each has been
    // waiting, not from catalogue order.
    const HOUR = 60 * 60 * 1000;
    const now = OPENED + 100 * HOUR;
    // Intervals are 4h (window), 6h (tables), 8h (sweep), so these land
    // overdue by 1h, 4h and 12h respectively.
    const log = { window: now - 5 * HOUR, tables: now - 10 * HOUR, sweep: now - 20 * HOUR };
    expect(dueChores(log, OPENED, now).map((c) => c.id)).toEqual([
      "sweep",
      "tables",
      "window",
    ]);
  });

  it("only ever adds appeal — a neglected café is never worse than none", () => {
    const everythingDue = choreAppeal({}, OPENED, OPENED + 10 * 60 * 60 * 1000);
    expect(everythingDue).toBe(0);

    let log: Record<string, number> = {};
    for (const chore of CHORES) log = completeChore(log, chore.id, OPENED);
    const allFresh = choreAppeal(log, OPENED, OPENED);
    expect(allFresh).toBeCloseTo(
      CHORES.reduce((sum, c) => sum + c.appeal, 0),
      6,
    );
    // The floor is zero, never negative, however long the café is left alone.
    expect(choreAppeal({}, OPENED, OPENED + 1e12)).toBe(0);
  });

  it("does not mutate the log it is given", () => {
    const log = { window: 5 };
    const next = completeChore(log, "window", 99);
    expect(log.window).toBe(5);
    expect(next.window).toBe(99);
  });

  it("ignores a chore that no longer exists", () => {
    expect(completeChore({}, "polish-the-samovar", 1)).toEqual({});
    expect(sanitizeChores({ window: 5, "retired-chore": 9 })).toEqual({ window: 5 });
  });

  it("throws nothing at a garbage save and keeps what is usable", () => {
    expect(sanitizeChores(null)).toEqual({});
    expect(sanitizeChores("nonsense")).toEqual({});
    expect(sanitizeChores({ window: Number.NaN })).toEqual({});
    expect(sanitizeChores({ window: Number.POSITIVE_INFINITY })).toEqual({});
    expect(sanitizeChores({ window: -1 })).toEqual({});
    expect(sanitizeChores({ window: 12, tables: "soon" })).toEqual({ window: 12 });
  });
});
