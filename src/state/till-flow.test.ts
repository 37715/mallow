/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";
import { gameStore } from "@/state/store";
import { tillCapacity } from "@/systems/till";

/**
 * **Where the money goes**, tested at the store rather than in `systems/till.ts`,
 * because the routing is the part that can go wrong: every one of these paths
 * used to write to `money` directly, and a single missed one would quietly
 * restore the old "come back after four days to a fortune" behaviour with
 * every unit test still green.
 */
beforeEach(() => {
  gameStore.setState({ money: 0, till: 0, upgrades: {} });
});

describe("the till is where takings land", () => {
  it("banks nothing until it is collected", () => {
    gameStore.setState({ till: 320 });
    expect(gameStore.getState().money).toBe(0);
    expect(gameStore.getState().collectTill()).toBe(320);
    expect(gameStore.getState().money).toBe(320);
    expect(gameStore.getState().till).toBe(0);
  });

  it("keeps the fraction that has not become a coin yet", () => {
    // It accrues fractions of a penny every frame. Rounding up would mint
    // money on every tap; zeroing the till after flooring would eat it.
    gameStore.setState({ till: 12.75 });
    expect(gameStore.getState().collectTill()).toBe(12);
    expect(gameStore.getState().money).toBe(12);
    expect(gameStore.getState().till).toBeCloseTo(0.75, 5);
  });

  it("refuses an empty till rather than paying out zero", () => {
    expect(gameStore.getState().collectTill()).toBe(0);
    gameStore.setState({ till: 0.4 });
    expect(gameStore.getState().collectTill()).toBe(0);
    expect(gameStore.getState().till).toBeCloseTo(0.4, 5);
  });
});

describe("time away", () => {
  it("cannot pay more than one full drawer, however long you are gone", () => {
    // The mechanic's whole reason for existing (Ellis: *"u cant just go
    // offline for 4 days and come back to being rich"*).
    const cap = tillCapacity(gameStore.getState().upgrades);
    const aWeek = 7 * 24 * 60 * 60 * 1000;
    gameStore.getState().grantOfflineEarnings(aWeek);
    expect(gameStore.getState().till).toBeLessThanOrEqual(cap);
    // And none of it is spendable until the player comes and gets it.
    expect(gameStore.getState().money).toBe(0);
  });

  it("reports only what the till could actually take", () => {
    const cap = tillCapacity(gameStore.getState().upgrades);
    gameStore.setState({ till: cap });
    // A full till has no room, so the welcome-back card must promise nothing
    // rather than announcing money that bounced off the brim.
    expect(gameStore.getState().grantOfflineEarnings(8 * 60 * 60 * 1000)).toBe(0);
    expect(gameStore.getState().till).toBe(cap);
  });
});

describe("money that is not takings", () => {
  it("pays chores straight into the bank", () => {
    // Work the player did, not trade the café made while they were out — and
    // routing it through the till would let a full drawer swallow the reward.
    const before = gameStore.getState().money;
    gameStore.setState({
      till: tillCapacity(gameStore.getState().upgrades),
      // Long open, never swept: the job is well overdue, so it can be done.
      openedAt: 1,
      chores: {},
    });
    gameStore.getState().finishChore("sweep");
    expect(gameStore.getState().money).toBeGreaterThan(before);
  });

  it("has no ceiling on the bank", () => {
    // The £9,999 cap is gone (Ellis: *"there should be no limit"*). What is
    // bounded is the till, not what you own.
    gameStore.setState({ money: 250_000 });
    gameStore.setState({ till: 500 });
    gameStore.getState().collectTill();
    expect(gameStore.getState().money).toBe(250_500);
  });
});
