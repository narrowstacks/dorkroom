import { Combination, Film, Developer } from '@dorkroom/api';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';

interface RecipeTableProps {
  combinations: Combination[];
  films: Film[];
  developers: Developer[];
  filmSlug?: string;
  developerSlug?: string;
  maxRows?: number;
  className?: string;
}

export function RecipeTable({
  combinations,
  films,
  developers,
  filmSlug,
  developerSlug,
  maxRows = 10,
  className,
}: RecipeTableProps) {
  const getFilmBySlug = (slug: string) =>
    films.find((f) => f.slug === slug || f.uuid === slug);
  const getDeveloperBySlug = (slug: string) =>
    developers.find((d) => d.slug === slug || d.uuid === slug);

  let filtered = combinations;

  if (filmSlug) {
    filtered = filtered.filter(
      (c) => c.filmSlug === filmSlug || c.filmStockId === filmSlug
    );
  }

  if (developerSlug) {
    filtered = filtered.filter(
      (c) =>
        c.developerSlug === developerSlug || c.developerId === developerSlug
    );
  }

  const displayed = filtered.slice(0, maxRows);

  if (displayed.length === 0) {
    return (
      <div
        className={cn('rounded-lg p-6 text-center', className)}
        style={{
          backgroundColor: 'var(--color-surface)',
          borderWidth: 1,
          borderColor: 'var(--color-border-secondary)',
        }}
      >
        <p style={{ color: 'var(--color-text-secondary)' }}>
          No recipes found for this combination.
        </p>
        <Link
          to="/development"
          className="mt-4 inline-block text-sm font-medium underline"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Browse all recipes
        </Link>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div
        className="overflow-hidden rounded-lg"
        style={{
          borderWidth: 1,
          borderColor: 'var(--color-border-secondary)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead
              className="border-b"
              style={{
                borderColor: 'var(--color-border-secondary)',
                backgroundColor: 'rgba(var(--color-background-rgb), 0.05)',
              }}
            >
              <tr>
                {!filmSlug && (
                  <th
                    className="px-4 py-3 text-left text-xs font-medium"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    Film
                  </th>
                )}
                {!developerSlug && (
                  <th
                    className="px-4 py-3 text-left text-xs font-medium"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    Developer
                  </th>
                )}
                <th
                  className="px-4 py-3 text-left text-xs font-medium"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  ISO
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Time
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Temp
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Dilution
                </th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((combo, index) => {
                const film = getFilmBySlug(combo.filmSlug || combo.filmStockId);
                const developer = getDeveloperBySlug(
                  combo.developerSlug || combo.developerId
                );

                return (
                  <tr
                    key={combo.uuid || combo.id}
                    className={cn(index !== displayed.length - 1 && 'border-b')}
                    style={{
                      borderColor: 'var(--color-border-secondary)',
                    }}
                  >
                    {!filmSlug && (
                      <td
                        className="px-4 py-3 text-sm"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {film ? `${film.brand} ${film.name}` : 'Unknown'}
                      </td>
                    )}
                    {!developerSlug && (
                      <td
                        className="px-4 py-3 text-sm"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {developer
                          ? `${developer.manufacturer} ${developer.name}`
                          : 'Unknown'}
                      </td>
                    )}
                    <td
                      className="px-4 py-3 text-sm font-medium"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {combo.shootingIso}
                    </td>
                    <td
                      className="px-4 py-3 text-sm"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {combo.timeMinutes} min
                    </td>
                    <td
                      className="px-4 py-3 text-sm"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {combo.temperatureF}°F
                    </td>
                    <td
                      className="px-4 py-3 text-sm"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {combo.customDilution || 'Stock'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length > maxRows && (
        <div className="text-center">
          <Link
            to={
              filmSlug
                ? `/development?film=${filmSlug}`
                : developerSlug
                ? `/development?developer=${developerSlug}`
                : '/development'
            }
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition"
            style={{
              backgroundColor: 'var(--color-text-primary)',
              color: 'var(--color-background)',
            }}
          >
            View all {filtered.length} recipes →
          </Link>
        </div>
      )}
    </div>
  );
}
