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
 */

export type GraphicsLevel = "smooth" | "balanced" | "sharp";

export const GRAPHICS_LEVELS: {
  id: GraphicsLevel;
  name: string;
  hint: string;
  /** Total canvas pixels allowed. */
  budget: number;
}[] = [
  {
    id: "smooth",
    name: "smooth",
    hint: "softest and coolest. kindest to the battery.",
    budget: 1_600_000,
  },
  {
    id: "balanced",
    name: "balanced",
    hint: "a step back if sharp is too much for the phone.",
    budget: 2_400_000,
  },
  {
    id: "sharp",
    name: "sharp",
    hint: "the default: your screen's own resolution.",
    budget: 4_000_000,
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

export function sanitizeLevel(value: unknown): GraphicsLevel {
  return GRAPHICS_LEVELS.some((l) => l.id === value) ? (value as GraphicsLevel) : DEFAULT_LEVEL;
}
