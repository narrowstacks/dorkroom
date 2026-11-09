import { Info, Share2 } from 'lucide-react';
import { type ComponentType, type ReactNode, useId, useState } from 'react';
import { cn } from '../../lib/cn';
import { commitFocusedField } from '../../lib/commit-focused-field';
import type { AccentTone } from './accent-tone';
import { CalculatorResetButton } from './calculator-reset-button';
import { HEADER_ACTION_CLASS } from './header-action';

export interface PageTitleBarProps {
  /** The page's `h1`. A page renders exactly one title bar. */
  title: string;
  /**
   * Longer copy about the tool. Collapsed behind an info button; with none,
   * no info button renders.
   */
  description?: ReactNode;
  /**
   * Short caption shown after the title from `sm` up (e.g. a mode label).
   * Dropped on phones, where the row has no room for it.
   */
  eyebrow?: ReactNode;
  /** Tool icon (same component as home/nav), shown in an accent tile. */
  icon?: ComponentType<{ className?: string }>;
  /** Accent identity for the icon tile (see theme.css `--accent-*`). */
  accentTone?: AccentTone;
  /** Renders the shared "Reset to defaults" control at the end of the row. */
  onReset?: () => void;
  /**
   * Renders a "Share" control before Reset. The page builds the link and runs
   * the share flow; a half-typed field is committed first.
   */
  onShare?: () => void;
  /** Disables Share, e.g. while a field is invalid. */
  shareDisabled?: boolean;
  className?: string;
}

/**
 * The page title row: accent tile, `h1`, an info toggle for the description,
 * and the Share/Reset actions. `CalculatorPageHeader` renders it on its own
 * (the default); a page whose first card is the natural home for the title
 * renders it as that card's first child instead.
 */
export function PageTitleBar({
  title,
  description,
  eyebrow,
  icon: Icon,
  accentTone,
  onReset,
  onShare,
  shareDisabled = false,
  className,
}: PageTitleBarProps) {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const aboutId = useId();
  const hasDescription = description !== undefined && description !== null;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex min-h-[2.125rem] items-center gap-2.5">
        {Icon && (
          <div
            className="flex size-7 shrink-0 items-center justify-center rounded-lg border"
            style={{
              background: accentTone
                ? `var(--accent-${accentTone}-gradient)`
                : undefined,
              borderColor: accentTone
                ? `var(--accent-${accentTone}-border, var(--color-border-secondary))`
                : 'var(--color-border-secondary)',
              // The icon inherits this via currentColor. The on-accent token
              // keeps the glyph readable on the tinted tile; fall back to
              // primary text when no tone is set.
              color: accentTone
                ? 'var(--color-on-accent)'
                : 'var(--color-text-primary)',
            }}
          >
            <Icon className="size-4" />
          </div>
        )}
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="min-w-0 text-lg font-semibold leading-tight tracking-tight text-[color:var(--color-text-primary)]">
            {title}
          </h1>
          {eyebrow && (
            <span className="hidden shrink-0 border-l border-[color:var(--color-border-secondary)] pl-2 text-xs text-[color:var(--color-text-secondary)] sm:inline">
              {eyebrow}
            </span>
          )}
          {hasDescription && (
            <button
              type="button"
              onClick={() => setIsAboutOpen((open) => !open)}
              aria-expanded={isAboutOpen}
              aria-controls={aboutId}
              aria-label={`About ${title}`}
              title={`About ${title}`}
              className={cn(
                'inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-transparent transition-colors',
                'text-[color:var(--color-text-secondary)] hover:bg-[rgba(var(--color-background-rgb),0.08)] hover:text-[color:var(--color-text-primary)]',
                // The open state reads from the border and text, never from
                // motion, so it holds in the themes that kill transitions.
                'aria-expanded:border-[color:var(--color-border-secondary)] aria-expanded:text-[color:var(--color-text-primary)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]'
              )}
            >
              <Info className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
        {(onShare || onReset) && (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {onShare && (
              <button
                type="button"
                onClick={() => {
                  commitFocusedField();
                  onShare();
                }}
                disabled={shareDisabled}
                aria-label="Share this calculation"
                title={
                  shareDisabled
                    ? 'Fix the highlighted fields to share this calculation'
                    : 'Share this calculation'
                }
                className={HEADER_ACTION_CLASS}
              >
                <Share2 className="size-4" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Share</span>
              </button>
            )}
            {onReset && <CalculatorResetButton onReset={onReset} />}
          </div>
        )}
      </div>
      {hasDescription && (
        <div
          id={aboutId}
          hidden={!isAboutOpen}
          className={cn(
            'max-w-2xl text-xs leading-relaxed text-[color:var(--color-text-secondary)]',
            // Lines the copy up under the title, past the icon tile.
            Icon && 'sm:pl-[2.375rem]'
          )}
        >
          {description}
        </div>
      )}
    </div>
  );
}
