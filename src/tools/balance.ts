/**
 * Balance simulator — run with `npm run balance`.
 *
 * §17 says expose the numbers rather than guessing at them, and progression
 * pacing is the hardest thing in the game to eyeball: it plays out over days,
 * so you cannot feel it by clicking around for ten minutes. This plays the
 * economy forward for several simulated weeks under different player habits
 * and reports what the curve actually does.
 *
 * It reads the real `/data` config and the real `/systems` maths, so it can't
 * drift from the game. When you retune anything, run this first.
 */

import { ECONOMY_CONFIG, costForNextCat } from "@/data/economy";
import { RARITY_CONFIG } from "@/data/cats";
import { UPGRADE_DEFINITIONS, type UpgradeId } from "@/data/upgrades";
import { cafeStats, type CafeStats } from "@/systems/cafe";
import { liveIncomePerSecond, computeOfflineEarnings } from "@/systems/offline";
import { levelOf, nextLevelCost, purchaseUpgrade, type UpgradeLevels } from "@/systems/upgrades";

const HOUR = 3600;
const DAY = 24 * HOUR;

/** Expected appeal of a randomly drawn cat, from the rarity weights. */
const AVG_CAT_APPEAL = (() => {
  const total = Object.values(RARITY_CONFIG).reduce((sum, r) => sum + r.weight, 0);
  return Object.values(RARITY_CONFIG).reduce((sum, r) => sum + (r.weight / total) * r.appeal, 0);
})();

interface Habit {
  name: string;
  /** Sessions per day. */
  sessions: number;
  /** Minutes of active play per session. */
  minutesPerSession: number;
  /** Whether they bother petting the cats while present. */
  pets: boolean;
}

const HABITS: Habit[] = [
  { name: "devoted (4x25min, pets)", sessions: 4, minutesPerSession: 25, pets: true },
  { name: "regular (2x15min, pets)", sessions: 2, minutesPerSession: 15, pets: true },
  { name: "casual (1x10min, pets)", sessions: 1, minutesPerSession: 10, pets: true },
  { name: "pure AFK (1x1min, no pets)", sessions: 1, minutesPerSession: 1, pets: false },
];

interface Player {
  money: number;
  cats: number;
  catAppealBase: number;
  upgrades: UpgradeLevels;
  /** Simulated seconds of contentment remaining on the roster. */
  contentFor: number;
}

function statsFor(player: Player, content: boolean): CafeStats {
  const appeal = content
    ? player.catAppealBase * ECONOMY_CONFIG.contentment.appealMultiplier
    : player.catAppealBase;
  return cafeStats(appeal, player.upgrades);
}

/** Greedy: spend on whatever buys the most income per dollar. */
function spend(player: Player, onCatAdopted?: () => void): void {
  for (let guard = 0; guard < 200; guard++) {
    const now = liveIncomePerSecond(statsFor(player, false));

    interface Option {
      kind: "cat" | UpgradeId;
      cost: number;
      gain: number;
    }
    const options: Option[] = [];

    if (player.cats < ECONOMY_CONFIG.maxCats) {
      const withCat = { ...player, catAppealBase: player.catAppealBase + AVG_CAT_APPEAL };
      options.push({
        kind: "cat",
        cost: costForNextCat(player.cats),
        gain: liveIncomePerSecond(statsFor(withCat, false)) - now,
      });
    }

    for (const definition of UPGRADE_DEFINITIONS) {
      const cost = nextLevelCost(player.upgrades, definition.id);
      if (cost === null) continue;
      const levels = purchaseUpgrade(Infinity, player.upgrades, definition.id).levels;
      options.push({
        kind: definition.id,
        cost,
        gain: liveIncomePerSecond(statsFor({ ...player, upgrades: levels }, false)) - now,
      });
    }

    const best = options
      .filter((o) => o.gain > 0 && o.cost <= player.money)
      .sort((a, b) => b.gain / b.cost - a.gain / a.cost)[0];
    if (!best) return;

    player.money -= best.cost;
    if (best.kind === "cat") {
      player.cats++;
      player.catAppealBase += AVG_CAT_APPEAL;
      onCatAdopted?.();
    } else {
      player.upgrades = purchaseUpgrade(Infinity, player.upgrades, best.kind).levels;
    }
  }
}


function simulate(habit: Habit, days: number) {
  const player: Player = {
    money: ECONOMY_CONFIG.startingMoney,
    cats: 1,
    catAppealBase: RARITY_CONFIG.common.appeal,
    upgrades: {},
    contentFor: 0,
  };

  const activeSeconds = habit.sessions * habit.minutesPerSession * 60;
  const gapSeconds = (DAY - activeSeconds) / habit.sessions;
  let activeTotal = 0;
  let offlineTotal = 0;
  let peak = 0;
  /** Elapsed seconds when each cat was adopted — the early-pacing numbers. */
  const catAt: number[] = [];

  for (let day = 0; day < days; day++) {
    for (let session = 0; session < habit.sessions; session++) {
      // Time away since the last session. A player who petted before closing
      // the app carries that contentment into the away window.
      const contentCarriedMs = habit.pets ? ECONOMY_CONFIG.contentment.durationMs : 0;
      const earned = computeOfflineEarnings(
        statsFor(player, true),
        gapSeconds * 1000,
        statsFor(player, false),
        contentCarriedMs,
      );
      player.money = Math.min(ECONOMY_CONFIG.tillCapacity, player.money + earned);
      offlineTotal += earned;

      if (habit.pets) player.contentFor = ECONOMY_CONFIG.contentment.durationMs / 1000;

      // Active session, in ten-second steps.
      for (let t = 0; t < habit.minutesPerSession * 60; t += 10) {
        const content = player.contentFor > 0;
        const income = liveIncomePerSecond(statsFor(player, content)) * 10;
        player.money = Math.min(ECONOMY_CONFIG.tillCapacity, player.money + income);
        activeTotal += income;
        player.contentFor = Math.max(0, player.contentFor - 10);
        peak = Math.max(peak, player.money);
        const elapsed = day * DAY + session * gapSeconds + t;
        spend(player, () => catAt.push(elapsed));

      }
    }
  }

  return { player, activeTotal, offlineTotal, peak, catAt };
}

function fmtTime(seconds: number): string {
  if (seconds < HOUR) return `${Math.round(seconds / 60)}m`;
  if (seconds < DAY) return `${(seconds / HOUR).toFixed(1)}h`;
  return `${(seconds / DAY).toFixed(1)}d`;
}

function fmtMoney(n: number): string {
  // Deliberately NOT abbreviated: the whole point of the rebalance is that
  // money stays small enough to read as a plain number (§0). If this output
  // starts needing K or M, the economy has drifted.
  return `£${Math.round(n).toLocaleString("en-GB")}`;
}

// --- Report ----------------------------------------------------------------

const DAYS = 30;
console.log(`
=== PROGRESSION over ${DAYS} simulated days ===
`);
console.log("habit                        cats  upgrades  peak till  £/min   2nd cat   full house");

for (const habit of HABITS) {
  const { player, peak, catAt } = simulate(habit, DAYS);
  const rate = liveIncomePerSecond(statsFor(player, false)) * 60;
  const levels = UPGRADE_DEFINITIONS.map((d) => `${d.id[0]}${levelOf(player.upgrades, d.id)}`).join(" ");
  const when = (i: number) => (catAt[i] === undefined ? "  never" : fmtTime(catAt[i]));
  console.log(
    `${habit.name.padEnd(28)} ${String(player.cats).padStart(4)}  ${levels.padEnd(8)} ` +
      `${fmtMoney(peak).padStart(9)}  ${fmtMoney(rate).padStart(5)}  ${when(0).padStart(8)}  ${when(ECONOMY_CONFIG.maxCats - 2).padStart(9)}`,
  );
}

console.log(
  `\nTill ceiling is ${fmtMoney(ECONOMY_CONFIG.tillCapacity)} — if "peak till" ever exceeds it, the clamp is broken.`,
);

console.log(`\n=== IS PLAYING WORTH IT? ===\n`);
for (const habit of HABITS) {
  const { activeTotal, offlineTotal } = simulate(habit, 7);
  const total = activeTotal + offlineTotal;
  const activeShare = (activeTotal / total) * 100;
  console.log(
    `${habit.name.padEnd(28)} earned while present: ${activeShare.toFixed(0).padStart(3)}%` +
      `   (active ${fmtMoney(activeTotal)} vs offline ${fmtMoney(offlineTotal)})`,
  );
}

// The headline number: does an hour of playing beat an hour of being away?
const probe: Player = {
  money: 0,
  cats: 6,
  catAppealBase: 6 * AVG_CAT_APPEAL,
  upgrades: { brews: 3 },
  contentFor: 0,
};
const activeRate = liveIncomePerSecond(statsFor(probe, true));
const idleRate = liveIncomePerSecond(statsFor(probe, false));
const offlineRate = idleRate * ECONOMY_CONFIG.offline.rateMultiplier;
console.log(`\nMid-game café, one hour of each:`);
console.log(`  playing + petted cats : ${fmtMoney(activeRate * HOUR)}`);
console.log(`  playing, never petted : ${fmtMoney(idleRate * HOUR)}`);
console.log(`  app closed            : ${fmtMoney(offlineRate * HOUR)}`);
console.log(`  => playing is ${(activeRate / offlineRate).toFixed(2)}x better than being away`);
console.log(
  `  => offline caps at ${ECONOMY_CONFIG.offline.maxAccrualMs / 3600000}h ` +
    `(${fmtMoney(computeOfflineEarnings(statsFor(probe, false), DAY * 1000))} however long you leave it)\n`,
);
