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
    expect(drawer).toHaveAttribute('inert');
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

  it('is modal while open: Tab stays in the drawer, the page is inert, the FAB is not (#286)', () => {
    render346(
      <>
        <a href="/elsewhere">Page link</a>
        <MobileNav pathname="/" onNavigate={vi.fn()} />
      </>
    );

    const toggle = screen.getByRole('button', { name: 'Open navigation' });
    fireEvent.click(toggle);
    const drawer = screen.getByRole('dialog', { name: 'Navigation menu' });

    expect(
      screen.getByRole('link', { name: 'Page link' }).closest('[inert]')
    ).not.toBeNull();
    // The FAB stays the topmost tap target that closes the drawer.
    expect(toggle.closest('[inert]')).toBeNull();
    expect(drawer.closest('[inert]')).toBeNull();

    const closeButton = within(drawer).getByRole('button', {
      name: 'Close navigation',
    });
    fireEvent.keyDown(closeButton, { key: 'Tab', shiftKey: true });
    expect(drawer.contains(document.activeElement)).toBe(true);
    expect(closeButton).not.toHaveFocus();

    fireEvent.click(closeButton);
    // The page is live again; only the sliding-out drawer itself is inert.
    expect([...document.querySelectorAll('[inert]')]).toEqual([drawer]);
  });

  it('makes the drawer inert, with no focusable links, as soon as it closes (#603)', () => {
    render346(<MobileNav pathname="/" onNavigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    const drawer = screen.getByRole('dialog', { name: 'Navigation menu' });
    expect(drawer).not.toHaveAttribute('inert');
    expect(drawer).not.toHaveAttribute('aria-hidden');
    const links = within(drawer).getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    expect(links[0].closest('[inert]')).toBeNull();

    fireEvent.keyDown(document, { key: 'Escape' });

    // Still mounted while it slides out, but nothing in it is reachable.
    expect(drawer).toBeInTheDocument();
    expect(drawer).toHaveAttribute('inert');
    expect(drawer).toHaveClass('pointer-events-none');
    expect(drawer).not.toHaveAttribute('aria-hidden');
    for (const link of links) expect(link.closest('[inert]')).toBe(drawer);
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
 * #457: the close rule goes through the shared `useBreakpoint`
 * instead of a hand-written `(min-width: ...)` listener. #548 moved the
 * switch from sm (640px) to lg (1024px): the desktop header does not fit
 * any narrower.
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
  it('keeps the drawer open up to 1023px and closes it at 1024px', () => {
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
        width = 1023;
        for (const list of lists) list.dispatchEvent(new Event('change'));
      });
      expect(drawer).toHaveAttribute('aria-modal', 'true');

      act(() => {
        width = 1024;
        for (const list of lists) list.dispatchEvent(new Event('change'));
      });
      expect(drawer).toHaveAttribute('inert');
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});

/**
 * #516: the floating toggle ("Close navigation" while open) must stack above
 * the drawer, or the drawer footer's Settings button takes its taps. happy-dom
 * has no layout or hit testing, so assert the stacking classes here; the
 * `elementFromPoint` check runs in a real browser.
 */
describe('MobileNav floating toggle stacking (#516)', () => {
  const zIndexOf = (el: HTMLElement) => {
    const match = /(?:^|\s)z-(?:\[(\d+)\]|(\d+))(?:\s|$)/.exec(el.className);
    return Number(match?.[1] ?? match?.[2]);
  };

  it('stacks the floating toggle above the open drawer', () => {
    render346(<MobileNav pathname="/" onNavigate={vi.fn()} />);
    const toggle = screen.getByRole('button', { name: 'Open navigation' });
    fireEvent.click(toggle);
    const drawer = screen.getByRole('dialog', { name: 'Navigation menu' });

    expect(toggle).toHaveAccessibleName('Close navigation');
    expect(zIndexOf(toggle)).toBeGreaterThan(zIndexOf(drawer));
  });

  it('keeps the closed toggle at z-50 so later-DOM z-50 bottom sheets cover it', () => {
    // Bottom sheets (border settings, custom recipe form) are z-50 and later
    // in the DOM than the nav, so a closed toggle above 50 would cover them.
    render346(<MobileNav pathname="/" onNavigate={vi.fn()} />);
    const toggle = screen.getByRole('button', { name: 'Open navigation' });

    expect(zIndexOf(toggle)).toBeLessThanOrEqual(50);
  });

  // Class-only check; the real guard is the browser elementFromPoint run on
  // the PR (Settings must clear the toggle).
  it('pads the drawer bottom so the footer clears the floating toggle', () => {
    render346(<MobileNav pathname="/" onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    const drawer = screen.getByRole('dialog', { name: 'Navigation menu' });

    expect(drawer.className).toContain(
      'pb-[calc(env(safe-area-inset-bottom)+5rem)]'
    );
  });
});
