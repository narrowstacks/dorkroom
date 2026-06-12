import { cn } from '../../lib/cn';

export function Greeting({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-1', className)}>
      <h1
        className="text-5xl font-semibold tracking-tight md:text-6xl lg:text-7xl"
        style={{ fontFamily: 'var(--font-family-display)' }}
      >
        <span
          className="grainy-text-glow grainy-red-glow"
          data-text="Dorkroom.art"
        >
          Dorkroom.art
        </span>
      </h1>
    </div>
  );
}
