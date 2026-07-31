import { createStore } from "zustand/vanilla";
import { ECONOMY_CONFIG } from "@/data/economy";
import { STARTER_CAT_ID, catDefinition, suggestName } from "@/data/cats";
import { purchaseNextCat } from "@/systems/economy";
import { drawCatDefinition } from "@/systems/cats";
import { computeOfflineEarnings } from "@/systems/offline";
import { tickVisitors, type Visitor } from "@/systems/visitors";
import { cafeStats, catAppeal, type CafeStats } from "@/systems/cafe";

import {
  purchaseUpgrade,
  totalUpgradeLevels,
  type UpgradeLevels,
} from "@/systems/upgrades";
import type { UpgradeId } from "@/data/upgrades";
import { loadSave } from "@/state/save";
import { logEvent } from "@/analytics/analytics";
import { emitGameEvent } from "@/core/events";

export interface CatInstance {
  id: string;
  /** Player-given name (§8 — first-class emotional hook). */
  name: string;
  /** Which breed this cat is — see CAT_DEFINITIONS in data/cats. */
  definitionId: string;
  /**
   * Wall-clock ms until this cat stops being content after a pet. Absent means
   * never petted. Wall-clock (not frame time) so contentment survives a reload.
   */
  contentUntil?: number;
}

export interface GameState {
  money: number;
  cats: CatInstance[];
  /** Monotonic counter so cat ids never collide across saves. */
  nextCatId: number;
  /** Levels bought per café upgrade (§8 — expansion + décor). Absent id = level 0. */
  upgrades: UpgradeLevels;
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
  /** Buy one level of a café upgrade. Returns true if the purchase went through. */
  buyUpgrade: (id: UpgradeId) => boolean;
  /**
   * Pet a cat: it becomes content for a while and draws more custom. This is
   * the mechanic that makes being present worth more than leaving the app.
   */
  petCat: (id: string) => void;
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

/**
 * The café's current performance numbers. One helper so the tick, the offline
 * calculation, and the UI readouts can never drift apart.
 */
export function currentCafeStats(
  state: Pick<GameState, "cats" | "upgrades">,
  now = Date.now(),
): CafeStats {
  return cafeStats(catAppeal(state.cats, now), state.upgrades);
}

/**
 * The café valued *without* contentment — what it earns when nobody's looking.
 * Offline income uses this, which is what makes presence pay better.
 */
export function idleCafeStats(state: Pick<GameState, "cats" | "upgrades">): CafeStats {
  return cafeStats(catAppeal(state.cats, Number.POSITIVE_INFINITY), state.upgrades);
}

type PersistedState = Pick<GameState, "money" | "cats" | "nextCatId" | "upgrades">;

function freshState(): PersistedState {
  return {
    money: ECONOMY_CONFIG.startingMoney,
    cats: [{ id: "cat-0", name: suggestName([]), definitionId: STARTER_CAT_ID }],
    nextCatId: 1,
    upgrades: {},
  };
}

const saved = loadSave();

/** Wall-clock ms since the last save at boot — 0 for fresh games. main.ts turns this into offline earnings. */
export const bootAwayMs = saved ? Math.max(0, Date.now() - saved.savedAt) : 0;

export const gameStore = createStore<GameState>((set, get) => ({
  ...(saved
    ? {
        money: saved.money,
        cats: saved.cats,
        nextCatId: saved.nextCatId,
        upgrades: saved.upgrades,
      }
    : freshState()),
  visitors: [],
  lastVisitorSpawnAt: 0,

  tick: (now) => {
    const state = get();
    const { visitors, lastVisitorSpawnAt, money } = state;
    const result = tickVisitors(
      visitors,
      now,
      lastVisitorSpawnAt || now,
      currentCafeStats(state),
    );

    if (result.moneyEarned > 0) {
      logEvent({ name: "visitor_paid", amount: result.moneyEarned, money: money + result.moneyEarned });
    }
    for (const seatIndex of result.paidSeatIndexes) {
      emitGameEvent("visitorPaid", { seatIndex });
    }

    set({
      visitors: result.visitors,
      lastVisitorSpawnAt: result.lastSpawnAt,
      money: Math.min(ECONOMY_CONFIG.tillCapacity, money + result.moneyEarned),
    });
  },

  adoptCat: () => {
    const { money, cats, nextCatId } = get();
    // A hard cap, not a soft one — see ECONOMY_CONFIG.maxCats.
    if (cats.length >= ECONOMY_CONFIG.maxCats) return null;
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

  buyUpgrade: (id) => {
    const { money, upgrades } = get();
    const result = purchaseUpgrade(money, upgrades, id);
    if (!result.success) return false;

    // The very first upgrade of any kind is a progression-funnel milestone (§11).
    const isFirstEver = totalUpgradeLevels(upgrades) === 0;

    set({ money: result.moneyAfter, upgrades: result.levels });
    logEvent({
      name: "upgrade_purchased",
      upgrade: id,
      level: result.level,
      cost: result.cost,
      money: result.moneyAfter,
    });
    if (isFirstEver) logEvent({ name: "first_expansion", upgrade: id });
    return true;
  },

  petCat: (id) => {
    const { cats } = get();
    const cat = cats.find((c) => c.id === id);
    if (!cat) return;

    const contentUntil = Date.now() + ECONOMY_CONFIG.contentment.durationMs;
    const wasContent = cat.contentUntil !== undefined && cat.contentUntil > Date.now();

    set({ cats: cats.map((c) => (c.id === id ? { ...c, contentUntil } : c)) });
    // Only log the transition, not every re-pet — otherwise a player idly
    // tapping the same cat floods the funnel.
    if (!wasContent) {
      logEvent({ name: "cat_petted", breed: catDefinition(cat.definitionId).id });
    }
  },


  grantOfflineEarnings: (awayMs) => {
    const state = get();
    const { money, cats } = state;

    // Contentment that was still running when the player left keeps paying
    // while they're away — see computeOfflineEarnings for why that matters.
    const leftAt = Date.now() - awayMs;
    const contentRemainingMs = Math.max(
      0,
      ...cats.map((c) => (c.contentUntil ?? 0) - leftAt),
    );

    const earned = computeOfflineEarnings(
      currentCafeStats(state, leftAt),
      awayMs,
      idleCafeStats(state),
      contentRemainingMs,
    );
    if (earned <= 0) return 0;

    // Clamp to the till, and report what actually landed in it so the
    // welcome-back card never promises money the player didn't get.
    const banked = Math.min(ECONOMY_CONFIG.tillCapacity, money + earned) - money;
    if (banked <= 0) return 0;

    set({ money: money + banked });
    logEvent({
      name: "offline_income",
      awayMs: Math.round(awayMs),
      earned: banked,
      money: money + banked,
    });
    return banked;
  },
}));
