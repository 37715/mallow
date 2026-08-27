import { describe, expect, it } from "vitest";
import { CHORES, CHORES_BY_ID, FIRST_DUE_MS } from "@/data/chores";
import {
  acquireSubjects,
  choreAppeal,
  completeChore,
  dueAt,
  dueChores,
  hasSubject,
  isDue,
  sanitizeChores,
  type ChoreSubjects,
} from "@/systems/chores";

const OPENED = 1_000_000;
const window = CHORES_BY_ID.get("window")!;

/**
 * A café that owns everything any chore is about, so the tests below are about
 * *timing*. The subject gate has its own block at the bottom.
 */
const STOCKED: ChoreSubjects = {
  purchased: CHORES.flatMap((c) => (c.needs?.item ? [c.needs.item] : [])),
  windows: ["back:0,0"],
};
const BARE: ChoreSubjects = { purchased: [], windows: [] };

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
    expect(dueChores(log, OPENED, now, STOCKED).map((c) => c.id)).toEqual([
      "sweep",
      "tables",
      "window",
    ]);
  });

  it("only ever adds appeal — a neglected café is never worse than none", () => {
    const everythingDue = choreAppeal({}, OPENED, OPENED + 10 * 60 * 60 * 1000, STOCKED);
    expect(everythingDue).toBe(0);

    let log: Record<string, number> = {};
    for (const chore of CHORES) log = completeChore(log, chore.id, OPENED);
    const allFresh = choreAppeal(log, OPENED, OPENED, STOCKED);
    expect(allFresh).toBeCloseTo(
      CHORES.reduce((sum, c) => sum + c.appeal, 0),
      6,
    );
    // The floor is zero, never negative, however long the café is left alone.
    expect(choreAppeal({}, OPENED, OPENED + 1e12, STOCKED)).toBe(0);
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

  /**
   * **A job about something the café has not got is worse than no job.** Found
   * by looking at the markers, 2026-08-17: the "tables" chore came due in a
   * café that had never bought a table, and its marker pointed at bare floor.
   */
  describe("a job needs the thing it is about", () => {
    const LATER = OPENED + 1000 * 60 * 60 * 24;
    const tables = CHORES_BY_ID.get("tables")!;
    const sweep = CHORES_BY_ID.get("sweep")!;

    it("does not offer the table wipe in a café with no table", () => {
      expect(hasSubject(tables, BARE)).toBe(false);
      expect(dueChores({}, OPENED, LATER, BARE).map((c) => c.id)).not.toContain("tables");
    });

    it("does not offer the window wipe once the glass is bricked up", () => {
      // Builder mode can take a window out again and refund it, so "the café
      // has a window" is a live fact, not a constant.
      expect(hasSubject(window, { purchased: [], windows: [] })).toBe(false);
      expect(hasSubject(window, { purchased: [], windows: ["back:0,0"] })).toBe(true);
    });

    it("always offers the sweep, because every café has floorboards", () => {
      expect(hasSubject(sweep, BARE)).toBe(true);
      expect(dueChores({}, OPENED, LATER, BARE).map((c) => c.id)).toContain("sweep");
    });

    it("pays nothing for a job it cannot do", () => {
      // The trap this closes: an unavailable chore is never *due* either, so
      // "fresh means not due" would have paid a café for **not owning a
      // table** — and paid it more than a café that owns one and has let it
      // get crumby. That is the one direction this system must never run.
      const bare = choreAppeal({}, OPENED, LATER, BARE);
      const stocked = choreAppeal({}, OPENED, LATER, STOCKED);
      expect(bare).toBe(0);
      expect(stocked).toBe(0);

      let clean: Record<string, number> = {};
      for (const chore of CHORES) clean = completeChore(clean, chore.id, LATER);
      expect(choreAppeal(clean, OPENED, LATER, BARE)).toBeLessThan(
        choreAppeal(clean, OPENED, LATER, STOCKED),
      );
    });

    it("starts the clock when the subject arrives, not when the café opened", () => {
      // Buying a table into a café that has been open all day must not be met
      // by an instant "wipe them down".
      const log = acquireSubjects({}, BARE, STOCKED, LATER);
      expect(log.tables).toBe(LATER);
      expect(isDue(tables, log, OPENED, LATER)).toBe(false);
      expect(isDue(tables, log, OPENED, LATER + tables.everyMs)).toBe(true);
    });

    it("cannot be farmed by taking the subject away and putting it back", () => {
      // A stamp is indistinguishable from a completion — it makes the chore
      // fresh, and fresh chores pay appeal. Bricking a window up refunds in
      // full, so without this rule two taps would collect the window's appeal
      // every four hours for ever, without wiping anything.
      const withGlass: ChoreSubjects = { purchased: [], windows: ["back:0,0"] };
      const done = completeChore({}, "window", OPENED);
      const afterCycle = acquireSubjects(done, BARE, withGlass, LATER);
      expect(afterCycle.window).toBe(OPENED);
      expect(isDue(window, afterCycle, OPENED, LATER)).toBe(true);
    });

    it("does not reset a job when a second window is glazed", () => {
      const one: ChoreSubjects = { purchased: [], windows: ["back:0,0"] };
      const two: ChoreSubjects = { purchased: [], windows: ["back:0,0", "left:0,0"] };
      const log = { window: 42 };
      expect(acquireSubjects(log, one, two, LATER)).toEqual({ window: 42 });
    });

    it("leaves the log alone when nothing arrived", () => {
      const log = { window: 42 };
      // Same object, not just an equal one: this runs on every purchase.
      expect(acquireSubjects(log, STOCKED, STOCKED, LATER)).toBe(log);
    });
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
