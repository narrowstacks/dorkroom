import type { EquivalentExposure } from '@dorkroom/logic';
import { Text, View } from 'react-native';
import { useSafelight } from '@/components/safelight/safelight-provider';
import { SAFELIGHT } from '@/theme/safelight';
import { useAccentColor } from '@/theme/use-phase-accent';

interface EquivalentExposureListProps {
  exposures: EquivalentExposure[];
}

/** Aperture / shutter pairs at the same EV, the current pair highlighted. */
export function EquivalentExposureList({
  exposures,
}: EquivalentExposureListProps) {
  const yellow = useAccentColor('yellow');
  const { on: safelight } = useSafelight();
  return (
    <View>
      <View className="flex-row border-b border-edge px-2 pb-2">
        <Text className="flex-1 text-sm text-ink-50">Aperture</Text>
        <Text className="flex-1 text-sm text-ink-50">Shutter speed</Text>
      </View>
      {exposures.map((eq) => (
        <View
          key={eq.apertureLabel}
          accessible
          // The current row keeps its fill; under safelight (no fill) it gets an
          // outline instead, so the highlight does not rest on colour.
          style={
            safelight && eq.isCurrentSetting
              ? { borderWidth: 1, borderColor: SAFELIGHT.outlineSelected }
              : undefined
          }
          accessibilityLabel={`${eq.apertureLabel} at ${eq.shutterSpeedLabel}${
            eq.isCurrentSetting ? ', current setting' : ''
          }`}
          className={`flex-row items-center border-b border-edge-faint px-2 py-2 ${
            eq.isCurrentSetting ? 'rounded-lg bg-surface' : ''
          }`}
        >
          <Text
            className={`flex-1 text-base ${
              eq.isCurrentSetting ? 'font-semibold' : 'text-ink-80'
            }`}
            style={eq.isCurrentSetting ? { color: yellow } : undefined}
          >
            {eq.apertureLabel}
          </Text>
          <Text
            className={`flex-1 text-base ${
              eq.isCurrentSetting ? 'font-semibold' : 'text-ink-80'
            }`}
            style={eq.isCurrentSetting ? { color: yellow } : undefined}
          >
            {eq.shutterSpeedLabel}
            {eq.isCurrentSetting ? '  · current' : ''}
          </Text>
        </View>
      ))}
      <Text className="mt-2 text-xs text-ink-50">
        Shutter speeds rounded to the nearest dial setting
      </Text>
    </View>
  );
}
