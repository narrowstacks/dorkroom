import { CalculatorCard } from '../calculator/calculator-card';

const INFO_HOW_TO_USE = [
  'Pick your aspect ratio (the shape of your negative)',
  "Pick your paper size (what you're printing on)",
  'Set a minimum border width (0.5" or more works well)',
  'Turn on offsets if you want the image off-center',
  'Read off the blade positions from the results',
];

const INFO_TIPS = [
  "Most easels only mark quarter-inch increments. You'll need a ruler for anything finer.",
  'For uniform borders, keep offsets at 0.',
  '"Even borders" matches the paper ratio so all four margins come out the same.',
  '"Flip paper" rotates between portrait and landscape.',
  '"Flip ratio" swaps the width and height of your image.',
];

export function BorderInfoSection() {
  return (
    <div className="mt-10">
      <CalculatorCard
        title="How it works"
        padding="normal"
        className="bg-surface-muted/80"
      >
        <div className="space-y-6">
          <p
            className="text-[15px] leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Figures out where to set your easel blades so you get even borders
            around a print. Punch in your paper size and negative format, and it
            gives you the blade positions.
          </p>

          <div className="space-y-3">
            <h4
              className="text-sm font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              How to use
            </h4>
            <ol className="ml-5 space-y-2 list-decimal">
              {INFO_HOW_TO_USE.map((item) => (
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
              Blade measurements
            </h4>
            <p
              className="text-[15px] leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Each reading is the distance from the baseboard edge to where that
              blade goes. If your paper doesn't fit a standard easel slot, the
              calculator will tell you which slot to use and where to place the
              paper.
            </p>
          </div>

          <div className="space-y-3">
            <h4
              className="text-sm font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Tips
            </h4>
            <ul className="ml-5 space-y-2 list-disc">
              {INFO_TIPS.map((tip) => (
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
    </div>
  );
}
