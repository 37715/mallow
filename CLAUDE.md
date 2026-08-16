# CLAUDE.md — Mallow

> Working title: **Mallow** (a cosy cat-café game). Swap the name here if it changes.

This file is the shared brain for the project. **Read it before starting work in this repo.** Keep it updated as decisions are made — if something here is out of date, fix it. §0 is the live status board: read it first, update it last. Sections 1–5 are the strategic grounding: the *why*, the *who*, the numbers we're accountable to, and the honest reality that keeps us from drifting. Sections 6+ are the *how*.

---

## 0. Current status — read this first, update it last

> **Standing rule for every session.** Start by reading this section to see what
> exists and what's next. **Finish by updating it** — move completed work into
> "Built", rewrite "Next up", and append a dated line to the log. Also update
> §15 milestone ticks and record any architectural or balance decision in the
> section it belongs to. A session that changed the game but not this file is
> not finished. Nobody should have to re-derive the state of the project by
> reading the whole codebase.

**Last updated:** 2026-08-26 (guests order at the counter, and a busy café serves takeaways)

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
  adopting a cat, inventing a drink and placing furniture**, waiting at each
  step and topping the till up to exactly what that step costs
  (`systems/tutorial.ts`, pure and tested). No fail state; **settings has
  "show me round again"**, which is the only way an existing café ever meets
  her. Script is data (`data/tutorial.ts`). **And she leans in round the side
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
- `npm test` — 248 tests over the pure systems, save migrations, café geometry,
  the visitor loop, contentment maths, the camera controls (pan/zoom clamps,
  tap-vs-drag, press-and-hold), the placement rules the authored café itself
  has to pass, the lip-sync viseme mapping, the merged pack's clips and face
  meshes, and a jsdom smoke suite for the HUD.

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
2. **Wall pieces have no colourways.** They can be bought, hung, moved and
   sold, but the pack ships the blackboard and the shelves in one finish each,
   so there is nothing to offer — unlike every other piece the shop sells.
3. **Cat capacity + rehoming** — §8 step 7, the last unbuilt step.
3. ~~**Builder mode**~~ ✅ 2026-08-24 — `ui/builder.ts`.

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
- **Guests have a face but still no attention.** They blink, and they wear a
  mood once they've settled (`SEATED_MOODS`) — but they still don't *look* at
  the cats, each other, or the barista. Head-tracking is the next real step
  and it is a bone rotation, not an asset problem.
- **Guest animation is walk → sit → idle and nothing else.** No serving — the
  packs ship `Tray_Walk`, `TallChair_Served_Happy` and ~50 others unused. The
  merged pack adds `Social_Stand_Discussion_1/2` and the nods, which are
  exactly what two guests at one table should be doing.
- **The game runs out of things to do in about a day, and it is too passive
  even before then.** Five cats, two maxed upgrades and four style categories
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
- **The character creator has a cat label floating over the avatar.**
  `CatLabelLayer` keeps projecting "Biscuit" onto the screen during onboarding,
  where it lands on the character you are designing. One line to suppress; not
  done because it wasn't asked for.
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
- Ambient audio is synthesised; a composed bed would be better.
- ~~No UI/icon art~~ — a drawn SVG icon set now covers navigation, upgrades,
  the sound toggle and close (§9). It is deliberately small; anything new needs
  drawing in `ui/icons.ts` to the house style, not pulling from an icon font.
- Bundle ~818 kB JS (Three.js + the post chain) + 139 kB font. The **whole
  `dist/` is ~13 MB**, and that is the number that matters now it ships in an
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
- **Still not run on a real device**, though as of 2026-08-05 nothing stands in
  the way but signing — the Xcode project builds. The open questions §13 wants
  answered on hardware: does **GTAO** hold framerate (it is the frame's most
  expensive pass, drop it first), does the **Draco** decode of the 2.7 MB
  character GLB stall the first frames, and does the ~535-mesh late-game café
  hold up. **Agent screenshots do now work** — the trick is a freshly created
  tab; reusing a tab that has had the WebGL page loaded a while makes script
  injection time out every time.

**Session log:**
- *2026-08-26, last* — **A visit is a sequence now: in → counter → seat, or a
  cup to go.**
  - Ellis: *"i still want them to talk to my character and order before sitting
    down. or sometimes buy the drink and walk out with it. make it more real
    rather than a constant stream of people just sitting in the chair."* The old
    loop was spawn → seat → pay → leave, which is a waiting room — **nobody
    ever went near the counter the player stands behind**, so the barista the
    game makes you design had nothing to do.
  - **The branch that matters is the full café.** The old loop *dropped* an
    arrival when every chair was taken, so a popular café looked identical to
    an empty one from the doorway. Now the overflow queues, buys and goes.
  - **A takeaway is worth 0.55 of a visit, and that number is load-bearing.**
    §8's economy rests on two throughput ceilings and one of them is seating;
    if a full café sold every arrival a cup at full price, seats would stop
    mattering. `npm run balance` after this change: playing still beats being
    away by 5.84×, till ceiling intact.
  - **Everybody pays at the counter**, not on the way out. It is where a café
    takes your money, it is the only moment a takeaway stands still, and it
    puts the coin pop beside the barista instead of beside an empty chair.
    `paidSeatIndexes` carries −1 for the counter.
  - **A café with no seats at all still serves nobody**, deliberately: quietly
    earning without a chair would hide the fact that it needs one. A test pins
    it, alongside one that a busy café produces takeaways rather than silence.
  - The takeaway roll is the system's only randomness, and it made two existing
    tests flaky the moment it landed — `tickVisitors` takes an injectable
    `random` now and the sims pass "always sit".
- *2026-08-26, end of day* — **Faces for every breed, and money that moves when
  the piece lands.**
  - **Sixteen drawn cat faces, replacing a coloured disc with a dot on it.**
    The stylesheet called that disc "the placeholder portrait until real cat art
    lands"; the pack never shipped, and Ellis called it: *"lets give up waiting
    for the released cat pack. create all the little cat faces for the icons."*
    A collection game's hook is that the things you collect are individuals
    (§8), and sixteen identical circles say they differ by a hex code.
    **The markings are what does the work, not the fur colour** — a tuxedo and
    an espresso are both near-black, a marmalade and a butterscotch both warm
    cream, and at 50px only a pattern separates them. So every breed carries
    one (`CatDefinition.pattern`) plus its own eye colour. §9's icon rules
    hold, with one deliberate exception: these are *portraits*, so they carry
    real colour rather than `currentColor`.
  - **Money moves when the piece lands.** Ellis: *"when i place an item, that
    is when i want a ka ching sound fx and an animation and for the money to be
    taken. only when positioned is chosen and placed."* Buying now records a
    `pendingPurchase` and charges nothing; `settlePurchase` takes it on commit,
    with the chime and a coin floater at the piece. It also removes an oddity
    the old flow had — the till dropped for a decision the player had not
    finished making, and cancelling flickered it back up. Measured: £40 stays
    £40 on buy, £40→£5 on placing, and buy-then-cancel never moves it.
    `pendingPurchase` is runtime-only, so `pagehide` settles it — otherwise a
    force-quit mid-drag is free furniture.
  - **"bed a cream".** `furnitureName` fell through to tidying the raw asset
    (`Cat_Bed_A_Cream`) because an instance has no `slot` to look a category up
    from. It prefers the catalogue's own name now — the shop already knows what
    the player thinks a thing is called, and the pack's internal naming is only
    a fallback for props nobody can buy.
  - **A copy of a recoloured piece kept the shop's original colour.** `copyAsset`
    returned a fixed name, so a second sofa stayed cream after you had repainted
    the first. It resolves through the customisation slot now. And the colours
    page **says how many pieces it repaints** — a colourway belongs to a slot,
    not an object, which the page never admitted anywhere.
  - **The purr, third time.** Ellis: *"so it doesnt sound like a diesel engine
    starting up."* Three things were making it a motor, in order: **energy
    below ~150 Hz** chopped at 25 Hz, which is exactly an idling diesel — there
    is a highpass now and the 180 Hz "chest" band is gone entirely; a **hard
    pulse shape** with harmonics to the seventh; and **modulation from 0.1 to
    1.0**, a chopper rather than a flutter. A purr heard across a room has
    almost nothing down low — the rumble is something you feel with a hand on
    the cat, not a sound.
- *2026-08-26, very last* — **One surface per chore, and the framing is what
  does the work.**
  - Ellis: *"it looks like im also wiping the wall? it should only be pure
    glass. not the entire wall. just the window. and of course it should look
    different for the floor and tables too."* **Both halves have the same
    answer: frame the camera so the card *is* the surface.** Masking the grime
    to the glass would have solved the first complaint and taught us nothing
    about a tabletop; a per-chore subject and framing solves both, and every
    job looks like its own job. `ChoreSurface` in `data/chores.ts` is three
    numbers — where the camera stands, how much world the card holds, and what
    shape the card is — and `scene/chore-surface.ts` knows nothing else.
  - **The card takes the surface's shape.** A pane of glass is landscape and a
    patch of floor is square; showing one in the other's box is most of what
    would make three chores feel like one.
  - **The glass is brighter because the panel behind it is over-range.** The
    preview composite applies the room's own exposure (0.40) and ACES before
    the grade, so a plain white plane lands near 0.7 and reads as flat grey.
    A colour above 1 is what an over-exposed window actually looks like going
    into a tone map — the same trick the café's own daylight panel uses.
  - Anything with a colourway resolves against the player's customisation, so
    a repainted café is cleaning *its* glass and *its* floorboards.
- *2026-08-26, last* — **The wipe minigame was inert too, and it is a proper
  window now.**
  - **`pointer-events: auto` was missing again.** Second widget in a row.
    `#ui-root` is `pointer-events: none` so canvas gestures reach the café, and
    the wipe layer never opted back in — so the muck was a decal and every drag
    panned the room behind it. Ellis: *"its just a grey/white sheet over the
    screen that does nothing? i cant wipe anything im still moving about the
    camera?"* **Anything mounted into `#ui-root` that expects a touch needs
    this, and its absence is invisible except by really touching the thing** —
    which is why the check is `elementFromPoint`, not `.click()`.
  - **The muck covered the whole screen, so the thing being cleaned was the
    phone.** There is a real render of the café's own window in the middle of
    it now (`scene/window-preview.ts`), grime confined to the glass, a shine
    sweep and a scatter of sparkles when it comes clean.
  - **Three framing mistakes, all fixed by measuring the piece instead of
    assuming where it is.** Architecture in this pack has an *offset* local
    frame, so an object placed at the origin is not at the origin: this wall's
    geometry lives at z ≈ −2, x −2.26…2.02. First the camera sat inside the
    glass (3.15 away covered 1.6 across against a 2.24-wide aperture) and the
    "render" was a flat field — sampled 185,180,168 at every point, which is
    what tipped it. Then the daylight panel was *in front* of the wall. Then a
    panel sized to the frame spilled past the arch's sweep as a grey wedge.
    Everything is derived from `Box3().setFromObject` now.
  - The chore is banked **after** the overlay closes, so the appeal chip's own
    celebration plays on a HUD the player can see. Verified end to end: money
    40→52, appeal 1.9→2.5, chore logged, overlay and marker gone.
- *2026-08-26, end* — **The doorway follows the floor out.**
  - Ellis: *"that little notch is always the doorway and should still be a
    little notch over the new floor square so it should move along to the edge
    of the floor again. and the 'outside' furniture also needs to move so it
    doesnt end up being inside when i extend."* Both halves are one rule:
    **a thing that means "the way in" or "the street" is defined by being at
    the boundary**, so when the boundary moves it moves.
    `Placement.followsEdge` is the flag; `growth(tiles)` is how far.
  - **The axis is explicit, not inferred.** The sign stands beyond +z and the
    stray cushion beyond +x, and guessing from coordinates would tie the
    layout to the current footprint. Growing +z alone must not drag the
    cushion inward, and a test pins exactly that.
  - **The old "retire the notch when a patio covers it" check had to go, not
    be adapted.** The notch *straddles* the boundary by design, so once it
    moves out to the new edge it is always "covered" by the tile it borders —
    the skip fired every time and an expanded café had no doorway at all.
    Verified by measuring, and it is what caught the real bug underneath:
    my edit had passed the growth to the *expansion* placement loop rather
    than the layout one, because a single-occurrence replace hit the first
    `place(...)` call in the file. The screenshot looked plausible either way.
  - **The walking route moves with it** (`doorPositions`, `setDoor`), or guests
    walk in through the middle of the room. `DOOR_LOBBY` deliberately stays —
    it is the waypoint that dodges the counter peninsula, which has not moved.
  - **The mover reads positions off the mesh now, not the layout.** Anything
    that can be carried by an edge has authored coordinates that are simply
    the *old* place once the café grows; the object in the room already knows
    where it is.
- *2026-08-26, later still* — **The chore prompt was untappable, and my test
  proved it worked.**
  - **`#ui-root` is `pointer-events: none`** so canvas gestures pass through
    it, and every interactive widget opts back in with `pointer-events: auto`.
    The chore prompt never did, so it was invisible to every tap. Ellis, twice:
    *"pressing it doesnt even do anything."*
  - **And the headless test that "verified" it used `element.click()`**, which
    dispatches the event straight at the node and never hit-tests. It passed
    against a button nobody could press. **`.click()` does not test that
    something is clickable** — use `document.elementFromPoint` on the centre of
    its rect and check the result is the element (or inside it). That is what
    the new check does, and it is the only kind that would have caught this.
  - **The affordance moved onto the job itself.** Ellis: *"make it be popping
    up from or next to the window, so the user has to tap on the window to do
    it."* A row in the HUD is a to-do list; a sparkle on the glass is the café
    asking, and it teaches *where* the job is — which starts to matter the
    moment there is more than one kind. `ui/chore-marker.ts`, DOM projected
    from a world anchor on the chore (`Chore.at`).
  - **The café opens when the guide leaves.** `openedAt` is stamped in
    `finishTutorial` rather than at café creation, so `FIRST_DUE_MS.window`
    being 5 s means five seconds after Mal walks out — not five seconds after
    the save was written, which lands in the middle of her walkthrough.
  - **The purr was three separate wrongnesses**, and "rumble" in the old
    comment hid all of them: lowpassed noise is boomy hiss where a purr's rasp
    lives in a *band* around 200–600 Hz; a sine tremolo is a wobble where a
    purr is a *pulse train* (the folds close ~25×/s and the ear identifies the
    repeated edge); and the tremolo was summed into a gain that was already
    being ramped, so its depth changed across the sound. It is a periodic-wave
    pulse gating a bandpassed noise now, with the rate drifting through the
    breath — a perfectly fixed 25 Hz is the clearest tell that a sound is
    synthetic.
  - **Mal was too British.** "grand", "rather the point", "do stop and stroke
    them", "on the house", "a flat white when you've a minute". Warm is the
    goal; regional is not.
- *2026-08-26, last* — **Six things from playing it on the phone, and the
  portrait had to be rebuilt.**
  - **A 3D portrait cannot live on the canvas, and WebKit is why.** The first
    version drew Mal onto the café canvas and cut the panel's dim away above
    her with a `clip-path`. Perfect in headless Chrome; on Ellis's phone she
    was *"far too far in the top left and its getting cut off… it even is
    sometimes completely blurred"*. **WebKit does not reliably clip
    `backdrop-filter`**, so the panel's blur sat straight on top of her — and
    no z-index can fix that, because the canvas is under all DOM by
    construction. She is a **2D canvas holding a copy** now (`blitPortrait`:
    `drawImage` from the WebGL canvas in the same frame as the render, which is
    a GPU-side copy, not a `readPixels` stall), sitting inside the bubble as an
    ordinary element. No notch, no clip-path, no safe-area arithmetic, nothing
    to hide behind. **The general rule: anything that must sit above the
    interface has to *be* interface.**
  - **The arrow pointed backwards.** After picking an ingredient it swung down
    to the café button *underneath the open panel* — because the deeper
    markers stop existing as you drill in, so the deepest *available* one was
    two levels up. Depth is monotonic within a task now: it never retreats, and
    shows nothing rather than confidently pointing at the wrong control. The
    name field got its own marker, since "add to the menu" is disabled until
    the blend is named and an arrow on a dead button teaches nothing.
  - **Guests sat 50.7° across the armchair, and always had.** `SEAT_FACINGS`
    faces the door, which is right for a stool or a cushion and wrong for
    anything with a back: the armchair is authored at 0.3888 and the door lies
    at −0.4964 from it. Invisible until furniture could be turned, and then the
    only thing you could see. `Placement.seatFacing` is the override, and the
    default stays door-facing for the round seats that need it.
  - **`<button>` inherits neither `color` nor `font`.** §9 already recorded the
    `color` half (the settings cog drawing system blue on iOS); the chore
    prompt shipped in the platform's system face for exactly the same reason.
    Both halves are written down now.
  - **The chore prompt appeared during the walkthrough.** The window is due the
    moment the café opens — but "opens" means when the *guide leaves*, not when
    the save is written. It is gated on `tutorialDone`, which also explains why
    tapping it did nothing: it was sitting under an open modal's dim.
  - **Two glasses hung in mid-air in a new café.** `Deco_TallGlass_Flipped` ×2
    were the only things at shelf height without a `shopItem`, so they stayed
    when the shelf they stand on was not bought. Same fault the cupcakes had.
- *2026-08-26, later* — **Chores, and three bugs found by playing it.**
  - **The post-tutorial hole is the real problem, and a *price* cannot fix it.**
    Ellis: *"i finish the tutorial and now im out of cash with literally nothing
    to do."* Everything the game offers at that moment costs money, and the
    walkthrough deliberately leaves the till at £3.31 (2026-08-25) — so the
    only thing that can fill the gap is something gated on **time and
    attention** instead. That is the whole design of `data/chores.ts`, and it
    is why the window's first due date is zero.
  - **They only ever add.** A fresh chore contributes appeal; a due one
    contributes nothing. A café that never does one earns exactly what it would
    have earned had the system never shipped. Anything else is a decay
    mechanic, and pillar 1 forbids those — the same line already drawn for
    petting and for feeding (2026-08-06).
  - **The satisfying part is that you are wiping your own café.** The grime is
    a canvas over the whole screen and the 3D shows through wherever it has
    been cleared, so a stroke is rewarded with a stripe of your own room in
    full colour. It completes at **88%**, not 100 — chasing the last specks of
    a soft brush is where satisfying turns into fiddly.
  - **The picture setting genuinely did nothing on most phones, and the code
    was right.** Measured at DPR 3 the three levels solve to 2.186 / 2.677 /
    3.000, matching the arithmetic to three decimals. The fault is that a
    budget is an **absolute** number: on a DPR-2 phone every level solves above
    2 and they all clamp to the device ratio. Each level now carries a `scale`
    as well, and the ratio is the smaller of the two — measured 1.24 / 1.60 /
    2.00 at DPR 2 afterwards. **A budget bounds memory; only a fraction of
    native bounds *perceived* sharpness. Neither can do the other's job.**
  - **Seated guests did not turn with their chair.** `SEAT_FACINGS` is a module
    constant baked from the layout, and it stayed one when seat *positions*
    went live in August — so a guest followed their chair across the room but
    never rotated with it. Two halves: `seatFacings(placements)` adds the
    player's rotation delta, and the mesh is aimed **every frame** rather than
    once on sitting down. The conditional was the actual bug; a single
    assignment had no reason to be inside the "just sat down" branch, and
    putting it there is what let the two drift.
  - **Mal's portrait was cropped and had mismatched corners.** The crop was a
    framing number; the corners were the element being rounded while the notch
    cut in the dim was a plain rectangle, so the same corner read curved on one
    layer and square on the other. The notch polygon now carries a five-point
    quarter-arc at the same radius.
  - `tools/shot.mjs` takes **`--dpr`** now. It was pinned at 2, and the entire
    resolution budget is solved from that number — which is exactly why the
    quality setting looked fine in every screenshot ever taken of it.
- *2026-08-26* — **Mal leans in round the side of the panel — and the docking
  that was supposed to fix this had never worked.**
  - **The bubble had been docking *behind* the panels the whole time.**
    `.speech-layer` is positioned with a z-index of its own, which makes it a
    stacking context, so `.speech-bubble.docked { z-index: 40 }` was being
    resolved *inside* a layer sitting at 3 — below the panel layer at 5. Every
    line she said with the shop open was rendered behind the card and blurred
    by its `backdrop-filter`. Screenshotting it settled in one shot what
    reading the CSS only suspected. **A z-index is meaningless without knowing
    which stacking context it lands in**, and "I set it high" is not a check.
    The class goes on the *layer* now.
  - **She is a second `Character`, not a second camera on the first.** The
    obvious version renders the main scene through a close-up camera, which
    traverses and draws the whole café twice a frame — ~535 meshes late game
    (§13) against six for a person. The copy costs one `SkeletonUtils.clone`,
    built **lazily on first use**, since almost every session is somebody who
    finished the walkthrough long ago. The price is that it has to be *told*
    what the real one is doing, so `TutorialGuide` forwards every
    `say`/`express`/`gesture` to a mirror — including the same viseme frame,
    so the two mouths cannot drift.
  - **The framing numbers are measured, and the obvious one was wrong.** The
    first pass put the camera at y=1.58 because `HEAD_HEIGHT` is 1.62 — but
    that constant is where the *bubble* hangs, which is deliberately above her
    head, so it photographed the empty air over her fringe. Rendering her full
    figure and reading the pixels off gives the real shape: these characters
    are **chibi, about 1.32 units tall, head 0.83 → 1.36, shoulders 0.75**, and
    a head 0.65 wide against a 0.53 face — so **the crop is bound by her width,
    not her height**. §9's "quantise it" again, in a third place.
  - **A 3D portrait can only live where no DOM does**, because the canvas is
    under every scrap of interface — which is why this could not simply be
    raised over the panel like the bubble was. The panel's dim is clipped away
    from her corner with a `clip-path` notch, the panel is padded below it, and
    **`.hud-left` steps aside**, because measuring showed the stat chips
    (16,16 → 219,123) sit exactly where the only free corner is. The notch is
    cut to *exactly* the portrait's box: any larger and the surplus is a strip
    of bright café with nobody in it.
  - Verified by driving the real thing: **10 distinct mouth shapes** reaching
    the portrait across two lines, the gesture and expression forwarded, and
    the notch/HUD/clip round-tripping cleanly on panel open and close.
- *2026-08-25, after that* — **The arrow follows you in, and nothing advances
  on a timer.**
  - **The arrow points at a *task*, not a control.** Ellis: *"i press shop
    where the arrow is, then that arrow needs to go and a new one at the for
    the cats section … arrow for everything. direct user completely."* An arrow
    that stays on the shop button once the shop is open is worse than none — it
    now points at the thing you already did. `GUIDE_PATHS` gives each task an
    ordered path of `data-guide` markers and the deepest one currently on
    screen wins, so opening the shop makes the department card exist and the
    arrow moves to it by itself. Nothing has to tell it a panel changed.
    Two traps, both of which cost a debugging round: **`GUIDE_PATHS` was a
    `const` declared after the `return`**, so it never initialised (TDZ, the
    second time this pattern has bitten today); and **`offsetParent` is null
    for anything inside a `position: fixed` ancestor**, which is the whole HUD,
    so the obvious visibility check silently rejected every control on screen.
    Measure the rect instead.
  - **Nothing advances on a timer any more.** *"the text is gone before i can
    see [it]. should require a tap."* A timed hand-over cannot work when the
    player is inside a panel or naming a cat — a line that expires while they
    are busy is a line they never read. The only universal signal that somebody
    is ready is that they said so.
  - **The bubble docks to the top over a panel** instead of hiding. It used to
    hide with the coin floaters, which is right for a floater and exactly wrong
    for the one thing the player is being asked to read — and the walkthrough
    spends most of its length asking them to open a panel, so "hidden whenever
    a panel is open" meant "hidden for most of the tutorial". Docked rather
    than tracking her head, for the same reason the colourway sheet docked in
    August: on a phone the thing you are using is the middle of the screen.
  - **The typing sound was set by reasoning and the reasoning was wrong.** 0.022
    was chosen because "it fires 20 times a second so it must be tiny" — but it
    fires on every third *consonant*, and a 28 ms click has almost no energy
    whatever its peak. It is 0.13 now, i.e. comparable to `playTap`. Compare a
    sound to its neighbours, not to an argument about it.
  - **The arrow is curved.** A hard triangle on a rectangle is a road sign, and
    every other shape in this game is rounded (§9).
- *2026-08-25, very end* — **Twelve notes from playing the walkthrough. Two
  were mine, and one was silent on every platform but a phone.**
  - **No sound at all — and the code was fine.** WebAudio in a WKWebView runs
    on the app's audio session, and the default one **obeys the hardware
    ringer switch**. Every purr and coin was being synthesised correctly and
    going nowhere. `AppDelegate` sets `.playback` with `.mixWithOthers` now:
    plays on silent, doesn't stop a podcast. **Nothing in the web build could
    ever have revealed this**, which puts it in the same family as the
    never-firing autosave (2026-08-05) — a fault only the real device can show.
  - **The walkthrough advanced on *buying*, not on placing.** `pieces` counted
    `purchased`, which increments the instant you pay — so Mal congratulated
    the player and left while the ghost was still under their finger. Buying
    and placing are two steps in the script now, and `placementsMade` (runtime
    only) is the signal, because it is the only one that means what it says.
  - **Press-and-hold did nothing on anything the player had placed**, and the
    cause is worth keeping: `pickFurniture`'s `editableOnly` meant *has a
    colourway slot*, and an instance has none. So the newest furniture in the
    room was the only furniture you could not pick up. It means "has colourways
    **or** is movable" now.
  - **The café starts genuinely empty** — the armchair and stools are shop
    items. That created a dead end nobody would have found until it was too
    late: **no seats means no income**, so if the cheapest seat costs more than
    the £40 you start with, a player who skips the walkthrough can never earn
    their way to one. The armchair is £35 and a test pins the invariant.
  - **Your first add-in is free, for everybody.** Ellis ran out of money and was
    told to invent a blend. The fix belongs in the economy rather than the
    script: charging for the very first flavour gates the most authored thing
    in the game behind a purchase nobody can yet judge. Ingredient prices are
    also two tiers now instead of a nine-step ladder — an add-in is a *flavour*,
    and pricing vanilla under cinnamon says one is better rather than different.
  - **Arrows, not a glow.** *"the subtle glow thing isnt enough at all."* Right:
    a pulsing ring reads as decoration on a HUD where things already pulse, and
    it says "something about this button" rather than "press this". A big honey
    arrow has a direction and one meaning. The ring stays underneath it, because
    an arrow alone can look like it points between two buttons.
  - **Mal is a girl** — long hair, olive skin. The first pass gave her
    `Hair_Shave_AfroTop`, which is an afro over *shaved sides* and read
    masculine at the size she appears.
  - Tapping your own character shows your name for a couple of seconds and
    fades. Deliberately temporary, unlike a cat's: a cat's name labels a
    collection, yours is a reminder.
  - The app is **mallow**, lowercase, in the one place §9's voice hadn't
    reached. The icon gained an inner shadow, a gloss and a vignette — **steam
    was tried twice and removed both times**, because at icon scale a curl is
    two stray hooks, and there is only a sliver of canvas above the saucer.
- *2026-08-25, end of day* — **The phone had been running a two-day-old build
  the whole time, and now it cannot.**
  - **Nothing was wrong with Mal.** Ellis deleted the app, rebuilt, reinstalled,
    and still had no tutorial and no "show me round again" row — which is
    impossible for code that is definitely in the source. `ios/App/App/public`
    was last written **two days** before any of the work. **`public` is a plain
    folder reference: Xcode copies whatever is sitting in it, and nothing in an
    Xcode build ever refreshes it.** Only `npx cap copy` does. So a rebuild, a
    reinstall, even deleting the app first, all faithfully reinstall a stale
    bundle. §0 recorded this trap on 2026-08-10 and it has now cost three
    rounds, because "check for a symptom impossible in the new code" is advice
    that only helps the person who already suspects it.
  - **So Xcode does the web build itself now.** A `Build web app` run-script
    phase, first in the target, runs `npm run build && npx cap copy ios`.
    Pressing Play ships current code; there is nothing left to remember.
    Three things it needed, each of which failed first:
    - **`ENABLE_USER_SCRIPT_SANDBOXING` was YES**, which blocks a script phase
      from writing to `ios/App/App/public` — the one directory it exists to
      write. `EPERM: operation not permitted`. Now NO for both configurations.
    - **`npx cap copy` prints its failure and exits 0**, so the build "SUCCEEDED"
      with the copy having failed. The phase checks that
      `ios/App/App/public/assets` exists afterwards rather than trusting the
      status — a silently stale bundle being the entire bug.
    - **Xcode's PATH has no node**, so the script adds the usual homebrew and
      nvm locations and downgrades to a *warning* if it still can't find npm —
      breaking his ability to build at all would be worse than the thing being
      fixed.
    Verified by deleting `public/assets` and pressing build: it comes back.
  - **An app icon and a launch screen.** `tools/make-icons.py` draws one mark —
    a latte from above with a cat's face in the foam — and writes the 1024²
    icon, the 2732² splash and the favicon from it. It has to work at 60 px on
    a home screen, which rules out anything the game actually looks like: a
    diorama at thumbnail size is mud, and two flat shapes plus a silhouette are
    what survive. Checked at 40 px.
    **The splash is the backdrop olive, not cream.** A launch screen's one job
    is to not be noticed, and it gets noticed by being a different colour from
    the first thing the app draws.
  - **A loading screen, inline in `index.html`.** That placement is the point:
    everything else is behind an 800 kB module graph and a 4 MB Draco decode,
    so nothing defined in those files can be what the player sees first. Same
    olive, a breathing cup, "putting the kettle on…".
    It waits for the **character pack**, not the first frame — dismissing early
    shows an empty café and then pops a barista and a guide into it, which is
    exactly the moment the guide should be walking in. And it has **two**
    failsafes, because a full-screen cover that never lifts is a worse failure
    than the black screen it replaced: a 6 s cap on the wait, and a plain
    (non-module) script that clears it after 20 s even if `main.ts` never runs.
- *2026-08-25, last, later* — **Mal walks you through the whole thing now, and
  the reason nobody had met her was my own migration.**
  - **She never appeared on the device, and it was the guard I wrote.** Save
    v20 marks any café with `created: true` as `tutorialDone`, so Ellis's
    existing save skipped her entirely. The guard is still right — somebody
    five levels in does not want telling what the shop button is — but it
    cannot be the *only* answer, or the feature is unreachable for exactly the
    person who asked for it. Settings has **"show me round again"** now.
    **The general lesson: a first-run feature needs a second-run door**, or it
    is untestable by the only person who can judge it.
  - **The introduction is a walkthrough, not a speech.** Ellis: *"i want her to
    like walk through all the things you can do … buy another cat bed, then
    adopt the cat, then make a new drink. then place a furniture … its all
    planned out and you have just the right cash."* Four steps, in that order,
    each one waiting on the player actually doing it.
    **This reverses "it gates nothing, on purpose" from earlier today**, and
    the reversal is his call. What survives of the original reasoning is the
    part that mattered: there is still no fail state, the café runs underneath,
    and settings can start or stop it. What changed is that a step now *waits*
    — because a tutorial you can tap through teaches nothing, which is the
    same mistake as an unread manual.
  - **Order is load-bearing.** Beds first, because a bed *is* the right to
    adopt (2026-08-22), so step 1 is what makes step 2 possible and the player
    learns that by doing it rather than being told.
  - **Costs are read off the live curves, never written down.** `taskCost`
    calls `bedCost` and `costForNextCat`; a hard-coded £140 is a tutorial that
    silently stops working the day someone retunes the bed price. The till is
    topped up to **exactly** the cost and no further — a walkthrough that
    leaves you rich has spent the early game before it starts, and §8's early
    pacing is most of what protects D1. Measured end to end: 140, 45, 0, 60
    granted, £3.31 left at the end.
  - **Completion is measured against a baseline, never an absolute.** The task
    is "adopt *a* cat", not "have two cats", so the same script works for
    someone replaying it with a full café. It also means no step can read as
    already-done and flash past, which is the failure that turns a walkthrough
    back into a cutscene.
  - **A tap fills the line but never skips a task**, and deliberately does not
    consume the tap — the player needs the shop button underneath. Without
    that, the one gesture they already know walks them straight past the thing
    they were being asked to do.
  - **She points.** The control each step needs gets a soft honey pulse.
    Deliberately *not* a dimming overlay with a hole cut in it: the café stays
    touchable, so nobody can be trapped in a step (pillar 1).
- *2026-08-25, last* — **"Only two skin tones" was a loading bug, and the
  guide got a name.** Five notes from playing it.
  - **An unloaded texture samples black, and that is what the randomiser looked
    like.** Ellis: *"the surprise me randomiser … is only doing 2 skin tones -
    olive and ultra black."* The randomiser was fine — measured uniform across
    all six — and so was the binding, the UVs and the palette. What was wrong
    is that `TextureLoader.load` **returns a texture immediately and fills in
    its image later**, so binding a skintone nobody had fetched yet and
    rendering that frame gives a near-black face (measured 14,14,14, resolving
    to 127,71,42 about a second later). Every press of "surprise me" rolls a
    colour that may never have been fetched. The whole palette is preloaded
    now — 22 files of 64×64, about 30 kB, against a 4 MB GLB that has to load
    anyway. **The general shape is worth keeping: a fault that only ever hits
    the *unused* half of a palette reads as "there are only two options"
    rather than as a loading bug**, which is why four sessions of looking at
    the randomiser would never have found it.
  - **Measuring settled it in one pass, and describing it would not have.**
    §9's "quantise it" rule again: rendering each skintone and reading the face
    pixel gave `203,177,156 | 205,180,148 | 202,176,115 | 192,147,61 |
    172,99,46 | 134,58,25`. That also says something true about the pack —
    tones 0 and 1 are near-duplicates and the middle two are yellow-olive — so
    six tones read as fewer than six even when they all work.
  - **The guide is Mal, and she has black curly hair.** `Hair_Shave_AfroTop`
    and `Hair_Shave_BuzzAfro` were in the pack from the start and had simply
    never been offered; they are appended to `HAIR` (append only — a saved
    appearance stores the *index*), which gives the character creator two curly
    options it should have had all along.
  - **A paragraph now stays up.** *"once shes said a paragraph make it stay for
    a moment before moving on."* The gap was 260 ms, which swallowed the line
    the instant the last character landed. It is 1900 ms — a *reading* pause,
    sized to taking in a sentence you have just watched appear. Tapping still
    moves on immediately.
  - **The words make a sound as they type.** Synthesised, like everything else
    (§10). Two things keep it from being a typewriter: it fires on **every
    third consonant** rather than every character, which lands near syllable
    rate, and it is skipped entirely when a tap reveals the rest of the line at
    once — forty clicks in one frame is a burst of noise.
  - **The floor cushions are withdrawn, reversing the v19 grant.** They were
    already gone from a *new* café; what put them back in an existing one was
    the migration that handed them over on the grounds that the room had them
    before they had a price. Sound reasoning, wrong outcome, so save v21 takes
    them back. **Safe only because it can never take back something bought**:
    it runs once on the way from v19, and a café that buys them afterwards is
    already at v21. They stay in the shop at £55.
- *2026-08-25, later still again* — **Everyone has a face, and somebody walks
  in to show you round.** Ellis bought the Minty **Lip Sync and Expressions**
  pack (CC0, €5): *"lets get it going. use everything you can… i am planning on
  having a little intro tutorial with a character so we can use the lip
  syncing for that."*
  - **It merges rather than replaces**, and the reason it can is worth keeping:
    45 of its 47 joints share names with the base pack, so its clips play on
    our rig unchanged. `tools/convert-characters.py` now takes two FBXs. Four
    silent-failure traps in doing that are written up in §9 — the sharpest
    being that **the FBX importer prefixes actions with their source armature**,
    so every clip arrived as `Armature.001|Armature|…` and the duplicate check
    I had written found nothing, shipping two `Walk_Loop`s.
  - **The head had to be swapped, not added to.** The base pack bakes the eyes
    into `Body_Head` as a second primitive, so they can never blink. The new
    head is skin-only with the eyes and mouth as separate meshes — which is the
    whole feature, and is why a test now pins that `Body_Head` has exactly one
    primitive. If that head ever comes back the face stops moving and nothing
    says so.
  - **The atlas is shared; the geometry is per-character.** The obvious way
    round — a cloned texture per character holding its own `offset` — is a
    second GPU upload of the same image each time, and this is the app that
    iOS SIGKILLed for exactly that class of arithmetic. The face meshes
    UV-map the full 0–1 square, so cloning 44 vertices per character does the
    same job for nothing.
  - **The guide is the tutorial friend from 2026-08-08**, unparked because a
    talking character is finally possible. **It gates nothing** — pillar 1
    forbids pressure, and a tutorial that locks the interface until you tap the
    right thing is pressure. It talks, you can skip it, and the café runs
    underneath. The script is data so lines are content, not code.
  - **The mouth and the typing run off one clock.** The bubble owns it and the
    guide reads it, rather than each keeping its own timer. Two timers drift
    apart within a sentence and read as dubbing — and the drift would be
    invisible at a steady 60fps and obvious on a phone that stutters.
  - **Read the pack's how-tos rather than inventing the behaviour.** The blink
    is specified in `Eyes_HowTo.gif` as `0-1-2-3-2-1-0`, and the simplified lip
    legend groups whole letters, which is what makes a text-driven sync
    possible at all — we have graphemes, never phonemes.
  - A bug worth naming because the shape recurs: the guide's `finished`
    callback sets `guide = null` **during** its own update, so the next line's
    `guide.anchor` threw on the one frame it ended. Hold the reference locally.
  - Verified by driving the real thing in headless Chrome: **10 distinct mouth
    cells over 5s of speech, 3 eye cells from blinking**, taps advancing all
    nine lines, and `tutorialDone` persisting to a v20 save. `--js` in
    `tools/shot.mjs` **does not support top-level `await`** — wrap async
    probes in an IIFE or they silently do nothing.
- *2026-08-25, later still* — **Seats became a thing you buy.**
  - **A new café opens without the floor cushions.** Ellis: *"when i first
    start cafe get rid of those pillows on floor just take up space."* Right —
    a bare café should read sparse and *tidy*, and two big cushions on open
    boards are clutter before there is anything for them to gather round.
    They are £55 in Comfort now.
    **This is the change the economy had to grow into**, and §8 step 5 named it
    as blocking: the economy addressed seats by index out of a fixed count of
    five, so a seat could never be unbought. `CafeStats` carries a *list* of
    seat indices now rather than a count — "which ones", not "how many",
    because a café owning the fifth cushion but not the fourth would otherwise
    seat a guest on the floor. The index order stays frozen. Save v19 grants
    the cushions to every existing café, free: they were in the room before
    they had a price.
  - **A window cannot be cut where something is hanging, and a board cannot be
    hung on glass.** *"shouldnt be able to have window where theres a bloody
    menu blakboard too but it was there."* The pack's window is a hole in the
    wall piece, so glazing a segment takes the plaster out from behind whatever
    is nailed to it. `occupiedWalls` blocks the window; the placer's wall rule
    blocks the board. The wall faces the placer checks are **per segment**
    now, not per run, or a long wall could not say which part of it is glass.
  - **Copies are on the arrange page**, and sell back for half. Before this the
    second plant you put down could never be picked up again — the shop page
    reaches only the newest one. Half back rather than all or nothing: a full
    refund makes the shop a free sandbox, none makes trying a second plant a
    punishment.
  - "wall it up" reads as "remove window".
- *2026-08-25, later* — **Everything can be bought twice, and things hang on
  walls.** Six faults from playing it, and the two structural ones are worth
  keeping.
  - **You can buy more than one of anything.** Ellis: *"should be able to buy
    multiple of furtniture and stuff too and it track accurately how many of
    each i have."* The first purchase still reveals the piece the layout
    authored — that is what makes a furnished café look composed rather than
    assembled — and every one after it is an **instance**, the mechanism the
    cat bed introduced in August and which was always meant to generalise. A
    copy is the item's hero mesh (`ShopItem.copy`, defaulting to `preview`), so
    a *group* entry duplicates as its one recognisable piece rather than
    needing new layout rows. Copies get a rising price and **half appeal**:
    two plants are lovelier than one, ten are not ten times lovelier, and
    without the taper the cheapest item in the shop is an appeal machine.
  - **Wall pieces hang on the wall you choose.** *"need an empty wall for a
    blackboard thing and should be able to choose which wall it goes on with
    red and green thing like usual."* The menu board and the shelves carry
    `wall: true` and a height, and the placer gives them their own rule: near a
    wall, inside its span, clear of other wall pieces — no floor support, no
    walkway check, because neither means anything six feet up. **It snaps to
    the nearest wall and turns to face the room rather than refusing a
    near-miss**, which is the difference between choosing a wall and hitting a
    line; out of reach of any wall it stays under your finger and reads red.
    The rotate button is hidden for them, since a turn could only ever put a
    board face-first into the plaster.
  - **"0 of 1 in your café" is gone.** It counted ticked boxes, which was
    confusing beside the cat-bed page (not one of the department's items) and
    plain wrong once anything could be owned twice. Departments count *pieces*
    now, and an item page says how many of it you have.
  - **Rotation was being thrown away on every second move.** `commit` returned
    the turns made *this* time, but a layout piece stores its rotation as a
    delta and an instance stores it absolutely — so picking a turned chair up
    and putting it down reset it. It commits the stored angle plus the new
    turns, and a wall piece commits the absolute facing its wall gave it.
  - **Windows can be taken out again**, from the same marker, with a **full
    refund** — a change of mind about decoration is not something to charge
    for (§5), and there is nothing to exploit since you cannot end up ahead.
  - **The daylight follows the windows.** The bright panel behind the glass and
    the volumetric shafts were authored against the back wall's coordinates, so
    a window bought on the left wall was a hole with the backdrop behind it
    while the original blazed. Both are derived from `windows` now, exactly as
    the wall meshes already are. One material per shaft: the shader marches the
    view ray in object space, so a shared material points every beam at the
    last window built.
  - **Cupcakes no longer float.** Four of them belong to "milkshakes & cakes"
    but *rest on* the cake display, which is a separate purchase. `Placement.needs`
    names a second item a piece is standing on.
- *2026-08-25* — **Rotation was never the bug, and the move bar was lying.**
  - **Cancel now undoes the purchase.** Ellis: *"cancel button when buying and
    placing an item doesnt even work it just buys it anyway."* Right — the
    money had already moved and the piece stayed in the room, so cancel did
    nothing visible. It refunds, removes the piece, **and takes the XP back**;
    without that last part buy-then-cancel is a free XP tap you can hold down
    forever. Verified: £900 → £840 → £900, xp 0 → 16 → 0.
  - **All backdrops cost the same.** They were tiered by taste, which quietly
    said one was better than another. They are eight moods, not a ladder.
  - **Rotation: root cause found.** Two faults, neither of them rotation:
    1. **The move bar was created *after* the first validity check**, so that
       first answer went nowhere and the bar always opened saying "drag it onto
       a block" whatever the truth was. The first rotate was simply the first
       result the bar ever received — and it had been wrong since it opened.
       This is why swapping x and z "didn't help" and why a perfectly square
       stool was refused.
    2. **Obstacle footprints ignored each piece's rotation.** The mover used
       every object's *unrotated* local box, so the stools, the armchair and
       the counter — all authored at an angle — had wrong boxes and pieces
       collided with things they do not touch. `rotatedSize` projects the
       half-extents properly and degrades to an exact swap at 90°.
    The rotate button is back on.
  - **Windows are a thing you buy, per wall.** Ellis: *"if there is nothing on
    wall we should be able to UPGRADE it to a window."* Builder mode's **walls**
    tool now puts a marker on every bare wall segment; £420 glazes it.
    The pack ships a `Window_` twin of **every** wall piece in all three styles,
    both handednesses, so this is a name swap rather than new art.
    Three decisions worth keeping:
    - **Walls are now always generated**, from one square upward, and the
      layout's two hard-coded wall rows are always skipped. They used to be
      authored until the café grew, at which point the generated runs took
      over — fine while a wall was just a wall, wrong the moment one could be
      glazed, because a window belongs to a *segment* and the authored pieces
      have no segment identity. A test pins that an unexpanded café comes out
      as exactly `Wall_A_Light_Corner_End_X` + `Wall_A_Window_Dark_Corner_End_XL`
      at the origin, because that test is now the only thing between the player
      and a café whose walls quietly changed shape overnight.
    - **A segment is named by tile + side, never by piece.** A corner piece
      becomes a mid piece when the café builds past it; if the id encoded the
      piece, a bought window would jump to another wall on the next expansion.
    - **The café's own window is a row in `windows`**, seeded by save v18, not
      a special case in the layout. One way for a window to exist.
  - **The seats could not be put back, and it was three separate rules.**
    With the bar finally telling the truth, every seat in the café refused its
    own authored position. All three were the runtime validator disagreeing
    with `cafe-room.test.ts` about the same room:
    1. **Seats counted as obstacles when checking a guest could reach a seat.**
       `DOOR_LOBBY` sits *inside* the floor cushion by the door, so every chair
       was unreachable. The layout test has always skipped chairs, sofas,
       cushions and tables here; the runtime check now skips seats too —
       deliberately *narrower* than the layout test, which also skips the
       kitchen counter, because "a stool behind the counter is legal to stand
       and impossible to use" is a rule this validator exists to keep.
    2. **Collision was axis-aligned, and half the café stands at an angle.**
       The box round a long piece turned 45° is enormous, and the counter's
       swallowed the stool tucked against it. Collision is a separating-axis
       test on the real rectangles now (`Turned` in `systems/placement.ts`) —
       exact, four dot products, and it collapses to the old box test when both
       angles are zero, which is why every existing caller kept its behaviour.
    3. **The slack was 0.04 against the layout test's 0.3.** That test allows a
       quarter-unit of overlap because round pieces nestle — a side table tucks
       into the curve of an armchair's arm. Two validators disagreeing about
       the same café is worse than either being slightly loose, so `NESTLE` is
       one number quoting the other.
    Plus the floor rule: the blue cushion by the door **hangs 0.12 over the lip
    of the slab**, because the reference render takes that overhang. "All four
    corners on the floor" refused the layout its own furniture; the test
    corners are drawn in an eighth, which asks the question the rule is for —
    *is most of this on the ground* — rather than *is every millimetre*.
    Four tests pin all of it, and `mover.debugRules()` is on `window.__mallow`
    now, because a wrong box is invisible until a player cannot put a chair
    back.
  - **Architecture footprints were centred, and they are offset.**
    `Flooring_A_Entrance` spans x −1…0.87 in its own frame, so centring it put
    the entrance step a third of a unit out of place and the rug — which
    straddles the step and the slab — was refused at its own authored spot.
    Surfaces are read off the mesh's world box now.
- *2026-08-24* — **Builder mode.** §8 step 6 is finished: `ui/builder.ts`, one
  bar in the café with three tools — **extend**, **floor**, **walls**.
  - **The walls and floor moved out of the shop's Colours page and into the
    room**, and the reasoning generalises. They were previewed there as a
    single spinning wall segment on a turntable, which is the right treatment
    for a sofa and the wrong one for a *building*: a wall style changes the
    whole room at once, the window included, and the only useful preview of
    that is the room. It is the same argument that put colours in the shop —
    choose by looking at the thing — taken one level further. They stay listed
    on the Colours page as well, using the same tiles and the same "own it
    once, re-apply free" rule, so the two routes read as one feature.
  - **One tool at a time, and the ghosts belong to `extend` only.** Translucent
    squares floating over a floor you are about to recolour are noise.
  - **The "+" markers float above their square rather than sitting on it.** The
    buyable squares are on the *near* sides of the café, which is exactly where
    the bar is. The obvious fix — lift the camera when the mode opens — does
    **not** work: `clampTarget` holds the view inside the framing box, so the
    bias is discarded. Worth knowing before anyone tries it again.
  - The shop's card is "builder" with a trowel now, and it stays enabled when
    the floor is maxed, because there are still two tools behind it.
- *2026-08-23* — **The camera goes to the piece you are placing, and hold-to-edit
  is back.**
  - **Placement now moves the camera to the ghost** and zooms to 55% of the
    fitted distance, biased up the screen so the move bar is not sitting on it.
    A translucent ghost is deliberately quiet, and on a café three squares wide
    that made "where did the thing I just bought go" a puzzle. `focusOn` takes
    a zoom fraction now.
  - **Press-and-hold is back**, and both decisions were right in their turn: it
    was removed on 2026-08-10 so the shop could become the one clear place to
    buy and arrange things, and it returns now *because* the shop exists — a
    shortcut to the piece under your finger is a convenience rather than a
    competing interface. It charges **only on furniture and décor**: the ring
    appearing is the affordance, so it must not appear over the floor, a wall,
    a cat or a guest. The tab offers colourways and "move it".
  - The two full-width cards at the foot of the shop were flush against each
    other — appended straight to the panel, so no grid gap between them.
  - **Rotation: built, and deliberately not switched on.** The mesh turns in
    quarter steps, the angle is stored per piece (`Placements.rot`,
    `Instance.rot`) and survives a reload. **The placement validator refuses
    every rotated position**, and the obvious culprit is *not* it: the first
    version swapped x and z for the odd quarters, and removing the swap
    entirely changes nothing — a stool with an exactly square 0.46 × 0.46
    footprint is still refused after a turn. So something else in the check
    reacts to the rotation and has not been found.
    The button is hidden rather than shipped broken; turning your sofa and
    then being told you cannot put it down is worse than no button. **Do not
    re-enable it by re-adding the swap** — test a square piece first, or it
    will quietly go back to refusing everything.
- *2026-08-22* — **Cats live in cat beds, and the shop learned to sell the same
  thing twice.**
  Ellis: *"the number of cats should be dependent on number of cat beds placed
  down… when adopted u should select out of any spare free cat beds and then it
  lives there and spawns there."* Built (`data/beds.ts`, save v17).
  - **This is the best structural idea the game has had in a while**, and worth
    recording as design rather than as a feature. Three things had been
    floating free of one another: a flat cap of five cats, a shop full of
    furniture whose only consequence was appeal, and floor space with nothing
    to spend it on. Beds chain all three — *floor lets you place beds, beds let
    you take in cats* — so every purchase now points at what the game is about.
    It also retires the floor-scatter cat spots from 2026-08-18, which only
    existed because cats had nowhere defined to be.
  - **Furniture instances are new, and they are the real work.** The shop's
    model was "a purchase reveals one authored placement", which can say "you
    own the climber" but not "you own three cat beds". An `Instance` carries
    its own position, so there can be any number and each moves independently.
    `movePiece` handles both kinds so nothing above it has to know which it is
    holding. **This is the mechanism to reuse the next time anything needs to
    be bought more than once.**
  - **Capacity is a thing you can see.** "The café is full" now means "no spare
    bed", the adopt button says how many are free, and the refusal points at
    the shop instead of quoting a number at you.
  - Three bugs found by driving it, all the same shape — *state that only
    refreshed on someone else's trigger*:
    - Cat spots were recomputed only when the **room** was rebuilt, which
      adopting doesn't do, so a new cat had nowhere to sit until something
      unrelated happened.
    - `catHomes` **filtered out** a cat with no bed, and `CatManager` assigns
      by index — so one homeless cat shifted every cat after it into somebody
      else's bed. It pads now: stacking two cats visibly is a much better
      failure than silently rearranging the café.
    - The starter cat had no `bedId`, so it drifted into whichever bed was
      spare rather than the one it came with.
  - Save v17 **gives every existing cat a bed, free**. A café with five cats
    and one authored bed would otherwise wake up with four cats nowhere, and
    "never lose a player's cats. Sacred." covers *showing* them too.
- *2026-08-21* — **Squares went back to the pack's own module, and four bits of
  missing feedback.**
  - **Expansion squares are 4 units again** — Ellis picked option (a). They now
    match the café's floor exactly (same planks, same raised border) and carry
    proper wall runs from the kit. The cost is granularity: each square is a
    whole module, capped at three. Making them small again is **new art, not
    new code** — see the note on `PATCH`.
    Restoring the walls exposed a good bug: `HOME_TILE` is the key `"room"` but
    the room *occupies* square (0,0), so comparing keys instead of asking
    `isRoomPatch` drew a second floor slab on top of the authored one and lost
    the window.
  - **The appeal animation was firing perfectly and was invisible.** Appeal
    almost always rises *because you just bought something*, which means a
    panel is open and dimmed over the top of the HUD. The stat column lifts
    above the panel layer while it plays. A celebration behind a modal is not a
    celebration — the same lesson as the level-up card two days ago, in a
    different place.
  - **Inventing a blend said nothing at all.** It now confirms with a card
    naming the drink and what is in it, then drops you on the menu where it
    appears. And the button explains itself when it refuses (no name yet, menu
    full) instead of being inert — §9's "never fail silently on a tap".
  - **The settings colour row was mangled**, one word per line with the
    swatches on top of the text: `.setting-row-stacked` had the *same*
    specificity as `.setting-row` and lost on source order, so the row stayed
    `display: flex`. Written as `.setting-row.setting-row-stacked` now.
  - **Backdrops cost coins** after the setup pick — free the first time, since
    that one is part of making the café yours; a change of mind is a purchase,
    like the colourways. Save v16 grants whichever one is already in use.
- *2026-08-20* — **Expansion fixes, and the pack constraint that decides the
  rest of it.**
  - **The patios sat *below* the floor.** A uniform `scale` on the slab shrank
    its thickness from 0.26 to 0.13 as well as its footprint, so every patio
    was a sunken deck. `Placement.scaleXZ` scales the footprint only.
  - **The price outgrew the till.** The curve had no ceiling and crossed
    £9,999 around the twelfth square — an item priced above the most money the
    game will ever hold is not expensive, it is broken. There is a real
    `MAX_PATCHES` now (8), and the curve is clamped so the dearest square lands
    near 1,750.
  - **Expansion mode had no exit.** It changes what taps do and what is on
    screen, and the only way out was to open another panel and hope. There is a
    bar with a "done" button, in the same place as the placement bar, because
    they are the same kind of thing.
  - **A bought piece could land somewhere invisible.** It started at the
    camera's focus point, which is frequently inside the counter or behind a
    wall. `nearestValidSpot` spirals outward from there and drops it at the
    closest spot it actually fits.

  > ### ⚠️ The pack has exactly one floor slab per style, and it is 4×4
  >
  > This is the constraint behind three outstanding complaints — patios whose
  > planks and border don't match the café floor, and the missing walls — and
  > it is not a matter of effort:
  >
  > - `Flooring_{A,B,C}_Tiling` is the **only** square floor piece. Its raised
  >   border is baked into the mesh and its UVs point into a shared atlas, so
  >   scaling it to 2×2 halves the plank width and the border with it. The
  >   boards **cannot** be re-tiled at a different size — that is what an atlas
  >   costs.
  > - The wall kit exists **only** in 4-unit handed modules (`Light` on −x,
  >   `Dark` on −z, corner/run/end variants). There is no half-module wall, so
  >   a 2-unit patio can never carry one.
  >
  > So patios can be small *or* they can match the café and have walls — not
  > both, unless new floor art is made. **This needs Ellis's call**, and the
  > options are: (a) go back to 4-unit squares, which fixes planks, border and
  > walls at once but makes each purchase double the café; (b) keep 2-unit
  > squares as open decking and accept finer boards; (c) commission a 2-unit
  > floor tile and a half-module wall.
  >
  > The **builder mode** he wants — swipe through wall and floor styles with
  > icons — is worth building *after* that call, because which pieces exist to
  > swipe through is exactly what the call decides.
- *2026-08-19* — **Cats on the pavement, a reward hidden behind a menu, and
  the rule that spending should be felt.**
  - **Two cats were outside the café, one behind a wall.** The floor-spot grid
    was written with ±1.4 offsets from a square's centre — correct when a
    square was 4 units wide, nonsense the day patches became 2 and the offsets
    reached past the edge. It sweeps the floor's **actual bounds** and tests
    each point for being on a surface now, which cannot go stale the next time
    the grid size changes.
  - **The level-up card was appearing *behind* the shop.** The modal and panel
    layers are siblings and DOM order decided it; panels are appended second.
    A reward that can be hidden behind whatever screen you happened to be on is
    not a reward, so the modal layer has its own z-index.
  - **Everything that costs money now raises appeal** — coffees, add-ins,
    blends, floor and colourways, not just furniture. Worth holding as a *rule*
    rather than a list, because it decides how future content gets priced: a
    purchase that only moves a hidden multiplier is one the player cannot feel,
    which is precisely why "cosy touches" was retired.
  - **And appeal going up is now visible.** The chip pops and floats a "+0.4",
    then the takings chip does the same **a beat later** — the delay is the
    whole trick, because it makes the two read as cause and effect rather than
    two numbers twitching at once.
  - **Settings: sound and music mute separately**, on their own gain node, for
    the composed loop that is coming. **And a backdrop colour** — eight muted
    options, picked in settings *and* during setup. It is the largest area of
    colour on screen and the only part that is not the asset pack, so it is the
    cheapest way to make two players' cafés look like different places.
    The setup step comes **last** deliberately: the café is already visible
    behind the card, so tapping a swatch repaints the world you are choosing
    for. One trap: the picker writes to the *draft* as well as the store —
    `finish()` overwrites the profile, so a live-only change was reverted a
    moment after being made.
- *2026-08-18* — **Native resolution finally fits, cats stopped vanishing, and
  expansion became patios.**
  - **The post chain is one target and one pass now** (`scene/post.ts`), which
    is what let the café render at the screen's own resolution at last. An
    `EffectComposer` keeps a **pair** of targets so it can ping-pong between
    passes; with GTAO's buffers on top, native ratio came to ~241 MB and iOS
    killed the app. Hand-written it is ~72 MB — **less than the ratio-2 build
    that was already running fine** — so "sharp" is now the default. The pass
    does exactly what the composer's tail did: exposure + ACES, sRGB, grade.
    **GTAO was the price.** It added contact shadow and §9 rightly valued it,
    but it was the most expensive thing in the frame and softness that costs
    native resolution is a bad trade when the complaint on record, five times
    over, is blur. If it is wanted back, it has to come with the memory budget
    in hand.
  - **Adopted cats were not appearing**, and it was as bad as it sounds: five
    authored cat spots, two of them shop items, so a bare café could sell you
    five cats and show three. There are floor spots now, **scored by clearance
    rather than filtered by rules** — the first attempt hard-filtered against
    seats, props and the walking route and left *fewer* cats placed than
    before, because every candidate failed something and there was no fallback
    beneath the rules. Ranking always returns something, and returns the
    roomiest spots first.
  - **Expansion squares are half the size and carry no walls.** *"i was hoping
    smaller squares. we already have the little notch in the floor poking
    out."* Following the notch answers the wall question too: that notch is the
    entrance step — open floor, no walls, poking out past the room. A patch is
    the same thing, **a patio rather than a room**, which is what lets it be
    2 units when the wall kit is authored in handed 4-unit pieces that cannot
    be halved. The notch itself retires once a patio covers it, since two slabs
    on the same ground z-fight.
  - **The menu is one page**: every coffee and blend, what each is made of, and
    cups sold, ranked. **The profile corner opens** onto keepsake stats — cups
    poured, cats taken in, blends invented. Deliberately not KPIs: nothing
    there is a target and nothing compares you to last week (pillar 1).
  - **`npm run ios:test` is now what gets synced**, because Ellis only presses
    Play in Xcode and never runs npm. Whatever is in `ios/App/App/public` is
    what the phone gets, so the *build we sync* has to be the one with the
    testing switch in it.
- *2026-08-17* — **Rendering at native ratio killed the app. Resolution is a
  budget now, and the player owns it.**
  Ellis on an iPhone build: *"its not even working just a black screen and its
  saying SIGKILL."* Not a code fault — the production build boots clean in a
  browser. It is memory, and it is arithmetic anyone can do:
  ```
  composer bytes ≈ pixels × 8 (half-float RGBA) × (samples + 1) × 2 targets
  ```
  `EffectComposer` holds a **pair** of targets for ping-pong, so at ratio 3 on
  a 393×852 phone that is **241 MB** with 4× MSAA — before GTAO's own
  full-resolution buffers — inside a WKWebView that gets jetsammed well below
  that. The build that ran fine was ratio 2 at ~107 MB.
  Three changes:
  - **The knob is a pixel budget, not a ratio cap.** A budget bounds memory on
    every screen size; a cap only bounds it on the screen you tested. The ratio
    is solved from it: `min(devicePixelRatio, sqrt(budget / cssPixels))`.
  - **MSAA 4 → 2.** Each sample is another full-resolution half-float copy *per
    target*. Two still resolves a diagonal exactly.
  - **It is a player setting** (`data/graphics.ts`, in the profile): smooth /
    balanced / sharp, at 1.1 / 1.6 / 2.3 Mpx → about 53 / 77 / 110 MB on that
    phone. Applied live. It is a setting rather than a constant because the
    ceiling is a property of the device and **we cannot measure it from here**
    — the only honest answer is to let the phone's owner find it, so the
    "sharp" hint says outright what happens if they overshoot.
  **The general lesson, since this has now cost four rounds:** every fix for
  "it looks blurry" traded against a budget nobody had written down. Sharpness
  on this project is bounded by memory, not by taste, and the bound belongs in
  a comment with its arithmetic — which is now at the top of `data/graphics.ts`.
  Also: **`npm run ios:test`** builds with `VITE_TEST_TOOLS=1`, which adds a
  "full till" switch to settings. Compiled out of a normal build, because the
  device is the only place performance can be judged and everything expensive
  now sits behind hours of play.
- *2026-08-16* — **The café can grow. §8 step 6 is built.**
  - **Buy floor by tapping the floor.** The shop's "extend the café" card
    closes the shop and lights up every buyable square as a pulsing ghost with
    a **+ price** on it; tap one and it builds. The plus is DOM projected onto
    the tile (§10's floater trick), not 3D — crisp at any ratio, no draw calls,
    a real tap target, and it doesn't fight the placement picker for raycasts.
  - **Growth is restricted to non-negative tiles, and that is the load-bearing
    decision.** The room is a cutaway with walls on −x and −z; every authored
    prop hangs off those two walls (blackboard, shelves, the window seat on its
    sill) and the door is on +z. Grow *away* from the walls and nothing has to
    move — the runs simply get longer and the window stays on the tile it was
    drawn for. Grow the other way and all of it breaks at once.
  - **The wall kit is a lookup, not a loop** (`scene/cafe-tiles.ts`). Each edge
    ships as `Corner_*`, `Mid`, and `Mid_End_X`/`_XL`, twice over as `Light`
    (−x) and `Dark` (−z). A segment is chosen by two questions: is it the
    corner, is it the last one. `expansion.test.ts` names the exact pieces,
    because getting it wrong produces a café that is inside-out — a failure you
    can only see by looking at it.
  - **The trap that cost the most: `slot` means "look this up from the
    colourway".** The generated walls were tagged `slot: "wallPlain"` so they'd
    follow the wall style, and `assetFor` duly replaced every carefully chosen
    run piece with the *single-tile corner piece*. They carry no slot now; the
    style is baked into the name instead.
  - **§9's framing rule survives, by becoming what it always was.** `FRAME_BOX`
    is no longer a constant: it grows with the floor and the camera re-solves
    its distance. The rule was never "the camera sits here", it was "this box
    stays on screen". `MAX_TILE_INDEX` is a *framing* limit — check a 393×852
    screenshot before raising it.
  - **Buying no longer places for you.** *"when i buy something i dont want it
    to place it for me."* The ghost now starts at the centre of what you are
    looking at rather than at the layout's authored spot — arriving pre-placed
    made the purchase feel finished, and the drag afterwards felt like undoing
    something rather than deciding it.
  - **`?sandbox` keeps the till full** and hands out levels, so the expensive
    end of the game can be judged in a five-minute sitting. Dev only. Writing
    it exposed a good bug: a separate `set({money})` earlier in the same tick
    did *nothing*, because the tick's final `set` writes money derived from the
    `state` captured at the top and overwrote it a line later.
  - **Money stopped abbreviating.** `formatMoney` still compacted to `$1.2K`,
    `$15.4M`, `$3.07B` — written for the idle game Mallow was before the
    direction change. On a £9,999 till it rendered `$10.00K`, which is the
    abbreviation outliving the economy that justified it. §0 says no
    abbreviations; now there are none.
- *2026-08-15* — **The menu, and the last of the blur.**
  - **The fuzz was the canvas being upscaled, and it had been all along.** The
    pixel ratio was capped — 1.5, then 2, then 2.5 — and *any* cap below the
    device ratio means the browser stretches the canvas to fit the screen. On a
    DPR-3 phone a cap of 2 is a 1.5× resize of every pixel, and a resized image
    is fuzzy no matter how well it was antialiased. Anisotropy, MSAA and SMAA
    all address **edges**; none of them can undo a resize. It renders at native
    ratio now, paid for by **deleting the bloom pass** — which was a dozen
    passes over a mip chain doing precisely the thing being complained about.
    GTAO samples 12 → 8. Next lever if it is still hot is GTAO itself; ask
    first, because nobody has complained about the room looking flat.
    `window.__fx` (dev only) toggles passes at runtime, so "is it the bloom or
    the AO?" is now answerable in one screenshot instead of three sessions.
  - **The menu** — `data/drinks.ts`, `systems/menu.ts`, save v14. Classic
    coffees, a cabinet of add-ins gated on coins *and* level, and blends you
    invent, name and put on sale, plus a one-screen "what's selling".
    Two design decisions carry it:
    - **The café's pay multiplier is the menu's *average* cup, not its total.**
      This is what stops it being a checklist: adding a latte lifts the café,
      adding your ninth plain filter coffee drags it down. The question becomes
      "what does this café serve?" rather than "have you bought everything?".
      `menu.test.ts` pins it.
    - **Inventing a blend is free.** You have already paid for the ingredients;
      charging for the creative act would be the one genuinely mean thing in
      the game (§5). It is also the first content in Mallow the player
      *authors* rather than selects — the same hook as naming a cat, which is
      why blends keep the player's capitals and get their own colour on the
      sales chart.
  - **Suggested names are lowercase now** — cat names and café names both.
    §9's exception is for what the *player* types; a capitalised default is the
    game speaking, and it was speaking in the wrong register.
  - `.shop-dept*` became `.hub-card*`: the shop's front page and the café's are
    both hubs, and there was no reason for them to look like different products.
- *2026-08-14* — **I broke the interface with a tidy-up, and the way it broke
  is the lesson.**
  - **Half the text vanished and the adopt button died.** Deleting the dead
    press-and-hold CSS took the *last selector* off the shared
    `text-transform: lowercase` list, leaving it comma-terminated. That is not
    a syntax error — CSS simply annexes the next rule, so every selector in the
    list inherited `.profile-corner`'s declarations: a slate background behind
    dark-on-honey labels (invisible text) and **`pointer-events: none` on
    `.reveal-confirm`** (a dead adopt button). Clean build, 150 passing tests,
    no console error. **Vite does not validate CSS and TypeScript never sees
    it.**
    Two guards now. `ui/styles.test.ts` asserts the shared lowercase rule
    declares *only* `text-transform` — the first attempt checked for dangling
    commas and did **not** catch it, because the broken file was valid; what
    changes is that a one-property rule suddenly has eleven. And `ui.test.ts`
    now drives the adopt flow through the buttons, which is what was actually
    broken while every store-level test passed.
  - **Sharper *and* cooler, which sounded contradictory and wasn't.** The
    `SMAAPass` came out and the composer got a **multisampled render target**
    instead. SMAA reconstructs edges after the fact — it is a blur that guesses,
    and on long clean diagonals its guesses were much of the softness. MSAA
    supersamples only the pixels geometry crosses, so edges resolve exactly,
    *and* it replaces a full-screen pass with a hardware resolve. Pixel ratio
    came back to 2.0, which is 36% fewer pixels through the whole chain than
    2.5. Next lever if it is still hot is GTAO — measure first; it is what
    stops every object reading as a sticker on the floor.
  - **The shop always opens at its front page.** The nav button says "shop", so
    it opens the shop, not the department you last wandered into.
  - **The café panel was rebuilt.** It had a three-cell stat strip that became
    a duplicate of the new HUD chips the moment those landed, a title wrapping
    around a floating level tag, dot leaders trailing into nothing, and a
    squeezed square price button. Two rules from it: **never show a number here
    that the HUD already shows** (a panel that repeats the screen behind it has
    no reason to be opened), and **a price is a full-width action, not a chip
    wedged beside text** — §9's menu leaders are for a *list* of priced rows,
    and with one upgrade they had nothing to lead to.
- *2026-08-13* — **The blur was a filtering bug, the cog was a CSS default, and
  the shop grid was lopsided.**
  - **"Blurry zoomed out, fine zoomed in" is the signature of missing
    anisotropy**, and reading it that way is the whole lesson. The atlas had
    mipmaps and `anisotropy = 1`, so a surface seen at a slant was sampled from
    a mip chosen for its worst axis — the floorboards, receding from a 45°
    camera, were drawn several mip levels too coarse. `magFilter` never touches
    mipmaps, which is exactly why the magnified case always looked fine. **Two
    sessions were spent raising the pixel ratio at this**, and resolution could
    never have fixed it: it is a sampling problem, not a resolution one. One
    line: `atlas.anisotropy = renderer.capabilities.getMaxAnisotropy()`.
  - **The settings cog rendered blue on iOS**, which is a general trap now
    written into `ui/icons.ts`: **a `<button>` does not inherit `color`.** The
    UA stylesheet sets `buttontext`, so an icon button that never declares a
    colour draws `currentColor` in the platform default — black in Chrome,
    system blue on iOS. Every other icon button in the sheet happened to set
    one; this was the first that didn't. It was also uncentred, because an
    inline SVG in a plain button sits on the text baseline.
    The cog itself is **generated, not hand-drawn** — the first attempt had its
    teeth off a common circle and sat off the 24×24 centre. The generator
    parameters are in the comment; regenerate rather than nudging points.
  - **The café's vital signs moved out of a panel and onto the left**: cats,
    contented hearts, appeal and takings per hour. Ellis asked for it, and the
    reason it was wrong before is sharper than "he asked" — appeal and rate are
    the numbers *the entire shop exists to move*, and they were the only ones
    you had to go looking for. Cats + hearts is a button (the roster); appeal +
    rate is not, because there is nowhere to go from it.
  - **The shop grid was four and three.** *"its not symetrical."* Seven cards
    in two columns is a mistake you can see from across the room. Three tiers
    now: **colours as a full-width banner** (Ellis: *"colours should be a
    seperate thing entirely"* — and it is the only department that changes what
    you already own rather than selling you something), then five furniture
    departments two-two-one with the last spanning the row, then arranging.
    Full-width cards put the icon *beside* the text, because a round badge
    marooned above one line in a wide box is most of what makes a stretched
    card look accidental.
  - Deleted the last of the press-and-hold CSS (the ring, the docked sheet) —
    2.4 kB of rules for a feature that no longer exists.
- *2026-08-12* — **Eight notes from playing it, and one of them reverses a
  decision this file argued for.**
  - **The whole café was too soft, and the previews proved it.** Ellis:
    *"everything looks too blurry (except the item previews now you fixed it
    which actually looks very good)."* That is as clean an A/B as this project
    will ever get — the previews are the same scene at full device ratio. The
    1.5 pixel-ratio cap was a **speculative** thermal fix (2026-08-06, never
    measured on hardware); the blur it bought has now been measured twice, on
    his phone. Base ratio is 2.5. **If it runs hot, this is the first number to
    come back down** — before GTAO, which is what makes the room read soft
    rather than flat, and before the 30fps cap.
  - **You could drop a table on the cat bed and the ghost stayed green.** Both
    the layout test and the placement validator inferred "walk over me" from
    *height under 0.3 units*, which is true of rugs and also of cat beds and
    floor cushions. It is `Placement.walkOver` now — explicit, one flag, on the
    rug only — with a test naming the three pieces the heuristic got wrong.
  - **Placement stole the camera.** Every drag moved the ghost, so buying
    anything froze the view. A drag now grabs the piece only if it *started* on
    it (with a generous world-space margin, because a floor cushion on a phone
    is a small target); everything else pans, as it does everywhere else in the
    game. Decided once per gesture, at pointer-down, so a drag never changes
    its mind halfway.
  - **Guests walked at about double speed.** `walkInDurationMs` was 1200 and
    had never been considered — the route is a polyline covered at a constant
    rate, so that number *is* the walking speed. Doubled. `npm run balance`
    still says playing beats idling 5.8×.
  - **The level-up was a chip; it is a card now.** *"i need a nice big obvious
    level up animation that occurs and says congrats with some pretty cats
    showing or something nice."* The first version reasoned that a cosy game
    should never interrupt — **that confused pressure with celebration.**
    Pillar 1 forbids timers and punishments, not applause, and a reward you can
    miss is not a reward. The card shows *your* cats, by name, because that is
    what this game is about.
  - **The shop's tab strip is gone.** *"why is the option to change all the
    colours of everything some little text button called colours thats hidden
    and requires swiping for ages."* Seven text pills in a scroller fitted about
    four and a half on a phone, so the newest department lived permanently off
    the right-hand edge — the interface hiding its own best feature. The front
    page is a grid of department cards with icons and a progress line each
    ("0 of 3 in your café", "5 of 21 colourways"), and a department opens into
    the existing pager behind a back button.
  - **The café's name was being cut off.** The profile pill was capped at a
    fraction of the width so the till could stay centred. Wrong trade: the name
    is something the player typed. The profile takes the leftover space now and
    the till, which is naturally narrow, sits to its right.
  - **The cat pill opens the roster**, and the mute button is a **settings
    cog** with sound inside it. A speaker in the corner was quietly telling
    every new player that audio is the thing this game most expects them to
    want to change.
- *2026-08-11* — **The shop became the only editor, and the game got a
  progress bar.** Four asks from Ellis; three landed, and the fourth —
  expansion — is specified but **not built** (see Next up).
  - **Buying a piece puts it straight into your hands.** *"if i buy an item id
    like it to open some sort of placer mode where the object is transparent
    and either red glow if it cant be placed or green if it can and it snaps
    across blocks."* Buy → the shop closes → the piece is a ghost on the floor,
    green where it fits and red where it doesn't, with the reason spelled out.
    The handoff **retries across frames on purpose**: buying changes the store,
    which rebuilds the room asynchronously, so the mesh does not exist at the
    moment the button is released.
  - **The grid is drawn now, and it is half a unit rather than a quarter.**
    *"everything should be blocks."* The snap has existed since the mover was
    written and read as drift, because nothing on screen said what it snapped
    *to*. Showing the blocks while placing is most of what turns a snap into a
    feeling of placement.
  - **Press-and-hold is gone.** *"i dont like the hold to edit thing any more
    id rather everything was in 1 unified super intuitive easy to use clear
    place - the shop."* The ring, the docked colourway sheet and the whole hold
    detector in `camera-controls.ts` are deleted. **The shop grew an "arrange"
    tab to replace it** — and that tab is not optional: the starter furniture
    (armchair, stools, cushions, cat bed, rug) was never bought, so it has no
    shop page, and without the tab killing the gesture would have made the
    café's original furniture permanently unmovable.
    Removing the hold detector exposed a **pre-existing bug**: a pinch that
    barely moves reported a *tap* on the second release, because by then only
    one pointer is left in the map and the slop test passes. Pinch-zoom over a
    cat was petting it. There is a `multiTouch` flag now, and a test.
  - **Levels and XP** (`data/progression.ts`, save v13). XP comes from
    furnishing and adopting; the level is **derived from lifetime XP, never
    stored**, so the curve can be retuned without demoting anyone. The corner
    shows the ring, the café's name and yours. **Levels deliberately gate
    nothing** — the reason the ring earns its place is that *nothing else in
    this game accumulates* (the till is capped and spent, cats cap at five), so
    it is the one number that is a record rather than a balance. Turning it
    into a gate would make it a chore. An existing save is credited for what it
    already owns rather than starting empty over a finished café.
  - **The previews were still pixelly, and MSAA could never have fixed it.**
    The previews composite into the main canvas, which runs at pixel ratio 1.5
    on a DPR-3 phone — so every preview pixel is a canvas pixel and no amount
    of supersampling inside the stage helps. The canvas itself now goes up to
    full device ratio while a preview panel is open, **paid for by dropping
    GTAO for the duration** (the frame's most expensive pass, and invisible
    behind a panel that dims the café).
  Also: `Barista.pick` reported the *greeting* rather than the hit, so tapping
  them mid-gesture fell through; guests drank whatever they held (a cupcake got
  sipped from a mug) and now eat, drink or sip to match, pinned by a test that
  reads the GLB's clip list.
- *2026-08-10, later* — **"you sure anything even changed?" — he was on the
  old build, and it is worth writing down how to tell.** Ellis reported the
  head invisible under floating hair, a guest drinking a cupcake, the barista
  tap doing nothing, *and "cosy touches" still in the café panel*. That last
  one is the tell: the upgrade no longer exists in the source, so no live build
  can render it. **`dist/` is a snapshot and the iOS app carries its own copy**
  — `npm run ios:sync` (or a browser reload against `npm run dev`) is what
  moves work onto the device. Check for a symptom that is *impossible* in the
  new code before debugging a report.
  Verified in the current build, against the running dev server: barista head
  solid at full zoom; **all twelve hairstyles solid**, front and back; tapping
  the barista goes `Wait_Shifting` → `Tray_Serve_Short` → `Wait_Shifting`
  through a real canvas tap; the tap target is **29 × 51 CSS px** at default
  zoom, which is a fair size, so a miss on device is a stale build rather than
  a fiddly target.
  Two things were genuinely broken and are now fixed:
  - **Guests drank whatever they were holding.** The held prop is random but
    the settled idle was always `*_Cup_Drink_Loop`, so a cupcake got sipped.
    Idles are chosen by prop now (cup / glass / food × three seat kinds).
    Note `TallChair_Glass_Drink _Loop` has **a stray space in the pack itself**
    — `character-clips.test.ts` reads the GLB's JSON chunk and asserts every
    clip the library names really exists, because a missing name fails
    *silently*: `play()` returns early and the guest freezes mid-sit.
  - **`Barista.pick` returned the greeting, not the hit**, so a tap landing on
    them mid-gesture reported "not me" and fell through. It reports the hit.
  New: **`/characters.html` now renders every hairstyle, front and back** —
  the contact sheet §0 asked for twice. A head you can see through, or hair
  with nothing under it, shows up there in one screenshot.
- *2026-08-10* — **The shop swallowed the Style menu, the décor upgrade died,
  the barista says hello, and the previews finally have edges.** Four notes
  from Ellis, and three of them were about the same underlying thing: the game
  had two places to buy the café's appearance and neither was the good one.
  - **Colourways are the shop's last tab now.** *"the style thing where you can
    pick colours should rly be part of the shop menu."* Right — the Style menu
    was a top-level button selling the same fantasy as the shop through a wall
    of swatches, while the shop sold furniture by *showing* it turning on a lit
    stage. The colours tab pages through the five customisable pieces the same
    way, and **pressing a swatch previews it before you pay** — including a
    locked one, because §9 already argues that the colour you're saving for is
    the reason to save for it. Nav is three buttons again: cats, café, shop.
  - **"Cosy touches" is gone, and appeal moved onto the furniture.** *"the
    little touches cafe upgrade seems to be stupid and takes away from the cafe
    builder aspect we provide from the shop option."* Exactly the diagnosis:
    buying appeal from a menu and buying furniture that grants appeal are the
    same purchase, and only one of them puts anything in the room. Every
    `ShopItem` now carries an `appeal` value (a full café ≈ +4.3, near what the
    upgrade paid at max), the shop shows it on the item, and **`brews` is the
    last levelled upgrade standing**. Save v12 **refunds** the retired levels
    rather than dropping them — `sanitizeUpgrades` would have swallowed them
    silently, but the player paid for appeal they're about to stop having and
    the replacement is on sale twenty feet away.
  - **Tap the barista and they do something.** There is **no wave in the pack**
    — 43 clips, all café work — so it's `Tray_Serve_Short` / `Tray_Pickup` /
    `Wait_Choosy`, cycled so two taps never repeat. Verified end to end through
    a real canvas tap: `Wait_Shifting` → `Tray_Serve_Short` → `Wait_Shifting`.
  - **You could see through people's hair into their heads**, and the file was
    lying. Every textured character material is exported `alphaMode: BLEND`,
    including hair and skin, whose PNGs are opaque in all 22 variants — Blender
    writes BLEND whenever alpha is wired up at all. `GLTFLoader` reads that as
    "transparent, and don't write depth", so hair and head were sorted against
    each other and the head won from some angles. Hair is marked opaque; skin
    and eyes are deliberately left alone (the eye sheet has real alpha and its
    shell dips *inside* the face, so depth-writing skin would clip it).
  - **The previews had no antialiasing at all** — *"in shop item selector
    preview and also character preview all the sprites look pretty rough around
    the edges."* They were drawing straight into the default framebuffer, which
    has no MSAA (`antialias: false` is correct — §9), *after* the composer's
    SMAA pass had already run. So the café was smoothed and the two things you
    look at closest were not. New `scene/preview-stage.ts` gives them a 4×MSAA
    render target at 1.5× supersample and composites it.
  **Three traps in that last one, all of which cost time:**
  - **Three skips tone mapping entirely when rendering into a render target**
    (`WebGLRenderer`: `_currentRenderTarget === null ? toneMapping : None`) —
    that is how a composer applies it once at the end. So the first version
    lost exposure 0.40 and every preview came out ~2.5× too bright. The target
    is half-float and linear now, and the composite shader does exposure +
    ACES + sRGB + **the room's grade**, which is exported from `scene.ts` as
    `GRADE_GLSL` for exactly this.
  - **Do not `#include <tonemapping_pars_fragment>` in a `ShaderMaterial`** —
    three appends it (and `colorspace_pars_fragment`) to every one already, and
    you get a wall of "function already has a body".
  - **A render target holds premultiplied alpha.** Compositing it back with
    ordinary `NormalBlending` multiplies by alpha twice; the curves have to
    un-premultiply first or the translucent backdrop grades differently from
    the opaque item standing on it.
  **And the preview lighting was rebuilt by measurement, not taste** (§9's
  "quantise it" rule again). The stage is where colour is chosen now, so a
  piece must appear in the colour it will be in the room: sampling the same
  sofa in both places got it from (108,85,36) on the stage vs (153,124,55) in
  the café to (150,124,48). **The intensities look absurd next to
  `addLighting`'s** — env 4.4, ambient 2.9 — and that is the honest number: the
  room's chair also gets the window spot and bloom, which a bare turntable
  doesn't. Re-measure the same way if you touch them.
  Two smaller things found on the way: `ShopPreview.setItem` was **not
  idempotent** and the panel calls it every frame, so the shown piece was being
  cloned out of the asset library ~30×/second for as long as the shop was open;
  and `tools/shot.mjs` gained **`--js` and `--errors full`**, without which
  none of the above could have been seen at all (a panel is behind a tap, and a
  shader error's first line is always useless).
- *2026-08-08* — **The petting hearts were a text character.** Ellis: *"the
  hearts that pop up when i tap a cat looks kinda cheap and doesnt look as nice
  as the rest of the visuals."* They were literally `el.textContent = "♥"` —
  **§9's "never emoji" rule applies to dingbat glyphs too**, and for the same
  reasons: it is the *font's* art, it renders differently on every platform,
  and next to a hand-drawn icon set and a soft low-poly café it was the
  cheapest-looking thing on screen. The coins had already been given a drawn
  icon; the hearts were simply missed.
  Now `icon("heart")`, blush, translucent, with a soft bloom rather than a hard
  text-shadow, and **randomised size per heart** so a burst reads as several
  hearts rather than one stamped three times.
  They also got **their own motion**, and the distinction is worth keeping: the
  coin's arc is a *payment* — it shoots out of the seat and reports a number,
  so it stays tight and legible. A heart is affection, so it drifts higher,
  sways wider, runs 1500ms instead of 1150, and is deliberately a little
  translucent. Four per tap now, on an uneven stagger — three on a metronome
  looked mechanical.
- *2026-08-08* — **Cats stopped sitting on furniture that isn't there.** Ellis:
  *"the cats when i adopt are hovering on furniture thats not even placed or
  exists yet haha."* Exactly right, and it was a consequence of the shop:
  `CAT_SPOTS` is derived from the whole layout, but since most cat furniture is
  now bought rather than given, a new café was seating cats on a climber
  (y=1.02) and a low table (y=0.38) that weren't in the room. `catDisplayPositions`
  now filters by what's actually owned, and the roster quotes **live** capacity
  rather than the all-in total, so it can't promise seats the café hasn't got.
  Verified on a bare café: five cats adopted, **three rendered** — the cat bed
  and the two bare-floor spots, which carry no asset and therefore can never be
  gated away. That last part is what guarantees a brand-new café can always
  seat its first cat.

  **Two things deliberately NOT built, both on Ellis's instruction:**
  - **Cat movement and animation — wait for the asset pack.** He's buying a cat
    pack with walking and jumping clips: *"i think hold off on making that
    ourselves for now."* So don't write locomotion, pathing or bespoke cat
    animation against the current procedural primitives — it would be thrown
    away. The cats being *placed* rather than *alive* is a known, accepted gap
    until that lands. **Still true as of 2026-08-25 — the cat pack has not
    been released.**
  - ~~**The story-mode tutorial friend.**~~ ✅ built 2026-08-25, once the Lip
    Sync pack made a talking character possible. See §8's tutorial note.
- *2026-08-07* — **You work here now, and you can turn things round.**
  - **The player's avatar stands behind the counter** (`entities/barista.ts`).
    The character you design is *in* your café rather than filed in the save,
    which is most of what makes it yours. Facing ~45° out at the open corner —
    facing them into the counter showed the camera the back of their head,
    which is precisely the mistake the guests made before `SEAT_FACINGS`.
  - **Swipe to swivel**, on the shop's furniture and on the avatar. The manual
    turn is an *offset added to* the idle spin rather than a replacement, so
    touching the thing never freezes it. On the shop stage this replaced
    swipe-to-page (same gesture, and turning is what a turntable invites); a
    flick with no real movement still pages, so the carousel keeps its most
    obvious control alongside the arrows and dots.
  - **"legs colour" is "pants colour"** — Ellis is right, and the label was
    doing the thing where an interface sounds like the data model.
  - **NOT FIXED: some hairstyles sit backwards on the head.** Reported, real,
    and not yet diagnosed. What is ruled out: every `Hair_*` node in the GLB
    has an identity rotation and shares one skin (checked), so nothing is baked
    backwards and it isn't the assembly dropping a transform. The next step is
    a contact sheet of all twelve rendered side by side — the culprits are
    probably specific asymmetric styles (`Hair_SideSweep`, `Hair_Pigtails`),
    and the cheap fix, if the cause turns out to be in the pack, is to drop
    those entries from `HAIR` rather than to fight the rig.
- *2026-08-07* — **Character creation, and an adoption you can decline.**
  - **The adopt flow had no way out.** Ellis: *"theres no way to undo or go
    back ur forced to adopt one."* The money moved on the first tap and the
    card that followed had only "welcome home" on it. The confirmation now
    comes **before** the draw — and that placement is deliberate, not merely
    convenient: backing out *after* seeing the rarity would be a free reroll,
    and this is a gacha (§5). You can always decline the spend; you can never
    fish for a legendary.
  - **The naming field no longer autofocuses.** It threw the keyboard up over
    the reveal — the one moment the game most wants you looking at the screen.
    Nothing in this game should open straight into a keyboard.
  - **Furniture in the *world* still can't be rotated** — only the previews
    swivel. Doing it properly needs a rotation stored per placement and a
    control in the move bar; it is a small save change (v12) and a real UI
    decision, not a tweak.
  - **Character creation** (`ui/onboarding.ts`, `data/player.ts`): your name,
    your look, your café's name, then play. The avatar is the *same modular
    character the guests are assembled from*, turning on a lit stage, so the
    whole feature cost no new art — `Appearance` is now explicit indices with
    `appearanceFromSeed` preserving the guests' behaviour exactly. Eight
    features to cycle plus "surprise me".
  - **Save v11 does not drag an existing café through onboarding** — it's
    already theirs; the profile is marked created with a name they can change.
  Two traps worth keeping: the preview **rebuilds meshes**, not materials, so
  re-applying an unchanged look must be a no-op or the caller's simple
  once-a-frame call clones a skinned rig 60 times a second. And the title is
  **not** CSS-lowercased, because the player's own name lives there (§9's rule
  about cat names, applied to the one other piece of text they wrote).
- *2026-08-07* — **The shop shows the furniture, not a list of it.** Ellis:
  *"big floating item of furniture spinning and hovering with price tag and u
  can scroll thru… dont want some boring wall of text."* Right — a game about
  building a café cannot sell furniture through a price list. It's a pager
  now: category tabs, one big piece at a time spinning and bobbing on a lit
  stage, dots, arrows, swipe, and the price as a tag on the buy button.
  **`scene/shop-preview.ts` shares the main renderer** rather than making a
  second one. A second `WebGLRenderer` is easier to reason about but WebGL
  resources are per-context — the café atlas would be uploaded to the GPU
  twice, on a phone, for a panel. Instead it draws into a scissored viewport
  on top of the finished frame, reusing the very geometry the room is built
  from. Three things that cost time, all worth knowing:
  - **`setViewport` takes CSS pixels and applies the pixel ratio itself.**
    Applying it as well put the item in a different place on any screen where
    the ratio isn't 1 — i.e. every phone. It rendered, just not where asked.
  - **The panel had to stop painting over the scene.** The item is drawn to
    the canvas *behind* the UI layer, so an opaque panel or the layer's usual
    backdrop blur hides it completely. The shop is two slate blocks with a
    genuine transparent gap between them, and no blur — which is also the
    nicer design, since the piece floats over the café it's going into.
  - **A translucent backdrop plane inside the stage.** Without it the café
    shows through at full brightness and the piece reads as clutter rather
    than as a display object.
- *2026-08-07* — **The shop, a bare café, and a button that finally answers.**
  - **The adopt button did nothing when you couldn't afford a cat.** No sound,
    no message, no movement — Ellis assumed a cat limit, which is exactly the
    wrong conclusion for the interface to invite. It now shakes and says what's
    missing ("$5 more to go" / "the café is full — five cats is plenty").
    **Never fail silently on a tap**: a rule with no explanation is
    indistinguishable from a bug.
  - **The shop** (`data/shop.ts`): five categories, eleven items. The design
    trick worth keeping is that **nothing in it is new geometry** — every entry
    names pieces already in `cafe-layout.ts` at their authored positions,
    hidden until bought via `Placement.shopItem`. So a fully-stocked café is
    *exactly* the reference render the room was rebuilt from: the diorama is
    now the destination rather than the starting point. Adding stock is a row
    in the catalogue plus a tag in the layout, with no placement work — which
    is the property §8 wanted, where new art becomes content by itself.
  - **The café starts bare**: shell, counter, till, two stools, sofa, floor
    cushions, cat bed and rug. 21 meshes against 60 fully stocked.
  - **Save v10 grants an existing café the entire catalogue.** Anyone playing
    before the shop existed had that room before it had a price; stripping it
    back overnight is exactly the loss §8 forbids.
  A test lesson too: three unrelated style tests broke because the nav lookup
  was `.roster-button[2]` and the shop became a fourth button — it silently
  opened the wrong panel. Nav buttons are found by *label* now.
- *2026-08-07* — **Everything worth moving now moves**, including the seats.
  The two things blocking that, both cleared:
  - **Props ride their parent.** `Placement.attachTo` moves a prop by its
    parent's *delta*, not to its parent's position, so the cup keeps its offset
    on the tabletop. Verified: table moved (1.75,−1.65)→(0.25,−1.5) and its cup
    moved by exactly the same (−1.5,+0.15).
  - **Seat positions are live.** The *index order* is still frozen — the
    economy addresses seats by index and old saves must keep seating people in
    the same chair — but coordinates come from `seatPositions(placements)`, so
    guests walk to wherever a chair now is and coins pop out of it there.
    `VisitorManager.setSeats` mirrors `CatManager.setSpots`.
  A new rule fell out of it: **a moved seat must still be reachable.** Guests
  lerp straight to their chair with no pathfinding, so a stool dropped behind
  the counter is legal to stand and impossible to use — that is now its own
  refusal ("no way to reach that seat") rather than a guest walking through
  masonry.
- *2026-08-07* — **Furniture moves now.** Editor step 4. Hold a piece → "move
  it" → it goes translucent and follows your finger across the floor, snapped
  to a 0.25 grid, red where it can't go, with the reason said out loud ("guests
  need to get past"). Nothing commits until you confirm, so cancelling is free.
  Verified end to end in headless Chrome: dragged, validated live, committed,
  room rebuilt, and **written to the save**.
  **`systems/placement.ts` is the interesting part** — the rules the layout
  test has been applying to *authored* furniture for weeks, extracted as pure
  logic and now applied to *player* furniture at runtime, before the drop.
  Three things it got wrong first, all found by driving the real thing:
  - **The floor is not one square.** The first version took a `floorHalf` and
    refused the rug's own starting position, because the rug sits on the
    entrance step, which juts past the slab to z≈2.35. It takes a *list of
    surfaces* now, which is also how §8 step 6's expansion tiles will work.
  - **Flat pieces must skip collision entirely.** A rug is meant to go under
    the table and be walked over; checking it like a wardrobe made the editor
    a puzzle.
  - **A piece must not collide with itself**, or nudging anything one grid step
    fails. Obvious in hindsight; invisible until you try it.
  Also: three of the four movable pieces are *cat spots*, so `CatManager` gained
  `setSpots` — otherwise dragging the cat bed leaves the cat sitting in mid-air
  where the bed used to be. And the ghost material is **cloned per drag**: the
  whole café shares one atlas material, so tinting it in place turns every
  object in the room red.
- *2026-08-06* — **Four fixes from playing it, and one of them had been broken
  the whole time.** Ellis on the device build.
  - **"i want a tiny coin pop up float when visitors pay."** This was supposed
    to already exist. It did not: `mountUI` starts with `root.innerHTML = ""`
    and ran *one line after* `new FloaterLayer(uiRoot)`, so the floater layer
    was detached from the document on every boot and every coin — and every
    petting heart — was appended to an orphan. No error, no failing test,
    §10's "coins pop and arc when a visitor pays" simply never happened.
    Fixed at the root: `mountUI` now preserves any child marked `data-overlay`,
    so the bug is impossible rather than merely order-dependent. Coins now also
    carry a drawn coin (`ui/icons.ts`), which is what was actually asked for.
  - **"visitors walk through a designated door area."** `DOOR` was (3.2, 3.6) —
    the empty open corner — so guests appeared out of nothing beside the café.
    They now route **outside → the doormat → a lobby point → their seat**, as a
    constant-speed polyline, facing their direction of travel rather than
    staring at their chair while crabbing sideways. The middle waypoint is
    load-bearing: `cafe-room.test.ts` immediately caught that a straight line
    from the doormat to four of the five seats goes **through the counter
    peninsula**. There is no pathfinding, so the route has to be authored.
  - **"camera moving feels sluggish."** The easing was applied to *direct
    manipulation*, so the room lagged the finger by a whole time constant.
    Dragging and pinching are now 1:1; easing is kept for moves the game makes
    on your behalf (`focusOn`, `reset`, wheel), and is now expressed as a time
    constant so it behaves identically at the 30fps idle cap and the 60fps
    interactive one.
  - **"95% of it just goes to the wall floor one every time. and that changes
    the window too."** Both halves fixed. Picking now treats **architecture as
    a last resort**, so a prop always beats the room-sized surface it stands
    on. And the floor is **its own category** now (save v8) — the flooring is a
    separate mesh, so it can change without touching anything else. **The
    window genuinely cannot be split off**: each style ships one window shape
    baked into the wall piece itself, so walls and window move together by
    construction. Splitting the floor is what makes that acceptable.
  Also found on the way: `ECONOMY_CONFIG.baseSeatCount` was **6 against 5 real
  seats**, so a guest could be assigned a seat index with no position — they
  stood at the door fallback and their coin was skipped. Now 5, with a test.
- *2026-08-06* — **Hold a piece of café to recolour it.** Editor step 3. Hold
  any customisable piece for 450ms → a ring charges under your finger and the
  object squashes → a colourway sheet docks at the bottom. Buying from it
  debits the till and rebuilds the room, verified end to end in headless Chrome
  (£5000 → £4880, `owned` updated, `Carpet_Small_Red` → `Carpet_Small_Cream`).
  **Three things worth keeping:**
  - **The ring is the affordance**, so it only charges on pieces that actually
    have colourways (`pickFurniture(..., editableOnly)`). A ring that fills and
    then does nothing would teach the gesture and then punish it.
  - **The menu docks; it does not float beside the piece.** Anchoring it to the
    object was built first and was visibly wrong in the screenshot — on a phone
    the café *is* the middle of the screen, so the panel covered the very thing
    being recoloured. Docked at the bottom, plus `controls.focusOn()` easing the
    selected piece up clear of the sheet, which is the bit that makes it feel
    considered.
  - **Picking prefers the small thing on the big thing.** Hits are distance
    sorted and the first *editable* one wins, so a ray through the rug doesn't
    resolve to the floor underneath it.
  A false alarm worth recording, because it cost a debugging pass: the first
  test press "failed" to open a menu and the code was fine — the coordinate hit
  the **outdoor** orange cushion, which has no colourways *and* no floor behind
  it, so refusing was correct. Probing `pickFurniture` directly through
  `window.__mallow` settled it in one call; the debug handle earned itself.
- *2026-08-06* — **A free camera, and the design decisions that unblock the
  editor.** Ellis settled the two flagged conflicts: **no cat death** (*"forget
  cats dying for now"*), and **feeding is upside-only** — it boosts happiness
  and *activity*, so cats move around more, which is a cosy reward rather than
  a numeric one and pairs neatly with player-placed cat furniture. Also *"keep
  this cafe as default just lose most of the furniture"*, which makes step 1 of
  the editor far cheaper than a from-scratch empty room.
  Built `scene/camera-controls.ts`: drag to pan, pinch/wheel to zoom, smoothed,
  with **zoom-out clamped to §9's solved fit distance** so the widest view is
  still a correctly-framed café — the framing rule survives a free camera by
  becoming its bound rather than its position. **The angle stays fixed and that
  is an art constraint**: the room is a two-walled cutaway, so orbiting shows
  it through the missing walls. Petting moved from `pointerdown` to a tap
  callback with a 10px slop threshold, or every drag ending on a cat would pet
  it. `touch-action: none` on the canvas — without it iOS eats the gestures.
  **Verified three ways**, because a camera bug is invisible to a unit test: 10
  new tests against a stubbed canvas; the pan basis vectors re-derived
  independently rather than trusted to agree with the tests I'd written; and
  the real thing driven in headless Chrome through actual pointer/wheel events,
  confirming pan moves, zoom clamps, and a tap leaves the camera put.
  **`tools/shot.mjs` is new and durable** — headless screenshots + console
  errors, at iPhone size. A previous session built this in a scratchpad and
  lost it; it belongs in the repo. Two traps are written into its header, the
  sharp one being that `--virtual-time-budget` cannot be used here because
  Draco decodes in a worker where virtual time never advances.
  Noticed while zoomed in: **the pack's detail is lovely up close and entirely
  invisible at the fitted distance.** Zoom isn't only an editor affordance,
  it's a way to actually see the art that's already been paid for.
- *2026-08-06* — **The device build did its job: it killed the design and
  found the heat.** Ellis played the real app and came back with the verdict
  §0 had been circling for weeks — *"its like so idle its not engaging"* — plus
  a full specification for what replaces it, now written up as §8 "The café
  editor". Nothing of it is built yet; this session captured it and fixed the
  thermals.
  **On the heat**, three levers, cheapest first, and the first was free:
  `antialias: true` was allocating a multisampled backbuffer that the composer
  discards every frame (§9 has said MSAA is bypassed under a composer since the
  post chain landed — the flag was simply never removed). Pixel ratio 2 → 1.5,
  which on a DPR-3 phone is 1.8x fewer pixels through a per-pixel GTAO + bloom
  + SMAA chain. And **the frame rate was uncapped** — 60 on most phones, *120
  on a ProMotion iPhone* — now 30 (`core/loop.ts`), which for a diorama whose
  motion is breathing cats and dust motes costs nothing visible and roughly
  halves GPU load. **Verified first that the economy is time-derived, not
  per-frame** — `tickVisitors` pays on absolute timestamps and spawns on
  intervals — because if it had been frame-counted, capping the rate would have
  silently halved everyone's income. Untested on device as of writing.
  Note the editor will want 60 fps *while dragging*; raise the cap for the
  duration of a drag rather than for the whole session.
- *2026-08-05* — **The save had never worked, and only a phone could show it.**
  Ellis, ten minutes after the first device build: *"progress completely resets
  every time i quit app lol."* The autosave was a debounce being rearmed 60
  times a second, so it had never once fired in the life of the project (§8 has
  the full write-up and the rule). Fixed as a throttle, with tests that were
  checked to fail against the old code before being kept. **The wider point is
  about the value of the device build itself:** this bug was invisible in every
  browser, invisible to 102 passing tests, and fatal in the actual product. It
  was found within minutes of the app existing. §13's "test on a real device
  early and often" has been in this file since the start and was outstanding
  for the whole project; this is what it was warning about.
  **Still unverified, and worth checking next time on device:** offline
  earnings on *resume from background* hang off `visibilitychange` in
  `main.ts`, which is the same class of event that appears not to fire on iOS.
  Background the app a minute, reopen, and see whether the welcome-back card
  appears. Launch-from-cold is fine either way, since it reads `savedAt` — and
  `savedAt` is now actually being written.
- *2026-08-05* — **It's an app now.** Ellis wanted it on his phone, so Capacitor
  went in properly: `ios/` is a real Xcode project, portrait-locked in
  `Info.plist`, and **verified to compile** with `xcodebuild` against a
  simulator destination rather than just handed over untested. Four things
  worth carrying forward. (1) **Capacitor 8 uses Swift Package Manager, not
  CocoaPods** — `pod` was installed on the assumption it was needed and it was
  not; don't repeat that. (2) **`public/` is the .ipa.** The 17 MB source FBX
  was sitting in there, unreferenced since the GLB conversion in February's
  toolchain work, and being copied into the build — `dist` was 31 MB and is now
  13 MB. `tools/convert-characters.py` now reads the FBX from the raw pack in
  `graphics/` instead. (3) **`ios/` is tracked, not ignored.** The root
  `.gitignore` had a blanket `ios/` rule, which would have thrown away the
  portrait lock and, later, signing config and app icons; Capacitor writes its
  own nested `.gitignore` for the genuinely generated parts. (4) For iterating,
  `npm run dev:lan` + Add to Home Screen still beats a native rebuild — the
  native build is for measuring *performance*, which is the one thing the
  browser can't tell us.
- *2026-08-02* — **Bounce light, and the guests got faces.** Ellis: *"the
  characters heads are invisible."* They were not — every seated guest was
  facing the **room's centre**, which from a camera parked on the open corner is
  directly away from you, so you only ever saw the back of a head. They now face
  the door (§9 `SEAT_FACINGS`), which is both toward the camera and sensible in
  the fiction. Also fixed a real bug found on the way: `pick()` hashed a
  wall-clock timestamp by multiplying it past `Number.MAX_SAFE_INTEGER`,
  destroying every low bit, so guest appearance barely varied — it uses
  `Math.imul` now. Skinned meshes are `frustumCulled = false`, since three.js
  culls them against their bind pose.
  On lighting: added an **environment map** for bounce (§9), which lifted the
  saturated props a long way but — measured — left the accent-vs-floor *ratio*
  untouched, because all lighting multiplies albedo. Worth keeping for the
  directional fill; not a substitute for the grade. Final match is mean +0.009,
  p5 +0.033, p50 +0.025.
  **New tooling, and it matters:** `scratchpad/cdp.mjs` drives headless Chrome
  over the DevTools protocol in *real* time. `--virtual-time-budget` is useless
  for anything touching the character pack, because Draco decodes in a Web
  Worker and virtual time does not advance there — the GLB simply never loads.
  `/characters.html` now also renders assembled guests, one per seat kind, which
  is how the head question was settled in one screenshot.
- *2026-08-01* — **Graded the reds down, and stopped tuning lights at it.**
  Ellis: *"the reds are still so dramatic and red… still quite dramatic and
  contrasted overall lighting wise."* Sampling *matched surfaces* instead of
  whole-frame histograms isolated it in one step: the neutrals already matched
  the reference, and only the small saturated props were wrong — darker and
  **purer**. In the reference the cushions are brighter than the floor they sit
  on; ours were darker, which is bounce light we don't have. GTAO and atlas
  mipmap bleed were both tested and cleanly ruled out. Fixed with a proper
  colour grade (`GradeShader`) solved numerically against the sampled pairs, so
  per-surface purity now matches the reference almost exactly. The renderer
  exposure is now 0.40 and **that is deliberate** — see §9 "The grade pass, and
  why the exposure looks wrong" before touching it.
- *2026-08-01* — **Real people in the café, softer beams, cats that sit on
  things.** Ellis: *"the light beams coming inside should be softer… its still
  way brighter and more contrasted… some of the cats are sitting in impossible
  places too. and implement our newly converted characters."* All four done. The
  characters were the big one — see §9's character-pack section for the three
  facts that shape the code, the sharpest being that **`T_Character_Atlas.png`
  is not a character atlas at all**, it is a copy of the café atlas, and binding
  it to the clothes puts floorboards on everyone's trousers. Garments are white
  geometry meant to be tinted, which is where customer variety now comes from.
  The cat spots moved onto visible surfaces — a cat on open floor reads as
  floating from a fixed isometric camera even when the floor is genuinely clear.
  On brightness: measuring again with a *fair* crop showed shadows were the real
  problem (p5 0.129 vs 0.229) and the mid-tone gap is structural — see §9 "What
  measuring can and can't close" before spending another pass on it.
- *2026-08-01* — **Softened the palette, and gave the café ground to stand on.**
  Ellis: *"ours is so much more dramatic and sharp than the rendered image
  example… we are also missing shadows on the background floor thing which makes
  it… more like a testing version."* Both real, and the colour half was fixed by
  **measuring instead of describing**: quantising the reference and our frame to
  a dozen colours each showed we were *under*-saturated (0.48 vs 0.57) while
  being called too dramatic — the drama was entirely crushed shadows (darkest
  L 0.18 vs 0.24) and a dim top end. Lifted fill, halved key, kept ACES. Two
  plausible tone-mapping "fixes" (Neutral, AgX) both made it worse and are
  written up so nobody tries them again. The ground is a gradient sweep plus a
  painted contact shadow — a cast one is geometrically impossible here. See §9
  "Stop describing the picture. Quantise it."
- *2026-08-01* — **The room is the reference now, and the fix was to stop
  looking at the picture.** Ellis, on the mirrored attempt: *"i need it to match
  this image example exactly… completely different."* The pack ships the
  **Blender scene that produced that render**, so the whole layout was extracted
  from it rather than rebuilt by eye — 60-odd objects, exact transforms. Three
  findings, all of which had been quietly costing time for weeks: **`Light` and
  `Dark` in wall names are *sides*, not colours** (which is why the window could
  never be moved to the back wall without turning it inside out); **`_End_XL` is
  the big sweeping arch** the render's silhouette is made of; and **Blender's
  `to_euler('XYZ')` is three.js's `'ZYX'`**, which is invisible until something
  is genuinely tilted and then lays every propped cushion flat on its edge. See
  §9 "Rebuilding from the sample scene". Also: the window seat *can* be built —
  the previous session's "impossible" verdict measured a folded cushion and
  refused an overhang the render simply takes. `FRAME_BOX` widened for the arch
  and the outdoor props (§9), the light shafts and daylight panel moved to the
  back wall, and save v7 rehomes an untouched sofa/rug onto the new free
  defaults so an existing café looks like a new one.
- *2026-08-01* — **Room recreation FAILED — it came out mirrored.** Ellis:
  *"literally looks NOTHING like the pic. 0 resemblance?"* He was right. The
  reference has the window and arch on the **right** wall and the counter,
  blackboard and shelves on the **left**; ours has them swapped, and its counter
  is a flat strip where the reference's is an L-shaped peninsula jutting into
  the room. **The mistake was method, not placement:** props were rearranged
  inside the existing shell without ever checking the shell against the image
  first. When recreating a reference, verify the architecture — which wall is
  which, and the shape of the big fixed pieces — *before* placing anything on
  it. See Next up for the rebuild order.
- *2026-08-01* — Room recreation, first attempt — counter with
  cake display, cascade shelf, cushion cluster round a low table, entrance step
  with red mat, A-frame sign, and the arch over the window. The layout test
  earned its keep hard here, catching four faults in one pass, including a
  genuinely impossible one: **the render's padded window seat cannot be built**,
  because our sill is a 0.34 ledge and a folded cushion is 0.62 deep. It needs a
  bench asset, not cushions. Also caught the A-frame sign sitting on the
  door→armchair walk line (visitors lerp straight, no pathfinding).
  **Still off vs the reference — see Next up.**
- *2026-08-01* — **Blender installed; characters converted.** `brew install
  --cask blender` (5.2.0 LTS, no sudo). `tools/convert-characters.py` takes the
  pack from **18.1 MB FBX to 2.8 MB GLB** and — the important part — collapses
  **3286 duplicated bones into a single 112-node skin**, which is exactly the
  thing a plain format converter could not have done and the reason Blender was
  the right call. All 43 clips survive. Also removed a stray additive glow quad
  that the new post chain had turned into a visible square on the wall, and
  softened the lighting toward pastel by dropping the key rather than touching
  colour. **The room recreation was not started** — see Next up.
- *2026-08-01* — **Post-processing, and the softness finally arrived.** Ellis,
  against `graphics/K9gvnT.png`: *"everything looks smoother, softer, gentler.
  idk what it is."* It was ambient occlusion. Added a GTAO + bloom + SMAA chain
  (§9 "Post-processing") — no amount of light tuning could have got there,
  because the missing thing was contact shadow, not illumination. Bundle
  637 → 751 kB and GTAO is now the frame's most expensive pass; untested on
  device. Also settled the character toolchain on Blender over a converter.
- *2026-08-01* — **Rounded the walls, calmed the light, brought in the people.**
  Ellis: the shaft was *"too extreme"*, the room *"still dim… but with a mega
  bright light coming in"*, and he wanted *"the curved off wall… instead of a
  square wall it slopes down"*. All three fixed: room fill up again, shaft
  density cut to a third, and — the real find — the pack ships `_End_X` wall
  variants whose tops **curve down at the open end**. We had been using `_Mid`,
  which is cut square, and that alone was why the café read as a box (§9
  "Walls"). A freestanding `Wall_Arc` was tried first and was wrong; removed.
  Also vendored the CC0 character pack and built `/characters.html` to inventory
  it — 62 modular meshes, 43 clips, and two shipping blockers written up in §9.
- *2026-08-01* — **Volumetric light shafts, and the lighting finally settled.**
  Ellis: *"i want like.. shaders, smooth beautiful ambient lighting. now youve
  just made it too bright and i cant even see the soft light beams."* Both
  halves were right and connected: the room was overexposed, which left additive
  light nowhere to go. Fill is now gradient-led (hemisphere, not flat ambient),
  exposure pulled back to leave headroom, and real ray-marched light shafts come
  through the window. The shafts were invisible at first for a genuinely
  instructive reason — see §9 "the shell trap". Cats got a compliment.
- *2026-08-01* — **Lit it properly, and drew the icons.** Ellis, with reference
  renders: *"it looks really dim and moody… i want same nice light warm
  lighting."* The room had been deliberately under-lit by a previous pass that
  believed dim ambient was what made it cosy; the references show the opposite.
  Rebuilt as high-key — strong even fill, key only for shaping, interior pool
  lights deleted — and wrote §9 "Lighting" so it doesn't swing a third time.
  Then the emoji came out and a drawn SVG icon set went in (`ui/icons.ts`), and
  the whole interface voice went lowercase, cat names excepted.
- *2026-08-01* — **The interface, redesigned.** Ellis on the first design pass:
  *"the buttons look like shit… it looks like it's done in Microsoft Word."*
  Two causes, and the first was invisible: the specified `ui-rounded` typeface
  **never loaded in Chrome**, so every screenshot anyone had judged was plain
  system sans. Bundled Recursive instead (one variable file, three voices) and
  rebuilt the sheet around dark chalkboard signage, a single honey action, and
  menu-line pricing. See §9 "The interface". Also deleted ~120 lines of dead
  venue CSS and the duplicate rules left by the previous pass appending itself
  below the original rather than replacing it.
- *2026-08-01* — **Three faults Ellis found by looking at it.** (1) A huge white
  rectangle beside the café: the daylight panel behind the window was a 9×7
  plane hiding behind a 4×4 wall, so it stuck out on every side. Sized to the
  glass aperture (which is y[0.93,2.77], z[±1.12]) and tucked just outside the
  wall, so the wall occludes every edge. (2) An unidentifiable orange lump on
  the counter: `CupcakeStand` is only 0.14 tall because it is the *plate* — the
  pack ships the dome separately as `Deco_CupcakeStand_Lid` — and it was also
  sitting inside the sink's splashback. Removed; machine, sink, till is a
  complete counter. (3) **The window sill was slicing through the armchair.**
  `Wall_A_Window_Light_Mid` is not a flat slab: its body stops at x=−1.95 like
  any wall, but at y≈0.9 a ledge juts a further 0.34 into the room — exactly
  armchair-back height. Pushing a chair flush to the wall, the obvious thing to
  do in a small room, put the ledge across the top of it, and it read as a shelf
  growing out of the window. Chair and table moved right; `SILL` is now a named
  constant in `data/cafe-layout.ts` and a test enforces it. **All three were
  found by profiling the glTF vertex data, not by rendering** — no agent has
  ever managed a screenshot of this page, so geometry assertions are the only
  debug visualisation available (§17). Also brought §0 back in sync: the
  previous session shipped the Style menu and save v6 without updating it.
- *2026-07-31* — Built the café upgrade system end-to-end (data → pure systems →
  store → save v3 → UI → 3D scene → analytics → tests). Retuned the arrival-rate
  curve; see §8 "Economy loop" for why. Added this §0.
- *2026-07-31* — **Art direction + juice + audio (M4 pulled forward).** Rebuilt
  the cat as a proper sitting hero mesh with animation hooks, flat-shaded
  low-poly style applied to visitors too, warm lighting with ACES tone mapping.
  Added tap-to-pet, coin floaters, dust motes, and a fully synthesised audio
  layer. Reordered §15 and wrote down why. Added jsdom HUD smoke tests, since
  no agent has been able to open a browser on this project yet.
- *2026-07-31* — **The café became real, and the empire died.** Integrated the
  Minty pack as an actual hand-placed room (diorama, cutaway, isometric),
  deleted every procedural greybox module, removed the venue ladder entirely,
  rescaled the economy from billions to a £9,999 till ceiling, and capped cats
  at eight. `scene/cafe-room.test.ts` verifies the hand-placed layout has no
  clashes and every seat is walkable — the same bounding-box trick as before,
  now pointed at real art. What is *not* done: cats and customers are still
  greybox, and decoration mode — the thing that now has to carry progression —
  isn't built.
- *2026-07-31* — **Playtest fixes from Ellis on device.** Four real faults, all
  found by playing rather than by any test: (1) cat cost growth was 1.6, nearly
  4x outside genre norms — Cookie Clicker is 1.15 — so every cat past ~25 was a
  trap purchase you could never pay off, killing the core hook; now 1.28 with a
  payback-time regression test. (2) Cats past the sixth were nudged backwards
  per wrap and stacked into a pyramid through the back wall (z=4.3 in a room
  ending at 4.0); the lounge is now 16 fixed spots and a hard cap, with the
  overflow explained in the roster. (3) The coin chime fired 4x/second and was
  correctly called annoying; now 1.3s apart and quieter. (4) Coin floaters were
  uncapped; now 8 max. **Also: the progression curve had never been benchmarked
  against real games — that was a real gap, and it is what let (1) through.**
- *2026-07-31* — **Venue progression + the pacing rebalance.** Ellis flagged
  that you could buy a couple of cats, leave for days, and come back rich —
  the game encouraged *not* playing. Measured it: active play earned exactly
  the idle rate, so it did. Fixed by giving petting a mechanical payoff that
  also carries into offline income, and cutting offline to 30%/8h. Built the
  seven-venue ladder for the long curve, and `npm run balance` to tune it
  against numbers rather than vibes — it immediately caught a cost curve that
  walled off the top three venues. See §8 for both.
- *2026-07-31* — **Reframed the whole scene for portrait.** The room had been
  laid out and framed for a desktop window; on an iPhone the camera saw only
  3.5 of its 8 world units, cropping chairs, cats and décor off the sides.
  Room is now narrow and deep (5 × 8, seats 4 across × 3 rows) and the camera
  solves its own distance per aspect ratio. See §9 "Framing" — this is a
  standing constraint, not a one-off fix.

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

- Levels are stored sparsely (`{ brews: 2 }`); an absent id means level 0, so adding upgrades never invalidates an old save. `systems/upgrades.ts` clamps unknown, negative, and out-of-range levels rather than trusting the save — which is also why removing one can never corrupt a save, only quietly stop counting. **Refund it anyway**: v12 hands back what was spent on `decor`, because the appeal it bought is now on sale in the shop.
- `scene/cafe-room.test.ts` asserts the fully-stocked café has no clipping furniture, keeps cat spots clear, and leaves a walkable door→seat line (visitors lerp straight to their seat — there is no pathfinding to route them around a plant).

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

**Currently at v23.** Migrations are a chain in `state/save.ts`: each entry bumps exactly one version, and `loadSave` walks a save forward from whatever version it's on. Adding a version means appending one migration and one test case to `state/save.test.ts` — which every version must have, because this is the one place a bug costs a player their cats. (v1→v2 added `savedAt`; v2→v3 added `upgrades`; v3→v4 added `venueIndex` plus an optional `contentUntil` per cat; v4→v5 **removed** `venueIndex` with the venue ladder and clamped old billion-pound balances into the new readable range; v5→v6 is the deliberate one-time break described in §0; v6→v7 rehomes an *untouched* sofa/rug choice onto the new free default without touching a bought one; v7→v8 split the floor out of the wall style; v8→v9 added `placements`; v9→v10 granted an existing café the whole shop catalogue; v10→v11 marked existing players as having finished character creation; v11→v12 dropped the retired `decor` upgrade and **refunded** it; v12→v17 added the coffee menu, expansion tiles, purchasable backdrops and cat beds (v16→v17 grants every existing cat a free bed, since capacity became bed count); v17→v18 seeds `windows` with the café's own back window, which had been hard-coded in the layout — miss it and the café wakes up bricked in; v18→v19 grants the floor cushions, which moved into the shop; v19→v20 marks an existing café as having already seen the guide, so a finished café is never shown a tutorial; v22→v23 adds chores and stamps `openedAt` at *migration time* rather than
zero — a zero would make every chore overdue by decades and greet a returning
player with three jobs at once; v20→v21 withdraws the floor cushions the v19 grant handed out — the only migration that *removes* anything, and safe only because it can never take back something that was bought. Cats and names always survive.)

### The small-café economy (rebalanced 2026-07-31)

Every number was rescaled when the empire fantasy was scrapped (§0). The shape
now, verified by `npm run balance`:

| | |
|---|---|
| Starting money | £40 |
| Second cat | £45 — reachable in the first minute, which protects D1 |
| Eighth (last) cat | ~£1,800 |
| Cheapest upgrade | £40 |
| Dearest upgrade level | ~£3,200 |
| Income at full build-out | ~£81/min |
| **Till ceiling** | **£9,999** |

**The till ceiling is the load-bearing part.** Money stops accruing there.
Without it any idle game accumulates forever once everything is bought — the
sim hit **£34 million in thirty days** purely by hoarding, which is precisely
the "figures such as £5 million" problem. Nothing is lost and nothing is taken
away; the till just fills, which is a gentle nudge to spend it on something
lovely. Four digits, so money never needs abbreviating. `npm run balance`
prints the peak till and will show the clamp broken if it ever exceeds it.

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

**Icons are drawn, in `ui/icons.ts`. Never emoji.** Emoji are somebody else's
art in somebody else's style, they render differently per platform, and beside
real typography they're the clearest amateur tell a UI has — the same argument
this section makes about mixing asset packs. House style: solid silhouettes
rather than line art (the café is chunky and soft; hairlines read as a
different product), a 24×24 box, `currentColor` only so one icon works on both
a slate chip and the honey button, and no detail below ~1.5px.

Two traps worth knowing, both hit while drawing this set:
- **A same-coloured stroke over a same-coloured fill is invisible**, whatever
  opacity it carries. The coffee bean's crease has to be a real gap between two
  shapes, letting the background through — as a stroked line it rendered as a
  blank oval.
- **An open path with a fill closes across the shortest line.** The cat's ears,
  drawn as open strokes, filled across the centre and merged into a bow tie.
  Ears are closed triangles that stay clear of the centre.

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
- **Audio is synthesised at runtime** (`audio/audio.ts`) — WebAudio only, no files, no licensing questions, nothing to load. Ambient bed of detuned sines on independent LFOs (so it never loops audibly), plus coin/purr/tap/purchase/reveal sfx. Reveal intensity scales with rarity. Starts on first tap (browser autoplay policy) and no-ops entirely when there's no `AudioContext`.
- **Rate-limited on purpose**: a maxed café pays ~2.5×/second, so coin *sounds* are throttled to ~4/s while every payment still shows a floater. A chime that often stops being a reward and becomes a nag — pillar 1 beats feedback density.
- `prefers-reduced-motion` is respected.

A real composer's ambient bed would beat the synthesised one and should replace `startAmbient()` when art volume lands; the sfx are good enough to keep.

---

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

---

## 14. Coding conventions

- TypeScript strict. No `any` unless genuinely unavoidable and commented.
- Systems in `/systems` are pure logic and independently testable.
- Config and tunable numbers live in `/data`, never inline in logic.
- Small, focused modules. Clear names over clever ones.
- Commit often, in small logical units.

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
npm test           # 102 tests, no renderer needed
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
```

In a dev build `window.__mallow` exposes `{ camera, controls, store, catManager }`
for poking at the scene from the console or over CDP. It is compiled out of
production by `import.meta.env.DEV`.

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
  append a dated session-log line, tick §15, and write any architectural or
  balance decision into the section it belongs to. Treat this as part of the
  work, not paperwork after it.
- Add debug visualisation **early** for anything spatial or state-based — don't wait until you're stuck (hard-won lesson from a previous collision-bug fight). `scene/layout.test.ts` is the cheap version of this: bounding-box assertions catch clipping furniture without a renderer, and they run in `npm test`.
- **Simulate the economy before trusting it.** A short script that plays a greedy
  optimiser forward for 48h exposes stalls, dead upgrades, and runaway inflation
  in seconds — it is how the two balance bugs above were found, and it beats
  guessing at cost curves by a mile.
- Prefer building one system end-to-end over half-finishing several.
- When balancing feels off, expose the numbers in `/data` and a debug overlay rather than guessing.
- **Stay grounded in §4.** If a proposed feature or spend isn't serving the retention targets or the validate-first philosophy, question it.
- Keep this file current — when we make an architectural or design decision, record it here.
