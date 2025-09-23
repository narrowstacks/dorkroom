import { useState, useEffect } from 'react';
import { cn } from '../lib/cn';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  anchor?: 'bottom' | 'top' | 'left' | 'right';
}

export function Drawer({
  isOpen,
  onClose,
  children,
  size = 'md',
  anchor = 'bottom',
}: DrawerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isVisible) return null;

  const sizeClasses = {
    sm: 'max-h-[40vh]',
    md: 'max-h-[60vh]',
    lg: 'max-h-[80vh]',
  };

  const transformClasses = {
    bottom: isOpen ? 'translate-y-0' : 'translate-y-full',
    top: isOpen ? 'translate-y-0' : '-translate-y-full',
    left: isOpen ? 'translate-x-0' : '-translate-x-full',
    right: isOpen ? 'translate-x-0' : 'translate-x-full',
  };

  const positionClasses = {
    bottom: 'bottom-0 left-0 right-0',
    top: 'top-0 left-0 right-0',
    left: 'left-0 top-0 bottom-0',
    right: 'right-0 top-0 bottom-0',
  };

  const isBottomAnchor = anchor === 'bottom';

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'absolute bg-zinc-900 border border-white/10 transition-transform duration-300 ease-out',
          anchor === 'bottom' || anchor === 'top'
            ? `${sizeClasses[size]} rounded-t-xl`
            : 'w-80 h-full',
          positionClasses[anchor],
          transformClasses[anchor],
          'relative overflow-hidden'
        )}
      >
        {isBottomAnchor && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-transparent via-black/40 to-black/70 backdrop-blur-sm" />
        )}
        <div className="relative z-10 h-full">
        {children}
        </div>
      </div>
    </div>
  );
}

interface DrawerContentProps {
  children: React.ReactNode;
  className?: string;
}

export function DrawerContent({ children, className }: DrawerContentProps) {
  return (
    <div className={cn('h-full flex flex-col', className)}>{children}</div>
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
