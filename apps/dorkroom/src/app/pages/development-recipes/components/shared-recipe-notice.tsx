import { LiveStatusAlert } from '@dorkroom/ui';

interface SharedRecipeNoticeProps {
  isLoading: boolean;
  message: string | null;
  onDismiss: () => void;
}

/**
 * Status of a `?recipe=…&source=share` link, shown at the top of the page so
 * it is visible on load. A failure (invalid or unknown recipe) is an alert
 * that stays until dismissed; loading is announced politely. Both live
 * regions stay mounted and empty until there is something to say, because a
 * region that mounts together with its text is not reliably announced (#585).
 */
export function SharedRecipeNotice({
  isLoading,
  message,
  onDismiss,
}: SharedRecipeNoticeProps) {
  return (
    <>
      <LiveStatusAlert
        action="error"
        message={message}
        onDismiss={onDismiss}
        dismissLabel="Dismiss shared recipe message"
      />
      <output className="contents">
        {isLoading && !message && (
          <span className="block rounded-lg border border-[color:var(--color-border-secondary)] p-3 text-sm text-[color:var(--color-text-secondary)]">
            Loading shared recipe…
          </span>
        )}
      </output>
    </>
  );
}
