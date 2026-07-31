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

**Last updated:** 2026-07-31

**Built and working:**
- **M1 — playable core loop** ✅ visitors arrive → sit → pay → money accrues.
- **M2 — the hook** ✅ rarity, gacha-lite adoption, naming, roster + cat-dex.
- **M3 (partial)** — idle/offline income ✅; save system with a real migration
  chain ✅; **café upgrades: expansion, décor, tips, service ✅**.
- **M4 (partial)** — **art direction locked ✅** (hero cat, flat-shaded style,
  warm lighting + tone mapping); **juice ✅** (living cats, tap-to-pet, coin
  floaters, dust motes); **audio ✅** (synthesised, no asset files).
- **Venue progression ✅** — seven-venue ladder, cats always come with you.
- **Contentment ✅** — petting cats is the mechanic that rewards being present.
- **`npm run balance`** ✅ — simulates weeks of play under four player habits.
- **Portrait framing** ✅ — the camera solves its own distance per aspect (§9).
- **Analytics** ✅ (pulled forward from M5) — TelemetryDeck transport, batching,
  session + funnel + economy events.
- `npm test` — 104 tests over the pure systems, save migrations, café geometry,
  the visitor loop, venue/contentment maths, and a jsdom smoke suite for the HUD.

**Next up — build depth first, then test (revised 2026-07-31):**

> **On when to test.** §15's gate reads as one event; it's really two questions
> with different readiness dates, and conflating them wastes a cohort.
> - **D1** — "was the first session good enough to come back tomorrow?" That's
>   the first 5–10 minutes, which *is* built. Answerable now, and cheap to read
>   qualitatively with 5–8 people watching a first run.
> - **D7** — "is there a reason to return on day 3?" **Now plausibly answerable
>   as of the venue ladder** (`npm run balance` shows weeks of progression for
>   every player habit). This was blocked when content ran out in an hour; that
>   specific objection is now addressed, though variety is still thin.
>
> So: **no large public cohort until a week of play exists.** First impressions
> are a one-shot resource and cosy communities are small. Small qualitative
> reads along the way are fine and encouraged. Keep instrumentation live the
> whole time so the data is there when the cohort is worth running.

1. ~~Venue progression~~ ✅ built 2026-07-31 — see §8.
2. **The LTE (limited-time event) framework.** Per §8 the highest-ROI retention
   feature in the genre. Note the framework alone adds no playable content;
   its value arrives with authored events, which is why it sits after venues.
3. **Cosmetic-only décor tier.** §8 wants décor to have a purely cosmetic tier
   alongside the stat one; currently every décor level is also a stat buy.
4. **Then** the real D1/D7 cohort, and iOS packaging (no Capacitor yet — no
   `ios/`, nothing in `package.json`; it's unbuilt work, not a `cap sync`).

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
- Cat/visitor/décor meshes are procedural placeholders; no GLB assets yet.
- Ambient audio is synthesised; a composed bed would be better.
- No UI/icon art — upgrade icons are emoji.
- Bundle ~534 kB (Three.js); fine for now, revisit before ship.
- **Draw calls**: a full late-game café is ~535 meshes / 39k triangles. Triangles
  are fine; the mesh count is the thing to watch on a mid-range phone (§13).
  Materials are shared per breed/palette already. Deliberately *not* optimised
  further — a GLB hero cat is 1–2 meshes and fixes it for free, so merging
  geometry on a placeholder would be throwaway work.
- Content depth is now ~weeks rather than ~an hour (see the curve in §8), but
  the *variety* is still thin — it's the same café loop at bigger multipliers.
  LTEs are the intended answer to variety, as opposed to length.
- Venue palettes recolour the room, but every venue is the same room shape with
  the same props. A seaside terrace should not be a repainted corner café.
- Not yet run on a real device or in a real browser by an agent — §13 says test
  on device early, and that still hasn't happened.

**Session log:**
- *2026-07-31* — Built the café upgrade system end-to-end (data → pure systems →
  store → save v3 → UI → 3D scene → analytics → tests). Retuned the arrival-rate
  curve; see §8 "Economy loop" for why. Added this §0.
- *2026-07-31* — **Art direction + juice + audio (M4 pulled forward).** Rebuilt
  the cat as a proper sitting hero mesh with animation hooks, flat-shaded
  low-poly style applied to visitors too, warm lighting with ACES tone mapping.
  Added tap-to-pet, coin floaters, dust motes, and a fully synthesised audio
  layer. Reordered §15 and wrote down why. Added jsdom HUD smoke tests, since
  no agent has been able to open a browser on this project yet.
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

**Venue progression** is the long curve — a seven-venue ladder from a corner
café to a moon café, each roughly ×8 income and ~×18 lease cost, so each move
takes about twice as long as the last. Cats, names and the cat-dex carry across
every move; fixtures do not.

Measured with `npm run balance` (30 simulated days):

| habit | reaches | first move | full ladder |
|---|---|---|---|
| devoted (4×25min/day) | 7/7 | 6h | ~17 days |
| regular (2×15min/day) | 6/7 | 12h | — |
| casual (1×10min/day) | 6/7 | 1 day | — |
| pure AFK (never pets) | 5/7 | 2 days | — |

The shape to preserve when retuning: **a first move within a few hours** (early
reward protects D1), **each subsequent move ~2× the last** (a ramp, not a
cliff), and **a visible gap between habits** (playing has to matter). An early
draft had move costs growing ~60× per tier against ~8× multipliers, which
walled the top of the ladder off completely — devoted players stalled at venue
5 and never moved again. `npm run balance` catches that in seconds.

`systems/venues.test.ts` asserts a bare new venue out-earns a fully maxed old
one, so moving is never a trap.

**Upgrades** are a data-driven catalog (`data/upgrades.ts`) with four deliberately non-overlapping levers, so every purchase reads clearly:

| id | what it buys | effect |
|---|---|---|
| `seating` | another table | +1 seat (raises the throughput ceiling) |
| `decor` | cosy touches | +appeal (faster arrivals *and* bigger tips) |
| `brews` | better brews | +% pay per guest |
| `hands` | a helping hand | shorter visits, so each seat serves more guests |

- Levels are stored sparsely (`{ seating: 2 }`); an absent id means level 0, so adding upgrades never invalidates an old save. `systems/upgrades.ts` clamps unknown, negative, and out-of-range levels rather than trusting the save.
- **Buying an upgrade visibly changes the room.** `entities/cafe-manager.ts` reveals one table set per unlocked seat and one prop per décor level, popping in rather than snapping (§10). Seat *positions* are fixed for all 12 possible seats so a seat index always means the same chair.
- `scene/layout.test.ts` asserts the fully-expanded café has no clipping furniture, keeps cat lounge spots clear, and leaves a walkable door→seat line (visitors lerp straight to their seat — there is no pathfinding to route them around a plant).
- Décor is currently *only* the stat tier. The purely cosmetic tier §8 calls for is still outstanding — see §0.

### Limited-time events (LTE) framework — the retention engine
Build a **repeatable event system early** (seasonal themes, special/collab cats, limited décor). This is the single highest-ROI retention feature in the genre — the vast majority of mobile IAP revenue comes from games running live-ops. Design it as data-driven event definitions in `/data` so new events are content, not code.

### Save / load
Single source of truth = the Zustand store, serialised to storage. Autosave on every meaningful state change and on app background. Include a `version` field and a migration path so updates never corrupt saves. **Never lose a player's cats.** Sacred.

**Currently at v4.** Migrations are a chain in `state/save.ts`: each entry bumps exactly one version, and `loadSave` walks a save forward from whatever version it's on. Adding a version means appending one migration and one test case to `state/save.test.ts` — which every version must have, because this is the one place a bug costs a player their cats. (v1→v2 added `savedAt`; v2→v3 added `upgrades`; v3→v4 added `venueIndex`, plus an optional `contentUntil` per cat that needed no rewriting.)

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
- **Lighting is the star.** Warm key light, soft shadows, cosy ambient glow. Good lighting on simple models reads as beautiful; detailed models under flat lighting read as cheap.
- **Cohesion rule:** pick ONE base art style and match everything to it. Mixing packs from different styles is the #1 tell of an amateur build.
- **Asset sources:** base café/furniture/props from a single cohesive pack (Synty POLYGON, or free: Kenney, Quaternius, Poly Pizza); custom hero assets (the cats) via AI 3D generators (Meshy / Tripo / Rodin) — but **quad-remesh and clean up** raw AI meshes and **confirm commercial licensing before shipping**; UI/icons/promo art via AI 2D generators.
- **Format:** GLB for models (loads cleanly into Three.js). Poly budget by role: background props very low, interactive props mid, hero cats slightly higher.

### Framing: portrait-first, non-negotiable

A `PerspectiveCamera`'s `fov` is its **vertical** field of view, so a tall phone has very little *horizontal* view to spend: at 45° and a 0.46 aspect ratio, an iPhone sees barely 3.5 world units across. A fixed camera position that looks right in a desktop browser window will therefore crop the café off the sides of every phone — which is exactly what happened on the first pass.

Two rules follow, and both are load-bearing:

1. **The room is narrow and deep** (currently 5 × 8), and grows *away* from the camera. Seats are 4 across in 3 rows. Widening the room is how you crop the café off a phone; if you need more capacity, add a row, not a column.
2. **The camera is solved, never hard-coded.** `scene/camera.ts` declares a `FRAME_BOX` that must stay on screen and binary-searches the camera distance that contains it at the current aspect. Wide screens sit close, narrow ones pull back, nothing is ever cropped. Don't reintroduce a literal `camera.position.set(...)`.

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
- ✅ **Venue progression** — the long game (§8), balanced with `npm run balance`.
- ✅ **Idle/offline income** — earnings accrue while away, welcome-back card.
- ✅ **Save-system hardening** — versioned migration chain (now v3), tested.
- ✅ **Upgrades / expansion / décor** — four-lever upgrade catalog, café panel with live stat readouts, and a room that visibly grows as you buy (see §8 "Café / expansion").
- ⬜ **LTE event framework** — the remaining piece, and the highest-ROI one.
- ⬜ **Cosmetic-only décor tier** (§8 wants one; today all décor is a stat buy).

**Milestone 4 — Beauty pass:** 🟡 in progress — art cohesion, lighting, juice (§10), audio.

**Reordered 2026-07-31, deliberately.** The original plan put the entire beauty pass after M3. That is a trap for *this* game: the §15 gate is "ship to TestFlight, measure D1/D7, stop if D1 < 30%" — and for a cosy game the feeling **is** the product. Running that gate on a grey-box build measures "does an ugly game retain" (no) rather than "is this loop sticky", producing a false negative that could kill a good game.

The resolution is **art *direction* early, art *volume* late**:
- ✅ **Direction locked** — hero cat silhouette, flat-shaded low-poly style, warm lighting with ACES tone mapping, cohesive palette. One cat, not fifty.
- ✅ **Juice + audio** — these are cheap, don't depend on final assets, and transform how a placeholder build feels. §10 already called them "the product, not decoration"; they no longer sit behind depth work.
- ⬜ **Volume** — real GLB assets, café/prop art, UI/icon art. Still gated on validation, still the expensive irreversible bet §4 warns about.

Keeping `/systems` pure and meshes confined to `/entities` is what makes the swap cheap later — don't erode that.

**Milestone 5 — Ship path:** monetization per §5, analytics per §11, Capacitor iOS build, TestFlight beta → launch with ASO + creator seeding (§12), then iterate on real data.

Resist polishing before the core loop is proven fun. Milestone 1 is the bet; everything after is investment in a *validated* bet.

---

## 16. Commands

```bash
npm run dev        # local dev server (test in browser first — fastest loop)
npm run build      # production web build
npx cap sync ios   # copy web build into the iOS project
npx cap open ios   # open in Xcode to run on device / simulator, then TestFlight
```

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
