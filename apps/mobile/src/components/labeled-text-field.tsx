import { Text, TextInput, View } from 'react-native';

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
}

export function LabeledTextField({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  placeholder,
  autoFocus = false,
  onSubmitEditing,
}: LabeledTextFieldProps) {
  return (
    <View className="gap-1">
      <Text className="text-sm text-white/60">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#71717a"
        // eslint-disable-next-line jsx-a11y/no-autofocus -- opt-in (default off); used only by the Custom ISO pop-up whose sole purpose is immediate numeric entry
        autoFocus={autoFocus}
        onSubmitEditing={onSubmitEditing}
        returnKeyType="done"
        className="rounded-xl bg-white/10 px-4 py-3 text-base text-white"
      />
    </View>
  );
}
