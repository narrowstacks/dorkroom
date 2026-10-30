import type { EquivalentExposure } from '@dorkroom/logic';
import { Text, View } from 'react-native';
import { ACCENT } from '@/theme/accents';

interface EquivalentExposureListProps {
  exposures: EquivalentExposure[];
}

/** Aperture / shutter pairs at the same EV, the current pair highlighted. */
export function EquivalentExposureList({
  exposures,
}: EquivalentExposureListProps) {
  return (
    <View>
      <View className="flex-row border-b border-white/10 px-2 pb-2">
        <Text className="flex-1 text-sm text-white/50">Aperture</Text>
        <Text className="flex-1 text-sm text-white/50">Shutter speed</Text>
      </View>
      {exposures.map((eq) => (
        <View
          key={eq.apertureLabel}
          accessible
          accessibilityLabel={`${eq.apertureLabel} at ${eq.shutterSpeedLabel}${
            eq.isCurrentSetting ? ', current setting' : ''
          }`}
          className={`flex-row items-center border-b border-white/5 px-2 py-2 ${
            eq.isCurrentSetting ? 'rounded-lg bg-white/10' : ''
          }`}
        >
          <Text
            className={`flex-1 text-base ${
              eq.isCurrentSetting ? 'font-semibold' : 'text-white/80'
            }`}
            style={eq.isCurrentSetting ? { color: ACCENT.violet } : undefined}
          >
            {eq.apertureLabel}
          </Text>
          <Text
            className={`flex-1 text-base ${
              eq.isCurrentSetting ? 'font-semibold' : 'text-white/80'
            }`}
            style={eq.isCurrentSetting ? { color: ACCENT.violet } : undefined}
          >
            {eq.shutterSpeedLabel}
            {eq.isCurrentSetting ? '  · current' : ''}
          </Text>
        </View>
      ))}
      <Text className="mt-2 text-xs text-white/50">
        Shutter speeds rounded to the nearest dial setting
      </Text>
    </View>
  );
}
