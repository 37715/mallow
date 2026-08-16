import type { CatDefinition } from "@/data/cats";

/**
 * A little drawn face for every breed.
 *
 * **This replaced a coloured circle with a dot on it.** That circle was written
 * as "the placeholder portrait until real cat art lands", and the cat pack has
 * not been released — Ellis, 2026-08-26: *"lets give up waiting for the
 * released cat pack. create all the little cat faces for the icons."* A
 * collection game's whole hook is that the things you collect are individuals
 * (§8), and sixteen identical discs with different fills is the opposite of
 * that: it says the breeds differ by a hex code.
 *
 * ## Drawn to §9's rules, with one deliberate exception
 *
 * Solid shapes, no hairlines, nothing below ~1.5px, closed paths — the ears
 * are closed triangles because an open stroked path fills across the shortest
 * line and turns a pair of ears into a bow tie, which §9 recorded the last time
 * somebody drew a cat here.
 *
 * The exception is **colour**: the icon set is `currentColor` only so one glyph
 * works on a slate chip and a honey button, but these are *portraits*. Fur,
 * markings and eyes each carry the breed's own palette, which is the entire
 * point of them.
 *
 * ## Markings are what make them tell apart
 *
 * A tuxedo and an espresso are both near-black; a marmalade and a butterscotch
 * are both warm cream. At 50px the fur colour alone does not separate them, so
 * every breed carries a `pattern` and that is what the eye actually reads.
 */

/** Fixed drawing box. Everything below is in these coordinates. */
const BOX = 48;

/** Warm amber, the default for a cat that does not say otherwise. */
const DEFAULT_EYES = 0x6f4a1f;

function hex(value: number): string {
  return `#${value.toString(16).padStart(6, "0")}`;
}

/**
 * Slightly darker than the fur, for markings on a cat whose accent is lighter
 * than its coat — a white-accented ginger needs *some* contrast on its face,
 * and using the accent would draw white stripes on orange.
 */
function shade(value: number, amount: number): string {
  const r = Math.round(((value >> 16) & 255) * (1 - amount));
  const g = Math.round(((value >> 8) & 255) * (1 - amount));
  const b = Math.round((value & 255) * (1 - amount));
  return `rgb(${r}, ${g}, ${b})`;
}

/** Perceived lightness, for deciding whether a marking should darken or lift. */
function lightness(value: number): number {
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function svg(children: string): SVGElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  node.setAttribute("viewBox", `0 0 ${BOX} ${BOX}`);
  node.setAttribute("class", "cat-face");
  node.innerHTML = children;
  return node;
}

/**
 * The markings. Each returns shapes drawn *over* the head, clipped to it.
 *
 * Keep them bold: at 50px a subtle marking is no marking, and the job here is
 * telling sixteen breeds apart at a glance.
 */
function markings(definition: CatDefinition, mark: string): string {
  switch (definition.pattern ?? "solid") {
    case "tabby":
      // Forehead stripes and cheek bars — the thing everyone draws when they
      // draw a tabby.
      return `
        <path d="M24 6.5 L21.4 12.2 L24 10.6 L26.6 12.2 Z" fill="${mark}"/>
        <path d="M16.6 9.4 L14.6 14.4 L17.4 12.4 Z" fill="${mark}"/>
        <path d="M31.4 9.4 L33.4 14.4 L30.6 12.4 Z" fill="${mark}"/>
        <rect x="5.5" y="24" width="7" height="2.6" rx="1.3" fill="${mark}"/>
        <rect x="35.5" y="24" width="7" height="2.6" rx="1.3" fill="${mark}"/>
      `;
    case "spotted":
      return `
        <circle cx="14.5" cy="14" r="2.5" fill="${mark}"/>
        <circle cx="33.5" cy="14" r="2.5" fill="${mark}"/>
        <circle cx="10.5" cy="24" r="2.1" fill="${mark}"/>
        <circle cx="37.5" cy="24" r="2.1" fill="${mark}"/>
        <circle cx="24" cy="9.5" r="2.2" fill="${mark}"/>
      `;
    case "tuxedo":
      // A white bib and chin. The shape is what says "tuxedo" — a dinner
      // jacket rather than a patch.
      return `
        <path d="M24 27 C29.5 27 33 30.5 33.6 36.6 C30.6 39.6 27.4 41 24 41
                 C20.6 41 17.4 39.6 14.4 36.6 C15 30.5 18.5 27 24 27 Z"
              fill="${hex(definition.accentColor)}"/>
      `;
    case "patch":
      // Calico: one bold patch over an ear and eye, deliberately asymmetric.
      return `
        <path d="M24 4 C31 4 36.5 7.4 39.6 13.4 C36 19 30.6 21.4 24 21.4 Z"
              fill="${hex(definition.accentColor)}"/>
        <circle cx="13" cy="30" r="4.6" fill="${hex(definition.accentColor)}" opacity="0.75"/>
      `;
    case "points":
      // Siamese: dark mask and ears against a pale coat.
      return `
        <ellipse cx="24" cy="30" rx="11" ry="8.4" fill="${hex(definition.accentColor)}" opacity="0.9"/>
      `;
    default:
      return "";
  }
}

/**
 * One breed's face.
 *
 * @param unknown draw it as an undiscovered silhouette for the cat-dex.
 */
export function catFace(definition: CatDefinition, unknown = false): SVGElement {
  if (unknown) {
    return svg(`
      <path d="M9.5 20 L7 7.5 L18 13.5 A18 18 0 0 1 30 13.5 L41 7.5 L38.5 20
               A17.5 17.5 0 1 1 9.5 20 Z" fill="currentColor" opacity="0.16"/>
      <text x="24" y="31" text-anchor="middle" font-size="17" font-weight="700"
            fill="currentColor" opacity="0.5">?</text>
    `);
  }

  const fur = hex(definition.furColor);
  const pale = lightness(definition.furColor) > 0.62;
  // A marking has to be visible against the coat: darken a pale cat, and use
  // the accent on a dark one only when the accent is actually lighter.
  const mark = pale
    ? shade(definition.furColor, 0.34)
    : lightness(definition.accentColor) > lightness(definition.furColor)
      ? hex(definition.accentColor)
      : shade(definition.furColor, 0.32);
  const inner = hex(definition.accentColor);
  const eyes = hex(definition.eyes ?? DEFAULT_EYES);
  const clip = `cat-clip-${definition.id}`;

  return svg(`
    <defs>
      <clipPath id="${clip}">
        <path d="M9.5 20 L7 7.5 L18 13.5 A18 18 0 0 1 30 13.5 L41 7.5 L38.5 20
                 A17.5 17.5 0 1 1 9.5 20 Z"/>
      </clipPath>
    </defs>

    <!-- Head and ears as one closed outline: the ears are part of the
         silhouette rather than shapes stuck on it, which is what stops the
         joins showing at small sizes. -->
    <path d="M9.5 20 L7 7.5 L18 13.5 A18 18 0 0 1 30 13.5 L41 7.5 L38.5 20
             A17.5 17.5 0 1 1 9.5 20 Z" fill="${fur}"/>

    <!-- Inner ears. Closed triangles, kept clear of the centre. -->
    <path d="M11.4 11.6 L16.6 14.6 L12.6 17.4 Z" fill="${inner}"/>
    <path d="M36.6 11.6 L31.4 14.6 L35.4 17.4 Z" fill="${inner}"/>

    <g clip-path="url(#${clip})">${markings(definition, mark)}</g>

    <!-- Eyes. Tall ovals with a highlight, which is most of what makes a
         drawn animal look alive rather than stamped. -->
    <ellipse cx="17.4" cy="25.6" rx="3.5" ry="4.2" fill="${eyes}"/>
    <ellipse cx="30.6" cy="25.6" rx="3.5" ry="4.2" fill="${eyes}"/>
    <circle cx="18.7" cy="24" r="1.25" fill="#fff" opacity="0.9"/>
    <circle cx="31.9" cy="24" r="1.25" fill="#fff" opacity="0.9"/>

    <!-- Nose and mouth. The mouth is two arcs, not a stroke across the face. -->
    <path d="M24 31.4 L21.6 33.2 L26.4 33.2 Z" fill="#c9748a"/>
    <path d="M24 34 C24 36.2 21.4 36.6 20.2 35.2" fill="none" stroke="${shade(definition.furColor, 0.45)}"
          stroke-width="1.5" stroke-linecap="round"/>
    <path d="M24 34 C24 36.2 26.6 36.6 27.8 35.2" fill="none" stroke="${shade(definition.furColor, 0.45)}"
          stroke-width="1.5" stroke-linecap="round"/>
  `);
}
