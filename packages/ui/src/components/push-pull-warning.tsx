import { ArrowDown, ArrowUp } from 'lucide-react';

/** Color tokens for push/pull warnings */
export const PUSH_PULL_WARNING_COLORS = {
  push: {
    border: 'var(--color-semantic-warning)',
    background: 'rgba(234, 179, 8, 0.1)',
    icon: 'var(--color-semantic-warning)',
  },
  pull: {
    border: 'var(--color-semantic-info, #3b82f6)',
    background: 'rgba(59, 130, 246, 0.1)',
    icon: 'var(--color-semantic-info, #3b82f6)',
  },
} as const;

interface PushPullWarningProps {
  /** The shooting ISO used for this recipe */
  shootingIso: number;
  /** Number of stops pushed (positive) or pulled (negative), 0 = box speed */
  pushPull: number;
}

/**
 * Warning banner for recipes using pushed or pulled film.
 * Shows when pushPull is non-zero.
 *
 * - Pushed film (positive): Yellow/warning color with up arrow
 * - Pulled film (negative): Blue/info color with down arrow
 *
 * Only renders when film is pushed or pulled (pushPull !== 0).
 */
export function PushPullWarning({
  shootingIso,
  pushPull,
}: PushPullWarningProps) {
  if (pushPull === 0) {
    return null;
  }

  const isPushed = pushPull > 0;
  const stops = Math.abs(pushPull);
  const stopsText = stops === 1 ? '1 stop' : `${stops} stops`;

  const colors = isPushed
    ? PUSH_PULL_WARNING_COLORS.push
    : PUSH_PULL_WARNING_COLORS.pull;

  const Icon = isPushed ? ArrowUp : ArrowDown;
  const actionWord = isPushed ? 'pushed' : 'pulled';
  return (
    <div
      className="flex items-start gap-2 rounded-lg border p-3 text-sm"
      style={{
        borderColor: colors.border,
        backgroundColor: colors.background,
      }}
    >
      <Icon
        className="mt-0.5 h-4 w-4 shrink-0"
        style={{ color: colors.icon }}
      />
      <div style={{ color: 'var(--color-text-secondary)' }}>
        <div className="font-semibold">
          For {actionWord} film: ISO {shootingIso}
        </div>
        <div className="italic">
          ({actionWord} {stopsText})
        </div>
        <div className="mt-1">
          This recipe is for {actionWord} film.
          <p>
            Make sure you {actionWord} your film to ISO {shootingIso} before
            using this recipe.
          </p>
        </div>
      </div>
    </div>
  );
}
