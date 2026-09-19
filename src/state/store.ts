import { createStore } from "zustand/vanilla";
import { ECONOMY_CONFIG } from "@/data/economy";
import { STARTER_CAT_ID, catDefinition, suggestName } from "@/data/cats";
import { purchaseNextCat } from "@/systems/economy";
import { drawCatDefinition } from "@/systems/cats";
import { computeOfflineEarnings } from "@/systems/offline";
import { tickVisitors, type Visitor } from "@/systems/visitors";
import { cafeStats, catAppeal, type CafeStats } from "@/systems/cafe";
import { availableSeats, type Placements } from "@/data/cafe-layout";
import { copyPrice, furnitureAppeal, shopItem } from "@/data/shop";
import { XP_AWARDS, levelProgress } from "@/data/progression";
import { CAT_BED_ITEM, bedCost, beds, freeBeds } from "@/data/beds";
import {
  MAX_CUSTOM_DRINKS,
  STARTER_DRINK_ID,
  baseDrink,
  ingredient,
  menuAppeal,
  type CustomDrink,
} from "@/data/drinks";
import { menuItems, menuPayMultiplier, pickOrderWithNovelty } from "@/systems/menu";
import { claimValue } from "@/systems/goals";
import { occupiedWalls, wallSegments } from "@/scene/cafe-tiles";
import {
  HOME_TILE,
  HOME_WINDOW,
  WINDOW_PRICE,
  expansionCandidates,
  expansionCost,
  expansionLevel,
  floorAppeal,
  ownedPatches,
  tileKey,
  type TileKey,
} from "@/data/expansion";
import { DEFAULT_PLAYER, type PlayerProfile } from "@/data/player";
import { CHORES_BY_ID } from "@/data/chores";
import { TIP_JAR_ITEM, addTips, tipsReady } from "@/data/tips";
import { addToTill, tillCapacity, tillRoom } from "@/systems/till";
import {
  acquireSubjects,
  choreAppeal,
  completeChore,
  isDue,
  type ChoreLog,
} from "@/systems/chores";
import type { GraphicsLevel } from "@/data/graphics";
import { backdrop, backdropAppeal, sanitizeBackdrop } from "@/data/backdrops";

import {
  purchaseUpgrade,
  totalUpgradeLevels,
  type UpgradeLevels,
} from "@/systems/upgrades";
import type { UpgradeId } from "@/data/upgrades";
import { loadSave } from "@/state/save";
import { logEvent } from "@/analytics/analytics";
import { emitGameEvent } from "@/core/events";
import {
  DEFAULT_CUSTOMISATION,
  isUnlocked,
  optionById,
  styleAppeal,
  type Customisation,
  type Progress,
} from "@/data/customisation";

/**
 * A piece of furniture the *player* created, rather than one the layout
 * authored.
 *
 * **The first of its kind in the game**, and the reason cat beds needed it: the
 * shop's whole model until now was "a purchase reveals one authored placement",
 * which can express "you own the climber" but not "you own three cat beds". An
 * instance carries its own position, so there can be any number of them and
 * each moves independently.
 */
export interface Instance {
  id: string;
  /** Catalogue id — see `CAT_BED_ITEM`. */
  item: string;
  x: number;
  z: number;
  /** Player rotation, in radians. */
  rot?: number;
}

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
  /** Which bed this cat lives in (`data/beds.ts`). */
  bedId?: string;
}

export interface GameState {
  money: number;
  cats: CatInstance[];
  /** Monotonic counter so cat ids never collide across saves. */
  nextCatId: number;
  /** Levels bought per café upgrade (§8 — expansion + décor). Absent id = level 0. */
  upgrades: UpgradeLevels;
  /** Chosen colourway/style per customisation category (§0 — the progression). */
  customisation: Customisation;
  /**
   * Where the player has dragged movable furniture, keyed by `Placement.id`.
   * Absent means "wherever the layout put it", so an untouched café is an
   * empty object and adding a new movable piece never invalidates a save.
   */
  placements: Placements;
  /** Shop catalogue ids the player has bought (§8 step 5). */
  purchased: string[];
  /** Who the player is, and what their café is called (§8 onboarding). */
  player: PlayerProfile;
  /**
   * Lifetime XP. **Only ever goes up**, and the level is derived from it
   * (`levelProgress`) rather than stored, so the curve can be retuned without
   * migrating saves or demoting anyone. See `data/progression.ts`.
   */
  xp: number;
  /** Category+option ids the player has paid for. Choices are free to re-apply. */
  owned: string[];
  /** Classic coffees added to the menu. Filter coffee is always served. */
  drinks: string[];
  /** Add-ins unlocked for blending. */
  ingredients: string[];
  /** Blends the player invented and named. */
  customDrinks: CustomDrink[];
  /** Lifetime cups sold, per menu item id — the analytics page (§8). */
  sales: Record<string, number>;
  /** Counter so blend ids never collide, the same trick as `nextCatId`. */
  nextDrinkId: number;
  /**
   * Goals whose reward has been taken (`data/goals.ts`).
   *
   * Ids rather than an index, so reordering or removing a goal can never
   * silently re-open one somebody has already done — the same reason upgrades
   * are stored sparsely by id.
   */
  goalsClaimed: string[];
  /** Floor tiles owned, as "x,z". Always contains the home tile (§8 step 6). */
  tiles: TileKey[];
  /** Backdrop colours paid for. The setup pick is free and never listed. */
  backdropsOwned: string[];
  /**
   * Wall segments that have been glazed, as `side:x,z` (`wallSegmentId`).
   *
   * Always contains the café's own back window — it is expressed here rather
   * than baked into the layout so there is exactly one way a window exists.
   */
  windows: string[];
  /**
   * How many times a piece has been *committed to a position* this session.
   *
   * Runtime only, deliberately not saved. It exists because "did the player
   * place the thing" has no other honest signal: buying adds to `purchased`
   * and `instances` immediately, so counting either meant the walkthrough's
   * "now put it down" step completed the instant you bought it — and Mal left
   * while the ghost was still in your hand.
   */
  placementsMade: number;
  /**
   * A purchase that has been made but not yet paid for, because the piece is
   * still in the player's hands.
   *
   * **Money changes when the thing lands, not when the button is pressed.**
   * Ellis, 2026-08-26: *"when i place an item, that is when i want a ka ching
   * sound fx and an animation and for the money to be taken. only when
   * positioned is chosen and placed."* He is right, and it also removes an
   * oddity the old flow had: buying debited immediately and cancelling
   * refunded, so the till flickered down and back up for a decision the player
   * had not finished making.
   *
   * Runtime only, deliberately not saved — see `settlePurchase` for what
   * happens if a session ends mid-placement.
   */
  pendingPurchase: { id: string; cost: number } | null;
  /**
   * Takings waiting at the counter, uncollected (`systems/till.ts`).
   *
   * **Everything the café earns lands here, not in `money`** — visitors while
   * you watch, and idle income while you are away. It holds
   * `tillCapacity(upgrades)` and then stops taking, which is what makes a
   * fortnight away worth the same as a night away.
   */
  till: number;
  /** Coins in the tip jar. Only collectable when full — see `data/tips.ts`. */
  tips: number;
  /** When each chore was last done (`systems/chores.ts`). */
  chores: ChoreLog;
  /**
   * When this café opened, which is what a chore's *first* due date counts
   * from. Stored rather than derived: it has to survive a reload or the
   * window would come due again on every launch.
   */
  openedAt: number;
  /** Furniture the player created rather than the layout authored. */
  instances: Instance[];
  /** Counter so instance ids never collide. */
  nextInstanceId: number;
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
  /** Move a cat into a free bed. Ignored if the bed is gone or occupied. */
  rehomeCat: (catId: string, bedId: string) => void;
  /** Buy one level of a café upgrade. Returns true if the purchase went through. */
  buyUpgrade: (id: UpgradeId) => boolean;
  /**
   * Pet a cat: it becomes content for a while and draws more custom. This is
   * the mechanic that makes being present worth more than leaving the app.
   */
  petCat: (id: string) => void;
  /**
   * Buy a customisation option if it's unlocked and affordable, and apply it.
   * Re-applying something already owned is free — the player should be able to
   * change their mind without paying twice.
   */
  chooseCustomisation: (categoryId: string, optionId: string) => boolean;
  /** Drop a movable piece at a new spot and angle. Validity is checked by the
   *  caller, which is the only place that knows the meshes' real footprints. */
  movePiece: (id: string, x: number, z: number, rot?: number) => void;
  /** Mark a chore done — pays, grants xp, restores its appeal. */
  finishChore: (id: string) => void;
  /**
   * Empty the till into the bank. Returns what was collected, or 0.
   *
   * The one place `money` ever goes up from trading — everything the café
   * earns passes through here, which is what makes the bank's growth a
   * function of showing up rather than of elapsed time.
   */
  collectTill: () => number;
  /** Empty the tip jar into the bank. Returns what was in it, or 0. */
  collectTips: () => number;
  /**
   * Take the money for a piece the player has just put down. Returns what was
   * charged, or 0 if nothing was owed, so the caller can make a noise about it.
   */
  settlePurchase: () => number;
  /** Buy a piece of furniture. False if locked, already owned, or unaffordable. */
  buyShopItem: (id: string) => boolean;
  /** Finish character creation. */
  setPlayer: (profile: PlayerProfile) => void;
  /**
   * The guide has finished, or been skipped. Either way, never again.
   *
   * Returns the welcome gift it paid (`ECONOMY_CONFIG.welcomeGift`), so the
   * caller can make something of the money arriving — and **0 on every later
   * replay**, because this is a one-shot and a tour is not a payday.
   */
  finishTutorial: () => number;
  /**
   * Hand the player exactly enough to do what the walkthrough just asked.
   *
   * Only the tutorial calls this. It tops up rather than paying out — see
   * `topUp` in `systems/tutorial.ts` — so the introduction can't leave anyone
   * rich enough to skip the early game §8 relies on for D1.
   */
  grantTutorialFunds: (amount: number) => void;
  /** Change the resolution budget (§ data/graphics.ts). */
  setGraphics: (level: GraphicsLevel) => void;
  /** Choose the colour outside. Buys it if it isn't owned; false if unaffordable. */
  setBackdrop: (id: string) => boolean;
  /** Mute the music bed independently of the sound effects. */
  setMusicMuted: (muted: boolean) => void;
  /** Award XP and announce any level crossed. Never negative. */
  grantXp: (amount: number) => void;
  /** Add a classic coffee to the menu. False if locked, owned or unaffordable. */
  unlockDrink: (id: string) => boolean;
  /** Buy an add-in. False if locked, owned or unaffordable. */
  unlockIngredient: (id: string) => boolean;
  /** Put a blend on the menu. Returns the new drink, or null if refused. */
  createBlend: (name: string, base: string, ingredients: string[]) => CustomDrink | null;
  /** Take a goal's reward. Returns what was paid, or 0 if it was not ready. */
  claimGoal: (id: string) => number;
  /** Take a blend off the menu. Its sales history goes with it. */
  removeBlend: (id: string) => void;
  /** Buy a piece of floor. False if it's out of reach, owned or unaffordable. */
  buyTile: (key: TileKey) => boolean;
  /**
   * Buy one more of something already in the café. Returns the new instance's
   * id, or null if it cannot be afforded.
   */
  buyCopy: (itemId: string) => string | null;
  /** Glaze a wall segment. False if it is not a wall, already glazed, or too dear. */
  buyWindow: (id: string) => boolean;
  /** Brick a window back up, and hand the money back. */
  removeWindow: (id: string) => boolean;
  /** Buy another cat bed. Returns its instance id, or null if unaffordable. */
  buyBed: () => string | null;
  /**
   * Undo a purchase that was never placed.
   *
   * **Cancelling during placement has to undo the buy**, not just put the
   * piece back where the layout draws it. Ellis, 2026-08-25: *"cancel button
   * when buying and placing an item doesnt even work it just buys it anyway."*
   * Exactly — the money had already moved and the piece stayed in the room, so
   * "cancel" did nothing a player could see.
   *
   * The XP goes back too. Without that, buy-then-cancel is a free XP tap you
   * can hold down forever, and an exploit that obvious would eat the ring's
   * meaning within a minute.
   */
  undoPurchase: (id: string) => void;
  /** Sell a bought bed back. Its cat rehomes to a spare (`data/beds.ts`). */
  sellInstance: (id: string) => void;
  /**
   * Sell one of a shop item back — the newest copy if there is one, otherwise
   * the piece itself. Returns what was refunded, or 0 if the sale was refused.
   *
   * Ellis, 2026-08-26: *"i want to be able to sell furniture too."* Copies
   * could already go back (`sellInstance`); the *first* one could not, so a
   * café was stuck with every mistake it had ever bought.
   */
  sellShopItem: (itemId: string) => number;
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
export type StatsInput = Pick<
  GameState,
  | "cats"
  | "upgrades"
  | "purchased"
  | "drinks"
  | "customDrinks"
  | "ingredients"
  | "tiles"
  | "owned"
  | "backdropsOwned"
  | "windows"
  | "instances"
  | "chores"
  | "openedAt"
>;

/**
 * Everything bought, as appeal.
 *
 * **The rule: anything that costs money raises appeal** (Ellis, 2026-08-19).
 * It is worth stating as a rule rather than a list, because it decides how
 * future content gets priced — a purchase that only moves a hidden multiplier
 * is one the player cannot feel, which is exactly why the "cosy touches"
 * upgrade was retired. Appeal is the number the whole café shares.
 */
/** How many extra copies of an item the café holds. */
export function copiesOf(instances: Instance[], itemId: string): number {
  return instances.filter((i) => i.item === itemId).length;
}

/**
 * How many of an item the café holds altogether: the authored one, if bought,
 * plus every copy. This is the number the shop shows.
 */
export function ownedCount(
  state: { purchased: string[]; instances: Instance[] },
  itemId: string,
): number {
  return (state.purchased.includes(itemId) ? 1 : 0) + copiesOf(state.instances, itemId);
}

export function spentAppeal(state: StatsInput): number {
  return (
    furnitureAppeal(state.purchased, state.instances.map((i) => i.item)) +
    menuAppeal(state.drinks, state.ingredients, state.customDrinks) +
    floorAppeal(state.tiles) +
    styleAppeal(state.owned) +
    backdropAppeal(state.backdropsOwned) +
    // The one the café starts with is not an achievement, so it doesn't pay.
    Math.max(0, state.windows.length - 1) * 0.6
  );
}

/** What the café is currently serving. */
export function currentMenu(state: Pick<GameState, "drinks" | "customDrinks">) {
  return menuItems(state.drinks, state.customDrinks);
}

export function currentCafeStats(state: StatsInput, now = Date.now()): CafeStats {
  return cafeStats(
    catAppeal(state.cats, now),
    state.upgrades,
    // A well-kept café is a lovelier one. Fresh chores only, and never
    // negative — `systems/chores.ts` explains why the floor matters.
    spentAppeal(state) + choreAppeal(state.chores, state.openedAt, now, state),
    menuPayMultiplier(currentMenu(state)),
    availableSeats(state.purchased),
  );
}

/**
 * The café valued *without* contentment — what it earns when nobody's looking.
 * Offline income uses this, which is what makes presence pay better.
 */
export function idleCafeStats(state: StatsInput): CafeStats {
  return cafeStats(
    catAppeal(state.cats, Number.POSITIVE_INFINITY),
    state.upgrades,
    // Chores keep paying while the café is shut, the same way contentment
    // does: they were done before you left, and nothing expires *because* you
    // left. `Date.now()` rather than the caller's clock, since offline income
    // is measured from wall time.
    spentAppeal(state) + choreAppeal(state.chores, state.openedAt, Date.now(), state),
    menuPayMultiplier(currentMenu(state)),
    availableSeats(state.purchased),
  );
}

type PersistedState = Pick<
  GameState,
  | "money"
  | "cats"
  | "nextCatId"
  | "upgrades"
  | "customisation"
  | "placements"
  | "purchased"
  | "player"
  | "owned"
  | "xp"
  | "drinks"
  | "ingredients"
  | "customDrinks"
  | "sales"
  | "goalsClaimed"
  | "nextDrinkId"
  | "tiles"
  | "backdropsOwned"
  | "windows"
  | "till"
  | "tips"
  | "chores"
  | "openedAt"
  | "instances"
  | "nextInstanceId"
>;

/** What the customisation menu measures unlock conditions against. */
export function currentProgress(
  state: Pick<GameState, "cats" | "upgrades" | "purchased">,
): Progress {
  return {
    cats: state.cats,
    upgrades: state.upgrades,
    purchased: state.purchased,
    breedsDiscovered: discoveredBreeds(state.cats).size,
  };
}

function freshState(): PersistedState {
  return {
    money: ECONOMY_CONFIG.startingMoney,
    // The cat you start with lives in the bed the café comes with.
    cats: [
      { id: "cat-0", name: suggestName([]), definitionId: STARTER_CAT_ID, bedId: "cat-bed" },
    ],
    nextCatId: 1,
    upgrades: {},
    customisation: { ...DEFAULT_CUSTOMISATION },
    placements: {},
    purchased: [],
    player: DEFAULT_PLAYER,
    owned: [],
    xp: 0,
    drinks: [STARTER_DRINK_ID],
    ingredients: [],
    customDrinks: [],
    sales: {},
    goalsClaimed: [],
    nextDrinkId: 1,
    tiles: [HOME_TILE],
    backdropsOwned: [],
    windows: [HOME_WINDOW],
    till: 0,
    tips: 0,
    chores: {},
    openedAt: Date.now(),
    instances: [],
    nextInstanceId: 1,
  };
}

const saved = loadSave();

/** Wall-clock ms since the last save at boot — 0 for fresh games. main.ts turns this into offline earnings. */
export const bootAwayMs = saved ? Math.max(0, Date.now() - saved.savedAt) : 0;

/** What sandbox mode tops the bank up to, every tick. */
const SANDBOX_MONEY = 99_999;

/**
 * Sandbox mode: the bank refills itself.
 *
 * **A testing tap, not a cheat menu.** Ellis: *"give me infinite money to test
 * it."* Everything expensive in the game now sits behind hours of play, which
 * makes the *design* of expansion, blends and the shop impossible to judge in
 * a five-minute sitting. `main.ts` only calls this under `import.meta.env.DEV`,
 * so the switch does not exist in a packaged build.
 */
let sandbox = false;

export function setSandbox(on: boolean): void {
  sandbox = on;
}

export function isSandbox(): boolean {
  return sandbox;
}

/**
 * **Your first add-in is on the house**, and this is a rule rather than a
 * tutorial hack.
 *
 * The walkthrough asks the player to invent a blend, and a blend with nothing
 * in it is a renamed filter coffee — so the step read as a dead end for anyone
 * who had spent their money on the cat bed, which is everyone, because the
 * walkthrough had just told them to. Ellis: *"ive ran out of money and its
 * telling me to make a blend."*
 *
 * The fix belongs in the economy, not the script. Charging for the very first
 * flavour gates the *whole* of the menu — the most authored thing in the game
 * (§8: blends are the first content the player writes) — behind a purchase
 * they cannot judge the value of yet. One free add-in opens the door; every
 * one after it is paid for as usual.
 */
export function firstIngredientIsFree(state: Pick<GameState, "ingredients">): boolean {
  return state.ingredients.length === 0;
}

export const gameStore = createStore<GameState>((set, get) => ({
  ...(saved
    ? {
        money: saved.money,
        cats: saved.cats,
        nextCatId: saved.nextCatId,
        upgrades: saved.upgrades,
        customisation: saved.customisation,
        placements: saved.placements,
        purchased: saved.purchased,
        player: saved.player,
        owned: saved.owned,
        xp: saved.xp,
        drinks: saved.drinks,
        ingredients: saved.ingredients,
        customDrinks: saved.customDrinks,
        sales: saved.sales,
        goalsClaimed: saved.goalsClaimed,
        nextDrinkId: saved.nextDrinkId,
        tiles: saved.tiles,
        backdropsOwned: saved.backdropsOwned,
        windows: saved.windows,
        till: saved.till,
        tips: saved.tips,
        chores: saved.chores,
        openedAt: saved.openedAt,
        instances: saved.instances,
        nextInstanceId: saved.nextInstanceId,
      }
    : freshState()),
  visitors: [],
  lastVisitorSpawnAt: 0,
  // Runtime only: nothing is mid-placement at boot.
  pendingPurchase: null,
  // Runtime only — a fresh session has placed nothing yet, whatever the save
  // says about what is already in the room.
  placementsMade: 0,

  tick: (now) => {
    const state = get();

    const { visitors, lastVisitorSpawnAt, money } = state;
    const result = tickVisitors(
      visitors,
      now,
      lastVisitorSpawnAt || now,
      currentCafeStats(state),
      Math.random,
      // What a new arrival orders. The novelty weighting is what guarantees a
      // freshly invented blend gets tried while its inventor is still watching
      // — see `pickOrderWithNovelty`.
      (roll) => {
        const item = pickOrderWithNovelty(currentMenu(state), state.sales, roll);
        return item ? { id: item.id, pay: item.pay } : null;
      },
    );

    if (result.moneyEarned > 0) {
      logEvent({ name: "visitor_paid", amount: result.moneyEarned, money: money + result.moneyEarned });
    }
    /**
     * The sales chart counts the cup the guest actually carried (2026-09-08).
     * It used to roll a random menu item at the moment of payment — a tally
     * with no person attached — which is why the menu felt like it did nothing
     * (Ellis: *"the coffee blend section seems a bit random"*). The order is
     * chosen at the door now (see the picker passed into `tickVisitors`), so
     * the chip over their head, the money they hand over and the row on the
     * chart are all the same drink.
     */
    let sales = state.sales;
    if (result.paid.length > 0) {
      sales = { ...sales };
      const customs = new Set(state.customDrinks.map((d) => d.id));
      for (const visit of result.paid) {
        if (visit.drinkId) {
          const cupsBefore = sales[visit.drinkId] ?? 0;
          sales[visit.drinkId] = cupsBefore + 1;
          // The payoff moment for inventing a drink: the first time somebody
          // buys it. Once per blend, ever — cupsBefore does the guarding.
          if (cupsBefore === 0 && customs.has(visit.drinkId)) {
            const blend = state.customDrinks.find((d) => d.id === visit.drinkId);
            if (blend) emitGameEvent("blendFirstSale", { name: blend.name });
          }
        }
        emitGameEvent("visitorPaid", {
          seatIndex: visit.seatIndex,
          amount: visit.amount,
          drinkId: visit.drinkId,
        });
      }
    }

    set({
      visitors: result.visitors,
      lastVisitorSpawnAt: result.lastSpawnAt,
      // **The sandbox top-up has to happen *here*, in the same `set`.** Doing
      // it as a separate `set()` earlier in the tick looked fine and did
      // nothing: this call writes state derived from the `state` captured at
      // the top of the tick, so it overwrote the top-up on the very next line.
      money: sandbox ? SANDBOX_MONEY : money,
      // **Takings go into the till, not the bank.** What a guest pays is not
      // yours until you have been to the counter and collected it — which is
      // the whole of Ellis's mechanic (2026-08-26) and the reason four days
      // away and four hours away come home to the same full drawer.
      till: addToTill(state.till, result.moneyEarned, tillCapacity(state.upgrades)),
      // Tips are **minted on top** of what a visitor pays, never skimmed off
      // it — see `data/tips.ts`. Same `set` as the money for the reason above.
      tips: state.purchased.includes(TIP_JAR_ITEM)
        ? addTips(state.tips, result.moneyEarned)
        : state.tips,
      sales,
    });
  },

  adoptCat: () => {
    const state = get();
    const { money, cats, nextCatId } = state;
    // **Capacity is beds, not a number.** Every cat lives somewhere specific
    // (`data/beds.ts`), so "the café is full" now means "no spare bed" — which
    // is a thing the player can see and do something about.
    const spare = freeBeds(beds(state.placements, state.instances), cats);
    if (spare.length === 0) return null;
    const result = purchaseNextCat(money, cats.length);
    if (!result.success) return null;

    const definition = drawCatDefinition();
    const newCat: CatInstance = {
      id: `cat-${nextCatId}`,
      name: suggestName(cats.map((c) => c.name)),
      definitionId: definition.id,
      bedId: spare[0].id,
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
    get().grantXp(XP_AWARDS.adoptCat);
    return newCat;
  },

  /** Move a cat into a different (free) bed. */
  rehomeCat: (catId, bedId) => {
    const state = get();
    if (!beds(state.placements, state.instances).some((b) => b.id === bedId)) return;
    if (state.cats.some((c) => c.id !== catId && c.bedId === bedId)) return;
    set({ cats: state.cats.map((c) => (c.id === catId ? { ...c, bedId } : c)) });
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
    get().grantXp(XP_AWARDS.upgrade(result.cost));
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


  /**
   * Mark a chore done: it pays a few coins, grants xp, and its appeal starts
   * counting again until it comes round (`systems/chores.ts`).
   */
  finishChore: (id) => {
    const state = get();
    const chore = CHORES_BY_ID.get(id);
    if (!chore) return;
    const now = Date.now();
    // Guard against being called twice for one wipe — the minigame completes
    // on a pointer move crossing a threshold, and a fast drag can cross it on
    // two consecutive frames before the overlay closes.
    if (!isDue(chore, state.chores, state.openedAt, now)) return;
    set({
      chores: completeChore(state.chores, id, now),
      // Straight to the bank rather than the till: this is paid for *work
      // the player did*, not takings the café made while they were out, and
      // routing it through the till would let a full drawer swallow it.
      money: state.money + chore.pay,
      xp: state.xp + chore.xp,
    });
    logEvent({ name: "chore_done", chore: id });
  },

  /**
   * Charge for the piece that has just been placed.
   *
   * **Also the safety net.** `pendingPurchase` is runtime-only, so a session
   * that ends mid-placement would otherwise hand out a free piece; `main.ts`
   * settles on the way out for exactly that reason. Settling twice is
   * harmless — the pending record is cleared here.
   */
  collectTill: () => {
    const state = get();
    const taken = Math.floor(state.till);
    if (taken <= 0) return 0;
    // **Floor, and keep the remainder.** The till accrues fractions of a penny
    // every frame; rounding up would mint money on every collection, and
    // rounding down while zeroing the till would quietly eat it. What is left
    // is the fraction that has not become a coin yet.
    set({ money: state.money + taken, till: state.till - taken });
    logEvent({ name: "till_collected", amount: taken, money: state.money + taken });
    return taken;
  },

  collectTips: () => {
    const state = get();
    if (!tipsReady(state.tips) || !state.purchased.includes(TIP_JAR_ITEM)) return 0;
    const taken = Math.round(state.tips);
    // **Tips go to the bank, not the till**, and the distinction is worth
    // keeping: the jar is money left for *you*, the till is the café's
    // takings. It also means a full till never blocks the jar, which would be
    // a rule the player could not see and could not act on.
    set({ money: state.money + taken, tips: 0 });
    logEvent({ name: "tips_collected", amount: taken });
    return taken;
  },

  /**
   * The piece has landed: take the money, and *now* award the xp.
   *
   * **The xp moves when the money moves.** Both used to happen at the moment
   * the shop button was pressed, which meant the ring filled and the level-up
   * card could fly past while the ghost was still in the player's hand — and
   * then `undoPurchase` had to subtract it again if they changed their mind, so
   * cancelling visibly *un*-levelled you. Ellis, 2026-09-08: *"why the fuck am
   * i getting the xp and level up feedback before i placed it and then it
   * undoes it if cancelled."*
   *
   * §8 already had the rule for money — *"money moves **when the piece lands**,
   * not when the button is pressed… the till must not drop for a decision the
   * player has not finished making"* — and xp is the same kind of thing said
   * with a different number. Granting it here means there is nothing to claw
   * back, so the buy-then-cancel xp tap the old clawback existed to plug simply
   * cannot be expressed.
   */
  settlePurchase: () => {
    const state = get();
    const pending = state.pendingPurchase;
    if (!pending) return 0;
    set({
      money: Math.max(0, state.money - pending.cost),
      pendingPurchase: null,
    });
    get().grantXp(XP_AWARDS.furniture(pending.cost));
    return pending.cost;
  },

  movePiece: (id, x, z, rot = 0) => {
    const state = get();
    // **Two kinds of furniture, one move.** An authored piece records an
    // override in `placements`; an instance carries its own position. Callers
    // should not have to know which they are holding — the mover certainly
    // doesn't.
    if (state.instances.some((i) => i.id === id)) {
      set({
        instances: state.instances.map((i) => (i.id === id ? { ...i, x, z, rot } : i)),
        placementsMade: state.placementsMade + 1,
      });
    } else {
      set({
        placements: { ...state.placements, [id]: { x, z, rot } },
        placementsMade: state.placementsMade + 1,
      });
    }
    logEvent({ name: "furniture_moved", piece: id });
  },

  setPlayer: (profile) => {
    set({ player: { ...profile, created: true } });
    logEvent({ name: "player_created" });
  },

  grantTutorialFunds: (amount) => {
    if (!(amount > 0)) return;
    const state = get();
    // No ceiling to respect any more: the bank is unbounded, and what keeps
    // the numbers sane is the till the café earns into (`systems/till.ts`).
    set({ money: state.money + amount });
  },

  finishTutorial: () => {
    const state = get();
    // **The one-shot guard is what makes the gift safe.** "Show me round
    // again" no longer clears this flag (see `replayTutorial` in main.ts), so
    // a second tour returns 0 here — otherwise the settings row would be a
    // £1,000 button with a walkthrough attached.
    if (state.player.tutorialDone) return 0;
    // **The café opens when the guide leaves.** `openedAt` is what a chore's
    // first due date counts from, so stamping it here — rather than at café
    // creation — is what makes "five seconds after Mal walks out" mean that,
    // instead of five seconds after the save was written and therefore
    // somewhere in the middle of her walkthrough.
    // **A parting gift, so the café has somewhere to go next** (Ellis,
    // 2026-08-23). Paid in full: the bank has no ceiling, and a gift that
    // silently arrived short would be worse than no gift.
    const gift = ECONOMY_CONFIG.welcomeGift;
    set({
      player: { ...state.player, tutorialDone: true },
      openedAt: Date.now(),
      money: state.money + gift,
    });
    // §11 wants the progression funnel measured, and "did they sit through the
    // intro or bail out of it" is the very first question the funnel can ask.
    logEvent({ name: "tutorial_finished" });
    return gift;
  },

  unlockDrink: (id) => {
    const state = get();
    const drink = baseDrink(id);
    if (!drink || state.drinks.includes(id)) return false;
    if (levelProgress(state.xp).level < drink.level) return false;
    if (state.money < drink.price) return false;

    set({ money: state.money - drink.price, drinks: [...state.drinks, id] });
    logEvent({ name: "drink_unlocked", drink: id, cost: drink.price });
    get().grantXp(XP_AWARDS.menu(drink.price));
    return true;
  },

  unlockIngredient: (id) => {
    const state = get();
    const item = ingredient(id);
    if (!item || state.ingredients.includes(id)) return false;
    if (levelProgress(state.xp).level < item.level) return false;
    const price = firstIngredientIsFree(state) ? 0 : item.price;
    if (state.money < price) return false;

    set({ money: state.money - price, ingredients: [...state.ingredients, id] });
    logEvent({ name: "ingredient_unlocked", ingredient: id, cost: price });
    get().grantXp(XP_AWARDS.menu(item.price));
    return true;
  },

  createBlend: (name, base, chosen) => {
    const state = get();
    // **Inventing a drink is free**, and that is deliberate — you have already
    // paid for the ingredients, and charging for the creative act would be the
    // one genuinely mean thing in the game (§5).
    const trimmed = name.trim().slice(0, 24);
    if (!trimmed) return null;
    if (state.customDrinks.length >= MAX_CUSTOM_DRINKS) return null;
    if (!state.drinks.includes(base) && base !== STARTER_DRINK_ID) return null;
    const ingredients = chosen.filter(
      (id, i) => state.ingredients.includes(id) && chosen.indexOf(id) === i,
    );

    const drink: CustomDrink = {
      id: `blend-${state.nextDrinkId}`,
      name: trimmed,
      base,
      ingredients,
    };
    set({
      customDrinks: [...state.customDrinks, drink],
      nextDrinkId: state.nextDrinkId + 1,
    });
    logEvent({ name: "blend_created", ingredients: ingredients.length });
    get().grantXp(XP_AWARDS.blend);
    return drink;
  },

  /**
   * Take a goal's reward.
   *
   * **Straight to the bank, not the till.** This is paid for something the
   * player *did*, exactly like a chore — routing it through the till would let
   * a full drawer swallow it, which is a rule nobody can see (§8).
   */
  claimGoal: (id) => {
    const state = get();
    const paid = claimValue(state, state.goalsClaimed, id);
    if (paid <= 0) return 0;
    set({
      money: state.money + paid,
      goalsClaimed: [...state.goalsClaimed, id],
    });
    logEvent({ name: "goal_claimed", goal: id, reward: paid });
    return paid;
  },

  removeBlend: (id) => {
    const state = get();
    if (!state.customDrinks.some((d) => d.id === id)) return;
    const sales = { ...state.sales };
    delete sales[id];
    set({ customDrinks: state.customDrinks.filter((d) => d.id !== id), sales });
  },

  buyBed: () => {
    const state = get();
    const owned = beds(state.placements, state.instances);
    const cost = bedCost(owned.length);
    if (state.money < cost) return null;

    // Dropped at the origin and immediately handed to placement mode, which
    // nudges it to the nearest spot it fits (see `beginPlacing` in main.ts) —
    // a bed you cannot see is a bed you cannot use.
    const id = `inst-${state.nextInstanceId}`;
    /**
     * **Nothing is taken and nothing is awarded here** — see `pendingPurchase`
     * and `settlePurchase`. The bed was the last thing in the shop still
     * charging on the button press rather than on the piece landing, which made
     * it the one purchase where the money dropped and the xp ring filled while
     * the ghost was still in your hand, and where cancelling visibly took both
     * back. Ellis, 2026-09-19: *"its still like giving me the xp and reward for
     * buying something BEFORE i place it. and then like taking it away when i
     * cancel… it should be only counting it as actually purchased once i press
     * put it here."*
     *
     * It is also the *first* thing the walkthrough has you buy, so this was the
     * first purchase a new player ever made and the one most likely to be
     * cancelled while they worked out what they were doing.
     */
    set({
      nextInstanceId: state.nextInstanceId + 1,
      instances: [...state.instances, { id, item: CAT_BED_ITEM, x: 0, z: 0 }],
      pendingPurchase: { id, cost },
    });
    logEvent({ name: "bed_bought", beds: owned.length + 1, cost });
    return id;
  },

  /**
   * Back out of a purchase that is still in the player's hands.
   *
   * **Nothing is refunded and nothing is un-levelled, because neither was ever
   * given.** Money and xp both move when the piece lands (`settlePurchase`), so
   * cancelling an unpaid piece only has to remove it. This used to subtract the
   * xp again, which is what made cancelling visibly *undo* a level-up; moving
   * the award to settlement means the buy-then-cancel xp tap it was guarding
   * against cannot be expressed in the first place.
   *
   * The `settled` branch is the exception and still does both: a pending record
   * that has somehow already been paid (a force-quit mid-placement, which
   * `settleOnLeave` covers) gets its money *and* its xp taken back with the
   * piece, so this can never leave the player charged and levelled for
   * something they do not own.
   */
  undoPurchase: (id) => {
    const state = get();
    const pending = state.pendingPurchase;
    const unpaid = pending?.id === id;
    const refund = (cost: number) =>
      unpaid ? state.money : state.money + cost;

    const instance = state.instances.find((i) => i.id === id);
    if (instance) {
      // A bed's price depends on how many there were *before* it — so refund
      // the cost of the one being removed, not of the next one.
      const cost = pending?.cost ?? bedCost(beds(state.placements, state.instances).length - 1);
      set({
        money: refund(cost),
        instances: state.instances.filter((i) => i.id !== id),
        // Only if it was already paid for — see the note above.
        xp: unpaid ? state.xp : Math.max(0, state.xp - XP_AWARDS.furniture(cost)),
        pendingPurchase: unpaid ? null : state.pendingPurchase,
      });
      return;
    }

    const item = shopItem(id);
    if (!item || !state.purchased.includes(id)) return;
    set({
      money: refund(item.price),
      purchased: state.purchased.filter((p) => p !== id),
      xp: unpaid ? state.xp : Math.max(0, state.xp - XP_AWARDS.furniture(item.price)),
      pendingPurchase: unpaid ? null : state.pendingPurchase,
    });
  },

  sellInstance: (id) => {
    const state = get();
    const instance = state.instances.find((i) => i.id === id);
    if (!instance) return;
    // **A bed that somebody lives in only goes if there is somewhere to move
    // them to.** `catPositions` falls back to stacking a homeless cat on top
    // of another one, which is a visible mess and, worse, the first step
    // toward a cat with nowhere to be — and §8's one sacred rule is that a
    // player never loses a cat. Refusing is a rule the player can act on: sell
    // a different bed, or none.
    if (instance.item === CAT_BED_ITEM) {
      const all = beds(state.placements, state.instances);
      // One bed per cat, so selling one is only allowed while there is slack.
      if (state.cats.length >= all.length) return;
    }
    /**
     * **Half back.** A full refund would make the shop a free sandbox, and
     * nothing back would make trying a second plant a punishment — neither is
     * the cosy answer. Half is the one every builder game uses, and it is
     * legible without a number on screen.
     */
    const item = shopItem(instance.item);
    const paid = item
      ? copyPrice(item, copiesOf(state.instances, instance.item))
      : bedCost(beds(state.placements, state.instances).length - 1);
    // The cat is *not* removed — `catPositions` rehomes it to a spare bed.
    // Losing a cat because a piece of furniture was sold would be exactly the
    // loss §8 forbids.
    set({
      money: state.money + Math.round(paid / 2),
      instances: state.instances.filter((i) => i.id !== id),
    });
    logEvent({ name: "furniture_sold", item: instance.item, refund: Math.round(paid / 2) });
  },

  sellShopItem: (itemId) => {
    const state = get();
    const item = shopItem(itemId);
    if (!item) return 0;

    // **The newest copy first.** Copies are priced on a rising curve, so
    // selling the dearest one back is both what the player expects (the last
    // thing they bought) and what keeps buy-then-sell a loss at every step.
    const copies = state.instances.filter((i) => i.item === itemId);
    const newest = copies[copies.length - 1];
    if (newest) {
      const before = get().money;
      get().sellInstance(newest.id);
      return get().money - before;
    }

    if (!state.purchased.includes(itemId)) return 0;
    // The last cat bed in the café is the authored one, and a cat lives in it.
    if (itemId === CAT_BED_ITEM || item.place === "cat-bed") {
      if (state.cats.length > 0) return 0;
    }

    /**
     * **Half back, like a copy** — and no XP is taken.
     *
     * `undoPurchase` *does* reverse XP, because cancelling a placement costs
     * nothing and would otherwise be a free tap to farm the ring. A sale is
     * different: it costs half the price, so the loop is a real loss in the
     * currency that matters, and clawing XP back would demote a player's level
     * — which `data/progression.ts` promises never happens.
     */
    const refund = Math.round(item.price / 2);
    // The override goes with it. Left behind, re-buying the piece would put it
    // back wherever it was last dragged rather than where the layout composed
    // it, which is the arrangement the room was designed around.
    const placements = { ...state.placements };
    if (item.place) delete placements[item.place];
    set({
      money: state.money + refund,
      purchased: state.purchased.filter((id) => id !== itemId),
      placements,
    });
    logEvent({ name: "furniture_sold", item: itemId, refund });
    return refund;
  },

  buyTile: (key) => {
    const state = get();
    if (state.tiles.includes(key)) return false;
    if (!expansionCandidates(state.tiles).some((t) => tileKey(t) === key)) return false;

    /**
     * **Squares bought, not entries in `tiles`.**
     *
     * `tiles` carries `HOME_TILE` as its first element, so `tiles.length` is
     * one *more* than the number of squares the player has paid for — and both
     * curves here are indexed by squares bought. Using the length priced and
     * gated every square one step ahead of the "+" marker the player was
     * looking at (`ui/builder.ts` counts with `ownedPatches`), so the button
     * offered the café's first square at $900 / level 3 while this refused it
     * below $1,710 / level 5. An enabled button that silently does nothing:
     * Ellis, 2026-08-17, *"i can no longer extend anywhere it breaks it."*
     *
     * `expansion.test.ts` pins the two against each other, because the failure
     * is invisible from either side alone — each curve is self-consistent.
     */
    const owned = ownedPatches(state.tiles).length;
    if (levelProgress(state.xp).level < expansionLevel(owned)) return false;
    const cost = expansionCost(owned);
    if (state.money < cost) return false;

    set({ money: state.money - cost, tiles: [...state.tiles, key] });
    logEvent({ name: "tile_bought", tiles: owned + 1, cost });
    get().grantXp(XP_AWARDS.tile);
    return true;
  },

  buyCopy: (itemId) => {
    const state = get();
    const item = shopItem(itemId);
    // The *first* one is a normal purchase — it reveals the piece the layout
    // authored, which is what keeps a furnished café looking composed. Only
    // after that does buying make copies.
    if (!item || !state.purchased.includes(itemId)) return null;
    const cost = copyPrice(item, copiesOf(state.instances, itemId) + 1);
    if (state.money < cost) return null;

    const id = `inst-${state.nextInstanceId}`;
    set({
      // Dropped at the origin and immediately handed to the placer, which
      // spirals out to the nearest spot it actually fits (`nearestValidSpot`).
      instances: [...state.instances, { id, item: itemId, x: 0, z: 0 }],
      nextInstanceId: state.nextInstanceId + 1,
      pendingPurchase: { id, cost },
    });
    logEvent({ name: "shop_item_bought", item: itemId, cost });
    // No xp here — it is awarded when the piece lands (`settlePurchase`).
    return id;
  },

  buyWindow: (id) => {
    const state = get();
    // Only a wall the café actually has, and only once. Both checks matter:
    // the first stops a stale marker from a pre-expansion frame buying a
    // window on a wall that no longer exists, the second stops a double tap
    // charging twice for the same glass.
    if (state.windows.includes(id)) return false;
    if (!wallSegments(state.tiles, state.windows).some((w) => w.id === id)) return false;
    // The window is a hole in the wall piece, so glazing a segment cuts the
    // plaster out from behind anything nailed to it. See `occupiedWalls`.
    if (occupiedWalls(state.placements, state.purchased, state.instances).has(id)) return false;
    if (state.money < WINDOW_PRICE) return false;

    const windows = [...state.windows, id];
    set({
      money: state.money - WINDOW_PRICE,
      windows,
      // Glazing the café's *first* window starts the smear clock; glazing a
      // second one does not reset it. See `acquireSubjects`.
      chores: acquireSubjects(state.chores, state, { ...state, windows }, Date.now()),
    });
    logEvent({ name: "window_bought", cost: WINDOW_PRICE });
    get().grantXp(XP_AWARDS.furniture(WINDOW_PRICE));
    return true;
  },

  removeWindow: (id) => {
    const state = get();
    if (!state.windows.includes(id)) return false;
    /**
     * **A full refund, because this is a change of mind, not a transaction.**
     * Ellis: *"theres no way to revert them back to walls as far as i can
     * tell."* Charging to undo a decorative choice is the kind of small
     * meanness §5 rules out, and there is nothing to exploit — you cannot end
     * up with more money than you started with.
     */
    set({
      money: state.money + WINDOW_PRICE,
      windows: state.windows.filter((w) => w !== id),
    });
    return true;
  },

  setGraphics: (level) => {
    set({ player: { ...get().player, graphics: level } });
  },

  setBackdrop: (id) => {
    const state = get();
    const choice = backdrop(sanitizeBackdrop(id));
    // Free during setup, and free forever once bought — the same "own it, then
    // re-apply as often as you like" rule the colourways use.
    const free = choice.price === 0 || state.backdropsOwned.includes(choice.id);
    if (!free) {
      if (state.money < choice.price) return false;
      set({
        money: state.money - choice.price,
        backdropsOwned: [...state.backdropsOwned, choice.id],
      });
      logEvent({ name: "backdrop_bought", backdrop: choice.id, cost: choice.price });
      get().grantXp(XP_AWARDS.colourway(choice.price));
    }
    set({ player: { ...get().player, backdrop: choice.id } });
    return true;
  },

  setMusicMuted: (muted) => {
    set({ player: { ...get().player, musicMuted: muted } });
  },

  grantXp: (amount) => {
    const gain = Math.max(0, Math.round(amount));
    if (gain === 0) return;
    const before = levelProgress(get().xp).level;
    const xp = get().xp + gain;
    set({ xp });
    const after = levelProgress(xp).level;
    // One event per level, so a single huge award still celebrates each step
    // rather than skipping silently from 3 to 6.
    for (let level = before + 1; level <= after; level++) {
      emitGameEvent("levelUp", { level });
      logEvent({ name: "level_up", level });
    }
  },

  buyShopItem: (id) => {
    const state = get();
    const item = shopItem(id);
    if (!item) return false;
    if (state.purchased.includes(id)) return false;
    if (item.unlock && !item.unlock.met(currentProgress(state))) return false;
    if (state.money < item.price) return false;

    const purchased = [...state.purchased, id];
    // Charged on placement, not here — see `pendingPurchase`.
    set({
      purchased,
      pendingPurchase: { id, cost: item.price },
      // A job about this thing starts its clock now rather than back when the
      // café opened, so buying a table is not met by an instant demand to
      // wipe it. See `acquireSubjects`.
      chores: acquireSubjects(state.chores, state, { ...state, purchased }, Date.now()),
    });
    logEvent({ name: "shop_item_bought", item: id, cost: item.price });
    // No xp here — it is awarded when the piece lands (`settlePurchase`).
    return true;
  },

  chooseCustomisation: (categoryId, optionId) => {
    const state = get();
    const option = optionById(categoryId, optionId);
    if (!option) return false;
    if (!isUnlocked(option, currentProgress(state))) return false;

    const key = `${categoryId}:${optionId}`;
    const alreadyOwned = option.price === 0 || state.owned.includes(key);
    if (!alreadyOwned && state.money < option.price) return false;

    set({
      money: alreadyOwned ? state.money : state.money - option.price,
      owned: alreadyOwned ? state.owned : [...state.owned, key],
      customisation: { ...state.customisation, [categoryId]: optionId },
    });
    if (!alreadyOwned) {
      logEvent({ name: "customisation_bought", category: categoryId, option: optionId, cost: option.price });
      get().grantXp(XP_AWARDS.colourway(option.price));
    }
    return true;
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

    // **Into the till, and only as much as fits.** This is the line that
    // answers Ellis's *"u cant just go offline for 4 days and come back to
    // being rich"*: what a week away is worth is exactly what a full drawer is
    // worth. `tillRoom` is asked what will fit rather than subtracting two
    // totals, so the welcome-back card never promises money that bounced off
    // the brim.
    const banked = Math.min(earned, tillRoom(state.till, tillCapacity(state.upgrades)));
    if (banked <= 0) return 0;

    set({ till: state.till + banked });
    logEvent({
      name: "offline_income",
      awayMs: Math.round(awayMs),
      earned: banked,
      money,
    });
    return banked;
  },
}));
