import {
  gameStore,
  isSandbox,
  setSandbox,
  discoveredBreeds,
  currentCafeStats,
  currentProgress,
  currentMenu,
  ownedCount,
  firstIngredientIsFree,
  type CatInstance,
} from "@/state/store";
import { formatMoney, formatDuration } from "@/ui/format";
import { icon } from "@/ui/icons";
import { catFace } from "@/ui/cat-face";
import { contentCatCount } from "@/systems/cafe";
import { visibleCatCapacity } from "@/scene/room";
import { costForNextCat } from "@/data/economy";
import {
  CAT_DEFINITIONS,
  RARITY_CONFIG,
  catDefinition,
  type CatDefinition,
} from "@/data/cats";
import { UPGRADE_DEFINITIONS } from "@/data/upgrades";
import { levelProgress } from "@/data/progression";
import { CAT_BED_ITEM, bedAsset, bedCost, beds, freeBeds } from "@/data/beds";
import {
  MAX_PATCHES,
  expansionCandidates,
  expansionCost,
  ownedPatches,
  ownedTiles,
} from "@/data/expansion";
import { GRAPHICS_LEVELS, type GraphicsLevel } from "@/data/graphics";
import type { Chore } from "@/data/chores";
import { dueChores } from "@/systems/chores";
import { BACKDROPS } from "@/data/backdrops";
import type { CustomDrink } from "@/data/drinks";
import {
  BASE_DRINKS,
  INGREDIENTS,
  MAX_BLEND_INGREDIENTS,
  MAX_CUSTOM_DRINKS,
  STARTER_DRINK_ID,
  baseDrink,
  ingredient,
} from "@/data/drinks";
import { salesRanking } from "@/systems/menu";
import {
  CUSTOMISATION,
  SLOT_CATEGORY,
  chosenAssets,
  isUnlocked,
  type CustomisableSlot,
  type CustomisationCategory,
} from "@/data/customisation";
import {
  SHOP_CATEGORIES,
  SHOP_ITEMS,
  copyAsset,
  copyPrice,
  itemsInCategory,
  shopItem,
  type ShopItem,
} from "@/data/shop";
import { CAFE_LAYOUT, MOVABLE, MOVABLE_LABELS, type Placement } from "@/data/cafe-layout";
import { tidyAssetName } from "@/scene/furniture-picker";
import type { ShopPreview } from "@/scene/shop-preview";
import { ECONOMY_CONFIG } from "@/data/economy";
import {
  hasAffordableUpgrade,
  levelOf,
  nextLevelCost,
  totalUpgradeLevels,
} from "@/systems/upgrades";
import { liveIncomePerSecond } from "@/systems/offline";
import { logEvent } from "@/analytics/analytics";
import { onGameEvent } from "@/core/events";
import {
  initAudio,
  isMuted,
  playPurchase,
  playReveal,
  playTap,
  setMuted,
  setMusicMuted,
} from "@/audio/audio";

/** How celebratory a reveal sounds, by rarity. */
const REVEAL_INTENSITY: Record<string, number> = {
  common: 0.2,
  uncommon: 0.4,
  rare: 0.6,
  epic: 0.8,
  legendary: 1,
};


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
/**
 * A breed's portrait.
 *
 * Was a coloured disc with a dot on it, described in its own stylesheet as
 * "the placeholder portrait until real cat art lands". The cat pack never
 * shipped, so the faces are drawn — `ui/cat-face.ts`.
 */
function catSwatch(definition: CatDefinition, unknown = false): HTMLElement {
  const swatch = el("div", "cat-swatch");
  if (unknown) swatch.classList.add("unknown");
  swatch.appendChild(catFace(definition, unknown));
  return swatch;
}

export interface MountedUI {
  /** Cosy "while you were away" card for offline earnings (§8). */
  showWelcomeBack: (earned: number, awayMs: number) => void;
  /**
   * How the shop puts a piece in flight. main.ts owns the 3D side, so it hands
   * this in; the shop closes itself and calls it. Returns false if the piece
   * isn't in the room yet, which is the caller's cue to try again next frame.
   */
  attachPlacer: (place: (layoutId: string, justBought?: boolean) => boolean) => void;
  /** Turn the in-world "buy this floor" ghosts on and off (§8 step 6). */
  attachExpander: (setOpen: (on: boolean) => void) => void;
  /** Hand the HUD the renderer's quality knob (§ data/graphics.ts). */
  attachGraphics: (apply: (level: GraphicsLevel) => void) => void;
  /** Hand the HUD the renderer's backdrop painter (§ data/backdrops.ts). */
  attachBackdrop: (apply: (id: string) => void) => void;
  /** Hand the HUD a way to start the walkthrough again from settings. */
  attachTutorial: (replay: () => void) => void;
  /**
   * Hand the HUD the world marker that offers a chore (`ui/chore-marker.ts`).
   * The HUD decides *which* job is due; the marker decides where it floats.
   */
  attachChores: (show: (chore: Chore | null) => void) => void;
  /** Leave expansion mode — the "done" button calls back into this. */
  closeExpander: () => void;
  /** The colour picker, so character creation can offer the same control. */
  backdropPicker: (onPick?: (id: string) => void) => HTMLElement;
  /** Hand the HUD the 3D preview it drives while the shop is open. */
  attachShopPreview: (preview: ShopPreview) => void;
  /** Where the spinning item should be drawn, or null if the shop is closed. */
  shopStageRect: () => DOMRect | null;
  /**
   * Guide the arrow through a walkthrough task; null clears it.
   *
   * Takes the *task*, not a control, because the arrow has to move as the
   * player drills in — see `GUIDE_PATHS`.
   */
  point: (task: string | null) => void;
  /** Re-resolve where the arrow belongs. Cheap; called once a frame. */
  syncPointer: () => void;
}

/** Builds the DOM HUD and wires it to the store. No game logic lives here. */
export function mountUI(root: HTMLElement): MountedUI {
  // Clear our own widgets, but **never the overlay layers**. Coin floaters,
  // hearts, cat labels and the furniture editor all mount into this same root
  // and are marked `data-overlay`.
  //
  // This used to be `root.innerHTML = ""`, and because `new FloaterLayer()`
  // ran one line *before* `mountUI`, it detached the floater layer on every
  // boot. Every coin pop and every petting heart since has been appended to an
  // orphaned div — invisible, no error, no failing test (§10's "coins pop and
  // arc when a visitor pays" was simply not happening). Preserving marked
  // layers makes the bug impossible rather than making it order-dependent.
  for (const child of [...root.children]) {
    if (!(child instanceof HTMLElement) || child.dataset.overlay === undefined) child.remove();
  }

  // --- Progress corner: level ring, café name, your name -------------------
  //
  // Ellis: *"show lvl xp circle + cafe name + my name in corner like progress
  // stuff."* It earns the corner because **nothing else in this game
  // accumulates** — the till is capped and spent, cats cap at five — so XP is
  // the only number that is a record rather than a balance (§ data/progression).
  const profile = el("button", "profile-corner") as HTMLButtonElement;
  const ring = el("div", "level-ring");
  ring.innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true">
      <circle class="level-ring-track" cx="20" cy="20" r="16.5" />
      <circle class="level-ring-fill" cx="20" cy="20" r="16.5" />
    </svg>`;
  const levelNumber = el("span", "level-number");
  ring.appendChild(levelNumber);
  const ringFill = ring.querySelector(".level-ring-fill") as SVGCircleElement;
  const RING_CIRCUMFERENCE = 2 * Math.PI * 16.5;
  ringFill.style.strokeDasharray = `${RING_CIRCUMFERENCE}`;

  const profileText = el("div", "profile-text");
  // Not lowercased in CSS: both of these are words the player typed (§9).
  const cafeNameLine = el("div", "profile-cafe");
  const profileSub = el("div", "profile-sub");
  profileText.appendChild(cafeNameLine);
  profileText.appendChild(profileSub);
  profile.appendChild(ring);
  profile.appendChild(profileText);
  // The corner is a button: it is the most natural place to ask "how am I
  // doing?", and it was inert.
  profile.addEventListener("click", () => {
    initAudio();
    playTap();
    setExpanding?.(false);
    renderProfilePanel();
  });

  onGameEvent("levelUp", ({ level }) => {
    profile.classList.remove("levelled");
    void profile.offsetWidth; // restart the animation on a double level-up
    profile.classList.add("levelled");
    window.setTimeout(() => profile.classList.remove("levelled"), 1000);
    showLevelUp(level);
  });

  /**
   * The café's vital signs, under the profile.
   *
   * Ellis, 2026-08-13: *"the cat counter and heart counter should be on the
   * left and also show like the cafe appeal and earnings per hr."* Both halves
   * matter. **Left**, because the right-hand column is the till and the till is
   * one thing; and **appeal and rate**, because until now the only way to see
   * what furnishing the café had actually bought you was to open a panel — the
   * numbers the whole shop is in service of were the hidden ones.
   *
   * Cats and hearts are a button (they open the roster). Appeal and rate are
   * not: there is nowhere useful to go from them, and a chip that highlights
   * on press and then does nothing is a lie.
   */
  const catChip = el("button", "stat-chip cat-chip") as HTMLButtonElement;
  const catChipCount = el("span", "stat-chip-value");
  const heartChipCount = el("span", "stat-chip-value");
  catChip.appendChild(icon("cat", "icon stat-icon"));
  catChip.appendChild(catChipCount);
  const heartWrap = el("span", "stat-chip-part");
  heartWrap.appendChild(icon("heart", "icon stat-icon heart"));
  heartWrap.appendChild(heartChipCount);
  catChip.appendChild(heartWrap);

  /** Last values seen, so only a genuine rise animates. */
  let shownAppeal = Number.POSITIVE_INFINITY;
  let shownRate = 0;

  /**
   * Pop a chip and float a "+n" off it.
   *
   * **The whole column is lifted above the panel layer while it runs**, and
   * that is the fix rather than a flourish: appeal almost always rises
   * *because you just bought something*, which means a panel is open, dimmed
   * and blurred over the top of the HUD. The animation was firing perfectly
   * and nobody could see it (Ellis: *"im also not seeing the appeal increase
   * animation when buying stuff?"*). A celebration behind a modal is no
   * celebration.
   */
  function celebrate(host: HTMLElement, label: string, delayMs: number): void {
    window.setTimeout(() => {
      host.classList.remove("rising");
      void host.offsetWidth;
      host.classList.add("rising");
      leftColumn.classList.add("celebrating");
      const rise = el("span", "stat-rise", label);
      host.appendChild(rise);
      window.setTimeout(() => {
        rise.remove();
        host.classList.remove("rising");
        if (!leftColumn.querySelector(".stat-rise")) {
          leftColumn.classList.remove("celebrating");
        }
      }, 1400);
    }, delayMs);
  }

  const rateChip = el("div", "stat-chip rate-chip");
  const appealValueChip = el("span", "stat-chip-value");
  const rateValueChip = el("span", "stat-chip-value");
  const appealPart = el("span", "stat-chip-part");
  appealPart.appendChild(el("span", "stat-chip-label", "appeal"));
  appealPart.appendChild(appealValueChip);
  const ratePart = el("span", "stat-chip-part");
  ratePart.appendChild(el("span", "stat-chip-label", "per hr"));
  ratePart.appendChild(rateValueChip);
  rateChip.appendChild(appealPart);
  rateChip.appendChild(ratePart);

  const leftColumn = el("div", "hud-left");
  leftColumn.appendChild(profile);
  leftColumn.appendChild(catChip);
  leftColumn.appendChild(rateChip);

  // --- Top HUD -------------------------------------------------------------
  const top = el("div", "hud-top");
  top.appendChild(leftColumn);
  const stack = el("div", "hud-top-stack");
  const moneyPill = el("div", "money-pill");
  // The till has a ceiling (§8), so show how full it is. The bar is the one
  // place the HUD says something the number alone can't.
  const tillFill = el("div", "till-fill");
  const moneyValue = el("span", "money-value");
  moneyPill.appendChild(tillFill);
  moneyPill.appendChild(moneyValue);
  stack.appendChild(moneyPill);
  top.appendChild(stack);

  // A settings cog, not a mute button. Muting is *a* setting rather than the
  // only one worth a permanent slot in the corner (Ellis, 2026-08-12), and a
  // speaker icon up there was quietly telling every new player that sound is
  // the thing this game most expects them to want to change.
  const settingsButton = el("button", "sound-button") as HTMLButtonElement;
  settingsButton.setAttribute("aria-label", "Settings");
  settingsButton.appendChild(icon("cog"));
  settingsButton.addEventListener("click", () => {
    initAudio();
    playTap();
    renderSettingsPanel();
  });
  top.appendChild(settingsButton);

  // --- Bottom bar ----------------------------------------------------------
  const bottom = el("div", "hud-bottom");
  /**
   * The walkthrough's pointing arrow — one element, moved about.
   *
   * Positioned against the viewport rather than parented to the button it
   * points at, because the nav buttons sit inside a flex row with `overflow`
   * and an absolutely-positioned child would be clipped by it.
   */
  const pointArrow = el("div", "point-arrow");
  pointArrow.dataset.overlay = "";
  pointArrow.style.display = "none";
  // **Curved, not a chevron on a stick.** Ellis: *"it should be a bit curvy
  // and soft the arrow looks too blunt."* The first one was a hard triangle on
  // a rectangle, which is a road sign — every other shape in this game is
  // rounded (§9: "rounded over sharp"), so a blunt arrow reads as borrowed
  // from another product. This is one closed path: a shaft that swells and
  // curves, and a head with rounded shoulders rather than points.
  pointArrow.innerHTML =
    '<svg viewBox="0 0 32 40" aria-hidden="true">' +
    '<path d="M16 39c-.9 0-1.6-.4-2.2-1L2.6 25.6c-1.5-1.7-.3-4.3 2-4.3h5.2c.3-4.4.2-8-1-11.4' +
    "C7.7 6.6 6.2 4.4 4.3 2.6 3.2 1.6 3.9 0 5.4 0c4.3 0 8 1.9 10.4 5.2 2.4 3.3 3.4 7.7 3.4 " +
    '12.6v3.5h5.2c2.3 0 3.5 2.6 2 4.3L18.2 38c-.6.6-1.3 1-2.2 1z"/></svg>';
  root.appendChild(pointArrow);

  const adoptButton = el("button", "adopt-button") as HTMLButtonElement;
  const adoptLabel = el("span", "adopt-button-label");
  const adoptHint = el("span", "adopt-button-hint", "surprise breed");
  adoptButton.appendChild(adoptLabel);
  adoptButton.appendChild(adoptHint);

  const secondaryRow = el("div", "hud-bottom-row");
  /** Icon over label — the icon is what you learn, the word is what confirms it. */
  function navButton(iconName: string, label: string): HTMLButtonElement {
    const button = el("button", "roster-button") as HTMLButtonElement;
    button.appendChild(icon(iconName, "icon nav-icon"));
    button.appendChild(el("span", "nav-label", label));
    return button;
  }
  const rosterButton = navButton("cat", "cats");
  const cafeButton = navButton("cup", "café");
  const shopButton = navButton("shop", "shop");
  // `data-guide` marks the things the walkthrough's arrow can point at. It is
  // an attribute rather than a class so it never collides with styling, and it
  // is read by selector so the arrow can find a control that did not exist when
  // the step began — which is the whole point: the shop's departments only
  // appear once the shop is open.
  rosterButton.dataset.guide = "cats";
  cafeButton.dataset.guide = "cafe";
  shopButton.dataset.guide = "shop";
  // Gentle "something's affordable" dot — an invitation, never a nag (§2).
  const cafeDot = el("span", "nudge-dot");
  cafeButton.appendChild(cafeDot);
  secondaryRow.appendChild(rosterButton);
  secondaryRow.appendChild(cafeButton);
  secondaryRow.appendChild(shopButton);

  bottom.appendChild(adoptButton);
  bottom.appendChild(secondaryRow);

  // --- Overlays ------------------------------------------------------------
  const modalLayer = el("div", "overlay-layer modal-layer");
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
    card.appendChild(el("div", "reveal-title", "a new friend"));
    card.appendChild(catSwatch(definition));
    card.appendChild(rarityBadge(definition));
    card.appendChild(el("div", "reveal-breed", definition.breed));
    card.appendChild(el("div", "reveal-flavor", definition.flavor));
    card.appendChild(el("label", "reveal-name-label", "give them a name"));

    const input = document.createElement("input");
    input.className = "reveal-name-input";
    input.type = "text";
    input.maxLength = 24;
    input.value = cat.name;
    input.autocomplete = "off";
    card.appendChild(input);

    const confirm = el("button", "reveal-confirm", "welcome home") as HTMLButtonElement;
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
    // **No autofocus.** Focusing the field throws up the on-screen keyboard the
    // instant a cat appears, which covers the reveal — the one moment the game
    // most wants you looking at the screen. The suggested name is already
    // there; tap it if you want to change it.
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
    panelLayer.classList.remove("shop-open");
    panelLayer.innerHTML = "";
    panelUpdate = null;
    // Stop drawing the spinning item the instant its hole in the panel is gone.
    shopStage = null;
    shopPreview?.setItem(null);
  }

  function panelHeader(title: string): HTMLElement {
    const header = el("div", "roster-header");
    header.appendChild(el("div", "roster-title", title));
    const close = el("button", "roster-close") as HTMLButtonElement;
    close.setAttribute("aria-label", "close");
    close.appendChild(icon("close"));
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
    panel.appendChild(panelHeader("your cats"));

    // Be honest about the room's capacity rather than silently dropping cats.
    // Live capacity, not the theoretical maximum: with the shop in, most cat
    // furniture isn't in the room until it's bought, so quoting the all-in
    // total would promise seats the café doesn't have.
    const visible = visibleCatCapacity(gameStore.getState().purchased, gameStore.getState().tiles);
    if (cats.length > visible) {
      panel.appendChild(
        el(
          "div",
          "roster-capacity",
          `${visible} cats are out front — the other ${cats.length - visible} are napping upstairs. they all still bring guests in. more cat furniture makes room for more.`,
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
      nameEl.title = "tap to rename";
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
      el("div", "dex-title", `cat-dex — ${discovered.size}/${CAT_DEFINITIONS.length} breeds`),
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

  /**
   * A card that sends you somewhere else. Shared by the shop's front page and
   * the café's, because both screens are hubs and there is no reason for them
   * to look like different products.
   */
  function hubCard(
    options: {
      icon: string;
      name: string;
      hint: string;
      note: string;
      variant?: string;
      /** Marks this card as somewhere the walkthrough's arrow can point. */
      guide?: string;
      onOpen: () => void;
    },
  ): HTMLButtonElement {
    const card = el("button", `hub-card ${options.variant ?? ""}`.trim()) as HTMLButtonElement;
    if (options.guide) card.dataset.guide = options.guide;
    const badge = el("div", "hub-card-icon");
    badge.appendChild(icon(options.icon, "icon"));
    card.appendChild(badge);
    const text = el("div", "hub-card-text");
    text.appendChild(el("div", "hub-card-name", options.name));
    text.appendChild(el("div", "hub-card-hint", options.hint));
    text.appendChild(el("div", "hub-card-note", options.note));
    card.appendChild(text);
    card.addEventListener("click", () => {
      playTap();
      options.onOpen();
    });
    return card;
  }

  /** Header with a back arrow to the café hub, for the menu's sub-panels. */
  function backTo(label: string, onBack: () => void): HTMLElement {
    const bar = el("div", "shop-back-bar");
    const back = el("button", "shop-back") as HTMLButtonElement;
    back.appendChild(icon("chevronLeft", "icon"));
    back.appendChild(el("span", "shop-back-label", label));
    back.addEventListener("click", () => {
      playTap();
      onBack();
    });
    bar.appendChild(back);
    return bar;
  }

  // --- The menu (§8 — coffees, add-ins, blends, and what's selling) --------
  //
  // Ellis, 2026-08-14. The design note that matters: **a menu is the first
  // thing in this game the player authors.** Everything else is chosen from a
  // list; a blend is named, like a cat, and naming is the attachment (§8).
  // So the classics are cheap and quick, the ingredients are the long
  // collection gated on level as well as coins, and inventing a drink is free.
  //
  // The pay maths lives in `systems/menu.ts` and is worth knowing before
  // touching prices: the café's multiplier is the menu's **average** cup, so
  // padding the list with cheap drinks makes the café worse, not better.

  /**
   * A one-line complaint pinned under a control that refused.
   *
   * Named `refuse2` beside the adopt button's `refuse` because they do the
   * same job in different places; if a third appears, they should merge.
   */
  function refuse2(host: HTMLElement, message: string): void {
    host.querySelector(".inline-refusal")?.remove();
    const note = el("div", "inline-refusal", message);
    host.appendChild(note);
    window.setTimeout(() => note.remove(), 2600);
  }

  /** "That's on the menu now" — a small card, then back to the café. */
  function showBlendMade(drink: CustomDrink): void {
    modalLayer.innerHTML = "";
    const card = el("div", "reveal-card");
    card.appendChild(el("div", "reveal-title", "on the menu"));

    const badge = el("div", "hub-card-icon blend-made-icon");
    badge.appendChild(icon(baseDrink(drink.base)?.icon ?? "mug", "icon"));
    card.appendChild(badge);

    // The player's own words, untouched (§9).
    const name = el("div", "reveal-breed", drink.name);
    name.classList.add("player-written");
    card.appendChild(name);
    card.appendChild(
      el(
        "div",
        "reveal-flavor",
        [baseDrink(drink.base)?.name ?? "coffee"]
          .concat(drink.ingredients.map((i) => ingredient(i)?.name ?? i))
          .join(" · "),
      ),
    );
    card.appendChild(
      el("div", "reveal-flavor", "guests can order it from now on. let's see how it does."),
    );

    const confirm = el("button", "reveal-confirm", "lovely") as HTMLButtonElement;
    confirm.addEventListener("click", () => {
      playTap();
      modalLayer.classList.remove("open");
      modalLayer.innerHTML = "";
      // Straight to the menu, where it now appears — the point of naming a
      // drink is seeing it listed.
      renderSalesPanel();
    });
    card.appendChild(confirm);

    modalLayer.appendChild(card);
    modalLayer.classList.add("open");
    playReveal(0.6);
  }

  /** The classics. */
  function renderCoffeesPanel(): void {
    panelLayer.innerHTML = "";
    panelUpdate = null;

    const panel = el("div", "panel");
    panel.appendChild(backTo("café", renderCafePanel));
    panel.appendChild(panelHeader("the coffees"));
    panel.appendChild(
      el(
        "div",
        "panel-note",
        "what your café serves. a wider menu is worth more per cup — but it is the average that counts, so serve things you like.",
      ),
    );

    const refreshers: (() => void)[] = [];
    for (const drink of BASE_DRINKS) {
      const row = el("div", "menu-row");
      const badge = el("div", "hub-card-icon");
      badge.appendChild(icon(drink.icon, "icon"));
      row.appendChild(badge);

      const text = el("div", "menu-row-text");
      text.appendChild(el("div", "menu-row-name", drink.name));
      text.appendChild(el("div", "menu-row-blurb", drink.blurb));
      row.appendChild(text);

      const action = el("button", "menu-row-action") as HTMLButtonElement;
      action.addEventListener("click", () => {
        initAudio();
        if (gameStore.getState().unlockDrink(drink.id)) playPurchase();
        else playTap();
        for (const refresh of refreshers) refresh();
      });
      row.appendChild(action);

      refreshers.push(() => {
        const state = gameStore.getState();
        const owned = state.drinks.includes(drink.id);
        const level = levelProgress(state.xp).level;
        const locked = level < drink.level;

        row.classList.toggle("owned", owned);
        row.classList.toggle("locked", !owned && locked);
        if (owned) {
          action.textContent = "on the menu";
          action.disabled = true;
        } else if (locked) {
          action.textContent = `level ${drink.level}`;
          action.disabled = true;
        } else {
          action.textContent = formatMoney(drink.price);
          action.disabled = state.money < drink.price;
        }
      });
      for (const refresh of refreshers) refresh();
      panel.appendChild(row);
    }

    panelUpdate = () => {
      for (const refresh of refreshers) refresh();
    };
    panelLayer.appendChild(panel);
    panelLayer.classList.add("open");
  }

  /** The cabinet of add-ins, and the blend maker. */
  function renderBlendsPanel(): void {
    panelLayer.innerHTML = "";
    panelUpdate = null;

    const panel = el("div", "panel");
    panel.appendChild(backTo("café", renderCafePanel));
    panel.appendChild(panelHeader("your own blends"));

    const refreshers: (() => void)[] = [];

    // --- What you have already invented ---------------------------------
    const blends = el("div", "blend-list");
    panel.appendChild(blends);

    // --- The maker --------------------------------------------------------
    let pickedBase = STARTER_DRINK_ID;
    const picked: string[] = [];

    panel.appendChild(el("div", "hub-section", "invent one"));
    const maker = el("div", "blend-maker");

    // Labelled, because two unlabelled rows of chips is a puzzle: nothing says
    // which one is the coffee and which is what goes in it.
    maker.appendChild(el("div", "maker-label", "start with"));
    const baseRow = el("div", "chip-row");
    maker.appendChild(baseRow);
    maker.appendChild(el("div", "maker-label", `add up to ${MAX_BLEND_INGREDIENTS}`));
    const addinRow = el("div", "chip-row");
    maker.appendChild(addinRow);
    maker.appendChild(el("div", "maker-label", "call it something"));

    const nameInput = document.createElement("input");
    nameInput.className = "reveal-name-input";
    nameInput.type = "text";
    nameInput.maxLength = 24;
    nameInput.placeholder = "name it";
    nameInput.autocomplete = "off";
    // The walkthrough points here between picking an ingredient and being able
    // to add the blend: "add to the menu" is disabled until it has a name, and
    // an arrow on a dead button teaches nothing.
    nameInput.dataset.guide = "blend-name";
    maker.appendChild(nameInput);

    const make = el("button", "reveal-confirm", "add to the menu") as HTMLButtonElement;
    make.dataset.guide = "make-blend";
    maker.appendChild(make);
    panel.appendChild(maker);

    // --- The cabinet ------------------------------------------------------
    panel.appendChild(el("div", "hub-section", "the cabinet"));
    panel.appendChild(
      el("div", "panel-note", "unlock an ingredient once and it is yours to blend with forever."),
    );
    const cabinet = el("div", "chip-row cabinet");
    panel.appendChild(cabinet);

    function paint(): void {
      const state = gameStore.getState();
      const level = levelProgress(state.xp).level;

      // Your blends.
      blends.innerHTML = "";
      if (state.customDrinks.length === 0) {
        blends.appendChild(
          el("div", "panel-note", "nothing of your own yet. that is what the cabinet is for."),
        );
      }
      for (const blend of state.customDrinks) {
        const row = el("div", "menu-row owned");
        const badge = el("div", "hub-card-icon");
        badge.appendChild(icon(baseDrink(blend.base)?.icon ?? "mug", "icon"));
        row.appendChild(badge);
        const text = el("div", "menu-row-text");
        // The player's own words: never case-transformed (§9).
        const nameEl = el("div", "menu-row-name", blend.name);
        nameEl.classList.add("player-written");
        text.appendChild(nameEl);
        const parts = [baseDrink(blend.base)?.name ?? "coffee"].concat(
          blend.ingredients.map((i) => ingredient(i)?.name ?? i),
        );
        text.appendChild(el("div", "menu-row-blurb", parts.join(" · ")));
        row.appendChild(text);
        const remove = el("button", "menu-row-action", "take off") as HTMLButtonElement;
        remove.addEventListener("click", () => {
          playTap();
          gameStore.getState().removeBlend(blend.id);
          paint();
        });
        row.appendChild(remove);
        blends.appendChild(row);
      }

      // Base picker — only coffees actually on the menu.
      baseRow.innerHTML = "";
      const bases = BASE_DRINKS.filter((d) => state.drinks.includes(d.id));
      if (!bases.some((d) => d.id === pickedBase)) pickedBase = STARTER_DRINK_ID;
      for (const drink of bases) {
        const chip = el("button", "pick-chip") as HTMLButtonElement;
        chip.classList.toggle("on", drink.id === pickedBase);
        chip.appendChild(icon(drink.icon, "icon"));
        chip.appendChild(el("span", "pick-chip-label", drink.name));
        chip.addEventListener("click", () => {
          playTap();
          pickedBase = drink.id;
          paint();
        });
        baseRow.appendChild(chip);
      }

      // Add-in picker — only what you own.
      addinRow.innerHTML = "";
      const owned = INGREDIENTS.filter((i) => state.ingredients.includes(i.id));
      if (owned.length === 0) {
        addinRow.appendChild(el("div", "panel-note", "no add-ins yet — see the cabinet below."));
      }
      for (const item of owned) {
        const chip = el("button", "pick-chip") as HTMLButtonElement;
        const on = picked.includes(item.id);
        chip.classList.toggle("on", on);
        chip.appendChild(icon(item.icon, "icon"));
        chip.appendChild(el("span", "pick-chip-label", item.name));
        chip.addEventListener("click", () => {
          playTap();
          const at = picked.indexOf(item.id);
          if (at >= 0) picked.splice(at, 1);
          else if (picked.length < MAX_BLEND_INGREDIENTS) picked.push(item.id);
          paint();
        });
        addinRow.appendChild(chip);
      }

      const full = state.customDrinks.length >= MAX_CUSTOM_DRINKS;
      make.disabled = full || nameInput.value.trim().length === 0;
      make.textContent = full ? "the menu is full" : "add to the menu";

      // The cabinet.
      cabinet.innerHTML = "";
      for (const item of INGREDIENTS) {
        const has = state.ingredients.includes(item.id);
        const locked = level < item.level;
        const chip = el("button", "pick-chip cabinet-chip") as HTMLButtonElement;
        chip.classList.toggle("on", has);
        chip.classList.toggle("locked", !has && locked);
        chip.appendChild(icon(item.icon, "icon"));
        chip.appendChild(el("span", "pick-chip-label", item.name));
        // The first flavour is on the house (`firstIngredientIsFree`), so the
        // price has to say so — otherwise the one add-in a broke player can
        // actually take reads as unaffordable and they never open the menu.
        const free = firstIngredientIsFree(state);
        const cost = free ? 0 : item.price;
        chip.appendChild(
          el(
            "span",
            "pick-chip-note",
            has ? item.blurb : locked ? `level ${item.level}` : free ? "on the house" : formatMoney(cost),
          ),
        );
        chip.classList.toggle("free", !has && !locked && free);
        if (!has && !locked) chip.dataset.guide = "ingredient";
        chip.disabled = has || locked || state.money < cost;
        chip.addEventListener("click", () => {
          initAudio();
          if (gameStore.getState().unlockIngredient(item.id)) playPurchase();
          else playTap();
          paint();
        });
        cabinet.appendChild(chip);
      }
    }

    nameInput.addEventListener("input", () => {
      const state = gameStore.getState();
      make.disabled =
        state.customDrinks.length >= MAX_CUSTOM_DRINKS || nameInput.value.trim().length === 0;
    });

    make.addEventListener("click", () => {
      initAudio();
      const created = gameStore.getState().createBlend(nameInput.value, pickedBase, [...picked]);
      if (!created) {
        // **Never fail silently on a tap** (§9). The button was simply inert
        // when the name was blank or the menu full, which reads as a broken
        // app rather than as a rule.
        playTap();
        refuse2(
          maker,
          gameStore.getState().customDrinks.length >= MAX_CUSTOM_DRINKS
            ? "the menu is full — take one off first"
            : "give it a name first",
        );
        return;
      }
      playPurchase();
      nameInput.value = "";
      picked.length = 0;
      paint();
      // Inventing a drink is the one thing in this game the player *authored*,
      // so it gets said out loud rather than just appearing in a list.
      showBlendMade(created);
    });

    paint();
    refreshers.push(paint);
    panelLayer.appendChild(panel);
    panelLayer.classList.add("open");
  }

  /**
   * What's selling.
   *
   * Deliberately one screen of bars and nothing else — Ellis asked for
   * *"some super minimal simple happy analytics page"*, and the happy part is
   * the constraint that matters. No trends, no time ranges, no comparisons
   * against last week: this is a café owner glancing at what people order, not
   * a dashboard. Drinks that have sold nothing still appear, because a zero is
   * information and hiding it would look like the drink does not exist.
   */
  /** The icon for anything on the menu — a blend borrows its base's. */
  function drinkIcon(state: ReturnType<typeof gameStore.getState>, id: string): string {
    const classic = BASE_DRINKS.find((d) => d.id === id);
    if (classic) return classic.icon;
    const blend = state.customDrinks.find((d) => d.id === id);
    return baseDrink(blend?.base ?? "")?.icon ?? "mug";
  }

  /** What a blend is made of. Classics say nothing — the name is the recipe. */
  function drinkDescription(
    state: ReturnType<typeof gameStore.getState>,
    id: string,
  ): string | null {
    const blend = state.customDrinks.find((d) => d.id === id);
    if (!blend) return null;
    return [baseDrink(blend.base)?.name ?? "coffee"]
      .concat(blend.ingredients.map((i) => ingredient(i)?.name ?? i))
      .join(" · ");
  }

  function renderSalesPanel(): void {
    panelLayer.innerHTML = "";
    panelUpdate = null;

    const panel = el("div", "panel");
    panel.appendChild(backTo("café", renderCafePanel));
    panel.appendChild(panelHeader("the menu"));

    const summary = el("div", "panel-note");
    panel.appendChild(summary);
    const list = el("div", "sales-list");
    panel.appendChild(list);

    function update(): void {
      const state = gameStore.getState();
      const rows = salesRanking(currentMenu(state), state.sales);
      const total = rows.reduce((sum, row) => sum + row.cups, 0);

      summary.textContent =
        total === 0
          ? "no cups yet today. the first guest will be along shortly."
          : `${total} cups poured, all told. ${rows[0].name} is the favourite.`;

      list.innerHTML = "";
      for (const row of rows) {
        const line = el("div", "sales-row");
        const head = el("div", "sales-head");
        // The icon is what makes this one page instead of two: you can see
        // *what* the café sells and *how it is doing* in the same glance.
        head.appendChild(icon(drinkIcon(state, row.id), "icon sales-icon"));
        const name = el("span", "sales-name", row.name);
        if (row.own) name.classList.add("player-written");
        head.appendChild(name);
        head.appendChild(el("span", "sales-cups", `${row.cups}`));
        line.appendChild(head);
        const made = drinkDescription(state, row.id);
        if (made) line.appendChild(el("div", "sales-made", made));

        const track = el("div", "sales-track");
        const bar = el("div", "sales-bar");
        // A hair of width even at zero, so every drink reads as a *row* rather
        // than as a missing one.
        bar.style.width = `${Math.max(2, row.share * 100)}%`;
        if (row.own) bar.classList.add("own");
        track.appendChild(bar);
        line.appendChild(track);
        list.appendChild(line);
      }
    }

    update();
    panelUpdate = update;
    panelLayer.appendChild(panel);
    panelLayer.classList.add("open");
  }

  // --- Café panel: the counter, and the room's numbers ---------------------
  //
  // Rebuilt 2026-08-13. It had drifted into a mess: a three-cell stat strip
  // that now **duplicates the HUD chips** (appeal and takings are permanently
  // on screen), a title that wrapped around a floating level tag, dot leaders
  // trailing into nothing, and a cramped square price button — Ellis: *"the my
  // cafe menu thing looks so fucked up now with weird shaped buttons."*
  //
  // Two rules came out of it and are worth keeping:
  //   - **Never show a number here that the HUD already shows.** A panel that
  //     repeats the screen behind it has no reason to be opened.
  //   - **A price is a full-width action, not a chip wedged beside text.** The
  //     menu-style dot leaders (§9) are for a *list* of priced rows; with one
  //     upgrade and its own button they had nothing to lead to.
  function renderCafePanel(): void {
    panelLayer.innerHTML = "";
    panelUpdate = null;

    const panel = el("div", "panel");
    panel.appendChild(panelHeader("your café"));
    panel.appendChild(
      el(
        "div",
        "panel-note",
        "appeal comes from your cats and the furniture in the room — the shop has more of both.",
      ),
    );

    const refreshers: (() => void)[] = [];

    // The menu hub — three cards, the same shape as the shop's front page.
    panel.appendChild(el("div", "hub-section", "the menu"));
    const menuGrid = el("div", "hub-grid");
    const menuState = () => {
      const state = gameStore.getState();
      return { state, level: levelProgress(state.xp).level };
    };
    menuGrid.appendChild(
      hubCard({
        icon: "cupHot",
        name: "coffees",
        hint: "the classics, one at a time.",
        note: `${menuState().state.drinks.length} of ${BASE_DRINKS.length} served`,
        onOpen: renderCoffeesPanel,
      }),
    );
    menuGrid.appendChild(
      hubCard({
        icon: "honey",
        name: "blends",
        hint: "unlock add-ins and invent your own.",
        note: `${menuState().state.ingredients.length} of ${INGREDIENTS.length} add-ins`,
        guide: "blends",
        variant: "hub-card-blends",
        onOpen: renderBlendsPanel,
      }),
    );
    menuGrid.appendChild(
      hubCard({
        icon: "chart",
        name: "the menu",
        hint: "everything you sell, and how it's doing.",
        note: (() => {
          const { state } = menuState();
          const cups = Object.values(state.sales).reduce((a, b) => a + b, 0);
          return cups === 0 ? "no cups yet" : `${cups} cups poured`;
        })(),
        variant: "hub-card-wide hub-card-sales",
        onOpen: renderSalesPanel,
      }),
    );
    panel.appendChild(menuGrid);

    panel.appendChild(el("div", "hub-section", "the counter"));
    for (const definition of UPGRADE_DEFINITIONS) {
      const card = el("div", "upgrade-card");

      const head = el("div", "upgrade-head");
      const iconBox = el("div", "upgrade-icon");
      iconBox.appendChild(icon(definition.icon));
      head.appendChild(iconBox);
      const titles = el("div", "upgrade-titles");
      titles.appendChild(el("div", "upgrade-name", definition.name));
      const effect = el("div", "upgrade-effect");
      titles.appendChild(effect);
      head.appendChild(titles);
      const levelTag = el("div", "upgrade-level");
      head.appendChild(levelTag);
      card.appendChild(head);

      card.appendChild(el("div", "upgrade-desc", definition.description));

      const buy = el("button", "upgrade-buy") as HTMLButtonElement;
      const buyLabel = el("span", "upgrade-buy-label");
      const buyPrice = el("span", "upgrade-buy-price");
      buy.appendChild(buyLabel);
      buy.appendChild(buyPrice);
      buy.addEventListener("click", () => {
        initAudio();
        if (!gameStore.getState().buyUpgrade(definition.id)) return;
        playPurchase();
        for (const refresh of refreshers) refresh();
      });
      card.appendChild(buy);

      refreshers.push(() => {
        const { money, upgrades } = gameStore.getState();
        const level = levelOf(upgrades, definition.id);
        const cost = nextLevelCost(upgrades, definition.id);

        levelTag.textContent = `lv ${level}/${definition.maxLevel}`;
        effect.textContent = level > 0 ? definition.summary(level) : "not yet added";
        effect.classList.toggle("inactive", level === 0);

        if (cost === null) {
          buyLabel.textContent = "as good as it gets";
          buyPrice.textContent = "";
          buy.disabled = true;
          buy.classList.add("maxed");
        } else {
          buyLabel.textContent = level === 0 ? "add it" : "improve it";
          buyPrice.textContent = formatMoney(cost);
          buy.disabled = money < cost;
          buy.classList.remove("maxed");
        }
      });

      panel.appendChild(card);
    }

    // The room's own numbers — only the ones the HUD does *not* already carry.
    panel.appendChild(el("div", "hub-section", "the room"));
    const facts = el("div", "fact-list");
    function factRow(label: string): HTMLElement {
      const row = el("div", "fact-row");
      row.appendChild(el("span", "fact-label", label));
      const value = el("span", "fact-value", "—");
      row.appendChild(value);
      facts.appendChild(row);
      return value;
    }
    const seatsValue = factRow("seats");
    const guestValue = factRow("a guest stays");
    const tillValue = factRow("till holds");
    panel.appendChild(facts);

    function update(): void {
      const state = gameStore.getState();
      const stats = currentCafeStats(state);
      seatsValue.textContent = String(stats.seatCount);
      guestValue.textContent = `${Math.round(stats.dwellDurationMs / 1000)}s`;
      tillValue.textContent = formatMoney(ECONOMY_CONFIG.tillCapacity);
      for (const refresh of refreshers) refresh();
    }

    update();
    panelUpdate = update;

    panelLayer.appendChild(panel);
    panelLayer.classList.add("open");
  }

  // --- The shop: everything you buy for the café, in one place -------------
  //
  // A pager, not a list. The furniture is the product, so it gets the whole
  // panel: one big piece at a time, spinning and hovering, with a price tag.
  // The 3D is drawn by `scene/shop-preview.ts` into the rect of `.shop-stage`.
  //
  // **The Style menu lives here now** (2026-08-10). Ellis: *"the style thing
  // where you can pick colours should rly be part of the shop menu."* Right —
  // it was a separate top-level button selling the same fantasy through a wall
  // of swatches, while the shop sold furniture by *showing* it. Colourways are
  // now the last tab, and they get the same treatment: the sofa turns on the
  // stage in whatever colour you're hovering over, so you choose by looking at
  // the thing rather than at a hex square. (Holding a finger on a piece in the
  // café still opens its colourways directly — `ui/furniture-editor.ts` — and
  // that remains the quicker route once you know it exists.)
  /** Which drawn icon fronts each department card. */
  const DEPARTMENT_ICONS: Record<string, string> = {
    comfort: "sofa",
    cats: "cat",
    counter: "cup",
    decor: "plant",
    outside: "shop",
  };

  /**
   * How many pieces in the café a colourway would repaint.
   *
   * Counts what is actually in the room: an authored piece only if it has been
   * bought, plus every copy the player has made of it. Walls and floor are the
   * building — always exactly one of each, whatever the footprint.
   */
  function piecesInCategory(state: ReturnType<typeof gameStore.getState>, categoryId: string): number {
    const slot = SLOT_FOR_CATEGORY[categoryId];
    if (!slot) return 1;
    const authored = CAFE_LAYOUT.filter(
      (p) => p.slot === slot && (!p.shopItem || state.purchased.includes(p.shopItem)),
    ).length;
    const copies = state.instances.filter((i) => {
      if (i.item === CAT_BED_ITEM) return slot === "catBed";
      return shopItem(i.item)?.slot === slot;
    }).length;
    return Math.max(1, authored + copies);
  }

  /** Inverse of `SLOT_CATEGORY`, for counting what a colourway touches. */
  const SLOT_FOR_CATEGORY: Record<string, CustomisableSlot | undefined> = Object.fromEntries(
    Object.entries(SLOT_CATEGORY).map(([slot, category]) => [category, slot as CustomisableSlot]),
  );

  const STYLE_TAB = "colours";
  /**
   * The "arrange" tab: every piece currently in the café that can be moved.
   *
   * **This is what replaces press-and-hold**, and it has to exist rather than
   * relying on each piece's shop page, because the starter furniture — the
   * armchair, the stools, the floor cushions, the cat bed, the rug — was never
   * bought and so has no shop page at all. Without this tab, killing the hold
   * gesture would have made the café's original furniture unmovable, which is
   * a feature being deleted rather than relocated.
   */
  const ARRANGE_TAB = "arrange";

  /**
   * The shop's front page: every department, with an icon, a line about what
   * is in it, and how far through it you are.
   *
   * The count line is the part that earns the grid. A category name alone is a
   * label; "2 of 3 in your café" is a reason to tap, and it is the same nudge
   * the till's fill bar gives — progress you can see without opening anything.
   */
  interface Department {
    id: string;
    name: string;
    hint: string;
    icon: string;
    count: () => string;
  }

  /**
   * How much of a department is standing in the café.
   *
   * **Counts pieces, not ticked boxes** (2026-08-25). It used to read "0 of 1
   * in your café", which was both confusing next to the cat-bed page — that
   * page is not one of the department's items — and, once anything could be
   * bought twice, simply wrong. Ellis: *"it still says 0 out of 1 in your cafe
   * for cat beds no matter how many i have."*
   */
  const boughtIn = (categoryId: string) => (): string => {
    const state = gameStore.getState();
    let pieces = itemsInCategory(categoryId).reduce(
      (n, item) => n + ownedCount(state, item.id),
      0,
    );
    if (categoryId === "cats") pieces += beds(state.placements, state.instances).length;
    if (pieces === 0) return "nothing yet";
    return `${pieces} ${pieces === 1 ? "piece" : "pieces"} in your café`;
  };

  const DEPARTMENTS: Department[] = [
    ...SHOP_CATEGORIES.map((c) => ({
      id: c.id,
      name: c.name,
      hint: c.hint,
      icon: DEPARTMENT_ICONS[c.id] ?? "shop",
      count: boughtIn(c.id),
    })),
    {
      id: STYLE_TAB,
      name: "Colours",
      hint: "Recolour the walls, floor, sofa, rug and cat bed.",
      icon: "swatches",
      count: () => {
        const total = CUSTOMISATION.reduce((sum, c) => sum + c.options.length, 0);
        const { owned } = gameStore.getState();
        const free = CUSTOMISATION.reduce(
          (sum, c) => sum + c.options.filter((o) => o.price === 0).length,
          0,
        );
        return `${Math.min(total, owned.length + free)} of ${total} colourways`;
      },
    },
    {
      id: ARRANGE_TAB,
      name: "Arrange",
      hint: "Pick anything up and put it somewhere better.",
      icon: "arrows",
      count: () => {
        const { purchased } = gameStore.getState();
        const n = MOVABLE.filter(
          (p) => p.id && (!p.shopItem || purchased.includes(p.shopItem)),
        ).length;
        return `${n} pieces to move`;
      },
    },
  ];
  /** Which asset stands in for a colourway category on the stage. */
  const STYLE_PREVIEW_SLOT: Record<string, string> = {
    walls: "wallWindow",
    floor: "floor",
    sofa: "sofa",
    carpet: "carpet",
    catBed: "catBed",
  };

  type ShopPage =
    | { key: string; kind: "bed" }
    | { key: string; kind: "copy"; instanceId: string; item: ShopItem }
    | { key: string; kind: "item"; item: ShopItem }
    | { key: string; kind: "style"; category: CustomisationCategory }
    | { key: string; kind: "move"; piece: Placement };

  function pagesFor(tabId: string): ShopPage[] {
    if (tabId === ARRANGE_TAB) {
      const state = gameStore.getState();
      const authored: ShopPage[] = MOVABLE.filter(
        (piece) => piece.id && (!piece.shopItem || state.purchased.includes(piece.shopItem)),
      ).map((piece) => ({ key: `move:${piece.id ?? ""}`, kind: "move" as const, piece }));
      /**
       * Copies get their own pages here too.
       *
       * Without this a café with four plants could only ever reach the newest
       * one, from the plant's shop page — the second one you put down was
       * unmovable and unsellable. Every piece in the room is now reachable
       * from one list.
       */
      const copies: ShopPage[] = state.instances.flatMap((instance) => {
        const item = shopItem(instance.item);
        return item
          ? [{ key: `copy:${instance.id}`, kind: "copy" as const, instanceId: instance.id, item }]
          : [];
      });
      return [...authored, ...copies];
    }
    if (tabId === STYLE_TAB) {
      return CUSTOMISATION.filter((c) => STYLE_PREVIEW_SLOT[c.id] !== undefined).map((c) => ({
        key: `style:${c.id}`,
        kind: "style" as const,
        category: c,
      }));
    }
    const pages: ShopPage[] = itemsInCategory(tabId).map((item) => ({
      key: `item:${item.id}`,
      kind: "item" as const,
      item,
    }));
    // The bed leads the cats department: it is the only thing in the shop that
    // changes how many cats the café can keep.
    if (tabId === "cats") pages.unshift({ key: "bed", kind: "bed" });
    return pages;
  }

  /**
   * Which department is open, or null for the front page.
   *
   * **The shop is two screens now, and the first one is a real front page.**
   * Ellis, 2026-08-12: *"i dont like how the shop horizontal nav bar for all
   * the options is laid out. its super underwhelming. like why is the option
   * to change all the colours of everything some little text button called
   * colours thats hidden and requires swiping for ages."* Dead right — a strip
   * of small text pills that scrolls off the edge is the worst possible home
   * for the feature the whole game is about, and it buried the newest one
   * where nobody would find it. Departments are big cards on a grid; every one
   * is visible at once, and each says what is in it.
   */
  let shopCategory: string | null = null;
  let shopIndex = 0;
  /** The hole in the panel the 3D item is drawn through, while the shop is up. */
  let shopStage: HTMLElement | null = null;
  let shopPreview: ShopPreview | null = null;
  let placePiece: ((layoutId: string, justBought?: boolean) => boolean) | null = null;
  let setExpanding: ((on: boolean) => void) | null = null;
  let applyGraphics: ((level: GraphicsLevel) => void) | null = null;
  let applyBackdrop: ((id: string) => void) | null = null;
  let choreMarker: ((chore: Chore | null) => void) | null = null;
  let replayTutorial: (() => void) | null = null;
  /** The walkthrough task the arrow is currently guiding, or null. */
  let pointedTask: string | null = null;

  /**
   * Where the arrow should be *right now*, given what the player has opened.
   *
   * Ellis: *"i press shop where the arrow is, then that arrow needs to go and a
   * new one at the for the cats section … arrow for everything. direct user
   * completely."* Exactly — an arrow that points at the shop button and then
   * stays there once the shop is open is worse than none, because it is now
   * pointing at the thing you already did.
   *
   * So the walkthrough names a *task*, not a control, and this resolves the
   * deepest step of that task's path that is currently on screen. Opening the
   * shop makes the department card exist, so the arrow moves to it by itself;
   * opening the department reveals the buy button, so it moves again. Nothing
   * has to tell it a panel changed.
   */
  /** How far into the current task's path the arrow has reached — see below. */
  let furthestGuideDepth = -1;
  const GUIDE_PATHS: Record<string, string[]> = {
    "buy-bed": ["shop", "dept-cats", "buy-bed"],
    adopt: ["adopt"],
    "pick-ingredient": ["cafe", "blends", "ingredient"],
    "invent-drink": ["cafe", "blends", "blend-name", "make-blend"],
    "buy-chair": ["shop", "dept-comfort", "buy-armchair"],
    // Placing happens in the world, under the player's finger. Nothing to
    // point at, and an arrow stuck to a button would be actively misleading.
    "place-bed": [],
    "place-chair": [],
  };


  /**
   * Close the shop and start placing a piece.
   *
   * **The room has to be rebuilt before the piece exists to grab**, and that
   * is asynchronous (the store change triggers `rebuildRoom`). So this retries
   * on animation frames rather than assuming — a few frames of nothing
   * happening is invisible, and a missed handoff would leave a bought item
   * sitting in its authored spot with no explanation.
   */
  function startPlacing(layoutId: string, justBought = false, attemptsLeft = 30): void {
    closePanel();
    if (placePiece?.(layoutId, justBought)) return;
    if (attemptsLeft > 0) {
      requestAnimationFrame(() => startPlacing(layoutId, justBought, attemptsLeft - 1));
    }
  }

  function renderShopPanel(): void {
    panelLayer.innerHTML = "";
    panelUpdate = null;

    const panel = el("div", "panel shop-panel");
    // Two slate blocks with a genuine transparent gap between them. The 3D
    // item is drawn to the *canvas*, which sits behind this layer, so the only
    // way to see it is for nothing to be painted in front — a panel background
    // (or the layer's usual blur) hides it completely. Hence `shop-open`.
    panelLayer.classList.add("shop-open");
    const head = el("div", "shop-head");

    // --- Front page: the departments, as cards --------------------------
    if (shopCategory === null) {
      panel.classList.add("shop-front");
      head.appendChild(panelHeader("the shop"));
      panel.appendChild(head);

      /**
       * Three tiers, and the shape is the argument.
       *
       * **Colours is a banner, not a card in the grid.** Ellis: *"colours
       * should be a seperate thing entirely."* He is right twice over — it is
       * the only department that changes what you already own rather than
       * selling you something, and as one tile among seven it read as an
       * afterthought while being the feature the game is most about.
       *
       * **And the grid is even.** Seven cards in two columns is four and
       * three, which looks like a mistake because it is one: *"its not
       * symetrical. 4 on the left and 3 on the right?? rly?"* Five furniture
       * departments now sit two-two-one with the last spanning the full width,
       * which reads as a deliberate layout rather than a leftover.
       */
      const deptCard = (dept: Department, variant: string): HTMLButtonElement => {
        const card = el("button", `hub-card ${variant}`) as HTMLButtonElement;
        card.classList.add(`dept-${dept.id}`);
        card.dataset.guide = `dept-${dept.id}`;
        const badge = el("div", "hub-card-icon");
        badge.appendChild(icon(dept.icon, "icon"));
        card.appendChild(badge);
        const text = el("div", "hub-card-text");
        text.appendChild(el("div", "hub-card-name", dept.name));
        text.appendChild(el("div", "hub-card-hint", dept.hint));
        text.appendChild(el("div", "hub-card-note", dept.count()));
        card.appendChild(text);
        card.addEventListener("click", () => {
          playTap();
          shopCategory = dept.id;
          shopIndex = 0;
          renderShopPanel();
        });
        return card;
      };

      const find = (id: string) => DEPARTMENTS.find((d) => d.id === id)!;
      panel.appendChild(deptCard(find(STYLE_TAB), "hub-card-banner"));

      panel.appendChild(el("div", "hub-section", "furniture"));
      const grid = el("div", "hub-grid");
      const furniture = SHOP_CATEGORIES.map((c) => find(c.id));
      furniture.forEach((dept, i) => {
        // An odd count would orphan the last tile, so it takes the whole row.
        const wide = i === furniture.length - 1 && furniture.length % 2 === 1;
        grid.appendChild(deptCard(dept, wide ? "hub-card-wide" : ""));
      });
      panel.appendChild(grid);

      panel.appendChild(el("div", "hub-section", "your café"));
      panel.appendChild(deptCard(find(ARRANGE_TAB), "hub-card-wide"));

      // Expansion isn't a pager — it happens *in the room*, so this card
      // closes the shop and lights up the floor instead of opening a panel.
      const state = gameStore.getState();
      const spots = expansionCandidates(state.tiles).length;
      // Builder mode is not a pager — it happens *in the room*, so this card
      // closes the shop and hands the café over to the tools.
      const patches = ownedPatches(state.tiles).length;
      const extend = hubCard({
        icon: "tool",
        name: "builder",
        hint: "lay floor, change the walls, change the boards.",
        note:
          patches >= MAX_PATCHES
            ? "floor is maxed · styles to change"
            : `${spots} spots · ${formatMoney(expansionCost(patches))}`,
        variant: "hub-card-wide hub-card-extend",
        onOpen: () => {
          closePanel();
          setExpanding?.(true);
        },
      });
      panel.appendChild(extend);

      // No stage on the front page: nothing is spinning, so the canvas must
      // not be asked to draw into a rect that isn't there (and the resolution
      // boost must switch back off).
      shopStage = null;
      panelUpdate = () => {
        shopStage = null;
      };
      panelLayer.appendChild(panel);
      panelLayer.classList.add("open");
      return;
    }

    // --- A department: back, then the pager -----------------------------
    const dept = DEPARTMENTS.find((d) => d.id === shopCategory);
    const bar = el("div", "shop-back-bar");
    const back = el("button", "shop-back") as HTMLButtonElement;
    back.appendChild(icon("chevronLeft", "icon"));
    back.appendChild(el("span", "shop-back-label", "shop"));
    back.addEventListener("click", () => {
      playTap();
      shopCategory = null;
      shopIndex = 0;
      renderShopPanel();
    });
    bar.appendChild(back);
    head.appendChild(bar);
    head.appendChild(panelHeader(dept?.name.toLowerCase() ?? "the shop"));
    panel.appendChild(head);

    let pages = pagesFor(shopCategory);
    shopIndex = Math.min(shopIndex, Math.max(0, pages.length - 1));

    // The stage the 3D item is drawn into. Deliberately empty in the DOM —
    // it is a hole in the interface that the WebGL canvas shows through.
    const stage = el("div", "shop-stage");
    stage.appendChild(el("div", "shop-stage-glow"));
    panel.appendChild(stage);

    const foot = el("div", "shop-foot");
    const nav = el("div", "shop-nav");
    const prev = el("button", "shop-arrow", "\u2039") as HTMLButtonElement;
    const next = el("button", "shop-arrow", "\u203a") as HTMLButtonElement;
    const dots = el("div", "shop-dots");
    nav.appendChild(prev);
    nav.appendChild(dots);
    nav.appendChild(next);
    foot.appendChild(nav);

    const name = el("div", "shop-item-name");
    const blurb = el("div", "shop-item-blurb");
    foot.appendChild(name);
    foot.appendChild(blurb);

    // What you do with the thing on the stage: one buy button for furniture, a
    // row of colourways for a style page. Rebuilt only when the page changes —
    // `show()` runs every frame, so building DOM in it would thrash.
    const action = el("div", "shop-action");
    foot.appendChild(action);
    panel.appendChild(foot);

    let builtKey = "";
    let refreshAction: () => void = () => {};
    /** A colourway being pressed but not yet bought — shown on the stage. */
    let peeking: string | null = null;

    /**
     * A piece of furniture: buy it, or — once it's yours — move it.
     *
     * **Buying drops you straight into placing it.** Ellis: *"if i buy an item
     * id like it to open some sort of placer mode where the object is
     * transparent and either red glow if it cant be placed or green if it
     * can."* That is also what makes the shop a real editor rather than a
     * catalogue: you never buy something and then go hunting for where it
     * landed. And it is the same flow for a piece you already own, which is
     * how "move" survived the death of press-and-hold.
     */
    function buildItemAction(item: ShopItem): void {
      const buy = el("button", "shop-buy-big") as HTMLButtonElement;
      buy.dataset.guide = `buy-${item.id}`;
      const tag = el("span", "shop-price-tag");
      const buyLabel = el("span", "shop-buy-label");
      buy.appendChild(buyLabel);
      buy.appendChild(tag);
      /**
       * Once you own one, the big button sells you another and a quieter one
       * offers to move what you have.
       *
       * Ellis, 2026-08-25: *"should be able to buy multiple of furniture and
       * stuff too and it track accurately how many of each i have."* Buying
       * gets the loud button because that is what a shop is for; moving is
       * still one tap, and it is also on the arrange page.
       */
      const move = el("button", "shop-buy-again", "move one") as HTMLButtonElement;
      buy.addEventListener("click", () => {
        initAudio();
        const state = gameStore.getState();
        if (!state.purchased.includes(item.id)) {
          if (state.buyShopItem(item.id)) {
            // No chime here: the sale completes when the piece is put down
            // (`settlePurchase`), and that is where the noise belongs.
            playTap();
            startPlacing(item.place ?? item.id, true);
            return;
          }
          playTap();
          show();
          return;
        }
        const id = state.buyCopy(item.id);
        if (!id) {
          playTap();
          show();
          return;
        }
        playPurchase();
        startPlacing(id, true);
      });
      move.addEventListener("click", () => {
        initAudio();
        playTap();
        // The authored piece if there is one, otherwise the newest copy —
        // there is always something to pick up if the button is showing.
        const state = gameStore.getState();
        const copies = state.instances.filter((i) => i.item === item.id);
        startPlacing(item.place ?? copies[copies.length - 1]?.id ?? item.id);
      });
      action.appendChild(buy);
      action.appendChild(move);

      refreshAction = () => {
        const state = gameStore.getState();
        const count = ownedCount(state, item.id);
        const unlocked = !item.unlock || item.unlock.met(currentProgress(state));
        const price = count === 0 ? item.price : copyPrice(item, count);
        buy.classList.toggle("owned", count > 0);
        buy.disabled = !unlocked || state.money < price;
        buyLabel.textContent = count === 0 ? "add to café" : !unlocked ? "locked" : "one more";
        tag.textContent = unlocked ? formatMoney(price) : "";
        move.hidden = count === 0;
        blurb.textContent =
          count === 0
            ? item.blurb
            : `${item.blurb} ${count} in your café.`;
      };
    }

    /**
     * A colourway category: the swatch row, same tiles as the hold-to-recolour
     * sheet so the two routes to the same choice look like the same thing.
     *
     * **Pressing a swatch shows that colour on the stage before you pay for
     * it.** The stage otherwise shows what's already in the café, which would
     * make this the one shop page where you cannot see what you are buying.
     * There is nothing to teach: your finger is already on the swatch when the
     * piece changes, and lifting it either buys the colour or puts it back.
     */
    function buildStyleAction(category: CustomisationCategory): void {
      const row = el("div", "style-row");
      const refreshers: (() => void)[] = [];

      for (const option of category.options) {
        const tile = el("button", "style-tile") as HTMLButtonElement;
        const swatch = el("div", "style-swatch");
        swatch.style.background = option.swatch;
        tile.appendChild(swatch);
        tile.appendChild(el("div", "style-name", option.name));
        const note = el("div", "style-note");
        tile.appendChild(note);

        // Locked options peek too, deliberately: §9 keeps a locked swatch
        // coloured rather than greyed because the colour you're working
        // toward is the reason to work toward it. Seeing it on the sofa is
        // that argument, louder.
        const peekOn = () => {
          peeking = option.id;
          show();
        };
        const peekOff = () => {
          if (peeking !== option.id) return;
          peeking = null;
          show();
        };
        tile.addEventListener("pointerdown", peekOn);
        tile.addEventListener("pointerenter", peekOn);
        tile.addEventListener("pointerup", peekOff);
        tile.addEventListener("pointerleave", peekOff);
        tile.addEventListener("pointercancel", peekOff);

        tile.addEventListener("click", () => {
          initAudio();
          if (gameStore.getState().chooseCustomisation(category.id, option.id)) {
            playPurchase();
          } else {
            playTap();
          }
          // Straight onto the stage: the whole point of putting colours in the
          // shop is watching the piece change.
          peeking = null;
          show();
        });

        refreshers.push(() => {
          const state = gameStore.getState();
          const unlocked = isUnlocked(option, currentProgress(state));
          const owned = option.price === 0 || state.owned.includes(`${category.id}:${option.id}`);
          const chosen = state.customisation[category.id] === option.id;
          const affordable = state.money >= option.price;

          tile.classList.toggle("locked", !unlocked);
          tile.classList.toggle("chosen", chosen);
          tile.disabled = !unlocked || (!owned && !affordable);

          // A locked row says what to go and do, never just "locked" (§9).
          if (!unlocked) note.textContent = option.unlock?.label ?? "Locked";
          else if (chosen) note.textContent = "In your café";
          else if (owned) note.textContent = "Tap to use";
          else note.textContent = formatMoney(option.price);
        });

        row.appendChild(tile);
      }

      action.appendChild(row);
      refreshAction = () => {
        for (const refresh of refreshers) refresh();
      };
    }

    /**
     * The cat bed: the one thing in the shop you can buy over and over.
     *
     * It is a different control from everything else because it answers a
     * different question — not "do I own this?" but "how many?" — and because
     * the count is the café's cat capacity, which is the thing the player
     * actually cares about.
     */
    function buildBedAction(): void {
      const buy = el("button", "shop-buy-big") as HTMLButtonElement;
      buy.dataset.guide = "buy-bed";
      const tag = el("span", "shop-price-tag");
      const buyLabel = el("span", "shop-buy-label");
      buy.appendChild(buyLabel);
      buy.appendChild(tag);
      buy.addEventListener("click", () => {
        initAudio();
        const id = gameStore.getState().buyBed();
        if (!id) {
          playTap();
          return;
        }
        playPurchase();
        startPlacing(id, true);
      });
      action.appendChild(buy);

      refreshAction = () => {
        const state = gameStore.getState();
        const owned = beds(state.placements, state.instances);
        const spare = freeBeds(owned, state.cats).length;
        const cost = bedCost(owned.length);
        buyLabel.textContent = "another bed";
        tag.textContent = formatMoney(cost);
        buy.disabled = state.money < cost;
        blurb.textContent = `${owned.length} ${owned.length === 1 ? "bed" : "beds"} · ${spare} free. one cat per bed.`;
      };
    }

    /** A copy: move it, or sell it back for half. */
    function buildCopyAction(instanceId: string): void {
      const move = el("button", "shop-buy-big") as HTMLButtonElement;
      move.appendChild(el("span", "shop-buy-label", "move it"));
      move.addEventListener("click", () => {
        initAudio();
        playTap();
        startPlacing(instanceId);
      });
      const sell = el("button", "shop-buy-again", "sell it back") as HTMLButtonElement;
      sell.addEventListener("click", () => {
        initAudio();
        playPurchase();
        gameStore.getState().sellInstance(instanceId);
        // The page it was on is gone, so rebuild the pager rather than leaving
        // a card describing something the café no longer has.
        pages = pagesFor(shopCategory ?? ARRANGE_TAB);
        shopIndex = Math.min(shopIndex, Math.max(0, pages.length - 1));
        builtKey = "";
        show();
      });
      action.appendChild(move);
      action.appendChild(sell);
      refreshAction = () => {};
    }

    /** An owned piece, with one button: pick it up. */
    function buildMoveAction(piece: Placement): void {
      const move = el("button", "shop-buy-big") as HTMLButtonElement;
      move.appendChild(el("span", "shop-buy-label", "move it"));
      move.addEventListener("click", () => {
        initAudio();
        playTap();
        if (piece.id) startPlacing(piece.id);
      });
      action.appendChild(move);
      refreshAction = () => {};
    }

    function show(): void {
      const page = pages[shopIndex];
      if (!page) return;
      const state = gameStore.getState();

      if (page.kind === "bed") {
        name.textContent = "cat bed";
        shopPreview?.setItem(bedAsset(state.customisation));
      } else if (page.kind === "copy") {
        name.textContent = page.item.name;
        blurb.textContent = "one of yours. move it, or sell it back for half.";
        shopPreview?.setItem(copyAsset(page.item));
      } else if (page.kind === "move") {
        const asset = page.piece.slot
          ? (chosenAssets(state.customisation)[page.piece.slot] ?? page.piece.asset)
          : page.piece.asset;
        name.textContent =
          (page.piece.id ? MOVABLE_LABELS[page.piece.id] : undefined) ?? tidyAssetName(asset);
        blurb.textContent = "drag it onto a block, anywhere it fits.";
        shopPreview?.setItem(asset);
      } else if (page.kind === "item") {
        const unlocked = !page.item.unlock || page.item.unlock.met(currentProgress(state));
        name.textContent = page.item.name;
        blurb.textContent = unlocked
          ? `${page.item.blurb} +${page.item.appeal.toFixed(1)} appeal`
          : (page.item.unlock?.label ?? "locked");
        shopPreview?.setItem(unlocked ? page.item.preview : null);
      } else {
        name.textContent = page.category.name;
        // **Say how many it changes.** A colourway belongs to a *slot*, not to
        // one object, so recolouring the cat bed recolours every cat bed —
        // which the page did not say anywhere, and reads as the game thinking
        // you only own one (Ellis, 2026-08-26: *"its implying theres only 1
        // sofa, 1 table etc which idk how that works when i have multiple"*).
        // Saying it plainly is the honest fix; per-object colours would be a
        // different feature, and a much larger one.
        {
          const pieces = piecesInCategory(state, page.category.id);
          blurb.textContent =
            pieces > 1
              ? `${page.category.hint} changes all ${pieces} of them.`
              : page.category.hint;
        }
        // Whatever colourway is in the café — or the one under your finger, so
        // you can see a colour before buying it.
        const shown = peeking
          ? { ...state.customisation, [page.category.id]: peeking }
          : state.customisation;
        shopPreview?.setItem(chosenAssets(shown)[STYLE_PREVIEW_SLOT[page.category.id]] ?? null);
      }

      if (page.key !== builtKey) {
        builtKey = page.key;
        action.innerHTML = "";
        if (page.kind === "bed") buildBedAction();
        else if (page.kind === "copy") buildCopyAction(page.instanceId);
        else if (page.kind === "item") buildItemAction(page.item);
        else if (page.kind === "move") buildMoveAction(page.piece);
        else buildStyleAction(page.category);
      }
      refreshAction();

      dots.innerHTML = "";
      for (let i = 0; i < pages.length; i++) {
        const dot = el("span", "shop-dot");
        const other = pages[i];
        dot.classList.toggle("active", i === shopIndex);
        dot.classList.toggle(
          "owned",
          other.kind === "item" && state.purchased.includes(other.item.id),
        );
        dots.appendChild(dot);
      }
      prev.disabled = pages.length < 2;
      next.disabled = pages.length < 2;
    }

    const step = (by: number) => {
      playTap();
      shopIndex = (shopIndex + by + pages.length) % pages.length;
      show();
    };
    prev.addEventListener("click", () => step(-1));
    next.addEventListener("click", () => step(1));

    // **Dragging the stage turns the piece; it no longer pages.** Swipe-to-page
    // and swipe-to-swivel are the same gesture, and turning the object is the
    // one you'd expect from something spinning on a turntable — paging has the
    // arrows and dots. A quick flick with no real movement still pages, so the
    // carousel doesn't lose its most obvious control.
    let dragFrom: number | null = null;
    let dragLast = 0;
    let dragged = 0;
    stage.addEventListener("pointerdown", (e) => {
      dragFrom = e.clientX;
      dragLast = e.clientX;
      dragged = 0;
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener("pointermove", (e) => {
      if (dragFrom === null) return;
      const dx = e.clientX - dragLast;
      dragLast = e.clientX;
      dragged += Math.abs(dx);
      shopPreview?.swivel(dx * 0.012);
    });
    stage.addEventListener("pointerup", (e) => {
      if (dragFrom === null) return;
      const total = e.clientX - dragFrom;
      dragFrom = null;
      if (dragged < 6 && Math.abs(total) > 30) step(total < 0 ? 1 : -1);
    });

    show();
    // Prices grey in as the till fills, and the stage rect moves as the panel
    // scrolls, so both are refreshed every frame the panel is open.
    panelUpdate = () => {
      show();
      shopStage = stage;
    };
    shopStage = stage;

    panelLayer.appendChild(panel);
    panelLayer.classList.add("open");
  }

  /**
   * The level-up card.
   *
   * **It is a full card and not a chip, on purpose.** The first version was a
   * little "level 3" pill next to the ring, on the reasoning that a cosy game
   * should never interrupt — and Ellis's verdict was that it needed to be *the
   * opposite*: *"i need a nice big obvious level up animation that occurs and
   * says congrats with some pretty cats showing or something nice."* He is
   * right, and the earlier reasoning confused two things. Pillar 1 forbids
   * *pressure* — timers, punishments, things you must dismiss to avoid loss —
   * not celebration. A reward you can miss entirely is not a reward.
   *
   * The cats are the celebration: this is a game about a room full of cats you
   * named, so the card shows *yours*, by name, rather than an abstract badge.
   */
  function showLevelUp(level: number): void {
    modalLayer.innerHTML = "";

    const card = el("div", "reveal-card level-card");

    // Confetti, drawn rather than emoji (§9), and randomised so a second
    // level-up doesn't play the identical pattern.
    const sparkles = el("div", "level-sparkles");
    for (let i = 0; i < 14; i++) {
      const bit = el("span", "level-sparkle");
      bit.appendChild(icon(i % 3 === 0 ? "heart" : i % 3 === 1 ? "paw" : "coin"));
      bit.style.left = `${6 + Math.random() * 88}%`;
      bit.style.animationDelay = `${Math.random() * 0.5}s`;
      bit.style.animationDuration = `${1.6 + Math.random() * 1.1}s`;
      bit.style.setProperty("--drift", `${(Math.random() - 0.5) * 60}px`);
      sparkles.appendChild(bit);
    }
    card.appendChild(sparkles);

    card.appendChild(el("div", "reveal-title", "congratulations"));

    const badge = el("div", "level-badge");
    badge.appendChild(el("span", "level-badge-word", "level"));
    badge.appendChild(el("span", "level-badge-number", String(level)));
    card.appendChild(badge);

    const { cats, player } = gameStore.getState();
    // The name can be empty for one frame during setup, and "is getting
    // lovelier" with nothing in front of it reads as a broken string.
    card.appendChild(
      el(
        "div",
        "reveal-flavor",
        `${player.cafeName || "your café"} is getting lovelier. the cats approve.`,
      ),
    );

    const row = el("div", "level-cats");
    for (const cat of cats) {
      const cell = el("div", "level-cat");
      cell.appendChild(catSwatch(catDefinition(cat.definitionId)));
      // The player's own capitals, untouched (§9).
      cell.appendChild(el("div", "level-cat-name", cat.name));
      row.appendChild(cell);
    }
    card.appendChild(row);

    const confirm = el("button", "reveal-confirm", "lovely") as HTMLButtonElement;
    confirm.addEventListener("click", () => {
      playTap();
      modalLayer.classList.remove("open");
      modalLayer.innerHTML = "";
    });
    card.appendChild(confirm);

    modalLayer.appendChild(card);
    modalLayer.classList.add("open");
    playReveal(0.85);
  }

  /**
   * The profile page: who you are, and a few numbers about the café.
   *
   * Ellis: *"want to be able to press my level / profile thing and open a
   * little profile page with some simple nice little stats about the shop."*
   *
   * The restraint here is the point. These are **keepsakes, not KPIs** — cups
   * poured, cats taken in, blends invented. Nothing here is a target, nothing
   * is compared against a previous week, and nothing tells the player they are
   * behind (pillar 1). If a number cannot be read fondly, it does not belong.
   */
  function renderProfilePanel(): void {
    panelLayer.innerHTML = "";
    panelUpdate = null;

    const state = gameStore.getState();
    const progress = levelProgress(state.xp);

    const panel = el("div", "panel");
    panel.appendChild(panelHeader(state.player.cafeName || "your café"));

    const head = el("div", "profile-head");
    const bigRing = el("div", "level-ring level-ring-big");
    bigRing.innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true">
        <circle class="level-ring-track" cx="20" cy="20" r="16.5" />
        <circle class="level-ring-fill" cx="20" cy="20" r="16.5" />
      </svg>`;
    const bigFill = bigRing.querySelector(".level-ring-fill") as SVGCircleElement;
    const circumference = 2 * Math.PI * 16.5;
    bigFill.style.strokeDasharray = `${circumference}`;
    bigFill.style.strokeDashoffset = `${circumference * (1 - progress.fraction)}`;
    bigRing.appendChild(el("span", "level-number", String(progress.level)));
    head.appendChild(bigRing);

    const who = el("div", "profile-who");
    who.appendChild(el("div", "profile-who-name", state.player.name || "the owner"));
    who.appendChild(
      el("div", "profile-who-sub", `level ${progress.level} · ${progress.into}/${progress.needed} xp`),
    );
    head.appendChild(who);
    panel.appendChild(head);

    const cups = Object.values(state.sales).reduce((a, b) => a + b, 0);
    const facts = el("div", "fact-list");
    const fact = (label: string, value: string) => {
      const row = el("div", "fact-row");
      row.appendChild(el("span", "fact-label", label));
      row.appendChild(el("span", "fact-value", value));
      facts.appendChild(row);
    };
    fact("cats taken in", String(state.cats.length));
    fact("breeds discovered", `${discoveredBreeds(state.cats).size} of ${CAT_DEFINITIONS.length}`);
    fact("cups poured", cups.toLocaleString("en-GB"));
    fact("on the menu", String(currentMenu(state).length));
    fact("blends invented", String(state.customDrinks.length));
    fact("furniture owned", `${state.purchased.length} of ${SHOP_ITEMS.length}`);
    fact("squares of floor", String(ownedTiles(state.tiles).length));
    fact("lifetime xp", state.xp.toLocaleString("en-GB"));
    panel.appendChild(facts);

    panelLayer.appendChild(panel);
    panelLayer.classList.add("open");
  }

  /**
   * The backdrop picker: a row of colour discs.
   *
   * Shared by settings and character creation, because it is the same choice
   * in both places and a player who changes their mind should meet the control
   * they already know.
   */
  function backdropSwatches(onPick?: (id: string) => void): HTMLElement {
    // `onPick` is only passed during setup, where every colour is free — so it
    // doubles as "are we in setup?" and decides whether prices are shown.
    const free = onPick !== undefined;
    const wrap = el("div", "swatch-wrap");
    const row = el("div", "swatch-row");
    wrap.appendChild(row);
    const caption = el("div", "swatch-caption");
    wrap.appendChild(caption);

    for (const option of BACKDROPS) {
      const cell = el("div", "swatch-cell");
      const swatch = el("button", "backdrop-swatch") as HTMLButtonElement;
      swatch.style.background = option.swatch;
      swatch.setAttribute("aria-label", option.name);
      swatch.dataset.backdrop = option.id;
      const tag = el("div", "swatch-price");
      cell.appendChild(swatch);
      cell.appendChild(tag);

      swatch.addEventListener("click", () => {
        initAudio();
        if (free) {
          gameStore.getState().setBackdrop(option.id);
          applyBackdrop?.(option.id);
          onPick?.(option.id);
          playTap();
        } else if (gameStore.getState().setBackdrop(option.id)) {
          applyBackdrop?.(option.id);
          playPurchase();
        } else {
          playTap();
          caption.textContent = `${formatMoney(option.price)} — not enough in the till yet`;
          return;
        }
        paint();
      });
      row.appendChild(cell);
    }

    function paint(): void {
      const state = gameStore.getState();
      const current = state.player.backdrop;
      caption.textContent = free
        ? "you can change it later."
        : "bought once, yours to switch back to whenever.";
      for (const cell of row.querySelectorAll<HTMLElement>(".swatch-cell")) {
        const swatch = cell.querySelector<HTMLElement>(".backdrop-swatch")!;
        const id = swatch.dataset.backdrop ?? "";
        const option = BACKDROPS.find((b) => b.id === id)!;
        const owned = free || option.price === 0 || state.backdropsOwned.includes(id);
        swatch.classList.toggle("on", id === current);
        cell.querySelector<HTMLElement>(".swatch-price")!.textContent = owned
          ? ""
          : formatMoney(option.price);
        (swatch as HTMLButtonElement).disabled = !owned && state.money < option.price;
      }
    }
    paint();
    return wrap;
  }

  // --- Settings -------------------------------------------------------------
  //
  // Deliberately tiny. It exists because muting wanted a home that wasn't the
  // top-right corner of the screen, and because there was nowhere to put the
  // next small switch either. Add rows here rather than pinning icons to the
  // HUD.
  function renderSettingsPanel(): void {
    panelLayer.innerHTML = "";
    panelUpdate = null;

    const panel = el("div", "panel");
    panel.appendChild(panelHeader("settings"));

    const row = el("div", "setting-row");
    const label = el("div", "setting-label");
    label.appendChild(el("div", "setting-name", "sound"));
    label.appendChild(
      el("div", "setting-hint", "purrs, coins and the room tone. half the cosiness."),
    );
    row.appendChild(label);

    const toggle = el("button", "setting-toggle") as HTMLButtonElement;
    const paintToggle = () => {
      toggle.classList.toggle("on", !isMuted());
      toggle.replaceChildren(icon(isMuted() ? "muted" : "sound"));
      toggle.setAttribute("aria-pressed", String(!isMuted()));
    };
    paintToggle();
    toggle.addEventListener("click", () => {
      initAudio();
      setMuted(!isMuted());
      paintToggle();
      if (!isMuted()) playTap();
    });
    row.appendChild(toggle);
    panel.appendChild(row);

    const musicRow = el("div", "setting-row");
    const musicLabel = el("div", "setting-label");
    musicLabel.appendChild(el("div", "setting-name", "music"));
    musicLabel.appendChild(
      el("div", "setting-hint", "the room's own quiet tone, under everything else."),
    );
    musicRow.appendChild(musicLabel);
    const musicToggle = el("button", "setting-toggle") as HTMLButtonElement;
    const paintMusic = () => {
      const on = !gameStore.getState().player.musicMuted;
      musicToggle.classList.toggle("on", on);
      musicToggle.replaceChildren(icon(on ? "sound" : "muted"));
      musicToggle.setAttribute("aria-pressed", String(on));
    };
    paintMusic();
    musicToggle.addEventListener("click", () => {
      initAudio();
      const next = !gameStore.getState().player.musicMuted;
      gameStore.getState().setMusicMuted(next);
      setMusicMuted(next);
      paintMusic();
      playTap();
    });
    musicRow.appendChild(musicToggle);
    panel.appendChild(musicRow);

    // --- Show me round again ----------------------------------------------
    //
    // The walkthrough runs once, on a first morning. Without this there is no
    // way back to it — and an existing café never saw it at all, because save
    // v20 marks anyone who had already played as done. That guard is right
    // (nobody five levels in wants telling what the shop button is) but it
    // must not be the *only* answer, or the feature is unreachable for exactly
    // the person who asked for it.
    const guideRow = el("div", "setting-row");
    const guideLabel = el("div", "setting-label");
    guideLabel.appendChild(el("div", "setting-name", "show me round again"));
    guideLabel.appendChild(
      el("div", "setting-hint", "mal comes back and walks you through the place."),
    );
    guideRow.appendChild(guideLabel);
    const guideButton = el("button", "setting-toggle") as HTMLButtonElement;
    guideButton.appendChild(icon("cup"));
    guideButton.addEventListener("click", () => {
      playTap();
      closePanel();
      replayTutorial?.();
    });
    guideRow.appendChild(guideButton);
    panel.appendChild(guideRow);

    // --- The colour outside ----------------------------------------------
    const backdropRow = el("div", "setting-row setting-row-stacked");
    const backdropLabel = el("div", "setting-label");
    backdropLabel.appendChild(el("div", "setting-name", "the colour outside"));
    backdropLabel.appendChild(
      el("div", "setting-hint", "the biggest patch of colour on the screen, and the one bit that isn't the café."),
    );
    backdropRow.appendChild(backdropLabel);
    backdropRow.appendChild(backdropSwatches());
    panel.appendChild(backdropRow);

    // --- Resolution ------------------------------------------------------
    //
    // A player setting rather than a constant because the limit is a property
    // of the phone, and we cannot measure that from here — rendering at native
    // ratio killed the app on Ellis's iPhone (`data/graphics.ts`). The only
    // honest answer is to let the device's owner find its ceiling, so the
    // wording says plainly what happens if they overshoot.
    const graphicsRow = el("div", "setting-row setting-row-stacked");
    const graphicsLabel = el("div", "setting-label");
    graphicsLabel.appendChild(el("div", "setting-name", "picture"));
    const graphicsHint = el("div", "setting-hint");
    graphicsLabel.appendChild(graphicsHint);
    graphicsRow.appendChild(graphicsLabel);

    const levels = el("div", "chip-row");
    const paintLevels = () => {
      const current = gameStore.getState().player.graphics;
      graphicsHint.textContent =
        GRAPHICS_LEVELS.find((l) => l.id === current)?.hint ?? "";
      for (const chip of levels.querySelectorAll<HTMLButtonElement>(".pick-chip")) {
        chip.classList.toggle("on", chip.dataset.level === current);
      }
    };
    for (const level of GRAPHICS_LEVELS) {
      const chip = el("button", "pick-chip") as HTMLButtonElement;
      chip.dataset.level = level.id;
      chip.appendChild(el("span", "pick-chip-label", level.name));
      chip.addEventListener("click", () => {
        playTap();
        gameStore.getState().setGraphics(level.id);
        applyGraphics?.(level.id);
        paintLevels();
      });
      levels.appendChild(chip);
    }
    graphicsRow.appendChild(levels);
    paintLevels();
    panel.appendChild(graphicsRow);

    // --- Testing ----------------------------------------------------------
    //
    // Compiled out unless the build asked for it (`npm run ios:test`), so a
    // "fill my till" switch can never reach a real player. It exists because
    // the device is the only place performance can be judged, and everything
    // expensive now sits behind hours of play.
    if (import.meta.env.VITE_TEST_TOOLS === "1") {
      const testRow = el("div", "setting-row");
      const testLabel = el("div", "setting-label");
      testLabel.appendChild(el("div", "setting-name", "testing: full till"));
      testLabel.appendChild(
        el("div", "setting-hint", "keeps the money topped up and grants levels."),
      );
      testRow.appendChild(testLabel);
      const testToggle = el("button", "setting-toggle") as HTMLButtonElement;
      const paintTest = () => {
        testToggle.classList.toggle("on", isSandbox());
        testToggle.replaceChildren(icon("coin"));
      };
      paintTest();
      testToggle.addEventListener("click", () => {
        setSandbox(!isSandbox());
        if (isSandbox()) gameStore.getState().grantXp(3000);
        paintTest();
      });
      testRow.appendChild(testToggle);
      panel.appendChild(testRow);
    }

    panel.appendChild(
      el("div", "panel-note", `you are ${gameStore.getState().player.name}, and this is ${gameStore.getState().player.cafeName}.`),
    );

    panelLayer.appendChild(panel);
    panelLayer.classList.add("open");
  }

  // --- Welcome back / offline earnings (§8) --------------------------------
  function showWelcomeBack(earned: number, awayMs: number): void {
    modalLayer.innerHTML = "";

    const card = el("div", "reveal-card");
    card.appendChild(el("div", "reveal-title", "welcome back"));
    card.appendChild(el("div", "welcome-earned", `+${formatMoney(earned)}`));
    card.appendChild(
      el(
        "div",
        "reveal-flavor",
        `your cats kept the café cosy while you were away (${formatDuration(awayMs)}).`,
      ),
    );
    const confirm = el("button", "reveal-confirm", "thanks, everyone") as HTMLButtonElement;
    confirm.addEventListener("click", () => {
      modalLayer.classList.remove("open");
      modalLayer.innerHTML = "";
    });
    card.appendChild(confirm);

    modalLayer.appendChild(card);
    modalLayer.classList.add("open");
  }

  /** Say why a tap did nothing, then put the hint back. */
  let hintTimer = 0;
  function refuse(reason: string): void {
    playTap();
    adoptHint.textContent = reason;
    adoptButton.classList.remove("refused");
    // Reflow, or re-adding the class in the same frame won't restart the
    // animation and a second tap looks as dead as the first.
    void adoptButton.offsetWidth;
    adoptButton.classList.add("refused");
    window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => {
      adoptHint.textContent = "surprise breed";
      adoptButton.classList.remove("refused");
    }, 2200);
  }

  /**
   * Ask before spending.
   *
   * **The old flow committed the money on the first tap** and then showed a
   * card with only "welcome home" on it — no cancel, no back. Ellis: "theres
   * no way to undo or go back ur forced to adopt one."
   *
   * Confirming *before* the draw is the right place for the escape hatch, and
   * not merely the easiest: letting someone back out *after* seeing the rarity
   * would be a free reroll, and this is a gacha (§5). You can always decline
   * the spend; you can never fish for a legendary.
   */
  function confirmAdoption(cost: number): void {
    modalLayer.innerHTML = "";
    const card = el("div", "reveal-card confirm-card");
    card.appendChild(el("div", "reveal-title", "adopt a cat?"));
    card.appendChild(
      el("div", "reveal-flavor", "a surprise breed comes home with you today."),
    );
    card.appendChild(el("div", "confirm-price", formatMoney(cost)));

    const buttons = el("div", "confirm-buttons");
    const no = el("button", "confirm-no", "not today");
    const yes = el("button", "reveal-confirm", "adopt");
    buttons.appendChild(no);
    buttons.appendChild(yes);
    card.appendChild(buttons);

    const close = (): void => {
      modalLayer.classList.remove("open");
      modalLayer.innerHTML = "";
    };
    no.addEventListener("click", () => {
      playTap();
      close();
    });
    yes.addEventListener("click", () => {
      const cat = gameStore.getState().adoptCat();
      close();
      if (!cat) return;
      playReveal(REVEAL_INTENSITY[catDefinition(cat.definitionId).rarity] ?? 0.3);
      showAdoptionModal(cat);
    });

    modalLayer.appendChild(card);
    modalLayer.classList.add("open");
  }

  adoptButton.addEventListener("click", () => {
    initAudio();
    const state = gameStore.getState();
    const cost = costForNextCat(state.cats.length);

    // **Never fail silently.** This button did nothing at all when you couldn't
    // afford a cat or the café was full, which reads as a broken app rather
    // than as a rule.
    const spare = freeBeds(beds(state.placements, state.instances), state.cats);
    if (spare.length === 0) {
      // A rule the player can act on, not a wall: the shop sells beds.
      refuse("no spare bed — buy another from the shop");
      return;
    }
    if (state.money < cost) {
      refuse(`${formatMoney(cost - state.money)} more to go`);
      return;
    }

    playTap();
    confirmAdoption(cost);
  });

  function openRoster(): void {
    initAudio();
    playTap();
    setExpanding?.(false);
    const { cats } = gameStore.getState();
    logEvent({
      name: "roster_opened",
      catCount: cats.length,
      breedsDiscovered: discoveredBreeds(cats).size,
    });
    renderRosterPanel();
  }
  rosterButton.addEventListener("click", openRoster);
  catChip.addEventListener("click", openRoster);

  cafeButton.addEventListener("click", () => {
    initAudio();
    playTap();
    setExpanding?.(false);
    const state = gameStore.getState();
    logEvent({
      name: "cafe_opened",
      seats: currentCafeStats(state).seatCount,
      upgradeLevels: totalUpgradeLevels(state.upgrades),
    });
    renderCafePanel();
  });

  shopButton.addEventListener("click", () => {
    initAudio();
    playTap();
    setExpanding?.(false);
    // **Always the front page.** The department you were last in is not where
    // you want to arrive next time — the nav button says "shop", so it opens
    // the shop, not wherever you happened to leave off (Ellis, 2026-08-13).
    shopCategory = null;
    shopIndex = 0;
    renderShopPanel();
  });

  // --- HUD render loop -----------------------------------------------------
  let lastMoney = gameStore.getState().money;

  /**
   * Hand the marker the longest-overdue job, or nothing.
   *
   * Called from `render` (so it follows every state change) *and* on a slow
   * timer, because a chore comes due by the clock rather than by anything the
   * player did — without the timer it would only appear the next time
   * something else happened to change.
   */
  function syncChores(): void {
    const state = gameStore.getState();
    // **Not while the guide is talking.** The window comes due five seconds
    // after she leaves, which is the point — but a second thing asking for
    // attention while she is mid-sentence is exactly the noise the walkthrough
    // exists to avoid (Ellis, 2026-08-26: *"the wipe the window pop up is
    // there right from as soon as i start the tutorial rather than after it"*).
    const due = state.player.tutorialDone
      ? (dueChores(state.chores, state.openedAt, Date.now())[0] ?? null)
      : null;
    choreMarker?.(due);
  }
  // A minute is fine: chores come due hours apart, and this only decides how
  // promptly the marker notices.
  window.setInterval(syncChores, 60_000);

  function render() {
    syncChores();
    const state = gameStore.getState();
    const { money, cats, upgrades } = state;
    moneyValue.textContent = formatMoney(money);
    const fullness = Math.min(1, money / ECONOMY_CONFIG.tillCapacity);
    tillFill.style.transform = `scaleX(${fullness.toFixed(3)})`;
    moneyPill.classList.toggle("till-full", fullness >= 0.999);

    // How many cats are content, so the effect of petting is visible — an
    // unexplained multiplier may as well not exist.
    const content = contentCatCount(cats, Date.now());
    catChipCount.textContent = String(cats.length);
    heartChipCount.textContent = String(content);
    catChip.classList.toggle("has-content", content > 0);

    /**
     * When appeal goes up, say so.
     *
     * Ellis: *"there should be a super satisfying cute little animation
     * showing when appeal goes up and subsequently the hr money."* The
     * satisfying part is the *causation* being visible — the appeal number
     * pops, and the takings pop a beat later, so the chips read as one
     * consequence following another rather than two numbers changing at once.
     * Contentment makes appeal drift up and down on its own, so only a real
     * rise counts, and only one worth seeing.
     */
    const stats = currentCafeStats(state);
    const rate = liveIncomePerSecond(stats) * 3600;
    appealValueChip.textContent = stats.appeal.toFixed(1);
    rateValueChip.textContent = formatMoney(rate);

    if (stats.appeal > shownAppeal + 0.04) {
      celebrate(appealPart, `+${(stats.appeal - shownAppeal).toFixed(1)}`, 0);
      celebrate(ratePart, `+${formatMoney(Math.max(1, rate - shownRate))}`, 420);
    }
    shownAppeal = stats.appeal;
    shownRate = rate;

    if (money !== lastMoney) {
      moneyPill.classList.remove("bump");
      requestAnimationFrame(() => moneyPill.classList.add("bump"));
      lastMoney = money;
    }

    const cost = costForNextCat(cats.length);
    adoptLabel.textContent = `adopt a cat — ${formatMoney(cost)}`;
    // **Styled as unavailable, but never `disabled`.** A disabled button
    // swallows the click entirely, so the refusal message below could never
    // fire — which is precisely how this ended up looking broken rather than
    // rule-bound. Let the tap through and answer it.
    const spareBeds = freeBeds(beds(state.placements, state.instances), cats).length;
    adoptButton.classList.toggle("unaffordable", money < cost || spareBeds === 0);
    adoptHint.textContent = adoptButton.classList.contains("refused")
      ? adoptHint.textContent
      : spareBeds === 0
        ? "no spare bed"
        : `${spareBeds} spare ${spareBeds === 1 ? "bed" : "beds"}`;

    const progress = levelProgress(state.xp);
    levelNumber.textContent = String(progress.level);
    ringFill.style.strokeDashoffset = `${RING_CIRCUMFERENCE * (1 - progress.fraction)}`;
    cafeNameLine.textContent = state.player.cafeName;
    // No "xp" suffix: the ring says what the number is, and the three
    // characters are the difference between fitting and being ellipsised.
    profileSub.textContent = `${state.player.name} · ${progress.into}/${progress.needed}`;

    cafeDot.classList.toggle("visible", hasAffordableUpgrade(money, upgrades));
    panelUpdate?.();
  }

  render();
  gameStore.subscribe(render);

  return {
    showWelcomeBack,
    attachPlacer(place) {
      placePiece = place;
    },
    attachExpander(setOpen) {
      setExpanding = setOpen;
    },
    attachGraphics(apply) {
      applyGraphics = apply;
    },
    attachBackdrop(apply) {
      applyBackdrop = apply;
    },
    attachTutorial(replay) {
      replayTutorial = replay;
    },
    attachChores(show) {
      choreMarker = show;
      syncChores();
    },
    backdropPicker: backdropSwatches,
    closeExpander() {
      setExpanding?.(false);
    },
    attachShopPreview(preview) {
      shopPreview = preview;
    },
    shopStageRect: () => shopStage?.getBoundingClientRect() ?? null,

    /**
     * Draw attention to one control while the walkthrough waits on it.
     *
     * A hint that says "open the shop" is only half an instruction on a screen
     * the player has never seen — this is the other half. Deliberately a soft
     * pulse rather than a dimming overlay with a hole cut in it: pillar 1, and
     * the café underneath stays touchable, so nobody is trapped in a step.
     */
    point(target) {
      pointedTask = target;
      // A new task starts from the top of its own path — the monotonic rule in
      // `syncPointer` is per task, not for the whole walkthrough.
      furthestGuideDepth = -1;
      syncPointer();
    },
    syncPointer,
  };

  function syncPointer(): void {
    const path = pointedTask ? (GUIDE_PATHS[pointedTask] ?? []) : [];
    let node: HTMLElement | null = null;
    let depth = -1;
    // Last match wins: the deepest thing that exists is where they are now.
    for (let i = 0; i < path.length; i++) {
      const found = root.querySelector<HTMLElement>(`[data-guide="${path[i]}"]`);
      if (!found || (found as HTMLButtonElement).disabled) continue;
      // **Measure, don't ask `offsetParent`.** It is null for anything inside a
      // `position: fixed` ancestor — which is the whole HUD — so the obvious
      // visibility check silently rejected every control on screen.
      const rect = found.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        node = found;
        depth = i;
      }
    }

    /**
     * **Never point backwards.** The steps of a path stop existing as the
     * player drills in — opening the café panel replaces the tab that opened
     * it — so once the deepest available marker was two levels up, the arrow
     * swung back to the nav button underneath the open panel and told the
     * player to press the thing they had just pressed. Ellis, 2026-08-26:
     * *"after i pick honey for an ingredient the arrow is now pointing down at
     * the blurred cafe button even tho i still need to name it and press add
     * to menu."*
     *
     * So the depth only ever increases within a task. If nothing at or past
     * the furthest point is on screen, the arrow shows nothing — which is
     * honest, and far better than confidently pointing at the wrong control.
     */
    if (depth < furthestGuideDepth) node = null;
    else furthestGuideDepth = depth;

    for (const previous of root.querySelectorAll<HTMLElement>(".pointed-at")) {
      if (previous !== node) previous.classList.remove("pointed-at");
    }
    if (node) node.classList.add("pointed-at");

    // **A glow was not enough.** A pulsing ring reads as decoration on a
    // screen that already pulses things, and it says "something about this
    // button" rather than "press this button". An arrow has a direction and
    // only one meaning; the ring stays under it because an arrow alone can
    // look like it points between two controls.
    if (!node) {
      pointArrow.style.display = "none";
      return;
    }
    const r = node.getBoundingClientRect();
    if (r.width === 0) {
      pointArrow.style.display = "none";
      return;
    }
    pointArrow.style.display = "";
    // Above the control, unless that would put it off the top of the screen —
    // a department card near the top of a panel needs the arrow underneath it,
    // pointing up.
    const above = r.top > 58;
    pointArrow.classList.toggle("point-arrow-up", !above);
    const y = above ? r.top - 46 : r.bottom + 6;
    pointArrow.style.transform =
      `translate(-50%, 0) translate(${r.left + r.width / 2}px, ${y}px)`;
  }
}
