import type { InversionCoefficients } from '@dorkroom/logic';
import { invertPixelsDithered } from './cpu-inversion';
import {
  DITHER_AMOUNT,
  FRAGMENT_SHADER,
  inversionUniforms,
  VERTEX_SHADER,
} from './inversion-shader';

export type RendererBackend = 'webgl2' | 'webgl' | 'cpu';

/**
 * Runs the inversion pixel pass over a source image into its own canvas: on
 * the GPU when WebGL is available, otherwise on the CPU with the same math.
 * The canvas always matches the size of the last source.
 */
export interface InversionRenderer {
  readonly backend: RendererBackend;
  readonly canvas: HTMLCanvasElement;
  /** Largest source side one pass can take. */
  readonly maxSourceSide: number;
  /** True while the GPU context is lost; nothing can be drawn until it is
   *  restored. Always false on the CPU backend. */
  readonly isLost: boolean;
  setSource(pixels: ImageData): void;
  /** Draws the positive. Returns false when it could not (context lost), in
   *  which case the canvas holds no usable pixels. */
  render(coeffs: InversionCoefficients): boolean;
  /** Frees the GPU context and the canvas memory. The renderer is unusable after. */
  dispose(): void;
}

export interface RendererOptions {
  /** Keep the WebGL drawing buffer after compositing, so other canvases can
   *  copy from it later (the loupe, export tiles). */
  preserveDrawingBuffer?: boolean;
  /** Skip WebGL and use the CPU path. */
  forceCpu?: boolean;
  /** Called when the GPU context is lost (iOS drops them under memory
   *  pressure). The renderer may or may not be restored later. */
  onContextLost?: () => void;
}

type GlContext = WebGLRenderingContext | WebGL2RenderingContext;

interface GlResources {
  program: WebGLProgram;
  buffer: WebGLBuffer;
  texture: WebGLTexture;
  uniforms: Record<UniformName, WebGLUniformLocation | null>;
}

const UNIFORM_NAMES = [
  'u_image',
  'u_base',
  'u_densityLow',
  'u_densityHigh',
  'u_offset',
  'u_grade',
  'u_pivot',
  'u_saturation',
  'u_bw',
  'u_ditherAmount',
  'u_height',
] as const;

type UniformName = (typeof UNIFORM_NAMES)[number];

/** The coefficient uniforms, by GLSL type. */
const VEC3_UNIFORMS = [
  'u_base',
  'u_densityLow',
  'u_densityHigh',
  'u_offset',
] as const;
const FLOAT_UNIFORMS = ['u_grade', 'u_pivot', 'u_saturation', 'u_bw'] as const;

/** CPU sources are bounded only by canvas limits; this keeps tiles sane. */
const CPU_MAX_SOURCE_SIDE = 4096;

function compile(gl: GlContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createResources(gl: GlContext): GlResources | null {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  const texture = gl.createTexture();
  if (!vertex || !fragment || !program || !buffer || !texture) return null;

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, 'a_position');
  gl.linkProgram(program);
  // The program keeps the compiled code; the shader objects can go.
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  gl.bindTexture(gl.TEXTURE_2D, texture);
  // One texel per canvas pixel, so no filtering; clamping keeps NPOT
  // textures legal on WebGL 1.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);

  const uniforms = Object.fromEntries(
    UNIFORM_NAMES.map((name) => [name, gl.getUniformLocation(program, name)])
  );
  return {
    program,
    buffer,
    texture,
    // SAFETY: built from UNIFORM_NAMES, so every key of the record is present.
    uniforms: uniforms as Record<UniformName, WebGLUniformLocation | null>,
  };
}

function maxGlSide(gl: GlContext): number {
  const texture = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 2048;
  const renderbuffer =
    Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)) || texture;
  const viewport: ArrayLike<number> | null = gl.getParameter(
    gl.MAX_VIEWPORT_DIMS
  );
  const viewportSide = viewport
    ? Math.min(viewport[0], viewport[1])
    : renderbuffer;
  return Math.min(texture, renderbuffer, viewportSide);
}

function getGlContext(
  canvas: HTMLCanvasElement,
  preserveDrawingBuffer: boolean
): { gl: GlContext; backend: 'webgl2' | 'webgl' } | null {
  const attributes: WebGLContextAttributes = {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer,
  };
  try {
    const gl2 = canvas.getContext('webgl2', attributes);
    if (gl2) return { gl: gl2, backend: 'webgl2' };
    const gl1 = canvas.getContext('webgl', attributes);
    if (gl1) return { gl: gl1, backend: 'webgl' };
  } catch {
    // Some browsers throw instead of returning null when WebGL is blocked.
  }
  return null;
}

function createGlRenderer(
  preserveDrawingBuffer: boolean,
  onContextLost: (() => void) | undefined
): InversionRenderer | null {
  const canvas = document.createElement('canvas');
  const context = getGlContext(canvas, preserveDrawingBuffer);
  if (!context) {
    // A fresh canvas defaults to 300 x 150; free that too.
    canvas.width = 0;
    canvas.height = 0;
    return null;
  }
  const { gl, backend } = context;
  let resources = createResources(gl);
  if (!resources) {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    canvas.width = 0;
    canvas.height = 0;
    return null;
  }

  const maxSourceSide = maxGlSide(gl);
  let lastSource: ImageData | null = null;
  let lastCoeffs: InversionCoefficients | null = null;
  let lost = false;

  const upload = (pixels: ImageData) => {
    if (!resources) return;
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    gl.bindTexture(gl.TEXTURE_2D, resources.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  };

  const draw = (coeffs: InversionCoefficients): boolean => {
    if (!resources || lost || gl.isContextLost()) return false;
    const u = inversionUniforms(coeffs);
    const loc = resources.uniforms;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(resources.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, resources.texture);
    gl.uniform1i(loc.u_image, 0);
    for (const name of VEC3_UNIFORMS) {
      const value = u[name];
      gl.uniform3f(loc[name], value[0], value[1], value[2]);
    }
    for (const name of FLOAT_UNIFORMS) gl.uniform1f(loc[name], u[name]);
    gl.uniform1f(loc.u_ditherAmount, DITHER_AMOUNT);
    gl.uniform1f(loc.u_height, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return true;
  };

  const onLost = (event: Event) => {
    // Without preventDefault the browser never offers to restore it.
    event.preventDefault();
    lost = true;
    onContextLost?.();
  };
  const onRestored = () => {
    lost = false;
    resources = createResources(gl);
    if (lastSource) upload(lastSource);
    if (lastCoeffs) draw(lastCoeffs);
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  return {
    backend,
    canvas,
    maxSourceSide,
    get isLost() {
      return lost || gl.isContextLost();
    },
    setSource(pixels) {
      if (pixels.width > maxSourceSide || pixels.height > maxSourceSide) {
        throw new RangeError(
          `Source ${pixels.width}x${pixels.height} exceeds the GPU limit of ${maxSourceSide}px`
        );
      }
      lastSource = pixels;
      upload(pixels);
    },
    render(coeffs) {
      lastCoeffs = coeffs;
      return draw(coeffs);
    },
    dispose() {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      if (resources && !lost) {
        gl.deleteTexture(resources.texture);
        gl.deleteBuffer(resources.buffer);
        gl.deleteProgram(resources.program);
      }
      resources = null;
      lastSource = null;
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.width = 0;
      canvas.height = 0;
    },
  };
}

function createCpuRenderer(): InversionRenderer | null {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  let source: ImageData | null = null;
  let output: ImageData | null = null;

  return {
    backend: 'cpu',
    canvas,
    maxSourceSide: CPU_MAX_SOURCE_SIDE,
    isLost: false,
    setSource(pixels) {
      source = pixels;
      canvas.width = pixels.width;
      canvas.height = pixels.height;
      output = ctx.createImageData(pixels.width, pixels.height);
    },
    render(coeffs) {
      if (!source || !output) return false;
      invertPixelsDithered(source, coeffs, output.data);
      ctx.putImageData(output, 0, 0);
      return true;
    },
    dispose() {
      source = null;
      output = null;
      canvas.width = 0;
      canvas.height = 0;
    },
  };
}

/**
 * A renderer on the best backend available: WebGL 2, then WebGL 1, then the
 * CPU. Returns null only when the browser has no usable canvas at all.
 */
export function createInversionRenderer(
  options: RendererOptions = {}
): InversionRenderer | null {
  if (!options.forceCpu) {
    const gl = createGlRenderer(
      options.preserveDrawingBuffer ?? false,
      options.onContextLost
    );
    if (gl) return gl;
  }
  return createCpuRenderer();
}
