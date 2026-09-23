import { ThemeProvider } from '@dorkroom/ui';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MobileNav } from '../mobile-nav';

/** MobileSidebar's ThemeToggle footer button needs the real ThemeContext. */
function render346(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

/**
 * Regression coverage for #346: once the drawer was open, the FAB that
 * opened it (labeled "Close navigation") was hidden underneath the drawer's
 * `<nav>` — same z-index, later in the DOM — so a tap on it actually hit the
 * Settings button in the sidebar footer instead of closing the drawer, and
 * focus never moved off the now-invisible toggle.
 */
describe('MobileNav (#346)', () => {
  it('gives the open drawer its own close button, distinct from the FAB', () => {
    render346(<MobileNav pathname="/" onNavigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));

    const drawer = screen.getByRole('dialog', { name: 'Navigation menu' });
    expect(
      within(drawer).getByRole('button', { name: 'Close navigation' })
    ).toBeInTheDocument();
  });

  it('closes the drawer when its own close button is clicked', () => {
    render346(<MobileNav pathname="/" onNavigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    const drawer = screen.getByRole('dialog', { name: 'Navigation menu' });
    const drawerCloseButton = within(drawer).getByRole('button', {
      name: 'Close navigation',
    });

    fireEvent.click(drawerCloseButton);

    // The dialog stays mounted through its exit transition (usePresence), so
    // assert the a11y state that flips synchronously rather than absence
    // from the DOM.
    expect(drawer).toHaveAttribute('aria-hidden', 'true');
    expect(drawer).not.toHaveAttribute('aria-modal');
  });

  it('moves focus into the drawer close button on open, and back to the FAB on close', () => {
    render346(<MobileNav pathname="/" onNavigate={vi.fn()} />);

    const toggle = screen.getByRole('button', { name: 'Open navigation' });
    fireEvent.click(toggle);

    const drawer = screen.getByRole('dialog', { name: 'Navigation menu' });
    const drawerCloseButton = within(drawer).getByRole('button', {
      name: 'Close navigation',
    });
    expect(drawerCloseButton).toHaveFocus();

    fireEvent.click(drawerCloseButton);

    expect(toggle).toHaveFocus();
  });

  it('returns focus to the FAB when the drawer is dismissed via Escape', () => {
    render346(<MobileNav pathname="/" onNavigate={vi.fn()} />);

    const toggle = screen.getByRole('button', { name: 'Open navigation' });
    fireEvent.click(toggle);
    screen.getByRole('dialog', { name: 'Navigation menu' });

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(toggle).toHaveFocus();
  });
});
