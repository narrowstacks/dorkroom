const plural = (n: string, unit: string) =>
  `${n.replace(',', '.')} ${unit}${Number(n.replace(',', '.')) === 1 ? '' : 's'}`;

const NUMBER = String.raw`(\d+(?:[.,]\d+)?)`;

/**
 * A formatted duration ("15.12s", "2m 5s", "1m30s", "2h") in words for
 * VoiceOver, which would otherwise read "15.12 s" or "2 m".
 */
export function spokenDuration(formatted: string): string {
  return formatted
    .replace(new RegExp(`${NUMBER}h(?![a-z])`, 'gi'), (_, n: string) =>
      plural(n, 'hour')
    )
    .replace(new RegExp(`${NUMBER}m(?![a-z])`, 'gi'), (_, n: string) =>
      plural(n, 'minute')
    )
    .replace(new RegExp(`${NUMBER}s(?![a-z])`, 'gi'), (_, n: string) =>
      plural(n, 'second')
    )
    .replace(/([a-z])(\d)/g, '$1 $2');
}

/** A duration field's text in words: a bare number is seconds. */
export function spokenSeconds(text: string): string {
  const trimmed = text.trim();
  return spokenDuration(/^[\d.,]+$/.test(trimmed) ? `${trimmed}s` : trimmed);
}
