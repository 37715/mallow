import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TUTORIAL_SPOTS } from "@/data/tutorial";
import { CAFE_LAYOUT, DOOR, DOOR_LOBBY, DOOR_THRESHOLD } from "@/data/cafe-layout";
import { GUIDE_SPOT } from "@/entities/tutorial-guide";
import {
  checkPlacement,
  turnedBox,
  boundsOf,
  snapToGrid,
  type Obstacle,
  type Point,
} from "@/systems/placement";

/**
 * Where the walkthrough puts the two pieces it asks you to buy.
 *
 * Ellis, 2026-08-27: *"id like if it could kinda force the chair to be placed
 * by the window and the cat bed more in the middle so it actually looks good
 * after completing tutorial instead of looking messy."*
 *
 * These are coordinates in a data file, which is the kind of thing that is
 * right once and then quietly wrong after somebody moves the counter. The
 * checks below are the ones a person would do by eye and cannot be bothered to
 * repeat: **do they fit, are they where they claim to be, and is the guide
 * standing on them.**
 */

const DIR = join(process.cwd(), "public/assets/cafe");
const FILES = ["Furniture.gltf", "Food_and_Deco.gltf", "Walls_Floors_Style_A.gltf"];

/** Footprints straight out of the pack, the same way `cafe-room.test.ts` does. */
function rotatedSize(min: number[], max: number[], q: number[]): number[] {
  const [x, y, z, w] = q;
  const m = [
    [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
    [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
    [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
  ];
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const px of [min[0], max[0]])
    for (const py of [min[1], max[1]])
      for (const pz of [min[2], max[2]])
        for (let r = 0; r < 3; r++) {
          const v = m[r][0] * px + m[r][1] * py + m[r][2] * pz;
          lo[r] = Math.min(lo[r], v);
          hi[r] = Math.max(hi[r], v);
        }
  return [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
}

const SIZES = new Map<string, number[]>();
for (const file of FILES) {
  const gltf = JSON.parse(readFileSync(join(DIR, file), "utf8")) as {
    nodes?: { name?: string; mesh?: number; rotation?: number[] }[];
    meshes?: { primitives: { attributes: Record<string, number> }[] }[];
    accessors?: { min?: number[]; max?: number[] }[];
  };
  for (const node of gltf.nodes ?? []) {
    if (node.mesh === undefined || !node.name || SIZES.has(node.name)) continue;
    const a = gltf.meshes![node.mesh].primitives[0].attributes.POSITION;
    const { min, max } = gltf.accessors![a];
    SIZES.set(node.name, rotatedSize(min!, max!, node.rotation ?? [0, 0, 0, 1]));
  }
}

const ROUTE: Point[] = [DOOR, DOOR_THRESHOLD, DOOR_LOBBY];
const RULES = {
  surfaces: [
    { minX: -2, maxX: 2, minZ: -2, maxZ: 2 },
    { minX: -2, maxX: -0.1333, minZ: 2, maxZ: 2.7 },
  ],
  routeClearance: 0.34,
  approachFrom: DOOR_LOBBY,
  walls: [
    { axis: "x" as const, at: -2, from: -2, to: 2 },
    { axis: "z" as const, at: -2, from: -2, to: 2 },
  ],
};

/** The café as the walkthrough finds it: bare, plus anything already bought. */
function obstacles(bought: string[]): Obstacle[] {
  const out: Obstacle[] = [];
  for (const item of CAFE_LAYOUT) {
    if (item.shopItem && !bought.includes(item.shopItem)) continue;
    if (item.asset.startsWith("Wall") || item.asset.startsWith("Flooring")) continue;
    const size = SIZES.get(item.asset);
    if (!size) continue;
    const s = item.scale ?? 1;
    const box = turnedBox({ x: size[0] * s, z: size[2] * s }, item.x, item.z, item.rotY ?? 0);
    out.push({
      ...boundsOf(box),
      turned: box,
      id: item.id,
      flat: item.walkOver === true,
      seating: item.seat === true,
      wall: (item.y ?? 0) > 1.2,
    });
  }
  return out;
}

/**
 * `id` is not optional in spirit: a bought piece is *already standing in the
 * room* at its authored spot while you drag its ghost, so the validator has to
 * be told which obstacle is the thing in your hand. Leaving it out makes every
 * piece collide with itself, which is how this test first "failed".
 */
function fits(
  asset: string,
  at: Point,
  bought: string[],
  seat: boolean,
  id?: string,
  rotY = 0,
): boolean {
  const size = SIZES.get(asset)!;
  // The mover snaps before it checks, so the test has to as well — a spot that
  // is only valid off-grid is a spot the player can never be handed.
  const box = turnedBox({ x: size[0], z: size[2] }, snapToGrid(at.x), snapToGrid(at.z), rotY);
  return checkPlacement(boundsOf(box), obstacles(bought), ROUTE, RULES, {
    id,
    seat,
    turned: box,
  }).ok;
}

describe("where the walkthrough puts things", () => {
  const armchair = CAFE_LAYOUT.find((p) => p.id === "armchair")!;

  it("suggests a spot for both halves of each step", () => {
    // The ghost appears when a piece is *bought*, before the guide has moved on
    // to "now put it down" — so keying only the place-* task would suggest
    // nothing at the one moment it matters.
    for (const task of ["buy-bed", "place-bed", "buy-chair", "place-chair"] as const) {
      expect(TUTORIAL_SPOTS[task], task).toBeDefined();
    }
  });

  it("puts the armchair exactly where the reference render has it", () => {
    // Read from the layout rather than copied, so this can only fail if
    // somebody moves the armchair and means it.
    expect(TUTORIAL_SPOTS["place-chair"]).toEqual({ x: armchair.x, z: armchair.z });
  });

  it("suggests spots the piece actually fits in", () => {
    // A suggestion the validator refuses would hand the player a red ghost as
    // their first experience of placing anything.
    expect(fits("Cat_Bed_A_Cream", TUTORIAL_SPOTS["place-bed"]!, [], false)).toBe(true);
    expect(
      fits(
        armchair.asset,
        TUTORIAL_SPOTS["place-chair"]!,
        ["armchair"],
        true,
        "armchair",
        armchair.rotY,
      ),
    ).toBe(true);
  });

  it("does not put the bed where the armchair is about to go", () => {
    // The bed is placed two steps earlier, so a clash would only show up as the
    // *second* piece being refused — after the player had done as they were told.
    const bed = TUTORIAL_SPOTS["place-bed"]!;
    const chair = TUTORIAL_SPOTS["place-chair"]!;
    expect(Math.hypot(bed.x - chair.x, bed.z - chair.z)).toBeGreaterThan(1.2);
  });

  it("keeps both spots clear of where the guide stands", () => {
    // The whole complaint. She is not an obstacle, so nothing refuses a spot
    // she is on — it just looks and feels blocked, which is worse than a rule.
    for (const [task, at] of Object.entries(TUTORIAL_SPOTS)) {
      const away = Math.hypot(at!.x - GUIDE_SPOT.x, at!.z - GUIDE_SPOT.z);
      expect(away, `${task} is ${away.toFixed(2)} from the guide`).toBeGreaterThan(1.2);
    }
  });
});

