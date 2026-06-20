import { SkeletonCard } from '@dorkroom/ui';

// The loading placeholder for a film/recipe card — a bordered card with a
// title block and a 2x2 grid of stat shimmer blocks.
export const Default = () => (
  <div style={{ maxWidth: 320 }}>
    <SkeletonCard />
  </div>
);

// How a grid of cards looks while a results page is loading.
export const Grid = () => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))',
      gap: 16,
      maxWidth: 520,
    }}
  >
    <SkeletonCard />
    <SkeletonCard />
  </div>
);
