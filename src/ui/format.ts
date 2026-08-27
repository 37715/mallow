/**
 * Money formatting.
 *
 * **Never abbreviated.** This file used to compact everything past a thousand
 * into `$1.2K`, `$15.4M`, `$3.07B` — written for the idle game Mallow was
 * before the direction change, where income really did run to billions. §0
 * ended that: *"money stays readable. Target ceilings roughly: early 0–500,
 * mid 500–5k, late 5k–30k. No abbreviations, no millions."*
 *
 * **The bank lost its £9,999 ceiling on 2026-08-26** (Ellis: *"the limit for
 * money is 9999 which it shouldnt be there should be no limit"*), so this is
 * no longer guaranteed by a cap. It is guaranteed by the *rate* instead: money
 * only enters the bank when the player empties the till (`systems/till.ts`),
 * which holds a thousand or two, so a balance climbs at the pace somebody
 * taps rather than at the pace time passes. Six figures would take months of
 * daily play. If figures ever do get long enough to need shortening, the thing
 * to fix is the till, not this file.
 *
 * Thousands get a separator, because `$1260` and `$12600` are the same shape
 * at a glance and a price is a thing you have to read exactly.
 */
export function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) return "$0";
  const value = Math.floor(Math.max(0, amount));
  return `$${value.toLocaleString("en-GB")}`;
}

/** The same number without the currency symbol. */
export function formatCount(value: number): string {
  return formatMoney(value).slice(1);
}

/** "3h 20m" / "45m" / "2d 4h" — for away time and contentment remaining. */
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours > 0 ? `${days}d ${restHours}h` : `${days}d`;
}
