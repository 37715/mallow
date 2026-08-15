"""
Pack the Lip Sync pack's eye and mouth sprites into two atlases.

Run:  python3 tools/build-face-atlas.py

The pack ships one PNG per expression — 16 eyes and 20 simplified mouths — and
the obvious way to use them is to swap `material.map` per frame. Don't: the
face meshes UV-map the **full 0–1 square** (checked: u and v both span
0.004–0.996 on all three), so one atlas plus a UV offset gives the same result
with a single texture bound for every character in the café.

**Why cell sizes differ.** The atlas is shared by every character, so its cost
is paid once, but it is still real VRAM against the budget in
`src/data/graphics.ts`:

    eyes   16 cells @ 128²    → 512 × 512    ≈ 1.0 MB
    mouths 20 cells @ 256×128 → 1024 × 640   ≈ 2.6 MB

Eyes get the smaller cell because an eye is ~20 screen pixels on a seated
guest; the mouth keeps native resolution because the tutorial character is
shown close up and the mouth is the thing the player is watching move.

Output: two PNGs under `public/assets/characters/textures/`, plus a manifest at
`src/data/face-atlas.json` naming every frame in grid order. **The manifest is
generated rather than hand-written on purpose** — an index that disagrees with
the atlas fails silently, as the wrong shape rather than a missing one, which
is exactly the class of bug this project keeps paying for.
"""

import json
import os

from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PACK = os.path.join(REPO, "graphics/Characters - Lip Sync and Expressions v0.1/Textures/Eyes and Mouth")
OUT_TEXTURES = os.path.join(REPO, "public/assets/characters/textures")
OUT_MANIFEST = os.path.join(REPO, "src/data/face-atlas.json")

# The simplified mouth set, not the full 30-frame one. Its legend maps whole
# letter groups to a shape ("C, SH, CH, N") rather than IPA phonemes, which is
# what a text-driven lip sync can actually resolve — we have no phoneme data,
# only the words the tutorial says.
SETS = {
    "eyes": {
        "dir": "Eyes_Sprites",
        "cell": (128, 128),
        "cols": 4,
        "out": "T_Face_Eyes.png",
    },
    "mouths": {
        "dir": "Mouth_Simplified_Sprites",
        "cell": (256, 128),
        "cols": 4,
        "out": "T_Face_Mouths.png",
    },
}


def log(message):
    print(f"[faces] {message}", flush=True)


def frame_name(filename):
    """`Lips_s07_m-b-p.png` -> `m-b-p`; `Eye_Hearts1.png` -> `Hearts1`."""
    stem = os.path.splitext(filename)[0]
    if stem.startswith("Lips_s"):
        return stem.split("_", 2)[2] if stem.count("_") >= 2 else stem
    if stem.startswith("Eye_"):
        parts = stem.split("_", 2)
        # `Eye_0_Default` carries an index the others don't.
        return parts[2] if len(parts) == 3 else parts[1]
    return stem


manifest = {}

for key, spec in SETS.items():
    source = os.path.join(PACK, spec["dir"])
    files = sorted(f for f in os.listdir(source) if f.lower().endswith(".png"))
    cell_w, cell_h = spec["cell"]
    cols = spec["cols"]
    rows = -(-len(files) // cols)  # ceil

    atlas = Image.new("RGBA", (cols * cell_w, rows * cell_h), (0, 0, 0, 0))
    names = []
    for index, filename in enumerate(files):
        sprite = Image.open(os.path.join(source, filename)).convert("RGBA")
        if sprite.size != (cell_w, cell_h):
            sprite = sprite.resize((cell_w, cell_h), Image.LANCZOS)
        col, row = index % cols, index // cols
        atlas.paste(sprite, (col * cell_w, row * cell_h))
        names.append(frame_name(filename))

    path = os.path.join(OUT_TEXTURES, spec["out"])
    atlas.save(path, optimize=True)
    manifest[key] = {
        "texture": f"/assets/characters/textures/{spec['out']}",
        "cols": cols,
        "rows": rows,
        "frames": names,
    }
    log(
        f"{key}: {len(files)} frames → {cols}×{rows} grid, "
        f"{atlas.width}×{atlas.height}, {os.path.getsize(path) / 1024:.0f} kB"
    )

with open(OUT_MANIFEST, "w") as handle:
    json.dump(manifest, handle, indent=2)
    handle.write("\n")
log(f"wrote {os.path.relpath(OUT_MANIFEST, REPO)}")
