import { describe, expect, it } from "vitest";
import { usableAudioResponse } from "@/audio/fetch-audio";

/**
 * The one-line rule that decides whether a downloaded file gets decoded.
 *
 * **This exact predicate was wrong for a week and it silenced every recording
 * on the phone.** The loader used `response.ok`, which is `status 200–299` —
 * and the app is served over a custom URL scheme by a `WKURLSchemeHandler`,
 * which answers with a plain `URLResponse`. No HTTP status means WebKit
 * synthesises **status 0**, so `ok` was false for every file that had in fact
 * downloaded perfectly. Confirmed in a real WKWebView
 * (`tools/webkit-probe.swift`): `ok=false status=0 bytes=24607`, and the same
 * bytes decoded to 2.41 s of purr.
 */
describe("is a fetched audio response worth decoding", () => {
  it("accepts status 0, which is what a custom scheme reports", () => {
    // The case the app actually runs in. Getting this wrong is silent.
    expect(usableAudioResponse(0, 24607)).toBe(true);
  });

  it("accepts a normal HTTP success", () => {
    expect(usableAudioResponse(200, 24607)).toBe(true);
    expect(usableAudioResponse(206, 1024)).toBe(true);
  });

  it("refuses a real HTTP error", () => {
    // A dev server answers 404 with an HTML error page, and handing *that* to
    // the decoder is a confusing way to discover a typo in a path.
    expect(usableAudioResponse(404, 5000)).toBe(false);
    expect(usableAudioResponse(500, 5000)).toBe(false);
  });

  it("refuses an empty body whatever the status", () => {
    // A file copied by a half-finished script decodes to nothing, which reads
    // from inside the game exactly like a file that is not there.
    expect(usableAudioResponse(200, 0)).toBe(false);
    expect(usableAudioResponse(0, 0)).toBe(false);
  });
});
