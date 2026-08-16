/**
 * Audio (§10 — "audio is half the cosiness").
 *
 * Every sound here is **synthesised at runtime with WebAudio**: no files, no
 * downloads, no licensing questions, and nothing to load before first paint.
 * That's a deliberate trade — a real composer's ambient bed would sound better
 * and should replace `startAmbient()` in the M4 art pass. The sfx are cheap
 * enough to be worth keeping.
 *
 * Everything is gentle by construction: soft attacks, no transients that could
 * startle, and a master gain low enough to sit under a podcast.
 */

const MASTER_VOLUME = 0.3;
const MUTE_KEY = "mallow-muted";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
/** The ambient bed's own gain, so music mutes without muting the sfx. */
let musicGain: GainNode | null = null;
let ambientGain: GainNode | null = null;
let muted = readMuted();

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  try {
    localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  } catch {
    // Preference just won't persist; not worth failing over.
  }
  if (master && ctx) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(next ? 0 : MASTER_VOLUME, ctx.currentTime, 0.08);
  }
}

/**
 * The ambient bed, muted independently of the sound effects.
 *
 * **Two switches, because they are two different annoyances.** Ellis, on the
 * settings panel: *"i want option to mute yes the sound but also music."* A
 * player who wants their own music playing wants the room tone gone and the
 * purr kept; a player in company wants the opposite. One switch cannot serve
 * both, and a game whose ambience you cannot silence separately is one people
 * silence entirely.
 *
 * The bed is currently synthesised (§10). When a composed loop lands it should
 * hang off this same gain node and this same switch.
 */
let musicMuted = false;

export function isMusicMuted(): boolean {
  return musicMuted;
}

export function setMusicMuted(next: boolean): void {
  musicMuted = next;
  if (musicGain && ctx) {
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setTargetAtTime(next ? 0 : 1, ctx.currentTime, 0.25);
  }
}

/**
 * Browsers refuse to start audio until the user interacts, so this is called
 * from the first tap rather than at boot. Safe to call repeatedly.
 */
export function initAudio(): void {
  if (ctx) {
    if (ctx.state === "suspended") void ctx.resume();
    return;
  }

  const AudioCtor: typeof AudioContext | undefined =
    window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return; // No WebAudio — the game is perfectly playable silent.

  ctx = new AudioCtor();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : MASTER_VOLUME;
  master.connect(ctx.destination);

  // The bed goes through its own gain so it can be silenced without touching
  // the coin chimes and purrs.
  musicGain = ctx.createGain();
  musicGain.gain.value = musicMuted ? 0 : 1;
  musicGain.connect(master);

  startAmbient();
}

/** Short helper: an oscillator with an attack/decay envelope, auto-cleaned up. */
function tone(
  frequency: number,
  options: {
    type?: OscillatorType;
    duration?: number;
    gain?: number;
    attack?: number;
    delay?: number;
    detune?: number;
    glideTo?: number;
  } = {},
): void {
  if (!ctx || !master) return;
  const {
    type = "sine",
    duration = 0.3,
    gain = 0.3,
    attack = 0.008,
    delay = 0,
    detune = 0,
    glideTo,
  } = options;

  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  osc.detune.value = detune;
  if (glideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(glideTo, start + duration);
  }

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(gain, start + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(env).connect(master);
  osc.start(start);
  osc.stop(start + duration + 0.05);
  osc.onended = () => {
    osc.disconnect();
    env.disconnect();
  };
}

/** Looping buffer of gentle noise — used for room tone and the purr. */
function noiseBuffer(seconds: number): AudioBuffer | null {
  if (!ctx) return null;
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    // Brown-ish noise: softer and warmer than white.
    last = (last + Math.random() * 2 - 1) * 0.5;
    data[i] = last;
  }
  return buffer;
}

/**
 * The ambient bed: a slow, barely-there chord of detuned sines plus quiet room
 * tone. Non-repetitive enough not to grate because the pad voices drift on
 * independent LFOs rather than looping a sample.
 */
function startAmbient(): void {
  if (!ctx || !master || ambientGain) return;

  ambientGain = ctx.createGain();
  ambientGain.gain.value = 0.16;
  ambientGain.connect(musicGain ?? master);

  const warmth = ctx.createBiquadFilter();
  warmth.type = "lowpass";
  warmth.frequency.value = 900;
  warmth.connect(ambientGain);

  // A soft, open chord — root, fifth, octave, tenth. No thirds low down.
  for (const [freq, depth, rate] of [
    [110, 0.05, 0.037],
    [164.81, 0.04, 0.029],
    [220, 0.035, 0.023],
    [277.18, 0.025, 0.019],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.detune.value = (Math.random() - 0.5) * 8;

    const voice = ctx.createGain();
    voice.gain.value = depth;

    // Each voice breathes on its own slow LFO, so the bed never repeats.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = rate;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = depth * 0.7;
    lfo.connect(lfoDepth).connect(voice.gain);

    osc.connect(voice).connect(warmth);
    osc.start();
    lfo.start();
  }

  // Very quiet room tone underneath.
  const buffer = noiseBuffer(3);
  if (buffer) {
    const room = ctx.createBufferSource();
    room.buffer = buffer;
    room.loop = true;
    const roomFilter = ctx.createBiquadFilter();
    roomFilter.type = "lowpass";
    roomFilter.frequency.value = 420;
    const roomGain = ctx.createGain();
    roomGain.gain.value = 0.05;
    room.connect(roomFilter).connect(roomGain).connect(ambientGain);
    room.start();
  }
}

/**
 * Minimum gap between coin chimes.
 *
 * A busy café pays out several times a second. This started at 0.22s, which
 * playtesting immediately flagged as "so annoying" — of course it was, that's
 * still four chimes a second, forever, while you're trying to relax. Pillar 1
 * (§2) beats feedback density every time: the coin floaters already show every
 * single payment, so the sound only needs to say "money is happening", not
 * count it. If in doubt, make this longer, not shorter.
 */
const COIN_MIN_GAP_S = 1.3;
let lastCoinAt = -Infinity;

/** A visitor paid — a soft two-note chime, pitch varied so it never nags. */
export function playCoin(): void {
  if (!ctx) return;
  if (ctx.currentTime - lastCoinAt < COIN_MIN_GAP_S) return;
  lastCoinAt = ctx.currentTime;

  const step = Math.floor(Math.random() * 3);
  const root = [880, 987.77, 1046.5][step];
  tone(root, { duration: 0.22, gain: 0.07, type: "triangle" });
  tone(root * 1.5, { duration: 0.3, gain: 0.04, type: "sine", delay: 0.06 });
}

/**
 * The pulse a purr is built on.
 *
 * **Not a sine.** A purr is a *train of pulses* — the vocal folds close about
 * 25 times a second and the sound is the rasp of each closure, so what the ear
 * identifies is the sharp repeated edge. Modulating with a sine gives a smooth
 * wobble, which is why the old one read as a motorboat rather than a cat.
 *
 * These harmonic amplitudes sum to a rounded, asymmetric bump: quick rise,
 * slower fall, which is the shape of one purr cycle.
 */
function purrWave(context: AudioContext): PeriodicWave {
  const harmonics = [0, 1, 0.72, 0.42, 0.22, 0.11, 0.05];
  const real = new Float32Array(harmonics.length);
  const imag = new Float32Array(harmonics);
  return context.createPeriodicWave(real, imag, { disableNormalization: false });
}

/**
 * Petting a cat.
 *
 * **Rebuilt 2026-08-26** — Ellis: *"the purr sound is really weird and not
 * realistic at all."* It was lowpassed white noise with a 25 Hz sine tremolo
 * on the output gain, and it had three separate problems, all of which the
 * word "rumble" in the old comment was hiding:
 *
 * 1. **The texture was wrong.** A lowpass at 260 Hz leaves a boomy hiss. The
 *    rasp of a purr lives around 200–600 Hz, so it wants a *band*, not a
 *    ceiling.
 * 2. **The modulation was a sine**, which is a wobble. A purr is a pulse
 *    train — see `purrWave`.
 * 3. **The tremolo was added to a gain that was already being ramped**, so its
 *    depth was ±0.35 around a moving target. That is close to 100% modulation
 *    at the quiet ends and much less in the middle: the flutter audibly
 *    changed character across the sound.
 *
 * The rate also drifts. A real cat's purr slows slightly through the out-breath
 * and picks up again, and a perfectly fixed 25 Hz is the single clearest tell
 * that a sound is synthetic.
 */
export function playPurr(): void {
  if (!ctx || !master) return;
  const buffer = noiseBuffer(1.9);
  if (!buffer) return;
  const now = ctx.currentTime;
  const length = 1.7;

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // The rasp. A band rather than a ceiling — this is the part that sounds like
  // an animal instead of like wind.
  const rasp = ctx.createBiquadFilter();
  rasp.type = "bandpass";
  rasp.frequency.value = 330;
  rasp.Q.value = 0.8;

  // A little warmth underneath it, so it has a chest.
  const body = ctx.createBiquadFilter();
  body.type = "lowpass";
  body.frequency.value = 180;
  body.Q.value = 0.7;

  /**
   * The pulse train, as a gain the noise passes *through* — not as an addition
   * to the envelope's gain. Keeping the two stages separate is what stops the
   * flutter depth changing as the envelope moves.
   */
  const flutter = ctx.createGain();
  flutter.gain.value = 0;
  const floor = ctx.createConstantSource();
  // Never fully closes: a purr is continuous with a strong pulse on top, and
  // gating it to silence 25 times a second sounds like a broken speaker.
  floor.offset.value = 0.55;
  floor.connect(flutter.gain);

  const pulse = ctx.createOscillator();
  pulse.setPeriodicWave(purrWave(ctx));
  pulse.frequency.setValueAtTime(27, now);
  // Slows through the breath and picks up again.
  pulse.frequency.linearRampToValueAtTime(23.5, now + length * 0.55);
  pulse.frequency.linearRampToValueAtTime(26, now + length);
  const depth = ctx.createGain();
  depth.gain.value = 0.45;
  pulse.connect(depth).connect(flutter.gain);

  // The breath: one swell, in and out, rather than a flat block of sound.
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(0.42, now + 0.22);
  env.gain.exponentialRampToValueAtTime(0.3, now + length * 0.62);
  env.gain.exponentialRampToValueAtTime(0.0001, now + length);

  source.connect(rasp).connect(flutter);
  source.connect(body).connect(flutter);
  flutter.connect(env).connect(master);

  source.start(now);
  source.stop(now + length + 0.05);
  pulse.start(now);
  pulse.stop(now + length + 0.05);
  floor.start(now);
  floor.stop(now + length + 0.05);
  source.onended = () => {
    source.disconnect();
    rasp.disconnect();
    body.disconnect();
    flutter.disconnect();
    depth.disconnect();
    env.disconnect();
  };
}

/** Generic soft UI tap. */
export function playTap(): void {
  tone(520, { duration: 0.1, gain: 0.09, type: "sine", glideTo: 660 });
}

/**
 * One character of the guide's dialogue appearing.
 *
 * **Deliberately tiny, and deliberately not one sound.** This fires ~20 times
 * a second while a line types out, so anything with a recognisable pitch turns
 * into a melody nobody wrote, and anything longer than a few milliseconds
 * turns into a drone. It is a very short, very quiet click whose pitch wobbles
 * a little each time — enough to read as speech, quiet enough to sit under the
 * ambient bed rather than on top of it.
 *
 * The rate limit matters as much as the sound: at 46 ms per character every
 * keystroke would be a click, which is a typewriter, not a voice. Every third
 * one, with the vowels skipped by the caller, lands around syllable rate.
 */
export function playType(): void {
  if (!ctx) return;
  const pitch = 1180 + Math.random() * 260;
  // **0.022 was inaudible without the phone at full volume.** It was set by
  // reasoning — "it fires 20 times a second, so it must be tiny" — rather than
  // by listening, and the reasoning was wrong twice over: it fires on every
  // third *consonant*, not every character, and a 28 ms click has almost no
  // energy in it whatever its peak. Compare it to `playTap` (0.09) rather than
  // to the ambient bed; it is a tap, not a drone.
  tone(pitch, { duration: 0.032, gain: 0.13, type: "triangle", attack: 0.002 });
}

/** A purchase went through. */
export function playPurchase(): void {
  tone(392, { duration: 0.16, gain: 0.11, type: "triangle" });
  tone(523.25, { duration: 0.22, gain: 0.1, type: "triangle", delay: 0.08 });
}

/**
 * A new cat was revealed. `intensity` 0–1 scales how celebratory it is, so a
 * legendary lands differently from a common without a separate sound.
 */
export function playReveal(intensity: number): void {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  const count = 2 + Math.round(intensity * 2);
  for (let i = 0; i < count; i++) {
    tone(notes[i % notes.length], {
      duration: 0.4 + i * 0.08,
      gain: 0.1,
      type: "triangle",
      delay: i * 0.09,
    });
  }
  if (intensity > 0.6) {
    // Rare cats get a little shimmer on top.
    for (let i = 0; i < 4; i++) {
      tone(1568 + i * 220, { duration: 0.5, gain: 0.035, type: "sine", delay: 0.25 + i * 0.06 });
    }
  }
}
