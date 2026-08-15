/**
 * The menu — classic coffees, unlockable ingredients, and blends you invent.
 *
 * Ellis, 2026-08-14: *"in the cafe option i should be able to unlock different
 * coffees like the typical ones in a coffee shop, starting with only the basic
 * black coffee with milk … then custom coffees where you can unlock (for coins
 * + lvl requirements) different ingredients like honey vanilla and all sorts
 * of interesting ones … and then make ur own and name it and have it on the
 * menu and then you can see whats selling the most."*
 *
 * **Why this is the right shape for the game.** Everything the café sells so
 * far is bought once and looked at. A menu is the first thing the player
 * *authors*: naming a blend is the same hook as naming a cat (§8 — the naming
 * is the attachment), and it is the first content the game will have that the
 * player made rather than chose from a list.
 *
 * Three tiers, deliberately paced differently:
 *
 * 1. **Classics** — cheap, quick, mostly a tutorial in the menu existing at
 *    all. You start with filter coffee and the rest arrive within the first
 *    session or two.
 * 2. **Ingredients** — the collection. Coins *and* a level, so they arrive
 *    steadily over a long time and give the XP ring something to be for. This
 *    is the tier that should feel like a cabinet slowly filling.
 * 3. **Blends** — free, and limited by imagination rather than money. Once you
 *    own the ingredients, inventing a drink costs nothing: charging for the
 *    creative act would be the one genuinely mean thing in the game.
 *
 * Everything here is data. A new coffee is a row.
 */

export interface BaseDrink {
  id: string;
  name: string;
  /** One line, in the player's terms — what it is, not what it does. */
  blurb: string;
  /** Key into `ui/icons.ts`. */
  icon: string;
  /** Coins to add it to the menu. The first is free and already yours. */
  price: number;
  /** Level required before it can be bought at all. */
  level: number;
  /**
   * What a cup of this is worth, relative to plain filter coffee.
   *
   * The café's pay multiplier is the *average* over everything on the menu
   * (`systems/menu.ts`), which is the rule that makes the whole feature honest:
   * a wider menu is worth more, but padding it with the cheapest thing you own
   * drags the average down. You are choosing what your café is, not stacking
   * bonuses.
   */
  pay: number;
}

export interface Ingredient {
  id: string;
  name: string;
  /** What it tastes of. Flavour text, and it is the point. */
  blurb: string;
  icon: string;
  price: number;
  level: number;
  /** Added to a blend's pay multiplier. Small — the blend is the reward. */
  pay: number;
}

/** Plain filter coffee. Always on the menu; never purchasable, never removable. */
export const STARTER_DRINK_ID = "filter";

export const BASE_DRINKS: BaseDrink[] = [
  {
    id: "filter",
    name: "filter coffee",
    blurb: "black, with a splash of milk if you like.",
    icon: "mug",
    price: 0,
    level: 1,
    pay: 1,
  },
  {
    id: "flat-white",
    name: "flat white",
    blurb: "a double shot under velvet milk.",
    icon: "mug",
    price: 90,
    level: 1,
    pay: 1.14,
  },
  {
    id: "cappuccino",
    name: "cappuccino",
    blurb: "a proper hat of foam, dusted on top.",
    icon: "cupHot",
    price: 160,
    level: 2,
    pay: 1.22,
  },
  {
    id: "latte",
    name: "latte",
    blurb: "tall, milky and unhurried.",
    icon: "latteGlass",
    price: 240,
    level: 3,
    pay: 1.3,
  },
  {
    id: "mocha",
    name: "mocha",
    blurb: "coffee that has given up pretending it isn't pudding.",
    icon: "cocoa",
    price: 420,
    level: 4,
    pay: 1.42,
  },
  {
    id: "iced-latte",
    name: "iced latte",
    blurb: "for the one sunny week a year.",
    icon: "icedGlass",
    price: 620,
    level: 5,
    pay: 1.5,
  },
  {
    id: "matcha",
    name: "matcha latte",
    blurb: "grassy, gentle, and very green.",
    icon: "leaf",
    price: 880,
    level: 6,
    pay: 1.6,
  },
];

export const INGREDIENTS: Ingredient[] = [
  // **Two prices, not nine.** Ellis: *"make the first 4 ingredients all the
  // same price and the other rarer ones all more expensive."* The old ladder
  // (70 → 940) implied a ranking that isn't real — an add-in is a *flavour*,
  // and pricing vanilla under cinnamon says one is better rather than
  // different. Two tiers keeps the sense of rarer things being dearer while
  // leaving the choice inside each tier a matter of taste. The `level` gate is
  // what still paces them out.
  { id: "honey", name: "honey", blurb: "spooned in, slow off the dipper.", icon: "honey", price: 90, level: 1, pay: 0.08 },
  { id: "vanilla", name: "vanilla", blurb: "one split pod, scraped.", icon: "vanilla", price: 90, level: 2, pay: 0.1 },
  { id: "cinnamon", name: "cinnamon", blurb: "a stick to stir it with.", icon: "cinnamon", price: 90, level: 2, pay: 0.11 },
  { id: "oat", name: "oat milk", blurb: "steams beautifully. don't argue.", icon: "oat", price: 90, level: 3, pay: 0.12 },
  { id: "caramel", name: "salted caramel", blurb: "a spiral over the foam.", icon: "caramel", price: 320, level: 4, pay: 0.15 },
  { id: "hazelnut", name: "hazelnut", blurb: "toasted, then ground fine.", icon: "hazelnut", price: 320, level: 4, pay: 0.16 },
  { id: "cardamom", name: "cardamom", blurb: "three pods, cracked.", icon: "cardamom", price: 320, level: 5, pay: 0.18 },
  { id: "cocoaDust", name: "cocoa dust", blurb: "shaken through a stencil.", icon: "cocoa", price: 320, level: 6, pay: 0.2 },
  { id: "mint", name: "garden mint", blurb: "picked from the windowsill.", icon: "mint", price: 320, level: 7, pay: 0.22 },
];

/** A drink the player invented: a base, up to two add-ins, and a name. */
export interface CustomDrink {
  id: string;
  /** The player's own words — never case-transformed (§9). */
  name: string;
  base: string;
  ingredients: string[];
}

/** How many add-ins one blend may carry. Two keeps every blend describable. */
export const MAX_BLEND_INGREDIENTS = 2;
/** How many blends may be on the menu at once. */
export const MAX_CUSTOM_DRINKS = 4;

/**
 * Appeal from the menu: every coffee and add-in unlocked, and every blend
 * invented, makes the café a nicer place to be.
 *
 * **Everything that costs money raises appeal** (Ellis, 2026-08-19), and the
 * rule is worth stating plainly because it decides how future content is
 * priced: a purchase that only moved a hidden multiplier — the way the retired
 * "cosy touches" upgrade did — is a purchase the player cannot feel. Appeal is
 * the one number the whole café shares, so spending anywhere should move it.
 *
 * Small per item, deliberately. A menu is a slow accumulation of many little
 * decisions; the furniture is where the big jumps live.
 */
export function menuAppeal(
  drinks: string[],
  ingredients: string[],
  blends: CustomDrink[],
): number {
  let total = 0;
  for (const id of drinks) if (id !== STARTER_DRINK_ID && baseDrink(id)) total += 0.25;
  for (const id of ingredients) if (ingredient(id)) total += 0.2;
  // A blend is worth more than its parts: it is the thing you made.
  total += blends.length * 0.4;
  return total;
}

export function baseDrink(id: string): BaseDrink | undefined {
  return BASE_DRINKS.find((d) => d.id === id);
}

export function ingredient(id: string): Ingredient | undefined {
  return INGREDIENTS.find((i) => i.id === id);
}

/** What one cup of a blend is worth: its base, plus each add-in. */
export function blendPay(drink: CustomDrink): number {
  const base = baseDrink(drink.base)?.pay ?? 1;
  let bonus = 0;
  for (const id of drink.ingredients) bonus += ingredient(id)?.pay ?? 0;
  return base + bonus;
}
