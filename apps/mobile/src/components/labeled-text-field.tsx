import { Text, TextInput, View } from 'react-native';

interface LabeledTextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  placeholder?: string;
}

export function LabeledTextField({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  placeholder,
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
        className="rounded-xl bg-white/10 px-4 py-3 text-base text-white"
      />
    </View>
  );
}
