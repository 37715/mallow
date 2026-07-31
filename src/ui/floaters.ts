import * as THREE from "three";

/**
 * Coins and hearts that pop and arc out of the scene (§10). DOM elements
 * projected from a world position rather than 3D sprites — they stay crisp at
 * any resolution, cost no draw calls, and CSS does the easing for free.
 *
 * Each floater is positioned once at spawn and then animated purely by CSS, so
 * this costs nothing per frame.
 */

const FLOAT_DURATION_MS = 1150;
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
    el.textContent = kind === "coin" ? (label ?? "") : "♥";

    // Randomised drift so a busy café doesn't look like a column of clones.
    const drift = (Math.random() - 0.5) * 54;
    const rise = 66 + Math.random() * 26;
    el.style.setProperty("--drift", `${drift.toFixed(1)}px`);
    el.style.setProperty("--rise", `${-rise.toFixed(1)}px`);
    el.style.setProperty("--tilt", `${(Math.random() - 0.5) * 24}deg`);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    this.layer.appendChild(el);
    window.setTimeout(() => el.remove(), FLOAT_DURATION_MS);
  }

  /** A little burst of hearts, for petting a cat. */
  burstHearts(worldPosition: THREE.Vector3, camera: THREE.Camera, count = 3): void {
    for (let i = 0; i < count; i++) {
      window.setTimeout(() => this.spawn(worldPosition, camera, "heart"), i * 90);
    }
  }
}
