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
import { BlurPanel } from '@/components/meter/blur-panel';
import { MeterReadout } from '@/components/meter/meter-readout';
import { MeterStepper } from '@/components/meter/meter-stepper';
import { PermissionFallback } from '@/components/meter/permission-fallback';
import { RETICLE_SIZE, Reticle } from '@/components/meter/reticle';
import { SegmentedPill } from '@/components/meter/segmented-pill';
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

type MeteringMode = 'matrix' | 'spot';
const MODE_OPTIONS = [
  { label: 'Matrix', value: 'matrix' as const },
  { label: 'Spot', value: 'spot' as const },
];
// Which setting you fix; the meter solves the other.
const PRIORITY_OPTIONS = [
  { label: 'Aperture', value: 'aperture' as const },
  { label: 'Shutter', value: 'shutter' as const },
];

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
  const [meteringMode, setMeteringMode] = useState<MeteringMode>('matrix');
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

  const enterMatrix = useCallback(() => {
    setMeteringMode('matrix');
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
      if (mode === 'matrix') {
        enterMatrix();
      } else {
        // Spot from the button meters the center of the frame.
        const frame = sizeRef.current;
        enterSpot({ x: (frame?.width ?? 0) / 2, y: (frame?.height ?? 0) / 2 });
      }
    },
    [enterMatrix, enterSpot]
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

      {/* Spot reticle: only shown in spot mode, on the metered point. */}
      {isSpot && meterPoint ? (
        <View
          pointerEvents="none"
          style={[
            styles.reticle,
            {
              left: meterPoint.x - RETICLE_SIZE / 2,
              top: meterPoint.y - RETICLE_SIZE / 2,
            },
          ]}
        >
          <Reticle />
        </View>
      ) : null}

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

      {/* Command-dials on the right: ISO, exposure value, then priority. */}
      <View pointerEvents="box-none" style={styles.wheelColumn}>
        <BlurPanel style={styles.wheelPanel}>
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
          {/* Priority toggle: vertical, full words, bottom of the sidebar. */}
          <SegmentedPill
            options={PRIORITY_OPTIONS}
            value={solver.priority}
            onChange={solver.setPriority}
            orientation="vertical"
            accessibilityLabel="Aperture or shutter priority"
          />
        </BlurPanel>
      </View>

      {/* Bottom: metering-mode switch above the results strip, clear of the tabs. */}
      <View
        pointerEvents="box-none"
        style={[
          styles.bottomStack,
          { bottom: insets.bottom + TAB_BAR_CLEARANCE },
        ]}
      >
        <SegmentedPill
          options={MODE_OPTIONS}
          value={meteringMode}
          onChange={handleModeChange}
          accessibilityLabel="Matrix or spot metering"
        />
        <BlurPanel style={styles.resultsPanel}>
          <MeterReadout
            ev={meter.ev}
            priority={solver.priority}
            iso={solver.iso}
            aperture={solver.aperture}
            shutterSpeed={solver.shutterSpeed}
            solution={solver.solution}
          />
        </BlurPanel>
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
  topStrip: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  wheelColumn: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'flex-end',
    // Keep the centered dials clear of the bottom results strip.
    paddingBottom: 150,
  },
  wheelPanel: { padding: 10, gap: 14, alignItems: 'center' },
  wheelGroup: { alignItems: 'flex-end', gap: 2 },
  bottomStack: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    gap: 10,
  },
  resultsPanel: {
    alignSelf: 'stretch',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
});
