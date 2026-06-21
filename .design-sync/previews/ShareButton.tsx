import { ShareButton } from '@dorkroom/ui';

const noop = () => {};

// The three button variants, each with a recipe-sharing label.
export const Variants = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 240 }}>
    <ShareButton variant="primary" onClick={noop}>
      Share recipe
    </ShareButton>
    <ShareButton variant="secondary" onClick={noop}>
      Share recipe
    </ShareButton>
    <ShareButton variant="outline" onClick={noop}>
      Share recipe
    </ShareButton>
  </div>
);

// Size scale, primary variant.
export const Sizes = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 360 }}>
    <ShareButton size="sm" onClick={noop}>
      Share
    </ShareButton>
    <ShareButton size="md" onClick={noop}>
      Share
    </ShareButton>
    <ShareButton size="lg" onClick={noop}>
      Share
    </ShareButton>
  </div>
);

// Compact icon-only buttons (used in tight toolbars) across the variants.
export const IconOnly = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <ShareButton iconOnly variant="primary" onClick={noop} />
    <ShareButton iconOnly variant="secondary" onClick={noop} />
    <ShareButton iconOnly variant="outline" onClick={noop} />
  </div>
);

// Loading and disabled states.
export const States = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 240 }}>
    <ShareButton isLoading onClick={noop}>
      Share recipe
    </ShareButton>
    <ShareButton disabled onClick={noop}>
      Share recipe
    </ShareButton>
  </div>
);
