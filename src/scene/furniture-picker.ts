import * as THREE from "three";
import { CAFE_LAYOUT } from "@/data/cafe-layout";
import { SLOT_CATEGORY, categoryById, type CustomisationCategory } from "@/data/customisation";
import type { FurnitureTag } from "@/scene/cafe-room";
import { shopItem } from "@/data/shop";

/**
 * Work out which piece of café the player just touched (§8 "The café editor").
 *
 * Two things make this less trivial than a raycast:
 *
 * 1. **The raycaster returns a leaf mesh**, several levels below the object the
 *    layout placed — so every hit has to walk *up* to the nearest ancestor
 *    carrying a `furniture` tag.
 * 2. **The nearest hit is often not the interesting one.** The floor and the
 *    walls span the whole room, so a ray aimed at the rug also strikes the
 *    floor beneath it. Hits arrive sorted by distance, and the first *editable*
 *    one wins — which naturally prefers the small thing sitting on the big one.
 */

export interface PickedFurniture {
  tag: FurnitureTag;
  /** The placed object, for animating a squash while it's held. */
  object: THREE.Object3D;
  /** Centre of its bounding box in world space — where to anchor UI. */
  anchor: THREE.Vector3;
  /** The colourway menu this piece belongs to, if it has one. */
  category: CustomisationCategory | null;
}

const raycaster = new THREE.Raycaster();

/** Room-sized surfaces, which only win a pick when nothing else is in the way. */
const ARCHITECTURE: ReadonlySet<string> = new Set([
  "floor",
  "floorStep",
  "wallPlain",
  "wallWindow",
]);

function taggedAncestor(object: THREE.Object3D): THREE.Object3D | null {
  let node: THREE.Object3D | null = object;
  while (node) {
    if (node.userData?.furniture) return node;
    node = node.parent;
  }
  return null;
}

function describe(object: THREE.Object3D): PickedFurniture {
  const tag = object.userData.furniture as FurnitureTag;
  const box = new THREE.Box3().setFromObject(object);
  const category = tag.slot ? (categoryById(SLOT_CATEGORY[tag.slot]) ?? null) : null;
  return { tag, object, anchor: box.getCenter(new THREE.Vector3()), category };
}

/**
 * The piece under `ndc`, or null.
 *
 * `editableOnly` is what the hold gesture uses: the progress ring appearing at
 * all is the affordance that says "this one can be changed", so it must not
 * appear over a cupcake. Passing false picks anything, which is what a future
 * move/sell interaction will want.
 */
export function pickFurniture(
  ndc: THREE.Vector2,
  camera: THREE.Camera,
  root: THREE.Object3D,
  editableOnly = true,
): PickedFurniture | null {
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(root, true);

  let architecture: PickedFurniture | null = null;
  let fallback: PickedFurniture | null = null;

  for (const hit of hits) {
    const owner = taggedAncestor(hit.object);
    if (!owner) continue;
    const found = describe(owner);
    if (!editableOnly) return found;

    // **Editable means "has colourways *or* can be moved".**
    //
    // It used to mean only the first, which quietly excluded every piece the
    // player put down themselves: an instance (a second cat bed, a copy of a
    // plant) carries no colourway `slot`, so `describe` gave it no category and
    // the hold gesture skipped straight past it. Ellis: *"i cant tap+hold to
    // get move menu up on any of the new objects i placed."*
    //
    // The menu offers colourways *and* "move it", so a movable piece with no
    // colourways still has something to open — and being unable to pick up the
    // thing you just put down is the worse failure by far.
    if (found.category || found.tag.movable) {
      // **Architecture is last resort.** The floor and walls span the whole
      // room, so they are under almost every ray — before this, holding
      // anywhere "just goes to the wall floor one every time" (Ellis,
      // 2026-08-06) and the rug sitting on the floor was nearly unreachable.
      // A prop beats the surface it stands on, whatever the depth order says.
      if (ARCHITECTURE.has(found.tag.slot ?? "")) {
        architecture ??= found;
        continue;
      }
      return found;
    }
    // Remember the first thing we hit even if it isn't editable, so callers
    // that want "something was touched" can still tell.
    fallback ??= found;
  }
  return editableOnly ? architecture : (architecture ?? fallback);
}

/**
 * The placed object for a given layout id, ready to be moved.
 *
 * This is how **buying enters placement mode**: the shop knows a catalogue id,
 * the room knows meshes, and this bridges them without a raycast — there is no
 * finger on the screen at the moment a purchase completes.
 */
export function findPlaced(root: THREE.Object3D, id: string): PickedFurniture | null {
  let found: PickedFurniture | null = null;
  root.traverse((object) => {
    if (found) return;
    const tag = object.userData?.furniture as FurnitureTag | undefined;
    if (tag?.id === id) found = describe(object);
  });
  return found;
}

/**
 * The pack's own name, tidied for a label: `Deco_CoffeePack_Matcha` reads as
 * "coffee pack matcha" rather than being shown raw.
 */
export function tidyAssetName(asset: string): string {
  return asset
    .replace(/^(Deco|Food|Cat)_/, "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
}

/**
 * Human-readable name for a piece, for a heading.
 *
 * **The catalogue first.** Tidying the asset name is a last resort and it is
 * not good enough on its own: `Cat_Bed_A_Cream` comes out as "bed a cream",
 * which is what a player saw when they hovered the bed they had just bought.
 * The shop and the customisation categories both know real names; the pack's
 * internal naming is only a fallback for props nobody can buy.
 */
export function furnitureName(tag: FurnitureTag): string {
  if (tag.name) return tag.name.toLowerCase();
  const category = tag.slot ? categoryById(SLOT_CATEGORY[tag.slot]) : undefined;
  if (category) return category.name.toLowerCase();
  const item = CAFE_LAYOUT[tag.index];
  const owner = item?.shopItem ? shopItem(item.shopItem) : undefined;
  if (owner) return owner.name.toLowerCase();
  return tidyAssetName(item?.asset ?? tag.asset);
}
