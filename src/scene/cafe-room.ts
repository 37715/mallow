import * as THREE from "three";
import {
  CAFE_LAYOUT,
  placedAt,
  placedRotation,
  type Placement,
  type Placements,
} from "@/data/cafe-layout";
import {
  chosenAssets,
  DEFAULT_CUSTOMISATION,
  hasWindowSill,
  type Customisation,
  type CustomisableSlot,
} from "@/data/customisation";
import { loadCafeAssets, type CafeAssets } from "@/scene/asset-library";
import { HOME_TILE, expansionPlacements } from "@/scene/cafe-tiles";
import { HOME_WINDOW, growth } from "@/data/expansion";
import type { TileKey } from "@/data/expansion";
import { CAT_BED_ITEM, bedAsset } from "@/data/beds";
import { copyAsset, shopItem } from "@/data/shop";
import type { Instance } from "@/state/store";

/**
 * Builds the café from the real asset pack (§9). Replaces the procedural
 * greybox room entirely.
 *
 * Everything shares one material from the pack's atlas, so the whole room —
 * floor, walls, counter, furniture, décor — costs a couple of draw calls.
 */

export interface BuiltRoom {
  group: THREE.Group;
  assets: CafeAssets;
  /** Anything the layout couldn't place, so a typo'd asset name is visible. */
  missing: string[];
}

/** The asset a placement resolves to, honouring the player's customisation. */
export function assetFor(item: Placement, choice: Customisation): string {
  if (!item.slot) return item.asset;
  return chosenAssets(choice)[item.slot] ?? item.asset;
}

/**
 * Stamped onto every placed object so a raycast hit can be traced back to the
 * layout entry that produced it — the raycaster returns whatever leaf mesh it
 * struck, which is several levels below the thing the player thinks they
 * touched. `scene/furniture-picker.ts` walks up to find this.
 */
export interface FurnitureTag {
  /** Index into CAFE_LAYOUT. */
  index: number;
  slot?: CustomisableSlot;
  asset: string;
  /** Stable id, present only on movable pieces. */
  id?: string;
  movable: boolean;
  /** The mesh's own bounding size, for placement checks. */
  size?: THREE.Vector3;
  /** Hangs on a wall rather than standing on the floor. See `ShopItem.wall`. */
  wall?: boolean;
}

function place(
  assets: CafeAssets,
  item: Placement,
  choice: Customisation,
  placements: Placements,
  grown?: { x: number; z: number },
): THREE.Object3D | null {
  const name = assetFor(item, choice);
  const object = assets.create(name);
  if (!object) return null;
  // The player's position wins over the layout's for anything movable, and
  // the layout's own is carried by the floor's edge for anything pinned to it.
  const at = placedAt(item, placements, grown);
  object.position.set(at.x, item.y ?? 0, at.z);
  // Player rotation is *added* to the layout's own, so a piece authored at an
  // angle keeps it and "turn it 90°" means 90° from where it was.
  object.rotation.set(item.rotX ?? 0, placedRotation(item, placements), item.rotZ ?? 0);
  if (item.scale) object.scale.setScalar(item.scale);
  // Footprint-only scaling, for floor slabs — see `Placement.scaleXZ`.
  if (item.scaleXZ) object.scale.set(item.scaleXZ, 1, item.scaleXZ);

  // Floors and carpets only receive shadow; everything else casts too. Fewer
  // shadow casters is the cheapest shadow win there is (§13).
  if ((assets.get(name)?.size.y ?? 1) < 0.3) {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) child.castShadow = false;
    });
  }
  return object;
}

export async function buildCafeRoom(
  choice: Customisation = DEFAULT_CUSTOMISATION,
  placements: Placements = {},
  purchased: string[] = [],
  tiles: TileKey[] = [HOME_TILE],
  instances: Instance[] = [],
  windows: string[] = [HOME_WINDOW],
): Promise<BuiltRoom> {
  const assets = await loadCafeAssets();
  const group = new THREE.Group();
  group.name = "cafe";
  const missing: string[] = [];

  const sill = hasWindowSill(choice);
  /**
   * How far the floor reaches past the original room. Everything pinned to an
   * edge — the entrance notch, its mat, the sign and cushion on the street —
   * is carried out by this so the doorway stays the doorway.
   */
  const grown = growth(tiles);

  // Floor the café bought, and **every wall it has** (§8 step 6).
  //
  // The walls used to come from the authored layout until the café grew, at
  // which point the generated runs took over. That was fine while a wall was
  // just a wall, and wrong the moment one could be glazed: a window bought on
  // the home café is a property of a *segment*, and the layout's two hard-coded
  // pieces have no segment identity to hang it on. So the runs are generated
  // from one square upward, and the layout's wall rows are always skipped.
  // For an unexpanded café the two agree piece for piece — there is a test.
  const extra = expansionPlacements(tiles, choice, windows);
  for (const [offset, item] of extra.entries()) {
    const mesh = place(assets, item, choice, placements, grown);
    if (!mesh) {
      missing.push(assetFor(item, choice));
      continue;
    }
    mesh.userData.furniture = {
      // Negative indices: these are generated, not rows of CAFE_LAYOUT, and a
      // lookup into the layout by this index must fail loudly rather than
      // return somebody else's furniture.
      index: -1 - offset,
      slot: item.slot,
      asset: assetFor(item, choice),
      movable: false,
      size: assets.get(assetFor(item, choice))?.size,
    } satisfies FurnitureTag;
    group.add(mesh);
  }

  for (const [index, item] of CAFE_LAYOUT.entries()) {
    // Walls are always generated now — see above.
    if (item.slot === "wallPlain" || item.slot === "wallWindow") continue;
    // **The entrance rides the edge rather than retiring**, so there is no
    // longer anything to skip. It used to be dropped once a patio covered it
    // — two slabs on the same ground z-fight — which left an expanded café
    // with no doorway at all: the notch vanished and the mat, the sign and the
    // walking route stayed behind in what was now the middle of the floor.
    //
    // Note the obsolete test could not simply be kept alongside the shift: the
    // notch *straddles* the boundary by design, so once it moves out to the
    // new edge it is always "covered" by the tile it borders, and the skip
    // fired every time. See `Placement.followsEdge`.
    // The window-seat cushions rest on style A's ledge. Other styles have a
    // flat window wall, so they'd float — leave them out rather than fake it.
    if (item.onSill && !sill) continue;
    // Not bought yet, so it simply isn't in the room (§8 step 5).
    if (item.shopItem && !purchased.includes(item.shopItem)) continue;
    // …and neither is a cupcake without the case it sits in. See `needs`.
    if (item.needs && !purchased.includes(item.needs)) continue;
    const mesh = place(assets, item, choice, placements, grown);
    if (!mesh) {
      missing.push(assetFor(item, choice));
      continue;
    }
    const tag: FurnitureTag = {
      index,
      slot: item.slot,
      asset: assetFor(item, choice),
      id: item.id,
      movable: item.movable === true,
      /** Footprint, for the placement validator. Measured, not guessed. */
      size: assets.get(assetFor(item, choice))?.size,
    };
    mesh.userData.furniture = tag;
    group.add(mesh);
  }

  // --- Player-created furniture (§ data/beds.ts) --------------------------
  //
  // Instances carry their own position, so unlike an authored placement there
  // can be any number of them. Each is tagged movable with its instance id, so
  // the existing mover picks it up exactly like anything else.
  for (const instance of instances) {
    const item = shopItem(instance.item);
    const asset =
      instance.item === CAT_BED_ITEM ? bedAsset(choice) : item ? copyAsset(item) : "";
    const built = asset ? assets.create(asset) : null;
    if (!built) {
      missing.push(asset || instance.item);
      continue;
    }
    // A wall piece hangs at its own height; everything else stands on the
    // floor. Both are dragged the same way — see `systems/placement.ts`.
    built.position.set(instance.x, item?.wall ? (item.wallY ?? 1.6) : 0, instance.z);
    built.rotation.y = instance.rot ?? 0;
    built.userData.furniture = {
      // Instances are not rows of CAFE_LAYOUT; a lookup by this index must
      // fail rather than return somebody else's furniture.
      index: -1000 - instances.indexOf(instance),
      asset,
      id: instance.id,
      movable: true,
      size: assets.get(asset)?.size,
      wall: item?.wall === true,
    } satisfies FurnitureTag;
    group.add(built);
  }

  if (missing.length > 0) {
    // Loud rather than silent: a renamed asset would otherwise just leave a
    // hole in the room with no clue why.
    // eslint-disable-next-line no-console
    console.warn(`[cafe] ${missing.length} layout objects not found in pack:`, missing);
  }

  return { group, assets, missing };
}
