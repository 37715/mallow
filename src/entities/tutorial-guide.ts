import * as THREE from "three";
import { Character, loadCharacterAssets } from "@/entities/character-library";
import {
  GUIDE_APPEARANCE,
  TUTORIAL_SCRIPT,
  fillLine,
  type TutorialLine,
} from "@/data/tutorial";
import { MOUTH_REST, frameAt, visemeTrack, type VisemeStep } from "@/systems/lipsync";
import { taskDone, topUp, type TutorialSnapshot } from "@/systems/tutorial";
import { DOOR_POSITION, DOOR_THRESHOLD_POSITION } from "@/scene/room";

/**
 * The guide who walks in on your first morning and talks you through the café.
 *
 * This is where the three new pieces meet: the merged pack's `Social_*`
 * gestures, `entities/character-face.ts` driving the mouth, and
 * `systems/lipsync.ts` deciding which shape it should be holding. The bubble
 * itself is `ui/speech-bubble.ts` — kept separate because it is DOM and this
 * is the scene, and because the projection maths is worth reusing the next
 * time anything in the world needs to say something.
 *
 * **The mouth and the text run off one clock.** The bubble owns it
 * (`elapsed()`), and the viseme is looked up from the same number that decides
 * how many characters are drawn. Two timers would drift apart within a
 * sentence and look dubbed — and the drift would be invisible on a desktop
 * running at a steady 60 and obvious on a phone that stutters.
 */

/** Where they stand to talk: inside the door, out of the walking route. */
const GUIDE_SPOT = new THREE.Vector3(1.55, 0, 1.62);

/** Head height, roughly — where the speech bubble's tail points. */
const HEAD_HEIGHT = 1.62;

/** Milliseconds per character. Shared by the typing and the lip sync. */
export const SPEECH_MS_PER_CHAR = 46;

/** How long the walk in and the walk out take. */
const WALK_MS = 2600;

type Phase = "arriving" | "talking" | "leaving" | "gone";

export interface GuideHooks {
  /** Draw or retype the bubble. */
  say(text: string, now: number): void;
  /** The line is over; put the bubble away. */
  quiet(): void;
  /** Everything is said and they have walked out. */
  finished(): void;
  /** What the café looks like right now, for the walkthrough's tasks. */
  snapshot(): TutorialSnapshot;
  /** Top the till up so the step she just asked for is affordable. */
  grant(amount: number): void;
  /** Guide the arrow through this walkthrough task, or `null` to stop. */
  point(task: string | null): void;
  /** Hold this under her line instead of "tap to continue". */
  waiting(hint: string | null): void;
}

export class TutorialGuide {
  private readonly group = new THREE.Group();
  private character: Character | null = null;
  private phase: Phase = "arriving";
  private index = -1;
  private phaseStartedAt = 0;
  private lineStartedAt = 0;
  private track: VisemeStep[] = [];
  private lastFrame = 0;
  /**
   * The café as it was when the current task began, so "buy a bed" is answered
   * by comparison rather than by an absolute count — see `systems/tutorial.ts`.
   * Null whenever no task is pending.
   */
  private taskBaseline: TutorialSnapshot | null = null;
  private readonly script: TutorialLine[];
  private readonly names: { name: string; cafe: string };

  constructor(
    scene: THREE.Scene,
    names: { name: string; cafe: string },
    private readonly hooks: GuideHooks,
  ) {
    this.names = names;
    this.script = TUTORIAL_SCRIPT;
    this.group.name = "tutorial-guide";
    this.group.position.copy(DOOR_POSITION);
    scene.add(this.group);
    void loadCharacterAssets().then((assets) => {
      // A fixed seed, so the guide's blink rhythm is the same every playthrough
      // — they are a character, not a crowd member.
      this.character = new Character(assets, GUIDE_APPEARANCE, 7);
      this.character.walk();
      this.character.express("happy");
      this.group.add(this.character.group);
    });
  }

  /** Where the speech bubble should hang. */
  get anchor(): THREE.Vector3 {
    return new THREE.Vector3(
      this.group.position.x,
      this.group.position.y + HEAD_HEIGHT,
      this.group.position.z,
    );
  }

  get done(): boolean {
    return this.phase === "gone";
  }

  /**
   * A tap: fill the current line if it's still typing, otherwise move on.
   * Returns false when there was nothing to advance, so the caller can let the
   * tap fall through to the café underneath.
   */
  advance(now: number, bubbleComplete: boolean, reveal: () => void): boolean {
    if (this.phase !== "talking") return false;
    if (!bubbleComplete) {
      reveal();
      return true;
    }
    // **A tap fills the line but never skips the task.** Otherwise the one
    // gesture the player already knows — tap to continue — walks them straight
    // past the thing they were being asked to do, and the walkthrough teaches
    // nothing. It also has to *not* consume the tap: while a task is pending
    // the player needs the shop button underneath.
    if (this.taskBaseline) return false;
    this.nextLine(now);
    return true;
  }

  /** Give up on the whole thing. They wave and go. */
  skip(now: number): void {
    if (this.phase === "leaving" || this.phase === "gone") return;
    this.hooks.quiet();
    this.beginLeaving(now);
  }

  update(now: number, bubbleElapsed: number): void {
    const delta = this.lastFrame === 0 ? 0.016 : Math.min((now - this.lastFrame) / 1000, 0.1);
    this.lastFrame = now;
    const character = this.character;
    if (!character) {
      // The pack is still loading. Hold the clock so the first line doesn't
      // start playing to an empty room and finish before anyone appears.
      this.phaseStartedAt = now;
      return;
    }
    character.update(delta);

    switch (this.phase) {
      case "arriving": {
        const t = THREE.MathUtils.clamp((now - this.phaseStartedAt) / WALK_MS, 0, 1);
        this.walk([DOOR_POSITION, DOOR_THRESHOLD_POSITION, GUIDE_SPOT], t);
        if (t >= 1) {
          // Turn to face the open corner the camera looks in from, so the
          // player gets a face rather than the back of a head — the same
          // mistake SEAT_FACINGS exists to prevent, and the whole point of a
          // character with a mouth. The models face +Z, the camera sits on
          // +x/+z, so that is `atan2(1, 1)`.
          this.group.rotation.set(0, Math.PI * 0.25, 0);
          this.phase = "talking";
          this.nextLine(now);
        }
        break;
      }
      case "talking": {
        // The mouth reads the bubble's own clock, so text and lips cannot drift.
        character.say(frameAt(this.track, bubbleElapsed));
        const line = this.script[this.index];
        if (!line) break;
        const spoken = fillLine(line.text, this.names).length * SPEECH_MS_PER_CHAR;
        const finishedSpeaking = now - this.lineStartedAt > spoken;

        // **A task line does not move on by itself.** She asks, then waits for
        // the player to actually do it — which is the difference between being
        // told about the shop and having opened it once.
        if (this.taskBaseline && line.task) {
          if (!finishedSpeaking) break;
          if (taskDone(line.task, this.taskBaseline, this.hooks.snapshot())) {
            this.taskBaseline = null;
            this.hooks.point(null);
            this.hooks.waiting(null);
            this.nextLine(now);
          }
          break;
        }

        // **Nothing advances by itself any more.** Ellis: *"the text is gone
        // before i can see [it]. should require a tap to move to the next
        // string of text."* A timed hand-over cannot work: the player is often
        // inside a panel, reading something else, or naming a cat, and a line
        // that expires while they are busy is a line they never read. The one
        // universal signal that somebody is ready is that they said so.
        void finishedSpeaking;
        break;
      }
      case "leaving": {
        const t = THREE.MathUtils.clamp((now - this.phaseStartedAt) / WALK_MS, 0, 1);
        this.walk([GUIDE_SPOT, DOOR_THRESHOLD_POSITION, DOOR_POSITION], t);
        if (t >= 1) {
          this.phase = "gone";
          this.group.visible = false;
          this.hooks.finished();
        }
        break;
      }
      case "gone":
        break;
    }
  }

  dispose(): void {
    if (this.character) {
      this.group.remove(this.character.group);
      this.character.dispose();
      this.character = null;
    }
    this.group.removeFromParent();
  }

  private nextLine(now: number): void {
    this.index++;
    const line = this.script[this.index];
    if (!line) {
      this.hooks.quiet();
      this.beginLeaving(now);
      return;
    }
    const text = fillLine(line.text, this.names);
    this.lineStartedAt = now;
    this.track = visemeTrack(text, { msPerChar: SPEECH_MS_PER_CHAR });
    this.hooks.say(text, now);
    if (line.expression) this.character?.express(line.expression);
    // A gesture is best-effort: a clip renamed upstream should cost a still
    // moment, not a frozen guide. `gesture` reports that itself.
    if (line.gesture) this.character?.gesture(line.gesture);

    if (line.task) {
      // **Grant before baselining.** The top-up moves `money`, and the
      // baseline is what "did they do it" is measured against — take it first
      // and the grant itself looks like progress on a step about spending.
      const before = this.hooks.snapshot();
      const owed = topUp(line.task, before);
      if (owed > 0) this.hooks.grant(owed);
      this.taskBaseline = this.hooks.snapshot();
      this.hooks.point(line.task);
      this.hooks.waiting(line.waitHint ?? null);
    } else {
      this.taskBaseline = null;
      this.hooks.point(null);
      this.hooks.waiting(null);
    }
  }

  private beginLeaving(now: number): void {
    this.phase = "leaving";
    this.phaseStartedAt = now;
    // Whatever she was pointing at, stop — a highlight left pulsing after she
    // has gone is a bug the player can see and cannot clear.
    this.taskBaseline = null;
    this.hooks.point(null);
    this.hooks.waiting(null);
    this.character?.say(MOUTH_REST);
    this.character?.express("happy");
    this.character?.walk();
    this.group.rotation.set(0, 0, 0);
  }

  /** Constant-speed walk along a polyline, facing the way they're going. */
  private walk(points: THREE.Vector3[], t: number): void {
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const lengths: number[] = [];
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const d = points[i].distanceTo(points[i - 1]);
      lengths.push(d);
      total += d;
    }
    const before = this.group.position.clone();
    let travelled = eased * total;
    for (let i = 0; i < lengths.length; i++) {
      if (travelled <= lengths[i] || i === lengths.length - 1) {
        const f = lengths[i] < 1e-6 ? 1 : THREE.MathUtils.clamp(travelled / lengths[i], 0, 1);
        this.group.position.lerpVectors(points[i], points[i + 1], f);
        break;
      }
      travelled -= lengths[i];
    }
    const dx = this.group.position.x - before.x;
    const dz = this.group.position.z - before.z;
    if (dx * dx + dz * dz > 1e-8) this.group.rotation.set(0, Math.atan2(dx, dz), 0);
  }
}
