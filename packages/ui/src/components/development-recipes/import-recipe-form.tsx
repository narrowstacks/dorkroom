import { useState } from 'react';
import { TextInput } from '../text-input';
import { cn } from '../../lib/cn';

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
        label="Shared recipe code or URL"
        placeholder="Paste a shared recipe link or encoded recipe data"
        value={encoded}
        onValueChange={setEncoded}
      />
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
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
