import { VENUES, nextVenue, venueAt, type VenueDefinition } from "@/data/venues";

/**
 * Moving the café to a new venue (§8). Pure logic — the store applies the
 * result, the scene repaints, nothing here knows about either.
 */

export interface MoveResult {
  success: boolean;
  /** Venue index after the move; unchanged on failure. */
  venueIndex: number;
  /** What the move cost, or the cost that couldn't be met. 0 at the top. */
  cost: number;
  /** The venue being moved into, or null when already at the top. */
  venue: VenueDefinition | null;
}

export function canMove(money: number, venueIndex: number): boolean {
  const next = nextVenue(venueIndex);
  return next !== null && money >= next.moveCost;
}

/**
 * Attempt to move up one venue. Note what this does *not* return: cats. The
 * caller keeps them untouched — see the sacred rule in data/venues.ts.
 */
export function moveToNextVenue(money: number, venueIndex: number): MoveResult {
  const next = nextVenue(venueIndex);
  if (!next) {
    return { success: false, venueIndex, cost: 0, venue: null };
  }
  if (money < next.moveCost) {
    return { success: false, venueIndex, cost: next.moveCost, venue: next };
  }
  return { success: true, venueIndex: venueIndex + 1, cost: next.moveCost, venue: next };
}

/** Progress toward affording the next move, 0–1. Drives the UI meter. */
export function moveProgress(money: number, venueIndex: number): number {
  const next = nextVenue(venueIndex);
  if (!next || next.moveCost <= 0) return 1;
  return Math.min(1, Math.max(0, money / next.moveCost));
}

export function isTopVenue(venueIndex: number): boolean {
  return venueIndex >= VENUES.length - 1;
}

export { venueAt, nextVenue };
