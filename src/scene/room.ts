import * as THREE from "three";
import { CAT_SPOTS, DOOR, ROOM, SEATS } from "@/data/cafe-layout";

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

/** Guests enter here. On the open side of the diorama, away from the walls. */
export const DOOR_POSITION = new THREE.Vector3(DOOR.x, 0, DOOR.z);

/**
 * Where guests sit, in stable index order. The economy addresses seats by
 * index, so this order must not be shuffled — reorder `CAFE_LAYOUT` and old
 * saves would seat people in different chairs.
 */
export const SEAT_POSITIONS: THREE.Vector3[] = SEATS.map(
  (s) => new THREE.Vector3(s.x, s.seatY ?? 0.45, s.z),
);

/** Which way a guest faces when seated — toward the middle of the room. */
export const SEAT_FACINGS: number[] = SEATS.map((s) => Math.atan2(-s.x, -s.z));

/** Where cats settle: beds, the climber, sunny spots. */
export const CAT_DISPLAY_POSITIONS: THREE.Vector3[] = CAT_SPOTS.map(
  (c) => new THREE.Vector3(c.x, 0, c.z),
);

/** Every seat the café can ever have. Fixed now — no venue ladder. */
export const MAX_SEATS = SEAT_POSITIONS.length;
