import * as THREE from "three";
import { ROOM_SIZE } from "@/scene/room";

/**
 * Dust motes drifting in the warm light (§10). One THREE.Points with additive
 * blending — a single draw call for the whole effect, which matters on a
 * mid-range phone (§13).
 *
 * The motion is a cheap trick: each mote drifts upward slowly and wraps around
 * when it reaches the ceiling, with a sine wobble so paths aren't straight
 * lines. No physics, no per-mote allocation after construction.
 */

const MOTE_COUNT = 90;
const RISE_SPEED = 0.055;

export class DustMotes {
  private readonly points: THREE.Points;
  private readonly basePositions: Float32Array;
  private readonly phases: Float32Array;
  private readonly speeds: Float32Array;

  constructor(scene: THREE.Scene) {
    const positions = new Float32Array(MOTE_COUNT * 3);
    this.basePositions = new Float32Array(MOTE_COUNT * 3);
    this.phases = new Float32Array(MOTE_COUNT);
    this.speeds = new Float32Array(MOTE_COUNT);

    for (let i = 0; i < MOTE_COUNT; i++) {
      const x = (Math.random() - 0.5) * ROOM_SIZE.width * 0.92;
      const y = Math.random() * (ROOM_SIZE.wallHeight - 0.4);
      const z = (Math.random() - 0.5) * ROOM_SIZE.depth * 0.92;
      positions.set([x, y, z], i * 3);
      this.basePositions.set([x, y, z], i * 3);
      this.phases[i] = Math.random() * Math.PI * 2;
      this.speeds[i] = 0.6 + Math.random() * 0.8;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffe3b0,
      size: 0.035,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(geometry, material);
    this.points.name = "dust";
    // Motes are atmosphere, not objects — never let them catch or block light.
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  update(now: number): void {
    const attribute = this.points.geometry.getAttribute("position") as THREE.BufferAttribute;
    const array = attribute.array as Float32Array;
    const seconds = now * 0.001;
    const ceiling = ROOM_SIZE.wallHeight - 0.3;

    for (let i = 0; i < MOTE_COUNT; i++) {
      const o = i * 3;
      const phase = this.phases[i];
      // Rise and wrap, so the room always has motes at every height.
      const risen = (this.basePositions[o + 1] + seconds * RISE_SPEED * this.speeds[i]) % ceiling;
      array[o] = this.basePositions[o] + Math.sin(seconds * 0.35 * this.speeds[i] + phase) * 0.22;
      array[o + 1] = risen;
      array[o + 2] =
        this.basePositions[o + 2] + Math.cos(seconds * 0.28 * this.speeds[i] + phase) * 0.18;
    }
    attribute.needsUpdate = true;
  }
}
