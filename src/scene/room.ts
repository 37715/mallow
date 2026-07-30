import * as THREE from "three";

/**
 * Fixed spatial layout for the Milestone 1 café room. Real furniture/expansion
 * comes in Milestone 3 — for now this is just enough geometry to read as a room.
 */

export const ROOM_SIZE = { width: 8, depth: 8, wallHeight: 3 };

export const DOOR_POSITION = new THREE.Vector3(0, 0.4, ROOM_SIZE.depth / 2 - 0.2);

export const SEAT_POSITIONS: THREE.Vector3[] = [
  new THREE.Vector3(-2, 0.4, -1),
  new THREE.Vector3(-0.7, 0.4, -1),
  new THREE.Vector3(0.7, 0.4, -1),
  new THREE.Vector3(2, 0.4, -1),
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

  // Simple counter along the back wall to anchor the "café" read.
  const counterMaterial = new THREE.MeshStandardMaterial({ color: 0xb5876a, roughness: 0.6 });
  const counter = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.9, 0.6), counterMaterial);
  counter.position.set(0, 0.45, -ROOM_SIZE.depth / 2 + 0.5);
  counter.castShadow = true;
  counter.receiveShadow = true;
  room.add(counter);

  for (const seatPos of SEAT_POSITIONS) {
    const seatMaterial = new THREE.MeshStandardMaterial({ color: 0xcf9f6f, roughness: 0.8 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.6), seatMaterial);
    seat.position.set(seatPos.x, 0.15, seatPos.z + 0.6);
    seat.castShadow = true;
    seat.receiveShadow = true;
    room.add(seat);
  }

  return room;
}
