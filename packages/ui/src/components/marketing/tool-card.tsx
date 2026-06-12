import { ArrowRight, type LucideIcon } from 'lucide-react';
import { type ComponentProps, type ElementType, memo } from 'react';
import { cn } from '../../lib/cn';

export type AccentColor =
  | 'indigo'
  | 'blue'
  | 'violet'
  | 'teal'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'emerald'
  | 'sky';

/**
 * Literal Tailwind class strings per accent. Tailwind must see the full class
 * string in source, so these are never built by interpolation. The CSS custom
 * properties resolve per-theme (see theme.css `--accent-*` variables).
 */
const ACCENT_CLASSES: Record<AccentColor, { text: string; border: string }> = {
  indigo: {
    text: 'text-[color:var(--accent-indigo-text)]',
    border: 'group-hover:border-[color:var(--accent-indigo-border)]',
  },
  blue: {
    text: 'text-[color:var(--accent-blue-text)]',
    border: 'group-hover:border-[color:var(--accent-blue-border)]',
  },
  violet: {
    text: 'text-[color:var(--accent-violet-text)]',
    border: 'group-hover:border-[color:var(--accent-violet-border)]',
  },
  teal: {
    text: 'text-[color:var(--accent-teal-text)]',
    border: 'group-hover:border-[color:var(--accent-teal-border)]',
  },
  amber: {
    text: 'text-[color:var(--accent-amber-text)]',
    border: 'group-hover:border-[color:var(--accent-amber-border)]',
  },
  rose: {
    text: 'text-[color:var(--accent-rose-text)]',
    border: 'group-hover:border-[color:var(--accent-rose-border)]',
  },
  cyan: {
    text: 'text-[color:var(--accent-cyan-text)]',
    border: 'group-hover:border-[color:var(--accent-cyan-border)]',
  },
  emerald: {
    text: 'text-[color:var(--accent-emerald-text)]',
    border: 'group-hover:border-[color:var(--accent-emerald-border)]',
  },
  sky: {
    text: 'text-[color:var(--accent-sky-text)]',
    border: 'group-hover:border-[color:var(--accent-sky-border)]',
  },
};

export interface ToolCardProps extends ComponentProps<'a'> {
  title: string;
  description: string;
  category: string;
  icon: LucideIcon;
  accent: AccentColor;
  href: string;
  as?: ElementType;
}

export const ToolCard = memo(function ToolCard({
  title,
  description,
  category,
  icon: Icon,
  accent,
  href,
  as: Component = 'a',
  className,
  ...props
}: ToolCardProps) {
  const accentClasses = ACCENT_CLASSES[accent];
  const componentProps = Component === 'a' ? { href } : { to: href, ...props };

  return (
    <Component
      {...componentProps}
      aria-label={title}
      className={cn(
        'group relative overflow-hidden rounded-2xl border p-5 transition-all focus-visible:outline-none focus-visible:ring-2',
        'border-[color:var(--color-border-primary)]',
        'hover:bg-[color:var(--color-surface-muted)]',
        'focus-visible:ring-[color:var(--color-border-primary)]',
        '[&:not([data-theme="high-contrast"])]:hover:-translate-y-0.5',
        '[&:not([data-theme="high-contrast"])]:hover:shadow-lg',
        accentClasses.border,
        className
      )}
      style={{
        backgroundColor: 'var(--color-tool-card-bg)',
      }}
    >
      <div
        className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ backgroundImage: `var(--accent-${accent}-gradient)` }}
      />

      <div className="relative z-10 flex items-start gap-4">
        <div
          className={cn(
            'p-3 rounded-xl transition-colors',
            'bg-[var(--color-tool-card-icon-bg)]',
            'ring-1 ring-[color:var(--color-tool-card-icon-ring)]',
            'group-hover:bg-[var(--color-tool-card-icon-hover)]',
            accentClasses.text
          )}
        >
          <Icon className="size-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-tool-card-category)] group-hover:text-[color:var(--color-tool-card-category-hover)]">
              {category}
            </p>
            <ArrowRight className="size-3.5 text-[color:var(--color-tool-card-arrow)] opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
          </div>
          <h3 className="font-semibold text-[color:var(--color-tool-card-title)] truncate pr-4">
            {title}
          </h3>
          <p className="text-sm text-[color:var(--color-tool-card-description)] line-clamp-1 group-hover:text-[color:var(--color-tool-card-description-hover)]">
            {description}
          </p>
        </div>
      </div>
    </Component>
  );
});
