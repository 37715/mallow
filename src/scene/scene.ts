import * as THREE from "three";
import { CAMERA_FOV, fitCameraToCafe } from "@/scene/camera";
import { buildCafeRoom } from "@/scene/cafe-room";
import type { Customisation } from "@/data/customisation";

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  render: () => void;
  /** Rebuild the room after the player changes a colourway or wall style. */
  setCustomisation: (choice: Customisation) => Promise<void>;
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
 * A soft, round falloff used for the light bloom. Generated rather than loaded
 * so there's no texture to ship.
 */
function softGlowTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,246,224,1)");
  gradient.addColorStop(0.45, "rgba(255,240,205,0.42)");
  gradient.addColorStop(1, "rgba(255,236,195,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Daylight at the window (§10).
 *
 * Two parts, because they're doing different jobs:
 *
 * 1. A plain bright panel sitting *outside* the glass, so looking through the
 *    window you see blown-out daylight rather than the olive backdrop. This is
 *    what makes the window read as a light source at all.
 * 2. Soft warm bloom *inside*, spilling across the floor and up the wall.
 *
 * An earlier version used hard-edged slabs angled into the room. Sharp shafts
 * belong in the glass, where the frame gives them an edge; loose in the room
 * they read as white rectangles lying on the floor. Indoors the light should
 * arrive as a soft warm haze that fills the space, so this is round falloff
 * with no edges anywhere.
 */
function addWindowDaylight(scene: THREE.Scene): void {
  const group = new THREE.Group();
  group.name = "daylight";

  // Bright sky just beyond the window wall (which sits at x = −2).
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 7),
    new THREE.MeshBasicMaterial({ color: 0xfffaf0, toneMapped: false }),
  );
  sky.position.set(-2.35, 1.8, 0);
  sky.rotation.y = Math.PI / 2;
  group.add(sky);

  const glow = softGlowTexture();
  const bloom = (
    size: number,
    opacity: number,
    x: number,
    y: number,
    z: number,
    rotX = 0,
    rotY = 0,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({
        map: glow,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    mesh.position.set(x, y, z);
    mesh.rotation.set(rotX, rotY, 0);
    mesh.renderOrder = 10;
    group.add(mesh);
  };

  // A warm pool spilling across the floor from under the window...
  bloom(4.6, 0.5, -0.15, 0.02, 0.35, -Math.PI / 2);
  // ...a haze hanging in the air just inside the glass...
  bloom(3.6, 0.34, -1.5, 1.35, 0.2, 0, Math.PI / 2);
  // ...and a faint wash carrying across to the far wall.
  bloom(3.2, 0.16, 0.9, 1.5, -1.75, 0, 0);

  scene.add(group);
}

export async function createScene(
  canvas: HTMLCanvasElement,
  customisation: Customisation,
): Promise<SceneContext> {
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
  addWindowDaylight(scene);

  let cafe = await buildCafeRoom(customisation);
  scene.add(cafe.group);

  async function setCustomisation(choice: Customisation): Promise<void> {
    const next = await buildCafeRoom(choice);
    scene.remove(cafe.group);
    cafe = next;
    scene.add(cafe.group);
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

  return { scene, camera, renderer, render, setCustomisation };
}
