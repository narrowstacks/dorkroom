import { Search, X } from 'lucide-react-native';
import { Pressable, TextInput, View } from 'react-native';
import { useDimInk } from '@/theme/use-phase-accent';

interface SearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  onFocus?: () => void;
}

/**
 * Controlled search input with a leading magnifier and a clear button.
 * Debouncing is the caller's concern — this stays presentational.
 */
export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search film or developer',
  onFocus,
}: SearchBarProps) {
  const placeholderColor = useDimInk('#71717a');
  return (
    <View className="flex-row items-center gap-2 rounded-xl border-hw border-line bg-surface px-3">
      <Search size={18} color="#a1a1aa" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        keyboardAppearance="dark"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="never"
        className="flex-1 py-3 text-base text-white"
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={8}
        >
          <X size={18} color="#a1a1aa" />
        </Pressable>
      ) : null}
    </View>
  );
}
