import * as THREE from "three";
import { CAMERA_FOV, fitCameraToCafe } from "@/scene/camera";
import { buildCafeRoom } from "@/scene/cafe-room";

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  render: () => void;
}

/**
 * Warm, low, cosy lighting (§9 — lighting is the star).
 *
 * The first pass at this was far too bright: high ambient plus a strong key
 * plus generous exposure flattened everything into pale washed-out cream with
 * no shadow to speak of. Bright is not the same as warm, and flat lighting is
 * what makes good models look cheap.
 *
 * The rule here is **low fill, warm key, real shadows**. Ambient is deliberately
 * dim so surfaces facing away from the light actually go darker; that gradient
 * is the entire difference between "cosy little room" and "showroom".
 *
 * Tuned against ACES tone mapping at the exposure set on the renderer below —
 * changing one without the other will look wrong.
 */
function addLighting(scene: THREE.Scene): void {
  // Deliberately low. This is fill, not illumination: enough that shadowed
  // faces keep their colour, not so much that everything flattens out.
  const hemi = new THREE.HemisphereLight(0xffe4bf, 0x8a6a4e, 0.5);
  scene.add(hemi);

  // Late-afternoon sun through the window — the one light doing real work.
  const key = new THREE.DirectionalLight(0xffcf94, 1.15);
  key.position.set(3.5, 5.5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 30;
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -4;
  // Soft edges: hard shadows read harsh, and harsh isn't cosy.
  key.shadow.radius = 4;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  scene.add(key);

  // A warm pool over the counter — the cosy glow anchor, and the thing that
  // makes the back of the room feel lit from inside rather than washed.
  const counterGlow = new THREE.PointLight(0xffb673, 2.4, 4.5, 2);
  counterGlow.position.set(-0.7, 1.9, -1.1);
  scene.add(counterGlow);

  // A second, softer pool over the seating so the open side isn't dead.
  const roomGlow = new THREE.PointLight(0xffc98a, 1.6, 4, 2);
  roomGlow.position.set(0.8, 1.9, 0.9);
  scene.add(roomGlow);

  // Daylight through the one window (left wall, so it shines in along +x). A wide, soft spot aimed in from outside
  // and slightly down, so the light lands as a warm patch on the floor rather
  // than lifting the whole room evenly — that patch is what sells "afternoon
  // sun through the window" instead of "the lights are on".
  const windowLight = new THREE.SpotLight(0xfff0d2, 9, 11, Math.PI / 5, 0.85, 1.4);
  windowLight.position.set(-6.0, 3.0, 0.2);
  windowLight.target.position.set(0.9, 0, 0.7);
  windowLight.castShadow = false; // the key already casts; a second is wasted cost
  scene.add(windowLight);
  scene.add(windowLight.target);

}

/**
 * Visible shafts of sun through the window (§10).
 *
 * Not real volumetrics — just a few long, very faint additive slabs angled
 * from the window down to the floor, which is the trick the pack's own promo
 * art uses. They're unlit, write no depth, and never cast or receive, so they
 * cost essentially nothing and can't interact with anything.
 */
function addSunShafts(scene: THREE.Scene): void {
  const group = new THREE.Group();
  group.name = "sun-shafts";

  // From the window (left wall, around chest height) down into the room.
  const from = new THREE.Vector3(-1.95, 2.1, 0.1);
  const to = new THREE.Vector3(1.1, 0, 0.9);
  const axis = to.clone().sub(from);
  const length = axis.length();
  const midpoint = from.clone().addScaledVector(axis, 0.5);

  for (const [offset, width, opacity] of [
    [-0.62, 0.42, 0.055],
    [-0.1, 0.6, 0.075],
    [0.5, 0.34, 0.05],
  ] as const) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xfff3d8,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(width, length * 1.05), material);

    // Point the plane's local +y down the beam, then roll it to face the camera.
    shaft.position.copy(midpoint).add(new THREE.Vector3(0, 0, offset));
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.clone().normalize());
    shaft.rotateY(Math.PI / 4);
    shaft.renderOrder = 10;
    group.add(shaft);
  }

  scene.add(group);
}

export async function createScene(canvas: HTMLCanvasElement): Promise<SceneContext> {
  const scene = new THREE.Scene();
  // A muted warm backdrop, like the pack's own promo renders. A pale one makes
  // the cream walls disappear into it and the whole thing read as washed out.
  scene.background = new THREE.Color(0x8c8560);

  // Position and distance are solved per aspect ratio in resize() below, so the
  // café is fully framed on a portrait phone as well as a desktop window (§6).
  const camera = new THREE.PerspectiveCamera(
    CAMERA_FOV,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  );

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Filmic tone mapping is most of the "warm and soft" look (§9): it rolls
  // highlights off gently where linear output clips them to white.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.86;

  addLighting(scene);
  addSunShafts(scene);

  const cafe = await buildCafeRoom();
  scene.add(cafe.group);

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    fitCameraToCafe(camera, width / height);
    renderer.setSize(width, height);
  }
  resize();
  window.addEventListener("resize", resize);

  function render() {
    renderer.render(scene, camera);
  }

  return { scene, camera, renderer, render };
}
