import { formatAperture, formatShutterSpeed } from '@dorkroom/logic';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { SelectField } from '@/components/film-log/select-field';
import { photoUri } from '@/lib/film-log-photos';
import type { Lens, ShotPhoto } from '@/types/film-log';

interface CaptureConfirmSheetProps {
  visible: boolean;
  photo: ShotPhoto;
  aperture: number;
  shutterSpeed: number;
  iso: number;
  rollName: string;
  /** Lenses available for the roll's camera. */
  lenses: Lens[];
  /** Last lens used on the roll; pre-selected. Undefined on the roll's 1st shot. */
  defaultLensId: string | undefined;
  onSave: (lensId: string | undefined) => void;
  onEdit: () => void;
  onDiscard: () => void;
}

export function CaptureConfirmSheet({
  visible,
  photo,
  aperture,
  shutterSpeed,
  iso,
  rollName,
  lenses,
  defaultLensId,
  onSave,
  onEdit,
  onDiscard,
}: CaptureConfirmSheetProps) {
  const [lensId, setLensId] = useState(defaultLensId);
  const lensOptions = useMemo(
    () => lenses.map((lens) => ({ label: lens.name, value: lens.id })),
    [lenses]
  );
  // Force a lens choice only when lenses exist but none is picked (the roll's
  // first shot). With no saved lenses there's nothing to require.
  const needsLens = lenses.length > 0 && !lensId;

  return (
    <BottomSheet visible={visible} title="Log this shot" onClose={onDiscard}>
      <View className="gap-4">
        <View className="flex-row gap-3">
          <Image
            source={{ uri: photoUri(photo.fileName) }}
            style={{ width: 72, height: 96, borderRadius: 10 }}
            contentFit="cover"
          />
          <View className="flex-1 justify-center gap-1">
            <Text className="text-base text-white">
              {formatAperture(aperture)} · {formatShutterSpeed(shutterSpeed)} ·
              EI {iso}
            </Text>
            <Text className="text-sm text-white/60">Roll: {rollName}</Text>
            {photo.grayscale ? (
              <Text className="text-xs text-white/40">Saved in B&amp;W</Text>
            ) : null}
          </View>
        </View>

        <SelectField
          label="Lens"
          value={lensId}
          options={lensOptions}
          onChange={setLensId}
          placeholder={lenses.length > 0 ? 'Select a lens' : 'No saved lenses'}
        />
        {needsLens ? (
          <Text className="text-xs text-amber-300">
            Pick the lens you shot this frame on to save.
          </Text>
        ) : null}

        <View className="flex-row gap-3">
          <Pressable
            onPress={onEdit}
            accessibilityRole="button"
            className="flex-1 items-center rounded-xl bg-white/10 px-4 py-3"
          >
            <Text className="text-base text-white">Edit…</Text>
          </Pressable>
          <Pressable
            onPress={() => onSave(lensId)}
            disabled={needsLens}
            accessibilityRole="button"
            accessibilityState={{ disabled: needsLens }}
            className={`flex-1 items-center rounded-xl px-4 py-3 ${
              needsLens ? 'bg-rose-600/40' : 'bg-rose-600'
            }`}
          >
            <Text className="text-base font-semibold text-white">Save</Text>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}
