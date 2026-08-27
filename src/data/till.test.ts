import { describe, expect, it } from "vitest";
import { TILL_AT, tillAsset, tillAssetFor, tillWorthCollecting } from "@/data/till";
import { CAFE_LAYOUT } from "@/data/cafe-layout";
import { assetFor } from "@/scene/cafe-room";
import { DEFAULT_CUSTOMISATION } from "@/data/customisation";
import { upgradeDefinition, tillCapacityFor } from "@/data/upgrades";

/**
 * The till as an object: where it stands, which model it wears, and when it
 * asks to be emptied.
 */
describe("the till on the counter", () => {
  it("stands over the cashier the layout actually places", () => {
    // `TILL_AT` is written down rather than read off the mesh, so it can drift
    // from the layout silently — and a marker pointing at empty counter is
    // exactly the fault the chore markers were redrawn to fix (§9).
    const cashier = CAFE_LAYOUT.filter((p) => p.isTill);
    expect(cashier).toHaveLength(1);
    expect(TILL_AT.x).toBeCloseTo(cashier[0].x, 3);
    expect(TILL_AT.z).toBeCloseTo(cashier[0].z, 3);
    // …and above it, not inside it: the marker floats from the top.
    expect(TILL_AT.y).toBeGreaterThan(cashier[0].y ?? 0);
  });

  it("wears a different till at every level the upgrade sells", () => {
    const max = upgradeDefinition("till")!.maxLevel;
    const worn = new Set<string>();
    for (let level = 0; level <= max; level++) worn.add(tillAsset(level));
    // Five finishes for six levels — the pack has no sixth, and the top two
    // sharing is better than inventing one.
    expect(worn.size).toBe(5);
    expect(tillAsset(0)).not.toBe(tillAsset(1));
  });

  it("survives a level outside the range rather than rendering nothing", () => {
    // A save with a retuned or corrupt upgrade must not leave a hole in the
    // counter — the same clamping rule `sanitizeUpgrades` follows.
    expect(tillAsset(-3)).toBe(tillAsset(0));
    expect(tillAsset(99)).toBe(tillAsset(4));
    expect(tillAssetFor({})).toBe(tillAsset(0));
    expect(tillAssetFor({ till: 2 })).toBe(tillAsset(2));
  });

  it("resolves through the layout the same way the room builds it", () => {
    const row = CAFE_LAYOUT.find((p) => p.isTill)!;
    expect(assetFor(row, DEFAULT_CUSTOMISATION, { till: 2 })).toBe(tillAsset(2));
    // No upgrades at all still gives a till rather than `undefined`.
    expect(assetFor(row, DEFAULT_CUSTOMISATION)).toBe(tillAsset(0));
  });

  it("asks to be emptied in proportion to what it holds", () => {
    // The point of the upgrade is fewer trips, so the prompt has to scale with
    // capacity — a fixed threshold would make a big till nag like a small one.
    const small = tillCapacityFor(0);
    const big = tillCapacityFor(4);
    expect(tillWorthCollecting(small * 0.3, small)).toBe(true);
    expect(tillWorthCollecting(small * 0.1, small)).toBe(false);
    expect(tillWorthCollecting(small * 0.3, big)).toBe(false);
  });

  it("never asks for nothing", () => {
    // An empty till must not put a button up offering £0, whatever the
    // capacity curve is retuned to.
    expect(tillWorthCollecting(0, tillCapacityFor(0))).toBe(false);
    expect(tillWorthCollecting(0, 0)).toBe(false);
  });
});
