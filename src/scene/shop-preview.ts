import * as THREE from "three";
import { loadCafeAssets } from "@/scene/asset-library";
import { createPreviewStage } from "@/scene/preview-stage";

/**
 * The spinning, hovering item in the shop (§8 step 5).
 *
 * Ellis: *"big floating item of furniture spinning and hovering with price tag
 * … like beautiful visuals. dont want some boring wall of text."* Right — a
 * café-building game selling furniture through a price list is selling the
 * wrong thing. The furniture *is* the product.
 *
 * **It shares the main renderer rather than making its own.** A second
 * `WebGLRenderer` would be simpler to reason about, but WebGL resources are
 * per-context: the café atlas would be uploaded to the GPU a second time, on a
 * phone, for a panel. Instead this renders on top of the finished frame — one
 * context, one atlas, and the geometry is the very same cached objects the
 * room is built from.
 *
 * The compositing itself lives in `scene/preview-stage.ts`, which is also what
 * antialiases it; read that file before changing how this reaches the screen.
 */

/** Comfortable framing for a single object, whatever its size. */
const VIEW_ANGLE_DEG = 22;
const FILL = 1.5;

export interface ShopPreview {
  /** Swipe to turn it. Adds to the turntable rather than replacing it. */
  swivel(deltaRadians: number): void;
  /** Show this asset. Null clears. */
  setItem(assetName: string | null): void;
  /** Draw into a screen-space rect (CSS pixels, origin top-left). */
  render(renderer: THREE.WebGLRenderer, rect: DOMRect, now: number): void;
  dispose(): void;
}

export function createShopPreview(environment: THREE.Texture | null): ShopPreview {
  const scene = new THREE.Scene();
  scene.environment = environment;
  scene.environmentIntensity = 4.4;

  // **These numbers were measured, not chosen, and that is why they look
  // nothing like `addLighting`'s.** This stage is where colourways are picked
  // now, so a piece has to appear here in the colour it will be in the room —
  // a picker that lies is a broken control, not a cosmetic difference. The
  // room's own chair is lit by the window spot and lifted by bloom, neither of
  // which a bare turntable has, so matching it takes far more direct light
  // than the room's 0.55/0.30 would suggest.
  //
  // Tuned by sampling the same asset in both places rather than by eye: the
  // olive sofa reads (153,124,55) in the café and (150,124,48) here. Re-measure
  // the same way if you touch these — see §9's "quantise it" rule.
  scene.add(new THREE.AmbientLight(0xfff3e4, 2.9));
  const key = new THREE.DirectionalLight(0xfff7e8, 2.8);
  key.position.set(2.5, 4, 3);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd9a8, 1.3);
  rim.position.set(-3, 1.5, -2);
  scene.add(rim);

  /**
   * A translucent backdrop, sized to fill the stage. Without it the café shows
   * through *behind* the item at full brightness — the piece stops reading as
   * a display object and starts reading as clutter over the room. Kept
   * slightly transparent on purpose, so you can still see the café it's going
   * into.
   */
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: 0x2b211a, transparent: true, opacity: 0.82 }),
  );
  backdrop.renderOrder = -1;
  scene.add(backdrop);

  const pivot = new THREE.Group();
  scene.add(pivot);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 60);
  const stage = createPreviewStage();
  let current: THREE.Object3D | null = null;
  let radius = 1;
  let requested: string | null = null;
  /** Swipe offset, added to the turntable so touching it never stops it. */
  let manualSpin = 0;

  async function load(name: string): Promise<void> {
    const assets = await loadCafeAssets();
    // A slower tap may have moved on while this awaited.
    if (requested !== name) return;
    if (current) pivot.remove(current);

    const object = assets.create(name);
    if (!object) {
      current = null;
      return;
    }
    // Centre it on the pivot so it spins about itself rather than orbiting.
    const box = new THREE.Box3().setFromObject(object);
    const centre = box.getCenter(new THREE.Vector3());
    object.position.sub(centre);
    radius = Math.max(0.25, box.getSize(new THREE.Vector3()).length() / 2);

    pivot.add(object);
    current = object;
  }

  return {
    swivel(deltaRadians) {
      manualSpin += deltaRadians;
    },

    setItem(assetName) {
      // **Idempotent, because the caller re-applies every frame.** The panel
      // refreshes its whole view each tick (prices grey in as the till fills),
      // so without this guard the same piece was cloned out of the asset
      // library thirty times a second for as long as the shop was open.
      if (requested === assetName) return;
      requested = assetName;
      if (!assetName) {
        if (current) pivot.remove(current);
        current = null;
        return;
      }
      void load(assetName);
    },

    render(renderer, rect, now) {
      if (!current || rect.width < 4 || rect.height < 4) return;

      const t = now / 1000;
      pivot.rotation.y = manualSpin + t * 0.55;
      // Hover: a slow bob, plus the faintest tilt so it reads as floating
      // rather than as mounted on a spindle.
      pivot.position.y = Math.sin(t * 1.1) * radius * 0.06;
      pivot.rotation.z = Math.sin(t * 0.9) * 0.025;

      const aspect = rect.width / rect.height;
      camera.aspect = aspect;
      const distance = (radius * FILL) / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      const elevation = THREE.MathUtils.degToRad(VIEW_ANGLE_DEG);
      camera.position.set(0, Math.sin(elevation) * distance, Math.cos(elevation) * distance);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();

      // Park the backdrop behind the item and scale it to cover the frustum.
      const backDistance = distance + radius * 4;
      backdrop.position.copy(camera.position).normalize().multiplyScalar(-backDistance);
      backdrop.lookAt(camera.position);
      const coverHeight =
        2 * (backDistance + distance) * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      backdrop.scale.set(coverHeight * aspect * 1.2, coverHeight * 1.2, 1);

      // The composer has already written the café to the canvas; draw on top,
      // through the antialiased stage.
      stage.draw(renderer, scene, camera, rect);
    },

    dispose() {
      if (current) pivot.remove(current);
      current = null;
      stage.dispose();
    },
  };
}
