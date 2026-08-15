import { CAFE_LAYOUT, placedAt, type Placements } from "@/data/cafe-layout";
import { chosenAssets, type Customisation } from "@/data/customisation";

/**
 * Cat beds, and the cats that live in them.
 *
 * Ellis, 2026-08-20: *"the number of cats should be dependent on number of cat
 * beds placed down and that is obviously dependent on amount of space in cafe.
 * the cats when adopted u should select out of any spare free cat beds placed
 * and then it lives there and spawns there."*
 *
 * **This is the best structural idea the game has had in a while**, and it is
 * worth saying why rather than just building it. Until now three separate
 * things were floating free of each other: a flat cap of five cats, a shop full
 * of furniture with no consequence beyond appeal, and floor space with nothing
 * to spend it on. This ties all three into one chain — *floor lets you place
 * beds, beds let you take in cats* — so every purchase in the game now points
 * at the thing the game is about. It also retires the floor-scatter fallback
 * added on 2026-08-18, which existed only because cats had nowhere defined to
 * be.
 *
 * ## What a bed is
 *
 * Two kinds, deliberately unified behind one type:
 *
 * - **The authored bed** that comes with the café, which lives in
 *   `cafe-layout.ts` and can be recoloured with the `catBed` colourway.
 * - **Bought beds**, which are *instances* — furniture the player created
 *   rather than furniture the layout authored. They are the first of those in
 *   the game (see `Instance` in `state/store.ts`), and the reason the shop had
 *   to learn to sell the same thing twice.
 *
 * A cat holds the id of its bed. Everything else — where it sits, whether the
 * café is full, whether adoption can offer you a choice — is derived from that.
 */

/** Where one cat lives. */
export interface Bed {
  /** Layout id for the authored bed, instance id for a bought one. */
  id: string;
  x: number;
  z: number;
  /** Height of the cushion the cat sits on. */
  y: number;
}

/** The catalogue id of the repeatable cat bed. */
export const CAT_BED_ITEM = "cat-bed-extra";

/**
 * What another bed costs.
 *
 * Rises per bed, like adopting does, because a bed *is* the right to adopt —
 * pricing them flat would make the cat cost curve meaningless.
 */
export function bedCost(bedsOwned: number): number {
  return Math.round(140 * Math.pow(1.55, Math.max(0, bedsOwned - 1)));
}

/**
 * Every bed in the café: the authored one, then whatever has been bought.
 *
 * `instances` is passed as plain data so this stays free of the store.
 */
export function beds(
  placements: Placements,
  instances: { id: string; item: string; x: number; z: number }[],
): Bed[] {
  const out: Bed[] = [];

  for (const item of CAFE_LAYOUT) {
    if (item.slot !== "catBed" || !item.id) continue;
    const at = placedAt(item, placements);
    out.push({ id: item.id, x: at.x, z: at.z, y: item.catY ?? 0.1 });
  }

  for (const instance of instances) {
    if (instance.item !== CAT_BED_ITEM) continue;
    out.push({ id: instance.id, x: instance.x, z: instance.z, y: 0.1 });
  }
  return out;
}

/** Beds with nobody in them. */
export function freeBeds(all: Bed[], cats: { bedId?: string }[]): Bed[] {
  const taken = new Set(cats.map((c) => c.bedId).filter(Boolean));
  return all.filter((bed) => !taken.has(bed.id));
}

/**
 * Where each cat sits, in the order the cats are given.
 *
 * A cat whose bed has been sold falls back to the first free bed rather than
 * vanishing — **losing a cat is never acceptable** (§8), and a bed can
 * disappear from under one if the player sells furniture.
 */
export function catPositions(
  cats: { id: string; bedId?: string }[],
  all: Bed[],
): Map<string, Bed> {
  const byId = new Map(all.map((bed) => [bed.id, bed]));
  const out = new Map<string, Bed>();
  const claimed = new Set<string>();

  for (const cat of cats) {
    const home = cat.bedId ? byId.get(cat.bedId) : undefined;
    if (home && !claimed.has(home.id)) {
      claimed.add(home.id);
      out.set(cat.id, home);
    }
  }
  for (const cat of cats) {
    if (out.has(cat.id)) continue;
    const spare = all.find((bed) => !claimed.has(bed.id));
    if (!spare) continue;
    claimed.add(spare.id);
    out.set(cat.id, spare);
  }
  return out;
}

/** The asset a bought bed is built from — follows the chosen colourway. */
export function bedAsset(choice: Customisation): string {
  return chosenAssets(choice).catBed;
}
