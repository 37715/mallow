import * as THREE from "three";
import { icon } from "@/ui/icons";

/**
 * A sparkle floating on something in the room that wants tapping.
 *
 * Two things use it: a chore that has come due, and a tip jar that has filled
 * up. Both are the same idea — **the café asking, on the thing itself** —
 *
 * **This replaced a button in the HUD**, and the replacement is the point:
 * Ellis, 2026-08-26, *"make it be popping up from or next to the window, so the
 * user has to tap on the window to do it."* A row in the interface is a to-do
 * list — it tells you a job exists and nothing else. A mark on the glass is the
 * café asking, and it teaches you where the job *is* at the same time, which
 * matters as soon as there is more than one kind.
 *
 * DOM projected from world space, the same trick as `ui/floaters.ts` and
 * `ui/cat-labels.ts`: crisp at any pixel ratio, no draw calls, and — the part
 * that actually decides it here — **a real tap target**. A 3D sprite would have
 * to fight the furniture picker for raycasts.
 */

/** Something in the room asking to be tapped. */
export interface WorldMark {
  /** Stable identity, so re-setting the same mark does not restart its arrival. */
  id: string;
  /** The verb on the pill. */
  label: string;
  /** Where in the room it floats, in world units. */
  at: { x: number; y: number; z: number };
}

export interface WorldMarker {
  /** Show a mark, or `null` for none. */
  set(mark: WorldMark | null): void;
  /** Re-project. Call after the camera has settled for the frame. */
  update(camera: THREE.Camera): void;
  dispose(): void;
}

export function createWorldMarker(
  root: HTMLElement,
  onPick: (mark: WorldMark) => void,
): WorldMarker {
  const layer = document.createElement("div");
  layer.className = "chore-layer";
  // Survives `mountUI` clearing the root — see the note there.
  layer.dataset.overlay = "";
  /**
   * **Hidden until there is something to point at.**
   *
   * It was created visible, and `set(null)` returned early because
   * `null?.id === null?.id` — so the button sat at its untransformed origin,
   * the very top-left corner of the screen, from boot until a chore came due.
   * Ellis saw it during the walkthrough, which is exactly the moment the whole
   * feature is gated *off*. A guard that compares only ids cannot tell "same
   * as before" from "nothing, and nothing has been done about it yet"; the
   * initial state has to be the hidden one.
   */
  layer.style.display = "none";

  const button = document.createElement("button");
  button.className = "chore-marker";
  button.type = "button";
  button.setAttribute("aria-label", "something needs doing");
  const spark = document.createElement("span");
  spark.className = "chore-marker-spark";
  spark.appendChild(icon("sparkle"));
  const label = document.createElement("span");
  label.className = "chore-marker-label";
  button.append(spark, label);
  layer.appendChild(button);
  root.appendChild(layer);

  const ndc = new THREE.Vector3();
  const anchor = new THREE.Vector3();
  let current: WorldMark | null = null;

  button.addEventListener("click", (e) => {
    e.stopPropagation();
    if (current) onPick(current);
  });

  return {
    set(mark) {
      // Both null is the common case — every frame with nothing to show — so
      // this still has to be cheap. It is correct now only because the layer
      // starts hidden; see the note there.
      if (mark?.id === current?.id) return;
      current = mark;
      layer.style.display = mark ? "" : "none";
      if (mark) {
        label.textContent = mark.label;
        anchor.set(mark.at.x, mark.at.y, mark.at.z);
        // Re-run the entrance every time one comes due, so it reads as
        // arriving rather than as having always been there.
        button.classList.remove("chore-marker-in");
        void button.offsetWidth;
        button.classList.add("chore-marker-in");
      }
    },

    update(camera) {
      if (!current) return;
      ndc.copy(anchor).project(camera);
      // Behind the camera, or panned off the side: hide rather than clamp. A
      // marker clamped to the edge of the screen points at nothing, and the
      // player can always pan back to find it.
      if (ndc.z > 1 || ndc.x < -1.1 || ndc.x > 1.1 || ndc.y < -1.1 || ndc.y > 1.1) {
        button.style.visibility = "hidden";
        return;
      }
      button.style.visibility = "visible";
      const x = (ndc.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-ndc.y * 0.5 + 0.5) * window.innerHeight;
      button.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    },

    dispose() {
      layer.remove();
    },
  };
}
