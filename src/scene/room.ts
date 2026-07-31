import * as THREE from "three";
import { MAX_SEAT_UPGRADES } from "@/data/upgrades";
import { VENUES, venueAt, type VenuePalette } from "@/data/venues";

/**
 * Spatial layout for the café room. The shell (floor, walls, counter, door) is
 * fixed; seating and décor are revealed by CafeManager as the player upgrades,
 * so the room visibly grows with the economy (§8 expansion).
 *
 * **Shaped for a portrait phone (§6).** The room is deliberately narrow and
 * deep — a tall screen has very little horizontal field of view to spend, so
 * the café grows *away* from the camera rather than out to the sides. Widening
 * this room is how you crop the café off the sides of a phone; if you need more
 * room for seats, add depth (another row), not width.
 */

export const ROOM_SIZE = { width: 5.0, depth: 8, wallHeight: 3.2 };

export const DOOR_POSITION = new THREE.Vector3(0, 0.4, ROOM_SIZE.depth / 2 - 0.35);

/**
 * Every seat the café could ever have: the roomiest venue's base seating plus
 * every seating upgrade. Seat *positions* are shared across venues so a seat
 * index always means the same chair, whichever building you're in.
 */
export const MAX_SEATS =
  Math.max(...VENUES.map((v) => v.baseSeats)) + MAX_SEAT_UPGRADES;

const SEAT_HEIGHT = 0.42;
/** Four seats across is the most that fits the portrait frame comfortably. */
const ROW_X = [-1.45, -0.48, 0.48, 1.45];
/** Middle row first (it sits centre-frame), then the back row, then the front. */
const ROW_Z = [-0.7, -2.0, 0.6];

/**
 * Seat positions in unlock order. Index is stable forever — seat 7 always means
 * the same chair — so this array is built once at full size and the economy
 * simply uses the first `seatCount` entries.
 */
export const SEAT_POSITIONS: THREE.Vector3[] = ROW_Z.flatMap((z) =>
  ROW_X.map((x) => new THREE.Vector3(x, SEAT_HEIGHT, z)),
).slice(0, MAX_SEATS);

/**
 * Where cats lounge: the foreground strip between the seating and the door.
 *
 * Three rows, filled centre-outward so the first cats you adopt sit front and
 * centre. The back row skips the corners, which belong to the floor lamp and
 * the cat tree.
 *
 * **This list is the hard limit on visible cats.** An earlier version had six
 * spots and nudged extras backwards by a fixed offset per wrap, which stacked
 * twenty cats into a pyramid that pushed straight through the back wall
 * (z=4.3 in a room that ends at 4.0). Cats beyond this list are simply not
 * rendered — CatManager caps at `CAT_DISPLAY_POSITIONS.length` — so adding a
 * spot means adding it here, with the layout test to prove it fits.
 */
const CAT_ROW_X = [-0.39, 0.39, -1.17, 1.17, -1.95, 1.95];
const CAT_BACK_ROW_X = [-0.5, 0.5, -1.3, 1.3];

export const CAT_DISPLAY_POSITIONS: THREE.Vector3[] = [
  ...CAT_ROW_X.map((x) => new THREE.Vector3(x, 0, 1.5)),
  ...CAT_ROW_X.map((x) => new THREE.Vector3(x, 0, 2.4)),
  ...CAT_BACK_ROW_X.map((x) => new THREE.Vector3(x, 0, 3.3)),
];

export function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Shared across every table set — twelve seats would otherwise mean twenty-four
// near-identical materials and the draw calls that come with them (§13).
const WOOD_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0xb5876a,
  roughness: 0.7,
  flatShading: true,
});

/**
 * Materials the venue repaints on a move. Shared instances, so recolouring
 * one object recolours every table, wall and rug at once — a move should read
 * as a whole new room, not a slow fade of individual props.
 */
const FLOOR_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xe6d2b5, roughness: 0.9 });
const WALL_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xf3e4cf, roughness: 1 });
const RUG_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xd9b48a, roughness: 1 });
const COUNTER_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xb5876a, roughness: 0.6 });

/** Repaint the room for a venue. Call on load and after every move. */
export function applyVenuePalette(palette: VenuePalette): void {
  FLOOR_MATERIAL.color.setHex(palette.floor);
  WALL_MATERIAL.color.setHex(palette.wall);
  RUG_MATERIAL.color.setHex(palette.rug);
  COUNTER_MATERIAL.color.setHex(palette.counter);
  WOOD_MATERIAL.color.setHex(palette.counter);
}
const CUSHION_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0xd4a574,
  roughness: 0.85,
  flatShading: true,
});

/** A table-and-chair set for one seat. Built on demand as seating is unlocked. */
export function buildTableSet(seatPos: THREE.Vector3): THREE.Group {
  const set = new THREE.Group();
  const wood = WOOD_MATERIAL;
  const cushion = CUSHION_MATERIAL;

  // Table toward the counter (−z) from the seat.
  const tableX = seatPos.x;
  const tableZ = seatPos.z - 0.5;
  set.add(mesh(new THREE.BoxGeometry(0.64, 0.06, 0.64), wood, tableX, 0.58, tableZ));
  set.add(mesh(new THREE.BoxGeometry(0.1, 0.55, 0.1), wood, tableX, 0.28, tableZ));

  // Chair under the visitor seat position.
  set.add(mesh(new THREE.BoxGeometry(0.44, 0.08, 0.44), cushion, seatPos.x, 0.3, seatPos.z));
  set.add(mesh(new THREE.BoxGeometry(0.44, 0.4, 0.07), wood, seatPos.x, 0.5, seatPos.z + 0.2));

  return set;
}

function buildDoorFrame(): THREE.Group {
  const frame = new THREE.Group();
  const trim = new THREE.MeshStandardMaterial({ color: 0x8a6a52, roughness: 0.65 });
  const z = ROOM_SIZE.depth / 2 - 0.08;
  const doorWidth = 1.4;
  const doorHeight = 2.2;

  frame.add(mesh(new THREE.BoxGeometry(0.12, doorHeight, 0.12), trim, -doorWidth / 2, doorHeight / 2, z));
  frame.add(mesh(new THREE.BoxGeometry(0.12, doorHeight, 0.12), trim, doorWidth / 2, doorHeight / 2, z));
  frame.add(mesh(new THREE.BoxGeometry(doorWidth + 0.12, 0.12, 0.12), trim, 0, doorHeight, z));

  return frame;
}

/** The permanent shell of the café. Seating and décor are added by CafeManager. */
export function buildRoom(venueIndex = 0): THREE.Group {
  applyVenuePalette(venueAt(venueIndex).palette);

  const room = new THREE.Group();
  room.name = "room";

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_SIZE.width, ROOM_SIZE.depth),
    FLOOR_MATERIAL,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  room.add(floor);

  // Soft rug under all three seating rows so the café “zone” reads clearly.
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(4.1, 4.4),
    RUG_MATERIAL,
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.01, -0.7);
  rug.receiveShadow = true;
  room.add(rug);

  const wallMaterial = WALL_MATERIAL;

  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_SIZE.width, ROOM_SIZE.wallHeight),
    wallMaterial,
  );
  backWall.position.set(0, ROOM_SIZE.wallHeight / 2, -ROOM_SIZE.depth / 2);
  room.add(backWall);

  const leftWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_SIZE.depth, ROOM_SIZE.wallHeight),
    wallMaterial,
  );
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-ROOM_SIZE.width / 2, ROOM_SIZE.wallHeight / 2, 0);
  room.add(leftWall);

  const rightWall = leftWall.clone();
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(ROOM_SIZE.width / 2, ROOM_SIZE.wallHeight / 2, 0);
  room.add(rightWall);

  const counter = mesh(new THREE.BoxGeometry(2.6, 0.95, 0.65), COUNTER_MATERIAL, 0, 0.48, -ROOM_SIZE.depth / 2 + 0.55);
  room.add(counter);

  // Counter top shelf lip for a tiny bit of café detail.
  room.add(
    mesh(
      new THREE.BoxGeometry(2.6, 0.08, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x9a7358, roughness: 0.55 }),
      0,
      0.98,
      -ROOM_SIZE.depth / 2 + 0.28,
    ),
  );

  room.add(buildDoorFrame());

  return room;
}
