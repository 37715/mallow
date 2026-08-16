import * as THREE from "three";
import { loadCafeAssets } from "@/scene/asset-library";
import { chosenAssets, type Customisation } from "@/data/customisation";
import { createPreviewStage } from "@/scene/preview-stage";
import type { Chore } from "@/data/chores";

/**
 * The thing a chore has you clean, rendered close up.
 *
 * **The card *is* the surface.** Framing is what makes the window a window
 * rather than a wall with a window in it, and it is also what lets one module
 * serve a pane of glass, a tabletop and a patch of floorboards — see
 * `ChoreSurface` for the reasoning. Nothing here knows which chore it is
 * beyond the numbers the chore hands it.
 *
 * It is the *player's* café: anything with a colourway resolves against their
 * customisation, so a repainted room gets its own glass and its own boards.
 *
 * Same shared-renderer technique as `scene/shop-preview.ts` — one WebGL
 * context, one copy of the café atlas. See that file for why a second renderer
 * was rejected.
 */

export interface ChoreSurfaceView {
  /** Point it at a chore's subject. Idempotent; safe to call every frame. */
  setSubject(chore: Chore, choice: Customisation): void;
  render(renderer: THREE.WebGLRenderer, rect: DOMRect, now: number): void;
  dispose(): void;
}

/** Vertical field of view. Matches the other preview stages. */
const FOV = 34;

export function createChoreSurface(environment: THREE.Texture | null): ChoreSurfaceView {
  const scene = new THREE.Scene();
  /**
   * Warm plaster behind everything.
   *
   * Some pieces do not fill a rectangle — the window wall's arch sweeps down
   * at one end — and the gap past them rendered as a grey wedge that read as a
   * hole in the picture. Filling it with a wall tone means any gap reads as
   * more room.
   */
  scene.background = new THREE.Color(0xf7cf9a);
  scene.environment = environment;
  scene.environmentIntensity = 3.0;
  scene.add(new THREE.AmbientLight(0xfff3e4, 2.4));
  const key = new THREE.DirectionalLight(0xfff7e8, 1.6);
  key.position.set(2, 4, 3);
  scene.add(key);
  /** Behind, for the window: a pane's whole character is the light through it. */
  const behind = new THREE.DirectionalLight(0xfff8ec, 3.4);
  behind.position.set(0.4, 1.2, -4);
  scene.add(behind);

  /**
   * Daylight behind the glass.
   *
   * **Over-range on purpose.** The preview composite applies the room's own
   * exposure (0.40) and ACES before the grade — see `scene/preview-stage.ts` —
   * so a plain white plane lands around 0.7 and the glass reads as flat grey
   * (Ellis: *"i want the glass brighter"*). A colour above 1 is what a real
   * over-exposed window looks like going into a tone map, and it is the same
   * trick the café's own daylight panel uses.
   *
   * Sized to the aperture rather than the frame: a big panel spills past the
   * arch's sweep and fills that corner with flat cream.
   */
  const daylight = new THREE.Mesh(
    new THREE.PlaneGeometry(2.7, 2.3),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 3.2, 2.9) }),
  );
  daylight.visible = false;
  scene.add(daylight);

  const pivot = new THREE.Group();
  scene.add(pivot);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 60);
  const stage = createPreviewStage();
  let built: THREE.Object3D | null = null;
  let shown = "";
  /** What the camera looks at, measured off the built piece. */
  const aim = new THREE.Vector3();
  /** Direction the camera stands in, and how much world the card holds. */
  const from = new THREE.Vector3(0, 0, 1);
  let span = 2.5;

  function assetFor(chore: Chore, choice: Customisation): string {
    const { slot, asset } = chore.surface;
    if (slot) return chosenAssets(choice)[slot];
    return asset ?? "";
  }

  return {
    setSubject(chore, choice) {
      const name = assetFor(chore, choice);
      const surface = chore.surface;
      from.set(surface.from[0], surface.from[1], surface.from[2]).normalize();
      span = surface.span;
      // **Idempotent.** The caller re-applies every frame, and `create` clones
      // out of the asset library — the shop preview shipped that bug once and
      // was cloning a piece thirty times a second (§0, 2026-08-10).
      if (!name || name === shown) return;
      void loadCafeAssets().then((assets) => {
        if (name === shown) return;
        shown = name;
        const object = assets.create(name);
        if (!object) return;
        if (built) pivot.remove(built);
        built = object;
        object.position.set(0, 0, 0);
        pivot.add(object);

        /**
         * **Measure the piece rather than trusting where it was put.**
         * Architecture in this pack has an *offset* local frame (§0,
         * 2026-08-25: `Flooring_A_Entrance` spans x −1…0.87 in its own), so
         * "placed at the origin" is not "at the origin" — the window wall's
         * geometry lives out at z ≈ −2. Framing on the placement rather than
         * the geometry put the camera inside the glass and rendered a flat
         * field, which is a failure that looks like a broken shader.
         */
        const box = new THREE.Box3().setFromObject(object);
        const centre = box.getCenter(new THREE.Vector3());
        aim.set(centre.x, surface.aimY ?? box.max.y, centre.z);
        // The window's daylight sits just behind the glass; everything else
        // is opaque and does not want it.
        daylight.visible = surface.slot === "wallWindow";
        if (daylight.visible) {
          daylight.position.set(aim.x, aim.y, box.min.z - 0.25);
        }
      });
    },

    render(renderer, rect, now) {
      if (rect.width < 4 || rect.height < 4) return;
      const aspect = rect.width / rect.height;
      camera.aspect = aspect;
      // Solve the distance that makes the card hold exactly `span` across, so
      // the framing is the same whatever size the card ends up on screen.
      const halfFov = THREE.MathUtils.degToRad(FOV) / 2;
      const distance = span / (2 * Math.tan(halfFov) * aspect);
      camera.position.copy(aim).addScaledVector(from, distance);
      camera.lookAt(aim);
      camera.updateProjectionMatrix();
      // A breath of movement, so it is not a still photograph while the player
      // drags across it.
      pivot.rotation.y = Math.sin(now / 2600) * 0.02;
      stage.draw(renderer, scene, camera, rect);
    },

    dispose() {
      stage.dispose();
      daylight.geometry.dispose();
      (daylight.material as THREE.Material).dispose();
    },
  };
}
