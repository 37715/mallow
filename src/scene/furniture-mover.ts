import * as THREE from "three";
import {
  CAFE_LAYOUT,
  DOOR,
  DOOR_LOBBY,
  DOOR_THRESHOLD,
  placedAt,
  placedRotation,
} from "@/data/cafe-layout";
import { tileSurfaces } from "@/scene/cafe-tiles";
import { PATCH, floorBounds } from "@/data/expansion";
import { wallSegments } from "@/scene/cafe-tiles";
import { gameStore } from "@/state/store";
import {
  GRID,
  checkPlacement,
  boundsOf,
  nearestWall,
  turnedBox,
  wallFacing,
  type WallFace,
  rejectionMessage,
  snapToGrid,
  type Footprint,
  type Obstacle,
  type Point,
} from "@/systems/placement";
import type { FurnitureTag } from "@/scene/cafe-room";
import type { PickedFurniture } from "@/scene/furniture-picker";

/**
 * Dragging a piece of furniture to a new spot (§8 "The café editor", step 4).
 *
 * The piece goes translucent, follows your finger across the floor plane,
 * snaps to `GRID`, and turns red where it can't go. Nothing is committed to
 * the store until the player confirms, so cancelling is free and a refused
 * spot never has to be undone.
 *
 * **Validity is checked live, not on drop.** A ghost that follows the finger
 * happily and then refuses on release feels broken; one that goes red under
 * your thumb is telling you something while you can still act on it.
 */

/** How translucent the piece goes while it's in flight. */
const GHOST_OPACITY = 0.6;
const INVALID_TINT = new THREE.Color(0xff6a5a);
/**
 * Ellis: *"either red glow if it cant be placed or green if it can."* The
 * green is deliberately gentler than the red — "yes" should reassure, "no"
 * should stop you, and an equally loud green makes the whole café look like a
 * warning light while you shop.
 */
const VALID_TINT = new THREE.Color(0x7fd47f);
/** How far from the ghost's centre still counts as grabbing it, in world units. */
const GRAB_SLACK = 0.75;

export interface FurnitureMover {
  /**
   * Pick a piece up. `startAt` overrides where the ghost begins — used when a
   * piece has just been *bought*, so it arrives in front of the player rather
   * than at the spot the layout happens to author it at.
   */
  begin(picked: PickedFurniture, startAt?: { x: number; z: number }): void;
  /** Move the ghost to the floor point under this screen position. */
  dragTo(ndc: THREE.Vector2): void;
  /** Move the ghost to a world point directly, snapped to the grid. */
  dragToPoint(at: Point): void;
  isActive(): boolean;
  /**
   * Is the piece in flight under this screen position?
   *
   * Used to decide, once per drag, whether the gesture is "move the piece" or
   * "pan the camera". A generous margin is applied: the ghost can be a floor
   * cushion a centimetre tall on a phone, and requiring a hit on its actual
   * silhouette would make picking it up a game of darts.
   */
  isUnder(ndc: THREE.Vector2): boolean;
  /**
   * The nearest spot to `from` where the piece in flight would actually fit.
   *
   * Used when something is bought: dropping it at the camera's focus point put
   * it inside the counter or behind a wall, where the player could not see the
   * thing they had just paid for.
   */
  nearestValidSpot(from: Point): Point | null;
  /** Where the ghost is right now. */
  position(): Point;
  /** Turn the piece a quarter turn. Re-checks the fit at the new angle. */
  rotate(): void;
  /** Where and how it ended up, or null if the spot is refused. */
  commit(): { x: number; z: number; rot: number } | null;
  cancel(): void;
  /**
   * The rules as the mover sees them, for debugging.
   *
   * §17 asks for debug visualisation on anything spatial, and this is the one
   * place where a wrong box is invisible until a player cannot put their chair
   * back. Dev builds only — see `window.__mallow`.
   */
  debugRules(): { surfaces: Footprint[]; obstacles: Obstacle[]; route: Point[] };
}

export interface FurnitureMoverOptions {
  camera: THREE.PerspectiveCamera;
  /** Where the block grid lives. Not the room group — that is rebuilt whenever
   *  anything is bought or recoloured, which would take the grid with it. */
  scene: THREE.Scene;
  getRoomGroup: () => THREE.Group;
  onValidity: (ok: boolean, message?: string) => void;
}

const ARCHITECTURE_SLOTS = new Set(["floor", "floorStep", "wallPlain", "wallWindow"]);

/**
 * How far off the wall a hanging piece sits.
 *
 * The authored blackboard is at x −1.964 against a floor edge at −2, so this
 * is the pack's own answer rather than a guess.
 */
const WALL_INSET = 0.036;

/** The route guests walk. Pieces may not be dropped on it — no pathfinding. */
const ROUTE: Point[] = [DOOR, DOOR_THRESHOLD, DOOR_LOBBY];

export function createFurnitureMover(options: FurnitureMoverOptions): FurnitureMover {
  const { camera, getRoomGroup, onValidity, scene } = options;

  /**
   * The blocks, drawn on the floor while something is in flight.
   *
   * Ellis: *"it snaps across blocks. everything should be blocks."* The snap
   * existed long before this and read as drift, because nothing on screen said
   * what it was snapping *to*. Showing the grid is most of what turns a snap
   * into a feeling of placement — and it appears only while placing, so the
   * café is never a spreadsheet when you are just looking at it.
   */
  // Sized to the *whole* floor, not the home tile, so an expanded café still
  // shows blocks under the piece you are carrying.
  /** What the save currently records as this piece's rotation. */
  function storedRotationOf(id: string): number {
    const state = gameStore.getState();
    const instance = state.instances.find((i) => i.id === id);
    if (instance) return instance.rot ?? 0;
    return state.placements[id]?.rot ?? 0;
  }

  const bounds = floorBounds(gameStore.getState().tiles);
  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ);
  const grid = new THREE.GridHelper(span, Math.round(span / GRID), 0xffffff, 0xffffff);
  grid.position.x = (bounds.minX + bounds.maxX) / 2;
  grid.position.z = (bounds.minZ + bounds.maxZ) / 2;
  const gridMaterial = grid.material as THREE.Material;
  gridMaterial.transparent = true;
  gridMaterial.opacity = 0.16;
  gridMaterial.depthWrite = false;
  // Just clear of the floorboards. Any lower and it z-fights with them; any
  // higher and it visibly floats over the rug.
  grid.position.y = 0.012;
  grid.visible = false;
  grid.renderOrder = 2;
  scene.add(grid);

  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const raycaster = new THREE.Raycaster();
  const hit = new THREE.Vector3();

  let object: THREE.Object3D | null = null;
  let tag: FurnitureTag | null = null;
  let origin = { x: 0, z: 0 };
  let current = { x: 0, z: 0 };
  /**
   * Extra rotation, in quarter turns.
   *
   * **Quarter turns, not free rotation**, for the same reason positions snap
   * to a grid: a café of furniture at arbitrary angles reads as knocked over
   * rather than arranged. It is also what keeps the collision box honest — at
   * 90° the footprint is the original with x and z swapped, which is exact,
   * where an arbitrary angle would need a rotated hull.
   */
  let quarters = 0;
  let storedRot = 0;
  let baseRotation = 0;
  /** The ghost's world angle: what the layout gave it, plus the player's turns. */
  const ghostAngle = (): number => baseRotation + (quarters * Math.PI) / 2;
  let valid = true;
  const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();

  function setGhost(on: boolean, ok = true): void {
    if (!object) return;
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      if (on) {
        if (!originalMaterials.has(child)) originalMaterials.set(child, child.material);
        const base = originalMaterials.get(child)!;
        const source = Array.isArray(base) ? base[0] : base;
        // Clone per drag rather than mutating: these materials are shared
        // across the whole atlas, so tinting one in place turns the entire
        // café red (§9 — everything shares one material).
        const ghost = (source as THREE.MeshStandardMaterial).clone();
        ghost.transparent = true;
        ghost.opacity = GHOST_OPACITY;
        ghost.depthWrite = false;
        ghost.color.lerp(ok ? VALID_TINT : INVALID_TINT, ok ? 0.3 : 0.65);
        ghost.emissive = new THREE.Color(ok ? VALID_TINT : INVALID_TINT);
        ghost.emissiveIntensity = ok ? 0.16 : 0.3;
        child.material = ghost;
      } else {
        const base = originalMaterials.get(child);
        if (base) child.material = base;
      }
    });
    if (!on) originalMaterials.clear();
  }

  /**
   * What counts as standable ground: the floor slab, plus the entrance step,
   * which sticks out past it and carries the doormat. Measured from the meshes
   * rather than assumed, so a wall-style change that resizes the step is
   * picked up for free.
   */
  function surfaces(): Footprint[] {
    // One rectangle per owned floor tile (§8 step 6), plus the entrance step,
    // which juts past the slab and carries the doormat. Measured from the
    // meshes rather than assumed, so a wall-style change that resizes the step
    // is picked up for free.
    const out: Footprint[] = tileSurfaces(gameStore.getState().tiles);
    const placements = gameStore.getState().placements;
    for (const child of getRoomGroup().children) {
      const other = child.userData.furniture as FurnitureTag | undefined;
      if (!other?.size) continue;
      const item = CAFE_LAYOUT[other.index];
      if (item?.slot !== "floorStep") continue;
      const at = placedAt(item, placements);
      /**
       * **Measured from the mesh, not from the placement.**
       *
       * Architecture is placed by its authored *offset* rather than centred on
       * its coordinates — `Flooring_A_Entrance` spans x −1…0.87 in its own
       * frame — so `footprintAt`, which centres, put the entrance step a third
       * of a unit out. The rug straddles the step and the slab, so its far
       * corners landed on nothing and it was refused at its own authored
       * position. Reading the world box off the object cannot drift like that.
       */
      const box = new THREE.Box3().setFromObject(child);
      out.push({ minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z });
      void at;
    }
    return out;
  }

  /**
   * The two wall runs, as faces a hanging piece may be put on.
   *
   * Derived from the floor rather than from the wall meshes: growth is +x/+z
   * only (§8 step 6), so the −x and −z edges of the floor plan *are* where the
   * walls are, and this cannot go stale when the café expands.
   */
  function wallFaces(): WallFace[] {
    // **One face per segment, not one per run.** A window belongs to a segment
    // (§ `wallSegmentId`), so a run-wide face could not say which part of a
    // long wall is glass.
    const state = gameStore.getState();
    const half = PATCH / 2;
    return wallSegments(state.tiles, state.windows).map((segment) =>
      segment.side === "left"
        ? {
            axis: "x" as const,
            at: segment.x,
            from: segment.z - half,
            to: segment.z + half,
            glazed: segment.glazed,
          }
        : {
            axis: "z" as const,
            at: segment.z,
            from: segment.x - half,
            to: segment.x + half,
            glazed: segment.glazed,
          },
    );
  }

  /**
   * Rugs and mats: things furniture may sit on top of.
   *
   * **Read from the layout, never measured.** This used to be "shorter than
   * 0.3 units", which made the cat bed and the floor cushions walk-over by
   * accident — you could drop a table straight onto the cat bed and the ghost
   * stayed green. See `Placement.walkOver`.
   */
  function isFlat(item: FurnitureTag): boolean {
    return CAFE_LAYOUT[item.index]?.walkOver === true;
  }

  /** Every other solid piece, as boxes, at their current positions. */
  function obstacles(): Obstacle[] {
    const placements = gameStore.getState().placements;
    const out: Obstacle[] = [];
    for (const child of getRoomGroup().children) {
      const other = child.userData.furniture as FurnitureTag | undefined;
      if (!other || !other.size) continue;
      const item = CAFE_LAYOUT[other.index];
      if (!item) continue;
      const at = placedAt(item, placements);
      const box = turnedBox(other.size, at.x, at.z, placedRotation(item, placements));
      const onWall = other.wall === true || (item.y ?? 0) > 1.2;
      out.push({
        // The axis-aligned bounds for the cheap tests, and the real rectangle
        // for collision — see `Turned`.
        ...boundsOf(box),
        turned: box,
        id: other.id,
        // Flat things are meant to be stood on. Architecture is excluded too:
        // the floor and walls are the building, and are handled by the
        // supported-surface check rather than by collision.
        flat: isFlat(other) || ARCHITECTURE_SLOTS.has(item.slot ?? ""),
        // **Seats only, deliberately narrower than the layout test.** That
        // test also skips every `Table_`, which would include the kitchen
        // counter — and "a stool dropped behind the counter is legal to stand
        // and impossible to use" is a rule this validator exists to enforce
        // (2026-08-07). Seats are the whole of the disagreement in practice.
        seating: item.seat === true,
        wall: onWall,
      });
    }
    return out;
  }

  function evaluate(): void {
    if (!tag?.size) return;
    const turned = turnedBox(tag.size, current.x, current.z, ghostAngle());
    const check = checkPlacement(boundsOf(turned), obstacles(), ROUTE, {
      surfaces: surfaces(),
      routeClearance: 0.34,
      approachFrom: DOOR_LOBBY,
      walls: wallFaces(),
    }, {
      id: tag.id,
      flat: isFlat(tag),
      seat: CAFE_LAYOUT[tag.index]?.seat === true,
      wall: tag.wall === true,
      turned,
    });
    valid = check.ok;
    setGhost(true, valid);
    onValidity(valid, check.reason ? rejectionMessage(check.reason) : undefined);
  }

  return {
    debugRules: () => ({ surfaces: surfaces(), obstacles: obstacles(), route: ROUTE }),

    begin(picked, startAt) {
      object = picked.object;
      tag = picked.tag;
      origin = { x: object.position.x, z: object.position.z };
      quarters = 0;
      baseRotation = object.rotation.y;
      /**
       * The rotation already *stored* for this piece, which is not the same as
       * the one on screen: a layout piece renders at `rotY + rot` and stores
       * only `rot`. Committing `quarters` alone therefore threw away every
       * previous turn the moment the piece was picked up again.
       */
      storedRot = picked.tag.id ? storedRotationOf(picked.tag.id) : 0;
      current = startAt
        ? { x: snapToGrid(startAt.x), z: snapToGrid(startAt.z) }
        : { ...origin };
      object.position.x = current.x;
      object.position.z = current.z;
      grid.visible = true;
      setGhost(true, true);
      evaluate();
    },

    dragTo(ndc) {
      if (!object) return;
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(floorPlane, hit)) return;
      this.dragToPoint({ x: hit.x, z: hit.z });
    },

    dragToPoint(at) {
      if (!object) return;
      current = { x: snapToGrid(at.x), z: snapToGrid(at.z) };
      /**
       * A hanging piece sticks to the nearest wall and turns to face the room.
       *
       * Doing it here rather than refusing a near-miss is the difference
       * between "choose a wall" and "hit a line": you slide a finger along the
       * wall you want and the board follows it. Out of reach of any wall it
       * stays where your finger is and reads red, which is what says *this is
       * not somewhere a board goes*.
       */
      if (tag?.wall) {
        const wall = nearestWall(current, wallFaces());
        if (wall) {
          if (wall.axis === "x") current.x = wall.at + WALL_INSET;
          else current.z = wall.at + WALL_INSET;
          baseRotation = wallFacing(wall);
          quarters = 0;
          object.rotation.y = baseRotation;
        }
      }
      object.position.x = current.x;
      object.position.z = current.z;
      evaluate();
    },

    isActive: () => object !== null,
    position: () => ({ ...current }),

    rotate() {
      if (!object) return;
      quarters = (quarters + 1) % 4;
      object.rotation.y = baseRotation + (quarters * Math.PI) / 2;
      evaluate();
    },

    nearestValidSpot(from) {
      if (!tag?.size) return null;
      const size = tag.size;
      const id = tag.id;
      const flat = isFlat(tag);
      const seat = CAFE_LAYOUT[tag.index]?.seat === true;
      const obs = obstacles();
      const surf = surfaces();

      const wall = tag.wall === true;
      const faces = wallFaces();
      const fits = (x: number, z: number): boolean => {
        const turned = turnedBox(size, x, z, ghostAngle());
        return checkPlacement(
          boundsOf(turned),
          obs,
          ROUTE,
          { surfaces: surf, routeClearance: 0.34, approachFrom: DOOR_LOBBY, walls: faces },
          { id, flat, seat, wall, turned },
        ).ok;
      };

      // Spiral outward a grid step at a time: the first ring that fits is the
      // closest place to where the player is looking, which is the only spot
      // they can be expected to find.
      // A hanging piece starts against the wall nearest where you are looking,
      // not out in the middle of the room where it can never be valid.
      const anchor = wall
        ? (() => {
            const face = nearestWall(from, faces) ?? faces[0];
            return face.axis === "x"
              ? { x: face.at + WALL_INSET, z: from.z }
              : { x: from.x, z: face.at + WALL_INSET };
          })()
        : from;
      const startX = snapToGrid(anchor.x);
      const startZ = snapToGrid(anchor.z);
      if (fits(startX, startZ)) return { x: startX, z: startZ };
      for (let ring = 1; ring <= 16; ring++) {
        for (let dx = -ring; dx <= ring; dx++) {
          for (let dz = -ring; dz <= ring; dz++) {
            // Only the ring's edge — the inside was covered by earlier rings.
            if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
            const x = startX + dx * GRID;
            const z = startZ + dz * GRID;
            if (fits(x, z)) return { x, z };
          }
        }
      }
      return null;
    },

    isUnder(ndc) {
      if (!object) return false;
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.intersectObject(object, true).length > 0) return true;
      // Missed the mesh — fall back to "did you point at the floor near it?",
      // which is what a thumb aiming at a small object on a phone actually
      // does. GRAB_SLACK is in world units, so it scales with zoom for free.
      if (!raycaster.ray.intersectPlane(floorPlane, hit)) return false;
      return Math.hypot(hit.x - current.x, hit.z - current.z) <= GRAB_SLACK;
    },

    commit() {
      if (!object || !valid) return null;
      setGhost(false);
      grid.visible = false;
      // A hanging piece stores the *absolute* facing the wall gave it; a
      // floor piece stores its turn relative to however it was already
      // standing. Both are what the renderer reads back.
      const at = {
        ...current,
        rot: tag?.wall ? baseRotation : storedRot + (quarters * Math.PI) / 2,
      };
      object = null;
      tag = null;
      return at;
    },

    cancel() {
      if (!object) return;
      object.position.x = origin.x;
      object.position.z = origin.z;
      object.rotation.y = baseRotation;
      setGhost(false);
      grid.visible = false;
      object = null;
      tag = null;
    },
  };
}
