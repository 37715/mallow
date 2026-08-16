import type { Chore } from "@/data/chores";
import { playTap } from "@/audio/audio";
import { icon } from "@/ui/icons";

/**
 * The wiping minigame: the café's window, grubby, and you rub it clean.
 *
 * ## Two things this got wrong before, both worth keeping
 *
 * **It had no pointer events at all.** `#ui-root` is `pointer-events: none` so
 * canvas gestures pass through it, and every interactive thing opts back in.
 * This layer never did, so the muck was inert: the drags went straight through
 * to the camera and the player spent the whole minigame panning the room
 * behind a grey sheet. Ellis: *"its just a grey/white sheet over the screen
 * that does nothing? i cant wipe anything im still moving about the camera?"*
 * That is the **second** widget in a row to ship with this fault — anything
 * mounted into `#ui-root` that expects a touch needs `pointer-events: auto`,
 * and there is no way to notice its absence except by really touching it.
 *
 * **And the muck covered the whole screen**, which meant the thing being
 * cleaned was the phone rather than the window. There is a real render of the
 * window in the middle of it now (`scene/window-preview.ts`) and the grime is
 * confined to the glass, so what you are wiping is unambiguous and what you
 * uncover is the café's own window.
 *
 * The rest of the shape is unchanged and deliberate: no fail state, no timer,
 * no score, and it completes at 88% rather than 100% — hunting the last specks
 * of a soft brush is where "satisfying" turns into "fiddly".
 */

export interface ChoreWipe {
  start(chore: Chore): void;
  readonly open: boolean;
  /** Where the window should be rendered, or null when the game is closed. */
  stageRect(): DOMRect | null;
  /** Copy the rendered window into the card. Same frame as the render. */
  paintWindow(source: HTMLCanvasElement, rect: DOMRect): void;
  close(): void;
  dispose(): void;
}

/** Cleared fraction at which it counts as done. */
const DONE_AT = 0.88;
/** Brush radius in CSS pixels. Wide: this is a cloth, not a cotton bud. */
const BRUSH = 38;
/** Probe grid for "how much is left" — sampling every pixel is far too slow. */
const PROBES = 22;

export function createChoreWipe(
  root: HTMLElement,
  onDone: (chore: Chore) => void,
): ChoreWipe {
  const layer = document.createElement("div");
  layer.className = "wipe-layer";
  layer.dataset.overlay = "";
  layer.style.display = "none";

  const card = document.createElement("div");
  card.className = "wipe-card";
  /** The rendered window, blitted out of the WebGL canvas. */
  const glass = document.createElement("canvas");
  glass.className = "wipe-glass";
  /** The muck, sitting exactly on top of it. */
  const grime = document.createElement("canvas");
  grime.className = "wipe-grime";
  const shine = document.createElement("div");
  shine.className = "wipe-shine";
  const sparks = document.createElement("div");
  sparks.className = "wipe-sparks";
  card.append(glass, grime, shine, sparks);

  const caption = document.createElement("div");
  caption.className = "wipe-caption";
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
  caption.append(title, hint, bar, quit);

  layer.append(card, caption);
  root.appendChild(layer);

  const ctx = grime.getContext("2d");
  const glassCtx = glass.getContext("2d");
  let chore: Chore | null = null;
  let painting = false;
  let last: { x: number; y: number } | null = null;
  let finished = false;
  /** CSS-pixel size the grime was last painted at. */
  let sized = { w: 0, h: 0 };

  /** Draw the muck. Streaky, so wiping *reveals* rather than uniformly fades. */
  function paintGrime(width: number, height: number): void {
    if (!ctx) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, width, height);

    const base = ctx.createLinearGradient(0, 0, width, height);
    base.addColorStop(0, "rgba(198, 190, 162, 0.90)");
    base.addColorStop(0.5, "rgba(178, 170, 144, 0.94)");
    base.addColorStop(1, "rgba(198, 190, 162, 0.90)");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    // Smears and specks. Deterministic — grime should look like grime, and a
    // fixed pattern is easier to judge than noise that changes every time.
    for (let i = 0; i < 70; i++) {
      const t = i * 2.399963; // golden angle, so nothing lines up
      const x = (Math.sin(t) * 0.5 + 0.5) * width;
      const y = (Math.cos(t * 1.7) * 0.5 + 0.5) * height;
      const r = 14 + ((i * 37) % 46);
      const smudge = ctx.createRadialGradient(x, y, 0, x, y, r);
      const a = 0.06 + ((i * 13) % 9) / 80;
      smudge.addColorStop(0, `rgba(126, 116, 92, ${a})`);
      smudge.addColorStop(1, "rgba(126, 116, 92, 0)");
      ctx.fillStyle = smudge;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // A few dry streaks, as if somebody wiped it once with a bad cloth.
    ctx.strokeStyle = "rgba(150, 140, 112, 0.20)";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    for (let i = 0; i < 7; i++) {
      const y = ((i + 0.5) / 7) * height;
      ctx.beginPath();
      ctx.moveTo(width * 0.06, y + Math.sin(i) * 10);
      ctx.bezierCurveTo(
        width * 0.35, y - 16, width * 0.62, y + 18, width * 0.94, y + Math.cos(i) * 9,
      );
      ctx.stroke();
    }
  }

  /** What fraction of the probe grid is see-through. */
  function measure(): number {
    if (!ctx) return 1;
    const { width, height } = grime;
    const stepX = Math.max(1, Math.floor(width / PROBES));
    const stepY = Math.max(1, Math.floor(height / PROBES));
    let clear = 0;
    let total = 0;
    for (let y = Math.floor(stepY / 2); y < height; y += stepY) {
      const row = ctx.getImageData(0, y, width, 1).data;
      for (let x = Math.floor(stepX / 2); x < width; x += stepX) {
        total++;
        if (row[x * 4 + 3] < 26) clear++;
      }
    }
    return total === 0 ? 1 : clear / total;
  }

  function resize(): void {
    const rect = card.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const canvas of [glass, grime]) {
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    }
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    sized = { w: rect.width, h: rect.height };
    paintGrime(rect.width, rect.height);
  }

  /** Card-local coordinates, since the grime is the card rather than the screen. */
  function localPoint(e: PointerEvent): { x: number; y: number } | null {
    const rect = card.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function wipeTo(x: number, y: number): void {
    if (!ctx) return;
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // A soft brush: a few passes at decreasing width, which is cheaper than a
    // feathered stamp and reads the same in motion.
    for (const [w, a] of [
      [1, 0.5],
      [0.68, 0.6],
      [0.4, 0.9],
    ] as const) {
      ctx.strokeStyle = `rgba(0, 0, 0, ${a})`;
      ctx.lineWidth = BRUSH * 2 * w;
      ctx.beginPath();
      ctx.moveTo(last?.x ?? x, last?.y ?? y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    last = { x, y };
  }

  /** The clean moment: a sweep of shine and a scatter of sparkles. */
  function celebrate(): void {
    shine.classList.remove("on");
    void shine.offsetWidth;
    shine.classList.add("on");
    sparks.innerHTML = "";
    for (let i = 0; i < 7; i++) {
      const spark = document.createElement("span");
      spark.className = "wipe-spark";
      spark.appendChild(icon("sparkle"));
      // Scattered across the glass rather than in a ring — a ring reads as a
      // loading spinner.
      spark.style.left = `${12 + ((i * 37) % 76)}%`;
      spark.style.top = `${14 + ((i * 53) % 70)}%`;
      spark.style.animationDelay = `${i * 55}ms`;
      spark.style.setProperty("--spark-size", `${16 + ((i * 11) % 14)}px`);
      sparks.appendChild(spark);
    }
  }

  function tick(): void {
    if (!chore || finished) return;
    const cleared = measure();
    fill.style.width = `${Math.round(Math.min(1, cleared / DONE_AT) * 100)}%`;
    if (cleared < DONE_AT) return;

    finished = true;
    const done = chore;
    // Clear the last specks: the player earned a clean window, not one with
    // three smudges left in the corners.
    if (ctx) ctx.clearRect(0, 0, sized.w, sized.h);
    celebrate();
    // Long enough to watch the sparkle finish. The chore is only banked when
    // the overlay is gone and the HUD is back, so the appeal chip's own
    // celebration is not playing behind a full-screen layer.
    window.setTimeout(() => {
      close();
      window.setTimeout(() => onDone(done), 260);
    }, 1150);
  }

  layer.addEventListener("pointerdown", (e) => {
    if (!chore || finished) return;
    const p = localPoint(e);
    if (!p) return;
    painting = true;
    last = null;
    wipeTo(p.x, p.y);
    tick();
    layer.setPointerCapture(e.pointerId);
  });
  layer.addEventListener("pointermove", (e) => {
    if (!painting || !chore || finished) return;
    const p = localPoint(e);
    if (!p) return;
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
    shine.classList.remove("on");
    sparks.innerHTML = "";
  }

  window.addEventListener("resize", () => {
    if (chore && !finished) resize();
  });

  return {
    start(next: Chore): void {
      chore = next;
      finished = false;
      painting = false;
      last = null;
      title.textContent = next.name;
      hint.textContent = next.hint;
      fill.style.width = "0%";
      layer.style.display = "";
      root.classList.add("wiping");
      // After display, or the card measures zero and the grime is painted into
      // nothing.
      resize();
    },

    get open(): boolean {
      return chore !== null;
    },

    stageRect(): DOMRect | null {
      if (!chore) return null;
      const rect = card.getBoundingClientRect();
      return rect.width < 4 || rect.height < 4 ? null : rect;
    },

    paintWindow(source, rect): void {
      if (!glassCtx) return;
      // The source canvas is in device pixels at the renderer's own ratio,
      // which is solved from the graphics budget and is not this one.
      const scale = source.width / Math.max(1, window.innerWidth);
      glassCtx.clearRect(0, 0, glass.width, glass.height);
      glassCtx.drawImage(
        source,
        rect.left * scale,
        rect.top * scale,
        rect.width * scale,
        rect.height * scale,
        0,
        0,
        glass.width,
        glass.height,
      );
    },

    close,
    dispose(): void {
      layer.remove();
    },
  };
}
