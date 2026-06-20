import { ResponsiveModal } from '@dorkroom/ui';
import { useState } from 'react';

const footerButton = (primary: boolean) =>
  ({
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 500,
    borderRadius: 12,
    cursor: 'pointer',
    border: primary ? 'none' : '1px solid var(--color-border-secondary)',
    backgroundColor: primary
      ? 'var(--color-primary)'
      : 'var(--color-surface-muted)',
    color: primary ? 'white' : 'var(--color-text-secondary)',
  }) as const;

// Desktop layout (isMobile=false) renders as a centered Modal — the canonical case.
export const Desktop = () => {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ maxWidth: 560 }}>
      <ResponsiveModal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Edit development recipe"
        isMobile={false}
        footer={
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" style={footerButton(false)}>
              Cancel
            </button>
            <button type="button" style={footerButton(true)}>
              Save recipe
            </button>
          </div>
        }
      >
        <p>
          Adjust the dilution, temperature and time for your Ilford HP5 Plus
          recipe. Changes apply the next time you load this combination.
        </p>
      </ResponsiveModal>
    </div>
  );
};

// Mobile layout (isMobile=true) renders the same content as a bottom Drawer.
export const MobileDrawer = () => {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ maxWidth: 420 }}>
      <ResponsiveModal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Recipe details"
        isMobile
        mobileSize="md"
        footer={
          <button type="button" style={footerButton(true)}>
            Use this recipe
          </button>
        }
      >
        <p>
          Kodak Tri-X 400 in Rodinal 1:50, 20&deg;C, 13 minutes. Agitate gently
          for the first minute, then 4 inversions every 3 minutes.
        </p>
      </ResponsiveModal>
    </div>
  );
};
