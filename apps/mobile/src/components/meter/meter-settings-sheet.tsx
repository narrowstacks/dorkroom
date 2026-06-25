import { Text, View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { MeterStepper } from '@/components/meter/meter-stepper';

const CALIBRATION_STEP = 0.1;

interface MeterSettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  calibrationOffset: number;
  onCalibrationChange: (delta: number) => void;
}

/**
 * Meter-specific settings, shown as a bottom-sheet popup from the meter screen's
 * top-left gear. Holds calibration — moved out of the always-on top-right
 * stepper so a set-once value no longer occupies premium camera real estate.
 */
export function MeterSettingsSheet({
  visible,
  onClose,
  calibrationOffset,
  onCalibrationChange,
}: MeterSettingsSheetProps) {
  const calLabel = `${calibrationOffset > 0 ? '+' : ''}${calibrationOffset.toFixed(1)} EV`;
  return (
    <BottomSheet visible={visible} title="Meter settings" onClose={onClose}>
      <View className="flex-row items-center justify-between rounded-xl bg-white/5 px-4 py-3">
        <View className="flex-1 pr-3">
          <Text className="text-base text-white">Calibration</Text>
          <Text className="text-xs text-white/50">
            Offset every reading to match a reference meter.
          </Text>
        </View>
        <MeterStepper
          label={calLabel}
          onDecrement={() => onCalibrationChange(-CALIBRATION_STEP)}
          onIncrement={() => onCalibrationChange(CALIBRATION_STEP)}
          decrementLabel="Lower calibration"
          incrementLabel="Raise calibration"
        />
      </View>
    </BottomSheet>
  );
}
