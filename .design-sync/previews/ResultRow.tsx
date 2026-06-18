import { ResultRow } from '@dorkroom/ui';

// A stack of result rows as they appear in a calculator's result card —
// the reciprocity calculator output.
export const Reciprocity = () => (
  <div
    style={{ maxWidth: 360 }}
    className="rounded-xl border p-4"
    // inline style to mirror the calculator result card surface
  >
    <div className="space-y-2">
      <ResultRow label="Film selection" value="Kodak Tri-X 400" />
      <ResultRow label="Original time" value="30 s" />
      <ResultRow label="Adjustment factor" value="1.52" />
      <ResultRow label="Corrected time" value="45 s" />
    </div>
  </div>
);

// A single key/value row — the exposure calculator's stop adjustment.
export const Single = () => (
  <div style={{ maxWidth: 360 }}>
    <ResultRow label="Stop adjustment" value="+1.0 stops" />
  </div>
);
