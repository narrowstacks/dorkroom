import type {
  InversionCoefficients,
  PixelPoint,
  PixelRect,
} from '@dorkroom/logic';
import { cn } from '@dorkroom/ui';
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { CropOverlay } from './crop-overlay';
import { downscaleImageData } from './decode-image';
import {
  createInversionRenderer,
  type InversionRenderer,
} from './inversion-renderer';
import { PickSurface } from './pick-surface';
import {
  BASE_PATCH_SIZE,
  type InverterTool,
  type InverterView,
  NEUTRAL_PATCH_SIZE,
  type PickedSample,
} from './use-negative-inverter';

interface NegativeStageProps {
  proxy: ImageData;
  crop: PixelRect;
  tool: InverterTool | null;
  view: InverterView;
  base: PickedSample | null;
  neutral: PickedSample | null;
  coefficients: InversionCoefficients | null;
  onCropChange: (crop: PixelRect) => void;
  onPickBase: (point: PixelPoint) => void;
  onPickNeutral: (point: PixelPoint) => void;
  /** Move focus to the neutral picker when it opens (it was opened from the
   *  sidebar, far from the photo). */
  focusNeutralPicker?: boolean;
}

/**
 * Long edge of the CPU preview. The CPU pass re-runs on every slider step on
 * the main thread: over the full 2048 px proxy that takes most of a second,
 * and even at 1024 px about 300 ms on a desktop. At 640 px a frame is about
 * a tenth of the proxy's pixels, so the sliders stay usable on a phone. The
 * browser scales it up to fit.
 */
const CPU_PREVIEW_LONG_EDGE = 640;

/** How long to wait for a lost GPU context to come back before switching
 *  the preview to the CPU. */
const CONTEXT_RESTORE_WAIT_MS = 1500;

interface MarkerProps {
  sample: PickedSample;
  width: number;
  height: number;
  label: string;
}

function SampleMarker({ sample, width, height, label }: MarkerProps) {
  return (
    <span
      title={label}
      aria-hidden="true"
      className="pointer-events-none absolute z-10 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[9px] font-bold"
      style={{
        left: `${(sample.point.x / width) * 100}%`,
        top: `${(sample.point.y / height) * 100}%`,
        borderColor: 'var(--color-background)',
        backgroundColor: 'var(--color-brand)',
        color: 'var(--color-background)',
      }}
    >
      {label.charAt(0)}
    </span>
  );
}

/**
 * The photo: the negative proxy on a 2D canvas, the positive on the
 * renderer's canvas, and the crop, picker and markers layered on top. The
 * positive re-renders when the coefficients change, at most once a frame.
 */
export function NegativeStage({
  proxy,
  crop,
  tool,
  view,
  base,
  neutral,
  coefficients,
  onCropChange,
  onPickBase,
  onPickNeutral,
  focusNeutralPicker = false,
}: NegativeStageProps) {
  const frameRef = useRef<HTMLElement>(null);
  const negativeRef = useRef<HTMLCanvasElement>(null);
  const positiveHostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<InversionRenderer | null>(null);
  const latestCoefficients = useRef<InversionCoefficients | null>(null);
  const [cpuOnly, setCpuOnly] = useState(false);
  const { width, height } = proxy;

  useEffect(() => {
    const canvas = negativeRef.current;
    if (!canvas) return undefined;
    // React resets the size attributes from props before this runs again.
    canvas.width = proxy.width;
    canvas.height = proxy.height;
    canvas.getContext('2d')?.putImageData(proxy, 0, 0);
    // iOS Safari counts a canvas's pixels against the tab's budget until it
    // is collected, so give them back as soon as the photo goes away.
    return () => {
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [proxy]);

  // One renderer per photo. Its canvas lives outside React's tree because a
  // canvas that failed to get a WebGL context cannot fall back to 2D. If the
  // GPU context is lost and not restored soon, start over on the CPU.
  useEffect(() => {
    const host = positiveHostRef.current;
    let restoreTimer: ReturnType<typeof setTimeout> | undefined;
    const renderer = createInversionRenderer({
      preserveDrawingBuffer: true,
      forceCpu: cpuOnly,
      onContextLost: () => {
        clearTimeout(restoreTimer);
        restoreTimer = setTimeout(() => {
          if (renderer?.isLost) setCpuOnly(true);
        }, CONTEXT_RESTORE_WAIT_MS);
      },
    });
    if (!host || !renderer) return undefined;
    renderer.canvas.className = 'block size-full';
    renderer.canvas.setAttribute('aria-hidden', 'true');
    renderer.setSource(
      renderer.backend === 'cpu'
        ? downscaleImageData(proxy, CPU_PREVIEW_LONG_EDGE)
        : proxy
    );
    host.append(renderer.canvas);
    rendererRef.current = renderer;
    if (latestCoefficients.current) renderer.render(latestCoefficients.current);
    return () => {
      clearTimeout(restoreTimer);
      rendererRef.current = null;
      renderer.canvas.remove();
      renderer.dispose();
    };
  }, [proxy, cpuOnly]);

  useEffect(() => {
    latestCoefficients.current = coefficients;
    const renderer = rendererRef.current;
    if (!renderer || !coefficients) return undefined;
    const frame = requestAnimationFrame(() => renderer.render(coefficients));
    return () => cancelAnimationFrame(frame);
  }, [coefficients]);

  const getNegativeCanvas = useCallback(() => negativeRef.current, []);
  const getPositiveCanvas = useCallback(
    () => rendererRef.current?.canvas ?? null,
    []
  );

  const showPositive = view === 'positive' && coefficients !== null;
  const image = { width, height };
  // CSSProperties has no custom properties; a wider type passes as one.
  const stageStyle: CSSProperties & Record<'--stage-aspect', number> = {
    aspectRatio: `${width} / ${height}`,
    '--stage-aspect': width / height,
  };

  return (
    // While cropping, the bottom handles' hit areas reach 22px below the
    // photo; the margin keeps them off the controls underneath.
    <div className={cn('flex justify-center', tool === 'crop' && 'mb-3')}>
      <figure
        ref={frameRef}
        aria-label={showPositive ? 'Positive preview' : 'Negative'}
        // Pickers own every touch on the photo; the crop leaves swipes to
        // the page so it still scrolls, and only its handles take them.
        // Shorter on phones, so the controls below stay in reach.
        className={cn(
          'relative m-0 w-[min(100%,calc(45vh*var(--stage-aspect)))] select-none md:w-[min(100%,calc(65vh*var(--stage-aspect)))]',
          (tool === 'base' || tool === 'neutral') && 'touch-none'
        )}
        style={stageStyle}
      >
        <canvas
          ref={negativeRef}
          width={width}
          height={height}
          aria-hidden="true"
          className={cn(
            'absolute inset-0 block size-full rounded-lg',
            showPositive && 'invisible'
          )}
        />
        <div
          ref={positiveHostRef}
          data-testid="positive-preview"
          className={cn(
            'absolute inset-0 overflow-hidden rounded-lg',
            !showPositive && 'invisible'
          )}
        />

        <CropOverlay
          image={image}
          crop={crop}
          active={tool === 'crop'}
          frameRef={frameRef}
          onCommit={onCropChange}
        />

        {base && (
          <SampleMarker
            sample={base}
            width={width}
            height={height}
            label="Base"
          />
        )}
        {neutral && coefficients?.filmType === 'c41' && (
          <SampleMarker
            sample={neutral}
            width={width}
            height={height}
            label="Neutral"
          />
        )}

        {tool === 'base' && (
          <PickSurface
            image={image}
            label="Pick the film base"
            frameRef={frameRef}
            getLoupeSource={getNegativeCanvas}
            patchSize={BASE_PATCH_SIZE}
            onPick={onPickBase}
          />
        )}
        {tool === 'neutral' && (
          <PickSurface
            image={image}
            label="Pick something that should be neutral grey"
            frameRef={frameRef}
            getLoupeSource={getPositiveCanvas}
            patchSize={NEUTRAL_PATCH_SIZE}
            onPick={onPickNeutral}
            focusOnMount={focusNeutralPicker}
          />
        )}
      </figure>
    </div>
  );
}
