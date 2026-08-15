/**
 * Cat catalog for Milestone 2: rarity tiers, breed definitions, and naming data.
 * All collection/balancing numbers live here — systems/ and ui/ only read them.
 */

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface RarityConfig {
  label: string;
  /** Relative adoption draw weight (gacha-lite, §5 — earned currency only). */
  weight: number;
  /**
   * How much this cat draws visitors/spend (§8). Common = 1 so a café of
   * commons behaves exactly like the M1 per-cat economy.
   */
  appeal: number;
  /** UI badge color for this tier. */
  badgeColor: string;
}

export const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

export const RARITY_CONFIG: Record<Rarity, RarityConfig> = {
  common: { label: "common", weight: 52, appeal: 1, badgeColor: "#8a6a52" },
  uncommon: { label: "uncommon", weight: 27, appeal: 1.5, badgeColor: "#5a8a5e" },
  rare: { label: "rare", weight: 13, appeal: 2.2, badgeColor: "#4a7ab5" },
  epic: { label: "epic", weight: 6, appeal: 3.2, badgeColor: "#8a5fb5" },
  legendary: { label: "legendary", weight: 2, appeal: 5, badgeColor: "#d9973f" },
};

export interface CatDefinition {
  id: string;
  /** Display breed name shown in the reveal card and cat-dex. */
  breed: string;
  rarity: Rarity;
  /** Warm, cosy palette — see §9. Fur color. */
  furColor: number;
  /** Accent color for ears/paws/tail tip. */
  accentColor: number;
  /** One line of personality flavour — deepens attachment (§8). */
  flavor: string;
}

export const CAT_DEFINITIONS: CatDefinition[] = [
  // Common
  { id: "marmalade", breed: "Marmalade Shorthair", rarity: "common", furColor: 0xd97b4f, accentColor: 0xffffff, flavor: "Believes every sunbeam was arranged personally." },
  { id: "cinnamon-tabby", breed: "Cinnamon Tabby", rarity: "common", furColor: 0x8a6a52, accentColor: 0x3a2a20, flavor: "Supervises the counter with great seriousness." },
  { id: "raincloud", breed: "Raincloud Grey", rarity: "common", furColor: 0xc9c9c9, accentColor: 0x6e6e6e, flavor: "Naps hardest when it drizzles outside." },
  { id: "butterscotch", breed: "Butterscotch", rarity: "common", furColor: 0xe8c39e, accentColor: 0xffffff, flavor: "Smells faintly of warm pastry. Nobody knows why." },
  { id: "tuxedo", breed: "Tuxedo", rarity: "common", furColor: 0x2f2f2f, accentColor: 0xffffff, flavor: "Dressed for an occasion that never quite arrives." },
  // Uncommon
  { id: "snowdrop", breed: "Snowdrop", rarity: "uncommon", furColor: 0xffffff, accentColor: 0xf2c9c9, flavor: "Tiptoes everywhere, even on carpet." },
  { id: "patchwork", breed: "Patchwork Calico", rarity: "uncommon", furColor: 0xe0975a, accentColor: 0x3a2a20, flavor: "No two naps in the same spot twice." },
  { id: "toasted-siamese", breed: "Toasted Siamese", rarity: "uncommon", furColor: 0xe8d8c0, accentColor: 0x6b4a3a, flavor: "Has opinions, and will share them at length." },
  { id: "espresso", breed: "Espresso", rarity: "uncommon", furColor: 0x241d19, accentColor: 0xcaa06a, flavor: "Wide awake at exactly the wrong hours." },
  // Rare
  { id: "honey-bengal", breed: "Honey Bengal", rarity: "rare", furColor: 0xd9a23f, accentColor: 0x8a5a20, flavor: "Moves like poured honey. Knocks nothing over. Ever." },
  { id: "smoked-blue", breed: "Smoked Blue", rarity: "rare", furColor: 0x7d8a9a, accentColor: 0xdfe8f0, flavor: "Regulars swear her purr sounds like rain on a roof." },
  { id: "cocoa-ragdoll", breed: "Cocoa Ragdoll", rarity: "rare", furColor: 0xbfa08a, accentColor: 0x5a4030, flavor: "Goes completely limp when happy, which is always." },
  // Epic
  { id: "moonlit-silver", breed: "Moonlit Silver", rarity: "epic", furColor: 0xdfe4ec, accentColor: 0x9aa8c0, flavor: "Fur catches the light like frost on a window." },
  { id: "twilight-persian", breed: "Twilight Persian", rarity: "epic", furColor: 0x8a7ab5, accentColor: 0xe8dff5, flavor: "Appears in doorways without ever seeming to walk." },
  // Legendary
  { id: "golden-mochi", breed: "Golden Mochi", rarity: "legendary", furColor: 0xf2c464, accentColor: 0xfff2d0, flavor: "Old regulars say the café was built around this cat." },
  { id: "sakura-spirit", breed: "Sakura Spirit", rarity: "legendary", furColor: 0xf5cdd6, accentColor: 0xfff5f8, flavor: "Petals drift in when she naps by the door." },
];

/** The cat every new café opens with. */
export const STARTER_CAT_ID = "marmalade";

const DEFINITIONS_BY_ID = new Map(CAT_DEFINITIONS.map((d) => [d.id, d]));

export function catDefinition(id: string): CatDefinition {
  const def = DEFINITIONS_BY_ID.get(id);
  // Saves must survive content changes (§8 "never lose a player's cats") —
  // an unknown id falls back to the starter breed rather than crashing.
  return def ?? DEFINITIONS_BY_ID.get(STARTER_CAT_ID)!;
}

/** Combined visitor appeal of a set of owned cats. */
export function totalAppeal(definitionIds: string[]): number {
  return definitionIds.reduce(
    (sum, id) => sum + RARITY_CONFIG[catDefinition(id).rarity].appeal,
    0,
  );
}

/** Cosy default names offered in the naming flow — the player can always type their own. */
/**
 * **Lowercase, like everything else the game writes** (Ellis, 2026-08-14).
 *
 * §9's exception is for names the *player* types — those keep their capitals
 * untouched, and that rule is unchanged. These are not that: they are the
 * game's own suggestions, so they speak in the game's own voice. A capitalised
 * default also quietly implies capitals are expected, which is the opposite of
 * the register the rest of the interface sets.
 */
export const NAME_SUGGESTIONS = [
  "biscuit", "mochi", "clover", "ember", "pepper", "hazel",
  "waffles", "maple", "poppy", "olive", "toast", "juniper",
  "pudding", "nutmeg", "willow", "crumpet", "fig", "marble",
];

/** First suggestion not already used by an owned cat (wraps around if all taken). */
export function suggestName(takenNames: string[]): string {
  const taken = new Set(takenNames.map((n) => n.toLowerCase()));
  for (const name of NAME_SUGGESTIONS) {
    if (!taken.has(name.toLowerCase())) return name;
  }
  return NAME_SUGGESTIONS[takenNames.length % NAME_SUGGESTIONS.length];
}
