import { CAFE_LAYOUT, placedAt, type Placement, type Placements } from "@/data/cafe-layout";
import { shopItem } from "@/data/shop";
import type { Customisation } from "@/data/customisation";
import {
  HOME_TILE,
  PATCH,
  wallSegmentId,
  type WallSide,
  isRoomPatch,
  ownedPatches,
  ownedTiles,
  tileCentre,
  tileKey,
  type Tile,
  type TileKey,
} from "@/data/expansion";

export { HOME_TILE };

/**
 * Turning bought patches into floor.
 *
 * A bought square is a whole module, so it draws its floor at full scale — the
 * planks and the raised border match the café's own — and the wall runs extend
 * along it from the pack's kit. See `PATCH` in `data/expansion.ts` for why
 * anything smaller cannot do either.
 *
 * **Floor slabs are marked `walkOver`.** They *are* the ground; without it the
 * placement validator would treat each one as an obstacle and refuse to let
 * anything stand on the floor the player just bought.
 *
 * Floor thickness: slabs are 0.26 deep and placed base-down, so they drop by
 * their own thickness to put the walking surface at y=0 (`cafe-layout.ts`).
 */
const FLOOR_THICKNESS = 0.26;

function floorStyle(choice: Customisation): string {
  return choice.floor ?? choice.walls ?? "A";
}

/**
 * Every floor slab and wall segment implied by the owned tiles — *excluding*
 * the home tile's own floor, which the authored layout already provides.
 *
 * Returns an empty list for an unexpanded café, which is the property that
 * keeps the original diorama untouched byte for byte.
 */
export function expansionPlacements(
  tiles: TileKey[],
  choice: Customisation,
  windows: string[],
): Placement[] {
  const owned = ownedTiles(tiles);
  const glazed = new Set(windows);

  const style = choice.walls ?? "A";
  const floor = floorStyle(choice);
  const has = new Set(owned.map(tileKey));
  const out: Placement[] = [];

  // --- Floor -------------------------------------------------------------
  for (const tile of owned) {
    // **`isRoomPatch`, not a compare against `HOME_TILE`.** The room is stored
    // under the key "room" but *occupies* square (0,0), so comparing keys let
    // a second floor slab be drawn straight on top of the authored one.
    if (isRoomPatch(tile)) continue;
    const at = tileCentre(tile);
    out.push({
      asset: `Flooring_${floor}_Tiling`,
      x: at.x,
      z: at.z,
      y: -FLOOR_THICKNESS,
      // A full module at full scale, so the boards and the raised border match
      // the café's own floor exactly. This is the entire reason squares are
      // 4 units — see `PATCH` in `data/expansion.ts`.
      walkOver: true,
    });
  }

  // --- Walls -------------------------------------------------------------
  //
  // A square needs a −x wall if nothing is to its −x, and a −z wall if nothing
  // is to its −z. Because growth is non-negative only, that always means the
  // runs along x=0 and z=0.
  const needsLeft = (t: Tile) => !has.has(tileKey({ x: t.x - 1, z: t.z }));
  const needsBack = (t: Tile) => !has.has(tileKey({ x: t.x, z: t.z - 1 }));

  const leftRun = owned.filter(needsLeft).sort((a, b) => a.z - b.z);
  const backRun = owned.filter(needsBack).sort((a, b) => a.x - b.x);

  for (const tile of leftRun) {
    const at = tileCentre(tile);
    const id = wallSegmentId("left", tile);
    // `Window_` is a twin of every piece in the kit, so glazing a segment is
    // a name swap — see `WINDOW_PRICE`.
    const glass = glazed.has(id) ? "Window_" : "";
    out.push({
      id,
      asset: `Wall_${style}_${glass}Light_${wallPiece(needsBack(tile), tile.z === leftRun[leftRun.length - 1].z, "X")}`,
      x: at.x,
      z: at.z,
      y: -FLOOR_THICKNESS,
    });
  }

  for (const tile of backRun) {
    const at = tileCentre(tile);
    const id = wallSegmentId("back", tile);
    const glass = glazed.has(id) ? "Window_" : "";
    out.push({
      id,
      asset: `Wall_${style}_${glass}Dark_${wallPiece(needsLeft(tile), tile.x === backRun[backRun.length - 1].x, "XL")}`,
      x: at.x,
      z: at.z,
      y: -FLOOR_THICKNESS,
    });
  }

  return out;
}

/**
 * Which wall segments already have something hanging on them.
 *
 * Ellis, 2026-08-25: *"shouldnt be able to have window where theres a bloody
 * menu blackboard too but it was there."* Right — the pack's window is a hole
 * in the wall piece, so glazing a segment cuts the plaster out from behind
 * whatever is nailed to it. The rule runs both ways: this blocks the window,
 * and `systems/placement.ts` blocks the board.
 */
export function occupiedWalls(
  placements: Placements,
  purchased: string[],
  instances: { item: string; x: number; z: number }[],
): Set<string> {
  const out = new Set<string>();
  const add = (x: number, z: number) => {
    // Nearest run, then nearest tile along it. A hanging piece sits ~0.04 off
    // the wall, so "which run" is never ambiguous.
    const tile = { x: Math.round(x / PATCH), z: Math.round(z / PATCH) };
    if (Math.abs(x - (tile.x * PATCH - PATCH / 2)) < 0.5) {
      out.add(wallSegmentId("left", tile));
    }
    if (Math.abs(z - (tile.z * PATCH - PATCH / 2)) < 0.5) {
      out.add(wallSegmentId("back", tile));
    }
  };

  for (const item of CAFE_LAYOUT) {
    const owner = item.shopItem ? shopItem(item.shopItem) : undefined;
    if (!owner?.wall || !purchased.includes(item.shopItem!)) continue;
    const at = placedAt(item, placements);
    add(at.x, at.z);
  }
  for (const instance of instances) {
    if (!shopItem(instance.item)?.wall) continue;
    add(instance.x, instance.z);
  }
  return out;
}

/**
 * Every wall segment the café has, so the builder can offer to glaze them.
 *
 * Derived from the same runs the meshes are, rather than read back off the
 * scene: a marker has to appear on a wall whether or not it has been built
 * yet this frame, and re-deriving is cheaper than walking the graph.
 */
export function wallSegments(
  tiles: TileKey[],
  windows: string[],
): { id: string; side: WallSide; x: number; z: number; glazed: boolean }[] {
  const owned = ownedTiles(tiles);
  const has = new Set(owned.map(tileKey));
  const glazed = new Set(windows);
  const out: { id: string; side: WallSide; x: number; z: number; glazed: boolean }[] = [];

  for (const tile of owned) {
    const at = tileCentre(tile);
    for (const side of ["left", "back"] as WallSide[]) {
      const neighbour =
        side === "left" ? { x: tile.x - 1, z: tile.z } : { x: tile.x, z: tile.z - 1 };
      if (has.has(tileKey(neighbour))) continue;
      const id = wallSegmentId(side, tile);
      // Nudged to the middle of the wall rather than the middle of the square,
      // so a marker sits on the thing it is offering to change.
      out.push({
        id,
        side,
        x: side === "left" ? at.x - PATCH / 2 : at.x,
        z: side === "back" ? at.z - PATCH / 2 : at.z,
        glazed: glazed.has(id),
      });
    }
  }
  return out;
}

/**
 * The piece name for a position in a run.
 *
 * The kit ships each edge as `Corner_*` (turns the corner), `Mid` (a straight
 * run) and `Mid_End_X`/`_XL` (a run finishing in the small rounded end or the
 * big sweeping arch), and every one of them twice over — `Light` authored for
 * a square's −x edge, `Dark` for its −z (§9: those words are *sides*, not
 * colours). A segment is picked by two questions: is it the corner, and is it
 * the last one. Get it wrong and the café is inside-out.
 */
function wallPiece(corner: boolean, last: boolean, end: "X" | "XL"): string {
  if (corner && last) return `Corner_End_${end}`;
  if (corner) return "Corner_Mid";
  if (last) return `Mid_End_${end}`;
  return "Mid";
}

/**
 * Is this spot inside a bought patio?
 *
 * Used to retire the entrance notch once a patch covers it — two floor slabs
 * on the same ground z-fight, and the notch is the smaller, older one.
 */
export function coveredByPatch(tiles: TileKey[], x: number, z: number): boolean {
  const half = PATCH / 2;
  return ownedPatches(tiles).some((tile) => {
    const at = tileCentre(tile);
    return Math.abs(at.x - x) <= half && Math.abs(at.z - z) <= half;
  });
}

/** Standable ground, one rectangle per tile — what the placement validator needs. */
export function tileSurfaces(tiles: TileKey[]): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}[] {
  const half = PATCH / 2;
  return ownedTiles(tiles).map((tile) => {
    const at = tileCentre(tile);
    return {
      minX: at.x - half,
      maxX: at.x + half,
      minZ: at.z - half,
      maxZ: at.z + half,
    };
  });
}
