import * as THREE from "three";
import { beds, catPositions } from "@/data/beds";
import type { GameState } from "@/state/store";

/**
 * Where each cat sits, in the order `CatManager` expects.
 *
 * **Cats live in beds now** (`data/beds.ts`), which replaces the old
 * arrangement entirely: authored "cat spots" on the climber and the low table,
 * plus a scatter of floor positions scored by clearance. That existed because
 * cats had nowhere *defined* to be and the café could sell more cats than it
 * could show. With a bed per cat the question answers itself, and the answer
 * is something the player placed.
 *
 * Order matters and is not obvious: `CatManager.setSpots` takes a list and
 * assigns cats to it by index, so this returns positions **in the same order
 * as `state.cats`** rather than in bed order. Sorting by bed would silently
 * shuffle which cat sits where every time one was bought.
 */
export function catHomes(
  state: Pick<GameState, "cats" | "placements" | "instances">,
): THREE.Vector3[] {
  const all = beds(state.placements, state.instances);
  const homes = catPositions(state.cats, all);
  // **One entry per cat, always.** `CatManager` assigns cats to spots by
  // *index*, so dropping an entry for a homeless cat does not hide that cat —
  // it shifts every cat after it into somebody else's bed. Falling back to the
  // first bed stacks two cats visibly, which is a far better failure: it looks
  // like a problem instead of quietly rearranging the café.
  const fallback = all[0];
  return state.cats.map((cat) => {
    const bed = homes.get(cat.id) ?? fallback;
    return bed ? new THREE.Vector3(bed.x, bed.y, bed.z) : new THREE.Vector3();
  });
}
