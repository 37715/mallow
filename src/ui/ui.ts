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

  const stack = document.createElement("div");
  stack.className = "hud-top-stack";

  const moneyPill = document.createElement("div");
  moneyPill.className = "money-pill";

  const catCount = document.createElement("div");
  catCount.className = "cat-count-pill";

  stack.appendChild(moneyPill);
  stack.appendChild(catCount);
  top.appendChild(stack);

  const toast = document.createElement("div");
  toast.className = "join-toast";
  toast.setAttribute("aria-live", "polite");

  const bottom = document.createElement("div");
  bottom.className = "hud-bottom";
  const buyButton = document.createElement("button");
  buyButton.className = "buy-cat-button";
  bottom.appendChild(buyButton);

  root.appendChild(top);
  root.appendChild(toast);
  root.appendChild(bottom);

  buyButton.addEventListener("click", () => {
    gameStore.getState().buyNextCat();
  });

  let lastMoney = gameStore.getState().money;
  let lastCatCount = gameStore.getState().cats.length;
  let toastTimer = 0;

  function showToast(message: string): void {
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("visible");
    }, 2000);
  }

  function render() {
    const { money, cats } = gameStore.getState();
    moneyPill.textContent = formatMoney(money);
    catCount.textContent = cats.length === 1 ? "1 cat" : `${cats.length} cats`;

    if (money !== lastMoney) {
      moneyPill.classList.remove("bump");
      requestAnimationFrame(() => moneyPill.classList.add("bump"));
      lastMoney = money;
    }

    if (cats.length > lastCatCount) {
      const joined = cats[cats.length - 1];
      showToast(`${joined.name} joined the café!`);
      lastCatCount = cats.length;
    }

    const cost = costForNextCat(cats.length);
    buyButton.textContent = `Buy a cat — ${formatMoney(cost)}`;
    buyButton.disabled = money < cost;
  }

  render();
  gameStore.subscribe(render);
}
