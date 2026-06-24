import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { CaptureConfirmSheet } from '@/components/film-log/capture-confirm-sheet';
import { ShutterButton } from '@/components/meter/shutter-button';
import type { useMeterCapture } from '@/hooks/use-meter-capture';

interface MeterCaptureControlsProps {
  capture: ReturnType<typeof useMeterCapture>;
  /** Current aperture / shutter / ISO to record with the captured frame. */
  aperture: number;
  shutterSpeed: number;
  iso: number;
  /** Bottom offset (px) for the absolute shutter, clearing the readout/tab bar. */
  bottom: number;
}

/**
 * Bottom-center shutter + the capture confirm sheet. Pulled out of the meter
 * screen so the screen stays lean; capture state lives in `useMeterCapture`.
 */
export function MeterCaptureControls({
  capture,
  aperture,
  shutterSpeed,
  iso,
  bottom,
}: MeterCaptureControlsProps) {
  return (
    <>
      <View pointerEvents="box-none" style={[styles.shutterWrap, { bottom }]}>
        <ShutterButton
          onPress={() => void capture.capture({ aperture, shutterSpeed, iso })}
        />
      </View>

      {capture.pending ? (
        <CaptureConfirmSheet
          visible
          photo={capture.pending.photo}
          aperture={capture.pending.aperture}
          shutterSpeed={capture.pending.shutterSpeed}
          iso={capture.pending.iso}
          rollName={capture.activeRollName}
          onSave={capture.save}
          onDiscard={capture.discard}
          onEdit={() => {
            // Read pending into a local first: consumeForEdit() clears it.
            const local = capture.pending;
            if (!local) return;
            const fileName = capture.consumeForEdit();
            if (fileName) {
              router.push(
                `/film-log/shot?source=meter&photo=${fileName}&aperture=${local.aperture}&shutter=${local.shutterSpeed}&meteredIso=${iso}`
              );
            }
          }}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  shutterWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
