import * as THREE from "three";
import { icon } from "@/ui/icons";

/**
 * The little order over a guest's head while they stand at the counter.
 *
 * **This is the menu becoming visible** (2026-09-08). The menu had been a
 * hidden multiplier since it shipped: you invented a drink, a number moved,
 * and no guest ever appeared to want anything — which is why the blend step of
 * the tutorial read as *"a bit random and unnecessary"* (Ellis). The order
 * chip is most of the fix, and the custom blends are the whole reason it
 * matters: the name the player typed, over the head of a stranger who chose
 * it. Naming a cat works because the name comes back at you (§8); this is the
 * same trick pointed at the menu.
 *
 * Same projection pattern as `CatLabelLayer`: DOM, `pointer-events: none`,
 * synced per frame after the camera settles.
 */

export interface OrderChipEntry {
  /** Visitor id — stable for the visit, so the chip animates in only once. */
  id: string;
  /** What they are ordering, in the player's own casing for a blend (§9). */
  text: string;
  /** Head height at the counter, world units. */
  at: THREE.Vector3;
}

export class OrderChipLayer {
  private readonly layer: HTMLElement;
  private readonly chips = new Map<string, HTMLElement>();
  private readonly ndc = new THREE.Vector3();

  constructor(root: HTMLElement) {
    this.layer = document.createElement("div");
    this.layer.className = "order-chip-layer";
    // Survives mountUI clearing the root — see the note there.
    this.layer.dataset.overlay = "";
    root.appendChild(this.layer);
  }

  sync(entries: OrderChipEntry[], camera: THREE.Camera): void {
    const active = new Set(entries.map((entry) => entry.id));
    for (const [id, el] of this.chips) {
      if (!active.has(id)) {
        el.remove();
        this.chips.delete(id);
      }
    }

    for (const entry of entries) {
      let el = this.chips.get(entry.id);
      if (!el) {
        el = document.createElement("div");
        el.className = "order-chip";
        /**
         * **A cup beside the name.** Ellis, 2026-09-08: *"when customers say
         * what they want i wanna see an icon of a coffee next to it too."* It
         * also does real work at this size: the chip is small, floats over a
         * busy room and is read in passing, so a shape says "this is a drink
         * order" a beat before the words are legible — and a player's own blend
         * can be called anything at all, so the words alone need not say
         * "coffee" anywhere.
         */
        const mark = document.createElement("span");
        mark.className = "order-chip-icon";
        mark.appendChild(icon("cup"));
        const label = document.createElement("span");
        label.textContent = entry.text;
        el.append(mark, label);
        this.layer.appendChild(el);
        this.chips.set(entry.id, el);
        // Next frame, so the transition actually runs — a class added in the
        // same frame as the element lands at its final state immediately.
        requestAnimationFrame(() => el?.classList.add("in"));
      }
      this.ndc.copy(entry.at).project(camera);
      const x = (this.ndc.x * 0.5 + 0.5) * this.layer.clientWidth;
      const y = (-this.ndc.y * 0.5 + 0.5) * this.layer.clientHeight;
      el.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
    }
  }

  dispose(): void {
    this.layer.remove();
  }
}
