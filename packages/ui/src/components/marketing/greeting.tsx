import { cn } from '../../lib/cn';

export function Greeting({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-1', className)}>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
          Dorkroom.art
        </span>
      </h1>
    </div>
  );
}

