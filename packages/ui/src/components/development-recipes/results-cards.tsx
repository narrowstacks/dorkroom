import { Beaker, ExternalLink, Share2, Edit2, Trash2 } from 'lucide-react';
import type { DevelopmentCombinationView } from './results-table';
import { useTemperature } from '../../contexts/temperature-context';
import { formatTemperatureWithUnit } from '../../lib/temperature';
import { cn } from '../../lib/cn';
import { Tag } from '../ui/tag';

interface DevelopmentResultsCardsProps {
  rows: DevelopmentCombinationView[];
  onSelectCombination?: (view: DevelopmentCombinationView) => void;
  onShareCombination?: (view: DevelopmentCombinationView) => void;
  onCopyCombination?: (view: DevelopmentCombinationView) => void;
  onEditCustomRecipe?: (view: DevelopmentCombinationView) => void;
  onDeleteCustomRecipe?: (view: DevelopmentCombinationView) => void;
}

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
      (dilution) => dilution.id === combination.dilutionId
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
  onCopyCombination,
  onEditCustomRecipe,
  onDeleteCustomRecipe,
}: DevelopmentResultsCardsProps) {
  const { unit } = useTemperature();
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rows.map((row, index) => {
        const { combination, film, developer } = row;
        return (
          <div
            key={combination.uuid || combination.id}
            onClick={() => onSelectCombination?.(row)}
            className={cn(
              'cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-4 shadow-subtle transition-all duration-200 hover:border-white/20 hover:bg-white/10 hover:scale-[1.02]',
              'animate-slide-fade-bottom',
              row.source === 'custom' &&
                'bg-purple-950/20 hover:bg-purple-900/30',
              index === 0 && 'animate-delay-100',
              index === 1 && 'animate-delay-200',
              index === 2 && 'animate-delay-300',
              index === 3 && 'animate-delay-400',
              index === 4 && 'animate-delay-500',
              index === 5 && 'animate-delay-600',
              index === 6 && 'animate-delay-700',
              index >= 7 && 'animate-delay-800'
            )}
          >
            <div>
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
                {combination.tags && combination.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {combination.tags.map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-white/70">
              <div>
                <div className="text-white/40">ISO</div>
                <div className="text-sm text-white">
                  {combination.shootingIso}
                </div>
              </div>
              <div>
                <div className="text-white/40">Time</div>
                <div className="text-sm text-white">
                  {formatTime(combination.timeMinutes)}
                </div>
              </div>
              <div>
                <div className="text-white/40">Temperature</div>
                {(() => {
                  const temp = formatTemperatureWithUnit(
                    row.combination.temperatureF,
                    row.combination.temperatureC,
                    unit
                  );
                  return (
                    <div
                      className={cn(
                        'text-sm text-white',
                        temp.isNonStandard && 'text-amber-300 font-medium'
                      )}
                    >
                      {temp.text}
                    </div>
                  );
                })()}
              </div>
              <div>
                <div className="text-white/40">Dilution</div>
                <div className="text-sm text-white">{formatDilution(row)}</div>
              </div>
            </div>

            {(combination.notes || combination.infoSource) && (
              <div className="mt-4 space-y-2">
                {combination.notes && (
                  <div className="rounded-xl bg-white/10 p-3 text-xs text-white/80">
                    {combination.notes}
                  </div>
                )}
                {combination.infoSource && (
                  <a
                    href={combination.infoSource}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-white/60 underline-offset-4 hover:text-white hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> Source
                  </a>
                )}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
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
                (onShareCombination || onCopyCombination) && (
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
                )
              )}
            </div>
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
