# Mallow — session log archive

The full chronological session log, moved out of `CLAUDE.md` on 2026-08-17 because
it had grown to 138 KB (~34k tokens) and was being loaded into context at the start
of every session.

**Nothing here is required reading.** Every durable rule these entries taught has
been promoted into the numbered sections of `CLAUDE.md` (§8 design, §9 art and
interface, §13 performance, §14 conventions, §16 commands, §17 working notes). This
file is the *narrative* — why a decision was taken, what was tried and rejected, and
what the failure looked like before it was understood. Read it when you need the
reasoning behind a rule, not to learn the rule.

The five most recent entries also remain inline in `CLAUDE.md` §0. New entries go
**here**, newest first, with only the last handful mirrored into §0.

---

**Session log:**
- *2026-08-30* — **A chair refused from a corner guests were already sitting
  in: two systems with two opinions about the same journey.**
  - Ellis, with a screenshot: *"i wanted to put the chair in the corner in the
    tutorial but its red and says the guests cant reach that spot! but then im
    forced to place where i dont want in the middle and then the guests go and
    sit in the corner anyway."* Two things wrong, and the second is the one
    worth remembering.
  - **The validator was testing a leg nobody walks.** `approachFrom` was
    `DOOR_LOBBY`, which *was* where guests set off for their chair — until
    2026-08-26, when they started stopping at the counter to order first
    (`adac6e4`). The route moved; the rule about the route did not, because
    nothing connected them. It is `COUNTER_QUEUE` now, and `cafe-room.test.ts`
    walks the same four legs `visitor-manager.ts` does.
  - **And the veto was wildly out of proportion.** *Any* solid object on the
    line to a seat refused the seat — so the 0.25-high cat bed the walkthrough
    had just told Ellis to put in the middle of the floor was as final as the
    0.78-high counter. Mapped in the tutorial café: one cat bed took the chair
    from 43 valid squares to 43 with **9 unreachable**, and the entire window
    corner — where the reference render puts the armchair — was among them.
  - **The fix is a height, measured rather than picked.** People step over low
    things and walk round tall ones. The pack sorts itself into two clean
    groups: cat bed 0.25, cushion 0.24, low table 0.38, rug 0.04 — then counter
    0.78, kitchen bench 0.72, side table 0.78, cake display 1.08, cat climber
    1.45. `STEP_OVER` sits in the gap at 0.5 and is not a tuning knob. After
    it: 48 valid squares, 4 unreachable, and the four are genuinely *behind the
    counter*, which is the case the rule was written for.
  - **An unmeasured obstacle still blocks.** `height` is optional on
    `Obstacle`, and absent means "assume it blocks" — a caller that has not
    measured something must not have that silently become permission.
  - **The general lesson is the disagreement, not either bug.** Reachability
    was being decided independently in two places: the visitor manager, which
    walks people through anything, and the validator, which refused a lot.
    Either could be right; both cannot be, and the player is the one who finds
    out. That invariant — *anywhere a guest can sit is somewhere a seat may be
    placed* — is now a test.
    - It is worth being honest that the invariant test would **not** have
      caught this one: judged from the old approach point, the authored seats
      all passed. What catches it is the pair of unit tests on the height rule,
      confirmed failing against the old behaviour before being kept. The
      invariant is there to catch the *next* one.
- *2026-08-27, night* — **Real cats, and a walkthrough that leaves the café
  looking arranged.**
  - **"can we source some actgual professionally made cat purr and meows or
    something instead of these ridiculous sounds."** The formant meow is a
    decent piece of synthesis and it is still a synthesiser pretending to be an
    animal; the purr was worse, having been rebuilt three times. Seven files,
    88 kB, all CC0 or public domain, from Wikimedia Commons. **The licence was
    checked per file rather than trusted from the search listing** — the first
    page of results is mostly CC BY-SA, which is a different thing entirely for
    something shipping inside an `.ipa`.
    - **This does not repeal §10.** The rule was never "no files"; it was
      *don't block first paint on a download and don't inherit a licence*. Both
      still hold, and 88 kB against a 4 MB character GLB is not a budget
      question.
    - **AAC, never Ogg, and this one is a trap.** Ogg Vorbis is the format most
      freely-licensed audio arrives in and **Safari does not decode it** — an
      `.ogg` here would have worked in every browser used to develop this game
      and in none of the app it ships as. macOS's own `afconvert` both reads
      Ogg and writes AAC, so the conversion needed no tooling.
    - **Six meows, four of them the same cat**, cut out of one eleven-second
      public-domain recording by onset detection, trimmed and normalised to a
      common peak. The one thing worse than a synthetic meow is the same meow.
    - **There is no CC0 recording of a cat trilling anywhere.** So `playChirp`
      borrows a real meow *before* falling back to its own synthesis: beside
      six recorded cats, a synthesised anything is the sound the player
      notices, and losing the distinction between "hello" and "feed me" costs
      less than losing the illusion.
  - **The walkthrough now arranges as it teaches.** Ellis: *"id like if it
    could kinda force the chair to be placed by the window and the cat bed more
    in the middle so it actually looks good after completing tutorial instead
    of looking messy where u cant place in a good spot as mal is stood in the
    way."* The ghost starts at a composed spot instead of under the camera —
    the armchair at its authored position (the reference render's own
    composition, read from `CAFE_LAYOUT` rather than copied), the cat bed at
    (0.5, 0), measured as the valid spot nearest the centre of the *usable*
    floor, which is not the centre of the room because the counter owns that.
    - **A suggestion, not a lock, and scoped to the walkthrough.** Ellis asked
      on 2026-08-07 for exactly the opposite everywhere else — *"when i buy
      something i dont want it to place it for me"* — and that still stands.
      The first five minutes are the exception: a café that looks arranged when
      the guide leaves is worth more than a lesson in dragging, and the player
      drags four more times anyway.
    - **Keyed on the `buy-*` task as well as the `place-*` one.** The ghost
      appears the moment a piece is bought, which is *before* the guide advances
      to "now put it down" — keying only the place step would have suggested
      nothing at the one moment it is needed.
    - **Mal was never actually blocking anything**; she is not a placement
      obstacle. But a person standing on the square you are being asked to drag
      furniture onto reads as blocked, and reading as blocked is the same as
      being blocked. Both spots are now held 1.9+ units clear of `GUIDE_SPOT`,
      and a test says so.
  - **Two false alarms while verifying, both mine.** `nearestValidSpot` came
    back `null` for everything, which looked like the placement work from
    yesterday had broken — it was the harness calling `beginPlacing` before the
    room had rebuilt with the new instance, so there was no piece in hand at
    all (the UI has a retry for this; my driver did not). Then the new test
    reported the armchair could not go at its own authored position: `fits`
    passed no `id`, so the chair was colliding with itself. **Both were the
    test being wrong about the game, which is the failure mode to expect when
    the game is the thing that was just changed.**
- *2026-08-27, evening* — **The till becomes a thing you can point at, and the
  walkthrough loses a step's worth of cleverness.**
  - **"the till is a real object that can be upgraded and tapped on to collect
    and is visible."** Three asks, and only one of them was missing anything:
    `ComputerCashier_A` has stood on that counter since the room was rebuilt
    from the reference render. It was visible the whole time and **nothing ever
    said it was the till**, which is the same as it not being one.
    - **A marker, not a raycast on the mesh.** The cashier is 0.59 × 0.19 seen
      from across the room; `furniture-mover.ts` already documents why a thumb
      cannot be asked to hit something that size. The marker anchors *on* the
      object, which reads as tapping the till without demanding the precision.
    - **The HUD chip stays.** It is the readout and the way to collect when the
      camera is elsewhere. Replacing a working control with a prettier one that
      only works sometimes is not an upgrade.
    - **It prompts at a quarter full where the tip jar waits for the brim**,
      and the asymmetry is deliberate: a jar you can empty at any level teaches
      constant tapping for pennies, while a *till* only worth emptying when
      full means the player has been wasting the capacity they paid to raise.
  - **The upgrade now changes the object, and that was the interesting part.**
    Measured first: all five `ComputerCashier_*` are the same 324 vertices and
    the same 0.59 × 0.49 × 0.19, differing only in which atlas cells they
    sample — so they are **finishes, not bigger machines**. Same situation as
    yesterday's wall pieces. Modest, and worth taking anyway: §8 requires a
    purchase to be *visible*, the retired "cosy touches" upgrade died precisely
    for moving a hidden number, and `till` was the last lever in the game still
    doing exactly that.
  - **`buildCafeRoom` became an options object rather than take a seventh
    positional argument.** Six slices of the save, all optional, three of them
    arrays — a mis-ordered call would have type-checked and quietly built the
    wrong café.
  - **A live label needs identity and content separated.** `WorldMarker.set`
    returned early whenever the mark's `id` matched, which is right for the
    arrival animation and the badge SVG and wrong for a number that climbs
    while you watch: the pill offered £640 long after there was £900 in the
    drawer. It updates the label on a string compare now, so it writes only
    when the pounds tick over. **Every marker before this one had a fixed
    phrase, which is why the guard looked complete.**
  - **Three tutorial changes, all Ellis's.** *"id prefer to learn to place
    furniture before learning about the custom coffee thing"* — right, and the
    reason is worth writing down: buy-and-place is the *verb* of this game and
    inventing a blend is an aside in a panel, so the introduction should hand
    over the thing they will do a hundred times before the thing they will do
    four times. It also makes the halves rhyme, since the cat bed just taught
    the same pair of steps.
  - *"that's going straight on the board … sounds weird it should just be on
    the menu."* A step too clever: there *is* a chalkboard on the wall, so the
    line read as a reference to a thing — except the board is a décor item you
    may not own, the drink never appears on it, and the player has just been
    told the word "menu" twice. **Say the word they already know.**
  - *"remove the option to watch tutorial repeatably."* The settings row is
    gone; `replayTutorial` survives on `window.__mallow`, which
    `import.meta.env.DEV` drops from the shipped app. §17's rule that a
    first-run feature needs a second-run door still holds — a dev handle is
    still a door, and deleting the mechanism would have made the walkthrough
    testable only by wiping a save.
- *2026-08-27, later* — **Guests juddering at the counter: a phase test that
  was false in two different situations.**
  - Ellis: *"character went up to desk, went to talk off agai and start
    spasming out glitching cant get out for ages super jittery crazy."*
    Reproduced in the running game before touching anything, by exposing the
    visitor manager and logging every leg change: **each guest flipped
    `in` ↔ `toSeat` about twenty times a second for the whole seven seconds
    they should have been sitting.** Nobody ever sat down; they vibrated at the
    counter until their leave timer fired, which is the *"cant get out for
    ages"*.
  - **The cause is one predicate answering a subtly different question.**
    `arrived(leg)` was `walk.leg === leg && travelled >= total` — *are they on
    this leg and finished with it* — and that is false in **two** unrelated
    situations: before the leg is done, and after the walk has moved past it.
    `positionVisitor` asks in order, so the instant a guest started the walk to
    their chair, the earlier `arrived("in")` went false again, the walk-in
    branch re-fired, and `stride` reset them to the top of the in-route. Next
    frame the same thing happened the other way round. **Order the phases and
    treat one left behind as complete** (`legReached`).
  - **The spasm specifically is `character.walk()` on every leg change.** That
    call is right — it was added on 2026-08-26 so nobody slides across the room
    in an idle pose — but at twenty leg changes a second it restarts the clip
    from frame 0 twenty times a second. *A correct action on a wrongly-firing
    trigger looks like a rendering bug.*
  - **Introduced by the "walk at a speed" change the day before.** Legs used to
    be driven by timestamps; per-leg travelled distance is new state, and the
    predicate over it was written for the happy path only. The fix is four
    lines and the test that catches it is one assertion —
    `legReached(walk("toSeat", 0), "in", 5)` — which is worth noting, because
    the *diagnosis* took a live reproduction and the fix took a minute.
  - **`visitorManager` is on `window.__mallow` now.** The whole delay was that
    a per-frame state machine had no handle on it from outside: "the character
    is spasming" could not become "it is flipping between two legs" without
    adding an export first. §17 has asked for this for anything state-based
    since the project started.
  - Pinned by `entities/visitor-walk.test.ts`, including a frame-by-frame run
    of the phase order asserting it **settles** — two leg changes per visit, not
    a hundred and forty. Confirmed failing against the old predicate before
    being kept.
- *2026-08-27* — **Mal comes back, and the game writes its own soundtrack.**
  - **The anniversary guide is deleted rather than switched off.** Ellis: *"put
    the old tutorial back, no more anniversary stuff."* `ANNIVERSARY` was built
    in August precisely so the revert would be one boolean, and "no more" is
    stronger than "off" — a dead branch in a data file is something every
    future reader has to work out is dead. 208 lines out; the build itself
    survives in the history and in the 2026-08-22 entry, which is where a
    keepsake belongs.
  - **The brief was "i cant find a single ost i like on those marketplace
    sites", and the useful reading of it was *stop shopping*.** Every
    marketplace OST is a fixed two minutes, which in a game people leave
    running gets recognised, then resented, then muted — and it arrives with a
    licence and somebody else's taste. So the music is generated
    (`audio/music.ts`): five four-bar progressions, an electric piano, a bass
    and a melody, in a generated room.
    - **It must not repeat *and* it must not noodle**, which are two different
      failures. The thing that resolves them is one line: the melody picks from
      the **nearest three** notes to the one before it rather than freely from
      the chord. Free choice is a random walk and sounds like somebody warming
      up; nearest-neighbour is a *line*.
    - **Rhythm is where randomness is heard first.** Wrong pitches sound like a
      choice, wrong rhythm sounds like a mistake — so the figures are a fixed
      handful and only the pitches are generated.
    - **No drums**, deliberately, and against the obvious reference. Cosy game
      music means lo-fi hip hop to most people, and that is a beat; a beat is a
      pulse you cannot stop noticing. Exactly the coin-chime argument (§10):
      fine for a minute, a nag for an hour.
  - **The note saying a synthesised meow was worse than silence was wrong, and
    interestingly wrong.** It generalised from the purr — three failures at
    shaping noise into an animal — without noticing that the two sounds are
    made completely differently. **A purr is unvoiced; a meow is not.** A meow
    has a pitch, so it is a buzzing source shaped by a resonant tube, which is
    an oscillator into three bandpass filters. The synthesis matches the
    anatomy and it works almost immediately.
    - What makes it a cat rather than a kazoo: the vowel *moves* (a meow is a
      journey between three vowels and the journey is what is recognised), the
      pitch arcs, and it **starts closed** — drop the `m` and it is a bird.
    - A chirrup is the same machine with a rising pitch and a trill, and the
      trill has to ride on **gain**, not frequency, or it is a siren.
  - **The real unlock was building `tools/render-audio.mjs` first.** This
    project leans on `tools/shot.mjs` constantly because a WebGL regression is
    invisible to tests — and audio had *no* equivalent at all, which is exactly
    how a diesel-engine purr shipped twice and how an impossibility claim stood
    for weeks. Nobody had heard either. The tool drives headless Chrome the
    same way, renders into an `OfflineAudioContext`, encodes a WAV in the page
    and pulls it back in 4 MB slices.
    - **Supporting it cost one option.** An offline context renders faster than
      real time and its clock only advances *during* the render, so a
      look-ahead scheduler on `setInterval` emits one bar and then silence.
      `offlineSeconds` schedules the whole span up front; the live path is the
      same function with a moving horizon.
    - **And it immediately found what reasoning had not: the levels were
      wrong.** The meow's figure of 0.16 measured out at a peak of **0.08 —
      quieter than a UI button tap** — because three bandpasses at Q 7 throw
      most of a sawtooth away. The chirrup was quieter still and fell below the
      detector entirely. **A gain constant upstream of heavy filtering cannot
      be reasoned about**; it has to be measured. 0.42 and 0.52 now, landing at
      0.15–0.21, alongside the music's 0.25 peaks.
    - Also measured rather than assumed: the meow's f0 arcs 387→445→377 Hz and
      F1 opens and closes 759→894→758, which is the designed shape confirmed
      out of the rendered file rather than out of the source.
  - The ambient bed dropped 0.16 → 0.09. It used to *be* the soundtrack; it is
    a floor under one now, and two things in the same quiet register is mud.
- *2026-08-26, later* — **A chair that vanished overnight, a walkway drawn as a
  circle, and the woodwork gets a colour.**
  - **The disappearing chair was the save deleting it, and the filter had been
    wrong for nine days.** Ellis: *"i noticed a chair i bought randomly
    dissapeared one time after relogging back onto the game a few hrs later."*
    `sanitizeInstances` in `state/save.ts` carried the line
    `if (item.item !== CAT_BED_ITEM) continue;` — written when the cat bed was
    the only thing that *had* instances, and never widened when `buyCopy`
    arrived and let any shop item be bought twice. **Every second chair, second
    table and second plant survived the session it was bought in and was binned
    by the next load.** The rule it was *meant* to express — drop an instance
    of a retired catalogue item — is `!shopItem(id)`, which is exactly what the
    line eight rows above it does for `purchased`. The file already knew the
    right answer.
    - Two things about the shape of it. **A whitelist naming one id is a filter
      that will be wrong the first time there are two**, and it will be wrong
      *silently*: nothing threw, nothing logged, and the café that came back
      was a perfectly valid café. That is the save path's standing failure mode
      (§8) and it is why the fix comes with a test that puts four instances in
      and expects three named ones back.
  - **The walkway rule measured a circle round a rectangle.** Ellis: *"the
    pathway that people walk through making objects unplacable can be
    innacruate or random like i cant place a furniture somewhere they nobody
    even needs to walk."* `blocksRoute` took the half-**diagonal** of the axis-
    aligned bounds as a radius and added the guests' clearance on top, so the
    1.16 × 1.02 cat climber carried a 1.11-unit disc in a room four metres
    across — and turning a piece 45° grew its no-go zone by a third without
    changing the piece. Now an exact oriented-rectangle-to-segment distance
    (`rectToSegment`): two slab tests in the rectangle's own frame, then six
    vertex/edge candidates, which is exhaustive for two convex shapes. Measured
    over the floor at 0.05: a turned low table went from 40.1% of the floor
    refused to 31.7%, the climber 47.4% → 37.8%.
  - **And then the tuning that looked obvious was measured and rejected.** The
    remaining 30% looks like `routeClearance: 0.34` being generous, so I swept
    it: 0.34 → 0.20 buys between 1% and 3% of the floor. The cost is the
    corridor's *length* in a small room, not its width, and 0.2 is under a
    guest's own half-width. **Left at 0.34** — the useful output of a sweep is
    sometimes "don't touch this".
  - **So the real fix for "random" was to draw it.** The route is now a soft
    warm ribbon on the floor while a piece is in flight, beside the grid and
    for the same reason the grid exists: a constraint you can watch yourself
    approach stops being arbitrary. Shown only for pieces the rule applies to —
    a seat may stand on the route, a rug is walked over.
    - **It rendered as nothing at first, at `y = 0.008`.** §9 has said since
      2026-08-01 that the composer's depth buffer is low-precision and 0.005 of
      clearance is under one depth step at this camera distance; the grid has
      sat at 0.012 ever since for that reason and I put the ribbon *under* it.
      `visible: true`, correct geometry, invisible. It is at 0.016 with a lower
      `renderOrder` now, which puts the blocks back on top without asking the
      depth buffer for anything.
    - **A flat band still did not read**, because it is a warm overlay on warm
      floorboards. It has a bright centre line fading to nothing at the edges,
      which is legible *and* honest: the true limit depends on the size of the
      piece in your hand, so a hard edge would be a promise the rule does not
      make.
  - **Furniture could be sunk into walls because the overhang allowance is a
    proportion.** `OVERHANG` forgives a quarter of a piece's half-extent past
    the floor's edge — 0.12 for a cushion, which is what it was written for
    (the reference render hangs one over the lip of the slab), and 0.29 for the
    cat climber, which walks it into 0.30 of plaster. **A wall has no lip to
    hang over**, so the real corners now have to respect any edge that has a
    wall on it, while the open edges keep the allowance exactly as before.
    Same family as `NESTLE` in the previous session: an absolute tolerance
    applied to things that vary in scale.
    - **Measured rather than assumed, and the measurement was the good news.**
      Dumping the wall meshes' inner face by height band: *at furniture height
      every wall in every style sits at 0.05 inside the tile edge.* The window
      wall's famous 0.68 thickness is the **sill ledge**, which does not start
      until y ≈ 0.6. So the side table at z −1.96 and the climber at −1.93,
      both authored to tuck under that ledge on purpose, still go back exactly
      where the layout puts them, and the strictest rule that admits them still
      keeps a piece out of the plaster.
  - **The floor under every wall piece was dead ground, and the asymmetry was
    the tell.** The hanging branch of `checkPlacement` has always said a wall
    piece only clashes with other wall pieces. Nothing said the converse — so
    the menu board, the two shelves and the hanging shelf, all above y 1.2, were
    solid obstacles at floor level and you could not put a chair beneath them.
    Ellis: *"i cant place stuff in blank spots."* **When a rule holds in one
    direction and not the other, that is usually not a design decision.**
  - **The way to a seat was measured against the counter's bounding box.** The
    counter is authored on the diagonal, so its AABB reaches across most of the
    room, and any chair inside it reported "no way to reach that seat". It
    samples the real rectangle now — the same fault the collision test had
    before `Turned` existed, left behind in the one check that does not go
    through `overlaps`.
  - **Wall pieces have colourways at last, as tints.** §0 has carried "wall
    pieces have no colourways" for a fortnight because the pack has no twins to
    swap: `Shelf_A/B/C_Plank` are the same plank with different jars on it, and
    the menu board ships once. So `CustomisationOption.tint` — a colour
    multiplied over the atlas — with the board and both shelves under one slot
    (`wallWood`) and one category, "the woodwork", because a café whose board
    and shelves disagreed would look like a mistake.
    - **A tint-only slot must have no row in `chosenAssets`.** One slot covers
      three different meshes; naming an asset there would turn all three into
      it. `assetFor` already falls through to the layout's own asset when a
      slot is missing, which is precisely the behaviour wanted — but `copyAsset`
      did *not* fall through, and would have built a second menu board out of
      `undefined`.
    - **Subtle is a rule, not a judgement.** Ellis: *"only a few subtle colour
      changes nothing crazy or itll look weird with the textures and stuff."*
      A test holds every tint above 0.45 on each channel and 0.55 in luminance,
      so a tint can shift the finish but can neither crush a hue out of the
      wood grain nor darken the chalkboard past reading. Four options, three of
      them paid, £120–£300.
    - **One material per colour, cached.** The obvious implementation clones per
      object; the room is rebuilt on every purchase, so that is a pile of
      unreferenced materials and a broken batch. Same inversion as the face
      atlas (§9): share what is expensive, vary what is not.
- *2026-08-26, cleanup* — **Three bugs, two of them mine from earlier today,
  and all three the same shape: a second copy of the truth.**
  - **`SEAT_STAND_POSITIONS` was a hand-written twin of `seatStandPositions()`**
    and drifted the moment `SEAT_SIT_BACK` landed — the function applied the
    sit-back offset, the constant did not. `VisitorManager` defaults to the
    constant and `setSeats` was gated on "did furniture move", so **a fresh
    café never called it at all**: the seating fix was invisible on every load
    until you dragged something. The constant is derived from the function now
    and the call is unconditional. **A constant that restates a function is a
    bug waiting for the function to change.**
    Moving it also produced the **third TDZ** in this project — it reads
    `SEAT_FACINGS` and `SEAT_KINDS`, so it has to be declared below them. A
    `const` is not hoisted; only the function is.
  - **The `settlePurchase` safety net fired after the save it was protecting.**
    Listeners on one event run in registration order, and `initAutosave`
    registers its `pagehide` save near the top of `bootstrap()` while mine was
    500 lines below — so the save wrote "owns the armchair, has not paid" and
    the settle ran into the void. It is registered before the autosave now, and
    also on `visibilitychange`, which is the event that actually fires when an
    iOS app is backgrounded (§0, 2026-08-05 — the same one that hid the
    never-firing autosave for the whole life of the project).
    Measured: backgrounding mid-placement now goes £40 → £5 *then* saves £5.
  - **The cat labels were being drawn over the character creator**, a gap §0
    had carried since 2026-08-17 with the note "one line to suppress". It is
    that line: `sync` is passed no cats while onboarding is up, which removes
    them rather than hiding them so nothing is stranded if it is abandoned.
  - Also: §0 claimed save v23 when the code was at v24 (and the previous commit
    message said v25, which was simply wrong), and `tipsFraction` was exported
    and never used. Both corrected — **the migration list is the one piece of
    documentation in this file that a wrong number can cost somebody their
    cats.**
- *2026-08-26* — **The till, and five other things Ellis found by playing it.**
  - **The till replaces the ceiling on money, and the swap is the whole idea.**
    Ellis: *"lets make a till feature that collects up to 1k at first and this
    is where all the money goes, u tap to collect to ur bank account. that way
    u cant just go offline for 4 days and come back to being rich. the limit
    for money is 9999 which it shouldnt be there should be no limit."* Both
    designs stop a café hoarding for ever; they cap different things. The old
    £9,999 ceiling capped **how much you could own** — a wall, and a strange
    one, since a café doing well was told to stop. The till caps **how much
    piles up uncollected**, so what is bounded is the reward for being absent.
    Measured in the sim: an AFK player's thirty-day offline take fell from
    £33,138 to £7,000, and a devoted player's share of income earned *while
    present* rose from 22% to 61%. That number is the mechanic working.
  - **The pieces that make it safe** rather than merely capped: a full till
    stops taking money and never loses any (pillar 1 — nothing decays, nothing
    is taken); collecting **floors** the amount and keeps the remainder, because
    it accrues fractions of a penny per frame and rounding either way is a
    silent theft or a silent mint; chores pay straight to the bank, since a full
    drawer must not swallow a reward for work the player *did*; and tips stay
    the player's own money, so the jar is never blocked by the café's takings.
  - **A capacity upgrade, and the §8 rule it had to pass.** "Check it isn't
    better expressed as something the player can put down and look at" is what
    emptied the upgrade table — and `till` gets through because a bigger till is
    a **capacity**, and every item the shop sells grants appeal, which is a
    rate. If a second register ever exists as furniture, this lever should die
    the way `seating` and `decor` did.
  - **45° rotation was blocked by a comment, not by the code.** The mover's
    note argued that quarter turns "keep the collision box honest — at 90° the
    footprint is the original with x and z swapped, which is exact, where an
    arbitrary angle would need a rotated hull". **The rotated hull has been
    there since the day the validator was written** — `turnedBox`, `cornersOf`
    and a separating-axis test, built precisely because half the café is
    authored on the diagonal. The constraint was true of a design that was
    never built, and it had been quoted as fact ever since.
  - **Two small pieces could be stacked, and the reason was a constant that
    was right for big furniture.** `NESTLE` is subtracted from two pieces'
    *combined* reach, so 0.3 is "a shared edge forgiven" between a table and a
    chair and "most of the piece" between two cat beds. Hence Ellis's *"ive
    seen characters sitting on a cat bed on top of a cat"*: the bed went down
    on the cushion, the guest sat where the cushion is, the cat sat in the bed.
    The allowance is now capped by the smallest half-extent in the pair, and
    **both ends of the range pick the factor**: a unit-square piece has to keep
    the full 0.3 or the side table stops nestling into the armchair and the
    authored café cannot be rebuilt by hand.
  - **Guests were on a timetable, not a speed** — the cause of *both* halves of
    *"sometimes they walk super fast or move fast without the walk animation
    playing."* Every leg was a fixed duration over a variable distance:
    measured on the home tile alone, counter→seat was 840 ms whether the seat
    was 0.25 units away (0.29 u/s) or 2.28 (**2.71 u/s**) — a ninefold spread
    inside one small room, before expansion moves the door and makes it worse.
    They now walk at 1.9 u/s and **the schedule waits for them**: they sit when
    they arrive. The missing walk clip was the same bug wearing a different
    coat — the clip was restored by deleting an id from a bookkeeping `Set` and
    acting on whether that returned true, so a guest who never made it into the
    set slid across the café in an idle pose. It is started on every leg
    change, from one place, unconditionally.
  - **A guest whose chair is sold gets up.** `seatPositions` returns a position
    for all five authored seats whether the café owns them or not, so a sold
    seat left its occupant sitting in mid-air — *"just on the floor before..
    should never happen."* They leave rather than being teleported to a spare:
    standing up and walking out is a thing a person does.
  - **Customers carried cake nobody sold them.** The held prop was a straight
    hash over the whole character pack, so a café that had bought one chair had
    people walking out with cupcakes and milkshakes. It is gated on the cake
    display and the tray of treats — *shop items, not a levelled upgrade*,
    because §8 says check whether a lever is better expressed as something you
    put down, and here the furniture already exists and depicts the exact thing
    being sold.
  - **Selling furniture**, at half back, newest copy first — so buy-then-sell
    is a loss at every step of the copy curve. **A bed with a cat in it and no
    spare is refused**: `catPositions` would stack the homeless cat on another
    one, and "never lose a player's cats" covers where they sleep. No XP is
    clawed back, unlike `undoPurchase`, because a sale already costs half the
    price and demoting somebody's level is a promise `data/progression.ts`
    makes not to break.
  - The welcome gift went 1,000 → **500**: at a thousand it covered a bed and a
    cat four times over (£898 to the fourth cat), so the walkthrough ended with
    most of the collection ladder already affordable — and collection is the
    hook. Ellis: *"its just way too slow. but fine lets call it 500."*
- *2026-08-23* — **The walkthrough could not be walked twice, and the way out
  of a stuck step was to start it again.**
  - Ellis: *"i think theres a bug if you press the walk me through tutorial
    thing again where it gets stuck in an infinite loop of buying and adopting
    a new cat over and over."* Driving a replay headlessly (`tools/shot.mjs
    --js`, a script that plays each step through the store and logs the guide's
    line index) showed the loop is not a loop in the code at all. **The
    walkthrough dead-ends on "pick a flavour" with £22 in the till**, and the
    only door out of a step that never completes is the settings row that
    starts the whole tour again — which buys another bed and adopts another cat
    every time round. The player's "infinite loop" is the game's dead end seen
    from the outside.
  - **The cause is that a baseline turns every step into "buy one *more*".**
    That design is right and it is why a replay works at all (§8) — but the
    *prices* were written for a first morning. `taskCost` returned 0 for "pick
    a flavour" because the first add-in is on the house, and `item.price` for
    the armchair because nobody had one. On a second run the next add-in is £90
    and the next armchair is a copy at 1.45×, so the till was topped up to zero
    for both. **A step that is free the first time is not free the second
    time**, and the free-looking steps are exactly the ones nobody thinks to
    price.
  - **Two steps cannot be done at any price**, which is a different failure
    again: the menu holds four blends, and the shelf runs out of add-ins the
    café's level allows. A task line deliberately cannot be tapped past
    (`advance` refuses, so the one gesture the player knows can't skip the
    lesson) — so waiting on one of these traps them for good, with the arrow
    still pulsing at a panel that will not help. `taskPossible` says whether a
    step is reachable and the guide **talks past** an unreachable one: she says
    her line, and a tap moves on like any other.
  - **`skip()` exists on the guide and nothing has ever called it.** That is
    what made the dead end total. Not wired in this pass — where an escape sits
    and what it says is Ellis's call — but it is the reason a single stuck step
    became "restart the tour", and it is worth knowing the safety net is
    decorative.
  - **A parting gift of $1,000, and the interesting part is where it hangs.**
    Ellis: *"i want to gift the player 1000$ to get started at the end of the
    tutorial."* It rides on `store.finishTutorial`, which is already a one-shot
    guarded by `player.tutorialDone` — and that only stays a one-shot because
    **`replayTutorial` no longer clears the flag**. Clearing it was how a replay
    used to get past `startTutorial`'s guard, and it made a tour
    indistinguishable from a first day to everything downstream: `openedAt` was
    restamped (every chore's clock restarted) and, once there was money to hand
    out, the settings panel would have been a £1,000 button with a walkthrough
    attached. `startTutorial(force)` says the thing that is actually true.
    Falling out of that: `tutorialDone` could no longer stand in for "the guide
    is on screen", so the chore marker's suppression is its own flag now
    (`ui.setGuideTalking`).
  - It is a real dent in §8's pacing rule — the walkthrough tops the till up to
    *exactly* what each step costs precisely so it cannot spend the early game
    — and it is Ellis's call, made knowingly. `ECONOMY_CONFIG.welcomeGift` says
    so where a future rebalance will read it.
  - Also: **money that arrives silently reads as a bug**, so she says a line
    about it (in both scripts) and it flies out of the doorway as a coin
    floater when she goes.
- *2026-08-22* — **The anniversary build: Ellis shows her round, and says
  something first.**
  - The game is a present for Ellis's girlfriend and it is their anniversary,
    so for one build the guide is *him*: male, fair, medium-length blond, and
    the walkthrough opens with four lines of message before a word about cat
    beds. Heart eyes throughout them (`expression: "love"`, which is the
    pack's cycling `Hearts1–4`).
  - **Mal is not edited over; she is left whole and a flag chooses.**
    `data/tutorial.ts` now holds `MAL_*` and `ELLIS_*` side by side, and the
    three names anything else imports — `TUTORIAL_SCRIPT`, `GUIDE_APPEARANCE`,
    `GUIDE_NAME` — are derived from one `const ANNIVERSARY = true`. Putting her
    back is a boolean. The alternative (rewriting the script in place) would
    have made the revert an archaeology job on a file whose lines are the
    game's voice.
  - **The look was measured, not guessed** — the same discipline §9 demands of
    lighting, and it took about a minute. Sampling the pack's palette PNGs gives
    `Skintone_1` as the fair one (226,183,157) and `Haircolour_02` as the
    natural blond (209,165,101) where `Haircolour_01` is nearly platinum; a
    Blender pass over the hair meshes' z-extents picks `Hair_SideSweep` as the
    medium one (0.793, against `Hair_Short`'s 0.804 and `Hair_Long`'s 0.613)
    with the largest front-to-back spread of the short styles, which is what
    makes it read swept rather than cropped.
  - **The settings row was still naming Mal in a string literal.** Nothing
    imports `GUIDE_NAME` — it was declared and never read, so a swap of who
    shows you round left "mal comes back and walks you through the place" in
    the settings panel. It reads the constant now. *An exported constant that
    nothing imports is a promise the codebase has not actually made.*
  - Verified by driving a fresh café through character creation headlessly
    (`tools/shot.mjs --js`, a new Chrome profile each run, so localStorage is
    empty and onboarding really appears) and photographing him mid-line: fair,
    blond, hearts for eyes, the long second line wrapping and typing out.
- *2026-08-18, later* — **Sound on silent, third attempt: the category was
  right and nothing was applying it.**
  - Ellis: *"i want all the volume to work even when phone is on silent"* —
    and sound *does* return with the ringer on, so this was only ever the audio
    session. `.playback` had been set in `AppDelegate` since 2026-08-25 and did
    not work, which is the interesting part: **the documented fix was already
    in the file.**
  - **`applicationDidBecomeActive` is never called in this app.** `Info.plist`
    carries a `UIApplicationSceneManifest`, so the application-level activation
    callbacks are dead code and the scene's are what run. I had just put a
    re-assert there; it compiled, read correctly, and would have done nothing.
    Moved to `SceneDelegate.sceneDidBecomeActive`. **A lifecycle method that is
    never invoked looks exactly like one that is** — check the manifest before
    trusting either family.
  - **The likely root cause is that WebKit picks its own category.** A
    WKWebView renders in its own process and chooses an audio session to suit
    what the page appears to be doing; a page that only ever uses WebAudio,
    with no media element anywhere, does not read as media playback, so
    WebKit's choice overrides the app's and the ringer switch wins.
    `keepMediaSessionAwake()` plays a **silent one-second WAV through a real
    `<audio>` element, looping for ever**, which puts the page in the
    media-playback bucket so the app's `.playback` applies to everything.
    Content silent, volume 1 — WebKit is watching whether the element plays,
    not whether it is audible.
  - **The WAV is generated, not shipped.** §10's premise is that there is
    nothing to download, and a 44-byte header plus a run of zeros does not get
    to be the first asset that breaks it. Verified by decoding the bytes back:
    1 channel, 1.000 s, peak amplitude exactly 0.
  - `.mixWithOthers` dropped as well — a session that declares itself mixable
    is asking to be treated as secondary audio, and Ellis wants audible over
    polite. The cost is that the game now stops the player's music, so if this
    works, the next experiment is putting the option back.
  - **Verified: nothing but the phone can verify this.** Both halves are
    invisible to the web build and to every test, which is the same family as
    the never-firing autosave (2026-08-05) and the ringer switch itself
    (2026-08-25). Recorded in §0 as unverified rather than fixed.
- *2026-08-18* — **A job now needs the thing it is about, and the obvious way
  to do that is an exploit.**
  - The gap found while looking at the new markers yesterday: the `tables`
    chore came due in a café that had never bought a table, so the marker
    pointed at bare floor and the minigame rendered furniture that was not in
    the room. `ChoreNeeds` in `data/chores.ts` — the table job wants the
    `low-table` shop item, the window job wants at least one pane of glass
    (builder mode can brick a window back up), and the sweep wants nothing,
    because floorboards are the one thing every café has.
  - **An unavailable job pays nothing, and getting that backwards would have
    inverted the whole system.** The obvious reading — "fresh means not due" —
    quietly pays for a chore that can never come due, so **not owning a table
    would have earned more than owning one and letting it get crumby**. That is
    the one direction a mechanic built to be upside-only must never run.
    `choreAppeal` skips an unavailable job outright; a test pins that a bare
    café scores *below* a stocked one with the same log.
  - **Buying the table must not be met by an instant demand to clean it.** The
    chore's clock had been running since `openedAt` against a table that did
    not exist, so the purchase and the nag arrived together. `acquireSubjects`
    gives a newly arrived subject its first grace period — the same courtesy
    `FIRST_DUE_MS` extends to a brand-new café, applied to a brand-new table.
  - **And that stamp is an exploit unless it fires exactly once.** A stamp is
    *indistinguishable from a completion*: it makes the chore fresh, and fresh
    chores pay appeal. Removing a window refunds in full, so "restamp whenever
    the subject reappears" meant two taps in builder mode collected the
    window's 0.6 appeal every four hours for ever, without wiping anything.
    It only stamps a job that has **never been done** — once a chore has a
    schedule, losing and regaining its subject does not restart it. Caught by
    asking "what does this reward, and can it be reached without the work?"
    rather than by a failing test, which is the kind of thing only the question
    finds.
  - Verified by driving the real store: bare café at 24h offers `window` and
    `sweep` and never `tables`; bricking the glass up removes the window job;
    re-glazing leaves it **due**, not fresh; buying the low table stamps it and
    it falls due 360 min later, exactly its 6h interval.
- *2026-08-17, later* — **Every job wears its own little painting of itself.**
  - Ellis: *"the wipe floor, table, window need unique icons foreach and appear
    in better spot not in the way of stuff and look more colourful like show
    the object that needs cleaning in the icon beautifully."* All three markers
    wore the same sparkle, which said "something needs doing, somewhere" — and
    that is **exactly the fault putting the marker on the object was meant to
    cure** (2026-08-26), reintroduced one level up. `ui/chore-art.ts` draws a
    pane of glass, a café table and a patch of floorboards, plus a jar for the
    tips marker.
  - **These carry real colour, and it is a deliberate exception to §9.** The
    icon rules — solid silhouettes, `currentColor` only — exist so one icon
    works on a slate chip and on the honey button. These are *portraits of
    furniture*, the same exception `ui/cat-face.ts` takes: a colourless pane of
    glass is a rounded rectangle and a colourless plank is a line. The palette
    is the café's own customisation swatches, so badge and room agree.
  - **Two drawings had to be redone after looking at them at 26px**, which is
    the size they are actually seen at and not the size they are drawn at.
    The table was oak-on-walnut and read as a **doughnut** — a silhouette needs
    something to be a silhouette against, so it sits on plaster now, and the
    cup was raised until it breaks the tabletop's back edge, which is what says
    "object standing on a surface" rather than "hole in the middle". The fur
    tuft's stray hairs were three straight strokes, i.e. a **starburst**; they
    are short curls hugging the body now.
  - **"Above" is the wrong side for a floor job, and that took a screenshot to
    see.** Standing the badge off the anchor with a stem — the map-pin
    arrangement — is the only layout that points at something without covering
    it, so that part was right. But **up the screen means further into the
    room** in an isometric diorama, so a floor marker's pill landed square on
    the counter and the till. The side is chosen from the projected height now,
    with **two thresholds rather than one** because the player can pan and a
    single threshold would flip it every frame.
  - **The sweep anchor was in the middle of the room, which is only clear on
    the plan.** Moved by measurement, not by reading the layout: every floor
    point on a grid was projected *and raycast* against a **fully furnished**
    café, keeping the ones the camera can actually see, then ranked by how low
    on screen they land so the pill has open backdrop beside it. Worth knowing
    for next time — the intersection of "bare boards" and "visible from the
    camera" in a fully-stocked café is **empty**, which is §0's "every square of
    floor is spoken for" showing up as a measurement.
  - `art` is named per chore in `data/chores.ts` rather than keyed off the id,
    so a new job has to *choose* a picture. A test pins that no two chores share
    one, that each draws, that they differ, and that two instances never share
    gradient ids — SVG ids are document-global however deeply nested, and two
    markers can be up at once.
  - **Still open, found while verifying:** the `tables` chore can come due in a
    café that has not bought a table, and its marker then points at bare floor.
    Not touched — it is a gating question about chores, not about icons.
- *2026-08-17* — **Two bugs found by playing it, and both are a count taken
  from the wrong side of a boundary.**
  - **Extending the café did nothing, and the marker was quoting a different
    curve from the till.** Ellis: *"when im in builder and try extend floor
    over where the current doorframe notch in the floor is i can no longer
    extend anywhere it breaks it."* `ui/builder.ts` prices and enables each "+"
    from `expansionCost(ownedPatches)`; `buyTile` charged and gated on
    `state.tiles.length`, which **includes `HOME_TILE`** — so the purchase ran
    one square ahead of the offer: $900/level 3 on the button against
    $1,710/level 5 at the till, then $1,710/level 5 against $3,249/level 7.
    A player between the two levels gets an enabled button that makes its sound
    and does nothing.
    **Neither side was wrong on its own**, which is why nothing caught it —
    both curves are self-consistent and they are only ever compared inside a
    player's finger. `state/expansion-purchase.test.ts` now spans them, and it
    fails four ways against the old code.
  - **I could not reproduce the direction dependence, and said so.** Driving
    the real builder headlessly: both squares build correct floors and wall
    runs (measured piece by piece), both leave every follow-up marker on screen
    and hit-testable with `elementFromPoint`, and the store accepts either. The
    asymmetry Ellis saw is what the level gate looks like from the outside —
    the first square works and the next silently refuses, which reads as "this
    direction is broken" when it is really "the second one is".
  - **Cat beds could be stacked, and every player-placed piece was invisible to
    collision.** Ellis: *"i can place cat beds and some other furniture on top
    of each other so hit boxes not properly working."* `obstacles()` looked its
    piece up in `CAFE_LAYOUT` by index and `continue`d when the lookup missed —
    but a **negative index means two different things** (`cafe-room.ts`):
    generated wall segments at `-1 - n`, which *should* be skipped, and every
    instance at `INSTANCE_INDEX_BASE - n`, which must not be. So the newest
    furniture in the room was the only furniture nothing could collide with.
  - **A missing row is not the same as "not real".** That is the whole bug, and
    the sentinel had no name — `-1000` was a bare literal in `cafe-room.ts` and
    the mover never knew to look for it. It is `INSTANCE_INDEX_BASE`, exported
    from the file that writes it.
  - **The classification came out of the loop.** `obstacleFor(tag, x, z, rotY)`
    is pure and exported, because the fault was invisible to every existing
    test *precisely* because it lived inside a `for` over `THREE.Object3D`s —
    `placement.test.ts` proved the rules were right while nothing proved the
    room's furniture ever reached them. Nine tests now cover the half that had
    none; six fail against the old code.
  - Reading the angle off `child.rotation.y` instead of `placedRotation(item,
    placements)` fell out of the same fix and is strictly better: an instance
    has no layout row to read `rotY` from, and `place()` writes exactly
    `placedRotation(...)` into the mesh, so the object already carries the
    answer for both kinds.
  - Also this session: **the session log moved to `docs/session-log.md`**.
    `CLAUDE.md` was 3,615 lines / 249 KB — ~62k tokens read into context before
    any work starts — and the log was 55% of it. Its durable rules were
    promoted into §8/§9/§10/§13/§14/§16/§17 first; the file is now 2,021 lines.
- *2026-08-26, very last* — **A tip jar, seats people actually sit on, and a
  launch screen with something in it.**
  - **The pack's sit clips are authored against the pack's own furniture**, and
    that is why guests sat off their seats. Every clip keeps its root at the
    origin and gets the pose out of limb rotations (§9), so the *body* lands
    wherever the pack's layout had the chair relative to that root — a
    different offset for a stool, a sofa and a floor cushion. Standing a guest
    at the seat's own coordinates therefore only lands right for one of the
    three. Measured by seating a guest in each and looking: the armchair was
    correct, the stools were most of a seat forward, the cushions slightly.
    `SEAT_SIT_BACK` is per seat *kind* and applied along the guest's facing, so
    it survives the player turning the furniture.
  - **The tip jar** (`data/tips.ts`) — £30, unlocked from the start, on the
    counter. It fills as people pay and opens only when full. Three rules:
    tips are **minted on top** of a payment rather than skimmed from it (a jar
    that took a cut and gave it back later is the same money with an extra step
    and a worse feeling); it **only opens when full**, because a jar you can
    empty at any level teaches people to tap it constantly; and it **stops**
    rather than overflowing, so being away is never punished.
    It is the other half of the chores: a chore asks for a minute of attention,
    the jar asks for nothing and rewards coming back — the D1 and D7 halves of
    §4's gate.
  - **The marker is generalised** (`ui/world-marker.ts`, was `chore-marker`).
    Chores and the jar both want "a sparkle on the thing itself", and both can
    be waiting at once — one shared instance would silently drop the other.
  - **The launch screen has the app's own mark in it**: the cup with the cat's
    face in the foam, steam, and a bar that advances. It was two plain circles,
    which said "loading" but not *what*. The bar is time-based rather than
    progress-based on purpose — there is no honest progress number to report,
    and a fake bar that jumps to 100% and waits is worse than one easing toward
    it.
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
