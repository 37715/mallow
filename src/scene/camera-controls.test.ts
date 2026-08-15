import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { createCameraControls } from "@/scene/camera-controls";
import { CAMERA_FOV, FRAME_BOX, FRAME_CENTER } from "@/scene/camera";

/**
 * The free camera, tested without a DOM. The controls only ever touch a
 * handful of canvas members, so a stub is enough — and it lets these run in
 * the fast node suite alongside the rest of the spatial assertions (§17).
 *
 * The two properties worth pinning are the ones that would fail *silently* and
 * only on a device: you must never be able to zoom out past a correctly-framed
 * café (§9's whole reason for existing), and a drag must never pet a cat.
 */

/** iPhone 14 Pro — the aspect §9 says to sanity-check framing at. */
const WIDTH = 393;
const HEIGHT = 852;

function harness() {
  const handlers = new Map<string, ((event: unknown) => void)[]>();
  const canvas = {
    clientWidth: WIDTH,
    clientHeight: HEIGHT,
    addEventListener(type: string, fn: (event: unknown) => void) {
      const list = handlers.get(type) ?? [];
      list.push(fn);
      handlers.set(type, list);
    },
    removeEventListener() {},
    setPointerCapture() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: WIDTH, height: HEIGHT }),
  } as unknown as HTMLCanvasElement;

  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, WIDTH / HEIGHT, 0.1, 100);
  const onTap = vi.fn();
  const controls = createCameraControls({ canvas, camera, onTap });

  function fire(type: string, event: Record<string, unknown>) {
    for (const fn of handlers.get(type) ?? []) fn(event);
  }

  /**
   * Run enough frames for the easing to converge. A fixed dt is passed
   * explicitly: these run far faster than wall-clock, so measuring real time
   * would give a dt near zero and the camera would never actually move.
   */
  function settle() {
    for (let i = 0; i < 200; i++) controls.update(16);
  }

  /** A press, an optional path, and a release — one finger. */
  function gesture(path: Array<[number, number]>) {
    const [start] = path;
    fire("pointerdown", { pointerId: 1, clientX: start[0], clientY: start[1] });
    for (const [x, y] of path.slice(1)) {
      fire("pointermove", { pointerId: 1, clientX: x, clientY: y });
    }
    const [endX, endY] = path[path.length - 1];
    fire("pointerup", { pointerId: 1, clientX: endX, clientY: endY });
  }

  return {
    controls,
    camera,
    onTap,
    fire,
    settle,
    gesture,
  };
}

describe("camera controls — zoom", () => {
  it("never zooms out past the framing the café is solved for", () => {
    const { controls, settle, fire } = harness();
    const { fitDistance } = controls.getPose();

    // Spin the wheel far harder than any real gesture.
    for (let i = 0; i < 200; i++) fire("wheel", { deltaY: 500, preventDefault() {} });
    settle();

    expect(controls.getPose().distance).toBeLessThanOrEqual(fitDistance + 1e-6);
  });

  it("stops zooming in before the camera ends up inside the furniture", () => {
    const { controls, settle, fire } = harness();
    const { fitDistance } = controls.getPose();

    for (let i = 0; i < 200; i++) fire("wheel", { deltaY: -500, preventDefault() {} });
    settle();

    const { distance } = controls.getPose();
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(fitDistance);
  });

  it("starts at the fitted distance, and reset returns to it", () => {
    const { controls, settle, fire } = harness();
    const { fitDistance } = controls.getPose();

    for (let i = 0; i < 40; i++) fire("wheel", { deltaY: -100, preventDefault() {} });
    settle();
    expect(controls.getPose().distance).toBeLessThan(fitDistance - 0.01);

    controls.reset();
    settle();
    expect(controls.getPose().distance).toBeCloseTo(fitDistance, 3);
    expect(controls.getPose().target.distanceTo(FRAME_CENTER)).toBeLessThan(0.01);
  });
});

describe("camera controls — pan", () => {
  it("keeps the look-at point over the café however hard you drag", () => {
    for (const [dx, dy] of [
      [4000, 0],
      [-4000, 0],
      [0, 4000],
      [0, -4000],
    ]) {
      const { controls, settle, gesture } = harness();
      // A long path, so the clamp is exercised continuously rather than once.
      const path: Array<[number, number]> = [];
      for (let i = 0; i <= 40; i++) path.push([200 + (dx * i) / 40, 400 + (dy * i) / 40]);
      gesture(path);
      settle();

      const { target } = controls.getPose();
      expect(target.x).toBeGreaterThanOrEqual(FRAME_BOX.min.x - 1e-6);
      expect(target.x).toBeLessThanOrEqual(FRAME_BOX.max.x + 1e-6);
      expect(target.z).toBeGreaterThanOrEqual(FRAME_BOX.min.z - 1e-6);
      expect(target.z).toBeLessThanOrEqual(FRAME_BOX.max.z + 1e-6);
    }
  });

  it("pans the scene the way the finger moves", () => {
    const { controls, settle, gesture } = harness();
    // Drag right: the room should follow the finger, which means the camera's
    // look-at point travels left — i.e. screen-right in world terms decreases.
    gesture([
      [200, 400],
      [260, 400],
      [320, 400],
    ]);
    settle();

    const moved = controls.getPose().target.clone().sub(FRAME_CENTER);
    expect(moved.length()).toBeGreaterThan(0.01);
    // Screen-right at a 45° azimuth is +x/−z, so following the finger rightward
    // moves the target the other way: −x and +z.
    expect(moved.x).toBeLessThan(0);
    expect(moved.z).toBeGreaterThan(0);
  });

  it("pans a consistent world distance per pixel at any zoom", () => {
    const drag = (zoomIn: boolean) => {
      const { controls, settle, gesture, fire } = harness();
      if (zoomIn) {
        for (let i = 0; i < 40; i++) fire("wheel", { deltaY: -100, preventDefault() {} });
        settle();
      }
      gesture([
        [200, 400],
        [250, 400],
      ]);
      settle();
      return controls.getPose().target.distanceTo(FRAME_CENTER);
    };

    // Zoomed in, the same 50px drag must cover *less* world distance, or the
    // room slides out from under your finger.
    expect(drag(true)).toBeLessThan(drag(false));
  });
});

describe("camera controls — tap vs drag", () => {
  it("reports a tap when the finger barely moves", () => {
    const { onTap, gesture } = harness();
    gesture([
      [200, 400],
      [202, 401],
    ]);
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it("does not pet a cat at the end of a drag", () => {
    const { onTap, gesture } = harness();
    gesture([
      [200, 400],
      [240, 430],
      [300, 500],
      [200, 400], // finishes exactly where it started — still a drag
    ]);
    expect(onTap).not.toHaveBeenCalled();
  });

  it("hands back normalised device coordinates a raycaster can use", () => {
    const { onTap, gesture } = harness();
    gesture([[WIDTH / 2, HEIGHT / 2]]);

    const ndc = onTap.mock.calls[0][0] as THREE.Vector2;
    expect(ndc.x).toBeCloseTo(0, 5);
    expect(ndc.y).toBeCloseTo(0, 5);
  });
});

describe("camera controls — resize", () => {
  it("keeps how far you were zoomed in when the aspect changes", () => {
    const { controls, settle, fire } = harness();
    for (let i = 0; i < 40; i++) fire("wheel", { deltaY: -100, preventDefault() {} });
    settle();
    const before = controls.getPose();
    const zoomBefore = before.distance / before.fitDistance;

    controls.onResize(HEIGHT / WIDTH); // rotate to landscape
    settle();

    const after = controls.getPose();
    expect(after.fitDistance).not.toBeCloseTo(before.fitDistance, 2);
    expect(after.distance / after.fitDistance).toBeCloseTo(zoomBefore, 2);
  });
});

/**
 * Tapping, now that press-and-hold is gone (see `camera-controls.ts`).
 *
 * The rule that still matters is the one that survived the removal: a press
 * that turns into a pan must not also report a tap, or every drag that happens
 * to end on a cat pets it.
 */
describe("camera controls — tapping", () => {
  const press = (h: ReturnType<typeof harness>, x = 200, y = 400) =>
    h.fire("pointerdown", { pointerId: 1, clientX: x, clientY: y });
  const release = (h: ReturnType<typeof harness>, x = 200, y = 400) =>
    h.fire("pointerup", { pointerId: 1, clientX: x, clientY: y });

  it("reports a press and release in the same place as a tap", () => {
    const h = harness();
    press(h);
    release(h);
    expect(h.onTap).toHaveBeenCalledTimes(1);
  });

  it("does not report a tap when the press became a pan", () => {
    const h = harness();
    press(h);
    h.fire("pointermove", { pointerId: 1, clientX: 260, clientY: 440 });
    release(h, 260, 440);
    expect(h.onTap).not.toHaveBeenCalled();
  });

  it("does not report a tap for a pinch", () => {
    const h = harness();
    press(h);
    h.fire("pointerdown", { pointerId: 2, clientX: 300, clientY: 500 });
    release(h);
    h.fire("pointerup", { pointerId: 2, clientX: 300, clientY: 500 });
    expect(h.onTap).not.toHaveBeenCalled();
  });
});
