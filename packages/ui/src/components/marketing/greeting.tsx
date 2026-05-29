import { cn } from '../../lib/cn';

export function Greeting({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-1', className)}>
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">
        <span className="text-[color:var(--color-text-primary)]">
          Dorkroom.art
        </span>
      </h1>
    </div>
  );
}
