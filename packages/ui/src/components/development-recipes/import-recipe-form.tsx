import { useState } from 'react';
import { TextInput } from '../text-input';
import { cn } from '../../lib/cn';
import { colorMixOr } from '../../lib/color';

interface ImportRecipeFormProps {
  onImport: (encoded: string) => void;
  onCancel?: () => void;
  isProcessing?: boolean;
  error?: string | null;
}

export function ImportRecipeForm({
  onImport,
  onCancel,
  isProcessing,
  error,
}: ImportRecipeFormProps) {
  const [encoded, setEncoded] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onImport(encoded.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm text-white/80">
      <TextInput
        label="Recipe import"
        description="Paste a filmdev.org URL, recipe ID (e.g., 5001), or shared recipe code"
        placeholder="Paste a filmdev.org URL, recipe ID (e.g., 5001), or shared recipe code"
        value={encoded}
        onValueChange={setEncoded}
      />
      {error && (
        <div
          className="rounded-xl border px-3 py-2 text-sm"
          style={{
            borderColor: colorMixOr('var(--color-semantic-error)', 20, 'transparent', 'var(--color-border-secondary)'),
            backgroundColor: colorMixOr('var(--color-semantic-error)', 10, 'transparent', 'var(--color-border-muted)'),
            color: colorMixOr('var(--color-semantic-error)', 80, 'var(--color-text-primary)', 'var(--color-semantic-error)'),
          }}
        >
          {error}
        </div>
      )}
      <div className="flex flex-col gap-3 pt-1 md:flex-row md:justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!encoded.trim() || isProcessing}
          className={cn(
            'rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90',
            (isProcessing || !encoded.trim()) && 'cursor-not-allowed opacity-70'
          )}
        >
          {isProcessing ? 'Importing…' : 'Import recipe'}
        </button>
      </div>
    </form>
  );
}
