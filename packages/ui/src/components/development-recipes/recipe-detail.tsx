import { ExternalLink, Edit2, Trash2 } from 'lucide-react';
import type { DevelopmentCombinationView } from './results-table';
import { Tag } from '../ui/tag';

interface DevelopmentRecipeDetailProps {
  view: DevelopmentCombinationView;
  onEditCustomRecipe?: (view: DevelopmentCombinationView) => void;
  onDeleteCustomRecipe?: (view: DevelopmentCombinationView) => void;
}

const formatTemperature = (
  combination: DevelopmentCombinationView['combination']
) => {
  const fahrenheit = Number.isFinite(combination.temperatureF)
    ? combination.temperatureF
    : null;
  const celsius = Number.isFinite(combination.temperatureC ?? NaN)
    ? combination.temperatureC ?? null
    : fahrenheit !== null
    ? ((fahrenheit - 32) * 5) / 9
    : null;

  if (fahrenheit !== null && celsius !== null) {
    return `${fahrenheit.toFixed(1)}°F (${celsius.toFixed(1)}°C)`;
  }

  if (fahrenheit !== null) {
    return `${fahrenheit.toFixed(1)}°F`;
  }

  if (celsius !== null) {
    return `${celsius.toFixed(1)}°C`;
  }

  return '—';
};

const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex justify-between gap-6 text-sm">
    <span style={{ color: 'var(--color-text-tertiary)' }}>{label}</span>
    <span className="text-right" style={{ color: 'var(--color-text-primary)' }}>
      {value}
    </span>
  </div>
);

export function DevelopmentRecipeDetail({
  view,
  onEditCustomRecipe,
  onDeleteCustomRecipe,
}: DevelopmentRecipeDetailProps) {
  const { combination, film, developer } = view;

  return (
    <div className="space-y-5 text-sm">
      <div
        className="rounded-xl border p-4"
        style={{
          borderColor: 'var(--color-border-secondary)',
          backgroundColor: 'var(--color-border-muted)',
        }}
      >
        <div
          className="text-xs uppercase tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Film
        </div>
        <div
          className="mt-1 text-base font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {film ? `${film.brand} ${film.name}` : 'Unknown film'}
        </div>
        {film?.description && (
          <p
            className="mt-2 text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {film.description}
          </p>
        )}
      </div>

      <div
        className="rounded-xl border p-4"
        style={{
          borderColor: 'var(--color-border-secondary)',
          backgroundColor: 'var(--color-border-muted)',
        }}
      >
        <div
          className="text-xs uppercase tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Developer
        </div>
        <div
          className="mt-1 text-base font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {developer
            ? `${developer.manufacturer} ${developer.name}`
            : 'Unknown developer'}
        </div>
        {(developer?.description || developer?.notes) && (
          <p
            className="mt-2 text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {developer?.description || developer?.notes}
          </p>
        )}
      </div>

      <div
        className="space-y-3 rounded-xl border p-4"
        style={{
          borderColor: 'var(--color-border-secondary)',
          backgroundColor: 'var(--color-border-muted)',
        }}
      >
        <DetailRow label="ISO" value={combination.shootingIso} />
        <DetailRow
          label="Development time"
          value={`${combination.timeMinutes.toFixed(2)} minutes`}
        />
        <DetailRow label="Temperature" value={formatTemperature(combination)} />
        <DetailRow
          label="Dilution"
          value={
            combination.customDilution ||
            (developer && combination.dilutionId
              ? developer.dilutions.find(
                  (d) => String(d.id) === String(combination.dilutionId)
                )?.dilution
              : undefined) ||
            'Stock'
          }
        />
        <DetailRow
          label="Agitation"
          value={combination.agitationSchedule || 'Standard'}
        />
        <DetailRow label="Push/Pull" value={combination.pushPull} />
        {combination.tags && combination.tags.length > 0 && (
          <div
            className="flex flex-wrap justify-end gap-2 text-xs"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {combination.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        )}
      </div>

      {combination.notes && (
        <div
          className="rounded-xl border p-4"
          style={{
            borderColor: 'var(--color-border-secondary)',
            backgroundColor: 'var(--color-border-muted)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <div
            className="text-xs uppercase tracking-wide"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Notes
          </div>
          <p className="mt-2 leading-relaxed">{combination.notes}</p>
        </div>
      )}

      {combination.infoSource && (
        <a
          href={combination.infoSource}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-xs underline-offset-4 hover:underline"
          style={{ color: 'var(--color-text-tertiary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-tertiary)';
          }}
        >
          <ExternalLink className="h-3 w-3" /> View source
        </a>
      )}

      {view.source === 'custom' &&
        (onEditCustomRecipe || onDeleteCustomRecipe) && (
          <div className="flex gap-3 pt-4">
            {onEditCustomRecipe && (
              <button
                type="button"
                onClick={() => onEditCustomRecipe(view)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition"
                style={{
                  backgroundColor: 'var(--color-border-muted)',
                  color: 'var(--color-text-secondary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'var(--color-border-secondary)';
                  e.currentTarget.style.color = 'var(--color-text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'var(--color-border-muted)';
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                }}
              >
                <Edit2 className="h-4 w-4" />
                Edit recipe
              </button>
            )}
            {onDeleteCustomRecipe && (
              <button
                type="button"
                onClick={() => onDeleteCustomRecipe(view)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition"
                style={{
                  backgroundColor:
                    'color-mix(in srgb, var(--color-semantic-error) 10%, transparent)',
                  color:
                    'color-mix(in srgb, var(--color-semantic-error) 80%, var(--color-text-primary))',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'color-mix(in srgb, var(--color-semantic-error) 20%, transparent)';
                  e.currentTarget.style.color =
                    'color-mix(in srgb, var(--color-semantic-error) 90%, var(--color-text-primary))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'color-mix(in srgb, var(--color-semantic-error) 10%, transparent)';
                  e.currentTarget.style.color =
                    'color-mix(in srgb, var(--color-semantic-error) 80%, var(--color-text-primary))';
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete recipe
              </button>
            )}
          </div>
        )}
    </div>
  );
}
