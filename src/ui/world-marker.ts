import * as THREE from "three";
import { markArt, type MarkArt } from "@/ui/chore-art";

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
  /** Which little picture it wears — the thing that needs doing (`ui/chore-art.ts`). */
  art: MarkArt;
  /** Where in the room it floats, in world units. */
  at: { x: number; y: number; z: number };
}

/**
 * How far off the anchor the badge floats, in CSS pixels.
 *
 * **The marker used to sit centred on the thing it was about**, which put a
 * pill straight across the glass it was asking you to clean. Ellis,
 * 2026-08-17: *"appear in better spot not in the way of stuff."* So it stands
 * off, with a stem back to the point — the map-pin arrangement, which is the
 * one layout that can point at something without covering it. The anchor still
 * has to be the *object*: the whole idea is that the café asks on the thing.
 */
const LIFT_PX = 42;

/**
 * Which side of the anchor the badge takes, as a fraction of screen height.
 *
 * **Up the screen means further into the room**, because the café is an
 * isometric diorama seen from one corner — so "float above it", the obvious
 * choice and the first one built, put a floor job's pill straight over the
 * counter and the till. Anything low on screen is better served hanging
 * *below*, out over the near floor and the empty backdrop.
 *
 * Two thresholds rather than one, and that is the whole reason this is not a
 * single `> 0.5`: the player can pan, and an anchor parked exactly on a single
 * threshold would flip sides every frame. The band between these is where it
 * keeps whatever side it already had.
 */
const FLIP_BELOW = 0.56;
const FLIP_ABOVE = 0.44;

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
  /**
   * The picture, and the only part of this that is not slate.
   *
   * Its own element rather than a background on the button, because the art is
   * an SVG that fills its box edge to edge and the badge clips it to a rounded
   * square — §9's "signage is dark" still holds for the pill; the badge is the
   * one warm, coloured thing on it, the way a photograph sits on a menu board.
   */
  const badge = document.createElement("span");
  badge.className = "chore-marker-art";
  const label = document.createElement("span");
  label.className = "chore-marker-label";
  /** The stem, so a badge floating above the job still clearly points at it. */
  const stem = document.createElement("span");
  stem.className = "chore-marker-stem";
  button.append(badge, label, stem);
  layer.appendChild(button);
  root.appendChild(layer);

  const ndc = new THREE.Vector3();
  const anchor = new THREE.Vector3();
  let current: WorldMark | null = null;
  /** Which side of the anchor the badge is on. See `FLIP_BELOW`. */
  let below = false;

  button.addEventListener("click", (e) => {
    e.stopPropagation();
    if (current) onPick(current);
  });

  return {
    set(mark) {
      // Both null is the common case — every frame with nothing to show — so
      // this still has to be cheap. It is correct now only because the layer
      // starts hidden; see the note there.
      if (mark?.id === current?.id) {
        /**
         * **Same thing, possibly a different number on it.**
         *
         * The id guard is about *identity* — it stops the arrival animation
         * replaying and the badge SVG being rebuilt sixty times a second — and
         * it was written when every label was a fixed phrase ("give it a
         * wipe"). The till's is live: it says how much is in the drawer, which
         * climbs while you watch. Skipping the whole update froze it at
         * whatever it happened to be when the marker appeared, so the pill
         * offered £640 long after there was £900 in the till.
         *
         * Compared as strings, so this writes only when the pounds actually
         * tick over rather than on every frame.
         */
        if (mark && current && mark.label !== current.label) {
          label.textContent = mark.label;
          current = mark;
        }
        return;
      }
      current = mark;
      layer.style.display = mark ? "" : "none";
      if (mark) {
        label.textContent = mark.label;
        // Replaced wholesale rather than diffed: each drawing carries its own
        // gradient ids (see `chore-art.ts`), so reusing a node across two
        // different jobs would leave the old defs behind.
        badge.replaceChildren(markArt(mark.art));
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

      // Which side has room — see `FLIP_BELOW`. Sticky between the two
      // thresholds so panning cannot make it flicker.
      const fraction = y / window.innerHeight;
      if (fraction > FLIP_BELOW) below = true;
      else if (fraction < FLIP_ABOVE) below = false;
      button.classList.toggle("chore-marker-below", below);

      // The translate order matters: the percentage pair resolves against the
      // element's own size, so it has to come first for the pixel offsets to
      // stay pixels.
      const anchorY = below ? "0%" : "-100%";
      const offsetY = below ? y + LIFT_PX : y - LIFT_PX;
      button.style.transform = `translate(-50%, ${anchorY}) translate(${x}px, ${offsetY}px)`;
    },

    dispose() {
      layer.remove();
    },
  };
}
