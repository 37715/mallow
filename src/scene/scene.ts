import * as THREE from "three";
import { CAMERA_FOV, fitCameraToCafe, setFloorExtent } from "@/scene/camera";
import { createPostChain } from "@/scene/post";
import { DEFAULT_BACKDROP, backdrop } from "@/data/backdrops";
import type { Instance } from "@/state/store";
import { HOME_WINDOW, PATCH, floorBounds, type TileKey } from "@/data/expansion";
import { DEFAULT_LEVEL, pixelRatioFor, type GraphicsLevel } from "@/data/graphics";
import { buildCafeRoom } from "@/scene/cafe-room";
import { configureAssetQuality } from "@/scene/asset-library";
import type { Customisation } from "@/data/customisation";
import type { Placements } from "@/data/cafe-layout";

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  render: () => void;
  /** Rebuild the room after a colourway change or a furniture move. */
  rebuildRoom: (
    choice: Customisation,
    placements: Placements,
    purchased: string[],
    tiles: TileKey[],
    instances: Instance[],
    windows: string[],
  ) => Promise<void>;
  /** The café's current object group, for raycasting against its furniture. */
  getRoomGroup: () => THREE.Group;
  /**
   * Hand the scene its camera controls, so a resize can re-solve the zoom-out
   * limit — that limit is the fitted distance, which is aspect-dependent (§9).
   */
  attachControls: (controls: { onResize(aspect: number): void }) => void;
  /** Draw something over the finished frame each render (the shop preview). */
  setOverlay: (fn: ((renderer: THREE.WebGLRenderer, now: number) => void) | null) => void;
  /** Raise canvas resolution (and drop GTAO to pay for it) while a 3D preview
   *  panel is on screen. See the note by `BASE_PIXEL_RATIO`. */
  setPreviewSharpness: (on: boolean) => void;
  /** Change the resolution budget. Applied immediately — see `data/graphics.ts`. */
  setQuality: (level: GraphicsLevel) => void;
  /** Repaint the ground and sky (§ data/backdrops.ts). */
  setBackdrop: (id: string) => void;
  /** The café's own bounce-light probe, reused to light the shop preview. */
  environment: THREE.Texture | null;
}

/**
 * Bright, warm, high-key lighting (§9 — lighting is the star).
 *
 * **This has now been wrong in both directions, so read the history before
 * retuning it.** The first pass was flat and washed out. The correction — low
 * fill, one warm key, and three hot interior pool lights — overshot badly: it
 * produced a room lit like a bar at closing time, with pale peach walls
 * rendering as brown and everything outside the pools falling away to murk.
 *
 * The target is the asset pack's own promo renders (`graphics/`): **high
 * ambient, gentle shading, saturated accents, soft low-contrast shadows.** In
 * those images there is no visible pool of light anywhere — the room is simply
 * and evenly bright, and the cosiness comes from the *palette* and the warmth
 * of the fill, not from darkness. That is the thing to preserve.
 *
 * So: fill does the illuminating, the key only shapes it, and the interior
 * pool lights are gone. Warm and bright are not opposites; the previous
 * comment here claimed they were, and that is what sent it wrong.
 *
 * **Measure it, don't argue about it.** Every pass before this one was tuned by
 * describing the picture to itself. Sampling matched surfaces out of the
 * reference render and out of our own frame settled in minutes what several
 * passes of adjectives could not.
 *
 * **The exposure here is deliberately very low (0.40), and it is not a mistake.**
 * It looks wrong in isolation because it is only half of the picture: the
 * The grade (`GRADE_GLSL` below) lifts the black point back up afterwards. Together they
 * are a contrast reduction — the scene is rendered dark and then lifted, rather
 * than rendered bright and then compressed, which is what finally matched the
 * reference's soft, low-contrast look. **Change one and you must change the
 * other**, or the room goes either murky or bleached.
 */
function addLighting(scene: THREE.Scene): void {
  // **Gradient, not flat.** Most of the fill is hemispherical rather than
  // ambient, and that split is the whole point: a flat AmbientLight adds the
  // same value to every surface at every angle, which is bright but dead — it
  // was what made the over-corrected pass look like a lightbox. Hemisphere
  // fill varies with surface normal, so ceilings, walls and floors separate
  // from each other and the room gets a soft top-to-bottom gradient for free.
  //
  // A small flat ambient underneath stops the downward faces crushing.
  //
  // **The fill is gently warm, and it is strong.** Two separate things:
  //
  // - *Gently* warm. A strongly amber key once pushed the atlas's peach into
  //   orange, so a pass swung the fill to pure white — and mean saturation fell
  //   to 0.395 against the reference's 0.538, because the reference *is* warm.
  //   The balance is a light warm tint here, with the real warmth kept for the
  //   key and the window where it reads as sunlight rather than a global cast.
  // - *Strong*: the shadowed side of everything used to fall to L 0.18 against
  //   the reference's 0.24, and a big lit/unlit step is exactly what "dramatic"
  //   means. Lifting the fill and dropping the key to 0.3 closes it.
  scene.add(new THREE.AmbientLight(0xfff3e4, 0.55));

  // The key only shapes; it does not illuminate. Deliberately weak — at its old
  // 1.05 the step between a lit and an unlit face was the single biggest source
  // of harshness in the frame.
  const key = new THREE.DirectionalLight(0xfff7e8, 0.3);
  key.position.set(3.5, 6.5, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 30;
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -4;
  // Soft and light. In the reference renders you can see a shadow under the
  // counter, but only just — hard shadows read harsh, and harsh isn't cosy.
  key.shadow.radius = 5;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  scene.add(key);

  // Daylight through the one window (back wall, so it shines in along +z).
  // Wide and gentle: it should lift that side of the room, not brand a hot
  // patch onto the floorboards. It used to be intensity 9 through a narrow
  // cone, which is most of why the room looked spotlit.
  const windowLight = new THREE.SpotLight(0xfff8ec, 1.5, 14, Math.PI / 3.2, 1, 1.1);
  windowLight.position.set(0.2, 3.4, -6.0);
  windowLight.target.position.set(0.7, 0.4, 0.9);
  windowLight.castShadow = false; // the key already casts; a second is wasted cost
  scene.add(windowLight);
  scene.add(windowLight.target);
}

/**
 * Bounce light, as an environment map — the closest thing to global
 * illumination we can afford.
 *
 * **This is the fix for the one gap measuring kept finding and lights kept
 * failing to close.** In the reference render the floor cushions are *brighter*
 * than the floorboards they sit on, because a small object in a bright room
 * catches light off the floor and walls from every direction. An `AmbientLight`
 * cannot reproduce that: it adds the same value regardless of which way a
 * surface faces, so a rounded cushion's sloped sides stay dark while the flat
 * floor stays correct. That mismatch is what read as "reds too dramatic".
 *
 * An environment map *is* directional irradiance, so a face angled at the bright
 * floor gets the floor's light and a face angled at the cream wall gets the
 * wall's. `MeshStandardMaterial` picks `scene.environment` up for free.
 *
 * The environment is the café's own light field, built as a box painted from
 * the inside: warm boards below, cream walls around, a bright patch where the
 * window is. It is generated once at startup — no HDRI to ship.
 */
export function buildEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const room = new THREE.Scene();

  // Painted from the inside, so BackSide and a box big enough to sit "around"
  // the café. Unlit basic colours: this is a light *source*, not a surface.
  const face = (color: number, position: THREE.Vector3, rotation: THREE.Euler, size: number) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    mesh.position.copy(position);
    mesh.rotation.copy(rotation);
    room.add(mesh);
  };

  const S = 12;
  const H = S / 2;
  // Floor: the warm boards, and the single most important face — it is what
  // lifts the underside and sloped faces of everything sitting on it.
  face(0xd8a468, new THREE.Vector3(0, -H, 0), new THREE.Euler(-Math.PI / 2, 0, 0), S);
  // Ceiling and walls: cream plaster, a touch cooler above.
  face(0xfff4e6, new THREE.Vector3(0, H, 0), new THREE.Euler(Math.PI / 2, 0, 0), S);
  face(0xf6e6d2, new THREE.Vector3(-H, 0, 0), new THREE.Euler(0, Math.PI / 2, 0), S);
  face(0xf6e6d2, new THREE.Vector3(H, 0, 0), new THREE.Euler(0, -Math.PI / 2, 0), S);
  face(0xf3e2cd, new THREE.Vector3(0, 0, H), new THREE.Euler(0, Math.PI, 0), S);
  // The window wall, and the daylight coming through it.
  face(0xf0dcc4, new THREE.Vector3(0, 0, -H), new THREE.Euler(0, 0, 0), S);
  face(0xffffff, new THREE.Vector3(0, 0.6, -H + 0.05), new THREE.Euler(0, 0, 0), 4.2);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(room, 0.08);
  pmrem.dispose();
  room.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
    }
  });
  return target.texture;
}

/**
 * The ground the diorama stands on.
 *
 * Without this the café floated on a flat fill and read, in Ellis's words, like
 * a testing version. Two things were missing, and measuring the reference
 * render showed both:
 *
 * 1. **The backdrop is a gradient, not a colour.** Sampling `K9gvnT.png` down
 *    its edges gives (159,142,84) at the top-left easing to (182,158,87) at the
 *    bottom-right — a studio sweep. Ours was dead flat at a single value the
 *    whole way down, which is what makes a backdrop read as "no backdrop".
 * 2. **There is contact darkening where the platform meets the ground.** Not a
 *    hard cast shadow — the reference barely has one, the A-frame sign hardly
 *    casts at all — but the ground immediately around the platform is a few
 *    values down, and that band is what sits the café *on* something.
 *
 * So: one big vertex-coloured plane for the sweep (four vertices, no texture to
 * ship), and a shadow-catching plane just above it. GTAO does the contact band
 * for free once there is actually geometry there to occlude against — its
 * radius is 0.28 world units, so it stays a thin hug around the base rather
 * than dirtying the whole lower frame.
 *
 * The plane is huge because the camera looks down at 34° with a 45° vertical
 * FOV: the top of frame still points ~11° below horizontal, so the ground fills
 * every pixel and there is never a horizon seam against `scene.background`.
 */
function addGround(scene: THREE.Scene): (id: string) => void {
  const geometry = new THREE.PlaneGeometry(160, 160, 1, 1);
  geometry.rotateX(-Math.PI / 2);

  // PlaneGeometry's four vertices after the rotation, in order: (−x,−z),
  // (+x,−z), (−x,+z), (+x,+z). The sweep runs along +x, which is screen
  // right-and-down from this camera — the direction the reference brightens in.
  const colors = new Float32Array(4 * 3);
  const colorAttribute = new THREE.BufferAttribute(colors, 3);
  geometry.setAttribute("color", colorAttribute);

  // The contact shadow rides on the ground's *own* material rather than on a
  // decal plane floating above it.
  //
  // A separate plane was tried and never appeared: the composer's render target
  // has a low-precision depth buffer, so the 0.005 of clearance that looks
  // ample in world units is below one depth step at this camera distance and
  // the decal simply lost the depth test. Widening the gap would have left the
  // café visibly hovering. One surface, one multiply, no z-fight.
  //
  // The texture covers the middle SHADOW_SPAN units and clamps to white outside,
  // so the plane can stay enormous while the shadow stays local.
  const shadow = groundShadowTexture();
  shadow.repeat.set(160 / SHADOW_SPAN, 160 / SHADOW_SPAN);
  shadow.offset.set(-7.5, -7.5);

  const ground = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ vertexColors: true, map: shadow }),
  );
  // Just under the floor slab's underside (−0.26), and under the A-frame sign
  // and stray cushion, which the reference sinks a hair below the platform line.
  ground.position.y = -0.28;
  ground.name = "ground";
  scene.add(ground);

  /**
   * Repaint the backdrop. The gradient and `scene.background` move together —
   * they meet at the horizon and any difference between them is a visible seam
   * across the whole width of the screen.
   */
  return (id: string): void => {
    const choice = backdrop(id);
    const dim = new THREE.Color(choice.dim);
    const lit = new THREE.Color(choice.lit);
    [dim, lit, dim, lit].forEach((c, i) => c.toArray(colors, i * 3));
    colorAttribute.needsUpdate = true;
    scene.background = dim;
  };
}

/** How many world units across the contact-shadow decal spans, centred on the room. */
const SHADOW_SPAN = 10;

/**
 * The soft dark patch the café sits in — the platform's footprint, blurred, as
 * a **multiply map**: white everywhere it shouldn't darken, grey where it should.
 *
 * Painted with canvas `shadowBlur`, which is the one blur primitive every
 * browser has had forever: draw the shape off-canvas and let its *shadow* land
 * on the canvas instead. No `filter` support needed, no image to ship.
 *
 * Only the feathered rim is ever seen — the platform itself covers the middle —
 * so the shapes are the footprint at true size and the blur radius is the thing
 * to tune. White at the edges matters: the texture clamps, so the whole rest of
 * the 160-unit ground samples that border and must come out untouched.
 */
function groundShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const perUnit = size / SHADOW_SPAN;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);

  // Texture v is flipped on upload, so canvas +y runs along world +z and canvas
  // +x along world +x, both offset by half the span.
  const px = (world: number) => (world + SHADOW_SPAN / 2) * perUnit;

  ctx.fillStyle = "#000";
  ctx.shadowBlur = 26; // ≈ 1 world unit of feather
  ctx.shadowOffsetX = size; // the shape is drawn off to the left; its shadow lands on canvas

  // **Each patch is drawn bigger than the thing it sits under.** Drawn at the
  // true footprint, the blur is centred on the platform's edge, so half of it
  // falls *under* the platform where nothing can see it and what escapes is a
  // 4% tint — invisible. Growing the shape pushes the dark part of the gradient
  // out past the edge, which is the only part that ever gets looked at.
  const grow = 0.32;
  const patch = (x0: number, z0: number, x1: number, z1: number, strength: number) => {
    ctx.shadowColor = `rgba(46,34,10,${strength})`;
    ctx.fillRect(
      px(x0 - grow) - size,
      px(z0 - grow),
      px(x1 + grow) - px(x0 - grow),
      px(z1 + grow) - px(z0 - grow),
    );
  };
  // The 4×4 floor tile, and the entrance step jutting off its front-left.
  patch(-2, -2, 2, 2, 0.34);
  patch(-2, 2, -0.13, 2.7, 0.34);
  // The two things standing on the bare ground outside the door. Lighter: they
  // are small and light, and the reference barely darkens under them at all.
  patch(0.62, 2.35, 1.3, 2.95, 0.2);
  patch(2.05, 0.55, 2.85, 1.3, 0.2);

  const texture = new THREE.CanvasTexture(canvas);
  // A multiply mask, not colour: left as sRGB the painted percentages get
  // gamma-expanded and the shadow lands about half again as dark as drawn.
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

/**
 * The colour grade — a lift/gain/saturation trim in display space.
 *
 * **This exists because we have no global illumination, and no amount of
 * light-tuning substitutes for it.** In the reference render the floor cushions
 * are *brighter* than the floorboards, because light bounces off a bright room
 * onto every side of a small object sitting in it. In ours they are darker,
 * because a point sitting in open space only receives what the lights aim at
 * it. Measured against `graphics/K9gvnT.png`, the neutrals — floor, walls,
 * counter — already match within a few values; it is specifically the small
 * saturated props that sit 25–30% too dark, and that reads exactly as Ellis
 * described it: reds that are "so dramatic and red".
 *
 * Ruled out first, both cleanly, by measuring with them off: **GTAO** (identical
 * numbers) and **atlas mipmap bleed** (identical numbers). Don't re-investigate
 * those.
 *
 * The three controls do one job each, and they interact:
 * - `lift` raises the black point. This is what softens the reds — it pulls a
 *   deep pure red up toward coral, and it lowers overall contrast, which was
 *   the other half of the note.
 * - `gain` brings the mid-to-bright neutrals back down, since the lift raised
 *   everything and the neutrals were already correct.
 * - `saturation` puts back the colour the lift washed out. Lift and saturation
 *   together land the reds at the reference's own purity (0.72) while brighter
 *   than before — which is what "pastel" actually is: lighter, not greyer.
 *
 * Solved numerically against sampled surface pairs rather than by eye, with the
 * neutrals weighted so they were not allowed to move.
 */
/**
 * The solved constants, and the grade as a reusable GLSL function.
 *
 * **Both are exported because the shop's preview applies the same grade.** The
 * previews render outside the composer (see `scene/preview-stage.ts`), and the
 * colourway picker is a *colour* picker — an olive sofa that reads butter
 * yellow on the turntable and olive in the room is a broken control, not a
 * cosmetic difference. Sharing the function is what keeps the two honest.
 */
export const GRADE_VALUES = { lift: 0.20, gain: 1.0, saturation: 1.2 };

export const GRADE_GLSL = /* glsl */ `
  uniform float uLift;
  uniform float uGain;
  uniform float uSaturation;

  vec3 applyGrade(vec3 c) {
    // **The lift is weighted by colourfulness, not applied flat.** A flat
    // lift fixes the saturated props but also drags the blackboard and the
    // dark woodwork up with it, and the frame goes milky — measured, the deep
    // 5th percentile overshot the reference by 0.12. Only saturated surfaces
    // are too dark here, so only they get lifted. Neutral darks keep their
    // depth. The (1 - c) factor keeps whites fixed either way.
    float mx = max(c.r, max(c.g, c.b));
    float mn = min(c.r, min(c.g, c.b));
    float colourfulness = mx > 0.001 ? (mx - mn) / mx : 0.0;
    c += uLift * colourfulness * (1.0 - c);

    c *= uGain;
    float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(luma), c, uSaturation);
    return clamp(c, 0.0, 1.0);
  }
`;

/**
 * A soft, round falloff used for the light bloom. Generated rather than loaded
 * so there's no texture to ship.
 */
function softGlowTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,246,224,1)");
  gradient.addColorStop(0.45, "rgba(255,240,205,0.42)");
  gradient.addColorStop(1, "rgba(255,236,195,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * The window aperture, in world space. The wall piece sits at the origin with
 * its authored offset, and its glass primitive occupies these bounds — see
 * `data/cafe-layout.ts` SILL for how this geometry was measured.
 *
 * The window is on the **back** wall (−z), not the left one. It moved there
 * when the room was rebuilt against the reference render; if the beams ever
 * appear on the wrong side of the café, this constant and `SUN` are why.
 * `y` is already offset for the wall sitting at −FLOOR_THICKNESS.
 */
const GLASS = { z: -2.16, y: 1.59, halfHeight: 0.92, halfWidth: 1.12 };

/** The direction sunlight travels once it's through the glass: in, and down. */
const SUN = new THREE.Vector3(0.1, -0.62, 1).normalize();

/**
 * How far *past* the wall plane the glass plane sits.
 *
 * The home tile's wall stands at z = −2 and `GLASS.z` is −2.16, so this is the
 * number those two have always implied rather than a new guess.
 */
const GLASS_OFFSET = -(GLASS.z + PATCH / 2);

/**
 * Where each bought window is, and which way its light comes in.
 *
 * **The daylight follows the windows now** (2026-08-25). The panel and the
 * shafts were authored against the back wall's fixed coordinates, so the first
 * window bought on the left wall was a hole with the backdrop behind it while
 * the original blazed — the two read as different features rather than the
 * same one. Both are derived from `windows` here, exactly as the wall meshes
 * already are.
 */
function windowLights(windows: string[]): { at: THREE.Vector3; sun: THREE.Vector3 }[] {
  const out: { at: THREE.Vector3; sun: THREE.Vector3 }[] = [];
  for (const id of windows) {
    const [side, key] = id.split(":");
    const [tx, tz] = (key ?? "").split(",").map(Number);
    if (!Number.isFinite(tx) || !Number.isFinite(tz)) continue;
    if (side === "back") {
      out.push({
        at: new THREE.Vector3(tx * PATCH, GLASS.y, tz * PATCH - PATCH / 2 - GLASS_OFFSET),
        sun: SUN.clone(),
      });
    } else if (side === "left") {
      // The −x wall's light is the −z wall's, turned a quarter: mostly +x,
      // with the same downward tilt and the same slight drift along the wall.
      out.push({
        at: new THREE.Vector3(tx * PATCH - PATCH / 2 - GLASS_OFFSET, GLASS.y, tz * PATCH),
        sun: new THREE.Vector3(1, -0.62, -0.1).normalize(),
      });
    }
  }
  return out;
}

/**
 * Volumetric light shafts through the window.
 *
 * **This is the thing that makes the room feel lit rather than merely bright.**
 * Two earlier attempts failed in instructive ways:
 *
 * - Hard-edged slabs angled into the room read as white rectangles lying on the
 *   floorboards, because they had edges and real light doesn't.
 * - Replacing them with round additive blobs removed the edges but also removed
 *   the *shafts* — there was nothing left to see coming through the glass.
 *
 * So this is an actual volume: a box swept from the glass along the sun
 * direction, shaded per-fragment. Three things earn their cost in the shader:
 *
 * 1. **Feathered cross-section** — soft everywhere, so there is no edge to
 *    catch the eye, which is what killed the slab version.
 * 2. **Mullion bars** — the window's glazing bars cut the light into separate
 *    shafts. This is the detail that makes it read as sun through a window
 *    rather than as a glowing wedge, and it's why a plain cone wouldn't do.
 * 3. **Falloff along the beam**, easing in at the glass so the shaft doesn't
 *    begin with a visible mouth, and out as it travels into the room.
 *
 * Additive and depth-tested, so furniture correctly occludes it and the floor
 * cuts the beam off where it lands. Not tone mapped — light is allowed to be
 * brighter than the surfaces it falls on.
 *
 * Returns an update function; the shafts breathe very slowly so the room feels
 * alive without anything visibly animating.
 */
function addLightShafts(
  scene: THREE.Scene,
  windows: string[],
): { update: (elapsedSeconds: number) => void; dispose: () => void } {
  const length = 3.2;

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uInvModel: { value: new THREE.Matrix4() },
      uColor: { value: new THREE.Color(0xffe7bd) },
      uDensity: { value: 0.17 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vObj;
      void main() {
        vObj = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform mat4 uInvModel;
      uniform vec3 uColor;
      uniform float uDensity;
      uniform float uTime;
      varying vec3 vObj;

      const int STEPS = 28;

      // Distance to the nearest glazing bar, as a 0..1 mask. Dark at the bars.
      float bar(float p, float pitch) {
        float f = fract(p / pitch);
        return smoothstep(0.0, 0.17, min(f, 1.0 - f));
      }

      // How much light is in the air at this point of the volume.
      float density(vec3 p) {
        float t = p.x + 0.5;              // 0 at the glass, 1 at the far end
        vec2 c = vec2(p.y, p.z) * 2.0;    // -1..1 across the beam

        // Feathered all the way out — no rim anywhere.
        float radial = 1.0 - smoothstep(0.05, 1.0, length(c));

        // The glazing bars, which split one wedge into separate shafts.
        float bars = mix(0.34, 1.0, bar(c.x, 0.62) * bar(c.y, 0.46));

        // Eased in at the glass, then held at full strength until the beam
        // is well clear of the wall. The wall is 0.68 thick and the shaft
        // starts at the glass *inside* it, so a falloff that begins at t=0
        // spends its whole bright section buried in masonry and emerges into
        // the room already dying — which is exactly how the first attempt
        // ended up as a glow stuck to the window.
        float along = smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.14, 0.78, t));

        return radial * bars * along;
      }

      void main() {
        // March the view ray through the volume in object space. Shading the
        // box's *surface* cannot work: every face lies exactly where one of the
        // falloff terms is zero, so a shell renders as nothing.
        vec3 origin = (uInvModel * vec4(cameraPosition, 1.0)).xyz;
        vec3 dir = normalize(vObj - origin);

        // Slab intersection against the unit box.
        vec3 invDir = 1.0 / dir;
        vec3 a = (vec3(-0.5) - origin) * invDir;
        vec3 b = (vec3(0.5) - origin) * invDir;
        vec3 near = min(a, b);
        vec3 far = max(a, b);
        float tIn = max(max(near.x, near.y), near.z);
        float tOut = min(min(far.x, far.y), far.z);
        tIn = max(tIn, 0.0);
        if (tOut <= tIn) discard;

        float step = (tOut - tIn) / float(STEPS);
        float sum = 0.0;
        for (int i = 0; i < STEPS; i++) {
          sum += density(origin + dir * (tIn + step * (float(i) + 0.5)));
        }

        // A very slow breath, below the threshold of "something is animating".
        float breath = 0.92 + 0.08 * sin(uTime * 0.28);
        float alpha = clamp(sum * step * uDensity * breath, 0.0, 1.0);
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    // Front faces only, depth-tested: anything between the camera and the
    // volume correctly hides the beam, and the floor cuts it off where it
    // lands. The camera never gets inside the box, so FrontSide is safe.
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
  });

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const group = new THREE.Group();
  group.name = "shafts";
  const materials: THREE.ShaderMaterial[] = [];

  for (const light of windowLights(windows)) {
    // **One material per shaft, because `uInvModel` is per-shaft.** The shader
    // marches the view ray in object space, so each beam needs its own inverse
    // matrix; sharing one material would point every beam at the last window
    // built.
    const own = material.clone();
    const shaft = new THREE.Mesh(geometry, own);
    // Cross-section is roughly the aperture: light spreads, but only a little.
    // The box's local +x is the direction of travel — the shader's `density()`
    // reads `p.x` as distance along the beam — so it is *rotated* onto the sun
    // rather than being axis-aligned with the window.
    shaft.scale.set(length, GLASS.halfHeight * 1.5, GLASS.halfWidth * 1.3);
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), light.sun);
    shaft.position.copy(light.at).addScaledVector(light.sun, length / 2);
    shaft.renderOrder = 10;
    shaft.updateMatrixWorld(true);
    // A shaft never moves, so the inverse is computed once rather than per frame.
    own.uniforms.uInvModel.value.copy(shaft.matrixWorld).invert();
    group.add(shaft);
    materials.push(own);
  }
  scene.add(group);
  material.dispose();

  return {
    update: (elapsedSeconds: number) => {
      for (const m of materials) m.uniforms.uTime.value = elapsedSeconds;
    },
    dispose: () => {
      scene.remove(group);
      geometry.dispose();
      for (const m of materials) m.dispose();
    },
  };
}

/** Where the shaft meets the floor — the pool goes here, so the two agree. */
function shaftFloorLanding(at: THREE.Vector3, sun: THREE.Vector3): THREE.Vector3 {
  return at.clone().addScaledVector(sun, at.y / -sun.y);
}

/**
 * Daylight at the window (§10).
 *
 * 1. A plain bright panel sitting *outside* the glass, so looking through the
 *    window you see blown-out daylight rather than the olive backdrop. This is
 *    what makes the window read as a light source at all.
 * 2. A soft pool where the shafts land, so the beams connect to the floor
 *    rather than fading into nothing above it.
 *
 * The shafts themselves are `addLightShafts`.
 */
function addWindowDaylight(scene: THREE.Scene, windows: string[]): () => void {
  const group = new THREE.Group();
  group.name = "daylight";

  // Bright sky just beyond the window wall.
  //
  // This has to be **smaller than the wall it hides behind**, or it stops being
  // sky and becomes a large white rectangle floating beside the café — which is
  // exactly what a 9×7 panel did here. The window wall occupies z[−2.29,−1.61],
  // x[−2.21,2.05]; its glass pane is x[−1.12,1.12], y[0.67,2.51]. So the panel
  // is sized to the *aperture* plus enough margin that the view through the
  // glass stays filled at this camera's oblique angle, and it sits a hair
  // outside the wall so the wall itself occludes every edge.
  const lights = windowLights(windows);
  const skyGeometry = new THREE.PlaneGeometry(3.0, 2.6);
  const skyMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xfffaf0).multiplyScalar(12.0),
  });
  for (const light of lights) {
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    sky.position.copy(light.at);
    // A hair further out again, so the wall occludes every edge of it.
    sky.position.addScaledVector(light.sun, -0.15);
    // Square-on to the wall it hides behind: the −x wall's panel faces +x.
    sky.rotation.y = Math.abs(light.sun.x) > Math.abs(light.sun.z) ? Math.PI / 2 : 0;
    group.add(sky);
  }

  const glow = softGlowTexture();
  const bloom = (
    size: number,
    opacity: number,
    x: number,
    y: number,
    z: number,
    rotX = 0,
    rotY = 0,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({
        map: glow,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    mesh.position.set(x, y, z);
    mesh.rotation.set(rotX, rotY, 0);
    mesh.renderOrder = 10;
    group.add(mesh);
  };

  // The pool where the shafts actually land, so beam and floor agree rather
  // than the light stopping in mid-air. Solved from the sun direction, not
  // placed by eye — retune SUN and this follows.
  for (const light of lights) {
    const landing = shaftFloorLanding(light.at, light.sun);
    bloom(3.0, 0.07, landing.x, 0.02, landing.z, -Math.PI / 2);
  }

  // NO haze quad in front of the glass. A 3.2-unit additive plane standing
  // inside the room read as a **faint pale square stuck on the wall** once the
  // post chain went in — bloom lifted its edges out of the noise floor and the
  // radial falloff was no longer enough to hide that it is, in fact, a square.
  // The volumetric shafts already do this job properly. Don't add it back.

  scene.add(group);
  return () => {
    scene.remove(group);
    skyGeometry.dispose();
    skyMaterial.dispose();
  };
}

export async function createScene(
  canvas: HTMLCanvasElement,
  customisation: Customisation,
  placements: Placements = {},
  purchased: string[] = [],
  tiles: TileKey[] = [],
  backdropId: string = DEFAULT_BACKDROP,
  instances: Instance[] = [],
  windows: string[] = [HOME_WINDOW],
): Promise<SceneContext> {
  const scene = new THREE.Scene();
  // A muted warm backdrop, like the pack's own promo renders. A pale one makes
  // the cream walls disappear into it and the whole thing read as washed out.
  // Only ever seen if the ground plane somehow doesn't fill the frame; kept
  // matched to the ground's dim end so a seam would be invisible anyway.
  // Replaced immediately by `paintBackdrop`; here so the very first frame
  // never flashes three.js's default black.
  scene.background = new THREE.Color(backdrop(backdropId).dim);

  // Position and distance are solved per aspect ratio in resize() below, so the
  // café is fully framed on a portrait phone as well as a desktop window (§6).
  const camera = new THREE.PerspectiveCamera(
    CAMERA_FOV,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  );

  // `antialias` is deliberately OFF, and it is not an oversight: everything
  // renders through the composer, which bypasses the renderer's MSAA entirely
  // (§9) — SMAA is what actually antialiases this scene. Asking for it anyway
  // allocated a multisampled backbuffer that was resolved and thrown away
  // every frame, which on a phone is pure heat for no pixels.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  // Pixel ratio is set by `resize()` below — see BASE_PIXEL_RATIO for why it
  // is no longer the aggressive 1.5 this line used to argue for.
  // Before anything loads: the atlas needs the GPU's anisotropy limit, and it
  // is the difference between crisp floorboards and mush at the default
  // framing. See `configureAssetQuality`.
  configureAssetQuality(renderer.capabilities.getMaxAnisotropy());
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // **Neutral, not ACES — this is most of "soft" (§9).** ACES is a cinematic
  // curve: it has a long toe that crushes shadows and it pushes saturated
  // colours toward the extremes. On a flat-colour atlas that reads as
  // *dramatic* — measured against the reference render, our darkest browns sat
  // at L 0.18 against its 0.26, and our reds at S 0.78 against its 0.58.
  // Khronos PBR Neutral exists for exactly this case: it leaves in-range colour
  // alone and only rolls off what genuinely blows out. Three lighting passes
  // chased this through light intensities and never touched the curve.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.40;

  // Bounce light first: the ambient below is sized to sit *under* it, not to
  // do the illuminating on its own.
  scene.environment = buildEnvironment(renderer);
  scene.environmentIntensity = 1.35;

  addLighting(scene);
  const paintBackdrop = addGround(scene);
  paintBackdrop(backdropId);
  let clearDaylight = addWindowDaylight(scene, windows);
  let shafts = addLightShafts(scene, windows);

  /**
   * Re-light the room when a window is bought or bricked up.
   *
   * Cheap enough to do wholesale: it is a handful of planes and one box per
   * window, and it happens on a purchase rather than per frame.
   */
  function setWindows(next: string[]): void {
    clearDaylight();
    shafts.dispose();
    clearDaylight = addWindowDaylight(scene, next);
    shafts = addLightShafts(scene, next);
  }

  /**
   * Post-processing — the "smoother, softer, gentler" layer (§9).
   *
   * Lighting alone could never get us to the reference renders, because what
   * separates a Blender render from a raw WebGL frame isn't the lights: it's
   * **contact shadow and edge quality**. Three passes, each doing one job:
   *
   * 1. **GTAO** — ambient occlusion. This is the big one. Warm fill light with
   *    no occlusion makes every join look like a sticker: the chair meets the
   *    floor with nothing to say they touch. AO darkens creases and contact
   *    points, and it is most of why the reference art looks *soft* rather than
   *    flat. Deliberately gentle — heavy AO reads as grime, not softness.
   * 2. **Bloom** — a small warm halo where the window blows out, so the glass
   *    bleeds into the room the way real over-bright daylight does. Threshold
   *    is high so only the window and the shafts qualify; nothing else glows.
   * 3. **MSAA on the composer's own buffer** — not a pass at all. This used to
   *    be an `SMAAPass`, on the correct observation that the renderer's MSAA is
   *    bypassed under a composer; the fix, though, is to give the *composer* a
   *    multisampled target rather than to add a full-screen post filter.
   *
   *    It is both **sharper and cheaper**, which is why it settles Ellis's
   *    "sharper edges *and* less heat" (2026-08-13). SMAA reconstructs edges by
   *    finding and blending them after the fact — it is a blur that guesses,
   *    and on a diorama of long clean diagonals its guesses are what softened
   *    the silhouettes. MSAA supersamples only the pixels the geometry actually
   *    crosses, so edges resolve exactly, and it replaces a whole extra
   *    full-screen pass with a hardware resolve.
   *
   * `OutputPass` carries the tone mapping and colour conversion that the
   * renderer would otherwise do itself — move it and the whole image shifts.
   */
  /**
   * **One target, one pass, and nothing else.**
   *
   * This was an `EffectComposer` with GTAO, and it is why the app could not
   * render at native resolution: a composer keeps a **pair** of targets for
   * ping-pong, and GTAO allocates several full-resolution buffers of its own.
   * At ratio 3 that came to a quarter of a gigabyte and iOS killed the app on
   * launch (`data/graphics.ts` has the arithmetic).
   *
   * Written by hand it is a single multisampled half-float target and one
   * fullscreen pass, which at native ratio costs about 72 MB — *less than the
   * build that was already running fine at ratio 2*. So the café finally
   * renders at the screen's own resolution, which is the only thing that was
   * ever going to make it stop looking fuzzy: every cap below the device ratio
   * means the browser upscales the canvas, and nothing undoes a resize.
   *
   * What the one pass does, in order, is exactly what the composer's tail did:
   * exposure + ACES, sRGB encode, then the room's colour grade (§9 — the grade
   * is doing real work and its pairing with exposure 0.40 is load-bearing).
   *
   * **What was given up: GTAO.** It added contact shadow where objects meet,
   * and §9 rightly says that is a lot of what made the room read as soft. But
   * it was the single most expensive thing in the frame, and softness that
   * costs you native resolution is a bad trade when the complaint on record,
   * five times over, is blur. The key light still casts real shadows.
   */
  const post = createPostChain(renderer, scene, camera);

  // §17 wants debug affordances for anything spatial, and "is it the bloom or
  // the AO?" has now been argued three times without anyone being able to
  // check. Dev builds only; statically dropped from the app bundle.
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__fx = {
      renderer,
      post,
    };
  }

  setFloorExtent(floorBounds(tiles));
  let cafe = await buildCafeRoom(customisation, placements, purchased, tiles, instances, windows);
  scene.add(cafe.group);

  /**
   * Rebuild the room. Takes both axes because they share one group: a
   * colourway change and a furniture move both replace the whole thing, and
   * splitting them into two rebuild paths meant whichever ran second used a
   * stale copy of the other's state.
   */
  async function rebuildRoom(
    choice: Customisation,
    next: Placements,
    owned: string[],
    tiles: TileKey[],
    instances: Instance[],
    windows: string[],
  ): Promise<void> {
    // Framing follows the floor, so the camera re-solves for the new extent
    // before the room appears rather than a frame later (§9).
    setFloorExtent(floorBounds(tiles));
    resize();
    setWindows(windows);
    const built = await buildCafeRoom(choice, next, owned, tiles, instances, windows);
    scene.remove(cafe.group);
    cafe = built;
    scene.add(cafe.group);
  }

  /** Set once the caller attaches camera controls, so a resize can re-solve
   *  the zoom-out limit for the new aspect (§9 — it is aspect-dependent). */
  let controls: { onResize(aspect: number): void } | null = null;

  /**
   * Pixel ratio while a preview panel is up (§9 "The previews").
   *
   * **The previews are drawn into this canvas, so they can never be sharper
   * than it is.** MSAA and supersampling inside `preview-stage` fix the
   * *edges* of a preview, but every one of its pixels is still a canvas pixel,
   * and the canvas runs at 1.5 on a phone whose screen is 3 — so a hard-edged
   * object on a dark backdrop reads as stepped no matter how well it was
   * antialiased. Ellis, twice: *"pixelly on the edges."*
   *
   * So the canvas itself goes up while a preview is on screen. **Paid for by
   * dropping GTAO for the duration**, which is the frame's most expensive pass
   * (§9) and is doing nothing visible behind a panel that dims and covers the
   * café. Roughly cost-neutral, and the panel is the one place the player is
   * looking closely at a single object.
   */
  /**
   * **1.5 was too soft, and that was the whole café, not just the previews.**
   *
   * Ellis, 2026-08-12: *"everything looks too blurry (except the item previews
   * now you fixed it which actually looks very good)"* — which is the clearest
   * possible A/B, since the previews are the same scene rendered at full
   * device ratio. The 1.5 cap was a *speculative* thermal fix (2026-08-06,
   * never measured on a device); the blur it bought is measured, on his phone,
   * twice.
   *
   * ## Resolution is budgeted by *pixels*, not capped by ratio
   *
   * The honest reason the café looked fuzzy is that any ratio below the
   * device's means the browser upscales the canvas — on a DPR-3 phone a cap of
   * 2 is a 1.5× stretch of every pixel, and no amount of antialiasing undoes a
   * resize. So the obvious fix was to render at native ratio.
   *
   * **That killed the app.** Ellis, 2026-08-17: black screen, `SIGKILL`. At
   * ratio 3 the composer's *pair* of multisampled half-float targets is about
   * 241 MB before GTAO's own buffers — an instant jetsam kill inside a
   * WKWebView. The arithmetic is in `graphicsBudget`, and it is the thing to
   * check before ever raising this again:
   *
   *     bytes ≈ pixels × 8 × (samples + 1) × 2 targets
   *
   * So the knob is a **pixel budget**, and the ratio is solved from it. A
   * budget bounds memory on every screen size; a ratio cap only bounds it on
   * the screen you happened to test.
   *
   * The solving now lives in `data/graphics.ts`, because a budget on its own
   * turned out to leave the setting inert on any screen whose native
   * resolution already fits inside it — read the note there before touching
   * either number.
   */
  let qualityLevel: GraphicsLevel = DEFAULT_LEVEL;
  let sharp = false;
  const currentRatio = (): number => {
    const cssPixels = window.innerWidth * window.innerHeight;
    const ratio = pixelRatioFor(qualityLevel, window.devicePixelRatio, cssPixels);
    // A preview panel gets a little extra, because it is a small region the
    // player is looking at closely — still bounded by the device's own ratio.
    return sharp ? Math.min(window.devicePixelRatio, ratio * 1.3) : ratio;
  };

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;
    fitCameraToCafe(camera, aspect);
    controls?.onResize(aspect);
    renderer.setPixelRatio(currentRatio());
    renderer.setSize(width, height);
    post.setSize(width, height, renderer.getPixelRatio());
  }
  resize();
  window.addEventListener("resize", resize);

  /** Drawn on top of the finished frame — the shop's spinning item (§8). */
  let overlay: ((renderer: THREE.WebGLRenderer, now: number) => void) | null = null;

  function render() {
    shafts.update(performance.now() / 1000);
    post.render();
    overlay?.(renderer, performance.now());
  }

  return {
    scene,
    camera,
    renderer,
    render,
    rebuildRoom,
    // A getter, not the group itself: `setCustomisation` rebuilds the room and
    // swaps in a whole new group, so anything holding a reference from boot
    // would be raycasting against furniture that is no longer in the scene.
    getRoomGroup: () => cafe.group,
    attachControls(next: { onResize(aspect: number): void }) {
      controls = next;
    },
    setOverlay(fn) {
      overlay = fn;
    },
    setPreviewSharpness(on) {
      // Kept as a no-op hook: everything renders at the chosen budget now, so
      // a preview panel is already as sharp as the café behind it. Removing
      // the call sites would be churn for nothing if a future effect wants it.
      sharp = on;
    },
    setBackdrop(id) {
      paintBackdrop(id);
    },
    setQuality(level) {
      if (level === qualityLevel) return;
      qualityLevel = level;
      resize();
    },
    environment: scene.environment,
  };
}
