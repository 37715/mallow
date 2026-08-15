import * as THREE from "three";
import { playType } from "@/audio/audio";

/**
 * A speech bubble that hangs over someone's head, with the text typing out.
 *
 * **DOM projected from world space, not 3D text** — the same trick as
 * `ui/floaters.ts` and `ui/cat-labels.ts`, and for the same three reasons: it
 * is crisp at any pixel ratio, it costs no draw calls, and it can be a real
 * tap target. A canvas-textured quad would fail all three.
 *
 * The typing is not decoration. It sets the pace of the scene, it is what the
 * lip sync is timed against (`systems/lipsync.ts` works in the same
 * milliseconds-per-character), and it gives the player something to interrupt
 * — tapping fills the line instantly rather than skipping it, which is the
 * convention every game with a talking character uses and the one players
 * reach for without being told.
 */

export interface SpeechBubbleOptions {
  /** Milliseconds per character. Must match the lip sync's, or mouth and text drift. */
  msPerChar: number;
}

export class SpeechBubble {
  private readonly layer: HTMLElement;
  private readonly bubble: HTMLElement;
  private readonly textNode: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly ndc = new THREE.Vector3();

  private full = "";
  private shown = -1;
  private startedAt = 0;
  private visible = false;
  /** True while a panel is open and the bubble is pinned to the top instead. */
  private docked = false;

  constructor(
    root: HTMLElement,
    private readonly options: SpeechBubbleOptions,
  ) {
    this.layer = document.createElement("div");
    this.layer.className = "speech-layer";
    // Survives `mountUI` clearing the root — see the note there. Without it the
    // bubble is appended to an orphaned node and never appears, which is
    // exactly how the coin floaters were silently dead for weeks.
    this.layer.dataset.overlay = "";

    this.bubble = document.createElement("div");
    this.bubble.className = "speech-bubble";
    this.textNode = document.createElement("p");
    this.textNode.className = "speech-text";
    this.hint = document.createElement("span");
    this.hint.className = "speech-hint";
    this.hint.textContent = "tap to continue";
    this.bubble.append(this.textNode, this.hint);
    this.layer.appendChild(this.bubble);
    root.appendChild(this.layer);
    this.hide();
  }

  /** Start typing a new line. */
  say(text: string, now: number): void {
    this.full = text;
    this.shown = -1;
    this.startedAt = now;
    this.visible = true;
    this.layer.style.display = "";
    this.hint.style.opacity = "0";
  }

  /**
   * Replace "tap to continue" with what the player is being asked to do.
   *
   * The distinction matters: "tap to continue" is an invitation to skip, and
   * showing it under a line that is *waiting* for you to open the shop tells
   * you the opposite of the truth.
   */
  setWaitHint(hint: string | null): void {
    this.hint.textContent = hint ?? "tap to continue";
    this.hint.classList.toggle("speech-hint-task", hint !== null);
  }

  hide(): void {
    this.visible = false;
    this.layer.style.display = "none";
  }

  /** True once every character is on screen. */
  get complete(): boolean {
    return this.shown >= this.full.length;
  }

  /** Show the rest of the line at once. */
  reveal(now: number): void {
    this.startedAt = now - this.full.length * this.options.msPerChar;
  }

  /**
   * How far through the line we are, in milliseconds — the clock the lip sync
   * reads, so the mouth is driven by the *same* value that draws the text
   * rather than a parallel timer that can drift from it.
   */
  elapsed(now: number): number {
    return now - this.startedAt;
  }

  /**
   * @param anchor world position to hang the bubble above
   */
  /**
   * Dock to the top of the screen instead of hanging over the speaker's head.
   *
   * Used whenever a panel is open, because the speaker is *behind* it — the
   * same reasoning that docked the colourway sheet rather than floating it
   * beside the piece being recoloured (§0, 2026-08-06): on a phone the thing
   * you are interacting with is the middle of the screen, so anything anchored
   * to it covers it.
   */
  setDocked(docked: boolean): void {
    this.bubble.classList.toggle("docked", docked);
    this.docked = docked;
  }

  update(anchor: THREE.Vector3, camera: THREE.Camera, now: number): void {
    if (!this.visible) return;

    const chars = Math.floor(Math.max(0, now - this.startedAt) / this.options.msPerChar);
    const count = Math.min(chars, this.full.length);
    if (count !== this.shown) {
      // A click per letter is a typewriter; this wants to read as a voice. Only
      // consonants, only every third one — that lands near syllable rate. It is
      // also skipped when the whole line is revealed at once by a tap, since
      // forty clicks in one frame is a burst of noise.
      if (this.shown >= 0 && count - this.shown === 1 && count % 3 === 0) {
        const letter = this.full[count - 1] ?? "";
        if (/[a-z]/i.test(letter) && !/[aeiou]/i.test(letter)) playType();
      }
      this.shown = count;
      // A trailing space would make the bubble jitter a character wide as it
      // types; the zero-width joiner holds the line's height on an empty start.
      this.textNode.textContent = this.full.slice(0, count) || "​";
      if (count >= this.full.length) this.hint.style.opacity = "";
    }

    // Docked: the CSS owns the position, so nothing to project.
    if (this.docked) {
      this.bubble.style.visibility = "visible";
      return;
    }
    this.ndc.copy(anchor).project(camera);
    if (this.ndc.z > 1) {
      this.bubble.style.visibility = "hidden";
      return;
    }
    const x = (this.ndc.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-this.ndc.y * 0.5 + 0.5) * window.innerHeight;
    this.bubble.style.visibility = "visible";
    // Clamped so a guide standing near the edge of a narrow phone screen still
    // gets a readable bubble instead of one hanging half off it. On a phone the
    // bubble is nearly screen-wide, so this settles to "centred" by itself.
    const half = (this.bubble.offsetWidth || 280) / 2;
    const margin = 10;
    const clampedX = Math.min(
      Math.max(x, half + margin),
      Math.max(half + margin, window.innerWidth - half - margin),
    );
    this.bubble.style.transform = `translate(-50%, -100%) translate(${clampedX}px, ${y}px)`;
  }

  dispose(): void {
    this.layer.remove();
  }
}
