/**
 * Minimal event-logging abstraction (§11). Backend swaps out later without
 * touching game code — for now everything just logs to the console.
 */

export type AnalyticsEvent =
  | { name: "session_start" }
  | { name: "first_cat_acquired"; catCount: number }
  | { name: "cat_purchased"; catCount: number; cost: number; money: number }
  | { name: "visitor_paid"; amount: number; money: number };

export function logEvent(event: AnalyticsEvent): void {
  // eslint-disable-next-line no-console
  console.log(`[analytics] ${event.name}`, event);
}
