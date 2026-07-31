import * as THREE from "three";
import { ECONOMY_CONFIG } from "@/data/economy";
import { MAX_SEAT_UPGRADES } from "@/data/upgrades";

/**
 * Spatial layout for the café room. The shell (floor, walls, counter, door) is
 * fixed; seating and décor are revealed by CafeManager as the player upgrades,
 * so the room visibly grows with the economy (§8 expansion).
 */

export const ROOM_SIZE = { width: 8, depth: 8, wallHeight: 3.6 };

export const DOOR_POSITION = new THREE.Vector3(0, 0.4, ROOM_SIZE.depth / 2 - 0.35);

/** Every seat the café could ever have — base seats plus every seating upgrade. */
export const MAX_SEATS = ECONOMY_CONFIG.baseSeatCount + MAX_SEAT_UPGRADES;

const SEAT_HEIGHT = 0.42;
const ROW_Z = [-1.0, 0.9];
const ROW_X = [-1.65, -0.55, 0.55, 1.65, -2.75, 2.75];

/**
 * Seat positions in unlock order: the back row fills from the middle outward,
 * then a second row appears in front of it. Index is stable forever — a saved
 * visitor in seat 7 always means the same chair — so this array is built once
 * at full size and the economy simply uses the first `seatCount` entries.
 */
export const SEAT_POSITIONS: THREE.Vector3[] = ROW_Z.flatMap((z) =>
  ROW_X.map((x) => new THREE.Vector3(x, SEAT_HEIGHT, z)),
).slice(0, MAX_SEATS);

/**
 * Cats lounge in the foreground, off the central aisle so guests walking in
 * from the door don't march straight through them.
 */
export const CAT_DISPLAY_POSITIONS: THREE.Vector3[] = [
  new THREE.Vector3(-2.4, 0, 1.9),
  new THREE.Vector3(2.4, 0, 1.9),
  new THREE.Vector3(-1.3, 0, 2.8),
  new THREE.Vector3(1.3, 0, 2.8),
  new THREE.Vector3(-3.4, 0, 3.3),
  new THREE.Vector3(3.4, 0, 3.3),
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

/** A table-and-chair set for one seat. Built on demand as seating is unlocked. */
export function buildTableSet(seatPos: THREE.Vector3): THREE.Group {
  const set = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0xb5876a, roughness: 0.7 });
  const cushion = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.85 });

  // Table toward the counter (−z) from the seat.
  const tableX = seatPos.x;
  const tableZ = seatPos.z - 0.55;
  set.add(mesh(new THREE.BoxGeometry(0.72, 0.06, 0.72), wood, tableX, 0.58, tableZ));
  set.add(mesh(new THREE.BoxGeometry(0.1, 0.55, 0.1), wood, tableX, 0.28, tableZ));

  // Chair under the visitor seat position.
  set.add(mesh(new THREE.BoxGeometry(0.48, 0.08, 0.48), cushion, seatPos.x, 0.3, seatPos.z));
  set.add(mesh(new THREE.BoxGeometry(0.48, 0.42, 0.07), wood, seatPos.x, 0.52, seatPos.z + 0.22));

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

  // Soft rug under both seating rows so the café “zone” reads clearly.
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(6.6, 4.0),
    new THREE.MeshStandardMaterial({ color: 0xd9b48a, roughness: 1 }),
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.01, -0.3);
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
  const counter = mesh(new THREE.BoxGeometry(3.6, 0.95, 0.65), counterMaterial, 0, 0.48, -ROOM_SIZE.depth / 2 + 0.55);
  room.add(counter);

  // Counter top shelf lip for a tiny bit of café detail.
  room.add(
    mesh(
      new THREE.BoxGeometry(3.6, 0.08, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x9a7358, roughness: 0.55 }),
      0,
      0.98,
      -ROOM_SIZE.depth / 2 + 0.28,
    ),
  );

  room.add(buildDoorFrame());

  return room;
}
