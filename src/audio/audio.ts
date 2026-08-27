/**
 * Audio (§10 — "audio is half the cosiness").
 *
 * Every sound here is **synthesised at runtime with WebAudio**: no files, no
 * downloads, no licensing questions, and nothing to load before first paint.
 *
 * **That used to be a compromise and it is now the plan.** This header said for
 * months that a real composer's bed should replace `startAmbient()`; Ellis went
 * looking — *"i cant find a single ost i like on those marketplace sites"* —
 * and the answer turned out to be to write one instead (`audio/music.ts`). A
 * bought loop is a fixed two minutes that gets recognised, and then resented,
 * in a game meant to be left running. A generated piece has neither problem.
 *
 * This file is the plumbing and the effects; the two things with real DSP in
 * them live next door, because both are long enough to be read on their own:
 *
 * - `audio/music.ts` — the soundtrack. Chords, bass, melody, a generated room.
 * - `audio/cat.ts` — the voice. Meow and chirrup, by formant synthesis.
 *
 * **There is a way to listen to all of it**: `node tools/render-audio.mjs cafe
 * 60 out.wav` bounces the mix to a file. Use it before changing anything here.
 * Audio had no equivalent of `tools/shot.mjs` until 2026-08-27, and the cost of
 * that shows up in this file's history — the purr was shipped as a diesel
 * engine twice, and a note claiming a synthesised meow was impossible went
 * unchallenged for weeks. Nobody had heard either one.
 *
 * Everything is gentle by construction: soft attacks, no transients that could
 * startle, and a master gain low enough to sit under a podcast.
 */

import { chirp, meow, renderCry } from "@/audio/cat";
import { startMusic, type MusicHandle } from "@/audio/music";

const MASTER_VOLUME = 0.3;
const MUTE_KEY = "mallow-muted";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
/** The ambient bed's own gain, so music mutes without muting the sfx. */
let musicGain: GainNode | null = null;
let music: MusicHandle | null = null;
let ambientGain: GainNode | null = null;
let muted = readMuted();
/** Held so it is never garbage-collected — see `keepMediaSessionAwake`. */
let keepalive: HTMLAudioElement | null = null;

/**
 * A one-second silent WAV, built here rather than shipped.
 *
 * Bytes, not a file: this module's whole premise is that there is nothing to
 * download (§10), and a 44-byte header plus a run of zeros does not deserve to
 * become the first asset that breaks that.
 */
function silentWav(): string {
  const rate = 8000;
  const frames = rate; // one second, looped
  const size = 44 + frames * 2;
  const buffer = new ArrayBuffer(size);
  const view = new DataView(buffer);
  const text = (at: number, s: string): void => {
    for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, size - 8, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true); // PCM header length
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true); // bytes per second
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  text(36, "data");
  view.setUint32(40, frames * 2, true);
  // The samples are already zero, which for 16-bit PCM is silence.
  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

/**
 * Play a silent loop through a real `<audio>` element, for ever.
 *
 * **This is what makes the game audible on an iPhone with the ringer off, and
 * it took three attempts to find.** The app sets its `AVAudioSession` category
 * to `.playback` (`ios/App/App/AppDelegate.swift`), which is the documented way
 * to ignore the hardware silent switch — and on its own it did not work.
 *
 * The reason is that a WKWebView renders in its own process, and **WebKit
 * chooses an audio session category to suit what the page appears to be
 * doing**. A page that only ever uses WebAudio, with no media element anywhere
 * in it, does not read as media playback, so WebKit's choice overrides the
 * app's and the ringer switch wins. Giving it an actual `<audio>` element that
 * is genuinely playing is what puts the page in the media-playback bucket; the
 * app's `.playback` category then applies to everything, WebAudio included.
 *
 * Three details that matter:
 *
 * - **The content is silent, but the volume is 1.** WebKit is looking at
 *   whether the element is playing, not whether it is audible, and an element
 *   muted to zero is the one thing likely to be discounted.
 * - **It must start inside a user gesture**, like everything else here — which
 *   is why it lives in `initAudio()` rather than at module load.
 * - **It loops for ever rather than being re-triggered.** A gap is a moment
 *   with no media playing, and that is a moment WebKit can reconsider.
 *
 * Costs nothing measurable: 8 kHz mono silence is 16 kB of zeros in memory and
 * no decoding work worth naming.
 */
function keepMediaSessionAwake(): void {
  if (keepalive) {
    if (keepalive.paused) void keepalive.play().catch(() => {});
    return;
  }
  try {
    const element = new Audio(silentWav());
    element.loop = true;
    element.volume = 1;
    element.setAttribute("playsinline", "");
    // **In the document, not just in a variable.** `new Audio()` gives a
    // detached element, and WebKit has historically been fussier about those
    // than about ones in the tree. It costs a hidden node; it removes a
    // plausible reason for the whole thing to quietly not count. Appended to
    // `body` rather than `#ui-root`, which `mountUI` clears.
    element.hidden = true;
    document.body.appendChild(element);
    void element.play().catch(() => {
      // Blocked (no gesture yet, or the platform said no). The sound still
      // works with the ringer on, so this is a downgrade, never a failure.
    });
    keepalive = element;
  } catch {
    // No HTMLAudioElement at all. Nothing to do; WebAudio carries on.
  }
}

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
  // **The fade and the stop are both needed.** The gain ramp is what makes
  // muting sound deliberate rather than like a dropout; stopping the scheduler
  // is what stops a silenced café running a piano for nobody. Delayed by the
  // length of the fade so the last chord gets to ring out through it.
  if (music) {
    if (next) window.setTimeout(() => music?.setPlaying(false), 800);
    else music.setPlaying(true);
  }
}

/**
 * Browsers refuse to start audio until the user interacts, so this is called
 * from the first tap rather than at boot. Safe to call repeatedly.
 */
export function initAudio(): void {
  // Both halves of "audible on a phone with the ringer off" — see
  // `keepMediaSessionAwake`. Re-run on every call, because a resume from the
  // background can leave the element paused.
  keepMediaSessionAwake();

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
  // **The bed stays underneath the tune.** They do different jobs: the music
  // is the thing you notice, the room tone is what stops the gaps between
  // phrases sounding like the sound has broken. Both hang off `musicGain`, so
  // one switch silences the pair.
  music = startMusic(ctx, musicGain);
  if (musicMuted) music.setPlaying(false);
  void loadSamples();
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

/**
 * Recorded cats. **These ship, and they are what you actually hear.**
 *
 * Ellis, 2026-08-27: *"can we source some actgual professionally made cat purr
 * and meows or something instead of these ridiculous sounds."* Fair. The
 * formant meow is a decent piece of synthesis and it is still a synthesiser
 * pretending to be an animal; a purr is worse, having been rebuilt three times
 * as a boomy wobble, a diesel engine and *"heavy rain with reverb"*. A cat is
 * a vocal tract, and eleven seconds of a real one settles it.
 *
 * **Seven files, 88 kB, all CC0 or public domain**, from Wikimedia Commons —
 * see `public/audio/README.md` for the provenance of each. That is nothing
 * against the 4 MB character GLB, and §10's rule was never "no files": it was
 * *don't block first paint on a download and don't inherit a licence*. Both
 * hold. They are fetched lazily after the first tap, a missing one is silently
 * fine, and the synthesised versions in `audio/cat.ts` remain as the fallback.
 *
 * **AAC in `.m4a`, not MP3 or Ogg.** Ogg Vorbis is the format most CC0 audio
 * arrives in and Safari does not decode it, so it would have worked in every
 * browser used to develop this and in none of the app. AAC is the codec iOS
 * decodes in hardware.
 */
const SAMPLE_PATHS: Record<string, string[]> = {
  purr: ["/audio/purr.m4a"],
  // Six, because the one thing worse than a synthetic meow is the *same* meow.
  meow: [
    "/audio/meow-1.m4a",
    "/audio/meow-2.m4a",
    "/audio/meow-3.m4a",
    "/audio/meow-4.m4a",
    "/audio/meow-5.m4a",
    "/audio/meow-6.m4a",
  ],
  // Empty on purpose: there is no CC0 recording of a cat trilling anywhere I
  // could find, and `playChirp` would rather borrow a real meow than play a
  // synthesised cat next to six recorded ones. Drop files here if any turn up.
  chirp: [],
};

/** Decoded samples, keyed as above. Absent means "not loaded, or not there". */
const samples = new Map<string, AudioBuffer[]>();
let samplesRequested = false;

/**
 * Fetch and decode whatever is present. Called once, after the context exists.
 *
 * Failures are expected and silent: a café with no audio files is the normal
 * case until somebody adds them, and it must sound exactly as it does today
 * rather than logging errors on every boot.
 */
async function loadSamples(): Promise<void> {
  if (samplesRequested || !ctx) return;
  samplesRequested = true;
  for (const [name, paths] of Object.entries(SAMPLE_PATHS)) {
    const decoded: AudioBuffer[] = [];
    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (!response.ok) continue;
        decoded.push(await ctx.decodeAudioData(await response.arrayBuffer()));
      } catch {
        // No file, or not decodable. The synthesised version stands in.
      }
    }
    if (decoded.length > 0) samples.set(name, decoded);
  }
}

/**
 * Play a recorded sample if one exists. Returns false when there is none, which
 * is the caller's cue to fall back to synthesis.
 */
function playSample(name: string, gain = 1): boolean {
  const options = samples.get(name);
  if (!options || !ctx || !master) return false;
  const buffer = options[Math.floor(Math.random() * options.length)];
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  // A little variation, so a repeated sound never lands identically twice.
  source.playbackRate.value = 0.94 + Math.random() * 0.12;
  const env = ctx.createGain();
  env.gain.value = gain;
  source.connect(env).connect(master);
  source.start();
  source.onended = () => {
    source.disconnect();
    env.disconnect();
  };
  return true;
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
  // **Dropped from 0.16 when the music landed** (2026-08-27). The bed used to be
  // the whole soundtrack; it is now a floor under one, and two things competing
  // for the same quiet register is how a mix turns to mud. Quiet enough that
  // what it does is fill the gaps between phrases.
  ambientGain.gain.value = 0.09;
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
 * **Nearly a sine, and that is the correction.** A purr *is* a train of pulses
 * — the folds close about 25 times a second — but the previous version gave
 * that pulse a full harmonic stack, and a hard-edged 25 Hz buzz with strong
 * harmonics is a **motor**. Ellis: *"fix the cat purr so it doesnt sound like
 * a diesel engine starting up."* A cat is soft-edged: the flutter is felt more
 * than heard, and what you actually hear is breath being interrupted. Two
 * quiet harmonics keep it from being a plain tremolo without building an
 * engine.
 */
function purrWave(context: AudioContext): PeriodicWave {
  const harmonics = [0, 1, 0.3, 0.1];
  const real = new Float32Array(harmonics.length);
  const imag = new Float32Array(harmonics);
  return context.createPeriodicWave(real, imag, { disableNormalization: false });
}

/**
 * Petting a cat.
 *
 * **The diesel was coming from underneath.** This has now been built three
 * times: lowpassed noise with a sine tremolo (a boomy wobble), then a hard
 * pulse train over a low band (an engine), and now this. Three things were
 * making it a motor, in order of how much each contributed:
 *
 * 1. **Energy below ~150 Hz.** A low band chopped at 25 Hz is the exact recipe
 *    for an idling diesel. There is a highpass now, and the "chest" lowpass
 *    that sat at 180 Hz — the loudest offender — is gone entirely. A purr
 *    heard from across a room has almost nothing down there; the rumble is
 *    something you feel with a hand on the cat, not a sound.
 * 2. **A hard pulse shape**, with harmonics stacked to the seventh. See
 *    `purrWave`.
 * 3. **Modulation far too deep** — it swung from 0.1 to 1.0 of the carrier,
 *    which is a chopper. It is 0.62→1.0 now: a flutter across a continuous
 *    breath, rather than the breath being switched on and off.
 *
 * What is left is an airy band around 400–900 Hz, fluttered gently, with the
 * rate drifting through the breath because a perfectly fixed rate is the
 * clearest tell that a sound is synthetic.
 */
export function playPurr(): void {
  if (!ctx || !master) return;
  // A recording if there is one — see `SAMPLE_PATHS`.
  if (playSample("purr", 0.9)) return;
  const buffer = noiseBuffer(1.9);
  if (!buffer) return;
  const now = ctx.currentTime;
  const length = 1.7;

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // **Nothing below here.** This one filter is most of the difference between
  // a cat and a generator.
  const cut = ctx.createBiquadFilter();
  cut.type = "highpass";
  cut.frequency.value = 190;
  cut.Q.value = 0.7;

  // The rasp: airy and soft-edged, not chesty.
  const rasp = ctx.createBiquadFilter();
  rasp.type = "bandpass";
  rasp.frequency.value = 560;
  rasp.Q.value = 0.45;

  // Take the hiss off the top so it reads as breath rather than static.
  const soften = ctx.createBiquadFilter();
  soften.type = "lowpass";
  soften.frequency.value = 1500;
  soften.Q.value = 0.6;

  /**
   * The flutter, as a gain the noise passes *through* — not as an addition to
   * the envelope's own gain. Keeping the two stages separate is what stops the
   * depth changing as the envelope moves.
   */
  const flutter = ctx.createGain();
  flutter.gain.value = 0;
  const floor = ctx.createConstantSource();
  floor.offset.value = 0.81;
  floor.connect(flutter.gain);

  const pulse = ctx.createOscillator();
  pulse.setPeriodicWave(purrWave(ctx));
  pulse.frequency.setValueAtTime(28, now);
  pulse.frequency.linearRampToValueAtTime(25.5, now + length * 0.55);
  pulse.frequency.linearRampToValueAtTime(27.5, now + length);
  const depth = ctx.createGain();
  depth.gain.value = 0.19;
  pulse.connect(depth).connect(flutter.gain);

  // The breath: one swell, in and out, rather than a flat block of sound.
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(0.4, now + 0.26);
  env.gain.exponentialRampToValueAtTime(0.28, now + length * 0.62);
  env.gain.exponentialRampToValueAtTime(0.0001, now + length);

  source.connect(cut).connect(rasp).connect(soften).connect(flutter);
  flutter.connect(env).connect(master);

  source.start(now);
  source.stop(now + length + 0.05);
  pulse.start(now);
  pulse.stop(now + length + 0.05);
  floor.start(now);
  floor.stop(now + length + 0.05);
  source.onended = () => {
    source.disconnect();
    cut.disconnect();
    rasp.disconnect();
    soften.disconnect();
    flutter.disconnect();
    depth.disconnect();
    env.disconnect();
  };
}


/**
 * A meow. A recording wins if one has been dropped in (`SAMPLE_PATHS`);
 * otherwise it is synthesised, and has been since 2026-08-27.
 *
 * **The note that used to sit here said a synthesised meow was worse than
 * silence, and it was wrong.** It generalised from the purr — three failed
 * attempts at shaping noise into an animal — without noticing that the two
 * sounds are made in completely different ways. A purr is unvoiced; a meow has
 * a pitch, which puts it in the one corner of this problem that is easy. See
 * `audio/cat.ts`.
 */
export function playMeow(): void {
  if (!ctx || !master) return;
  if (playSample("meow", 0.85)) return;
  renderCry(ctx, master, meow());
}

/**
 * The pleased-to-see-you chirrup.
 *
 * **Falls back to a real meow before it falls back to synthesis**, which is the
 * one interesting line here. There is no CC0 recording of a cat trilling, so
 * the choice is between a synthesised chirrup and a recorded meow — and beside
 * six real meows, a synthesised anything is the sound the player notices.
 * Losing the distinction between "hello" and "feed me" costs less than losing
 * the illusion. See `chirp` in `audio/cat.ts` for the synthesis that is still
 * the last resort.
 */
export function playChirp(): void {
  if (!ctx || !master) return;
  if (playSample("chirp", 0.8)) return;
  if (playSample("meow", 0.8)) return;
  renderCry(ctx, master, chirp());
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
