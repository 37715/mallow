/**
 * The café's soundtrack — written here rather than bought (§10).
 *
 * Ellis, 2026-08-27: *"i need nice music … i cant find a single ost i like on
 * those marketplace sites."* That is the whole brief, and it points somewhere
 * specific: not "find a better loop", but **stop shopping for one**. Every
 * marketplace OST is a fixed two-minute piece that will be recognised as a loop
 * within ten minutes and resented within thirty, and this is a game people are
 * meant to leave running while they do something else. It also arrives with a
 * licence, a download, and somebody else's taste.
 *
 * So the music is generated: a real chord progression, a bass, and a melody
 * built from a motif that is rewritten every phrase. **It never repeats and it
 * is never random** — those are two different failures and the design has to
 * dodge both. A loop repeats; a random walk noodles. What sits between them is
 * *the same tune, said differently each time*, which is what a musician
 * improvising over changes actually does, and it is only about thirty lines of
 * arithmetic.
 *
 * Three decisions worth defending before anyone changes them:
 *
 * 1. **No drums.** The obvious reference for "cosy game music" is lo-fi hip
 *    hop, which is a beat. A beat is a *pulse you cannot stop noticing*, and
 *    §10's coin-chime lesson applies exactly: a repeated sound that is fine for
 *    a minute is a nag for an hour, and pillar 1 beats groove. Chords, bass and
 *    a melody with a lot of space in it read as *a room with music in it*
 *    rather than as a track playing at you.
 * 2. **Reverb is not a garnish, it is most of the sound.** A dry synth note is
 *    obviously a synth note; the same note in a room is an instrument. The
 *    convolver's impulse is generated here too, so nothing is downloaded.
 * 3. **The electric piano is a two-part fake, and the fast part is the one
 *    that matters.** A Rhodes is a struck tine: a soft sine body plus a bright
 *    inharmonic partial that dies in a tenth of a second. Drop the fast partial
 *    and it is an organ; keep it and the ear hears a hammer.
 */

/** Slow enough to be furniture, fast enough to be a tune. */
const BPM = 68;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

/** How far ahead notes are scheduled, and how often we top that up. */
const LOOKAHEAD_S = 2.6;
const TICK_MS = 400;

const midiToFreq = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

/**
 * One bar's worth of harmony.
 *
 * Voiced by hand rather than derived from a chord symbol, because the whole
 * character of this style is in the voicing — open fifths and ninths low down,
 * no thirds in the bass, and the seventh sitting where a piano player's thumb
 * would be. A generator that stacks triads sounds like a hymn.
 */
interface Chord {
  /** Left hand, one note. */
  bass: number;
  /** Right hand, 3–4 notes around middle C. */
  voicing: number[];
  /** What the melody may choose from over this chord. */
  colour: number[];
}

// C major / A minor throughout — the melody pools are what make each chord
// sound different, not a key change. Modulating would need a second set of
// voicings for very little gain in a piece nobody is listening to closely.
const Cmaj9: Chord = { bass: 36, voicing: [52, 55, 59, 62], colour: [67, 69, 71, 72, 74, 76, 79] };
const Cmaj7: Chord = { bass: 36, voicing: [52, 55, 59], colour: [67, 69, 71, 72, 76, 79] };
const Am9: Chord = { bass: 33, voicing: [52, 55, 59, 60], colour: [67, 69, 72, 74, 76, 79] };
const Am7: Chord = { bass: 45, voicing: [52, 55, 60], colour: [67, 69, 72, 74, 76] };
const Dm9: Chord = { bass: 38, voicing: [53, 57, 60, 64], colour: [69, 72, 74, 77, 79] };
const Dm7: Chord = { bass: 38, voicing: [53, 57, 60], colour: [69, 72, 74, 77] };
const G13: Chord = { bass: 43, voicing: [53, 59, 64], colour: [67, 71, 74, 76, 79] };
const G7: Chord = { bass: 43, voicing: [53, 59, 62], colour: [67, 71, 74, 77] };
const Fmaj7: Chord = { bass: 41, voicing: [57, 60, 64], colour: [69, 72, 74, 77, 81] };
const Em7: Chord = { bass: 40, voicing: [55, 59, 62], colour: [67, 71, 74, 76] };

/**
 * Four-bar phrases, picked at random and never twice running.
 *
 * All of them resolve somewhere gentle, and none of them ends on the tonic —
 * a phrase that lands home wants to stop, and this piece never stops.
 */
const PHRASES: Chord[][] = [
  [Cmaj9, Am9, Dm9, G13],
  [Fmaj7, Em7, Dm7, G7],
  [Am9, Fmaj7, Cmaj7, G7],
  [Dm9, G13, Cmaj7, Am7],
  [Cmaj7, Em7, Fmaj7, G13],
];

/**
 * Rhythms the melody can use, in beats: `[start, length]`.
 *
 * A handful of patterns rather than a generator, because rhythm is where
 * randomness is heard *first* — wrong pitches sound like a choice, wrong
 * rhythm sounds like a mistake. Every one of these leaves at least a beat and
 * a half of silence.
 */
const FIGURES: [number, number][][] = [
  [[0, 1.5], [1.5, 0.5], [2, 1]],
  [[0.5, 1], [1.5, 1.5]],
  [[0, 0.5], [0.5, 0.5], [1, 1], [2.5, 1]],
  [[1, 1], [2, 2]],
  [[0, 2], [3, 1]],
  [[2, 0.5], [2.5, 0.5], [3, 1]],
];

const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

/**
 * A generated room, so the instruments are in a place rather than in a jar.
 *
 * Noise with an exponential tail is the oldest trick there is and it is
 * indistinguishable from a real small-room impulse at this length. Two
 * channels, uncorrelated, which is where the width comes from.
 */
function impulse(ctx: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return buffer;
}

export interface MusicHandle {
  /**
   * Follow the music switch. **Stops scheduling rather than just ducking the
   * gain** — a muted café should not be running four oscillators a second for
   * nobody, and the piece is generated, so there is no position to lose.
   */
  setPlaying(on: boolean): void;
  stop(): void;
}

export interface MusicOptions {
  /**
   * Schedule this many seconds up front and run no timer.
   *
   * **This is what makes the music auditionable** (`tools/render-audio.mjs`).
   * An `OfflineAudioContext` renders faster than real time and its clock only
   * advances *during* the render, so a look-ahead scheduler driven by
   * `setInterval` produces exactly one bar and then silence. Scheduling the
   * whole span in one go is the only shape that works offline — and it costs
   * nothing to support, because the live path is the same function called with
   * a moving horizon.
   *
   * Sounds cannot be judged from a diff. Everything else in this project has a
   * way to look at it (`tools/shot.mjs`, the gallery, `npm run balance`) and
   * audio had none, which is how the purr shipped as a diesel engine twice.
   */
  offlineSeconds?: number;
}

export function startMusic(
  ctx: BaseAudioContext,
  destination: AudioNode,
  options: MusicOptions = {},
): MusicHandle {
  // --- the room ------------------------------------------------------------
  const dry = ctx.createGain();
  dry.gain.value = 0.62;
  dry.connect(destination);

  const send = ctx.createGain();
  send.gain.value = 0.55;
  // Darken what goes into the tail: a bright reverb on a synth reads as hiss,
  // and the whole point is to sound like a warm room.
  const tame = ctx.createBiquadFilter();
  tame.type = "lowpass";
  tame.frequency.value = 2600;
  const reverb = ctx.createConvolver();
  reverb.buffer = impulse(ctx, 2.4, 2.6);
  send.connect(tame).connect(reverb).connect(destination);

  /** Everything the instruments play goes through both. */
  const bus = ctx.createGain();
  bus.gain.value = 1;
  bus.connect(dry);
  bus.connect(send);

  // --- instruments ---------------------------------------------------------

  /**
   * The electric piano. Three sines: body, octave, and the tine.
   *
   * The tine is at 6.03× rather than 6× on purpose — a struck bar is
   * inharmonic, and the two-cent-ish stretch is the difference between "bell"
   * and "sine at the sixth harmonic".
   */
  function rhodes(midi: number, at: number, gain: number, length: number): void {
    const freq = midiToFreq(midi);
    for (const [ratio, level, decay] of [
      [1, 1, length],
      [2, 0.22, length * 0.55],
      [6.03, 0.08, 0.17],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq * ratio;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, at);
      env.gain.exponentialRampToValueAtTime(gain * level, at + 0.006);
      env.gain.exponentialRampToValueAtTime(0.0001, at + decay);
      osc.connect(env).connect(bus);
      osc.start(at);
      osc.stop(at + decay + 0.05);
      osc.onended = () => {
        osc.disconnect();
        env.disconnect();
      };
    }
  }

  /** Upright-ish bass: a sine with a little grit and a soft thumb attack. */
  function bass(midi: number, at: number, gain: number, length: number): void {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = midiToFreq(midi);
    const body = ctx.createBiquadFilter();
    body.type = "lowpass";
    body.frequency.value = 420;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(gain, at + 0.03);
    env.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(body).connect(env);
    // Bass goes to the dry side only. A low note in a 2.4-second tail is mud,
    // and it is the one instrument that has to stay defined.
    env.connect(dry);
    osc.start(at);
    osc.stop(at + length + 0.05);
    osc.onended = () => {
      osc.disconnect();
      body.disconnect();
      env.disconnect();
    };
  }

  /** The melody: a soft bell, mostly reverb. */
  function bell(midi: number, at: number, gain: number, length: number): void {
    const freq = midiToFreq(midi);
    for (const [ratio, level, decay] of [
      [1, 1, length],
      [2.76, 0.14, length * 0.4],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq * ratio;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, at);
      env.gain.exponentialRampToValueAtTime(gain * level, at + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0001, at + decay);
      osc.connect(env).connect(bus);
      osc.start(at);
      osc.stop(at + decay + 0.05);
      osc.onended = () => {
        osc.disconnect();
        env.disconnect();
      };
    }
  }

  // --- the piece ------------------------------------------------------------

  let phrase = PHRASES[0];
  let figure = FIGURES[0];
  /** Where the melody left off, so the next note is a step rather than a leap. */
  let lastNote = 72;
  let bar = 0;
  let nextBarAt = 0;

  function startPhrase(): void {
    let next = pick(PHRASES);
    while (next === phrase && PHRASES.length > 1) next = pick(PHRASES);
    phrase = next;
    figure = pick(FIGURES);
  }

  /**
   * The next melody note: the nearest few choices to where we already are.
   *
   * **This is the whole trick.** Picking freely from the chord's colour tones
   * is a random walk and sounds like one; picking the *closest* option to the
   * last note makes a line. Sorting by distance and choosing among the nearest
   * three leaves room for a small surprise without ever leaping an octave.
   */
  function nextNote(chord: Chord): number {
    const near = [...chord.colour].sort(
      (a, b) => Math.abs(a - lastNote) - Math.abs(b - lastNote),
    );
    lastNote = near[Math.floor(Math.random() * Math.min(3, near.length))];
    return lastNote;
  }

  function scheduleBar(index: number, at: number): void {
    if (index % 4 === 0) startPhrase();
    const chord = phrase[index % 4];

    // Bass: root on the downbeat, and a push before the next bar three times
    // out of four. That push is what stops four-square chords sounding square.
    bass(chord.bass, at, 0.15, BEAT * 2.2);
    if (Math.random() < 0.75) bass(chord.bass + 7, at + BEAT * 2.5, 0.1, BEAT * 1.2);

    /**
     * Chord: rolled, not struck. 18 ms between notes is under the threshold
     * where it reads as an arpeggio and well over the one where it reads as a
     * block — which is the difference between a player and a MIDI file.
     */
    const roll = Math.random() < 0.5 ? 0.018 : 0.026;
    chord.voicing.forEach((note, i) => {
      rhodes(note, at + i * roll, 0.09, BEAT * 3.4);
    });
    if (Math.random() < 0.45) {
      const upper = chord.voicing.slice(-2);
      upper.forEach((note, i) => rhodes(note, at + BEAT * 2 + i * roll, 0.05, BEAT * 1.6));
    }

    // Melody: silent in about a third of bars, on purpose. The rests are what
    // make the rest of it sound chosen.
    if (Math.random() < 0.66) {
      for (const [start, length] of figure) {
        bell(nextNote(chord), at + start * BEAT, 0.075, Math.min(length * BEAT, 1.4));
      }
    }
  }

  let playing = true;
  let timer: number | null = null;

  function tick(): void {
    if (!playing) return;
    const now = ctx.currentTime;
    // A suspend/resume (backgrounding the app) leaves the clock miles ahead of
    // where the piece thinks it is. Catch up silently rather than scheduling
    // two hundred bars into the past.
    if (nextBarAt < now) nextBarAt = now + 0.1;
    while (nextBarAt < now + LOOKAHEAD_S) {
      scheduleBar(bar++, nextBarAt);
      nextBarAt += BAR;
    }
  }

  if (options.offlineSeconds !== undefined) {
    nextBarAt = 0;
    while (nextBarAt < options.offlineSeconds) {
      scheduleBar(bar++, nextBarAt);
      nextBarAt += BAR;
    }
    return { setPlaying: () => {}, stop: () => {} };
  }

  nextBarAt = ctx.currentTime + 0.4;
  tick();
  timer = window.setInterval(tick, TICK_MS);

  return {
    setPlaying(on) {
      if (on === playing) return;
      playing = on;
      // Restart the clock on resume so the first bar lands immediately rather
      // than after however long the mute lasted.
      if (on) {
        nextBarAt = ctx.currentTime + 0.2;
        tick();
      }
    },
    stop() {
      playing = false;
      if (timer !== null) window.clearInterval(timer);
      timer = null;
    },
  };
}
