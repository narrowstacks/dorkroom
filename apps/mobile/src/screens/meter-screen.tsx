import { useLightMeterSolver } from '@dorkroom/logic';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from 'expo-router';
import { SymbolView } from 'expo-symbols';
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
import { CustomIsoSheet } from '@/components/meter/custom-iso-sheet';
import { GlassPill } from '@/components/meter/glass-pill';
import { MeterCaptureControls } from '@/components/meter/meter-capture-controls';
import { MeterReadout } from '@/components/meter/meter-readout';
import { MeterRollPill } from '@/components/meter/meter-roll-pill';
import { MeterSettingsSheet } from '@/components/meter/meter-settings-sheet';
import { MeterToast } from '@/components/meter/meter-toast';
import {
  MatrixMeteringIcon,
  SpotMeteringIcon,
} from '@/components/meter/metering-icons';
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
import { useLinkFilmLog } from '@/lib/meter-film-log-link';
import { getMeterSettings, setMeterSettings } from '@/lib/meter-settings';

// Clearance for the translucent native tab bar so bottom controls stay tappable
// while the readout still sits snug above it (no dead gap).
const TAB_BAR_CLEARANCE = 24;

type MeteringMode = 'matrix' | 'spot';
const MODE_OPTIONS = [
  {
    label: 'Matrix',
    value: 'matrix' as const,
    renderIcon: (p: { color: string; size: number }) => (
      <MatrixMeteringIcon {...p} />
    ),
  },
  {
    label: 'Spot',
    value: 'spot' as const,
    renderIcon: (p: { color: string; size: number }) => (
      <SpotMeteringIcon {...p} />
    ),
  },
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
  // When off, all film-log integration is hidden (clean standalone meter).
  const [linkFilmLog] = useLinkFilmLog();
  // Lock the meter ISO to the active roll's rated EI (default on, tap to unlock);
  // skipped entirely while the film-log link is off.
  const { rollIso, isoLocked, toggleLock } = useMeterIsoLock(
    solver.iso,
    solver.setIso,
    linkFilmLog
  );
  const { message: toastMessage, show: showToast } = useToast();
  const onIsoBlocked = useCallback(
    () => showToast('Unlock EI in the upper left to pick an ISO'),
    [showToast]
  );
  const onScrubTapHint = useCallback(
    () => showToast('Hold and drag to select a value'),
    [showToast]
  );
  const [customIsoOpen, setCustomIsoOpen] = useState(false);
  const onCustomIso = useCallback(() => setCustomIsoOpen(true), []);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
  const fields = useMeterScrubFields(
    solver,
    rollIso,
    isoLocked,
    onIsoBlocked,
    onCustomIso
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

  const isSpot = meteringMode === 'spot';

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

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0.52)', 'rgba(0,0,0,0.18)', 'transparent']}
        locations={[0, 0.58, 1]}
        style={styles.topShade}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(0,0,0,0.24)', 'rgba(0,0,0,0.68)']}
        locations={[0, 0.42, 1]}
        style={styles.bottomShade}
      />

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

      {/* Settings gear, top-left — opens the meter-specific settings popup
          (calibration, etc.) and balances the right-hand control stack. */}
      <View
        pointerEvents="box-none"
        style={[styles.topLeftStack, { top: insets.top + 10 }]}
      >
        <Pressable
          onPress={() => setSettingsOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Meter settings"
          hitSlop={8}
        >
          <GlassPill style={styles.settingsButton}>
            <SymbolView name="gearshape" size={18} tintColor="#ffffff" />
          </GlassPill>
        </Pressable>
      </View>

      {/* Roll + EI lock, top-right. */}
      <View
        pointerEvents="box-none"
        style={[styles.topControlStack, { top: insets.top + 10 }]}
      >
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
          >
            <GlassPill style={styles.isoPill}>
              <SymbolView
                name={isoLocked ? 'lock.fill' : 'lock.open.fill'}
                size={15}
                tintColor={isoLocked ? '#facc15' : '#ffffff'}
              />
              <Text
                style={[
                  styles.logButtonText,
                  isoLocked && styles.logButtonTextLocked,
                ]}
              >
                {isoLocked ? `EI ${rollIso}` : 'ISO'}
              </Text>
            </GlassPill>
          </Pressable>
        ) : null}
        {linkFilmLog ? <MeterRollPill /> : null}
      </View>

      {/* Above the readout: the live scrub ruler (while dragging) or the
          matrix/spot toggle, pinned bottom-right when idle. */}
      <View
        pointerEvents="box-none"
        style={[
          styles.bottomStack,
          { bottom: insets.bottom + TAB_BAR_CLEARANCE },
        ]}
      >
        <View
          style={[
            styles.bottomControlSlot,
            scrub ? styles.bottomControlScrub : styles.bottomControlToggle,
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
        </View>
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
            onTapHint={onScrubTapHint}
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
        bottom={insets.bottom + TAB_BAR_CLEARANCE + 156}
        showShutter={!scrub && linkFilmLog}
        onShutter={triggerFlash}
      />

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.flash, flashStyle]}
      />

      {toastMessage ? <MeterToast message={toastMessage} /> : null}

      {customIsoOpen ? (
        <CustomIsoSheet
          visible
          onClose={() => setCustomIsoOpen(false)}
          onSubmit={solver.setIso}
        />
      ) : null}

      <MeterSettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        calibrationOffset={calibrationOffset}
        onCalibrationChange={handleCalibrationChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0c' },
  topShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 190,
  },
  bottomShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 340,
  },
  flash: { backgroundColor: '#ffffff' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b0b0c',
  },
  text: { color: '#f5f5f4' },
  reticle: { position: 'absolute' },
  topControlStack: {
    position: 'absolute',
    right: 16,
    alignItems: 'flex-end',
    gap: 8,
  },
  topLeftStack: {
    position: 'absolute',
    left: 16,
    alignItems: 'flex-start',
    gap: 8,
  },
  settingsButton: {
    width: 44,
    minHeight: 44,
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  isoPill: { gap: 6, minHeight: 42, paddingHorizontal: 16, paddingVertical: 8 },
  logButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  logButtonTextLocked: { color: '#facc15' },
  bottomStack: {
    position: 'absolute',
    left: 12,
    right: 12,
    // Both children stretch full-width; the control slot below aligns the
    // toggle/ruler within it, and the readout panel is full-width.
    alignItems: 'flex-start',
    gap: 8,
  },
  // Holds the matrix/spot toggle or the scrub ruler, above the readout.
  bottomControlSlot: { alignSelf: 'stretch' },
  // Idle: pin the matrix/spot toggle bottom-right (clear of the centered
  // shutter). While scrubbing: keep the ruler left, as before.
  bottomControlToggle: { alignItems: 'flex-end' },
  bottomControlScrub: { alignItems: 'flex-start' },
  resultsPanel: {
    alignSelf: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
});
