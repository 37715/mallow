/**
 * Number formatting for an idle game. Late-game income runs to billions and
 * beyond, and `$15000000000` is unreadable at a glance on a phone — the whole
 * satisfaction of a growing number depends on being able to *read* it.
 */

const UNITS = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc"];

/**
 * Compact money: `$0`, `$940`, `$1.2K`, `$15.4M`, `$3.07B`.
 *
 * Keeps three significant figures so a number visibly ticks upward rather than
 * sitting on `$15M` for ten minutes — watching it move is the point.
 */
export function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) return "$0";
  const value = Math.max(0, amount);
  if (value < 1000) return `$${Math.floor(value)}`;

  let scaled = value;
  let unit = 0;
  while (scaled >= 1000 && unit < UNITS.length - 1) {
    scaled /= 1000;
    unit++;
  }

  const decimals = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
  return `$${scaled.toFixed(decimals)}${UNITS[unit]}`;
}

/** Compact plain count, same scale rules without the currency symbol. */
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
