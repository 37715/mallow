import * as THREE from "three";
import type { Visitor } from "@/systems/visitors";
import {
  Character,
  appearanceFromSeed,
  loadCharacterAssets,
  type CharacterAssets,
} from "@/entities/character-library";
import { ALL_REFRESHMENTS, type Refreshments } from "@/data/shop";
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

/**
 * **How fast a guest walks, in world units per second — a speed, not a
 * timetable.**
 *
 * Ellis, 2026-08-26: *"sometimes they walk super fast or move fast without the
 * walk animation playing."* Both halves came from the same thing: every leg
 * used to be a fixed *duration* over a variable *distance*. Measured on the
 * home tile alone, the counter→seat leg was 840 ms whatever the distance —
 * which is 0.29 u/s to the near bar stool and **2.71 u/s to the armchair**, a
 * ninefold spread inside one small room. Expansion made it worse, because the
 * door moves out and the schedule does not.
 *
 * So the guest is given a speed and the *schedule waits for them*: they sit
 * when they arrive, not when the clock says they should be sitting. The
 * economy is unaffected — pay happens at the counter and the dwell still runs
 * to its own clock; arriving a moment late just means a moment less sitting,
 * out of six seconds.
 *
 * 1.9 is the pace the old timings implied for the two legs that were roughly
 * right (door→counter at 1.95, seat→door at 1.5–2.6), so a home-tile café
 * looks exactly as it did and only the outliers change.
 */
const WALK_SPEED = 1.9;

/**
 * How late a guest may be before the walk is abandoned and they are simply
 * put in the chair.
 *
 * It is the safety valve for time that passed while nothing was drawing — a
 * backgrounded app, a locked phone — where the alternative is a guest hurrying
 * across a café to a seat they should have left already. Comfortably longer
 * than any real walk in a café this size, so it never fires during play.
 */
const LATE_SNAP_MS = 4000;

/** Which route a guest is currently walking. */
export type Leg = "in" | "toSeat" | "out";

/**
 * How far along their current route a guest is.
 *
 * Kept per visitor here rather than derived from `now`, because that is the
 * whole point: distance travelled is the state, and the clock no longer
 * decides where anybody is standing.
 */
export interface Walk {
  leg: Leg;
  travelled: number;
}

/** A guest walks these in order, once each. */
const LEG_ORDER: Record<Leg, number> = { in: 0, toSeat: 1, out: 2 };

/**
 * Has this guest finished the given leg?
 *
 * **A leg they have already left behind counts as finished, and missing that
 * is what made guests judder at the counter** (Ellis, 2026-08-27: *"character
 * went up to desk, went to walk off again and start spasming out glitching
 * cant get out for ages super jittery crazy"*).
 *
 * The old test was `walk.leg === leg && travelled >= total`, which answers a
 * subtly different question — *are they on this leg and done with it* — and is
 * false in **two** unrelated situations: before the leg is finished, and after
 * the walk has moved past it. `positionVisitor` asks in order, so as soon as a
 * guest started the walk to their chair, the earlier `arrived("in")` test went
 * false again, the walk-in branch re-fired, and it reset the walk to the start
 * of the in-route. Next frame the same thing happened in reverse. Measured in
 * the running game: **20 leg changes a second for the whole seven seconds they
 * should have been sitting down**, and since `stride` starts the walk clip on
 * every leg change, the animation restarted from frame 0 twenty times a second
 * — which is the spasm. Nobody ever sat down; they stood at the counter
 * vibrating until their leave timer fired.
 *
 * Pure and exported so this is testable without a renderer (§14) — the fault
 * lived inside a per-frame method on a class full of `THREE.Object3D`s, which
 * is exactly the shape of bug that rule exists to catch.
 */
export function legReached(walk: Walk | undefined, leg: Leg, total: number): boolean {
  if (!walk) return false;
  if (LEG_ORDER[walk.leg] > LEG_ORDER[leg]) return true;
  if (walk.leg !== leg) return false;
  return walk.travelled >= total - 1e-4;
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

/** How long a polyline is, in world units. */
function routeLength(points: THREE.Vector3[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += points[i].distanceTo(points[i - 1]);
  return total;
}

/** Place `out` a given *distance* along a polyline. */
function walkRouteBy(out: THREE.Vector3, points: THREE.Vector3[], distance: number): void {
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

  let travelled = THREE.MathUtils.clamp(distance, 0, total);
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
  /** How far each guest is along the route they are currently walking. */
  private readonly walks = new Map<string, Walk>();
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

  /**
   * What the café can put in a guest's hand (`servedRefreshments`).
   *
   * Told rather than read, so this class stays free of the store — and live,
   * because buying the cake display should start putting cake in hands without
   * a reload. Only affects guests built *after* the purchase: re-dressing a
   * customer who is already sitting there with a coffee would be worse.
   */
  private served: Refreshments = ALL_REFRESHMENTS;

  setServed(served: Refreshments): void {
    this.served = served;
  }

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
      this.walks.delete(id);
    }

    for (const visitor of visitors) {
      let character = this.charactersById.get(visitor.id);
      if (!character) {
        if (!this.assets) continue; // pack still loading
        character = new Character(
          this.assets,
          appearanceFromSeed(visitor.seatIndex + visitor.spawnedAt, this.served),
        );
        character.walk();
        this.group.add(character.group);
        this.charactersById.set(visitor.id, character);
      }
      this.positionVisitor(character, visitor, now, delta);
      character.update(delta);
    }
  }

  private positionVisitor(
    character: Character,
    visitor: Visitor,
    now: number,
    delta: number,
  ): void {
    const mesh = character.group;
    const seatPos = this.seats[visitor.seatIndex] ?? this.door;
    const inRoute = [this.door, this.threshold, DOOR_LOBBY_POSITION, COUNTER_POSITION];

    /**
     * **They have got out again**, either from a chair or straight from the
     * counter with a cup. Checked first because it outranks everything: a
     * guest whose chair has just been sold is told to leave mid-walk
     * (`systems/visitors.ts`), and finishing the walk to a chair that is no
     * longer there would be the bug that fix exists to prevent.
     */
    const leaving = visitor.takeaway ? now >= visitor.servedAt : now >= visitor.leavingAt;

    if (leaving) {
      if (this.seated.delete(visitor.id) || this.ordering.delete(visitor.id)) {
        character.express("happy"); // leaving pleased, which is the whole game
      }
      const from = visitor.takeaway ? COUNTER_POSITION : seatPos;
      this.stride(character, visitor, "out", [from, DOOR_LOBBY_POSITION, this.threshold, this.door], delta, now >= visitor.doneAt);
      return;
    }

    // In through the door and up to the counter.
    if (!this.arrived(visitor, "in", inRoute)) {
      this.ordering.delete(visitor.id);
      this.stride(character, visitor, "in", inRoute, delta, now >= visitor.servedAt);
      return;
    }

    /**
     * **At the counter, being served.**
     *
     * They stand still and face the barista — the one moment a guest and the
     * player's own character are actually dealing with each other, which is
     * the whole reason this phase exists (`systems/visitors.ts`).
     */
    if (now < visitor.servedAt) {
      mesh.position.copy(COUNTER_POSITION);
      mesh.rotation.set(0, COUNTER_FACING, 0);
      if (!this.ordering.has(visitor.id)) {
        this.ordering.add(visitor.id);
        this.seated.delete(visitor.id);
        character.idle();
        character.express("happy");
      }
      return;
    }

    // Drink in hand, crossing to their chair.
    if (!this.arrived(visitor, "toSeat", [COUNTER_POSITION, seatPos])) {
      this.ordering.delete(visitor.id);
      this.stride(character, visitor, "toSeat", [COUNTER_POSITION, seatPos], delta, now >= visitor.seatedAt + LATE_SNAP_MS);
      return;
    }

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
  }

  /**
   * Where this guest's head is, for the order chip (`ui/order-chips.ts`).
   *
   * Null while their body has not been built yet — the character pack loads
   * after the sim starts, and a chip floating over nobody is worse than a chip
   * arriving a beat late.
   */
  positionOf(visitorId: string): THREE.Vector3 | null {
    const character = this.charactersById.get(visitorId);
    if (!character) return null;
    return character.group.position.clone().setY(character.group.position.y + 1.72);
  }

  /** Has this guest finished walking the given leg? See `legReached`. */
  private arrived(visitor: Visitor, leg: Leg, route: THREE.Vector3[]): boolean {
    return legReached(this.walks.get(visitor.id), leg, routeLength(route));
  }

  /**
   * Move a guest along a route at walking pace, and keep the walk clip playing.
   *
   * **The clip is started on every leg change, from one place.** It used to be
   * restored by deleting the guest from a bookkeeping `Set` and acting on
   * whether that returned true — so a guest who never made it into the set (a
   * backgrounded tab, a phase shorter than a frame, a body that appeared after
   * its own walk-in) slid across the café in an idle pose. Ellis, 2026-08-26:
   * *"sometimes they … move fast without the walk animation playing."*
   *
   * `snap` finishes the leg instantly. That is for a guest whose schedule has
   * already moved on — resuming from the background, or a body built after the
   * pack finished loading — because the alternative is watching somebody
   * moonwalk across the room to catch up with a clock that left without them.
   */
  private stride(
    character: Character,
    visitor: Visitor,
    leg: Leg,
    route: THREE.Vector3[],
    delta: number,
    snap: boolean,
  ): void {
    let walk = this.walks.get(visitor.id);
    if (!walk || walk.leg !== leg) {
      walk = { leg, travelled: 0 };
      this.walks.set(visitor.id, walk);
      character.walk();
    }
    const total = routeLength(route);
    walk.travelled = snap ? total : Math.min(total, walk.travelled + delta * WALK_SPEED);

    const mesh = character.group;
    const before = mesh.position.clone();
    walkRouteBy(mesh.position, route, walk.travelled);
    // Face the way they're actually travelling, so they turn at the door
    // instead of walking in sideways staring at their chair.
    faceTravel(mesh, before);
  }

}
