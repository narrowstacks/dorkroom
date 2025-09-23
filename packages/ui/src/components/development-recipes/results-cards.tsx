import { Share2, Info, Beaker } from 'lucide-react';
import type { DevelopmentCombinationView } from './results-table';

interface DevelopmentResultsCardsProps {
  rows: DevelopmentCombinationView[];
  onSelectCombination?: (view: DevelopmentCombinationView) => void;
  onShareCombination?: (view: DevelopmentCombinationView) => void;
}

const formatTemperature = (temperatureF: number) => {
  const celsius = ((temperatureF - 32) * 5) / 9;
  return `${temperatureF.toFixed(1)}°F · ${celsius.toFixed(1)}°C`;
};

const formatTime = (minutes: number) => {
  if (minutes < 1) {
    return `${Math.round(minutes * 60)}s`;
  }

  const wholeMinutes = Math.floor(minutes);
  const seconds = Math.round((minutes - wholeMinutes) * 60);
  if (seconds === 0) {
    return `${wholeMinutes} min`;
  }
  return `${wholeMinutes}m ${seconds.toString().padStart(2, '0')}s`;
};

const formatDilution = (view: DevelopmentCombinationView): string => {
  const { combination, developer } = view;

  if (combination.customDilution) {
    return combination.customDilution;
  }

  if (developer) {
    const match = developer.dilutions.find(
      (dilution) => dilution.id === combination.dilutionId,
    );
    if (match) {
      return match.dilution || match.name;
    }
  }

  return 'Stock';
};

export function DevelopmentResultsCards({
  rows,
  onSelectCombination,
  onShareCombination,
}: DevelopmentResultsCardsProps) {
  return (
    <div className="grid gap-4">
      {rows.map((row) => {
        const { combination, film, developer } = row;
        return (
          <div
            key={combination.uuid || combination.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-subtle"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">
                  {film ? `${film.brand} ${film.name}` : 'Unknown film'}
                </div>
                <div className="text-xs text-white/60">
                  {developer
                    ? `${developer.manufacturer} ${developer.name}`
                    : 'Unknown developer'}
                </div>
                {row.source === 'custom' && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-200">
                    <Beaker className="h-3 w-3" /> Custom recipe
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {onShareCombination && row.canShare && (
                  <button
                    type="button"
                    onClick={() => onShareCombination(row)}
                    className="rounded-full border border-white/20 p-2 text-white/70 transition hover:border-white/40 hover:text-white"
                    aria-label="Share recipe"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                )}
                {onSelectCombination && (row.canViewDetails ?? true) && (
                  <button
                    type="button"
                    onClick={() => onSelectCombination(row)}
                    className="rounded-full border border-white/20 p-2 text-white/70 transition hover:border-white/40 hover:text-white"
                    aria-label="View recipe details"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-white/70">
              <div>
                <div className="text-white/40">ISO</div>
                <div className="text-sm text-white">{combination.shootingIso}</div>
              </div>
              <div>
                <div className="text-white/40">Time</div>
                <div className="text-sm text-white">{formatTime(combination.timeMinutes)}</div>
              </div>
              <div>
                <div className="text-white/40">Temperature</div>
                <div className="text-sm text-white">
                  {formatTemperature(combination.temperatureF)}
                </div>
              </div>
              <div>
                <div className="text-white/40">Dilution</div>
                <div className="text-sm text-white">{formatDilution(row)}</div>
              </div>
            </div>

            {combination.notes && (
              <div className="mt-4 rounded-xl bg-white/10 p-3 text-xs text-white/80">
                {combination.notes}
              </div>
            )}
          </div>
        );
      })}

      {rows.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
          No recipes match your current filters. Try adjusting your search.
        </div>
      )}
    </div>
  );
}
