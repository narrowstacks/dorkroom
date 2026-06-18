import { ReciprocityChart } from '@dorkroom/ui';

// Canonical reciprocity curve for a classic B&W film. The chart plots metered
// vs. corrected exposure time using adjusted = original^factor.
export const Default = () => (
  <div style={{ maxWidth: 420 }}>
    <ReciprocityChart
      filmName="Kodak Tri-X 400"
      originalTime={30}
      adjustedTime={73}
      factor={1.26}
    />
  </div>
);

// A film with a steeper reciprocity factor — longer correction at the same
// metered time, so the curve climbs faster.
export const SteepFactor = () => (
  <div style={{ maxWidth: 420 }}>
    <ReciprocityChart
      filmName="Ilford HP5 Plus"
      originalTime={60}
      adjustedTime={210}
      factor={1.31}
    />
  </div>
);
