import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { GRID } from "@/scene/asset-library";

/**
 * The café asset pack is a third-party download, and `scene/asset-library.ts`
 * makes several structural assumptions about it that are invisible until the
 * screen renders wrong. These tests read the glTF JSON directly — no WebGL
 * needed — so a pack update that breaks an assumption fails here loudly rather
 * than shipping a white, untextured café.
 *
 * If one of these fails after updating the pack, fix the loader; don't delete
 * the test.
 */

const DIR = join(process.cwd(), "public/assets/cafe");

const GLTF_FILES = [
  "Furniture.gltf",
  "Food_and_Deco.gltf",
  "Walls_Floors_Style_A.gltf",
  "Walls_Floors_Style_B.gltf",
  "Walls_Floors_Style_C.gltf",
];

interface Gltf {
  nodes?: { name?: string; mesh?: number; rotation?: number[] }[];
  meshes?: { name?: string; primitives: { attributes: Record<string, number>; material?: number }[] }[];
  materials?: unknown[];
  buffers?: { uri?: string }[];
  accessors?: { min?: number[]; max?: number[] }[];
}

const load = (file: string): Gltf => JSON.parse(readFileSync(join(DIR, file), "utf8")) as Gltf;

describe("café asset pack", () => {
  it("ships every glTF, its buffer, and the shared atlas", () => {
    for (const file of GLTF_FILES) {
      expect(existsSync(join(DIR, file)), file).toBe(true);
      expect(existsSync(join(DIR, file.replace(".gltf", ".bin"))), file).toBe(true);
    }
    expect(existsSync(join(DIR, "T_CatCafe_Atlas.png"))).toBe(true);
    // CC0 terms — keep the licence beside the assets it covers (§9).
    expect(existsSync(join(DIR, "LICENSE.txt"))).toBe(true);
  });

  it("defines no materials, which is why we apply the atlas ourselves", () => {
    // If a future pack version ships real materials, the loader's single shared
    // material would silently override them — worth knowing about.
    for (const file of GLTF_FILES) {
      const gltf = load(file);
      expect(gltf.materials ?? [], file).toHaveLength(0);
    }
  });

  it("gives every mesh UVs, without which the atlas cannot map", () => {
    for (const file of GLTF_FILES) {
      const gltf = load(file);
      for (const mesh of gltf.meshes ?? []) {
        for (const primitive of mesh.primitives) {
          expect(Object.keys(primitive.attributes), `${file}:${mesh.name}`).toContain("TEXCOORD_0");
        }
      }
    }
  });

  it("carries the Z-up correction on nodes, which the loader bakes in", () => {
    const gltf = load("Furniture.gltf");
    const withMesh = (gltf.nodes ?? []).filter((n) => n.mesh !== undefined);
    expect(withMesh.length).toBeGreaterThan(0);
    // ~90° about X, as Blender's glTF exporter writes for Z-up source art.
    for (const node of withMesh.slice(0, 20)) {
      expect(node.rotation, node.name).toBeDefined();
      expect(node.rotation![0]).toBeCloseTo(Math.SQRT1_2, 3);
    }
  });

  it("still contains the objects the café is actually built from", () => {
    // A rename in a pack update would leave holes in the room with no error.
    const present = new Set<string>();
    for (const file of GLTF_FILES) {
      for (const node of load(file).nodes ?? []) {
        if (node.mesh !== undefined && node.name) present.add(node.name);
      }
    }
    for (const required of [
      "Flooring_A_Tiling",
      "Wall_A_Light_Mid",
      "Wall_A_Window_Light_Mid",
      "Bar_Straight_1",
      "Bar_Corner",
      "Table_Short",
      "Sofa_Single_Cream",
      "Chair_Bar_A",
      "Cat_Bed_A_Cream",
      "Cat_Climber_A_Cream",
      "Coffe_Machine",
      "Cake_Display_A",
      "Plant_SmallPot_A",
    ]) {
      expect(present, required).toContain(required);
    }
  });

  it("keeps the 4-unit modular grid the room layout is built on", () => {
    // Asserted without assuming an axis: the pack isn't consistent about which
    // axis carries thickness (the floor's thin axis is Y, the wall's is X), and
    // the loader bakes the node rotation anyway. What matters is that a floor
    // tile and a wall segment are both 4 across their two large dimensions, so
    // they tile against each other.
    const gltf = load("Walls_Floors_Style_A.gltf");

    const spanOf = (name: string): number[] => {
      const meshIndex = (gltf.nodes ?? []).find((n) => n.name === name)?.mesh;
      expect(meshIndex, name).toBeDefined();
      const accessor = gltf.meshes![meshIndex!].primitives[0].attributes.POSITION;
      const { min, max } = gltf.accessors![accessor];
      return [0, 1, 2].map((i) => max![i] - min![i]).sort((a, b) => a - b);
    };

    for (const name of ["Flooring_A_Tiling", "Wall_A_Light_Mid"]) {
      const [thin, mid, large] = spanOf(name);
      expect(mid, `${name} mid span`).toBeCloseTo(GRID, 1);
      expect(large, `${name} large span`).toBeCloseTo(GRID, 1);
      expect(thin, `${name} thickness`).toBeLessThan(1);
    }
  });

  it("has enough objects to be worth a gallery", () => {
    let count = 0;
    for (const file of GLTF_FILES) {
      count += (load(file).nodes ?? []).filter(
        (n) => n.mesh !== undefined && n.name && !n.name.startsWith("x_"),
      ).length;
    }
    expect(count).toBeGreaterThan(250);
  });
});
