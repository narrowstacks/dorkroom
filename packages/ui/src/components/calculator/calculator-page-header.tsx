import { Share2 } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { colorMixOr } from '../../lib/color';
import { commitFocusedField } from '../../lib/commit-focused-field';
import type { AccentTone } from './accent-tone';
import { CalculatorResetButton } from './calculator-reset-button';
import { HEADER_ACTION_CLASS } from './header-action';

interface CalculatorPageHeaderProps {
  title: string;
  description: ReactNode;
  /** Optional short caption rendered above the title (e.g. a mode label). */
  eyebrow?: ReactNode;
  /**
   * Tool icon (same component as home/nav). When provided, the header renders
   * left-aligned with the icon in an accent-tinted tile.
   */
  icon?: ComponentType<{ className?: string }>;
  /** Accent identity for the icon tile (see theme.css `--accent-*`). */
  accentTone?: AccentTone;
  align?: 'center' | 'start';
  /**
   * When provided, renders the shared "Reset to defaults" control at the end
   * of the title row. Pages that persist their inputs pass this.
   */
  onReset?: () => void;
  /**
   * When provided, renders a "Share" control before Reset that hands the
   * current inputs on as a link. The page builds the link and runs the share
   * flow; a half-typed field is committed first.
   */
  onShare?: () => void;
  /**
   * Disables the Share control, e.g. while a field is invalid: a link would
   * drop that field and open a different calculation.
   */
  shareDisabled?: boolean;
  children?: ReactNode;
}

export function CalculatorPageHeader({
  title,
  description,
  eyebrow,
  icon: Icon,
  accentTone,
  align = 'center',
  onReset,
  onShare,
  shareDisabled = false,
  children,
}: CalculatorPageHeaderProps) {
  // An icon anchors the header to the left regardless of the align default.
  const alignStart = align === 'start' || Boolean(Icon);

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-xl border px-4 py-3 shadow-subtle card-ring sm:px-6 sm:py-4',
        alignStart ? 'items-start text-left' : 'items-center text-center'
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
      <div
        // Above the card's `.card-ring::before` overlay, which otherwise sits
        // on top of the header and swallows clicks on the reset button.
        className={cn(
          'relative z-10 flex w-full gap-4',
          Icon ? 'items-center' : 'flex-col',
          !Icon && (alignStart ? 'items-start' : 'items-center')
        )}
      >
        {Icon && (
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border"
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
            <Icon className="size-5" />
          </div>
        )}
        <div className="flex max-w-2xl flex-col gap-1">
          {eyebrow && (
            <span
              className="text-xs font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {eyebrow}
            </span>
          )}
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
        {(onShare || onReset) && (
          <div
            className={cn(
              'ml-auto flex shrink-0 items-center gap-2',
              Icon && 'self-start'
            )}
          >
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
      {children && (
        <div
          className={cn(
            'relative z-10 flex w-full flex-col gap-3 sm:flex-row',
            alignStart ? 'sm:justify-start' : 'items-center sm:justify-center'
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
