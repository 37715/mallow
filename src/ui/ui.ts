import {
  gameStore,
  discoveredBreeds,
  currentCafeStats,
  currentProgress,
  type CatInstance,
} from "@/state/store";
import { formatMoney, formatDuration } from "@/ui/format";
import { contentCatCount } from "@/systems/cafe";
import { MAX_VISIBLE_CATS } from "@/entities/cat-manager";
import { costForNextCat } from "@/data/economy";
import {
  CAT_DEFINITIONS,
  RARITY_CONFIG,
  catDefinition,
  type CatDefinition,
} from "@/data/cats";
import { UPGRADE_DEFINITIONS } from "@/data/upgrades";
import { CUSTOMISATION, isUnlocked } from "@/data/customisation";
import { ECONOMY_CONFIG } from "@/data/economy";
import {
  hasAffordableUpgrade,
  levelOf,
  nextLevelCost,
  totalUpgradeLevels,
} from "@/systems/upgrades";
import { liveIncomePerSecond } from "@/systems/offline";
import { logEvent } from "@/analytics/analytics";
import {
  initAudio,
  isMuted,
  playPurchase,
  playReveal,
  playTap,
  setMuted,
} from "@/audio/audio";

/** How celebratory a reveal sounds, by rarity. */
const REVEAL_INTENSITY: Record<string, number> = {
  common: 0.2,
  uncommon: 0.4,
  rare: 0.6,
  epic: 0.8,
  legendary: 1,
};

function cssColor(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function rarityBadge(definition: CatDefinition): HTMLElement {
  const config = RARITY_CONFIG[definition.rarity];
  const badge = el("span", "rarity-badge", config.label);
  badge.style.background = config.badgeColor;
  return badge;
}

/** Circular fur swatch — the placeholder "portrait" until real cat art exists. */
function catSwatch(definition: CatDefinition, unknown = false): HTMLElement {
  const swatch = el("div", "cat-swatch");
  if (unknown) {
    swatch.classList.add("unknown");
    swatch.textContent = "?";
    return swatch;
  }
  swatch.style.background = cssColor(definition.furColor);
  const accent = el("div", "cat-swatch-accent");
  accent.style.background = cssColor(definition.accentColor);
  swatch.appendChild(accent);
  return swatch;
}

export interface MountedUI {
  /** Cosy "while you were away" card for offline earnings (§8). */
  showWelcomeBack: (earned: number, awayMs: number) => void;
}

/** Builds the DOM HUD and wires it to the store. No game logic lives here. */
export function mountUI(root: HTMLElement): MountedUI {
  root.innerHTML = "";

  // --- Top HUD -------------------------------------------------------------
  const top = el("div", "hud-top");
  const stack = el("div", "hud-top-stack");
  const moneyPill = el("div", "money-pill");
  // The till has a ceiling (§8), so show how full it is. The bar is the one
  // place the HUD says something the number alone can't.
  const tillFill = el("div", "till-fill");
  const moneyValue = el("span", "money-value");
  moneyPill.appendChild(tillFill);
  moneyPill.appendChild(moneyValue);
  const catCount = el("div", "cat-count-pill");
  stack.appendChild(moneyPill);
  stack.appendChild(catCount);
  top.appendChild(stack);

  // Sound toggle — audio is a big part of the feel (§10), so it gets a visible
  // control rather than being buried in a settings screen we don't have yet.
  const soundButton = el("button", "sound-button") as HTMLButtonElement;
  soundButton.setAttribute("aria-label", "Toggle sound");
  const paintSound = () => {
    soundButton.textContent = isMuted() ? "🔇" : "🔊";
    soundButton.classList.toggle("muted", isMuted());
  };
  paintSound();
  soundButton.addEventListener("click", () => {
    initAudio();
    setMuted(!isMuted());
    paintSound();
    if (!isMuted()) playTap();
  });
  top.appendChild(soundButton);

  // --- Bottom bar ----------------------------------------------------------
  const bottom = el("div", "hud-bottom");
  const adoptButton = el("button", "adopt-button") as HTMLButtonElement;
  const adoptLabel = el("span", "adopt-button-label");
  const adoptHint = el("span", "adopt-button-hint", "surprise breed");
  adoptButton.appendChild(adoptLabel);
  adoptButton.appendChild(adoptHint);

  const secondaryRow = el("div", "hud-bottom-row");
  const rosterButton = el("button", "roster-button", "Cats") as HTMLButtonElement;
  const cafeButton = el("button", "roster-button", "Café") as HTMLButtonElement;
  const styleButton = el("button", "roster-button", "Style") as HTMLButtonElement;
  // Gentle "something's affordable" dot — an invitation, never a nag (§2).
  const cafeDot = el("span", "nudge-dot");
  cafeButton.appendChild(cafeDot);
  secondaryRow.appendChild(rosterButton);
  secondaryRow.appendChild(cafeButton);
  secondaryRow.appendChild(styleButton);

  bottom.appendChild(adoptButton);
  bottom.appendChild(secondaryRow);

  // --- Overlays ------------------------------------------------------------
  const modalLayer = el("div", "overlay-layer");
  const panelLayer = el("div", "overlay-layer");

  root.appendChild(top);
  root.appendChild(bottom);
  root.appendChild(modalLayer);
  root.appendChild(panelLayer);

  // --- Adoption reveal + naming (§8 — the emotional hook) ------------------
  function showAdoptionModal(cat: CatInstance): void {
    const definition = catDefinition(cat.definitionId);
    modalLayer.innerHTML = "";

    const card = el("div", `reveal-card rarity-${definition.rarity}`);
    card.appendChild(el("div", "reveal-title", "A new friend!"));
    card.appendChild(catSwatch(definition));
    card.appendChild(rarityBadge(definition));
    card.appendChild(el("div", "reveal-breed", definition.breed));
    card.appendChild(el("div", "reveal-flavor", definition.flavor));
    card.appendChild(el("label", "reveal-name-label", "Give them a name"));

    const input = document.createElement("input");
    input.className = "reveal-name-input";
    input.type = "text";
    input.maxLength = 24;
    input.value = cat.name;
    input.autocomplete = "off";
    card.appendChild(input);

    const confirm = el("button", "reveal-confirm", "Welcome home") as HTMLButtonElement;
    card.appendChild(confirm);

    function finish(): void {
      gameStore.getState().renameCat(cat.id, input.value);
      modalLayer.classList.remove("open");
      modalLayer.innerHTML = "";
    }
    confirm.addEventListener("click", finish);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") finish();
    });

    modalLayer.appendChild(card);
    modalLayer.classList.add("open");
    input.focus();
    input.select();
  }

  // --- Panels --------------------------------------------------------------
  /**
   * Panels that show live numbers register an updater here instead of
   * re-rendering: the store ticks every frame, and rebuilding the DOM that
   * often would fight the player's own taps and text fields.
   */
  let panelUpdate: (() => void) | null = null;

  function closePanel(): void {
    panelLayer.classList.remove("open");
    panelLayer.innerHTML = "";
    panelUpdate = null;
  }

  function panelHeader(title: string): HTMLElement {
    const header = el("div", "roster-header");
    header.appendChild(el("div", "roster-title", title));
    const close = el("button", "roster-close", "✕") as HTMLButtonElement;
    close.addEventListener("click", closePanel);
    header.appendChild(close);
    return header;
  }

  // --- Roster + cat-dex panel (§8 — collection) ----------------------------
  function renderRosterPanel(): void {
    panelLayer.innerHTML = "";
    panelUpdate = null;
    const { cats } = gameStore.getState();
    const discovered = discoveredBreeds(cats);

    const panel = el("div", "panel");
    panel.appendChild(panelHeader("Your cats"));

    // Be honest about the room's capacity rather than silently dropping cats.
    if (cats.length > MAX_VISIBLE_CATS) {
      panel.appendChild(
        el(
          "div",
          "roster-capacity",
          `${MAX_VISIBLE_CATS} cats are out front — the other ${cats.length - MAX_VISIBLE_CATS} are napping upstairs. They all still bring guests in.`,
        ),
      );
    }

    const list = el("div", "roster-list");
    for (const cat of cats) {
      const definition = catDefinition(cat.definitionId);
      const row = el("div", "roster-row");
      row.appendChild(catSwatch(definition));

      const info = el("div", "roster-row-info");
      const nameEl = el("div", "roster-cat-name", cat.name);
      nameEl.title = "Tap to rename";
      nameEl.addEventListener("click", () => {
        const input = document.createElement("input");
        input.className = "roster-rename-input";
        input.type = "text";
        input.maxLength = 24;
        input.value = cat.name;
        nameEl.replaceWith(input);
        input.focus();
        input.select();
        const commit = () => {
          gameStore.getState().renameCat(cat.id, input.value);
          renderRosterPanel();
        };
        input.addEventListener("blur", commit);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") input.blur();
        });
      });
      info.appendChild(nameEl);

      const breedLine = el("div", "roster-cat-breed", definition.breed);
      breedLine.appendChild(rarityBadge(definition));
      info.appendChild(breedLine);

      // Contentment status, with the remaining time — so "pet your cats" is a
      // legible ritual rather than a hidden buff.
      const remaining = (cat.contentUntil ?? 0) - Date.now();
      const status = el("div", "roster-cat-content");
      if (remaining > 0) {
        status.textContent = `♥ content for ${formatDuration(remaining)}`;
        status.classList.add("content");
      } else {
        status.textContent = "tap them in the café for a fuss";
      }
      info.appendChild(status);
      row.appendChild(info);
      list.appendChild(row);
    }
    panel.appendChild(list);

    panel.appendChild(
      el("div", "dex-title", `Cat-dex — ${discovered.size}/${CAT_DEFINITIONS.length} breeds`),
    );
    const grid = el("div", "dex-grid");
    for (const definition of CAT_DEFINITIONS) {
      const known = discovered.has(definition.id);
      const cell = el("div", known ? "dex-cell" : "dex-cell unknown");
      cell.appendChild(catSwatch(definition, !known));
      cell.appendChild(el("div", "dex-cell-breed", known ? definition.breed : "???"));
      cell.appendChild(rarityBadge(definition));
      grid.appendChild(cell);
    }
    panel.appendChild(grid);

    panelLayer.appendChild(panel);
    panelLayer.classList.add("open");
  }

  // --- Café panel: expansion + décor (§8) ----------------------------------
  function renderCafePanel(): void {
    panelLayer.innerHTML = "";
    panelUpdate = null;

    const panel = el("div", "panel");
    panel.appendChild(panelHeader("Your café"));


    // The numbers, on screen rather than guessed at (§17).
    const statStrip = el("div", "cafe-stats");
    function statCell(label: string): HTMLElement {
      const cell = el("div", "cafe-stat");
      const value = el("div", "cafe-stat-value", "—");
      cell.appendChild(value);
      cell.appendChild(el("div", "cafe-stat-label", label));
      statStrip.appendChild(cell);
      return value;
    }
    const seatsValue = statCell("seats");
    const appealValue = statCell("appeal");
    const incomeValue = statCell("per min");
    panel.appendChild(statStrip);

    const list = el("div", "upgrade-list");
    const refreshers: (() => void)[] = [];

    for (const definition of UPGRADE_DEFINITIONS) {
      const row = el("div", "upgrade-row");

      row.appendChild(el("div", "upgrade-icon", definition.icon));

      const info = el("div", "upgrade-info");
      const nameLine = el("div", "upgrade-name", definition.name);
      const levelTag = el("span", "upgrade-level");
      nameLine.appendChild(levelTag);
      info.appendChild(nameLine);
      info.appendChild(el("div", "upgrade-desc", definition.description));
      const effect = el("div", "upgrade-effect");
      info.appendChild(effect);
      row.appendChild(info);

      const buy = el("button", "upgrade-buy") as HTMLButtonElement;
      buy.addEventListener("click", () => {
        initAudio();
        if (!gameStore.getState().buyUpgrade(definition.id)) return;
        playPurchase();
        for (const refresh of refreshers) refresh();
      });
      row.appendChild(buy);

      refreshers.push(() => {
        const { money, upgrades } = gameStore.getState();
        const level = levelOf(upgrades, definition.id);
        const cost = nextLevelCost(upgrades, definition.id);

        levelTag.textContent = `Lv ${level}/${definition.maxLevel}`;
        effect.textContent = level > 0 ? definition.summary(level) : "not yet added";
        effect.classList.toggle("inactive", level === 0);

        if (cost === null) {
          buy.textContent = "Max";
          buy.disabled = true;
          buy.classList.add("maxed");
        } else {
          buy.textContent = formatMoney(cost);
          buy.disabled = money < cost;
          buy.classList.remove("maxed");
        }
      });

      list.appendChild(row);
    }
    panel.appendChild(list);

    function update(): void {
      const state = gameStore.getState();
      const stats = currentCafeStats(state);
      seatsValue.textContent = String(stats.seatCount);
      appealValue.textContent = stats.appeal.toFixed(1);
      incomeValue.textContent = formatMoney(liveIncomePerSecond(stats) * 60);

      for (const refresh of refreshers) refresh();
    }

    update();
    panelUpdate = update;

    panelLayer.appendChild(panel);
    panelLayer.classList.add("open");
  }

  // --- Style: the customisation menu (§0 — this is the progression) --------
  function renderStylePanel(): void {
    panelLayer.innerHTML = "";
    panelUpdate = null;

    const panel = el("div", "panel");
    panel.appendChild(panelHeader("Make it yours"));

    const refreshers: (() => void)[] = [];

    for (const category of CUSTOMISATION) {
      const section = el("div", "style-section");
      section.appendChild(el("div", "style-section-name", category.name));
      section.appendChild(el("div", "style-section-hint", category.hint));

      const row = el("div", "style-row");
      for (const option of category.options) {
        const tile = el("button", "style-tile") as HTMLButtonElement;

        const swatch = el("div", "style-swatch");
        swatch.style.background = option.swatch;
        tile.appendChild(swatch);
        tile.appendChild(el("div", "style-name", option.name));
        const note = el("div", "style-note");
        tile.appendChild(note);

        tile.addEventListener("click", () => {
          initAudio();
          if (gameStore.getState().chooseCustomisation(category.id, option.id)) {
            playPurchase();
          } else {
            playTap();
          }
          for (const refresh of refreshers) refresh();
        });

        row.appendChild(tile);

        refreshers.push(() => {
          const state = gameStore.getState();
          const unlocked = isUnlocked(option, currentProgress(state));
          const owned = option.price === 0 || state.owned.includes(`${category.id}:${option.id}`);
          const chosen = state.customisation[category.id] === option.id;
          const affordable = state.money >= option.price;

          tile.classList.toggle("locked", !unlocked);
          tile.classList.toggle("chosen", chosen);
          tile.disabled = !unlocked || (!owned && !affordable);

          if (!unlocked) {
            // The locked row states the next step rather than just "locked" —
            // a closed door you know how to open is progression, one you don't
            // is just a wall.
            note.textContent = option.unlock?.label ?? "Locked";
          } else if (chosen) {
            note.textContent = "In your café";
          } else if (owned) {
            note.textContent = "Tap to use";
          } else {
            note.textContent = formatMoney(option.price);
          }
        });
      }

      section.appendChild(row);
      panel.appendChild(section);
    }

    function update(): void {
      for (const refresh of refreshers) refresh();
    }
    update();
    panelUpdate = update;

    panelLayer.appendChild(panel);
    panelLayer.classList.add("open");
  }

  // --- Welcome back / offline earnings (§8) --------------------------------
  function showWelcomeBack(earned: number, awayMs: number): void {
    modalLayer.innerHTML = "";

    const card = el("div", "reveal-card");
    card.appendChild(el("div", "reveal-title", "Welcome back!"));
    card.appendChild(el("div", "welcome-earned", `+${formatMoney(earned)}`));
    card.appendChild(
      el(
        "div",
        "reveal-flavor",
        `Your cats kept the café cosy while you were away (${formatDuration(awayMs)}).`,
      ),
    );
    const confirm = el("button", "reveal-confirm", "Thanks, everyone") as HTMLButtonElement;
    confirm.addEventListener("click", () => {
      modalLayer.classList.remove("open");
      modalLayer.innerHTML = "";
    });
    card.appendChild(confirm);

    modalLayer.appendChild(card);
    modalLayer.classList.add("open");
  }

  adoptButton.addEventListener("click", () => {
    initAudio();
    const cat = gameStore.getState().adoptCat();
    if (!cat) return;
    playReveal(REVEAL_INTENSITY[catDefinition(cat.definitionId).rarity] ?? 0.3);
    showAdoptionModal(cat);
  });

  rosterButton.addEventListener("click", () => {
    initAudio();
    playTap();
    const { cats } = gameStore.getState();
    logEvent({
      name: "roster_opened",
      catCount: cats.length,
      breedsDiscovered: discoveredBreeds(cats).size,
    });
    renderRosterPanel();
  });

  cafeButton.addEventListener("click", () => {
    initAudio();
    playTap();
    const state = gameStore.getState();
    logEvent({
      name: "cafe_opened",
      seats: currentCafeStats(state).seatCount,
      upgradeLevels: totalUpgradeLevels(state.upgrades),
    });
    renderCafePanel();
  });

  styleButton.addEventListener("click", () => {
    initAudio();
    playTap();
    renderStylePanel();
  });

  // --- HUD render loop -----------------------------------------------------
  let lastMoney = gameStore.getState().money;

  function render() {
    const state = gameStore.getState();
    const { money, cats, upgrades } = state;
    moneyValue.textContent = formatMoney(money);
    const fullness = Math.min(1, money / ECONOMY_CONFIG.tillCapacity);
    tillFill.style.transform = `scaleX(${fullness.toFixed(3)})`;
    moneyPill.classList.toggle("till-full", fullness >= 0.999);

    // Show how many cats are content, so the effect of petting is visible —
    // an unexplained multiplier may as well not exist.
    const content = contentCatCount(cats, Date.now());
    const catWord = cats.length === 1 ? "1 cat" : `${cats.length} cats`;
    catCount.textContent = content > 0 ? `${catWord} · ♥ ${content}` : catWord;
    catCount.classList.toggle("has-content", content > 0);

    if (money !== lastMoney) {
      moneyPill.classList.remove("bump");
      requestAnimationFrame(() => moneyPill.classList.add("bump"));
      lastMoney = money;
    }

    const cost = costForNextCat(cats.length);
    adoptLabel.textContent = `Adopt a cat — ${formatMoney(cost)}`;
    adoptButton.disabled = money < cost;

    cafeDot.classList.toggle("visible", hasAffordableUpgrade(money, upgrades));
    panelUpdate?.();
  }

  render();
  gameStore.subscribe(render);

  return { showWelcomeBack };
}
