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

const upgradeAtLeast = (id: "decor" | "brews", n: number, label: string): UnlockCondition => ({
  label,
  met: (p) => levelOf(p.upgrades, id) >= n,
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
  {
    id: "walls",
    name: "Walls & floor",
    hint: "The whole room takes on a new character.",
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
        unlock: upgradeAtLeast("decor", 4, "Reach Cosy touches Lv 4"),
      },
    ],
  },
  {
    id: "sofa",
    name: "The sofa",
    hint: "Where the regulars settle in.",
    options: [
      { id: "Cream", name: "Cream", swatch: "#E8DCC2", price: 0, unlock: null },
      { id: "Olive", name: "Olive", swatch: "#8A9A5B", price: 180, unlock: catsAtLeast(2) },
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
    hint: "Ties the seating corner together.",
    options: [
      { id: "Small_Cream", name: "Cream", swatch: "#E8DCC2", price: 0, unlock: null },
      { id: "Small_Green", name: "Fern", swatch: "#7F9A6B", price: 120, unlock: null },
      { id: "Small_Red", name: "Berry", swatch: "#B8514C", price: 200, unlock: catsAtLeast(2) },
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

/** What the café looks like right now. Keys are category ids. */
export type Customisation = Record<string, string>;

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
 * Turn the player's choices into the asset names the room should be built
 * from. The layout asks for these by category rather than hard-coding a
 * colourway, so changing a sofa is one lookup rather than an edit.
 */
export function chosenAssets(choice: Customisation): Record<string, string> {
  const wall = choice.walls ?? "A";
  return {
    floor: `Flooring_${wall}_Tiling`,
    wallPlain: `Wall_${wall}_Light_Mid`,
    wallWindow: `Wall_${wall}_Window_Light_Mid`,
    sofa: `Sofa_Single_${choice.sofa ?? "Cream"}`,
    carpet: `Carpet_${choice.carpet ?? "Small_Cream"}`,
    catBed: `Cat_Bed_${choice.catBed ?? "A_Cream"}`,
  };
}
