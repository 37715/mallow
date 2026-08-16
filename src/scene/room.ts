import * as THREE from "three";
import {
  BARISTA_SPOT,
  CAFE_LAYOUT,
  CAT_SPOTS,
  COUNTER_QUEUE,
  DOOR,
  DOOR_LOBBY,
  DOOR_THRESHOLD,
  ROOM,
  SEATS,
  placedAt,
  type Placements,
} from "@/data/cafe-layout";
import type { SeatKind } from "@/entities/character-library";
import { floorBounds, growth, type TileKey } from "@/data/expansion";
import { tileSurfaces } from "@/scene/cafe-tiles";

/**
 * Spatial bridge between the hand-placed café layout (`data/cafe-layout.ts`)
 * and the entity managers, which think in plain Vector3s.
 *
 * This file used to *build* a procedural greybox room. That's gone — the café
 * is now real art from the Minty pack, assembled by `scene/cafe-room.ts`. All
 * that's left here is the geometry the simulation needs to know about.
 */

export const ROOM_SIZE = {
  width: ROOM.half * 2,
  depth: ROOM.half * 2,
  wallHeight: ROOM.wallHeight,
};

/** Where guests come from — off-frame, in line with the entrance step. */
export const DOOR_POSITION = new THREE.Vector3(DOOR.x, 0, DOOR.z);

/**
 * The doorway at its *current* place, which moves as the café grows.
 *
 * The entrance notch rides the floor's +z edge (`Placement.followsEdge`), so
 * the approach has to ride it too — otherwise guests walk in through what is
 * now the middle of the room and the doorway they actually pass is a slab of
 * plain floor. Only `z` moves: growth is +x/+z, the entrance is on the +z
 * face, and widening the café sideways does not move which face you come in
 * through.
 *
 * `DOOR_LOBBY` deliberately stays put. It is the waypoint that routes guests
 * around the counter peninsula, which has not moved — see the note on it.
 */
export function doorPositions(tiles: TileKey[]): {
  door: THREE.Vector3;
  threshold: THREE.Vector3;
} {
  const dz = growth(tiles).z;
  return {
    door: new THREE.Vector3(DOOR.x, 0, DOOR.z + dz),
    threshold: new THREE.Vector3(DOOR_THRESHOLD.x, 0, DOOR_THRESHOLD.z + dz),
  };
}

/**
 * The threshold on the doormat. Guests walk `DOOR_POSITION` → here → their
 * seat, so the approach reads as coming *through the door* rather than
 * cutting across the floor from an arbitrary corner.
 */
export const DOOR_THRESHOLD_POSITION = new THREE.Vector3(DOOR_THRESHOLD.x, 0, DOOR_THRESHOLD.z);

/** Clear floor inside the door — routes guests around the counter peninsula. */
export const DOOR_LOBBY_POSITION = new THREE.Vector3(DOOR_LOBBY.x, 0, DOOR_LOBBY.z);

/** Where they queue to order. Every visit goes through it — see `COUNTER_QUEUE`. */
export const COUNTER_POSITION = new THREE.Vector3(COUNTER_QUEUE.x, 0, COUNTER_QUEUE.z);

/**
 * Which way a guest faces while ordering: at the counter, which is where the
 * barista is. Anything else and they queue with their back to the person
 * serving them.
 */
export const COUNTER_FACING = Math.atan2(
  BARISTA_SPOT.x - COUNTER_QUEUE.x,
  BARISTA_SPOT.z - COUNTER_QUEUE.z,
);

/**
 * Where guests sit, in stable index order. The economy addresses seats by
 * index, so this order must not be shuffled — reorder `CAFE_LAYOUT` and old
 * saves would seat people in different chairs.
 */
export const SEAT_POSITIONS: THREE.Vector3[] = SEATS.map(
  (s) => new THREE.Vector3(s.x, s.seatY ?? 0.45, s.z),
);

/**
 * Seats at their *current* positions — the authored ones, with the player's
 * moves applied.
 *
 * The index order is still frozen (the economy addresses seats by index and
 * old saves must keep seating people in the same chair), but the coordinates
 * are live, so a chair dragged across the room takes its guest with it.
 */
export function seatPositions(placements: Placements): THREE.Vector3[] {
  return SEATS.map((s) => {
    const at = placedAt(s, placements);
    return new THREE.Vector3(at.x, s.seatY ?? 0.45, at.z);
  });
}

/**
 * How far back into the seat a guest stands, per kind of seat.
 *
 * **The pack's sit clips are authored against the pack's own furniture.** Every
 * clip keeps its root bone at the origin and gets the sitting pose entirely out
 * of limb rotations (§9) — which means the *body* ends up wherever the pack's
 * layout had the chair relative to that root, and that offset is different for
 * a bar stool, a sofa and a floor cushion. Standing a guest at the seat's own
 * coordinates therefore only lands correctly for one of the three.
 *
 * Measured by putting a guest in each and looking (2026-08-26): the armchair
 * was right, the stools were most of a seat forward of theirs, and the floor
 * cushions were slightly forward. Ellis: *"people sometimes sit on the chair
 * and they arent quite on it — rotation fine but position off."*
 *
 * Applied along the guest's own facing, so it stays correct when the player
 * turns the furniture.
 */
const SEAT_SIT_BACK: Record<SeatKind, number> = {
  tall: 0.26,
  floor: 0.13,
  sofa: 0,
};

/** The same, at floor level — where a guest is *stood* to play a sit clip. */
export function seatStandPositions(placements: Placements): THREE.Vector3[] {
  const facings = seatFacings(placements);
  return SEATS.map((s, i) => {
    const at = placedAt(s, placements);
    // Backwards along the way they are facing, i.e. into the seat behind them.
    const facing = facings[i] ?? 0;
    const back = SEAT_SIT_BACK[SEAT_KINDS[i] ?? "floor"];
    return new THREE.Vector3(at.x - Math.sin(facing) * back, 0, at.z - Math.cos(facing) * back);
  });
}

/**
 * The same seats at floor level.
 *
 * Guests are *stood* here, not sat here: every clip in the character pack is
 * authored with the root bone on the ground and the sitting height coming out
 * of the pose. Placing a guest at `seatY` puts them a seat-height above the
 * seat. `SEAT_POSITIONS` keeps the real height because the coin floaters want
 * to launch from the tabletop, not the floor.
 */

/**
 * Which way a guest faces when seated — **toward the door, which is also
 * toward the camera.**
 *
 * This used to face the middle of the room, and that is what made the guests
 * look headless: the camera sits on the open corner, so anything facing the
 * room's centre is facing directly away from you. Every seated guest showed the
 * back of their hair and never a face.
 *
 * A cutaway diorama exists to be looked *into*, so the rule is that guests face
 * out of it. Facing the door is the version of that which also makes sense in
 * the fiction — people sit facing the way they came in — and because the door
 * is a fixed point rather than a fixed angle, each seat gets a slightly
 * different three-quarter turn for free instead of everyone facing identically.
 *
 * **But it is only right for a seat with no front**, which is why
 * `Placement.seatFacing` overrides it. A stool or a floor cushion has no wrong
 * way round; an armchair does, and the door happens to lie 50.7° off where
 * that chair points. Nobody could see it until furniture could be turned,
 * because at the authored angle a 50° skew reads as somebody lounging.
 */
export const SEAT_FACINGS: number[] = SEATS.map(
  (s) => s.seatFacing ?? Math.atan2(DOOR.x - s.x, DOOR.z - s.z),
);

/**
 * The same, but **turned with the chair**.
 *
 * `SEAT_FACINGS` is a module constant baked from the authored layout, and it
 * stayed that way when seat *positions* went live in August — so a guest
 * followed their chair across the room but never turned with it. Ellis,
 * 2026-08-26: *"when i rotate furniture the people sat in it dont rotate so
 * they are sat in the chair the wrong way."*
 *
 * The player's rotation is a **delta added to the layout's own angle** (see
 * `placedRotation`), which is exactly what has to be added here too — the
 * authored facing already accounts for where the chair was pointing when the
 * layout was drawn, so adding the delta turns the guest by the amount the
 * chair turned and no more.
 *
 * Note this is deliberately *not* re-derived from the door: a chair the player
 * has deliberately turned to face the window should seat somebody facing the
 * window. The door rule decides the *authored* facing, not a rule the room
 * keeps enforcing over the top of the player.
 */
export function seatFacings(placements: Placements): number[] {
  return SEATS.map((s, i) => {
    const moved = s.id ? placements[s.id] : undefined;
    return (SEAT_FACINGS[i] ?? 0) + (moved?.rot ?? 0);
  });
}

/**
 * What a guest is sitting *on*, which decides which animation they play. The
 * character pack has a clip set per furniture type and they are posed for that
 * furniture's real height, so this has to match the actual seat asset.
 */
export const SEAT_KINDS: SeatKind[] = SEATS.map((s) => {
  if (s.asset.startsWith("Chair_Bar")) return "tall";
  if (s.asset.startsWith("Sofa")) return "sofa";
  return "floor";
});

/**
 * **Derived from the live function, not hand-rolled alongside it.**
 *
 * These two used to be written out separately and drifted the moment
 * `SEAT_SIT_BACK` landed: the function applied the offset and the constant did
 * not. `VisitorManager` defaults to the constant, so on a fresh load — which is
 * every load — guests were seated by the stale copy and the fix appeared not to
 * work at all. A constant that restates a function is a bug waiting for the
 * function to change; this one asks it.
 *
 * **It has to sit below `SEAT_FACINGS` and `SEAT_KINDS`**, which the function
 * reads. Declared above them it throws `Cannot access before initialization` at
 * module load — the third time a TDZ has bitten this project (§0, 2026-08-25,
 * twice in one day). A `const` is not hoisted; only the *function* is.
 */
export const SEAT_STAND_POSITIONS: THREE.Vector3[] = seatStandPositions({});

/** Where cats settle: beds, the climber, sunny spots. */
export const CAT_DISPLAY_POSITIONS: THREE.Vector3[] = CAT_SPOTS.map(
  (c) => new THREE.Vector3(c.x, c.catY ?? 0, c.z),
);

/**
 * Where cats can *actually* sit right now: the authored spots, with the
 * player's furniture moves applied, and **with anything unbought removed**.
 *
 * Two separate corrections, both of which produced floating cats:
 *
 * 1. Three of the movable pieces *are* cat spots — the bed, the climber, the
 *    low table — so a dragged cat bed has to take its cat with it.
 * 2. Since the shop landed, most cat furniture **doesn't exist until it's
 *    bought**. Cats were still being seated on the climber and the low table
 *    on day one, perched in mid-air on furniture that wasn't in the room.
 *    Ellis, on seeing it: *"the cats when i adopt are hovering on furniture
 *    thats not even placed or exists yet haha."*
 *
 * The bare-floor spots have no asset at all, so they are always available —
 * which is what guarantees a new café can still seat its first cat.
 */
export function catDisplayPositions(
  placements: Placements,
  purchased: string[] = [],
  tiles: TileKey[] = [],
): THREE.Vector3[] {
  const onFurniture = CAT_SPOTS.filter((c) => !c.shopItem || purchased.includes(c.shopItem)).map(
    (c) => {
      const at = placedAt(c, placements, growth(tiles));
      return new THREE.Vector3(at.x, c.catY ?? 0, at.z);
    },
  );
  return [...onFurniture, ...floorLoungeSpots(tiles, onFurniture, placements, purchased)];
}

/**
 * Somewhere for a cat to sit when the furniture has run out.
 *
 * **Adopting a cat that never appears is the worst bug this game can have.**
 * There are five authored cat spots and two of them are shop items, so a bare
 * café could show three cats while happily selling you five — Ellis,
 * 2026-08-17: *"i just adopted some more cats and they arent actually
 * appearing in the cafe."* The old note that a cat on open floor "reads as
 * floating" (§9) was about *preference*; a missing cat is not a preference.
 *
 * Four points per owned tile, inset from the edges, dropped if they land on
 * top of a seat or a furniture spot. Growing the café therefore also grows the
 * number of places a cat can be, which is the right relationship.
 */
function floorLoungeSpots(
  tiles: TileKey[],
  taken: THREE.Vector3[],
  placements: Placements,
  purchased: string[],
): THREE.Vector3[] {
  // Everything solid that is *actually in the room* — an unbought shop item is
  // not an obstacle, and treating it as one was what left cats homeless on the
  // first attempt at this.
  const solid = CAFE_LAYOUT.filter(
    (item) =>
      item.asset &&
      !item.walkOver &&
      !ARCHITECTURE.has(item.slot ?? "") &&
      (!item.shopItem || purchased.includes(item.shopItem)),
  ).map((item) => placedAt(item, placements));

  const avoid = [...solid, ...SEAT_POSITIONS, ...ROUTE_POINTS, ...taken];

  /**
   * **Scored, not filtered.** Hard thresholds are what produced a café that
   * sold five cats and showed three: every candidate failed one rule or
   * another and there was no fallback beneath them. Ranking by how much elbow
   * room a spot has always returns *something*, and returns the nicest spots
   * first.
   */
  // **Swept over the floor's actual bounds and tested for being *on* it**,
  // rather than offset from each square's centre. The offsets were written
  // when a square was 4 units wide; when patches became 2 (2026-08-18) they
  // reached ±1.4 from the centre of a square only ±1 across, and cats were
  // placed outside the café — one on the pavement, one behind a wall.
  // Deriving from the bounds cannot go stale when the grid size changes again.
  const bounds = floorBounds(tiles);
  const inset = 0.45;
  const scored: { at: THREE.Vector3; clearance: number }[] = [];
  for (let z = bounds.minZ + inset; z <= bounds.maxZ - inset; z += 0.6) {
    for (let x = bounds.minX + inset; x <= bounds.maxX - inset; x += 0.6) {
      {
        if (!onFloor(tiles, x, z, inset)) continue;
        const clearance = avoid.reduce(
          (min, p) => Math.min(min, Math.hypot(p.x - x, p.z - z)),
          Number.POSITIVE_INFINITY,
        );
        // Below this it is inside something; no ranking can rescue it.
        if (clearance < 0.55) continue;
        scored.push({ at: new THREE.Vector3(x, 0, z), clearance });
      }
    }
  }
  scored.sort((a, b) => b.clearance - a.clearance);

  // Spread them out: two cats a handspan apart read as one clump.
  const out: THREE.Vector3[] = [];
  for (const candidate of scored) {
    if (out.some((p) => p.distanceTo(candidate.at) < 1.1)) continue;
    out.push(candidate.at);
  }
  return out;
}

/** Is this point on a square of floor, with a margin from its edge? */
function onFloor(tiles: TileKey[], x: number, z: number, margin: number): boolean {
  return tileSurfaces(tiles).some(
    (s) =>
      x >= s.minX + margin &&
      x <= s.maxX - margin &&
      z >= s.minZ + margin &&
      z <= s.maxZ - margin,
  );
}

/** Room-sized surfaces never count as furniture a cat must avoid. */
const ARCHITECTURE = new Set(["floor", "floorStep", "wallPlain", "wallWindow"]);
/** The line guests walk, so cats don't nap in the doorway. */
const ROUTE_POINTS = [DOOR, DOOR_THRESHOLD, DOOR_LOBBY];

/** How many cats the café can show with what it currently owns. */
export function visibleCatCapacity(purchased: string[], tiles: TileKey[] = []): number {
  return catDisplayPositions({}, purchased, tiles).length;
}

/** Every seat the café can ever have. Fixed now — no venue ladder. */
export const MAX_SEATS = SEAT_POSITIONS.length;
