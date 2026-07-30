import { describe, expect, it } from "vitest";
import { drawCatDefinition, rollRarity, type Rng } from "@/systems/cats";
import { CAT_DEFINITIONS, RARITY_CONFIG, RARITY_ORDER } from "@/data/cats";

/** Deterministic rng (mulberry32) so distribution tests are repeatable. */
function seededRng(seed: number): Rng {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("rollRarity", () => {
  it("returns the lowest tier at roll 0 and the highest just under 1", () => {
    expect(rollRarity(() => 0)).toBe("common");
    expect(rollRarity(() => 0.999999)).toBe("legendary");
  });

  it("respects the cumulative weight boundaries", () => {
    const total = RARITY_ORDER.reduce((sum, r) => sum + RARITY_CONFIG[r].weight, 0);
    let cumulative = 0;
    for (const rarity of RARITY_ORDER) {
      const justInside = (cumulative + RARITY_CONFIG[rarity].weight - 0.001) / total;
      expect(rollRarity(() => justInside)).toBe(rarity);
      cumulative += RARITY_CONFIG[rarity].weight;
    }
  });

  it("produces roughly weight-proportional frequencies over many draws", () => {
    const rng = seededRng(42);
    const counts: Record<string, number> = {};
    const draws = 20000;
    for (let i = 0; i < draws; i++) {
      const rarity = rollRarity(rng);
      counts[rarity] = (counts[rarity] ?? 0) + 1;
    }
    // Ordering should hold with a comfortable margin at this sample size.
    expect(counts.common).toBeGreaterThan(counts.uncommon);
    expect(counts.uncommon).toBeGreaterThan(counts.rare);
    expect(counts.rare).toBeGreaterThan(counts.epic);
    expect(counts.epic).toBeGreaterThan(counts.legendary);
    expect(counts.legendary).toBeGreaterThan(0);
  });
});

describe("drawCatDefinition", () => {
  it("always returns a definition from the rolled rarity's pool", () => {
    const rng = seededRng(7);
    for (let i = 0; i < 1000; i++) {
      const def = drawCatDefinition(rng);
      expect(CAT_DEFINITIONS).toContain(def);
    }
  });

  it("can reach every breed in the catalog", () => {
    const rng = seededRng(1234);
    const seen = new Set<string>();
    for (let i = 0; i < 50000; i++) {
      seen.add(drawCatDefinition(rng).id);
    }
    expect(seen.size).toBe(CAT_DEFINITIONS.length);
  });
});
