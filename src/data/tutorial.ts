import type { ExpressionName } from "@/entities/character-face";
import type { Appearance } from "@/entities/character-library";
import type { TaskId } from "@/systems/tutorial";

/**
 * The guide who shows you round on your first morning (§0, "the story-mode
 * tutorial friend").
 *
 * Ellis floated this in August — *"a character who appears at the start and
 * talks in a classic speech bubble with text typing out"* — and it was parked
 * because the character pack had no talking in it. The Lip Sync and
 * Expressions pack is what unblocked it: the mouth shapes and the social
 * gestures are the whole performance.
 *
 * **It teaches by talking, and gates nothing.** Pillar 1 forbids pressure, and
 * a tutorial that locks the interface until you tap the thing it wants is
 * pressure — it is also the single most common way a cosy game loses somebody
 * in the first minute. Every line can be skipped, the café runs underneath it,
 * and nothing waits on the player doing as they're told.
 *
 * The script is data so lines are content rather than code (§8's rule for
 * events, which applies just as well here). `{name}` and `{cafe}` are filled
 * in from the profile, so the guide uses the names the player just chose —
 * which is most of what makes it feel written for them.
 */

export interface TutorialLine {
  text: string;
  /** A `Social_*` clip, played as the line starts. */
  gesture?: string;
  /** The mood worn while saying it. Defaults to whatever the last line left. */
  expression?: ExpressionName;
  /** Extra beat after the line finishes, in ms — for the ones that want it. */
  holdMs?: number;
  /**
   * Wait here until the player does this, instead of moving on by itself.
   *
   * The line is said, then the bubble holds `waitHint` and Mal stands about
   * until `systems/tutorial.ts` says the task is done. The till is topped up
   * to exactly what the step costs as it begins, so nothing she asks for is
   * ever unaffordable.
   */
  task?: TaskId;
  /** Shown in the bubble while waiting, in place of "tap to continue". */
  waitHint?: string;
}


/**
 * Lowercase, like every other word the interface says (§9). The exceptions are
 * the two placeholders, because those are text the *player* wrote.
 */
export const TUTORIAL_SCRIPT: TutorialLine[] = [
  {
    text: "oh — you must be {name}!",
    gesture: "Social_WaveHello",
    expression: "delighted",
    holdMs: 300,
  },
  {
    text: "i'm mal. i live just up the road, and i've been waiting for someone to open this place back up.",
    gesture: "Social_Relaxed",
    expression: "happy",
  },
  {
    text: "{cafe}. it's a lovely name. it suits the room.",
    gesture: "Social_Stand_Discussion_1",
    expression: "content",
  },
  {
    text: "so — people wander in, they sit down, they order something warm, and they pay you for it. that's the whole of it, really.",
    gesture: "Social_Stand_Discussion_2",
    expression: "content",
  },

  // --- 1. a cat bed ---------------------------------------------------------
  //
  // Beds first, because a bed is the *right* to adopt (§0, 2026-08-22) — so
  // this step is what makes the next one possible, and the player finds that
  // out by doing it rather than by being told.
  {
    text: "right. a cat needs a bed of its own before it'll move in, so a café holds as many cats as it has beds. let's get you a second one.",
    gesture: "Social_Relaxed_Thinking",
    expression: "thinking",
  },
  {
    text: "here — this is on me. open the shop and find the cat beds.",
    gesture: "Social_Stand_Discussion_1",
    expression: "happy",
    task: "buy-bed",
    waitHint: "shop → for the cats → cat bed",
  },
  // **Buying and putting down are two steps**, because they are two things the
  // player has to learn and because the game genuinely treats them separately.
  // Folding them together is what let Mal leave with the ghost still in hand.
  {
    text: "now drop it somewhere. middle of the room is grand — cats like to be where everything is.",
    gesture: "Social_Stand_Discussion_2",
    expression: "content",
    task: "place-bed",
    waitHint: "drag it, then tap the tick",
  },
  {
    text: "there. now there's a spare bed, and a spare bed means a spare cat.",
    gesture: "Social_ThumbsUp",
    expression: "delighted",
  },

  // --- 2. a cat -------------------------------------------------------------
  {
    text: "go on then. you never know which one you'll get, and that's rather the point.",
    gesture: "Social_Relaxed",
    expression: "cheeky",
    task: "adopt",
    waitHint: "tap “adopt a cat” at the bottom",
  },
  {
    text: "oh, look at them. name them something daft — you'll be saying it for months.",
    gesture: "Social_Jump_Joy",
    expression: "love",
    holdMs: 500,
  },
  {
    text: "and do stop and stroke them. they like it, and a happy cat is worth more to this café than any amount of furniture.",
    gesture: "Social_Relaxed_ListeningNod",
    expression: "love",
  },

  // --- 3. a drink -----------------------------------------------------------
  //
  // Free, deliberately — `store.createBlend` charges nothing and that must not
  // change. It is also the first thing in the game the player *authors*, which
  // is why it belongs in the introduction rather than being discovered later.
  {
    text: "now the menu. you can invent your own drink, you know — a base, something stirred into it, and a name of your choosing.",
    gesture: "Social_CrossedArms_Thinking",
    expression: "thinking",
  },
  // The free add-in is a real rule, not a tutorial handout — see
  // `firstIngredientIsFree`. Without it this step is a dead end for anyone who
  // just spent everything on the bed, which is everyone.
  {
    text: "your first flavour's on the house. go and pick one you like the sound of.",
    gesture: "Social_Stand_Discussion_1",
    expression: "happy",
    task: "pick-ingredient",
    waitHint: "café → the menu → the cabinet",
  },
  {
    text: "lovely. now stir it into something and give it a name — inventing costs nothing, it never will.",
    gesture: "Social_Stand_Discussion_2",
    expression: "happy",
    task: "invent-drink",
    waitHint: "café → the menu → invent a blend",
  },
  {
    text: "ha — that's going straight on the board. the fuller your menu reads, the more people pay.",
    gesture: "Social_Stand_YES",
    expression: "delighted",
  },

  // --- 4. a piece of furniture ---------------------------------------------
  {
    text: "last thing. everything you put down makes the room lovelier, and lovelier brings more people through the door.",
    gesture: "Social_Relaxed_Thinking",
    expression: "content",
  },
  {
    text: "and nobody stops long without somewhere to sit. go and get that armchair.",
    gesture: "Social_Stand_Discussion_1",
    expression: "happy",
    task: "buy-chair",
    waitHint: "shop → comfort → armchair",
  },
  {
    text: "by the window, i'd say. green means it fits, red means try an inch to the left.",
    gesture: "Social_Relaxed",
    expression: "content",
    task: "place-chair",
    waitHint: "drag it, then tap the tick",
  },
  {
    text: "that's the whole game, that. buy a thing, put it where you want it, watch the place fill up.",
    gesture: "Social_ThumbsUp",
    expression: "happy",
  },

  // --- out ------------------------------------------------------------------
  {
    text: "that's it. no rush, nothing to lose — it'll all still be here tomorrow.",
    gesture: "Social_Relaxed",
    expression: "content",
  },
  {
    text: "i'll have a flat white when you've a minute. see you soon, {name}.",
    gesture: "Social_WaveBye",
    expression: "cheeky",
    holdMs: 600,
  },
];

/** What the guide is called. She introduces herself in the second line. */
export const GUIDE_NAME = "mal";

/**
 * Mal's look, fixed rather than random.
 *
 * She is a *character*, not a customer, so she has to be recognisable if she
 * ever comes back as a regular — which is the obvious next thing to do with
 * her. Values are indices into the slot lists in `character-library.ts`.
 *
 * **Long curly hair and olive skin, on Ellis's instruction.** The first pass
 * gave her `Hair_Shave_AfroTop`, which is an afro over *shaved sides* — it
 * read masculine at the size she appears on screen, which is not what was
 * asked for. `Hair_Long` is the long style, and it keeps the two curly options
 * in the creator that finding it added.
 *
 * Skintone 2 is the olive of the pack's six (measured face colour ~202,176,115
 * — see the 2026-08-25 log), rather than the 4 she had, which is a deep brown.
 */
export const GUIDE_APPEARANCE: Appearance = {
  hair: 2, // Hair_Long
  top: 2, // Clothes_Top_Hoodie
  legs: 2, // Clothes_Legs_Skirt
  held: 0, // held_Coffee_Full — she's brought her own
  skintone: 2, // the olive one
  hairColour: 8, // Haircolour_09, the darkest in the pack at (30,16,27)
  topColour: 0, // the dusty pink
  legColour: 1,
  shoeColour: 0,
};

/** Fills `{name}` and `{cafe}` in a line. */
export function fillLine(text: string, names: { name: string; cafe: string }): string {
  return text
    .replaceAll("{name}", names.name || "you")
    .replaceAll("{cafe}", names.cafe || "this place");
}
