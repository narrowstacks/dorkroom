import { Beaker, ExternalLink, Edit2, Trash2, Star } from 'lucide-react';
import type { Combination, Film, Developer, Dilution } from '@dorkroom/api';
import { cn } from '../../lib/cn';
import { colorMixOr } from '../../lib/color';
import { useTemperature } from '../../contexts/temperature-context';
import { formatTemperatureWithUnit } from '../../lib/temperature';
import { Tag } from '../ui/tag';
import { ShareButton } from '../share-button';

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
  onShareCombination?: (
    view: DevelopmentCombinationView
  ) => void | Promise<unknown>;
  onCopyCombination?: (view: DevelopmentCombinationView) => void;
  onEditCustomRecipe?: (view: DevelopmentCombinationView) => void;
  onDeleteCustomRecipe?: (view: DevelopmentCombinationView) => void;
  isFavorite?: (view: DevelopmentCombinationView) => boolean;
  onToggleFavorite?: (view: DevelopmentCombinationView) => void;
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
      (dilutionOption: Dilution) =>
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
  isFavorite,
  onToggleFavorite,
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
          align === 'right' ? 'justify-end' : 'justify-start'
        )}
        style={{
          color: isActive
            ? 'var(--color-text-primary)'
            : 'var(--color-text-tertiary)',
        }}
      >
        {label}
        {isActive && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
      </button>
    );
  };

  return (
    <div
      className="overflow-visible rounded-2xl border shadow-subtle"
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: 'rgba(var(--color-surface-muted-rgb), 0.2)',
      }}
    >
      <div className="overflow-hidden rounded-2xl">
        <table
          className="min-w-full divide-y text-sm"
          style={
            {
              '--tw-divide-opacity': '0.15',
              divideColor: 'var(--color-border-secondary)',
              color: 'var(--color-border-secondary)',
            } as React.CSSProperties
          }
        >
          <thead
            className="text-xs uppercase tracking-wide"
            style={{
              backgroundColor: 'rgba(var(--color-surface-muted-rgb), 0.15)',
              color: 'var(--color-text-tertiary)',
            }}
          >
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
          <tbody
            className="divide-y"
            style={
              {
                '--tw-divide-opacity': '0.15',
                divideColor: 'var(--color-text-secondary)',
              } as React.CSSProperties
            }
          >
            {rows.map((row, index) => {
              const { combination, film, developer } = row;
              return (
                <tr
                  key={combination.uuid || combination.id}
                  onClick={() => onSelectCombination?.(row)}
                  className={cn(
                    'cursor-pointer transition-all duration-200',
                    'animate-slide-fade-bottom',
                    index === 0 && 'animate-delay-100',
                    index === 1 && 'animate-delay-200',
                    index === 2 && 'animate-delay-300',
                    index === 3 && 'animate-delay-400',
                    index === 4 && 'animate-delay-500',
                    index === 5 && 'animate-delay-600',
                    index >= 6 && 'animate-delay-700'
                  )}
                  style={{
                    backgroundColor:
                      row.source === 'custom'
                        ? colorMixOr(
                            'var(--color-accent)',
                            15,
                            'transparent',
                            'var(--color-border-muted)'
                          )
                        : 'rgba(var(--color-background-rgb), 0.25)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      row.source === 'custom'
                        ? colorMixOr(
                            'var(--color-accent)',
                            25,
                            'transparent',
                            'var(--color-border-secondary)'
                          )
                        : 'rgba(var(--color-background-rgb), 0.35)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      row.source === 'custom'
                        ? colorMixOr(
                            'var(--color-accent)',
                            15,
                            'transparent',
                            'var(--color-border-muted)'
                          )
                        : 'rgba(var(--color-background-rgb), 0.25)';
                  }}
                >
                  <td className="px-4 py-4 align-top">
                    <div
                      className="font-medium"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {film ? `${film.brand} ${film.name}` : 'Unknown film'}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {combination.pushPull === 0
                        ? 'Box Speed'
                        : combination.pushPull > 0
                        ? `Push +${combination.pushPull}`
                        : `Pull ${combination.pushPull}`}
                    </div>
                    {combination.tags && combination.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {combination.tags.map((tag: string) => (
                          <Tag key={tag}>{tag}</Tag>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div
                      className="font-medium"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {developer
                        ? `${developer.manufacturer} ${developer.name}`
                        : 'Unknown developer'}
                    </div>
                    {row.source === 'custom' && (
                      <div
                        className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor: colorMixOr(
                            'var(--color-accent)',
                            10,
                            'transparent',
                            'var(--color-border-muted)'
                          ),
                          color: colorMixOr(
                            'var(--color-accent)',
                            80,
                            'var(--color-text-primary)',
                            'var(--color-text-primary)'
                          ),
                        }}
                      >
                        <Beaker className="h-3 w-3" /> Custom
                      </div>
                    )}
                  </td>
                  <td
                    className="px-3 py-4 align-top"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {combination.shootingIso}
                  </td>
                  <td
                    className="px-3 py-4 align-top"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
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
                          className={cn(temp.isNonStandard && 'font-medium')}
                          style={{
                            color: temp.isNonStandard
                              ? 'var(--color-semantic-warning)'
                              : 'var(--color-text-primary)',
                          }}
                        >
                          {temp.text}
                        </span>
                      );
                    })()}
                  </td>
                  <td
                    className="px-3 py-4 align-top"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {formatDilution(combination, developer)}
                  </td>
                  <td
                    className="px-3 py-4 align-top"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {combination.infoSource && (
                      <a
                        href={combination.infoSource}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
                        style={{ color: 'var(--color-text-tertiary)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color =
                            'var(--color-text-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color =
                            'var(--color-text-tertiary)';
                        }}
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />{' '}
                        Source
                      </a>
                    )}
                  </td>
                  <td className="px-3 py-4 align-top">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        title={
                          isFavorite?.(row)
                            ? 'Remove from favorites'
                            : 'Add to favorites'
                        }
                        aria-pressed={Boolean(isFavorite?.(row))}
                        aria-label={
                          isFavorite?.(row)
                            ? 'Remove from favorites'
                            : 'Add to favorites'
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite?.(row);
                        }}
                        className="inline-flex items-center justify-center rounded-md p-1.5 transition"
                        style={{
                          backgroundColor: 'var(--color-surface-muted)',
                          color: isFavorite?.(row)
                            ? 'var(--color-semantic-warning)'
                            : 'var(--color-text-tertiary)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor =
                            'var(--color-border-secondary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor =
                            'var(--color-surface-muted)';
                        }}
                      >
                        <Star
                          className="h-4 w-4"
                          aria-hidden="true"
                          style={{
                            fill: isFavorite?.(row)
                              ? 'var(--color-semantic-warning)'
                              : 'transparent',
                          }}
                        />
                      </button>
                      {row.source === 'custom' ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditCustomRecipe?.(row);
                            }}
                            aria-label="Edit custom recipe"
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2"
                            style={{
                              backgroundColor: 'var(--color-surface-muted)',
                              color: 'var(--color-text-secondary)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor =
                                'var(--color-border-secondary)';
                              e.currentTarget.style.color =
                                'var(--color-text-primary)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                'var(--color-surface-muted)';
                              e.currentTarget.style.color =
                                'var(--color-text-secondary)';
                            }}
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
                            aria-label="Delete custom recipe"
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2"
                            style={{
                              backgroundColor: colorMixOr(
                                'var(--color-semantic-error)',
                                10,
                                'transparent',
                                'var(--color-border-muted)'
                              ),
                              color: colorMixOr(
                                'var(--color-semantic-error)',
                                80,
                                'var(--color-text-primary)',
                                'var(--color-semantic-error)'
                              ),
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor =
                                colorMixOr(
                                  'var(--color-semantic-error)',
                                  20,
                                  'transparent',
                                  'var(--color-border-secondary)'
                                );
                              e.currentTarget.style.color = colorMixOr(
                                'var(--color-semantic-error)',
                                90,
                                'var(--color-text-primary)',
                                'var(--color-semantic-error)'
                              );
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                colorMixOr(
                                  'var(--color-semantic-error)',
                                  10,
                                  'transparent',
                                  'var(--color-border-muted)'
                                );
                              e.currentTarget.style.color = colorMixOr(
                                'var(--color-semantic-error)',
                                80,
                                'var(--color-text-primary)',
                                'var(--color-semantic-error)'
                              );
                            }}
                            title="Delete custom recipe"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                        </>
                      ) : (
                        <div onClick={(e) => e.stopPropagation()}>
                          <ShareButton
                            onClick={() => onShareCombination?.(row)}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                          />
                        </div>
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
                  className="px-6 py-12 text-center text-sm"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  No recipes match your current filters. Try adjusting your
                  search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
