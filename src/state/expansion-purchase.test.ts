/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";
import { gameStore } from "@/state/store";
import { levelProgress } from "@/data/progression";
import {
  HOME_TILE,
  MAX_PATCHES,
  expansionCandidates,
  expansionCost,
  expansionLevel,
  ownedPatches,
  tileKey,
  type TileKey,
} from "@/data/expansion";

/**
 * **The price on the marker has to be the price at the till.**
 *
 * `ui/builder.ts` labels and enables each "+" from `expansionCost(patches)` and
 * `expansionLevel(patches)`, counting squares with `ownedPatches`. `buyTile`
 * used to count `state.tiles.length` instead — which includes `HOME_TILE`, so
 * it charged and gated **one square ahead** of the offer. The result was a
 * button that looked affordable, made its sound, and did nothing: Ellis,
 * 2026-08-17, *"i can no longer extend anywhere it breaks it."*
 *
 * Neither side is wrong on its own, which is exactly why this needs a test
 * that spans them: both curves are self-consistent, and the two are only ever
 * compared inside a player's finger.
 */

/** The smallest XP that reaches `level` — the curve is data, so search it. */
function xpForLevel(level: number): number {
  let xp = 0;
  while (levelProgress(xp).level < level && xp < 1_000_000) xp += 1;
  return xp;
}

/**
 * A café owning `patches` bought squares, laid out legally.
 *
 * Written out rather than generated: a straight run out +x leaves the bounds
 * at the third square (`MAX_TILE_INDEX` is 2), and `ownedPatches` silently
 * *drops* anything out of bounds — so a generated line quietly produced a café
 * with fewer squares than the test thought it had.
 */
const LEGAL_RUN: TileKey[] = ["1,0", "2,0", "2,1"];

function tilesWith(patches: number): TileKey[] {
  expect(patches).toBeLessThanOrEqual(LEGAL_RUN.length);
  return [HOME_TILE, ...LEGAL_RUN.slice(0, patches)];
}

/** Put the store in a known state; nothing here touches the rest of the game. */
function setCafe(patches: number, money: number, level: number): void {
  gameStore.setState({ tiles: tilesWith(patches), money, xp: xpForLevel(level) });
}

describe("buying a square costs what the marker says it costs", () => {
  beforeEach(() => {
    gameStore.setState({ tiles: [HOME_TILE], money: 0, xp: 0 });
  });

  for (let patches = 0; patches < MAX_PATCHES; patches++) {
    const cost = expansionCost(patches);
    const level = expansionLevel(patches);

    it(`square ${patches + 1}: exactly ${cost} at level ${level} is enough`, () => {
      setCafe(patches, cost, level);
      const target = expansionCandidates(gameStore.getState().tiles)[0];
      expect(target, "the café should still have somewhere to grow").toBeDefined();

      expect(gameStore.getState().buyTile(tileKey(target))).toBe(true);
      // Charged the marker's price and no more — a penny over would mean the
      // player was quoted one curve and billed another.
      expect(gameStore.getState().money).toBe(0);
      expect(ownedPatches(gameStore.getState().tiles).length).toBe(patches + 1);
    });

    it(`square ${patches + 1}: one level short is refused`, () => {
      // The gate has to bite where the marker says it does — a *disabled*
      // button is a fair no; an enabled one that does nothing is the bug.
      setCafe(patches, cost, level - 1);
      const target = expansionCandidates(gameStore.getState().tiles)[0];
      expect(gameStore.getState().buyTile(tileKey(target))).toBe(false);
      expect(gameStore.getState().money).toBe(cost);
    });

    it(`square ${patches + 1}: a pound short is refused`, () => {
      setCafe(patches, cost - 1, level);
      const target = expansionCandidates(gameStore.getState().tiles)[0];
      expect(gameStore.getState().buyTile(tileKey(target))).toBe(false);
    });
  }

  it("grows in either direction on the same terms", () => {
    // The doorway notch rides the +z edge and nothing rides +x, so the two
    // directions run through different layout code on the way out. The
    // *purchase* must not be able to tell them apart.
    for (const key of ["0,1", "1,0"] as TileKey[]) {
      gameStore.setState({
        tiles: [HOME_TILE],
        money: expansionCost(0),
        xp: xpForLevel(expansionLevel(0)),
      });
      expect(gameStore.getState().buyTile(key), `buying ${key}`).toBe(true);
      expect(gameStore.getState().tiles).toContain(key);
    }
  });

  it("stops offering squares once the café is as big as it gets", () => {
    setCafe(MAX_PATCHES, 9999, 99);
    expect(expansionCandidates(gameStore.getState().tiles)).toEqual([]);
  });
});
