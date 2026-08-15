import { describe, expect, it } from "vitest";
import {
  HOME_TILE,
  PATCH,
  MAX_PATCHES,
  expansionCandidates,
  expansionCost,
  floorBounds,
  isRoomPatch,
  ownedPatches,
  tileKey,
  HOME_WINDOW,
  wallSegmentId,
} from "@/data/expansion";
import { expansionPlacements, wallSegments } from "@/scene/cafe-tiles";

/**
 * Expansion's rules.
 *
 * The shape of the feature is: **patios, not rooms.** A bought square is half
 * the pack's module, sits outside the walled footprint, and carries no walls —
 * which is what lets the squares be small at all, since the wall kit is
 * authored in 4-unit handed pieces that cannot be halved. Every test here
 * guards one edge of that.
 */
const style = { walls: "A", floor: "A" };
const names = (tiles: string[]) => expansionPlacements(tiles, style, [HOME_WINDOW]).map((p) => p.asset);

describe("expansion rules", () => {
  it("treats the walled room as a square that cannot be bought", () => {
    expect(isRoomPatch({ x: 0, z: 0 })).toBe(true);
    expect(ownedPatches([HOME_TILE, "0,0"])).toEqual([]);
  });

  it("only offers squares touching floor you already own", () => {
    expect(expansionCandidates([HOME_TILE]).map(tileKey)).toEqual(["0,1", "1,0"]);
    // Reaching further out needs a square to reach *from*.
    expect(expansionCandidates([HOME_TILE, "1,0"]).map(tileKey)).toContain("2,0");
  });

  it("never offers floor inside the walls, or behind them", () => {
    for (const spot of expansionCandidates([HOME_TILE, "1,0", "0,1"])) {
      expect(isRoomPatch(spot)).toBe(false);
      expect(spot.x).toBeGreaterThanOrEqual(0);
      expect(spot.z).toBeGreaterThanOrEqual(0);
    }
  });

  it("stops offering squares once the cap is reached", () => {
    expect(expansionCandidates([HOME_TILE, "1,0", "0,1", "1,1"])).toEqual([]);
  });

  it("keeps the dearest square inside the till", () => {
    // A price above the most money the game can hold is not expensive, broken.
    expect(expansionCost(MAX_PATCHES - 1)).toBeLessThan(9999);
  });

  it("grows the floor bounds by one patch at a time", () => {
    const one = floorBounds([HOME_TILE]);
    const two = floorBounds([HOME_TILE, "1,0"]);
    expect(two.maxX).toBeCloseTo(one.maxX + PATCH, 6);
    expect(two.maxZ).toBeCloseTo(one.maxZ, 6);
  });
});

describe("what a patch draws", () => {
  it("reproduces the authored café exactly before anything is bought", () => {
    /**
     * **The load-bearing test for the wall generator.**
     *
     * Walls stopped coming from the layout when windows became buyable — a
     * window belongs to a *segment*, and the layout's two hard-coded pieces
     * had no segment identity to hang one on. So `cafe-room.ts` now always
     * skips the layout's wall rows and always takes the generated runs, which
     * means these two lines are the only thing standing between the player and
     * a café whose walls quietly changed shape overnight.
     *
     * No floor: the room's own slab is authored, and drawing a second one on
     * top of it z-fights.
     */
    const home = expansionPlacements([HOME_TILE], style, [HOME_WINDOW]);
    expect(home.map((p) => p.asset)).toEqual([
      "Wall_A_Light_Corner_End_X",
      "Wall_A_Window_Dark_Corner_End_XL",
    ]);
    expect(home.every((p) => p.x === 0 && p.z === 0)).toBe(true);
  });

  it("bricks up a wall whose window was never bought", () => {
    expect(expansionPlacements([HOME_TILE], style, []).map((p) => p.asset)).toEqual([
      "Wall_A_Light_Corner_End_X",
      "Wall_A_Dark_Corner_End_XL",
    ]);
  });

  it("glazes the segment you paid for, and only that one", () => {
    const both = expansionPlacements([HOME_TILE, "1,0"], style, [
      HOME_WINDOW,
      wallSegmentId("left", { x: 0, z: 0 }),
    ]).map((p) => p.asset);
    expect(both).toContain("Wall_A_Window_Light_Corner_End_X");
    // The square bought to the +x carries the run onward, and it is still bare.
    expect(both).toContain("Wall_A_Dark_Mid_End_XL");
  });

  it("names a segment by its wall and square, so growing never moves a window", () => {
    // A corner piece becomes a mid piece when the café builds past it. The
    // *piece* changes; the id must not, or the glass jumps to another wall.
    const before = wallSegments([HOME_TILE], [HOME_WINDOW]);
    const after = wallSegments([HOME_TILE, "1,0"], [HOME_WINDOW]);
    expect(before.find((w) => w.glazed)!.id).toBe(after.find((w) => w.glazed)!.id);
  });

  it("stops offering a wall that the café has grown around", () => {
    // Buy the square in front of the back wall's neighbour and that neighbour
    // is interior now — there is no wall there to put a window in.
    const walls = wallSegments([HOME_TILE, "1,0"], [HOME_WINDOW]).map((w) => w.id);
    expect(walls).toContain(wallSegmentId("back", { x: 1, z: 0 }));
    expect(walls).not.toContain(wallSegmentId("left", { x: 1, z: 0 }));
  });

  /**
   * The wall lookup, named piece by piece.
   *
   * `Light` is authored for a square's −x edge and `Dark` for its −z; `Corner`
   * turns the corner, `Mid` runs straight, `Mid_End_X`/`_XL` finish the run in
   * the small rounded end or the big arch. Getting this wrong turns the café
   * inside-out, which is a failure you can only see by looking at it — so the
   * exact names live here.
   */
  it("turns the corner and finishes each run with its own end piece", () => {
    expect(names([HOME_TILE, "1,0"])).toEqual([
      "Flooring_A_Tiling",
      "Wall_A_Light_Corner_End_X",
      "Wall_A_Window_Dark_Corner_Mid",
      "Wall_A_Dark_Mid_End_XL",
    ]);
  });

  it("keeps the window on the home square wherever the café grows", () => {
    for (const tiles of [[HOME_TILE, "1,0"], [HOME_TILE, "1,0", "2,0"], [HOME_TILE, "0,1"]]) {
      expect(names(tiles).filter((n) => n.includes("Window"))).toHaveLength(1);
    }
  });

  it("gives every bought square a floor, and only the bought ones", () => {
    const floors = names([HOME_TILE, "1,0", "1,1"]).filter((n) => n.startsWith("Flooring"));
    expect(floors).toHaveLength(2);
  });

  it("marks floor walk-over, or you could not stand on what you bought", () => {
    const floors = expansionPlacements([HOME_TILE, "1,0"], style, [HOME_WINDOW]).filter((p) =>
      p.asset.startsWith("Flooring"),
    );
    expect(floors.length).toBeGreaterThan(0);
    expect(floors.every((p) => p.walkOver)).toBe(true);
  });

  it("follows the chosen floor and wall colourways", () => {
    const drawn = expansionPlacements([HOME_TILE, "1,0"], { walls: "C", floor: "B" }, [HOME_WINDOW]);
    expect(drawn.filter((p) => p.asset.startsWith("Flooring")).map((p) => p.asset)).toEqual([
      "Flooring_B_Tiling",
    ]);
    expect(drawn.filter((p) => p.asset.startsWith("Wall")).every((p) => p.asset.includes("_C_")))
      .toBe(true);
  });
});
