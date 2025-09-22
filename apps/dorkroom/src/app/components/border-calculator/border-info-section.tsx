
import { CalculatorCard } from '@dorkroom/ui';

const INFO_HOW_TO_USE = [
  'Select your desired aspect ratio (the ratio of your negative or image)',
  'Choose your paper size (the size of photo paper you\'re printing on)',
  'Set your minimum border width (at least 0.5" recommended)',
  'Optionally enable offsets to shift the image from center',
  'View the blade positions in the results section',
];

const INFO_TIPS = [
  'Easels only provide markings for quarter-inch increments, so you are on your own for measuring the blade positions with a ruler.',
  'For uniform borders, keep offsets at 0',
  'The "flip paper orientation" button rotates the paper between portrait and landscape',
  'The "flip aspect ratio" button swaps the width and height of your image',
];

export function BorderInfoSection() {
  return (
    <div className="mt-16">
      <CalculatorCard
        title="How this calculator works"
        description="Get a quick refresher on what the inputs mean and how the blade positioning comes together."
        padding="normal"
        className="bg-surface-muted/80"
      >
        <div className="space-y-5 text-sm text-white/75">
          <p>
            The border calculator helps you determine the optimal placement of your
            enlarger easel blades when printing photos, ensuring consistent and
            aesthetically pleasing borders.
          </p>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-[0.25em] text-white/60">
              How to use
            </h4>
            <ul className="space-y-2">
              {INFO_HOW_TO_USE.map((item, index) => (
                <li
                  key={index}
                  className="rounded-2xl border border-white/5 bg-white/5 px-4 py-2 text-white/75"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-[0.25em] text-white/60">
              Blade measurements
            </h4>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-white/90">
              The measurements shown are distances from the edge of your enlarger
              baseboard to where each blade should be positioned. For non-standard paper
              sizes (sizes that don't have a standard easel slot), follow the
              instructions to place your paper in the appropriate easel slot.
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-[0.25em] text-white/60">
              Tips
            </h4>
            <ul className="space-y-2">
              {INFO_TIPS.map((tip, index) => (
                <li
                  key={index}
                  className="rounded-2xl border border-white/5 bg-white/5 px-4 py-2 text-white/75"
                >
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CalculatorCard>
    </div>
  );
}