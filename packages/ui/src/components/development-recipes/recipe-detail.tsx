import type { DevelopmentCombinationView } from './results-table';

interface DevelopmentRecipeDetailProps {
  view: DevelopmentCombinationView;
}

const formatTemperature = (temperatureF: number) => {
  const celsius = ((temperatureF - 32) * 5) / 9;
  return `${temperatureF.toFixed(1)}°F (${celsius.toFixed(1)}°C)`;
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
        {developer?.notes && (
          <p className="mt-2 text-sm text-white/70">{developer.notes}</p>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <DetailRow label="ISO" value={combination.shootingIso} />
        <DetailRow label="Development time" value={`${combination.timeMinutes.toFixed(2)} minutes`} />
        <DetailRow label="Temperature" value={formatTemperature(combination.temperatureF)} />
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
      </div>

      {combination.notes && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white/80">
          <div className="text-xs uppercase tracking-wide text-white/50">Notes</div>
          <p className="mt-2 leading-relaxed">{combination.notes}</p>
        </div>
      )}
    </div>
  );
}
