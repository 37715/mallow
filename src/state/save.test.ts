import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StoreApi } from "zustand/vanilla";
import type { GameState } from "@/state/store";
import { AUTOSAVE_INTERVAL_MS, initAutosave, loadSave } from "@/state/save";
import { upgradeDefinition } from "@/data/upgrades";
import { DEFAULT_CUSTOMISATION } from "@/data/customisation";
import { DEFAULT_PLAYER } from "@/data/player";
import { HOME_WINDOW } from "@/data/expansion";

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

  it("reads a v7 save forward, keeping money, cats and choices", () => {
    write({
      version: 7,
      money: 120,
      nextCatId: 2,
      cats: CATS,
      savedAt: 1000,
      upgrades: { brews: 1 },
      customisation: { walls: "B", sofa: "Olive" },
      owned: ["walls:B", "sofa:Olive"],
    });
    const save = loadSave();
    expect(save).not.toBeNull();
    expect(save!.money).toBe(120);
    // Cats gain a `bedId` on the way through v17 — see that migration.
    expect(save!.cats.map((c) => ({ id: c.id, name: c.name, definitionId: c.definitionId })))
      .toEqual(CATS);
    expect(save!.upgrades).toEqual({ brews: 1 });
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

  it("v6 → v7: rehomes an untouched sofa and rug, but never a bought one", () => {
    // The free default sofa and rug changed when the room was rebuilt against
    // the reference render. Someone still sitting on the old default never made
    // that choice, so they should get the new look; someone who *paid* for a
    // colourway must keep exactly what they paid for.
    write({
      version: 6,
      money: 50,
      nextCatId: 2,
      cats: CATS,
      savedAt: 1,
      upgrades: {},
      customisation: { sofa: "Cream", carpet: "Small_Cream" },
      owned: [],
    });
    expect(loadSave()!.customisation).toMatchObject({ sofa: "Olive", carpet: "Small_Red" });

    write({
      version: 6,
      money: 50,
      nextCatId: 2,
      cats: CATS,
      savedAt: 1,
      upgrades: {},
      customisation: { sofa: "Cream", carpet: "Small_Cream" },
      owned: ["sofa:Cream"],
    });
    const bought = loadSave()!.customisation;
    expect(bought.sofa).toBe("Cream");
    // The rug was still untouched, so it moves even though the sofa didn't.
    expect(bought.carpet).toBe("Small_Red");
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
    expect(loadSave()!.cats.map(({ bedId: _bed, ...rest }) => rest)).toEqual(petted);
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
    // `42` is filtered out as a non-string. `floor:B` is *added* by the v7 → v8
    // migration: this save had paid for wall style B, and the floor split must
    // not charge for a surface the player already owned.
    expect(save.owned).toEqual(["walls:B", "floor:B"]);
  });

  it("v7 → v8: splitting the floor out of walls changes nothing visible", () => {
    write({
      version: 7,
      money: 500,
      nextCatId: 1,
      cats: CATS,
      savedAt: 1,
      upgrades: {},
      customisation: { walls: "B", sofa: "Olive", carpet: "Small_Red", catBed: "A_Cream" },
      owned: ["walls:B"],
    });
    const save = loadSave()!;

    // The café must look identical across the update: the floor inherits the
    // wall style rather than snapping back to the default.
    expect(save.customisation.walls).toBe("B");
    expect(save.customisation.floor).toBe("B");
    expect(save.owned).toContain("floor:B");
    expect(save.cats.map(({ bedId: _b, ...rest }) => rest)).toEqual(CATS);
  });

  it("v7 → v8: a player who never changed the walls keeps the free floor", () => {
    write({
      version: 7,
      money: 40,
      nextCatId: 1,
      cats: CATS,
      savedAt: 1,
      upgrades: {},
      customisation: { walls: "A", sofa: "Olive", carpet: "Small_Red", catBed: "A_Cream" },
      owned: [],
    });
    const save = loadSave()!;

    expect(save.customisation.floor).toBe("A");
    // Nothing granted, because nothing was paid for.
    expect(save.owned).toEqual([]);
  });

  it("drops upgrade ids that no longer exist and clamps ones that shrank", () => {
    const brewsMax = upgradeDefinition("brews")!.maxLevel;
    write({
      version: 6,
      money: 10,
      nextCatId: 1,
      cats: CATS,
      savedAt: 1,
      upgrades: { brews: brewsMax + 50, "retired-upgrade": 4 },
    });
    expect(loadSave()!.upgrades).toEqual({ brews: brewsMax });
  });

  // v11 → v12: "cosy touches" was retired in favour of appeal on shop
  // furniture. The upgrade has to disappear, and what was spent on it has to
  // come back — the player is being asked to re-buy that appeal in the shop.
  it("refunds the retired cosy-touches upgrade rather than pocketing it", () => {
    write({
      version: 11,
      money: 100,
      nextCatId: 1,
      cats: CATS,
      savedAt: 1,
      upgrades: { decor: 3, brews: 2 },
      customisation: {},
      owned: [],
      purchased: [],
      placements: {},
      player: { ...DEFAULT_PLAYER, created: true },
    });
    const save = loadSave()!;

    expect(save.upgrades).toEqual({ brews: 2 });
    // Levels 1-3 cost 40 + 62 + 96 at the old curve (base 40, growth 1.55).
    expect(save.money).toBe(100 + 40 + 62 + 96);
    expect(save.cats.map((c) => c.id)).toEqual(CATS.map((c) => c.id));
  });

  /**
   * v16 → v17: capacity became "how many cat beds are placed". A café that
   * already had five cats and one authored bed must not wake up with four cats
   * nowhere — "never lose a player's cats" covers showing them (§8).
   */
  it("gives every existing cat a bed, free", () => {
    const many = [0, 1, 2, 3, 4].map((i) => ({
      id: `cat-${i}`,
      name: `cat ${i}`,
      definitionId: "marmalade",
    }));
    write({
      version: 16,
      money: 10,
      nextCatId: 5,
      cats: many,
      savedAt: 1,
      upgrades: {},
      customisation: {},
      owned: [],
      purchased: [],
      placements: {},
      player: { ...DEFAULT_PLAYER, created: true },
    });
    const save = loadSave()!;

    expect(save.cats).toHaveLength(5);
    // Every cat has a home, and no two share one.
    const homes = save.cats.map((c) => c.bedId);
    expect(homes.every(Boolean)).toBe(true);
    expect(new Set(homes).size).toBe(5);
    // Four of those beds are new, and they cost nothing.
    expect(save.instances).toHaveLength(4);
    expect(save.money).toBe(10);
  });

  /**
   * v17 → v18: the café's own window became a row in `windows`.
   *
   * "The room already had this before it had a price" — miss it and the café
   * wakes up bricked in.
   */
  it("keeps the window it always had", () => {
    write({
      version: 17,
      money: 10,
      nextCatId: 1,
      cats: CATS,
      savedAt: 1,
      upgrades: {},
      customisation: {},
      owned: [],
      purchased: ["low-table"],
      placements: {},
      instances: [],
      nextInstanceId: 1,
      player: { ...DEFAULT_PLAYER, created: true },
    });
    const save = loadSave()!;

    expect(save.windows).toEqual([HOME_WINDOW]);
    expect(save.purchased).toContain("low-table");
    expect(save.money).toBe(10);
    // The cushions were granted here at v19 and taken back again at v21 —
    // see "takes back the granted floor cushions" below for why. Walking the
    // whole chain, they do not survive.
    expect(save.purchased).not.toContain("floor-cushions");
  });

  /**
   * v19 → v20: the guide who shows you round.
   *
   * The whole job of this migration is to make sure an existing café never
   * meets them. Somebody five levels in does not need telling what the shop
   * button is, and a tutorial firing at a finished café reads as a bug — so
   * `created` (which has meant "has been playing" since v11) marks them done.
   */
  it("does not show the guide to a café that has already been played", () => {
    write({
      version: 19,
      money: 400,
      nextCatId: 1,
      cats: CATS,
      savedAt: 1,
      upgrades: {},
      customisation: {},
      owned: [],
      purchased: [],
      placements: {},
      instances: [],
      nextInstanceId: 1,
      player: { ...DEFAULT_PLAYER, created: true, name: "Ellis" },
    });
    const save = loadSave()!;
    expect(save.player.tutorialDone).toBe(true);
    expect(save.player.name).toBe("Ellis");
  });

  it("still shows the guide to a save that never finished character creation", () => {
    // The mirror of the case above, and the one that would silently swallow
    // the whole feature if `tutorialDone` were simply defaulted to true.
    write({
      version: 19,
      money: 40,
      nextCatId: 1,
      cats: CATS,
      savedAt: 1,
      upgrades: {},
      customisation: {},
      owned: [],
      purchased: [],
      placements: {},
      instances: [],
      nextInstanceId: 1,
      player: { ...DEFAULT_PLAYER, created: false },
    });
    expect(loadSave()!.player.tutorialDone).toBe(false);
  });

  /**
   * v20 → v21: the floor cushions go back out, reversing the v19 grant.
   *
   * This is the only migration that *removes* something, so it needs pinning
   * hard: it must take the cushions and nothing else, and it must leave a café
   * that bought other furniture exactly as it was.
   */
  it("takes back the granted floor cushions, and only those", () => {
    write({
      version: 19,
      money: 400,
      nextCatId: 1,
      cats: CATS,
      savedAt: 1,
      upgrades: {},
      customisation: {},
      owned: [],
      purchased: ["low-table", "climber"],
      placements: {},
      instances: [],
      nextInstanceId: 1,
      player: { ...DEFAULT_PLAYER, created: true },
    });
    const save = loadSave()!;
    // v19 grants them on the way through, then v21 withdraws them again.
    expect(save.purchased).not.toContain("floor-cushions");
    expect(save.purchased).toContain("low-table");
    expect(save.purchased).toContain("climber");
    expect(save.money).toBe(400);
  });

  it("never refunds past the till ceiling", () => {
    write({
      version: 11,
      money: 9_900,
      nextCatId: 1,
      cats: CATS,
      savedAt: 1,
      upgrades: { decor: 8 },
      customisation: {},
      owned: [],
      purchased: [],
      placements: {},
      player: { ...DEFAULT_PLAYER, created: true },
    });
    expect(loadSave()!.money).toBe(9_999);
  });

  it("survives a corrupt upgrades field rather than discarding the save", () => {
    write({ version: 6, money: 10, nextCatId: 1, cats: CATS, savedAt: 1, upgrades: "nope" });
    const save = loadSave();
    expect(save).not.toBeNull();
    expect(save!.cats.map(({ bedId: _b, ...rest }) => rest)).toEqual(CATS);
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

/**
 * The autosave loop. This exists because for the whole life of the project it
 * silently did nothing: it was a debounce, and `tick()` calls `set()` on every
 * animation frame, so the timer was rearmed ~60x/sec and never once elapsed.
 * A browser hid it (closing a tab fires `pagehide`, which saved on the way
 * out); on iOS, where backgrounding an app doesn't reliably fire those page
 * events, every launch was a fresh game. Ellis found it on a device.
 *
 * So the property under test is deliberately the *awkward* one: a store that
 * never stops changing must still reach storage.
 */
describe("autosave", () => {
  const frame = 16;

  function fakeStore() {
    const listeners: Array<() => void> = [];
    const state = {
      money: 0,
      cats: CATS,
      nextCatId: 1,
      upgrades: {},
      customisation: DEFAULT_CUSTOMISATION,
      owned: [] as string[],
    };
    return {
      state,
      getState: () => state,
      subscribe: (fn: () => void) => {
        listeners.push(fn);
        return () => {};
      },
      /** One animation frame's worth of store churn, exactly as tick() causes. */
      tick(ms: number) {
        state.money += 1;
        for (const fn of listeners) fn();
        vi.advanceTimersByTime(ms);
      },
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    const g = globalThis as unknown as Record<string, unknown>;
    g.window = globalThis;
    g.addEventListener = () => {};
    g.document = { addEventListener: () => {}, visibilityState: "visible" };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("writes a save while the game is ticking every frame", () => {
    const store = fakeStore();
    initAutosave(store as unknown as StoreApi<GameState>);

    // Two seconds of continuous per-frame updates — the exact condition the
    // old debounce could not survive.
    for (let t = 0; t < AUTOSAVE_INTERVAL_MS + frame; t += frame) store.tick(frame);

    const raw = localStorage.getItem(SAVE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).money).toBeGreaterThan(0);
  });

  it("keeps flushing as the game goes on, not just once", () => {
    const store = fakeStore();
    initAutosave(store as unknown as StoreApi<GameState>);

    for (let t = 0; t < AUTOSAVE_INTERVAL_MS + frame; t += frame) store.tick(frame);
    const first = JSON.parse(localStorage.getItem(SAVE_KEY)!).money;

    for (let t = 0; t < AUTOSAVE_INTERVAL_MS + frame; t += frame) store.tick(frame);
    const second = JSON.parse(localStorage.getItem(SAVE_KEY)!).money;

    expect(second).toBeGreaterThan(first);
  });

  it("does not write when nothing changed", () => {
    const store = fakeStore();
    initAutosave(store as unknown as StoreApi<GameState>);

    vi.advanceTimersByTime(AUTOSAVE_INTERVAL_MS * 3);

    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  });
});
