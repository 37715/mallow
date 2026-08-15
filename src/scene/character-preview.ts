import * as THREE from "three";
import { Character, loadCharacterAssets, type Appearance } from "@/entities/character-library";
import { createPreviewStage } from "@/scene/preview-stage";

/**
 * The player's avatar, turning slowly on a lit stage (§8 onboarding).
 *
 * Same technique as `scene/shop-preview.ts` — `scene/preview-stage.ts` draws it
 * over the finished frame, so there is one WebGL context and the character GLB
 * is uploaded once. See that file for why a second renderer was rejected.
 *
 * Unlike the shop's furniture this has to be *rebuilt* whenever a feature
 * changes, because the pack is modular: an appearance is a choice of meshes,
 * not a material tweak. Rebuilding costs a `SkeletonUtils.clone`, which is
 * cheap enough for a tap but not for a frame — so it happens on change only.
 */

export interface CharacterPreview {
  /** Swipe to turn it. Adds to the idle sway rather than replacing it, so
   *  touching it never freezes the thing you're looking at. */
  swivel(deltaRadians: number): void;
  setAppearance(look: Appearance | null): void;
  render(renderer: THREE.WebGLRenderer, rect: DOMRect, now: number): void;
}

export function createCharacterPreview(environment: THREE.Texture | null): CharacterPreview {
  const scene = new THREE.Scene();
  scene.environment = environment;
  scene.environmentIntensity = 4.4;
  // Same rig as the shop's stage, and see the note there before changing it:
  // these values are high because they were matched to how the room renders
  // the same asset, not picked to look nice in isolation. The point is that
  // the skin and garment colours chosen here are the ones that walk into the
  // café.
  scene.add(new THREE.AmbientLight(0xfff3e4, 3.1));
  const key = new THREE.DirectionalLight(0xfff7e8, 2.9);
  key.position.set(2, 4, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd9a8, 1.4);
  rim.position.set(-3, 2, -2);
  scene.add(rim);

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: 0x2b211a, transparent: true, opacity: 0.86 }),
  );
  backdrop.renderOrder = -1;
  scene.add(backdrop);

  const pivot = new THREE.Group();
  scene.add(pivot);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 60);
  const stage = createPreviewStage();
  let character: Character | null = null;
  let pending = 0;
  let lastFrame = 0;
  /** The look currently built, so re-applying the same one is free. */
  let applied = "";
  /** How far the player has swiped it round. */
  let manualSpin = 0;

  async function build(look: Appearance): Promise<void> {
    const token = ++pending;
    const assets = await loadCharacterAssets();
    // A quick tapper can outrun the loader; only the newest look wins.
    if (token !== pending) return;
    if (character) pivot.remove(character.group);
    character = new Character(assets, look);
    // Waist-height framing: the clips are authored with feet on the floor.
    character.group.position.y = -0.85;
    pivot.add(character.group);
    character.idle();
  }

  return {
    swivel(deltaRadians) {
      manualSpin += deltaRadians;
    },

    setAppearance(look) {
      if (!look) {
        pending++;
        applied = "";
        if (character) pivot.remove(character.group);
        character = null;
        return;
      }
      // **Rebuilding is a mesh assembly, not a material tweak**, so it must
      // only happen when something actually changed. The caller re-applies
      // every frame (it's the simplest way to stay in step with the arrows),
      // and without this guard that would clone a skinned rig 60 times a
      // second.
      const key = JSON.stringify(look);
      if (key === applied) return;
      applied = key;
      void build(look);
    },

    render(renderer, rect, now) {
      if (!character || rect.width < 4 || rect.height < 4) return;
      const delta = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0.016;
      lastFrame = now;
      character.update(delta);

      const t = now / 1000;
      pivot.rotation.y = manualSpin + Math.sin(t * 0.35) * 0.7;
      pivot.position.y = Math.sin(t * 1.05) * 0.03;

      const aspect = rect.width / rect.height;
      camera.aspect = aspect;
      // Far enough to frame a whole person: the figure is ~1.7 units and a 34°
      // fov only covers 1.5 at 2.5 away, which cut them off mid-thigh.
      const distance = 3.6;
      camera.position.set(0, 0.15, distance);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();

      const backDistance = distance + 4;
      backdrop.position.set(0, 0, -backDistance);
      const coverHeight =
        2 * (backDistance + distance) * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      backdrop.scale.set(coverHeight * aspect * 1.2, coverHeight * 1.2, 1);

      stage.draw(renderer, scene, camera, rect);
    },
  };
}
