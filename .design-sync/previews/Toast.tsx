import { Toast } from '@dorkroom/ui';

// Toast is position:fixed (top-right of its viewport) and auto-dismisses after
// `duration` ms. We give it a very long duration so it stays on screen for the
// static capture, and relative-position the wrapper so the toast anchors here.

// Success — surface card with a green border and a check icon.
export const Success = () => (
  <div style={{ maxWidth: 380, position: 'relative', minHeight: 64 }}>
    <Toast
      message="Recipe saved to your favorites"
      type="success"
      duration={600000}
    />
  </div>
);

// Error — red border, X icon.
export const Error = () => (
  <div style={{ maxWidth: 380, position: 'relative', minHeight: 64 }}>
    <Toast
      message="Couldn't reach the database. Try again."
      type="error"
      duration={600000}
    />
  </div>
);

// Info — neutral border, no icon.
export const Info = () => (
  <div style={{ maxWidth: 380, position: 'relative', minHeight: 64 }}>
    <Toast message="Link copied to clipboard" type="info" duration={600000} />
  </div>
);
