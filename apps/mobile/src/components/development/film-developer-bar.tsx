import { ChevronDown, X } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { selectionTint } from '@/theme/accents';

export interface FilmDeveloperBarProps {
  /** e.g. "Kodak Tri-X 400"; null = no selection. */
  filmLabel: string | null;
  /** e.g. "Kodak D-76"; null = no selection. */
  developerLabel: string | null;
  onPressFilm: () => void;
  onPressDeveloper: () => void;
  onClearFilm: () => void;
  onClearDeveloper: () => void;
}

const tint = selectionTint('green');

/**
 * Always-visible Film / Developer selectors above the recipe list — the two
 * most important selections get top billing instead of being buried in the
 * Sort & filter sheet. Each cell opens the matching OptionPickerSheet; a
 * selected cell shows a clear (X) button instead of the chevron.
 */
export function FilmDeveloperBar({
  filmLabel,
  developerLabel,
  onPressFilm,
  onPressDeveloper,
  onClearFilm,
  onClearDeveloper,
}: FilmDeveloperBarProps) {
  return (
    <View className="flex-row gap-3">
      <BarCell
        eyebrow="Film"
        label={filmLabel}
        placeholder="All films"
        onPress={onPressFilm}
        onClear={onClearFilm}
        clearAccessibilityLabel="Clear film"
      />
      <BarCell
        eyebrow="Developer"
        label={developerLabel}
        placeholder="All developers"
        onPress={onPressDeveloper}
        onClear={onClearDeveloper}
        clearAccessibilityLabel="Clear developer"
      />
    </View>
  );
}

function BarCell({
  eyebrow,
  label,
  placeholder,
  onPress,
  onClear,
  clearAccessibilityLabel,
}: {
  eyebrow: string;
  label: string | null;
  placeholder: string;
  onPress: () => void;
  onClear: () => void;
  clearAccessibilityLabel: string;
}) {
  const selected = label !== null;

  return (
    <View
      className={`flex-1 flex-row items-center rounded-xl px-4 py-3 ${
        selected ? '' : 'bg-white/10'
      }`}
      style={
        selected
          ? {
              backgroundColor: tint.backgroundColor,
              borderWidth: 1,
              borderColor: tint.borderColor,
            }
          : undefined
      }
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${eyebrow}: ${label ?? placeholder}`}
        className="flex-1"
      >
        <Text className="text-xs uppercase tracking-wide text-white/40">
          {eyebrow}
        </Text>
        <Text
          className={selected ? 'text-base' : 'text-base text-white/70'}
          style={
            selected ? { color: tint.color, fontWeight: '600' } : undefined
          }
          numberOfLines={1}
        >
          {label ?? placeholder}
        </Text>
      </Pressable>
      {selected ? (
        <Pressable
          onPress={onClear}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={clearAccessibilityLabel}
          className="pl-2"
        >
          <X size={14} color={tint.color} />
        </Pressable>
      ) : (
        <ChevronDown size={14} color="#71717a" />
      )}
    </View>
  );
}
