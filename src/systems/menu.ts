import {
  BASE_DRINKS,
  STARTER_DRINK_ID,
  baseDrink,
  blendPay,
  type CustomDrink,
} from "@/data/drinks";

/**
 * The café's menu, as the economy sees it (§8). Pure — no clocks, no storage.
 *
 * **The multiplier is the menu's *average*, not its total**, and that single
 * choice is what stops this becoming a checklist. Adding a latte lifts the
 * café because the average cup is worth more; adding your ninth blend of plain
 * filter coffee drags it back down. So the question the menu asks is "what
 * does this café serve?" rather than "have you bought everything yet?", which
 * is the difference between a menu and an upgrade tree.
 */

export interface MenuItem {
  id: string;
  name: string;
  /** What one cup is worth, relative to filter coffee. */
  pay: number;
  /** True for a blend the player invented. */
  own: boolean;
}

/**
 * Everything currently being served: the classics that have been unlocked,
 * plus the player's own blends.
 *
 * Filter coffee is always present even if a save has somehow lost it — a café
 * with an empty menu would divide by zero and, worse, would be a café that
 * sells nothing.
 */
export function menuItems(unlocked: string[], blends: CustomDrink[]): MenuItem[] {
  const owned = new Set([STARTER_DRINK_ID, ...unlocked]);
  const items: MenuItem[] = BASE_DRINKS.filter((d) => owned.has(d.id)).map((d) => ({
    id: d.id,
    name: d.name,
    pay: d.pay,
    own: false,
  }));

  for (const blend of blends) {
    // A blend whose base was somehow never unlocked still pours; the base is
    // only there to say what it is made of.
    if (!baseDrink(blend.base)) continue;
    items.push({ id: blend.id, name: blend.name, pay: blendPay(blend), own: true });
  }
  return items;
}

/** The pay multiplier the menu contributes: the average cup on it. */
export function menuPayMultiplier(items: MenuItem[]): number {
  if (items.length === 0) return 1;
  return items.reduce((sum, item) => sum + item.pay, 0) / items.length;
}

/**
 * Which drink a guest orders.
 *
 * Weighted by pay, mildly — a nicer drink is a bit more tempting, which is why
 * a café that invests in its menu also *looks* like it sells nicer things on
 * the analytics page. `roll` is 0–1 so this stays pure and testable.
 */
export function pickOrder(items: MenuItem[], roll: number): MenuItem | null {
  if (items.length === 0) return null;
  const weights = items.map((item) => Math.max(0.1, item.pay));
  const total = weights.reduce((a, b) => a + b, 0);
  let target = Math.min(0.999999, Math.max(0, roll)) * total;
  for (let i = 0; i < items.length; i++) {
    target -= weights[i];
    if (target < 0) return items[i];
  }
  return items[items.length - 1];
}

export interface SalesRow {
  id: string;
  name: string;
  cups: number;
  /** 0–1 against the best seller, for a bar's width. */
  share: number;
  own: boolean;
}

/**
 * The menu ranked by cups sold, best first.
 *
 * Items that have never sold are included — a menu row with a zero on it is
 * information ("nobody wants the mocha"), and hiding it would make the page
 * look like the drink does not exist.
 */
export function salesRanking(items: MenuItem[], sales: Record<string, number>): SalesRow[] {
  const rows = items.map((item) => ({
    id: item.id,
    name: item.name,
    cups: Math.max(0, Math.floor(sales[item.id] ?? 0)),
    share: 0,
    own: item.own,
  }));
  const best = rows.reduce((max, row) => Math.max(max, row.cups), 0);
  for (const row of rows) row.share = best === 0 ? 0 : row.cups / best;
  return rows.sort((a, b) => b.cups - a.cups || a.name.localeCompare(b.name));
}
