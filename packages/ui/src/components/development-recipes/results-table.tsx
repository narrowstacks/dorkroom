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
          isActive ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)'
        )}
      >
        {label}
        {isActive && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
      </button>
    );
  };

  return (
    <div
      className="overflow-hidden rounded-2xl border shadow-subtle"
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: 'var(--color-border-muted)',
      }}
    >
      <table
        className="min-w-full divide-y text-sm"
        style={
          {
            '--tw-divide-opacity': '1',
            divideColor: 'var(--color-border-secondary)',
            color: 'var(--color-text-secondary)',
          } as React.CSSProperties
        }
      >
        <thead
          className="text-xs uppercase tracking-wide"
          style={{
            backgroundColor: 'var(--color-border-secondary)',
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
        <tbody className="divide-y divide-white/5">
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
                      ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)'
                      : undefined,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    row.source === 'custom'
                      ? 'color-mix(in srgb, var(--color-accent) 20%, transparent)'
                      : 'var(--color-border-muted)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    row.source === 'custom'
                      ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)'
                      : 'transparent';
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
                      {combination.tags.map((tag) => (
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
                        backgroundColor:
                          'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                        color:
                          'color-mix(in srgb, var(--color-accent) 80%, var(--color-text-primary))',
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
                  {combination.notes ? (
                    <span className="line-clamp-2">{combination.notes}</span>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                  )}
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
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition"
                          style={{
                            backgroundColor: 'var(--color-border-muted)',
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
                              'var(--color-border-muted)';
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
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition"
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
  );
}
