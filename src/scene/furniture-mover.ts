import * as THREE from "three";
import {
  CAFE_LAYOUT,
  COUNTER_QUEUE,
  DOOR,
  DOOR_LOBBY,
  DOOR_THRESHOLD,
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
import { INSTANCE_INDEX_BASE, type FurnitureTag } from "@/scene/cafe-room";
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

/** How much room a guest needs either side of the line they walk. */
const ROUTE_CLEARANCE = 0.34;

/**
 * The walking route, drawn on the floor while a piece is in flight.
 *
 * Ellis, 2026-08-26: *"the pathway that people walk through making objects
 * unplacable can be innacruate or random like i cant place a furniture
 * somewhere they nobody even needs to walk."* Half of that was the disc
 * `systems/placement.ts` used to measure with, and is fixed there. **The other
 * half is that the rule has never been on screen at all** — the ghost simply
 * went red on open boards, which is indistinguishable from a bug, and §9's
 * standing rule is that a refusal the player cannot see the reason for is
 * worse than no rule.
 *
 * So it is drawn, next to the grid and for the same reason the grid is drawn:
 * a constraint you can watch yourself approach stops being arbitrary. Shown
 * only for the pieces the rule applies to — a chair may stand on the route
 * (the café's own doorstep cushion does), so carrying one shows nothing.
 */
function routeRibbon(points: Point[], halfWidth: number): THREE.BufferGeometry {
  const perp = (from: Point, to: Point): Point => {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const length = Math.hypot(dx, dz) || 1;
    return { x: -dz / length, z: dx / length };
  };

  const offsets: Point[] = points.map((_, i) => {
    const before = i > 0 ? perp(points[i - 1], points[i]) : null;
    const after = i < points.length - 1 ? perp(points[i], points[i + 1]) : null;
    if (!before) return after!;
    if (!after) return before;
    // Mitred, so the two legs meet in one surface rather than two overlapping
    // quads — translucent geometry that laps itself reads as a bright patch at
    // every corner.
    const mx = before.x + after.x;
    const mz = before.z + after.z;
    const length = Math.hypot(mx, mz) || 1;
    const unit = { x: mx / length, z: mz / length };
    const scale = 1 / Math.max(0.35, unit.x * before.x + unit.z * before.z);
    return { x: unit.x * scale, z: unit.z * scale };
  });

  /**
   * Three vertices per point — left edge, centre, right edge — so the strip
   * can fade out at its sides.
   *
   * **A flat band did not read.** It is a warm overlay on warm floorboards,
   * and at any opacity low enough to be cosy it looked like a patch of light
   * rather than a path. A soft edge fixes both halves of that: it is legible
   * because the bright centre has somewhere to fall off *to*, and it is
   * honest, because the true limit is not the line drawn here — a piece is
   * refused when its own rectangle comes within `ROUTE_CLEARANCE` of the
   * centre line, so how far out you may stand depends on the piece in your
   * hand. A hard edge would be a promise the rule does not make.
   */
  const vertices: number[] = [];
  const colours: number[] = [];
  const push = (i: number, side: number): void => {
    vertices.push(
      points[i].x + offsets[i].x * halfWidth * side,
      0,
      points[i].z + offsets[i].z * halfWidth * side,
    );
    colours.push(1, 1, 1, side === 0 ? 1 : 0);
  };
  for (let i = 1; i < points.length; i++) {
    for (const [inner, outer] of [
      [0, -1],
      [0, 1],
    ]) {
      push(i - 1, outer);
      push(i - 1, inner);
      push(i, inner);
      push(i - 1, outer);
      push(i, inner);
      push(i, outer);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colours, 4));
  return geometry;
}

/**
 * Is this piece walk-over — a rug or a mat, meant to be stood on?
 *
 * **Read from the layout, never measured.** This used to be "shorter than 0.3
 * units", which made the cat bed and the floor cushions walk-over by accident
 * — you could drop a table straight onto the cat bed and the ghost stayed
 * green. See `Placement.walkOver`.
 *
 * An *instance* has no layout row and is always solid: nothing the shop sells
 * more than one of is a rug. If one ever is, this wants a flag on `ShopItem`,
 * not another height guess — the guess is the bug `walkOver` exists to undo.
 */
export function isFlat(tag: FurnitureTag): boolean {
  return CAFE_LAYOUT[tag.index]?.walkOver === true;
}

/**
 * One piece of the room, as an obstacle the validator can test against — or
 * `null` for the things that are the *building* rather than furniture in it.
 *
 * **This is where cat beds became stackable.** A tag's `index` is a row of
 * `CAFE_LAYOUT`, except for the two kinds of object that have no row and carry
 * a negative index instead (`cafe-room.ts`): generated wall segments at
 * `-1 - n`, and player-placed instances — every cat bed, every second plant,
 * every copy — from `INSTANCE_INDEX_BASE` downward. The old code skipped the
 * piece whenever the layout lookup missed, which quietly meant **every
 * instance was invisible to collision**. Ellis, 2026-08-17: *"i can place cat
 * beds and some other furniture on top of each other so hit boxes not properly
 * working."*
 *
 * Only architecture may be skipped, and for the same reason the floor is
 * marked `flat`: the building is handled by the supported-surface and
 * wall-face checks, and treating a wall as an obstacle would refuse the
 * authored furniture that stands against it.
 *
 * Pure, and exported, so the classification can be tested without a scene —
 * the fault above was invisible to every existing test precisely because it
 * lived inside a loop over `THREE.Object3D`s.
 */
export function obstacleFor(
  tag: FurnitureTag,
  x: number,
  z: number,
  rotY: number,
): Obstacle | null {
  if (!tag.size) return null;
  const item = CAFE_LAYOUT[tag.index];
  const isInstance = tag.index <= INSTANCE_INDEX_BASE;
  if (!item && !isInstance) return null;

  const box = turnedBox(tag.size, x, z, rotY);
  return {
    // The axis-aligned bounds for the cheap tests, and the real rectangle for
    // collision — see `Turned`.
    ...boundsOf(box),
    turned: box,
    id: tag.id,
    // Read off the measured mesh, so "could a guest step over this?" is a fact
    // about the art rather than a guess — see `STEP_OVER`.
    height: tag.size.y,
    flat: isFlat(tag) || ARCHITECTURE_SLOTS.has(item?.slot ?? ""),
    // **Seats only, deliberately narrower than the layout test.** That test
    // also skips every `Table_`, which would include the kitchen counter — and
    // "a stool dropped behind the counter is legal to stand and impossible to
    // use" is a rule this validator exists to enforce (2026-08-07). Seats are
    // the whole of the disagreement in practice.
    seating: item?.seat === true,
    wall: tag.wall === true || (item?.y ?? 0) > 1.2,
  };
}

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

  const path = new THREE.Mesh(
    // From the doormat inward, not from where guests appear off-frame: the
    // first leg is out over the street, where the ribbon has no floor to lie
    // on and hangs over the backdrop. Nothing the player can drag reaches out
    // there anyway — `supported` refuses it long before the route rule does —
    // so that leg is a constraint that can never actually bite.
    routeRibbon(ROUTE.slice(1), ROUTE_CLEARANCE),
    new THREE.MeshBasicMaterial({
      // Warm chalk rather than a warning colour: this is where guests walk,
      // not somewhere the player has done something wrong.
      color: 0xffe8c8,
      vertexColors: true,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  /**
   * **Above the grid, not below it, and that is a depth-buffer fact rather
   * than a design choice.** The composer's render target has a low-precision
   * depth buffer (§9), so at this camera distance the first tenth of a unit
   * off the boards is worth about one depth step — the ribbon sat at 0.008,
   * lost the test against the floor it was lying on, and rendered as nothing
   * at all while reporting `visible: true` from the console. The grid has been
   * at 0.012 since it was written and reads fine, so this goes just above it
   * and takes a lower `renderOrder` instead, which puts the blocks back on top
   * where they belong.
   */
  path.position.y = 0.016;
  path.visible = false;
  path.renderOrder = 1;
  scene.add(path);

  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const raycaster = new THREE.Raycaster();
  const hit = new THREE.Vector3();

  let object: THREE.Object3D | null = null;
  let tag: FurnitureTag | null = null;
  let origin = { x: 0, z: 0 };
  let current = { x: 0, z: 0 };
  /**
   * Extra rotation, in **eighth** turns — 45° a press.
   *
   * Ellis, 2026-08-26: *"chair and furniture rotation is currently 90 degrees
   * when it should be every 45 for more precision."* Right, and cheaper than
   * the old comment here feared: it used to argue that 90° "keeps the
   * collision box honest — at 90° the footprint is the original with x and z
   * swapped, which is exact, where an arbitrary angle would need a rotated
   * hull". **The rotated hull already exists.** `systems/placement.ts` has
   * worked in oriented boxes since it was written — `turnedBox`, `cornersOf`
   * and a separating-axis test — so the validator has never once relied on the
   * angle being a right angle. The constraint was true of a design that was
   * never built.
   *
   * Still stepped rather than free, for the same reason positions snap to a
   * grid: a café of furniture at arbitrary angles reads as knocked over rather
   * than arranged. Eight steps is the most precision you can add while every
   * piece still lines up with either a wall or a corner.
   */
  let eighths = 0;
  let storedRot = 0;
  let baseRotation = 0;
  /** One press of the rotate button. */
  const STEP = Math.PI / 4;
  /** The ghost's world angle: what the layout gave it, plus the player's turns. */
  const ghostAngle = (): number => baseRotation + eighths * STEP;
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
    for (const child of getRoomGroup().children) {
      const other = child.userData.furniture as FurnitureTag | undefined;
      if (!other?.size) continue;
      const item = CAFE_LAYOUT[other.index];
      if (item?.slot !== "floorStep") continue;
      // **The mesh, not the placement.** The entrance rides the floor's outer
      // edge as the café grows (`Placement.followsEdge`), so the layout's
      // authored coordinates are the *old* doorway once anything is built.
      // The object in the room is already where it really is.
      const at = child.position;
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

  /** Every other solid piece, as boxes, at their current positions. */
  function obstacles(): Obstacle[] {
    const out: Obstacle[] = [];
    for (const child of getRoomGroup().children) {
      const other = child.userData.furniture as FurnitureTag | undefined;
      if (!other) continue;
      // **Read off the mesh, not the layout**, for both position and angle:
      // an instance has no layout row at all, and an authored piece may have
      // been carried by the floor's edge (`Placement.followsEdge`) or by its
      // parent (`attachTo`) since its coordinates were written down.
      // `place()` sets exactly `placedRotation(...)` into `rotation.y`, so the
      // object already carries the answer for both kinds.
      const obstacle = obstacleFor(other, child.position.x, child.position.z, child.rotation.y);
      if (obstacle) out.push(obstacle);
    }
    return out;
  }

  function evaluate(): void {
    if (!tag?.size) return;
    const turned = turnedBox(tag.size, current.x, current.z, ghostAngle());
    const check = checkPlacement(boundsOf(turned), obstacles(), ROUTE, {
      surfaces: surfaces(),
      routeClearance: ROUTE_CLEARANCE,
      approachFrom: COUNTER_QUEUE,
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
      eighths = 0;
      baseRotation = object.rotation.y;
      /**
       * The rotation already *stored* for this piece, which is not the same as
       * the one on screen: a layout piece renders at `rotY + rot` and stores
       * only `rot`. Committing `eighths` alone therefore threw away every
       * previous turn the moment the piece was picked up again.
       */
      storedRot = picked.tag.id ? storedRotationOf(picked.tag.id) : 0;
      current = startAt
        ? { x: snapToGrid(startAt.x), z: snapToGrid(startAt.z) }
        : { ...origin };
      object.position.x = current.x;
      object.position.z = current.z;
      grid.visible = true;
      // Only for the pieces the walkway rule can refuse. A seat may stand on
      // the route and a rug is walked over, so showing it to either would be
      // drawing a constraint that is not there.
      path.visible =
        picked.tag.wall !== true && !isFlat(picked.tag) && CAFE_LAYOUT[picked.tag.index]?.seat !== true;
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
          eighths = 0;
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
      eighths = (eighths + 1) % 8;
      object.rotation.y = baseRotation + eighths * STEP;
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
          { surfaces: surf, routeClearance: ROUTE_CLEARANCE, approachFrom: COUNTER_QUEUE, walls: faces },
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
      path.visible = false;
      // A hanging piece stores the *absolute* facing the wall gave it; a
      // floor piece stores its turn relative to however it was already
      // standing. Both are what the renderer reads back.
      const at = {
        ...current,
        rot: tag?.wall ? baseRotation : storedRot + eighths * STEP,
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
      path.visible = false;
      object = null;
      tag = null;
    },
  };
}
