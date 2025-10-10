import { useState, useEffect, useMemo } from 'react';
import { DatabaseViewer, DetailField } from '@dorkroom/ui';
import { useInfobaseClient } from '../../contexts/infobase-context';
import { Loader2 } from 'lucide-react';
import { Film } from '@dorkroom/api';

export function FilmDataPage() {
  const client = useInfobaseClient();
  const [films, setFilms] = useState<Film[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch films on mount - load a reasonable set of results
  // DatabaseViewer will handle search filtering locally
  // This useEffect is necessary to trigger initial data loading
  useEffect(() => {
    let cancelled = false;

    async function fetchFilms() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all films (no limit) for local filtering
        const response = await client.fetchFilmsOnDemand();

        if (!cancelled) {
          setFilms(response.data);
        }
      } catch (err) {
        if (!cancelled) {
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to load films';
          setError(errorMessage);
          console.error('[FilmDataPage] Error fetching films:', err);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchFilms();

    return () => {
      cancelled = true;
    };
  }, [client]);

  // Create a lookup map for O(1) access instead of O(n) find() calls
  const filmMap = useMemo(
    () => new Map(films.map((film) => [film.id, film])),
    [films]
  );

  if (isLoading && films.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2
          className="h-8 w-8 animate-spin"
          style={{ color: 'var(--color-text-secondary)' }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-lg border p-6"
        style={{ borderColor: 'var(--color-border-secondary)' }}
      >
        <h2 className="text-lg font-semibold text-red-500">
          Error Loading Films
        </h2>
        <p
          className="mt-2 text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {error}
        </p>
      </div>
    );
  }

  return (
    <DatabaseViewer
      items={films.map((film) => ({
        id: film.id,
        name: film.name,
      }))}
      getItemSubtitle={(item) => {
        const film = filmMap.get(item.id);
        return film ? `${film.brand} · ISO ${film.isoSpeed}` : '';
      }}
      getDetailFields={(item): DetailField[] => {
        const film = filmMap.get(item.id);
        if (!film) return [];

        return [
          { label: 'Brand', value: film.brand },
          { label: 'ISO Speed', value: film.isoSpeed },
          { label: 'Color Type', value: film.colorType },
          { label: 'Grain Structure', value: film.grainStructure },
          {
            label: 'Status',
            value: film.discontinued ? (
              <span className="text-red-500">Discontinued</span>
            ) : (
              <span className="text-green-500">Available</span>
            ),
          },
          {
            label: 'Date Added',
            value: (() => {
              const d = new Date(film.dateAdded);
              return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
            })(),
          },
          { label: 'Description', value: film.description, fullWidth: true },
          {
            label: 'Manufacturer Notes',
            value:
              film.manufacturerNotes &&
              Array.isArray(film.manufacturerNotes) ? (
                <ul className="list-inside list-disc space-y-1">
                  {film.manufacturerNotes.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              ) : null,
            fullWidth: true,
          },
          {
            label: 'Reciprocity Failure',
            value: film.reciprocityFailure,
            fullWidth: true,
          },
        ];
      }}
      searchFilter={(item, query) => {
        const film = filmMap.get(item.id);
        if (!film) return false;

        const normalizedQuery = query.toLowerCase().trim();
        return (
          film.name.toLowerCase().includes(normalizedQuery) ||
          film.brand.toLowerCase().includes(normalizedQuery) ||
          film.colorType.toLowerCase().includes(normalizedQuery) ||
          film.isoSpeed.toString().includes(normalizedQuery)
        );
      }}
      emptyMessage="No films found"
      emptyDetailMessage="Search for a film to view details"
      searchPlaceholder="Search films..."
      mobileSearchPrompt="Start typing to search films"
    />
  );
}
