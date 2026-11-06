import {
  type RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useBodyScrollLock } from '../hooks/use-body-scroll-lock';
import { useEscapeKey } from '../hooks/use-escape-key';
import { useModalLayer } from '../hooks/use-modal-layer';
import { cn } from '../lib/cn';

const sizeClasses = {
  sm: 'max-h-[40dvh] h-[40dvh]',
  md: 'max-h-[60dvh] h-[60dvh]',
  lg: 'max-h-[80dvh] h-[80dvh]',
};

const positionClasses = {
  bottom: 'bottom-0 left-0 right-0',
  top: 'top-0 left-0 right-0',
  left: 'left-0 top-0 bottom-0',
  right: 'right-0 top-0 bottom-0',
};

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  anchor?: 'bottom' | 'top' | 'left' | 'right';
  enableBackgroundBlur?: boolean;
  enableBackgroundOverlay?: boolean;
  className?: string;
  /**
   * Make the drawer a modal dialog: focus moves in, Tab stays inside, the page
   * behind is inert, and focus returns to the opener. Opt-in, because a
   * live-preview sheet (the border calculator's settings) must leave the
   * result behind it readable and announced.
   */
  modal?: boolean;
  /** Id of the element that names the dialog. Used only with `modal`. */
  ariaLabelledBy?: string;
  /** Where focus goes on open. Used only with `modal`. */
  initialFocus?: RefObject<HTMLElement | null>;
  /** Where focus goes on close, in place of the opener. Used only with `modal`. */
  returnFocus?: RefObject<HTMLElement | null>;
}

export function Drawer({
  isOpen,
  onClose,
  children,
  size = 'md',
  anchor = 'bottom',
  enableBackgroundBlur = false,
  enableBackgroundOverlay = true,
  className,
  modal = false,
  ariaLabelledBy,
  initialFocus,
  returnFocus,
}: DrawerProps) {
  // Consolidated transition state so updates flow through a single setter.
  const [transition, setTransition] = useState({
    showContent: false,
    animateOpen: false,
  });
  const { showContent, animateOpen } = transition;

  // Open/close transition steps live outside the effect so the effect body
  // doesn't accumulate multiple setState calls.
  const runOpenTransition = useCallback(() => {
    setTransition((prev) => ({ ...prev, showContent: true }));
    // Delay the open transform by one frame so the browser renders the
    // initial off-screen position first, enabling the slide-in transition.
    const frame = requestAnimationFrame(() => {
      setTransition((prev) => ({ ...prev, animateOpen: true }));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const runCloseTransition = useCallback(() => {
    setTransition((prev) => ({ ...prev, animateOpen: false }));
    // eslint-disable-next-line react-doctor/effect-needs-cleanup -- the timer handle is captured and released by the returned `() => clearTimeout(timer)` cleanup, which the effect below wires up; the analyzer can't trace the handle out through this useCallback return
    const timer = setTimeout(
      () => setTransition((prev) => ({ ...prev, showContent: false })),
      300
    );
    return () => clearTimeout(timer);
  }, []);

  // A layout effect, so the content mounts and `initialFocus` lands in the same
  // task as the tap: iOS only raises the keyboard for focus inside that task.
  useLayoutEffect(() => {
    // eslint-disable-next-line react-doctor/no-adjust-state-on-prop-change, react-doctor/no-derived-state -- the transition state is not derivable from isOpen: it is a timed animation sequence (rAF-delayed slide-in, 300ms slide-out before unmounting)
    return isOpen ? runOpenTransition() : runCloseTransition();
  }, [isOpen, runOpenTransition, runCloseTransition]);

  // Page scroll follows isOpen, not the slide-out: it unlocks as the close
  // animation starts. Counted, so a drawer over another overlay keeps the
  // page locked until both have closed.
  useBodyScrollLock(isOpen);
  useEscapeKey(isOpen, onClose);

  // Gated on showContent: the first open render mounts the panel with no
  // children, so there would be nothing yet to move focus to.
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useModalLayer<HTMLDivElement>(
    modal && isOpen && showContent,
    { keepInteractive: [backdropRef], initialFocus, returnFocus }
  );

  const transformClasses = {
    bottom: animateOpen ? 'translate-y-0' : 'translate-y-full',
    top: animateOpen ? 'translate-y-0' : '-translate-y-full',
    left: animateOpen ? 'translate-x-0' : '-translate-x-full',
    right: animateOpen ? 'translate-x-0' : 'translate-x-full',
  };

  // Do not render the overlay container at all when closed
  // and not animating, to avoid blocking interactions behind it.
  if (!isOpen && !showContent) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50" style={{ height: '100dvh' }}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: backdrop overlay dismiss pattern */}
      <div
        ref={backdropRef}
        className={cn(
          'modal-scrim absolute inset-0 transition-opacity duration-300 h-full',
          enableBackgroundBlur && 'backdrop-blur-sm',
          enableBackgroundOverlay &&
            'bg-[color:var(--color-visualization-overlay)]',
          animateOpen ? 'opacity-100' : 'opacity-0'
        )}
        style={{ height: '100dvh' }}
        role="presentation"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={panelRef}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a native <dialog> is display:none when closed and breaks the slide transition; role="dialog" is required so aria-modal is valid here
        // eslint-disable-next-line react-doctor/prefer-html-dialog, react-doctor/prefer-tag-over-role -- native <dialog> is display:none when closed, which breaks the slide-in transition; this is an intentional custom modal
        role={modal ? 'dialog' : undefined}
        // Modal only while open: during the slide-out it is no longer the
        // modal, and inert keeps the departing content out of reach.
        aria-modal={(modal && isOpen) || undefined}
        aria-labelledby={modal ? ariaLabelledBy : undefined}
        tabIndex={modal ? -1 : undefined}
        inert={(modal && !isOpen) || undefined}
        className={cn(
          'dialog-frame absolute border transition-transform duration-300 ease-out overflow-hidden',
          anchor === 'bottom' || anchor === 'top'
            ? `${sizeClasses[size]} rounded-t-xl`
            : 'w-80 h-full',
          positionClasses[anchor],
          transformClasses[anchor],
          className
        )}
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border-secondary)',
        }}
      >
        {showContent ? children : null}
      </div>
    </div>
  );
}

interface DrawerContentProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// eslint-disable-next-line react-doctor/no-multi-component-file -- compound-component sibling of Drawer; intentionally co-located in the same module
export function DrawerContent({
  children,
  className,
  style,
}: DrawerContentProps) {
  return (
    <div className={cn('h-full flex flex-col', className)} style={style}>
      {children}
    </div>
  );
}

interface DrawerBodyProps {
  children: React.ReactNode;
  className?: string;
}

// eslint-disable-next-line react-doctor/no-multi-component-file -- compound-component sibling of Drawer; intentionally co-located in the same module
export function DrawerBody({ children, className }: DrawerBodyProps) {
  return (
    <div className={cn('flex-1 overflow-y-auto', className)}>{children}</div>
  );
}
