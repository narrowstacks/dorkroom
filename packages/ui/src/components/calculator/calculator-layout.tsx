import type { ComponentType, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import type { AccentTone } from './accent-tone';
import { CalculatorPageHeader } from './calculator-page-header';

interface CalculatorLayoutContentProps {
  /** Main content (inputs) */
  children: ReactNode;
  /** Results content rendered in the right column on desktop when provided */
  results?: ReactNode;
  /** Full-width content between the main grid and the info cards */
  wide?: ReactNode;
  /** Info cards rendered full-width below the main grid */
  sidebar?: ReactNode;
  /** Footer content that renders below everything (full width) */
  footer?: ReactNode;
  /** Additional className for the container */
  className?: string;
}

interface CalculatorLayoutHeaderProps {
  /** Default: the layout renders the title bar above the grid. */
  titleInCard?: false;
  /** Main page title */
  title: string;
  /** About-the-tool copy, collapsed behind the header's info button */
  description: ReactNode;
  /** Tool icon for the accent-tinted header tile (same icon as home/nav). */
  icon?: ComponentType<{ className?: string }>;
  /** Per-calculator accent identity (see theme.css `--accent-*`). */
  accentTone?: AccentTone;
  /**
   * Restores the calculator's defaults. When provided, the header shows the
   * shared "Reset to defaults" control.
   */
  onReset?: () => void;
  /**
   * Shares the current inputs as a link. When provided, the header shows the
   * shared "Share" control next to Reset.
   */
  onShare?: () => void;
  /** Disables the Share control while the inputs can't make a valid link. */
  shareDisabled?: boolean;
  /** Optional children to render in the header (e.g., toggle buttons) */
  headerChildren?: ReactNode;
}

interface CalculatorLayoutCardTitleProps {
  /**
   * The page renders `PageTitleBar` as the first child of its first card, so
   * the layout renders no header of its own. Title, icon and actions go on
   * that `PageTitleBar`.
   */
  titleInCard: true;
}

export type CalculatorLayoutProps = CalculatorLayoutContentProps &
  (CalculatorLayoutHeaderProps | CalculatorLayoutCardTitleProps);

/**
 * Standard layout wrapper for calculator pages.
 * Provides consistent page structure with header and two-column grid.
 */
export function CalculatorLayout(props: CalculatorLayoutProps) {
  const { children, results, wide, sidebar, footer, className } = props;
  // With no header above it, the grid starts flush with the page padding.
  const gridTop = props.titleInCard ? '' : 'mt-4';

  return (
    <div
      className={cn(
        'mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 md:px-8 md:pt-12',
        className
      )}
    >
      {!props.titleInCard && (
        <CalculatorPageHeader
          title={props.title}
          description={props.description}
          icon={props.icon}
          accentTone={props.accentTone}
          onReset={props.onReset}
          onShare={props.onShare}
          shareDisabled={props.shareDisabled}
        >
          {props.headerChildren}
        </CalculatorPageHeader>
      )}

      {results ? (
        <>
          <div
            className={cn(
              'grid gap-4 md:gap-5 md:grid-cols-2 md:items-start',
              gridTop
            )}
          >
            <div className="space-y-4">{children}</div>
            <div className="space-y-4 md:sticky md:top-4 md:self-start lg:top-20">
              {results}
            </div>
          </div>
          {wide && <div className="mt-4 md:mt-5">{wide}</div>}
          {sidebar && <div className="mt-4 space-y-4 md:mt-5">{sidebar}</div>}
        </>
      ) : (
        <div
          className={cn(
            'grid gap-4 md:gap-5 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]',
            gridTop
          )}
        >
          <div className="space-y-4">{children}</div>
          {sidebar && <div className="space-y-4">{sidebar}</div>}
        </div>
      )}

      {wide && !results && <div className="mt-4 md:mt-5">{wide}</div>}

      {footer}
    </div>
  );
}
