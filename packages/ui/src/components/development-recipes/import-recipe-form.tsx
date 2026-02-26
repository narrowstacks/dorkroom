import { useForm } from '@tanstack/react-form';
import { TanStackTextInput } from '../../forms/components/tanstack-text-input';
import { importRecipeSchema } from '../../forms/schemas/import-recipe.schema';
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
  const form = useForm({
    defaultValues: {
      encoded: '',
    },
    validators: {
      onChange: importRecipeSchema,
    },
    onSubmit: async ({ value }) => {
      onImport(value.encoded.trim());
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-4 text-sm"
      style={{ color: 'var(--color-text-secondary)' }}
    >
      <form.Field name="encoded">
        {(field) => (
          <TanStackTextInput
            field={field}
            label="Recipe import"
            description="Paste a filmdev.org URL, recipe ID (e.g., 5001), or shared recipe code"
            placeholder="Paste a filmdev.org URL, recipe ID (e.g., 5001), or shared recipe code"
          />
        )}
      </form.Field>

      {error && (
        <div
          className="rounded-xl border px-3 py-2 text-sm"
          style={{
            borderColor: colorMixOr(
              'var(--color-semantic-error)',
              20,
              'transparent',
              'var(--color-border-secondary)'
            ),
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
        >
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 pt-1 md:flex-row md:justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border px-4 py-2 text-sm font-medium transition"
            style={{
              borderColor: 'var(--color-border-secondary)',
              color: 'var(--color-text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border-primary)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor =
                'var(--color-border-secondary)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            Cancel
          </button>
        )}
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit, isSubmitting]) => (
            <button
              type="submit"
              disabled={!canSubmit || isProcessing || isSubmitting}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition',
                (!canSubmit || isProcessing || isSubmitting) &&
                  'cursor-not-allowed opacity-70'
              )}
              style={{
                backgroundColor: 'var(--color-text-primary)',
                color: 'var(--color-background)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              {isProcessing || isSubmitting ? 'Importing…' : 'Import recipe'}
            </button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
