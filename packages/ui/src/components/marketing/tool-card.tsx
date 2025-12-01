import { ArrowRight, type LucideIcon } from 'lucide-react';
import { type ComponentProps, type ElementType, memo } from 'react';
import { cn } from '../../lib/cn';

export interface ToolCardProps extends ComponentProps<'a'> {
  title: string;
  description: string;
  category: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
  href: string;
  as?: ElementType;
}

export const ToolCard = memo(function ToolCard({
  title,
  description,
  category,
  icon: Icon,
  color,
  bg,
  border,
  href,
  as: Component = 'a',
  className,
  ...props
}: ToolCardProps) {
  const componentProps = Component === 'a' ? { href } : { to: href, ...props };

  return (
    <Component
      {...componentProps}
      aria-label={title}
      className={cn(
        'group relative overflow-hidden rounded-2xl border p-5 transition-all focus:outline-none focus:ring-2',
        'border-[color:var(--color-border-primary)]',
        'hover:bg-[color:var(--color-surface-muted)]',
        'focus:ring-[color:var(--color-border-primary)]',
        '[&:not([data-theme="high-contrast"])]:hover:-translate-y-0.5',
        '[&:not([data-theme="high-contrast"])]:hover:shadow-lg',
        border,
        className
      )}
      style={{
        backgroundColor: 'var(--color-tool-card-bg)',
      }}
    >
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100',
          bg
        )}
      />

      <div className="relative z-10 flex items-start gap-4">
        <div
          className={cn(
            'p-3 rounded-xl transition-colors',
            'bg-[var(--color-tool-card-icon-bg)]',
            'ring-1 ring-[color:var(--color-tool-card-icon-ring)]',
            'group-hover:bg-[var(--color-tool-card-icon-hover)]',
            color
          )}
        >
          <Icon className="h-6 w-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-tool-card-category)] group-hover:text-[color:var(--color-tool-card-category-hover)]">
              {category}
            </p>
            <ArrowRight className="h-3.5 w-3.5 text-[color:var(--color-tool-card-arrow)] opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
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
