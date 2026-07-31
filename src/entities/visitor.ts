import * as THREE from "three";

const VISITOR_OUTFITS = [0x7a9cc6, 0xc68a7a, 0x9cc67a, 0xc6a97a, 0xa27ac6];
const VISITOR_HAIR = [0x4a3826, 0x8a6a52, 0x2f2f2f, 0xb5876a, 0xd9c2a0];
const SKIN = 0xf0c8a8;

/**
 * Low-poly visitor matching the cats' flat-shaded style (§9 cohesion): a soft
 * capsule body in a cosy outfit colour, a round head, and a cap of hair so
 * they read as little people rather than pills.
 */
// One material per palette entry, shared across every visitor who draws it —
// visitors churn constantly, so per-instance materials would pile up (§13).
const SKIN_MATERIAL = new THREE.MeshStandardMaterial({
  color: SKIN,
  roughness: 0.8,
  flatShading: true,
});
const OUTFIT_MATERIALS = VISITOR_OUTFITS.map(
  (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true }),
);
const HAIR_MATERIALS = VISITOR_HAIR.map(
  (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true }),
);

export function buildVisitorMesh(seed: number): THREE.Group {
  const visitor = new THREE.Group();
  visitor.name = "visitor";

  const outfit = OUTFIT_MATERIALS[seed % OUTFIT_MATERIALS.length];
  const skin = SKIN_MATERIAL;
  const hair = HAIR_MATERIALS[(seed * 3 + 1) % HAIR_MATERIALS.length];

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.42, 4, 8), outfit);
  body.position.y = 0.4;
  body.castShadow = true;
  visitor.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), skin);
  head.position.y = 0.8;
  head.castShadow = true;
  visitor.add(head);

  // Hair: a slightly larger half-dome sat on the back of the head.
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
  cap.position.set(0, 0.815, -0.015);
  cap.castShadow = true;
  visitor.add(cap);

  return visitor;
}
