import { gameStore } from "@/state/store";
import { costForNextCat } from "@/data/economy";

function formatMoney(amount: number): string {
  return `$${Math.floor(amount)}`;
}

/** Builds the DOM HUD and wires it to the store. No game logic lives here. */
export function mountUI(root: HTMLElement): void {
  root.innerHTML = "";

  const top = document.createElement("div");
  top.className = "hud-top";
  const moneyPill = document.createElement("div");
  moneyPill.className = "money-pill";
  top.appendChild(moneyPill);

  const bottom = document.createElement("div");
  bottom.className = "hud-bottom";
  const buyButton = document.createElement("button");
  buyButton.className = "buy-cat-button";
  bottom.appendChild(buyButton);

  root.appendChild(top);
  root.appendChild(bottom);

  buyButton.addEventListener("click", () => {
    gameStore.getState().buyNextCat();
  });

  let lastMoney = gameStore.getState().money;

  function render() {
    const { money, cats } = gameStore.getState();
    moneyPill.textContent = formatMoney(money);

    if (money !== lastMoney) {
      moneyPill.classList.remove("bump");
      // Restart the CSS animation-esque bump on every change (§10 juice).
      requestAnimationFrame(() => moneyPill.classList.add("bump"));
      lastMoney = money;
    }

    const cost = costForNextCat(cats.length);
    buyButton.textContent = `Buy a cat — ${formatMoney(cost)}`;
    buyButton.disabled = money < cost;
  }

  render();
  gameStore.subscribe(render);
}
