import * as THREE from "three";
import type { CatInstance } from "@/state/store";
import { buildCatMesh } from "@/entities/cat";
import { CAT_DISPLAY_POSITIONS } from "@/scene/room";

/** Keeps the scene's cat meshes in sync with the store's cat list. */
export class CatManager {
  private readonly group = new THREE.Group();
  private readonly meshesById = new Map<string, THREE.Group>();

  constructor(scene: THREE.Scene) {
    this.group.name = "cats";
    scene.add(this.group);
  }

  sync(cats: CatInstance[]): void {
    for (const cat of cats) {
      if (this.meshesById.has(cat.id)) continue;

      const mesh = buildCatMesh(cat.appearanceIndex);
      const displayIndex = this.meshesById.size % CAT_DISPLAY_POSITIONS.length;
      const pos = CAT_DISPLAY_POSITIONS[displayIndex];
      mesh.position.copy(pos);
      // Face into the café (toward the seats / counter).
      mesh.rotation.y = pos.x < 0 ? Math.PI * 0.25 : -Math.PI * 0.25;

      this.group.add(mesh);
      this.meshesById.set(cat.id, mesh);
    }
  }

  /** Gentle idle sway so the café doesn't feel static (§10 juice). */
  animate(now: number): void {
    let i = 0;
    for (const mesh of this.meshesById.values()) {
      const phase = now * 0.002 + i * 1.3;
      mesh.rotation.z = Math.sin(phase) * 0.03;
      mesh.position.y = Math.sin(phase * 0.7) * 0.01;
      i++;
    }
  }
}
