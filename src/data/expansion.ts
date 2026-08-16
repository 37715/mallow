/**
 * Buying more floor (§8 "The café editor", step 6).
 *
 * Ellis: *"expanding the cafe should be possible so you can buy with cash
 * another section of the floor … it shows all the possible places i can add
 * more flooring like transparent with a little plus and a cost and if i press
 * plus it builds the floor there."*
 *
 * ## The one constraint that shapes everything: the café may only grow *out*
 *
 * The room is a **cutaway diorama** with walls on −x and −z and the camera
 * parked on the open corner (§9). Every authored prop hangs off those two
 * walls — the blackboard and shelves on −x, the window seat on the sill of −z
 * — and the door, doormat and pavement sign sit on the +z edge.
 *
 * So growth happens *outside* the walled footprint only. Extend away from the
 * walls and nothing authored has to move: the window stays on the wall it was
 * drawn for and the entrance stays where guests already walk in. Put floor
 * inside the walls and every one of those relationships breaks at once.
 *
 * ## Patches are half a module, and carry no walls
 *
 * They were the pack's full 4-unit module at first, so each purchase doubled
 * the café in one go and every patch dragged a wall segment along with it.
 * Ellis, 2026-08-17: *"i was hoping smaller squares. we already have the
 * little notch in the floor poking out. makes sense to extend like that."*
 *
 * Right, and following the notch settles the wall question too. That notch is
 * the entrance step: open floor, no walls, poking out past the room. A patch
 * is the same idea — **a patio, not a room** — which is exactly the "small
 * extension, a nook" §0's direction box allows, and it means the wall kit
 * never has to be assembled at all. Growth stays outside the walled footprint,
 * so the two walls the café has are never asked to grow or move.
 */

/**
 * How big one bought square is, in world units.
 *
 * **Back to the pack's own 4-unit module (2026-08-21), on Ellis's call.** It
 * was 2 for a while so that squares felt buyable in steps you could think
 * about, and three separate complaints came straight back out of that choice:
 * the planks were half-scale, the raised border was half-scale, and there were
 * no walls. None of those were bugs — they are what the pack *is*:
 *
 * - `Flooring_{A,B,C}_Tiling` is the only square floor piece, its border is
 *   baked into the mesh, and its UVs point into a shared atlas. Scale it and
 *   the boards scale with it; they cannot be re-tiled.
 * - The wall kit exists only in 4-unit handed modules, so a 2-unit square can
 *   never carry a wall.
 *
 * So: squares match the café exactly and can carry walls, and the cost of that
 * is that each one is a whole module. Making them small again means new art,
 * not new code.
 */
export const PATCH = 4;

/** Patch coordinates, in patches. The walled room covers (0,0) to (1,1). */
export interface Tile {
  x: number;
  z: number;
}

/** Tiles are stored as "x,z" so a save holds a plain, diffable string list. */
export type TileKey = string;

/**
 * The walled room, as a single key. Stored rather than derived so a save reads
 * as "these are the squares I own" with no special cases.
 */
export const HOME_TILE: TileKey = "room";

export function tileKey(tile: Tile): TileKey {
  return `${tile.x},${tile.z}`;
}

export function parseTile(key: TileKey): Tile | null {
  if (key === HOME_TILE) return null; // the room is not a patch
  const [x, z] = key.split(",").map(Number);
  if (!Number.isInteger(x) || !Number.isInteger(z)) return null;
  return { x, z };
}

/**
 * World centre of a patch.
 *
 * The room is square (0,0), spanning −2…2, so a square's centre is simply its
 * coordinates times the module.
 */
export function tileCentre(tile: Tile): { x: number; z: number } {
  return { x: tile.x * PATCH, z: tile.z * PATCH };
}

/** The single square the walled room occupies. */
const ROOM_PATCHES = new Set(["0,0"]);

/** Is this square already part of the walled room? */
export function isRoomPatch(tile: Tile): boolean {
  return ROOM_PATCHES.has(tileKey(tile));
}

/**
 * How far the café can spread.
 *
 * **This is a framing limit, not a design preference.** §9 solves the camera
 * distance from the box that must stay on screen, so every extra tile pushes
 * the camera back on a phone — and a café too wide to read is worse than a
 * small one. Three tiles either way is where a 393×852 screen stops being able
 * to show the room at a useful size; check a screenshot at that size before
 * raising it.
 */
export const MAX_TILE_INDEX = 2;

/**
 * How many squares the café may ever buy.
 *
 * Two limits meet here and the tighter one wins. **Framing:** §9 solves the
 * camera distance from the box that must stay on screen, so every square
 * pushes the camera back — past about this many, a 393×852 phone cannot show
 * the café at a useful size. **Money:** the price curve has to stay under the
 * £9,999 till, or the last squares are unbuyable. Check a phone-sized
 * screenshot *and* `expansionCost(MAX_PATCHES - 1)` before raising it.
 */
export const MAX_PATCHES = 3;

/** What the next piece of floor costs, given how much you already have. */
/**
 * What the next square costs.
 *
 * **Bounded so the last one is always affordable.** The curve was 1.45× per
 * patch with no ceiling, which crossed the £9,999 till somewhere around the
 * twelfth — an item priced above the maximum money the game will hold is not
 * expensive, it is *broken* (Ellis, 2026-08-20: *"the price doesnt even go
 * high enough to afford some when it gets so big"*). With `MAX_PATCHES` capped
 * the dearest square lands near 3,900, which is a real saving-up goal inside a
 * till that tops out at 9,999.
 */
export function expansionCost(patchesOwned: number): number {
  // A whole module is a big purchase, and there are only three — so the curve
  // is steep but the last one still lands well inside the £9,999 till.
  return Math.round(900 * Math.pow(1.9, Math.min(patchesOwned, MAX_PATCHES - 1)));
}

/** Level needed for the next piece of floor. Space is a mid-game reward. */
export function expansionLevel(patchesOwned: number): number {
  return 3 + Math.max(0, patchesOwned) * 2;
}

/**
 * Where a patch may exist at all: outside the walled room, and within reach.
 *
 * Bounded on all four sides rather than only the positive ones, because a
 * patio may wrap around the two open sides of the room — it just may never sit
 * *inside* the walls, where it would collide with the room's own floor and
 * need wall segments that do not exist.
 */
/**
 * Where a square may exist: outside the walled room, and within reach.
 *
 * Non-negative only. Every authored prop hangs off the −x and −z walls and the
 * door is on +z, so growing away from the walls means the wall runs simply get
 * longer and nothing authored has to move.
 */
function inBounds(tile: Tile): boolean {
  if (isRoomPatch(tile)) return false;
  return tile.x >= 0 && tile.z >= 0 && tile.x <= MAX_TILE_INDEX && tile.z <= MAX_TILE_INDEX;
}

/**
 * Where the next tile may go: orthogonally adjacent to floor you already own,
 * inside the bounds, and not already owned.
 *
 * Adjacency keeps the café a single connected room — guests walk in straight
 * lines with no pathfinding (§8), so a detached island of floor would be a
 * place nobody could ever reach.
 */
export function expansionCandidates(owned: TileKey[]): Tile[] {
  if (ownedPatches(owned).length >= MAX_PATCHES) return [];
  const have = new Set([HOME_TILE, ...owned]);
  const out = new Map<TileKey, Tile>();

  // The room counts as four patches for adjacency, so the first patio can go
  // anywhere along its two open sides.
  const sources: Tile[] = [...ROOM_PATCHES].map((k) => {
    const [x, z] = k.split(",").map(Number);
    return { x, z };
  });
  for (const key of have) {
    const tile = parseTile(key);
    if (tile) sources.push(tile);
  }

  for (const tile of sources) {
    for (const [dx, dz] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ]) {
      const next = { x: tile.x + dx, z: tile.z + dz };
      const nextKey = tileKey(next);
      if (have.has(nextKey) || !inBounds(next)) continue;
      out.set(nextKey, next);
    }
  }
  return [...out.values()].sort((a, b) => a.x - b.x || a.z - b.z);
}

/** Just the patios — the walled room is drawn by the authored layout. */
export function ownedPatches(owned: TileKey[]): Tile[] {
  return owned
    .map(parseTile)
    .filter((t): t is Tile => t !== null && inBounds(t))
    .sort((a, b) => a.x - b.x || a.z - b.z);
}

/** Every square of floor, the room's four included — for surfaces and cats. */
export function ownedTiles(owned: TileKey[]): Tile[] {
  const room: Tile[] = [...ROOM_PATCHES].map((k) => {
    const [x, z] = k.split(",").map(Number);
    return { x, z };
  });
  return [...room, ...ownedPatches(owned)].sort((a, b) => a.x - b.x || a.z - b.z);
}

/**
 * Appeal from floor. Room to breathe makes a café nicer, and it keeps the rule
 * that every purchase moves the one number the café shares.
 */
export function floorAppeal(owned: TileKey[]): number {
  return ownedPatches(owned).length * 0.3;
}

/** The floor's world extent, for framing and for the placement validator. */
/**
 * How far the floor has grown past the original room, in world units.
 *
 * Growth is +x/+z only (see the note by `expansionCandidates`), so this is
 * always non-negative — and it is exactly what the doorway and the pieces
 * standing outside it have to move by. The home tile spans −2…2 on both axes,
 * so an unexpanded café returns `{ x: 0, z: 0 }` and nothing shifts.
 */
export function growth(owned: TileKey[]): { x: number; z: number } {
  const bounds = floorBounds(owned);
  const half = PATCH / 2;
  return { x: bounds.maxX - half, z: bounds.maxZ - half };
}

export function floorBounds(owned: TileKey[]): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
} {
  const half = PATCH / 2;
  const tiles = ownedTiles(owned);
  return {
    minX: Math.min(...tiles.map((t) => tileCentre(t).x - half)),
    maxX: Math.max(...tiles.map((t) => tileCentre(t).x + half)),
    minZ: Math.min(...tiles.map((t) => tileCentre(t).z - half)),
    maxZ: Math.max(...tiles.map((t) => tileCentre(t).z + half)),
  };
}

/**
 * A window, punched into a wall you already own.
 *
 * Ellis, 2026-08-25: *"if there is nothing on wall we should be able to
 * UPGRADE it to a window."* Right, and it is nearly free: the pack ships a
 * `Window_` twin of **every** wall piece in all three styles — corner, mid,
 * both ends, both handednesses — so a window is a name swap on a segment
 * rather than a new mesh. What it buys is light and a view, which is the
 * cheapest way the café has of feeling less like a box as it grows.
 *
 * One price for every segment, for the same reason every backdrop costs the
 * same: which wall you glaze is taste, not power.
 */
export const WINDOW_PRICE = 420;

/** Which run a wall segment belongs to: the −x wall or the −z wall (§9). */
export type WallSide = "left" | "back";

/**
 * A wall segment's stable name, used as the save key for its window.
 *
 * It has to survive the café growing around it — a segment can change *piece*
 * (a corner becomes a mid when you build past it) without changing identity,
 * or a bought window would move to a different wall the next time you expand.
 * Tile plus side does that; the piece name would not.
 */
export function wallSegmentId(side: WallSide, tile: Tile): TileKey {
  return `${side}:${tileKey(tile)}`;
}

/**
 * The café's original window, on the back wall of the room.
 *
 * Seeded into every save (and migrated into old ones) so the room the game
 * ships with is expressible in the same terms as anything the player builds —
 * there is no special-cased window hiding in the layout.
 */
export const HOME_WINDOW = wallSegmentId("back", { x: 0, z: 0 });
