import * as THREE from "three";
import type { Visitor } from "@/systems/visitors";
import {
  Character,
  loadCharacterAssets,
  type CharacterAssets,
} from "@/entities/character-library";
import {
  COUNTER_FACING,
  COUNTER_POSITION,
  DOOR_LOBBY_POSITION,
  DOOR_POSITION,
  DOOR_THRESHOLD_POSITION,
  SEAT_FACINGS,
  SEAT_KINDS,
  SEAT_STAND_POSITIONS,
} from "@/scene/room";

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * How a guest looks once they've settled with their drink.
 *
 * §0 has listed "guests never look at anything" as a gap for weeks; this is the
 * cheap half of closing it. It is weighted rather than uniform on purpose — a
 * café where every third customer has heart eyes is a café nobody believes.
 * Most people are quietly pleased to be there, and the delight is the
 * occasional one who is having a lovely time.
 */
const SEATED_MOODS = [
  "content",
  "content",
  "content",
  "happy",
  "happy",
  "cheeky",
  "delighted",
] as const;

/**
 * Walk a polyline, **parametrised by distance rather than by leg**.
 *
 * Splitting `t` evenly between legs would make a guest sprint the long leg
 * across the room and dawdle the short one over the doormat, because the legs
 * are nowhere near equal length. Measuring along the route keeps the pace
 * constant, which is the difference between "walking in" and "teleporting in
 * stages". Easing is applied once, over the whole trip, so they still start
 * and stop gently (§10).
 */
function walkRoute(out: THREE.Vector3, points: THREE.Vector3[], t: number): void {
  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const d = points[i].distanceTo(points[i - 1]);
    lengths.push(d);
    total += d;
  }
  if (total < 1e-6) {
    out.copy(points[points.length - 1]);
    return;
  }

  let travelled = easeInOut(THREE.MathUtils.clamp(t, 0, 1)) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (travelled <= lengths[i] || i === lengths.length - 1) {
      const f = lengths[i] < 1e-6 ? 1 : THREE.MathUtils.clamp(travelled / lengths[i], 0, 1);
      out.lerpVectors(points[i], points[i + 1], f);
      return;
    }
    travelled -= lengths[i];
  }
}

/**
 * Turn to face the direction of travel.
 *
 * The character pack's models face +Z, which is what `rotation.y` measures
 * from — the same convention `SEAT_FACINGS` uses. Facing the *destination*
 * instead (the old `lookAt(seat)`) made guests walk in sideways, crabbing
 * toward their chair while staring at it.
 */
function faceTravel(mesh: THREE.Object3D, previous: THREE.Vector3): void {
  const dx = mesh.position.x - previous.x;
  const dz = mesh.position.z - previous.z;
  if (dx * dx + dz * dz < 1e-8) return;
  mesh.rotation.set(0, Math.atan2(dx, dz), 0);
}

/**
 * Keeps the scene's visitor characters in sync with the store's visitor list,
 * and interpolates their walk-in / sit / walk-out motion purely from timestamps.
 *
 * The pack loads asynchronously, so guests can be spawned by the simulation
 * before there is anything to draw. That's fine and deliberately silent: the
 * café keeps running and earning, and bodies appear once the GLB is in. Blocking
 * the game loop on an art download would be far worse than a few early guests
 * being invisible.
 */
export class VisitorManager {
  private readonly group = new THREE.Group();
  private readonly charactersById = new Map<string, Character>();
  private assets: CharacterAssets | null = null;
  private lastFrame = 0;
  /** Guests already told to sit, so the sit clip is triggered exactly once. */
  private readonly seated = new Set<string>();
  /** The same, for the pause at the counter. */
  private readonly ordering = new Set<string>();
  /**
   * Where the chairs currently are. Live rather than a module constant,
   * because the player can drag a seat across the room and the guest walking
   * to it has to follow — see `seatStandPositions`.
   */
  private seats: THREE.Vector3[] = SEAT_STAND_POSITIONS;

  /**
   * Which way each seat's occupant faces. Live for the same reason the
   * positions are: a chair the player turns has to take its guest round with
   * it, or they end up sitting sideways in it (`seatFacings`).
   */
  private facings: number[] = SEAT_FACINGS;

  /** Re-aim guests after furniture moved *or turned*. */
  setSeats(seats: THREE.Vector3[], facings: number[]): void {
    this.seats = seats;
    this.facings = facings;
  }

  /**
   * Where the way in is. It moves: the entrance notch rides the floor's outer
   * edge as the café grows (`doorPositions`), and a guest still walking to the
   * old one would come in through the middle of the room.
   */
  private door = DOOR_POSITION;
  private threshold = DOOR_THRESHOLD_POSITION;

  setDoor(door: THREE.Vector3, threshold: THREE.Vector3): void {
    this.door = door;
    this.threshold = threshold;
  }

  constructor(scene: THREE.Scene) {
    this.group.name = "visitors";
    scene.add(this.group);
    void loadCharacterAssets().then((assets) => {
      this.assets = assets;
    });
  }

  sync(visitors: Visitor[], now: number): void {
    const delta = this.lastFrame === 0 ? 0 : Math.min((now - this.lastFrame) / 1000, 0.1);
    this.lastFrame = now;

    const activeIds = new Set(visitors.map((v) => v.id));
    for (const [id, character] of this.charactersById) {
      if (activeIds.has(id)) continue;
      this.group.remove(character.group);
      character.dispose();
      this.charactersById.delete(id);
      this.seated.delete(id);
      this.ordering.delete(id);
    }

    for (const visitor of visitors) {
      let character = this.charactersById.get(visitor.id);
      if (!character) {
        if (!this.assets) continue; // pack still loading
        character = new Character(this.assets, visitor.seatIndex + visitor.spawnedAt);
        character.walk();
        this.group.add(character.group);
        this.charactersById.set(visitor.id, character);
      }
      this.positionVisitor(character, visitor, now);
      character.update(delta);
    }
  }

  private positionVisitor(character: Character, visitor: Visitor, now: number): void {
    const mesh = character.group;
    const seatPos = this.seats[visitor.seatIndex] ?? this.door;

    if (now < visitor.orderedAt) {
      // In through the door and up to the counter.
      const t = THREE.MathUtils.clamp(
        (now - visitor.spawnedAt) / Math.max(1, visitor.orderedAt - visitor.spawnedAt),
        0,
        1,
      );
      const before = mesh.position.clone();
      walkRoute(mesh.position, [this.door, this.threshold, DOOR_LOBBY_POSITION, COUNTER_POSITION], t);
      // Face the way they're actually travelling, so they turn at the door
      // instead of walking in sideways staring at their chair.
      faceTravel(mesh, before);
      this.ordering.delete(visitor.id);
    } else if (now < visitor.servedAt) {
      /**
       * **At the counter, being served.**
       *
       * They stand still and face the barista — the one moment a guest and the
       * player's own character are actually dealing with each other, which is
       * the whole reason this phase exists (`systems/visitors.ts`).
       */
      mesh.position.copy(COUNTER_POSITION);
      mesh.rotation.set(0, COUNTER_FACING, 0);
      if (!this.ordering.has(visitor.id)) {
        this.ordering.add(visitor.id);
        this.seated.delete(visitor.id);
        character.idle();
        character.express("happy");
      }
    } else if (!visitor.takeaway && now < visitor.seatedAt) {
      // Drink in hand, crossing to their chair.
      const t = THREE.MathUtils.clamp(
        (now - visitor.servedAt) / Math.max(1, visitor.seatedAt - visitor.servedAt),
        0,
        1,
      );
      const before = mesh.position.clone();
      walkRoute(mesh.position, [COUNTER_POSITION, seatPos], t);
      faceTravel(mesh, before);
      if (this.ordering.delete(visitor.id)) character.walk();
    } else if (!visitor.takeaway && now < visitor.leavingAt) {
      mesh.position.copy(seatPos);
      // **Aimed every frame, not once on sitting down.** The position is
      // already re-read every frame, so a chair dragged across the room takes
      // its guest with it — but the facing used to be set only on the
      // transition into the chair, which meant turning a chair under somebody
      // left them sitting sideways in it until they got up and a new guest
      // arrived. It is one assignment; there is no reason for it to be
      // conditional, and making it conditional is what let the two drift.
      mesh.rotation.set(0, this.facings[visitor.seatIndex] ?? 0, 0);
      if (!this.seated.has(visitor.id)) {
        this.seated.add(visitor.id);
        character.sit(SEAT_KINDS[visitor.seatIndex] ?? "floor");
        // Settled with a drink — the one moment a guest has an opinion. Keyed
        // off the same seed as their appearance so a given guest is consistent
        // for their whole visit rather than re-rolling on every sync.
        const seed = Math.abs(Math.round(visitor.seatedAt + visitor.seatIndex));
        character.express(SEATED_MOODS[seed % SEATED_MOODS.length]);
      }
    } else {
      // Out again — from their chair, or straight from the counter with a cup.
      if (this.seated.delete(visitor.id) || this.ordering.delete(visitor.id)) {
        character.walk();
        character.express("happy"); // leaving pleased, which is the whole game
      }
      const t = THREE.MathUtils.clamp(
        (now - visitor.leavingAt) / Math.max(1, visitor.doneAt - visitor.leavingAt),
        0,
        1,
      );
      const before = mesh.position.clone();
      // A takeaway leaves from the counter, not from a chair they never sat in.
      const from = visitor.takeaway ? COUNTER_POSITION : seatPos;
      walkRoute(mesh.position, [from, DOOR_LOBBY_POSITION, this.threshold, this.door], t);
      faceTravel(mesh, before);
    }
  }
}
