import { Share2, Info, Beaker } from 'lucide-react';
import type { Combination, Film, Developer } from '@dorkroom/api';
import { cn } from '../../lib/cn';

export interface DevelopmentCombinationView {
  combination: Combination;
  film?: Film;
  developer?: Developer;
  source?: 'api' | 'custom';
  canShare?: boolean;
  canViewDetails?: boolean;
}

interface DevelopmentResultsTableProps {
  rows: DevelopmentCombinationView[];
  onSelectCombination?: (view: DevelopmentCombinationView) => void;
  onShareCombination?: (view: DevelopmentCombinationView) => void;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: 'filmName' | 'developerName' | 'timeMinutes' | 'temperatureF' | 'shootingIso') => void;
}

const formatTemperature = (temperatureF: number) => {
  const celsius = ((temperatureF - 32) * 5) / 9;
  return `${temperatureF.toFixed(1)}°F / ${celsius.toFixed(1)}°C`;
};

const formatTime = (minutes: number) => {
  if (minutes < 1) {
    return `${Math.round(minutes * 60)}s`;
  }

  const wholeMinutes = Math.floor(minutes);
  const seconds = Math.round((minutes - wholeMinutes) * 60);
  if (seconds === 0) {
    return `${wholeMinutes}m`;
  }
  return `${wholeMinutes}m ${seconds.toString().padStart(2, '0')}s`;
};

const formatDilution = (
  combination: Combination,
  developer?: Developer,
): string => {
  if (combination.customDilution) {
    return combination.customDilution;
  }

  if (developer) {
    const dilution = developer.dilutions.find(
      (dilutionOption) => dilutionOption.id === combination.dilutionId,
    );

    if (dilution) {
      return dilution.dilution || dilution.name;
    }
  }

  return 'Stock';
};

export function DevelopmentResultsTable({
  rows,
  onSelectCombination,
  onShareCombination,
  sortBy = 'filmName',
  sortDirection = 'asc',
  onSort,
}: DevelopmentResultsTableProps) {
  const renderHeaderButton = (
    label: string,
    key: 'filmName' | 'developerName' | 'timeMinutes' | 'temperatureF' | 'shootingIso',
    align: 'left' | 'right' = 'left',
  ) => {
    const isActive = sortBy === key;
    return (
      <button
        type="button"
        onClick={() => onSort?.(key)}
        className={cn(
          'flex w-full items-center gap-1 text-xs uppercase tracking-wide transition',
          align === 'right' ? 'justify-end' : 'justify-start',
          isActive ? 'text-white' : 'text-white/60 hover:text-white/80',
        )}
      >
        {label}
        {isActive && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
      </button>
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-subtle">
      <table className="min-w-full divide-y divide-white/10 text-sm text-white/80">
        <thead className="bg-white/10 text-xs uppercase tracking-wide text-white/60">
          <tr>
            <th className="px-4 py-3 text-left">
              {renderHeaderButton('Film', 'filmName')}
            </th>
            <th className="px-4 py-3 text-left">
              {renderHeaderButton('Developer', 'developerName')}
            </th>
            <th className="px-3 py-3 text-left">
              {renderHeaderButton('ISO', 'shootingIso')}
            </th>
            <th className="px-3 py-3 text-left">
              {renderHeaderButton('Time', 'timeMinutes')}
            </th>
            <th className="px-3 py-3 text-left">
              {renderHeaderButton('Temp', 'temperatureF')}
            </th>
            <th className="px-3 py-3 text-left">Dilution</th>
            <th className="px-3 py-3 text-left">Notes</th>
            <th className="px-3 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row) => {
            const { combination, film, developer } = row;
            return (
              <tr
                key={combination.uuid || combination.id}
                className={cn(
                  'transition hover:bg-white/10',
                  row.source === 'custom' && 'bg-purple-950/40 hover:bg-purple-900/40',
                )}
              >
                <td className="px-4 py-4 align-top">
                  <div className="font-medium text-white">
                    {film ? `${film.brand} ${film.name}` : 'Unknown film'}
                  </div>
                  <div className="text-xs text-white/50">
                    {combination.pushPull === 0
                      ? 'Normal'
                      : combination.pushPull > 0
                        ? `Push +${combination.pushPull}`
                        : `Pull ${combination.pushPull}`}
                  </div>
                </td>
                <td className="px-4 py-4 align-top">
                  <div className="font-medium text-white">
                    {developer
                      ? `${developer.manufacturer} ${developer.name}`
                      : 'Unknown developer'}
                  </div>
                  {row.source === 'custom' && (
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-200">
                      <Beaker className="h-3 w-3" /> Custom
                    </div>
                  )}
                </td>
                <td className="px-3 py-4 align-top text-white">{combination.shootingIso}</td>
                <td className="px-3 py-4 align-top text-white">{formatTime(combination.timeMinutes)}</td>
                <td className="px-3 py-4 align-top text-white">{formatTemperature(combination.temperatureF)}</td>
                <td className="px-3 py-4 align-top text-white">
                  {formatDilution(combination, developer)}
                </td>
                <td className="px-3 py-4 align-top text-white/70">
                  {combination.notes ? (
                    <span className="line-clamp-2">{combination.notes}</span>
                  ) : (
                    <span className="text-white/30">—</span>
                  )}
                </td>
                <td className="px-3 py-4 align-top">
                  <div className="flex justify-end gap-2">
                    {onShareCombination && row.canShare && (
                      <button
                        type="button"
                        onClick={() => onShareCombination(row)}
                        className="rounded-full border border-white/10 p-2 text-white/70 transition hover:border-white/40 hover:text-white"
                        aria-label="Share recipe"
                      >
                        <Share2 className="h-4 w-4" />
                      </button>
                    )}
                    {onSelectCombination && (row.canViewDetails ?? true) && (
                      <button
                        type="button"
                        onClick={() => onSelectCombination(row)}
                        className="rounded-full border border-white/10 p-2 text-white/70 transition hover:border-white/40 hover:text-white"
                        aria-label="View recipe details"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={8}
                className="px-6 py-12 text-center text-sm text-white/50"
              >
                No recipes match your current filters. Try adjusting your search.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
