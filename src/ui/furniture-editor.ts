import * as THREE from "three";
import { gameStore, currentProgress } from "@/state/store";
import { isUnlocked } from "@/data/customisation";
import { furnitureName, type PickedFurniture } from "@/scene/furniture-picker";
import { formatMoney } from "@/ui/format";
import { icon } from "@/ui/icons";
import { initAudio, playPurchase, playTap } from "@/audio/audio";

/**
 * The bar that appears while a piece of furniture is in flight (§8 "The café
 * editor", step 4): a live "drag it somewhere" / "no way to reach that seat"
 * message, and confirm/cancel.
 *
 * **This used to be a whole press-and-hold editor** — a ring that charged
 * under your finger, then a docked colourway sheet. Ellis retired the gesture
 * on 2026-08-10: *"i dont like the hold to edit thing any more id rather
 * everything was in 1 unified super intuitive easy to use clear place - the
 * shop."* He is right that two entry points to the same editing was one too
 * many, and the shop is the one that can also *sell* you the thing. What
 * survives is this bar, because placement still needs somewhere to say yes or
 * no while your finger is busy.
 *
 * Nothing commits until confirm, so cancelling is always free and a refused
 * spot never has to be undone.
 */

export interface FurnitureEditor {
  /** A press began on this piece; start charging the ring. Null hides it. */
  beginHold(picked: PickedFurniture | null): void;
  /** 0→1 while held. */
  setHoldProgress(t: number, camera: THREE.Camera): void;
  /** Released or dragged away before completing. */
  cancelHold(): void;
  /** The hold completed — open the little tab. */
  openMenu(picked: PickedFurniture, onMove: (picked: PickedFurniture) => void): void;
  /** True while the tab is up, so a tap can be routed to closing it. */
  isMenuOpen(): boolean;
  closeMenu(): void;
  /** Show the move bar with a live validity message. */
  /**
   * The bar shown while a piece is in flight.
   *
   * `canRotate` is false for a wall piece: those turn to face the room by
   * themselves, so a turn button would only ever put a menu board face-first
   * into the plaster.
   */
  showMoveBar(
    onRotate: () => void,
    onDone: () => void,
    onCancel: () => void,
    canRotate?: boolean,
  ): void;
  setMoveValid(ok: boolean, message?: string): void;
  hideMoveBar(): void;
  /** True while a piece is in flight, so the shop can stay out of the way. */
  isMoving(): boolean;
}

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createFurnitureEditor(root: HTMLElement): FurnitureEditor {
  const layer = el("div", "furniture-layer");
  // Survives mountUI clearing the root — see the note there.
  layer.dataset.overlay = "";
  root.appendChild(layer);

  /**
   * The charging ring.
   *
   * **The ring is the affordance.** Nothing in the café says "hold me", so the
   * ring appearing under your finger is what teaches the gesture — which is
   * why the caller only starts a hold on pieces that can actually be edited. A
   * ring that fills and then does nothing would teach the gesture and then
   * punish it.
   *
   * It projects from world space, the same trick as the coin floaters, so it
   * lands exactly on the object and stays crisp at any pixel ratio.
   */
  const ring = el("div", "hold-ring");
  ring.innerHTML = `<svg viewBox="0 0 44 44" aria-hidden="true">
      <circle class="hold-ring-track" cx="22" cy="22" r="19" />
      <circle class="hold-ring-fill" cx="22" cy="22" r="19" />
    </svg>`;
  layer.appendChild(ring);
  const ringFill = ring.querySelector(".hold-ring-fill") as SVGCircleElement;
  const CIRCUMFERENCE = 2 * Math.PI * 19;
  ringFill.style.strokeDasharray = `${CIRCUMFERENCE}`;

  /** How much the held object squashes at full charge. */
  const SQUASH = 0.06;
  let held: PickedFurniture | null = null;
  let menu: HTMLElement | null = null;
  const baseScale = new THREE.Vector3();

  function restoreHeld(): void {
    if (held) held.object.scale.copy(baseScale);
    held = null;
    ring.classList.remove("visible");
  }

  function closeMenu(): void {
    menu?.remove();
    menu = null;
  }

  /** Project a world point to CSS pixels; null if behind the camera. */
  function project(point: THREE.Vector3, camera: THREE.Camera): { x: number; y: number } | null {
    const v = point.clone().project(camera);
    if (v.z > 1) return null;
    return {
      x: ((v.x + 1) / 2) * window.innerWidth,
      y: ((1 - v.y) / 2) * window.innerHeight,
    };
  }

  let moveBar: HTMLElement | null = null;
  let moveNote: HTMLElement | null = null;

  return {
    beginHold(picked) {
      restoreHeld();
      if (!picked) return;
      held = picked;
      baseScale.copy(picked.object.scale);
      ringFill.style.strokeDashoffset = `${CIRCUMFERENCE}`;
    },

    setHoldProgress(t, camera) {
      if (!held) return;
      const screen = project(held.anchor, camera);
      if (!screen) return;
      ring.classList.add("visible");
      ring.style.transform = `translate(${screen.x}px, ${screen.y}px) translate(-50%, -50%)`;
      ringFill.style.strokeDashoffset = `${CIRCUMFERENCE * (1 - t)}`;
      // Squash eased so most of the motion is near the end — it makes the
      // completion feel like it arrives rather than creeps up.
      const eased = t * t;
      held.object.scale.set(
        baseScale.x * (1 + SQUASH * eased),
        baseScale.y * (1 - SQUASH * eased),
        baseScale.z * (1 + SQUASH * eased),
      );
    },

    cancelHold: restoreHeld,
    isMenuOpen: () => menu !== null,
    closeMenu,

    /**
     * The little tab: recolour, or pick it up.
     *
     * **Docked at the bottom, not floating beside the piece.** Anchoring it to
     * the object was tried in the first version of this and was clearly worse:
     * on a phone the café occupies the middle of the screen, so a panel of
     * swatches covers the very thing being recoloured.
     */
    openMenu(picked, onMove) {
      restoreHeld();
      closeMenu();

      menu = el("div", "furniture-menu");
      const head = el("div", "furniture-menu-head");
      head.appendChild(el("div", "furniture-menu-title", furnitureName(picked.tag)));
      menu.appendChild(head);

      if (picked.category) {
        const category = picked.category;
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
          tile.addEventListener("click", () => {
            initAudio();
            if (gameStore.getState().chooseCustomisation(category.id, option.id)) playPurchase();
            else playTap();
            for (const refresh of refreshers) refresh();
          });
          refreshers.push(() => {
            const state = gameStore.getState();
            const unlocked = isUnlocked(option, currentProgress(state));
            const owned = option.price === 0 || state.owned.includes(`${category.id}:${option.id}`);
            const chosen = state.customisation[category.id] === option.id;
            tile.classList.toggle("locked", !unlocked);
            tile.classList.toggle("chosen", chosen);
            tile.disabled = !unlocked || (!owned && state.money < option.price);
            // A locked row says what to go and do, never just "locked" (§9).
            if (!unlocked) note.textContent = option.unlock?.label ?? "Locked";
            else if (chosen) note.textContent = "In your café";
            else if (owned) note.textContent = "Tap to use";
            else note.textContent = formatMoney(option.price);
          });
          row.appendChild(tile);
        }
        for (const refresh of refreshers) refresh();
        menu.appendChild(row);
      }

      if (picked.tag.movable) {
        const move = el("button", "furniture-move", "move it") as HTMLButtonElement;
        move.appendChild(icon("arrows", "icon"));
        move.addEventListener("click", () => {
          playTap();
          const target = picked;
          closeMenu();
          onMove(target);
        });
        menu.appendChild(move);
      }

      const close = el("button", "furniture-menu-close", "done") as HTMLButtonElement;
      close.addEventListener("click", () => {
        playTap();
        closeMenu();
      });
      menu.appendChild(close);
      layer.appendChild(menu);
    },

    isMoving: () => moveBar !== null,

    showMoveBar(onRotate, onDone, onCancel, canRotate = true) {
      moveBar?.remove();
      moveBar = el("div", "move-bar");
      moveNote = el("div", "move-note", "drag it onto a block");
      moveBar.appendChild(moveNote);

      const buttons = el("div", "move-buttons");
      // Rotate sits with cancel and confirm rather than floating over the
      // piece: the bar is where the player's thumb already is while placing.
      const turn = el("button", "move-rotate") as HTMLButtonElement;
      turn.appendChild(icon("rotate", "icon"));
      turn.setAttribute("aria-label", "Turn it");
      turn.addEventListener("click", () => {
        playTap();
        onRotate();
      });
      if (canRotate) buttons.appendChild(turn);
      const cancel = el("button", "move-cancel", "cancel");
      cancel.addEventListener("click", () => {
        playTap();
        onCancel();
      });
      const done = el("button", "move-done");
      done.appendChild(icon("arrows", "icon"));
      done.appendChild(document.createTextNode("put it here"));
      done.addEventListener("click", () => {
        playTap();
        onDone();
      });
      buttons.appendChild(cancel);
      buttons.appendChild(done);
      moveBar.appendChild(buttons);
      layer.appendChild(moveBar);
    },

    setMoveValid(ok, message) {
      if (!moveBar || !moveNote) return;
      moveBar.classList.toggle("invalid", !ok);
      moveNote.textContent = ok ? "drag it onto a block" : (message ?? "not there");
      const done = moveBar.querySelector<HTMLButtonElement>(".move-done");
      if (done) done.disabled = !ok;
    },

    hideMoveBar() {
      moveBar?.remove();
      moveBar = null;
      moveNote = null;
    },
  };
}
