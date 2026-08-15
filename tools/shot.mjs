/**
 * Screenshot the running game from headless Chrome, and report console errors.
 *
 *   npm run dev            # in one terminal
 *   node tools/shot.mjs [url] [out.png] [--w 393] [--h 852] [--wait 7000]
 *                       [--js "<expression>"] [--settle 900]
 *
 * `--js` runs an expression in the page once the scene has loaded and waits
 * `--settle` ms before shooting — that is how you photograph a panel, since
 * everything past the first screen is behind a tap. It is awaited, so an
 * async expression works. Example, opening the shop:
 *
 *   node tools/shot.mjs http://localhost:5173/ shop.png --js \
 *     "[...document.querySelectorAll('.roster-button')].find(b=>b.textContent.includes('shop')).click()"
 *
 * Defaults to the game at iPhone 14 Pro size — the aspect §9 says to check
 * framing at.
 *
 * **This lives in the repo on purpose.** A previous session built the same
 * thing in a scratchpad directory and it was gone by the next one, so the
 * capability had to be rediscovered. Agents cannot rely on the Chrome
 * extension being connected, and this project is a WebGL canvas where a
 * geometry or lighting regression is invisible to every unit test.
 *
 * **Do not add `--virtual-time-budget`.** It looks like the right way to wait
 * for the scene deterministically, but the character GLB is Draco-compressed
 * and Draco decodes in a Web Worker, where virtual time does not advance — the
 * models simply never load and you screenshot an empty café. Wait in real time.
 */

import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith("--"));
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(args[i + 1]);
};
const text = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : args[i + 1];
};

const url = positional[0] ?? "http://localhost:5173/";
const out = positional[1] ?? "shot.png";
const width = flag("w", 393);
const height = flag("h", 852);
const waitMs = flag("wait", 7000);
const script = text("js");
const settleMs = flag("settle", 900);
/**
 * Device pixel ratio. **Default 2, but Ellis's phone is 3** — and the whole
 * resolution budget in `data/graphics.ts` is solved from this number, so a
 * quality setting that visibly does nothing at DPR 2 can be working perfectly
 * at DPR 3 (and vice versa). Pass `--dpr 3` before concluding anything about
 * sharpness.
 */
const dpr = flag("dpr", 2);

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9222 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), "mallow-shot-"));

const chrome = spawn(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  `--window-size=${width},${height}`,
  "--hide-scrollbars",
  "--mute-audio",
  // Headless Chrome falls back to SwiftShader without this; the scene still
  // renders, just slowly. Keep it so timings mean something.
  "--enable-unsafe-swiftshader",
  "--no-first-run",
  "about:blank",
]);
chrome.on("error", (e) => {
  console.error("could not launch Chrome:", e.message);
  process.exit(1);
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Poll until the debugging endpoint answers. */
async function endpoint() {
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      return (await res.json()).webSocketDebuggerUrl;
    } catch {
      await sleep(100);
    }
  }
  throw new Error("Chrome never opened its debugging port");
}

const ws = new WebSocket(await endpoint());
await new Promise((r) => (ws.onopen = r));

let nextId = 1;
const pending = new Map();
const consoleErrors = [];
const consoleLogs = [];

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
    return;
  }
  if (msg.method === "Runtime.exceptionThrown") {
    const d = msg.params.exceptionDetails;
    consoleErrors.push(d.exception?.description ?? d.text);
  }
  if (msg.method === "Runtime.consoleAPICalled") {
    const text = msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ");
    if (msg.params.type === "error") consoleErrors.push(text);
    else consoleLogs.push(`[${msg.params.type}] ${text}`);
  }
};

const send = (method, params = {}, sessionId) =>
  new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });

await send("Runtime.enable", {}, sessionId);
await send("Page.enable", {}, sessionId);
await send("Emulation.setDeviceMetricsOverride", {
  width,
  height,
  deviceScaleFactor: dpr,
  mobile: true,
}, sessionId);

await send("Page.navigate", { url }, sessionId);
await sleep(waitMs);

// Drive the page before shooting — panels, menus, anything behind a tap.
if (script) {
  const result = await send(
    "Runtime.evaluate",
    { expression: script, awaitPromise: true, returnByValue: true },
    sessionId,
  );
  if (result.exceptionDetails) {
    console.error("--js threw:", result.exceptionDetails.exception?.description ?? "");
  }
  await sleep(settleMs);
}

const { data } = await send("Page.captureScreenshot", { format: "png" }, sessionId);
writeFileSync(out, Buffer.from(data, "base64"));

// Report what the page thinks of itself, so a black screenshot is diagnosable.
const probe = await send(
  "Runtime.evaluate",
  {
    expression: `JSON.stringify({
      canvas: !!document.querySelector('#scene'),
      webgl: (() => { try { return !!document.querySelector('#scene').getContext('webgl2'); } catch { return 'n/a'; } })(),
      uiText: (document.querySelector('#ui-root')?.innerText ?? '').slice(0, 200),
    })`,
    returnByValue: true,
  },
  sessionId,
);

console.log(`saved ${out}  (${width}x${height} @${dpr}x, waited ${waitMs}ms)`);
console.log("page:", probe.result?.value ?? "(no result)");
if (consoleLogs.length) console.log("console:\n  " + consoleLogs.slice(-15).join("\n  "));
if (consoleErrors.length) {
  console.log(`\n${consoleErrors.length} ERROR(S):`);
  for (const e of consoleErrors.slice(0, 10)) {
    // Shader errors carry their diagnosis several lines in, so `--errors full`
    // exists rather than making everyone re-run with a patched copy.
    const lines = text("errors") === "full" ? e.split("\n").slice(0, 40) : [e.split("\n")[0]];
    console.log("  " + lines.join("\n  "));
  }
} else {
  console.log("no console errors");
}

ws.close();
chrome.kill();
process.exit(consoleErrors.length ? 1 : 0);
