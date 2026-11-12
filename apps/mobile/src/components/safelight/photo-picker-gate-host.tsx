import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { CommitButton } from '@/components/commit-button';
import { NeutralButton } from '@/components/neutral-button';
import { useSafelight } from '@/components/safelight/safelight-provider';
import {
  abandonPhotoPicker,
  cancelPhotoPicker,
  confirmPhotoPicker,
  photoPickerDismissed,
  usePhotoPickerStatus,
} from '@/lib/photo-picker-gate';

/**
 * Mount once, inside the providers. Shows the one-line confirmation that
 * `gatePhotoPicker` asks for while safelight mode is on. It is an in-app sheet
 * (an `Alert` would be a system surface the overlay cannot dim).
 */
export function PhotoPickerGateHost() {
  const status = usePhotoPickerStatus();
  const { on } = useSafelight();
  // Never strand a request: settle it if the mode is turned off while the sheet
  // is up, or if this host goes away.
  useEffect(() => {
    if (!on) abandonPhotoPicker();
  }, [on]);
  useEffect(() => abandonPhotoPicker, []);
  return (
    <BottomSheet
      visible={status === 'asking'}
      // The picker opens only from here, once the sheet has fully gone.
      onDismiss={photoPickerDismissed}
      title="Photo picker"
      onClose={cancelPhotoPicker}
      dismissLabel="Cancel"
    >
      <View className="gap-4 pb-2">
        <Text className="text-base text-ink-80">
          The photo picker is not dimmed. Open it?
        </Text>
        <View className="flex-row gap-3">
          <NeutralButton
            label="Cancel"
            onPress={cancelPhotoPicker}
            className="flex-1"
          />
          <CommitButton
            label="Open"
            onPress={confirmPhotoPicker}
            className="flex-1"
          />
        </View>
      </View>
    </BottomSheet>
  );
}
