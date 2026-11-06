import type { ComponentPropsWithoutRef, FC } from 'react';
import { cn } from '../../lib/cn';

/**
 * The solid, bordered surface a results list sits on, so the page gradient
 * never shows behind it. A scroller marked `data-results-scroll` gets its focus
 * indicator here: inside the frame, a sticky header and row backgrounds would
 * paint over an outline (#604).
 */
export const ResultsFrame: FC<ComponentPropsWithoutRef<'div'>> = ({
  children,
  className,
  ...props
}) => (
  <div
    {...props}
    className={cn(
      'rounded-2xl border border-[color:var(--color-border-secondary)] bg-[color:var(--color-surface)] has-[[data-results-scroll]:focus-visible]:outline-2 has-[[data-results-scroll]:focus-visible]:outline-offset-2 has-[[data-results-scroll]:focus-visible]:outline-[color:var(--color-focus-ring)]',
      className
    )}
  >
    <div className="overflow-hidden rounded-2xl">{children}</div>
  </div>
);
