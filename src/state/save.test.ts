import { beforeEach, describe, expect, it } from "vitest";
import { loadSave } from "@/state/save";
import { upgradeDefinition } from "@/data/upgrades";

/**
 * Save migration is the one place a bug costs a player their cats (§8), so
 * every historical save shape gets a test. Add a case here whenever
 * SAVE_VERSION goes up.
 */

const SAVE_KEY = "mallow-save";

/** Minimal in-memory localStorage — save.ts only ever gets/sets one key. */
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

function write(data: unknown): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

const CATS = [{ id: "cat-0", name: "Biscuit", definitionId: "marmalade" }];

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: new MemoryStorage(),
    configurable: true,
  });
});

describe("loadSave", () => {
  it("returns null for a missing save (fresh game)", () => {
    expect(loadSave()).toBeNull();
  });

  it("reads a current v5 save unchanged", () => {
    write({
      version: 5,
      money: 120,
      nextCatId: 2,
      cats: CATS,
      savedAt: 1000,
      upgrades: { decor: 2, brews: 1 },
    });
    const save = loadSave();
    expect(save).not.toBeNull();
    expect(save!.money).toBe(120);
    expect(save!.cats).toEqual(CATS);
    expect(save!.upgrades).toEqual({ decor: 2, brews: 1 });
  });

  it("migrates a v3 save forward, keeping cats and timestamps", () => {
    write({
      version: 3,
      money: 500,
      nextCatId: 2,
      cats: CATS,
      savedAt: 777,
      upgrades: {},
    });
    const save = loadSave();
    expect(save!.upgrades).toEqual({});
    expect(save!.cats).toEqual(CATS);
    expect(save!.savedAt).toBe(777);
  });

  it("brings an absurd old balance back into the readable range", () => {
    // Someone mid-venue-ladder could be holding billions. The new economy tops
    // out in the tens of thousands, so carrying that over would end the game
    // on the spot. Cats and names survive; the silly number does not.
    write({
      version: 4,
      money: 9_000_000_000,
      nextCatId: 2,
      cats: CATS,
      savedAt: 1,
      upgrades: {},
      venueIndex: 5,
    });
    const save = loadSave();
    expect(save!.cats).toEqual(CATS);
    expect(save!.money).toBeLessThanOrEqual(5_000);
  });

  it("keeps contentment on cats that have it, and tolerates cats without", () => {
    const petted = [
      { id: "cat-0", name: "Biscuit", definitionId: "marmalade", contentUntil: 9_000 },
      { id: "cat-1", name: "Mochi", definitionId: "tuxedo" },
    ];
    write({
      version: 5,
      money: 10,
      nextCatId: 2,
      cats: petted,
      savedAt: 1,
      upgrades: {},
    });
    expect(loadSave()!.cats).toEqual(petted);
  });

  it("migrates a v1 save (no savedAt, no upgrades) without losing cats", () => {
    write({ version: 1, money: 40, nextCatId: 1, cats: CATS });
    const save = loadSave();
    expect(save).not.toBeNull();
    expect(save!.cats).toEqual(CATS);
    expect(save!.money).toBe(40);
    expect(save!.upgrades).toEqual({});
    // No retroactive offline windfall: "last seen" becomes now.
    expect(save!.savedAt).toBeGreaterThan(0);
  });

  it("migrates a v2 save by starting it with no upgrades", () => {
    write({ version: 2, money: 40, nextCatId: 1, cats: CATS, savedAt: 555 });
    const save = loadSave();
    expect(save!.upgrades).toEqual({});
    expect(save!.savedAt).toBe(555);
  });

  it("drops upgrade ids that no longer exist and clamps ones that shrank", () => {
    const decorMax = upgradeDefinition("decor")!.maxLevel;
    write({
      version: 5,
      money: 10,
      nextCatId: 1,
      cats: CATS,
      savedAt: 1,
      upgrades: { decor: decorMax + 50, "retired-upgrade": 4 },
    });
    expect(loadSave()!.upgrades).toEqual({ decor: decorMax });
  });

  it("survives a corrupt upgrades field rather than discarding the save", () => {
    write({ version: 5, money: 10, nextCatId: 1, cats: CATS, savedAt: 1, upgrades: "nope" });
    const save = loadSave();
    expect(save).not.toBeNull();
    expect(save!.cats).toEqual(CATS);
    expect(save!.upgrades).toEqual({});
  });

  it("starts fresh rather than crashing on malformed data", () => {
    localStorage.setItem(SAVE_KEY, "{not json");
    expect(loadSave()).toBeNull();

    write({ version: 5, money: "lots", nextCatId: 1, cats: CATS, savedAt: 1, upgrades: {} });
    expect(loadSave()).toBeNull();

    write({ version: 5, money: 10, nextCatId: 1, cats: [], savedAt: 1, upgrades: {} });
    expect(loadSave()).toBeNull();

    write({ version: 99, money: 10, nextCatId: 1, cats: CATS, savedAt: 1, upgrades: {} });
    expect(loadSave()).toBeNull();
  });
});
