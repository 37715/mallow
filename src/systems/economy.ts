import { costForNextCat } from "@/data/economy";

export interface PurchaseResult {
  success: boolean;
  moneyAfter: number;
  cost: number;
}

/** Pure check + apply for buying the next cat. Never mutates its input. */
export function purchaseNextCat(money: number, catsOwned: number): PurchaseResult {
  const cost = costForNextCat(catsOwned);
  if (money < cost) {
    return { success: false, moneyAfter: money, cost };
  }
  return { success: true, moneyAfter: money - cost, cost };
}
