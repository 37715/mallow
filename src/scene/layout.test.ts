import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  CAT_DISPLAY_POSITIONS,
  DOOR_POSITION,
  MAX_SEATS,
  ROOM_SIZE,
  SEAT_POSITIONS,
  buildTableSet,
} from "@/scene/room";
import { DECOR_PROPS } from "@/scene/decor";

/**
 * Geometry regression guard (§17 — add debug checks for anything spatial early,
 * rather than eyeballing it later). Everything is measured against a *fully
 * expanded* café: 12 seats plus every décor prop on screen at once, which is
 * the crowded worst case a player will actually reach.
 *
 * Bounding boxes only — no renderer or WebGL context needed.
 */

interface Item {
  name: string;
  box: THREE.Box3;
  /** Flat floor props (mats, rugs) are meant to be walked and sat over. */
  flat: boolean;
}

function buildAll(): Item[] {
  const items: Item[] = [];

  for (let i = 0; i < MAX_SEATS; i++) {
    items.push({
      name: `table-set-${i}`,
      box: new THREE.Box3().setFromObject(buildTableSet(SEAT_POSITIONS[i])),
      flat: false,
    });
  }

  for (const prop of DECOR_PROPS) {
    const object = prop.build();
    object.position.copy(prop.position);
    if (prop.rotationY !== undefined) object.rotation.y = prop.rotationY;
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    items.push({ name: `decor:${prop.id}`, box, flat: box.max.y - box.min.y < 0.12 });
  }

  return items;
}

const ITEMS = buildAll();

describe("café layout", () => {
  it("has a seat position for every seat the upgrades can unlock", () => {
    expect(SEAT_POSITIONS.length).toBe(MAX_SEATS);
  });

  it("keeps every seat and prop inside the room", () => {
    const halfW = ROOM_SIZE.width / 2;
    const halfD = ROOM_SIZE.depth / 2;
    const outside = ITEMS.filter(
      ({ box }) =>
        box.min.x < -halfW - 0.01 ||
        box.max.x > halfW + 0.01 ||
        box.min.z < -halfD - 0.01 ||
        box.max.z > halfD + 0.01 ||
        box.min.y < -0.01 ||
        box.max.y > ROOM_SIZE.wallHeight + 0.01,
    );
    expect(outside.map((i) => i.name)).toEqual([]);
  });

  it("has no furniture or décor clipping through anything else", () => {
    const clashes: string[] = [];
    for (let i = 0; i < ITEMS.length; i++) {
      for (let j = i + 1; j < ITEMS.length; j++) {
        const a = ITEMS[i];
        const b = ITEMS[j];
        if (a.flat || b.flat) continue;
        if (a.box.intersectsBox(b.box)) clashes.push(`${a.name} ↔ ${b.name}`);
      }
    }
    expect(clashes).toEqual([]);
  });

  it("leaves every cat lounge spot clear of furniture", () => {
    const clashes: string[] = [];
    CAT_DISPLAY_POSITIONS.forEach((position, index) => {
      const cat = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(position.x, 0.35, position.z),
        new THREE.Vector3(0.7, 0.7, 0.9),
      );
      for (const item of ITEMS) {
        if (item.flat) continue;
        if (item.box.intersectsBox(cat)) clashes.push(`cat-spot-${index} ↔ ${item.name}`);
      }
    });
    expect(clashes).toEqual([]);
  });

  it("leaves a walkable path from the door to every seat", () => {
    // Visitors lerp straight from the door to their seat, so that line has to
    // stay clear of décor — they have no pathfinding to route around it.
    const clashes: string[] = [];
    for (let seat = 0; seat < MAX_SEATS; seat++) {
      for (let t = 0.05; t < 1; t += 0.05) {
        const point = DOOR_POSITION.clone().lerp(SEAT_POSITIONS[seat], t);
        const walker = new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(point.x, 0.5, point.z),
          new THREE.Vector3(0.45, 1.0, 0.45),
        );
        for (const item of ITEMS) {
          if (item.flat || !item.name.startsWith("decor")) continue;
          if (item.box.intersectsBox(walker)) clashes.push(`seat ${seat} ↔ ${item.name}`);
        }
      }
    }
    expect([...new Set(clashes)]).toEqual([]);
  });
});
