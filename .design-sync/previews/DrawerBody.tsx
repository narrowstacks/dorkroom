import { Drawer, DrawerBody, DrawerContent } from '@dorkroom/ui';
import { useState } from 'react';

// DrawerBody is the scrollable, flex-1 region inside a DrawerContent. Shown in
// true context with a longer list so its overflow-scroll role reads clearly.
export const ScrollableList = () => {
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
              Choose a developer
            </h2>
          </div>
          <DrawerBody className="px-4 py-4">
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                color: 'var(--color-text-secondary)',
                fontSize: 14,
              }}
            >
              <li>Kodak HC-110</li>
              <li>Kodak D-76</li>
              <li>Ilford ID-11</li>
              <li>Ilford Microphen</li>
              <li>Adox Rodinal</li>
              <li>Kodak Xtol</li>
              <li>Cinestill Df96 Monobath</li>
            </ul>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  );
};
