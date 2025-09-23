import { ExternalLink } from 'lucide-react';
import type { DevelopmentCombinationView } from './results-table';

interface DevelopmentRecipeDetailProps {
  view: DevelopmentCombinationView;
}

const formatTemperature = (combination: DevelopmentCombinationView['combination']) => {
  const fahrenheit = Number.isFinite(combination.temperatureF)
    ? combination.temperatureF
    : null;
  const celsius = Number.isFinite(combination.temperatureC ?? NaN)
    ? combination.temperatureC!
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

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between gap-6 text-sm">
    <span className="text-white/60">{label}</span>
    <span className="text-white text-right">{value}</span>
  </div>
);

export function DevelopmentRecipeDetail({ view }: DevelopmentRecipeDetailProps) {
  const { combination, film, developer } = view;

  return (
    <div className="space-y-5 text-sm">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs uppercase tracking-wide text-white/50">Film</div>
        <div className="mt-1 text-base font-semibold text-white">
          {film ? `${film.brand} ${film.name}` : 'Unknown film'}
        </div>
        {film?.description && (
          <p className="mt-2 text-sm text-white/70">{film.description}</p>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs uppercase tracking-wide text-white/50">Developer</div>
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
        <DetailRow label="Development time" value={`${combination.timeMinutes.toFixed(2)} minutes`} />
        <DetailRow label="Temperature" value={formatTemperature(combination)} />
        <DetailRow
          label="Dilution"
          value={
            combination.customDilution ||
            developer?.dilutions.find((d) => d.id === combination.dilutionId)?.dilution ||
            'Stock'
          }
        />
        <DetailRow label="Agitation" value={combination.agitationSchedule || 'Standard'} />
        <DetailRow label="Push/Pull" value={combination.pushPull} />
        {combination.tags && combination.tags.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2 text-xs text-white/60">
            {combination.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/10 px-2 py-0.5 uppercase tracking-wide"
              >
                {tag.replace(/-/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>

      {combination.notes && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white/80">
          <div className="text-xs uppercase tracking-wide text-white/50">Notes</div>
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
    </div>
  );
}
