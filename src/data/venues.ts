/**
 * Venue progression (§8) — the long game, and the answer to content drought.
 *
 * **This is a move, not a prestige reset.** Standard idle prestige wipes your
 * progress for a multiplier; here that would delete the player's named cats,
 * violating "never lose a player's cats. Sacred." So: you relocate the café to
 * a lovelier building and *your cats come with you*. Fixtures (seating, décor,
 * brews, staff) belong to the old building and are left behind; cats, their
 * names, and the cat-dex never reset.
 *
 * The ladder escalates but stays cosy — the "how far does this go?" hook
 * without breaking the warm brand (§1). The last two tiers are the open
 * question in §0; reordering or renaming is a pure data change.
 */

export interface VenuePalette {
  /** Scene background beyond the walls. */
  sky: number;
  floor: number;
  wall: number;
  rug: number;
  counter: number;
}

export interface VenueDefinition {
  id: string;
  name: string;
  /** One warm line shown on the move card. */
  tagline: string;
  /** Money needed to move *into* this venue. The first venue is free. */
  moveCost: number;
  /** Multiplies all income earned while trading here. */
  incomeMultiplier: number;
  /**
   * Seats this venue starts with, before any seating upgrades. Softens the
   * fixture reset on a move — you never drop back to a one-table café.
   *
   * Capped by the room: the portrait layout fits twelve chairs total
   * (scene/room.ts), so `max(baseSeats) + seating.maxLevel` must stay <= 12.
   * scene/layout.test.ts asserts this.
   */
  baseSeats: number;
  palette: VenuePalette;
}

export const VENUES: VenueDefinition[] = [
  {
    id: "corner-cafe",
    name: "Corner Café",
    tagline: "A little room, a big window, and one very sure cat.",
    moveCost: 0,
    incomeMultiplier: 1,
    baseSeats: 4,
    palette: { sky: 0xf0dfc4, floor: 0xe6d2b5, wall: 0xf3e4cf, rug: 0xd9b48a, counter: 0xb5876a },
  },
  {
    id: "high-street",
    name: "High Street Parlour",
    tagline: "Bigger windows, a proper awning, and a queue some mornings.",
    moveCost: 260_000,
    incomeMultiplier: 8,
    baseSeats: 4,
    palette: { sky: 0xefe0cc, floor: 0xdcc8a8, wall: 0xf6ead8, rug: 0xc9a882, counter: 0xa87a5c },
  },
  {
    id: "conservatory",
    name: "Garden Conservatory",
    tagline: "Glass roof, warm rain overhead, ferns in every corner.",
    moveCost: 7_300_000,
    incomeMultiplier: 64,
    baseSeats: 5,
    palette: { sky: 0xdcecd8, floor: 0xd8cfb0, wall: 0xe8f0e2, rug: 0xb8c9a8, counter: 0x8a9a72 },
  },
  {
    id: "seaside",
    name: "Seaside Terrace",
    tagline: "Salt in the air, and cats asleep in every patch of sun.",
    moveCost: 204_000_000,
    incomeMultiplier: 512,
    baseSeats: 5,
    palette: { sky: 0xcfe4ee, floor: 0xe8dcc2, wall: 0xf2f0e6, rug: 0xa8c4cc, counter: 0x9aa8ae },
  },
  {
    id: "forest-cabin",
    name: "Forest Cabin",
    tagline: "Woodsmoke, low lamps, and snow settling on the pines outside.",
    moveCost: 5_700_000_000,
    incomeMultiplier: 4_096,
    baseSeats: 6,
    palette: { sky: 0xd8dce0, floor: 0xa8845e, wall: 0xc09a72, rug: 0x8a6a52, counter: 0x6e5340 },
  },
  {
    id: "cloud-cafe",
    name: "Cloud Café",
    tagline: "Somehow it floats. Nobody asks. The tea is excellent.",
    moveCost: 110_000_000_000,
    incomeMultiplier: 32_768,
    baseSeats: 6,
    palette: { sky: 0xe6ecfa, floor: 0xf0eaf6, wall: 0xfaf6ff, rug: 0xd6cce8, counter: 0xb8aed0 },
  },
  {
    id: "moon-cafe",
    name: "Moon Café",
    tagline: "A big quiet window, and the Earth rising slowly through it.",
    moveCost: 3_600_000_000_000,
    incomeMultiplier: 262_144,
    baseSeats: 6,
    palette: { sky: 0x2a2a3e, floor: 0xb8b4c8, wall: 0x4a4560, rug: 0x6e6688, counter: 0x8a82a4 },
  },
];

export function venueAt(index: number): VenueDefinition {
  // Clamp rather than throw — a save from a future build must never crash.
  return VENUES[Math.min(VENUES.length - 1, Math.max(0, index))];
}

/** The venue after this one, or null at the top of the ladder. */
export function nextVenue(index: number): VenueDefinition | null {
  return index + 1 < VENUES.length ? VENUES[index + 1] : null;
}
