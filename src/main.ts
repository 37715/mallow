import { createScene } from "@/scene/scene";
import { startLoop } from "@/core/loop";
import { gameStore, bootAwayMs } from "@/state/store";
import { initAutosave } from "@/state/save";
import { CatManager } from "@/entities/cat-manager";
import { VisitorManager } from "@/entities/visitor-manager";
import { mountUI } from "@/ui/ui";
import { CatLabelLayer } from "@/ui/cat-labels";
import { initAnalytics } from "@/analytics/analytics";

function bootstrap(): void {
  const canvas = document.getElementById("scene") as HTMLCanvasElement;
  const uiRoot = document.getElementById("ui-root") as HTMLElement;

  const { scene, camera, render } = createScene(canvas);
  const catManager = new CatManager(scene);
  const visitorManager = new VisitorManager(scene);

  const ui = mountUI(uiRoot);
  const catLabels = new CatLabelLayer(uiRoot);
  initAutosave(gameStore);
  initAnalytics(() => {
    const { money, cats } = gameStore.getState();
    return { money, catCount: cats.length };
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
    const { cats, visitors } = gameStore.getState();

    catManager.sync(cats, now);
    catManager.animate(now);
    visitorManager.sync(visitors, now);
    catLabels.sync(cats, catManager.getLabelAnchors(), camera);

    render();
  });
}

bootstrap();
