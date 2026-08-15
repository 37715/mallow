import * as THREE from "three";
import { FRAME_BOX, FRAME_CENTER, VIEW_OFFSET, applyCameraPose, solveFitDistance } from "@/scene/camera";

/**
 * Free camera: drag to pan, pinch or wheel to zoom (§8 "The café editor").
 *
 * **Pan and zoom only — the view angle is fixed, and that is a constraint of
 * the art, not laziness.** The café is a *cutaway diorama*: it has two walls,
 * on −x and −z, and the whole asset pack is authored to be seen from the open
 * corner at 45° (§9). Orbiting even a little past that starts showing the room
 * through the missing walls, and orbiting behind it shows the blank outsides of
 * the two that exist. A limited azimuth swing — perhaps ±25° — could work and
 * would add a lot of life; it needs the wall set checked at the extremes first.
 *
 * Two things this must not break, both of which have bitten before:
 *
 * 1. **§9's framing rule.** Zoom-out is clamped to the solved fit distance, so
 *    the widest view is exactly the correctly-framed café and never further.
 *    Pan is clamped to the frame box footprint, so you cannot lose the room off
 *    the side of the screen and be stranded looking at nothing.
 * 2. **Tap-to-pet (§10).** A drag that happens to finish on a cat must not pet
 *    it. Petting therefore fires on pointer *up*, and only if the gesture stayed
 *    under a small movement threshold — see `TAP_SLOP_PX`.
 */

/** Movement below this (CSS px, total path) still counts as a tap, not a drag. */
const TAP_SLOP_PX = 10;

/**
 * How long a press must be held to count as a hold.
 *
 * **Press-and-hold is back** (2026-08-13). It was removed on 2026-08-10 when
 * everything moved into the shop, and Ellis asked for it again once the shop
 * existed: *"reintroduce the hold thingy so i can hold (only on furniture and
 * deco) for a little tab to pop up."* Both decisions were right — the shop had
 * to become the one clear place first, and *then* a shortcut to the piece
 * under your finger is a convenience rather than a competing interface.
 *
 * The plumbing is the part to respect. A hold has to be cancelled by movement
 * past the tap slop, by a second finger and by an early release, and a
 * *completed* hold must suppress the tap that follows it — or letting go pets
 * the cat behind the menu.
 *
 * 450ms: short enough not to feel like waiting, long enough that a deliberate
 * tap never trips it. The filling ring is what makes the wait legible.
 */
const HOLD_MS = 450;

/** How far in you can zoom, as a fraction of the fitted distance. */
const MIN_ZOOM_FRACTION = 0.32;

/**
 * Time constant for *eased* camera moves — `focusOn`, `reset`, wheel zoom.
 * §10 says nothing in this game snaps, and that still holds for moves the game
 * makes on the player's behalf.
 *
 * **A drag is not one of those.** Smoothing a direct manipulation is exactly
 * what reads as lag: the room lags behind the finger by the whole time
 * constant, and it was the first thing Ellis said about the camera —
 * "camera moving feels sluggish". While a finger is actually panning or
 * pinching, the camera tracks 1:1 with no smoothing at all.
 */
const SMOOTH_TAU_MS = 55;

/** Wheel notch → fraction of current distance. */
const WHEEL_SENSITIVITY = 0.0012;

export interface CameraControls {
  /**
   * Call once per frame, before rendering. `dtMs` is for tests, which need to
   * advance the easing deterministically rather than at wall-clock speed.
   */
  update(dtMs?: number): void;
  /** Current smoothed pose. Exposed for tests and debug overlays (§17). */
  getPose(): { target: THREE.Vector3; distance: number; fitDistance: number };
  /** Re-solve the fitted distance and re-clamp. Call on resize. */
  onResize(aspect: number): void;
  /**
   * Ease a world point into clear view above the docked editor sheet.
   *
   * Centring it is not enough: the sheet covers the bottom ~40% of a phone
   * screen, so a piece at dead centre is right on its edge. `screenBias` lifts
   * the point that fraction of a screen-height higher.
   */
  /**
   * Ease the camera onto a point.
   *
   * `zoom` is a fraction of the *fitted* distance — pass it to move in as well
   * as across. Placement uses it: a translucent ghost at the far side of a
   * three-square café is genuinely hard to find, and "where did the thing I
   * just bought go" is not a puzzle worth having (Ellis, 2026-08-13).
   */
  focusOn(point: THREE.Vector3, screenBias?: number, zoom?: number): void;
  /** Ease back to the default framing. */
  reset(): void;
  dispose(): void;
}

export interface CameraControlsOptions {
  canvas: HTMLCanvasElement;
  camera: THREE.PerspectiveCamera;
  /**
   * Fired for a tap (a press that didn't turn into a drag), in normalised
   * device coordinates ready for a raycaster.
   */
  onTap?: (ndc: THREE.Vector2) => void;
  /**
   * Press-and-hold, in four parts.
   *
   * `onHoldStart` fires the instant a single finger goes down so the caller
   * can decide whether this target is holdable at all and show the ring only
   * if so — the ring appearing *is* the affordance, so it must not appear over
   * something that does nothing. `onHoldProgress` runs each frame with 0→1.
   */
  onHoldStart?: (ndc: THREE.Vector2) => void;
  onHoldProgress?: (t: number) => void;
  onHoldCancel?: () => void;
  onHoldComplete?: (ndc: THREE.Vector2) => void;
  /** Raised while the user is actively manipulating the camera, so the frame
   *  rate can be lifted for the duration (§ core/loop.ts). */
  onInteractionChange?: (active: boolean) => void;
  /**
   * Return false to suspend camera panning — used while a piece of furniture
   * is being dragged, so the drag belongs to the piece and not the room.
   *
   * It is asked **per drag, not per frame**: a drag either grabs the piece or
   * moves the camera, decided where the finger first went down, and does not
   * change its mind halfway.
   */
  shouldPan?: () => boolean;
  /** A finger went down. The caller can decide here whether this gesture
   *  belongs to something in the scene, which is what `shouldPan` then reports. */
  onDragStart?: (ndc: THREE.Vector2) => void;
  /** Every drag move, whether or not the camera consumed it. */
  onDragMove?: (ndc: THREE.Vector2) => void;
}

interface Pointer {
  x: number;
  y: number;
}

export function createCameraControls(options: CameraControlsOptions): CameraControls {
  const { canvas, camera, onTap, onInteractionChange } = options;
  const { shouldPan, onDragStart, onDragMove } = options;
  const { onHoldStart, onHoldProgress, onHoldCancel, onHoldComplete } = options;

  /** Where we're looking. Panning moves this across the ground plane. */
  const target = FRAME_CENTER.clone();
  const desiredTarget = FRAME_CENTER.clone();

  let fitDistance = solveFitDistance(camera, camera.aspect);
  let distance = fitDistance;
  let desiredDistance = fitDistance;

  const pointers = new Map<number, Pointer>();
  let travelled = 0;
  let pinchDistance = 0;
  let interacting = false;

  /** True once a press has become a real pan/pinch, as opposed to a tap. */
  let directDrag = false;
  /**
   * True once a gesture has ever had two fingers down.
   *
   * Without it a pinch that barely moves reports a *tap* on the second
   * release: by then the first finger is already out of the map, so the
   * "exactly one pointer" test passes and the slop test passes too. The
   * symptom is pinch-zooming over a cat and petting it by accident. (This hole
   * predates the removal of press-and-hold; the hold flag happened to mask it
   * for slow pinches and never covered quick ones.)
   */
  let multiTouch = false;

  /** Hold state. `holding` is "a press is in flight and still eligible". */
  let holding = false;
  let holdFired = false;
  let holdStartedAt = 0;
  const holdNdc = new THREE.Vector2();

  function cancelHold(): void {
    if (!holding) return;
    holding = false;
    onHoldCancel?.();
  }
  let lastFrameAt = 0;

  // Screen-aligned pan axes on the horizontal plane. The view angle is fixed,
  // so these are constants: `right` is screen-right, `forward` is screen-up
  // projected onto the ground.
  const worldUp = new THREE.Vector3(0, 1, 0);
  const forwardDir = VIEW_OFFSET.clone().negate();
  const right = new THREE.Vector3().crossVectors(forwardDir, worldUp).normalize();
  const groundForward = new THREE.Vector3().crossVectors(worldUp, right).normalize();

  function setInteracting(active: boolean): void {
    if (interacting === active) return;
    interacting = active;
    onInteractionChange?.(active);
  }

  function clampTarget(): void {
    // Keep the look-at point over the café. Without this you can pan the room
    // off screen and be left staring at the backdrop with no way back.
    desiredTarget.x = THREE.MathUtils.clamp(desiredTarget.x, FRAME_BOX.min.x, FRAME_BOX.max.x);
    desiredTarget.z = THREE.MathUtils.clamp(desiredTarget.z, FRAME_BOX.min.z, FRAME_BOX.max.z);
    desiredTarget.y = FRAME_CENTER.y;
  }

  function clampDistance(): void {
    desiredDistance = THREE.MathUtils.clamp(
      desiredDistance,
      fitDistance * MIN_ZOOM_FRACTION,
      fitDistance,
    );
  }

  /** World units per CSS pixel at the current distance — so a dragged point
   *  stays under the finger regardless of how zoomed in we are. */
  function worldPerPixel(): number {
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    return (2 * distance * tanV) / canvas.clientHeight;
  }

  function centroid(): Pointer {
    let x = 0;
    let y = 0;
    for (const p of pointers.values()) {
      x += p.x;
      y += p.y;
    }
    return { x: x / pointers.size, y: y / pointers.size };
  }

  function spread(): number {
    const list = [...pointers.values()];
    if (list.length < 2) return 0;
    return Math.hypot(list[0].x - list[1].x, list[0].y - list[1].y);
  }

  let lastCentroid: Pointer = { x: 0, y: 0 };

  function toNdc(clientX: number, clientY: number, into: THREE.Vector2): THREE.Vector2 {
    const rect = canvas.getBoundingClientRect();
    return into.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
  }

  function onPointerDown(event: PointerEvent): void {
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    lastCentroid = centroid();
    pinchDistance = spread();

    if (pointers.size === 1) {
      travelled = 0;
      multiTouch = false;
      holdFired = false;
      holding = true;
      holdStartedAt = performance.now();
      toNdc(event.clientX, event.clientY, holdNdc);
      onHoldStart?.(holdNdc);
      onDragStart?.(toNdc(event.clientX, event.clientY, new THREE.Vector2()));
    } else {
      multiTouch = true;
      // A second finger means this is a pinch, not a hold.
      cancelHold();
    }
    setInteracting(true);
  }

  function onPointerMove(event: PointerEvent): void {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const now = centroid();
    const dx = now.x - lastCentroid.x;
    const dy = now.y - lastCentroid.y;
    travelled += Math.hypot(dx, dy);

    // Past the slop this is a pan, and the camera should start tracking the
    // finger exactly.
    if (travelled >= TAP_SLOP_PX) {
      cancelHold();
      directDrag = true;
    }
    if (pointers.size >= 2) directDrag = true;

    onDragMove?.(toNdc(now.x, now.y, new THREE.Vector2()));

    // Pan: move the target so the scene tracks the finger.
    if (shouldPan === undefined || shouldPan()) {
      const scale = worldPerPixel();
      desiredTarget.addScaledVector(right, -dx * scale);
      desiredTarget.addScaledVector(groundForward, dy * scale);
      clampTarget();
    }

    // Pinch: fingers apart = zoom in.
    if (pointers.size >= 2) {
      const nextSpread = spread();
      if (pinchDistance > 0 && nextSpread > 0) {
        desiredDistance *= pinchDistance / nextSpread;
        clampDistance();
      }
      pinchDistance = nextSpread;
    }

    lastCentroid = now;
  }

  function endPointer(event: PointerEvent): void {
    if (!pointers.has(event.pointerId)) return;
    // A completed hold consumes the gesture: releasing after the menu has
    // opened must not also register as a tap and pet whatever is underneath.
    const wasTap =
      pointers.size === 1 && travelled < TAP_SLOP_PX && !multiTouch && !holdFired;
    cancelHold();
    pointers.delete(event.pointerId);

    if (wasTap && onTap) {
      onTap(toNdc(event.clientX, event.clientY, new THREE.Vector2()));
    }

    if (pointers.size > 0) {
      // A finger lifted mid-pinch: re-baseline so the remaining one doesn't
      // jump the view by the distance between them.
      lastCentroid = centroid();
      pinchDistance = spread();
    } else {
      directDrag = false;
      multiTouch = false;
      setInteracting(false);
    }
  }

  function onWheel(event: WheelEvent): void {
    event.preventDefault();
    desiredDistance *= 1 + event.deltaY * WHEEL_SENSITIVITY;
    clampDistance();
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  return {
    update(dtMs?: number) {
      const now = performance.now();
      const dt = dtMs ?? (lastFrameAt ? Math.min(120, now - lastFrameAt) : 16);
      lastFrameAt = now;

      if (holding) {
        const t = (performance.now() - holdStartedAt) / HOLD_MS;
        onHoldProgress?.(Math.min(1, t));
        if (t >= 1) {
          holding = false;
          holdFired = true;
          onHoldComplete?.(holdNdc);
        }
      }

      // 1:1 while the finger is driving; eased otherwise. Framing the easing
      // as a time constant rather than a per-frame fraction also makes it
      // behave the same at the 30fps idle cap and the 60fps interactive one.
      const alpha = directDrag ? 1 : 1 - Math.exp(-dt / SMOOTH_TAU_MS);
      target.lerp(desiredTarget, alpha);
      distance += (desiredDistance - distance) * alpha;
      applyCameraPose(camera, target, distance);
    },

    getPose() {
      return { target: target.clone(), distance, fitDistance };
    },

    onResize(aspect: number) {
      // The fit distance is aspect-dependent (§9), so a rotation or a resize
      // changes the zoom-out limit. Preserve how far *in* the player was.
      const zoom = distance / fitDistance;
      fitDistance = solveFitDistance(camera, aspect);
      desiredDistance = fitDistance * zoom;
      clampDistance();
      clampTarget();
    },

    focusOn(point: THREE.Vector3, screenBias = 0.18, zoom?: number) {
      if (zoom !== undefined) {
        desiredDistance = fitDistance * zoom;
        clampDistance();
      }
      const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      const worldScreenHeight = 2 * desiredDistance * tanV;
      // Negative along groundForward moves the target toward the camera, which
      // pushes the object *up* the screen — the mirror of a downward drag.
      desiredTarget
        .copy(point)
        .addScaledVector(groundForward, -worldScreenHeight * screenBias);
      clampTarget();
    },

    reset() {
      desiredTarget.copy(FRAME_CENTER);
      desiredDistance = fitDistance;
    },

    dispose() {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endPointer);
      canvas.removeEventListener("pointercancel", endPointer);
      canvas.removeEventListener("wheel", onWheel);
    },
  };
}
