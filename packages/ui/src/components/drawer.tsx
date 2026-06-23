import { useCallback, useEffect, useState } from 'react';
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
    document.body.style.overflow = 'hidden';
    return () => cancelAnimationFrame(frame);
  }, []);

  const runCloseTransition = useCallback(() => {
    setTransition((prev) => ({ ...prev, animateOpen: false }));
    const timer = setTimeout(
      () => setTransition((prev) => ({ ...prev, showContent: false })),
      300
    );
    document.body.style.overflow = 'unset';
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-doctor/no-adjust-state-on-prop-change, react-doctor/no-derived-state -- the transition state is not derivable from isOpen: it is a timed animation sequence (rAF-delayed slide-in, 300ms slide-out before unmounting) that also locks body scroll
    return isOpen ? runOpenTransition() : runCloseTransition();
  }, [isOpen, runOpenTransition, runCloseTransition]);

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
        className={cn(
          'absolute inset-0 transition-opacity duration-300 h-full',
          enableBackgroundBlur && 'backdrop-blur-sm',
          enableBackgroundOverlay && 'bg-black/50',
          animateOpen ? 'opacity-100' : 'opacity-0'
        )}
        style={{ height: '100dvh' }}
        role="presentation"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      />

      {/* Drawer */}
      <div
        className={cn(
          'absolute border transition-transform duration-300 ease-out overflow-hidden',
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

// eslint-disable-next-line react-doctor/no-multi-comp -- compound-component sibling of Drawer; intentionally co-located in the same module
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

// eslint-disable-next-line react-doctor/no-multi-comp -- compound-component sibling of Drawer; intentionally co-located in the same module
export function DrawerBody({ children, className }: DrawerBodyProps) {
  return (
    <div className={cn('flex-1 overflow-y-auto', className)}>{children}</div>
  );
}
