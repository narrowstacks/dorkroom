import * as Linking from 'expo-linking';
import { ExternalLink } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

interface LinkRowProps {
  label: string;
  url: string;
  sublabel?: string;
}

/** A tappable row that opens an external URL (recipe info source, film DB). */
export function LinkRow({ label, url, sublabel }: LinkRowProps) {
  return (
    <Pressable
      onPress={() => {
        void Linking.openURL(url);
      }}
      accessibilityRole="link"
      accessibilityLabel={label}
      className="flex-row items-center justify-between gap-3 py-2 active:opacity-60"
    >
      <View className="flex-1">
        <Text className="text-base text-white" numberOfLines={1}>
          {label}
        </Text>
        {sublabel ? (
          <Text className="text-sm text-white/50" numberOfLines={1}>
            {sublabel}
          </Text>
        ) : null}
      </View>
      <ExternalLink size={18} color="#a1a1aa" />
    </Pressable>
  );
}
