import * as THREE from "three";
import type { Chore } from "@/data/chores";
import { icon } from "@/ui/icons";

/**
 * A sparkle floating on the thing that needs doing, which is the only way to
 * start a chore.
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

export interface ChoreMarker {
  /** Show the job that wants doing, or `null` for none. */
  set(chore: Chore | null): void;
  /** Re-project. Call after the camera has settled for the frame. */
  update(camera: THREE.Camera): void;
  dispose(): void;
}

export function createChoreMarker(
  root: HTMLElement,
  onPick: (chore: Chore) => void,
): ChoreMarker {
  const layer = document.createElement("div");
  layer.className = "chore-layer";
  // Survives `mountUI` clearing the root — see the note there.
  layer.dataset.overlay = "";

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
  let current: Chore | null = null;

  button.addEventListener("click", (e) => {
    e.stopPropagation();
    if (current) onPick(current);
  });

  return {
    set(chore) {
      if (chore?.id === current?.id) return;
      current = chore;
      layer.style.display = chore ? "" : "none";
      if (chore) {
        label.textContent = chore.action;
        anchor.set(chore.at.x, chore.at.y, chore.at.z);
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
