import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface CalculatorPageHeaderProps {
  title: string;
  description: ReactNode;
  eyebrow?: string;
  align?: 'center' | 'start';
  children?: ReactNode;
}

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
        'flex flex-col gap-4 rounded-3xl border border-white/10 bg-surface/80 px-6 py-6 shadow-subtle card-ring sm:px-10',
        align === 'center' ? 'items-center text-center' : 'items-start text-left'
      )}
    >
      <div className="flex max-w-2xl flex-col gap-3">
        {eyebrow && (
          <span className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
            {eyebrow}
          </span>
        )}
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        <div className="text-base leading-relaxed text-zinc-300">{description}</div>
      </div>
      {children && <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">{children}</div>}
    </div>
  );
}