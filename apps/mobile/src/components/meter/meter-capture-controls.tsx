import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { LogFrameSheet } from '@/components/film-log/log-frame-sheet';
import { ShutterButton } from '@/components/meter/shutter-button';
import type { useMeterCapture } from '@/hooks/use-meter-capture';
import { setFrameLocationHandoff } from '@/lib/frame-location-handoff';

interface MeterCaptureControlsProps {
  capture: ReturnType<typeof useMeterCapture>;
  /** Current aperture / shutter / ISO to record with the captured frame. */
  aperture: number;
  shutterSpeed: number;
  iso: number;
  /** Bottom offset (px) for the absolute shutter, clearing the readout/tab bar. */
  bottom: number;
  /** Hide the shutter (e.g. while scrubbing a dial) so it can't overlap the
   * floating wheel. The log sheet still renders regardless. */
  showShutter: boolean;
  /** Fired the instant the shutter is pressed (for the screen flash). */
  onShutter: () => void;
}

/**
 * Bottom-center shutter + the log-frame sheet. Pulled out of the meter
 * screen so the screen stays lean; capture state lives in `useMeterCapture`.
 */
export function MeterCaptureControls({
  capture,
  aperture,
  shutterSpeed,
  iso,
  bottom,
  showShutter,
  onShutter,
}: MeterCaptureControlsProps) {
  const { pending, roll } = capture;
  // The sheet logs to the roll the capture was taken for, and only that one.
  const sheet =
    pending && roll?.id === pending.rollId ? { pending, roll } : null;
  return (
    <>
      {showShutter ? (
        <View pointerEvents="box-none" style={[styles.shutterWrap, { bottom }]}>
          <ShutterButton
            onPress={() => {
              // The flash is for a photo being taken, decided before it is awaited.
              if (capture.capture({ aperture, shutterSpeed, iso })) onShutter();
            }}
          />
        </View>
      ) : null}

      {sheet ? (
        <LogFrameSheet
          // Each capture is a fresh opening.
          key={sheet.pending.fileName}
          visible
          roll={sheet.roll}
          source="meter"
          photo={sheet.pending.photo}
          reading={{
            aperture: sheet.pending.aperture,
            shutterSpeed: sheet.pending.shutterSpeed,
            iso: sheet.pending.iso,
          }}
          // Each action names the capture it was rendered for, so a late call
          // never touches a newer capture or one already logged.
          onLogged={() => capture.clear(sheet.pending.photo.fileName)}
          onCancel={() => capture.discard(sheet.pending.photo.fileName)}
          onMoreOptions={(draft) => {
            const fileName = capture.consumeForEdit(
              sheet.pending.photo.fileName
            );
            if (!fileName) return;
            const taken = sheet.pending;
            const params = [
              `rollId=${sheet.roll.id}`,
              'source=meter',
              `photo=${fileName}`,
              `aperture=${taken.aperture}`,
              `shutter=${taken.shutterSpeed}`,
              `meteredIso=${taken.iso}`,
              // Always sent, even empty: an empty value means the user cleared it
              // (an absent one would fall back to the roll's last lens and place).
              `lensId=${encodeURIComponent(draft.lensId ?? '')}`,
              `place=${encodeURIComponent(draft.place)}`,
              `notes=${encodeURIComponent(draft.notes)}`,
            ];
            // In memory, never in the URL: see frame-location-handoff.ts.
            if (draft.location)
              setFrameLocationHandoff(fileName, draft.location);
            router.push(`/shoot/film-log/shot?${params.join('&')}`);
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
