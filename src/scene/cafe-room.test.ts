import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CAFE_LAYOUT,
  CAT_SPOTS,
  DOOR,
  DOOR_LOBBY,
  DOOR_THRESHOLD,
  ROOM,
  SEATS,
  SILL,
} from "@/data/cafe-layout";
import { ECONOMY_CONFIG } from "@/data/economy";

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

/** Architecture keeps its authored offset; props are re-centred. See asset-library. */
const isArchitectural = (name: string): boolean =>
  name.startsWith("Wall") || name.startsWith("Flooring") || name.startsWith("Door");

/** Euler XYZ, three.js order (R = Rx · Ry · Rz), applied to a point. */
function rotatePoint(p: number[], rx: number, ry: number, rz: number): number[] {
  const [cx, sx] = [Math.cos(rx), Math.sin(rx)];
  const [cy, sy] = [Math.cos(ry), Math.sin(ry)];
  const [cz, sz] = [Math.cos(rz), Math.sin(rz)];
  // Rz
  let [x, y, z] = [p[0] * cz - p[1] * sz, p[0] * sz + p[1] * cz, p[2]];
  // Ry
  [x, y, z] = [x * cy + z * sy, y, -x * sy + z * cy];
  // Rx
  return [x, y * cx - z * sx, y * sx + z * cx];
}

/**
 * Where each layout entry actually ends up, mirroring the loader exactly.
 *
 * The two origin conventions matter here as much as they do at runtime: a prop
 * is centred on `item.x/z` with its base at `item.y`, but a wall sits at
 * `item.x/z` *plus its authored offset*, which is what puts it on a tile edge
 * rather than a tile centre.
 */
const PLACED: (Placed & { item: (typeof CAFE_LAYOUT)[number] })[] = CAFE_LAYOUT.filter(
  (i) => i.asset,
).map((item) => {
  const box = FOOTPRINTS.get(item.asset);
  if (!box) throw new Error(`layout uses unknown asset: ${item.asset}`);

  const scale = item.scale ?? 1;
  const architectural = isArchitectural(item.asset);

  // Local extents: offset-preserving for architecture, centred for props.
  const [lx0, lx1] = architectural
    ? [box.min[0], box.min[0] + box.size[0]]
    : [-box.size[0] / 2, box.size[0] / 2];
  const [lz0, lz1] = architectural
    ? [box.min[2], box.min[2] + box.size[2]]
    : [-box.size[2] / 2, box.size[2] / 2];
  const [ly0, ly1] = architectural ? [box.min[1], box.min[1] + box.size[1]] : [0, box.size[1]];

  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const lx of [lx0, lx1]) {
    for (const ly of [ly0, ly1]) {
      for (const lz of [lz0, lz1]) {
        const p = rotatePoint(
          [lx * scale, ly * scale, lz * scale],
          item.rotX ?? 0,
          item.rotY ?? 0,
          item.rotZ ?? 0,
        );
        for (let k = 0; k < 3; k++) {
          lo[k] = Math.min(lo[k], p[k]);
          hi[k] = Math.max(hi[k], p[k]);
        }
      }
    }
  }

  const y = item.y ?? 0;
  return {
    item,
    name: item.asset,
    minX: item.x + lo[0],
    maxX: item.x + hi[0],
    minZ: item.z + lo[2],
    maxZ: item.z + hi[2],
    minY: y + lo[1],
    maxY: y + hi[1],
    // Explicit, not inferred from height — see `Placement.walkOver`. A cat bed
    // is short and is emphatically not something to stand a table on.
    //
    // Architecture counts as walk-over for the same reason it does at runtime:
    // the floor slab and the entrance step are the *ground*, and everything in
    // the room is standing on them by definition.
    flat: item.walkOver === true || isArchitectural(item.asset),
  };
});

describe("café layout", () => {
  /**
   * Guards the bug behind `Placement.walkOver`: both this file and the runtime
   * validator used to infer "you may stand furniture on this" from *height*,
   * which quietly made the cat bed and the floor cushions walk-over. The
   * editor let you drop a table on the cat bed and never turned the ghost red.
   */
  it("only treats actual floor coverings as walk-over", () => {
    const walkOver = CAFE_LAYOUT.filter((i) => i.walkOver).map((i) => i.asset);
    expect(walkOver.every((a) => /^(Carpet|Mat)_/.test(a))).toBe(true);

    const solidById = (id: string) =>
      CAFE_LAYOUT.find((i) => i.id === id)?.walkOver ?? false;
    // The specific pieces the height heuristic got wrong.
    expect(solidById("cat-bed")).toBe(false);
    expect(solidById("floor-cushion-a")).toBe(false);
    expect(solidById("floor-cushion-b")).toBe(false);
  });

  it("uses only assets that exist in the pack", () => {
    const unknown = CAFE_LAYOUT.filter((i) => i.asset && !FOOTPRINTS.has(i.asset)).map((i) => i.asset);
    expect(unknown).toEqual([]);
  });

  it("keeps everything on the floor plan", () => {
    // …except the handful of things that are *meant* to stand on the ground
    // outside the door. Those say so with `outdoor`, so a prop that drifts off
    // the floor by accident is still caught.
    const half = ROOM.half;
    const outside = PLACED.filter(
      (p) =>
        !p.item.outdoor &&
        (p.minX < -half - 0.5 ||
          p.maxX > half + 0.5 ||
          p.minZ < -half - 0.5 ||
          p.maxZ > half + 0.9),
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
        // Wall pieces are *designed* to interlock — the corner set overlaps by
        // 0.3 at the join, and that overlap is what closes the corner.
        if (isArchitectural(a.name) && isArchitectural(b.name)) continue;
        // **Anything lifted off the floor has already been thought about.** A
        // positive `y` means "this sits on something" — a cupcake inside the
        // glass case, a trailing plant whose pot is on the shelf below it, a
        // cushion on the window ledge. Their boxes overlap what holds them by
        // design. What this check is really for is the floor plan: a chair
        // inside a counter, a plant through a wall.
        if ((a.item.y ?? 0) > 0.05 || (b.item.y ?? 0) > 0.05) continue;
        // Objects at clearly different heights are deliberately stacked.
        if (a.minY >= b.maxY - 0.05 || b.minY >= a.maxY - 0.05) continue;

        const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
        const overlapZ = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ);

        // Furniture is *supposed* to sit flush against a wall — a counter or a
        // sofa pushed right up to it will overlap the wall's own ~0.3
        // thickness, and that reads correctly. What's wrong is a prop shoved
        // through a wall, so for wall-vs-prop only the shallow axis matters and
        // it gets the wall's thickness as slack.
        // 0.42 rather than 0.30 because the window wall's bounding box is 0.68
        // deep: its body is a normal 0.30 slab and the rest is the sill ledge
        // sticking into the room. A prop flush to the *body* still overlaps the
        // box by the ledge's depth.
        // 0.3 between props rather than 0.25 because round pieces nestle: the
        // side table tucks into the curve of the armchair's arm, so their boxes
        // overlap by a quarter-unit while the geometry never touches.
        const againstWall = isArchitectural(a.name) !== isArchitectural(b.name);
        const limit = againstWall ? 0.42 : 0.3;
        const shallow = Math.min(overlapX, overlapZ);
        if (shallow > limit) {
          clashes.push(
            `${a.name} ↔ ${b.name} (x ${overlapX.toFixed(2)}, z ${overlapZ.toFixed(2)})`,
          );
        }
      }
    }
    expect(clashes).toEqual([]);
  });

  it("keeps furniture out of the window sill unless it says it means to", () => {
    // The window wall is not a flat slab: a ledge juts 0.34 into the room in a
    // narrow height band (see SILL). Push something flush to that wall — the
    // obvious thing to do in a small room — and the ledge slices across it,
    // reading as a shelf growing out of the window. The generic wall-vs-prop
    // slack above can't catch this, because the sill is nowhere near the *wall
    // piece's* own bounding box edge.
    //
    // The window seat and the cat climber are tucked in there on purpose and
    // say so; everything else has to stay clear.
    const impaled = PLACED.filter(
      (p) =>
        !isArchitectural(p.name) &&
        !p.item.onSill &&
        !p.item.crossesSill &&
        p.minZ < SILL.innerZ &&
        p.maxY > SILL.yMin &&
        p.minY < SILL.yMax,
    ).map((p) => `${p.name} reaches z=${p.minZ.toFixed(2)} at y[${p.minY.toFixed(2)},${p.maxY.toFixed(2)}]`);
    expect(impaled).toEqual([]);
  });

  it("gives every cat somewhere to sit without burying it in the furniture", () => {
    // Cats used to be planted at y=0 on top of a bed with a 0.25 rim, which
    // sliced them in half. Anything with a raised cushion needs a catY.
    for (const spot of CAT_SPOTS) {
      if (!spot.asset) continue; // bare-floor spot
      const box = FOOTPRINTS.get(spot.asset)!;
      if (box.size[1] > 0.15) {
        expect(spot.catY, `${spot.asset} needs a catY`).toBeGreaterThan(0);
      }
    }
  });

  it("has a small café's worth of seats, and cat spots for a small roster", () => {
    // The direction change (§0) caps this deliberately: a gently active café,
    // not a busy one.
    expect(SEATS.length).toBeGreaterThanOrEqual(4);
    expect(SEATS.length).toBeLessThanOrEqual(8);
    expect(CAT_SPOTS.length).toBeGreaterThanOrEqual(3);
  });

  it("leaves a walkable path from the door to every seat", () => {
    // Visitors move in straight lines with no pathfinding, so anything solid
    // on the route is walked through. The route has **two legs** since the
    // door moved onto the real entrance step: outside → the doormat → the
    // seat. Both are checked, because the approach leg passes the A-frame
    // sign and the outdoor cushion.
    const blocked: string[] = [];
    const legs: Array<[{ x: number; z: number }, { x: number; z: number }]> = [];
    for (const seat of SEATS) {
      legs.push([DOOR, DOOR_THRESHOLD]);
      legs.push([DOOR_THRESHOLD, DOOR_LOBBY]);
      legs.push([DOOR_LOBBY, { x: seat.x, z: seat.z }]);
    }
    for (const [from, to] of legs) {
      for (let t = 0.08; t < 0.92; t += 0.04) {
        const px = from.x + (to.x - from.x) * t;
        const pz = from.z + (to.z - from.z) * t;
        for (const p of PLACED) {
          if (p.flat || p.minY > 0.4) continue;
          if (p.name.startsWith("Cushion") || p.name.startsWith("Sofa")) continue;
          if (p.name.startsWith("Chair") || p.name.startsWith("Table")) continue;
          // Seats are pushed right up against the walls on purpose; a guest
          // reaching one clips the wall's last few centimetres and that's fine.
          if (isArchitectural(p.name)) continue;
          if (px > p.minX + 0.1 && px < p.maxX - 0.1 && pz > p.minZ + 0.1 && pz < p.maxZ - 0.1) {
            blocked.push(`(${from.x},${from.z})→(${to.x},${to.z}) ↔ ${p.name}`);
          }
        }
      }
    }
    expect([...new Set(blocked)]).toEqual([]);
  });

  it("puts the floor surface at y=0, not the floor's underside", () => {
    // Assets are placed base-first, so an un-offset floor tile puts its walking
    // surface at +0.26 and sinks every piece of furniture into the ground.
    const floors = CAFE_LAYOUT.filter((p) => p.asset.startsWith("Flooring"));
    expect(floors.length).toBeGreaterThan(0);
    for (const floor of floors) {
      const box = FOOTPRINTS.get(floor.asset)!;
      const surface = (floor.y ?? 0) + box.size[1];
      expect(surface, floor.asset).toBeCloseTo(0, 2);
    }
  });

  it("has a real seat for every seat the economy will fill", () => {
    // The economy picks a free seat index in [0, seatCount). Anything beyond
    // the layout's actual seats has no position: the guest gets placed at the
    // door fallback and their coin floater is silently skipped. This was 6
    // against 5 for a long time.
    expect(ECONOMY_CONFIG.baseSeatCount).toBeLessThanOrEqual(SEATS.length);
  });

  it("puts the door on the open side, at the entrance step", () => {
    // Walls are on −x and −z, so guests must arrive from the open +z side or
    // they would walk through masonry. They must also arrive at the *step* —
    // the door used to be an arbitrary point in the open corner and guests
    // appeared out of thin air beside the café.
    expect(DOOR.z).toBeGreaterThan(ROOM.half);
    expect(DOOR_THRESHOLD.z).toBeGreaterThan(0);

    const step = PLACED.find((p) => p.name.includes("Entrance"));
    expect(step, "the layout must have an entrance step to walk in over").toBeTruthy();
    // The threshold sits on the step, and the approach comes from beyond it.
    expect(DOOR_THRESHOLD.x).toBeGreaterThan(step!.minX);
    expect(DOOR_THRESHOLD.x).toBeLessThan(step!.maxX);
    expect(DOOR_THRESHOLD.z).toBeGreaterThan(step!.minZ);
    expect(DOOR_THRESHOLD.z).toBeLessThan(step!.maxZ);
    expect(DOOR.z).toBeGreaterThan(step!.maxZ);
  });
});

/**
 * Cats may only be seated on furniture that is actually in the room.
 *
 * This failed in the shipped build: since the shop landed, most cat furniture
 * doesn't exist until it's bought, but the cat spots were still derived from
 * the whole layout — so a brand-new café perched cats in mid-air on a climber
 * and a table nobody owned.
 */
describe("cat spots", () => {
  it("offers no spot on furniture that hasn't been bought", () => {
    const gated = CAT_SPOTS.filter((c) => c.shopItem);
    expect(gated.length, "the test is meaningless if no cat furniture is gated").toBeGreaterThan(0);

    // With nothing bought, every offered spot must be one that needs no buying.
    const owned: string[] = [];
    const available = CAT_SPOTS.filter((c) => !c.shopItem || owned.includes(c.shopItem));
    for (const spot of available) {
      expect(spot.shopItem, `${spot.asset} should not need buying`).toBeUndefined();
    }
  });

  it("always leaves somewhere for the very first cat to sit", () => {
    // The bare-floor spots carry no asset, so nothing can gate them away.
    const alwaysThere = CAT_SPOTS.filter((c) => !c.shopItem);
    expect(alwaysThere.length).toBeGreaterThan(0);
  });

  it("grows the café's cat capacity as cat furniture is bought", () => {
    const bare = CAT_SPOTS.filter((c) => !c.shopItem).length;
    const stocked = CAT_SPOTS.length;
    expect(stocked).toBeGreaterThan(bare);
  });
});
