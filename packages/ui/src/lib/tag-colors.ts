interface TagColorConfig {
  bg: string;
  text: string;
  border?: string;
}

export const TAG_COLORS: Record<string, TagColorConfig> = {
  'official-ilford': {
    bg: 'bg-green-500/20',
    text: 'text-green-200',
    border: 'border-green-500/30',
  },
  // Add more tag colors here as needed
  // Example:
  // 'official-kodak': {
  //   bg: 'bg-yellow-500/20',
  //   text: 'text-yellow-200',
  //   border: 'border-yellow-500/30',
  // },
};

const DEFAULT_TAG_COLORS: TagColorConfig = {
  bg: 'bg-white/10',
  text: 'text-white/60',
  border: 'border-white/10',
};

export function getTagColors(tag: string): TagColorConfig {
  return TAG_COLORS[tag] || DEFAULT_TAG_COLORS;
}
