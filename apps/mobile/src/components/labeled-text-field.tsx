import type { Ref } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useDimInk } from '@/theme/use-phase-accent';

interface LabeledTextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  placeholder?: string;
  /** Focus the field on mount (raises the keyboard immediately). */
  autoFocus?: boolean;
  /** Fired when the keyboard's submit/return key is pressed. */
  onSubmitEditing?: () => void;
  /** Several lines, for notes. */
  multiline?: boolean;
  /** For a caller that focuses the field itself. */
  inputRef?: Ref<TextInput>;
}

export function LabeledTextField({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  placeholder,
  autoFocus = false,
  onSubmitEditing,
  multiline = false,
  inputRef,
}: LabeledTextFieldProps) {
  const placeholderColor = useDimInk('#71717a');
  return (
    <View className="gap-1">
      {/* An empty label leaves no blank line above the field. */}
      {label ? <Text className="text-sm text-ink-60">{label}</Text> : null}
      <TextInput
        ref={inputRef}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        keyboardAppearance="dark"
        // eslint-disable-next-line jsx-a11y/no-autofocus -- opt-in (default off); used only by the Custom ISO pop-up whose sole purpose is immediate numeric entry
        autoFocus={autoFocus}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={multiline ? 'default' : 'done'}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : undefined}
        // Grows to a few lines, then scrolls inside itself: the caret line is always
        // in the box, which the sheet keeps above the keyboard.
        style={multiline ? { minHeight: 88, maxHeight: 132 } : undefined}
        className="rounded-xl border-hw border-line bg-surface px-4 py-3 text-base text-white"
      />
    </View>
  );
}
