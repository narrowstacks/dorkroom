import { Pressable, Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { ToolIcon } from '@/components/tool-icon';
import type { Tool } from '@/lib/tools';
import { PHASE_ACCENT } from '@/theme/accents';
import { useAccentColor } from '@/theme/use-phase-accent';

interface ToolTileProps {
  tool: Tool;
  /** The tool's last result, or its blurb. */
  secondary: string;
  onPress: () => void;
  /** Exact width; the grid sets it so tiles never size to their text. */
  width: number;
}

// Fits the icon and two lines of text at the largest Dynamic Type sizes.
const TILE_MIN_HEIGHT = 128;

/**
 * One tool on a phase hub: icon in the phase hue, label, one secondary line.
 * A fixed width from the grid; a long label wraps inside it. Tiles in a row
 * share a height because the row stretches them and the card fills its tile.
 */
export function ToolTile({ tool, secondary, onPress, width }: ToolTileProps) {
  const hue = useAccentColor(PHASE_ACCENT[tool.phase]);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${tool.label}, ${secondary}`}
      className="active:opacity-60"
      style={{ width }}
    >
      <GlassCard
        className="gap-3"
        style={{ flex: 1, width: '100%', minHeight: TILE_MIN_HEIGHT }}
      >
        <ToolIcon name={tool.icon} size={24} color={hue} />
        <View className="items-start gap-0.5">
          <Text className="text-left text-base font-semibold text-white">
            {tool.label}
          </Text>
          <Text className="text-left text-sm text-ink-60">{secondary}</Text>
        </View>
      </GlassCard>
    </Pressable>
  );
}
