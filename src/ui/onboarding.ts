import { gameStore } from "@/state/store";
import { CAFE_NAME_IDEAS, DEFAULT_PLAYER, type PlayerProfile } from "@/data/player";
import {
  APPEARANCE_RANGES,
  appearanceFromSeed,
  type Appearance,
} from "@/entities/character-library";
import { initAudio, playPurchase, playTap } from "@/audio/audio";

/**
 * Character creation, shown once before the café opens (§8 onboarding).
 *
 * Three steps: your name, your look, your café's name. It is the first thing
 * the game asks and therefore the first promise it makes — this place is
 * *yours*, and it has your name over the door before you've earned a penny.
 *
 * The avatar is the same modular character the guests are built from, so the
 * whole feature costs no new art. `scene/character-preview.ts` draws it into
 * the hole this layer leaves for it, exactly as the shop does.
 */

const ADJUSTABLE: Array<{ key: keyof Appearance; label: string }> = [
  { key: "hair", label: "hair" },
  { key: "hairColour", label: "hair colour" },
  { key: "skintone", label: "skin" },
  { key: "top", label: "top" },
  { key: "topColour", label: "top colour" },
  { key: "legs", label: "pants" },
  { key: "legColour", label: "pants colour" },
  { key: "held", label: "drink" },
];

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export interface OnboardingHooks {
  /** Turn the avatar as the player swipes it. */
  swivel(deltaRadians: number): void;
  /** The shared colour picker, so setup and settings offer the same control. */
  backdropPicker(onPick: (id: string) => void): HTMLElement;
}

export interface Onboarding {
  /** Where the avatar should be drawn, or null when not on the look step. */
  stageRect(): DOMRect | null;
  appearance(): Appearance;
  isOpen(): boolean;
}

export function mountOnboarding(
  root: HTMLElement,
  hooks: OnboardingHooks,
  onDone: () => void,
): Onboarding {
  const layer = el("div", "onboarding");
  layer.dataset.overlay = "";
  root.appendChild(layer);

  let step = 0;
  let stage: HTMLElement | null = null;
  const draft: PlayerProfile = {
    name: "",
    cafeName: "",
    appearance: appearanceFromSeed(Math.floor(Math.random() * 1e6)),
    created: false,
    // The guide runs *after* creation, so a fresh profile has not seen it.
    tutorialDone: false,
    graphics: DEFAULT_PLAYER.graphics,
    backdrop: DEFAULT_PLAYER.backdrop,
    musicMuted: DEFAULT_PLAYER.musicMuted,
  };

  function finish(): void {
    gameStore.getState().setPlayer(draft);
    playPurchase();
    layer.remove();
    stage = null;
    onDone();
  }

  /** A text step. Kept deliberately plain — the keyboard is already a lot. */
  function renderNameStep(
    title: string,
    hint: string,
    placeholder: string,
    initial: string,
    suggestions: string[],
    onNext: (value: string) => void,
  ): void {
    layer.innerHTML = "";
    stage = null;
    const card = el("div", "onboard-card");
    card.appendChild(el("div", "onboard-title", title));
    card.appendChild(el("div", "onboard-hint", hint));

    const input = document.createElement("input");
    input.className = "onboard-input";
    input.type = "text";
    input.maxLength = 24;
    input.placeholder = placeholder;
    input.value = initial;
    input.autocomplete = "off";
    card.appendChild(input);

    if (suggestions.length > 0) {
      const chips = el("div", "onboard-chips");
      for (const suggestion of suggestions) {
        const chip = el("button", "onboard-chip", suggestion);
        chip.addEventListener("click", () => {
          playTap();
          input.value = suggestion;
          next.disabled = false;
        });
        chips.appendChild(chip);
      }
      card.appendChild(chips);
    }

    const next = el("button", "onboard-next", "next") as HTMLButtonElement;
    next.disabled = initial.trim().length === 0;
    input.addEventListener("input", () => {
      next.disabled = input.value.trim().length === 0;
    });
    next.addEventListener("click", () => {
      initAudio();
      playTap();
      onNext(input.value.trim());
    });
    card.appendChild(next);
    layer.appendChild(card);
    // **Not focused.** Opening a game straight into a keyboard is exactly the
    // complaint the adoption card earned; the field is right there to tap.
  }

  function renderLookStep(): void {
    layer.innerHTML = "";
    const card = el("div", "onboard-card onboard-look");
    card.appendChild(el("div", "onboard-title", `hello, ${draft.name}`));
    card.appendChild(el("div", "onboard-hint", "what do you look like?"));

    // The hole the 3D avatar is drawn through — see the shop for why nothing
    // may be painted in front of it.
    const avatarStage = el("div", "onboard-stage");
    card.appendChild(avatarStage);
    stage = avatarStage;

    // Drag to turn them round. The idle sway keeps running underneath, so the
    // avatar never freezes the moment you touch it.
    let from: number | null = null;
    avatarStage.addEventListener("pointerdown", (e) => {
      from = e.clientX;
      avatarStage.setPointerCapture(e.pointerId);
    });
    avatarStage.addEventListener("pointermove", (e) => {
      if (from === null) return;
      hooks.swivel((e.clientX - from) * 0.012);
      from = e.clientX;
    });
    avatarStage.addEventListener("pointerup", () => (from = null));

    const rows = el("div", "onboard-rows");
    for (const { key, label } of ADJUSTABLE) {
      const row = el("div", "onboard-row");
      const prev = el("button", "onboard-arrow", "‹");
      const next = el("button", "onboard-arrow", "›");
      row.appendChild(prev);
      row.appendChild(el("div", "onboard-row-label", label));
      row.appendChild(next);

      const cycle = (by: number) => {
        playTap();
        const range = APPEARANCE_RANGES[key];
        draft.appearance = {
          ...draft.appearance,
          [key]: (draft.appearance[key] + by + range) % range,
        };
      };
      prev.addEventListener("click", () => cycle(-1));
      next.addEventListener("click", () => cycle(1));
      rows.appendChild(row);
    }
    card.appendChild(rows);

    const buttons = el("div", "onboard-buttons");
    const shuffle = el("button", "onboard-shuffle", "surprise me");
    shuffle.addEventListener("click", () => {
      playTap();
      draft.appearance = appearanceFromSeed(Math.floor(Math.random() * 1e6));
    });
    const done = el("button", "onboard-next", "that's me");
    done.addEventListener("click", () => {
      playTap();
      step = 2;
      render();
    });
    buttons.appendChild(shuffle);
    buttons.appendChild(done);
    card.appendChild(buttons);

    layer.appendChild(card);
  }

  function render(): void {
    if (step === 0) {
      renderNameStep(
        "welcome",
        "what should the cats call you?",
        "your name",
        draft.name,
        [],
        (value) => {
          draft.name = value;
          step = 1;
          render();
        },
      );
    } else if (step === 1) {
      renderLookStep();
    } else if (step === 2) {
      renderNameStep(
        "your café",
        "and what's this place called?",
        "café name",
        draft.cafeName,
        CAFE_NAME_IDEAS,
        (value) => {
          draft.cafeName = value;
          step = 3;
          render();
        },
      );
    } else {
      renderBackdropStep();
    }
  }

  /**
   * The last step: the colour outside.
   *
   * It comes last because it is the only choice you can *see the result of*
   * while making it — the café is already behind the card, so tapping a swatch
   * repaints the world underneath. Putting it before the avatar would have
   * meant choosing a colour for a room you had not met.
   */
  function renderBackdropStep(): void {
    layer.innerHTML = "";
    stage = null;

    const card = el("div", "onboard-card");
    card.appendChild(el("div", "onboard-title", "one last thing"));
    card.appendChild(el("div", "onboard-hint", "what colour is it outside?"));
    // **The pick has to land in the draft, not only in the store.** The picker
    // repaints the world live (that is the point of choosing it here, with the
    // café visible behind the card), but `finish()` writes this draft over the
    // profile — so a choice that only touched the store was overwritten by the
    // default a moment later.
    card.appendChild(
      hooks.backdropPicker((id) => {
        draft.backdrop = id;
      }),
    );

    const done = el("button", "onboard-next", "open up") as HTMLButtonElement;
    done.addEventListener("click", () => {
      playPurchase();
      finish();
    });
    card.appendChild(done);
    layer.appendChild(card);
  }

  render();

  return {
    stageRect: () => stage?.getBoundingClientRect() ?? null,
    appearance: () => draft.appearance,
    isOpen: () => layer.isConnected,
  };
}
