import { createScene } from "@/scene/scene";
import { startLoop } from "@/core/loop";
import { gameStore } from "@/state/store";
import { initAutosave } from "@/state/save";
import { CatManager } from "@/entities/cat-manager";
import { VisitorManager } from "@/entities/visitor-manager";
import { mountUI } from "@/ui/ui";
import { CatLabelLayer } from "@/ui/cat-labels";
import { logEvent } from "@/analytics/analytics";

function bootstrap(): void {
  const canvas = document.getElementById("scene") as HTMLCanvasElement;
  const uiRoot = document.getElementById("ui-root") as HTMLElement;

  const { scene, camera, render } = createScene(canvas);
  const catManager = new CatManager(scene);
  const visitorManager = new VisitorManager(scene);

  mountUI(uiRoot);
  const catLabels = new CatLabelLayer(uiRoot);
  initAutosave(gameStore);
  logEvent({ name: "session_start" });

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
