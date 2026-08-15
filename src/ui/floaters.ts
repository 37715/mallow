import * as THREE from "three";
import { icon } from "@/ui/icons";

/**
 * Coins and hearts that pop and arc out of the scene (§10). DOM elements
 * projected from a world position rather than 3D sprites — they stay crisp at
 * any resolution, cost no draw calls, and CSS does the easing for free.
 *
 * Each floater is positioned once at spawn and then animated purely by CSS, so
 * this costs nothing per frame.
 */

const FLOAT_DURATION_MS = 1150;
/** Hearts drift for longer — see the `heart-drift` keyframes. */
const HEART_DURATION_MS = 1500;
/**
 * Most floaters allowed on screen at once. A fully upgraded café pays several
 * times a second; past a handful of coins in flight the effect stops reading
 * as "lovely" and starts reading as visual noise, which is the same mistake
 * the coin *sound* made (see audio.ts).
 */
const MAX_ACTIVE = 8;

export type FloaterKind = "coin" | "heart";

export class FloaterLayer {
  private readonly layer: HTMLElement;
  private readonly ndc = new THREE.Vector3();

  constructor(root: HTMLElement) {
    this.layer = document.createElement("div");
    this.layer.className = "floater-layer";
    // Survives mountUI clearing the root — see the note there.
    this.layer.dataset.overlay = "";
    root.appendChild(this.layer);
  }

  /**
   * Spawn a floater at a world position. `label` is shown for coins ("+$5");
   * hearts ignore it.
   */
  spawn(worldPosition: THREE.Vector3, camera: THREE.Camera, kind: FloaterKind, label?: string): void {
    if (this.layer.childElementCount >= MAX_ACTIVE) return;
    this.ndc.copy(worldPosition).project(camera);
    if (this.ndc.z > 1) return; // behind the camera

    const x = (this.ndc.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-this.ndc.y * 0.5 + 0.5) * window.innerHeight;

    const el = document.createElement("div");
    el.className = `floater floater-${kind}`;
    if (kind === "coin") {
      // A coin *and* the amount: the disc is what reads at a glance from across
      // the room, the number is what tells you it was worth something.
      el.appendChild(icon("coin", "floater-coin-icon"));
      el.appendChild(document.createTextNode(label ?? ""));
    } else {
      // **A drawn heart, not the `♥` character.** §9's rule about never using
      // emoji applies just as much to dingbat glyphs: `♥` is the *font's* art,
      // it renders differently on every platform, and beside a soft low-poly
      // café and a hand-drawn icon set it was the cheapest-looking thing on
      // screen — which is exactly what Ellis said about it.
      el.appendChild(icon("heart", "floater-heart-icon"));
      // Vary the size a little, so a burst reads as several hearts rather than
      // one heart stamped three times.
      el.style.setProperty("--heart-scale", (0.78 + Math.random() * 0.44).toFixed(2));
    }

    // Randomised drift so a busy café doesn't look like a column of clones.
    // Hearts sway further sideways and rise a little further; coins stay
    // tighter, because a coin is reporting a number and wants to be read.
    const spread = kind === "heart" ? 78 : 54;
    const drift = (Math.random() - 0.5) * spread;
    const rise = (kind === "heart" ? 74 : 66) + Math.random() * 26;
    el.style.setProperty("--drift", `${drift.toFixed(1)}px`);
    el.style.setProperty("--rise", `${-rise.toFixed(1)}px`);
    el.style.setProperty("--tilt", `${(Math.random() - 0.5) * 24}deg`);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    this.layer.appendChild(el);
    // Hearts run longer than coins, so they must not be swept up early.
    window.setTimeout(() => el.remove(), kind === "heart" ? HEART_DURATION_MS : FLOAT_DURATION_MS);
  }

  /** A little burst of hearts, for petting a cat. */
  burstHearts(worldPosition: THREE.Vector3, camera: THREE.Camera, count = 4): void {
    for (let i = 0; i < count; i++) {
      // Staggered, and unevenly: three hearts on a metronome look mechanical.
      window.setTimeout(() => this.spawn(worldPosition, camera, "heart"), i * 70 + Math.random() * 60);
    }
  }
}
