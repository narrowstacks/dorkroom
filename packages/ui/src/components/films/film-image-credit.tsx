import type { FC } from 'react';
import { cn } from '../../lib/cn';

interface FilmImageCreditProps {
  /** Who took the photo, and its licence. */
  credit: string | null;
  /** Page the photo came from. */
  sourceUrl: string | null;
  className?: string;
}

/**
 * Returns the URL only when it is http(s). The source URL is free text from the
 * admin, so anything else (a `javascript:` URL, a typo) must not become a link.
 */
function toSafeHref(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}

/**
 * Credit line under a film's packaging photo: "Photo: {credit}", linked to the
 * source page when there is a safe one. Renders nothing when neither is set.
 */
export const FilmImageCredit: FC<FilmImageCreditProps> = ({
  credit,
  sourceUrl,
  className,
}) => {
  const href = toSafeHref(sourceUrl);
  const label = credit?.trim() || (href ? 'source' : null);
  if (!label) return null;

  return (
    <p
      className={cn(
        'text-xs text-center text-[color:var(--color-text-muted)]',
        className
      )}
    >
      Photo:{' '}
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
        >
          {label}
        </a>
      ) : (
        label
      )}
    </p>
  );
};
