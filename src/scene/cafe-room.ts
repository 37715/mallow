import * as THREE from "three";
import { CAFE_LAYOUT, type Placement } from "@/data/cafe-layout";
import { loadCafeAssets, type CafeAssets } from "@/scene/asset-library";

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

function place(assets: CafeAssets, item: Placement): THREE.Object3D | null {
  const object = assets.create(item.asset);
  if (!object) return null;
  object.position.set(item.x, item.y ?? 0, item.z);
  if (item.rotY) object.rotation.y = item.rotY;

  // Floors and carpets only receive shadow; everything else casts too. Fewer
  // shadow casters is the cheapest shadow win there is (§13).
  if ((assets.get(item.asset)?.size.y ?? 1) < 0.3) {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) child.castShadow = false;
    });
  }
  return object;
}

export async function buildCafeRoom(): Promise<BuiltRoom> {
  const assets = await loadCafeAssets();
  const group = new THREE.Group();
  group.name = "cafe";
  const missing: string[] = [];

  for (const item of CAFE_LAYOUT) {
    const mesh = place(assets, item);
    if (!mesh) {
      missing.push(item.asset);
      continue;
    }
    group.add(mesh);
  }

  if (missing.length > 0) {
    // Loud rather than silent: a renamed asset would otherwise just leave a
    // hole in the room with no clue why.
    // eslint-disable-next-line no-console
    console.warn(`[cafe] ${missing.length} layout objects not found in pack:`, missing);
  }

  return { group, assets, missing };
}
