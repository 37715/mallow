# Recorded sounds

Drop audio files here and the game uses them instead of the synthesised
versions. Nothing is required — a missing file is silently fine and the
synthesised fallback plays (see `src/audio/audio.ts`).

    purr.mp3      a cat purring. Replaces the synthesised purr entirely.
    meow-1.mp3    a meow. Add -2 and -3 as well; one is picked at random.
    meow-2.mp3
    meow-3.mp3

`.ogg` works too for the purr.

**Licensing matters — this ships inside the .ipa.** Use CC0 / public-domain
recordings only. Freesound (filter to CC0) and Pixabay both have usable cat
recordings. Keep each file short (a purr under ~2s, a meow under ~1s) and
mono; they are decoded into memory on first tap.

Why files at all, when §10 says everything is synthesised: the purr was built
three times and never sounded like an animal — "a boomy wobble", then "a diesel
engine", then "heavy rain with reverb". A purr is a vocal tract, and filtered
noise is not going to become one. The rule §10 was protecting — don't block
first paint on a download, don't inherit licensing questions — still holds:
these load lazily in the background and we choose what goes in here.
