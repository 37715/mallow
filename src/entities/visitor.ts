import * as THREE from "three";

const VISITOR_COLORS = [0x7a9cc6, 0xc68a7a, 0x9cc67a, 0xc6a97a, 0xa27ac6];

/** Simple placeholder humanoid — a soft capsule "person" in a cosy accent color. */
export function buildVisitorMesh(seed: number): THREE.Group {
  const visitor = new THREE.Group();
  visitor.name = "visitor";

  const color = VISITOR_COLORS[seed % VISITOR_COLORS.length];
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.5, 4, 8), material);
  body.position.y = 0.43;
  body.castShadow = true;
  visitor.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), material);
  head.position.y = 0.85;
  head.castShadow = true;
  visitor.add(head);

  return visitor;
}
