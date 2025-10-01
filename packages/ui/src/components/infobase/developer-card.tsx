import { Developer } from '@dorkroom/api';
import { Beaker, Package } from 'lucide-react';
import { cn } from '../../lib/cn';

interface DeveloperCardProps {
  developer: Developer | null | undefined;
  className?: string;
}

export function DeveloperCard({ developer, className }: DeveloperCardProps) {
  if (!developer) {
    return (
      <div
        className={cn('rounded-lg p-4', className)}
        style={{
          backgroundColor: 'var(--color-surface)',
          borderWidth: 1,
          borderColor: 'var(--color-border-secondary)',
        }}
      >
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Developer data not found.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn('space-y-4 rounded-lg p-6', className)}
      style={{
        backgroundColor: 'var(--color-surface)',
        borderWidth: 1,
        borderColor: 'var(--color-border-secondary)',
      }}
    >
      <div className="space-y-2">
        <h3
          className="text-lg font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {developer.manufacturer} {developer.name}
        </h3>
        {developer.description && (
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {developer.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div
            className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <Package className="h-3.5 w-3.5" />
            Type
          </div>
          <div
            className="text-base font-semibold capitalize"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {developer.type}
          </div>
        </div>

        <div>
          <div
            className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <Beaker className="h-3.5 w-3.5" />
            Use
          </div>
          <div
            className="text-base font-semibold capitalize"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {developer.filmOrPaper ? 'Film & Paper' : 'Film'}
          </div>
        </div>
      </div>

      {developer.dilutions && developer.dilutions.length > 0 && (
        <div>
          <div
            className="mb-2 text-xs font-medium uppercase tracking-wide"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Available Dilutions
          </div>
          <div className="flex flex-wrap gap-2">
            {developer.dilutions.map((dilution) => (
              <span
                key={dilution.id}
                className="rounded-full px-3 py-1 text-sm font-medium"
                style={{
                  backgroundColor: 'rgba(var(--color-background-rgb), 0.05)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {dilution.name} ({dilution.dilution})
              </span>
            ))}
          </div>
        </div>
      )}

      {developer.mixingInstructions && (
        <div>
          <div
            className="mb-2 text-xs font-medium uppercase tracking-wide"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Mixing Instructions
          </div>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {developer.mixingInstructions}
          </p>
        </div>
      )}

      {developer.storageRequirements && (
        <div>
          <div
            className="mb-2 text-xs font-medium uppercase tracking-wide"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Storage Requirements
          </div>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {developer.storageRequirements}
          </p>
        </div>
      )}

      {developer.safetyNotes && (
        <div
          className="rounded-lg px-4 py-3"
          style={{
            backgroundColor: 'rgba(var(--color-background-rgb), 0.05)',
            borderWidth: 1,
            borderColor: 'var(--color-border-secondary)',
          }}
        >
          <div
            className="mb-1 text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            ⚠️ Safety Notes
          </div>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {developer.safetyNotes}
          </p>
        </div>
      )}
    </div>
  );
}
