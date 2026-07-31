import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CAFE_LAYOUT, CAT_SPOTS, DOOR, ROOM, SEATS } from "@/data/cafe-layout";

/**
 * Layout verification without a renderer.
 *
 * The café is hand-placed by coordinate, which is easy to get wrong and
 * invisible until you look at it — a chair half inside a counter, a plant
 * through a wall, a sofa hanging off the floor. This reads the pack's glTF
 * JSON, reconstructs each object's real post-rotation footprint, and checks the
 * whole arrangement.
 *
 * It is the same trick as the old greybox layout test, pointed at real art.
 */

const DIR = join(process.cwd(), "public/assets/cafe");
const FILES = [
  "Furniture.gltf",
  "Food_and_Deco.gltf",
  "Walls_Floors_Style_A.gltf",
  "Walls_Floors_Style_B.gltf",
  "Walls_Floors_Style_C.gltf",
];

interface Box {
  size: [number, number, number];
  min: [number, number, number];
}

/** Rotate a bounding box by a quaternion and return the new axis-aligned box. */
function rotatedBox(min: number[], max: number[], q: number[]): Box {
  const [x, y, z, w] = q;
  const m = [
    [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
    [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
    [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
  ];
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const px of [min[0], max[0]]) {
    for (const py of [min[1], max[1]]) {
      for (const pz of [min[2], max[2]]) {
        for (let r = 0; r < 3; r++) {
          const v = m[r][0] * px + m[r][1] * py + m[r][2] * pz;
          lo[r] = Math.min(lo[r], v);
          hi[r] = Math.max(hi[r], v);
        }
      }
    }
  }
  return {
    size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]],
    min: [lo[0], lo[1], lo[2]],
  };
}

/** Every object in the pack, by name, with its corrected footprint. */
const FOOTPRINTS: Map<string, Box> = (() => {
  const out = new Map<string, Box>();
  for (const file of FILES) {
    const gltf = JSON.parse(readFileSync(join(DIR, file), "utf8")) as {
      nodes?: { name?: string; mesh?: number; rotation?: number[] }[];
      meshes?: { primitives: { attributes: Record<string, number> }[] }[];
      accessors?: { min?: number[]; max?: number[] }[];
    };
    for (const node of gltf.nodes ?? []) {
      if (node.mesh === undefined || !node.name || out.has(node.name)) continue;
      const accessor = gltf.meshes![node.mesh].primitives[0].attributes.POSITION;
      const { min, max } = gltf.accessors![accessor];
      out.set(node.name, rotatedBox(min!, max!, node.rotation ?? [0, 0, 0, 1]));
    }
  }
  return out;
})();

interface Placed {
  name: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
  flat: boolean;
}

/** Where each layout entry actually ends up, applying the loader's re-centring. */
const PLACED: Placed[] = CAFE_LAYOUT.map((item) => {
  const box = FOOTPRINTS.get(item.asset);
  if (!box) throw new Error(`layout uses unknown asset: ${item.asset}`);

  // Y rotations of 90° swap the x and z extents.
  const quarterTurn = Math.abs(Math.round((item.rotY ?? 0) / (Math.PI / 2))) % 2 === 1;
  const width = quarterTurn ? box.size[2] : box.size[0];
  const depth = quarterTurn ? box.size[0] : box.size[2];
  const y = item.y ?? 0;

  return {
    name: item.asset,
    minX: item.x - width / 2,
    maxX: item.x + width / 2,
    minZ: item.z - depth / 2,
    maxZ: item.z + depth / 2,
    minY: y,
    maxY: y + box.size[1],
    flat: box.size[1] < 0.3,
  };
});

describe("café layout", () => {
  it("uses only assets that exist in the pack", () => {
    const unknown = CAFE_LAYOUT.filter((i) => !FOOTPRINTS.has(i.asset)).map((i) => i.asset);
    expect(unknown).toEqual([]);
  });

  it("keeps everything on the floor plan", () => {
    const half = ROOM.half;
    const outside = PLACED.filter(
      (p) => p.minX < -half - 0.5 || p.maxX > half + 0.5 || p.minZ < -half - 0.5 || p.maxZ > half + 0.5,
    ).map((p) => `${p.name} x[${p.minX.toFixed(1)},${p.maxX.toFixed(1)}] z[${p.minZ.toFixed(1)},${p.maxZ.toFixed(1)}]`);
    expect(outside).toEqual([]);
  });

  it("does not stack furniture inside other furniture", () => {
    const clashes: string[] = [];
    for (let i = 0; i < PLACED.length; i++) {
      for (let j = i + 1; j < PLACED.length; j++) {
        const a = PLACED[i];
        const b = PLACED[j];
        // Flat things (floors, carpets, cushions) are meant to be sat on top of.
        if (a.flat || b.flat) continue;
        // Objects at clearly different heights (counter-top items, wall décor)
        // are deliberately stacked.
        if (a.minY >= b.maxY - 0.05 || b.minY >= a.maxY - 0.05) continue;

        const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
        const overlapZ = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ);
        // A little intersection is fine and often looks better (a chair tucked
        // under a table); a deep one means something is buried.
        if (overlapX > 0.25 && overlapZ > 0.25) {
          clashes.push(
            `${a.name} ↔ ${b.name} (x ${overlapX.toFixed(2)}, z ${overlapZ.toFixed(2)})`,
          );
        }
      }
    }
    expect(clashes).toEqual([]);
  });

  it("has a small café's worth of seats, and cat spots for a small roster", () => {
    // The direction change (§0) caps this deliberately: a gently active café,
    // not a busy one.
    expect(SEATS.length).toBeGreaterThanOrEqual(4);
    expect(SEATS.length).toBeLessThanOrEqual(8);
    expect(CAT_SPOTS.length).toBeGreaterThanOrEqual(3);
  });

  it("leaves a walkable path from the door to every seat", () => {
    // Visitors move in a straight line to their seat — there is no
    // pathfinding, so anything solid on that line is walked through.
    const blocked: string[] = [];
    for (const seat of SEATS) {
      for (let t = 0.08; t < 0.92; t += 0.04) {
        const px = DOOR.x + (seat.x - DOOR.x) * t;
        const pz = DOOR.z + (seat.z - DOOR.z) * t;
        for (const p of PLACED) {
          if (p.flat || p.minY > 0.4) continue;
          if (p.name.startsWith("Cushion") || p.name.startsWith("Sofa")) continue;
          if (p.name.startsWith("Chair") || p.name.startsWith("Table")) continue;
          if (px > p.minX + 0.1 && px < p.maxX - 0.1 && pz > p.minZ + 0.1 && pz < p.maxZ - 0.1) {
            blocked.push(`seat (${seat.x},${seat.z}) ↔ ${p.name}`);
          }
        }
      }
    }
    expect([...new Set(blocked)]).toEqual([]);
  });

  it("puts the door on the open side of the diorama", () => {
    // Walls are on −x and −z; guests must arrive from the open corner or
    // they'd walk through a wall.
    expect(DOOR.x).toBeGreaterThan(0);
    expect(DOOR.z).toBeGreaterThan(0);
  });
});
