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
export class CatLabelLayer {
  private readonly layer: HTMLElement;
  private readonly labels = new Map<string, HTMLElement>();
  private readonly ndc = new THREE.Vector3();

  constructor(root: HTMLElement) {
    this.layer = document.createElement("div");
    this.layer.className = "cat-label-layer";
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
