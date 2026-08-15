/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";
import { mountUI } from "@/ui/ui";
import { gameStore } from "@/state/store";
import { UPGRADE_DEFINITIONS } from "@/data/upgrades";
import { costForNextCat } from "@/data/economy";
import { CUSTOMISATION, DEFAULT_CUSTOMISATION } from "@/data/customisation";

/**
 * Smoke tests for the HUD. These don't assert how anything *looks* — they
 * assert that the screen mounts, that the buttons are wired to the store, and
 * that the panels build without throwing. That's the class of bug that is
 * otherwise only caught by opening a browser.
 *
 * Note there is no AudioContext in jsdom: the audio module is expected to
 * detect that and no-op rather than crash, and these tests cover that path.
 */

/** Records what the shop asked the 3D stage to show. */
function mount(): { root: HTMLElement; shown: (string | null)[] } {
  const root = document.createElement("div");
  document.body.appendChild(root);
  const shown: (string | null)[] = [];
  const ui = mountUI(root);
  ui.attachShopPreview({
    swivel: () => {},
    setItem: (asset) => {
      if (shown[shown.length - 1] !== asset) shown.push(asset);
    },
    render: () => {},
    dispose: () => {},
  });
  return { root, shown };
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
    // Spread the real defaults rather than listing categories: this fixture
    // hard-coded four of them and silently went stale the day a fifth (floor)
    // was added, failing a test that had nothing to do with the change.
    customisation: { ...DEFAULT_CUSTOMISATION, sofa: "Cream", carpet: "Small_Cream" },
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
    expect(root.querySelectorAll(".roster-button")).toHaveLength(3); // cats, café, shop
  });

  it("marks adoption unavailable until affordable — but never disables it", () => {
    const { root } = mount();
    const adopt = q<HTMLButtonElement>(root, ".adopt-button");
    expect(adopt.classList.contains("unaffordable")).toBe(true);
    // **Not `disabled`.** A disabled button swallows the click, so the button
    // could not explain itself and simply did nothing — which is what Ellis
    // reported as the app being broken.
    expect(adopt.disabled).toBe(false);

    gameStore.setState({ money: costForNextCat(gameStore.getState().cats.length) });
    expect(adopt.classList.contains("unaffordable")).toBe(false);
  });

  it("says why a tap did nothing when a cat can't be afforded", () => {
    const { root } = mount();
    const adopt = q<HTMLButtonElement>(root, ".adopt-button");
    gameStore.setState({ money: 0 });
    adopt.click();

    expect(adopt.classList.contains("refused")).toBe(true);
    expect(q(root, ".adopt-button-hint").textContent).toMatch(/more to go/);
  });

  it("asks before spending, and lets you back out", () => {
    const { root } = mount();
    gameStore.setState({ money: costForNextCat(gameStore.getState().cats.length) });
    const before = gameStore.getState().cats.length;

    q<HTMLButtonElement>(root, ".adopt-button").click();
    // The confirmation must come *before* the money moves — the old flow
    // committed on the first tap and offered no way back.
    expect(root.querySelector(".confirm-card")).not.toBeNull();
    expect(gameStore.getState().cats.length).toBe(before);

    q<HTMLButtonElement>(root, ".confirm-no").click();
    expect(gameStore.getState().cats.length).toBe(before);
    expect(root.querySelector(".confirm-card")).toBeNull();
  });

  it("adopts and opens the naming card once confirmed", () => {
    const { root } = mount();
    gameStore.setState({ money: costForNextCat(gameStore.getState().cats.length) });
    const before = gameStore.getState().cats.length;

    q<HTMLButtonElement>(root, ".adopt-button").click();
    q<HTMLButtonElement>(root, ".reveal-confirm").click();

    expect(gameStore.getState().cats.length).toBe(before + 1);
    expect(root.querySelector(".reveal-name-input")).not.toBeNull();
  });

  it("does not steal focus when a cat is revealed", () => {
    const { root } = mount();
    gameStore.setState({ money: costForNextCat(gameStore.getState().cats.length) });
    q<HTMLButtonElement>(root, ".adopt-button").click();
    q<HTMLButtonElement>(root, ".reveal-confirm").click();

    // Autofocusing threw up the keyboard over the reveal — the one moment the
    // game most wants you looking at the screen.
    const input = q<HTMLInputElement>(root, ".reveal-name-input");
    expect(document.activeElement).not.toBe(input);
  });

  it("shows the affordability dot only when something is actually affordable", () => {
    const { root } = mount();
    const dot = q(root, ".nudge-dot");
    expect(dot.classList.contains("visible")).toBe(false);

    gameStore.setState({ money: 100_000 });
    expect(dot.classList.contains("visible")).toBe(true);
  });

  it("opens the café panel with a card per upgrade, and no HUD duplicates", () => {
    const { root } = mount();
    const cafeButton = root.querySelectorAll<HTMLButtonElement>(".roster-button")[1];
    cafeButton.click();

    expect(root.querySelectorAll(".upgrade-card")).toHaveLength(UPGRADE_DEFINITIONS.length);
    expect(root.querySelectorAll(".fact-row").length).toBeGreaterThan(0);

    // Appeal and takings live in the HUD chips now. Repeating them in a panel
    // is what made this screen read as filler.
    const panelText = q(root, ".panel").textContent ?? "";
    expect(panelText).not.toContain("per min");
  });

  it("buys an upgrade from the café panel and reflects the new level", () => {
    const { root } = mount();
    gameStore.setState({ money: 100_000 });
    root.querySelectorAll<HTMLButtonElement>(".roster-button")[1].click();

    const firstBuy = q<HTMLButtonElement>(root, ".upgrade-buy");
    firstBuy.click();

    const firstId = UPGRADE_DEFINITIONS[0].id;
    expect(gameStore.getState().upgrades[firstId]).toBe(1);
    expect(q(root, ".upgrade-level").textContent).toContain("lv 1/");
  });

  it("opens the roster and lists every owned cat plus the full cat-dex", () => {
    const { root } = mount();
    root.querySelectorAll<HTMLButtonElement>(".roster-button")[0].click();

    const cats = gameStore.getState().cats;
    expect(root.querySelectorAll(".roster-row")).toHaveLength(cats.length);
    expect(root.querySelector(".dex-title")?.textContent).toMatch(/cat-dex/);
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

  // The cog opens settings; muting lives in there now, not in the corner.
  it("mutes from settings without an AudioContext present", () => {
    const { root } = mount();
    expect(() => q<HTMLButtonElement>(root, ".sound-button").click()).not.toThrow();

    const toggle = q<HTMLButtonElement>(root, ".setting-toggle");
    const before = toggle.classList.contains("on");
    expect(() => toggle.click()).not.toThrow();
    expect(toggle.classList.contains("on")).toBe(!before);
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
    const chip = q(root, ".cat-chip");
    expect(chip.classList.contains("has-content")).toBe(false);

    gameStore.getState().petCat(gameStore.getState().cats[0].id);
    // The heart is a drawn icon (§9 — never a dingbat), so the count is the
    // number beside it and the *state* is the class that colours it.
    expect(chip.classList.contains("has-content")).toBe(true);
    expect(chip.textContent).toContain("1");
  });

  /**
   * The adopt flow, end to end.
   *
   * It broke on 2026-08-13 — a stylesheet edit put `pointer-events: none` on
   * `.reveal-confirm`, so the button was there, looked right, and did nothing.
   * No test noticed because nothing tested the *flow*, only the store method it
   * calls. This drives the buttons.
   */
  it("adopts a cat through the confirm card", () => {
    const { root } = mount();
    gameStore.setState({ money: 10_000 });
    const before = gameStore.getState().cats.length;

    q<HTMLButtonElement>(root, ".adopt-button").click();
    const confirm = root.querySelector<HTMLButtonElement>(".reveal-confirm");
    expect(confirm, "tapping adopt should offer a confirmation").not.toBeNull();

    confirm!.click();
    expect(gameStore.getState().cats.length).toBe(before + 1);
    // And the reveal card names the new cat, so it can be renamed.
    expect(root.querySelector(".reveal-name-input")).not.toBeNull();
  });

  it("can be backed out of without spending anything", () => {
    const { root } = mount();
    gameStore.setState({ money: 10_000 });
    const money = gameStore.getState().money;
    const cats = gameStore.getState().cats.length;

    q<HTMLButtonElement>(root, ".adopt-button").click();
    q<HTMLButtonElement>(root, ".confirm-no").click();
    expect(gameStore.getState().money).toBe(money);
    expect(gameStore.getState().cats.length).toBe(cats);
  });

  it("shows appeal and takings without opening a panel", () => {
    const { root } = mount();
    const rate = q(root, ".rate-chip");
    expect(rate.textContent).toContain("appeal");
    expect(rate.textContent).toContain("per hr");
    // A real number, not a placeholder dash.
    expect(rate.textContent).toMatch(/\d/);
  });
});

describe("colourways, inside the shop", () => {
  /**
   * Find the nav button by its *label*, not its index. Indexing broke the
   * moment the shop was added as a fourth button — and it failed by silently
   * opening a different panel, so three unrelated style tests started failing.
   */
  const openNav = (root: HTMLElement, label: string) => {
    const button = [...root.querySelectorAll<HTMLButtonElement>(".roster-button")].find(
      (b) => b.textContent?.includes(label),
    );
    if (!button) throw new Error(`no nav button labelled "${label}"`);
    button.click();
  };

  /** Colours is a department on the shop's front page, not a nav button. */
  const openColours = (root: HTMLElement) => {
    openNav(root, "shop");
    const card = [...root.querySelectorAll<HTMLButtonElement>(".hub-card")].find((c) =>
      c.textContent?.includes("Colours"),
    );
    if (!card) throw new Error("the shop has no colours department");
    card.click();
  };

  /** Walk the pager once, handing each category's page to `visit`. */
  const eachCategory = (root: HTMLElement, visit: () => void) => {
    openColours(root);
    for (let i = 0; i < CUSTOMISATION.length; i++) {
      visit();
      root.querySelectorAll<HTMLButtonElement>(".shop-arrow")[1].click();
    }
  };

  it("has a colours department rather than a nav button of its own", () => {
    const { root } = mount();
    expect(
      [...root.querySelectorAll(".roster-button")].some((b) => b.textContent?.includes("style")),
    ).toBe(false);
    openColours(root);
    expect(root.querySelectorAll(".style-tile").length).toBeGreaterThan(0);
  });

  it("offers every customisation option across its pages, locked or not", () => {
    const { root } = mount();
    let seen = 0;
    eachCategory(root, () => {
      seen += root.querySelectorAll(".style-tile").length;
    });
    const total = CUSTOMISATION.reduce((sum, c) => sum + c.options.length, 0);
    expect(seen).toBe(total);
  });

  it("locks what hasn't been earned and says what to do about it", () => {
    // A locked option that doesn't tell you how to reach it is just a wall.
    const { root } = mount();
    let lockedSeen = 0;
    eachCategory(root, () => {
      for (const tile of root.querySelectorAll<HTMLElement>(".style-tile.locked")) {
        lockedSeen++;
        expect(tile.querySelector(".style-note")?.textContent?.trim()).toBeTruthy();
        expect((tile as HTMLButtonElement).disabled).toBe(true);
      }
    });
    expect(lockedSeen).toBeGreaterThan(0);
  });

  // The stage is the whole reason colours moved into the shop: you choose by
  // looking at the piece, not at a hex square. So it has to follow both the
  // café's actual choice and the swatch under your finger.
  it("puts the chosen colourway on the stage, and peeks at a pressed one", () => {
    const { root, shown } = mount();
    gameStore.setState({ customisation: { ...DEFAULT_CUSTOMISATION, sofa: "Olive" } });
    openColours(root);
    // walls → floor → sofa
    root.querySelectorAll<HTMLButtonElement>(".shop-arrow")[1].click();
    root.querySelectorAll<HTMLButtonElement>(".shop-arrow")[1].click();
    expect(shown.at(-1)).toBe("Sofa_Single_Olive");

    // Press (don't click) the cream swatch — which is still *locked* in this
    // fixture, and peeks anyway: the colour you're saving for is the reason to
    // save for it. Nothing is bought either way. (Labels carry their capitals
    // in the DOM; the lowercase voice is a CSS transform, §9.)
    const cream = [...root.querySelectorAll<HTMLButtonElement>(".style-tile")].find((t) =>
      t.textContent?.includes("Cream"),
    )!;
    const before = gameStore.getState().money;
    cream.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(shown.at(-1)).toBe("Sofa_Single_Cream");
    expect(gameStore.getState().money).toBe(before);
    expect(gameStore.getState().customisation.sofa).toBe("Olive");

    // Let go without buying and the café's own colour comes back.
    cream.dispatchEvent(new Event("pointerup", { bubbles: true }));
    expect(shown.at(-1)).toBe("Sofa_Single_Olive");
  });

  it("shows exactly one chosen colourway on every page", () => {
    const { root } = mount();
    eachCategory(root, () => {
      expect(root.querySelectorAll(".style-tile.chosen")).toHaveLength(1);
    });
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
