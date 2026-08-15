/**
 * The icon set — drawn here, not borrowed.
 *
 * These replace the emoji that used to stand in for icons. Emoji are somebody
 * else's art in somebody else's style, they render differently on every
 * platform, and beside real typography they are the clearest amateur tell a UI
 * has — the same argument §9 makes about mixing asset packs.
 *
 * House style, so additions stay coherent:
 *
 * - **Solid silhouettes, not line art.** The café is chunky, soft and
 *   low-poly; hairline strokes would read as a different product. Where a
 *   stroke is unavoidable (a mug handle) it is heavy and round-capped.
 * - **24×24 box, ~2px of visual padding.** Every icon is drawn to fill the
 *   same optical area, so they sit evenly on a row without per-icon nudging.
 * - **`currentColor` only.** No icon carries its own colour; it inherits from
 *   whatever it sits on, which is what lets one icon work on both a slate chip
 *   and the honey button.
 *
 *   **A `<button>` does not inherit `color`.** The UA stylesheet sets it to
 *   `buttontext`, so an icon button that never declares one renders in the
 *   platform's default — black in Chrome, and *system blue on iOS*. That is
 *   exactly how the settings cog shipped blue on a slate pill (2026-08-13).
 *   Every button holding an icon must set `color` explicitly.
 * - **No detail below ~1.5px.** These are rendered at 18–22px on a phone.
 */

const ICONS: Record<string, string> = {
  /* A cat's head. Ears are strokes as well as fills so the points round off
     rather than coming to a sharp spike, which reads softer at small sizes. */
  /* Ears are *closed* triangles sitting on the head's shoulders, and they must
     stay well clear of the centre line — drawn as open paths sweeping inward,
     the fill closes across the middle and the two ears merge into a bow tie. */
  cat: `
    <path d="M5.9 3.6 10.4 7.1 6.5 10.4Z"
          stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M18.1 3.6 13.6 7.1 17.5 10.4Z"
          stroke-width="1.4" stroke-linejoin="round"/>
    <ellipse cx="12" cy="14.4" rx="6.9" ry="6.3"/>
  `,

  /* A cup and saucer. The saucer is what stops it reading as a bucket. */
  cup: `
    <path d="M4.2 7.4h11.2v4.9a5.6 5.6 0 0 1-11.2 0z"/>
    <path d="M16.2 8.8h1.5a2.7 2.7 0 0 1 0 5.4h-1.1"
          fill="none" stroke-width="1.8" stroke-linecap="round"/>
    <rect x="2.4" y="18.4" width="15.4" height="2.4" rx="1.2"/>
  `,

  /* A quartered colour wheel. The Style menu is colourways and nothing else,
     so the icon is a set of colour choices.

     This started as three overlapping circles, which was the more literal
     "swatches" idea and completely failed at 22px: same-coloured discs sharing
     an outline merge into one smudge, and no amount of opacity separates them.
     Quadrants of a single circle keep one clean silhouette and let the tone
     steps do the reading. */
  swatches: `
    <path d="M12 12V3.5A8.5 8.5 0 0 0 3.5 12z"/>
    <path d="M12 12V3.5a8.5 8.5 0 0 1 8.5 8.5z" opacity="0.72"/>
    <path d="M12 12h8.5a8.5 8.5 0 0 1-8.5 8.5z" opacity="0.44"/>
    <path d="M12 12H3.5a8.5 8.5 0 0 0 8.5 8.5z" opacity="0.88"/>
  `,

  /* A potted plant — "cosy touches". The rim is what makes the pot read as a
     pot at 21px; without it the body is just a tapered blob. */
  plant: `
    <path d="M7.1 13.6h9.8l-1.1 6.7a1.8 1.8 0 0 1-1.8 1.5h-4a1.8 1.8 0 0 1-1.8-1.5z"/>
    <rect x="6.1" y="11.3" width="11.8" height="2.5" rx="1.25"/>
    <path d="M12.8 10.4c0-3.3 1.7-5.6 4.8-6.4.4 3.8-1.5 6.1-4.8 6.4z"/>
    <path d="M11.2 10.4C11.2 7.8 9.9 5.9 7.7 5.3c-.3 3 1 4.9 3.5 5.1z"/>
  `,

  /* A coffee bean — "better brews". A cup would collide with the café icon.
     Two lobes with a real gap between them, **not** one ellipse with a crease
     stroked over it: a same-coloured stroke on a solid same-coloured fill is
     invisible no matter what opacity it carries, which is exactly how the
     first version ended up as a blank oval. Let the background be the crease. */
  bean: `
    <g transform="rotate(-32 12 12)">
      <path d="M11.15 3.5c-3.2 1.6-5 4.5-5 8.5s1.8 6.9 5 8.5z"/>
      <path d="M12.85 3.5c3.2 1.6 5 4.5 5 8.5s-1.8 6.9-5 8.5z" opacity="0.6"/>
    </g>
  `,

  /* A paw — used wherever the count of cats is the subject. */
  paw: `
    <ellipse cx="12" cy="15.6" rx="5.2" ry="4.4"/>
    <ellipse cx="6.2" cy="10.4" rx="2.5" ry="3.1" transform="rotate(-18 6.2 10.4)"/>
    <ellipse cx="17.8" cy="10.4" rx="2.5" ry="3.1" transform="rotate(18 17.8 10.4)"/>
    <ellipse cx="9.6" cy="5.6" rx="2.3" ry="2.9"/>
    <ellipse cx="14.4" cy="5.6" rx="2.3" ry="2.9"/>
  `,

  // A coin, for the pop when a guest pays. Solid disc with a *cut* inner ring
  // rather than a stroked one — §9: a same-coloured stroke over a same-coloured
  // fill is invisible, so the rim has to be a real gap.
  // Four-way move arrows — the universal "pick this up and drag it".
  arrows: `
    <path d="M12 2.2 15.1 6H12.9v4.1H17V7.9L20.8 11 17 14.1V11.9h-4.1V17H15L12 20.8 8.9 17H11v-5.1H6.9V14L3.2 11 6.9 7.9V10H11V6H8.9Z"/>
  `,
  // A shop awning — a canopy over a doorway. Solid, per the house style.
  shop: `
    <path d="M3.4 4h17.2l1.3 4.4a3 3 0 0 1-5.7 1.2 3 3 0 0 1-5.6 0 3 3 0 0 1-5.7-1.2Z"/>
    <path d="M5 11.6V20h5.2v-5h3.6v5H19v-8.4a4.6 4.6 0 0 1-3.4-.7 4.6 4.6 0 0 1-5.6 0 4.6 4.6 0 0 1-3.4.7Z"/>
  `,
  coin: `
    <circle cx="12" cy="12" r="9"/>
    <circle cx="12" cy="12" r="6.6" fill="none" stroke="currentColor" stroke-width="1.1" opacity="0.38"/>
  `,
  heart: `
    <path d="M12 20.4S3.6 15.2 3.6 9.5A4.6 4.6 0 0 1 12 6.9a4.6 4.6 0 0 1 8.4 2.6c0 5.7-8.4 10.9-8.4 10.9z"/>
  `,

  sound: `
    <path d="M4 9.4h3.4L12 5.2a1 1 0 0 1 1.7.75v12.1a1 1 0 0 1-1.7.75L7.4 14.6H4a1 1 0 0 1-1-1v-3.2a1 1 0 0 1 1-1z"/>
    <path d="M16.6 9.2a4 4 0 0 1 0 5.6" fill="none" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M19 6.6a7.6 7.6 0 0 1 0 10.8" fill="none" stroke-width="1.8" stroke-linecap="round"/>
  `,

  muted: `
    <path d="M4 9.4h3.4L12 5.2a1 1 0 0 1 1.7.75v12.1a1 1 0 0 1-1.7.75L7.4 14.6H4a1 1 0 0 1-1-1v-3.2a1 1 0 0 1 1-1z"/>
    <path d="M16.4 9.6 21 14.2M21 9.6l-4.6 4.6"
          fill="none" stroke-width="1.9" stroke-linecap="round"/>
  `,

  close: `
    <path d="M7 7l10 10M17 7 7 17" fill="none" stroke-width="2.1" stroke-linecap="round"/>
  `,

  /**
   * A cog, for settings. Eight teeth and a punched centre, as one `evenodd`
   * path so the hole shows whatever is behind the icon.
   *
   * **Generated, not drawn by hand.** The first attempt was hand-written and
   * was visibly lopsided at 20px — the teeth were not on a common circle and
   * the whole thing sat off the 24×24 centre. The points here come from
   * `cx=cy=12`, eight teeth on r=10.2 with roots at r=7.5, hole r=3.5. If it
   * needs changing, change those numbers and regenerate rather than nudging
   * coordinates.
   */
  cog: `
    <path fill-rule="evenodd" d="M10.25 4.71 L10.4 1.93 L13.6 1.93 L13.75 4.71 L15.92 5.61 L18 3.75 L20.25 6 L18.39 8.08 L19.29 10.25 L22.07 10.4 L22.07 13.6 L19.29 13.75 L18.39 15.92 L20.25 18 L18 20.25 L15.92 18.39 L13.75 19.29 L13.6 22.07 L10.4 22.07 L10.25 19.29 L8.08 18.39 L6 20.25 L3.75 18 L5.61 15.92 L4.71 13.75 L1.93 13.6 L1.93 10.4 L4.71 10.25 L5.61 8.08 L3.75 6 L6 3.75 L8.08 5.61ZM8.5 12a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0Z"/>
  `,

  /* --- The menu ----------------------------------------------------------
     Drinks are vessels, add-ins are the thing itself. Keeping that split makes
     a row of them readable at 20px without labels: anything cup-shaped is a
     coffee, anything else is something you put in one. */

  /* A squat mug, handle right. Filter coffee and the flat white. */
  mug: `
    <path d="M3.6 6.4h12.2v7.5a4.4 4.4 0 0 1-4.4 4.4H8a4.4 4.4 0 0 1-4.4-4.4Z"/>
    <path d="M16.6 8.4h1.7a3 3 0 0 1 0 6h-1.7v-2h1.7a1 1 0 0 0 0-2h-1.7Z"/>
    <path d="M4.4 19.6h10.6v1.8H4.4Z"/>
  `,

  /* A tulip cup on a saucer — the cappuccino. */
  cupHot: `
    <path d="M6.6 5.6h9.2l-.9 6.5a3.9 3.9 0 0 1-3.8 3.3h.1a3.9 3.9 0 0 1-3.8-3.3Z"/>
    <path d="M16.3 7.5h1.3a2.7 2.7 0 0 1 0 5.4h-1.6l.26-1.9h1.34a.8.8 0 0 0 0-1.6h-1.56Z"/>
    <path d="M4.6 17.4h14.8a1 1 0 0 1 0 2H4.6a1 1 0 0 1 0-2Z"/>
    <path d="M9 2.4a2.4 2.4 0 0 0 0 2.2M12 1.9a2.4 2.4 0 0 0 0 2.7M15 2.4a2.4 2.4 0 0 0 0 2.2"
          fill="none" stroke-width="1.5" stroke-linecap="round" opacity="0.55"/>
  `,

  /* A tall latte glass, the milk line punched through as a real gap — a
     same-coloured stroke over a same-coloured fill is invisible (§9). */
  latteGlass: `
    <path fill-rule="evenodd" d="M7 3.2h10l-1.1 16.2a2.2 2.2 0 0 1-2.2 2h-3.4a2.2 2.2 0 0 1-2.2-2Z
             M7.66 9.2h8.68l-.19 2.6H7.85Z"/>
  `,

  /* Iced: a glass with two cubes cut out of it, and a straw. */
  icedGlass: `
    <path fill-rule="evenodd" d="M6.4 6.8h11.2l-1 12.6a2.2 2.2 0 0 1-2.2 2h-4.8a2.2 2.2 0 0 1-2.2-2Z
             M8.6 9.4h3.3v3.3H8.6Z M12.6 13.9h3v3h-3Z"/>
    <path d="M14.6 2.2h2.3l-1.6 5.2h-2.3Z"/>
  `,

  /* A bar of chocolate: six segments with **real gaps** between them, because
     scored lines drawn as strokes over the same fill render as a blank slab —
     which is exactly how the first version looked. */
  cocoa: `
    <path d="M4.4 5.4h4.5v5.5H4.4Zm5.35 0h4.5v5.5h-4.5Zm5.35 0h4.5v5.5h-4.5Z
             M4.4 11.75h4.5v5.5H4.4Zm5.35 0h4.5v5.5h-4.5Zm5.35 0h4.5v5.5h-4.5Z"/>
  `,

  /* A leaf pair — matcha, and mint with a second leaf. */
  leaf: `
    <path d="M20 4c-8.6-1.3-14.4 2.7-14.4 8.4 0 2 .7 3.7 1.9 5C10.3 13.9 13.6 10.7 18 8.6
             c-3.9 2.7-6.6 6-8.4 10.1a7.9 7.9 0 0 0 2.6.5C18 19.2 21.3 12.6 20 4Z"/>
  `,

  mint: `
    <path d="M12.4 12.2c-4.6-.9-7.9 1.2-8.2 4.6 3.2 1.5 6.6.2 8.2-4.6Z"/>
    <path d="M12.9 11.4C12.1 5.9 15 2.3 19.6 2.4c1 4.3-1.5 8-6.7 9Z"/>
    <path d="M12.2 12.9 8.8 21.6" fill="none" stroke-width="1.7" stroke-linecap="round"/>
  `,

  /* A honey dipper, mid-drip. */
  honey: `
    <path d="M11 2.2h2v4.2h-2Z"/>
    <path d="M7.6 6.6h8.8v1.9H7.6Zm.5 3.1h7.8v1.9H8.1Zm.6 3.1h6.6v1.9H8.7Z"/>
    <path d="M12 16.4c1.5 1.9 2.3 3.2 2.3 4.1a2.3 2.3 0 1 1-4.6 0c0-.9.8-2.2 2.3-4.1Z"/>
  `,

  /* A vanilla flower over a pod. */
  vanilla: `
    <path d="M12 2.4a3 3 0 0 1 2.6 4.5A3 3 0 0 1 12 11.4a3 3 0 0 1-2.6-4.5A3 3 0 0 1 12 2.4Z"/>
    <path d="M6.3 5.5a3 3 0 0 1 4.3 1.2 3 3 0 0 1-4.3 1.3 3 3 0 0 1 0-2.5Zm11.4 0a3 3 0 0 1 0 2.5
             3 3 0 0 1-4.3-1.3 3 3 0 0 1 4.3-1.2Z"/>
    <path d="M11.1 12.1h1.8l-.5 9.6h-.8Z"/>
    <circle cx="12" cy="6.9" r="1.5" fill="none" stroke="currentColor" stroke-width="1.1" opacity="0.4"/>
  `,

  /* Two rolled cinnamon quills. */
  cinnamon: `
    <path d="M6.9 3.4h4.4l-2 17.2H4.9Z"/>
    <path d="M12.9 5.2h4.4l-1.7 15.4h-4.4Z"/>
    <path d="M8.6 3.4c-1 .7-1.2 1.7-.5 2.6M15 5.2c-1 .7-1.2 1.7-.5 2.6"
          fill="none" stroke-width="1.3" stroke-linecap="round" opacity="0.45"/>
  `,

  /* A caramel drizzle. */
  caramel: `
    <path d="M4.6 4.2c3.6 0 3.6 3.4 7.2 3.4s3.6-3.4 7.2-3.4v3.6c-3.6 0-3.6 3.4-7.2 3.4
             S8.2 7.8 4.6 7.8Z"/>
    <path d="M8 12.4c1.4 2.1 2.1 3.5 2.1 4.4a2.1 2.1 0 1 1-4.2 0c0-.9.7-2.3 2.1-4.4Z"/>
    <path d="M16.2 14.6c1.6 2.4 2.4 4 2.4 5a2.4 2.4 0 1 1-4.8 0c0-1 .8-2.6 2.4-5Z"/>
  `,

  /* A sprig of oats. */
  oat: `
    <path d="M11.2 21.6V7.4h1.6v14.2Z"/>
    <path d="M11.4 8.4c-2.6.5-4.3-.6-4.6-3 2.5-.7 4.2.3 4.6 3Zm1.2 0c.4-2.7 2.1-3.7 4.6-3
             -.3 2.4-2 3.5-4.6 3Zm-1.2-4.2C8.8 4.7 7.1 3.6 6.8 1.2c2.5-.7 4.2.3 4.6 3Zm1.2 0
             c.4-2.7 2.1-3.8 4.6-3-.3 2.4-2 3.5-4.6 3Z"/>
  `,

  /* A hazelnut sitting in its little cap, the cap separated by a real gap. */
  hazelnut: `
    <path d="M12 6.4c3.3 0 5.7 2.7 5.7 6.1s-2.4 6.1-5.7 6.1-5.7-2.7-5.7-6.1S8.7 6.4 12 6.4Z"/>
    <path d="M6.9 5.2h10.2a2 2 0 0 1-2 2H8.9a2 2 0 0 1-2-2Z"/>
    <path d="M11.2 1.9h1.6v2.6h-1.6Z"/>
  `,

  /* Three cardamom pods. */
  cardamom: `
    <path d="M8.4 3.6c1.7 0 3 2.2 3 5s-1.3 5-3 5-3-2.2-3-5 1.3-5 3-5Z"/>
    <path d="M16 8.6c1.7 0 3 2.2 3 5s-1.3 5-3 5-3-2.2-3-5 1.3-5 3-5Z"/>
    <path d="M8.4 3.6v10M16 8.6v10" fill="none" stroke-width="1.1" opacity="0.4"/>
  `,

  /* A trowel — the building tool. Blade, neck, handle. */
  tool: `
    <path d="M3.4 4.1 12.9 7l-4.6 6.1Z"/>
    <path d="M12.2 8.6 15 11.4l-2.3 2.3-2.8-2.8Z"/>
    <path d="M15.6 12.1 19 15.5a2.4 2.4 0 0 1-3.4 3.4l-3.4-3.4Z"/>
  `,

  /* A course of bricks, staggered — the wall picker. */
  wall: `
    <path d="M3 4.6h7.4v4H3Zm8.4 0H21v4h-9.6Z"/>
    <path d="M3 9.6h4.4v4H3Zm5.4 0H18v4H8.4Zm10.6 0H21v4h-2Z"/>
    <path d="M3 14.6h7.4v4H3Zm8.4 0H21v4h-9.6Z"/>
  `,

  /* Floorboards running away from you — the floor picker. */
  planks: `
    <path d="M2.6 5h18.8v3.1H2.6Zm0 4.3h11.2v3.1H2.6Zm12.4 0h6.4v3.1H15Z
             M2.6 13.6h18.8v3.1H2.6Zm0 4.3h6.4V21H2.6Zm7.6 0H21V21H10.2Z"/>
  `,

  /* Four arrows pushing out of a square — extending the floor. */
  expand: `
    <path d="M3 3h7.2v2.6H5.6v4.6H3Zm10.8 0H21v7.2h-2.6V5.6h-4.6ZM3 13.8h2.6v4.6h4.6V21H3Zm15.4 0H21V21h-7.2v-2.6h4.6Z"/>
    <path d="M9.4 9.4h5.2v5.2H9.4Z"/>
  `,

  /* An arched window with glazing bars — the one on the café's back wall.
     Solid silhouette with the panes cut out as real gaps, because a
     same-coloured stroke over a same-coloured fill is invisible (§9). */
  window: `
    <path d="M12 2.2a7.6 7.6 0 0 1 7.6 7.6V21H4.4V9.8A7.6 7.6 0 0 1 12 2.2Z
             M11 5.1a5 5 0 0 0-4 4.7v1.9h4Zm2 0v6.6h4V9.8a5 5 0 0 0-4-4.7Z
             M7 13.7v4.7h4v-4.7Zm6 0v4.7h4v-4.7Z"/>
  `,

  /* A quarter-turn arrow: an arc with a head, for "turn it". */
  rotate: `
    <path d="M12 4.6a7.4 7.4 0 1 0 7.4 7.4h-2.6A4.8 4.8 0 1 1 12 7.2Z"/>
    <path d="M10.6 1.4 15 4.6l-4.4 3.2Z"/>
  `,

  /* Three bars, tallest first — the analytics page. */
  chart: `
    <path d="M3.6 5.2h7.2v4H3.6Zm0 5.8h11.6v4H3.6Zm0 5.8h5.4v4H3.6Z"/>
  `,

  /* A back chevron. Stroked, because an arrow drawn as a solid silhouette at
     this size turns into a blob. */
  chevronLeft: `
    <path d="M14.6 5.4 8 12l6.6 6.6" fill="none" stroke-width="2.3"
          stroke-linecap="round" stroke-linejoin="round"/>
  `,

  /* An armchair, seen head-on: seat, back, two arms. The shop's comfort tab. */
  sofa: `
    <path d="M6.6 8.2c0-2 .7-3 2.2-3h6.4c1.5 0 2.2 1 2.2 3v1.5H6.6Z"/>
    <path d="M3 12.1c0-1.3.7-2 1.8-2s1.8.7 1.8 2v3.3H3Zm14.4 0c0-1.3.7-2 1.8-2s1.8.7 1.8 2v3.3h-3.6Z"/>
    <path d="M6.6 11h10.8v5.6H6.6Z"/>
    <path d="M6.2 17.6h2v1.9h-2Zm9.6 0h2v1.9h-2Z"/>
  `,

  /* A pencil, for "tap to rename". Small enough to sit inline after a name. */
  pencil: `
    <path d="M4 20.2v-3.1L15.6 5.5l3.1 3.1L7.1 20.2z"/>
    <path d="M17.1 4 20.2 7.1" fill="none" stroke-width="2.1" stroke-linecap="round"/>
  `,
};

export type IconName = keyof typeof ICONS;

export function hasIcon(name: string): boolean {
  return name in ICONS;
}

/**
 * An icon as an inline `<svg>`, inheriting colour from its parent.
 *
 * Built by string rather than by `createElementNS` per node because these are
 * static shapes with no behaviour — and `innerHTML` on an SVG element needs the
 * namespace to come from the parent, hence the wrapper markup.
 */
export function icon(name: string, className = "icon"): SVGElement {
  const wrapper = document.createElement("div");
  wrapper.innerHTML =
    `<svg class="${className}" viewBox="0 0 24 24" fill="currentColor" ` +
    `stroke="currentColor" stroke-width="0" aria-hidden="true" focusable="false">` +
    (ICONS[name] ?? "") +
    `</svg>`;
  return wrapper.firstElementChild as SVGElement;
}
