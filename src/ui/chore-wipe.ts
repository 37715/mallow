import type { Chore } from "@/data/chores";
import { playTap } from "@/audio/audio";

/**
 * The wiping minigame: something is on the glass, you drag, it comes off.
 *
 * **The café is what you are wiping.** The grime is a canvas laid over the
 * whole screen with the 3D scene showing straight through the parts you have
 * cleared, so the reward for a stroke is a stripe of your own café appearing.
 * That is the entire satisfaction of it, and it is why this is a transparent
 * overlay rather than a panel with a picture of a window in it.
 *
 * Three things keep it from being a chore in the bad sense:
 *
 * - **No fail state, no timer, no score.** It finishes when it is clean enough
 *   and there is nothing else to get wrong (pillar 1).
 * - **It completes at 88%, not 100%.** Hunting the last few specks of a
 *   soft-edged brush is the difference between "satisfying" and "fiddly", and
 *   the last stroke should feel like finishing rather than like admin.
 * - **It is over in about twenty seconds.** The brush is wide and the bar is
 *   low on purpose.
 *
 * Clearing is `destination-out` compositing, which is what makes a soft brush
 * erase softly — painting the backdrop colour instead would leave hard edges
 * and could never be transparent.
 */

export interface ChoreWipe {
  /** Put the muck up and let them at it. */
  start(chore: Chore): void;
  /** True while the overlay is up, so the caller can suppress other taps. */
  readonly open: boolean;
  close(): void;
  dispose(): void;
}

/** Cleared fraction at which it counts as done — see the note above. */
const DONE_AT = 0.88;
/** Brush radius in CSS pixels. Wide: this is a cloth, not a cotton bud. */
const BRUSH = 46;
/**
 * Grid used to estimate how much is left. Sampling the alpha of every pixel
 * every frame is far too slow on a phone; a coarse grid of probe points is
 * exact enough for a threshold and costs nothing.
 */
const PROBES = 24;

export function createChoreWipe(
  root: HTMLElement,
  onDone: (chore: Chore) => void,
): ChoreWipe {
  const layer = document.createElement("div");
  layer.className = "wipe-layer";
  layer.dataset.overlay = "";
  layer.style.display = "none";

  const canvas = document.createElement("canvas");
  canvas.className = "wipe-canvas";
  const title = document.createElement("div");
  title.className = "wipe-title";
  const hint = document.createElement("div");
  hint.className = "wipe-hint";
  const bar = document.createElement("div");
  bar.className = "wipe-bar";
  const fill = document.createElement("div");
  fill.className = "wipe-bar-fill";
  bar.appendChild(fill);
  const quit = document.createElement("button");
  quit.className = "wipe-quit";
  quit.textContent = "later";

  const card = document.createElement("div");
  card.className = "wipe-card";
  card.append(title, hint, bar, quit);
  layer.append(canvas, card);
  root.appendChild(layer);

  const ctx = canvas.getContext("2d");
  let chore: Chore | null = null;
  let painting = false;
  let last: { x: number; y: number } | null = null;
  let cleared = 0;
  let finished = false;

  /** Draw the muck. Streaky rather than uniform, so wiping *reveals* a shape. */
  function paintGrime(width: number, height: number): void {
    if (!ctx) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, width, height);

    const base = ctx.createLinearGradient(0, 0, width, height);
    base.addColorStop(0, "rgba(214, 206, 178, 0.80)");
    base.addColorStop(0.5, "rgba(198, 190, 164, 0.86)");
    base.addColorStop(1, "rgba(214, 206, 178, 0.80)");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    // Smears. A deterministic pseudo-random walk — no need for real randomness,
    // and a fixed pattern means the grime looks like grime rather than noise.
    ctx.globalCompositeOperation = "source-over";
    for (let i = 0; i < 90; i++) {
      const t = i * 2.399963; // golden angle, so the smears never line up
      const x = ((Math.sin(t) * 0.5 + 0.5) * width * 1.2) - width * 0.1;
      const y = ((Math.cos(t * 1.7) * 0.5 + 0.5) * height * 1.2) - height * 0.1;
      const r = 22 + ((i * 37) % 60);
      const smudge = ctx.createRadialGradient(x, y, 0, x, y, r);
      const a = 0.05 + ((i * 13) % 9) / 90;
      smudge.addColorStop(0, `rgba(150, 140, 112, ${a})`);
      smudge.addColorStop(1, "rgba(150, 140, 112, 0)");
      ctx.fillStyle = smudge;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** What fraction of the probe grid is see-through. */
  function measure(): number {
    if (!ctx) return 1;
    const { width, height } = canvas;
    const stepX = Math.max(1, Math.floor(width / PROBES));
    const stepY = Math.max(1, Math.floor(height / PROBES));
    let clear = 0;
    let total = 0;
    for (let y = Math.floor(stepY / 2); y < height; y += stepY) {
      // One row at a time: a single getImageData over the whole canvas is a
      // large copy every frame, and we only look at a grid of it.
      const row = ctx.getImageData(0, y, width, 1).data;
      for (let x = Math.floor(stepX / 2); x < width; x += stepX) {
        total++;
        if (row[x * 4 + 3] < 24) clear++;
      }
    }
    return total === 0 ? 1 : clear / total;
  }

  function resize(): void {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    if (ctx) ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    paintGrime(window.innerWidth, window.innerHeight);
  }

  function wipeTo(x: number, y: number): void {
    if (!ctx) return;
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = BRUSH * 2;
    // A soft brush: several passes at decreasing width and alpha, which is
    // cheaper than a real feathered stamp and reads the same in motion.
    for (const [w, a] of [
      [1, 0.55],
      [0.7, 0.6],
      [0.42, 0.85],
    ] as const) {
      ctx.strokeStyle = `rgba(0, 0, 0, ${a})`;
      ctx.lineWidth = BRUSH * 2 * w;
      ctx.beginPath();
      if (last) ctx.moveTo(last.x, last.y);
      else ctx.moveTo(x, y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    last = { x, y };
  }

  function tick(): void {
    if (!chore || finished) return;
    cleared = measure();
    fill.style.width = `${Math.round(Math.min(1, cleared / DONE_AT) * 100)}%`;
    if (cleared >= DONE_AT) {
      finished = true;
      const done = chore;
      // Wipe the rest away so the last frame is a clean window rather than a
      // pane with three specks left on it — the player earned the clean one.
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      window.setTimeout(() => {
        close();
        onDone(done);
      }, 260);
    }
  }

  function pointerPos(e: PointerEvent): { x: number; y: number } {
    return { x: e.clientX, y: e.clientY };
  }

  layer.addEventListener("pointerdown", (e) => {
    if (!chore || finished) return;
    painting = true;
    last = null;
    const p = pointerPos(e);
    wipeTo(p.x, p.y);
    tick();
    layer.setPointerCapture(e.pointerId);
  });
  layer.addEventListener("pointermove", (e) => {
    if (!painting || !chore || finished) return;
    const p = pointerPos(e);
    wipeTo(p.x, p.y);
    tick();
  });
  const stop = (): void => {
    painting = false;
    last = null;
  };
  layer.addEventListener("pointerup", stop);
  layer.addEventListener("pointercancel", stop);
  quit.addEventListener("click", (e) => {
    e.stopPropagation();
    playTap();
    close();
  });

  function close(): void {
    layer.style.display = "none";
    root.classList.remove("wiping");
    chore = null;
    painting = false;
    finished = false;
  }

  window.addEventListener("resize", () => {
    if (chore) resize();
  });

  return {
    start(next: Chore): void {
      chore = next;
      finished = false;
      painting = false;
      last = null;
      cleared = 0;
      title.textContent = next.name;
      hint.textContent = next.hint;
      fill.style.width = "0%";
      layer.style.display = "";
      // The HUD steps back for the duration. It is legible *through* the
      // grime, which makes the screen read as an interface with muck on it
      // rather than a window — and the prompt saying "give it a wipe" while
      // you are wiping is nonsense.
      root.classList.add("wiping");
      // After the layer is displayed, or the canvas measures zero and the
      // grime is painted into nothing.
      resize();
    },

    get open(): boolean {
      return chore !== null;
    },

    close,
    dispose(): void {
      layer.remove();
    },
  };
}
