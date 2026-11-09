import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { PageTitleBar, type PageTitleBarProps } from './page-title-bar';

export interface CalculatorPageHeaderProps extends PageTitleBarProps {
  /** An extra row under the title (e.g. mode toggles). */
  children?: ReactNode;
}

/**
 * The default tool-page header: an unframed title bar (accent tile, `h1`,
 * info toggle for the description, Share/Reset) above the first card. Pages
 * that put the title in their first card render `PageTitleBar` there instead.
 * The caller owns the gap to the content below (`mt-4`).
 */
export function CalculatorPageHeader({
  children,
  className,
  ...titleProps
}: CalculatorPageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <PageTitleBar {...titleProps} />
      {children && (
        <div className="flex w-full flex-col gap-3 sm:flex-row">{children}</div>
      )}
    </div>
  );
}
