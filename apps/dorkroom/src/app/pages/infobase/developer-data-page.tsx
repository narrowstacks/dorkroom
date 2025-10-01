import { useMemo } from 'react';
import { DatabaseViewer, DetailField } from '@dorkroom/ui';
import { useInfobaseData } from '../../contexts/infobase-context';
import { Loader2 } from 'lucide-react';

export function DeveloperDataPage() {
  const { developers, isLoading, error } = useInfobaseData();

  // Create a lookup map for O(1) access instead of O(n) find() calls
  const developerMap = useMemo(
    () => new Map(developers.map((dev) => [dev.id, dev])),
    [developers]
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
          Error Loading Developers
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
      items={developers.map((dev) => ({
        id: dev.id,
        name: dev.name,
      }))}
      getItemSubtitle={(item) => {
        const dev = developerMap.get(item.id);
        return dev ? `${dev.manufacturer} · ${dev.type}` : '';
      }}
      getDetailFields={(item): DetailField[] => {
        const dev = developerMap.get(item.id);
        if (!dev) return [];

        return [
          { label: 'Manufacturer', value: dev.manufacturer },
          { label: 'Type', value: dev.type },
          {
            label: 'Use',
            value: dev.filmOrPaper ? 'Film & Paper' : 'Paper Only',
          },
          { label: 'Description', value: dev.description, fullWidth: true },
          {
            label: 'Dilutions',
            value:
              dev.dilutions && dev.dilutions.length > 0 ? (
                <ul className="list-inside list-disc space-y-1">
                  {dev.dilutions.map((dilution, idx) => (
                    <li key={`${dilution.id}-${idx}`}>
                      {dilution.name}: {dilution.dilution}
                    </li>
                  ))}
                </ul>
              ) : (
                'No dilutions specified'
              ),
            fullWidth: true,
          },
          {
            label: 'Mixing Instructions',
            value: dev.mixingInstructions,
            fullWidth: true,
          },
          {
            label: 'Storage Requirements',
            value: dev.storageRequirements,
            fullWidth: true,
          },
          {
            label: 'Safety Notes',
            value: dev.safetyNotes,
            fullWidth: true,
          },
          {
            label: 'Additional Notes',
            value: dev.notes,
            fullWidth: true,
          },
        ];
      }}
      searchFilter={(item, query) => {
        const dev = developerMap.get(item.id);
        if (!dev) return false;

        const normalizedQuery = query.toLowerCase().trim();
        return (
          dev.name.toLowerCase().includes(normalizedQuery) ||
          dev.manufacturer.toLowerCase().includes(normalizedQuery) ||
          dev.type.toLowerCase().includes(normalizedQuery)
        );
      }}
      emptyMessage="No developers found"
      emptyDetailMessage="Select a developer to view details"
    />
  );
}
