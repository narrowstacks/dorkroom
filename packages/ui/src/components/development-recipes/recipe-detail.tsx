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
    <span className="text-white/60">{label}</span>
    <span className="text-white text-right">{value}</span>
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
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs uppercase tracking-wide text-white/50">
          Film
        </div>
        <div className="mt-1 text-base font-semibold text-white">
          {film ? `${film.brand} ${film.name}` : 'Unknown film'}
        </div>
        {film?.description && (
          <p className="mt-2 text-sm text-white/70">{film.description}</p>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs uppercase tracking-wide text-white/50">
          Developer
        </div>
        <div className="mt-1 text-base font-semibold text-white">
          {developer
            ? `${developer.manufacturer} ${developer.name}`
            : 'Unknown developer'}
        </div>
        {(developer?.description || developer?.notes) && (
          <p className="mt-2 text-sm text-white/70">
            {developer?.description || developer?.notes}
          </p>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
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
            developer?.dilutions.find((d) => d.id === combination.dilutionId)
              ?.dilution ||
            'Stock'
          }
        />
        <DetailRow
          label="Agitation"
          value={combination.agitationSchedule || 'Standard'}
        />
        <DetailRow label="Push/Pull" value={combination.pushPull} />
        {combination.tags && combination.tags.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2 text-xs text-white/60">
            {combination.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        )}
      </div>

      {combination.notes && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white/80">
          <div className="text-xs uppercase tracking-wide text-white/50">
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
          className="inline-flex items-center gap-2 text-xs text-white/60 underline-offset-4 hover:text-white hover:underline"
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
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/20 hover:text-white"
              >
                <Edit2 className="h-4 w-4" />
                Edit recipe
              </button>
            )}
            {onDeleteCustomRecipe && (
              <button
                type="button"
                onClick={() => onDeleteCustomRecipe(view)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/20 hover:text-red-200"
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
