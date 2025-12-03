import { useState } from 'react';
import { cn } from '../lib/cn';

export interface TooltipProps {
  label: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
  className?: string;
}

export function Tooltip({
  label,
  children,
  position = 'bottom',
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onMouseDown={() => setIsVisible(false)}
    >
      {children}
      <div
        className={cn(
          'pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium shadow-lg transition-all duration-150',
          position === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2',
          isVisible
            ? 'visible translate-y-0 opacity-100'
            : 'invisible translate-y-1 opacity-0'
        )}
        style={{
          backgroundColor: 'var(--color-text-primary)',
          color: 'var(--color-background)',
        }}
        role="tooltip"
      >
        {label}
        <div
          className={cn(
            'absolute left-1/2 -translate-x-1/2 border-[6px] border-transparent',
            position === 'bottom'
              ? 'bottom-full border-b-[color:var(--color-text-primary)]'
              : 'top-full border-t-[color:var(--color-text-primary)]'
          )}
        />
      </div>
    </div>
  );
}
