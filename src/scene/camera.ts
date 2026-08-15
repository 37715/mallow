import * as THREE from "three";

/**
 * Camera framing (§6 — the target device is a portrait iPhone).
 *
 * A PerspectiveCamera's `fov` is its *vertical* field of view, so on a tall
 * narrow screen the horizontal field collapses: at 45° and a 0.46 aspect an
 * iPhone could see barely 3.5 world units across. Pinning the camera to a
 * fixed position therefore crops the café off the sides of every phone while
 * looking fine on a desktop monitor — which is exactly the bug this replaces.
 *
 * Instead we declare the region that must stay on screen and solve for the
 * camera distance that contains it at the current aspect. Wide screens sit
 * close; narrow ones pull back. Nothing is ever cropped.
 */

/**
 * The world-space box the camera guarantees to keep in frame.
 *
 * Asymmetric, and every edge of it is doing a job:
 *
 * - **−x, −z** clear the two walls, which stand at −2.25 and −2.29.
 * - **+y 3.6** takes in the wall tops, including the big sweeping arch over
 *   the window. An earlier version stopped at 2.7 on the argument that framing
 *   full walls makes the café "a model on a shelf" — but the reference render
 *   (`graphics/K9gvnT.png`) frames them, and that arch is the room's whole
 *   silhouette. Cropping it throws away the best thing in the composition.
 * - **+x, +z** take in what stands outside the door on the ground: the A-frame
 *   sign at the front and the stray cushion to the right. They read as *this
 *   café sits somewhere*, and half a sign is worse than no sign.
 *
 * The far +x/+z corner is empty, but it costs almost nothing on screen: the two
 * axes pull in opposite horizontal directions from this camera angle, so that
 * corner projects near the middle rather than off the side.
 */
/**
 * What must stay on screen.
 *
 * Asymmetric on purpose: it reaches to y=3.6 for the swept arch over the
 * window, and past the floor plan on +x/+z for the A-frame sign and the
 * cushion that stand *outside* the door. From a 45° azimuth that far corner
 * projects near the middle of the screen, so it costs almost nothing.
 *
 * **It is a `let`, because the café can grow** (§8 step 6). Every extra floor
 * tile widens this, the solved camera distance follows, and that is precisely
 * how §9's framing rule survives expansion: the rule was never "the camera
 * sits here", it was "this box is always visible".
 */
const HOME_FRAME = new THREE.Box3(
  new THREE.Vector3(-2.35, 0, -2.35),
  new THREE.Vector3(2.95, 3.6, 3.2),
);

export let FRAME_BOX = HOME_FRAME.clone();

/** Vertical FOV. Kept modest so the café reads as a room, not a fisheye. */
export const CAMERA_FOV = 45;

/** How high the camera sits above the floor plane, in degrees. */
const VIEW_ANGLE_DEG = 34;

/**
 * Which way round the room the camera sits, in degrees. 45° puts it on the
 * open corner of the cutaway diorama, looking into both walls — the composition
 * the asset pack is built for.
 */
const VIEW_AZIMUTH_DEG = 45;

/** A little breathing room so nothing sits flush against the screen edge. */
const MARGIN = 1.06;

export const FRAME_CENTER = new THREE.Vector3();
const FRAME_CORNERS: THREE.Vector3[] = [];

/**
 * Widen the framing to take in a bigger floor.
 *
 * Mutates the exported `FRAME_CENTER` in place rather than replacing it: the
 * camera controls hold a reference from construction, and swapping the object
 * would leave them steering toward where the café *used* to be.
 */
export function setFloorExtent(bounds: {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}): void {
  FRAME_BOX = new THREE.Box3(
    new THREE.Vector3(Math.min(HOME_FRAME.min.x, bounds.minX - 0.35), HOME_FRAME.min.y, Math.min(HOME_FRAME.min.z, bounds.minZ - 0.35)),
    new THREE.Vector3(Math.max(HOME_FRAME.max.x, bounds.maxX + 0.95), HOME_FRAME.max.y, Math.max(HOME_FRAME.max.z, bounds.maxZ + 1.2)),
  );
  refreshFrame();
}

function refreshFrame(): void {
  FRAME_BOX.getCenter(FRAME_CENTER);
  FRAME_CORNERS.length = 0;
  for (const x of [FRAME_BOX.min.x, FRAME_BOX.max.x]) {
    for (const y of [FRAME_BOX.min.y, FRAME_BOX.max.y]) {
      for (const z of [FRAME_BOX.min.z, FRAME_BOX.max.z]) {
        FRAME_CORNERS.push(new THREE.Vector3(x, y, z));
      }
    }
  }
}
refreshFrame();

const elevation = THREE.MathUtils.degToRad(VIEW_ANGLE_DEG);
const azimuth = THREE.MathUtils.degToRad(VIEW_AZIMUTH_DEG);
/** Unit offset from the frame centre to the camera. */
const VIEW_OFFSET = new THREE.Vector3(
  Math.cos(elevation) * Math.sin(azimuth),
  Math.sin(elevation),
  Math.cos(elevation) * Math.cos(azimuth),
);

const scratch = new THREE.Vector3();

/** True when every corner of the frame box projects inside the viewport. */
function framesEverything(camera: THREE.PerspectiveCamera, tanH: number, tanV: number): boolean {
  for (const corner of FRAME_CORNERS) {
    camera.worldToLocal(scratch.copy(corner));
    // The camera looks down its own −z, so anything with z >= 0 is behind it.
    if (scratch.z >= -0.001) return false;
    const depth = -scratch.z;
    if (Math.abs(scratch.x) > depth * tanH) return false;
    if (Math.abs(scratch.y) > depth * tanV) return false;
  }
  return true;
}

/**
 * The smallest distance from FRAME_CENTER that still frames the whole café at
 * this aspect ratio.
 *
 * This is the number §9's framing rule is really about, and the free camera
 * (`scene/camera-controls.ts`) leans on it twice: it is the **default** framing
 * on launch and after a reset, and it is the **zoom-out limit**, so no amount
 * of pinching can pull back past a correctly-framed café into empty space.
 * Solving it per aspect is what stops a phone cropping the room off the sides.
 */
export function solveFitDistance(camera: THREE.PerspectiveCamera, aspect: number): number {
  const tanV = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV) / 2) / MARGIN;
  const tanH = tanV * aspect;

  // Binary search the smallest distance that still frames everything. The
  // predicate is monotonic in distance, so this converges cleanly.
  let near = 1;
  let far = 60;
  for (let i = 0; i < 36; i++) {
    const mid = (near + far) / 2;
    camera.position.copy(FRAME_CENTER).addScaledVector(VIEW_OFFSET, mid);
    camera.lookAt(FRAME_CENTER);
    camera.updateMatrixWorld(true);
    if (framesEverything(camera, tanH, tanV)) far = mid;
    else near = mid;
  }
  return far;
}

/**
 * Place the camera looking at `target` from `distance` along the fixed view
 * offset. The *angle* never changes — only where we look and how close.
 * See camera-controls.ts for why orbiting is not on offer.
 */
export function applyCameraPose(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  distance: number,
): void {
  camera.position.copy(target).addScaledVector(VIEW_OFFSET, distance);
  camera.lookAt(target);
  camera.updateMatrixWorld(true);
}

/**
 * Point `camera` at the café and pull it back just far enough that the frame
 * box fits at this aspect ratio. Call on every resize.
 */
export function fitCameraToCafe(camera: THREE.PerspectiveCamera, aspect: number): number {
  camera.aspect = aspect;
  camera.fov = CAMERA_FOV;

  const distance = solveFitDistance(camera, aspect);

  applyCameraPose(camera, FRAME_CENTER, distance);
  // Generous, because the camera can now be panned toward one side of the room
  // while the far corner stays in shot.
  camera.far = distance + 60;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return distance;
}

/** Distance the camera settles at for a given aspect — used by tests. */
export function cameraDistanceFor(aspect: number): number {
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, aspect, 0.1, 100);
  fitCameraToCafe(camera, aspect);
  return camera.position.distanceTo(FRAME_CENTER);
}

export { VIEW_OFFSET };
