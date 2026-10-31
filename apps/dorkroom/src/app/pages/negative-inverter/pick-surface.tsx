import {
  type PixelPoint,
  type PixelSize,
  screenToImagePoint,
} from '@dorkroom/logic';
import {
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import { LOUPE_GAP, LOUPE_SIZE, loupeBelow } from './loupe-placement';

interface PickSurfaceProps {
  image: PixelSize;
  /** Accessible name, e.g. "Pick the film base". */
  label: string;
  frameRef: RefObject<HTMLElement | null>;
  /** The canvas the loupe magnifies, read when it draws. */
  getLoupeSource: () => HTMLCanvasElement | null;
  /** Side of the sampled patch, in image pixels; outlined in the loupe. */
  patchSize: number;
  onPick: (point: PixelPoint) => void;
  /** Focus the surface (and scroll the photo into view) when it mounts, for
   *  a picker opened from a control elsewhere on the page. */
  focusOnMount?: boolean;
}

/** Image pixels from the centre to the loupe's edge. */
const LOUPE_RADIUS = 22;

function keyDirection(key: string): readonly [number, number] | null {
  switch (key) {
    case 'ArrowLeft':
      return [-1, 0];
    case 'ArrowRight':
      return [1, 0];
    case 'ArrowUp':
      return [0, -1];
    case 'ArrowDown':
      return [0, 1];
    default:
      return null;
  }
}

interface LoupeProps {
  image: PixelSize;
  point: PixelPoint;
  /** Show the loupe under the point, when there is no room above it. */
  below: boolean;
  patchSize: number;
  getSource: () => HTMLCanvasElement | null;
}

/**
 * A magnifier that floats above the finger while picking, since the finger
 * covers the spot being sampled. It shows the picked patch as a square.
 */
function Loupe({ image, point, below, patchSize, getSource }: LoupeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const source = getSource();
    const ctx = canvas?.getContext('2d');
    if (!canvas || !source || !ctx) return;
    const ratio = Math.min(3, window.devicePixelRatio || 1);
    const size = Math.round(LOUPE_SIZE * ratio);
    if (canvas.width !== size) {
      canvas.width = size;
      canvas.height = size;
    }
    const zoom = size / (LOUPE_RADIUS * 2);
    // The source may be smaller than the proxy (the CPU preview is), so map
    // proxy pixels onto it.
    const scale = source.width / image.width || 1;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(
      source,
      (point.x - LOUPE_RADIUS) * scale,
      (point.y - LOUPE_RADIUS) * scale,
      LOUPE_RADIUS * 2 * scale,
      LOUPE_RADIUS * 2 * scale,
      0,
      0,
      size,
      size
    );
    // Patch outline in two tones so it shows on any part of the image.
    const side = patchSize * zoom;
    const at = (size - side) / 2;
    ctx.lineWidth = 3 * ratio;
    ctx.strokeStyle = '#000';
    ctx.strokeRect(at, at, side, side);
    ctx.lineWidth = 1.5 * ratio;
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(at, at, side, side);
  }, [getSource, image.width, patchSize, point]);

  // Release the backing store on unmount; iOS Safari only frees canvas
  // memory on collection otherwise.
  useEffect(() => {
    const canvas = canvasRef.current;
    return () => {
      if (!canvas) return;
      canvas.width = 0;
      canvas.height = 0;
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute z-30 overflow-hidden rounded-full border-2 shadow-xl"
      style={{
        width: LOUPE_SIZE,
        height: LOUPE_SIZE,
        left: `clamp(${LOUPE_SIZE / 2}px, ${(point.x / image.width) * 100}%, calc(100% - ${LOUPE_SIZE / 2}px))`,
        top: `${(point.y / image.height) * 100}%`,
        transform: below
          ? `translate(-50%, ${LOUPE_GAP}px)`
          : `translate(-50%, calc(-100% - ${LOUPE_GAP}px))`,
        borderColor: 'var(--color-text-primary)',
      }}
    >
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  );
}

interface PressState {
  pointerId: number;
  point: PixelPoint;
  /** Show the loupe under the finger; see {@link loupeBelow}. */
  below: boolean;
}

/**
 * A tap target over the whole photo for sampling a colour. Touch and pen show
 * the loupe while pressed and pick where the finger lifts, so the spot can be
 * fine-tuned by sliding. Keyboard users move a crosshair with the arrow keys
 * and pick with Enter or Space.
 */
export function PickSurface({
  image,
  label,
  frameRef,
  getLoupeSource,
  patchSize,
  onPick,
  focusOnMount = false,
}: PickSurfaceProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [press, setPress] = useState<PressState | null>(null);
  const [cursor, setCursor] = useState<PixelPoint>({
    x: image.width / 2,
    y: image.height / 2,
  });
  const [cursorBelow, setCursorBelow] = useState(false);
  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    if (!focusOnMount) return;
    buttonRef.current?.focus({ preventScroll: true });
    frameRef.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }, [focusOnMount, frameRef]);

  /** Where the loupe goes for a point at this height in the viewport. */
  const placeBelow = (clientY: number): boolean => {
    const box = frameRef.current?.getBoundingClientRect();
    return loupeBelow({ yInFrame: clientY - (box?.top ?? 0), clientY });
  };

  const toImage = (event: PointerEvent): PixelPoint | null => {
    const box = frameRef.current?.getBoundingClientRect();
    if (!box) return null;
    return screenToImagePoint(
      { x: event.clientX, y: event.clientY },
      box,
      image
    );
  };

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    const point = toImage(event);
    if (!point) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setShowCursor(false);
    setPress({
      pointerId: event.pointerId,
      point,
      below: placeBelow(event.clientY),
    });
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!press || press.pointerId !== event.pointerId) return;
    const point = toImage(event);
    if (point) {
      setPress({
        pointerId: event.pointerId,
        point,
        below: placeBelow(event.clientY),
      });
    }
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!press || press.pointerId !== event.pointerId) return;
    const point = toImage(event) ?? press.point;
    setPress(null);
    onPick(point);
  };

  const onPointerCancel = () => setPress(null);

  const onKeyDown = (event: KeyboardEvent) => {
    const direction = keyDirection(event.key);
    if (!direction) return;
    event.preventDefault();
    setShowCursor(true);
    const step =
      Math.max(1, Math.round(Math.max(image.width, image.height) / 100)) *
      (event.shiftKey ? 5 : 1);
    const next = {
      x: Math.max(0, Math.min(image.width - 1, cursor.x + direction[0] * step)),
      y: Math.max(
        0,
        Math.min(image.height - 1, cursor.y + direction[1] * step)
      ),
    };
    setCursor(next);
    const box = frameRef.current?.getBoundingClientRect();
    const yInFrame = box ? (next.y / image.height) * box.height : 0;
    setCursorBelow(
      loupeBelow({ yInFrame, clientY: (box?.top ?? 0) + yInFrame })
    );
  };

  // Enter and Space arrive as a click with no pointer detail; pointer taps
  // are handled on release above, so their click is ignored.
  const onClick = (event: MouseEvent) => {
    if (event.detail === 0) onPick(cursor);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${label}. Tap the photo, or move with the arrow keys and press Enter.`}
        className="absolute inset-0 z-20 cursor-crosshair touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--color-focus-ring)]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onKeyDown={onKeyDown}
        onClick={onClick}
        onBlur={() => setShowCursor(false)}
      />
      {showCursor && !press && (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute z-20 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
            style={{
              left: `${(cursor.x / image.width) * 100}%`,
              top: `${(cursor.y / image.height) * 100}%`,
              borderColor: 'var(--color-brand)',
            }}
          />
          <Loupe
            image={image}
            point={cursor}
            below={cursorBelow}
            patchSize={patchSize}
            getSource={getLoupeSource}
          />
        </>
      )}
      {press && (
        <Loupe
          image={image}
          point={press.point}
          below={press.below}
          patchSize={patchSize}
          getSource={getLoupeSource}
        />
      )}
    </>
  );
}
