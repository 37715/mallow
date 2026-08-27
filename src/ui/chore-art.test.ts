/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { CHORES } from "@/data/chores";
import { markArt } from "@/ui/chore-art";

/**
 * The markers have to be *distinguishable*, which is the whole point of them
 * (Ellis, 2026-08-17: *"need unique icons foreach"*). Three jobs wearing one
 * sparkle is the failure this replaced, and it is the kind that comes back
 * quietly the next time a chore is added and its `art` is copy-pasted.
 */
describe("every job has its own picture", () => {
  it("gives no two chores the same art", () => {
    const arts = CHORES.map((c) => c.art);
    expect(new Set(arts).size).toBe(CHORES.length);
  });

  it("draws something for every art a chore names, and for the jar and the till", () => {
    for (const kind of [...CHORES.map((c) => c.art), "jar" as const, "till" as const]) {
      const node = markArt(kind);
      expect(node.tagName.toLowerCase(), kind).toBe("svg");
      // Filled edge to edge — a picture inset in the badge reads as a sticker.
      expect(node.getAttribute("viewBox")).toBe("0 0 40 40");
      expect(node.innerHTML.length, kind).toBeGreaterThan(200);
    }
  });

  it("draws them differently from one another", () => {
    // Cheap but exact: two drawings that are the same picture would produce
    // the same markup once their gradient ids are normalised away.
    const strip = (s: string): string => s.replace(/ca\d+/g, "id");
    const seen = new Map<string, string>();
    for (const kind of [...CHORES.map((c) => c.art), "jar" as const, "till" as const]) {
      const markup = strip(markArt(kind).innerHTML);
      expect(seen.has(markup), `${kind} draws the same as ${seen.get(markup)}`).toBe(false);
      seen.set(markup, kind);
    }
  });

  it("gives each instance its own gradient ids", () => {
    /**
     * Two markers can be up at once — a chore and a full tip jar — and SVG ids
     * are document-global however deeply they are nested. Shared ids mean the
     * second drawing silently repaints the first.
     */
    const ids = (node: SVGElement): string[] =>
      [...node.innerHTML.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
    const first = ids(markArt("window"));
    const second = ids(markArt("window"));
    expect(first.length).toBeGreaterThan(0);
    expect(first.some((id) => second.includes(id))).toBe(false);
  });
});
