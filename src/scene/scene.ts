import * as THREE from "three";
import { buildRoom } from "@/scene/room";
import { CAMERA_FOV, fitCameraToCafe } from "@/scene/camera";
import { applyVenuePalette } from "@/scene/room";
import { venueAt } from "@/data/venues";

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  render: () => void;
  /** Repaint the room and sky for a venue — call after a move (§8). */
  setVenue: (venueIndex: number) => void;
}

/**
 * Warm key light + soft ambient — lighting is the star (§9). Tuned with ACES
 * tone mapping in mind (set on the renderer below): intensities here look
 * washed out without it and hot with plain linear output.
 */
function addLighting(scene: THREE.Scene): void {
  // Hemisphere instead of flat ambient: cream light from above, a bounce of
  // warm floor tone from below. Gives every unlit face a little gradient.
  const hemi = new THREE.HemisphereLight(0xfff3e0, 0xd9b48a, 0.85);
  scene.add(hemi);

  // Late-afternoon sun through the café window.
  const key = new THREE.DirectionalLight(0xffdca8, 2.2);
  key.position.set(3.5, 6, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 20;
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  // Soften shadow edges — hard shadows read harsh, and harsh isn't cosy.
  key.shadow.radius = 5;
  key.shadow.bias = -0.0004;
  scene.add(key);

  // Cool sky fill from the opposite side keeps shadowed faces from going muddy.
  const fill = new THREE.DirectionalLight(0xcfe0ff, 0.3);
  fill.position.set(-4, 3, -2);
  scene.add(fill);

  // A warm pool of lamplight over the counter — the cosy glow anchor.
  const counterGlow = new THREE.PointLight(0xffc98a, 10, 7, 2);
  counterGlow.position.set(0, 2.4, -3.2);
  scene.add(counterGlow);
}

export function createScene(canvas: HTMLCanvasElement, venueIndex = 0): SceneContext {
  const scene = new THREE.Scene();
  // A touch deeper than the walls so the room edges read against it.
  scene.background = new THREE.Color(venueAt(venueIndex).palette.sky);

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
  renderer.toneMappingExposure = 1.12;

  addLighting(scene);
  scene.add(buildRoom(venueIndex));

  function setVenue(index: number): void {
    const palette = venueAt(index).palette;
    applyVenuePalette(palette);
    (scene.background as THREE.Color).setHex(palette.sky);
  }

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

  return { scene, camera, renderer, render, setVenue };
}
