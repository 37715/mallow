"""
Draw Mallow's app icon, launch splash and favicon from one mark.

Run:  python3 tools/make-icons.py

**One drawing, every size**, for the same reason the character conversion is a
script: an icon set made by hand in an image editor drifts the moment one size
is re-exported and the others aren't.

The mark is a **latte seen from above with a cat's face in the foam**. It has to
work at 60 px on a home screen, which rules out most of what the game actually
looks like — a diorama at thumbnail size is mud. Two flat shapes and a
silhouette survive the shrink, and between them they say "cat" and "café"
without a word.

Palette is §9's, unchanged: honey is the one accent this game fills anything
with, slate is its signage, chalk is what's written on it.

Everything is drawn at 4× and downsampled, because PIL has no antialiasing on
shape fills — a circle drawn at final size has visibly stepped edges.
"""

import math
import os

from PIL import Image, ImageDraw

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICON = os.path.join(REPO, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png")
SPLASH_DIR = os.path.join(REPO, "ios/App/App/Assets.xcassets/Splash.imageset")
FAVICON = os.path.join(REPO, "public/favicon.png")

# §9's palette. Do not pick new colours here — if the icon needs a colour the
# interface doesn't have, one of the two is wrong.
HONEY = (232, 162, 74)
HONEY_DEEP = (214, 140, 58)
SLATE = (43, 33, 26)
CHALK = (246, 237, 221)
CREMA = (222, 186, 143)
BLUSH = (229, 138, 153)
# The default backdrop (`data/backdrops.ts`, "olive"), which is the very first
# colour the game paints. The splash uses it so the launch screen hands over to
# the café without a flash of anything else.
BACKDROP = (0x8B, 0x77, 0x48)

SS = 4  # supersample factor


def log(message):
    print(f"[icons] {message}", flush=True)


def draw_mark(size, background=True, inset=1.0):
    """
    The mark, at `size` px. `inset` shrinks the cup within the canvas, which is
    what lets the splash use the same drawing with a lot more air around it.
    """
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if background:
        # A flat fill would read as a sticker. A vertical warm gradient is one
        # `linear` image scaled up — cheap, and it gives the icon some depth
        # under the home screen's own gloss.
        grad = Image.new("RGB", (1, 256))
        for y in range(256):
            t = y / 255
            grad.putpixel(
                (0, y),
                tuple(round(HONEY[i] + (HONEY_DEEP[i] - HONEY[i]) * t) for i in range(3)),
            )
        img.paste(grad.resize((s, s), Image.BILINEAR), (0, 0))

    c = s / 2
    # **The cup is smaller than centred, and sits low.** Steam needs somewhere
    # to go: at the old radius the saucer reached within a few pixels of the
    # top edge, so the curls ran off it and read as scratches rather than as
    # anything rising. Shrinking the cup and dropping it costs nothing at
    # thumbnail size and buys the whole top of the canvas.
    cup = s * 0.335 * inset
    cy = c + s * 0.045 * inset  # vertical centre of the cup

    # The saucer: a hair of chalk showing past the cup, which is what stops the
    # mark reading as a flat disc.
    d.ellipse([c - cup * 1.13, cy - cup * 1.13, c + cup * 1.13, cy + cup * 1.13], fill=CHALK)
    # The cup's inner wall, then the coffee.
    d.ellipse([c - cup, cy - cup, c + cup, cy + cup], fill=CREMA)

    # --- the foam cat ------------------------------------------------------
    #
    # Same construction rules as `ui/icons.ts`: closed shapes only, nothing
    # thinner than about 1.5 px at final size, and the ears kept clear of the
    # centre so they read as ears rather than as a bow tie.
    head = cup * 0.46
    hy = cy + cup * 0.06  # sits low, so the ears have room inside the cup

    ear = head * 0.62
    for side in (-1, 1):
        ex = c + side * head * 0.62
        ey = hy - head * 0.62
        d.polygon(
            [
                (ex - ear * 0.52, ey + ear * 0.45),
                (ex + ear * 0.52, ey + ear * 0.45),
                (ex + side * ear * 0.12, ey - ear * 0.62),
            ],
            fill=SLATE,
        )

    d.ellipse([c - head, hy - head * 0.92, c + head, hy + head * 0.92], fill=SLATE)

    # Two chalk eyes, closed and content — a cat with open eyes at this size is
    # two dots, which reads as surprise rather than as sleeping in a warm room.
    eye = head * 0.30
    for side in (-1, 1):
        ex = c + side * head * 0.42
        ey = hy - head * 0.08
        d.arc(
            [ex - eye, ey - eye * 0.9, ex + eye, ey + eye * 1.1],
            start=200,
            end=340,
            fill=CHALK,
            width=max(2, int(head * 0.14)),
        )

    # A blush, because this is a cosy game and the icon should say so.
    cheek = head * 0.20
    for side in (-1, 1):
        ex = c + side * head * 0.72
        ey = hy + head * 0.22
        d.ellipse([ex - cheek, ey - cheek * 0.62, ex + cheek, ey + cheek * 0.62], fill=BLUSH)

    # --- what stops it reading as clip art ---------------------------------
    #
    # Ellis: *"spice up the favicon it looks too plain and default."* Three
    # flat concentric circles are a placeholder, whatever is drawn in the
    # middle of them. What was missing is any suggestion of a *thing in a
    # room*: coffee is a liquid, the cup has a rim, and it is warm.

    # A crescent of shadow inside the rim, so the cup has a depth to it. Drawn
    # as an offset ellipse clipped to the coffee, which is cheaper than a real
    # inner shadow and reads the same at this size.
    shade = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(shade).ellipse(
        [c - cup, cy - cup * 1.18, c + cup, cy + cup * 0.82], fill=(90, 60, 30, 46)
    )
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).ellipse([c - cup, cy - cup, c + cup, cy + cup], fill=255)
    img.paste(Image.alpha_composite(img.crop((0, 0, s, s)), shade), (0, 0), mask)

    # A highlight where the light falls, top-left, the same direction as §9's
    # key light. One soft ellipse is enough to say "liquid".
    gloss = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(gloss).ellipse(
        [c - cup * 0.72, cy - cup * 0.86, c - cup * 0.06, cy - cup * 0.42],
        fill=(255, 246, 230, 54),
    )
    img.alpha_composite(gloss)

    # **No steam, and that was tried twice.** A curl of steam is the obvious
    # way to say "hot", and at icon scale it is two stray hooks: there is only
    # a sliver of canvas above the saucer, the line has to be a few pixels wide
    # to survive the downsample, and what is left reads as a scratch rather
    # than as vapour. Depth had to come from the cup itself instead — the
    # shading and the gloss above — plus this: a soft vignette, which is what
    # stops the honey background reading as a flat swatch.
    if background:
        vignette = Image.new("L", (s, s), 0)
        vd = ImageDraw.Draw(vignette)
        rings = 26
        for i in range(rings):
            t = i / rings
            r = s * (0.50 + 0.34 * t)
            vd.ellipse([c - r, c - r, c + r, c + r], outline=int(58 * t), width=int(s * 0.03))
        img.alpha_composite(Image.merge("RGBA", (
            Image.new("L", (s, s), 60), Image.new("L", (s, s), 38),
            Image.new("L", (s, s), 12), vignette,
        )))

    return img.resize((size, size), Image.LANCZOS)


# --- app icon -------------------------------------------------------------
#
# 1024², opaque: the App Store rejects an icon with alpha, and iOS masks the
# corners itself, so it must be drawn square edge to edge.
icon = draw_mark(1024).convert("RGB")
icon.save(ICON)
log(f"app icon → {os.path.relpath(ICON, REPO)}  ({os.path.getsize(ICON) / 1024:.0f} kB)")

# --- launch splash --------------------------------------------------------
#
# Square and huge, because the storyboard scales it aspect-fill across every
# device — anything not dead centre gets cropped on some phone.
#
# **It is the backdrop olive, not cream.** A launch screen's one job is to not
# be noticed, and the way it gets noticed is by being a different colour from
# the first thing the app draws. The web view opens on the olive backdrop, so
# the splash is that olive and the hand-over is invisible.
splash = Image.new("RGB", (2732, 2732), BACKDROP)
splash.paste(draw_mark(2732, background=False, inset=0.42), (0, 0), draw_mark(2732, background=False, inset=0.42))
for name in ("splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"):
    splash.save(os.path.join(SPLASH_DIR, name))
log(f"splash → {len(os.listdir(SPLASH_DIR)) - 1} files, {splash.width}×{splash.height}")

# --- favicon --------------------------------------------------------------
#
# The web build is a development tool and never ships (§0), but a browser tab
# with a default globe on it is a tab you lose among twenty others.
draw_mark(180).save(FAVICON)
log(f"favicon → {os.path.relpath(FAVICON, REPO)}")
