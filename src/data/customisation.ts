/**
 * Customisation — what the player is actually working towards (§0).
 *
 * With the venue ladder gone, progression is no longer "afford a bigger
 * building". It's "make this room lovelier": a new wall style, a different
 * sofa, a nicer rug. The pack ships three complete wall/floor styles and most
 * furniture in five or six colourways, so nearly all of this is a data change
 * rather than new art.
 *
 * Two gates on every option, and they do different jobs:
 *   - `unlock`  — a milestone. This is the *progression*: most of the menu is
 *                 closed on day one and opens as the café grows, so there's
 *                 always something visible to work toward.
 *   - `price`   — a cost in the till. This is the *reward*: something to spend
 *                 money on now that money is capped and readable.
 *
 * An option with `unlock: null` is available from the start.
 */

import type { CatInstance } from "@/state/store";
import type { UpgradeLevels } from "@/systems/upgrades";
import { levelOf } from "@/systems/upgrades";

/** What the player has to have done to see an option offered. */
export interface UnlockCondition {
  /** Shown on the locked row. Write it as the player's next step. */
  label: string;
  met: (progress: Progress) => boolean;
}

export interface Progress {
  cats: CatInstance[];
  upgrades: UpgradeLevels;
  /** Shop catalogue ids bought — how furnished the café is. */
  purchased: string[];
  /** Distinct breeds seen — rewards collecting rather than hoarding. */
  breedsDiscovered: number;
}

const catsAtLeast = (n: number): UnlockCondition => ({
  label: `Adopt ${n} cats`,
  met: (p) => p.cats.length >= n,
});

const breedsAtLeast = (n: number): UnlockCondition => ({
  label: `Discover ${n} breeds`,
  met: (p) => p.breedsDiscovered >= n,
});

const upgradeAtLeast = (id: "brews", n: number, label: string): UnlockCondition => ({
  label,
  met: (p) => levelOf(p.upgrades, id) >= n,
});

/** Furnishing the café is progression in its own right, now the shop is where
 *  appeal comes from — so the best colourways hang off it. */
const furnishedAtLeast = (n: number): UnlockCondition => ({
  label: `Add ${n} pieces of furniture`,
  met: (p) => p.purchased.length >= n,
});

export interface CustomisationOption {
  id: string;
  name: string;
  /** Swatch colour for the menu — approximates the asset's own palette. */
  swatch: string;
  price: number;
  unlock: UnlockCondition | null;
}

export interface CustomisationCategory {
  id: string;
  name: string;
  /** One line explaining what this changes, in the player's terms. */
  hint: string;
  options: CustomisationOption[];
}

export const CUSTOMISATION: CustomisationCategory[] = [
  // Walls and floor are **separate categories** as of 2026-08-06. They used to
  // be one "Walls & floor" style, and Ellis's verdict on it was right: "it
  // changes the window too. its too much it makes it not very customisable."
  // Mixing style B's floor with style A's walls is a valid combination the
  // pack supports — the flooring is its own mesh.
  //
  // **The window cannot be split off, and it is not an oversight.** Each style
  // ships exactly one window shape, baked into the wall piece itself
  // (`Wall_A_Window_Dark_Corner_End_XL`). There is no separate window mesh to
  // swap, so changing the walls necessarily changes the window. Splitting the
  // floor out is what makes that acceptable: the big surface can now change
  // without touching the window at all.
  {
    id: "walls",
    name: "The walls",
    hint: "Changes the window too — it is part of the wall.",
    options: [
      { id: "A", name: "Warm plaster", swatch: "#EFD9BC", price: 0, unlock: null },
      {
        id: "B",
        name: "Sage panelling",
        swatch: "#B9C4A6",
        price: 900,
        unlock: catsAtLeast(3),
      },
      {
        id: "C",
        name: "Deep walnut",
        swatch: "#8A6547",
        price: 2400,
        unlock: furnishedAtLeast(6),
      },
    ],
  },
  {
    id: "floor",
    name: "The floor",
    hint: "Boards underfoot, and the step outside.",
    // Cheaper and gentler than the walls: this is the surface the player will
    // most often be holding a finger on, so it wants to be the one that opens
    // up early rather than the one that stays shut.
    options: [
      { id: "A", name: "Warm oak", swatch: "#B5763F", price: 0, unlock: null },
      { id: "B", name: "Pale ash", swatch: "#C9AE86", price: 320, unlock: catsAtLeast(2) },
      {
        id: "C",
        name: "Dark walnut",
        swatch: "#6F4A32",
        price: 780,
        unlock: breedsAtLeast(4),
      },
    ],
  },
  {
    id: "sofa",
    name: "The sofa",
    hint: "Where the regulars settle in.",
    // Olive leads because it is the armchair in the reference render the room
    // is built from (`graphics/K9gvnT.png`) — the café should look right before
    // the player has changed a single thing.
    options: [
      { id: "Olive", name: "Olive", swatch: "#8A9A5B", price: 0, unlock: null },
      { id: "Cream", name: "Cream", swatch: "#E8DCC2", price: 180, unlock: catsAtLeast(2) },
      { id: "Blue", name: "Cornflower", swatch: "#7A9CC6", price: 260, unlock: catsAtLeast(3) },
      { id: "Red", name: "Poppy", swatch: "#C4564C", price: 340, unlock: breedsAtLeast(5) },
      {
        id: "Yellow",
        name: "Butter",
        swatch: "#E4C46A",
        price: 480,
        unlock: breedsAtLeast(8),
      },
    ],
  },
  {
    id: "carpet",
    name: "The rug",
    hint: "On the step, first thing anyone wipes their paws on.",
    options: [
      { id: "Small_Red", name: "Berry", swatch: "#B8514C", price: 0, unlock: null },
      { id: "Small_Cream", name: "Cream", swatch: "#E8DCC2", price: 120, unlock: null },
      { id: "Small_Green", name: "Fern", swatch: "#7F9A6B", price: 200, unlock: catsAtLeast(2) },
      {
        id: "Rectangle_Yellow",
        name: "Honey runner",
        swatch: "#DFB45A",
        price: 380,
        unlock: upgradeAtLeast("brews", 3, "Reach Better brews Lv 3"),
      },
      {
        id: "Large_Purple",
        name: "Plum",
        swatch: "#7E6390",
        price: 620,
        unlock: breedsAtLeast(6),
      },
    ],
  },
  {
    id: "catBed",
    name: "The cat bed",
    hint: "Somewhere soft to curl up.",
    options: [
      { id: "A_Cream", name: "Cream", swatch: "#E8DCC2", price: 0, unlock: null },
      { id: "A_Pink", name: "Blossom", swatch: "#E8A7B4", price: 90, unlock: null },
      { id: "A_Green", name: "Moss", swatch: "#7F9A6B", price: 150, unlock: catsAtLeast(2) },
      { id: "B_Blue", name: "Sky", swatch: "#7FA8C9", price: 240, unlock: catsAtLeast(4) },
      {
        id: "B_Orange",
        name: "Marmalade",
        swatch: "#DE8B4E",
        price: 360,
        unlock: breedsAtLeast(7),
      },
    ],
  },
];

/**
 * Appeal from colourways bought. Smallest of the lot — a nicer shade of sofa
 * is a real improvement but a quiet one — and it keeps the rule that anything
 * costing money moves appeal.
 */
export function styleAppeal(owned: string[]): number {
  return owned.length * 0.15;
}

/** What the café looks like right now. Keys are category ids. */
export type Customisation = Record<string, string>;

/** A layout piece the player can recolour. See `Placement.slot`. */
export type CustomisableSlot =
  | "floor"
  | "floorStep"
  | "wallPlain"
  | "wallWindow"
  | "sofa"
  | "carpet"
  | "catBed";

/**
 * Which menu a given piece of the room belongs to, so holding a finger on the
 * sofa can offer the sofa's colourways directly (§8 "The café editor").
 *
 * The floor slab and the entrance step share the `floor` category — they are
 * one surface as far as the player is concerned. The two wall pieces share
 * `walls`, and that pair necessarily carries the window with it.
 */
export const SLOT_CATEGORY: Record<CustomisableSlot, string> = {
  floor: "floor",
  floorStep: "floor",
  wallPlain: "walls",
  wallWindow: "walls",
  sofa: "sofa",
  carpet: "carpet",
  catBed: "catBed",
};

export const DEFAULT_CUSTOMISATION: Customisation = Object.fromEntries(
  CUSTOMISATION.map((category) => [category.id, category.options[0].id]),
);

export function categoryById(id: string): CustomisationCategory | undefined {
  return CUSTOMISATION.find((c) => c.id === id);
}

export function optionById(categoryId: string, optionId: string): CustomisationOption | undefined {
  return categoryById(categoryId)?.options.find((o) => o.id === optionId);
}

/** True when the milestone has been reached and the option can be bought. */
export function isUnlocked(option: CustomisationOption, progress: Progress): boolean {
  return option.unlock === null || option.unlock.met(progress);
}

/**
 * Whether the chosen wall style has the deep window ledge the window-seat
 * cushions perch on.
 *
 * Only style A does. B and C ship flat window walls, so the cushions marked
 * `onSill` in the layout would hang in mid-air against them and are left out
 * instead. If a future style gains a ledge, add it here.
 */
export function hasWindowSill(choice: Customisation): boolean {
  return (choice.walls ?? "A") === "A";
}

/**
 * Turn the player's choices into the asset names the room should be built
 * from. The layout asks for these by category rather than hard-coding a
 * colourway, so changing a sofa is one lookup rather than an edit.
 */
export function chosenAssets(choice: Customisation): Record<string, string> {
  const wall = choice.walls ?? "A";
  // Falls back to the wall style so a save written before floor was its own
  // category still resolves to the matching set (see save.ts v7 → v8).
  const floor = choice.floor ?? wall;
  return {
    floor: `Flooring_${floor}_Tiling`,
    // `Light` and `Dark` are **sides, not colours** — every wall piece ships
    // twice, authored for the −x edge of its tile and for the −z edge. Take the
    // one built for the side you want rather than rotating the other, which
    // turns it inside out. `_End_X` is a small rounded corner, `_End_XL` the
    // big sweeping arch. See cafe-layout.ts.
    wallPlain: `Wall_${wall}_Light_Corner_End_X`,
    wallWindow: `Wall_${wall}_Window_Dark_Corner_End_XL`,
    floorStep: `Flooring_${floor}_Entrance`,
    sofa: `Sofa_Single_${choice.sofa ?? "Cream"}`,
    carpet: `Carpet_${choice.carpet ?? "Small_Cream"}`,
    catBed: `Cat_Bed_${choice.catBed ?? "A_Cream"}`,
  };
}
