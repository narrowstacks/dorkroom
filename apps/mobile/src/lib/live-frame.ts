// The live camera inverter's frame pass. It runs as a worklet on the camera's
// frame queue (vision-camera's frame output, via
// react-native-vision-camera-worklets), so it is verified on device, not under
// vitest; its geometry is in components/negative-inverter/live-geometry.ts.
//
// Per frame: the camera buffer (a YUV CVPixelBuffer) is wrapped as a Skia GPU
// texture without a copy, drawn upright and scaled down into an offscreen
// surface, and copied to the CPU, because GPU objects belong to the thread's
// Metal context and the stage draws on the UI thread. That copy goes to
// React, which shows it through the same inversion shader as the editor. When
// React asks, a smaller copy's pixels go along for statistics.
//
// GPU ownership: the frame output runs on a serial dispatch queue, which is
// not pinned to one OS thread, and RN Skia's Metal context is thread-local.
// So every GPU object (texture, surfaces, GPU snapshots) is made and freed
// within one call here and never cached across frames: a cached surface could
// meet the next frame's texture on another thread's context. That costs one
// small surface allocation per frame (3 MB at 1024 x 768).
//
// CPU images go to the JS thread (`onImage`), which sets the stage's shared
// value. A direct hop to the UI runtime is not possible from here in dev
// builds: react-native-worklets 0.10.1 strips `__workletHash` from worklets
// captured into a worker runtime, so `scheduleOnRuntimeWithId` rejects them
// as "not a worklet" under __DEV__. Statistics passes are kept to a few ms,
// so the JS hop does not stall the preview. Only one image is in flight at a
// time (`imagePending`, set here and cleared by `onImage`): if JS has not
// taken the last one, the frame is dropped rather than queued.
//
// Cost note: about 3 MB copied from the GPU per frame (~90 MB/s at 30 fps).
// If the frame rate suffers on device, LIVE_LONG_EDGE = 768 halves it.
import type { PixelSize } from '@dorkroom/logic';
import {
  AlphaType,
  ColorType,
  FilterMode,
  MipmapMode,
  Skia,
  type SkImage,
  type SkSurface,
} from '@shopify/react-native-skia';
import type { Frame, NativeBuffer } from 'react-native-vision-camera';
import { scheduleOnRN, type Synchronizable } from 'react-native-worklets';
import {
  bufferToOutputMatrix,
  downscaleSteps,
  fitWithin,
  LIVE_LONG_EDGE,
  LIVE_STATS_LONG_EDGE,
  uprightSize,
} from '@/components/negative-inverter/live-geometry';

export interface LiveFrameTargets {
  /** Set by React to ask for a statistics snapshot; cleared here. */
  snapshotWanted: Synchronizable<boolean>;
  /** True while an image is on its way to JS; cleared there. */
  imagePending: Synchronizable<boolean>;
  /** Receives each upright CPU image (on the JS thread); owns it from then
   *  on. */
  onImage: (image: SkImage) => void;
  /** Receives a snapshot's RGBA pixels and the live image size. */
  onSnapshot: (
    pixels: Uint8Array,
    width: number,
    height: number,
    liveWidth: number,
    liveHeight: number
  ) => void;
  /** Receives a failure's message, once per distinct message. */
  onFailure: (message: string) => void;
  /** The last message sent to `onFailure`, so a failure that repeats every
   *  frame is reported once rather than 30 times a second. */
  lastFailure: Synchronizable<string>;
}

/** A fresh offscreen surface on this thread's context. Untagged, like every
 *  surface in the inverter: values pass through as sRGB code values. */
function offscreen(size: PixelSize): SkSurface {
  'worklet';
  const surface = Skia.Surface.MakeOffscreen(size.width, size.height);
  if (!surface) throw new Error('No offscreen surface for the live view.');
  return surface;
}

/** Draw into a fresh surface at `size`, snapshot it, free the surface. */
function render(size: PixelSize, draw: (surface: SkSurface) => void): SkImage {
  'worklet';
  const surface = offscreen(size);
  try {
    draw(surface);
    surface.flush();
    return surface.makeImageSnapshot();
  } finally {
    surface.dispose();
  }
}

/** The frame texture drawn upright at `size`, as a GPU image. */
function drawUpright(texture: SkImage, frame: Frame, size: PixelSize): SkImage {
  'worklet';
  return render(size, (surface) => {
    const buffer = { width: texture.width(), height: texture.height() };
    const canvas = surface.getCanvas();
    canvas.concat(
      Skia.Matrix(
        bufferToOutputMatrix(buffer, frame.orientation, frame.isMirrored, size)
      )
    );
    const rect = Skia.XYWHRect(0, 0, buffer.width, buffer.height);
    canvas.drawImageRectOptions(
      texture,
      rect,
      rect,
      FilterMode.Linear,
      MipmapMode.None
    );
  });
}

/** `image` resampled to `size`, linearly, as a GPU image. */
function resize(image: SkImage, size: PixelSize): SkImage {
  'worklet';
  return render(size, (surface) => {
    surface
      .getCanvas()
      .drawImageRectOptions(
        image,
        Skia.XYWHRect(0, 0, image.width(), image.height()),
        Skia.XYWHRect(0, 0, size.width, size.height),
        FilterMode.Linear,
        MipmapMode.None
      );
  });
}

interface StatsPixels {
  pixels: Uint8Array | null;
  size: PixelSize;
}

/** RGBA pixels of the live image shrunk to the statistics size, by halving
 *  steps so the percentiles are not aliased. */
function statsPixels(shown: SkImage): StatsPixels {
  'worklet';
  let current = shown;
  let size = { width: shown.width(), height: shown.height() };
  try {
    for (const step of downscaleSteps(size, LIVE_STATS_LONG_EDGE)) {
      const next = resize(current, step);
      if (current !== shown) current.dispose();
      current = next;
      size = step;
    }
    const pixels = current.readPixels(0, 0, {
      width: size.width,
      height: size.height,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    });
    return { pixels: pixels instanceof Uint8Array ? pixels : null, size };
  } finally {
    if (current !== shown) current.dispose();
  }
}

/** Render one camera frame for the live view. Always disposes the frame. */
export function renderLiveFrame(frame: Frame, targets: LiveFrameTargets) {
  'worklet';
  let buffer: NativeBuffer | undefined;
  let texture: SkImage | undefined;
  let shown: SkImage | undefined;
  let claimedImage = false;
  try {
    const wantImage = !targets.imagePending.getDirty();
    const wantStats = targets.snapshotWanted.getDirty();
    if (!wantImage && !wantStats) return;
    if (!frame.isValid || !frame.hasNativeBuffer) return;
    buffer = frame.getNativeBuffer();
    texture = Skia.Image.MakeImageFromNativeBuffer(buffer.pointer);
    const upright = uprightSize(
      { width: texture.width(), height: texture.height() },
      frame.orientation
    );
    shown = drawUpright(texture, frame, fitWithin(upright, LIVE_LONG_EDGE));

    if (wantImage) {
      const cpu = shown.makeNonTextureImage();
      if (cpu && cpu !== shown) {
        targets.imagePending.setBlocking(true);
        claimedImage = true;
        try {
          scheduleOnRN(targets.onImage, cpu);
        } catch (error) {
          // The image never left: free it here (it is a CPU copy, with no
          // GPU context) and release the claim so the next frame can try.
          cpu.dispose();
          throw error;
        }
        claimedImage = false;
      }
    }

    if (wantStats) {
      targets.snapshotWanted.setBlocking(false);
      const { pixels, size } = statsPixels(shown);
      if (pixels) {
        scheduleOnRN(
          targets.onSnapshot,
          pixels,
          size.width,
          size.height,
          shown.width(),
          shown.height()
        );
      }
    }
  } catch (error) {
    if (claimedImage) targets.imagePending.setBlocking(false);
    const message = error instanceof Error ? error.message : String(error);
    if (targets.lastFailure.getDirty() !== message) {
      targets.lastFailure.setBlocking(message);
      scheduleOnRN(targets.onFailure, message);
    }
  } finally {
    shown?.dispose();
    texture?.dispose();
    buffer?.release();
    frame.dispose();
  }
}

/**
 * Free a live image on the UI thread two frames from now. Run on the UI
 * runtime: by the second frame, no draw can still be using it.
 */
export function disposeOnUi(image: SkImage) {
  'worklet';
  requestAnimationFrame(() => requestAnimationFrame(() => image.dispose()));
}
