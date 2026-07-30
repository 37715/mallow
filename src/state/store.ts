import { createStore } from "zustand/vanilla";
import { ECONOMY_CONFIG } from "@/data/economy";
import {
  STARTER_CAT_ID,
  catDefinition,
  suggestName,
  totalAppeal,
} from "@/data/cats";
import { purchaseNextCat } from "@/systems/economy";
import { drawCatDefinition } from "@/systems/cats";
import { computeOfflineEarnings } from "@/systems/offline";
import { tickVisitors, type Visitor } from "@/systems/visitors";
import { loadSave } from "@/state/save";
import { logEvent } from "@/analytics/analytics";

export interface CatInstance {
  id: string;
  /** Player-given name (§8 — first-class emotional hook). */
  name: string;
  /** Which breed this cat is — see CAT_DEFINITIONS in data/cats. */
  definitionId: string;
}

export interface GameState {
  money: number;
  cats: CatInstance[];
  /** Monotonic counter so cat ids never collide across saves. */
  nextCatId: number;
  visitors: Visitor[];
  lastVisitorSpawnAt: number;

  /** Advance the simulation to `now` (ms). Called every animation frame. */
  tick: (now: number) => void;
  /**
   * Pay the adoption fee and draw a random cat (gacha-lite, §5).
   * Returns the new cat so the UI can run the reveal/naming flow,
   * or null if the player can't afford it.
   */
  adoptCat: () => CatInstance | null;
  /** Rename a cat. Empty/whitespace names are ignored — a cat always has a name. */
  renameCat: (id: string, name: string) => void;
  /**
   * Grant idle earnings for time spent away (§8). Returns the amount earned
   * (0 below the minimum-away threshold) so the UI can show the welcome-back card.
   */
  grantOfflineEarnings: (awayMs: number) => number;
}

/** Breed ids the player has discovered — drives the cat-dex (§8 collection). */
export function discoveredBreeds(cats: CatInstance[]): Set<string> {
  return new Set(cats.map((c) => c.definitionId));
}

function freshState(): Pick<GameState, "money" | "cats" | "nextCatId"> {
  return {
    money: ECONOMY_CONFIG.startingMoney,
    cats: [{ id: "cat-0", name: suggestName([]), definitionId: STARTER_CAT_ID }],
    nextCatId: 1,
  };
}

const saved = loadSave();

/** Wall-clock ms since the last save at boot — 0 for fresh games. main.ts turns this into offline earnings. */
export const bootAwayMs = saved ? Math.max(0, Date.now() - saved.savedAt) : 0;

export const gameStore = createStore<GameState>((set, get) => ({
  ...(saved
    ? { money: saved.money, cats: saved.cats, nextCatId: saved.nextCatId }
    : freshState()),
  visitors: [],
  lastVisitorSpawnAt: 0,

  tick: (now) => {
    const { visitors, lastVisitorSpawnAt, cats, money } = get();
    const result = tickVisitors(
      visitors,
      now,
      lastVisitorSpawnAt || now,
      totalAppeal(cats.map((c) => c.definitionId)),
      ECONOMY_CONFIG.seatCount,
    );

    if (result.moneyEarned > 0) {
      logEvent({ name: "visitor_paid", amount: result.moneyEarned, money: money + result.moneyEarned });
    }

    set({
      visitors: result.visitors,
      lastVisitorSpawnAt: result.lastSpawnAt,
      money: money + result.moneyEarned,
    });
  },

  adoptCat: () => {
    const { money, cats, nextCatId } = get();
    const result = purchaseNextCat(money, cats.length);
    if (!result.success) return null;

    const definition = drawCatDefinition();
    const newCat: CatInstance = {
      id: `cat-${nextCatId}`,
      name: suggestName(cats.map((c) => c.name)),
      definitionId: definition.id,
    };

    set({ money: result.moneyAfter, cats: [...cats, newCat], nextCatId: nextCatId + 1 });
    logEvent({
      name: "cat_adopted",
      breed: definition.id,
      rarity: definition.rarity,
      catCount: cats.length + 1,
      cost: result.cost,
      money: result.moneyAfter,
    });
    if (cats.length + 1 === 2) {
      logEvent({ name: "first_cat_acquired", catCount: 2 });
    }
    return newCat;
  },

  renameCat: (id, name) => {
    const trimmed = name.trim().slice(0, 24);
    if (!trimmed) return;
    const { cats } = get();
    const cat = cats.find((c) => c.id === id);
    if (!cat || cat.name === trimmed) return;

    set({ cats: cats.map((c) => (c.id === id ? { ...c, name: trimmed } : c)) });
    logEvent({ name: "cat_named", breed: catDefinition(cat.definitionId).id });
  },

  grantOfflineEarnings: (awayMs) => {
    const { money, cats } = get();
    const earned = computeOfflineEarnings(totalAppeal(cats.map((c) => c.definitionId)), awayMs);
    if (earned <= 0) return 0;

    set({ money: money + earned });
    logEvent({ name: "offline_income", awayMs: Math.round(awayMs), earned, money: money + earned });
    return earned;
  },
}));
