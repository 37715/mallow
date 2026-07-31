import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  build: {
    rollupOptions: {
      // gallery.html is a workshop tool for browsing the asset pack. It is
      // built alongside the game in dev, but it is NOT part of the shipped app.
      input: { main: path.resolve(import.meta.dirname, "index.html") },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
});
