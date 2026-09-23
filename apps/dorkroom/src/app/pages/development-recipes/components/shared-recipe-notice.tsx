import { StatusAlert } from '@dorkroom/ui';

interface SharedRecipeNoticeProps {
  isLoading: boolean;
  message: string | null;
  onDismiss: () => void;
}

/**
 * Status of a `?recipe=…&source=share` link, shown at the top of the page so
 * it is visible on load. A failure (invalid or unknown recipe) is an alert
 * that stays until dismissed; loading is announced politely.
 */
export function SharedRecipeNotice({
  isLoading,
  message,
  onDismiss,
}: SharedRecipeNoticeProps) {
  if (message) {
    return (
      <StatusAlert
        action="error"
        message={message}
        onDismiss={onDismiss}
        dismissLabel="Dismiss shared recipe message"
      />
    );
  }

  if (isLoading) {
    return (
      <output className="block rounded-lg border border-[color:var(--color-border-secondary)] p-3 text-sm text-[color:var(--color-text-secondary)]">
        Loading shared recipe…
      </output>
    );
  }

  return null;
}
