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
import { RETICLE_SIZE, Reticle } from '@/components/meter/reticle';
import { ValueWheel } from '@/components/meter/value-wheel';
import { useCameraMeter } from '@/hooks/use-camera-meter';
import {
  getCalibrationOffset,
  setCalibrationOffset,
} from '@/lib/meter-calibration';

// Clearance for the translucent native tab bar so bottom controls stay tappable.
const TAB_BAR_CLEARANCE = 64;
const MONO = { fontFamily: 'Menlo' } as const;
const SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.85)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const;

// ISO wheel shows the bare number; the caption labels it.
const ISO_OPTIONS = STANDARD_ISOS.map((o) => ({
  value: o.value,
  label: String(o.value),
}));

const CAPTION = 'pr-2 text-xs uppercase tracking-widest text-white/55';

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
  const [meterPoint, setMeterPoint] = useState<{ x: number; y: number } | null>(
    null
  );

  useEffect(() => {
    if (!hasPermission) void requestPermission();
  }, [hasPermission, requestPermission]);

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
        onPress={(e) => {
          const point = {
            x: e.nativeEvent.locationX,
            y: e.nativeEvent.locationY,
          };
          setMeterPoint(point);
          void meter.meterAtPoint(point);
        }}
      >
        <Camera
          ref={meter.cameraRef}
          style={StyleSheet.absoluteFill}
          device={meter.device}
          isActive={isFocused}
          onPreviewStarted={meter.onInitialized}
        />
      </Pressable>

      {/* Reticle on the metered point (screen center until the first tap). */}
      <View
        pointerEvents="none"
        style={[
          styles.reticle,
          meterPoint
            ? {
                left: meterPoint.x - RETICLE_SIZE / 2,
                top: meterPoint.y - RETICLE_SIZE / 2,
              }
            : styles.reticleCenter,
        ]}
      >
        <Reticle locked={meter.isLocked} />
      </View>

      {/* Unlock control: prominent while exposure is locked. */}
      {meter.isLocked ? (
        <View
          pointerEvents="box-none"
          style={[styles.lockBar, { top: insets.top + 48 }]}
        >
          <Pressable
            onPress={() => {
              setMeterPoint(null);
              void meter.unlock();
            }}
            accessibilityRole="button"
            accessibilityLabel="Unlock exposure and resume live metering"
            className="flex-row items-center rounded-full bg-rose-600/90 px-4 py-2"
            style={{ gap: 8 }}
          >
            <Text
              style={[MONO, SHADOW]}
              className="text-sm font-bold text-white"
            >
              ● AE LOCKED — tap to resume
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Top strip: calibration (right). */}
      <View
        pointerEvents="box-none"
        style={[styles.topStrip, { top: insets.top + 8 }]}
      >
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
          priority={solver.priority}
          iso={solver.iso}
          aperture={solver.aperture}
          shutterSpeed={solver.shutterSpeed}
          solution={solver.solution}
        />
      </View>

      {/* Stacked command-dials on the right: ISO above the exposure value. */}
      <View pointerEvents="box-none" style={styles.wheelColumn}>
        <View style={styles.wheelGroup}>
          <Text style={[MONO, SHADOW]} className={CAPTION}>
            ISO
          </Text>
          <ValueWheel
            options={ISO_OPTIONS}
            value={solver.iso}
            onChange={solver.setIso}
            accessibilityLabel="ISO selector"
            visibleCount={3}
          />
        </View>
        <View style={styles.wheelGroup}>
          <Text style={[MONO, SHADOW]} className={CAPTION}>
            {isAperture ? 'f-stop' : 'shutter'}
          </Text>
          <ValueWheel
            key={solver.priority}
            options={wheelOptions}
            value={wheelValue}
            onChange={onWheelChange}
            accessibilityLabel={
              isAperture ? 'Aperture selector' : 'Shutter speed selector'
            }
            visibleCount={5}
          />
        </View>
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
  reticle: { position: 'absolute' },
  reticleCenter: {
    left: '50%',
    top: '50%',
    marginLeft: -RETICLE_SIZE / 2,
    marginTop: -RETICLE_SIZE / 2,
  },
  lockBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  topStrip: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  readout: { position: 'absolute', left: 20, top: '30%' },
  wheelColumn: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 16,
  },
  wheelGroup: { alignItems: 'flex-end', gap: 2 },
  bottom: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
