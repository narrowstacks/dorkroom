import { ArrowRight, type LucideIcon } from 'lucide-react';
import type { ComponentProps, ElementType } from 'react';
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

export function ToolCard({
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
  const componentProps =
    Component === 'a' ? { href } : { to: href, ...props };

  return (
    <Component
      {...componentProps}
      aria-label={title}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-white/20',
        border,
        className
      )}
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
            'p-3 rounded-xl bg-zinc-800/50 ring-1 ring-white/5 group-hover:bg-white/10 transition-colors',
            color
          )}
        >
          <Icon className="h-6 w-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 group-hover:text-zinc-300">
              {category}
            </p>
            <ArrowRight className="h-3.5 w-3.5 text-zinc-600 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
          </div>
          <h3 className="font-semibold text-white truncate pr-4">{title}</h3>
          <p className="text-sm text-zinc-400 line-clamp-1 group-hover:text-zinc-300">
            {description}
          </p>
        </div>
      </div>
    </Component>
  );
}

