
const INFO_HOW_TO_USE = [
  '1. Select your desired aspect ratio (the ratio of your negative or image)',
  '2. Choose your paper size (the size of photo paper you\'re printing on)',
  '3. Set your minimum border width (at least 0.5" recommended)',
  '4. Optionally enable offsets to shift the image from center',
  '5. View the blade positions in the results section',
];

const INFO_TIPS = [
  '• Easels only provide markings for quarter-inch increments, so you are on your own for measuring the blade positions with a ruler.',
  '• For uniform borders, keep offsets at 0',
  '• The "flip paper orientation" button rotates the paper between portrait and landscape',
  '• The "flip aspect ratio" button swaps the width and height of your image',
];

export function BorderInfoSection() {
  return (
    <div className="mt-16 rounded-lg border border-white/10 bg-white/5 p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">About This Tool</h3>
      <p className="mb-6 text-white/80">
        The border calculator helps you determine the optimal placement of your
        enlarger easel blades when printing photos, ensuring consistent and
        aesthetically pleasing borders.
      </p>

      <div className="space-y-4">
        <div>
          <h4 className="mb-2 font-medium text-white">How To Use:</h4>
          <ul className="space-y-1 text-sm text-white/70">
            {INFO_HOW_TO_USE.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-2 font-medium text-white">Blade Measurements:</h4>
          <p className="text-sm text-white/70 mb-2">
            The measurements shown are distances from the edge of your enlarger
            baseboard to where each blade should be positioned. For non-standard paper
            sizes (sizes that don&apos;t have a standard easel slot), follow the
            instructions to place your paper in the appropriate easel slot.
          </p>
        </div>

        <div>
          <h4 className="mb-2 font-medium text-white">Tips:</h4>
          <ul className="space-y-1 text-sm text-white/70">
            {INFO_TIPS.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}