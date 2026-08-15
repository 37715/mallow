import * as THREE from "three";
import {
  CAFE_LAYOUT,
  CAT_SPOTS,
  DOOR,
  DOOR_LOBBY,
  DOOR_THRESHOLD,
  ROOM,
  SEATS,
  placedAt,
  type Placements,
} from "@/data/cafe-layout";
import type { SeatKind } from "@/entities/character-library";
import { floorBounds, type TileKey } from "@/data/expansion";
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
 * The threshold on the doormat. Guests walk `DOOR_POSITION` → here → their
 * seat, so the approach reads as coming *through the door* rather than
 * cutting across the floor from an arbitrary corner.
 */
export const DOOR_THRESHOLD_POSITION = new THREE.Vector3(DOOR_THRESHOLD.x, 0, DOOR_THRESHOLD.z);

/** Clear floor inside the door — routes guests around the counter peninsula. */
export const DOOR_LOBBY_POSITION = new THREE.Vector3(DOOR_LOBBY.x, 0, DOOR_LOBBY.z);

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

/** The same, at floor level — where a guest is *stood* to play a sit clip. */
export function seatStandPositions(placements: Placements): THREE.Vector3[] {
  return SEATS.map((s) => {
    const at = placedAt(s, placements);
    return new THREE.Vector3(at.x, 0, at.z);
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
export const SEAT_STAND_POSITIONS: THREE.Vector3[] = SEATS.map(
  (s) => new THREE.Vector3(s.x, 0, s.z),
);

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
 */
export const SEAT_FACINGS: number[] = SEATS.map((s) =>
  Math.atan2(DOOR.x - s.x, DOOR.z - s.z),
);

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
      const at = placedAt(c, placements);
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
