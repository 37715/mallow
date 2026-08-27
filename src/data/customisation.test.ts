import { describe, expect, it } from "vitest";
import {
  CUSTOMISATION,
  DEFAULT_CUSTOMISATION,
  SLOT_CATEGORY,
  chosenAssets,
  chosenTints,
  type CustomisableSlot,
} from "@/data/customisation";
import { CAFE_LAYOUT } from "@/data/cafe-layout";
import { SHOP_ITEMS, copyAsset } from "@/data/shop";
import { assetFor } from "@/scene/cafe-room";

/**
 * Colourways come in two shapes and the seam between them is where the bugs
 * are: nearly every category swaps the *asset* (the pack draws the sofa five
 * times), while the wall pieces have no twins and swap a *tint* instead.
 *
 * The two have to be indistinguishable to every caller, so these tests are
 * mostly about the fallbacks — a slot with no row in `chosenAssets` must
 * resolve to the layout's own asset rather than to `undefined`, which is how a
 * piece silently stops appearing in the room.
 */

const slots = Object.keys(SLOT_CATEGORY) as CustomisableSlot[];

describe("colourways", () => {
  it("gives every category a default that is one of its own options", () => {
    for (const category of CUSTOMISATION) {
      const chosen = DEFAULT_CUSTOMISATION[category.id];
      expect(category.options.some((o) => o.id === chosen), category.id).toBe(true);
    }
  });

  it("starts every category on something free", () => {
    for (const category of CUSTOMISATION) {
      const first = category.options.find((o) => o.id === DEFAULT_CUSTOMISATION[category.id])!;
      expect(first.price, category.id).toBe(0);
      expect(first.unlock, category.id).toBeNull();
    }
  });

  it("never tints a slot that has an asset of its own", () => {
    // A category may swap assets or paint a tint, never both: doing both would
    // multiply the tint over an already-coloured variant and the swatch would
    // stop describing the result.
    const assets = chosenAssets(DEFAULT_CUSTOMISATION);
    for (const category of CUSTOMISATION) {
      const slot = slots.find((s) => SLOT_CATEGORY[s] === category.id)!;
      const tints = category.options.some((o) => o.tint);
      if (tints) expect(assets[slot], category.id).toBeUndefined();
      else expect(assets[slot], category.id).toBeDefined();
    }
  });

  it("resolves a tint-only slot back to the layout's own asset", () => {
    // `assetFor` falls through when `chosenAssets` has no row, which is the
    // whole reason `wallWood` may cover three different meshes — a board and
    // two shelf planks — under one colourway.
    const wooden = CAFE_LAYOUT.filter((p) => p.slot === "wallWood");
    expect(wooden.length).toBeGreaterThan(1);
    expect(new Set(wooden.map((p) => p.asset)).size).toBeGreaterThan(1);
    for (const piece of wooden) {
      expect(assetFor(piece, DEFAULT_CUSTOMISATION)).toBe(piece.asset);
    }
  });

  it("gives a copy of a tint-only piece an asset rather than undefined", () => {
    for (const item of SHOP_ITEMS) {
      const asset = copyAsset(item, DEFAULT_CUSTOMISATION);
      expect(typeof asset, item.id).toBe("string");
      expect(asset.length, item.id).toBeGreaterThan(0);
    }
  });

  it("paints the woodwork only once a tinted option is chosen", () => {
    expect(chosenTints(DEFAULT_CUSTOMISATION).wallWood).toBeUndefined();
    const walnut = { ...DEFAULT_CUSTOMISATION, woodwork: "Walnut" };
    expect(chosenTints(walnut).wallWood).toMatch(/^#[0-9a-f]{6}$/i);
    // Every other slot stays untinted, or the whole café would move.
    for (const slot of slots) {
      if (slot !== "wallWood") expect(chosenTints(walnut)[slot], slot).toBeUndefined();
    }
  });

  it("keeps every tint gentle enough for the texture to read through", () => {
    // Ellis asked for *subtle*: the atlas cell is a painted wood grain, and a
    // strong multiply flattens it into a coloured blob — worse on the menu
    // board, where the chalk face is already dark and has to stay readable.
    // Two limits, because they catch different mistakes: no single channel may
    // be crushed (that is a *hue* the texture cannot survive), and the tint's
    // luminance may not halve the piece (that is a *shade* nobody would call
    // the same wood). A rule, so a fifth option cannot be eyeballed in.
    for (const category of CUSTOMISATION) {
      for (const option of category.options) {
        if (!option.tint) continue;
        const value = parseInt(option.tint.slice(1), 16);
        const [r, g, b] = [16, 8, 0].map((shift) => ((value >> shift) & 0xff) / 255);
        const where = `${category.id}/${option.id}`;
        expect(Math.min(r, g, b), where).toBeGreaterThan(0.45);
        expect(0.2126 * r + 0.7152 * g + 0.0722 * b, where).toBeGreaterThan(0.55);
      }
    }
  });
});
