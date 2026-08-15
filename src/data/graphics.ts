/**
 * How much resolution to spend.
 *
 * **This exists because rendering at native device ratio killed the app.**
 * Ellis, 2026-08-17, on an iPhone build: black screen, `SIGKILL`. The café
 * genuinely does look soft below native ratio — any cap means the browser
 * upscales the canvas, and no antialiasing undoes a resize — but the memory
 * does not fit:
 *
 *     bytes ≈ pixels × 8 (half-float RGBA) × (samples + 1) × targets
 *
 * With the old `EffectComposer` (a **pair** of targets) plus GTAO's own
 * buffers, ratio 3 came to ~241 MB and iOS killed the app on launch. With the
 * single-target chain it is ~72 MB, so native ratio finally fits — but the
 * formula is why, and it is the thing to check before adding another pass.
 *
 * So the setting is a **pixel budget** and the ratio is solved from it. A
 * budget bounds memory on every screen; a ratio cap only bounds it on the
 * screen you tested on. And it is a *player* setting rather than a constant
 * because the limit is a property of the device, which we cannot measure from
 * here — the only honest answer is to let the phone's owner find it.
 *
 * ## A budget alone is not enough, and this is why the setting did nothing
 *
 * Ellis, 2026-08-26: *"the picture mode resolution stuff also doesnt seem to
 * change anything."* The budgets were being applied perfectly — measured at
 * DPR 3 the three levels solve to ratios 2.186 / 2.677 / 3.000, matching the
 * arithmetic to three decimals. **The fault is that a budget is an absolute
 * number and a screen is not.** On a DPR-2 phone every one of these budgets
 * solves above 2, so all three levels clamp to the device ratio and the
 * setting is genuinely inert — which is most iPhones that are not Pro.
 *
 * So each level now carries a **`scale` as well as a `budget`**, and the ratio
 * is the smaller of the two:
 *
 *     ratio = min(devicePixelRatio × scale, sqrt(budget / cssPixels))
 *
 * The budget is still what stops a big screen allocating a fortune — that
 * guarantee is untouched, and it is the one the SIGKILL story is about. The
 * scale is what makes the control mean something on a small one. Neither can
 * do the other's job.
 */

export type GraphicsLevel = "smooth" | "balanced" | "sharp";

export const GRAPHICS_LEVELS: {
  id: GraphicsLevel;
  name: string;
  hint: string;
  /** Total canvas pixels allowed. Bounds memory. */
  budget: number;
  /**
   * Ceiling as a fraction of the screen's own ratio. Bounds *nothing* on
   * memory — it exists so the setting is felt on every phone.
   */
  scale: number;
}[] = [
  {
    id: "smooth",
    name: "smooth",
    hint: "softest and coolest. kindest to the battery.",
    budget: 1_600_000,
    scale: 0.62,
  },
  {
    id: "balanced",
    name: "balanced",
    hint: "a step back if sharp is too much for the phone.",
    budget: 2_400_000,
    scale: 0.8,
  },
  {
    id: "sharp",
    name: "sharp",
    hint: "the default: your screen's own resolution.",
    budget: 4_000_000,
    scale: 1,
  },
];

/**
 * **Sharp by default**, which is only defensible because the post chain was
 * rewritten to fit: one multisampled target and one pass (`scene/post.ts`)
 * instead of a composer's pair plus GTAO's buffers. At native ratio on a
 * 393×852 phone that is ~72 MB — *less than the ratio-2 build that was already
 * running fine*. The lower levels are for older phones, and for the day
 * somebody reports that this one still closes itself.
 */
export const DEFAULT_LEVEL: GraphicsLevel = "sharp";
export const DEFAULT_PIXEL_BUDGET = 4_000_000;

export function pixelBudget(level: GraphicsLevel): number {
  return GRAPHICS_LEVELS.find((l) => l.id === level)?.budget ?? DEFAULT_PIXEL_BUDGET;
}

/** The level's ceiling as a fraction of the screen's own ratio — see above. */
export function ratioScale(level: GraphicsLevel): number {
  return GRAPHICS_LEVELS.find((l) => l.id === level)?.scale ?? 1;
}

/**
 * The pixel ratio to render at. Both limits apply and the smaller wins: the
 * budget bounds memory, the scale makes the setting visible on a screen whose
 * native resolution is already inside the budget.
 */
export function pixelRatioFor(
  level: GraphicsLevel,
  devicePixelRatio: number,
  cssPixels: number,
): number {
  return Math.min(
    devicePixelRatio * ratioScale(level),
    Math.sqrt(pixelBudget(level) / Math.max(1, cssPixels)),
  );
}

export function sanitizeLevel(value: unknown): GraphicsLevel {
  return GRAPHICS_LEVELS.some((l) => l.id === value) ? (value as GraphicsLevel) : DEFAULT_LEVEL;
}
