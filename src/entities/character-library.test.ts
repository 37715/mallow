import { describe, expect, it } from "vitest";
import { HELD, appearanceFromSeed } from "@/entities/character-library";
import { ALL_REFRESHMENTS, servedRefreshments } from "@/data/shop";

/**
 * **A guest can only be carrying something the café sells.**
 *
 * Ellis, 2026-08-26: *"selling cupcakes should be an upgrade not by default."*
 * The held prop used to be a straight hash over the whole pack, so a café that
 * had bought one chair and nothing else still had customers walking out with
 * cake and milkshakes. What is on the counter should be what is in their hands.
 */
const seeds = Array.from({ length: 400 }, (_, i) => i * 17 + 3);

describe("what a guest is carrying", () => {
  it("gives a bare café nothing but coffee", () => {
    for (const seed of seeds) {
      const held = HELD[appearanceFromSeed(seed, servedRefreshments([])).held];
      expect(held, `seed ${seed}`).toContain("Coffee");
    }
  });

  it("puts cake in hands once the display case is bought, and no shakes", () => {
    const served = servedRefreshments(["cake-display"]);
    const props = new Set(seeds.map((s) => HELD[appearanceFromSeed(s, served).held]));
    expect([...props].some((p) => p.includes("Cupcake"))).toBe(true);
    expect([...props].some((p) => p.includes("Milkshake"))).toBe(false);
  });

  it("adds milkshakes with the tray of treats", () => {
    const served = servedRefreshments(["counter-treats"]);
    const props = new Set(seeds.map((s) => HELD[appearanceFromSeed(s, served).held]));
    expect([...props].some((p) => p.includes("Milkshake"))).toBe(true);
    // The tray is "milkshakes & cakes", so it sells both.
    expect([...props].some((p) => p.includes("Cupcake"))).toBe(true);
  });

  it("still offers the whole pack to anyone who is not a customer", () => {
    // The player's avatar and the guide pick their prop in the creator; neither
    // of them bought it at this counter, so the default must not be gated.
    const props = new Set(seeds.map((s) => HELD[appearanceFromSeed(s).held]));
    expect(props.size).toBe(HELD.length);
    expect(HELD.length).toBeGreaterThan(1);
  });

  it("changes nothing else about a guest when the menu changes", () => {
    // The held slot is drawn from its own hash, so a café buying a cake stand
    // must not restyle everybody's hair.
    for (const seed of seeds.slice(0, 40)) {
      const bare = appearanceFromSeed(seed, servedRefreshments([]));
      const full = appearanceFromSeed(seed, ALL_REFRESHMENTS);
      expect({ ...bare, held: 0 }).toEqual({ ...full, held: 0 });
    }
  });
});
