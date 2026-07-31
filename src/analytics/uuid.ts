/**
 * `crypto.randomUUID()` is only exposed in **secure contexts** — HTTPS, or
 * localhost. Testing on a real phone means loading the dev server over plain
 * http from a LAN address, where it is `undefined`; calling it there throws,
 * and because analytics.ts generates a session id at module scope that failure
 * is a blank screen on device rather than a missing stat.
 *
 * `crypto.getRandomValues` carries no such restriction, so we fall back to
 * assembling a v4 UUID by hand.
 *
 * Don't "simplify" this back to `crypto.randomUUID()` — device testing (§13)
 * is exactly the case it breaks.
 */
export function randomUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  // Version (4) and variant bits per RFC 4122.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex: string[] = [];
  for (let i = 0; i < 16; i++) hex.push(bytes[i].toString(16).padStart(2, "0"));
  return (
    `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-` +
    `${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`
  );
}
