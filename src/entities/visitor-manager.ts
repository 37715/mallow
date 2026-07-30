import * as THREE from "three";
import type { Visitor } from "@/systems/visitors";
import { buildVisitorMesh } from "@/entities/visitor";
import { DOOR_POSITION, SEAT_POSITIONS } from "@/scene/room";

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Keeps the scene's visitor meshes in sync with the store's visitor list, and
 * interpolates their walk-in / sit / walk-out motion purely from timestamps. */
export class VisitorManager {
  private readonly group = new THREE.Group();
  private readonly meshesById = new Map<string, THREE.Group>();

  constructor(scene: THREE.Scene) {
    this.group.name = "visitors";
    scene.add(this.group);
  }

  sync(visitors: Visitor[], now: number): void {
    const activeIds = new Set(visitors.map((v) => v.id));

    for (const [id, mesh] of this.meshesById) {
      if (!activeIds.has(id)) {
        this.group.remove(mesh);
        this.meshesById.delete(id);
      }
    }

    for (const visitor of visitors) {
      let mesh = this.meshesById.get(visitor.id);
      if (!mesh) {
        mesh = buildVisitorMesh(visitor.seatIndex);
        this.group.add(mesh);
        this.meshesById.set(visitor.id, mesh);
      }
      this.positionVisitor(mesh, visitor, now);
    }
  }

  private positionVisitor(mesh: THREE.Group, visitor: Visitor, now: number): void {
    const seatPos = SEAT_POSITIONS[visitor.seatIndex] ?? DOOR_POSITION;

    if (now < visitor.seatedAt) {
      const t = THREE.MathUtils.clamp(
        (now - visitor.spawnedAt) / Math.max(1, visitor.seatedAt - visitor.spawnedAt),
        0,
        1,
      );
      mesh.position.lerpVectors(DOOR_POSITION, seatPos, easeInOut(t));
      mesh.lookAt(seatPos.x, mesh.position.y, seatPos.z);
    } else if (now < visitor.leavingAt) {
      mesh.position.copy(seatPos);
    } else {
      const t = THREE.MathUtils.clamp(
        (now - visitor.leavingAt) / Math.max(1, visitor.doneAt - visitor.leavingAt),
        0,
        1,
      );
      mesh.position.lerpVectors(seatPos, DOOR_POSITION, easeInOut(t));
      mesh.lookAt(DOOR_POSITION.x, mesh.position.y, DOOR_POSITION.z);
    }
  }
}
