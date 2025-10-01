import { useMemo } from 'react';
import { DatabaseViewer, DetailField } from '@dorkroom/ui';
import { useInfobaseData } from '../../contexts/infobase-context';
import { Loader2 } from 'lucide-react';

export function FilmDataPage() {
  const { films, isLoading, error } = useInfobaseData();

  // Create a lookup map for O(1) access instead of O(n) find() calls
  const filmMap = useMemo(
    () => new Map(films.map((film) => [film.id, film])),
    [films]
  );

  if (isLoading) {
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
            value: new Date(film.dateAdded).toLocaleDateString(),
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
      emptyDetailMessage="Select a film to view details"
    />
  );
}
