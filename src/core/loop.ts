export type FrameCallback = (now: number) => void;

/**
 * Frames per second we actually render.
 *
 * Uncapped, this game rendered as fast as the display allowed — 60 on most
 * phones, **120 on a ProMotion iPhone** — and every one of those frames pays
 * for the full GTAO + bloom + SMAA chain (§9). That made the device hot enough
 * for Ellis to complain about it on the first build (2026-08-05).
 *
 * 30 is the right target for *this* game rather than a grudging compromise:
 * the café is a fixed diorama whose motion is breathing cats, a drifting tail
 * and dust motes. None of that reads better at 60, and halving the frame rate
 * halves GPU load almost exactly.
 *
 * Raise it if direct manipulation ever feels laggy — dragging furniture around
 * the planned café editor is the obvious candidate, since a dragged object
 * tracking your finger at 30 Hz is perceptibly behind it. The better answer
 * there is to raise the cap *only while a drag is in progress* rather than
 * paying for 60 the whole session.
 */
export const TARGET_FPS = 30;

/** Slack for vsync jitter, so a frame arriving a whisker early isn't dropped
 *  (which would halve the rate to the next display interval). */
const JITTER_TOLERANCE_MS = 4;

/**
 * Thin requestAnimationFrame wrapper. Keeps the raf bookkeeping in one place
 * so systems/scene code just registers a callback and doesn't touch raf directly.
 */
/** Frame rate while the player is actively manipulating something. A dragged
 *  object tracking a finger at 30 Hz reads as lag; this is paid only for the
 *  length of the gesture. */
export const INTERACTIVE_FPS = 60;

export interface GameLoop {
  stop(): void;
  /** Change the cap at runtime — raise it during a drag, drop it after. */
  setMaxFps(fps: number): void;
}

export function startLoop(onFrame: FrameCallback, maxFps: number = TARGET_FPS): GameLoop {
  let handle = 0;
  let running = true;
  let minDelta = 1000 / maxFps;
  let last = Number.NEGATIVE_INFINITY;

  function frame(now: number) {
    if (!running) return;
    // Re-arm first, so an exception in onFrame can't silently kill the loop.
    handle = requestAnimationFrame(frame);
    if (now - last < minDelta - JITTER_TOLERANCE_MS) return;
    last = now;
    onFrame(now);
  }

  handle = requestAnimationFrame(frame);

  return {
    stop() {
      running = false;
      cancelAnimationFrame(handle);
    },
    setMaxFps(fps: number) {
      minDelta = 1000 / fps;
    },
  };
}
