import { Skeleton } from '@dorkroom/ui';

// A single shimmer block — the primitive loading placeholder.
export const Block = () => (
  <div style={{ maxWidth: 360 }}>
    <Skeleton className="h-6 w-full" />
  </div>
);

// Stacked lines approximating a loading text block / list row.
export const TextLines = () => (
  <div
    style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360 }}
  >
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-1/2" />
  </div>
);

// Mixed shapes — an avatar with two lines, a common list-item placeholder.
export const ListItem = () => (
  <div
    style={{ display: 'flex', gap: 12, alignItems: 'center', maxWidth: 360 }}
  >
    <Skeleton className="h-12 w-12 rounded-full" />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  </div>
);
