import { Beaker, ExternalLink, Share2, Edit2, Trash2 } from 'lucide-react';
import type { Combination, Film, Developer } from '@dorkroom/api';
import { cn } from '../../lib/cn';
import { useTemperature } from '../../contexts/temperature-context';
import { formatTemperatureWithUnit } from '../../lib/temperature';
import { Tag } from '../ui/tag';

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
  onCopyCombination?: (view: DevelopmentCombinationView) => void;
  onEditCustomRecipe?: (view: DevelopmentCombinationView) => void;
  onDeleteCustomRecipe?: (view: DevelopmentCombinationView) => void;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (
    key:
      | 'filmName'
      | 'developerName'
      | 'timeMinutes'
      | 'temperatureF'
      | 'shootingIso'
  ) => void;
}

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
  developer?: Developer
): string => {
  if (combination.customDilution) {
    return combination.customDilution;
  }

  if (developer && combination.dilutionId) {
    const dilution = developer.dilutions.find(
      (dilutionOption) =>
        String(dilutionOption.id) === String(combination.dilutionId)
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
  onCopyCombination,
  onEditCustomRecipe,
  onDeleteCustomRecipe,
  sortBy = 'filmName',
  sortDirection = 'asc',
  onSort,
}: DevelopmentResultsTableProps) {
  const { unit } = useTemperature();
  const renderHeaderButton = (
    label: string,
    key:
      | 'filmName'
      | 'developerName'
      | 'timeMinutes'
      | 'temperatureF'
      | 'shootingIso',
    align: 'left' | 'right' = 'left'
  ) => {
    const isActive = sortBy === key;
    return (
      <button
        type="button"
        onClick={() => onSort?.(key)}
        className={cn(
          'flex w-full items-center gap-1 text-xs uppercase tracking-wide transition',
          align === 'right' ? 'justify-end' : 'justify-start',
          isActive ? 'text-white' : 'text-white/60 hover:text-white/80'
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
            <th className="px-3 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row, index) => {
            const { combination, film, developer } = row;
            return (
              <tr
                key={combination.uuid || combination.id}
                onClick={() => onSelectCombination?.(row)}
                className={cn(
                  'cursor-pointer transition-all duration-200 hover:bg-white/10',
                  'animate-slide-fade-bottom',
                  row.source === 'custom' &&
                    'bg-purple-950/40 hover:bg-purple-900/40',
                  index === 0 && 'animate-delay-100',
                  index === 1 && 'animate-delay-200',
                  index === 2 && 'animate-delay-300',
                  index === 3 && 'animate-delay-400',
                  index === 4 && 'animate-delay-500',
                  index === 5 && 'animate-delay-600',
                  index >= 6 && 'animate-delay-700'
                )}
              >
                <td className="px-4 py-4 align-top">
                  <div className="font-medium text-white">
                    {film ? `${film.brand} ${film.name}` : 'Unknown film'}
                  </div>
                  <div className="text-xs text-white/50">
                    {combination.pushPull === 0
                      ? 'Box Speed'
                      : combination.pushPull > 0
                      ? `Push +${combination.pushPull}`
                      : `Pull ${combination.pushPull}`}
                  </div>
                  {combination.tags && combination.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {combination.tags.map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </div>
                  )}
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
                <td className="px-3 py-4 align-top text-white">
                  {combination.shootingIso}
                </td>
                <td className="px-3 py-4 align-top text-white">
                  {formatTime(combination.timeMinutes)}
                </td>
                <td className="px-3 py-4 align-top">
                  {(() => {
                    const temp = formatTemperatureWithUnit(
                      combination.temperatureF,
                      combination.temperatureC,
                      unit
                    );
                    return (
                      <span
                        className={cn(
                          'text-white',
                          temp.isNonStandard && 'text-amber-300 font-medium'
                        )}
                      >
                        {temp.text}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-3 py-4 align-top text-white">
                  {formatDilution(combination, developer)}
                </td>
                <td className="px-3 py-4 align-top text-white/70">
                  {combination.notes ? (
                    <span className="line-clamp-2">{combination.notes}</span>
                  ) : (
                    <span className="text-white/30">—</span>
                  )}
                  {combination.infoSource && (
                    <a
                      href={combination.infoSource}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-white/60 underline-offset-4 hover:text-white hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Source
                    </a>
                  )}
                </td>
                <td className="px-3 py-4 align-top">
                  <div className="flex items-center gap-2">
                    {row.source === 'custom' ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditCustomRecipe?.(row);
                          }}
                          className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
                          title="Edit custom recipe"
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteCustomRecipe?.(row);
                          }}
                          className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-1 text-xs text-red-300 transition hover:bg-red-500/20 hover:text-red-200"
                          title="Delete custom recipe"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onShareCombination?.(row);
                        }}
                        className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
                        title="Share recipe"
                      >
                        <Share2 className="h-3 w-3" />
                        Share
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
                No recipes match your current filters. Try adjusting your
                search.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
