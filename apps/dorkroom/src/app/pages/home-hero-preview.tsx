import {
  bladeReadings,
  calculateBladeThickness,
  computePrintSize,
} from '@dorkroom/logic';
import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

/* ------------------------------------------------------------------ *
   Read-only border-calculator preview for the home hero.

   Cycles through a few classic negative formats centered on 8x10 paper,
   with the easel blades set by the same geometry helpers the border
   calculator uses. All geometry is computed once at module level - no
   data fetching, no per-frame math.
\* ------------------------------------------------------------------ */

const PAPER = { width: 10, height: 8 }; // 8x10 paper, landscape

// calculateBladeThickness returns pixels for the calculator's 400px-wide
// canvas; convert to inches so the blades scale with this fluid preview.
const BLADE_IN =
  (calculateBladeThickness(PAPER.width, PAPER.height) / 400) * PAPER.width;

const pctX = (inches: number) => `${(inches / PAPER.width) * 100}%`;
const pctY = (inches: number) => `${(inches / PAPER.height) * 100}%`;

const FRACTION_GLYPHS: ReadonlyArray<readonly [number, string]> = [
  [0.25, '¼'],
  [0.5, '½'],
  [0.75, '¾'],
];

/** Format inches with vulgar fractions: 8.25 -> "8 1/4". */
function formatInches(value: number): string {
  const whole = Math.trunc(value);
  const rest = value - whole;
  if (rest < 0.001) return `${whole}`;
  const glyph = FRACTION_GLYPHS.find(
    ([fraction]) => Math.abs(rest - fraction) < 0.001
  )?.[1];
  return glyph ? `${whole}${glyph}` : value.toFixed(2);
}

interface BorderSetup {
  label: string;
  printW: number;
  printH: number;
  borderX: number;
  borderY: number;
  readout: string;
}

// Min borders are chosen so every blade reading lands on a quarter inch.
function makeSetup(
  label: string,
  ratioW: number,
  ratioH: number,
  minBorder: number
): BorderSetup {
  const { printW, printH } = computePrintSize(
    PAPER.width,
    PAPER.height,
    ratioW,
    ratioH,
    minBorder
  );
  const readings = bladeReadings(printW, printH, 0, 0);
  return {
    label,
    printW,
    printH,
    borderX: (PAPER.width - printW) / 2,
    borderY: (PAPER.height - printH) / 2,
    // Non-breaking spaces keep the readout on one line in the caption.
    readout: `${formatInches(readings.left)} × ${formatInches(readings.top)}`,
  };
}

const SETUPS: readonly BorderSetup[] = [
  makeSetup('35mm', 3, 2, 1.25),
  makeSetup('6×6', 1, 1, 1.5),
  makeSetup('4×5', 5, 4, 1),
];

const CYCLE_MS = 5000;

const bladeStyle = {
  background: 'var(--blade-background)',
  border: 'var(--blade-border)',
  boxShadow: 'var(--blade-shadow)',
} as const;

// Slow position/size easing for the print and blades when a new setup lands.
const easeClass = 'transition-all duration-1000 ease-in-out';

function animationsDisabled(): boolean {
  if (typeof document === 'undefined') return true;
  // Same contract the theme system writes for darkroom/high-contrast and the
  // user's animations toggle (utilities.css kills transitions for it too).
  if (
    document.documentElement.getAttribute('data-animations-disabled') === 'true'
  ) {
    return true;
  }
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function HomeHeroPreview() {
  const [setupIndex, setSetupIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      // Checked per tick so theme/toggle changes take effect immediately.
      if (animationsDisabled()) return;
      setSetupIndex((index) => (index + 1) % SETUPS.length);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, []);

  const { label, printW, printH, borderX, borderY, readout } =
    SETUPS[setupIndex];

  return (
    <Link
      to="/border"
      aria-label="Open the border calculator"
      className="group/hero block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-primary)]"
    >
      {/* The paper, with the print area and four easel blades */}
      <div
        className="relative w-full overflow-hidden rounded-sm shadow-subtle transition-all group-hover/hero:-translate-y-0.5 group-hover/hero:shadow-lg"
        style={{
          aspectRatio: `${PAPER.width} / ${PAPER.height}`,
          backgroundColor: 'var(--color-paper-background)',
          border: '1px solid var(--color-paper-border)',
        }}
      >
        {/* Print area */}
        <div
          className={`absolute ${easeClass}`}
          style={{
            left: pctX(borderX),
            top: pctY(borderY),
            width: pctX(printW),
            height: pctY(printH),
            backgroundColor: 'var(--color-print-background)',
            border: 'var(--print-border-style) var(--color-print-border)',
          }}
        />
        {/* Easel blades, sitting over the borders */}
        <div
          className={`absolute inset-y-0 -translate-x-full ${easeClass}`}
          style={{
            ...bladeStyle,
            width: pctX(BLADE_IN),
            left: pctX(borderX),
          }}
        />
        <div
          className={`absolute inset-y-0 ${easeClass}`}
          style={{
            ...bladeStyle,
            width: pctX(BLADE_IN),
            left: pctX(PAPER.width - borderX),
          }}
        />
        <div
          className={`absolute inset-x-0 -translate-y-full ${easeClass}`}
          style={{
            ...bladeStyle,
            height: pctY(BLADE_IN),
            top: pctY(borderY),
          }}
        />
        <div
          className={`absolute inset-x-0 ${easeClass}`}
          style={{
            ...bladeStyle,
            height: pctY(BLADE_IN),
            top: pctY(PAPER.height - borderY),
          }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-[color:var(--color-text-tertiary)]">
          {label} on 8×10 paper · blades at {readout}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[color:var(--color-text-secondary)] transition-colors group-hover/hero:text-[color:var(--color-text-primary)]">
          Border calculator
          <ArrowRight className="size-3.5 transition-transform group-hover/hero:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
