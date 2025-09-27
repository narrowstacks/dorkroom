import { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { colorMixOr } from '../../lib/color';

interface CalculatorPageHeaderProps {
  title: string;
  description: ReactNode;
  eyebrow?: string;
  align?: 'center' | 'start';
  children?: ReactNode;
}

/**
 * Renders a styled page header for calculator pages.
 *
 * Displays a required title and description, optionally showing an eyebrow label and action/content area.
 *
 * @param eyebrow - Optional small uppercase label rendered above the title when provided.
 * @param align - Layout alignment for header content: `'center'` centers content, `'start'` left-aligns it.
 * @param children - Optional elements (e.g., actions or controls) rendered in the header's action area.
 * @returns A header container element containing the title, description, optional eyebrow, and optional children.
 */
export function CalculatorPageHeader({
  title,
  description,
  eyebrow,
  align = 'center',
  children,
}: CalculatorPageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-3xl border px-6 py-6 shadow-subtle card-ring sm:px-10',
        align === 'center'
          ? 'items-center text-center'
          : 'items-start text-left'
      )}
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: colorMixOr('var(--color-surface)', 80, 'transparent', 'var(--color-border-muted)'),
      }}
    >
      <div className="flex max-w-2xl flex-col gap-3">
        {eyebrow && (
          <span
            className="text-xs font-semibold uppercase tracking-[0.35em]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {eyebrow}
          </span>
        )}
        <h1
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {title}
        </h1>
        <div
          className="text-base leading-relaxed"
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
