import { cn } from '../../lib/cn';

export function Greeting({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-1', className)}>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
        <span
          className="text-[color:var(--color-text-primary)]"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--color-primary), var(--color-secondary))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
          data-theme-gradient="true"
        >
          Dorkroom.art
        </span>
      </h1>
    </div>
  );
}
