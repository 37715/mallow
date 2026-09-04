// Run the built app inside a real WKWebView, served the way Capacitor serves
// it, and report what its audio loader actually managed to load.
//
//     npm run build
//     swift tools/webkit-probe.swift dist
//
// **This exists because nothing else in the project could see the bug it was
// written for.** Chrome (headless, `tools/render-audio.mjs`, `tools/shot.mjs`)
// played every recording perfectly; the phone played none of them. The
// difference is not the engine and not the format — it is that Capacitor
// serves the app over a **custom URL scheme**, and a `WKURLSchemeHandler`
// answers with a plain `URLResponse` rather than an `HTTPURLResponse`. With no
// HTTP status, WebKit synthesises `status = 0`, so `Response.ok` is `false`
// for every file that downloaded perfectly — and the loader's `if
// (!response.ok) return` threw all of them away.
//
// Three.js never hit it because `GLTFLoader` uses `XMLHttpRequest`, which is
// why the character model and the atlas always loaded and only the audio was
// silent.
//
// Keep this pointed at `dist/`, not `src/` — the whole point is to exercise
// the bundle that gets copied into the app.
import WebKit
import Foundation

let root = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "dist",
               isDirectory: true)

final class Capacitorish: NSObject, WKURLSchemeHandler {
    let root: URL
    init(root: URL) { self.root = root }

    // Capacitor's MIME table is the old IIS one and has no entry for `m4a`, so
    // this deliberately serves the fallback it would use. If the app works
    // here it is not depending on a content type it will not get.
    private func mime(for name: String) -> String {
        if name.hasSuffix(".html") { return "text/html" }
        if name.hasSuffix(".js") { return "application/javascript" }
        if name.hasSuffix(".css") { return "text/css" }
        if name.hasSuffix(".png") { return "image/png" }
        return "application/octet-stream"
    }

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { return }
        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        let file = root.appendingPathComponent(path)
        guard let data = try? Data(contentsOf: file) else {
            task.didFailWithError(NSError(domain: "not found", code: 404,
                userInfo: [NSLocalizedDescriptionKey: path]))
            return
        }
        // **A plain URLResponse, exactly as Capacitor does it.** Swapping this
        // for an HTTPURLResponse with status 200 hides the bug.
        task.didReceive(URLResponse(url: url, mimeType: mime(for: path),
                                    expectedContentLength: data.count, textEncodingName: nil))
        task.didReceive(data)
        task.didFinish()
    }
    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

let config = WKWebViewConfiguration()
config.setURLSchemeHandler(Capacitorish(root: root), forURLScheme: "capacitor")
let web = WKWebView(frame: .init(x: 0, y: 0, width: 393, height: 852), configuration: config)
web.load(URLRequest(url: URL(string: "capacitor://localhost/index.html")!))

// Give the bundle time to boot, then start audio the way a tap does and report
// what loaded. `initAudio` is not reachable from here, so this drives the same
// path the game does: click, wait, and inspect the decoded buffers.
// What the audio loader has to survive: fetch each shipped file over the
// custom scheme and apply the same rule `usableAudioResponse` does. Driving the
// game's UI headlessly is flaky; this checks the thing that was broken.
let probe = """
const files = [
  'audio/purr-1.m4a', 'audio/purr-2.m4a',
  'audio/meow-1.m4a', 'audio/meow-2.m4a', 'audio/meow-3.m4a',
  'audio/locklane.m4a',
];
const ctx = new (window.AudioContext || window.webkitAudioContext)();
const out = [];
for (const f of files) {
  try {
    const r = await fetch(f);
    const bytes = await r.arrayBuffer();
    // The rule from src/audio/fetch-audio.ts.
    const usable = r.status < 400 && bytes.byteLength > 0;
    if (!usable) { out.push(f + ' REJECTED status=' + r.status + ' bytes=' + bytes.byteLength); continue; }
    const buf = await ctx.decodeAudioData(bytes.slice(0));
    // `response.ok` is reported alongside on purpose: it is false here, for a
    // file that downloaded and decoded perfectly. That is the whole bug.
    out.push(f + '  decoded ' + buf.duration.toFixed(2) + 's   (status=' + r.status
      + ', response.ok=' + r.ok + ' <- the old guard rejected this)');
  } catch (e) { out.push(f + ' THREW ' + e); }
}
return out.join('\\n');
"""

var last = "(nothing)"
for tick in 0..<10 {
    RunLoop.current.run(until: Date().addingTimeInterval(0.5))
    let sem = DispatchSemaphore(value: 0)
    web.callAsyncJavaScript(probe, arguments: [:], in: nil, in: .page) { result in
        switch result {
        case .success(let value): if let s = value as? String { last = s }
        case .failure(let e): last = "JS error: \(e)"
        }
        sem.signal()
    }
    _ = sem.wait(timeout: .now() + 3)
}
print("after 12s: \(last)")
exit(0)
