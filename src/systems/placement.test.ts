import { describe, expect, it } from "vitest";
import {
  GRID,
  checkPlacement,
  boundsOf,
  footprintAt,
  turnedBox,
  rejectionMessage,
  snapToGrid,
  type Obstacle,
  type Point,
} from "@/systems/placement";

/**
 * The rules that decide whether a dragged piece may be dropped. These matter
 * more than most: a false *yes* puts furniture inside other furniture or
 * across the path guests walk (there is no pathfinding — they'd walk through
 * it), and a false *no* is a player being told "not there" about somewhere
 * perfectly reasonable, with no explanation available.
 */

const FLOOR = { minX: -2, maxX: 2, minZ: -2, maxZ: 2 };
const RULES = { surfaces: [FLOOR], routeClearance: 0.3 };
/** A route well away from the middle of the room, so it isn't the thing under
 *  test in the collision cases. */
const ROUTE: Point[] = [
  { x: -1.9, z: 1.9 },
  { x: -1.9, z: 1.5 },
];
const SIZE = { x: 0.5, z: 0.5 };

const solid = (x: number, z: number, id?: string): Obstacle => ({
  ...footprintAt(SIZE, x, z),
  id,
  flat: false,
});

/**
 * The four rules the authored café broke, each pinned separately.
 *
 * All of these were live for weeks and invisible, because the move bar was
 * created after the first validity check and never showed the first answer
 * (see the 2026-08-25 log). With the bar telling the truth, every seat in the
 * café reported that it could not be put back where it came from.
 */
describe("the rules the café itself has to pass", () => {
  it("measures a turned piece as a rectangle, not as the box around it", () => {
    // A long piece at 45° has an enormous axis-aligned box. Before this, the
    // counter's box swallowed the bar stool tucked against it.
    const counter = turnedBox({ x: 2.5, z: 1 }, 0, 0, Math.PI / 4);
    const clear = turnedBox({ x: 0.46, z: 0.46 }, 1.2, -1.2, 0);
    // Inside the AABB…
    const bounds = boundsOf(counter);
    expect(clear.x).toBeGreaterThan(bounds.minX);
    expect(clear.z).toBeGreaterThan(bounds.minZ);
    // …and nowhere near the counter itself.
    const check = checkPlacement(
      boundsOf(clear),
      [{ ...boundsOf(counter), turned: counter, flat: false }],
      ROUTE,
      { surfaces: [FLOOR], routeClearance: 0.3 },
      { turned: clear },
    );
    expect(check.ok).toBe(true);
  });

  it("lets round pieces nestle, to the same depth the layout test allows", () => {
    // `cafe-room.test.ts` permits 0.3 of box overlap between props, because a
    // side table tucks into the curve of an armchair's arm. This validator has
    // to agree, or a piece cannot be put back where the layout authored it.
    const table = turnedBox({ x: 1, z: 1 }, 0, 0, 0);
    const at = (gap: number) => {
      const chair = turnedBox({ x: 1, z: 1 }, gap, 0, 0);
      return checkPlacement(
        boundsOf(chair),
        [{ ...boundsOf(table), turned: table, flat: false }],
        ROUTE,
        { surfaces: [FLOOR], routeClearance: 0.3 },
        { turned: chair },
      ).ok;
    };
    expect(at(0.75)).toBe(true); // 0.25 of overlap — nestling
    expect(at(0.5)).toBe(false); // half inside it — no
  });

  it("does not make a seat block the way to another seat", () => {
    // `DOOR_LOBBY` sits *inside* the café's own floor cushion, so counting
    // seats as obstacles made every chair in the room unreachable.
    const cushion = footprintAt({ x: 1, z: 1 }, 0, 0.8);
    const seat = footprintAt(SIZE, 0, -0.8);
    const rules = { ...RULES, approachFrom: { x: 0, z: 1.6 } };
    expect(
      checkPlacement(seat, [{ ...cushion, flat: false }], ROUTE, rules, { seat: true }).reason,
    ).toBe("unreachable");
    expect(
      checkPlacement(seat, [{ ...cushion, flat: false, seating: true }], ROUTE, rules, {
        seat: true,
      }).ok,
    ).toBe(true);
  });

  it("allows the overhang the reference render takes", () => {
    // The blue floor cushion by the door hangs about 0.12 past the lip of the
    // slab. Demanding all four corners on the floor refused the layout its own
    // furniture; hanging half off is still refused.
    const nudge = (over: number) => footprintAt({ x: 1, z: 1 }, 0, 2 - 0.5 + over);
    expect(checkPlacement(nudge(0.12), [], ROUTE, RULES).ok).toBe(true);
    expect(checkPlacement(nudge(0.4), [], ROUTE, RULES).ok).toBe(false);
  });
});

describe("snapping", () => {
  // Written in terms of GRID rather than literals: this test hard-coded 0.25
  // and failed the day the grid was coarsened to a visible block, which told
  // us nothing except that the constant had changed.
  it("snaps to the nearest grid line, including across zero", () => {
    expect(snapToGrid(GRID * 0.51)).toBeCloseTo(GRID, 6);
    expect(snapToGrid(GRID * 0.49)).toBeCloseTo(0, 6);
    expect(snapToGrid(GRID * -0.51)).toBeCloseTo(-GRID, 6);
    expect(snapToGrid(GRID * 3.2)).toBeCloseTo(GRID * 3, 6);
  });

  it("only ever lands on multiples of the grid", () => {
    for (let v = -2; v <= 2; v += 0.037) {
      const snapped = snapToGrid(v);
      expect(Math.abs(snapped / GRID - Math.round(snapped / GRID))).toBeLessThan(1e-9);
    }
  });
});

describe("placement rules", () => {
  it("allows a clear spot", () => {
    expect(checkPlacement(footprintAt(SIZE, 0, 0), [], ROUTE, RULES).ok).toBe(true);
  });

  it("refuses anything hanging off the floor", () => {
    for (const [x, z] of [
      [1.9, 0],
      [-1.9, 0],
      [0, 1.9],
      [0, -1.9],
    ]) {
      const check = checkPlacement(footprintAt(SIZE, x, z), [], ROUTE, RULES);
      expect(check.ok, `(${x},${z})`).toBe(false);
      expect(check.reason).toBe("off-floor");
    }
  });

  it("refuses a spot already occupied by something solid", () => {
    const check = checkPlacement(footprintAt(SIZE, 0, 0), [solid(0.1, 0.1)], ROUTE, RULES);
    expect(check.ok).toBe(false);
    expect(check.reason).toBe("overlaps");
  });

  it("ignores flat things, which are meant to be stood on", () => {
    const rug: Obstacle = { ...footprintAt({ x: 1.5, z: 1.5 }, 0, 0), flat: true };
    expect(checkPlacement(footprintAt(SIZE, 0, 0), [rug], ROUTE, RULES).ok).toBe(true);
  });

  it("never lets a piece collide with itself", () => {
    // Nudging something one grid step must not fail because it overlaps where
    // it currently is. Without the id exclusion, nothing could ever be moved.
    //
    // The piece is deliberately **wider than one grid step**, so a single-step
    // nudge genuinely still overlaps its old footprint — otherwise the second
    // assertion passes for the boring reason that the boxes no longer touch,
    // and stops testing the id exclusion at all.
    const wide = { x: GRID * 3, z: GRID * 3 };
    const self: Obstacle = { ...footprintAt(wide, 0, 0), id: "rug", flat: false };
    const nudged = footprintAt(wide, GRID, 0);
    expect(checkPlacement(nudged, [self], ROUTE, RULES, { id: "rug" }).ok).toBe(true);
    expect(checkPlacement(nudged, [self], ROUTE, RULES).ok).toBe(false);
  });

  it("keeps the guests' walking route clear", () => {
    const route: Point[] = [
      { x: 0, z: 1.8 },
      { x: 0, z: -1.8 },
    ];
    const onIt = checkPlacement(footprintAt(SIZE, 0, 0), [], route, RULES);
    expect(onIt.ok).toBe(false);
    expect(onIt.reason).toBe("blocks-walkway");

    // Well to the side of the same route is fine.
    expect(checkPlacement(footprintAt(SIZE, 1.5, 0), [], route, RULES).ok).toBe(true);
  });

  it("supports a piece spanning two adjoining surfaces", () => {
    // The entrance step juts out past the floor slab and the doormat sits on
    // it, straddling the join. A single-square floor test refused the rug's
    // own starting position — see PlacementRules.surfaces.
    const step = { minX: -1.95, maxX: -0.1, minZ: 2, maxZ: 2.35 };
    const onTheJoin = footprintAt({ x: 0.9, z: 0.6 }, -1.03, 2.05);

    expect(checkPlacement(onTheJoin, [], ROUTE, RULES).ok).toBe(false);
    expect(checkPlacement(onTheJoin, [], ROUTE, { ...RULES, surfaces: [FLOOR, step] }).ok).toBe(
      true,
    );
  });

  it("lets a rug slide under furniture and across the walkway", () => {
    // Flat pieces are exempt from collision *and* from the route check: a rug
    // is meant to go under the table and be walked on. Refusing that would
    // make the editor feel like a puzzle.
    const route: Point[] = [
      { x: 0, z: 1.8 },
      { x: 0, z: -1.8 },
    ];
    const table = solid(0, 0);
    const rug = footprintAt({ x: 1.2, z: 1.2 }, 0, 0);

    expect(checkPlacement(rug, [table], route, RULES).ok).toBe(false);
    expect(checkPlacement(rug, [table], route, RULES, { flat: true }).ok).toBe(true);
  });

  it("refuses a seat that nothing could walk to", () => {
    // Guests lerp straight to their chair — no pathfinding — so a seat behind
    // the counter is legal to stand and impossible to use.
    const lobby = { x: 1.4, z: 1.55 };
    const wall = { ...footprintAt({ x: 2, z: 0.4 }, 0, 0.6), flat: false };
    const behind = footprintAt(SIZE, 0, -0.6);
    const rules = { ...RULES, approachFrom: lobby };

    expect(checkPlacement(behind, [wall], ROUTE, rules, { seat: true }).reason).toBe("unreachable");
    // The same spot is fine for something nobody has to sit in.
    expect(checkPlacement(behind, [wall], ROUTE, rules).ok).toBe(true);
  });

  it("explains every refusal in the player's words", () => {
    for (const reason of ["off-floor", "overlaps", "blocks-walkway", "unreachable"] as const) {
      const message = rejectionMessage(reason);
      expect(message.length).toBeGreaterThan(0);
      // §9: the interface speaks lowercase.
      expect(message).toBe(message.toLowerCase());
    }
  });
});
