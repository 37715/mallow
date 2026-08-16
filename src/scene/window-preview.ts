import * as THREE from "three";
import { loadCafeAssets } from "@/scene/asset-library";
import { chosenAssets, type Customisation } from "@/data/customisation";
import { createPreviewStage } from "@/scene/preview-stage";

/**
 * The café's own window, close up, for the cleaning minigame.
 *
 * **A real render of the real window, not a drawing of one.** Ellis,
 * 2026-08-26: *"i want a whole new render of the window and it must look grubby
 * and then you simply like wipe it all off with your finger."* The first
 * version put the muck over the whole screen with the café behind it, which
 * meant the thing being cleaned was the screen — the player's own phone — and
 * there was nothing in the frame that said "window". This puts the window
 * itself in the middle of the screen at a size you can actually wipe.
 *
 * It is the *player's* window: the wall style is read from their customisation,
 * so someone who has repainted gets their own glass back.
 *
 * Same shared-renderer technique as `scene/shop-preview.ts` — one WebGL
 * context, one copy of the café atlas. See that file for why a second renderer
 * was rejected.
 */

export interface WindowPreview {
  /** Rebuild for the café's current wall style. Cheap to re-call; a no-op if unchanged. */
  setStyle(choice: Customisation): void;
  render(renderer: THREE.WebGLRenderer, rect: DOMRect, now: number): void;
  dispose(): void;
}

/**
 * The glass, in the wall piece's own frame.
 *
 * `Wall_A_Window_Dark_Corner_End_XL` is a whole 4-unit wall with a sweeping
 * arch; the aperture is a small part of it, and framing the *piece* would show
 * a wall with a window in the corner of it. These are the numbers from §9's
 * daylight-panel work — the aperture spans y 0.93→2.77 and x ±1.12 — so the
 * camera looks at the middle of the glass and fills the frame with it.
 */
const GLASS_CENTRE = new THREE.Vector3(0, 1.95, 0);
/**
 * Far enough back to hold the whole aperture *plus* some frame around it.
 *
 * **Measured, and the first guess was inside the glass.** The aperture spans
 * x ±1.12, so at 3.15 away a 34° fov covered 1.6 across — the camera was
 * entirely within the window and the "render" was a flat field of the daylight
 * panel behind it, with no frame, no glazing bars and nothing that said
 * "window" at all. At this distance the frame covers about 3 units across,
 * which is the glass with a border of wall around it.
 */
const DISTANCE = 6.3;

export function createWindowPreview(environment: THREE.Texture | null): WindowPreview {
  const scene = new THREE.Scene();
  /**
   * Warm plaster behind everything.
   *
   * The piece is a *corner* wall whose arch sweeps down at one end, so a frame
   * tight enough to make the window big enough to wipe also catches the void
   * past that sweep — which rendered as a grey wedge in the top corner and read
   * as a hole in the picture. Filling it with the wall's own tone means any
   * gap reads as more wall. The daylight panel is in front of this, so the
   * glass still glows.
   */
  scene.background = new THREE.Color(0xf7cf9a);
  scene.environment = environment;
  scene.environmentIntensity = 3.0;
  scene.add(new THREE.AmbientLight(0xfff3e4, 2.2));
  // Lit from behind, because a window's whole character is the daylight coming
  // through it. The front key is only enough to keep the frame from reading as
  // a silhouette.
  const behind = new THREE.DirectionalLight(0xfff8ec, 3.4);
  behind.position.set(0.4, 1.2, -4);
  scene.add(behind);
  const front = new THREE.DirectionalLight(0xfff7e8, 1.1);
  front.position.set(2, 3, 4);
  scene.add(front);

  /**
   * A bright panel behind the glass, standing in for the daylight the real room
   * gets from `addLightShafts`. Without it the aperture shows the clear colour
   * and the window reads as a hole cut in a wall.
   *
   * **It is parked from the wall's measured box, not from a guess.** The first
   * version put it at a fixed z=−0.9 on the assumption that a piece placed at
   * the origin sits at the origin — but architecture in this pack is authored
   * with an *offset* local frame (§0, 2026-08-25: `Flooring_A_Entrance` spans
   * x −1…0.87 in its own), and this wall's geometry lives out at z ≈ −2. So
   * the panel was in front of the window rather than behind it, and the whole
   * "render" was a flat cream field: measured 185,180,168 at every sample
   * point, which is exactly what a lit plane looks like through the grade.
   */
  const daylight = new THREE.Mesh(
    // **Sized to the aperture, not to the frame.** A big panel spills past the
    // end where the arch sweeps down and fills that corner with flat cream —
    // which is what the grey wedge in the top corner was, and it read as a
    // hole in the picture rather than as daylight. Behind the glass only; the
    // scene background covers anything past the wall.
    new THREE.PlaneGeometry(2.7, 2.3),
    new THREE.MeshBasicMaterial({ color: 0xfff6e4 }),
  );
  scene.add(daylight);

  const pivot = new THREE.Group();
  scene.add(pivot);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 40);
  const stage = createPreviewStage();
  let built: THREE.Object3D | null = null;
  let shown = "";
  /** Where the glass actually is, measured off the built piece. */
  const glass = new THREE.Vector3(0, 1.85, 0);
  /** The inner face of the wall — what the camera stands in front of. */
  let faceZ = 0;

  return {
    setStyle(choice) {
      const name = chosenAssets(choice).wallWindow;
      // **Idempotent.** The caller re-applies every frame, and `create` clones
      // out of the asset library — the shop preview shipped that bug once and
      // was cloning a piece thirty times a second (§0, 2026-08-10).
      if (name === shown) return;
      void loadCafeAssets().then((assets) => {
        if (name === shown) return;
        shown = name;
        const object = assets.create(name);
        if (!object) return;
        if (built) pivot.remove(built);
        built = object;
        // The piece is placed by its base like everything else in the room, so
        // it stands on y=0 and the aperture is where the layout says it is.
        // Same as the room: walls sit a floor-thickness low so the slab covers
        // their bottom edge (§9).
        object.position.set(0, -0.26, 0);
        pivot.add(object);

        // **Measure the piece rather than trusting where it was put.** See the
        // note on `daylight` — the local frame is offset, so "at the origin"
        // is not where the wall is.
        const box = new THREE.Box3().setFromObject(object);
        glass.set(
          (box.min.x + box.max.x) / 2,
          GLASS_CENTRE.y,
          (box.min.z + box.max.z) / 2,
        );
        faceZ = box.max.z;
        daylight.position.set(glass.x, glass.y, box.min.z - 0.25);
      });
    },

    render(renderer, rect, now) {
      if (rect.width < 4 || rect.height < 4) return;
      const aspect = rect.width / rect.height;
      camera.aspect = aspect;
      camera.position.set(glass.x, glass.y, faceZ + DISTANCE);
      camera.lookAt(glass.x, glass.y, glass.z);
      camera.updateProjectionMatrix();
      // A breath of movement, so the glass is not a still photograph while the
      // player drags across it.
      pivot.rotation.y = Math.sin(now / 2600) * 0.028;
      stage.draw(renderer, scene, camera, rect);
    },

    dispose() {
      stage.dispose();
      daylight.geometry.dispose();
      (daylight.material as THREE.Material).dispose();
    },
  };
}
