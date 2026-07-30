import type { Rarity } from "@/data/cats";

/**
 * Minimal event-logging abstraction (§11). Backend swaps out later without
 * touching game code — for now everything just logs to the console.
 */

export type AnalyticsEvent =
  | { name: "session_start" }
  | { name: "first_cat_acquired"; catCount: number }
  | { name: "cat_adopted"; breed: string; rarity: Rarity; catCount: number; cost: number; money: number }
  | { name: "cat_named"; breed: string }
  | { name: "roster_opened"; catCount: number; breedsDiscovered: number }
  | { name: "offline_income"; awayMs: number; earned: number; money: number }
  | { name: "visitor_paid"; amount: number; money: number };

export function logEvent(event: AnalyticsEvent): void {
  // eslint-disable-next-line no-console
  console.log(`[analytics] ${event.name}`, event);
}
