import * as THREE from "three";
import { loadCafeAssets, type AssetEntry } from "@/scene/asset-library";

/**
 * Asset gallery — open `/gallery.html`.
 *
 * A contact sheet of every object in the café pack, each on its own turntable,
 * with its exact name and size. This exists because 343 objects is far too many
 * to hold in your head, and picking furniture from a filename list is guesswork.
 * Search the box, find what you want, copy the name into a layout.
 *
 * Deliberately a separate page from the game: it's a workshop tool, and it
 * never ships in the app bundle.
 */

const CARD = 150;

async function main(): Promise<void> {
  const root = document.getElementById("gallery") as HTMLElement;
  const status = document.getElementById("status") as HTMLElement;
  const search = document.getElementById("search") as HTMLInputElement;

  status.textContent = "Loading pack…";
  const assets = await loadCafeAssets();
  status.textContent = `${assets.names.length} objects, one shared material.`;

  // One renderer for every thumbnail — a WebGL context per card would blow the
  // browser's context limit long before 343.
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(CARD, CARD);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff3e0, 0xd9b48a, 1.1));
  const key = new THREE.DirectionalLight(0xffdca8, 2.2);
  key.position.set(3, 5, 4);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);

  interface Card {
    entry: AssetEntry;
    canvas: HTMLCanvasElement;
    element: HTMLElement;
  }
  const cards: Card[] = [];

  for (const [source, list] of assets.bySource) {
    if (list.length === 0) continue;
    const section = document.createElement("section");
    const heading = document.createElement("h2");
    heading.textContent = `${source.replace(/_/g, " ")} — ${list.length}`;
    section.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "grid";

    for (const entry of list) {
      const card = document.createElement("div");
      card.className = "card";

      const canvas = document.createElement("canvas");
      canvas.width = CARD;
      canvas.height = CARD;
      card.appendChild(canvas);

      const label = document.createElement("div");
      label.className = "name";
      label.textContent = entry.name;
      card.appendChild(label);

      const dims = document.createElement("div");
      dims.className = "dims";
      const s = entry.size;
      dims.textContent = `${s.x.toFixed(2)} × ${s.y.toFixed(2)} × ${s.z.toFixed(2)}`;
      card.appendChild(dims);

      // Click to copy the name — the whole point is getting names into code.
      card.addEventListener("click", () => {
        void navigator.clipboard?.writeText(entry.name);
        label.textContent = "copied!";
        window.setTimeout(() => (label.textContent = entry.name), 800);
      });

      grid.appendChild(card);
      cards.push({ entry, canvas, element: card });
    }

    section.appendChild(grid);
    root.appendChild(section);
  }

  // Render each thumbnail once, then blit into its own 2D canvas.
  function drawAll(): void {
    for (const { entry, canvas, element } of cards) {
      if (element.style.display === "none") continue;

      const mesh = assets.create(entry.name)!;
      scene.add(mesh);

      // Frame the object: pull back based on its own bounding sphere.
      const radius = entry.size.length() / 2 || 0.5;
      const distance = radius / Math.tan((camera.fov * Math.PI) / 360) + radius;
      camera.position.set(distance * 0.75, entry.size.y / 2 + distance * 0.55, distance * 0.75);
      camera.lookAt(0, entry.size.y / 2, 0);
      camera.updateProjectionMatrix();

      renderer.render(scene, camera);
      const context = canvas.getContext("2d");
      context?.clearRect(0, 0, CARD, CARD);
      context?.drawImage(renderer.domElement, 0, 0);

      scene.remove(mesh);
    }
  }

  drawAll();

  search.addEventListener("input", () => {
    const term = search.value.trim().toLowerCase();
    for (const { entry, element } of cards) {
      element.style.display = !term || entry.name.toLowerCase().includes(term) ? "" : "none";
    }
    drawAll();
  });
}

void main();
