import { useCameraExposureCalculator } from '@dorkroom/logic';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';
import { EquivalentExposureList } from '@/components/camera-exposure/equivalent-exposure-list';
import { EvPresetGrid } from '@/components/camera-exposure/ev-preset-grid';
import { ExposureTriangleFields } from '@/components/camera-exposure/exposure-triangle-fields';
import {
  describeComparison,
  formatPresetWarning,
  formatSettings,
  formatSignedStops,
  SOLVE_FOR_OPTIONS,
} from '@/components/camera-exposure/format';
import { FormulaRow } from '@/components/formula-row';
import { GlassCard } from '@/components/glass-card';
import { ResultCard } from '@/components/result-card';
import { ResultRow } from '@/components/result-row';
import { ResultStat } from '@/components/result-stat';
import { Screen } from '@/components/screen';
import { SectionLabel } from '@/components/section-label';
import { SegmentedControl } from '@/components/segmented-control';
import { ShareButton } from '@/components/share-button';
import { WarningsCard } from '@/components/warnings-card';
import { buildCameraExposureShare } from '@/lib/share-text';

const SOLVE_FOR_LABEL = 'When selecting a preset, adjust';

export function CameraExposureScreen() {
  const {
    values,
    set,
    applyPreset,
    presetWarning,
    exposureValue,
    equivalentExposures,
    comparison,
  } = useCameraExposureCalculator();

  // Counts preset taps so the announcement below re-fires when the same
  // out-of-range preset is tapped again and the warning text is unchanged.
  const [presetTaps, setPresetTaps] = useState(0);
  const onPresetSelect = (ev: number) => {
    applyPreset(ev);
    setPresetTaps((n) => n + 1);
  };

  const warning = presetWarning
    ? formatPresetWarning(presetWarning, values)
    : null;

  // The notice appears below the preset grid the user just tapped, often off
  // screen, so VoiceOver is told about it directly. Queued so it is spoken
  // after the activated preset button rather than dropped (iOS only option).
  // Keyed on the tap count as well as the text: a warning only ever comes
  // from a preset tap, and each such tap should be announced.
  useEffect(() => {
    if (presetTaps > 0 && warning) {
      AccessibilityInfo.announceForAccessibilityWithOptions(warning, {
        queue: true,
      });
    }
  }, [presetTaps, warning]);

  const settings = formatSettings(
    values.aperture,
    values.shutterSpeed,
    values.iso
  );

  return (
    <Screen>
      <GlassCard className="gap-3">
        <SectionLabel>Exposure A</SectionLabel>
        <ExposureTriangleFields
          aperture={values.aperture}
          shutterSpeed={values.shutterSpeed}
          iso={values.iso}
          onApertureChange={(v) => set('aperture', v)}
          onShutterSpeedChange={(v) => set('shutterSpeed', v)}
          onIsoChange={(v) => set('iso', v)}
        />
      </GlassCard>

      {/* No invalid-EV fallback: the pickers only offer positive standard
          values and hydration only accepts positive numbers. */}
      <ResultCard accent="violet" className="gap-3">
        <ResultStat
          accent="violet"
          label="Exposure value"
          value={`EV ${exposureValue.ev}`}
          helper={exposureValue.description}
        />
        <FormulaRow
          formula={`EV = log₂(N² × 100 / (t × S)) = ${exposureValue.ev}`}
        />
        <ResultRow label="Settings" value={settings} />
        <ShareButton
          message={buildCameraExposureShare({
            settings,
            ev: exposureValue.ev,
            description: exposureValue.description,
          })}
        />
      </ResultCard>

      <GlassCard className="gap-3">
        <SectionLabel>Lighting presets</SectionLabel>
        <Text className="text-sm text-white/60">
          Pick a scene. The calculator adjusts the value you choose to match.
        </Text>
        <Text
          className="text-sm text-white/60"
          // Each segment speaks this label itself (see accessibilityLabel).
          accessibilityElementsHidden
        >
          {SOLVE_FOR_LABEL}
        </Text>
        <SegmentedControl
          accent="violet"
          accessibilityLabel={SOLVE_FOR_LABEL}
          options={SOLVE_FOR_OPTIONS}
          value={values.solveFor}
          onChange={(v) => set('solveFor', v)}
        />
        <EvPresetGrid onSelect={onPresetSelect} />
      </GlassCard>

      <WarningsCard warnings={warning ? [warning] : []} />

      {exposureValue.isValid && equivalentExposures.length > 0 ? (
        <GlassCard className="gap-3">
          <SectionLabel>{`Equivalent exposures · EV ${exposureValue.ev} at ISO ${values.iso}`}</SectionLabel>
          <EquivalentExposureList exposures={equivalentExposures} />
        </GlassCard>
      ) : null}

      <GlassCard className="gap-3">
        <SectionLabel>Compare with exposure B</SectionLabel>
        <ExposureTriangleFields
          aperture={values.compareAperture}
          shutterSpeed={values.compareShutterSpeed}
          iso={values.compareIso}
          onApertureChange={(v) => set('compareAperture', v)}
          onShutterSpeedChange={(v) => set('compareShutterSpeed', v)}
          onIsoChange={(v) => set('compareIso', v)}
          labelSuffix="B"
        />
        {comparison.isValid ? (
          <View className="gap-1 pt-1">
            <ResultStat
              label="Stops difference"
              value={formatSignedStops(comparison.stopsDifference)}
              helper={describeComparison(comparison)}
            />
            <ResultRow label="Exposure A" value={`EV ${comparison.evA}`} />
            <ResultRow label="Exposure B" value={`EV ${comparison.evB}`} />
          </View>
        ) : null}
      </GlassCard>
    </Screen>
  );
}
