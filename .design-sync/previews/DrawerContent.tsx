import { Drawer, DrawerBody, DrawerContent } from '@dorkroom/ui';
import { useState } from 'react';

// DrawerContent is the full-height flex column wrapper inside a Drawer. Shown in
// its true context: a bottom drawer with a fixed header region and a body below.
export const InBottomDrawer = () => {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ maxWidth: 440 }}>
      <Drawer isOpen={open} onClose={() => setOpen(false)} size="md" anchor="bottom">
        <DrawerContent>
          <div
            style={{
              borderBottom: '1px solid var(--color-border-secondary)',
              padding: '12px 16px',
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
              }}
            >
              Paper sizes
            </h2>
          </div>
          <DrawerBody className="px-4 py-4">
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
              DrawerContent stretches to fill the drawer as a flex column so its
              header stays pinned and the body region takes the remaining height
              and scrolls.
            </p>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  );
};
