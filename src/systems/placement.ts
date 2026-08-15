/**
 * Where a piece of furniture may stand (§8 "The café editor", step 4).
 *
 * Pure logic, no three.js — the caller measures the meshes and hands in plain
 * boxes, which keeps this testable and keeps §7's rule that `systems/` could
 * run without a renderer.
 *
 * **These are the same rules `scene/cafe-room.test.ts` applies to the authored
 * layout**, which is the point: the test that has been catching bad hand-placed
 * furniture for weeks now catches bad *player*-placed furniture too, at
 * runtime, before the piece is dropped rather than after.
 */

/**
 * Snap increment, in world units. The room is 4×4, so this is an 8×8 grid.
 *
 * **Half a unit, and the grid is drawn while you place** (2026-08-10). Ellis:
 * *"it snaps across blocks. everything should be blocks."* It was a quarter,
 * which is fine enough to line two pieces up but too fine to *see* — the snap
 * existed and read as free-form drift. Half a unit is a block you can watch
 * the ghost step across, which is the difference between a game that snaps and
 * a game that feels like it snaps.
 *
 * Still chosen against the pack rather than by taste: the modular tile is 4
 * units, so this divides it evenly eight ways, and the small props are 0.4–0.8
 * across — about one block each.
 */
export const GRID = 0.5;

export interface Footprint {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Obstacle extends Footprint {
  /** Layout id, if it has one — so a piece never collides with itself. */
  id?: string;
  /**
   * A seat or a table — something a guest is *expected* to brush past.
   *
   * **This is what the runtime validator was missing.** `cafe-room.test.ts`
   * has always skipped chairs, sofas, cushions and tables when checking that
   * a guest can walk to their seat, on the grounds that the café's seating is
   * pushed up against itself on purpose and clipping a cushion on the way to
   * an armchair is not a bug. The runtime check did not, so it disagreed with
   * the layout test about the layout — and every seat came out unreachable at
   * its own authored position, because `DOOR_LOBBY` sits *inside* the floor
   * cushion by the door. Pick one up and you could never put it back.
   */
  seating?: boolean;
  /**
   * The piece's real rectangle, if it stands at an angle. Given, the collision
   * test is exact; omitted, it falls back to the axis-aligned box.
   */
  turned?: Turned;
  /** Hangs on a wall. Only ever collides with other wall pieces. */
  wall?: boolean;
  /**
   * Flat things (floors, rugs, cushions) are *meant* to be stood on, so they
   * never block. Same exemption the layout test makes.
   */
  flat: boolean;
}

export interface Point {
  x: number;
  z: number;
}

/**
 * A rectangle that may be standing at an angle.
 *
 * **Why an axis-aligned box is not enough.** Half the café is authored on the
 * diagonal — the counter, the stools, the armchair — and the axis-aligned box
 * round a long thing turned 45° is enormous: the kitchen counter's AABB
 * swallows the stool tucked against it, so the stool could not be put back
 * where it came from ("something's already there", against nothing). Turning
 * a piece made the same wrongness appear on the piece in your hand.
 *
 * So collision is done on the real rectangles, by separating axis. It is exact
 * for two rectangles, it costs four dot products, and it collapses to the
 * plain box test when both angles are zero — which is why every existing
 * caller that passes no angle keeps its old behaviour.
 */
export interface Turned {
  /** Centre, in world units. */
  x: number;
  z: number;
  /** Half-extents in the piece's *own* frame, before rotation. */
  halfX: number;
  halfZ: number;
  /** Rotation about Y, in radians. */
  angle: number;
}

/** A turned rectangle from a size, a position and an angle. */
export function turnedBox(
  size: { x: number; z: number },
  x: number,
  z: number,
  angle: number,
): Turned {
  return { x, z, halfX: size.x / 2, halfZ: size.z / 2, angle };
}

/** The world axes of a turned box: where its own +x and +z point. */
function axesOf(box: Turned): [Point, Point] {
  const cos = Math.cos(box.angle);
  const sin = Math.sin(box.angle);
  // three.js rotates about +Y as x' = x·cos + z·sin, z' = −x·sin + z·cos.
  return [
    { x: cos, z: -sin },
    { x: sin, z: cos },
  ];
}

/** The four world corners of a turned box. */
export function cornersOf(box: Turned): Point[] {
  const [ax, az] = axesOf(box);
  const out: Point[] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      out.push({
        x: box.x + ax.x * box.halfX * sx + az.x * box.halfZ * sz,
        z: box.z + ax.z * box.halfX * sx + az.z * box.halfZ * sz,
      });
    }
  }
  return out;
}

/** The axis-aligned box that contains a turned one. */
export function boundsOf(box: Turned): Footprint {
  const corners = cornersOf(box);
  return {
    minX: Math.min(...corners.map((c) => c.x)),
    maxX: Math.max(...corners.map((c) => c.x)),
    minZ: Math.min(...corners.map((c) => c.z)),
    maxZ: Math.max(...corners.map((c) => c.z)),
  };
}

/** How far a box reaches along an axis from its own centre. */
function reach(box: Turned, axis: Point): number {
  const [ax, az] = axesOf(box);
  return (
    Math.abs((ax.x * axis.x + ax.z * axis.z) * box.halfX) +
    Math.abs((az.x * axis.x + az.z * axis.z) * box.halfZ)
  );
}

/** Separating-axis test for two rectangles. Exact. */
function turnedOverlap(a: Turned, b: Turned, slack: number): boolean {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  for (const axis of [...axesOf(a), ...axesOf(b)]) {
    const gap = Math.abs(dx * axis.x + dz * axis.z);
    // `slack` forgives a shared edge: pieces authored flush against each other
    // must not read as colliding.
    if (gap >= reach(a, axis) + reach(b, axis) - slack) return false;
  }
  return true;
}

export type PlacementRejection =
  | "off-floor"
  | "overlaps"
  | "blocks-walkway"
  | "unreachable"
  | "off-wall"
  | "glazed";

/**
 * The inner face of one wall run, as a line the room can hang things on.
 *
 * Ellis, 2026-08-25: *"need an empty wall for a blackboard thing and should be
 * able to choose which wall it goes on with red and green thing like usual."*
 * A wall piece is not on the grid and not on the floor, so it needs its own
 * rule: near a wall, within that wall's span, and not on top of another wall
 * piece. Everything else — the ghost, the red and green, the move bar — is the
 * same machinery.
 */
export interface WallFace {
  /** Which coordinate is fixed: "x" for the −x run, "z" for the −z run. */
  axis: "x" | "z";
  /** Where that coordinate sits. */
  at: number;
  /** The segment's extent along the other axis. */
  from: number;
  to: number;
  /** This segment has a window in it, so there is no plaster to hang on. */
  glazed?: boolean;
}

/** How far from a wall a hanging piece may drift before it is not on it. */
export const WALL_REACH = 0.6;

/** The wall this piece is closest to, or null if it is out in the room. */
export function nearestWall(at: Point, walls: WallFace[]): WallFace | null {
  let best: WallFace | null = null;
  let bestGap = WALL_REACH;
  for (const wall of walls) {
    const along = wall.axis === "x" ? at.z : at.x;
    if (along < wall.from || along > wall.to) continue;
    const gap = Math.abs((wall.axis === "x" ? at.x : at.z) - wall.at);
    if (gap <= bestGap) {
      bestGap = gap;
      best = wall;
    }
  }
  return best;
}

/** Which way a piece on this wall must face, as a rotation about Y. */
export function wallFacing(wall: WallFace): number {
  // A piece's own front is +z, so the −z wall needs no turn and the −x wall a
  // quarter. Matches the blackboard's authored `rotY: HALF_PI` on the −x wall.
  return wall.axis === "x" ? Math.PI / 2 : 0;
}

export interface PlacementCheck {
  ok: boolean;
  reason?: PlacementRejection;
}

/** Nearest grid position. */
export function snapToGrid(value: number): number {
  return Math.round(value / GRID) * GRID;
}

/** The box a piece of the given footprint size would occupy centred at (x, z). */
export function footprintAt(size: { x: number; z: number }, x: number, z: number): Footprint {
  return {
    minX: x - size.x / 2,
    maxX: x + size.x / 2,
    minZ: z - size.z / 2,
    maxZ: z + size.z / 2,
  };
}

/**
 * How far two pieces may push into each other's boxes before it counts.
 *
 * **0.3, matching `cafe-room.test.ts`'s prop-vs-prop limit, and matched on
 * purpose.** It was 0.04 here, which is why a bar stool could not be put back
 * where the layout authored it: the stool tucks into the angled counter and
 * their boxes lap by about 0.06. The layout test has always allowed a quarter
 * of a unit for exactly this reason — *"round pieces nestle: the side table
 * tucks into the curve of the armchair's arm, so their boxes overlap by a
 * quarter-unit while the geometry never touches"* — and two validators
 * disagreeing about the same café is worse than either being slightly wrong.
 *
 * The cost is honest: two small pieces can be pushed a little way into one
 * another. That is the price of testing boxes against furniture that is not
 * box-shaped, and in a café where a chair nestling under a table is the
 * *desired* look it is the right side to err on.
 */
const NESTLE = 0.3;

function overlaps(
  a: Footprint,
  b: Footprint,
  slack = NESTLE,
  aTurned?: Turned,
  bTurned?: Turned,
): boolean {
  if (aTurned && bTurned) return turnedOverlap(aTurned, bTurned, slack);
  return (
    a.minX < b.maxX - slack &&
    a.maxX > b.minX + slack &&
    a.minZ < b.maxZ - slack &&
    a.maxZ > b.minZ + slack
  );
}

/** Shortest distance from a point to a line segment, in the xz plane. */
function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSq = dx * dx + dz * dz;
  if (lengthSq < 1e-9) return Math.hypot(p.x - a.x, p.z - a.z);
  let t = ((p.x - a.x) * dx + (p.z - a.z) * dz) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz));
}

/** Does this box sit on any leg of the guests' walking route? */
function blocksRoute(box: Footprint, route: Point[], clearance: number): boolean {
  const centre = { x: (box.minX + box.maxX) / 2, z: (box.minZ + box.maxZ) / 2 };
  // Treat the box as a disc of its half-diagonal. Generous on purpose: guests
  // have width, and clipping a guest through a plant pot is worse than
  // refusing a placement that was marginal anyway.
  const radius = Math.hypot(box.maxX - box.minX, box.maxZ - box.minZ) / 2;
  for (let i = 1; i < route.length; i++) {
    if (distanceToSegment(centre, route[i - 1], route[i]) < radius + clearance) return true;
  }
  return false;
}

export interface PlacementRules {
  /**
   * Every surface a piece may stand on, as boxes. A piece must be *entirely*
   * supported — each of its four corners has to land on one of these.
   *
   * **Not a single square.** The first version took one `floorHalf` and
   * refused the rug's own starting position, because the rug sits on the
   * entrance step, which juts out past the floor slab to z≈2.35. Anything that
   * legitimately lives on the step, the doormat included, was unplaceable.
   * A list also means the expansion tiles in §8 step 6 are just more entries.
   */
  surfaces: Footprint[];
  /** How much room to leave along the guests' route. */
  routeClearance: number;
  /** The walls a hanging piece may be put on. */
  walls?: WallFace[];
  /**
   * Where guests set off from inside the café. A *seat* moved somewhere with
   * furniture in the way is legal to stand but impossible to reach: guests
   * lerp straight to their chair with no pathfinding, so they would walk
   * through whatever is between. Only used when `MovingPiece.seat` is set.
   */
  approachFrom?: Point;
}

function contains(surface: Footprint, x: number, z: number, tolerance: number): boolean {
  return (
    x >= surface.minX - tolerance &&
    x <= surface.maxX + tolerance &&
    z >= surface.minZ - tolerance &&
    z <= surface.maxZ + tolerance
  );
}

/**
 * Is the piece standing on the floor rather than off the edge of it?
 *
 * **The corners are drawn in from the edges, and that is not a fudge.** The
 * café's own blue floor cushion by the door hangs about 0.12 over the lip of
 * the slab — the reference render takes that overhang and the room was rebuilt
 * from the reference — so "all four corners must land on floor" refused the
 * layout its own furniture. Pulling the test corners in by an eighth asks the
 * question the rule is actually for: *is most of this piece on the ground*,
 * not *is every millimetre of it*.
 */
const OVERHANG = 0.125;

function supported(box: Footprint, surfaces: Footprint[], turned?: Turned): boolean {
  const tolerance = 0.02;
  const corners: Point[] = turned
    ? cornersOf({ ...turned, halfX: turned.halfX * (1 - 2 * OVERHANG), halfZ: turned.halfZ * (1 - 2 * OVERHANG) })
    : cornersOf(
        turnedBox(
          { x: (box.maxX - box.minX) * (1 - 2 * OVERHANG), z: (box.maxZ - box.minZ) * (1 - 2 * OVERHANG) },
          (box.minX + box.maxX) / 2,
          (box.minZ + box.maxZ) / 2,
          0,
        ),
      );
  return corners.every(({ x, z }) => surfaces.some((s) => contains(s, x, z, tolerance)));
}

/** The piece being placed. */
export interface MovingPiece {
  /** Excluded from the obstacles, so a piece never blocks itself — without
   *  this, nudging something one grid step always fails. */
  id?: string;
  /**
   * Flat, like a rug. **Flat pieces skip collision and the walkway check
   * entirely**: a rug is *supposed* to slide under the table and be walked on,
   * and refusing that is the difference between an editor and a puzzle. The
   * only rule that still applies to them is staying on the floor.
   */
  flat?: boolean;
  /** A chair. Must end up somewhere a guest can actually walk to. */
  seat?: boolean;
  /** The piece's real rectangle, when it stands at an angle. See `Turned`. */
  turned?: Turned;
  /** Hangs on a wall instead of standing on the floor. */
  wall?: boolean;
}

/** May `candidate` go here? */
export function checkPlacement(
  candidate: Footprint,
  obstacles: Obstacle[],
  route: Point[],
  rules: PlacementRules,
  moving: MovingPiece = {},
): PlacementCheck {
  /**
   * A hanging piece is judged entirely differently, and the shortcut is the
   * honest description: it is not on the floor, it is not in anybody's way,
   * and the only thing it can clash with is another thing on the same wall.
   */
  if (moving.wall) {
    const centre = {
      x: (candidate.minX + candidate.maxX) / 2,
      z: (candidate.minZ + candidate.maxZ) / 2,
    };
    const wall = nearestWall(centre, rules.walls ?? []);
    if (!wall) return { ok: false, reason: "off-wall" };
    // Glass is not a wall. The pack's window is a hole cut in the wall piece,
    // so a board hung here would be nailed to the view.
    if (wall.glazed) return { ok: false, reason: "glazed" };
    for (const other of obstacles) {
      if (!other.wall) continue;
      if (moving.id !== undefined && other.id === moving.id) continue;
      if (overlaps(candidate, other, NESTLE, moving.turned, other.turned)) {
        return { ok: false, reason: "overlaps" };
      }
    }
    return { ok: true };
  }

  if (!supported(candidate, rules.surfaces, moving.turned)) {
    return { ok: false, reason: "off-floor" };
  }
  if (moving.flat) return { ok: true };

  for (const other of obstacles) {
    if (other.flat) continue;
    if (moving.id !== undefined && other.id === moving.id) continue;
    if (overlaps(candidate, other, NESTLE, moving.turned, other.turned)) {
      return { ok: false, reason: "overlaps" };
    }
  }

  // A seat is allowed to stand on the walking route — that is what the café's
  // own cushion by the door does. Everything else has to keep out of the way.
  if (!moving.seat && blocksRoute(candidate, route, rules.routeClearance)) {
    return { ok: false, reason: "blocks-walkway" };
  }

  if (moving.seat && rules.approachFrom) {
    const centre = { x: (candidate.minX + candidate.maxX) / 2, z: (candidate.minZ + candidate.maxZ) / 2 };
    for (const other of obstacles) {
      if (other.flat || other.seating) continue;
      if (moving.id !== undefined && other.id === moving.id) continue;
      // Sample the approach rather than doing exact segment/box maths: the
      // boxes are small and this runs once per pointer move, not per frame.
      for (let t = 0.05; t < 0.95; t += 0.05) {
        const x = rules.approachFrom.x + (centre.x - rules.approachFrom.x) * t;
        const z = rules.approachFrom.z + (centre.z - rules.approachFrom.z) * t;
        if (contains(other, x, z, -0.06)) return { ok: false, reason: "unreachable" };
      }
    }
  }

  return { ok: true };
}

/** What to tell the player when a spot is refused. Lowercase, per §9's voice. */
export function rejectionMessage(reason: PlacementRejection): string {
  switch (reason) {
    case "off-floor":
      return "keep it on the floor";
    case "overlaps":
      return "something's already there";
    case "blocks-walkway":
      return "guests need to get past";
    case "unreachable":
      return "no way to reach that seat";
    case "off-wall":
      return "hang it on a wall";
    case "glazed":
      return "that wall is a window";
  }
}
