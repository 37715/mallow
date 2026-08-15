import type { Rarity } from "@/data/cats";
import {
  consoleTransport,
  telemetryDeckTransport,
  type AnalyticsTransport,
  type Signal,
} from "@/analytics/transport";
import { randomUuid } from "@/analytics/uuid";

/**
 * Event-logging abstraction (§11). Game code calls logEvent() and nothing
 * else; enrichment, batching, and the backend live behind it.
 *
 * Privacy-respecting and minimal: the only identifier is a random UUID
 * generated on this device (no PII, no fingerprinting). D1/D7/D30 retention
 * falls out of session_start signals sharing that id, aggregated server-side.
 */

export type AnalyticsEvent =
  | { name: "first_open" }
  | { name: "session_start" }
  | { name: "session_end"; sessionLengthMs: number; money: number; catCount: number }
  | { name: "first_cat_acquired"; catCount: number }
  | { name: "cat_adopted"; breed: string; rarity: Rarity; catCount: number; cost: number; money: number }
  | { name: "cat_named"; breed: string }
  | { name: "roster_opened"; catCount: number; breedsDiscovered: number }
  | { name: "offline_income"; awayMs: number; earned: number; money: number }
  | { name: "visitor_paid"; amount: number; money: number }
  // Café expansion funnel (§11 — "first expansion" and what players actually buy).
  | { name: "first_expansion"; upgrade: string }
  | { name: "upgrade_purchased"; upgrade: string; level: number; cost: number; money: number }
  | { name: "cafe_opened"; seats: number; upgradeLevels: number }
  // Presence + long-game progression.
  | { name: "cat_petted"; breed: string }
  | { name: "furniture_moved"; piece: string }
  | { name: "shop_item_bought"; item: string; cost: number }
  | { name: "player_created" }
  | { name: "customisation_bought"; category: string; option: string; cost: number }
  | { name: "level_up"; level: number }
  | { name: "drink_unlocked"; drink: string; cost: number }
  | { name: "ingredient_unlocked"; ingredient: string; cost: number }
  | { name: "blend_created"; ingredients: number }
  | { name: "tile_bought"; tiles: number; cost: number }
  | { name: "backdrop_bought"; backdrop: string; cost: number }
  | { name: "bed_bought"; beds: number; cost: number }
  | { name: "window_bought"; cost: number }
  // The first thing the funnel can ask (§11): did they sit through the intro,
  // or bail out of it? A guide people skip is a guide that needs rewriting.
  | { name: "tutorial_finished" }
  // Chores are the post-tutorial pacing bet (§8). Which ones actually get done
  // is the thing to look at: one nobody touches is one that isn't fun.
  | { name: "chore_done"; chore: string };

/** The one numeric per event TelemetryDeck can average/sum (floatValue). */
function primaryValue(event: AnalyticsEvent): number | undefined {
  switch (event.name) {
    case "session_end":
      return event.sessionLengthMs;
    case "cat_adopted":
      return event.cost;
    case "upgrade_purchased":
      return event.cost;
    case "customisation_bought":
      return event.cost;
    case "offline_income":
      return event.earned;
    case "visitor_paid":
      return event.amount;
    default:
      return undefined;
  }
}

const INSTALL_ID_KEY = "mallow-install-id";

function readOrCreateInstallId(): { id: string; isFirstOpen: boolean } {
  try {
    const existing = localStorage.getItem(INSTALL_ID_KEY);
    if (existing) return { id: existing, isFirstOpen: false };
    const id = randomUuid();
    localStorage.setItem(INSTALL_ID_KEY, id);
    return { id, isFirstOpen: true };
  } catch {
    // Storage unavailable — session-scoped id; retention won't track this device.
    return { id: randomUuid(), isFirstOpen: false };
  }
}

const appId: string = import.meta.env.VITE_TELEMETRYDECK_APP_ID ?? "";
const endpoint: string =
  import.meta.env.VITE_TELEMETRYDECK_ENDPOINT ?? "https://nom.telemetrydeck.com/v2/";

const transport: AnalyticsTransport = appId ? telemetryDeckTransport(endpoint) : consoleTransport();

/**
 * Say out loud which backend is live. Without this the "no app id" case is
 * silent — the game looks fine, events look logged, and you only find out
 * nothing was ever recorded when you go looking for retention data that
 * doesn't exist. Cheap insurance against wasting a whole test cohort.
 */
// eslint-disable-next-line no-console
console.log(
  appId
    ? `[analytics] recording to TelemetryDeck (app ${appId.slice(0, 8)}…)`
    : "[analytics] CONSOLE ONLY — no VITE_TELEMETRYDECK_APP_ID set, nothing is being recorded",
);

/** Whether events are reaching a real backend. Surfaced for setup checks. */
export function isRecording(): boolean {
  return appId !== "";
}
const install = readOrCreateInstallId();
const sessionId = randomUuid();
const sessionStartedAt = Date.now();

export function logEvent(event: AnalyticsEvent): void {
  const payload: Record<string, string> = {};
  for (const [key, value] of Object.entries(event)) {
    if (key !== "name") payload[key] = String(value);
  }

  const signal: Signal = {
    appID: appId,
    clientUser: install.id,
    sessionID: sessionId,
    type: `Mallow.${event.name}`,
    isTestMode: import.meta.env.DEV,
    floatValue: primaryValue(event),
    payload,
  };
  transport.enqueue(signal);
}

/**
 * Wire session lifecycle: first_open once per install, session_end (with an
 * economy checkpoint from `snapshot`) whenever the app backgrounds, and a
 * transport flush so nothing is lost on teardown. Call once at bootstrap.
 */
export function initAnalytics(snapshot: () => { money: number; catCount: number }): void {
  if (install.isFirstOpen) logEvent({ name: "first_open" });
  logEvent({ name: "session_start" });

  const onLeave = () => {
    const { money, catCount } = snapshot();
    logEvent({
      name: "session_end",
      sessionLengthMs: Date.now() - sessionStartedAt,
      money,
      catCount,
    });
    transport.flush();
  };
  window.addEventListener("pagehide", onLeave);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") onLeave();
  });
}
