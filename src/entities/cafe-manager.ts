import * as THREE from "three";
import { SEAT_POSITIONS, buildTableSet } from "@/scene/room";
import { DECOR_PROPS } from "@/scene/decor";

const POP_DURATION_MS = 520;

interface Placed {
  object: THREE.Object3D;
  addedAt: number;
  /** Scale the object settles at once the pop-in finishes. */
  targetScale: number;
}

/**
 * Keeps the café's *furniture* in sync with the player's upgrades: one table
 * set per unlocked seat, one décor prop per "cosy touches" level.
 *
 * Objects are only ever added — buying an upgrade makes the room visibly grow,
 * which is the whole point of expansion (§8). New arrivals pop in rather than
 * appearing instantly (§10 — nothing snaps).
 */
export class CafeManager {
  private readonly group = new THREE.Group();
  private readonly placed: Placed[] = [];
  private seatsBuilt = 0;
  private decorBuilt = 0;

  constructor(scene: THREE.Scene) {
    this.group.name = "cafe";
    scene.add(this.group);
  }

  /**
   * `firstBuild` skips the pop-in for whatever the café already owns at launch,
   * so a returning player's room is simply *there* instead of assembling itself.
   */
  sync(seatCount: number, decorLevel: number, now: number, firstBuild = false): void {
    const seatsWanted = Math.min(seatCount, SEAT_POSITIONS.length);
    for (let i = this.seatsBuilt; i < seatsWanted; i++) {
      this.place(buildTableSet(SEAT_POSITIONS[i]), 1, now, firstBuild);
    }
    this.seatsBuilt = Math.max(this.seatsBuilt, seatsWanted);

    const decorWanted = Math.min(decorLevel, DECOR_PROPS.length);
    for (let i = this.decorBuilt; i < decorWanted; i++) {
      const prop = DECOR_PROPS[i];
      const object = prop.build();
      object.position.copy(prop.position);
      if (prop.rotationY !== undefined) object.rotation.y = prop.rotationY;
      this.place(object, 1, now, firstBuild);
    }
    this.decorBuilt = Math.max(this.decorBuilt, decorWanted);
  }

  private place(object: THREE.Object3D, targetScale: number, now: number, instant: boolean): void {
    object.scale.setScalar(instant ? targetScale : 0.01);
    this.group.add(object);
    if (!instant) this.placed.push({ object, addedAt: now, targetScale });
  }

  /**
   * Tear down every table and prop. Used when the café moves venue: fixtures
   * belong to the old building, so the new room starts bare and fills up again
   * as the player re-buys (§8).
   */
  reset(): void {
    for (const child of [...this.group.children]) {
      this.group.remove(child);
    }
    this.placed.length = 0;
    this.seatsBuilt = 0;
    this.decorBuilt = 0;
  }

  /** Runs the pop-in easing for anything added recently. Cheap once settled. */
  animate(now: number): void {
    for (let i = this.placed.length - 1; i >= 0; i--) {
      const entry = this.placed[i];
      const t = Math.min(1, (now - entry.addedAt) / POP_DURATION_MS);
      // Ease-out with a little overshoot, matching CatManager's spawn feel.
      const overshoot = 1.1;
      const scale =
        entry.targetScale *
        (overshoot * (1 - Math.pow(1 - t, 3)) - (overshoot - 1) * (1 - t));
      entry.object.scale.setScalar(Math.max(0.01, scale));

      if (t >= 1) {
        entry.object.scale.setScalar(entry.targetScale);
        this.placed.splice(i, 1);
      }
    }
  }
}
