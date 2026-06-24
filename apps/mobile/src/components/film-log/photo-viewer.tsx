import { Image } from 'expo-image';
import { Modal, Pressable, Text } from 'react-native';
import { photoUri } from '@/lib/film-log-photos';

interface PhotoViewerProps {
  visible: boolean;
  fileName: string | null;
  onClose: () => void;
}

export function PhotoViewer({ visible, fileName, onClose }: PhotoViewerProps) {
  return (
    <Modal
      visible={visible && !!fileName}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        className="flex-1 items-center justify-center bg-black/95"
      >
        {fileName ? (
          <Image
            source={{ uri: photoUri(fileName) }}
            style={{ width: '100%', height: '80%' }}
            contentFit="contain"
          />
        ) : null}
        <Text className="absolute right-5 top-14 text-base font-semibold text-white">
          Close
        </Text>
      </Pressable>
    </Modal>
  );
}
