/**
 * The café, as a hand-placed layout of Minty pack objects.
 *
 * One small room, one 4×4 tile, presented as a **cutaway diorama**: walls on
 * the left (−x) and back (−z) only, open toward the camera. That's how the
 * pack's own promo art is composed and it's what makes a small room readable
 * on a phone.
 *
 * Coordinates are world units, origin at the room's centre, floor at y=0.
 * Objects are placed by their footprint centre with their base on the floor —
 * see `scene/asset-library.ts`, which re-centres every mesh that way.
 *
 * `scene/cafe-room.test.ts` verifies nothing overlaps, everything is inside the
 * room, and every seat is reachable from the door. Change coordinates here and
 * the test tells you if you've put a chair inside a counter.
 *
 * ## Where these numbers came from
 *
 * This layout is `graphics/K9gvnT.png` — the pack's own promo render — rebuilt
 * object for object. It is not eyeballed: the pack ships the **Blender scene
 * that produced that render** (`graphics/V2.2-…/Blener Sample Scene/`), so every
 * placement below was extracted from it rather than guessed.
 *
 * The first attempt at this *was* eyeballed, and it came out mirrored — window
 * on the wrong wall, counter on the wrong wall — because props were rearranged
 * inside the existing shell without ever checking the shell against the image.
 * If you need to change the arrangement, go back to the .blend: it is the
 * authority, and reading it took less time than the failed guess did.
 *
 * Three things learned extracting it, all of which had cost time before:
 *
 * 1. **`Light` and `Dark` in wall names are *sides*, not colours.** Every wall
 *    piece ships twice: `Light` authored on the −x edge of its tile, `Dark` on
 *    the −z edge. They're a matched pair for building exactly this corner. The
 *    previous layout rotated a `Light` wall 90° to make the back wall, which is
 *    why the back wall was inside-out and why the window could never be moved
 *    there — rotating it either flipped the wall or put the rounded end in the
 *    corner. Use the piece authored for the side you want.
 * 2. **`_End_XL` is the big sweeping arch**, `_End_X` a small rounded corner.
 *    That sweep over the window is the render's whole silhouette; it is not a
 *    separate archway prop. (`Wall_Arc_*` is a freestanding doorway arch. It
 *    was tried, it cut the café in half, it is gone.)
 * 3. **Walls sit at y = −FLOOR_THICKNESS**, base-level with the floor slab so
 *    the slab covers their bottom edge, exactly as the sample scene has it.
 */

import type { CustomisableSlot } from "@/data/customisation";

/**
 * Floor tiles are 0.26 thick and, like every asset, are placed with their
 * *base* at y=0 — so left alone their walking surface sits at y=0.26 and
 * every chair, table and cat is buried a quarter-unit into the ground.
 * Dropping the tiles by their own thickness puts the surface at y=0, which is
 * what the rest of the layout assumes.
 */
const FLOOR_THICKNESS = 0.26;

export const ROOM = {
  /**
   * Half-extent of the floor: the room spans −2…2 on both x and z.
   *
   * One 4-unit tile, not four. A wall segment is exactly 4 long, so one tile
   * means one wall piece per side, fully enclosed, and it matches the scale of
   * the pack's own promo art.
   */
  half: 2,
  /** The pack's modular tile size. */
  tile: 4,
  wallHeight: 4,
} as const;

/**
 * The window wall's sill — a ledge that is invisible in the layout numbers and
 * will bite you if you forget it.
 *
 * `Wall_A_Window_Dark_Corner_End_XL` is not a flat slab. Its body stops at
 * z = −1.95, the same 0.30 thickness as a plain wall, but between y = 0.62 and
 * y = 0.68 a ledge juts a further 0.34 into the room. Push something tall flush
 * to that wall — the natural thing to do in a small room — and the ledge slices
 * across it, reading as a shelf growing out of the window.
 *
 * Anything crossing that band must therefore stay in front of `innerZ`, or say
 * it means to be there with `onSill`. `scene/cafe-room.test.ts` enforces this.
 *
 * (Only wall style A has this ledge; B and C have flat window walls. That's why
 * the window-seat cushions are `onSill` — see `hasWindowSill` in
 * `data/customisation.ts`.)
 */
export const SILL = {
  /** How far into the room the ledge reaches. Keep tall props in front of this. */
  innerZ: -1.61,
  /** The ledge's vertical band. Props whose height misses this band are fine. */
  yMin: 0.61,
  yMax: 0.69,
} as const;

export interface Placement {
  /**
   * Object name from the pack — see /gallery.html. Leave empty and set `slot`
   * for anything the player can recolour.
   */
  asset: string;
  /**
   * A customisable slot (see data/customisation.ts). The asset name is looked
   * up from the player's current choice at build time, so changing the sofa
   * colour is a save change rather than a layout edit.
   */
  slot?: CustomisableSlot;
  x: number;
  z: number;
  /** Height off the floor. Omit for floor-standing objects. */
  y?: number;
  /** Y rotation in radians. */
  rotY?: number;
  /** Tilt, in radians. Only the few props that lean on something use these. */
  rotX?: number;
  rotZ?: number;
  /** Uniform scale. The render nudges a handful of props off 1.0; most don't. */
  scale?: number;
  /**
   * Scale the footprint without touching the height.
   *
   * Only the expansion patios use this, and they need it: a uniform scale on a
   * floor slab shrinks its *thickness* too, which drops the walking surface
   * below the rest of the café.
   */
  scaleXZ?: number;
  /**
   * Furniture may be placed on top of this, and guests may walk over it.
   *
   * **Explicit, because the height heuristic it replaced was wrong.** Both the
   * layout test and the placement validator used to infer this from "under
   * 0.3 units tall", which quietly made the *cat bed* and the *floor cushions*
   * walk-over — so the editor happily let you drop a table on top of a
   * sleeping cat's bed and never turned the ghost red (Ellis, 2026-08-12).
   * Being short is not the same as being a rug. Mark rugs and mats; leave
   * everything else alone.
   */
  walkOver?: boolean;
  /**
   * A guest can sit here. Seat order is the order these appear, and it is
   * stable — the economy addresses seats by index.
   */
  seat?: boolean;
  /** A cat can settle here. */
  catSpot?: boolean;
  /** Height a guest's feet rest at when seated here. Defaults to a chair. */
  seatY?: number;
  /**
   * Which way a guest faces when sitting here, in world radians, **at this
   * piece's authored rotation**. Any rotation the player applies is added on
   * top (`seatFacings` in `scene/room.ts`).
   *
   * Only pieces with an obvious front need it. The default — face the door, so
   * the camera gets a face rather than the back of a head — is right for a
   * stool or a floor cushion, which have no front, and wrong for anything with
   * a back to it: the armchair is authored at 0.3888 while the door lies at
   * −0.4964 from it, so a guest sat in it was skewed **50.7°** across the seat.
   * That was invisible until furniture could be turned, and then it was the
   * only thing you could see (Ellis, 2026-08-26: *"no matter which way its
   * rotated they are just like 45 degree off"*).
   */
  seatFacing?: number;
  /**
   * Height a cat sits at here. Beds and climbers have a rim or a platform, and
   * a cat left at y=0 is cut in half by it.
   */
  catY?: number;
  /**
   * Stable identity for a piece the player can pick up and move (§8 "The café
   * editor"). Saved positions are keyed by this, **not** by layout index, so
   * inserting a prop above it in this file doesn't teleport someone's rug.
   *
   * Only pieces marked `movable` need one.
   */
  id?: string;
  /**
   * The player may drag this to a new spot.
   *
   * **Seats are movable, and that costs something to keep true.** The economy
   * addresses seats by *index*, so the order of `seat: true` entries in this
   * file is still frozen — but their *positions* are read live, and guests
   * re-path to wherever a chair now stands (see `seatPositions` in
   * `scene/room.ts`). Moving a seat also has to leave it reachable, which the
   * mover checks.
   *
   * Still excluded: **architecture**, which is the building, and anything
   * resting on a counter, which would need the counter itself to move.
   */
  movable?: boolean;
  /**
   * This prop rides on a movable piece: it moves by the same delta and cannot
   * be picked up on its own.
   *
   * Without it, moving a table leaves its cup and cake hanging in the air at
   * the old world coordinates, because every placement in this file is
   * absolute. `Table_Tall` carries three such props, which is exactly why it
   * was excluded from `movable` in the first pass.
   */
  attachTo?: string;
  /**
   * Another shop item this piece is *standing on*.
   *
   * The cupcakes on the cake display belong to "milkshakes & cakes" but they
   * rest on the display, which is a separate purchase — so buying the treats
   * first left four cupcakes hanging in mid-air where the glass case would be.
   * A piece with `needs` waits for both.
   */
  needs?: string;
  /**
   * Catalogue id from `data/shop.ts`. The piece is **hidden until bought**.
   *
   * This is what makes the café start bare without throwing away the authored
   * layout: an unbought piece is simply not built, and buying it reveals it
   * exactly where the reference render puts it. A fully-stocked café is the
   * diorama; a new one is the shell.
   */
  shopItem?: string;
  /**
   * Deliberately outside the café, on the ground beyond the floor plan — the
   * A-frame sign and the stray cushion in the render both sit out there.
   */
  outdoor?: boolean;
  /**
   * This piece rides the floor's outer edge as the café grows.
   *
   * **The doorway has to stay the doorway.** Ellis, 2026-08-26: *"that little
   * notch is always the doorway and should still be a little notch over the
   * new floor square so it should move along to the edge of the floor again.
   * and the 'outside' furniture also needs to move so it doesnt end up being
   * inside when i extend."* Both halves are the same rule — a thing that means
   * "the way in" or "the street" is defined by being at the boundary, so when
   * the boundary moves it moves.
   *
   * The axis is explicit rather than inferred from position: the A-frame is
   * beyond the +z edge and the stray cushion beyond +x, and guessing from
   * coordinates would tie the layout to the current footprint.
   *
   * A piece the player has picked up and put somewhere keeps *their* position
   * — see `placedAt`. Once they have made a decision about it, the café does
   * not get to override it.
   */
  followsEdge?: "x" | "z";
  /**
   * Rests *on* the sill ledge, overhanging it — the window seat. Left out
   * entirely on wall styles with no ledge, where it would hang in mid-air.
   * Implies `crossesSill`.
   */
  onSill?: boolean;
  /**
   * Knowingly reaches into the sill's band. The sill check exists to catch
   * furniture *accidentally* impaled by the ledge; this says "I know, it's
   * meant to be tucked in there".
   */
  crossesSill?: boolean;
}

const HALF_PI = Math.PI / 2;

/**
 * The doorway, in two parts, because guests should be seen *arriving*.
 *
 * `DOOR` used to be a single point at (3.2, 3.6) — the empty open corner of
 * the diorama — so guests materialised out of nothing beside the café and
 * walked diagonally to their seat. Ellis: "i want visitors to walk through a
 * designated door area."
 *
 * There is a real entrance to use: `Flooring_A_Entrance` is a step at
 * x = −1, z = 2 (spanning z 1.65–2.35 once centred) carrying the doormat, with
 * the A-frame sign beside it. So guests now approach from off-frame, cross the
 * threshold on the mat, and only then head for their chair.
 */
export const DOOR = { x: -1.03, z: 3.15 };

/** On the doormat, at the top of the step. The inside leg starts here. */
export const DOOR_THRESHOLD = { x: -1.03, z: 2.06 };

/**
 * Clear floor just inside the door, on the open side of the room.
 *
 * Guests route door → threshold → here → seat. **The middle waypoint is not
 * decoration:** the counter is an L-shaped peninsula jutting into the middle
 * of the room, and a straight line from the doormat to four of the seats goes
 * straight through it. `cafe-room.test.ts` caught exactly that the moment the
 * door moved onto the real entrance, which is the whole reason that test
 * exists — there is no pathfinding, so the route has to be authored.
 */
export const DOOR_LOBBY = { x: 1.4, z: 1.55 };

/**
 * Where the player's own character stands, behind the counter.
 *
 * Ellis: *"that character should then walk behind the counter!! to work!!"* —
 * right: the avatar you just designed should be *in* the café, not filed away
 * in the save. Tucked behind the L of the counter, facing the room.
 */
// The model's forward is +Z (same convention as SEAT_FACINGS), so ~45° looks
// out at the open corner — i.e. at the room, and at the camera. Facing them
// "into" the counter showed the camera the back of their head, which is the
// exact mistake the guests made before SEAT_FACINGS was fixed (§9).
export const BARISTA_SPOT = { x: -1.05, z: -0.62, facing: Math.PI * 0.28 };

export const CAFE_LAYOUT: Placement[] = [
  // --- Architecture ---------------------------------------------------------
  //
  // All three pieces are tile-modular: placed by *tile centre*, and they carry
  // their own authored offset onto the tile edge. Hence x=0, z=0 for a wall
  // that ends up four units away.
  { asset: "Flooring_A_Tiling", slot: "floor", x: 0, z: 0, y: -FLOOR_THICKNESS },

  // The left wall: plain, flat-topped, rounded off at its open (+z) end.
  { asset: "Wall_A_Light_Corner_End_X", slot: "wallPlain", x: 0, z: 0, y: -FLOOR_THICKNESS },
  // The back wall: the window, and the big sweep that is this room's silhouette.
  { asset: "Wall_A_Window_Dark_Corner_End_XL", slot: "wallWindow", x: 0, z: 0, y: -FLOOR_THICKNESS },

  // The threshold step at the front-left, so the floor plan isn't a plain
  // square. The red mat and the A-frame sign belong to it.
  { asset: "Flooring_A_Entrance", slot: "floorStep", x: -1, z: 2, y: -FLOOR_THICKNESS, followsEdge: "z" },

  // --- The counter ----------------------------------------------------------
  //
  // Two runs, and the reference's shape depends on both. `Table_Kitchen_A` is
  // the low back unit against the wall that the espresso machine stands on;
  // `Bar_Kitchen_Angled_A` is the serving peninsula in front of it, angled and
  // rounded at the near end. A flat strip against the wall — the previous
  // attempt — reads as nothing at all.
  { asset: "Table_Kitchen_A", x: -1.78, z: 0.101, rotY: HALF_PI },
  { asset: "Bar_Kitchen_Angled_A", x: -0.413, z: 0.497, rotY: HALF_PI },
  // The glass cake case at the near end, a complete unit with its own base.
  { shopItem: "cake-display", asset: "Cake_Display_A", x: -1.455, z: 1.317 },

  // Counter-top dressing, back to front.
  { asset: "Coffe_Machine", x: -1.724, z: -0.168, y: 0.721, rotY: HALF_PI },
  { asset: "Deco_Wooden_Tray_A", x: -1.85, z: 0.632, y: 0.721, rotY: -HALF_PI },
  { asset: "Papercup_Lids_Stack_A", x: -1.85, z: 0.495, y: 0.74, rotY: -HALF_PI },
  { asset: "Stack_PaperCups_Flipped_A", x: -1.851, z: 0.78, y: 0.74, rotY: -HALF_PI },
  { asset: "ComputerCashier_A", x: -0.131, z: -0.296, y: 0.78, rotY: HALF_PI },
  { shopItem: "counter-treats", asset: "Food_Milkshake_Chocolate", x: -0.194, z: 0.81, y: 0.782, rotY: 1.1818 },
  { shopItem: "counter-treats", asset: "Food_Milkshake_Strawberry", x: -0.124, z: 0.517, y: 0.78, rotY: 2.2816 },
  { shopItem: "counter-treats", asset: "CupcakeStand", x: -0.374, z: 1.406, y: 0.78 },
  { shopItem: "counter-treats", asset: "Cupcake_Bubblegum", x: -0.191, z: 1.353, y: 0.917, rotY: -HALF_PI, scale: 0.895 },
  { shopItem: "counter-treats", asset: "Cupcake_Bubblegum", x: -0.381, z: 1.236, y: 0.917, scale: 0.895 },
  { shopItem: "counter-treats", asset: "Cupcake_Bubblegum", x: -0.553, z: 1.364, y: 0.917, scale: 0.895 },
  { shopItem: "counter-treats", asset: "Cupcake_Bubblegum", x: -0.477, z: 1.578, y: 0.917, scale: 0.895 },
  { shopItem: "counter-treats", asset: "Cupcake_Bubblegum", x: -0.244, z: 1.566, y: 0.917, scale: 0.895 },
  { shopItem: "counter-treats", asset: "Cupcake_RedVelvet", x: -0.36, z: 1.426, y: 0.917, scale: 0.895 },

  // Inside the glass case. They sit at cake-shelf height, not on the counter.
  { shopItem: "counter-treats", needs: "cake-display", asset: "Cupcake_ChocolateOrange", x: -1.776, z: 1.18, y: 0.518, rotX: 0.1795 },
  { shopItem: "counter-treats", needs: "cake-display", asset: "Cupcake_ChocolateOrange", x: -1.551, z: 1.408, y: 0.478, rotX: 0.0977 },
  { shopItem: "counter-treats", needs: "cake-display", asset: "Cupcake_ChocolateOrange", x: -1.558, z: 1.186, y: 0.51, rotY: -1.4305, rotX: 0.1795 },
  { shopItem: "counter-treats", needs: "cake-display", asset: "Cupcake_ChocolateOrange", x: -1.762, z: 1.404, y: 0.478, rotY: 1.4018, rotX: 0.0977 },
  { shopItem: "counter-treats", needs: "cake-display", asset: "Cupcake_LemonMatcha", x: -1.106, z: 1.388, y: 0.484, rotX: 0.192 },
  { shopItem: "counter-treats", needs: "cake-display", asset: "Cupcake_LemonMatcha", x: -1.106, z: 1.176, y: 0.521, rotX: 0.1648 },
  { shopItem: "counter-treats", needs: "cake-display", asset: "Cupcake_LemonMatcha", x: -1.329, z: 1.388, y: 0.484, rotY: -0.7144, rotX: 0.192 },
  { shopItem: "counter-treats", needs: "cake-display", asset: "Cupcake_LemonMatcha", x: -1.329, z: 1.176, y: 0.521, rotY: -0.7144, rotX: 0.1648 },

  // --- Left wall dressing, top to bottom ------------------------------------
  { shopItem: "blackboard", asset: "Blackboard_Large", x: -1.964, z: 0.612, y: 2.373, rotY: HALF_PI },
  { shopItem: "shelves", asset: "Shelf_A_Plank", x: -1.856, z: 0.318, y: 1.857, rotY: HALF_PI },
  { shopItem: "shelves", asset: "Shelf_A_Plank", x: -1.856, z: 0.614, y: 1.391, rotY: HALF_PI },
  { shopItem: "shelves", asset: "Deco_CoffeePack_Strawberry", x: -1.866, z: 0.292, y: 1.906, rotY: HALF_PI },
  { shopItem: "shelves", asset: "Deco_CoffeePack_Matcha", x: -1.866, z: -0.008, y: 1.906, rotY: HALF_PI },
  { shopItem: "shelves", asset: "Deco_CoffeePack_Cream", x: -1.866, z: -0.308, y: 1.906, rotY: HALF_PI },
  { shopItem: "plants", asset: "Plant_Cactus_A_1", x: -1.836, z: 1.082, y: 1.906, rotY: HALF_PI },
  { shopItem: "plants", asset: "Plant_Cactus_A_2", x: -1.832, z: 0.841, y: 1.906, rotY: HALF_PI },
  { shopItem: "plants", asset: "Plant_Cactus_A_3", x: -1.835, z: 0.559, y: 1.906, rotY: HALF_PI },
  { shopItem: "shelves", asset: "Deco_Cups_1", x: -1.874, z: 1.231, y: 1.44, rotY: HALF_PI },
  { shopItem: "shelves", asset: "Deco_Cups_2", x: -1.877, z: 0.897, y: 1.44, rotY: HALF_PI },
  { shopItem: "shelves", asset: "Deco_Cups_3", x: -1.856, z: 0.546, y: 1.44, rotY: HALF_PI },
  // **On the shelf, so they belong to the shelf.** These two were the only
  // things at y=1.44 without a `shopItem`, so a café that had not bought the
  // shelves got two glasses hanging in mid-air against the wall — the same
  // fault the cupcakes had before `needs`, and found the same way (Ellis,
  // looking at a new café).
  { shopItem: "shelves", asset: "Deco_TallGlass_Flipped", x: -1.843, z: 0.068, y: 1.44, rotY: Math.PI },
  { shopItem: "shelves", asset: "Deco_TallGlass_Flipped", x: -1.882, z: -0.158, y: 1.44, rotY: -HALF_PI },

  // The tall shelf in the corner, with the trailing plant on top of it.
  { asset: "Hanging_Shelf_A", x: -1.858, z: -1.278, y: 1.864, rotY: HALF_PI },
  { shopItem: "shelves", asset: "Deco_CoffeePack_Espresso", x: -1.873, z: -1.453, y: 1.913, rotY: HALF_PI },
  { shopItem: "shelves", asset: "Deco_CoffeePack_Black", x: -1.873, z: -1.118, y: 1.913, rotY: HALF_PI },
  { shopItem: "shelves", asset: "Deco_CoffeePack_Cream", x: -1.839, z: -1.433, y: 2.414, rotY: HALF_PI },
  { shopItem: "shelves", asset: "Deco_CoffeePack_Cappuccino", x: -1.839, z: -1.121, y: 2.414, rotY: HALF_PI },
  { shopItem: "plants", asset: "Plant_Hanging", x: -1.689, z: -1.405, y: 2.234, rotY: 1.6964, scale: 1.107 },

  // --- The window seat ------------------------------------------------------
  //
  // There is no bench here and there doesn't need to be: the cushions rest on
  // the sill ledge and overhang it, which is exactly what the render does. A
  // previous pass concluded this "cannot be built" after measuring a *folded*
  // cushion against the ledge and refusing the overhang — these are the flat
  // `Cushion_*` pieces, and they lean.
  // Tilts are three.js Euler XYZ. Blender's `to_euler('XYZ')` is **not** the
  // same composition — it multiplies Rz·Ry·Rx where three does Rx·Ry·Rz — so
  // these came out of the .blend via `to_euler('ZYX')`. Reading the wrong one
  // laid the propped cushions flat on their edges and it looked like a bug in
  // the asset, not in the arithmetic.
  { shopItem: "window-cushions", asset: "Cushion_Red", x: -1.026, z: -1.919, y: 0.827, rotY: -0.32, rotX: 0.0996, rotZ: -0.861, scale: 0.869, onSill: true },
  { shopItem: "window-cushions", asset: "Cushion_Orange", x: 0.408, z: -1.791, y: 0.658, rotY: 0.2453, onSill: true },
  { shopItem: "window-cushions", asset: "Cushion_Blue", x: 1.067, z: -1.924, y: 0.916, rotY: 0.6635, rotX: 0.1757, rotZ: 1.1158, onSill: true },

  // --- Seating. Order is stable; the economy addresses seats by index. -------
  { shopItem: "bar-stools", asset: "Chair_Bar_A", id: "stool-a", movable: true, x: 0.286, z: 0.996, rotY: -2.0176, seat: true, seatY: 0.68 },
  { shopItem: "bar-stools", asset: "Chair_Bar_A", id: "stool-b", movable: true, x: 0.345, z: 0.382, rotY: -1.3348, seat: true, seatY: 0.68 },
  { shopItem: "armchair", asset: "Sofa_Single_Cream", id: "armchair", movable: true, slot: "sofa", x: 1.268, z: -1.094, rotY: 0.3888, seat: true, seatY: 0.42, seatFacing: 0.3888 },
  { shopItem: "floor-cushions", asset: "Cushion_Red", id: "floor-cushion-a", movable: true, x: 1.458, z: 0.047, y: -0.124, rotY: 0.3072, scale: 1.064, seat: true, seatY: 0.2 },
  { shopItem: "floor-cushions", asset: "Cushion_Blue", id: "floor-cushion-b", movable: true, x: 1.399, z: 1.636, y: -0.046, rotY: 2.89, scale: 1.064, seat: true, seatY: 0.21 },

  // The low table the two floor cushions gather round, and the side table by
  // the armchair with its coffee on it. A cat on the low table is worth more
  // than a cat on open floor: it reads as *a cat sitting on something*, which
  // is most of what makes a cat look placed rather than dropped.
  { shopItem: "low-table", asset: "Table_Short", id: "low-table", movable: true, x: 1.589, z: 0.849, catSpot: true, catY: 0.38 },
  // Pushed right up to the window wall, so the sill runs behind it just under
  // the tabletop — which is how the render reads it, a ledge behind a table.
  { shopItem: "side-table", asset: "Table_Tall", id: "side-table", movable: true, x: 1.748, z: -1.652, rotY: Math.PI, crossesSill: true },
  { shopItem: "side-table", asset: "Cup_Plate_Blue", attachTo: "side-table", x: 1.83, z: -1.54, y: 0.772 },
  { shopItem: "side-table", asset: "CupCoffee_Orange", attachTo: "side-table", x: 1.801, z: -1.538, y: 0.779, rotY: -1.325 },
  { shopItem: "side-table", asset: "Food_Whipped_Cream", attachTo: "side-table", x: 1.8, z: -1.555, y: 0.898, scale: 0.545 },

  // --- Cat furniture. `catY` lifts the cat onto the cushion, not into it. ---
  //
  // The climber stands flush to the window wall, so the sill ledge grazes it —
  // that's how the render has it, hence `onSill`.
  { shopItem: "climber", asset: "Cat_Climber_A_Cream", id: "climber", movable: true, x: -1.477, z: -1.419, rotY: HALF_PI, catSpot: true, catY: 1.02, crossesSill: true },
  // Not in the render — the Style menu needs a cat bed to recolour, and the
  // floor under the window is the one clear patch big enough for it.
  { asset: "Cat_Bed_A_Cream", id: "cat-bed", movable: true, slot: "catBed", x: -0.45, z: -1.55, catSpot: true, catY: 0.1 },

  // --- Outside the door -----------------------------------------------------
  { asset: "Carpet_Small_Red", id: "rug", movable: true, slot: "carpet", x: -1.033, z: 2.06, walkOver: true, followsEdge: "z" },
  { shopItem: "a-frame", asset: "Blackboard_Small", x: 0.932, z: 2.647, y: -0.271, rotY: 1.151, rotX: 0.0094, rotZ: -0.0196, outdoor: true, followsEdge: "z" },
  { shopItem: "stray-cushion", asset: "Cushion_Orange", x: 2.426, z: 0.914, y: -0.273, rotY: 0.19, rotZ: -0.0624, scale: 1.064, outdoor: true, followsEdge: "x" },
];

/**
 * Cats also settle on the bare floor. These aren't objects, just places — a
 * café where every cat is parked on furniture looks staged.
 *
 * **Pick these against the *picture*, not the floor plan.** Two earlier spots
 * were on genuinely clear floor and still looked wrong: from a fixed isometric
 * camera a cat standing in open walkway lines up behind the armchair or beside
 * a stool and reads as floating, because nothing in the frame says which
 * surface it is on. A cat wants a visible thing underneath it — a mat, a rug, a
 * doorway — or a clear patch with the floorboards showing all round it.
 */
export const FLOOR_CAT_SPOTS: Placement[] = [
  { asset: "", x: -1.05, z: 2.06, catSpot: true, followsEdge: "z" }, // curled on the doormat
  { asset: "", x: -0.35, z: 1.92, catSpot: true }, // the clear strip in front of the counter
];

/** Seats, in stable index order — the economy addresses these by number. */
export const SEATS: Placement[] = CAFE_LAYOUT.filter((p) => p.seat);

/**
 * Which seats are actually in the room, as indices into `SEATS`.
 *
 * **Indices, not a count.** The economy has always addressed a seat by its
 * position in this list, and that order is frozen — an old save must keep
 * seating people in the same chair. So once a seat could be *unbought* the
 * answer had to become "which ones", not "how many": a café that owns the
 * fifth cushion but not the fourth would otherwise seat a guest on the floor.
 */
export function availableSeats(purchased: string[]): number[] {
  const out: number[] = [];
  SEATS.forEach((seat, index) => {
    if (!seat.shopItem || purchased.includes(seat.shopItem)) out.push(index);
  });
  return out;
}

/** Everything the player can pick up and drag, in layout order. */
export const MOVABLE: Placement[] = CAFE_LAYOUT.filter((p) => p.movable);

/**
 * What to call each movable piece in the shop's "arrange" tab.
 *
 * The pack's own names are fine for a debug gallery and wrong for a player:
 * `Chair_Bar_A` tidies to "chair bar a", which reads like a filename because
 * it is one. Anything without an entry here falls back to the tidied asset
 * name, so a new movable piece is never *missing* a label — it just gets a
 * worse one until someone writes it down.
 */
export const MOVABLE_LABELS: Record<string, string> = {
  "stool-a": "bar stool",
  "stool-b": "bar stool",
  armchair: "armchair",
  "floor-cushion-a": "floor cushion",
  "floor-cushion-b": "floor cushion",
  "low-table": "low table",
  "side-table": "side table",
  climber: "cat climber",
  "cat-bed": "cat bed",
  rug: "rug",
};

/** Player-chosen positions for movable pieces, keyed by `Placement.id`. */
export type Placements = Record<string, { x: number; z: number; rot?: number }>;

/** Layout entries keyed by id, for resolving `attachTo`. */
const BY_ID = new Map<string, Placement>(
  CAFE_LAYOUT.filter((p) => p.id).map((p) => [p.id as string, p]),
);

/**
 * Where a piece actually stands: the player's choice, or the layout's.
 *
 * A prop with `attachTo` inherits its parent's *movement* — the delta the
 * parent has been dragged by — rather than its position, so the cup keeps its
 * offset on the tabletop instead of teleporting to the table's origin.
 */
/**
 * Extra rotation the player has applied, in radians. Added to the layout's own
 * `rotY` rather than replacing it, so a piece authored at an angle keeps it.
 */
export function placedRotation(item: Placement, placements: Placements): number {
  const moved = item.id ? placements[item.id] : undefined;
  return (item.rotY ?? 0) + (moved?.rot ?? 0);
}

/**
 * How far a piece has been carried by the café growing — zero for everything
 * that is not pinned to an edge. See `Placement.followsEdge`.
 */
export function edgeShift(
  item: Placement,
  grown: { x: number; z: number } | undefined,
): { x: number; z: number } {
  if (!grown || !item.followsEdge) return { x: 0, z: 0 };
  return item.followsEdge === "x" ? { x: grown.x, z: 0 } : { x: 0, z: grown.z };
}

export function placedAt(
  item: Placement,
  placements: Placements,
  grown?: { x: number; z: number },
): { x: number; z: number } {
  if (item.attachTo) {
    const parent = BY_ID.get(item.attachTo);
    const moved = parent ? placements[item.attachTo] : undefined;
    if (!parent || !moved) return { x: item.x, z: item.z };
    return { x: item.x + (moved.x - parent.x), z: item.z + (moved.z - parent.z) };
  }
  const moved = item.id ? placements[item.id] : undefined;
  // A piece the player has placed keeps their position: the edge rule is the
  // café's default opinion about where a thing belongs, not a law.
  if (moved) return moved;
  const shift = edgeShift(item, grown);
  return { x: item.x + shift.x, z: item.z + shift.z };
}

/** Where cats settle: cat furniture first, then bare-floor spots. */
export const CAT_SPOTS: Placement[] = [
  ...CAFE_LAYOUT.filter((p) => p.catSpot),
  ...FLOOR_CAT_SPOTS,
];
