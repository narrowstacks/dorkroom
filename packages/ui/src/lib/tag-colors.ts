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
  'official-cinestill': {
    bg: 'bg-red-500/20',
    text: 'text-red-200',
    border: 'border-red-500/30',
  },
  'official-rollei': {
    bg: 'bg-violet-500/20',
    text: 'text-violet-200',
    border: 'border-violet-500/30',
  },
  'official-lomography': {
    bg: 'bg-pink-500/20',
    text: 'text-pink-200',
    border: 'border-pink-500/30',
  },
  'official-jch': {
    bg: 'bg-teal-500/20',
    text: 'text-teal-200',
    border: 'border-teal-500/30',
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

// Tag matching constants
const BW_TAGS = ['bw', 'b&w', 'b & w'];
const COLOR_TAGS = ['color', 'colour'];

function styleFromVar(cssVar: string): TagThemeStyle {
  return {
    backgroundColor: colorMixOr(
      cssVar,
      20,
      'transparent',
      'var(--color-border-muted)'
    ),
    color: colorMixOr(
      cssVar,
      80,
      'var(--color-text-primary)',
      'var(--color-text-primary)'
    ),
    borderColor: colorMixOr(
      cssVar,
      30,
      'transparent',
      'var(--color-border-secondary)'
    ),
  };
}

// Map of tag names to their CSS custom property variable
const TAG_CSS_VARS: Record<string, string> = {
  'official-ilford': 'var(--color-tag-official-ilford)',
  'official-kodak': 'var(--color-tag-official-kodak)',
  'official-fuji': 'var(--color-tag-official-fuji)',
  'official-cinestill': 'var(--color-tag-official-cinestill)',
  'official-rollei': 'var(--color-tag-official-rollei)',
  'official-lomography': 'var(--color-tag-official-lomography)',
  'official-jch': 'var(--color-tag-official-jch)',
  community: 'var(--color-tag-community)',
};

// Theme-aware tag styles using CSS custom properties
export function getTagThemeStyle(tag: string): TagThemeStyle {
  const normalizedTag = tag.toLowerCase();

  // Film type tags
  if (BW_TAGS.includes(normalizedTag)) {
    return styleFromVar('var(--color-tag-bw)');
  }

  if (COLOR_TAGS.includes(normalizedTag)) {
    return styleFromVar('var(--color-tag-color)');
  }

  if (normalizedTag === 'slide') {
    return styleFromVar('var(--color-tag-slide)');
  }

  const cssVar = TAG_CSS_VARS[tag];
  if (cssVar) {
    return styleFromVar(cssVar);
  }

  return styleFromVar('var(--color-tag-default)');
}
