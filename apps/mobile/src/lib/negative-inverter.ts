// Native half of the negative inverter: decoding a photo into the interactive
// proxy, and rendering, encoding and saving the full-resolution positive. The
// math is in @dorkroom/logic and the shaders and render plan in
// components/negative-inverter; this file only drives Skia, the file system
// and the photo library, so it is verified on device, not under vitest.
//
// Colour: every photo is converted to sRGB code values before anything reads
// it, as a browser does when it decodes into a canvas, so iOS statistics and
// output match the web. Skia 2.6.2 offers Display P3 tagged offscreen
// surfaces but no sRGB tagged ones (an untagged surface is not colour-managed
// at all), so a photo is first drawn into a P3 surface, which Skia converts
// from whatever profile the file carries, and then through P3_TO_SRGB_SKSL
// into an untagged surface. Everything downstream (proxy, preview canvas,
// export tiles, encoded file) is untagged sRGB.
import {
  fitLongEdge,
  type InversionCoefficients,
  type PixelRect,
  type PixelSize,
  PREVIEW_LONG_EDGE,
  type RgbaImage,
} from '@dorkroom/logic';
import {
  AlphaType,
  ColorType,
  FilterMode,
  ImageFormat,
  MipmapMode,
  Skia,
  type SkImage,
  type SkRuntimeEffect,
  type SkShader,
  type SkSurface,
  TileMode,
} from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import {
  type CroppedExportPlan,
  cropToSource,
  exportFileName,
  type ExportFormat,
  JPEG_QUALITY,
  planCroppedExport,
  tileSource,
} from '@/components/negative-inverter/export-plan';
import {
  flattenUniforms,
  INVERSION_SKSL,
  inversionUniforms,
  P3_TO_SRGB_SKSL,
} from '@/components/negative-inverter/inversion-sksl';
import {
  isIdentity,
  type Orientation,
} from '@/components/negative-inverter/orientation';

/** A failure with a message fit to show the user. */
export class InverterFailure extends Error {}

const effects = new Map<string, SkRuntimeEffect>();

function compile(source: string): SkRuntimeEffect {
  let effect = effects.get(source);
  if (!effect) {
    effect = Skia.RuntimeEffect.Make(source) ?? undefined;
    if (!effect)
      throw new Error('A negative inverter shader failed to compile.');
    effects.set(source, effect);
  }
  return effect;
}

/** The compiled inversion shader, compiled once. */
export function inversionEffect(): SkRuntimeEffect {
  return compile(INVERSION_SKSL);
}

export interface LoadedNegative {
  /** The source file, re-read at full resolution for export. */
  uri: string;
  /** Full-resolution size, upright. */
  size: PixelSize;
  /** The proxy as an untagged sRGB CPU image, for drawing. */
  proxyImage: SkImage;
  /** The proxy's sRGB pixels, for statistics and picking. */
  proxy: RgbaImage;
}

/**
 * Decode an encoded photo. Skia's codec applies the EXIF orientation, so
 * width and height are upright.
 */
async function decode(uri: string): Promise<SkImage> {
  let image: SkImage | null = null;
  try {
    image = Skia.Image.MakeImageFromEncoded(await Skia.Data.fromURI(uri));
  } catch {
    image = null;
  }
  if (!image || image.width() < 1 || image.height() < 1) {
    image?.dispose();
    throw new InverterFailure(
      'That file could not be read as a photo. Try a JPEG or PNG.'
    );
  }
  return image;
}

function gpuSurface(width: number, height: number, p3: boolean): SkSurface {
  const surface = Skia.Surface.MakeOffscreen(
    width,
    height,
    p3 ? { colorSpace: 'display-p3' } : undefined
  );
  if (!surface) {
    throw new InverterFailure('Not enough memory to process this photo.');
  }
  return surface;
}

/** Snapshot a surface and free it. */
function finish(surface: SkSurface): SkImage {
  surface.flush();
  const image = surface.makeImageSnapshot();
  surface.dispose();
  return image;
}

/**
 * `src` of `image`, resampled to width x height into a Display P3 surface:
 * P3 code values whatever the photo's profile. Drawing a region (rather than
 * shading with the whole image) lets Skia tile a source larger than a Metal
 * texture.
 */
function regionToP3(
  image: SkImage,
  src: PixelRect,
  width: number,
  height: number
): SkImage {
  const surface = gpuSurface(width, height, true);
  surface
    .getCanvas()
    .drawImageRectOptions(
      image,
      Skia.XYWHRect(src.x, src.y, src.width, src.height),
      Skia.XYWHRect(0, 0, width, height),
      FilterMode.Linear,
      MipmapMode.None
    );
  return finish(surface);
}

/** A shader and the native objects it holds, freed together. */
interface OwnedShader {
  shader: SkShader;
  dispose: () => void;
}

/** A P3 image as a shader whose output is sRGB code values. */
function p3ToSrgbShader(
  p3: SkImage,
  origin: { x: number; y: number }
): OwnedShader {
  const image = p3.makeShaderOptions(
    TileMode.Clamp,
    TileMode.Clamp,
    FilterMode.Nearest,
    MipmapMode.None,
    Skia.Matrix().translate(origin.x, origin.y)
  );
  const shader = compile(P3_TO_SRGB_SKSL).makeShaderWithChildren([], [image]);
  return {
    shader,
    dispose: () => {
      shader.dispose();
      image.dispose();
    },
  };
}

/** Copy a GPU image into CPU memory and free the GPU copy. */
function toCpu(image: SkImage): SkImage {
  const cpu = image.makeNonTextureImage();
  if (!cpu) {
    image.dispose();
    throw new InverterFailure('Not enough memory to process this photo.');
  }
  if (cpu !== image) image.dispose();
  return cpu;
}

/**
 * Halve with linear filtering until within 2x of the target, then one last
 * linear step, all in P3: each step averages 2x2 pixels, so a 48 MP photo
 * becomes a clean proxy rather than an aliased one.
 */
function downscaleToP3(source: SkImage, target: PixelSize): SkImage {
  let current = source;
  for (;;) {
    const w = current.width();
    const h = current.height();
    const halve = w >= target.width * 2 && h >= target.height * 2;
    const next = halve
      ? { width: Math.ceil(w / 2), height: Math.ceil(h / 2) }
      : target;
    const scaled = regionToP3(
      current,
      { x: 0, y: 0, width: w, height: h },
      next.width,
      next.height
    );
    if (current !== source) current.dispose();
    current = scaled;
    if (!halve) return current;
  }
}

/** Decode a photo and build the interactive proxy, in sRGB. */
export async function loadNegative(uri: string): Promise<LoadedNegative> {
  const source = await decode(uri);
  const size = { width: source.width(), height: source.height() };
  const proxySize = fitLongEdge(size, PREVIEW_LONG_EDGE);
  let p3: SkImage;
  try {
    p3 = downscaleToP3(source, proxySize);
  } finally {
    source.dispose();
  }

  const surface = gpuSurface(proxySize.width, proxySize.height, false);
  const { shader, dispose } = p3ToSrgbShader(p3, { x: 0, y: 0 });
  const paint = Skia.Paint();
  paint.setShader(shader);
  surface
    .getCanvas()
    .drawRect(Skia.XYWHRect(0, 0, proxySize.width, proxySize.height), paint);
  const srgb = finish(surface);
  paint.dispose();
  dispose();
  p3.dispose();

  // A CPU copy, so drawing and readPixels do not depend on the GPU context
  // that made it.
  const proxyImage = toCpu(srgb);
  const pixels = proxyImage.readPixels(0, 0, {
    width: proxySize.width,
    height: proxySize.height,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });
  if (!(pixels instanceof Uint8Array)) {
    proxyImage.dispose();
    throw new InverterFailure('That photo could not be read.');
  }
  return {
    uri,
    size,
    proxyImage,
    proxy: { data: pixels, width: proxySize.width, height: proxySize.height },
  };
}

export interface ExportedPositive {
  uri: string;
  width: number;
  height: number;
}

/** Source pixels drawn around each downscaled tile, then cropped off. */
const TILE_SOURCE_PAD = 2;

/** Let the UI breathe between tiles. */
const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** Invert one output tile on the GPU and return it in CPU memory. Tiles
 *  are in rendered (cropped, unoriented) pixels. */
function renderTile(
  source: SkImage,
  tile: PixelRect,
  plan: CroppedExportPlan,
  uniforms: number[]
): SkImage {
  const { scale } = plan;
  // When scaling down, a tile's source rectangle has fractional edges and
  // drawImageRect samples strictly inside it, so neighbouring tiles would
  // disagree at the seam. Draw a margin of at least TILE_SOURCE_PAD source
  // pixels around the tile (inside the image) and only shade the tile.
  const pad = scale < 1 ? Math.ceil(TILE_SOURCE_PAD * scale) : 0;
  const left = Math.min(pad, tile.x);
  const top = Math.min(pad, tile.y);
  // The margin stays inside the crop, which is the edge of the output.
  const right = Math.min(pad, plan.width - tile.x - tile.width);
  const bottom = Math.min(pad, plan.height - tile.y - tile.height);
  const region = {
    x: tile.x - left,
    y: tile.y - top,
    width: tile.width + left + right,
    height: tile.height + top + bottom,
  };
  // An 8-bit P3 intermediate rounds by up to one code value before the
  // stretch. Skia 2.6.2 offers no F16 offscreen surface from JS
  // (MakeOffscreen takes only a colour space), so it stays 8-bit; the
  // ordered dither on output hides the difference.
  const p3 = regionToP3(
    source,
    tileSource(region, plan),
    region.width,
    region.height
  );
  const srgb = p3ToSrgbShader(p3, region);
  const shader = inversionEffect().makeShaderWithChildren(uniforms, [
    srgb.shader,
  ]);
  const paint = Skia.Paint();
  paint.setShader(shader);
  const surface = gpuSurface(tile.width, tile.height, false);
  const canvas = surface.getCanvas();
  // Draw in rendered coordinates, so the dither and the image line up
  // across tile seams. Turning the result by quarter turns and mirroring
  // keeps it on the pixel grid, so the dither stays a seamless ordered
  // pattern in the file, only turned with it.
  canvas.translate(-tile.x, -tile.y);
  canvas.drawRect(
    Skia.XYWHRect(tile.x, tile.y, tile.width, tile.height),
    paint
  );
  const out = finish(surface);
  paint.dispose();
  shader.dispose();
  srgb.dispose();
  p3.dispose();
  return toCpu(out);
}

/**
 * Render the crop of the positive at full resolution, oriented, and write it
 * to the cache directory.
 *
 * The crop (on the proxy) becomes a region of the full-resolution photo, and
 * each tile of `planCroppedExport` is drawn from just its part of that region
 * (so a source wider than Metal's 16384 limit still renders; Skia then tiles
 * the upload itself and may decode the source again for each tile, which is
 * slow but bounded, and still to confirm on device), converted to sRGB,
 * inverted with the ordered dither before the 8-bit write (as on web), and
 * read back. An upright single-tile export is encoded as drawn; otherwise
 * the tiles are placed, turned and mirrored, into one CPU bitmap of the
 * file's size. Peak memory at 48 MP (8064 x 6048, 195 MB as RGBA): the
 * decoded source (195 MB, plus Skia's GPU upload of it), the assembled CPU
 * bitmap (195 MB), and per tile three 4096 x 4096 buffers of 64 MB (P3
 * region, inverted tile, CPU readback), about 0.6 GB in all; each tile's
 * buffers are freed before the next.
 */
export async function exportPositive(
  negative: LoadedNegative,
  coeffs: InversionCoefficients,
  format: ExportFormat,
  crop: PixelRect,
  orientation: Orientation
): Promise<ExportedPositive> {
  const source = await decode(negative.uri);
  const region = cropToSource(
    crop,
    { width: negative.proxy.width, height: negative.proxy.height },
    { width: source.width(), height: source.height() }
  );
  const plan = planCroppedExport(region, orientation);
  const uniforms = flattenUniforms(inversionUniforms(coeffs));

  let output: SkImage;
  try {
    if (!plan.tiled && isIdentity(orientation)) {
      output = renderTile(source, plan.tiles[0], plan, uniforms);
    } else {
      const bitmap = Skia.Surface.Make(plan.output.width, plan.output.height);
      if (!bitmap) {
        throw new InverterFailure('Not enough memory to export this photo.');
      }
      try {
        const canvas = bitmap.getCanvas();
        // Rendered pixels to file pixels: whole quarter turns and mirrors.
        canvas.concat(plan.matrix);
        for (const tile of plan.tiles) {
          const pixels = renderTile(source, tile, plan, uniforms);
          canvas.drawImage(pixels, tile.x, tile.y);
          pixels.dispose();
          await nextFrame();
        }
        output = finish(bitmap);
      } catch (failure) {
        bitmap.dispose();
        throw failure;
      }
    }
  } finally {
    source.dispose();
  }

  let bytes: Uint8Array | null;
  try {
    bytes = output.encodeToBytes(
      format === 'png' ? ImageFormat.PNG : ImageFormat.JPEG,
      JPEG_QUALITY
    );
  } finally {
    output.dispose();
  }
  // The native encoder hands back null when it fails, despite the type.
  if (!bytes || bytes.length === 0) {
    throw new InverterFailure(
      'The positive could not be encoded. Try again, or try PNG.'
    );
  }
  const file = new File(Paths.cache, exportFileName(new Date(), format));
  file.write(bytes);
  return { uri: file.uri, ...plan.output };
}

/** Best-effort delete of an exported file; never throws. */
export function deleteExport(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // A leftover file in the cache directory is harmless; iOS purges it.
  }
}

/**
 * Add a file to the photo library. Asks for add-only access, so the app never
 * needs to read the library to save to it. Resolves false when declined.
 */
export async function saveToPhotos(uri: string): Promise<boolean> {
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) return false;
  await MediaLibrary.Asset.create(uri);
  return true;
}
