import {
  buildDensityHistograms,
  deriveCoefficients,
  type InversionCoefficients,
  samplePatch,
} from '@dorkroom/logic';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  decodeImageFile,
  ImageDecodeFailure,
  isHeicFile,
  loadNegative,
} from '../decode-image';
import {
  CPU_EXPORT_TILE_SIDE,
  exportFileName,
  exportPositive,
  JPEG_QUALITY,
} from '../export-positive';
import {
  createInversionRenderer,
  type InversionRenderer,
  type RendererOptions,
} from '../inversion-renderer';
import {
  canvasPixels,
  type FakeCanvasEnvironment,
  installFakeCanvas,
  syntheticNegative,
} from './fake-canvas';

let env: FakeCanvasEnvironment | null = null;

afterEach(() => {
  env?.restore();
  env = null;
});

const photo = (name = 'roll-12-frame-04.jpg', type = 'image/jpeg') =>
  new File(['not really a jpeg'], name, { type });

describe('isHeicFile', () => {
  it('recognises HEIC and HEIF by type or name', () => {
    expect(isHeicFile({ name: 'a.jpg', type: 'image/heic' })).toBe(true);
    expect(isHeicFile({ name: 'IMG_0001.HEIC', type: '' })).toBe(true);
    expect(isHeicFile({ name: 'scan.heif', type: '' })).toBe(true);
    expect(isHeicFile({ name: 'scan.jpg', type: 'image/jpeg' })).toBe(false);
  });
});

describe('decodeImageFile', () => {
  it('names HEIC as the reason when a HEIC photo fails to decode', async () => {
    env = installFakeCanvas(() => {
      throw new DOMException('The source image could not be decoded.');
    });
    const decoding = decodeImageFile(photo('IMG_0001.HEIC', ''));
    await expect(decoding).rejects.toBeInstanceOf(ImageDecodeFailure);
    await expect(decoding).rejects.toMatchObject({ reason: 'heic' });
  });

  it('reports any other undecodable file as unreadable', async () => {
    env = installFakeCanvas(() => {
      throw new DOMException('The source image could not be decoded.');
    });
    await expect(
      decodeImageFile(photo('notes.txt', 'text/plain'))
    ).rejects.toMatchObject({ reason: 'unreadable' });
  });

  it('applies EXIF orientation', async () => {
    env = installFakeCanvas(() => syntheticNegative(40, 30));
    await decodeImageFile(photo());
    expect(env.createImageBitmap).toHaveBeenCalledWith(
      expect.any(File),
      expect.objectContaining({ imageOrientation: 'from-image' })
    );
  });

  it('retries without options when the browser rejects them', async () => {
    env = installFakeCanvas((_file, _resize) => syntheticNegative(40, 30));
    const decode = env.createImageBitmap.getMockImplementation();
    env.createImageBitmap.mockImplementationOnce(() =>
      Promise.reject(new TypeError("'from-image' is not a valid enum value"))
    );
    if (decode) env.createImageBitmap.mockImplementation(decode);
    const bitmap = await decodeImageFile(photo());
    expect(bitmap.width).toBe(40);
    expect(env.createImageBitmap).toHaveBeenCalledTimes(2);
    expect(env.createImageBitmap).toHaveBeenLastCalledWith(expect.any(File));
  });
});

describe('loadNegative', () => {
  it('builds a 2048 px proxy and closes the full-size bitmap', async () => {
    env = installFakeCanvas(() => syntheticNegative(4096, 3072));
    const loaded = await loadNegative(photo());
    expect(loaded.original).toEqual({ width: 4096, height: 3072 });
    expect(loaded.proxy.width).toBe(2048);
    expect(loaded.proxy.height).toBe(1536);
    expect(env.bitmaps[0].close).toHaveBeenCalled();
  });
});

function coefficientsFor(image: ImageData): InversionCoefficients {
  const base = samplePatch(image, 2, image.height / 2, 3);
  if (!base) throw new Error('no base');
  return deriveCoefficients({
    filmType: 'c41',
    base,
    histograms: buildDensityHistograms(image, base, 'c41'),
  });
}

describe('exportPositive', () => {
  it('exports at full size when the region fits, and inverts it', async () => {
    env = installFakeCanvas((_file, resize) =>
      syntheticNegative(resize?.width ?? 120, resize?.height ?? 80)
    );
    const loaded = await loadNegative(photo());
    const coefficients = coefficientsFor(loaded.proxy);
    const encoded: HTMLCanvasElement[] = [];
    env.toBlob.mockImplementation(function (
      this: HTMLCanvasElement,
      callback: (blob: Blob | null) => void,
      type?: string
    ) {
      encoded.push(this);
      // Read the rendered pixels before the export releases the canvas.
      const pixels = canvasPixels(this);
      callback(
        new Blob([Uint8Array.from(pixels ? pixels.data : [])], { type })
      );
    });

    const { blob, plan } = await exportPositive({
      file: loaded.file,
      original: loaded.original,
      region: { x: 0, y: 0, width: 120, height: 80 },
      coefficients,
      format: 'jpeg',
    });

    expect(plan).toEqual({
      width: 120,
      height: 80,
      sourceWidth: 120,
      sourceHeight: 80,
      downscaled: false,
    });
    expect(env.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      'image/jpeg',
      JPEG_QUALITY
    );
    const pixels = new Uint8Array(await blob.arrayBuffer());
    // Clear base (left edge) is the deepest shadow: black. The densest part
    // of the negative (right edge) is the brightest highlight.
    const at = (x: number, y: number) => pixels[(y * 120 + x) * 4 + 1];
    expect(at(2, 40)).toBeLessThan(16);
    expect(at(118, 40)).toBeGreaterThan(235);
    // The export leaves nothing allocated behind it.
    expect(encoded).toHaveLength(1);
    expect(encoded[0]).toMatchObject({ width: 0, height: 0 });
    for (const bitmap of env.bitmaps) expect(bitmap.close).toHaveBeenCalled();
  });

  it('scales an over-the-cap region down and decodes at that size', async () => {
    env = installFakeCanvas((_file, resize) =>
      syntheticNegative(resize?.width ?? 400, resize?.height ?? 300)
    );
    const loaded = await loadNegative(photo());
    const progress: number[] = [];

    const { plan } = await exportPositive({
      file: loaded.file,
      original: loaded.original,
      region: { x: 0, y: 0, width: 400, height: 300 },
      coefficients: coefficientsFor(loaded.proxy),
      format: 'png',
      limits: { maxPixels: 30_000, maxSide: 10_000 },
      onProgress: (fraction) => progress.push(fraction),
    });

    expect(plan.downscaled).toBe(true);
    expect(plan.width * plan.height).toBeLessThanOrEqual(30_000);
    expect(plan).toMatchObject({ width: 200, height: 150 });
    // The second decode (the export's) asked for the scaled size.
    expect(env.createImageBitmap).toHaveBeenLastCalledWith(
      expect.any(File),
      expect.objectContaining({ resizeWidth: 200, resizeHeight: 150 })
    );
    expect(env.toBlob).toHaveBeenLastCalledWith(
      expect.any(Function),
      'image/png',
      undefined
    );
    expect(progress.at(-1)).toBe(1);
  });

  it('crops to the requested region of the original', async () => {
    env = installFakeCanvas(() => syntheticNegative(300, 200));
    const loaded = await loadNegative(photo());
    const { plan } = await exportPositive({
      file: loaded.file,
      original: loaded.original,
      region: { x: 30, y: 20, width: 150, height: 100 },
      coefficients: coefficientsFor(loaded.proxy),
      format: 'jpeg',
    });
    expect(plan).toMatchObject({ width: 150, height: 100, downscaled: false });
  });

  it('uses small tiles on the CPU so the page can paint between them', async () => {
    const width = CPU_EXPORT_TILE_SIDE * 2 + 40;
    const height = CPU_EXPORT_TILE_SIDE + 20;
    env = installFakeCanvas(() => syntheticNegative(width, height));
    const loaded = await loadNegative(photo());
    const progress: number[] = [];
    await exportPositive({
      file: loaded.file,
      original: loaded.original,
      region: { x: 0, y: 0, width, height },
      coefficients: coefficientsFor(loaded.proxy),
      format: 'jpeg',
      createRenderer: (options) =>
        createInversionRenderer({ ...options, forceCpu: true }),
      onProgress: (fraction) => progress.push(fraction),
    });
    // 3 columns by 2 rows of CPU tiles, where a GPU tile would be one.
    expect(progress).toHaveLength(6);
    expect(progress.at(-1)).toBe(1);
  });

  it('releases the canvas and bitmap when encoding fails', async () => {
    env = installFakeCanvas(() => syntheticNegative(64, 48));
    const loaded = await loadNegative(photo());
    env.toBlob.mockImplementation((callback: (blob: Blob | null) => void) =>
      callback(null)
    );
    const created: HTMLCanvasElement[] = [];
    const createElement = document.createElement.bind(document);
    const spy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string) => {
        const element = createElement(tag);
        if (element instanceof HTMLCanvasElement) created.push(element);
        return element;
      });
    try {
      await expect(
        exportPositive({
          file: loaded.file,
          original: loaded.original,
          region: { x: 0, y: 0, width: 64, height: 48 },
          coefficients: coefficientsFor(loaded.proxy),
          format: 'jpeg',
        })
      ).rejects.toThrow('could not encode');
    } finally {
      spy.mockRestore();
    }
    expect(created.length).toBeGreaterThan(0);
    for (const canvas of created) {
      expect(canvas.width).toBe(0);
      expect(canvas.height).toBe(0);
    }
    for (const bitmap of env.bitmaps) expect(bitmap.close).toHaveBeenCalled();
  });
});

describe('exportPositive interruptions', () => {
  /** A stand-in for a WebGL renderer whose context is already lost: it
   *  cannot draw, and its canvas is blank. */
  function lostGpuRenderer(): InversionRenderer {
    const canvas = document.createElement('canvas');
    return {
      backend: 'webgl2',
      canvas,
      maxSourceSide: 4096,
      isLost: true,
      setSource(pixels) {
        canvas.width = pixels.width;
        canvas.height = pixels.height;
      },
      render: () => false,
      dispose: vi.fn(() => {
        canvas.width = 0;
        canvas.height = 0;
      }),
    };
  }

  it('finishes on the CPU when the GPU context is lost, never leaving it negative', async () => {
    env = installFakeCanvas(() => syntheticNegative(120, 80));
    const loaded = await loadNegative(photo());
    env.toBlob.mockImplementation(function (
      this: HTMLCanvasElement,
      callback: (blob: Blob | null) => void,
      type?: string
    ) {
      const pixels = canvasPixels(this);
      callback(
        new Blob([Uint8Array.from(pixels ? pixels.data : [])], { type })
      );
    });
    const gpu = lostGpuRenderer();
    const requested: RendererOptions[] = [];
    const createRenderer = (options: RendererOptions) => {
      requested.push(options);
      return options.forceCpu ? createInversionRenderer(options) : gpu;
    };

    const { blob } = await exportPositive({
      file: loaded.file,
      original: loaded.original,
      region: { x: 0, y: 0, width: 120, height: 80 },
      coefficients: coefficientsFor(loaded.proxy),
      format: 'png',
      createRenderer,
    });

    expect(requested.at(-1)).toMatchObject({ forceCpu: true });
    expect(gpu.dispose).toHaveBeenCalled();
    const pixels = new Uint8Array(await blob.arrayBuffer());
    const at = (x: number, y: number) => pixels[(y * 120 + x) * 4 + 1];
    // Inverted: the clear base is black, not the bright negative.
    expect(at(2, 40)).toBeLessThan(16);
    expect(at(118, 40)).toBeGreaterThan(235);
  });

  it('stops and frees everything when aborted', async () => {
    env = installFakeCanvas(() => syntheticNegative(64, 48));
    const loaded = await loadNegative(photo());
    const controller = new AbortController();
    const exporting = exportPositive({
      file: loaded.file,
      original: loaded.original,
      region: { x: 0, y: 0, width: 64, height: 48 },
      coefficients: coefficientsFor(loaded.proxy),
      format: 'jpeg',
      signal: controller.signal,
      onProgress: () => controller.abort(),
    });
    await expect(exporting).rejects.toMatchObject({ name: 'AbortError' });
    expect(env.toBlob).not.toHaveBeenCalled();
    for (const bitmap of env.bitmaps) expect(bitmap.close).toHaveBeenCalled();
  });
});

describe('exportFileName', () => {
  it('suffixes the original name and swaps the extension', () => {
    expect(exportFileName('roll-12-frame-04.HEIC', 'jpeg')).toBe(
      'roll-12-frame-04-positive.jpg'
    );
    expect(exportFileName('negative', 'png')).toBe('negative-positive.png');
    expect(exportFileName('.jpg', 'png')).toBe('negative-positive.png');
  });
});
