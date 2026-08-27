/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";
import { gameStore } from "@/state/store";
import { ECONOMY_CONFIG } from "@/data/economy";
import { DEFAULT_PLAYER } from "@/data/player";

/**
 * **The walkthrough's parting gift is a one-shot, and the guard is the only
 * thing making it one.**
 *
 * Ellis, 2026-08-23: *"i want to gift the player 1000$ to get started at the
 * end of the tutorial."* The gift rides on `finishTutorial`, which is also
 * what "show me round again" ends with — so if a replay could reach the money
 * a second time, the settings panel would be a £1,000 button with a tour
 * attached. It cannot, because a replay no longer clears `tutorialDone`
 * (`replayTutorial` in `main.ts`) and this guard is what reads that flag.
 *
 * Worth a test of its own rather than a line in a bigger one: the failure is
 * silent and *generous*, which is the kind nobody reports.
 */
function unfinished(money = 0): void {
  gameStore.setState({
    money,
    player: { ...DEFAULT_PLAYER, created: true, tutorialDone: false },
  });
}

describe("the welcome gift", () => {
  beforeEach(() => unfinished());

  it("pays out once, when the guide leaves", () => {
    expect(gameStore.getState().finishTutorial()).toBe(ECONOMY_CONFIG.welcomeGift);
    expect(gameStore.getState().money).toBe(ECONOMY_CONFIG.welcomeGift);
    expect(gameStore.getState().player.tutorialDone).toBe(true);
  });

  it("pays nothing the second time, however the tour is reached", () => {
    gameStore.getState().finishTutorial();
    const after = gameStore.getState().money;
    expect(gameStore.getState().finishTutorial()).toBe(0);
    expect(gameStore.getState().money).toBe(after);
  });

  it("adds to what is already in the till rather than replacing it", () => {
    unfinished(120);
    gameStore.getState().finishTutorial();
    expect(gameStore.getState().money).toBe(120 + ECONOMY_CONFIG.welcomeGift);
  });

  it("pays in full, because the bank has no ceiling any more", () => {
    // The £9,999 cap on money went on 2026-08-26 — what is bounded now is the
    // *till*, not the bank (`systems/till.ts`). A gift that silently arrived
    // short would be worse than no gift.
    unfinished(50_000);
    expect(gameStore.getState().finishTutorial()).toBe(ECONOMY_CONFIG.welcomeGift);
    expect(gameStore.getState().money).toBe(50_000 + ECONOMY_CONFIG.welcomeGift);
  });

  it("stamps the café's opening time, so chores start when she goes", () => {
    const before = Date.now();
    gameStore.getState().finishTutorial();
    expect(gameStore.getState().openedAt).toBeGreaterThanOrEqual(before);
  });
});
