import { createStore } from "zustand/vanilla";
import { ECONOMY_CONFIG } from "@/data/economy";
import { defaultNameForIndex } from "@/data/cats";
import { purchaseNextCat } from "@/systems/economy";
import { tickVisitors, type Visitor } from "@/systems/visitors";
import { logEvent } from "@/analytics/analytics";

export interface CatInstance {
  id: string;
  name: string;
  /** Index into the appearance/name placeholder tables (§8 rarity comes later). */
  appearanceIndex: number;
}

export interface GameState {
  money: number;
  cats: CatInstance[];
  visitors: Visitor[];
  lastVisitorSpawnAt: number;

  /** Advance the simulation to `now` (ms). Called every animation frame. */
  tick: (now: number) => void;
  /** Attempt to buy the next cat. No-op if the player can't afford it. */
  buyNextCat: () => void;
}

function makeCat(index: number): CatInstance {
  return {
    id: `cat-${index}`,
    name: defaultNameForIndex(index),
    appearanceIndex: index,
  };
}

export const gameStore = createStore<GameState>((set, get) => ({
  money: ECONOMY_CONFIG.startingMoney,
  cats: [makeCat(0)],
  visitors: [],
  lastVisitorSpawnAt: 0,

  tick: (now) => {
    const { visitors, lastVisitorSpawnAt, cats, money } = get();
    const result = tickVisitors(
      visitors,
      now,
      lastVisitorSpawnAt || now,
      cats.length,
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

  buyNextCat: () => {
    const { money, cats } = get();
    const result = purchaseNextCat(money, cats.length);
    if (!result.success) return;

    const newCat = makeCat(cats.length);
    set({ money: result.moneyAfter, cats: [...cats, newCat] });
    logEvent({
      name: "cat_purchased",
      catCount: cats.length + 1,
      cost: result.cost,
      money: result.moneyAfter,
    });
    if (cats.length + 1 === 2) {
      logEvent({ name: "first_cat_acquired", catCount: 2 });
    }
  },
}));
