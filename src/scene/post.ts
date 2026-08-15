import * as THREE from "three";
import { GRADE_GLSL, GRADE_VALUES } from "@/scene/scene";

/**
 * The whole post chain: one multisampled target, one fullscreen pass.
 *
 * **This replaced `EffectComposer` + GTAO because they could not fit in
 * memory at native resolution**, and native resolution is the only thing that
 * was ever going to fix "it looks fuzzy" — every pixel ratio below the
 * device's means the browser upscales the canvas, and no antialiasing undoes
 * a resize. A composer keeps a *pair* of targets so it can ping-pong between
 * passes; with one pass there is nothing to ping-pong, so the pair was pure
 * cost. See `data/graphics.ts` for the arithmetic and the SIGKILL it caused.
 *
 * The pass does exactly what the composer's tail did, in the same order —
 * exposure + ACES, sRGB encode, then the room's grade. Reordering it shifts
 * the whole image (§9: the grade's pairing with exposure 0.40 is a pair, not
 * two independent settings).
 *
 * **Tone mapping is done here rather than by the renderer** because three
 * disables it when drawing into a render target — that is how a composer gets
 * to apply it once at the end, and the same reasoning applies to us.
 */
export interface PostChain {
  render(): void;
  setSize(width: number, height: number, pixelRatio: number): void;
  dispose(): void;
}

export function createPostChain(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
): PostChain {
  /**
   * Two samples, not four. Each sample is another full-resolution half-float
   * copy of the target; two already resolves a diagonal exactly, and four is
   * what tipped the app over on a phone.
   */
  const target = new THREE.WebGLRenderTarget(1, 1, {
    samples: 2,
    type: THREE.HalfFloatType,
  });

  const quadScene = new THREE.Scene();
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: target.texture },
      // Declared by three's tone-mapping chunk, which it prepends to every
      // ShaderMaterial — so it must NOT be declared again in the source below.
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
      ${GRADE_GLSL}

      void main() {
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        c = ACESFilmicToneMapping(c);
        c = sRGBTransferOETF(vec4(c, 1.0)).rgb;
        gl_FragColor = vec4(applyGrade(c), 1.0);
      }
    `,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  quadScene.add(quad);

  return {
    setSize(width, height, pixelRatio) {
      target.setSize(Math.round(width * pixelRatio), Math.round(height * pixelRatio));
    },

    render() {
      material.uniforms.toneMappingExposure.value = renderer.toneMappingExposure;
      renderer.setRenderTarget(target);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(quadScene, quadCamera);
    },

    dispose() {
      target.dispose();
      quad.geometry.dispose();
      material.dispose();
    },
  };
}
