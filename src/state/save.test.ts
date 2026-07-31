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

  it("reads a current v3 save unchanged", () => {
    write({
      version: 3,
      money: 120,
      nextCatId: 2,
      cats: CATS,
      savedAt: 1000,
      upgrades: { seating: 2, decor: 1 },
    });
    const save = loadSave();
    expect(save).not.toBeNull();
    expect(save!.money).toBe(120);
    expect(save!.cats).toEqual(CATS);
    expect(save!.upgrades).toEqual({ seating: 2, decor: 1 });
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
    const seatingMax = upgradeDefinition("seating")!.maxLevel;
    write({
      version: 3,
      money: 10,
      nextCatId: 1,
      cats: CATS,
      savedAt: 1,
      upgrades: { seating: seatingMax + 50, "retired-upgrade": 4 },
    });
    expect(loadSave()!.upgrades).toEqual({ seating: seatingMax });
  });

  it("survives a corrupt upgrades field rather than discarding the save", () => {
    write({ version: 3, money: 10, nextCatId: 1, cats: CATS, savedAt: 1, upgrades: "nope" });
    const save = loadSave();
    expect(save).not.toBeNull();
    expect(save!.cats).toEqual(CATS);
    expect(save!.upgrades).toEqual({});
  });

  it("starts fresh rather than crashing on malformed data", () => {
    localStorage.setItem(SAVE_KEY, "{not json");
    expect(loadSave()).toBeNull();

    write({ version: 3, money: "lots", nextCatId: 1, cats: CATS, savedAt: 1, upgrades: {} });
    expect(loadSave()).toBeNull();

    write({ version: 3, money: 10, nextCatId: 1, cats: [], savedAt: 1, upgrades: {} });
    expect(loadSave()).toBeNull();

    write({ version: 99, money: 10, nextCatId: 1, cats: CATS, savedAt: 1, upgrades: {} });
    expect(loadSave()).toBeNull();
  });
});
