import {
  CROP_HANDLES,
  type CropHandle,
  dragCropRect,
  type PixelPoint,
  type PixelRect,
  type PixelSize,
  screenToImagePoint,
} from '@dorkroom/logic';
import {
  Canvas,
  FillType,
  Group,
  ImageShader,
  Path,
  Rect,
  Shader,
  Skia,
  type SkImage,
  type SkRect,
} from '@shopify/react-native-skia';
import { memo, type ReactNode, useRef, useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  type SharedValue,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { inversionEffect } from '@/lib/negative-inverter';
import type { InversionUniforms } from './inversion-sksl';
import type { InverterTool } from './inverter-state';
import {
  BASE_PATCH_SIZE,
  NEUTRAL_PATCH_SIZE,
  type PickedSample,
} from './inverter-state';
import {
  frameSize,
  frameToScreenMatrix,
  fromFrame,
  inFrame,
  rectFromFrame,
  rectToFrame,
  toFrame,
  type ViewFrame,
} from './orientation';
import {
  fitContain,
  hitCropHandle,
  imagePointToScreen,
  imageRectToScreen,
  LOUPE_RADIUS,
  LOUPE_SIZE,
  placeLoupe,
  viewDeltaToImage,
} from './stage-geometry';

export interface InverterStageProps {
  /** The negative: a photo's proxy, or the live camera feed, which changes
   *  every frame without a React render. */
  image: SkImage | SharedValue<SkImage | null>;
  size: PixelSize;
  /** What is shown: the crop or the whole frame, oriented. Crop, base and
   *  neutral stay in source pixels and are mapped through it. */
  frame: ViewFrame;
  /** Height of the stage, in points. */
  height: number;
  uniforms: SharedValue<InversionUniforms>;
  /** Draw the positive (else the negative as photographed). */
  positive: boolean;
  tool: InverterTool | null;
  crop: PixelRect;
  base: PickedSample | null;
  neutral: PickedSample | null;
  onCrop: (crop: PixelRect) => void;
  onPick: (tool: 'base' | 'neutral', point: PixelPoint) => void;
  /** Long-press on the stage (no tool active): show the negative while held. */
  onHold: (holding: boolean) => void;
}

const HANDLE = 10;

/** A ring of `width` centred on a circle of radius `r`, as a fill path. */
function ringPath(cx: number, cy: number, r: number, width: number) {
  return Skia.Path.Make()
    .addCircle(cx, cy, r + width / 2)
    .addCircle(cx, cy, Math.max(0, r - width / 2))
    .setFillType(FillType.EvenOdd);
}

/** A rectangle outline of `width` inside the box edge, as a fill path. */
function framePath(x: number, y: number, w: number, h: number, width: number) {
  const inset = Math.min(width, w / 2, h / 2);
  return Skia.Path.Make()
    .addRect(Skia.XYWHRect(x, y, w, h))
    .addRect(Skia.XYWHRect(x + inset, y + inset, w - 2 * inset, h - 2 * inset))
    .setFillType(FillType.EvenOdd);
}

// Lowercase wrappers for the Skia and gesture-handler factories, so the
// component body calls no capitalized functions.
const xywh = (x: number, y: number, width: number, height: number) => {
  'worklet';
  return Skia.XYWHRect(x, y, width, height);
};
const roundRect = (rect: SkRect, rx: number, ry: number) => {
  'worklet';
  return Skia.RRectXY(rect, rx, ry);
};
const newPath = () => Skia.Path.Make();
const matrixOf = (values: number[]) => Skia.Matrix(values);
const panGesture = () => Gesture.Pan();
const longPressGesture = () => Gesture.LongPress();
const tapGesture = () => Gesture.Tap();
const exclusiveGesture = (...gestures: Parameters<typeof Gesture.Exclusive>) =>
  Gesture.Exclusive(...gestures);

/**
 * The photo, live-inverted by the Skia shader, with the crop overlay, picked
 * markers, and a loupe that floats clear of the finger while picking.
 */
function InverterStageView({
  image,
  size,
  frame,
  height,
  uniforms,
  positive,
  tool,
  crop,
  base,
  neutral,
  onCrop,
  onPick,
  onHold,
}: InverterStageProps) {
  const [width, setWidth] = useState(0);
  const view = { width, height };
  // The picture as shown: the frame's region, oriented.
  const shown = frameSize(frame);
  const box = fitContain(shown, view);
  const boxRect = xywh(box.left, box.top, box.width, box.height);

  // Crop being dragged, shown before it is committed on release.
  const [draft, setDraft] = useState<PixelRect | null>(null);
  // The gesture reads the latest draft from a ref, not a stale closure.
  const draftRef = useRef<PixelRect | null>(null);
  const drag = useRef<{ start: PixelRect; handle: CropHandle } | null>(null);
  const shownCrop = draft ?? crop;
  const cropBox = imageRectToScreen(rectToFrame(shownCrop, frame), box, shown);

  // Loupe state lives in shared values so moving it does not re-render.
  const touchX = useSharedValue(0);
  const touchY = useSharedValue(0);
  const loupeOn = useSharedValue(0);

  const pickTool = tool === 'base' || tool === 'neutral' ? tool : null;
  // Rotate has no gesture on the photo: hold still shows the negative.
  const touchTool = tool === 'crop' || pickTool !== null;

  const toImage = (x: number, y: number) =>
    fromFrame(screenToImagePoint({ x, y }, box, shown), frame);

  const pan = panGesture()
    .runOnJS(true)
    // A pan starts on movement; a touch without movement is the tap below.
    .minDistance(2)
    .enabled(touchTool && width > 0)
    .onBegin((e) => {
      if (tool === 'crop') {
        const handle = hitCropHandle({ x: e.x, y: e.y }, cropBox);
        drag.current = handle ? { start: crop, handle } : null;
      } else {
        touchX.value = e.x;
        touchY.value = e.y;
        loupeOn.value = 1;
      }
    })
    .onUpdate((e) => {
      if (tool === 'crop') {
        if (!drag.current) return;
        // Drag in the frame as shown, so the handles follow the screen
        // however the photo is turned, then store the crop in source pixels.
        const d = viewDeltaToImage(e.translationX, e.translationY, box, shown);
        const next = rectFromFrame(
          dragCropRect(
            rectToFrame(drag.current.start, frame),
            drag.current.handle,
            d.x,
            d.y,
            shown
          ),
          frame
        );
        draftRef.current = next;
        setDraft(next);
      } else {
        touchX.value = e.x;
        touchY.value = e.y;
      }
    })
    .onEnd((e) => {
      if (tool === 'crop') {
        if (draftRef.current) onCrop(draftRef.current);
      } else if (pickTool) {
        onPick(pickTool, toImage(e.x, e.y));
      }
    })
    .onFinalize(() => {
      drag.current = null;
      draftRef.current = null;
      setDraft(null);
      loupeOn.value = 0;
    });

  const hold = longPressGesture()
    .runOnJS(true)
    .enabled(tool === null || tool === 'rotate')
    .minDuration(250)
    .onStart(() => onHold(true))
    .onFinalize(() => onHold(false));

  // A tap samples where it lands, without dragging the loupe there first.
  const tap = tapGesture()
    .runOnJS(true)
    // Pressing, waiting for the loupe and lifting without moving is a pick
    // too; the default 500 ms limit would fail it, and the pan never starts.
    .maxDuration(Number.MAX_SAFE_INTEGER)
    .enabled(pickTool !== null && width > 0)
    .onEnd((e, success) => {
      if (success && pickTool) onPick(pickTool, toImage(e.x, e.y));
    });

  const gesture = exclusiveGesture(pan, tap, hold);

  // The whole image in source pixels, moved, scaled and turned onto the
  // box, and clipped to it, so a crop shows only its region.
  const sourceRect = xywh(0, 0, size.width, size.height);
  const photo = (
    <Group clip={boxRect}>
      <Group matrix={matrixOf(frameToScreenMatrix(frame, box))}>
        <Rect x={0} y={0} width={size.width} height={size.height}>
          {positive ? (
            <Shader source={inversionEffect()} uniforms={uniforms}>
              <ImageShader image={image} fit="fill" rect={sourceRect} />
            </Shader>
          ) : (
            <ImageShader image={image} fit="fill" rect={sourceRect} />
          )}
        </Rect>
      </Group>
    </Group>
  );

  // Outside the crop is dimmed, so the statistics region reads at a glance.
  const dim = newPath()
    .addRect(boxRect)
    .addRect(xywh(cropBox.left, cropBox.top, cropBox.width, cropBox.height))
    .setFillType(FillType.EvenOdd);

  const patch = tool === 'neutral' ? NEUTRAL_PATCH_SIZE : BASE_PATCH_SIZE;
  const zoom =
    box.width > 0
      ? LOUPE_SIZE / ((2 * LOUPE_RADIUS * box.width) / shown.width)
      : 1;
  const loupe = useDerivedValue(() =>
    placeLoupe({ x: touchX.value, y: touchY.value }, view)
  );
  const loupeTransform = useDerivedValue(() => [
    { translateX: loupe.value.x },
    { translateY: loupe.value.y },
    { scale: zoom },
    { translateX: -touchX.value },
    { translateY: -touchY.value },
  ]);
  const loupeClip = useDerivedValue(() =>
    roundRect(
      xywh(
        loupe.value.x - LOUPE_SIZE / 2,
        loupe.value.y - LOUPE_SIZE / 2,
        LOUPE_SIZE,
        LOUPE_SIZE
      ),
      LOUPE_SIZE / 2,
      LOUPE_SIZE / 2
    )
  );
  const loupeOffset = useDerivedValue(() => [
    { translateX: loupe.value.x },
    { translateY: loupe.value.y },
  ]);
  const patchSide = (patch * box.width * zoom) / shown.width;

  const marker = (sample: PickedSample | null, colour: string): ReactNode => {
    if (!sample || box.width === 0 || !inFrame(sample.point, frame)) {
      return null;
    }
    const p = imagePointToScreen(toFrame(sample.point, frame), box, shown);
    return (
      <Group>
        <Path path={ringPath(p.x, p.y, 7, 4)} color="rgba(0,0,0,0.6)" />
        <Path path={ringPath(p.x, p.y, 7, 2)} color={colour} />
      </Group>
    );
  };

  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(e.nativeEvent.layout.width);

  return (
    <GestureDetector gesture={gesture}>
      <View
        onLayout={onLayout}
        style={{ height }}
        className="overflow-hidden rounded-xl bg-black"
        accessibilityRole="image"
        accessibilityLabel={
          positive ? 'Positive of your negative' : 'Your negative'
        }
        accessibilityHint={
          tool === 'crop'
            ? 'Drag the edges to set the region used for levels'
            : pickTool
              ? 'Drag to the spot to sample, then lift your finger'
              : 'Touch and hold to see the negative'
        }
      >
        {width > 0 ? (
          // sRGB, untagged: the default "p3" canvas would colour-convert the
          // proxy on its way into the shader, unlike the export, which
          // reads and writes untagged sRGB (see src/lib/negative-inverter.ts).
          <Canvas style={{ width, height }} colorSpace="srgb">
            {photo}
            {tool === 'crop' ? (
              <Group>
                <Path path={dim} color="rgba(0,0,0,0.55)" />
                <Path
                  path={framePath(
                    cropBox.left,
                    cropBox.top,
                    cropBox.width,
                    cropBox.height,
                    2
                  )}
                  color="#fb7185"
                />
                {CROP_HANDLES.filter((h) => h.length === 2).map((h) => (
                  <Rect
                    key={h}
                    x={
                      (h.includes('w')
                        ? cropBox.left
                        : cropBox.left + cropBox.width) -
                      HANDLE / 2
                    }
                    y={
                      (h.includes('n')
                        ? cropBox.top
                        : cropBox.top + cropBox.height) -
                      HANDLE / 2
                    }
                    width={HANDLE}
                    height={HANDLE}
                    color="#ffffff"
                  />
                ))}
              </Group>
            ) : null}
            {tool === 'base' ? null : marker(base, '#fbbf24')}
            {tool === 'neutral' ? null : marker(neutral, '#e5e7eb')}
            {pickTool ? (
              <Group opacity={loupeOn}>
                <Group clip={loupeClip}>
                  <Rect
                    x={0}
                    y={0}
                    width={width}
                    height={height}
                    color="#000"
                  />
                  <Group transform={loupeTransform}>{photo}</Group>
                </Group>
                <Group transform={loupeOffset}>
                  <Path
                    path={ringPath(0, 0, LOUPE_SIZE / 2, 2)}
                    color="#ffffff"
                  />
                  <Path
                    path={framePath(
                      -patchSide / 2,
                      -patchSide / 2,
                      patchSide,
                      patchSide,
                      1.5
                    )}
                    color="#fb7185"
                  />
                </Group>
              </Group>
            ) : null}
          </Canvas>
        ) : null}
      </View>
    </GestureDetector>
  );
}

/** Memoized: the live view re-renders its screen as badges change, and the
 *  stage (gestures, paths, the Skia tree) should only follow when its own
 *  props do. The photo itself streams through the `image` shared value. */
export const InverterStage = memo(InverterStageView);
