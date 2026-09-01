# Audio that ships

Everything else in the game is synthesised (§10). These are the exception, and
`src/audio/audio.ts` explains why in one line: a cat is a vocal tract, and a
real recording settles an argument three rebuilds of a synthesised purr could
not. The soundtrack is here for a plainer reason — Ellis wrote/sourced one.

    locklane.m4a   the soundtrack. 71.111s, loops seamlessly.
    purr-1.m4a     busier purr  ┐ one picked per tap, so petting the same cat
    purr-2.m4a     sleepier purr┘ twice does not replay the same two seconds
    meow-1.m4a     ┐
    meow-2.m4a     ├ one picked per meow
    meow-3.m4a     ┘

Loaded lazily after the first tap. **A missing file is silently fine** — the
synthesis in `src/audio/cat.ts` and `src/audio/music.ts` stands in — so
deleting any of these is safe and the café will still have cats and music.

## AAC, not MP3 and definitely not Ogg

**Safari does not decode Ogg Vorbis**, which is the format most freely-licensed
audio arrives in. An `.ogg` here would work in every browser used to develop
this game and in none of the app it ships as. AAC in an `.m4a` is what iOS
decodes in hardware. `afconvert` (built into macOS) reads Ogg, FLAC and WAV and
writes AAC, so no extra tooling is needed:

    afconvert -f WAVE -d LEI16@44100 -c 1 in.flac tmp.wav   # canonicalise first
    afconvert -f m4af -d aac -b 80000 -s 3 tmp.wav out.m4a

Canonicalising to mono 16-bit *first* is worth the extra step: the sources
arrive as 24-bit, stereo, FLAC and assorted sample rates, and going straight to
AAC hides which of those you ended up with.

## Where these came from

**Sources are recorded here because the licence has to be traceable — this
ships inside the `.ipa`.** Ellis supplied all of them (`sound/` in the repo
root, which is the untouched originals).

| shipped | source file | origin |
|---|---|---|
| `locklane.m4a` | `sound/ost/locklane.m4a` | Ellis — unchanged, not re-encoded |
| `purr-1.m4a` | `sound/fx/cat_purractive_loop.wav` | Ellis — no attribution in the filename |
| `purr-2.m4a` | `sound/fx/cat_purrsleepy_loop.wav` | Ellis — no attribution in the filename |
| `meow-1.m4a` | `sound/fx/412017__skymary__cat-meow-short.wav` | Freesound #412017, *skymary* |
| `meow-2.m4a` | `sound/fx/436541__mafon2__cat-meow.wav` | Freesound #436541, *mafon2* |
| `meow-3.m4a` | `sound/fx/689324__sadiquecat__cat-meow.flac` | Freesound #689324, *sadiquecat* |

> ⚠️ **The licences on these have not been verified in-repo.** The Wikimedia set
> they replaced was checked file by file (CC0 / public domain, no attribution
> owed). These came from Ellis and Freesound needs an account to read licence
> metadata, so nothing here confirms them. Freesound carries CC0, CC-BY and
> CC-BY-NC side by side — **CC-BY needs a credit screen and CC-BY-NC cannot ship
> in a paid or ad-supported app at all** — so the three IDs above want checking
> before submission, and the two purrs want whatever pack they came from
> naming. The IDs are preserved above precisely so that is a two-minute job.

`sound/fx/dont use/` is left alone, as labelled.

## If you replace any of them

Keep them **mono**, meows under about 1.2 s, purrs 2–3 s, and normalise the
peak to around **0.7**. The game applies its own gain on top (0.85 for a meow,
0.9 for the purr) and then a 0.3 master, so a file mastered loud will jump out
at whoever is holding the phone.

The purrs were cut from 8.3 s and 5.7 s loops down to ~2.4 s. Both are real
~27 Hz pulse trains, so they were cut at a **whole number of pulses** (67 and
63) and on the stretch with the loudest quiet moment, which is what keeps a
clip off the breath gaps a purring cat leaves. `tools/render-audio.mjs` is how
to hear the result.
