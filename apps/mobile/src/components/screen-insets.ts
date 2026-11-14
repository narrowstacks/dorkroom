import type { ScrollViewProps } from 'react-native';

/**
 * The scroll view props that reserve `room` at the bottom: a content inset
 * (counted in React Native's keyboard handler, which uses the larger of the
 * keyboard and this and puts this back on hide, and in its offset clamp) and
 * the same indicator inset (a prop change sets only the content inset, and
 * the handler sets both). Nothing at all for no room, so every other screen
 * renders exactly as before.
 */
export function bottomRoomProps(
  room: number
): Pick<ScrollViewProps, 'contentInset' | 'scrollIndicatorInsets'> {
  if (!(room > 0)) return {};
  const insets = { bottom: room };
  return { contentInset: insets, scrollIndicatorInsets: insets };
}
