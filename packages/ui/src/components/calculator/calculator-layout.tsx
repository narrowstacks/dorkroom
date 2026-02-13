import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { CalculatorPageHeader } from './calculator-page-header';

export interface CalculatorLayoutProps {
  /** Main page title */
  title: string;
  /** Description text below the title */
  description: ReactNode;
  /** Optional children to render in the header (e.g., toggle buttons) */
  headerChildren?: ReactNode;
  /** Main content (inputs) */
  children: ReactNode;
  /** Results content rendered in the right column on desktop when provided */
  results?: ReactNode;
  /** Info cards rendered full-width below the main grid */
  sidebar?: ReactNode;
  /** Footer content that renders below everything (full width) */
  footer?: ReactNode;
  /** Additional className for the container */
  className?: string;
}

/**
 * Standard layout wrapper for calculator pages.
 * Provides consistent page structure with header and two-column grid.
 */
export function CalculatorLayout({
  title,
  description,
  headerChildren,
  children,
  results,
  sidebar,
  footer,
  className,
}: CalculatorLayoutProps) {
  return (
    <div
      className={cn(
        'mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 md:px-8 md:pt-12',
        className
      )}
    >
      <CalculatorPageHeader title={title} description={description}>
        {headerChildren}
      </CalculatorPageHeader>

      {results ? (
        <>
          <div className="mt-6 grid gap-4 md:mt-8 md:gap-5 md:grid-cols-2">
            <div className="space-y-4">{children}</div>
            <div className="space-y-4">{results}</div>
          </div>
          {sidebar && <div className="mt-4 space-y-4 md:mt-5">{sidebar}</div>}
        </>
      ) : (
        <div className="mt-6 grid gap-4 md:mt-8 md:gap-5 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="space-y-4">{children}</div>
          {sidebar && <div className="space-y-4">{sidebar}</div>}
        </div>
      )}

      {footer}
    </div>
  );
}
