import { SkeletonTableRow } from '@dorkroom/ui';

// SkeletonTableRow renders a <tr> of six shimmer cells, so it must live inside
// a table. This mirrors the development-recipes table while it loads.
export const Default = () => (
  <div style={{ maxWidth: 560 }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        <SkeletonTableRow />
      </tbody>
    </table>
  </div>
);

// Several loading rows stacked — the full table-loading state.
export const Stacked = () => (
  <div style={{ maxWidth: 560 }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        <SkeletonTableRow />
        <SkeletonTableRow />
        <SkeletonTableRow />
        <SkeletonTableRow />
      </tbody>
    </table>
  </div>
);
