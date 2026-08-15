import * as THREE from "three";
import { gameStore, currentProgress } from "@/state/store";
import { CUSTOMISATION, isUnlocked, type CustomisationOption } from "@/data/customisation";
import {
  MAX_PATCHES,
  WINDOW_PRICE,
  expansionCost,
  expansionLevel,
  ownedPatches,
  type TileKey,
} from "@/data/expansion";
import { levelProgress } from "@/data/progression";
import { formatMoney } from "@/ui/format";
import { icon } from "@/ui/icons";
import { initAudio, playPurchase, playTap } from "@/audio/audio";

/**
 * Builder mode — the café's construction tools, in the café.
 *
 * Ellis: *"the extender thing needs to be a mega like builder mode with
 * building tool icon and you can swipe through with nice icons all the
 * different walls and floors to pick from."*
 *
 * ## Why the walls and floor belong *here* rather than in the shop
 *
 * They were already buyable, as two of the five colourway categories on the
 * shop's Colours page, where each is previewed as a single spinning wall
 * segment on a turntable. That is the right treatment for a sofa and the wrong
 * one for a *building*: a wall style changes the whole room at once, including
 * the window, and the only useful preview of it is the room. Moving them into
 * a mode that stands you in the café and leaves it visible means you choose by
 * looking at the thing itself — the same argument that put the colours in the
 * shop in the first place, applied one level further.
 *
 * They stay listed on the Colours page too. Two routes to one choice is fine
 * when the choice is genuinely reachable from two places; what is not fine is
 * two routes that look like different features, so both use the same
 * `.style-tile` and the same "own it once, re-apply free" rule.
 *
 * ## Three tools, one bar
 *
 * `extend` is the ghost squares with prices on them; `walls` and `floor` are
 * strips of styles. Only one is active at a time, and the ghosts are hidden
 * for the other two — a floor you are about to recolour should not have
 * translucent squares floating over it.
 */

export type BuilderTool = "extend" | "walls" | "floor";

export interface Builder {
  /** Open or close the whole mode. */
  setOpen(on: boolean): void;
  isOpen(): boolean;
  /** The buyable squares, from `ExpansionPreview.candidates()`. */
  setTiles(tiles: { key: TileKey; position: THREE.Vector3 }[]): void;
  /** Every wall segment, with a marker offering to glaze it or brick it up. */
  setWalls(
    walls: { id: string; position: THREE.Vector3; glazed: boolean; blocked: boolean }[],
  ): void;
  /** Reproject the markers. Call once a frame while open. */
  sync(camera: THREE.Camera): void;
  /** Which tool is showing, so the caller knows whether to draw ghosts. */
  tool(): BuilderTool;
}

export interface BuilderOptions {
  /** A square was bought — the caller refreshes the ghosts. */
  onBought: () => void;
  /** A window was bought — the caller refreshes the wall markers. */
  onGlazed: () => void;
  /** Leave the mode. */
  onDone: () => void;
  /** The tool changed; ghosts are only wanted for `extend`. */
  onToolChange: (tool: BuilderTool) => void;
}

/** How far above its square a "+" floats, in CSS pixels. */
const MARKER_LIFT_PX = 54;

const TOOLS: { id: BuilderTool; name: string; icon: string }[] = [
  { id: "extend", name: "extend", icon: "expand" },
  { id: "floor", name: "floor", icon: "planks" },
  { id: "walls", name: "walls", icon: "wall" },
];

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createBuilder(root: HTMLElement, options: BuilderOptions): Builder {
  const layer = el("div", "builder-layer");
  // Survives mountUI clearing the root — see the note there.
  layer.dataset.overlay = "";
  layer.style.display = "none";
  root.appendChild(layer);

  /** The projected "+ price" markers. Only used by the extend tool. */
  const markers = el("div", "expansion-layer");
  layer.appendChild(markers);

  /**
   * The same markers again, on the walls, offering to glaze them.
   *
   * A second layer rather than a mode on the first: the two are visible under
   * different tools and are rebuilt at different times, and one list that
   * sometimes means squares and sometimes means walls is how a stale marker
   * ends up buying the wrong thing.
   */
  const wallMarkers = el("div", "expansion-layer");
  layer.appendChild(wallMarkers);

  const bar = el("div", "builder-bar");
  const tabs = el("div", "builder-tabs");
  const body = el("div", "builder-body");
  const foot = el("div", "builder-foot");
  const note = el("div", "expansion-note");
  const done = el("button", "expansion-done", "done") as HTMLButtonElement;
  done.addEventListener("click", () => {
    playTap();
    options.onDone();
  });
  foot.appendChild(note);
  foot.appendChild(done);
  bar.appendChild(tabs);
  bar.appendChild(body);
  bar.appendChild(foot);
  layer.appendChild(bar);

  let tool: BuilderTool = "extend";
  let entries: { key: TileKey; position: THREE.Vector3; el: HTMLElement }[] = [];
  let walls: {
    id: string;
    position: THREE.Vector3;
    glazed: boolean;
    blocked: boolean;
    el: HTMLElement;
  }[] = [];
  const ndc = new THREE.Vector3();

  for (const entry of TOOLS) {
    const tab = el("button", "builder-tab") as HTMLButtonElement;
    tab.dataset.tool = entry.id;
    tab.appendChild(icon(entry.icon, "icon"));
    tab.appendChild(el("span", "builder-tab-label", entry.name));
    tab.addEventListener("click", () => {
      playTap();
      tool = entry.id;
      options.onToolChange(tool);
      paint();
    });
    tabs.appendChild(tab);
  }

  /**
   * A strip of styles for one customisation category.
   *
   * Rebuilt on every paint rather than diffed: it is at most three tiles, it
   * changes whenever money or a level does, and a stale price on a buy button
   * is a worse bug than a wasted allocation.
   */
  function buildStrip(categoryId: string): void {
    const category = CUSTOMISATION.find((c) => c.id === categoryId);
    body.innerHTML = "";
    if (!category) return;

    const strip = el("div", "builder-strip");
    const state = gameStore.getState();
    for (const option of category.options) {
      strip.appendChild(styleTile(category.id, option, state));
    }
    body.appendChild(strip);
    note.textContent = category.hint.toLowerCase();
  }

  function styleTile(
    categoryId: string,
    option: CustomisationOption,
    state: ReturnType<typeof gameStore.getState>,
  ): HTMLElement {
    const unlocked = isUnlocked(option, currentProgress(state));
    const owned = option.price === 0 || state.owned.includes(`${categoryId}:${option.id}`);
    const chosen = state.customisation[categoryId] === option.id;

    const tile = el("button", "style-tile builder-tile") as HTMLButtonElement;
    const swatch = el("div", "style-swatch");
    swatch.style.background = option.swatch;
    tile.appendChild(swatch);
    tile.appendChild(el("div", "style-name", option.name));
    const label = el("div", "style-note");
    // A locked row says what to go and do, never just "locked" (§9).
    label.textContent = !unlocked
      ? (option.unlock?.label ?? "Locked")
      : chosen
        ? "In your café"
        : owned
          ? "Tap to use"
          : formatMoney(option.price);
    tile.appendChild(label);

    tile.classList.toggle("locked", !unlocked);
    tile.classList.toggle("chosen", chosen);
    tile.disabled = !unlocked || (!owned && state.money < option.price);
    tile.addEventListener("click", () => {
      initAudio();
      if (gameStore.getState().chooseCustomisation(categoryId, option.id)) playPurchase();
      else playTap();
      paint();
    });
    return tile;
  }

  function paintMarkers(): void {
    const state = gameStore.getState();
    const level = levelProgress(state.xp).level;
    const owned = ownedPatches(state.tiles).length;
    const cost = expansionCost(owned);
    const needed = expansionLevel(owned);
    const locked = level < needed;

    for (const entry of entries) {
      const button = entry.el.querySelector("button")!;
      const price = entry.el.querySelector(".expansion-price")!;
      // Every candidate costs the same — it is the *next* square, wherever you
      // put it. Pricing by position would be a puzzle with no way to reason
      // about it.
      price.textContent = locked ? `level ${needed}` : formatMoney(cost);
      button.classList.toggle("locked", locked);
      (button as HTMLButtonElement).disabled = locked || state.money < cost;
    }
  }

  function paint(): void {
    for (const tab of tabs.querySelectorAll<HTMLElement>(".builder-tab")) {
      tab.classList.toggle("on", tab.dataset.tool === tool);
    }
    markers.style.display = tool === "extend" ? "" : "none";
    wallMarkers.style.display = tool === "walls" ? "" : "none";

    if (tool === "extend") {
      body.innerHTML = "";
      const state = gameStore.getState();
      const owned = ownedPatches(state.tiles).length;
      note.textContent =
        owned >= MAX_PATCHES
          ? "as big as the café gets."
          : entries.length > 0
            ? "tap a square to lay floor there."
            : "no room to grow from here.";
      paintMarkers();
      return;
    }
    buildStrip(tool);
    if (tool === "walls") {
      paintWalls();
      // The strip's own hint is about colour; the walls have a second offer on
      // them and it needs saying, or the markers look like decoration.
      note.textContent = "or tap a wall to add a window, or take one out.";
    }
  }

  function paintWalls(): void {
    const money = gameStore.getState().money;
    for (const wall of walls) {
      const button = wall.el.querySelector("button") as HTMLButtonElement;
      // A glazed segment offers the way back, and says so in words: an icon
      // alone cannot distinguish "put a window here" from "take it out".
      wall.el.querySelector(".expansion-price")!.textContent = wall.glazed
        ? "remove window"
        : wall.blocked
          ? "wall is in use"
          : formatMoney(WINDOW_PRICE);
      button.classList.toggle("expansion-undo", wall.glazed);
      button.disabled = !wall.glazed && (wall.blocked || money < WINDOW_PRICE);
    }
  }

  return {
    isOpen: () => layer.style.display !== "none",
    tool: () => tool,

    setOpen(on) {
      layer.style.display = on ? "" : "none";
      if (on) {
        // Always opens on the tool you most likely came for, and never on a
        // strip left over from last time.
        tool = "extend";
        options.onToolChange(tool);
        paint();
      }
    },

    setTiles(tiles) {
      markers.innerHTML = "";
      entries = [];
      for (const tile of tiles) {
        const wrap = el("div", "expansion-marker");
        const button = el("button", "expansion-plus") as HTMLButtonElement;
        button.appendChild(el("span", "expansion-sign", "+"));
        button.appendChild(el("span", "expansion-price"));
        button.addEventListener("click", () => {
          initAudio();
          if (gameStore.getState().buyTile(tile.key)) {
            playPurchase();
            options.onBought();
          } else {
            playTap();
          }
        });
        wrap.appendChild(button);
        markers.appendChild(wrap);
        entries.push({ key: tile.key, position: tile.position, el: wrap });
      }
      paint();
    },

    setWalls(next) {
      wallMarkers.innerHTML = "";
      walls = [];
      for (const wall of next) {
        const wrap = el("div", "expansion-marker");
        const button = el("button", "expansion-plus") as HTMLButtonElement;
        button.appendChild(icon("window", "icon"));
        button.appendChild(el("span", "expansion-price"));
        button.addEventListener("click", () => {
          initAudio();
          const store = gameStore.getState();
          const done = wall.glazed ? store.removeWindow(wall.id) : store.buyWindow(wall.id);
          if (done) {
            playPurchase();
            options.onGlazed();
          } else {
            playTap();
          }
        });
        wrap.appendChild(button);
        wallMarkers.appendChild(wrap);
        walls.push({
          id: wall.id,
          position: wall.position,
          glazed: wall.glazed,
          blocked: wall.blocked,
          el: wrap,
        });
      }
      if (tool === "walls") paint();
    },

    sync(camera) {
      if (tool === "walls") {
        project(walls, camera);
        paintWalls();
        return;
      }
      if (tool !== "extend") return;
      for (const entry of entries) {
        ndc.copy(entry.position).project(camera);
        // Behind the camera: hide rather than draw it mirrored somewhere
        // nonsensical.
        const visible = ndc.z <= 1;
        entry.el.style.display = visible ? "" : "none";
        if (!visible) continue;
        const x = (ndc.x * 0.5 + 0.5) * window.innerWidth;
        // **Pinned above the square, not on it.** The buyable squares are on
        // the near sides of the café, which is exactly where the tool bar sits
        // — a marker centred on its tile disappears behind it. Lifting the
        // camera instead does not work: `clampTarget` holds the view inside
        // the framing box, so the bias is discarded.
        const y = (-ndc.y * 0.5 + 0.5) * window.innerHeight - MARKER_LIFT_PX;
        entry.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      }
      paintMarkers();
    },
  };

  /** Pin a set of markers above their world positions. Shared by both layers. */
  function project(
    list: { position: THREE.Vector3; el: HTMLElement }[],
    camera: THREE.Camera,
  ): void {
    for (const entry of list) {
      ndc.copy(entry.position).project(camera);
      const visible = ndc.z <= 1;
      entry.el.style.display = visible ? "" : "none";
      if (!visible) continue;
      const x = (ndc.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-ndc.y * 0.5 + 0.5) * window.innerHeight - MARKER_LIFT_PX;
      entry.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    }
  }
}
