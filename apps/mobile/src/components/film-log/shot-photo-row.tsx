import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { PhotoViewer } from '@/components/film-log/photo-viewer';
import { photoUri } from '@/lib/film-log-photos';
import type { ShotPhoto } from '@/types/film-log';

interface ShotPhotoRowProps {
  photo: ShotPhoto | undefined;
  onChoose: () => void;
  onRemove: () => void;
}

/** Shot-form photo control: thumbnail + view (full-screen) / remove, or a picker. */
export function ShotPhotoRow({ photo, onChoose, onRemove }: ShotPhotoRowProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  return (
    <View className="gap-2">
      <Text className="text-sm text-white/60">Photo</Text>
      {photo ? (
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => setViewerOpen(true)}
            accessibilityRole="imagebutton"
            accessibilityLabel="View photo"
          >
            <Image
              source={{ uri: photoUri(photo.fileName) }}
              style={{ width: 64, height: 84, borderRadius: 8 }}
              contentFit="cover"
            />
          </Pressable>
          <Pressable
            onPress={() => setViewerOpen(true)}
            accessibilityRole="button"
            className="rounded-xl bg-white/10 px-4 py-3"
          >
            <Text className="text-base text-white">View</Text>
          </Pressable>
          <Pressable
            onPress={onRemove}
            accessibilityRole="button"
            className="rounded-xl bg-white/10 px-4 py-3"
          >
            <Text className="text-base text-rose-400">Remove</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={onChoose}
          accessibilityRole="button"
          className="items-center rounded-xl bg-white/10 px-4 py-3"
        >
          <Text className="text-base text-white">Choose from library</Text>
        </Pressable>
      )}
      <PhotoViewer
        visible={viewerOpen}
        fileName={photo?.fileName ?? null}
        onClose={() => setViewerOpen(false)}
      />
    </View>
  );
}
