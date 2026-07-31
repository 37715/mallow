import * as THREE from "three";
import { ECONOMY_CONFIG } from "@/data/economy";
import { MAX_SEAT_UPGRADES } from "@/data/upgrades";

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

/** Every seat the café could ever have — base seats plus every seating upgrade. */
export const MAX_SEATS = ECONOMY_CONFIG.baseSeatCount + MAX_SEAT_UPGRADES;

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
 * Cats lounge in the foreground between the seating and the door, off the
 * central aisle so guests walking in don't march straight through them.
 */
export const CAT_DISPLAY_POSITIONS: THREE.Vector3[] = [
  new THREE.Vector3(-0.55, 0, 1.75),
  new THREE.Vector3(0.55, 0, 1.75),
  new THREE.Vector3(-1.65, 0, 1.75),
  new THREE.Vector3(1.65, 0, 1.75),
  new THREE.Vector3(-1.1, 0, 3.15),
  new THREE.Vector3(1.1, 0, 3.15),
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
export function buildRoom(): THREE.Group {
  const room = new THREE.Group();
  room.name = "room";

  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xe6d2b5, roughness: 0.9 });
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_SIZE.width, ROOM_SIZE.depth),
    floorMaterial,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  room.add(floor);

  // Soft rug under all three seating rows so the café “zone” reads clearly.
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(4.1, 4.4),
    new THREE.MeshStandardMaterial({ color: 0xd9b48a, roughness: 1 }),
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.01, -0.7);
  rug.receiveShadow = true;
  room.add(rug);

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xf3e4cf, roughness: 1 });

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

  const counterMaterial = new THREE.MeshStandardMaterial({ color: 0xb5876a, roughness: 0.6 });
  const counter = mesh(new THREE.BoxGeometry(2.6, 0.95, 0.65), counterMaterial, 0, 0.48, -ROOM_SIZE.depth / 2 + 0.55);
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
