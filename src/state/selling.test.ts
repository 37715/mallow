/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";
import { gameStore } from "@/state/store";
import { CAT_BED_ITEM, beds } from "@/data/beds";
import { copyPrice, shopItem } from "@/data/shop";

/**
 * Selling furniture back (Ellis, 2026-08-26: *"i want to be able to sell
 * furniture too."*). Copies could already go; the first one could not, so a
 * café was stuck with every mistake it had ever bought.
 *
 * The two properties worth pinning are **you cannot make money going round the
 * loop**, and **you cannot sell a bed out from under a cat**.
 */
const ARMCHAIR = "armchair";

beforeEach(() => {
  gameStore.setState({
    money: 5000,
    till: 0,
    purchased: [],
    instances: [],
    placements: {},
    cats: [],
    nextInstanceId: 1,
  });
});

describe("selling one back", () => {
  it("returns half of what the piece cost", () => {
    const item = shopItem(ARMCHAIR)!;
    gameStore.getState().buyShopItem(ARMCHAIR);
    gameStore.getState().settlePurchase();
    const before = gameStore.getState().money;

    expect(gameStore.getState().sellShopItem(ARMCHAIR)).toBe(Math.round(item.price / 2));
    expect(gameStore.getState().money).toBe(before + Math.round(item.price / 2));
    expect(gameStore.getState().purchased).not.toContain(ARMCHAIR);
  });

  it("is a loss every time round, so the loop is never a living", () => {
    const start = gameStore.getState().money;
    for (let i = 0; i < 5; i++) {
      gameStore.getState().buyShopItem(ARMCHAIR);
      gameStore.getState().settlePurchase();
      gameStore.getState().sellShopItem(ARMCHAIR);
      expect(gameStore.getState().money).toBeLessThan(start);
    }
  });

  it("sells the newest copy before the piece itself", () => {
    const item = shopItem(ARMCHAIR)!;
    gameStore.getState().buyShopItem(ARMCHAIR);
    gameStore.getState().settlePurchase();
    gameStore.getState().buyCopy(ARMCHAIR);
    gameStore.getState().settlePurchase();

    // Two in the café; the copy is the dearer one, so that is what comes back.
    expect(gameStore.getState().sellShopItem(ARMCHAIR)).toBe(
      Math.round(copyPrice(item, 1) / 2),
    );
    expect(gameStore.getState().purchased).toContain(ARMCHAIR);
    expect(gameStore.getState().instances).toHaveLength(0);
  });

  it("forgets where the piece had been dragged to", () => {
    // Re-buying should put it back where the layout composed it, not where it
    // was last shoved — that arrangement is what the room was designed around.
    gameStore.getState().buyShopItem(ARMCHAIR);
    gameStore.getState().settlePurchase();
    gameStore.getState().movePiece(ARMCHAIR, 2, 2, 0);
    expect(gameStore.getState().placements[ARMCHAIR]).toBeDefined();

    gameStore.getState().sellShopItem(ARMCHAIR);
    expect(gameStore.getState().placements[ARMCHAIR]).toBeUndefined();
  });

  it("refuses an item the café does not own", () => {
    expect(gameStore.getState().sellShopItem(ARMCHAIR)).toBe(0);
    expect(gameStore.getState().sellShopItem("not-a-thing")).toBe(0);
  });
});

describe("beds with cats in them", () => {
  it("will not sell the bed a cat is living in", () => {
    // §8's one sacred rule. `catPositions` would stack the homeless cat on
    // another one rather than lose it, which is a visible mess and the first
    // step toward something worse.
    gameStore.setState({
      instances: [{ id: "inst-1", item: CAT_BED_ITEM, x: 1, z: 1 }],
      cats: [
        { id: "cat-0", name: "A", definitionId: "tabby", bedId: "cat-bed" },
        { id: "cat-1", name: "B", definitionId: "tabby", bedId: "inst-1" },
      ],
      purchased: ["cat-bed"],
    });
    const before = gameStore.getState().money;
    gameStore.getState().sellInstance("inst-1");
    expect(gameStore.getState().instances).toHaveLength(1);
    expect(gameStore.getState().money).toBe(before);
  });

  it("sells a spare bed happily", () => {
    gameStore.setState({
      instances: [{ id: "inst-1", item: CAT_BED_ITEM, x: 1, z: 1 }],
      cats: [{ id: "cat-0", name: "A", definitionId: "tabby", bedId: "cat-bed" }],
      purchased: ["cat-bed"],
    });
    const before = gameStore.getState().money;
    expect(beds(gameStore.getState().placements, gameStore.getState().instances)).toHaveLength(2);
    gameStore.getState().sellInstance("inst-1");
    expect(gameStore.getState().instances).toHaveLength(0);
    expect(gameStore.getState().money).toBeGreaterThan(before);
  });
});
