import * as THREE from "three";
import { GRADE_GLSL, GRADE_VALUES } from "@/scene/scene";

/**
 * The shared drawing surface behind the shop's spinning furniture and the
 * character creator's avatar (`scene/shop-preview.ts`, `scene/character-preview.ts`).
 *
 * **Why this exists: the previews had no antialiasing at all.** Ellis, on the
 * shop and the character creator: *"all the sprites look pretty rough around
 * the edges. not smooth at all."* Both were rendering straight into the
 * default framebuffer on top of the finished frame, and that framebuffer has
 * no MSAA — `antialias: false` is deliberate (§9: the composer bypasses it, so
 * asking for it is pure heat). The café itself is smoothed by the composer's
 * SMAA pass, which the previews never went through. So the whole café was
 * antialiased and the two things the player looks at up close were not.
 *
 * The fix is to give the previews their own antialiased surface: render into a
 * small multisampled render target, then composite that one texture into the
 * panel's rect. It is cheap because the target is only the size of the stage,
 * not the screen, and it exists only while a panel is open.
 *
 * Two details that are easy to get wrong:
 *
 * - **The target holds premultiplied alpha.** Blending onto a transparent
 *   clear leaves `rgb` already multiplied by `a` (that is just what the
 *   standard blend equation produces), so compositing it back with ordinary
 *   `NormalBlending` would multiply by alpha a second time and the translucent
 *   backdrop would come out too dark. Hence the custom `One / OneMinusSrcAlpha`
 *   blend below.
 * - **The target's texture must be tagged sRGB.** Three applies the output
 *   colour-space conversion based on where it is drawing; a render target
 *   defaults to no conversion, which would render the preview in linear values
 *   and wash it out against the café behind it.
 */

/** 4× MSAA. The stage is a few hundred pixels square, so this is affordable. */
const SAMPLES = 4;
/**
 * Render above the panel's pixel size and let the GPU downsample on the way
 * back. Pixel ratio is capped at 1.5 for the whole app (§9), which on a phone
 * leaves visible stepping on a slowly turning object even with MSAA — this is
 * what closes it. Confined to the stage rect, so it costs a fraction of what
 * raising the global ratio would.
 */
const SUPERSAMPLE = 1.5;
/** Don't allocate something silly on a desktop window at DPR 2. */
const MAX_EDGE = 2048;

export interface PreviewStage {
  /** Render `scene` through `camera` into the screen-space `rect` (CSS pixels). */
  draw(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    rect: DOMRect,
  ): void;
  dispose(): void;
}

export function createPreviewStage(): PreviewStage {
  let target: THREE.WebGLRenderTarget | null = null;

  // A single full-viewport triangle-pair carrying the resolved texture. Its
  // camera is the identity ortho box, so the quad's own coordinates are NDC.
  //
  // It also carries **the room's colour grade**, which is the other half of
  // making the shop's colourway picker trustworthy: the grade normally lives
  // in the composer, so a preview drawn outside it was showing a differently
  // graded version of the same asset. See `GRADE_GLSL` in `scene/scene.ts`.
  const quadScene = new THREE.Scene();
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null as THREE.Texture | null },
      // Declared by <tonemapping_pars_fragment>, supplied here — the renderer
      // only sets this one itself for its own material types.
      toneMappingExposure: { value: 1 },
      uLift: { value: GRADE_VALUES.lift },
      uGain: { value: GRADE_VALUES.gain },
      uSaturation: { value: GRADE_VALUES.saturation },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      varying vec2 vUv;
      // No #include for the tone-mapping or colour-space chunks: three appends
      // both to every ShaderMaterial's fragment prefix already, so including
      // them yourself is a wall of "function already has a body".
      ${GRADE_GLSL}

      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        if (texel.a <= 0.001) discard;
        // **Un-premultiply before the curve, re-premultiply after.** Tone
        // mapping and the grade are curves on *colour*, and a colour scaled by
        // its own alpha is not that colour — running them on the premultiplied
        // value tints the translucent backdrop differently from the opaque
        // item standing on it.
        vec3 c = texel.rgb / texel.a;
        // The three steps the composer's own tail does, in the same order:
        // exposure + ACES, sRGB encode, then the room's grade.
        c = ACESFilmicToneMapping(c);
        c = sRGBTransferOETF(vec4(c, 1.0)).rgb;
        c = applyGrade(c);
        gl_FragColor = vec4(c * texel.a, texel.a);
      }
    `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), quadMaterial);
  quad.frustumCulled = false;
  quadScene.add(quad);

  const clearColour = new THREE.Color();

  function resize(width: number, height: number): THREE.WebGLRenderTarget {
    if (target && target.width === width && target.height === height) return target;
    target?.dispose();
    // **Linear, and half-float.** Three skips tone mapping entirely when
    // rendering into a render target — that is how a composer gets to apply it
    // once at the end — so what lands here is raw linear light, some of it over
    // 1.0 where the window blows out. Eight bits would clip that flat and a
    // texture tagged sRGB would encode values that have not been tone-mapped
    // yet. The composite shader below does the mapping, exactly as the
    // composer's tail does for the room.
    target = new THREE.WebGLRenderTarget(width, height, {
      samples: SAMPLES,
      type: THREE.HalfFloatType,
      colorSpace: THREE.LinearSRGBColorSpace,
    });
    target.texture.minFilter = THREE.LinearFilter;
    target.texture.magFilter = THREE.LinearFilter;
    target.texture.generateMipmaps = false;
    quadMaterial.uniforms.tDiffuse.value = target.texture;
    return target;
  }

  return {
    draw(renderer, scene, camera, rect) {
      if (rect.width < 4 || rect.height < 4) return;

      const dpr = renderer.getPixelRatio();
      const scale = dpr * SUPERSAMPLE;
      const width = Math.min(MAX_EDGE, Math.max(4, Math.round(rect.width * scale)));
      const height = Math.min(MAX_EDGE, Math.max(4, Math.round(rect.height * scale)));
      const rt = resize(width, height);

      // --- Pass 1: the preview, antialiased, on a transparent background ----
      const previousTarget = renderer.getRenderTarget();
      const previousAutoClear = renderer.autoClear;
      const previousAlpha = renderer.getClearAlpha();
      renderer.getClearColor(clearColour);

      renderer.setRenderTarget(rt);
      renderer.setClearColor(0x000000, 0);
      renderer.clear(true, true, false);
      renderer.render(scene, camera);

      renderer.setRenderTarget(previousTarget);
      renderer.setClearColor(clearColour, previousAlpha);
      quadMaterial.uniforms.toneMappingExposure.value = renderer.toneMappingExposure;

      // --- Pass 2: composite it into the panel's hole ----------------------
      //
      // CSS pixels: `setViewport` applies the pixel ratio itself. Applying it
      // here as well puts the stage somewhere else on any screen where the
      // ratio isn't 1 — which is every phone.
      const cssWidth = renderer.domElement.width / dpr;
      const cssHeight = renderer.domElement.height / dpr;
      // WebGL's origin is bottom-left; the DOM's is top-left.
      const y = cssHeight - rect.bottom;

      renderer.autoClear = false;
      renderer.setScissorTest(true);
      renderer.setViewport(rect.left, y, rect.width, rect.height);
      renderer.setScissor(rect.left, y, rect.width, rect.height);
      renderer.render(quadScene, quadCamera);
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, cssWidth, cssHeight);
      renderer.autoClear = previousAutoClear;
    },

    dispose() {
      target?.dispose();
      target = null;
      quad.geometry.dispose();
      quadMaterial.dispose();
    },
  };
}
