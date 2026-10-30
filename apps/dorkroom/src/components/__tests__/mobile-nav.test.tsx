import { ThemeProvider } from '@dorkroom/ui';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
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

/**
 * #457: the close-on-sm rule goes through the shared `useBreakpoint('sm')`
 * instead of a hand-written `(min-width: 640px)` listener.
 */
/** `min-width` / `max-width` list whose `matches` reads a fake viewport width. */
class FakeMediaQueryList extends EventTarget implements MediaQueryList {
  readonly media: string;
  onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null =
    null;
  private readonly currentWidth: () => number;

  constructor(media: string, currentWidth: () => number) {
    super();
    this.media = media;
    this.currentWidth = currentWidth;
  }

  get matches(): boolean {
    const px = Number.parseInt(/(\d+)px/.exec(this.media)?.[1] ?? '0', 10);
    const width = this.currentWidth();
    return this.media.includes('min-width') ? width >= px : width <= px;
  }

  addListener(): void {}

  removeListener(): void {}
}

describe('MobileNav breakpoint', () => {
  it('closes the drawer when the viewport crosses up to 640px', () => {
    const originalMatchMedia = window.matchMedia;
    let width = 375;
    const lists: FakeMediaQueryList[] = [];
    window.matchMedia = (query: string): MediaQueryList => {
      const list = new FakeMediaQueryList(query, () => width);
      lists.push(list);
      return list;
    };

    try {
      render346(<MobileNav pathname="/" onNavigate={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
      const drawer = screen.getByRole('dialog', { name: 'Navigation menu' });
      expect(drawer).toHaveAttribute('aria-modal', 'true');

      act(() => {
        width = 639;
        for (const list of lists) list.dispatchEvent(new Event('change'));
      });
      expect(drawer).toHaveAttribute('aria-modal', 'true');

      act(() => {
        width = 640;
        for (const list of lists) list.dispatchEvent(new Event('change'));
      });
      expect(drawer).toHaveAttribute('aria-hidden', 'true');
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});
