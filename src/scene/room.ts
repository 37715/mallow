import * as THREE from "three";

/**
 * Fixed spatial layout for the Milestone 1 café room. Real furniture/expansion
 * comes in Milestone 3 — for now this is greybox that still reads as a café.
 */

export const ROOM_SIZE = { width: 8, depth: 8, wallHeight: 3.6 };

export const DOOR_POSITION = new THREE.Vector3(0, 0.4, ROOM_SIZE.depth / 2 - 0.35);

/** Where visitors sit (on the chair seat). */
export const SEAT_POSITIONS: THREE.Vector3[] = [
  new THREE.Vector3(-2, 0.42, -0.55),
  new THREE.Vector3(-0.7, 0.42, -0.55),
  new THREE.Vector3(0.7, 0.42, -0.55),
  new THREE.Vector3(2, 0.42, -0.55),
];

/** Cats lounge just in front of the seats — mid-frame on a portrait phone. */
export const CAT_DISPLAY_POSITIONS: THREE.Vector3[] = [
  new THREE.Vector3(-1.2, 0, -0.3),
  new THREE.Vector3(1.2, 0, -0.3),
  new THREE.Vector3(-2.0, 0, 0.5),
  new THREE.Vector3(2.0, 0, 0.5),
  new THREE.Vector3(-0.6, 0, 1.2),
  new THREE.Vector3(0.6, 0, 1.2),
];

function mesh(
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

function buildTableSet(seatPos: THREE.Vector3): THREE.Group {
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

  // Soft rug under the seating row so the café “zone” reads clearly.
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(6.2, 2.4),
    new THREE.MeshStandardMaterial({ color: 0xd9b48a, roughness: 1 }),
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.01, -0.4);
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

  for (const seatPos of SEAT_POSITIONS) {
    room.add(buildTableSet(seatPos));
  }

  room.add(buildDoorFrame());

  return room;
}
