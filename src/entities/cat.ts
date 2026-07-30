import * as THREE from "three";
import { type CatDefinition } from "@/data/cats";

/**
 * Placeholder low-poly cat built from primitives. Swap for a GLB hero asset
 * once one exists (§9) — the silhouette/positions here are what matters for now.
 */
export function buildCatMesh(definition: CatDefinition): THREE.Group {
  const { furColor, accentColor, rarity } = definition;
  const cat = new THREE.Group();
  cat.name = "cat";

  // Epic/legendary cats glow very softly so rarity reads in-scene (§8) —
  // subtle enough to stay inside the warm palette (§9).
  const emissiveIntensity = rarity === "legendary" ? 0.18 : rarity === "epic" ? 0.1 : 0;
  const furMaterial = new THREE.MeshStandardMaterial({
    color: furColor,
    roughness: 0.8,
    emissive: furColor,
    emissiveIntensity,
  });
  const accentMaterial = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.8 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.35, 4, 8), furMaterial);
  body.rotation.z = Math.PI / 2;
  body.position.set(0, 0.24, 0);
  body.castShadow = true;
  cat.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), furMaterial);
  head.position.set(0, 0.34, 0.32);
  head.castShadow = true;
  cat.add(head);

  const earGeometry = new THREE.ConeGeometry(0.07, 0.12, 8);
  const earLeft = new THREE.Mesh(earGeometry, accentMaterial);
  earLeft.position.set(-0.09, 0.5, 0.36);
  cat.add(earLeft);
  const earRight = earLeft.clone();
  earRight.position.x = 0.09;
  cat.add(earRight);

  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.35, 4, 8), furMaterial);
  tail.position.set(0, 0.35, -0.35);
  tail.rotation.x = -Math.PI / 3;
  cat.add(tail);

  return cat;
}
