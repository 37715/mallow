/**
 * Audio (§10 — "audio is half the cosiness").
 *
 * Two kinds of sound, and the split is the thing to understand:
 *
 * - **The cats and the music are recordings.** `public/audio/*.m4a`, supplied
 *   by Ellis. `audio/soundtrack.ts` plays the track; `playPurr`/`playMeow`
 *   play the rest.
 * - **The interface is synthesised** — coins, taps, purchases, the reveal
 *   chime, the typing click. Those are feedback rather than performances, they
 *   cost nothing, and nobody has ever complained about them.
 *
 * **There used to be a third kind and it is gone: synthesised stand-ins.** A
 * generated soundtrack, a formant meow and a filtered-noise purr all lived
 * here as "fallbacks" for missing files. They were real work and some of it
 * was good, but a fallback that can be heard is not a safety net — it is a
 * second implementation nobody chose, and it kept being chosen. The ambient
 * pad in particular played *underneath* the real soundtrack and was the only
 * thing audible during its rests, which is what Ellis was hearing on
 * 2026-09-02: *"its still only using tyhe old retarded purr. no meow sound.
 * the old soundtrack too … get rid of the old crap i can still hear."*
 * Deleted, not disabled — the same call this project made about the
 * anniversary guide, for the same reason. Missing files now mean quiet, which
 * is the better of the two sounds. Git has them if they are ever wanted.
 *
 * **There is a way to listen to all of it**: `node tools/render-audio.mjs cafe
 * 240 out.wav` bounces the mix, fades and all. Use it before changing anything
 * here — §10 is emphatic that audio levels cannot be reasoned about, and the
 * history in this file is what that rule is made of.
 *
 * Everything is gentle by construction: soft attacks, no transients that could
 * startle, and a master gain low enough to sit under a podcast.
 */
import { loadAudioBuffer } from "@/audio/fetch-audio";
import { startSoundtrack, type MusicHandle } from "@/audio/soundtrack";
import type { Track } from "@/data/tracks";

/**
 * How loud the game is, before the limiter.
 *
 * **0.85, up from 0.3.** Ellis, 2026-09-05: *"i have my phone on MAX volume and
 * the only thing that is even close to being too loud is the meow. the rest is
 * still average when it should be super loud if on max vol."* The old value
 * came with a comment about sitting politely under a podcast, which was a
 * guess about how people would play and turned out to be wrong — a cosy game
 * is still a game and it has to be able to fill a room.
 *
 * **The meow is the reference and it barely moves.** It was the one sound at
 * roughly the right level, so it stays where it is (0.18 → 0.20 peak) and
 * everything else is brought *up to it* rather than everything being scaled
 * together. Music is ~6.6× louder than it was, the interface ~8.5×, the purr
 * ~1.5×.
 */
const MASTER_VOLUME = 0.85;

/**
 * Everything the interface says, scaled in one place.
 *
 * The *relative* balance between the coin chime, the tap, the purchase and the
 * reveal was tuned by ear and is right; only the whole group was too quiet
 * against the recordings. One multiplier keeps that balance intact — editing
 * eleven literals would have re-opened a decision that was already made.
 */
const UI_GAIN = 3;

const MUTE_KEY = "mallow-muted";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
/**
 * A limiter across the whole output.
 *
 * **This is what makes "loud" safe.** With the master at 0.85 a purr, a coin
 * and the soundtrack together can sum past 1.0, and digital clipping is a nasty
 * sound to put in a cosy game. A compressor with a high ratio and a fast attack
 * catches the overlaps and costs nothing audible on a single sound: the music
 * alone never reaches the threshold, so it only engages when something actually
 * lands on top of it.
 */
let limiter: DynamicsCompressorNode | null = null;
/** The ambient bed's own gain, so music mutes without muting the sfx. */
let musicGain: GainNode | null = null;
let music: MusicHandle | null = null;
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
 * The recorded soundtrack hangs off this gain node, so one switch silences the
 * music without touching the purr or the coin chime.
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
  // is what stops a silenced café decoding a track for nobody. Delayed by the
  // length of the fade so the last chord gets to ring out through it.
  if (next) window.setTimeout(syncMusic, 800);
  else syncMusic();
}

/**
 * May the soundtrack play yet?
 *
 * **Two conditions, and they are different questions.** `musicMuted` is the
 * player's setting; this is the game saying the moment is right. Ellis,
 * 2026-09-05: *"only fade in AFTER the tutorial just finishes."* Mal talks over
 * a typing speech bubble for the first couple of minutes, and music rising
 * underneath that is one thing too many.
 *
 * A café that has already been shown round allows it at boot, so this only ever
 * delays the very first session.
 */
let musicAllowed = false;

function syncMusic(): void {
  music?.setPlaying(musicAllowed && !musicMuted);
}

/**
 * Told when a piece starts, so the interface can name it.
 *
 * A callback rather than an import, because `audio/` knowing about `ui/` would
 * be the wrong way round — the soundtrack is the only thing that knows what it
 * started, and everything else is a listener.
 */
let onTrack: ((track: Track) => void) | null = null;
/**
 * The piece currently playing, or null during a rest.
 *
 * **Kept, rather than only announced.** The chip is a moment and moments get
 * missed — Ellis asked three times running where the track name was. A value
 * anything can read at any time is the durable answer to "what is this?"; the
 * chip is the courtesy on top of it. See `ui/now-playing.ts` and the settings
 * panel's now-playing row.
 */
let playingTrack: Track | null = null;

/** What is on right now, if anything. */
export function currentTrack(): Track | null {
  return playingTrack;
}

export function setTrackListener(listener: (track: Track) => void): void {
  onTrack = listener;
}

/** The walkthrough is over (or was already over). Let the soundtrack in. */
export function allowMusic(): void {
  if (musicAllowed) return;
  musicAllowed = true;
  syncMusic();
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
  limiter = ctx.createDynamicsCompressor();
  // −3 dB, hard knee, high ratio: a limiter rather than a compressor. It should
  // do nothing at all until something would otherwise clip.
  limiter.threshold.value = -3;
  limiter.knee.value = 0;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.25;
  limiter.connect(ctx.destination);

  master = ctx.createGain();
  master.gain.value = muted ? 0 : MASTER_VOLUME;
  master.connect(limiter);

  // The bed goes through its own gain so it can be silenced without touching
  // the coin chimes and purrs.
  musicGain = ctx.createGain();
  musicGain.gain.value = musicMuted ? 0 : 1;
  musicGain.connect(master);

  // Captured, because `ctx` and `musicGain` are module-level and nullable and
  // the chain below resolves a tick later — TypeScript is right to insist.
  const context = ctx;
  const bus = musicGain;

  /**
   * **Cats first, then the soundtrack, and the order is the whole point.**
   *
   * These used to start together, and `locklane.m4a` is 2.4 MB against 25 kB
   * for a purr — so on anything slower than localhost the little files queued
   * behind the big one and a cat petted in the first few seconds made no sound
   * at all. Nothing was broken; the samples simply had not arrived yet.
   *
   * The soundtrack can afford to wait and the sound effects cannot: it opens
   * with four seconds of deliberate silence anyway (Ellis: *"a nice little
   * fade in from silence a few seconds after logging in"*), so loading it
   * second costs nothing anybody can hear, while loading it first cost the
   * cats their voice for as long as it took to arrive.
   */
  void loadSamples()
    .then(() =>
      startSoundtrack(context, bus, {
        onTrack: (track) => {
          playingTrack = track;
          onTrack?.(track);
        },
      }),
    )
    .then((track) => {
      music = track;
      // Whatever was decided while the files were loading — a mute, or the
      // walkthrough finishing — still has to win.
      syncMusic();
    })
    // `loadSamples` swallows its own failures, so this cannot fire today. It is
    // here so that a future edit which lets it throw loses the *cats* rather
    // than silently taking the soundtrack down with them.
    .catch(() => {});
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
  // See `UI_GAIN`: the balance between these sounds is right, the group level
  // was not.
  const level = gain * UI_GAIN;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  osc.detune.value = detune;
  if (glideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(glideTo, start + duration);
  }

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(level, start + attack);
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
 * fine — the café is simply quiet, which since 2026-09-02 is what a missing
 * file means. Nothing synthesised stands in any more; see the file header.
 *
 * **AAC in `.m4a`, not MP3 or Ogg.** Ogg Vorbis is the format most CC0 audio
 * arrives in and Safari does not decode it, so it would have worked in every
 * browser used to develop this and in none of the app. AAC is the codec iOS
 * decodes in hardware.
 */
export const SAMPLE_PATHS: Record<string, string[]> = {
  // Two purrs, one busier than the other — `playSample` picks per tap, so
  // petting the same cat twice does not play the identical two seconds back.
  purr: ["/audio/purr-1.m4a", "/audio/purr-2.m4a"],
  meow: ["/audio/meow-1.m4a", "/audio/meow-2.m4a", "/audio/meow-3.m4a"],
  // Empty on purpose: there is no CC0 recording of a cat trilling anywhere I
  // could find, and `playChirp` would rather borrow a real meow than play a
  // synthetic cat next to real ones. Drop files here if any turn up.
  chirp: [],
};

/** Decoded samples, keyed as above. Absent means "not loaded, or not there". */
const samples = new Map<string, AudioBuffer[]>();
let samplesRequested = false;

/**
 * Fetch and decode every sound the game names. Called once, after the context
 * exists.
 *
 * **Failures are logged, not swallowed.** They used to be — a bare `catch {}`
 * with a comment saying a missing file was fine — and that is precisely how a
 * phone with no cat sounds looked identical to a phone with no cat *files* for
 * four rounds of "I still can't hear anything". A silent café is a legitimate
 * state; a silent café that cannot say why is not. See `fetch-audio.ts`.
 *
 * Fetched in parallel now rather than one at a time: these are five small
 * files and the old sequential loop meant the last meow waited on the first
 * purr for no reason.
 */
async function loadSamples(): Promise<void> {
  if (samplesRequested || !ctx) return;
  samplesRequested = true;
  const context = ctx;
  await Promise.all(
    Object.entries(SAMPLE_PATHS).map(async ([name, paths]) => {
      const decoded = (
        await Promise.all(paths.map((path) => loadAudioBuffer(context, path)))
      ).filter((buffer): buffer is AudioBuffer => buffer !== null);
      if (decoded.length > 0) samples.set(name, decoded);
    }),
  );
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
 * Petting a cat.
 *
 * **Recording only.** There was a synthesised purr here, rebuilt three times —
 * a boomy wobble, a diesel engine, then *"heavy rain with reverb"* — and it
 * survived as a "fallback" long after real recordings landed, which is how
 * Ellis was still hearing it (2026-09-02: *"its still only using tyhe old
 * retarded purr … get rid of the old crap i can still hear"*). A fallback that
 * can be heard is not a safety net, it is a second implementation nobody
 * chose. If the file is missing the café is quiet, which is the better of the
 * two sounds.
 */
export function playPurr(): void {
  playSample("purr", 0.35);
}


/**
 * A meow. Recording only — see `playPurr` for why there is no longer a
 * synthesised one behind it.
 */
export function playMeow(): void {
  playSample("meow", 0.25);
}

/**
 * The pleased-to-see-you chirrup.
 *
 * **Borrows a meow**, because there is no CC0 recording of a cat trilling and
 * the alternative — a synthesised one — is the thing this file just stopped
 * doing. Losing the distinction between "hello" and "feed me" costs less than
 * one synthetic cat among real ones. Drop `chirp-1.m4a` in and it is used.
 */
export function playChirp(): void {
  if (playSample("chirp", 0.25)) return;
  playSample("meow", 0.25);
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
