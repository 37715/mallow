import * as THREE from "three";
import { BARISTA_SPOT } from "@/data/cafe-layout";
import { Character, loadCharacterAssets, type Appearance } from "@/entities/character-library";

/**
 * The player, working behind the counter (§8 onboarding).
 *
 * The avatar you design in character creation stands in your own café rather
 * than living only in the save file — which is most of what makes it feel like
 * *your* café rather than a café you administer.
 *
 * Rebuilt whenever the look changes, for the same reason as the creator's
 * preview: an appearance is a choice of meshes, not a material tweak.
 *
 * **Tap them and they do something.** Ellis: *"if i tap my character i want
 * him to do something like wave or anything."*
 *
 * For months the honest answer was that there was no wave: the base pack's 43
 * clips are all café work, so tapping played a serving gesture instead. The
 * Lip Sync and Expressions pack ships `Social_WaveHello`, so **the wave he
 * actually asked for is first in the list now**, and the serving gestures stay
 * behind it — they were never wrong, just not a greeting. They cycle, so
 * tapping twice never plays the same beat twice.
 */
const GREETINGS = [
  "Social_WaveHello",
  "Tray_Serve_Short",
  "Social_ThumbsUp",
  "Tray_Pickup",
  "Social_Jump_Joy",
];

/** Worn for the length of a greeting, then dropped back to a quiet smile. */
const GREETING_MOOD = "happy";

export class Barista {
  private readonly group = new THREE.Group();
  private character: Character | null = null;
  private applied = "";
  private pending = 0;
  private nextGreeting = 0;
  private readonly raycaster = new THREE.Raycaster();

  constructor(scene: THREE.Scene) {
    this.group.name = "barista";
    this.group.position.set(BARISTA_SPOT.x, 0, BARISTA_SPOT.z);
    this.group.rotation.y = BARISTA_SPOT.facing;
    scene.add(this.group);
  }

  setAppearance(look: Appearance | null): void {
    if (!look) {
      this.pending++;
      this.applied = "";
      if (this.character) this.group.remove(this.character.group);
      this.character = null;
      return;
    }
    const key = JSON.stringify(look);
    if (key === this.applied) return;
    this.applied = key;
    void this.build(look);
  }

  private async build(look: Appearance): Promise<void> {
    const token = ++this.pending;
    const assets = await loadCharacterAssets();
    if (token !== this.pending) return;
    if (this.character) this.group.remove(this.character.group);
    this.character = new Character(assets, look);
    this.group.add(this.character.group);
    // Standing about behind the counter, pleased to be there.
    this.character.idle();
    this.character.express("content");
  }

  /**
   * Was this tap on the player's avatar? Normalised device coords, same as
   * `CatManager.pick`. Returns true if they were tapped *and* reacted.
   *
   * Raycasting the skinned meshes directly rather than a box proxy: the
   * barista stands behind a counter that hides most of them, and a box would
   * happily swallow taps aimed at the counter itself.
   */
  pick(pointer: THREE.Vector2, camera: THREE.Camera): boolean {
    if (!this.character) return false;
    this.raycaster.setFromCamera(pointer, camera);
    if (this.raycaster.intersectObject(this.character.group, true).length === 0) return false;
    // Report the *hit*, not the greeting. A tap that lands on them while a
    // gesture is still running is still a tap on them, and should be consumed
    // rather than falling through to whatever is behind.
    this.greet();
    return true;
  }

  /** Head height, for hanging a name tag over them. */
  get anchor(): THREE.Vector3 {
    return new THREE.Vector3(this.group.position.x, 1.72, this.group.position.z);
  }

  /** Play the next greeting in the cycle. False if one is already running. */
  greet(): boolean {
    const character = this.character;
    if (!character || character.busy) return false;
    // Walk the list rather than trusting one name: a clip renamed upstream
    // should cost a fallback, not a frozen barista.
    for (let attempt = 0; attempt < GREETINGS.length; attempt++) {
      const name = GREETINGS[(this.nextGreeting + attempt) % GREETINGS.length];
      if (character.gesture(name)) {
        this.nextGreeting = (this.nextGreeting + attempt + 1) % GREETINGS.length;
        // The face is half the greeting — a wave with a blank expression reads
        // as a puppet. `update` puts it back once the gesture finishes.
        character.express(GREETING_MOOD);
        return true;
      }
    }
    return false;
  }

  update(deltaSeconds: number): void {
    const character = this.character;
    if (!character) return;
    const wasGreeting = character.busy;
    character.update(deltaSeconds);
    // Drop the greeting smile on the same beat the gesture hands back to the
    // idle, so the two can't come apart.
    if (wasGreeting && !character.busy) character.express("content");
  }
}
