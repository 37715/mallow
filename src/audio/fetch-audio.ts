/**
 * Fetching an audio file in a way that works inside the app as well as in a
 * browser.
 *
 * **`response.ok` is a lie under Capacitor, and it cost four rounds of "I still
 * can't hear anything".** The app is served over a custom URL scheme
 * (`capacitor://localhost`) by a `WKURLSchemeHandler`, which answers with a
 * plain `URLResponse` rather than an `HTTPURLResponse`. A response with no HTTP
 * status makes WebKit synthesise **`status = 0`**, and `Response.ok` is defined
 * as `200–299` — so **every file that loaded perfectly reports `ok === false`
 * on a phone.** The bytes are all there; the guard threw them away.
 *
 * Verified rather than guessed, with a real `WKWebView` and a scheme handler
 * shaped like Capacitor's (`tools/webkit-probe.swift`):
 *
 *     purr-1.m4a   fetched ok=false status=0 bytes=24607
 *        decode OK 2.41s
 *
 * That is the whole bug. Nothing was wrong with the files, the format, the
 * MIME type or the bundling — the loader rejected them on a status code that
 * only exists over HTTP.
 *
 * Three.js never hit this because `GLTFLoader` and `TextureLoader` use
 * `XMLHttpRequest`, which has no `ok` and never looks at the status this way,
 * which is why the 4 MB character model and the café atlas always loaded.
 */

/** What a fetch produced, before anyone tries to decode it. */
export interface FetchedAudio {
  bytes: ArrayBuffer | null;
  /** Why it did not arrive, for the log. Null when it did. */
  problem: string | null;
}

/**
 * Is this worth handing to `decodeAudioData`?
 *
 * Pure and exported so the rule can be tested without a network (§14 — pull the
 * decision out of the loop). The two cases that matter:
 *
 * - **status 0** means "not HTTP". Under Capacitor that is *success*; a file
 *   that genuinely does not exist makes the scheme handler fail the task, so
 *   the fetch rejects and never reaches here.
 * - **status ≥ 400** is a real HTTP error and the only kind worth refusing.
 *   A dev server answering 404 with an HTML error page would otherwise be
 *   handed to the decoder, which is a confusing way to find a typo.
 */
export function usableAudioResponse(status: number, byteLength: number): boolean {
  if (status >= 400) return false;
  // An empty body is a file that was copied by a half-finished script, and
  // decodes to nothing in a way that reads exactly like a missing file.
  return byteLength > 0;
}

/**
 * Fetch one audio file. Never throws; reports why instead.
 *
 * **Loudly**, because silence is this file's whole history: every failure here
 * used to be swallowed by a bare `catch {}`, so a phone with no cat sounds and
 * a phone with no cat *files* looked identical from the outside, and the only
 * way to tell them apart was to go and read the bytes off the device.
 */
export async function fetchAudio(path: string): Promise<FetchedAudio> {
  try {
    const response = await fetch(path);
    const bytes = await response.arrayBuffer();
    if (!usableAudioResponse(response.status, bytes.byteLength)) {
      return {
        bytes: null,
        problem: `HTTP ${response.status}, ${bytes.byteLength} bytes`,
      };
    }
    return { bytes, problem: null };
  } catch (error) {
    return { bytes: null, problem: String(error) };
  }
}

/**
 * Fetch and decode, or null with a warning explaining which half failed.
 *
 * The distinction matters: "did not arrive" is a build or path problem and
 * "arrived but would not decode" is a format problem, and they are fixed in
 * completely different places.
 */
export async function loadAudioBuffer(
  ctx: BaseAudioContext,
  path: string,
): Promise<AudioBuffer | null> {
  const { bytes, problem } = await fetchAudio(path);
  if (!bytes) {
    // eslint-disable-next-line no-console
    console.warn(`[audio] could not fetch ${path} — ${problem}`);
    return null;
  }
  try {
    return await ctx.decodeAudioData(bytes);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`[audio] ${path} downloaded (${bytes.byteLength} bytes) but would not decode`, error);
    return null;
  }
}
