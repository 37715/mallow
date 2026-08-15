import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { REQUIRED_CLIPS, SOCIAL_CLIPS } from "@/entities/character-library";
import { FACE_MESHES } from "@/entities/character-face";

/**
 * Every animation this module names must actually be in the pack.
 *
 * This reads the GLB's JSON chunk directly rather than loading it through
 * three — no renderer, no Draco, and it runs in `npm test` with everything
 * else. It exists because a missing clip name fails *silently*: `play()`
 * returns early, the guest freezes mid-sit, and nothing throws.
 *
 * The concrete trap it pins is `TallChair_Glass_Drink _Loop`, which has a
 * stray space **in the pack itself**. Anyone tidying that name up gets a
 * failing test instead of a room full of statues.
 */
interface Gltf {
  animations: { name: string }[];
  meshes: { name: string; primitives: { material: number }[] }[];
  materials: { name: string }[];
}

function gltf(): Gltf {
  const buffer = readFileSync("public/assets/characters/characters.glb");
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8")) as Gltf;
}

function clipNames(): Set<string> {
  // Clip names arrive prefixed `Armature|`, which the library strips.
  return new Set(gltf().animations.map((a) => a.name.replace(/^Armature\|/, "")));
}

describe("character clips", () => {
  const available = clipNames();

  it("has every clip the character library asks for", () => {
    const missing = REQUIRED_CLIPS.filter((name) => !available.has(name));
    expect(missing).toEqual([]);
  });

  it("kept the social clips the merge brought in", () => {
    // These come from a *second* pack, adopted onto the base rig by
    // `tools/convert-characters.py`. Every step of that merge — the rename off
    // `Armature.001|`, the duplicate drop, the rehoming — can fail by simply
    // producing fewer clips, which nothing else would notice.
    for (const clip of SOCIAL_CLIPS) expect(available.has(clip)).toBe(true);
  });

  it("has exactly one walk, not the talking pack's near-identical second one", () => {
    // Both packs ship `Walk_Loop`. If the duplicate drop stops working they
    // arrive as `Walk_Loop` and `Walk_Loop.001`, and which one a guest gets is
    // down to map ordering.
    expect([...available].filter((c) => c.startsWith("Walk_Loop"))).toEqual(["Walk_Loop"]);
  });

  it("gives each seat kind its own way to eat, drink and sip", () => {
    // A guest holding a cupcake must not mime drinking it out of a mug.
    for (const kind of ["TallChair", "Sofa", "Floor"]) {
      expect(REQUIRED_CLIPS.some((c) => c.startsWith(kind) && c.includes("Food_Eat"))).toBe(true);
      expect(REQUIRED_CLIPS.some((c) => c.startsWith(kind) && c.includes("Glass_Drink"))).toBe(true);
      expect(REQUIRED_CLIPS.some((c) => c.startsWith(kind) && c.includes("Cup_Drink"))).toBe(true);
    }
  });
});

/**
 * The face arrives through the same merge, and fails the same silent way.
 *
 * A guest with no `Body_Mouth` is not an error — they are just a person who
 * never speaks, which looks exactly like a person who has nothing to say. And
 * the material *names* matter as much as the meshes: `character-library.ts`
 * binds the skintone by switching on `M_Skin`, so a head that came through as
 * `M_Skin.001` would render bone white with nothing thrown.
 */
describe("character face", () => {
  const model = gltf();
  const byName = new Map(model.meshes.map((m) => [m.name, m]));

  it("has the three separately drivable face meshes", () => {
    for (const name of FACE_MESHES) expect(byName.has(name)).toBe(true);
  });

  it("puts the head on the shared M_Skin, so it takes a skintone", () => {
    const head = byName.get("Body_Head");
    expect(head).toBeDefined();
    const materials = head!.primitives.map((p) => model.materials[p.material].name);
    expect(materials).toEqual(["M_Skin"]);
  });

  it("keeps the eyes off the head, so they can blink independently of it", () => {
    // The base pack baked the eyes into `Body_Head` as a second primitive.
    // If that head ever comes back, the eyes stop moving and nothing says so.
    const head = byName.get("Body_Head");
    expect(head!.primitives).toHaveLength(1);
    for (const eye of ["Body_Eye_L", "Body_Eye_R"]) {
      const materials = byName.get(eye)!.primitives.map((p) => model.materials[p.material].name);
      expect(materials).toEqual(["M_Eyes"]);
    }
  });

  it("gives the mouth its own material to hang the viseme atlas on", () => {
    const mouth = byName.get("Body_Mouth");
    expect(mouth!.primitives.map((p) => model.materials[p.material].name)).toEqual(["M_Mouth"]);
  });
});
