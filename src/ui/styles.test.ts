import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Structural checks on the stylesheet.
 *
 * **This exists because a broken stylesheet fails silently and catastrophically.**
 * On 2026-08-13 a tidy-up deleted the last selector of the shared
 * `text-transform: lowercase` list, leaving it comma-terminated. CSS then
 * swallowed the *next* rule into the list, so every element in it — including
 * `.adopt-button-label` and `.reveal-confirm` — inherited a slate background
 * and `pointer-events: none`. The result on a phone: half the interface's text
 * vanished and the adopt button stopped responding. Nothing threw, no test
 * failed, and the build was clean.
 *
 * Vite does not validate CSS and TypeScript never sees it, so these two cheap
 * assertions are the only thing standing between a bad edit and a dead button.
 */
const CSS = readFileSync("src/ui/styles.css", "utf8");
const withoutComments = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

describe("styles.css", () => {
  it("has balanced braces", () => {
    const open = (withoutComments.match(/\{/g) ?? []).length;
    const close = (withoutComments.match(/\}/g) ?? []).length;
    expect(open).toBe(close);
  });

  /**
   * The shared lowercase list must declare *only* `text-transform`.
   *
   * This is the assertion that would actually have caught the bug, and the
   * first attempt at it did not: deleting the list's last selector leaves CSS
   * that is perfectly *valid* — the list simply annexes the next rule, and
   * every selector in it inherits that rule's declarations. There is no syntax
   * error to find. What there is, is a one-property rule that suddenly has
   * eleven properties.
   */
  it("keeps the shared lowercase rule to the one property it exists for", () => {
    const rule = [...withoutComments.matchAll(/([^{}]*)\{([^{}]*)\}/g)].find((m) =>
      m[1].includes(".adopt-button-label"),
    );
    expect(rule, "no rule sets .adopt-button-label lowercase").toBeDefined();

    const properties = rule![2]
      .split(";")
      .map((d) => d.split(":")[0].trim())
      .filter(Boolean);
    expect(properties).toEqual(["text-transform"]);
  });
});
