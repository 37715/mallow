import * as THREE from "three";
import { buildRoom } from "@/scene/room";
import { CAMERA_FOV, fitCameraToCafe } from "@/scene/camera";

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  render: () => void;
}

/** Warm key light + soft ambient — lighting is the star (§9). */
function addLighting(scene: THREE.Scene): void {
  const ambient = new THREE.AmbientLight(0xfff2df, 0.55);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffe4b8, 1.4);
  key.position.set(4, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 20;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xcfe0ff, 0.25);
  fill.position.set(-4, 3, -2);
  scene.add(fill);
}

export function createScene(canvas: HTMLCanvasElement): SceneContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf7ecd9);

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

  addLighting(scene);
  scene.add(buildRoom());

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
