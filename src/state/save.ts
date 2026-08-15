import type { StoreApi } from "zustand/vanilla";
import type { CatInstance, GameState, Instance } from "@/state/store";
import { CAT_BED_ITEM } from "@/data/beds";
import { UPGRADE_DEFINITIONS } from "@/data/upgrades";
import {
  CUSTOMISATION,
  DEFAULT_CUSTOMISATION,
  optionById,
  type Customisation,
} from "@/data/customisation";
import { XP_AWARDS } from "@/data/progression";
import { levelOf, type UpgradeLevels } from "@/systems/upgrades";
import { MOVABLE, type Placements } from "@/data/cafe-layout";
import { SHOP_ITEMS, shopItem } from "@/data/shop";
import { DEFAULT_PLAYER, sanitizePlayer, type PlayerProfile } from "@/data/player";
import { HOME_TILE, HOME_WINDOW, ownedTiles, tileKey, type TileKey } from "@/data/expansion";
import {
  MAX_CUSTOM_DRINKS,
  STARTER_DRINK_ID,
  baseDrink,
  ingredient,
  type CustomDrink,
} from "@/data/drinks";

/**
 * Minimal save system (§8): the Zustand store is the single source of truth,
 * serialised to localStorage. Versioned from day one so future shape changes
 * migrate instead of corrupting saves. Never lose a player's cats. Sacred.
 *
 * Visitors are transient scene state and deliberately not saved.
 *
 * Migrations run in order, each bumping one version, so a save from any past
 * build walks forward to the current shape:
 *   v1 → v2: added `savedAt` (wall-clock ms) so offline earnings can be
 *            computed from time away on next launch.
 *   v2 → v3: added `upgrades` (café expansion + décor levels).
 *   v3 → v4: added `venueIndex` (venue progression). Cats gained an optional
 *            `contentUntil`; absent simply means "not content", so no cat data
 *            needed rewriting — which is the point of keeping it optional.
 *   v4 → v5: **dropped `venueIndex`** — the venue ladder was scrapped in the
 *            direction change (§0). Anyone mid-ladder keeps their cats and
 *            names; they simply come home to the one café. Money is rescaled
 *            in the same step, because old balances ran to the billions and
 *            the new economy tops out in the tens of thousands.
 *   v4 → v5 → v6: **no migration, by design.** The economy was rescaled from
 *            billions to a £9,999 ceiling and cats were capped at five, so a
 *            v5 save produces a nonsense state — dozens of cats the room can't
 *            hold, and a balance that skips the entire game. Those saves are
 *            discarded and the player starts fresh. This is a deliberate,
 *            one-time break made while the game has no players; once it ships,
 *            "never lose a player's cats" applies without exception and every
 *            version gets a real migration.
 * v16 → v17: cats live in cat beds; capacity is how many beds are placed.
 *            Every existing cat is **given** a bed free — a café with five cats
 *            and one bed would otherwise wake up with four cats nowhere, and
 *            "never lose a player's cats" covers showing them too.
 * v15 → v16: backdrops became purchasable. The one already in use is granted,
 *            because charging for the sky someone has had all along is a
 *            takeaway.
 * v14 → v15: expansion. Additive — every existing café is one tile, which is
 *            what it has always been.
 * v13 → v14: the menu — classic coffees, add-ins and blends. Purely additive;
 *            every café starts on filter coffee, which is where a new one
 *            starts too, so there is nothing to preserve or take away.
 * v12 → v13: levels and XP. An existing café is **credited** for the furniture
 *            it owns, the cats it adopted and the colourways it bought, so the
 *            ring reflects the café rather than the day the feature shipped.
 * v11 → v12: the "cosy touches" upgrade was retired — appeal comes from shop
 *            furniture now. Levels are **refunded**, not written off, so the
 *            appeal that went away can be bought back as things you can see.
 *  v10 → v11: character creation. Existing cafés are marked created rather
 *            than dragged back through onboarding — the café is already theirs.
 *   v9 → v10: the shop arrived and the café starts bare. Existing cafés are
 *            granted the entire catalogue — they had that room before it had a
 *            price, and taking it away would be exactly the loss §8 forbids.
 *   v8 → v9: furniture became movable; adds `placements`. Purely additive — an
 *            absent map means everything sits where the layout put it.
 *   v7 → v8: the floor became its own customisation category, split out of
 *            "Walls & floor". An existing café keeps its exact look — the new
 *            `floor` choice inherits the wall style — and a paid-for wall style
 *            grants the matching floor rather than charging twice for it.
 *   v6 → v7: the free default sofa and rug changed when the room was rebuilt
 *            against the reference render. A save still sitting on the old
 *            default — i.e. one where the player never chose — is moved onto
 *            the new one. A save that bought a colourway is untouched.
 */

const SAVE_KEY = "mallow-save";
const SAVE_VERSION = 22;

/** Inlined so a migration can't be broken by a rebalance of the live config. */
const TILL_CAPACITY = 9999;

interface SaveDataCurrent {
  version: 22;
  money: number;
  nextCatId: number;
  cats: CatInstance[];
  /** Wall-clock (Date.now) timestamp of the last save — basis for offline earnings. */
  savedAt: number;
  upgrades: UpgradeLevels;
  customisation: Customisation;
  placements: Placements;
  purchased: string[];
  player: PlayerProfile;
  owned: string[];
  xp: number;
  drinks: string[];
  ingredients: string[];
  customDrinks: CustomDrink[];
  sales: Record<string, number>;
  nextDrinkId: number;
  tiles: TileKey[];
  backdropsOwned: string[];
  windows: string[];
  instances: Instance[];
  nextInstanceId: number;
}

export interface LoadedSave
  extends Pick<
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
    | "nextDrinkId"
    | "tiles"
    | "backdropsOwned"
    | "windows"
    | "instances"
    | "nextInstanceId"
  > {
  savedAt: number;
}

type RawSave = Record<string, unknown>;

/**
 * Each migration takes the previous shape and returns the next one. Adding a
 * version means appending one entry here — nothing else changes.
 */
const MIGRATIONS: Record<number, (data: RawSave) => RawSave> = {
  // No retroactive offline windfall for saves that predate savedAt; nothing lost.
  1: (data) => ({ ...data, version: 2, savedAt: Date.now() }),
  2: (data) => ({ ...data, version: 3, upgrades: {} }),
  // Everyone starts in the first venue; existing cats need no rewriting.
  3: (data) => ({ ...data, version: 4, venueIndex: 0 }),
  // The ladder is gone. Drop the venue, and bring absurd old balances back
  // into the readable range rather than handing someone a billion pounds in a
  // game whose prices now top out around 30,000.
  4: (data) => {
    const { venueIndex: _dropped, ...rest } = data;
    const money = typeof data.money === "number" ? data.money : 0;
    return { ...rest, version: 5, money: Math.min(money, 5_000) };
  },
  // The room was rebuilt against the reference render, which made the olive
  // armchair and the berry doormat the *intended* look rather than paid
  // alternatives — so they became the free first option in their categories.
  // A save that still holds the old free default has never had that choice
  // made by the player; it's just where they started. Move it, so an existing
  // café looks the way a new one does. A save that *bought* something in the
  // category is left exactly alone.
  6: (data) => {
    const chosen = (typeof data.customisation === "object" && data.customisation !== null
      ? { ...(data.customisation as Record<string, unknown>) }
      : {}) as Record<string, unknown>;
    const owned = Array.isArray(data.owned) ? (data.owned as string[]) : [];
    const rehome = (category: string, wasDefault: string, nowDefault: string) => {
      if (chosen[category] !== wasDefault) return;
      if (owned.some((key) => key.startsWith(`${category}:`))) return;
      chosen[category] = nowDefault;
    };
    rehome("sofa", "Cream", "Olive");
    rehome("carpet", "Small_Cream", "Small_Red");
    return { ...data, version: 7, customisation: chosen };
  },
  // The floor became its own category, split out of "Walls & floor" — holding
  // a finger on the floor mostly hit that one style and it dragged the window
  // along with it. An existing café must look **identical** after this, so the
  // new `floor` choice inherits whatever wall style was in use, and anyone who
  // paid for that style is granted the matching floor rather than being asked
  // to buy the surface they already had.
  7: (data) => {
    const chosen = (typeof data.customisation === "object" && data.customisation !== null
      ? { ...(data.customisation as Record<string, unknown>) }
      : {}) as Record<string, unknown>;
    const owned = Array.isArray(data.owned) ? [...(data.owned as string[])] : [];

    const wall = typeof chosen.walls === "string" ? chosen.walls : "A";
    chosen.floor ??= wall;

    for (const style of ["B", "C"]) {
      if (owned.includes(`walls:${style}`) && !owned.includes(`floor:${style}`)) {
        owned.push(`floor:${style}`);
      }
    }
    return { ...data, version: 8, customisation: chosen, owned };
  },
  // Furniture became movable. Purely additive: an absent `placements` means
  // "everything is where the layout put it", which is exactly an old save.
  8: (data) => ({ ...data, version: 9, placements: {} }),
  // The shop arrived and the café now starts bare. **Anyone who already had a
  // café keeps every piece of it** — they earned that room before it had a
  // price — so an existing save is granted the whole catalogue rather than
  // being stripped back to the shell overnight.
  9: (data) => ({ ...data, version: 10, purchased: SHOP_ITEMS.map((i) => i.id) }),
  // Character creation arrived. An existing café is **not** dragged back
  // through onboarding — it is already theirs — so the profile is marked
  // created with a default look they can change later.
  10: (data) => ({
    ...data,
    version: 11,
    player: { ...DEFAULT_PLAYER, cafeName: "mallow café", created: true },
  }),
  // "Cosy touches" was retired: appeal comes from shop furniture now, so the
  // upgrade and the shop were selling the same thing and only one of them put
  // anything in the room.
  //
  // **The levels are refunded rather than written off.** `sanitizeUpgrades`
  // would silently drop them on load — the save would not break — but the
  // player spent real money on appeal they are about to stop having, and the
  // replacement is on sale in the shop. Handing the money back turns a removal
  // into a shopping trip.
  //
  // The cost curve is inlined on purpose: a migration must keep working after
  // the data it migrates has been deleted from `data/upgrades.ts`.
  11: (data) => {
    const raw = (typeof data.upgrades === "object" && data.upgrades !== null
      ? { ...(data.upgrades as Record<string, unknown>) }
      : {}) as Record<string, unknown>;
    const level = typeof raw.decor === "number" && Number.isFinite(raw.decor)
      ? Math.max(0, Math.min(8, Math.floor(raw.decor)))
      : 0;
    delete raw.decor;

    let refund = 0;
    for (let bought = 0; bought < level; bought++) {
      refund += Math.round(40 * Math.pow(1.55, bought)); // baseCost 40, growth 1.55
    }

    // **A junk balance is left junk**, so the validator downstream still throws
    // the save away. Coercing it to a number here would launder corrupt data
    // past the one check that exists to catch it.
    const money = data.money;
    const banked =
      typeof money === "number" && Number.isFinite(money)
        ? // The till still has a ceiling; a refund must not smuggle money past it.
          Math.min(TILL_CAPACITY, money + refund)
        : money;

    return { ...data, version: 12, upgrades: raw, money: banked };
  },
  // Levels and XP arrived. **An existing café is credited for what it already
  // has** rather than starting at level 1 with a full room — the ring is a
  // record of what you built, and showing someone an empty one over a finished
  // café would be a lie about their own save.
  12: (data) => {
    const purchased = Array.isArray(data.purchased) ? (data.purchased as string[]) : [];
    const cats = Array.isArray(data.cats) ? data.cats : [];
    const owned = Array.isArray(data.owned) ? (data.owned as string[]) : [];

    let xp = 0;
    for (const id of purchased) {
      const item = shopItem(id);
      if (item) xp += XP_AWARDS.furniture(item.price);
    }
    // The starter cat came free, so it earns nothing; every adoption after it
    // was a real decision.
    xp += Math.max(0, cats.length - 1) * XP_AWARDS.adoptCat;
    // A migration runs *before* validation, so it must survive junk — this
    // list is known to contain non-strings in the wild (`save.test.ts` pins a
    // save with a bare `42` in it), and a throw here loses the whole café.
    for (const key of owned) {
      if (typeof key !== "string") continue;
      const [category, option] = key.split(":");
      const found = optionById(category, option);
      if (found) xp += XP_AWARDS.colourway(found.price);
    }
    return { ...data, version: 13, xp };
  },
  // The menu arrived. Purely additive: every café starts serving filter coffee
  // and nothing else, which is exactly where a new one starts too — there is
  // no existing state to preserve and nothing to take away.
  13: (data) => ({
    ...data,
    version: 14,
    drinks: [STARTER_DRINK_ID],
    ingredients: [],
    customDrinks: [],
    sales: {},
    nextDrinkId: 1,
  }),
  // Expansion. Every existing café is exactly one tile, which is what it has
  // always been — so this adds a field and changes nothing anyone can see.
  14: (data) => ({ ...data, version: 15, tiles: [HOME_TILE] }),
  // Backdrops became purchasable. Whatever the player is already looking at is
  // theirs — charging for the sky they have had all along would be a
  // takeaway, which §8 forbids.
  15: (data) => {
    const player = (typeof data.player === "object" && data.player !== null
      ? (data.player as Record<string, unknown>)
      : {}) as Record<string, unknown>;
    const current = typeof player.backdrop === "string" ? player.backdrop : null;
    return { ...data, version: 16, backdropsOwned: current ? [current] : [] };
  },
  /**
   * Cats live in cat beds now, and capacity is the number of beds.
   *
   * **Every existing cat is given a bed, free.** A café with five cats and one
   * authored bed would otherwise wake up over capacity, with four cats
   * nowhere — and "never lose a player's cats. Sacred." (§8) covers *showing*
   * them as much as storing them. The extra beds are granted rather than
   * charged for: the player already paid for those cats under the old rules.
   *
   * They are laid out in a row along the back of the room and can be dragged
   * anywhere afterwards. A tidy default beats a clever one nobody can find.
   */
  16: (data) => {
    const cats = Array.isArray(data.cats) ? (data.cats as Record<string, unknown>[]) : [];
    const instances: Instance[] = [];
    let next = 1;

    // The authored bed houses the first cat; every other cat gets a new one.
    const placed = cats.map((cat, index) => {
      if (index === 0) return { ...cat, bedId: "cat-bed" };
      const id = `inst-${next++}`;
      instances.push({
        id,
        item: CAT_BED_ITEM,
        // Spread along the back wall, clear of the counter peninsula.
        x: 0.5 + (index - 1) * 0.9,
        z: -1.55,
      });
      return { ...cat, bedId: id };
    });

    return { ...data, version: 17, cats: placed, instances, nextInstanceId: next };
  },
  /**
   * Windows became a thing you buy, per wall segment.
   *
   * The café has always had exactly one — the big arched window on the back
   * wall — and it was hard-coded into the layout. It is now a row in this list
   * like any other, so an existing save is seeded with it and looks identical.
   * Miss this and the café wakes up bricked in.
   */
  17: (data) => ({ ...data, version: 18, windows: [HOME_WINDOW] }),
  /**
   * The floor cushions moved into the shop, so a new café opens tidier.
   *
   * **An existing café keeps them, free.** They were part of the room before
   * they had a price, and taking two seats off a player overnight is exactly
   * the loss §8 forbids — the same rule that granted the whole catalogue at
   * v10 when the shop first appeared.
   */
  18: (data) => {
    const purchased = Array.isArray(data.purchased)
      ? data.purchased.filter((v): v is string => typeof v === "string")
      : [];
    return {
      ...data,
      version: 19,
      purchased: purchased.includes("floor-cushions")
        ? purchased
        : [...purchased, "floor-cushions"],
    };
  },
  /**
   * The guide who shows you round is new, and **an existing café must not be
   * shown it**. Somebody five levels in does not need telling what the shop
   * button is, and a tutorial that fires at a finished café reads as a bug.
   *
   * `created` is the tell: it has meant "has been through character creation"
   * since v11, so anyone carrying it has already been playing. Same argument
   * as v10→v11, which marked those players as having finished the creator they
   * never saw.
   */
  19: (data) => {
    const player = (typeof data.player === "object" && data.player !== null
      ? data.player
      : {}) as Record<string, unknown>;
    return {
      ...data,
      version: 20,
      player: { ...player, tutorialDone: player.created === true },
    };
  },
  /**
   * **The floor cushions go back out, and this reverses v18→v19 on purpose.**
   *
   * Ellis, seeing them on the device: *"the pillows i dont want at all when i
   * first open cafe it just takes up space."* A new café has not had them
   * since they moved into the shop — that part was already right. What put
   * them in *his* café is the v19 grant, which handed them to every existing
   * save on the reasoning that they were in the room before they had a price.
   *
   * That reasoning was sound and the outcome is still wrong, so the grant is
   * withdrawn rather than defended. **Safe to do because it can only ever
   * take back something that was given free**: this runs once, on the way from
   * v19, and a café that buys the cushions afterwards is already at v21 and
   * never sees it. Nobody has paid for these.
   *
   * The pieces themselves stay in the shop at £55 for anyone who wants them.
   */
  20: (data) => {
    const purchased = Array.isArray(data.purchased)
      ? data.purchased.filter((v): v is string => typeof v === "string")
      : [];
    return {
      ...data,
      version: 21,
      purchased: purchased.filter((id) => id !== "floor-cushions"),
    };
  },
  /**
   * The armchair and the bar stools moved into the shop, so a new café opens
   * with a bare floor and room to put things down.
   *
   * **An existing café keeps them, free** — the same rule as v10 and v19, and
   * the one that matters most here: these are *seats*, so taking them away
   * would stop an established café earning overnight.
   */
  21: (data) => {
    const purchased = Array.isArray(data.purchased)
      ? data.purchased.filter((v): v is string => typeof v === "string")
      : [];
    const granted = ["armchair", "bar-stools"].filter((id) => !purchased.includes(id));
    return { ...data, version: 22, purchased: [...purchased, ...granted] };
  },
};

/** Keep only blends that still make sense: a real base, real add-ins, a name. */
function sanitizeBlends(value: unknown, ingredientsOwned: string[]): CustomDrink[] {
  if (!Array.isArray(value)) return [];
  const owned = new Set(ingredientsOwned);
  const out: CustomDrink[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) continue;
    const drink = raw as Record<string, unknown>;
    if (typeof drink.id !== "string" || typeof drink.name !== "string") continue;
    if (!drink.name.trim()) continue;
    if (typeof drink.base !== "string" || !baseDrink(drink.base)) continue;
    const chosen = Array.isArray(drink.ingredients) ? drink.ingredients : [];
    out.push({
      id: drink.id,
      name: drink.name,
      base: drink.base,
      // A blend keeps only add-ins the player still owns and the catalogue
      // still has — a retired ingredient must not silently keep paying out.
      ingredients: chosen.filter(
        (i): i is string => typeof i === "string" && owned.has(i) && ingredient(i) !== undefined,
      ),
    });
  }
  return out.slice(0, MAX_CUSTOM_DRINKS);
}

/** Player-created furniture: an id, a catalogue item, and a place to stand. */
function sanitizeInstances(value: unknown): Instance[] {
  if (!Array.isArray(value)) return [];
  const out: Instance[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) continue;
    const item = raw as Record<string, unknown>;
    if (typeof item.id !== "string" || typeof item.item !== "string") continue;
    if (typeof item.x !== "number" || !Number.isFinite(item.x)) continue;
    if (typeof item.z !== "number" || !Number.isFinite(item.z)) continue;
    // An instance of a catalogue item that no longer exists is dropped, the
    // same way a retired upgrade level is.
    if (item.item !== CAT_BED_ITEM) continue;
    out.push({
      id: item.id,
      item: item.item,
      x: item.x,
      z: item.z,
      rot: typeof item.rot === "number" && Number.isFinite(item.rot) ? item.rot : 0,
    });
  }
  return out;
}

/** Keep only well-formed positions for pieces that still exist and still move. */
function sanitizePlacements(value: unknown): Placements {
  if (typeof value !== "object" || value === null) return {};
  const raw = value as Record<string, unknown>;
  const out: Placements = {};
  for (const piece of MOVABLE) {
    if (!piece.id) continue;
    const at = raw[piece.id];
    if (typeof at !== "object" || at === null) continue;
    const { x, z, rot } = at as { x?: unknown; z?: unknown; rot?: unknown };
    if (typeof x !== "number" || !Number.isFinite(x)) continue;
    if (typeof z !== "number" || !Number.isFinite(z)) continue;
    out[piece.id] = {
      x,
      z,
      rot: typeof rot === "number" && Number.isFinite(rot) ? rot : 0,
    };
  }
  return out;
}

function isValidCat(value: unknown): value is CatInstance {
  if (typeof value !== "object" || value === null) return false;
  const cat = value as Record<string, unknown>;
  return (
    typeof cat.id === "string" &&
    typeof cat.name === "string" &&
    cat.name.length > 0 &&
    typeof cat.definitionId === "string"
  );
}

/** Drop choices for categories or options that no longer exist in the catalog. */
function sanitizeCustomisation(value: unknown): Customisation {
  const raw = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  const out: Customisation = { ...DEFAULT_CUSTOMISATION };
  for (const category of CUSTOMISATION) {
    const chosen = raw[category.id];
    if (typeof chosen === "string" && category.options.some((o) => o.id === chosen)) {
      out[category.id] = chosen;
    }
  }
  return out;
}

/**
 * Keep only levels for upgrades that still exist, clamped to their current max.
 * A removed or shrunk upgrade must never corrupt a save — it just stops counting.
 */
function sanitizeUpgrades(value: unknown): UpgradeLevels {
  if (typeof value !== "object" || value === null) return {};
  const raw = value as Record<string, unknown>;
  const levels: UpgradeLevels = {};
  for (const definition of UPGRADE_DEFINITIONS) {
    const level = levelOf(raw as UpgradeLevels, definition.id);
    if (level > 0) levels[definition.id] = level;
  }
  return levels;
}

/** Read + validate + migrate the save. Returns null (fresh start) on anything malformed. */
export function loadSave(): LoadedSave | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return null; // storage unavailable (private mode etc.) — play unsaved rather than crash
  }
  if (!raw) return null;

  try {
    let data = JSON.parse(raw) as RawSave;

    // Walk the save forward one version at a time to the current shape.
    while (typeof data.version === "number" && data.version < SAVE_VERSION) {
      const migrate = MIGRATIONS[data.version];
      if (!migrate) break;
      data = migrate(data);
    }

    if (data.version !== SAVE_VERSION) return null;
    if (typeof data.money !== "number" || !Number.isFinite(data.money)) return null;
    if (!Array.isArray(data.cats) || data.cats.length === 0) return null;
    if (!data.cats.every(isValidCat)) return null;

    const nextCatId =
      typeof data.nextCatId === "number" && Number.isFinite(data.nextCatId)
        ? data.nextCatId
        : data.cats.length;
    const savedAt =
      typeof data.savedAt === "number" && Number.isFinite(data.savedAt)
        ? data.savedAt
        : Date.now();

    const ingredientsOwned = Array.isArray(data.ingredients)
      ? data.ingredients.filter(
          (v): v is string => typeof v === "string" && ingredient(v) !== undefined,
        )
      : [];

    return {
      money: Math.max(0, data.money),
      cats: data.cats,
      nextCatId,
      savedAt,
      upgrades: sanitizeUpgrades(data.upgrades),
      customisation: sanitizeCustomisation(data.customisation),
      placements: sanitizePlacements(data.placements),
      player: sanitizePlayer(data.player),
      purchased: Array.isArray(data.purchased)
        ? data.purchased.filter((v): v is string => typeof v === "string" && shopItem(v) !== undefined)
        : [],
      owned: Array.isArray(data.owned) ? data.owned.filter((v) => typeof v === "string") : [],
      xp: typeof data.xp === "number" && Number.isFinite(data.xp) ? Math.max(0, data.xp) : 0,
      drinks: Array.isArray(data.drinks)
        ? [
            STARTER_DRINK_ID,
            ...data.drinks.filter(
              (v): v is string =>
                typeof v === "string" && v !== STARTER_DRINK_ID && baseDrink(v) !== undefined,
            ),
          ]
        : [STARTER_DRINK_ID],
      ingredients: ingredientsOwned,
      customDrinks: sanitizeBlends(data.customDrinks, ingredientsOwned),
      sales:
        typeof data.sales === "object" && data.sales !== null
          ? Object.fromEntries(
              Object.entries(data.sales as Record<string, unknown>).filter(
                (entry): entry is [string, number] =>
                  typeof entry[1] === "number" && Number.isFinite(entry[1]) && entry[1] >= 0,
              ),
            )
          : {},
      nextDrinkId:
        typeof data.nextDrinkId === "number" && Number.isFinite(data.nextDrinkId)
          ? Math.max(1, Math.floor(data.nextDrinkId))
          : 1,
      // Home is always owned, and only tiles the rules still allow survive —
      // shrinking `MAX_TILE_INDEX` must not leave floor stranded off the map.
      instances: sanitizeInstances(data.instances),
      nextInstanceId:
        typeof data.nextInstanceId === "number" && Number.isFinite(data.nextInstanceId)
          ? Math.max(1, Math.floor(data.nextInstanceId))
          : 1,
      windows: Array.isArray(data.windows)
        ? data.windows.filter((v): v is string => typeof v === "string")
        : [HOME_WINDOW],
      backdropsOwned: Array.isArray(data.backdropsOwned)
        ? data.backdropsOwned.filter((v): v is string => typeof v === "string")
        : [],
      tiles: ownedTiles(
        Array.isArray(data.tiles) ? data.tiles.filter((t): t is string => typeof t === "string") : [],
      ).map(tileKey),
    };
  } catch {
    return null;
  }
}

function persist(state: GameState): void {
  const data: SaveDataCurrent = {
    version: SAVE_VERSION,
    money: state.money,
    nextCatId: state.nextCatId,
    cats: state.cats,
    savedAt: Date.now(),
    upgrades: state.upgrades,
    customisation: state.customisation,
    placements: state.placements,
    purchased: state.purchased,
    player: state.player,
    owned: state.owned,
    xp: state.xp,
    drinks: state.drinks,
    ingredients: state.ingredients,
    customDrinks: state.customDrinks,
    sales: state.sales,
    nextDrinkId: state.nextDrinkId,
    tiles: state.tiles,
    backdropsOwned: state.backdropsOwned,
    windows: state.windows,
    instances: state.instances,
    nextInstanceId: state.nextInstanceId,
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Storage full/unavailable — nothing sensible to do mid-game; next write retries.
  }
}

/**
 * How often a dirty store is flushed to storage. This is the worst case a
 * player can lose to a force-quit, so it wants to be short; it is not a
 * per-frame cost, because the write only happens when something changed.
 */
export const AUTOSAVE_INTERVAL_MS = 2000;

/**
 * Autosave silently (§6): flushed on a fixed interval whenever the store is
 * dirty, and immediately when the page hides.
 *
 * **This is a throttle, and it must never go back to being a debounce.** It
 * was one until 2026-08-05, and it meant the periodic autosave never ran a
 * single time in the history of the project: `tick()` calls `set()` on every
 * animation frame, so a `clearTimeout`/`setTimeout` pair was rearmed every
 * ~16 ms and its 800 ms delay could not elapse. The bug was invisible in a
 * browser, where closing the tab fires `pagehide` and saves on the way out,
 * and total on iOS, where backgrounding an *app* does not reliably fire the
 * page lifecycle events a closing *tab* does — so nothing was ever written and
 * every launch was a fresh game.
 *
 * The general rule: never debounce a signal that fires every frame. Debounce
 * waits for quiet, and a running game never goes quiet.
 */
export function initAutosave(store: StoreApi<GameState>): void {
  let dirty = false;

  store.subscribe(() => {
    dirty = true;
  });

  const flush = () => {
    if (!dirty) return;
    persist(store.getState());
    dirty = false;
  };

  window.setInterval(flush, AUTOSAVE_INTERVAL_MS);

  // Belt and braces on top of the interval: these fire in a browser and cost
  // nothing where they don't. They are no longer the only thing saving.
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}
