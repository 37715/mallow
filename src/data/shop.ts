import type { UnlockCondition, Progress } from "@/data/customisation";

/**
 * The shop (§8 "The café editor", step 5) — the café starts nearly bare and
 * the player buys it back, piece by piece.
 *
 * **The trick that makes this cheap: nothing here is new geometry.** Every
 * entry names pieces that already exist in `data/cafe-layout.ts`, at their
 * authored positions, hidden until bought (`Placement.shopItem`). So a
 * fully-stocked café is *exactly* the reference render the room was rebuilt
 * from — the diorama is the destination rather than the starting point — and
 * a player who buys everything ends up with a café that was composed by hand
 * rather than one that merely passes the placement validator.
 *
 * It also means adding stock is a row here plus a `shopItem` tag there, with
 * no placement work at all, which is the property §8 wanted from the editor:
 * new art becomes content automatically.
 *
 * Once bought, a piece can be dragged like anything else movable.
 */

export interface ShopCategory {
  id: string;
  name: string;
  hint: string;
}

export const SHOP_CATEGORIES: ShopCategory[] = [
  { id: "comfort", name: "Comfort", hint: "Places to sit, sprawl and nap." },
  { id: "cats", name: "For the cats", hint: "Furniture that is not for you." },
  { id: "counter", name: "The counter", hint: "What you actually sell." },
  { id: "decor", name: "Decoration", hint: "The bits that make it yours." },
  { id: "outside", name: "Outside", hint: "What the street sees first." },
];

export interface ShopItem {
  id: string;
  name: string;
  /** One line, in the player's terms. */
  blurb: string;
  category: string;
  price: number;
  /**
   * Café appeal this piece adds once it's in the room — guests arrive sooner
   * and tip more (§8 "Economy loop").
   *
   * **This is where appeal comes from now.** It used to be a "cosy touches"
   * upgrade: an abstract level you bought from a menu that made the room
   * lovelier without you ever choosing anything. Ellis, 2026-08-10: *"the
   * little touches cafe upgrade seems to be stupid and takes away from the
   * cafe builder aspect we provide from the shop option."* Right — a game
   * about building a café should pay you for the café you built, not for a
   * number beside the word "décor". So the lever moved onto the furniture,
   * where the player can see it.
   */
  appeal: number;
  /**
   * The layout id to drop into placement mode when this is bought.
   *
   * Only floor-standing pieces have one. A wall shelf or a tray of cupcakes
   * has an authored home on the wall or the counter and no meaningful "put it
   * here" — offering to place those would be offering a control that cannot
   * work. Give a piece an `id` + `movable` in `cafe-layout.ts` first, then
   * name it here.
   */
  place?: string;
  unlock: UnlockCondition | null;
  /**
   * The asset shown spinning in the shop. For a group (the side table and its
   * coffee, the shelves and their jars) this is the *hero* piece — the one
   * that reads at a glance. The rest still arrive with it.
   */
  preview: string;
  /**
   * The asset a *second* one is built from.
   *
   * Ellis, 2026-08-25: *"should be able to buy multiple of furniture and stuff
   * too and it track accurately how many of each i have."* The first purchase
   * still reveals the authored placement, because that is what makes a
   * furnished café look composed rather than assembled. Every one after it is
   * an **instance** — the mechanism the cat bed introduced — and an instance is
   * a single mesh with its own position, so a group entry (the side table and
   * its coffee, the shelf and its jars) duplicates as its hero piece alone.
   *
   * Defaults to `preview`, which is already defined as the hero piece.
   */
  copy?: string;
  /**
   * Hangs on a wall rather than standing on the floor.
   *
   * Wall pieces place against a wall run at their own height instead of on the
   * grid, and turn to face into the room. See `systems/placement.ts`.
   */
  wall?: boolean;
  /** Height a wall piece hangs at, in world units. */
  wallY?: number;
}

const catsAtLeast = (n: number): UnlockCondition => ({
  label: `Adopt ${n} cats`,
  met: (p: Progress) => p.cats.length >= n,
});

/**
 * Prices sit inside §8's readable money (early 0–500, mid 500–5k). The first
 * few are deliberately cheap: the café should stop looking empty within the
 * first session, or "bare bones" reads as "unfinished" rather than as "yours".
 *
 * Appeal roughly tracks price, with a thumb on the scale for pieces that earn
 * it in the fiction — the pavement sign is cheap and pulls people in, because
 * that is what a pavement sign is for. A fully furnished café is worth about
 * +4.3 appeal, which is deliberately close to what the retired "cosy touches"
 * upgrade paid at max level, so the economy lands where `npm run balance`
 * already says it should.
 */
export const SHOP_ITEMS: ShopItem[] = [
  // --- Comfort -------------------------------------------------------------
  // **£35, and that number is load-bearing.** Emptying the starter café means
  // a new one has *no seats*, so it earns nothing at all until the first one is
  // bought — and a café that cannot afford a seat can never earn its way to
  // one. The cheapest seat must therefore stay under `startingMoney` (£40).
  // Check that still holds before repricing either.
  //
  // **The armchair is bought now, not given.** Ellis: *"remove even the chair
  // at first. there should be nothing so the user has room to place stuff."*
  // It is also what the walkthrough has you buy and put down, so it needs a
  // page — see FIRST_FURNITURE in `systems/tutorial.ts`.
  { id: "armchair", name: "Armchair", blurb: "The good seat, by the window.", category: "comfort", price: 35, appeal: 0.5, place: "armchair", unlock: null, preview: "Sofa_Single_Cream" },
  { id: "bar-stools", name: "Bar stools", blurb: "Two, pulled up to the counter.", category: "comfort", price: 70, appeal: 0.3, place: "stool-a", unlock: null, preview: "Chair_Bar_A" },
  { id: "low-table", name: "Low table", blurb: "Something to put a cup on.", category: "comfort", price: 60, appeal: 0.3, place: "low-table", unlock: null, preview: "Table_Short" },
  { id: "side-table", name: "Side table", blurb: "Comes with a coffee already on it.", category: "comfort", price: 140, appeal: 0.4, place: "side-table", unlock: null, preview: "Table_Tall" },
  /**
   * The two floor cushions the café used to start with.
   *
   * Ellis, 2026-08-25: *"when i first start cafe get rid of those pillows on
   * floor just take up space."* Right — a bare café should look sparse and
   * *tidy*, and two big cushions on open boards read as clutter before there
   * is anything for them to gather round. They are the first **seats** in the
   * shop, which is a change the economy had to grow into: seats used to be a
   * fixed count of five, so a café now opens with three and buys its way back
   * up. See `availableSeats`.
   */
  { id: "floor-cushions", name: "Floor cushions", blurb: "Two, for sitting low.", category: "comfort", price: 55, appeal: 0.3, place: "floor-cushion-a", unlock: null, preview: "Cushion_Red" },
  { id: "window-cushions", name: "Window seat", blurb: "Cushions along the sunny sill.", category: "comfort", price: 260, appeal: 0.6, unlock: catsAtLeast(2), preview: "Cushion_Red" },

  // --- For the cats --------------------------------------------------------
  { id: "climber", name: "Cat climber", blurb: "High up, where they prefer to be.", category: "cats", price: 180, appeal: 0.5, place: "climber", unlock: null, preview: "Cat_Climber_A_Cream" },

  // --- The counter ---------------------------------------------------------
  { id: "cake-display", name: "Cake display", blurb: "Cupcakes under glass.", category: "counter", price: 120, appeal: 0.4, unlock: null, preview: "Cake_Display_A" },
  { id: "counter-treats", name: "Milkshakes & cakes", blurb: "Something to look at while you queue.", category: "counter", price: 90, appeal: 0.3, unlock: null, preview: "Food_Milkshake_Strawberry" },

  // --- Decoration ----------------------------------------------------------
  { id: "blackboard", name: "Menu board", blurb: "Chalked up behind the counter.", category: "decor", price: 80, appeal: 0.3, unlock: null, preview: "Blackboard_Large", wall: true, wallY: 2.373 },
  { id: "shelves", name: "Wall shelves", blurb: "Beans, cups and a trailing plant.", category: "decor", price: 150, appeal: 0.4, unlock: null, preview: "Shelf_A_Plank", wall: true, wallY: 1.857 },
  { id: "plants", name: "Plants", blurb: "Green, and quietly thriving.", category: "decor", price: 110, appeal: 0.4, unlock: catsAtLeast(2), preview: "Plant_Cactus_A_1" },

  // --- Outside -------------------------------------------------------------
  { id: "a-frame", name: "Pavement sign", blurb: "Tells the street you're open.", category: "outside", price: 70, appeal: 0.5, unlock: null, preview: "Blackboard_Small" },
  { id: "stray-cushion", name: "Doorstep cushion", blurb: "Someone always sits out here.", category: "outside", price: 45, appeal: 0.2, unlock: null, preview: "Cushion_Orange" },
];

/**
 * Appeal contributed by everything the player has actually bought.
 *
 * A second copy of a piece counts for **half** what the first did. Two plants
 * are lovelier than one; ten are not ten times lovelier, and without the taper
 * the cheapest item in the shop becomes an appeal vending machine.
 */
export function furnitureAppeal(purchased: string[], copies: string[] = []): number {
  let total = 0;
  for (const id of purchased) total += shopItem(id)?.appeal ?? 0;
  for (const id of copies) total += (shopItem(id)?.appeal ?? 0) / 2;
  return total;
}

/** The asset one more of this item is built from. */
export function copyAsset(item: ShopItem): string {
  return item.copy ?? item.preview;
}

/**
 * What the next copy costs.
 *
 * Rises per copy, on the same curve the cat bed introduced, so a café full of
 * one cheap thing is a decision rather than the obvious play.
 */
export function copyPrice(item: ShopItem, owned: number): number {
  return Math.round(item.price * Math.pow(1.45, Math.max(0, owned)));
}

export function shopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((i) => i.id === id);
}

export function itemsInCategory(categoryId: string): ShopItem[] {
  return SHOP_ITEMS.filter((i) => i.category === categoryId);
}
