import { MobileSidebar } from '@dorkroom/ui';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../app/lib/cn';
import { usePresence } from './use-presence';

interface MobileNavProps {
  pathname: string;
  onNavigate: (path: string) => void;
}

/**
 * Mobile-only floating action button + slide-in navigation drawer.
 *
 * The backdrop and drawer are mounted only while the menu is open or closing
 * (see {@link usePresence}) so iOS Safari can't retain a stale composited tile
 * behind its dynamic toolbar.
 */
export function MobileNav({ pathname, onNavigate }: MobileNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { mounted, visible } = usePresence(isMobileMenuOpen, 350);

  // Lock body scroll while the menu is open
  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    if (isMobileMenuOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }

    document.body.style.removeProperty('overflow');
    return undefined;
  }, [isMobileMenuOpen]);

  // Close when the viewport crosses the sm breakpoint (640px)
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mq = window.matchMedia('(min-width: 640px)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsMobileMenuOpen(false);
      }
    };

    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen]);

  return (
    <>
      <button
        type="button"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-[calc(env(safe-area-inset-right)+1rem)] z-50 flex size-12 items-center justify-center rounded-full shadow-lg backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-primary)] sm:hidden"
        style={{
          color: 'var(--color-background)',
          borderColor: 'var(--color-background)',
          borderWidth: 1,
          backgroundColor: 'var(--color-text-primary)',
          opacity: 0.9,
        }}
        aria-label={isMobileMenuOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={isMobileMenuOpen}
        aria-controls="mobile-navigation"
        onClick={() => setIsMobileMenuOpen((open) => !open)}
      >
        {isMobileMenuOpen ? (
          <X className="size-5" />
        ) : (
          <Menu className="size-5" />
        )}
      </button>

      {mounted && (
        <>
          {/* Backdrop */}
          <div
            className={cn(
              'fixed inset-0 z-40 backdrop-blur-sm transition-opacity duration-300 sm:hidden',
              visible
                ? 'pointer-events-auto opacity-100'
                : 'pointer-events-none opacity-0'
            )}
            style={{
              backgroundColor: 'rgba(var(--color-background-rgb), 0.6)',
            }}
            aria-hidden="true"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Slide-in mobile menu. role="dialog" + aria-modal mark it as a modal
              so AT does not roam the page behind the overlay while it is open. A
              native <dialog> can't be used here: it would be display:none when
              closed, breaking the slide transition. */}
          <nav
            id="mobile-navigation"
            className={cn(
              'fixed right-0 top-0 z-50 h-dvh w-72 border-l shadow-xl backdrop-blur transition-transform duration-300 ease-out sm:hidden',
              visible ? 'translate-x-0' : 'translate-x-full'
            )}
            style={{
              backgroundColor: 'rgba(var(--color-background-rgb), 0.95)',
              borderColor: 'var(--color-border-secondary)',
            }}
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a native <dialog> is display:none when closed and breaks the slide transition; role="dialog" is required so aria-modal is valid here
            // eslint-disable-next-line react-doctor/prefer-html-dialog, react-doctor/prefer-tag-over-role -- native <dialog> is display:none when closed, which breaks the slide-in transition; this is an intentional custom modal
            role="dialog"
            aria-hidden={!isMobileMenuOpen}
            aria-modal={isMobileMenuOpen || undefined}
            aria-label="Navigation menu"
          >
            <MobileSidebar
              pathname={pathname}
              onNavigate={(path) => {
                onNavigate(path);
                setIsMobileMenuOpen(false);
              }}
              onClose={() => setIsMobileMenuOpen(false)}
            />
          </nav>
        </>
      )}
    </>
  );
}
