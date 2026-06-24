import { formatAperture, formatShutterSpeed } from '@dorkroom/logic';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { photoUri } from '@/lib/film-log-photos';
import type { ShotPhoto } from '@/types/film-log';

interface CaptureConfirmSheetProps {
  visible: boolean;
  photo: ShotPhoto;
  aperture: number;
  shutterSpeed: number;
  iso: number;
  rollName: string;
  onSave: () => void;
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
  onSave,
  onEdit,
  onDiscard,
}: CaptureConfirmSheetProps) {
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
        <View className="flex-row gap-3">
          <Pressable
            onPress={onEdit}
            accessibilityRole="button"
            className="flex-1 items-center rounded-xl bg-white/10 px-4 py-3"
          >
            <Text className="text-base text-white">Edit…</Text>
          </Pressable>
          <Pressable
            onPress={onSave}
            accessibilityRole="button"
            className="flex-1 items-center rounded-xl bg-rose-600 px-4 py-3"
          >
            <Text className="text-base font-semibold text-white">Save</Text>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}
