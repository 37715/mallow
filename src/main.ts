import * as THREE from "three";
import { createScene } from "@/scene/scene";
import { startLoop } from "@/core/loop";
import { gameStore, bootAwayMs, currentCafeStats } from "@/state/store";
import { initAutosave } from "@/state/save";
import { CatManager } from "@/entities/cat-manager";
import { CafeManager } from "@/entities/cafe-manager";
import { VisitorManager } from "@/entities/visitor-manager";
import { DustMotes } from "@/scene/dust";
import { SEAT_POSITIONS } from "@/scene/room";
import { levelOf } from "@/systems/upgrades";
import { visitorPayAmount } from "@/data/economy";
import { mountUI } from "@/ui/ui";
import { CatLabelLayer } from "@/ui/cat-labels";
import { FloaterLayer } from "@/ui/floaters";
import { initAnalytics } from "@/analytics/analytics";
import { onGameEvent } from "@/core/events";
import { initAudio, playCoin, playPurr } from "@/audio/audio";

function bootstrap(): void {
  const canvas = document.getElementById("scene") as HTMLCanvasElement;
  const uiRoot = document.getElementById("ui-root") as HTMLElement;

  const { scene, camera, render } = createScene(canvas);
  const catManager = new CatManager(scene);
  const cafeManager = new CafeManager(scene);
  const visitorManager = new VisitorManager(scene);
  const dust = new DustMotes(scene);

  // Build whatever the café already owns before the first frame, so a returning
  // player's room is simply there rather than popping in around them.
  {
    const state = gameStore.getState();
    cafeManager.sync(
      currentCafeStats(state).seatCount,
      levelOf(state.upgrades, "decor"),
      performance.now(),
      true,
    );
  }

  const floaters = new FloaterLayer(uiRoot);
  const ui = mountUI(uiRoot);
  const catLabels = new CatLabelLayer(uiRoot);
  initAutosave(gameStore);
  initAnalytics(() => {
    const { money, cats } = gameStore.getState();
    return { money, catCount: cats.length };
  });

  // --- Juice: coins pop out of the seat a guest just paid at (§10) ---------
  onGameEvent("visitorPaid", ({ seatIndex }) => {
    const seat = SEAT_POSITIONS[seatIndex];
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

  // --- Juice: tap a cat to pet it -----------------------------------------
  const pointer = new THREE.Vector2();
  canvas.addEventListener("pointerdown", (event) => {
    // Browsers only allow audio to start from a user gesture.
    initAudio();

    pointer.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1,
    );
    const catId = catManager.pick(pointer, camera);
    if (!catId) return;

    catManager.pet(catId, performance.now());
    const position = catManager.worldPositionOf(catId);
    if (position) floaters.burstHearts(position, camera);
    playPurr();
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

  startLoop((now) => {
    gameStore.getState().tick(now);
    const state = gameStore.getState();
    const { cats, visitors, upgrades } = state;

    cafeManager.sync(currentCafeStats(state).seatCount, levelOf(upgrades, "decor"), now);
    cafeManager.animate(now);
    catManager.sync(cats, now);
    catManager.animate(now);
    visitorManager.sync(visitors, now);
    catLabels.sync(cats, catManager.getLabelAnchors(), camera);
    dust.update(now);

    render();
  });
}

bootstrap();
