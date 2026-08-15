/**
 * Character pack inspector — a workshop tool, not part of the game.
 *
 * The character pack ships as **FBX**, unlike the café pack's glTF, and it is
 * a modular rig: one file containing a base body plus every hair, clothing and
 * accessory mesh, driven by animation clips. None of that is documented, so
 * before any of it can be wired into visitors we need to know what's actually
 * in the file — mesh names, how the parts are grouped, which clips exist, and
 * how big the thing is once loaded.
 *
 * `/characters.html` prints that inventory and renders the base character.
 */

import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  APPEARANCE_RANGES,
  Character,
  appearanceFromSeed,
  loadCharacterAssets,
  type SeatKind,
} from "@/entities/character-library";
import {
  EXPRESSIONS,
  type ExpressionName,
  type MouthFrame,
} from "@/entities/character-face";

const status = document.getElementById("status")!;
const report = document.getElementById("report")!;
const stage = document.getElementById("stage") as HTMLCanvasElement;

function line(text: string, cls = ""): void {
  const el = document.createElement("div");
  el.className = cls;
  el.textContent = text;
  report.appendChild(el);
}

async function main(): Promise<void> {
  status.textContent = "Loading characters.glb…";
  // Share the game's own loader. Loading the GLB a second time here span up a
  // second Draco decoder as well, and the page simply never finished booting.
  const assets = await loadCharacterAssets();
  const root = cloneSkinned(assets.scene) as THREE.Group;
  root.animations = assets.animations;

  // --- Inventory ----------------------------------------------------------
  const meshes: THREE.Mesh[] = [];
  const skinned: THREE.SkinnedMesh[] = [];
  let bones = 0;
  root.traverse((child) => {
    if (child instanceof THREE.SkinnedMesh) skinned.push(child);
    else if (child instanceof THREE.Mesh) meshes.push(child);
    if (child instanceof THREE.Bone) bones++;
  });

  const clips = root.animations ?? [];
  const triangles = [...meshes, ...skinned].reduce((sum, m) => {
    const g = m.geometry as THREE.BufferGeometry;
    return sum + (g.index ? g.index.count : g.attributes.position.count) / 3;
  }, 0);

  status.textContent =
    `${skinned.length} skinned + ${meshes.length} static meshes · ` +
    `${bones} bones · ${clips.length} clips · ${Math.round(triangles).toLocaleString()} triangles`;

  line("ANIMATION CLIPS", "head");
  if (clips.length === 0) line("(none — animations may live in a separate file)", "dim");
  for (const clip of clips) {
    line(`${clip.name}   ${clip.duration.toFixed(2)}s`);
  }

  line("MESHES", "head");
  const named = [...skinned, ...meshes];
  named.sort((a, b) => a.name.localeCompare(b.name));
  for (const m of named) {
    const g = m.geometry as THREE.BufferGeometry;
    const tris = Math.round((g.index ? g.index.count : g.attributes.position.count) / 3);
    const kind = m instanceof THREE.SkinnedMesh ? "skinned" : "static ";
    line(`${kind}  ${m.name.padEnd(38)} ${String(tris).padStart(6)} tris`);
  }

  // --- Render whatever we got, so the style can be eyeballed --------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8c8560);
  scene.add(new THREE.AmbientLight(0xfff1de, 1.6));
  const key = new THREE.DirectionalLight(0xfff0d8, 1.6);
  key.position.set(3, 6, 5);
  scene.add(key);

  scene.add(root);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  line("BOUNDS", "head");
  line(`size ${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)} (FBX units)`);
  line(`A café chair seat is 0.68 world units high — scale accordingly.`, "dim");

  const camera = new THREE.PerspectiveCamera(35, stage.clientWidth / stage.clientHeight, 0.1, 5000);
  const radius = Math.max(size.x, size.y, size.z);
  camera.position.set(centre.x + radius, centre.y + radius * 0.4, centre.z + radius * 1.6);
  camera.lookAt(centre);

  const renderer = new THREE.WebGLRenderer({ canvas: stage, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(stage.clientWidth, stage.clientHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const mixer = clips.length > 0 ? new THREE.AnimationMixer(root) : null;
  mixer?.clipAction(clips[0]).play();
  const clock = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    mixer?.update(clock.getDelta());
    root.rotation.y += 0.004;
    renderer.render(scene, camera);
  });

  await showAssembledGuests();
}

/**
 * The second stage: three guests built by the *game's own* `Character` class,
 * one per seat kind, lit plainly and framed close.
 *
 * This exists because "the characters' heads are invisible" is impossible to
 * diagnose at the size a guest occupies in the café — perhaps 40 pixels tall,
 * behind a counter, at an isometric angle. Anything wrong with assembly,
 * skinning, materials or the sit poses shows up here immediately, and it
 * screenshots headlessly, which the game itself does not (it needs a live game
 * loop and a guest to actually walk in).
 */
async function showAssembledGuests(): Promise<void> {
  const canvas = document.getElementById("guests") as HTMLCanvasElement;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x3b3a46);
  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(2, 4, 5);
  scene.add(key);

  const assets = await loadCharacterAssets();
  const kinds: SeatKind[] = ["tall", "sofa", "floor"];
  const built = kinds.map((kind, i) => {
    const character = new Character(assets, i * 37 + 5);
    character.group.position.x = (i - 1) * 1.5;
    character.sit(kind);
    scene.add(character.group);
    return character;
  });
  // A stand-up one too, so the walk cycle and the full silhouette are visible.
  const walker = new Character(assets, 91);
  walker.group.position.set(2.6, 0, 0);
  walker.walk();
  scene.add(walker.group);
  built.push(walker);

  const diag: string[] = [];
  for (const c of built) {
    let meshes = 0;
    const box = new THREE.Box3();
    c.group.updateMatrixWorld(true);
    c.group.traverse((o) => {
      if (o instanceof THREE.Mesh) { meshes++; box.expandByObject(o); }
    });
    const s2 = box.getSize(new THREE.Vector3());
    diag.push(`${String(meshes).padStart(2)} meshes  ${s2.x.toFixed(2)} × ${s2.y.toFixed(2)} × ${s2.z.toFixed(2)}  base y ${box.min.y.toFixed(2)}`);
  }
  line("ASSEMBLED GUESTS", "head");
  for (const d of diag) line(d);

  const camera = new THREE.PerspectiveCamera(30, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0.9, 1.5, 6.4);
  camera.lookAt(0.4, 0.85, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    for (const character of built) character.update(delta);
    renderer.render(scene, camera);
  });

  await showEveryFace();
  await showEveryHairstyle();
}

/**
 * Every expression, and every viseme the lip sync can ask for.
 *
 * The face is a UV window sliding over an atlas, and the failure mode is that
 * the window stops moving — which looks like a perfectly normal character who
 * simply never changes expression. At the size a guest occupies in the café
 * that is indistinguishable from working. Side by side it is obvious.
 *
 * **What to look for:** every head showing a *different* face. A grid where
 * they all match means `Cell.show` is being handed a name the atlas doesn't
 * have, or the geometry clone in `CharacterFace` has stopped happening and
 * every character is sharing one set of UVs.
 */
async function showEveryFace(): Promise<void> {
  const canvas = document.getElementById("faces") as HTMLCanvasElement | null;
  if (!canvas) return;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x3b3a46);
  scene.add(new THREE.AmbientLight(0xffffff, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(0, 3, 6);
  scene.add(key);

  const assets = await loadCharacterAssets();
  const moods = Object.keys(EXPRESSIONS) as ExpressionName[];
  const visemes: MouthFrame[] = [
    "Default", "a-i", "ah-i", "e-k-r", "o-u-w", "oh",
    "m-b-p", "f-v", "s-z", "sh-ch", "th", "L",
  ];
  const cells: Array<{ mood: ExpressionName; viseme?: MouthFrame }> = [
    ...moods.map((mood) => ({ mood })),
    ...visemes.map((viseme) => ({ mood: "neutral" as ExpressionName, viseme })),
  ];

  const perRow = 6;
  const built: Character[] = [];
  for (const [index, cell] of cells.entries()) {
    const character = new Character(assets, appearanceFromSeed(7), index * 13);
    const column = index % perRow;
    const row = Math.floor(index / perRow);
    character.group.position.set((column - (perRow - 1) / 2) * 0.62, -row * 0.72, 0);
    character.group.scale.setScalar(0.55);
    character.idle();
    character.express(cell.mood);
    // A viseme cell holds one shape, so the sheet is a still reference rather
    // than twelve mouths flickering through a blink cycle.
    if (cell.viseme) character.say(cell.viseme);
    scene.add(character.group);
    built.push(character);
  }

  // Solved rather than eyeballed, because the grid grows whenever an
  // expression is added and a hard-coded distance silently crops the last row.
  const rows = Math.ceil(cells.length / perRow);
  const top = 0.9; // a head's crown in the first row
  const bottom = -(rows - 1) * 0.72 - 0.1;
  const centre = (top + bottom) / 2;
  const camera = new THREE.PerspectiveCamera(30, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  // Framed on the heads — the bodies are identical in every cell and the whole
  // point is to read a face the size of a thumbnail.
  const distance = (top - bottom) / 2 / Math.tan((camera.fov * Math.PI) / 360);
  camera.position.set(0, centre, distance);
  camera.lookAt(0, centre, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    for (const character of built) character.update(delta);
    renderer.render(scene, camera);
  });
}

/**
 * Every hairstyle, in two rows: front row facing you, back row turned away.
 *
 * §0 has wanted this contact sheet twice — once for the hairstyles that sit
 * backwards on the head, and again on 2026-08-10 when Ellis reported a head
 * that was invisible under floating hair. Both are per-style faults that are
 * impossible to judge from one randomly-generated guest, and both are obvious
 * the moment all twelve are side by side.
 *
 * **What to look for:** a solid face on every front-row head. Hair with a hole
 * where the head should be is `alphaMode: BLEND` coming back (see §9's
 * character-pack notes) — the pack claims every textured material is
 * translucent and only the eye sheet actually is.
 */
async function showEveryHairstyle(): Promise<void> {
  const canvas = document.getElementById("hair") as HTMLCanvasElement | null;
  if (!canvas) return;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x3b3a46);
  scene.add(new THREE.AmbientLight(0xffffff, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(2, 4, 5);
  scene.add(key);

  const assets = await loadCharacterAssets();
  const count = APPEARANCE_RANGES.hair;
  const perRow = Math.ceil(count / 2);
  const built: Character[] = [];

  for (let hair = 0; hair < count; hair++) {
    // Two of each: one facing the camera, one turned away, so a style that is
    // on backwards reads as plainly as one that is see-through.
    for (const facing of [0, Math.PI]) {
      const character = new Character(assets, { ...appearanceFromSeed(7), hair });
      const column = hair % perRow;
      character.group.position.set((column - (perRow - 1) / 2) * 1.15, 0, facing === 0 ? 0 : -1.9);
      character.group.rotation.y = facing;
      character.group.scale.setScalar(0.92);
      character.idle();
      scene.add(character.group);
      built.push(character);
    }
  }

  const camera = new THREE.PerspectiveCamera(30, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 2.4, 8.2);
  camera.lookAt(0, 1.25, -0.9);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    for (const character of built) character.update(delta);
    renderer.render(scene, camera);
  });
}

main().catch((error) => {
  status.textContent = `Failed: ${error}`;
  // eslint-disable-next-line no-console
  console.error(error);
});
