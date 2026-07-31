import * as THREE from "three";
import { type CatDefinition } from "@/data/cats";

/**
 * The hero cat (§9): a sitting low-poly cat built procedurally, so it ships
 * with zero asset-licensing questions and every breed is a recolour of the
 * same geometry — one silhouette, cohesive by construction.
 *
 * Flat shading is deliberate: faceted surfaces are what makes simple shapes
 * read as "stylised low-poly" instead of "untextured blobs", and they catch
 * the warm key light in a way smooth normals don't.
 *
 * Named parts (`head`, `tail`, `earL`, `earR`, `torso`) are animation hooks —
 * CatManager finds them by name to run breathing, tail sway and ear twitches.
 * Rename them and the cats go still.
 */

const EYE_COLOR = 0x4a3826;
const NOSE_COLOR = 0xb5766a;
const BLUSH_COLOR = 0xe8a598;

/**
 * Materials are shared per breed rather than rebuilt per cat (§13 — share
 * materials to keep draw calls down). Ten cats of one breed cost one set.
 */
const materialCache = new Map<string, { fur: THREE.Material; accent: THREE.Material }>();

const EYE_MATERIAL = new THREE.MeshStandardMaterial({ color: EYE_COLOR, roughness: 0.7 });
const NOSE_MATERIAL = new THREE.MeshStandardMaterial({
  color: NOSE_COLOR,
  roughness: 0.6,
  flatShading: true,
});
const BLUSH_MATERIAL = new THREE.MeshStandardMaterial({
  color: BLUSH_COLOR,
  roughness: 0.9,
  flatShading: true,
});

function materialsFor(definition: CatDefinition): { fur: THREE.Material; accent: THREE.Material } {
  const cached = materialCache.get(definition.id);
  if (cached) return cached;

  // Epic/legendary cats glow very softly so rarity reads in-scene (§8) —
  // subtle enough to stay inside the warm palette (§9).
  const emissiveIntensity =
    definition.rarity === "legendary" ? 0.16 : definition.rarity === "epic" ? 0.09 : 0;

  const materials = {
    fur: new THREE.MeshStandardMaterial({
      color: definition.furColor,
      roughness: 0.85,
      flatShading: true,
      emissive: definition.furColor,
      emissiveIntensity,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: definition.accentColor,
      roughness: 0.85,
      flatShading: true,
    }),
  };
  materialCache.set(definition.id, materials);
  return materials;
}

function part(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function buildEar(
  side: 1 | -1,
  furMaterial: THREE.Material,
  innerMaterial: THREE.Material,
): THREE.Group {
  const ear = new THREE.Group();
  ear.name = side === -1 ? "earL" : "earR";
  // Group sits at the pivot (ear base) so twitches rotate naturally.
  ear.position.set(side * 0.085, 0.13, 0.01);
  ear.rotation.z = side * -0.3;

  const outer = part(new THREE.ConeGeometry(0.055, 0.11, 4), furMaterial, 0, 0.05, 0);
  outer.rotation.y = Math.PI / 4;
  ear.add(outer);
  const inner = part(new THREE.ConeGeometry(0.03, 0.06, 4), innerMaterial, 0, 0.045, 0.018);
  inner.rotation.y = Math.PI / 4;
  ear.add(inner);
  return ear;
}

function buildHead(furMaterial: THREE.Material, accentMaterial: THREE.Material): THREE.Group {
  const head = new THREE.Group();
  head.name = "head";
  head.position.set(0, 0.5, 0.12);

  const skull = part(new THREE.SphereGeometry(0.155, 10, 8), furMaterial, 0, 0, 0);
  skull.scale.set(1.15, 1, 0.95);
  head.add(skull);

  // Muzzle in the accent colour — gives every breed a two-tone face.
  const muzzle = part(new THREE.SphereGeometry(0.07, 8, 6), accentMaterial, 0, -0.05, 0.115);
  muzzle.scale.set(1.35, 0.75, 0.7);
  head.add(muzzle);

  head.add(part(new THREE.ConeGeometry(0.02, 0.025, 4), NOSE_MATERIAL, 0, -0.018, 0.165));

  // Closed, contented eyes — two little ∩ arcs. Cosy cats don't stare.
  for (const side of [-1, 1] as const) {
    const eye = new THREE.Mesh(
      new THREE.TorusGeometry(0.028, 0.008, 6, 10, Math.PI),
      EYE_MATERIAL,
    );
    eye.position.set(side * 0.068, 0.015, 0.135);
    eye.rotation.y = side * 0.35;
    head.add(eye);

    const blush = part(new THREE.SphereGeometry(0.024, 6, 4), BLUSH_MATERIAL, side * 0.115, -0.035, 0.1);
    blush.scale.set(1, 0.6, 0.4);
    blush.rotation.y = side * 0.5;
    blush.castShadow = false;
    head.add(blush);
  }

  return head;
}

function buildTail(furMaterial: THREE.Material, accentMaterial: THREE.Material): THREE.Group {
  const tail = new THREE.Group();
  tail.name = "tail";
  // Pivot at the tail base so CatManager's sway reads as a real tail flick.
  tail.position.set(0, 0.12, -0.24);

  // Curls from the rear, around the side, to rest by the front paws.
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.02, 0),
    new THREE.Vector3(0.16, -0.04, 0.04),
    new THREE.Vector3(0.24, -0.07, 0.22),
    new THREE.Vector3(0.16, -0.07, 0.42),
  ]);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.034, 6, false), furMaterial);
  tube.castShadow = true;
  tail.add(tube);

  const tip = part(new THREE.SphereGeometry(0.042, 6, 5), accentMaterial, 0.16, -0.07, 0.42);
  tail.add(tip);
  return tail;
}

export function buildCatMesh(definition: CatDefinition): THREE.Group {
  const cat = new THREE.Group();
  cat.name = "cat";

  const { fur: furMaterial, accent: accentMaterial } = materialsFor(definition);

  // Haunches — the wide, settled base of a sitting cat.
  const haunches = part(new THREE.SphereGeometry(0.24, 10, 8), furMaterial, 0, 0.19, -0.08);
  haunches.scale.set(1.05, 0.85, 1.1);
  cat.add(haunches);

  // Torso leaning gently up toward the head.
  const torso = part(new THREE.SphereGeometry(0.185, 10, 8), furMaterial, 0, 0.33, 0.08);
  torso.name = "torso";
  torso.scale.set(0.95, 1.2, 0.95);
  torso.rotation.x = -0.12;
  cat.add(torso);

  // Chest patch in the accent colour.
  const chest = part(new THREE.SphereGeometry(0.11, 8, 6), accentMaterial, 0, 0.28, 0.18);
  chest.scale.set(0.85, 1.25, 0.55);
  chest.castShadow = false;
  cat.add(chest);

  // Front legs + accent paws, tucked neatly together.
  for (const side of [-1, 1] as const) {
    cat.add(part(new THREE.CapsuleGeometry(0.042, 0.13, 3, 6), furMaterial, side * 0.07, 0.12, 0.2));
    const paw = part(new THREE.SphereGeometry(0.05, 6, 5), accentMaterial, side * 0.07, 0.035, 0.24);
    paw.scale.set(1, 0.6, 1.25);
    cat.add(paw);
  }

  const head = buildHead(furMaterial, accentMaterial);
  head.add(buildEar(-1, furMaterial, accentMaterial));
  head.add(buildEar(1, furMaterial, accentMaterial));
  cat.add(head);

  cat.add(buildTail(furMaterial, accentMaterial));

  return cat;
}
