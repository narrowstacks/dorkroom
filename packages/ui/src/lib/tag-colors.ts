import { colorMixOr } from './color';

interface TagColorConfig {
  bg: string;
  text: string;
  border?: string;
}

interface TagThemeStyle {
  backgroundColor: string;
  color: string;
  borderColor?: string;
}

// Legacy Tailwind colors - deprecated, use getTagThemeStyle instead
export const TAG_COLORS: Record<string, TagColorConfig> = {
  'official-ilford': {
    bg: 'bg-green-500/20',
    text: 'text-green-200',
    border: 'border-green-500/30',
  },
  'official-kodak': {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-200',
    border: 'border-yellow-500/30',
  },
  'official-fuji': {
    bg: 'bg-blue-500/20',
    text: 'text-blue-200',
    border: 'border-blue-500/30',
  },
  community: {
    bg: 'bg-red-500/20',
    text: 'text-red-200',
    border: 'border-red-500/30',
  },
};

const DEFAULT_TAG_COLORS: TagColorConfig = {
  bg: 'bg-gray-500/20',
  text: 'text-gray-200',
  border: 'border-gray-500/30',
};

export function getTagColors(tag: string): TagColorConfig {
  return TAG_COLORS[tag] || DEFAULT_TAG_COLORS;
}

/**
 * Produce a theme-aware style object for a tag using CSS custom properties.
 *
 * Returns an object with `backgroundColor`, `color`, and `borderColor` suitable for use as inline CSS values; each value is derived from tag-specific CSS variables with sensible fallbacks when the variable is not defined.
 *
 * @param tag - Tag identifier. Recognized values: `'official-ilford'`, `'official-kodak'`, `'official-fuji'`, and `'community'`. Any other value yields the default tag style.
 * @returns The computed TagThemeStyle containing `backgroundColor`, `color`, and `borderColor` CSS values.
 */
export function getTagThemeStyle(tag: string): TagThemeStyle {
  switch (tag) {
    case 'official-ilford':
      return {
        backgroundColor: colorMixOr(
          'var(--color-tag-official-ilford)',
          20,
          'transparent',
          'var(--color-border-muted)'
        ),
        color: colorMixOr(
          'var(--color-tag-official-ilford)',
          80,
          'var(--color-text-primary)',
          'var(--color-text-primary)'
        ),
        borderColor: colorMixOr(
          'var(--color-tag-official-ilford)',
          30,
          'transparent',
          'var(--color-border-secondary)'
        ),
      };
    case 'official-kodak':
      return {
        backgroundColor: colorMixOr(
          'var(--color-tag-official-kodak)',
          20,
          'transparent',
          'var(--color-border-muted)'
        ),
        color: colorMixOr(
          'var(--color-tag-official-kodak)',
          80,
          'var(--color-text-primary)',
          'var(--color-text-primary)'
        ),
        borderColor: colorMixOr(
          'var(--color-tag-official-kodak)',
          30,
          'transparent',
          'var(--color-border-secondary)'
        ),
      };
    case 'official-fuji':
      return {
        backgroundColor: colorMixOr(
          'var(--color-tag-official-fuji)',
          20,
          'transparent',
          'var(--color-border-muted)'
        ),
        color: colorMixOr(
          'var(--color-tag-official-fuji)',
          80,
          'var(--color-text-primary)',
          'var(--color-text-primary)'
        ),
        borderColor: colorMixOr(
          'var(--color-tag-official-fuji)',
          30,
          'transparent',
          'var(--color-border-secondary)'
        ),
      };
    case 'community':
      return {
        backgroundColor: colorMixOr(
          'var(--color-tag-community)',
          20,
          'transparent',
          'var(--color-border-muted)'
        ),
        color: colorMixOr(
          'var(--color-tag-community)',
          80,
          'var(--color-text-primary)',
          'var(--color-text-primary)'
        ),
        borderColor: colorMixOr(
          'var(--color-tag-community)',
          30,
          'transparent',
          'var(--color-border-secondary)'
        ),
      };
    default:
      return {
        backgroundColor: colorMixOr(
          'var(--color-tag-default)',
          20,
          'transparent',
          'var(--color-border-muted)'
        ),
        color: colorMixOr(
          'var(--color-tag-default)',
          80,
          'var(--color-text-primary)',
          'var(--color-text-primary)'
        ),
        borderColor: colorMixOr(
          'var(--color-tag-default)',
          30,
          'transparent',
          'var(--color-border-secondary)'
        ),
      };
  }
}
