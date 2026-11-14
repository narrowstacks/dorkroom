import { useNavigation } from 'expo-router';
import { type RefObject, useCallback, useEffect, useRef } from 'react';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isAtTop, searchTabPressAction } from '@/lib/home/search-tab-press';

/** The Search tab's route in `NativeTabs`, as far as this hook uses it. */
interface SearchTabNavigation {
  isFocused(): boolean;
  /** `NativeTabs` emits it for every tap on the tab, the first and a re-tap. */
  addListener(type: 'tabPress', listener: () => void): () => void;
}

/** Home's route in the Search tab's stack. */
interface HomeNavigation {
  isFocused(): boolean;
  getParent(): SearchTabNavigation | undefined;
}

/**
 * Tapping the Search tab again while Home shows at its top focuses Home's
 * search field. The decision is `searchTabPressAction`; this wires it to the
 * navigator's `tabPress`. JS emits it before it applies the selection to JS
 * state, so `isFocused()` still answers for the moment of the tap, but
 * natively the selection, pop or scroll to the top has already started.
 *
 * Returns the `onScroll` handler for Home's scroll view: it keeps "at top" in
 * a ref, so scrolling never re-renders Home. Home has no header, so its
 * scroll view's adjusted top inset is the top safe-area inset.
 */
export function useSearchTabFocus(
  input: RefObject<TextInput | null>
): (event: NativeSyntheticEvent<NativeScrollEvent>) => void {
  const navigation = useNavigation<HomeNavigation>();
  const { top } = useSafeAreaInsets();
  const atTop = useRef(true);

  useEffect(() => {
    const tab = navigation.getParent();
    if (!tab) return;
    return tab.addListener('tabPress', () => {
      const field = input.current;
      const action = searchTabPressAction({
        tabWasSelected: tab.isFocused(),
        homeShowing: navigation.isFocused(),
        atTop: atTop.current,
        fieldFocused: field?.isFocused() ?? false,
      });
      if (action === 'focus-field') field?.focus();
    });
  }, [navigation, input]);

  return useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      atTop.current = isAtTop(event.nativeEvent.contentOffset.y, top);
    },
    [top]
  );
}
