import { gameStore, discoveredBreeds, currentCafeStats, type CatInstance } from "@/state/store";
import { costForNextCat } from "@/data/economy";
import {
  CAT_DEFINITIONS,
  RARITY_CONFIG,
  catDefinition,
  type CatDefinition,
} from "@/data/cats";
import { UPGRADE_DEFINITIONS } from "@/data/upgrades";
import {
  hasAffordableUpgrade,
  levelOf,
  nextLevelCost,
  totalUpgradeLevels,
} from "@/systems/upgrades";
import { liveIncomePerSecond } from "@/systems/offline";
import { logEvent } from "@/analytics/analytics";

function formatMoney(amount: number): string {
  return `$${Math.floor(amount)}`;
}

function formatAwayDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

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
  const catCount = el("div", "cat-count-pill");
  stack.appendChild(moneyPill);
  stack.appendChild(catCount);
  top.appendChild(stack);

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
  // Gentle "something's affordable" dot — an invitation, never a nag (§2).
  const cafeDot = el("span", "nudge-dot");
  cafeButton.appendChild(cafeDot);
  secondaryRow.appendChild(rosterButton);
  secondaryRow.appendChild(cafeButton);

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

    const panel = el("div", "roster-panel");
    panel.appendChild(panelHeader("Your cats"));

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

    const panel = el("div", "roster-panel");
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
        if (!gameStore.getState().buyUpgrade(definition.id)) return;
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
        `Your cats kept the café cosy while you were away (${formatAwayDuration(awayMs)}).`,
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
    const cat = gameStore.getState().adoptCat();
    if (cat) showAdoptionModal(cat);
  });

  rosterButton.addEventListener("click", () => {
    const { cats } = gameStore.getState();
    logEvent({
      name: "roster_opened",
      catCount: cats.length,
      breedsDiscovered: discoveredBreeds(cats).size,
    });
    renderRosterPanel();
  });

  cafeButton.addEventListener("click", () => {
    const state = gameStore.getState();
    logEvent({
      name: "cafe_opened",
      seats: currentCafeStats(state).seatCount,
      upgradeLevels: totalUpgradeLevels(state.upgrades),
    });
    renderCafePanel();
  });

  // --- HUD render loop -----------------------------------------------------
  let lastMoney = gameStore.getState().money;

  function render() {
    const state = gameStore.getState();
    const { money, cats, upgrades } = state;
    moneyPill.textContent = formatMoney(money);
    catCount.textContent = cats.length === 1 ? "1 cat" : `${cats.length} cats`;

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
