import { loadAudioBuffer } from "@/audio/fetch-audio";
import { PLAYBACK_RATE, TRACKS, passesFor, type Track } from "@/data/tracks";

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
 * **It is a playlist, not a breathing cycle** — changed 2026-09-08. This used
 * to rest 45 seconds between pieces, on the argument that music which goes away
 * and comes back keeps arriving where continuous music becomes wallpaper. The
 * argument was fine and the numbers were wrong, in a way only a listener could
 * find. Ellis: *"i finished listening to the first song … and then it
 * eventually ended but another song never came on."*
 *
 * What he actually sat through: `interlude-1` is 27.9 seconds, and a
 * 150-second session meant it played **six times**, so the "first song" ran two
 * and a half minutes — then went quiet for another forty-five. Nothing was
 * broken. A gap that long simply is not read as a gap; it is read as the music
 * having finished. **A rest is only a rest if the listener is still expecting
 * something.** Five seconds is, forty-five is not.
 *
 * So the rest is five seconds and the sessions are shorter, which moves where
 * variety comes from: from one piece repeating for a long time, to the pieces
 * following each other. That is the better trade with four tracks in the
 * catalogue — six passes of a 28-second interlude was always going to wear out
 * faster than four different pieces do.
 *
 * **There is no synthesised fallback any more.** There was one — `music.ts`
 * generated a chord progression, a bass and a melody, and it was genuinely
 * nice work — but it kept *playing*, underneath this, and Ellis could hear it
 * (2026-09-02: *"the old soundtrack too … get rid of the old crap i can still
 * hear"*). A fallback that can be heard is not a safety net, it is a second
 * implementation nobody chose. It is in the history if it is ever wanted; the
 * café is quiet without a file, which is the better of the two sounds.
 */

/** Where the files live. The catalogue itself is `data/tracks.ts`. */
export const TRACK_PATHS = TRACKS.map((track) => `/audio/${track.file}`);

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
  /**
   * …and to leave.
   *
   * Longer than the ear expects, deliberately. Ellis, 2026-09-08: *"ensure all
   * of them fade in and out super peacefully and gradually."* A fade you can
   * point at the end of is a fade that ended.
   *
   * **Eight, not twelve, now the rest is five.** A fade-out is inaudible for
   * its last third or so, so the silence a listener actually experiences is
   * roughly `fadeOut/3 + rest + fadeIn/3` — twelve and forty-five made that
   * about a minute. These three numbers only mean anything together; move one
   * and re-add them.
   */
  fadeOut: 8,
  /**
   * Silence between pieces.
   *
   * Ellis, 2026-09-08: *"i want the next one to come on after like 5 seconds."*
   * See the header for what forty-five actually sounded like.
   */
  rest: 5,
} as const;

const INTRO_DELAY = CYCLE.introDelay;
const FADE_IN = CYCLE.fadeIn;
const FADE_OUT = CYCLE.fadeOut;
const REST = CYCLE.rest;

/**
 * How often the playlist checks whether anything is due.
 *
 * Half a second: fine enough that the rest between pieces is accurate to well
 * inside what anybody could hear, and cheap enough to be beneath notice — it is
 * two comparisons and a clock read. The point is not precision, it is that
 * losing one tick costs half a second rather than the rest of the session.
 */
const TICK_MS = 500;

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

/** A decoded track, with the catalogue entry that describes how to play it. */
interface LoadedTrack {
  track: Track;
  buffer: AudioBuffer;
  /** Where real audio starts, past any decoder padding. See `contentStart`. */
  head: number;
}

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
   * Told when a piece begins, so the interface can name it.
   *
   * Ellis, 2026-09-08: *"have a little player icon show briefly when a new
   * track comes on showing the name."* The soundtrack knows what it started
   * and nothing else does — deriving it anywhere else would mean a second copy
   * of the schedule.
   */
  onTrack?: (track: Track) => void;
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
  const loaded = await Promise.all(
    TRACKS.map(async (track) => {
      const buffer = await loadAudioBuffer(ctx, `/audio/${track.file}`);
      return buffer ? { track, buffer, head: contentStart(buffer) } : null;
    }),
  );
  const tracks = loaded.filter((entry): entry is LoadedTrack => entry !== null);
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
  let live: AudioBufferSourceNode[] = [];
  /**
   * The repeating check that keeps the playlist moving. **Not one long timer.**
   *
   * Each session used to arm a single `setTimeout` for its own length plus the
   * rest — eighty-odd seconds — and if that one callback did not arrive, the
   * music stopped for good, because the only thing that would ever schedule the
   * next piece was the callback itself. That is a single point of failure with
   * no way back, and it matches the one symptom reported twice: the first song
   * plays, and nothing ever follows it.
   *
   * A short repeating check cannot be lost the same way, and because it asks the
   * **audio clock** rather than counting wall-clock milliseconds, it is also
   * immune to the two drifting apart — which on iOS they do, every time the
   * context is interrupted.
   */
  let ticker: number | null = null;
  /**
   * When the next session is due, on the **wall clock**, in `performance.now()`
   * milliseconds.
   *
   * **Not the audio clock**, and that distinction is the whole of a bug found
   * while writing this. A suspended `AudioContext` freezes `currentTime` — it
   * is a clock made of samples, and a stopped context produces none — so a
   * scheduler that waits for the audio clock to reach a number waits for ever
   * on any platform that suspends the context, which is exactly the platform
   * this is being fixed for. The wall clock keeps running regardless, the work
   * gets scheduled, and it comes out of the speakers as soon as the context is
   * awake again.
   */
  let nextPlayAt = 0;
  /** The last piece played, so a shuffle never repeats one back to back. */
  let previous: LoadedTrack | null = null;

  function stopSources(): void {
    for (const node of live) {
      try {
        node.stop();
      } catch {
        // Already stopped; `stop` throws rather than no-opping.
      }
      node.disconnect();
    }
    live = [];
  }

  /** The next piece: anything but the one just played, while there is a choice. */
  function pick(): LoadedTrack {
    const options = tracks.length > 1 ? tracks.filter((t) => t !== previous) : tracks;
    const chosen = options[Math.floor(Math.random() * options.length)];
    previous = chosen;
    return chosen;
  }

  /**
   * One session: a piece, repeated enough times to fill `TARGET_SESSION_S`,
   * fading in at the start and out at the end.
   *
   * **Repeats are separate overlapping sources, not `node.loop`.** Only *lock
   * lane* was written to loop; the other three are pieces with endings, and
   * measured head-against-tail the worst of them opens **8.6×** louder than it
   * finished — a hard loop there is a slam. Scheduling each repeat to start
   * `crossfade` seconds before the previous one ends, with the outgoing copy
   * fading down as the incoming one fades up, turns that into the piece
   * dissolving into its own beginning. A `crossfade` of 0 butts them end to
   * end, which is exactly `loop` for a track that genuinely loops.
   */
  function schedule(at: number): number {
    const { track, buffer, head } = pick();
    /**
     * **Wall-clock, not buffer seconds.** `PLAYBACK_RATE` slows the music down
     * (Ellis: *"feels like its all going too fast"*), so a buffer that is
     * `duration` long occupies `duration / rate` seconds of café. Every number
     * below that schedules something — steps, spans, fades — is in café
     * seconds; only `offset`, which indexes into the buffer, is not.
     */
    const dur = buffer.duration / PLAYBACK_RATE;
    const headTime = head / PLAYBACK_RATE;
    const passes = passesFor(track, dur);
    const overlap = Math.min(track.crossfade, dur / 2);
    // Each repeat after the first starts `overlap` early and skips the decoder
    // padding at its head, so the span is not simply passes × duration.
    const step = dur - overlap - headTime;
    const span = dur + step * (passes - 1);

    for (let pass = 0; pass < passes; pass++) {
      const node = ctx.createBufferSource();
      node.buffer = buffer;
      node.playbackRate.value = PLAYBACK_RATE;
      const startAt = at + step * pass;
      // The first pass plays from the top; every repeat skips the padding.
      // In *buffer* seconds — `start`'s offset indexes the buffer, not the
      // timeline, so this one is deliberately not divided by the rate.
      const offset = pass === 0 ? 0 : head;
      const length = pass === 0 ? dur : dur - headTime;

      if (overlap > 0 && passes > 1) {
        // Its own gain, so the crossfade is independent of the session fade.
        const voice = ctx.createGain();
        voice.gain.value = 1;
        if (pass > 0) {
          voice.gain.setValueCurveAtTime(fadeCurve(0, 1), startAt, overlap);
        }
        if (pass < passes - 1) {
          voice.gain.setValueAtTime(1, startAt + length - overlap);
          voice.gain.setValueCurveAtTime(fadeCurve(1, 0), startAt + length - overlap, overlap);
        }
        node.connect(voice).connect(gain);
      } else {
        node.connect(gain);
      }

      node.start(startAt, offset);
      node.stop(startAt + length + 0.05);
      live.push(node);
    }

    /**
     * **An S-curve, not an exponential ramp**, and over twelve seconds the
     * difference is the whole feature.
     *
     * An exponential ramp is linear in *decibels*, so from a near-silent floor
     * it spends most of its length inaudible and then rushes in over the last
     * few seconds — the opposite of gradual, and precisely what "more gradual
     * fadein" was asking to fix. A raised cosine spreads the movement evenly
     * and is smooth at both ends, so there is no moment where the music can be
     * said to have started. It also gets to touch zero, which an exponential
     * ramp cannot.
     */
    // Per-track trim, so a change of piece is not a change of volume — see
    // `Track.trim`.
    const level = TRACK_GAIN * track.trim;
    gain.gain.setValueCurveAtTime(fadeCurve(0, level), at, FADE_IN);
    // **Timed so the fade lands on the end of the last pass**, not somewhere in
    // the middle of a bar: the piece gets to finish before the café goes quiet.
    gain.gain.setValueAtTime(level, at + FADE_IN);
    gain.gain.setValueCurveAtTime(fadeCurve(level, 0), at + span - FADE_OUT, FADE_OUT);

    // Announced as it starts rather than when it was scheduled, so the chip
    // and the first note arrive together.
    if (options.onTrack) {
      const delay = Math.max(0, (at - ctx.currentTime) * 1000);
      window.setTimeout(() => options.onTrack?.(track), delay);
    }
    return span;
  }

  function play(): void {
    if (!playing) return;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    stopSources();
    const span = schedule(ctx.currentTime);
    nextPlayAt = performance.now() + (span + REST) * 1000;
  }

  /**
   * Is anything due, and is the context even awake?
   *
   * **The resume is the important half.** `ctx.resume()` is only otherwise
   * called from `initAudio`, i.e. from a tap — so a context that iOS suspends
   * while the player is doing nothing but listening is never revived, and the
   * café goes quiet until they happen to touch the screen. Between pieces there
   * is a rest with no source playing, which is exactly the moment a platform
   * decides nothing is going on.
   */
  function tick(): void {
    if (!playing) return;
    // `BaseAudioContext` has no `resume` in the types; an `OfflineAudioContext`
    // has neither, and must not be poked at either way.
    const context = ctx as { state?: string; resume?: () => Promise<void> };
    if (context.state === "suspended" || context.state === "interrupted") {
      void context.resume?.().catch(() => {});
    }
    if (performance.now() >= nextPlayAt) play();
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
        // screen; a few seconds of café, then the fade, and it arrives without
        // ever announcing itself. Back at the top of the piece rather than half
        // way through one.
        nextPlayAt = performance.now() + INTRO_DELAY * 1000;
        if (ticker === null) ticker = window.setInterval(tick, TICK_MS);
      } else {
        if (ticker !== null) window.clearInterval(ticker);
        ticker = null;
        stopSources();
      }
    },
    stop() {
      playing = false;
      if (ticker !== null) window.clearInterval(ticker);
      ticker = null;
      stopSources();
    },
  };
}
