import { linearToSrgb, type Rgb } from '@dorkroom/logic';
import { vi } from 'vitest';

/**
 * A software stand-in for the browser's 2D canvas and `createImageBitmap`,
 * which happy-dom does not implement. It stores real RGBA pixels, so the
 * page's decode, proxy, CPU pixel pass and export tiling all run for real on
 * top of it. WebGL is reported as unavailable, which is the CPU fallback path.
 */

/** A decoded photo: its size and a function giving the colour at a pixel. */
export interface FakeBitmap {
  width: number;
  height: number;
  close: () => void;
  paint: (x: number, y: number) => Rgb;
}

interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

class FakeContext2D {
  readonly canvas: HTMLCanvasElement;
  imageSmoothingEnabled = true;
  imageSmoothingQuality = 'low';
  fillStyle = '#000';
  strokeStyle = '#000';
  lineWidth = 1;
  #buffer: PixelBuffer = {
    data: new Uint8ClampedArray(0),
    width: 0,
    height: 0,
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  /** The canvas's pixels, reallocated (cleared) when its size changed. */
  pixels(): PixelBuffer {
    const { width, height } = this.canvas;
    if (this.#buffer.width !== width || this.#buffer.height !== height) {
      this.#buffer = {
        data: new Uint8ClampedArray(width * height * 4),
        width,
        height,
      };
    }
    return this.#buffer;
  }

  createImageData(width: number, height: number): PixelBuffer {
    return { data: new Uint8ClampedArray(width * height * 4), width, height };
  }

  getImageData(x: number, y: number, width: number, height: number) {
    const src = this.pixels();
    const out = this.createImageData(width, height);
    for (let row = 0; row < height; row++) {
      const from = ((y + row) * src.width + x) * 4;
      out.data.set(src.data.subarray(from, from + width * 4), row * width * 4);
    }
    return out;
  }

  putImageData(image: PixelBuffer, dx: number, dy: number) {
    const dst = this.pixels();
    for (let row = 0; row < image.height; row++) {
      const from = row * image.width * 4;
      dst.data.set(
        image.data.subarray(from, from + image.width * 4),
        ((dy + row) * dst.width + dx) * 4
      );
    }
  }

  /** Nearest-neighbour `drawImage` with the 3, 5 and 9 argument forms. */
  drawImage(source: FakeBitmap | HTMLCanvasElement, ...args: number[]) {
    const sw0 = source.width;
    const sh0 = source.height;
    let [sx, sy, sw, sh, dx, dy, dw, dh] = [0, 0, sw0, sh0, 0, 0, sw0, sh0];
    if (args.length === 2) [dx, dy] = args;
    else if (args.length === 4) [dx, dy, dw, dh] = args;
    else [sx, sy, sw, sh, dx, dy, dw, dh] = args;

    const read = sourceReader(source);
    const dst = this.pixels();
    for (let row = 0; row < Math.round(dh); row++) {
      for (let col = 0; col < Math.round(dw); col++) {
        const tx = Math.round(dx) + col;
        const ty = Math.round(dy) + row;
        if (tx < 0 || ty < 0 || tx >= dst.width || ty >= dst.height) continue;
        const px = Math.min(sw0 - 1, Math.floor(sx + ((col + 0.5) * sw) / dw));
        const py = Math.min(sh0 - 1, Math.floor(sy + ((row + 0.5) * sh) / dh));
        const [r, g, b] = read(px, py);
        const i = (ty * dst.width + tx) * 4;
        dst.data[i] = r;
        dst.data[i + 1] = g;
        dst.data[i + 2] = b;
        dst.data[i + 3] = 255;
      }
    }
  }

  fillRect() {
    // The loupe's backdrop; not needed for any assertion.
  }

  strokeRect() {
    // The loupe's patch outline; not needed for any assertion.
  }
}

const contexts = new WeakMap<HTMLCanvasElement, FakeContext2D>();

function sourceReader(source: FakeBitmap | HTMLCanvasElement) {
  if (source instanceof HTMLCanvasElement) {
    const buffer = contexts.get(source)?.pixels();
    return (x: number, y: number): Rgb => {
      if (!buffer) return [0, 0, 0];
      const i = (y * buffer.width + x) * 4;
      return [buffer.data[i], buffer.data[i + 1], buffer.data[i + 2]];
    };
  }
  return source.paint;
}

/** The fake 2D context's pixels for a canvas, if it has one. */
export function canvasPixels(canvas: HTMLCanvasElement): PixelBuffer | null {
  return contexts.get(canvas)?.pixels() ?? null;
}

export interface FakeCanvasEnvironment {
  toBlob: ReturnType<typeof vi.fn>;
  createImageBitmap: ReturnType<typeof vi.fn>;
  bitmaps: FakeBitmap[];
  restore: () => void;
}

/**
 * Install the fakes. `decode` builds the bitmap for a file (or throws to
 * simulate a decode failure); it receives the resize options, if any.
 */
export function installFakeCanvas(
  decode: (file: File, resize?: { width: number; height: number }) => FakeBitmap
): FakeCanvasEnvironment {
  const proto = HTMLCanvasElement.prototype;
  const original = {
    getContext: Object.getOwnPropertyDescriptor(proto, 'getContext'),
    toBlob: Object.getOwnPropertyDescriptor(proto, 'toBlob'),
  };
  const bitmaps: FakeBitmap[] = [];

  Object.defineProperty(proto, 'getContext', {
    configurable: true,
    value(this: HTMLCanvasElement, type: string) {
      if (type !== '2d') return null;
      let ctx = contexts.get(this);
      if (!ctx) {
        ctx = new FakeContext2D(this);
        contexts.set(this, ctx);
      }
      return ctx;
    },
  });

  const toBlob = vi.fn(
    (callback: (blob: Blob | null) => void, type?: string) => {
      callback(new Blob(['encoded'], { type: type ?? 'image/png' }));
    }
  );
  Object.defineProperty(proto, 'toBlob', { configurable: true, value: toBlob });

  const createImageBitmap = vi.fn(
    async (
      file: File,
      options?: { resizeWidth?: number; resizeHeight?: number }
    ) => {
      const resize =
        options?.resizeWidth && options.resizeHeight
          ? { width: options.resizeWidth, height: options.resizeHeight }
          : undefined;
      const bitmap = decode(file, resize);
      bitmaps.push(bitmap);
      return bitmap;
    }
  );
  vi.stubGlobal('createImageBitmap', createImageBitmap);

  return {
    toBlob,
    createImageBitmap,
    bitmaps,
    restore() {
      for (const [key, descriptor] of Object.entries(original)) {
        if (descriptor) Object.defineProperty(proto, key, descriptor);
        else Reflect.deleteProperty(proto, key);
      }
      vi.unstubAllGlobals();
    },
  };
}

/** Clear film base with an orange mask, in linear light. */
export const ORANGE_BASE: Rgb = [0.72, 0.4, 0.18];

/**
 * A synthetic C-41-like negative: the left tenth is clear film base, and the
 * rest is a left-to-right density ramp (thin shadows to dense highlights).
 */
export function syntheticNegative(width: number, height: number): FakeBitmap {
  const rebate = Math.max(1, Math.round(width / 10));
  const toByte = (v: number) => Math.round(linearToSrgb(v) * 255);
  return {
    width,
    height,
    close: vi.fn(),
    paint(x) {
      const density =
        x < rebate ? 0 : 0.15 + (1.4 * (x - rebate)) / (width - rebate);
      const t = 10 ** -density;
      return [
        toByte(ORANGE_BASE[0] * t),
        toByte(ORANGE_BASE[1] * t),
        toByte(ORANGE_BASE[2] * t),
      ];
    },
  };
}
