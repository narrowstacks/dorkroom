import {
  STANDARD_APERTURES,
  STANDARD_ISOS,
  STANDARD_SHUTTER_SPEEDS,
  useLightMeterSolver,
} from '@dorkroom/logic';
import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera } from 'react-native-vision-camera';
import { MeterReadout } from '@/components/meter/meter-readout';
import { MeterStepper } from '@/components/meter/meter-stepper';
import {
  type MeteringMode,
  MeteringModeToggle,
} from '@/components/meter/metering-mode-toggle';
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
const CALIBRATION_STEP = 0.1;
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
      // Step in tenths from an integer count of steps so it never float-drifts.
      const next = Math.round((prev + delta) * 10) / 10;
      setCalibrationOffset(next);
      return next;
    });
  }, []);
  const meter = useCameraMeter(calibrationOffset);
  const { hasPermission, requestPermission } = meter;
  const solver = useLightMeterSolver(meter.ev);
  const isFocused = useIsFocused();
  const [meteringMode, setMeteringMode] = useState<MeteringMode>('center');
  const [meterPoint, setMeterPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  // Frame size is only read inside handlers (to spot-meter center), so a ref
  // keeps layout updates from triggering re-renders.
  const sizeRef = useRef<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!hasPermission) void requestPermission();
  }, [hasPermission, requestPermission]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    sizeRef.current = {
      width: e.nativeEvent.layout.width,
      height: e.nativeEvent.layout.height,
    };
  }, []);

  const enterCenter = useCallback(() => {
    setMeteringMode('center');
    setMeterPoint(null);
    void meter.unlock();
  }, [meter]);

  const enterSpot = useCallback(
    (point: { x: number; y: number }) => {
      setMeteringMode('spot');
      setMeterPoint(point);
      void meter.meterAtPoint(point);
    },
    [meter]
  );

  const handleModeChange = useCallback(
    (mode: MeteringMode) => {
      if (mode === 'center') {
        enterCenter();
      } else {
        // Spot from the button meters the center of the frame.
        const frame = sizeRef.current;
        enterSpot({ x: (frame?.width ?? 0) / 2, y: (frame?.height ?? 0) / 2 });
      }
    },
    [enterCenter, enterSpot]
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
  const isSpot = meteringMode === 'spot';
  const wheelOptions = isAperture
    ? STANDARD_APERTURES
    : STANDARD_SHUTTER_SPEEDS;
  const wheelValue = isAperture ? solver.aperture : solver.shutterSpeed;
  const onWheelChange = isAperture
    ? solver.setAperture
    : solver.setShutterSpeed;
  const calLabel = `CAL ${calibrationOffset > 0 ? '+' : ''}${calibrationOffset.toFixed(1)}`;

  return (
    <View style={styles.container} onLayout={onLayout}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={(e) =>
          enterSpot({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY })
        }
      >
        <Camera
          ref={meter.cameraRef}
          style={StyleSheet.absoluteFill}
          device={meter.device}
          isActive={isFocused}
          onPreviewStarted={meter.onInitialized}
        />
      </Pressable>

      {/* Reticle: centered in center-weighted mode, on the tapped point in spot. */}
      <View
        pointerEvents="none"
        style={[
          styles.reticle,
          isSpot && meterPoint
            ? {
                left: meterPoint.x - RETICLE_SIZE / 2,
                top: meterPoint.y - RETICLE_SIZE / 2,
              }
            : styles.reticleCenter,
        ]}
      >
        <Reticle locked={isSpot} />
      </View>

      {/* Metering-mode switch, top-center. */}
      <View
        pointerEvents="box-none"
        style={[styles.modeBar, { top: insets.top + 8 }]}
      >
        <MeteringModeToggle value={meteringMode} onChange={handleModeChange} />
      </View>

      {/* Calibration, top-right. */}
      <View
        pointerEvents="box-none"
        style={[styles.topStrip, { top: insets.top + 8 }]}
      >
        <MeterStepper
          label={calLabel}
          onDecrement={() => handleCalibrationChange(-CALIBRATION_STEP)}
          onIncrement={() => handleCalibrationChange(CALIBRATION_STEP)}
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
  modeBar: {
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
