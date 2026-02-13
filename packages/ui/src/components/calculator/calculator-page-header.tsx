import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { colorMixOr } from '../../lib/color';

interface CalculatorPageHeaderProps {
  title: string;
  description: ReactNode;
  align?: 'center' | 'start';
  children?: ReactNode;
}

export function CalculatorPageHeader({
  title,
  description,
  align = 'center',
  children,
}: CalculatorPageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-xl border px-4 py-3 shadow-subtle card-ring sm:px-6 sm:py-4',
        align === 'center'
          ? 'items-center text-center'
          : 'items-start text-left'
      )}
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: colorMixOr(
          'var(--color-surface)',
          80,
          'transparent',
          'var(--color-border-muted)'
        ),
      }}
    >
      <div className="flex max-w-2xl flex-col gap-1">
        <h1
          className="text-xl font-semibold tracking-tight sm:text-2xl"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {title}
        </h1>
        <div
          className="text-xs leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {description}
        </div>
      </div>
      {children && (
        <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
