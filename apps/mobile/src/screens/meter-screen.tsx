import {
  formatAperture,
  formatShutterSpeed,
  STANDARD_APERTURES,
  STANDARD_ISOS,
  STANDARD_SHUTTER_SPEEDS,
  snapToStandardStop,
  useLightMeterSolver,
} from '@dorkroom/logic';
import { router, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  MeterReadout,
  type ScrubField,
} from '@/components/meter/meter-readout';
import { MeterStepper } from '@/components/meter/meter-stepper';
import { PermissionFallback } from '@/components/meter/permission-fallback';
import { RETICLE_SIZE, Reticle } from '@/components/meter/reticle';
import { ScrubOverlay, useDragOffset } from '@/components/meter/scrub-overlay';
import { SegmentedPill } from '@/components/meter/segmented-pill';
import { useCalibration } from '@/hooks/use-calibration';
import { useCameraMeter } from '@/hooks/use-camera-meter';
import { useMeterIsoLock } from '@/hooks/use-meter-iso-lock';
import { getMeterSettings, setMeterSettings } from '@/lib/meter-settings';

// Clearance for the translucent native tab bar so bottom controls stay tappable.
const TAB_BAR_CLEARANCE = 64;
const CALIBRATION_STEP = 0.1;

type MeteringMode = 'matrix' | 'spot';
const MODE_OPTIONS = [
  { label: 'Matrix', value: 'matrix' as const },
  { label: 'Spot', value: 'spot' as const },
];

const ISO_OPTIONS = STANDARD_ISOS.map((o) => ({
  value: o.value,
  label: String(o.value),
}));

type SelectorTarget = 'aperture' | 'shutter' | 'iso';

export function MeterScreen() {
  const insets = useSafeAreaInsets();
  const { offset: calibrationOffset, adjust: handleCalibrationChange } =
    useCalibration();
  const meter = useCameraMeter(calibrationOffset);
  const { hasPermission, requestPermission } = meter;
  // Seed the solver from the last persisted locked setting + ISO (read once).
  const initialSettings = useMemo(() => getMeterSettings(), []);
  const solver = useLightMeterSolver(meter.ev, initialSettings);
  const isFocused = useIsFocused();
  // Lock the meter ISO to the active roll's rated EI (default on, tap to unlock).
  const { rollIso, isoLocked, toggleLock } = useMeterIsoLock(
    solver.iso,
    solver.setIso
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

  // Each setting is drag-scrubbable. Dragging aperture/shutter commits a value
  // and locks it (sets that priority); ISO never changes priority. A calculated
  // setting starts the scrub from its displayed (solved + snapped) value.
  const fields = useMemo<Record<SelectorTarget, ScrubField>>(() => {
    const sol = solver.solution;
    const apertureLocked = solver.priority === 'aperture';
    const shutterLocked = solver.priority === 'shutter';
    return {
      aperture: {
        caption: 'aperture',
        accessibilityLabel: 'Aperture',
        options: STANDARD_APERTURES,
        value: apertureLocked
          ? solver.aperture
          : snapToStandardStop(sol.aperture, STANDARD_APERTURES, false).standard
              .value,
        displayLabel: apertureLocked
          ? formatAperture(solver.aperture)
          : sol.isValid
            ? sol.solvedLabel
            : '—',
        onChange: (v) => {
          solver.setAperture(v);
          solver.setPriority('aperture');
        },
        brighterIsHigherIndex: false,
        locked: apertureLocked,
        calculated: !apertureLocked,
        stopError:
          !apertureLocked && sol.isValid ? sol.solvedStopError : undefined,
      },
      shutter: {
        caption: 'shutter',
        accessibilityLabel: 'Shutter',
        options: STANDARD_SHUTTER_SPEEDS,
        value: shutterLocked
          ? solver.shutterSpeed
          : snapToStandardStop(sol.shutterSpeed, STANDARD_SHUTTER_SPEEDS, true)
              .standard.value,
        displayLabel: shutterLocked
          ? formatShutterSpeed(solver.shutterSpeed)
          : sol.isValid
            ? sol.solvedLabel
            : '—',
        onChange: (v) => {
          solver.setShutterSpeed(v);
          solver.setPriority('shutter');
        },
        brighterIsHigherIndex: false,
        locked: shutterLocked,
        calculated: !shutterLocked,
        stopError:
          !shutterLocked && sol.isValid ? sol.solvedStopError : undefined,
      },
      iso: {
        caption: 'ISO',
        accessibilityLabel: 'ISO',
        options: ISO_OPTIONS,
        value: solver.iso,
        displayLabel: String(solver.iso),
        onChange: solver.setIso,
        brighterIsHigherIndex: true,
        locked: false,
        calculated: false,
      },
    };
  }, [solver]);

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

      {/* Log shot + ISO lock (left) + calibration (right). */}
      <View
        pointerEvents="box-none"
        style={[styles.topStrip, { top: insets.top + 8 }]}
      >
        <View style={styles.topLeftGroup}>
          <Pressable
            onPress={() => {
              const a = fields.aperture.value;
              const s = fields.shutter.value;
              router.push(
                `/film-log/shot?source=meter&aperture=${a}&shutter=${s}&meteredIso=${solver.iso}`
              );
            }}
            accessibilityRole="button"
            accessibilityLabel="Log this reading to a film roll"
            style={styles.logButton}
          >
            <Text style={styles.logButtonText}>＋ Log</Text>
          </Pressable>
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topLeftGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
    alignItems: 'flex-end',
    gap: 10,
  },
  resultsPanel: {
    alignSelf: 'stretch',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
});
