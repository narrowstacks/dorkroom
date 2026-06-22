import {
  STANDARD_APERTURES,
  STANDARD_ISOS,
  STANDARD_SHUTTER_SPEEDS,
  useLightMeterSolver,
} from '@dorkroom/logic';
import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera } from 'react-native-vision-camera';
import { MeterReadout } from '@/components/meter/meter-readout';
import { MeterStepper } from '@/components/meter/meter-stepper';
import { PermissionFallback } from '@/components/meter/permission-fallback';
import { PriorityToggle } from '@/components/meter/priority-toggle';
import { Reticle } from '@/components/meter/reticle';
import { ValueWheel } from '@/components/meter/value-wheel';
import { useCameraMeter } from '@/hooks/use-camera-meter';
import {
  getCalibrationOffset,
  setCalibrationOffset,
} from '@/lib/meter-calibration';

// Clearance for the translucent native tab bar so bottom controls stay tappable.
const TAB_BAR_CLEARANCE = 64;

export default function MeterScreen() {
  const insets = useSafeAreaInsets();
  const [calibrationOffset, setCalibrationState] =
    useState(getCalibrationOffset);
  const handleCalibrationChange = useCallback((delta: number) => {
    setCalibrationState((prev) => {
      const next = Math.round((prev + delta) * 100) / 100;
      setCalibrationOffset(next);
      return next;
    });
  }, []);
  const meter = useCameraMeter(calibrationOffset);
  const { hasPermission, requestPermission } = meter;
  const solver = useLightMeterSolver(meter.ev);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!hasPermission) void requestPermission();
  }, [hasPermission, requestPermission]);

  const stepIso = useCallback(
    (direction: number) => {
      const current = STANDARD_ISOS.findIndex((o) => o.value === solver.iso);
      const index = Math.min(
        Math.max(current + direction, 0),
        STANDARD_ISOS.length - 1
      );
      const next = STANDARD_ISOS[index];
      if (next) solver.setIso(next.value);
    },
    [solver]
  );

  if (!meter.hasPermission) {
    return (
      <PermissionFallback onRequest={() => void meter.requestPermission()} />
    );
  }
  if (meter.device == null) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>No camera device available.</Text>
      </View>
    );
  }

  const isAperture = solver.priority === 'aperture';
  const wheelOptions = isAperture
    ? STANDARD_APERTURES
    : STANDARD_SHUTTER_SPEEDS;
  const wheelValue = isAperture ? solver.aperture : solver.shutterSpeed;
  const onWheelChange = isAperture
    ? solver.setAperture
    : solver.setShutterSpeed;
  const calLabel = `CAL ${calibrationOffset > 0 ? '+' : ''}${calibrationOffset.toFixed(2)}`;

  return (
    <View style={styles.container}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={(e) =>
          void meter.meterAtPoint({
            x: e.nativeEvent.locationX,
            y: e.nativeEvent.locationY,
          })
        }
      >
        <Camera
          ref={meter.cameraRef}
          style={StyleSheet.absoluteFill}
          device={meter.device}
          isActive={isFocused}
          onPreviewStarted={meter.onInitialized}
        />
        <Reticle />
      </Pressable>

      {/* Top strip: ISO (left), calibration (right). */}
      <View
        pointerEvents="box-none"
        style={[styles.topStrip, { top: insets.top + 8 }]}
      >
        <MeterStepper
          label={`ISO ${solver.iso}`}
          onDecrement={() => stepIso(-1)}
          onIncrement={() => stepIso(1)}
          decrementLabel="Lower film speed"
          incrementLabel="Raise film speed"
        />
        <MeterStepper
          label={calLabel}
          onDecrement={() => handleCalibrationChange(-1 / 3)}
          onIncrement={() => handleCalibrationChange(1 / 3)}
          decrementLabel="Lower calibration"
          incrementLabel="Raise calibration"
        />
      </View>

      {/* Results LCD: mid-left, display-only so taps meter the scene. */}
      <View pointerEvents="none" style={styles.readout}>
        <MeterReadout
          ev={meter.ev}
          isLocked={meter.isLocked}
          priority={solver.priority}
          aperture={solver.aperture}
          shutterSpeed={solver.shutterSpeed}
          solution={solver.solution}
        />
      </View>

      {/* Vertical command-dial: right edge, vertically centered. */}
      <View pointerEvents="box-none" style={styles.wheel}>
        <ValueWheel
          key={solver.priority}
          options={wheelOptions}
          value={wheelValue}
          onChange={onWheelChange}
          accessibilityLabel={
            isAperture ? 'Aperture selector' : 'Shutter speed selector'
          }
        />
      </View>

      {/* Priority toggle, lifted clear of the tab bar. */}
      <View
        pointerEvents="box-none"
        style={[styles.bottom, { bottom: insets.bottom + TAB_BAR_CLEARANCE }]}
      >
        <PriorityToggle value={solver.priority} onChange={solver.setPriority} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0c' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b0b0c',
  },
  text: { color: '#f5f5f4' },
  topStrip: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readout: { position: 'absolute', left: 20, top: '34%' },
  wheel: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  bottom: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
