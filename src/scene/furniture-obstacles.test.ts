/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { obstacleFor, isFlat } from "@/scene/furniture-mover";
import { INSTANCE_INDEX_BASE, type FurnitureTag } from "@/scene/cafe-room";
import { CAFE_LAYOUT } from "@/data/cafe-layout";
import { checkPlacement, turnedBox, boundsOf } from "@/systems/placement";

/**
 * Which objects in the room the placement validator is allowed to ignore.
 *
 * **This is the half of collision that had no test, and it is where the bug
 * was.** `systems/placement.test.ts` proves the *rules* are right; nothing
 * proved that the room's furniture is actually handed to them. It wasn't:
 * every player-placed instance — each cat bed, each second plant, each copy —
 * was dropped on the floor of a loop, so pieces could be stacked on top of one
 * another with the ghost showing green. Ellis, 2026-08-17: *"i can place cat
 * beds and some other furniture on top of each other so hit boxes not properly
 * working."*
 */

const SIZE = { x: 0.6, y: 0.4, z: 0.6 } as unknown as FurnitureTag["size"];

/** A player-placed piece: a cat bed, a second plant, a copy of anything. */
const instanceTag = (n = 0, id = `inst-${n}`): FurnitureTag => ({
  index: INSTANCE_INDEX_BASE - n,
  asset: "Cat_Bed_A_Cream",
  id,
  movable: true,
  size: SIZE,
});

/** A generated wall segment: architecture, not furniture. */
const wallSegmentTag = (n = 0): FurnitureTag => ({
  index: -1 - n,
  asset: "Wall_A_Light_Corner_Mid",
  movable: false,
  size: SIZE,
});

describe("what counts as an obstacle", () => {
  it("counts a player-placed instance", () => {
    // The whole bug in one assertion: an instance has no `CAFE_LAYOUT` row,
    // and it is still a solid thing standing in the room.
    const obstacle = obstacleFor(instanceTag(), 1, 1, 0);
    expect(obstacle).not.toBeNull();
    expect(obstacle!.flat).toBe(false);
  });

  it("counts every instance, not just the first", () => {
    // Indices count *downward* from the base, so an off-by-one in the
    // comparison would keep the first bed and drop the rest — the failure
    // would then depend on how many you owned.
    for (const n of [0, 1, 2, 17]) {
      expect(obstacleFor(instanceTag(n), 0, 0, 0), `instance ${n}`).not.toBeNull();
    }
  });

  it("skips a generated wall segment", () => {
    // Architecture is handled by the supported-surface and wall-face checks.
    // Treating it as an obstacle would refuse the authored furniture that
    // stands against the wall.
    expect(obstacleFor(wallSegmentTag(), 0, -2, 0)).toBeNull();
    expect(obstacleFor(wallSegmentTag(3), 0, -2, 0)).toBeNull();
  });

  it("skips anything whose footprint was never measured", () => {
    expect(obstacleFor({ ...instanceTag(), size: undefined }, 0, 0, 0)).toBeNull();
  });

  it("still reads flatness and seating from the layout for authored pieces", () => {
    const rugIndex = CAFE_LAYOUT.findIndex((p) => p.id === "rug");
    const rug: FurnitureTag = {
      index: rugIndex,
      asset: CAFE_LAYOUT[rugIndex].asset,
      id: "rug",
      movable: true,
      size: SIZE,
    };
    expect(isFlat(rug)).toBe(true);
    expect(obstacleFor(rug, 0, 0, 0)!.flat).toBe(true);

    const seatIndex = CAFE_LAYOUT.findIndex((p) => p.seat === true);
    const seat: FurnitureTag = {
      index: seatIndex,
      asset: CAFE_LAYOUT[seatIndex].asset,
      movable: true,
      size: SIZE,
    };
    expect(obstacleFor(seat, 0, 0, 0)!.seating).toBe(true);
  });

  it("takes its angle from the caller, not from the layout", () => {
    // An instance stores its rotation on itself; a layout piece renders at
    // `rotY + rot`. Both arrive here as one world angle read off the mesh, so
    // a turned bed has to measure as a turned rectangle.
    const straight = obstacleFor({ ...instanceTag(), size: { x: 1.2, y: 0.4, z: 0.3 } as never }, 0, 0, 0)!;
    const turned = obstacleFor({ ...instanceTag(), size: { x: 1.2, y: 0.4, z: 0.3 } as never }, 0, 0, Math.PI / 2)!;
    expect(straight.maxX).toBeCloseTo(0.6, 5);
    expect(turned.maxX).toBeCloseTo(0.15, 5);
  });
});

describe("the validator refuses to stack furniture on an instance", () => {
  const FLOOR = { minX: -3, maxX: 3, minZ: -3, maxZ: 3 };
  /** Well clear of the middle, so the walking route is not what is under test. */
  const ROUTE = [
    { x: -2.9, z: 2.9 },
    { x: -2.9, z: 2.5 },
  ];
  const RULES = { surfaces: [FLOOR], routeClearance: 0.3, route: ROUTE };

  it("says no to a second cat bed on the same spot", () => {
    const existing = obstacleFor(instanceTag(0, "bed-1"), 0, 0, 0)!;
    const dropping = turnedBox({ x: 0.6, z: 0.6 }, 0, 0, 0);
    const check = checkPlacement(boundsOf(dropping), [existing], ROUTE, RULES, {
      id: "bed-2",
      flat: false,
      turned: dropping,
    });
    expect(check.ok).toBe(false);
  });

  it("says yes once it is moved clear", () => {
    const existing = obstacleFor(instanceTag(0, "bed-1"), 0, 0, 0)!;
    const dropping = turnedBox({ x: 0.6, z: 0.6 }, 1.5, 0, 0);
    const check = checkPlacement(boundsOf(dropping), [existing], ROUTE, RULES, {
      id: "bed-2",
      flat: false,
      turned: dropping,
    });
    expect(check.ok).toBe(true);
  });

  it("still lets a piece be nudged onto its own square", () => {
    // A piece must never collide with itself, or moving anything one grid step
    // fails.
    const self = obstacleFor(instanceTag(0, "bed-1"), 0, 0, 0)!;
    const dropping = turnedBox({ x: 0.6, z: 0.6 }, 0.25, 0, 0);
    const check = checkPlacement(boundsOf(dropping), [self], ROUTE, RULES, {
      id: "bed-1",
      flat: false,
      turned: dropping,
    });
    expect(check.ok).toBe(true);
  });
});
