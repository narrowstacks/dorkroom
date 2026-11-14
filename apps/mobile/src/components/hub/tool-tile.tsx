import { Link, router } from 'expo-router';
import { Star } from 'lucide-react-native';
import { AccessibilityInfo, Pressable, Text, View } from 'react-native';
import { Surface } from '@/components/surface';
import { ToolIcon } from '@/components/tool-icon';
import { toHref } from '@/lib/href';
import type { Tool } from '@/lib/tools';
import { PHASE_ACCENT } from '@/theme/accents';
import { useAccentColor, useDimInk } from '@/theme/use-phase-accent';
import {
  favoriteActionLabel,
  favoriteMenuSubtitle,
  favoriteStarClearance,
  STAR_INSET,
  STAR_SIZE,
  toolTileHint,
  toolTileLabel,
} from './tool-tile-text';

interface ToolTileProps {
  tool: Tool;
  /** The tool's last result, or its blurb. */
  secondary: string;
  /** Exact width; the grid sets it so tiles never size to their text. A wide
   * tile ignores it and fills the row. */
  width: number;
  /** The last tile of an odd grid: spans both columns, icon at the left. */
  wide?: boolean;
  /** The tool is a favorite: a small star, and the menu offers Remove. */
  favorite: boolean;
  /** Favorites are full, so Add is offered disabled. */
  favoritesFull: boolean;
  onToggleFavorite: () => void;
}

// Fits the icon and two lines of text at the largest Dynamic Type sizes.
const TILE_MIN_HEIGHT = 128;
const WIDE_TILE_MIN_HEIGHT = 72;

type TileAction = 'toggleFavorite';

/**
 * One tool on a phase hub: icon in the phase hue, label, one secondary line,
 * on a flat surface. A fixed width from the grid; a long label wraps inside
 * it. Tiles in a row share a height because the row stretches them and the
 * surface fills its tile. A wide tile puts the icon beside the text.
 *
 * A tap opens the tool (pushed on the hub). A long press shows a native
 * context menu (expo-router `Link.Menu`, as a frame row's) with "Add to
 * favorites" or "Remove from favorites"; VoiceOver gets the same as a custom
 * action. A favorite shows a small star in the top corner.
 */
export function ToolTile({
  tool,
  secondary,
  width,
  wide = false,
  favorite,
  favoritesFull,
  onToggleFavorite,
}: ToolTileProps) {
  const hue = useAccentColor(PHASE_ACCENT[tool.phase]);
  const starInk = useDimInk('rgba(255,255,255,0.6)');
  const href = toHref(tool.route);
  const canToggle = favorite || !favoritesFull;
  // Offered even when the list is full, so VoiceOver can find it and hear why
  // it does nothing (the menu shows the same item disabled with the reason).
  const actions: { name: TileAction; label: string }[] = [
    { name: 'toggleFavorite', label: favoriteActionLabel(favorite) },
  ];
  const fullReason = favoriteMenuSubtitle(favorite, favoritesFull);
  const textClearance = favoriteStarClearance(favorite);
  return (
    // The VoiceOver element is this wrapper, not the Pressable: `Link.Menu`
    // mounts its trigger in a native view with `display: contents`, and the
    // accessibility tree skips that view's subtree (see FrameRow). A
    // double-tap is `onAccessibilityTap`.
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={toolTileLabel(tool.label, secondary, favorite)}
      accessibilityHint={toolTileHint(favorite, favoritesFull)}
      accessibilityActions={actions}
      onAccessibilityTap={() => router.push(href)}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName !== 'toggleFavorite') return;
        if (canToggle) onToggleFavorite();
        else if (fullReason) {
          AccessibilityInfo.announceForAccessibility(fullReason);
        }
      }}
      style={wide ? { flex: 1 } : { width }}
    >
      <Link href={href} push asChild>
        <Link.Trigger>
          <Pressable className="active:opacity-60" style={{ flex: 1 }}>
            <Surface
              className={wide ? 'flex-row items-center gap-4' : 'gap-3'}
              style={{
                flex: 1,
                width: '100%',
                minHeight: wide ? WIDE_TILE_MIN_HEIGHT : TILE_MIN_HEIGHT,
              }}
            >
              <ToolIcon name={tool.icon} size={24} color={hue} />
              <View
                className={
                  wide ? 'flex-1 items-start gap-0.5' : 'items-start gap-0.5'
                }
                // Clear of the star, so it never overlaps the text at large
                // sizes (the wide tile's text runs to the right edge).
                style={{ paddingRight: textClearance }}
              >
                <Text className="text-left text-base font-semibold text-white">
                  {tool.label}
                </Text>
                <Text className="text-left text-sm text-ink-60">
                  {secondary}
                </Text>
              </View>
              {favorite ? (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: STAR_INSET,
                    right: STAR_INSET,
                  }}
                >
                  <Star size={STAR_SIZE} color={starInk} fill={starInk} />
                </View>
              ) : null}
            </Surface>
          </Pressable>
        </Link.Trigger>
        <Link.Menu>
          <Link.MenuAction
            icon={favorite ? 'star.slash' : 'star'}
            disabled={!canToggle}
            subtitle={fullReason}
            onPress={onToggleFavorite}
          >
            {favoriteActionLabel(favorite)}
          </Link.MenuAction>
        </Link.Menu>
      </Link>
    </View>
  );
}
