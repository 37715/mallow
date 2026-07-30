import type { StoreApi } from "zustand/vanilla";
import type { CatInstance, GameState } from "@/state/store";

/**
 * Minimal save system (§8): the Zustand store is the single source of truth,
 * serialised to localStorage. Versioned from day one so future shape changes
 * migrate instead of corrupting saves. Never lose a player's cats. Sacred.
 *
 * Visitors are transient scene state and deliberately not saved.
 */

const SAVE_KEY = "mallow-save";
const SAVE_VERSION = 1;

interface SaveDataV1 {
  version: 1;
  money: number;
  nextCatId: number;
  cats: CatInstance[];
}

export type LoadedSave = Pick<GameState, "money" | "cats" | "nextCatId">;

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

/** Read + validate the save. Returns null (fresh start) on anything malformed. */
export function loadSave(): LoadedSave | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return null; // storage unavailable (private mode etc.) — play unsaved rather than crash
  }
  if (!raw) return null;

  try {
    const data = JSON.parse(raw) as Partial<SaveDataV1>;
    if (data.version !== SAVE_VERSION) return null; // future: migrate instead of discarding
    if (typeof data.money !== "number" || !Number.isFinite(data.money)) return null;
    if (!Array.isArray(data.cats) || data.cats.length === 0) return null;
    if (!data.cats.every(isValidCat)) return null;

    const nextCatId =
      typeof data.nextCatId === "number" && Number.isFinite(data.nextCatId)
        ? data.nextCatId
        : data.cats.length;

    return { money: Math.max(0, data.money), cats: data.cats, nextCatId };
  } catch {
    return null;
  }
}

function persist(state: GameState): void {
  const data: SaveDataV1 = {
    version: SAVE_VERSION,
    money: state.money,
    nextCatId: state.nextCatId,
    cats: state.cats,
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
