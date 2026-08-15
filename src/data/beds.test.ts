import { describe, expect, it } from "vitest";
import { CAT_BED_ITEM, bedCost, beds, catPositions, freeBeds } from "@/data/beds";

/**
 * Cats live in beds, and capacity is how many beds are placed.
 *
 * The rule that matters most here is the one about *not losing a cat*: a bed
 * can vanish from under one when the player sells furniture, and the answer is
 * always to rehome, never to drop.
 */
const instance = (id: string, x = 0, z = 0) => ({ id, item: CAT_BED_ITEM, x, z });
const cat = (id: string, bedId?: string) => ({ id, bedId });

describe("beds", () => {
  it("counts the authored bed the café comes with", () => {
    const all = beds({}, []);
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("cat-bed");
  });

  it("adds every bought bed, wherever it was dragged", () => {
    const all = beds({}, [instance("inst-1", 3, -1)]);
    expect(all).toHaveLength(2);
    expect(all.find((b) => b.id === "inst-1")).toMatchObject({ x: 3, z: -1 });
  });

  it("follows the authored bed when the player moves it", () => {
    const all = beds({ "cat-bed": { x: 1.5, z: 0.5 } }, []);
    expect(all[0]).toMatchObject({ x: 1.5, z: 0.5 });
  });

  it("charges more for each bed, because a bed is the right to adopt", () => {
    expect(bedCost(2)).toBeGreaterThan(bedCost(1));
  });
});

describe("free beds", () => {
  it("is what decides whether the café can take another cat", () => {
    const all = beds({}, [instance("inst-1")]);
    expect(freeBeds(all, [])).toHaveLength(2);
    expect(freeBeds(all, [cat("a", "cat-bed")])).toHaveLength(1);
    expect(freeBeds(all, [cat("a", "cat-bed"), cat("b", "inst-1")])).toHaveLength(0);
  });
});

describe("catPositions", () => {
  it("puts each cat in its own bed", () => {
    const all = beds({}, [instance("inst-1", 3, 0)]);
    const homes = catPositions([cat("a", "inst-1"), cat("b", "cat-bed")], all);
    expect(homes.get("a")?.id).toBe("inst-1");
    expect(homes.get("b")?.id).toBe("cat-bed");
  });

  /**
   * The important one. Selling a bed must never make a cat disappear — §8's
   * "never lose a player's cats. Sacred." covers *showing* them as much as
   * storing them.
   */
  it("rehomes a cat whose bed was sold, rather than dropping it", () => {
    const all = beds({}, []); // the bought bed is gone
    const homes = catPositions([cat("a", "inst-1")], all);
    expect(homes.get("a")?.id).toBe("cat-bed");
  });

  it("never sits two cats in the same bed", () => {
    const all = beds({}, [instance("inst-1", 3, 0)]);
    const homes = catPositions([cat("a", "inst-1"), cat("b", "inst-1")], all);
    expect(homes.get("a")?.id).not.toBe(homes.get("b")?.id);
  });

  it("leaves a cat unplaced rather than stacking it when beds run out", () => {
    const homes = catPositions([cat("a"), cat("b")], beds({}, []));
    expect(homes.size).toBe(1);
  });
});
