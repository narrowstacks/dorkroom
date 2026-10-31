import {
  CROP_HANDLES,
  type CropHandle,
  dragCropRect,
  type PixelRect,
  type PixelSize,
} from '@dorkroom/logic';
import {
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
  useRef,
  useState,
} from 'react';

interface CropOverlayProps {
  image: PixelSize;
  crop: PixelRect;
  /** Handles are shown and draggable only while the crop tool is active. */
  active: boolean;
  /** The element the image fills, for mapping pointer moves to pixels. */
  frameRef: RefObject<HTMLElement | null>;
  /** Called once per drag (on release) or per key press. */
  onCommit: (crop: PixelRect) => void;
}

const HANDLE_NAMES = {
  move: 'Move the crop',
  nw: 'Crop top left corner',
  n: 'Crop top edge',
  ne: 'Crop top right corner',
  e: 'Crop right edge',
  se: 'Crop bottom right corner',
  s: 'Crop bottom edge',
  sw: 'Crop bottom left corner',
  w: 'Crop left edge',
} satisfies Record<CropHandle, string>;

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

interface DragState {
  handle: CropHandle;
  pointerId: number;
  startX: number;
  startY: number;
  start: PixelRect;
}

function handlePosition(handle: CropHandle, rect: PixelRect) {
  const x0 = rect.x;
  const y0 = rect.y;
  const x1 = rect.x + rect.width;
  const y1 = rect.y + rect.height;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const x = handle.includes('w') ? x0 : handle.includes('e') ? x1 : mx;
  const y = handle.includes('n') ? y0 : handle.includes('s') ? y1 : my;
  return { x, y };
}

const pct = (value: number, total: number) => `${(value / total) * 100}%`;

/**
 * The statistics crop: a dimmed surround plus eight large handles and a move
 * area. Pointer drags work with mouse, pen and touch; every handle is also a
 * button that the arrow keys nudge (Shift for bigger steps).
 */
export function CropOverlay({
  image,
  crop,
  active,
  frameRef,
  onCommit,
}: CropOverlayProps) {
  const [draft, setDraft] = useState<PixelRect | null>(null);
  const drag = useRef<DragState | null>(null);
  const rect = draft ?? crop;

  const onPointerDown = (handle: CropHandle, event: PointerEvent) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = {
      handle,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      start: crop,
    };
  };

  const onPointerMove = (event: PointerEvent) => {
    const state = drag.current;
    const box = frameRef.current?.getBoundingClientRect();
    if (!state || state.pointerId !== event.pointerId || !box) return;
    if (box.width === 0 || box.height === 0) return;
    const dx = ((event.clientX - state.startX) * image.width) / box.width;
    const dy = ((event.clientY - state.startY) * image.height) / box.height;
    setDraft(dragCropRect(state.start, state.handle, dx, dy, image));
  };

  const endDrag = (event: PointerEvent) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    drag.current = null;
    if (draft) onCommit(draft);
    setDraft(null);
  };

  const onKeyDown = (handle: CropHandle, event: KeyboardEvent) => {
    const direction = keyDirection(event.key);
    if (!direction) return;
    event.preventDefault();
    const step =
      Math.max(1, Math.round(Math.max(image.width, image.height) / 200)) *
      (event.shiftKey ? 10 : 1);
    onCommit(
      dragCropRect(
        crop,
        handle,
        direction[0] * step,
        direction[1] * step,
        image
      )
    );
  };

  const scrim = active
    ? 'rgba(var(--color-background-rgb), 0.62)'
    : 'rgba(var(--color-background-rgb), 0.45)';
  const x1 = rect.x + rect.width;
  const y1 = rect.y + rect.height;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* Surround, dimmed so it reads as excluded from the statistics. */}
      <div
        className="absolute inset-x-0 top-0"
        style={{ height: pct(rect.y, image.height), backgroundColor: scrim }}
      />
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: pct(image.height - y1, image.height),
          backgroundColor: scrim,
        }}
      />
      <div
        className="absolute left-0"
        style={{
          top: pct(rect.y, image.height),
          height: pct(rect.height, image.height),
          width: pct(rect.x, image.width),
          backgroundColor: scrim,
        }}
      />
      <div
        className="absolute right-0"
        style={{
          top: pct(rect.y, image.height),
          height: pct(rect.height, image.height),
          width: pct(image.width - x1, image.width),
          backgroundColor: scrim,
        }}
      />

      {/* Frame line; the move area doubles as it while active. */}
      <div
        className="absolute border-2"
        style={{
          left: pct(rect.x, image.width),
          top: pct(rect.y, image.height),
          width: pct(rect.width, image.width),
          height: pct(rect.height, image.height),
          borderColor: active
            ? 'var(--color-brand)'
            : 'var(--color-border-primary)',
        }}
      >
        {active && (
          <button
            type="button"
            aria-label={HANDLE_NAMES.move}
            onPointerDown={(event) => onPointerDown('move', event)}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={(event) => onKeyDown('move', event)}
            className="pointer-events-auto absolute inset-0 cursor-move touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
          />
        )}
      </div>

      {active &&
        CROP_HANDLES.map((handle) => {
          const at = handlePosition(handle, rect);
          const corner = handle.length === 2;
          const vertical = handle === 'e' || handle === 'w';
          return (
            <button
              key={handle}
              type="button"
              aria-label={HANDLE_NAMES[handle]}
              onPointerDown={(event) => onPointerDown(handle, event)}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={(event) => onKeyDown(handle, event)}
              className="group pointer-events-auto absolute flex size-11 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
              style={{
                left: pct(at.x, image.width),
                top: pct(at.y, image.height),
                cursor: `${handle}-resize`,
              }}
            >
              <span
                aria-hidden="true"
                className={
                  corner
                    ? 'size-4 rounded-sm border-2'
                    : vertical
                      ? 'h-6 w-2 rounded-full border-2'
                      : 'h-2 w-6 rounded-full border-2'
                }
                style={{
                  backgroundColor: 'var(--color-brand)',
                  borderColor: 'var(--color-background)',
                }}
              />
            </button>
          );
        })}
    </div>
  );
}
