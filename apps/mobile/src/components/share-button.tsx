import * as Haptics from 'expo-haptics';
import { Share } from 'react-native';
import { Button } from '@/components/button';

export function ShareButton({ message }: { message: string }) {
  const onPress = async () => {
    Haptics.selectionAsync();
    // Share.share rejects when the user dismisses the sheet — that is a normal
    // cancel, not an error, so it is intentionally ignored.
    await Share.share({ message }).catch(() => undefined);
  };
  return <Button label="Share result" onPress={onPress} className="mt-1" />;
}
