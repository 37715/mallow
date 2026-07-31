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
  // --- Architecture: placed by TILE CENTRE, not by footprint ---------------
  //
  // Wall and floor pieces are tile-modular: their geometry is authored around
  // the centre of a 4-unit tile with the wall sitting on that tile's edge. So
  // a wall placed at tile centre (−2,−2) lands on the west edge of that tile,
  // i.e. x = −4. `Enclosed_Corner_N` and `_W` are two faces of one
  // pre-assembled room and share an origin — putting BOTH at the same tile
  // centre is what closes the corner. Placing them anywhere else, or letting
  // the loader re-centre them, pulls the room apart at the join.
  //
  // rotY −90° turns a west-edge piece into a north-edge one.
  { asset: "Flooring_A_Tiling", x: -2, z: -2, y: -FLOOR_THICKNESS },
  { asset: "Flooring_A_Tiling", x: 2, z: -2, y: -FLOOR_THICKNESS },
  { asset: "Flooring_A_Tiling", x: -2, z: 2, y: -FLOOR_THICKNESS },
  { asset: "Flooring_A_Tiling", x: 2, z: 2, y: -FLOOR_THICKNESS },

  // The closed corner: both faces of the corner set, same tile centre.
  { asset: "Wall_A_Enclosed_Corner_N", x: -2, z: -2 },
  { asset: "Wall_A_Enclosed_Corner_W", x: -2, z: -2 },
  // The big window, on the back wall where the light comes from.
  { asset: "Wall_A_Window_Light_Mid", x: 2, z: -2, rotY: -HALF_PI },
  // Left wall continues south, also a window so the room isn't gloomy.
  { asset: "Wall_A_Window_Light_Mid", x: -2, z: 2 },

  // --- Counter along the back wall ----------------------------------------
  { asset: "Bar_End_Round", x: -3.4, z: -3.1 },
  { asset: "Bar_Straight_1", x: -2.7, z: -3.1 },
  { asset: "Bar_Straight_3_Sink", x: -2.0, z: -3.1 },
  { asset: "Bar_Straight_2", x: -1.3, z: -3.1 },
  { asset: "Bar_End_Flat", x: -0.6, z: -3.1 },

  // On the counter — the clutter is what makes it look lived in.
  { asset: "Coffe_Machine", x: -2.65, z: -3.15, y: 0.78 },
  { asset: "CupcakeStand", x: -1.35, z: -3.05, y: 0.78 },
  { asset: "Cupcake_RedVelvet", x: -1.35, z: -3.05, y: 0.9 },
  { asset: "ComputerCashier_A", x: -0.65, z: -3.2, y: 0.78, rotY: Math.PI },
  { asset: "Food_Milkshake_Strawberry", x: -0.95, z: -2.95, y: 0.78 },
  { asset: "Deco_Cups_1", x: -3.35, z: -3.1, y: 0.78 },

  // --- Wall dressing -------------------------------------------------------
  { asset: "Cake_Display_A", x: 0.5, z: -3.3 },
  { asset: "Blackboard_Large", x: -2.3, z: -3.82, y: 2.4 },
  { asset: "Shelf_C_Plank", x: -0.4, z: -3.86, y: 2.5 },
  { asset: "Deco_CoffeePack_Matcha", x: -0.8, z: -3.84, y: 2.56 },
  { asset: "Deco_CoffeePack_Strawberry", x: -0.5, z: -3.84, y: 2.56 },
  { asset: "Deco_CoffeePack_Cream", x: -0.2, z: -3.84, y: 2.56 },
  { asset: "Shelf_C_Plank", x: -0.4, z: -3.86, y: 1.85 },
  { asset: "Plant_Cactus_A_1", x: -0.75, z: -3.84, y: 1.91 },
  { asset: "Plant_Cactus_A_2", x: -0.4, z: -3.84, y: 1.91 },
  { asset: "Plant_Cactus_A_3", x: -0.05, z: -3.84, y: 1.91 },
  { asset: "Plant_Hanging", x: -3.6, z: -3.5, y: 3.3 },
  { asset: "Plant_Hanging", x: -3.3, z: 1.2, y: 3.3 },

  // --- Seating: six seats, a small café ------------------------------------
  { asset: "Chair_Bar_A", x: -2.6, z: -2.1, seat: true, seatY: 0.68 },
  { asset: "Chair_Bar_A", x: -1.5, z: -2.1, seat: true, seatY: 0.68 },

  { asset: "Sofa_Double_Cream", x: -3.2, z: 0.6, rotY: HALF_PI, seat: true, seatY: 0.42 },
  { asset: "Table_Short", x: -2.1, z: 0.6 },
  { asset: "Cup_Upright_Orange", x: -2.1, z: 0.6, y: 0.38 },

  { asset: "Sofa_Single_Olive", x: 3.2, z: -1.0, rotY: -HALF_PI, seat: true, seatY: 0.42 },
  { asset: "Table_Tall", x: 2.2, z: -1.0 },
  { asset: "Cake_Table_Display_Small_A", x: 2.2, z: -1.0, y: 0.78 },

  // The floor-cushion corner — the cosiest seat in the house.
  { asset: "Carpet_Large_Purple", x: 1.1, z: 1.9 },
  { asset: "Table_Short", x: 1.1, z: 1.9 },
  { asset: "Cushion_Folded_Blue", x: 0.1, z: 1.9, seat: true, seatY: 0.22 },
  { asset: "Cushion_Folded_Red", x: 2.1, z: 1.9, seat: true, seatY: 0.22 },
  { asset: "Cushion_Folded_Yellow", x: 1.1, z: 2.9 },

  // --- Cat furniture -------------------------------------------------------
  { asset: "Cat_Climber_A_Cream", x: 3.2, z: -3.0, catSpot: true },
  { asset: "Cat_Bed_A_Pink", x: 1.4, z: -2.4, catSpot: true },
  { asset: "Cat_Bed_B_Blue", x: 3.3, z: 1.5, catSpot: true },
  { asset: "Cat_Bed_C_Pink", x: -3.3, z: 3.2, catSpot: true },

  // --- Greenery and finishing touches --------------------------------------
  { asset: "Plant_Bush_Square", x: -3.6, z: -1.4 },
  { asset: "Plant_SmallPot_A", x: 2.2, z: -1.0, y: 0.78 },
  { asset: "Carpet_Small_Cream", x: 3.0, z: 3.3 },
  { asset: "Blackboard_Small", x: 3.7, z: 2.6, rotY: -0.5 },
  { asset: "Bin_Wooden_A", x: 0.0, z: -2.5 },
];

/** Seats, in stable index order — the economy addresses these by number. */
export const SEATS: Placement[] = CAFE_LAYOUT.filter((p) => p.seat);

/** Where cats settle. */
export const CAT_SPOTS: Placement[] = CAFE_LAYOUT.filter((p) => p.catSpot);
