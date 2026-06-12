import type { ComponentType, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { colorMixOr } from '../../lib/color';
import type { AccentTone } from './accent-tone';

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
  children?: ReactNode;
}

export function CalculatorPageHeader({
  title,
  description,
  eyebrow,
  icon: Icon,
  accentTone,
  align = 'center',
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
        className={cn(
          'flex w-full gap-4',
          Icon ? 'items-center' : 'flex-col',
          !Icon && (alignStart ? 'items-start' : 'items-center')
        )}
      >
        {Icon && (
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
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
            <Icon className="h-5 w-5" />
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
      </div>
      {children && (
        <div
          className={cn(
            'flex w-full flex-col gap-3 sm:flex-row',
            alignStart ? 'sm:justify-start' : 'items-center sm:justify-center'
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
