import type { CatDefinition } from "@/data/cats";

/**
 * A little face for every breed — **the cat that is actually in the room**.
 *
 * The first attempt at this invented markings: tabby stripes, a tuxedo bib,
 * calico patches, siamese points. Ellis's verdict was blunt and correct —
 * *"just make them the same as how they actually look in the model. nothing
 * fancy."* Inventing a second visual language for the same animal is worse
 * than no portrait: the cat on the card and the cat on the cushion stop being
 * the same creature, and in a collection game that is the one thing that has
 * to hold.
 *
 * So this is `entities/cat.ts`'s head, drawn flat, feature for feature:
 *
 * | model | here |
 * |---|---|
 * | skull sphere, scaled 1.15 wide | a slightly wide circle |
 * | cone ears, tilted out, accent inner | triangles at the same lean |
 * | accent muzzle, scaled 1.35 × 0.75 | a wide low oval |
 * | small dark nose cone | a small dark triangle |
 * | **closed ∩ eyes** — "cosy cats don't stare" | two arcs |
 * | blush spheres on the cheeks | two soft ovals |
 *
 * Breeds differ exactly as they do in the world: fur colour and accent colour,
 * nothing else. If the model gains a marking, add it *there* first and mirror
 * it here — never the other way round.
 */

/** Fixed drawing box. Everything below is in these coordinates. */
const BOX = 48;

function hex(value: number): string {
  return `#${value.toString(16).padStart(6, "0")}`;
}

/** Perceived lightness, for keeping the line work visible on any coat. */
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
 * One breed's face.
 *
 * @param unknown draw it as an undiscovered silhouette for the cat-dex.
 */
export function catFace(definition: CatDefinition, unknown = false): SVGElement {
  // The head outline, shared by the real portrait and the unknown silhouette
  // so a discovered cat is recognisably the shape that was hidden.
  const head = `M8.5 17.5 L10.5 7 L19 12.5 A17 15 0 0 1 29 12.5 L37.5 7 L39.5 17.5
                A16.5 15.5 0 1 1 8.5 17.5 Z`;

  if (unknown) {
    return svg(`
      <path d="${head}" fill="currentColor" opacity="0.16"/>
      <text x="24" y="32" text-anchor="middle" font-size="16" font-weight="700"
            fill="currentColor" opacity="0.5">?</text>
    `);
  }

  const fur = hex(definition.furColor);
  const accent = hex(definition.accentColor);
  // The eye arcs and nose have to read on a black cat and on a white one. The
  // model gets this for free from lighting; a flat drawing has to choose.
  const ink = lightness(definition.furColor) > 0.45 ? "#3a2a20" : "#f0e2d2";

  return svg(`
    <!-- Skull and ears as one closed outline, so the joins never show. The
         ears lean outward at the model's own angle. -->
    <path d="${head}" fill="${fur}"/>

    <!-- Inner ears, in the accent colour, as the model has them. -->
    <path d="M12.6 11 L17.6 14.2 L13.9 16.4 Z" fill="${accent}"/>
    <path d="M35.4 11 L30.4 14.2 L34.1 16.4 Z" fill="${accent}"/>

    <!-- The muzzle: wide, low, accent-coloured. This is what gives every
         breed its two-tone face in the world, and it is the single feature
         that makes the drawing read as *this* cat. -->
    <ellipse cx="24" cy="30.6" rx="9.6" ry="6" fill="${accent}"/>

    <!-- Blush, soft and low on the cheeks. -->
    <ellipse cx="12.8" cy="28.2" rx="3.6" ry="2.2" fill="#e08a8a" opacity="0.45"/>
    <ellipse cx="35.2" cy="28.2" rx="3.6" ry="2.2" fill="#e08a8a" opacity="0.45"/>

    <!-- **Closed, contented eyes.** Two arcs, exactly as the model has them:
         "cosy cats do not stare" -- see entities/cat.ts. Open eyes were the
         loudest thing wrong with the first version of this drawing. -->
    <path d="M14.6 24.4 A4.4 4.4 0 0 1 22.4 24.4" fill="none" stroke="${ink}"
          stroke-width="2.1" stroke-linecap="round"/>
    <path d="M25.6 24.4 A4.4 4.4 0 0 1 33.4 24.4" fill="none" stroke="${ink}"
          stroke-width="2.1" stroke-linecap="round"/>

    <!-- Nose, and the two little arcs of a closed mouth. -->
    <path d="M24 27.2 L21.7 29.1 L26.3 29.1 Z" fill="#b8607a"/>
    <path d="M24 29.6 C24 31.8 21.6 32.2 20.5 30.9" fill="none" stroke="${ink}"
          stroke-width="1.5" stroke-linecap="round" opacity="0.75"/>
    <path d="M24 29.6 C24 31.8 26.4 32.2 27.5 30.9" fill="none" stroke="${ink}"
          stroke-width="1.5" stroke-linecap="round" opacity="0.75"/>
  `);
}
