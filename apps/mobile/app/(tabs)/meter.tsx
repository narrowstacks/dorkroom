import {
  STANDARD_APERTURES,
  STANDARD_ISOS,
  STANDARD_SHUTTER_SPEEDS,
  snapToStandardStop,
  useLightMeterSolver,
} from '@dorkroom/logic';
import { useIsFocused } from '@react-navigation/native';
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
import { MeterReadout } from '@/components/meter/meter-readout';
import { MeterStepper } from '@/components/meter/meter-stepper';
import { PermissionFallback } from '@/components/meter/permission-fallback';
import { RETICLE_SIZE, Reticle } from '@/components/meter/reticle';
import { SegmentedPill } from '@/components/meter/segmented-pill';
import { ValueWheel } from '@/components/meter/value-wheel';
import { useCalibration } from '@/hooks/use-calibration';
import { useCameraMeter } from '@/hooks/use-camera-meter';
import { useToast } from '@/hooks/use-toast';

// Clearance for the translucent native tab bar so bottom controls stay tappable.
const TAB_BAR_CLEARANCE = 64;
const CALIBRATION_STEP = 0.1;
const MONO = { fontFamily: 'Menlo' } as const;
const SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.85)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const;

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
interface SelectorConfig {
  title: string;
  options: { label: string; value: number }[];
  value: number;
  onChange: (value: number) => void;
}

export default function MeterScreen() {
  const insets = useSafeAreaInsets();
  const { offset: calibrationOffset, adjust: handleCalibrationChange } =
    useCalibration();
  const meter = useCameraMeter(calibrationOffset);
  const { hasPermission, requestPermission } = meter;
  const solver = useLightMeterSolver(meter.ev);
  const isFocused = useIsFocused();
  const { toast, showToast } = useToast();
  const [meteringMode, setMeteringMode] = useState<MeteringMode>('matrix');
  const [meterPoint, setMeterPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [activeSelector, setActiveSelector] = useState<SelectorTarget | null>(
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
        const frame = sizeRef.current;
        enterSpot({ x: (frame?.width ?? 0) / 2, y: (frame?.height ?? 0) / 2 });
      }
    },
    [enterMatrix, enterSpot]
  );

  // Picking an aperture/shutter value also locks it (sets that priority);
  // ISO is always selectable and never changes priority.
  const selector = useMemo<SelectorConfig | null>(() => {
    if (activeSelector === 'iso') {
      return {
        title: 'ISO',
        options: ISO_OPTIONS,
        value: solver.iso,
        onChange: solver.setIso,
      };
    }
    if (activeSelector === 'aperture') {
      const start =
        solver.priority === 'aperture'
          ? solver.aperture
          : snapToStandardStop(solver.aperture, STANDARD_APERTURES, false)
              .standard.value;
      return {
        title: 'Aperture',
        options: STANDARD_APERTURES,
        value: start,
        onChange: (v) => {
          solver.setAperture(v);
          solver.setPriority('aperture');
        },
      };
    }
    if (activeSelector === 'shutter') {
      const start =
        solver.priority === 'shutter'
          ? solver.shutterSpeed
          : snapToStandardStop(
              solver.shutterSpeed,
              STANDARD_SHUTTER_SPEEDS,
              true
            ).standard.value;
      return {
        title: 'Shutter',
        options: STANDARD_SHUTTER_SPEEDS,
        value: start,
        onChange: (v) => {
          solver.setShutterSpeed(v);
          solver.setPriority('shutter');
        },
      };
    }
    return null;
  }, [activeSelector, solver]);

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
          // While a selector is open, a background tap dismisses it.
          if (activeSelector) {
            setActiveSelector(null);
            return;
          }
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

      {/* Hint toast for a plain tap on a value. */}
      {toast ? (
        <View
          pointerEvents="none"
          style={[styles.toastWrap, { bottom: insets.bottom + 220 }]}
        >
          <View className="rounded-full bg-black/75 px-4 py-2">
            <Text style={[MONO, SHADOW]} className="text-sm text-white">
              {toast}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Bottom: selector (when open) or mode toggle, above the results. */}
      <View
        pointerEvents="box-none"
        style={[
          styles.bottomStack,
          { bottom: insets.bottom + TAB_BAR_CLEARANCE },
        ]}
      >
        {selector ? (
          <BlurPanel style={styles.selectorPanel}>
            <View style={styles.selectorHeader}>
              <Text
                style={[MONO, SHADOW]}
                className="text-xs uppercase tracking-widest text-white/55"
              >
                {selector.title}
              </Text>
              <Pressable
                onPress={() => setActiveSelector(null)}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text
                  style={[MONO, SHADOW]}
                  className="text-sm font-bold uppercase tracking-widest text-rose-400"
                >
                  Done
                </Text>
              </Pressable>
            </View>
            <ValueWheel
              options={selector.options}
              value={selector.value}
              onChange={selector.onChange}
              visibleCount={5}
              width={180}
              accessibilityLabel={`${selector.title} selector`}
            />
          </BlurPanel>
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
            priority={solver.priority}
            iso={solver.iso}
            aperture={solver.aperture}
            shutterSpeed={solver.shutterSpeed}
            solution={solver.solution}
            onSelectAperture={() => setActiveSelector('aperture')}
            onSelectShutter={() => setActiveSelector('shutter')}
            onSelectIso={() => setActiveSelector('iso')}
            onHint={() => showToast('Hold to select a value')}
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
  toastWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bottomStack: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'flex-end',
    gap: 10,
  },
  selectorPanel: {
    alignSelf: 'stretch',
    padding: 14,
    alignItems: 'center',
    gap: 8,
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  resultsPanel: {
    alignSelf: 'stretch',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
});
