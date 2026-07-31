/**
 * The café, as a hand-placed layout of Minty pack objects.
 *
 * One small room, 8×8 units (2×2 of the pack's 4-unit floor tiles), presented
 * as a **cutaway diorama**: walls on the back (−z) and left (−x) only, open
 * toward the camera. That's how the pack's own promo art is composed and it's
 * what makes a small room readable on a phone.
 *
 * Coordinates are world units, origin at the room's centre, floor at y=0.
 * Objects are placed by their footprint centre with their base on the floor —
 * see `scene/asset-library.ts`, which re-centres every mesh that way.
 *
 * `scene/cafe-room.test.ts` verifies nothing overlaps, everything is inside the
 * room, and every seat is reachable from the door. Change coordinates here and
 * the test tells you if you've put a chair inside a counter.
 */

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
   * One 4-unit tile, not four. Two tiles a side looked like a hall — and worse,
   * a wall segment is exactly 4 long, so an 8-wide room needs two per side and
   * any piece that fails to load leaves a gaping hole. One tile means one wall
   * piece per side, fully enclosed, and matches the scale of the pack's own
   * promo art, where the counter spans most of the back wall.
   */
  half: 2,
  /** The pack's modular tile size. */
  tile: 4,
  wallHeight: 4,
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
  slot?: "floor" | "wallPlain" | "wallWindow" | "sofa" | "carpet" | "catBed";
  x: number;
  z: number;
  /** Height off the floor. Omit for floor-standing objects. */
  y?: number;
  /** Y rotation in radians. */
  rotY?: number;
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
   * Height a cat sits at here. Beds and climbers have a rim or a platform, and
   * a cat left at y=0 is cut in half by it.
   */
  catY?: number;
}

const HALF_PI = Math.PI / 2;

/** Where guests come in. Visitors walk from here to their seat. */
export const DOOR = { x: 3.2, z: 3.6 };

export const CAFE_LAYOUT: Placement[] = [
  // --- Architecture: one tile, placed by TILE CENTRE ------------------------
  //
  // Exactly ONE window, on the left wall. The back wall is solid because it
  // carries the blackboard, the shelf and the counter — hanging those over a
  // window put a shelf straight across the glass, which looked like a bug
  // because it was one.
  { asset: "Flooring_A_Tiling", slot: "floor", x: 0, z: 0, y: -FLOOR_THICKNESS },
  { asset: "Wall_A_Light_Mid", slot: "wallPlain", x: 0, z: 0, rotY: -HALF_PI },
  { asset: "Wall_A_Window_Light_Mid", slot: "wallWindow", x: 0, z: 0 },

  // --- Counter along the back wall ----------------------------------------
  { asset: "Bar_End_Round", x: -1.55, z: -1.45 },
  { asset: "Bar_Straight_1", x: -0.85, z: -1.45 },
  { asset: "Bar_Straight_3_Sink", x: -0.15, z: -1.45 },
  { asset: "Bar_End_Flat", x: 0.55, z: -1.45 },

  { asset: "Coffe_Machine", x: -0.9, z: -1.5, y: 0.78 },
  { asset: "CupcakeStand", x: -0.15, z: -1.4, y: 0.78 },
  { asset: "ComputerCashier_A", x: 0.5, z: -1.55, y: 0.78, rotY: Math.PI },

  // --- Back wall dressing (kept sparse on purpose) -------------------------
  { asset: "Blackboard_Large", x: -0.7, z: -1.92, y: 2.35 },
  { asset: "Shelf_C_Plank", x: 1.0, z: -1.94, y: 1.9 },
  { asset: "Deco_CoffeePack_Matcha", x: 0.78, z: -1.92, y: 1.96 },
  { asset: "Deco_CoffeePack_Strawberry", x: 1.05, z: -1.92, y: 1.96 },
  { asset: "Plant_Hanging", x: -1.5, z: -1.5, y: 3.2 },

  // --- Seating: four seats -------------------------------------------------
  { asset: "Chair_Bar_A", x: -0.85, z: -0.62, seat: true, seatY: 0.68 },
  { asset: "Chair_Bar_A", x: -0.15, z: -0.62, seat: true, seatY: 0.68 },

  { asset: "Sofa_Single_Cream", slot: "sofa", x: -1.5, z: 0.9, rotY: HALF_PI, seat: true, seatY: 0.42 },
  { asset: "Table_Short", x: -0.5, z: 0.95 },
  { asset: "Cup_Upright_Orange", x: -0.5, z: 0.95, y: 0.38 },

  { asset: "Carpet_Small_Cream", slot: "carpet", x: 1.0, z: 1.15 },
  { asset: "Cushion_Folded_Blue", x: 1.0, z: 0.5, seat: true, seatY: 0.22 },

  // --- Cat furniture. `catY` lifts the cat onto the cushion, not into it. ---
  { asset: "Cat_Climber_A_Cream", x: 1.5, z: -0.7, catSpot: true, catY: 1.02 },
  { asset: "Cat_Bed_A_Cream", slot: "catBed", x: -1.45, z: -0.2, catSpot: true, catY: 0.1 },
];

/**
 * Cats also settle on the bare floor. These aren't objects, just places — a
 * café where every cat is parked on furniture looks staged.
 */
export const FLOOR_CAT_SPOTS: Placement[] = [
  { asset: "", x: 0.35, z: 1.6, catSpot: true },
  { asset: "", x: 1.55, z: 1.55, catSpot: true },
  { asset: "", x: -0.95, z: 1.75, catSpot: true },
];

/** Seats, in stable index order — the economy addresses these by number. */
export const SEATS: Placement[] = CAFE_LAYOUT.filter((p) => p.seat);

/** Where cats settle: cat furniture first, then bare-floor spots. */
export const CAT_SPOTS: Placement[] = [
  ...CAFE_LAYOUT.filter((p) => p.catSpot),
  ...FLOOR_CAT_SPOTS,
];
