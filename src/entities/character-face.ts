import * as THREE from "three";
import atlas from "@/data/face-atlas.json";

/**
 * Eyes and a mouth, driven by sliding a UV window across a sprite atlas.
 *
 * The Lip Sync and Expressions pack (CC0) ships the face as three separate
 * meshes — `Body_Eye_L`, `Body_Eye_R`, `Body_Mouth` — sitting proud of the
 * head, each UV-mapped to the **full 0–1 square**. That last fact is what
 * decides the whole design: showing a different expression is a change of UV,
 * not a change of texture or material.
 *
 * **So the atlas texture and the materials stay shared across every character
 * in the café, and only the geometry is per-instance.** That inversion is
 * deliberate. The obvious implementation clones a texture per character so each
 * can hold its own `offset` — but a cloned `THREE.Texture` is a *second GPU
 * upload* of the same image, and seven characters × two atlases would be tens
 * of megabytes against a budget (`data/graphics.ts`) that iOS has already
 * killed this app for overrunning once. Cloning the geometry instead costs 44
 * vertices per character, total, and needs no shader patching to boot.
 *
 * Frame order comes from `data/face-atlas.json`, which the packing script
 * writes. Nothing here hard-codes an index — a hand-maintained index that
 * disagreed with the atlas would fail *silently*, as the wrong mouth shape
 * rather than a missing one.
 */

type Sheet = { texture: string; cols: number; rows: number; frames: string[] };

const EYES = atlas.eyes as Sheet;
const MOUTHS = atlas.mouths as Sheet;

/** Named eye frames. `character-face.test.ts` checks each is really in the atlas. */
export type EyeFrame =
  | "Default"
  | "Angry"
  | "Blink1"
  | "Blink2"
  | "Blink3"
  | "Closed"
  | "Flat"
  | "Frustrated"
  | "Hearts1"
  | "Hearts2"
  | "Hearts3"
  | "Hearts4"
  | "Kawaii"
  | "Sad Cry"
  | "Starry1"
  | "Starry2";

/** Named mouth frames — the pack's *simplified* set: twelve visemes then eight moods. */
export type MouthFrame =
  | "Default"
  | "sh-ch"
  | "a-i"
  | "ah-i"
  | "th"
  | "e-k-r"
  | "s-z"
  | "m-b-p"
  | "f-v"
  | "L"
  | "oh"
  | "o-u-w"
  | "Upset"
  | "Sad"
  | "Angry"
  | "Thinking"
  | "Cheeky"
  | "Cute"
  | "Surprised"
  | "Confused";

/**
 * A full blink, straight from the pack's own `Eyes_HowTo.gif`: *"to animate a
 * full blink, use this sequence 0-1-2-3-2-1-0"*. Worth taking as given rather
 * than inventing — frame 3 is a soft upward curve, so the eye closes *smiling*,
 * which reads warmer than the flat dash a neutral blink would pick.
 */
const BLINK: readonly EyeFrame[] = [
  "Default",
  "Blink1",
  "Blink2",
  "Blink3",
  "Blink2",
  "Blink1",
  "Default",
];
const BLINK_STEP_MS = 45;

/** How long between blinks. Real eyes manage every 2–8s; cosy ones can dawdle. */
const BLINK_GAP_MS = { min: 2600, max: 7200 };

/**
 * The moods a character can wear, as a resting eye and mouth pair.
 *
 * `eyes` may name several frames, in which case they cycle — the pack's
 * how-to specifies exactly this for hearts and sparkles (*"to animate
 * sparkles, use a sequence 1-2-1-2-1"*). A cycling expression does not blink,
 * because a heart cannot.
 */
export interface Expression {
  eyes: readonly EyeFrame[];
  mouth: MouthFrame;
  /** Milliseconds per eye frame when there is more than one. */
  cycleMs?: number;
}

export const EXPRESSIONS = {
  neutral: { eyes: ["Default"], mouth: "Default" },
  happy: { eyes: ["Kawaii"], mouth: "Cute" },
  content: { eyes: ["Default"], mouth: "Cute" },
  cheeky: { eyes: ["Blink3"], mouth: "Cheeky" },
  thinking: { eyes: ["Flat"], mouth: "Thinking" },
  surprised: { eyes: ["Default"], mouth: "Surprised" },
  confused: { eyes: ["Flat"], mouth: "Confused" },
  sad: { eyes: ["Sad Cry"], mouth: "Sad" },
  love: { eyes: ["Hearts1", "Hearts2", "Hearts3", "Hearts4"], mouth: "Cute", cycleMs: 110 },
  delighted: { eyes: ["Starry1", "Starry2"], mouth: "Surprised", cycleMs: 130 },
} as const satisfies Record<string, Expression>;

export type ExpressionName = keyof typeof EXPRESSIONS;

/** The three meshes this drives. Anything else on the head is left alone. */
export const FACE_MESHES = ["Body_Eye_L", "Body_Eye_R", "Body_Mouth"] as const;

/**
 * One mesh whose UVs are slid onto a chosen cell of an atlas.
 *
 * The geometry is cloned because `SkeletonUtils.clone` deliberately *shares*
 * it between every character built from the same source — which is right for
 * a hoodie and wrong for a face, since writing UVs into shared geometry would
 * make the whole café blink in lockstep.
 */
class Cell {
  private readonly attribute: THREE.BufferAttribute;
  /** The mesh's own 0–1 UVs, kept so each frame maps from the original. */
  private readonly base: Float32Array;
  private shown = -1;

  constructor(
    private readonly mesh: THREE.Mesh,
    private readonly sheet: Sheet,
  ) {
    mesh.geometry = mesh.geometry.clone();
    this.attribute = mesh.geometry.getAttribute("uv") as THREE.BufferAttribute;
    this.base = Float32Array.from(this.attribute.array);
  }

  show(frame: string): void {
    const index = this.sheet.frames.indexOf(frame);
    // An unknown name means the atlas and the code have drifted. Hold the last
    // good frame rather than showing cell 0, which would read as a real
    // expression and hide the fault.
    if (index < 0 || index === this.shown) return;
    this.shown = index;

    const width = 1 / this.sheet.cols;
    const height = 1 / this.sheet.rows;
    const left = (index % this.sheet.cols) * width;
    const top = Math.floor(index / this.sheet.cols) * height;

    const uv = this.attribute.array as Float32Array;
    for (let i = 0; i < uv.length; i += 2) {
      uv[i] = this.base[i] * width + left;
      uv[i + 1] = this.base[i + 1] * height + top;
    }
    this.attribute.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
  }
}

/**
 * Load the two atlases once and bind them to the shared face materials.
 *
 * Called from `loadCharacterAssets`, so it happens on the source scene before
 * anybody clones it — every character then inherits the binding for free.
 */
export function bindFaceAtlases(root: THREE.Object3D): void {
  const maps = new Map<string, string>([
    ["M_Eyes", EYES.texture],
    ["M_Mouth", MOUTHS.texture],
  ]);
  const loaded = new Map<string, THREE.Texture>();

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials as THREE.MeshStandardMaterial[]) {
      const url = maps.get(material.name);
      if (!url) continue;
      let map = loaded.get(url);
      if (!map) {
        map = new THREE.TextureLoader().load(url);
        map.colorSpace = THREE.SRGBColorSpace;
        map.flipY = false; // glTF UV convention, same as every other texture here
        loaded.set(url, map);
      }
      // **Overwrite rather than fill in.** The GLB ships these materials with
      // a single baked sprite (`Eye_0_Default`), so the usual "only if it has
      // no map" guard would keep that one frame and the face would never move.
      material.map = map;
      // The face sits a few millimetres proud of an opaque head. Bias it toward
      // the camera so the depth test can never nibble the edges of an eye where
      // the shell dips back inside the skin.
      material.polygonOffset = true;
      material.polygonOffsetFactor = -4;
      material.polygonOffsetUnits = -4;
      material.needsUpdate = true;
    }
  });
}

/**
 * The face of one character: a blink loop, a mood, and a mouth the lip sync
 * can take over.
 */
export class CharacterFace {
  private readonly eyes: Cell[] = [];
  private mouth: Cell | null = null;
  private expression: Expression = EXPRESSIONS.neutral;
  /** Set by the lip sync while speaking; overrides the expression's mouth. */
  private viseme: MouthFrame | null = null;
  private elapsed = 0;
  private nextBlink: number;
  private blinkStep = -1;
  private blinkAt = 0;

  /**
   * @param seed staggers the blink so a room full of guests never blinks
   *   together — the same trick `entities/cat.ts` uses for breathing, and the
   *   thing that stops idle animation reading as a loop.
   */
  constructor(root: THREE.Object3D, seed = Math.random() * 1000) {
    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      if (child.name === "Body_Eye_L" || child.name === "Body_Eye_R") {
        this.eyes.push(new Cell(child, EYES));
      } else if (child.name === "Body_Mouth") {
        this.mouth = new Cell(child, MOUTHS);
      }
    });
    const phase = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
    this.nextBlink = BLINK_GAP_MS.min + phase * (BLINK_GAP_MS.max - BLINK_GAP_MS.min);
    this.apply();
  }

  /** True if the character actually has a face to drive. */
  get present(): boolean {
    return this.eyes.length > 0 || this.mouth !== null;
  }

  setExpression(name: ExpressionName): void {
    const next = EXPRESSIONS[name];
    if (next === this.expression) return;
    this.expression = next;
    // A blink half-played into a new mood would strobe; drop it.
    this.blinkStep = -1;
    this.apply();
  }

  /**
   * Take the mouth over for lip sync. `null` hands it back to the expression.
   */
  setViseme(frame: MouthFrame | null): void {
    if (frame === this.viseme) return;
    this.viseme = frame;
    this.mouth?.show(frame ?? this.expression.mouth);
  }

  update(deltaSeconds: number): void {
    this.elapsed += deltaSeconds * 1000;

    // A cycling expression (hearts, sparkles) animates instead of blinking.
    if (this.expression.eyes.length > 1) {
      const step = Math.floor(this.elapsed / (this.expression.cycleMs ?? 120));
      const frame = this.expression.eyes[step % this.expression.eyes.length];
      for (const eye of this.eyes) eye.show(frame);
      return;
    }

    if (this.blinkStep >= 0) {
      while (this.blinkStep >= 0 && this.elapsed >= this.blinkAt) {
        this.blinkStep++;
        if (this.blinkStep >= BLINK.length) {
          this.blinkStep = -1;
          this.nextBlink =
            this.elapsed + BLINK_GAP_MS.min + Math.random() * (BLINK_GAP_MS.max - BLINK_GAP_MS.min);
          this.apply();
          break;
        }
        this.blinkAt += BLINK_STEP_MS;
        const frame = BLINK[this.blinkStep];
        for (const eye of this.eyes) eye.show(frame);
      }
    } else if (this.elapsed >= this.nextBlink) {
      this.blinkStep = 0;
      this.blinkAt = this.elapsed + BLINK_STEP_MS;
    }
  }

  dispose(): void {
    for (const eye of this.eyes) eye.dispose();
    this.mouth?.dispose();
  }

  private apply(): void {
    for (const eye of this.eyes) eye.show(this.expression.eyes[0]);
    this.mouth?.show(this.viseme ?? this.expression.mouth);
  }
}
