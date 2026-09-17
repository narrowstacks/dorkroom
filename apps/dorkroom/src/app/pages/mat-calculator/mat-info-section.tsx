import type { MeasurementUnit } from '@dorkroom/logic';
import { useMeasurement } from '@dorkroom/ui';
import { CalculatorCard } from '@dorkroom/ui/calculator';

const HOW_TO_USE = [
  'Enter the outer mat dimensions — usually the frame’s rabbet opening, or pick a board preset.',
  'Set each border, or let Best fit center your artwork inside the board.',
  'Bottom-weighting adds a touch to the bottom border so the window sits at the optical center.',
  'Read the window opening, then take the guide-bar settings below to your cutter.',
];

/** Tips whose wording depends on the measurement preference from /settings. */
function tipsFor(unit: MeasurementUnit): string[] {
  const reveal =
    unit === 'imperial'
      ? 'Reveal (overlap onto the artwork) is typically 1/8" to 1/4" per side so the mat hides the paper edge.'
      : 'Reveal (overlap onto the artwork) is typically 0.3cm to 0.6cm per side so the mat hides the paper edge.';
  const entry =
    unit === 'imperial'
      ? 'Inputs accept decimals like 1.5, or fractions like 1 1/2 and 1/4.'
      : 'Inputs accept centimetres like 3.8. Board presets are named in inches but apply in centimetres.';
  return [
    'Cut the mat face down. The guide-bar offset is the border for the edge set against the bar.',
    reveal,
    'For a beveled cutter, overshoot each plunge/stop slightly to account for the bevel reach — verify on a scrap first.',
    entry,
  ];
}

export function MatInfoSection() {
  const { unit } = useMeasurement();

  return (
    <CalculatorCard
      title="How this calculator works"
      padding="normal"
      className="bg-surface-muted/80"
    >
      <div className="space-y-6">
        <p
          className="text-[15px] leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Plan a single-window mat with independent borders. Enter your board
          and borders (or fit them to your artwork) and the calculator returns
          the exact window opening plus guide-bar settings for a mat cutter.
        </p>

        <div className="space-y-3">
          <h4
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            How to use
          </h4>
          <ol className="ml-5 list-decimal space-y-2">
            {HOW_TO_USE.map((item) => (
              <li
                key={item}
                className="pl-2 text-[15px] leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {item}
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-3">
          <h4
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Tips
          </h4>
          <ul className="ml-5 list-disc space-y-2">
            {tipsFor(unit).map((tip) => (
              <li
                key={tip}
                className="pl-2 text-[15px] leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </CalculatorCard>
  );
}
