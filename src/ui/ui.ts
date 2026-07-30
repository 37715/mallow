import { gameStore, discoveredBreeds, type CatInstance } from "@/state/store";
import { costForNextCat } from "@/data/economy";
import {
  CAT_DEFINITIONS,
  RARITY_CONFIG,
  catDefinition,
  type CatDefinition,
} from "@/data/cats";
import { logEvent } from "@/analytics/analytics";

function formatMoney(amount: number): string {
  return `$${Math.floor(amount)}`;
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

/** Builds the DOM HUD and wires it to the store. No game logic lives here. */
export function mountUI(root: HTMLElement): void {
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

  const rosterButton = el("button", "roster-button", "Cats") as HTMLButtonElement;
  bottom.appendChild(adoptButton);
  bottom.appendChild(rosterButton);

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

  // --- Roster + cat-dex panel (§8 — collection) ----------------------------
  function renderRosterPanel(): void {
    panelLayer.innerHTML = "";
    const { cats } = gameStore.getState();
    const discovered = discoveredBreeds(cats);

    const panel = el("div", "roster-panel");

    const header = el("div", "roster-header");
    header.appendChild(el("div", "roster-title", "Your cats"));
    const close = el("button", "roster-close", "✕") as HTMLButtonElement;
    close.addEventListener("click", () => {
      panelLayer.classList.remove("open");
      panelLayer.innerHTML = "";
    });
    header.appendChild(close);
    panel.appendChild(header);

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

  // --- HUD render loop -----------------------------------------------------
  let lastMoney = gameStore.getState().money;

  function render() {
    const { money, cats } = gameStore.getState();
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
  }

  render();
  gameStore.subscribe(render);
}
