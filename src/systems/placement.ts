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
  /**
   * How tall it is, in world units. Only the seat-approach check reads it: a
   * guest steps over a cat bed and walks round a counter (see `STEP_OVER`).
   *
   * Optional, and **absent means "assume it blocks"** rather than "assume it
   * does not" — a caller that has not measured a piece should not have that
   * silently turn into permission.
   */
  height?: number;
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

/**
 * How tall something has to be before a guest would go *round* it rather than
 * over it, in world units — knee height.
 *
 * Measured against the pack rather than picked: the things this is meant to
 * catch are the counter (0.78), the kitchen bench (0.72), the cake display
 * (1.08), the side table (0.78) and the cat climber (1.45). The things it is
 * meant to let through are the cat bed (0.25), a floor cushion (0.24), the low
 * table (0.38) and a rug (0.04). There is a clear gap between the two groups —
 * 0.38 to 0.72 — so this can sit in the middle of it and is not a tuning knob
 * anyone should need to touch.
 *
 * It only relaxes the *seat approach*. Nothing here changes what a piece may
 * overlap: a cat bed still cannot be stood on by a chair.
 */
const STEP_OVER = 0.5;

/**
 * The most a *small* piece may be pushed into another before it counts.
 *
 * **A fixed 0.3 is a licence to stack anything small.** Slack is subtracted
 * from the two pieces' combined reach, so it is only "a shared edge forgiven"
 * when both pieces are large compared to it. A cat bed's half-extent is about
 * a quarter of a unit — so at 0.3 one could be dropped almost exactly on top
 * of a floor cushion and pass, which is how Ellis, 2026-08-26, saw *"characters
 * sitting on a cat bed on top of a cat"*: the guest sits where the layout says
 * the cushion is, and the cat sits in the bed occupying the same square.
 *
 * So the allowance is capped by the smallest half-extent in the pair. Big
 * furniture keeps the full 0.3 — the stool still tucks into the angled counter,
 * the side table still nestles into the armchair's arm, which is what the
 * constant was raised to 0.3 for in the first place — while two small things
 * are held nearly to their real edges, where the box is a good description of
 * the shape anyway.
 */
function nestleFor(a: Turned, b: Turned): number {
  const smallest = Math.min(a.halfX, a.halfZ, b.halfX, b.halfZ);
  // **0.6, and the two ends of the range pick it, not taste.** A unit-square
  // piece has to keep the whole 0.3 (0.5 × 0.6 = 0.3) or the side table stops
  // nestling into the armchair and the layout cannot be rebuilt by hand; a
  // half-unit piece must get well under 0.25, or half-on-top still passes.
  // Anything from about 0.5 to 0.8 satisfies both — 0.6 sits clear of each
  // boundary rather than exactly on one.
  return Math.min(NESTLE, smallest * 0.6);
}

function overlaps(
  a: Footprint,
  b: Footprint,
  slack = NESTLE,
  aTurned?: Turned,
  bTurned?: Turned,
): boolean {
  if (aTurned && bTurned) return turnedOverlap(aTurned, bTurned, Math.min(slack, nestleFor(aTurned, bTurned)));
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

/** Does a segment cross a box centred on the origin? Slab clipping. */
function segmentHitsBox(p: Point, q: Point, halfX: number, halfZ: number): boolean {
  let near = 0;
  let far = 1;
  const spans: [number, number, number][] = [
    [p.x, q.x - p.x, halfX],
    [p.z, q.z - p.z, halfZ],
  ];
  for (const [from, delta, half] of spans) {
    if (Math.abs(delta) < 1e-9) {
      if (from < -half || from > half) return false;
      continue;
    }
    const a = (-half - from) / delta;
    const b = (half - from) / delta;
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
    if (near > far) return false;
  }
  return true;
}

/**
 * Shortest distance from a turned rectangle to a line segment. Zero if they
 * touch.
 *
 * **This replaced a disc, and the disc is what made the walkway rule feel
 * arbitrary** (Ellis, 2026-08-26: *"the pathway that people walk through
 * making objects unplacable can be innacruate or random like i cant place a
 * furniture somewhere they nobody even needs to walk"*). The old test took the
 * piece's half-*diagonal* as a radius, so a 1.16 × 1.02 cat climber carried a
 * 0.77-unit circle round its centre and then had the guests' clearance added
 * on top of that — a metre and a bit of forbidden floor in a room four metres
 * across, in a *circle*, round a piece that is a rectangle. Worse, the radius
 * came off the axis-aligned bounds, so turning a piece 45° grew its no-go
 * zone by a third without changing the piece at all.
 *
 * Exact costs almost nothing here — this runs once per pointer move — and it
 * is the difference between a rule the player can see (*that would be in the
 * doorway*) and one they cannot (*that is within a metre of the doorway*).
 */
export function rectToSegment(rect: Turned, a: Point, b: Point): number {
  const [ax, az] = axesOf(rect);
  // Into the rectangle's own frame, where it is an axis-aligned box at the
  // origin and the whole thing is two slab tests and four corners.
  const local = (p: Point): Point => {
    const dx = p.x - rect.x;
    const dz = p.z - rect.z;
    return { x: dx * ax.x + dz * ax.z, z: dx * az.x + dz * az.z };
  };
  const p = local(a);
  const q = local(b);
  const { halfX, halfZ } = rect;
  if (segmentHitsBox(p, q, halfX, halfZ)) return 0;

  const toBox = (v: Point): number =>
    Math.hypot(Math.max(0, Math.abs(v.x) - halfX), Math.max(0, Math.abs(v.z) - halfZ));
  // Two convex shapes that miss each other are closest at a vertex of one and
  // a point on an edge of the other, so these six candidates are exhaustive.
  let best = Math.min(toBox(p), toBox(q));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      best = Math.min(best, distanceToSegment({ x: sx * halfX, z: sz * halfZ }, p, q));
    }
  }
  return best;
}

/** Does this piece sit on any leg of the guests' walking route? */
function blocksRoute(box: Turned, route: Point[], clearance: number): boolean {
  for (let i = 1; i < route.length; i++) {
    if (rectToSegment(box, route[i - 1], route[i]) < clearance) return true;
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
   * Where guests set off from on their way to a seat.
   *
   * A seat moved somewhere with something big in the way is legal to stand and
   * impossible to reach: guests lerp straight to their chair with no
   * pathfinding, so they would walk through whatever is between. Only used
   * when `MovingPiece.seat` is set.
   *
   * **It has to be the counter, not the door.** Guests have ordered at the
   * counter before they sit down since 2026-08-26, so the last leg of the walk
   * is counter → chair; this said `DOOR_LOBBY` for a year after that stopped
   * being true, and was enforcing a constraint about a journey nobody makes.
   * See `visitor-manager.ts` — the route there is the authority.
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

/**
 * How far past a walled edge of the floor a piece may reach. Nothing.
 *
 * **A wall has no lip to hang over, and that is the whole of the fix** (Ellis,
 * 2026-08-26: *"sometimes i can place stuff inside other things and part of
 * walls"*). `OVERHANG` is a *proportion*, so the bigger the piece the further
 * it was allowed past the floor's edge — a quarter of its half-extent, which
 * for an armchair is 0.22 and for the cat climber 0.29. Over the open lip of
 * the slab that is right and is what the rule was written for; over the −x or
 * −z edge it walks the piece straight into the plaster.
 *
 * Measured rather than guessed, and the measurement is the good news: **at
 * furniture height every wall in every style has its inner face 0.05 *inside*
 * the tile edge.** The window wall's famous 0.68 thickness is the sill ledge,
 * which does not begin until y ≈ 0.6 — below it there is the same 0.30 of
 * plaster as anywhere else. So a piece that stays within 0.02 of the tile edge
 * is at worst 0.07 into the wall, which cannot be seen, and the authored
 * pieces that deliberately tuck under the sill (the side table at z −1.96, the
 * cat climber at −1.93) still go back exactly where the layout puts them.
 */
const WALL_BITE = 0.02;

/** The rectangle a footprint describes, for callers that give no angle. */
function rectOf(box: Footprint, turned?: Turned): Turned {
  return (
    turned ??
    turnedBox(
      { x: box.maxX - box.minX, z: box.maxZ - box.minZ },
      (box.minX + box.maxX) / 2,
      (box.minZ + box.maxZ) / 2,
      0,
    )
  );
}

function supported(
  box: Footprint,
  surfaces: Footprint[],
  turned?: Turned,
  walls: WallFace[] = [],
): boolean {
  const tolerance = 0.02;
  const real = rectOf(box, turned);
  const inset = cornersOf({
    ...real,
    halfX: real.halfX * (1 - 2 * OVERHANG),
    halfZ: real.halfZ * (1 - 2 * OVERHANG),
  });
  if (!inset.every(({ x, z }) => surfaces.some((s) => contains(s, x, z, tolerance)))) return false;

  // …and where the floor ends in a wall rather than in open air, the *real*
  // corners have to respect it.
  for (const corner of cornersOf(real)) {
    for (const wall of walls) {
      const along = wall.axis === "x" ? corner.z : corner.x;
      if (along < wall.from || along > wall.to) continue;
      const across = wall.axis === "x" ? corner.x : corner.z;
      if (across < wall.at - WALL_BITE) return false;
    }
  }
  return true;
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

  if (!supported(candidate, rules.surfaces, moving.turned, rules.walls)) {
    return { ok: false, reason: "off-floor" };
  }
  if (moving.flat) return { ok: true };

  for (const other of obstacles) {
    if (other.flat) continue;
    // **A thing hanging on a wall is not standing on the floor.** The branch
    // above already says a hanging piece only ever clashes with other hanging
    // pieces; this is the converse, and its absence was the asymmetry that
    // gave it away — the floor under the menu board, the shelves and the
    // hanging shelf was dead ground you could not put a chair on, for no
    // reason a player could see (Ellis, 2026-08-26: *"i cant place stuff in
    // blank spots"*). Everything the room hangs sits at y > 1.2, well over
    // anything the shop sells to stand on the ground.
    if (other.wall) continue;
    if (moving.id !== undefined && other.id === moving.id) continue;
    if (overlaps(candidate, other, NESTLE, moving.turned, other.turned)) {
      return { ok: false, reason: "overlaps" };
    }
  }

  // A seat is allowed to stand on the walking route — that is what the café's
  // own cushion by the door does. Everything else has to keep out of the way.
  if (!moving.seat && blocksRoute(rectOf(candidate, moving.turned), route, rules.routeClearance)) {
    return { ok: false, reason: "blocks-walkway" };
  }

  if (moving.seat && rules.approachFrom) {
    const centre = { x: (candidate.minX + candidate.maxX) / 2, z: (candidate.minZ + candidate.maxZ) / 2 };
    for (const other of obstacles) {
      if (other.flat || other.seating || other.wall) continue;
      // **Only things a guest would have to walk *around*.** Ellis,
      // 2026-08-30: *"i wanted to put the chair in the corner but its red and
      // says the guests cant reach that spot … and then the guests go and sit
      // in the corner anyway."* This rule vetoed a seat if *anything* solid lay
      // on the line to it — including a 0.25-high cat bed, which the
      // walkthrough had just asked you to put in the middle of the floor. One
      // cat bed made a quarter of the room refuse a chair.
      //
      // A person steps over a cat bed and walks round a counter, so the test is
      // height: below knee height it does not count. What the rule is *for* is
      // the counter (0.78 high, 2.5 across) — "a stool dropped behind the
      // counter is legal to stand and impossible to use" — and that still
      // works, because the counter is exactly the sort of thing you go around.
      if ((other.height ?? Number.POSITIVE_INFINITY) < STEP_OVER) continue;
      if (moving.id !== undefined && other.id === moving.id) continue;
      // **The real rectangle, not the box round it.** This used to sample the
      // approach against `other`'s axis-aligned bounds, and the café's counter
      // is authored at an angle — so its bounds reach across most of the room
      // and reported perfectly good chairs as unreachable. Same fault the
      // collision test had before `Turned` existed, left behind in the one
      // check that did not go through `overlaps`.
      const rect = rectOf(other, other.turned);
      // Pulled in a little, so a guest may brush the corner of something on
      // the way to their chair rather than being stopped by it.
      const squeeze = { ...rect, halfX: Math.max(0, rect.halfX - 0.06), halfZ: Math.max(0, rect.halfZ - 0.06) };
      if (rectToSegment(squeeze, rules.approachFrom, centre) <= 0) {
        return { ok: false, reason: "unreachable" };
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
