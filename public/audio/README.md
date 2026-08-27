# Recorded sounds

The cats are **real recordings**. Everything else in the game is synthesised
(§10); these are the exception, and `src/audio/audio.ts` explains why in one
line: a cat is a vocal tract, and eleven seconds of a real one settles an
argument three rebuilds of a synthesised purr could not.

    purr.m4a      2.4s
    meow-1.m4a    …through meow-6.m4a; one is picked at random per meow

The loader (`SAMPLE_PATHS` in `src/audio/audio.ts`) fetches these lazily after
the first tap. **A missing file is silently fine** — the synthesised versions in
`src/audio/cat.ts` stand in — so removing one is a safe thing to do.

## AAC, not MP3 and definitely not Ogg

**Safari does not decode Ogg Vorbis**, which is the format most freely-licensed
audio arrives in. An `.ogg` here would work in every browser used to develop
this game and in none of the app it ships as. AAC in an `.m4a` is what iOS
decodes in hardware. `afconvert` (built into macOS) both reads Ogg and writes
AAC, so no extra tooling is needed:

    afconvert -f WAVE -d LEI16 in.ogg tmp.wav
    afconvert -f m4af -d aac -b 64000 -s 3 tmp.wav out.m4a

## Provenance

Every file is **CC0 or public domain**, so nothing here needs an attribution
notice in the app. Recorded here anyway, because a licence you cannot trace is
a licence you do not have. All from Wikimedia Commons.

| file | source | licence | author |
|---|---|---|---|
| `purr.m4a` | [Purr (10 sec loopable).ogg](https://commons.wikimedia.org/wiki/File:Purr_(10_sec_loopable).ogg) | Public domain | Insanejeff |
| `meow-1,2,3,4.m4a` | [NoTrip.ogg](https://commons.wikimedia.org/wiki/File:NoTrip.ogg) | Public domain | Heismark |
| `meow-5.m4a` | [Meow of a Siamese cat - freemaster2.wav](https://commons.wikimedia.org/wiki/File:Meow_of_a_Siamese_cat_-_freemaster2.wav) | CC0 | freemaster2 |
| `meow-6.m4a` | [Maullido de gata hembra joven.ogg](https://commons.wikimedia.org/wiki/File:Maullido_de_gata_hembra_joven.ogg) | CC0 | George Miquilena |

`NoTrip.ogg` is eleven seconds containing seven separate meows; four of them
were cut out, trimmed, faded and normalised to the same peak. That is why four
of the six sound like the same cat — because they are.

## If you replace any of them

Keep them **mono**, keep the meows under about 1.2 s, and normalise the peak to
around **0.7**. The game applies its own gain on top (0.85 for a meow, 0.9 for
the purr) and then a 0.3 master, so a file mastered loud will jump out at
whoever is holding the phone. There is no CC0 recording of a cat *trilling*
anywhere I could find — if one turns up, drop it in as `chirp-1.m4a` and
`playChirp` will prefer it over borrowing a meow.
