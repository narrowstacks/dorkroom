import { type SFSymbol, SymbolView } from 'expo-symbols';
import { Pressable, Text, View } from 'react-native';
import { LabeledGroup } from '@/components/labeled-group';
import { Screen } from '@/components/screen';
import { Surface } from '@/components/surface';
import { ToolIcon } from '@/components/tool-icon';
import { favoritesEditorSections, MAX_FAVORITES } from '@/lib/favorites';
import {
  addFavoriteTool,
  moveFavoriteTool,
  removeFavoriteTool,
  useFavoriteIds,
} from '@/lib/favorites-store';
import type { Tool } from '@/lib/tools';
import { PHASE_ACCENT } from '@/theme/accents';
import { PhaseProvider } from '@/theme/phase-context';
import { SAFELIGHT } from '@/theme/safelight';
import {
  useAccentColor,
  useDimInk,
  useModeColor,
} from '@/theme/use-phase-accent';

interface IconButtonProps {
  symbol: SFSymbol;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  color: string;
}

/** A 44pt glyph button at the end of a row. */
function IconButton({
  symbol,
  label,
  onPress,
  disabled = false,
  color,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      className={`items-center justify-center active:opacity-60 ${disabled ? 'opacity-30' : ''}`}
      style={{ width: 44, height: 44 }}
    >
      <SymbolView name={symbol} size={20} tintColor={color} />
    </Pressable>
  );
}

function ToolLabel({ tool }: { tool: Tool }) {
  const hue = useAccentColor(PHASE_ACCENT[tool.phase]);
  return (
    <View className="flex-1 flex-row items-center gap-3">
      <ToolIcon name={tool.icon} color={hue} />
      <Text className="flex-1 text-base text-white">{tool.label}</Text>
    </View>
  );
}

interface FavoriteRowProps {
  tool: Tool;
  first: boolean;
  last: boolean;
}

function FavoriteRow({ tool, first, last }: FavoriteRowProps) {
  const ink = useDimInk('rgba(255,255,255,0.8)');
  const remove = useModeColor('#fb7185', SAFELIGHT.text);
  return (
    <View className="min-h-11 flex-row items-center gap-1 py-1 pl-4 pr-1">
      <ToolLabel tool={tool} />
      <IconButton
        symbol="chevron.up"
        label={`Move ${tool.label} up`}
        disabled={first}
        color={ink}
        onPress={() => moveFavoriteTool(tool.id, -1)}
      />
      <IconButton
        symbol="chevron.down"
        label={`Move ${tool.label} down`}
        disabled={last}
        color={ink}
        onPress={() => moveFavoriteTool(tool.id, 1)}
      />
      <IconButton
        symbol="minus.circle"
        label={`Remove ${tool.label} from favorites`}
        color={remove}
        onPress={() => removeFavoriteTool(tool.id)}
      />
    </View>
  );
}

function AddRow({ tool, full }: { tool: Tool; full: boolean }) {
  const hue = useAccentColor(PHASE_ACCENT[tool.phase]);
  return (
    <View className="min-h-11 flex-row items-center gap-1 py-1 pl-4 pr-1">
      <ToolLabel tool={tool} />
      <IconButton
        symbol="plus.circle"
        label={`Add ${tool.label} to favorites`}
        disabled={full}
        color={hue}
        onPress={() => addFavoriteTool(tool.id)}
      />
    </View>
  );
}

/**
 * Edit favorites (#734), pushed from Home's favorites row: the favorites in
 * order with up, down and remove, then every other tool by phase with an add
 * button. Changes save at once; the Home row and the Favorites widget follow
 * the store. It reads no route params.
 */
export function FavoritesScreen() {
  const ids = useFavoriteIds();
  const { favorites, others, full } = favoritesEditorSections(ids);
  return (
    // Belongs to no phase, like Settings beside it: the neutral backdrop.
    <PhaseProvider value={null}>
      <Screen>
        {favorites.length > 0 ? (
          <LabeledGroup
            title="Favorites"
            footer="Shown in this order at the bottom of Search and in the Favorites widget."
          >
            {favorites.map((tool, index) => (
              <FavoriteRow
                key={tool.id}
                tool={tool}
                first={index === 0}
                last={index === favorites.length - 1}
              />
            ))}
          </LabeledGroup>
        ) : (
          <Surface>
            <Text className="text-sm text-ink-60">
              No favorites yet. Add the tools you use most, and they show at the
              bottom of Search and in the Favorites widget.
            </Text>
          </Surface>
        )}

        {others.map((section, index) => (
          <LabeledGroup
            key={section.phase}
            title={section.label}
            footer={
              full && index === 0
                ? `Favorites are full (${MAX_FAVORITES}). Remove one to add another.`
                : undefined
            }
          >
            {section.tools.map((tool) => (
              <AddRow key={tool.id} tool={tool} full={full} />
            ))}
          </LabeledGroup>
        ))}
      </Screen>
    </PhaseProvider>
  );
}
