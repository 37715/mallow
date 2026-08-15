import * as THREE from "three";
import { ROOM } from "@/data/cafe-layout";
import { expansionCandidates, tileCentre, tileKey, type TileKey } from "@/data/expansion";

/**
 * The ghost tiles you can buy floor on (§8 step 6).
 *
 * Ellis: *"it shows all the possible places i can add more flooring like
 * transparent with a little plus and a cost and if i press plus it builds the
 * floor there."*
 *
 * **The plus is a DOM button projected onto the tile, not 3D geometry**, which
 * is the same trick the coin floaters and cat labels use (§10): text and icons
 * stay crisp at any pixel ratio, they cost no draw calls, and a button is a
 * real tap target with a real pressed state rather than a raycast against a
 * quad. The *tile* is 3D because it has to sit on the floor plane in
 * perspective; everything else is better off flat.
 *
 * The ghost breathes — a slow pulse — because a static translucent square on a
 * static floor reads as a rendering fault rather than an invitation.
 */

export interface ExpansionPreview {
  /** Show the candidates for this set of owned tiles, or hide with null. */
  show(tiles: TileKey[] | null): void;
  /** True while the ghosts are up, so taps elsewhere can be ignored. */
  isOpen(): boolean;
  /** Candidate tiles currently on offer, with their world centres. */
  candidates(): { key: TileKey; position: THREE.Vector3 }[];
  update(now: number): void;
  dispose(): void;
}

const GHOST_COLOUR = 0xffd9a8;

export function createExpansionPreview(scene: THREE.Scene): ExpansionPreview {
  const group = new THREE.Group();
  group.name = "expansion-ghosts";
  group.visible = false;
  scene.add(group);

  // One shared geometry and material: every ghost is the same square.
  const geometry = new THREE.PlaneGeometry(ROOM.tile * 0.94, ROOM.tile * 0.94);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    color: GHOST_COLOUR,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  });
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: GHOST_COLOUR,
    transparent: true,
    opacity: 0.7,
  });

  let shown: { key: TileKey; position: THREE.Vector3 }[] = [];

  return {
    isOpen: () => group.visible,
    candidates: () => shown,

    show(tiles) {
      group.clear();
      shown = [];
      if (!tiles) {
        group.visible = false;
        return;
      }

      for (const tile of expansionCandidates(tiles)) {
        const at = tileCentre(tile);
        const mesh = new THREE.Mesh(geometry, material);
        // Just clear of the ground so it never z-fights with the backdrop.
        mesh.position.set(at.x, 0.02, at.z);
        group.add(mesh);

        const outline = new THREE.LineSegments(
          new THREE.EdgesGeometry(geometry),
          edgeMaterial,
        );
        outline.position.copy(mesh.position);
        group.add(outline);

        shown.push({ key: tileKey(tile), position: new THREE.Vector3(at.x, 0.02, at.z) });
      }
      group.visible = shown.length > 0;
    },

    update(now) {
      if (!group.visible) return;
      // One pulse shared by every ghost: they are one offer, not several
      // competing ones, so they should breathe together.
      material.opacity = 0.2 + Math.sin(now / 620) * 0.07;
    },

    dispose() {
      group.clear();
      scene.remove(group);
      geometry.dispose();
      material.dispose();
      edgeMaterial.dispose();
    },
  };
}
