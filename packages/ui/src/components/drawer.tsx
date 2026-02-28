import { useEffect, useState } from 'react';
import { cn } from '../lib/cn';

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
  const [showContent, setShowContent] = useState(false);
  const [animateOpen, setAnimateOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowContent(true);
      // Delay the open transform by one frame so the browser renders
      // the initial off-screen position first, enabling the slide-in transition.
      const frame = requestAnimationFrame(() => {
        setAnimateOpen(true);
      });
      document.body.style.overflow = 'hidden';
      return () => cancelAnimationFrame(frame);
    }
    setAnimateOpen(false);
    const timer = setTimeout(() => setShowContent(false), 300);
    document.body.style.overflow = 'unset';
    return () => clearTimeout(timer);
  }, [isOpen]);

  const sizeClasses = {
    sm: 'max-h-[40dvh] h-[40dvh]',
    md: 'max-h-[60dvh] h-[60dvh]',
    lg: 'max-h-[80dvh] h-[80dvh]',
  };

  const transformClasses = {
    bottom: animateOpen ? 'translate-y-0' : 'translate-y-full',
    top: animateOpen ? 'translate-y-0' : '-translate-y-full',
    left: animateOpen ? 'translate-x-0' : '-translate-x-full',
    right: animateOpen ? 'translate-x-0' : 'translate-x-full',
  };

  const positionClasses = {
    bottom: 'bottom-0 left-0 right-0',
    top: 'top-0 left-0 right-0',
    left: 'left-0 top-0 bottom-0',
    right: 'right-0 top-0 bottom-0',
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

export function DrawerBody({ children, className }: DrawerBodyProps) {
  return (
    <div className={cn('flex-1 overflow-y-auto', className)}>{children}</div>
  );
}
