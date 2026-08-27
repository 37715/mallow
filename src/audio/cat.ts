/**
 * A cat's voice, synthesised (§10).
 *
 * **Why this works where the purr did not, which is the part worth keeping.**
 * `playPurr` was rebuilt three times out of filtered noise and was a boomy
 * wobble, then a diesel engine, then — Ellis — *"heavy rain with reverb. no cat
 * sound at all."* A note went into `audio.ts` concluding that cats cannot be
 * synthesised and the game would have to wait for recordings. That conclusion
 * was too broad, and the reason is a real distinction rather than a detail:
 *
 * - A **purr is unvoiced.** There is no pitch in it. Making noise sound like an
 *   animal is one of the hardest things in audio.
 * - A **meow is voiced.** It has a pitch you can hum. Voiced sounds are made by
 *   a buzzing source shaped by a resonant tube, and that is *precisely* what an
 *   oscillator into a few bandpass filters is. The synthesis matches the
 *   anatomy, so it comes out sounding like the animal almost for free.
 *
 * Everything here is a pure function of an `AudioContext` and a destination, so
 * the same code runs live and inside an `OfflineAudioContext` — which is how
 * these were auditioned (`tools/render-audio.mjs`). Sounds you cannot hear
 * cannot be tuned, and a screenshot is no help.
 */

/** One cry, as a path through pitch and vowel space. */
export interface Cry {
  /** Pitch at the start, middle and end, in Hz. */
  pitch: [number, number, number];
  /**
   * First formant at the same three moments — how open the mouth is.
   *
   * **The movement is the sound.** "meow" is not a vowel, it is a journey
   * between three of them, and the ear identifies the journey. Hold the
   * formants still and you get a kazoo, at any pitch, every time.
   */
  f1: [number, number, number];
  /** Second formant — front-to-back of the tongue. Falls a long way in a meow. */
  f2: [number, number, number];
  seconds: number;
  gain: number;
  /** Depth of the fold trill, 0 for a plain meow and ~0.55 for a chirrup. */
  warble: number;
}

/** ±`spread` around 1, as a multiplier. */
export const jitter = (spread: number): number => 1 + (Math.random() * 2 - 1) * spread;

/**
 * The everyday meow.
 *
 * Fresh numbers every call, because two identical meows in a row is the exact
 * moment anybody stops believing it — the same reason the purr's flutter rate
 * drifts and the ambient pad's voices run on independent LFOs.
 */
export function meow(): Cry {
  const base = 340 * jitter(0.16);
  return {
    // Up into the vowel, down and out. That arc is the shape of the word.
    pitch: [base, base * 1.45 * jitter(0.06), base * 0.82 * jitter(0.06)],
    // Open, then closing again; F2 falling through the whole thing is what
    // turns "eh" into "eow".
    f1: [620 * jitter(0.08), 1000 * jitter(0.08), 620 * jitter(0.08)],
    f2: [1950 * jitter(0.07), 1550 * jitter(0.07), 980 * jitter(0.08)],
    seconds: 0.5 * jitter(0.18),
    // **0.16 measured out at a peak of 0.08 — quieter than a button tap.**
    // Three bandpasses with Q of 7 or more throw most of a sawtooth away, so
    // the number here is nothing like the level that comes out; it was set by
    // eye against the other sfx and it had to be set by ear (`render-audio`).
    gain: 0.42,
    warble: 0,
  };
}

/**
 * The short interrogative chirrup a cat makes when it is pleased to see you —
 * "prrp?".
 *
 * Not a small meow: it is half the length, it **rises and stays up** (a
 * chirrup is a question), and the folds trill through it rather than sustaining.
 * It exists because a café whose cats only ever meow sounds like a shelter, so
 * this is the one that goes on the pleasant moments.
 */
export function chirp(): Cry {
  const base = 420 * jitter(0.14);
  return {
    pitch: [base, base * 1.3, base * 1.5 * jitter(0.05)],
    f1: [520, 780, 700],
    f2: [1500, 1750, 1900],
    seconds: 0.26 * jitter(0.16),
    // Louder still than the meow's figure, because the trill spends half its
    // time closed: `warble` is subtracted from the throat's open gain, so a
    // chirrup at the same number is roughly half the sound.
    gain: 0.52,
    warble: 0.55,
  };
}

/**
 * Play one cry into `destination`, starting at `at` (defaults to now).
 *
 * The signal path is the anatomy, in order: folds → throat → mouth → lips.
 */
export function renderCry(
  ctx: BaseAudioContext,
  destination: AudioNode,
  cry: Cry,
  at?: number,
): void {
  const now = at ?? ctx.currentTime;
  const { seconds } = cry;
  const mid = now + seconds * 0.38;
  const end = now + seconds;

  // --- the folds -----------------------------------------------------------
  // A sawtooth is a serviceable glottal pulse: rich enough for the formants to
  // have something to carve out of it, and free.
  const source = ctx.createOscillator();
  source.type = "sawtooth";
  source.frequency.setValueAtTime(cry.pitch[0], now);
  source.frequency.exponentialRampToValueAtTime(cry.pitch[1], mid);
  source.frequency.exponentialRampToValueAtTime(cry.pitch[2], end);

  // Vibrato, at a rate that is different every time. A perfectly steady wobble
  // is the clearest tell that a sound came out of a computer.
  const vibrato = ctx.createOscillator();
  vibrato.frequency.value = 5.2 + Math.random() * 2.4;
  const vibratoDepth = ctx.createGain();
  vibratoDepth.gain.value = cry.pitch[1] * 0.022;
  vibrato.connect(vibratoDepth).connect(source.frequency);

  // The trill of a chirrup interrupts the *folds*, so it rides on gain rather
  // than on pitch. Modulating the frequency instead gives a siren.
  const throat = ctx.createGain();
  throat.gain.value = 1;
  let trill: OscillatorNode | null = null;
  if (cry.warble > 0) {
    throat.gain.value = 1 - cry.warble;
    trill = ctx.createOscillator();
    trill.type = "sine";
    trill.frequency.value = 26 + Math.random() * 6;
    const depth = ctx.createGain();
    depth.gain.value = cry.warble;
    trill.connect(depth).connect(throat.gain);
  }

  // --- the mouth -----------------------------------------------------------
  // Three bandpasses in **parallel**, summed. Series is more faithful to a real
  // tube; parallel lets each formant keep its own level, and the relative
  // levels are most of what distinguishes one vowel from another.
  const mouth = ctx.createGain();
  const formants: BiquadFilterNode[] = [];
  const shape = (track: [number, number, number] | number, q: number, level: number): void => {
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = q;
    if (typeof track === "number") {
      filter.frequency.value = track;
    } else {
      filter.frequency.setValueAtTime(track[0], now);
      filter.frequency.linearRampToValueAtTime(track[1], mid);
      filter.frequency.linearRampToValueAtTime(track[2], end);
    }
    const gain = ctx.createGain();
    gain.gain.value = level;
    throat.connect(filter).connect(gain).connect(mouth);
    formants.push(filter);
  };
  shape(cry.f1, 7, 1);
  shape(cry.f2, 9, 0.6);
  // The third barely moves in a cat and mostly adds presence.
  shape(2900 + Math.random() * 300, 11, 0.22);

  /**
   * The lips: a lowpass that opens and shuts again.
   *
   * **This is the `m`.** A meow starts as a hum through a nearly closed mouth,
   * and skipping it gives "eow", which sounds like a bird rather than a cat.
   * Keeping it separate from the formants is what makes the consonants and the
   * vowel tunable independently.
   */
  const lips = ctx.createBiquadFilter();
  lips.type = "lowpass";
  lips.frequency.setValueAtTime(700, now);
  lips.frequency.exponentialRampToValueAtTime(5200, now + seconds * 0.22);
  lips.frequency.exponentialRampToValueAtTime(1300, end);
  lips.Q.value = 0.6;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, now);
  // Quiet through the hum, full through the vowel, then away.
  env.gain.exponentialRampToValueAtTime(cry.gain * 0.35, now + 0.05);
  env.gain.exponentialRampToValueAtTime(cry.gain, now + seconds * 0.3);
  env.gain.setValueAtTime(cry.gain, now + seconds * 0.62);
  env.gain.exponentialRampToValueAtTime(0.0001, end);

  source.connect(throat);
  mouth.connect(lips).connect(env).connect(destination);

  source.start(now);
  source.stop(end + 0.05);
  vibrato.start(now);
  vibrato.stop(end + 0.05);
  trill?.start(now);
  trill?.stop(end + 0.05);
  source.onended = () => {
    source.disconnect();
    vibrato.disconnect();
    vibratoDepth.disconnect();
    throat.disconnect();
    for (const filter of formants) filter.disconnect();
    mouth.disconnect();
    lips.disconnect();
    env.disconnect();
  };
}
