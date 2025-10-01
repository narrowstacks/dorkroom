import { Film } from '@dorkroom/api';
import { Camera, Gauge } from 'lucide-react';
import { cn } from '../../lib/cn';

interface FilmCardProps {
  film: Film | null | undefined;
  className?: string;
}

export function FilmCard({ film, className }: FilmCardProps) {
  if (!film) {
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
          Film data not found.
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
          {film.brand} {film.name}
        </h3>
        {film.description && (
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {film.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <div
            className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <Gauge className="h-3.5 w-3.5" />
            ISO Speed
          </div>
          <div
            className="text-base font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {film.isoSpeed}
          </div>
        </div>

        <div>
          <div
            className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <Camera className="h-3.5 w-3.5" />
            Type
          </div>
          <div
            className="text-base font-semibold capitalize"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {film.colorType}
          </div>
        </div>

        {film.grainStructure && (
          <div>
            <div
              className="mb-1 text-xs font-medium uppercase tracking-wide"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Grain
            </div>
            <div
              className="text-base font-semibold capitalize"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {film.grainStructure}
            </div>
          </div>
        )}
      </div>

      {Array.isArray(film.manufacturerNotes) &&
        film.manufacturerNotes.length > 0 && (
          <div>
            <div
              className="mb-2 text-xs font-medium uppercase tracking-wide"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Manufacturer Notes
            </div>
            <ul className="space-y-1 text-sm">
              {film.manufacturerNotes.map((note, index) => (
                <li key={index} style={{ color: 'var(--color-text-secondary)' }}>
                  • {note}
                </li>
              ))}
            </ul>
          </div>
        )}

      {film.reciprocityFailure && (
        <div>
          <div
            className="mb-2 text-xs font-medium uppercase tracking-wide"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Reciprocity Failure
          </div>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {film.reciprocityFailure}
          </p>
        </div>
      )}

      {film.staticImageUrl && (
        <div>
          <img
            src={film.staticImageUrl}
            alt={`${film.brand} ${film.name}`}
            loading="lazy"
            className="w-full rounded-lg"
            style={{
              borderWidth: 1,
              borderColor: 'var(--color-border-secondary)',
            }}
          />
        </div>
      )}

      {film.discontinued && (
        <div
          className="rounded-lg px-3 py-2 text-sm font-medium"
          style={{
            backgroundColor: 'rgba(var(--color-background-rgb), 0.05)',
            color: 'var(--color-text-secondary)',
          }}
        >
          ⚠️ This film has been discontinued
        </div>
      )}
    </div>
  );
}
