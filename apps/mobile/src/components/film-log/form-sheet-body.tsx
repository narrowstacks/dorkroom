import { type ReactNode, useEffect, useState } from 'react';
import { Keyboard, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formBodyMaxHeight } from './form-sheet-layout';

interface FormSheetBodyProps {
  children: ReactNode;
  /** Pinned under the scrolling fields: the commit. */
  footer: ReactNode;
}

/** The keyboard's height while it is up, else 0 (`keyboardWillShow`, so the
 * body shrinks as the keyboard rises and the sheet rides up on it). */
function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', (event) =>
      setHeight(event.endCoordinates.height)
    );
    const hide = Keyboard.addListener('keyboardWillHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

/** The tallest a sheet's scrolling part may be, given the height of what is
 * pinned beside it (`fixedHeight`): shrinks with the keyboard and with large
 * text in the sheet's header. */
export function useSheetBodyMaxHeight(fixedHeight: number): number {
  const { height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  return formBodyMaxHeight({
    windowHeight: height,
    keyboardHeight,
    topInset: insets.top,
    bottomInset: insets.bottom,
    footerHeight: fixedHeight,
    fontScale,
  });
}

/**
 * The body of a long form in a `BottomSheet` (the camera and lens forms,
 * #733): the fields scroll, the footer stays pinned under them, and the
 * scrolling part shrinks with the keyboard so the sheet's title and the commit
 * stay on screen at any text size.
 */
export function FormSheetBody({ children, footer }: FormSheetBodyProps) {
  const [footerHeight, setFooterHeight] = useState(0);
  // The 16pt gap between the body and the footer is fixed too.
  const maxHeight = useSheetBodyMaxHeight(footerHeight + 16);
  return (
    <View className="gap-4">
      <ScrollView
        style={{ maxHeight }}
        contentContainerClassName="gap-4"
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      <View
        className="gap-4"
        onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
      >
        {footer}
      </View>
    </View>
  );
}
