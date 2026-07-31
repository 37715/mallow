import type { StoreApi } from "zustand/vanilla";
import type { CatInstance, GameState } from "@/state/store";
import { UPGRADE_DEFINITIONS } from "@/data/upgrades";
import { levelOf, type UpgradeLevels } from "@/systems/upgrades";

/**
 * Minimal save system (§8): the Zustand store is the single source of truth,
 * serialised to localStorage. Versioned from day one so future shape changes
 * migrate instead of corrupting saves. Never lose a player's cats. Sacred.
 *
 * Visitors are transient scene state and deliberately not saved.
 *
 * Migrations run in order, each bumping one version, so a save from any past
 * build walks forward to the current shape:
 *   v1 → v2: added `savedAt` (wall-clock ms) so offline earnings can be
 *            computed from time away on next launch.
 *   v2 → v3: added `upgrades` (café expansion + décor levels).
 *   v3 → v4: added `venueIndex` (venue progression). Cats gained an optional
 *            `contentUntil`; absent simply means "not content", so no cat data
 *            needed rewriting — which is the point of keeping it optional.
 *   v4 → v5: **dropped `venueIndex`** — the venue ladder was scrapped in the
 *            direction change (§0). Anyone mid-ladder keeps their cats and
 *            names; they simply come home to the one café. Money is rescaled
 *            in the same step, because old balances ran to the billions and
 *            the new economy tops out in the tens of thousands.
 */

const SAVE_KEY = "mallow-save";
const SAVE_VERSION = 5;

interface SaveDataV5 {
  version: 5;
  money: number;
  nextCatId: number;
  cats: CatInstance[];
  /** Wall-clock (Date.now) timestamp of the last save — basis for offline earnings. */
  savedAt: number;
  upgrades: UpgradeLevels;
}

export interface LoadedSave
  extends Pick<GameState, "money" | "cats" | "nextCatId" | "upgrades"> {
  savedAt: number;
}

type RawSave = Record<string, unknown>;

/**
 * Each migration takes the previous shape and returns the next one. Adding a
 * version means appending one entry here — nothing else changes.
 */
const MIGRATIONS: Record<number, (data: RawSave) => RawSave> = {
  // No retroactive offline windfall for saves that predate savedAt; nothing lost.
  1: (data) => ({ ...data, version: 2, savedAt: Date.now() }),
  2: (data) => ({ ...data, version: 3, upgrades: {} }),
  // Everyone starts in the first venue; existing cats need no rewriting.
  3: (data) => ({ ...data, version: 4, venueIndex: 0 }),
  // The ladder is gone. Drop the venue, and bring absurd old balances back
  // into the readable range rather than handing someone a billion pounds in a
  // game whose prices now top out around 30,000.
  4: (data) => {
    const { venueIndex: _dropped, ...rest } = data;
    const money = typeof data.money === "number" ? data.money : 0;
    return { ...rest, version: 5, money: Math.min(money, 5_000) };
  },
};

function isValidCat(value: unknown): value is CatInstance {
  if (typeof value !== "object" || value === null) return false;
  const cat = value as Record<string, unknown>;
  return (
    typeof cat.id === "string" &&
    typeof cat.name === "string" &&
    cat.name.length > 0 &&
    typeof cat.definitionId === "string"
  );
}

/**
 * Keep only levels for upgrades that still exist, clamped to their current max.
 * A removed or shrunk upgrade must never corrupt a save — it just stops counting.
 */
function sanitizeUpgrades(value: unknown): UpgradeLevels {
  if (typeof value !== "object" || value === null) return {};
  const raw = value as Record<string, unknown>;
  const levels: UpgradeLevels = {};
  for (const definition of UPGRADE_DEFINITIONS) {
    const level = levelOf(raw as UpgradeLevels, definition.id);
    if (level > 0) levels[definition.id] = level;
  }
  return levels;
}

/** Read + validate + migrate the save. Returns null (fresh start) on anything malformed. */
export function loadSave(): LoadedSave | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return null; // storage unavailable (private mode etc.) — play unsaved rather than crash
  }
  if (!raw) return null;

  try {
    let data = JSON.parse(raw) as RawSave;

    // Walk the save forward one version at a time to the current shape.
    while (typeof data.version === "number" && data.version < SAVE_VERSION) {
      const migrate = MIGRATIONS[data.version];
      if (!migrate) break;
      data = migrate(data);
    }

    if (data.version !== SAVE_VERSION) return null;
    if (typeof data.money !== "number" || !Number.isFinite(data.money)) return null;
    if (!Array.isArray(data.cats) || data.cats.length === 0) return null;
    if (!data.cats.every(isValidCat)) return null;

    const nextCatId =
      typeof data.nextCatId === "number" && Number.isFinite(data.nextCatId)
        ? data.nextCatId
        : data.cats.length;
    const savedAt =
      typeof data.savedAt === "number" && Number.isFinite(data.savedAt)
        ? data.savedAt
        : Date.now();

    return {
      money: Math.max(0, data.money),
      cats: data.cats,
      nextCatId,
      savedAt,
      upgrades: sanitizeUpgrades(data.upgrades),
    };
  } catch {
    return null;
  }
}

function persist(state: GameState): void {
  const data: SaveDataV5 = {
    version: SAVE_VERSION,
    money: state.money,
    nextCatId: state.nextCatId,
    cats: state.cats,
    savedAt: Date.now(),
    upgrades: state.upgrades,
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Storage full/unavailable — nothing sensible to do mid-game; next write retries.
  }
}

/**
 * Autosave silently (§6): debounced on every store change (money ticks every
 * frame while visitors pay), immediately when the app backgrounds.
 */
export function initAutosave(store: StoreApi<GameState>): void {
  let timer = 0;

  store.subscribe(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => persist(store.getState()), 800);
  });

  const saveNow = () => persist(store.getState());
  window.addEventListener("pagehide", saveNow);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveNow();
  });
}
