import type { ChoreArt } from "@/data/chores";

/**
 * The little picture on a marker floating over a job — **the thing that needs
 * doing, drawn**.
 *
 * Ellis, 2026-08-17: *"the wipe floor, table, window need unique icons foreach
 * … look more colourful like show the object that needs cleaning in the icon
 * beautifully."* Three markers wearing the same sparkle said "something needs
 * doing, somewhere", which is precisely the fault that putting the marker on
 * the object was meant to cure — reintroduced one level up. Now the window
 * marker *is* a window and the floor marker *is* floorboards, so which job it
 * is arrives before you have read a word.
 *
 * ## These carry real colour, and that is a deliberate exception
 *
 * §9's icon rules — solid silhouettes, one 24×24 box, `currentColor` only —
 * exist so an icon works on a slate chip and on the honey button alike. These
 * are not icons under that rule; they are **portraits of café furniture**, the
 * same exception `ui/cat-face.ts` takes and for the same reason. A colourless
 * pane of glass is a rounded rectangle, and a colourless plank is a line.
 *
 * The palette is the café's own (`data/customisation.ts` swatches), so the
 * badge and the room agree: warm oak `#B5763F`, plaster `#EFD9BC`, walnut
 * `#6F4A32`. Where a piece has colourways the art stays on the **default**
 * finish rather than tracking the player's choice — it is a label for a job,
 * not a preview, and a marker that restyles itself is a marker you have to
 * re-learn.
 *
 * ## Drawing notes
 *
 * - **One 40×40 box, filled edge to edge.** A picture inset inside a badge
 *   reads as a sticker on a button; filling the tile makes the badge *be* the
 *   thing. The parent clips it to a rounded square.
 * - **Gradient ids must be unique per instance.** Two of these on screen at
 *   once — a chore and the tip jar — sharing an id means the second one silently
 *   repaints the first, because SVG ids are document-global however deeply
 *   they are nested.
 * - **No detail below ~1.5px at 26px on screen**, which is where these are
 *   actually seen. Every line here is at least 1 unit of 40, and the shine and
 *   crumbs are the first things to go if it ever gets smaller.
 */

const NS = "http://www.w3.org/2000/svg";

/** Café palette, taken from the customisation swatches so the two agree. */
const OAK = "#B5763F";
const OAK_LIGHT = "#CE9257";
const WALNUT = "#6F4A32";
const PLASTER = "#EFD9BC";
const SKY = "#BFD9E8";
const DAYLIGHT = "#FBF0D8";
const CREAM = "#E8DCC2";
const HONEY = "#E8A24A";

/** Document-global ids, so every gradient in every instance is its own. */
let serial = 0;

function svg(children: (id: string) => string): SVGElement {
  const node = document.createElementNS(NS, "svg");
  node.setAttribute("viewBox", "0 0 40 40");
  node.setAttribute("class", "chore-art");
  node.setAttribute("aria-hidden", "true");
  node.innerHTML = children(`ca${serial++}`);
  return node;
}

/**
 * The soft diagonal glint every one of these wears.
 *
 * It is what stops three flat tiles reading as three coloured squares — one
 * consistent light direction across the set says they belong together, and
 * it is the cheapest thing that makes a flat shape look like a surface.
 */
function shine(id: string): string {
  return `
    <linearGradient id="${id}-shine" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.34"/>
      <stop offset="0.45" stop-color="#fff" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>`;
}

/**
 * A pane of glass in its frame — the round-topped casement the café actually
 * has (§9: `_End_XL` is the sweeping arch, and the window under it is round).
 */
function windowArt(): SVGElement {
  return svg(
    (id) => `
    <defs>
      <linearGradient id="${id}-glass" x1="0.15" y1="0" x2="0.85" y2="1">
        <stop offset="0" stop-color="${DAYLIGHT}"/>
        <stop offset="0.55" stop-color="#EAF1F0"/>
        <stop offset="1" stop-color="${SKY}"/>
      </linearGradient>
      ${shine(id)}
    </defs>
    <rect width="40" height="40" fill="${PLASTER}"/>
    <!-- The frame: a tall arch, seated on a sill. -->
    <path d="M6 34 V16 A14 14 0 0 1 34 16 V34 Z" fill="${OAK}"/>
    <path d="M9 33 V16.4 A11 11 0 0 1 31 16.4 V33 Z" fill="url(#${id}-glass)"/>
    <!-- Glazing bars. Without them the pane is a coloured blob; they are most
         of what makes this read as a window at 26px. -->
    <path d="M19.2 6.2 V33 M9.6 20.5 H30.4" stroke="${OAK}" stroke-width="1.6"
          stroke-linecap="round" opacity="0.92"/>
    <path d="M9 33 V16.4 A11 11 0 0 1 31 16.4 V33 Z" fill="url(#${id}-shine)"/>
    <!-- The sill, which is also what stops the frame floating. -->
    <rect x="4" y="32.6" width="32" height="4.2" rx="1.6" fill="${WALNUT}"/>
    <rect x="4" y="32.6" width="32" height="1.5" rx="0.75" fill="${OAK_LIGHT}" opacity="0.7"/>`,
  );
}

/**
 * A café table from just above, with a cup on it.
 *
 * Seen from a raised three-quarter rather than flat-on, which is both how the
 * minigame frames it and the only view where a round table is not a circle.
 */
function tableArt(): SVGElement {
  return svg(
    (id) => `
    <defs>
      <linearGradient id="${id}-top" x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0" stop-color="${OAK_LIGHT}"/>
        <stop offset="1" stop-color="${OAK}"/>
      </linearGradient>
      ${shine(id)}
    </defs>
    <!-- **Plaster behind, not walnut.** The first version put a dark wood top
         on a dark wood ground and at 26px the whole tile was one brown mass —
         it read as a doughnut. A café table is a *silhouette*, and a silhouette
         needs something to be a silhouette against. -->
    <rect width="40" height="40" fill="${PLASTER}"/>
    <!-- Pedestal and foot, drawn first so the top overlaps them. Short and
         narrow: at this size the top is the recognisable part and the leg only
         has to say "this is furniture, not a plate". -->
    <rect x="18.4" y="23" width="3.2" height="9" fill="#8E5A32"/>
    <ellipse cx="20" cy="32.4" rx="6.4" ry="2.1" fill="${WALNUT}"/>
    <!-- The rim is a second ellipse under the top: that sliver of edge is what
         gives the tabletop thickness. -->
    <ellipse cx="20" cy="20.6" rx="16.5" ry="8.6" fill="#8E5A32"/>
    <ellipse cx="20" cy="18.8" rx="16.5" ry="8.6" fill="url(#${id}-top)"/>
    <!-- Grain, following the ellipse so it lies on the surface. -->
    <path d="M7 17.6 A16.5 8.6 0 0 0 33 17.6 M6.6 21.8 A16.5 8.6 0 0 0 33.4 21.8"
          stroke="${WALNUT}" stroke-width="0.8" fill="none" opacity="0.26"/>
    <!-- The cup: what a table is for, and it fixes the scale.

         **Tall enough to break the tabletop's back edge.** Sat low and centred
         it filled the middle of the ellipse and the whole thing read as a
         doughnut. A cup that rises past the far rim is unmistakably an object
         *standing on* a surface, which is the one thing the silhouette has to
         say at 26px. -->
    <path d="M15.1 12.2 v4.2 a5.4 2.9 0 0 0 10.8 0 v-4.2 Z" fill="${CREAM}"/>
    <path d="M25.9 13 a2.6 2.6 0 0 1 0 3.8" stroke="${CREAM}" stroke-width="1.5"
          fill="none" stroke-linecap="round"/>
    <ellipse cx="20.5" cy="12.2" rx="5.4" ry="2.8" fill="#F5EBD9"/>
    <ellipse cx="20.5" cy="12.3" rx="3.7" ry="1.85" fill="#7A5236"/>
    <ellipse cx="20" cy="18.8" rx="16.5" ry="8.6" fill="url(#${id}-shine)"/>
    <!-- Crumbs. The reason the job exists, so they have to be visible — and
         pale against the oak rather than dark, or they read as knots. -->
    <circle cx="10.8" cy="21.6" r="1.25" fill="#FBF1DC"/>
    <circle cx="29.2" cy="22.4" r="1.05" fill="#FBF1DC"/>
    <circle cx="25.4" cy="24.6" r="0.85" fill="#FBF1DC" opacity="0.9"/>`,
  );
}

/**
 * A patch of floorboards with a tuft of cat fur on it.
 *
 * Boards run on the diagonal rather than straight across: level planks in a
 * square box read as stripes, and the slight rake is also how the floor is
 * actually seen from the café's fixed camera.
 */
function floorArt(): SVGElement {
  return svg(
    (id) => `
    <defs>
      <linearGradient id="${id}-boards" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stop-color="${OAK_LIGHT}"/>
        <stop offset="1" stop-color="#A46833"/>
      </linearGradient>
      ${shine(id)}
    </defs>
    <rect width="40" height="40" fill="url(#${id}-boards)"/>
    <!-- Seams, and one short butt joint so the boards read as boards rather
         than as a ruled grid. -->
    <g stroke="${WALNUT}" stroke-width="1.1" opacity="0.42" stroke-linecap="round">
      <path d="M-2 12 L42 4"/>
      <path d="M-2 24 L42 16"/>
      <path d="M-2 36 L42 28"/>
    </g>
    <path d="M14 10.2 L14.8 22" stroke="${WALNUT}" stroke-width="0.9" opacity="0.3"/>
    <rect width="40" height="40" fill="url(#${id}-shine)"/>
    <!-- The fur tuft: soft, pale, and deliberately the only round thing here,
         so it separates from the straight boards instantly.

         **The stray hairs used to be three straight strokes** poking out at
         angles, and at 26px that is a starburst — the tile read as a cartoon
         sparkle sitting on a floor rather than as fluff. They are short curls
         hugging the body now, and only at the sides, where they widen the
         silhouette instead of spiking it. -->
    <g fill="#F2E8D8">
      <ellipse cx="20.5" cy="25.4" rx="7.8" ry="4.5"/>
      <ellipse cx="14.8" cy="23.4" rx="3.8" ry="2.8"/>
      <ellipse cx="26" cy="23" rx="3.4" ry="2.5"/>
      <ellipse cx="20.8" cy="21.4" rx="4.2" ry="2.6"/>
    </g>
    <g stroke="#F2E8D8" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.85">
      <path d="M11.6 22.4 q-2.4 -0.6 -3.2 -2.2"/>
      <path d="M29 21.6 q2.4 -0.5 3.3 -2"/>
    </g>
    <!-- A soft contact shadow, so the tuft sits *on* the boards. -->
    <ellipse cx="20.5" cy="29.6" rx="7.4" ry="1.5" fill="${WALNUT}" opacity="0.22"/>`,
  );
}

/** The tip jar, for the marker the counter puts up when it is full. */
function jarArt(): SVGElement {
  return svg(
    (id) => `
    <defs>
      <linearGradient id="${id}-glass" x1="0" y1="0" x2="1" y2="0.6">
        <stop offset="0" stop-color="#DCE9E4"/>
        <stop offset="1" stop-color="#BCD2CC"/>
      </linearGradient>
      ${shine(id)}
    </defs>
    <!-- A cooler ground than the other tiles: four badges in the same plaster
         cream would be four badges you have to read. -->
    <rect width="40" height="40" fill="#D8CDB4"/>
    <path d="M11 12 h18 v19 a4 4 0 0 1 -4 4 h-10 a4 4 0 0 1 -4 -4 Z"
          fill="url(#${id}-glass)"/>
    <!-- Coins, stacked and overlapping so it reads as full. -->
    <!-- Coins, stacked and overlapping so it reads as full. Each gets a
         darker under-edge, or a pile of flat ellipses is a puddle of honey. -->
    <g>
      <ellipse cx="20" cy="31" rx="7.4" ry="2.7" fill="#C8842F"/>
      <ellipse cx="20" cy="30.2" rx="7.4" ry="2.7" fill="${HONEY}"/>
      <ellipse cx="16.6" cy="27" rx="4.6" ry="2.3" fill="#C8842F"/>
      <ellipse cx="16.6" cy="26.3" rx="4.6" ry="2.3" fill="${HONEY}"/>
      <ellipse cx="23.8" cy="25.6" rx="4.6" ry="2.3" fill="#C8842F"/>
      <ellipse cx="23.8" cy="24.9" rx="4.6" ry="2.3" fill="${HONEY}"/>
    </g>
    <path d="M11 12 h18 v19 a4 4 0 0 1 -4 4 h-10 a4 4 0 0 1 -4 -4 Z"
          fill="url(#${id}-shine)"/>
    <rect x="9.5" y="9" width="21" height="4.4" rx="2.2" fill="${WALNUT}"/>
    <path d="M14.5 16 v13" stroke="#fff" stroke-width="1.6" opacity="0.45"
          stroke-linecap="round"/>`,
  );
}

/**
 * The till, drawn as its drawer sliding open with the takings in it.
 *
 * **The open drawer rather than the machine**, and the choice is the same one
 * the jar makes: this badge appears only when there is money to take, so it
 * should depict *the money*, not the furniture. A closed register is a picture
 * of a thing that is always there and says nothing about why it is asking.
 *
 * It also has to be distinguishable from the jar at 26px, and both are "a
 * container with coins in it" — so the two are separated by silhouette rather
 * than by contents: the jar is a tall glass, this is a wide box with a drawer
 * front breaking its bottom edge.
 */
function tillArt(): SVGElement {
  return svg(
    (id) => `
    <defs>${shine(id)}</defs>
    <!-- A cooler ground again, so four badges are told apart before they are
         read. Slate rather than the jar's grey-green. -->
    <rect width="40" height="40" fill="#C9C2B2"/>
    <!-- The body, sat high so the drawer has somewhere to come out. -->
    <path d="M7 9 h26 a2 2 0 0 1 2 2 v11 h-30 v-11 a2 2 0 0 1 2 -2 Z" fill="${WALNUT}"/>
    <!-- The screen: one lighter rectangle is all it takes to read as a till
         rather than as a crate. -->
    <rect x="10.5" y="11.5" width="12" height="7" rx="1" fill="#8FA8A0"/>
    <!-- Keys. Three dots, not a grid — a grid at this size is a texture. -->
    <circle cx="27" cy="13.5" r="1.5" fill="${OAK_LIGHT}"/>
    <circle cx="31" cy="13.5" r="1.5" fill="${OAK_LIGHT}"/>
    <circle cx="29" cy="17.5" r="1.5" fill="${OAK_LIGHT}"/>
    <!-- The open drawer, pulled forward and **breaking the tile's bottom
         edge**: a drawer floating inside the box reads as a second screen. -->
    <path d="M4 22 h32 v9 a2 2 0 0 1 -2 2 h-28 a2 2 0 0 1 -2 -2 Z" fill="${OAK}"/>
    <rect x="4" y="22" width="32" height="2.4" fill="${OAK_LIGHT}"/>
    <!-- Coins in the tray. Under-edges again, or they are a puddle. -->
    <g>
      <ellipse cx="13" cy="28.6" rx="5" ry="2.4" fill="#C8842F"/>
      <ellipse cx="13" cy="27.8" rx="5" ry="2.4" fill="${HONEY}"/>
      <ellipse cx="24.5" cy="29.4" rx="5" ry="2.4" fill="#C8842F"/>
      <ellipse cx="24.5" cy="28.6" rx="5" ry="2.4" fill="${HONEY}"/>
      <ellipse cx="20" cy="26" rx="4.2" ry="2.1" fill="#C8842F"/>
      <ellipse cx="20" cy="25.3" rx="4.2" ry="2.1" fill="${HONEY}"/>
    </g>
    <path d="M7 9 h26 a2 2 0 0 1 2 2 v11 h-30 v-11 a2 2 0 0 1 2 -2 Z"
          fill="url(#${id}-shine)"/>`,
  );
}

const ART: Record<string, () => SVGElement> = {
  window: windowArt,
  table: tableArt,
  floor: floorArt,
  jar: jarArt,
  till: tillArt,
};

/** Anything the marker can wear: a chore's subject, the tip jar, or the till. */
export type MarkArt = ChoreArt | "jar" | "till";

/**
 * Draw one. Unknown keys fall back to the floorboards rather than throwing —
 * a marker with no picture is unreachable, and losing the *right* picture is a
 * far smaller failure than losing the button.
 */
export function markArt(kind: MarkArt): SVGElement {
  return (ART[kind] ?? floorArt)();
}
