# CLAUDE.md — Mallow

> Working title: **Mallow** (a cosy cat-café game). Swap the name here if it changes.

This file is the shared brain for the project. **Read it before starting work in this repo.** Keep it updated as decisions are made — if something here is out of date, fix it. Sections 1–5 are the strategic grounding: the *why*, the *who*, the numbers we're accountable to, and the honest reality that keeps us from drifting. Sections 6+ are the *how*.

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

### Cat system
- **Rarity tiers** (e.g. Common → Uncommon → Rare → Epic → Legendary). Rarer cats are more visually distinct and draw more visitors / spend.
- **Collection:** acquiring cats is the primary long-term goal. A roster/gallery ("cat-dex") shows what you own and what's still out there — completion is a core driver.
- **Naming:** the player names each cat. This is a core emotional hook — a first-class feature, not a nice-to-have. Names persist and appear in the world. Consider light per-cat personality/flavour to deepen attachment (evidence shows naming + observing a creature builds real attachment).
- **Traits (optional, later):** small passive bonuses or personality flavour per cat.

### Café / expansion
Upgrades and décor: more seating, new rooms, themed decorations, aesthetic customization. Décor should have both a stat purpose and a purely cosmetic tier (cosmetics matter enormously to this audience).

### Limited-time events (LTE) framework — the retention engine
Build a **repeatable event system early** (seasonal themes, special/collab cats, limited décor). This is the single highest-ROI retention feature in the genre — the vast majority of mobile IAP revenue comes from games running live-ops. Design it as data-driven event definitions in `/data` so new events are content, not code.

### Save / load
Single source of truth = the Zustand store, serialised to storage. Autosave on every meaningful state change and on app background. Include a `version` field and a migration path so updates never corrupt saves. **Never lose a player's cats.** Sacred.

### Progression pacing
Early game (first 5–10 min) must reward fast — first extra cat quickly, visible growth (this directly protects D1). Mid/late game slows into satisfying idle accumulation. Keep pacing values in config so they can be tuned from data.

---

## 9. Art direction

- **Style:** low-poly 3D, warm and soft. Rounded over sharp. Cohesive palette (warm creams, soft browns, muted pastels — cosy café, not neon).
- **Lighting is the star.** Warm key light, soft shadows, cosy ambient glow. Good lighting on simple models reads as beautiful; detailed models under flat lighting read as cheap.
- **Cohesion rule:** pick ONE base art style and match everything to it. Mixing packs from different styles is the #1 tell of an amateur build.
- **Asset sources:** base café/furniture/props from a single cohesive pack (Synty POLYGON, or free: Kenney, Quaternius, Poly Pizza); custom hero assets (the cats) via AI 3D generators (Meshy / Tripo / Rodin) — but **quad-remesh and clean up** raw AI meshes and **confirm commercial licensing before shipping**; UI/icons/promo art via AI 2D generators.
- **Format:** GLB for models (loads cleanly into Three.js). Poly budget by role: background props very low, interactive props mid, hero cats slightly higher.

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

---

## 11. Data & analytics (validate continuously)

Instrument from **day one**. The goal is to replace guesses with observed behaviour and to measure against the targets in §4.

Log lightweight events for at least: session start/end and length; the progression funnel (first cat, first expansion, D1/D3/D7/D30 return); where players stop (last action before a long absence); economy checkpoints (money + cat count at key moments, to catch balancing problems); and which cats/upgrades players actually buy.

Keep an event-logging abstraction in `/analytics` so the backend can change without touching game code. Privacy-respecting and minimal. **This is the honest version of "backed by data": measuring a live thing, not predicting a hypothetical one.** Every scope and spend decision should reference these numbers.

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

**Milestone 1 — Playable core loop (the experiment):** one café scene, one cat, visitors arrive and pay, money accrues, buy a second cat. Ugly is fine. Prove the loop is pleasant. **Gate: get to TestFlight + a small cosy Discord and measure D1/D7. If D1 < 30% or D7 < 10%, fix the loop before anything else.**

**Milestone 2 — The hook:** cat rarity + collection ("cat-dex") + naming + roster screen.

**Milestone 3 — Depth:** upgrades, expansion, décor, idle/offline income, save system, and the **LTE event framework**.

**Milestone 4 — Beauty pass:** art cohesion, lighting, juice (§10), audio.

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

- Add debug visualisation **early** for anything spatial or state-based — don't wait until you're stuck (hard-won lesson from a previous collision-bug fight).
- Prefer building one system end-to-end over half-finishing several.
- When balancing feels off, expose the numbers in `/data` and a debug overlay rather than guessing.
- **Stay grounded in §4.** If a proposed feature or spend isn't serving the retention targets or the validate-first philosophy, question it.
- Keep this file current — when we make an architectural or design decision, record it here.
