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

  it("reads a current v6 save unchanged", () => {
    write({
      version: 6,
      money: 120,
      nextCatId: 2,
      cats: CATS,
      savedAt: 1000,
      upgrades: { decor: 2, brews: 1 },
      customisation: { walls: "B", sofa: "Olive" },
      owned: ["walls:B", "sofa:Olive"],
    });
    const save = loadSave();
    expect(save).not.toBeNull();
    expect(save!.money).toBe(120);
    expect(save!.cats).toEqual(CATS);
    expect(save!.upgrades).toEqual({ decor: 2, brews: 1 });
    expect(save!.customisation.walls).toBe("B");
    expect(save!.owned).toContain("sofa:Olive");
  });

  it("discards every pre-v6 save, on purpose", () => {
    // The economy went from billions to a £9,999 ceiling and cats from fifty to
    // five, so an old save produces a nonsense state: more cats than the room
    // holds, and a balance that skips the whole game. This break was taken
    // deliberately while the game has no players. Once it ships, "never lose a
    // player's cats" applies without exception and every version gets a real
    // migration — so if you are reading this because you broke a live save,
    // that is the rule you just broke.
    for (const version of [1, 2, 3, 4, 5]) {
      write({
        version,
        money: 9_000_000_000,
        nextCatId: 30,
        cats: CATS,
        savedAt: 1,
        upgrades: {},
      });
      expect(loadSave(), `v${version}`).toBeNull();
    }
  });

  it("keeps contentment on cats that have it, and tolerates cats without", () => {
    const petted = [
      { id: "cat-0", name: "Biscuit", definitionId: "marmalade", contentUntil: 9_000 },
      { id: "cat-1", name: "Mochi", definitionId: "tuxedo" },
    ];
    write({
      version: 6,
      money: 10,
      nextCatId: 2,
      cats: petted,
      savedAt: 1,
      upgrades: {},
    });
    expect(loadSave()!.cats).toEqual(petted);
  });

  it("falls back to defaults for customisation it doesn't recognise", () => {
    write({
      version: 6,
      money: 10,
      nextCatId: 1,
      cats: CATS,
      savedAt: 1,
      upgrades: {},
      customisation: { walls: "not-a-style", removedCategory: "x" },
      owned: ["walls:B", 42],
    });
    const save = loadSave()!;
    expect(save.customisation.walls).toBe("A");
    expect(save.customisation).not.toHaveProperty("removedCategory");
    expect(save.owned).toEqual(["walls:B"]);
  });

  it("drops upgrade ids that no longer exist and clamps ones that shrank", () => {
    const decorMax = upgradeDefinition("decor")!.maxLevel;
    write({
      version: 6,
      money: 10,
      nextCatId: 1,
      cats: CATS,
      savedAt: 1,
      upgrades: { decor: decorMax + 50, "retired-upgrade": 4 },
    });
    expect(loadSave()!.upgrades).toEqual({ decor: decorMax });
  });

  it("survives a corrupt upgrades field rather than discarding the save", () => {
    write({ version: 6, money: 10, nextCatId: 1, cats: CATS, savedAt: 1, upgrades: "nope" });
    const save = loadSave();
    expect(save).not.toBeNull();
    expect(save!.cats).toEqual(CATS);
    expect(save!.upgrades).toEqual({});
  });

  it("starts fresh rather than crashing on malformed data", () => {
    localStorage.setItem(SAVE_KEY, "{not json");
    expect(loadSave()).toBeNull();

    write({ version: 6, money: "lots", nextCatId: 1, cats: CATS, savedAt: 1, upgrades: {} });
    expect(loadSave()).toBeNull();

    write({ version: 6, money: 10, nextCatId: 1, cats: [], savedAt: 1, upgrades: {} });
    expect(loadSave()).toBeNull();

    write({ version: 99, money: 10, nextCatId: 1, cats: CATS, savedAt: 1, upgrades: {} });
    expect(loadSave()).toBeNull();
  });
});
