import { Drawer, DrawerBody, DrawerContent } from '@dorkroom/ui';
import { X } from 'lucide-react';
import { useState } from 'react';

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid var(--color-border-secondary)',
  padding: '12px 16px',
} as const;

// Canonical bottom drawer (mobile pattern): titled header + scrollable body.
export const BottomSheet = () => {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ maxWidth: 420 }}>
      <Drawer isOpen={open} onClose={() => setOpen(false)} size="md" anchor="bottom">
        <DrawerContent>
          <div style={headerStyle}>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
              }}
            >
              Recipe details
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              style={{
                borderRadius: 999,
                padding: 8,
                border: '1px solid var(--color-border-secondary)',
                color: 'var(--color-text-secondary)',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              <X className="size-5" />
            </button>
          </div>
          <DrawerBody className="px-4 pb-6 pt-4">
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
              Kodak Tri-X 400 in Rodinal 1:50 at 20&deg;C for 13 minutes.
              Agitate continuously for the first minute, then 4 inversions every
              3 minutes.
            </p>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

// Right-anchored drawer (side panel) with a list of filter options.
export const RightPanel = () => {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ maxWidth: 480 }}>
      <Drawer isOpen={open} onClose={() => setOpen(false)} anchor="right">
        <DrawerContent>
          <div style={headerStyle}>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
              }}
            >
              Filter recipes
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              style={{
                borderRadius: 999,
                padding: 8,
                border: '1px solid var(--color-border-secondary)',
                color: 'var(--color-text-secondary)',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              <X className="size-5" />
            </button>
          </div>
          <DrawerBody className="px-4 py-4">
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                color: 'var(--color-text-secondary)',
                fontSize: 14,
              }}
            >
              <li>Black &amp; white film</li>
              <li>HC-110 developer</li>
              <li>20&deg;C standard temperature</li>
              <li>ISO 400 and faster</li>
            </ul>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  );
};
