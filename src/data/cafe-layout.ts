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
  /** Half-extent of the floor: the room spans −4…4 on both x and z. */
  half: 4,
  /** The pack's modular tile size. */
  tile: 4,
  wallHeight: 4,
} as const;

export interface Placement {
  /** Object name from the pack — see /gallery.html. */
  asset: string;
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
}

const HALF_PI = Math.PI / 2;

/** Where guests come in. Visitors walk from here to their seat. */
export const DOOR = { x: 3.2, z: 3.6 };

export const CAFE_LAYOUT: Placement[] = [
  // --- Floor: four tiles ---------------------------------------------------
  { asset: "Flooring_A_Tiling", x: -2, z: -2, y: -FLOOR_THICKNESS },
  { asset: "Flooring_A_Tiling", x: 2, z: -2, y: -FLOOR_THICKNESS },
  { asset: "Flooring_A_Tiling", x: -2, z: 2, y: -FLOOR_THICKNESS },
  { asset: "Flooring_A_Tiling", x: 2, z: 2, y: -FLOOR_THICKNESS },

  // --- Walls: back and left only (cutaway diorama) -------------------------
  //
  // The pieces nearest the inside corner are the `Enclosed_Corner` variants.
  // They are 4.43 long rather than 4.0 — the extra length is what closes the
  // join where the two walls meet. Building the corner from plain 4.0 `_Mid`
  // segments leaves a visible gap straight through it, which is exactly what
  // the first version did.
  //
  // `Enclosed_Corner_N` already runs along x (a back wall) and `_W` along z (a
  // left wall), so neither needs rotating. Plain `_Mid` pieces are thin on x
  // and run along z, so back-wall ones turn 90°.
  { asset: "Wall_A_Enclosed_Corner_N", x: -1.8, z: -4 },
  { asset: "Wall_A_Window_Light_Mid", x: 2.2, z: -4, rotY: HALF_PI },
  { asset: "Wall_A_Enclosed_Corner_W", x: -4, z: -1.8 },
  { asset: "Wall_A_Window_Light_Mid", x: -4, z: 2.2 },

  // --- Counter along the back wall ----------------------------------------
  { asset: "Bar_End_Round", x: -3.5, z: -3.2 },
  { asset: "Bar_Straight_1", x: -2.8, z: -3.2 },
  { asset: "Bar_Straight_3_Sink", x: -2.1, z: -3.2 },
  { asset: "Bar_Straight_2", x: -1.4, z: -3.2 },
  { asset: "Bar_End_Flat", x: -0.7, z: -3.2 },

  // Things on the counter (counter top is ~0.78 up).
  { asset: "Coffe_Machine", x: -2.75, z: -3.25, y: 0.78 },
  { asset: "CupcakeStand", x: -1.5, z: -3.2, y: 0.78 },
  { asset: "ComputerCashier_A", x: -0.75, z: -3.3, y: 0.78, rotY: Math.PI },

  // --- Café fittings -------------------------------------------------------
  { asset: "Cake_Display_A", x: 0.6, z: -3.4 },
  { asset: "Blackboard_Large", x: -2.4, z: -3.85, y: 2.3 },
  { asset: "Shelf_B_Plank", x: 0.6, z: -3.9, y: 2.1 },
  { asset: "Plant_SmallPot_A", x: 0.2, z: -3.88, y: 2.15 },
  { asset: "Deco_CoffeePack_Matcha", x: 0.95, z: -3.88, y: 2.15 },

  // --- Seating: six seats, a small café ------------------------------------
  // Two stools at the counter.
  { asset: "Chair_Bar_A", x: -2.75, z: -2.2, seat: true, seatY: 0.68 },
  { asset: "Chair_Bar_A", x: -1.6, z: -2.2, seat: true, seatY: 0.68 },

  // A sofa nook against the left wall.
  { asset: "Sofa_Double_Cream", x: -3.3, z: 0.4, rotY: HALF_PI, seat: true, seatY: 0.42 },
  { asset: "Table_Short", x: -2.2, z: 0.4 },
  { asset: "Sofa_Single_Olive", x: -3.35, z: 2.3, rotY: HALF_PI, seat: true, seatY: 0.42 },
  { asset: "Table_Tall", x: -2.3, z: 2.3 },

  // A low floor-cushion table, the cosiest seat in the house.
  { asset: "Carpet_Large_Purple", x: 1.2, z: 1.6 },
  { asset: "Table_Short", x: 1.2, z: 1.6 },
  { asset: "Cushion_Folded_Blue", x: 0.2, z: 1.6, seat: true, seatY: 0.22 },
  { asset: "Cushion_Folded_Red", x: 2.2, z: 1.6, seat: true, seatY: 0.22 },

  // --- Cat furniture -------------------------------------------------------
  { asset: "Cat_Climber_A_Cream", x: 3.1, z: -2.6, catSpot: true },
  { asset: "Cat_Bed_A_Pink", x: 1.6, z: -1.3, catSpot: true },
  { asset: "Cat_Bed_B_Blue", x: 3.2, z: 0.9, catSpot: true },
  { asset: "Cat_Bed_C_Pink", x: -2.1, z: 3.5, catSpot: true },

  // --- Greenery and finishing touches --------------------------------------
  { asset: "Plant_Bush_Square", x: -3.6, z: -1.5 },
  { asset: "Plant_Cactus_A_1", x: 3.6, z: -3.6 },
  { asset: "Carpet_Small_Cream", x: 3.2, z: 3.4 },
  { asset: "Blackboard_Small", x: 3.6, z: 2.4, rotY: -0.5 },
  { asset: "Bin_Wooden_A", x: -0.2, z: -2.6 },
];

/** Seats, in stable index order — the economy addresses these by number. */
export const SEATS: Placement[] = CAFE_LAYOUT.filter((p) => p.seat);

/** Where cats settle. */
export const CAT_SPOTS: Placement[] = CAFE_LAYOUT.filter((p) => p.catSpot);
