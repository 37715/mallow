import * as THREE from "three";
import type { CatInstance } from "@/state/store";

export interface CatLabelAnchor {
  id: string;
  name: string;
  worldPosition: THREE.Vector3;
}

/**
 * DOM name pills projected from 3D cat positions. Pointer-events none —
 * labels never steal taps from the buy button.
 */
/**
 * A name that appears over someone's head for a moment and fades.
 *
 * Ellis: *"if i tap on my character i want a little name tag to appear for a
 * few seconds before fading away."* Deliberately temporary, unlike the cats':
 * a cat's name is a label on a collection you are building, and yours is a
 * reminder — permanently captioning the player's own avatar would be noise
 * on the one character they can never forget the name of.
 */
export class NameTag {
  private readonly element: HTMLElement;
  private readonly ndc = new THREE.Vector3();
  private hideAt = 0;
  private anchor: THREE.Vector3 | null = null;

  constructor(root: HTMLElement) {
    this.element = document.createElement("div");
    this.element.className = "name-tag";
    this.element.dataset.overlay = "";
    root.appendChild(this.element);
  }

  show(name: string, anchor: THREE.Vector3, now: number, holdMs = 2600): void {
    this.element.textContent = name;
    this.anchor = anchor;
    this.hideAt = now + holdMs;
    this.element.classList.add("visible");
  }

  update(camera: THREE.Camera, now: number): void {
    const anchor = this.anchor;
    if (!anchor) return;
    if (now > this.hideAt) {
      this.element.classList.remove("visible");
      // Kept anchored through the fade, so it doesn't jump on the way out.
      if (now > this.hideAt + 700) this.anchor = null;
    }
    this.ndc.copy(anchor).project(camera);
    if (this.ndc.z > 1) {
      this.element.style.visibility = "hidden";
      return;
    }
    const x = (this.ndc.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-this.ndc.y * 0.5 + 0.5) * window.innerHeight;
    this.element.style.visibility = "visible";
    this.element.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
  }
}

export class CatLabelLayer {
  private readonly layer: HTMLElement;
  private readonly labels = new Map<string, HTMLElement>();
  private readonly ndc = new THREE.Vector3();

  constructor(root: HTMLElement) {
    this.layer = document.createElement("div");
    this.layer.className = "cat-label-layer";
    // Survives mountUI clearing the root — see the note there.
    this.layer.dataset.overlay = "";
    root.appendChild(this.layer);
  }

  sync(cats: CatInstance[], anchors: CatLabelAnchor[], camera: THREE.Camera): void {
    const active = new Set(cats.map((c) => c.id));

    for (const [id, el] of this.labels) {
      if (!active.has(id)) {
        el.remove();
        this.labels.delete(id);
      }
    }

    for (const cat of cats) {
      let el = this.labels.get(cat.id);
      if (!el) {
        el = document.createElement("div");
        el.className = "cat-name-label";
        el.textContent = cat.name;
        this.layer.appendChild(el);
        this.labels.set(cat.id, el);
      } else if (el.textContent !== cat.name) {
        el.textContent = cat.name;
      }

      const anchor = anchors.find((a) => a.id === cat.id);
      if (!anchor) {
        el.style.visibility = "hidden";
        continue;
      }

      this.ndc.copy(anchor.worldPosition).project(camera);
      const behind = this.ndc.z > 1;
      if (behind) {
        el.style.visibility = "hidden";
        continue;
      }

      const x = (this.ndc.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-this.ndc.y * 0.5 + 0.5) * window.innerHeight;
      el.style.visibility = "visible";
      el.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
    }
  }
}
