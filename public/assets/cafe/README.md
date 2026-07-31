# Café assets — Minty.kit "Cozy Cat Café" v2.2

**Source:** https://mintygamekit.itch.io/
**Licence:** CC0 (Creative Commons Zero) — free for personal, educational and
commercial use, no attribution required. Full text in `LICENSE.txt`.

Crediting Minty.kit is optional but appreciated; do it in the app credits.

## What's here

Five glTF files (~343 objects) sharing **one texture atlas**:

| file | contents |
|---|---|
| `Furniture.gltf` | seating, tables, modular bar/counter, shelves, cat beds, cat climbers, cushions, carpets, bins |
| `Food_and_Deco.gltf` | cups, cakes, milkshakes, coffee machine, plants, tills |
| `Walls_Floors_Style_A/B/C.gltf` | three complete wall + floor styles, modular |

## Facts that matter for integration

- **No materials, textures or images are defined in the glTF.** The meshes carry
  UVs only. `scene/asset-library.ts` applies `T_CatCafe_Atlas.png` as one shared
  material across every object — which is why the whole café costs only a
  couple of draw calls.
- Geometry is authored **Z-up**; the node rotation corrects it to Y-up. The
  loader bakes that in.
- Node translations place objects in the artist's **sample-scene grid**, not at
  the origin. The loader discards them and re-centres each object on its own
  footprint with its base at y=0.
- The modular grid is **4×4 units per floor tile**; walls are 4 wide, 4 tall.
- `x_*_copy*` nodes are sample-scene duplicates and are filtered out.

**Do not edit these files.** They're the pristine download; regenerate from the
original zip if anything here is damaged.
