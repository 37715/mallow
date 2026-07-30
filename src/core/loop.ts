export type FrameCallback = (now: number) => void;

/**
 * Thin requestAnimationFrame wrapper. Keeps the raf bookkeeping in one place
 * so systems/scene code just registers a callback and doesn't touch raf directly.
 */
export function startLoop(onFrame: FrameCallback): () => void {
  let handle = 0;
  let running = true;

  function frame(now: number) {
    if (!running) return;
    onFrame(now);
    handle = requestAnimationFrame(frame);
  }

  handle = requestAnimationFrame(frame);

  return () => {
    running = false;
    cancelAnimationFrame(handle);
  };
}
