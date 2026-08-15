import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  bindFaceAtlases,
  CharacterFace,
  FACE_MESHES,
  type ExpressionName,
  type MouthFrame,
} from "@/entities/character-face";

/**
 * The Minty.kit Cozy Character Pack (CC0), as café guests.
 *
 * This replaces the procedural capsule-with-a-head visitors. Everything here is
 * driven by three facts about the pack, all of which shape the API:
 *
 * 1. **It is a modular kit, not a character.** `characters.glb` holds 58 skinned
 *    meshes sharing *one* skeleton — a head, 18 hairstyles, 9 tops, 6 leg
 *    options, aprons, beards, accessories, and a set of held props. You build a
 *    person by keeping one mesh per slot and throwing the other 50-odd away.
 * 2. **Every clip is authored in place with the root bone at the origin.** The
 *    `*_Sit` clips do not translate `Root` at all — the sitting height comes
 *    entirely from limb rotations, which are posed for the pack's own furniture
 *    (and ours *is* the pack's own furniture). So a guest is positioned by
 *    standing them on the floor at the seat's x/z; the clip does the rest. Do
 *    not add `seatY` here, or everyone floats.
 * 3. **The `*_Sit` clips are transitions, not loops** — 0.8–1.1s of sitting
 *    down. The loops are separate (`TallChair_Wait_Idle1`, `Sofa_Cup_Drink_Loop`,
 *    `Floor_Food_Eat_Loop`). Playing a `Sit` on repeat makes people bob up and
 *    down forever, which is how this was first noticed.
 *
 * Clip names arrive prefixed `Armature|`; `clip()` hides that.
 *
 * **Draco is vendored, not fetched.** `tools/convert-characters.py` compresses
 * the pack 18.1 MB → 2.8 MB, which needs a decoder at runtime. The workshop
 * inspector pointed at a Google CDN; that cannot work in a packaged app with no
 * network, so the decoder lives in `public/draco/`.
 */

const MODEL_URL = "/assets/characters/characters.glb";
const TEXTURE_BASE = "/assets/characters/textures";
const DRACO_PATH = "/draco/";

/** Slot lists. One mesh from each is kept; every other mesh is discarded. */
const HAIR = [
  "Hair_Short",
  "Hair_ShortBob",
  "Hair_Long",
  "Hair_Ponytail",
  "Hair_Bun_Small",
  "Hair_Bun_Big",
  "Hair_Pigtails",
  "Hair_SideSweep",
  "Hair_ShortSpiky",
  "Hair_Shave_Buzzcut",
  "Hair_Shave_Swept",
  "Hair_Hijab",
  // **Append only.** A saved appearance stores the *index*, so inserting into
  // the middle of this list silently restyles everyone who already exists —
  // the player's avatar included. The two curly styles were in the pack all
  // along and simply never offered.
  "Hair_Shave_AfroTop",
  "Hair_Shave_BuzzAfro",
];
const TOPS = [
  "Clothes_Top_Tshirt",
  "Clothes_Top_Tshirt_V",
  "Clothes_Top_Hoodie",
  "Clothes_Top_Sweater_TurtleNeck",
  "Clothes_Top_CollarShirt_Long",
  "Clothes_Top_CollarBlouse_Short",
];
const LEGS = [
  "Clothes_Legs_Pants_Long",
  "Clothes_Legs_Pants_Short_Pockets",
  "Clothes_Legs_Skirt",
  "Clothes_Legs_Skirt_Long",
];
/** Something in hand, because a guest with nothing looks like they're waiting. */
const HELD = [
  "held_Coffee_Full",
  "held_Coffee_Whip",
  "held_Milkshake_Strawberry",
  "held_Milkshake_Matcha",
  "held_Cupcake_Bubblegum",
  "held_Cupcake_Orange",
];

const SKINTONES = 6;
const HAIR_COLOURS = 16;

/** Cosy, desaturated garment colours — no primaries; this is a quiet café. */
const TOP_COLOURS = [
  0xd8a0a6, 0xa9bfa0, 0x9fb4d4, 0xe6cf95, 0xd7a181, 0xefe6d5, 0xb9a8cc, 0x8fb3ae,
];
const LEG_COLOURS = [0x6f7f97, 0x4f4a49, 0xb59a76, 0x7f8467, 0x8e6f79, 0xd5c9b4];
const SHOE_COLOURS = [0x4a3a30, 0x3d3a3a, 0xcfc3af, 0xa2554c];

/**
 * Everything that makes one person look different from another, as explicit
 * indices rather than a seed.
 *
 * Guests are still generated from a seed (`appearanceFromSeed`) — nothing about
 * the café changed. This exists because the *player's* avatar has to be
 * editable one feature at a time in character creation, and you cannot nudge
 * "the hair" of a hash.
 */
export interface Appearance {
  hair: number;
  top: number;
  legs: number;
  held: number;
  skintone: number;
  hairColour: number;
  topColour: number;
  legColour: number;
  shoeColour: number;
}

/** How many choices each slot offers, for cycling in the creator. */
export const APPEARANCE_RANGES: Record<keyof Appearance, number> = {
  hair: HAIR.length,
  top: TOPS.length,
  legs: LEGS.length,
  held: HELD.length,
  skintone: SKINTONES,
  hairColour: HAIR_COLOURS,
  topColour: TOP_COLOURS.length,
  legColour: LEG_COLOURS.length,
  shoeColour: SHOE_COLOURS.length,
};

/** The look a given seed produces — the café's guests, unchanged. */
export function appearanceFromSeed(seed: number): Appearance {
  return {
    hair: hash(seed, 1) % HAIR.length,
    top: hash(seed, 2) % TOPS.length,
    legs: hash(seed, 3) % LEGS.length,
    held: hash(seed, 4) % HELD.length,
    skintone: hash(seed, 8) % SKINTONES,
    hairColour: hash(seed, 9) % HAIR_COLOURS,
    topColour: hash(seed, 5) % TOP_COLOURS.length,
    legColour: hash(seed, 6) % LEG_COLOURS.length,
    shoeColour: hash(seed, 7) % SHOE_COLOURS.length,
  };
}

/** Clamp a stored appearance, so a save from a build with more hairstyles
 *  than this one can't index off the end of the list. */
export function sanitizeAppearance(value: unknown): Appearance {
  const base = appearanceFromSeed(1);
  if (typeof value !== "object" || value === null) return base;
  const raw = value as Record<string, unknown>;
  const out = { ...base };
  for (const key of Object.keys(base) as Array<keyof Appearance>) {
    const n = raw[key];
    if (typeof n === "number" && Number.isFinite(n)) {
      out[key] = ((Math.floor(n) % APPEARANCE_RANGES[key]) + APPEARANCE_RANGES[key]) %
        APPEARANCE_RANGES[key];
    }
  }
  return out;
}

export interface CharacterAssets {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

/**
 * **The clothes have no texture, and that is the design, not a lost binding.**
 *
 * The pack ships four textures: six skintones, sixteen hair colours, an eye
 * sheet — and `T_Character_Atlas.png`, which despite the name is a *copy of the
 * café atlas*, there for the held cups and cupcakes. There is no garment
 * texture at all. Every top, skirt and pair of shoes is white geometry meant to
 * be tinted, which is how one `Clothes_Top_Hoodie` mesh becomes the pink hoodie
 * and the yellow blouse in the pack's own promo art.
 *
 * Binding that misnamed atlas to the clothes — the obvious first move — put
 * floorboards and blackboard chalk on everyone's trousers.
 *
 * So clothing colour is ours to choose, which is convenient: customer variety
 * was a listed gap (§0), and this is where it comes from.
 */
const MATERIAL_TEXTURES: Record<string, string> = {
  // The held props are café objects, so they take the café's atlas.
  M_CatCafe_Atlas: "/assets/cafe/T_CatCafe_Atlas.png",
};


/**
 * **You could see straight through people's hair into their heads, and it was
 * a lie told by the file, not a bug in the geometry.**
 *
 * Ellis, 2026-08-10: *"i can see through a lot of characters hairs into their
 * head quite often at many angles."*
 *
 * Every character material in `characters.glb` that carries a texture is
 * exported with `alphaMode: "BLEND"` — hair, skin and eyes alike — even though
 * the hair and skin PNGs are fully opaque (checked: alpha is 255 everywhere in
 * all sixteen hair colours and all six skintones). Blender writes BLEND
 * whenever a material's alpha is wired up at all, so it says nothing about
 * whether the texture actually has any.
 *
 * `GLTFLoader` reads BLEND as `transparent: true` **and turns off depth
 * writing**, which is the right default for real glass and catastrophic here.
 * With no depth written, hair and head are both in the transparent queue and
 * simply painted in whatever order they sort in — so the head paints over the
 * hair covering it, from any angle where the sort flips. That is exactly the
 * "see through the hair into the head" symptom.
 *
 * Marking the hair opaque puts it back in the opaque queue where it writes
 * depth, and the head behind it is then rejected by the depth test.
 *
 * **Skin and eyes are deliberately left alone.** The eye sheet genuinely has
 * alpha, and the eyes are a shell hugging the face that dips *inside* the skin
 * surface at its edges (skin front reaches z 0.286, the eye patch spans
 * 0.254–0.293) — so making the skin write depth would clip the eyes away in
 * places. The head is convex enough that its own blend order never shows.
 */
function makeOpaque(material: THREE.Material): void {
  material.transparent = false;
  material.depthWrite = true;
  material.needsUpdate = true;
}

let cached: Promise<CharacterAssets> | null = null;

export function loadCharacterAssets(): Promise<CharacterAssets> {
  cached ??= (async () => {
    const draco = new DRACOLoader().setDecoderPath(DRACO_PATH);
    const loader = new GLTFLoader().setDRACOLoader(draco);
    const gltf = await loader.loadAsync(MODEL_URL);

    // Repaired once on the shared source, so every guest inherits it and only
    // skin and hair — the two that vary per person — get cloned per instance.
    gltf.scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials as THREE.MeshStandardMaterial[]) {
        const url = MATERIAL_TEXTURES[material.name];
        if (url && !material.map) {
          material.map = texture(url);
          material.needsUpdate = true;
        }
        if (material.name === "M_Hair") makeOpaque(material);
      }
    });

    // Eyes and mouth are sprite atlases slid about by UV, shared by everyone —
    // see `entities/character-face.ts` for why the sharing goes this way round.
    bindFaceAtlases(gltf.scene);

    // Every skin and hair colour, before anybody can be built out of one.
    await preloadPalettes();

    return { scene: gltf.scene as THREE.Group, animations: gltf.animations };
  })();
  return cached;
}

/** Skin and hair colour are swapped textures, so they're loaded on demand once. */
const textures = new Map<string, THREE.Texture>();
/** Resolves when the matching texture's image has actually arrived. */
const textureLoads = new Map<string, Promise<void>>();

function texture(path: string): THREE.Texture {
  let found = textures.get(path);
  if (!found) {
    let settle!: () => void;
    // Recorded before `load` starts, so a caller can await a texture it has
    // only just asked for.
    textureLoads.set(path, new Promise<void>((resolve) => (settle = resolve)));
    // Resolve on error too: a missing colourway should cost one odd-looking
    // guest, never a café that refuses to start.
    found = new THREE.TextureLoader().load(path, () => settle(), undefined, () => settle());
    found.colorSpace = THREE.SRGBColorSpace;
    found.flipY = false; // glTF UV convention, same as the café atlas
    textures.set(path, found);
  }
  return found;
}

function skintonePath(index: number): string {
  return `${TEXTURE_BASE}/Skintones/Skintone_${index + 1}.png`;
}

function hairColourPath(index: number): string {
  return `${TEXTURE_BASE}/Haircolour/Haircolour_${String(index + 1).padStart(2, "0")}.png`;
}

/**
 * **An unloaded texture samples black, and that is what "surprise me" looked
 * like.** Ellis, 2026-08-25: *"the surprise me randomiser … is only doing 2
 * skin tones - olive and ultra black."*
 *
 * `TextureLoader.load` returns a `THREE.Texture` immediately and fills in its
 * image later. Bind one to a material and render before the fetch lands and
 * the surface comes out near-black (measured: 14,14,14, resolving to 127,71,42
 * about a second later). Every press of "surprise me" rolls a skintone and a
 * hair colour that may never have been fetched, so the avatar goes black for
 * as long as the round trip takes — which on a phone is not a flash.
 *
 * Nothing threw, nothing logged, and it only ever bit the *unused* half of the
 * palette, which is why it read as "there are only two skin tones" rather than
 * as a loading bug.
 *
 * So the whole palette is fetched up front. It is 22 files of 64×64 — about
 * 30 kB together, against a 4 MB GLB that has to load anyway.
 */
async function preloadPalettes(): Promise<void> {
  const paths = [
    ...Array.from({ length: SKINTONES }, (_, i) => skintonePath(i)),
    ...Array.from({ length: HAIR_COLOURS }, (_, i) => hairColourPath(i)),
  ];
  for (const path of paths) texture(path); // kicks off the fetch, caches the result
  await Promise.all(paths.map((path) => textureLoads.get(path)));
}

/**
 * Deterministic pick, so a given guest looks the same for their whole visit.
 *
 * **Hash the seed properly rather than multiplying it.** The seed is derived
 * from `spawnedAt`, a wall-clock timestamp around 1.7e12. Multiplying that by a
 * large constant lands far past `Number.MAX_SAFE_INTEGER`, so every low bit —
 * the only part `% length` reads — is destroyed, and the "random" choice
 * collapses to the same handful of values for every guest. `Math.imul` keeps
 * the arithmetic in 32-bit integers where it belongs.
 */
function hash(seed: number, salt: number): number {
  let h = (Math.round(seed) ^ Math.imul(salt + 1, 0x9e3779b9)) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}


export type SeatKind = "tall" | "sofa" | "floor";

/**
 * What a guest is holding, as far as the animation is concerned.
 *
 * **A guest used to drink whatever they were holding.** Ellis, 2026-08-10: *"a
 * customer came in and started drinking a cupcake."* The held prop is picked
 * per guest from `HELD`, but the settled idle was always `*_Cup_Drink_Loop`,
 * so anyone handed a cupcake or a milkshake mimed sipping it out of a mug. The
 * pack has the right loop for each; it was simply never asked for.
 */
type Refreshment = "cup" | "glass" | "food";

function refreshmentOf(held: string): Refreshment {
  if (held.includes("Milkshake")) return "glass";
  if (held.includes("Cupcake")) return "food";
  return "cup";
}

/** Clip to play while sitting down, and once settled, per seat kind. */
const CLIPS: Record<SeatKind, { sit: string; idle: Record<Refreshment, string> }> = {
  tall: {
    sit: "TallChair_Sit",
    idle: {
      cup: "TallChair_Cup_Drink_Loop",
      // The space before `_Loop` is a typo **in the pack**, not here. Leave it;
      // `sit()` falls back to the cup loop if a name ever stops resolving.
      glass: "TallChair_Glass_Drink _Loop",
      food: "TallChair_Food_Eat_Loop",
    },
  },
  sofa: {
    sit: "Sofa_Sit",
    idle: {
      cup: "Sofa_Cup_Drink_Loop",
      glass: "Sofa_Glass_Drink_Loop",
      food: "Sofa_Food_Eat_Loop",
    },
  },
  floor: {
    sit: "Floor_Sit",
    idle: {
      cup: "Floor_Cup_Drink_Loop",
      glass: "Floor_Glass_Drink_Loop",
      food: "Floor_Food_Eat_Loop",
    },
  },
};
const WALK_CLIP = "Walk_Loop";

/** Every clip this module can ask for. `character-clips.test.ts` checks that
 *  each one is really in the pack — see the `TallChair_Glass_Drink _Loop`
 *  typo above for why a missing name has to fail loudly rather than at runtime. */
/**
 * The Lip Sync pack's social vocabulary, merged onto the same rig by
 * `tools/convert-characters.py`. Named here so `character-clips.test.ts`
 * guards them too: they arrive through a *merge* rather than straight out of
 * one file, so a rename upstream or a failed adoption step would drop them
 * silently — and a missing clip freezes whoever asked for it mid-pose.
 */
export const SOCIAL_CLIPS = [
  "Social_WaveHello",
  "Social_WaveBye",
  "Social_ThumbsUp",
  "Social_Jump_Joy",
  "Social_Stand_YES",
  "Social_Stand_NO",
  "Social_Relaxed",
  "Social_Relaxed_ListeningNod",
  "Social_Relaxed_Thinking",
  "Social_Stand_Discussion_1",
  "Social_Stand_Discussion_2",
  "Social_CrossedArms_Thinking",
] as const;

export const REQUIRED_CLIPS: string[] = [
  WALK_CLIP,
  "Wait_Shifting",
  ...Object.values(CLIPS).flatMap((c) => [c.sit, ...Object.values(c.idle)]),
  ...SOCIAL_CLIPS,
];

export class Character {
  readonly group: THREE.Group;
  private readonly mixer: THREE.AnimationMixer;
  private readonly clips: Map<string, THREE.AnimationClip>;
  private current: THREE.AnimationAction | null = null;
  private currentName = "";
  /** Set when a one-shot sit is running, so the idle can follow it. */
  private queued: { name: string; at: number } | null = null;
  /** What they walked in holding, so they consume it the right way. */
  private readonly refreshment: Refreshment;
  /** Blinking, moods, and the mouth the lip sync borrows. */
  readonly face: CharacterFace;

  constructor(assets: CharacterAssets, seedOrLook: number | Appearance, seed = Math.random() * 1e4) {
    const look = typeof seedOrLook === "number" ? appearanceFromSeed(seedOrLook) : seedOrLook;
    this.group = cloneSkinned(assets.scene) as THREE.Group;
    this.mixer = new THREE.AnimationMixer(this.group);
    this.clips = new Map(
      assets.animations.map((clip) => [clip.name.replace(/^Armature\|/, ""), clip]),
    );

    this.refreshment = refreshmentOf(HELD[look.held]);

    const keep = new Set([
      "Body_Head",
      // The eyes and mouth are separate meshes in the merged pack, precisely so
      // they can move independently of the head. Leave them out of this set and
      // every guest is faceless — and silently so, since nothing else notices.
      ...FACE_MESHES,
      HAIR[look.hair],
      TOPS[look.top],
      LEGS[look.legs],
      HELD[look.held],
    ]);

    // Skin and hair are per-guest, so those two materials get cloned; the rest
    // stay shared with every other guest in the café.
    const skin = texture(skintonePath(look.skintone));
    const hair = texture(hairColourPath(look.hairColour));

    // **Match on the node *or* its parent.** `Body_Head` carries two primitives
    // (skin and eyes), and GLTFLoader turns any multi-primitive mesh into a
    // Group whose children are named `<name>_0`, `<name>_1`. Checking only the
    // mesh's own name therefore throws the head away and leaves a floating
    // hairstyle — the same trap `scene/asset-library.ts` hit with the windows.
    const wanted = (object: THREE.Object3D): boolean =>
      keep.has(object.name) || (object.parent !== null && keep.has(object.parent.name));

    // Skin, hair and clothing vary per guest, so those materials are cloned;
    // eyes and the held props stay shared with every other customer.
    const tops = TOP_COLOURS[look.topColour];
    const legs = LEG_COLOURS[look.legColour];
    const shoes = SHOE_COLOURS[look.shoeColour];
    const retint = (source: THREE.Material): THREE.Material => {
      const material = source.clone() as THREE.MeshStandardMaterial;
      switch (source.name) {
        case "M_Skin":
          material.map = skin;
          return material;
        case "M_Hair":
          material.map = hair;
          return material;
        case "M_Clothes_Top":
        case "M_Apron":
          material.color.setHex(tops);
          return material;
        case "M_Clothes_Legs":
          material.color.setHex(legs);
          return material;
        case "M_Clothes_Shoes":
        case "M_Accessories":
          material.color.setHex(shoes);
          return material;
        default:
          return source;
      }
    };

    // Collect first, then remove: mutating the graph mid-traverse skips nodes.
    const drop: THREE.Object3D[] = [];
    this.group.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      if (!wanted(child)) {
        drop.push(child);
        return;
      }
      child.castShadow = true;
      child.receiveShadow = false;
      // **Skinned meshes must not be frustum-culled.** three.js culls against
      // the *bind pose* bounding volume, which for these clips is nowhere near
      // where the animated mesh actually ends up — the head is the worst case,
      // since sitting moves it furthest from its rest position. The symptom is a
      // head that vanishes from some camera angles and not others.
      child.frustumCulled = false;
      child.material = Array.isArray(child.material)
        ? child.material.map(retint)
        : retint(child.material);
    });
    for (const mesh of drop) mesh.removeFromParent();

    // After the cull, so it only binds to face meshes that survived it.
    this.face = new CharacterFace(this.group, seed);
  }

  /** Wear a mood. See `EXPRESSIONS` for the list. */
  express(name: ExpressionName): void {
    this.face.setExpression(name);
  }

  /** Drive the mouth directly, for lip sync. `null` gives it back to the mood. */
  say(viseme: MouthFrame | null): void {
    this.face.setViseme(viseme);
  }

  /** Walk cycle. */
  walk(): void {
    this.play(WALK_CLIP, 0.25, true);
  }

  /**
   * Stand about. Used by the character creator, where the avatar is on a
   * turntable rather than going anywhere. Falls back to the walk if the pack's
   * waiting clip is missing, so a rename upstream can't leave a frozen model.
   */
  idle(): void {
    this.play(this.idleClip(), 0.3, true);
  }

  /**
   * Play a one-shot gesture and then settle back into the idle — the same
   * hand-over `sit()` uses. Returns false if the pack has no such clip, so a
   * caller can try the next one on its list rather than freezing mid-pose.
   */
  gesture(name: string): boolean {
    const clip = this.clips.get(name);
    if (!clip) return false;
    this.play(name, 0.18, false);
    this.queued = { name: this.idleClip(), at: this.mixer.time + clip.duration * 0.92 };
    return true;
  }

  /** True while a one-shot gesture is still running. */
  get busy(): boolean {
    return this.queued !== null;
  }

  private idleClip(): string {
    return this.clips.has("Wait_Shifting") ? "Wait_Shifting" : WALK_CLIP;
  }

  /**
   * Sit down on this kind of seat, then settle into the matching idle loop.
   * The sit itself is a one-shot; `update` hands over when it finishes.
   */
  sit(kind: SeatKind): void {
    const { sit, idle } = CLIPS[kind];
    // Eat a cupcake, drink a milkshake through a glass, sip a coffee.
    const wanted = idle[this.refreshment];
    const settled = this.clips.has(wanted) ? wanted : idle.cup;
    const clip = this.clips.get(sit);
    this.play(sit, 0.3, false);
    this.queued = { name: settled, at: this.mixer.time + (clip?.duration ?? 0.8) * 0.75 };
  }

  update(deltaSeconds: number): void {
    this.mixer.update(deltaSeconds);
    this.face.update(deltaSeconds);
    if (this.queued && this.mixer.time >= this.queued.at) {
      const next = this.queued.name;
      this.queued = null;
      this.play(next, 0.35, true);
    }
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.group);
    // The face clones its three geometries per character; the atlas and the
    // materials are shared and must survive.
    this.face.dispose();
  }

  private play(name: string, fade: number, loop: boolean): void {
    if (this.currentName === name) return;
    const clip = this.clips.get(name);
    if (!clip) return;
    const action = this.mixer.clipAction(clip);
    action.reset();
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    action.clampWhenFinished = !loop;
    action.enabled = true;
    action.setEffectiveWeight(1);
    if (this.current) action.crossFadeFrom(this.current, fade, false);
    action.play();
    this.current = action;
    this.currentName = name;
  }
}
