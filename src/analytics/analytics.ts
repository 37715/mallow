import type { Rarity } from "@/data/cats";
import {
  consoleTransport,
  telemetryDeckTransport,
  type AnalyticsTransport,
  type Signal,
} from "@/analytics/transport";

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
  | { name: "cafe_opened"; seats: number; upgradeLevels: number };

/** The one numeric per event TelemetryDeck can average/sum (floatValue). */
function primaryValue(event: AnalyticsEvent): number | undefined {
  switch (event.name) {
    case "session_end":
      return event.sessionLengthMs;
    case "cat_adopted":
      return event.cost;
    case "upgrade_purchased":
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
    const id = crypto.randomUUID();
    localStorage.setItem(INSTALL_ID_KEY, id);
    return { id, isFirstOpen: true };
  } catch {
    // Storage unavailable — session-scoped id; retention won't track this device.
    return { id: crypto.randomUUID(), isFirstOpen: false };
  }
}

const appId: string = import.meta.env.VITE_TELEMETRYDECK_APP_ID ?? "";
const endpoint: string =
  import.meta.env.VITE_TELEMETRYDECK_ENDPOINT ?? "https://nom.telemetrydeck.com/v2/";

const transport: AnalyticsTransport = appId ? telemetryDeckTransport(endpoint) : consoleTransport();
const install = readOrCreateInstallId();
const sessionId = crypto.randomUUID();
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
