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
 * The world-space box the camera guarantees to keep in frame: the full seating
 * footprint, the cat lounge, and the counter. Deliberately *not* the whole room
 * — walls and the tops of tall props may crop on the narrowest phones, which
 * costs nothing, whereas framing the whole room would push the camera so far
 * back that the cats turn into specks.
 */
const FRAME_BOX = new THREE.Box3(
  new THREE.Vector3(-2.2, 0, -3.3),
  new THREE.Vector3(2.2, 1.3, 3.7),
);

/** Vertical FOV. Kept modest so the café reads as a room, not a fisheye. */
export const CAMERA_FOV = 45;

/** How high the camera sits above the floor plane, in degrees. */
const VIEW_ANGLE_DEG = 42;

/** A little breathing room so nothing sits flush against the screen edge. */
const MARGIN = 1.06;

const FRAME_CENTER = FRAME_BOX.getCenter(new THREE.Vector3());

const FRAME_CORNERS: THREE.Vector3[] = [];
for (const x of [FRAME_BOX.min.x, FRAME_BOX.max.x]) {
  for (const y of [FRAME_BOX.min.y, FRAME_BOX.max.y]) {
    for (const z of [FRAME_BOX.min.z, FRAME_BOX.max.z]) {
      FRAME_CORNERS.push(new THREE.Vector3(x, y, z));
    }
  }
}

const angle = THREE.MathUtils.degToRad(VIEW_ANGLE_DEG);
/** Unit offset from the frame centre to the camera. */
const VIEW_OFFSET = new THREE.Vector3(0, Math.sin(angle), Math.cos(angle));

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
 * Point `camera` at the café and pull it back just far enough that the frame
 * box fits at this aspect ratio. Call on every resize.
 */
export function fitCameraToCafe(camera: THREE.PerspectiveCamera, aspect: number): void {
  camera.aspect = aspect;
  camera.fov = CAMERA_FOV;

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

  camera.position.copy(FRAME_CENTER).addScaledVector(VIEW_OFFSET, far);
  camera.lookAt(FRAME_CENTER);
  camera.far = far + 40;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}

/** Distance the camera settles at for a given aspect — used by tests. */
export function cameraDistanceFor(aspect: number): number {
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, aspect, 0.1, 100);
  fitCameraToCafe(camera, aspect);
  return camera.position.distanceTo(FRAME_CENTER);
}

export { FRAME_BOX, FRAME_CENTER };
