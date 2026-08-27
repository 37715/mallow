/**
 * Bounce the game's synthesised audio to a `.wav` you can actually listen to.
 *
 *   npm run dev                      # in one terminal
 *   node tools/render-audio.mjs music 60 music.wav
 *   node tools/render-audio.mjs cats 20 cats.wav
 *
 * **This is `tools/shot.mjs` for sound, and it exists for the same reason.**
 * A WebGL regression is invisible to unit tests, so this project grew a
 * screenshot tool and leans on it constantly. Audio was worse off: it had no
 * way to be inspected at all, which is how the purr shipped as a diesel engine
 * twice and how a comment claiming "a synthesised meow is worse than silence"
 * went unchallenged for weeks. Nobody had heard either one.
 *
 * How it works, and why it is not simpler: the synths live in `src/audio/`, so
 * the render has to happen where those modules can be imported and where there
 * is a real WebAudio implementation. That is the browser. So it drives headless
 * Chrome over CDP exactly as `shot.mjs` does, has the page render into an
 * `OfflineAudioContext` (faster than real time, deterministic), encodes a WAV
 * in the page, and pulls the bytes back **in chunks** — a minute of stereo
 * audio is several megabytes of base64 and one `Runtime.evaluate` will not
 * carry it.
 *
 * Vite serves `/src/**` as ES modules in dev, so `import('/src/audio/music.ts')`
 * works from the page with no build step.
 */

import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [what = "music", secondsArg = "60", out = `${what}.wav`] = process.argv
  .slice(2)
  .filter((a) => !a.startsWith("--"));
const seconds = Number(secondsArg);
const url = "http://localhost:5173/";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9222 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), "mallow-audio-"));

const chrome = spawn(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  "--no-first-run",
  "--enable-unsafe-swiftshader",
  "about:blank",
]);
chrome.on("error", (e) => {
  console.error("could not launch Chrome:", e.message);
  process.exit(1);
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
const errors = [];
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
    return;
  }
  if (msg.method === "Runtime.exceptionThrown") {
    errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
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
await send("Page.navigate", { url }, sessionId);
await sleep(4000);

const evaluate = async (expression) => {
  const result = await send(
    "Runtime.evaluate",
    { expression, awaitPromise: true, returnByValue: true },
    sessionId,
  );
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? "evaluate failed");
  }
  return result.result?.value;
};

/**
 * Rendered in the page. Returns the WAV's length; the bytes are parked on
 * `window.__wav` and fetched in slices below.
 *
 * The peak is reported alongside so a silent render is diagnosable — a graph
 * that produces nothing looks exactly like one that was never scheduled.
 */
const render = `(async () => {
  const RATE = 44100;
  const ctx = new OfflineAudioContext(2, Math.ceil(RATE * ${seconds}), RATE);

  const want = ${JSON.stringify(what)};

  if (want === "music" || want === "cafe") {
    const { startMusic } = await import("/src/audio/music.ts");
    startMusic(ctx, ctx.destination, { offlineSeconds: ${seconds} });
  }
  if (want === "cafe") {
    // The mix as the game plays it: both go to the same master, so the levels
    // here are the levels you will hear. This is the one worth listening to.
    const { renderCry, meow, chirp } = await import("/src/audio/cat.ts");
    let at = 3;
    while (at < ${seconds} - 1) {
      renderCry(ctx, ctx.destination, Math.random() < 0.4 ? chirp() : meow(), at);
      at += 5 + Math.random() * 7;
    }
  }
  if (want === "cats") {
    const { renderCry, meow, chirp } = await import("/src/audio/cat.ts");
    // Alternating, with room between them, so each one can be heard on its own
    // and the variation between repeats is audible — which is the thing that
    // decides whether it reads as an animal or as a machine.
    let at = 0.4;
    for (let i = 0; at < ${seconds} - 1.5; i++) {
      renderCry(ctx, ctx.destination, i % 3 === 2 ? chirp() : meow(), at);
      at += 1.5 + Math.random() * 0.7;
    }
  }

  const buffer = await ctx.startRendering();
  const channels = [buffer.getChannelData(0), buffer.getChannelData(1)];
  const frames = buffer.length;
  let peak = 0;
  for (const data of channels) for (let i = 0; i < frames; i++) peak = Math.max(peak, Math.abs(data[i]));

  // 16-bit PCM WAV, written by hand — nothing here is worth a dependency.
  const bytes = 44 + frames * 4;
  const view = new DataView(new ArrayBuffer(bytes));
  const text = (at, s) => { for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i)); };
  text(0, "RIFF"); view.setUint32(4, bytes - 8, true); text(8, "WAVE");
  text(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 2, true); view.setUint32(24, RATE, true);
  view.setUint32(28, RATE * 4, true); view.setUint16(32, 4, true); view.setUint16(34, 16, true);
  text(36, "data"); view.setUint32(40, frames * 4, true);
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < 2; c++) {
      const v = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(44 + i * 4 + c * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
    }
  }
  let binary = "";
  const raw = new Uint8Array(view.buffer);
  for (let i = 0; i < raw.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, raw.subarray(i, i + 0x8000));
  }
  window.__wav = btoa(binary);
  return { length: window.__wav.length, peak: Math.round(peak * 1000) / 1000, seconds: ${seconds} };
})()`;

let info;
try {
  info = await evaluate(render);
} catch (e) {
  console.error("render failed:", e.message);
  for (const err of errors.slice(0, 3)) console.error(" ", err.split("\n")[0]);
  ws.close();
  chrome.kill();
  process.exit(1);
}

// Base64 in 4 MB slices. One evaluate cannot carry a minute of stereo audio.
const SLICE = 4_000_000;
let base64 = "";
for (let at = 0; at < info.length; at += SLICE) {
  base64 += await evaluate(`window.__wav.slice(${at}, ${at + SLICE})`);
}

writeFileSync(out, Buffer.from(base64, "base64"));
console.log(
  `wrote ${out} — ${info.seconds}s, peak ${info.peak}` +
    (info.peak < 0.001 ? "  ⚠️  SILENT" : info.peak > 0.99 ? "  ⚠️  CLIPPING" : ""),
);
if (errors.length) console.log(`${errors.length} page error(s): ${errors[0].split("\n")[0]}`);

ws.close();
chrome.kill();
process.exit(0);
