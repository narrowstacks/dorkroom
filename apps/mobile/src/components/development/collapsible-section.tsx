import { ChevronDown } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { GlassCard } from '@/components/glass-card';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  defaultExpanded?: boolean;
  children: ReactNode;
}

/**
 * A GlassCard whose body expands/collapses on header tap. The chevron rotates
 * via Reanimated; the body fades in when shown.
 */
export function CollapsibleSection({
  title,
  subtitle,
  defaultExpanded = false,
  children,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const rotation = useSharedValue(defaultExpanded ? 180 : 0);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    rotation.value = withTiming(next ? 180 : 0, { duration: 200 });
  };

  return (
    <GlassCard className="gap-0">
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        className="flex-row items-center justify-between gap-3"
      >
        <View className="flex-1">
          <Text className="text-base font-semibold text-white">{title}</Text>
          {subtitle ? (
            <Text className="text-sm text-white/50" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Animated.View style={chevronStyle}>
          <ChevronDown size={20} color="#a1a1aa" />
        </Animated.View>
      </Pressable>
      {expanded ? (
        <Animated.View entering={FadeIn.duration(180)} className="mt-3">
          {children}
        </Animated.View>
      ) : null}
    </GlassCard>
  );
}
