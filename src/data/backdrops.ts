/**
 * The colour outside the café.
 *
 * Ellis, 2026-08-19: *"change background colour from a handful of nice cute
 * options - this should also be picked during setup."*
 *
 * It is the largest area of colour on the screen and it is the one thing in
 * the frame that is *not* the pack's art, so it is the cheapest possible way
 * to make two players' cafés look like different places. Picking it during
 * setup matters for the same reason the name does: the first thing you do is
 * make a choice that is visibly yours.
 *
 * **Every option is a pair, dim and lit**, because the ground is a gradient
 * sweeping toward the camera's open corner rather than a flat fill (§9 — a
 * single flat value is what makes a backdrop read as *no* backdrop). The dim
 * value doubles as `scene.background`, so there is never a horizon seam.
 *
 * Keep them all **muted and warm-ish in value**. The café is lit high-key and
 * sits in the middle of the frame; a saturated backdrop drags the eye off it
 * and fights the warm palette §9 spent four passes settling.
 */

export interface Backdrop {
  id: string;
  name: string;
  /**
   * Coins to switch to it later.
   *
   * **Free during setup, paid afterwards.** The first choice is part of making
   * the café yours and must not be a purchase; every one after it is a change
   * of mind, which is what the colourways already charge for
   * (`data/customisation.ts`). And by the rule from 2026-08-19, anything that
   * costs money also raises appeal — so buying a new sky pays for itself in a
   * way the player can see. Whatever was picked at setup stays free forever.
   */
  price: number;
  /** Far corner, and the scene's clear colour. */
  dim: number;
  /** Near corner, toward the camera. Always a little lighter and warmer. */
  lit: number;
  /** The swatch shown in the picker. */
  swatch: string;
}

/**
 * One price for every colour.
 *
 * They were tiered by taste — night dearest, clay cheapest — which quietly
 * said "this one is better", and none of them is. They are eight moods, not a
 * ladder (Ellis, 2026-08-25). A flat price also means the choice is only ever
 * about which you like, which is the whole point of the feature.
 */
export const BACKDROP_PRICE = 180;

export const BACKDROPS: Backdrop[] = [
  { id: "olive", name: "olive", price: BACKDROP_PRICE, dim: 0x7f6f42, lit: 0x9b854e, swatch: "#8b7748" },
  { id: "clay", name: "clay", price: BACKDROP_PRICE, dim: 0x8a5f4a, lit: 0xa87a5c, swatch: "#996c53" },
  { id: "blush", name: "blush", price: BACKDROP_PRICE, dim: 0x9b6b72, lit: 0xba868a, swatch: "#aa787e" },
  { id: "sky", name: "sky", price: BACKDROP_PRICE, dim: 0x5f7d90, lit: 0x7c9aab, swatch: "#6d8b9e" },
  { id: "sage", name: "sage", price: BACKDROP_PRICE, dim: 0x6d8464, lit: 0x8aa07c, swatch: "#7b9270" },
  { id: "plum", name: "plum", price: BACKDROP_PRICE, dim: 0x6d5f80, lit: 0x897a9b, swatch: "#7b6c8d" },
  { id: "sand", name: "sand", price: BACKDROP_PRICE, dim: 0x9a8a63, lit: 0xb5a67c, swatch: "#a7986f" },
  { id: "night", name: "night", price: BACKDROP_PRICE, dim: 0x3c3a4a, lit: 0x53506a, swatch: "#47455a" },
];

export const DEFAULT_BACKDROP = "olive";

export function backdrop(id: string): Backdrop {
  return BACKDROPS.find((b) => b.id === id) ?? BACKDROPS[0];
}

/** Appeal from backdrops bought, on the same footing as colourways. */
export function backdropAppeal(owned: string[]): number {
  return owned.filter((id) => (backdrop(id)?.price ?? 0) > 0).length * 0.2;
}

export function sanitizeBackdrop(value: unknown): string {
  return BACKDROPS.some((b) => b.id === value) ? (value as string) : DEFAULT_BACKDROP;
}
