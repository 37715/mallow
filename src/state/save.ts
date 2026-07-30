import type { StoreApi } from "zustand/vanilla";
import type { CatInstance, GameState } from "@/state/store";

/**
 * Minimal save system (§8): the Zustand store is the single source of truth,
 * serialised to localStorage. Versioned from day one so future shape changes
 * migrate instead of corrupting saves. Never lose a player's cats. Sacred.
 *
 * Visitors are transient scene state and deliberately not saved.
 *
 * v1 → v2: added `savedAt` (wall-clock ms) so offline earnings can be
 * computed from time away on next launch.
 */

const SAVE_KEY = "mallow-save";
const SAVE_VERSION = 2;

interface SaveDataV2 {
  version: 2;
  money: number;
  nextCatId: number;
  cats: CatInstance[];
  /** Wall-clock (Date.now) timestamp of the last save — basis for offline earnings. */
  savedAt: number;
}

export interface LoadedSave extends Pick<GameState, "money" | "cats" | "nextCatId"> {
  savedAt: number;
}

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
    const data = JSON.parse(raw) as Record<string, unknown>;

    // v1 saves predate savedAt — migrate by treating "now" as last seen
    // (no retroactive offline windfall, nothing lost).
    if (data.version === 1) {
      data.version = 2;
      data.savedAt = Date.now();
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

    return { money: Math.max(0, data.money), cats: data.cats, nextCatId, savedAt };
  } catch {
    return null;
  }
}

function persist(state: GameState): void {
  const data: SaveDataV2 = {
    version: SAVE_VERSION,
    money: state.money,
    nextCatId: state.nextCatId,
    cats: state.cats,
    savedAt: Date.now(),
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
