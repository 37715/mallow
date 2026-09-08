/**
 * The soundtrack, as data.
 *
 * **One list, read by three things**: `audio/soundtrack.ts` plays it,
 * `ui/now-playing.ts` names the piece when it starts, and `data/credits.ts`
 * credits whoever wrote it. A second copy of "who made this" is a copy that
 * goes wrong the first time a track is added — which is exactly what happened
 * to `SEAT_STAND_POSITIONS` (§14).
 */

export interface Track {
  /** File under `public/audio/`. */
  file: string;
  title: string;
  artist: string;
  /**
   * Level trim, so the four pieces sit at the same loudness.
   *
   * **Measured, not judged.** The tracks were mastered separately and their
   * levels are a third apart: rms 0.0586 for *lock lane* against 0.0847 for
   * *sometimes i forget you're gone*, which at a shared gain is 1.45× and very
   * audible as the soundtrack jumping when it changes piece. Each trim is
   * `lockLaneRms / thisTrackRms`, with *lock lane* as the reference because
   * `TRACK_GAIN` was tuned against it and approved.
   *
   * Re-measure if a track is replaced — `tools/render-audio.mjs` renders the
   * real mix, and §10's rule is that levels cannot be reasoned about.
   */
  trim: number;
  /**
   * Seconds of overlap when the piece repeats.
   *
   * **Not every track is a loop, and it matters.** Measured head-against-tail:
   * *lock lane* was written to loop and its first second is 0.8× its last, so
   * the repeat can be butt-joined and is inaudible. The other three are pieces
   * with *endings* — *sometimes i forget you're gone* decays to near silence
   * and its opening is **8.6×** the level it finished on, so a hard loop is a
   * slam. A few seconds of overlap turns that into the piece dissolving into
   * its own beginning, which is what a DJ would do with it.
   *
   * Zero means "this genuinely loops, join it end to end".
   */
  crossfade: number;
}

/**
 * How long a stretch of music should last before the café goes quiet again.
 *
 * The repeat count per track is *derived* from this rather than written down,
 * so a 27-second interlude and a 71-second piece both play for about the same
 * time and the rhythm of music-then-quiet does not change with the track.
 * Ellis, 2026-09-08: *"loop the lily M ones a few times to increase length."*
 *
 * **85, down from 150** (2026-09-08). At 150 this divided into `interlude-1`
 * six times, so "a few" came out as two and a half minutes of the same
 * twenty-eight seconds — which is what Ellis heard as one very long song. It is
 * a repeat count, so it rounds coarsely on a short track and the difference
 * between 3 and 6 passes is a whole minute of listening; the number is
 * therefore set by what the shortest track does with it, not by what feels like
 * a nice length in the abstract.
 *
 * With the rest down to five seconds, variety comes from the *next* piece
 * rather than from the current one going round again, so this can afford to be
 * short. It still loops each interlude three or four times, which is what was
 * asked for.
 */
export const TARGET_SESSION_S = 85;

/**
 * How fast the pieces are played back. Below 1 is slower.
 *
 * Ellis, 2026-09-08: *"i also want to slow down all the music - feels like its
 * all going too fast."*
 *
 * **This moves the pitch as well as the tempo, and there is no way around it.**
 * WebAudio's `playbackRate` is a resampler, not a time-stretcher — it is a tape
 * machine, so 0.88 is 12% slower *and* about two semitones flat. That happens
 * to suit this soundtrack (it is the "slowed" edit people make of exactly this
 * kind of music, and a lower, softer piece is more cosy, not less), but it is a
 * real musical change rather than a neutral one, and it is why the number is
 * gentle. If it ever needs to be slower than about 0.8 the honest answer is to
 * ask Lily M and Ellis for slower renders, not to push this further.
 *
 * **Everything scheduled in `soundtrack.ts` is wall-clock and has to be divided
 * by this.** A buffer's `duration` is how long it is at rate 1; at 0.88 it
 * occupies `duration / 0.88` seconds of café. Getting that wrong would not
 * throw — it would quietly make the crossfades land in the wrong place and the
 * fade-out miss the end of the piece.
 */
export const PLAYBACK_RATE = 0.88;

/** How many times through a track fills a session. Always at least once. */
export function passesFor(track: Track, duration: number): number {
  const step = Math.max(1, duration - track.crossfade);
  return Math.max(1, Math.round((TARGET_SESSION_S - track.crossfade) / step));
}

export const TRACKS: Track[] = [
  { file: "lock-lane.m4a", title: "lock lane", artist: "Ellis", trim: 1, crossfade: 0 },
  { file: "interlude-1.m4a", title: "interlude 1", artist: "Lily M", trim: 0.82, crossfade: 3 },
  { file: "interlude-2.m4a", title: "interlude 2", artist: "Lily M", trim: 0.74, crossfade: 3 },
  {
    file: "sometimes-i-forget-youre-gone.m4a",
    title: "sometimes i forget you're gone",
    artist: "Lily M",
    trim: 0.69,
    crossfade: 3.5,
  },
];
