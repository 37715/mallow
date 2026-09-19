# CLAUDE.md — Mallow

> Working title: **Mallow** (a cosy cat-café game). Swap the name here if it changes.

This file is the shared brain for the project. **Read it before starting work in this repo.** Keep it updated as decisions are made — if something here is out of date, fix it. §0 is the live status board: read it first, update it last. Sections 1–5 are the strategic grounding: the *why*, the *who*, the numbers we're accountable to, and the honest reality that keeps us from drifting. Sections 6+ are the *how*.

---

## 0. Current status — read this first, update it last

> **Standing rule for every session.** Start by reading this section to see what
> exists and what's next. **Finish by updating it** — move completed work into
> "Built", rewrite "Next up", and append a dated entry to
> [`docs/session-log.md`](docs/session-log.md), mirroring only the newest few
> here. Also update §15 milestone ticks and record any architectural or balance
> decision in the section it belongs to. A session that changed the game but not
> this file is not finished. Nobody should have to re-derive the state of the
> project by reading the whole codebase.
>
> **Keep this file lean.** It is read into context in full at the start of every
> session, so length is a running cost paid by every future session. A durable
> *rule* goes in its numbered section; the *story* goes in the archive. If §0
> starts growing past a screen or two of status, that is the signal to promote
> and prune again.

**Last updated:** 2026-09-19 (**the cat bed was the last thing in the shop
still charging on the button press** — money and xp now both land with the
furniture, on every path; a chair dragged out from under a guest gets them up
and walking instead of carrying them along; and the two upgrade cards have a
gap. Earlier: **the screenshot tool could not hear
audio, and had been confirming a soundtrack that was producing no sound at
all** — Chrome's autoplay policy left every context suspended with a frozen
clock; the playlist now runs off a repeating tick that also resumes a suspended
context, instead of one long timer nobody would notice going missing. Earlier:
**there is a way out of the walkthrough
at last** — `skip()` had been written and called from nowhere for weeks, and a
placement that lost a race with the room rebuild turned that gap into a game
you could not play; xp now lands with the furniture rather than with the button
press. Earlier: **the app stopped acting like a web page** — labels no longer highlight blue on a slipped tap, and panels no longer
rubber-band. Earlier: **"collect" was dead to a finger** — the
goals panel rebuilt its whole DOM on every store change, which is every frame,
so the button under your thumb was gone two frames later and no tap ever
became a click; and the now-playing chip was sitting *underneath* the panel
dim. Earlier: **the soundtrack is a playlist now** — the
rest between pieces was forty-five seconds and a 28-second interlude was played
six times, so the first track ran two and a half minutes and the gap after it
read as the music having finished; five seconds and shorter sessions, and the
now-playing chip reads its lead-in off the fade instead of a stale copy of it.
Earlier: **the navigation says what is inside
it** — `to do · cats · menu · room`, and the builder now *opens* the room panel
instead of being the eighth thing on it. Earlier: **the game says what to do
next** —
a twelve-rung goal ladder that pays out, never expires and ticks over while you
are away, which is the first real answer §0 has had to D7; and the menu became
visible, because guests now carry the drink they ordered rather than the sales
chart rolling dice at payment time. Earlier: **four tracks** — three by Lily M alongside
Ellis's *lock lane*, each looped enough to fill the same ~140-second session,
crossfaded because only one of them was written to loop, and level-matched
because they were mastered a third apart. A chip names the piece when it
starts, and settings has a credits screen. Earlier: **the game is loud** — the meow was the only
sound at the right level, so everything else came up to it, with a limiter to
keep it clean; the purr is half as long; and the soundtrack waits for the
walkthrough to end, then fades in over twelve seconds on a proper curve.
Earlier: **the recordings finally play in the app** — the
loaders rejected every file on `response.ok`, which is always false behind
Capacitor's custom URL scheme, so no `.m4a` had ever played on the phone.
`tools/webkit-probe.swift` is the tool that could see it. Earlier:
**the synthesised music and cats are deleted** —
they were still playing underneath the real recordings, which is what Ellis
could hear; and the 2.4 MB soundtrack no longer loads ahead of the 25 kB sound
effects, which is why cats were silent for the first few seconds. Earlier:
Ellis's own cat sounds and soundtrack ship — two purrs cut on the pulse, three
meows, and a real 71-second OST that fades in, plays twice through and rests.
Earlier still: **a chair may go in the corner now** — the
placement validator was refusing seats along a walking leg guests stopped using
in August, and letting a 25 cm cat bed veto a chair the way a counter does.
Earlier: **the cats are real recordings** —
seven CC0/public-domain files, 88 kB, with the synthesis kept as the fallback;
and the walkthrough starts the armchair by the window and the cat bed in the
middle of the floor, so the café looks arranged when Mal leaves. Earlier:
**the till is a thing on the counter**
— tap it to cash up, and each upgrade level puts a different till there; the
walkthrough teaches furniture before the custom drink and no longer says
"straight on the board"; the replay-the-tutorial setting is gone. Earlier:
**guests no longer spasm at the counter**
— a phase test read "on this leg and done" instead of "past this leg", so every
guest flipped between two routes twenty times a second and never sat down;
plus, earlier: **Mal is the guide again** — the anniversary
branch is deleted, not switched off; and the café **writes its own music**:
`audio/music.ts` generates a chord progression, a bass and a melody that never
repeats, and `audio/cat.ts` gives the cats a real meow and a chirrup by formant
synthesis. `tools/render-audio.mjs` is how any of it can be heard.)

**Previously:** 2026-08-26, later (**the save was deleting bought
furniture** — every copy of anything but a cat bed vanished on the next load,
now fixed and pinned; the **walkway rule measures the piece rather than a
circle round it** and is **drawn on the floor** while you place; furniture can
no longer be sunk into a wall, and the floor under the shelves and the menu
board is standable again; **the woodwork has colourways**, as tints, since the
pack ships those pieces in one finish.)

**Built and working:**
- **M1 — playable core loop** ✅ visitors arrive → sit → pay → money accrues.
- **M2 — the hook** ✅ rarity, gacha-lite adoption, naming, roster + cat-dex.
- **M3 (partial)** — idle/offline income ✅; save system with a real migration
  chain ✅; **café upgrades: expansion, décor, tips, service ✅**.
- **M4 (partial)** — **art direction locked ✅** (hero cat, flat-shaded style,
  warm lighting + tone mapping); **juice ✅** (living cats, tap-to-pet, coin
  floaters, dust motes); **audio ✅** (synthesised, no asset files).
- **Café asset pack integrated ✅** — Minty.kit "Cozy Cat Café" (CC0), 343
  objects on one shared atlas. Loader + asset gallery built; see §9.
- **Real customers ✅** (2026-08-01) — Minty.kit Cozy Character Pack, assembled
  per guest from hair/top/legs/held-prop slots, tinted garments, six skintones
  × sixteen hair colours, and the pack's own walk/sit/drink clips chosen by
  what they're sitting on. Draco decoder vendored for the packaged build.
- **Faces ✅** (2026-08-25) — the Lip Sync and Expressions pack (CC0) is merged
  onto the same rig, so everyone now has eyes that blink, a mouth that moves,
  ten named moods, and **a real `Social_WaveHello`** — the wave §0 spent months
  recording as "not in the pack". `entities/character-face.ts`; see §9.
- **Mal, and a real guided introduction ✅** (2026-08-25) — §0's long-parked
  "story-mode tutorial friend". She walks in after character creation and talks
  in a speech bubble with the text typing out, the mouth lip-syncing to it and
  a gesture per line — then **walks the player through buying a cat bed,
  adopting a cat, placing furniture and inventing a drink**, waiting at each
  step and topping the till up to exactly what that step costs
  (`systems/tutorial.ts`, pure and tested). **It arranges as it teaches**: the
  two pieces it has you buy start their ghost somewhere composed rather than
  under the camera — the armchair at its authored spot by the window, the bed
  in the middle of the open floor (`TUTORIAL_SPOTS`). A suggestion, not a lock,
  and scoped to the walkthrough, because outside it the ghost starting under
  your finger is something Ellis asked for explicitly and it still stands.
  No fail state. It runs **once** — the settings row that
  replayed it was removed on 2026-08-27 (Ellis: *"remove the option to watch
  tutorial repeatably"*), leaving `window.__mallow.replayTutorial` as the
  dev-only door §17 asks for. Script is data (`data/tutorial.ts`).
  **It survives a second run as of 2026-08-23** — every step is priced off the
  live curve *as this café would be charged* (the next add-in at £90, the next
  armchair as a copy), and the two steps that can be impossible rather than
  merely dear (a fifth blend, a flavour the shelf hasn't got) are talked past
  rather than waited on (`taskPossible`). A replay no longer clears
  `tutorialDone` — `startTutorial(force)` does that job — so a tour is never
  mistaken for a first day. **She leaves $1,000 behind on the way out**
  (`ECONOMY_CONFIG.welcomeGift`), once ever.
  For one build in August the guide was Ellis rather than Mal (the anniversary
  build, 2026-08-22); **that branch was deleted on 2026-08-27**, not switched
  off, on Ellis's *"no more anniversary stuff"*. It is in the history.
  **And she leans in round the side
  of whatever panel is covering her** (2026-08-26) — a head-and-shoulders
  render of the same character, lip-syncing to the same clock, in a notch cut
  out of the panel's dim (`scene/guide-portrait.ts`).
- **Chores ✅** (2026-08-26) — `data/chores.ts` + `systems/chores.ts`, the
  answer to *"i finish the tutorial and now im out of cash with literally
  nothing to do"*. Little jobs that come due **on a clock rather than a price**,
  which is what makes them reachable by a player with no money. Doing one
  restores its appeal until it comes round again; **never doing one costs
  nothing** (the floor is the café's base rate — same rule as contentment).
  The window is due the moment the walkthrough ends, on purpose. One minigame
  so far — `wipe`, a full-screen sheet of muck you drag off to reveal your own
  café underneath (`ui/chore-wipe.ts`).
- **The till ✅** (2026-08-26, made an object 2026-08-27) — `systems/till.ts` +
  the `till` upgrade. Every penny the café earns lands in a drawer that holds
  £1,000 (up to £4,000). **It is the cashier on the counter**: a marker floats
  on it once there is a quarter-drawer, says how much, and banks it when
  tapped — and every upgrade level puts a different till there (`data/till.ts`).
  The HUD chip still works. **Money itself has no ceiling any more**; what is
  capped is what piles up while you are out, so a week away is worth one full
  till. Save v25. See §8 "The till".
- **Selling furniture ✅** (2026-08-26) — "sell one" on every shop page, half
  back, newest copy first. A bed with a cat in it and no spare is refused (§8's
  sacred rule). `state/selling.test.ts`.
- **Ellis's soundtrack and cat sounds ✅** (2026-09-01) — `locklane.m4a`, a
  71-second loop that fades in a few seconds after launch, plays twice through
  and rests (`audio/soundtrack.ts`); two purrs cut on the pulse and three
  meows. **The synthesised music and cats were deleted on 2026-09-02**, not
  kept as fallbacks — the ambient pad was still audible under the real track
  and during its rests, which is what Ellis was hearing. See §10.
- **Audio can be listened to ✅** (2026-08-27) — `node tools/render-audio.mjs
  cafe 240 out.wav` bounces the real mix, fades and all.
- **Placement tells the truth about its own rules ✅** (2026-08-26) — the
  walkway is measured as an oriented rectangle rather than a disc (a turned
  low table went from 31.7% of the floor refused, down from 40.1%) **and is
  drawn on the floor while you place**, as a soft warm ribbon beside the block
  grid; a floor piece no longer collides with anything hanging on a wall; a
  seat's approach is tested against the counter's real rectangle rather than
  its bounding box; and nothing can be sunk into a wall, because the overhang
  allowance only applies to the open lip of the slab.
- **The woodwork has colourways ✅** (2026-08-26) — the menu board and the wall
  shelves, under one slot and one category, recoloured by **tint** rather than
  by asset swap, because the pack ships them in a single finish. See §8
  "Customisation is the long curve".
- **Guests walk at a speed ✅** (2026-08-26) — every leg used to be a fixed
  *duration* over a variable *distance*, which was a ninefold speed spread
  inside one room. They now move at 1.9 u/s and the schedule waits for them.
  A guest whose chair is sold stands up and leaves rather than sitting on
  bare floor.
- **The café is real art ✅** — hand-placed diorama in `data/cafe-layout.ts`,
  built by `scene/cafe-room.ts`. All procedural greybox is deleted.
- **The room *is* `graphics/K9gvnT.png` ✅** (2026-08-01) — counter, blackboard
  and shelves on the left wall, the big swept arch and round window on the
  right, window-seat cushions, cushion cluster round the low table, doormat and
  A-frame sign outside. Rebuilt object-for-object out of the **Blender sample
  scene the pack ships**, not by eye. See §9 "Rebuilding from the sample scene"
  — that method is the reusable part.
- **Venue ladder removed ✅** — `data/venues.ts`, `systems/venues.ts` and the
  move UI are gone. Save v5 dropped `venueIndex` and clamped absurd balances.
- **Economy rescaled to readable money ✅** — see §8 "Progression pacing".
- **Cats capped at 5 ✅** (`ECONOMY_CONFIG.maxCats`).
- **Contentment ✅** — petting cats is the mechanic that rewards being present.
- **Colourways ✅ — and they live in the shop, not a menu of their own**
  (moved 2026-08-10). `data/customisation.ts`: five categories (walls, floor,
  sofa, rug, cat bed), each with several colourways, gated twice — an **unlock
  milestone** (the progression: most of it is shut on day one) and a **price**
  (the reward: something to spend a capped till on). Locked rows say what to go
  and do, not just "locked". Nearly all of it is data — the layout references
  customisable pieces by *slot*, resolved from the save at build time.
  Surfaced two ways: the shop's **colours** tab (page through the pieces, each
  turning on the stage, press a swatch to see it before you buy) and
  **hold-a-piece-in-the-café**, which is the quicker route once you know it.
- **Appeal comes off the furniture ✅** (2026-08-10) — every shop item carries
  an `appeal` value, so furnishing the room *is* the upgrade. The "cosy
  touches" upgrade that used to sell appeal from a menu is gone; **`brews` is
  the only levelled upgrade left**, and anything new should be checked against
  "could the player just put this down instead?".
- **Levels and XP ✅** (2026-08-11) — `data/progression.ts`. XP from furnishing
  and adopting; level **derived** from lifetime XP, never stored. Shown as a
  ring plus the café's name and the player's, top left. **Gates nothing, on
  purpose** — see that file before wiring an unlock to it.
- **The shop is the only editor ✅** (2026-08-11) — buying a piece drops you
  into placement (translucent ghost, green/red, snapped to a visible 0.5 grid);
  an "arrange" tab moves anything already in the room; colourways are a tab.
  Press-and-hold is deleted.
- **Builder mode ✅** (2026-08-24) — extend / floor / walls, in the café.
- **Expansion ✅** (2026-08-16) — §8 step 6. Buy floor tiles in the room
  itself; walls extend themselves from the pack's kit; the camera re-frames.
  Growth is +x/+z only — read `data/expansion.ts` before changing that.
- **The menu ✅** (2026-08-15) — `data/drinks.ts` + `systems/menu.ts`. Seven
  classic coffees, nine add-ins gated on coins *and* level, up to four blends
  you invent and name, and a minimal sales chart. The café's pay multiplier is
  the menu's **average** cup — read `systems/menu.ts` before rebalancing.
- **Save at v22**, with **no migration from v5 to v6** — a deliberate break taken
  while the game has no players (cats 8→5, money billions→£9,999 made old saves
  nonsense). A test pins the break. "Never lose a player's cats" applies without
  exception once it ships. v6→v7 is a real migration: it rehomes an *untouched*
  sofa/rug choice onto the new free default (olive, berry) so an existing café
  looks like a new one, and leaves a bought colourway alone. v11→v12 refunds
  the retired "cosy touches" levels rather than writing them off.
- **`npm run balance`** ✅ — simulates weeks of play under four player habits.
- **Portrait framing** ✅ — the camera solves its own distance per aspect (§9).
- **Analytics** ✅ (pulled forward from M5) — TelemetryDeck transport, batching,
  session + funnel + economy events.
- **App icon, launch screen and loading screen ✅** (2026-08-25) — one mark (a
  latte from above with a cat's face in the foam) drawn by
  `tools/make-icons.py` into the icon, the splash and the favicon; plus an
  inline loading screen in `index.html` on the same backdrop olive, so launch
  → web view → café is one continuous colour.
- **iOS packaging exists ✅** (2026-08-05) — Capacitor 8, `ios/` is a real
  tracked Xcode project, portrait-locked, and it **compiles** (verified with
  `xcodebuild` against a simulator destination). `npm run ios` does
  build → sync → open Xcode. Signing is Ellis's to do; see §16.
- `npm test` — 400 tests over the pure systems, save migrations, café geometry,
  the visitor loop, contentment maths, the camera controls (pan/zoom clamps,
  tap-vs-drag, press-and-hold), the placement rules the authored café itself
  has to pass, which objects the validator is allowed to ignore, the expansion
  price the shop quotes against the one the till charges, what the walkthrough
  costs on a *second* run and which of its steps can't be done at all, the
  welcome gift's one-shot guard, the till (what it holds, what it refuses, and
  that a week away pays no more than a night), selling furniture back at a loss
  every time round, which props a café may hand its customers, that a bought
  copy of anything survives a reload, the two shapes a colourway can take and
  the fallbacks between them, the lip-sync viseme mapping, the merged pack's
  clips and face meshes, the guest phase machine settling rather than
  oscillating, where the till stands and which one each upgrade level wears,
  where the walkthrough puts the furniture it hands you, that every seat guests
  are sent to is one the player may place, that every audio file the game names
  is really shipped, the goal ladder's ordering and its refusal to pay twice,
  and a jsdom smoke suite for the HUD.

> ## ⭐ DIRECTION — 2026-08-06. The café editor is the plan now.
>
> The first device build answered the D7 question by failing it. Ellis: *"we
> need more things to do. its like so idle its not engaging."*
>
> **The answer is a Clash-of-Clans-style café editor**: the café starts nearly
> empty, you browse a categorised shop, buy furniture, drag it around as a
> transparent ghost that snaps into place, tap or hold placed pieces to recolour
> or move them, pan and zoom a free camera, and buy floor expansions and choose
> their walls and windows. Plus cat capacity by floor area, rehoming, and a cat
> life cycle. **The full specification is §8 "The café editor" — read it before
> touching game design.** It supersedes the LTE framework as the priority.
>
> Two items in it (**cats dying**, and **hunger/health that decays into harm**)
> contradict pillar 1 and §8's "never lose a player's cats. Sacred." They are
> flagged in that section and **need Ellis's decision — don't quietly build
> either one.**

**Next up.**

0. ~~**Cats live in cat beds**~~ ✅ 2026-08-22.

1. ~~**Cats live in cat beds** (asked 2026-08-20, not started): capacity = beds
   placed, adoption picks a free bed, the cat spawns there. Needs **multiple
   instances of one shop item**, which the shop cannot currently express — a
   purchase reveals one authored placement, so "three cat beds" has no
   representation in the save. That is the real work: dynamic furniture
   instances rather than authored ones.~~
2. ~~**Wall pieces have no colourways.**~~ ✅ 2026-08-26 — as tints, since the
   pack ships them in one finish. §8 "Customisation is the long curve".
3. **Cat capacity + rehoming** — §8 step 7, the last unbuilt step, and the only
   one left in the editor plan.
4. ~~**Builder mode**~~ ✅ 2026-08-24 — `ui/builder.ts`.

**The old expansion note, for reference:** Steps 1–5
of §8's sequence are done and step 3 has been *undone* deliberately (the hold
menu is gone; the shop replaced it). What remains, specified by Ellis on
2026-08-11 and **not started**:

> *"expanding the cafe should be possible so you can buy with cash another
> section of the floor like an expansion and then pick which wall and stuff and
> change window etc… and this is from expansion mode in this same mode so if i
> want to extend the cafe i can press that in the shop and then it shows all
> the possible places i can add more flooring like transparent with a little
> plus and a cost and if i press plus it builds the floor there and then people
> and cats and furniture can go there."*

The interaction is clear and the plumbing is mostly in place — the placement
validator already takes a **list of surfaces** rather than one square, which is
exactly the shape expansion needs. What makes it the big one is the
architecture, not the UI:

1. **Tiles have to enter the save** (`tiles: {x,z}[]`, default one at origin),
   and `ROOM.half` stops being a constant.
2. **The wall kit has to be assembled per tile**, and that is a real art
   problem, not a loop: `Light` is authored for the −x edge and `Dark` for −z,
   `_End_X`/`_End_XL` are the corner and the sweeping arch, and exactly one
   window shape is baked into each style's window wall (§9 "Walls"). Every new
   tile changes which edges are boundary edges.
3. **Framing** — §9's camera solves its distance from `FRAME_BOX`, so that box
   has to grow with the footprint, and every tier must still frame on a
   393×852 screen. This is the hard ceiling on how far expansion can go.
4. **Guests lerp straight to their seats with no pathfinding**, so seats on a
   new tile need the authored route extended or they will walk through walls.

Then the cat changes (capacity by floor area, rehoming) — §8 step 7.

<details>
<summary><b>Superseded plan (2026-07-31) — kept for the reasoning, not the
priorities.</b> Its "no cohort until a week of play exists" argument still
holds, and the editor is now how that week gets built.</summary>

> **On when to test.** §15's gate reads as one event; it's really two questions
> with different readiness dates, and conflating them wastes a cohort.
> - **D1** — "was the first session good enough to come back tomorrow?" That's
>   the first 5–10 minutes, which *is* built. Answerable now, and cheap to read
>   qualitatively with 5–8 people watching a first run.
> - **D7** — "is there a reason to return on day 3?" **Not yet.** The venue
>   ladder used to be the answer and it was scrapped; the Style menu is its
>   replacement and it is four categories deep. Answer this before spending a
>   cohort on it.
>
> So: **no large public cohort until a week of play exists.** First impressions
> are a one-shot resource and cosy communities are small. Small qualitative
> reads along the way are fine and encouraged. Keep instrumentation live the
> whole time so the data is there when the cohort is worth running.

1. ~~Venue progression~~ — built 2026-07-31, then **scrapped** the same day with
   the empire fantasy. See the direction-change box below.
2. ~~Cosmetic-only décor tier~~ ✅ shipped as the **Style menu** (see Built).
3. ~~Rebuild the room against `graphics/K9gvnT.png`~~ ✅ done 2026-08-01, from
   the pack's own **Blender sample scene** rather than by eye (see Built).
4. **Real cats.** Customers are done (the character pack is in, 2026-08-01);
   the cats are still procedural primitives and they are the emotional star of
   the game. A cat pack is the next art buy.
4. **Depth beyond colourways.** The Style menu is genuine progression but it is
   four slots deep, so D7 still has no answer. Recipes, cat furniture, regulars,
   evening ambience, seasonal bits — §8's list, not yet built.
5. **The LTE (limited-time event) framework.** Per §8 the highest-ROI retention
   feature in the genre. The framework alone adds no playable content; its
   value arrives with authored events, which is why it sits behind depth.
6. **Then** the real D1/D7 cohort. ~~iOS packaging~~ ✅ built 2026-08-05 — the
   Xcode project exists and compiles, so this is no longer a blocker sitting at
   the end of the queue; it's a `npm run ios` away whenever a build is wanted.

</details>

> ## ⚠️ DIRECTION CHANGE — 2026-07-31. Read before touching game design.
>
> **The empire fantasy is dead. This is one small café, made lovelier.**
>
> The venue ladder (seven cafés, ×262,144 income, money in the billions) was
> built and then scrapped by Ellis on sight of it: *"fuck the huge crazy
> expansion stuff, lets keep it more cosy and relaxing with more customisable
> options instead."* He is right, and it matches §1–2 far better than the ladder
> ever did. Numbers in the billions are not cosy.
>
> **The new fantasy:** the player grows attached to *one* café, its cats and its
> regulars. Progress is decoration, customisation, recipes, comfort and
> personality — not revenue per second. The reward is "I want to spend time in
> this little café", not "I need to afford the next building".
>
> Concretely this means, and these are hard limits:
> - **Money stays readable.** Target ceilings roughly: early 0–500, mid 500–5k,
>   late 5k–30k. No abbreviations, no millions, no exponential stacking.
> - **Cats are few and memorable.** Around 6–10 resident, not 50. Eight cats
>   with names, preferences and favourite spots beats fifty interchangeable ones.
> - **No venue replacement.** At most one small extension later — a patio or a
>   nook. Never a chain.
> - **Progression unlocks *things to look at and arrange*:** décor, colourways,
>   wallpaper, flooring, recipes, cat furniture, barista clothes, regulars,
>   evening ambience, seasonal bits.
>
> Sections below still describe the venue ladder and the old economy in places.
> Where they conflict with this box, **this box wins**; fix them as you go.

> **This is a mobile game. There is no web release.** (Decided 2026-07-31.)
> The web build is a *development tool* — fast iteration, and `npm run dev:lan`
> for device testing — never a distribution channel. Don't propose deploying it
> to a URL as a shortcut to testers; it was raised and rejected. This also means
> licensed assets ship inside the `.ipa`, which satisfies asset-store EULA terms
> that forbid users extracting raw asset files (a web build would not).

**Open design questions (raised 2026-07-31, not yet decided):**
- **Two views** — an exterior/street view alongside the café interior, showing
  visitors walking in and a storefront that visibly upgrades. Strong idea: §12
  makes short-form video the top growth lever, and an exterior queue shot is
  far more shareable than an interior. Cheaper than it looks (façade + street
  strip + existing visitor meshes), but it does double the art surface.
- **Venue progression** — escalating locations. Now **next up** (see above): it
  multiplies the lifespan of every system already built, which is exactly the
  content-drought fix, and it's cheaper than authoring content one upgrade at a
  time. Needs designing into the economy and save format early; retrofitting is
  painful.

  **Hard constraint: this cannot be a normal prestige reset.** Standard idle
  prestige wipes your progress for a multiplier. Here that would delete the
  player's named cats — violating "never lose a player's cats. Sacred." (§8)
  and pillar 1. The cosy-compatible framing is a **move, not a reset**: you
  relocate the café to a bigger, lovelier venue and *your cats come with you*.
  The venue raises capacity and multipliers; décor/upgrades may reset (they're
  fixtures, they belong to the building), cats and their names never do.
- **How far does the escalation go?** Ellis floated ending at a cat spaceship
  in space. It's shareable, but it's a *different brand* from the cosy, warm
  positioning §1 commits to — that's gag-idle territory (Adventure Capitalist,
  Egg Inc.). A cosy escalation ladder (rooftop → seaside → forest → snowy cabin
  → cloud café → a moon café looking down at Earth) keeps the "how far does
  this go?" hook without the tonal break. **Ellis's call — not yet made.**

**Known gaps / debts:**
- **The cats are still greybox** *in the world* — customers are real art, the
  cats are procedural primitives. **Their portraits are not**: the cat pack was
  given up on 2026-08-26 (*"lets give up waiting for the released cat pack"*)
  and all sixteen breeds now have a drawn face (`ui/cat-face.ts`). The 3D cats
  are still the outstanding art buy.
- ~~**There is no wave clip in the character pack.**~~ ✅ 2026-08-25 — the Lip
  Sync pack ships `Social_WaveHello`, and it is the barista's first greeting
  now. The base pack's 43 clips genuinely had no greeting in them; the answer
  turned out to be a €5 add-on rather than authoring one.
- ~~**There is still no way out of the walkthrough.**~~ ✅ 2026-09-08 —
  `TutorialGuide.skip()` is wired to a "skip this" control that appears after
  **thirty seconds stuck on one step** and nowhere else. It stopped being
  theoretical the day a placement lost a race with the room rebuild and left a
  step that could not be finished: relaunching only restarted the walkthrough,
  so a dead end became a loop. The design worry that kept it unbuilt was right
  and is what shapes it — it is off the tap-anywhere path, quiet, and the timer
  resets every step, so only somebody who is actually stuck ever sees it.
  Skipping exits normally, so the gift is paid and `tutorialDone` is set.
- **Guests have a face but still no attention.** They blink, and they wear a
  mood once they've settled (`SEATED_MOODS`) — but they still don't *look* at
  the cats, each other, or the barista. Head-tracking is the next real step
  and it is a bone rotation, not an asset problem.
- **Guest animation is walk → sit → idle and nothing else.** No serving — the
  packs ship `Tray_Walk`, `TallChair_Served_Happy` and ~50 others unused. The
  merged pack adds `Social_Stand_Discussion_1/2` and the nods, which are
  exactly what two guests at one table should be doing.
- **The game runs out of things to do in about a day, and it is too passive
  even before then.** *(2026-09-08: the goal ladder is the first real answer to
  this — see §8. The catalogue is still small; what changed is that there is now
  something telling the player what to do with it.)* Five cats, two maxed upgrades and four style categories
  is the whole of it. Confirmed on device 2026-08-06 — *"its like so idle its
  not engaging"* — which is the D7 question being answered in the negative.
  **The café editor (§8) is the fix and it is now the plan.** Note the two
  separate faults: not enough *content*, and not enough to *do* moment to
  moment. Recipes and seasonal bits would have addressed only the first.
- **Resolution is bounded by memory, and the ceiling is unmeasured.** Native
  ratio SIGKILLed the app (2026-08-17); the budget levels in `data/graphics.ts`
  are calculated, not profiled. If "sharp" turns out to be stable on a real
  phone, the budgets can all move up; if "balanced" crashes, they must come
  down. **Nobody has yet reported which levels survive.**
- ~~No customer variety~~ ✅ guests are the real character pack now, assembled
  per visitor from hair/top/legs/held-prop slots with a tinted garment palette
  and one of six skintones × sixteen hair colours (§9).
- **The window seat only exists on wall style A.** Its cushions rest on style
  A's deep sill ledge; B and C ship flat window walls, so the layout's `onSill`
  pieces are left out there and the window reads bare. Either give B/C a ledge
  piece (`Wall_B_Window_Dark_Table` exists) or build a bench.
- **The room is now a fixed diorama with almost no slack in it.** Every square
  of floor is spoken for, so anything new (a bench, a second cat bed, a recipe
  station) means moving something the reference put there. That is the price of
  matching a render exactly, and it's worth naming before someone tries to add
  a prop and finds the layout test refusing all four candidate spots.
  **Measured, 2026-08-26:** in a *bare* café the counter and the kitchen bench
  take the whole left-hand half, and after the walkway an armchair has about
  five grid columns to stand in. Nothing is wrong — the rejections are all
  real furniture — but it means the honest fix for "nowhere to put anything"
  is **more floor** (§8 step 6), not a looser validator, and it is the strongest
  argument yet for cat capacity by floor area.
- **The walkway rule only protects door → lobby.** Guests then walk lobby →
  counter queue → seat with no pathfinding and nothing stopping furniture going
  in the way, so they *can* still clip a plant on the way to a chair. Adding
  those legs would be more correct and would refuse more floor, which is the
  opposite of what Ellis asked for on 2026-08-26 — so it is a deliberate hold,
  not an oversight. Revisit it with the extra floor from expansion, not before.
  **The seat approach is the one exception** and it is now checked against the
  real leg (counter → chair, `approachFrom`), because that one decides whether
  a chair may be *placed* rather than merely whether it is walked past.
- ~~No UI/icon art~~ — a drawn SVG icon set now covers navigation, upgrades,
  the sound toggle and close (§9). It is deliberately small; anything new needs
  drawing in `ui/icons.ts` to the house style, not pulling from an icon font.
- Bundle ~838 kB JS (Three.js + the post chain) + 139 kB font. The **whole
  `dist/` is ~17 MB** since the real soundtrack landed — 2.4 MB of that is
  `locklane.m4a` alone, against 4 kB for the generator it replaced, and that is the number that matters now it ships in an
  `.ipa`: 2.7 MB character GLB, ~760 kB Draco decoder, the café atlas, the rest.
  Fine for now, revisit before ship.
  **Nothing that is not shipped belongs in `public/`** — everything there is
  copied verbatim into the build. A 17 MB source FBX was parked there and was
  going into the app for nothing (caught 2026-08-05, dist was 31 MB).
- **Draw calls**: a full late-game café is ~535 meshes / 39k triangles. Triangles
  are fine; the mesh count is the thing to watch on a mid-range phone (§13).
  Materials are shared per breed/palette already. Deliberately *not* optimised
  further — a GLB hero cat is 1–2 meshes and fixes it for free, so merging
  geometry on a placeholder would be throwaway work.
- **Sound on silent: two more changes, still UNVERIFIED on device.**
  `.playback` alone has been set since 2026-08-25 and the game was still silent
  with the ringer off, so on 2026-08-18: (1) the re-assert moved to
  `SceneDelegate.sceneDidBecomeActive` — this app has a
  `UIApplicationSceneManifest`, so `applicationDidBecomeActive` **is never
  called**; (2) `.mixWithOthers` dropped; (3) `keepMediaSessionAwake()` in
  `audio/audio.ts` plays a generated silent WAV through a real `<audio>`
  element for ever, because a WKWebView page that only uses WebAudio does not
  read to WebKit as media playback and WebKit's own category choice overrides
  the app's. **None of it is testable off a phone** — the web build runs
  outside the app's audio session entirely. If it works, the thing to try next
  is putting `.mixWithOthers` back, so the game stops killing podcasts.
- **Still not run on a real device**, though as of 2026-08-05 nothing stands in
  the way but signing — the Xcode project builds. The open questions §13 wants
  answered on hardware: does **GTAO** hold framerate (it is the frame's most
  expensive pass, drop it first), does the **Draco** decode of the 2.7 MB
  character GLB stall the first frames, and does the ~535-mesh late-game café
  hold up. **Agent screenshots do now work** — the trick is a freshly created
  tab; reusing a tab that has had the WebGL page loaded a while makes script
  injection time out every time.

**Session log.** The last five entries are below; **the full log lives in
[`docs/session-log.md`](docs/session-log.md)** — 70 entries back to 2026-07-31.
It was moved out on 2026-08-17 at 138 KB, which was over half this file and was
being read into context every session. Every *rule* it taught has been promoted
into the numbered sections; the archive holds the reasoning and the dead ends.
**Append new entries there**, and mirror only the newest handful here.

- *2026-09-19* — **The last purchase still charging on the button press, a
  guest carried off in their chair, and two cards in one shape.**
  ([full entry](docs/session-log.md))
  - **`buyBed` was never converted.** §8's "money moves when the piece lands"
    was implemented in `buyShopItem` and `buyCopy` a fortnight ago and the bed
    kept debiting *and* granting xp on the button press — so the **first**
    purchase a new player makes, the one the walkthrough asks for, was the one
    still doing the wrong thing. A rule written for a system has to be checked
    against every path in it, not the path that was reported.
  - **The chime moved too.** Two buy paths played `playPurchase()` immediately
    while a third stayed deliberately quiet; the sale completes at placement, so
    they are all quiet now and main.ts makes the noise.
  - **A moved chair carried its occupant.** Two mechanisms, and fixing one does
    nothing: the seat position is copied onto the guest every frame, *and*
    `arrived("toSeat")` compares travelled distance against the live route
    length, so moving the chair silently makes them "not arrived" — striding,
    but still flagged seated and still in the sit pose. They stand up and walk
    now. **Where the check goes was the whole difficulty**: after the `arrived`
    test it is unreachable while they glide, then fires on arrival and makes
    them walk the route twice.
  - **The upgrade cards had no gap** because they are appended straight to the
    panel rather than into a `.hub-grid`. Two rounded rectangles touching read
    as one shape with a seam.
- *2026-09-08, night (fourth)* — **"after the first song ends another song
  never comes on either": the harness could not hear.**
  ([full entry](docs/session-log.md))
  - Second report of the same thing, after I had "verified" the fix in Chrome.
    **`tools/shot.mjs` could not see audio at all.** Chrome's autoplay policy
    left every `AudioContext` `suspended`, and a suspended context's
    `currentTime` is frozen at 0 — so `setTimeout` callbacks still fired and my
    probes reported the playlist advancing while **not one sample had been
    produced**. Three runs in one session, all confirming nothing. The tool
    passes `--autoplay-policy=no-user-gesture-required` now.
  - **A tool that measures the wrong stage will confirm whatever you already
    believe** — the same sentence §10 already carried about `render-audio.mjs`
    rendering past the master gain. It cost a week then and two rounds now.
  - **The scheduler was a single point of failure.** Each session armed one
    `setTimeout` for its own length plus the rest, and the only thing that would
    ever schedule the next piece was that one callback. Lose it and the music
    stops for ever — which is precisely the reported symptom. It is a repeating
    half-second tick now.
  - **`ctx.resume()` was only ever called from a tap.** A context iOS suspends
    while somebody is doing nothing but *listening* was never revived. The rest
    between pieces, with no source playing, is exactly when a platform decides
    nothing is going on. The tick resumes it.
  - **The first version of the tick waited on the audio clock, which is the one
    clock that stops.** Caught because the rewrite played nothing at all in
    Chrome — the same suspension, this time failing loudly instead of quietly.
    A bug I introduced, found only because the harness had just been fixed.
  - **WebKit was innocent**: checked directly in a real `WKWebView` that
    `setValueAtTime` at a curve's endpoint and the crossfade voice gains are
    all accepted. Not the cause.
- *2026-09-08, night (third)* — **A walkthrough with a failure mode and no
  exit.** ([full entry](docs/session-log.md))
  - Ellis: *"im stuck on the tutorial tapping and its not progressin … if i
    restart the app the tutorial restarts too."* Two faults, and the second
    turned the first into a trap.
  - **`startPlacing` raced the room rebuild and gave up silently.** The room
    rebuilds *asynchronously* from the store, so a bought piece is only
    findable once it resolves; the retry was thirty frames — about a second at
    the frame cap — and then it returned without a word. Player holding a
    receipt, no ghost, and the step that asked for it can never complete. It
    awaits the rebuild promise now instead of guessing how long it takes.
  - **`TutorialGuide.skip()` had been written, correct and called from nowhere**
    since it was added; §0 carried it as a known gap for weeks. The reason was
    sound — an easy skip means a first-timer misses the introduction with a
    stray tap — so it is not on the tap-anywhere path: its own small underlined
    control, shown only after **thirty seconds stuck on one step**, timer
    resetting each step. Skipping leaves through the normal exit, so the gift is
    paid and `tutorialDone` is set. **That last part is the one that matters**:
    without it a relaunch restarts the walkthrough and a dead end becomes a loop.
  - **XP now moves when the piece lands**, like money (§8). It was granted on
    the button press and clawed back on cancel, so cancelling visibly
    *un*-levelled you. Granting it in `settlePurchase` means the buy-then-cancel
    xp tap the clawback existed to plug cannot be expressed.
  - **Guests arrived carrying the coffee they were about to queue for.** The
    held prop was visible from spawn, which made the counter a queue for
    something they already had — and is why being served never looked like
    anything. `setCarrying` is false until `servedAt`.
  - **The now-playing chip was reported missing a third time.** Two earlier
    causes were real bugs; this one is that a seven-second notice in a corner
    can just be missed. Settings carries a live **now playing** row now — a
    moment that has to be caught is a bad way to tell somebody anything they
    might want twice.
  - **One menu board per wall** (`ShopItem.onePerWall`). Not a collision rule —
    two boards sit side by side quite happily, so no overlap test would ever
    object — so it is compared by wall *identity*. The window half needed no
    code: a glazed run is already refused.
- *2026-09-08, night (later)* — **A "frozen" game that was a button being
  rebuilt thirty times a second.** ([full entry](docs/session-log.md))
  - Ellis: *"i tried to collect my first reward from the to do list and the
    game completely froze and im stuck."* Nothing was frozen and nothing threw.
    **`panelUpdate` runs on every store change and `tick()` calls `set()` every
    frame**, so the goals panel's `list.innerHTML = ""` destroyed and rebuilt
    the whole list — buttons included — about thirty times a second.
  - **It measured fine and it was still unusable.** No console error, no
    frame-time change on desktop, and `.click()` claimed five rewards in a row
    happily. But a touch that begins on a node removed two frames later never
    dispatches a click, so **every real tap on "collect" did nothing**, which
    from the sofa is indistinguishable from the game having locked up. §17's
    rule about `.click()` again, in a shape it had not taken before: this time
    the button was *present, enabled and hit-testable*, and still dead.
  - The fix is the pattern every other panel already used — a `refreshers`
    array, built once, mutating text and bar widths in place, rebuilding only
    when the *shape* of the list changes. Measured after: 0 replacements in 188
    checks over three seconds, counters still ticking live.
  - **The now-playing chip was behind the panel layer.** Third report of not
    seeing it, and neither previous cause was this one: z-index 3 against
    `.overlay-layer`'s 5, so any open panel painted its dim and blur over it.
    **`elementFromPoint` cannot detect this** — the chip is `pointer-events:
    none`, so it names the overlay and looks like proof. The screenshot is what
    settled it.
  - **The music plays at 0.88** (*"feels like its all going too fast"*), which
    is a resampler, so it is two semitones flatter as well as 12% slower.
    Everything in `schedule()` had to start dividing by it.
  - **And the app was behaving like a web page.** *"why is it sometimes like..
    i accidently highlight stuff in blue as if im on a website?"* — `user-select:
    none` was set on the canvas only, so every label in the DOM was selectable
    and a tap with any drag in it painted one blue. Global rule now, with the
    three text fields as the only exceptions, plus `-webkit-touch-callout`
    (a separate property — iOS raises the magnifier even where selection is
    off) and `overscroll-behavior: contain` on the two scrollers.
- *2026-09-08, night* — **A soundtrack that stopped rather than a soundtrack
  that broke.** ([full entry](docs/session-log.md))
  - Ellis: *"i finished listening to the first song (which was an interlude i
    think but not sure as the icon currently playing pop up never showed) and
    then it eventually ended but another song never came on."* Two faults, and
    **neither was a bug** — every number involved was doing exactly what it was
    written to do.
  - **A 150-second session divided into a 27.9-second interlude six times.** So
    "the first song" was the same twenty-eight seconds, two and a half minutes
    running, followed by forty-five seconds of nothing. **A rest is only a rest
    while the listener is still expecting something**; past that it is heard as
    the music having finished, and the next piece arrives as a surprise rather
    than a return. Rest is 5s, sessions 85s.
  - **`passesFor` rounds, so the error is invisible in the span.** Six passes of
    27.9s is 152 seconds — dead on target, and the existing test checked
    exactly that. The listening experience was one short piece six times. Bound
    the pass count against the *shortest* track, not the span.
  - **The chip was showing all along** — verified in the running game at 15.5s,
    held 5.2s. Its lead-in was a flat 3500 ms written against a twelve-second
    fade-in; the fade later came down to five, so the chip started arriving
    *before* the music reached level, which is the one thing the lead-in exists
    to prevent. Its own comment still said "fades in over twelve seconds".
    **A constant restating another module's number is already wrong, and a
    comment quoting that number is how the drift stays invisible** (§14).
  - **The first probe replaced the thing it was measuring.** `setTrackListener`
    holds one listener, so subscribing to watch it silently unsubscribed the
    chip — and the run "proved" the chip never rendered. Observe the DOM, not
    the callback.
- *2026-09-08, evening* — **"why is the builder so hard to find": panels named
  after the save rather than the player.**
  ([full entry](docs/session-log.md))
  - **The builder was the eighth thing on the shop's front page** — under a
    banner, five departments and the arrange tile. The tool that lays floor and
    changes walls was filed at the bottom of a shopping list.
  - **The hubs were grouped by *data*, not intent.** "café" held drinks and
    upgrades because those are `drinks` and `upgrades`; "shop" held everything
    touching `purchased`/`placements`/`tiles`. Sensible for the code, meaningless
    for a player — and **"café" and "shop" both just mean "the game"**.
  - Nav is `to do · cats · menu · room` now, and the builder opens the room
    panel in a section of its own beside the colourways. A rename and a
    reorder; no new systems.
  - **A rename reaches further than the labels**: `GUIDE_PATHS` resolves the
    walkthrough's arrow through `data-guide`, so leaving those keys behind
    would have left the arrow pointing at nothing on a first run.
- *2026-09-08, later* — **"why is this game so damn boring": systems without
  structure.** ([full entry](docs/session-log.md))
  - **Four complaints, one cause.** "£500 and I don't know what to buy", "the
    blend section seems random", "I run out of things to do", "no retention" —
    the café has plenty of *systems* and nothing on top of them. A shop with
    fourteen unlocked rows and no opinion about which matters is a wall, not a
    choice.
  - **§0 answered D7 with *content* for two months** and that was the wrong
    axis. A catalogue is only legible once something says why you wanted the
    next thing in it.
  - **The menu was literally random.** Sales rolled a menu item *at the moment
    of payment*, so no guest ever had a drink and a blend moved a hidden
    multiplier. Visitors carry an order now — over their head at the counter,
    in what they pay, in the chart. A new blend is weighted ×3 until it sells
    three cups, because at a fair roll nobody would order your drink while you
    were still watching; and the first sale is announced.
  - **The ladder** (`data/goals.ts`): twelve asks, three at a time, in order.
    They pay out, they never expire, they tick over while you are away, and it
    **ends** — a ladder with no top is a treadmill.
  - **The order chip never showed** because I compared visitor timestamps to
    `Date.now()` while the sim runs on the rAF clock. Nothing threw; the
    feature was simply absent.
- *2026-09-08* — **Three more tracks, and only one of them is a loop.**
  ([full entry](docs/session-log.md))
  - **Measuring before writing anything was the session.** Head-against-tail:
    *lock lane* opens at 0.8× the level it ends on and genuinely loops; the
    three new ones are pieces with *endings*, and *sometimes i forget you're
    gone* opens **8.6×** louder than it finished. "Loop it a few times" would
    have been a slam every 26 seconds. Repeats crossfade now; a crossfade of 0
    is a butt joint, so the seamless track keeps its behaviour on one path.
  - **They are mastered a third apart** (rms 0.0586–0.0847), which at one gain
    reads as the music jumping when it changes piece. Per-track trims measured
    against *lock lane*; rendered peak 0.565 → 0.443, the limiter no longer
    squashing the loudest one.
  - **A session is a fixed length, not a fixed pass count** — 27-second
    interludes and a 71-second piece both fill ~140 s, so the rhythm of
    music-then-quiet does not change with the track.
  - **The now-playing chip arrives 3.5 s late on purpose**: the fade is twelve
    seconds and naming a track before it is audible reads as a bug.
  - **Settings has a credits screen**, and its music section is derived from
    the track list so an added piece cannot end up uncredited.
  - **Three false alarms, all my harness** — and the useful one:
    `import('/src/audio/audio.ts')` from an injected script is a **different
    module instance** from the app's `@/audio/audio`, so my probe registered
    its listener on a second copy and drove a second soundtrack. That looks
    exactly like broken wiring. `window.__mallow.audio` exposes the real one.
- *2026-09-05* — **Loud enough, a shorter purr, and a fade that is actually
  gradual.** ([full entry](docs/session-log.md))
  - **The meow is the reference.** It was the one sound at about the right
    level, so it barely moves and everything else comes *up to it*: music
    ~6.6× louder, interface ~8.5×, purr ~1.5×. `MASTER_VOLUME` 0.3 → 0.85, plus
    a limiter so "loud" cannot become "clipping".
  - **Making the fade longer did almost nothing**, because
    `exponentialRampToValueAtTime` is linear in *decibels* — from a near-zero
    floor it stays inaudible most of its length then rushes in at the end.
    Twelve seconds of that is less gradual than five. A raised cosine via
    `setValueCurveAtTime` spreads the movement evenly and can touch zero.
  - **The music waits for the walkthrough** (`allowMusic`), kept separate from
    `musicMuted` because one is the player's setting and the other is the game
    saying the moment is right.
  - **`tools/render-audio.mjs` was measuring a mix nobody hears** — straight to
    the destination, bypassing the master gain. Every level "verified" with it
    this week was the balance and never the loudness. *A tool that measures the
    wrong stage will confirm whatever you already believe.*
- **A browser cannot test the app, and now something can.**
  `swift tools/webkit-probe.swift dist` runs the built bundle in a real
  `WKWebView` behind a scheme handler shaped like Capacitor's. Every existing
  tool — `tools/shot.mjs`, `tools/render-audio.mjs` — drives headless *Chrome*,
  which is the wrong engine served the wrong way, and all of them reported the
  audio working while the phone was silent.
- **A fallback that can be heard is not a safety net.** It is a second
    implementation nobody chose, and it will get chosen. `audio/music.ts` and
    `audio/cat.ts` deleted, not disabled — the anniversary-guide call again. A
    missing file now means quiet, which is the better of the two sounds.
  - **It was blocking the brief too**: music asked to fade *"out again to
    silence"* cannot reach silence with a synthesised pad underneath it.
  - **The load order was a second real bug.** The 2.4 MB track was fetched
    before the 25 kB effects, so the cats queued behind it and a cat petted in
    the first seconds made no sound — "no meow sound", with no synthesis needed
    to explain it. Effects first now: **purr audible 253 ms after the first
    tap**.
- **A limiter across the output is what makes loud safe.** At this level a
  purr, a coin and the soundtrack together can sum past 1.0, and digital
  clipping is a horrible sound to put in a cosy game. Threshold −3 dB, ratio
  12: silent on any single sound, engaging only on overlaps.
- **One `UI_GAIN` multiplier, not eleven edited literals.** The balance
  *between* the coin, the tap, the purchase and the reveal was tuned by ear and
  is right; only the group was too quiet. Scaling in one place keeps the
  decision that was already made.
- **`TRACK_GAIN` is above 1 because the file is quiet.** `locklane.m4a` peaks
  at 0.327 (≈ −10 dBFS), so at unity it can only ever be background.
- **`tools/render-audio.mjs` renders through the same master gain and limiter**
  now. It used to render straight to the destination — measuring a mix nobody
  hears, which is how the game came to ship three times quieter than anyone
  wanted while the tool reported it fine.

**A purr loop is cut on the pulse, not on the clock.** Both purrs are real
    ~27 Hz pulse trains with visible *breath gaps*; a 2.4 s window chosen by eye
    lands on one about a third of the time and sounds like the purr stalling.
    Each clip is a whole number of pulses (67, 63) from the stretch whose
    quietest 50 ms is loudest.
  - **AAC priming will break a loop that is otherwise perfect.** The OST
    declares 1024 frames of priming and 517 of padding. Both browsers honour
    the gapless metadata — verified — and `loopStart` skips the measured head
    anyway, because 23 ms of silence per repeat would be blamed on the music.
  - **A dip at the seam turned out to be the composition**, not a bad edit —
    checked by rendering tail and head back to back rather than arguing.
  - **The rests are the design.** 4 s quiet, 5 s fade in, two passes, a 7 s
    fade out landing on the end of the second pass, 45 s of café. Playing 77%
    of the time. It restarts at the top rather than ducking a looping node, so
    the same middle eight never fades in twice.
  - **The level was measured, not chosen** — the track is mastered far hotter
    than the generator (rms 0.059 vs 0.024), which at unity would have buried
    the coin chimes.
  - ⚠️ **The licences were unverified** at the time — resolved 2026-09-05: all
    three meows are CC0 and the music is Ellis's own. Only the purrs are still
    unaccounted for. See §10.
- *2026-08-26, later* — **A chair that vanished overnight, a walkway drawn as a
  circle, and the woodwork gets a colour.** ([full entry](docs/session-log.md))
  - **The disappearing chair was the save deleting it.** `sanitizeInstances`
    said `if (item.item !== CAT_BED_ITEM) continue` — true on the day the cat
    bed was the only thing with instances, and silently binning **every copy of
    every other shop item** from the day `buyCopy` shipped. The rule it meant
    is `!shopItem(id)`, which the same function already applies to `purchased`
    eight lines above. *A whitelist naming one id is a filter that will be
    wrong the first time there are two* — and this one failed invisibly,
    because the café that came back was a perfectly valid café.
  - **The walkway measured a circle round a rectangle**, using the half-
    *diagonal* of the axis-aligned bounds as a radius — so turning a piece 45°
    grew its no-go zone by a third without changing the piece. Exact
    rectangle-to-segment now: a turned low table went 40.1% → 31.7% of the
    floor refused, the cat climber 47.4% → 37.8%.
  - **Then the obvious tune was measured and rejected.** Sweeping
    `routeClearance` 0.34 → 0.20 buys 1–3% of floor: the cost is the corridor's
    *length* in a four-metre room, not its width. Left alone.
  - **So the fix for "random" was to draw it.** The route is a soft ribbon on
    the floor while a piece is in flight, beside the block grid. It rendered as
    nothing at `y = 0.008` — §9's low-precision depth buffer again, the same
    trap that ate a contact-shadow decal in August.
  - **A wall has no lip to hang over.** The overhang allowance is a *proportion*
    of the piece (0.29 for the cat climber, into 0.30 of plaster), which is
    right against the open edge of the slab and wrong against a wall. Measured
    the walls to settle it: **at furniture height every style sits 0.05 inside
    the tile edge**; the window wall's 0.68 is the sill ledge, from y ≈ 0.6.
  - **The floor under every wall piece was dead ground.** The hanging branch
    always said a wall piece only clashes with wall pieces; nothing said the
    converse. *A rule that holds one way and not the other is usually a bug.*
  - **The woodwork has colourways, as tints** — the pack has no second board or
    second plank to swap to. Subtlety is a test (≥0.45 per channel, ≥0.55
    luminance), not a judgement.
---

## 1. What we're building

**Mallow** is a cosy, relaxing cat-café management / idle game for iOS.

The player starts with **one cat in a humble little café** and slowly grows a cat-café empire: more visitors arrive, they spend money, the player buys more cats of varying rarity, **names them**, decorates, and expands. There is no fail state, no punishing timers, no stress. The entire point is calm, warmth, and the quiet satisfaction of watching something you built grow.

**Audience (validated):** cosy/wholesome game players — and this audience skews strongly female (multiple cross-market studies put cozy audiences at ~65–77% women), Gen Z / Millennial, roughly 25–45. This matters commercially: women are the higher-value casual segment (industry ad data shows women spend meaningfully more on in-app purchases, play longer, and return more often than men). We are building *for them*, deliberately — decoration, customization, collection, and emotional attachment to named cats are the features this audience reliably rewards.

**The feeling we are chasing:** warm, soft, unhurried, quietly rewarding. Every interaction should feel pleasant. If a feature adds stress or pressure, it is probably wrong for this game.

---

## 2. Design pillars

Every feature decision is checked against these, in priority order:

1. **Relaxing above all.** No punishment, no anxiety. Idle progression continues while away. Nothing is ever lost.
2. **Cohesive low-poly beauty.** Stylistic consistency beats detail. One art style, applied everywhere.
3. **Satisfying progression & collection.** The core hook is "one more cat," "one more upgrade." Collection + naming = emotional attachment.
4. **Game feel / juice.** The polish layer (§10) is what makes a simple scene feel beautiful and alive. Not optional; it is the product.

---

## 3. Positioning & competitive landscape

**The wedge (why this can work):** the cat-café / cosy-cat-collection niche is *populated with commodity clones but open at the quality/brand tier*. There is no dominant, polished, low-poly **3D**, calm-idle cat-café title with a strong brand. That gap is our lane. We win on cohesive art, game feel, and a genuinely relaxing loop — not on features or aggression.

**Comparables to learn from (not out-compete on budget):**
- **Neko Atsume** — 33M+ downloads, sustained 10+ years on a gentle, non-predatory optional-IAP model. Grew almost entirely on social sharing. *Lesson: non-predatory + shareable = longevity.*
- **Cats & Soup** — the closest comparable (cosy idle cat collection); 80M+ downloads over ~5 years, but **low revenue per user** — it monetizes on volume + optional ads, not whales. *Lesson: expect huge-ish downloads and modest per-user spend; this is the realistic shape of the business.*
- **Animal Restaurant** — $2M+ IAP / 20M+ downloads via limited-time events + collection + optional ads. *Lesson: live events are the retention engine.*
- **Furistas Cat Cafe** — a competent 2D cat-café incumbent (real-cat personalities, events). *Our differentiation is low-poly 3D + a more idle empire loop.*

**Do NOT try to compete with** the merge/casual giants (Travel Town, Merge Mansion, Gossip Harbor). They monetize the same female casual audience but are backed by huge user-acquisition budgets. Different game, different weight class.

---

## 4. Success metrics & guardrails (the numbers we're accountable to)

Instrument these from day one and check against them honestly. These are the anchor that stops us drifting into vanity or wishful thinking.

**Retention targets for this genre (healthy bar):**
- **D1 ≥ 35%**
- **D7 ≥ 15%**
- **D30 ≥ 8–10%**

(Simulation/idle games can hit these; cross-market averages are much lower, so these are the target, not a floor we'll casually clear.)

**Decision thresholds — these change the plan:**
- **D1 < 30% or D7 < 10%** → STOP. The core loop isn't fun/sticky yet. Fix it before building more content or spending anything on marketing.
- **TikTok/short-form consistently > ~50k views per video** → lean hard into organic short-form; delay or avoid paid user acquisition.
- **Rewarded-ad ARPDAU + IAP > blended cost-per-install within a 30–60 day payback window** → paid UA is safe to *test*, not before.
- **Still sub-$1k/month at ~month 6 with flat retention** → treat as portfolio learning; harvest the engine/assets and iterate a new title rather than pouring time into a stalled launch.

**Honest reality check (re-read this whenever optimism outruns evidence):**
- Outcomes here follow a brutal power law. The large majority of indie mobile titles earn **under $1k/month**. Discoverability — not development — is the defining risk.
- The niche is crowded: hundreds of cosy titles ship per year and stores host commodity cat-café clones. Quality is necessary but *not sufficient*; momentum and luck matter.
- A **$10k MRR** goal is a **top-decile** solo outcome, not a baseline. At realistic ARPDAU it implies roughly **3,000–5,000+ daily active users** sustained — which requires either a viral moment or a compounding content/event engine, plus healthy retention. Plausible as a stretch target; not an expectation.
- The productive response to all of this: **validate cheaply and continuously.** Ship a tiny playable slice, measure real behaviour against the numbers above, and let data — not hope — steer scope and spend. We cannot pre-prove success; we can only de-risk and iterate toward it.

---

## 5. Monetization principles (non-negotiable guardrails)

The cosy audience is the *most* sensitive segment to predatory monetization and punishes it in reviews and churn. Counter-intuitively, the "less greedy" model makes more money here through trust, retention, and word-of-mouth.

**Allowed (build these):**
- **Optional rewarded video** — watch-to-double-coins, speed up idle, extra gacha pull. Always optional. Rewarded ads correlate with *higher* IAP conversion, not lower.
- **Cosmetic / decoration IAP** — furniture, café themes, cat outfits/accessories, wallpapers. Highest-goodwill revenue.
- **Gentle gacha-lite collection** — random cats/accessories via *earned* soft currency; premium currency only *accelerates*, never *gates*. (Google Play requires disclosing "random items.")
- **One-time "remove ads" / "supporter" bundle** — clean, transparent, well-liked.

**Forbidden (these break the game and the brand):**
- Energy systems that gate basic play.
- Forced / unskippable ads.
- Pay-to-win or anything that makes spending feel *required*.
- Timers whose only escape is payment.
- Hidden, confusing, or manipulative pricing / dark patterns of any kind.

Rule of thumb: if a monetization idea would make a trusting player feel *used*, it's out — no matter what it earns in a spreadsheet.

---

## 6. Tech stack

- **Language:** TypeScript (strict mode on).
- **Rendering:** Three.js — low-poly 3D scene, gentle perspective/isometric-ish camera looking into the café.
- **Build / dev server:** Vite.
- **State:** Zustand (lightweight, predictable). All game state flows through one store.
- **iOS packaging:** Capacitor — the web build is wrapped into a native iOS shell, built and submitted via Xcode.
- **Persistence:** save system writes game state to storage (see §7). Autosave frequently and silently.
- **Target device:** iPhone, **portrait** orientation. Design the camera and UI for a tall screen and touch.

Why this stack: it's all code, so Claude Code has full reach; low-poly 3D is a Three.js sweet spot; GLB assets from packs and AI generators drop straight in; and it reuses existing Three.js experience.

---

## 7. Project structure

```
/src
  /core          # game loop, tick system, time/idle handling
  /state         # zustand store, save/load, migrations
  /systems       # economy, visitors, cats, upgrades, events — pure logic, no rendering
  /scene         # three.js: renderer, camera, lighting, environment
  /entities      # cat, visitor, furniture — model loading + behaviour
  /ui            # HUD, menus, shop, cat roster — DOM/overlay UI
  /audio         # ambient loops, sfx triggers
  /data          # config: cat definitions, rarity tables, upgrade costs, event definitions, balancing
  /analytics     # event logging (see §11)
  /assets        # loaded at build time (models, textures, audio)
main.ts          # bootstraps scene + systems + ui
```

**Keep game logic separate from rendering.** `systems/` should be pure TypeScript that could run without Three.js. This makes balancing, testing, and reasoning about the economy far easier, and lets us unit-test the money/progression math independently.

---

## 8. Core game systems

### Economy loop
The heartbeat. Visitors arrive over time → occupy seats → generate income while seated → income buys cats, décor, upgrades → upgrades increase visitor rate / spend / seating. Idle income accrues while the app is closed (computed on next open from elapsed time). All economy numbers live in `/data`, never hard-coded in logic.

**`CafeStats` is the single source of economic truth.** `systems/cafe.ts` composes owned cats + bought upgrades into one object (`appeal`, `seatCount`, `payMultiplier`, `dwellDurationMs`). The live tick, the offline calculation, and the UI readouts all take a `CafeStats`, so they cannot drift apart. Add a new economic lever by extending `CafeStats` and the upgrade catalog — not by threading another parameter through the systems.

**Two throughput ceilings, and which one binds matters.** Income is `pay × min(arrival rate, seat capacity)`. Arrival rate rises with appeal; seat capacity is `seats ÷ visit duration`. Keep `minVisitorIntervalMs` (the hard arrival floor) **below** what a fully-expanded café can seat — otherwise the floor binds first and the seating and service upgrades silently stop doing anything. `systems/offline.test.ts` asserts this invariant; don't delete that test when rebalancing.

**Appeal buys arrivals multiplicatively, not subtractively** (`interval = base / (1 + rate × (appeal − 1))`). The original subtractive curve drove the interval into its floor within the first *minute* of play, after which appeal only bought bigger tips and expansion bought nothing. The multiplicative curve has diminishing returns but never flattens.

### Cat system
- **Rarity tiers** (e.g. Common → Uncommon → Rare → Epic → Legendary). Rarer cats are more visually distinct and draw more visitors / spend.
- **Collection:** acquiring cats is the primary long-term goal. A roster/gallery ("cat-dex") shows what you own and what's still out there — completion is a core driver.
- **Naming:** the player names each cat. This is a core emotional hook — a first-class feature, not a nice-to-have. Names persist and appear in the world. Consider light per-cat personality/flavour to deepen attachment (evidence shows naming + observing a creature builds real attachment).
- **Traits (optional, later):** small passive bonuses or personality flavour per cat.

### Café / expansion
Upgrades and décor: more seating, new rooms, themed decorations, aesthetic customization. Décor should have both a stat purpose and a purely cosmetic tier (cosmetics matter enormously to this audience).

**Customisation is the long curve** — `data/customisation.ts`. Five categories
(walls, floor, sofa, rug, cat bed), each with several colourways, and **two
gates on every option doing different jobs**:

- `unlock` — a milestone ("Adopt 3 cats", "Discover 6 breeds", "Add 6 pieces of
  furniture"). This is the *progression*: most of it is shut on day
  one and opens as the café grows, so there is always something visible to work
  toward. Locked rows state the next step rather than just saying "locked" — a
  closed door you know how to open is progression; one you don't is a wall.
- `price` — a cost in the till. This is the *reward*: something to spend a
  capped, readable balance on.

Nearly all of it is data, because the pack ships three complete wall/floor
styles and most furniture in five or six colourways. The layout references
customisable pieces by **slot**, and the asset name is resolved from the
player's save at build time (`assetFor` in `scene/cafe-room.ts`) — so a new
colourway is a row in `data/customisation.ts`, not a layout edit.

**Where the pack ships one finish, a colourway is a tint instead** (2026-08-26,
`CustomisationOption.tint`). The menu board and the wall shelves have no twins
— `Shelf_A/B/C_Plank` differ in what is standing on the shelf, not in the wood
— so their category multiplies a colour over the atlas. Three rules go with it:

- **An asset swap is much the better mechanism and stays the default.** The
  artist chose those colours; a multiply only shifts them. Reach for a tint
  when there is nothing to swap, not to save authoring a row.
- **A tint-only slot must have no row in `chosenAssets`.** `wallWood` covers a
  board and two shelf planks, and naming one asset there would turn all three
  into it. `assetFor` falls through to the layout's own asset when a slot is
  missing, which is exactly right — check any *other* resolver falls through
  too (`copyAsset` did not, and would have built a second board from
  `undefined`).
- **"Subtle" is enforced, not judged.** `customisation.test.ts` holds every
  tint above 0.45 per channel and 0.55 in luminance, so it can shift a finish
  but cannot crush a hue out of the wood grain or darken the chalkboard past
  reading. Ellis: *"only a few subtle colour changes nothing crazy or itll look
  weird with the textures and stuff."*

### The navigation names what is inside it (2026-09-08)

Ellis: *"we need to fix the menu. the builder thing is important. why is it so
hard to find? the entire organisation seems .. sub par."*

**The panels were grouped by which part of the save they touch**, not by what
the player wants to do — the drinks and the upgrades in one, everything
reading `purchased`/`placements`/`tiles`/`customisation` in the other — and
then labelled **"café"** and **"shop"**, two words that mean the same thing to
somebody holding a phone. Neither says the walls are behind one of them.

- **The nav is `to do · cats · menu · room`.** Somebody looking for their floor
  taps *room*; somebody looking for a drink taps *menu*. That rename is most of
  the fix, and it cost nothing.
- **The builder leads the room panel.** It was the *last* card on that page —
  under a banner, five departments and the arrange tile, eight things down —
  which is exactly why it could not be found. It is also the only tool that
  changes the *shape* of the café rather than what is standing in it, so it now
  opens a section of its own ("the room itself") with the colourways beside it.
- **Nothing is called the same thing twice.** A card named "the menu" used to
  sit inside a panel titled "your café" next to a section header also called
  "the menu"; it is "what sells" in a "drinks" section now. Two things with one
  name is the muddle, in miniature.
- **The walkthrough's hints and its arrow paths move with the labels.**
  `GUIDE_PATHS` keys off `data-guide`, so a rename that misses them leaves the
  arrow pointing at nothing — and the hint text is written out longhand
  ("room → for the cats → cat bed"), so it has to be kept in step by hand.

**It is sold in the shop, not in a menu of its own** (moved 2026-08-10, at
Ellis's request). A separate "style" button was a second storefront for the
same fantasy, and the worse one: the shop shows you the furniture turning on a
lit stage, the Style menu showed you hex squares. Colourways are now the shop's
last tab, paging through the pieces the same way, with the swatch row where a
furniture page has its buy button — and **pressing a swatch shows that colour
on the stage before you pay**, locked ones included. Holding a piece in the
café still opens its colourways directly (`ui/furniture-editor.ts`); that is
the quicker route once you know it exists, and the two share `.style-tile` so
they read as the same control.

> The venue ladder that used to occupy this section — seven cafés, ×262,144
> income — was built on 2026-07-31 and scrapped the same day. See the
> direction-change box in §0 before proposing anything shaped like it.

**Upgrades** are a data-driven catalog (`data/upgrades.ts`) and there is now
exactly **one** lever in it:

| id | what it buys | effect |
|---|---|---|
| `brews` | better brews | +% pay per guest |
| `till` | a bigger till | +50% of the base till capacity per level |

`till` is the one lever added since this table was emptied, and it was checked
against the rule below before it went in: a bigger till is a **capacity**, and
the shop has no vocabulary for capacity — every item it sells grants appeal,
which is a rate. If a "second register" ever exists as furniture, this lever
should die and be replaced by it, exactly the way `seating` and `decor` did.

**Appeal is not sold here any more — it comes off the furniture** (2026-08-10).
Every `ShopItem` carries an `appeal` value and `cafeStats` takes their sum, so
making the café more appealing means putting something in it. The retired
levers, and why, because the pattern repeats:

- `seating` went when the café became one fixed room — seats come from
  arranging furniture.
- `hands` (shorter visits) went because with five seats and gentle arrivals the
  seats never bottleneck, so it bought nothing.
- `decor` ("cosy touches") went because it was **competing with the shop and
  losing**: you paid, a number moved, and the room looked identical. Ellis:
  *"it… takes away from the cafe builder aspect we provide from the shop
  option."*

Before adding a lever, check it isn't better expressed as something the player
can put down and look at. That test is what emptied this table.

**Three pricing rules that follow from it**, and they decide how future content
gets priced rather than being facts about what shipped:

- **Everything that costs money must raise appeal** — coffees, add-ins, blends,
  floor, colourways, furniture. A purchase that only moves a hidden multiplier
  is one the player cannot *feel*, which is precisely why "cosy touches" was
  retired. And the rise must be **visible**: the appeal chip pops, then the
  takings chip pops a beat later, because the delay is what makes the two read
  as cause and effect rather than two numbers twitching at once.
- **Buying a second of something taps off.** Copies get a rising price and half
  appeal: two plants are lovelier than one, ten are not ten times lovelier, and
  without the taper the cheapest item in the shop is an appeal machine.
- **A change of mind is not something to charge for.** Money **and xp** move
  when the piece *lands* (`settlePurchase`), not when the button is pressed —
  the till must not drop, and the level ring must not fill, for a decision the
  player has not finished making. Cancelling then has nothing to undo, which is
  the point: an award that has to be clawed back is one the player already saw,
  and watching a level-up reverse itself is worse than never having had it.
  Taking a window out again refunds in full.
  **Every buy path has to be checked, not just the one that was reported.**
  This rule was written for the shop, implemented in `buyShopItem`/`buyCopy`,
  and `buyBed` went on charging and granting on the button press for another
  fortnight — so the *first* purchase a new player ever makes, the one the
  walkthrough asks for and the one most likely to be cancelled, was the one
  case still doing the wrong thing (Ellis, 2026-09-19: *"its still like giving
  me the xp and reward for buying something BEFORE i place it"*). Grep
  `grantXp` and `pendingPurchase` together when touching this.
- **An upside-only mechanic has to be checked in the *unavailable* direction,
  not just the neglected one.** Chores pay appeal while fresh and nothing while
  due, which is the pillar-1 shape — but "fresh" was written as "not due", and
  a job whose subject the café has not got is never due either. So *not owning
  a table* paid better than owning one and letting it get crumby. Whenever a
  reward is defined as the absence of a penalty, ask what happens to something
  that can never incur the penalty at all.
- **Ask what a reward can be reached without doing.** Giving a newly bought
  piece of furniture a grace period before its chore comes due is obviously
  right — and a grace stamp is *indistinguishable from a completion*, so the
  first version let a player brick up a window and re-glaze it (a full refund,
  £0) to collect the chore's appeal every four hours without ever wiping
  anything. No test fails on this; only the question finds it.
- **A step that is free the first time is not free the second time.** The
  walkthrough measures every task against a baseline taken when the step began
  — "buy one *more* bed" — which is what lets a full café replay it. The
  *prices* have to follow: the first add-in is on the house and the first
  armchair has never been bought, so both read as free on a first morning and
  cost £90 and 1.45× on a second. Reading them from the live curve rather than
  writing them down is the fix, and the general rule is that **anything priced
  "0 because it's the first one" needs asking what the second one costs.**
- **A step nobody could finish must never be a step that is waited on.** The
  menu caps at four blends and the shelf runs out of add-ins, so a replay can
  reach a task with no possible completion — and a task line cannot be tapped
  past, on purpose. Waiting on one is a trap with the arrow still pulsing at a
  panel that will not help (pillar 1). `taskPossible` in `systems/tutorial.ts`
  is where "can this be done at all, with any amount of money?" is answered,
  and it is a *different question* from what it costs.
- **The price shown and the price charged must be one call.** When the button
  and the transaction each compute the cost from their own count, the two can
  be individually correct and still disagree — and the symptom is an *enabled*
  button that makes its sound and does nothing, which reads as a broken game
  rather than as "you cannot afford this". It happened with expansion: the
  marker counted `ownedPatches`, `buyTile` counted `tiles.length` (which
  includes `HOME_TILE`), so every square was priced and gated one step ahead of
  the offer. **A price disagreement needs a test that spans both sides** —
  neither half can catch it alone (`state/expansion-purchase.test.ts`).

- Levels are stored sparsely (`{ brews: 2 }`); an absent id means level 0, so adding upgrades never invalidates an old save. `systems/upgrades.ts` clamps unknown, negative, and out-of-range levels rather than trusting the save — which is also why removing one can never corrupt a save, only quietly stop counting. **Refund it anyway**: v12 hands back what was spent on `decor`, because the appeal it bought is now on sale in the shop.
- `scene/cafe-room.test.ts` asserts the fully-stocked café has no clipping furniture, keeps cat spots clear, and leaves a walkable door→seat line (visitors lerp straight to their seat — there is no pathfinding to route them around a plant).

### ⭐⭐ The goal ladder — the actual answer to D7 (2026-09-08)

Ellis, having played it: *"finish the tutorial and i got 500 bux and idk what
to buy as a new user and dont know i should buy … i quickly run out of things
to do — clearly wiping the stuff every now and then isnt enough and could be
just more of a chore than anything else … this has no retention properties."*

**Read those as one complaint, because they are.** The café had *systems* —
furniture, cats, a menu, floor, colourways, chores — and no *structure over
them*. A shop with fourteen unlocked rows and no opinion about which one
matters is not a choice, it is a wall of buttons. And a game whose only prompt
is a chore that comes due on a timer is telling the player their job is
maintenance, which is the opposite of the fantasy.

**§0 reached for content every time it hit this** — more furniture, more
colourways, more cats — for two months. That was the wrong axis. The genre's
retention spine is a **goal ladder**, and a catalogue is only legible once
something tells you why you wanted the next thing in it. `data/goals.ts` +
`systems/goals.ts`:

- **Three at a time, in order, finished ones first.** Never a wall.
- **Every goal names a verb the player already has.** Nothing needed a new
  system; they observe state the game already keeps. A new goal is a row.
- **They pay out**, generously early. The £500 problem is that the
  walkthrough's gift was the *last* money a café was ever given.
- **Nothing expires, nothing is lost** (pillar 1). There are no timed goals in
  here and there should not be — "do this before Friday" is the exact anxiety
  §1 forbids.
- **They tick over while you are away**, so returning has something waiting.
  That is the honest version of a reason to come back, rather than a
  punishment for having left.
- **It ends**, and says so. A ladder with no top is a treadmill.
- `goal_claimed` is now the sharpest retention signal the game has (§4): where
  people stop claiming is where they stop playing.

### The menu had to become visible first (2026-09-08)

Ellis: *"the coffee blend section seems a bit random and unnecessary."* It
was — **literally**. Sales were tallied by rolling a random menu item at the
moment of payment, so no guest ever *had* a drink: the chart was a random
tally, and inventing a blend moved a hidden multiplier. Three changes make the
menu a thing that exists in the room:

- **A visitor carries an order**, chosen when they walk in (`Visitor.drinkId`).
  It shows over their head at the counter (`ui/order-chips.ts`), it decides
  what they pay, and it is the cup the chart counts. Expected value across
  guests is unchanged — same picker — so the balance holds, but a guest holding
  your £2 blend now visibly pays more than one holding filter coffee.
- **A new blend gets tried.** `pickOrderWithNovelty` weights a player's own
  blend ×3 until it has sold three cups. At a fair roll most players would
  close the app before anyone ordered the drink they just named, and that first
  order *is* the payoff for the whole feature.
- **The first sale is announced** — `blendFirstSale`, once per blend, ever. A
  stranger ordering the thing you named is the same trick as naming a cat (§8):
  the name comes back at you.

### ⭐ The café editor — the answer to D7 (specified 2026-08-06, NOT YET BUILT)

Ellis, after the first device build: *"we need more things to do. its like so
idle its not engaging… instead of just basic ass cafe upgrading we need to like
develop a cafe design thingy… like clash of clans has village editor designer
thing. itll be a lot of effort to ensure this is correct but worth it and is a
reason for users to actually stay on the app."*

**This is the right call and it should be believed.** §0 has recorded "no answer
to D7" for weeks; §1 says decoration and customisation are "the features this
audience reliably rewards"; the Style menu was a four-slot down payment on
exactly this. A build-and-arrange editor is the genre's proven retention
engine, and it converts every future art asset into content automatically —
one new chair is a new shop row, not a new system. Treat the whole of this
subsection as the current design target.

**Everything below is specification, not built.** Nothing here exists in code yet.

#### 1. The café starts nearly empty, and the player furnishes it

**Decided 2026-08-06:** *"keep this cafe as default just lose most of the
furniture except a few plain default things."* So the room — shell, walls,
window, floor, and a small plain starter set — **stays exactly as it is**. What
goes is the dressing: the cascade shelf, the cake display, the cushion cluster,
most of the props. That is a much smaller change than a from-scratch empty room
and it preserves the thing the layout was expensive to get right (§9
"Rebuilding from the sample scene"). The authored diorama becomes the
**art-direction reference we match quality against** and the *target* a player
builds back toward, rather than the state they start in.

Concretely: `data/cafe-layout.ts` splits into a fixed **shell**, a small
**starter set**, and a **catalogue** of everything else — the same entries,
just no longer all placed at build time.

Architecturally this is the big one:

- `data/cafe-layout.ts` goes from *authored constant* → *catalogue of placeable
  pieces* plus a small fixed shell (floor, walls, door).
- **Placement moves into the save**, which means a **v8 migration** and a real
  design question about what an existing café migrates to. The layout is
  already data and `scene/cafe-room.ts` already resolves pieces by *slot* from
  the save (`assetFor`), so the groundwork is better than it looks.
- `scene/cafe-room.test.ts` currently asserts a fixed layout has no clashes.
  That test's *job* changes: it should become the **placement validator** the
  editor itself uses at runtime — the same bounding-box logic answering "may
  this go here?" — rather than a check on one authored arrangement.

#### 2. Shop → ghost → drag → snap

- A **shop in the menu, organised by category** (seating, tables, cat
  furniture, plants, wall pieces, floor pieces, counters, decorations).
- Buy a piece, and it enters the room **semi-transparent** ("goes like
  transparent ish") as a placement ghost.
- **Drag it, and it snaps** to valid positions. Snapping wants a grid — the
  café is tile-modular already (§9: "architecture is tile-modular"), so the
  wall tile is the natural unit, probably subdivided for small props.
- Invalid positions must read as invalid *while dragging*, not on release.
  Colour the ghost (warm tint = fine, muted red = blocked). Never bounce a
  piece back with no explanation.
- **Visitors lerp straight to their seat — there is no pathfinding** (§8). So
  the validator must keep a walkable door→seat line, or players will
  accidentally build cafés where guests walk through the furniture. This is
  already tested for the fixed layout; it becomes a live constraint.

#### 3. Tap vs hold on placed furniture

- **Tap** and **hold** do different things ("dif things for dif
  functionalities").
- Hold plays **"a satisfying little holding animation"** — a progress ring or a
  gentle squash that builds — *before* the menu appears. This is a §10 juice
  requirement, not a detail: the anticipation is the satisfying part.
- The menu offers at least **change colourway** (the Style menu's colourways
  become per-object rather than per-slot) and **move**, presumably also **sell
  / put away**.
- Existing precedent to reuse: `CatManager.pick()` already raycasts for petting
  (§10), so object picking is solved; this needs a hold timer and a radial or
  popup menu.

#### 4. A free camera

Ellis: *"i need to be able to zoom and drag the camera around freely."*

**This modifies §9's framing rule rather than breaking it — read that section
before touching `scene/camera.ts`.** The rule exists because a hard-coded
camera cropped the café off the sides of every phone. Under a free camera the
solved `FRAME_BOX` distance becomes:

1. the **default and reset** framing (what you see on launch), and
2. the **outer bound** for zoom-out, so you can never pull back past a
   correctly-framed café into empty space.

Pan wants clamping to the café's extent plus a margin, and the clamp has to be
computed per aspect ratio for the same reason the distance is. Do **not**
reintroduce a literal `camera.position.set(...)`.

#### 5. Expansion: buy floor, then choose the architecture

Ellis: *"expanding the cafe should be possible so you can buy with cash another
section of the floor like an expansion and then pick which wall and stuff and
change window etc."*

This is the good version of progression under the §0 direction change — it
grows *one* café rather than replacing it, so it doesn't resurrect the venue
ladder. Constraints that already exist and bind here:

- **§9's portrait framing.** "Growing the footprint pushes the camera back on a
  phone." An expanded café must still frame on a 393×852 screen, which puts a
  hard ceiling on how far this can go. Check framing at every expansion tier.
- The wall set is **tile-modular with handed pieces** — `Light` is authored on
  −x, `Dark` on −z, and `_End_XL` is the big sweeping arch (§9 "Walls"). A wall
  picker is therefore choosing from a real, constrained kit, and the naming
  traps in that section will bite anyone building this.
- The §0 direction box's "at most one small extension later — a patio or a
  nook. Never a chain" was written against the venue ladder. **Ellis has now
  explicitly asked for more than that**, so the hard limit that survives is the
  *readable money* one, not the footprint one.

#### 6. Cats: capacity, rehoming, and a life cycle

- **Max cats scales with floor area** ("based on how many square metres the cafe
  is"). This is elegant — it gives expansion a second, emotional payoff and
  replaces the flat `ECONOMY_CONFIG.maxCats = 5`.
- **Put a cat up for adoption**, so a full café is a choice rather than a wall.
- **Per-cat stats: age, health, hunger**, with a **feeding** system that "needs
  topping up". Cats **age and eventually die**.

> **✅ DECIDED 2026-08-06 by Ellis — both of the risky halves are settled.**
>
> **No cat death.** *"forget cats dying for now."* Pillar 1 and §8's "never lose
> a player's cats. Sacred." stand unbroken. Aging can still exist as *visual*
> progression (kitten → adult → senior) if it earns its keep, but nothing
> irreversible happens to a named cat. Do not reopen this without Ellis.
>
> **Feeding is upside-only.** *"maybe feeding them only boosts happiness and
> activity making them move around more or something."* This is exactly the
> right shape and it matches the mechanic already shipped: §8's contentment
> says of petting, "an unpetted cat still earns its full base rate, nothing
> decays, nothing is lost." Feeding copies that — a fed cat is happier and
> **visibly more active**, wandering the café rather than sitting. **Nothing
> decays into harm; there is no sick cat and no penalty for being away.** The
> reward for feeding is that the café looks more alive, which is a cosy reward
> rather than a numeric one, and it is worth protecting that framing.
>
> Note what this makes possible: "activity" gives the cats somewhere to *go*,
> which pairs directly with the editor — cat furniture the player places is
> only interesting if cats actually use it.

#### 7. Sequencing — do not build this in one go

It is a large piece of work and §17 says build one system end-to-end rather
than half-finishing several. A defensible order, each step shippable:

1. ~~**Performance first.**~~ ✅ 2026-08-06 — MSAA removed, DPR 2→1.5, frame
   cap at 30 with a lift to 60 during gestures (`core/loop.ts`).
2. ~~**Free camera** (pan + zoom).~~ ✅ 2026-08-06 —
   `scene/camera-controls.ts`. Pan/pinch/wheel, clamped so zoom-out never
   exceeds §9's solved fit distance and pan never loses the room. Angle is
   fixed; see that file for why orbiting fights the cutaway diorama.
3. ~~**Tap/hold menu on existing furniture**~~ ✅ 2026-08-06 (recolour half).
   Hold any customisable piece → charging ring → docked colourway sheet.
   `scene/furniture-picker.ts` + `ui/furniture-editor.ts`. **Move is not built**
   — it belongs with snapping in step 4, and a menu with a dead "move" button
   would be worse than one without it.
3b. ~~**Tap/hold menu**~~ — **removed 2026-08-11.** The shop replaced it; see
   the session log. Do not rebuild it.
4. ~~**Placement + snapping + the validator**~~ ✅ 2026-08-07 — hold a piece →
   "move it" → drag a translucent ghost that snaps to a 0.25 grid and tints red
   where it can't go, with the reason spelled out. `systems/placement.ts` is
   pure and tested; `scene/furniture-mover.ts` drives it. Saved as v9.
   **Ten pieces move**, including every seat and the prop-laden side table —
   see `Placement.movable` and `Placement.attachTo`.
5. ~~**The shop**~~ ✅ 2026-08-07 — `data/shop.ts`, five categories, twelve
   items, and the café now starts bare. **Seats are in the shop as of
   2026-08-25**: `CafeStats.seats` is a list of indices rather than a count, so
   a seat can be unbought without shifting anybody else's chair.
6. ~~**Expansion**~~ ✅ 2026-08-16 — `data/expansion.ts` + `scene/cafe-tiles.ts`.
   Ghost tiles with a price in the room; walls assemble themselves from the
   kit; framing follows the floor. Windows are *not* pickable per tile and
   never will be: one window shape is baked into each style's wall piece.
7. **Cat capacity + rehoming**, then the life cycle once Ellis has ruled on the
   box above.

**What this displaces:** the LTE framework (§8) was "next up" as the
highest-ROI retention feature. The editor now outranks it, and for the reason
§0 already gives — an LTE framework "adds no playable content" without authored
events, whereas the editor generates its own content indefinitely. LTEs get
*better* after the editor exists, because limited décor becomes a real prize.

### Limited-time events (LTE) framework — the retention engine
Build a **repeatable event system early** (seasonal themes, special/collab cats, limited décor). This is the single highest-ROI retention feature in the genre — the vast majority of mobile IAP revenue comes from games running live-ops. Design it as data-driven event definitions in `/data` so new events are content, not code.

### Save / load
Single source of truth = the Zustand store, serialised to storage. Autosave on every meaningful state change and on app background. Include a `version` field and a migration path so updates never corrupt saves. **Never lose a player's cats.** Sacred.

> **Autosave is a throttle. Never make it a debounce again.** From the day it
> was written until 2026-08-05 the periodic autosave did not run a single time:
> `tick()` calls `set()` on every animation frame, so a `clearTimeout` /
> `setTimeout` pair was rearmed every ~16 ms and its delay could never elapse.
> **Never debounce a signal that fires every frame — debounce waits for quiet,
> and a running game never goes quiet.** It survived because a browser saved on
> the way out via `pagehide`, so the only environment that exposed it was the
> one without page lifecycle events: an actual iOS app, where Ellis found it
> immediately by quitting. `state/save.test.ts` now pins the awkward property —
> *a store that never stops changing must still reach storage* — and those
> tests were confirmed to fail against the old debounce before being kept.
>
> The lesson generalises past this bug: the save path's failure mode is
> **silence**. Nothing throws, nothing logs, and every test of `loadSave` still
> passes, because the data that never arrived is indistinguishable from a new
> game. Test that writes *happen*, not just that they round-trip.

> **A sanitiser's drop rule must be written as the rule, never as a list of
> what exists today.** `sanitizeInstances` said `if (item !== CAT_BED_ITEM)
> continue` — correct on the day the cat bed was the only thing with instances,
> and silently deleting furniture from the day `buyCopy` let any shop item be
> bought twice (found 2026-08-26: *"i noticed a chair i bought randomly
> dissapeared one time after relogging back onto the game a few hrs later"*).
> The rule it meant was "drop an item the catalogue no longer has", i.e.
> `!shopItem(id)`, which is exactly what the same function does for
> `purchased` eight lines above. **Ask what a filter lets through, not only
> what it keeps out** — and note that this failure looks like nothing at all:
> the café that comes back is a perfectly valid café.

**Currently at v26.** Migrations are a chain in `state/save.ts`: each entry bumps exactly one version, and `loadSave` walks a save forward from whatever version it's on. Adding a version means appending one migration and one test case to `state/save.test.ts` — which every version must have, because this is the one place a bug costs a player their cats. (v1→v2 added `savedAt`; v2→v3 added `upgrades`; v3→v4 added `venueIndex` plus an optional `contentUntil` per cat; v4→v5 **removed** `venueIndex` with the venue ladder and clamped old billion-pound balances into the new readable range; v5→v6 is the deliberate one-time break described in §0; v6→v7 rehomes an *untouched* sofa/rug choice onto the new free default without touching a bought one; v7→v8 split the floor out of the wall style; v8→v9 added `placements`; v9→v10 granted an existing café the whole shop catalogue; v10→v11 marked existing players as having finished character creation; v11→v12 dropped the retired `decor` upgrade and **refunded** it; v12→v17 added the coffee menu, expansion tiles, purchasable backdrops and cat beds (v16→v17 grants every existing cat a free bed, since capacity became bed count); v17→v18 seeds `windows` with the café's own back window, which had been hard-coded in the layout — miss it and the café wakes up bricked in; v18→v19 grants the floor cushions, which moved into the shop; v19→v20 marks an existing café as having already seen the guide, so a finished café is never shown a tutorial; v23→v24 adds the tip jar, empty — nobody tipped into a jar they did not own; v25→v26 adds the goal ladder, **empty** — an existing café has already done the early rungs and comes back to a list it can claim, which is the right way round: the rewards are for having built the café, and they built it; v22→v23 adds chores and stamps `openedAt` at *migration time* rather than
zero — a zero would make every chore overdue by decades and greet a returning
player with three jobs at once; v20→v21 withdraws the floor cushions the v19 grant handed out — the only migration that *removes* anything, and safe only because it can never take back something that was bought. Cats and names always survive.)

### The small-café economy (rebalanced 2026-07-31)

Every number was rescaled when the empire fantasy was scrapped (§0). The shape
now, verified by `npm run balance`:

| | |
|---|---|
| Starting money | £40 |
| Welcome gift | £500 when the guide leaves, once ever (`welcomeGift`) |
| Second cat | £45 — reachable in the first minute, which protects D1 |
| Eighth (last) cat | ~£1,800 |
| Cheapest upgrade | £40 |
| Dearest upgrade level | ~£3,200 |
| Income at full build-out | ~£81/min |
| **Till capacity** | **£1,000**, up to £4,000 with the `till` upgrade |
| Money ceiling | **none** — the till is what is capped |

### The till — where the money goes before it is yours (2026-08-26)

Ellis: *"lets make a till feature that collects up to 1k at first and this is
where all the money goes, u tap to collect to ur bank account. that way u cant
just go offline for 4 days and come back to being rich. the limit for money is
9999 which it shouldnt be there should be no limit."*

**This replaces the £9,999 ceiling on money, and the swap is the whole idea
rather than a tweak.** Both designs stop a café hoarding for ever — the sim
used to hit £34 million in thirty days without one — but they cap different
things. The old ceiling capped **how much you could own**, which is a wall, and
a strange one: a café doing well was told to stop. The till caps **how much can
pile up uncollected**, so what is bounded is the reward for being *absent*.

Rules, all load-bearing:

- **Everything the café earns lands in the till** — visitors while you watch,
  idle income while you are away. `money` only ever rises from a collection, a
  chore, a refund, or a gift.
- **A full till stops taking money; it never loses any.** Pillar 1 — nothing
  decays, nothing is taken. The café simply has nowhere to put the next coin.
- **Four days away and four hours away come home to the same full drawer.**
  That is the sentence the mechanic exists for; `state/till-flow.test.ts` pins
  it. Measured in `npm run balance`: an AFK player's thirty-day offline take
  went from £33,138 to £7,000, and a devoted player's share of income earned
  *while present* went from 22% to 61%.
- **It must never become the game.** A till that fills faster than the player
  would naturally check in turns a small pleasure into a chore with no
  minigame attached. That is what the `till` upgrade is for: capacity is meant
  to grow roughly in step with income, so the *rhythm* stays constant.
- **Tips go to the bank, not the till** (`collectTips`). The jar is money left
  for *you*; the till is the café's takings. It also means a full till can
  never block the jar, which would be a rule the player cannot see.
- **It is a thing on the counter, not a chip in the corner** (2026-08-27).
  Ellis: *"ideally the till is a real object that can be upgraded and tapped on
  to collect and is visible."* The cashier has stood on that counter since the
  room was rebuilt from the reference render and nothing ever said it was the
  till. Now a marker floats on it when there is a quarter of a drawer or more,
  says how much, and collects when tapped (`data/till.ts`) — and **each level
  of the `till` upgrade puts a different till on the counter**, because §8
  requires a purchase to be visible and this was the last lever in the game
  that only moved a hidden number.
  - **A marker, not a raycast on the mesh.** The cashier is 0.59 × 0.19 on a
    counter seen from across the room; asking a thumb to hit it is a game of
    darts. The marker anchors *on* the object, which is what makes it read as
    tapping the till without demanding the precision of actually doing so.
  - **The HUD chip stays.** It is the readout, and the way to collect when the
    camera is somewhere else. Removing it to make a point about diegetic
    controls would be a downgrade nobody asked for.
  - **It prompts at a quarter full, where the tip jar only opens when full.**
    Opposite shapes: a jar you can empty at any level teaches constant tapping
    for pennies, while a till that is only worth collecting at the brim means a
    player has been throwing away the capacity they paid to raise.
- Money is unbounded now, and `ui/format.ts` still never abbreviates. What
  keeps figures short is the *rate*: the bank grows at the speed somebody taps,
  not the speed time passes.

Two other things changed shape rather than scale:

- **Guests arrive every ~20s**, not every second, and linger 6s. The café
  should feel *gently* active. Frantic isn't cosy.
- **One upgrade lever remains** — brews (pay). Seating went because the café is
  one fixed room; service speed went because with five seats and gentle
  arrivals seats never bottleneck; décor went because the shop sells the same
  thing and actually shows it (see the table above). The variety that replaces
  them is furniture, colourways and recipes, not more sliders.

### Progression pacing — and why offline income is deliberately weak

**The problem this solved.** Active play used to earn *exactly* the same rate as
having the app closed. Nothing in the game rewarded being present, so the
optimal strategy was genuinely to leave it alone and come back later. An idle
game still has to be a game.

Three changes, in order of importance:

1. **Petting cats does something.** A petted cat is *content* for 4 hours and
   its appeal is multiplied (`ECONOMY_CONFIG.contentment`). This is the only
   mechanic that rewards presence. It stays cosy by being an invitation, not a
   punishment — an unpetted cat still earns its full base rate, nothing decays,
   nothing is lost. A player who ignores it entirely is never worse off than
   before this existed.
2. **Contentment carries into offline income.** Whatever contentment is still
   running when you close the app keeps paying while you're away
   (`computeOfflineEarnings` splits the away window into contented and base
   stretches). This is what makes a thirty-second ritual — open, pet, close —
   meaningfully beat not showing up, without demanding long sessions.
3. **Offline pays 30% of the live rate, capped at 8h.** Away time is a kind
   catch-up, not a superior strategy. Eight hours is "a night's sleep", which
   is a cosy framing and also means checking in twice a day beats once.

Net effect, measured: **an hour playing with petted cats earns ~6.6× an hour
with the app closed.** If that ratio ever inverts, the game is broken;
`systems/offline.test.ts` guards it.

### Progression pacing
Early game (first 5–10 min) must reward fast — first extra cat quickly, visible growth (this directly protects D1). Mid/late game slows into satisfying idle accumulation. Keep pacing values in config so they can be tuned from data.

---

## 9. Art direction

- **Style:** low-poly 3D, warm and soft. Rounded over sharp. Cohesive palette (warm creams, soft browns, muted pastels — cosy café, not neon).
- **Lighting is bright, warm and high-key.** See "Lighting" below — this has
  been tuned wrong in both directions and the rule is easy to misread.
- **`graphics/` holds the reference renders.** Ellis drops target images there.
  They are the brief for lighting and palette; when in doubt, open them and
  compare side by side rather than reasoning about it.

### Lighting: bright is not the opposite of warm

**Read this before touching `addLighting()` or `addLightShafts()`.** It has been
tuned wrong three times, each time by over-correcting the last mistake.

| pass | what it did | why it was wrong |
|---|---|---|
| 1 | high ambient, strong key, generous exposure | flat and washed out |
| 2 | low fill, warm key, three interior pool lights | *"really dim and moody"* — pale peach walls rendered brown |
| 3 | strong **flat** ambient, no pools | bright but dead, and blown out — *"i cant even see the soft light beams"* |
| 4 (current) | **gradient fill + volumetric shafts** | — |

Three things make the current pass work, and they're separable:

1. **Fill is gradient, not flat.** Most of it is a `HemisphereLight` (~1.2) with
   only a small `AmbientLight` (~0.4) underneath. This is the important part: a
   flat ambient adds the same value to every surface at every angle, which is
   bright but *dead* — pass 3 was a lightbox. Hemisphere fill varies with the
   surface normal, so walls, floor and ceiling separate from each other and the
   room gets its soft top-to-bottom gradient for free.
2. **Exposure leaves headroom** (~0.92). Pass 3 sat at 1.05 with walls near
   white, and **that is why the light shafts were invisible** — additive light
   has nothing to add into when the room is already at the top of the range.
   If beams stop reading, suspect exposure before you touch the beams.
3. **The shafts are a real volume**, not a glow sprite. See below.

The reference renders in `graphics/` are the brief for tone: warm, evenly lit,
saturated accents, soft low-contrast shadows, walls a definite peach rather
than near-white. If a future pass wants more mood, get it from palette and
time-of-day colour, not by turning the lights off.

#### Post-processing: where "soft" actually comes from

Added 2026-08-01 after Ellis, comparing against `graphics/K9gvnT.png`:
*"everything looks smoother, softer, gentler."*

**Lighting alone was never going to get there.** What separates a Blender
render from a raw WebGL frame is not the lights — it is contact shadow and edge
quality. Three passes in `createScene`, each doing exactly one job:

1. **GTAO** — ambient occlusion, and the big one. Warm fill with no occlusion
   makes every join look like a sticker: a chair meets the floor with nothing
   to say the two touch. AO darkens creases and contact points, and it is most
   of why reference art reads as *soft* rather than flat. Keep it gentle —
   heavy AO reads as grime. Small radius, so it's contact shadow rather than a
   haze hanging in the middle of surfaces.
2. **Bloom** — a warm bleed where the window blows out. **Threshold must be
   above 1.0.** Bloom runs before `OutputPass`, so it sees *linear* values, and
   the cream walls sit near 0.9 there — a threshold of 0.92 haloed every wall
   edge in white. Only genuinely over-range pixels should qualify.
3. **SMAA** — the renderer's own MSAA is bypassed the moment anything renders
   through a composer, so without this the diorama's long diagonal silhouettes
   staircase visibly. It must come last.

`OutputPass` carries the tone mapping and colour conversion the renderer would
otherwise do itself. Move it in the chain and the whole image shifts.

**Cost:** the bundle went 637 kB → 751 kB, and GTAO is the most expensive thing
in the frame. **Untested on a real device** — if a mid-range iPhone struggles,
drop GTAO first (it is the costly pass), not SMAA (it is cheap and it is doing
visible work).

#### The light shafts, and the shell trap

`addLightShafts()` ray-marches a box in object space: reconstruct the view ray,
slab-intersect the unit cube, take ~28 samples, accumulate a density function
(feathered cross-section × glazing bars × falloff along the beam).

**It ray-marches because shading the box's surface cannot work, and the reason
is worth remembering:** every face of the box lies exactly where one of the
falloff terms is zero. The end caps sit at `along = 0`; the four side faces sit
at `radial = 0`. So a shell renders as nothing at all — the bright interior is
never rasterised. The shader compiled, the geometry was correctly placed, and
the result was invisible. If a volumetric effect renders as nothing, check
whether you are only drawing its skin.

Two other things that cost time here:
- **The beam starts at the glass, which is *inside* the wall.** The window wall
  is 0.68 thick, so a falloff that begins fading at t=0 spends its whole bright
  section buried in masonry and emerges into the room already dying — it read
  as a glow stuck to the window. The falloff holds full strength to t≈0.35.
- **Glazing bars are what make it read as a window.** Without them the volume
  is a glowing wedge. They're a `fract`-based mask on the cross-section, and
  they need to bite hard (down to ~0.08) to separate into distinct shafts.

### The interface: chalkboard signage, not another cream card

Redesigned 2026-08-01 after Ellis's verdict on the first pass — *"the buttons
look like shit… it looks like it's done in Microsoft Word."* He was right, and
there were two separate causes.

**The type wasn't loading.** The first pass specified `ui-rounded`, which only
Safari implements, with `"SF Pro Rounded"` behind it — a macOS *system-hidden*
font Chrome will not match by name. So the whole stack fell through to
`system-ui` and the intended design was never once on screen during
development. **A packaged app must not guess at what the OS will hand it:**
the UI face is now bundled at `public/fonts/recursive.woff2`.

**Recursive** (Arrow Type, SIL OFL 1.1) is one 139 kB variable file doing three
jobs, which is why it beats three separate faces:

| voice | axes | used for |
|---|---|---|
| display | `CASL 1`, weight 800 | panel titles, cat names, the adopt button |
| UI | `CASL 0` | everything else |
| receipt | `MONO 1` | **every figure** — prices, the till, stats |

The mono axis is not decoration: a monospace price column is what printed café
matter actually looks like, and it makes figures scan.

**Three rules the design rests on. Breaking any of them is what made the first
pass generic:**

1. **Signage is dark.** Cream panels over a warm cream-lit café dissolve into
   it — that is precisely why it read as floating text boxes. Panels and chips
   are warm slate with chalk type, taken from the blackboard hanging on the
   back wall. It gives contrast *and* it belongs to the building.
2. **Honey is a verb.** Exactly **one** element is filled honey — the adopt
   button, the thing to do next. Everything else earns honey only to signal
   state (affordable, chosen). The old build had five competing gradient
   buttons, which is what said "mobile game" more than anything else.
3. **Prices are set like a menu**: name, dot leaders, price. The leaders are
   the signature device and they encode something true — *this thing costs
   that much* — rather than decorating the row. See `.upgrade-name::after`.

Supporting discipline, and the sheet is short enough to keep it: **five type
sizes, three radii, one shadow**. The previous sheet had seventeen font sizes
and nine radii, and was two stylesheets stacked — a design pass appended below
the original that overrode it rather than replacing it, leaving `.money-pill`
and `.adopt-button` each defined twice plus ~120 lines of dead venue-ladder
CSS. If you find yourself appending an override block, rewrite the rule instead.

A locked style swatch stays **coloured but muted**, never greyed: the colour
you're working toward is the whole reason to work toward it. Likewise an
unaffordable price stays fully legible — you should always be able to see what
you're saving for.

**The voice is lowercase.** Every word the interface says — labels, titles,
buttons, rarities — is set lowercase, and it's enforced in CSS as well as
written that way in source so a stray capital can't break the register. The one
exception is deliberate and load-bearing: **cat names keep the player's own
capitals**, because they're the one piece of text in the game the player wrote,
and leaving them untransformed is part of what makes them feel like names (§8).

**There is a credits screen, and almost nothing in it is owed** (settings →
credits, `data/credits.ts`). The art packs and the cat recordings are CC0 and
the font asks only that its licence travel with the file. It exists because a
café built almost entirely out of one artist's work should say so — §5's
argument that this audience rewards not being taken for granted, pointed at the
people the game is made of rather than the people playing it. **The music
section is derived from `data/tracks.ts`**, so a track added to the soundtrack
cannot end up uncredited.

**Icons are drawn, in `ui/icons.ts`. Never emoji.** Emoji are somebody else's
art in somebody else's style, they render differently per platform, and beside
real typography they're the clearest amateur tell a UI has — the same argument
this section makes about mixing asset packs. House style: solid silhouettes
rather than line art (the café is chunky and soft; hairlines read as a
different product), a 24×24 box, `currentColor` only so one icon works on both
a slate chip and the honey button, and no detail below ~1.5px.

**The exception is a *portrait*.** Cat faces (`ui/cat-face.ts`) and the chore
markers' subjects (`ui/chore-art.ts`) carry real colour, because the thing they
depict is identified *by* its colour and markings — sixteen colourless cats are
sixteen identical circles, and a colourless pane of glass is a rounded
rectangle. Take the palette from the café's own customisation swatches so the
picture and the room agree. Everything that is a *control* still follows the
`currentColor` rule above.

Three traps worth knowing, all hit while drawing these:
- **Draw at the size it will be seen, not the size it is drawn at.** Both chore
  tiles that had to be redone looked fine in the file and failed at 26px: a
  wood tabletop on a wood ground read as a doughnut (**a silhouette needs
  something to be a silhouette against**), and three straight stray hairs on a
  fur tuft read as a starburst. Render a contact sheet at the real size before
  believing any of it.
- **A same-coloured stroke over a same-coloured fill is invisible**, whatever
  opacity it carries. The coffee bean's crease has to be a real gap between two
  shapes, letting the background through — as a stroked line it rendered as a
  blank oval.
- **An open path with a fill closes across the shortest line.** The cat's ears,
  drawn as open strokes, filled across the centre and merged into a bow tie.
  Ears are closed triangles that stay clear of the centre.

#### Interface traps that have each cost a debugging round

Promoted out of the session log because several of them bit twice. Every one
fails **silently** — no error, no failing test, and usually fine in headless
Chrome.

- **`#ui-root` is `pointer-events: none`**, so canvas gestures can reach the
  café. **Anything mounted into it that expects a touch must declare
  `pointer-events: auto`.** Without it the widget is a decal: taps go straight
  through to the camera. Two widgets shipped this way (the chore prompt, then
  the wipe overlay), and it is invisible except by really touching the thing.
- **A z-index is meaningless without knowing which stacking context it lands
  in.** `.speech-layer` has a z-index of its own, so it *is* a context, and a
  child at 40 still resolved below a sibling layer at 5. "I set it high" is not
  a check — find the nearest positioned ancestor with a z-index.
- **`panelUpdate` runs every frame, so a panel that rebuilds its DOM in it
  rebuilds ~30 times a second.** `render()` is a store subscriber and `tick()`
  calls `set()` on every animation frame (§8) — the same property that killed
  the autosave. The goals panel opened with `list.innerHTML = ""` at the top of
  its update and **measured fine**: no console error, no frame-time change on
  desktop, and `.click()` passing. It was still completely dead to a finger,
  because a touch that starts on a node removed two frames later never
  dispatches a click, so **every tap on "collect" did nothing** and the game
  read as frozen (Ellis, 2026-09-08). The house pattern is a `refreshers` array
  — build once, mutate text and widths in place, and rebuild only when the
  *shape* of the list changes (`ui.ts` uses a joined signature of ids and
  ready-flags for exactly this). Every other panel already did it this way.
- **`elementFromPoint` cannot see a `pointer-events: none` element**, so it is
  the wrong tool for asking "is my chip covered?" — it will name whatever is
  underneath and look like a positive result. Screenshot it, or compare
  z-indexes within the one stacking context.
- **The bottom-left corner is not free when a panel is open.** `.overlay-layer`
  is z-index 5 with a backdrop blur and covers the whole screen, so the
  now-playing chip at 3 was painted over by any open panel — which is most of
  why Ellis reported never seeing it. Anything that *announces* something
  (rather than being part of a screen) has to outrank the panel layer;
  `pointer-events: none` is what makes sitting up there safe.
- **WebKit does not reliably clip `backdrop-filter`.** A panel's blur will sit
  on top of something a `clip-path` was supposed to cut away from it, and no
  z-index can fix it. **Anything that must sit above the interface has to *be*
  interface** — the WebGL canvas is under all DOM by construction, so a 3D
  element over a panel has to be blitted into a 2D canvas element.
- **A `<button>` inherits neither `color` nor `font`.** The UA stylesheet sets
  `buttontext` and the platform face, so an icon button that declares neither
  draws `currentColor` as system blue on iOS and sets its label in the system
  sans. Both halves have shipped.
- **`offsetParent` is null for anything inside a `position: fixed` ancestor**,
  which is the entire HUD — so the obvious "is it visible" check rejects every
  control on screen. Measure the rect instead.
- **Vite does not validate CSS and TypeScript never sees it.** A stylesheet can
  be catastrophically wrong through a clean build and a green test run: a
  selector list left comma-terminated annexes the next rule, which is how half
  the interface's text went invisible and the adopt button went dead in one
  edit. `ui/styles.test.ts` guards the shared rules; add to it rather than
  trusting the build.
- **`tools/shot.mjs` could not see audio at all until 2026-09-08, and said it
  could.** Chrome's autoplay policy left every `AudioContext` `suspended`, and a
  suspended context's `currentTime` is frozen at 0 — so anything driven by
  `setTimeout` still fired and a probe watching callbacks or the DOM reported a
  soundtrack "playing" while not one sample had been produced. **Three separate
  runs in one session confirmed a playlist that was doing nothing.** The tool
  now passes `--autoplay-policy=no-user-gesture-required`; `--mute-audio` stays,
  because silencing the output is not the same as stopping the clock. Same
  family as `render-audio.mjs` measuring a mix nobody hears (§10), and the same
  rule: **a tool that measures the wrong stage will confirm whatever you already
  believe.** If a check involves audio *timing*, prove the clock is advancing
  before trusting the result.
- **Never open straight into a keyboard.** An autofocused field throws the
  keyboard over the moment the game most wants to be looked at.
- **A WKWebView is a browser, and it will act like one unless told not to.**
  Three defaults leak through and each one reads as "this is a web page in a
  costume" (Ellis, 2026-09-08: *"why is it sometimes like.. i accidently
  highlight stuff in blue as if im on a website? surely that should never
  happen on an app"*). All three are set on `html, body` in `styles.css`:
  `user-select: none` (a long-press — or any tap with drag in it — selects a
  label and paints it blue), `-webkit-touch-callout: none` (a *separate*
  property; iOS raises the magnifier and the Copy / Look Up bar even where
  selection is already off), and `overscroll-behavior: contain` on every
  scroller (rubber-banding past the end of a panel). **The exceptions are the
  text fields and only those** — selection is how a caret is placed and how
  paste works, so `input, textarea, [contenteditable]` take it back. Written as
  a global rule with three exceptions rather than a per-widget opt-in, because
  the opt-in version is wrong the first time somebody adds a panel.
  Keep input `font-size` at **16px or more**: below that, iOS zooms the whole
  page when the field takes focus.
- **Never fail silently on a tap.** A rule with no explanation is
  indistinguishable from a bug — an unaffordable button says what is missing
  and shakes; it does not sit inert.
- **A *spatial* rule has to be drawn, not just explained.** "guests need to get
  past" is a correct sentence about open floorboards, and Ellis read the rule
  as *"innacruate or random"* for weeks because nothing on screen said where
  the path was. The route is a soft ribbon while a piece is in flight, exactly
  as the block grid is — and note the ribbon has a **soft edge on purpose**:
  the real limit depends on the size of the piece in your hand, so a hard line
  would be a promise the rule does not make.
- **Anything projected onto the room must stand off its anchor, and "above" is
  not always the free side.** A label centred on the thing it is about covers
  it; a label floating above it, in an isometric diorama seen from one corner,
  covers whatever is *further into the room* — which for a floor-level job is
  the counter. Pick the side from the projected screen height, and use **two
  thresholds, not one**, or panning flips it every frame. See
  `ui/world-marker.ts`.

### Pastel: contrast is the setting, not colour

Ellis, 2026-08-01: *"the lighting is pretty good but still not soft enough…
everything looks a bit dramatic still. i need more pastel colours or something."*

**Pastel is mostly a contrast setting.** What reads as "dramatic" is the
separation between lit and shadowed faces, not the hue. So the fix was to lift
the fill and drop the key (1.7 → 1.05) rather than to touch any colour ramp.
Two supporting moves: the lights were pulled toward neutral (a strongly amber
key was pushing the atlas's peach into orange), and GTAO scale came down to 0.5
so occlusion suggests contact instead of drawing it.

If it still needs softening, the order to reach for is: key intensity → GTAO
scale → hemisphere/ambient ratio. Exposure last; it moves everything at once.

#### Stop describing the picture. Quantise it.

*Added 2026-08-01, after Ellis said it a second time: "ours is so much more
dramatic and sharp than the rendered image example… far too dramatic colour
wise."*

Three passes had now been tuned by adjective, and the fourth nearly went the
same way. What settled it in minutes: **quantise the reference render and our
own frame to a dozen colours each, mask out the backdrop, and compare mean
lightness spread and mean HSL saturation.** The numbers immediately contradicted
the intuition everyone (including Ellis and me) was working from:

| | reference | ours, before |
|---|---|---|
| darkest bucket, L | 0.24 | **0.18** |
| lightest bucket, L | 0.96 | **0.85** |
| mean saturation | 0.57 | **0.48** |

We were *under*-saturated, not over. "Dramatic" was entirely the tonal range —
crushed shadows and a dim top end. Every minute spent desaturating would have
made it worse, and the first two attempts at a fix did exactly that.

Global contrast statistics are useless here, incidentally: mean lightness, its
standard deviation and high-frequency energy all matched the reference to within
2% while the image plainly looked wrong. It is the *extremes* that carry the
feeling, so measure the tails.

Two dead ends worth not repeating, both plausible-sounding:
- **`NeutralToneMapping`** (Khronos PBR Neutral) is the "faithful colour"
  transform and looks like the obvious choice for a flat-colour atlas. It made
  things worse in both directions — S 0.67, darkest L 0.16 — because ACES's
  highlight desaturation had been doing real work.
- **`AgXToneMapping`** overshoots the other way: S 0.35, milky and grey. Blender
  renders this pack with Filmic, which sits between the two, and three.js has no
  Filmic. **ACES plus a lifted fill is the closest we get** — keep it.

The tuning that landed: ACES at exposure 1.22, neutral (not warm) fill at
ambient 1.3 + hemisphere 2.05, key halved to 0.55. Result: darkest L 0.24, mean
S 0.52 — matched on the shadows, a shade softer on colour, which is the side to
err on.

#### What measuring can and can't close

*2026-08-01, after a second pass:* the same method, run on a **fair crop** (the
whole diorama, not just the room — an earlier tight crop cut off the dark step
and cushions and flattered us), gives:

| | reference | ours before | ours now |
|---|---|---|---|
| p5 (shadows) | 0.229 | 0.129 | **0.180** |
| p50 (mids) | 0.537 | 0.604 | 0.610 |
| p95 (highlights) | 0.959 | 0.880 | 0.845 |
| mean saturation | 0.538 | 0.395 | 0.449 |

Shadows lifted a lot and the contrast ratio p50/p5 halved (22 → 12), which is
what "too contrasted" meant. **The mid-tones barely moved, and that gap is
structural, so stop pushing exposure at it.** The reference is a path-traced
render: light bounces off its cream walls into every dark corner, which lifts
shadows *without* lifting mids. An `AmbientLight` cannot do that — it multiplies
albedo, so a dark brown stays proportionally dark. The remaining ~0.07 is the
absence of global illumination plus ACES against Blender's Filmic. Things that
would actually close it, in order of sanity: bake an AO/bounce term into the
atlas, add an irradiance probe, or light the room with an HDRI environment map.
Turning the exposure down further just makes a dim room.

Also learned here: **a neutral fill costs saturation.** Pass 5 swung the fill to
pure white to stop warm-on-warm compounding, and mean saturation fell to 0.395
against the reference's 0.538. The fill is warm again, just gently
(`0xfff3e4`), which is the balance.

#### The grade pass, and why the exposure looks wrong

*2026-08-01, third pass.* Ellis: *"the reds are still so dramatic and red… still
quite dramatic and contrasted overall lighting wise."* Sampling **matched
surfaces** rather than whole-frame histograms finally isolated it:

| surface | reference | ours, before |
|---|---|---|
| red floor cushion | L0.59 purity 0.72 | L0.45 purity **0.79** |
| orange cushion | L0.65 purity 0.71 | L0.46 purity **0.78** |
| teal cushion | L0.48 purity 0.30 | L0.28 purity **0.42** |
| floorboards | L0.54 purity 0.64 | **L0.55 purity 0.61** |

**The neutrals already matched. Only the small saturated props were wrong** —
darker *and* purer, which is exactly what reads as "dramatic red". In the
reference the cushions are *brighter than the floor they sit on*; in ours they
were darker. That is bounce light: a small object in a bright room receives it
from every side, and we have no global illumination.

Two plausible causes were tested and **cleanly eliminated — don't re-investigate
them**: GTAO (identical numbers with the pass disabled) and atlas mipmap bleed
on the tightly packed colour cells (identical with mipmaps off).

So the fix is a **colour grade**, `GradeShader` in `scene/scene.ts`, sitting
after `OutputPass` and before SMAA. Lift + gain + saturation, solved numerically
against the sampled pairs with the neutrals weighted so they couldn't move.
Result: per-surface purity now matches the reference almost exactly (red cushion
0.72 vs 0.72, teal 0.31 vs 0.30, floor 0.63 vs 0.64).

**Four traps, in order of how much time they cost:**

1. **The renderer exposure is 0.40, and on its own that looks far too dark.** It
   is half of a pair: the grade lifts the black point back up afterwards. Render
   dark then lift = a contrast *reduction*, which is the whole point. Render
   bright then compress does not give the same image. Change one, change both.
2. **Don't use `gain` to bring mids down — use exposure.** A display-space gain
   multiplies white too, so `uGain: 0.88` capped every highlight at 0.88 and
   crushed p95 to 0.767. Exposure leaves the over-range window alone (it has
   headroom) while pulling the mids.
3. **A flat lift makes the frame milky.** Lifting every dark pixel fixes the
   saturated props but drags the blackboard and dark woodwork up with them, and
   the deep 5th percentile overshoots. The lift is therefore weighted by
   colourfulness — saturated surfaces get it, neutral darks keep their depth.
4. **`GTAOPass`'s `scale: 0` does not mean "no AO"** — it multiplies the pass
   output, so it renders the entire frame black. Use `ao.enabled = false`.

What is still off, and is structural: **p95 sits around 0.77 against the
reference's 0.96.** The reference's bright end is a genuinely bounce-lit
interior; ours is one over-range window panel. Closing it needs the GI
substitutes listed above, not another exposure tweak.

#### Bounce light, and the limit of what lighting can fix

*2026-08-02.* The remaining accent gap was closed with an **environment map**
(`buildEnvironment` in `scene/scene.ts`): a box painted from the inside like the
café — warm boards below, cream walls around, a bright patch at the window — run
through `PMREMGenerator` once at startup. `MeshStandardMaterial` picks up
`scene.environment` for free, and unlike an `AmbientLight` it is *directional*,
so a cushion's sloped side gets the floor's warm bounce and a wall's face gets
the ceiling's. It replaced the `HemisphereLight` outright and let the ambient
drop from 3.0 to 0.55.

**But be clear about what it did and didn't do.** Measured, it lifted the
saturated props a long way (red cushion L0.45 → 0.62) — and it lifted the floor
by the same proportion, because *all* lighting multiplies albedo. The
accent-vs-floor **ratio** was unchanged. If a surface is too dark relative to
another surface, no light will fix it; only a grade will. That is why the
`GradeShader` is still there and still doing the real work.

Current balance, all of which move together — retune one and you must remeasure:
environment 1.35 · ambient 0.55 · key 0.30 · exposure 0.40 · grade lift 0.20
(chroma-weighted) · saturation 1.20. That lands mean +0.009, p5 +0.033, p50
+0.025 against the reference, with per-surface purity matching to ~0.03.

#### The café has to sit on something

Also 2026-08-01: *"we are also missing shadows on the background floor thing
which makes it less realistic and more like a testing version."* Right, and it
was two separate omissions:

1. **The backdrop is a gradient.** The reference sweeps (159,142,84) at the
   top-left to (182,158,87) at the bottom-right. Ours was one flat value, which
   is what makes a backdrop read as no backdrop. Now a single vertex-coloured
   plane — four vertices, no texture to ship.
2. **There is contact darkening at the platform's base**, about 12–20%, hugging
   it. Not a cast shadow: the reference has none, the A-frame sign casts
   nothing at all.

**A shadow-catcher plane cannot work here and it is worth knowing why.** The key
must come from the *open* corner (+x, +z) or it lights the backs of the two
walls and leaves the cutaway interior dark. But a light from the open corner
throws every shadow toward −x/−z — behind the walls, where none of it is
visible. You cannot light a cutaway interior and cast onto the ground in front
of it with one directional light. So the contact shadow is *painted*, as a
multiply map on the ground's own material.

Three things that cost time getting that painted shadow on screen:
- **It has to live on the ground's material, not on a decal plane above it.**
  The composer's render target has a low-precision depth buffer; 0.005 of world
  clearance is below one depth step at this camera distance, so the decal lost
  the depth test and rendered nothing at all — not even when made opaque red.
  Widening the gap enough to win would have left the café visibly hovering.
- **Draw each patch *bigger* than the thing it sits under.** At the true
  footprint the blur is centred on the platform edge, so half of it lands under
  the platform where it cannot be seen and what escapes is a 4% tint. Growing
  the shape by ~0.3 units pushes the dark part of the gradient out where it is
  actually looked at.
- **Tag the mask `NoColorSpace`.** As sRGB the painted percentages get
  gamma-expanded and the shadow lands about half again as dark as drawn.

**No additive glow quads standing inside the room.** A 3.2-unit haze plane in
front of the glass read as a **pale square stuck on the wall** once the post
chain went in — bloom lifted its edges out of the noise floor and its radial
falloff no longer hid that it is a square. The volumetric shafts cover this.

### Rebuilding from the sample scene, not from the picture

**The pack ships the Blender scene that produced its promo renders**, at
`graphics/V2.2-…/Blener Sample Scene/Sample_Scene.blend`. `graphics/K9gvnT.png`
is one of them (`CatCafe_A.png`). So "make the café look like the reference" is
not an eyeballing job — the exact transform of every object is sitting on disk,
and `blender --background --python` reads it in seconds.

The room was rebuilt from it on 2026-08-01, after a previous attempt done by eye
came out **mirrored** and Ellis's verdict was *"literally looks NOTHING like the
pic. 0 resemblance?"*. Reading the .blend took less time than the failed guess
did. **Do that first next time.** The whole conversion lives in this file's
history; the parts worth keeping:

- **Blender → three.js is `(x, y, z) → (x, z, −y)`**, and the sample room's
  centre is at Blender `(0, −8)`. Verify the handedness against the *camera*, not
  by intuition: dump the scene camera, check which corner of the room it sits
  on, and make that our `+x/+z` open corner.
- **Don't convert placements by arithmetic on the asset's local box — align
  world AABBs.** The exported glTF and the .blend disagree about the local frame
  for a few pieces (`Bar_Kitchen_Angled_A` is 90° out), so deriving position from
  the asset origin silently misplaces them. Take the world bounding box from
  Blender, take the asset's own box, and solve for the placement that makes them
  coincide. Where a rotation is ambiguous (a square-footprint prop that is only
  asymmetric in its *shape*), disambiguate with the **triangle-area-weighted
  centroid** — it's mesh-density independent, so it compares across the two
  meshes where a vertex average would not.
- **Euler order: Blender's `to_euler('XYZ')` is three.js's `'ZYX'`.** Blender
  composes `Rz·Ry·Rx`, three composes `Rx·Ry·Rz`. Export with `to_euler('ZYX')`
  and hand the components straight to a default three `Euler`. Getting this
  wrong is invisible on pure Y rotations — which is 95% of a layout — and then
  lays every propped cushion flat on its edge, looking like a broken asset
  rather than broken arithmetic.

### Walls: `Light` and `Dark` are *sides*, and `_End_XL` is the arch

Two naming traps in the wall set, both of which cost real time:

- **`Light` and `Dark` are not colours. They are which edge of the tile the
  piece is authored on** — `Light` on −x, `Dark` on −z. They're a matched pair
  for building exactly the corner this café is. Rotating a `Light` wall 90° to
  serve as the back wall (which the layout did for weeks) turns it inside out
  and puts its shaped end in the corner; there is nothing to solve, just take
  the piece built for the side you want.
- **`_End_X` is a small rounded corner; `_End_XL` is a huge sweeping arch** that
  falls from full height over about 1.7 units. The reference's silhouette *is*
  `_End_XL` on the window wall. `_Mid` is cut square at both ends and is why the
  café read as a box. **Not** the way to get an arch: `Wall_Arc_*` is a
  freestanding doorway arch meant to stand inside a room; placed mid-room it cut
  the café in half and hid the blackboard behind its spandrel. Tried, removed.

**At furniture height every wall in every style stands 0.05 inside the tile
edge** — measured 2026-08-26 by dumping each wall mesh's inner face per height
band, and worth knowing before writing any rule about how close furniture may
get. The window wall's 0.68 thickness is the **sill ledge**, which does not
begin until y ≈ 0.6; below it there is the same 0.30 of plaster as anywhere
else. That is what makes `crossesSill` safe: the side table and the cat climber
are authored to tuck under the ledge and are standing on clear floor while they
do it.

Two more things about these pieces:

- **Walls sit at `y = −FLOOR_THICKNESS`**, base-level with the floor slab so the
  slab covers their bottom edge. That's how the sample has it, and it drops the
  window (and its sill) 0.26 from where a naive `y: 0` puts them.
- **The shaped end is at the very end, not a slope along the length.** Verify
  with a vertex profile, not a bounding box — a bbox reports height 4.0 for both
  a flat and a shaped top and tells you nothing.

`Flooring_*_Entrance` is a small threshold slab used to break the square floor
plan. It carries the doormat and the A-frame sign in the reference.

### The previews: same renderer, same pipeline, or they lie

`scene/preview-stage.ts` is what puts the shop's spinning furniture and the
character creator's avatar on screen. Both draw *over* the finished frame into
a scissored region — one WebGL context, one copy of the atlas, no second
renderer (see `scene/shop-preview.ts` for why that was rejected).

**They must go through the same tail as the room, and for a while they did
not.** Three separate ways that bit, all fixed 2026-08-10:

1. **No antialiasing.** They rendered into the default framebuffer, which has
   no MSAA — `antialias: false` is deliberate (the composer bypasses it) and
   SMAA lives in the composer, which the previews skip. So the café was
   smoothed and the two things the player looks at closest were raw. They now
   render into a 4×MSAA half-float target at 1.5× supersample, which is cheap
   because it is the size of the panel, not the screen.
2. **No tone mapping.** Three turns tone mapping *off* when rendering into a
   render target — that is how a composer gets to apply it once at the end — so
   moving to a target silently dropped exposure 0.40 and everything came out
   ~2.5× too bright. The composite shader does exposure + ACES + sRGB itself,
   then applies **the room's grade**, exported from `scene.ts` as `GRADE_GLSL`
   for exactly this reason.
3. **The lighting was tuned by eye, and the stage is now a colour picker.** A
   piece must appear here in the colour it will be in the room, so the rig was
   solved by sampling the same sofa in both places rather than by taste:
   (108,85,36) on the stage against (153,124,55) in the café, now (150,124,48).
   The intensities that takes look absurd beside `addLighting`'s — env 4.4,
   ambient 2.9 against 1.35 and 0.55 — and that is honest: the room's chair is
   also lit by the window spot and lifted by bloom, and a bare turntable is
   not. **Re-measure the same way if you touch them** (§9's "quantise it").

Two mechanics worth knowing before editing that file:

- **A render target holds premultiplied alpha.** Blending onto a transparent
  clear leaves `rgb` already multiplied by `a`. Composite it back with ordinary
  `NormalBlending` and it is multiplied twice; run a curve on it without
  un-premultiplying first and the translucent backdrop grades differently from
  the opaque item standing on it.
- **Never `#include <tonemapping_pars_fragment>` in a `ShaderMaterial`.** Three
  appends that chunk and `colorspace_pars_fragment` to every one already; doing
  it yourself is a wall of "function already has a body".
- **`setViewport` takes CSS pixels and applies the pixel ratio itself.**
  Applying it yourself as well puts the item somewhere else entirely on any
  screen where the ratio isn't 1 — i.e. every phone. It renders; just not where
  you asked.

### The character pack (Minty.kit Cozy Character Pack v1.2, CC0)

Vendored at `public/assets/characters/`. Same studio as the café pack, so the
style matches for free. **Inspect it with `/characters.html`** (a workshop tool,
excluded from the production build, same as `/gallery.html`).

`Character_All.fbx` contains **62 skinned meshes, 3286 bones, 43 clips, 58.7k
triangles**. It is a *modular kit* — you assemble a person by showing one mesh
per slot and hiding the other 55:

| slot | count | examples |
|---|---|---|
| body | 1 | `Body_Head` |
| hair | 18 | `Hair_Short`, `Hair_Bun_Big`, `Hair_Hijab`, `Hair_Shave_Buzzcut` |
| top | 9 | `Clothes_Top_Hoodie`, `Clothes_Top_Tshirt`, `Clothes_Top_CollarShirt_Long` |
| legs | 6 | `Clothes_Legs_Pants_Long`, `Clothes_Legs_Skirt` |
| apron | 2 | `Clothes_Apron_Long/Short` — for a barista |
| beard | 2 | `Beard_Full`, `Beard_Lower` |
| accessory | 6 | `Accessory_Glasses`, `Accessory_Headphones_*` |

Plus **6 skintones and 16 hair colours** as swappable textures. That is far more
customer variety than the game needs, and enough for a named barista.

The clips are exactly the café's vocabulary: `TallChair_Sit`, `Sofa_Sit`,
`Floor_Sit`, `Sofa_Cup_Drink_Loop`, `Floor_Food_Eat_Loop`, `Tray_Serve_Short`,
`Tray_Walk`, `Wait_Shifting`, `Floor_GetUp`. Seat types in `data/cafe-layout.ts`
map onto them directly — a bar stool is `TallChair_*`, the armchair `Sofa_*`,
the floor cushion `Floor_*`.

**Toolchain decision (2026-08-01): Blender, not a converter. INSTALLED** —
Blender 5.2.0 LTS via `brew install --cask blender`, on PATH as `blender`.
No sudo was needed. Conversion should be a scripted `blender --background
--python` step checked into the repo, not a manual export.

Why Blender over a converter:
A converter (`fbx2gltf`, `assimp`) only solves the file format. Blender solves
the format *and* every problem behind it — it can merge the 62 modular meshes
onto one shared skeleton, decimate, bake, and re-export. It is also needed for
§9's "quad-remesh AI meshes" step and for any custom art later. Critically it
is **scriptable**: `blender --background --python convert.py` means the pipeline
lives in the repo as a reproducible script rather than as a one-off binary
invocation nobody can reproduce. Its glTF exporter is also the reference
implementation, so Three.js compatibility is the best available.

**The pack is in the game as of 2026-08-01** — `entities/character-library.ts`
assembles a guest, `entities/visitor-manager.ts` walks them to a seat. Three
things about the pack shape that code, and all three cost time:

- **Every clip is authored in place, root bone at the origin.** The `*_Sit`
  clips never translate `Root`; the sitting height comes entirely out of limb
  rotations, posed for this pack's own furniture — which ours *is*. So a guest
  is **stood on the floor at the seat's x/z** and the clip does the rest. That's
  why `scene/room.ts` exports `SEAT_STAND_POSITIONS` alongside `SEAT_POSITIONS`:
  place a guest at `seatY` and they float a seat-height above the seat.
- **`*_Sit` is a transition, not a loop** (0.8–1.1s of sitting down). The loops
  are separate — `TallChair_Cup_Drink_Loop`, `Sofa_Cup_Drink_Loop`,
  `Floor_Cup_Drink_Loop`. Looping a `Sit` makes everyone bob forever.
- **The clothes have no texture, and that is the design.** The pack ships six
  skintones, sixteen hair colours, an eye sheet — and `T_Character_Atlas.png`,
  which *despite the name is a copy of the café atlas*, there for the held cups
  and cupcakes. Garments are white geometry meant to be tinted; that is how one
  hoodie mesh becomes the pink one and the yellow one in the promo art. Binding
  that misnamed atlas to the clothes — the obvious first move — puts floorboards
  and blackboard chalk on everyone's trousers. Customer variety therefore comes
  from `material.color`, which also closes §0's "no customer variety" gap.

**Every textured material is exported `alphaMode: BLEND`, and it is a lie.**
Hair, skin and eyes all carry it, but only the eye sheet has any alpha — the
sixteen hair colours and six skintones are opaque in every pixel. Blender
writes BLEND whenever a material's alpha input is wired up at all, so it says
nothing about whether alpha is used. `GLTFLoader` reads BLEND as `transparent:
true` **plus `depthWrite: false`**, which is right for glass and ruinous here:
hair and head end up in the same transparent queue with no depth between them,
and the head paints over the hair from whatever angles the sort flips on. That
is the "you can see through their hair into their head" bug, and the fix is one
line in `loadCharacterAssets` marking the hair opaque.

**Skin and eyes are deliberately left as they are.** The eye sheet's alpha is
real, and the eye shell dips *inside* the skin surface at its edges (skin front
reaches z 0.286; the eye patch spans 0.254–0.293), so making the skin write
depth would clip the eyes away in places. The head is convex enough that its
own blend order never shows.

Draco is now **vendored at `public/draco/`** rather than fetched from a CDN, so
the characters load in a packaged app with no network.

**Both original shipping blockers were SOLVED** by `tools/convert-characters.py`
(`blender --background --python tools/convert-characters.py`):

| | before (FBX) | after (GLB) |
|---|---|---|
| file size | 18.1 MB | **2.8 MB** |
| skeletons | 3286 bones, one per mesh | **1 skin, 112 nodes** |
| meshes | 62 | 58 (the 4 `0Nude` underwear layers culled) |
| clips | 43 | 43 — all preserved |

Blender consolidated the duplicated skeletons into a single skin on import,
which is the thing a plain format converter would never have done. Draco
compression plus quantisation does the rest.

~~**One loose end:** the inspector points `DRACOLoader` at a Google CDN.~~ Done
2026-08-01 — the decoder lives in `public/draco/` (three files, ~760 kB, not in
the JS bundle) and both the game and the inspector point at it.

Clip names come through prefixed `Armature|` (e.g. `Armature|Sofa_Sit`), so
strip that prefix when looking clips up by name.

Two runtime facts about rendering these characters, both of which produced bugs
that read as something else entirely:

- **Skinned meshes need `frustumCulled = false`.** Three culls them against
  their *bind pose*, so an animated character vanishes at the edges of frame.
- **`TextureLoader.load` returns a texture immediately and fills its image in
  later**, and an unloaded texture samples **black**. Binding a skintone or hair
  colour nobody has fetched yet renders a near-black face for a second — which
  looks like "the palette only has two options", not like a loading bug. The
  whole palette is preloaded (22 files of 64×64, ~30 kB) for this reason.
  Any future palette that is picked at random must be preloaded the same way.

### The Lip Sync and Expressions pack, and the merge (2026-08-25)

A **second** CC0 Minty pack (`graphics/Characters - Lip Sync and Expressions
v0.1/`, €5 on itch) is merged into the same `characters.glb` by the same
script. It is what gave the game faces. Three things it brings:

- **A face that comes apart.** The base pack bakes the eyes into `Body_Head` as
  a second primitive, so they can never move. This pack's head is skin-only,
  with `Body_Eye_L`, `Body_Eye_R` and `Body_Mouth` as separate meshes sitting
  proud of it. That is the entire reason to take its head over ours.
- **16 eye sprites and 20 simplified mouth sprites**, packed into two atlases
  by `tools/build-face-atlas.py`.
- **18 social clips**, including the wave.

**The merge works because the rigs match**: 45 of the talking pack's 47 joints
exist in the base pack by name, and the two that don't (`held_item_notepad`,
`held_item_pen`) belong to a clip we don't ship. So "retargeting" is just
pointing the actions at the other armature — a Blender action addresses bones
by name. **Check this the same way if a third pack ever arrives**: compare
joint-name sets before assuming anything about compatibility.

**Four traps in the merge, all of which cost time and all of which fail
silently:**

1. **The FBX importer prefixes actions with their source armature**, so the
   clips arrive as `Armature.001|Armature|Social_WaveHello`. Left alone they
   export under that doubled name and nothing can find them, because
   `character-library.ts` strips exactly one `Armature|`. Normalise *first*,
   then look for duplicates — the other order finds none, which is exactly
   what happened on the first run and shipped two `Walk_Loop`s.
2. **`bpy.data.objects.remove` does not free the mesh datablock.** The old head
   stayed a user of `M_Eyes`, so the name never became free and renaming the
   new eye material to `M_Eyes` was silently suffixed back to `M_Eyes.001`.
   Remove `object.data` too.
3. **The runtime switches on material *name*.** A head that comes through as
   `M_Skin.001` never gets a skintone and renders bone white, with nothing
   thrown. The script reassigns the face meshes onto the base pack's own
   `M_Skin` and asserts the rest; `character-clips.test.ts` pins all of it.
4. **Both packs ship `0TPose` and `Walk_Loop`.** The base pack's win.

**The atlas is shared and the geometry is per-character — note the inversion.**
The obvious implementation clones a `THREE.Texture` per character so each can
hold its own `offset`, and that is wrong here: a cloned texture is a *second
GPU upload* of the same image, and seven characters × two atlases is tens of
megabytes against a budget iOS has already killed this app for overrunning
(§0, 2026-08-17). The face meshes UV-map the full 0–1 square, so cloning the
*geometry* and writing the UVs directly costs 44 vertices per character and
needs no shader patching. See `entities/character-face.ts`.

**Read the pack's `Tips_HowTo/` before inventing behaviour.** It specifies the
blink sequence outright — *"0-1-2-3-2-1-0"* — and the sparkle cycle, and the
lip legend maps letter groups to mouth shapes. The **simplified** 20-frame set
is the one to use: its legend groups whole letters ("C, SH, CH, N"), which is
what a text-driven lip sync can actually resolve. The full 30-frame set is
phonetic and would need phoneme data we do not have and cannot get from a
string.

Bundle cost: `characters.glb` went **2.8 MB → 4.0 MB** (18 clips of baked
keyframes, mostly), plus 111 kB of atlases.

Historical, for context — these were the blockers:

1. **18 MB of FBX.** Fine over localhost, impossible in an `.ipa` against a
   ~640 kB bundle. It needs converting to GLB with quantisation, and **no
   converter is installed** — no Blender, no `fbx2gltf`. Decide this before the
   iOS build, not after.
2. **3286 bones** — every one of the 62 meshes carries its own skeleton. An
   assembled character needs one skeleton shared across its chosen meshes
   (`SkeletonUtils.clone`), or per-visitor cost will be absurd on a phone.

### Framing: portrait-first, non-negotiable

A `PerspectiveCamera`'s `fov` is its **vertical** field of view, so a tall phone has very little *horizontal* view to spend: at 45° and a 0.46 aspect ratio, an iPhone sees barely 3.5 world units across. A fixed camera position that looks right in a desktop browser window will therefore crop the café off the sides of every phone — which is exactly what happened on the first pass.

Two rules follow, and both are load-bearing:

1. **The room is one 4 × 4 tile** — square, not narrow-and-deep. (This line used to say "5 × 8", left over from the greybox; it was stale for weeks and was used in argument at least once, so check the layout before quoting it.) Growing the footprint pushes the camera back on a phone, so add capacity by rearranging rather than by expanding.
2. **The camera is solved, never hard-coded.** `scene/camera.ts` declares a `FRAME_BOX` that must stay on screen and binary-searches the camera distance that contains it at the current aspect. Wide screens sit close, narrow ones pull back, nothing is ever cropped. Don't reintroduce a literal `camera.position.set(...)`.

`FRAME_BOX` is now **asymmetric** (2026-08-01), and deliberately so: it reaches
to y=3.6 to take in the swept arch over the window, and past the floor plan on
+x/+z to take in the A-frame sign and the cushion that stand outside the door.
An earlier version stopped at y=2.7 arguing that framing full walls makes the
café "a model on a shelf" — but the reference render frames them and that arch
is the room's whole silhouette. The cost is about 18% more camera distance,
which is real but worth it. The empty far corner costs almost nothing: from a
45° azimuth, +x and +z pull in opposite horizontal directions, so that corner
projects near the middle of the screen rather than off the side.

Always sanity-check framing at **393 × 852** (iPhone 14 Pro), not in a desktop window. Current result: everything visible on every device tested, with a foreground cat at ~14% of screen height on a phone.

---

## 10. Game feel / juice (this is the product, not decoration)

Prioritise these — for a cosy game they matter more than model detail:
- Soft, satisfying feedback on every tap (gentle scale bounce + sound).
- Coins/hearts that pop and arc when a visitor pays.
- Idle micro-animations: cats grooming, tails flicking, steam off cups, gentle idle sway.
- Smooth eased transitions between screens — nothing snaps.
- A calm ambient audio bed + soft, non-repetitive sfx. A purr when you pet a cat. Audio is half the cosiness.
- Subtle particles (dust motes in warm light, sparkles on a rare-cat unlock).

Use a tween library for easing. Nothing in this game moves linearly or instantly.

**Implemented (2026-07-31).** No tween library was needed — CSS handles UI easing and the scene animates from timestamps:
- **Cats are alive**: breathing, tail sway, independent-phase ear twitches, slow head tilt. Every cat runs on its own phase offset so the room never moves in lockstep — that's what stops idle animation reading as a loop.
- **Tap a cat to pet it** — squash-and-wiggle, a burst of hearts, and a purr. `CatManager.pick()` raycasts; `entities/cat.ts` exposes named parts (`head`, `tail`, `earL`, `earR`, `torso`) as animation hooks. **Rename those and the cats go still.**
- **Coins pop and arc** out of the seat that paid, as DOM floaters projected from world space (`ui/floaters.ts`) — crisp at any DPI, zero draw calls.
- **Dust motes** drift in the light: one `THREE.Points`, one draw call (`scene/dust.ts`).
- **Audio** (`audio/audio.ts`) — the cats and the soundtrack are **recordings** (`public/audio/`); the interface sfx (coin, tap, purchase, reveal, typing) are synthesised WebAudio. Reveal intensity scales with rarity. Starts on first tap (browser autoplay policy) and no-ops entirely when there's no `AudioContext`. **Nothing synthesised stands in for a missing recording** — see §10.
- **Rate-limited on purpose**: a maxed café pays ~2.5×/second, so coin *sounds* are throttled to ~4/s while every payment still shows a floater. A chime that often stops being a reward and becomes a nag — pillar 1 beats feedback density.
- `prefers-reduced-motion` is respected.

### The cats and the music are recordings (2026-09-01, cleaned up 2026-09-02)

`public/audio/` — a soundtrack, two purrs and three meows, all supplied by
Ellis. `audio/soundtrack.ts` plays the track; `playPurr`/`playMeow` play the
rest. **The interface stays synthesised** (coins, taps, purchases, the reveal
chime, the typing click): those are feedback rather than performances, and
nobody has ever complained about them.

**There are no synthesised stand-ins any more, and deleting them was the fix
for a real bug.** A generated soundtrack (`audio/music.ts`), a formant meow and
a filtered-noise purr (`audio/cat.ts`) all survived as "fallbacks" after the
recordings landed — and the ambient pad among them **kept playing underneath
the real track**, and was the only thing audible during its rests. Ellis,
2026-09-02: *"its still only using tyhe old retarded purr. no meow sound. the
old soundtrack too … get rid of the old crap i can still hear."*

- **`response.ok` is false for every file the app loads, and it is not an
  error.** Capacitor serves the built app over a **custom URL scheme**, and a
  `WKURLSchemeHandler` answers with a plain `URLResponse` rather than an
  `HTTPURLResponse`. No HTTP status means WebKit synthesises `status = 0`, and
  `Response.ok` is defined as 200–299 — so `if (!response.ok) return` throws
  away files that downloaded perfectly. **This silenced every recording in the
  app for a week** while all of them played in every browser. Three.js is
  immune only because its loaders use `XMLHttpRequest`; it warns
  "THREE.FileLoader: HTTP Status 0 received" on every asset and carries on.
  Anything in this codebase that uses `fetch` must go through
  `audio/fetch-audio.ts`'s rule, or repeat the bug.
- **A browser cannot test the app, and now something can.**
  `swift tools/webkit-probe.swift dist` runs the built bundle in a real
  `WKWebView` behind a scheme handler shaped like Capacitor's. Every existing
  tool — `tools/shot.mjs`, `tools/render-audio.mjs` — drives headless *Chrome*,
  which is the wrong engine served the wrong way, and all of them reported the
  audio working while the phone was silent.
- **A fallback that can be heard is not a safety net.** It is a second
  implementation nobody chose, and it will be chosen. Same call this project
  made about the anniversary guide: deleted, not disabled, because a dead
  branch is something every future reader has to work out is dead.
- **A missing file now means quiet**, which is the better of the two sounds and
  is what the brief needed anyway — music that fades *to silence* cannot do
  that with a synthesised pad playing underneath it.
- **`audio-files.test.ts` is what makes that safe.** With no fallback a renamed
  file is a silent sound rather than a wrong one, so the test asserts every
  declared path exists, is non-empty, and is not an `.ogg`.

**The game is loud, and the meow is the reference.** Ellis, 2026-09-05: *"i
have my phone on MAX volume and the only thing that is even close to being too
loud is the meow. the rest is still average when it should be super loud."* So
the meow's level barely moved and everything else was brought **up to it**:
music ~6.6× louder, the interface ~8.5×, the purr ~1.5×. `MASTER_VOLUME` went
0.3 → 0.85, and the comment about sitting politely under a podcast went with
it — that was a guess about how people play, and it was wrong.

- **A limiter across the output is what makes loud safe.** At this level a
  purr, a coin and the soundtrack together can sum past 1.0, and digital
  clipping is a horrible sound to put in a cosy game. Threshold −3 dB, ratio
  12: silent on any single sound, engaging only on overlaps.
- **One `UI_GAIN` multiplier, not eleven edited literals.** The balance
  *between* the coin, the tap, the purchase and the reveal was tuned by ear and
  is right; only the group was too quiet. Scaling in one place keeps the
  decision that was already made.
- **`TRACK_GAIN` is above 1 because the file is quiet.** `locklane.m4a` peaks
  at 0.327 (≈ −10 dBFS), so at unity it can only ever be background.
- **`tools/render-audio.mjs` renders through the same master gain and limiter**
  now. It used to render straight to the destination — measuring a mix nobody
  hears, which is how the game came to ship three times quieter than anyone
  wanted while the tool reported it fine.

**A purr loop is cut on the pulse, not on the clock.** Both purrs are real
~27 Hz pulse trains (a cat's is 25–30) with visible *breath gaps*. A 2.4 s
window chosen by eye lands on one about a third of the time and sounds like the
purr stalling, so each clip is a whole number of pulses (67 and 63) taken from
the stretch whose quietest 50 ms is loudest.

**Load order is sound effects first, soundtrack second.** The track is 2.4 MB
against 25 kB for a purr; starting them together put the little files behind
the big one, and a cat petted in the first few seconds made no sound at all.
The soundtrack can afford to wait — it opens with four seconds of deliberate
silence — and the effects cannot. Purr is now audible 253 ms after the first tap.

**Licences, checked 2026-09-05 before TestFlight.** All three meows are **CC0**
— confirmed on each sound's own Freesound page rather than from a search
listing, since Freesound carries CC0, CC-BY and CC-BY-NC side by side and only
CC0 is free of obligations. `locklane.m4a` is Ellis's own. The two purrs carry no
attribution and no metadata (bare `fmt`/`data`, nothing to trace); Ellis
confirmed they are free to use. **The whole folder is clear for commercial
release** — nothing owed, nothing restricted.

### The soundtrack breathes (2026-09-01, four tracks 2026-09-08)

Four pieces — *lock lane* by Ellis and three by **Lily M** — catalogued in
`data/tracks.ts` and played by `audio/soundtrack.ts`. Ellis's original brief:
*"a nice little fade in from silence a few seconds after logging in and maybe
fade out again to silence for a little before fading back in again."*

- **A session is a fixed length, not a fixed number of passes.** The interludes
  are 27 seconds against *lock lane*'s 71, so a shared pass count would make
  the music-then-quiet rhythm change with the track. `passesFor` derives the
  repeats from `TARGET_SESSION_S`, which is what Ellis meant by *"loop the lily
  M ones a few times to increase length."*
- **It is a playlist, not a breathing cycle** (2026-09-08). This section used to
  argue that the rests *were* the design — music that goes away and comes back
  keeps arriving, where continuous music becomes wallpaper. The argument stands
  and the numbers were still wrong, in a way only a listener could find. Ellis:
  *"i finished listening to the first song … and then it eventually ended but
  another song never came on."* Nothing was broken. A 150-second session
  divided into a 27.9-second interlude **six times**, so the "first song" ran
  two and a half minutes, and then the café went quiet for forty-five seconds.
  - **A rest is only a rest while the listener is still expecting something.**
    Five seconds is; forty-five is heard as the music having finished, and then
    the next piece arrives as a surprise rather than a return. `rest` is 5,
    `TARGET_SESSION_S` is 85.
  - **The silence is longer than `rest`.** A raised-cosine fade is inaudible for
    roughly its last third, at both ends, so what a listener experiences is
    about `fadeOut/3 + rest + fadeIn/3` — which at 12 and 45 was nearly a
    minute. Those three numbers only mean anything together; move one and re-add
    them. `audio-files.test.ts` holds the sum under fifteen seconds.
  - **Bound the pass count, not the span.** `passesFor` *rounds*, so the error
    is worst on the shortest track and invisible on the longest: the span
    always looks reasonable (six passes of 27.9s is 152s, right on target)
    while the listening experience is one short piece six times. The test caps
    passes at four against the shortest track in the catalogue.
  - Variety now comes from the *next* piece rather than the current one going
    round again, which is the better trade with four tracks in hand.
- **Only one of them is actually a loop, and that decides how it repeats.**
  Measured head-against-tail: *lock lane* opens at 0.8× the level it ends on,
  so its repeats butt end to end and are inaudible. The other three are pieces
  with *endings* — *sometimes i forget you're gone* opens **8.6×** louder than
  it finished, so a hard loop is a slam. Those repeat as **overlapping sources
  with a crossfade** (`Track.crossfade`), which turns the seam into the piece
  dissolving into its own beginning. A crossfade of 0 is exactly a butt joint,
  so it is one code path.
- **Per-track level trims, measured.** The four were mastered separately and
  sit a third apart (rms 0.0586 to 0.0847); at a shared gain that is 1.45× and
  reads as the soundtrack jumping when it changes piece. `Track.trim` is
  `lockLaneRms / thisTrackRms`, and it took the rendered peak from 0.565 to
  0.443 — the limiter had been squashing the loudest track.
- **The playlist runs off a half-second tick reading the *audio* clock, not one
  long `setTimeout`** (2026-09-08, after the same report twice). Each session
  used to arm a single timer for its own length plus the rest — eighty-odd
  seconds — and the only thing that would ever schedule the next piece was that
  one callback. **A single point of failure with no way back**, and its failure
  mode is exactly the symptom reported: the first song plays and nothing follows
  it, for ever. A short repeating check cannot be lost the same way, and asking
  the audio clock rather than counting wall-clock milliseconds makes it immune
  to the two drifting apart, which on iOS they do every time the context is
  interrupted.
  - **The same tick resumes a suspended context**, which was a real gap:
    `ctx.resume()` was only ever called from `initAudio`, i.e. from a tap. A
    context that iOS suspends while somebody is doing nothing but *listening*
    was never revived, and the café stayed silent until they happened to touch
    the screen. Between pieces there is a rest with no source playing — exactly
    the moment a platform decides nothing is going on.
  - **The wait is on the wall clock, and that is not an oversight.** The first
    version of this tick compared the *audio* clock, which is wrong for the
    exact platform it is meant to fix: a suspended context freezes
    `currentTime` — it is a clock made of samples, and a stopped context makes
    none — so waiting for it to reach a number waits for ever. `performance.now()`
    keeps running, the work gets scheduled, and it comes out of the speakers as
    soon as the context is awake.
  - **WebKit accepts every automation call in `schedule()`** — checked directly
    in a real `WKWebView`: `setValueAtTime` at a curve's endpoint, and the
    crossfade voice gains. Neither is the cause; don't re-check them.
- **Nothing repeats back to back.** `pick()` excludes the piece just played.
- **It plays at 0.88 speed** (`PLAYBACK_RATE`, 2026-09-08). Ellis: *"i also want
  to slow down all the music - feels like its all going too fast."* WebAudio's
  `playbackRate` is a resampler rather than a time-stretcher, so this drops the
  pitch about two semitones as well — a real musical change, which is why the
  number is gentle. Past roughly 0.8 the honest fix is slower renders from the
  artists, not a bigger number here. **Everything in `schedule()` is wall-clock
  and divides by it**; the one exception is `start`'s `offset`, which indexes
  the buffer. Getting that wrong would not throw, it would quietly put the
  crossfades in the wrong place.
- **The chip names it** — see below.

#### Naming the piece (`ui/now-playing.ts`)

Ellis: *"have a little player icon show briefly when a new track comes on
showing the name."* A slate chip, bottom left, above the nav row: quaver,
title, artist. It **arrives late on purpose** — naming a track before it is
audible reads as a bug — holds seven seconds and leaves. `pointer-events: none`,
because it can appear while a finger is already moving and a chip that eats that
tap is worse than no chip.

The artist line is the reason it exists: a title with nobody's name on it
credits nothing.

**Its lead-in is derived from `CYCLE.fadeIn`, and that is the fix for the one
bug it has had.** Ellis, 2026-09-08: *"the icon currently playing pop up never
showed."* It was showing — verified in the running game — but the lead-in was a
flat 3.5 seconds written against a fade-in that was *twelve* at the time, and
when the fade came down to five the chip started arriving **before the music
reached level**, which is the exact failure the lead-in exists to prevent. The
file's own comment still said "fades in over twelve seconds". §14's rule
applies and is worth restating in this shape: **a constant that restates a
number owned by another module is already wrong, or will be** — and a comment
quoting that number is how the drift stays invisible. It reads `CYCLE` now.

The other half of *"never showed"* was frequency: at a 150-second session with
a 45-second rest it had something to say **once every three minutes**, for five
seconds. It is now about every ninety.

**And it was behind the panel layer the whole time.** Reported again after all
of that (*"im still not noticing the little music player feature"*), and the
cause was neither timing nor frequency: the chip was z-index 3 against
`.overlay-layer`'s 5, so **any open panel painted its dim and blur straight
over it**. A track starting while somebody is in the shop is the normal case,
not the edge case. It is 8 now, above the panel and the modal layers, which is
only safe because it takes no taps.

- **It waits for the walkthrough to finish** (`allowMusic`, 2026-09-05). Mal
  talks over a speech bubble with the text typing out for the first couple of
  minutes, and a soundtrack rising underneath that is one thing too many. A
  café that has already been shown round allows it at boot, so this only ever
  delays a first session. Two separate conditions, deliberately: `musicMuted`
  is the player's setting, this is the game saying the moment is right.
- **The fade in is a raised cosine, not an exponential ramp**, and over twelve
  seconds that is the whole feature. An exponential ramp is linear in decibels,
  so from a near-silent floor it stays inaudible for eight seconds and then
  rushes in over the last three — the opposite of gradual. Measured, as a
  percentage of full level every half-second: `0 0 0 0 0 0 0 1 2 4 16 28 77`
  before, `0 0 0 2 2 13 13 53 43 48 42 72 77` after.
- **The rests are the design.** Continuous background music in a game people
  leave running is wallpaper in ten minutes and an irritant in thirty — the
  same argument §10 makes about the coin chime. The cycle is four seconds of
  quiet, a twelve-second fade in, two passes, a seven-second fade out landing
  **on the end of the second pass** so the piece finishes, then forty-five
  seconds of café. Measured over 200 s: rms 0.0251 while playing, which is what
  the generator it replaced measured, so the mix did not move.
- **It restarts at the top** rather than ducking a permanently-looping node, so
  the same middle eight never fades in twice.
- **AAC carries encoder priming and it will break a "perfect" loop.** This file
  declares 1024 frames of priming and 517 of padding; whether a decoder strips
  them is up to the decoder. Chrome and WebKit both honour the gapless metadata
  — verified, it decodes to exactly 71.111 s — and `contentStart` measures the
  buffer and sets `loopStart` past any silence anyway, because 23 ms of it per
  repeat is a stutter that would be blamed on the music.
- **A dip at the loop point turned out to be the composition**, not a bad edit:
  the track opens sparse where it ends full. Checked by rendering tail and head
  back to back rather than by arguing about it.
- **The four tracks are 3.7 MB**, taking `dist/` to ~18 MB — *lock lane* alone
  is 2.4 MB of that at 270 kbps, where the three Lily M pieces are 128 kbps and
  about 0.45 MB each. Re-encoding *lock lane* to match would halve it at the
  cost of a second lossy generation. Ellis's call, not taken.


## 11. Data & analytics (validate continuously)

Instrument from **day one**. The goal is to replace guesses with observed behaviour and to measure against the targets in §4.

Log lightweight events for at least: session start/end and length; the progression funnel (first cat, first expansion, D1/D3/D7/D30 return); where players stop (last action before a long absence); economy checkpoints (money + cat count at key moments, to catch balancing problems); and which cats/upgrades players actually buy.

Keep an event-logging abstraction in `/analytics` so the backend can change without touching game code. Privacy-respecting and minimal. **This is the honest version of "backed by data": measuring a live thing, not predicting a hypothetical one.** Every scope and spend decision should reference these numbers.

**Decision (implemented):** backend is **TelemetryDeck** (privacy-first, no PII/cookies, iOS-friendly, free tier). Game code calls `logEvent()`; `analytics/transport.ts` batches signals to the ingest API. Enabled by setting `VITE_TELEMETRYDECK_APP_ID` (see `.env.example`) — unset, events log to the console. The only identifier is a random per-install UUID; retention (D1/D7/D30) falls out of `session_start` signals sharing that id, aggregated in TelemetryDeck's dashboard. Session length + economy checkpoints ride on `session_end`.

---

## 12. Go-to-market principles

Discoverability is the #1 risk, so treat marketing as a first-class workstream, not an afterthought.
- **ASO is the top free lever.** Optimise title/subtitle keywords (cozy, cat café, idle, relaxing, decorate, collect, no-stress). Mine real player review language for phrasing. Use free Custom Product Pages to A/B audience hooks.
- **Short-form video (TikTok/Instagram) is the top growth lever** for this audience — but organic reach is declining, so treat virality as possible upside, not a plan. Post consistent cute-cat / devlog clips for *months pre-launch*.
- **Build a community pre-launch** (Discord/Reddit) and a store page + TestFlight early to accumulate wishlists/testers.
- **Seed 5–15 genre-specific cosy creators** for launch week — the algorithm rewards launch velocity.
- **Do not spend on paid UA** until organic D7/D30 and rewarded-ad ARPDAU prove the loop (see §4 thresholds).
- **Failure modes to avoid:** "build it and they'll come"; launching silent with no wishlist/community; over-scoping one big bet instead of iterating.

---

## 13. Performance (mobile-first)

- Target a smooth, stable framerate on a mid-range iPhone. Cosy doesn't mean sloppy.
- Keep draw calls low: share materials, atlas textures, instance repeated objects (chairs, cups).
- Cap the polygon budget (§9). Cull off-screen work.
- **Test on a real device early and often** — the simulator lies about performance and touch feel.
- **Sharpness here is bounded by memory, not by taste.** iOS SIGKILLed the app
  at native pixel ratio: render-target bytes are `pixels × 8 (half-float RGBA) ×
  (samples + 1) × targets`, which reached 241 MB on a 393×852 phone. The
  arithmetic lives at the top of `data/graphics.ts` and any fix for "it looks
  blurry" must be traded against it explicitly.
- **A budget bounds memory; only a fraction of native bounds *perceived*
  sharpness — neither can do the other's job.** A pixel budget is absolute, so
  on a lower-DPR phone every quality level solves above the device ratio and
  they all clamp to the same thing, making the setting do visibly nothing. Each
  level therefore carries a `scale` as well, and the ratio is the smaller of the
  two.

---

## 14. Coding conventions

- TypeScript strict. No `any` unless genuinely unavoidable and commented.
- Systems in `/systems` are pure logic and independently testable.
- Config and tunable numbers live in `/data`, never inline in logic.
- Small, focused modules. Clear names over clever ones.
- Commit often, in small logical units.
- **A `const` is not hoisted — only the function is.** A module-level `const`
  read from code that runs before its declaration throws a temporal-dead-zone
  error, and this project has hit it **three times**: a lookup table declared
  after the `return` that used it, and a derived constant placed above the
  constants it derives from. If a constant is computed from other constants, it
  must be declared below every one of them.
- **A constant that restates a function is a bug waiting for the function to
  change.** A hand-written twin of a computed table drifted the moment the
  function gained an offset, and the drift was invisible because the caller only
  refreshed the live version on an unrelated trigger. Derive it, or delete it.
- **A lookup that misses is not the same as "not real".** Skipping an object
  because it has no row in a table is only safe if *one* kind of thing lacks a
  row. `FurnitureTag.index` is a row of `CAFE_LAYOUT` except for two kinds that
  carry negative sentinels — generated wall segments at `-1 - n`, which the
  placement validator should skip, and player-placed instances at
  `INSTANCE_INDEX_BASE - n`, which it must not — and treating both as "not
  found" is what let cat beds be stacked on each other. **Name the sentinel and
  export it from the file that writes it**; a bare `-1000` in one file cannot
  be recognised by another.
- **Pull the decision out of the loop when the loop needs a renderer.** The bug
  above was invisible to a full placement test suite because the rules were
  pure and well covered while the code that *fed* them lived inside a
  `for` over `THREE.Object3D`s. If a classification can be a pure exported
  function taking plain numbers, make it one — that is the difference between
  a testable fault and one only a player can find.
- **A comment can outlive the thing it describes, and it will be quoted as
  fact.** Furniture rotated in 90° steps for months because a note said an
  arbitrary angle "would need a rotated hull" — and the rotated hull had been
  in `systems/placement.ts` since the day it was written, because half the café
  is authored on the diagonal. Nothing was wrong with the code; the *reason* was
  stale. Before accepting a documented constraint, check the thing it says is
  missing is actually missing.
- **A constant tuned against one size is a bug at another size.** The nestle
  allowance is subtracted from two pieces' *combined* reach, so 0.3 forgives a
  shared edge between a table and a chair and swallows most of a cat bed. If a
  tolerance is absolute and the things it applies to vary in scale, scale it.
  **And the converse:** the placement overhang is a *proportion* of the piece,
  which is right against the open lip of the floor slab (what it was written
  for) and wrong against a wall, where the limit is absolute — a quarter of a
  cat climber's half-extent is 0.29, which buries it in 0.30 of plaster. A
  tolerance has to be the same kind of quantity as the thing it forgives.
- **Measure a rule against the shape it is about.** The walkway check took the
  half-*diagonal* of a piece's axis-aligned bounds as a radius, so a rectangle
  was tested as a circle a third bigger than itself, and rotating a piece grew
  its no-go zone without changing the piece. The exact test (a separating-axis
  distance from an oriented rectangle to a segment) costs six candidate points
  and runs once per pointer move. Exact geometry is nearly always affordable at
  interaction rates; the approximation is what the player feels.
- **A rule that holds in one direction and not the other is usually a bug, not
  a decision.** `checkPlacement` has always said a wall-hung piece only clashes
  with other wall-hung pieces. Nothing said the converse, so the menu board and
  the shelves — everything above y 1.2 — were solid obstacles at floor level
  and the boards beneath them could not be stood on. Whenever a relation is
  written for one side, ask out loud what it means for the other.
- **Sweep a constant before tuning it, and be willing to leave it alone.** The
  walkway looked over-strict, so `routeClearance` was swept 0.34 → 0.20 over
  the whole floor: it buys 1–3% of placeable area, because the cost is the
  corridor's length in a four-metre room, not its width. The number stayed.
- **`response.ok` is false for every file the app loads, and it is not an
  error.** Capacitor serves the built app over a **custom URL scheme**, and a
  `WKURLSchemeHandler` answers with a plain `URLResponse` rather than an
  `HTTPURLResponse`. No HTTP status means WebKit synthesises `status = 0`, and
  `Response.ok` is defined as 200–299 — so `if (!response.ok) return` throws
  away files that downloaded perfectly. **This silenced every recording in the
  app for a week** while all of them played in every browser. Three.js is
  immune only because its loaders use `XMLHttpRequest`; it warns
  "THREE.FileLoader: HTTP Status 0 received" on every asset and carries on.
  Anything in this codebase that uses `fetch` must go through
  `audio/fetch-audio.ts`'s rule, or repeat the bug.
- **A browser cannot test the app, and now something can.**
  `swift tools/webkit-probe.swift dist` runs the built bundle in a real
  `WKWebView` behind a scheme handler shaped like Capacitor's. Every existing
  tool — `tools/shot.mjs`, `tools/render-audio.mjs` — drives headless *Chrome*,
  which is the wrong engine served the wrong way, and all of them reported the
  audio working while the phone was silent.
- **A fallback that can be heard is not a safety net.** It is a second
  implementation nobody chose, and it will get chosen. The synthesised music
  and cats sat behind the real recordings as "fallbacks" and went on playing
  underneath them for a day before anyone noticed. Delete the stand-in when the
  real thing lands; silence is a better failure than the wrong sound.
- **"Does the new thing work" and "does only the new thing play" are different
  claims.** Every check made after shipping the recordings confirmed the first
  — files fetched, decoded, played, in dev and in prod — and none of them could
  have caught the second. When replacing something, assert the *absence* of
  what it replaced, not just the presence of the replacement.
- **A rule *about* a journey has to be read from the code that makes the
  journey.** `checkPlacement` refused seats by testing a straight line from
  `DOOR_LOBBY`, which was where guests set off from — until they started
  ordering at the counter first (2026-08-26). Nothing tied the two together, so
  the validator spent months enforcing a constraint about a leg nobody walked,
  and Ellis found it by being told a chair was unreachable and then watching a
  guest sit there. **`visitor-manager.ts` is the authority for the route; a
  copy of it anywhere else is a copy that will go stale.**
- **When two systems hold an opinion about the same thing, write the agreement
  down as a test.** Reachability was decided independently by the visitor
  manager (walks through anything) and the validator (refuses a lot). Either
  could be right; both cannot be, and the player is who finds out. The
  invariant — *anywhere a guest can sit is somewhere a seat may be placed* — is
  now a test in `cafe-room.test.ts`.
- **A veto has to be proportionate to the thing vetoing.** Any solid object on
  the line to a seat used to refuse the seat, so a 0.25-high cat bed was as
  final as the 0.78-high counter — and the walkthrough had just told the player
  to put a cat bed in the middle of the floor. People step over low things and
  walk around tall ones; `STEP_OVER` is measured against the pack's own
  furniture, which has a clean gap between the two groups (0.38 → 0.72).
- **A phase test must ask "have they got past this?", not "are they on this and
  done?"** Those read the same and differ in one case: something that has moved
  *beyond* the phase. `arrived(leg)` was `walk.leg === leg && travelled >= total`,
  so the moment a guest started the second leg the *first* leg's test went false
  again, the earlier branch re-fired, and it reset them to the start — which
  made the second leg's test false next frame, for ever. Measured in the running
  game: **20 leg changes a second for seven seconds**, restarting the walk clip
  each time. Order your phases and treat a phase left behind as complete.
- **A per-frame state machine needs a handle on it.** This one was invisible
  from outside the class, so "the character is spasming" could not be turned
  into "it is flipping between two legs" without adding an export first. §17
  asks for debug visualisation early for anything state-based; `visitorManager`
  is on `window.__mallow` now for exactly this.
- **Fixed duration over variable distance is a speed bug waiting to happen.**
  Guests walked each leg in a set number of milliseconds, so the same clip
  played at 0.29 u/s to a near seat and 2.71 u/s to a far one. Where something
  *moves*, give it a speed and let the arrival time follow; where something is
  *scheduled*, let the schedule wait for the arrival rather than teleporting.
- **Anything that only refreshes on someone else's trigger will go stale.**
  Three cat bugs in one session were all this shape — state recomputed when the
  *room* rebuilt, on a path that adopting a cat never took. Prefer recomputing
  unconditionally over gating on "did the thing that usually changes this
  change".

---

## 15. Build order (validate first, invest after)

**Milestone 1 — Playable core loop (the experiment):** ✅ built — one café scene, one cat, visitors arrive and pay, money accrues, buy a second cat. Ugly is fine. Prove the loop is pleasant. **Gate: get to TestFlight + a small cosy Discord and measure D1/D7. If D1 < 30% or D7 < 10%, fix the loop before anything else.**

**Milestone 2 — The hook:** ✅ built — cat rarity + collection ("cat-dex") + naming + roster screen. Decisions made here:
- **Adoption is gacha-lite** (§5): the adopt button costs earned money and draws a weighted-random breed (weights/appeal in `data/cats.ts`, draw logic in `systems/cats.ts`, seeded-rng unit tests alongside). Duplicates allowed — every cat is an individual the player names; the cat-dex tracks *breeds* discovered.
- **Rarity feeds the economy via "appeal":** each rarity tier has an appeal value; visitor rate/pay scale on the café's total appeal instead of raw cat count (common = 1, so all-common cafés match the old M1 math exactly).
- **Naming flow:** adoption opens a reveal card (rarity badge + breed + flavour line) with a prefilled, editable name — cats can be renamed anytime from the roster.
- **Save system pulled forward from M3** (localStorage, versioned `state/save.ts`): naming cats that vanish on refresh would violate "never lose a player's cats." Offline/idle income remains M3.
- `vitest` added (`npm test`) for the pure systems/economy math.

**Milestone 3 — Depth:** 🟡 in progress.
- ❌ **Venue progression** — built and scrapped the same day; see §0's
  direction-change box. The Style menu replaced it as the long curve.
- ✅ **Idle/offline income** — earnings accrue while away, welcome-back card.
- ✅ **Save-system hardening** — versioned migration chain (now v6), tested.
- ✅ **Upgrades / décor** — the upgrade catalog is down to two levers (décor,
  brews) now the café is one fixed room; see §8 "The small-café economy".
- ✅ **Cosmetic customisation** — the Style menu (§8), double-gated by unlock
  milestone and price. This is the progression the direction change demanded.
- ⬜ **LTE event framework** — the remaining piece, and the highest-ROI one.
- ⬜ **Depth beyond colourways** — recipes, cat furniture, regulars, seasonal
  bits. Without these there is still no answer to D7.

**Milestone 4 — Beauty pass:** 🟡 in progress — art cohesion, lighting, juice (§10), audio.

**Reordered 2026-07-31, deliberately.** The original plan put the entire beauty pass after M3. That is a trap for *this* game: the §15 gate is "ship to TestFlight, measure D1/D7, stop if D1 < 30%" — and for a cosy game the feeling **is** the product. Running that gate on a grey-box build measures "does an ugly game retain" (no) rather than "is this loop sticky", producing a false negative that could kill a good game.

The resolution is **art *direction* early, art *volume* late**:
- ✅ **Direction locked** — hero cat silhouette, flat-shaded low-poly style, warm lighting with ACES tone mapping, cohesive palette. One cat, not fifty.
- ✅ **Juice + audio** — these are cheap, don't depend on final assets, and transform how a placeholder build feels. §10 already called them "the product, not decoration"; they no longer sit behind depth work.
- ⬜ **Volume** — real GLB assets, café/prop art, UI/icon art. Still gated on validation, still the expensive irreversible bet §4 warns about.

Keeping `/systems` pure and meshes confined to `/entities` is what makes the swap cheap later — don't erode that.

**Milestone 5 — Ship path:** 🟡 started early, out of order — ✅ **analytics**
(§11) and ✅ **the Capacitor iOS build** (2026-08-05, §16) both exist. Still
outstanding: monetization per §5, TestFlight beta → launch with ASO + creator
seeding (§12), then iterate on real data. Note the packaging landing early is
*not* the gate moving: §0 still says no public cohort until a week of play
exists. It only means the build is ready when the game is.

Resist polishing before the core loop is proven fun. Milestone 1 is the bet; everything after is investment in a *validated* bet.

---

## 16. Commands

```bash
npm run dev        # local dev server (test in browser first — fastest loop)
npm run dev:lan    # same, exposed on the LAN — open on a phone, Add to Home
                   # Screen. This is the day-to-day device loop; a native
                   # rebuild is only needed to measure performance.
npm run build      # production web build → dist/
npm test           # 396 tests, no renderer needed
npm run balance    # simulate weeks of play under four player habits

npm run ios        # build + sync + open Xcode. The one to use.
npm run ios:sync   # build + sync, without opening Xcode

# **Pressing Play in Xcode now rebuilds the web app itself** — a "Build web app"
# run-script phase runs `npm run build && npx cap copy ios` before Resources.
# Before that existed, `ios/App/App/public` was only ever refreshed by
# `cap copy`, so an Xcode rebuild — or a delete-and-reinstall — faithfully
# shipped whatever stale bundle was sitting there. That cost three rounds of
# "the feature isn't on my phone". If the phase is ever removed, `npm run
# ios:sync` becomes mandatory again.

# Asset pipeline. Both write into public/ and are checked in so the conversion
# is reproducible — never hand-export these.
blender --background --python tools/convert-characters.py   # both packs → one GLB
python3 tools/build-face-atlas.py                           # eye + mouth atlases

# Bounce the synthesised audio to a file you can play. Needs `npm run dev`.
# `cafe` is music + cats at the levels the game mixes them — the one to listen
# to. `music` and `cats` isolate each. Renders offline (faster than real time)
# in headless Chrome, because that is where the synths and a real WebAudio are.
node tools/render-audio.mjs cafe 60 out.wav
node tools/render-audio.mjs cats 18 cats.wav

# Run the BUILT bundle in a real WKWebView, behind a scheme handler shaped like
# Capacitor's. This is the only tool that tests the engine and the transport the
# app actually uses — everything else here drives headless Chrome over http, and
# all of it happily reported the audio working while the phone was silent for a
# week. Reach for this whenever something works in the browser and not on the
# phone. Needs `npm run build` first; no dev server.
swift tools/webkit-probe.swift dist

# Headless screenshot + console errors, at iPhone 14 Pro size. Needs `npm run
# dev` running. This is the only way an agent can see the scene when the Chrome
# extension isn't connected — and geometry/lighting bugs are invisible to tests.
node tools/shot.mjs                      # → shot.png
node tools/shot.mjs http://localhost:5173/gallery.html out.png --w 900 --h 700

# Everything past the first screen is behind a tap, so drive the page first.
# `--js` is awaited; `--settle` is how long to wait after it before shooting.
node tools/shot.mjs http://localhost:5173/ shop.png --settle 1500 --js \
  "[...document.querySelectorAll('.roster-button')].find(b=>b.textContent.includes('shop')).click()"

# `--errors full` prints 40 lines of each console error instead of the first.
# A shader error's first line is always "VALIDATE_STATUS false"; the actual
# diagnosis is a dozen lines further down.
node tools/shot.mjs --errors full

# `--dpr` sets the device pixel ratio, which defaults to 2. The whole resolution
# budget is solved from that number, so a pinned DPR is why the quality setting
# looked fine in every screenshot ever taken of it. Shoot at 3 to judge sharpness.
node tools/shot.mjs --dpr 3

# `--js` DOES NOT SUPPORT TOP-LEVEL AWAIT. Wrap async probes in an IIFE or they
# silently do nothing and the screenshot looks plausible.
```

In a dev build `window.__mallow` exposes `{ camera, controls, store, catManager }`
for poking at the scene from the console or over CDP. It is compiled out of
production by `import.meta.env.DEV`.

**Getting to TestFlight** (2026-09-05). The app archives clean for arm64 and
the audio is licence-clear (§10). What is left is Ellis's, because it needs a
paid account:

1. **Enrol in the Apple Developer Program**, $99/yr. This is the only real
   blocker — TestFlight cannot be reached on a free Apple ID, and the keychain
   here has only an *Apple Development* certificate. Xcode makes the
   distribution certificate itself once the membership is live.
2. **Create the app in App Store Connect** and answer **App Privacy**. The
   analytics are live (`VITE_TELEMETRYDECK_APP_ID` is set) and send a random
   per-install UUID, so that is a declared collection — *Identifiers → User
   ID*, not linked to identity, used for Analytics. An undeclared collection is
   a rejection.
3. **Archive** with the destination set to *Any iOS Device (arm64)* — not a
   simulator — then Organizer → Distribute App → TestFlight & App Store.
4. **Internal testers first** (up to 100, no review). External testing needs a
   Beta App Review and is the one-shot first impression §4 warns about
   spending early.

Three Info.plist entries were added on 2026-09-05 so the first upload is clean:
`ITSAppUsesNonExemptEncryption = false` (otherwise App Store Connect asks the
encryption question on *every* upload), `UIRequiresFullScreen = true` (the game
is portrait-locked, and without it Xcode warns that all orientations must be
supported), and `UIRequiredDeviceCapabilities` corrected from the Capacitor
template's `armv7` to `arm64` — the binary has only ever been 64-bit.

> **Edit that plist with `PlistBuddy`, never `plutil -extract`.** `plutil
> -extract KEY FMT FILE` **rewrites the file in place** with the extracted
> value unless you pass `-o -`; it replaced the whole Info.plist with
> `["armv7"]` on 2026-09-05 and the only symptom was an archive failing with
> "unable to read property list".

**Running on a real phone**, first time only — the parts that are Ellis's
because they need his Apple ID:

1. `npm run ios`, then in Xcode select the **App** target → *Signing &
   Capabilities* → tick *Automatically manage signing* and pick a Team.
2. Plug the phone in, select it as the destination, hit Run. First launch needs
   *Settings → General → VPN & Device Management* → trust the developer.

A **free Apple ID works** but the build expires after **7 days** and must be
re-run from Xcode. A paid account ($99/yr) gives 1-year builds and TestFlight,
which is what §15's "TestFlight beta" step and any outside tester needs.
`appId` is `com.ellis.mallow` in `capacitor.config.ts` — **change it before the
first App Store submission**, since it is permanent once a listing exists.

---

## 17. Working with Claude Code

- **Start every session by reading §0; end every session by updating it.** That
  section is how a fresh context window learns what exists and what to tackle
  next without re-reading the codebase. Update the "Built" and "Next up" lists,
  append a dated entry to **`docs/session-log.md`** (mirroring only the newest
  handful into §0), tick §15, and write any architectural or balance decision
  into the section it belongs to. Treat this as part of the work, not paperwork
  after it.
- **A rule belongs in a numbered section; the log holds the story.** If an entry
  teaches something that will be true next month, promote it — the log was moved
  out precisely because durable rules had been left buried in narrative where a
  fresh session would never find them, and it cost 34k tokens a session to keep
  carrying them.
- **`.click()` does not test that something is clickable.** It dispatches
  straight at the node and never hit-tests, so it passes happily against a
  button no player can press — which is exactly what shipped twice. Use
  `document.elementFromPoint` on the centre of the element's rect and assert the
  result is the element or inside it.
- **A first-run feature needs a second-run door**, or it is untestable by the
  only person who can judge it. The tutorial guard was correct and still made
  the tutorial unreachable for the person who asked for it. **That door is
  `window.__mallow.replayTutorial` and no longer a settings row** — Ellis,
  2026-08-27: *"remove the option to watch tutorial repeatably."* The rule
  survives the removal: a dev-only handle is still a door, and deleting the
  mechanism outright would have made the walkthrough testable only by wiping a
  save.
- Add debug visualisation **early** for anything spatial or state-based — don't wait until you're stuck (hard-won lesson from a previous collision-bug fight). `scene/layout.test.ts` is the cheap version of this: bounding-box assertions catch clipping furniture without a renderer, and they run in `npm test`.
- **Simulate the economy before trusting it.** A short script that plays a greedy
  optimiser forward for 48h exposes stalls, dead upgrades, and runaway inflation
  in seconds — it is how the two balance bugs above were found, and it beats
  guessing at cost curves by a mile.
- Prefer building one system end-to-end over half-finishing several.
- When balancing feels off, expose the numbers in `/data` and a debug overlay rather than guessing.
- **Stay grounded in §4.** If a proposed feature or spend isn't serving the retention targets or the validate-first philosophy, question it.
- Keep this file current — when we make an architectural or design decision, record it here.
