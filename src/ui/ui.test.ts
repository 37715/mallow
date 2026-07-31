/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";
import { mountUI } from "@/ui/ui";
import { gameStore } from "@/state/store";
import { UPGRADE_DEFINITIONS } from "@/data/upgrades";
import { costForNextCat } from "@/data/economy";
import { CUSTOMISATION } from "@/data/customisation";

/**
 * Smoke tests for the HUD. These don't assert how anything *looks* — they
 * assert that the screen mounts, that the buttons are wired to the store, and
 * that the panels build without throwing. That's the class of bug that is
 * otherwise only caught by opening a browser.
 *
 * Note there is no AudioContext in jsdom: the audio module is expected to
 * detect that and no-op rather than crash, and these tests cover that path.
 */

function mount(): { root: HTMLElement } {
  const root = document.createElement("div");
  document.body.appendChild(root);
  mountUI(root);
  return { root };
}

const q = <T extends HTMLElement>(root: HTMLElement, selector: string): T => {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`missing element: ${selector}`);
  return el;
};

beforeEach(() => {
  document.body.innerHTML = "";
  gameStore.setState({
    money: 0,
    upgrades: {},
    customisation: { walls: "A", sofa: "Cream", carpet: "Small_Cream", catBed: "A_Cream" },
    owned: [],
    cats: [{ id: "cat-0", name: "Biscuit", definitionId: "marmalade" }],
  });
});

describe("HUD", () => {
  it("mounts the core controls", () => {
    const { root } = mount();
    expect(root.querySelector(".money-pill")).not.toBeNull();
    expect(root.querySelector(".adopt-button")).not.toBeNull();
    expect(root.querySelector(".sound-button")).not.toBeNull();
    expect(root.querySelectorAll(".roster-button")).toHaveLength(3); // Cats, Café, Style
  });

  it("disables adoption until the player can afford it, and enables it after", () => {
    const { root } = mount();
    const adopt = q<HTMLButtonElement>(root, ".adopt-button");
    expect(adopt.disabled).toBe(true);

    gameStore.setState({ money: costForNextCat(gameStore.getState().cats.length) });
    expect(adopt.disabled).toBe(false);
  });

  it("adopts a cat and opens the naming card when tapped", () => {
    const { root } = mount();
    const before = gameStore.getState().cats.length;
    gameStore.setState({ money: costForNextCat(before) });

    q<HTMLButtonElement>(root, ".adopt-button").click();

    expect(gameStore.getState().cats.length).toBe(before + 1);
    expect(root.querySelector(".reveal-card")).not.toBeNull();
    expect(root.querySelector(".reveal-name-input")).not.toBeNull();
  });

  it("shows the affordability dot only when something is actually affordable", () => {
    const { root } = mount();
    const dot = q(root, ".nudge-dot");
    expect(dot.classList.contains("visible")).toBe(false);

    gameStore.setState({ money: 100_000 });
    expect(dot.classList.contains("visible")).toBe(true);
  });

  it("opens the café panel with a row per upgrade", () => {
    const { root } = mount();
    const cafeButton = root.querySelectorAll<HTMLButtonElement>(".roster-button")[1];
    cafeButton.click();

    expect(root.querySelectorAll(".upgrade-row")).toHaveLength(UPGRADE_DEFINITIONS.length);
    expect(root.querySelectorAll(".cafe-stat")).toHaveLength(3);
  });

  it("buys an upgrade from the café panel and reflects the new level", () => {
    const { root } = mount();
    gameStore.setState({ money: 100_000 });
    root.querySelectorAll<HTMLButtonElement>(".roster-button")[1].click();

    const firstBuy = q<HTMLButtonElement>(root, ".upgrade-buy");
    firstBuy.click();

    const firstId = UPGRADE_DEFINITIONS[0].id;
    expect(gameStore.getState().upgrades[firstId]).toBe(1);
    expect(q(root, ".upgrade-level").textContent).toContain("Lv 1/");
  });

  it("opens the roster and lists every owned cat plus the full cat-dex", () => {
    const { root } = mount();
    root.querySelectorAll<HTMLButtonElement>(".roster-button")[0].click();

    const cats = gameStore.getState().cats;
    expect(root.querySelectorAll(".roster-row")).toHaveLength(cats.length);
    expect(root.querySelector(".dex-title")?.textContent).toMatch(/Cat-dex/);
  });

  it("renames a cat from the roster", () => {
    const { root } = mount();
    root.querySelectorAll<HTMLButtonElement>(".roster-button")[0].click();

    q<HTMLElement>(root, ".roster-cat-name").click();
    const input = q<HTMLInputElement>(root, ".roster-rename-input");
    input.value = "Dumpling";
    input.dispatchEvent(new Event("blur"));

    expect(gameStore.getState().cats[0].name).toBe("Dumpling");
  });

  it("toggles the sound button without an AudioContext present", () => {
    const { root } = mount();
    const sound = q<HTMLButtonElement>(root, ".sound-button");
    const before = sound.classList.contains("muted");

    expect(() => sound.click()).not.toThrow();
    expect(sound.classList.contains("muted")).toBe(!before);
  });

  it("shows the welcome-back card with the amount earned", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    const ui = mountUI(root);

    ui.showWelcomeBack(42, 3 * 60 * 60 * 1000);
    expect(q(root, ".welcome-earned").textContent).toBe("+$42");
    expect(root.textContent).toContain("3h");
  });
});


describe("contentment display", () => {
  it("shows a heart count once cats have been petted", () => {
    const { root } = mount();
    const pill = q(root, ".cat-count-pill");
    expect(pill.textContent).not.toContain("♥");

    gameStore.getState().petCat(gameStore.getState().cats[0].id);
    expect(pill.textContent).toContain("♥ 1");
  });
});

describe("style panel", () => {
  const openStyle = (root: HTMLElement) =>
    root.querySelectorAll<HTMLButtonElement>(".roster-button")[2].click();

  it("offers every customisation option, locked or not", () => {
    const { root } = mount();
    openStyle(root);
    const total = CUSTOMISATION.reduce((sum, c) => sum + c.options.length, 0);
    expect(root.querySelectorAll(".style-tile")).toHaveLength(total);
  });

  it("locks what hasn't been earned and says what to do about it", () => {
    // A locked option that doesn't tell you how to reach it is just a wall.
    const { root } = mount();
    openStyle(root);
    const locked = root.querySelectorAll<HTMLElement>(".style-tile.locked");
    expect(locked.length).toBeGreaterThan(0);
    for (const tile of locked) {
      expect(tile.querySelector(".style-note")?.textContent?.trim()).toBeTruthy();
      expect((tile as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("starts with the free default already applied", () => {
    const { root } = mount();
    openStyle(root);
    expect(root.querySelectorAll(".style-tile.chosen").length).toBe(CUSTOMISATION.length);
  });

  it("buys an unlocked option, charges once, and re-applying is free", () => {
    mount();
    // Enough cats to unlock the cheap sofa, and money to buy it.
    const sofa = CUSTOMISATION.find((c) => c.id === "sofa")!;
    const olive = sofa.options.find((o) => o.id === "Olive")!;
    gameStore.setState({
      money: olive.price,
      cats: [
        { id: "a", name: "A", definitionId: "marmalade" },
        { id: "b", name: "B", definitionId: "tuxedo" },
      ],
    });

    expect(gameStore.getState().chooseCustomisation("sofa", "Olive")).toBe(true);
    expect(gameStore.getState().money).toBe(0);
    expect(gameStore.getState().customisation.sofa).toBe("Olive");

    // Switch away and back — the second application must not charge again.
    gameStore.getState().chooseCustomisation("sofa", "Cream");
    expect(gameStore.getState().chooseCustomisation("sofa", "Olive")).toBe(true);
    expect(gameStore.getState().money).toBe(0);
  });

  it("refuses a locked option even with money in the till", () => {
    mount();
    gameStore.setState({ money: 100_000 });
    expect(gameStore.getState().chooseCustomisation("walls", "C")).toBe(false);
    expect(gameStore.getState().customisation.walls).toBe("A");
  });
});
