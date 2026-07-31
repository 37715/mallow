import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Loads the Minty.kit "Cozy Cat Café" pack (CC0 — see public/assets/cafe/README.md)
 * and exposes its ~343 objects by name.
 *
 * Three things about this pack drive the whole design of this file:
 *
 * 1. **The glTFs define no materials, textures or images** — only geometry with
 *    UVs. So we apply the shared atlas ourselves, and every object in the café
 *    ends up on *one* material. That's a large performance win on mobile (§13):
 *    the entire room is a handful of draw calls rather than one per prop.
 * 2. **Geometry is authored Z-up.** The node rotation corrects it; we bake that
 *    into the geometry so callers never think about it.
 * 3. **Node translations are the artist's sample-scene layout**, not something
 *    we want. We always discard those.
 * 4. **Architecture and props use different origin conventions**, and this one
 *    is easy to get catastrophically wrong. Walls, floors and doors are
 *    *tile-modular*: their geometry is authored relative to the centre of a
 *    4-unit tile, with the wall sitting on that tile's edge — and the four
 *    `Enclosed_Corner_N/S/E/W` pieces are a single pre-assembled room, all
 *    four sharing one origin. Re-centring those on their own footprints (which
 *    the first version did to everything) drags every wall to the middle of
 *    its tile and pulls the room apart at the corners. So architecture keeps
 *    its offsets; only props get re-centred, footprint-centre with base at y=0.
 */

const ASSET_BASE = "/assets/cafe";

const GLTF_FILES = [
  "Furniture.gltf",
  "Food_and_Deco.gltf",
  "Walls_Floors_Style_A.gltf",
  "Walls_Floors_Style_B.gltf",
  "Walls_Floors_Style_C.gltf",
] as const;

/** The pack's modular grid: one floor tile, and one wall segment, are this wide. */
export const GRID = 4;

export interface AssetEntry {
  name: string;
  /** True for tile-modular architecture, which keeps its authored offset. */
  architectural: boolean;
  /** Which glTF it came from — drives the category grouping in the gallery. */
  source: string;
  geometry: THREE.BufferGeometry;
  /** Footprint after correction, in world units (x = width, y = height, z = depth). */
  size: THREE.Vector3;
}

export interface CafeAssets {
  /** Every object name, sorted. */
  names: string[];
  get(name: string): AssetEntry | undefined;
  /** Build a mesh for an object, ready to position. Returns null if unknown. */
  create(name: string): THREE.Mesh | null;
  /** The single shared material every café object uses. */
  material: THREE.MeshStandardMaterial;
  bySource: Map<string, AssetEntry[]>;
}

/**
 * Sample-scene duplicates the artist left in the export (`x_Bar_Corner_copy1`
 * and friends). They're the same meshes already available under clean names.
 */
function isSampleDuplicate(name: string): boolean {
  return name.startsWith("x_") || /\.\d{3}$/.test(name);
}

/**
 * Tile-modular architecture: placed by *tile centre*, not by footprint. Keeps
 * its authored offset so walls land on tile edges and corner sets assemble.
 */
function isArchitectural(name: string): boolean {
  return name.startsWith("Wall") || name.startsWith("Flooring") || name.startsWith("Door");
}

let cached: Promise<CafeAssets> | null = null;

export function loadCafeAssets(): Promise<CafeAssets> {
  cached ??= loadOnce();
  return cached;
}

async function loadOnce(): Promise<CafeAssets> {
  const textureLoader = new THREE.TextureLoader();
  const atlas = await textureLoader.loadAsync(`${ASSET_BASE}/T_CatCafe_Atlas.png`);
  // The atlas is authored colour data, so it must be tagged sRGB or everything
  // renders washed out and slightly grey.
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.flipY = false; // glTF UV convention
  atlas.magFilter = THREE.NearestFilter; // atlas cells are flat colour; keeps edges crisp
  atlas.minFilter = THREE.LinearMipmapLinearFilter;
  atlas.generateMipmaps = true;

  const material = new THREE.MeshStandardMaterial({
    map: atlas,
    roughness: 0.92,
    metalness: 0,
  });

  const loader = new GLTFLoader();
  const entries = new Map<string, AssetEntry>();
  const bySource = new Map<string, AssetEntry[]>();

  for (const file of GLTF_FILES) {
    const gltf = await loader.loadAsync(`${ASSET_BASE}/${file}`);
    const list: AssetEntry[] = [];

    gltf.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const name = object.name;
      if (!name || isSampleDuplicate(name) || entries.has(name)) return;

      const geometry = (object.geometry as THREE.BufferGeometry).clone();

      // Bake the node's rotation (the Z-up → Y-up correction) but not its
      // sample-scene translation.
      object.updateMatrixWorld(true);
      const rotation = new THREE.Matrix4().makeRotationFromQuaternion(
        object.getWorldQuaternion(new THREE.Quaternion()),
      );
      geometry.applyMatrix4(rotation);

      const architectural = isArchitectural(name);
      geometry.computeBoundingBox();
      if (!architectural) {
        // Props: origin at the middle of the footprint, base on the floor.
        const box = geometry.boundingBox!;
        const centre = box.getCenter(new THREE.Vector3());
        geometry.translate(-centre.x, -box.min.y, -centre.z);
        geometry.computeBoundingBox();
      }
      geometry.computeVertexNormals();

      const entry: AssetEntry = {
        name,
        source: file.replace(".gltf", ""),
        architectural,
        geometry,
        size: geometry.boundingBox!.getSize(new THREE.Vector3()),
      };
      entries.set(name, entry);
      list.push(entry);
    });

    bySource.set(file.replace(".gltf", ""), list);
  }

  return {
    names: [...entries.keys()].sort(),
    bySource,
    material,
    get: (name) => entries.get(name),
    create(name) {
      const entry = entries.get(name);
      if (!entry) return null;
      const mesh = new THREE.Mesh(entry.geometry, material);
      mesh.name = name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    },
  };
}
