import * as THREE from "three";
import type { CatInstance } from "@/state/store";
import { catDefinition } from "@/data/cats";
import { buildCatMesh } from "@/entities/cat";
import { CAT_DISPLAY_POSITIONS } from "@/scene/room";
import type { CatLabelAnchor } from "@/ui/cat-labels";

const BASE_SCALE = 1.25;
const POP_DURATION_MS = 420;
const LABEL_HEIGHT = 0.95;

interface TrackedCat {
  mesh: THREE.Group;
  basePosition: THREE.Vector3;
  spawnedAt: number;
  name: string;
}

/** Keeps the scene's cat meshes in sync with the store's cat list. */
export class CatManager {
  private readonly group = new THREE.Group();
  private readonly tracked = new Map<string, TrackedCat>();

  constructor(scene: THREE.Scene) {
    this.group.name = "cats";
    scene.add(this.group);
  }

  sync(cats: CatInstance[], now: number): void {
    for (const cat of cats) {
      if (this.tracked.has(cat.id)) continue;

      const mesh = buildCatMesh(catDefinition(cat.definitionId));
      // buildCatMesh already scales; we animate from near-zero on spawn.
      mesh.scale.setScalar(0.01);

      const slot = this.tracked.size;
      const displayIndex = slot % CAT_DISPLAY_POSITIONS.length;
      const pos = CAT_DISPLAY_POSITIONS[displayIndex].clone();
      // Once every lounge spot is taken, later cats nudge forward so they
      // don't sit exactly inside an earlier cat.
      const wrap = Math.floor(slot / CAT_DISPLAY_POSITIONS.length);
      pos.z += wrap * 0.55;
      pos.x += wrap * (displayIndex % 2 === 0 ? 0.25 : -0.25);
      mesh.position.copy(pos);
      mesh.rotation.y = pos.x < 0 ? Math.PI * 0.25 : -Math.PI * 0.25;

      this.group.add(mesh);
      this.tracked.set(cat.id, {
        mesh,
        basePosition: pos,
        spawnedAt: now,
        name: cat.name,
      });
    }
  }

  getLabelAnchors(): CatLabelAnchor[] {
    const anchors: CatLabelAnchor[] = [];
    for (const [id, tracked] of this.tracked) {
      anchors.push({
        id,
        name: tracked.name,
        worldPosition: new THREE.Vector3(
          tracked.mesh.position.x,
          tracked.mesh.position.y + LABEL_HEIGHT,
          tracked.mesh.position.z,
        ),
      });
    }
    return anchors;
  }

  /** Idle sway + spawn pop so new cats feel like they arrived (§10). */
  animate(now: number): void {
    let i = 0;
    for (const tracked of this.tracked.values()) {
      const phase = now * 0.002 + i * 1.3;
      const popT = Math.min(1, (now - tracked.spawnedAt) / POP_DURATION_MS);
      // Ease-out back-ish without a tween lib.
      const overshoot = 1.12;
      const popScale =
        popT < 1
          ? BASE_SCALE * (overshoot * (1 - Math.pow(1 - popT, 3)) - (overshoot - 1) * (1 - popT))
          : BASE_SCALE;

      tracked.mesh.scale.setScalar(Math.max(0.01, popScale));
      tracked.mesh.rotation.z = Math.sin(phase) * 0.03;
      tracked.mesh.position.y = tracked.basePosition.y + Math.sin(phase * 0.7) * 0.01;
      i++;
    }
  }
}
