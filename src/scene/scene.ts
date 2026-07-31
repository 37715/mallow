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
  const hemi = new THREE.HemisphereLight(0xffe4bf, 0x8a6a4e, 0.42);
  scene.add(hemi);

  // Late-afternoon sun through the window — the one light doing real work.
  const key = new THREE.DirectionalLight(0xffcf94, 1.45);
  key.position.set(5, 7.5, 5.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 30;
  key.shadow.camera.left = -7;
  key.shadow.camera.right = 7;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -7;
  // Soft edges: hard shadows read harsh, and harsh isn't cosy.
  key.shadow.radius = 4;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  scene.add(key);

  // A warm pool over the counter — the cosy glow anchor, and the thing that
  // makes the back of the room feel lit from inside rather than washed.
  const counterGlow = new THREE.PointLight(0xffb673, 9, 8, 2);
  counterGlow.position.set(-1.8, 2.3, -2.4);
  scene.add(counterGlow);

  // A second, softer pool over the seating so the open side isn't dead.
  const roomGlow = new THREE.PointLight(0xffc98a, 5, 7, 2);
  roomGlow.position.set(1.4, 2.4, 1.4);
  scene.add(roomGlow);
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
  renderer.toneMappingExposure = 0.92;

  addLighting(scene);

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
