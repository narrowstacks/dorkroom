import { computePreviewRects } from '@dorkroom/logic';

const BOX = 120;

// SVG presentation attributes don't resolve CSS var(), so colors are applied as
// inline styles (matches mat-diagram). Resize carries the teal accent.
const ACCENT = 'var(--accent-teal-text)';
const OUTLINE = 'var(--color-text-secondary)';

export interface AspectPreviewProps {
  /** Original print width (inches). */
  origW: number;
  /** Original print length/height (inches). */
  origL: number;
  /** Target print width (inches). */
  newW: number;
  /** Target print length/height (inches). */
  newL: number;
}

function ratioLabel(w: number, l: number): string | null {
  if (w <= 0 || l <= 0) return null;
  return (w / l).toFixed(2);
}

/**
 * Overlays two uniformly-scaled, centered rectangles so the original and target
 * print proportions can be compared at a glance: a filled teal box for the new
 * print and a dashed outline for the original. Shares its geometry with the
 * mobile renderer via `computePreviewRects` in `@dorkroom/logic`. Renders
 * nothing until the target has a positive width.
 */
export function AspectPreview({
  origW,
  origL,
  newW,
  newL,
}: AspectPreviewProps) {
  const { orig, target } = computePreviewRects(origW, origL, newW, newL, BOX);
  if (target.w <= 0) return null;

  const targetRatio = ratioLabel(newW, newL);
  const origRatio = ratioLabel(origW, origL);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Decorative: the legend below states both aspect ratios as text, so the
          SVG is a visual representation of that same content. */}
      <svg
        viewBox={`0 0 ${BOX} ${BOX}`}
        className="block h-auto w-full max-w-[200px]"
        aria-hidden
      >
        <rect
          x={target.x}
          y={target.y}
          width={target.w}
          height={target.h}
          rx={2}
          strokeWidth={1.5}
          style={{ fill: ACCENT, fillOpacity: 0.13, stroke: ACCENT }}
        />
        <rect
          x={orig.x}
          y={orig.y}
          width={orig.w}
          height={orig.h}
          rx={2}
          fill="none"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          style={{ stroke: OUTLINE, strokeOpacity: 0.6 }}
        />
      </svg>

      <div
        className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-3 w-3 rounded-[2px]"
            style={{
              backgroundColor: ACCENT,
              opacity: 0.55,
              border: `1.5px solid ${ACCENT}`,
            }}
          />
          Target{targetRatio ? ` · ${targetRatio}:1` : ''}
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-3 w-3 rounded-[2px]"
            style={{ border: `1.5px dashed ${OUTLINE}`, opacity: 0.7 }}
          />
          Original{origRatio ? ` · ${origRatio}:1` : ''}
        </span>
      </div>
    </div>
  );
}
