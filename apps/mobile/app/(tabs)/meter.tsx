import { useLightMeterSolver } from '@dorkroom/logic';
import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera } from 'react-native-vision-camera';
import { MeterControls } from '@/components/meter/meter-controls';
import { PermissionFallback } from '@/components/meter/permission-fallback';
import { Reticle } from '@/components/meter/reticle';
import { useCameraMeter } from '@/hooks/use-camera-meter';
import {
  getCalibrationOffset,
  setCalibrationOffset,
} from '@/lib/meter-calibration';

export default function MeterScreen() {
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
      <View style={styles.overlay} pointerEvents="box-none">
        <MeterControls
          ev={meter.ev}
          iso={solver.iso}
          onIsoChange={solver.setIso}
          priority={solver.priority}
          onPriorityChange={solver.setPriority}
          aperture={solver.aperture}
          onApertureChange={solver.setAperture}
          shutterSpeed={solver.shutterSpeed}
          onShutterSpeedChange={solver.setShutterSpeed}
          solution={solver.solution}
          calibrationOffset={calibrationOffset}
          onCalibrationChange={handleCalibrationChange}
        />
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
  overlay: { position: 'absolute', left: 16, right: 16, bottom: 32 },
});
