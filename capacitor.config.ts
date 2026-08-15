import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // Change this before the first App Store submission — a bundle id is
  // permanent once a listing exists, and it must match the Xcode target.
  appId: "com.ellis.mallow",
  appName: "mallow",
  webDir: "dist",
  ios: {
    // The café's backdrop olive, so the gap before the first WebGL frame is a
    // warm colour rather than the default white flash.
    backgroundColor: "#a89355",
    // The scene draws to the screen edges (index.html sets viewport-fit=cover
    // and the sheet uses env(safe-area-inset-*)), so the webview must not be
    // inset for us.
    contentInset: "never",
    // §13: the diorama is one static scene; bouncing it looks broken.
    scrollEnabled: false,
  },
};

export default config;
