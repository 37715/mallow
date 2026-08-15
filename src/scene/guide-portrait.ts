import * as THREE from "three";
import { Character, loadCharacterAssets } from "@/entities/character-library";
import type { ExpressionName, MouthFrame } from "@/entities/character-face";
import { GUIDE_APPEARANCE } from "@/data/tutorial";
import { createPreviewStage } from "@/scene/preview-stage";

/**
 * Mal, head and shoulders, leaning in beside her speech bubble while a panel is
 * open.
 *
 * **Why this exists at all: behind a panel she is simply gone.** The
 * walkthrough spends most of its length asking the player to open the shop, and
 * the moment they do, the character doing the talking is hidden behind an
 * opaque card in the middle of the screen. The bubble docking to the top
 * (2026-08-25) fixed the *words*; it left a disembodied voice with a small
 * "mal" label standing in for a face we had just spent a whole session
 * building. This puts the face back.
 *
 * **She is a second `Character`, not a second camera on the first one.** The
 * obvious implementation renders the main scene through a close-up camera, and
 * it is wrong here for a reason worth keeping: that traverses and draws the
 * *whole café* a second time every frame, and a late-game café is ~535 meshes
 * (§13). An assembled character is six. The cost of the copy is one
 * `SkeletonUtils.clone` at load, and the atlases are shared because the assets
 * are.
 *
 * The price of a copy is that it has to be told what the real one is doing —
 * see `TutorialGuide.setMirror`. Every call the guide makes on its own
 * character it makes on this one too, so there is no state here that can drift
 * out of step with her; the mouth is even driven by the same viseme frame,
 * which is itself driven by the bubble's clock.
 */

export interface GuideMirror {
  say(viseme: MouthFrame | null): void;
  express(name: ExpressionName): void;
  gesture(name: string): void;
  idle(): void;
}

export interface GuidePortrait extends GuideMirror {
  render(renderer: THREE.WebGLRenderer, rect: DOMRect, now: number): void;
  dispose(): void;
}

/**
 * **These are measured, not guessed, and the numbers are not the ones you would
 * expect.** The pack's people are chibi: rendered and read off, this character
 * is about 1.32 units tall in total, with her head filling 0.83 → 1.36 of it
 * and her shoulders at 0.75. The first pass at this file put the camera at
 * y=1.58 on the reasonable-sounding grounds that `TutorialGuide.HEAD_HEIGHT` is
 * 1.62 — but that constant is where the *speech bubble* hangs, which is above
 * her head by design, and framing on it photographed the empty air over her
 * fringe. Re-measure the same way (§9's "quantise it") before moving these.
 *
 * Eye level is therefore ~1.15, and the look-at sits a shade under it: looking
 * fractionally up at someone reads as friendly, looking down at them does not.
 */
const LOOK_AT = new THREE.Vector3(0, 1.04, 0);
/**
 * **The framing is bound by her width, not her height.** A chibi head is 0.65
 * units across against a 0.53-unit face, so on a portrait-shaped slot the
 * horizontal extent runs out first — fitting the height would crop her ears.
 * At this distance a 30° vertical fov covers 0.98 units tall and 0.90 across,
 * which is her head, her shoulders and a little chest — with about 0.17 of
 * headroom above her hair. **The headroom is the point of the last change**:
 * framed tighter, the top of her head sat exactly on the edge of the notch and
 * read as cropped rather than close.
 *
 * The x offset is what makes it a three-quarter view: the pack's characters
 * face +Z, so a camera straight out in front of one is a passport photo.
 */
const CAMERA_AT = new THREE.Vector3(0.58, 1.15, 1.74);

export function createGuidePortrait(environment: THREE.Texture | null): GuidePortrait {
  const scene = new THREE.Scene();
  scene.environment = environment;
  scene.environmentIntensity = 4.4;
  // The same rig as `scene/character-preview.ts`, and the note there applies:
  // these intensities look absurd beside `addLighting`'s because they were
  // matched by *measuring* the same asset in both places, not chosen to look
  // nice on a bare turntable (§9, "quantise it"). She has to be recognisably
  // the person standing in the café.
  scene.add(new THREE.AmbientLight(0xfff3e4, 3.1));
  const key = new THREE.DirectionalLight(0xfff7e8, 2.9);
  key.position.set(2, 4, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd9a8, 1.4);
  rim.position.set(-3, 2, -2);
  scene.add(rim);

  // Translucent rather than opaque: the notch cut in the panel's dim shows the
  // real café behind her, and keeping a little of it makes this read as a
  // window she is leaning through rather than a portrait pasted on top.
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: 0x2b211a, transparent: true, opacity: 0.72 }),
  );
  backdrop.renderOrder = -1;
  scene.add(backdrop);

  const pivot = new THREE.Group();
  scene.add(pivot);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 30);
  const stage = createPreviewStage();

  let character: Character | null = null;
  let lastFrame = 0;
  /**
   * What she was told to do before the pack finished loading. A mirror that
   * dropped these would come up with a resting face and no expression on the
   * very first line — which is the one line this feature exists for.
   */
  let pendingViseme: MouthFrame | null = null;
  let pendingExpression: ExpressionName | null = null;

  /**
   * Built on first use, not at boot. Almost every session is somebody who
   * finished the walkthrough months ago, and assembling a second skinned
   * character for them costs a `SkeletonUtils.clone` and a set of bones for a
   * thing they will never see. `TutorialGuide.setMirror` calls `idle()` on the
   * way in, so a tutorial starting is exactly what wakes this up.
   */
  let starting = false;
  function ensureCharacter(): void {
    if (starting) return;
    starting = true;
    void loadCharacterAssets().then((assets) => {
      // The same fixed seed as the guide herself, so the two blink together
      // rather than a beat apart. `entities/tutorial-guide.ts` explains why she
      // gets a seed at all.
      character = new Character(assets, GUIDE_APPEARANCE, 7);
      character.group.position.y = 0;
      pivot.add(character.group);
      character.idle();
      // Whatever she was told while the pack was loading. Dropping these would
      // give her a resting face for the whole of the first line, which is the
      // one line this feature exists for.
      if (pendingExpression) character.express(pendingExpression);
      if (pendingViseme) character.say(pendingViseme);
    });
  }

  return {
    say(viseme) {
      pendingViseme = viseme;
      ensureCharacter();
      character?.say(viseme);
    },

    express(name) {
      pendingExpression = name;
      ensureCharacter();
      character?.express(name);
    },

    gesture(name) {
      // Best-effort, exactly as it is on the guide: a clip renamed upstream
      // should cost a still moment, not a thrown error mid-sentence. Most
      // gestures are arm movement that this framing crops anyway — the nods
      // and head tilts are the ones that show, and they are the ones that
      // matter at this distance.
      ensureCharacter();
      character?.gesture(name);
    },

    idle() {
      ensureCharacter();
      character?.idle();
    },

    render(renderer, rect, now) {
      if (!character || rect.width < 4 || rect.height < 4) return;
      const delta = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0.016;
      lastFrame = now;
      character.update(delta);

      // A little life, so she is not a frozen bust while she talks. Small
      // amplitudes on purpose: at this crop a sway that reads as gentle on a
      // full figure reads as swimming.
      const t = now / 1000;
      pivot.rotation.y = Math.sin(t * 0.5) * 0.06;
      pivot.position.y = Math.sin(t * 1.1) * 0.006;

      const aspect = rect.width / rect.height;
      camera.aspect = aspect;
      camera.position.copy(CAMERA_AT);
      camera.lookAt(LOOK_AT);
      camera.updateProjectionMatrix();

      // Park the backdrop behind her and scale it to cover the frustum there,
      // so it fills the notch whatever shape the element ends up.
      const distance = CAMERA_AT.distanceTo(LOOK_AT);
      const backDistance = distance + 1.4;
      backdrop.position.copy(camera.position);
      backdrop.position.addScaledVector(
        LOOK_AT.clone().sub(camera.position).normalize(),
        backDistance,
      );
      backdrop.quaternion.copy(camera.quaternion);
      const coverHeight =
        2 * backDistance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      backdrop.scale.set(coverHeight * aspect * 1.1, coverHeight * 1.1, 1);

      stage.draw(renderer, scene, camera, rect);
    },

    dispose() {
      character?.dispose();
      character = null;
      stage.dispose();
      backdrop.geometry.dispose();
      (backdrop.material as THREE.Material).dispose();
    },
  };
}
