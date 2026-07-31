import * as THREE from "three";
import type { CatInstance } from "@/state/store";
import { catDefinition } from "@/data/cats";
import { buildCatMesh } from "@/entities/cat";
import { CAT_DISPLAY_POSITIONS } from "@/scene/room";
import type { CatLabelAnchor } from "@/ui/cat-labels";

/** How many cats the café can show at once — the rest are napping upstairs. */
export const MAX_VISIBLE_CATS = CAT_DISPLAY_POSITIONS.length;

/** Scale a settled cat renders at. Exported so layout checks use the real size. */
export const CAT_DISPLAY_SCALE = 1.25;
const BASE_SCALE = CAT_DISPLAY_SCALE;
const POP_DURATION_MS = 420;
const PET_DURATION_MS = 650;
/** Name pills float just clear of a sitting cat's ears (mesh is ~0.96 tall). */
const LABEL_HEIGHT = 1.18;

interface TrackedCat {
  mesh: THREE.Group;
  basePosition: THREE.Vector3;
  spawnedAt: number;
  /** When this cat was last petted — drives the happy squash-and-wiggle. */
  pettedAt: number;
  name: string;
  // Animation hooks resolved once at spawn (see entities/cat.ts named parts).
  head: THREE.Object3D | null;
  tail: THREE.Object3D | null;
  earL: THREE.Object3D | null;
  earR: THREE.Object3D | null;
  tailRestZ: number;
  headRestY: number;
}

/** Keeps the scene's cat meshes in sync with the store's cat list. */
export class CatManager {
  private readonly group = new THREE.Group();
  private readonly tracked = new Map<string, TrackedCat>();
  private readonly raycaster = new THREE.Raycaster();

  constructor(scene: THREE.Scene) {
    this.group.name = "cats";
    scene.add(this.group);
  }

  sync(cats: CatInstance[], now: number): void {
    for (const cat of cats) {
      if (this.tracked.has(cat.id)) continue;
      // Hard cap: the room has a fixed number of lounge spots (scene/room.ts).
      // Overflow cats still exist — they count for appeal and appear in the
      // roster — they just aren't rendered. Nudging them backwards instead,
      // as an earlier version did, stacked them into a pyramid that clipped
      // through the back wall.
      if (this.tracked.size >= CAT_DISPLAY_POSITIONS.length) break;

      const mesh = buildCatMesh(catDefinition(cat.definitionId));
      // buildCatMesh already scales; we animate from near-zero on spawn.
      mesh.scale.setScalar(0.01);

      const pos = CAT_DISPLAY_POSITIONS[this.tracked.size].clone();
      mesh.position.copy(pos);
      // Sitting cats face the door/camera, angled gently toward the aisle.
      mesh.rotation.y = pos.x < 0 ? Math.PI * 0.12 : -Math.PI * 0.12;

      this.group.add(mesh);
      const head = mesh.getObjectByName("head") ?? null;
      const tail = mesh.getObjectByName("tail") ?? null;
      this.tracked.set(cat.id, {
        mesh,
        basePosition: pos,
        spawnedAt: now,
        pettedAt: -Infinity,
        name: cat.name,
        head,
        tail,
        earL: mesh.getObjectByName("earL") ?? null,
        earR: mesh.getObjectByName("earR") ?? null,
        tailRestZ: tail?.rotation.z ?? 0,
        headRestY: head?.rotation.y ?? 0,
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

  /**
   * Which cat (if any) is under this screen point. `ndc` is normalised device
   * coordinates (−1…1). Used by the tap-to-pet interaction (§10).
   */
  pick(ndc: THREE.Vector2, camera: THREE.Camera): string | null {
    this.raycaster.setFromCamera(ndc, camera);
    const hits = this.raycaster.intersectObjects(this.group.children, true);
    if (hits.length === 0) return null;
    for (const [id, tracked] of this.tracked) {
      let node: THREE.Object3D | null = hits[0].object;
      while (node) {
        if (node === tracked.mesh) return id;
        node = node.parent;
      }
    }
    return null;
  }

  /** World position of a cat — lets the UI spawn hearts where the cat is. */
  worldPositionOf(id: string): THREE.Vector3 | null {
    const tracked = this.tracked.get(id);
    return tracked ? tracked.mesh.position.clone().setY(0.5) : null;
  }

  /** Trigger the happy pet wiggle. */
  pet(id: string, now: number): void {
    const tracked = this.tracked.get(id);
    if (tracked) tracked.pettedAt = now;
  }

  /**
   * Idle life (§10): breathing, tail sway, ear twitches, a slow head tilt —
   * plus the spawn pop and the pet wiggle. Each cat runs on its own phase so
   * the room never moves in lockstep.
   */
  animate(now: number): void {
    let i = 0;
    for (const tracked of this.tracked.values()) {
      const phase = now * 0.0016 + i * 1.7;
      const popT = Math.min(1, (now - tracked.spawnedAt) / POP_DURATION_MS);
      // Ease-out back-ish without a tween lib.
      const overshoot = 1.12;
      let scale =
        popT < 1
          ? BASE_SCALE * (overshoot * (1 - Math.pow(1 - popT, 3)) - (overshoot - 1) * (1 - popT))
          : BASE_SCALE;

      // Pet response: a quick squash that springs back with a wobble.
      const petT = (now - tracked.pettedAt) / PET_DURATION_MS;
      let petWiggle = 0;
      if (petT >= 0 && petT < 1) {
        const decay = 1 - petT;
        scale *= 1 - 0.12 * Math.sin(petT * Math.PI) * decay;
        petWiggle = Math.sin(petT * Math.PI * 5) * 0.1 * decay;
      }

      tracked.mesh.scale.setScalar(Math.max(0.01, scale));
      // Breathing: the whole cat settles and rises, barely.
      tracked.mesh.scale.y *= 1 + Math.sin(phase * 1.9) * 0.015;
      tracked.mesh.rotation.z = Math.sin(phase) * 0.02 + petWiggle;

      if (tracked.tail) {
        tracked.tail.rotation.z = tracked.tailRestZ + Math.sin(phase * 1.3) * 0.16;
      }
      if (tracked.head) {
        tracked.head.rotation.y = tracked.headRestY + Math.sin(phase * 0.6) * 0.1;
        tracked.head.rotation.z = Math.sin(phase * 0.45 + 1) * 0.05 + petWiggle * 0.6;
      }
      // Occasional ear twitch — a short burst every few seconds, offset per cat.
      const twitchCycle = (now * 0.001 + i * 2.3) % 6.5;
      const twitch = twitchCycle < 0.24 ? Math.sin((twitchCycle / 0.24) * Math.PI * 2) * 0.35 : 0;
      if (tracked.earL) tracked.earL.rotation.x = twitch * 0.6;
      if (tracked.earR) tracked.earR.rotation.x = i % 2 === 0 ? 0 : twitch * 0.6;

      i++;
    }
  }
}
