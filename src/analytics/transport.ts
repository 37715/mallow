/**
 * Analytics transports (§11). The game only talks to logEvent() in
 * analytics.ts; this file is the swappable backend behind it.
 *
 * Default backend is TelemetryDeck (privacy-first, no PII, no cookies) —
 * enabled by setting VITE_TELEMETRYDECK_APP_ID. Without it, events go to
 * the console so dev builds still show the stream.
 */

/** One signal in TelemetryDeck ingest v2 shape. */
export interface Signal {
  appID: string;
  clientUser: string;
  sessionID: string;
  type: string;
  isTestMode: boolean;
  floatValue?: number;
  payload: Record<string, string>;
}

export interface AnalyticsTransport {
  enqueue: (signal: Signal) => void;
  /** Flush synchronously-ish on app background/unload (sendBeacon survives page teardown). */
  flush: () => void;
}

export function consoleTransport(): AnalyticsTransport {
  return {
    enqueue: (signal) => {
      // eslint-disable-next-line no-console
      console.log(`[analytics] ${signal.type}`, signal.floatValue ?? "", signal.payload);
    },
    flush: () => {},
  };
}

const FLUSH_INTERVAL_MS = 10_000;
const FLUSH_AT_COUNT = 20;

export function telemetryDeckTransport(endpoint: string): AnalyticsTransport {
  let queue: Signal[] = [];
  let timer = 0;

  function send(useBeacon: boolean): void {
    if (queue.length === 0) return;
    const body = JSON.stringify(queue);
    queue = [];
    window.clearTimeout(timer);
    timer = 0;

    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
      return;
    }
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body,
      keepalive: true,
    }).catch(() => {
      // Analytics must never break the game; drop on network failure.
    });
  }

  return {
    enqueue: (signal) => {
      queue.push(signal);
      if (queue.length >= FLUSH_AT_COUNT) {
        send(false);
      } else if (!timer) {
        timer = window.setTimeout(() => send(false), FLUSH_INTERVAL_MS);
      }
    },
    flush: () => send(true),
  };
}
