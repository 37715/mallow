import type { MusicHandle } from "@/audio/music";

/**
 * The recorded soundtrack, and the quiet it leaves between plays.
 *
 * Ellis, 2026-09-01, handing over `locklane.m4a`: *"an ost that should loop
 * perfectly but it needs a nice little fade in from silence a few seconds
 * after logging in and maybe fade out again to silence for a little before
 * fading back in again."*
 *
 * **The rests are the design, not a nicety.** Continuous background music in a
 * game people leave running becomes wallpaper within ten minutes and an
 * irritant within thirty — it is the same argument §10 makes about the coin
 * chime and about why the generated music has no drums. Music that goes away
 * and comes back keeps arriving, and the moment it returns is the moment
 * somebody notices the café again. It also means one 71-second piece can carry
 * a whole session without ever being *the thing you are listening to*.
 *
 * This supersedes `audio/music.ts` when the file is present. That generator
 * stays as the fallback — the same arrangement the cats have, and for the same
 * reason: a real recording beats synthesis, and synthesis beats silence.
 */

/**
 * Tracks to choose from, one picked per play.
 *
 * An array for one file today because a second is then a one-line change, and
 * because "which track" wants to be a decision made per rest rather than once
 * at boot.
 */
export const TRACK_PATHS = ["/audio/locklane.m4a"];

/**
 * The breathing cycle, in seconds. Exported so a test can hold the shape of it
 * — these are four numbers that have to stay in a sensible relationship to each
 * other and to the length of a track, and nothing else would notice if they
 * did not.
 */
export const CYCLE = {
  /** Silence after the audio wakes before the first note. */
  introDelay: 4,
  /** How long the music takes to arrive… */
  fadeIn: 5,
  /** …and to leave. */
  fadeOut: 7,
  /** Silence between plays. */
  rest: 45,
} as const;

const INTRO_DELAY = CYCLE.introDelay;
const FADE_IN = CYCLE.fadeIn;
const FADE_OUT = CYCLE.fadeOut;
/**
 * How many times through the piece before it rests.
 *
 * Two, so a rest is something that happens every few minutes rather than every
 * verse. At 71 seconds that is a hair under two and a half minutes of music
 * against three quarters of a minute of café — present most of the time,
 * absent often enough to be missed.
 */
const PASSES = 2;
const REST = CYCLE.rest;

/**
 * Level, relative to the file.
 *
 * **Measured against the generator it replaces, not chosen.** The track is
 * mastered a good deal hotter than `audio/music.ts` renders (rms 0.059 against
 * 0.024), and dropping a commercial master straight into a mix balanced around
 * synthesised parts is how the coin chimes end up inaudible. Re-check with
 * `node tools/render-audio.mjs cafe 60 out.wav` after touching this — §10's
 * standing rule is that levels cannot be reasoned about.
 */
const TRACK_GAIN = 0.62;

/**
 * Where real audio starts in the decoded buffer, in seconds.
 *
 * **Not a fudge for a badly cut file.** An AAC stream carries encoder priming
 * — `locklane.m4a` declares 1024 frames of it and 517 of padding — and whether
 * a decoder strips that is up to the decoder. Chrome and WebKit both honour
 * the gapless metadata, which is why the file decodes to exactly its 71.111s;
 * but a decoder that did not would leave 23 ms of silence at the head of every
 * repeat, which is a stutter at the loop point and would be blamed on the
 * music. Measuring the buffer costs nothing and is true either way.
 *
 * Deliberately only applied to the *loop* point: the first pass plays from
 * zero, so a track that genuinely opens on a soft swell keeps it.
 */
function contentStart(buffer: AudioBuffer): number {
  const data = buffer.getChannelData(0);
  // −60 dB. Anything under this is either padding or an attack too quiet to
  // hear, and losing a few milliseconds of the latter costs nothing.
  const floor = 0.001;
  const limit = Math.min(data.length, buffer.sampleRate); // never skip past 1s
  let at = 0;
  while (at < limit && Math.abs(data[at]) < floor) at++;
  return at / buffer.sampleRate;
}

async function loadTrack(ctx: BaseAudioContext, path: string): Promise<AudioBuffer | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) return null;
    return await ctx.decodeAudioData(await response.arrayBuffer());
  } catch {
    // No file, or not decodable. `audio.ts` falls back to the generator.
    return null;
  }
}

export interface SoundtrackOptions {
  /**
   * Schedule this many seconds of the cycle up front and run no timers.
   *
   * Same escape hatch `startMusic` has and for the same reason: an
   * `OfflineAudioContext` renders faster than real time and its clock only
   * advances *during* the render, so anything driven by `setTimeout` produces
   * one play and then nothing. This is what lets
   * `node tools/render-audio.mjs cafe` bounce the real fades to a file — and
   * §10 is emphatic that audio levels cannot be reasoned about, only heard.
   */
  offlineSeconds?: number;
}

/**
 * Start the recorded soundtrack, or return null if there isn't one.
 *
 * Null is the signal to fall back to `startMusic` — it is not an error, and a
 * café with no `public/audio/*.m4a` has to sound exactly as it did before
 * these files existed.
 */
export async function startSoundtrack(
  ctx: BaseAudioContext,
  destination: AudioNode,
  options: SoundtrackOptions = {},
): Promise<MusicHandle | null> {
  const tracks: AudioBuffer[] = [];
  for (const path of TRACK_PATHS) {
    const buffer = await loadTrack(ctx, path);
    if (buffer) tracks.push(buffer);
  }
  if (tracks.length === 0) return null;

  const gain = ctx.createGain();
  gain.gain.value = 0.0001;
  gain.connect(destination);

  let playing = true;
  let source: AudioBufferSourceNode | null = null;
  let timer: number | null = null;

  function stopSource(): void {
    if (!source) return;
    try {
      source.stop();
    } catch {
      // Already stopped; `stop` throws rather than no-opping.
    }
    source.disconnect();
    source = null;
  }

  /** One play-through-and-fade, starting at `at` on the context clock. */
  function schedule(at: number): number {
    const buffer = tracks[Math.floor(Math.random() * tracks.length)];
    const head = contentStart(buffer);

    /**
     * A fresh node per play, because an `AudioBufferSourceNode` can only be
     * started once — and because coming back **at the top of the piece** is
     * the musical choice. Ducking a permanently-looping node would resume
     * wherever the rest happened to land, so the same middle eight would
     * fade in every time.
     */
    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.loop = true;
    // The repeat skips the head; the first pass does not. See `contentStart`.
    node.loopStart = head;
    node.loopEnd = buffer.duration;
    node.connect(gain);
    source = node;

    // The first pass is the whole file; every repeat is the file minus its head.
    const span = buffer.duration + (buffer.duration - head) * (PASSES - 1);

    // Exponential ramps, which is how a fade sounds even rather than sudden at
    // one end — and they can never touch zero, hence the floor.
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(TRACK_GAIN, at + FADE_IN);
    // **Timed so the fade lands on the end of the last pass**, not somewhere in
    // the middle of a bar: the piece gets to finish before the café goes quiet.
    gain.gain.setValueAtTime(TRACK_GAIN, at + Math.max(FADE_IN, span - FADE_OUT));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + span);

    node.start(at);
    node.stop(at + span + 0.1);
    return span;
  }

  function play(): void {
    if (!playing) return;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    const span = schedule(ctx.currentTime);
    timer = window.setTimeout(play, (span + REST) * 1000);
  }

  if (options.offlineSeconds !== undefined) {
    let at = INTRO_DELAY;
    while (at < options.offlineSeconds) at += schedule(at) + REST;
    return { setPlaying: () => {}, stop: () => {} };
  }

  timer = window.setTimeout(play, INTRO_DELAY * 1000);

  return {
    setPlaying(on) {
      if (on === playing) return;
      playing = on;
      if (on) {
        // Back at the top of a piece rather than half way through one.
        play();
      } else {
        if (timer !== null) window.clearTimeout(timer);
        timer = null;
        stopSource();
      }
    },
    stop() {
      playing = false;
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
      stopSource();
    },
  };
}
