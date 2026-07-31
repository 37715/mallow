import * as THREE from "three";
import { ROOM_SIZE, mesh } from "@/scene/room";
import { MAX_DECOR_LEVEL } from "@/data/upgrades";

/**
 * Décor props revealed one per "cosy touches" level (§8 — décor has a stat
 * purpose *and* a visible one). Order matters: DECOR_PROPS[0] appears at
 * level 1, and the list must stay at least MAX_DECOR_LEVEL long.
 *
 * Everything here is warm, rounded, low-poly greybox in the §9 palette —
 * the real art pass is Milestone 4.
 */

const WOOD = new THREE.MeshStandardMaterial({ color: 0x9a7358, roughness: 0.7 });
const LEAF = new THREE.MeshStandardMaterial({ color: 0x7a9a63, roughness: 0.85 });
const TERRACOTTA = new THREE.MeshStandardMaterial({ color: 0xc47a52, roughness: 0.8 });
const LAMPSHADE = new THREE.MeshStandardMaterial({
  color: 0xffe0b0,
  roughness: 0.6,
  emissive: 0xffb865,
  emissiveIntensity: 0.35,
});
const CREAM = new THREE.MeshStandardMaterial({ color: 0xfff2df, roughness: 0.9 });
const BLUSH = new THREE.MeshStandardMaterial({ color: 0xe8b0a8, roughness: 0.9 });
const SAGE = new THREE.MeshStandardMaterial({ color: 0x9fb59a, roughness: 0.9 });

const BACK_WALL_Z = -ROOM_SIZE.depth / 2 + 0.06;
const LEFT_WALL_X = -ROOM_SIZE.width / 2 + 0.08;
const RIGHT_WALL_X = ROOM_SIZE.width / 2 - 0.08;

function pottedPlant(): THREE.Group {
  const group = new THREE.Group();
  group.add(mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.34, 8), TERRACOTTA, 0, 0.17, 0));
  group.add(mesh(new THREE.SphereGeometry(0.3, 8, 6), LEAF, 0, 0.55, 0));
  group.add(mesh(new THREE.SphereGeometry(0.2, 8, 6), LEAF, 0.16, 0.78, 0.06));
  group.add(mesh(new THREE.SphereGeometry(0.16, 8, 6), LEAF, -0.18, 0.72, -0.05));
  return group;
}

function floorLamp(): THREE.Group {
  const group = new THREE.Group();
  group.add(mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.06, 10), WOOD, 0, 0.03, 0));
  group.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.5, 6), WOOD, 0, 0.78, 0));
  group.add(mesh(new THREE.ConeGeometry(0.32, 0.4, 10, 1, true), LAMPSHADE, 0, 1.68, 0));
  // A soft pool of light so the lamp actually reads as lit (§9 — lighting is the star).
  const glow = new THREE.PointLight(0xffc98a, 6, 4.5, 2);
  glow.position.set(0, 1.5, 0);
  group.add(glow);
  return group;
}

function wallArt(frameMaterial: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  group.add(mesh(new THREE.BoxGeometry(0.72, 0.56, 0.05), WOOD, 0, 0, 0));
  group.add(mesh(new THREE.BoxGeometry(0.58, 0.42, 0.02), frameMaterial, 0, 0, 0.04));
  return group;
}

function bookshelf(): THREE.Group {
  const group = new THREE.Group();
  group.add(mesh(new THREE.BoxGeometry(0.3, 1.5, 1.4), WOOD, 0, 0.75, 0));
  const bookColors = [BLUSH, SAGE, CREAM, TERRACOTTA];
  for (let i = 0; i < 8; i++) {
    const shelfY = 0.5 + Math.floor(i / 4) * 0.55;
    const z = -0.5 + (i % 4) * 0.32;
    group.add(
      mesh(new THREE.BoxGeometry(0.22, 0.26, 0.08), bookColors[i % bookColors.length], 0.05, shelfY, z),
    );
  }
  return group;
}

function wallShelf(): THREE.Group {
  const group = new THREE.Group();
  group.add(mesh(new THREE.BoxGeometry(0.26, 0.05, 1.6), WOOD, 0, 0, 0));
  group.add(mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.18, 8), TERRACOTTA, 0, 0.12, -0.5));
  group.add(mesh(new THREE.SphereGeometry(0.14, 8, 6), LEAF, 0, 0.3, -0.5));
  group.add(mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.16, 8), BLUSH, 0, 0.11, 0.3));
  group.add(mesh(new THREE.SphereGeometry(0.12, 8, 6), LEAF, 0, 0.27, 0.3));
  return group;
}

function bunting(): THREE.Group {
  const group = new THREE.Group();
  const colors = [BLUSH, CREAM, SAGE, TERRACOTTA, LAMPSHADE];
  for (let i = 0; i < 11; i++) {
    const x = -3.0 + i * 0.6;
    // Gentle catenary sag so the string doesn't read as a straight bar.
    const sag = Math.cos((i / 10 - 0.5) * Math.PI) * 0.22;
    const flag = mesh(new THREE.ConeGeometry(0.13, 0.26, 3), colors[i % colors.length], x, -sag, 0);
    flag.rotation.x = Math.PI;
    group.add(flag);
  }
  return group;
}

function doorMat(): THREE.Group {
  const group = new THREE.Group();
  const mat = mesh(new THREE.BoxGeometry(1.5, 0.03, 0.8), BLUSH, 0, 0, 0);
  group.add(mat);
  return group;
}

function catTree(): THREE.Group {
  const group = new THREE.Group();
  group.add(mesh(new THREE.BoxGeometry(0.7, 0.08, 0.7), WOOD, 0, 0.04, 0));
  group.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.0, 8), TERRACOTTA, 0, 0.55, 0));
  group.add(mesh(new THREE.BoxGeometry(0.6, 0.09, 0.6), CREAM, 0, 1.08, 0));
  group.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.55, 8), TERRACOTTA, 0.15, 1.38, 0));
  group.add(mesh(new THREE.BoxGeometry(0.45, 0.09, 0.45), BLUSH, 0.15, 1.68, 0));
  return group;
}

function windowBox(): THREE.Group {
  const group = new THREE.Group();
  group.add(mesh(new THREE.BoxGeometry(0.24, 0.26, 1.2), WOOD, 0, 0, 0));
  for (let i = 0; i < 4; i++) {
    group.add(mesh(new THREE.SphereGeometry(0.13, 8, 6), LEAF, 0, 0.2, -0.45 + i * 0.3));
  }
  return group;
}

export interface DecorProp {
  /** Stable id — handy for debugging and for analytics if we ever log décor. */
  id: string;
  build: () => THREE.Group;
  position: THREE.Vector3;
  /** Y-rotation in radians, for props that sit flush against a side wall. */
  rotationY?: number;
}

/**
 * Revealed in order, one per "cosy touches" level.
 *
 * Placement is constrained by a *fully expanded* café: 12 seats fill
 * x −3.1…3.1, z −1.9…1.1, and cats lounge in front of them. That leaves the
 * back corners, the strip between counter and seating, and the walls above
 * table height. scene/layout.test.ts verifies nothing here clips.
 */
export const DECOR_PROPS: DecorProp[] = [
  { id: "plant-back-left", build: pottedPlant, position: new THREE.Vector3(-3.15, 0, -3.5) },
  { id: "plant-back-right", build: pottedPlant, position: new THREE.Vector3(3.15, 0, -3.5) },
  {
    id: "art-left",
    build: () => wallArt(BLUSH),
    position: new THREE.Vector3(-1.9, 2.05, BACK_WALL_Z),
  },
  {
    id: "art-right",
    build: () => wallArt(SAGE),
    position: new THREE.Vector3(1.9, 2.05, BACK_WALL_Z),
  },
  {
    // Tucked between the counter and the seating, where no table can ever go.
    id: "lamp-right",
    build: floorLamp,
    position: new THREE.Vector3(3.5, 0, -2.75),
  },
  {
    id: "bookshelf",
    build: bookshelf,
    position: new THREE.Vector3(LEFT_WALL_X + 0.15, 0, -2.75),
  },
  {
    // Wall-mounted above table height, so it clears the seating by construction.
    id: "shelf-right",
    build: wallShelf,
    position: new THREE.Vector3(RIGHT_WALL_X - 0.15, 1.55, -0.8),
  },
  { id: "bunting", build: bunting, position: new THREE.Vector3(0, 2.95, BACK_WALL_Z + 0.12) },
  { id: "door-mat", build: doorMat, position: new THREE.Vector3(0, 0.02, 3.0) },
  { id: "cat-tree", build: catTree, position: new THREE.Vector3(3.5, 0, 2.2) },
  { id: "window-box", build: windowBox, position: new THREE.Vector3(LEFT_WALL_X + 0.15, 1.5, 1.6) },
];

// A missing prop would silently cap visible décor below what the player bought.
if (DECOR_PROPS.length < MAX_DECOR_LEVEL) {
  throw new Error(
    `DECOR_PROPS has ${DECOR_PROPS.length} props but décor upgrades go to level ${MAX_DECOR_LEVEL}`,
  );
}
