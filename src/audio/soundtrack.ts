import { loadAudioBuffer } from "@/audio/fetch-audio";

/**
 * A running soundtrack, as far as the rest of the game is concerned.
 *
 * Lived in `audio/music.ts` until 2026-09-02, alongside a generator that wrote
 * its own chords. That generator is deleted — see this file's header.
 */
export interface MusicHandle {
  /**
   * Follow the music switch. **Stops scheduling rather than just ducking the
   * gain**: a silenced café should not be decoding a 2.4 MB track for nobody,
   * and the piece restarts from the top anyway, so there is no position to
   * lose.
   */
  setPlaying(on: boolean): void;
  stop(): void;
}

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
 * **There is no synthesised fallback any more.** There was one — `music.ts`
 * generated a chord progression, a bass and a melody, and it was genuinely
 * nice work — but it kept *playing*, underneath this, and Ellis could hear it
 * (2026-09-02: *"the old soundtrack too … get rid of the old crap i can still
 * hear"*). A fallback that can be heard is not a safety net, it is a second
 * implementation nobody chose. It is in the history if it is ever wanted; the
 * café is quiet without a file, which is the better of the two sounds.
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
 * **Above 1, because the file is quiet.** `locklane.m4a` peaks at 0.327 —
 * about −10 dBFS — so at unity it can only ever be background no matter what
 * the master does. Ellis, 2026-09-05: *"everything other than the meow is way
 * too quiet. all sfx, the ost."* At 1.45 it peaks around 0.40 after the master,
 * which is a real music level with room left for a cat on top of it.
 *
 * Re-check with `node tools/render-audio.mjs cafe 200 out.wav` after touching
 * this — §10's standing rule is that levels cannot be reasoned about, and that
 * tool now renders through the same master gain and limiter the game uses.
 */
const TRACK_GAIN = 1.45;

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
/**
 * A raised-cosine ramp between two gains — smooth at both ends.
 *
 * 96 points over a fade of a few seconds is one value every ~125 ms, which
 * WebAudio interpolates between; far finer than the ear can resolve on a
 * change this slow.
 */
function fadeCurve(from: number, to: number, points = 96): Float32Array {
  const curve = new Float32Array(points);
  for (let i = 0; i < points; i++) {
    const x = i / (points - 1);
    curve[i] = from + (to - from) * (0.5 - 0.5 * Math.cos(Math.PI * x));
  }
  return curve;
}

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

export interface SoundtrackOptions {
  /**
   * Schedule this many seconds of the cycle up front and run no timers.
   *
   * An escape hatch for the render tool, and it is needed because an
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
 * Null means there is no track to play and the café stays quiet. It is not an
 * error — a build with an empty `public/audio/` is a valid build — but it is
 * no longer a *fallback*: nothing synthesised takes over. See the header.
 */
export async function startSoundtrack(
  ctx: BaseAudioContext,
  destination: AudioNode,
  options: SoundtrackOptions = {},
): Promise<MusicHandle | null> {
  const loaded = await Promise.all(TRACK_PATHS.map((path) => loadAudioBuffer(ctx, path)));
  const tracks = loaded.filter((buffer): buffer is AudioBuffer => buffer !== null);
  if (tracks.length === 0) return null;

  const gain = ctx.createGain();
  gain.gain.value = 0.0001;
  gain.connect(destination);

  /**
   * **Starts stopped.** The caller turns it on, because "when may music play"
   * is a game question rather than an audio one — Ellis, 2026-09-05: *"only
   * fade in AFTER the tutorial just finishes."* Mal talks over a speech bubble
   * with the text typing out, and a soundtrack rising underneath that is one
   * thing too many in the first two minutes of the game.
   */
  let playing = false;
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

    /**
     * **An S-curve, not an exponential ramp**, and over twelve seconds the
     * difference is the whole feature.
     *
     * An exponential ramp is linear in *decibels*, so from a near-silent floor
     * it spends most of its length inaudible and then rushes in over the last
     * few seconds — the opposite of gradual, and precisely what "more gradual
     * fadein" was asking to fix. A raised cosine spreads the movement evenly
     * across the whole twelve seconds and is smooth at both ends, so there is
     * no moment where the music can be said to have started.
     *
     * It also gets to touch zero, which an exponential ramp cannot.
     */
    gain.gain.setValueCurveAtTime(fadeCurve(0, TRACK_GAIN), at, FADE_IN);
    // **Timed so the fade lands on the end of the last pass**, not somewhere in
    // the middle of a bar: the piece gets to finish before the café goes quiet.
    gain.gain.setValueAtTime(TRACK_GAIN, at + FADE_IN);
    gain.gain.setValueCurveAtTime(fadeCurve(TRACK_GAIN, 0), at + span - FADE_OUT, FADE_OUT);

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

  return {
    setPlaying(on) {
      if (on === playing) return;
      playing = on;
      if (on) {
        // **A beat of quiet first, every time.** Straight in on the same tap
        // that finished the tutorial would make the music feel like a reward
        // screen; a few seconds of café, then twelve seconds of fade, and it
        // arrives without ever announcing itself. Back at the top of the piece
        // rather than half way through one.
        timer = window.setTimeout(play, INTRO_DELAY * 1000);
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
