import {
  UPGRADE_DEFINITIONS,
  upgradeCost,
  upgradeDefinition,
  type UpgradeDefinition,
  type UpgradeId,
} from "@/data/upgrades";

/**
 * Owned upgrade levels. Sparse on purpose: an absent id means level 0, so old
 * saves stay valid when new upgrades are added to the catalog (§8 — never
 * break a save).
 */
export type UpgradeLevels = Partial<Record<UpgradeId, number>>;

export function levelOf(levels: UpgradeLevels, id: UpgradeId): number {
  const level = levels[id];
  if (typeof level !== "number" || !Number.isFinite(level)) return 0;
  const definition = upgradeDefinition(id);
  const max = definition ? definition.maxLevel : 0;
  return Math.min(max, Math.max(0, Math.floor(level)));
}

/** Cost of the next level, or null when the upgrade is already maxed. */
export function nextLevelCost(levels: UpgradeLevels, id: UpgradeId): number | null {
  const definition = upgradeDefinition(id);
  if (!definition) return null;
  const level = levelOf(levels, id);
  if (level >= definition.maxLevel) return null;
  return upgradeCost(definition, level);
}

export interface UpgradePurchase {
  success: boolean;
  moneyAfter: number;
  /** Cost that was (or would have been) charged; 0 when the upgrade is maxed. */
  cost: number;
  /** Level after the purchase — unchanged from the current level on failure. */
  level: number;
  levels: UpgradeLevels;
}

/** Pure check + apply for buying one level of an upgrade. Never mutates its input. */
export function purchaseUpgrade(
  money: number,
  levels: UpgradeLevels,
  id: UpgradeId,
): UpgradePurchase {
  const level = levelOf(levels, id);
  const cost = nextLevelCost(levels, id);

  if (cost === null || money < cost) {
    return { success: false, moneyAfter: money, cost: cost ?? 0, level, levels };
  }

  return {
    success: true,
    moneyAfter: money - cost,
    cost,
    level: level + 1,
    levels: { ...levels, [id]: level + 1 },
  };
}

/** Total levels bought across every upgrade — a single "how built-out is this café" number. */
export function totalUpgradeLevels(levels: UpgradeLevels): number {
  return UPGRADE_DEFINITIONS.reduce((sum, d) => sum + levelOf(levels, d.id), 0);
}

/** True if the player can afford at least one upgrade right now (drives the UI nudge dot). */
export function hasAffordableUpgrade(money: number, levels: UpgradeLevels): boolean {
  return UPGRADE_DEFINITIONS.some((d: UpgradeDefinition) => {
    const cost = nextLevelCost(levels, d.id);
    return cost !== null && money >= cost;
  });
}
