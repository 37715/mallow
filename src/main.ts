import * as THREE from "three";
import { createScene } from "@/scene/scene";
import { createCameraControls } from "@/scene/camera-controls";
import { findPlaced, pickFurniture, type PickedFurniture } from "@/scene/furniture-picker";
import { createFurnitureEditor } from "@/ui/furniture-editor";
import { createFurnitureMover } from "@/scene/furniture-mover";
import { createShopPreview } from "@/scene/shop-preview";
import { createExpansionPreview } from "@/scene/expansion-preview";
import { createBuilder } from "@/ui/builder";
import { occupiedWalls, wallSegments } from "@/scene/cafe-tiles";
import { createCharacterPreview } from "@/scene/character-preview";
import { createGuidePortrait } from "@/scene/guide-portrait";
import { mountOnboarding, type Onboarding } from "@/ui/onboarding";
import { INTERACTIVE_FPS, TARGET_FPS, startLoop, type GameLoop } from "@/core/loop";
import { gameStore, bootAwayMs, currentCafeStats, setSandbox } from "@/state/store";
import { initAutosave } from "@/state/save";
import { CatManager } from "@/entities/cat-manager";
import { Barista } from "@/entities/barista";
import { VisitorManager } from "@/entities/visitor-manager";
import { DustMotes } from "@/scene/dust";
import { COUNTER_POSITION, doorPositions, seatFacings, seatPositions, seatStandPositions } from "@/scene/room";
import { catHomes } from "@/scene/cat-homes";
import { visitorPayAmount } from "@/data/economy";
import { createChoreWipe } from "@/ui/chore-wipe";
import { CHORES_BY_ID } from "@/data/chores";
import { TIP_JAR_AT, TIP_JAR_ITEM, tipsReady } from "@/data/tips";
import { createChoreSurface } from "@/scene/chore-surface";
import { createWorldMarker } from "@/ui/world-marker";
import { mountUI } from "@/ui/ui";
import { CatLabelLayer, NameTag } from "@/ui/cat-labels";
import { beds } from "@/data/beds";
import { loadCharacterAssets } from "@/entities/character-library";
import { SpeechBubble } from "@/ui/speech-bubble";
import { SPEECH_MS_PER_CHAR, TutorialGuide } from "@/entities/tutorial-guide";
import { FloaterLayer } from "@/ui/floaters";
import { initAnalytics } from "@/analytics/analytics";
import { onGameEvent } from "@/core/events";
import { initAudio, playCoin, playMeow, playPurchase, playPurr, playTap, setMusicMuted } from "@/audio/audio";

async function bootstrap(): Promise<void> {
  const canvas = document.getElementById("scene") as HTMLCanvasElement;
  const uiRoot = document.getElementById("ui-root") as HTMLElement;

  const {
    scene,
    camera,
    render,
    rebuildRoom,
    attachControls,
    getRoomGroup,
    setOverlay,
    setPreviewSharpness,
    setQuality,
    setBackdrop,
    environment,
  } = await createScene(
    canvas,
    gameStore.getState().customisation,
    gameStore.getState().placements,
    gameStore.getState().purchased,
    gameStore.getState().tiles,
    gameStore.getState().player.backdrop,
    gameStore.getState().instances,
    gameStore.getState().windows,
  );

  // Assigned just below, but the camera controls close over it to raise the
  // frame rate during a gesture — and gestures can only happen once the loop
  // is running, so the null window is never observable.
  let loop: GameLoop | null = null;
  let lastBaristaFrame = 0;

  // Rebuild the room when a colourway changes or furniture moves. Both replace
  // the whole group, so they share one path and one pair of watched values.
  let shownCustomisation = gameStore.getState().customisation;
  let shownPlacements = gameStore.getState().placements;
  let shownPurchased = gameStore.getState().purchased;
  let shownTiles = gameStore.getState().tiles;
  let shownInstances = gameStore.getState().instances;
  let shownWindows = gameStore.getState().windows;
  gameStore.subscribe(() => {
    const { customisation, placements, purchased, tiles, instances, windows } =
      gameStore.getState();
    if (
      customisation === shownCustomisation &&
      placements === shownPlacements &&
      purchased === shownPurchased &&
      tiles === shownTiles &&
      instances === shownInstances &&
      windows === shownWindows
    ) {
      return;
    }
    const movedFurniture = placements !== shownPlacements || instances !== shownInstances;
    shownCustomisation = customisation;
    shownPlacements = placements;
    shownPurchased = purchased;
    shownTiles = tiles;
    shownInstances = instances;
    shownWindows = windows;
    void rebuildRoom(customisation, placements, purchased, tiles, instances, windows).then(() => {
      // Three of the four movable pieces are cat spots, so a moved bed has to
      // take its cat with it.
      // Cat spots depend on *both*: where furniture is, and whether it has
      // been bought at all.
      catManager.setSpots(catHomes(gameStore.getState()));
      if (movedFurniture) {
        visitorManager.setSeats(seatStandPositions(placements), seatFacings(placements));
      }
      // The doorway rides the floor's outer edge, so growing the café moves
      // where guests come in — see `doorPositions`.
      const door = doorPositions(tiles);
      visitorManager.setDoor(door.door, door.threshold);
    });
  });
  const catManager = new CatManager(scene);
  catManager.setSpots(catHomes(gameStore.getState()));

  /**
   * Cat homes follow the *cats*, not just the room.
   *
   * They used to be refreshed only when the room was rebuilt, which happens on
   * a furniture or colourway change — so adopting a cat, which changes neither,
   * left the new arrival with no spot at all until something else happened to
   * trigger a rebuild.
   */
  let shownCats = gameStore.getState().cats;
  gameStore.subscribe(() => {
    const { cats } = gameStore.getState();
    if (cats === shownCats) return;
    shownCats = cats;
    catManager.setSpots(catHomes(gameStore.getState()));
  });
  // The player, behind their own counter.
  const barista = new Barista(scene);
  barista.setAppearance(gameStore.getState().player.created ? gameStore.getState().player.appearance : null);
  const visitorManager = new VisitorManager(scene);
  {
    // The café may already be expanded on load, so the door starts where the
    // floor currently reaches rather than where the layout drew it.
    const door = doorPositions(gameStore.getState().tiles);
    visitorManager.setDoor(door.door, door.threshold);
  }
  const dust = new DustMotes(scene);

  const floaters = new FloaterLayer(uiRoot);
  const ui = mountUI(uiRoot);
  const catLabels = new CatLabelLayer(uiRoot);
  const nameTag = new NameTag(uiRoot);
  // Same milliseconds-per-character as the lip sync, or the mouth and the text
  // say different things — see `entities/tutorial-guide.ts`.
  const speech = new SpeechBubble(uiRoot, { msPerChar: SPEECH_MS_PER_CHAR });
  let guide: TutorialGuide | null = null;
  initAutosave(gameStore);
  initAnalytics(() => {
    const { money, cats } = gameStore.getState();
    return { money, catCount: cats.length };
  });

  // --- Juice: coins pop out of the seat a guest just paid at (§10) ---------
  onGameEvent("visitorPaid", ({ seatIndex }) => {
    // **−1 is the counter**: a takeaway pays and leaves without ever having a
    // chair, so the coin pops where the money actually changed hands.
    // Otherwise: live positions, because a coin must pop out of wherever that
    // chair is *now*.
    const seat =
      seatIndex < 0
        ? new THREE.Vector3(COUNTER_POSITION.x, 0.55, COUNTER_POSITION.z)
        : seatPositions(gameStore.getState().placements)[seatIndex];
    if (seat) {
      const stats = currentCafeStats(gameStore.getState());
      const amount = visitorPayAmount(stats.appeal, stats.payMultiplier);
      floaters.spawn(
        new THREE.Vector3(seat.x, seat.y + 0.7, seat.z),
        camera,
        "coin",
        `+$${Math.max(1, Math.round(amount))}`,
      );
    }
    playCoin();
  });

  // --- Placement mode (§8 "The café editor", step 4) -----------------------
  //
  // While a piece is in flight, drags move *it* rather than panning the
  // camera: the ghost follows your finger across the block grid and glows
  // green or red for whether it can go there.
  //
  // **Everything reaches this through the shop.** Press-and-hold used to be
  // the way in, and it is gone — Ellis, 2026-08-10: *"i dont like the hold to
  // edit thing any more id rather everything was in 1 unified super intuitive
  // easy to use clear place - the shop."* Two routes now, both starting from
  // the same panel: buying a piece drops you straight into placing it, and an
  // owned piece has "move it" on its shop page.
  const mover = createFurnitureMover({
    camera,
    scene,
    getRoomGroup,
    onValidity: (ok, message) => furnitureEditor.setMoveValid(ok, message),
  });

  const furnitureEditor = createFurnitureEditor(uiRoot);

  /** True while a drag is carrying the ghost rather than panning the camera. */
  let grabbingPiece = false;
  /** What a press landed on, remembered so the hold can complete on it. */
  let holdCandidate: PickedFurniture | null = null;

  /**
   * What the hold gesture is allowed to grab: furniture and décor only.
   *
   * The floor and the walls are the *building*. A ring charging on them would
   * teach the gesture in the one place it has least to offer, and they are
   * under almost every ray, so they would win most presses.
   */
  const ARCHITECTURE = new Set(["floor", "floorStep", "wallPlain", "wallWindow"]);
  const isEditable = (picked: PickedFurniture): boolean =>
    !ARCHITECTURE.has(picked.tag.slot ?? "") && (picked.category !== null || picked.tag.movable);

  /**
   * Put a piece in flight. Returns false if it isn't in the room yet.
   *
   * `justBought` starts the ghost in the middle of what the player is looking
   * at rather than at the layout's authored spot — Ellis: *"when i buy
   * something i dont want it to place it for me i should be able to choose
   * where it goes."* Right: arriving pre-placed makes the purchase feel
   * finished, and the drag that follows feels like undoing something rather
   * than deciding it.
   */
  function beginPlacing(id: string, justBought = false): boolean {
    const room = getRoomGroup();
    const picked = room ? findPlaced(room, id) : null;
    if (!picked?.tag.id) return false;
    return beginPlacingPiece(picked, justBought);
  }

  /** The half of `beginPlacing` that already has the piece in hand. */
  function beginPlacingPiece(picked: PickedFurniture, justBought = false): boolean {
    if (!picked.tag.id) return false;
    const pieceId = picked.tag.id;

    /**
     * **The bar goes up first.** `mover.begin` evaluates the spot immediately
     * and reports through `onValidity` — and the bar did not exist yet, so
     * that first answer was dropped on the floor and the bar always opened
     * saying "drag it onto a block" no matter what. It is the reason rotation
     * looked broken: the *first* rotate was simply the first result the bar
     * ever received, and it had been wrong from the moment it opened.
     */
    furnitureEditor.showMoveBar(
      () => mover.rotate(),
      () => {
        const at = mover.commit();
        if (at) gameStore.getState().movePiece(pieceId, at.x, at.z, at.rot);
        furnitureEditor.hideMoveBar();
        // **This is the moment money changes hands.** Buying used to debit
        // immediately, so the till dropped for a decision the player had not
        // finished making and cancelling flickered it back up. Now the piece
        // landing is the purchase: the chime, the coins, and the number moving
        // all happen together, where the player is already looking.
        if (justBought && at) {
          const paid = gameStore.getState().settlePurchase();
          if (paid > 0) {
            playPurchase();
            floaters.spawn(
              new THREE.Vector3(at.x, 0.85, at.z),
              camera,
              "coin",
              `-$${Math.round(paid)}`,
            );
          }
        }
      },
      () => {
        mover.cancel();
        furnitureEditor.hideMoveBar();
        // Cancelling a *purchase* undoes the purchase. Cancelling a *move*
        // just puts the piece back — see `undoPurchase`.
        if (justBought) gameStore.getState().undoPurchase(pieceId);
      },
      picked.tag.wall !== true,
    );

    const focus = controls.getPose().target;
    mover.begin(picked, justBought ? { x: focus.x, z: focus.z } : undefined);
    if (justBought) {
      // **Never hand the player something they cannot see.** The camera's focus
      // point is often inside the counter or behind a wall, and a bought piece
      // dropped there is invisible — Ellis: *"i cant even see it anywhere so
      // maybe its hiding behind something which it should never be able to."*
      // Nudge it to the closest spot it actually fits.
      const spot = mover.nearestValidSpot({ x: focus.x, z: focus.z });
      if (spot) mover.dragToPoint(spot);
    }

    /**
     * Put the piece in the middle of the screen and move in a little.
     *
     * A translucent ghost is deliberately quiet, and on a café three squares
     * wide that makes it genuinely hard to spot — so the camera goes to it
     * rather than expecting the player to. Biased up the screen so the move
     * bar at the bottom is not sitting on top of the thing being placed.
     */
    const at = mover.position();
    controls.focusOn(new THREE.Vector3(at.x, 0.35, at.z), 0.24, 0.55);
    return true;
  }

  const controls = createCameraControls({
    canvas,
    camera,
    onInteractionChange: (active) => {
      loop?.setMaxFps(active ? INTERACTIVE_FPS : TARGET_FPS);
    },

    // **A drag moves the piece only if it started *on* the piece.**
    //
    // Every drag used to belong to the ghost while placement was open, which
    // meant the camera froze the moment you bought something — Ellis:
    // *"have no ability to move the camera around like normal. it should do
    // that by default but move the item around if i click and drag on that
    // item."* Right: panning is the default verb everywhere else in the game,
    // and placement mode should not quietly reassign it.
    shouldPan: () => !grabbingPiece,
    onDragStart: (pointer) => {
      grabbingPiece = mover.isActive() && mover.isUnder(pointer);
    },
    onDragMove: (pointer) => {
      if (grabbingPiece) mover.dragTo(pointer);
    },

    /**
     * Press and hold a piece of café to recolour or pick it up.
     *
     * **Only on furniture and décor** — Ellis was specific, and it is the right
     * line: the ring is the affordance, so it must not charge over the floor,
     * the walls, a cat or a guest. `pickFurniture(..., editableOnly)` already
     * prefers the small thing on the big thing and treats architecture as a
     * last resort, so this is a matter of refusing that last resort.
     */
    onHoldStart: (pointer) => {
      if (mover.isActive()) return;
      const room = getRoomGroup();
      const found = room ? pickFurniture(pointer, camera, room) : null;
      holdCandidate = found && isEditable(found) ? found : null;
      furnitureEditor.beginHold(holdCandidate);
    },
    onHoldProgress: (t) => furnitureEditor.setHoldProgress(t, camera),
    onHoldCancel: () => {
      furnitureEditor.cancelHold();
      holdCandidate = null;
    },
    onHoldComplete: () => {
      if (!holdCandidate) return;
      initAudio();
      playTap();
      // Lift the piece clear of the docked tab before it covers the bottom of
      // the screen — the point of editing in place is watching it change.
      controls.focusOn(holdCandidate.anchor, 0.22);
      furnitureEditor.openMenu(holdCandidate, (picked) => {
        if (picked.tag.id) beginPlacingPiece(picked);
      });
      holdCandidate = null;
    },

    onTap: (pointer) => {
      // Browsers only allow audio to start from a user gesture.
      initAudio();
      // A tap dismisses the hold tab first, so it never traps the player —
      // the café is the back button.
      if (furnitureEditor.isMenuOpen()) {
        furnitureEditor.closeMenu();
        playTap();
        return;
      }

      // While placing, a tap on the ghost picks nothing else up — and a tap
      // anywhere else is just a tap, not a teleport. Moving the piece is a
      // drag, deliberately: a stray tap must never fling your sofa across the
      // room with no way back except cancel.
      if (mover.isActive()) return;

      // The guide is talking: a tap fills the line, then moves to the next.
      // It takes the whole screen rather than only their bubble, because
      // "tap anywhere to continue" is the convention and hunting for a small
      // target mid-sentence is the opposite of relaxing.
      if (guide && !guide.done) {
        if (guide.advance(performance.now(), speech.complete, () => speech.reveal(performance.now()))) {
          playTap();
          return;
        }
      }

      const catId = catManager.pick(pointer, camera);
      if (!catId) {
        // Tap yourself and you say hello back. The cats get first refusal —
        // they're the point of the game and they're never behind the counter.
        if (barista.pick(pointer, camera)) {
          playTap();
          // Your own name, over your own head, for a couple of seconds — a
          // reminder rather than a label (see `NameTag`).
          const me = gameStore.getState().player.name;
          if (me) nameTag.show(me, barista.anchor, performance.now());
        }
        return;
      }

      // Both halves matter: the store makes the cat *content* (the mechanic
      // that rewards being present), the manager makes it *look* petted (§10).
      gameStore.getState().petCat(catId);
      catManager.pet(catId, performance.now());
      const position = catManager.worldPositionOf(catId);
      if (position) floaters.burstHearts(position, camera);
      playPurr();
      // Sometimes they answer. Only sometimes: a cat that meows every single
      // time you touch it is a doorbell, and the surprise is the charm. Silent
      // until a recording is dropped in — see `playMeow`.
      if (Math.random() < 0.3) window.setTimeout(playMeow, 260 + Math.random() * 220);
    },
  });
  attachControls(controls);

  // The shop's spinning item, drawn over the finished frame into the hole the
  // panel leaves for it (§8 step 5).
  const shopPreview = createShopPreview(environment);
  ui.attachShopPreview(shopPreview);
  ui.attachPlacer(beginPlacing);
  ui.attachGraphics(setQuality);
  ui.attachBackdrop(setBackdrop);
  setMusicMuted(gameStore.getState().player.musicMuted);
  // Whatever the player last chose, applied before the first frame they see.
  setQuality(gameStore.getState().player.graphics);

  // --- Builder mode: extend, floor, walls (§8 step 6) ----------------------
  const expansionGhosts = createExpansionPreview(scene);
  const refreshGhosts = (on: boolean): void => {
    expansionGhosts.show(on ? gameStore.getState().tiles : null);
    builder.setTiles(on ? expansionGhosts.candidates() : []);
  };
  /**
   * Offer a window on every wall that hasn't got one.
   *
   * Markers sit at head height on the wall itself rather than above its
   * square, because a window is a property of the wall and a marker floating
   * over the floor in front of it would be ambiguous once the café has two
   * runs meeting at a corner.
   */
  const WALL_MARKER_Y = 1.5;
  const refreshWalls = (on: boolean): void => {
    const state = gameStore.getState();
    const busy = occupiedWalls(state.placements, state.purchased, state.instances);
    builder.setWalls(
      on
        ? wallSegments(state.tiles, state.windows).map((wall) => ({
            id: wall.id,
            position: new THREE.Vector3(wall.x, WALL_MARKER_Y, wall.z),
            glazed: wall.glazed,
            blocked: busy.has(wall.id),
          }))
        : [],
    );
  };
  const builder = createBuilder(uiRoot, {
    onDone: () => ui.closeExpander(),
    onBought: () => {
      // A bought square changes what is still buyable, so the offer is rebuilt
      // rather than left showing a ghost that is now floor.
      refreshGhosts(true);
      // A new square can add a wall segment, and can bury an old one inside
      // the café where it is no longer a wall at all.
      refreshWalls(builder.tool() === "walls");
    },
    // The ghosts belong to the extend tool only: translucent squares floating
    // over a floor you are about to recolour would be noise.
    onGlazed: () => refreshWalls(true),
    onToolChange: (tool) => {
      refreshGhosts(tool === "extend");
      refreshWalls(tool === "walls");
    },
  });
  ui.attachExpander((on) => {
    builder.setOpen(on);
    refreshGhosts(on && builder.tool() === "extend");
    refreshWalls(on && builder.tool() === "walls");
    if (on) {
      // Lift the café clear of the tool bar. The room *is* the preview here —
      // you are choosing a floor by looking at the floor — so a bar covering
      // the bottom third of it would defeat the point of putting the tools in
      // the room in the first place.
      // Framed as normal. Lifting the view to clear the tool bar does not
      // work — `clampTarget` holds the target inside the framing box and the
      // bias is discarded — so the "+" markers float above their squares
      // instead (see MARKER_LIFT_PX in ui/builder.ts).
      controls.reset();
    }
  });

  // Character creation, on a first run only (§8 onboarding). It owns the
  // screen while it's up, and its avatar shares the same overlay slot as the
  // shop's furniture — only one of them can be on screen at a time.
  const characterPreview = createCharacterPreview(environment);
  let onboarding: Onboarding | null = null;
  if (!gameStore.getState().player.created) {
    onboarding = mountOnboarding(uiRoot, { swivel: (d) => characterPreview.swivel(d), backdropPicker: (onPick) => ui.backdropPicker(onPick) }, () => {
      onboarding = null;
      characterPreview.setAppearance(null);
      // Straight to work.
      barista.setAppearance(gameStore.getState().player.appearance);
      startTutorial();
    });
    characterPreview.setAppearance(onboarding.appearance());
  }

  /**
   * The guide who shows you round (§0's "story-mode tutorial friend").
   *
   * Runs once, straight after character creation, so they can greet the player
   * by the name they just chose. An existing café never sees it — save v20
   * marks anyone who has already played as done, on the same reasoning as the
   * v11 migration that skipped them past the creator.
   */
  /** Run it again from settings, whatever the save says. */
  function replayTutorial(): void {
    guide?.dispose();
    guide = null;
    const player = gameStore.getState().player;
    gameStore.setState({ player: { ...player, tutorialDone: false } });
    startTutorial();
  }
  ui.attachTutorial(replayTutorial);

  /**
   * Built once and reused, not per playthrough: it holds an assembled
   * character, and "show me round again" from settings would otherwise clone a
   * skinned rig every time it was pressed.
   */
  const guidePortrait = createGuidePortrait(environment);

  function startTutorial(): void {
    const player = gameStore.getState().player;
    if (player.tutorialDone || guide) return;
    guide = new TutorialGuide(
      scene,
      { name: player.name, cafe: player.cafeName },
      {
        say: (text, now) => speech.say(text, now),
        quiet: () => speech.hide(),
        finished: () => {
          gameStore.getState().finishTutorial();
          speech.hide();
          ui.point(null);
          guide?.dispose();
          guide = null;
        },
        // The only bits of the game the walkthrough looks at. Built fresh each
        // time it's asked rather than subscribed to, because it's read once per
        // frame and a stale snapshot is what would make a finished step hang.
        snapshot: () => {
          const s = gameStore.getState();
          return {
            money: s.money,
            beds: beds(s.placements, s.instances).length,
            cats: s.cats.length,
            blends: s.customDrinks.length,
            pieces: s.purchased.length + s.instances.length,
            placements: s.placementsMade,
            ingredients: s.ingredients.length,
          };
        },
        grant: (amount) => gameStore.getState().grantTutorialFunds(amount),
        point: (target) => ui.point(target),
        waiting: (hint) => speech.setWaitHint(hint),
      },
    );
    guide.setMirror(guidePortrait);
  }
  if (!onboarding) startTutorial();

  /**
   * The chores (§8, `data/chores.ts`) — the answer to "the walkthrough ended
   * and there is nothing to do".
   *
   * The camera goes to the café's window first and the muck goes over the
   * whole screen, so what the player wipes clear is their own room. Focusing
   * is what makes "clean the window" read as cleaning *the* window rather than
   * cleaning the screen.
   */
  const choreSurface = createChoreSurface(environment);
  const choreWipe = createChoreWipe(uiRoot, (chore) => {
    // Banked once the overlay is gone, so the appeal chip's own celebration
    // (`celebrate` in `ui.ts`, which pops the number and then the takings a
    // beat later) plays on a HUD the player can actually see. Finishing while
    // a full-screen layer was up meant the one animation that says "this was
    // worth doing" happened behind it.
    gameStore.getState().finishChore(chore.id);
    const seat = seatPositions(gameStore.getState().placements)[0];
    if (seat) {
      floaters.spawn(
        new THREE.Vector3(seat.x, seat.y + 0.9, seat.z),
        camera,
        "coin",
        `+$${chore.pay}`,
      );
    }
    playPurchase();
  });
  /**
   * The marker floats on the job itself and is the only way in — see
   * `ui/chore-marker.ts` for why it is not a row in the HUD.
   */
  const choreMarker = createWorldMarker(uiRoot, (mark) => {
    const chore = CHORES_BY_ID.get(mark.id);
    if (!chore) return;
    playTap();
    choreWipe.start(chore);
  });
  ui.attachChores((chore) =>
    choreMarker.set(chore ? { id: chore.id, label: chore.action, at: chore.at } : null),
  );

  /**
   * The tip jar: a small thing on the counter that fills as people pay, and
   * gives it all back when you tap it (`data/tips.ts`).
   *
   * Its own marker rather than sharing the chore's, because both can be
   * waiting at once and a café that can only ask you for one thing at a time
   * would drop the other silently.
   */
  const tipMarker = createWorldMarker(uiRoot, () => {
    const taken = gameStore.getState().collectTips();
    if (taken <= 0) return;
    playCoin();
    floaters.spawn(
      new THREE.Vector3(TIP_JAR_AT.x, TIP_JAR_AT.y, TIP_JAR_AT.z),
      camera,
      "coin",
      `+$${Math.round(taken)}`,
    );
  });

  setOverlay((renderer, now) => {
    if (onboarding) {
      const rect = onboarding.stageRect();
      // Cheap enough to re-apply each frame, and it keeps the avatar in step
      // with the arrows without threading a change callback through the UI.
      characterPreview.setAppearance(onboarding.appearance());
      setPreviewSharpness(rect !== null);
      if (rect) characterPreview.render(renderer, rect, now);
      return;
    }
    const rect = ui.shopStageRect();
    // The canvas runs at a higher resolution while a preview is up, because a
    // preview can only ever be as sharp as the canvas it lands in (§9).
    setPreviewSharpness(rect !== null);
    if (rect) shopPreview.render(renderer, rect, now);
    // After the shop's own stage, and not instead of it: both are on screen
    // together for most of the walkthrough — she is the one asking them to open
    // the shop. The two rects never overlap, so the order only decides which
    // wins if that ever stops being true.
    // Mal's portrait: render her into the café canvas at exactly the rect her
    // bubble's own canvas occupies, then copy those pixels across. The copy
    // has to happen in this same frame — see `blitPortrait` — and the element
    // sitting over the source region is what hides the render underneath.
    const peek = speech.portraitRect();
    if (peek) {
      guidePortrait.render(renderer, peek, now);
      speech.blitPortrait(renderer.domElement, peek);
    }
    // The window being cleaned. Rendered into the café canvas at the card's
    // rect and copied straight into the card, the same trick as the portrait
    // — the overlay is opaque DOM, so nothing drawn on the canvas could
    // otherwise be seen through it.
    const surface = choreWipe.stageRect();
    const job = choreWipe.chore;
    if (surface && job) {
      choreSurface.setSubject(job, gameStore.getState().customisation);
      choreSurface.render(renderer, surface, now);
      choreWipe.paintWindow(renderer.domElement, surface);
    }
  });

  // §17 wants debug affordances for anything spatial, and this scene is only
  // observable through a canvas. Dev builds only — `import.meta.env.DEV` is
  // statically replaced, so this whole block is dropped from the app bundle.
  if (import.meta.env.DEV) {
    /**
     * `?sandbox` keeps the till full and hands out levels, so the expensive
     * end of the game can be looked at without playing to it. Dev only —
     * `setSandbox` is never called in a packaged build.
     */
    if (new URLSearchParams(location.search).has("sandbox")) {
      setSandbox(true);
      gameStore.getState().grantXp(3000);
    }
    (window as unknown as Record<string, unknown>).__mallow = {
      setSandbox,
      camera,
      controls,
      store: gameStore,
      catManager,
      barista,
      getRoomGroup,
      furnitureEditor,
      mover,
      beginPlacing,
      floaters,
      // Also on the settings panel, for players — this is here so it can be
      // driven from a script without opening a panel first.
      replayTutorial,
      guide: () => guide,
      // The portrait is only on screen while a panel is open, which makes it
      // exactly the sort of thing §17 wants a handle on: wrapping `say` here is
      // how the lip sync reaching it was verified.
      guidePortrait,
      // The minigame is behind a marker that is only on screen when a job is
      // due, so driving it from a script needs a way in (§17).
      choreWipe,
      seatPositions: () => seatPositions(gameStore.getState().placements),
    };
  }

  /**
   * Settle an unpaid piece if the session ends while it is still in the
   * player's hands. `pendingPurchase` is runtime-only, so without this a
   * force-quit mid-placement would hand out free furniture.
   */
  window.addEventListener("pagehide", () => {
    gameStore.getState().settlePurchase();
  });

  // Offline earnings on launch, and on resume from background — inside the
  // Capacitor shell the page isn't reloaded when the app comes back (§8).
  function settleAway(awayMs: number): void {
    const earned = gameStore.getState().grantOfflineEarnings(awayMs);
    if (earned > 0) ui.showWelcomeBack(earned, awayMs);
  }
  settleAway(bootAwayMs);

  let hiddenAt: number | null = null;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
    } else if (hiddenAt !== null) {
      settleAway(Date.now() - hiddenAt);
      hiddenAt = null;
    }
  });

  loop = startLoop((now) => {
    gameStore.getState().tick(now);
    const state = gameStore.getState();
    const { cats, visitors } = state;

    catManager.sync(cats, now);
    catManager.animate(now);
    barista.update(Math.min(0.1, (now - lastBaristaFrame) / 1000) || 0.016);
    lastBaristaFrame = now;
    visitorManager.sync(visitors, now);
    // Before the labels: they project from world space, so they need the
    // camera in its final position for this frame or they lag a frame behind.
    controls.update();
    catLabels.sync(cats, catManager.getLabelAnchors(), camera);
    nameTag.update(camera, now);
    // Held locally because the guide's `finished` callback sets `guide` to
    // null *during* this update — so reading `guide.anchor` on the next line
    // throws on the one frame it ends.
    const talking = guide;
    if (talking) {
      // The bubble owns the clock and the guide reads it, so the mouth is
      // driven by the same number that decides how much text is drawn.
      talking.update(now, speech.elapsed(now));
      // Behind a panel she cannot be seen, so the bubble comes to the top of
      // the screen instead of hanging over a head nobody can find.
      speech.setDocked(uiRoot.querySelector(".overlay-layer.open") !== null);
      speech.update(talking.anchor, camera, now);
      // The arrow follows the player *into* panels, so it has to be re-resolved
      // every frame — opening the shop is what makes the department card exist.
      ui.syncPointer();
    }
    // After `controls.update()`, like the labels: it projects from world
    // space, so it needs the camera in its final position for this frame.
    choreMarker.update(camera);
    {
      // Only when it is full: a jar you can empty at any level teaches people
      // to tap it constantly, which is the opposite of a cosy little bonus.
      const state = gameStore.getState();
      tipMarker.set(
        tipsReady(state.tips) && state.purchased.includes(TIP_JAR_ITEM)
          ? { id: "tips", label: "empty the jar", at: TIP_JAR_AT }
          : null,
      );
      tipMarker.update(camera);
    }
    expansionGhosts.update(now);
    builder.sync(camera);
    dust.update(now);

    render();
  });

  void dismissBootScreen();
}

/**
 * Take the loading screen down once the café is worth looking at.
 *
 * It waits for the **character pack**, not just the first frame. The room is
 * ready long before the 4 MB GLB has decoded, so dismissing early shows an
 * empty café for a second or two and then pops a barista and a guide into it —
 * which reads as a glitch, and is precisely the moment the guide is supposed
 * to be walking in.
 *
 * **The timeout is the load-bearing part.** If the pack fails — a bad build, a
 * corrupt file, a device that runs out of memory decoding it — waiting forever
 * leaves the player staring at a loading screen with no way out, which is far
 * worse than a café whose customers are late. So the wait is capped and the
 * screen comes down regardless.
 */
async function dismissBootScreen(): Promise<void> {
  const boot = document.getElementById("boot");
  if (!boot) return;
  await Promise.race([
    loadCharacterAssets().catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, 6000)),
  ]);
  // One more frame, so the first thing revealed is a drawn café rather than
  // the clear colour.
  await new Promise((resolve) => requestAnimationFrame(resolve));
  boot.classList.add("done");
  // Removed rather than left transparent: it covers the whole screen, and a
  // `pointer-events: none` overlay is one CSS mistake away from eating taps.
  setTimeout(() => boot.remove(), 600);
}

void bootstrap();
