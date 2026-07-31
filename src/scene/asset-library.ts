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
 * 4. **Window and door pieces have two primitives** — the frame and the glass —
 *    and GLTFLoader turns any multi-primitive mesh into a *Group* whose children
 *    are named `<name>_0`, `<name>_1`. Registering only `THREE.Mesh` by its own
 *    name therefore misses those pieces entirely: `create("Wall_A_Window_...")`
 *    returned null and every window in the café silently failed to appear,
 *    leaving holes where half the walls should be. We walk scene *nodes*, not
 *    meshes, and keep their primitives together. The glass primitive gets the
 *    pack's separate glass texture rather than the atlas.
 * 5. **Architecture and props use different origin conventions**, and this one
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
  /** One entry per glTF primitive: the frame, and for windows/doors the glass. */
  parts: { geometry: THREE.BufferGeometry; glass: boolean }[];
  /** Footprint after correction, in world units (x = width, y = height, z = depth). */
  size: THREE.Vector3;
}

export interface CafeAssets {
  /** Every object name, sorted. */
  names: string[];
  get(name: string): AssetEntry | undefined;
  /** Build an object, ready to position. Returns null if unknown. */
  create(name: string): THREE.Object3D | null;
  /** The shared material almost every café object uses. */
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

  // Windows carry a second primitive for the glass, which maps to its own
  // texture. Left on the atlas it renders as a slab of arbitrary café colours.
  const glassMap = await textureLoader.loadAsync(`${ASSET_BASE}/T_CatCafe_Glass.png`);
  glassMap.colorSpace = THREE.SRGBColorSpace;
  glassMap.flipY = false;
  const glassMaterial = new THREE.MeshStandardMaterial({
    map: glassMap,
    roughness: 0.25,
    metalness: 0,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });

  const loader = new GLTFLoader();
  const entries = new Map<string, AssetEntry>();
  const bySource = new Map<string, AssetEntry[]>();

  for (const file of GLTF_FILES) {
    const gltf = await loader.loadAsync(`${ASSET_BASE}/${file}`);
    const list: AssetEntry[] = [];

    // Walk top-level nodes, not meshes: a multi-primitive node arrives as a
    // Group and its child meshes carry mangled `_0`/`_1` names.
    for (const node of gltf.scene.children) {
      const name = node.name;
      if (!name || isSampleDuplicate(name) || entries.has(name)) continue;

      const meshes: THREE.Mesh[] = [];
      node.traverse((child) => {
        if (child instanceof THREE.Mesh) meshes.push(child);
      });
      if (meshes.length === 0) continue;

      node.updateMatrixWorld(true);
      const rotation = new THREE.Matrix4().makeRotationFromQuaternion(
        node.getWorldQuaternion(new THREE.Quaternion()),
      );

      const architectural = isArchitectural(name);
      const geometries = meshes.map((mesh) => {
        const geometry = (mesh.geometry as THREE.BufferGeometry).clone();
        geometry.applyMatrix4(rotation);
        return geometry;
      });

      // Measure across every primitive so the frame and its glass stay aligned.
      const bounds = new THREE.Box3();
      for (const geometry of geometries) {
        geometry.computeBoundingBox();
        bounds.union(geometry.boundingBox!);
      }
      if (!architectural) {
        const centre = bounds.getCenter(new THREE.Vector3());
        for (const geometry of geometries) {
          geometry.translate(-centre.x, -bounds.min.y, -centre.z);
        }
        bounds.translate(new THREE.Vector3(-centre.x, -bounds.min.y, -centre.z));
      }
      for (const geometry of geometries) geometry.computeVertexNormals();

      const entry: AssetEntry = {
        name,
        source: file.replace(".gltf", ""),
        architectural,
        // Blender exports the frame first and the glass second.
        parts: geometries.map((geometry, i) => ({ geometry, glass: i > 0 })),
        size: bounds.getSize(new THREE.Vector3()),
      };
      entries.set(name, entry);
      list.push(entry);
    }

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

      const build = (part: { geometry: THREE.BufferGeometry; glass: boolean }) => {
        const mesh = new THREE.Mesh(part.geometry, part.glass ? glassMaterial : material);
        mesh.castShadow = !part.glass;
        mesh.receiveShadow = !part.glass;
        return mesh;
      };

      if (entry.parts.length === 1) {
        const mesh = build(entry.parts[0]);
        mesh.name = name;
        return mesh;
      }

      const group = new THREE.Group();
      group.name = name;
      for (const part of entry.parts) group.add(build(part));
      return group;
    },
  };
}
