import { useLightMeterSolver } from '@dorkroom/logic';
import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CameraPhotoOutput } from 'react-native-vision-camera';
import { Camera, usePhotoOutput } from 'react-native-vision-camera';
import { BlurPanel } from '@/components/meter/blur-panel';
import { MeterCaptureControls } from '@/components/meter/meter-capture-controls';
import { MeterReadout } from '@/components/meter/meter-readout';
import { MeterRollPill } from '@/components/meter/meter-roll-pill';
import { MeterStepper } from '@/components/meter/meter-stepper';
import { MeterToast } from '@/components/meter/meter-toast';
import { PermissionFallback } from '@/components/meter/permission-fallback';
import { RETICLE_SIZE, Reticle } from '@/components/meter/reticle';
import { ScrubOverlay, useDragOffset } from '@/components/meter/scrub-overlay';
import { SegmentedPill } from '@/components/meter/segmented-pill';
import { useCalibration } from '@/hooks/use-calibration';
import { useCameraMeter } from '@/hooks/use-camera-meter';
import { useMeterCapture } from '@/hooks/use-meter-capture';
import { useMeterIsoLock } from '@/hooks/use-meter-iso-lock';
import {
  type SelectorTarget,
  useMeterScrubFields,
} from '@/hooks/use-meter-scrub-fields';
import { useShutterFlash } from '@/hooks/use-shutter-flash';
import { useToast } from '@/hooks/use-toast';
import { getMeterSettings, setMeterSettings } from '@/lib/meter-settings';

// Clearance for the translucent native tab bar so bottom controls stay tappable.
const TAB_BAR_CLEARANCE = 64;
const CALIBRATION_STEP = 0.1;

type MeteringMode = 'matrix' | 'spot';
const MODE_OPTIONS = [
  { label: 'Matrix', value: 'matrix' as const },
  { label: 'Spot', value: 'spot' as const },
];

export function MeterScreen() {
  const insets = useSafeAreaInsets();
  const { offset: calibrationOffset, adjust: handleCalibrationChange } =
    useCalibration();
  const meter = useCameraMeter(calibrationOffset);
  const { hasPermission, requestPermission } = meter;
  // Still-photo output for the shutter; kept in a ref so the capture hook reads
  // the latest instance without re-subscribing each render. Force JPEG (the iOS
  // default is HEIC, which Skia's grayscale pass can't decode).
  const photoOutput = usePhotoOutput({ containerFormat: 'jpeg' });
  const photoOutputRef = useRef<CameraPhotoOutput | null>(photoOutput);
  photoOutputRef.current = photoOutput;
  const capture = useMeterCapture(photoOutputRef);
  const { flashStyle, triggerFlash } = useShutterFlash();
  // Seed the solver from the last persisted locked setting + ISO (read once).
  const initialSettings = useMemo(() => getMeterSettings(), []);
  const solver = useLightMeterSolver(meter.ev, initialSettings);
  const isFocused = useIsFocused();
  // Lock the meter ISO to the active roll's rated EI (default on, tap to unlock).
  const { rollIso, isoLocked, toggleLock } = useMeterIsoLock(
    solver.iso,
    solver.setIso
  );
  const { message: toastMessage, show: showToast } = useToast();
  const onIsoBlocked = useCallback(
    () => showToast('Unlock EI in the upper left to pick an ISO'),
    [showToast]
  );
  const [meteringMode, setMeteringMode] = useState<MeteringMode>('matrix');
  const [meterPoint, setMeterPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  // The active scrub: which setting and the option index the drag started from.
  // Set on grab, cleared on release — drives the floating wheel.
  const [scrub, setScrub] = useState<{
    target: SelectorTarget;
    baseIndex: number;
  } | null>(null);
  // Live drag offset (px) the active scrubber writes and the wheel reads, so it
  // glides on the native side without re-rendering this screen each frame.
  const dragY = useDragOffset();
  // Frame size is only read inside handlers (to spot-meter center), so a ref
  // keeps layout updates from triggering re-renders.
  const sizeRef = useRef<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!hasPermission) void requestPermission();
  }, [hasPermission, requestPermission]);

  // Persist the locked setting (priority + both values) and ISO so they survive
  // tab changes and app restarts.
  useEffect(() => {
    setMeterSettings({
      priority: solver.priority,
      aperture: solver.aperture,
      shutterSpeed: solver.shutterSpeed,
      iso: solver.iso,
    });
  }, [solver.priority, solver.aperture, solver.shutterSpeed, solver.iso]);

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
        const frame = sizeRef.current;
        // Wait until we know the frame size; otherwise spot-metering would
        // target the top-left corner (0,0) instead of the center.
        if (!frame) return;
        enterSpot({ x: frame.width / 2, y: frame.height / 2 });
      }
    },
    [enterMatrix, enterSpot]
  );

  // Each setting (aperture / shutter / ISO) as a drag-scrubbable field. The
  // roll's rated EI is injected into the ISO options and accented.
  const fields = useMeterScrubFields(solver, rollIso, isoLocked, onIsoBlocked);

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

  const isSpot = meteringMode === 'spot';
  const calLabel = `CAL ${calibrationOffset > 0 ? '+' : ''}${calibrationOffset.toFixed(1)}`;

  return (
    <View style={styles.container} onLayout={onLayout}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={(e) => {
          enterSpot({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
        }}
      >
        <Camera
          ref={meter.cameraRef}
          style={StyleSheet.absoluteFill}
          device={meter.device}
          isActive={isFocused}
          onPreviewStarted={meter.onInitialized}
          outputs={[photoOutput]}
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

      {/* ISO lock (left) + calibration (right). */}
      <View
        pointerEvents="box-none"
        style={[styles.topStrip, { top: insets.top + 8 }]}
      >
        <View style={styles.topLeftGroup}>
          {rollIso != null ? (
            <Pressable
              onPress={toggleLock}
              accessibilityRole="button"
              accessibilityState={{ selected: isoLocked }}
              accessibilityLabel={
                isoLocked
                  ? `ISO locked to roll EI ${rollIso}. Tap to unlock.`
                  : `ISO unlocked. Tap to lock to roll EI ${rollIso}.`
              }
              style={styles.logButton}
            >
              <Text style={styles.logButtonText}>
                {isoLocked ? `🔒 EI ${rollIso}` : '🔓 ISO'}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <MeterStepper
          label={calLabel}
          onDecrement={() => handleCalibrationChange(-CALIBRATION_STEP)}
          onIncrement={() => handleCalibrationChange(CALIBRATION_STEP)}
          decrementLabel="Lower calibration"
          incrementLabel="Raise calibration"
        />
      </View>

      {/* Which roll captures log to — centered below the status row. */}
      <View
        pointerEvents="box-none"
        style={[styles.rollPillWrap, { top: insets.top + 52 }]}
      >
        <MeterRollPill />
      </View>

      {/* Bottom: the live scrub value (while dragging) or the mode toggle,
          above the results readout. */}
      <View
        pointerEvents="box-none"
        style={[
          styles.bottomStack,
          { bottom: insets.bottom + TAB_BAR_CLEARANCE },
        ]}
      >
        {scrub ? (
          <ScrubOverlay
            field={fields[scrub.target]}
            baseIndex={scrub.baseIndex}
            dragY={dragY}
          />
        ) : (
          <SegmentedPill
            options={MODE_OPTIONS}
            value={meteringMode}
            onChange={handleModeChange}
            accessibilityLabel="Matrix or spot metering"
          />
        )}
        <BlurPanel style={styles.resultsPanel}>
          <MeterReadout
            ev={meter.ev}
            aperture={fields.aperture}
            shutter={fields.shutter}
            iso={fields.iso}
            outOfRange={solver.solution.outOfRange}
            dragY={dragY}
            onScrubStart={(target, baseIndex) =>
              setScrub({ target, baseIndex })
            }
            onScrubEnd={() => setScrub(null)}
          />
        </BlurPanel>
      </View>

      {/* Bottom-center shutter + confirm sheet (extracted to keep the screen
          lean; capture state lives in useMeterCapture). */}
      <MeterCaptureControls
        capture={capture}
        aperture={fields.aperture.value}
        shutterSpeed={fields.shutter.value}
        iso={solver.iso}
        bottom={insets.bottom + TAB_BAR_CLEARANCE + 96}
        onShutter={triggerFlash}
      />

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.flash, flashStyle]}
      />

      {toastMessage ? <MeterToast message={toastMessage} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0c' },
  flash: { backgroundColor: '#ffffff' },
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topLeftGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rollPillWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  logButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  logButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  bottomStack: {
    position: 'absolute',
    left: 16,
    right: 16,
    // Left-align the mode toggle / scrub overlay so the bottom-center shutter
    // (rendered separately, absolute) sits clear of them. The readout panel
    // below is alignSelf:'stretch', so it stays full-width regardless.
    alignItems: 'flex-start',
    gap: 10,
  },
  resultsPanel: {
    alignSelf: 'stretch',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
});
