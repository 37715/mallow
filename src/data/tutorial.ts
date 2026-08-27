import type { ExpressionName } from "@/entities/character-face";
import type { Appearance } from "@/entities/character-library";
import { CAFE_LAYOUT } from "@/data/cafe-layout";
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
 *
 * **Three exports are the whole of this file's surface** —
 * `TUTORIAL_SCRIPT`, `GUIDE_APPEARANCE`, `GUIDE_NAME`. Nothing outside knows
 * who the guide is or what she says, which is what let a second guide be
 * swapped in for a build and out again without touching another file.
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
   * The line is said, then the bubble holds `waitHint` and the guide stands
   * about until `systems/tutorial.ts` says the task is done. The till is topped
   * up to exactly what the step costs as it begins, so nothing they ask for is
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
export const MAL_SCRIPT: TutorialLine[] = [
  {
    text: "oh — you must be {name}!",
    gesture: "Social_WaveHello",
    expression: "delighted",
    holdMs: 300,
  },
  {
    text: "i'm mal. i live nearby, and i've been hoping someone would open this place back up.",
    gesture: "Social_Relaxed",
    expression: "happy",
  },
  {
    text: "{cafe}. that's a good name. it suits the room.",
    gesture: "Social_Stand_Discussion_1",
    expression: "content",
  },
  {
    text: "so — people wander in, sit down, order something warm, and pay you for it. that's the whole thing.",
    gesture: "Social_Stand_Discussion_2",
    expression: "content",
  },

  // --- 1. a cat bed ---------------------------------------------------------
  //
  // Beds first, because a bed is the *right* to adopt (§0, 2026-08-22) — so
  // this step is what makes the next one possible, and the player finds that
  // out by doing it rather than by being told.
  {
    text: "ok. a cat needs a bed of its own before it'll move in, so your café holds as many cats as it has beds. let's get you a second one.",
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
    text: "now put it down somewhere. the middle of the room works — cats like to be where everything is.",
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
    text: "go ahead. you never know which one you'll get — that's the fun of it.",
    gesture: "Social_Relaxed",
    expression: "cheeky",
    task: "adopt",
    waitHint: "tap “adopt a cat” at the bottom",
  },
  {
    text: "oh, look at them. give them a silly name — you'll be saying it for months.",
    gesture: "Social_Jump_Joy",
    expression: "love",
    holdMs: 500,
  },
  {
    text: "and stop to pet them sometimes. they like it, and a happy cat is worth more to this café than any amount of furniture.",
    gesture: "Social_Relaxed_ListeningNod",
    expression: "love",
  },

  // --- 3. a piece of furniture ----------------------------------------------
  //
  // **Furniture before the menu** (Ellis, 2026-08-27: *"id prefer to learn to
  // place furniture before learning about the custom coffee thing"*). Right,
  // and for a reason worth writing down: buying-and-placing is the *verb* of
  // this game — §8's whole editor plan rests on it — while inventing a blend is
  // a lovely aside in a panel. The introduction should hand over the thing the
  // player will do a hundred times before the thing they will do four times.
  //
  // It also makes the two halves rhyme: the cat bed taught buy-then-place, and
  // this is the same pair of steps on a piece of furniture, immediately after,
  // while it is still fresh.
  {
    text: "next. everything you put down makes the room nicer, and nicer brings more people in.",
    gesture: "Social_Relaxed_Thinking",
    expression: "content",
  },
  {
    text: "and nobody stays long without somewhere to sit. go get that armchair.",
    gesture: "Social_Stand_Discussion_1",
    expression: "happy",
    task: "buy-chair",
    waitHint: "shop → comfort → armchair",
  },
  {
    text: "by the window is nice. green means it fits, red means move it a bit.",
    gesture: "Social_Relaxed",
    expression: "content",
    task: "place-chair",
    waitHint: "drag it, then tap the tick",
  },
  {
    text: "that's the whole game, really. buy a thing, put it where you want, watch the place fill up.",
    gesture: "Social_ThumbsUp",
    expression: "happy",
  },

  // --- 4. a drink -----------------------------------------------------------
  //
  // Free, deliberately — `store.createBlend` charges nothing and that must not
  // change. It is the first thing in the game the player *authors*, which is
  // why it belongs in the introduction at all rather than being discovered
  // later; it goes last because it is the least urgent of the four.
  {
    text: "last thing — the menu. you can invent your own drink: a base, something stirred into it, and a name you pick.",
    gesture: "Social_CrossedArms_Thinking",
    expression: "thinking",
  },
  // The free add-in is a real rule, not a tutorial handout — see
  // `firstIngredientIsFree`. Without it this step is a dead end for anyone who
  // just spent everything on the bed, which is everyone.
  {
    text: "your first flavour is free. pick one you like the sound of.",
    gesture: "Social_Stand_Discussion_1",
    expression: "happy",
    task: "pick-ingredient",
    waitHint: "café → the menu → the cabinet",
  },
  {
    text: "nice. now stir it into something and give it a name — inventing is always free.",
    gesture: "Social_Stand_Discussion_2",
    expression: "happy",
    task: "invent-drink",
    waitHint: "café → the menu → invent a blend",
  },
  // **"straight on the board" was a step too clever** (Ellis, 2026-08-27:
  // *"sounds weird it should just be on the menu"*). There *is* a chalkboard on
  // the wall, so it read as a reference to a thing — except the board is a
  // décor item you may not have bought, the drink does not appear on it, and
  // the player has just been told the word "menu" twice. Say the word they
  // already know.
  {
    text: "lovely. that's on your menu now — the better it gets, the more people pay.",
    gesture: "Social_Stand_YES",
    expression: "delighted",
  },

  // --- out ------------------------------------------------------------------
  {
    text: "that's it. no rush, nothing to lose — it'll all still be here tomorrow.",
    gesture: "Social_Relaxed",
    expression: "content",
  },
  // **The gift is announced here and paid when she leaves** — see
  // `ECONOMY_CONFIG.welcomeGift` and `store.finishTutorial`. Said rather than
  // silently deposited, because a till that is suddenly a thousand up with
  // nobody having mentioned it reads as a bug, not a present.
  {
    text: "oh — before i forget. here's a little something to start you off. go and buy something lovely with it.",
    gesture: "Social_ThumbsUp",
    expression: "delighted",
  },
  {
    text: "i'll take a coffee when you have a minute. see you soon, {name}.",
    gesture: "Social_WaveBye",
    expression: "cheeky",
    holdMs: 600,
  },
];

/** What Mal is called. She introduces herself in the second line. */
export const MAL_NAME = "mal";

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
export const MAL_APPEARANCE: Appearance = {
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

/**
 * The three names anything outside this file reads.
 *
 * **There was a branch here and there is not any more** (2026-08-27). For one
 * build in August the guide was Ellis rather than Mal, chosen by a
 * `const ANNIVERSARY` flag with a second script and a second appearance sitting
 * beside hers. Ellis: *"put the old tutorial back, no more anniversary
 * stuff."* Both are deleted rather than switched off — a dead branch in a data
 * file is a thing every future reader has to decide is dead — and the build
 * that used them is in the history and in `docs/session-log.md` (2026-08-22),
 * which is where a keepsake belongs.
 */
export const TUTORIAL_SCRIPT: TutorialLine[] = MAL_SCRIPT;
export const GUIDE_APPEARANCE: Appearance = MAL_APPEARANCE;
export const GUIDE_NAME = MAL_NAME;

/**
 * Where the walkthrough puts each piece's ghost when it is bought.
 *
 * Ellis, 2026-08-27: *"id like if it could kinda force the chair to be placed
 * by the window and the cat bed more in the middle so it actually looks good
 * after completing tutorial instead of looking messy where u cant place in a
 * good spot as mal is stood in the way."*
 *
 * **"Kinda force" is the right amount, and it is a suggestion rather than a
 * lock.** The ghost simply *starts* here instead of under the camera, and the
 * player can drag it anywhere they like before tapping the tick. Anything
 * stronger would be the game placing furniture for you, which is precisely
 * what Ellis asked to stop on 2026-08-07 — *"when i buy something i dont want
 * it to place it for me i should be able to choose where it goes"* — and that
 * still stands **outside the walkthrough**, where the ghost keeps starting at
 * whatever you are looking at. The first five minutes are the exception: a
 * café that looks composed when the guide leaves is worth more than a lesson
 * in dragging, and the player gets to do the dragging four more times anyway.
 *
 * Both keys per piece, because the ghost appears the moment it is **bought** —
 * before the guide has advanced to the "now put it down" line — so keying only
 * the `place-*` task would suggest nothing at the one moment it is needed.
 */
const armchair = CAFE_LAYOUT.find((piece) => piece.id === "armchair");

/**
 * The armchair goes back where the reference render has it: by the window.
 *
 * **Read from the layout rather than written down.** §8's shop trick is that
 * every catalogue item names a piece at its authored position, so "the diorama
 * is the destination" — and the authored position *is* the composition Ellis
 * is asking for. Copying the numbers here would be a second copy of the truth
 * that goes stale the first time the layout is nudged (§14).
 */
const CHAIR_SPOT = { x: armchair?.x ?? 1.27, z: armchair?.z ?? -1.09 };

/**
 * The bed goes in the middle of the open floor — which is **not** the middle of
 * the room, because the counter owns that.
 *
 * Measured against the placement validator rather than guessed: of every grid
 * position a cat bed fits in a bare café, this is the one closest to the centre
 * of the floor a player can actually use, and it stays clear of where the
 * armchair lands two steps later.
 */
const BED_SPOT = { x: 0.5, z: 0 };

export const TUTORIAL_SPOTS: Partial<Record<TaskId, { x: number; z: number }>> = {
  "buy-bed": BED_SPOT,
  "place-bed": BED_SPOT,
  "buy-chair": CHAIR_SPOT,
  "place-chair": CHAIR_SPOT,
};

/** Fills `{name}` and `{cafe}` in a line. */
export function fillLine(text: string, names: { name: string; cafe: string }): string {
  return text
    .replaceAll("{name}", names.name || "you")
    .replaceAll("{cafe}", names.cafe || "this place");
}
