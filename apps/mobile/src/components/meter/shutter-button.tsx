import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ShutterButtonProps {
  onPress: () => void;
}

/** Camera-style shutter: filled white core, thin white ring, a + inside. */
export function ShutterButton({ onPress }: ShutterButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Capture a photo and log a shot"
      style={({ pressed }) => [styles.ring, pressed && styles.pressed]}
    >
      <View style={styles.core}>
        <Text style={styles.plus}>+</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  pressed: { opacity: 0.7 },
  core: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: { color: '#0b0b0c', fontSize: 28, fontWeight: '300', lineHeight: 30 },
});
