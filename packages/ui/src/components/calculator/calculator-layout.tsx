import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { CalculatorPageHeader } from './calculator-page-header';

export interface CalculatorLayoutProps {
  /** Eyebrow text displayed above the title */
  eyebrow: string;
  /** Main page title */
  title: string;
  /** Description text below the title */
  description: ReactNode;
  /** Optional children to render in the header (e.g., toggle buttons) */
  headerChildren?: ReactNode;
  /** Main content for the left column (inputs + results) */
  children: ReactNode;
  /** Sidebar content for the right column (info cards) */
  sidebar?: ReactNode;
  /** Footer content that renders below the two-column grid (full width) */
  footer?: ReactNode;
  /** Additional className for the container */
  className?: string;
}

/**
 * Standard layout wrapper for calculator pages.
 * Provides consistent page structure with header and two-column grid.
 */
export function CalculatorLayout({
  eyebrow,
  title,
  description,
  headerChildren,
  children,
  sidebar,
  footer,
  className,
}: CalculatorLayoutProps) {
  return (
    <div
      className={cn('mx-auto max-w-6xl px-6 pb-16 pt-12 sm:px-10', className)}
    >
      <CalculatorPageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
      >
        {headerChildren}
      </CalculatorPageHeader>

      <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="space-y-6">{children}</div>
        {sidebar && <div className="space-y-6">{sidebar}</div>}
      </div>

      {footer}
    </div>
  );
}
