import { router } from 'expo-router';
import { Pencil, Plus } from 'lucide-react-native';
import { useState } from 'react';
import {
  FlatList,
  type ListRenderItemInfo,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  type EdgeInsets,
  SafeAreaListener,
} from 'react-native-safe-area-context';
import { GlassCard } from '@/components/glass-card';
import { useSafelight } from '@/components/safelight/safelight-provider';
import { ToolIcon } from '@/components/tool-icon';
import { toHref } from '@/lib/href';
import { openToolPath } from '@/lib/open-tool-path';
import { FAVORITES_ROUTE } from '@/lib/tools';
import { PHASE_ACCENT } from '@/theme/accents';
import { SAFELIGHT } from '@/theme/safelight';
import { useAccentColor, useDimInk } from '@/theme/use-phase-accent';
import {
  FAVORITE_TILE_MAX_FONT_SCALE,
  favoritesBarBottom,
  favoritesBarFrame,
  type FavoritesBarItem,
  favoritesBarItemHint,
  favoritesBarItemLabel,
  favoriteTileIconSize,
} from './favorites-bar-layout';

interface FavoritesBarProps {
  items: readonly FavoritesBarItem[];
  /** The row's measured height, for the scroll content's bottom padding. */
  onHeight: (height: number) => void;
}

const sameInsets = (a: EdgeInsets | null, b: EdgeInsets) =>
  a !== null &&
  a.bottom === b.bottom &&
  a.left === b.left &&
  a.right === b.right;

const itemKey = (item: FavoritesBarItem) =>
  item.kind === 'tool' ? item.tool.id : item.kind;

const renderTile = ({ item }: ListRenderItemInfo<FavoritesBarItem>) => (
  <Tile item={item} />
);

const openEditor = () => router.navigate(toHref(FAVORITES_ROUTE));

function Tile({ item }: { item: FavoritesBarItem }) {
  const { fontScale } = useWindowDimensions();
  const iconSize = favoriteTileIconSize(fontScale);
  const quiet = useDimInk('rgba(255,255,255,0.6)');
  const hue = useAccentColor(
    PHASE_ACCENT[item.kind === 'tool' ? item.tool.phase : 'print']
  );
  const glyph =
    item.kind === 'tool' ? (
      <ToolIcon name={item.tool.icon} size={iconSize} color={hue} />
    ) : item.kind === 'add' ? (
      <Plus size={iconSize} color={quiet} />
    ) : (
      <Pencil size={iconSize} color={quiet} />
    );
  const label = item.kind === 'tool' ? item.tool.label : 'Edit';
  return (
    <Pressable
      onPress={() =>
        item.kind === 'tool' ? openToolPath(item.tool.route) : openEditor()
      }
      accessibilityRole="button"
      accessibilityLabel={favoritesBarItemLabel(item)}
      accessibilityHint={favoritesBarItemHint(item)}
      className="min-h-11 flex-row items-center gap-2 rounded-2xl px-3 py-2 active:opacity-60"
    >
      {glyph}
      <Text
        maxFontSizeMultiplier={FAVORITE_TILE_MAX_FONT_SCALE}
        numberOfLines={1}
        className={
          item.kind === 'tool'
            ? 'text-sm font-semibold text-white'
            : 'text-sm text-ink-60'
        }
      >
        {item.kind === 'add' ? 'Add favorites' : label}
      </Text>
    </Pressable>
  );
}

/**
 * Home's favorites row (#734): pinned over the bottom of the screen, just above
 * the tab bar (and the timer pill while a run is going), so the user's tools
 * stay under the thumb while the results scroll behind it. It is rendered
 * AFTER Home's scroll view, as an absolutely positioned sibling, so the scroll
 * view stays the screen's first subview (see "Large titles" in CLAUDE.md).
 *
 * Its bottom comes from this screen's own insets (`SafeAreaListener`, like the
 * stage panel: the root provider does not know the tab bar or the pill), and
 * nothing is drawn until they arrive, so it never flashes under the tab bar.
 * Glass, as a control floating over scrolling content in the tab bar's band,
 * over a dark underlay so text behind it never shows through; under safelight
 * the underlay is true black and the glass gives way to a hairline. More tiles
 * than fit scroll sideways; the labels follow Dynamic Type to a cap.
 */
export function FavoritesBar({ items, onHeight }: FavoritesBarProps) {
  const [insets, setInsets] = useState<EdgeInsets | null>(null);
  const { on: safelight } = useSafelight();
  const { width: windowWidth } = useWindowDimensions();
  const frame = favoritesBarFrame(
    windowWidth,
    insets?.left ?? 0,
    insets?.right ?? 0
  );
  return (
    <SafeAreaListener
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}
      onChange={({ insets: next }) =>
        setInsets((current) => (sameInsets(current, next) ? current : next))
      }
    >
      {insets ? (
        <View
          onLayout={(e) => onHeight(e.nativeEvent.layout.height)}
          style={{
            position: 'absolute',
            left: frame.left,
            width: frame.width,
            bottom: favoritesBarBottom(insets.bottom),
            borderRadius: 24,
            overflow: 'hidden',
            backgroundColor: safelight
              ? SAFELIGHT.background
              : 'rgba(7,7,8,0.72)',
          }}
        >
          <GlassCard flush style={{ borderRadius: 24 }}>
            <FlatList
              horizontal
              alwaysBounceHorizontal={false}
              data={items}
              keyExtractor={itemKey}
              renderItem={renderTile}
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 4, gap: 4 }}
            />
          </GlassCard>
        </View>
      ) : null}
    </SafeAreaListener>
  );
}
