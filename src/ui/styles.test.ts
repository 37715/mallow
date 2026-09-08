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

  /**
   * Nothing outside a text field may be selectable.
   *
   * A WKWebView is a browser, so a long-press on any label selects it, paints
   * it blue and raises the Copy / Look Up callout — the loudest "this is a web
   * page in a costume" tell an app can have (Ellis, 2026-09-08). The rule is
   * universal and the exceptions are the three text fields the player types
   * into, so this pins both halves: without the exception, renaming a cat
   * would lose its caret and its paste.
   */
  it("turns off text selection everywhere but the text fields", () => {
    const ruleFor = (selector: string) =>
      [...withoutComments.matchAll(/([^{}]*)\{([^{}]*)\}/g)].find((m) =>
        m[1]
          .split(",")
          .map((s) => s.trim())
          .includes(selector),
      );

    const body = ruleFor("body");
    expect(body, "no shared html/body rule").toBeDefined();
    expect(body![2]).toMatch(/user-select:\s*none/);
    expect(body![2], "iOS raises a callout even when selection is off").toMatch(
      /-webkit-touch-callout:\s*none/,
    );

    const input = ruleFor("input");
    expect(input, "text fields need selection back for the caret").toBeDefined();
    expect(input![2]).toMatch(/user-select:\s*text/);
    expect(input![1]).toContain("textarea");
  });
});
